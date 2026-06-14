// ─── LÓGICA DE LA UI Y EVENTOS DE LA EXTENSIÓN ────────────────────────────────
// Utiliza la función parseData de parser.js, precargada en popup.html

const PRODUCT_TEMPLATES = {
  POS_ESIM: (d) => `POSPAGO ESIM
EQUIPO: EID
PLAN: ${d.plan || ''}
DN A PORTAR: ${d.dnPortar || ''}
NIP: ${d.nip || ''}
DN ADICIONAL: ${d.dnAdicional || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}
Sexo: ${d.genero || ''}
FECHA NACIM: ${d.fecha || ''}
ESTADO NACIM: ${d.lugarNacimiento || ''}
CURP VERIFICADO: ${d.curp || ''}`,

  POS_CAC: (d) => `POSPAGO CAC
PLAN: ${d.plan || ''}
DN A PORTAR: ${d.dnPortar || ''}
NIP: ${d.nip || ''}
DN ADICIONAL: ${d.dnAdicional || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}
Sexo: ${d.genero || ''}
FECHA NACIM: ${d.fecha || ''}
ESTADO NACIM: ${d.lugarNacimiento || ''}
CURP VERIFICADO: ${d.curp || ''}

CAC: ${d.nombreCAV || ''}
CP: ${d.cpCAC || ''}
FVC: ${d.fvc || ''}`,

  LN_ESIM: (d) => `Línea Nueva ESIM
PLAN: ${d.plan || ''}
EQUIPO: EID
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}

DN CONTACTO: ${d.dnContacto || ''}
FECHA NACIM: ${d.fecha || ''}
SEXO: ${d.genero || ''}
Estado de nacimiento: ${d.lugarNacimiento || ''}

CALLE: ${d.calle || ''}
NUMERO EXTERIOR: ${d.numExt || ''}
NÚMERO INTERIOR (en caso de tener): ${d.numInt || ''}
CÓDIGO POSTAL: ${d.cpDireccion || ''}
COLONIA: ${d.colonia || ''}`,

  LN_CAC: (d) => `Línea Nueva CAC
PLAN: ${d.plan || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}

DN CONTACTO: ${d.dnContacto || ''}
FECHA NACIM: ${d.fecha || ''}
SEXO: ${d.genero || ''}
Estado de nacimiento: ${d.lugarNacimiento || ''}

CALLE: ${d.calle || ''}
NUMERO EXTERIOR: ${d.numExt || ''}
NÚMERO INTERIOR (en caso de tener): ${d.numInt || ''}
CÓDIGO POSTAL: ${d.cpDireccion || ''}
COLONIA: ${d.colonia || ''}

CAC: ${d.nombreCAV || ''}
CP: ${d.cpCAC || ''}
FVC: ${d.fvc || ''}`,

  PRE_ESIM: (d) => `Línea Nueva Prepago ESIM
EQUIPO: EID
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}

DN CONTACTO: ${d.dnContacto || ''}
FECHA NACIM: ${d.fecha || ''}
SEXO: ${d.genero || ''}
Estado de nacimiento: ${d.lugarNacimiento || ''}`,

  PREPAGO: (d) => `PREPAGO
DN A PORTAR: ${d.dnPortar || ''}
NIP: ${d.nip || ''}
DN ADICIONAL: ${d.dnAdicional || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}
Sexo: ${d.genero || ''}
FECHA NACIM: ${d.fecha || ''}
ESTADO NACIM: ${d.lugarNacimiento || ''}
CURP VERIFICADO: ${d.curp || ''}

CAC: ${d.nombreCAV || ''}
CP: ${d.cpCAC || ''}
FVC: ${d.fvc || ''}`,

  ADIC_CAC: (d) => `Adición CAC
PLAN: ${d.plan || ''}
DN MOVISTAR: ${d.dnMovistar || ''}

DN CONTACTO: ${d.dnContacto || ''}
CORREO: ${d.email || ''}
NOMBRE TITULAR: ${d.nombreTitular || ''}

CAC: ${d.nombreCAV || ''}
CP: ${d.cpCAC || ''}`
};

