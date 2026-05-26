async function selectDropdownOption(itemElement, targetValue) {
  const listbox = itemElement.querySelector('div[role="listbox"]');
  if (!listbox) return false;

  // 1. Abrimos el dropdown
  listbox.focus();
  listbox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  listbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 600));

  let found = false;

  // 2. Leemos la página para ver opciones visibles
  // Filtramos muy rígidamente para esquivar popups de otros campos que quedaron en el DOM con opacity: 0
  const visibleOptions = [...document.querySelectorAll('div[role="option"]')].filter(o => {
    if (o.getAttribute('data-value') === '') return false; // Excluimos el placeholder
    if (o.offsetParent === null) return false;

    const popupContenedor = o.closest('div[role="listbox"][class*="OA0qNb"]') || o.parentElement;
    if (popupContenedor) {
      const styles = window.getComputedStyle(popupContenedor);
      if (styles.opacity === '0' || styles.visibility === 'hidden' || styles.display === 'none') {
        return false;
      }
    }
    return true;
  });

  console.log(`Buscando "${targetValue}" entre ${visibleOptions.length} opciones REALMENTE visibles.`);

  const targetLower = targetValue.toLowerCase();

  const focusedDropdown = document.querySelector('div[role="listbox"][aria-expanded="true"]') || listbox;

  // 3. Iteramos simulando ArrowDown
  for (let i = 0; i < visibleOptions.length; i++) {

    // Cada intento dispara un ArrowDown PRIMERO (porque asumimos que iniciamos parados en 'Elegir')
    focusedDropdown.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40,
      bubbles: true, cancelable: true
    }));

    await new Promise(r => setTimeout(r, 80));

    let currentText = visibleOptions[i].innerText || visibleOptions[i].getAttribute('data-value') || '';
    currentText = currentText.trim();

    console.log(`Intento ${i + 1}: Seleccionando -> "${currentText}"`);

    // Comprobamos match
    if (currentText.toLowerCase().includes(targetLower)) {
      found = true;
      console.log(`¡Elemento ${targetValue} alcanzado! Esperando 500ms...`);
      await new Promise(r => setTimeout(r, 50));
      break;
    }
  }

  // 4. Concluimos presionando Enter
  const finalActiveEl = document.activeElement;
  if (found) {
    console.log("Disparando Enter sobre el elemento final.");
    ['keydown', 'keypress', 'keyup'].forEach(type => {
      finalActiveEl.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));
    });
    return true;
  } else {
    console.log(`Se recorrió el dropdown y no se encontró: ${targetValue}`);
    finalActiveEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', keyCode: 27,
      bubbles: true, cancelable: true
    }));
    return false;
  }
}