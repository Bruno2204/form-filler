import { describe, it, expect, beforeEach } from 'vitest';

// ─── Helpers de DOM simulados ──────────────────────────────────────────────
// El código de `content/` no tiene tests contra el DOM real de Google Forms
// (se verifica a mano), pero el matching de las casillas de "Etiquetas del
// contacto" SÍ es testable con un DOM mínimo: lo que importa es que se
// busque en TODOS los bloques de la sección y no sólo en el primero.

/** Mini-DOM: soporta los selectores que usa content/constants.js. */
class El {
  constructor(attrs = {}, children = [], text = '') {
    this.attrs = attrs;
    this.children = children;
    this.innerText = text;
    this.tagName = 'div';
  }

  getAttribute(name) {
    return this.attrs[name] ?? null;
  }

  setAttribute(name, value) {
    this.attrs[name] = value;
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    const out = [];
    const walk = (node) => {
      node.children.forEach((child) => {
        if (matches(child, sel)) out.push(child);
        walk(child);
      });
    };
    walk(this);
    return out;
  }

  click() {
    const next = this.getAttribute('aria-checked') !== 'true';
    this.setAttribute('aria-checked', next ? 'true' : 'false');
  }

  dispatchEvent(event) {
    // El trigger del listbox se "abre" con mousedown + mouseup: el mini-DOM
    // marca con aria-expanded el listbox ancestro más cercano.
    if (event.type === 'mouseup' || event.type === 'mousedown') {
      let node = this;
      while (node) {
        if (node.getAttribute('role') === 'listbox') {
          node.setAttribute('aria-expanded', 'true');
          break;
        }
        node = node.parent;
      }
    }
    return true;
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }

  focus() {}
}

function matches(el, sel) {
  return sel.split(',').some((part) => matchesOne(el, part.trim()));
}

function matchesOne(el, sel) {
  const attr = sel.match(/^(\w+)?\[(\w+)="([^"]+)"\]$/);
  if (attr) {
    const [, tag, name, value] = attr;
    if (tag && el.tagName !== tag) return false;
    return el.getAttribute(name) === value;
  }
  const cls = sel.match(/^\.(\w+)$/);
  if (cls) return (el.attrs.class || '').split(' ').includes(cls[1]);
  return false;
}

function checkbox(label) {
  return new El(
    { role: 'checkbox', 'aria-label': label, 'aria-checked': 'false' },
    [],
    '',
  );
}

/** Bloque de pregunta con su heading y sus casillas. */
function block(headingText, boxes) {
  const heading = new El({ class: 'M7eMe' }, [], headingText);
  const inner = new El({ jsmodel: 'CP1oW' }, [heading, ...boxes]);
  boxes.forEach((b) => {
    b.parent = inner;
  });
  return inner;
}

/** Opción de un dropdown (div[role=option] con data-value). */
function option(value) {
  const el = new El(
    { role: 'option', 'data-value': value, 'aria-selected': 'false' },
    [],
    value,
  );
  el.tagName = 'div';
  // El click marca la opción como seleccionada.
  el.click = () => el.setAttribute('aria-selected', 'true');
  return el;
}

/**
 * Bloque de pregunta con un dropdown (div[role=listbox]) que cuelga de un
 * trigger, con sus opciones dentro — igual que en el DOM real de Forms:
 *
 *   div[role=listbox] > div[jsname=LgbsSe] > div[role=option] ...
 */
function dropdownBlock(headingText, values) {
  const heading = new El({ class: 'M7eMe' }, [], headingText);
  const opts = values.map(option);
  const inner = new El({ jsname: 'LgbsSe' }, opts);
  inner.tagName = 'div';
  const trigger = new El({ role: 'listbox', 'aria-expanded': 'false' }, [inner]);
  trigger.tagName = 'div';
  const blockEl = new El({ jsmodel: 'CP1oW' }, [heading, trigger]);
  opts.forEach((o) => {
    o.parent = inner;
  });
  inner.parent = trigger;
  trigger.parent = blockEl;
  return { block: blockEl, trigger, opts };
}

/**
 * Documento mínimo: `querySelectorAll` busca en todos los bloques y
 * devuelve lo que matchea el selector (bloques de pregunta u opciones).
 */
function mockDocument(blocks) {
  return {
    querySelectorAll(sel) {
      const out = [];
      const walk = (node) => {
        if (matches(node, sel)) out.push(node);
        node.children.forEach(walk);
      };
      blocks.forEach(walk);
      return out;
    },
    getElementById: () => null,
    activeElement: null,
  };
}

// El harness carga los content scripts, que se enganchan a window.__ff.
global.window = global;

// MouseEvent/KeyboardEvent no existen en Node: el helper abre el listbox
// con mousedown + mouseup y lo cierra con Escape. Los stubs sólo necesitan
// que el constructor exista.
global.MouseEvent = class MouseEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? false;
    this.cancelable = init.cancelable ?? false;
    this.view = init.view ?? null;
  }
};

