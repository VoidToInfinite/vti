import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, render } from "@testing-library/react";
import { useScrollProgress } from "./useScrollProgress";
import type { ScrollProgress } from "./useScrollProgress";

function nodeWith(top: number, height: number): Element {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height }) as DOMRect;
  return el;
}

/**
 * Componente real (no `renderHook`) para probar la medición al montar: React
 * asigna el `ref` en el commit, ANTES de correr `useEffect`. Con `renderHook`
 * a secas, en cambio, el nodo se adjunta manualmente después de que el efecto
 * de montaje ya corrió, así que nunca reproduce ese orden.
 */
function TestComponent({
  top,
  height,
  onResult,
}: {
  top: number;
  height: number;
  onResult: (r: ScrollProgress) => void;
}) {
  const result = useScrollProgress();
  onResult(result);
  return (
    <div
      ref={(node) => {
        if (node) {
          node.getBoundingClientRect = () =>
            ({ top, height, bottom: top + height }) as DOMRect;
        }
        result.ref(node);
      }}
    />
  );
}

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", {
    value: 1000,
    configurable: true,
  });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("useScrollProgress", () => {
  it("arranca en 0", () => {
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current.progress.current).toBe(0);
  });

  it("da 0 cuando el elemento aun no ha entrado", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => result.current.ref(nodeWith(1000, 500)));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.progress.current).toBe(0);
  });

  it("da 1 cuando el elemento ya salio por arriba", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => result.current.ref(nodeWith(-500, 500)));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.progress.current).toBe(1);
  });

  it("da ~0.5 a mitad de recorrido", () => {
    const { result } = renderHook(() => useScrollProgress());
    // recorrido total = innerHeight + height = 1500; top = 250 → recorrido
    // consumido = (1000 - 250) / 1500 = 0.5
    act(() => result.current.ref(nodeWith(250, 500)));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.progress.current).toBeCloseTo(0.5, 2);
  });

  it("mide al montar sin esperar un evento de scroll", () => {
    // Si la pagina carga ya scrolleada, el progreso debe ser correcto
    // desde el primer frame, sin necesidad de un evento "scroll". Usa un
    // componente real: el `ref` se asigna en el commit, antes de que
    // corra el `useEffect` de montaje (a diferencia de llamar
    // `result.current.ref(...)` a mano después de `renderHook`).
    let hookResult: ScrollProgress | undefined;
    render(
      <TestComponent
        top={-500}
        height={500}
        onResult={(r) => {
          hookResult = r;
        }}
      />,
    );
    expect(hookResult?.progress.current).toBe(1);
  });

  it("encola como mucho una medicion por frame y sigue midiendo en frames posteriores", () => {
    // La bandera de "medicion encolada" debe resetearse tras cada frame:
    // si no, el hook dejaria de medir para siempre despues del primero.
    const callbacks: FrameRequestCallback[] = [];
    let idCounter = 0;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        callbacks.push(cb);
        idCounter += 1;
        return idCounter;
      }),
    );
    const flush = (): void => {
      const pending = callbacks.splice(0, callbacks.length);
      pending.forEach((cb) => cb(0));
    };

    const { result } = renderHook(() => useScrollProgress());
    // El montaje ya encolo una medicion; la resolvemos.
    act(() => flush());

    act(() => result.current.ref(nodeWith(1000, 500)));

    // Dos scrolls seguidos antes de resolver el frame no deben encolar
    // una segunda medicion (la bandera "queued" lo evita).
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2); // montaje + 1 encolado

    act(() => flush());
    expect(result.current.progress.current).toBe(0);

    // Tras resolverse el frame la bandera se reseteo: un scroll
    // posterior vuelve a encolar una medicion.
    act(() => result.current.ref(nodeWith(-500, 500)));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(3);
    act(() => flush());
    expect(result.current.progress.current).toBe(1);
  });

  it("recorta el progreso a 0..1 sin extrapolar fuera de rango", () => {
    const { result } = renderHook(() => useScrollProgress());
    act(() => result.current.ref(nodeWith(5000, 500)));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.progress.current).toBe(0);

    act(() => result.current.ref(nodeWith(-5000, 500)));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.progress.current).toBe(1);
  });

  it("limpia el listener de scroll al desmontar", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useScrollProgress());
    act(() => result.current.ref(nodeWith(0, 500)));
    unmount();
    expect(removeSpy.mock.calls.some(([evt]) => evt === "scroll")).toBe(true);
    removeSpy.mockRestore();
  });

  it("limpia el listener de resize al desmontar", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useScrollProgress());
    act(() => result.current.ref(nodeWith(0, 500)));
    unmount();
    expect(removeSpy.mock.calls.some(([evt]) => evt === "resize")).toBe(true);
    removeSpy.mockRestore();
  });

  it("cancela el rAF en curso al desmontar", () => {
    // Stub que NO invoca el callback: el rAF encolado al montar queda
    // pendiente, tal como ocurriria en un frame real todavia no pintado.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(42));
    const { result, unmount } = renderHook(() => useScrollProgress());
    act(() => result.current.ref(nodeWith(0, 500)));
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});
