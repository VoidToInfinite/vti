import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { Features, accentColor, accentColorHover } from "./Features";
import { PRESS, REVEAL } from "@/motion/vocabulary";
import {
  FEATURE_KEYS,
  FEATURES_OVERLAY_RISE,
  FEATURES_DARK_HEIGHT,
  FEATURES_CONTENT_MAX_WIDTH,
  FEATURES_TAIL_HOLD,
  FEATURES_GAMING_ACCENT,
  FEATURES_LIGHT_REVEAL_DELAYS_MS,
  FEATURES_CARD_BORDER_WIDTH,
  FEATURES_IMAGE_PANEL_HEIGHT,
} from "./features.layers";
import {
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_TAIL_SCREENS,
} from "@/components/sections/Journey/journey.layers";
import {
  FEATURES_ORBITAL_LAYERS,
  FEATURES_ORBITAL_VOID,
} from "@/components/scenes/featuresCelestialOrbital/featuresCelestialOrbital.layers";
import { NAV_GROUPS } from "@/config/navigation";
import { themes } from "@/theme/themes";
import { motion } from "@/theme/tokens/motion";
import { grid } from "@/theme/tokens/grid";
import { contrastRatio, contrastRatioHex } from "@/theme/tokens/contrast";
import enHome from "@/i18n/locales/en/home.json";
import esHome from "@/i18n/locales/es/home.json";

/*
 * `trigger` dispara TODAS las instancias de IntersectionObserver vivas, no
 * solo la última creada (D7, encargo 2026-08-04): desde que la rama clara
 * llama a `useSectionProgress` de forma incondicional (ver `Features()`),
 * un render monta DOS observers a la vez -- el de `useReveal` (sobre
 * `ScGrid`, revealRef) y el de `useSectionProgress` (sobre `ScFeatures`,
 * featuresRef). Antes de esta entrega solo existía uno, así que "guardar el
 * callback de la última instancia" bastaba; con dos, el segundo pisaba al
 * primero y `trigger(true)` dejaba de disparar el reveal -- exactamente el
 * fallo que Journey.test.tsx ya documenta para su propio caso de dos
 * observers (`useSlideDeck` + `useSceneParallax`). No hace falta distinguir
 * CUÁL observer es cuál para estos tests (ninguno asevera nada sobre
 * `--features-progress`): notificar a todos con el mismo valor es
 * suficiente y más simple que el `ioTargets`/`triggerFor` de Journey.
 */
let ioCallbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
function trigger(isIntersecting: boolean): void {
  ioCallbacks.forEach((cb) => cb([{ isIntersecting }]));
}

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

/**
 * Los `selectorText` REALES de las reglas condicionales (`@media`) que
 * mencionan alguna clase de `el`. Sirve para lo que el texto del CSS no puede
 * responder: si una regla declarada sobre un styled COMPARTIDO entre las dos
 * ramas llega o no a alcanzar al arbol que hay montado ahora mismo -- se
 * resuelve el selector contra el DOM en vez de leer su cadena (critica externa
 * #15, hallazgo C 3). Devuelve el selector, no la regla, precisamente para que
 * quien lo use tenga que pasarlo por `querySelector`.
 */
function selectoresCondicionalesDe(el: HTMLElement): string[] {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets).flatMap((sheet) => {
    try {
      return Array.from(sheet.cssRules)
        .filter(
          (rule): rule is CSSMediaRule =>
            typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule,
        )
        .flatMap((media) =>
          Array.from(media.cssRules)
            .filter(
              (rule): rule is CSSStyleRule =>
                rule instanceof CSSStyleRule &&
                classes.some((cls) => rule.selectorText.includes(`.${cls}`)),
            )
            .map((rule) => rule.selectorText),
        );
    } catch {
      return [];
    }
  });
}

/**
 * jsdom no implementa `window.matchMedia` -- lo necesitan tanto
 * `useReveal`/las guardas de `prefers-reduced-motion` de los componentes
 * como, desde esta entrega, `useSectionProgress` (D7, se llama de forma
 * INCONDICIONAL en `Features()`, también en la rama clara que la mayoría de
 * estos tests ejercita). `matches: false` en todas las queries: ningún test
 * de este bloque quiere reduced-motion activo por defecto -- los tests que
 * SÍ verifican ese guard lo hacen por TEXTO del CSS inyectado, no por el
 * valor de retorno de `matchMedia` (jsdom no evalúa `@media`, lección repo
 * 2026-07-27), así que este stub no interfiere con ellos.
 */
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

beforeEach(() => {
  ioCallbacks = [];
  stubMatchMedia();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    },
  );
});

const BULLET_KEYS = ["one", "two", "three", "four"] as const;

/*
 * `overflow` QUE ROMPE UN PIN, no cualquier propiedad cuyo nombre empiece por
 * "overflow". La regla 21 del repo prohibe `overflow: hidden|auto|scroll` en
 * cualquier ancestro de un elemento con `position: sticky` -- eso es lo que
 * estos tests protegen. `overflow-wrap` (anadida en la critica externa #13,
 * 2026-08-19, para que el texto reflote sin recortarse al 200% de tamano de
 * fuente, WCAG 2.1 SC 1.4.4) NO crea contenedor de scroll ni afecta al pin:
 * solo decide si una palabra que no cabe entera puede partirse. El patron
 * anterior (`/overflow/`) las confundia por prefijo compartido, asi que el
 * candado decia mas de lo que su nombre promete. Este patron exige los DOS
 * PUNTOS de la propiedad completa, de modo que sigue cazando exactamente las
 * mismas declaraciones peligrosas (`overflow`, `-x`, `-y`, `-block`,
 * `-inline`) y ninguna mas.
 */
const OVERFLOW_DE_SCROLL = /overflow(-x|-y|-block|-inline)?\s*:/;

