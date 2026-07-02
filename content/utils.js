// ─── UTILITIES (stub) ───────────────────────────────────────────────────
// Real implementations land in T2.2.

export function isLineaNueva(_producto) {
  return false;
}

export function normalizeText(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function gMatch(_genero) {
  return null;
}

export function ddmmyyyyToISO(_s) {
  return '';
}
