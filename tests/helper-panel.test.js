import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// ─── Smoke test del RENDER del helper (popup.js) ────────────────────────────
//
// El render del helper vive en popup.js, que hasta ahora no tenía ningún test
// de DOM (vitest.config.mjs deja el "DOM glue" fuera de alcance). Eso dejó
// pasar un ReferenceError en esa ruta hasta el navegador.
//
// Este test monta un mini-DOM (mismo patrón que tests/helpers.test.js, sin
// jsdom) y ejercita el camino REAL: evento 'input' → render → resultado.
// Si alguna función del render usa una variable sin declarar, el test falla.
//
// Regla del proyecto: un test de regresión tiene que FALLAR con el bug
// aplicado. Verificado revirtiendo el fix a mano (ver AGENTS.md).

// Reloj congelado: domingo 01/11/2026 → la FVC por defecto es 03/11/2026.
const SUNDAY = new Date(2026, 10, 1);

// ─── Mini-DOM ───────────────────────────────────────────────────────────────

function makeClassList() {
  const set = new Set();
  return {
    add: (cls) => set.add(cls),
    remove: (cls) => set.delete(cls),
    contains: (cls) => set.has(cls),
    toggle: (cls, force) => {
      const on = force === undefined ? !set.has(cls) : !!force;
      if (on) set.add(cls);
      else set.delete(cls);
      return on;
    },
  };
}

class El {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.checked = false;
    this.classList = makeClassList();
    this.listeners = [];
  }

  addEventListener(type, handler) {
    this.listeners.push({ type, handler });
  }

  removeEventListener() {}

  // Dispara manual (el mini-DOM no tiene bubbling real).
  fire(type, event = {}) {
    const evt = { type, target: this, ...event };
    this.listeners
      .filter((listener) => listener.type === type)
      .forEach((listener) => listener.handler(evt));
  }

  dispatchEvent(event) {
    this.fire(event.type, event);
    return true;
  }

  focus() {}
  select() {}
  setAttribute() {}
  getAttribute() {
    return null;
  }
  appendChild(child) {
    this.children = this.children || [];
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = (this.children || []).filter((item) => item !== child);
    return child;
  }

  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
}

// Los botones de producto que popup.js encuentra con
// querySelectorAll('.btn-product').
const PRODUCT_KEYS = [
  'POS_ESIM',
  'POS_CAC',
  'LN_ESIM',
  'LN_CAC',
  'PRE_ESIM',
  'PREPAGO',
  'ADIC_CAC',
];

function makeDocument() {
  const elements = new Map();
  const productButtons = PRODUCT_KEYS.map((key) => {
    const btn = new El(`btn-${key}`);
    btn.getAttribute = (name) => (name === 'data-product' ? key : null);
    return btn;
  });

  const doc = {
    elements,
    productButtons,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new El(id));
      return elements.get(id);
    },
    querySelectorAll: (sel) => (sel === '.btn-product' ? productButtons : []),
    querySelector: () => null,
    createElement: (tag) => new El(tag),
    addEventListener() {},
    // copyText() copia con execCommand: el mini-DOM lo acepta.
    execCommand: () => true,
    body: new El('body'),
  };
  return doc;
}

function makeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  };
}

// ─── Montaje ─────────────────────────────────────────────────────────────────
//
// En el navegador, parser.js / helper.js / popup.js son scripts clásicos: sus
// funciones top-level quedan como GLOBALS. popup.js llama a las de helper.js
// por nombre global, así que hay que replicar ese entorno antes de importarlo.

let originalDocument;
let originalLocalStorage;

beforeAll(async () => {
  originalDocument = globalThis.document;
  originalLocalStorage = globalThis.localStorage;

  globalThis.document = makeDocument();
  globalThis.localStorage = makeStorage();

  const helper = await import('../helper.js');
  globalThis.validateLineaData = helper.validateLineaData;
  globalThis.formatFullName = helper.formatFullName;
  globalThis.formatNameMessage = helper.formatNameMessage;
  globalThis.HELPER_NAME_MESSAGES = helper.HELPER_NAME_MESSAGES;
  globalThis.parseCacBlock = helper.parseCacBlock;
  globalThis.formatCacBlock = helper.formatCacBlock;

  // parser.js también es un script clásico: sus funciones son globales.
  const parser = await import('../parser.js');
  globalThis.parseData = parser.parseData;
  globalThis.cleanPhone = parser.cleanPhone;
  globalThis.normalizePlan = parser.normalizePlan;
  globalThis.formatPlanForOutput = parser.formatPlanForOutput;
  globalThis.parseChatField = parser.parseChatField;
  globalThis.parseLineaField = parser.parseLineaField;
  globalThis.parseCacField = parser.parseCacField;
  globalThis.parseDireccionField = parser.parseDireccionField;
  globalThis.isEsimProduct = parser.isEsimProduct;

  await import('../popup.js');
});

