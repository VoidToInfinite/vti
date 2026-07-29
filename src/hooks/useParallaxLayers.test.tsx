import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, act } from "@testing-library/react";
import { useParallaxLayers } from "./useParallaxLayers";
import type { ParallaxTarget, ParallaxAmplitude } from "./useParallaxLayers";

const AMP: ParallaxAmplitude = { x: 26, y: 15 };

/**
 * Mock minimo de `matchMedia`. `usePointer` (consumido por el hook) llama a
 * `window.matchMedia` de verdad al montar; jsdom no lo implementa, asi que
 * sin este stub cualquier render lanza "matchMedia is not a function".
 * `fineMatches` controla si el puntero queda habilitado (arranca su propio
 * rAF interno); `reducedMatches` siempre es `false` salvo que se pida.
 */
function stubMatchMedia(fineMatches: boolean, reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : fineMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Envuelve un elemento suelto en el `RefObject` que pide `ParallaxTarget`. */
function targetOf(el: HTMLElement, depth: number): ParallaxTarget {
  return { ref: { current: el }, depth };
}

/** Mueve el puntero a la esquina inferior derecha => x, y -> +1 normalizado. */
function moveToCorner(): void {
  window.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: window.innerWidth,
      clientY: window.innerHeight,
    }),
  );
}

beforeEach(() => {
  // Por defecto sin puntero fino: la mayoria de estos tests solo verifican
  // que el efecto no arranca cuando no debe.
  stubMatchMedia(false);
});
afterEach(() => vi.unstubAllGlobals());

describe("useParallaxLayers", () => {
  it("no arranca ningun rAF cuando el puntero esta deshabilitado", () => {
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const targets = [targetOf(document.createElement("div"), 0.5)];
    renderHook(() => useParallaxLayers(targets, AMP));

    expect(raf).not.toHaveBeenCalled();
  });

  it("arranca un rAF al montar (con el puntero habilitado) y lo cancela al desmontar", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const targets = [targetOf(document.createElement("div"), 0.5)];
    const { unmount } = renderHook(() => useParallaxLayers(targets, AMP));
    expect(raf).toHaveBeenCalled();
    const callsAfterMount = raf.mock.calls.length;

    unmount();
    // Al desmontar se cancelan los dos rAF en curso: el del lerp de
    // `usePointer` y el del propio parallax.
    expect(caf).toHaveBeenCalledTimes(callsAfterMount);
  });

  it("usa un unico rAF de parallax por frame, sin importar cuantos objetivos reciban transform", () => {
    stubMatchMedia(true);
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const targets = Array.from({ length: 4 }, () =>
      targetOf(document.createElement("div"), 0.5),
    );
    renderHook(() => useParallaxLayers(targets, AMP));

    // Al montar: un rAF del lerp de `usePointer` + un rAF del parallax, sin
    // importar que haya 4 objetivos -- NUNCA uno por objetivo.
    expect(pending.length).toBe(2);

    const batch = pending;
    pending = [];
    for (const cb of batch) cb(16);
    // Cada tick vuelve a pedir exactamente un frame por cada uno de los dos
    // bucles (usePointer y el parallax), no 4 + 4.
    expect(pending.length).toBe(2);
  });

  it("escribe transform en los objetivos con profundidad > 0 y deja quieto el de profundidad 0", () => {
    stubMatchMedia(true);
    // rAF controlado a mano: se guardan los callbacks pendientes y se
    // ejecutan en tandas, la unica forma de avanzar el lerp de `usePointer`
    // (y con el, el tick del parallax) de manera determinista en jsdom.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const background = document.createElement("div");
    const moving = document.createElement("div");
    const targets = [targetOf(background, 0), targetOf(moving, 0.5)];

    renderHook(() => useParallaxLayers(targets, AMP));
    moveToCorner();
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    expect(background.style.transform).toBe("");
    expect(moving.style.transform).toMatch(/^translate3d\(/);
  });

  it("el desplazamiento escrito escala con la profundidad: 0.85 se mueve mas que 0.25", () => {
    stubMatchMedia(true);
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const shallow = document.createElement("div");
    const deep = document.createElement("div");
    const targets = [targetOf(shallow, 0.25), targetOf(deep, 0.85)];

    renderHook(() => useParallaxLayers(targets, AMP));
    moveToCorner();
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    const xOf = (el: HTMLElement): number =>
      Number(/translate3d\((-?[\d.]+)px/.exec(el.style.transform)?.[1] ?? "0");

    expect(xOf(shallow)).toBeGreaterThan(0);
    expect(xOf(deep)).toBeGreaterThan(xOf(shallow));
  });

  it("no provoca ningun re-render del componente consumidor durante el parallax (cero setState por frame)", () => {
    stubMatchMedia(true);
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    let renders = 0;
    const targets = [targetOf(document.createElement("div"), 0.5)];

    function Consumer(): null {
      renders += 1;
      useParallaxLayers(targets, AMP);
      return null;
    }

    render(<Consumer />);
    const rendersAfterMount = renders;

    moveToCorner();
    act(() => {
      for (let frame = 0; frame < 40; frame += 1) {
        const batch = pending;
        pending = [];
        for (const cb of batch) cb(frame * 16);
      }
    });

    expect(renders).toBe(rendersAfterMount);
  });
});
