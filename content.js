// ─── CONTENT SCRIPT: LÓGICA DE AUTO LLENADO ─────────────────────────────
// Este archivo se inyecta en la pestaña de Google Forms
// y contiene todas las funciones de escritura de DOM separadas para facilitar su reuso y testeo.

window.FormFiller = {
  // ==============================================================================
  // 1. UTILIDADES DEL DOM (Reutilizables para cualquier página)
  // ==============================================================================
  helpers: {
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
      const items = document.querySelectorAll('div[jsmodel="CP1oW"]');
      for (const item of items) {
        const heading = item.querySelector('.M7eMe');
        if (
          heading?.innerText?.toLowerCase().includes(labelText.toLowerCase())
        ) {
          return item.querySelector('input.whsOnd, textarea.whsOnd');
        }
      }
      return null;
    },

    // Selecciona una opción del dropdown iterando con ArrowDown dinámicamente
    async selectDropdownOption(itemElement, targetValue) {
      const listbox = itemElement.querySelector('div[role="listbox"]');
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
      // Filtramos muy rígidamente para esquivar popups de otros campos que quedaron en el DOM con opacity: 0
      const visibleOptions = [
        ...document.querySelectorAll('div[role="option"]'),
      ].filter((o) => {
        if (o.getAttribute('data-value') === '') return false; // Excluimos el placeholder
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
        // Cada intento dispara un ArrowDown PRIMERO (porque asumimos que iniciamos parados en 'Elegir')
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

        // Comprobamos match
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
  },

  // ==============================================================================
  // 2. RUTINAS DE RELLENO POR PÁGINA
  // ==============================================================================

  async fillPage1(data) {
    try {
      let filled = 0;
      const { setInput, findInputByLabel, selectDropdownOption } = this.helpers;

      // ── 1. SELECT "Nombre" → "Bruno"
      const items = document.querySelectorAll('div[jsmodel="CP1oW"]');
      for (const item of items) {
        const heading = item.querySelector('.M7eMe');
        if (heading?.innerText?.trim() === 'Nombre') {
          const success = await selectDropdownOption(item, 'Bruno');
          if (success) filled++;
          break;
        }
      }

      // ── 2. RADIO "Producto"
      if (data.producto) {
        for (const item of items) {
          const heading = item.querySelector('.M7eMe');
          if (heading?.innerText?.trim() === 'Producto') {
            let radio = item.querySelector(
              `div[role="radio"][data-value="${data.producto}"]`,
            );
            if (!radio) {
              const normProd = data.producto
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
              const radios = item.querySelectorAll('div[role="radio"]');
              for (const r of radios) {
                const rVal = r.getAttribute('data-value') || '';
                const normVal = rVal
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase();
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
      const isLineaNueva =
        data.producto === 'Linea Nueva' ||
        data.producto === 'Linea Nueva Plan Anual' ||
        data.producto === 'Linea Nueva Esim' ||
        data.producto === 'Línea Nueva Prepago Esim' ||
        data.producto?.toLowerCase().includes('linea nueva') ||
        data.producto?.toLowerCase().includes('línea nueva');

      if (setInput(findInputByLabel('Nombre del cliente'), data.nombreCompleto))
        filled++;
      if (setInput(findInputByLabel('Fecha de nacimiento'), data.fecha))
        filled++;
      if (!isLineaNueva && setInput(findInputByLabel('CURP'), data.curp))
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
  },

  async fillPage2(data) {
    try {
      let filled = 0;
      const { setInput, findInputByLabel } = this.helpers;

      let formaEnvio = null;
      if (data.esEsim) {
        const isLineaNueva =
          data.producto === 'Linea Nueva Esim' ||
          data.producto === 'Línea Nueva Prepago Esim' ||
          data.producto.toLowerCase().includes('linea nueva') ||
          data.producto.toLowerCase().includes('línea nueva');
        formaEnvio = isLineaNueva ? 'esim_linea_nueva' : 'esim_pospago';
      } else {
        formaEnvio = 'cav';
      }

      const items = document.querySelectorAll('div[jsmodel="CP1oW"]');

      if (formaEnvio) {
        for (const item of items) {
          const heading = item.querySelector('.M7eMe');
          if (
            heading?.innerText?.toLowerCase().includes('forma de envío') ||
            heading?.innerText?.toLowerCase().includes('forma de envio')
          ) {
            const radios = item.querySelectorAll('div[role="radio"]');
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
            item.querySelector('.M7eMe')?.innerText?.toLowerCase()?.trim() ||
            '';
          if (
            txt === 'cp' ||
            txt === 'c.p.' ||
            txt.includes('codigo postal') ||
            txt.includes('código postal')
          ) {
            cpInput = item.querySelector('input.whsOnd, textarea.whsOnd');
            break;
          }
        }
        if (setInput(cpInput, data.cpCAC)) filled++;
      }

      return { ok: true, filled };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  async fillPage3(data) {
    try {
      let filled = 0;
      const { setInput, findInputByLabel, selectDropdownOption } = this.helpers;

      const isLineaNueva =
        data.producto === 'Linea Nueva' ||
        data.producto === 'Linea Nueva Plan Anual' ||
        data.producto === 'Linea Nueva Esim' ||
        data.producto === 'Línea Nueva Prepago Esim';
      const dnP = isLineaNueva ? 'En espera' : data.dnPortar;

      if (setInput(findInputByLabel('dn a portar'), dnP)) filled++;
      if (setInput(findInputByLabel('nip'), data.nip)) filled++;
      if (setInput(findInputByLabel('número de orden'), 'En espera')) filled++;
      if (
        setInput(findInputByLabel('lugar de nacimiento'), data.lugarNacimiento)
      )
        filled++;

      // Género Radios
      if (data.genero) {
        let gMatch = null;
        const gLow = data.genero.toLowerCase().trim();
        if (
          gLow.includes('hombre') ||
          gLow.includes('masculino') ||
          gLow === 'h'
        )
          gMatch = 'Masculino';
        else if (
          gLow.includes('mujer') ||
          gLow.includes('femenino') ||
          gLow === 'm' ||
          gLow === 'f'
        )
          gMatch = 'Femenino';

        if (gMatch) {
          for (const item of document.querySelectorAll(
            'div[jsmodel="CP1oW"]',
          )) {
            const h = item.querySelector('.M7eMe');
            if (
              h?.innerText?.toLowerCase().includes('género') ||
              h?.innerText?.toLowerCase().includes('genero')
            ) {
              const radio = item.querySelector(
                `div[role="radio"][data-value="${gMatch}"]`,
              );
              if (radio) {
                radio.click();
                filled++;
              }
              break;
            }
          }
        }
      }

      // Es con esim Radios
      for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
        if (
          item
            .querySelector('.M7eMe')
            ?.innerText?.toLowerCase()
            .includes('es con esim')
        ) {
          const value = data.esEsim ? 'si' : 'no';
          const radio = item.querySelector(
            `div[role="radio"][data-value="${value}"]`,
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
      for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
        const h = item.querySelector('.M7eMe');
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
          const radios = item.querySelectorAll('div[role="radio"]');
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
        for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
          const label =
            item.querySelector('.M7eMe')?.innerText?.toLowerCase() || '';
          if (label.includes('equipo modelo') && label.includes('esim')) {
            const listbox = item.querySelector('div[role="listbox"]');
            if (listbox) {
              const success = await selectDropdownOption(item, 'EID');
              if (success) filled++;
            } else {
              const input = item.querySelector('input.whsOnd, textarea.whsOnd');
              if (setInput(input, 'EID')) filled++;
            }
            break;
          }
        }
      }

      // FVC asignada (fecha) – solo si es con CAC
      if (data.esCAC && data.fvc) {
        // Convertir dd/mm/yyyy a yyyy-mm-dd para el input type="date"
        const parts = data.fvc.split('/');
        if (parts.length === 3) {
          const fvcISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          if (setInput(findInputByLabel('fvc asignada'), fvcISO)) filled++;
        }
      }

      // Dropdown de "Plan elegido"
      const isPrepago =
        data.producto === 'Porta Prepago' ||
        data.producto === 'Línea Nueva Prepago Esim';
      const planElegido = isPrepago ? 'Prepago' : data.plan;

      if (planElegido) {
        for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
          const heading = item.querySelector('.M7eMe');
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

      // Dropdown Usuario Backend -> CHT00096
      // const items = document.querySelectorAll('div[jsmodel="CP1oW"]');
      // for (const item of items) {
      //   const heading = item.querySelector('.M7eMe');
      //   if (heading?.innerText?.toLowerCase().includes('usuario backend')) {
      //     console.log('Detectado cajón de Usuario Backend, disparando selectDropdownOption...');
      //     const success = await selectDropdownOption(item, 'CHT00096');
      //     if (success) filled++;
      //     break;
      //   }
      // }

      return { ok: true, filled };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // ==============================================================================
  // 3. FUNCIÓN AISLADA: USUARIO BACKEND (con logging extensivo)
  // ==============================================================================

  async selectUsuarioBackend() {
    // Search Dropdown jsname="WsjYwc"
    // const item = document.querySelector('div[jsname="WsjYwc"].geS5n.Jj6Lae');
    // const dropdown = item.querySelector('[role="listbox"]')
    // // open dropdown
    // console.log(dropdown);
    // console.log('SelectDropdown');

    // for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
    //   const heading = item.querySelector('.M7eMe');
    //   if (heading?.innerText?.toLowerCase().includes('usuario backend')) {

    //     const listbox = item.querySelector('div[role="presentation"] > .MocG8c.HZ3kWc.mhLiyf.LMgvRb.KKjvXb.DEh1R');
    //     if (!listbox) return false;
    //     console.log(listbox);

    //     // 1. Abrimos el dropdown
    //     listbox.focus();
    //     listbox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    //     listbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    //   }
    // }

    const labelText = 'Usuario Backend';
    const optionValue = 'CHT00096';

    console.log('Buscando Dropdown...');
    const labels = document.querySelectorAll('.M7eMe');
    let dropdownContainer = null;

    for (const label of labels) {
      if (label.textContent.includes(labelText)) {
        dropdownContainer = label.closest('.geS5n');
        break;
      }
    }

    if (!dropdownContainer) {
      console.error('Dropdown no encontrado:', labelText);
      return false;
    }

    // 2. Hacer click en el dropdown para abrirlo
    const dropdownTrigger = dropdownContainer.querySelector('.jgvuAb');
    dropdownTrigger.click();
    console.log('Abriendo Dropdown');

    await new Promise((r) => setTimeout(r, 60));
    // 3. Esperar a que se abra y luego seleccionar la opción
    setTimeout(async () => {
      const options = dropdownContainer.querySelectorAll('[role="option"]');

      for (const option of options) {
        if (option.getAttribute('data-value') === optionValue) {
          console.log(option);

          // Google Forms usa mousedown + click para seleccionar
          option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          option.click();

          await new Promise((r) => setTimeout(r, 600));
          option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          option.click();
          console.log('Seleccionado:', optionValue);
          return true;
        }
      }

      console.error('Opción no encontrada:', optionValue);
      return false;
    }, 300);
    // for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
    //   console.log('first', item);

    //   if (!item) return false;

    //   // 1. Abrimos el dropdown
    //   item.focus();
    //   await new Promise(r => setTimeout(r, 600));
    //   item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    //   await new Promise(r => setTimeout(r, 600));
    //   item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    //   await new Promise(r => setTimeout(r, 600));

    // }

    // for (const item of document.querySelectorAll('div[jsmodel="CP1oW"]')) {
    //   const heading = item.querySelector('.M7eMe');

    //   if (heading?.innerText?.toLowerCase().includes('usuario backend')) {
    //     // Buscamos el activador del dropdown por su rol de accesibilidad
    //     const selector = item.querySelector('[role="listbox"]') || item.querySelector('[role="presentation"]');

    //     if (selector) {
    //       console.log('Elemento encontrado, intentando abrir...');

    //       // 1. Darle foco
    //       selector.focus();

    //       // 2. Simular la secuencia completa de eventos de ratón
    //       const eventos = ['mousedown', 'mouseup', 'click'];
    //       eventos.forEach(tipo => {
    //         selector.dispatchEvent(new MouseEvent(tipo, {
    //           view: window,
    //           bubbles: true,
    //           cancelable: true,
    //           buttons: 1
    //         }));
    //       });

    //       // 3. Esperar un momento a que las opciones aparezcan en el DOM
    //       await new Promise(r => setTimeout(r, 500));

    //       // Aquí es donde buscarías las opciones (usualmente están al final del body)
    //       console.log('El menú debería estar abierto ahora.');
    //     }
    //   }
    // }

    // const dropdown = items.innerText().includes('Usuario Backend');
    // if (!dropdown) {
    //   return { ok: false, error: 'Dropdown no encontrado' };
    // }
    // console.log(dropdown);

    // Click Dropdown
    // dropdown.click();
    // // await new Promise(r => setTimeout(r, 1000));

    // // Search Option CHT00096
    // const option = document.querySelector('div[data-value="CHT00096"]');
    // if (!option) {
    //   return { ok: false, error: 'Option no encontrada' };
    // }

    // // Click Option
    // option.click();
    // await new Promise(r => setTimeout(r, 1000));

    return { ok: true, filled: 1 };
  },
};
