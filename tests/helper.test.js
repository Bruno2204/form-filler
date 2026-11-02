import { describe, it, expect } from 'vitest';
import {
  validateLineaData,
  formatFullName,
  parseCacBlock,
  formatCacBlock,
  parseDateValue,
  defaultFvcDate,
  helperDigits,
} from '../helper.js';
import { parseLineaField, cleanPhone } from '../parser.js';

// Fechas de referencia (hora local):
//   01/11/2026 → domingo
//   02/11/2026 → lunes
//   10/07/2026 → martes
const SUNDAY = new Date(2026, 10, 1);
const MONDAY = new Date(2026, 10, 2);
const SATURDAY = new Date(2027, 6, 10);

function checkOf(result, key) {
  return result.checks.find((check) => check.key === key);
}

// ─── 1. Validación de la línea ──────────────────────────────────────────────

describe('validateLineaData', () => {
  it('acepta una línea completa y válida', () => {
    const result = validateLineaData(
      '5512345678\n5512345679\n1234\nuser@example.com',
    );

    expect(result.valid).toBe(true);
    expect(result.problems).toBe(0);
    expect(result.missing).toEqual([]);
    result.checks.forEach((check) => {
      expect(check.status).toBe('ok');
    });
  });

  it('asigna el primer teléfono al DN a portar y el segundo al de contacto', () => {
    const result = validateLineaData(
      '5512345678\n5512345679\n1234\nuser@example.com',
    );

    expect(checkOf(result, 'dnPortar').detail).toBe('5512345678');
    expect(checkOf(result, 'dnContacto').detail).toBe('5512345679');
    expect(checkOf(result, 'nip').detail).toBe('1234');
    expect(checkOf(result, 'email').detail).toBe('user@example.com');
  });

  it('marca inválido un DN a portar que no tiene 10 dígitos', () => {
    const result = validateLineaData('551234567\n1234\nuser@example.com');

    const check = checkOf(result, 'dnPortar');
    expect(check.status).toBe('invalid');
    expect(check.detail).toContain('9 dígitos');
    expect(result.valid).toBe(false);
  });

  it('marca inválido un DN de contacto que no tiene 10 dígitos', () => {
    const result = validateLineaData(
      '5512345678\n551234567\n1234\nuser@example.com',
    );

    expect(checkOf(result, 'dnContacto').status).toBe('invalid');
  });

  it('acepta el prefijo 52 en los DNs (misma regla que cleanPhone)', () => {
    const result = validateLineaData(
      '+525512345678\n+525512345679\n1234\nuser@example.com',
    );

    expect(checkOf(result, 'dnPortar').status).toBe('ok');
    expect(checkOf(result, 'dnContacto').status).toBe('ok');
  });

  it('reporta un NIP de 5 dígitos como NIP mal pegado', () => {
    const result = validateLineaData('5512345678\n12345\nuser@example.com');

    const check = checkOf(result, 'nip');
    expect(check.status).toBe('invalid');
    expect(check.detail).toContain('12345');
  });

  it('reporta un NIP ausente', () => {
    const result = validateLineaData('5512345678\nuser@example.com');

    const check = checkOf(result, 'nip');
    expect(check.status).toBe('missing');
    expect(result.missing).toContain('NIP');
  });

  it('marca inválido un correo con mal formato', () => {
    const result = validateLineaData('5512345678\n1234\nuser@');

    const check = checkOf(result, 'email');
    expect(check.status).toBe('invalid');
    expect(check.detail).toContain('inválido');
  });

  it('reporta un correo ausente', () => {
    const result = validateLineaData('5512345678\n1234');

    expect(checkOf(result, 'email').status).toBe('missing');
    expect(result.missing).toContain('Correo');
  });

  it('no marca error por un texto suelto (el parser también lo ignora)', () => {
    const result = validateLineaData(
      '5512345678\n1234\nuser@example.com\nNOTA DEL OPERADOR',
    );

    expect(result.valid).toBe(true);
    expect(result.extraTexts).toEqual(['NOTA DEL OPERADOR']);
  });

  it('no repite el número que ya reportó como NIP mal pegado', () => {
    const result = validateLineaData('5512345678\n12345\nuser@example.com');

    expect(checkOf(result, 'nip').status).toBe('invalid');
    expect(result.oddNumbers).toEqual([]);
  });

  it('reporta los números que no son NIP ni DN', () => {
    const result = validateLineaData(
      '5512345678\n1234\nuser@example.com\n1234567890123456',
    );

    expect(result.oddNumbers).toEqual(['1234567890123456']);
  });

  it('clasifica igual que el parser de portabilidad (misma fuente de verdad)', () => {
    const samples = [
      '5512345678\n5512345679\n1234\nuser@example.com',
      '551234567\n1234\nuser@example.com',
      'user@example.com\n5512345678\n1234',
      '5512345678\n12345\nuser@example.com',
      '5512345678\n5512345679\n5512345670\n1234\nuser@example.com',
    ];

    samples.forEach((sample) => {
      const helper = validateLineaData(sample);
      const parser = parseLineaField(sample, 'POS_ESIM');

      // Mismos datos que ve el parser de portabilidad (el helper sólo los
      // valida extra).
      expect(helper.values.email.toLowerCase()).toBe(parser.email);
      expect(helper.values.nip).toBe(parser.nip);
      expect(helper.values.dnPortar).toBe(parser.dnPortar);
      expect(helper.values.dnContacto).toBe(parser.dnContacto);
    });
  });

  it('normaliza los teléfonos igual que cleanPhone', () => {
    const samples = [
      '52 55 1234 5678',
      '5512345678',
      '(55) 1234-5678',
      '525512345678',
      '+52 5512345678',
      '551234567',
    ];

    samples.forEach((sample) => {
      expect(helperDigits(sample)).toBe(cleanPhone(sample));
    });
  });
});

