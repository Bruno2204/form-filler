import { describe, it, expect } from 'vitest';
import { parseData } from '../parser.js';
import { PRODUCT_TEMPLATES } from '../popup.js';

// ─── Check end-to-end: datos crudos → parseo → resultado formateado ──────────
// A diferencia de los tests unitarios, esto ejercita la cadena COMPLETA con
// datos reales de operador: es la que atrapa regresiones de formato (un campo
// mal escrito, un plan duplicado, una etiqueta filtrada al texto).

// Datos de ejemplo de un PREPAGO ESIM (línea nueva prepago eSIM).
const PRE_ESIM = {
  linea: 'ana.garcia@correo.com\n5512345678\n',
  curp: [
    'Nombre(s): Ana',
    'Primer apellido: García',
    'Segundo apellido: Martínez',
    'CURP: GAMA900315MDFRNN07',
    'Fecha de nacimiento: 15/03/1990',
    'Sexo: Mujer',
    'Estado de nacimiento: Ciudad de México',
    '',
  ].join('\n'),
  chatId: '123456789',
  chatDn: '+525512345678',
  eid: '12345',
};

function parsePreEsim(overrides = {}) {
  const raw = [
    PRE_ESIM.linea,
    PRE_ESIM.curp,
    PRE_ESIM.chatId,
    PRE_ESIM.chatDn,
    PRE_ESIM.eid,
  ].join('\n');

  return parseData(raw, 'PRE_ESIM', PRE_ESIM.linea, '', '', {
    plan: '',
    chatId: PRE_ESIM.chatId,
    dnChat: PRE_ESIM.chatDn,
    eid: PRE_ESIM.eid,
    etiquetas: [],
    ...overrides,
  });
}

describe('end-to-end PRE ESIM', () => {
  it('parsea todos los campos del bloque pegado', () => {
    const parsed = parsePreEsim();

    expect(parsed.email).toBe('ana.garcia@correo.com');
    expect(parsed.nombres).toBe('Ana');
    expect(parsed.apellido1).toBe('García');
    expect(parsed.apellido2).toBe('Martínez');
    expect(parsed.curp).toBe('GAMA900315MDFRNN07');
    expect(parsed.fecha).toBe('15/03/1990');
    expect(parsed.genero).toBe('Mujer');
    expect(parsed.lugarNacimiento).toBe('Ciudad de México');
    expect(parsed.dnContacto).toBe('5512345678');
    expect(parsed.chatId).toBe('123456789');
    expect(parsed.dnChat).toBe('+525512345678');
    expect(parsed.eid).toBe('12345');
    expect(parsed.eidValid).toBe(true);
    expect(parsed.esEsim).toBe(true);
  });

  it('conserva las tildes y los acentos en el resultado', () => {
    const result = PRODUCT_TEMPLATES.PRE_ESIM(parsePreEsim());

    expect(result).toContain('García');
    expect(result).toContain('Martínez');
    expect(result).toContain('Ciudad de México');
    expect(result).not.toMatch(/Ã|Â/);
  });

  it('genera exactamente el resultado formateado esperado', () => {
    const result = PRODUCT_TEMPLATES.PRE_ESIM(parsePreEsim());

    expect(result).toBe(
      `Línea Nueva Prepago ESIM
EID: 12345
CORREO: ana.garcia@correo.com

NOMBRE: Ana
PRIMER APELLIDO: García
SEGUNDO APELLIDO: Martínez

DN CONTACTO: 5512345678
FECHA NACIM: 15/03/1990
SEXO: Mujer
CURP: GAMA900315MDFRNN07
Estado de nacimiento: Ciudad de México`,
    );
  });

  it('las etiquetas de contacto NO aparecen en el resultado formateado', () => {
    const parsed = parsePreEsim({
      etiquetas: ['Reapertura', 'Prospección IA'],
    });

    expect(parsed.etiquetas).toEqual(['Reapertura', 'Prospección IA']);

    const result = PRODUCT_TEMPLATES.PRE_ESIM(parsed);
    expect(result).not.toContain('Reapertura');
    expect(result).not.toContain('Prospección');
    expect(result).not.toContain('ETIQUETA');
  });
});

describe('end-to-end del plan', () => {
  it('el form recibe el plan completo y el texto la forma corta', () => {
    const parsed = parseData('', 'POS_ESIM', '', '', '', { plan: '20' });

    // Lo que va al dropdown del form.
    expect(parsed.plan).toBe('PLAN PRO 20');
    // Lo que se muestra en el texto que se copia.
    expect(parsed.planShort).toBe('PRO 20');
    // Lo que escribió el operador.
    expect(parsed.planRaw).toBe('20');
  });

  it('el resultado formateado no repite "PLAN"', () => {
    const parsed = parseData('', 'POS_ESIM', '', '', '', { plan: '30' });
    const result = PRODUCT_TEMPLATES.POS_ESIM(parsed);

    expect(result).toContain('PLAN: PRO 30');
    expect(result).not.toContain('PLAN: PLAN');
  });

  it('un plan escrito completo no se toca', () => {
    const parsed = parseData('', 'POS_ESIM', '', '', '', { plan: 'PLAN PRO 13 ILIMITADO' });

    expect(parsed.plan).toBe('PLAN PRO 13 ILIMITADO');
    expect(parsed.planShort).toBe('PRO 13 ILIMITADO');
  });
});
