import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { Features } from "./Features";
import {
  FEATURE_KEYS,
  FEATURES_OVERLAY_RISE,
  FEATURES_DARK_HEIGHT,
  FEATURES_CONTENT_MAX_WIDTH,
  FEATURES_TAIL_HOLD,
} from "./features.layers";
import {
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_TAIL_SCREENS,
} from "@/components/sections/Journey/journey.layers";
import { FEATURES_ORBITAL_LAYERS } from "@/components/featuresCelestialOrbital/featuresCelestialOrbital.layers";
import { themes } from "@/theme/themes";
import enHome from "@/i18n/locales/en/home.json";
import esHome from "@/i18n/locales/es/home.json";

let trigger: (isIntersecting: boolean) => void;

/** Texto de TODAS las reglas CSS inyectadas por styled-components hasta el
 *  momento (mismo helper que `Journey.test.tsx`/`Story.test.tsx`). */
function injectedCss(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join("\n");
}

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * CONCRETO (mismo helper que `Journey.test.tsx`): filtra por las clases del
 * propio elemento, así que a diferencia de `injectedCss()` no arrastra el
 * resto del stylesheet acumulado -- imprescindible para acotar un guard de
 * `@media` a un solo componente sin caer en la trampa ya registrada
 * (task/lessons.md, 2026-08-02: "un test que trocea el CSS inyectado por
 * @media se contamina con el stylesheet entero").
 */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = (v) => cb([{ isIntersecting: v }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

const BULLET_KEYS = ["one", "two", "three", "four"] as const;

describe("Features", () => {
  it("es una region con su nombre accesible real (los tres terminos del h2, no un aria-labelledby colgando)", () => {
    // Los tres spans de color del h2 concatenan sin espacio en el .html
    // exportado del mockup (ver comentario en Features.tsx); el nombre
    // accesible real de la region debe leer las tres palabras separadas.
    renderWithProviders(<Features />);
    const expectedName = [
      esHome.Home.features.learning.title,
      esHome.Home.features.imagination.title,
      esHome.Home.features.gaming.title,
    ].join(" ");

    const region = screen.getByRole("region", { name: expectedName });
    expect(region).toHaveAccessibleName(expectedName);
    expect(region).toHaveAttribute("id", "features");
  });

  it("muestra el kicker de i18n", () => {
    renderWithProviders(<Features />);
    expect(screen.getByText(esHome.Home.features.kicker)).toBeInTheDocument();
  });

  it("las tres tarjetas muestran su titulo y su cuerpo de i18n", () => {
    renderWithProviders(<Features />);
    FEATURE_KEYS.forEach((key) => {
      const copy = esHome.Home.features[key];
      expect(
        screen.getByRole("heading", { level: 3, name: copy.title }),
      ).toBeInTheDocument();
      expect(screen.getByText(copy.body)).toBeInTheDocument();
    });
  });

  it("expone los 12 bullets (4 por tarjeta x 3 tarjetas) con su texto de i18n", () => {
    renderWithProviders(<Features />);
    let count = 0;
    FEATURE_KEYS.forEach((key) => {
      BULLET_KEYS.forEach((bulletKey) => {
        const text = esHome.Home.features[key].bullets[bulletKey];
        expect(screen.getByText(text)).toBeInTheDocument();
        count += 1;
      });
    });
    expect(count).toBe(12);
  });

  it("cada figura trae alt de i18n y srcset con las dos pistas (640/1024)", () => {
    const { container } = renderWithProviders(<Features />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(3);

    FEATURE_KEYS.forEach((key) => {
      const alt = esHome.Home.features[key].figureAlt;
      const img = images.find((el) => el.getAttribute("alt") === alt);
      expect(img).toBeDefined();
      const srcset = img?.getAttribute("srcset") ?? "";
      expect(srcset).toContain("640w");
      expect(srcset).toContain("1024w");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
    });
  });

  it("los tres CTA de texto apuntan a #contact", () => {
    renderWithProviders(<Features />);
    FEATURE_KEYS.forEach((key) => {
      const ctaText = esHome.Home.features[key].cta;
      const cta = screen.getByRole("link", {
        name: new RegExp(ctaText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      });
      expect(cta).toHaveAttribute("href", "#contact");
    });
  });

  it("el grid empieza sin revelar y pasa a revelado al intersecar", () => {
    const { container } = renderWithProviders(<Features />);
    const items = container.querySelectorAll("[data-revealed]");
    expect(items).toHaveLength(FEATURE_KEYS.length);
    items.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "false"),
    );

    act(() => trigger(true));

    const revealedItems = container.querySelectorAll("[data-revealed]");
    expect(revealedItems).toHaveLength(FEATURE_KEYS.length);
    revealedItems.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "true"),
    );
  });

  it("escalona el transition-delay de cada tarjeta segun su indice (120ms)", () => {
    const { container } = renderWithProviders(<Features />);
    const items = Array.from(container.querySelectorAll("[data-revealed]"));
    expect(items).toHaveLength(FEATURE_KEYS.length);
    items.forEach((item, index) => {
      // jsdom SI resuelve el longhand `transition-delay` de una shorthand
      // `transition` declarada en styled-components (lección repo,
      // task/lessons.md 2026-07-25/27) -- lo que NO resuelve es ningun
      // @media, de ahi el test aparte de mas abajo.
      expect(getComputedStyle(item).transitionDelay).toBe(`${index * 120}ms`);
    });
  });

  it("paridad es/en: las claves de features existen en los dos locales", () => {
    expect(Object.keys(enHome.Home.features)).toEqual(
      Object.keys(esHome.Home.features),
    );
    FEATURE_KEYS.forEach((key) => {
      expect(Object.keys(enHome.Home.features[key].bullets)).toEqual(
        Object.keys(esHome.Home.features[key].bullets),
      );
    });
  });

  describe("guard de prefers-reduced-motion (CSS inyectado, no getComputedStyle)", () => {
    // Lección 2026-07-27 (task/lessons.md): jsdom no evalua NINGUN @media al
    // calcular estilos, asi que el guard que fuerza el estado final del
    // reveal bajo reduced-motion no se puede atar con getComputedStyle --
    // solo inspeccionando el TEXTO del bloque inyectado por
    // styled-components. Este test se validó con el bug inyectado a
    // propósito: comentando temporalmente el bloque
    // `@media (prefers-reduced-motion: reduce)` de `ScItem` en Features.tsx
    // el test se pone en rojo (falta `opacity: 1`/`transition-delay: 0ms`);
    // restaurado el bloque, vuelve a verde. Las aserciones de
    // `transition-delay: 0ms` y `opacity: 1` son el candado de regresión:
    // ningún otro bloque de reduced-motion del componente (`ScCard`, `ScCta`,
    // que solo anulan el hover) declara ninguna de las dos, así que solo el
    // guard de `ScItem` puede satisfacerlas.
    it("declara un bloque @media (prefers-reduced-motion: reduce) que fuerza el estado final revelado", () => {
      renderWithProviders(<Features />);
      const css = injectedCss();
      const reduceBlocks = css
        .split("@media (prefers-reduced-motion: reduce)")
        .slice(1)
        .join("\n");

      expect(reduceBlocks).toMatch(/transition:\s*none/);
      expect(reduceBlocks).toMatch(/transition-delay:\s*0ms/);
      expect(reduceBlocks).toMatch(/opacity:\s*1/);
      expect(reduceBlocks).toMatch(/transform:\s*none/);
    });
  });
});

/*
 * Encargo 2026-08-03: los bullets van a DOS columnas solo en dispositivos
 * grandes. Por texto del CSS inyectado y no con `getComputedStyle`: jsdom no
 * evalua NINGUN @media al calcular estilos (lección repo 2026-07-27), asi que
 * el estilo computado devuelve `1fr` tanto con la regla como sin ella. Se
 * acota con `cssRuleTextFor` a las clases del PROPIO contenedor de bullets:
 * `injectedCss()` arrastraria el resto del stylesheet y cualquier otro
 * `repeat(2, minmax(0, 1fr))` del componente (`ScGrid` declara uno) daria un
 * verde falso.
 *
 * El breakpoint se lee del tema (`themes.light.breakPoint.lg`), no se escribe
 * "992px" a mano: un literal deja de proteger en silencio el dia que el token
 * cambie (lección repo 2026-08-01).
 *
 * Validado con el bug inyectado: quitando el bloque `@media` de `ScBullets`
 * en Features.tsx el test se pone rojo (no existe ninguna regla con el
 * breakpoint y las dos columnas); restaurado, verde.
 */
describe("bullets a dos columnas solo en dispositivos grandes", () => {
  function bulletsContainer(): HTMLElement {
    const cta = document.querySelector('a[href="#contact"]');
    return cta?.previousElementSibling as HTMLElement;
  }

  it("declara UNA columna por defecto y dos dentro del @media de lg", () => {
    renderWithProviders(<Features />);
    const css = cssRuleTextFor(bulletsContainer());

    // Regla base (fuera de cualquier @media): una sola columna.
    const baseRule = css
      .split("\n")
      .find(
        (line) =>
          !line.includes("@media") && line.includes("grid-template-columns"),
      );
    expect(baseRule).toBeDefined();
    expect(baseRule).toMatch(/grid-template-columns:\s*1fr/);

    // La MISMA linea tiene que ser a la vez el bloque del breakpoint y la
    // declaracion de dos columnas: separarlo en dos aserciones dejaria pasar
    // un CSS con las dos columnas fuera del @media.
    const lgLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes(themes.light.breakPoint.lg) &&
          line.includes("grid-template-columns"),
      );
    expect(lgLine).toBeDefined();
    expect(lgLine).toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
  });

  it("aplica la MISMA regla a las tres tarjetas (ya no depende de cual sea)", () => {
    const { container } = renderWithProviders(<Features />);
    const contenedores = Array.from(
      container.querySelectorAll('a[href="#contact"]'),
    ).map((cta) => cta.previousElementSibling as HTMLElement);
    expect(contenedores).toHaveLength(FEATURE_KEYS.length);

    const clases = contenedores.map((el) =>
      Array.from(el.classList).sort().join(" "),
    );
    expect(new Set(clases).size).toBe(1);
  });
});

