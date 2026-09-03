import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, isInaccessible } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import esCommon from "@/i18n/locales/es/common.json";
import i18n from "@/i18n/config";
import { links } from "@/config/links";
import { Story, pillarAccent, pillarBadgeAccent } from "./Story";
import { DECK, PRESS, REVEAL } from "@/motion/vocabulary";
import { motion } from "@/theme/tokens/motion";
import {
  contrastRatio,
  contrastRatioHex,
  relativeLuminance,
  relativeLuminanceHex,
} from "@/theme/tokens/contrast";
import { basicLightTheme, basicDarkTheme } from "@/theme/themes";
import {
  STORY_DARK_HEIGHT,
  STORY_DARK_MAX_WIDTH,
  STORY_DECK_NOTE_SIZE,
  STORY_DECK_PILLAR_TITLE_SIZE,
  STORY_DECK_TAIL_SCREENS,
  STORY_DECK_TITLE_SIZE,
  STORY_FIGURE_SCROLL_SHIFT,
  STORY_PILLAR_NUMBER_COLUMN,
  STORY_SLIDES,
} from "./story.layers";
import { STORY_COSMIC_BEING_VOID } from "@/components/scenes/storyCosmicBeing/storyCosmicBeing.layers";

import { DECK_SLIDE_TRAVEL_SCREENS } from "@/hooks/useSlideDeck";
/*
 * Reescritura completa (spec 2026-07-28, D3/D4): Story ya no es una
 * superficie siempre oscura con ThemeProvider/SceneLoader/costura propios --
 * es una sección de tema ambiental corriente que solo se monta en claro
 * (gate `HomeSections`, fuera de esta propiedad). Los tests viejos (contraste
 * forzado contra el póster de Three.js, costura negra, no-rerender bajo
 * scroll de `useScrollProgress`) describían un componente que ya no existe;
 * se sustituyen por los que sí describen el nuevo: título accesible,
 * copia real de i18n, figura con srcset de dos pistas, reveal por
 * intersección y el guard de reduced-motion (atado por CSS inyectado, no por
 * `getComputedStyle` -- jsdom no evalúa `@media`, lección 2026-07-27).
 */

/*
 * Story en tema CLARO monta TRES IntersectionObserver a la vez: `useReveal`
 * (sobre `ScGrid`), `useSectionProgress` (sobre `ScStory`, el desplazamiento
 * de scroll de la figura -- D1, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`) y,
 * desde la spec `2026-08-07-story-statement-scroll-observer-design.md` (D3),
 * un segundo `useReveal` sobre el PARRAFO del statement. Ya eran tres antes
 * de esta entrega -- el tercero era el observer INTERNO de `useSlideDeck`,
 * que guarda su propio motor de medicion (ver su docblock) -- asi que este
 * comentario decia DOS y se quedaba corto desde el 2026-08-06. Un `trigger` global
 * sin ambito (que solo guardara el callback de la ULTIMA instancia creada)
 * dispararia el incorrecto en cuanto conviven dos observers en el mismo
 * render (mismo hallazgo, mismo mecanismo, que ya documenta Journey.test.tsx
 * para su propia pareja `useReveal`/`useSlideDeck`). `ioTargets` registra el
 * elemento observado por CADA instancia, y `triggerFor` dispara la que
 * observa el elemento pedido.
 */
let ioTargets: { target: Element; emit: (isIntersecting: boolean) => void }[];

function triggerFor(target: Element, isIntersecting: boolean): void {
  const instance = ioTargets.find((entry) => entry.target === target);
  if (!instance) {
    throw new Error("Ningun IntersectionObserver observa ese elemento");
  }
  instance.emit(isIntersecting);
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
      disconnect(): void {}
    },
  );
  // useSectionProgress (D1) llama a window.matchMedia sin condicion en su
  // efecto de montaje -- sin este stub, CUALQUIER render de Story (tambien
  // en claro) lanzaria "matchMedia is not a function" (jsdom no lo
  // implementa, vease Aura.test.tsx). `stubMatchMedia()` esta declarada mas
  // abajo en este fichero (function hoisted): matches:false en los dos
  // temas, "el usuario no pidio reduced motion", que es el caso que la
  // mayoria de tests quiere ejercitar.
  stubMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * (lección 2026-07-27: jsdom no evalúa NINGÚN `@media`, así que un guard de
 * `prefers-reduced-motion` solo se puede atar inspeccionando el TEXTO de la
 * regla, nunca con `getComputedStyle`).
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
 * `selectorText` REAL (CSSOM, no texto libre) de la regla `data-revealed`
 * que aplica a un elemento -- distingue lo que `cssRuleTextFor` no puede: el
 * selector DESCENDIENTE `[data-revealed="true"] &` compila a
 * `[data-revealed="true"] .sc-xxxx` (el atributo primero, un ESPACIO, la
 * clase despues); el calificado `&[data-revealed="true"]` (el bug que la
 * leccion §5.1 del manual global prohibe) compila a
 * `.sc-xxxx[data-revealed="true"]` (la clase primero, SIN espacio). Las dos
 * cadenas contienen el mismo substring `[data-revealed="true"]`, asi que
 * buscarlo por texto libre (como hace `cssRuleTextFor`) no diferencia una
 * forma de la otra -- de ahi que este helper lea `selectorText` de la regla
 * concreta en vez de su `cssText` completo.
 */
function revealedSelectorTextFor(el: HTMLElement): string {
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
        selector.includes('[data-revealed="true"]') &&
        classes.some((cls) => selector.includes(`.${cls}`))
      );
    });
  if (!rule) {
    throw new Error("Ninguna regla data-revealed aplica a este elemento");
  }
  return (rule as CSSStyleRule).selectorText;
}

/**
 * Regla CSS real (CSSOM, `CSSStyleRule`, no texto libre) que aplica a un
 * elemento y cuyo `selectorText` cumple `matches` -- mismo criterio que
 * `revealedSelectorTextFor`, generalizado para poder pedir `.style.<prop>`
 * (que SI resuelve el valor declarado de una propiedad concreta, a
 * diferencia de buscar una subcadena en `cssText`, que no distingue "esta
 * declaracion pertenece a ESTA regla" de "aparece en cualquier parte del
 * bloque concatenado"). Lo uso el candado de A1 (fix wave A) para leer
 * `visibility` del reposo de `ScSlide`; hoy lo usa su sustituto (describe
 * "critica #10") para leer la COMPUERTA del enlace del cierre
 * (`ScDeckNoteLink`) en su regla `[data-state]:not(...)`, sin ambiguedad de
 * cual declaracion es cual.
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

/**
 * Alto simulado de la pista del deck, con la MISMA aritmetica que declara
 * `STORY_DECK_TRACK_HEIGHT` (`story.layers.ts`): los huecos entre
 * diapositivas por el recorrido de cada una, mas la pantalla del stage
 * pegado, mas la cola de hold. Los tests fabrican la geometria con
 * `getBoundingClientRect` porque jsdom no hace layout, y esa geometria
 * fabricada solo prueba algo si describe la pista REAL -- hasta la critica
 * externa #16 la escribian como `(STORY_SLIDES + cola) * vh`, que era
 * exactamente la formula de entonces.
 *
 * Se deriva de las constantes, nunca de un numero: un literal aqui se
 * desincronizaria en silencio el dia que cambie el recorrido o el reparto
 * (regla 39 de `RULES.md`).
 */
function altoDePista(vh: number): number {
  return (
    (STORY_SLIDES - 1) * DECK_SLIDE_TRAVEL_SCREENS * vh +
    (1 + STORY_DECK_TAIL_SCREENS) * vh
  );
}

/** Recorrido que `useSlideDeck` reparte entre las diapositivas de esa pista. */
function spanDePista(vh: number): number {
  return altoDePista(vh) - vh - STORY_DECK_TAIL_SCREENS * vh;
}

describe("Story", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    // Misma lección que ya documentaba este archivo: buscar por el NOMBRE
    // real (i18n), no solo comprobar que existe una region cualquiera.
    renderWithProviders(<Story />);
    // El titulo real trae un <br/> entre "titleLead" y "titleAccent"
    // (mockup L78): la forma robusta de verificar el nombre REAL, sin
    // acoplarse a como el navegador concatena texto alrededor de un salto de
    // linea, es comprobar que el nombre accesible contiene las DOS mitades.
    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.story.titleLead) &&
        accessibleName.includes(esHome.Home.story.titleAccent),
    });
    expect(region).toHaveAccessibleName();
    expect(region).toHaveAttribute("id", "story");
  });

  it("tiene un h2 (jerarquia correcta bajo el h1 del hero) y ningun h1 propio", () => {
    const { container } = renderWithProviders(<Story />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("el kicker y los cuatro pilares muestran el texto REAL de i18n, no uno inventado", () => {
    renderWithProviders(<Story />);
    expect(screen.getByText(esHome.Home.story.kicker)).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.learn.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.learn.body),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.create.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.grow.title),
    ).toBeInTheDocument();
    // Cuarto pilar (2026-07-28): "ponerlo en practica", humanizado -- no
    // esta en el mockup original, se anadio a peticion del usuario.
    expect(
      screen.getByText(esHome.Home.story.pillars.practice.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.practice.body),
    ).toBeInTheDocument();
    // La numeracion "01".."04" es del componente, no de i18n (spec §7.1): se
    // comprueba aparte, sin acoplarla a una clave de json. Deja de llevar el
    // guion "-- " que tenia como fila de lista (spec 2026-08-06, D2/D10): el
    // numero es ahora decorativo (aria-hidden) dentro del badge de cada
    // tarjeta -- ver el describe "tarjetas de pilar" mas abajo para el
    // detalle completo de la nueva estructura.
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });

  /*
   * Task 14 (plan premium F3, 2026-08-11): `Home.hero.support` ("Aunque el
   * infinito...") SALE del hero y aterriza aqui, renombrada a
   * `Home.story.support` -- misma clave para las dos ramas de tema, sin
   * duplicar el string (Story() delega en StoryLight/StoryDeckDark, pero la
   * clave i18n es UNA). Reutiliza ScBody (via ScSupportLead): mismo
   * componente base, testid propio para localizarlo sin depender de
   * coincidencias de texto.
   *
   * FIX DE REVISION: la primera entrega dejaba el parrafo DESPUES del
   * cuerpo -- lectura equivocada del brief, que pide literalmente "antes del
   * primer contenido actual de Story". Este test queda como el candado
   * INVERSO al original: afirma que el parrafo PRECEDE al eyebrow (el primer
   * contenido real de la rama clara), no que lo sigue.
   */
  it("el parrafo movido desde el hero (Home.story.support) aparece ANTES del primer contenido de la apertura", () => {
    const { container } = renderWithProviders(<Story />);
    const eyebrow = screen.getByText(esHome.Home.story.kicker);
    const parrafo = screen.getByTestId("story-support");

    expect(parrafo).toHaveTextContent(esHome.Home.story.support);
    expect(parrafo.tagName).toBe("P");
    // Orden del DOM: el parrafo trasladado va ANTES del eyebrow/kicker --
    // literal del brief ("antes del primer contenido actual de Story"), no
    // despues de el ni del cuerpo.
    expect(
      Boolean(
        parrafo.compareDocumentPosition(eyebrow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    // No queda ningun eco de la clave vieja: Home.hero.support ya no existe
    // (ver locales.test.ts), asi que este texto solo puede venir de la clave
    // nueva.
    expect(
      container.querySelectorAll('[data-testid="story-support"]'),
    ).toHaveLength(1);
  });

  it("en ingles el parrafo trasladado tambien sale del locale ingles", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Story />);
      expect(screen.getByTestId("story-support")).toHaveTextContent(
        enHome.Home.story.support,
      );
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  it("en ingles renderiza la copia inglesa, no la espanola (mitad del contrato de paridad)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Story />);
      expect(screen.getByText(enHome.Home.story.kicker)).toBeInTheDocument();
      expect(
        screen.getByText(enHome.Home.story.pillars.create.body),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(esHome.Home.story.kicker),
      ).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  it("la figura lleva alt de i18n y srcset con las dos pistas publicadas", () => {
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);

    expect(figure).toHaveAttribute("loading", "lazy");
    expect(figure).toHaveAttribute("decoding", "async");
    const srcSet = figure.getAttribute("srcset") ?? "";
    // Intercambio manual 2026-07-28: Story pasa a usar journey-presenting-*
    // (la figura originalmente generada para Journey); el alt de i18n queda
    // desalineado con el contenido real de la imagen -- señalado al usuario.
    expect(srcSet).toContain("/figures/journey-presenting-640.webp 640w");
    expect(srcSet).toContain("/figures/journey-presenting-1024.webp 1024w");
  });

  it("revela el contenido al intersectar (false -> true)", () => {
    const { container } = renderWithProviders(<Story />);
    const grid = container.querySelector("[data-revealed]") as HTMLElement;

    expect(grid).toHaveAttribute("data-revealed", "false");
    // triggerFor(grid, ...), no el `trigger` global sin ambito: desde D1
    // (useSectionProgress sobre ScStory) hay UN SEGUNDO IntersectionObserver
    // vivo a la vez que el de useReveal, y `trigger` a secas dispararia el
    // ULTIMO construido -- no necesariamente el de useReveal (ver comentario
    // de ioTargets, arriba).
    act(() => triggerFor(grid, true));
    expect(grid).toHaveAttribute("data-revealed", "true");
  });

  it("bajo prefers-reduced-motion el reveal queda forzado a su estado final, sin transicion", () => {
    // Ata el guard por TEXTO del CSS inyectado (jsdom no evalua @media). Este
    // caso se validó con el bug inyectado a proposito: quitando este bloque
    // de `Story.tsx` el assert de abajo falla (ver Registro/lecciones); se
    // restauro para dejar la suite en verde.
    const { container } = renderWithProviders(<Story />);
    const grid = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(grid);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("opacity: 1");
    expect(reduceBlock).toContain("transform: none");
  });

  it("la flotacion de la figura solo corre bajo no-preference (apagada bajo reduce por construccion)", () => {
    // Patron ya usado por `ctaGlowPulse` en Hero.tsx: la animacion se declara
    // UNICAMENTE dentro de `@media (prefers-reduced-motion: no-preference)`,
    // asi que bajo `reduce` queda apagada sin necesitar un bloque `reduce`
    // explicito (no hay animacion incondicional que anular).
    //
    // Hasta la segunda ronda de esta entrega (D12, spec 2026-08-06) este test
    // tambien cubria la tarjeta flotante de nota, retirada junto con su
    // propia flotacion (STORY_CARD_FLOAT_MS): el statement que la sustituye
    // (ScStatement) no flota, solo revela con opacidad/transform (cubierto
    // en el describe "Story: statement a pantalla completa (D12)", mas
    // abajo) -- se acota este test a la unica pieza que sigue flotando.
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);

    const css = cssRuleTextFor(figure);
    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("animation:");
    // La declaracion de nivel superior (fuera de cualquier @media) NO debe
    // traer ya una animacion incondicional -- si la trajera, "apagada bajo
    // reduce" seria falso: la unica forma de que quede apagada bajo
    // reduce es que la animacion viva EXCLUSIVAMENTE dentro del bloque
    // no-preference.
    const topLevelRule = css.split("@media")[0];
    expect(topLevelRule).not.toContain("animation:");
  });
});

/*
 * Tarjetas de pilar (spec 2026-08-06-story-features-tema-claro-design.md,
 * D2/D3/D4/D9/D10): los cuatro pilares dejan de ser filas de lista
 * (`ScPillarRow`, con el número suelto y sin tarjeta) y pasan a tarjeta, con el
 * párrafo de inspiración (`Home.story.pillars.<key>.inspiration`) que hasta
 * esta entrega SOLO consumía la rama oscura (Story.tsx, antes del cambio).
 */
