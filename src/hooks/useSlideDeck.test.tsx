import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  DECK_SLIDE_TRAVEL,
  DECK_SLIDE_TRAVEL_SCREENS,
  useSlideDeck,
} from "./useSlideDeck";

const VH = 800;
const SLIDES = 6;

interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let mockInstances: MockIntersectionObserver[] = [];
let ioTrigger: (isIntersecting: boolean) => void;
/** Lote de VARIAS entradas en UNA invocacion (ver el candado del final). */
let ioLote: (isIntersecting: boolean[]) => void;

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
 * Ref ESTABLE, creada una vez por test y pasada tal cual a `renderHook`.
 * Crearla inline dentro del callback de render (`useSlideDeck(refOf(track),
 * ...)`) devolveria un objeto NUEVO en cada render, y como el efecto del
 * hook depende de los refs, se resuscribiria entero cada vez que el propio
 * hook hace `setState` -- una inestabilidad que produccion no tiene, porque
 * alli los refs vienen de `useRef` y son estables de por vida. Un test que
 * fabrica esa inestabilidad no prueba el hook: prueba otro escenario.
 */
function refOf(el: HTMLElement) {
  return { current: el };
}

/** Pista de prueba con `getBoundingClientRect` sustituible por test. */
function trackWith(top: number, height: number): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ top, height }) as DOMRect;
  return el;
}

