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

// El harness carga los content scripts, que se enganchan a window.__ff.
global.window = global;
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

    global.document = {
      querySelectorAll(sel) {
        return [otherBlock, blockA, blockB].filter((b) => matches(b, sel));
      },
    };
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
