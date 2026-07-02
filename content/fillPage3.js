// ─── FILL PAGE 3 ────────────────────────────────────────────────────────
// Routine for the third page of the Google Form. Behavior is identical
// to the old `window.FormFiller.fillPage3`. The 10-line commented
// "Usuario Backend" block was removed (T3.3 scope).

import { SELECTORS } from './constants.js';
import { setInput, findInputByLabel, selectDropdownOption } from './helpers.js';
import { isLineaNueva, gMatch, ddmmyyyyToISO } from './utils.js';

export async function fillPage3(data) {
  try {
    let filled = 0;

    const dnP = isLineaNueva(data.producto) ? 'En espera' : data.dnPortar;

    if (setInput(findInputByLabel('dn a portar'), dnP)) filled++;
    if (setInput(findInputByLabel('nip'), data.nip)) filled++;
    if (setInput(findInputByLabel('número de orden'), 'En espera')) filled++;
    if (
      setInput(findInputByLabel('lugar de nacimiento'), data.lugarNacimiento)
    )
      filled++;

    // Género Radios
    const generoMatch = gMatch(data.genero);
    if (generoMatch) {
      for (const item of document.querySelectorAll(SELECTORS.QUESTION_BLOCK)) {
        const h = item.querySelector(SELECTORS.HEADING);
        if (
          h?.innerText?.toLowerCase().includes('género') ||
          h?.innerText?.toLowerCase().includes('genero')
        ) {
          const radio = item.querySelector(
            `${SELECTORS.RADIO}[data-value="${generoMatch}"]`,
          );
          if (radio) {
            radio.click();
            filled++;
          }
          break;
        }
      }
    }

    // Es con esim Radios
    for (const item of document.querySelectorAll(SELECTORS.QUESTION_BLOCK)) {
      if (
        item
          .querySelector(SELECTORS.HEADING)
          ?.innerText?.toLowerCase()
          .includes('es con esim')
      ) {
        const value = data.esEsim ? 'si' : 'no';
        const radio = item.querySelector(
          `${SELECTORS.RADIO}[data-value="${value}"]`,
        );
        // item.querySelector(`div[role="radio"][data-value="${data.esEsim ? 'Si' : 'No'}"]`) ||
        // item.querySelector(`div[role="radio"][data-value="${data.esEsim ? 'Sí' : 'No'}"]`);
        if (radio) {
          radio.click();
          filled++;
        }
        break;
      }
    }

    // Radio "En caso de ser línea nueva"
    for (const item of document.querySelectorAll(SELECTORS.QUESTION_BLOCK)) {
      const h = item.querySelector(SELECTORS.HEADING);
      if (
        h?.innerText?.toLowerCase().includes('en caso de ser línea nueva') ||
        h?.innerText?.toLowerCase().includes('en caso de ser linea nueva')
      ) {
        const isLineaNuevaOAdicion =
          data.producto === 'Linea Nueva' ||
          data.producto === 'Linea Nueva Plan Anual' ||
          data.producto === 'Linea Nueva Esim' ||
          data.producto === 'Adición' ||
          data.producto === 'Línea Nueva Prepago Esim';
        const radios = item.querySelectorAll(SELECTORS.RADIO);
        for (const radio of radios) {
          const val = radio.getAttribute('data-value')?.toLowerCase() || '';
          const match = isLineaNuevaOAdicion
            ? val.includes('pidió') ||
              val.includes('pidio') ||
              val.includes('explícitamente') ||
              val.includes('explicita')
            : val.includes('no aplica') || val.includes('porta');
          if (match) {
            radio.click();
            filled++;
            break;
          }
        }
        break;
      }
    }

    // Equipo Modelo (línea nueva esim / portabilidad esim) → "EID"
    if (data.esEsim) {
      for (const item of document.querySelectorAll(SELECTORS.QUESTION_BLOCK)) {
        const label =
          item.querySelector(SELECTORS.HEADING)?.innerText?.toLowerCase() || '';
        if (label.includes('equipo modelo') && label.includes('esim')) {
          const listbox = item.querySelector(SELECTORS.LISTBOX);
          if (listbox) {
            const success = await selectDropdownOption(item, 'EID');
            if (success) filled++;
          } else {
            const input = item.querySelector(SELECTORS.TEXT_INPUT);
            if (setInput(input, 'EID')) filled++;
          }
          break;
        }
      }
    }

    // FVC asignada (fecha) – solo si es con CAC
    if (data.esCAC && data.fvc) {
      const fvcISO = ddmmyyyyToISO(data.fvc);
      if (fvcISO && setInput(findInputByLabel('fvc asignada'), fvcISO))
        filled++;
    }

    // Dropdown de "Plan elegido"
    const isPrepago =
      data.producto === 'Porta Prepago' ||
      data.producto === 'Línea Nueva Prepago Esim';
    const planElegido = isPrepago ? 'Prepago' : data.plan;

    if (planElegido) {
      for (const item of document.querySelectorAll(SELECTORS.QUESTION_BLOCK)) {
        const heading = item.querySelector(SELECTORS.HEADING);
        if (heading?.innerText?.toLowerCase().includes('plan elegido')) {
          console.log(
            `Detectado dropdown Plan Elegido, buscando: ${planElegido}`,
          );
          const success = await selectDropdownOption(item, planElegido);
          if (success) filled++;
          break;
        }
      }
    }

    // Últimos 5 dígitos del EID
    const eidInput =
      findInputByLabel('digitos del eid') ||
      findInputByLabel('dígitos del eid') ||
      findInputByLabel('ultimos') ||
      findInputByLabel('últimos') ||
      findInputByLabel('eid');
    if (eidInput) {
      const eidValue = data.esEsim && data.eid ? data.eid : 'NA';
      if (setInput(eidInput, eidValue)) filled++;
    }

    return { ok: true, filled };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
