// ─── FILL PAGE 1 ────────────────────────────────────────────────────────
// Routine for the first page of the Google Form. Behavior is identical
// to the old `window.FormFiller.fillPage1` — same DOM queries, same
// filled-counter accounting, same return shape.

import { SELECTORS } from './constants.js';
import { setInput, findInputByLabel, selectDropdownOption } from './helpers.js';
import { isLineaNueva, normalizeText } from './utils.js';

export async function fillPage1(data) {
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
}