describe("Features", () => {
  it("D6: la cabecera clara monta el h2 nuevo (frase real, no las tres palabras de marca) como nombre accesible de la region, con id=features-title", () => {
    // D6 (spec 2026-08-06-story-features-tema-claro-design.md): el h2 deja
    // de ser las tres palabras de marca coloreadas (Learning Imagination
    // Gaming) y pasa a ser una frase real; aria-labelledby de la region
    // sigue apuntando al mismo id.
    renderWithProviders(<Features />);
    const region = screen.getByRole("region", {
      name: esHome.Home.features.title,
    });
    expect(region).toHaveAccessibleName(esHome.Home.features.title);
    expect(region).toHaveAttribute("id", "features");

    const heading = screen.getByRole("heading", {
      level: 2,
      name: esHome.Home.features.title,
    });
    expect(heading).toHaveAttribute("id", "features-title");
  });

  it("D6: la cabecera clara monta el parrafo de entrada nuevo de i18n", () => {
    renderWithProviders(<Features />);
    expect(screen.getByText(esHome.Home.features.intro)).toBeInTheDocument();
  });

  /*
   * Historia de este test, porque asevera lo CONTRARIO de lo que aseveraba
   * hace dos dias y eso no es un descuido. La Task 11 (dieta de ornamento A,
   * 2026-08-09) retiro de la rama clara el eyebrow (barra decorativa +
   * kicker) y este test candaba su AUSENCIA: aquel kicker era generico
   * ("Caracteristicas"/"Features"), el andamiaje mas repetido del sitio.
   *
   * La Task 15 (2026-08-11) devuelve un kicker a la cabecera por decision
   * D-E del dueno, y no es el mismo objeto: es un kicker con VOZ ("¿Por
   * donde empiezas?", la pregunta que las tres tarjetas responden), sin la
   * barra decorativa, y se muestra en las DOS ramas -- es una de las piezas
   * que la unificacion de contenido tenia que igualar, porque hasta hoy el
   * kicker existia solo en oscuro y ademas ascendido a h2. Lo que el candado
   * protege ahora es eso: kicker presente, `overline` (11px, NO el h5 al que
   * la rama oscura lo habia subido) y, sobre todo, que NO sea un encabezado.
   */
  it("Task 15/D-E: la cabecera clara abre con el kicker con voz, en overline y sin ser encabezado", () => {
    renderWithProviders(<Features />);
    const kicker = screen.getByText(esHome.Home.features.kicker);
    expect(kicker).toBeInTheDocument();
    expect(kicker.tagName).not.toMatch(/^H[1-6]$/);
    expect(getComputedStyle(kicker).fontSize).toBe(
      themes.light.type.scale.overline.size,
    );
    expect(
      screen.queryByRole("heading", { name: esHome.Home.features.kicker }),
    ).not.toBeInTheDocument();
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

  it("D9: el envoltorio unico de reveal (cabecera + rejilla) empieza sin revelar y pasa a revelado al intersecar", () => {
    // Un solo IntersectionObserver cubre cabecera + tarjetas (D9): un unico
    // elemento porta `data-revealed`, no uno por tarjeta como hacia la
    // entrega anterior (`ScItem`, retirado).
    const { container } = renderWithProviders(<Features />);
    const items = container.querySelectorAll("[data-revealed]");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute("data-revealed", "false");

    act(() => trigger(true));

    expect(items[0]).toHaveAttribute("data-revealed", "true");
  });

  // Task 15 (2026-08-11): seis elementos otra vez -- el kicker con voz de la
  // decision D-E recupera la primera posicion (y su retardo de 0ms) que el
  // eyebrow generico habia dejado libre en la Task 11, sin renumerar los
  // cinco de despues (ver el docblock de FEATURES_LIGHT_REVEAL_DELAYS_MS,
  // features.layers.ts).
  /*
   * Candado de VALOR, añadido con la migración de la crítica externa #16
   * (2026-09-03). El test de debajo itera la propia constante, así que ve
   * que el DOM y la tabla coinciden pero NO puede ver un cambio de valor:
   * si la tabla pasara a decir 0/90/150/..., seguiría en verde. Desde esa
   * revisión los seis números ya no se escriben a mano — se derivan de
   * `motion.staggerMs` — y esa aritmética necesita quien la compruebe
   * contra los valores VERBATIM del mockup, que son estos seis literales y
   * viven aquí precisamente porque el fichero bajo prueba ya no los tiene.
   */
  it("#16: la cascada derivada de motion.staggerMs sigue dando los seis retardos verbatim del mockup", () => {
    expect([...FEATURES_LIGHT_REVEAL_DELAYS_MS]).toEqual([
      0, 80, 140, 200, 280, 360,
    ]);
  });

  it("D9: escalona el transition-delay de los seis elementos (kicker, h2, intro, 3 tarjetas) segun los retardos verbatim del mockup", () => {
    const { container } = renderWithProviders(<Features />);
    expect(FEATURES_LIGHT_REVEAL_DELAYS_MS).toHaveLength(6);
    FEATURES_LIGHT_REVEAL_DELAYS_MS.forEach((delayMs) => {
      const el = container.querySelector(
        `[data-reveal-delay="${delayMs}"]`,
      ) as HTMLElement | null;
      expect(el).not.toBeNull();
      // jsdom SI resuelve el longhand `transition-delay` de una shorthand
      // `transition` declarada en styled-components (lección repo,
      // task/lessons.md 2026-07-25/27) -- lo que NO resuelve es ningun
      // @media, de ahi el test aparte de mas abajo.
      expect(getComputedStyle(el as HTMLElement).transitionDelay).toBe(
        `${delayMs}ms`,
      );
    });
  });

  /*
   * Fix wave E, hallazgo E3 (evaluador de navegador real, 2026-08-13): ver
   * el docblock del `useReveal<HTMLDivElement>({ threshold: 0 })` en
   * `Features()` para la reproducción completa (Chrome real, `playwright-cli`,
   * CPU x6 + caché fría Y sin throttling) y la geometría medida (`ratio =
   * 0.19825`, justo por debajo del `0.2` por defecto, sobre un
   * `ScRevealGroup` de 1336px de alto -- casi el doble del viewport). jsdom
   * no hace layout (no puede reproducir la carrera geométrica real), así que
   * este candado se queda en lo que SÍ es observable en jsdom: qué opciones
   * recibe el `IntersectionObserver` real -- un mock LOCAL a este describe
   * que, a diferencia del mock genérico de cabecera (que ignora el segundo
   * argumento), captura `options` de verdad.
   */
  describe("fix wave E, hallazgo E3 -- ScRevealGroup observa con threshold: 0, no el 0.2 por defecto", () => {
    // Features() monta DOS IntersectionObserver a la vez (mismo motivo que
    // el `trigger()` de cabecera de este fichero, D7): `useReveal` sobre
    // `ScRevealGroup` (CON opciones, `{ threshold: 0 }`) y
    // `useSectionProgress` sobre `ScFeatures` (SIN opciones -- ver
    // `useSectionProgress.ts`, `new IntersectionObserver(cb)` a secas). Se
    // captura CADA instancia con su target real (mismo patrón `ioTargets`/
    // `triggerFor` que ya usa `Journey.test.tsx` para el mismo problema) en
    // vez de una variable única -- con una sola variable, la instancia SIN
    // opciones de `useSectionProgress` pisaba a la de `useReveal` sin que el
    // test lo notara.
    let instances: {
      options: IntersectionObserverInit | undefined;
      target: Element | null;
    }[];

    beforeEach(() => {
      instances = [];
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          private entry: {
            options: IntersectionObserverInit | undefined;
            target: Element | null;
          };
          constructor(
            _cb: (entries: { isIntersecting: boolean }[]) => void,
            options?: IntersectionObserverInit,
          ) {
            this.entry = { options, target: null };
            instances.push(this.entry);
          }
          observe(target: Element) {
            this.entry.target = target;
          }
          disconnect() {}
        },
      );
    });

    it("el IntersectionObserver de ScRevealGroup (el que observa el elemento con data-revealed) se crea con threshold: 0", () => {
      const { container } = renderWithProviders(<Features />);
      const revealGroup = container.querySelector("[data-revealed]");
      expect(revealGroup).not.toBeNull();

      const own = instances.find((entry) => entry.target === revealGroup);
      expect(
        own,
        "ningun IntersectionObserver observa el ScRevealGroup real",
      ).toBeDefined();
      expect(own?.options?.threshold).toBe(0);
    });

    /*
     * Bug inyectado a proposito (regla 34), verificado en esta tarea:
     * revertir `Features()` a `useReveal<HTMLDivElement>()` (sin opciones,
     * el 0.2 por defecto de `useReveal.ts`) pone en rojo el test de arriba
     * (`capturedOptions?.threshold` pasa a ser `0.2`, no `0`); restaurado,
     * vuelve a verde.
     */
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
    // `@media (prefers-reduced-motion: reduce)` de `ScReveal` en Features.tsx
    // (D9, sustituye a `ScItem`) el test se pone en rojo (falta
    // `opacity: 1`/`transition-delay: 0ms`); restaurado el bloque, vuelve a
    // verde. Las aserciones de `transition-delay: 0ms` y `opacity: 1` son el
    // candado de regresión: ningún otro bloque de reduced-motion del
    // componente (`ScCardBorder`, `ScCta`, que solo anulan el hover) declara
    // ninguna de las dos, así que solo el guard de `ScReveal` puede
    // satisfacerlas.
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
 * D6/D7/D8 (spec `2026-08-06-story-features-tema-claro-design.md`):
 * estructura de las tres tarjetas -- panel de imagen con círculo decorativo,
 * título/cuerpo/bullets/CTA (estos tres últimos ya se cubren en los tests
 * generales de arriba).
 *
 * Task 15 (numeración honesta, 2026-08-11): el badge numérico 01/02/03 y su
 * etiqueta salieron de la tarjeta -- ver el bloque que los sustituye en
 * `Features.tsx` para los dos motivos (numerar tres identidades simultáneas
 * promete una secuencia que no existe; la etiqueta repetía el título de la
 * propia tarjeta). Los dos tests que los candaban desaparecen con ellos y en
 * su lugar queda el candado inverso, más abajo: que NO vuelvan.
 */
describe("D6/D7/D8: estructura nueva de las tres tarjetas de la rama clara", () => {
  it("cada tarjeta monta su panel de imagen (figura + circulo decorativo aria-hidden)", () => {
    const { container } = renderWithProviders(<Features />);

    // Panel de imagen: una figura por tarjeta (ya cubierto en detalle por
    // "cada figura trae alt de i18n..." arriba) mas un circulo decorativo
    // aria-hidden por tarjeta (D8) -- ninguno de los dos existia en la
    // entrega anterior (patron SVG de fondo, retirado).
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(FEATURE_KEYS.length);
  });

  it("Task 15: la numeracion decorativa 01/02/03 ya no se pinta en ninguna tarjeta", () => {
    renderWithProviders(<Features />);
    ["01", "02", "03"].forEach((number) => {
      expect(screen.queryByText(number)).not.toBeInTheDocument();
    });
  });

  it("D5: se retira el caso especial de ancho completo -- las tres tarjetas comparten exactamente las mismas clases de estructura", () => {
    const { container } = renderWithProviders(<Features />);
    const cards = Array.from(
      container.querySelectorAll('article[aria-labelledby^="feature-"]'),
    );
    expect(cards).toHaveLength(FEATURE_KEYS.length);
    const clases = cards.map((card) =>
      Array.from(card.classList).sort().join(" "),
    );
    // Mismas clases en las tres -- ninguna lleva una regla propia de
    // "grid-column: 1 / -1" ni equivalente (D5, ya no hay $fullWidth).
    expect(new Set(clases).size).toBe(1);
  });
});

/*
 * Task 22 (tipografia de lectura, plan premium F1-F5, punto 1 del brief;
 * hallazgo M4 del craft audit): la rejilla de la rama clara deja de resolver
 * "tres tarjetas" con `repeat(auto-fit, minmax(17.5rem, 1fr))` -- la misma
 * gramatica de layout que Story (`ScPillarGrid`) y, en espiritu, Journey
 * (`ScStepsGrid`) -- y pasa a una rejilla BENTO asimetrica de "destacada +
 * pareja" (ver el docblock de `ScGrid`, Features.tsx, para el razonamiento
 * completo, incluida la propuesta de "columna ancha a 2 filas" que se probo
 * y se descarto en navegador real por el hueco en blanco que dejaba).
 * Candados por TEXTO del CSS inyectado (jsdom no evalua `@media`, leccion
 * repo 2026-07-27): la nueva gramatica vive DENTRO del bloque `@media` de
 * `lg` (992px), asi que se acota el texto de la regla al tramo posterior al
 * marcador `@media` antes de buscar, mismo patron que el resto de este
 * fichero (ver `injectedCss`/`cssRuleTextFor`, cabecera).
 */
describe("Task 22: rejilla bento de la rama clara (rompe la gramatica auto-fit+minmax, M4)", () => {
  function scGridOf(container: HTMLElement): HTMLElement {
    const firstCard = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    // article (ScCardBorder) -> ScReveal (envoltorio de entrada) -> ScGrid.
    return firstCard.parentElement!.parentElement as HTMLElement;
  }

  it("ya no declara auto-fit/minmax(17.5rem, 1fr) en ningun punto de su CSS", () => {
    const { container } = renderWithProviders(<Features />);
    const css = cssRuleTextFor(scGridOf(container));
    expect(css).not.toContain("auto-fit");
    expect(css).not.toContain("17.5rem");
  });

  it("declara 2 columnas iguales dentro de @media lg, con la 1a tarjeta abarcando las 2 columnas en su propia fila", () => {
    const { container } = renderWithProviders(<Features />);
    const css = cssRuleTextFor(scGridOf(container));

    expect(css).toContain("@media");
    const mediaBlock = css.slice(css.indexOf("@media"));

    // repeat(2, ...), no un tercer auto-fit ni un repeat() uniforme sin mas.
    expect(mediaBlock).toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
    // La 1a tarjeta (posicional, sin prop/clase propia -- D5 sigue intacto,
    // ver el test de arriba) abarca las dos columnas de su fila -- la 2a y
    // la 3a quedan hermanadas debajo por colocacion implicita.
    expect(mediaBlock).toMatch(
      /:first-child\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/,
    );
  });

  it("por debajo de lg sigue apilando las tres tarjetas en una sola columna (grid-template-columns: 1fr fuera de cualquier @media)", () => {
    const { container } = renderWithProviders(<Features />);
    const css = cssRuleTextFor(scGridOf(container));
    const baseRule = css
      .split("\n")
      .find(
        (line) =>
          !line.includes("@media") && line.includes("grid-template-columns"),
      );
    expect(baseRule).toMatch(/grid-template-columns:\s*1fr/);
  });
});

/*
 * D7 (borde cónico animado en hover, spec 2026-08-06). Por texto del CSS
 * inyectado, no `getComputedStyle`: jsdom no evalúa `@media` (lección repo
 * 2026-07-27). Validado con el bug inyectado a propósito (ver informe de la
 * tarea): sacando el bloque `conic-gradient`/`animation` de dentro del
 * `@media (prefers-reduced-motion: no-preference)` (declarándolo junto al
 * resto de `:hover`, sin `@media`), el primer test de este bloque se pone en
 * rojo (el `conic-gradient` aparece ANTES del marcador `no-preference`, así
 * que la porción "antes" ya no está vacía de él); restaurado dentro del
 * `@media`, vuelve a verde.
 */
describe("D7: borde conico animado en hover, solo bajo prefers-reduced-motion: no-preference", () => {
  it("el conic-gradient y su animacion de giro viven SOLO dentro de @media (prefers-reduced-motion: no-preference)", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(card);

    const noPreferenceIndex = css.indexOf(
      "@media (prefers-reduced-motion: no-preference)",
    );
    expect(noPreferenceIndex).toBeGreaterThan(-1);

    // Nada de conic-gradient/animation ANTES del marcador no-preference: la
    // regla base de :hover (translateY/box-shadow) no lo lleva.
    expect(css.slice(0, noPreferenceIndex)).not.toContain("conic-gradient");

    const noPreferenceBlock = css.slice(noPreferenceIndex);
    // Sin asumir que "conic-gradient(" y "var(--vti-angle)" queden
    // pegados sin salto de linea: styled-components conserva el formato
    // literal de la plantilla (indentacion incluida) al inyectar el CSS.
    expect(noPreferenceBlock).toContain("conic-gradient(");
    expect(noPreferenceBlock).toContain("var(--vti-angle)");
    expect(noPreferenceBlock).toContain("animation:");
  });

  it("en reposo (fuera de :hover y de todo @media) el envoltorio NO declara background/background-image: el unico tratamiento de borde es el conic-gradient de marca en hover", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(card);

    const noPreferenceIndex = css.indexOf(
      "@media (prefers-reduced-motion: no-preference)",
    );
    expect(noPreferenceIndex).toBeGreaterThan(-1);

    // Nada de background/background-image antes del marcador no-preference:
    // el conic-gradient de marca (dentro de ese @media, dentro de :hover) es
    // el UNICO tratamiento de borde que declara este envoltorio -- ya no hay
    // fondo/borde propio en reposo.
    const restBlock = css.slice(0, noPreferenceIndex);
    expect(restBlock).not.toContain("background:");
    expect(restBlock).not.toContain("background-image:");

    // Candado complementario: ScCardSurface (la superficie interior, primer
    // hijo del envoltorio) sigue pintando semantic.surface -- para que la
    // tarjeta no pueda volverse invisible en silencio si algun dia se retira
    // tambien ese fondo.
    const surface = card.firstElementChild as HTMLElement;
    const surfaceCss = cssRuleTextFor(surface);
    expect(surfaceCss).toContain(
      `background: ${themes.light.semantic.surface}`,
    );
  });

  it("D5/D7: en :hover sube -- translateY(-3px) + box-shadow: elevation[1] -- naciendo de un reposo SIN sombra propia, sin depender de no-preference", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(card);

    const noPreferenceIndex = css.indexOf(
      "@media (prefers-reduced-motion: no-preference)",
    );
    const hoverBeforeMedia = css.slice(0, noPreferenceIndex);
    expect(hoverBeforeMedia).toContain(":hover");
    expect(hoverBeforeMedia).toContain("translateY(-3px)");
    expect(hoverBeforeMedia).toContain(themes.light.elevation[1]);

    // La regla de reposo (antes de :hover) no declara box-shadow propio: la
    // sombra NACE en :hover -- unificado con el criterio de las tarjetas de
    // Story -- en vez de "subir" desde una sombra que ya estuviera ahi.
    const restRule = hoverBeforeMedia.slice(
      0,
      hoverBeforeMedia.indexOf(":hover"),
    );
    expect(restRule).not.toContain("box-shadow:");
  });

  /*
   * Task 19 (punto 2 del brief, "unificar transition de hover base->fast"):
   * box-shadow de ScCardBorder pasa de motion.duration.base (200ms) a
   * motion.duration.fast (100ms) -- Task 9 ya había migrado el transform a
   * PRESS.durationMs (100ms) pero dejó box-shadow deliberadamente en base.
   * Validado con el bug inyectado a propósito (ver informe de la tarea):
   * revirtiendo temporalmente esa duración a motion.duration.base en
   * Features.tsx, este test se puso en rojo; restaurado, volvió a verde.
   */
  it("Task 19: box-shadow de ScCardBorder usa motion.duration.fast (no duration.base)", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain(`box-shadow ${motion.duration.fast}`);
    expect(css).not.toContain(`box-shadow ${motion.duration.base}`);
  });

  /*
   * Task 9 (craft de interacción): ScCardBorder gana
   * :active { transform: scale(...) } (vocabulary.PRESS), y el hover-lift
   * (translateY) pasa a guardarse tras PRESS.hoverGuard y a compartir su
   * duración/curva con el press. El borde cónico (background-image/
   * animation, dentro de no-preference) se queda SIN guardar -- no mueve.
   * Validado con el bug inyectado a propósito (ver informe de la tarea,
   * tabla ScCardBorder): comentando temporalmente cada bloque en
   * Features.tsx el test correspondiente se pone en rojo; restaurado,
   * vuelve a verde.
   */
  it("Task 9: ScCardBorder declara :active con transform: scale(PRESS.activeScale), y el hover-lift vive dentro de PRESS.hoverGuard", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(card);

    const guardIndex = css.indexOf(`@media ${PRESS.hoverGuard}`);
    expect(guardIndex).toBeGreaterThan(-1);
    const guardBlock = css.slice(guardIndex);
    expect(guardBlock).toContain(":hover");
    expect(guardBlock).toContain("translateY(-3px)");

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);

    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain(":active");
  });

  /*
   * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
   * con el bug inyectado a propósito (ver informe de la tarea): comentando
   * temporalmente `touch-action: manipulation;` de ScCardBorder
   * (Features.tsx), este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: ScCardBorder declara touch-action: manipulation", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(card);
    expect(css).toContain("touch-action: manipulation");
  });
});

/*
 * Task 23 (plan premium F1-F5): el radio de las tres tarjetas baja de 26px a
 * 16px por decisión del dueño (Fase 0, capturas delante). Deja de ser un
 * literal de escena (`FEATURES_CARD_RADIUS`, retirada de `features.layers.ts`)
 * porque 16px coincide EXACTO con `theme.data.radius.xl` -- el mismo token
 * que `ScImagePanel` ya usa para el panel de imagen de estas mismas
 * tarjetas -- así que `ScCardBorder`/`ScCardSurface` pasan a consumirlo
 * directamente.
 *
 * El envoltorio EXTERIOR (`ScCardBorder`) se canda por `getComputedStyle`:
 * `border-radius` no vive dentro de ningún `@media` en ese componente (regla
 * 36/38, `RULES.md` -- fuera de un media query, medir el estilo computado es
 * legítimo), mismo patrón que ya usa `Navbar.test.tsx` para el mismo token
 * (`radius.xl`) sobre la superficie del navbar. La superficie INTERIOR
 * (`ScCardSurface`) se canda por TEXTO del CSS inyectado, no por
 * `getComputedStyle`: jsdom no evalúa `calc()` (misma familia de gotcha que
 * "jsdom no resuelve `var()`", task/lessons.md 2026-08-11), así que la única
 * forma fiable de comprobar la fórmula es leer la declaración tal y como la
 * inyectó styled-components -- mismo criterio que ya usa este fichero para
 * `margin-block-start: calc(...)` ("test 1" del bloque oscuro, más abajo). El
 * texto se compara con los espacios en blanco COLAPSADOS (`.replace(/\s+/g,
 * " ")`): `prettier` envuelve el `calc()` en varias líneas porque la
 * declaración de una sola línea supera su ancho máximo (verificado: `prettier
 * --write` la reformatea así), y styled-components conserva esa indentación
 * literal en el CSS inyectado -- sin colapsar, un `toContain` de una sola
 * línea es frágil ante el propio formateador del repo.
 *
 * Validado con el bug inyectado a propósito: revirtiendo temporalmente
 * `theme.data.radius.xl` a un literal `"26px"` en `ScCardBorder`
 * (Features.tsx), el primer test se puso en rojo (el radio computado pasó a
 * "26px", distinto de `radius.xl`); restaurado, volvió a verde. Mismo
 * experimento en `ScCardSurface` (calc con `"26px"` en vez del token) puso en
 * rojo el segundo test (el CSS inyectado dejó de contener
 * `calc( 1rem - 1.8px )`); restaurado, volvió a verde.
 */