afterAll(() => {
  globalThis.document = originalDocument;
  globalThis.localStorage = originalLocalStorage;
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SUNDAY);
});

function el(id) {
  return globalThis.document.getElementById(id);
}

function typeInto(id, value) {
  const input = el(id);
  input.value = value;
  input.fire('input');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('render del helper', () => {
  it('valida los datos de línea y los reporta', () => {
    typeInto(
      'input-helper-linea',
      '5512345678\n5512345679\n1234\nuser@example.com',
    );

    const report = el('helper-linea-report').innerHTML;
    expect(report).toContain('Datos de línea correctos');
    expect(report).toContain('5512345678');
    expect(report).toContain('1234');
  });

  it('reporta los problemas de la línea', () => {
    typeInto('input-helper-linea', '551234567\n12345\nuser@');

    const report = el('helper-linea-report').innerHTML;
    expect(report).toContain('problema');
    expect(report).toContain('9 dígitos');
    expect(report).toContain('12345');
    expect(report).toContain('correo inválido');
  });

  it('arma el nombre completo desde el bloque de la CURP', () => {
    typeInto(
      'input-helper-nombres',
      'Nombre(s): Carlos Alberto\nPrimer apellido: López\nSegundo apellido: Duarte',
    );

    expect(el('helper-nombres-result').textContent).toBe(
      'Carlos Alberto López Duarte',
    );
  });

  it('arma el bloque CAC con la fecha por defecto', () => {
    typeInto(
      'input-helper-cac',
      'CAC Hermosillo\n\nCalle: Blvd. Solidaridad 56, Col: El Sahuaro, Hermosillo, Sonora, Cp: 83170',
    );

    expect(el('helper-cac-result').textContent).toBe(
      'CAC Hermosillo\n83170\n03/11/2026',
    );
  });

  it('usa la fecha que escribió el operador', () => {
    typeInto(
      'input-helper-cac',
      'CAC Hermosillo\n\nCalle: Blvd. Solidaridad 56, Col: El Sahuaro, Hermosillo, Sonora, Cp: 83170\n15/12/2026',
    );

    expect(el('helper-cac-result').textContent).toBe(
      'CAC Hermosillo\n83170\n15/12/2026',
    );
  });
});

describe('mensajes de chat', () => {
  function messageButtons() {
    return el('helper-msg-grid').children || [];
  }

  it('crea los 4 botones de mensajes', () => {
    expect(messageButtons()).toHaveLength(4);
    expect(messageButtons().map((btn) => btn.textContent)).toEqual([
      'Cambio cía. + Plan Pro',
      'Línea nueva + Plan Pro',
      'Cambio cía. (prepago)',
      'Línea nueva (prepago)',
    ]);
  });

  it('el mensaje usa el nombre completo', () => {
    typeInto(
      'input-helper-nombres',
      'Nombre(s): Carlos Alberto\nPrimer apellido: López\nSegundo apellido: Duarte',
    );

    messageButtons()[0].fire('click');

    expect(el('helper-nombres-result').textContent).toBe(
      'Bien, haremos el cambio de compañía a nombre de Carlos Alberto López Duarte con el Plan Pro ',
    );
  });

  it('el mensaje de prepago no lleva plan', () => {
    typeInto('input-helper-nombres', 'Carlos Alberto\nLópez\nDuarte');

    messageButtons()[2].fire('click');

    expect(el('helper-nombres-result').textContent).toBe(
      'Bien, haremos el cambio de compañía a nombre de Carlos Alberto López Duarte',
    );
  });

  it('sin nombre no genera mensaje', () => {
    typeInto('input-helper-nombres', '');

    messageButtons()[0].fire('click');

    expect(el('helper-nombres-result').textContent).not.toContain('Bien,');
    expect(el('status').textContent).toContain('nombre');
  });
});

describe('vista del helper', () => {
  it('el botón abre y cierra la vista auxiliar', () => {
    const btn = el('btn-helper');

    btn.fire('click');
    expect(el('helper-container').classList.contains('view-hidden')).toBe(false);
    expect(el('main-content').classList.contains('view-hidden')).toBe(true);
    expect(el('main-result').classList.contains('view-hidden')).toBe(true);
    expect(el('main-actions').classList.contains('view-hidden')).toBe(true);

    btn.fire('click');
    expect(el('helper-container').classList.contains('view-hidden')).toBe(true);
    expect(el('main-content').classList.contains('view-hidden')).toBe(false);
  });

  it('elegir un producto saca del helper', () => {
    el('btn-helper').fire('click');
    expect(el('helper-container').classList.contains('view-hidden')).toBe(false);

    globalThis.document.productButtons[1].fire('click'); // POS CAC
    expect(el('helper-container').classList.contains('view-hidden')).toBe(true);
    expect(el('main-content').classList.contains('view-hidden')).toBe(false);
  });
});
