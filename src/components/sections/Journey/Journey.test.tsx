import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, isInaccessible } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import { Journey, stepLabelColor } from "./Journey";
import { Story } from "@/components/sections/Story/Story";
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
  JOURNEY_QUOTE_EXIT_SPAN,
  JOURNEY_SLIDES,
} from "./journey.layers";
import {
  JOURNEY_PORTAL_LAYERS,
  JOURNEY_PORTAL_VOID,
} from "@/components/scenes/journeyCosmicPortal/journeyCosmicPortal.layers";
import {
  STORY_DARK_HEIGHT,
  STORY_DECK_TAIL_SCREENS,
  STORY_SLIDES,
} from "@/components/sections/Story/story.layers";
import enHome from "@/i18n/locales/en/home.json";
import esHome from "@/i18n/locales/es/home.json";
import esCommon from "@/i18n/locales/es/common.json";
import { themes } from "@/theme/themes";
import { MIN_VIEWPORT_PX } from "@/theme/tokens/space";
import {
  contrastRatioHex,
  relativeLuminance,
  relativeLuminanceHex,
} from "@/theme/tokens/contrast";
import { DECK, REVEAL } from "@/motion/vocabulary";
import { DECK_SLIDE_TRAVEL_SCREENS } from "@/hooks/useSlideDeck";

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

/*
 * AQUI VIVIO `cssRuleFor`, el helper que localizaba UNA regla del CSSOM por
 * su `selectorText` y exponia `.style.<prop>`. Su unico consumidor era el
 * candado de A1 (fix wave A) sobre la `visibility` de `ScJourneySlide`, que
 * la critica externa #10 retiro con medicion delante -- ver el docblock de
 * `ScJourneySlide` (`journey.deck.tsx`). Se retira con el (regla 16 de
 * RULES.md: un helper que ya no describe nada es peor que ninguno). Sigue
 * vivo, intacto, en `Story.test.tsx`, que si conserva ese candado.
 */

/**
 * Alto simulado de la pista del deck, con la MISMA aritmetica que declara
 * `JOURNEY_DECK_TRACK_HEIGHT` (`journey.layers.ts`): los huecos entre
 * diapositivas por el recorrido de cada una, mas la pantalla del stage
 * pegado, mas la cola de hold. Los tests fabrican la geometria con
 * `getBoundingClientRect` porque jsdom no hace layout, y esa geometria
 * fabricada solo prueba algo si describe la pista REAL -- hasta la critica
 * externa #16 la escribian como `(JOURNEY_SLIDES + cola) * vh`, que era
 * exactamente la formula de entonces. Gemelo del de `Story.test.tsx`.
 *
 * Se deriva de las constantes, nunca de un numero: un literal aqui se
 * desincronizaria en silencio el dia que cambie el recorrido o el reparto
 * (regla 39 de `RULES.md`).
 */
function altoDePista(vh: number): number {
  return (
    (JOURNEY_SLIDES - 1) * DECK_SLIDE_TRAVEL_SCREENS * vh +
    (1 + JOURNEY_DECK_TAIL_SCREENS) * vh
  );
}

