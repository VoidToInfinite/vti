import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrolled } from "./useScrolled";

describe("useScrolled", () => {
  beforeEach(() => {
    // Restaurar scrollY al inicio de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restaurar scrollY después de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it("es true al pasar el offset", () => {
    const { result } = renderHook(() => useScrolled(10));
    expect(result.current).toBe(false);
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 50,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);
  });

  it("es false cuando scrollY está por debajo del offset", () => {
    const { result } = renderHook(() => useScrolled(50));
    expect(result.current).toBe(false);
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 30,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(false);
  });

  it("evalúa la posición de scroll inmediatamente al montar", () => {
    Object.defineProperty(window, "scrollY", {
      value: 50,
      writable: true,
    });
    const { result } = renderHook(() => useScrolled(10));
    expect(result.current).toBe(true);
  });

  it("retorna false cuando scrollY está exactamente en el offset", () => {
    Object.defineProperty(window, "scrollY", {
      value: 10,
      writable: true,
    });
    const { result } = renderHook(() => useScrolled(10));
    expect(result.current).toBe(false);
  });

  it("usa offset default de 8", () => {
    Object.defineProperty(window, "scrollY", {
      value: 9,
      writable: true,
    });
    const { result: resultDefault } = renderHook(() => useScrolled());
    expect(resultDefault.current).toBe(true);

    Object.defineProperty(window, "scrollY", {
      value: 7,
      writable: true,
    });
    const { result: resultBelow } = renderHook(() => useScrolled());
    expect(resultBelow.current).toBe(false);
  });

  it("registra el listener con {passive: true}", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useScrolled(10));
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      { passive: true },
    );
    addEventListenerSpy.mockRestore();
  });

  it("remueve el listener al desmontar", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    const { unmount } = renderHook(() => useScrolled(10));

    const scrollCallback = addEventListenerSpy.mock.calls[0][1];
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      scrollCallback,
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("actualiza el estado cuando scrollY cambia de arriba a abajo del offset", () => {
    const { result } = renderHook(() => useScrolled(20));
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 25,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 10,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(false);
  });
});
