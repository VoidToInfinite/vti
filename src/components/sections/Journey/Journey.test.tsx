import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import { Journey } from "./Journey";
import { motion } from "@/theme/tokens/motion";
import {
  JOURNEY_STEPS,
  JOURNEY_FIGURE_SCROLL_SHIFT,
  JOURNEY_PATH_SCROLL_SHIFT,
  JOURNEY_PATH_VIEWBOX,
  JOURNEY_CONTENT_MAX_WIDTH,
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_TAIL_SCREENS,
  JOURNEY_OVERLAY_RISE,
  JOURNEY_SLIDES,
} from "./journey.layers";
import {
  JOURNEY_PORTAL_LAYERS,
  JOURNEY_PORTAL_VOID,
} from "@/components/scenes/journeyCosmicPortal/journeyCosmicPortal.layers";
import {
  STORY_DARK_HEIGHT,
  STORY_DECK_TAIL_SCREENS,
} from "@/components/sections/Story/story.layers";
import enHome from "@/i18n/locales/en/home.json";
import esHome from "@/i18n/locales/es/home.json";
import esCommon from "@/i18n/locales/es/common.json";
import { themes } from "@/theme/themes";
import { contrastRatioHex } from "@/theme/tokens/contrast";
import { DECK, REVEAL } from "@/motion/vocabulary";

/*
 * Journey monta con frecuencia VARIOS IntersectionObserver a la vez: en
 * claro, `useReveal` (sobre `ScStepsRow`) y `useSectionProgress` (sobre
 * `ScJourney`, D1, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`); en
 * oscuro, `useSlideDeck` (sobre la pista, `JourneyDeckDark`) y
 * `useSceneParallax` (sobre la escena, dentro de `JourneyCosmicPortal`).
 * `ioTargets` registra el elemento observado por CADA instancia, y
 * `triggerFor` dispara la que observa el elemento pedido -- imprescindible
 * en cuanto conviven dos observers en el mismo render: un `trigger` global
 * sin ambito dispararia siempre el ULTIMO construido, no necesariamente el
 * que el test quiere mover.
 */
let ioTargets: { target: Element; emit: (isIntersecting: boolean) => void }[];

function triggerFor(target: Element, isIntersecting: boolean): void {
  const instance = ioTargets.find((entry) => entry.target === target);
  if (!instance) {
    throw new Error("Ningun IntersectionObserver observa ese elemento");
  }
  instance.emit(isIntersecting);
}

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
 * CONCRETO (mismo helper que `Story.test.tsx`): filtra por las clases del
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
 * Regla CSS real (CSSOM, `CSSStyleRule`, no texto libre) que aplica a un
 * elemento y cuyo `selectorText` cumple `matches` -- mismo helper que
 * `Story.test.tsx` (`cssRuleFor`): a diferencia de `cssRuleTextFor`
 * (concatena TODAS las reglas que mencionan la clase), esto localiza UNA
 * regla concreta y expone `.style.<prop>`, que SI resuelve el valor
 * declarado de una propiedad sin ambiguedad de que declaracion pertenece a
 * que selector. Usado por el candado de A1 (fix wave A, WCAG 2.4.7).
 */
function cssRuleFor(
  el: HTMLElement,
  matches: (selectorText: string) => boolean,
): CSSStyleRule {
  const classes = Array.from(el.classList);
  const rule = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    })
    .find((r): r is CSSStyleRule => {
      if (!("selectorText" in r)) return false;
      const selector = (r as CSSStyleRule).selectorText ?? "";
      return (
        classes.some((cls) => selector.includes(`.${cls}`)) && matches(selector)
      );
    });
  if (!rule) {
    throw new Error("Ninguna regla coincide con el criterio pedido");
  }
  return rule as CSSStyleRule;
}

beforeEach(() => {
  ioTargets = [];
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
  // useSectionProgress (D1, spec
  // 2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md)
  // llama a window.matchMedia sin condicion en su efecto de montaje -- sin
  // este stub, CUALQUIER render de Journey (tambien en claro) lanzaria
  // "matchMedia is not a function" (jsdom no lo implementa, vease
  // Aura.test.tsx). `stubMatchMedia()` esta declarada mas abajo en este
  // fichero (function hoisted): matches:false en los dos temas, "el usuario
  // no pidio reduced motion".
  stubMatchMedia();
});

describe("Journey", () => {
  it("es una region con su nombre accesible real (aria-labelledby -> h2)", () => {
    renderWithProviders(<Journey />);
    const region = screen.getByRole("region", {
      name: esHome.Home.journey.title,
    });
    expect(region).toHaveAccessibleName(esHome.Home.journey.title);
    expect(region).toHaveAttribute("id", "journey");
  });

  it("muestra los 6 pasos con su label de i18n (0N · Label)", () => {
    renderWithProviders(<Journey />);
    JOURNEY_STEPS.forEach((step, index) => {
      const label = esHome.Home.journey.steps[step.id].label;
      const number = String(index + 1).padStart(2, "0");
      expect(screen.getByText(`${number} · ${label}`)).toBeInTheDocument();
      expect(
        screen.getByText(esHome.Home.journey.steps[step.id].body),
      ).toBeInTheDocument();
    });
  });

  it("la figura trae alt de i18n y srcset con las dos pistas (640/1024)", () => {
    const { container } = renderWithProviders(<Journey />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", esHome.Home.journey.figureAlt);
    const srcset = img?.getAttribute("srcset") ?? "";
    expect(srcset).toContain("640w");
    expect(srcset).toContain("1024w");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("muestra la cita final con comillas tipograficas alrededor del texto de i18n", () => {
    renderWithProviders(<Journey />);
    expect(
      screen.getByText(`“${esHome.Home.journey.quote}”`),
    ).toBeInTheDocument();
  });

  it("el contenedor de pasos empieza sin revelar y pasa a revelado al intersecar", () => {
    const { container } = renderWithProviders(<Journey />);
    const items = container.querySelectorAll("[data-revealed]");
    expect(items.length).toBe(JOURNEY_STEPS.length);
    items.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "false"),
    );

    // triggerFor(stepsRow, ...), no el `trigger` global sin ambito: desde D1
    // (useSectionProgress sobre ScJourney) hay un SEGUNDO
    // IntersectionObserver vivo a la vez que el de useReveal -- `trigger` a
    // secas dispararia el ULTIMO construido, no necesariamente el de
    // useReveal (mismo mecanismo que ya obliga a `triggerFor` para
    // useSlideDeck en la rama oscura, mas abajo en este fichero). ScPath,
    // localizable por su viewBox, es hijo DIRECTO de ScStepsRow (el
    // elemento que useReveal observa de verdad).
    const path = container.querySelector(
      `svg[viewBox="${JOURNEY_PATH_VIEWBOX}"]`,
    ) as SVGSVGElement;
    const stepsRow = path.parentElement as HTMLElement;
    act(() => triggerFor(stepsRow, true));

    const revealedItems = container.querySelectorAll("[data-revealed]");
    revealedItems.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "true"),
    );
  });

  it("escalona el transition-delay de cada paso segun su indice (~90ms)", () => {
    const { container } = renderWithProviders(<Journey />);
    const items = Array.from(container.querySelectorAll("[data-revealed]"));
    expect(items).toHaveLength(JOURNEY_STEPS.length);
    items.forEach((item, index) => {
      const delay = getComputedStyle(item).transitionDelay;
      // jsdom SI resuelve longhands (transition-delay) de una propiedad
      // shorthand (transition) declarada en styled-components -- NUNCA
      // aseverar animationName de una shorthand (lección repo, task/lessons.md
      // 2026-07-27: jsdom no evalua @media, pero longhands de shorthand no
      // media si se resuelven). Medido: jsdom devuelve el literal declarado
      // ("Nms"), no lo normaliza a segundos.
      expect(delay).toBe(`${index * 90}ms`);
    });
  });

  it("paridad es/en: las claves de journey existen en los dos locales", () => {
    expect(Object.keys(enHome.Home.journey.steps)).toEqual(
      Object.keys(esHome.Home.journey.steps),
    );
    JOURNEY_STEPS.forEach((step) => {
      expect(enHome.Home.journey.steps).toHaveProperty(step.id);
    });
  });

  describe("guard de prefers-reduced-motion (CSS inyectado, no getComputedStyle)", () => {
    // Lección 2026-07-27 (task/lessons.md): jsdom no evalua NINGUN @media al
    // calcular estilos, asi que un guard de reduced-motion no se puede atar
    // con getComputedStyle -- solo inspeccionando el TEXTO del bloque
    // inyectado por styled-components (helper `injectedCss`, ambito de
    // modulo). Se valida el test con el bug inyectado a proposito (ver el
    // test siguiente: sin el selector, este test se pone rojo).
    it("declara un bloque @media (prefers-reduced-motion: reduce) que fuerza el estado final del paso", () => {
      renderWithProviders(<Journey />);
      const css = injectedCss();
      const reduceBlock = css
        .split("@media (prefers-reduced-motion: reduce)")
        .slice(1)
        .join("\n");
      expect(reduceBlock).toMatch(/transition:\s*none/);
      expect(reduceBlock).toMatch(/opacity:\s*1/);
      expect(reduceBlock).toMatch(/transform:\s*none/);
    });
  });
});

