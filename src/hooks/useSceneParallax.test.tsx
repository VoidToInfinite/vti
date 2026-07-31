import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSceneParallax } from "./useSceneParallax";
import type { SceneParallaxTarget } from "./useSceneParallax";

interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let mockInstances: MockIntersectionObserver[] = [];
let ioTrigger: (isIntersecting: boolean) => void;

function stubMatchMedia(reducedMatches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * Variante de `stubMatchMedia` con puntero fino ENCENDIDO (`hover: hover and
 * pointer: fine` → `matches: true`). El resto de la suite lo deja apagado a
 * proposito (no le hace falta la posicion real del cursor, solo distinguir
 * "sigue al puntero" de "deriva"), pero las pruebas de la puerta de
 * contencion por seccion si necesitan que `usePointer()` rastree de verdad
 * un `pointermove` real para poder comprobar que la escena lo sigue -- o no
 * lo sigue -- segun este dentro o fuera de su rectangulo.
 */
function stubMatchMediaFine(reducedMatches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : query.includes("pointer: fine"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * matchMedia dinamico para `prefers-reduced-motion`: a diferencia de
 * `stubMatchMedia` (valor congelado en la construccion), `.matches` es un
 * getter que refleja el ULTIMO valor pasado a `setReduced`, y captura el
 * handler de "change" para dispararlo a mano -- necesario para simular un
 * toggle en caliente de la preferencia del sistema.
 */
function stubDynamicReducedMotion(): { setReduced: (v: boolean) => void } {
  let reduced = false;
  let changeHandler: (() => void) | undefined;
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return query.includes("prefers-reduced-motion") ? reduced : false;
      },
      media: query,
      addEventListener: (_: string, handler: () => void) => {
        if (query.includes("prefers-reduced-motion")) changeHandler = handler;
      },
      removeEventListener: vi.fn(),
    })),
  );
  return {
    setReduced: (v: boolean) => {
      reduced = v;
      changeHandler?.();
    },
  };
}

/**
 * Ref ESTABLE, creada una vez por test y pasada tal cual a `renderHook`.
 * Crearla inline dentro del callback de render devolveria un objeto NUEVO en
 * cada render (leccion 2026-07-31: `useStoryDeck`) -- aqui el efecto del
 * hook depende de `sceneRef`, asi que un ref inestable lo resuscribiria por
 * completo en cada render, un escenario que produccion no tiene.
 */
function sceneOf(el: HTMLElement) {
  return { current: el };
}

function targetOf(el: HTMLElement, depth: number): SceneParallaxTarget {
  return { ref: { current: el }, depth };
}

const OPTS = { pointerAmp: { x: 20, y: 12 }, scrollAmp: 60, overscan: 1.06 };

