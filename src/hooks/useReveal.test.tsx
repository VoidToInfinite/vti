import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, render } from "@testing-library/react";
import { useReveal } from "./useReveal";

let trigger: (isIntersecting: boolean) => void;

interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options?: { threshold?: number };
}

let mockInstances: MockIntersectionObserver[] = [];

beforeEach(() => {
  mockInstances = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      options?: { threshold?: number };

      constructor(
        cb: (e: { isIntersecting: boolean }[]) => void,
        options?: { threshold?: number },
      ) {
        trigger = (v) => cb([{ isIntersecting: v }]);
        this.options = options;
        mockInstances.push(this as unknown as MockIntersectionObserver);
      }
    },
  );
});

describe("useReveal", () => {
  it("empieza oculto y revela al intersecar", () => {
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });
    expect(result.current.revealed).toBe(false);
    act(() => trigger(true));
    expect(result.current.revealed).toBe(true);
  });

  it("vuelve a oculto al salir del viewport cuando once: false", () => {
    const { result } = renderHook(() => useReveal({ once: false }));
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });
    expect(result.current.revealed).toBe(false);
    act(() => trigger(true));
    expect(result.current.revealed).toBe(true);
    act(() => trigger(false));
    expect(result.current.revealed).toBe(false);
  });

  it("desconecta el observer anterior al reobservar un nodo distinto", () => {
    const { result } = renderHook(() => useReveal());
    const nodeA = document.createElement("div");
    const nodeB = document.createElement("div");

    // Observar nodo A
    act(() => {
      (result.current.ref as (n: Element | null) => void)(nodeA);
    });
    const firstInstance = mockInstances[0];
    expect(firstInstance.observe).toHaveBeenCalledWith(nodeA);

    // Observar nodo B
    act(() => {
      (result.current.ref as (n: Element | null) => void)(nodeB);
    });

    // Verificar que el primer observer se desconectó
    expect(firstInstance.disconnect).toHaveBeenCalledTimes(1);

    // Verificar que el segundo observer observa nodo B
    const secondInstance = mockInstances[1];
    expect(secondInstance.observe).toHaveBeenCalledWith(nodeB);
  });

  it("desconecta el observer al llamar ref con null", () => {
    const { result } = renderHook(() => useReveal());
    const node = document.createElement("div");

    act(() => {
      (result.current.ref as (n: Element | null) => void)(node);
    });
    const instance = mockInstances[0];
    expect(instance.observe).toHaveBeenCalledWith(node);

    // Llamar ref con null (simula desmontar el nodo)
    act(() => {
      (result.current.ref as (n: Element | null) => void)(null);
    });

    // Verificar que disconnect se llamó
    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });

  it("desconecta el observer al desmontar el elemento del DOM", () => {
    const TestComponent = ({ show }: { show: boolean }) => {
      const { ref } = useReveal();
      return show ? (
        <div
          ref={ref}
          data-testid="element"
        />
      ) : null;
    };

    const { rerender } = render(<TestComponent show={true} />);

    const instance = mockInstances[0];
    expect(instance.observe).toHaveBeenCalledTimes(1);

    // Remover el elemento del DOM (React llama al callback del ref con null)
    rerender(<TestComponent show={false} />);

    // Verificar que disconnect se llamó
    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reenvía threshold por defecto (0.2)", () => {
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    const instance = mockInstances[0];
    expect(instance.options).toEqual({ threshold: 0.2 });
  });

  it("reenvía threshold personalizado", () => {
    const { result } = renderHook(() => useReveal({ threshold: 0.5 }));
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    const instance = mockInstances[0];
    expect(instance.options).toEqual({ threshold: 0.5 });
  });
});
