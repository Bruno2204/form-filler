// ─── DOM HELPERS ─────────────────────────────────────────────────────────
// Reusable low-level DOM utilities. Attaches to window.__ff.helpers.
// Wrapped in IIFE so the top-level `const` destructuring doesn't leak
// into the shared global scope and clash with sibling content files.

(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const { SELECTORS } = root.__ff || {};

  // Intervalo de sondeo al esperar un cambio de estado en el DOM.
  // 16 ms ≈ un frame a 60 Hz: lo bastante rápido para que el relleno se
  // vea instantáneo, sin quemar CPU con un poll agresivo.
  const POLL_INTERVAL = 16;

  // Cuántos microtask yields se dan antes de caer al fallback de macrotask.
  // El change detection de Angular (zone.js) corre al vaciar el microtask
  // queue: con un par de yields alcanza para un cambio de atributo. Se
  // dan más porque Forms puede encadenar varias tareas de ese tipo antes
  // de actualizar el DOM (construir el popup es un caso así).
  //
  // Son gratis (no hay timer) y NO dejan pintar al navegador.
  const MICRO_YIELDS = 12;

  // Retardo del fallback de macrotask. El primero es 0 ms a propósito: el
  // cambio del form se aplica al final de la tarea en curso, así que un
  // solo tick alcanza. Después se separa para no quemar CPU si nunca llega.
  const MACRO_BACKOFF = [0, 0, 1, 2, 4, 8];


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

    // Espera activa: sondea el predicado hasta que devuelva un valor
    // truthy, en vez de dormir una cantidad fija de tiempo.
    //
    // Hace esto en dos fases, y el orden importa:
    //
    // 1. MICROTASK (primero, y es lo habitual). Google Forms corre sobre
    //    Angular: tras el click, el change detection se dispara al
    //    vaciar el microtask queue. Un yield de microtask alcanza para
    //    que el DOM ya esté actualizado — y NO deja pintar al
    //    navegador, así que el menú abierto no llega a verse.
    //
    // 2. MACROTASK (respaldo). Si el cambio no llegó por microtask
    //    (un rAF o un timer dentro del form), se cede al event loop con
    //    un timer. Acá el navegador SÍ puede pintar, así que sólo se
    //    llega acá cuando no hay otra opción.
    //
    // Con esperas fijas (sleep) se pagaba el coste completo (120 ms por
    // click) aunque el resultado estuviera listo a los 5 ms, y se veía el
    // menú parpadear.
    async waitFor(predicate, timeout = 2000, interval = POLL_INTERVAL) {
      const deadline = Date.now() + timeout;
      let attempt = 0;

      for (;;) {
        const value = predicate();
        if (value) return value;
        if (Date.now() >= deadline) return null;

        // Fase 1: microtasks. Gratis y sin pintar.
        for (let i = 0; i < MICRO_YIELDS; i += 1) {
          await Promise.resolve();
          const micro = predicate();
          if (micro) return micro;
        }

        // Fase 2: macrotask, con backoff para no quemar CPU.
        const delay =
          attempt < MACRO_BACKOFF.length ? MACRO_BACKOFF[attempt] : interval;
        attempt += 1;
        await api.sleep(delay);
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
    //
    // `targetValue` es la opción que se quiere elegir: sirve para
    // esperar a que ÉSA se mueva al popup (y no confundirse con el popup
    // de otro dropdown de la misma página).
    async openListbox(trigger, targetValue = '') {
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

      // Espera a que nuestra opción se mueva al popup (o a que el trigger
      // se marque como abierto). Son dos señales distintas:
      //
      // - La PRIMERA vez (frío) Forms tiene que clonar las ~25 opciones
      //   y meter el popup en el body: eso es trabajo de layout y el DOM
      //   cambia en un MACROTASK. Con microtasks no alcanza y hay que
      //   ceder el control → el navegador pinta el popup abierto.
      // - Las siguientes (caliente) el popup ya existe y sólo cambia un
      //   atributo: el DOM cambia en un MICROTASK y no se cede el
      //   control → el popup no llega a pintarse nunca.
      //
      // Por eso se dan muchos microtask yields primero (cubren el caso
      // caliente, sin pintar) y sólo después se cede al event loop (el
      // caso frío, donde no hay más opción).
      const ready = () =>
        api.isOpen(trigger) ||
        api.hasPopupOption(trigger, targetValue);
      if (await api.waitFor(ready, 600)) return true;

      // Segundo intento: sobre el valor visible (lo que hace el operador
      // a mano).
      const display = trigger.querySelector(SELECTORS.OPTION);
      if (display && display !== inner) {
        press(display);
        if (await api.waitFor(ready, 800)) return true;
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
    //
    // `getComputedStyle` fuerza un reflow y en un form grande es caro:
    // por eso sólo se usa si hay más de una opción candidata. Con una
    // sola (el caso normal) se devuelve directo.
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
      if (pool.length === 1) return pool[0];

      const visible = pool.filter((option) => api.isVisible(option));
      return visible[0] || pool[0];
    },

    // ¿La opción de ESTE dropdown ya se movió al popup?
    //
    // Al abrir, Google Forms mueve las opciones al popup (fuera del
    // trigger): la original queda recortada y no recibe el click. Que
    // nuestra opción esté fuera del trigger es la señal de que el popup
    // se construyó y ya se puede clickear la copia correcta.
    //
    // Importante: se busca SÓLO la opción que nos interesa (por
    // data-value). Buscar "cualquier opción fuera del trigger" daría
    // true por culpa del popup de otro dropdown de la misma página, y
    // este creería que ya está abierto sin haberlo abierto nunca.
    hasPopupOption(trigger, targetValue) {
      const wanted = (targetValue || '').trim();
      if (!wanted) return false;
      const options = document.querySelectorAll(SELECTORS.OPTION);
      for (const option of options) {
        if (
          (option.getAttribute('data-value') || '').trim() === wanted &&
          !trigger.contains(option)
        ) {
          return true;
        }
      }
      return false;
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
    //
    // Cada estrategia espera de forma ACTIVA (sondeo el estado) en vez de
    // dormir 120 ms a ciegas: si el click surtió efecto al primer frame,
    // se sigue al instante y el dropdown no llega a verse "parpadeando".
    async clickOption(optionElement, targetValue) {
      const selected = () =>
        api.isSelectedAnywhere(targetValue) || api.isSelected(optionElement);

      // 1. Click directo (funciona: el popup delega el handler de
      //    selección en la opción).
      optionElement.click();
      if (await api.waitFor(selected, 120)) return 'click';

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
      if (await api.waitFor(selected, 120)) return 'mouse-sequence';

      // 3. Click en el texto visible de la opción.
      const label = optionElement.querySelector('span');
      if (label) {
        label.click();
        if (await api.waitFor(selected, 120)) return 'click-label';
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
      return api.findQuestionBlocks(labelText)[0] || null;
    },

    // Igual que findQuestionBlock pero devuelve TODOS los bloques que
    // matchean. Necesario con secciones grandes (ej. "Etiquetas del
    // contacto" con 88 casillas): el form puede repartir las casillas en
    // varios bloques del DOM y buscar sólo el primero dejaría tags sin
    // marcar.
    findQuestionBlocks(labelText) {
      const utils = root.__ff.utils;
      const wanted = utils.normalizeLabel(labelText);
      if (!wanted) return [];

      const blocks = [];
      const items = document.querySelectorAll(SELECTORS.QUESTION_BLOCK);
      for (const item of items) {
        const heading = utils.normalizeLabel(
          item.querySelector(SELECTORS.HEADING)?.innerText || '',
        );
        if (heading && heading.includes(wanted)) blocks.push(item);
      }
      return blocks;
    },

    // Normaliza los checkboxes a datos planos (value / label).
    // `scope` puede ser un contenedor, una lista de contenedores o null
    // (documento entero). Los elementos repetidos se deduplican: el
    // selector de bloques matchea la misma pregunta DOS veces (contenedor
    // div[jsmodel=CP1oW] y su hijo div.geS5n).
    collectCheckboxes(scope) {
      let containers;
      if (!scope) containers = [document];
      else if (Array.isArray(scope)) containers = scope;
      else containers = [scope];

      const seen = new Set();
      const pool = [];
      containers.forEach((container) => {
        if (!container) return;
        container.querySelectorAll(SELECTORS.CHECKBOX).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          pool.push({
            element: el,
            value: (el.getAttribute('data-value') || '').trim(),
            label: (
              el.getAttribute('aria-label') ||
              el.parentElement?.querySelector('label')?.innerText ||
              el.innerText ||
              ''
            ).trim(),
          });
        });
      });
      return pool;
    },

    // Marca o desmarca un checkbox y verifica el estado resultante.
    // Espera ACTIVA: sondea `aria-checked` en vez de dormir 120 ms fijos.
    async toggleCheckbox(element, checked) {
      const isChecked = () => element.getAttribute('aria-checked') === 'true';
      if (isChecked() === checked) return true;

      element.click();
      if (await api.waitFor(() => isChecked() === checked, 120)) return true;

      // Fallback: input[type=checkbox] oculto asociado al control.
      const input =
        element.parentElement?.querySelector('input[type="checkbox"]') ||
        element.querySelector('input[type="checkbox"]');
      if (input) {
        input.checked = checked;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (await api.waitFor(() => isChecked() === checked, 80)) return true;
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

      // Se buscan TODOS los bloques con ese título: la sección "Etiquetas
      // del contacto" tiene muchas casillas y el form puede repartirlas
      // en varios bloques del DOM. Con un solo bloque, las que quedaran
      // fuera no se marcarían nunca.
      const blocks = api.findQuestionBlocks(scopeLabel);
      let pool = api.collectCheckboxes(blocks);
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
    // `minScore` descarta las coincidencias débiles (prefijo/contiene):
    // con catálogos de etiquetas eso marcaría la etiqueta vecina.
    // Devuelve { ok, filled, failed }.
    async selectDropdownByHeading(headingText, targetValue, minScore = 0) {
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
        const selection = await api.selectDropdownOption(
          item,
          targetValue,
          minScore,
        );
        if (selection.ok) result.filled++;
        else result.failed.push(headingText);
      }

      return result;
    },

    // Selecciona una opción de un dropdown de Google Forms.
    // Devuelve { ok, label, error } para que el caller pueda informar
    // qué quedó sin rellenar en vez de contar un intento como un acierto.
    // `minScore` es el puntaje mínimo aceptable de la coincidencia (100 =
    // data-value exacto). Con 0 el matching es laxo: sirve para los planes
    // (código corto "30" → "PLAN PRO 30"), pero para etiquetas marcaría la
    // opción vecina ("Reapertura" vs "Reaperturas META").
    async selectDropdownOption(itemElement, targetValue, minScore = 0) {
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
      // Coincidencia laxa (prefijo o contiene): con catálogos de etiquetas
      // eso seleccionaría la opción vecina. Se descarta.
      if (minScore > 0 && utils.optionMatchScore(match, targetValue) < minScore) {
        return {
          ok: false,
          error: `sin coincidencia exacta: ${targetValue}`,
        };
      }

      // Con qué valor se busca la opción en el DOM.
      //
      //Modo estricto (minScore > 0): se usa el data-value CANÓNICO de la
      // opción encontrada. Si el form escribe "Adicion Pospago" (sin tilde)
      // y el operador pidió "Adición Pospago", el match laxo lo encontró
      // pero las verificaciones por data-value comparan texto CRUDO y
      // fallarían. Con el valor del form la comparación es exacta.
      //
      // Modo laxo (minScore = 0): se mantiene el texto pedido, que es lo
      // que el dropdown de planes espera (código corto "30" → "PLAN PRO
      // 30" se resuelve por el trigger, no por el data-value).
      const lookupValue = minScore > 0 ? match.value || targetValue : targetValue;

      // Abrir el menú.
      let opened = await api.openListbox(trigger, lookupValue);

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
      const openOption = api.findVisibleOption(lookupValue, trigger);
      const target = {
        element: openOption || match.element,
        value: match.value,
        label: match.label,
      };

      // Camino principal: click sobre la opción (con varias formas de
      // hacer click, porque Google Forms delega el handler en el popup).
      const strategy = await api.clickOption(target.element, lookupValue);
      if (strategy && api.isSelectedAnywhere(lookupValue)) {
        // NO se cierra el popup acá. Google Forms lo cierra solo en su
        // propio ciclo, con animación; hacerlo con Escape (closeListbox)
        // podría DESELECCIONAR lo recién elegido. El popup se va solo.
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
      await api.waitFor(
        () => api.showsSelectedText(trigger, target, utils),
        150,
      );

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
