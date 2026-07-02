import { describe, it, expect } from 'vitest';
import {
  isFieldEmpty,
  isPhoneFieldInvalid,
  getCleanProductName,
  validateRequiredData,
  getMissingFieldLabel,
  PRODUCT_TEMPLATES,
  FIELD_LABELS,
  PHONE_FIELDS,
  ALL_INPUT_FIELDS,
  PRODUCT_FIELDS,
  PRODUCT_REQUIRED_FIELDS,
} from '../popup.js';

// ESIM product set is the source of truth for esEsim gating in validateRequiredData.
// Mirrors the parser.js isEsimProduct() set; the test treats the popup.js contract
// as authoritative.
const ESIM_PRODUCTS = new Set(['POS_ESIM', 'LN_ESIM', 'PRE_ESIM']);

// Shared fixture builder. Returns an object that should make
// validateRequiredData(d, productKey) return { valid: true, missing: [] }
// for the given productKey. Per-field overrides are spread last so any test
// can introduce targeted defects (empty chatId, invalid eid, etc.) without
// rebuilding the whole object.
function validData(productKey, overrides = {}) {
  const base = {
    plan: 'Plan 100',
    nip: '1234',
    email: 'user@example.com',
    nombres: 'Juan',
    apellido1: 'Pérez',
    apellido2: 'García',
    genero: 'M',
    fecha: '01/01/1990',
    lugarNacimiento: 'CDMX',
    curp: 'PEGJ900101HDFRRN09',
    chatId: '123456789',
    dnChat: '+525512345678',
    dnPortar: '5511111111',
    dnAdicional: '5522222222',
    dnContacto: '5533333333',
    dnMovistar: '5544444444',
    nombreCAV: 'CAC Centro',
    cpCAC: '06000',
    fvc: '15/03/2026',
    calle: 'Av Reforma 100',
    numExt: '100',
    numInt: '',
    cpDireccion: '06600',
    colonia: 'Juárez',
    nombreTitular: 'Juan Pérez',
    eid: '12345',
    eidValid: true,
    esEsim: ESIM_PRODUCTS.has(productKey),
  };
  return { ...base, ...overrides };
}

// ─── Phase 2: Small Pure Functions ───────────────────────────────────────────

describe('isFieldEmpty', () => {
  it('returns true for empty string', () => {
    expect(isFieldEmpty('')).toBe(true);
  });

  it('returns true for null', () => {
    expect(isFieldEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isFieldEmpty(undefined)).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isFieldEmpty('   ')).toBe(true);
    expect(isFieldEmpty('\t\n')).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isFieldEmpty('hello')).toBe(false);
  });

  it('returns false for number 0', () => {
    // 0 is not undefined/null and String(0).trim() === '0', so not empty.
    expect(isFieldEmpty(0)).toBe(false);
  });

  it('returns false for non-empty object', () => {
    expect(isFieldEmpty({ key: 'value' })).toBe(false);
  });

  it('returns true for boolean false coerced to empty', () => {
    // String(false).trim() === 'false' — not empty.
    // This documents the current behavior; if it ever changes, tests will catch it.
    expect(isFieldEmpty(false)).toBe(false);
  });
});