describe("Story: tarjetas de pilar (tema claro, D2)", () => {
  const pillarKeys = ["learn", "create", "grow", "practice"] as const;

  it("renderiza 4 tarjetas con numero, titulo, body e inspiration", () => {
    // Contra el código ANTERIOR a esta entrega este test falla: la rama
    // clara no consumía `inspiration` en absoluto (solo lo hacía
    // `ScDeckPillarBody` en la rama oscura) -- comprobado revirtiendo
    // temporalmente `ScCardInspiration`/`pillars` a la versión de fila
    // antes de escribir este test (ver el informe de la entrega).
    renderWithProviders(<Story />);

    pillarKeys.forEach((key, i) => {
      const number = String(i + 1).padStart(2, "0");
      expect(screen.getByText(number)).toBeInTheDocument();
      expect(
        screen.getByText(esHome.Home.story.pillars[key].title),
      ).toBeInTheDocument();
      expect(
        screen.getByText(esHome.Home.story.pillars[key].body),
      ).toBeInTheDocument();
      expect(
        screen.getByText(esHome.Home.story.pillars[key].inspiration),
      ).toBeInTheDocument();
    });
  });

  /*
   * Task 15 (numeracion honesta, 2026-08-11): la etiqueta "Paso"/"Step" que
   * acompanaba al numero de cada tarjeta se retira, y con ella la clave
   * `Home.story.stepLabel` de los dos locales. Los cuatro pilares no son
   * pasos: son cuatro maneras simultaneas de mirar lo mismo, y numerarlas
   * como "Paso 01..04" prometia una secuencia que no existe. La unica
   * numeracion honesta del sitio es la de Journey, que si es una secuencia
   * real y que esta tarea no toca. El candado que impide que la clave vuelva
   * a aparecer vive en `locales.test.ts` (describe "claves retiradas").
   */
  it("Task 15: ninguna tarjeta se presenta como un PASO", () => {
    renderWithProviders(<Story />);
    expect(screen.queryByText(/^Paso$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Step$/i)).not.toBeInTheDocument();
  });

  it("los numeros del badge son aria-hidden y no ensucian el texto del titulo", () => {
    renderWithProviders(<Story />);

    ["01", "02", "03", "04"].forEach((number) => {
      expect(screen.getByText(number)).toHaveAttribute("aria-hidden", "true");
    });

    // El titulo vive en un elemento PROPIO, separado del badge: su propio
    // textContent es EXACTAMENTE el texto de i18n, sin el numero mezclado --
    // no hay forma de que un lector de pantalla lo anuncie junto al titulo.
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    expect(title.textContent).toBe(esHome.Home.story.pillars.learn.title);
  });

  it("D3: la tarjeta declara el hover (transform/box-shadow), con guard de reduce que anula solo el transform", () => {
    renderWithProviders(<Story />);
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    const card = title.parentElement as HTMLElement; // ScPillarCard
    const css = cssRuleTextFor(card);

    expect(css).toContain(":hover");
    const hoverBlock = css.slice(css.indexOf(":hover"));
    expect(hoverBlock).toContain("transform: translateY(-3px)");

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transform: none");
  });

  /*
   * Task 9 (craft de interacción): ScPillarCard gana
   * :active { transform: scale(...) } (vocabulary.PRESS), y el hover-lift
   * pasa a guardarse tras PRESS.hoverGuard (mueve, translateY) y a compartir
   * su duración/curva con el press. Validado con el bug inyectado a
   * propósito (ver informe de la tarea, tabla ScPillarCard): comentando
   * temporalmente cada bloque en Story.tsx el test correspondiente se pone
   * en rojo; restaurado, vuelve a verde.
   */
  it("Task 9: ScPillarCard declara :active con transform: scale(PRESS.activeScale), y el hover-lift vive dentro de PRESS.hoverGuard", () => {
    renderWithProviders(<Story />);
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    const card = title.parentElement as HTMLElement; // ScPillarCard
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
   * Task 19 (punto 2 del brief, "unificar transition de hover base->fast"):
   * box-shadow de ScPillarCard pasa de motion.duration.base (200ms) a
   * motion.duration.fast (100ms) -- Task 9 ya había migrado el transform a
   * PRESS.durationMs (100ms) pero dejó box-shadow deliberadamente en base.
   * Validado con el bug inyectado a propósito (ver informe de la tarea):
   * revirtiendo temporalmente esa duración a motion.duration.base en
   * Story.tsx, este test se puso en rojo; restaurado, volvió a verde.
   */
  it("Task 19: box-shadow de ScPillarCard usa motion.duration.fast (no duration.base)", () => {
    renderWithProviders(<Story />);
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    const card = title.parentElement as HTMLElement; // ScPillarCard
    const css = cssRuleTextFor(card);

    expect(css).toContain(`box-shadow ${motion.duration.fast}`);
    expect(css).not.toContain(`box-shadow ${motion.duration.base}`);
  });

  /*
   * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
   * con el bug inyectado a propósito (ver informe de la tarea): comentando
   * temporalmente `touch-action: manipulation;` de ScPillarCard en
   * Story.tsx, este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: ScPillarCard declara touch-action: manipulation", () => {
    renderWithProviders(<Story />);
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    const card = title.parentElement as HTMLElement; // ScPillarCard
    const css = cssRuleTextFor(card);
    expect(css).toContain("touch-action: manipulation");
  });

  /*
   * Task 13, punto 2 del brief: communityLinkStyles (compartido por
   * ScStatementLink/ScDeckNoteLink) declara touch-action, un único punto de
   * declaración para las dos ramas. Validado con el bug inyectado a
   * propósito (ver informe de la tarea): comentando temporalmente
   * `touch-action: manipulation;` de communityLinkStyles en Story.tsx, este
   * test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: el enlace de Discord del cierre (communityLinkStyles) declara touch-action: manipulation", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;
    const link = within(statement).getByRole("link", {
      name: `${esHome.Home.story.communityLink} ${esCommon.Common.Nav.newTab}`,
    });
    const css = cssRuleTextFor(link);
    expect(css).toContain("touch-action: manipulation");
  });

  it("D9: el escalonado de entrada de cada tarjeta anula transicion Y retardo bajo prefers-reduced-motion", () => {
    // Verificado con el bug quitado a proposito: sin el bloque
    // `@media (prefers-reduced-motion: reduce) { transition-delay: 0ms; }`
    // de `ScPillarCardItem` (Story.tsx), este assert se pone en rojo (la
    // cuarta tarjeta seguiria esperando 380ms invisible bajo reduce, ver el
    // informe de la entrega).
    renderWithProviders(<Story />);
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    // title (p) -> ScPillarCard (padre directo) -> ScPillarCardItem (envoltorio
    // de entrada, el que lleva la cascada -- ver su docblock en Story.tsx).
    const cardItem = title.parentElement?.parentElement as HTMLElement;
    const css = cssRuleTextFor(cardItem);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transition-delay: 0ms");
    expect(reduceBlock).toContain("opacity: 1");
    expect(reduceBlock).toContain("transform: none");
  });
});

/*
 * Contraste AA (contrato §3 de la spec): mismo cálculo OKLCH -> sRGB ->
 * luminancia que ya resuelven `contrast.test.ts`/`legalPage.contrast.test.ts`
 * (reutilizado, no reimplementado). Los tres niveles de texto de la tarjeta
 * son roles semánticos YA existentes (`text`/`textMuted`/`textSubtle`), así
 * que la aserción es la misma de `contrast.test.ts` acotada a `surface`
 * -- pero con test PROPIO, porque la afirmación de accesibilidad de esta
 * entrega es sobre la TARJETA concreta, no sobre el sistema de tokens en
 * abstracto.
 */
describe("Story: contraste AA de las tarjetas de pilar sobre semantic.surface (D2/§3)", () => {
  it.each([
    ["titulo (Typography h5, color por defecto)", "text"],
    ["lead / body", "textMuted"],
    ["inspiracion", "textSubtle"],
  ] as const)("%s sobre surface >= 4.5:1", (_label, semanticKey) => {
    const ratio = contrastRatio(
      basicLightTheme.semantic[semanticKey],
      basicLightTheme.semantic.surface,
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * El número del badge sobre SU PROPIO fondo, que no es `surface` a secas
   * sino `color-mix(in oklab, <acento> 12%, surface)`. Este candado es el que
   * obligó a separar `pillarBadgeColor` de `pillarColor` (ver su docblock en
   * `Story.tsx`): con los acentos originales, TRES de los cuatro pilares se
   * quedaban entre 2.06:1 y 3.05:1.
   *
   * jsdom no resuelve `color-mix()`, así que la mezcla se calcula aquí con
   * la misma aritmética que declara la función CSS -- interpolación lineal
   * componente a componente en el espacio indicado, con el peso del
   * porcentaje. Se mide contra los TOKENS importados, nunca contra literales
   * copiados: si la rampa de color se recalibra, este test lo acusa.
   */
  const BADGE_MIX_PERCENT = 12;

  function mixWithSurface(accent: string, percent: number): string {
    const parse = (value: string): [number, number, number] => {
      const m = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
      if (!m) throw new Error(`no se pudo parsear el color: ${value}`);
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    const a = parse(accent);
    const b = parse(basicLightTheme.semantic.surface);
    const w = percent / 100;
    const mixed = a.map((component, i) => component * w + b[i] * (1 - w));
    return `oklch(${mixed[0]} ${mixed[1]} ${mixed[2]})`;
  }

  it.each([
    ["01 learn", 0],
    ["02 create", 1],
    ["03 grow", 2],
    ["04 practice", 3],
  ] as const)(
    "el numero del badge %s libra AA sobre su fondo color-mix",
    (_label, index) => {
      const accent = pillarBadgeAccent(basicLightTheme.palette, index);
      const ratio = contrastRatio(
        accent,
        mixWithSurface(accent, BADGE_MIX_PERCENT),
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
});

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, 2026-08-09):
 * `ScAccent`/`ScStatementThird` pasan de degradado de texto
 * (`background-clip: text`) a color solido (`semantic.brandText`) -- ver el
 * docblock de `ScAccent`, Story.tsx, para el porque completo. `ScAccent` se
 * renderiza en las DOS ramas (StoryLight, dentro de `ScTitle`; StoryDeckDark,
 * dentro de `ScDeckTitle`): las dos se miden. `ScStatementThird` (que
 * EXTIENDE `ScAccent`) solo vive en la rama clara.
 */
describe("Story: Task 12, ScAccent/ScStatementThird pasan a color solido", () => {
  it("rama clara: el termino de titulo (ScAccent) resuelve semantic.brandText, sin background-clip", () => {
    renderWithProviders(<Story />);
    const accent = screen.getByText(esHome.Home.story.titleAccent);

    expect(getComputedStyle(accent).color).toBe(
      basicLightTheme.semantic.brandText,
    );
    const css = cssRuleTextFor(accent);
    expect(css).not.toContain("background-clip");
    expect(css).not.toContain("color: transparent");
  });

  it("rama clara: la tercera linea del statement (ScStatementThird) resuelve el MISMO semantic.brandText que ScAccent", () => {
    renderWithProviders(<Story />);
    const third = screen.getByText(esHome.Home.story.statement.third);

    expect(getComputedStyle(third).color).toBe(
      basicLightTheme.semantic.brandText,
    );
  });

  it("rama oscura: el termino de titulo (ScAccent, dentro de ScDeckTitle) resuelve semantic.brandText, sin background-clip", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      renderWithProviders(<Story />);
      await waitFor(() => {
        expect(
          screen.getByText(esHome.Home.story.titleAccent),
        ).toBeInTheDocument();
      });
      const accent = screen.getByText(esHome.Home.story.titleAccent);

      expect(getComputedStyle(accent).color).toBe(
        basicDarkTheme.semantic.brandText,
      );
      const css = cssRuleTextFor(accent);
      expect(css).not.toContain("background-clip");
    } finally {
      window.localStorage.clear();
    }
  });

  /*
   * Medicion de contraste AA (cierra el hueco que senalo la auditoria: "6
   * piezas color:transparent fuera del alcance de contrast.ts"). Rama clara
   * contra `semantic.bg` (la pagina, unico fondo real de `ScStory` cuando
   * `$fullBleed` es false); rama oscura contra `STORY_COSMIC_BEING_VOID` (el
   * void de la escena, hex -- jsdom no compone las capas WebP reales, asi que
   * es el suelo medible por codigo, no el pixel final compuesto).
   * `contrastRatioHex` es la extension de `contrast.ts` que esta MISMA tarea
   * le hizo (ver `contrast.test.ts`) para poder medir contra un literal hex.
   */
  it("brandText sobre semantic.bg (rama clara) y sobre STORY_COSMIC_BEING_VOID (rama oscura) libran AA (medido: 5.59:1 y 13.55:1)", () => {
    const ratioLight = contrastRatio(
      basicLightTheme.semantic.brandText,
      basicLightTheme.semantic.bg,
    );
    expect(
      ratioLight,
      `contraste ${ratioLight.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);

    const ratioDark = contrastRatioHex(
      basicDarkTheme.semantic.brandText,
      STORY_COSMIC_BEING_VOID,
    );
    expect(
      ratioDark,
      `contraste ${ratioDark.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * Bug inyectado a proposito (regla 34), documentado en el informe de la
   * tarea: revertir `ScAccent` (Story.tsx) a
   * `color: theme.data.semantic.text` (en vez de `brandText`) pone en rojo
   * el primer test de este describe (`getComputedStyle(...).color` deja de
   * coincidir con `basicLightTheme.semantic.brandText`); restaurado, vuelve
   * a verde.
   */
});

/*
 * D1 (movimiento ligado al progreso de scroll) y D7 (lenguaje de entrada
 * unificado), spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`.
 * Mismas advertencias de jsdom que el resto de este archivo: `calc(var())`
 * en `transform` NO se resuelve a un valor numerico por `getComputedStyle`
 * (jsdom devuelve el texto de la declaracion tal cual, sin evaluar `calc`/
 * `var` -- comprobado con una sonda desechable antes de escribir este
 * bloque), asi que el desplazamiento de scroll se ata por TEXTO del CSS
 * inyectado, mismo helper que el resto de la suite. Lo que SI resuelve
 * `getComputedStyle` son los longhands de la shorthand `transition`
 * (duracion/easing), que es lo que ata el test de D7.
 */
describe("Story: movimiento ligado a scroll y lenguaje de entrada unificado (D1/D7)", () => {
  /*
   * Task 19 (D7, "terminar la unificación" + curva propia de REVEAL):
   * ScGrid pasa de leer `theme.data.motion.duration.slower`/
   * `easing.decelerate` sueltos a leer `REVEAL.durationMs`/`REVEAL.easing`
   * (mismo valor de duración, 480ms; la curva SÍ cambia -- ya no
   * `decelerate`, la curva propia de REVEAL). Validado con el bug inyectado
   * a propósito (ver informe de la tarea): revirtiendo temporalmente
   * `ScGrid` a `theme.data.motion.easing.decelerate` en Story.tsx, este test
   * se puso en rojo (`cubic-bezier(0.23, 1, 0.32, 1)` esperado frente a
   * `cubic-bezier(0, 0, 0.2, 1)` recibido); restaurado, volvió a verde.
   */
  it("D7: ScGrid unifica su entrada a REVEAL.durationMs + REVEAL.easing en las dos propiedades transicionadas", () => {
    const { container } = renderWithProviders(<Story />);
    const grid = container.querySelector("[data-revealed]") as HTMLElement;
    // jsdom NO expande la shorthand `transition` en sus longhands
    // individuales (`transitionDuration`/`transitionTimingFunction` dan ""
    // aunque la shorthand SI resuelva -- comprobado con una sonda desechable
    // antes de escribir este test): se lee la propia shorthand como texto
    // completo, ya resuelto contra los tokens del tema (sin `calc`/`var` de
    // por medio, a diferencia de los `transform` de D1, esta SI es una
    // cadena literal que jsdom devuelve intacta).
    const transition = getComputedStyle(grid).transition;

    expect(transition).toBe(
      `opacity ${REVEAL.durationMs}ms ${REVEAL.easing},transform ${REVEAL.durationMs}ms ${REVEAL.easing}`,
    );
  });

  it("D1: el envoltorio de la figura liga su transform a --story-progress, con guard de reduce propio ademas del que ya trae el hook", () => {
    // Verificado con el bug inyectado a proposito: quitando el bloque
    // `@media (prefers-reduced-motion: reduce) { transform: none; }` de
    // `ScFigureShift` (Story.tsx) este assert se pone en rojo; se restauro
    // para dejar la suite en verde (ver informe de la entrega).
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);
    const figureShift = figure.parentElement as HTMLElement;
    const css = cssRuleTextFor(figureShift);

    expect(css).toContain(
      `calc(${STORY_FIGURE_SCROLL_SHIFT} * var(--story-progress, 0))`,
    );
    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transform: none");
  });

  /*
   * AQUI VIVIA "D1: el envoltorio de la tarjeta de nota se desplaza en
   * SENTIDO OPUESTO al de la figura": comparaba el signo de
   * STORY_FIGURE_SCROLL_SHIFT contra STORY_NOTE_SCROLL_SHIFT para blindar la
   * lectura de profundidad entre DOS planos de scroll. Retirado en la
   * segunda ronda de esta entrega (D12, spec 2026-08-06): ScNoteShift/
   * ScNoteCard desaparecieron con la tarjeta de nota, y el statement que la
   * sustituye (ScStatement, mas abajo) no tiene desplazamiento de scroll
   * propio -- solo revela con opacidad/transform, igual que el resto de
   * piezas de la seccion. Sin un segundo plano, la propiedad que este test
   * protegia ("sentidos opuestos entre DOS planos") ya no tiene sujeto: no
   * se sustituye por otro aserto, se retira. El desplazamiento de la FIGURA
   * en si (el otro plano de la pareja) lo sigue cubriendo el test anterior,
   * "D1: el envoltorio de la figura liga su transform a --story-progress...".
   */

  it("D1: useSectionProgress esta conectado a ScStory -- al intersectar publica --story-progress y data-inview", () => {
    // Verificado con el bug inyectado a proposito: quitando la llamada a
    // `useSectionProgress(sectionRef, ...)` de `StoryLight` (Story.tsx) este
    // assert se pone en rojo (la variable nunca se escribe); se restauro
    // para dejar la suite en verde (ver informe de la entrega).
    const { container } = renderWithProviders(<Story />);
    const section = container.querySelector("#story") as HTMLElement;

    expect(section.style.getPropertyValue("--story-progress")).toBe("");
    act(() => triggerFor(section, true));

    expect(section.dataset.inview).toBe("true");
    expect(section.style.getPropertyValue("--story-progress")).not.toBe("");
  });
});

/*
 * D11 (segunda ronda, 2026-08-06): la rejilla pasa de align-items: center a
 * stretch para que la tarjeta de la figura acompañe a la columna de
 * contenido de arriba abajo, sin fijar un alto en pixeles. jsdom no hace
 * layout real (no puede confirmar que las dos columnas queden a la MISMA
 * altura en pantalla -- eso solo se ve en navegador, ver el informe de la
 * entrega): lo que SI puede atarse aqui es (a) que la declaracion CSS sea
 * `stretch`, vía `getComputedStyle` (un valor simple, sin `calc`/`var`, que
 * jsdom SI resuelve -- mismo caso que el `transition` de D7, más arriba) y
 * (b) que ningun elemento de la columna de la figura fije un `height` (a
 * diferencia de `min-height`, que sigue siendo un SUELO, no un valor fijo).
 */
describe("Story: D11, la figura iguala la altura de la columna de contenido", () => {
  it("ScGrid declara align-items: stretch (no center)", () => {
    const { container } = renderWithProviders(<Story />);
    const grid = container.querySelector("[data-revealed]") as HTMLElement;

    expect(getComputedStyle(grid).alignItems).toBe("stretch");
  });

  it("la tarjeta de la figura (ScFigureWrap) no fija un alto en pixeles, solo min-height como suelo", () => {
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);
    // figure -> ScFigureShift (parent) -> ScFigureWrap (grandparent).
    const figureWrap = figure.parentElement?.parentElement as HTMLElement;
    const css = cssRuleTextFor(figureWrap);

    // Cualquier declaracion de "*height:" tiene que ser min-height (un
    // suelo) o max-height, nunca "height:" a secas (un valor fijo que D11
    // prohibe explicitamente).
    const heightDeclarations = css.match(/[\w-]*height:\s*[^;]+;/g) ?? [];
    expect(heightDeclarations.length).toBeGreaterThan(0);
    heightDeclarations.forEach((decl) => {
      expect(
        decl.startsWith("min-height") || decl.startsWith("max-height"),
      ).toBe(true);
    });
  });
});

/*
 * D12 (segunda ronda, 2026-08-06): el statement a pantalla completa que
 * sustituye a la tarjeta flotante de nota. D13 (tercera ronda, mismo dia) lo
 * convirtio en una presentacion anclada por scroll con `useSlideDeck`; esta
 * cuarta ronda (spec 2026-08-07-story-statement-scroll-observer-design.md)
 * REVIERTE ese mecanismo: el bloque vuelve a ser un `<section>` normal en
 * flujo que se revela con un `IntersectionObserver` de ida y vuelta
 * (`useReveal({ once: false })`), montado sobre el PARRAFO. Mismas
 * advertencias de jsdom que el resto de este archivo: no hay layout real,
 * asi que el desbordamiento horizontal en viewports estrechos y el efecto
 * visual de la entrada/salida escalonada NO se pueden confirmar aqui -- ver
 * el informe de la entrega.
 */
describe("Story: statement a pantalla completa, reveal por IntersectionObserver de ida y vuelta (D12 + D1-D7, spec 2026-08-07)", () => {
  it("monta un solo <p> con las tres lineas, en orden, con el texto real de i18n", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;
    const first = screen.getByText(esHome.Home.story.statement.first);
    const second = screen.getByText(esHome.Home.story.statement.second);
    const third = screen.getByText(esHome.Home.story.statement.third);

    // Marcado obligatorio (D12): un UNICO <p> en todo el bloque, no tres
    // parrafos sueltos -- un lector de pantalla tiene que leer la frase
    // entera y seguida.
    const paragraphs = statement.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    const paragraph = paragraphs[0];

    expect(first.parentElement).toBe(paragraph);
    expect(second.parentElement).toBe(paragraph);
    expect(third.parentElement).toBe(paragraph);

    // Las tres lineas, en el mismo orden que el mockup (L128-130) y la tabla
    // D12 de la spec, como <span> (no <div>): .children filtra los nodos de
    // texto (el espacio explicito entre lineas) y solo cuenta elementos.
    const lines = Array.from(paragraph.children) as HTMLElement[];
    expect(lines).toHaveLength(3);
    expect(lines.every((el) => el.tagName === "SPAN")).toBe(true);
    expect(lines[0].textContent).toBe(esHome.Home.story.statement.first);
    expect(lines[1].textContent).toBe(esHome.Home.story.statement.second);
    expect(lines[2].textContent).toBe(esHome.Home.story.statement.third);
  });

  it("D2: #statement es UNA sola <section> que contiene directamente el parrafo -- min-height como suelo (70dvh), sin position: sticky/top ni ninguna height: de varias pantallas", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;
    const paragraph = statement.querySelector("p") as HTMLElement;

    // "Contiene directamente": dos hijos en flujo, el parrafo y el enlace de
    // comunidad (Task 6, plan 2026-08-10-implementacion-plan-premium-f1-f5)
    // -- sin ScStatementStage intermedio (D13 partia el bloque en
    // pista+stage; D2 los funde de vuelta en un unico <section>). Contrato
    // actualizado a proposito (lesson 2026-08-06: anadir un elemento cambia
    // contratos que afirman "un solo hijo"); el enlace se verifica aparte,
    // mas abajo en este fichero.
    expect(statement.children).toHaveLength(2);
    expect(statement.firstElementChild).toBe(paragraph);

    const css = cssRuleTextFor(statement);
    const topLevelCss = css.split("@media")[0];
    /*
     * 70dvh desde el 2026-08-16 (Ola B), antes 100dvh. El valor concreto NO es
     * lo que este candado protege —lo que protege es que sea un SUELO
     * (`min-height`) y no un alto fijo, y que no haya `sticky`— pero se ata
     * igualmente porque cambiarlo tiene consecuencias medidas.
     *
     * Por qué bajó: el contenido de esta sección mide unos 120 px y se centra
     * en su banda, así que con 100dvh quedaban 308 px sin nada a la vista
     * entre el último texto de Story y el primero de éste, incluso tras
     * recortar el relleno de la frontera. Con 70dvh el hueco baja a 173 px,
     * medido a 1440x900 en tema claro.
     *
     * Y lo que NO se hizo, que es la parte que conviene que sobreviva a este
     * test: no se cambió `justify-content` a `flex-start`. Anclar arriba un
     * bloque pequeño en una banda alta es el defecto que el dueño rechazó esa
     * misma mañana en la diapositiva de cierre del deck oscuro. Mover el hueco
     * no es cerrarlo.
     */
    expect(topLevelCss).toContain("min-height: 70dvh");
    expect(topLevelCss).toContain("justify-content: center");
    expect(topLevelCss).not.toContain("position: sticky");
    expect(topLevelCss).not.toContain("top: 0");

    // Cualquier declaracion de "*height:" tiene que ser min-height (un
    // suelo), nunca "height:" a secas -- las ~300dvh de pista que D13
    // anadia (mismo patron que el test D11 de mas arriba en este fichero).
    const heightDeclarations = css.match(/[\w-]*height:\s*[^;]+;/g) ?? [];
    expect(heightDeclarations.length).toBeGreaterThan(0);
    heightDeclarations.forEach((decl) => {
      expect(decl.startsWith("min-height")).toBe(true);
    });
  });

  it("estado inicial: el parrafo tiene data-revealed=false y ninguna linea lleva data-visible (D3 reemplaza a D13: ya no hay indice que calcular linea a linea)", () => {
    renderWithProviders(<Story />);
    const paragraph = screen
      .getByText(esHome.Home.story.statement.first)
      .closest("p") as HTMLElement;

    expect(paragraph).toHaveAttribute("data-revealed", "false");
    [
      screen.getByText(esHome.Home.story.statement.first),
      screen.getByText(esHome.Home.story.statement.second),
      screen.getByText(esHome.Home.story.statement.third),
    ].forEach((line) => {
      expect(line).not.toHaveAttribute("data-visible");
    });
  });

  it("D3: al intersectar, el observer del parrafo revela el statement (false -> true)", () => {
    renderWithProviders(<Story />);
    const paragraph = screen
      .getByText(esHome.Home.story.statement.first)
      .closest("p") as HTMLElement;

    // triggerFor(paragraph, ...), no el `trigger` global sin ambito: el
    // statement monta su PROPIO IntersectionObserver, distinto del de
    // useReveal sobre ScGrid y del de useSectionProgress sobre ScStory (ver
    // el comentario de ioTargets, arriba del fichero) -- los tres conviven a
    // la vez en el mismo render de <Story />.
    expect(paragraph).toHaveAttribute("data-revealed", "false");
    act(() => triggerFor(paragraph, true));
    expect(paragraph).toHaveAttribute("data-revealed", "true");
  });

  it("D3: la inversa -- al dejar de intersecar, el parrafo vuelve a data-revealed=false (esto es lo que prueba once: false, el requisito explicito del encargo)", () => {
    // Verificado con el bug inyectado a proposito: cambiando `once: false`
    // por `once: true` en el useReveal de StoryLight (Story.tsx) este assert
    // se pone en rojo -- once:true (el defecto de useReveal) hace el efecto
    // irreversible, justo lo que "cuando se realice scroll hacia arriba, las
    // animaciones se realiza a la inversa" prohibe; se restauro para dejar
    // la suite en verde (ver informe de la entrega).
    renderWithProviders(<Story />);
    const paragraph = screen
      .getByText(esHome.Home.story.statement.first)
      .closest("p") as HTMLElement;

    act(() => triggerFor(paragraph, true));
    expect(paragraph).toHaveAttribute("data-revealed", "true");

    act(() => triggerFor(paragraph, false));
    expect(paragraph).toHaveAttribute("data-revealed", "false");
  });

  /*
   * Extrae, del CSS inyectado para una linea, el trozo ANTES de
   * `[data-revealed="true"]` (la regla BASE del elemento -- estado oculto) y
   * el trozo DESDE ahi hasta el primer `@media` (la regla del estado
   * visible). Mismo recurso que el resto de este archivo ya usa para aislar
   * el bloque de `prefers-reduced-motion: reduce` por texto (jsdom no evalua
   * selectores anidados via getComputedStyle para un elemento que no esta
   * bajo ese estado).
   */
  function baseAndRevealedCss(el: HTMLElement): {
    base: string;
    revealed: string;
  } {
    const css = cssRuleTextFor(el);
    const revealedIndex = css.indexOf('[data-revealed="true"]');
    const mediaIndex = css.indexOf("@media");
    return {
      base: css.slice(0, revealedIndex),
      revealed: css.slice(
        revealedIndex,
        mediaIndex === -1 ? undefined : mediaIndex,
      ),
    };
  }

  it("D4/D5: cada linea conserva su transform de entrada (izquierda/escala/derecha) y declara el par de retardos -- directo en [data-revealed=true], inverso en la regla base", () => {
    renderWithProviders(<Story />);
    const first = screen.getByText(esHome.Home.story.statement.first);
    const second = screen.getByText(esHome.Home.story.statement.second);
    const third = screen.getByText(esHome.Home.story.statement.third);

    const firstCss = baseAndRevealedCss(first);
    expect(firstCss.base).toContain("transform: translateX(-16%)");
    expect(firstCss.base).toContain("transition-delay: 440ms");
    expect(firstCss.revealed).toContain("transition-delay: 0ms");

    const secondCss = baseAndRevealedCss(second);
    expect(secondCss.base).toContain("transform: scale(0.9)");
    expect(secondCss.base).toContain("transition-delay: 220ms");
    expect(secondCss.revealed).toContain("transition-delay: 220ms");

    const thirdCss = baseAndRevealedCss(third);
    expect(thirdCss.base).toContain("transform: translateX(16%)");
    expect(thirdCss.base).toContain("transition-delay: 0ms");
    expect(thirdCss.revealed).toContain("transition-delay: 440ms");
  });

  it("D5: la regla data-revealed de cada linea usa el selector DESCENDIENTE, nunca el calificado (leccion §5.1: el atributo vive en el PADRE, no en la propia linea)", () => {
    // Verificado con el bug inyectado a proposito: cambiando
    // `[data-revealed="true"] &` por `&[data-revealed="true"]` en
    // ScStatementFirst (Story.tsx) este assert se pone en rojo -- el
    // selector calificado evalua el atributo sobre el PROPIO <span>, que
    // nunca lo lleva (vive en ScStatementText, su padre), asi que la regla
    // no matchearia jamas en un navegador real; se restauro para dejar la
    // suite en verde (ver informe de la entrega).
    renderWithProviders(<Story />);
    const lines = [
      screen.getByText(esHome.Home.story.statement.first),
      screen.getByText(esHome.Home.story.statement.second),
      screen.getByText(esHome.Home.story.statement.third),
    ];

    for (const line of lines) {
      const selector = revealedSelectorTextFor(line);
      // Descendiente: el atributo va PRIMERO, seguido de un ESPACIO y luego
      // la clase de la propia linea -- nunca la clase pegada al atributo sin
      // espacio (`.clase[data-revealed="true"]`, la forma calificada).
      expect(selector.startsWith('[data-revealed="true"] ')).toBe(true);
    }
  });

  it("D6: el guard de reduce fuerza las tres lineas visibles, sin transicion y sin el retardo de la cascada", () => {
    // Verificado con el bug inyectado a proposito: quitando
    // `transition-delay: 0ms;` del guard de reduce de ScStatementFirst
    // (Story.tsx) este assert se pone en rojo (ver informe de la entrega).
    renderWithProviders(<Story />);
    const lines = [
      screen.getByText(esHome.Home.story.statement.first),
      screen.getByText(esHome.Home.story.statement.second),
      screen.getByText(esHome.Home.story.statement.third),
    ];

    for (const line of lines) {
      const css = cssRuleTextFor(line);
      expect(css).toContain("prefers-reduced-motion: reduce");
      const reduceBlock = css.slice(
        css.indexOf("prefers-reduced-motion: reduce"),
      );
      expect(reduceBlock).toContain("transition: none");
      expect(reduceBlock).toContain("opacity: 1");
      expect(reduceBlock).toContain("transform: none");
      expect(reduceBlock).toContain("transition-delay: 0ms");
    }
  });

  it("D7: ninguna regla inyectada por este bloque declara scroll-snap-type/scroll-snap-align ni position: sticky -- el EFECTO que el encargo pide retirar (D2) desaparece por completo, no solo su nombre", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;
    const paragraph = statement.querySelector("p") as HTMLElement;
    const lines = [
      screen.getByText(esHome.Home.story.statement.first),
      screen.getByText(esHome.Home.story.statement.second),
      screen.getByText(esHome.Home.story.statement.third),
    ];

    for (const el of [statement, paragraph, ...lines]) {
      const css = cssRuleTextFor(el);
      expect(css).not.toContain("scroll-snap-type");
      expect(css).not.toContain("scroll-snap-align");
      expect(css).not.toContain("position: sticky");
    }
  });
});

/*
 * Task 7 (auditoria premium 2026-08-08): a 320x568 el statement computaba
 * 21,33px de tipografia -- por debajo del suelo de 24px que su propio
 * comentario, antes de esta tarea, admitia poder perforar. Causa: el
 * `padding-inline` de `ScStatement` era fijo (`theme.data.space[6]`, 32px)
 * en TODO ancho, y `storyStatementFontSize` leia ese mismo valor fijo para
 * su termino de seguridad `calc((100vw - 2*pad)/12)` -- a 320px,
 * `(320-64)/12 = 21,33px`. El arreglo: `padding-inline` mobile-first
 * (`space[4]`/16px hasta `sm`, `space[6]`/32px desde ahi) a traves de una
 * UNICA custom property (`--story-statement-pad`) que tanto `ScStatement`
 * como `storyStatementFontSize` leen -- a 320px con pad 16,
 * `(320-32)/12 = 24,00px` exactos (ver el docblock de `storyStatementFontSize`
 * en Story.tsx para la desigualdad completa, Regla 24).
 *
 * Los tests de aqui abajo NO dependen de `cssRuleTextFor` + `split("@media")`
 * (el resto de este fichero, para el guard de `prefers-reduced-motion`): esa
 * tecnica corta por TEXTO, y no distingue "la regla de dentro del @media
 * pertenece al MISMO elemento" de "pertenece a otro que comparte una
 * subcadena". Aqui hace falta precisamente esa distincion (Regla 35: la
 * FORMA de una regla se afirma por `selectorText`/CSSOM real, nunca por
 * substring) porque la propiedad personalizada tiene DOS declaraciones (base
 * + `@media`) sobre el MISMO selector, no sobre selectores distintos --
 * `baseStyleRuleFor`/`nestedStyleValueFor` (mas abajo) navegan el arbol
 * CSSOM real (`CSSMediaRule.cssRules`, Regla 36: acotado al bloque de regla
 * concreto, nunca `getComputedStyle`, que jsdom no recalcula bajo ningun
 * `@media`) y comparan `selectorText` strings, no texto libre. Tampoco se
 * asume CUAL de las dos clases que styled-components pinta en el elemento
 * (`sc-xxxx` estable o el hash con los estilos) es la que aparece en el
 * selector: se lee el `selectorText` REAL de la regla de nivel superior
 * primero, y ESE string (no una clase por posicion) es el que se persigue
 * dentro del `@media`.
 */
describe("Task 7: pad inline mobile-first del statement (24px exactos a 320)", () => {
  /**
   * styled-components pinta CADA elemento con DOS clases: la estable
   * `sc-xxxx` (identifica el COMPONENTE, sin estilos propios) y una
   * hash `yyyy` que SI lleva las declaraciones reales de esta combinacion de
   * props -- `el.classList[0]` no es de fiar para saber cual de las dos es
   * (verificado: en este render concreto la de nivel superior era la
   * SEGUNDA). Este helper no asume orden: recorre TODAS las reglas de nivel
   * superior (no las anidadas en `@media`) y devuelve la PRIMERA
   * `CSSStyleRule` cuyo selector matchea alguna clase del elemento Y cuyo
   * estilo declara `propertyName` -- ese es el `selectorText` real que hay
   * que perseguir dentro del `@media` (Regla 35: selector por `selectorText`
   * real, nunca una clase asumida por posicion).
   */
  function baseStyleRuleFor(
    el: HTMLElement,
    propertyName: string,
  ): CSSStyleRule | undefined {
    const classes = Array.from(el.classList).map((cls) => `.${cls}`);
    for (const sheet of Array.from(document.styleSheets)) {
      let topRules: CSSRule[];
      try {
        topRules = Array.from(sheet.cssRules);
      } catch {
        continue;
      }
      for (const rule of topRules) {
        if (!(rule instanceof CSSStyleRule)) continue;
        if (!classes.includes(rule.selectorText)) continue;
        if (rule.style.getPropertyValue(propertyName).trim() === "") continue;
        return rule;
      }
    }
    return undefined;
  }

  /**
   * Busca, DENTRO de la `CSSMediaRule` cuya condicion coincide con
   * `mediaText` (nunca en las reglas de nivel superior de la hoja -- Regla
   * 36: acotado al bloque de regla concreto), la `CSSStyleRule` ANIDADA cuyo
   * `selectorText` es EXACTAMENTE `selectorText` -- la MISMA regla que
   * `baseStyleRuleFor` encontro fuera del `@media`, no una clase o un
   * selector distinto (Regla 35). Devuelve el valor de `propertyName` que
   * esa regla anidada declara, o `undefined` si no hay ninguna que matchee
   * (el bug inyectado de la tarea, ver el test de mas abajo, se apoya en
   * este `undefined`).
   */
  function nestedStyleValueFor(
    selectorText: string,
    mediaText: string,
    propertyName: string,
  ): string | undefined {
    for (const sheet of Array.from(document.styleSheets)) {
      let topRules: CSSRule[];
      try {
        topRules = Array.from(sheet.cssRules);
      } catch {
        continue;
      }
      for (const rule of topRules) {
        if (!(rule instanceof CSSMediaRule)) continue;
        if (rule.media.mediaText !== mediaText) continue;
        for (const nested of Array.from(rule.cssRules)) {
          if (!(nested instanceof CSSStyleRule)) continue;
          if (nested.selectorText !== selectorText) continue;
          const value = nested.style.getPropertyValue(propertyName).trim();
          if (value !== "") return value;
        }
      }
    }
    return undefined;
  }

  it("regla base (fuera de cualquier @media): --story-statement-pad = space[4] (1rem/16px), padding-inline la consume por var(), padding-block no se toca (space[8])", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;

    const css = cssRuleTextFor(statement);
    const topLevelCss = css.split("@media")[0];

    expect(topLevelCss).toContain(
      `--story-statement-pad: ${basicLightTheme.space[4]}`,
    );
    expect(topLevelCss).toContain("padding-inline: var(--story-statement-pad)");
    expect(topLevelCss).toContain(`padding-block: ${basicLightTheme.space[8]}`);
    // Regresion: la version anterior a esta tarea declaraba `padding:` en
    // shorthand con el MISMO valor a los dos lados -- si volviera, esta
    // asercion negativa la detecta (el shorthand fijaria tambien el pad
    // inline a un valor no mobile-first).
    expect(topLevelCss).not.toMatch(/(?<!-)padding:\s/);

    // Regla base por CSSOM real (Regla 36): la MISMA cifra, leida de la
    // propiedad declarada, no del texto libre.
    const baseRule = baseStyleRuleFor(statement, "--story-statement-pad");
    expect(baseRule).toBeDefined();
    expect(
      baseRule?.style.getPropertyValue("--story-statement-pad").trim(),
    ).toBe(basicLightTheme.space[4]);
  });

  it("dentro de @media (el breakpoint sm del tema, no un literal a mano): --story-statement-pad sube a space[6] (2rem/32px), sobre la MISMA regla que declara el valor base (Regla 35: mismo selectorText, no una regla distinta)", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;

    // Confirma primero, con el mismo helper de texto que usa el resto del
    // archivo (Regla 36: acotado a lo que hay DESPUES del primer @media),
    // que la condicion es la del tema -- no "600px" escrito a mano.
    const css = cssRuleTextFor(statement);
    const mediaCss = css.slice(css.indexOf("@media"));
    expect(mediaCss).toContain(basicLightTheme.breakPoint.sm);

    // Y ahora, por CSSOM real (Regla 35/36): la regla ANIDADA dentro de ese
    // CSSMediaRule concreto, sobre el MISMO selectorText que la regla base
    // (no una clase asumida por posicion), declara el pad de sm.
    const baseRule = baseStyleRuleFor(statement, "--story-statement-pad");
    expect(baseRule).toBeDefined();
    const padInMedia = nestedStyleValueFor(
      baseRule!.selectorText,
      basicLightTheme.breakPoint.sm,
      "--story-statement-pad",
    );
    expect(padInMedia).toBe(basicLightTheme.space[6]);
  });

  it("storyStatementFontSize (las tres lineas) lee la MISMA custom property, no un valor de tema aparte: calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12)", () => {
    renderWithProviders(<Story />);
    const lines = [
      screen.getByText(esHome.Home.story.statement.first),
      screen.getByText(esHome.Home.story.statement.second),
      screen.getByText(esHome.Home.story.statement.third),
    ];

    for (const line of lines) {
      const css = cssRuleTextFor(line);
      expect(css).toContain(
        "calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12)",
      );
      // Negativo: ningun literal de space[6]/space[4] escrito aparte dentro
      // del propio calc -- la unica fuente es la custom property.
      expect(css).not.toMatch(
        /calc\(\(100vw - (1rem|2rem) - (1rem|2rem)\) \/ 12\)/,
      );
    }
  });

  /*
   * Bug inyectado a proposito (Regla 34), documentado tambien en el informe
   * de la tarea: revertir `--story-statement-pad` a un valor FIJO (sin
   * @media, sin custom property) es exactamente el bug que esta tarea
   * arregla -- `nestedStyleValueFor` deja de encontrar ninguna regla anidada
   * (devuelve `undefined`, nunca `space[6]`) porque ya no hay ningun
   * `CSSMediaRule` que declare la propiedad. Sabotaje aplicado a mano sobre
   * `ScStatement` (Story.tsx) y restaurado tras confirmar el rojo -- salida
   * literal en el informe de la tarea (seccion "Ciclo de bug inyectado").
   */
  it("aritmetica del suelo a 320px: (320 - 2*16) / 12 = 24,00px exactos (documentado tambien en el docblock de storyStatementFontSize, Story.tsx)", () => {
    const padBase = Number.parseFloat(basicLightTheme.space[4]) * 16; // rem -> px (raiz 16px)
    const width = 320;
    const term = (width - 2 * padBase) / 12;
    expect(padBase).toBe(16);
    expect(term).toBeCloseTo(24, 5);
  });
});

/*
 * AQUI VIVIAN cuatro tests de la tercera ronda (D13, spec
 * 2026-08-06-story-features-tema-claro-design.md), todos sobre piezas que ya
 * no existen tras revertir D13 (D1/D2 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md):
 *
 * - "D13: la pista (#statement) y el stage existen, con el stage como UNICO
 *   hijo en flujo de la pista, pegado con position: sticky" -- protegia la
 *   particion `ScStatementTrack`/`ScStatementStage`. Sustituido por el test
 *   D2 de arriba ("#statement es UNA sola <section>...").
 * - "D13: avanzando el indice del hook, las lineas se descubren una a una y
 *   en orden" / "D13: retrocediendo, las lineas se vuelven a ocultar" --
 *   protegian `data-visible` calculado LINEA A LINEA contra el `index` de
 *   `useSlideDeck`. Sin ese indice, no hay sujeto: sustituidos por los tests
 *   D3 de arriba (`triggerFor(paragraph, true/false)` sobre el UNICO
 *   `data-revealed` del parrafo).
 * - "bajo reduce la pista pierde su recorrido propio de scroll (height:
 *   auto) y el stage pierde el pin (position: static)" -- protegia los
 *   guards de `reduce` de la pareja pista/stage, retirados en D6 (spec
 *   2026-08-07): sin pin ni pista, no hay nada que degradar bajo reduce, y
 *   `ScStatement` no declara ningun guard propio.
 */

/*
 * AQUI VIVIA "tamano del sparkle de la nota (reset global de svg)": protegia
 * una regresion real (GlobalStyles declara `svg { width: 100% }`, que se
 * come el atributo `width="20"` del sparkle sin un `width: 20px` explicito
 * en CSS -- medido 186px en navegador, revision 2026-07-28). Retirado en la
 * segunda ronda de esta entrega (D12, spec 2026-08-06) junto con ScSparkle:
 * la tarjeta de nota desaparece y con ella su icono. Comprobado (grep) que
 * no queda NINGUN <svg> en Story.tsx, ni en la rama clara ni en la oscura --
 * esa clase de regresion ya no tiene sujeto en esta seccion, y no se
 * sustituye por un test vacio. Sigue cubierta donde SI hay sujeto real
 * (Features.test.tsx/Journey.test.tsx, mencionados en el comentario
 * original), fuera del alcance de esta entrega.
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

describe("Story en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("monta la escena Cosmic Being (11 capas decorativas) en vez de la figura/tarjeta de claro", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(11);
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("sigue mostrando el kicker, el titulo y los 4 pilares con el mismo i18n que en claro", async () => {
    renderWithProviders(<Story />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.story.kicker)).toBeInTheDocument();
    });
    expect(
      screen.getByText(esHome.Home.story.pillars.learn.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.practice.body),
    ).toBeInTheDocument();
  });

  /*
   * Task 15 (D-C, 2026-08-11): esta diapositiva consumia `noteLead`/
   * `noteAccent`, dos claves EXCLUSIVAS de la rama oscura que decian la misma
   * frase que `Home.story.statement.*` de la clara con otra particion. Un
   * solo arbol de contenido no admite dos juegos de claves para una frase:
   * gana el de la rama clara y la nota pasa a consumirlo. Lo que NO cambia es
   * el tratamiento: el tramo final sigue viviendo en un elemento propio
   * (`ScDeckNoteAccent`) porque envolverlo en un acento exige dos nodos.
   */
  it("el cierre se muestra con la MISMA frase que la rama clara, con el tramo final en su propio elemento y sin la tarjeta ni el sparkle de claro", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(
        screen.getByText(esHome.Home.story.statement.first, { exact: false }),
      ).toBeInTheDocument();
    });
    const accent = screen.getByText(esHome.Home.story.statement.third);
    expect(accent.tagName).toBe("SPAN");
    // La frase entera se lee seguida en el parrafo padre, no en tres trozos
    // sueltos -- mismo contrato de lectura que el <p> de la rama clara.
    const frase = [
      esHome.Home.story.statement.first,
      esHome.Home.story.statement.second,
      esHome.Home.story.statement.third,
    ].join(" ");
    expect(accent.parentElement?.textContent).toBe(frase);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("no hay ninguna imagen con alt de i18n (figureAlt es cosa de la rama clara)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    expect(
      container.querySelector(`img[alt="${esHome.Home.story.figureAlt}"]`),
    ).not.toBeInTheDocument();
  });
});