beforeEach(() => {
  mockInstances = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioTrigger = (v) => cb([{ isIntersecting: v }]);
        ioLote = (vs) => cb(vs.map((v) => ({ isIntersecting: v })));
        mockInstances.push(this as unknown as MockIntersectionObserver);
      }
    },
  );
  stubMatchMedia(false);
  Object.defineProperty(window, "innerHeight", {
    value: VH,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useSlideDeck", () => {
  it("sin interseccion no se registra ningun requestAnimationFrame", () => {
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    renderHook(() => useSlideDeck(trackRef, stageRef, SLIDES));

    ioTrigger(false);

    expect(raf).not.toHaveBeenCalled();
  });

  it("con interseccion y rect.top = 0, escribe --deck-progress a 0.0000 y el indice queda en 0", () => {
    // Ya no hace falta drenar ningun rAF pendiente: al activarse la pista,
    // `start()` mide de forma INMEDIATA (sincrona), asi que el estado queda
    // correcto en el mismo `ioTrigger(true)`.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );

    act(() => {
      ioTrigger(true);
    });

    // Sin `cssVarPrefix`, el hook usa el defecto "deck" (D4, spec
    // 2026-08-02-journey-deck-8-diapositivas-design.md).
    expect(stage.style.getPropertyValue("--deck-progress")).toBe("0.0000");
    expect(result.current.index).toBe(0);
  });

  it("con rect.top al final de la pista, indice y progreso llegan al maximo", () => {
    // Medicion inmediata al activarse: no hay rAF que drenar.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const height = SLIDES * VH;
    const track = trackWith(-(height - VH), height);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );

    act(() => {
      ioTrigger(true);
    });

    expect(stage.style.getPropertyValue("--deck-progress")).toBe("1.0000");
    expect(result.current.index).toBe(SLIDES - 1);
  });

  it("con tailScreens = 1 el progreso llega a 1 una pantalla antes que con tailScreens = 0 (D4, spec 2026-08-02-journey-overlay-transition-design.md)", () => {
    // MISMA geometria de pista (7 pantallas: SLIDES + 1 de cola) y el MISMO
    // rect.top en las dos ramas -- lo unico que cambia es `tailScreens`. Si
    // `measure()` dejara de restar `optionsRef.current.tailScreens * vh` del
    // span (la resta que este test protege), las dos ramas calcularian el
    // mismo span y la primera aserccion ("1.0000") fallaria: es la
    // comprobacion de que el test SI puede fallar, no solo de que pasa con
    // el codigo actual.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const height = (SLIDES + 1) * VH; // pista con una pantalla de cola
    const rectTop = -5 * VH; // scrollY equivalente a 5 pantallas recorridas

    // Con tailScreens = 1: span = 7VH - 1VH (viewport) - 1VH (cola) = 5VH,
    // y -rect.top = 5VH = span -> progress llega a 1 en este mismo rect.top.
    const trackWithTail = trackWith(rectTop, height);
    const stageWithTail = document.createElement("div");
    const { result: withTail } = renderHook(() =>
      useSlideDeck(refOf(trackWithTail), refOf(stageWithTail), SLIDES, {
        tailScreens: 1,
      }),
    );
    act(() => ioTrigger(true));

    expect(stageWithTail.style.getPropertyValue("--deck-progress")).toBe(
      "1.0000",
    );
    expect(withTail.current.index).toBe(SLIDES - 1);

    // Con tailScreens = 0 (defecto): span = 7VH - 1VH = 6VH, y el MISMO
    // rect.top (-5VH) todavia no agota ese span -> progress se queda por
    // debajo de 1 en el mismo punto de scroll donde la rama con cola ya
    // valia 1. Esa diferencia ES la "pantalla antes" del titulo del test.
    const trackNoTail = trackWith(rectTop, height);
    const stageNoTail = document.createElement("div");
    const { result: noTail } = renderHook(() =>
      useSlideDeck(refOf(trackNoTail), refOf(stageNoTail), SLIDES, {
        tailScreens: 0,
      }),
    );
    act(() => ioTrigger(true));

    const progressNoTail = Number(
      stageNoTail.style.getPropertyValue("--deck-progress"),
    );
    expect(progressNoTail).toBeLessThan(1);
    expect(noTail.current.index).toBeLessThan(SLIDES - 1);
  });

  it('con cssVarPrefix: "journey" escribe --journey-progress y NO --story-progress (D4, spec 2026-08-02-journey-deck-8-diapositivas-design.md)', () => {
    // Este test SI puede fallar: con el literal "--story-progress" cableado
    // en `measure()` en vez de `--${prefix}-progress`, la primera aserccion
    // ("--journey-progress" vacio) fallaria porque el hook seguiria
    // escribiendo solo la variable de Story. Comprobado en rojo a mano
    // (ver informe) antes de restaurar el codigo correcto.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES, { cssVarPrefix: "journey" }),
    );

    act(() => {
      ioTrigger(true);
    });

    expect(stage.style.getPropertyValue("--journey-progress")).toBe("0.0000");
    expect(stage.style.getPropertyValue("--story-progress")).toBe("");
  });

  it("un rect.top intermedio, claramente dentro de un tramo, cae en el indice correcto", () => {
    // Medicion inmediata al activarse: no hay rAF que drenar.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    // progress = 0.6 -> round(0.6 * 5) = 3, comodamente dentro del tramo
    // [0.5, 0.7) que resuelve a index 3 (ni en 2.5 ni en 3.5 de frontera).
    const height = SLIDES * VH;
    const span = height - VH;
    const track = trackWith(-0.6 * span, height);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );

    act(() => {
      ioTrigger(true);
    });

    expect(result.current.index).toBe(3);
  });

  it("invertir el sentido pone direction en rewind, y volver a decrecer lo devuelve a forward", () => {
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(-400, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );
    // La medicion inmediata de `start()` ya fija la linea base en -400: no
    // hace falta un `flush(-400)` aparte para ese primer punto.
    act(() => ioTrigger(true));
    expect(result.current.direction).toBe("forward");

    // Las mediciones siguientes las dispara un evento real de `scroll`, que
    // programa el rAF coalescido; se drena ese rAF a continuacion.
    const flush = (top: number): void => {
      track.getBoundingClientRect = () =>
        ({ top, height: SLIDES * VH }) as DOMRect;
      act(() => {
        window.dispatchEvent(new Event("scroll"));
        const batch = pending;
        pending = [];
        for (const cb of batch) cb(0);
      });
    };

    flush(-300); // sube 100px: primer frame creciente
    flush(-200); // sube 100px mas: segundo frame creciente -> rewind
    expect(result.current.direction).toBe("rewind");

    flush(-400); // baja 200px: vuelve a decrecer -> forward
    expect(result.current.direction).toBe("forward");
  });

  it("un delta menor que el umbral anti-jitter no cambia direction", () => {
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(-400, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );
    // La medicion inmediata de `start()` fija la linea base en -400.
    act(() => ioTrigger(true));

    const flush = (top: number): void => {
      track.getBoundingClientRect = () =>
        ({ top, height: SLIDES * VH }) as DOMRect;
      act(() => {
        window.dispatchEvent(new Event("scroll"));
        const batch = pending;
        pending = [];
        for (const cb of batch) cb(0);
      });
    };

    flush(-300); // sube 100px -> rewind
    expect(result.current.direction).toBe("rewind");

    flush(-301); // baja solo 1px, por debajo del umbral de 2px
    expect(result.current.direction).toBe("rewind");
  });

  it("bajo prefers-reduced-motion no se registra ningun rAF y el estado queda en reposo", () => {
    stubMatchMedia(true);
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );

    expect(raf).not.toHaveBeenCalled();
    // Contrato CERRADO del valor devuelto (regla 40 de RULES.md): se
    // actualiza la fuente de verdad del test al ampliar la API, no se relaja
    // la asercion. `scrollToSlide` (critica externa #10, hallazgo A) es la
    // tercera clave desde 2026-08-18; se compara su TIPO, porque la
    // identidad de la funcion cambia con cada render y `toEqual` sobre ella
    // no diria nada util.
    expect(Object.keys(result.current).sort()).toEqual([
      "direction",
      "index",
      "scrollToSlide",
    ]);
    expect(result.current.index).toBe(0);
    expect(result.current.direction).toBe("forward");
    expect(typeof result.current.scrollToSlide).toBe("function");
  });

  it("dos avisos seguidos de interseccion no arrancan dos bucles", () => {
    // Regresion: sin guarda de reentrada, cada aviso repetiria la medicion
    // inmediata y volveria a registrar los listeners de `scroll`/`resize`
    // -- una fuga que en produccion no da error, solo consume trabajo de mas
    // el resto de la sesion.
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const addSpy = vi.spyOn(window, "addEventListener");

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    renderHook(() => useSlideDeck(trackRef, stageRef, SLIDES));

    ioTrigger(true);
    ioTrigger(true);
    ioTrigger(true);

    const scrollRegistrations = addSpy.mock.calls.filter(
      ([type]) => type === "scroll",
    );
    expect(scrollRegistrations).toHaveLength(1);
  });

  it("al reentrar en la pista no se hereda el sentido del frame anterior", () => {
    // Regresion: al parar el bucle hay que olvidar la linea base. Si no, un
    // usuario que sale de Story, recorre media pagina y vuelve, compara su
    // primer frame contra un rect.top de hace miles de pixeles y ve un
    // `rewind` (o un `forward`) que no corresponde a ningun gesto suyo.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(-400, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );

    const flush = (top: number): void => {
      track.getBoundingClientRect = () =>
        ({ top, height: SLIDES * VH }) as DOMRect;
      act(() => {
        window.dispatchEvent(new Event("scroll"));
        const batch = pending;
        pending = [];
        for (const cb of batch) cb(0);
      });
    };

    // La medicion inmediata de `start()` fija la linea base en -400.
    act(() => ioTrigger(true));
    flush(-300); // sube -> rewind
    expect(result.current.direction).toBe("rewind");

    // Sale de la pista y vuelve muy por debajo: sin olvidar la linea base,
    // la medicion inmediata de la reentrada leeria un delta enorme contra
    // el -300 anterior en vez de solo fijar una linea base nueva.
    act(() => ioTrigger(false));
    track.getBoundingClientRect = () =>
      ({ top: -3000, height: SLIDES * VH }) as DOMRect;
    act(() => ioTrigger(true));
    expect(result.current.direction).toBe("rewind"); // sin cambio: solo fija linea base
  });

  it("al desmontar cancela el rAF pendiente y desconecta el observer", () => {
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { unmount } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );

    // La medicion inmediata de `start()` no usa rAF; hace falta un evento de
    // `scroll` para programar el rAF coalescido que luego se cancela.
    act(() => ioTrigger(true));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(raf).toHaveBeenCalled();

    const instance = mockInstances[0];
    unmount();

    expect(caf).toHaveBeenCalledWith(7);
    expect(instance.disconnect).toHaveBeenCalled();
  });

  it("varios eventos de scroll seguidos coalescen en un unico rAF pendiente", () => {
    let calls = 0;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn().mockImplementation(() => {
        calls += 1;
        return calls;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    renderHook(() => useSlideDeck(trackRef, stageRef, SLIDES));

    // La medicion inmediata de `start()` no consume rAF.
    act(() => ioTrigger(true));
    expect(calls).toBe(0);

    // El mock nunca ejecuta el callback (no hay `pending`), asi que el `raf`
    // programado por el primer evento sigue "pendiente" para los siguientes:
    // N eventos de scroll deben coalescer en UN solo rAF.
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });

    expect(calls).toBe(1);
  });

  it("al desactivarse la interseccion se quitan los listeners de scroll y resize", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    renderHook(() => useSlideDeck(trackRef, stageRef, SLIDES));

    act(() => ioTrigger(true));
    act(() => ioTrigger(false));

    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain("scroll");
    expect(removedTypes).toContain("resize");
  });
});