describe('isPhoneFieldInvalid', () => {
  it('returns false for non-phone field names', () => {
    expect(isPhoneFieldInvalid('email', 'foo@bar.com')).toBe(false);
    expect(isPhoneFieldInvalid('plan', 'Plan 50')).toBe(false);
    expect(isPhoneFieldInvalid('nombres', 'Juan')).toBe(false);
    expect(isPhoneFieldInvalid('curp', 'ABCD123456')).toBe(false);
  });

  it('returns false for empty value on phone fields (validated elsewhere)', () => {
    expect(isPhoneFieldInvalid('dnPortar', '')).toBe(false);
    expect(isPhoneFieldInvalid('dnAdicional', null)).toBe(false);
    expect(isPhoneFieldInvalid('dnContacto', undefined)).toBe(false);
    expect(isPhoneFieldInvalid('dnMovistar', '   ')).toBe(false);
  });

  it('returns false for valid 10-digit phone', () => {
    expect(isPhoneFieldInvalid('dnPortar', '5512345678')).toBe(false);
    expect(isPhoneFieldInvalid('dnAdicional', '5587654321')).toBe(false);
    expect(isPhoneFieldInvalid('dnContacto', '5512345678')).toBe(false);
    expect(isPhoneFieldInvalid('dnMovistar', '5512345678')).toBe(false);
  });

  it('returns true for 9-digit phone (too short)', () => {
    expect(isPhoneFieldInvalid('dnPortar', '551234567')).toBe(true);
  });

  it('returns true for 11-digit phone (too long)', () => {
    expect(isPhoneFieldInvalid('dnPortar', '55123456789')).toBe(true);
  });

  it('returns true for phone whose digits-only length is not 10', () => {
    // The function strips non-digits before checking length, so a 10-digit
    // string with dashes is actually valid. We assert cases where stripping
    // leaves a non-10 length, plus the explicit "non-digit" intent.
    expect(isPhoneFieldInvalid('dnPortar', '55-123-4567')).toBe(true);   // 9 digits after strip
    expect(isPhoneFieldInvalid('dnPortar', '55i1234567')).toBe(true);    // 9 digits after strip
    expect(isPhoneFieldInvalid('dnPortar', 'abc123456')).toBe(true);     // 6 digits after strip
  });

  it('returns false for 10-digit value with formatting characters', () => {
    // Documents the contract: formatting (dashes, spaces, parens) is fine
    // as long as exactly 10 digits remain after stripping.
    expect(isPhoneFieldInvalid('dnPortar', '55-1234-5678')).toBe(false);
    expect(isPhoneFieldInvalid('dnPortar', '(55) 1234 5678')).toBe(false);
  });

  it('covers every entry in PHONE_FIELDS', () => {
    for (const field of PHONE_FIELDS) {
      expect(isPhoneFieldInvalid(field, '5512345678')).toBe(false);
      expect(isPhoneFieldInvalid(field, '55123')).toBe(true);
    }
  });
});

// ─── Phase 2: getCleanProductName ─────────────────────────────────────────────

describe('getCleanProductName', () => {
  it.each([
    ['POS_ESIM', 'Porta Pospago Esim'],
    ['POS_CAC', 'Porta Pospago'],
    ['LN_ESIM', 'Linea Nueva Esim'],
    ['LN_CAC', 'Linea Nueva'],
    ['PRE_ESIM', 'Línea Nueva Prepago Esim'],
    ['PREPAGO', 'Porta Prepago'],
    ['ADIC_CAC', 'Adición'],
  ])('maps %s to %s', (key, expected) => {
    expect(getCleanProductName(key)).toBe(expected);
  });

  it('returns the default "Porta Pospago" for unknown product keys', () => {
    expect(getCleanProductName('UNKNOWN_PRODUCT')).toBe('Porta Pospago');
    expect(getCleanProductName('')).toBe('Porta Pospago');
    expect(getCleanProductName(undefined)).toBe('Porta Pospago');
  });

  it('ignores the esEsim argument (signature accepts but does not use it)', () => {
    // The function signature is (productKey, esEsim) but the switch on
    // productKey alone determines the return. Document this contract.
    expect(getCleanProductName('POS_ESIM', true)).toBe('Porta Pospago Esim');
    expect(getCleanProductName('POS_ESIM', false)).toBe('Porta Pospago Esim');
    expect(getCleanProductName('POS_CAC', true)).toBe('Porta Pospago');
    expect(getCleanProductName('POS_CAC', false)).toBe('Porta Pospago');
  });
});

// ─── Phase 2: Constants Structure ────────────────────────────────────────────

