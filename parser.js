// ─── PARSER DE DATOS ────────────────────────────────────────────────────────
// Esta función extrae los datos del texto pegado en la extensión

function parseData(raw) {
  const get = (key) => {
    // La regex ignora saltos de línea para buscar exactamente en la misma línea
    const match = raw.match(new RegExp(key + '(?:[ \\t]*:[ \\t]*|[ \\t]+)(.+)', 'i'));
    return match ? match[1].trim() : '';
  };

  const nombres = get('Nombre\\(s\\)');
  const apellido1 = get('Primer apellido');
  const apellido2 = get('Segundo apellido');
  const nombreCompleto = [nombres, apellido1, apellido2].filter(Boolean).join(' ').toUpperCase();

  const fecha = get('Fecha de nacimiento'); // DD/MM/YYYY

  // Detecta producto desde la primera línea
  const primeraLinea = raw.split('\n')[0].trim().toUpperCase();
  const esEsim = primeraLinea.includes('ESIM') || primeraLinea.includes('ESÍM');
  const esCAC = primeraLinea.includes('CAC') || primeraLinea.includes('PREPAGO');
  
  let producto = '';
  const esLinea = primeraLinea.includes('LINEA NUEVA') || primeraLinea.includes('LÍNEA NUEVA');
  const esPrepago = primeraLinea.includes('PREPAGO');
  const esPorta = primeraLinea.includes('PORTA');
  const esAnual = primeraLinea.includes('ANUAL');

  if (primeraLinea.includes('ADICION') || primeraLinea.includes('ADICIÓN')) {
    producto = 'Adición';
  } else if (esLinea && esPrepago && esEsim) {
    producto = 'Línea Nueva Prepago Esim';
  } else if (esPrepago) {
    producto = 'Porta Prepago';
  } else {
    if (esLinea && esAnual) producto = 'Linea Nueva Plan Anual';
    else if (esLinea && esEsim) producto = 'Linea Nueva Esim';
    else if (esLinea) producto = 'Linea Nueva';
    else if (esPorta && esEsim) producto = 'Porta Pospago Esim';
    else if (esPorta) producto = 'Porta Pospago';
    else if (esEsim) producto = 'Porta Pospago Esim';
    else producto = 'Porta Pospago';
  }

  return {
    nombreCompleto,
    producto,
    plan: primeraLinea.includes('PREPAGO') ? 'Prepago' : get('PLAN'),
    fecha,
    curp: get('CURP VERIFICADO') || get('CURP'),
    dn: get('DN ADICIONAL') || get('DN CONTACTO'),
    email: get('CORREO'),
    nip: get('NIP'),
    lugarNacimiento: get('Entidad de nacimiento'),
    genero: get('Sexo'),
    esEsim,
    esCAC,
    equipo: get('Equipo'),
    fvc: get('FVC'),
    dnPortar: get('DN a portar'),
    nombreCAV: get('CAC') || get('CAV'),
    cp: get('CP') || get('C\\.P\\.') || get('Código Postal') || get('Codigo Postal')
  };
}
