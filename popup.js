// ─── LÓGICA DE LA UI Y EVENTOS DE LA EXTENSIÓN ────────────────────────────────
// Utiliza la función parseData de parser.js, precargada en popup.html

function showPreview(data) {
  const preview = document.getElementById('preview');
  preview.style.display = 'block';
  let html = `
    <div><b>Producto:</b> ${data.producto}</div>
    <div><b>Plan:</b> ${data.plan}</div>
    <div><b>Nombre:</b> ${data.nombreCompleto}</div>
    <div><b>Fecha nac.:</b> ${data.fecha}</div>
    ${data.curp ? `<div><b>CURP:</b> ${data.curp}</div>` : ''}
    <div><b>DN contacto:</b> ${data.dn}</div>
    <div><b>Email:</b> ${data.email}</div>
    <div><b>Género:</b> ${data.genero}</div>
    <div><b>Lugar de Nac.:</b> ${data.lugarNacimiento}</div>
    ${data.dnPortar ? `<div><b>DN a portar:</b> ${data.dnPortar}</div>` : ''}
    ${data.equipo ? `<div><b>Equipo:</b> ${data.equipo}</div>` : ''}
    ${data.nombreCAV ? `<div><b>Nombre CAV:</b> ${data.nombreCAV}</div>` : ''}
    ${data.cp ? `<div><b>CP:</b> ${data.cp}</div>` : ''}
  `;
  if (data.esCAC && data.fvc) {
    html += `<div><b>FVC:</b> ${data.fvc}</div>`;
  }
  preview.innerHTML = html;
}

document.getElementById('input').addEventListener('input', function () {
  const val = this.value;
  localStorage.setItem('cac_raw_input', val);
  const data = parseData(val); // parseData() viene de parser.js
  if (data.nombreCompleto) {
    showPreview(data);
  } else {
    document.getElementById('preview').style.display = 'none';
  }
});

// Restaurar el texto guardado cuando se abre el popup
document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('input');
  const saved = localStorage.getItem('cac_raw_input');
  if (saved) {
    inputEl.value = saved;
    inputEl.dispatchEvent(new Event('input'));
  }
});

document.getElementById('btnClear').addEventListener('click', () => {
  const inputEl = document.getElementById('input');
  inputEl.value = '';
  inputEl.dispatchEvent(new Event('input'));
  localStorage.removeItem('cac_raw_input');
  document.getElementById('status').textContent = '🧹 Datos borrados.';
});

// ─── HELPERS DE INYECCIÓN Y CROMO ──────────────────────────────────────────────

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Inyecta dinámicamente content.js si no lo está y manda a rellenar la página N
async function runFillerOnPage(pageFunctionName) {
  const data = parseData(document.getElementById('input').value);
  const status = document.getElementById('status');
  if (!data) { status.textContent = '⚠ No se detectaron datos.'; return; }

  const tab = await getTab();

  // Inyectar el script con la lógica grande (content.js) si es necesario.
  // Es súper útil inyectarlo en cada intento, así siempre corre la lógica fresca.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });

  // Disparamos la llamada a la función window.FormFiller
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (pageFuncStr, d) => {
      return await window.FormFiller[pageFuncStr](d);
    },
    args: [pageFunctionName, data],
  });

  const r = results?.[0]?.result;
  status.textContent = r?.ok
    ? `✅ ${r.filled} campo(s) rellenados en ${pageFunctionName}.`
    : `⚠ ${r?.error ?? 'Error desconocido'}`;
}

// ─── EVENTOS A LOS BOTONES ──────────────────────────────────────────────────

document.getElementById('btn1').addEventListener('click', () => runFillerOnPage('fillPage1'));
document.getElementById('btn2').addEventListener('click', () => runFillerOnPage('fillPage2'));
document.getElementById('btn3').addEventListener('click', () => runFillerOnPage('fillPage3'));
document.getElementById('btnBackend').addEventListener('click', () => runFillerOnPage('selectUsuarioBackend'));
