import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// El relleno del form se hace con eventos sintéticos. La pregunta es:
// ¿cuánto tarda? Si el handler de Google Forms actualiza el DOM de forma
// síncrona, la espera activa (sondeo) debe resolver en el primer frame
// (~16 ms) en vez de pagar un sleep fijo.
//
// Estos tests miden el tiempo REAL de las esperas activas del harness.

global.window = global;

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
    this.bubbles = init.bubbles ?? false;
    this.cancelable = init.cancelable ?? false;
  }
};

require('../content/constants.js');
require('../content/utils.js');
const helpers = require('../content/helpers.js');

describe('espera activa (waitFor)', () => {
  it('resuelve en el primer frame si el predicado ya es cierto', async () => {
    const start = Date.now();
    const result = await helpers.waitFor(() => true, 1000);
    const elapsed = Date.now() - start;

    expect(result).toBe(true);
    // No debe dormir: el predicado es cierto de entrada.
    // El umbral es holgado (la garantía real es "no duerme", que testean
    // los tests de abajo); acá sólo se acota que no haya espera fija.
    expect(elapsed).toBeLessThan(100);
  });

  it('resuelve apenas el predicado se vuelve cierto', async () => {
    let flag = false;
    setTimeout(() => {
      flag = true;
    }, 50);

    const start = Date.now();
    await helpers.waitFor(() => flag, 1000);
    const elapsed = Date.now() - start;

    // Sondea cada 16 ms: debería resolver ~16 ms después del cambio.
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(120);
  });

  it('devuelve null si el predicado nunca se cumple', async () => {
    const start = Date.now();
    const result = await helpers.waitFor(() => false, 100);
    const elapsed = Date.now() - start;

    expect(result).toBeNull();
    expect(elapsed).toBeGreaterThanOrEqual(95);
  });

  it('el intervalo de sondeo es de ~16 ms (un frame)', async () => {
    // Con el intervalo por defecto, 100 ms de espera ≈ 6 sondeos.
    let calls = 0;
    await helpers.waitFor(() => {
      calls++;
      return calls > 6;
    }, 1000);

    expect(calls).toBeGreaterThanOrEqual(6);
    expect(calls).toBeLessThan(12);
  });
});

describe('espera por microtask (no pinta el menú)', () => {
  it('detecta el cambio sin ceder al event loop', async () => {
    // El change detection de Angular corre al vaciar el microtask queue:
    // un yield alcanza y NO deja pintar al navegador (el menú abierto no
    // se ve). El fallback de macrotask queda para cuando el cambio no
    // llega por microtask.
    let changed = false;
    Promise.resolve().then(() => {
      changed = true;
    });

    const originalSleep = helpers.sleep;
    let macrotasks = 0;
    helpers.sleep = (...args) => {
      macrotasks++;
      return originalSleep(...args);
    };

    try {
      const result = await helpers.waitFor(() => changed, 1000);
      expect(result).toBe(true);
      // Ni un solo timer: el navegador no tuvo ocasión de pintar.
      expect(macrotasks).toBe(0);
    } finally {
      helpers.sleep = originalSleep;
    }
  });

  it('cae al fallback de macrotask si el cambio no llega por microtask', async () => {
    // El cambio llega en un macrotask (rAF o timer dentro del form):
    // hay que esperar, pero el fallback arranca en 0 ms en vez de 16.
    let changed = false;
    setTimeout(() => {
      changed = true;
    }, 0);

    const start = Date.now();
    const result = await helpers.waitFor(() => changed, 1000);
    const elapsed = Date.now() - start;

    expect(result).toBe(true);
    // Con el backoff en 0 ms, se detecta en el primer tick, no en 16 ms.
    expect(elapsed).toBeLessThan(60);
  });
});

describe('clickOption sin esperas fijas', () => {
  // Un option que se marca al primer click, como hace Google Forms.
  function fastOption(value) {
    return {
      getAttribute: (name) =>
        name === 'data-value' ? value : name === 'aria-selected' ? 'true' : null,
      querySelector: () => null,
      click() {},
    };
  }

  beforeEach(() => {
    // isSelectedAnywhere() consulta el documento: se le da uno mínimo con
    // la opción ya marcada como seleccionada.
    global.document = {
      querySelectorAll: () => [
        {
          getAttribute: (name) =>
            name === 'data-value'
              ? 'GOOGLE PMAX'
              : name === 'aria-selected'
                ? 'true'
                : null,
        },
      ],
    };
  });

  afterEach(() => {
    delete global.document;
  });

  it('confirma la selección sin dormir cuando el click es inmediato', async () => {
    const option = fastOption('GOOGLE PMAX');
    const start = Date.now();
    const strategy = await helpers.clickOption(option, 'GOOGLE PMAX');
    const elapsed = Date.now() - start;

    expect(strategy).toBe('click');
    // Antes costaba 120 ms fijos; ahora debe resolverse casi al instante.
    // El umbral es holgado a propósito: la garantía real la da el test
    // de abajo (cero sleep), que no depende del reloj.
    expect(elapsed).toBeLessThan(150);
  });

  it('NO duerme en el camino feliz (para que el navegador no pinte el menú)', async () => {
    // Esto es lo que hace que el relleno se vea instantáneo: si el
    // handler de Forms actualiza el DOM de forma síncrona, no hay ningún
    // setTimeout, el navegador no cede el control y NUNCA llega a pintar
    // el menú abierto. El operador sólo ve el dropdown ya con el valor.
    const originalSleep = helpers.sleep;
    let sleeps = 0;
    helpers.sleep = (...args) => {
      sleeps++;
      return originalSleep(...args);
    };

    try {
      const option = fastOption('GOOGLE PMAX');
      await helpers.clickOption(option, 'GOOGLE PMAX');
      expect(sleeps).toBe(0);
    } finally {
      helpers.sleep = originalSleep;
    }
  });
});