// ─── 2. Nombre completo ─────────────────────────────────────────────────────

describe('formatFullName', () => {
  it('quita las etiquetas y une los valores', () => {
    const text =
      'Nombre(s): Carlos Alberto\nPrimer apellido: López\nSegundo apellido: Duarte';

    expect(formatFullName(text)).toBe('Carlos Alberto López Duarte');
  });

  it('une los valores cuando no hay etiquetas', () => {
    const text = 'Carlos Alberto\nLópez\nDuarte';

    expect(formatFullName(text)).toBe('Carlos Alberto López Duarte');
  });

  it('resuelve las etiquetas en una sola línea', () => {
    const text =
      'Nombre(s): Carlos Alberto Primer apellido: López Segundo apellido: Duarte';

    expect(formatFullName(text)).toBe('Carlos Alberto López Duarte');
  });

  it('acepta underscore en las etiquetas (Primer_apellido)', () => {
    const text = 'Nombre(s): Carlos Alberto\nPrimer_apellido: López';

    expect(formatFullName(text)).toBe('Carlos Alberto López');
  });

  it('conserva las tildes y mayúsculas', () => {
    expect(formatFullName('María José\nÑuñez\nDe la Cruz')).toBe(
      'María José Ñuñez De la Cruz',
    );
  });

  it('devuelve vacío si no hay texto', () => {
    expect(formatFullName('')).toBe('');
    expect(formatFullName('   \n  ')).toBe('');
  });

  it('ignora líneas vacías', () => {
    expect(formatFullName('Carlos Alberto\n\n\nLópez\nDuarte')).toBe(
      'Carlos Alberto López Duarte',
    );
  });
});

// ─── 3. CAC ─────────────────────────────────────────────────────────────────

