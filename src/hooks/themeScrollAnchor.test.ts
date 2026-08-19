import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anchoredScrollY,
  captureReadingAnchor,
  readingAnchorSectionId,
  restoreReadingAnchor,
  VIEWPORT_REFERENCE_FRACTION,
  type ReadingAnchor,
  type SectionViewportGeometry,
} from "./themeScrollAnchor";

/*
 * jsdom no hace layout (CLAUDE.md §5.2): `getBoundingClientRect()` de un
 * elemento real siempre devuelve ceros. Las dos funciones PURAS de este
 * módulo (`readingAnchorSectionId`, `anchoredScrollY`) se prueban con datos
 * sintéticos -- que es justo el motivo por el que la aritmética vive fuera
 * del hook --, y las dos que SÍ tocan el DOM se prueban con `rect` mockeado
 * a mano, mismo patrón que `useSceneParallax.test.tsx`/
 * `useThemeScrollReset.test.tsx`.
 *
 * `VH` se lee de `window.innerHeight` en vez de escribir 768 a mano: el
 * valor por defecto de jsdom es un dato del entorno, no de este test
 * (RULES.md regla 39).
 */
const VH = window.innerHeight;

function geometry(
  id: string,
  top: number,
  height: number,
): SectionViewportGeometry {
  return { id, top, height };
}

describe("readingAnchorSectionId", () => {
  it("devuelve null cuando ninguna sección interseca el viewport", () => {
    expect(
      readingAnchorSectionId(
        [geometry("story", -3000, 2000), geometry("journey", VH + 10, 2000)],
        VH,
      ),
    ).toBeNull();
  });

  /*
   * El caso BORDE del `null`, y no es teórico: aquí la lista de candidatas
   * NO viene pre-filtrada por intersección (a diferencia de
   * `useActiveSection`, que sí la filtra antes), así que el respaldo tiene
   * que exigir superficie ESTRICTAMENTE positiva. Una sección que apenas
   * roza el borde del viewport aporta exactamente 0 px y no se está
   * leyendo: sin esa exigencia ganaría el respaldo (`0 >= 0`) y este módulo
   * perdería la capacidad de contestar `null`.
   *
   * Escrito tras un bug inyectado que NO tiró ningún test: el caso de arriba
   * usa solapes NEGATIVOS (-1000 y -10 px), que fallan el respaldo por su
   * cuenta y dejaban la guarda sin observar. El cero exacto es el único
   * valor que la distingue.
   */
  it("una sección que solo roza el borde del viewport (0 px visibles) no es ancla", () => {
    expect(
      readingAnchorSectionId(
        [geometry("story", -2000, 2000), geometry("journey", VH, 2000)],
        VH,
      ),
    ).toBeNull();
  });

  /*
   * La mitad principal de la regla: manda la CONTENCIÓN del centro, no la
   * superficie. `journey` asoma 68 px y no contiene el centro; `story` sí.
   * (Aquí las dos mitades coinciden -- `story` es además la dominante -- y
   * eso es justo lo que hace este caso poco informativo por sí solo: ver el
   * de la frontera, más abajo, que es donde las dos reglas divergen.)
   */
  it("gana la sección que CONTIENE el centro del viewport", () => {
    const sections = [
      geometry("story", -1300, 2000),
      geometry("journey", VH - 68, 2000),
    ];
    expect(readingAnchorSectionId(sections, VH)).toBe("story");
  });

  it("una sección mucho más alta que el viewport contiene el centro y gana", () => {
    const sections = [
      geometry("features", -5000, 12000), // llena la pantalla entera
      geometry("contact", VH - 100, 4000), // asoma 100 px
    ];
    expect(readingAnchorSectionId(sections, VH)).toBe("features");
  });

  /*
   * EL CASO DE LA FRONTERA -- el defecto que la crítica externa #13 midió, y
   * el único punto en que la regla vieja (dominancia) y la nueva
   * (contención) dan respuestas distintas.
   *
   * Geometría reconstruida del caso medido (1440x900: claro y=3000 ->
   * oscuro y=13253, el lector pasa de Features a Journey): Features empieza
   * EXACTAMENTE en el centro de la pantalla, así que Journey y Features
   * enseñan 450 px cada una. Es la única geometría compatible con las dos
   * observaciones del informe a la vez -- que el centro cayera en Features y
   * que el ancla eligiera Journey.
   *
   * Con la regla vieja el empate de superficie lo ganaba la PRIMERA del
   * documento (`>`), es decir la saliente; con la nueva, el intervalo
   * SEMIABIERTO `[top, bottom)` deja el punto en la ENTRANTE -- la misma
   * respuesta que da `aria-current` en el navbar en esa misma posición.
   */
  it("en la frontera exacta (la entrante empieza justo en el centro) gana la ENTRANTE, como el scrollspy", () => {
    const centro = VH * VIEWPORT_REFERENCE_FRACTION;
    const saliente = geometry("journey", centro - 450, 450);
    const entrante = geometry("features", centro, 450);

    expect(readingAnchorSectionId([saliente, entrante], VH)).toBe("features");
    // No es un artefacto del orden de la lista: la contención no depende de
    // en qué orden lleguen las candidatas (a diferencia del desempate de
    // superficie, que sí dependía y por eso podía contradecir al scrollspy).
    expect(readingAnchorSectionId([entrante, saliente], VH)).toBe("features");
  });

  /*
   * El respaldo solo entra cuando el centro cae en un HUECO entre secciones
   * (el que separa el Hero de Story, o Story de Journey: el arte de fondo y
   * los márgenes de sección no son sección). Ahí sigue habiendo respuesta
   * -- la que más pantalla ocupa -- en vez de perder el ancla a mitad de
   * página.
   */
  it("con el centro en un hueco entre secciones, resuelve por superficie visible", () => {
    const centro = VH * VIEWPORT_REFERENCE_FRACTION;
    const sections = [
      geometry("story", -100, centro - 200), // termina 200 px sobre el centro
      geometry("journey", centro + 100, 50), // empieza 100 px bajo el centro
    ];
    expect(readingAnchorSectionId(sections, VH)).toBe("story");
  });

  /*
   * INVARIANTE QUE CRUZA DOS FICHEROS (regla 41): la fracción de referencia
   * de este módulo y la de `useActiveSection.ts` tienen que valer lo mismo,
   * o el ancla del cambio de tema y el `aria-current` del navbar vuelven a
   * responder distinto a la misma pregunta. No se puede importar (ese módulo
   * no la exporta y no es de esta tarea tocarlo), así que se lee su FUENTE
   * con los comentarios recortados -- si no se recortan, una línea comentada
   * pasaría por código activo (`task/lessons.md`, 2026-08-11).
   */
  it("comparte la fracción de referencia con useActiveSection.ts (candado de fuente)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "useActiveSection.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const match = /VIEWPORT_REFERENCE_FRACTION\s*=\s*([\d.]+)\s*;/.exec(source);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(VIEWPORT_REFERENCE_FRACTION);
  });
});