/*
 * Tarea 3 (spec 2026-07-31-story-deck-hero-transition-design.md §4/§9): la
 * rama oscura deja de ser una pantalla y pasa a ser una presentacion de 6
 * diapositivas ancladas por scroll. jsdom no evalua @media, no anima y no
 * hace layout real (misma advertencia que el resto de este archivo): lo
 * unico verificable aqui es (a) atributos (data-slide-index/data-slide/
 * data-dir), (b) contenido i18n real por diapositiva, (c) un valor de
 * getComputedStyle contra una constante IMPORTADA (nunca un literal), y (d)
 * el TEXTO del CSS inyectado para los bloques de @media que jsdom nunca
 * ejecuta. El pin, el snap y la geometria real se verifican en navegador en
 * una fase posterior (Task 4), no aqui.
 */
describe("Story: presentacion de 6 diapositivas (tema oscuro)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("hay exactamente STORY_SLIDES elementos [data-slide-index]", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
  });

  /*
   * Task 14 (plan premium F3, 2026-08-11): mismo parrafo trasladado que en
   * la rama clara (ver el describe "Story" de mas arriba), aqui dentro de la
   * diapositiva 0 (la "apertura" de la rama oscura). Un render por rama
   * (Story() delega en StoryLight/StoryDeckDark), UNA sola clave
   * (`Home.story.support`).
   *
   * FIX DE REVISION: afirma tambien el ORDEN -- el parrafo va ANTES del
   * kicker de la diapositiva (el primer contenido real de esa diapositiva),
   * literal del brief ("antes del primer contenido actual de Story"). La
   * primera entrega solo afirmaba presencia, no orden, y lo dejaba DESPUES.
   */
  it("la diapositiva 0 incluye el parrafo trasladado (Home.story.support), ANTES del kicker", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const slide0 = container.querySelector(
      '[data-slide-index="0"]',
    ) as HTMLElement;
    const parrafo = within(slide0).getByTestId("story-support");
    const kicker = within(slide0).getByText(esHome.Home.story.kicker);

    expect(parrafo).toHaveTextContent(esHome.Home.story.support);
    expect(
      Boolean(
        parrafo.compareDocumentPosition(kicker) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it("reparte el contenido de las 6 diapositivas en el orden del encargo: intro, 4 pilares, cierre", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];

    // Diapositiva 0: el UNICO h2 accesible de la seccion entera.
    expect(slides[0].querySelector("h2#story-title")).toBeInTheDocument();

    // Diapositivas 1-4: un pilar cada una, en orden, con su numeracion
    // "01".."04" (del componente, no de i18n; Tarea 5 de copy, 2026-08-09:
    // se retiro la raya decorativa que llevaba detras) y el titulo i18n real.
    const pillarKeys = ["learn", "create", "grow", "practice"] as const;
    pillarKeys.forEach((key, i) => {
      const slide = slides[i + 1];
      expect(slide.textContent).toContain(`0${i + 1}`);
      expect(
        within(slide).getByText(esHome.Home.story.pillars[key].title),
      ).toBeInTheDocument();
    });

    // Diapositiva 5: el cierre, con la MISMA frase que la rama clara
    // (`Home.story.statement.*` desde la Task 15) y el tramo final en un
    // elemento propio. Es ademas la `<section id="statement">` de esta rama
    // -- ver el test dedicado mas abajo.
    expect(
      within(slides[5]).getByText(esHome.Home.story.statement.first, {
        exact: false,
      }),
    ).toBeInTheDocument();
    const accent = within(slides[5]).getByText(
      esHome.Home.story.statement.third,
    );
    expect(accent.tagName).toBe("SPAN");
    expect(slides[5].tagName).toBe("SECTION");
    expect(slides[5].id).toBe("statement");
  });

  /*
   * Task 22 (tipografia de lectura, plan premium F1-F5, punto 2 del brief):
   * `ScDeckPillarSubtitle`/`ScDeckPillarBody` (`story.deck.tsx`) no
   * declaraban `max-width` -- el detector de craft midio en runtime, en los
   * dos gates, que su contenedor da 97,9-112ch de capacidad a 1280px. Con el
   * copy actual ninguna instancia llega a envolver (riesgo ESTRUCTURAL
   * latente, no defecto visible hoy), pero un copy mas largo se extenderia
   * sin freno. Candado por TEXTO del CSS inyectado (`cssRuleTextFor`), no
   * `getComputedStyle().maxWidth`: la declaracion vive en la clase base, sin
   * ningun `@media` de por medio, asi que jsdom SI la resuelve por CSSOM --
   * pero se afirma el mismo `theme.data.grid.prose` que consume el
   * componente, nunca el literal "65ch" a mano, para que un cambio de token
   * no desincronice el test.
   */
  it("Task 22: el subtitulo y el cuerpo de cada tarjeta de pilar topan su ancho en grid.prose", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const subtitulo = screen.getByText(esHome.Home.story.pillars.learn.body);
    const cuerpo = screen.getByText(
      esHome.Home.story.pillars.learn.inspiration,
    );
    expect(cssRuleTextFor(subtitulo)).toContain(
      `max-width: ${basicDarkTheme.grid.prose}`,
    );
    expect(cssRuleTextFor(cuerpo)).toContain(
      `max-width: ${basicDarkTheme.grid.prose}`,
    );
  });

  /*
   * Paridad de landmark entre ramas (Task 15, D-C). El hallazgo #2 de la
   * critica independiente del 2026-08-11 era literalmente "secciones
   * diferentes (#statement solo en claro)": la rama clara emitia una
   * `<section id="statement">` a pantalla completa y la oscura no emitia
   * NINGUNA seccion con ese id, aunque dijera la misma frase. Ahora las dos
   * la emiten. Lo que sigue ramificando es el VEHICULO -- en claro es una
   * seccion hermana de `#story`, aqui la ultima diapositiva del deck --, no
   * el contenido ni las salidas.
   *
   * El candado que de verdad protege la propiedad ("la lista de secciones de
   * la pagina es identica en los dos temas") vive en `HomeSections.test.tsx`,
   * porque es ahi donde se ve la pagina entera. Este test es su mitad local:
   * afirma que el id lo emite ESTA rama y que el cierre completo -- frase +
   * salida a Discord -- vive dentro de el.
   */
  it("Task 15: la diapositiva de cierre ES la <section id=statement> de la rama oscura, con la frase y la salida dentro", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const statement = container.querySelector(
      "section#statement",
    ) as HTMLElement | null;
    expect(statement).not.toBeNull();
    expect(statement).toHaveAttribute(
      "data-slide-index",
      String(STORY_SLIDES - 1),
    );
    expect(statement?.textContent).toContain(esHome.Home.story.statement.third);
    // Consulta por DOM plano, NO por rol: este test verifica ESTRUCTURA (el
    // enlace existe con el destino correcto dentro de #statement), no
    // alcanzabilidad. La justificación original (A1: la diapositiva "next"
    // llevaba visibility: hidden y AccName resolvía vacío) quedó revertida
    // en la crítica #10 -- hoy la que está oculta mientras la diapositiva no
    // es la actual es la COMPUERTA del propio enlace (ScDeckNoteLink), así
    // que la consulta por rol seguiría sin encontrar nombre y la consulta
    // plana sigue siendo la correcta aquí. La alcanzabilidad la cubre el
    // describe "critica #10" de más abajo.
    const link = (statement as HTMLElement).querySelector("a");
    expect(link, "no hay ningun enlace dentro de #statement").not.toBeNull();
    expect(link?.textContent).toContain(esHome.Home.story.communityLink);
    expect(link).toHaveAttribute("href", links.discord);
  });

  /*
   * ESTE CANDADO ESTÁ INVERTIDO A PROPÓSITO respecto a su versión anterior, y
   * el motivo importa más que la aserción. Entre el 2026-08-12 y el 2026-08-16
   * exigía justo lo contrario -- que `#statement` declarase `align-self: start`
   * (prop `$anchorTop` de `ScSlide`, fix wave D / hallazgo D1) -- para retrasar
   * el momento en que Journey tapa el enlace a Discord al subir sobre la cola
   * de Story.
   *
   * El dueño revirtió esa decisión el 2026-08-16 mirando la página: anclada
   * arriba, la diapositiva de cierre dejaba 431px de hueco vacío debajo a
   * 1920x905 y 633px a 390x844, y se leía como un bloque desprendido en la
   * esquina superior. Medido en navegador real, centrarla cuesta 120-180px de
   * ventana limpia (600 -> 480 px a 1280x720; 840 -> 660 px a 1920x905) y no
   * reintroduce desbordamiento en ningún tamaño probado. Detalle completo en el
   * docblock de `ScSlide` (`story.deck.tsx`).
   *
   * Lo que este test bloquea, por tanto, no es "no usar align-self" como manía
   * de estilo: es que NADIE vuelva a anclar una diapositiva suelta del deck sin
   * pasar antes por esa medición. Las seis se centran con el `place-items:
   * center` de `ScDeck`, y la de cierre no es una excepción.
   *
   * Verificable en jsdom porque mira el TEXTO del CSS inyectado, no el layout
   * (jsdom no calcula layout: `docs/qa-3d-pendiente.md` y CLAUDE.md §5.2).
   *
   * Validado con el bug inyectado a propósito: añadiendo `align-self: start;`
   * al template de `ScSlide` en `story.deck.tsx`, este test cae en rojo;
   * quitándolo, vuelve a verde.
   */
  it("ninguna de las 6 diapositivas declara align-self: la de cierre (#statement) se centra como las demás", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const statement = container.querySelector(
      "section#statement",
    ) as HTMLElement;
    expect(
      cssRuleTextFor(statement),
      "la diapositiva de cierre volvió a anclarse: ver el docblock de ScSlide antes de tocarlo",
    ).not.toContain("align-self");

    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];
    expect(slides).toHaveLength(STORY_SLIDES);
    slides.forEach((slide) => {
      expect(cssRuleTextFor(slide)).not.toContain("align-self");
    });
  });

  it("el stage arranca con data-slide=0 y data-dir=forward (estado de reposo del hook, sin scroll)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    expect(stage).toHaveAttribute("data-slide", "0");
    expect(stage).toHaveAttribute("data-dir", "forward");
  });

  it("el deck acota su ancho a STORY_DARK_MAX_WIDTH (constante importada, no un literal)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const firstSlide = container.querySelector(
      '[data-slide-index="0"]',
    ) as HTMLElement;
    const deck = firstSlide.parentElement as HTMLElement;
    expect(getComputedStyle(deck).maxWidth).toBe(STORY_DARK_MAX_WIDTH);
  });

  /*
   * Task 7 (plan premium F1-F5, "micro-perf sin riesgo"): antes de esta
   * tarea el `border-radius` del stage interpolaba con `--story-enter`
   * (`calc(radius["2xl"] * (1 - var(--story-enter, 1)))`), la MISMA variable
   * que `useSlideDeck.ts` reescribe en cada frame de scroll mientras la
   * pista intersecta -- no solo durante la apertura, sino durante TODO el
   * recorrido de las 6 diapositivas. A diferencia de `transform` (compositor
   * puro), `border-radius` obliga a repintar en cada escritura: el UNICO
   * repintado por scroll de todo el repo. Se congela en 0 -- el mismo valor
   * que el estado sin-JS ya usaba por defecto. Candado con bug inyectado:
   * restaurando el `calc(...)` con `var(--story-enter, 1)` a mano en
   * `story.deck.tsx`, este test se pone en rojo (`getComputedStyle` deja de
   * devolver "0px"); restaurado el fix, vuelve a verde.
   */
  it("el border-radius del stage esta FIJO en 0: ya no interpola con --story-enter en cada frame de scroll (Task 7, plan premium F1-F5)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    expect(getComputedStyle(stage).borderRadius).toBe("0");
    // Ninguna regla inyectada para este elemento referencia --story-enter en
    // un border-radius: si volviera a colarse el calc(), el repintado por
    // scroll que esta tarea retira reaparecería con él.
    expect(cssRuleTextFor(stage)).not.toMatch(/border-radius:[^;]*story-enter/);
  });

  it("bajo prefers-reduced-motion la pista vuelve a flujo, y el scrub de rewind vive SOLO bajo no-preference", async () => {
    // jsdom no evalua @media (leccion 2026-07-27, repetida en todo este
    // archivo): el guard de reduce y el aislamiento del scrub se atan por
    // TEXTO de las reglas inyectadas, con el mismo helper que ya usa el
    // resto de la suite.
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    const deck = (
      container.querySelector('[data-slide-index="0"]') as HTMLElement
    ).parentElement as HTMLElement;

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

    const deckCss = cssRuleTextFor(deck);
    expect(deckCss).toContain("prefers-reduced-motion: no-preference");
    expect(deckCss).toContain("@keyframes");
    // Misma comprobacion que ya usa "flotacion..." mas arriba en este
    // archivo: el segmento ANTERIOR al primer @media no debe traer ya el
    // @keyframes -- si lo trajera, "solo bajo no-preference" seria falso.
    const topLevelDeckCss = deckCss.split("@media")[0];
    expect(topLevelDeckCss).not.toContain("@keyframes");
  });

  /*
   * Replica del test 12 de Journey.test.tsx (mismo mecanismo, mismo
   * hallazgo de auditoria adversarial): es el unico guard de reduce que NO
   * se deduce mirando el elemento que protege.
   *
   * Bajo reduce, el stage pasa a position: static (test de arriba) y con
   * ello deja de ser el containing block del envoltorio de la escena, que
   * sigue siendo absoluto. El containing block sube a la pista, cuya altura
   * bajo reduce es auto -- las 6 diapositivas apiladas, varias pantallas --
   * y las 11 capas de la escena (object-fit: cover) se estiran a esa altura,
   * quedando recortadas a una franja vertical con un zoom brutal.
   *
   * Por que necesita test propio: no se pierde ni una palabra de texto, asi
   * que todos los tests de contenido seguirian verdes con el fondo roto. Lo
   * que lo cierra es que el envoltorio declare bajo reduce una altura
   * EXPLICITA de una pantalla y se ancle arriba, que es correcto sea cual
   * sea el ancestro que acabe haciendo de containing block.
   */
  it("bajo prefers-reduced-motion el envoltorio de la escena se ancla arriba con un alto explicito de una pantalla, para no estirarse a la pista entera", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
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
    // seccion cambiara de medida, este guard tiene que seguir describiendo
    // "una pantalla" y no un numero que dejo de significar eso.
    expect(wrapReduceBlock).toContain(`height: ${STORY_DARK_HEIGHT}`);
    expect(wrapReduceBlock).toContain("transform: none");
  });

  it("las 11 capas de la escena siguen presentes dentro de la presentacion", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(11);
    });
  });
});

