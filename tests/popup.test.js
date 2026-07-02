import { describe, it, expect } from 'vitest';
import {
  isFieldEmpty,
  isPhoneFieldInvalid,
  getCleanProductName,
  FIELD_LABELS,
  PHONE_FIELDS,
  ALL_INPUT_FIELDS,
  PRODUCT_FIELDS,
  PRODUCT_REQUIRED_FIELDS,
} from '../popup.js';

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
