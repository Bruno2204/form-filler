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
CP: ${d.cpCAC || ''}`,
};

const PRODUCT_FIELDS = {
  POS_ESIM: ['plan', 'linea', 'curp', 'chat-id', 'chat-dn', 'eid'],
  POS_CAC: ['plan', 'linea', 'curp', 'cac', 'chat-id', 'chat-dn'],
  LN_ESIM: ['plan', 'linea', 'curp', 'direccion', 'chat-id', 'chat-dn', 'eid'],
  LN_CAC: ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn'],
  PRE_ESIM: ['linea', 'curp', 'chat-id', 'chat-dn', 'eid'],
  PREPAGO: ['linea', 'curp', 'cac', 'chat-id', 'chat-dn'],
  ADIC_CAC: ['plan', 'linea', 'cac', 'chat-id', 'chat-dn'],
};

const ALL_INPUT_FIELDS = ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn', 'eid'];

const PHONE_FIELDS = ['dnPortar', 'dnAdicional', 'dnContacto', 'dnMovistar'];

const PRODUCT_REQUIRED_FIELDS = {
  POS_ESIM: [
    'plan',
    'dnPortar',
    'nip',
    'dnAdicional',
    'email',
    'nombres',
    'apellido1',
    'apellido2',
    'genero',
    'fecha',
    'lugarNacimiento',
    'curp',
    'chatId',
    'dnChat',
    'eid',
  ],
  POS_CAC: [
    'plan',
    'dnPortar',
    'nip',
    'dnAdicional',
    'email',
    'nombres',
    'apellido1',
    'apellido2',
    'genero',
    'fecha',
    'lugarNacimiento',
    'curp',
    'nombreCAV',
    'cpCAC',
    'fvc',
    'chatId',
    'dnChat',
    'eid',
  ],
  LN_ESIM: [
    'plan',
    'email',
    'nombres',
    'apellido1',
    'apellido2',
    'dnContacto',
    'fecha',
    'genero',
    'lugarNacimiento',
    'calle',
    'cpDireccion',
    'colonia',
    'chatId',
    'dnChat',
    'eid',
  ],
  LN_CAC: [
    'plan',
    'email',
    'nombres',
    'apellido1',
    'apellido2',
    'dnContacto',
    'fecha',
    'genero',
    'lugarNacimiento',
    'calle',
    'cpDireccion',
    'colonia',
    'nombreCAV',
    'cpCAC',
    'fvc',
    'chatId',
    'dnChat',
    'eid',
  ],
  PRE_ESIM: [
    'email',
    'nombres',
    'apellido1',
    'apellido2',
    'dnContacto',
    'fecha',
    'genero',
    'lugarNacimiento',
    'chatId',
    'dnChat',
    'eid',
  ],
  PREPAGO: [
    'dnPortar',
    'nip',
    'dnAdicional',
    'email',
    'nombres',
    'apellido1',
    'apellido2',
    'genero',
    'fecha',
    'lugarNacimiento',
    'curp',
    'nombreCAV',
    'cpCAC',
    'fvc',
    'chatId',
    'dnChat',
  ],
  ADIC_CAC: [
    'plan',
    'dnMovistar',
    'dnContacto',
    'email',
    'nombreTitular',
    'nombreCAV',
    'cpCAC',
    'chatId',
    'dnChat',
  ],
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
  dnSame: 'DN portar y adicional (deben ser distintos)',
};

// Pega del portapapeles en el input; si ya tiene contenido, añade en nueva línea
async function pasteIntoInput(inputEl) {
  inputEl.focus();
  try {
    const text = await navigator.clipboard.readText();
    const current = inputEl.value.trim();
    inputEl.value = current ? current + '\n' + text.trim() : text.trim();
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    // Feedback visual breve
    inputEl.style.backgroundColor = '#e6f4ea';
    setTimeout(() => { inputEl.style.backgroundColor = ''; }, 500);
  } catch (err) {
    console.error('Clipboard read failed:', err);
    const status = document.getElementById('status');
    status.textContent = '⚠ No se pudo leer el portapapeles.';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }
}

let activeProduct = 'POS_ESIM';
let missingPanelOpen = false;

// Estado de interacción: qué campos han sido tocados al menos una vez.
// Se usa para evitar mostrar inline alerts (phone-alert-*, chat-alert-*) en
// campos que el operador aún no ha editado. El set se resetea al cambiar de
// producto o al hacer click en "Limpiar".
const touchedFields = new Set();

function markTouched(field) {
  touchedFields.add(field);
}

function isTouched(field) {
  return touchedFields.has(field);
}

function resetTouched() {
  touchedFields.clear();
}

function hasAnyTouchedInProduct(productKey, relevantFields) {
  if (!Object.prototype.hasOwnProperty.call(PRODUCT_FIELDS, productKey)) {
    return false;
  }
  return relevantFields.some((field) => touchedFields.has(field));
}

// Cambia de producto y actualiza la visibilidad de los textareas
function selectProduct(productKey) {
  activeProduct = productKey;
  localStorage.setItem('active_product', productKey);
  resetTouched();

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

  ALL_INPUT_FIELDS.forEach((field) => {
    const groupEl = document.getElementById(`group-${field}`);
    if (!groupEl) return;
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
    document.getElementById('input-linea') ? document.getElementById('input-linea').value : '',
    document.getElementById('input-cac') ? document.getElementById('input-cac').value : '',
    document.getElementById('input-direccion') ? document.getElementById('input-direccion').value : '',
    {
      plan: document.getElementById('input-plan') ? document.getElementById('input-plan').value : '',
      chatId: document.getElementById('input-chat-id') ? document.getElementById('input-chat-id').value : '',
      dnChat: document.getElementById('input-chat-dn') ? document.getElementById('input-chat-dn').value : '',
      eid: document.getElementById('input-eid') ? document.getElementById('input-eid').value : ''
    }
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
    if (field === 'chatId') {
      if (isFieldEmpty(d[field]) || !/^\d{9}$/.test(String(d[field]).trim())) missing.push(field);
      return;
    }
    if (field === 'dnChat') {
      if (isFieldEmpty(d[field]) || !String(d[field]).trim().startsWith('+')) missing.push(field);
      return;
    }
    if (field === 'email') {
      if (isFieldEmpty(d[field]) || String(d[field]).trim().endsWith('...')) missing.push(field);
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

  if (field === 'chatId' && !isFieldEmpty(d[field]) && !/^\d{9}$/.test(String(d[field]).trim())) {
    return `${label} (debe tener exactamente 9 números)`;
  }
  if (field === 'dnChat' && !isFieldEmpty(d[field]) && !String(d[field]).trim().startsWith('+')) {
    return `${label} (debe empezar con "+")`;
  }
  if (field === 'email' && !isFieldEmpty(d[field]) && String(d[field]).trim().endsWith('...')) {
    return `${label} (no debe terminar en "...")`;
  }

  if (
    PHONE_FIELDS.includes(field) &&
    !isFieldEmpty(d[field]) &&
    isPhoneFieldInvalid(field, d[field])
  ) {
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
    case 'ADIC_CAC':
      return 'Adición';
    case 'PRE_ESIM':
      return 'Línea Nueva Prepago Esim';
    case 'PREPAGO':
      return 'Porta Prepago';
    case 'POS_ESIM':
      return 'Porta Pospago Esim';
    case 'POS_CAC':
      return 'Porta Pospago';
    case 'LN_ESIM':
      return 'Linea Nueva Esim';
    case 'LN_CAC':
      return 'Linea Nueva';
    default:
      return 'Porta Pospago';
  }
}

// Valida si los teléfonos del producto tienen exactamente 10 dígitos
function validatePhones(d) {
  const alertPortar = document.getElementById('phone-alert-portar');
  const alertAdicional = document.getElementById('phone-alert-adicional');
  const alertContacto = document.getElementById('phone-alert-contacto');
  const alertMovistar = document.getElementById('phone-alert-movistar');
  const alertSame = document.getElementById('phone-alert-same');

  // Gate: las inline alerts sólo aparecen si el campo 'linea' fue tocado
  // para el producto activo. Mantiene el comportamiento hide-then-show
  // original cuando el gate pasa.
  if (!hasAnyTouchedInProduct(activeProduct, ['linea'])) {
    alertPortar.style.display = 'none';
    alertAdicional.style.display = 'none';
    alertContacto.style.display = 'none';
    alertMovistar.style.display = 'none';
    alertSame.style.display = 'none';
    return;
  }

  // Ocultar por defecto
  alertPortar.style.display = 'none';
  alertAdicional.style.display = 'none';
  alertContacto.style.display = 'none';
  alertMovistar.style.display = 'none';
  alertSame.style.display = 'none';

  const templateStr = PRODUCT_TEMPLATES[activeProduct].toString();

  if (
    templateStr.includes('dnPortar') &&
    d.dnPortar &&
    d.dnPortar.length !== 10
  ) {
    alertPortar.style.display = 'block';
  }
  if (
    templateStr.includes('dnAdicional') &&
    d.dnAdicional &&
    d.dnAdicional.length !== 10
  ) {
    alertAdicional.style.display = 'block';
  }
  if (
    templateStr.includes('dnContacto') &&
    d.dnContacto &&
    d.dnContacto.length !== 10
  ) {
    alertContacto.style.display = 'block';
  }
  if (
    templateStr.includes('dnMovistar') &&
    d.dnMovistar &&
    d.dnMovistar.length !== 10
  ) {
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

  // Gate: las inline alerts sólo aparecen si alguno de los campos de chat
  // (chat-id, chat-dn, eid) fue tocado para el producto activo.
  if (!hasAnyTouchedInProduct(activeProduct, ['chat-id', 'chat-dn', 'eid'])) {
    alertChatId.style.display = 'none';
    alertDnChat.style.display = 'none';
    alertEid.style.display = 'none';
    return;
  }

  alertChatId.style.display = 'none';
  alertDnChat.style.display = 'none';
  alertEid.style.display = 'none';

  const chatIdVal = document.getElementById('input-chat-id') ? document.getElementById('input-chat-id').value.trim() : '';
  const chatDnVal = document.getElementById('input-chat-dn') ? document.getElementById('input-chat-dn').value.trim() : '';
  const eidVal = document.getElementById('input-eid') ? document.getElementById('input-eid').value.trim() : '';

  if (!chatIdVal && !chatDnVal && !eidVal) return;

  const isChatIdValid = /^\d{9}$/.test(chatIdVal);
  const isDnChatValid = chatDnVal.startsWith('+');

  if (chatIdVal && !isChatIdValid) {
    alertChatId.textContent = '⚠ El ID del chat debe tener exactamente 9 números.';
    alertChatId.style.display = 'block';
  }
  if (chatDnVal && !isDnChatValid) {
    alertDnChat.textContent = '⚠ El DN del chat debe empezar con "+".';
    alertDnChat.style.display = 'block';
  }
  if (d.esEsim && eidVal && (!d.eid || !d.eidValid)) alertEid.style.display = 'block';
}

// Browser-only glue: registers DOM event listeners at module load.
// Guarded so the file is require()-able in Node for unit tests; the
// behavior is identical in the browser because `document` is always defined there.
if (typeof document !== 'undefined') {
  // Copiar resultado al portapapeles
  document.getElementById('btn-missing-info').addEventListener('click', () => {
    missingPanelOpen = !missingPanelOpen;
    document
      .getElementById('missing-details-panel')
      .classList.toggle('visible', missingPanelOpen);
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
    ALL_INPUT_FIELDS.forEach((field) => {
      const el = document.getElementById(`input-${field}`);
      if (el) el.value = '';
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
    resetTouched();
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
    // Cargar campos desde localStorage
    ALL_INPUT_FIELDS.forEach((field) => {
      const el = document.getElementById(`input-${field}`);
      if (!el) return;
      const saved = localStorage.getItem(`input_cache_${field}`);
      if (saved) el.value = saved;
    });

    // Restaurar producto activo
    const savedProduct = localStorage.getItem('active_product') || 'POS_ESIM';
    selectProduct(savedProduct);

    // Escuchar eventos input y doble clic en cada campo
    let lastClickEl = null;
    let lastClickTime = 0;

    ALL_INPUT_FIELDS.forEach((field) => {
      const el = document.getElementById(`input-${field}`);
      if (!el) return;

      el.addEventListener('input', () => {
        // Marca el campo como tocado en la PRIMERA pulsación (no en blur) para
        // que las inline alerts aparezcan incluso si el operador nunca sale
        // del input. Idempotente: el guard evita reasignaciones innecesarias.
        if (!isTouched(field)) markTouched(field);
        processData();
      });

      // Doble clic → pegar del portapapeles (nueva línea si ya hay contenido)
      // Usamos mousedown para evitar interferencia con la selección nativa de dblclick
      el.addEventListener('mousedown', (e) => {
        const now = Date.now();
        if (lastClickEl === el && now - lastClickTime < 300) {
          e.preventDefault(); // evita selección de texto
          pasteIntoInput(el);
          lastClickEl = null;
          lastClickTime = 0;
        } else {
          lastClickEl = el;
          lastClickTime = now;
        }
      });
    });
  });

  // Asignar click a botones de producto
  document.querySelectorAll('.btn-product').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const prod = e.target.getAttribute('data-product');
      selectProduct(prod);
    });
  });
}

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
    document.getElementById('input-linea') ? document.getElementById('input-linea').value : '',
    document.getElementById('input-cac') ? document.getElementById('input-cac').value : '',
    document.getElementById('input-direccion') ? document.getElementById('input-direccion').value : '',
    {
      plan: document.getElementById('input-plan') ? document.getElementById('input-plan').value : '',
      chatId: document.getElementById('input-chat-id') ? document.getElementById('input-chat-id').value : '',
      dnChat: document.getElementById('input-chat-dn') ? document.getElementById('input-chat-dn').value : '',
      eid: document.getElementById('input-eid') ? document.getElementById('input-eid').value : ''
    }
  );
  parsed.producto = getCleanProductName(activeProduct, parsed.esEsim);
  return parsed;
}

// Manda a rellenar la página N ejecutando fillPageN sobre la pestaña activa.
// content/index.js se inyecta automáticamente vía content_scripts (manifest.json).
async function runFillerOnPage(pageFunctionName) {
  const data = getAccumulatedData();
  const status = document.getElementById('status');
  if (!data) return;

  const { valid } = validateRequiredData(data, activeProduct);
  if (!valid) {
    status.textContent =
      '⚠ Completa todos los datos requeridos antes de rellenar.';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
    return;
  }

  const tab = await getTab();
  if (!tab?.id) {
    status.textContent = '⚠ No se encontró una pestaña activa.';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
    return;
  }

  if (!tab.url?.startsWith('https://docs.google.com/forms/')) {
    status.textContent = '⚠ Abre un Google Form en la pestaña activa.';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (pageFuncStr, d) => {
        if (!window.FormFiller) {
          // Fallback: la pestaña no fue recargada desde que se actualizó la
          // extensión, así que el content_scripts auto-inject nunca corrió.
          // Importamos el módulo dinámicamente para que window.FormFiller
          // se arme como side-effect del import.
          try {
            const url = chrome.runtime.getURL('content/index.js');
            await import(url);
          } catch (e) {
            return {
              ok: false,
              error: `Auto-inject no se hizo y el fallback falló: ${e.message}. Recargá la pestaña del form.`,
            };
          }
        }
        const fn = window.FormFiller?.[pageFuncStr];
        if (typeof fn !== 'function') {
          return {
            ok: false,
            error: `window.FormFiller.${pageFuncStr} no es función (${typeof fn}). Recargá la pestaña del form.`,
          };
        }
        return await fn(d);
      },
      args: [pageFunctionName, data],
    });

    const r = results?.[0]?.result;
    if (r?.ok) {
      status.textContent = `✅ ${r.filled} campo(s) rellenados.`;
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    } else {
      const errMsg = r?.error ? `: ${r.error}` : '';
      status.textContent = `⚠ No se pudieron rellenar los campos${errMsg}`;
      setTimeout(() => {
        status.textContent = '';
      }, 5000);
    }
  } catch (err) {
    console.error(err);
    status.textContent =
      '⚠ Sin permiso para esta página. Recarga la extensión.';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }
}

// Eventos a los botones de autocompletar
if (typeof document !== 'undefined') {
  document
    .getElementById('btn1')
    .addEventListener('click', () => runFillerOnPage('fillPage1'));
  document
    .getElementById('btn2')
    .addEventListener('click', () => runFillerOnPage('fillPage2'));
  document
    .getElementById('btn3')
    .addEventListener('click', () => runFillerOnPage('fillPage3'));
}

// Conditional exports for Node.js / CJS testing (browser-safe, no behavior change).
// Exports are limited to pure values + functions; DOM-coupled glue
// (processData, selectProduct, updateFormActionsState, validatePhones,
// validateChat, getAccumulatedData, runFillerOnPage, pasteIntoInput) is
// intentionally omitted and tested at the integration / E2E layer.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isFieldEmpty,
    isPhoneFieldInvalid,
    validateRequiredData,
    getMissingFieldLabel,
    getCleanProductName,
    markTouched,
    isTouched,
    resetTouched,
    hasAnyTouchedInProduct,
    PRODUCT_TEMPLATES,
    FIELD_LABELS,
    PHONE_FIELDS,
    PRODUCT_FIELDS,
    PRODUCT_REQUIRED_FIELDS,
    ALL_INPUT_FIELDS,
  };
}
