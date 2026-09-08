import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, render } from "@testing-library/react";
import { useReveal } from "./useReveal";

let trigger: (isIntersecting: boolean) => void;
/**
 * Entrega un lote de VARIAS entradas en UNA sola invocacion del callback, que
 * es lo que el navegador hace de verdad y lo que ningun test de este repo
 * habia entregado jamas (todos los mocks disparaban `cb([una])`). Ver el
 * docblock del candado de abajo.
 */
let lote: (isIntersecting: boolean[]) => void;

interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options?: { threshold?: number; rootMargin?: string };
}

let mockInstances: MockIntersectionObserver[] = [];

beforeEach(() => {
  mockInstances = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      options?: { threshold?: number; rootMargin?: string };

      constructor(
        cb: (e: { isIntersecting: boolean }[]) => void,
        options?: { threshold?: number; rootMargin?: string },
      ) {
        trigger = (v) => cb([{ isIntersecting: v }]);
        lote = (vs) => cb(vs.map((v) => ({ isIntersecting: v })));
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

  it("reenvía threshold por defecto (0.2) junto con el rootMargin por defecto", () => {
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    const instance = mockInstances[0];
    // El segundo argumento del IntersectionObserver es un único objeto: al
    // no poder fijar solo `threshold` sin arrastrar el `rootMargin` por
    // defecto, esta aserción también es la prueba de que el default de
    // rootMargin ("0px 0px -12% 0px") se aplica incluso cuando el consumidor
    // no toca ninguna opción -- el caso real de los 5 consumidores actuales
    // (SectionBeam, Contact, Features, Story, Journey), que llaman
    // useReveal<T>() sin argumentos.
    expect(instance.options).toEqual({
      threshold: 0.2,
      rootMargin: "0px 0px -12% 0px",
    });
  });

  it("reenvía threshold personalizado sin perder el rootMargin por defecto", () => {
    const { result } = renderHook(() => useReveal({ threshold: 0.5 }));
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    const instance = mockInstances[0];
    expect(instance.options).toEqual({
      threshold: 0.5,
      rootMargin: "0px 0px -12% 0px",
    });
  });

  it("reenvía rootMargin por defecto ('0px 0px -12% 0px') cuando el consumidor no lo especifica", () => {
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    const instance = mockInstances[0];
    expect(instance.options?.rootMargin).toBe("0px 0px -12% 0px");
  });

  it("reenvía rootMargin personalizado cuando el consumidor lo especifica", () => {
    const { result } = renderHook(() =>
      useReveal({ rootMargin: "0px 0px -30% 0px" }),
    );
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    const instance = mockInstances[0];
    expect(instance.options?.rootMargin).toBe("0px 0px -30% 0px");
  });

  /*
   * CANDADO DEL LOTE MULTIPLE (P0 de la critica externa #21, ola U,
   * 2026-09-08). `IntersectionObserver` no entrega UNA entrada por
   * invocacion: entrega un LOTE con todos los cambios acumulados desde la
   * ultima entrega, en orden cronologico. Cuando el maquetado se mueve entre
   * el `observe()` y esa entrega -- que es exactamente lo que hace la
   * correccion del punto de lectura del conmutador de tema, un
   * `requestAnimationFrame` anidado despues del montaje de la rama nueva --,
   * el lote llega con DOS registros del mismo nodo: el obsoleto ("no
   * interseca", geometria vieja) primero y el vigente ("interseca",
   * geometria buena) despues.
   *
   * Lote real medido en Chrome sobre `Story__ScGrid`, 146 ms despues de
   * pulsar el conmutador (los dos sellos de tiempo distan 2 ms):
   *
   *     ENTRADAS=2
   *       [0] inter=false ratio=0        top=-1628
   *       [1] inter=true  ratio=0.25378  top=-700
   *
   * `([entry]) => ...` leia `entries[0]`, veia `false`, y con `once: true`
   * la rama `else if (!once)` no hacia nada: `revealed` se quedaba en falso
   * CON LA PIEZA EN PANTALLA, y como el contrato del observador solo vuelve
   * a notificar cuando se CRUZA el umbral -- y el ratio ya estaba por encima
   * --, no llegaba ninguna entrada mas. Medido: 99 % del texto del viewport
   * en el DOM y sin pintar, 10 cubos de color y 99,4 % dominante.
   *
   * Ningun test del repo habia entregado nunca un lote de mas de una
   * entrada; ese, y no la falta de cobertura, era el agujero.
   */
  it("lee la entrada VIGENTE del lote, no la primera: [obsoleta false, vigente true] en UNA invocacion revela", () => {
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });
    expect(result.current.revealed).toBe(false);

    act(() => lote([false, true]));

    expect(result.current.revealed).toBe(true);
  });

  it("el simetrico con once: false: [obsoleta true, vigente false] en UNA invocacion oculta", () => {
    // El lote invertido tambien se midio en la misma corrida (io#25, io#26):
    // esos consumidores se revelaban POR EL ORDEN, no porque el hook leyera
    // bien. Con `once: false` -- el statement de Story -- leer la primera
    // entrada deja la pieza revelada cuando ya no lo esta.
    const { result } = renderHook(() => useReveal({ once: false }));
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });
    act(() => trigger(true));
    expect(result.current.revealed).toBe(true);

    act(() => lote([true, false]));

    expect(result.current.revealed).toBe(false);
  });
});
