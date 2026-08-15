import { useRef, type ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import { NAV_GROUPS } from "@/config/navigation";
import { useActiveSectionKey } from "./useActiveSection";
import { useSectionProgress } from "./useSectionProgress";

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

/*
 * Fix wave E, hallazgo E1 (evaluador de navegador real, 2026-08-13):
 * `aria-current` se desincroniza tras navegar por ancla y no se recupera.
 * Ver el docblock de `observeSectionInviewMutations` (`useActiveSection.ts`)
 * para el diagnóstico completo -- resumen: `evaluate()` solo se re-ejecutaba
 * en `scroll`/`resize`, una señal PROXY de "`data-inview` pudo haber
 * cambiado"; `data-inview` lo escribe de forma ASÍNCRONA el
 * `IntersectionObserver` de `useSectionProgress`, en una tarea posterior al
 * evento `scroll`. En scroll continuo la carrera se autocura (llegan más
 * eventos de inercia); tras un salto de ancla (`scroll-behavior: smooth`
 * nativo, sin inercia posterior) el ÚLTIMO `scroll` puede correr antes de
 * que el observer entregue, y como no vuelve a haber otro evento, la lectura
 * vieja se queda para siempre.
 *
 * Candado que recorre el CAMINO REAL, no `setInView()` a mano (regla
 * explícita del encargo: pilotar `dataset.inview` directamente es
 * exactamente el motivo por el que la suite existente -- los tests de
 * arriba, TODOS con `setInView` + `fireScroll()` en ese orden -- no vio
 * ninguno de los dos fallos de esta familia, porque ese orden simula
 * justamente el caso en el que la señal YA está actualizada antes del
 * scroll). Este harness monta `useSectionProgress` REAL (el mismo hook que
 * escribe `data-inview` en producción) sobre las cuatro secciones, con su
 * propio `IntersectionObserver` mockeado -- así `data-inview` cambia por el
 * mismo mecanismo asíncrono real, y el test puede reproducir la carrera
 * exacta: disparar el `scroll` ANTES de que el observer entregue, y NO
 * disparar ningún `scroll`/`resize` después (el paso que el salto de ancla
 * nunca da).
 */
describe("useActiveSectionKey: fix wave E, hallazgo E1 -- resincroniza tras un salto de ancla sin depender de otro scroll", () => {
  let ioTargets: { target: Element; emit: (isIntersecting: boolean) => void }[];

  function triggerFor(target: Element, isIntersecting: boolean): void {
    const instance = ioTargets.find((entry) => entry.target === target);
    if (!instance) {
      throw new Error("Ningun IntersectionObserver observa ese elemento");
    }
    instance.emit(isIntersecting);
  }

  function triggerForId(id: string, isIntersecting: boolean): void {
    const el = document.getElementById(id);
    if (!el) throw new Error(`no existe la sección de prueba #${id}`);
    triggerFor(el, isIntersecting);
  }

  let latestKey: string | null | undefined;

  function ActiveSectionHarness(): ReactElement {
    const storyRef = useRef<HTMLDivElement>(null);
    const journeyRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const contactRef = useRef<HTMLDivElement>(null);
    useSectionProgress(storyRef, { cssVarPrefix: "story" });
    useSectionProgress(journeyRef, { cssVarPrefix: "journey" });
    useSectionProgress(featuresRef, { cssVarPrefix: "features" });
    useSectionProgress(contactRef, { cssVarPrefix: "contact" });
    latestKey = useActiveSectionKey();
    return (
      <div>
        <div
          ref={storyRef}
          id="story"
        />
        <div
          ref={journeyRef}
          id="journey"
        />
        <div
          ref={featuresRef}
          id="features"
        />
        <div
          ref={contactRef}
          id="contact"
        />
      </div>
    );
  }

  beforeEach(() => {
    // El `beforeEach` del describe EXTERIOR (arriba en este mismo fichero)
    // ya corrió y montó, vía `mountSections()`, cuatro `<div>` vacíos con
    // estos mismos cuatro ids -- necesarios para los tests de arriba, que
    // pilotan `data-inview` a mano sobre ellos. Este describe monta su
    // PROPIO harness con elementos reales (`ActiveSectionHarness`, más
    // abajo) para los mismos cuatro ids: sin retirar los de
    // `mountSections()` primero, `document.getElementById` encontraría el
    // div vacío (el PRIMERO en el DOM), nunca el que de verdad tiene
    // `useSectionProgress` enganchado -- exactamente el motivo por el que
    // `triggerForId` fallaría con "ningún observer" pese a que el
    // IntersectionObserver del harness sí se creó.
    unmountSections();
    ioTargets = [];
    latestKey = undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private cb: (entries: { isIntersecting: boolean }[]) => void;
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          this.cb = cb;
        }
        observe(target: Element) {
          ioTargets.push({
            target,
            emit: (v: boolean) => this.cb([{ isIntersecting: v }]),
          });
        }
        disconnect() {}
      },
    );
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    stubMatchMedia(false);
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tras la última sección quedar marcada por un scroll adelantado a la entrega del observer, se resincroniza SIN un scroll adicional", async () => {
    render(<ActiveSectionHarness />);

    // Estado "antes del salto": el visitante estaba al final, en Contacto.
    await act(async () => {
      triggerForId("contact", true);
      window.dispatchEvent(new Event("scroll"));
      await Promise.resolve();
    });
    expect(latestKey).toBe("contact");

    // El salto de ancla mueve `scrollY` de golpe. El navegador despacha su
    // ÚLTIMO evento `scroll` de la animación ANTES de que el
    // IntersectionObserver de "story" (la sección de destino) entregue su
    // notificación para la posición final -- se modela disparando el
    // `scroll` mientras `data-inview` de las dos secciones SIGUE con el
    // valor de antes del salto (contact=true, story=false todavía).
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await Promise.resolve();
    });
    // Instante intermedio, esperado: `evaluate()` no tiene nada nuevo que
    // leer todavía, sigue en "contact".
    expect(latestKey).toBe("contact");

    // El IntersectionObserver entrega, tarde, la notificación real de la
    // navegación: "contact" sale de pantalla, "story" (el destino del
    // salto) entra. CERO eventos `scroll`/`resize` después de esto -- el
    // paso que un salto de ancla, sin inercia, nunca da.
    await act(async () => {
      triggerForId("contact", false);
      triggerForId("story", true);
      await Promise.resolve();
    });

    expect(latestKey).toBe("story");
    expect(latestKey).not.toBe("contact");
  });

  it("volviendo al Hero tras un salto (scrollY=0), ningún id queda marcado, sin un scroll adicional", async () => {
    render(<ActiveSectionHarness />);

    await act(async () => {
      triggerForId("journey", true);
      window.dispatchEvent(new Event("scroll"));
      await Promise.resolve();
    });
    expect(latestKey).toBe("journey");

    // Rueda hacia arriba hasta el Hero: el último `scroll` del gesto corre
    // antes de que el observer confirme que "journey" ya salió de pantalla.
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await Promise.resolve();
    });
    expect(latestKey).toBe("journey");

    // Entrega tardía, sin ningún scroll/resize posterior.
    await act(async () => {
      triggerForId("journey", false);
      await Promise.resolve();
    });

    expect(latestKey).toBeNull();
  });

  /*
   * Bug inyectado a propósito (regla 34): comentar la línea
   * `observeSectionInviewMutations();` dentro de `subscribe()`
   * (`useActiveSection.ts`) -- de modo que el módulo vuelva a depender
   * EXCLUSIVAMENTE de `scroll`/`resize` -- pone en rojo los dos tests de
   * arriba (`latestKey` se queda en "contact"/"journey" tras la entrega
   * tardía, en vez de resincronizar); restaurada la línea, vuelven a verde.
   * Documentado aquí en vez de dejado como comentario suelto en el fichero
   * de producción, mismo criterio que el resto de bugs inyectados de este
   * repo.
   */
});

