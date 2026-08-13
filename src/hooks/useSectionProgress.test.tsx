import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSectionProgress } from "./useSectionProgress";

const VH = 800;

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
 * Crearla inline dentro del callback de render devolveria un objeto NUEVO en
 * cada render y, como el efecto principal del hook depende de `ref`, se
 * resuscribiria entero cada vez que algo dispara un render -- leccion
 * 2026-07-31 (`useSlideDeck`, entonces `useStoryDeck`). En produccion el ref
 * viene de `useRef` y es estable de por vida.
 */
function refOf(el: HTMLElement) {
  return { current: el };
}

/** Seccion de prueba con `getBoundingClientRect` sustituible por test. */
function sectionWith(top: number, height: number): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height }) as DOMRect;
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

describe("useSectionProgress", () => {
  it("no escribe nada antes de intersecar", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef));

    // Aviso inicial habitual de un IntersectionObserver recien conectado: la
    // seccion todavia no esta en pantalla. Sin la guarda `hasEntered`, esto
    // ejecutaria la rama de "salida" y escribiria un reposo que nunca
    // sucedio.
    act(() => ioTrigger(false));

    expect(section.style.getPropertyValue("--section-enter")).toBe("");
    expect(section.style.getPropertyValue("--section-progress")).toBe("");
    expect(section.dataset.inview).toBeUndefined();
  });

  it("al intersecar escribe las dos variables y data-inview true", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    // vh=800, top=600: enter objetivo = (800-600)/(0.5*800) = 0.5;
    // progress objetivo = (800-600)/(800+800) = 0.125.
    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef));

    act(() => ioTrigger(true));

    expect(section.dataset.inview).toBe("true");
    // El primer frame es sincrono (mismo patron que `measure()` en
    // `useSlideDeck`): el lerp arranca desde 0 y avanza exactamente
    // `smooth` (0.12 por defecto) de la distancia al objetivo.
    expect(section.style.getPropertyValue("--section-enter")).toBe(
      (0.5 * 0.12).toFixed(4),
    );
    expect(section.style.getPropertyValue("--section-progress")).toBe(
      (0.125 * 0.12).toFixed(4),
    );
  });

  it("el lerp converge hacia el valor medido tras varios frames", () => {
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef));

    act(() => ioTrigger(true));

    for (let i = 0; i < 60; i += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(i * 16);
    }

    expect(
      Number(section.style.getPropertyValue("--section-enter")),
    ).toBeCloseTo(0.5, 2);
    expect(
      Number(section.style.getPropertyValue("--section-progress")),
    ).toBeCloseTo(0.125, 2);
  });

  it("al salir del viewport por abajo, vuelve a reposo (enter 0 / progress 0) y para el bucle", () => {
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", caf);
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef));

    act(() => ioTrigger(true));
    expect(section.dataset.inview).toBe("true");

    // El usuario revierte el scroll: la seccion vuelve a quedar por debajo
    // del viewport (bottom > 0) justo antes de que el observer avise de la
    // salida -- "salio por abajo" segun el criterio documentado en el hook.
    section.getBoundingClientRect = () =>
      ({ top: 900, height: VH, bottom: 900 + VH }) as DOMRect;
    act(() => ioTrigger(false));

    expect(caf).toHaveBeenCalled();
    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain("scroll");
    expect(removedTypes).toContain("resize");
    expect(section.dataset.inview).toBe("false");
    expect(section.style.getPropertyValue("--section-enter")).toBe("0.0000");
    expect(section.style.getPropertyValue("--section-progress")).toBe("0.0000");
  });

  it("al salir del viewport por arriba, vuelve a reposo (enter 1 / progress 1)", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef));

    act(() => ioTrigger(true));

    // La seccion entera queda por encima del viewport (bottom <= 0): "salio
    // por arriba" segun el criterio documentado en el hook.
    section.getBoundingClientRect = () =>
      ({ top: -900, height: VH, bottom: -100 }) as DOMRect;
    act(() => ioTrigger(false));

    expect(section.dataset.inview).toBe("false");
    expect(section.style.getPropertyValue("--section-enter")).toBe("1.0000");
    expect(section.style.getPropertyValue("--section-progress")).toBe("1.0000");
  });

  /*
   * Fix wave E, hallazgo E1 (evaluador de navegador real, 2026-08-13): ver
   * el docblock del respaldo de salida en `tick()` (useSectionProgress.ts)
   * para el diagnóstico completo, medido en Chrome real instrumentando
   * `IntersectionObserver` de verdad -- tras un scroll rápido que atraviesa
   * una sección de punta a punta, el observer entregó la ENTRADA pero nunca
   * la SALIDA, y `data-inview` se quedaba en `"true"` para siempre (el bucle
   * de `tick()` lo escribía sin condición mientras `running` siguiera
   * `true`, y nada volvía a comprobarlo).
   *
   * Este describe reproduce el CAMINO REAL del defecto en jsdom -- nunca
   * pilotando `dataset.inview` a mano -- ejerciendo exactamente los DOS
   * mecanismos reales que intervienen: el `IntersectionObserver` mockeado
   * (que aquí, a propósito, NUNCA vuelve a llamarse tras la entrada -- el
   * mismo silencio medido en el navegador) y un evento `scroll` real de
   * `window` (el listener que `start()` engancha mientras `running` es
   * `true`), que es quien de verdad actualiza la geometría cacheada
   * (`lastTop`/`lastHeight`/`lastVh`) que el respaldo lee.
   */
  describe("fix wave E, hallazgo E1 -- respaldo de salida cuando el observer nunca avisa", () => {
    function stubRafQueue(): {
      flush: (times: number) => void;
    } {
      let pending: FrameRequestCallback[] = [];
      vi.stubGlobal(
        "requestAnimationFrame",
        (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
      );
      vi.stubGlobal("cancelAnimationFrame", vi.fn());
      return {
        flush(times: number) {
          for (let i = 0; i < times; i += 1) {
            const batch = pending;
            pending = [];
            for (const cb of batch) cb(i * 16);
          }
        },
      };
    }

    it("si la geometría cacheada se aleja > 8px de la entrada tras un 'scroll' real, SIN que el observer vuelva a avisar, el bucle se auto-corrige a data-inview=false", () => {
      const { flush } = stubRafQueue();

      const section = sectionWith(600, VH);
      const sectionRef = refOf(section);
      renderHook(() => useSectionProgress(sectionRef));

      act(() => ioTrigger(true));
      expect(section.dataset.inview).toBe("true");
      // No debe haber ningun IntersectionObserver adicional -- sigue siendo
      // el mismo, mockInstances no crece por este respaldo.
      expect(mockInstances).toHaveLength(1);

      // La sección se desplaza CLARAMENTE fuera del viewport por abajo
      // (top=1000, muy por encima de VH=800) -- pero el observer NUNCA
      // vuelve a avisar (a propósito: ioTrigger NO se llama de nuevo en
      // este test), reproduciendo el silencio medido en el navegador real.
      section.getBoundingClientRect = () =>
        ({ top: 1000, height: VH, bottom: 1000 + VH }) as DOMRect;
      // El evento 'scroll' real es lo único que refresca la caché mientras
      // `running` sigue activo (`onScroll`, dentro del hook).
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });

      // Unos pocos frames de rAF para que `tick()` lea la caché ya
      // refrescada y dispare el respaldo.
      act(() => flush(3));

      expect(section.dataset.inview).toBe("false");
      // "Salió por abajo" (bottom > 0): mismo criterio que el test hermano
      // de arriba ("al salir del viewport por abajo").
      expect(section.style.getPropertyValue("--section-enter")).toBe("0.0000");
      expect(section.style.getPropertyValue("--section-progress")).toBe(
        "0.0000",
      );
    });

    it("NO deshace una entrada que llega justo al borde exacto del viewport (rect.top === innerHeight, cero px de solape real)", () => {
      // Reproduce el hallazgo REAL encontrado verificando este mismo fix en
      // navegador (Chrome, playwright-cli): una sección justo debajo de un
      // Hero a pantalla completa (`min-height: 100dvh`) puede empezar a
      // intersecar con `rect.top` EXACTAMENTE igual a `innerHeight` -- el
      // propio `IntersectionObserver` real ya lo cuenta como
      // `isIntersecting: true` (por eso llama a `start()`), pero la fórmula
      // estricta de este mismo respaldo (`lastTop < lastVh`), aplicada SIN
      // el margen de `topAtStart`/`SETTLE_TOLERANCE_PX`, la juzga "no
      // intersecta" y deshace la entrada en el mismo ciclo en que se creó.
      const { flush } = stubRafQueue();

      const section = sectionWith(VH, 0);
      const sectionRef = refOf(section);
      renderHook(() => useSectionProgress(sectionRef));

      act(() => ioTrigger(true));
      // Ni el primer tick síncrono (dentro de start()) ni varios frames más
      // sin ningún scroll real deben deshacer la entrada: `topAtStart` sigue
      // siendo la MISMA geometría que el propio observer acaba de validar.
      expect(section.dataset.inview).toBe("true");
      act(() => flush(3));
      expect(section.dataset.inview).toBe("true");
    });

    /*
     * Bug inyectado a propósito (regla 34), verificado en esta tarea:
     * sustituir la condición de guarda de `tick()` (useSectionProgress.ts,
     * `Math.abs(lastTop - topAtStart) > SETTLE_TOLERANCE_PX`) por `true` a
     * secas -- es decir, comprobar SIEMPRE la fórmula de intersección, sin
     * el margen de tolerancia -- pone en rojo el SEGUNDO test de este
     * describe ("NO deshace una entrada que llega justo al borde exacto"):
     * `data-inview` pasa a `"false"` en el mismo ciclo en que `start()` lo
     * puso a `"true"`, exactamente la regresión de falso positivo que
     * `topAtStart`/`SETTLE_TOLERANCE_PX` existen para evitar. El primer test
     * (salida real tras scroll sustancial) sigue en verde con el bug
     * inyectado -- esperado, porque ese escenario mueve la geometría muy por
     * encima de cualquier tolerancia razonable, así que no distingue "con
     * margen" de "sin margen". Restaurada la condición original, los dos
     * vuelven a verde.
     */
  });

  it("bajo reduced-motion no arranca ningun rAF y escribe el estado final estable", () => {
    stubMatchMedia(true);
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef));

    expect(raf).not.toHaveBeenCalled();
    expect(section.dataset.inview).toBe("true");
    expect(section.style.getPropertyValue("--section-enter")).toBe("1.0000");
    expect(section.style.getPropertyValue("--section-progress")).toBe("0.0000");
  });

  it('con cssVarPrefix: "hero" escribe --hero-enter/--hero-progress y NO --section-*', () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    renderHook(() => useSectionProgress(sectionRef, { cssVarPrefix: "hero" }));

    act(() => ioTrigger(true));

    expect(section.style.getPropertyValue("--hero-enter")).not.toBe("");
    expect(section.style.getPropertyValue("--hero-progress")).not.toBe("");
    expect(section.style.getPropertyValue("--section-enter")).toBe("");
    expect(section.style.getPropertyValue("--section-progress")).toBe("");
  });

  it("options nuevas en cada render no reinician el bucle (sin memoizacion exigida)", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    const { rerender } = renderHook(
      ({ smooth }: { smooth: number }) =>
        useSectionProgress(sectionRef, { smooth }),
      { initialProps: { smooth: 0.12 } },
    );

    act(() => ioTrigger(true));
    expect(mockInstances).toHaveLength(1);

    // Cada rerender crea un objeto `options` NUEVO (literal en la llamada
    // del propio test, igual que lo haria un consumidor real sin useMemo).
    rerender({ smooth: 0.5 });
    rerender({ smooth: 0.5 });

    expect(mockInstances).toHaveLength(1);
  });

  it("al desmontar durante la interseccion, cancela el rAF pendiente", () => {
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(7));
    vi.stubGlobal("cancelAnimationFrame", caf);

    const section = sectionWith(600, VH);
    const sectionRef = refOf(section);
    const { unmount } = renderHook(() => useSectionProgress(sectionRef));

    act(() => ioTrigger(true));
    unmount();

    expect(caf).toHaveBeenCalled();
  });
});
