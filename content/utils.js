// ─── UTILITIES ──────────────────────────────────────────────────────────
// Small pure helpers used by the page routines. Attaches to window.__ff.utils.
// ESM `export` removed (see constants.js for rationale).

window.__ff = window.__ff || {};

// Returns true when the product is a "linea nueva" variant.
// Unified from the 3 inlined blocks in the previous monolithic file.
window.__ff.utils = {
  isLineaNueva(producto) {
    if (!producto) return false;
    return (
      producto === 'Linea Nueva' ||
      producto === 'Linea Nueva Plan Anual' ||
      producto === 'Linea Nueva Esim' ||
      producto === 'Línea Nueva Prepago Esim' ||
      producto.toLowerCase().includes('linea nueva') ||
      producto.toLowerCase().includes('línea nueva')
    );
  },

  // Normalize a string for accent-insensitive, case-insensitive comparison.
  normalizeText(s) {
    if (!s) return '';
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  },

  // Classify a raw `genero` string from the parser into the radio value.
  gMatch(genero) {
    if (!genero) return null;
    const gLow = genero.toLowerCase().trim();
    if (
      gLow.includes('hombre') ||
      gLow.includes('masculino') ||
      gLow === 'h'
    )
      return 'Masculino';
    if (
      gLow.includes('mujer') ||
      gLow.includes('femenino') ||
      gLow === 'm' ||
      gLow === 'f'
    )
      return 'Femenino';
    return null;
  },

  // Convert 'dd/mm/yyyy' to 'yyyy-mm-dd' (for <input type="date">).
  ddmmyyyyToISO(s) {
    if (!s) return '';
    const parts = s.split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  },
};
