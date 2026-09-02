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

/**
 * La única sección de `SECTION_IDS` que NO escribe `data-inview` en ninguna
 * de las dos ramas de tema: `About` es plana a propósito -- sin escena, sin
 * deck y sin parallax -- así que no monta `useSectionProgress`, que es quien
 * escribe esa señal (ver "TERCERA CLASE DE SECCIÓN" en `useActiveSection.ts`).
 *
 * Es un literal y no una derivación PORQUE EL MODELO NO LO SABE: `NAV_GROUPS`
 * declara qué destinos existen, no qué hook monta cada componente. Lo sabe el
 * componente, y el candado de que sigue sin declarar el atributo vive junto a
 * él ("no declara data-inview: el scrollspy la resuelve por geometría en las
 * dos ramas", `About.test.tsx`).
 */
const SECTION_ID_SIN_SENAL = "about";

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

  /*
   * REESCRITO el 2026-08-18 (crítica externa #10). Hasta hoy este test se
   * llamaba "gana la ÚLTIMA en el orden de la página" y pilotaba las dos
   * secciones SIN geometría, así que afirmaba justamente el desempate que
   * resultó ser el defecto: sobre un `threshold` 0, la sección siguiente
   * ganaba desde su primer píxel de solape. La situación que cubre (dos
   * candidatas contiguas a la vez) es la misma; lo que cambia es quién
   * decide -- ver el describe del punto de referencia, más abajo, para el
   * caso medido en navegador y para el empate exacto.
   */
  it("con dos secciones contiguas a la vez en data-inview='true', decide la geometría, no el orden de la página", () => {
    // "story" ocupa tres cuartos del viewport y "journey" asoma por abajo:
    // el punto de referencia (el centro, 400 px de 800) cae dentro de "story".
    setInView("story", true);
    setInView("journey", true);
    setRect("story", -200, 800); // [-200, 600): 600 px visibles
    setRect("journey", 600, 800); // [600, 1400): 200 px visibles

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("story");
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

/**
 * Geometría REAL del hallazgo de la crítica externa #10, en coordenadas de
 * DOCUMENTO (tema claro, 1440x900, viewport de 800 px). `contact` NO formaba
 * parte de aquella medición: se coloca muy por debajo, fuera de todas las
 * posiciones que se prueban, en vez de inventarle una geometría "plausible"
 * que pareciera medida sin serlo.
 */
const FINDING_DOC_GEOMETRY: Readonly<
  Record<string, { readonly top: number; readonly bottom: number }>
> = {
  story: { top: 800, bottom: 1882 },
  journey: { top: 2442, bottom: 3076.6 },
  features: { top: 3077, bottom: 4573 },
  contact: { top: 9000, bottom: 9800 },
};

/** Coloca las cuatro secciones de prueba en la geometría del hallazgo para
 *  una posición de scroll dada (documento -> viewport). */
function applyFindingGeometry(scrollY: number): void {
  for (const [id, { top, bottom }] of Object.entries(FINDING_DOC_GEOMETRY)) {
    setRect(id, top - scrollY, bottom - top);
  }
}

/** Escribe `data-inview` como lo haría el `IntersectionObserver` real de
 *  `useSectionProgress` sobre esa misma geometría: `threshold` 0, "dentro" es
 *  cualquier solape mayor que cero. Es la parte del hallazgo que importa --
 *  con ese umbral, en la mayoría de posiciones hay DOS secciones marcadas a
 *  la vez, y el defecto vivía en cómo se elegía entre ellas. */
function applyFindingInviewSignal(scrollY: number): void {
  for (const [id, { top, bottom }] of Object.entries(FINDING_DOC_GEOMETRY)) {
    setInView(id, top - scrollY < window.innerHeight && bottom - scrollY > 0);
  }
}

/*
 * Crítica externa #10 (2026-08-18), hallazgo convergente en tres barridos
 * independientes: `aria-current="location"` se adelantaba. El desempate
 * anterior ("gana la última candidata en el orden de la página") sobre un
 * `threshold` 0 hacía que la sección SIGUIENTE ganara desde su primer píxel
 * de solape: medido en el tema claro, con el scroll en 2500 Viaje ocupaba el
 * 72 % del viewport y la navegación anunciaba «Características». Viaje solo
 * ganaba en una ventana de 395 px de scroll, y el mecanismo castigaba a toda
 * sección más corta que el viewport (Viaje mide 634,6 px de alto contra 800
 * de viewport).
 *
 * La regla nueva -- gana la sección que contiene el punto de referencia del
 * viewport (su centro), y solo en los huecos entre secciones decide la
 * superficie visible -- se prueba aquí en los DOS caminos del módulo, porque
 * el fichero de producción insiste en que se comporten igual: el normal (por
 * `data-inview`) y el de geometría (bajo `reduce`, y en la rama oscura, donde
 * nadie escribe ese atributo).
 *
 * Bug inyectado a propósito (regla 34), ejecutado en esta tarea: sustituir el
 * `return contiene ?? dominante;` de `resolveAmongCandidates()` por el
 * desempate viejo (`candidatas[candidatas.length - 1].id`, la última en orden
 * de página). Salida literal con él: 7 fallidos y 17 en verde de los 24 que el
 * fichero tenía ENTONCES (la crítica #14 añadió cuatro después, al final)
 * -- 6 de los 9 de este describe (entre ellos la posición 2500 del
 * hallazgo, "expected 'features' to be 'journey'") más el test reescrito del
 * primer describe. Restaurada la línea, los 24 vuelven a verde. Los 3 que NO
 * caen son los dos de empate exacto y el de una sola candidata: ahí las dos
 * reglas coinciden a propósito, y están para fijar la dirección documentada
 * del empate y el coste, no para distinguir una regla de la otra.
 */
describe("useActiveSectionKey: gana la sección del punto de referencia del viewport (crítica externa #10)", () => {
  it("con Viaje ocupando el 72 % del viewport, la activa es 'journey' -- no Características por asomar por abajo", () => {
    applyFindingGeometry(2500);
    applyFindingInviewSignal(2500);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("las seis posiciones medidas del hallazgo siguen al scroll sin adelantarse", () => {
    // Mismas posiciones de la tabla del hallazgo. Antes: Viaje solo en 2100;
    // Características ya desde 2300. Ahora el cambio ocurre cuando el centro
    // del viewport cruza el borde de Características (documento 3077, es
    // decir scrollY 2677), que es el 2700 de la tabla.
    const esperado: readonly (readonly [number, string])[] = [
      [2100, "journey"],
      [2300, "journey"],
      [2500, "journey"],
      [2700, "features"],
      [2900, "features"],
      [3050, "features"],
    ];

    const { result } = renderHook(() => useActiveSectionKey());

    for (const [scrollY, key] of esperado) {
      applyFindingGeometry(scrollY);
      applyFindingInviewSignal(scrollY);
      fireScroll();
      expect(result.current).toBe(key);
    }
  });

  it("empate exacto 50/50 entre dos contiguas: gana la de abajo, la que se está entrando", () => {
    setInView("journey", true);
    setInView("features", true);
    setRect("journey", -400, 800); // [-400, 400): 400 px visibles
    setRect("features", 400, 800); // [400, 1200): 400 px visibles

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("features");
  });

  it("un píxel antes del reparto exacto sigue ganando la de arriba: el cambio ocurre EN el 50/50", () => {
    setInView("journey", true);
    setInView("features", true);
    setRect("journey", -399, 800); // [-399, 401): 401 px visibles
    setRect("features", 401, 800); // [401, 1201): 399 px visibles

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("con el punto de referencia en un hueco entre secciones, decide la superficie visible", () => {
    setInView("story", true);
    setInView("journey", true);
    setRect("story", -500, 800); // [-500, 300): 300 px visibles
    setRect("journey", 700, 800); // [700, 1500): 100 px visibles
    // El centro (400) cae en el hueco (300, 700): ninguna lo contiene.

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("story");
  });

  it("empate exacto de superficie visible en un hueco: gana también la de abajo", () => {
    setInView("story", true);
    setInView("journey", true);
    setRect("story", -500, 800); // [-500, 300): 300 px visibles
    setRect("journey", 500, 800); // [500, 1300): 300 px visibles

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
  });

  /*
   * REESCRITO el 2026-09-02 (crítica externa #14). Hasta hoy este test se
   * llamaba "con una sola candidata NO se mide geometría: la señal ya decide"
   * y afirmaba, con un espía sobre `getBoundingClientRect`, que la señal se
   * devolvía SIN comprobar nada. Era el candado que sostenía la premisa falsa
   * del docblock de `resolveActiveKey()`, y el P0 de la crítica es su
   * consecuencia exacta: una señal fosilizada en un nodo sin dueño se
   * convertía en la respuesta del módulo en toda la página. Lo que se conserva
   * del test original es su intención -- que la resolución del camino normal
   * no mida más de lo que necesita --; lo que cambia es que ese "lo que
   * necesita" incluye ahora confirmar a la candidata.
   */
  it("con una sola candidata SÍ se mide geometría: la señal se valida, no se cree", () => {
    /* La señal se declara en TODAS las secciones que la escriben, como hace
       la rama clara real en cada frame de su observer -- `false` es una
       opinión, no una ausencia. La única que la deja sin declarar es
       `SECTION_ID_SIN_SENAL`: ver su docblock. */
    for (const id of SECTION_IDS) {
      if (id !== SECTION_ID_SIN_SENAL) setInView(id, id === "features");
    }
    const el = document.getElementById("features");
    if (!el) throw new Error("no existe la sección de prueba #features");
    const rectSpy = vi.fn(
      () => ({ top: 100, height: 800, bottom: 900 }) as DOMRect,
    );
    el.getBoundingClientRect = rectSpy;
    // Y solo la candidata: mientras la señal se sostenga, las que dicen
    // `false` NO se miden -- el coste que el docblock sí declara, y ese no ha
    // cambiado. La que no declara nada SÍ se mide, y ese es el coste NUEVO
    // que el mismo docblock declara desde D2: sin medirla no hay ninguna otra
    // evidencia sobre ella.
    const spiesPorId = new Map<string, ReturnType<typeof vi.fn>>();
    for (const id of SECTION_IDS.filter((otro) => otro !== "features")) {
      const otro = document.getElementById(id);
      if (!otro) throw new Error(`no existe la sección de prueba #${id}`);
      const spy = vi.fn(() => ({ top: 0, height: 0, bottom: 0 }) as DOMRect);
      otro.getBoundingClientRect = spy;
      spiesPorId.set(id, spy);
    }

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("features");
    expect(rectSpy).toHaveBeenCalled();
    for (const [id, spy] of spiesPorId) {
      if (id === SECTION_ID_SIN_SENAL) {
        expect(
          spy,
          "la sección sin señal no se midió: sin geometría no hay ninguna evidencia sobre ella",
        ).toHaveBeenCalled();
      } else {
        expect(
          spy,
          `${id} declaró "false" y aun así se midió`,
        ).not.toHaveBeenCalled();
      }
    }
  });

  it("bajo prefers-reduced-motion, con las cuatro clavadas en data-inview=true, misma regla y misma respuesta", () => {
    // `stopForReduced()` de `useSectionProgress` escribe "true" en las cuatro
    // de forma permanente (ver el describe de la fix wave A, más abajo): la
    // señal deja de significar "visible ahora" y solo queda la geometría.
    stubMatchMedia(true);
    applyFindingGeometry(2500);
    for (const id of SECTION_IDS) setInView(id, true);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("rama oscura (ningún data-inview en el árbol): misma regla y misma respuesta", () => {
    applyFindingGeometry(2500);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
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

  it("una sección REMONTADA (nodo nuevo) que escribe data-inview resincroniza sin un scroll adicional", async () => {
    // Crítica externa #14, integración de la ola J (2026-09-02). Al cambiar
    // de tema, Story y Journey se remontan como nodos NUEVOS. El observer
    // que se ataba a los cuatro nodos del primer montaje seguía observando
    // los fantasmas: medido en Chrome, tras conmutar y saltar a scrollY=1200
    // el scroll leía story="false" (rancio), la regla «cuatro en false» daba
    // null, el IntersectionObserver escribía "true" unos ms después y nadie
    // volvía a evaluar -- aria-current vacío hasta el siguiente scroll.
    render(<ActiveSectionHarness />);

    await act(async () => {
      triggerForId("contact", true);
      window.dispatchEvent(new Event("scroll"));
      await Promise.resolve();
    });
    expect(latestKey).toBe("contact");

    // El cambio de tema: el nodo de "story" desaparece y otro ocupa su id.
    const viejo = document.getElementById("story");
    if (!viejo) throw new Error("no existe la sección de prueba #story");
    viejo.remove();
    const nuevoNodo = document.createElement("div");
    nuevoNodo.id = "story";
    document.body.appendChild(nuevoNodo);

    // Último scroll ANTES de que el observer de la sección nueva entregue:
    // contact ya salió ("false", escrito por su observer de siempre) y el
    // nodo nuevo aún no tiene atributo. Con señal presente y ninguna en
    // "true", la respuesta correcta en este instante es null.
    await act(async () => {
      triggerForId("contact", false);
      window.dispatchEvent(new Event("scroll"));
      await Promise.resolve();
    });
    expect(latestKey).toBeNull();

    // Entrega tardía SOLO sobre el NODO NUEVO -- ninguna otra sección muta y
    // no hay ningún evento de scroll después. Es exactamente el estado que
    // el observer por nodo no podía ver: el nodo observado ya no existe.
    await act(async () => {
      nuevoNodo.dataset.inview = "true";
      await Promise.resolve();
    });

    expect(latestKey).toBe("story");
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

/*
 * CRÍTICA EXTERNA #14 (2026-09-02), P0 y su derivado P2, los dos reproducidos
 * byte a byte en Chrome real antes de tocar nada.
 *
 * P0: tras conmutar el tema con la lectura en Características, `features`
 * conservaba `data-inview="true"` y `contact` `"false"` -- fósiles escritos por
 * la rama clara sobre nodos que React REUTILIZA entre ramas (ver el bloque
 * "DUEÑO DEL NODO Y RETRACCIÓN" de `useSectionProgress.ts`, arreglado en la
 * misma ola). Con una sola candidata, este módulo la devolvía SIN mirar
 * geometría, así que `aria-current` decía `/#features` en las cinco posiciones
 * barridas (centro real: hero, story, journey, journey, about) y el enlace de
 * idioma aterrizaba en `scrollY = 13.372` de la home inglesa.
 *
 * P2: con `scrollY = 0` en claro, el centro del viewport está en el Hero pero
 * Story ya asoma por abajo -- única candidata --, así que el respaldo por
 * dominancia la elegía: `/#story`. En oscuro, misma posición, `null`. Dos
 * temas, dos respuestas.
 *
 * POR QUÉ LA SUITE ESTABA VERDE CON LOS DOS DEFECTOS DELANTE: todos los tests
 * de arriba escriben la señal Y la geometría de acuerdo entre sí (o pilotan
 * solo la señal), que es exactamente el estado que el defecto rompe. Ninguno
 * preguntaba qué pasa cuando la señal MIENTE, ni comparaba la respuesta de los
 * dos caminos en la MISMA posición.
 */
describe("useActiveSectionKey: la señal se valida contra geometría (crítica externa #14)", () => {
  it("una candidata fosilizada muy por DEBAJO del viewport no gana: contesta la geometría de las cuatro", () => {
    // `features` quedó marcada por la rama clara y su nodo sobrevivió al
    // cambio de tema; el lector está en Viaje, que no declara el atributo (su
    // deck oscuro es un componente distinto y remontó sin él).
    setInView("features", true);
    setRect("story", -900, 800);
    setRect("journey", 100, 800); // contiene el centro (400)
    setRect("features", 3000, 800);
    setRect("contact", 5000, 800);

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("journey");
    expect(result.current).not.toBe("features");
  });

  it("y tampoco si el fósil quedó muy por ENCIMA del viewport", () => {
    // La otra mitad del barrido medido: con el lector al final de la página,
    // el fósil de Características ya salió por arriba hace miles de píxeles.
    setInView("features", true);
    setRect("story", -9000, 800);
    setRect("journey", -5000, 800);
    setRect("features", -3000, 800);
    setRect("contact", 100, 800); // contiene el centro (400)

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("contact");
  });

  it("con el centro del viewport en el Hero la respuesta es null, y es la MISMA con señal y sin ella", () => {
    // Geometría del P2: Story asoma 100 px por el borde inferior, pero el
    // centro (400 de 800) sigue en el Hero, que no tiene entrada de navegación.
    //
    // Los dos caminos se ejercitan sobre la MISMA geometría a propósito. Lo
    // que la crítica midió fueron dos respuestas distintas (claro `/#story`,
    // oscuro `null`) en la misma posición de scroll, pero la geometría real de
    // los dos temas no coincide -- son dos maquetados distintos --, así que
    // reproducir aquí esas dos cifras sería inventarse un dato. Lo que sí es
    // reproducible, y es la propiedad que hace irrelevante el tema, es que la
    // REGLA conteste lo mismo cuando la geometría es la misma.
    function colocarEnElHero(): void {
      setRect("story", 700, 800);
      setRect("journey", 1600, 800);
      setRect("features", 2500, 800);
      setRect("contact", 3400, 800);
    }

    // Rama OSCURA: nadie escribe el atributo, resuelve por geometría.
    colocarEnElHero();
    const oscuro = renderHook(() => useActiveSectionKey());
    fireScroll();
    expect(oscuro.result.current).toBeNull();
    oscuro.unmount();

    // Rama CLARA: el IntersectionObserver (threshold 0) marca Story, que sí
    // asoma. Misma posición, misma respuesta.
    colocarEnElHero();
    for (const id of SECTION_IDS) setInView(id, id === "story");
    const claro = renderHook(() => useActiveSectionKey());
    fireScroll();
    expect(claro.result.current).toBeNull();
  });

  it("en cuanto el centro entra en la primera sección, la respuesta vuelve a existir", () => {
    // Frontera del candado anterior: un píxel más de scroll y Story contiene
    // el punto de referencia. La regla del Hero no puede apagar el resaltado
    // más allá de su propio tramo.
    setRect("story", 400, 800); // [400, 1200): contiene el centro (400)
    setRect("journey", 1300, 800);
    setRect("features", 2200, 800);
    setRect("contact", 3100, 800);
    for (const id of SECTION_IDS) setInView(id, id === "story");

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("story");
  });

  /*
   * Bugs inyectados a propósito (regla 34), ejecutados en esta tarea -- rojo
   * literal en el informe de la ola J:
   *
   * - Devolver `conSenalActiva[0].id` sin validar (la versión anterior a la
   *   crítica #14) pone en rojo los dos primeros tests de este describe.
   * - Hacer que `resolveVisibleSection()` llame a `resolveAmongCandidates()`
   *   sin la guarda de `referenceReachedFirstSection()` pone en rojo el
   *   tercero ("expected 'story' to be null"), y lo pone en su PRIMERA
   *   aserción: sin la guarda, la dominancia elige Story en los DOS caminos,
   *   no solo en el de la señal.
   */
});

/*
 * LA SECCIÓN QUE LA SEÑAL NO DESCRIBE (decisión del dueño D2, 2026-09-02;
 * crítica externa #15, hallazgo C 5).
 *
 * `about` entra en la navegación y, con ella, en `ACTIVE_SECTION_IDS` -- que
 * se deriva del grupo `onSite` de `NAV_GROUPS`, así que no hubo que
 * enumerarla en ningún sitio. Lo que sí hubo que resolver es que `About` NO
 * escribe `data-inview`: es plana a propósito (sin escena, sin deck, sin
 * parallax), así que no monta `useSectionProgress`.
 *
 * EL DEFECTO QUE CIERRA ESTE DESCRIBE, y por qué solo aparecía en una rama:
 * en la CLARA las otras cuatro sí escriben la señal, así que `haySenal` es
 * cierto y el camino normal decidía solo -- y `about`, que no está marcada,
 * no podía ser candidata NUNCA. Con el centro del viewport dentro de About,
 * la única marcada era Contacto (sigue asomando por arriba, `threshold` 0) y
 * el módulo contestaba «contact» con el lector en otra sección. En OSCURO,
 * donde nadie escribe la señal, la geometría ya contestaba «about». Dos
 * ramas, dos respuestas a la misma pregunta.
 *
 * Los dos caminos se ejercitan sobre la MISMA geometría a propósito, igual
 * que hace el describe de la crítica #14: lo que se afirma no es "contesta
 * about", es "contesta LO MISMO mire quien mire".
 */
describe("useActiveSectionKey: about entra aunque no escriba data-inview (D2)", () => {
  /** Geometría común: el lector ha pasado Contacto, que todavía asoma por
   *  arriba, y tiene About bajo el centro del viewport (400 de 800). */
  function aboutBajoElCentro(): void {
    setRect("story", -3000, 800);
    setRect("journey", -2200, 800);
    setRect("features", -1400, 800);
    setRect("contact", -600, 800); // [-600, 200): asoma 200 px por arriba
    setRect("about", 200, 800); // [200, 1000): contiene el centro (400)
  }

  it("rama clara: con el centro del viewport en About la activa es 'about', no Contacto por seguir marcada", () => {
    aboutBajoElCentro();
    // La señal tal y como la escribe el observer real (threshold 0): Contacto
    // solapa, las otras dos no. About no la escribe en ninguna rama.
    for (const id of SECTION_IDS) {
      if (id !== SECTION_ID_SIN_SENAL) setInView(id, id === "contact");
    }

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("about");
    expect(result.current).not.toBe("contact");
  });

  it("rama oscura (ningún data-inview en el árbol): misma geometría, misma respuesta", () => {
    aboutBajoElCentro();

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("about");
  });

  it("y no se adelanta: con el centro todavía en Contacto la activa sigue siendo 'contact'", () => {
    // Un solo píxel antes de la frontera: el centro (400) cae dentro de
    // Contacto, que llega hasta 401. About empieza en 401 y no lo contiene.
    setRect("story", -2799, 800);
    setRect("journey", -1999, 800);
    setRect("features", -1199, 800);
    setRect("contact", -399, 800); // [-399, 401): contiene el centro (400)
    setRect("about", 401, 800);
    for (const id of SECTION_IDS) {
      if (id !== SECTION_ID_SIN_SENAL) setInView(id, id === "contact");
    }

    const { result } = renderHook(() => useActiveSectionKey());
    fireScroll();

    expect(result.current).toBe("contact");
  });
});
