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

  /*
   * CANDADO DEL UMBRAL CONSCIENTE DE LA ALTURA (segundo defecto de revelado de
   * la critica externa #21, ola U, 2026-09-08; decision del dueno).
   *
   * Un umbral de AREA fijo se paga en PIXELES DE SCROLL proporcionales al alto
   * de la pieza: para que el ratio llegue a 0,2 hacen falta `0,2 * alto` px de
   * la pieza dentro de la ventana del observador, asi que queda una banda de
   * ese tamano en la que la pieza YA asoma por encima de la linea del
   * `rootMargin` y sigue apagada -- y nada la vuelve a comprobar si el lector
   * se para ahi, porque el contrato de `IntersectionObserver` solo habla al
   * CRUZAR el umbral.
   *
   * Medido en el navegador sobre el build servido antes del arreglo
   * (1440x900, tema claro, sin `reduce`, aterrizajes `?read=R#seccion` reales
   * del cambio de idioma), con el porcentaje del texto del viewport que esta
   * en el DOM y no se pinta:
   *
   *     /?read=0.50#features  Contact ScCard          top 771  ratio 0,0218  35,5 %
   *     /?read=0.55#features  Contact ScCard          top 705  ratio 0,0918  37,1 %
   *     /?read=0.60#features  Contact ScCard          top 640  ratio 0,1606  38,7 %
   *     /?read=0.25#story     Story ScStatementText   top 753  ratio 0,1033  44,1 %
   *     /?read=0.45#contact   About ScInner           top 737  ratio 0,1406  54,1 %
   *
   * Las dos ultimas son piezas de 376 y 390 px, MENOS DE LA MITAD de la
   * ventana: la banda no es cosa solo de las piezas altas.
   *
   * Y el censo de alturas encontro un caso peor que una banda: `Story ScGrid`
   * mide 6.073 px a 390x844 con la raiz a 32, con la ventana del observador en
   * 743, asi que su ratio MAXIMO POSIBLE es 0,1223 y el umbral de 0,2 no se
   * cruza NUNCA.
   *
   * Estas comprobaciones se vieron ROJAS sobre el defecto real antes de que
   * existiera el arreglo (regla 34 del repo).
   */
  const RECORTE_INFERIOR = 0.12;

  /** Una caja de verdad: jsdom no hace layout y devuelve todo a cero. */
  const nodoDeAlto = (alto: number): HTMLDivElement => {
    const nodo = document.createElement("div");
    nodo.getBoundingClientRect = (): DOMRect =>
      ({
        height: alto,
        width: 1200,
        top: 0,
        bottom: alto,
        left: 0,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    return nodo;
  };

  const conVentanaDe = (alto: number): void => {
    Object.defineProperty(window, "innerHeight", {
      value: alto,
      configurable: true,
      writable: true,
    });
  };

  /** El umbral que el hook le pide de verdad al observador. */
  const umbralPedido = (
    opciones: { threshold?: number; once?: boolean },
    alto: number,
    ventana: number,
  ): number => {
    conVentanaDe(ventana);
    const { result } = renderHook(() => useReveal(opciones));
    act(() => {
      (result.current.ref as (n: Element | null) => void)(nodoDeAlto(alto));
    });
    return mockInstances[mockInstances.length - 1].options?.threshold ?? 0;
  };

  it("pide un umbral ALCANZABLE en la pieza mas alta del sitio (Story ScGrid, 6.073 px a 390x844 con la raiz a 32)", () => {
    const alto = 6073;
    const ventana = 844;
    const ratioMaximoPosible = (ventana * (1 - RECORTE_INFERIOR)) / alto;

    expect(umbralPedido({}, alto, ventana)).toBeLessThanOrEqual(
      ratioMaximoPosible,
    );
  });

  it("no exige mas de un 1 % de la altura de la ventana en ninguna pieza censada del sitio", () => {
    // Alturas reales medidas sobre el build servido, con la ventana en la que
    // se midieron. El tope es `RETRASO_MAXIMO_DEL_UMBRAL * ventana`.
    const censo = [
      { pieza: "Story ScGrid 1440x900 raiz 16", alto: 938, ventana: 900 },
      { pieza: "Story ScGrid 1440x900 raiz 32", alto: 2855, ventana: 900 },
      { pieza: "Story ScGrid 390x844 raiz 32", alto: 6073, ventana: 844 },
      { pieza: "Contact ScCard 1440x900 raiz 16", alto: 944, ventana: 900 },
      { pieza: "Contact ScCard 390x844 raiz 32", alto: 3250, ventana: 844 },
      { pieza: "About ScInner 1440x900 raiz 16", alto: 390, ventana: 900 },
      {
        pieza: "Story ScStatementText 1440x900 raiz 16",
        alto: 376,
        ventana: 900,
      },
      { pieza: "Journey ScStepsRow 1440x900 raiz 16", alto: 165, ventana: 900 },
    ];

    const exigido = censo.map(({ pieza, alto, ventana }) => ({
      pieza,
      solapePedidoPx: Number(
        (umbralPedido({}, alto, ventana) * alto).toFixed(2),
      ),
      topePx: 0.01 * ventana,
    }));

    expect(exigido.filter((e) => e.solapePedidoPx > e.topePx)).toEqual([]);
  });

  it("conserva intacto el umbral declarado en las piezas cuya banda ya cabe en el tope", () => {
    // La costura del SectionBeam mide 2 px: un quinto de ella son 0,4 px, muy
    // por debajo del tope. Y 45 px es la frontera exacta en una ventana de 900
    // (0,2 * 45 = 9 = 0,01 * 900).
    expect(umbralPedido({}, 2, 900)).toBe(0.2);
    expect(umbralPedido({}, 45, 900)).toBe(0.2);
  });

  it("un consumidor que pide 0 sigue en 0 (Features, hallazgo E3)", () => {
    expect(umbralPedido({ threshold: 0 }, 1095, 900)).toBe(0);
  });

  it("sin layout (caja a cero, que es lo que devuelve jsdom) se queda con el umbral declarado", () => {
    conVentanaDe(900);
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });

    expect(mockInstances[0].options?.threshold).toBe(0.2);
  });

  it("recalcula el umbral cuando el objetivo cambia de alto (redimensionar no vuelve a llamar a observe)", () => {
    // Medido: al pasar de 1440x900 a 390x844 nadie vuelve a llamar a
    // `observe()` y `Journey ScStepsRow` pasa de 165 a 928 px (+463 %). Un
    // umbral calculado solo al montar se queda mintiendo justo ahi.
    let alRedimensionar: (() => void) | null = null;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(cb: () => void) {
          alRedimensionar = cb;
        }
      },
    );

    conVentanaDe(844);
    const nodo = nodoDeAlto(165);
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(nodo);
    });
    const observadoresAlMontar = mockInstances.length;

    nodo.getBoundingClientRect = nodoDeAlto(928).getBoundingClientRect;
    act(() => alRedimensionar?.());

    expect(mockInstances.length).toBeGreaterThan(observadoresAlMontar);
    const ultimo = mockInstances[mockInstances.length - 1];
    expect((ultimo.options?.threshold ?? 0) * 928).toBeLessThanOrEqual(
      0.01 * 844,
    );
  });
});