/*
 * Task 6 (plan `2026-08-10-implementacion-plan-premium-f1-f5`), punto 1:
 * candado del deck accesible con lector de pantalla. La auditoria previa
 * midio un veredicto FAVORABLE por accidente -- el deck lee sus 6
 * diapositivas completas, en orden, porque nada las oculta -- y este test
 * FIJA ese contrato por escrito, para que un cambio futuro no pueda
 * romperlo en silencio.
 *
 * ACTUALIZADO (fix wave A, hallazgo A1, revision final de rama): la frase
 * "ScSlide es solo opacity/transform, nunca display:none/visibility:hidden"
 * DEJO DE SER CIERTA. La Task 6 (este mismo bloque) monto el primer enlace
 * REAL dentro de una diapositiva (`ScDeckNoteLink`, la ultima) y con
 * `pointer-events: none` NO saca nada del orden de tabulacion, tabular por
 * el deck en tema oscuro dejaba el foco en un `<a>` invisible -- WCAG 2.4.7,
 * el hallazgo mas grave de la revision. El arreglo (`story.deck.tsx`,
 * docblock de `ScSlide`) anade `visibility: hidden` al reposo y
 * `visibility: visible` a `[data-state="current"]`/al guard de reduce: en un
 * navegador real, SOLO la diapositiva `current` esta hoy en el arbol de
 * accesibilidad, no las 6 a la vez. Los DOS asserts de este describe (orden
 * de DOM, ausencia de `aria-hidden` sobre texto) SIGUEN siendo correctos y
 * necesarios.
 *
 * RE-ACTUALIZADO (critica #10, tarea derivada, 2026-08-18): la `visibility`
 * de A1 SE REVIRTIO -- expulsaba las 6 diapositivas del arbol de
 * accesibilidad y hacia el contenido inalcanzable para un lector de
 * pantalla (el cursor virtual no emite scroll; el mismo P0 medido primero
 * en Journey). La frase "un lector de pantalla anuncia las 6 diapositivas
 * de una sola pasada" VUELVE a ser cierta, con una excepcion declarada: el
 * enlace del cierre lleva una compuerta de visibility atada a `data-state`
 * (`ScDeckNoteLink`, Story.tsx) para no reabrir la trampa de foco de A1.
 * El candado de la reversion y de la compuerta vive en el describe
 * "critica #10" de mas abajo (que sustituye al describe "fix wave A" que
 * vivio alli). Nota de instrumento, corregida junto con la reversion: el
 * `isInaccessible` de Testing Library SI observa el `visibility` de las
 * hojas inyectadas en el jsdom actual -- el rojo observado del candado
 * gemelo de Journey lo probo empiricamente; la afirmacion contraria que
 * vivia en este parrafo era de la epoca de A1 y ya no describe el arnes.
 *
 * Dos propiedades, las dos citadas explicitamente por el encargo:
 * 1) Orden del DOM: `data-slide-index` crece de forma estrictamente
 *    ascendente en el MISMO orden en que el documento las devuelve -- un
 *    lector de pantalla recorre el arbol en orden de documento, nunca en el
 *    orden visual que decide `grid-area` (las 6 comparten la MISMA celda de
 *    `ScDeck`, story.deck.tsx).
 * 2) Ausencia de `aria-hidden` sobre el contenido textual: ni la propia
 *    diapositiva, ni ningun ancestro entre ella y la raiz del documento, ni
 *    ningun DESCENDIENTE suyo oculta su texto -- lo decorativo
 *    (ScSceneWrap/ScRail/ScScrollHint) vive FUERA de `ScDeck`, como hermano
 *    de las diapositivas, nunca envolviendolas ni envuelto por ellas.
 *
 * Fix round (revision del coordinador): la version original de este test
 * solo cubria la diapositiva misma (`toHaveAttribute`) y sus ANCESTROS
 * (`closest()`, que solo sube). Un `aria-hidden="true"` puesto en un nodo
 * INTERNO de la diapositiva (p.ej. envolver `ScDeckTitle` o
 * `ScDeckPillarBody`, sin tocar el contenedor `ScSlide`) pasaba las tres
 * aserciones en verde mientras un lector de pantalla dejaba de anunciar ESE
 * texto -- exactamente el caso que el nombre del test promete cubrir.
 *
 * El primer arreglo (`querySelector(...) === null`, sin mas) era DEMASIADO
 * estricto y rompio un caso legitimo: `StepIcon` (Journey.tsx:440) es un
 * SVG decorativo con `aria-hidden="true"` DENTRO de cada diapositiva de
 * paso, redundante a proposito con la etiqueta de texto visible que ya
 * nombra el paso -- ocultarlo es la practica correcta, no un bug. El
 * arreglo final distingue las dos situaciones por su EFECTO: un
 * `aria-hidden` interno esta permitido si el subarbol que oculta no
 * contiene texto (`textContent` vacio, el caso de un icono puramente
 * grafico); esta prohibido si oculta texto real (el caso que rompia el
 * candado). Cada diapositiva recorre TODOS sus descendientes
 * `aria-hidden="true"` y exige `textContent` vacio en cada uno.
 *
 * Verificado con DOS bugs inyectados a proposito, cada uno acotado a la
 * asercion que cierra (informe de la tarea): (a) anadir
 * `aria-hidden="true"` al CONTENEDOR de una `ScSlide` de `Story.tsx` pone
 * este test en rojo por `not.toHaveAttribute`; quitarlo lo devuelve a
 * verde. (b) anadir `aria-hidden="true"` a un nodo INTERNO con texto de
 * una diapositiva (sin tocar el contenedor) pone este test en rojo porque
 * ese descendiente oculto deja de tener `textContent` vacio; quitarlo lo
 * devuelve a verde.
 */