/*
 * QA §6, hallazgo derivado del ítem 16 (2026-08-15): en el tema OSCURO este
 * módulo no resaltaba nada, nunca. Medido en navegador sobre build de
 * producción, 25 posiciones a lo largo de los 16.297 px de la página oscura:
 * `aria-current="location"` era `null` en los cuatro enlaces en LAS 25.
 *
 * La causa está en el docblock de `hasInviewSignal()` (`useActiveSection.ts`)
 * -- resumen: `data-inview` lo escribe `useSectionProgress`, que solo montan
 * los componentes de la rama CLARA; la oscura usa `useSlideDeck` y no escribe
 * ese atributo. La señal que este módulo lee NO EXISTE en ese árbol.
 *
 * POR QUÉ LA SUITE ENTERA ESTABA VERDE CON EL DEFECTO DELANTE, que es la
 * parte reutilizable: todos los tests de arriba llaman a `setInView()` antes
 * de medir, es decir, dan por supuesta la existencia de la señal. Ninguno
 * ejercitaba el caso "el atributo no está escrito en ningún sitio", que es
 * exactamente el estado de la mitad del sitio. `mountSections()` sí crea las
 * secciones sin el atributo, pero el único test que las deja así
 * ("empieza en null...") espera `null` -- y `null` era también la respuesta
 * equivocada del defecto, así que ese test pasaba igual.
 *
 * Los dos candados de abajo cubren las dos mitades de la condición, y hacen
 * falta las dos: que SIN señal se resuelva por geometría, y que CON señal
 * (aunque valga "false" en las cuatro) NO se caiga a geometría -- eso último
 * es lo que protege a la rama clara, donde "las cuatro en false" significa
 * "el lector está en el Hero" y `null` es la respuesta correcta.
 */
describe("useActiveSectionKey sin señal data-inview en el árbol (rama oscura)", () => {
  it("resuelve por geometría cuando NINGUNA sección declara data-inview", () => {
    // Sin `setInView`: las secciones quedan como las deja `mountSections`,
    // igual que las de la rama oscura, que nunca reciben el atributo.
    setRect("story", -900, 800);
    setRect("journey", 100, 800);
    setRect("features", 1900, 800);
    setRect("contact", 2900, 800);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("con el atributo presente y en 'false' en las cuatro NO cae a geometría: sigue devolviendo null aunque una intersecte", () => {
    for (const id of SECTION_IDS) setInView(id, false);
    setRect("story", -900, 800);
    setRect("journey", 100, 800);
    setRect("features", 1900, 800);
    setRect("contact", 2900, 800);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBeNull();
  });

  /*
   * Bug inyectado a propósito (regla 34): sustituir la condición de
   * `evaluate()` por la anterior a este arreglo (`isReducedMotion()` a secas,
   * sin `|| !hasInviewSignal()`) pone en rojo el primer test
   * ("expected null to be 'journey'"); restaurada, vuelve a verde. El segundo
   * test es el complementario -- se comprueba que sigue verde con la
   * condición puesta, porque su función es impedir que el arreglo se pase de
   * largo y pise la rama clara.
   */
});