/*
 * D1 (movimiento ligado al progreso de scroll) y D7 (lenguaje de entrada
 * unificado), spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`.
 * Mismas advertencias de jsdom que el resto de este archivo: `calc(var())`
 * en `transform` NO se resuelve a un valor numerico por `getComputedStyle`
 * (comprobado con una sonda desechable antes de escribir este bloque --
 * jsdom devuelve el texto de la declaracion tal cual, sin evaluar `calc`/
 * `var`), asi que el desplazamiento de scroll se ata por TEXTO del CSS
 * inyectado, mismo helper (`cssRuleTextFor`) que el resto de la suite. Lo
 * que SI resuelve `getComputedStyle` son los longhands de la shorthand
 * `transition` (duracion/easing), que es lo que ata el test de D7.
 */
describe("Journey: movimiento ligado a scroll y lenguaje de entrada unificado (D1/D7)", () => {
  it("D7/D3: ScStepReveal unifica su entrada a REVEAL.durationMs + REVEAL.easing en las dos propiedades transicionadas (conserva el escalonado por indice y el translateY(12px) propio)", () => {
    const { container } = renderWithProviders(<Journey />);
    const items = Array.from(container.querySelectorAll("[data-revealed]"));
    expect(items).toHaveLength(JOURNEY_STEPS.length);

    items.forEach((item, index) => {
      const style = getComputedStyle(item);
      // jsdom NO expande la shorthand `transition` en sus longhands
      // individuales (`transitionDuration`/`transitionTimingFunction` dan
      // "" aunque la shorthand SI resuelva -- comprobado con una sonda
      // desechable antes de escribir este test): se lee la propia shorthand
      // como texto completo. `transitionDelay`, en cambio, SI resuelve
      // porque se declara como longhand SEPARADO (ver ScStepReveal,
      // Journey.tsx) -- por eso el test "escalona el transition-delay..."
      // de mas arriba ya funcionaba antes de esta entrega.
      //
      // Fix wave D (hallazgo D3, revisión final de rama, 2026-08-12):
      // ScStepReveal migra de `motion.duration.slower`/`motion.easing.
      // decelerate` sueltos a `REVEAL.durationMs`/`REVEAL.easing` (mismo
      // motivo que Contact.tsx -- ver el describe "D7/D3..." en
      // Contact.test.tsx). Este test dejó de comprobar el literal de tema
      // que el componente YA NO emite y pasa a comprobar el token; el
      // `translateY(12px)` de ScStepReveal (fuera del alcance de D3, no
      // toca `REVEAL.shift`) no aparece en `transition`, así que este
      // candado no lo necesita.
      expect(style.transition).toBe(
        `opacity ${REVEAL.durationMs}ms ${REVEAL.easing},transform ${REVEAL.durationMs}ms ${REVEAL.easing}`,
      );
      expect(style.transition).not.toContain(motion.easing.decelerate);
      // El escalonado por indice (D7 no lo toca) sigue vivo: mismo assert
      // que "escalona el transition-delay..." mas arriba en este archivo.
      expect(style.transitionDelay).toBe(`${index * 90}ms`);
    });
  });

  it("D1: la figura y el camino punteado ligan su transform a --journey-progress, en sentidos opuestos, con guard de reduce propio", () => {
    // Verificado con el bug inyectado a proposito: quitando el bloque
    // `@media (prefers-reduced-motion: reduce) { transform: none; }` de
    // `ScFigure` (Journey.tsx) este assert se pone en rojo; se restauro
    // para dejar la suite en verde (ver informe de la entrega).
    const { container } = renderWithProviders(<Journey />);
    const figure = container.querySelector(
      `img[alt="${esHome.Home.journey.figureAlt}"]`,
    ) as HTMLElement;
    const path = container.querySelector(
      `svg[viewBox="${JOURNEY_PATH_VIEWBOX}"]`,
    ) as HTMLElement;

    const figureCss = cssRuleTextFor(figure);
    expect(figureCss).toContain(
      `calc(${JOURNEY_FIGURE_SCROLL_SHIFT} * var(--journey-progress, 0))`,
    );
    expect(figureCss).toContain("prefers-reduced-motion: reduce");
    expect(
      figureCss.slice(figureCss.indexOf("prefers-reduced-motion: reduce")),
    ).toContain("transform: none");

    const pathCss = cssRuleTextFor(path);
    expect(pathCss).toContain(
      `calc(${JOURNEY_PATH_SCROLL_SHIFT} * var(--journey-progress, 0))`,
    );
    expect(pathCss).toContain("prefers-reduced-motion: reduce");
    expect(
      pathCss.slice(pathCss.indexOf("prefers-reduced-motion: reduce")),
    ).toContain("transform: none");

    // "sentidos distintos entre planos" (D1, encargo): un signo negativo y
    // el otro positivo, no la misma amplitud reutilizada por accidente.
    expect(Number.parseFloat(JOURNEY_FIGURE_SCROLL_SHIFT)).toBeLessThan(0);
    expect(Number.parseFloat(JOURNEY_PATH_SCROLL_SHIFT)).toBeGreaterThan(0);
  });

  it("D1: useSectionProgress esta conectado a ScJourney -- al intersectar publica --journey-progress y data-inview", () => {
    // Verificado con el bug inyectado a proposito: quitando la llamada a
    // `useSectionProgress(sectionRef, ...)` de `JourneyLight` (Journey.tsx)
    // este assert se pone en rojo (la variable nunca se escribe); se
    // restauro para dejar la suite en verde (ver informe de la entrega).
    const { container } = renderWithProviders(<Journey />);
    const section = container.querySelector("#journey") as HTMLElement;

    expect(section.style.getPropertyValue("--journey-progress")).toBe("");
    act(() => triggerFor(section, true));

    expect(section.dataset.inview).toBe("true");
    expect(section.style.getPropertyValue("--journey-progress")).not.toBe("");
  });
});