describe("Story: candado SR del deck -- orden de DOM y ausencia de aria-hidden sobre el texto (Task 6)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("las STORY_SLIDES diapositivas aparecen en el DOM en orden ascendente de data-slide-index", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
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
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];

    slides.forEach((slide) => {
      expect(slide).not.toHaveAttribute("aria-hidden");
      // closest() incluye el propio elemento -- redundante con la asercion
      // de arriba sobre la diapositiva misma, e imprescindible para
      // cualquier ANCESTRO intermedio (ScDeck/ScStage/ScTrack) que pudiera
      // ocultar el subarbol entero sin que ninguna diapositiva individual
      // lo delate.
      expect(slide.closest('[aria-hidden="true"]')).toBeNull();
      // querySelector()/querySelectorAll() BAJAN por los descendientes --
      // closest() no cubre este caso (solo sube). Sin esta asercion,
      // envolver SOLO el contenido interno de una diapositiva (p.ej.
      // ScDeckTitle o ScDeckPillarBody) en aria-hidden pasaria las dos
      // aserciones de arriba en verde mientras un lector de pantalla deja
      // de anunciar ese texto (fix round, revision del coordinador). NO se
      // exige "cero aria-hidden interno" a secas: un icono puramente
      // decorativo (sin texto propio, p.ej. StepIcon en la rama oscura de
      // Journey) SI puede llevarlo -- lo que el candado prohibe es que ese
      // aria-hidden envuelva TEXTO, asi que se exige que cada descendiente
      // oculto tenga el arbol de texto VACIO.
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
 * `visibility: hidden` en el reposo de `ScSlide` y `visibility: visible` en
 * `[data-state="current"]`/bajo `reduce`.
 *
 * RETIRADO en la tarea derivada de la critica externa #10 (2026-08-18,
 * hallazgo A, P0): esa misma `visibility: hidden` expulsaba las 6
 * diapositivas del arbol de accesibilidad -- el cursor virtual de un lector
 * de pantalla no emite scroll, asi que 5 de 6 eran inalcanzables por
 * cualquier medio. No es un candado que se relaja para que pase (regla 40):
 * es un contrato REVERTIDO con medicion delante (primero en Journey, mismo
 * mecanismo), y su sustituto vive en el describe de abajo. La historia
 * completa de las dos decisiones esta en el docblock de `ScSlide`
 * (story.deck.tsx).
 */

/*
 * Critica externa #10, hallazgo A (P0), tarea derivada: EL DECK DE STORY NO
 * EXISTIA PARA TECNOLOGIA ASISTIVA -- el mismo defecto medido en Journey,
 * agravado: aqui la ultima diapositiva contiene un enlace REAL
 * (`ScDeckNoteLink`, Discord), asi que la reversion de la `visibility` de la
 * diapositiva NO basta -- sola, reabriria la trampa de foco invisible que A1
 * cerro de verdad en esta seccion (WCAG 2.4.7).
 *
 * Los cuatro candados cubren las cuatro mitades del arreglo: (1) el efecto
 * que importa -- las STORY_SLIDES diapositivas estan en el arbol de
 * accesibilidad en cualquier estado del deck; (2) la fuente -- el CSS de
 * `ScSlide` ya no declara `visibility` en ninguna de sus reglas; (3) la
 * condicion que hace segura la reversion AQUI -- el enlace de Discord es el
 * UNICO focalizable dentro de las diapositivas Y lleva la compuerta de
 * estado (`[data-state]:not([data-state="current"]) &` -> visibility:
 * hidden); (4) la excepcion de `reduce` -- con todas las diapositivas
 * visibles y en flujo, la compuerta se levanta y el enlace vuelve a ser
 * focalizable (perderlo seria perder la salida de pertenencia de Task 6).
 */
describe("Story: critica #10 hallazgo A -- el deck oscuro existe para tecnologia asistiva y el enlace lleva la compuerta", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  async function slidesDelDeck(): Promise<{
    container: HTMLElement;
    slides: HTMLElement[];
  }> {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    return {
      container,
      slides: Array.from(
        container.querySelectorAll("[data-slide-index]"),
      ) as HTMLElement[],
    };
  }

  it("las STORY_SLIDES diapositivas estan en el arbol de accesibilidad con el deck en reposo", async () => {
    const { slides } = await slidesDelDeck();

    // `isInaccessible` (dom-accessibility-api, el MISMO calculo que usa
    // getByRole) mira display/visibility/aria-hidden/hidden -- NO mira
    // `opacity`, que es la propiedad con la que el deck oculta visualmente.
    // Ese es el punto: invisible a la vista, presente para el lector.
    slides.forEach((slide) => {
      expect(isInaccessible(slide)).toBe(false);
    });
  });

  it("ninguna regla de ScSlide declara visibility (ni en reposo, ni en current, ni bajo reduce)", async () => {
    const { slides } = await slidesDelDeck();

    // Por texto de CSS inyectado acotado al componente, no por
    // getComputedStyle: lo que hay que atar es que la DECLARACION no vuelva
    // en ninguna regla de esta pieza, incluido el bloque @media (regla 36).
    const css = cssRuleTextFor(slides[0]);
    expect(css).toContain("opacity: 0");
    expect(css).not.toContain("visibility");
  });

  it("el enlace de Discord es el UNICO focalizable dentro de las diapositivas, y lleva la compuerta de estado (visibility: hidden fuera de current)", async () => {
    const { slides } = await slidesDelDeck();

    const FOCALIZABLES =
      'a[href], button, input, select, textarea, iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    const focalizables = slides.flatMap((slide) =>
      Array.from(slide.querySelectorAll(FOCALIZABLES)),
    );
    expect(focalizables).toHaveLength(1);
    expect(focalizables[0]).toHaveAttribute("href", links.discord);

    // La compuerta, leida de su regla exacta del CSSOM (cssRuleFor): el
    // selector descendiente de estado que la aplica SOLO fuera de current.
    const gate = cssRuleFor(focalizables[0] as HTMLElement, (sel) =>
      sel.includes(':not([data-state="current"])'),
    );
    expect(gate.style.visibility).toBe("hidden");
  });

  it("bajo prefers-reduced-motion la compuerta se levanta: el enlace vuelve a visibility: visible", async () => {
    const { slides } = await slidesDelDeck();
    const link = slides[slides.length - 1].querySelector("a") as HTMLElement;

    // La regla vive ANIDADA en un @media dentro de la regla de compuerta:
    // se busca el CSSMediaRule real cuyo interior aplica al enlace con el
    // selector de compuerta y declara visible -- sin depender de en que
    // orden concatene styled-components los bloques del componente.
    const classes = Array.from(link.classList);
    const reduceRule = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule)
      .filter((r) => r.conditionText.includes("prefers-reduced-motion"))
      .flatMap((r) => Array.from(r.cssRules))
      .find((r): r is CSSStyleRule => {
        if (!("selectorText" in r)) return false;
        const sel = (r as CSSStyleRule).selectorText ?? "";
        return (
          classes.some((cls) => sel.includes(`.${cls}`)) &&
          sel.includes(':not([data-state="current"])')
        );
      });
    expect(
      reduceRule,
      "no hay regla de reduce que levante la compuerta del enlace",
    ).toBeDefined();
    expect(reduceRule?.style.visibility).toBe("visible");
  });

  /*
   * Bugs inyectados a proposito (regla 34), ejecutados en esta tarea:
   * (a) devolver `visibility: hidden;` al reposo de `ScSlide`
   * (story.deck.tsx) pone en rojo los candados 1 y 2; (b) retirar el bloque
   * de compuerta de `ScDeckNoteLink` (Story.tsx) pone en rojo los candados
   * 3 y 4. Restauradas LAS LINEAS (nunca git checkout), todo vuelve a verde.
   */
});