// Regresion 2026-07-28: GlobalStyles declara svg width 100% para todo el
// sitio, y ese reset le gana la cascada al atributo width="15" del check
// (misma clase de bug que el Logo, task/lessons.md). Se asevera el estilo
// COMPUTADO, que es la capa que produce el efecto: con el bug presente jsdom
// devuelve cadena vacia (la regla del componente no existiria) y esto se pone
// rojo.
describe("tamano del icono de check (reset global de svg)", () => {
  it("computa 15px por CSS, no por atributo", () => {
    renderWithProviders(<Features />);
    const cta = document.querySelector('a[href="#contact"]');
    const bullets = cta?.previousElementSibling as HTMLElement;
    const check = bullets.querySelector("svg") as SVGSVGElement;
    expect(getComputedStyle(check).width).toBe("15px");
    expect(getComputedStyle(check).height).toBe("15px");
  });
});

function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("Features en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("monta el fondo FeaturesCelestialOrbital (FEATURES_ORBITAL_LAYERS.length capas decorativas) en vez de las 3 tarjetas con figura propia", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        FEATURES_ORBITAL_LAYERS.length,
      );
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("sigue mostrando el kicker, los 3 titulos, los 12 bullets y los 3 CTA con el mismo i18n que en claro", async () => {
    renderWithProviders(<Features />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.features.kicker)).toBeInTheDocument();
    });
    FEATURE_KEYS.forEach((key) => {
      const copy = esHome.Home.features[key];
      expect(
        screen.getByRole("heading", { level: 3, name: copy.title }),
      ).toBeInTheDocument();
      BULLET_KEYS.forEach((bulletKey) => {
        expect(screen.getByText(copy.bullets[bulletKey])).toBeInTheDocument();
      });
      const cta = screen.getByRole("link", {
        name: new RegExp(copy.cta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      });
      expect(cta).toHaveAttribute("href", "#contact");
    });
  });

  it("no queda ninguna imagen con alt de i18n (las figuras por tarjeta son cosa de la rama clara)", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    FEATURE_KEYS.forEach((key) => {
      const alt = esHome.Home.features[key].figureAlt;
      expect(
        container.querySelector(`img[alt="${alt}"]`),
      ).not.toBeInTheDocument();
    });
  });

  // Tests 1-6, 11 de §7, spec
  // `2026-08-02-features-overlay-celestial-orbital-design.md`. Por texto del
  // CSS inyectado / DOM, nunca `getComputedStyle`: jsdom no evalua `@media`
  // (lección repo 2026-07-27) y un literal escrito a mano deja de proteger en
  // silencio si la constante que describe cambia (lección repo 2026-08-01).

  it("declara el solape con margin-block-start negativo leyendo FEATURES_OVERLAY_RISE, no un literal a mano (test 1)", () => {
    renderWithProviders(<Features />);
    const css = injectedCss();
    expect(css).toContain(
      `margin-block-start: calc(-1 * ${FEATURES_OVERLAY_RISE})`,
    );
  });

  it("bajo prefers-reduced-motion: reduce anula el solape devolviendo margin-block-start a 0 (test 2, D6)", () => {
    renderWithProviders(<Features />);
    const css = injectedCss();
    // Misma tecnica que el test 2 de Journey.test.tsx (D6): la MISMA linea
    // tiene que ser a la vez un bloque reduce y mencionar
    // margin-block-start, para no arrastrar el resto del stylesheet
    // acumulado (lección repo 2026-08-02, contamina con
    // margin-block-start de otros componentes como ScDarkFeatures).
    const featuresReduceLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("margin-block-start"),
      );
    expect(featuresReduceLine).toBeDefined();
    expect(featuresReduceLine).toMatch(/margin-block-start:\s*0[;}]/);
  });

  it("topa el contenido con max-width leyendo FEATURES_CONTENT_MAX_WIDTH, no un literal a mano (test 3, D8)", () => {
    renderWithProviders(<Features />);
    const css = injectedCss();
    expect(css).toContain(`max-width: ${FEATURES_CONTENT_MAX_WIDTH}`);
  });

  it("declara el slot de la escena pegado (position: sticky; top: 0; height derivado de FEATURES_DARK_HEIGHT) y ScFeatures no declara ningun overflow (test 4, D7 -- el fallo que rompe el pin en silencio)", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const slot = section.firstElementChild as HTMLElement;

    const slotCss = cssRuleTextFor(slot);
    expect(slotCss).toContain("position: sticky");
    expect(slotCss).toContain("top: 0");
    expect(slotCss).toContain(`height: ${FEATURES_DARK_HEIGHT}`);

    const sectionCss = cssRuleTextFor(section);
    expect(sectionCss).not.toMatch(/overflow/);
  });

  it("bajo prefers-reduced-motion el slot de la escena pasa a position: static (test 5, D15)", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const slot = section.firstElementChild as HTMLElement;

    const slotCss = cssRuleTextFor(slot);
    const slotReduceLine = slotCss
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("position"),
      );
    expect(slotReduceLine).toBeDefined();
    expect(slotReduceLine).toMatch(/position:\s*static/);
  });

  it("no queda ningun rastro del nombre celestial-guide, ni en el CSS inyectado ni en el DOM renderizado (test 11, D16)", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const css = injectedCss();
    expect(css).not.toContain("celestial-guide");
    expect(container.innerHTML).not.toContain("celestial-guide");
  });
});

