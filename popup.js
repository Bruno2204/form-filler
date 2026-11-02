// ─── LÓGICA DE LA UI Y EVENTOS DE LA EXTENSIÓN ────────────────────────────────
// Utiliza la función parseData de parser.js, precargada en popup.html

const PRODUCT_TEMPLATES = {
  POS_ESIM: (d) => `PORTABILIDAD POSPAGO ESIM
EID: ${d.eid || ''}
PLAN: ${d.planShort || d.plan || ''}
DN A PORTAR: ${d.dnPortar || ''}
NIP: ${d.nip || ''}
DN ADICIONAL: ${d.dnAdicional || 'SN'}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}
Sexo: ${d.genero || ''}
FECHA NACIM: ${d.fecha || ''}
ESTADO NACIM: ${d.lugarNacimiento || ''}
CURP VERIFICADO: ${d.curp || ''}

CALLE: ${d.calle || ''}
NUMERO EXTERIOR: ${d.numExt || ''}
NÚMERO INTERIOR: ${d.numInt || ''}
CÓDIGO POSTAL: ${d.cpDireccion || ''}
COLONIA: ${d.colonia || ''}`,

  POS_CAC: (d) => `PORTABILIDAD POSPAGO CAC
PLAN: ${d.planShort || d.plan || ''}
DN A PORTAR: ${d.dnPortar || ''}
NIP: ${d.nip || ''}
DN ADICIONAL: ${d.dnAdicional || 'SN'}
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
FVC: ${d.fvc || ''}

CALLE: ${d.calle || ''}
NUMERO EXTERIOR: ${d.numExt || ''}
NÚMERO INTERIOR: ${d.numInt || ''}
CÓDIGO POSTAL: ${d.cpDireccion || ''}
COLONIA: ${d.colonia || ''}`,

  LN_ESIM: (d) => `LINEA NUEVA ESIM
PLAN: ${d.planShort || d.plan || ''}
EID: ${d.eid || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}

DN CONTACTO: ${d.dnContacto || ''}
FECHA NACIM: ${d.fecha || ''}
SEXO: ${d.genero || ''}
CURP: ${d.curp || ''}
Estado de nacimiento: ${d.lugarNacimiento || ''}

CALLE: ${d.calle || ''}
NUMERO EXTERIOR: ${d.numExt || ''}
NÚMERO INTERIOR: ${d.numInt || ''}
CÓDIGO POSTAL: ${d.cpDireccion || ''}
COLONIA: ${d.colonia || ''}`,

  LN_CAC: (d) => `LINEA NUEVA CAC
PLAN: ${d.planShort || d.plan || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}

DN CONTACTO: ${d.dnContacto || ''}
FECHA NACIM: ${d.fecha || ''}
SEXO: ${d.genero || ''}
CURP: ${d.curp || ''}
Estado de nacimiento: ${d.lugarNacimiento || ''}

CALLE: ${d.calle || ''}
NUMERO EXTERIOR: ${d.numExt || ''}
NÚMERO INTERIOR: ${d.numInt || ''}
CÓDIGO POSTAL: ${d.cpDireccion || ''}
COLONIA: ${d.colonia || ''}

CAC: ${d.nombreCAV || ''}
CP: ${d.cpCAC || ''}
FVC: ${d.fvc || ''}`,

  PRE_ESIM: (d) => `Línea Nueva Prepago ESIM
EID: ${d.eid || ''}
CORREO: ${d.email || ''}

NOMBRE: ${d.nombres || ''}
PRIMER APELLIDO: ${d.apellido1 || ''}
SEGUNDO APELLIDO: ${d.apellido2 || ''}

DN CONTACTO: ${d.dnContacto || ''}
FECHA NACIM: ${d.fecha || ''}
SEXO: ${d.genero || ''}
CURP: ${d.curp || ''}
Estado de nacimiento: ${d.lugarNacimiento || ''}`,

  PREPAGO: (d) => `PORTABILIDAD PREPAGO
DN A PORTAR: ${d.dnPortar || ''}
NIP: ${d.nip || ''}
DN ADICIONAL: ${d.dnAdicional || 'SN'}
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

  ADIC_CAC: (d) => `ADICION CAC
PLAN: ${d.planShort || d.plan || ''}
DN MOVISTAR: ${d.dnMovistar || ''}

DN CONTACTO: ${d.dnContacto || ''}
CORREO: ${d.email || ''}
NOMBRE TITULAR: ${d.nombreTitular || ''}

CAC: ${d.nombreCAV || ''}
CP: ${d.cpCAC || ''}`,
};

const PRODUCT_FIELDS = {
  POS_ESIM: ['plan', 'linea', 'curp', 'direccion', 'chat-id', 'chat-dn', 'eid'],
  POS_CAC: ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn'],
  LN_ESIM: ['plan', 'linea', 'curp', 'direccion', 'chat-id', 'chat-dn', 'eid'],
  LN_CAC: ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn'],
  PRE_ESIM: ['linea', 'curp', 'chat-id', 'chat-dn', 'eid'],
  PREPAGO: ['linea', 'curp', 'cac', 'chat-id', 'chat-dn'],
  ADIC_CAC: ['plan', 'linea', 'cac', 'chat-id', 'chat-dn'],
};

const ALL_INPUT_FIELDS = [
  'plan',
  'linea',
  'curp',
  'direccion',
  'cac',
  'chat-id',
  'chat-dn',
  'eid',
];

// Etiquetas de la sección "Etiquetas del contacto" del Google Form.
// Son checkboxes, no inputs de texto: por eso viven fuera de
// ALL_INPUT_FIELDS (que asume campos de texto) y su grupo nunca se
// oculta — están disponibles para todos los productos.
const CONTACT_TAGS = [
  { id: 'input-etiqueta-reapertura', label: 'Reapertura' },
  { id: 'input-etiqueta-prospeccion-ia', label: 'Prospección IA' },
];

// Opciones del dropdown de etiquetas de contacto.
// Son la "cola larga" del form: las dos de arriba (Reapertura, Prospección
// IA) son las más usadas y por eso quedan como checkboxes visibles.
//
// El texto es el ETIQUETADO CANÓNICO del form (con tildes y mayúsculas tal
// como aparecen). El matching contra el DOM normaliza ambos lados
// (normalizeLabel en content/utils.js), así que si el form escribe
// "Prospeccion IA" el match sigue funcionando.
const CONTACT_TAG_OPTIONS = [
  'Adición Pospago',
  'AI Pospago',
  'BOTÓN FLOTANTE ESIM',
  'Competitors V2',
  'Competitors Pospago Integral',
  'Dayparting Pospago Integral',
  'DN BOTÓN FLOTANTE',
  'DN PMAX',
  'DN SEM - 1',
  'DN SEM - 2',
  'DN SEM - 3',
  'DN SEM - 4',
  'DN SEM - 5',
  'eSIM organico',
  'eSIM Portabilidad organico',
  'Generica integral V1',
  'Generica integral V2',
  'Globant Google',
  'Globant Meta',
  'GOOGLE AMPLIA ABT PB',
  'GOOGLE AT&T ABT CONQUER',
  'GOOGLE MOVISTAR ABT BRAND',
  'GOOGLE CDMX ABT CATEGORY',
  'Google eSIM',
  'Google banner Pro 11',
  'GOOGLE EXACTA ABT PB',
  'Google RMK Pro 11',
  'GOOGLE EXACTA RMKT PB',
  'GOOGLE MOVISTAR RMKT BRAND',
  'GOOGLE PMAX',
  'LKL WSP Pospago Integral',
  'NUEVO - MOVISTAR RMKT BRND',
  'Orgánico PosPago',
  'Piloto CAPI B Integral',
  'Plan Pro 13 RMK',
  'Prepago Organico',
  'Prospecting Pospago Integral',
  'Volumen Pospago Integral',
];

// Catálogo COMPLETO de etiquetas que expone la sección "Etiquetas del
// contacto" del Google Form (Pág 1). No todas se ofrecen en el dropdown:
// esta lista es la referencia para saber qué existe en el form y para
// agregar opciones nuevas.
//
// Snapshot tomado del form real. Si el form cambia, actualizar acá.
//
// Nota: "Reapertura" a secas es una etiqueta DISTINTA de las variantes
// "Reapertura_*" / "Reapertura_*" (Reapertura_Caido, Reapertura_Nip, …).
// La que se usa siempre es la simple.
const FORM_TAGS = [
  'Adición Pospago',
  'ADQUISITION',
  'ADQUISITION B Pospago',
  'ADQUISITION Pospago',
  'AI Pospago',
  'Afiliado ActualS 4',
  'Amazon',
  'BOTÓN FLOTANTE ESIM',
  'CCN 3',
  'CCN 4',
  'CCN B',
  'Concentra 5',
  'Competitors V2',
  'Competitors Pospago Integral',
  'Dayparting Pospago Integral',
  'DIBBI-Meta',
  'DN BOTÓN FLOTANTE',
  'DN PMAX',
  'DN SEM - 1',
  'DN SEM - 2',
  'DN SEM - 3',
  'DN SEM - 4',
  'DN SEM - 5',
  'eSIM organico',
  'eSIM Portabilidad organico',
  'Generica integral V1',
  'Generica integral V2',
  'Globant Google',
  'Globant Meta',
  'GOOGLE AMPLIA ABT PB',
  'GOOGLE AT&T ABT CONQUER',
  'GOOGLE MOVISTAR ABT BRAND',
  'GOOGLE CDMX ABT CATEGORY',
  'Google eSIM',
  'Google banner Pro 11',
  'GOOGLE EXACTA ABT PB',
  'Google RMK Pro 11',
  'GOOGLE EXACTA RMKT PB',
  'GOOGLE MOVISTAR RMKT BRAND',
  'Google plan 16',
  'Google Plan 20',
  'Google Plan 30',
  'GOOGLE PMAX',
  'HAVAS',
  'KW Brand ABT Autogestión +WSP',
  'LKL WSP Pospago Integral',
  'Meta Pospago Dispositivo',
  'Meta plan 16',
  'NUEVO - MOVISTAR RMKT BRND',
  'Nuevo SEM - 4',
  'Orgánico PosPago',
  'Orgánico META pospago',
  'Orgánico PosPago Pop up',
  'Piloto CAPI B Integral',
  'Plan Pro 13 RMK',
  'Pospago Organico',
  'Prepago Google',
  'Prepago Mailing',
  'Prepago Organico',
  'Prospección IA',
  'Prospecting Pospago Integral',
  'Propuestas Pospago',
  'Reapertura',
  'Reapertura_Caido',
  'RMK Pospago',
  'Reapertura Abandono',
  'Reapertura Cancelados',
  'Reapertura_Calificado',
  'Reaperturas GOOGLE',
  'Reapertura llamada',
  'Reapertura_ProspectoCP',
  'Reapertura_NoContesta',
  'Reapertura_Prospecto',
  'Reapertura_Prospecto_cac',
  'Reaperturas META',
  'Reapertura_Nip',
  'Reapertura_esim',
  'Recupero Prospecto CAC',
  'Recupero Prospecto ESIM',
  'Reapertura Referidos',
  'Reapertura_Rechazo_NIP',
  'Reapertura_Prospecto_CURP/RFC',
  'Recupero Trebbel',
  'Telefónica',
  'TREBBEL',
  'Volumen Pospago',
  'Volumen Pospago A',
  'Volumen Pospago Integral',
];

// Clave de cache de la etiqueta elegida en el dropdown.
const EXTRA_TAG_CACHE_KEY = 'input_cache_etiqueta_extra';

// Normaliza una etiqueta para comparar: sin acentos, minúsculas y sin
// espacios extra. Mismo criterio que normalizeLabel en content/utils.js,
// para que el dedupe del panel y el matching del form no diverjan.
function normalizeTagLabel(label) {
  if (!label) return '';
  return String(label)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Une varias listas de etiquetas sin duplicados. La comparación es
// insensible a acentos y mayúsculas, pero se conserva el TEXTO CANÓNICO
// de la primera aparición (el que espera el form).
function mergeTagLabels(...lists) {
  const seen = new Set();
  const merged = [];
  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((label) => {
      if (typeof label !== 'string') return;
      const key = normalizeTagLabel(label);
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(label);
    });
  });
  return merged;
}

const PHONE_FIELDS = ['dnPortar', 'dnAdicional', 'dnContacto', 'dnMovistar'];

const PRODUCT_REQUIRED_FIELDS = {
  POS_ESIM: [
    'plan',
    'dnPortar',
    'nip',
    'email',
    'nombres',
    'apellido1',
    'genero',
    'fecha',
    'lugarNacimiento',
    'curp',
    'calle',
    'cpDireccion',
    'colonia',
    'chatId',
    'dnChat',
    'eid',
  ],
  POS_CAC: [
    'plan',
    'dnPortar',
    'nip',
    'email',
    'nombres',
    'apellido1',
    'genero',
    'fecha',
    'lugarNacimiento',
    'curp',
    'calle',
    'cpDireccion',
    'colonia',
    'nombreCAV',
    'cpCAC',
    'fvc',
    'chatId',
    'dnChat',
  ],
  LN_ESIM: [
    'plan',
    'email',
    'nombres',
    'apellido1',
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
  ],
  PRE_ESIM: [
    'email',
    'nombres',
    'apellido1',
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
    'email',
    'nombres',
    'apellido1',
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

// Valor de un input por id ('' si no existe).
function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

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
    setTimeout(() => {
      inputEl.style.backgroundColor = '';
    }, 500);
  } catch (err) {
    console.error('Clipboard read failed:', err);
    const status = document.getElementById('status');
    status.textContent = '⚠ No se pudo leer el portapapeles.';
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }
}

// Copia texto al portapapeles. Usa un textarea temporal porque el
// resultado formateado ya no vive en un input visible del panel.
function copyText(text) {
  const helper = document.createElement('textarea');
  helper.value = text || '';
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  document.execCommand('copy');
  document.body.removeChild(helper);
}

// Feedback visual del botón "Copiar" (usado por el resultado y el helper).
function flashCopyButton(btn) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = '¡Copiado!';
  btn.style.background = '#0f9d58';
  setTimeout(() => {
    btn.textContent = original;
    btn.style.background = 'var(--success)';
  }, 1500);
}

// Doble clic → pegar del portapapeles (nueva línea si ya hay contenido).
// Se usa mousedown para no interferir con la selección nativa del dblclick.
function attachPasteOnDoubleClick(el) {
  let lastClickTime = 0;
  el.addEventListener('mousedown', (e) => {
    const now = Date.now();
    if (now - lastClickTime < 300) {
      e.preventDefault(); // evita selección de texto
      pasteIntoInput(el);
      lastClickTime = 0;
      return;
    }
    lastClickTime = now;
  });
}

let activeProduct = 'POS_ESIM';
let missingPanelOpen = false;
// Último resultado formateado. No se muestra en el panel: el botón
// "Copiar" lo manda al portapapeles.
let lastResult = '';

// Vista auxiliar (helper): valida y formatea datos, no rellena el form.
// Es una vista ALTERNATIVA al flujo de producto, no un producto más.
let helperMode = false;

// Los campos del helper son textareas propios: viven fuera de
// ALL_INPUT_FIELDS (que asume campos de producto) y se cachean aparte.
const HELPER_FIELDS = ['helper-linea', 'helper-nombres', 'helper-cac'];

// Escapa texto que viene del portapapeles del operador antes de meterlo
// en innerHTML.
function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  // Elegir un producto saca del helper (son vistas excluyentes).
  // setHelperMode(false) deja el botón del producto activo.
  setHelperMode(false);

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

// Marca el botón activo: el del helper o el del producto, nunca los dos.
function updateActiveButtons() {
  document.querySelectorAll('.btn-product').forEach((btn) => {
    btn.classList.toggle(
      'active',
      !helperMode && btn.getAttribute('data-product') === activeProduct,
    );
  });
  const helperBtn = document.getElementById('btn-helper');
  if (helperBtn) helperBtn.classList.toggle('active', helperMode);
}

// Muestra la vista del helper o el flujo de producto (son excluyentes).
function setHelperMode(enabled) {
  helperMode = enabled;

  ['main-content', 'main-result', 'main-actions'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('view-hidden', enabled);
  });

  const helperContainer = document.getElementById('helper-container');
  if (helperContainer) helperContainer.classList.toggle('view-hidden', !enabled);

  updateActiveButtons();

  if (enabled) updateHelperResults();
}

// Overrides de los campos dedicados (plan, chat, eid, etiquetas).
// Fuente única para processData y getAccumulatedData: si se duplican,
// pueden divergir y el form recibe datos distintos a los mostrados.
function getFieldOverrides() {
  const valueOf = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  return {
    plan: valueOf('input-plan'),
    chatId: valueOf('input-chat-id'),
    dnChat: valueOf('input-chat-dn'),
    eid: valueOf('input-eid'),
    etiquetas: getSelectedTags(),
    // La etiqueta del dropdown viaja APARTE de `etiquetas`: el form la
    // recibe en un dropdown distinto ("¿Línea telefónica a la que se
    // comunica?"), no en las casillas de "Etiquetas del contacto".
    etiquetaDropdown: getDropdownTag(),
  };
}

// Etiquetas de contacto marcadas por el operador.
// Son dos fuentes: los checkboxes frecuentes (Reapertura, Prospección IA)
// y la etiqueta elegida en el dropdown (una sola). Se combinan sin duplicados.
function getSelectedTags() {
  const checked = CONTACT_TAGS.filter((tag) => {
    const el = document.getElementById(tag.id);
    return !!(el && el.checked);
  }).map((tag) => tag.label);
  return mergeTagLabels(checked, [getDropdownTag()]);
}

// ─── ZONA AUXILIAR (HELPER) ─────────────────────────────────────────────────
//
// Valida y formatea datos. NO rellena el Google Form: es un helper para
// revisar los datos antes de cargarlos. La lógica vive en helper.js.

// Reporte de la validación de la línea: un renglón por dato.
function renderHelperLinea() {
  const report = document.getElementById('helper-linea-report');
  const input = document.getElementById('input-helper-linea');
  if (!report || !input) return;

  if (!input.value.trim()) {
    report.innerHTML = '';
    return;
  }

  const result = validateLineaData(input.value);
  const parts = [];

  if (result.problems > 0) {
    parts.push(
      `<div class="helper-summary invalid">⚠ ${result.problems} problema(s) en los datos</div>`,
    );
  } else if (result.missing.length > 0) {
    parts.push(
      `<div class="helper-summary warn">⚠ Faltan: ${escapeHtml(result.missing.join(', '))}</div>`,
    );
  } else {
    parts.push(
      '<div class="helper-summary ok">✓ Datos de línea correctos</div>',
    );
  }

  result.checks.forEach((check) => {
    parts.push(
      `<div class="helper-check ${check.status}">` +
        `<span class="helper-check-label">${escapeHtml(check.label)}</span>` +
        `<span class="helper-check-detail">${escapeHtml(check.detail)}</span>` +
        `</div>`,
    );
  });

  // Números que el parser descarta en silencio (no son NIP ni DN).
  result.oddNumbers.forEach((number) => {
    parts.push(
      '<div class="helper-check invalid">' +
        '<span class="helper-check-label">Número no reconocido</span>' +
        `<span class="helper-check-detail">${escapeHtml(number)} (no es NIP ni DN)</span>` +
        '</div>',
    );
  });

  // Texto que el parser ignora: no es un error, pero el operador tiene que
  // saber que esa línea no se va a usar.
  result.extraTexts.forEach((text) => {
    parts.push(
      '<div class="helper-check missing">' +
        '<span class="helper-check-label">Texto sin usar</span>' +
        `<span class="helper-check-detail">${escapeHtml(text)}</span>` +
        '</div>',
    );
  });

  report.innerHTML = parts.join('');
}

// Nombre completo a partir del bloque de la CURP.
function renderHelperNombres() {
  const result = document.getElementById('helper-nombres-result');
  const input = document.getElementById('input-helper-nombres');
  if (!result || !input) return;

  const value = formatFullName(input.value);
  result.textContent = value || '—';
  result.classList.toggle('helper-result-empty', !value);
}

// Bloque CAC: nombre del CAC, CP y FVC (fecha por defecto: el día siguiente).
function renderHelperCac() {
  const result = document.getElementById('helper-cac-result');
  const report = document.getElementById('helper-cac-report');
  const input = document.getElementById('input-helper-cac');
  if (!result || !input) return;

  if (!input.value.trim()) {
    result.textContent = '—';
    result.classList.add('helper-result-empty');
    if (report) report.innerHTML = '';
    return;
  }

  // Un solo reloj para las dos lecturas: si el parseo y el formateo
  // tomaran el reloj por separado, cruzando la medianoche darían
  // fechas distintas.
  const now = new Date();
  const parsed = parseCacBlock(input.value, now);
  result.textContent = formatCacBlock(input.value, now);
  result.classList.remove('helper-result-empty');

  if (!report) return;
  const parts = [];
  if (parsed.fechaSource === 'default') {
    parts.push(
      '<div class="helper-summary info">ℹ Fecha por defecto: el día siguiente</div>',
    );
  }
  parsed.warnings.forEach((warning) => {
    parts.push(
      `<div class="helper-check invalid"><span class="helper-check-detail">${escapeHtml(warning)}</span></div>`,
    );
  });
  report.innerHTML = parts.join('');
}

// Refresca los tres resultados del helper.
function updateHelperResults() {
  renderHelperLinea();
  renderHelperNombres();
  renderHelperCac();
}

// Copia un resultado del helper al portapapeles.
function copyHelperResult(value, btn) {
  if (!value) {
    setStatus('⚠ No hay nada para copiar.');
    return;
  }
  copyText(value);
  flashCopyButton(btn);
}

// Listeners de la zona auxiliar.
function setupHelper() {
  const helperBtn = document.getElementById('btn-helper');
  if (helperBtn) {
    helperBtn.addEventListener('click', () => setHelperMode(!helperMode));
  }

  HELPER_FIELDS.forEach((field) => {
    const el = document.getElementById(`input-${field}`);
    if (!el) return;

    el.addEventListener('input', () => {
      localStorage.setItem(`input_cache_${field}`, el.value);
      updateHelperResults();
    });

    attachPasteOnDoubleClick(el);
  });

  const copyNombres = document.getElementById('btn-helper-nombres-copy');
  if (copyNombres) {
    copyNombres.addEventListener('click', () => {
      copyHelperResult(
        formatFullName(valueOf('input-helper-nombres')),
        copyNombres,
      );
    });
  }

  const copyCac = document.getElementById('btn-helper-cac-copy');
  if (copyCac) {
    copyCac.addEventListener('click', () => {
      copyHelperResult(
        formatCacBlock(valueOf('input-helper-cac'), new Date()),
        copyCac,
      );
    });
  }

  // Limpiar los textareas del helper (el "Limpiar" del panel no está
  // visible en esta vista).
  const clearBtn = document.getElementById('btn-helper-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      HELPER_FIELDS.forEach((field) => {
        const el = document.getElementById(`input-${field}`);
        if (el) el.value = '';
        localStorage.removeItem(`input_cache_${field}`);
      });
      updateHelperResults();
      setStatus('🧹 Helper limpio.');
    });
  }
}

// ─── ETIQUETAS: DROPDOWN ────────────────────────────────────────────────────
// El dropdown elige UNA etiqueta (además de los checkboxes). El `<select>`
// es el estado: su `value` es la etiqueta elegida.

function getTagSelect() {
  return document.getElementById('select-etiqueta');
}

// Etiqueta elegida en el dropdown ('' si no hay ninguna).
function getDropdownTag() {
  const select = getTagSelect();
  const value = select ? select.value : '';
  return typeof value === 'string' ? value.trim() : '';
}

// Llena el dropdown con las etiquetas disponibles en el form.
function populateTagSelect() {
  const select = getTagSelect();
  if (!select) return;
  // El placeholder ("Sin etiqueta adicional") ya está en el HTML.
  CONTACT_TAG_OPTIONS.forEach((label) => {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });
}

// Guarda la etiqueta elegida en localStorage.
function saveDropdownTag(label) {
  const value = (label || '').trim();
  if (value) {
    localStorage.setItem(EXTRA_TAG_CACHE_KEY, value);
  } else {
    localStorage.removeItem(EXTRA_TAG_CACHE_KEY);
  }
}

// Restaura la etiqueta elegida desde localStorage.
function loadDropdownTag() {
  const select = getTagSelect();
  if (!select) return;
  const saved = (localStorage.getItem(EXTRA_TAG_CACHE_KEY) || '').trim();
  if (saved && CONTACT_TAG_OPTIONS.includes(saved)) {
    select.value = saved;
    return;
  }
  // La etiqueta cacheada ya no existe en el catálogo (se cambió la lista):
  // se descarta para no dejar un valor huérfano en el cache.
  if (saved) localStorage.removeItem(EXTRA_TAG_CACHE_KEY);
  select.value = '';
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
    document.getElementById('input-linea')
      ? document.getElementById('input-linea').value
      : '',
    document.getElementById('input-cac')
      ? document.getElementById('input-cac').value
      : '',
    document.getElementById('input-direccion')
      ? document.getElementById('input-direccion').value
      : '',
    getFieldOverrides(),
  );

  // Mapear "producto" para autocompletado en Google Forms si es necesario
  parsed.producto = getCleanProductName(activeProduct, parsed.esEsim);

  validatePhones(parsed);
  validateChat(parsed);
  updateFormActionsState(parsed);

  // Renderizar la plantilla correspondiente
  const formatter = PRODUCT_TEMPLATES[activeProduct];
  const formattedResult = formatter ? formatter(parsed) : '';

  // El resultado no se muestra en el panel: queda en memoria y se copia
  // con el botón "Copiar".
  lastResult = formattedResult;

  updatePlanPreview(parsed);
}

// Muestra cómo se resuelve el plan escrito por el operador.
// Ej.: el operador escribe "30" y el form va a recibir "Pro 30".
function updatePlanPreview(parsed) {
  const preview = document.getElementById('plan-preview');
  if (!preview) return;

  const raw = parsed.planRaw || '';
  const resolved = parsed.plan || '';
  if (!raw || !resolved || raw === resolved) {
    preview.textContent = '';
    return;
  }
  preview.textContent = `${raw} → ${resolved}`;
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
      if (isFieldEmpty(d[field]) || !/^\d{9}$/.test(String(d[field]).trim()))
        missing.push(field);
      return;
    }
    if (field === 'dnChat') {
      if (isFieldEmpty(d[field]) || !String(d[field]).trim().startsWith('+'))
        missing.push(field);
      return;
    }
    if (field === 'email') {
      if (isFieldEmpty(d[field]) || String(d[field]).trim().endsWith('...'))
        missing.push(field);
      return;
    }
    if (isFieldEmpty(d[field]) || isPhoneFieldInvalid(field, d[field])) {
      missing.push(field);
    }
  });

  if (required.includes('dnPortar')) {
    if (d.dnPortar && d.dnAdicional && d.dnPortar === d.dnAdicional) {
      missing.push('dnSame');
    }
  }

  return { valid: missing.length === 0, missing };
}

function getMissingFieldLabel(field, d) {
  if (field === 'dnSame') return FIELD_LABELS.dnSame;
  const label = FIELD_LABELS[field] || field;

  if (
    field === 'chatId' &&
    !isFieldEmpty(d[field]) &&
    !/^\d{9}$/.test(String(d[field]).trim())
  ) {
    return `${label} (debe tener exactamente 9 números)`;
  }
  if (
    field === 'dnChat' &&
    !isFieldEmpty(d[field]) &&
    !String(d[field]).trim().startsWith('+')
  ) {
    return `${label} (debe empezar con "+")`;
  }
  if (
    field === 'email' &&
    !isFieldEmpty(d[field]) &&
    String(d[field]).trim().endsWith('...')
  ) {
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
      return 'ADICIÓN';
    case 'PRE_ESIM':
      return 'LÍNEA NUEVA PREPAGO';
    case 'PREPAGO':
      return 'PORTABILIDAD PREPAGO';
    case 'POS_ESIM':
      return 'PORTABILIDAD POSPAGO E-SIM';
    case 'POS_CAC':
      return 'PORTABILIDAD POSPAGO';
    case 'LN_ESIM':
      return 'LÍNEA NUEVA E-SIM';
    case 'LN_CAC':
      return 'LÍNEA NUEVA';
    default:
      return 'PORTABILIDAD POSPAGO';
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

  const chatIdVal = document.getElementById('input-chat-id')
    ? document.getElementById('input-chat-id').value.trim()
    : '';
  const chatDnVal = document.getElementById('input-chat-dn')
    ? document.getElementById('input-chat-dn').value.trim()
    : '';
  const eidVal = document.getElementById('input-eid')
    ? document.getElementById('input-eid').value.trim()
    : '';

  if (!chatIdVal && !chatDnVal && !eidVal) return;

  const isChatIdValid = /^\d{9}$/.test(chatIdVal);
  const isDnChatValid = chatDnVal.startsWith('+');

  if (chatIdVal && !isChatIdValid) {
    alertChatId.textContent =
      '⚠ El ID del chat debe tener exactamente 9 números.';
    alertChatId.style.display = 'block';
  }
  if (chatDnVal && !isDnChatValid) {
    alertDnChat.textContent = '⚠ El DN del chat debe empezar con "+".';
    alertDnChat.style.display = 'block';
  }
  if (d.esEsim && eidVal && (!d.eid || !d.eidValid))
    alertEid.style.display = 'block';
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
    copyText(lastResult);
    flashCopyButton(document.getElementById('btnCopy'));
  });

  // Limpiar todas las entradas y cache
  document.getElementById('btnClear').addEventListener('click', () => {
    ALL_INPUT_FIELDS.forEach((field) => {
      const el = document.getElementById(`input-${field}`);
      if (el) el.value = '';
      localStorage.removeItem(`input_cache_${field}`);
    });
    CONTACT_TAGS.forEach((tag) => {
      const el = document.getElementById(tag.id);
      if (el) el.checked = false;
      localStorage.removeItem(`input_cache_${tag.id}`);
    });
    HELPER_FIELDS.forEach((field) => {
      const el = document.getElementById(`input-${field}`);
      if (el) el.value = '';
      localStorage.removeItem(`input_cache_${field}`);
    });
    updateHelperResults();
    localStorage.removeItem(EXTRA_TAG_CACHE_KEY);
    const tagSelect = getTagSelect();
    if (tagSelect) tagSelect.value = '';
    lastResult = '';
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
    document
      .getElementById('missing-details-panel')
      .classList.remove('visible');
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

    // Cargar los campos del helper (viven en su propio cache)
    HELPER_FIELDS.forEach((field) => {
      const el = document.getElementById(`input-${field}`);
      if (!el) return;
      const saved = localStorage.getItem(`input_cache_${field}`);
      if (saved) el.value = saved;
    });

    // Restaurar las etiquetas de contacto marcadas
    CONTACT_TAGS.forEach((tag) => {
      const el = document.getElementById(tag.id);
      if (!el) return;
      el.checked = localStorage.getItem(`input_cache_${tag.id}`) === '1';
      el.addEventListener('change', () => {
        localStorage.setItem(`input_cache_${tag.id}`, el.checked ? '1' : '0');
        processData();
      });
    });

    // Dropdown de etiquetas: populate + restaurar la elegida
    populateTagSelect();
    loadDropdownTag();

    const tagSelect = getTagSelect();
    if (tagSelect) {
      tagSelect.addEventListener('change', () => {
        saveDropdownTag(tagSelect.value);
        processData();
      });
    }

    // Restaurar producto activo
    const savedProduct = localStorage.getItem('active_product') || 'POS_ESIM';
    selectProduct(savedProduct);

    // Escuchar eventos input y doble clic en cada campo
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
      attachPasteOnDoubleClick(el);
    });

    // Refresca los resultados del helper con lo que se restauró del cache
    updateHelperResults();
  });

  // Zona auxiliar (helper)
  setupHelper();

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
    document.getElementById('input-linea')
      ? document.getElementById('input-linea').value
      : '',
    document.getElementById('input-cac')
      ? document.getElementById('input-cac').value
      : '',
    document.getElementById('input-direccion')
      ? document.getElementById('input-direccion').value
      : '',
    getFieldOverrides(),
  );
  parsed.producto = getCleanProductName(activeProduct, parsed.esEsim);
  return parsed;
}

// Muestra un mensaje en la barra de estado por un tiempo dado.
function setStatus(message, duration = 3000) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  setTimeout(() => {
    status.textContent = '';
  }, duration);
}

// Ejecuta una función del content script en la pestaña activa.
// Devuelve el resultado del content script, o null si no se pudo ejecutar.
async function executeOnForm(pageFunctionName, data) {
  const tab = await getTab();
  if (!tab?.id) {
    setStatus('⚠ No se encontró una pestaña activa.');
    return null;
  }

  if (!tab.url?.startsWith('https://docs.google.com/forms/')) {
    setStatus('⚠ Abre un Google Form en la pestaña activa.');
    return null;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (pageFuncStr, d) => {
        if (!window.FormFiller) {
          return {
            ok: false,
            error:
              'Content script no inyectado. Hacé F5 en la pestaña del form y volvé a clickear.',
          };
        }
        const fn = window.FormFiller?.[pageFuncStr];
        if (typeof fn !== 'function') {
          return {
            ok: false,
            error: `window.FormFiller.${pageFuncStr} no es función (${typeof fn}). Recargá la extensión y la pestaña del form.`,
          };
        }
        return await fn(d);
      },
      // Chrome sólo acepta args serializables: si no hay datos (botón de
      // prueba), se manda sólo el nombre de la función.
      args: data === undefined ? [pageFunctionName] : [pageFunctionName, data],
    });

    return results?.[0]?.result || null;
  } catch (err) {
    console.error(err);
    setStatus('⚠ Sin permiso para esta página. Recarga la extensión.');
    return null;
  }
}

// Manda a rellenar la página N ejecutando fillPageN sobre la pestaña activa.
// content/index.js se inyecta automáticamente vía content_scripts (manifest.json).
async function runFillerOnPage(pageFunctionName) {
  const data = getAccumulatedData();
  if (!data) return;

  const { valid } = validateRequiredData(data, activeProduct);
  if (!valid) {
    setStatus('⚠ Completa todos los datos requeridos antes de rellenar.');
    return;
  }

  const r = await executeOnForm(pageFunctionName, data);
  if (!r) return;

  if (r.ok) {
    const failed = r.failed || [];
    if (failed.length > 0) {
      setStatus(
        `⚠ ${r.filled} campo(s) rellenados. No se pudo: ${failed.join(', ')}.`,
        6000,
      );
    } else {
      setStatus(`✅ ${r.filled} campo(s) rellenados.`, 2000);
    }
  } else {
    const errMsg = r?.error ? `: ${r.error}` : '';
    setStatus(`⚠ No se pudieron rellenar los campos${errMsg}`, 5000);
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
    CONTACT_TAGS,
    CONTACT_TAG_OPTIONS,
    FORM_TAGS,
    mergeTagLabels,
    normalizeTagLabel,
  };
}