/*
 * `scrollToSlide` (critica externa #10, hallazgo A): la inversa de la
 * geometria que `measure()` calcula en el sentido directo. Existe para que el
 * rail de progreso del deck pueda ser un control real y no un adorno --
 * consumidor de hoy: `ScJourneyRailMark` via `JourneyDeckDark`
 * (`Journey.tsx`).
 *
 * Los numeros de estos tests NO son literales: se derivan de las mismas
 * constantes (`SLIDES`, `VH`, la cola) que usa el hook, para que sigan
 * describiendo la misma propiedad si alguna cambia (regla 39 de RULES.md).
 */
describe("useSlideDeck: scrollToSlide", () => {
  /** Alto de pista con la misma forma que usan Story/Journey: (N + cola) pantallas. */
  function pistaDe(cola: number): number {
    return (SLIDES + cola) * VH;
  }
  /** El mismo `span` que calcula `measure()`. */
  function spanDe(cola: number): number {
    return pistaDe(cola) - VH - cola * VH;
  }

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("scrollY", 0);
  });

  it("lleva el scroll al centro de la ventana de cada indice, con la pista en el origen del documento", () => {
    const cola = 0;
    const track = trackWith(0, pistaDe(cola));
    const trackRef = refOf(track);
    const stageRef = refOf(document.createElement("div"));
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    for (let k = 0; k < SLIDES; k += 1) {
      scrollTo.mockClear();
      act(() => result.current.scrollToSlide(k));
      expect(scrollTo).toHaveBeenCalledWith({
        top: (k / (SLIDES - 1)) * spanDe(cola),
        behavior: "smooth",
      });
    }
  });

  it("descuenta la cola del recorrido, igual que measure(): sobre la MISMA pista, el ultimo indice cae una pantalla antes", () => {
    const alto = pistaDe(1);
    const stageRef = refOf(document.createElement("div"));
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    const conCola = renderHook(() =>
      useSlideDeck(refOf(trackWith(0, alto)), stageRef, SLIDES, {
        tailScreens: 1,
      }),
    );
    act(() => conCola.result.current.scrollToSlide(SLIDES - 1));
    const topConCola = scrollTo.mock.calls.at(-1)?.[0].top as number;

    const sinCola = renderHook(() =>
      useSlideDeck(refOf(trackWith(0, alto)), stageRef, SLIDES),
    );
    act(() => sinCola.result.current.scrollToSlide(SLIDES - 1));
    const topSinCola = scrollTo.mock.calls.at(-1)?.[0].top as number;

    // Sin descontar la cola, el ultimo indice aterrizaria EXACTAMENTE una
    // pantalla mas abajo: dentro del tramo de hold, donde el deck ya no
    // avanza y la ultima diapositiva lleva rato quieta.
    expect(topConCola).toBe(alto - VH - VH);
    expect(topSinCola).toBe(alto - VH);
    expect(topSinCola - topConCola).toBe(VH);
  });

  it("suma la posicion de la pista en el documento (scrollY + rect.top), no solo el progreso", () => {
    const cola = 0;
    vi.stubGlobal("scrollY", 1234);
    const track = trackWith(500, pistaDe(cola));
    const trackRef = refOf(track);
    const stageRef = refOf(document.createElement("div"));
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    act(() => result.current.scrollToSlide(0));

    expect(scrollTo).toHaveBeenCalledWith({ top: 1734, behavior: "smooth" });
  });

  it("bajo prefers-reduced-motion el salto es instantaneo", () => {
    stubMatchMedia(true);
    const track = trackWith(0, pistaDe(0));
    const trackRef = refOf(track);
    const stageRef = refOf(document.createElement("div"));
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    act(() => result.current.scrollToSlide(2));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
  });

  it("no hace nada con una sola diapositiva ni con un recorrido de pista <= 0", () => {
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    const unaSola = renderHook(() =>
      useSlideDeck(
        refOf(trackWith(0, pistaDe(0))),
        refOf(document.createElement("div")),
        1,
      ),
    );
    act(() => unaSola.result.current.scrollToSlide(0));
    expect(scrollTo).not.toHaveBeenCalled();

    // Pista mas corta que el viewport: no hay tramo del que derivar
    // progreso, el mismo caso degenerado que measure() ya trata.
    const sinRecorrido = renderHook(() =>
      useSlideDeck(
        refOf(trackWith(0, VH / 2)),
        refOf(document.createElement("div")),
        SLIDES,
      ),
    );
    act(() => sinRecorrido.result.current.scrollToSlide(3));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("acota el indice al rango valido en vez de salirse de la pista", () => {
    const track = trackWith(0, pistaDe(0));
    const trackRef = refOf(track);
    const stageRef = refOf(document.createElement("div"));
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES),
    );
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    act(() => result.current.scrollToSlide(999));
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: spanDe(0),
      behavior: "smooth",
    });

    act(() => result.current.scrollToSlide(-5));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado en esta tarea: cambiar
   * `const span = rect.height - vh - optionsRef.current.tailScreens * vh` por
   * `rect.height - vh` en `scrollToSlide` pone en rojo el test de la cola
   * (aterriza una pantalla mas abajo); restaurada la linea, vuelve a verde.
   */
});

