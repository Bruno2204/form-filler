// ─── HELPER: VALIDACIÓN Y FORMATEO DE DATOS ──────────────────────────────────
//
// Zona auxiliar del panel lateral (botón "Helper" del header). NO rellena el
// Google Form: sirve para validar y formatear datos antes de cargarlos.
//
// Todo lo de este archivo son funciones PURAS (sin DOM) para que se puedan
// probar desde tests/helper.test.js. La parte de UI vive en popup.js.

// ─── Constantes ─────────────────────────────────────────────────────────────

// Un DN (celular) tiene 10 dígitos; un NIP, 4.
const HELPER_DN_LENGTH = 10;
const HELPER_NIP_LENGTH = 4;

// Correo: lo justo para detectar un correo mal pegado ("user@", "user.com").
const HELPER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

// Etiquetas conocidas de un bloque de nombres. Se corta el texto por estas
// etiquetas y cada trozo es un valor. Deliberadamente una lista cerrada (y no
// un patrón genérico "lo que haya antes de los dos puntos"): con un patrón
// genérico, una línea tipo "Carlos Alberto Primer apellido: López" perdería
// el nombre completo, porque "Carlos Alberto Primer apellido" parece una
// etiqueta.
const HELPER_NAME_LABEL_RE =
  /(?:nombre\s+completo|nombre\s*\(?s?\)?|nombres|primer[\s_]*apellido|segundo[\s_]*apellido|apellido[\s_]*paterno|apellido[\s_]*materno|apellido[\s_]*[12])\s*[:\-]/gi;

// Código postal al final de la línea de dirección: 5 o 4 dígitos.
// El grupo anterior NO puede ser un dígito, para no tomar los últimos 5
// dígitos de un número más largo ("831700" → "31700").
const HELPER_CP_RE = /(?:^|\D)(\d{4,5})\s*$/;

// Línea que parece una fecha: dd/mm/yyyy, dd/mm/yy o dd/mm.
const HELPER_DATE_LINE_RE = /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/;

// ─── Utilidades ─────────────────────────────────────────────────────────────

// Líneas no vacías de un bloque de texto.
function helperNonEmptyLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// Normaliza un teléfono a sus dígitos. MISMA regla que cleanPhone() de
// parser.js (si le quitan el prefijo 52 y sobran dígitos, se queda con 10):
// el helper y el panel tienen que aceptar exactamente los mismos DNs.
// La equivalencia está blindada por un test en tests/helper.test.js.
function helperDigits(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  if (cleaned.startsWith('52') && cleaned.length > 10) {
    return cleaned.substring(2);
  }
  return cleaned;
}

// Un dato presente: 'ok' o 'invalid' (con el motivo).
// Un dato ausente: 'missing'.
function helperCheck({ key, label, required = false, value, validate }) {
  if (!value) {
    return { key, label, required, status: 'missing', detail: 'no encontrado' };
  }
  const problem = validate ? validate(value) : null;
  if (problem) {
    return { key, label, required, status: 'invalid', detail: problem };
  }
  return { key, label, required, status: 'ok', detail: value };
}

// ─── 1. Validación de los datos de línea ────────────────────────────────────

