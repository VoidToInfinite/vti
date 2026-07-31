import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSceneParallax } from "./useSceneParallax";
import type { SceneParallaxTarget } from "./useSceneParallax";

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

function sceneOf(el: HTMLElement) {
  return { current: el };
}

function targetOf(el: HTMLElement, depth: number): SceneParallaxTarget {
  return { ref: { current: el }, depth };
}

const OPTS = { pointerAmp: { x: 20, y: 12 }, scrollAmp: 60, overscan: 1.06 };

beforeEach(() => stubMatchMedia(false));
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
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

    expect(raf).not.toHaveBeenCalled();
  });

  it("arranca un rAF al montar y lo cancela al desmontar", () => {
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const scene = document.createElement("div");
    const targets = [targetOf(document.createElement("div"), 0.5)];
    const { unmount } = renderHook(() =>
      useSceneParallax(sceneOf(scene), targets, OPTS),
    );
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
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

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
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

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
    let changeHandler: (() => void) | undefined;
    let reduced = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        // Getter, no valor congelado en la construccion: `evaluate()` vuelve
        // a leer `.matches` cada vez que se dispara "change", asi que tiene
        // que reflejar el `reduced` ACTUAL, no el que habia cuando se llamo
        // a `matchMedia()` por primera vez.
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
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);
    expect(layer.style.transform).not.toBe("");

    reduced = true;
    act(() => changeHandler?.());
    expect(layer.style.transform).toBe("");
  });
});