const PRODUCT_FIELDS = {
  POS_ESIM: ['linea', 'curp', 'eid'],
  POS_CAC: ['linea', 'curp', 'cac', 'eid'],
  LN_ESIM: ['linea', 'curp', 'direccion', 'eid'],
  LN_CAC: ['linea', 'curp', 'direccion', 'cac', 'eid'],
  PRE_ESIM: ['linea', 'curp', 'eid'],
  PREPAGO: ['linea', 'curp', 'cac', 'eid'],
  ADIC_CAC: ['linea', 'cac', 'eid']
};

const PHONE_FIELDS = ['dnPortar', 'dnAdicional', 'dnContacto', 'dnMovistar'];

const PRODUCT_REQUIRED_FIELDS = {
  POS_ESIM: [
    'plan', 'dnPortar', 'nip', 'dnAdicional', 'email',
    'nombres', 'apellido1', 'apellido2', 'genero', 'fecha', 'lugarNacimiento', 'curp',
    'chatId', 'dnChat', 'eid'
  ],
  POS_CAC: [
    'plan', 'dnPortar', 'nip', 'dnAdicional', 'email',
    'nombres', 'apellido1', 'apellido2', 'genero', 'fecha', 'lugarNacimiento', 'curp',
    'nombreCAV', 'cpCAC', 'fvc',
    'chatId', 'dnChat', 'eid'
  ],
  LN_ESIM: [
    'plan', 'email',
    'nombres', 'apellido1', 'apellido2',
    'dnContacto', 'fecha', 'genero', 'lugarNacimiento',
    'calle', 'cpDireccion', 'colonia',
    'chatId', 'dnChat', 'eid'
  ],
  LN_CAC: [
    'plan', 'email',
    'nombres', 'apellido1', 'apellido2',
    'dnContacto', 'fecha', 'genero', 'lugarNacimiento',
    'calle', 'cpDireccion', 'colonia',
    'nombreCAV', 'cpCAC', 'fvc',
    'chatId', 'dnChat', 'eid'
  ],
  PRE_ESIM: [
    'email',
    'nombres', 'apellido1', 'apellido2',
    'dnContacto', 'fecha', 'genero', 'lugarNacimiento',
    'chatId', 'dnChat', 'eid'
  ],
  PREPAGO: [
    'dnPortar', 'nip', 'dnAdicional', 'email',
    'nombres', 'apellido1', 'apellido2', 'genero', 'fecha', 'lugarNacimiento', 'curp',
    'nombreCAV', 'cpCAC', 'fvc',
    'chatId', 'dnChat'
  ],
  ADIC_CAC: [
    'plan', 'dnMovistar',
    'dnContacto', 'email', 'nombreTitular',
    'nombreCAV', 'cpCAC',
    'chatId', 'dnChat'
  ]
};

const FIELD_LABELS = {
  plan: 'Plan',
  dnPortar: 'DN a portar',
  nip: 'NIP',
  dnAdicional: 'DN adicional',
  email: 'Correo',
  nombres: 'Nombre(s)',
  apellido1: 'Primer apellido',
  apellido2: 'Segundo apellido',
  genero: 'Sexo',
  fecha: 'Fecha de nacimiento',
  lugarNacimiento: 'Estado de nacimiento',
  curp: 'CURP',
  nombreCAV: 'CAC',
  cpCAC: 'C.P. CAC',
  fvc: 'FVC',
  dnContacto: 'DN contacto',
  dnMovistar: 'DN Movistar',
  nombreTitular: 'Nombre titular',
  calle: 'Calle',
  cpDireccion: 'Código postal',
  colonia: 'Colonia',
  chatId: 'ID del chat',
  dnChat: 'DN Respond',
  eid: 'EID',
  dnSame: 'DN portar y adicional (deben ser distintos)'
};

let activeProduct = 'POS_ESIM';
let missingPanelOpen = false;