/*
 * Zona de "hold" al final de la sección oscura (D3/D4/D5, spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`, tests
 * §7.1.1-3/5). Mismo criterio que el resto del fichero: aserciones sobre el
 * TEXTO del CSS inyectado (`cssRuleTextFor`/`injectedCss`), nunca
 * `getComputedStyle` de algo que jsdom no evalúa (ningún `@media`, lección
 * repo 2026-07-27), y la línea concreta de un bloque `reduce` -- nunca un
 * troceo del stylesheet acumulado (lección repo 2026-08-02). La invariante
 * D4 (`FEATURES_TAIL_HOLD === CONTACT_OVERLAY_RISE`) NO vive aquí: vive en
 * `Contact.test.tsx`, la sección que SUBE, mismo criterio que la invariante
 * D5 Journey↔Features vive en este fichero y no en `journey.layers.ts`.
 */
describe("zona de hold al final de Features (D3/D4/D5, spec 2026-08-03)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("el CSS de ScDarkTail declara height leyendo FEATURES_TAIL_HOLD, no un literal a mano", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const tail = section.lastElementChild as HTMLElement;
    const tailCss = cssRuleTextFor(tail);
    expect(tailCss).toContain(`height: ${FEATURES_TAIL_HOLD}`);
  });

  it("bajo prefers-reduced-motion el hold colapsa a height: 0 (guard D5)", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const tail = section.lastElementChild as HTMLElement;
    const tailCss = cssRuleTextFor(tail);
    const tailReduceLine = tailCss
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("height"),
      );
    expect(tailReduceLine).toBeDefined();
    expect(tailReduceLine).toMatch(/height:\s*0[;}]/);
  });

  // Falsable (verificado a mano, ver informe): revertir el slot a
  // `grid-area: 1 / 1` pone este test en rojo -- deja de haber `grid-row`
  // con `span 2` y reaparece la cadena `grid-area: 1 / 1`.
  it("el slot de la escena abarca las dos filas (grid-row: span 2) y ya no declara grid-area: 1 / 1", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const slot = section.firstElementChild as HTMLElement;
    const slotCss = cssRuleTextFor(slot);

    // Sonda positiva: el slot sigue declarando su columna, para que la
    // ausencia de grid-area no pueda pasar por vacuidad (helper roto, clase
    // equivocada, etc.)
    expect(slotCss).toContain("grid-column: 1");
    expect(slotCss).toMatch(/grid-row:\s*1\s*\/\s*span 2/);
    expect(slotCss).not.toContain("grid-area: 1 / 1");
  });

  it("no-regresion: ScFeatures sigue sin ninguna declaracion overflow y conserva el solape con su guard", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const sectionCss = cssRuleTextFor(section);
    expect(sectionCss).not.toMatch(/overflow/);

    const css = injectedCss();
    expect(css).toContain(
      `margin-block-start: calc(-1 * ${FEATURES_OVERLAY_RISE})`,
    );
    const featuresReduceLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("margin-block-start"),
      );
    expect(featuresReduceLine).toBeDefined();
    expect(featuresReduceLine).toMatch(/margin-block-start:\s*0[;}]/);
  });
});

