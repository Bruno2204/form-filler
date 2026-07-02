// ─── UTILITIES ──────────────────────────────────────────────────────────
// Small pure helpers used by the page routines. Extracted from the
// inlined blocks in the old content.js (3 `isLineaNueva` blocks + the
// FVC date conversion + the genero classifier).

// Returns true when the product is a "linea nueva" variant.
// Unified from the 3 inlined blocks in old content.js (page 1, page 2,
// page 3). Block 2 originally only matched 'Linea Nueva Esim' and
// 'Línea Nueva Prepago Esim', but the only products that ever reach that
// code path with esEsim=true are POS_ESIM, LN_ESIM and PRE_ESIM — and the
// new union still returns the same boolean for each of them. Block 4
// (`isLineaNuevaOAdicion`) is a different function and stays inline in
// fillPage3 because it also matches 'Adición'.
export function isLineaNueva(producto) {
  if (!producto) return false;
  return (
    producto === 'Linea Nueva' ||
    producto === 'Linea Nueva Plan Anual' ||
    producto === 'Linea Nueva Esim' ||
    producto === 'Línea Nueva Prepago Esim' ||
    producto.toLowerCase().includes('linea nueva') ||
    producto.toLowerCase().includes('línea nueva')
  );
}

// Normalize a string for accent-insensitive, case-insensitive comparison:
// NFD-decompose, strip combining marks, lowercase. Returns '' for falsy.
export function normalizeText(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Classify a raw `genero` string from the parser into the radio value
// expected by the form ('Masculino' | 'Femenino' | null).
export function gMatch(genero) {
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
}

// Convert 'dd/mm/yyyy' to 'yyyy-mm-dd' (for <input type="date">).
// Returns '' when the input is not a valid 3-part slash-separated date,
// matching the old inline behavior of only computing fvcISO when
// parts.length === 3.
export function ddmmyyyyToISO(s) {
  if (!s) return '';
  const parts = s.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}