// Regresion 2026-07-28: GlobalStyles declara svg width 100% y el icono de
// cada paso confiaba en su atributo width="22" (perdia la cascada y se
// estiraba al ancho del disco, medido 54px en navegador). La regla correcta
// vive en ScDisc como selector hijo (& > svg); se asevera el estilo computado
// del icono, que es donde el bug se manifiesta.
describe("tamano del icono de paso (reset global de svg)", () => {
  it("computa 22px por CSS via la regla del disco", () => {
    renderWithProviders(<Journey />);
    const icon = [...document.querySelectorAll("svg")].find(
      (s) => s.getAttribute("viewBox") === "0 0 24 24",
    ) as SVGSVGElement;
    expect(getComputedStyle(icon).width).toBe("22px");
    expect(getComputedStyle(icon).height).toBe("22px");
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

describe("Journey en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  // El numero de capas se lee de la tabla, no se escribe a mano: este test se
  // quedo obsoleto en silencio cuando la escena paso de "Astral Pathway" a
  // "Cosmic Portal" (mismo recuento, 5) y solo salto al llegar la sexta capa.
  // Lo que aqui importa es que en oscuro el DOM son EXACTAMENTE las imagenes
  // de la escena y ninguna mas -- ni la figura ni el camino de la rama clara.
  it("monta la escena Cosmic Portal completa en vez de la tarjeta/camino/figura de claro", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        JOURNEY_PORTAL_LAYERS.length,
      );
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  // Adaptado CUATRO veces, y la historia importa porque el numero de paso ha
  // ido y vuelto: primero (spec
  // 2026-08-02-journey-deck-8-diapositivas-design.md, D11) para separar
  // numero/etiqueta/cuerpo en TRES nodos de texto; luego (encargo explicito
  // del usuario, 2026-08-02, "quita las numeraciones de la seccion Journey"
  // -- acotado a esta rama tras preguntar el alcance) para quitar el numero
  // por completo; despues (spec 2026-08-02-journey-deck-tipografia-design.md,
  // T5) para renombrar el rol de la pieza restante -- la diapositiva compone
  // etiqueta+SUBTITULO, ya no "cuerpo", con la etiqueta a escala de cartel;
  // y ahora (Task 16, 2026-08-11) para dejar constancia de que el ordinal
  // VISIBLE sigue sin existir aqui: aquella tarea lo monto durante unas horas
  // y el dueno lo retiro al confirmarse que la asimetria clara/oscura era su
  // decision (D16 de la spec de las 8 diapositivas). Lo que si entro es el
  // anuncio de posicion para lector de pantalla, con su propio describe mas
  // abajo. La clave de i18n de la tercera pieza sigue siendo
  // `steps.<id>.body`. El reparto preciso por diapositiva se comprueba mas
  // abajo (test 4, D11).
  it("sigue mostrando el titulo, los 6 pasos (etiqueta+subtitulo, sin ordinal visible) y la cita con el mismo i18n que en claro (sin kicker, Task 11)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    expect(screen.getByText(esHome.Home.journey.title)).toBeInTheDocument();
    JOURNEY_STEPS.forEach((step, index) => {
      const label = esHome.Home.journey.steps[step.id].label;
      const subtitle = esHome.Home.journey.steps[step.id].body;
      // El ordinal VISIBLE no existe en esta rama (D16, reconfirmado por el
      // dueno el 2026-08-11): ni "01" suelto ni "01 · Descubre". Lo que SI
      // existe es el anuncio para lector de pantalla, que se verifica en su
      // propio describe mas abajo con las palabras completas.
      const number = String(index + 1).padStart(2, "0");
      expect(screen.queryByText(number)).not.toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(subtitle)).toBeInTheDocument();
    });
    expect(
      screen.getByText(`“${esHome.Home.journey.quote}”`),
    ).toBeInTheDocument();
    // Sonda NEGATIVA (Task 11, dieta de ornamento A, 2026-08-09): el kicker
    // "Inspiración" se retiró de las dos ramas -- la clave i18n
    // `Home.journey.kicker` se borró junto con su render, así que el literal
    // se hardcodea aquí a propósito, solo como regresión. Verificado con el
    // bug inyectado (ver informe de la tarea): reintroduciendo la línea
    // `<ScKicker>{t("Home.journey.kicker")}</ScKicker>` en la diapositiva 0
    // este assert se pone en rojo.
    expect(screen.queryByText("Inspiración")).not.toBeInTheDocument();
  });

  it("no hay ninguna imagen con alt de i18n ni el camino SVG punteado de claro", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    expect(
      container.querySelector(`img[alt="${esHome.Home.journey.figureAlt}"]`),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(`svg[viewBox="${JOURNEY_PATH_VIEWBOX}"]`),
    ).not.toBeInTheDocument();
  });

  // Tests 1-4 de §7, spec `2026-08-02-journey-overlay-transition-design.md`
  // (D2/D6/D8, y la regresión de raíz que motiva toda la entrega). Por texto
  // del CSS inyectado / DOM, nunca `getComputedStyle`: jsdom no evalua
  // `@media` (lección repo 2026-07-27) y un literal escrito a mano deja de
  // proteger en silencio si la constante que describe cambia (lección repo
  // 2026-08-01). Siguen intactos tras convertir Journey en presentacion: el
  // solape sobre Story vive en `ScJourney` (Journey.tsx), que esta entrega no
  // toca en esa parte.

  it("declara el solape con margin-block-start negativo leyendo JOURNEY_OVERLAY_RISE, no un literal a mano (test 1)", () => {
    renderWithProviders(<Journey />);
    const css = injectedCss();
    expect(css).toContain(
      `margin-block-start: calc(-1 * ${JOURNEY_OVERLAY_RISE})`,
    );
  });

  it("bajo prefers-reduced-motion: reduce anula el solape devolviendo margin-block-start a 0 (test 2, D6)", () => {
    renderWithProviders(<Journey />);
    const css = injectedCss();
    // Cada bloque `@media (...) { ... }` se serializa (comprobado con un
    // sondeo desechable) como UNA entrada autocontenida sin salto de linea
    // interno, así que separar por línea y exigir que la MISMA línea sea a
    // la vez un bloque reduce y mencione `margin-block-start` aísla el
    // bloque de `ScJourney` sin arrastrar el resto del stylesheet acumulado
    // -- a diferencia de un `split/slice/join` sobre el string completo, que
    // se cuela hasta declaraciones de otros componentes (p. ej.
    // `margin-block-start: 0.75rem` de `ScDarkBody`) y deja de ser falsable.
    const journeyReduceLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("margin-block-start"),
      );
    expect(journeyReduceLine).toBeDefined();
    expect(journeyReduceLine).toMatch(/margin-block-start:\s*0[;}]/);
  });

  it("topa el contenido con max-width leyendo JOURNEY_CONTENT_MAX_WIDTH, no un literal a mano (test 3, D8)", () => {
    renderWithProviders(<Journey />);
    const css = injectedCss();
    expect(css).toContain(`max-width: ${JOURNEY_CONTENT_MAX_WIDTH}`);
  });

  it("no reintroduce el hack de scroll de 3394bcb: ni el CSS inyectado ni el DOM contienen --journey-scroll-offset/--journey-scroll-opacity (test 4)", () => {
    const { container } = renderWithProviders(<Journey />);
    const css = injectedCss();
    expect(css).not.toContain("--journey-scroll-offset");
    expect(css).not.toContain("--journey-scroll-opacity");
    expect(container.innerHTML).not.toContain("--journey-scroll-offset");
    expect(container.innerHTML).not.toContain("--journey-scroll-opacity");
  });
});

