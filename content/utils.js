// ─── UTILITIES ──────────────────────────────────────────────────────────
// Small pure helpers used by the page routines. Attaches to window.__ff.utils.
// ESM `export` removed (see constants.js for rationale).
//
// The file is written so it can also be loaded by Node (unit tests):
// `window` is resolved defensively and the API is exported through
// `module.exports` when a CommonJS environment is detected.

(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;

  const api = {
    // Returns true when the product is a "linea nueva" variant.
    // Unified from the 3 inlined blocks in the previous monolithic file.
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

    // Same as normalizeText but also collapses whitespace and trims.
    // Used when comparing visible labels coming from the DOM.
    normalizeLabel(s) {
      if (!s) return '';
      return api.normalizeText(s).replace(/\s+/g, ' ').trim();
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

    // ── Dropdown option matching (pure, DOM-free) ───────────────────────
    // A dropdown option is described by two plain strings:
    //   value → the form's data-value attribute (source of truth)
    //   label → the text the operator sees
    // Keeping the matcher free of DOM access makes it unit-testable.

    // Extracts the leading number of a label: "Pro 30" → 30, "30 GB" → 30.
    // Used to resolve short plan codes ("30") against real plan options.
    extractPlanNumber(s) {
      const normalized = api.normalizeLabel(s);
      const match = normalized.match(/\d+/);
      return match ? Number(match[0]) : null;
    },

    // Scores how well an option matches the wanted text.
    // Higher is better, 0 means "no match".
    //   100 exact data-value   95 exact label   90/88 matching plan number
    //    70/65 prefix          50/45 contains
    optionMatchScore(option, target) {
      const wanted = api.normalizeLabel(target);
      if (!wanted || !option) return 0;

      const value = api.normalizeLabel(option.value || '');
      const label = api.normalizeLabel(option.label || '');
      if (!value && !label) return 0;

      if (value && value === wanted) return 100;
      if (label && label === wanted) return 95;

      // Numeric targets ("30") resolve by plan number so "Pro 30" wins
      // over "Pro 130" instead of matching both by substring.
      if (/^\d+$/.test(wanted)) {
        const wantedNumber = Number(wanted);
        const valueNumber = api.extractPlanNumber(value);
        const labelNumber = api.extractPlanNumber(label);
        if (valueNumber === wantedNumber) return 90;
        if (labelNumber === wantedNumber) return 88;
      }

      if (value.startsWith(wanted)) return 70;
      if (label.startsWith(wanted)) return 65;
      if (value.includes(wanted)) return 50;
      if (label.includes(wanted)) return 45;
      return 0;
    },

    // Picks the best matching option from a list, or null when nothing
    // matches. Ties are broken by the shortest label, then by list order.
    findBestOption(options, target) {
      if (!Array.isArray(options) || options.length === 0) return null;

      let best = null;
      let bestScore = 0;

      for (const option of options) {
        const score = api.optionMatchScore(option, target);
        if (score > bestScore) {
          best = option;
          bestScore = score;
          continue;
        }
        if (score === bestScore && score > 0 && best) {
          const candidateLength = api.normalizeLabel(
            option.label || option.value || '',
          ).length;
          const bestLength = api.normalizeLabel(
            best.label || best.value || '',
          ).length;
          if (candidateLength < bestLength) best = option;
        }
      }

      return bestScore > 0 ? best : null;
    },
  };

  root.__ff = root.__ff || {};
  root.__ff.utils = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