describe("anchoredScrollY", () => {
  const base = {
    scrollYBefore: 5000,
    anchorTopBefore: 4768,
    anchorHeightBefore: 2000,
    anchorHeightAfter: 2000,
    viewportHeight: VH,
    preserveOffset: true,
  };

  /*
   * LA PROPIEDAD MÁS IMPORTANTE: si el ancla no se movió, la corrección es
   * cero. Sin ella, cambiar de tema desde Story (primera sección tras un
   * hero que mide lo mismo en los dos temas) introduciría un tirón nuevo
   * justo donde hoy no hay ningún defecto.
   */
  it("con el ancla inmóvil devuelve EXACTAMENTE el scrollY de partida", () => {
    expect(anchoredScrollY({ ...base, anchorTopAfter: 4768 })).toBe(5000);
  });

  it("con el ancla desplazada compensa el arrastre exacto, ni un píxel más", () => {
    // Escenario reportado: Features baja 8.000 px al pasar a la rama oscura.
    expect(anchoredScrollY({ ...base, anchorTopAfter: 12768 })).toBe(13000);
  });

  it("conserva un desplazamiento NEGATIVO (lector en la franja de transición, con la sección empezando bajo el borde superior)", () => {
    expect(
      anchoredScrollY({
        ...base,
        scrollYBefore: 4668,
        anchorTopBefore: 4768,
        anchorTopAfter: 12768,
      }),
    ).toBe(12668);
  });

  it("recorta por arriba cuando la sección ENCOGE, para no salirse por su final", () => {
    // 4.000 px de recorrido heredados de un deck, contra una tarjeta de 1.500.
    expect(
      anchoredScrollY({
        ...base,
        scrollYBefore: 8768,
        anchorTopBefore: 4768,
        anchorTopAfter: 2000,
        anchorHeightBefore: 6000,
        anchorHeightAfter: 1500,
      }),
    ).toBe(2000 + (1500 - VH));
  });

  it("con la sección nueva más corta que el viewport aterriza en su inicio", () => {
    expect(
      anchoredScrollY({
        ...base,
        scrollYBefore: 8768,
        anchorTopBefore: 4768,
        anchorTopAfter: 2000,
        anchorHeightBefore: 6000,
        anchorHeightAfter: VH - 100,
      }),
    ).toBe(2000);
  });

  /*
   * El defecto que el techo incondicional introducía, cazado escribiendo
   * este mismo test: el hero mide EXACTAMENTE un viewport (`min-height:
   * 100dvh`), así que `alto - viewport` da 0 y cualquier lector con el hero
   * a medio pasar (aquí, 200 px dentro) saltaba a `top: 0` al cambiar de
   * tema -- el "vuelve al principio" que la Task 17 retiró, de vuelta por
   * la puerta de atrás. La sección no encogió: no hay nada que recortar.
   */
  it("una sección que mide exactamente un viewport y NO encoge conserva el desplazamiento (el hero no salta al top)", () => {
    expect(
      anchoredScrollY({
        ...base,
        scrollYBefore: 200,
        anchorTopBefore: 0,
        anchorTopAfter: 0,
        anchorHeightBefore: VH,
        anchorHeightAfter: VH,
      }),
    ).toBe(200);
  });

  it("sin preserveOffset aterriza en el inicio de la sección contenedora", () => {
    expect(
      anchoredScrollY({ ...base, anchorTopAfter: 900, preserveOffset: false }),
    ).toBe(900);
  });

  it("nunca devuelve un scrollY negativo", () => {
    expect(
      anchoredScrollY({
        ...base,
        scrollYBefore: 0,
        anchorTopBefore: 600,
        anchorTopAfter: 0,
      }),
    ).toBe(0);
  });

  /*
   * LA GARANTÍA QUE APORTA EL CRITERIO NUEVO (crítica externa #13), y el
   * motivo de fondo para cambiarlo: con el ancla elegida por CONTENCIÓN del
   * centro, `rect.top <= viewport/2` siempre, así que el desplazamiento
   * capturado (`-rect.top`) nunca baja de `-viewport/2` y, al restituirlo, el
   * centro cae DENTRO del ancla. Con dominancia esa cota no existía: una
   * sección podía dominar la pantalla asomando solo por abajo.
   *
   * Se barre el rango ENTERO de posiciones que el criterio nuevo puede
   * producir (de `rect.top = 0`, la sección justo empezando arriba, a
   * `rect.top = viewport/2`, la frontera exacta) contra un ancla que se
   * desplaza y otra que además crece, que es el caso real del cambio de tema.
   */
  it("tras el salto, el centro del viewport sigue DENTRO del ancla (garantía del criterio de contención)", () => {
    const vh = 900;
    const topBefore = 3450;
    const topAfter = 13703;

    for (let rectTop = 0; rectTop <= vh / 2; rectTop += 25) {
      const scrollYBefore = topBefore - rectTop;
      for (const heightAfter of [1250, 6000]) {
        const target = anchoredScrollY({
          scrollYBefore,
          anchorTopBefore: topBefore,
          anchorTopAfter: topAfter,
          anchorHeightBefore: 1250,
          anchorHeightAfter: heightAfter,
          viewportHeight: vh,
          preserveOffset: true,
        });
        const centroEnElAncla = target + vh / 2 - topAfter;
        expect(centroEnElAncla).toBeGreaterThanOrEqual(0);
        expect(centroEnElAncla).toBeLessThan(heightAfter);
      }
    }
  });
});