describe("Task 23: radio de tarjeta a 16px (theme.data.radius.xl, ya no FEATURES_CARD_RADIUS)", () => {
  it("ScCardBorder (envoltorio exterior) computa border-radius = radius.xl (16px), no 26px", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    expect(getComputedStyle(card).borderRadius).toBe(themes.light.radius.xl);
    expect(getComputedStyle(card).borderRadius).not.toBe("26px");
  });

  it("ScCardSurface (superficie interior) sigue derivando su radio como calc(radius.xl - FEATURES_CARD_BORDER_WIDTH), no un segundo literal", () => {
    const { container } = renderWithProviders(<Features />);
    const card = container.querySelector(
      'article[aria-labelledby^="feature-"]',
    ) as HTMLElement;
    const surface = card.firstElementChild as HTMLElement;
    // Colapsado de espacios en blanco: `prettier` envuelve este `calc()` en
    // varias líneas (supera su ancho máximo de línea) y styled-components
    // conserva esa indentación literal -- ver el docblock de este bloque.
    const css = cssRuleTextFor(surface).replace(/\s+/g, " ");
    expect(css).toContain(
      `border-radius: calc( ${themes.light.radius.xl} - ${FEATURES_CARD_BORDER_WIDTH} )`,
    );
    expect(css).not.toContain("calc( 26px");
  });
});

/*
 * Contraste AA (spec §3, "el contrato de accesibilidad"): texto de la
 * tarjeta sobre `semantic.surface` (ya cubierto de forma genérica por
 * `theme/tokens/contrast.test.ts`, se repite aquí acotado a los roles
 * concretos que usa ESTE componente).
 *
 * Task 15 (2026-08-11): AQUÍ VIVÍA el candado del número del badge sobre su
 * fondo `color-mix(in oklab, accentColor 12%, surface)`, con su propio
 * `mixOklab` (jsdom no resuelve `color-mix()`, así que la mezcla se calculaba
 * a mano). Se va con el badge -- un candado sobre un elemento que ya no se
 * renderiza no protege nada, solo parece cobertura. El helper `mixOklab` era
 * suyo en exclusiva y se va con él; las cifras medidas quedan en la historia
 * de `RULES.md` (deuda cerrada por la Task 26) por si el badge volviera.
 * La etiqueta del badge era además el único consumidor de `semantic.textSubtle`
 * en esta sección, así que ese tercer assert también se retira: seguía en
 * verde por aritmética pura, sin ningún elemento detrás.
 */
