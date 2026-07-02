import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cleanPhone,
  isEsimProduct,
  formatDnChat,
  parseChatField,
  parseLineaField,
  parseCacField,
  parseDireccionField,
  parseData,
} from '../parser.js';

// Year completed at parse time uses `new Date().getFullYear()` (see parser.js).
// Centralize fake timers at file top so every FVC assertion — both inside
// the parseCacField describe block AND the parseData tests at lines ~450/521 —
// runs against a deterministic clock. Pinned mid-year so calendar boundaries
// (Dec 31 → Jan 1) are clearly observable in dedicated edge-case tests.
const CURRENT_YEAR = 2026;
const FROZEN_NOW = new Date(CURRENT_YEAR, 6, 15); // 2026-07-15 local time

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Phase 3: Utility Function Tests ──────────────────────────────────────────

describe('cleanPhone', () => {
  it('strips non-digits and country prefix from formatted number', () => {
    expect(cleanPhone('52 55 1234 5678')).toBe('5512345678');
  });

  it('passes through already-clean 10-digit number', () => {
    expect(cleanPhone('5512345678')).toBe('5512345678');
  });

  it('returns empty string for empty input', () => {
    expect(cleanPhone('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    expect(cleanPhone(null)).toBe('');
    expect(cleanPhone(undefined)).toBe('');
  });

  it('strips special characters', () => {
    expect(cleanPhone('(55) 1234-5678')).toBe('5512345678');
  });

  it('strips country prefix 52 when result is longer than 10 digits', () => {
    expect(cleanPhone('525512345678')).toBe('5512345678');
  });

  it('does not strip 52 if the number is exactly 10 digits starting with 52', () => {
    // "5212345678" is 10 digits — length is NOT > 10, so prefix stays
    expect(cleanPhone('5212345678')).toBe('5212345678');
  });
});

describe('isEsimProduct', () => {
  it.each(['POS_ESIM', 'LN_ESIM', 'PRE_ESIM'])('returns true for %s', (key) => {
    expect(isEsimProduct(key)).toBe(true);
  });

  it.each(['POS_CAC', 'PREPAGO', 'LN_CAC', 'ADIC_CAC'])('returns false for %s', (key) => {
    expect(isEsimProduct(key)).toBe(false);
  });
});

describe('formatDnChat', () => {
  it('normalizes 10-digit number to +52 prefix', () => {
    expect(formatDnChat('5512345678')).toBe('+525512345678');
  });

  it('passes through already-prefixed +52 input', () => {
    expect(formatDnChat('+525512345678')).toBe('+525512345678');
  });

  it('returns empty string for empty input', () => {
    expect(formatDnChat('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    expect(formatDnChat(null)).toBe('');
    expect(formatDnChat(undefined)).toBe('');
  });

  it('handles short input by prepending +52', () => {
    expect(formatDnChat('12345')).toBe('+5212345');
  });

  it('handles 12-digit input starting with 52', () => {
    expect(formatDnChat('525512345678')).toBe('+525512345678');
  });

  it('trims whitespace before processing', () => {
    expect(formatDnChat('  5512345678  ')).toBe('+525512345678');
  });

  it('returns trimmed input as-is when it starts with + but not +52', () => {
    expect(formatDnChat('+1-555-1234')).toBe('+1-555-1234');
  });
});

describe('parseChatField', () => {
  it('extracts chatId, dnChat, and eid from 3-line textarea (ESIM product)', () => {
    const result = parseChatField('CHAT123\n5512345678\n12345', 'POS_ESIM');
    expect(result).toEqual({
      chatId: 'CHAT123',
      dnChat: '+525512345678',
      eid: '12345',
      eidValid: true,
    });
  });

  it('does not extract eid for non-ESIM product', () => {
    const result = parseChatField('CHAT123\n5512345678\n12345', 'POS_CAC');
    expect(result).toEqual({
      chatId: 'CHAT123',
      dnChat: '+525512345678',
      eid: '',
      eidValid: true,
    });
  });

  it('handles partial input — 1 line only', () => {
    const result = parseChatField('CHAT123', 'POS_ESIM');
    expect(result).toEqual({
      chatId: 'CHAT123',
      dnChat: '',
      eid: '',
      eidValid: true,
    });
  });

  it('handles partial input — 2 lines', () => {
    const result = parseChatField('CHAT123\n5512345678', 'LN_ESIM');
    expect(result).toEqual({
      chatId: 'CHAT123',
      dnChat: '+525512345678',
      eid: '',
      eidValid: true,
    });
  });

  it('marks eidValid as false for invalid EID (not 5 digits)', () => {
    const result = parseChatField('CHAT123\n5512345678\n123', 'PRE_ESIM');
    expect(result.eid).toBe('123');
    expect(result.eidValid).toBe(false);
  });

  it('handles empty input', () => {
    const result = parseChatField('', 'POS_ESIM');
    expect(result).toEqual({
      chatId: '',
      dnChat: '',
      eid: '',
      eidValid: true,
    });
  });

  it('strips non-digits from EID line', () => {
    const result = parseChatField('CHAT123\n5512345678\nEID: 98765', 'POS_ESIM');
    expect(result.eid).toBe('98765');
    expect(result.eidValid).toBe(true);
  });
});

// ─── Phase 4: Heuristic Parser Tests ──────────────────────────────────────────

describe('parseLineaField', () => {
  describe('phone mapping per product', () => {
    it('POS_ESIM: maps phones to dnPortar and dnAdicional', () => {
      const result = parseLineaField('5512345678\n5587654321', 'POS_ESIM');
      expect(result.dnPortar).toBe('5512345678');
      expect(result.dnAdicional).toBe('5587654321');
      expect(result.dnContacto).toBe('5587654321'); // duplicated for compat
    });

    it('POS_CAC: same mapping as POS_ESIM', () => {
      const result = parseLineaField('5512345678\n5587654321', 'POS_CAC');
      expect(result.dnPortar).toBe('5512345678');
      expect(result.dnAdicional).toBe('5587654321');
    });

    it('PREPAGO: same mapping as POS_ESIM', () => {
      const result = parseLineaField('5512345678\n5587654321', 'PREPAGO');
      expect(result.dnPortar).toBe('5512345678');
      expect(result.dnAdicional).toBe('5587654321');
    });

    it('LN_ESIM: maps first phone to dnContacto only', () => {
      const result = parseLineaField('5512345678', 'LN_ESIM');
      expect(result.dnContacto).toBe('5512345678');
      expect(result.dnPortar).toBe('');
      expect(result.dnAdicional).toBe('');
    });

    it('LN_CAC: maps first phone to dnContacto only', () => {
      const result = parseLineaField('5512345678', 'LN_CAC');
      expect(result.dnContacto).toBe('5512345678');
    });

    it('PRE_ESIM: maps first phone to dnContacto only', () => {
      const result = parseLineaField('5512345678', 'PRE_ESIM');
      expect(result.dnContacto).toBe('5512345678');
    });

    it('ADIC_CAC: maps phones to dnMovistar and dnContacto', () => {
      const result = parseLineaField('5512345678\n5587654321', 'ADIC_CAC');
      expect(result.dnMovistar).toBe('5512345678');
      expect(result.dnContacto).toBe('5587654321');
      expect(result.dnPortar).toBe('');
    });
  });

  it('detects email by @ character', () => {
    const result = parseLineaField('test@example.com\n5512345678', 'POS_ESIM');
    expect(result.email).toBe('test@example.com');
  });

  it('lowercases email', () => {
    const result = parseLineaField('Test@Example.COM', 'LN_ESIM');
    expect(result.email).toBe('test@example.com');
  });

  it('extracts NIP (exactly 4 digits)', () => {
    const result = parseLineaField('5512345678\n1234', 'POS_ESIM');
    expect(result.nip).toBe('1234');
  });

  it('handles single phone for portabilidad product', () => {
    const result = parseLineaField('5512345678', 'POS_ESIM');
    expect(result.dnPortar).toBe('5512345678');
    expect(result.dnAdicional).toBe('');
  });

  it('extracts nombreTitular from free text for ADIC_CAC', () => {
    const result = parseLineaField('5512345678\n5587654321\nJuan Perez', 'ADIC_CAC');
    expect(result.nombreTitular).toBe('Juan Perez');
  });

  it('does not set nombreTitular for non-ADIC_CAC products', () => {
    const result = parseLineaField('5512345678\nSome Text', 'POS_ESIM');
    expect(result.nombreTitular).toBe('');
  });

  it('handles empty input', () => {
    const result = parseLineaField('', 'POS_ESIM');
    expect(result.email).toBe('');
    expect(result.nip).toBe('');
    expect(result.dnPortar).toBe('');
  });

  it('handles full data: phone, email, NIP', () => {
    const result = parseLineaField(
      '5512345678\n5587654321\nuser@mail.com\n4321',
      'POS_CAC',
    );
    expect(result.dnPortar).toBe('5512345678');
    expect(result.dnAdicional).toBe('5587654321');
    expect(result.email).toBe('user@mail.com');
    expect(result.nip).toBe('4321');
  });
});

describe('parseCacField', () => {
  it('parses 3-line input: CAC name, CP, FVC', () => {
    const result = parseCacField('CAC Norte\n06600\n15/06');
    expect(result).toEqual({
      nombreCAV: 'CAC Norte',
      cpCAC: '06600',
      fvc: `15/06/${CURRENT_YEAR}`,
    });
  });

  it('completes year for dd/mm format with current year', () => {
    const result = parseCacField('CAC\n06600\n01/12');
    expect(result.fvc).toBe(`01/12/${CURRENT_YEAR}`);
  });

  it('does not modify FVC if already has year', () => {
    const result = parseCacField('CAC\n06600\n15/06/2025');
    expect(result.fvc).toBe('15/06/2025');
  });

  it('handles 1-line input (only CAC name)', () => {
    const result = parseCacField('CAC Norte');
    expect(result).toEqual({
      nombreCAV: 'CAC Norte',
      cpCAC: '',
      fvc: '',
    });
  });

  it('handles 2-line input (CAC name + CP)', () => {
    const result = parseCacField('CAC Norte\n06600');
    expect(result).toEqual({
      nombreCAV: 'CAC Norte',
      cpCAC: '06600',
      fvc: '',
    });
  });

  it('handles empty input', () => {
    const result = parseCacField('');
    expect(result).toEqual({
      nombreCAV: '',
      cpCAC: '',
      fvc: '',
    });
  });

  it('handles single-digit day/month in FVC', () => {
    const result = parseCacField('CAC\n06600\n5/3');
    expect(result.fvc).toBe(`5/3/${CURRENT_YEAR}`);
  });

  // ── Edge cases: year source is `new Date().getFullYear()` ────────────────
  // These tests override the file-level fake timer set in beforeEach so they
  // can probe the Dec 31 → Jan 1 boundary explicitly. afterEach restores real
  // timers; the next beforeEach will reset to FROZEN_NOW.

  it('rolls over to new year on Jan 1 boundary', () => {
    // Last second of 2026
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    expect(parseCacField('CAC\n06600\n25/12').fvc).toBe('25/12/2026');

    // First second of 2027
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 1));
    expect(parseCacField('CAC\n06600\n15/03').fvc).toBe('15/03/2027');
  });

  it('does not modify FVC if year already present', () => {
    // Even if the system clock is in 2030, a pre-completed year must pass through.
    vi.setSystemTime(new Date(2030, 5, 1));
    expect(parseCacField('CAC\n06600\n15/03/2027').fvc).toBe('15/03/2027');
  });

  it('does not modify FVC with invalid format (15-03)', () => {
    // Hyphen-separated dates do not match the dd/mm regex, so the line is kept as-is.
    expect(parseCacField('CAC\n06600\n15-03').fvc).toBe('15-03');
  });
});

describe('parseDireccionField', () => {
  it('parses 4-line address: street/numExt/cp/colonia', () => {
    const result = parseDireccionField('Reforma\n123\n06600\nCentro');
    expect(result).toEqual({
      calle: 'Reforma',
      numExt: '123',
      numInt: '',
      cpDireccion: '06600',
      colonia: 'Centro',
    });
  });

  it('parses 5-line address with numExt and numInt', () => {
    const result = parseDireccionField('Reforma\n123\n45-B\n06600\nCentro');
    expect(result).toEqual({
      calle: 'Reforma',
      numExt: '123',
      numInt: '45-B',
      cpDireccion: '06600',
      colonia: 'Centro',
    });
  });

  it('parses 3-line address: street/cp/colonia', () => {
    const result = parseDireccionField('Reforma\n06600\nCentro');
    expect(result).toEqual({
      calle: 'Reforma',
      numExt: '',
      numInt: '',
      cpDireccion: '06600',
      colonia: 'Centro',
    });
  });

  it('parses 2-line address: street/colonia', () => {
    const result = parseDireccionField('Reforma\nCentro');
    expect(result).toEqual({
      calle: 'Reforma',
      numExt: '',
      numInt: '',
      cpDireccion: '',
      colonia: 'Centro',
    });
  });

  it('parses 1-line address: street only', () => {
    const result = parseDireccionField('Reforma');
    expect(result).toEqual({
      calle: 'Reforma',
      numExt: '',
      numInt: '',
      cpDireccion: '',
      colonia: '',
    });
  });

  it('returns all empty strings for empty input', () => {
    const result = parseDireccionField('');
    expect(result).toEqual({
      calle: '',
      numExt: '',
      numInt: '',
      cpDireccion: '',
      colonia: '',
    });
  });
});

describe('parseData', () => {
  it('fieldOverrides: plan takes priority over heuristic', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {
      plan: 'Plan Max',
    });
    expect(result.plan).toBe('Plan Max');
  });

  it('fieldOverrides: eid takes priority and validates', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {
      eid: '12345',
    });
    expect(result.eid).toBe('12345');
    expect(result.eidValid).toBe(true);
  });

  it('fieldOverrides: invalid eid is flagged', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {
      eid: '123',
    });
    expect(result.eid).toBe('123');
    expect(result.eidValid).toBe(false);
  });

  it('fieldOverrides: chatId and dnChat override', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {
      chatId: 'LEAD-999',
      dnChat: '5512345678',
    });
    expect(result.chatId).toBe('LEAD-999');
    expect(result.dnChat).toBe('+525512345678');
  });

  it('extracts regex labels from raw text', () => {
    const raw =
      'Nombre(s): Juan\nPrimer apellido: Perez\nCURP: PEJJ900101HDF\nFecha de nacimiento: 01/01/1990\nSexo: M\nEntidad de nacimiento: CDMX';
    const result = parseData(raw, 'LN_ESIM', '', '', '', {});
    expect(result.nombres).toBe('Juan');
    expect(result.apellido1).toBe('Perez');
    expect(result.curp).toBe('PEJJ900101HDF');
    expect(result.fecha).toBe('01/01/1990');
    expect(result.genero).toBe('M');
    expect(result.lugarNacimiento).toBe('CDMX');
  });

  it('builds nombreCompleto from parts when not provided directly', () => {
    const raw = 'Nombre(s): Ana\nPrimer apellido: Lopez\nSegundo apellido: Ruiz';
    const result = parseData(raw, 'POS_CAC', '', '', '', {});
    expect(result.nombreCompleto).toBe('ANA LOPEZ RUIZ');
  });

  it('uppercases CURP', () => {
    const raw = 'CURP: pejj900101hdf';
    const result = parseData(raw, 'POS_ESIM', '', '', '', {});
    expect(result.curp).toBe('PEJJ900101HDF');
  });

  it('sets esEsim true for ESIM products', () => {
    expect(parseData('', 'POS_ESIM', '', '', '', {}).esEsim).toBe(true);
    expect(parseData('', 'LN_ESIM', '', '', '', {}).esEsim).toBe(true);
    expect(parseData('', 'PRE_ESIM', '', '', '', {}).esEsim).toBe(true);
  });

  it('sets esEsim false for non-ESIM products', () => {
    expect(parseData('', 'POS_CAC', '', '', '', {}).esEsim).toBe(false);
    expect(parseData('', 'PREPAGO', '', '', '', {}).esEsim).toBe(false);
    expect(parseData('', 'LN_CAC', '', '', '', {}).esEsim).toBe(false);
    expect(parseData('', 'ADIC_CAC', '', '', '', {}).esEsim).toBe(false);
  });

  it('sets esCAC true when nombreCAV is present', () => {
    const result = parseData('', 'POS_CAC', '', 'CAC Norte\n06600\n15/06', '', {});
    expect(result.esCAC).toBe(true);
    expect(result.nombreCAV).toBe('CAC Norte');
    expect(result.cpCAC).toBe('06600');
    expect(result.fvc).toBe(`15/06/${CURRENT_YEAR}`);
  });

  it('sets esCAC false when no CAC data', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {});
    expect(result.esCAC).toBe(false);
  });

  it('integrates lineaRawText for phone parsing', () => {
    const result = parseData('', 'POS_ESIM', '5512345678\n5587654321\nuser@test.com\n4321', '', '', {});
    expect(result.dnPortar).toBe('5512345678');
    expect(result.dnAdicional).toBe('5587654321');
    expect(result.email).toBe('user@test.com');
    expect(result.nip).toBe('4321');
  });

  it('integrates direccionRawText for address parsing', () => {
    const result = parseData('', 'LN_CAC', '', '', 'Reforma\n123\n06600\nCentro', {});
    expect(result.calle).toBe('Reforma');
    expect(result.numExt).toBe('123');
    expect(result.cpDireccion).toBe('06600');
    expect(result.colonia).toBe('Centro');
  });

  it('empty optional fields default to empty string', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {});
    expect(result.nombres).toBe('');
    expect(result.apellido1).toBe('');
    expect(result.apellido2).toBe('');
    expect(result.nombreCompleto).toBe('');
    expect(result.email).toBe('');
    expect(result.dnPortar).toBe('');
    expect(result.dnAdicional).toBe('');
    expect(result.dnContacto).toBe('');
    expect(result.dnMovistar).toBe('');
    expect(result.calle).toBe('');
    expect(result.numExt).toBe('');
    expect(result.numInt).toBe('');
    expect(result.cpDireccion).toBe('');
    expect(result.colonia).toBe('');
    expect(result.curp).toBe('');
    expect(result.fecha).toBe('');
    expect(result.genero).toBe('');
    expect(result.lugarNacimiento).toBe('');
    expect(result.chatId).toBe('');
    expect(result.dnChat).toBe('');
    expect(result.eid).toBe('');
    expect(result.fvc).toBe('');
    expect(result.nombreCAV).toBe('');
    expect(result.plan).toBe('');
    expect(result.nip).toBe('');
    expect(result.nombreTitular).toBe('');
  });

  it('representative data for ADIC_CAC product', () => {
    const result = parseData(
      'Nombre(s): Maria\nPrimer apellido: Garcia',
      'ADIC_CAC',
      '5512345678\n5587654321\nTitular Name',
      'CAC Sur\n12345\n20/12',
      '',
      { plan: 'Plan Adicional', chatId: 'LEAD-500', dnChat: '5599999999' },
    );
    expect(result.plan).toBe('Plan Adicional');
    expect(result.chatId).toBe('LEAD-500');
    expect(result.dnChat).toBe('+525599999999');
    expect(result.dnMovistar).toBe('5512345678');
    expect(result.dnContacto).toBe('5587654321');
    expect(result.nombreTitular).toBe('Titular Name');
    expect(result.nombreCAV).toBe('CAC Sur');
    expect(result.cpCAC).toBe('12345');
    expect(result.fvc).toBe(`20/12/${CURRENT_YEAR}`);
    expect(result.esEsim).toBe(false);
    expect(result.esCAC).toBe(true);
  });

  it('representative data for PREPAGO product', () => {
    const result = parseData(
      '',
      'PREPAGO',
      '5512345678\n5587654321\nuser@test.com\n9876',
      'CAC Centro\n06600\n01/06',
      '',
      { chatId: 'LEAD-PREP' },
    );
    expect(result.dnPortar).toBe('5512345678');
    expect(result.dnAdicional).toBe('5587654321');
    expect(result.email).toBe('user@test.com');
    expect(result.nip).toBe('9876');
    expect(result.chatId).toBe('LEAD-PREP');
    expect(result.esEsim).toBe(false);
    expect(result.esCAC).toBe(true);
  });

  it('dnChat fallback uses regex extraction when no override', () => {
    const raw = 'DN CON EL QUE SE COMUNICA: 5512345678';
    const result = parseData(raw, 'POS_ESIM', '', '', '', {});
    expect(result.dnChat).toBe('+525512345678');
  });

  it('eid strips non-digits from override', () => {
    const result = parseData('', 'POS_ESIM', '', '', '', {
      eid: 'EI12345',
    });
    expect(result.eid).toBe('12345');
    expect(result.eidValid).toBe(true);
  });
});
