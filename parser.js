// ─── PARSER DE DATOS REFACTORIZADO ──────────────────────────────────────────
// Extrae de forma limpia todos los campos del texto pegado en la interfaz.

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

function parseData(raw) {
  const get = (key) => {
    // Busca la llave seguida de ":" o espacio y luego captura el valor de esa línea
    const match = raw.match(new RegExp(key + '(?:[ \\t]*:[ \\t]*|[ \\t]+)(.+)', 'i'));
    return match ? match[1].trim() : '';
  };

  // Nombres y Apellidos
  const nombres = get('Nombre\\(s\\)') || get('Nombre');
  const apellido1 = get('Primer apellido') || get('Primer_apellido');
  const apellido2 = get('Segundo apellido') || get('Segundo_apellido');
  
  // Nombre Completo (siempre en Mayúsculas para el form)
  let nombreCompleto = get('Nombre Completo') || get('Nombre_Completo');
  if (!nombreCompleto && nombres) {
    nombreCompleto = [nombres, apellido1, apellido2].filter(Boolean).join(' ');
  }
  nombreCompleto = nombreCompleto.toUpperCase();

  // Email a minúsculas
  const email = get('CORREO') || get('EMAIL') || get('E-MAIL');
  const emailCleaned = email ? email.trim().toLowerCase() : '';

  // Limpieza y validación de teléfonos
  const dnPortar = cleanPhone(get('DN a portar') || get('DN_PORTAR') || get('DN PORTAR'));
  const dnAdicional = cleanPhone(get('DN ADICIONAL') || get('DN_ADICIONAL'));
  const dnContacto = cleanPhone(get('DN CONTACTO') || get('DN_CONTACTO') || get('DN CONTACTO:'));
  const dnMovistar = cleanPhone(get('DN MOVISTAR') || get('DN_MOVISTAR'));
  const dn = dnContacto || dnAdicional || get('DN'); // fallback de UI

  // Dirección de Facturación
  const calle = get('CALLE');
  const numExt = get('NUMERO EXTERIOR') || get('NÚMERO EXTERIOR') || get('NUM_EXT');
  const numInt = get('NUMERO INTERIOR') || get('NÚMERO INTERIOR') || get('NUM_INT');
  const cpDireccion = get('CODIGO POSTAL') || get('CÓDIGO POSTAL') || get('C\\.P\\.');
  const colonia = get('COLONIA');

  // Datos del CURP
  const curp = (get('CURP VERIFICADO') || get('CURP')).toUpperCase();
  const fecha = get('Fecha de nacimiento') || get('FECHA NACIM') || get('FECHA_NACIMIENTO');
  const genero = get('Sexo') || get('SEXO') || get('Género') || get('Genero');
  const lugarNacimiento = get('Entidad de nacimiento') || get('Estado de nacimiento') || get('ESTADO NACIM') || get('ESTADO_NACIMIENTO');

  // EID / Equipo / ID / Chat
  const eid = get('EID') || get('EQUIPO: EID') || get('EQUIPO') || get('EQUIPO EID');
  const chatId = get('ID') || get('CHAT ID') || get('ID CHAT') || get('CHAT_ID');

  // Datos CAC
  const cpCAC = get('CP') || get('C\\.P\\.') || get('Código Postal') || get('Codigo Postal');
  const fvc = get('FVC') || get('FECHA VENTA');
  const nombreCAV = get('CAC') || get('CAV') || get('Nombre CAV') || get('Nombre_CAV');

  // Producto y Plan
  const plan = get('PLAN') || get('PLAN ELEGIDO');
  const nombreTitular = get('NOMBRE TITULAR') || get('NOMBRE_TITULAR');

  return {
    nombres,
    apellido1,
    apellido2,
    nombreCompleto,
    email: emailCleaned,
    dnPortar,
    dnAdicional,
    dnContacto,
    dnMovistar,
    dn,
    calle,
    numExt,
    numInt,
    cp: cpCAC || cpDireccion,
    cpDireccion,
    colonia,
    curp,
    fecha,
    genero,
    lugarNacimiento,
    equipo: eid,
    chatId,
    fvc,
    nombreCAV,
    plan,
    nombreTitular,
    esEsim: !!eid,
    esCAC: !!nombreCAV
  };
}
