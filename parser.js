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

  // Determinar Plan: es el primer texto descriptivo para productos pospago/adición
  const needsPlan = !['PREPAGO', 'PRE_ESIM'].includes(productKey);
  if (needsPlan && otherTexts.length > 0) {
    res.plan = otherTexts.shift();
  }

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
    if (/^\d{1,2}\/\d{1,2}$/.test(date)) {
      date += '/2026';
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
function parseData(raw, productKey, lineaRawText = '', cacRawText = '', direccionRawText = '') {
  const get = (key) => {
    const match = raw.match(new RegExp(key + '(?:[ \\t]*:[ \\t]*|[ \\t]+)(.+)', 'i'));
    return match ? match[1].trim() : '';
  };

  // 1. Obtener la extracción heurística de la sección de línea
  const lineaData = parseLineaField(lineaRawText || get('input-linea') || raw, productKey);
  const cacData = parseCacField(cacRawText || '');
  const direccionData = parseDireccionField(direccionRawText || '');

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
  const cpDireccion = direccionData.cpDireccion || get('CODIGO POSTAL') || get('CÓDIGO POSTAL') || get('C\\.P\\.');
  const colonia = direccionData.colonia || get('COLONIA');

  const eid = get('EID') || get('EQUIPO: EID') || get('EQUIPO') || get('EQUIPO EID');
  const chatId = get('ID') || get('CHAT ID') || get('ID CHAT') || get('CHAT_ID');

  const cpCAC = cacData.cpCAC || get('CP') || get('C\\.P\\.') || get('Código Postal') || get('Codigo Postal');
  const fvc = cacData.fvc || get('FVC') || get('FECHA VENTA');
  const nombreCAV = cacData.nombreCAV || get('CAC') || get('CAV') || get('Nombre CAV') || get('Nombre_CAV');

  return {
    nombres: nombres || lineaData.nombres || '',
    apellido1: apellido1 || lineaData.apellido1 || '',
    apellido2: apellido2 || lineaData.apellido2 || '',
    nombreCompleto: nombreCompleto || lineaData.nombreCompleto || '',
    email: lineaData.email || get('CORREO') || get('EMAIL') || '',
    dnPortar: lineaData.dnPortar || cleanPhone(get('DN a portar')),
    dnAdicional: lineaData.dnAdicional || cleanPhone(get('DN ADICIONAL')),
    dnContacto: lineaData.dnContacto || cleanPhone(get('DN CONTACTO')),
    dnMovistar: lineaData.dnMovistar || cleanPhone(get('DN MOVISTAR')),
    dn: lineaData.dnContacto || cleanPhone(get('DN CONTACTO')),
    calle,
    numExt,
    numInt,
    cp: cpCAC || cpDireccion || get('CP'),
    cpDireccion,
    colonia,
    curp,
    fecha,
    genero,
    lugarNacimiento,
    equipo: eid || lineaData.equipo || '',
    chatId,
    fvc,
    nombreCAV,
    plan: lineaData.plan || get('PLAN') || '',
    nip: lineaData.nip || get('NIP') || '',
    nombreTitular: lineaData.nombreTitular || get('NOMBRE TITULAR') || '',
    esEsim: !!(eid || lineaData.equipo),
    esCAC: !!nombreCAV
  };
}
