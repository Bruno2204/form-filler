import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['parser.js', 'popup.js'],
      thresholds: {
        // parser.js: full coverage bar (regression gate from add-vitest-parser-tests)
        'parser.js': {
          lines: 90,
          branches: 90,
          functions: 90,
        },
        // popup.js: testable subset only — DOM-coupled code (processData,
        // selectProduct, validatePhones, validateChat, updateFormActionsState,
        // getAccumulatedData, runFillerOnPage, pasteIntoInput, event listeners)
        // is out of scope per the add-popup-validation-tests proposal and would
        // require JSDOM. The testable subset (constants, isFieldEmpty,
        // isPhoneFieldInvalid, validateRequiredData, getMissingFieldLabel,
        // getCleanProductName, PRODUCT_TEMPLATES, exports) is fully covered
        // and lands at ~52% of total lines. Branches/functions are 0 to avoid
        // forcing coverage on DOM glue before a refactor.
        'popup.js': {
          lines: 50,
          branches: 0,
          functions: 0,
        },
      },
    },
  },
});