/*
 * Critica externa #16, decision del dueno: cada diapositiva consume
 * `DECK_SLIDE_TRAVEL` de scroll -- media pantalla -- en vez de una pantalla
 * entera. El recorte se hace en la ALTURA DE LA PISTA (`story.layers.ts`,
 * `journey.layers.ts`), no aqui: este hook nunca supuso que una diapositiva
 * midiera una pantalla, solo que la pista declara su recorrido en su propia
 * altura. Estos candados comprueban esa afirmacion, que es justo la que
 * autoriza a no tocar el hook.
 *
 * Se construye la pista con la MISMA formula que las dos secciones declaran en
 * CSS -- huecos por recorrido + pantalla del stage + cola -- porque jsdom no
 * hace layout: la geometria fabricada solo prueba algo si describe la pista
 * real.
 */
describe("useSlideDeck: recorrido por diapositiva (critica #16)", () => {
  const COLA = 1;
  /** Alto de la pista, misma aritmetica que STORY/JOURNEY_DECK_TRACK_HEIGHT. */
  const ALTO = (SLIDES - 1) * DECK_SLIDE_TRAVEL_SCREENS * VH + (1 + COLA) * VH;
  const SPAN = ALTO - VH - COLA * VH;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("scrollY", 0);
  });

  it("el span que reparte es exactamente (slides - 1) recorridos, no (slides - 1) pantallas", () => {
    // 800 px de vista, 6 diapositivas y media pantalla de recorrido: 5 huecos
    // de 400 px = 2.000 px de recorrido, frente a los 4.000 de antes.
    expect(SPAN).toBe((SLIDES - 1) * DECK_SLIDE_TRAVEL_SCREENS * VH);
    expect(SPAN).toBe(2000);
    expect(DECK_SLIDE_TRAVEL).toBe("50dvh");
  });

  it("el indice avanza una diapositiva por cada DECK_SLIDE_TRAVEL de scroll", () => {
    const track = trackWith(0, ALTO);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES, { tailScreens: COLA }),
    );

    const recorrido = DECK_SLIDE_TRAVEL_SCREENS * VH;
    for (let k = 0; k < SLIDES; k++) {
      // Salir y volver a entrar en cada paso: `start()` lleva guarda de
      // reentrada, asi que dos avisos seguidos de `true` no vuelven a medir.
      track.getBoundingClientRect = () =>
        ({ top: -k * recorrido, height: ALTO }) as DOMRect;
      act(() => ioTrigger(false));
      act(() => ioTrigger(true));

      expect(result.current.index, `a ${k * recorrido} px de la pista`).toBe(k);
    }
  });

  it("un salto de rueda largo no salta ninguna diapositiva: el indice sigue siendo el que corresponde a la posicion", () => {
    // 1.500 px de golpe (el gesto que la critica usa para probar el deck):
    // caen dentro del recorrido de la diapositiva 4 (1.500 / 400 = 3,75, que
    // redondea a 4). Lo que se ata NO es que el deck se resista al gesto --
    // el scroll es del usuario -- sino que el indice describa exactamente
    // donde esta la pagina, sin adelantarse ni quedarse corto.
    const track = trackWith(0, ALTO);
    const trackRef = refOf(track);
    const stageRef = refOf(document.createElement("div"));
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES, { tailScreens: COLA }),
    );

    const RUEDA = 1500;
    track.getBoundingClientRect = () =>
      ({ top: -RUEDA, height: ALTO }) as DOMRect;
    act(() => ioTrigger(true));

    const esperado = Math.round((RUEDA / SPAN) * (SLIDES - 1));
    expect(esperado).toBe(4);
    expect(result.current.index).toBe(esperado);
  });

  it("scrollToSlide sigue aterrizando en el centro de la ventana de cada indice con la pista recortada", () => {
    const track = trackWith(0, ALTO);
    const trackRef = refOf(track);
    const stageRef = refOf(document.createElement("div"));
    const { result } = renderHook(() =>
      useSlideDeck(trackRef, stageRef, SLIDES, { tailScreens: COLA }),
    );
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    act(() => result.current.scrollToSlide(SLIDES - 1));
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: SPAN,
      behavior: "smooth",
    });
  });

  /*
   * CANDADO DEL LOTE MULTIPLE (P0 de la critica externa #21, ola U,
   * 2026-09-08). Mismo defecto y misma raiz que en `useReveal`, y aqui es el
   * sentido de conmutacion CONTRARIO: al pasar de claro a oscuro, la
   * correccion del punto de lectura baja el scroll 1.438 px y mete la pista
   * del deck oscuro en el viewport DESPUES del `observe()`. El lote llega
   * `[false obsoleta, true vigente]` y `([entry])` leia la primera: `stop()`
   * con la pista en pantalla. Medido en navegador, rodando 1.000 px dentro
   * de la pista tras el gesto: `--journey-progress` NUNCA se escribia y
   * `data-slide` se quedaba en 0, 0, 0, 0, 0, 0.
   *
   * No hay pantalla en blanco en ese sentido (las diapositivas se apilan
   * visibles), asi que el sintoma no es lo que se ve sino lo que deja de
   * moverse: por eso este candado mira la variable, no el pixel.
   */
  it("lee la entrada VIGENTE del lote: [obsoleta false, vigente true] en UNA invocacion arranca el motor", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const track = trackWith(0, SLIDES * VH);
    const stage = document.createElement("div");
    const trackRef = refOf(track);
    const stageRef = refOf(stage);
    renderHook(() => useSlideDeck(trackRef, stageRef, SLIDES));

    act(() => ioLote([false, true]));

    expect(stage.style.getPropertyValue("--deck-progress")).toBe("0.0000");
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado y OBSERVADO en la ola L
   * (2026-09-03): cambiar `DECK_SLIDE_TRAVEL_SCREENS` de 0.5 a 1
   * (useSlideDeck.ts) pone en rojo DOS de los cuatro candados de este
   * describe -- el primero ("expected 4000 to be 2000") y el tercero
   * ("expected 2 to be 4": 1.500 px de rueda ya solo llegan a la diapositiva
   * 2). Los otros dos NO se ponen en rojo con ese bug, y conviene decirlo: el
   * segundo y el cuarto construyen la pista desde la propia constante, asi que
   * describen la geometria que sea coherente con ella -- protegen que el hook
   * REPARTE lo que la pista declara, no el valor concreto del recorrido, que
   * es lo que atan el primero y el tercero. Restaurado el valor, todo vuelve
   * a verde.
   */
});
