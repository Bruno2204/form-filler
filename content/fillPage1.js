// ─── FILL PAGE 1 ────────────────────────────────────────────────────────
// Routine for the first page of the Google Form. Attaches to
// window.__ff.fillPage1. Wrapped in IIFE — see helpers.js for rationale.

(function () {
  const { SELECTORS } = window.__ff;
  const {
    setInput,
    findInputByLabel,
    selectDropdownOption,
    selectDropdownByHeading,
    fillCheckboxes,
  } = window.__ff.helpers;
  const { normalizeText } = window.__ff.utils;

  window.__ff.fillPage1 = async function (data) {
    try {
      let filled = 0;
      const failed = [];

      // ── 1. SELECT "Nombre" → "Bruno"
      const items = document.querySelectorAll(SELECTORS.QUESTION_BLOCK);
      for (const item of items) {
        const heading = item.querySelector(SELECTORS.HEADING);
        if (heading?.innerText?.trim() === 'Nombre') {
          const result = await selectDropdownOption(item, 'Bruno');
          if (result.ok) filled++;
          else failed.push('Nombre');
          break;
        }
      }

      // ── 2. RADIO "Producto"
      if (data.producto) {
        for (const item of items) {
          const heading = item.querySelector(SELECTORS.HEADING);
          if (heading?.innerText?.trim() === 'Producto') {
            let radio = item.querySelector(
              `${SELECTORS.RADIO}[data-value="${data.producto}"]`,
            );
            if (!radio) {
              const normProd = normalizeText(data.producto);
              const radios = item.querySelectorAll(SELECTORS.RADIO);
              for (const r of radios) {
                const rVal = r.getAttribute('data-value') || '';
                const normVal = normalizeText(rVal);
                if (normVal === normProd) {
                  radio = r;
                  break;
                }
              }
            }
            if (radio) {
              radio.click();
              filled++;
            }
            break;
          }
        }
      }

      // ── Resto de Textos ──
      if (setInput(findInputByLabel('Nombre del cliente'), data.nombreCompleto))
        filled++;
      if (setInput(findInputByLabel('Fecha de nacimiento'), data.fecha))
        filled++;
      if (setInput(findInputByLabel('CURP'), data.curp)) filled++;
      if (setInput(findInputByLabel('DN de contacto'), data.dn)) filled++;
      if (setInput(findInputByLabel('E-mail'), data.email)) filled++;
      if (setInput(findInputByLabel('id lead'), data.chatId)) filled++;
      if (
        setInput(
          findInputByLabel('dn con el que se comunica'),
          data.dnChat,
        )
      )
        filled++;

      // ── Etiquetas del contacto (checkboxes) ──
      // Sólo se marca lo que el operador pidió; lo demás se deja como esté.
      const etiquetas = Array.isArray(data.etiquetas) ? data.etiquetas : [];
      if (etiquetas.length > 0) {
        const result = await fillCheckboxes(
          'Etiquetas del contacto',
          etiquetas,
        );
        filled += result.filled;
        result.failed.forEach((tag) => failed.push(`Etiqueta ${tag}`));
      }

      // ── Dropdown "¿Línea telefónica a la que se comunica?" ──
      // Es un dropdown aparte (NO son las casillas de arriba): lleva el
      // catálogo de etiquetas del form como opciones de un <select>.
      // El heading termina en "&nbsp;" y el normalizeLabel lo colapsa.
      //
      // minScore 95 = exige coincidencia EXACTA (data-value o texto).
      // Sin eso, "Reapertura" haría match con "Reaperturas META" (que es
      // un prefijo, score 70) y se marcaría la etiqueta equivocada.
      const etiquetaDropdown = (data.etiquetaDropdown || '').trim();
      if (etiquetaDropdown) {
        const result = await selectDropdownByHeading(
          '¿Línea telefónica a la que se comunica?',
          etiquetaDropdown,
          95,
        );
        filled += result.filled;
        result.failed.forEach(() =>
          failed.push('¿Línea telefónica a la que se comunica?'),
        );
      }

      return { ok: true, filled, failed };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

})();