/* --- Las dos funciones que tocan el DOM ------------------------------- */

interface FakeRect {
  readonly top: number;
  readonly height: number;
}

interface SectionSpec {
  readonly id: string;
  readonly before: FakeRect;
  /** Geometría tras el cambio de tema. Ausente = la sección no se mueve. */
  readonly after?: FakeRect;
  /** `id` de la sección que la contiene (caso `#statement` en oscuro). */
  readonly parentId?: string;
}

let phase: "before" | "after" = "before";

function mountSections(specs: readonly SectionSpec[]): void {
  for (const spec of specs) {
    const el = document.createElement("section");
    el.id = spec.id;
    el.getBoundingClientRect = (): DOMRect => {
      const rect =
        phase === "after" ? (spec.after ?? spec.before) : spec.before;
      return {
        top: rect.top,
        bottom: rect.top + rect.height,
        height: rect.height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: rect.top,
        toJSON: () => ({}),
      } as DOMRect;
    };
    const parent =
      spec.parentId === undefined
        ? null
        : document.getElementById(spec.parentId);
    (parent ?? document.body).appendChild(el);
  }
}

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

/*
 * Maqueta compartida por los tests de DOM, con las cifras del defecto real
 * (crítica externa #8, 2026-08-17): documento claro de ~6.700 px contra
 * ~16.300 px en oscuro, con el crecimiento concentrado en los decks de
 * Story y Journey. El lector está 232 px dentro de Features.
 */