/*
 * Tarea de esta entrega (spec 2026-08-02-journey-deck-8-diapositivas-design.md
 * §8): en tema oscuro, Journey deja de ser una pantalla y pasa a ser una
 * presentacion de JOURNEY_SLIDES diapositivas ancladas por scroll. Mismas
 * advertencias de jsdom que Story.test.tsx: solo se puede verificar
 * atributos (data-slide-index/data-slide/data-state), contenido i18n real,
 * getComputedStyle contra una CONSTANTE importada (nunca un literal), y el
 * TEXTO del CSS inyectado para los bloques @media que jsdom nunca evalua. El
 * pin, la geometria real y el recorrido de scroll se verifican en navegador
 * (Definicion de "hecho" de la spec), no aqui.
 */
describe("Journey: presentacion de JOURNEY_SLIDES diapositivas (tema oscuro)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("hay exactamente JOURNEY_SLIDES elementos [data-slide-index], con indices 0..JOURNEY_SLIDES-1 sin huecos (test 2)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const indices = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ).map((el) => Number(el.getAttribute("data-slide-index")));
    expect(indices).toEqual(
      Array.from({ length: JOURNEY_SLIDES }, (_, i) => i),
    );
  });

  it("estado inicial: la diapositiva 0 es current y el resto son next (test 3)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slides = Array.from(container.querySelectorAll("[data-slide-index]"));
    expect(slides[0]).toHaveAttribute("data-state", "current");
    slides
      .slice(1)
      .forEach((slide) => expect(slide).toHaveAttribute("data-state", "next"));
  });

  it("al mover el indice del hook, past/current/next cambian en consecuencia (test 3)", async () => {
    vi.stubGlobal("innerHeight", 800);
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;

    // Geometria de la pista CON cola (D3/D4, spec
    // 2026-08-02-features-overlay-celestial-orbital-design.md, que revierte
    // D9): la pista mide (SLIDES + TAIL) pantallas y useSlideDeck resta la
    // cola del span (`measure()`, useSlideDeck.ts) -- mismo termino que ya
    // protege "con tailScreens = 1 el progreso llega a 1 una pantalla antes"
    // en useSlideDeck.test.tsx. Se fija rect.top para que progress caiga
    // EXACTAMENTE en targetIndex/(N-1), sin depender de ningun redondeo --
    // measure() corre SINCRONO dentro de start() en cuanto la interseccion
    // se activa, sin necesitar rAF (misma tecnica que useSlideDeck.test.tsx).
    const vh = window.innerHeight;
    const height = (JOURNEY_SLIDES + JOURNEY_DECK_TAIL_SCREENS) * vh;
    const span = height - vh - JOURNEY_DECK_TAIL_SCREENS * vh;
    const targetIndex = 4;
    const progress = targetIndex / (JOURNEY_SLIDES - 1);
    track.getBoundingClientRect = () =>
      ({ top: -progress * span, height }) as DOMRect;

    act(() => triggerFor(track, true));

    expect(stage).toHaveAttribute("data-slide", String(targetIndex));
    const slides = Array.from(container.querySelectorAll("[data-slide-index]"));
    slides.forEach((slide, i) => {
      const expected =
        i < targetIndex ? "past" : i === targetIndex ? "current" : "next";
      expect(slide).toHaveAttribute("data-state", expected);
    });
  });

  it("cada diapositiva de paso compone icono, etiqueta y subtitulo -- sin ordinal visible -- con el mismo i18n que la rama clara (test 4, D11/T5, Task 16)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];

    // Diapositiva 0: h2#journey-title + cuerpo de intro (pieza distinta --
    // Home.journey.body -- del subtitulo de paso que se verifica mas abajo;
    // no forma parte del renombrado T5). Hasta Task 11 (2026-08-09) abria
    // con un kicker antes del h2, retirado por esa tarea -- ver la sonda
    // negativa en el test de mas arriba.
    expect(slides[0].querySelector("h2#journey-title")).toHaveTextContent(
      esHome.Home.journey.title,
    );
    expect(
      within(slides[0]).getByText(esHome.Home.journey.body),
    ).toBeInTheDocument();

    // Diapositivas 1..JOURNEY_STEPS.length: un paso cada una. D11 componia
    // icono -> numero -> etiqueta -> cuerpo; el numero se retiro por
    // completo (encargo explicito del usuario, 2026-08-02, solo esta rama, y
    // reconfirmado el 2026-08-11 cuando la Task 16 propuso devolverlo);
    // despues (T5, spec 2026-08-02-journey-deck-tipografia-design.md) esa
    // tercera pieza se renombro de ROL, de "cuerpo" a "subtitulo" (misma
    // clave de i18n, `steps.<id>.body`, sin renombrar -- T5 no toca datos).
    // Hoy compone icono -> etiqueta -> subtitulo, con el anuncio de posicion
    // para lector de pantalla por delante (sin caja: no aparece en la lista
    // de <p> de abajo, y por eso esta lista sigue siendo de dos elementos).
    //
    // Tres aserciones NEGATIVAS protegen la ausencia del numero VISIBLE: el
    // ordinal exacto de este paso, cualquier texto con forma "0N" (por si un
    // indice se colara en la diapositiva equivocada) y el formato
    // "0N · Label" concatenado de la rama clara. Sin ellas el test seguiria
    // en verde si alguien reintrodujera la numeracion.
    JOURNEY_STEPS.forEach((step, i) => {
      const slide = slides[i + 1];
      const number = String(i + 1).padStart(2, "0");
      const label = esHome.Home.journey.steps[step.id].label;
      const subtitle = esHome.Home.journey.steps[step.id].body;
      expect(slide.querySelector("svg")).toBeInTheDocument();
      const labelNode = within(slide).getByText(label);
      const subtitleNode = within(slide).getByText(subtitle);

      const textos = Array.from(slide.querySelectorAll("p")).map((el) =>
        el.textContent?.trim(),
      );
      expect(textos).toEqual([label, subtitle]);
      expect(
        labelNode.compareDocumentPosition(subtitleNode) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(within(slide).queryByText(number)).not.toBeInTheDocument();
      expect(within(slide).queryByText(/^0[1-6]$/)).not.toBeInTheDocument();
      expect(
        within(slide).queryByText(`${number} · ${label}`),
      ).not.toBeInTheDocument();
    });

    // Diapositiva JOURNEY_SLIDES - 1: la cita.
    expect(
      within(slides[JOURNEY_SLIDES - 1]).getByText(
        `“${esHome.Home.journey.quote}”`,
      ),
    ).toBeInTheDocument();
  });

  /*
   * Task 22 (tipografia de lectura, plan premium F1-F5, punto 2 del brief):
   * `ScJourneyStepSubtitle` (`journey.deck.tsx`) no declaraba `max-width` --
   * el detector de craft midio en runtime, en los dos gates, que su
   * contenedor da 97,9-112ch de capacidad a 1280px
   * (`JOURNEY_CONTENT_MAX_WIDTH`). Con el copy actual ninguna instancia llega
   * a envolver (riesgo ESTRUCTURAL latente, no defecto visible hoy), pero un
   * copy mas largo se extenderia sin freno. Candado por TEXTO del CSS
   * inyectado (`cssRuleTextFor`): la declaracion vive en la clase base, sin
   * ningun `@media` de por medio, asi que jsdom SI la resuelve por CSSOM --
   * pero se afirma el mismo `themes.dark.grid.prose` (65ch) que consume el
   * componente, nunca el literal "65ch" a mano.
   */
  it("Task 22: el subtitulo de cada paso topa su ancho en grid.prose (65ch)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const subtitle = screen.getByText(
      esHome.Home.journey.steps[JOURNEY_STEPS[0].id].body,
    );
    expect(cssRuleTextFor(subtitle)).toContain(
      `max-width: ${themes.dark.grid.prose}`,
    );
  });

  it("hay un unico encabezado en toda la seccion, y es h2#journey-title (test 5, D14)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H2");
    expect(headings[0]).toHaveAttribute("id", "journey-title");
  });

  it("declara position: sticky en el stage y NINGUN overflow en ScJourney (test 6, D7 -- el fallo que rompe el pin en silencio)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const section = container.querySelector("#journey") as HTMLElement;
    const stage = container.querySelector("[data-slide]") as HTMLElement;

    const stageCss = cssRuleTextFor(stage);
    expect(stageCss).toContain("position: sticky");

    const sectionCss = cssRuleTextFor(section);
    expect(sectionCss).not.toMatch(/overflow/);
  });

  it("bajo prefers-reduced-motion la pista vuelve a flujo, el stage a static y las diapositivas quedan visibles (test 7, D12)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    const firstSlide = container.querySelector(
      '[data-slide-index="0"]',
    ) as HTMLElement;

    const trackCss = cssRuleTextFor(track);
    expect(trackCss).toContain("prefers-reduced-motion: reduce");
    expect(
      trackCss.slice(trackCss.indexOf("prefers-reduced-motion: reduce")),
    ).toContain("height: auto");

    const stageCss = cssRuleTextFor(stage);
    expect(stageCss).toContain("prefers-reduced-motion: reduce");
    expect(
      stageCss.slice(stageCss.indexOf("prefers-reduced-motion: reduce")),
    ).toContain("position: static");

    const slideCss = cssRuleTextFor(firstSlide);
    expect(slideCss).toContain("prefers-reduced-motion: reduce");
    const slideReduceBlock = slideCss.slice(
      slideCss.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(slideReduceBlock).toContain("opacity: 1");
    expect(slideReduceBlock).toContain("transform: none");
  });

  /*
   * Test 12 (§8 de la spec), añadido tras la auditoría adversarial: es el
   * único guard de `reduce` que NO se deduce mirando el elemento que protege.
   *
   * Bajo `reduce`, el stage pasa a `position: static` (test 7, arriba) y con
   * ello deja de ser el containing block del envoltorio de la escena, que
   * sigue siendo absoluto. El containing block sube a la pista, cuya altura
   * bajo `reduce` es `auto` — las 8 diapositivas apiladas, varias pantallas —
   * y las seis capas de la escena (`object-fit: cover`) se estiran a esa
   * altura, quedando recortadas a una franja vertical con un zoom brutal.
   *
   * Por qué necesita test propio: NO se pierde ni una palabra de texto, así
   * que todos los tests de contenido y el propio test 7 seguirían verdes con
   * el fondo roto. Lo que lo cierra es que el envoltorio declare bajo
   * `reduce` una altura EXPLÍCITA de una pantalla y se ancle arriba, que es
   * correcto sea cual sea el ancestro que acabe haciendo de containing block.
   */
  it("bajo prefers-reduced-motion el envoltorio de la escena se ancla arriba con un alto explicito de una pantalla, para no estirarse a la pista entera (test 12, D12)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const sceneWrap = stage.firstElementChild as HTMLElement;

    const wrapCss = cssRuleTextFor(sceneWrap);
    expect(wrapCss).toContain("prefers-reduced-motion: reduce");
    const wrapReduceBlock = wrapCss.slice(
      wrapCss.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(wrapReduceBlock).toContain("top: 0");
    expect(wrapReduceBlock).toContain("bottom: auto");
    // El alto se lee de la constante, no de un literal: si la pantalla de la
    // sección cambiara de medida, este guard tiene que seguir describiendo
    // "una pantalla" y no un número que dejó de significar eso.
    expect(wrapReduceBlock).toContain(`height: ${JOURNEY_DARK_HEIGHT}`);
    expect(wrapReduceBlock).toContain("transform: none");
  });

  it("el deck acota su ancho a JOURNEY_CONTENT_MAX_WIDTH (constante importada, no un literal) (test 8)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const firstSlide = container.querySelector(
      '[data-slide-index="0"]',
    ) as HTMLElement;
    const deck = firstSlide.parentElement as HTMLElement;
    expect(getComputedStyle(deck).maxWidth).toBe(JOURNEY_CONTENT_MAX_WIDTH);
  });

  it('cssVarPrefix "journey" escribe --journey-progress y NO --story-progress sobre el stage (test 9, D4)', async () => {
    vi.stubGlobal("innerHeight", 800);
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    track.getBoundingClientRect = () =>
      ({ top: 0, height: JOURNEY_SLIDES * window.innerHeight }) as DOMRect;

    act(() => triggerFor(track, true));

    expect(stage.style.getPropertyValue("--journey-progress")).toBe("0.0000");
    expect(stage.style.getPropertyValue("--story-progress")).toBe("");
  });
});