/** Recorrido que `useSlideDeck` reparte entre las diapositivas de esa pista. */
function spanDePista(vh: number): number {
  return altoDePista(vh) - vh - JOURNEY_DECK_TAIL_SCREENS * vh;
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

describe("Journey", () => {
  it("es una region con su nombre accesible real (aria-labelledby -> h2)", () => {
    renderWithProviders(<Journey />);
    const region = screen.getByRole("region", {
      name: esHome.Home.journey.title,
    });
    expect(region).toHaveAccessibleName(esHome.Home.journey.title);
    expect(region).toHaveAttribute("id", "journey");
  });

  /*
   * Critica externa #11 (2026-08-18), hallazgo C. Hasta hoy este test exigia
   * el formato "0N · Label" de la rama clara -- el ULTIMO resto de divergencia
   * de CONTENIDO entre las dos ramas de Journey, contra la decision D-C del
   * dueno ("tema = piel con contenido unificado"). El ordinal visible se
   * retira; la etiqueta queda pelada, exactamente la misma cadena que ya
   * pintaba la rama oscura desde la MISMA clave de i18n.
   *
   * El candado ya lo cierra la asercion POSITIVA: `getByText` compara el texto
   * completo del nodo (normalizado), no por substring, asi que con el ordinal
   * puesto el nodo diria "01 · Descubre" y `getByText("Descubre")` lanzaria.
   * Las dos negativas se anaden igualmente porque dicen en el propio test QUE
   * es lo prohibido -- el formato concatenado y el ordinal suelto -- en vez de
   * dejarlo implicito en el modo de comparacion de una utilidad de la libreria.
   * Verificado con bug inyectado (informe de la tarea).
   */
  it("muestra los 6 pasos con su label de i18n PELADO, sin ordinal visible (critica #11)", () => {
    renderWithProviders(<Journey />);
    JOURNEY_STEPS.forEach((step, index) => {
      const label = esHome.Home.journey.steps[step.id].label;
      const number = String(index + 1).padStart(2, "0");
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(
        screen.queryByText(`${number} · ${label}`),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(number)).not.toBeInTheDocument();
      expect(
        screen.getByText(esHome.Home.journey.steps[step.id].body),
      ).toBeInTheDocument();
    });
  });

  /*
   * Critica externa #11 (2026-08-18), hallazgo C, la otra mitad del cambio: la
   * senal de posicion que hasta hoy solo tenia la rama OSCURA pasa a las dos.
   * El ordinal no se pierde como CONTENIDO, cambia de canal y de palabras --
   * "01" leido en voz alta no significa nada; "Paso 1 de 6" si.
   *
   * Mismo trio de propiedades que ya verifica el describe gemelo de la rama
   * oscura, mas abajo: (1) esta con PALABRAS, (2) va antes de la etiqueta en
   * el DOM, (3) el total sale de `JOURNEY_STEPS.length`, no de un literal.
   */
  it("critica #11: cada paso de la rama clara anuncia 'Paso N de <total>' para lector de pantalla, antes de la etiqueta", () => {
    renderWithProviders(<Journey />);
    JOURNEY_STEPS.forEach((step, index) => {
      const esperado = esHome.Home.journey.stepPosition
        .replace("{{current}}", String(index + 1))
        .replace("{{total}}", String(JOURNEY_STEPS.length));
      const anuncio = screen.getByText(esperado);
      expect(anuncio).toBeInTheDocument();

      const label = screen.getByText(esHome.Home.journey.steps[step.id].label);
      expect(
        anuncio.compareDocumentPosition(label) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("critica #11: el anuncio de la rama clara NO ocupa caja (VisuallyHidden 1x1) y sigue en el arbol de accesibilidad", () => {
    renderWithProviders(<Journey />);
    const esperado = esHome.Home.journey.stepPosition
      .replace("{{current}}", "1")
      .replace("{{total}}", String(JOURNEY_STEPS.length));
    const anuncio = screen.getByText(esperado);

    // Por el CSS inyectado, no por getComputedStyle (mismo motivo que el
    // candado gemelo de la rama oscura, mas abajo en este fichero).
    const css = cssRuleTextFor(anuncio);
    expect(css).toContain("clip-path: inset(50%)");
    expect(css).toContain("width: 1px");
    expect(css).toContain("height: 1px");
    expect(anuncio).not.toHaveAttribute("aria-hidden");
    expect(anuncio.closest('[aria-hidden="true"]')).toBeNull();
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

  /*
   * Crítica externa #9 (2026-08-17): la entradilla de la cabecera clara era el
   * ÚLTIMO cuerpo de texto de la home sin tope de ancho propio. El evaluador la
   * midió en navegador real a 99,2 caracteres por línea -- un 32% sobre el
   * techo del rango 60-75 que el sistema declara (DESIGN.md 3.4) -- porque
   * heredaba los 640px de ScHeader con `max-width: none` propio.
   *
   * El candado se afirma contra `themes.light.grid.prose`, NUNCA contra el
   * literal "52ch": el valor del token es una medida calibrada que ya cambió
   * dos veces (65ch -> 52ch el 2026-08-17, 52ch -> 56ch en la critica #13) y un literal aquí se desincronizaría
   * en silencio. Va por TEXTO del CSS inyectado (`cssRuleTextFor`) porque la
   * declaración vive en la clase base, sin `@media` de por medio -- jsdom sí
   * la resuelve por CSSOM.
   *
   * `margin-inline: auto` se afirma junto al tope y no aparte: sin él la caja
   * ya estrechada quedaría pegada al borde izquierdo de una cabecera centrada,
   * que es un defecto distinto y peor que el que se venía a arreglar. Los dos
   * juntos son el arreglo; uno solo no lo es.
   */
  it("crítica #9: la entradilla topa su ancho en grid.prose y sigue centrada", () => {
    renderWithProviders(<Journey />);
    const entradilla = screen.getByText(esHome.Home.journey.body);
    const css = cssRuleTextFor(entradilla);
    expect(css).toContain(`max-width: ${themes.light.grid.prose}`);
    expect(css).toContain("margin-inline: auto");
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
    const height = altoDePista(vh);
    const span = spanDePista(vh);
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
    // "0N · Label" que la rama clara pinto hasta la critica externa #11
    // (2026-08-18, hallazgo C), donde tambien se retiro -- se conserva como
    // sonda porque es la forma exacta en la que la numeracion podria volver.
    // Sin ellas el test seguiria en verde si alguien la reintrodujera.
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
   * pero se afirma el mismo `themes.dark.grid.prose` que consume el
   * componente, nunca el literal "65ch" a mano.
   */
  it("Task 22: el subtitulo de cada paso topa su ancho en grid.prose", async () => {
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
    expect(sectionCss).not.toMatch(OVERFLOW_DE_SCROLL);
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
 * HISTORIA DE ESTA NOTA, en dos vueltas: el fix wave A (hallazgo A1,
 * 2026-08-12) anadio `visibility: hidden` al reposo de `ScJourneySlide` y
 * con ello la frase "ScJourneySlide es solo opacity/transform, nunca
 * display:none/visibility:hidden" dejo de ser cierta -- solo la diapositiva
 * `current` quedaba en el arbol de accesibilidad. La critica externa #10
 * (2026-08-18, hallazgo A, P0) midio el coste real de aquello (el deck
 * entero desaparecia para un lector de pantalla) y REVIRTIO la
 * `visibility`: hoy la frase vuelve a ser cierta y las JOURNEY_SLIDES
 * diapositivas se leen otra vez de una sola pasada. El porque completo de
 * las dos decisiones vive en el docblock de `ScJourneySlide`
 * (`journey.deck.tsx`); el candado que lo ata, en el describe "critica #10
 * hallazgo A" del final de este fichero.
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
 * Desde la critica externa #11 (2026-08-18, hallazgo C) este mecanismo YA NO
 * ES EXCLUSIVO de la rama oscura: la clara monta el mismo `VisuallyHidden` con
 * la misma clave al retirar su "0N · Label". Este describe se queda acotado al
 * tema oscuro -- su gemelo de la rama clara vive arriba, en el primer describe
 * del fichero, porque alli es donde esta el resto de la cobertura de esa rama.
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
 * AQUI VIVIO el describe "fix wave A, A1 -- las diapositivas no actuales no
 * son tabulables (CSS declarado)", con dos `it` que exigian
 * `visibility: hidden` en el reposo de `ScJourneySlide` y
 * `visibility: visible` en `[data-state="current"]` y bajo `reduce`.
 *
 * RETIRADO en la critica externa #10 (2026-08-18, hallazgo A, P0): esa
 * misma `visibility: hidden` era la causa raiz de que el deck oscuro no
 * existiera para tecnologia asistiva. No es un candado que se relaja para
 * que pase (regla 40): es un contrato REVERTIDO con medicion delante, y su
 * sustituto -- que ata la MISMA propiedad de fondo (cero trampas de foco
 * invisible, WCAG 2.4.7) por estructura en vez de por CSS -- vive en el
 * describe "critica #10 hallazgo A" del final de este fichero, junto con el
 * porque completo. El docblock de `ScJourneySlide` (`journey.deck.tsx`)
 * guarda la historia de las dos decisiones.
 *
 * El bloque `@media (prefers-reduced-motion: reduce)` de `ScJourneySlide`
 * sigue existiendo y sigue atado (`opacity: 1` / `transform: none` /
 * `pointer-events: auto`) por el describe de `reduce` que ya existia mas
 * arriba en este fichero; lo unico que desaparece de el es la linea de
 * `visibility`, que ya no tiene nada que revertir.
 */

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
    const height = altoDePista(vh);
    const span = spanDePista(vh);
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
 * Fix wave E, hallazgo E2 (evaluador de navegador real, 2026-08-13): cinco
 * de las seis etiquetas de paso (rama clara, `ScStepLabel`) incumplian AA
 * sobre el fondo pastel de la tarjeta -- ver el docblock de
 * `stepLabelColor`, Journey.tsx, para las seis cifras medidas (antes/
 * despues) y el porque del desplazamiento de +2 escalones dentro de la
 * MISMA rampa (preserva la progresion 500<600<700 del mockup en vez de
 * colapsar varios pasos al mismo color).
 */
describe("Journey: fix wave E, hallazgo E2 -- ScStepLabel sube de escalon en tema claro (AA)", () => {
  /** Las dos paradas de `JOURNEY_CARD_BACKGROUND` ya compuestas con su alfa
   *  (~0.92) sobre `semantic.bg` (light) -- MISMOS dos literales que ya usa
   *  el describe "Task 12, ScQuoteText" de arriba para medir sobre el mismo
   *  fondo real; `contrastRatioHex` no compone alfa, solo mide. */
  const PARADAS_COMPUESTAS = ["#ffecfd", "#e5f6ff"];

  it("cada etiqueta resuelve stepLabelColor (el escalon +2 AA-seguro), no stepColor (el escalon original del icono)", () => {
    renderWithProviders(<Journey />);
    JOURNEY_STEPS.forEach((step) => {
      // Etiqueta PELADA desde la critica externa #11 (2026-08-18): hasta esa
      // fecha este localizador buscaba "0N · Label". El color medido -- que es
      // lo que este describe protege -- no cambia con la retirada del ordinal:
      // `ScStepLabel` sigue siendo el mismo nodo con el mismo `stepLabelColor`.
      const label = esHome.Home.journey.steps[step.id].label;
      const node = screen.getByText(label);
      const esperado = stepLabelColor(themes.light, {
        colorRamp: step.colorRamp,
        colorStep: step.colorStep,
      });
      expect(getComputedStyle(node).color).toBe(esperado);
    });
  });

  it("las seis etiquetas resuelven >= 4.5:1 contra las dos paradas reales de la tarjeta", () => {
    JOURNEY_STEPS.forEach((step) => {
      const color = stepLabelColor(themes.light, {
        colorRamp: step.colorRamp,
        colorStep: step.colorStep,
      });
      PARADAS_COMPUESTAS.forEach((parada) => {
        const ratio = contrastRatioHex(color, parada);
        expect(
          ratio,
          `${step.id} (${step.colorRamp}/${step.colorStep} tras el ajuste) sobre ${parada} da ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  /*
   * Sonda de no-vacuidad (mismo patron que `navActiveAccent.contrast.test.ts`,
   * fix wave A): sin esto, el test de arriba pasaria en verde igual si
   * `stepLabelColor` colapsara por error a devolver siempre un unico
   * escalon de sobra (p.ej. 1100) -- esto demuestra que los escalones
   * ORIGINALES (`stepColor`, el que sigue usando el icono del disco) de
   * verdad incumplian AA en al menos una de las dos paradas, asi que el
   * candado de arriba mide una correccion real, no una coincidencia.
   */
  it("sonda de no-vacuidad: los escalones ORIGINALES (stepColor, sin el ajuste de E2) seguian incumpliendo 4.5:1", () => {
    const incumplioAlguno = JOURNEY_STEPS.some((step) => {
      const colorOriginal =
        themes.light.palette[step.colorRamp][step.colorStep];
      return PARADAS_COMPUESTAS.some(
        (parada) => contrastRatioHex(colorOriginal, parada) < 4.5,
      );
    });
    expect(incumplioAlguno).toBe(true);
  });

  /*
   * Bug inyectado a proposito (regla 34), verificado en esta tarea: revertir
   * `ScStepLabel` (Journey.tsx) de `stepLabelColor(...)` a `stepColor(...)`
   * (el escalon original) pone en rojo el primer test de este describe
   * (`getComputedStyle` deja de coincidir con `stepLabelColor`) Y el
   * segundo (5 de las 6 etiquetas vuelven a incumplir 4.5:1); restaurado,
   * los tres vuelven a verde.
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

/*
 * Critica externa #10, hallazgo A (P0): EL DECK OSCURO NO EXISTIA PARA
 * TECNOLOGIA ASISTIVA.
 *
 * Medido por el evaluador: `ariaSnapshot()` de `#journey` a scroll 0 devolvia
 * solo el `<h2>` y el parrafo de intro; los seis pasos y la cita no aparecian
 * NUNCA salvo de uno en uno al scrollear hasta su posicion exacta.
 * `textContent` 730 caracteres frente a `innerText` 184. Un cursor virtual de
 * lector de pantalla saltaba de la intro directamente a `#features`.
 *
 * Causa raiz: `visibility: hidden` en el reposo de `ScJourneySlide`
 * (`journey.deck.tsx`, fix wave A hallazgo A1), que SACA el nodo del arbol de
 * accesibilidad. Ver el docblock de `ScJourneySlide` para la reversion
 * completa y por que la mitad de A1 que si sigue viva (cero focalizables) se
 * ata ahora por ESTRUCTURA en vez de por CSS.
 *
 * Los tres candados de este describe cubren las tres mitades del arreglo:
 * (1) el efecto que importa -- las JOURNEY_SLIDES diapositivas estan en el
 * arbol de accesibilidad, en CUALQUIER estado del deck; (2) la fuente -- el
 * CSS de la diapositiva ya no declara `visibility` en ninguna de sus reglas;
 * (3) la condicion que hace segura la reversion -- ninguna diapositiva
 * contiene un elemento focalizable, asi que no hay trampa de foco invisible
 * que reabrir (WCAG 2.4.7).
 */
describe("Journey: critica #10 hallazgo A -- el deck oscuro existe para tecnologia asistiva", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  async function deck(): Promise<{
    container: HTMLElement;
    track: HTMLElement;
    slides: HTMLElement[];
  }> {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    return {
      container,
      track: stage.parentElement as HTMLElement,
      slides: Array.from(
        container.querySelectorAll("[data-slide-index]"),
      ) as HTMLElement[],
    };
  }

  it("las JOURNEY_SLIDES diapositivas estan en el arbol de accesibilidad con el deck en reposo", async () => {
    const { slides } = await deck();

    // `isInaccessible` (dom-accessibility-api, el MISMO calculo que usa
    // getByRole para decidir si un nodo entra en el arbol) mira
    // display/visibility/aria-hidden/hidden -- NO mira `opacity`, que es
    // justo la propiedad con la que el deck oculta visualmente. Ese es el
    // punto: la diapositiva puede estar invisible y seguir existiendo para
    // un lector de pantalla, que es lo que el hallazgo A pedia.
    slides.forEach((slide) => {
      expect(isInaccessible(slide)).toBe(false);
    });
  });

  it("los seis pasos y la cita siguen en el arbol con el deck en un indice intermedio (past + current + next a la vez)", async () => {
    vi.stubGlobal("innerHeight", 800);
    const { track, slides } = await deck();
    // progress = 0.5 con span = (JOURNEY_SLIDES - 1) pantallas: el indice
    // cae en mitad del recorrido, asi que conviven diapositivas `past`,
    // `current` y `next` en el mismo render.
    const alto = altoDePista(800);
    const span = spanDePista(800);
    track.getBoundingClientRect = () =>
      ({ top: -span / 2, height: alto }) as DOMRect;

    act(() => triggerFor(track, true));

    const estados = slides.map((slide) => slide.getAttribute("data-state"));
    expect(estados).toContain("past");
    expect(estados).toContain("current");
    expect(estados).toContain("next");

    slides.forEach((slide) => {
      expect(isInaccessible(slide)).toBe(false);
    });
    JOURNEY_STEPS.forEach((step) => {
      expect(
        screen.getByText(esHome.Home.journey.steps[step.id].label),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(`“${esHome.Home.journey.quote}”`),
    ).toBeInTheDocument();
  });

  it("ninguna regla de ScJourneySlide declara visibility (ni en reposo, ni en current, ni bajo reduce)", async () => {
    const { slides } = await deck();

    // Por texto de CSS inyectado acotado al componente (cssRuleTextFor), no
    // por getComputedStyle: lo que hay que atar es que la DECLARACION no
    // vuelva, en ninguna de las reglas de esta pieza -- incluido el bloque
    // de @media, que jsdom no evalua (regla 36 de RULES.md).
    const css = cssRuleTextFor(slides[0]);
    expect(css).toContain("opacity: 0");
    expect(css).not.toContain("visibility");
  });

  it("ninguna diapositiva contiene un elemento focalizable (la condicion que hace segura la reversion, WCAG 2.4.7)", async () => {
    const { slides } = await deck();

    // La mitad de A1 que SIGUE VIVA: `opacity: 0` no saca del orden de
    // tabulacion, asi que la unica garantia real de que no hay trampa de
    // foco invisible es que no exista nada focalizable dentro. Este candado
    // ata esa ESTRUCTURA -- si manana alguien anade un enlace o un boton a
    // una diapositiva, cae en rojo y obliga a resolver el foco de forma
    // explicita (p.ej. `tabIndex={-1}` atado a `data-state`) en vez de
    // reintroducir un `visibility: hidden` que volveria a vaciar el arbol de
    // accesibilidad.
    const FOCALIZABLES =
      'a[href], button, input, select, textarea, iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    slides.forEach((slide) => {
      expect(slide.querySelectorAll(FOCALIZABLES)).toHaveLength(0);
    });
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado en esta tarea: devolver
   * `visibility: hidden;` al reposo de `ScJourneySlide` (`journey.deck.tsx`)
   * pone en rojo los tres primeros `it` de este describe (las diapositivas
   * vuelven a salir del arbol de accesibilidad y la declaracion reaparece en
   * el CSS); restaurada la linea, los cuatro vuelven a verde.
   */
});

/*
 * Critica externa #10, hallazgo B2: banda muerta de 290 px (34 % del
 * viewport) entre el cierre de Story y la tarjeta de Journey a 390x844 en
 * tema claro. El recorte y su aritmetica completa viven en el comentario de
 * `ScJourney` (`Journey.tsx`); aqui solo se ata que el valor recortado y su
 * restauracion por breakpoint siguen declarados, contra los TOKENS
 * importados y nunca contra una cadena escrita a mano (regla 38).
 *
 * Por texto de CSS inyectado y no por getComputedStyle: la mitad del
 * contrato vive dentro de un `@media`, que jsdom no evalua (regla 36).
 */
describe("Journey: critica #10 hallazgo B2 -- frontera statement -> Journey en movil (tema claro)", () => {
  it("la seccion clara recorta su padding-block-start a space[4] y lo restaura a space[8] desde md", () => {
    const { container } = renderWithProviders(<Journey />);
    const seccion = container.querySelector("#journey") as HTMLElement;
    const css = cssRuleTextFor(seccion);

    // Base (movil primero): el valor recortado.
    expect(css).toContain(`padding-block-start: ${themes.light.space[4]}`);
    // Y desde md, el original intacto -- dentro del bloque de @media, no
    // antes: si estuviera fuera pisaria al recorte en TODO ancho.
    const md = css.indexOf(themes.light.breakPoint.md);
    expect(md).toBeGreaterThan(-1);
    expect(css.slice(md)).toContain(
      `padding-block-start: ${themes.light.space[8]}`,
    );
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado en esta tarea: devolver
   * `padding-block-start: ${theme.data.space[8]}` al bloque BASE de la rama
   * clara de `ScJourney` (Journey.tsx) pone este test en rojo por la primera
   * asercion; restaurado el space[4], vuelve a verde.
   */
});

/*
 * Critica externa #10, hallazgo A (P2, heuristica 7 de Nielsen): los puntos
 * del rail del deck eran `span` decorativos -- `tabIndex -1` heredado del
 * `aria-hidden` del rail, sin rol, no clicables -- y encima casi invisibles
 * (`semantic.border` a `opacity: 0.4`, 8 px sobre la escena casi negra del
 * portal). Pasan a ser botones reales. El porque de cada mitad vive en el
 * docblock de `ScJourneyRailMark` (`journey.deck.tsx`) y en el comentario
 * del rail en `Journey.tsx`.
 */
describe("Journey: critica #10 hallazgo A -- el rail del deck es operable (tema oscuro)", () => {
  const VH = 800;

  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    vi.stubGlobal("innerHeight", VH);
    vi.stubGlobal("scrollY", 0);
    vi.stubGlobal("scrollTo", vi.fn());
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  async function railDeck(): Promise<{
    track: HTMLElement;
    botones: HTMLElement[];
  }> {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    // La pista se fija ANTES de avisar al observer para que `measure()`
    // calcule un progress exacto (misma tecnica que el resto de describes
    // de este fichero).
    track.getBoundingClientRect = () =>
      ({
        top: 0,
        height: altoDePista(VH),
      }) as DOMRect;
    const grupo = screen.getByRole("group", {
      name: esHome.Home.journey.railLabel,
    });
    return {
      track,
      botones: within(grupo).getAllByRole("button"),
    };
  }

  it("el rail es un grupo con nombre de i18n, y NO esta oculto del arbol de accesibilidad", async () => {
    const { botones } = await railDeck();
    const grupo = screen.getByRole("group", {
      name: esHome.Home.journey.railLabel,
    });

    expect(grupo).not.toHaveAttribute("aria-hidden");
    expect(botones).toHaveLength(JOURNEY_SLIDES);
  });

  /*
   * CRITICA EXTERNA #12 (2026-08-19): este candado exigia la NUMERACION DE
   * POSICION ("Ir a la diapositiva N de 8", `Home.journey.railGoTo`) y pasa a
   * exigir el NOMBRE DEL DESTINO. No es una relajacion: es el mismo contrato
   * de "cada boton tiene nombre propio de i18n" con la gramatica corregida --
   * la #12 midio que aquella numeracion contradecia la de las propias
   * diapositivas ("Paso N de 6", `stepPosition`, con desfase de uno), que es
   * exactamente el defecto que un rail de progreso no puede tener. El porque
   * completo, y por que renumerar no lo cerraba, en el docblock de `slideName`
   * (`Journey.tsx`).
   *
   * Los valores esperados se componen aqui desde el JSON -- las mismas claves
   * que pintan las diapositivas -- y no desde el helper del componente: si
   * `slideName` empezara a nombrar otra cosa, este candado tiene que verlo
   * (leccion `task/lessons.md` 2026-08-11).
   */
  it("cada marca es un boton con type=button y el nombre de la diapositiva a la que lleva", async () => {
    const { botones } = await railDeck();
    const esperados = [
      esHome.Home.journey.title,
      ...JOURNEY_STEPS.map((step) => esHome.Home.journey.steps[step.id].label),
      esHome.Home.journey.quote,
    ];

    expect(esperados).toHaveLength(JOURNEY_SLIDES);
    botones.forEach((boton, i) => {
      expect(boton).toHaveAttribute("type", "button");
      expect(boton).toHaveAccessibleName(esperados[i]);
    });
  });

  /*
   * La mitad del hallazgo que este describe no puede olvidar: el rail y las
   * diapositivas contaban DOS cosas distintas del mismo mecanismo. Hoy solo
   * cuenta una -- la de las diapositivas -- y este candado lo ata por
   * exclusion, que es la unica forma de que no vuelva por la puerta de atras
   * (un `aria-label` numerado nuevo, con el numero que sea, lo pone en rojo).
   */
  it("critica #12: ningun nombre del rail numera nada -- la unica numeracion de la seccion es la de los pasos", async () => {
    const { botones } = await railDeck();

    botones.forEach((boton) => {
      expect(boton.getAttribute("aria-label")).not.toMatch(/\d/);
    });
    // Y la que SI numera sigue viva, con su total real leido del array.
    const posicion = esHome.Home.journey.stepPosition
      .replace("{{current}}", "1")
      .replace("{{total}}", String(JOURNEY_STEPS.length));
    expect(screen.getAllByText(posicion).length).toBeGreaterThan(0);
  });

  it("aria-current marca UNA sola diapositiva y sigue al index del hook", async () => {
    const { track, botones } = await railDeck();

    act(() => triggerFor(track, true));
    expect(
      botones.filter((b) => b.getAttribute("aria-current") === "true"),
    ).toHaveLength(1);
    expect(botones[0]).toHaveAttribute("aria-current", "true");

    // span = alto - vh - cola*vh = (JOURNEY_SLIDES - 1) * recorrido; un
    // progress de 3/7 pone el index en 3 (round(3/7 * 7)).
    const span = spanDePista(VH);
    track.getBoundingClientRect = () =>
      ({
        top: -(span * 3) / (JOURNEY_SLIDES - 1),
        height: altoDePista(VH),
      }) as DOMRect;
    // Salir y volver a entrar, no un segundo aviso de entrada: `start()`
    // lleva guarda de reentrada (dos avisos seguidos de isIntersecting true
    // no repiten la medicion inmediata), asi que sin el `false` de en medio
    // este segundo trigger no mediria nada.
    act(() => triggerFor(track, false));
    act(() => triggerFor(track, true));

    expect(botones[3]).toHaveAttribute("aria-current", "true");
    expect(
      botones.filter((b) => b.getAttribute("aria-current") === "true"),
    ).toHaveLength(1);
  });

  it("pulsar la marca N lleva el scroll a la posicion exacta que activa esa diapositiva, con behavior smooth", async () => {
    const { botones } = await railDeck();
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    // Aritmetica, no un numero magico: con la pista en top 0 y scrollY 0,
    //   span = alto - VH - cola * VH = (JOURNEY_SLIDES - 1) * recorrido
    //   top(k) = k / (JOURNEY_SLIDES - 1) * span = k * recorrido
    const span = spanDePista(VH);
    [0, 3, JOURNEY_SLIDES - 1].forEach((k) => {
      scrollTo.mockClear();
      act(() => {
        botones[k].click();
      });
      expect(scrollTo).toHaveBeenCalledWith({
        top: (k / (JOURNEY_SLIDES - 1)) * span,
        behavior: "smooth",
      });
    });
  });

  it("bajo prefers-reduced-motion el salto es instantaneo, nunca animado", async () => {
    const { botones } = await railDeck();
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

    // matchMedia que SI responde a la consulta de reduced-motion (el stub
    // global de este fichero devuelve matches:false para cualquier query).
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    scrollTo.mockClear();
    act(() => {
      botones[2].click();
    });

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
  });

  it("el punto inactivo libra 3:1 (WCAG 1.4.11) sobre el void de la escena, y el activo sigue siendo otro color", async () => {
    const { botones } = await railDeck();

    // Que el COMPONENTE use de verdad el token que se mide abajo: sin esta
    // linea, las cifras de contraste seguirian saliendo bien aunque el
    // reposo del boton hubiera vuelto a `semantic.border` (regla 38 --
    // contra el token importado, nunca contra una cadena a mano).
    expect(cssRuleTextFor(botones[0])).toContain(
      `color: ${themes.dark.semantic.borderStrong}`,
    );

    // Los dos fondos medibles por codigo de esta escena, mismo criterio que
    // el candado de `ScQuoteText` (describe "Task 12"): el void declarado y
    // la esquina MEDIDA de la capa opaca real, que es el dato mas cercano al
    // pixel que existe en el repo.
    const FONDOS = [JOURNEY_PORTAL_VOID, "#12012a"];
    FONDOS.forEach((fondo) => {
      const ratio = contrastRatioHex(themes.dark.semantic.borderStrong, fondo);
      expect(
        ratio,
        `${fondo}: contraste ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);
    });

    // Sonda de no-vacuidad: el punto ANTERIOR incumplia 1.4.11 de verdad, y
    // la pieza que lo hundia era la OPACIDAD, no el token de color --
    // `semantic.border` OPACO da 3.30:1, justo por encima del umbral, pero
    // al 40 % sobre el void se queda muy por debajo.
    //
    // La composicion se calcula sobre la LUMINANCIA directamente, y eso es
    // exacto, no una aproximacion: la luminancia relativa es una
    // combinacion LINEAL de los canales RGB lineales, asi que mezclar los
    // canales al 40 % y mezclar las luminancias al 40 % dan el mismo
    // numero. (`contrastRatioOverAlpha` no sirve aqui: parsea las dos
    // superficies como oklch y el void de la escena es un hex.)
    const yPunto = relativeLuminance(themes.dark.semantic.border);
    const yVoid = relativeLuminanceHex(JOURNEY_PORTAL_VOID);
    const yCompuesto = 0.4 * yPunto + 0.6 * yVoid;
    const ratioAntes =
      (Math.max(yCompuesto, yVoid) + 0.05) /
      (Math.min(yCompuesto, yVoid) + 0.05);
    expect(
      ratioAntes,
      `punto inactivo anterior: ${ratioAntes.toFixed(2)}:1`,
    ).toBeLessThan(3);

    // El activo se distingue por COLOR ademas de por tamano: si los dos
    // resolvieran al mismo token, el rail dejaria de comunicar posicion.
    expect(themes.dark.semantic.brand).not.toBe(
      themes.dark.semantic.borderStrong,
    );
  });

  it("la diana del boton mide space[5] (24px, WCAG 2.5.8) aunque el punto siga midiendo space[2]", async () => {
    const { botones } = await railDeck();
    const css = cssRuleTextFor(botones[0]);

    expect(css).toContain(`width: ${themes.dark.space[5]}`);
    expect(css).toContain(`height: ${themes.dark.space[5]}`);
    // El punto, en el pseudo-elemento, conserva su medida original.
    const before = css.slice(css.indexOf("::before"));
    expect(before).toContain(`width: ${themes.dark.space[2]}`);
    // Y ya no hay ninguna opacidad recortando el inactivo.
    expect(css).not.toContain("opacity: 0.4");
  });

  /*
   * Bugs inyectados a proposito (regla 34), ejecutados en la tarea de la
   * critica #10:
   * (a) devolver `background-color: semantic.border` + `opacity: 0.4` al
   *     reposo de `ScJourneyRailMark` pone en rojo el candado de contraste y
   *     el de la diana; restaurado, vuelven a verde.
   * (b) cambiar `behavior: reduce ? "instant" : "smooth"` por un `"smooth"`
   *     fijo en `scrollToSlide` (`useSlideDeck.ts`) pone en rojo el test de
   *     reduced-motion; restaurado, vuelve a verde.
   *
   * Y el de la critica #12, ejecutado en ESTA tarea:
   * (c) devolver el `aria-label` del rail a la interpolacion anterior
   *     (`Home.journey.railGoTo`, "Ir a la diapositiva N de 8") pone en rojo
   *     los DOS candados de gramatica a la vez -- el de nombres ("expected
   *     element to have accessible name") y el de exclusion de numeracion
   *     ("expected 'Ir a la diapositiva 1 de 8' not to match /\d/");
   *     restaurado `slideName`, los dos vuelven a verde.
   */
});

/*
 * Candados de FUENTE (critica externa #12, 2026-08-19), no de render: el token
 * `grid.sectionMax` y el literal `"1280px"` resuelven a la MISMA cadena, asi
 * que ningun candado de valor renderizado puede distinguir "la seccion lee el
 * token" de "la seccion reescribe el numero" -- la propiedad solo se observa
 * en el FICHERO (`task/lessons.md` 2026-08-12; mismo patron que
 * `Hero.qa.test.tsx` estreno para `grid.heroCopyMax` en la critica #10).
 *
 * Gemelo exacto del de `Story.test.tsx`, porque el defecto era el mismo en las
 * dos secciones: el numero a mano en el fichero de datos y `grid.navMax` --el
 * tope de la PILDORA del navbar-- leido como ancho de contenido en la rama
 * clara.
 */
describe("Journey: critica #12 -- el tope de contenido sale de grid.sectionMax (candado de fuente)", () => {
  async function leerFuente(...segments: string[]): Promise<string> {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(here, ...segments), "utf-8");
  }

  function despojarComentarios(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  it("journey.layers.ts no escribe el numero a mano: JOURNEY_CONTENT_MAX_WIDTH deriva del token", async () => {
    const source = despojarComentarios(await leerFuente("journey.layers.ts"));

    expect(source).not.toContain("1280px");
    expect(source).toContain("JOURNEY_CONTENT_MAX_WIDTH = grid.sectionMax");
  });

  it("Journey.tsx no lee grid.navMax: el ancho de contenido de la rama clara cuelga de grid.sectionMax", async () => {
    const source = despojarComentarios(await leerFuente("Journey.tsx"));

    expect(source).not.toContain("grid.navMax");
    // Recuento CERRADO (regla 39/40): una sola medida de seccion en este
    // fichero.
    expect(source.match(/theme\.data\.grid\.sectionMax/g)?.length ?? 0).toBe(1);
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado en esta tarea: devolver
   * `max-width: ${theme.data.grid.navMax}` a la rama clara de `ScJourney`
   * (`Journey.tsx`) pone en rojo el segundo `it` por sus DOS aserciones;
   * restaurado, vuelve a verde. El primero se valida igual devolviendo el
   * literal `"1280px"` a `journey.layers.ts`.
   */
});

/*
 * Critica externa #13 (2026-08-19), P0 de la ronda: WCAG 2.1 SC 1.4.4 (AA).
 * Ver el docblock equivalente en `Story.test.tsx` para el mecanismo completo
 * (el tamano minimo automatico de una pista `1fr` es el min-content de lo que
 * contiene, y crece con la raiz por encima del contenedor). Medido en Chrome
 * real a 390x844 con la raiz a 32px: las dos pistas de `ScStepsGrid` median
 * 186.7px + 154.1px dentro de una caja de 70px y el ultimo paso terminaba en
 * x=548.8 sobre un viewport de 390, sin scroll horizontal que lo recuperase.
 *
 * Candado de CSSOM, no de geometria: jsdom no hace layout, asi que la
 * propiedad medida en navegador no es observable aqui; lo que si lo es es que
 * la declaracion culpable no exista y la nueva este presente.
 */
describe("Journey: critica #13 -- ampliar la fuente no recorta texto (SC 1.4.4)", () => {
  function declaracionBase(el: HTMLElement, prop: string): string | undefined {
    return cssRuleTextFor(el)
      .split("\n")
      .find((line) => !line.includes("@media") && line.includes(prop));
  }

  /* El valor sube de `break-word` a `anywhere` en la critica externa #19
     (2026-09-04) y el candado sube con el: `break-word` queda prohibido aqui
     porque es la forma que dejaba vivo el defecto -- parte la linea sin tocar el
     `min-content`, asi que la caja sigue inflandose. Ver el docblock de
     `ScStory` (`Story.tsx`) para la medicion. */
  it("ScJourney declara overflow-wrap: anywhere, que se hereda a todo su texto", () => {
    renderWithProviders(<Journey />);
    const section = document.getElementById("journey") as HTMLElement;
    const declaracion = declaracionBase(section, "overflow-wrap");
    expect(declaracion).toMatch(/overflow-wrap:\s*anywhere/);
    expect(declaracion).not.toMatch(/overflow-wrap:\s*break-word/);
  });

  /*
   * REESCRITO en la critica externa #15 (2026-09-02) porque la escalera de
   * columnas cambio debajo de el: el tramo base dejo de ser `repeat(2, ...)` y
   * paso a ser UNA sola pista (ver el docblock de `ScStepsGrid`,
   * `Journey.tsx`, y el describe de la #15 al final de este fichero). NO se
   * relaja la asercion (regla 40 de RULES.md): la invariante de la #13 -- que
   * ninguna pista se declare como `1fr` desnudo, porque su minimo automatico
   * es el min-content del paso y desborda al ampliar la raiz -- pasa a
   * comprobarse sobre los TRES regimenes a la vez, que es mas estricto que lo
   * que este candado cubria antes (solo el base).
   */
  it("ScStepsGrid acota el minimo de TODAS sus pistas: ninguna es 1fr desnudo", () => {
    const { container } = renderWithProviders(<Journey />);
    // ScStepLabel (p) -> ScStepOffset -> ScStepReveal -> ScStepsGrid. El
    // primer paso se localiza por su etiqueta REAL de i18n (no por el primer
    // <p> del arbol, que es el cuerpo de la cabecera).
    const primerPaso = JOURNEY_STEPS[0];
    const label = screen.getByText(
      esHome.Home.journey.steps[
        primerPaso.id as keyof typeof esHome.Home.journey.steps
      ].label,
    );
    const stepsGrid = label.parentElement!.parentElement!
      .parentElement as HTMLElement;
    expect(container).toBeTruthy();
    const css = cssRuleTextFor(stepsGrid);
    const lineas = css
      .split("\n")
      .filter((line) => line.includes("grid-template-columns"));

    // Un regimen por breakpoint: movil, md y lg (recuento cerrado, regla 40).
    expect(lineas).toHaveLength(3);
    expect(declaracionBase(stepsGrid, "grid-template-columns")).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    lineas.forEach((linea) => {
      expect(linea).toMatch(/minmax\(0,\s*1fr\)/);
    });
    // El `repeat(N, 1fr)` desnudo -- el que medimos desbordando -- no esta en
    // ningun tramo.
    expect(css).not.toMatch(/repeat\(\d+,\s*1fr\)/);
  });
});

/*
 * Critica externa #15 (2026-09-02), hallazgos A P2-2 y C 2: la rejilla de
 * pasos de la rama CLARA se leia en columnas de 103px a 390x844, con el cuerpo
 * de cada paso partido en lineas de 18-20 caracteres. Ver el docblock de
 * `ScStepsGrid` (`Journey.tsx`) para la escalera nueva (1 -> 2 -> 6), la
 * aritmetica que fija el breakpoint en `md` y por que el tramo `lg` de SEIS
 * columnas -- el del camino punteado del mockup -- no se toca.
 *
 * Candado de CSSOM, no de geometria: jsdom no hace layout ni evalua `@media`
 * (regla 36 de RULES.md), asi que lo observable aqui es el TEXTO de la regla
 * inyectada, acotado al bloque concreto (leccion 2026-08-02: trocear por
 * "@media" arrastra el stylesheet entero).
 */
describe("Journey: critica #15 -- los pasos se leen en movil (una columna bajo md)", () => {
  function reglaBase(el: HTMLElement, prop: string): string | undefined {
    return cssRuleTextFor(el)
      .split("\n")
      .find((line) => !line.includes("@media") && line.includes(prop));
  }

  function reglaEnMedia(
    el: HTMLElement,
    consulta: string,
    prop: string,
  ): string | undefined {
    return cssRuleTextFor(el)
      .split("\n")
      .find((line) => line.includes(consulta) && line.includes(prop));
  }

  function pasoDeLaRejilla(): {
    offset: HTMLElement;
    reveal: HTMLElement;
    grid: HTMLElement;
  } {
    // ScStepLabel (p) -> ScStepOffset -> ScStepReveal -> ScStepsGrid. El
    // primer paso se localiza por su etiqueta REAL de i18n, nunca por el
    // primer <p> del arbol (que es el cuerpo de la cabecera).
    const primerPaso = JOURNEY_STEPS[0];
    const label = screen.getByText(
      esHome.Home.journey.steps[
        primerPaso.id as keyof typeof esHome.Home.journey.steps
      ].label,
    );
    const offset = label.parentElement as HTMLElement;
    const reveal = offset.parentElement as HTMLElement;
    return { offset, reveal, grid: reveal.parentElement as HTMLElement };
  }

  it("la hoja de estilos declara UNA sola columna fuera de todo @media (regimen movil)", () => {
    renderWithProviders(<Journey />);
    const { grid } = pasoDeLaRejilla();
    const base = reglaBase(grid, "grid-template-columns");

    expect(base).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    // Ni las dos columnas de 103px que midio la critica, ni ningun repeat().
    expect(base).not.toMatch(/repeat\(/);
  });

  /*
   * La condicion del media query se pasa desde el TOKEN, no escrita a mano
   * (regla 38). Desde el frente F (2026-09-05) los cuatro breakpoints se
   * declaran en `em` para responder a la preferencia de tamano de texto del
   * usuario; con "min-width: 768px" escrito aqui, `reglaEnMedia` no habria
   * encontrado ninguna linea y el caso habria caido en rojo por el motivo
   * equivocado -- o peor, habria pasado a verde el dia que alguien lo
   * relajara. El escalon sigue valiendo 768 px con la raiz de fabrica.
   */
  it("las dos columnas empiezan en md (768 px a la raiz por defecto) y las tres de antes ya no existen", () => {
    renderWithProviders(<Journey />);
    const { grid } = pasoDeLaRejilla();
    const enMd = reglaEnMedia(
      grid,
      themes.light.breakPoint.md,
      "grid-template-columns",
    );

    expect(enMd).toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
    // El tramo intermedio de TRES columnas (187px a 768px, 31-34 caracteres)
    // se retira: ver la tabla del docblock de ScStepsGrid.
    expect(cssRuleTextFor(grid)).not.toMatch(/repeat\(3,/);
    // El regimen del mockup (6 columnas + camino punteado) sigue intacto.
    expect(
      reglaEnMedia(grid, themes.light.breakPoint.lg, "grid-template-columns"),
    ).toMatch(/grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("por debajo de md ninguna pieza del paso declara ancho fijo: la pista manda", () => {
    renderWithProviders(<Journey />);
    const { offset, reveal } = pasoDeLaRejilla();

    // `width: <numero>` en la regla BASE seria un ancho fijo que ignoraria la
    // pista de la rejilla. El disco (ScDisc, 56px) no entra: es el icono, no
    // la caja del paso, y vive en otro elemento.
    [reveal, offset].forEach((el) => {
      const base = cssRuleTextFor(el)
        .split("\n")
        .filter((line) => !line.includes("@media"))
        .join("\n");
      expect(base).not.toMatch(/[;{ ]width:\s*\d/);
      expect(base).not.toMatch(/[;{ ]max-width:\s*\d/);
    });
  });

  it("la tarjeta recorta su relleno lateral en movil y lo restaura en md", () => {
    renderWithProviders(<Journey />);
    const { grid } = pasoDeLaRejilla();
    // ScStepsGrid -> ScStepsRow -> ScStepsAndQuote -> ScCard.
    const card = grid.parentElement!.parentElement!
      .parentElement as HTMLElement;
    const base = reglaBase(card, "padding")?.replace(/\s+/g, " ");

    /*
     * Lo que este caso protege desde su origen: el recorte lateral en movil
     * (peldano 5) y su restauracion desde md (peldano 7). Lo que ata ademas
     * desde el 2026-09-05: que los terminos LATERALES salgan de `inlineSpace`
     * --la escala acotada al viewport-- y los de BLOQUE de `space`. Se compara
     * contra el token IMPORTADO, nunca contra el rem escrito a mano que habia
     * aqui (regla 38): con el literal, migrar el token dejaba el test en verde
     * describiendo un CSS que ya no existia.
     *
     * VALIDADO CON EL BUG INYECTADO (regla 34), 2026-09-05: devolviendo el
     * termino lateral de ScCard (Journey.tsx) de inlineSpace[5] a space[5],
     * este caso cae en rojo con esta linea literal:
     *
     *   AssertionError: expected '.[hash] {position: relative; overflow:…' to
     *   contain 'padding: 3rem min(1.5rem, 7.5vw) 4rem'
     *
     * Restaurado el token, verde. El hash de la clase va elidido como `[hash]`
     * a proposito: styled-components lo deriva del texto del template, asi que
     * cambia con cada edicion del componente y una cita con el hash de aquel
     * dia (`.RakWU`) queda irreproducible en cuanto alguien toca una linea de
     * CSS. Lo que la cita tiene que fijar es la ASERCION, no el nombre
     * generado.
     */
    expect(base).toContain(
      `padding: ${themes.light.space[7]} ${themes.light.inlineSpace[5]} ${themes.light.space[8]}`,
    );
    expect(
      reglaEnMedia(card, themes.light.breakPoint.md, "padding-inline"),
    ).toContain(`padding-inline: ${themes.light.inlineSpace[7]}`);
  });

  it("critica #15 C 6: la cita clara toma su font-size del token, no del literal", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "Journey.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    // El literal duplicado del token desaparece de la fuente...
    expect(source).not.toMatch(/font-size:\s*1rem/);
    // ...y lo RENDERIZADO es exactamente lo que dice el token. Se asevera
    // contra el token y no contra "1rem": el dia que la escala cambie, este
    // candado tiene que seguir al token -- que es justo lo que se gana al
    // dejar de escribir el numero a mano.
    renderWithProviders(<Journey />);
    const quote = screen.getByText(`“${esHome.Home.journey.quote}”`)
      .parentElement as HTMLElement;
    expect(cssRuleTextFor(quote)).toContain(
      `font-size: ${themes.light.type.scale.body.size};`,
    );
  });
});

/*
 * Critica externa #15 (2026-09-02), hallazgo A P2-1: a 1440x900 en oscuro,
 * `scrollY` ~ 13.100, «El destino no es el infinito. El viaje lo es.» se leia
 * solo como «El destino no», cortada por la cortina de Features. La secuencia
 * completa -- y por que `progress = 1` y «Features empieza a cubrir» son el
 * MISMO instante -- esta en el docblock de `JOURNEY_QUOTE_EXIT_SPAN`
 * (`journey.layers.ts`); la declaracion, en el de `ScJourneyQuote`
 * (`journey.deck.tsx`).
 *
 * Candado de CSSOM: jsdom no hace layout ni evalua `@media` (regla 36), asi que
 * lo observable es el TEXTO de la regla inyectada para ESE elemento, acotado
 * por clase (nunca troceando el stylesheet por "@media", leccion 2026-08-02).
 */
describe("Journey: critica #15 -- la cita de cierre sale antes de que la cortina de Features la tape", () => {
  beforeEach(() => {
    window.localStorage.setItem("vti-theme", "dark");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  async function citaDelDeck(): Promise<HTMLElement> {
    renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(
        screen.getByText(`“${esHome.Home.journey.quote}”`),
      ).toBeInTheDocument();
    });
    // ScQuoteText (span) -> ScJourneyQuote (p), que es quien lleva la rampa.
    return screen.getByText(`“${esHome.Home.journey.quote}”`)
      .parentElement as HTMLElement;
  }

  function reglaBase(el: HTMLElement, prop: string): string | undefined {
    return cssRuleTextFor(el)
      .split("\n")
      .find((line) => !line.includes("@media") && line.includes(prop));
  }

  it("la opacidad es una rampa anclada en --journey-progress = 1, con el tramo derivado", async () => {
    const cita = await citaDelDeck();
    const base = reglaBase(cita, "opacity");

    expect(base).toBeDefined();
    // Anclada en 1: lo que se recorre es lo que FALTA para terminar el deck,
    // que es exactamente cuando arranca la cortina de Features.
    expect(base).toContain("1 - var(--journey-progress, 0)");
    // El divisor es el tramo derivado, no un literal escrito en el CSS.
    expect(base).toContain(`/ ${JOURNEY_QUOTE_EXIT_SPAN}`);
    // Recortada a [0, 1]: sin el clamp, la rampa daria valores de opacidad
    // fuera de rango durante todo el resto del recorrido.
    expect(base).toMatch(/opacity:\s*clamp\(\s*0,/);
  });

  it("sin JS -- o antes del primer frame -- la cita se pinta opaca, nunca invisible", async () => {
    const cita = await citaDelDeck();
    // El valor por defecto de la variable en el propio var() es 0, que la
    // rampa traduce a opacidad 1 (queda el tramo entero por recorrer).
    expect(reglaBase(cita, "opacity")).toContain("var(--journey-progress, 0)");
  });

  it("no declara transition: el reloj de la salida es el scroll, no un segundo reloj", async () => {
    const cita = await citaDelDeck();
    expect(cssRuleTextFor(cita)).not.toContain("transition");
  });

  it("bajo reduce la cita vuelve a opacidad 1 (la variable se queda pegada al desmontarse el deck)", async () => {
    const cita = await citaDelDeck();
    const guard = cssRuleTextFor(cita)
      .split("\n")
      .find(
        (line) =>
          line.includes("prefers-reduced-motion: reduce") &&
          line.includes("opacity"),
      );

    expect(guard).toMatch(/opacity:\s*1/);
  });

  it("el rail NO se desvanece con ella: son botones operables (trampa de foco)", async () => {
    await citaDelDeck();
    const rail = screen.getByRole("group", {
      name: esHome.Home.journey.railLabel,
    });
    const marca = within(rail).getAllByRole("button")[0];

    expect(cssRuleTextFor(marca)).not.toContain("--journey-progress");
  });
});

/*
 * Critica externa #16, decision del dueno: «hacer visible el rotulo del paso
 * activo en el rail», en los DOS decks. Gemelo del describe equivalente de
 * `Story.test.tsx`, con una asercion propia que alli no tiene sentido: aqui el
 * rotulo cuenta las OCHO paradas del rail mientras las diapositivas anuncian
 * "Paso N de 6" (`Home.journey.stepPosition`), asi que el candado de que NO se
 * anuncia protege literalmente el arreglo de la critica #12 -- dos
 * numeraciones desalineadas del mismo mecanismo, con desfase de uno.
 */
describe("Journey: critica #16 -- el rail dice visualmente por donde va el deck", () => {
  const VH = 800;
  const AA = 4.5;

  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    vi.stubGlobal("innerHeight", VH);
    vi.stubGlobal("scrollY", 0);
    vi.stubGlobal("scrollTo", vi.fn());
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  async function railConRotulo(): Promise<{
    track: HTMLElement;
    grupo: HTMLElement;
    rotulo: HTMLElement;
  }> {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    track.getBoundingClientRect = () =>
      ({ top: 0, height: altoDePista(VH) }) as DOMRect;
    const grupo = screen.getByRole("group", {
      name: esHome.Home.journey.railLabel,
    });
    return { track, grupo, rotulo: grupo.querySelector("p") as HTMLElement };
  }

  /*
   * Gemelo del candado de `Story.test.tsx`: los tests de contraste del rótulo
   * miden los TOKENS contra el void de la escena, así que un cambio en la
   * DECLARACIÓN del numerador (`ScJourneyRailStatusCurrent`) no los movía —
   * comprobado en la integración de la ola L: 204 tests en verde con la tinta
   * cambiada a `textMuted` en los dos decks.
   */
  it("el numerador declara su tinta en el CSS, no solo en el token que el test de contraste mide", async () => {
    const { rotulo } = await railConRotulo();
    const numerador = rotulo.querySelector("span") as HTMLElement;

    expect(numerador, "el rotulo no tiene numerador").not.toBeNull();
    expect(cssRuleTextFor(numerador)).toContain(
      `color: ${themes.dark.semantic.text}`,
    );
  });

  it("el rail lleva un rotulo con la parada activa y el total, derivado de JOURNEY_SLIDES", async () => {
    const { rotulo } = await railConRotulo();

    expect(rotulo, "el rail no tiene rotulo de posicion").not.toBeNull();
    expect(rotulo).toHaveTextContent(`1${JOURNEY_SLIDES}`);
  });

  it("el rotulo sigue al index del hook cuando el deck avanza", async () => {
    const { track, rotulo } = await railConRotulo();

    track.getBoundingClientRect = () =>
      ({
        top: -(spanDePista(VH) * 3) / (JOURNEY_SLIDES - 1),
        height: altoDePista(VH),
      }) as DOMRect;
    act(() => triggerFor(track, true));

    expect(rotulo).toHaveTextContent(`4${JOURNEY_SLIDES}`);
  });

  it("el rotulo NO se anuncia: cuenta paradas del rail y las diapositivas cuentan pasos, que es el desfase que la critica #12 retiro", async () => {
    const { grupo, rotulo } = await railConRotulo();

    expect(rotulo).toHaveAttribute("aria-hidden", "true");
    expect(isInaccessible(rotulo)).toBe(true);
    expect(within(grupo).getAllByRole("button")).toHaveLength(JOURNEY_SLIDES);

    // Y la senal de posicion HABLADA sigue donde la dejo la critica #11: en la
    // diapositiva, contando pasos y no paradas. Si alguien le diera voz al
    // rotulo, un lector de pantalla volveria a oir las dos.
    expect(
      screen.getAllByText(
        esHome.Home.journey.stepPosition
          .replace("{{current}}", "1")
          .replace("{{total}}", String(JOURNEY_STEPS.length)),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("el rotulo se apila en columna y usa la escala tipografica del sistema", async () => {
    const { rotulo } = await railConRotulo();
    const css = cssRuleTextFor(rotulo);

    expect(css).toContain("flex-direction: column");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain(`font-size: ${themes.dark.type.scale.caption.size}`);
    expect(css).toContain(`color: ${themes.dark.semantic.textMuted}`);
  });

  it("las dos tintas del rotulo libran AA (4.5:1) sobre el void real del portal", async () => {
    await railConRotulo();

    const numerador = contrastRatioHex(
      themes.dark.semantic.text,
      JOURNEY_PORTAL_VOID,
    );
    const denominador = contrastRatioHex(
      themes.dark.semantic.textMuted,
      JOURNEY_PORTAL_VOID,
    );

    expect(
      numerador,
      `numerador sobre el void: ${numerador.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA);
    expect(
      denominador,
      `denominador sobre el void: ${denominador.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA);
  });
});

/*
 * Critica externa #16, hallazgo L1: el rail flota sobre la copia. Mismo
 * candado, misma suma y mismo motivo que en `Story.test.tsx` -- los dos decks
 * son gemelos declarados y el rail de esta seccion tiene la misma geometria.
 * Lo que se ata es la DERIVACION del canal desde los tokens del rail, no un
 * numero: jsdom no hace layout, asi que la comprobacion de que ninguna caja de
 * glifo cruza la banda se hace en navegador y se reporta con cifras.
 *
 * AMPLIADO EN LA CRITICA EXTERNA #20 (2026-09-05), gemelo del de Story. Los
 * dos sumandos que son AIRE (el inset del rail y el canal libre) pasaron a
 * `inlineSpace`, que deja de crecer cuando el viewport ya no da de si; el del
 * medio, que es el ANCHO REAL de la marca, sigue en `space` porque acotarlo
 * reservaria menos canal del que el rail ocupa. Se ata la ARITMETICA RESUELTA
 * a las dos raices tipograficas. El defecto medido aqui, sobre el build de
 * produccion con la fuente al 200 % (raiz 32 px) y 320 px de viewport: la copia
 * del deck quedaba en 144 px de 320 y la cita de esta seccion, de 80 px, salia
 * en 142,7 px repartidos en 12 lineas.
 */

/** La raiz tipografica de fabrica; el `rem` se resuelve contra ella. */
const RAIZ_POR_DEFECTO_PX = 16;
/** La raiz al 200 %, el techo que exige WCAG 1.4.4 (SC Resize Text). */
const RAIZ_200_PX = 32;
/**
 * Suelo de columna de copia que la ola #20 se fija a 320 px con la fuente al
 * 200 %. No es el ancho que sale de la cuenta (208 px), sino el minimo que la
 * decision acepta.
 */
const COLUMNA_MINIMA_200_PX = 200;

/**
 * Resuelve a pixeles un valor DECLARADO de relleno, con la misma aritmetica que
 * hace el navegador: `min(A rem, B vw)` = `min(A * raiz, B * viewport / 100)`,
 * `calc(a + b + c)` = la suma de sus terminos ya resueltos, y `A rem` =
 * `A * raiz`. jsdom no hace layout y no resuelve ni `min()` ni `vw` ni `calc()`
 * (regla 36). Gemelo del de `Story.test.tsx`, duplicado por el mismo criterio
 * que el resto de los candados de estos dos decks.
 */
function aPx(valor: string, raizPx: number, viewportPx: number): number {
  const texto = valor.trim().replace(/\s+/g, " ");
  if (texto.startsWith("calc(") && texto.endsWith(")")) {
    return texto
      .slice("calc(".length, -1)
      .split(" + ")
      .reduce((suma, termino) => suma + aPx(termino, raizPx, viewportPx), 0);
  }
  const acotado = texto.match(/^min\(([\d.]+)rem, ([\d.]+)vw\)$/);
  if (acotado) {
    return Math.min(
      Number(acotado[1]) * raizPx,
      (Number(acotado[2]) * viewportPx) / 100,
    );
  }
  const rem = texto.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * raizPx;
  throw new Error(`valor de relleno no reconocido: "${valor}"`);
}

/**
 * Valor de UNA propiedad tal y como lo declara la regla BASE del elemento: la
 * que aplica al elemento en si, sin `@media` (esas son `CSSMediaRule`, no
 * `CSSStyleRule`, y caen solas), sin pseudo-elemento y sin estado.
 *
 * El filtro de selector SIMPLE no es celo: la marca del rail dibuja su punto
 * con un `::before` que declara su PROPIO `width` (space[2], el diametro del
 * punto), y styled-components emite ademas una regla por variante de estado
 * (`[data-slide="N"] &`, `:hover`). Falla si no queda exactamente una.
 */
function declaracionBaseDe(el: HTMLElement, propiedad: string): string {
  const classes = Array.from(el.classList);
  const esSelectorSimple = (selectorText: string): boolean =>
    selectorText
      .split(",")
      .every((parte) => /^\s*(?:\.[A-Za-z0-9_-]+)+\s*$/.test(parte));
  const valores = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    })
    .filter((regla): regla is CSSStyleRule => regla instanceof CSSStyleRule)
    .filter((regla) => esSelectorSimple(regla.selectorText))
    .filter((regla) =>
      classes.some((cls) => regla.selectorText.includes(`.${cls}`)),
    )
    .map((regla) => regla.style.getPropertyValue(propiedad))
    .filter((valor) => valor !== "");

  expect(
    valores,
    `se esperaba UNA declaracion base de ${propiedad}, hay ${valores.length}`,
  ).toHaveLength(1);
  return valores[0];
}

describe("Journey: critica #16 -- la copia del deck reserva el canal del rail", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  async function deckOscuro(): Promise<HTMLElement> {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });
    return container.querySelector("[data-slide-index]")!
      .parentElement as HTMLElement;
  }

  it("ScJourneyDeck declara padding-inline-end como la suma del inset del rail, su diana y el canal libre", async () => {
    const deckEl = await deckOscuro();
    const { space, inlineSpace } = themes.dark;

    // Espacios normalizados: styled-components conserva los saltos de linea
    // del template dentro del `calc()`, y lo que se afirma es la SUMA.
    const plano = cssRuleTextFor(deckEl).replace(/\s+/g, " ");
    // El inset del rail y el canal libre ACOTADOS al viewport (critica #20), y
    // entre ellos la diana de la marca, que es ancho real y sigue en `space`.
    expect(plano).toContain(
      `padding-inline-end: calc( ${inlineSpace[5]} + ${space[5]} + ${inlineSpace[2]} )`,
    );
  });

  /*
   * VALIDADO CON BUG INYECTADO (2026-09-05): devolviendo `inset-inline-end` de
   * ScJourneyRail (journey.deck.tsx) a `space[5]` -- es decir, dejando de
   * acotar el inset mientras el canal de ScJourneyDeck si se acota -- este caso
   * cae con esta linea literal:
   *
   *   canal libre a raiz 32 px: reservado 80, banda 96: expected -16 to be 8 // Object.is equality
   *
   * Esos -16 px son el texto metido DENTRO de la banda del rail: el hallazgo
   * L1 otra vez, ahora solo con la fuente al 200 %. Restaurado
   * `inlineSpace[5]`, verde.
   */
  it("la suma reservada cubre la banda del rail mas el canal de 8 px del hallazgo, y no mas -- a las DOS raices tipograficas", async () => {
    // La RELACION que tiene que seguir siendo cierta a cualquier raiz: la copia
    // termina exactamente 8 px antes de la banda del rail. Si el inset del rail
    // dejara de acotarse mientras el canal si lo hace (o al reves), la resta se
    // descuadraria y el texto volveria a meterse debajo del control -- el
    // hallazgo L1 otra vez, ahora solo al 200 % de texto.
    const deck = await deckOscuro();
    const rail = screen.getByRole("group", {
      name: esHome.Home.journey.railLabel,
    });
    const marca = rail.querySelector("button") as HTMLElement;

    const reservadoDeclarado = declaracionBaseDe(deck, "padding-inline-end");
    const insetDeclarado = declaracionBaseDe(rail, "inset-inline-end");
    const anchoDeclarado = declaracionBaseDe(marca, "width");

    for (const raiz of [RAIZ_POR_DEFECTO_PX, RAIZ_200_PX]) {
      const reservado = aPx(reservadoDeclarado, raiz, MIN_VIEWPORT_PX);
      const bandaDelRail =
        aPx(insetDeclarado, raiz, MIN_VIEWPORT_PX) +
        aPx(anchoDeclarado, raiz, MIN_VIEWPORT_PX);

      expect(
        reservado - bandaDelRail,
        `canal libre a raiz ${raiz} px: reservado ${reservado}, banda ${bandaDelRail}`,
      ).toBe(8);
    }

    // Y a la raiz por defecto los numeros absolutos siguen siendo los de la
    // ola L, sin mover un pixel: 24 + 24 de banda, 56 de reserva.
    expect(
      aPx(insetDeclarado, RAIZ_POR_DEFECTO_PX, MIN_VIEWPORT_PX) +
        aPx(anchoDeclarado, RAIZ_POR_DEFECTO_PX, MIN_VIEWPORT_PX),
    ).toBe(48);
    expect(aPx(reservadoDeclarado, RAIZ_POR_DEFECTO_PX, MIN_VIEWPORT_PX)).toBe(
      56,
    );
  });

  /*
   * CRITICA EXTERNA #20 (2026-09-05), el candado ARITMETICO de la ola, gemelo
   * del de `Story.test.tsx`.
   *
   * EL DEFECTO. Con la fuente al 200 % (raiz 32 px) y 320 px de viewport,
   * `padding-inline` y el canal de arriba se doblaban con la fuente mientras el
   * viewport se quedaba donde estaba: 64 px por lado mas 112 px de canal
   * dejaban la copia del deck en 144 px de 320, y la cita de esta seccion salia
   * en 12 lineas. No era perdida de texto -- eso lo cerro la critica #19 con
   * `overflow-wrap: anywhere` -- era ilegibilidad.
   *
   * LO QUE ATA. La columna que queda de verdad, resuelta desde el CSSOM a las
   * dos raices: >= 200 px al 200 % de texto (la cuenta da 208) y exactamente
   * 232 px a la raiz por defecto, que es lo que media antes de esta ola.
   *
   * VALIDADO CON BUG INYECTADO (2026-09-05): devolviendo `padding-inline` de
   * ScJourneyDeck (journey.deck.tsx) a `space[6]` este caso cae con esta linea
   * literal:
   *
   *   columna a raiz 32 px en 320 px de viewport: expected 176 to be greater than or equal to 200
   *
   * 176 px es exactamente el ancho que deja el relleno sin acotar (320 - 64 -
   * 80). Restaurado `inlineSpace[6]`, verde.
   */
  it("critica #20: la columna de copia aguanta el 200 % de texto a 320 px y no se mueve a la raiz por defecto", async () => {
    const deck = await deckOscuro();
    const inicio = declaracionBaseDe(deck, "padding-inline");
    const fin = declaracionBaseDe(deck, "padding-inline-end");

    // `padding-inline` pone los dos lados y `padding-inline-end` pisa el de
    // cierre (longhand despues de shorthand): la columna es el viewport menos
    // el lado de inicio menos el de cierre.
    const columna = (raizPx: number): number =>
      MIN_VIEWPORT_PX -
      aPx(inicio, raizPx, MIN_VIEWPORT_PX) -
      aPx(fin, raizPx, MIN_VIEWPORT_PX);

    expect(
      columna(RAIZ_200_PX),
      `columna a raiz ${RAIZ_200_PX} px en ${MIN_VIEWPORT_PX} px de viewport`,
    ).toBeGreaterThanOrEqual(COLUMNA_MINIMA_200_PX);
    expect(columna(RAIZ_200_PX)).toBe(208);
    expect(
      columna(RAIZ_POR_DEFECTO_PX),
      "la composicion por defecto no puede moverse ni un pixel",
    ).toBe(232);
  });
});

/*
 * Critica externa #16, hallazgo A (decision del dueno del 2026-09-03).
 * Gemelo del candado de `Story.test.tsx`: mismo defecto medido (el arte del
 * deck oscuro no se anunciaba), misma decision y mismas dos mitades atadas
 * -- la composicion gana UN nombre, y ninguna de las seis capas gana el
 * suyo. El razonamiento completo vive alli.
 */
describe("Journey: critica #16 -- el arte del deck oscuro se anuncia como UNA imagen", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("hallazgo A: la escena se expone como imagen con el texto de Home.journey.sceneAlt", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        JOURNEY_SLIDES,
      );
    });

    const escena = screen.getByRole("img", {
      name: esHome.Home.journey.sceneAlt,
    });
    expect(escena).not.toHaveAttribute("aria-hidden");
    expect(escena.querySelectorAll("img")).toHaveLength(
      JOURNEY_PORTAL_LAYERS.length,
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("hallazgo A: ninguna capa del portal gana texto alternativo -- todas siguen con alt vacio bajo aria-hidden", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const capas = Array.from(container.querySelectorAll("img"));

    expect(capas).toHaveLength(JOURNEY_PORTAL_LAYERS.length);
    capas.forEach((capa) => {
      expect(capa.getAttribute("alt")).toBe("");
      expect(capa.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    expect(esHome.Home.journey.sceneAlt).not.toBe(
      esHome.Home.journey.figureAlt,
    );
    expect(enHome.Home.journey.sceneAlt).not.toBe(
      enHome.Home.journey.figureAlt,
    );
  });
});

/*
 * CRITICA EXTERNA #19 (2026-09-04), decision del dueno: UNA SOLA FORMA DE
 * CONTAR, y la misma en las dos secciones.
 *
 * El defecto que cierra este candado, medido en Chrome sobre el build de
 * produccion (tema oscuro, deck detenido en cada parada):
 *
 * | seccion | paradas | numerales visibles por parada          |
 * |---------|---------|----------------------------------------|
 * | Story   | 6       | 2 en la intro y el cierre, 3 en las 4   |
 * |         |         | paradas de pilar ("0N" + "N+1 / 6")     |
 * | Journey | 8       | 2 en las 8 (solo "N / 8")               |
 *
 * En las cuatro paradas de pilar de Story convivian DOS sistemas que contaban
 * cosas distintas -- el badge cuenta pilares (4), el rail cuenta diapositivas
 * (6, intro y cierre incluidos) -- asi que ninguna pareja cuadraba: "01" junto
 * a "2 / 6", "04" junto a "5 / 6". Separacion medida entre las dos cifras:
 * 319 px a 390 de ancho y 1290 px a 1440. Journey, que usa el MISMO chasis,
 * no tenia ese segundo sistema. La misma pieza indicaba la posicion de dos
 * maneras en una seccion y de una en la otra.
 *
 * POR QUE ESTE CANDADO VIVE AQUI Y NO EN Story.test.tsx: la invariante no es
 * de una seccion, es ENTRE las dos, y este es el fichero que ya importa las
 * dos (precedente: el describe de la invariante D5, mas arriba, que compara la
 * cola de la pista de Story con el solape de Journey). Un candado por seccion
 * habria dejado pasar exactamente el defecto que existia: cada mitad era
 * coherente consigo misma.
 *
 * COMO SE DERIVA DEL MODELO, y no de dos listas tecleadas: hay UNA sola
 * funcion (`formaDeContar`) que se ejecuta sobre las dos secciones, y lo que
 * se compara es su salida contra la de la otra y contra las constantes del
 * modelo (`STORY_SLIDES`; `JOURNEY_SLIDES`, que a su vez es
 * `JOURNEY_STEPS.length + 2`). Ninguna cifra esperada se escribe a mano: si
 * manana se anade un pilar o un paso, el candado sigue describiendo la misma
 * propiedad sin tocarlo.
 */
describe("critica #19 -- las dos secciones cuentan de la misma forma (tema oscuro)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  /* Un numeral SUELTO: el texto entero de un elemento hoja es una cifra y
     nada mas. Es la forma exacta que tenian el badge de pilar ("01") y las dos
     mitades del rotulo del rail ("2", "6"). No caza la senal de posicion que
     Journey da a tecnologia asistiva ("Paso 2 de 6", Home.journey.
     stepPosition), que es una frase con palabras -- y es correcto que no la
     cace: ese es el canal ASISTIDO, que este candado no toca. */
  const NUMERAL_SUELTO = /^\d{1,3}$/;

  function numeralesEn(raiz: Element): string[] {
    return Array.from(raiz.querySelectorAll("*"))
      .filter((el) => el.children.length === 0)
      .map((el) => (el.textContent ?? "").trim())
      .filter((texto) => NUMERAL_SUELTO.test(texto));
  }

  /*
   * La MISMA lectura para los dos decks. Devuelve, del deck ya renderizado:
   * las cifras del rotulo del rail, los numerales que aparecen en cualquier
   * otro sitio del deck, y las diapositivas de CONTENIDO (las de en medio: ni
   * la intro ni el cierre), que son las que en Story llevaban badge.
   */
  function formaDeContar(
    stage: HTMLElement,
    grupoDelRail: HTMLElement,
  ): {
    cifrasDelRotulo: string[];
    numeralesFueraDelRotulo: string[];
    numeralesPorDiapositivaDeContenido: string[][];
  } {
    const rotulo = grupoDelRail.querySelector("p") as HTMLElement;
    const cifra = (el: Element): string => (el.textContent ?? "").trim();
    const numerales = Array.from(stage.querySelectorAll("*"))
      .filter((el) => el.children.length === 0)
      .filter((el) => NUMERAL_SUELTO.test(cifra(el)));
    const diapositivas = Array.from(
      stage.querySelectorAll("[data-slide-index]"),
    );

    return {
      cifrasDelRotulo: numerales.filter((el) => rotulo.contains(el)).map(cifra),
      numeralesFueraDelRotulo: numerales
        .filter((el) => !rotulo.contains(el))
        .map(cifra),
      numeralesPorDiapositivaDeContenido: diapositivas
        .slice(1, -1)
        .map((diapositiva) => numeralesEn(diapositiva)),
    };
  }

  async function leerDeck(
    seccion: React.ReactElement,
    rotuloDelRail: string,
    diapositivas: number,
  ): Promise<ReturnType<typeof formaDeContar> & { unmount: () => void }> {
    const { container, unmount } = renderWithProviders(seccion);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        diapositivas,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const grupo = within(container).getByRole("group", {
      name: rotuloDelRail,
    });
    return { ...formaDeContar(stage, grupo), unmount };
  }

  const leerStory = () =>
    leerDeck(<Story />, esHome.Home.story.railLabel, STORY_SLIDES);
  const leerJourney = () =>
    leerDeck(<Journey />, esHome.Home.journey.railLabel, JOURNEY_SLIDES);

  it("ningun deck pinta una segunda cuenta: la fraccion del rail es el unico numeral visible de los dos", async () => {
    const story = await leerStory();
    story.unmount();
    const journey = await leerJourney();

    // La comparacion que ata las DOS secciones a la misma forma, sin escribir
    // ninguna cifra: lo que se exige es que la lectura de una sea la de la
    // otra. Con el badge de pilar puesto, Story trae cuatro numerales aqui y
    // Journey ninguno.
    expect(story.numeralesFueraDelRotulo).toEqual(
      journey.numeralesFueraDelRotulo,
    );
    expect(story.cifrasDelRotulo).toHaveLength(journey.cifrasDelRotulo.length);

    // Y el ancla absoluta, para que la igualdad de arriba no se pueda cumplir
    // "empatando en malo" (las dos secciones con dos cuentas cada una).
    expect(story.numeralesFueraDelRotulo).toEqual([]);
    expect(journey.numeralesFueraDelRotulo).toEqual([]);
  });

  it("la unica cuenta de cada deck es la parada actual sobre su total, y el total sale del modelo", async () => {
    const story = await leerStory();
    story.unmount();
    const journey = await leerJourney();

    // En reposo el deck arranca en la primera parada. El total NO se teclea:
    // sale de la constante que gobierna el propio deck, y la de Journey es a
    // su vez JOURNEY_STEPS.length + 2.
    expect(story.cifrasDelRotulo).toEqual(["1", String(STORY_SLIDES)]);
    expect(journey.cifrasDelRotulo).toEqual(["1", String(JOURNEY_SLIDES)]);
    expect(JOURNEY_SLIDES).toBe(JOURNEY_STEPS.length + 2);
  });

  it("ninguna diapositiva de contenido de ninguna de las dos secciones lleva numeral propio", async () => {
    const story = await leerStory();
    story.unmount();
    const journey = await leerJourney();

    // Cuantas hay se deriva del modelo: las de en medio, ni intro ni cierre.
    expect(story.numeralesPorDiapositivaDeContenido).toHaveLength(
      STORY_SLIDES - 2,
    );
    expect(journey.numeralesPorDiapositivaDeContenido).toHaveLength(
      JOURNEY_STEPS.length,
    );

    [
      ...story.numeralesPorDiapositivaDeContenido,
      ...journey.numeralesPorDiapositivaDeContenido,
    ].forEach((numerales) => {
      expect(numerales).toEqual([]);
    });
  });

  /*
   * SONDA DE NO-VACUIDAD. Las tres aserciones de arriba comparan listas
   * vacias: si `formaDeContar` fuera ciega -- un selector que no encuentra
   * nada, un filtro que descarta de mas -- seguirian en verde para siempre.
   * Esta sonda mete a mano en una diapositiva de pilar el MISMO elemento que
   * la critica retiro (un span cuyo texto entero es "01") y comprueba que la
   * lectura lo ve. Si algun dia esta sonda se pusiera en verde sin numeral, o
   * en rojo con el, los tres candados de arriba habrian dejado de proteger
   * nada.
   */
  it("la lectura VE un numeral fuera del rotulo: la sonda no es vacua", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const grupo = within(container).getByRole("group", {
      name: esHome.Home.story.railLabel,
    });
    const pilar = stage.querySelector('[data-slide-index="1"]') as HTMLElement;

    expect(formaDeContar(stage, grupo).numeralesFueraDelRotulo).toEqual([]);

    const intruso = document.createElement("span");
    intruso.textContent = "01";
    pilar.prepend(intruso);

    const conIntruso = formaDeContar(stage, grupo);
    expect(conIntruso.numeralesFueraDelRotulo).toEqual(["01"]);
    expect(conIntruso.numeralesPorDiapositivaDeContenido[0]).toEqual(["01"]);

    intruso.remove();
    expect(formaDeContar(stage, grupo).numeralesFueraDelRotulo).toEqual([]);
  });
});
