// ─── CONTENT ENTRY POINT ────────────────────────────────────────────────
// Assembles window.FormFiller from the per-page routines attached to the
// global __ff namespace. Loaded last so all dependencies are present.

window.__ff = window.__ff || {};

window.FormFiller = {
  fillPage1: window.__ff.fillPage1,
  fillPage2: window.__ff.fillPage2,
  fillPage3: window.__ff.fillPage3,
};

// Helpful in DevTools: confirms the scripts are live.
console.log('[form-filler] content scripts loaded');