/*
 * Task 6 (plan `2026-08-10-implementacion-plan-premium-f1-f5`), punto 1:
 * candado del deck accesible con lector de pantalla. MISMO contrato que el
 * candado gemelo de `Story.test.tsx` (su docblock, verbatim salvo el nombre
 * del deck): el veredicto favorable medido por la auditoria -- las
 * JOURNEY_SLIDES diapositivas se leen completas, en orden, porque nada las
 * oculta -- se fija aqui por escrito para que un cambio futuro no pueda
 * romperlo en silencio.
 *
 * ACTUALIZADO (fix wave A, hallazgo A1, revision final de rama): igual que
 * su gemelo de `Story.test.tsx`, la frase "ScJourneySlide es solo
 * opacity/transform, nunca display:none/visibility:hidden" DEJO DE SER
 * CIERTA -- ver el docblock de `ScJourneySlide` (`journey.deck.tsx`) para el
 * porque completo (mismo arreglo que `ScSlide` en `story.deck.tsx`,
 * aplicado de forma PREVENTIVA aqui: Journey no tenia hoy ningun elemento
 * focalizable dentro de una diapositiva, pero la misma estructura ya
 * permitio el trap de foco invisible en Story en cuanto la Task 6 anadio un
 * enlace real). Los dos asserts de este describe siguen siendo correctos y
 * necesarios (jsdom no resuelve `visibility` de una hoja de estilos), pero
 * ya no describen una lectura de "las 8 diapositivas de una sola pasada": en
 * un navegador real solo la diapositiva `current` esta en el arbol de
 * accesibilidad en cada instante. El candado que ata la visibilidad
 * condicional vive en el describe "fix wave A" de mas abajo.
 *
 * Fix round (revision del coordinador, mismo hallazgo que su gemelo de
 * `Story.test.tsx`): la version original solo cubria la diapositiva misma
 * y sus ANCESTROS (`closest()`, que solo sube) -- un `aria-hidden="true"`
 * en un nodo INTERNO con texto pasaba en verde mientras un lector de
 * pantalla dejaba de anunciar ese texto.
 *
 * El primer arreglo (exigir CERO `aria-hidden` interno) era DEMASIADO
 * estricto: `StepIcon` (Journey.tsx:440) es un SVG decorativo con
 * `aria-hidden="true"` DENTRO de cada diapositiva de paso -- redundante a
 * proposito con `ScJourneyStepLabel`, que ya nombra el paso en texto -- y
 * ese `aria-hidden` es la practica CORRECTA, no un bug (confirmado al
 * ejecutar la version estricta: rompio en rojo sobre codigo sin ningun
 * defecto de accesibilidad). El arreglo final distingue las dos
 * situaciones por su EFECTO, no por su presencia: un `aria-hidden` interno
 * esta permitido si el subarbol que oculta no tiene texto (`textContent`
 * vacio, un icono puramente grafico); esta prohibido si oculta texto real.
 * Cada diapositiva recorre TODOS sus descendientes `aria-hidden="true"` y
 * exige `textContent` vacio en cada uno.
 *
 * Verificado con DOS bugs inyectados a proposito, cada uno acotado a la
 * asercion que cierra (informe de la tarea): (a) anadir
 * `aria-hidden="true"` al CONTENEDOR de una `ScJourneySlide` pone este test
 * en rojo por `not.toHaveAttribute`; quitarlo lo devuelve a verde. (b)
 * anadir `aria-hidden="true"` a un nodo INTERNO con texto de una
 * diapositiva (sin tocar el contenedor) pone este test en rojo porque ese
 * descendiente oculto deja de tener `textContent` vacio; quitarlo lo
 * devuelve a verde.
 */