describe('parseCacBlock', () => {
  const ADDRESS =
    'Calle: Blvd. Solidaridad 56, Col: El Sahuaro, Hermosillo, Sonora, Cp: 83170';

  it('saca el CAC de la primera línea', () => {
    const result = parseCacBlock(`CAC Hermosillo\n\n${ADDRESS}`, SUNDAY);

    expect(result.cac).toBe('CAC Hermosillo');
  });

  it('saca el CP del final de la dirección', () => {
    const result = parseCacBlock(`CAC Hermosillo\n\n${ADDRESS}`, SUNDAY);

    expect(result.cp).toBe('83170');
  });

  it('acepta un CP de 4 dígitos', () => {
    const address =
      'Calle: Blvd. Solidaridad 56, Col: Centro, Hermosillo, Sonora, Cp: 8317';
    const result = parseCacBlock(`CAC Hermosillo\n\n${address}`, SUNDAY);

    expect(result.cp).toBe('8317');
  });

  it('usa la fecha que escribió el operador', () => {
    const result = parseCacBlock(
      `CAC Hermosillo\n\n${ADDRESS}\n15/12/2026`,
      SUNDAY,
    );

    expect(result.fecha).toBe('15/12/2026');
    expect(result.fechaSource).toBe('input');
  });

  it('completa el año si la fecha viene sin año', () => {
    const result = parseCacBlock(`CAC Hermosillo\n\n${ADDRESS}\n15/12`, SUNDAY);

    expect(result.fecha).toBe('15/12/2026');
  });

  it('avisa si no encuentra el código postal', () => {
    const result = parseCacBlock(
      'CAC Hermosillo\n\nCalle: Blvd. Solidaridad 56, Col: El Sahuaro',
      SUNDAY,
    );

    expect(result.cp).toBe('');
    expect(result.warnings.join(' ')).toContain('código postal');
  });

  it('no confunde la línea de fecha con la dirección', () => {
    const result = parseCacBlock(
      `CAC Hermosillo\n\n${ADDRESS}\n03/11/2026`,
      SUNDAY,
    );

    expect(result.cp).toBe('83170');
    expect(result.fecha).toBe('03/11/2026');
  });
});

describe('formatCacBlock', () => {
  const ADDRESS =
    'Calle: Blvd. Solidaridad 56, Col: El Sahuaro, Hermosillo, Sonora, Cp: 83170';

  it('devuelve las tres líneas listas para pegar', () => {
    const result = formatCacBlock(`CAC Hermosillo\n\n${ADDRESS}`, SUNDAY);

    expect(result).toBe('CAC Hermosillo\n83170\n03/11/2026');
  });

  it('usa la fecha escrita si hay una', () => {
    const result = formatCacBlock(
      `CAC Hermosillo\n\n${ADDRESS}\n15/12/2026`,
      SUNDAY,
    );

    expect(result).toBe('CAC Hermosillo\n83170\n15/12/2026');
  });
});

describe('defaultFvcDate', () => {
  it('en un día de semana toma el día siguiente', () => {
    // lunes 02/11/2026 → martes 03/11/2026
    const result = defaultFvcDate(MONDAY);

    expect(result).toEqual({ day: 3, month: 11, year: 2026 });
  });

  it('en sábado salta un día extra (lunes)', () => {
    // sábado 10/07/2027 → lunes 12/07/2027
    const result = defaultFvcDate(SATURDAY);

    expect(result).toEqual({ day: 12, month: 7, year: 2027 });
  });

  it('en domingo salta un día extra (martes)', () => {
    // domingo 01/11/2026 → martes 03/11/2026
    const result = defaultFvcDate(SUNDAY);

    expect(result).toEqual({ day: 3, month: 11, year: 2026 });
  });

  it('cambia de año en diciembre', () => {
    const result = defaultFvcDate(new Date(2026, 11, 31));

    expect(result).toEqual({ day: 1, month: 1, year: 2027 });
  });
});

describe('parseDateValue', () => {
  it('interpreta dd/mm/yyyy', () => {
    expect(parseDateValue('03/11/2026', SUNDAY)).toEqual({
      day: 3,
      month: 11,
      year: 2026,
    });
  });

  it('interpreta dd/mm/yy', () => {
    expect(parseDateValue('03/11/26', SUNDAY)).toEqual({
      day: 3,
      month: 11,
      year: 2026,
    });
  });

  it('completa el año actual si viene dd/mm', () => {
    expect(parseDateValue('03/11', SUNDAY)).toEqual({
      day: 3,
      month: 11,
      year: 2026,
    });
  });

  it('rechaza una fecha que no existe', () => {
    expect(parseDateValue('31/02/2026', SUNDAY)).toBeNull();
  });

  it('rechaza un mes inválido', () => {
    expect(parseDateValue('03/13/2026', SUNDAY)).toBeNull();
  });

  it('rechaza un texto sin formato de fecha', () => {
    expect(parseDateValue('no es fecha', SUNDAY)).toBeNull();
  });
});