describe('constants structure', () => {
  describe('FIELD_LABELS', () => {
    it('has an entry for dnSame', () => {
      expect(FIELD_LABELS).toHaveProperty('dnSame');
      expect(typeof FIELD_LABELS.dnSame).toBe('string');
      expect(FIELD_LABELS.dnSame.length).toBeGreaterThan(0);
    });

    it('has a label for every required field across all products', () => {
      // Invariant: if a field is required for any product, it must have a label,
      // otherwise getMissingFieldLabel() will return the field name as-is
      // (silent UX bug).
      const allRequired = new Set();
      for (const product of Object.keys(PRODUCT_REQUIRED_FIELDS)) {
        for (const field of PRODUCT_REQUIRED_FIELDS[product]) {
          allRequired.add(field);
        }
      }
      for (const field of allRequired) {
        expect(FIELD_LABELS, `FIELD_LABELS missing entry for "${field}"`).toHaveProperty(field);
        expect(typeof FIELD_LABELS[field]).toBe('string');
        expect(FIELD_LABELS[field].length, `FIELD_LABELS["${field}"] is empty`).toBeGreaterThan(0);
      }
    });
  });

  describe('PRODUCT_FIELDS', () => {
    it('has exactly 7 product entries', () => {
      expect(Object.keys(PRODUCT_FIELDS)).toHaveLength(7);
    });

    it('contains every product key (POS_ESIM, POS_CAC, LN_ESIM, LN_CAC, PRE_ESIM, PREPAGO, ADIC_CAC)', () => {
      const expected = ['POS_ESIM', 'POS_CAC', 'LN_ESIM', 'LN_CAC', 'PRE_ESIM', 'PREPAGO', 'ADIC_CAC'];
      for (const key of expected) {
        expect(PRODUCT_FIELDS).toHaveProperty(key);
        expect(Array.isArray(PRODUCT_FIELDS[key])).toBe(true);
        expect(PRODUCT_FIELDS[key].length).toBeGreaterThan(0);
      }
    });

    it('every value is a subset of ALL_INPUT_FIELDS', () => {
      const allSet = new Set(ALL_INPUT_FIELDS);
      for (const product of Object.keys(PRODUCT_FIELDS)) {
        for (const field of PRODUCT_FIELDS[product]) {
          expect(allSet.has(field), `${product} has field "${field}" not in ALL_INPUT_FIELDS`).toBe(true);
        }
      }
    });
  });

  describe('PRODUCT_REQUIRED_FIELDS', () => {
    it('has the same 7 product keys as PRODUCT_FIELDS', () => {
      expect(Object.keys(PRODUCT_REQUIRED_FIELDS).sort()).toEqual(
        Object.keys(PRODUCT_FIELDS).sort()
      );
    });

    it('includes dnPortar and dnAdicional only for portability products (POS_ESIM, POS_CAC, PREPAGO)', () => {
      const portability = ['POS_ESIM', 'POS_CAC', 'PREPAGO'];
      const nonPortability = ['LN_ESIM', 'LN_CAC', 'PRE_ESIM', 'ADIC_CAC'];

      for (const key of portability) {
        expect(PRODUCT_REQUIRED_FIELDS[key]).toContain('dnPortar');
        expect(PRODUCT_REQUIRED_FIELDS[key]).toContain('dnAdicional');
      }

      for (const key of nonPortability) {
        expect(PRODUCT_REQUIRED_FIELDS[key], `${key} should NOT require dnPortar`).not.toContain('dnPortar');
        expect(PRODUCT_REQUIRED_FIELDS[key], `${key} should NOT require dnAdicional`).not.toContain('dnAdicional');
      }
    });

    it('lists eid for the 5 eid-capable products (POS_ESIM, POS_CAC, LN_ESIM, LN_CAC, PRE_ESIM)', () => {
      // eid is listed in PRODUCT_REQUIRED_FIELDS for any product that may
      // require it, and validateRequiredData gates the actual check on
      // d.esEsim. The 2 eid-free products (PREPAGO, ADIC_CAC) are
      // hardware-bound (CAC only) and never have an EID.
      const withEid = ['POS_ESIM', 'POS_CAC', 'LN_ESIM', 'LN_CAC', 'PRE_ESIM'];
      const withoutEid = ['PREPAGO', 'ADIC_CAC'];

      for (const key of withEid) {
        expect(PRODUCT_REQUIRED_FIELDS[key], `${key} should list eid`).toContain('eid');
      }
      for (const key of withoutEid) {
        expect(PRODUCT_REQUIRED_FIELDS[key], `${key} should NOT list eid`).not.toContain('eid');
      }
    });

    it('every required field is present in FIELD_LABELS (invariant check)', () => {
      // This is the reverse-direction check on the FIELD_LABELS invariant.
      for (const product of Object.keys(PRODUCT_REQUIRED_FIELDS)) {
        for (const field of PRODUCT_REQUIRED_FIELDS[product]) {
          expect(FIELD_LABELS, `${product} requires "${field}" but no label exists`).toHaveProperty(field);
        }
      }
    });
  });

  describe('PHONE_FIELDS', () => {
    it('has exactly 4 entries', () => {
      expect(PHONE_FIELDS).toHaveLength(4);
    });

    it('contains dnPortar, dnAdicional, dnContacto, dnMovistar', () => {
      expect(PHONE_FIELDS).toEqual(
        expect.arrayContaining(['dnPortar', 'dnAdicional', 'dnContacto', 'dnMovistar'])
      );
    });
  });

  describe('ALL_INPUT_FIELDS', () => {
    it('contains all UI input groups (plan, linea, curp, direccion, cac, chat-id, chat-dn, eid)', () => {
      expect(ALL_INPUT_FIELDS).toEqual(
        expect.arrayContaining(['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn', 'eid'])
      );
    });
  });
});

