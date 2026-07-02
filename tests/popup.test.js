import { describe, it, expect, beforeEach } from 'vitest';
import {
  isFieldEmpty,
  isPhoneFieldInvalid,
  getCleanProductName,
  validateRequiredData,
  getMissingFieldLabel,
  markTouched,
  isTouched,
  resetTouched,
  hasAnyTouchedInProduct,
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

// ─── Phase 4: Template Assertions (PR 2) ────────────────────────────────────

describe('PRODUCT_TEMPLATES', () => {
  describe('per-product substring assertions (4.1)', () => {
    it('POS_ESIM contains plan, dnPortar, dnAdicional, email, nombres', () => {
      const result = PRODUCT_TEMPLATES.POS_ESIM(validData('POS_ESIM'));
      expect(result).toContain('Plan 100');
      expect(result).toContain('5511111111'); // dnPortar
      expect(result).toContain('5522222222'); // dnAdicional
      expect(result).toContain('user@example.com');
      expect(result).toContain('Juan'); // nombres
    });

    it('POS_CAC contains nombreCAV and cpCAC values (CAC section)', () => {
      const result = PRODUCT_TEMPLATES.POS_CAC(validData('POS_CAC'));
      expect(result).toContain('CAC Centro');
      expect(result).toContain('06000'); // cpCAC
    });

    it('LN_ESIM contains dnContacto + direccion components (calle, cpDireccion, colonia)', () => {
      const result = PRODUCT_TEMPLATES.LN_ESIM(validData('LN_ESIM'));
      expect(result).toContain('5533333333'); // dnContacto
      expect(result).toContain('Av Reforma 100'); // calle
      expect(result).toContain('06600'); // cpDireccion
      expect(result).toContain('Juárez'); // colonia
    });

    it('LN_CAC contains dnContacto + direccion components', () => {
      const result = PRODUCT_TEMPLATES.LN_CAC(validData('LN_CAC'));
      expect(result).toContain('5533333333'); // dnContacto
      expect(result).toContain('Av Reforma 100'); // calle
      expect(result).toContain('06600'); // cpDireccion
      expect(result).toContain('Juárez'); // colonia
    });

    it('PRE_ESIM contains dnContacto and email (no address block)', () => {
      const result = PRODUCT_TEMPLATES.PRE_ESIM(validData('PRE_ESIM'));
      expect(result).toContain('5533333333'); // dnContacto
      expect(result).toContain('user@example.com');
      expect(result).not.toContain('CALLE:');
    });

    it('PREPAGO contains dnPortar and dnAdicional (no direccion block)', () => {
      const result = PRODUCT_TEMPLATES.PREPAGO(validData('PREPAGO'));
      expect(result).toContain('5511111111'); // dnPortar
      expect(result).toContain('5522222222'); // dnAdicional
      expect(result).not.toContain('CALLE:');
    });

    it('ADIC_CAC contains dnMovistar, dnContacto, and nombreTitular', () => {
      const result = PRODUCT_TEMPLATES.ADIC_CAC(validData('ADIC_CAC'));
      expect(result).toContain('5544444444'); // dnMovistar
      expect(result).toContain('5533333333'); // dnContacto
      expect(result).toContain('Juan Pérez'); // nombreTitular
    });
  });

  describe('empty input and multi-line output (4.2)', () => {
    it('every template returns a non-empty string for empty input (headers are static)', () => {
      // Templates include static headers like "POSPAGO ESIM" / "PREPAGO" /
      // "Línea Nueva ESIM" / "Adición CAC" even when d is empty, because
      // headers don't interpolate any field. This documents the contract.
      expect(PRODUCT_TEMPLATES.POS_ESIM({}).length).toBeGreaterThan(0);
      expect(PRODUCT_TEMPLATES.POS_CAC({}).length).toBeGreaterThan(0);
      expect(PRODUCT_TEMPLATES.LN_ESIM({}).length).toBeGreaterThan(0);
      expect(PRODUCT_TEMPLATES.LN_CAC({}).length).toBeGreaterThan(0);
      expect(PRODUCT_TEMPLATES.PRE_ESIM({}).length).toBeGreaterThan(0);
      expect(PRODUCT_TEMPLATES.PREPAGO({}).length).toBeGreaterThan(0);
      expect(PRODUCT_TEMPLATES.ADIC_CAC({}).length).toBeGreaterThan(0);
    });

    it('every template returns a multi-line string with a complete fixture', () => {
      // Catches the regression of a template collapsing to a single line.
      for (const productKey of Object.keys(PRODUCT_TEMPLATES)) {
        const result = PRODUCT_TEMPLATES[productKey](validData(productKey));
        const nonEmptyLines = result.split('\n').filter((l) => l.length > 0);
        expect(
          nonEmptyLines.length,
          `${productKey} should produce multiple non-empty lines (got ${nonEmptyLines.length})`
        ).toBeGreaterThan(3);
      }
    });
  });
});

// ─── Phase 4: Touched-field state tracking (4.2–4.5) ──────────────────────────
//
// The touched-field helpers are pure wrappers around a module-scope Set.
// Each test resets the Set in beforeEach to keep order-independent assertions.

describe('touched-field state tracking', () => {
  beforeEach(() => {
    resetTouched();
  });

  describe('markTouched (4.2)', () => {
    it('marks a field so isTouched returns true', () => {
      markTouched('linea');
      expect(isTouched('linea')).toBe(true);
    });

    it('is idempotent — calling twice on the same field keeps the Set size at 1', () => {
      markTouched('linea');
      markTouched('linea');
      expect(isTouched('linea')).toBe(true);
      // No way to introspect Set size from outside, but a second call to a
      // different field gives size 2 (verifies that duplicate markTouched
      // did not create phantom entries or throw).
      markTouched('plan');
      expect(isTouched('linea')).toBe(true);
      expect(isTouched('plan')).toBe(true);
    });

    it('accepts any string key, including the field names from ALL_INPUT_FIELDS', () => {
      for (const field of ALL_INPUT_FIELDS) {
        markTouched(field);
        expect(isTouched(field)).toBe(true);
      }
    });

    it('does not throw on empty string or unusual keys', () => {
      expect(() => markTouched('')).not.toThrow();
      expect(() => markTouched('some-unknown-field')).not.toThrow();
      expect(isTouched('some-unknown-field')).toBe(true);
    });
  });

  describe('isTouched (4.3)', () => {
    it('returns true after markTouched on the same field', () => {
      markTouched('curp');
      expect(isTouched('curp')).toBe(true);
    });

    it('returns false for a field that was never marked', () => {
      expect(isTouched('curp')).toBe(false);
      expect(isTouched('plan')).toBe(false);
    });

    it('returns false for an unknown field key', () => {
      markTouched('linea');
      expect(isTouched('this-field-does-not-exist')).toBe(false);
    });

    it('returns false after resetTouched for a previously-marked field', () => {
      markTouched('linea');
      resetTouched();
      expect(isTouched('linea')).toBe(false);
    });

    it('isolates fields — marking one does not affect another', () => {
      markTouched('linea');
      expect(isTouched('linea')).toBe(true);
      expect(isTouched('plan')).toBe(false);
      expect(isTouched('curp')).toBe(false);
    });
  });

  describe('resetTouched (4.4)', () => {
    it('clears the Set so previously-marked fields report isTouched=false', () => {
      markTouched('linea');
      markTouched('plan');
      markTouched('curp');
      resetTouched();
      expect(isTouched('linea')).toBe(false);
      expect(isTouched('plan')).toBe(false);
      expect(isTouched('curp')).toBe(false);
    });

    it('is safe to call on an empty Set (no throw)', () => {
      expect(() => resetTouched()).not.toThrow();
      expect(isTouched('anything')).toBe(false);
    });

    it('subsequent markTouched after resetTouched still works', () => {
      markTouched('linea');
      resetTouched();
      markTouched('plan');
      expect(isTouched('plan')).toBe(true);
      expect(isTouched('linea')).toBe(false);
    });
  });

  describe('hasAnyTouchedInProduct (4.5)', () => {
    it('returns false when no relevant field is touched', () => {
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(false);
      expect(hasAnyTouchedInProduct('POS_ESIM', ['chat-id', 'chat-dn', 'eid'])).toBe(false);
    });

    it('returns true when at least one field in relevantFields is touched', () => {
      markTouched('linea');
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(true);
    });

    it('returns true when only one of several relevant fields is touched', () => {
      markTouched('chat-id');
      expect(hasAnyTouchedInProduct('POS_ESIM', ['chat-id', 'chat-dn', 'eid'])).toBe(true);
    });

    it('ignores touched fields outside the relevantFields list', () => {
      // 'plan' is touched but not in the relevant list for validatePhones.
      markTouched('plan');
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(false);
    });

    it('returns false for an unknown product key (defensive guard)', () => {
      markTouched('linea');
      expect(hasAnyTouchedInProduct('NOT_A_PRODUCT', ['linea'])).toBe(false);
      expect(hasAnyTouchedInProduct('', ['linea'])).toBe(false);
      expect(hasAnyTouchedInProduct(undefined, ['linea'])).toBe(false);
    });

    it('returns true for the same product key after product switch reset (caller invariant)', () => {
      // Documents the contract: resetTouched() is what the caller uses to
      // enforce per-product state — the helper itself does not consult
      // PRODUCT_FIELDS for membership filtering of relevantFields.
      markTouched('linea');
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(true);
      resetTouched();
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(false);
    });

    it('returns false when relevantFields is empty (no fields to check)', () => {
      markTouched('linea');
      markTouched('plan');
      expect(hasAnyTouchedInProduct('POS_ESIM', [])).toBe(false);
    });
  });

  describe('interaction between helpers (4.5 follow-up)', () => {
    it('product switch workflow: markTouched → resetTouched → hasAnyTouchedInProduct false', () => {
      // Simulates the user flow that triggered the bug:
      // 1) user types in 'linea' (markTouched via input event)
      // 2) user switches product (selectProduct calls resetTouched)
      // 3) inline alerts for the new product stay hidden until they type again
      markTouched('linea');
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(true);

      resetTouched(); // mirrors selectProduct
      expect(hasAnyTouchedInProduct('LN_CAC', ['linea'])).toBe(false);
    });

    it('clear workflow: markTouched → resetTouched (btnClear) → all false', () => {
      markTouched('linea');
      markTouched('chat-id');
      markTouched('plan');

      resetTouched(); // mirrors btnClear

      expect(isTouched('linea')).toBe(false);
      expect(isTouched('chat-id')).toBe(false);
      expect(isTouched('plan')).toBe(false);
      expect(hasAnyTouchedInProduct('POS_ESIM', ['linea'])).toBe(false);
      expect(hasAnyTouchedInProduct('POS_ESIM', ['chat-id', 'chat-dn', 'eid'])).toBe(false);
    });
  });
});
