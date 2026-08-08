import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePointer } from "./usePointer";

/** Listener de `change` tal y como lo usa el hook: sin argumentos (ver usePointer.ts). */
type ChangeListener = () => void;

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (type: string, cb: ChangeListener) => void;
  removeEventListener: (type: string, cb: ChangeListener) => void;
  listeners: Set<ChangeListener>;
}

function createMockMediaQueryList(
  matches: boolean,
  media: string,
): MockMediaQueryList {
  const listeners = new Set<ChangeListener>();
  return {
    matches,
    media,
    listeners,
    addEventListener: vi.fn((_type: string, cb: ChangeListener) => {
      listeners.add(cb);
    }),
    removeEventListener: vi.fn((_type: string, cb: ChangeListener) => {
      listeners.delete(cb);
    }),
  };
}

let mediaQueries: {
  fine: MockMediaQueryList;
  reduced: MockMediaQueryList;
};

/**
 * Mock query-aware de `matchMedia`: cada query recibe su propio objeto
 * `MediaQueryList` simulado, con `addEventListener`/`removeEventListener`
 * funcionales (registran de verdad al listener) para poder disparar `change`
 * desde el test vía `fireChange`. Si se aplicara el mismo `matches` a TODAS
 * las queries, un hook que además comprueba reduced-motion quedaría siempre
 * deshabilitado bajo `setPointerFine(true)`.
 */
function setPointerFine(fineMatches: boolean, reducedMatches = false): void {
  const fine = createMockMediaQueryList(
    fineMatches,
    "(hover: hover) and (pointer: fine)",
  );
  const reduced = createMockMediaQueryList(
    reducedMatches,
    "(prefers-reduced-motion: reduce)",
  );
  mediaQueries = { fine, reduced };
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockImplementation((query: string) =>
        query.includes("prefers-reduced-motion") ? reduced : fine,
      ),
  );
}

/** Dispara `change` en la media query indicada, notificando a sus listeners registrados. */
function fireChange(which: "fine" | "reduced", matches: boolean): void {
  const mql = mediaQueries[which];
  mql.matches = matches;
  mql.listeners.forEach((cb) => cb());
}