const LIGHT_TO_DARK: readonly SectionSpec[] = [
  { id: "hero", before: { top: -5000, height: VH } },
  {
    id: "story",
    before: { top: -5000 + VH, height: 2000 },
    after: { top: -5000 + VH, height: 6000 },
  },
  {
    id: "journey",
    before: { top: -2232, height: 2000 },
    after: { top: 1768, height: 6000 },
  },
  {
    id: "features",
    before: { top: -232, height: 2000 },
    after: { top: 7768, height: 2000 },
  },
];

let scrollToMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  phase = "before";
  setScrollY(0);
  scrollToMock = vi.fn();
  vi.stubGlobal("scrollTo", scrollToMock);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Captura el ancla y falla el test si no hay ninguna, para que los tests
 *  de `restoreReadingAnchor` no arrastren un `null` silencioso. */
function captureOrFail(): ReadingAnchor {
  const anchor = captureReadingAnchor();
  if (anchor === null) throw new Error("no se capturó ninguna ancla");
  return anchor;
}

describe("captureReadingAnchor", () => {
  it("captura la sección bajo el centro del viewport con su posición de DOCUMENTO", () => {
    mountSections(LIGHT_TO_DARK);
    setScrollY(5000);

    expect(captureReadingAnchor()).toEqual({
      id: "features",
      topDoc: 4768,
      height: 2000,
      scrollY: 5000,
    });
  });

  it("devuelve null cuando el documento no monta ninguna sección (páginas legales, 404)", () => {
    expect(captureReadingAnchor()).toBeNull();
  });

  /*
   * `#statement` en la rama oscura es la última diapositiva del deck de
   * Story (`<ScSlide as="section" id="statement">`), hija de un `ScStage`
   * con `position: sticky`: su caja se mueve CON el scroll, así que como
   * ancla mentiría. La regla estructural del módulo ("no anidada dentro de
   * otra sección") la deja fuera sin preguntar por `position` computada.
   */
  it("ignora las secciones anidadas dentro de otra sección", () => {
    /* La anidada tiene que ser ESTRICTAMENTE dominante para que el test
     * pruebe el filtro y no un empate: es la geometría real del caso, la
     * diapositiva pegada llena la pantalla (768 px visibles) mientras la
     * caja de su contenedor ya está casi entera por encima (400). */
    mountSections([
      { id: "story", before: { top: -3000, height: 3400 } },
      { id: "statement", before: { top: 0, height: VH }, parentId: "story" },
    ]);

    expect(captureReadingAnchor()?.id).toBe("story");
  });
});