// Valida el bloque de datos de línea con el MISMO formato que los textareas
// de portabilidad: un valor por línea, sin etiquetas.
//
//   5512345678   → DN a portar  (el primero)
//   5512345679   → DN de contacto (el segundo)
//   1234         → NIP
//   user@x.com  → correo
//
// Devuelve los checks (uno por dato) con su estado, la lista de líneas que no
// se pudo interpretar y el veredicto general.
function validateLineaData(text) {
  const lines = helperNonEmptyLines(text);

  const emails = [];
  const nips = [];
  const phones = [];
  const oddNumbers = [];
  const extraTexts = [];

  lines.forEach((line) => {
    // 1. Correo
    if (line.includes('@')) {
      emails.push(line);
      return;
    }

    const digits = helperDigits(line);

    // 2. NIP: exactamente 4 dígitos.
    if (/^\d+$/.test(digits) && digits.length === HELPER_NIP_LENGTH) {
      nips.push(digits);
      return;
    }

    // 3. DN: entre 8 y 15 dígitos (el prefijo 52 ya se quitó).
    if (/^\d+$/.test(digits) && digits.length >= 8 && digits.length <= 15) {
      phones.push(digits);
      return;
    }

    // 4. Número que no es NIP ni DN: casi siempre es un NIP mal pegado
    //    (5-7 dígitos) o un DN con dígitos de más.
    if (/^\d+$/.test(digits) && digits.length > 0) {
      oddNumbers.push(digits);
      return;
    }

    // 5. Texto suelto: el parser lo ignora (no es un error).
    extraTexts.push(line);
  });

  const dnPortar = phones[0] || '';
  const dnContacto = phones[1] || '';
  const nip = nips[0] || '';
  const email = emails[0] || '';

  const checks = [
    helperCheck({
      key: 'dnPortar',
      label: 'DN a portar',
      required: true,
      value: dnPortar,
      validate: (value) =>
        value.length === HELPER_DN_LENGTH
          ? null
          : `tiene ${value.length} dígitos (deben ser ${HELPER_DN_LENGTH})`,
    }),
    helperCheck({
      key: 'dnContacto',
      label: 'DN de contacto',
      required: false,
      value: dnContacto,
      validate: (value) =>
        value.length === HELPER_DN_LENGTH
          ? null
          : `tiene ${value.length} dígitos (deben ser ${HELPER_DN_LENGTH})`,
    }),
  ];

  // NIP: si no hay uno de 4 dígitos pero hay un número de 5 a 7, se reporta
  // como NIP mal pegado en vez de "no encontrado".
  let consumedOdd = 0;
  if (nip) {
    checks.push({
      key: 'nip',
      label: 'NIP',
      required: true,
      status: 'ok',
      detail: nip,
    });
  } else if (oddNumbers.length) {
    const suspect = oddNumbers[0];
    consumedOdd = 1;
    checks.push({
      key: 'nip',
      label: 'NIP',
      required: true,
      status: 'invalid',
      detail: `posible NIP mal pegado: ${suspect} (${suspect.length} dígitos, deben ser ${HELPER_NIP_LENGTH})`,
    });
  } else {
    checks.push({
      key: 'nip',
      label: 'NIP',
      required: true,
      status: 'missing',
      detail: 'no encontrado',
    });
  }

  checks.push(
    helperCheck({
      key: 'email',
      label: 'Correo',
      required: true,
      value: email,
      validate: (value) =>
        HELPER_EMAIL_RE.test(value.trim()) ? null : 'formato de correo inválido',
    }),
  );

  // Números que no son NIP ni DN: el parser los descarta en silencio, hay que
  // avisar. Los textos sueltos no son un problema (el parser también los
  // ignora), se listan sólo como aviso.
  const problems = checks.filter((check) => check.status === 'invalid').length;
  const missing = checks.filter(
    (check) => check.status === 'missing' && check.required,
  );

  return {
    checks,
    values: { email, nip, dnPortar, dnContacto },
    // El número que se reportó como NIP mal pegado no se repite acá.
    oddNumbers: oddNumbers.slice(consumedOdd),
    extraTexts,
    problems,
    missing: missing.map((check) => check.label),
    valid: problems === 0 && missing.length === 0,
  };
}

// ─── 2. Nombre completo ─────────────────────────────────────────────────────

// Corta el texto por las etiquetas conocidas y devuelve los valores.
// Devuelve null si el texto no tiene ninguna etiqueta (entonces el texto
// ya viene en líneas, una por valor).
function splitByNameLabels(text) {
  const regex = new RegExp(HELPER_NAME_LABEL_RE.source, 'gi');
  const matches = [];
  let match = regex.exec(text);
  while (match !== null) {
    matches.push(match);
    match = regex.exec(text);
  }
  if (!matches.length) return null;

  const values = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    values.push(text.slice(start, end).trim());
  }
  return values.filter(Boolean);
}

// Nombre completo a partir del bloque de la CURP, con o sin etiquetas:
//
//   Nombre(s): Carlos Alberto          Carlos Alberto
//   Primer apellido: López      →     López
//   Segundo apellido: Duarte         Duarte
//
// Devuelve "Carlos Alberto López Duarte".
function formatFullName(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';

  const labeled = splitByNameLabels(raw);
  const parts = labeled || helperNonEmptyLines(raw);

  return parts
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

// ─── 3. Mensajes de chat con el nombre ─────────────────────────────────────

// Los 4 mensajes que se le mandan al cliente. El placeholder {nombre} se
// reemplaza por el nombre completo que arma formatFullName().
//
// Los dos primeros son para productos CON plan; los dos últimos son los de
// prepago (PREPAGO y PRE_ESIM, que no tienen plan).
//
// OJO: los mensajes con plan terminan en ESPACIO ("con el Plan Pro "). El
// operador lo manda al cliente y completa el plan escribiéndolo justo
// después, sin tener que agregar el espacio a mano. No hacer .trim() de
// estos textos.
const HELPER_NAME_MESSAGES = [
  {
    key: 'cambio-plan',
    label: 'Cambio cía. + Plan Pro',
    text: 'Bien, haremos el cambio de compañía a nombre de {nombre} con el Plan Pro ',
  },
  {
    key: 'linea-nueva-plan',
    label: 'Línea nueva + Plan Pro',
    text: 'Bien, haremos la línea nueva (con número nuevo) a nombre de {nombre} con el Plan Pro ',
  },
  {
    key: 'cambio-prepago',
    label: 'Cambio cía. (prepago)',
    text: 'Bien, haremos el cambio de compañía a nombre de {nombre}',
  },
  {
    key: 'linea-nueva-prepago',
    label: 'Línea nueva (prepago)',
    text: 'Bien, haremos la línea nueva (con número nuevo) a nombre de {nombre}',
  },
];

// Arma uno de los mensajes con el nombre completo.
// Devuelve '' si la clave no existe.
function formatNameMessage(key, fullName) {
  const message = HELPER_NAME_MESSAGES.find((item) => item.key === key);
  if (!message) return '';
  return message.text.replace('{nombre}', String(fullName || '').trim());
}

// ─── 4. CAC: nombre, CP y FVC ───────────────────────────────────────────────

// Interpreta dd/mm/yyyy, dd/mm/yy o dd/mm (el año por defecto es el actual).
// Devuelve null si la fecha no existe (31/02) o no se puede interpretar.
function parseDateValue(str, now = new Date()) {
  const parts = String(str || '')
    .trim()
    .split('/')
    .map((part) => part.trim());

  if (parts.length < 2 || parts.length > 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  let year;

  if (parts.length === 3) {
    year = Number(parts[2]);
    if (parts[2].length <= 2) year += 2000;
  } else {
    // Sin año: se usa el año actual. Si el segundo número no puede ser un
    // mes ("03/26"), no es una fecha interpretable.
    if (month > 12) return null;
    year = now.getFullYear();
  }

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year))
    return null;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  // Rechaza fechas inexistentes (31/02 → 03/03).
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;

  return { day, month, year };
}