beforeEach(() => {
  setPointerFine(true);
  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("usePointer", () => {
  it("arranca centrado", () => {
    const { result } = renderHook(() => usePointer());
    expect(result.current.x.current).toBe(0);
    expect(result.current.y.current).toBe(0);
  });

  it("se habilita cuando hay puntero fino", () => {
    const { result } = renderHook(() => usePointer());
    expect(result.current.enabled).toBe(true);
  });

  it("queda deshabilitado en táctil (sin puntero fino)", () => {
    setPointerFine(false);
    const { result } = renderHook(() => usePointer());
    expect(result.current.enabled).toBe(false);
  });

  it("queda deshabilitado con prefers-reduced-motion: reduce aunque haya puntero fino", () => {
    setPointerFine(true, true);
    const { result } = renderHook(() => usePointer());
    expect(result.current.enabled).toBe(false);
  });

  it("no registra listeners de puntero cuando está deshabilitado", () => {
    setPointerFine(false);
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => usePointer());
    const pointerCalls = addSpy.mock.calls.filter(
      ([evt]) => evt === "pointermove",
    );
    expect(pointerCalls).toHaveLength(0);
    addSpy.mockRestore();
  });

  it("no arranca el rAF cuando está deshabilitado", () => {
    setPointerFine(false);
    renderHook(() => usePointer());
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("limpia el listener de pointermove al desmontar", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePointer());
    unmount();
    const pointerCalls = removeSpy.mock.calls.filter(
      ([evt]) => evt === "pointermove",
    );
    expect(pointerCalls.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });

  it("limpia el listener de mouseleave al desmontar", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => usePointer());
    unmount();
    const leaveCalls = removeSpy.mock.calls.filter(
      ([evt]) => evt === "mouseleave",
    );
    expect(leaveCalls.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });

  it("cancela el rAF en curso al desmontar", () => {
    const { unmount } = renderHook(() => usePointer());
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it("normaliza y recorta la posición del puntero a −1..1 sin extrapolar fuera del viewport", () => {
    let rafCb: FrameRequestCallback | undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        rafCb = cb;
        return 1;
      }),
    );
    Object.defineProperty(window, "innerWidth", {
      value: 1000,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      writable: true,
    });

    const { result } = renderHook(() => usePointer());

    // Sin recorte, este evento (muy fuera del viewport) normalizaría a 9.
    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 5000, clientY: 5000 }),
    );

    // Deja que el lerp asiente sobre muchos frames simulados.
    for (let i = 0; i < 1000; i += 1) rafCb?.(0);

    expect(result.current.x.current).toBeLessThanOrEqual(1);
    expect(result.current.y.current).toBeLessThanOrEqual(1);
    expect(result.current.x.current).toBeGreaterThan(0.9);
    expect(result.current.y.current).toBeGreaterThan(0.9);
  });

  it("activar prefers-reduced-motion en caliente apaga el hook: quita el listener de pointermove y cancela el rAF", () => {
    // Monta con puntero fino y SIN reduced-motion → habilitado desde el inicio.
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { result } = renderHook(() => usePointer());
    expect(result.current.enabled).toBe(true);
    expect(
      addSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);

    act(() => {
      fireChange("reduced", true);
    });

    expect(result.current.enabled).toBe(false);
    expect(
      removeSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    // No se queda con el último desplazamiento congelado: se resetea a 0.
    expect(result.current.x.current).toBe(0);
    expect(result.current.y.current).toBe(0);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("desactivar prefers-reduced-motion en caliente vuelve a encender el hook", () => {
    // Monta ya con reduced-motion activo → deshabilitado desde el inicio.
    setPointerFine(true, true);
    const addSpy = vi.spyOn(window, "addEventListener");

    const { result } = renderHook(() => usePointer());
    expect(result.current.enabled).toBe(false);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    act(() => {
      fireChange("reduced", false);
    });

    expect(result.current.enabled).toBe(true);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(
      addSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);

    addSpy.mockRestore();
  });

  it("singleton (auditoria 2026-08-08): dos consumidores vivos a la vez comparten UN SOLO listener de pointermove en window, no uno por instancia", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    // Dos instancias del hook montadas a la vez, sin desmontar la primera --
    // el mismo escenario que Eye + una escena oscura, o dos escenas oscuras
    // visibles a la vez, cada una llamando a usePointer() por su cuenta.
    const first = renderHook(() => usePointer());
    const second = renderHook(() => usePointer());

    expect(
      addSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);

    // Las dos instancias comparten la MISMA posicion (mismo objeto de modulo):
    // no son dos relojes de lerp independientes.
    expect(first.result.current.x).toBe(second.result.current.x);
    expect(first.result.current.y).toBe(second.result.current.y);

    // Desmontar solo UNA de las dos no debe quitar el listener compartido:
    // el segundo consumidor todavia lo necesita.
    const removeSpy = vi.spyOn(window, "removeEventListener");
    first.unmount();
    expect(
      removeSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(0);

    // Al desmontar tambien el ultimo, el listener compartido si se retira.
    second.unmount();
    expect(
      removeSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("dos `change` seguidos con el mismo valor no duplican el listener de pointermove (idempotencia)", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => usePointer());
    expect(
      addSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);

    // Dos `change` consecutivos que no alteran el resultado (sigue habilitado).
    act(() => {
      fireChange("fine", true);
    });
    act(() => {
      fireChange("fine", true);
    });

    expect(
      addSpy.mock.calls.filter(([evt]) => evt === "pointermove"),
    ).toHaveLength(1);

    addSpy.mockRestore();
  });
});
