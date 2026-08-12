import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NAV_GROUPS } from "@/config/navigation";
import { useActiveSectionKey } from "./useActiveSection";

/** Mismos `key` que el hook deriva internamente de `NAV_GROUPS` (grupo
 *  `onSite`, items `kind: "section"`): "story", "journey", "features",
 *  "contact", en ese orden. Se derivan aquí de la MISMA fuente (regla 39),
 *  nunca de un array literal que pudiera desincronizarse de `navigation.ts`. */
const SECTION_IDS =
  NAV_GROUPS.find((group) => group.key === "onSite")
    ?.items.filter((item) => item.kind === "section")
    .map((item) => item.key) ?? [];

/** Monta en `document.body` un `<div>` por cada id de `SECTION_IDS`, vacíos
 *  de `data-inview` (como arrancan las secciones reales antes de su primera
 *  intersección, ver `useSectionProgress`). */
function mountSections(): void {
  for (const id of SECTION_IDS) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
}

function unmountSections(): void {
  for (const id of SECTION_IDS) {
    document.getElementById(id)?.remove();
  }
}

function setInView(id: string, inView: boolean): void {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no existe la sección de prueba #${id}`);
  el.dataset.inview = inView ? "true" : "false";
}

function fireScroll(): void {
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

/**
 * `evaluate()` llama a `window.matchMedia` de forma incondicional desde el
 * fix wave A (hallazgo A2) -- mismo motivo por el que `Story.test.tsx`/
 * `useSectionProgress.test.tsx` ya necesitan este stub para cualquier hook
 * que lea `prefers-reduced-motion`: sin él, jsdom lanza "matchMedia is not
 * a function" en el primer `scroll`/`resize`. `matches: false` por defecto
 * -- el camino normal (por `data-inview`), que es el que la mayoría de
 * tests de este fichero quiere ejercitar.
 */
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

/** Da a una sección de prueba (creada por `mountSections`) un
 *  `getBoundingClientRect` sustituible, mismo patrón que `sectionWith` en
 *  `useSectionProgress.test.tsx`. */
function setRect(id: string, top: number, height: number): void {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no existe la sección de prueba #${id}`);
  el.getBoundingClientRect = () =>
    ({ top, height, bottom: top + height }) as DOMRect;
}

beforeEach(() => {
  mountSections();
  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
  stubMatchMedia(false);
  Object.defineProperty(window, "innerHeight", {
    value: 800,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  unmountSections();
  vi.unstubAllGlobals();
});

describe("useActiveSectionKey", () => {
  it("empieza en null cuando ninguna sección tiene data-inview", () => {
    const { result } = renderHook(() => useActiveSectionKey());
    expect(result.current).toBeNull();
  });

  it("devuelve el key de la sección con data-inview='true' tras un scroll", () => {
    const { result } = renderHook(() => useActiveSectionKey());
    expect(result.current).toBeNull();

    setInView("journey", true);
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("no crea ningún IntersectionObserver propio (reutiliza data-inview, no un observer nuevo)", () => {
    const ObserverSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ObserverSpy);

    const { result } = renderHook(() => useActiveSectionKey());
    setInView("features", true);
    fireScroll();

    expect(result.current).toBe("features");
    expect(ObserverSpy).not.toHaveBeenCalled();
  });

  it("con dos secciones contiguas a la vez en data-inview='true', gana la ÚLTIMA en el orden de la página", () => {
    const { result } = renderHook(() => useActiveSectionKey());

    // "story" y "journey" solapando en la franja de transición: el usuario
    // ya ha visto casi toda "story" y está mirando "journey".
    setInView("story", true);
    setInView("journey", true);
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("vuelve a null cuando la sección deja de estar en pantalla", () => {
    const { result } = renderHook(() => useActiveSectionKey());

    setInView("contact", true);
    fireScroll();
    expect(result.current).toBe("contact");

    setInView("contact", false);
    fireScroll();
    expect(result.current).toBeNull();
  });

  it("se actualiza también con un evento resize", () => {
    const { result } = renderHook(() => useActiveSectionKey());

    setInView("features", true);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe("features");
  });

  it("singleton de módulo: dos componentes que llaman al hook a la vez comparten un único listener de scroll", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useActiveSectionKey());
    renderHook(() => useActiveSectionKey());

    const scrollCalls = addSpy.mock.calls.filter(([evt]) => evt === "scroll");
    expect(scrollCalls).toHaveLength(1);
    addSpy.mockRestore();
  });

  it("limpia los listeners de scroll/resize cuando se desmonta el último suscriptor", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useActiveSectionKey());

    unmount();

    const scrollCalls = removeSpy.mock.calls.filter(
      ([evt]) => evt === "scroll",
    );
    const resizeCalls = removeSpy.mock.calls.filter(
      ([evt]) => evt === "resize",
    );
    expect(scrollCalls.length).toBeGreaterThan(0);
    expect(resizeCalls.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });
});

/*
 * Fix wave A, hallazgo A2 (revisión final de rama). Bajo `reduce`,
 * `useSectionProgress.stopForReduced()` escribe `data-inview="true"` en las
 * CUATRO secciones a la vez y de forma PERMANENTE (ver su JSDoc) -- una
 * decisión correcta para su propio consumidor, pero que deja esa señal sin
 * significado para el scrollspy: antes de este arreglo, `evaluate()` seguía
 * leyendo `data-inview` sin condición y la ÚLTIMA sección del orden de
 * página ("contact") ganaba siempre, sin importar dónde estuviera el scroll
 * real -- `aria-current` quedaba clavado en "Contacto" para cualquier
 * visitante con `reduce` activado.
 *
 * Los tests de este describe simulan EXACTAMENTE ese estado (`reduce`
 * activo Y las cuatro secciones en `data-inview="true"`, el mismo valor
 * permanente que escribe `stopForReduced()`) y comprueban que el hook deja
 * de fiarse de esa señal: resuelve por geometría real
 * (`getBoundingClientRect`), no por el camino de `data-inview` que los
 * tests de arriba ya cubren para el caso normal (`reduce` inactivo).
 *
 * Verificado con un bug inyectado a propósito (informe de la tarea): al
 * revertir `evaluate()` a leer siempre `data-inview` sin ramificar por
 * `isReducedMotion()`, el primer `it` de este describe cae en rojo
 * (`result.current` da "contact" en vez de "journey"); restaurada la
 * ramificación, vuelve a verde.
 */
describe("useActiveSectionKey bajo prefers-reduced-motion: reduce (fix wave A, A2)", () => {
  beforeEach(() => {
    stubMatchMedia(true);
  });

  it("NO se marca 'contact' solo porque data-inview esté clavado en true ahí -- resuelve por geometría real", () => {
    // Mismo estado permanente que escribe `stopForReduced()`: las CUATRO
    // secciones en data-inview="true" a la vez, sin importar el scroll.
    for (const id of ["story", "journey", "features", "contact"]) {
      setInView(id, true);
    }
    // El scroll real está sobre "journey" (intersecta el viewport de
    // 800px); "story" ya quedó arriba del todo y "features"/"contact"
    // siguen por debajo, todavía sin llegar.
    setRect("story", -900, 800);
    setRect("journey", 100, 800);
    setRect("features", 2000, 800);
    setRect("contact", 3000, 800);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
    expect(result.current).not.toBe("contact");
  });

  it("sigue el scroll real al avanzar, con las cuatro secciones todavía en data-inview=true", () => {
    for (const id of ["story", "journey", "features", "contact"]) {
      setInView(id, true);
    }
    setRect("story", -1900, 800);
    setRect("journey", -900, 800);
    setRect("features", 100, 800);
    setRect("contact", 2000, 800);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("features");
  });

  it("devuelve null cuando ninguna sección intersecta el viewport (p.ej. todavía en el Hero)", () => {
    for (const id of ["story", "journey", "features", "contact"]) {
      setInView(id, true);
    }
    setRect("story", 900, 800);
    setRect("journey", 1900, 800);
    setRect("features", 2900, 800);
    setRect("contact", 3900, 800);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBeNull();
  });
});
