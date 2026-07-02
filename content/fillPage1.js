// ─── FILL PAGE 1 ────────────────────────────────────────────────────────
// Routine for the first page of the Google Form. Attaches to
// window.__ff.fillPage1. Wrapped in IIFE — see helpers.js for rationale.

(function () {
  const { SELECTORS } = window.__ff;
  const { setInput, findInputByLabel, selectDropdownOption } = window.__ff.helpers;
  const { isLineaNueva, normalizeText } = window.__ff.utils;

  window.__ff.fillPage1 = async function (data) {
    try {
      let filled = 0;

      // ── 1. SELECT "Nombre" → "Bruno"
      const items = document.querySelectorAll(SELECTORS.QUESTION_BLOCK);
      for (const item of items) {
        const heading = item.querySelector(SELECTORS.HEADING);
        if (heading?.innerText?.trim() === 'Nombre') {
          const success = await selectDropdownOption(item, 'Bruno');
          if (success) filled++;
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
      if (
        !isLineaNueva(data.producto) &&
        setInput(findInputByLabel('CURP'), data.curp)
      )
        filled++;
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

      return { ok: true, filled };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };
})();
