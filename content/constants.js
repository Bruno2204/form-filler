// ─── DOM SELECTORS ──────────────────────────────────────────────────────
// Classic-script version: attaches SELECTORS to the global __ff namespace.
// ESM `export` removed because the manifest's `type: "module"` for
// content_scripts is not honored by Chrome — scripts are injected as
// classic scripts, where `import` is a syntax error.

window.__ff = window.__ff || {};
window.__ff.SELECTORS = {
  // Each Google Forms question block. Older forms use jsmodel="CP1oW";
  // newer forms wrap each question in a div.geS5n container. Both keep
  // the heading inside .M7eMe (see HEADING below).
  QUESTION_BLOCK: 'div[jsmodel="CP1oW"], div.geS5n',
  // Question title heading inside a question block.
  HEADING: '.M7eMe',
  // Standard text input / textarea inside a question block.
  TEXT_INPUT: 'input.whsOnd, textarea.whsOnd',
  // Single-line text input only.
  TEXT_INPUT_SIMPLE: 'input.whsOnd',
  // Dropdown listbox trigger.
  LISTBOX: 'div[role="listbox"]',
  // Individual dropdown option.
  OPTION: 'div[role="option"]',
  // Radio button control.
  RADIO: 'div[role="radio"]',
};
