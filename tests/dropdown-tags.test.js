import { describe, it, expect } from 'vitest';
import { findBestOption, optionMatchScore } from '../content/utils.js';

// Catálogo REAL del dropdown "¿Línea telefónica a la que se comunica?"
// (Pág 1 del form), extraído del HTML que comparti�� el usuario.
const DROPDOWN_TAGS = [
  'Adición Pospago',
  'ADQUISITION',
  'ADQUISITION B Pospago',
  'ADQUISITION Pospago',
  'AI Pospago',
  'Afiliado ActualS 4',
  'Amazon',
  'BOTÓN FLOTANTE ESIM',
  'Competitors V2',
  'Competitors Pospago Integral',
  'Concentra 5',
  'Convertia Google eSIM',
  'Dayparting Pospago Integral',
  'DIBBI-Meta',
  'DN BOTÓN FLOTANTE',
  'DN PMAX',
  'DN SEM - 1',
  'DN SEM - 2',
  'DN SEM - 3',
  'DN SEM - 4',
  'DN SEM - 5',
  'eSIM organico',
  'eSIM Portabilidad organico',
  'Generica integral V1',
  'Generica integral V2',
  'Globant Google',
  'Globant Meta',
  'GOOGLE AMPLIA ABT PB',
  'GOOGLE AT&T ABT CONQUER',
  'GOOGLE MOVISTAR ABT BRAND',
  'GOOGLE CDMX ABT CATEGORY',
  'Google eSIM',
  'Google banner Pro 11',
  'GOOGLE EXACTA ABT PB',
  'GOOGLE EXACTA RMKT PB',
  'GOOGLE MOVISTAR RMKT BRAND',
  'Google plan 16',
  'Google Plan 20',
  'Google Plan 30',
  'GOOGLE PMAX',
  'Google RMK Pro 11',
  'HAVAS',
  'LKL WSP Pospago Integral',
  'Meta Pospago Dispositivo',
  'Meta plan 16',
  'NUEVO - MOVISTAR RMKT BRND',
  'Nuevo SEM - 4',
  'Orgánico PosPago',
  'Orgánico META pospago',
  'Orgánico PosPago Pop up',
  'Piloto CAPI B Integral',
  'Plan Pro 13 RMK',
  'Prepago Google',
  'Prepago Mailing',
  'Prepago Organico',
  'Prospecting Pospago Integral',
  'RMK Pospago',
  'Reaperturas META',
  'Reaperturas GOOGLE',
  'reapertura_IA_VOZ',
  'Telefónica',
  'TREBBEL',
  'Volumen Pospago Integral',
];

// Las opciones del dropdown del panel (las 38 que elige el operador).
const PANEL_TAGS = [
  'Adición Pospago',
  'AI Pospago',
  'BOTÓN FLOTANTE ESIM',
  'Competitors V2',
  'Competitors Pospago Integral',
  'Dayparting Pospago Integral',
  'DN BOTÓN FLOTANTE',
  'DN PMAX',
  'DN SEM - 1',
  'DN SEM - 2',
  'DN SEM - 3',
  'DN SEM - 4',
  'DN SEM - 5',
  'eSIM organico',
  'eSIM Portabilidad organico',
  'Generica integral V1',
  'Generica integral V2',
  'Globant Google',
  'Globant Meta',
  'GOOGLE AMPLIA ABT PB',
  'GOOGLE AT&T ABT CONQUER',
  'GOOGLE MOVISTAR ABT BRAND',
  'GOOGLE CDMX ABT CATEGORY',
  'Google eSIM',
  'Google banner Pro 11',
  'GOOGLE EXACTA ABT PB',
  'Google RMK Pro 11',
  'GOOGLE EXACTA RMKT PB',
  'GOOGLE MOVISTAR RMKT BRAND',
  'GOOGLE PMAX',
  'LKL WSP Pospago Integral',
  'NUEVO - MOVISTAR RMKT BRND',
  'Orgánico PosPago',
  'Piloto CAPI B Integral',
  'Plan Pro 13 RMK',
  'Prepago Organico',
  'Prospecting Pospago Integral',
  'Volumen Pospago Integral',
];

const options = DROPDOWN_TAGS.map((t) => ({ value: t, label: t }));

// El umbral que usa fillPage1 para el dropdown de etiquetas.
const STRICT = 95;

describe('dropdown de etiquetas del form (Pág 1)', () => {
  it('todas las opciones del panel existen en el dropdown del form', () => {
    const missing = PANEL_TAGS.filter(
      (tag) => !DROPDOWN_TAGS.includes(tag),
    );
    expect(missing).toEqual([]);
  });

  it.each(PANEL_TAGS)(
    'la etiqueta "%s" matchea exactamente y supera el umbral estricto',
    (tag) => {
      const match = findBestOption(options, tag);
      expect(match, `no matcheó ${tag}`).not.toBeNull();
      expect(match.value).toBe(tag);
      expect(optionMatchScore(match, tag)).toBeGreaterThanOrEqual(STRICT);
    },
  );

  it('el match es insensible a acentos y mayúsculas', () => {
    expect(findBestOption(options, 'adición pospago').value).toBe(
      'Adición Pospago',
    );
    expect(findBestOption(options, 'GOOGLE PMAX').value).toBe('GOOGLE PMAX');
  });

  it('"Reapertura" NO matchea "Reaperturas META" con el umbral estricto', () => {
    // Sin el umbral, el prefijo (score 70) haría que se marcara la
    // etiqueta vecina. Con 95 el prefijo se descarta.
    const match = findBestOption(options, 'Reapertura');
    // El dropdown del form no tiene "Reapertura" a secas, sólo las
    // variantes: el mejor match es un prefijo y debe quedar por debajo
    // del umbral estricto.
    expect(optionMatchScore(match, 'Reapertura')).toBeLessThan(STRICT);
  });

  it('las variantes de Reapertura NO son alcanzables por prefijo estricto', () => {
    for (const tag of [
      'Reaperturas META',
      'Reaperturas GOOGLE',
      'reapertura_IA_VOZ',
    ]) {
      const match = findBestOption(options, tag);
      expect(match.value).toBe(tag);
      expect(optionMatchScore(match, tag)).toBeGreaterThanOrEqual(STRICT);
    }
  });

  it('una etiqueta inexistente no matchea nada con score alto', () => {
    const match = findBestOption(options, 'Etiqueta Inventada');
    const score = match ? optionMatchScore(match, 'Etiqueta Inventada') : 0;
    expect(score).toBeLessThan(STRICT);
  });
});
