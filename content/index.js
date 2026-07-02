// ─── CONTENT ENTRY POINT ────────────────────────────────────────────────
// Builds window.FormFiller from the per-page modules and exposes it in the
// ISOLATED world so popup.js can keep calling window.FormFiller.fillPageN.

import { fillPage1 } from './fillPage1.js';
import { fillPage2 } from './fillPage2.js';
import { fillPage3 } from './fillPage3.js';

// Hardcoded operator name used by the "Nombre" dropdown on page 1.
const NOMBRE_OPERADOR = 'Bruno';

window.FormFiller = {
  fillPage1,
  fillPage2,
  fillPage3,
};

// Helpful in DevTools: confirms the module is live.
console.log('[form-filler] content modules loaded (operator:', NOMBRE_OPERADOR + ')');