// Cambia de producto y actualiza la visibilidad de los textareas
function selectProduct(productKey) {
  activeProduct = productKey;
  localStorage.setItem('active_product', productKey);

  // Marcar botón activo
  document.querySelectorAll('.btn-product').forEach((btn) => {
    if (btn.getAttribute('data-product') === productKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Mostrar/ocultar textareas correspondientes
  const allowedFields = PRODUCT_FIELDS[productKey] || [];
  const allGroups = ['linea', 'curp', 'direccion', 'cac', 'eid'];

  allGroups.forEach((field) => {
    const groupEl = document.getElementById(`group-${field}`);
    if (allowedFields.includes(field)) {
      groupEl.classList.remove('hidden');
    } else {
      groupEl.classList.add('hidden');
    }
  });

  // Forzar actualización del procesamiento de datos
  processData();
}

// Procesa y formatea los datos recopilados de los textareas visibles
function processData() {
  const allowedFields = PRODUCT_FIELDS[activeProduct] || [];
  let combinedText = '';

  // Concatenar el contenido de los campos habilitados para procesar todo junto
  allowedFields.forEach((field) => {
    const val = document.getElementById(`input-${field}`).value;
    combinedText += '\n' + val;
    // Guardar estado en localStorage
    localStorage.setItem(`input_cache_${field}`, val);
  });

  // Llamar al parser de parser.js
  const parsed = parseData(
    combinedText,
    activeProduct,
    document.getElementById('input-linea').value,
    document.getElementById('input-cac').value,
    document.getElementById('input-direccion').value,
    document.getElementById('input-eid').value
  );

  // Mapear "producto" para autocompletado en Google Forms si es necesario
  parsed.producto = getCleanProductName(activeProduct, parsed.esEsim);

  validatePhones(parsed);
  validateChat(parsed);
  updateFormActionsState(parsed);

  // Renderizar la plantilla correspondiente
  const formatter = PRODUCT_TEMPLATES[activeProduct];
  const formattedResult = formatter ? formatter(parsed) : '';

  document.getElementById('result-final').value = formattedResult;
}

function isFieldEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function isPhoneFieldInvalid(field, value) {
  if (!PHONE_FIELDS.includes(field)) return false;
  if (isFieldEmpty(value)) return false;
  return String(value).replace(/\D/g, '').length !== 10;
}

function validateRequiredData(d, productKey) {
  const required = PRODUCT_REQUIRED_FIELDS[productKey] || [];
  const missing = [];

  required.forEach((field) => {
    if (field === 'eid') {
      if (!d.esEsim) return;
      if (isFieldEmpty(d.eid) || !d.eidValid) missing.push(field);
      return;
    }
    if (isFieldEmpty(d[field]) || isPhoneFieldInvalid(field, d[field])) {
      missing.push(field);
    }
  });

  if (required.includes('dnPortar') && required.includes('dnAdicional')) {
    if (d.dnPortar && d.dnAdicional && d.dnPortar === d.dnAdicional) {
      missing.push('dnSame');
    }
  }

  return { valid: missing.length === 0, missing };
}

function getMissingFieldLabel(field, d) {
  if (field === 'dnSame') return FIELD_LABELS.dnSame;
  const label = FIELD_LABELS[field] || field;
  if (PHONE_FIELDS.includes(field) && !isFieldEmpty(d[field]) && isPhoneFieldInvalid(field, d[field])) {
    return `${label} (debe tener 10 dígitos)`;
  }
  if (field === 'eid' && !isFieldEmpty(d.eid) && !d.eidValid) {
    return 'EID (debe tener 5 dígitos)';
  }
  return label;
}

function updateFormActionsState(d) {
  const { valid, missing } = validateRequiredData(d, activeProduct);

  const badge = document.getElementById('missing-data-badge');
  const infoBtn = document.getElementById('btn-missing-info');
  const panel = document.getElementById('missing-details-panel');
  const list = document.getElementById('missing-details-list');

  badge.classList.toggle('visible', !valid);
  infoBtn.classList.toggle('visible', !valid);
  infoBtn.textContent = missing.length > 0 ? String(missing.length) : '?';

  if (valid) {
    missingPanelOpen = false;
    panel.classList.remove('visible');
    list.innerHTML = '';
  } else {
    list.innerHTML = missing
      .map((field) => `<li>${getMissingFieldLabel(field, d)}</li>`)
      .join('');
    panel.classList.toggle('visible', missingPanelOpen);
  }

  ['btn1', 'btn2', 'btn3'].forEach((id) => {
    document.getElementById(id).disabled = !valid;
  });
}

// Retorna el nombre legible del producto para que el content script lo detecte al llenar el form
function getCleanProductName(productKey, esEsim) {
  switch (productKey) {
    case 'ADIC_CAC': return 'Adición';
    case 'PRE_ESIM': return 'Línea Nueva Prepago Esim';
    case 'PREPAGO': return 'Porta Prepago';
    case 'POS_ESIM': return 'Porta Pospago Esim';
    case 'POS_CAC': return 'Porta Pospago';
    case 'LN_ESIM': return 'Linea Nueva Esim';
    case 'LN_CAC': return 'Linea Nueva';
    default: return 'Porta Pospago';
  }
}

// Valida si los teléfonos del producto tienen exactamente 10 dígitos
function validatePhones(d) {
  const alertPortar = document.getElementById('phone-alert-portar');
  const alertAdicional = document.getElementById('phone-alert-adicional');
  const alertContacto = document.getElementById('phone-alert-contacto');
  const alertMovistar = document.getElementById('phone-alert-movistar');
  const alertSame = document.getElementById('phone-alert-same');

  // Ocultar por defecto
  alertPortar.style.display = 'none';
  alertAdicional.style.display = 'none';
  alertContacto.style.display = 'none';
  alertMovistar.style.display = 'none';
  alertSame.style.display = 'none';

  const templateStr = PRODUCT_TEMPLATES[activeProduct].toString();

  if (templateStr.includes('dnPortar') && d.dnPortar && d.dnPortar.length !== 10) {
    alertPortar.style.display = 'block';
  }
  if (templateStr.includes('dnAdicional') && d.dnAdicional && d.dnAdicional.length !== 10) {
    alertAdicional.style.display = 'block';
  }
  if (templateStr.includes('dnContacto') && d.dnContacto && d.dnContacto.length !== 10) {
    alertContacto.style.display = 'block';
  }
  if (templateStr.includes('dnMovistar') && d.dnMovistar && d.dnMovistar.length !== 10) {
    alertMovistar.style.display = 'block';
  }
  if (d.dnPortar && d.dnAdicional && d.dnPortar === d.dnAdicional) {
    alertSame.style.display = 'block';
  }
}

function validateChat(d) {
  const alertChatId = document.getElementById('chat-alert-id');
  const alertDnChat = document.getElementById('chat-alert-dn');
  const alertEid = document.getElementById('chat-alert-eid');

  alertChatId.style.display = 'none';
  alertDnChat.style.display = 'none';
  alertEid.style.display = 'none';

  const chatText = document.getElementById('input-eid').value.trim();
  if (!chatText) return;

  if (!d.chatId) alertChatId.style.display = 'block';
  if (!d.dnChat) alertDnChat.style.display = 'block';
  if (d.esEsim && (!d.eid || !d.eidValid)) alertEid.style.display = 'block';
}

// Copiar resultado al portapapeles
document.getElementById('btn-missing-info').addEventListener('click', () => {
  missingPanelOpen = !missingPanelOpen;
  document.getElementById('missing-details-panel').classList.toggle('visible', missingPanelOpen);
});

document.getElementById('btnCopy').addEventListener('click', () => {
  const resultText = document.getElementById('result-final');
  resultText.select();
  document.execCommand('copy');

  const copyBtn = document.getElementById('btnCopy');
  copyBtn.textContent = '¡Copiado!';
  copyBtn.style.background = '#0f9d58';
  
  setTimeout(() => {
    copyBtn.textContent = 'Copiar';
    copyBtn.style.background = 'var(--success)';
  }, 1500);
});

// Limpiar todas las entradas y cache
document.getElementById('btnClear').addEventListener('click', () => {
  const allGroups = ['linea', 'curp', 'direccion', 'cac', 'eid'];
  allGroups.forEach((field) => {
    document.getElementById(`input-${field}`).value = '';
    localStorage.removeItem(`input_cache_${field}`);
  });
  document.getElementById('result-final').value = '';
  document.getElementById('phone-alert-portar').style.display = 'none';
  document.getElementById('phone-alert-adicional').style.display = 'none';
  document.getElementById('phone-alert-contacto').style.display = 'none';
  document.getElementById('phone-alert-movistar').style.display = 'none';
  document.getElementById('phone-alert-same').style.display = 'none';
  document.getElementById('chat-alert-id').style.display = 'none';
  document.getElementById('chat-alert-dn').style.display = 'none';
  document.getElementById('chat-alert-eid').style.display = 'none';
  missingPanelOpen = false;
  document.getElementById('missing-details-panel').classList.remove('visible');
  updateFormActionsState({});
  document.getElementById('status').textContent = '🧹 Datos borrados.';
  setTimeout(() => {
    document.getElementById('status').textContent = '';
  }, 2000);
});

// Cargar estado inicial
document.addEventListener('DOMContentLoaded', () => {
  // Cargar textareas desde localStorage
  const allGroups = ['linea', 'curp', 'direccion', 'cac', 'eid'];
  allGroups.forEach((field) => {
    const saved = localStorage.getItem(`input_cache_${field}`);
    if (saved) {
      document.getElementById(`input-${field}`).value = saved;
    }
  });

  // Restaurar producto activo
  const savedProduct = localStorage.getItem('active_product') || 'POS_ESIM';
  selectProduct(savedProduct);

  // Escuchar eventos input en cada textarea
  allGroups.forEach((field) => {
    document.getElementById(`input-${field}`).addEventListener('input', processData);
  });
});

// Asignar click a botones de producto
document.querySelectorAll('.btn-product').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const prod = e.target.getAttribute('data-product');
    selectProduct(prod);
  });
});