/*
 * Invariante D5 (spec `2026-08-02-features-overlay-celestial-orbital-design.md`,
 * test §7.6). Es el ÚNICO punto del repo donde los datos de Features y
 * Journey se miran a la cara: el solape de Features (`FEATURES_OVERLAY_RISE`)
 * y la zona de hold al final de la pista de Journey (`JOURNEY_DECK_TAIL_SCREENS`
 * pantallas de `JOURNEY_DARK_HEIGHT`) TIENEN que medir lo mismo. Los ficheros
 * de datos de cada sección no se importan entre sí a propósito (acoplarlos
 * mezclaría los datos de dos secciones que no se conocen), así que la
 * igualdad no puede vivir en ninguno de los dos: vive aquí, en un test, que
 * es lo único que impide de verdad la regresión.
 */
describe("invariante solape de Features ↔ cola de la pista de Journey (D5)", () => {
  it("FEATURES_OVERLAY_RISE mide exactamente un stage de Journey, y ese stage se reserva con una pantalla de hold (test 6)", () => {
    expect(FEATURES_OVERLAY_RISE).toBe(JOURNEY_DARK_HEIGHT);
    expect(JOURNEY_DECK_TAIL_SCREENS).toBe(1);
  });
});

/*
 * Segunda invariante geométrica de esta sección, DENTRO de su propio fichero
 * de datos (spec `2026-08-03-contacto-footer-oscuro-design.md`, D3/D4;
 * añadida tras la auditoría adversarial, que la señaló como el único punto
 * de la entrega sin candado propio).
 *
 * Derivación, con `F` = inicio de `ScFeatures` en documento y `c` = alto real
 * de `ScDarkFrame`: el slot de la escena abarca las dos filas del grid, así
 * que se despega en `F + c + FEATURES_TAIL_HOLD − FEATURES_DARK_HEIGHT`;
 * Contacto, tras su margen negativo, cubre el viewport en
 * `F + c + FEATURES_TAIL_HOLD − CONTACT_OVERLAY_RISE`. Los dos instantes
 * coinciden —que es lo que hace que el relevo no tenga costura— solo si
 * `FEATURES_DARK_HEIGHT === CONTACT_OVERLAY_RISE`; y como otro test ya ata
 * `CONTACT_OVERLAY_RISE === FEATURES_TAIL_HOLD` (`Contact.test.tsx`), basta
 * con cerrar aquí el eslabón que falta: la altura del slot contra el hold.
 *
 * Hoy las dos valen `"100dvh"`, así que el test no cambia nada de color —
 * pero esa igualdad es una COINCIDENCIA DE VALOR mientras nadie la escriba.
 * Es exactamente el patrón que este repo tiene documentado como insuficiente
 * (`task/lessons.md`, 2026-08-02: una invariante entre dos datos no la
 * sostiene un comentario), agravado porque las dos constantes viven en el
 * MISMO fichero y sus docblocks no se citaban mutuamente: cualquiera podría
 * retocar una de las dos creyendo que son independientes.
 */
describe("invariante alto del slot de la escena ↔ zona de hold (D3/D4)", () => {
  it("FEATURES_DARK_HEIGHT y FEATURES_TAIL_HOLD miden lo mismo, o el relevo con Contacto deja costura", () => {
    expect(FEATURES_DARK_HEIGHT).toBe(FEATURES_TAIL_HOLD);
  });
});