/*
 * Task 16, fix round (2026-08-11): la senal de POSICION de la rama oscura.
 *
 * El ordinal visible no vuelve -- es decision del dueno (D16 de la spec de
 * las 8 diapositivas, reconfirmada). Lo que si entra es lo que faltaba de
 * verdad: el rail de progreso es `aria-hidden`, asi que un lector de pantalla
 * no tenia ninguna forma de saber por que paso de la secuencia iba. El texto
 * se anuncia y no se ve.
 *
 * Se comprueban las tres propiedades que lo hacen util, no solo que exista:
 * (1) esta en el DOM con PALABRAS ("Paso 3 de 6"), no un "03" suelto que
 * leido en voz alta no dice nada; (2) va PRIMERO dentro de la diapositiva,
 * antes de la etiqueta, para que la posicion se anuncie antes que el nombre;
 * (3) el total sale de `JOURNEY_STEPS.length`, no de un literal.
 */
describe("Journey: senal de posicion para lector de pantalla (tema oscuro, Task 16)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("cada diapositiva de paso anuncia 'Paso N de <total>' con el total leido de JOURNEY_STEPS", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];

    JOURNEY_STEPS.forEach((step, i) => {
      const slide = slides[i + 1];
      const esperado = esHome.Home.journey.stepPosition
        .replace("{{current}}", String(i + 1))
        .replace("{{total}}", String(JOURNEY_STEPS.length));
      const anuncio = within(slide).getByText(esperado);
      expect(anuncio).toBeInTheDocument();

      // Primero en el DOM: antes de la etiqueta del paso.
      const label = within(slide).getByText(
        esHome.Home.journey.steps[step.id].label,
      );
      expect(
        anuncio.compareDocumentPosition(label) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("el anuncio NO ocupa caja: es un VisuallyHidden (1x1 recortado), no un texto visible mas", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const esperado = esHome.Home.journey.stepPosition
      .replace("{{current}}", "1")
      .replace("{{total}}", String(JOURNEY_STEPS.length));
    const anuncio = screen.getByText(esperado);

    // Por el CSS inyectado, no por getComputedStyle: styled-components no
    // resuelve la clase de un átomo compartido a través de getComputedStyle
    // de forma fiable en jsdom, y lo que hay que atar es la receta sr-only.
    const css = cssRuleTextFor(anuncio);
    expect(css).toContain("clip-path: inset(50%)");
    expect(css).toContain("width: 1px");
    expect(css).toContain("height: 1px");
    // Y NO se oculta del arbol de accesibilidad: eso lo dejaria mudo, que es
    // justo lo contrario de para lo que existe.
    expect(anuncio).not.toHaveAttribute("aria-hidden");
    expect(anuncio.closest('[aria-hidden="true"]')).toBeNull();
  });
});

describe("Journey: candado SR del deck -- orden de DOM y ausencia de aria-hidden sobre el texto (Task 6)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("las JOURNEY_SLIDES diapositivas aparecen en el DOM en orden ascendente de data-slide-index", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];

    slides.forEach((slide, i) => {
      expect(slide.getAttribute("data-slide-index")).toBe(String(i));
    });
  });

  it("ninguna diapositiva (ni ningun ancestro suyo) lleva aria-hidden, y todas conservan texto real", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];

    slides.forEach((slide) => {
      expect(slide).not.toHaveAttribute("aria-hidden");
      expect(slide.closest('[aria-hidden="true"]')).toBeNull();
      // querySelectorAll() BAJA por los descendientes -- closest() no
      // cubre este caso (solo sube). NO se exige "cero aria-hidden
      // interno" a secas: StepIcon (Journey.tsx:440) es un icono
      // decorativo legitimo con aria-hidden DENTRO de cada diapositiva de
      // paso, redundante a proposito con ScJourneyStepLabel. Lo que el
      // candado prohibe es que un aria-hidden interno oculte TEXTO, asi
      // que cada descendiente oculto tiene que tener textContent vacio
      // (fix round, revision del coordinador).
      const hiddenDescendants = Array.from(
        slide.querySelectorAll('[aria-hidden="true"]'),
      );
      hiddenDescendants.forEach((hidden) => {
        expect(hidden.textContent?.trim()).toBe("");
      });
      expect(slide.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });
});

