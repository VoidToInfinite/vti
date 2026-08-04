import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSlideDeck } from "./useSlideDeck";

const VH = 800;
const SLIDES = 6;

interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let mockInstances: MockIntersectionObserver[] = [];
let ioTrigger: (isIntersecting: boolean) => void;

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
    expect(result.current).toEqual({ index: 0, direction: "forward" });
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