// ─── Phase 3: Core Validation (PR 2) ────────────────────────────────────────

describe('validateRequiredData', () => {
  describe('happy path (3.1)', () => {
    it.each([
      'POS_ESIM',
      'POS_CAC',
      'LN_ESIM',
      'LN_CAC',
      'PRE_ESIM',
      'PREPAGO',
      'ADIC_CAC',
    ])('%s with full fixture returns { valid: true, missing: [] }', (productKey) => {
      const result = validateRequiredData(validData(productKey), productKey);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('dnSame rule (3.2)', () => {
    it('POS_ESIM with equal dnPortar and dnAdicional → missing includes dnSame', () => {
      const data = validData('POS_ESIM', {
        dnPortar: '5511111111',
        dnAdicional: '5511111111',
      });
      const result = validateRequiredData(data, 'POS_ESIM');
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('dnSame');
    });

    it('POS_CAC with equal dnPortar and dnAdicional → missing includes dnSame', () => {
      const data = validData('POS_CAC', {
        dnPortar: '5511111111',
        dnAdicional: '5511111111',
      });
      const result = validateRequiredData(data, 'POS_CAC');
      expect(result.missing).toContain('dnSame');
    });

    it('PREPAGO with equal dnPortar and dnAdicional → missing includes dnSame', () => {
      const data = validData('PREPAGO', {
        dnPortar: '5511111111',
        dnAdicional: '5511111111',
      });
      const result = validateRequiredData(data, 'PREPAGO');
      expect(result.missing).toContain('dnSame');
    });

    it('non-portability products (LN_ESIM) do not push dnSame even if phones are equal', () => {
      // LN_ESIM requires dnContacto (not dnPortar/dnAdicional), so the
      // dnSame branch is structurally unreachable.
      const data = validData('LN_ESIM', {
        dnPortar: '5511111111',
        dnAdicional: '5511111111',
      });
      const result = validateRequiredData(data, 'LN_ESIM');
      expect(result.missing).not.toContain('dnSame');
    });

    it('ADIC_CAC does not push dnSame even with matching dnMovistar/dnContacto', () => {
      const data = validData('ADIC_CAC', {
        dnMovistar: '5511111111',
        dnContacto: '5511111111',
      });
      const result = validateRequiredData(data, 'ADIC_CAC');
      expect(result.missing).not.toContain('dnSame');
    });

    it('empty phones do not trigger dnSame (POS_ESIM with empty dnAdicional)', () => {
      const data = validData('POS_ESIM', { dnAdicional: '' });
      const result = validateRequiredData(data, 'POS_ESIM');
      expect(result.missing).not.toContain('dnSame');
    });

    it('happy path: POS_ESIM with distinct dnPortar and dnAdicional → no dnSame', () => {
      const data = validData('POS_ESIM', {
        dnPortar: '5511111111',
        dnAdicional: '5522222222',
      });
      const result = validateRequiredData(data, 'POS_ESIM');
      expect(result.missing).not.toContain('dnSame');
    });
  });

  describe('eid gating (3.3)', () => {
    it('POS_ESIM (esEsim=true) without eid → missing includes eid', () => {
      const data = validData('POS_ESIM', { eid: '', eidValid: true });
      const result = validateRequiredData(data, 'POS_ESIM');
      expect(result.missing).toContain('eid');
    });

    it('POS_ESIM (esEsim=true) with invalid eid (eidValid=false) → missing includes eid', () => {
      const data = validData('POS_ESIM', { eid: '1234', eidValid: false });
      const result = validateRequiredData(data, 'POS_ESIM');
      expect(result.missing).toContain('eid');
    });

    it('POS_ESIM (esEsim=true) with valid eid → eid is not in missing', () => {
      const data = validData('POS_ESIM', { eid: '12345', eidValid: true });
      const result = validateRequiredData(data, 'POS_ESIM');
      expect(result.missing).not.toContain('eid');
    });

    it('POS_CAC (esEsim=false) does not push eid even with empty eid (eid in list, gated by esEsim)', () => {
      // POS_CAC's required list still includes 'eid' (historical), but the
      // validation function short-circuits with `if (!d.esEsim) return;`.
      const data = validData('POS_CAC', { eid: '', eidValid: false });
      const result = validateRequiredData(data, 'POS_CAC');
      expect(result.missing).not.toContain('eid');
    });

    it('LN_CAC (esEsim=false) does not push eid even with invalid eid', () => {
      const data = validData('LN_CAC', { eid: '12', eidValid: false });
      const result = validateRequiredData(data, 'LN_CAC');
      expect(result.missing).not.toContain('eid');
    });

    it('PREPAGO (eid not in required list) does not push eid', () => {
      const data = validData('PREPAGO', { eid: '', eidValid: false });
      const result = validateRequiredData(data, 'PREPAGO');
      expect(result.missing).not.toContain('eid');
    });

    it('ADIC_CAC (eid not in required list) does not push eid', () => {
      const data = validData('ADIC_CAC', { eid: '', eidValid: false });
      const result = validateRequiredData(data, 'ADIC_CAC');
      expect(result.missing).not.toContain('eid');
    });
  });

  describe('chatId, dnChat, email rules (3.4)', () => {
    describe('chatId (must be exactly 9 digits)', () => {
      it('9 digits → valid (not in missing)', () => {
        const data = validData('POS_ESIM', { chatId: '123456789' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).not.toContain('chatId');
      });

      it('8 digits → missing', () => {
        const data = validData('POS_ESIM', { chatId: '12345678' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('chatId');
      });

      it('10 digits → missing', () => {
        const data = validData('POS_ESIM', { chatId: '1234567890' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('chatId');
      });

      it('letters mixed with digits → missing', () => {
        const data = validData('POS_ESIM', { chatId: 'CHAT1234' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('chatId');
      });

      it('empty string → missing', () => {
        const data = validData('POS_ESIM', { chatId: '' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('chatId');
      });
    });

    describe('dnChat (must start with +)', () => {
      it('starts with + → valid (not in missing)', () => {
        const data = validData('POS_ESIM', { dnChat: '+525512345678' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).not.toContain('dnChat');
      });

      it('does not start with + → missing', () => {
        const data = validData('POS_ESIM', { dnChat: '5512345678' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('dnChat');
      });

      it('empty string → missing', () => {
        const data = validData('POS_ESIM', { dnChat: '' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('dnChat');
      });
    });

    describe('email (must not end with ...)', () => {
      it('plain email → valid (not in missing)', () => {
        const data = validData('POS_ESIM', { email: 'user@example.com' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).not.toContain('email');
      });

      it('ends with ... → missing', () => {
        const data = validData('POS_ESIM', { email: 'user@example...' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('email');
      });

      it('empty string → missing', () => {
        const data = validData('POS_ESIM', { email: '' });
        const result = validateRequiredData(data, 'POS_ESIM');
        expect(result.missing).toContain('email');
      });
    });
  });
});

describe('getMissingFieldLabel', () => {
  it('returns dedicated label for dnSame (contains "distintos")', () => {
    const label = getMissingFieldLabel('dnSame', {});
    expect(label).toBe(FIELD_LABELS.dnSame);
    expect(label).toContain('distintos');
  });

  it('chatId non-empty + wrong format → appends (debe tener exactamente 9 números)', () => {
    const d = { chatId: '12345' }; // 5 digits, non-empty
    const label = getMissingFieldLabel('chatId', d);
    expect(label).toBe(`${FIELD_LABELS.chatId} (debe tener exactamente 9 números)`);
  });

  it('chatId empty → returns plain label (no contextual hint)', () => {
    const d = { chatId: '' };
    const label = getMissingFieldLabel('chatId', d);
    expect(label).toBe(FIELD_LABELS.chatId);
    expect(label).not.toContain('9 números');
  });

  it('dnChat non-empty + no + → appends (debe empezar con "+")', () => {
    const d = { dnChat: '5512345678' };
    const label = getMissingFieldLabel('dnChat', d);
    expect(label).toBe(`${FIELD_LABELS.dnChat} (debe empezar con "+")`);
  });

  it('dnChat empty → returns plain label (no contextual hint)', () => {
    const d = { dnChat: '' };
    const label = getMissingFieldLabel('dnChat', d);
    expect(label).toBe(FIELD_LABELS.dnChat);
  });

  it('email ending in ... → appends (no debe terminar en "...")', () => {
    const d = { email: 'user@example...' };
    const label = getMissingFieldLabel('email', d);
    expect(label).toBe(`${FIELD_LABELS.email} (no debe terminar en "...")`);
  });

  it('email empty → returns plain label (no contextual hint)', () => {
    const d = { email: '' };
    const label = getMissingFieldLabel('email', d);
    expect(label).toBe(FIELD_LABELS.email);
  });

  it('phone field non-empty + invalid → appends (debe tener 10 dígitos)', () => {
    const d = { dnPortar: '55123' }; // 5 digits
    const label = getMissingFieldLabel('dnPortar', d);
    expect(label).toBe(`${FIELD_LABELS.dnPortar} (debe tener 10 dígitos)`);
  });

  it('phone field empty → returns plain label (no contextual hint)', () => {
    const d = { dnPortar: '' };
    const label = getMissingFieldLabel('dnPortar', d);
    expect(label).toBe(FIELD_LABELS.dnPortar);
  });

  it('eid non-empty + !eidValid → returns "EID (debe tener 5 dígitos)"', () => {
    const d = { eid: '1234', eidValid: false };
    const label = getMissingFieldLabel('eid', d);
    expect(label).toBe('EID (debe tener 5 dígitos)');
  });

  it('eid empty → returns plain label (no contextual hint)', () => {
    const d = { eid: '' };
    const label = getMissingFieldLabel('eid', d);
    expect(label).toBe(FIELD_LABELS.eid);
  });

  it('unknown field returns the field name itself (no FIELD_LABELS entry)', () => {
    expect(getMissingFieldLabel('xyz', {})).toBe('xyz');
    expect(getMissingFieldLabel('notARealField', { notARealField: 'foo' })).toBe('notARealField');
  });
});