/*
 * Fix wave A, hallazgo A1 (WCAG 2.4.7, revision final de rama). MISMO
 * candado que su gemelo de `Story.test.tsx` -- ver su docblock, verbatim
 * salvo el nombre del componente y el numero de diapositivas. Aplicado de
 * forma PREVENTIVA (ver el docblock de `ScJourneySlide`,
 * `journey.deck.tsx`): hoy ninguna diapositiva de Journey monta un elemento
 * focalizable, pero el candado ata la ESTRUCTURA, no el contenido concreto
 * de hoy, para que un enlace/boton anadido manana no reabra el mismo trap.
 *
 * Verificado con un bug inyectado a proposito (informe de la tarea): al
 * quitar `visibility: hidden` del reposo de `ScJourneySlide`
 * (journey.deck.tsx), el primer `it` de este describe cae en rojo; al
 * restaurarlo, vuelve a verde.
 */
describe("Journey: fix wave A, A1 -- las diapositivas no actuales no son tabulables (CSS declarado)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('el reposo de ScJourneySlide declara visibility: hidden, y [data-state="current"] lo revierte a visible', async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slide = container.querySelector("[data-slide-index]") as HTMLElement;

    const baseRule = cssRuleFor(slide, (sel) => !sel.includes("["));
    expect(baseRule.style.visibility).toBe("hidden");

    const currentRule = cssRuleFor(slide, (sel) =>
      sel.includes('[data-state="current"]'),
    );
    expect(currentRule.style.visibility).toBe("visible");
  });

  it("bajo prefers-reduced-motion, TODAS las diapositivas vuelven a visibility: visible", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const slide = container.querySelector("[data-slide-index]") as HTMLElement;

    const css = cssRuleTextFor(slide);
    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("visibility: visible");
  });
});

/*
 * Task 4 (plan `2026-08-10-implementacion-plan-premium-f1-f5`): pista de
 * scroll del deck, aria-hidden, que se desvanece con el PRIMER avance
 * reutilizando `data-slide` (`ScJourneyStage`) -- SIN listener nuevo (ver el
 * docblock de `ScJourneyScrollHint`, `journey.deck.tsx`). Misma tecnica de
 * mock de `useSlideDeck` que el describe de arriba: `track.getBoundingClientRect`
 * fijado para que `measure()` (sincrono dentro del `IntersectionObserver`
 * stub) calcule un `progress` exacto, sin depender de ningun redondeo.
 */
describe("Journey: Task 4, pista de scroll del deck (tema oscuro)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("aparece aria-hidden, con el texto real de i18n del namespace common (no home)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    expect(hint).toHaveAttribute("aria-hidden", "true");
  });

  it("presencia inicial: opacity 1 mientras data-slide sigue en la diapositiva 0", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    expect(stage).toHaveAttribute("data-slide", "0");
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    expect(getComputedStyle(hint).opacity).toBe("1");
  });

  it("se desvanece (opacity 0) en cuanto el usuario avanza por primera vez -- mock del estado de useSlideDeck, sin listener nuevo", async () => {
    vi.stubGlobal("innerHeight", 800);
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;

    // Geometria de la pista CON cola (JOURNEY_DECK_TAIL_SCREENS), MISMA
    // tecnica que "al mover el indice del hook" un poco mas arriba:
    // rect.top fijado para que progress caiga EXACTAMENTE en 1/(N-1) -- la
    // primera diapositiva de paso, justo tras la intro.
    const vh = window.innerHeight;
    const height = (JOURNEY_SLIDES + JOURNEY_DECK_TAIL_SCREENS) * vh;
    const span = height - vh - JOURNEY_DECK_TAIL_SCREENS * vh;
    const targetIndex = 1;
    const progress = targetIndex / (JOURNEY_SLIDES - 1);
    track.getBoundingClientRect = () =>
      ({ top: -progress * span, height }) as DOMRect;

    act(() => triggerFor(track, true));

    expect(stage).toHaveAttribute("data-slide", String(targetIndex));
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    expect(getComputedStyle(hint).opacity).toBe("0");
  });

  it("opacity es la UNICA propiedad animada (DECK.exitDurationMs + easing.standard), y no se declara bajo prefers-reduced-motion: reduce -- bajo reduce el elemento se retira por completo (display: none)", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    const css = cssRuleTextFor(hint);
    const topLevelCss = css.split("@media")[0];

    // Shorthand `transition` sin var()/calc(): jsdom SI la resuelve como
    // cadena literal.
    expect(getComputedStyle(hint).transition).toBe(
      `opacity ${DECK.exitDurationMs}ms ${motion.easing.standard}`,
    );
    expect(topLevelCss).toContain("transition: opacity");

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("display: none");
    // Verificado con el bug inyectado a proposito: quitando `display: none`
    // del bloque de reduce (journey.deck.tsx, ScJourneyScrollHint) este
    // assert se pone en rojo; se restauro para dejar la suite en verde. La
    // animacion, ademas, NO se declara bajo reduce: ninguna `transition`
    // dentro de este bloque.
    expect(reduceBlock).not.toContain("transition");
  });
});

/*
 * Invariante D5 (spec `2026-08-02-journey-overlay-transition-design.md`,
 * test §7.5). Es el ÚNICO punto del repo donde los datos de las dos secciones
 * se miran a la cara: el solape de Journey (`JOURNEY_OVERLAY_RISE`) y la zona
 * de hold al final de la pista de Story (`STORY_DECK_TAIL_SCREENS` pantallas
 * de `STORY_DARK_HEIGHT`) TIENEN que medir lo mismo. Los ficheros de datos de
 * cada sección no se importan entre sí a propósito (acoplarlos mezclaría los
 * datos de dos secciones que no se conocen), así que la igualdad no puede
 * vivir en ninguno de los dos: vive aquí, en un test, que es lo único que
 * impide de verdad la regresión. Un comentario en cada fichero no lo impide.
 *
 * Qué se rompe si se desincronizan, y por qué no lo vería ningún otro test:
 * si el solape es MENOR que el hold, el `stage` de Story se despega antes de
 * que Journey termine de cubrir el viewport y asoma una banda del fondo de
 * Story entre las dos secciones; si es MAYOR, Journey empieza a subir cuando
 * la diapositiva 6 todavía está activa y la tapa a media lectura. Las dos
 * cosas son defectos visuales puros: la suite entera seguiría verde.
 *
 * La aserción compara MAGNITUD y UNIDAD por separado en vez de comparar las
 * dos cadenas: así sigue siendo correcta el día que `STORY_DECK_TAIL_SCREENS`
 * deje de valer 1 (dos pantallas de hold exigirían `200dvh` de solape, no la
 * misma cadena). Comparar `JOURNEY_OVERLAY_RISE === STORY_DARK_HEIGHT` a
 * secas solo funciona por la casualidad de que hoy la cola vale 1.
 */