describe("restoreReadingAnchor", () => {
  it("devuelve al lector al mismo punto de la MISMA sección tras el re-maquetado", () => {
    mountSections(LIGHT_TO_DARK);
    setScrollY(5000);
    const anchor = captureOrFail();

    phase = "after";
    // 12.768 (top nuevo de Features) + 232 (lo que llevaba leído de ella).
    expect(restoreReadingAnchor(anchor)).toBe(true);
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 13000,
      behavior: "instant",
    });
  });

  /*
   * `behavior: "instant"` NO es intercambiable con `"auto"`: `"auto"`
   * resuelve al `scroll-behavior` computado del elemento de scroll, que en
   * este sitio es `smooth` para todo el mundo salvo bajo reduce
   * (`GlobalStyles.tsx`, `html { scroll-behavior: smooth }`). Este candado
   * fija la palabra, no la intención.
   */
  it("nunca anima el reposicionamiento (jamás smooth ni auto)", () => {
    mountSections(LIGHT_TO_DARK);
    setScrollY(5000);
    const anchor = captureOrFail();

    phase = "after";
    restoreReadingAnchor(anchor);

    const [options] = scrollToMock.mock.calls[0] as [ScrollToOptions];
    expect(options.behavior).toBe("instant");
  });

  /*
   * El hero mide exactamente un viewport en las dos ramas, así que su ancla
   * no se mueve: la cuenta da el mismo `scrollY` y no se llama a `scrollTo`
   * en absoluto. Es el "si el lector está arriba, no toques el scroll" del
   * encargo, obtenido de la propia aritmética en vez de con un caso
   * especial escrito a mano.
   */
  it("no llama a scrollTo cuando el ancla no se movió (el lector con el hero a medio pasar)", () => {
    mountSections([
      { id: "hero", before: { top: -200, height: VH } },
      { id: "story", before: { top: VH - 200, height: 2000 } },
    ]);
    setScrollY(200);
    const anchor = captureOrFail();
    expect(anchor.id).toBe("hero");

    phase = "after";
    expect(restoreReadingAnchor(anchor)).toBe(false);
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("si el ancla dejó de ser una sección de primer nivel, aterriza en el inicio de la que la contiene", () => {
    // DOM con la forma de la rama OSCURA (`#statement` dentro del deck de
    // Story); el ancla se pasa a mano porque describe la captura hecha en
    // la rama CLARA, donde `#statement` era hermana de `#story`.
    mountSections([
      { id: "story", before: { top: -900, height: 8000 } },
      {
        id: "statement",
        before: { top: 0, height: VH },
        parentId: "story",
      },
    ]);
    setScrollY(6000);

    expect(
      restoreReadingAnchor({
        id: "statement",
        topDoc: 5900,
        height: 900,
        scrollY: 6000,
      }),
    ).toBe(true);
    // Cae a `#story` (contenedora) y aterriza en su inicio: -900 + 6000.
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 5100,
      behavior: "instant",
    });
  });

  it("no hace nada si el ancla desapareció del documento", () => {
    mountSections(LIGHT_TO_DARK);
    setScrollY(5000);
    const anchor = captureOrFail();

    document.body.innerHTML = "";
    expect(restoreReadingAnchor(anchor)).toBe(false);
    expect(scrollToMock).not.toHaveBeenCalled();
  });
});

/* --- Los tres casos MEDIDOS de la crítica externa #13 ------------------- */

/*
 * Maqueta en coordenadas de DOCUMENTO, reconstruida a partir de las tres
 * mediciones del integrador (1440x900) y de los dos altos de documento que
 * el informe da (claro 6.714 px, oscuro ~16.395 px). No es una maqueta
 * inventada: es la ÚNICA que reproduce los tres destinos medidos a la vez.
 *
 *   claro y=1200 -> oscuro y=1200   (story,    conserva)
 *   claro y=4200 -> oscuro y=14453  (features, conserva)
 *   claro y=3000 -> oscuro y=13253  (el caso que el informe da por roto)
 *
 * Cómo se llegó a ella: los dos casos que conservan fijan que el ancla se
 * desplaza 10.253 px y que Story es la única que cambia de alto, y el caso
 * que falla fija que Features empieza EXACTAMENTE en el centro de la
 * pantalla (3450 = 3000 + 900/2) -- es la única geometría en la que el
 * centro puede caer en Features mientras la regla de superficie elige otra,
 * porque con el centro dentro de Features ninguna vecina puede enseñar más
 * de 450 px y el empate perfecto es el único desenlace posible.
 *
 * LO QUE ESTE BLOQUE PUEDE Y NO PUEDE PROBAR: jsdom no hace layout, así que
 * los rects se sirven a mano y lo que se ata es la ARITMÉTICA y la ELECCIÓN
 * DE ANCLA, no el render. Que el lector vea de verdad Features en el centro
 * tras el salto en la página real es verificación de navegador, declarada
 * pendiente.
 */
