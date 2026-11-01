// ─── PARSER DE DATOS REFACTORIZADO E INTELIGENTE ────────────────────────────
// Extrae de forma limpia todos los campos de la interfaz.

function cleanPhone(phoneStr) {
  if (!phoneStr) return '';
  // Elimina todo lo que no sea dígito
  let cleaned = phoneStr.replace(/\D/g, '');
  // Si tiene prefijo de país 52 (de México, por ejemplo, 52 + 10 dígitos = 12 dígitos)
  if (cleaned.startsWith('52') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

function isEsimProduct(productKey) {
  return ['POS_ESIM', 'LN_ESIM', 'PRE_ESIM'].includes(productKey);
}

// Formatea el DN del chat conservando el prefijo +52
function formatDnChat(phoneStr) {
  if (!phoneStr) return '';
  const trimmed = phoneStr.trim();
  if (trimmed.startsWith('+52')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('52') && digits.length >= 12) return '+' + digits;
  if (digits.length === 10) return '+52' + digits;
  return trimmed.startsWith('+') ? trimmed : '+52' + digits;
}

// Planes disponibles en el dropdown "Plan elegido" del Google Form.
// Fuente de verdad: la lista real de opciones del form.
const PLAN_OPTIONS = [
  'Prepago',
  'PLAN PRO 11',
  'PLAN PRO 13 ILIMITADO',
  'PLAN PRO 16',
  'PLAN PRO 20',
  'PLAN PRO 30',
  'PLAN PRO ILIMITADO',
  'PLAN 10',
];

// Códigos cortos que escribe el operador → plan canónico.
// "30" → "PLAN PRO 30", "13" → "PLAN PRO 13 ILIMITADO", etc.
// El valor es la forma COMPLETA que espera el dropdown del form.
const PLAN_ALIASES = {
  '10': 'PLAN 10',
  '11': 'PLAN PRO 11',
  '13': 'PLAN PRO 13 ILIMITADO',
  '16': 'PLAN PRO 16',
  '20': 'PLAN PRO 20',
  '30': 'PLAN PRO 30',
  'ilimitado': 'PLAN PRO ILIMITADO',
};

// Prefijos que se sacan para mostrar el plan en el resultado formateado:
// "PLAN PRO 30" → "PRO 30", "PLAN 10" → "10".
// El dropdown del form recibe la forma completa; el texto copiado, la
// corta ("PLAN: PRO 30" en lugar de "PLAN: PLAN PRO 30").
const PLAN_PREFIX = /^PLAN\s+/i;

// Normaliza texto para comparar planes: sin acentos, minúsculas y sin
// espacios extra. Permite que "plan pro 30" y "PLAN PRO 30" sean el
// mismo plan sin depender de cómo lo escribió el operador.
function normalizePlanKey(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Normaliza el plan que escribe el operador:
//   "30"                → "PLAN PRO 30"
//   "pro 30"            → "PLAN PRO 30"
//   "PLAN PRO 30"       → "PLAN PRO 30" (forma canónica)
//   "pro 13 ilimitado"  → "PLAN PRO 13 ILIMITADO"
//   "ilimitado"         → "PLAN PRO ILIMITADO"
//   "Plan Anual"        → "Plan Anual" (texto libre, sin cambios)
function normalizePlan(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const key = normalizePlanKey(trimmed);

  // 1. Ya es un plan de la lista → forma canónica
  const exact = PLAN_OPTIONS.find(
    (option) => normalizePlanKey(option) === key,
  );
  if (exact) return exact;

  // 2. Alias conocido: "30" → "PLAN PRO 30", "ilimitado" → "PLAN PRO ILIMITADO"
  if (PLAN_ALIASES[key]) return PLAN_ALIASES[key];

  // 3. Código numérico desconocido: "45" → "PLAN PRO 45"
  if (/^\d+$/.test(trimmed)) {
    return `PLAN PRO ${trimmed}`;
  }

  // 4. Forma corta: "pro 30", "pro 13 ilimitado"
  const short = trimmed.match(/^pro\s+(\d+)(\s+ilimitado)?$/i);
  if (short) {
    const code = short[1];
    if (short[2]) return `PLAN PRO ${code} ILIMITADO`;
    return PLAN_ALIASES[code] || `PLAN PRO ${code}`;
  }

  // 5. Texto libre: no se toca
  return trimmed;
}

// Forma corta del plan para mostrar en el resultado formateado:
// "PLAN PRO 30" → "PRO 30", "PLAN 10" → "10", "Prepago" → "Prepago".
function formatPlanForOutput(plan) {
  const trimmed = (plan || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(PLAN_PREFIX, '').trim() || trimmed;
}

// Procesa el textarea de chat: ID, DN (+52), EID (solo ESIM, 5 dígitos)
function parseChatField(text, productKey) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const res = { chatId: '', dnChat: '', eid: '', eidValid: true };
  if (lines.length >= 1) res.chatId = lines[0];
  if (lines.length >= 2) res.dnChat = formatDnChat(lines[1]);
  if (lines.length >= 3 && isEsimProduct(productKey)) {
    const eidDigits = lines[2].replace(/\D/g, '');
    res.eid = eidDigits;
    res.eidValid = /^\d{5}$/.test(eidDigits);
  }
  return res;
}

// Procesa de forma inteligente el textarea "Datos de Línea" sin requerir etiquetas
function parseLineaField(text, productKey) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  let emails = [];
  let nips = [];
  let phones = [];
  let otherTexts = [];

  lines.forEach((line) => {
    // 1. Identificar si es correo electrónico
    if (line.includes('@')) {
      emails.push(line.toLowerCase().trim());
      return;
    }

    // Limpiar para evaluar números
    const cleaned = cleanPhone(line);

    // 2. Identificar si es NIP (exactamente 4 números)
    if (cleaned.length === 4 && /^\d+$/.test(cleaned)) {
      nips.push(cleaned);
      return;
    }

    // 3. Identificar si es un número de teléfono móvil / fijo (habitualmente entre 8 y 15 dígitos)
    if (cleaned.length >= 8 && cleaned.length <= 15 && /^\d+$/.test(cleaned)) {
      phones.push(cleaned);
      return;
    }

    // 4. Si no coincide, es texto descriptivo (Plan, Nombre de titular, etc.)
    otherTexts.push(line);
  });

  const res = {
    plan: '',
    email: emails[0] || '',
    nip: nips[0] || '',
    dnPortar: '',
    dnAdicional: '',
    dnContacto: '',
    dnMovistar: '',
    nombreTitular: ''
  };

  // Nombre del titular para Adición (si queda texto libre)
  if (productKey === 'ADIC_CAC' && otherTexts.length > 0) {
    res.nombreTitular = otherTexts.join(' ');
  }

  // Asignar los teléfonos de acuerdo al tipo de producto y al orden de aparición
  if (['POS_ESIM', 'POS_CAC', 'PREPAGO'].includes(productKey)) {
    // Portabilidades: 1° DN a portar, 2° DN Adicional
    res.dnPortar = phones[0] || '';
    res.dnAdicional = phones[1] || '';
    res.dnContacto = phones[1] || ''; // duplicamos por compatibilidad
  } else if (['LN_ESIM', 'LN_CAC', 'PRE_ESIM'].includes(productKey)) {
    // Líneas Nuevas: Solo hay DN Contacto (1°)
    res.dnContacto = phones[0] || '';
  } else if (productKey === 'ADIC_CAC') {
    // Adiciones: 1° DN Movistar, 2° DN Contacto
    res.dnMovistar = phones[0] || '';
    res.dnContacto = phones[1] || '';
  }

  return res;
}

// Procesa el textarea "Datos CAC" sin etiquetas
function parseCacField(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let res = { nombreCAV: '', cpCAC: '', fvc: '' };
  if (lines.length >= 1) res.nombreCAV = lines[0];
  if (lines.length >= 2) res.cpCAC = lines[1];
  if (lines.length >= 3) {
    let date = lines[2];
    // Year is completed at parse time from the system clock.
    // Tests must fake the system clock (vi.setSystemTime) for determinism
    // — see tests/parser.test.js (CURRENT_YEAR / beforeEach fake timers).
    if (/^\d{1,2}\/\d{1,2}$/.test(date)) {
      date += '/' + new Date().getFullYear();
    }
    res.fvc = date;
  }
  return res;
}

// Procesa el textarea "Datos de Dirección" sin etiquetas
function parseDireccionField(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let res = { calle: '', numExt: '', numInt: '', cpDireccion: '', colonia: '' };
  if (lines.length === 0) return res;
  if (lines.length === 1) {
    res.calle = lines[0];
    return res;
  }
  if (lines.length === 2) {
    res.calle = lines[0];
    res.colonia = lines[1];
    return res;
  }
  if (lines.length === 3) {
    res.calle = lines[0];
    res.cpDireccion = lines[1];
    res.colonia = lines[2];
    return res;
  }
  res.calle = lines[0];
  res.colonia = lines[lines.length - 1];
  res.cpDireccion = lines[lines.length - 2];
  
  const middle = lines.slice(1, lines.length - 2);
  if (middle.length >= 1) res.numExt = middle[0];
  if (middle.length >= 2) res.numInt = middle.slice(1).join(' ');
  return res;
}

// Función principal de parseo general combinando todos los campos
function parseData(raw, productKey, lineaRawText = '', cacRawText = '', direccionRawText = '', fieldOverrides = {}) {
  const {
    plan: planOverride = '',
    chatId: chatIdOverride = '',
    dnChat: dnChatOverride = '',
    eid: eidOverride = '',
    etiquetas: etiquetasOverride = [],
  } = fieldOverrides;
  const get = (key) => {
    const match = raw.match(new RegExp(key + '(?:[ \\t]*:[ \\t]*|[ \\t]+)(.+)', 'i'));
    return match ? match[1].trim() : '';
  };

  // 1. Obtener la extracción heurística de la sección de línea
  const lineaData = parseLineaField(lineaRawText || get('input-linea') || raw, productKey);
  const cacData = parseCacField(cacRawText || '');
  const direccionData = parseDireccionField(direccionRawText || '');
  const chatData = parseChatField('', productKey);

  // 2. Extraer el resto de campos desde los otros textareas (utilizando regex sobre el raw acumulado)
  const nombres = get('Nombre\\(s\\)') || get('Nombre');
  const apellido1 = get('Primer apellido') || get('Primer_apellido');
  const apellido2 = get('Segundo apellido') || get('Segundo_apellido');
  
  let nombreCompleto = get('Nombre Completo') || get('Nombre_Completo');
  if (!nombreCompleto && nombres) {
    nombreCompleto = [nombres, apellido1, apellido2].filter(Boolean).join(' ');
  }
  nombreCompleto = nombreCompleto.toUpperCase();

  const curp = (get('CURP VERIFICADO') || get('CURP')).toUpperCase();
  const fecha = get('Fecha de nacimiento') || get('FECHA NACIM') || get('FECHA_NACIMIENTO');
  const genero = get('Sexo') || get('SEXO') || get('Género') || get('Genero');
  const lugarNacimiento = get('Entidad de nacimiento') || get('Estado de nacimiento') || get('ESTADO NACIM') || get('ESTADO_NACIMIENTO');

  const calle = direccionData.calle || get('CALLE');
  const numExt = direccionData.numExt || get('NUMERO EXTERIOR') || get('NÚMERO EXTERIOR') || get('NUM_EXT');
  const numInt = direccionData.numInt || get('NUMERO INTERIOR') || get('NÚMERO INTERIOR') || get('NUM_INT');
  const cpDireccion = direccionData.cpDireccion || get('CODIGO POSTAL') || get('CÓDIGO POSTAL');
  const colonia = direccionData.colonia || get('COLONIA');

  const chatId = chatIdOverride.trim() || chatData.chatId || get('ID LEAD') || get('ID') || get('CHAT ID') || get('ID CHAT') || get('CHAT_ID');
  const dnChat = dnChatOverride.trim()
    ? formatDnChat(dnChatOverride)
    : (chatData.dnChat || formatDnChat(get('DN CON EL QUE SE COMUNICA') || get('DN RESPOND') || ''));
  let eid = eidOverride.trim()
    ? eidOverride.replace(/\D/g, '')
    : (chatData.eid || get('EID') || get('EQUIPO EID') || '');
  const eidValid = eidOverride.trim() ? /^\d{5}$/.test(eid) : (chatData.eid ? chatData.eidValid : /^\d{5}$/.test(eid));
  const esEsim = isEsimProduct(productKey);

  const cpCAC = cacData.cpCAC || get('CP') || get('C\\.P\\.');
  const fvc = cacData.fvc || get('FVC') || get('FECHA VENTA');
  const nombreCAV = cacData.nombreCAV || get('CAC') || get('CAV') || get('Nombre CAV') || get('Nombre_CAV');

  const lineaNuevaProductos = ['LN_ESIM', 'LN_CAC', 'PRE_ESIM'].includes(productKey);
  const dnContactoCalc = lineaData.dnContacto
    || (lineaNuevaProductos ? cleanPhone(dnChat) : '')
    || cleanPhone(get('DN CONTACTO'));

  return {
    nombres: nombres || lineaData.nombres || '',
    apellido1: apellido1 || lineaData.apellido1 || '',
    apellido2: apellido2 || lineaData.apellido2 || '',
    nombreCompleto: nombreCompleto || lineaData.nombreCompleto || '',
    email: lineaData.email || get('CORREO') || get('EMAIL') || '',
    dnPortar: lineaData.dnPortar || cleanPhone(get('DN a portar')),
    dnAdicional: lineaData.dnAdicional || cleanPhone(get('DN ADICIONAL')),
    dnContacto: dnContactoCalc,
    dnMovistar: lineaData.dnMovistar || cleanPhone(get('DN MOVISTAR')),
    dn: dnContactoCalc,
    calle,
    numExt,
    numInt,
    cpDireccion,
    cpCAC,
    colonia,
    curp,
    fecha,
    genero,
    lugarNacimiento,
    chatId,
    dnChat,
    eid,
    eidValid,
    fvc,
    nombreCAV,
    plan: normalizePlan(planOverride.trim() || lineaData.plan || get('PLAN') || ''),
    planRaw: (planOverride.trim() || lineaData.plan || get('PLAN') || '').trim(),
    planShort: formatPlanForOutput(
      normalizePlan(planOverride.trim() || lineaData.plan || get('PLAN') || ''),
    ),
    nip: lineaData.nip || get('NIP') || '',
    nombreTitular: lineaData.nombreTitular || get('NOMBRE TITULAR') || '',
    esEsim,
    esCAC: !!nombreCAV,
    etiquetas: Array.isArray(etiquetasOverride)
      ? etiquetasOverride.filter((tag) => typeof tag === 'string' && tag.trim() !== '')
      : [],
  };
}

// Conditional exports for Node.js / CJS testing (browser-safe, no behavior change)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanPhone,
    isEsimProduct,
    formatDnChat,
    normalizePlan,
    formatPlanForOutput,
    PLAN_ALIASES,
    PLAN_OPTIONS,
    parseChatField,
    parseLineaField,
    parseCacField,
    parseDireccionField,
    parseData,
  };
}
