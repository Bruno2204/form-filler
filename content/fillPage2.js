// ─── FILL PAGE 2 ────────────────────────────────────────────────────────
// Routine for the second page of the Google Form (forma de envío).
// Attaches to window.__ff.fillPage2. Wrapped in IIFE — see helpers.js.

(function () {
  const { SELECTORS } = window.__ff;
  const { setInput, findInputByLabel } = window.__ff.helpers;
  const { isLineaNueva } = window.__ff.utils;

  window.__ff.fillPage2 = async function (data) {
    try {
      let filled = 0;

      let formaEnvio = null;
      if (data.esEsim) {
        formaEnvio = isLineaNueva(data.producto)
          ? 'esim_linea_nueva'
          : 'esim_pospago';
      } else {
        formaEnvio = 'cav';
      }

      const items = document.querySelectorAll(SELECTORS.QUESTION_BLOCK);

      if (formaEnvio) {
        for (const item of items) {
          const heading = item.querySelector(SELECTORS.HEADING);
          if (
            heading?.innerText?.toLowerCase().includes('forma de envío') ||
            heading?.innerText?.toLowerCase().includes('forma de envio')
          ) {
            const radios = item.querySelectorAll(SELECTORS.RADIO);
            for (const radio of radios) {
              const val = radio.getAttribute('data-value')?.toLowerCase() || '';
              let match = false;
              if (formaEnvio === 'cav') match = val === 'cav';
              else if (formaEnvio === 'esim_linea_nueva')
                match =
                  val.includes('esim') &&
                  (val.includes('linea') || val.includes('línea')) &&
                  val.includes('nueva');
              else if (formaEnvio === 'esim_pospago')
                match =
                  (val.includes('portabilidad') && val.includes('pospago')) ||
                  (val.includes('esim') && val.includes('pospago'));

              if (match) {
                radio.click();
                filled++;
                break;
              }
            }
            break;
          }
        }
      }

      if (formaEnvio === 'cav' && data.nombreCAV) {
        if (setInput(findInputByLabel('nombre del cav'), data.nombreCAV))
          filled++;
      }

      if (formaEnvio === 'cav' && data.cpCAC) {
        let cpInput = null;
        for (const item of items) {
          const txt =
            item.querySelector(SELECTORS.HEADING)?.innerText?.toLowerCase()?.trim() ||
            '';
          if (
            txt === 'cp' ||
            txt === 'c.p.' ||
            txt.includes('codigo postal') ||
            txt.includes('código postal')
          ) {
            cpInput = item.querySelector(SELECTORS.TEXT_INPUT);
            break;
          }
        }
        if (setInput(cpInput, data.cpCAC)) filled++;
      }

      return { ok: true, filled };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };
})();
