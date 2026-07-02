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
        // validatePhones, validateChat, event listeners) is out of scope
        // and would require JSDOM. Branches/functions are intentionally 0
        // to avoid forcing coverage on DOM glue before a refactor.
        'popup.js': {
          lines: 60,
          branches: 0,
          functions: 0,
        },
      },
    },
  },
});