beforeEach(() => {
  mockInstances = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioTrigger = (v) => cb([{ isIntersecting: v }]);
        mockInstances.push(this as unknown as MockIntersectionObserver);
      }
    },
  );
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useSceneParallax", () => {
  it("bajo reduced-motion no arranca ningun rAF", () => {
    stubMatchMedia(true);
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    const targets = [targetOf(document.createElement("div"), 0.5)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    expect(raf).not.toHaveBeenCalled();
  });

  it("sin interseccion no se registra ningun rAF ni ningun listener de pointermove", () => {
    // Regresion que motiva toda esta entrega: sin la guarda de visibilidad,
    // el bucle arrancaba en el montaje sin importar si la escena estaba en
    // pantalla. 4 secciones (Story 11 capas, Journey 5, Features 10, Contact
    // 7 = 33 en total) escribiendo `transform` por frame de forma permanente
    // era el sintoma medido.
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const addSpy = vi.spyOn(window, "addEventListener");

    const scene = document.createElement("div");
    const targets = [targetOf(document.createElement("div"), 0.5)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    ioTrigger(false);

    expect(raf).not.toHaveBeenCalled();
    const pointerRegistrations = addSpy.mock.calls.filter(
      ([type]) => type === "pointermove",
    );
    expect(pointerRegistrations).toHaveLength(0);
  });

  it("arranca un rAF al intersectar y lo cancela al desmontar", () => {
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const scene = document.createElement("div");
    const targets = [targetOf(document.createElement("div"), 0.5)];
    const sceneRef = sceneOf(scene);
    const { unmount } = renderHook(() =>
      useSceneParallax(sceneRef, targets, OPTS),
    );

    act(() => ioTrigger(true));
    expect(raf).toHaveBeenCalled();

    unmount();
    expect(caf).toHaveBeenCalled();
  });

  it("escribe transform con la escala de overscan incluso sin movimiento", () => {
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 0.5)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));

    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);

    expect(layer.style.transform).toContain("scale(1.06");
  });

  it("tras superar idleMs sin movimiento de puntero, usa la deriva en vez del ultimo target de puntero", () => {
    // `lastMoveRef` se marca con `performance.now()` real al arrancar; para
    // que la comparacion con el `now` que le pasamos a mano al callback de
    // rAF caiga en la MISMA escala de tiempo, se fija `performance.now` a un
    // reloj controlado (arranca en 0, igual que el primer timestamp de rAF).
    vi.spyOn(performance, "now").mockReturnValue(0);

    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));

    // Primer frame, timestamp temprano: dentro de idleMs, sin deriva.
    let batch = pending;
    pending = [];
    for (const cb of batch) cb(100);
    const earlyTransform = layer.style.transform;

    // Un frame muy posterior (> 2200ms desde el arranque): la deriva toma
    // el control, y sin() de un argumento distinto produce un desplazamiento
    // X distinto del que dejo el frame temprano (que partia de puntero en 0).
    batch = pending;
    pending = [];
    for (const cb of batch) cb(100 + 2300);

    expect(layer.style.transform).not.toBe(earlyTransform);
  });

  it("al pasar a reduced-motion en caliente, congela las capas (transform vacio)", () => {
    const { setReduced } = stubDynamicReducedMotion();
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));
    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);
    expect(layer.style.transform).not.toBe("");

    act(() => setReduced(true));
    expect(layer.style.transform).toBe("");
  });

  it("al salir de pantalla cancela el rAF y quita los listeners, pero NO resetea el transform", () => {
    // Punto 4 del encargo: si se limpiara el transform al salir del
    // viewport, al reentrar las capas darian un salto visible desde su
    // posicion CSS estatica hasta la que calcule el primer frame. `pause()`
    // (a diferencia de `stop()`) no debe tocar `style.transform`.
    let pending: FrameRequestCallback[] = [];
    const caf = vi.fn();
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", caf);
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 0.5)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));
    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);
    const writtenTransform = layer.style.transform;
    expect(writtenTransform).not.toBe("");

    act(() => ioTrigger(false));

    expect(caf).toHaveBeenCalled();
    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain("pointermove");
    expect(removedTypes).toContain("scroll");
    expect(layer.style.transform).toBe(writtenTransform);
  });

  it("bajo reduced-motion resetea el transform aunque la escena ya estuviera pausada por estar fuera de pantalla", () => {
    // Caso limite que motiva separar el reset de la guarda `running` dentro
    // de `stop()`: si la escena ya estaba fuera de pantalla (pausada, sin
    // reset) y el usuario activa `reduce`, las capas deben volver a `""`
    // igualmente -- no solo cuando `reduce` llega con el bucle corriendo.
    const { setReduced } = stubDynamicReducedMotion();
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));
    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);
    expect(layer.style.transform).not.toBe("");

    act(() => ioTrigger(false));
    expect(layer.style.transform).not.toBe("");

    act(() => setReduced(true));
    expect(layer.style.transform).toBe("");
  });

  it("con el puntero DENTRO del rectangulo de la escena, el transform de una capa evoluciona hacia la posicion del puntero", () => {
    // Puerta de contencion por seccion (encargo 2026-07-31). A diferencia
    // del resto de la suite, aqui hace falta puntero fino ENCENDIDO: solo
    // asi `usePointer()` rastrea de verdad la posicion del cursor y se puede
    // comprobar que la escena la sigue cuando el cursor esta dentro.
    stubMatchMediaFine(false);
    Object.defineProperty(window, "innerWidth", {
      value: 1000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      writable: true,
      configurable: true,
    });

    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    // Rectangulo de la escena: todo el viewport, asi el puntero queda
    // DENTRO en cualquier punto de esta prueba.
    scene.getBoundingClientRect = () =>
      ({ left: 0, right: 1000, top: 0, bottom: 1000 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));

    // El cursor entra en la escena y se mueve hacia la esquina inferior
    // derecha del viewport (normaliza a 0.8, 0.8 en `usePointer`). Se
    // redispara en cada iteracion para que `lastMoveRef` (reloj real) nunca
    // quede a mas de `idleMs` del reloj simulado que le pasamos al rAF.
    for (let i = 0; i < 60; i += 1) {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 900, clientY: 900 }),
      );
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(i * 16);
    }

    const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(
      layer.style.transform,
    );
    expect(match).not.toBeNull();
    const [, xStr, yStr] = match!;
    // Limite teorico si el lerp asentara del todo: 0.8 * pointerAmp (20/12).
    // Simulado (ver sesion): tras 60 iteraciones llega a ~15.45/9.27, muy
    // por encima de estos umbrales -- prueba que SI sigue al puntero.
    expect(parseFloat(xStr)).toBeGreaterThan(10);
    expect(parseFloat(yStr)).toBeGreaterThan(6);
  });

  it("con el puntero FUERA del rectangulo de la escena, esta NO sigue al cursor", () => {
    // Mismo cursor, misma trayectoria real que la prueba anterior (0.8, 0.8
    // normalizado) pero un rectangulo de escena que NO lo contiene: si la
    // puerta de contencion fallara, la escena se acercaria a los mismos
    // ~15/9px de la prueba anterior. En su lugar debe quedarse acotada por la
    // amplitud de la DERIVA (`driftAmp` 0.55/0.35 * pointerAmp 20/12 = ~11/4.2
    // px de pico), muy por debajo del limite de seguir al puntero.
    stubMatchMediaFine(false);
    Object.defineProperty(window, "innerWidth", {
      value: 1000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      writable: true,
      configurable: true,
    });

    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    // Rectangulo pequeno en la esquina superior izquierda: el cursor
    // (900, 900) queda claramente FUERA durante toda la prueba.
    scene.getBoundingClientRect = () =>
      ({ left: 0, right: 100, top: 0, bottom: 100 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));

    for (let i = 0; i < 60; i += 1) {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 900, clientY: 900 }),
      );
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(i * 16);
    }

    const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(
      layer.style.transform,
    );
    expect(match).not.toBeNull();
    const [, xStr, yStr] = match!;
    // Umbrales muy por debajo del limite de "sigue al puntero" (~15.45/9.27
    // de la prueba anterior) y con margen sobre el pico teorico de la
    // deriva (~11/4.2): la escena se queda en su propio reposo, no se acerca
    // a la posicion real del cursor.
    expect(Math.abs(parseFloat(xStr))).toBeLessThan(5);
    expect(Math.abs(parseFloat(yStr))).toBeLessThan(7);
  });

  it("cruzar la frontera de la escena no produce un salto: el cambio entre dos frames esta acotado por el factor de lerp", () => {
    // Regresion que el punto 3 del encargo advierte explicitamente: sin
    // lerp, el `tick` saltaba de golpe de "deriva" a "sigue al puntero" en
    // el mismo frame en que el cursor cruza el borde de la seccion.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () =>
      ({ left: 100, right: 300, top: 0, bottom: 200 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useSceneParallax(sceneRef, targets, OPTS));

    act(() => ioTrigger(true));

    // 20 frames en deriva (el cursor nunca entra en el rectangulo de la
    // escena): con `now` fijo, el valor aplicado converge hacia el objetivo
    // de deriva de ESE instante, dejando una base conocida y no trivial.
    let batch = pending;
    pending = [];
    for (const cb of batch) cb(1000);
    for (let i = 0; i < 19; i += 1) {
      batch = pending;
      pending = [];
      for (const cb of batch) cb(1000);
    }
    const before = /translate3d\(([-\d.]+)px/.exec(layer.style.transform);
    expect(before).not.toBeNull();
    const x1 = parseFloat(before![1]);
    // Base no trivial: si fuera ~0 el cociente de mas abajo no probaria nada.
    expect(Math.abs(x1)).toBeGreaterThan(0.5);

    // El cursor cruza la frontera: entra al rectangulo de la escena justo
    // antes del siguiente frame. Puntero fino sigue apagado (`stubMatchMedia`
    // del `beforeEach`), asi que el objetivo de "sigue al puntero" es
    // exactamente 0 -- el salto COMPLETO equivaldria a caer a 0 de golpe.
    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 200, clientY: 100 }),
    );
    batch = pending;
    pending = [];
    for (const cb of batch) cb(1016);
    const after = /translate3d\(([-\d.]+)px/.exec(layer.style.transform);
    expect(after).not.toBeNull();
    const x2 = parseFloat(after![1]);

    const fullJump = Math.abs(x1); // distancia hasta el objetivo 0 sin lerp
    const actualChange = Math.abs(x2 - x1);
    expect(actualChange).toBeGreaterThan(0); // sigue habiendo movimiento
    expect(actualChange).toBeLessThan(fullJump * 0.3); // muy lejos del salto completo
  });
});
