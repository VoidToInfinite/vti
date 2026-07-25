import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePointer } from "./usePointer";

function setPointerFine(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      // Consulta específica: `reduced-motion` se mantiene "no preferido" salvo
      // que un test lo pise explícitamente. Si se aplicara el mismo `matches`
      // a TODAS las queries, un hook que además comprueba reduced-motion
      // quedaría siempre deshabilitado bajo `setPointerFine(true)`.
      matches: query.includes("prefers-reduced-motion") ? false : matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
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
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches:
          query.includes("prefers-reduced-motion") ||
          query.includes("pointer: fine"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
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
});