interface DocBox {
  readonly top: number;
  readonly height: number;
}

const VH_MEDIDO = 900;

const CLARO: Record<string, DocBox> = {
  hero: { top: 0, height: 900 },
  story: { top: 900, height: 1500 },
  journey: { top: 2400, height: 1050 },
  features: { top: 3450, height: 1250 },
  contact: { top: 4700, height: 2014 }, // documento claro = 6.714 px
};

// Story absorbe los 10.253 px de crecimiento del deck oscuro; el resto de
// secciones conserva su alto y se desplaza en bloque.
const OSCURO: Record<string, DocBox> = {
  hero: { top: 0, height: 900 },
  story: { top: 900, height: 11753 },
  journey: { top: 12653, height: 1050 },
  features: { top: 13703, height: 1250 },
  contact: { top: 14953, height: 1442 }, // documento oscuro = 16.395 px
};

describe("crítica #13: los tres casos medidos en navegador (1440x900)", () => {
  let vhOriginal: number;

  function mountDoc(layout: Record<string, DocBox>): void {
    document.body.innerHTML = "";
    for (const [id, box] of Object.entries(layout)) {
      const el = document.createElement("section");
      el.id = id;
      el.getBoundingClientRect = (): DOMRect =>
        ({
          top: box.top - window.scrollY,
          bottom: box.top + box.height - window.scrollY,
          height: box.height,
          left: 0,
          right: 0,
          width: 0,
          x: 0,
          y: box.top - window.scrollY,
          toJSON: () => ({}),
        }) as DOMRect;
      document.body.appendChild(el);
    }
  }

  beforeEach(() => {
    vhOriginal = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      value: VH_MEDIDO,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      value: vhOriginal,
      writable: true,
      configurable: true,
    });
  });

  /*
   * EL CASO ROTO. Lo que esta ola corrige es la ELECCIÓN DE ANCLA: con la
   * regla vieja (superficie, empate a la primera) Journey y Features
   * enseñaban 450 px cada una y ganaba Journey -- la sección que el lector
   * está DEJANDO, y la que el navbar no anuncia. Con la regla nueva gana
   * Features, la misma que `aria-current` señala en esa posición exacta.
   *
   * El destino en píxeles (13.253) coincide en esta maqueta con el que daba
   * la regla vieja, y se afirma tal cual en vez de esconderlo: aquí Journey
   * mide lo mismo en los dos temas, así que las dos anclas se desplazan lo
   * mismo. La diferencia se vuelve visible en cuanto la sección saliente
   * cambia de alto entre ramas -- que es el caso general de este sitio y el
   * que cubre el candado de la garantía, más arriba.
   */
  it("y=3000 (frontera): el ancla es FEATURES, la sección que el navbar anuncia, no la saliente", () => {
    mountDoc(CLARO);
    setScrollY(3000);

    const anchor = captureOrFail();
    expect(anchor.id).toBe("features");
    expect(anchor.topDoc).toBe(3450);

    mountDoc(OSCURO);
    expect(restoreReadingAnchor(anchor)).toBe(true);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 13253,
      behavior: "instant",
    });
  });

  it("y=1200 (story): el ancla no se mueve y la corrección es cero", () => {
    mountDoc(CLARO);
    setScrollY(1200);

    const anchor = captureOrFail();
    expect(anchor.id).toBe("story");

    mountDoc(OSCURO);
    expect(restoreReadingAnchor(anchor)).toBe(false);
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("y=4200 (features, lejos de la frontera): conserva la sección y aterriza en 14.453", () => {
    mountDoc(CLARO);
    setScrollY(4200);

    const anchor = captureOrFail();
    expect(anchor.id).toBe("features");

    mountDoc(OSCURO);
    expect(restoreReadingAnchor(anchor)).toBe(true);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 14453,
      behavior: "instant",
    });
  });
});