describe("contraste AA de las tarjetas de Features (rama clara)", () => {
  const AA_TEXTO_NORMAL = 4.5;

  it("titulo (semantic.text) y cuerpo/bullets/intro (semantic.textMuted) cumplen AA sobre semantic.surface", () => {
    const { semantic } = themes.light;
    expect(
      contrastRatio(semantic.text, semantic.surface),
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    expect(
      contrastRatio(semantic.textMuted, semantic.surface),
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
  });

  // Medido subiendo el umbral a 21:1 a proposito y leyendo el mensaje del
  // fallo (asi se comprueba que el numero es real y no una tautologia):
  // 5.84:1.
  it("Task 15: el kicker (semantic.brandText) cumple AA sobre semantic.surface, el fondo REAL de la rama clara", () => {
    const { semantic } = themes.light;
    const ratio = contrastRatio(semantic.brandText, semantic.surface);
    expect(
      ratio,
      `contraste ${ratio.toFixed(2)}:1, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
  });
});

/*
 * Contraste AA de la cabecera OSCURA nueva (Task 15). La unificación de
 * CONTENIDO no unifica FONDOS: aquí el texto no cae sobre `semantic.surface`
 * sino sobre la escena `FeaturesCelestialOrbital`, así que se mide contra
 * `FEATURES_ORBITAL_VOID` -- el mismo suelo medible por código que ya usa el
 * candado de `ScSpanGaming` (Task 12, más abajo), y por el mismo motivo:
 * jsdom no compone las capas WebP reales, de modo que esto acota el peor caso
 * de fondo plano, no el píxel final compuesto (ese se mide en navegador, ver
 * el informe de la tarea).
 *
 * Se miden los TRES roles que la cabecera nueva estrena en oscuro y que hasta
 * hoy no tenían ningún candado sobre este fondo: `brandText` (kicker), `text`
 * (h2) y `textMuted` (párrafo de entrada; ya lo usaba `ScDarkBody`, que
 * tampoco estaba medido contra el void).
 *
 * Medido subiendo el umbral a 21:1 a propósito y leyendo los tres mensajes de
 * fallo (así se comprueba que las cifras son reales y no una tautología):
 * kicker 12.31:1, h2 17.97:1, intro 12.25:1. Los tres muy por encima de AA;
 * el más ajustado de esta sección sigue siendo el acento de Gaming (4.71:1,
 * describe "Task 12", más abajo).
 */
describe("Task 15: contraste AA de la cabecera oscura sobre el void de la escena", () => {
  const AA_TEXTO_NORMAL = 4.5;

  it.each([
    ["kicker (brandText)", themes.dark.semantic.brandText],
    ["h2 (text)", themes.dark.semantic.text],
    ["intro (textMuted)", themes.dark.semantic.textMuted],
  ])("%s sobre FEATURES_ORBITAL_VOID >= 4.5:1", (_rol, color) => {
    const ratio = contrastRatioHex(color, FEATURES_ORBITAL_VOID);
    expect(
      ratio,
      `contraste ${ratio.toFixed(2)}:1, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
  });
});

/*
 * Task 3 (tres cierres pequeños, 2026-08-10): el CTA de texto de cada
 * tarjeta ("Aprende más →" etc.) medía 12px (`type.scale.caption`), por
 * debajo del suelo de legibilidad de 14px del encargo. Sube al escalón más
 * próximo de la escala que sí cumple ese suelo (`type.scale.bodySm`, 14px --
 * el siguiente paso, `body`, es 16px, más lejos de los 12px de partida). Por
 * `getComputedStyle`, no por CSS inyectado: `font-size` no vive dentro de
 * ningún `@media` en `ScCta` (regla 36/38 -- fuera de un media query, medir
 * el estilo computado es legítimo). `ScCta` es el MISMO componente en las
 * dos ramas (D-mismo, ver `Features.tsx`), así que un solo assert de tamaño
 * cubre las dos.
 */
describe("Task 3: CTA de tarjeta de Features a >=14px (antes 12px)", () => {
  const AA_TEXTO_NORMAL_CTA = 4.5;

  it("el CTA de cada tarjeta mide bodySm (14px), no caption (12px) (rama clara)", () => {
    const { container } = renderWithProviders(<Features />);
    const ctas = Array.from(container.querySelectorAll('a[href="#contact"]'));
    expect(ctas).toHaveLength(FEATURE_KEYS.length);
    ctas.forEach((cta) => {
      expect(getComputedStyle(cta as HTMLElement).fontSize).toBe(
        themes.light.type.scale.bodySm.size,
      );
      expect(getComputedStyle(cta as HTMLElement).fontSize).not.toBe(
        themes.light.type.scale.caption.size,
      );
    });
  });

  /*
   * Contraste AA "del estado resultante" (brief de la tarea): el tamaño de
   * fuente NO altera el color del CTA (`accentColor`/`accentColorHover`), así
   * que el umbral aplicable es el de texto normal (4.5:1) tanto a 12px como a
   * 14px -- ninguno de los dos llega al suelo de texto grande
   * (≥18.66px bold/≥24px regular).
   *
   * Hasta la Task 26 (2026-08-10) esta zona era SOLO prosa, sin assert a
   * propósito: medido entonces, el CTA de las TRES tarjetas de la rama clara
   * y el de "gaming" en oscuro incumplían AA (defecto preexistente,
   * documentado en RULES.md, "Deuda conocida", con los seis ratios) --
   * `accentColor`/`accentColorHover` compartían el mismo par de pasos de
   * `palette` en las dos ramas, y un paso más oscuro que arregla el
   * contraste sobre `surface` (blanco) lo EMPEORABA sobre `bg` (casi negro).
   *
   * La Task 26 CIERRA ese hallazgo resolviendo `accentColor`/
   * `accentColorHover` POR RAMA (`theme.isLight`, ver sus docblocks en
   * `Features.tsx`): la prosa con los ratios se sustituye aquí por el
   * assert -- el candado que faltaba, no una repetición del hallazgo. Ni
   * `semantic.surface` (claro) ni `semantic.bg` (oscuro) son `color-mix()`
   * (ver `themes.ts`/`semantic.ts`), así que no hace falta reproducir
   * ninguna mezcla (lección repo 2026-08-06) -- `contrastRatio` mide
   * directamente contra el fondo real de cada rama.
   */
  it.each(FEATURE_KEYS)(
    "tarjeta %s: accentColor (reposo) cumple AA (>=4.5:1) sobre semantic.surface (claro) y semantic.bg (oscuro)",
    (key) => {
      const { light, dark } = themes;
      const ratioLight = contrastRatio(
        accentColor(light, key),
        light.semantic.surface,
      );
      const ratioDark = contrastRatio(accentColor(dark, key), dark.semantic.bg);
      expect(
        ratioLight,
        `reposo claro ${key}: ${ratioLight.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL_CTA);
      expect(
        ratioDark,
        `reposo oscuro ${key}: ${ratioDark.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL_CTA);
    },
  );

  it.each(FEATURE_KEYS)(
    "tarjeta %s: accentColorHover (hover/focus-visible) cumple AA (>=4.5:1) sobre semantic.surface (claro) y semantic.bg (oscuro)",
    (key) => {
      const { light, dark } = themes;
      const ratioLight = contrastRatio(
        accentColorHover(light, key),
        light.semantic.surface,
      );
      const ratioDark = contrastRatio(
        accentColorHover(dark, key),
        dark.semantic.bg,
      );
      expect(
        ratioLight,
        `hover claro ${key}: ${ratioLight.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL_CTA);
      expect(
        ratioDark,
        `hover oscuro ${key}: ${ratioDark.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL_CTA);
    },
  );
});

/*
 * Ajuste visual 2026-08-08: los bullets vuelven a UNA columna en TODOS los
 * anchos. Hasta fix wave D sobrevivía un `@media` de `lg` (mecanismo
 * `$compactFrom`) que ya no repartía en dos columnas, solo ensanchaba el
 * `gap`. Por texto del CSS inyectado y no con `getComputedStyle`: jsdom no
 * evalua NINGUN @media al calcular estilos (lección repo 2026-07-27), asi
 * que el estilo computado devuelve `1fr` tanto con la regla como sin ella.
 * Se acota con `cssRuleTextFor` a las clases del PROPIO contenedor de
 * bullets: `injectedCss()` arrastraria el resto del stylesheet.
 *
 * Fix wave D (hallazgo D4, revisión final de rama, 2026-08-12) retira el
 * `@media` COMPLETO, no solo el `grid-template-columns` no-op que una
 * revisión anterior de este mismo fix había identificado y quitado -- ver el
 * docblock de `ScBullets` en `Features.tsx` para la medición completa en
 * navegador real: el `gap` que el `@media` ensanchaba es la shorthand
 * `row-gap column-gap`, y este grid nunca tiene una segunda columna a la que
 * aplicar `column-gap` (ni con la regla ni sin ella, en ningún ancho), así
 * que ni siquiera ESE efecto era real -- `$compactFrom` se retira con él.
 * Este test dejó entonces de comprobar "el @media existe y ensancha el gap" y
 * pasó a comprobar "no hay NINGÚN `@media` en el CSS de este contenedor" -- el
 * candado que habría atrapado el no-op original (el del gap, no solo el de
 * `grid-template-columns`) si hubiera existido antes. La crítica externa #15
 * (2026-09-02) lo relajó a "hay EXACTAMENTE una regla condicional y es la de
 * la tarjeta destacada", porque aquella entrega estrenó viñetas a dos columnas
 * en la destacada; la paridad de temas del 2026-09-04 retira esa regla (con la
 * medición que la refuta, en el docblock de `ScBullets`) y este candado vuelve
 * a su forma FUERTE: cero reglas condicionales, ni una.
 *
 * Validado con el bug inyectado: reintroduciendo el bloque
 * `@media ${(...) => themes.light.breakPoint.lg} { gap: ...; }` dentro de
 * `ScBullets` en Features.tsx, este test se pone rojo (`css` vuelve a
 * contener "@media"); restaurado, verde.
 */
describe("bullets: una columna, sin NINGUNA regla condicional", () => {
  function bulletsContainer(): HTMLElement {
    const cta = document.querySelector('a[href="#contact"]');
    return cta?.previousElementSibling as HTMLElement;
  }

  /*
   * CANDADO de la LEY DE VIÑETAS (mitad clara; la oscura está en el describe
   * "D4: en tema oscuro los bullets...", más abajo, y las dos juntas son el
   * candado de paridad). `ScBullets` es un styled COMPARTIDO por las dos ramas,
   * así que cualquier regla que alguien vuelva a colgar de él aparece en el
   * texto de ESTA clase -- da igual a qué rama pretenda alcanzar. Por eso el
   * recuento cerrado a CERO es lo que ata la ley: no "una columna en claro",
   * sino "una sola ley, sin excepciones por ancho ni por posición".
   */
  it("la regla base es una columna sin breakpoint, y no hay NINGUNA regla condicional", () => {
    renderWithProviders(<Features />);
    const contenedor = bulletsContainer();
    const css = cssRuleTextFor(contenedor);
    const base = css.split("\n").filter((line) => !line.includes("@media"));
    const enMedia = css.split("\n").filter((line) => line.includes("@media"));

    // Regla base (incondicional): una sola columna, gap fijo de space[2].
    expect(base.join("\n")).toMatch(/grid-template-columns:\s*1fr/);
    expect(base.join("\n")).toContain(`gap: ${themes.light.space[2]};`);

    // Recuento CERRADO a cero: ni el `lg` de la tarjeta destacada (retirado
    // el 2026-09-04) ni el `sm` de `$compactFrom` (retirado en fix wave D).
    expect(enMedia).toHaveLength(0);
    expect(css).not.toContain(themes.light.breakPoint.lg);
    expect(css).not.toContain(themes.light.breakPoint.sm);
    // Y ninguna regla condicional del stylesheet menciona esta clase.
    expect(selectoresCondicionalesDe(contenedor)).toHaveLength(0);
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

  /*
   * ESPEJO EXACTO del test de la cabecera clara (describe "Features", arriba:
   * "D6: la cabecera clara monta el h2 nuevo…" + "…el parrafo de entrada" +
   * "Task 15/D-E: …el kicker con voz…"). Que los dos aseveren lo MISMO con
   * las MISMAS claves es el candado de la decision D-C: mismo contenido en
   * las dos ramas.
   *
   * Lo que este test SUSTITUYE: hasta la Task 15, la rama oscura no tenia h2
   * propio -- el `<h2>` era el KICKER (`forwardedAs="h2"`), y la Task 11
   * (dieta de ornamento A, 2026-08-09) lo habia subido de `overline` (11px) a
   * `h5` (18px) precisamente para que el unico encabezado de la seccion no
   * fuera mas pequeno que su propio cuerpo (deuda ALTA de DESIGN.md §9). Esa
   * deuda se cierra ahora por la via de fondo, no por compensacion: la
   * seccion tiene un h2 de verdad (`ScDarkTitle`, la tesis "Tres formas de
   * seguir avanzando.") y el kicker vuelve a ser un kicker `overline`.
   */
  it("Task 15/D-C: la cabecera oscura monta la MISMA terna que la clara -- kicker con voz + h2 con la tesis (id=features-title) + parrafo de entrada", async () => {
    renderWithProviders(<Features />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.features.kicker)).toBeInTheDocument();
    });

    // El h2 es la TESIS, no el kicker.
    const heading = screen.getByRole("heading", {
      level: 2,
      name: esHome.Home.features.title,
    });
    expect(heading).toHaveAttribute("id", "features-title");

    // El kicker NO es un encabezado, y vuelve a su tamano de kicker.
    const kicker = screen.getByText(esHome.Home.features.kicker);
    expect(kicker.tagName).not.toMatch(/^H[1-6]$/);
    expect(getComputedStyle(kicker).fontSize).toBe(
      themes.dark.type.scale.overline.size,
    );

    // El parrafo de entrada, que hasta hoy solo existia en claro.
    expect(screen.getByText(esHome.Home.features.intro)).toBeInTheDocument();

    // La region toma su nombre del h2 real, igual que en claro.
    const region = screen.getByRole("region", {
      name: esHome.Home.features.title,
    });
    expect(region).toHaveAttribute("id", "features");
  });

  /*
   * El clamp del h2 oscuro, por texto del CSS inyectado (misma tecnica y
   * mismo motivo que el resto de palancas fluidas de esta rama, describe "D4"
   * mas abajo): la restriccion es "contenido + relleno <= ALTO del viewport",
   * asi que el termino fluido lleva `dvh` -- regla 24 de RULES.md. Sin este
   * candado, alguien podria "arreglar" el desbordamiento del contenido nuevo
   * escribiendo el clamp en `vw`, que es el defecto ya medido y documentado
   * en `ScDarkFrame`.
   */
  it("Task 15: el h2 oscuro escala con un clamp cuyo termino fluido mide el ALTO (dvh), no solo el ancho", async () => {
    renderWithProviders(<Features />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.features.title)).toBeInTheDocument();
    });
    const heading = screen.getByRole("heading", {
      level: 2,
      name: esHome.Home.features.title,
    });
    const css = cssRuleTextFor(heading);
    expect(css).toMatch(/font-size:\s*clamp\(/);
    expect(css).toContain("dvh");
    expect(css).toContain(themes.dark.type.scale.h2.size);
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
    expect(sectionCss).not.toMatch(OVERFLOW_DE_SCROLL);
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
    expect(sectionCss).not.toMatch(OVERFLOW_DE_SCROLL);

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

/*
 * Objetivo 1 (D4, encargo 2026-08-04): la rama CLARA pasa a `min-height:
 * 100dvh` con el contenido centrado, sin tocar la rama oscura (que ya lo
 * tenía). Por texto del CSS inyectado: `min-height`/`display`/
 * `justify-content` no dependen de ningún `@media`, así que aquí sí sería
 * legítimo usar `getComputedStyle` -- pero se mantiene `cssRuleTextFor` por
 * consistencia con el resto del fichero y porque compone con las mismas
 * aserciones que ya prueban `ScFeatures` en oscuro.
 */
describe("Objetivo 1 (D4): tema claro con min-height 100dvh y centrado vertical", () => {
  it("ScFeatures (rama clara) declara min-height: 100dvh y centra con flex-direction column + justify-content center", () => {
    const { container } = renderWithProviders(<Features />);
    const section = container.querySelector("#features") as HTMLElement;
    const css = cssRuleTextFor(section);

    expect(css).toContain("min-height: 100dvh");
    expect(css).toContain("flex-direction: column");
    expect(css).toContain("justify-content: center");
  });
});

/*
 * Objetivo 2 / D7 (encargo 2026-08-04): `useSectionProgress` se llama de
 * forma incondicional en `Features()` y se ata SOLO al `<ScFeatures>` de la
 * rama clara (`featuresRef`). Test FUNCIONAL, no solo de CSS: dispara el
 * IntersectionObserver mockeado y comprueba que el hook escribe de verdad
 * `--features-enter`/`--features-progress` sobre el elemento -- mismo
 * mecanismo que ya valida `useSectionProgress.test.tsx`, aquí verificando
 * que Features.tsx lo CONSUME correctamente (ref estable, prefix propio).
 */
describe("D7/D1: progreso de scroll de la rama clara (useSectionProgress)", () => {
  it("escribe --features-enter/--features-progress sobre ScFeatures al intersecar, y no --section-* (prefix propio)", () => {
    const { container } = renderWithProviders(<Features />);
    const section = container.querySelector("#features") as HTMLElement;

    expect(section.style.getPropertyValue("--features-progress")).toBe("");
    act(() => trigger(true));

    expect(section.style.getPropertyValue("--features-enter")).not.toBe("");
    expect(section.style.getPropertyValue("--features-progress")).not.toBe("");
    expect(section.style.getPropertyValue("--section-enter")).toBe("");
  });

  it("ScFigure traslada su figura ligada a --features-progress, solo transform, con guard de reduced-motion", () => {
    const { container } = renderWithProviders(<Features />);
    const figure = container.querySelector("img") as HTMLImageElement;
    const css = cssRuleTextFor(figure);

    expect(css).toContain("translateY(");
    expect(css).toContain("var(--features-progress");

    const reduceLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("transform"),
      );
    expect(reduceLine).toBeDefined();
    expect(reduceLine).toMatch(/transform:\s*none/);
  });
});

/*
 * D7 (encargo 2026-08-04): las entradas de Features (rama clara -- `ScItem`
 * de entonces -- y rama oscura -- `ScDarkContent`) se unificaron a
 * `motion.duration.slower` + `motion.easing.decelerate`. Antes: `ScItem`
 * usaba `slow` + `emphasized`, `ScDarkContent` usaba `slow` + `decelerate`
 * -- dos criterios de entrada distintos en el mismo fichero.
 *
 * D9 (spec `2026-08-06-story-features-tema-claro-design.md`) REVISÓ esa
 * unificación solo en la rama CLARA: `ScItem` se sustituyó por `ScReveal`
 * (cabecera + tarjetas bajo un único reveal), con la duración/easing
 * VERBATIM del mockup nuevo -- 640ms + `motion.easing.standard` --, que dejó
 * de coincidir con `slower`/`decelerate`. La rama OSCURA (`ScDarkContent`)
 * quedó INTACTA (D1 de la spec nueva: no se tocaba) y las dos ramas
 * divergieron durante varias tareas.
 *
 * Task 19 (D7, "terminar la unificación" + curva propia de REVEAL) cierra
 * esa divergencia: las DOS ramas migran a `REVEAL.durationMs`/
 * `REVEAL.easing`/`REVEAL.shift` (`@/motion/vocabulary`) -- 480ms, la curva
 * propia de REVEAL (ya NO `decelerate`), 16px. Es la migración que da a
 * `REVEAL` su primer consumidor real (gate F2: 0 consumidores antes de esta
 * tarea) -- ver también `src/test/vocabulary-consumers.test.ts`.
 *
 * Por texto del CSS inyectado, no `getComputedStyle`: medido en este repo,
 * jsdom SÍ resuelve el longhand `transition-delay` cuando se declara SUELTO
 * (test existente en este mismo fichero), pero NO resuelve
 * `transitionDuration`/`transitionTimingFunction` cuando `transition` es una
 * lista de dos declaraciones separadas por coma
 * (`transitionDuration`/`transitionTimingFunction` devuelven cadena vacía) --
 * un matiz nuevo del mismo mecanismo que documenta `task/lessons.md`
 * 2026-07-25 para `animation:`. `cssRuleTextFor` no depende de esa
 * resolución: lee el texto tal como lo escribió el componente.
 */
describe("Task 19 (D7): duración/easing de entrada convergen en REVEAL.* en las DOS ramas", () => {
  it("ScReveal (rama clara) usa REVEAL.durationMs/REVEAL.easing/REVEAL.shift, ya no 640ms/easing.standard/22px", () => {
    const { container } = renderWithProviders(<Features />);
    // Ancla al PRIMER retardo real del array (80ms, el h2 -- Task 11,
    // 2026-08-09, retiró el eyebrow que antes ocupaba el retardo 0ms), no a
    // un literal "0" a mano que dejaría de existir en el DOM.
    const item = container.querySelector(
      `[data-reveal-delay="${FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}"]`,
    ) as HTMLElement;
    const css = cssRuleTextFor(item);

    expect(css).toContain(`${REVEAL.durationMs}ms`);
    expect(css).toContain(REVEAL.easing);
    expect(css).toContain(`translateY(${REVEAL.shift})`);
    expect(css).not.toContain("640ms");
    expect(css).not.toContain(themes.light.motion.easing.standard);
    expect(css).not.toContain(themes.light.motion.easing.decelerate);
  });

  it("ScDarkContent (rama oscura) usa REVEAL.durationMs/REVEAL.easing/REVEAL.shift, ya no easing.decelerate en crudo", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Features />);
      await waitFor(() => {
        expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
      });
      const content = container.querySelector("[data-revealed]") as HTMLElement;
      const css = cssRuleTextFor(content);

      expect(css).toContain(`${REVEAL.durationMs}ms`);
      expect(css).toContain(REVEAL.easing);
      expect(css).toContain(`translateY(${REVEAL.shift})`);
      expect(css).not.toContain(themes.dark.motion.easing.decelerate);
      expect(css).not.toContain(themes.dark.motion.duration.slow);
    } finally {
      window.localStorage.clear();
    }
  });

  it("las DOS ramas producen el MISMO texto de transition (misma gramática de entrada)", async () => {
    const light = renderWithProviders(<Features />);
    const lightItem = light.container.querySelector(
      `[data-reveal-delay="${FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}"]`,
    ) as HTMLElement;
    const lightTransition = getComputedStyle(lightItem).transition;
    light.unmount();

    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const dark = renderWithProviders(<Features />);
      await waitFor(() => {
        expect(dark.container.querySelectorAll("img").length).toBeGreaterThan(
          0,
        );
      });
      const darkContent = dark.container.querySelector(
        "[data-revealed]",
      ) as HTMLElement;
      const darkTransition = getComputedStyle(darkContent).transition;

      expect(lightTransition).toBe(darkTransition);
      expect(lightTransition).toBe(
        `opacity ${REVEAL.durationMs}ms ${REVEAL.easing},transform ${REVEAL.durationMs}ms ${REVEAL.easing}`,
      );
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * D7 (encargo 2026-08-04): `ScCta` -- el CTA de texto de cada identidad --
 * ganó `:focus-visible` propio, resuelto contra `semantic.focus`, encima del
 * anillo global.
 *
 * ESTE CANDADO SE DIO LA VUELTA el 2026-09-02 (crítica externa #14, P1 de
 * Craft): el halo por `box-shadow` se retiró al unificar el anillo de foco
 * del sitio en una sola declaración (`GlobalStyles.tsx`, geometría en
 * `src/theme/tokens/focus.ts`). Lo que el bloque `&:focus-visible` de `ScCta`
 * sigue aportando, y este test sigue atando como sonda positiva, es lo que NO
 * es anillo: el salto de acento -- foco y hover comunican aquí la misma cosa
 * -- y el `border-radius`, que ahora redondea el outline global.
 */
describe("crítica #14 (P1): el :focus-visible del CTA aporta acento, no anillo", () => {
  it("ScCta declara :focus-visible con el acento de hover y sin ningún anillo propio", () => {
    const { container } = renderWithProviders(<Features />);
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;

    /*
     * Se acota a la REGLA de :focus-visible, no al texto desde su índice
     * hasta el final: `cssRuleTextFor` une las reglas con saltos de línea,
     * así que un `slice()` arrastraría también las reglas siguientes y una
     * aserción negativa sobre él no probaría nada de este bloque.
     *
     * Y se ata el MECANISMO (no hay ni box-shadow ni outline aquí), no el
     * color: `semantic.focus` en claro resuelve al MISMO valor exacto que el
     * acento de una de las tarjetas -- oklch(0.53 0.13 235.851) --, así que
     * una aserción "el CSS no contiene el color de foco" da rojo por el
     * motivo equivocado. Medido al escribir este test, no supuesto.
     */
    const reglaFoco = cssRuleTextFor(cta)
      .split("\n")
      .find((regla) => regla.includes(":focus-visible"));
    expect(reglaFoco, "ScCta perdió su bloque :focus-visible").toBeDefined();

    // Sonda positiva: sigue aportando lo suyo -- acento y radio.
    expect(reglaFoco).toContain("color:");
    expect(reglaFoco).toContain("border-radius");
    // Y ya no pinta anillo de ninguna de las dos formas posibles.
    expect(reglaFoco).not.toContain("box-shadow");
    expect(reglaFoco).not.toContain("outline");
  });

  /*
   * Task 9 (craft de interacción): ScCta gana
   * :active { transform: scale(...) } (vocabulary.PRESS), retira
   * FEATURES_CTA_TRANSITION_MS (150ms) en favor de PRESS.durationMs/
   * PRESS.easing para transform, y su :hover (translateX + color, mueve)
   * pasa a guardarse tras PRESS.hoverGuard. Validado con el bug inyectado a
   * propósito (ver informe de la tarea, tabla ScCta): comentando
   * temporalmente cada bloque en Features.tsx el test correspondiente se
   * pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 9: ScCta declara :active con transform: scale(PRESS.activeScale), y el hover (translateX) vive dentro de PRESS.hoverGuard", () => {
    const { container } = renderWithProviders(<Features />);
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;
    const css = cssRuleTextFor(cta);

    const guardIndex = css.indexOf(`@media ${PRESS.hoverGuard}`);
    expect(guardIndex).toBeGreaterThan(-1);
    const guardBlock = css.slice(guardIndex);
    expect(guardBlock).toContain(":hover");
    expect(guardBlock).toContain("translateX(");

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);
    expect(css).not.toContain("150ms");
  });

  /*
   * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
   * con el bug inyectado a propósito (ver informe de la tarea): comentando
   * temporalmente `touch-action: manipulation;` de ScCta (Features.tsx),
   * este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: ScCta declara touch-action: manipulation", () => {
    const { container } = renderWithProviders(<Features />);
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;
    const css = cssRuleTextFor(cta);
    expect(css).toContain("touch-action: manipulation");
  });
});

/*
 * Bug corregido en el trabajo manual del usuario (informe de la tarea): el
 * título de "gaming" usaba `ScSpanImagination` en vez de `ScSpanGaming`
 * (copia-pega). Hasta Task 12 (dieta de ornamento B, 2026-08-09) se distinguía
 * por `background-clip: text` -- `ScSpanGaming` recortaba un degradado propio,
 * `ScSpanImagination` solo fijaba un `color` sólido. Esa tarea convirtió el
 * degradado de `ScSpanGaming` en color sólido (`FEATURES_GAMING_ACCENT`, ver
 * su docblock en `Features.tsx`), así que el candado pasa a ser el COLOR
 * computado: `FEATURES_GAMING_ACCENT` (hue 340) es un literal propio,
 * distinto de `semantic.brand`/`primary[500]` (hue 235.851) que resuelve
 * `ScSpanImagination` -- los dos JAMÁS coinciden en ningún tema. Validado con
 * el bug inyectado a propósito (ver informe de la tarea): sustituyendo
 * `ScSpanGaming` por `ScSpanImagination` en el término "gaming" del título
 * oscuro, este test se pone en rojo (el color computado pasa a ser el de
 * `semantic.brand`); restaurado, vuelve a verde.
 */
describe("bug corregido: el termino 'gaming' del titulo oscuro usa ScSpanGaming", () => {
  it("el span de 'gaming' resuelve FEATURES_GAMING_ACCENT, no semantic.brand (el color de ScSpanImagination)", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      renderWithProviders(<Features />);
      await waitFor(() => {
        expect(
          screen.getByText(esHome.Home.features.gaming.title),
        ).toBeInTheDocument();
      });
      const gamingSpan = screen.getByText(esHome.Home.features.gaming.title);

      expect(getComputedStyle(gamingSpan).color).toBe(FEATURES_GAMING_ACCENT);
      expect(getComputedStyle(gamingSpan).color).not.toBe(
        themes.dark.semantic.brand,
      );
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08): el termino
 * "Gaming" pasa de degradado de texto a color solido -- ver el docblock de
 * `ScSpanGaming`, Features.tsx, para el porque. `color:transparent` dejaba
 * esta pieza FUERA del alcance de `contrast.ts`; ahora que es un color plano
 * se puede medir de verdad, cerrando parte del hueco que senalo la auditoria
 * ("6 piezas color:transparent fuera del alcance de contrast.ts"). Fondo
 * real: `FEATURES_ORBITAL_VOID` (hex, el void de la escena oscura de
 * Features -- jsdom no compone las capas WebP reales, asi que esto es el
 * suelo medible por codigo, no el pixel final compuesto; ver el docblock de
 * `FEATURES_ORBITAL_VOID` en featuresCelestialOrbital.layers.ts). `contrast.ts`
 * solo acepta dos oklch(): `contrastRatioHex` (misma formula, con un canal
 * hex->linear-sRGB anadido para el lado del void) es la extension que esta
 * tarea le hace, reutilizada tambien por Story.test.tsx/Contact.test.tsx/
 * Journey.test.tsx para su propio void oscuro.
 */
/*
 * QA §6, item 44 (2026-08-15): ESTE CANDADO YA NO EXIGE 4.5:1, EXIGE 5.0:1, y
 * el motivo es la unica leccion transferible del item.
 *
 * Hasta hoy pedia AA (4.5) contra el void hexadecimal, y el acento daba 4.71
 * -- verde. Medido en navegador sobre el PIXEL PINTADO, con las capas WebP de
 * la escena encima del void y las animaciones congeladas, ese mismo acento
 * daba entre 4.49 y 4.66 de mediana segun la posicion de scroll: por debajo de
 * AA en el peor caso. El candado estaba verde sobre un fondo que el visitante
 * no ve.
 *
 * jsdom no compone las capas, asi que este test NO PUEDE medir el pixel final;
 * lo que si puede es exigirle al suelo medible una RESERVA del tamano que la
 * medicion en navegador demostro que hace falta:
 *
 *   coste del arte sobre el void, medido a L=0.65: 5.31 (void) -> 5.05 (pixel
 *   pintado, peor posicion de scroll) = 0.26
 *   variacion entre posiciones de scroll, medida en 7 posiciones x 2 anchos:
 *   0.17
 *
 * Con el suelo en 5.0, el peor pixel pintado queda en ~4.74 -- por encima de
 * AA con margen. Con el suelo en 4.5 no quedaba: por eso el numero sube.
 *
 * Efecto practico: devolver `FEATURES_GAMING_ACCENT` a su L de 0.62 (4.72
 * contra el void) pone este test en ROJO, que es justo lo que el candado
 * viejo no hacia.
 */
const GAMING_SUELO_SOBRE_VOID = 5.0;

describe("Task 12: contraste AA del acento solido de Gaming (rama oscura)", () => {
  it(`FEATURES_GAMING_ACCENT sobre FEATURES_ORBITAL_VOID >= ${GAMING_SUELO_SOBRE_VOID}:1, la reserva que el arte real se come (medido: 5.31:1 contra el void, 5.05 sobre el pixel pintado)`, () => {
    const ratio = contrastRatioHex(
      FEATURES_GAMING_ACCENT,
      FEATURES_ORBITAL_VOID,
    );
    expect(ratio, `contraste ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      GAMING_SUELO_SOBRE_VOID,
    );
  });
});

/*
 * D4 (encargo 2026-08-04): palancas de compactación vertical del contenido
 * oscuro -- `padding-block` fluido de `ScDarkFrame`, `margin-block-start`
 * fluido de `ScDarkFeatures` y `padding-block` fluido de
 * `ScDarkFeatureBlock`. Eran CUATRO hasta el 2026-09-04: la cuarta era el
 * `font-size` fluido de `ScDarkFeatureTitle`, retirada con su test por la
 * paridad de temas (ver la lápida al final de este describe). Todas con
 * `clamp()`, todas con el mismo suelo/techo documentado en `Features.tsx`.
 * Por texto del CSS
 * inyectado: `clamp()` no depende de ningún `@media`, pero se mantiene el
 * mismo mecanismo `cssRuleTextFor` que el resto del fichero por consistencia
 * y para no arrastrar el resto del stylesheet acumulado.
 */
describe("D4: palancas de compactación vertical del contenido oscuro (clamp fluido)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  /*
   * El termino fluido va en `dvh`, y el test lo exige explicitamente en vez de
   * conformarse con "hay un clamp". La primera version de esta palanca usaba
   * `6vw` y medía el eje EQUIVOCADO: la restriccion es el ALTO del viewport,
   * y en un 1280x720 -- el portatil mas comun del rango -- `6vw` son 76,8px,
   * por encima del techo de 64px, asi que el clamp se quedaba en su maximo y
   * no ahorraba ni un pixel justo donde el marco desbordaba 128px (medido en
   * navegador). Aseverar la UNIDAD, y no solo la presencia del clamp, es lo
   * que impide que ese defecto vuelva a entrar sin que nadie lo note.
   */
  it("ScDarkFrame acota su padding-block con un clamp fluido en dvh, no en vw", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#features") as HTMLElement;
    const frame = section.children[1] as HTMLElement;
    const css = cssRuleTextFor(frame);

    expect(css).toMatch(/padding-block:\s*clamp\(\s*1rem,\s*3\.5dvh,/);
    expect(css).not.toContain("6vw");
  });

  /*
   * AQUI VIVIO "ScDarkFeatureTitle usa font-size: clamp(...) acotado por abajo
   * a 1.125rem", la cuarta palanca de D4. Se retira con la palanca: el titular
   * de tarjeta lee hoy `type.scale.h3` sin sobreescritura en las DOS ramas
   * (decision del dueno, paridad de Features entre temas, 2026-09-04). El
   * candado que lo sustituye NO es mas debil -- es el describe "paridad de
   * temas: el titular de tarjeta lee el MISMO token en las dos ramas", al final
   * de este fichero, que afirma en positivo lo que ahora tiene que ser cierto
   * y cae en rojo si alguien devuelve cualquier `font-size` propio a esta rama.
   * Las otras TRES palancas de D4 (los `padding`/`margin` fluidos) siguen aqui
   * arriba, intactas y con su test.
   */
});

/*
 * D4/ajuste visual 2026-08-08 (histórico): en la rama OSCURA el `@media` del
 * bloque de bullets vivía en el breakpoint `sm` (600px), no `lg` (992px)
 * como en la rama clara -- mecanismo `$compactFrom`. El ajuste visual del
 * 2026-08-08 lo dejó en UNA columna en ese breakpoint, igual que en la rama
 * clara -- el `@media` solo ensanchaba el `gap`.
 *
 * Fix wave D (hallazgo D4, revisión final de rama, 2026-08-12) retira el
 * `@media` COMPLETO -- ver el docblock de `ScBullets` en `Features.tsx` para
 * la medición en navegador real: el `gap` que este bloque `sm` ensanchaba es
 * la shorthand `row-gap column-gap`, y el grid de bullets (rama oscura
 * incluida) nunca tiene una segunda columna a la que aplicar `column-gap`
 * -- cero diferencia observable en ningún ancho, con o sin la regla.
 * `$compactFrom="sm"` se retira de la rama oscura con él. Este test pasó de
 * comprobar "el bloque `sm` ensancha el gap" a comprobar que la rama oscura
 * NO declara ningún `@media` propio para sus bullets -- mismo candado que la
 * rama clara (ver el describe "bullets: una columna de base..." de más
 * arriba). La crítica externa #15 (2026-09-02) cambia el instrumento sin
 * aflojar la promesa: `ScBullets` es compartido, así que ahora se resuelve el
 * selector contra el DOM en vez de leer su texto; ver el comentario del `it`.
 *
 * Validado con el bug inyectado a propósito: reintroduciendo
 * `<ScBullets $compactFrom="sm">` en la rama oscura de `Features.tsx` (con
 * su `@media` correspondiente restaurado en `ScBullets`), este test se pone
 * en rojo (`css` vuelve a contener "@media"); restaurado, vuelve a verde.
 */
describe("D4: en tema oscuro los bullets siguen a una columna y la regla de la tarjeta destacada no los alcanza", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  /*
   * MITAD OSCURA DEL CANDADO DE LA LEY DE VIÑETAS (2026-09-04, paridad de
   * Features entre temas). La critica externa #15 (hallazgo C 3, 2026-09-02)
   * habia dejado este test comprobando algo mas debil -- "existe UNA regla
   * condicional y no alcanza a esta rama" --, que es justo la forma del defecto
   * que el dueno mando cerrar: la regla existia y repartia las viñetas en 2x2
   * en claro mientras aqui seguian en 4x1, sin que ninguna decision de
   * producto lo pidiera. Medido en Chrome sobre el build de `ef62b26`: claro
   * >= lg, primera tarjeta, `199.094px 199.109px`; oscuro, `501.75px` a un
   * carril en todos los anchos.
   *
   * El candado vuelve a su forma fuerte y ahora es SIMETRICO con el de la rama
   * clara: cero reglas condicionales. `ScBullets` es un styled COMPARTIDO, asi
   * que la clase es la misma en las dos ramas -- cualquiera que vuelva a
   * colgarle un `@media`, acotado o no, cae en rojo AQUI y en su gemelo claro
   * a la vez. Eso es lo que convierte dos tests en una sola ley.
   */
  it("una columna incondicional, sin NINGUNA regla condicional, igual que la rama clara", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;
    const bullets = cta.previousElementSibling as HTMLElement;
    const css = cssRuleTextFor(bullets);

    expect(css).toMatch(/grid-template-columns:\s*1fr/);
    expect(css).toContain(`gap: ${themes.dark.space[2]};`);
    // Ni `sm` (`$compactFrom`, fix wave D) ni `lg` (tarjeta destacada,
    // retirada en la paridad de temas del 2026-09-04).
    expect(css).not.toContain(themes.dark.breakPoint.sm);
    expect(css).not.toContain(themes.dark.breakPoint.lg);
    expect(css).not.toContain("@media");

    // Recuento CERRADO a cero, el mismo numero que la rama clara.
    expect(selectoresCondicionalesDe(bullets)).toHaveLength(0);
  });
});

/*
 * Crítica externa #8, punto 3: destinos indistinguibles en la rama clara.
 *
 * La entrega del 2026-08-16 separó los tres destinos de «Descubre» para que
 * tres etiquetas distintas dejaran de caer en el mismo sitio. Eso arregla el
 * MODELO, no la percepción: en el tema claro las tarjetas están una al lado
 * de otra, así que `feature-imagination-title` y `feature-gaming-title`
 * resuelven al MISMO píxel de scroll (4354, medido) -- llegar no informa de a
 * cuál se ha llegado. La señal que sí distingue es el foco, y para poder
 * recibirlo el titular tiene que ser focalizable sin entrar en el orden de
 * tabulación: `tabIndex={-1}`.
 *
 * INVARIANTE QUE CRUZA DOS FICHEROS (regla 41), y por eso el test importa los
 * dos: `src/config/navigation.ts` promete unos ids concretos en sus `href`, y
 * `Features.tsx` es quien tiene que emitirlos. Los ids NO se escriben a mano
 * aquí (regla 39): se derivan de `NAV_GROUPS`, la misma fuente que consume la
 * navegación, así que renombrar un ancla sin renombrar el titular cae en rojo
 * en vez de dejar un enlace mudo. La mitad del contrato que vive en el nav
 * -- que el click mueva el foco de verdad -- está en `Navbar.test.tsx`.
 *
 * Se afirma el FOCO REAL, no solo el atributo: `focus()` sobre un elemento
 * que jsdom no considera focalizable no lanza ningún error, simplemente no
 * hace nada, así que un candado que solo mirara `toHaveAttribute("tabindex")`
 * pasaría en verde sobre un titular que en la práctica no puede recibirlo.
 */
describe("crítica #8: los titulares de tarjeta son destino de foco de «Descubre»", () => {
  /** Ids prometidos por los `href` de `kind: "feature"`, leídos del modelo. */
  const anchorIds: readonly string[] = NAV_GROUPS.flatMap(
    (group) => group.items,
  )
    .filter((item) => item.kind === "feature")
    .map((item) => item.href.slice(item.href.indexOf("#") + 1));

  it("el modelo de navegación promete al menos un destino de feature (si no, el resto del describe pasaría en vacío)", () => {
    expect(anchorIds.length).toBeGreaterThan(0);
  });

  it("en tema CLARO cada id prometido es un h3 que recibe el foco de verdad", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });

    for (const id of anchorIds) {
      const titular = document.getElementById(id);
      expect(
        titular,
        `«${id}» no existe: el enlace de nav no lleva a nada`,
      ).not.toBeNull();
      expect(titular?.tagName).toBe("H3");
      expect(titular).toHaveAttribute("tabindex", "-1");

      titular?.focus();
      expect(
        document.activeElement,
        `«${id}» no puede recibir el foco, así que nada distingue su tarjeta de la de al lado`,
      ).toBe(titular);
    }
  });

  it("en tema OSCURO se mantiene la misma propiedad (el id de ancla no cambia de naturaleza con el tema)", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Features />);
      await waitFor(() => {
        expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
      });

      for (const id of anchorIds) {
        const titular = document.getElementById(id);
        expect(titular, `«${id}» no existe en la rama oscura`).not.toBeNull();
        expect(titular).toHaveAttribute("tabindex", "-1");

        titular?.focus();
        expect(document.activeElement).toBe(titular);
      }
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * Ola F de la critica #11 (integracion; barrido del agente del hero): los
 * DOS CTAs de tarjeta (#contact, rama clara y oscura) movian el scroll pero
 * no el foco -- el mismo defecto que el hallazgo B2 midio en el CTA del
 * hero. Cableados con el helper de la nav (focusNavAnchorTarget) y un
 * descriptor compartido entre href y handler. El destino se monta como stub
 * sin tabindex (la forma exacta de la seccion real de Contact) para
 * observar las DOS mitades del helper: el salto de foco y el tabindex="-1"
 * ganado. Validado con bug inyectado (onClick retirado -> rojo; restaurado
 * -> verde); ver el informe de integracion de la ola.
 */
describe("Features: los CTAs de tarjeta mueven el foco a #contact (las dos ramas)", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.getElementById("contact")?.remove();
  });

  function mountContactStub(): HTMLElement {
    const target = document.createElement("section");
    target.id = "contact";
    document.body.appendChild(target);
    return target;
  }

  it("rama clara: clic en un CTA de tarjeta deja el foco en la seccion destino", () => {
    const target = mountContactStub();
    const { container } = renderWithProviders(<Features />);
    const cta = container.querySelector(
      'a[href="#contact"]',
    ) as HTMLElement | null;
    expect(cta, "no hay ningun CTA a #contact en la rama clara").not.toBeNull();
    expect(target.hasAttribute("tabindex")).toBe(false);

    fireEvent.click(cta as HTMLElement);

    expect(document.activeElement).toBe(target);
    expect(target).toHaveAttribute("tabindex", "-1");
  });

  it("rama oscura: clic en un CTA de bloque deja el foco en la seccion destino", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const target = mountContactStub();
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelector('a[href="#contact"]')).not.toBeNull();
    });
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;

    fireEvent.click(cta);

    expect(document.activeElement).toBe(target);
    expect(target).toHaveAttribute("tabindex", "-1");
  });
});

/*
 * Critica externa #12 (2026-08-18), T2: el tope de ancho del CONTENIDO de la
 * seccion escribia `1280px` a mano teniendo ya `grid.sectionMax` (token creado
 * en el commit `b31be06`) para nombrar esa medida, que hasta esa fecha vivia
 * repetida en cuatro ficheros de seccion.
 *
 * El CSS renderizado es IDENTICO antes y despues -- el token resuelve al mismo
 * valor --, asi que la propiedad "el numero vive en el token, no en este
 * fichero" solo se observa en la FUENTE (`task/lessons.md`, 2026-08-12; mismo
 * patron que `Hero.qa.test.tsx` con `grid.heroCopyMax` y que
 * `journey.layers.test.ts` con `typeTokens.scale.deckTitle.size`). El lado
 * CONSUMIDOR -- que `ScDarkFrame` topa el contenido con esta constante -- ya lo
 * ata el test 3 (D8) mas arriba en este mismo fichero.
 */
describe("Features: critica externa #12 (T2)", () => {
  it("FEATURES_CONTENT_MAX_WIDTH deriva de grid.sectionMax, y features.layers.ts ya no escribe el literal", async () => {
    expect(FEATURES_CONTENT_MAX_WIDTH).toBe(grid.sectionMax);

    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    // Se despojan los comentarios antes de buscar: el docblock de la propia
    // constante cita el `1280px` en prosa, y sin esto el `not.toContain`
    // fallaria sobre codigo que SI esta migrado.
    const fuente = readFileSync(join(here, "features.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("grid.sectionMax");
    expect(fuente).not.toContain("1280px");
  });
});

/*
 * Critica externa #13 (2026-08-19), P0 de la ronda: WCAG 2.1 SC 1.4.4 (AA).
 * Ver el docblock equivalente en `Story.test.tsx` para el mecanismo completo.
 *
 * Features es el caso que demuestra que acotar las pistas NO basta: sus
 * rejillas ya declaraban `minmax(0, 1fr)` desde la Task 22 y aun asi, medido
 * en Chrome real a 390x844 con la raiz a 32px, el `h2` de la seccion pintaba
 * una linea de 320px dentro de una caja de 294px -- una sola palabra mas ancha
 * que su propia caja, que ninguna pista puede arreglar. `overflow-wrap:
 * break-word` es aqui el arreglo COMPLETO, no un refuerzo.
 */
describe("Features: critica #13 -- ampliar la fuente no recorta texto (SC 1.4.4)", () => {
  it("ScFeatures declara overflow-wrap: break-word, que se hereda a todo su texto", () => {
    renderWithProviders(<Features />);
    const section = document.getElementById("features") as HTMLElement;
    const base = cssRuleTextFor(section)
      .split("\n")
      .find(
        (line) => !line.includes("@media") && line.includes("overflow-wrap"),
      );

    expect(base).toMatch(/overflow-wrap:\s*break-word/);
  });
});

/*
 * Critica externa #15 (2026-09-02), hallazgo C 3: a 1440 en tema claro la
 * tarjeta DESTACADA medía 1.148 px de ancho y solo 416 px de tinta (36 %) --
 * 709 px de superficie blanca a la derecha de una columna de texto acotada por
 * `grid.prose`. Pasa a la composicion a dos columnas del mockup (arte a la
 * izquierda, contenido con bullets a dos columnas a la derecha) DESDE `lg`, el
 * mismo umbral en el que la rejilla le da su ancho completo. El porque completo
 * -- y por que no se acota la tarjeta al contenido, la otra via del hallazgo --
 * vive en el docblock de `ScCardSurface` (`Features.tsx`).
 *
 * Los candados no se conforman con el TEXTO de la regla: resuelven su
 * `selectorText` contra el DOM (`selectoresCondicionalesDe`, cabecera de este
 * fichero). Es la unica forma de afirmar lo que de verdad importa aqui -- que
 * la composicion alcanza a UNA tarjeta y no a las tres -- sin darle a ninguna
 * un prop o una clase propia, que es lo que el candado de D5 prohibe.
 */
describe("critica #15: la tarjeta destacada clara llena su ancho (composicion a dos columnas)", () => {
  function piezas(container: HTMLElement) {
    const cards = Array.from(
      container.querySelectorAll('article[aria-labelledby^="feature-"]'),
    ) as HTMLElement[];
    const surface = cards[0].firstElementChild as HTMLElement;
    return {
      cards,
      surface,
      panel: surface.firstElementChild as HTMLElement,
      content: surface.children[1] as HTMLElement,
    };
  }

  it("la superficie de la tarjeta destacada reparte arte y texto en dos pistas iguales desde lg", () => {
    const { container } = renderWithProviders(<Features />);
    const { surface } = piezas(container);
    const enMedia = cssRuleTextFor(surface)
      .split("\n")
      .filter((line) => line.includes("@media"));

    expect(enMedia).toHaveLength(1);
    expect(enMedia[0]).toContain(themes.light.breakPoint.lg);
    expect(enMedia[0]).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/,
    );
    // display: grid, no la columna flex de la composicion apilada.
    expect(enMedia[0]).toMatch(/display:\s*grid/);
  });

  it("la regla alcanza SOLO a la primera tarjeta, y sin darle prop ni clase propia", () => {
    const { container } = renderWithProviders(<Features />);
    const { cards, surface } = piezas(container);
    const selectores = selectoresCondicionalesDe(surface);

    expect(selectores).toHaveLength(1);
    const alcanzadas = Array.from(document.querySelectorAll(selectores[0]));
    expect(alcanzadas).toHaveLength(1);
    expect(cards[0].contains(alcanzadas[0])).toBe(true);
    // Las otras dos quedan fuera: la posicion es lo unico que las distingue.
    expect(cards[1].contains(alcanzadas[0])).toBe(false);
    expect(cards[2].contains(alcanzadas[0])).toBe(false);
    // Y las tres siguen compartiendo exactamente las mismas clases (D5).
    const clases = cards.map((c) => Array.from(c.classList).sort().join(" "));
    expect(new Set(clases).size).toBe(1);
  });

  it("el panel de arte suelta su alto fijo y conserva la medida del mockup como suelo", () => {
    const { container } = renderWithProviders(<Features />);
    const { panel } = piezas(container);
    const css = cssRuleTextFor(panel);
    const base = css.split("\n").filter((l) => !l.includes("@media"));
    const enMedia = css.split("\n").filter((l) => l.includes("@media"));

    // La composicion apilada conserva su alto fijo del mockup.
    expect(base.join("\n")).toContain(
      `height: ${FEATURES_IMAGE_PANEL_HEIGHT};`,
    );
    expect(enMedia).toHaveLength(1);
    // La destacada lo entrega a la fila, con el mismo valor como min-height.
    expect(enMedia[0]).toMatch(/height:\s*auto/);
    expect(enMedia[0]).toContain(`min-height: ${FEATURES_IMAGE_PANEL_HEIGHT};`);
    expect(enMedia[0]).toMatch(/margin-inline-end:\s*0/);
  });

  it("la columna de texto se centra contra el arte en la tarjeta destacada", () => {
    const { container } = renderWithProviders(<Features />);
    const { content } = piezas(container);
    const enMedia = cssRuleTextFor(content)
      .split("\n")
      .filter((line) => line.includes("@media"));

    expect(enMedia).toHaveLength(1);
    expect(enMedia[0]).toContain(themes.light.breakPoint.lg);
    expect(enMedia[0]).toMatch(/justify-content:\s*center/);
  });
});

/*
 * OLA M (2026-09-03): paridad de arte anunciado entre temas. La rama clara de
 * esta seccion ensena figuras con texto alternativo y la oscura no anunciaba
 * nada de su escena, asi que el mismo contenido se contaba distinto segun el
 * tema -- el hallazgo que la critica externa #16 midio como "32 alt vacios en
 * oscuro frente a 5 descriptivos en claro". La composicion se nombra en el
 * consumidor con role="img" + aria-label, mismo patron que Story y Journey, y las
 * capas de la escena siguen mudas, que es lo correcto.
 */
describe("ola M: la escena oscura se anuncia como una sola imagen con nombre", () => {
  beforeEach(() => {
    window.localStorage.setItem("vti-theme", "dark");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("la escena expone el texto de Home.features.sceneAlt", () => {
    renderWithProviders(<Features />);

    const escena = screen.getByRole("img", {
      name: esHome.Home.features.sceneAlt,
    });
    expect(escena).not.toHaveAttribute("aria-hidden");
  });

  it("ninguna capa de la escena gana texto alternativo: siguen con alt vacio", () => {
    const { container } = renderWithProviders(<Features />);
    const escena = screen.getByRole("img", {
      name: esHome.Home.features.sceneAlt,
    });

    Array.from(escena.querySelectorAll("img")).forEach((capa) => {
      expect(capa.getAttribute("alt")).toBe("");
    });
    expect(container).toBeTruthy();
  });
});

/*
 * Velo de contraste de la copia oscura (crítica externa #17, hallazgo de
 * contraste de Features). El velo es una propiedad puramente de PINTADO:
 * jsdom no pinta, no hace layout, no compone alfa y no evalúa `@media`, así
 * que estos candados solo pueden aseverar lo verificable sin motor de
 * render -- que la regla existe, de qué elemento cuelga, con qué color y qué
 * alfa tiñe, que no captura el puntero ni anima, y en qué dos condiciones se
 * retira. La medida real (0 % de muestras bajo 4,5:1 en un barrido de
 * posiciones de scroll a 390 y 768 px) es de navegador y está en el docblock
 * de `FEATURES_COPY_SCRIM_ALPHA` (Features.tsx).
 */
describe("Features oscuro: velo de contraste de la copia (crítica #17)", () => {
  beforeEach(() => {
    window.localStorage.setItem("vti-theme", "dark");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  /** Reglas de estilo (el OBJETO, no su texto) cuyo selector menciona alguna
   *  clase del elemento: la FORMA de un selector y el `@media` al que
   *  pertenece una regla solo se pueden aseverar sobre el objeto. */
  function reglasConSelectorDe(el: HTMLElement): CSSStyleRule[] {
    const clases = Array.from(el.classList);
    const out: CSSStyleRule[] = [];
    const walk = (rules: CSSRuleList): void => {
      Array.from(rules).forEach((rule) => {
        const selector = (rule as CSSStyleRule).selectorText;
        if (
          selector !== undefined &&
          clases.some((cls) => selector.includes(`.${cls}`))
        ) {
          out.push(rule as CSSStyleRule);
        }
        const anidadas = (rule as CSSGroupingRule).cssRules;
        if (anidadas) walk(anidadas);
      });
    };
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        walk(sheet.cssRules);
      } catch {
        /* hoja inaccesible: no aporta */
      }
    });
    return out;
  }

  function reglasDelVelo(): {
    base: CSSStyleRule;
    retiradas: CSSStyleRule[];
  } {
    const copia = screen.getByTestId("features-dark-copy");
    const before = reglasConSelectorDe(copia).filter((regla) =>
      regla.selectorText.endsWith("::before"),
    );
    const base = before.filter((r) => r.cssText.includes("linear-gradient"));
    expect(
      base,
      "se esperaba exactamente una regla ::before con el degradado del velo",
    ).toHaveLength(1);
    return {
      base: base[0],
      retiradas: before.filter((r) =>
        r.cssText.replace(/\s/g, "").includes("display:none"),
      ),
    };
  }

  it("cuelga del ::before del bloque de copia y tiñe con el void de la escena, no con semantic.bg", () => {
    renderWithProviders(<Features />);
    const copia = screen.getByTestId("features-dark-copy");
    const regla = reglasDelVelo().base;

    expect(
      Array.from(copia.classList).some((cls) =>
        regla.selectorText.includes(`.${cls}`),
      ),
      "el velo tiene que colgar del propio bloque de copia, no de un hijo ni del marco",
    ).toBe(true);

    const css = regla.cssText.replace(/\s/g, "");
    expect(css).toContain("linear-gradient");
    expect(css).toContain("color-mix(inoklch");
    // El tinte es el void de la escena: es lo que hace el velo invisible
    // sobre el vacío de la propia ilustración a cualquier opacidad.
    expect(css).toContain(FEATURES_ORBITAL_VOID.replace(/\s/g, ""));
    // Y NO el fondo de la sección, que sí cambiaría el color del vacío.
    expect(css).not.toContain(themes.dark.semantic.bg.replace(/\s/g, ""));
  });

  it("el alfa entregado es el 94 % que cerró la medición, no cualquier otro", () => {
    renderWithProviders(<Features />);
    const css = reglasDelVelo().base.cssText.replace(/\s/g, "");

    /* Literal a propósito, no leído de la constante: el valor está
       CALIBRADO en navegador (escalera medida a 390 px, líneas con alguna
       muestra bajo 4,5:1 partiendo de 84: 75 % -> 21; 88 % -> 3; 90 % -> 2;
       92 % -> 0, pero a 768 px todavía quedaba una línea con mínimo 4,46;
       94 % -> 0 en los dos anchos). Bajarlo vuelve a abrir el defecto, así
       que este candado tiene que ponerse rojo si alguien lo mueve sin
       repetir la medición. */
    expect(css).toContain("94%");
  });

  it("no captura el puntero, se pinta por detrás del texto y no anima nada", () => {
    renderWithProviders(<Features />);
    const css = reglasDelVelo().base.cssText.replace(/\s/g, "");

    expect(css).toContain("pointer-events:none");
    expect(css).toContain(`z-index:calc(${themes.dark.zIndex.base}-1)`);
    // Estático a propósito: hereda el fundido de entrada de su contenedor.
    expect(css).not.toContain("transition");
    expect(css).not.toContain("animation");
  });

  it("se retira bajo forced-colors y a partir de lg, que es donde el escritorio ya medía limpio", () => {
    renderWithProviders(<Features />);
    const { retiradas } = reglasDelVelo();

    const condiciones = retiradas.map(
      (regla) => regla.parentRule?.cssText ?? "",
    );
    expect(
      condiciones.some((texto) => texto.includes("forced-colors: active")),
      "falta el guard de forced-colors del velo",
    ).toBe(true);
    expect(
      condiciones.some((texto) => texto.includes(themes.dark.breakPoint.lg)),
      "falta la retirada del velo a partir de lg",
    ).toBe(true);
  });

  it("la rama CLARA no monta el bloque de copia oscuro, así que no puede heredar el velo", () => {
    window.localStorage.setItem("vti-theme", "light");
    renderWithProviders(<Features />);

    expect(screen.queryByTestId("features-dark-copy")).toBeNull();
  });
});

/*
 * PARIDAD DE TEMAS, 2026-09-04 (decisión del dueño): el titular de tarjeta lee
 * el MISMO token de la escala en las dos ramas.
 *
 * ## El defecto que este candado atrapa
 *
 * Hasta esta entrega el h3 de una identidad era el token `type.scale.h3` fijo
 * en la rama clara y un `clamp(1.125rem, min(4vw, 2.6dvh), h3.size)` propio en
 * la oscura (`ScDarkFeatureTitle`, hoy una lápida en `Features.tsx`): el mismo
 * nivel semántico, con la misma copia desde las Tasks 15-16, era fijo en un
 * tema y fluido POR ALTURA en el otro. Medido en Chrome sobre el build de
 * producción de `ef62b26` (DPR 1): 24 px en claro en todos los viewports,
 * frente a 18 px (390x390), 18,72 px (1280x720), 23,4 px (1440x900) y 24 px
 * (1440x1440) en oscuro. Conmutar de tema en un portátil encogía el titular un
 * 22 %.
 *
 * ## Por qué el candado mira DOS capas y no una
 *
 * `getComputedStyle` es la capa que produce el efecto, y con el bug inyectado
 * (devolver a la rama oscura su `styled(Typography)` con el `clamp()`) es la
 * primera que cae -- COMPROBADO, no supuesto: jsdom conserva el valor sin
 * resolverlo y el rojo literal es
 * `expected 'clamp(1.125rem,\n    min(4vw, 2.6dvh)…' to be '1.5rem'`.
 * La segunda capa -- que el CSS inyectado para ese elemento no declare NINGÚN
 * `font-size` distinto del token -- se verificó por separado, silenciando la
 * primera con el mismo bug puesto, y también cae:
 * `expected Set{ '1.5rem', …(1) } to deeply equal Set{ '1.5rem' }`. Se
 * conservan las dos porque miden cosas distintas: una, el valor que el
 * navegador acabaría usando; la otra, que no exista una segunda declaración
 * compitiendo -- que es la forma que tendría el defecto si un día jsdom sí
 * descartara el valor que no sabe parsear.
 */
describe("paridad de temas: el titular de tarjeta lee el MISMO token en las dos ramas", () => {
  beforeEach(() => {
    stubMatchMedia();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  /** El titular de la primera identidad, el mismo id en las dos ramas. */
  function titular(container: HTMLElement): HTMLElement {
    return container.querySelector("#feature-learning-title") as HTMLElement;
  }

  /** Los `font-size` declarados por las reglas inyectadas para `el`. */
  function fontSizesDeclarados(el: HTMLElement): string[] {
    return Array.from(
      cssRuleTextFor(el).matchAll(/font-size:\s*([^;]+);/g),
    ).map((m) => m[1].trim());
  }

  it("el token es UNO SOLO: la escala tipográfica no ramifica por tema", () => {
    // Sin esto, "cada rama lee su token" podría ser cierto y aun así divergir.
    expect(themes.dark.type.scale.h3.size).toBe(
      themes.light.type.scale.h3.size,
    );
  });

  it("la rama CLARA computa el token y no declara ningún font-size ajeno", () => {
    window.localStorage.setItem("vti-theme", "light");
    const { container } = renderWithProviders(<Features />);
    const titulo = titular(container);

    expect(titulo.tagName).toBe("H3");
    expect(getComputedStyle(titulo).fontSize).toBe(
      themes.light.type.scale.h3.size,
    );
    expect(new Set(fontSizesDeclarados(titulo))).toEqual(
      new Set([themes.light.type.scale.h3.size]),
    );
  });

  it("la rama OSCURA computa el MISMO token y tampoco declara ningún font-size ajeno", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelector("#feature-learning-title")).not.toBeNull();
    });
    const titulo = titular(container);

    expect(titulo.tagName).toBe("H3");
    expect(getComputedStyle(titulo).fontSize).toBe(
      themes.dark.type.scale.h3.size,
    );
    // Lo que el estilo computado no puede decir: que no haya un `clamp()`
    // reintroducido que jsdom descartó al no saber parsearlo.
    expect(new Set(fontSizesDeclarados(titulo))).toEqual(
      new Set([themes.dark.type.scale.h3.size]),
    );
    expect(cssRuleTextFor(titulo)).not.toMatch(/font-size:\s*clamp\(/);
  });
});
