import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anchoredScrollY,
  captureReadingAnchor,
  dominantSectionId,
  restoreReadingAnchor,
  type ReadingAnchor,
  type SectionViewportGeometry,
} from "./themeScrollAnchor";

/*
 * jsdom no hace layout (CLAUDE.md §5.2): `getBoundingClientRect()` de un
 * elemento real siempre devuelve ceros. Las dos funciones PURAS de este
 * módulo (`dominantSectionId`, `anchoredScrollY`) se prueban con datos
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

describe("dominantSectionId", () => {
  it("devuelve null cuando ninguna sección interseca el viewport", () => {
    expect(
      dominantSectionId(
        [geometry("story", -3000, 2000), geometry("journey", VH + 10, 2000)],
        VH,
      ),
    ).toBeNull();
  });

  /*
   * El criterio que NO se comparte con `useActiveSection.ts` (ver el
   * docblock de cabecera del módulo): allí gana la ÚLTIMA en orden de
   * página que interseca, para que `aria-current` vaya por delante del
   * scroll. Aquí ese criterio mandaría al lector al principio de una
   * sección que apenas asoma. Este test fija la diferencia: `journey`
   * interseca (68 px) y aun así gana `story` (700 px).
   */
  it("gana la sección con MÁS superficie visible, no la última en orden de página", () => {
    const sections = [
      geometry("story", -1300, 2000),
      geometry("journey", VH - 68, 2000),
    ];
    expect(dominantSectionId(sections, VH)).toBe("story");
  });

  it("mide solo la parte visible: una sección más alta que el viewport aporta como mucho un viewport", () => {
    const sections = [
      geometry("features", -5000, 12000), // llena la pantalla entera
      geometry("contact", VH - 100, 4000), // asoma 100 px
    ];
    expect(dominantSectionId(sections, VH)).toBe("features");
  });

  it("ante un empate exacto gana la primera en orden de documento (la que ya se estaba leyendo)", () => {
    // Las dos aportan exactamente 384 px de superficie visible.
    const saliente = geometry("story", VH / 2 - 384, 384);
    const entrante = geometry("journey", VH / 2, 384);

    expect(dominantSectionId([saliente, entrante], VH)).toBe("story");
    // El desempate es el ORDEN, no el id: invertido gana la otra.
    expect(dominantSectionId([entrante, saliente], VH)).toBe("journey");
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
  it("captura la sección dominante con su posición de DOCUMENTO", () => {
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