global.KeyboardEvent = class KeyboardEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.key = init.key ?? '';
    this.code = init.code ?? '';
    this.keyCode = init.keyCode ?? 0;
    this.which = init.which ?? 0;
    this.bubbles = init.bubbles ?? false;
    this.cancelable = init.cancelable ?? false;
  }
};

require('../content/constants.js');
require('../content/utils.js');
const helpers = require('../content/helpers.js');

describe('fillCheckboxes', () => {
  let tagsA;
  let tagsB;
  let otherBoxes;

  beforeEach(() => {
    tagsA = [
      checkbox('Reapertura'),
      checkbox('Prospección IA'),
      checkbox('GOOGLE PMAX'),
    ];
    tagsB = [
      checkbox('Volumen Pospago Integral'),
      checkbox('Orgánico PosPago'),
      checkbox('Adición Pospago'),
    ];
    otherBoxes = [checkbox('Sí'), checkbox('No')];

    const otherBlock = block('Otra pregunta', otherBoxes);
    const blockA = block('Etiquetas del contacto', tagsA);
    const blockB = block('Etiquetas del contacto', tagsB);

    global.document = mockDocument([otherBlock, blockA, blockB]);
  });

  const state = (list) =>
    list.map((c) => `${c.getAttribute('aria-label')}=${c.getAttribute('aria-checked')}`);

  it('marca las casillas de todos los bloques de la sección', async () => {
    const result = await helpers.fillCheckboxes('Etiquetas del contacto', [
      'Reapertura',
      'GOOGLE PMAX',
      'Volumen Pospago Integral',
      'Orgánico PosPago',
    ]);

    expect(result.filled).toBe(4);
    expect(result.failed).toEqual([]);
    expect(state(tagsA)).toEqual([
      'Reapertura=true',
      'Prospección IA=false',
      'GOOGLE PMAX=true',
    ]);
    expect(state(tagsB)).toEqual([
      'Volumen Pospago Integral=true',
      'Orgánico PosPago=true',
      'Adición Pospago=false',
    ]);
  });

  it('no toca las casillas de otras secciones', async () => {
    await helpers.fillCheckboxes('Etiquetas del contacto', ['Reapertura']);
    expect(state(otherBoxes)).toEqual(['Sí=false', 'No=false']);
  });

  it('reporta como fallida una etiqueta que no existe en el form', async () => {
    const result = await helpers.fillCheckboxes('Etiquetas del contacto', [
      'Reapertura',
      'No Existe Esta',
    ]);

    expect(result.filled).toBe(1);
    expect(result.failed).toEqual(['No Existe Esta']);
  });

  it('no marca nada si no se pidió ninguna etiqueta', async () => {
    const result = await helpers.fillCheckboxes('Etiquetas del contacto', []);
    expect(result.filled).toBe(0);
    expect(result.failed).toEqual([]);
    expect(state(tagsA)).toEqual([
      'Reapertura=false',
      'Prospección IA=false',
      'GOOGLE PMAX=false',
    ]);
  });
});

describe('selectDropdownByHeading con umbral estricto', () => {
  // El heading real del form termina en "&nbsp;" y el normalizeLabel lo
  // colapsa: el match tiene que funcionar igual.
  const HEADING = '¿Línea telefónica a la que se comunica?';

  let dropdown;

  beforeEach(() => {
    dropdown = dropdownBlock(HEADING, [
      'Reaperturas META',
      'Reaperturas GOOGLE',
      'GOOGLE PMAX',
      'Orgánico PosPago',
    ]);

    global.document = mockDocument([dropdown.block]);
    global.window.getComputedStyle = () => ({
      opacity: '1',
      visibility: 'visible',
      display: 'block',
    });
  });

  const selected = () =>
    dropdown.opts
      .filter((o) => o.getAttribute('aria-selected') === 'true')
      .map((o) => o.getAttribute('data-value'));

  it('selecciona la opción exacta', async () => {
    const result = await helpers.selectDropdownByHeading(
      HEADING,
      'GOOGLE PMAX',
      95,
    );
    expect(result.filled).toBe(1);
    expect(result.failed).toEqual([]);
    expect(selected()).toEqual(['GOOGLE PMAX']);
  });

  it('rechaza un prefijo que no es coincidencia exacta', async () => {
    // "Reapertura" haría match laxo con "Reaperturas META" (prefijo,
    // score 70). Con el umbral estricto no debe seleccionar ninguna.
    const result = await helpers.selectDropdownByHeading(
      HEADING,
      'Reapertura',
      95,
    );
    expect(result.filled).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(selected()).toEqual([]);
  });

  it('no matchea una etiqueta que no existe en el dropdown', async () => {
    const result = await helpers.selectDropdownByHeading(
      HEADING,
      'Etiqueta Inventada',
      95,
    );
    expect(result.filled).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(selected()).toEqual([]);
  });
});