// ─── HELPERS DE INYECCIÓN Y AUTOLLENADO ──────────────────────────────────────

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Obtiene los datos acumulados parseados
function getAccumulatedData() {
  const allowedFields = PRODUCT_FIELDS[activeProduct] || [];
  let combinedText = '';
  allowedFields.forEach((field) => {
    combinedText += '\n' + document.getElementById(`input-${field}`).value;
  });
  const parsed = parseData(
    combinedText,
    activeProduct,
    document.getElementById('input-linea').value,
    document.getElementById('input-cac').value,
    document.getElementById('input-direccion').value,
    document.getElementById('input-eid').value
  );
  parsed.producto = getCleanProductName(activeProduct, parsed.esEsim);
  return parsed;
}

// Inyecta dinámicamente content.js si no lo está y manda a rellenar la página N
async function runFillerOnPage(pageFunctionName) {
  const data = getAccumulatedData();
  const status = document.getElementById('status');
  if (!data) return;

  const { valid } = validateRequiredData(data, activeProduct);
  if (!valid) {
    status.textContent = '⚠ Completa todos los datos requeridos antes de rellenar.';
    setTimeout(() => { status.textContent = ''; }, 3000);
    return;
  }

  const tab = await getTab();
  if (!tab?.id) {
    status.textContent = '⚠ No se encontró una pestaña activa.';
    setTimeout(() => { status.textContent = ''; }, 3000);
    return;
  }

  if (!tab.url?.startsWith('https://docs.google.com/forms/')) {
    status.textContent = '⚠ Abre un Google Form en la pestaña activa.';
    setTimeout(() => { status.textContent = ''; }, 3000);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (pageFuncStr, d) => {
        return await window.FormFiller[pageFuncStr](d);
      },
      args: [pageFunctionName, data],
    });

    const r = results?.[0]?.result;
    if (r?.ok) {
      status.textContent = `✅ ${r.filled} campo(s) rellenados.`;
      setTimeout(() => { status.textContent = ''; }, 2000);
    } else {
      status.textContent = '⚠ No se pudieron rellenar los campos.';
      setTimeout(() => { status.textContent = ''; }, 3000);
    }
  } catch (err) {
    console.error(err);
    status.textContent = '⚠ Sin permiso para esta página. Recarga la extensión.';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }
}

// Eventos a los botones de autocompletar
document.getElementById('btn1').addEventListener('click', () => runFillerOnPage('fillPage1'));
document.getElementById('btn2').addEventListener('click', () => runFillerOnPage('fillPage2'));
document.getElementById('btn3').addEventListener('click', () => runFillerOnPage('fillPage3'));