describe("invariante solape de Journey ↔ cola de la pista de Story (D5)", () => {
  const magnitud = (valor: string): number => Number.parseFloat(valor);
  const unidad = (valor: string): string => valor.replace(/^[\d.]+/, "");

  it("el solape de Journey mide exactamente las pantallas de hold que reserva la pista de Story", () => {
    expect(unidad(JOURNEY_OVERLAY_RISE)).toBe(unidad(STORY_DARK_HEIGHT));
    expect(magnitud(JOURNEY_OVERLAY_RISE)).toBe(
      STORY_DECK_TAIL_SCREENS * magnitud(STORY_DARK_HEIGHT),
    );
  });

  /*
   * Segunda mitad de la MISMA invariante, que solo aparece con la
   * presentación de 8 diapositivas (spec
   * `2026-08-02-journey-deck-8-diapositivas-design.md`): el solape tiene que
   * medir además exactamente UN `stage` de Journey.
   *
   * Por qué, y por qué ningún otro test lo cubre: "Journey cubre el viewport"
   * ocurre cuando el borde superior de su pista llega al borde superior de la
   * vista, y lo que llena esa vista en ese instante es el `stage`, que mide
   * `JOURNEY_DARK_HEIGHT`. Si alguien bajara esa constante a, digamos,
   * `90dvh` —el valor que tenía esta sección antes de la entrega de la
   * tarde— el `stage` de Story se despegaría con el de Journey diez unidades
   * de viewport más corto que la pantalla, y en el relevo asomaría una banda
   * del `background-color` de la sección entre las dos escenas. La aserción
   * anterior no lo vería: `JOURNEY_OVERLAY_RISE` y `STORY_DARK_HEIGHT`
   * seguirían cuadrando entre sí.
   */
  it("el solape mide además exactamente un stage de Journey, que es lo que llena la vista en el relevo", () => {
    expect(unidad(JOURNEY_OVERLAY_RISE)).toBe(unidad(JOURNEY_DARK_HEIGHT));
    expect(magnitud(JOURNEY_OVERLAY_RISE)).toBe(magnitud(JOURNEY_DARK_HEIGHT));
  });
});

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, 2026-08-09):
 * `ScQuoteText` pasa de degradado de texto (`background-clip: text`) a color
 * solido (`semantic.brandText`) -- ver su docblock en Journey.tsx para el
 * porque completo. Se reutiliza TAL CUAL en las DOS ramas (JourneyLight,
 * dentro de `ScQuote`; JourneyDeckDark, dentro de `ScJourneyQuote`): las dos
 * se miden.
 */
describe("Journey: Task 12, ScQuoteText pasa a color solido", () => {
  function quoteNode(): HTMLElement {
    return screen.getByText(`“${esHome.Home.journey.quote}”`);
  }

  it("rama clara: la cita (ScQuoteText) resuelve semantic.brandText, sin background-clip", () => {
    renderWithProviders(<Journey />);
    const quote = quoteNode();

    expect(getComputedStyle(quote).color).toBe(themes.light.semantic.brandText);
    const css = cssRuleTextFor(quote);
    expect(css).not.toContain("background-clip");
    expect(css).not.toContain("color: transparent");
  });

  it("rama oscura: la cita (ScQuoteText, dentro de ScJourneyQuote) resuelve semantic.brandText, sin background-clip", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      renderWithProviders(<Journey />);
      await waitFor(() => {
        expect(quoteNode()).toBeInTheDocument();
      });
      const quote = quoteNode();

      expect(getComputedStyle(quote).color).toBe(
        themes.dark.semantic.brandText,
      );
      const css = cssRuleTextFor(quote);
      expect(css).not.toContain("background-clip");
    } finally {
      window.localStorage.clear();
    }
  });

  /*
   * Medicion de contraste AA (cierra el hueco que senalo la auditoria: "6
   * piezas color:transparent fuera del alcance de contrast.ts"). Rama clara
   * contra las dos paradas de `JOURNEY_CARD_BACKGROUND` (compuestas con su
   * alfa real sobre `semantic.bg`, el unico fondo detras de `ScCard`); rama
   * oscura contra `JOURNEY_PORTAL_VOID` (el void de la escena, hex -- jsdom
   * no compone las capas WebP reales, asi que es el suelo medible por
   * codigo). `journeyCosmicPortal.layers.ts` documenta ademas una esquina
   * MEDIDA de la capa opaca real (`01-background`, "#12012a") -- se mide
   * tambien contra esa cifra por ser el dato mas cercano al pixel real que
   * existe en el repo.
   */
  it("brandText sobre JOURNEY_CARD_BACKGROUND compuesto (rama clara) y sobre JOURNEY_PORTAL_VOID / la esquina medida (rama oscura) libran AA", () => {
    // Paradas ya compuestas con su alfa (~0.92) sobre semantic.bg (light) --
    // ver el docblock de ScQuoteText, Journey.tsx, para el calculo completo
    // (5.19:1 / 5.27:1). Se miden como literal hex final, no recomponiendo
    // el alfa aqui: contrastRatioHex no compone, solo mide.
    const paradasCompuestas = ["#ffecfd", "#e5f6ff"];
    paradasCompuestas.forEach((parada) => {
      const ratio = contrastRatioHex(themes.light.semantic.brandText, parada);
      expect(
        ratio,
        `parada ${parada}: contraste ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    const ratioVoid = contrastRatioHex(
      themes.dark.semantic.brandText,
      JOURNEY_PORTAL_VOID,
    );
    expect(
      ratioVoid,
      `void: contraste ${ratioVoid.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);

    const ratioEsquinaMedida = contrastRatioHex(
      themes.dark.semantic.brandText,
      "#12012a",
    );
    expect(
      ratioEsquinaMedida,
      `esquina medida: contraste ${ratioEsquinaMedida.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * Bug inyectado a proposito (regla 34), documentado en el informe de la
   * tarea: revertir `ScQuoteText` (Journey.tsx) a
   * `color: theme.data.semantic.text` (en vez de `brandText`) pone en rojo
   * los dos primeros tests de este describe; restaurado, vuelve a verde.
   */
});

/*
 * Task 12 (ghost-card): `ScDisc` (rama clara) conserva su sombra-glow
 * (`discShadow`, coloreada por paso) y retira el borde 1px
 * (`JOURNEY_DISC_BORDER`) -- ver el docblock de `ScDisc`, Journey.tsx, para
 * la regla completa (borde O sombra, nunca los dos) y por que este disco
 * concreto se queda con la sombra.
 */
describe("Journey: Task 12, ghost-card ScDisc (rama clara)", () => {
  function firstDisc(): HTMLElement {
    const icon = [...document.querySelectorAll("svg")].find(
      (svg) => svg.getAttribute("viewBox") === "0 0 24 24",
    ) as SVGSVGElement;
    return icon.parentElement as HTMLElement;
  }

  it("conserva la sombra-glow (box-shadow del paso) y NO declara ningun borde", () => {
    renderWithProviders(<Journey />);
    const disc = firstDisc();
    const css = cssRuleTextFor(disc);

    expect(css).toContain(`box-shadow: ${JOURNEY_STEPS[0].discShadow}`);
    expect(css).not.toContain("border:");
  });

  /*
   * Bug inyectado a proposito (regla 34), documentado en el informe de la
   * tarea: reintroducir `border: 1px solid oklch(0.9 0.03 275);` en `ScDisc`
   * (Journey.tsx) pone en rojo la aserción `expect(css).not.toContain("border:")`;
   * restaurado, vuelve a verde.
   */
});