// Fecha por defecto cuando el operador no escribe ninguna: el día siguiente.
// Si hoy es sábado o domingo se salta un día extra
// (sábado → lunes, domingo → martes).
function defaultFvcDate(now = new Date()) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = base.getDay(); // 0 = domingo … 6 = sábado
  base.setDate(base.getDate() + 1);
  if (weekday === 0 || weekday === 6) {
    base.setDate(base.getDate() + 1);
  }
  return {
    day: base.getDate(),
    month: base.getMonth() + 1,
    year: base.getFullYear(),
  };
}

// Fecha en formato dd/mm/yyyy.
function formatDateValue(value) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(value.day)}/${pad(value.month)}/${value.year}`;
}

// Descompone el bloque CAC:
//
//   CAC Hermosillo                                  ← nombre del CAC
//                                                  ← (línea vacía)
//   Calle: Blvd. Solidaridad 56, Col: El Sahuaro, Hermosillo, Sonora, Cp: 83170
//   03/11/2026                                     ← fecha (opcional)
//
// El CP va siempre al final de la línea de dirección (5 o 4 dígitos).
function parseCacBlock(text, now = new Date()) {
  const lines = helperNonEmptyLines(text);
  const result = {
    cac: '',
    cp: '',
    fecha: '',
    fechaSource: 'default', // 'default' | 'input'
    warnings: [],
  };

  if (!lines.length) return result;

  // 1. Primera línea: el CAC (con o sin el prefijo "CAC").
  result.cac = lines[0];

  // 2. La fecha (si la hay) es una línea con formato de fecha.
  let dateIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (HELPER_DATE_LINE_RE.test(lines[i])) {
      dateIndex = i;
      break;
    }
  }

  // 3. La dirección es la primera línea que no es fecha y termina en CP.
  let addressIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (i === dateIndex) continue;
    if (HELPER_CP_RE.test(lines[i])) {
      addressIndex = i;
      break;
    }
  }

  if (addressIndex >= 0) {
    const match = lines[addressIndex].match(HELPER_CP_RE);
    result.cp = match ? match[1] : '';
  } else {
    result.warnings.push('No se encontró el código postal en la dirección.');
  }

  // 4. Fecha: la que escribió el operador o, por defecto, el día siguiente.
  if (dateIndex >= 0) {
    const parsed = parseDateValue(lines[dateIndex], now);
    if (parsed) {
      result.fecha = formatDateValue(parsed);
      result.fechaSource = 'input';
    } else {
      result.warnings.push(
        `Fecha inválida: "${lines[dateIndex]}". Se usa la fecha por defecto.`,
      );
    }
  }

  if (!result.fecha) {
    result.fecha = formatDateValue(defaultFvcDate(now));
    result.fechaSource = 'default';
  }

  return result;
}

// Bloque CAC listo para pegar: CAC, CP y FVC en tres líneas.
function formatCacBlock(text, now = new Date()) {
  const parsed = parseCacBlock(text, now);
  return [parsed.cac, parsed.cp, parsed.fecha].join('\n');
}

// Conditional exports for Node.js / CJS testing (browser-safe, no behavior change).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateLineaData,
    formatFullName,
    formatNameMessage,
    HELPER_NAME_MESSAGES,
    parseCacBlock,
    formatCacBlock,
    parseDateValue,
    defaultFvcDate,
    formatDateValue,
    helperDigits,
    helperNonEmptyLines,
    HELPER_DN_LENGTH,
    HELPER_NIP_LENGTH,
    HELPER_EMAIL_RE,
  };
}
