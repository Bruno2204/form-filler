import { describe, it, expect } from 'vitest';
import {
  normalizeLabel,
  extractPlanNumber,
  optionMatchScore,
  findBestOption,
} from '../content/utils.js';

// Plain descriptions of dropdown options, as the DOM layer would build them.
const option = (value, label = value) => ({ value, label });

describe('normalizeLabel', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeLabel('Prospección IA')).toBe('prospeccion ia');
    expect(normalizeLabel('LÍNEA NUEVA')).toBe('linea nueva');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeLabel('  Pro   30  ')).toBe('pro 30');
  });

  it('returns an empty string for falsy input', () => {
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel(null)).toBe('');
  });
});

describe('extractPlanNumber', () => {
  it('extracts the leading number of a plan label', () => {
    expect(extractPlanNumber('Pro 30')).toBe(30);
    expect(extractPlanNumber('30 GB')).toBe(30);
    expect(extractPlanNumber('Pro 130')).toBe(130);
    expect(extractPlanNumber('plan 13')).toBe(13);
  });

  it('returns null when there is no number', () => {
    expect(extractPlanNumber('Prepago')).toBeNull();
    expect(extractPlanNumber('')).toBeNull();
  });
});

describe('optionMatchScore', () => {
  it('gives the highest score to an exact data-value match', () => {
    expect(optionMatchScore(option('Pro 30'), 'Pro 30')).toBe(100);
  });

  it('scores an exact label match below an exact data-value match', () => {
    expect(optionMatchScore(option('internal-id', 'Pro 30'), 'Pro 30')).toBe(95);
  });

  it('resolves a numeric target by plan number, not by substring', () => {
    expect(optionMatchScore(option('Pro 30'), '30')).toBe(90);
    expect(optionMatchScore(option('Pro 130'), '30')).toBe(50);
    expect(optionMatchScore(option('Pro 20'), '30')).toBe(0);
  });

  it('is case and accent insensitive', () => {
    expect(optionMatchScore(option('Prospección IA'), 'prospeccion ia')).toBe(100);
    // El form podría cambiar la tilde: el match debe seguir funcionando.
    expect(optionMatchScore(option('Prospeccion IA'), 'Prospección IA')).toBe(100);
    expect(optionMatchScore(option('REAPERTURA'), 'reapertura')).toBe(100);
  });

  it('does not match an unrelated tag', () => {
    expect(optionMatchScore(option('Reapertura'), 'Prospección IA')).toBe(0);
  });

  it('returns 0 when there is no relation at all', () => {
    expect(optionMatchScore(option('Prepago'), 'Pro 30')).toBe(0);
    expect(optionMatchScore(null, 'Pro 30')).toBe(0);
    expect(optionMatchScore(option('Pro 30'), '')).toBe(0);
  });
});

describe('opciones reales del dropdown "Plan elegido"', () => {
  const planOptions = [
    { value: 'Prepago', label: 'Prepago' },
    { value: 'PLAN PRO 11', label: 'PLAN PRO 11' },
    { value: 'PLAN PRO 13 ILIMITADO', label: 'PLAN PRO 13 ILIMITADO' },
    { value: 'PLAN PRO 16', label: 'PLAN PRO 16' },
    { value: 'PLAN PRO 20', label: 'PLAN PRO 20' },
    { value: 'PLAN PRO 30', label: 'PLAN PRO 30' },
    { value: 'PLAN PRO ILIMITADO', label: 'PLAN PRO ILIMITADO' },
    { value: 'PLAN 10', label: 'PLAN 10' },
  ];

  it.each([
    ['PLAN PRO 30', 'PLAN PRO 30'],
    ['PLAN PRO 13 ILIMITADO', 'PLAN PRO 13 ILIMITADO'],
    ['PLAN PRO ILIMITADO', 'PLAN PRO ILIMITADO'],
    ['PLAN 10', 'PLAN 10'],
    ['Prepago', 'Prepago'],
  ])('con el target "%s" elige "%s"', (target, expected) => {
    expect(findBestOption(planOptions, target).value).toBe(expected);
  });

  it('con "30" elige "PLAN PRO 30" y no se confunde con otros', () => {
    expect(findBestOption(planOptions, '30').value).toBe('PLAN PRO 30');
  });

  it('con "ilimitado" elige "PLAN PRO ILIMITADO" y no el de 13', () => {
    expect(findBestOption(planOptions, 'ilimitado').value).toBe(
      'PLAN PRO ILIMITADO',
    );
  });
});

describe('findBestOption', () => {
  const plans = [
    option('Pro 20'),
    option('Pro 30'),
    option('Pro 130'),
    option('Prepago'),
  ];

  it('picks the exact option when the target is the full label', () => {
    expect(findBestOption(plans, 'Pro 30').value).toBe('Pro 30');
  });

  it('picks "Pro 30" and not "Pro 130" for the short code "30"', () => {
    expect(findBestOption(plans, '30').value).toBe('Pro 30');
  });

  it('picks "Pro 20" for the short code "20"', () => {
    expect(findBestOption(plans, '20').value).toBe('Pro 20');
  });

  it('resolves short codes regardless of the option order', () => {
    const shuffled = [option('Pro 130'), option('Pro 30'), option('Pro 20')];
    expect(findBestOption(shuffled, '30').value).toBe('Pro 30');
  });

  it('returns null when nothing matches', () => {
    expect(findBestOption(plans, 'Fibra 1000')).toBeNull();
    expect(findBestOption([], 'Pro 30')).toBeNull();
    expect(findBestOption(null, 'Pro 30')).toBeNull();
  });

  it('breaks ties with the shortest label', () => {
    const tied = [option('Pro 30 Premium'), option('Pro 30')];
    expect(findBestOption(tied, '30').value).toBe('Pro 30');
  });
});
