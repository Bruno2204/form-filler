// ─── DOM HELPERS ─────────────────────────────────────────────────────────
// Reusable low-level DOM utilities. Attaches to window.__ff.helpers.
// Wrapped in IIFE so the top-level `const` destructuring doesn't leak
// into the shared global scope and clash with sibling content files.

(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const { SELECTORS } = root.__ff || {};

  const api = {
    // Escribe texto en un input emitiendo eventos reales
    setInput(input, value) {
      if (!input || !value) return false;
      const proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    },

    // Encuentra un input/textarea en el form basándose en el título de la pregunta
    findInputByLabel(labelText) {
      const items = document.querySelectorAll(SELECTORS.QUESTION_BLOCK);
      for (const item of items) {
        const heading = item.querySelector(SELECTORS.HEADING);
        if (
          heading?.innerText?.toLowerCase().includes(labelText.toLowerCase())
        ) {
          return item.querySelector(SELECTORS.TEXT_INPUT);
        }
      }
      return null;
    },

    // Espera un tiempo fijo (ms). Sólo entre interacciones de DOM.
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    // Espera a que un predicado devuelva un valor truthy.
    async waitFor(predicate, timeout = 2000, interval = 50) {
      const deadline = Date.now() + timeout;
      for (;;) {
        const value = predicate();
        if (value) return value;
        if (Date.now() >= deadline) return null;
        await api.sleep(interval);
      }
    },

    // Un elemento está visible si se renderiza y no está oculto por CSS.
    isVisible(el) {
      if (!el) return false;
      if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) {
        return false;
      }
      const style = window.getComputedStyle(el);
      return (
        style.opacity !== '0' &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      );
    },

    // Abre el dropdown (listbox trigger) de Google Forms.
    // Dos detalles del DOM real:
    // 1. el click va al div INTERNO (jsname="LgbsSe"), no al
    //    div[role=listbox]: Google Forms delega el handler por jsname
    //    (el listbox es "W85ice", el handler espera "LgbsSe").
    // 2. se manda mousedown + mouseup pero NO click: el mouseup abre el
    //    menú y el click lo vuelve a cerrar (por eso se veía abrir dos
    //    veces). El click se usa después, sobre la opción.
    async openListbox(trigger) {
      // Si el operador ya lo dejó abierto a mano, no se toca: el mouseup
      // haría toggle y lo cerraría.
      if (api.isOpen(trigger)) return true;

      const inner =
        trigger.querySelector('[jsname="LgbsSe"]') ||
        trigger.querySelector(SELECTORS.OPTION) ||
        trigger;

      const press = (target) => {
        for (const type of ['mousedown', 'mouseup']) {
          target.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
        }
      };

      inner.focus?.();
      press(inner);
      if (await api.waitFor(() => api.isOpen(trigger), 600)) return true;

      // Segundo intento: sobre el valor visible (lo que hace el operador
      // a mano).
      const display = trigger.querySelector(SELECTORS.OPTION);
      if (display && display !== inner) {
        press(display);
        if (await api.waitFor(() => api.isOpen(trigger), 800)) return true;
      }

      return false;
    },

    // Cierra el dropdown con Escape.
    closeListbox(trigger) {
      const target = document.activeElement || trigger;
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        }),
      );
    },

    // Devuelve el contenedor con las opciones del dropdown.
    // En Google Forms el popup se renderiza DENTRO del mismo
    // div[role="listbox"] (el trigger), así que el trigger es el
    // contenedor. Sólo si no tiene opciones se busca un popup externo.
    // Ojo: la página puede tener varios dropdowns (Producto, Plan, ...)
    // con sus opciones en el DOM, así que nunca se buscan "en general".
    findOptionContainer(trigger) {
      if (trigger.querySelector(SELECTORS.OPTION)) return trigger;

      const controlledId =
        trigger.getAttribute('aria-controls') ||
        trigger.getAttribute('aria-owns');
      if (controlledId) {
        const controlled = document.getElementById(controlledId);
        if (controlled && controlled.querySelector(SELECTORS.OPTION)) {
          return controlled;
        }
      }

      const candidates = [
        ...document.querySelectorAll('div[role="listbox"], div[role="menu"]'),
      ].filter(
        (el) => el !== trigger && el.querySelector(SELECTORS.OPTION),
      );
      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];

      const focused = candidates.find((el) => el.contains(document.activeElement));
      return focused || candidates[candidates.length - 1];
    },

    // Encuentra la opción con el data-value pedido que está a la vista.
    // Al abrir el menú, Google Forms pasa las opciones al popup (que
    // queda FUERA del trigger) y deja las originales recortadas dentro.
    // Por eso se prefiere la de fuera: la de adentro no recibe el click.
    findVisibleOption(targetValue, trigger) {
      const wanted = (targetValue || '').trim();
      if (!wanted) return null;

      const options = [...document.querySelectorAll(SELECTORS.OPTION)].filter(
        (option) =>
          (option.getAttribute('data-value') || '').trim() === wanted,
      );
      if (options.length === 0) return null;

      const outside = options.filter((option) => !trigger.contains(option));
      const inside = options.filter((option) => trigger.contains(option));
      const pool = outside.length > 0 ? outside : inside;

      const visible = pool.filter((option) => api.isVisible(option));
      return visible[0] || pool[0];
    },

    // ¿Quedó seleccionada la opción? Puede quedar marcado el clon del
    // popup o el original del trigger: se busca en todos.
    isSelectedAnywhere(value) {
      const wanted = (value || '').trim();
      if (!wanted) return false;
      return [...document.querySelectorAll(SELECTORS.OPTION)].some(
        (option) =>
          (option.getAttribute('data-value') || '').trim() === wanted &&
          option.getAttribute('aria-selected') === 'true',
      );
    },

    // Hace clic en una opción probando distintas formas de hacerlo, hasta
    // que Google Forms la marque como seleccionada. Devuelve el nombre de
    // la estrategia que funcionó, o null.
    // La verificación mira TODAS las opciones con ese data-value: el
    // marcador puede quedar en la copia y no en el elemento clickeado.
    async clickOption(optionElement, targetValue) {
      const selected = () =>
        api.isSelectedAnywhere(targetValue) || api.isSelected(optionElement);

      // 1. Click directo (funciona: el popup delega el handler de
      //    selección en la opción).
      optionElement.click();
      await api.sleep(120);
      if (selected()) return 'click';

      // 2. Secuencia completa de mouse sobre la opción.
      for (const type of ['mousedown', 'mouseup', 'click']) {
        optionElement.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
          }),
        );
      }
      await api.sleep(120);
      if (selected()) return 'mouse-sequence';

      // 3. Click en el texto visible de la opción.
      const label = optionElement.querySelector('span');
      if (label) {
        label.click();
        await api.sleep(120);
        if (selected()) return 'click-label';
      }

      return null;
    },

    // Opciones del dropdown a datos planos. Se descartan las entradas sin
    // data-value: es el placeholder "Elegir" que Google Forms pone primero.
    collectOptions(container) {
      if (!container) return [];
      return [...container.querySelectorAll(SELECTORS.OPTION)]
        .filter((el) => (el.getAttribute('data-value') || '').trim() !== '')
        .map((el) => ({
          element: el,
          value: (el.getAttribute('data-value') || '').trim(),
          label: (el.innerText || el.textContent || '').trim(),
        }));
    },

    // ¿El popup está abierto?
    // OJO: las opciones SIEMPRE están en el DOM (con el menú cerrado están
    // recortadas, pero conservan su layout), así que su visibilidad NO
    // sirve como señal. La señal fiable es aria-expanded del trigger.
    isOpen(trigger) {
      return trigger.getAttribute('aria-expanded') === 'true';
    },

    // Google Forms marca la opción elegida con aria-selected="true".
    isSelected(optionElement) {
      return optionElement?.getAttribute('aria-selected') === 'true';
    },

    // El trigger muestra el valor elegido cuando el popup está cerrado.
    showsSelectedText(trigger, match, utils) {
      const wanted = utils.normalizeLabel(match.label || match.value || '');
      if (!wanted) return false;
      const text = utils.normalizeLabel(trigger.innerText || '');
      return text === wanted || text.includes(wanted);
    },

    // Busca el bloque de pregunta cuyo título contiene el texto dado.
    // Si hay varios con el mismo título (el form repite la pregunta en
    // distintas páginas/secciones), se devuelve el PRIMERO: es el que
    // corresponde a la página que se está rellenando.
    findQuestionBlock(labelText) {
      const utils = root.__ff.utils;
      const wanted = utils.normalizeLabel(labelText);
      if (!wanted) return null;

      const items = document.querySelectorAll(SELECTORS.QUESTION_BLOCK);
      for (const item of items) {
        const heading = utils.normalizeLabel(
          item.querySelector(SELECTORS.HEADING)?.innerText || '',
        );
        if (heading && heading.includes(wanted)) return item;
      }
      return null;
    },

    // Normaliza los checkboxes a datos planos (value / label).
    collectCheckboxes(scope) {
      const container = scope || document;
      return [...container.querySelectorAll(SELECTORS.CHECKBOX)].map((el) => ({
        element: el,
        value: (el.getAttribute('data-value') || '').trim(),
        label: (
          el.getAttribute('aria-label') ||
          el.parentElement?.querySelector('label')?.innerText ||
          el.innerText ||
          ''
        ).trim(),
      }));
    },

    // Marca o desmarca un checkbox y verifica el estado resultante.
    async toggleCheckbox(element, checked) {
      const isChecked = () => element.getAttribute('aria-checked') === 'true';
      if (isChecked() === checked) return true;

      element.click();
      await api.sleep(120);
      if (isChecked() === checked) return true;

      // Fallback: input[type=checkbox] oculto asociado al control.
      const input =
        element.parentElement?.querySelector('input[type="checkbox"]') ||
        element.querySelector('input[type="checkbox"]');
      if (input) {
        input.checked = checked;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await api.sleep(80);
        if (isChecked() === checked) return true;
      }
      return false;
    },

    // Marca los checkboxes de una sección del form (ej. "Etiquetas del
    // contacto"). Sólo marca lo que el operador pidió: lo que no está en
    // la lista se deja como esté. Devuelve { filled, failed }.
    async fillCheckboxes(scopeLabel, wantedLabels) {
      const utils = root.__ff.utils;
      const result = { filled: 0, failed: [] };
      const wanted = Array.isArray(wantedLabels) ? wantedLabels : [];
      if (wanted.length === 0) return result;

      const scope = api.findQuestionBlock(scopeLabel);
      let pool = api.collectCheckboxes(scope);
      if (pool.length === 0) {
        // La sección puede no estar agrupada como una sola pregunta:
        // se busca en todo el documento por etiqueta exacta.
        pool = api.collectCheckboxes(null);
      }

      for (const tag of wanted) {
        const match = utils.findBestOption(pool, tag);
        if (!match || utils.optionMatchScore(match, tag) < 88) {
          result.failed.push(tag);
          continue;
        }
        if (await api.toggleCheckbox(match.element, true)) {
          result.filled++;
        } else {
          result.failed.push(tag);
        }
      }

      return result;
    },

    // Selecciona una opción en TODOS los bloques de pregunta cuyo título
    // contenga el texto dado.
    // OJO: el selector de bloques matchea DOS veces la misma pregunta (el
    // contenedor div[jsmodel=CP1oW] y su hijo div.geS5n). Sin agrupar por
    // identidad del trigger se llenaría el mismo dropdown dos veces (y se
    // vería abrir y cerrar dos veces).
    // Devuelve { ok, filled, failed }.
    async selectDropdownByHeading(headingText, targetValue) {
      const utils = root.__ff.utils;
      const wanted = utils.normalizeLabel(headingText);
      const result = { filled: 0, failed: [] };
      if (!wanted) return result;

      const items = [...document.querySelectorAll(SELECTORS.QUESTION_BLOCK)];
      const seen = new Set();
      const matching = [];

      for (const item of items) {
        const heading = utils.normalizeLabel(
          item.querySelector(SELECTORS.HEADING)?.innerText || '',
        );
        if (!heading || !heading.includes(wanted)) continue;

        // Un dropdown = un trigger. La pregunta duplicada en el DOM
        // apunta al mismo trigger, así que se cuenta una sola vez.
        const trigger = item.querySelector(SELECTORS.LISTBOX);
        const key = trigger || item;
        if (seen.has(key)) continue;
        seen.add(key);
        matching.push(item);
      }

      for (const item of matching) {
        const selection = await api.selectDropdownOption(item, targetValue);
        if (selection.ok) result.filled++;
        else result.failed.push(headingText);
      }

      return result;
    },

    // Selecciona una opción de un dropdown de Google Forms.
    // Devuelve { ok, label, error } para que el caller pueda informar
    // qué quedó sin rellenar en vez de contar un intento como un acierto.
    async selectDropdownOption(itemElement, targetValue) {
      if (!itemElement || !targetValue) {
        return { ok: false, error: 'faltan argumentos' };
      }

      const utils = root.__ff.utils;
      const trigger = itemElement.querySelector(SELECTORS.LISTBOX);
      if (!trigger) {
        return { ok: false, error: 'no se encontró el dropdown' };
      }
      // El contenedor de opciones se resuelve ANTES de abrir: en Google
      // Forms las opciones cuelgan del propio trigger.
      const container = api.findOptionContainer(trigger);
      const options = api.collectOptions(container);
      if (options.length === 0) {
        return { ok: false, error: 'el dropdown no tiene opciones' };
      }

      const match = utils.findBestOption(options, targetValue);
      if (!match) {
        return { ok: false, error: `opción no encontrada: ${targetValue}` };
      }

      // Abrir el menú.
      let opened = await api.openListbox(trigger);

      // Si no abrió, clickear una opción también abre el menú (Google
      // Forms clona las opciones al popup en ese momento).
      if (!opened) {
        match.element.click();
        opened = await api.waitFor(() => api.isOpen(trigger), 800);
      }
      if (!opened) {
        api.closeListbox(trigger);
        return { ok: false, error: 'no se abrió la lista de opciones' };
      }

      // Con el menú abierto, las opciones están en el popup (fuera del
      // trigger): la original queda recortada y no recibe el click. Se
      // busca DIRECTAMENTE la opción del popup, sin adivinar qué
      // contenedor es (en la pág. 3 hay varios dropdowns y varios popups).
      const openOption = api.findVisibleOption(targetValue, trigger);
      const target = {
        element: openOption || match.element,
        value: match.value,
        label: match.label,
      };

      // Camino principal: click sobre la opción (con varias formas de
      // hacer click, porque Google Forms delega el handler en el popup).
      const strategy = await api.clickOption(target.element, targetValue);
      if (strategy && api.isSelectedAnywhere(targetValue)) {
        return {
          ok: true,
          label: target.label || target.value,
          strategy,
        };
      }

      // SIN fallback por teclado a propósito: barrer el menú con las
      // flechas deja el dropdown scrolleado al final y ensucia el form.
      // Si el click no selecciona, se informa el fallo y el operador lo ve.
      api.closeListbox(trigger);
      await api.sleep(150);

      if (api.showsSelectedText(trigger, target, utils)) {
        return {
          ok: true,
          label: target.label || target.value,
          strategy: 'texto',
        };
      }

      return { ok: false, error: `no se pudo seleccionar: ${targetValue}` };
    },
  };

  root.__ff = root.__ff || {};
  root.__ff.helpers = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