/*
 * Task 6 (plan `2026-08-10-implementacion-plan-premium-f1-f5`), punto 2:
 * salida de pertenencia. El cierre de Story ofrece un enlace REAL a Discord
 * en las DOS ramas -- `links.discord` (src/config/links.ts), el MISMO
 * destino que ya usan Navbar/Footer (grupo "community" de `NAV_GROUPS`) y
 * las tarjetas del Contact oscuro: cero URLs nuevas. Presencia + destino,
 * como pide el encargo -- el press visual (PRESS.activeScale en :active) se
 * verifica en navegador real (informe de la tarea), no aqui: jsdom no
 * dispara :active.
 */
describe("Story: Task 6, salida de pertenencia -- enlace real a Discord en el cierre (las dos ramas)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("rama clara: #statement ofrece el enlace, con destino/target/rel correctos y el aviso de pestaña nueva en su nombre accesible", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;
    const link = within(statement).getByRole("link", {
      name: `${esHome.Home.story.communityLink} ${esCommon.Common.Nav.newTab}`,
    });

    expect(link).toHaveAttribute("href", links.discord);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("rama oscura: el cierre (#statement, ultima diapositiva) ofrece el MISMO enlace, hermano de ScDeckNote", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const lastSlide = container.querySelector(
      `[data-slide-index="${STORY_SLIDES - 1}"]`,
    ) as HTMLElement;
    // Consulta por DOM plano, NO por rol: el deck arranca en la diapositiva
    // 0, así que la compuerta del enlace (ScDeckNoteLink, crítica #10; antes
    // era la visibility de A1 sobre la diapositiva entera, revertida) lo
    // mantiene oculto y sin nombre accesible -- ver el comentario gemelo más
    // arriba ("Task 15").
    const link = lastSlide.querySelector("a");
    expect(
      link,
      "no hay ningun enlace dentro de la ultima diapositiva",
    ).not.toBeNull();
    expect(link?.textContent).toContain(esHome.Home.story.communityLink);

    expect(link).toHaveAttribute("href", links.discord);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    // Hermano de ScDeckNote, no dentro de el -- el marcado del cierre (la
    // frase en un parrafo, el enlace fuera) no cambia con la Task 15; lo que
    // cambia es de que claves i18n sale la frase.
    expect(
      within(lastSlide).getByText(esHome.Home.story.statement.first, {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(lastSlide.id).toBe("statement");
  });
});

/*
 * Task 4 (plan `2026-08-10-implementacion-plan-premium-f1-f5`): pista de
 * scroll del deck, aria-hidden, que se desvanece con el PRIMER avance
 * reutilizando `data-slide` (`ScStage`) -- SIN listener nuevo (ver el
 * docblock de `ScScrollHint`, `story.deck.tsx`). Misma tecnica de mock de
 * `useSlideDeck` que el describe de arriba ("presentacion de 6
 * diapositivas"): `track.getBoundingClientRect` fijado para que `measure()`
 * (sincrono dentro del `IntersectionObserver` stub) calcule un `progress`
 * exacto, sin depender de ningun redondeo.
 */
describe("Story: Task 4, pista de scroll del deck (tema oscuro)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("aparece aria-hidden, con el texto real de i18n del namespace common (no home)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    expect(hint).toHaveAttribute("aria-hidden", "true");
  });

  it("presencia inicial: opacity 1 mientras data-slide sigue en la diapositiva 0", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    expect(stage).toHaveAttribute("data-slide", "0");
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    expect(getComputedStyle(hint).opacity).toBe("1");
  });

  it("se desvanece (opacity 0) en cuanto el usuario avanza por primera vez -- mock del estado de useSlideDeck, sin listener nuevo", async () => {
    vi.stubGlobal("innerHeight", 800);
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;

    // Geometria de la pista CON cola (STORY_DECK_TAIL_SCREENS), MISMA
    // tecnica que "al mover el indice del hook" en Journey.test.tsx:
    // rect.top fijado para que progress caiga EXACTAMENTE en 1/(N-1) -- la
    // primera diapositiva de pilar, justo tras la intro. measure() corre
    // SINCRONO dentro de start() en cuanto la interseccion se activa.
    const vh = window.innerHeight;
    const height = altoDePista(vh);
    const span = spanDePista(vh);
    const targetIndex = 1;
    const progress = targetIndex / (STORY_SLIDES - 1);
    track.getBoundingClientRect = () =>
      ({ top: -progress * span, height }) as DOMRect;

    act(() => triggerFor(track, true));

    expect(stage).toHaveAttribute("data-slide", String(targetIndex));
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    expect(getComputedStyle(hint).opacity).toBe("0");
  });

  it("opacity es la UNICA propiedad animada (DECK.exitDurationMs + easing.standard), y no se declara bajo prefers-reduced-motion: reduce -- bajo reduce el elemento se retira por completo (display: none)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const hint = screen.getByText(esCommon.Common.Deck.scrollHint);
    const css = cssRuleTextFor(hint);
    const topLevelCss = css.split("@media")[0];

    // Shorthand `transition` sin var()/calc(): jsdom SI la resuelve como
    // cadena literal (mismo caso que el test D7 de este archivo).
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
    // del bloque de reduce (story.deck.tsx, ScScrollHint) este assert se
    // pone en rojo -- la pista se quedaria visible bajo reduce, pese a que
    // "por donde voy dentro del deck" ya no tiene sentido sin pin (ver el
    // informe de la tarea); se restauro para dejar la suite en verde. La
    // animacion, ademas, NO se declara bajo reduce: ninguna `transition`
    // dentro de este bloque.
    expect(reduceBlock).not.toContain("transition");
  });
});

/*
 * Tarea 2 (spec 2026-07-31-story-deck-tipografia-design.md): escala
 * tipografica de cartel de la diapositiva oscura + texto de inspiracion por
 * pilar + frase de cierre con el tramo final acentuado con el mismo
 * tratamiento que "ToInfinite" en el Hero. Desde la Task 15 (2026-08-11) esa
 * frase sale de `Home.story.statement.first/second/third` -- las mismas claves
 * que la rama clara -- y ya no de las `noteLead`/`noteAccent` que esta rama
 * tenia en exclusiva; lo que no cambia es la particion en dos nodos de texto,
 * que es lo que el acento exige. Mismas advertencias de jsdom que el resto del
 * archivo: tamaños por `getComputedStyle` contra la CONSTANTE importada
 * (nunca un literal), `text-wrap: balance` por TEXTO del CSS inyectado.
 */
describe("Story: escala tipografica y texto de inspiracion de la diapositiva (tema oscuro)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("cada diapositiva de pilar muestra su title, su body (subtitulo) y su inspiration", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const slides = Array.from(
      container.querySelectorAll("[data-slide-index]"),
    ) as HTMLElement[];
    const pillarKeys = ["learn", "create", "grow", "practice"] as const;

    pillarKeys.forEach((key, i) => {
      const slide = slides[i + 1];
      expect(
        within(slide).getByText(esHome.Home.story.pillars[key].title),
      ).toBeInTheDocument();
      expect(
        within(slide).getByText(esHome.Home.story.pillars[key].body),
      ).toBeInTheDocument();
      expect(
        within(slide).getByText(esHome.Home.story.pillars[key].inspiration),
      ).toBeInTheDocument();
    });
  });

  it("el h2 de la diapositiva de intro computa STORY_DECK_TITLE_SIZE (constante importada)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelector("h2#story-title")).toBeInTheDocument();
    });
    const title = container.querySelector("h2#story-title") as HTMLElement;
    expect(getComputedStyle(title).fontSize).toBe(STORY_DECK_TITLE_SIZE);
  });

  it("el titulo de la diapositiva de pilar computa STORY_DECK_PILLAR_TITLE_SIZE", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const pillarTitle = screen.getByText(esHome.Home.story.pillars.learn.title);
    expect(getComputedStyle(pillarTitle).fontSize).toBe(
      STORY_DECK_PILLAR_TITLE_SIZE,
    );
  });

  /* Desde la Task 15 la frase del cierre sale de `Home.story.statement.*`,
     las mismas claves que la rama clara -- ver el JSX de `StoryDeckDark`. El
     parrafo se localiza por su primer tramo; el acento, por el tercero. */
  it("la nota de cierre computa STORY_DECK_NOTE_SIZE", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const note = screen.getByText(esHome.Home.story.statement.first, {
      exact: false,
    });
    expect(getComputedStyle(note).fontSize).toBe(STORY_DECK_NOTE_SIZE);
  });

  it("el tramo acentuado esta en un elemento PROPIO, no en el mismo nodo de texto que el resto de la frase", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const note = screen.getByText(esHome.Home.story.statement.first, {
      exact: false,
    });
    const accent = screen.getByText(esHome.Home.story.statement.third);
    expect(accent).not.toBe(note);
    expect(accent.tagName).toBe("SPAN");
  });

  it("la nota declara text-wrap: balance y el cuerpo de pilar (inspiration) NO, en el CSS inyectado", async () => {
    // jsdom no evalua NINGUN efecto de layout de text-wrap (leccion
    // 2026-07-27 repetida en todo este archivo): se ata por TEXTO de la
    // regla inyectada, con el mismo helper que ya usa el resto de la suite.
    //
    // Critica externa #14 (2026-09-02, decision D1): el equilibrado se queda
    // en las piezas de cartel (la nota) y sale del cuerpo acotado por
    // grid.prose, porque con el la prosa realizaba 53,5 caracteres por linea
    // en vez de los 60-75 que el token promete. Las dos mitades se candan a
    // la vez para que nadie vuelva a igualarlas en ningun sentido.
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const inspiration = screen.getByText(
      esHome.Home.story.pillars.learn.inspiration,
    );
    const note = screen.getByText(esHome.Home.story.statement.first, {
      exact: false,
    });

    expect(cssRuleTextFor(note)).toMatch(/text-wrap:\s*balance/);
    expect(cssRuleTextFor(inspiration)).not.toMatch(/text-wrap:\s*balance/);
  });
});

/*
 * Critica externa #12 (2026-08-19). El h2 de Story pintaba
 * `{titleLead}<br /><ScAccent>{titleAccent}</ScAccent>` SIN separador entre
 * las dos mitades, en las DOS ramas. El nombre accesible NO estaba roto --
 * la propia critica lo verifico por CDP: Chrome inserta un espacio al cruzar
 * un `<br>` al calcular AccName -- pero `textContent` concatenaba
 * "curiosidada la creacion", y `Contact.tsx` ya separaba asi las suyas: era
 * la unica inconsistencia con el patron hermano.
 *
 * Se asevera sobre `textContent` con `toBe`, NO con `toHaveTextContent`, que
 * compara por SUBSTRING y habria seguido en verde con el texto pegado
 * (leccion del repo, `task/lessons.md` 2026-08-11). El valor esperado se
 * compone desde el JSON de i18n -- la MISMA fuente que consume el
 * componente -- y no desde el artefacto que el componente produce.
 *
 * Las DOS ramas en el mismo describe porque las dos pintan el MISMO titulo
 * con la misma particion (`DESIGN.md` §4: el contenido no ramifica por tema,
 * solo el vehiculo y el arte). Un arreglo en una sola de ellas volveria a
 * abrir la divergencia que las Tasks 15-16 cerraron.
 */
describe("Story: critica #12 -- el h2 separa sus dos mitades con un espacio real", () => {
  const ESPERADO = `${esHome.Home.story.titleLead} ${esHome.Home.story.titleAccent}`;

  it("rama clara: el textContent del h2 es exactamente titleLead + espacio + titleAccent", () => {
    const { container } = renderWithProviders(<Story />);
    const h2 = container.querySelector("h2#story-title") as HTMLElement;

    expect(h2).not.toBeNull();
    expect(h2.textContent).toBe(ESPERADO);
  });

  it("rama oscura: el textContent del h2 de la diapositiva 0 es el mismo, caracter a caracter", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Story />);
      await waitFor(() => {
        expect(container.querySelector("h2#story-title")).toBeInTheDocument();
      });
      const h2 = container.querySelector("h2#story-title") as HTMLElement;

      expect(h2.textContent).toBe(ESPERADO);
    } finally {
      window.localStorage.clear();
    }
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado en esta tarea: retirar el
   * `{" "}` de `ScTitle` (`Story.tsx`) pone en rojo el primer `it`
   * ("curiosidada la creacion"); retirarlo de `ScDeckTitle`, el segundo. Cada
   * rama tiene su propio candado a proposito: un solo test no habria visto la
   * mitad que faltaba.
   */
});

/*
 * Critica externa #12 (2026-08-19), P2 de contraste: el numeral "04" de la
 * diapositiva de pilar del deck OSCURO (`ScPillarNumber`, 14px/700,
 * `secondary[700]` = `oklch(0.53 0.212 311.928)`) daba 3.01:1 sobre el pixel
 * real de la escena bajo esa diapositiva -- el UNICO fallo de contraste en los
 * ~110 elementos que la critica audito. El arreglo y por que se mueven los
 * TRES escalones de `secondary` y no solo el que fallaba viven en el docblock
 * de `pillarAccent` (`Story.tsx`).
 *
 * Se mide contra los TRES fondos que esta rama tiene medibles por codigo,
 * mismo criterio que el candado del rail de Journey (describe "critica #10
 * hallazgo A") y que el de `ScQuoteText`: jsdom no compone las 11 capas WebP
 * de `StoryCosmicBeing`, asi que lo mas cercano al pixel real que existe en el
 * repo es (1) el pixel que MIDIO la critica, (2) el void declarado de la
 * escena y (3) `semantic.bg`, que es lo que asoma donde la escena no cubre.
 *
 * El test NO compara el acento con un color esperado escrito a mano -- eso
 * seria la tautologia de `task/lessons.md` 2026-08-11 (el valor esperado se
 * moveria con el defecto): MIDE el ratio del color que el componente pinta de
 * verdad, asi que cualquier escalon que no libre AA lo pone en rojo, venga de
 * donde venga.
 */
