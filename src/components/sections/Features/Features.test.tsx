import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { Features, accentColor, accentColorHover } from "./Features";
import { PRESS } from "@/motion/vocabulary";
import {
  FEATURE_KEYS,
  FEATURES_OVERLAY_RISE,
  FEATURES_DARK_HEIGHT,
  FEATURES_CONTENT_MAX_WIDTH,
  FEATURES_TAIL_HOLD,
  FEATURES_GAMING_ACCENT,
  FEATURES_LIGHT_REVEAL_DELAYS_MS,
  FEATURES_LIGHT_REVEAL_DURATION_MS,
} from "./features.layers";
import {
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_TAIL_SCREENS,
} from "@/components/sections/Journey/journey.layers";
import {
  FEATURES_ORBITAL_LAYERS,
  FEATURES_ORBITAL_VOID,
} from "@/components/scenes/featuresCelestialOrbital/featuresCelestialOrbital.layers";
import { themes } from "@/theme/themes";
import {
  parseOklch,
  contrastRatio,
  contrastRatioHex,
} from "@/theme/tokens/contrast";
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

  // Task 11 (dieta de ornamento A, 2026-08-09): la rama CLARA retira el
  // eyebrow (barra + kicker) -- la cabecera abre directamente con el h2. El
  // texto del kicker (`Home.features.kicker`) sigue existiendo en i18n
  // porque la rama OSCURA lo sigue consumiendo como SU h2 (ver el bloque
  // "Features en tema oscuro" más abajo); aquí solo se comprueba que en
  // claro NO aparece. Verificado con el bug inyectado (ver informe de la
  // tarea): reintroduciendo el `<ScEyebrow>` en la rama clara este assert
  // se pone en rojo.
  it("ya NO muestra el eyebrow/kicker en la rama clara: la cabecera abre con el h2", () => {
    renderWithProviders(<Features />);
    expect(
      screen.queryByText(esHome.Home.features.kicker),
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

  // Task 11 (2026-08-09): cinco elementos, no seis -- el eyebrow (y su
  // propio retardo, antes 0ms) se retiró; los cinco restantes conservan el
  // mismo timing verbatim que ya tenían (ver el docblock de
  // FEATURES_LIGHT_REVEAL_DELAYS_MS, features.layers.ts).
  it("D9: escalona el transition-delay de los cinco elementos (h2, intro, 3 tarjetas) segun los retardos verbatim del mockup", () => {
    const { container } = renderWithProviders(<Features />);
    expect(FEATURES_LIGHT_REVEAL_DELAYS_MS).toHaveLength(5);
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
 * estructura nueva de las tres tarjetas -- badge numérico + etiqueta, panel
 * de imagen con círculo decorativo, título/cuerpo/bullets/CTA (estos tres
 * últimos ya existían y se cubren en los tests generales de arriba).
 */
describe("D6/D7/D8: estructura nueva de las tres tarjetas de la rama clara", () => {
  it("cada tarjeta monta su badge (numero decorativo 01/02/03 + etiqueta de i18n) y su panel de imagen (figura + circulo decorativo aria-hidden)", () => {
    const { container } = renderWithProviders(<Features />);

    FEATURE_KEYS.forEach((key, index) => {
      const number = String(index + 1).padStart(2, "0");
      const badgeLabel = esHome.Home.features[key].badge;
      expect(screen.getByText(number)).toBeInTheDocument();
      expect(screen.getByText(badgeLabel)).toBeInTheDocument();
    });

    // Panel de imagen: una figura por tarjeta (ya cubierto en detalle por
    // "cada figura trae alt de i18n..." arriba) mas un circulo decorativo
    // aria-hidden por tarjeta (D8) -- ninguno de los dos existia en la
    // entrega anterior (patron SVG de fondo, retirado).
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(FEATURE_KEYS.length);
  });

  it("los numeros 01/02/03 del badge son aria-hidden (decorativos, D6/D10): el orden ya lo comunica el DOM", () => {
    renderWithProviders(<Features />);
    ["01", "02", "03"].forEach((number) => {
      expect(screen.getByText(number)).toHaveAttribute("aria-hidden", "true");
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
 * Contraste AA (spec §3, "el contrato de accesibilidad"): texto de la
 * tarjeta sobre `semantic.surface` (ya cubierto de forma genérica por
 * `theme/tokens/contrast.test.ts`, se repite aquí acotado a los roles
 * concretos que usa ESTE componente) y color del badge sobre su fondo
 * `color-mix` (sin cobertura previa -- jsdom no resuelve `color-mix()`, así
 * que la mezcla se calcula a mano, ver `mixOklab` más abajo, siguiendo el
 * patrón de `contrast.test.ts`/`legalPage.contrast.test.ts`: reutiliza
 * `parseOklch`/`contrastRatio` de `@/theme/tokens/contrast` para la
 * conversión OKLCH→sRGB→luminancia -- no se reimplementa esa parte, solo la
 * aritmética de mezcla que `contrast.ts` no expone).
 */
describe("contraste AA de las tarjetas de Features (rama clara)", () => {
  const AA_TEXTO_NORMAL = 4.5;

  /**
   * Mezcla dos colores oklch() en espacio OKLab, replicando
   * `color-mix(in oklab, fg P%, bg)`. En OKLab, L/a/b son coordenadas
   * cartesianas -- `a = C·cos(H)`, `b = C·sin(H)` (H en radianes) --, así
   * que la interpolación lineal en OKLab es una media ponderada directa de
   * (L, a, b): `mix = t·fg + (1-t)·bg`, con `t = P/100`. El resultado se
   * reconvierte a `oklch(L C H)` (`C = √(a²+b²)`, `H = atan2(b,a)`) para
   * poder pasarlo a `contrastRatio`, que solo acepta strings `oklch()`.
   */
  function mixOklab(
    fgOklch: string,
    fgPercent: number,
    bgOklch: string,
  ): string {
    const fg = parseOklch(fgOklch);
    const bg = parseOklch(bgOklch);
    const toAB = (c: { c: number; h: number }): [number, number] => {
      const rad = (c.h * Math.PI) / 180;
      return [c.c * Math.cos(rad), c.c * Math.sin(rad)];
    };
    const [aFg, bFg] = toAB(fg);
    const [aBg, bBg] = toAB(bg);
    const t = fgPercent / 100;
    const l = t * fg.l + (1 - t) * bg.l;
    const a = t * aFg + (1 - t) * aBg;
    const b = t * bFg + (1 - t) * bBg;
    const c = Math.sqrt(a * a + b * b);
    let h = (Math.atan2(b, a) * 180) / Math.PI;
    if (h < 0) h += 360;
    return `oklch(${l} ${c} ${h})`;
  }

  it("titulo (semantic.text), cuerpo/bullets (semantic.textMuted) y etiqueta del badge (semantic.textSubtle) cumplen AA sobre semantic.surface", () => {
    const { semantic } = themes.light;
    expect(
      contrastRatio(semantic.text, semantic.surface),
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    expect(
      contrastRatio(semantic.textMuted, semantic.surface),
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    expect(
      contrastRatio(semantic.textSubtle, semantic.surface),
    ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
  });

  /*
   * El número del badge usa `accentColorHover`, no `accentColor` -- ver el
   * docblock de `accentColorHover` en `Features.tsx`. `ScBadge` SOLO se
   * renderiza en la rama clara, así que ambas funciones resuelven aquí su
   * rama clara.
   *
   * Medido tras la Task 26 (2026-08-10, "CTA de Features con AA en las seis
   * combinaciones" -- resolución por rama de `accentColor`/`accentColorHover`,
   * ver `Features.tsx`): `accentColor` sobre el `color-mix` de este mismo
   * badge da 4.31:1/4.98:1/4.52:1 según la tarjeta -- "learning" sigue por
   * debajo de AA y "gaming" raspa el umbral --, mientras que
   * `accentColorHover` da 4.96:1/5.58:1/5.60:1, que sí cumple con margen en
   * las tres. MEJORARON con la Task 26: antes de esa tarea (`accentColor`
   * compartía el paso 600 entre ramas, `accentColorHover` el 700)
   * `accentColorHover` daba 4.52:1/5.21:1/4.66:1 -- el margen de "learning"
   * (antes 4.52:1, ahora 4.96:1) era el más ajustado de los tres y sigue
   * siéndolo, pero con más aire. `accentColor` solo (sin la Task 26) daba
   * 2.69:1/3.08:1/3.46:1, muy por debajo de AA en las tres -- la mejora del
   * paso de reposo en claro (un paso más oscuro, ver `accentColor`) acerca
   * también el fondo del badge a AA por sí solo, aunque sigue siendo
   * `accentColorHover` quien de verdad lo garantiza.
   */
  it.each(FEATURE_KEYS)(
    "tarjeta %s: el numero del badge (accentColorHover) sobre su fondo color-mix(accentColor 12%%, surface) cumple AA",
    (key) => {
      const light = themes.light;
      const text = accentColorHover(light, key);
      const bg = mixOklab(accentColor(light, key), 12, light.semantic.surface);
      const ratio = contrastRatio(text, bg);
      expect(
        ratio,
        `contraste ${ratio.toFixed(2)}:1, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );
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
 * anchos -- el `@media` de `lg` sobrevive (mecanismo `$compactFrom`
 * pendiente, ver `ScBullets` en `Features.tsx`), pero ya no reparte en dos
 * columnas: solo ensancha el `gap`. Por texto del CSS inyectado y no con
 * `getComputedStyle`: jsdom no evalua NINGUN @media al calcular estilos
 * (lección repo 2026-07-27), asi que el estilo computado devuelve `1fr` tanto
 * con la regla como sin ella. Se acota con `cssRuleTextFor` a las clases del
 * PROPIO contenedor de bullets: `injectedCss()` arrastraria el resto del
 * stylesheet y cualquier otro `repeat(1, minmax(0, 1fr))` del componente daria
 * un verde falso.
 *
 * El breakpoint se lee del tema (`themes.light.breakPoint.lg`), no se escribe
 * "992px" a mano: un literal deja de proteger en silencio el dia que el token
 * cambie (lección repo 2026-08-01).
 *
 * Validado con el bug inyectado: cambiando `repeat(1, minmax(0, 1fr))` por
 * `repeat(2, minmax(0, 1fr))` dentro del `@media` de `ScBullets` en
 * Features.tsx, este test se pone rojo (la linea del breakpoint deja de
 * matchear `repeat(1, ...)`); restaurado, verde.
 */
describe("bullets a una columna en todos los anchos (el @media de lg solo ajusta el gap)", () => {
  function bulletsContainer(): HTMLElement {
    const cta = document.querySelector('a[href="#contact"]');
    return cta?.previousElementSibling as HTMLElement;
  }

  it("declara UNA columna por defecto y sigue en una columna (solo cambia el gap) dentro del @media de lg", () => {
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
    // declaracion de una columna: separarlo en dos aserciones dejaria pasar
    // un CSS con dos columnas fuera del @media.
    const lgLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes(themes.light.breakPoint.lg) &&
          line.includes("grid-template-columns"),
      );
    expect(lgLine).toBeDefined();
    expect(lgLine).toMatch(
      /grid-template-columns:\s*repeat\(1,\s*minmax\(0,\s*1fr\)\)/,
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

  it("sigue mostrando el kicker (ahora el propio h2), los 3 titulos, los 12 bullets y los 3 CTA con el mismo i18n que en claro", async () => {
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
   * Task 11 (dieta de ornamento A, 2026-08-09): caso especial de Features
   * oscuro -- su kicker ES el h2 real (`forwardedAs="h2"`, `aria-labelledby`
   * de la sección apunta a su id). No se retira, pero sube de la variante
   * `overline` (11px) a `h5` (18px) para dejar de ser más pequeño que su
   * propio cuerpo (`ScDarkBody`, variante `bodySm`, 14px) -- cierra la deuda
   * ALTA de DESIGN.md §9 ("el único encabezado es un overline de 11px").
   * Verificado con el bug inyectado (ver informe de la tarea): devolviendo
   * `variant="overline"` en `Features.tsx` este test se pone en rojo (el
   * font-size vuelve a `type.scale.overline.size`).
   */
  it("D9/DESIGN.md §9: el h2 de Features oscuro es un heading de verdad y su font-size es el de h5 (18px), no el de overline (11px)", async () => {
    renderWithProviders(<Features />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.features.kicker)).toBeInTheDocument();
    });

    const heading = screen.getByRole("heading", {
      level: 2,
      name: esHome.Home.features.kicker,
    });
    expect(heading).toHaveAttribute("id", "features-title");
    expect(getComputedStyle(heading).fontSize).toBe(
      themes.dark.type.scale.h5.size,
    );
    expect(getComputedStyle(heading).fontSize).not.toBe(
      themes.dark.type.scale.overline.size,
    );

    const region = screen.getByRole("region", {
      name: esHome.Home.features.kicker,
    });
    expect(region).toHaveAttribute("id", "features");
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
 * D9 (spec `2026-08-06-story-features-tema-claro-design.md`) REVISA esa
 * unificación solo en la rama CLARA: `ScItem` se sustituyó por `ScReveal`
 * (cabecera + tarjetas bajo un único reveal), con la duración/easing
 * VERBATIM del mockup nuevo -- `FEATURES_LIGHT_REVEAL_DURATION_MS` (640ms) +
 * `motion.easing.standard` --, que ya NO coincide con `slower`/`decelerate`.
 * La rama OSCURA (`ScDarkContent`) queda INTACTA (D1 de la spec nueva: no se
 * toca) y su test sigue verificando la pareja `slower`/`decelerate` sin
 * cambios.
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
describe("D9: duración/easing de entrada de la cabecera y las tarjetas de la rama clara (640ms + easing.standard, ya no slower/decelerate)", () => {
  it("ScReveal (rama clara) usa FEATURES_LIGHT_REVEAL_DURATION_MS (640ms) + motion.easing.standard, verbatim del mockup", () => {
    const { container } = renderWithProviders(<Features />);
    // Ancla al PRIMER retardo real del array (80ms, el h2 -- Task 11,
    // 2026-08-09, retiró el eyebrow que antes ocupaba el retardo 0ms), no a
    // un literal "0" a mano que dejaría de existir en el DOM.
    const item = container.querySelector(
      `[data-reveal-delay="${FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}"]`,
    ) as HTMLElement;
    const css = cssRuleTextFor(item);

    expect(css).toContain(FEATURES_LIGHT_REVEAL_DURATION_MS);
    expect(css).toContain(themes.light.motion.easing.standard);
    expect(css).not.toContain(themes.light.motion.duration.slower);
    expect(css).not.toContain(themes.light.motion.easing.decelerate);
  });

  it("ScDarkContent (rama oscura) usa motion.duration.slower + motion.easing.decelerate", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Features />);
      await waitFor(() => {
        expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
      });
      const content = container.querySelector("[data-revealed]") as HTMLElement;
      const css = cssRuleTextFor(content);

      expect(css).toContain(themes.dark.motion.duration.slower);
      expect(css).toContain(themes.dark.motion.easing.decelerate);
      expect(css).not.toContain(themes.dark.motion.duration.slow);
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * D7 (encargo 2026-08-04): `ScCta` -- el CTA de texto de cada identidad --
 * ganó `:focus-visible` propio, resuelto contra `semantic.focus`. Hasta esta
 * entrega solo tenía `:hover`. Validado con el bug inyectado a propósito
 * (ver el informe de la tarea): comentando el bloque `&:focus-visible` de
 * `ScCta` en `Features.tsx` este test se pone en rojo (no hay ningún bloque
 * que mencione `focus-visible`); restaurado, vuelve a verde.
 */
describe("D7: :focus-visible propio del CTA de sección", () => {
  it("ScCta declara :focus-visible con box-shadow resuelto contra semantic.focus", () => {
    const { container } = renderWithProviders(<Features />);
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;
    const css = cssRuleTextFor(cta);

    expect(css).toContain(":focus-visible");
    const focusBlock = css.slice(css.indexOf(":focus-visible"));
    expect(focusBlock).toContain("box-shadow");
    expect(focusBlock).toContain(themes.light.semantic.focus);
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
describe("Task 12: contraste AA del acento solido de Gaming (rama oscura)", () => {
  it("FEATURES_GAMING_ACCENT sobre FEATURES_ORBITAL_VOID >= 4.5:1 (medido: 4.71:1, margen mas ajustado que el resto de acentos de esta tarea)", () => {
    const ratio = contrastRatioHex(
      FEATURES_GAMING_ACCENT,
      FEATURES_ORBITAL_VOID,
    );
    expect(ratio, `contraste ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

/*
 * D4 (encargo 2026-08-04): palancas de compactación vertical del contenido
 * oscuro -- `padding-block` fluido de `ScDarkFrame`, `margin-block-start`
 * fluido de `ScDarkFeatures`, `padding-block` fluido de `ScDarkFeatureBlock`
 * y `font-size` fluido de `ScDarkFeatureTitle` -- todas con `clamp()`, todas
 * con el mismo suelo/techo documentado en `Features.tsx`. Por texto del CSS
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

  it("ScDarkFeatureTitle usa font-size: clamp(...) acotado por abajo a 1.125rem", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const title = container.querySelector(
      "#feature-learning-title",
    ) as HTMLElement;
    const css = cssRuleTextFor(title);

    expect(css).toMatch(/font-size:\s*clamp\(\s*1\.125rem/);
  });
});

/*
 * D4/ajuste visual 2026-08-08: en la rama OSCURA el `@media` del bloque de
 * bullets sigue en el breakpoint `sm` (600px), no `lg` (992px) como en la
 * rama clara -- ver el docblock de `ScBullets` en `Features.tsx` para el
 * porqué completo (el mecanismo `$compactFrom` sigue vivo, decisión
 * pendiente). Lo que SÍ cambia es la columna: el ajuste visual del
 * 2026-08-08 vuelve a UNA columna en ese breakpoint, igual que en la rama
 * clara -- el `@media` solo ensancha el `gap`. Validado con el bug inyectado
 * a propósito (ver informe de la tarea): cambiando `repeat(1, minmax(0, 1fr))`
 * por `repeat(2, minmax(0, 1fr))` dentro del bloque `sm` de `ScBullets` en
 * Features.tsx, este test se pone en rojo (la linea del breakpoint `sm` deja
 * de matchear `repeat(1, ...)`); restaurado, vuelve a verde.
 */
describe("D4: en tema oscuro el bloque de bullets sigue en el breakpoint sm (no lg), ahora en una columna", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("declara el bloque de una columna (con el gap ensanchado) dentro del breakpoint sm", async () => {
    const { container } = renderWithProviders(<Features />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const cta = container.querySelector('a[href="#contact"]') as HTMLElement;
    const bullets = cta.previousElementSibling as HTMLElement;
    const css = cssRuleTextFor(bullets);

    const smLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes(themes.dark.breakPoint.sm) &&
          line.includes("grid-template-columns"),
      );
    expect(smLine).toBeDefined();
    expect(smLine).toMatch(
      /grid-template-columns:\s*repeat\(1,\s*minmax\(0,\s*1fr\)\)/,
    );

    expect(css).not.toContain(themes.dark.breakPoint.lg);
  });
});
