// ─── DOM HELPERS ─────────────────────────────────────────────────────────
// Reusable low-level DOM utilities. Attaches to window.__ff.helpers.
// Wrapped in IIFE so the top-level `const` destructuring doesn't leak
// into the shared global scope and clash with sibling content files.

(function () {
  const { SELECTORS } = window.__ff;

  window.__ff.helpers = {
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

    // Selecciona una opción del dropdown iterando con ArrowDown dinámicamente
    async selectDropdownOption(itemElement, targetValue) {
      const listbox = itemElement.querySelector(SELECTORS.LISTBOX);
      if (!listbox) return false;

      // 1. Abrimos el dropdown
      listbox.focus();
      listbox.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      listbox.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
      await new Promise((r) => setTimeout(r, 200));

      let found = false;

      // 2. Leemos la página para ver opciones visibles
      const visibleOptions = [
        ...document.querySelectorAll(SELECTORS.OPTION),
      ].filter((o) => {
        if (o.getAttribute('data-value') === '') return false;
        if (o.offsetParent === null) return false;

        const popupContenedor =
          o.closest('div[role="listbox"][class*="OA0qNb"]') || o.parentElement;
        if (popupContenedor) {
          const styles = window.getComputedStyle(popupContenedor);
          if (
            styles.opacity === '0' ||
            styles.visibility === 'hidden' ||
            styles.display === 'none'
          ) {
            return false;
          }
        }
        return true;
      });

      console.log(
        `Buscando "${targetValue}" entre ${visibleOptions.length} opciones REALMENTE visibles.`,
      );

      const targetLower = targetValue.toLowerCase();

      const focusedDropdown =
        document.querySelector('div[role="listbox"][aria-expanded="true"]') ||
        listbox;

      // 3. Iteramos simulando ArrowDown
      for (let i = 0; i < visibleOptions.length; i++) {
        focusedDropdown.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            bubbles: true,
            cancelable: true,
          }),
        );

        await new Promise((r) => setTimeout(r, 80));

        let currentText =
          visibleOptions[i].innerText ||
          visibleOptions[i].getAttribute('data-value') ||
          '';
        currentText = currentText.trim();

        console.log(`Intento ${i + 1}: Seleccionando -> "${currentText}"`);

        if (currentText.toLowerCase().includes(targetLower)) {
          found = true;
          console.log(`¡Elemento ${targetValue} alcanzado! Esperando 500ms...`);
          await new Promise((r) => setTimeout(r, 50));
          break;
        }
      }

      // 4. Concluimos presionando Enter
      const finalActiveEl = document.activeElement;
      if (found) {
        console.log('Disparando Enter sobre el elemento final.');
        ['keydown', 'keypress', 'keyup'].forEach((type) => {
          finalActiveEl.dispatchEvent(
            new KeyboardEvent(type, {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            }),
          );
        });
        return true;
      } else {
        console.log(`Se recorrió el dropdown y no se encontró: ${targetValue}`);
        finalActiveEl.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true,
          }),
        );
        return false;
      }
    },
  };
})();