describe("Story: critica #12 -- el numeral de pilar del deck oscuro libra AA sobre la escena", () => {
  /* Pixel MEDIDO por la critica externa #12 bajo la diapositiva 04 (la escena
     compuesta, no un token): el dato mas cercano al render real que existe.
     Vive en el test y no en `src/` a proposito -- no es un color del sistema,
     es una observacion. */
  const PIXEL_MEDIDO_CRITICA_12 = "#280739";
  const AA = 4.5;

  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it.each([0, 1, 2, 3])(
    "el acento del pilar %i libra 4.5:1 sobre el pixel medido, el void de la escena y semantic.bg",
    (index) => {
      const acento = pillarAccent(basicDarkTheme.palette, index);

      const sobrePixel = contrastRatioHex(acento, PIXEL_MEDIDO_CRITICA_12);
      const sobreVoid = contrastRatioHex(acento, STORY_COSMIC_BEING_VOID);
      const sobreBg = contrastRatio(acento, basicDarkTheme.semantic.bg);

      expect(
        sobrePixel,
        `pixel medido: ${sobrePixel.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        sobreVoid,
        `void de la escena: ${sobreVoid.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        sobreBg,
        `semantic.bg: ${sobreBg.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA);
    },
  );

  /*
   * Sonda de NO-VACUIDAD: el umbral de arriba tiene que ser capaz de fallar.
   * El escalon que la critica midio (`secondary[700]`, el que este arreglo
   * retira) sigue incumpliendo sobre el mismo pixel -- si algun dia esta
   * asercion se pusiera en verde, el modelo de medicion habria dejado de
   * describir el defecto y el candado de arriba dejaria de proteger nada.
   */
  it("el escalon retirado (secondary[700]) SIGUE incumpliendo sobre el mismo pixel: el umbral no es vacuo", () => {
    const ratio = contrastRatioHex(
      basicDarkTheme.palette.secondary[700],
      PIXEL_MEDIDO_CRITICA_12,
    );
    expect(ratio, `secondary[700]: ${ratio.toFixed(2)}:1`).toBeLessThan(AA);
  });

  /*
   * Que el COMPONENTE consuma de verdad el acento que se mide arriba: sin
   * esta mitad, las cifras seguirian saliendo bien aunque `ScPillarNumber`
   * hubiera vuelto a pintar otro escalon (regla 38 -- contra el token
   * importado, nunca contra una cadena a mano). Los cuatro numerales, no solo
   * el 04: el arreglo movio tres escalones.
   */
  it("los cuatro numerales pintan EXACTAMENTE el acento medido (CSS inyectado, no un color suelto)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });

    [0, 1, 2, 3].forEach((index) => {
      const numeral = screen.getByText(`0${index + 1}`);
      expect(cssRuleTextFor(numeral)).toContain(
        `color: ${pillarAccent(basicDarkTheme.palette, index)}`,
      );
    });
  });

  /*
   * DOS bugs inyectados a proposito (regla 34), ejecutados en esta tarea --
   * dos, y no uno, porque cada mitad del candado protege una propiedad
   * distinta y el primer sabotaje NO pone en rojo la segunda:
   *
   * (a) devolver `palette.secondary[700]` al cuarto pilar de `pillarAccent`
   *     (`Story.tsx`) pone en rojo el caso `%i = 3` del primer `it`, con la
   *     cifra exacta de la critica ("pixel medido: 3.01:1"). El candado de CSS
   *     inyectado sigue en VERDE con este sabotaje, y es correcto que asi sea:
   *     el componente y el test leen la misma funcion, asi que lo que ese
   *     candado vigila es que no DIVERJAN, no cual es el valor.
   * (b) cambiar el `color` de `ScPillarNumber` por otro token
   *     (`semantic.textMuted`) pone en rojo el candado de CSS inyectado -- la
   *     divergencia que (a) no puede ver.
   *
   * Restaurados los dos, los seis `it` de este describe vuelven a verde.
   */
});

/*
 * Critica externa #12 (2026-08-19), dimension 4 de Craft: el rail del deck de
 * Story seguia siendo un `div` `aria-hidden` con seis `span` decorativos --
 * "por donde vas" sin poder ir a ningun sitio -- mientras el de Journey ya era
 * operable desde la critica #10 (commit f9cf823). Dos railes con dos contratos
 * distintos en la misma pagina.
 *
 * Este describe es el GEMELO del de Journey ("critica #10 hallazgo A -- el
 * rail del deck es operable"), caso por caso y con la misma aritmetica de
 * pista, porque lo que se exige es exactamente el mismo contrato. La
 * divergencia que esta cabecera declaraba (grupo sin nombre por falta de
 * clave) se cerro en la integracion de la ola H: `Home.story.railLabel`
 * existe y el grupo se localiza POR ese nombre en railDeck() -- si el rotulo
 * desaparece o cambia de clave, todos los casos de este describe caen.
 */
describe("Story: critica #12 -- el rail del deck es operable (tema oscuro)", () => {
  const VH = 800;
  const PILLAR_KEYS = ["learn", "create", "grow", "practice"] as const;

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
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    // La pista se fija ANTES de avisar al observer para que `measure()`
    // calcule un progress exacto (misma tecnica que el resto de describes de
    // este fichero y que el gemelo de Journey).
    track.getBoundingClientRect = () =>
      ({
        top: 0,
        height: altoDePista(VH),
      }) as DOMRect;
    const grupo = screen.getByRole("group", {
      name: esHome.Home.story.railLabel,
    });
    return {
      track,
      botones: within(grupo).getAllByRole("button"),
    };
  }

  it("el rail es un grupo con nombre de i18n, y NO esta oculto del arbol de accesibilidad", async () => {
    const { botones } = await railDeck();
    const grupo = screen.getByRole("group", {
      name: esHome.Home.story.railLabel,
    });

    expect(grupo).not.toHaveAttribute("aria-hidden");
    expect(botones).toHaveLength(STORY_SLIDES);
  });

  /*
   * El nombre de cada boton es el TITULO de su diapositiva, derivado de las
   * MISMAS claves de i18n que esa diapositiva pinta -- no de una segunda
   * fuente de copia. El valor esperado se compone aqui desde el JSON, no desde
   * el helper del componente: si `slideName` empezara a nombrar otra cosa,
   * este candado tiene que verlo (leccion `task/lessons.md` 2026-08-11).
   */
  it("cada marca es un boton con type=button y el nombre de la diapositiva a la que lleva", async () => {
    const { botones } = await railDeck();
    const esperados = [
      `${esHome.Home.story.titleLead} ${esHome.Home.story.titleAccent}`,
      ...PILLAR_KEYS.map((key) => esHome.Home.story.pillars[key].title),
      [
        esHome.Home.story.statement.first,
        esHome.Home.story.statement.second,
        esHome.Home.story.statement.third,
      ].join(" "),
    ];

    expect(esperados).toHaveLength(STORY_SLIDES);
    botones.forEach((boton, i) => {
      expect(boton).toHaveAttribute("type", "button");
      expect(boton).toHaveAccessibleName(esperados[i]);
    });
  });

  it("aria-current marca UNA sola diapositiva y sigue al index del hook", async () => {
    const { track, botones } = await railDeck();

    act(() => triggerFor(track, true));
    expect(
      botones.filter((b) => b.getAttribute("aria-current") === "true"),
    ).toHaveLength(1);
    expect(botones[0]).toHaveAttribute("aria-current", "true");

    // span = alto - vh - cola*vh = (STORY_SLIDES - 1) * recorrido; un
    // progress de 3/(STORY_SLIDES - 1) pone el index en 3.
    const span = spanDePista(VH);
    track.getBoundingClientRect = () =>
      ({
        top: -(span * 3) / (STORY_SLIDES - 1),
        height: altoDePista(VH),
      }) as DOMRect;
    // Salir y volver a entrar, no un segundo aviso de entrada: `start()` lleva
    // guarda de reentrada, asi que sin el `false` de en medio este segundo
    // trigger no mediria nada.
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
    //   span = alto - VH - cola * VH = (STORY_SLIDES - 1) * recorrido
    //   top(k) = k / (STORY_SLIDES - 1) * span = k * recorrido
    const span = spanDePista(VH);
    [0, 3, STORY_SLIDES - 1].forEach((k) => {
      scrollTo.mockClear();
      act(() => {
        botones[k].click();
      });
      expect(scrollTo).toHaveBeenCalledWith({
        top: (k / (STORY_SLIDES - 1)) * span,
        behavior: "smooth",
      });
    });
  });

  it("bajo prefers-reduced-motion el salto es instantaneo, nunca animado", async () => {
    const { botones } = await railDeck();
    const scrollTo = window.scrollTo as unknown as ReturnType<typeof vi.fn>;

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
    // linea las cifras seguirian saliendo bien aunque el reposo del boton
    // hubiera vuelto a `semantic.border` (regla 38).
    expect(cssRuleTextFor(botones[0])).toContain(
      `color: ${basicDarkTheme.semantic.borderStrong}`,
    );

    const ratio = contrastRatioHex(
      basicDarkTheme.semantic.borderStrong,
      STORY_COSMIC_BEING_VOID,
    );
    expect(ratio, `void: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);

    // Sonda de no-vacuidad: el punto ANTERIOR incumplia 1.4.11 de verdad, y la
    // pieza que lo hundia era la OPACIDAD, no el token de color. La
    // composicion se calcula sobre la LUMINANCIA directamente, y eso es
    // exacto: la luminancia relativa es una combinacion LINEAL de los canales
    // lineales, asi que mezclar canales al 40% y mezclar luminancias al 40%
    // dan el mismo numero.
    const yPunto = relativeLuminance(basicDarkTheme.semantic.border);
    const yVoid = relativeLuminanceHex(STORY_COSMIC_BEING_VOID);
    const yCompuesto = 0.4 * yPunto + 0.6 * yVoid;
    const ratioAntes =
      (Math.max(yCompuesto, yVoid) + 0.05) /
      (Math.min(yCompuesto, yVoid) + 0.05);
    expect(
      ratioAntes,
      `punto inactivo anterior: ${ratioAntes.toFixed(2)}:1`,
    ).toBeLessThan(3);

    expect(basicDarkTheme.semantic.brand).not.toBe(
      basicDarkTheme.semantic.borderStrong,
    );
  });

  it("la diana del boton mide space[5] (24px, WCAG 2.5.8) aunque el punto siga midiendo space[2]", async () => {
    const { botones } = await railDeck();
    const css = cssRuleTextFor(botones[0]);

    expect(css).toContain(`width: ${basicDarkTheme.space[5]}`);
    expect(css).toContain(`height: ${basicDarkTheme.space[5]}`);
    // El punto, en el pseudo-elemento, conserva su medida original.
    const before = css.slice(css.indexOf("::before"));
    expect(before).toContain(`width: ${basicDarkTheme.space[2]}`);
    // Y ya no hay ninguna opacidad recortando el inactivo.
    expect(css).not.toContain("opacity: 0.4");
  });

  /*
   * TRES bugs inyectados a proposito (regla 34), ejecutados en esta tarea y
   * anotados DESPUES de ver cada rojo (leccion `task/lessons.md` 2026-08-17
   * bis) -- uno por candado que no se puede validar por construccion:
   *
   * (a) devolver `background-color: semantic.border` + `opacity: 0.4` al
   *     reposo de `ScRailMark` (`story.deck.tsx`) pone en rojo LOS DOS
   *     candados de CSS: el de contraste ("expected ... to contain
   *     'color: oklch(0.53 0 286)'") y el de la diana ("not to contain
   *     'opacity: 0.4'").
   * (b) retirar `aria-current` del JSX del rail (`Story.tsx`) pone en rojo el
   *     candado de estado ("expected [] to have a length of 1").
   * (c) hacer que `slideName` devuelva siempre el primer pilar pone en rojo el
   *     candado de nombres -- el que garantiza que cada boton nombra SU
   *     diapositiva y no otra.
   *
   * Restaurados los tres, los siete `it` de este describe vuelven a verde.
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
 * Dos propiedades distintas, un candado cada una:
 * 1. `story.layers.ts` deriva su tope de contenido del token en vez de
 *    declarar el numero a mano (era una de las cuatro copias del mismo 1280).
 * 2. `Story.tsx` deja de leer `grid.navMax` -- el tope de la PILDORA del
 *    navbar -- como ancho de contenido de la seccion clara, contra el docblock
 *    del propio `navMax`.
 */
describe("Story: critica #12 -- el tope de contenido sale de grid.sectionMax (candado de fuente)", () => {
  async function leerFuente(...segments: string[]): Promise<string> {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(here, ...segments), "utf-8");
  }

  /*
   * Despoja comentarios ANTES de buscar, mismo motivo que `Hero.qa.test.tsx`
   * (`task/lessons.md` 2026-08-11): que una cita en prosa de un docblock no
   * gane la busqueda, y sobre todo que una linea COMENTADA no pueda pasar por
   * linea activa.
   */
  function despojarComentarios(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  it("story.layers.ts no escribe el numero a mano: STORY_DARK_MAX_WIDTH deriva del token", async () => {
    const source = despojarComentarios(await leerFuente("story.layers.ts"));

    expect(source).not.toContain("1280px");
    expect(source).toContain("STORY_DARK_MAX_WIDTH = grid.sectionMax");
  });

  it("Story.tsx no lee grid.navMax: el ancho de contenido de la rama clara cuelga de grid.sectionMax", async () => {
    const source = despojarComentarios(await leerFuente("Story.tsx"));

    expect(source).not.toContain("grid.navMax");
    // Recuento CERRADO (regla 39/40): una sola medida de seccion en este
    // fichero. Si manana aparece otra, o vuelve un literal, este numero deja de
    // cuadrar y hay que decidirlo a mano en vez de dejarlo pasar.
    expect(source.match(/theme\.data\.grid\.sectionMax/g)?.length ?? 0).toBe(1);
  });

  /*
   * Bug inyectado a proposito (regla 34), ejecutado en esta tarea: devolver
   * `max-width: ${theme.data.grid.navMax}` a la rama clara de `ScStory`
   * (`Story.tsx`) pone en rojo el segundo `it` por sus DOS aserciones (aparece
   * `grid.navMax`, y el recuento de `sectionMax` baja a 0); restaurado, vuelve
   * a verde. El primero se valida igual devolviendo el literal `"1280px"` a
   * `story.layers.ts`.
   */
});

/*
 * Critica externa #13 (2026-08-19), P0 de la ronda: WCAG 2.1 SC 1.4.4 (AA)
 * exige que ampliar el tamano de fuente hasta el 200% no pierda contenido ni
 * funcionalidad. Medido en Chrome real a 390x844 con la raiz forzada a 32px:
 * la pista unica de `ScGrid` valia 480px dentro de una caja de 294px y el
 * cuerpo de Story terminaba en x=528 sobre un viewport de 390, sin ningun
 * scroll horizontal que lo recuperase -- `html` declara `overflow-x: clip`
 * (GlobalStyles, deliberado por el pin `sticky` de los decks, regla 21), asi
 * que el sobrante es texto PERDIDO, no texto desplazado.
 *
 * La causa es siempre la misma y tiene nombre propio en la especificacion de
 * Grid: el TAMANO MINIMO AUTOMATICO. `1fr` es `minmax(auto, 1fr)`, y ese
 * `auto` vale el min-content de lo que la pista contiene; una pista implicita
 * de tamano `auto` (la que crea un grid sin `grid-template-columns`) tiene el
 * mismo minimo. Cuando la raiz escala, el min-content del texto crece y la
 * pista crece con el POR ENCIMA de su contenedor. `minmax(0, ...)` levanta
 * ese suelo sin tocar el reparto de fracciones; y un suelo escrito en `rem`
 * (el `minmax(15rem, 1fr)` de `ScPillarGrid`) necesita ademas envolverse en
 * `min(..., 100%)`, porque escala con la raiz por definicion.
 *
 * POR QUE EL CANDADO ES DE CSSOM Y NO DE GEOMETRIA: jsdom no hace layout
 * (`getBoundingClientRect()` devuelve ceros), asi que la propiedad medida en
 * navegador -- "ningun elemento termina mas alla del viewport" -- no es
 * observable aqui por construccion. Lo que si es observable es la DECLARACION:
 * que la culpable ya no exista y que la nueva este presente en la regla real
 * que styled-components inyecta. La verificacion geometrica es de navegador
 * (regla 44) y esta en el informe de la tarea.
 */
describe("Story: critica #13 -- ampliar la fuente no recorta texto (SC 1.4.4)", () => {
  /* Regla BASE (fuera de cualquier @media) que declara una propiedad para un
     elemento. Mismo patron que `Features.test.tsx` ya usa para su ScGrid:
     jsdom no evalua `@media`, asi que el bloque de lg convive en el mismo
     texto y hay que descartarlo por linea antes de afirmar sobre la base. */
  function declaracionBase(el: HTMLElement, prop: string): string | undefined {
    return cssRuleTextFor(el)
      .split("\n")
      .find((line) => !line.includes("@media") && line.includes(prop));
  }

  it("ScStory declara overflow-wrap: break-word, que se hereda a todo el texto de las dos ramas", () => {
    renderWithProviders(<Story />);
    const section = document.getElementById("story") as HTMLElement;
    expect(declaracionBase(section, "overflow-wrap")).toMatch(
      /overflow-wrap:\s*break-word/,
    );
  });

  it("ScGrid acota el minimo de su pista con minmax(0, 1fr) y no deja ningun 1fr suelto", () => {
    renderWithProviders(<Story />);
    /*
     * DOS saltos, no uno (critica #15, hallazgo C10): entre `#story` y
     * `ScGrid` vive ahora `ScStoryInner`, el div que se quedo con la caja
     * acotada de la rama clara (relleno, tope de ancho y centrado) cuando
     * `#statement` paso a ser hijo de `#story` tambien en claro. La cadena
     * completa es `#story` -> `ScStoryInner` -> `ScGrid`, y se recorre a mano
     * a proposito: es lo que pone en rojo este test si alguien vuelve a mover
     * la caja, en vez de dejarlo pasar con un `querySelector` que encuentre el
     * grid este donde este.
     */
    const grid = document.getElementById("story")!.firstElementChild!
      .firstElementChild as HTMLElement;
    const base = declaracionBase(grid, "grid-template-columns");

    expect(base).toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/,
    );
    // El bug que se persigue es EXACTAMENTE el `1fr` sin minmax: se afirma su
    // ausencia con un negativo que no puede satisfacerse por vacuidad (la
    // linea existe y contiene la propiedad, solo cambia su valor).
    expect(base).not.toMatch(/grid-template-columns:\s*1fr\s*;/);
  });

  it("ScPillarGrid envuelve su suelo en rem con min(..., 100%): el suelo no puede superar el ancho real", () => {
    const { container } = renderWithProviders(<Story />);
    // ScCardTitle (p) -> ScPillarCard -> ScPillarCardItem -> ScPillarGrid.
    const title = screen.getByText(esHome.Home.story.pillars.learn.title);
    const pillarGrid = title.parentElement!.parentElement!
      .parentElement as HTMLElement;
    const base = declaracionBase(pillarGrid, "grid-template-columns");

    expect(base).toMatch(
      /minmax\(\s*min\(\s*15rem\s*,\s*100%\s*\)\s*,\s*1fr\s*\)/,
    );
    // El suelo desnudo (el que medimos desbordando a 480px con la raiz al
    // 200%) ya no existe en la regla.
    expect(base).not.toMatch(/minmax\(\s*15rem\s*,/);
    expect(container).toBeTruthy();
  });

  it("rama oscura: ScDeck declara su pista en vez de heredar una implicita de tamano auto", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      renderWithProviders(<Story />);
      await waitFor(() => {
        expect(
          screen.getByText(esHome.Home.story.titleAccent),
        ).toBeInTheDocument();
      });
      // ScSlide (la diapositiva que contiene el titulo) cuelga directamente
      // de ScDeck: h2 -> ScSlide -> ScDeck.
      const deck = document.getElementById("story-title")!.parentElement!
        .parentElement as HTMLElement;
      const base = declaracionBase(deck, "grid-template-columns");

      expect(base).toMatch(
        /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/,
      );
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * Critica externa #13 (2026-08-19): la tarjeta fantasma de la rama clara.
 *
 * Las cuatro tarjetas de pilar se pintaban blanco puro (`semantic.surface`)
 * sobre una pagina casi identica (`semantic.bg`) -- 1.044:1 -- y su unica
 * delimitacion era un filete de `semantic.border` que daba 1.124:1 contra la
 * propia tarjeta. No leian como tarjetas.
 *
 * Este candado mide el contraste REAL del borde renderizado (lee el color de
 * la caja, no una tabla copiada en el test) y exige que cruce el 3:1 de WCAG
 * 1.4.11, el unico umbral objetivo que existe para un limite no textual. Mide
 * ademas el listón anterior para que la mejora quede escrita en cifras y no
 * en adjetivos.
 */
describe("Story: critica #13 -- las tarjetas de pilar se distinguen de la pagina", () => {
  function tarjetaDePilar(): HTMLElement {
    // ScCardTitle (p) -> ScPillarCard.
    return screen.getByText(esHome.Home.story.pillars.learn.title)
      .parentElement as HTMLElement;
  }

  it("el borde renderizado sale de palette.neutral[600], no del rol semantic.border", () => {
    renderWithProviders(<Story />);
    const borde = getComputedStyle(tarjetaDePilar()).borderTopColor;

    expect(borde).toBe(basicLightTheme.palette.neutral[600]);
    expect(borde).not.toBe(basicLightTheme.semantic.border);
  });

  it("ese borde cruza el 3:1 de WCAG 1.4.11 contra la tarjeta, y mejora el liston anterior", () => {
    renderWithProviders(<Story />);
    const borde = getComputedStyle(tarjetaDePilar()).borderTopColor;
    const fondoTarjeta = getComputedStyle(tarjetaDePilar()).backgroundColor;

    // Contra la superficie de la propia tarjeta: 3.111:1.
    const contraTarjeta = contrastRatio(borde, fondoTarjeta);
    expect(contraTarjeta).toBeGreaterThanOrEqual(3);

    // Contra la pagina que hay detras: 2.980:1 -- se afirma la cifra medida,
    // no un 3 que no alcanza. La separacion la garantiza el borde contra la
    // tarjeta; contra la pagina el mismo filete queda a un pelo del umbral y
    // eso se declara en vez de redondearse hacia arriba.
    const contraPagina = contrastRatio(borde, basicLightTheme.semantic.bg);
    expect(contraPagina).toBeGreaterThan(2.9);

    // El liston anterior, medido aqui mismo para que la mejora sea auditable:
    // semantic.border daba 1.124:1 contra la tarjeta.
    const antes = contrastRatio(basicLightTheme.semantic.border, fondoTarjeta);
    expect(antes).toBeLessThan(1.2);
    expect(contraTarjeta).toBeGreaterThan(antes * 2.5);

    // Y semantic.borderStrong, el rol que el sistema ofrece como borde
    // fuerte, tampoco habria cruzado el umbral (2.004:1) -- el motivo por el
    // que esta tarjeta lee un paso de palette y no ese rol.
    expect(
      contrastRatio(basicLightTheme.semantic.borderStrong, fondoTarjeta),
    ).toBeLessThan(3);
  });
});

/*
 * CRITICA EXTERNA #15, hallazgo C10: `#statement` cambiaba de ANIDAMIENTO
 * segun el tema. En claro era una `<section>` HERMANA de `#story`; en oscuro,
 * la ultima diapositiva del deck, es decir una hija de `#story`. Misma pieza,
 * mismo id, mismo contenido, dos estructuras de documento -- exactamente lo
 * que la decision D-C ("tema = piel con contenido unificado") no admite, y una
 * divergencia que ningun candado veia: `HomeSections.test.tsx` afirma el ORDEN
 * de las secciones (`querySelectorAll` devuelve orden de documento, que anidar
 * no altera), no su jerarquia.
 *
 * Se unifico hacia la forma ANIDADA -- el porque completo, con las tres
 * razones medidas, vive en el docblock de `ScStatement` (`Story.tsx`). Este es
 * su candado, y se afirma sobre la PROPIEDAD, no sobre la implementacion de
 * cada rama: la seccion con id que CONTIENE a `#statement` es `#story`, en los
 * dos temas. Escrito asi tolera que cada rama meta las capas intermedias que
 * quiera (en claro `ScStoryInner`; en oscuro pista, stage, deck y diapositiva)
 * sin dejar de detectar el unico fallo que persigue: que una de las dos vuelva
 * a sacar el cierre fuera de Story.
 *
 * Validado con bug inyectado (ver el informe de la entrega para el rojo
 * literal): devolviendo `StoryLight` a la forma hermana (fragmento con
 * `ScStory` y `ScStatement` al mismo nivel), el caso claro se pone en rojo
 * porque `closest` no encuentra ninguna seccion contenedora.
 */
describe("Story: critica #15 (C10) -- #statement cuelga de #story en los DOS temas", () => {
  /** La `<section>` con id que CONTIENE a `#statement`, sin contarlo a el. */
  function seccionContenedora(): HTMLElement | null {
    const statement = document.getElementById("statement");
    expect(statement, "no se encontro #statement").not.toBeNull();
    return statement!.parentElement!.closest("section[id]");
  }

  it("rama clara: #statement esta dentro de #story", () => {
    renderWithProviders(<Story />);

    expect(seccionContenedora()?.id).toBe("story");
  });

  it("rama oscura: #statement esta dentro de #story, igual que en claro", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(
        container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse",
      ).toBeGreaterThan(0);
    });

    expect(seccionContenedora()?.id).toBe("story");
    window.localStorage.clear();
  });
});

/*
 * Critica externa #16, decision del dueno: «hacer visible el rotulo del paso
 * activo en el rail». El evaluador de Nielsen midio que el progreso del deck
 * oscuro existia SOLO como puntos mudos para quien ve -- la senal de posicion
 * en palabras vivia en un `VisuallyHidden` -- frente al tema claro, que
 * entrega esa misma informacion como una linea temporal con nombres.
 *
 * Lo que estos candados atan es lo que jsdom SI puede observar: que el rotulo
 * existe, que dice el indice del hook y el total derivado de `STORY_SLIDES`,
 * que sigue al hook cuando el deck avanza, que NO entra en el arbol de
 * accesibilidad (o reabriria el defecto de doble numeracion que la critica #12
 * retiro de Journey) y que su tinta libra AA sobre la escena. Lo que NO puede
 * observar -- que la fraccion apilada no ensancha la columna del rail -- se
 * mide en navegador y se reporta con cifras.
 */
describe("Story: critica #16 -- el rail dice visualmente por donde va el deck", () => {
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
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    track.getBoundingClientRect = () =>
      ({ top: 0, height: altoDePista(VH) }) as DOMRect;
    const grupo = screen.getByRole("group", {
      name: esHome.Home.story.railLabel,
    });
    return { track, grupo, rotulo: grupo.querySelector("p") as HTMLElement };
  }

  it("el rail lleva un rotulo con la parada activa y el total, derivado de STORY_SLIDES", async () => {
    const { rotulo } = await railConRotulo();

    expect(rotulo, "el rail no tiene rotulo de posicion").not.toBeNull();
    // En reposo el deck esta en la diapositiva 0, que se rotula como 1.
    expect(rotulo).toHaveTextContent(`1${STORY_SLIDES}`);
  });

  it("el rotulo sigue al index del hook cuando el deck avanza", async () => {
    const { track, rotulo } = await railConRotulo();

    // Mismo mecanismo que el resto de este fichero: se fija rect.top para que
    // `progress` caiga exactamente en 3/(N-1) y `measure()` corra sincrono
    // dentro de `start()`.
    track.getBoundingClientRect = () =>
      ({
        top: -(spanDePista(VH) * 3) / (STORY_SLIDES - 1),
        height: altoDePista(VH),
      }) as DOMRect;
    act(() => triggerFor(track, true));

    expect(rotulo).toHaveTextContent(`4${STORY_SLIDES}`);
  });

  it("el rotulo NO se anuncia: es el gemelo visual de una senal que ya existe, y dos numeraciones habladas es el defecto que la critica #12 retiro", async () => {
    const { grupo, rotulo } = await railConRotulo();

    expect(rotulo).toHaveAttribute("aria-hidden", "true");
    expect(isInaccessible(rotulo)).toBe(true);
    // Y el contenido accesible del grupo sigue siendo EXACTAMENTE los botones
    // que la critica #12 dejo: ni un control ni un texto nuevo.
    expect(within(grupo).getAllByRole("button")).toHaveLength(STORY_SLIDES);
  });

  it("el rotulo se apila en columna: es lo que impide que ensanche la banda del rail y se coma el canal de la copia", async () => {
    const { rotulo } = await railConRotulo();
    const css = cssRuleTextFor(rotulo);

    // La direccion de la fraccion NO es una preferencia estetica: el canal que
    // ScDeck reserva a la derecha se calcula sumando el ancho de la diana del
    // rail (space[5]), asi que un rotulo en linea -- mas ancho que la diana --
    // dejaria ese calculo corto justo en los anchos donde se midio el
    // hallazgo L1.
    expect(css).toContain("flex-direction: column");
    expect(css).toContain("font-variant-numeric: tabular-nums");
  });

  it("la tinta del rotulo sale de la escala tipografica del sistema, no de un tamano suelto", async () => {
    const { rotulo } = await railConRotulo();
    const css = cssRuleTextFor(rotulo);

    // Contra el token importado, nunca contra una cadena a mano (regla 38).
    expect(css).toContain(
      `font-size: ${basicDarkTheme.type.scale.caption.size}`,
    );
    expect(css).toContain(`color: ${basicDarkTheme.semantic.textMuted}`);
  });

  it("las dos tintas del rotulo libran AA (4.5:1) sobre el void real de la escena", async () => {
    await railConRotulo();

    // `caption` mide 0.75rem: es texto pequeno, asi que el liston es 4.5:1 y
    // no 3:1. Se mide contra el void de StoryCosmicBeing -- el color real que
    // hay detras del rail, no `semantic.bg`.
    const numerador = contrastRatioHex(
      basicDarkTheme.semantic.text,
      STORY_COSMIC_BEING_VOID,
    );
    const denominador = contrastRatioHex(
      basicDarkTheme.semantic.textMuted,
      STORY_COSMIC_BEING_VOID,
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
 * Critica externa #16, hallazgo L1 (= hallazgo 2 de Craft): el rail flota
 * sobre la copia, no sobre un margen. Medido en oscuro a 390 px, la banda del
 * rail ocupaba x=342-366 y la caja de contenido del deck llegaba a x=358, con
 * lineas de glifos entrando dentro de la banda y `elementsFromPoint` sobre
 * ella devolviendo el boton del rail por encima del parrafo.
 *
 * Lo que se ata aqui es la DERIVACION del canal, no su valor: jsdom no hace
 * layout, asi que la unica forma de que este candado signifique algo es
 * comprobar que el padding se calcula desde la misma geometria del rail que
 * tendria que moverse con el. La comprobacion de que ninguna caja de glifo
 * cruza la banda se hace en navegador, con `Range` por caracter, y se reporta
 * con cifras.
 */
describe("Story: critica #16 -- la copia del deck reserva el canal del rail", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  async function deckOscuro(): Promise<HTMLElement> {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    return container.querySelector("[data-slide-index]")!
      .parentElement as HTMLElement;
  }

  it("ScDeck declara padding-inline-end como la suma del inset del rail, su diana y el canal libre", async () => {
    const css = cssRuleTextFor(await deckOscuro());
    const { space } = basicDarkTheme;

    // Espacios normalizados: styled-components conserva los saltos de linea
    // del template dentro del `calc()`, y lo que se afirma es la SUMA, no como
    // esta formateada.
    const plano = css.replace(/\s+/g, " ");
    // Los tres sumandos, cada uno leido de su token (regla 38): el inset del
    // rail, la diana de la marca y el canal libre.
    expect(plano).toContain(
      `padding-inline-end: calc( ${space[5]} + ${space[5]} + ${space[2]} )`,
    );
  });

  it("la suma reservada cubre la banda del rail mas el canal de 8 px que el hallazgo fija como umbral, y no mas", () => {
    // Aritmetica sobre los MISMOS tokens que el CSS interpola, en px. El
    // hallazgo pide que ninguna caja de glifo cruce rail.left - 8 px: con la
    // caja de contenido terminando justo ahi, el texto no puede cruzarlo
    // porque no desborda su caja. Y se ata tambien el techo: la primera
    // version reservaba 96 px y dejaba la copia en 25-36 caracteres por
    // linea a 390 (frente a 38-46 en la rama clara); cada pixel de mas se
    // paga en medida de lectura. Sin esta asercion el candado de arriba solo
    // diria que hay una suma, no que la suma sea la justa.
    const rem = 16;
    const px = (valor: string): number => parseFloat(valor) * rem;
    const { space } = basicDarkTheme;
    const bandaDelRail = px(space[5]) + px(space[5]);
    const reservado = bandaDelRail + px(space[2]);

    expect(bandaDelRail).toBe(48);
    expect(reservado).toBe(56);
    expect(reservado - bandaDelRail).toBe(8);
  });

  /*
   * La otra mitad del canal: reservar 56 px a la derecha dejaba la copia del
   * pilar en 246 px a 390 (302 de caja menos los 56 de la columna del numero
   * mas su gap) -- 31 caracteres por linea a 16 px, medidos con Range por
   * caracter, cuando el encargo pide conservar >= 38. La fila del deck apila
   * el numero sobre la copia por debajo de sm y restaura las dos columnas de
   * ScPillarRow desde sm. Lo que se ata: la FORMA de la cascada (base de dos
   * columnas, extension del deck a una, sm de vuelta a dos) y que el ancho de
   * la columna restaurada sea el MISMO que declara la base -- leido de la
   * constante con nombre, no de un literal repetido (regla 13/41 de RULES.md:
   * la invariante entre las dos declaraciones vive aqui, no en la memoria).
   */
  it("ScDeckPillarRow apila el numero sobre la copia por debajo de sm y restaura desde sm la columna de ScPillarRow con el mismo ancho con nombre", async () => {
    const deck = await deckOscuro();
    const fila = deck.querySelector('[data-slide-index="1"]')!
      .firstElementChild as HTMLElement;
    const classes = Array.from(fila.classList);
    const aplica = (selectorText: string): boolean =>
      classes.some((cls) => selectorText.includes(`.${cls}`));
    const reglas = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    });
    const columnasDe = (regla: CSSRule): string | null =>
      "selectorText" in regla && aplica((regla as CSSStyleRule).selectorText)
        ? (regla as CSSStyleRule).style.getPropertyValue(
            "grid-template-columns",
          ) || null
        : null;

    // Nivel superior, en orden de hoja: la base de ScPillarRow (dos columnas)
    // y DESPUES la extension del deck (una sola pista). El orden es la
    // cascada: si la extension precediera a la base, la base ganaria.
    const nivelSuperior = reglas
      .map(columnasDe)
      .filter((v): v is string => v !== null);
    expect(nivelSuperior).toEqual([
      `${STORY_PILLAR_NUMBER_COLUMN} minmax(0, 1fr)`,
      "minmax(0, 1fr)",
    ]);

    // Y dentro del @media de sm (jsdom no lo evalua: se lee del CSSOM, regla
    // 36), la fila vuelve a las dos columnas con el ancho de la constante.
    const enSm = reglas
      .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule)
      .filter((r) => r.conditionText.includes(basicDarkTheme.breakPoint.sm))
      .flatMap((r) => Array.from(r.cssRules))
      .map(columnasDe)
      .filter((v): v is string => v !== null);
    expect(enSm).toEqual([`${STORY_PILLAR_NUMBER_COLUMN} minmax(0, 1fr)`]);
  });
});

/*
 * Critica externa #16, hallazgo L3 (WCAG 2.5.8 Target Size, AA en WCAG 2.2):
 * el enlace de comunidad del cierre del deck media 208x22 px en movil, la
 * UNICA diana del sitio por debajo de los 24 px. Se ata la declaracion; la
 * caja resultante (208x24, sin mover nada mas) se mide en navegador.
 */
describe("Story: critica #16 -- el enlace de comunidad del deck alcanza la diana minima", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("hallazgo L3: el enlace de comunidad declara el minimo de 24 px de WCAG 2.5.8", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const enlace = container.querySelector(
      `a[href="${links.discord}"]`,
    ) as HTMLElement;

    // space[5] es 1.5rem = 24px, el mismo peldano con el que ScRailMark ya
    // resuelve este minimo. Medido en navegador, la caja pasa de 208x22,4 a
    // 208x24 sin mover nada mas.
    expect(cssRuleTextFor(enlace)).toContain(
      `min-height: ${basicDarkTheme.space[5]}`,
    );
  });
});
