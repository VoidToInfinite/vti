import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, isInaccessible } from "@testing-library/react";
import { createElement, type ComponentType } from "react";
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
import { Story, pillarBadgeAccent } from "./Story";
import { DECK, PRESS, REVEAL } from "@/motion/vocabulary";
import { motion } from "@/theme/tokens/motion";
import {
  contrastRatio,
  contrastRatioHex,
  relativeLuminance,
  relativeLuminanceHex,
} from "@/theme/tokens/contrast";
import { basicLightTheme, basicDarkTheme } from "@/theme/themes";
import { longitudCssEnPx, redondear } from "@/test/cssLength";
import { MIN_VIEWPORT_PX } from "@/theme/tokens/space";
import {
  STORY_DARK_HEIGHT,
  STORY_DARK_MAX_WIDTH,
  STORY_DECK_NOTE_SIZE,
  STORY_DECK_PILLAR_TITLE_SIZE,
  STORY_DECK_TAIL_SCREENS,
  STORY_DECK_TITLE_SIZE,
  STORY_FIGURE_SCROLL_SHIFT,
  STORY_FIGURE_SIZES,
  STORY_SLIDES,
} from "./story.layers";
import { STORY_COSMIC_BEING_VOID } from "@/components/scenes/storyCosmicBeing/storyCosmicBeing.layers";
import { DECK_SLIDE_TRAVEL_SCREENS } from "@/hooks/useSlideDeck";
import {
  DECK_DOES_NOT_FIT,
  DECK_FITS,
  DECK_FIT_ATTRIBUTE,
} from "@/hooks/useDeckFit";
import * as storyDeck from "./story.deck";

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

/*
 * AQUI VIVIO `cssRuleFor`, el helper que localizaba UNA regla del CSSOM por su
 * `selectorText` y exponia `.style.<prop>`. Su ultimo consumidor era el candado
 * que leia la COMPUERTA de `ScDeckNoteLink` -- el `visibility: hidden` que
 * mantenia el enlace de Discord fuera del orden de tabulacion mientras su
 * diapositiva no fuera la actual --, y la critica externa #16 retiro esa
 * compuerta con medicion delante (hallazgo L2: con Tab hacia delante el enlace
 * no se alcanzaba nunca). El candado que la sustituye afirma la AUSENCIA de la
 * declaracion, que se lee del texto concatenado sin necesitar este helper.
 *
 * Se retira con ella (regla 16 de RULES.md: un helper que ya no describe nada
 * es peor que ninguno), exactamente como `Journey.test.tsx` retiro el suyo
 * cuando la critica #10 se llevo su unico consumidor.
 */

/**
 * La regla del CSSOM que cambia un elemento cuando el `<html>` lleva
 * `data-theme="dark"`, devuelta ENTERA (no su texto) para poder leer su
 * `selectorText` real.
 *
 * `motivo` NO es cosmetico: la funcion tiene dos consumidores (la columna de
 * la figura y la reticula que la contiene) y cada uno cae por una razon
 * distinta, asi que un mensaje fijo mandaria a quien lea el rojo a mirar el
 * elemento equivocado.
 *
 * Mismo motivo que `revealedSelectorTextFor`, mas arriba: el selector
 * DESCENDIENTE `[data-theme="dark"] &` compila a `[data-theme="dark"] .sc-xxxx`
 * (atributo, ESPACIO, clase) y el calificado `&[data-theme="dark"]` compila a
 * `.sc-xxxx[data-theme="dark"]` -- las dos cadenas contienen el mismo
 * substring, asi que `cssRuleTextFor` no las distingue. Aqui la diferencia no
 * es estilistica: el atributo lo escribe el script anti-flash en el `<html>`,
 * NUNCA en este `div`, asi que la forma calificada no aplicaria jamas y el
 * candado quedaria en verde sobre una regla muerta (leccion 2026-08-07).
 */
function reglaDeTemaOscuroPara(el: HTMLElement, motivo: string): CSSStyleRule {
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
        selector.includes('[data-theme="dark"]') &&
        classes.some((cls) => selector.includes(`.${cls}`))
      );
    });
  if (!rule) {
    throw new Error(
      `Ninguna regla [data-theme="dark"] aplica a este elemento: ${motivo}`,
    );
  }
  return rule;
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

/*
 * Candado de VALOR de la cascada, añadido con la migración de la crítica
 * externa #16 (integración de la ola L, 2026-09-03). Los siete retardos
 * (kicker 0, h2 80, cuerpo 140 y las cuatro tarjetas 200/260/320/380) ya no
 * se escriben a mano en `Story.tsx`: se derivan de `motion.staggerMs`
 * (`base` = 80, `tight` = 60). Esa aritmética necesita quien la compruebe
 * contra los valores VERBATIM del mockup (L74-121), y las constantes del
 * componente son privadas del módulo, así que el candado mide lo único
 * observable desde fuera: el CSS que styled-components inyecta. Es el gemelo
 * del que `Features.test.tsx` estrenó para su propia cascada.
 *
 * Sin este candado, subir un peldaño de la escala por un motivo ajeno a esta
 * sección retimearía la cascada en silencio y la suite seguiría en verde.
 */
describe("#16: la cascada de Story derivada de motion.staggerMs conserva los retardos del mockup", () => {
  it("los peldaños de la escala siguen valiendo 80 y 60", () => {
    expect(motion.staggerMs.base).toBe(80);
    expect(motion.staggerMs.tight).toBe(60);
  });

  it("el CSS inyectado declara los siete retardos verbatim: 0, 80, 140, 200, 260, 320 y 380 ms", () => {
    renderWithProviders(<Story />);
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join("\n");
    for (const ms of [80, 140, 200, 260, 320, 380]) {
      expect(css).toContain(`transition-delay: ${ms}ms`);
    }
  });
});

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
    ["titulo (Typography h4, color por defecto)", "text"],
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
 * P1 numero 4 de la critica externa #19 (2026-09-06), ancla tecnica "ningun
 * tema descarga mas de 100 KB de arte que no pinta".
 *
 * QUE INCUMPLIA EL DEFECTO. El HTML horneado es siempre la rama CLARA, asi que
 * una visita OSCURA parsea esta figura igual, la pide en el primer layout
 * (esta dentro del umbral de carga perezosa de Chrome en la geometria clara) y
 * la tira al hidratar. Medido sobre el build de `f3594ad` por interceptacion de
 * rutas: 87.260 B a DPR 1 y 163.368 B a DPR 2, ninguno de los dos en el DOM.
 * Con la regla puesta, CERO peticiones de `journey-presenting-*` en oscuro en
 * toda la matriz medida (DPR 1 y 2, 1440x900 y 390x844, `reduce` activo e
 * inactivo, `/` y `/en`), y el claro intacto (figura descargada y pintada a
 * 450x658, con y sin JavaScript).
 *
 * QUE ATAN ESTOS DOS CASOS, y por que hacen falta los dos. El arreglo es una
 * CONJUNCION: la regla quita la caja (sin caja no hay interseccion, y la carga
 * perezosa es por interseccion) y `loading="lazy"` es lo que hace que la
 * peticion dependa de esa caja. Una imagen NO perezosa se pide en cuanto el
 * parser ve su `src`, oculta o no -- medido sirviendo el mismo build con el
 * atributo quitado al vuelo SOLO A ESTA FIGURA: la visita oscura vuelve a
 * pedir 87.260 B a DPR 1 y 163.368 B a DPR 2, las cifras exactas del defecto
 * original. Atar solo la regla dejaria el hallazgo reabierto por un `eager`.
 *
 * Los dos casos se validaron con bug inyectado (ver sus comentarios internos
 * para la linea roja literal de cada uno).
 */
describe("Story: la figura clara no se descarga en tema oscuro (P1 numero 4, critica externa #19)", () => {
  it("la columna de la figura pierde su caja bajo html[data-theme=dark], y con selector DESCENDIENTE", () => {
    /* Bug inyectado 1 (quitando el bloque `[data-theme="dark"] &` entero de
       `ScFigureWrap`, Story.tsx) -- que es EXACTAMENTE el estado del repo en
       `f3594ad`, el build sobre el que se midio el hallazgo:

         Error: Ninguna regla [data-theme="dark"] aplica a este elemento: la
         figura clara vuelve a tener caja en una visita oscura y el navegador
         la descargara (P1 numero 4 de la critica externa #19)

       Bug inyectado 2 (cambiando el descendiente `[data-theme="dark"] &` por
       el calificado `&[data-theme="dark"]`, que compila a una regla que no
       puede aplicar nunca porque el atributo vive en el `<html>`):

         AssertionError: el selector tiene que ser DESCENDIENTE
         ([data-theme="dark"] .clase): el atributo lo escribe el script
         anti-flash en el <html>, no en este div, asi que la forma calificada
         (.clase[data-theme="dark"]) no aplicaria nunca: expected false to be
         true // Object.is equality
         - Expected
         + Received
         - true
         + false

       Las dos inyecciones dieron "Tests 1 failed | 126 passed (127)", y las
       dos se repitieron el 2026-09-06 con el caso de la reticula ya en el
       fichero: la regla que encuentra el helper sigue siendo la de ESTA
       columna y no la de `ScGrid`, que ahora tambien tiene la suya. */
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);
    // figure -> ScFigureShift (parent) -> ScFigureWrap (grandparent), el
    // mismo camino que ya recorre el caso de D11, mas arriba.
    const figureWrap = figure.parentElement?.parentElement as HTMLElement;
    const rule = reglaDeTemaOscuroPara(
      figureWrap,
      "la figura clara vuelve a tener caja en una visita oscura y el " +
        "navegador la descargara (P1 numero 4 de la critica externa #19)",
    );

    expect(
      /\[data-theme="dark"\]\s+\./.test(rule.selectorText),
      'el selector tiene que ser DESCENDIENTE ([data-theme="dark"] .clase): ' +
        "el atributo lo escribe el script anti-flash en el <html>, no en este " +
        'div, asi que la forma calificada (.clase[data-theme="dark"]) no ' +
        "aplicaria nunca",
    ).toBe(true);
    expect(
      rule.style.display,
      "sin caja no hay interseccion, y sin interseccion el cargador perezoso " +
        "no pide la imagen: cualquier otra forma de esconderla (opacity, " +
        "visibility, un contenedor de 0px) SI deja caja y vuelve a descargarla",
    ).toBe("none");
  });

  it("la figura conserva el marcado del que depende el candado: perezosa, con sus dos pistas y su alt", () => {
    /* Bug inyectado 3 (cambiando `loading="lazy"` por `loading="eager"` en el
       JSX de la figura, Story.tsx):

         AssertionError: `loading="lazy"` es la otra mitad del candado de peso
         del tema oscuro: una imagen eager se pide en cuanto el parser ve su
         src, tenga caja o no (medido con el atributo quitado al vuelo sobre
         el build: la visita oscura vuelve a pedir 87.260 B a DPR 1 y 163.368
         B a DPR 2, sin pintarlos): expected 'eager' to be 'lazy' //
         Object.is equality
         Expected: "lazy"
         Received: "eager"

       (Esa inyeccion dio "Tests 2 failed | 125 passed (127)": tambien cae el
       caso de mas arriba, que ya exigia `lazy` por rendimiento de la rama
       clara. Que caigan los dos es lo correcto -- describen dos razones
       distintas para el mismo atributo.)

       Este caso NO sustituye al de "la figura lleva alt de i18n y srcset con
       las dos pistas publicadas", mas arriba: aquel describe el contrato de la
       rama clara y este describe de que depende el peso de la rama oscura.
       Comparten aserciones a proposito -- el dia que una de las dos razones
       deje de existir, la otra tiene que seguir sujetando su mitad. */
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);

    expect(
      figure.getAttribute("loading"),
      '`loading="lazy"` es la otra mitad del candado de peso del tema ' +
        "oscuro: una imagen eager se pide en cuanto el parser ve su src, " +
        "tenga caja o no (medido con el atributo quitado al vuelo sobre el " +
        "build: la visita oscura vuelve a pedir 87.260 B a DPR 1 y 163.368 B " +
        "a DPR 2, sin pintarlos)",
    ).toBe("lazy");
    expect(figure).toHaveAttribute(
      "src",
      "/figures/journey-presenting-1024.webp",
    );
    expect(figure.getAttribute("srcset") ?? "").toContain(
      "/figures/journey-presenting-640.webp 640w",
    );
    expect(figure.getAttribute("srcset") ?? "").toContain(
      "/figures/journey-presenting-1024.webp 1024w",
    );
    expect(figure).toHaveAttribute("sizes", STORY_FIGURE_SIZES);
    // El `alt` es CONTENIDO, no decoracion: es lo que impide resolver este
    // hallazgo dejando de renderizar la figura sin JavaScript.
    expect(figure.getAttribute("alt")).toBe(esHome.Home.story.figureAlt);
    expect(figure.getAttribute("alt")).not.toBe("");
  });

  it("la reticula de la rama clara colapsa a una sola pista en oscuro, para que la prosa no herede la columna de la figura", () => {
    /* LA SEGUNDA MITAD DE LA MISMA DECISION, y por que tiene caso propio.
       Quitarle la caja a la columna de la figura no deja el hueco vacio: como
       `ScGrid` declara DOS pistas desde `lg`, el contenido cae por colocacion
       automatica en la ESTRECHA y la prosa se estrecha con el. Medido en
       Chrome (1440x900, DPR 1, visita oscura, `scrollHeight` del documento en
       `DOMContentLoaded`, que es el alto que ve la restauracion de scroll
       antes de hidratar): 6.523 px sin nada de esto, 7.050 px con el
       `display: none` a secas y 6.260 px con esta pista unica. El alto ya
       hidratado es 11.008 px en los tres, asi que esto NO se ve en el estado
       final: se ve en la ventana de prehidratacion, que es justamente donde
       vive todo este candado.

       Bug inyectado (quitando el bloque `[data-theme="dark"] &` de `ScGrid`,
       Story.tsx, y dejando intacto el de `ScFigureWrap`):

         Error: Ninguna regla [data-theme="dark"] aplica a este elemento: el
         contenido cae en la pista estrecha de la figura y la prosa se
         estrecha con el (medido: el documento prehidratacion de una visita
         oscura pasa de 6.260 a 7.050 px)

       ("Tests 1 failed | 126 passed (127)".) Restaurado el bloque, verde.
       Que caiga por el helper y no por el `toContain` es lo correcto: sin
       regla no hay `cssText` que mirar, y el mensaje que se lee es el motivo
       de ESTE caso, no el de la figura -- por eso `reglaDeTemaOscuroPara`
       recibe el motivo como argumento en vez de llevar uno fijo. */
    renderWithProviders(<Story />);
    const grid = screen
      .getByAltText(esHome.Home.story.figureAlt)
      .closest("[data-revealed]") as HTMLElement;
    const rule = reglaDeTemaOscuroPara(
      grid,
      "el contenido cae en la pista estrecha de la figura y la prosa se " +
        "estrecha con el (medido: el documento prehidratacion de una visita " +
        "oscura pasa de 6.260 a 7.050 px)",
    );

    expect(
      /\[data-theme="dark"\]\s+\./.test(rule.selectorText),
      "mismo motivo que en la figura: el atributo vive en el <html>, no en " +
        "esta reticula, asi que la forma calificada no aplicaria nunca",
    ).toBe(true);
    expect(
      rule.cssText.replace(/\s+/g, ""),
      "sin esta regla el contenido cae en la pista estrecha de la figura y " +
        "la prosa se estrecha con el (medido: el documento prehidratacion de " +
        "una visita oscura pasa de 6.260 a 7.050 px)",
    ).toContain("grid-template-columns:minmax(0,1fr)");
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
 * (peldano 4/16px hasta `sm`, peldano 6/32px desde ahi) a traves de una
 * UNICA custom property (`--story-statement-pad`) que tanto `ScStatement`
 * como `storyStatementFontSize` leen -- a 320px con pad 16,
 * `(320-32)/12 = 24,00px` exactos (ver el docblock de `storyStatementFontSize`
 * en Story.tsx para la desigualdad completa, Regla 24).
 *
 * SEGUNDA MITAD DEL MISMO ARREGLO (2026-09-05, ola de `inlineSpace`): los dos
 * peldanos se leen de `theme.data.inlineSpace`, no de `theme.data.space`. El
 * despeje de arriba esta en PIXELES y el pad estaba en `rem`, asi que el
 * mismo 21,33px volvia entero en cuanto el usuario ponia la fuente al 200 %
 * (raiz 32px): `min(1rem, 5vw)` vale 16px a 320px con cualquier raiz. Con la
 * raiz por defecto no cambia ni un pixel a ningun ancho.
 *
 * VALIDADO CON EL BUG INYECTADO (regla 34), 2026-09-05: devolviendo
 * `--story-statement-pad` a `theme.data.space[4]` en `ScStatement`
 * (`Story.tsx`), el primer caso de este bloque cae en rojo con esta linea
 * literal:
 *
 *   AssertionError: expected '.[hash] {min-height: 70dvh; display: …' to
 *   contain '--story-statement-pad: min(1rem, 5vw)'
 *
 * El hash de la clase va elidido como `[hash]` a proposito: styled-components
 * lo deriva del texto del template, asi que cambia con cada edicion del
 * componente y una cita con el hash de aquel dia (`.gEaRLj`) queda
 * irreproducible en cuanto alguien toca una linea de CSS -- de hecho ya
 * cambio, entre el commit que la escribio y el siguiente de la misma ola. Lo
 * que la cita tiene que fijar es la ASERCION, no el nombre generado.
 *
 * Restaurado el token, verde (4/4). Reparto de trabajo entre los dos candados,
 * declarado para que nadie confie en el que no toca: el caso de la ARITMETICA
 * resuelve el token y NO monta el componente, asi que ese sabotaje no lo pone
 * en rojo -- protege la propiedad del peldano, no el cableado; el cableado lo
 * protege el caso de la regla base, que es el que cayo.
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

  it("regla base (fuera de cualquier @media): --story-statement-pad = inlineSpace[4] (min(1rem, 5vw)), padding-inline la consume por var(), padding-block no se toca (space[8])", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;

    const css = cssRuleTextFor(statement);
    const topLevelCss = css.split("@media")[0];

    expect(topLevelCss).toContain(
      `--story-statement-pad: ${basicLightTheme.inlineSpace[4]}`,
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
    ).toBe(basicLightTheme.inlineSpace[4]);
  });

  it("dentro de @media (el breakpoint sm del tema, no un literal a mano): --story-statement-pad sube a inlineSpace[6] (min(2rem, 10vw)), sobre la MISMA regla que declara el valor base (Regla 35: mismo selectorText, no una regla distinta)", () => {
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
    expect(padInMedia).toBe(basicLightTheme.inlineSpace[6]);
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
  it("aritmetica del suelo a 320px CON CUALQUIER RAIZ: (320 - 2*16)/12 = 24,00px exactos tambien con la fuente al 200 %", () => {
    /*
     * La desigualdad que fija el pad (docblock de storyStatementFontSize,
     * Story.tsx) es (320px - 2*pad)/12 >= 24px, y se despeja en PIXELES: el
     * pad tiene que valer 16px REALES, no "1rem" -- que son 32px con la
     * preferencia de tamano de texto del usuario al 200 %, la misma palanca
     * que Page.setFontSizes. Hasta el 2026-09-05 este componente declaraba el
     * peldano en rem crudo y la desigualdad solo se cumplia con la raiz a 16.
     *
     * jsdom no resuelve min() ni vw: la expresion se resuelve aqui con la
     * misma aritmetica que hace el navegador, igual que inlineSpace.test.ts.
     */
    const resolver = (
      expresion: string,
      raizPx: number,
      viewportPx: number,
    ): number => {
      const m = /^min\(([\d.]+)rem, ([\d.]+)vw\)$/.exec(expresion);
      if (!m) throw new Error(`el pad ya no es un min(rem, vw): ${expresion}`);
      return Math.min(Number(m[1]) * raizPx, (Number(m[2]) * viewportPx) / 100);
    };
    const terminoDeAncho = (padPx: number): number => (320 - 2 * padPx) / 12;

    for (const raiz of [16, 32]) {
      const pad = resolver(basicLightTheme.inlineSpace[4], raiz, 320);
      expect(pad, `pad a 320px con la raiz a ${raiz}px`).toBe(16);
      expect(
        terminoDeAncho(pad),
        `termino de ancho a 320px con la raiz a ${raiz}px`,
      ).toBeCloseTo(24, 5);
    }

    // Contraprueba de por que el token cambio: el mismo peldano leido de la
    // escala en rem perfora el suelo en cuanto la raiz crece.
    const padEnRemAl200 = Number.parseFloat(basicLightTheme.space[4]) * 32;
    expect(padEnRemAl200).toBe(32);
    expect(terminoDeAncho(padEnRemAl200)).toBeCloseTo(21.33, 2);
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

    // Diapositivas 1-4: un pilar cada una, en orden, identificado por su
    // titulo i18n real. Hasta la critica externa #19 (2026-09-04) cada una
    // abria ademas con un numeral "01".."04" y este bloque lo comprobaba; el
    // numeral se retiro por decision del dueno (una sola forma de contar: la
    // fraccion del rail), asi que aqui se exige lo contrario -- que la
    // diapositiva NO pinte un numeral suelto. El candado que ata las dos
    // secciones a la misma forma de contar vive en `Journey.test.tsx`.
    const pillarKeys = ["learn", "create", "grow", "practice"] as const;
    pillarKeys.forEach((key, i) => {
      const slide = slides[i + 1];
      expect(slide.textContent).not.toContain(`0${i + 1}`);
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

  /*
   * ESTE CANDADO CAMBIA DE SENTIDO EN LA CRITICA EXTERNA #16 (hallazgo L2), y
   * conviene dejar escrito por que, porque afirma casi lo contrario de lo que
   * afirmaba: hasta esta ola exigia que el enlace llevara `visibility: hidden`
   * mientras su diapositiva no fuera la actual -- la compuerta que la critica
   * #10 puso para que ningun foco cayera fuera de la vista (WCAG 2.4.7). La
   * #16 midio el precio de aquella compuerta: con Tab HACIA DELANTE el enlace
   * no se alcanzaba NUNCA, porque para que su diapositiva sea la actual hace
   * falta scroll y el tabulador no produce scroll. La compuerta se retira y la
   * garantia se conserva por otra via -- al enfocarlo, el deck lleva la pagina
   * a su diapositiva --, asi que lo que hay que atar aqui es que la
   * declaracion NO vuelva.
   */
  it("el enlace de Discord es el UNICO focalizable dentro de las diapositivas, y NINGUNA regla suya lo saca del orden de tabulacion", async () => {
    const { slides } = await slidesDelDeck();

    const FOCALIZABLES =
      'a[href], button, input, select, textarea, iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    const focalizables = slides.flatMap((slide) =>
      Array.from(slide.querySelectorAll(FOCALIZABLES)),
    );
    expect(focalizables).toHaveLength(1);
    const enlace = focalizables[0] as HTMLElement;
    expect(enlace).toHaveAttribute("href", links.discord);
    // Ni `tabindex="-1"` en el JSX: sacarlo del orden por atributo seria el
    // mismo defecto por otra puerta.
    expect(enlace).not.toHaveAttribute("tabindex");

    // Y ni una sola declaracion de `visibility` en el CSS del enlace, en
    // ninguna de sus reglas (incluidas las de dentro de un @media, que jsdom
    // no evalua pero cssRuleTextFor si concatena -- regla 36).
    expect(cssRuleTextFor(enlace)).not.toContain("visibility");
  });

  it("al recibir el foco, el enlace lleva la pagina a la diapositiva del cierre: el foco no puede quedarse fuera de la vista", async () => {
    const VH = 800;
    vi.stubGlobal("innerHeight", VH);
    vi.stubGlobal("scrollY", 0);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const { container, slides } = await slidesDelDeck();
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    track.getBoundingClientRect = () =>
      ({ top: 0, height: altoDePista(VH) }) as DOMRect;
    act(() => triggerFor(track, true));
    // Punto de partida: el deck esta en la diapositiva 0, es decir, la del
    // cierre NO es la actual -- exactamente el estado en el que la compuerta
    // retirada dejaba el enlace inalcanzable.
    expect(stage).toHaveAttribute("data-slide", "0");

    const enlace = slides[slides.length - 1].querySelector("a") as HTMLElement;
    act(() => {
      enlace.focus();
    });

    // La MISMA posicion a la que lleva la ultima marca del rail, calculada
    // con la aritmetica del hook y no con un numero magico:
    //   top(k) = k / (STORY_SLIDES - 1) * span, con k = STORY_SLIDES - 1
    expect(scrollTo).toHaveBeenCalledWith({
      top: spanDePista(VH),
      behavior: "smooth",
    });
  });

  it("si la diapositiva del cierre YA es la actual, enfocar el enlace no relanza ningun scroll", async () => {
    const VH = 800;
    vi.stubGlobal("innerHeight", VH);
    vi.stubGlobal("scrollY", 0);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const { container, slides } = await slidesDelDeck();
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    // rect.top al final del recorrido: progress = 1, index = STORY_SLIDES - 1.
    track.getBoundingClientRect = () =>
      ({ top: -spanDePista(VH), height: altoDePista(VH) }) as DOMRect;
    act(() => triggerFor(track, true));
    expect(stage).toHaveAttribute("data-slide", String(STORY_SLIDES - 1));

    scrollTo.mockClear();
    const enlace = slides[slides.length - 1].querySelector("a") as HTMLElement;
    act(() => {
      enlace.focus();
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("bajo prefers-reduced-motion enfocar el enlace no mueve la pagina: el deck esta linealizado y la geometria de la pista no describe nada", async () => {
    const VH = 800;
    vi.stubGlobal("innerHeight", VH);
    vi.stubGlobal("scrollY", 0);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const { container, slides } = await slidesDelDeck();
    // La pista se fija CON recorrido a proposito: sin esto, `scrollToSlide`
    // saldria por su propia guarda de `span <= 0` (jsdom da altura 0 a todo) y
    // este candado pasaria en verde aunque la guarda de `reduce` no existiera
    // -- que es exactamente lo que el bug inyectado descubrio la primera vez
    // que se escribio.
    const stage = container.querySelector("[data-slide]") as HTMLElement;
    (stage.parentElement as HTMLElement).getBoundingClientRect = () =>
      ({ top: 0, height: altoDePista(VH) }) as DOMRect;

    const enlace = slides[slides.length - 1].querySelector("a") as HTMLElement;
    act(() => {
      enlace.focus();
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  /*
   * Bugs inyectados a proposito (regla 34), ejecutados en esta tarea:
   * (a) devolver `visibility: hidden;` al reposo de `ScSlide`
   * (story.deck.tsx) pone en rojo los candados 1 y 2; (b) devolver el bloque
   * de compuerta a `ScDeckNoteLink` (Story.tsx) pone en rojo el candado 3;
   * (c) retirar la llamada a `scrollToSlide` de `focusClosingSlide`
   * (Story.tsx) pone en rojo el candado 4, y quitarle cualquiera de sus dos
   * guardas pone en rojo el 5 o el 6. Restauradas LAS LINEAS (nunca git
   * checkout), todo vuelve a verde.
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
 * AQUI VIVIO el describe "critica #12 -- el numeral de pilar del deck oscuro
 * libra AA sobre la escena" (seis casos: los cuatro acentos medidos contra el
 * pixel de la escena, el void y semantic.bg, la sonda de no-vacuidad y el
 * candado de CSS inyectado). Se retira con el elemento que medía: la critica
 * externa #19 (2026-09-04, decision del dueno "una sola forma de contar")
 * retiro `ScPillarNumber` del deck oscuro, y con el `pillarAccent`.
 *
 * No es una relajacion del piso de contraste: un candado que mide el color de
 * un elemento que ya no se renderiza esta en verde por vacuidad, que es
 * exactamente lo que la sonda de no-vacuidad de aquel describe existia para
 * impedir. El arreglo de la #12 (desplazar la cadena `secondary` un paso hacia
 * el lado claro) no se revierte: deja de tener sujeto. La rampa de la rama
 * CLARA (`pillarBadgeAccent`) sigue viva y conserva su propio candado de
 * contraste, unos describes mas arriba.
 */

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

  /*
   * EL VALOR SUBE DE `break-word` A `anywhere` (critica externa #19,
   * 2026-09-04), y el candado sube con el en vez de aflojarse: `break-word` se
   * prohibe explicitamente aqui porque es EXACTAMENTE la forma que dejaba vivo
   * el defecto -- parte la linea pero no toca el `min-content`, asi que toda
   * caja que se dimensione por su contenido (el kicker de esta seccion es un
   * contenedor flex y lo hace) sigue inflandose hasta la palabra entera y
   * saliendose. Medido: 314,47 px pedidos en una caja de 224 a 320 px de ancho
   * con la raiz a 32px, con `break-word` puesto y heredado.
   */
  it("ScStory declara overflow-wrap: anywhere, que se hereda a todo el texto de las dos ramas", () => {
    renderWithProviders(<Story />);
    const section = document.getElementById("story") as HTMLElement;
    const declaracion = declaracionBase(section, "overflow-wrap");
    expect(declaracion).toMatch(/overflow-wrap:\s*anywhere/);
    expect(
      declaracion,
      "break-word no basta: no entra en el calculo del min-content y deja la caja inflada",
    ).not.toMatch(/overflow-wrap:\s*break-word/);
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

  /*
   * El candado de debajo mide los TOKENS contra el void, no la DECLARACIÓN del
   * numerador: con `ScRailStatusCurrent` cambiado a `semantic.textMuted` la
   * suite entera seguía en verde (comprobado en la integración de la ola L,
   * 204 tests). Este mide lo que aquél no puede ver — que la tinta que el
   * numerador declara de verdad es la que después se mide.
   */
  it("el numerador declara su tinta en el CSS, no solo en el token que el test de contraste mide", async () => {
    const { rotulo } = await railConRotulo();
    const numerador = rotulo.querySelector("span") as HTMLElement;

    expect(numerador, "el rotulo no tiene numerador").not.toBeNull();
    expect(cssRuleTextFor(numerador)).toContain(
      `color: ${basicDarkTheme.semantic.text}`,
    );
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
 *
 * AMPLIADO EN LA CRITICA EXTERNA #20 (2026-09-05). La derivacion sola dejo de
 * bastar: los tres sumandos ya no valen lo mismo en todas las raices
 * tipograficas. Los dos que son AIRE (el inset del rail y el canal libre)
 * pasaron a `inlineSpace`, que deja de crecer cuando el viewport ya no da de
 * si; el del medio, que es el ANCHO REAL de la marca, sigue en `space` porque
 * acotarlo reservaria menos canal del que el rail ocupa. Asi que lo que se
 * anade abajo es la ARITMETICA RESUELTA a las dos raices: cuanta columna de
 * copia queda y donde termina esa columna respecto a la banda del rail. El
 * defecto que lo motiva se midio sobre el build de produccion con la fuente al
 * 200 % (raiz 32 px) y 320 px de viewport: la copia del deck quedaba en 144 px
 * de 320, con el h2 de 64 px a 2,25 caracteres por linea.
 */

/** La raiz tipografica de fabrica; el `rem` se resuelve contra ella. */
const RAIZ_POR_DEFECTO_PX = 16;
/** La raiz al 200 %, el techo que exige WCAG 1.4.4 (SC Resize Text). */
const RAIZ_200_PX = 32;
/**
 * Suelo de columna de copia que la ola #20 se fija a 320 px con la fuente al
 * 200 %. No es el ancho que sale de la cuenta (208 px), sino el minimo que la
 * decision acepta: por debajo de ~200 px un h2 de 64 px vuelve a bajar de los
 * ~6 caracteres por linea que el dueno pidio conservar.
 */
const COLUMNA_MINIMA_200_PX = 200;

/**
 * Resuelve a pixeles un valor DECLARADO de relleno, con la misma aritmetica que
 * hace el navegador: `min(A rem, B vw)` = `min(A * raiz, B * viewport / 100)`,
 * `calc(a + b + c)` = la suma de sus terminos ya resueltos, y `A rem` =
 * `A * raiz`. jsdom no hace layout y no resuelve ni `min()` ni `vw` ni `calc()`
 * (regla 36), asi que la unica forma de que un candado sobre estos rellenos
 * signifique algo es hacer la cuenta aqui sobre lo que el CSSOM declara.
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
 * (`[data-slide="N"] &`, `:hover`). Sin acotar, una aritmetica sobre "el ancho
 * de la marca" sumaria el de la caja y el del punto y no mediria nada.
 * Falla si no queda exactamente una declaracion.
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

/**
 * Gemela de `declaracionBaseDe` para el bloque
 * `@media (prefers-reduced-motion: reduce)`. jsdom no evalua `@media` (regla
 * 36), asi que lo que la preferencia declara solo se puede leer bajando al
 * `CSSMediaRule` por su condicion y buscando ahi la regla del elemento.
 *
 * La condicion se filtra por el TEXTO de la regla y no por `conditionText`
 * porque es lo que el resto de candados de este fichero ya hacen, y porque el
 * unico bloque hermano que podria confundirse -- el de
 * `prefers-reduced-motion: no-preference` de ScDeck -- no contiene esta
 * subcadena. Falla si no queda exactamente una declaracion, igual que su
 * gemela: cero significa que el guard desaparecio.
 */
function declaracionEnReduceDe(el: HTMLElement, propiedad: string): string {
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
    .filter((regla): regla is CSSMediaRule => regla instanceof CSSMediaRule)
    .filter((regla) => regla.cssText.includes("prefers-reduced-motion: reduce"))
    .flatMap((regla) => Array.from(regla.cssRules))
    .filter((regla): regla is CSSStyleRule => regla instanceof CSSStyleRule)
    .filter((regla) => esSelectorSimple(regla.selectorText))
    .filter((regla) =>
      classes.some((cls) => regla.selectorText.includes(`.${cls}`)),
    )
    .map((regla) => regla.style.getPropertyValue(propiedad))
    .filter((valor) => valor !== "");

  expect(
    valores,
    `se esperaba UNA declaracion de ${propiedad} bajo reduce, hay ${valores.length}`,
  ).toHaveLength(1);
  return valores[0];
}

/**
 * Condiciones de los bloques `@media` que declaran `propiedad` para `el`, en el
 * orden en que el CSSOM las tiene -- que es el orden de DECLARACION, y con la
 * misma especificidad es lo unico que decide cual gana cuando dos casan a la
 * vez.
 *
 * Devuelve la CONDICION y no una posicion a proposito: una posicion en
 * caracteres dentro del CSS inyectado cambia con cada edicion del template
 * (arrastra el hash de clase de styled-components), asi que una linea roja
 * escrita con ese numero delante no se puede reproducir -- exactamente la
 * leccion que el verificador de esta ola dejo escrita. Una lista de condiciones
 * dice ademas CUAL es el bloque que se colo.
 */
function condicionesQueDeclaran(el: HTMLElement, propiedad: string): string[] {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    })
    .filter((regla): regla is CSSMediaRule => regla instanceof CSSMediaRule)
    .filter((regla) =>
      Array.from(regla.cssRules).some(
        (interna) =>
          interna instanceof CSSStyleRule &&
          classes.some((cls) => interna.selectorText.includes(`.${cls}`)) &&
          interna.style.getPropertyValue(propiedad) !== "",
      ),
    )
    .map((regla) => regla.cssText.slice(0, regla.cssText.indexOf("{")).trim());
}

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
    const { space, inlineSpace } = basicDarkTheme;

    // Espacios normalizados: styled-components conserva los saltos de linea
    // del template dentro del `calc()`, y lo que se afirma es la SUMA, no como
    // esta formateada.
    const plano = css.replace(/\s+/g, " ");
    // Los tres sumandos, cada uno leido de su token (regla 38): el inset del
    // rail y el canal libre ACOTADOS al viewport (critica #20), y entre ellos
    // la diana de la marca, que es ancho real y por eso sigue en `space`.
    expect(plano).toContain(
      `padding-inline-end: calc( ${inlineSpace[5]} + ${space[5]} + ${inlineSpace[2]} )`,
    );
  });

  /*
   * VALIDADO CON BUG INYECTADO (2026-09-05): devolviendo `inset-inline-end` de
   * ScRail (story.deck.tsx) a `space[5]` -- es decir, dejando de acotar el
   * inset mientras el canal de ScDeck si se acota -- este caso cae con esta
   * linea literal:
   *
   *   canal libre a raiz 32 px: reservado 80, banda 96: expected -16 to be 8 // Object.is equality
   *
   * Esos -16 px son el texto metido DENTRO de la banda del rail: el hallazgo
   * L1 otra vez, ahora solo con la fuente al 200 %. Restaurado
   * `inlineSpace[5]`, verde.
   */
  it("la suma reservada cubre la banda del rail mas el canal de 8 px que el hallazgo fija como umbral, y no mas -- a las DOS raices tipograficas", async () => {
    // El hallazgo L1 pide que ninguna caja de glifo cruce rail.left - 8 px:
    // con la caja de contenido terminando justo ahi, el texto no puede
    // cruzarlo porque no desborda su caja. Y se ata tambien el techo: la
    // primera version reservaba 96 px y dejaba la copia en 25-36 caracteres
    // por linea a 390 (frente a 38-46 en la rama clara); cada pixel de mas se
    // paga en medida de lectura.
    //
    // DESDE LA CRITICA #20 la cuenta no se hace sobre los tokens sino sobre lo
    // que el CSS DECLARA, y a las dos raices: los sumandos ya no valen lo mismo
    // a raiz 16 que a raiz 32, y lo que tiene que seguir siendo cierto es la
    // RELACION -- la copia termina exactamente 8 px antes de la banda del rail
    // en ambos casos. Si el inset del rail dejara de acotarse mientras el canal
    // si lo hace (o al reves), la resta se descuadraria y el texto volveria a
    // meterse debajo del control: el hallazgo L1 otra vez, ahora al 200 %.
    const deck = await deckOscuro();
    const rail = screen.getByRole("group", {
      name: esHome.Home.story.railLabel,
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
   * CRITICA EXTERNA #20 (2026-09-05), el candado ARITMETICO de la ola.
   *
   * EL DEFECTO. Con la fuente al 200 % (raiz 32 px) y 320 px de viewport,
   * `padding-inline` y el canal de arriba se doblaban con la fuente mientras el
   * viewport se quedaba donde estaba: 64 px por lado mas 112 px de canal
   * dejaban la columna de copia en 144 px de 320. El h2 de 64 px salia a 2,25
   * caracteres por linea y la nota de cierre de 80 px a 1,5. No era perdida de
   * texto -- eso lo habia cerrado la critica #19 con `overflow-wrap: anywhere`
   * -- era ilegibilidad.
   *
   * LO QUE ATA. La columna que queda de verdad, resuelta desde el CSSOM a las
   * dos raices: >= 200 px al 200 % de texto (la cuenta da 208) y exactamente
   * 232 px a la raiz por defecto, que es lo que media antes de esta ola. La
   * segunda mitad es tan importante como la primera: el arreglo no puede
   * pagarse con un solo pixel de la composicion por defecto.
   *
   * VALIDADO CON BUG INYECTADO (2026-09-05): devolviendo `padding-inline` de
   * ScDeck (story.deck.tsx) a `space[6]` este caso cae con esta linea literal:
   *
   *   columna a raiz 32 px en 320 px de viewport: expected 176 to be greater than or equal to 200
   *
   * 176 px es exactamente el ancho que deja el relleno sin acotar (320 - 64 -
   * 80). Restaurado `inlineSpace[6]`, verde.
   *
   * AMPLIADO A LAS DOS RAMAS DE MOVIMIENTO (verificador de producto de la ola
   * R, 2026-09-05, P3). El canal de arriba solo tiene sentido mientras el rail
   * se pinta, y bajo `prefers-reduced-motion: reduce` no se pinta: `ScRail`
   * declara `display: none` en esa misma condicion. La aritmetica pasa a
   * resolverse con el cierre que gana en CADA rama, no solo con el de la rama
   * con movimiento.
   *
   * VALIDADO CON BUG INYECTADO (2026-09-05): quitando la linea
   * `padding-inline-end` del bloque `@media (prefers-reduced-motion: reduce)`
   * de ScDeck (`story.deck.tsx`) este caso cae con esta linea literal:
   *
   *   se esperaba UNA declaracion de padding-inline-end bajo reduce, hay 0: expected [] to have a length of 1 but got +0
   *
   * Restaurado el bloque, verde.
   */
  it("critica #20: la columna de copia aguanta el 200 % de texto a 320 px y no se mueve a la raiz por defecto -- en las DOS ramas de movimiento", async () => {
    const deck = await deckOscuro();
    const inicio = declaracionBaseDe(deck, "padding-inline");
    const fin = declaracionBaseDe(deck, "padding-inline-end");
    const finBajoReduce = declaracionEnReduceDe(deck, "padding-inline-end");

    // `padding-inline` pone los dos lados y `padding-inline-end` pisa el de
    // cierre (longhand despues de shorthand): la columna es el viewport menos
    // el lado de inicio menos el cierre que gane en la rama que se mire.
    const columna = (raizPx: number, cierre: string): number =>
      MIN_VIEWPORT_PX -
      aPx(inicio, raizPx, MIN_VIEWPORT_PX) -
      aPx(cierre, raizPx, MIN_VIEWPORT_PX);

    // RAMA CON MOVIMIENTO: el rail se pinta, asi que su canal se reserva.
    expect(
      columna(RAIZ_200_PX, fin),
      `columna a raiz ${RAIZ_200_PX} px en ${MIN_VIEWPORT_PX} px de viewport`,
    ).toBeGreaterThanOrEqual(COLUMNA_MINIMA_200_PX);
    expect(columna(RAIZ_200_PX, fin)).toBe(208);
    expect(
      columna(RAIZ_POR_DEFECTO_PX, fin),
      "la composicion por defecto no puede moverse ni un pixel",
    ).toBe(232);

    // RAMA SIN MOVIMIENTO: el canal vuelve entero a la copia. 256 px a LAS DOS
    // raices, porque `min(2rem, 10vw)` se topa en 32 px a 320 px de ancho y el
    // relleno es el mismo a los dos lados.
    for (const raiz of [RAIZ_POR_DEFECTO_PX, RAIZ_200_PX]) {
      expect(
        columna(raiz, finBajoReduce),
        `columna bajo reduce a raiz ${raiz} px`,
      ).toBe(256);
      expect(
        columna(raiz, finBajoReduce),
        `sin rail que esquivar la columna no puede ser mas estrecha (raiz ${raiz} px)`,
      ).toBeGreaterThan(columna(raiz, fin));
    }
  });

  /*
   * VERIFICADOR DE PRODUCTO DE LA OLA R (2026-09-05, P3): el deck reservaba el
   * canal del rail tambien cuando el rail no existe.
   *
   * EL DEFECTO MEDIDO. Bajo `prefers-reduced-motion: reduce`, `ScRail` se
   * retira por completo (`display: none`) pero `padding-inline-end` seguia
   * valiendo la suma de su geometria: a 320 px de ancho, 56 px guardados a la
   * raiz por defecto y 80 px con la fuente al 200 % para un control que no se
   * pinta -- columna de 232 y de 208 px respectivamente.
   *
   * LAS TRES MITADES QUE ATA. (1) que el rail siga sin pintarse bajo la
   * preferencia, que es lo que deja el canal sin dueno; (2) que el cierre
   * vuelva a ser EXACTAMENTE el peldano del lado de inicio, y no un valor nuevo
   * elegido a ojo; (3) el ORDEN de los dos bloques `@media`, que es la otra
   * mitad del arreglo: con la misma especificidad gana el ultimo declarado, asi
   * que `reduce` va ANTES de `lg` para no llevarse por delante el hueco de
   * composicion de pantalla ancha, que no tiene nada que ver con el rail.
   *
   * VALIDADO CON BUG INYECTADO (2026-09-05): moviendo el bloque
   * `@media (prefers-reduced-motion: reduce)` de ScDeck (`story.deck.tsx`) a
   * DESPUES del bloque `lg` -- es decir, deshaciendo solo el reordenado y
   * dejando la declaracion nueva en su sitio -- este caso cae con esta linea
   * literal:
   *
   *   con la misma especificidad gana el ultimo declarado: reduce va ANTES de lg: expected [ …(2) ] to deeply equal [ …(2) ]
   *
   * ...con este diff debajo, que es donde se lee cual es el bloque que se colo:
   *
   *   - "@media (prefers-reduced-motion: reduce)",
   *     "@media screen and (min-width: 62em)",
   *   + "@media (prefers-reduced-motion: reduce)",
   *
   * Restaurado el orden, verde.
   */
  it("sin rail que pintar no hay canal que reservar: bajo reduce el relleno vuelve a ser simetrico, y el bloque lg sigue mandando por encima de su escalon", async () => {
    const deck = await deckOscuro();
    const rail = screen.getByRole("group", {
      name: esHome.Home.story.railLabel,
    });

    expect(declaracionEnReduceDe(rail, "display")).toBe("none");

    expect(declaracionEnReduceDe(deck, "padding-inline-end")).toBe(
      declaracionBaseDe(deck, "padding-inline"),
    );
    expect(declaracionEnReduceDe(deck, "padding-inline-end")).toBe(
      basicDarkTheme.inlineSpace[6],
    );

    expect(
      condicionesQueDeclaran(deck, "padding-inline-end"),
      "con la misma especificidad gana el ultimo declarado: reduce va ANTES de lg",
    ).toEqual([
      "@media (prefers-reduced-motion: reduce)",
      `@media ${basicDarkTheme.breakPoint.lg}`,
    ]);
  });

  /*
   * La otra mitad del canal: reservar 56 px a la derecha dejaba la copia del
   * pilar en 246 px a 390 (302 de caja menos los 56 que se llevaba la columna
   * del numero mas su gap) -- 31 caracteres por linea a 16 px, medidos con
   * Range por caracter, cuando el encargo pide conservar >= 38. La ola L lo
   * resolvio apilando el numero sobre la copia por debajo de sm y restaurando
   * las dos columnas desde sm.
   *
   * DESDE LA CRITICA EXTERNA #19 (2026-09-04) no hay columna que reservar: el
   * numeral se retiro por decision del dueno (una sola forma de contar), y con
   * el la fila de dos pistas entera. Lo que este candado ata ahora es esa
   * ausencia, que es lo unico que mantiene los 302 px de caja EN TODOS los
   * anchos: la diapositiva de pilar cuelga directamente de la columna de copia
   * y ninguna regla que le aplique declara `grid-template-columns`. Si alguien
   * devuelve una rejilla a esta fila -- que es como volveria el numeral --, el
   * test cae.
   */
  it("la diapositiva de pilar no reserva ninguna columna: su hijo unico es la copia y ninguna regla suya declara grid-template-columns", async () => {
    const deck = await deckOscuro();
    const diapositiva = deck.querySelector(
      '[data-slide-index="1"]',
    ) as HTMLElement;
    const fila = diapositiva.firstElementChild as HTMLElement;

    // Un solo hijo: la columna de copia. La fila numero-mas-copia tenia dos.
    expect(diapositiva.children).toHaveLength(1);
    expect(fila.children).toHaveLength(3);

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

    // Nivel superior y dentro de CUALQUIER @media (jsdom no evalua media
    // queries: se leen del CSSOM, regla 36). Ni una sola declaracion.
    const enMedia = reglas
      .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule)
      .flatMap((r) => Array.from(r.cssRules));
    const columnas = [...reglas, ...enMedia]
      .map(columnasDe)
      .filter((v): v is string => v !== null);
    expect(columnas).toEqual([]);

    // Y la copia sigue siendo una columna flex, no una rejilla disfrazada.
    expect(cssRuleTextFor(fila)).toContain("flex-direction: column");
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

/*
 * Critica externa #16, hallazgo A (decision del dueno del 2026-09-03): el
 * arte del deck oscuro no se anunciaba de ninguna forma -- 32 imagenes con
 * alt vacio en el documento oscuro frente a las descriptivas de la rama
 * clara --, asi que el mismo contenido se contaba distinto segun el tema.
 *
 * Lo que se ata aqui son las DOS mitades de esa decision, que solo juntas
 * son correctas: (a) la composicion entera gana un nombre, y (b) ninguna
 * capa suelta lo gana. Un candado que solo comprobara (a) dejaria pasar el
 * arreglo ingenuo -- repartir texto alternativo por las once capas --, que
 * convierte un fondo en once anuncios sin sentido.
 *
 * Es comportamiento observable en jsdom (atributos y arbol de accesibilidad),
 * no CSS: `getByRole` resuelve el rol y el nombre accesible reales, y las
 * capas se inspeccionan por atributo. Los dos `it` se han visto en rojo con
 * la implementacion saboteada antes de darlos por buenos (RULES 34).
 */
describe("Story: critica #16 -- el arte del deck oscuro se anuncia como UNA imagen", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("hallazgo A: la escena se expone como imagen con el texto de Home.story.sceneAlt", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });

    // Nombre accesible resuelto por Testing Library, no un substring del DOM:
    // lo que importa es que un lector de pantalla lo anuncie asi.
    const escena = screen.getByRole("img", {
      name: esHome.Home.story.sceneAlt,
    });
    expect(escena).not.toHaveAttribute("aria-hidden");

    // Es el envoltorio de la escena, no otra cosa que se le parezca: contiene
    // las capas del fondo, y esas capas son las que siguen sin anunciarse.
    expect(escena.querySelectorAll("img").length).toBeGreaterThan(0);

    // Y es UNA sola imagen anunciada, no una por capa.
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("hallazgo A: ninguna capa del fondo gana texto alternativo -- todas siguen con alt vacio bajo aria-hidden", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const capas = Array.from(container.querySelectorAll("img"));

    capas.forEach((capa) => {
      expect(capa.getAttribute("alt")).toBe("");
      expect(capa.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    // El nombre de la composicion no es el de la figura de la rama clara: son
    // dos artes distintos y describirlos con la misma frase seria mentir.
    expect(esHome.Home.story.sceneAlt).not.toBe(esHome.Home.story.figureAlt);
    expect(enHome.Home.story.sceneAlt).not.toBe(enHome.Home.story.figureAlt);
  });
});

/**
 * CANDADO: EL CARTEL DEL STATEMENT CRECE CON LA PREFERENCIA DE TAMANO DE
 * TEXTO (WCAG 1.4.4, hallazgo del revisor adversarial del 2026-09-05).
 *
 * EL DEFECTO, medido en Chrome sobre el build servido de `dcafec4` (tema
 * claro, `reducedMotion: reduce`, `Page.setFontSizes` a 16 y a 32 -- la misma
 * palanca que la preferencia del navegador, 320 px de viewport): las tres
 * lineas median 24px con las DOS raices, mientras el cuerpo de la pagina
 * doblaba de 16 a 32 en la MISMA muestra. Dos causas encadenadas: el suelo
 * estaba escrito en PIXELES (`24px`) y ademas vivia DENTRO del `min()` que
 * acota por ancho disponible, asi que el tope podia perforarlo -- con el
 * suelo ya en `rem`, el tope `(320 - 2*16)/12 = 24px` habria seguido
 * devolviendo 24px y el cambio de unidad no habria servido de nada.
 *
 * QUE SE CANDA: la PROPIEDAD, no la cadena. Se resuelve la declaracion real
 * con `longitudCssEnPx` (`src/test/cssLength.ts`, verificado contra estas
 * mismas cifras de navegador en `cssLength.test.ts`) y se exige (a) el mismo
 * numero que se midio antes del arreglo con la raiz por defecto, a cuatro
 * anchos, (b) al menos el doble con la raiz a 32 px, y (c) que ningun extremo
 * vuelva a escribirse en pixeles.
 *
 * `white-space: nowrap` SE RETIRA en el mismo arreglo, y tambien se canda:
 * con la fuente al 200 % la linea mas larga pide 9,84em (medido: 236,11px de
 * caja a 24px de fuente, 17 caracteres) sobre 288px utiles, asi que `nowrap`
 * la sacaria del viewport -- perdida de contenido, WCAG 1.4.10. La garantia
 * de una linea por cartel con la raiz por defecto no dependia de `nowrap`
 * sino de la propia formula (el tope reparte el ancho util en 12em y el texto
 * ocupa 9,84), y el reveal tampoco: cada linea es su propio elemento con su
 * propia transicion.
 *
 * ## Validado con el bug inyectado a proposito (regla 34 de RULES.md)
 *
 * Los dos sabotajes se aplicaron de verdad, se vio el rojo y se restauro. Las
 * lineas van copiadas de la salida, no predichas.
 *
 * 1. DEVOLVIENDO EL SUELO A PIXELES -- `STORY_STATEMENT_MIN_SIZE` de
 *    `"1.5rem"` a `"24px"`, que es exactamente el defecto que el revisor
 *    midio. Rojo en los dos casos que tienen que cazarlo:
 *
 *      AssertionError: el cartel no crece con la raiz: 24px con la raiz a 32px (antes 24px con la raiz a 16px). WCAG 1.4.4 pide que el texto llegue al 200 %.: expected 24 to be greater than or equal to 48
 *
 *      AssertionError: font-size del cartel con extremo en pixeles: "max(24px,min(10.5vw,19.2vh,21.25rem,calc((100vw-var(--story-statement-pad)-var(--story-statement-pad))/12)))". Los extremos de una tipografia fluida se declaran en rem: un pixel no sabe nada de la preferencia de tamano de texto del usuario.: expected [ '24px' ] to have a length of +0 but got 1
 *
 * 2. DEVOLVIENDO `white-space: nowrap` a las tres lineas:
 *
 *      AssertionError: "Cada idea" sigue en nowrap: a 320px y raiz 32px pide 472px de linea sobre 288 utiles (WCAG 1.4.10): expected 'nowrap' not to be 'nowrap' // Object.is equality
 */
describe("Story: el cartel del statement crece con la preferencia de tamano de texto", () => {
  /** Alto del viewport con el que se midio en Chrome. */
  const ALTO_VIEWPORT = 800;

  /**
   * Cifras MEDIDAS en Chrome sobre el build servido de `dcafec4` con la raiz
   * por defecto: el contrato de "no cambia ni un pixel a ningun ancho
   * soportado".
   */
  const MEDIDO_RAIZ_16 = [
    { ancho: 320, fontSize: 24 },
    { ancho: 390, fontSize: 29.8333 },
    { ancho: 768, fontSize: 58.6667 },
    { ancho: 1280, fontSize: 101.333 },
  ] as const;

  /** El umbral `sm` del tema, leido de la MISMA fuente que el CSS (nunca un
   *  600 tecleado): `screen and (min-width: 37.5em)`. Las media queries
   *  resuelven `em` contra el tamano de fuente inicial, que es la raiz que
   *  este candado varia. */
  function umbralSmEnEm(): number {
    const encontrado = /\(min-width:\s*([\d.]+)em\)/.exec(
      basicLightTheme.breakPoint.sm,
    );
    expect(
      encontrado,
      "el breakpoint sm dejo de declararse en em",
    ).not.toBeNull();
    return Number(encontrado?.[1]);
  }

  /** El valor vigente de `--story-statement-pad` para esa raiz y ese ancho,
   *  leido de los tokens que el componente consume. */
  function padVigente(raizPx: number, anchoPx: number): string {
    return anchoPx >= umbralSmEnEm() * raizPx
      ? basicLightTheme.inlineSpace[6]
      : basicLightTheme.inlineSpace[4];
  }

  /** La declaracion real de las tres lineas (jsdom devuelve el texto crudo:
   *  no resuelve min(), max(), calc() ni var()). */
  function declaracionesDelCartel(): string[] {
    renderWithProviders(<Story />);
    return [
      esHome.Home.story.statement.first,
      esHome.Home.story.statement.second,
      esHome.Home.story.statement.third,
    ].map((texto) => getComputedStyle(screen.getByText(texto)).fontSize);
  }

  function enPx(declaracion: string, raizPx: number, anchoPx: number): number {
    return longitudCssEnPx(declaracion, {
      raizPx,
      anchoPx,
      altoPx: ALTO_VIEWPORT,
      vars: { "--story-statement-pad": padVigente(raizPx, anchoPx) },
    });
  }

  it("con la raiz por defecto mide EXACTAMENTE lo mismo que antes del arreglo, a los cuatro anchos", () => {
    for (const declaracion of declaracionesDelCartel()) {
      for (const caso of MEDIDO_RAIZ_16) {
        expect(
          redondear(enPx(declaracion, 16, caso.ancho), 4),
          `el cartel cambio de tamano a ${String(caso.ancho)}px con la raiz por defecto`,
        ).toBeCloseTo(caso.fontSize, 3);
      }
    }
  });

  it("con la raiz a 32px (la preferencia al 200 %) el cartel dobla, en vez de quedarse clavado en 24px", () => {
    for (const declaracion of declaracionesDelCartel()) {
      const al200 = enPx(declaracion, 32, MIN_VIEWPORT_PX);
      expect(
        al200,
        `el cartel no crece con la raiz: ${String(redondear(al200))}px con la raiz a 32px (antes 24px con la raiz a 16px). WCAG 1.4.4 pide que el texto llegue al 200 %.`,
      ).toBeGreaterThanOrEqual(48);
      expect(al200).toBeGreaterThanOrEqual(1.5 * 24);
    }
  });

  it("ni el suelo ni el techo del cartel se escriben en pixeles", () => {
    for (const declaracion of declaracionesDelCartel()) {
      const enPixeles = declaracion.match(/\d+(?:\.\d+)?px\b/g) ?? [];
      expect(
        enPixeles,
        `font-size del cartel con extremo en pixeles: "${declaracion.replace(/\s+/g, "")}". Los extremos de una tipografia fluida se declaran en rem: un pixel no sabe nada de la preferencia de tamano de texto del usuario.`,
      ).toHaveLength(0);
    }
  });

  it("las tres lineas ya no declaran white-space: nowrap: con la fuente al 200 % sacaria el cartel del viewport", () => {
    renderWithProviders(<Story />);
    const lineas = [
      esHome.Home.story.statement.first,
      esHome.Home.story.statement.second,
      esHome.Home.story.statement.third,
    ].map((texto) => screen.getByText(texto));

    for (const linea of lineas) {
      expect(
        getComputedStyle(linea).whiteSpace,
        `"${linea.textContent ?? ""}" sigue en nowrap: a 320px y raiz 32px pide 472px de linea sobre 288 utiles (WCAG 1.4.10)`,
      ).not.toBe("nowrap");
      expect(cssRuleTextFor(linea).replace(/\s+/g, "")).not.toContain(
        "white-space:nowrap",
      );
    }
  });
});

/*
 * ===========================================================================
 * CANDADO DE LA LEY DEL ESTADO "NO CABE" (crítica externa #19, P1 número 3;
 * WCAG 1.4.4 Resize Text).
 *
 * ## El defecto
 *
 * Medido sobre el build de `f3594ad` en Chrome (tema oscuro, sin
 * `prefers-reduced-motion`, raíz a 32 px por `Page.setFontSizes`, 320x800):
 * con la diapositiva de cierre activa, el enlace de comunidad quedaba 738 px
 * POR DEBAJO del borde inferior del escenario, que mide una pantalla y recorta
 * (`overflow: hidden`). A 390x800, 474 px fuera; a raíz 24, 85 px fuera; a raíz
 * 16, dentro con 263 px de holgura. Ningún gesto lo alcanzaba.
 *
 * ## Qué ata este bloque, y qué NO
 *
 * `useDeckFit.test.tsx` ata el MOTOR de la decisión (cuándo se escribe el
 * estado). Aquí se atan las otras dos mitades, que aquel no puede ver:
 *
 * 1. LA LEY: que el CSS del estado "no cabe" sea, componente a componente y
 *    declaración a declaración, el MISMO que el de `prefers-reduced-motion:
 *    reduce`. Es lo que convierte el arreglo en una sola ley con dos causas en
 *    vez de en dos linealizaciones que divergen al primer retoque.
 * 2. EL CABLEADO: que la PISTA real de Story reciba el atributo -- el hook
 *    puede estar impecable y no estar llamado, o estarlo con los refs
 *    cambiados.
 *
 * No mide píxeles: jsdom no hace layout ni evalúa `@media` (lección
 * 2026-07-27), así que la ley se lee del CSSOM y la geometría del cableado se
 * fabrica con `Object.defineProperty`, igual que el resto de la suite. Lo que
 * la geometría real produce se verificó en Chrome sobre el build de esta ola.
 *
 * ## Validado con el bug inyectado a propósito (regla 34 de RULES.md)
 *
 * Las líneas rojas van copiadas de la salida, no predichas.
 *
 * SABOTAJE 1 -- un componente se queda fuera de la ley: el bloque de `ScRail`
 * (`story.deck.tsx`) vuelve a escribirse como `@media (prefers-reduced-motion:
 * reduce) { display: none; }` en vez de pasar por `deckStatic`. Rojo con su
 * nombre, `Tests  1 failed | 4 passed | 124 skipped (129)`:
 *
 *   × ... > el estado "no cabe" declara EXACTAMENTE lo mismo que reduce, componente a componente
 *   AssertionError: bloques de reduce sin gemelo de estado: ScRail &: expected [ 'ScRail &' ] to deeply equal []
 *
 * SABOTAJE 2 -- la reserva de la cola desaparece: se retira el bloque
 * `@media (prefers-reduced-motion: no-preference)` de `ScTrack`. Rojo en dos
 * casos, `Tests  2 failed | 3 passed | 124 skipped (129)`:
 *
 *   × ... > las reglas de estado anidadas bajo otra @media son EXACTAMENTE las declaradas
 *   AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]
 *   × ... > la pista linealizada por no caber reserva la cola que el pin ya reservaba
 *   AssertionError: la pista no declara ninguna reserva de cola en el estado "no cabe": la seccion siguiente sube sobre contenido vivo: expected undefined to be defined
 *
 * SABOTAJE 3 -- el hook deja de estar cableado: la llamada
 * `useDeckFit(trackRef, stageRef)` de `StoryDeckDark` (`Story.tsx`) pasa a
 * `void useDeckFit;`. Rojo en el cableado, `Tests  1 failed | 4 passed | 124
 * skipped (129)`:
 *
 *   × ... > la PISTA real de Story recibe el estado cuando una diapositiva no cabe
 *   AssertionError: expected null to be 'false' // Object.is equality
 */
describe("Story: critica #19 -- el escenario solo pina cuando cada diapositiva cabe", () => {
  /** Selector de estado tal y como lo escriben los dos ficheros de deck. */
  const SELECTOR_ESTADO = `[${DECK_FIT_ATTRIBUTE}="${DECK_DOES_NOT_FIT}"]`;

  /**
   * Los componentes del deck que HOY linealizan. La lista no se deduce del
   * CSSOM: se declara, para que retirar un componente de la ley salga en rojo
   * en vez de reducir en silencio lo que el candado vigila.
   */
  const COMPONENTES_QUE_LINEALIZAN = [
    "ScDeck",
    "ScRail",
    "ScRailMark",
    "ScScrollHint",
    "ScSceneWrap",
    "ScSlide",
    "ScStage",
    "ScTrack",
  ];

  /**
   * Componentes del módulo con bloque de `reduce` que NO son de esta ley, con
   * el motivo. Se declaran uno a uno, y no se filtran por descarte, porque la
   * diferencia entre "este reduce no habla del pin" y "a este se le olvidó el
   * estado" no la puede decidir un test: la decide quien escribe el
   * componente, y aquí queda por escrito.
   */
  const AJENOS_A_LA_LEY: Record<string, string> = {
    ScDeckNoteAccent:
      "su bloque de reduce llega con `gradientTextClip` (BrandName.tsx) y " +
      "sustituye el degradado ANIMADO del acento por un color plano: habla " +
      "del movimiento del propio texto, no de si la presentacion esta pinada",
  };

  /** Props que exige algún componente del módulo para poder renderizarse. */
  const PROPS_EXIGIDAS: Record<string, Record<string, unknown>> = {
    ScRailMark: { $index: 0 },
  };

  /**
   * Un componente de styled-components se reconoce por `styledComponentId`, y
   * no por su tipo: los tipos exportados por el módulo son cada uno los suyos
   * (un `styled.button` con `$index`, un `styled.h2` sin props propias...) y
   * ningún tipo común los cubre. Se rebajan a un componente de props abiertas
   * para poder montarlos en bloque; el contrato real de cada uno lo sigue
   * comprobando `pnpm typecheck` en su consumidor de verdad.
   */
  type Estilado = ComponentType<Record<string, unknown>>;

  function esEstilado(valor: unknown): boolean {
    return (
      (typeof valor === "object" || typeof valor === "function") &&
      valor !== null &&
      "styledComponentId" in valor
    );
  }

  /*
   * Monta TODO lo exportado por `story.deck.tsx` que sea un styled, no una
   * lista escrita a mano: un componente nuevo con bloque de `reduce` entra
   * solo en el candado. styled-components no inyecta el CSS de un componente
   * hasta que se renderiza, así que sin este montaje la mitad de las reglas no
   * existiría en el CSSOM.
   */
  function montarElDeckEntero(): Map<string, string[]> {
    const entradas: [string, Estilado][] = Object.entries(storyDeck)
      .filter(([, valor]) => esEstilado(valor))
      .map(([nombre, valor]) => [nombre, valor as unknown as Estilado]);
    expect(entradas.length).toBeGreaterThanOrEqual(
      COMPONENTES_QUE_LINEALIZAN.length,
    );
    renderWithProviders(
      <>
        {entradas.map(([nombre, Componente]) =>
          createElement(Componente, {
            "key": nombre,
            "data-probe": nombre,
            ...(PROPS_EXIGIDAS[nombre] ?? {}),
          }),
        )}
      </>,
    );
    const porNombre = new Map<string, string[]>();
    for (const [nombre] of entradas) {
      const el = document.querySelector(`[data-probe="${nombre}"]`);
      if (!el) throw new Error(`${nombre} no llego a renderizarse`);
      porNombre.set(nombre, Array.from(el.classList));
    }
    return porNombre;
  }

  interface LecturaCssom {
    /** `<componente> <selector>` -> declaraciones dentro de `reduce`. */
    readonly ley: Record<string, string>;
    /** Lo mismo para las reglas de estado SIN condición de medio. */
    readonly estado: Record<string, string>;
    /** Reglas de estado anidadas bajo otra `@media`: excepciones declaradas. */
    readonly excepciones: Record<string, string>;
    /** `selectorText` completo de cada regla de estado sin condición. */
    readonly selectores: string[];
  }

  function leerCssom(porNombre: Map<string, string[]>): LecturaCssom {
    const ley: Record<string, string> = {};
    const estado: Record<string, string> = {};
    const excepciones: Record<string, string> = {};
    const selectores: string[] = [];

    /*
     * La clase se busca como TOKEN completo, no como substring: las clases
     * que genera styled-components son hashes cortos y uno puede ser prefijo
     * de otro (`.dGHM` dentro de `.dGHMvj`), con lo que un componente se
     * quedaría con las reglas de otro y la comparación de abajo compararía
     * cualquier cosa.
     */
    const coincide = (selector: string, clase: string): boolean =>
      new RegExp(`\\.${clase}(?![\\w-])`).test(selector);

    const duenyo = (selector: string): [string, string[]] | null => {
      for (const [nombre, clases] of porNombre) {
        if (clases.some((clase) => coincide(selector, clase))) {
          return [nombre, clases];
        }
      }
      return null;
    };

    /*
     * Normaliza un `selectorText` a la forma en que está escrito en el fuente:
     * la clase generada vuelve a ser `&` y el trozo de estado desaparece, así
     * que `.abc[data-deck-fit="false"]::before` y `.abc::before` (dentro de
     * `reduce`) producen la MISMA clave y se pueden comparar. De la lista de
     * selectores se toma la primera rama: `deckStatic` emite las dos (la
     * calificada y la descendiente) y el test siguiente las comprueba aparte.
     */
    const clave = (selector: string, clases: string[]): string => {
      let texto = selector.split(",")[0].trim();
      for (const clase of clases) texto = texto.split(`.${clase}`).join("&");
      return texto.split(SELECTOR_ESTADO).join("").trim();
    };

    for (const hoja of Array.from(document.styleSheets)) {
      let reglas: CSSRule[];
      try {
        reglas = Array.from(hoja.cssRules);
      } catch {
        continue;
      }
      for (const regla of reglas) {
        if (regla instanceof CSSMediaRule) {
          const condicion = regla.media.mediaText;
          const esReduce = condicion.includes("prefers-reduced-motion: reduce");
          for (const anidada of Array.from(regla.cssRules)) {
            if (!(anidada instanceof CSSStyleRule)) continue;
            const propietario = duenyo(anidada.selectorText);
            if (!propietario) continue;
            const [nombre, clases] = propietario;
            if (esReduce) {
              ley[`${nombre} ${clave(anidada.selectorText, clases)}`] =
                anidada.style.cssText;
            } else if (anidada.selectorText.includes(SELECTOR_ESTADO)) {
              const medio = condicion.includes("no-preference")
                ? "no-preference"
                : condicion;
              excepciones[
                `${nombre} | ${medio} | ${clave(anidada.selectorText, clases)}`
              ] = anidada.style.cssText;
            }
          }
          continue;
        }
        if (!(regla instanceof CSSStyleRule)) continue;
        if (!regla.selectorText.includes(SELECTOR_ESTADO)) continue;
        const propietario = duenyo(regla.selectorText);
        if (!propietario) continue;
        const [nombre, clases] = propietario;
        estado[`${nombre} ${clave(regla.selectorText, clases)}`] =
          regla.style.cssText;
        selectores.push(regla.selectorText);
      }
    }
    return { ley, estado, excepciones, selectores };
  }

  const nombresDe = (mapa: Record<string, string>): string[] =>
    Array.from(new Set(Object.keys(mapa).map((k) => k.split(" ")[0]))).sort();

  const filtrar = (
    mapa: Record<string, string>,
    dentro: boolean,
  ): Record<string, string> =>
    Object.fromEntries(
      Object.entries(mapa).filter(
        ([k]) =>
          COMPONENTES_QUE_LINEALIZAN.includes(k.split(" ")[0]) === dentro,
      ),
    );

  it('el estado "no cabe" declara EXACTAMENTE lo mismo que reduce, componente a componente', () => {
    const { ley, estado } = leerCssom(montarElDeckEntero());
    const deLaLey = filtrar(ley, true);

    // Sin esto el test sería vacuo el día que alguien retire TODOS los bloques
    // de reduce: dos mapas vacíos son iguales.
    expect(nombresDe(deLaLey)).toEqual([...COMPONENTES_QUE_LINEALIZAN].sort());

    // Primero QUIÉN falta, y por su nombre: el `toEqual` de los dos mapas
    // trunca la diferencia y deja un rojo que no dice qué componente se quedó
    // sin estado. Después, el CUERPO declaración a declaración.
    const sinGemelo = Object.keys(deLaLey).filter((k) => !(k in estado));
    const deMas = Object.keys(estado).filter((k) => !(k in deLaLey));
    expect(
      sinGemelo,
      `bloques de reduce sin gemelo de estado: ${sinGemelo.join(" | ")}`,
    ).toEqual([]);
    expect(
      deMas,
      `bloques de estado sin gemelo de reduce: ${deMas.join(" | ")}`,
    ).toEqual([]);
    expect(estado).toEqual(deLaLey);
    // Y todo bloque de `reduce` del módulo que NO sea de la ley tiene que
    // estar declarado arriba con su motivo: así un componente nuevo no puede
    // quedarse sin estado por descuido y pasar por excepción.
    expect(nombresDe(filtrar(ley, false))).toEqual(
      Object.keys(AJENOS_A_LA_LEY).sort(),
    );
  });

  /*
   * La lección §5.1 del manual de la casa, en su forma exacta: el estado vive
   * en la PISTA, así que el bloque tiene que alcanzar tanto al elemento que lo
   * lleva (`&[data-deck-fit="false"]`, la pista) como a sus descendientes
   * (`[data-deck-fit="false"] &`, todo lo demás). Con una sola de las dos
   * ramas, la mitad de los componentes dejaría de reaccionar EN SILENCIO: el
   * CSS sigue siendo válido y ningún test de contenido lo notaría.
   */
  it("cada regla de estado trae las DOS ramas del selector: la calificada y la descendiente", () => {
    const { selectores } = leerCssom(montarElDeckEntero());
    expect(selectores.length).toBeGreaterThanOrEqual(
      COMPONENTES_QUE_LINEALIZAN.length,
    );
    for (const selector of selectores) {
      const ramas = selector.split(",").map((r) => r.trim());
      expect(
        ramas.some((rama) => /^\.[\w-]+\[data-deck-fit="false"\]/.test(rama)),
        `sin rama calificada: ${selector}`,
      ).toBe(true);
      expect(
        ramas.some((rama) => rama.startsWith(`${SELECTOR_ESTADO} `)),
        `sin rama descendiente: ${selector}`,
      ).toBe(true);
    }
  });

  /*
   * Las reglas de estado que viven DENTRO de otra `@media` no entran en la
   * comparación de arriba, y por eso se enumeran aquí una a una: son la puerta
   * por la que una divergencia podría colarse sin que la ley se entere.
   *
   * Hoy son dos, las dos bajo `no-preference` y las dos por el mismo motivo --
   * compensan algo que SOLO existe cuando el movimiento está permitido:
   *
   * - `ScDeck`: cancela el scrub de rebobinado, que solo se declara bajo
   *   `no-preference` y seguiría corriendo sobre un deck ya linealizado.
   * - `ScTrack`: restituye la cola de la pista, sobre la que la sección
   *   siguiente sube (ver el test que la mide, justo debajo).
   */
  it("las reglas de estado anidadas bajo otra @media son EXACTAMENTE las declaradas", () => {
    const { excepciones } = leerCssom(montarElDeckEntero());
    expect(Object.keys(excepciones).sort()).toEqual([
      'ScDeck | no-preference | [data-dir="rewind"] &',
      "ScTrack | no-preference | &",
    ]);
    expect(excepciones['ScDeck | no-preference | [data-dir="rewind"] &']).toBe(
      "animation: none;",
    );
  });

  /*
   * LA OTRA MITAD DEL ARREGLO, la que no se ve mirando el deck. Medido sobre
   * el build de esta ola en Chrome (320x800, raíz 32, tema oscuro, sin
   * `prefers-reduced-motion`, coordenadas de documento): con el escenario ya
   * linealizado pero SIN esta reserva, el enlace de comunidad ocupaba de 8.114
   * a 8.249 y la sección Journey empezaba en 7.449 -- 800 px de solape opaco.
   * El contenido dejaba de estar recortado para estar TAPADO. Con la reserva,
   * el solape mide 0, que es exactamente lo que mide bajo `reduce`.
   *
   * La aserción compara MAGNITUD y UNIDAD contra las constantes, no contra un
   * literal: la reserva tiene que seguir valiendo lo que la pista pinada ya
   * reservaba el día que la cola deje de ser de una pantalla.
   */
  it("la pista linealizada por no caber reserva la cola que el pin ya reservaba", () => {
    const { excepciones } = leerCssom(montarElDeckEntero());
    const reserva = excepciones["ScTrack | no-preference | &"];
    expect(
      reserva,
      'la pista no declara ninguna reserva de cola en el estado "no cabe": la seccion siguiente sube sobre contenido vivo',
    ).toBeDefined();
    const numeros = (reserva ?? "").match(/[\d.]+/g) ?? [];
    const unidad = (valor: string): string => valor.replace(/^[\d.]+/, "");
    expect(reserva).toContain("padding-block-end");
    expect(reserva).toContain(unidad(STORY_DARK_HEIGHT));
    // `calc(<pantallas> * <alto de pantalla>)`: los dos números de la
    // declaración son exactamente esos dos factores.
    expect(numeros.map(Number)).toEqual([
      STORY_DECK_TAIL_SCREENS,
      Number.parseFloat(STORY_DARK_HEIGHT),
    ]);
  });

  /*
   * EL CABLEADO. `useDeckFit.test.tsx` prueba el hook contra un deck de
   * mentira; esto prueba que Story lo llama con SUS refs -- que el atributo
   * aterriza en la pista real, la que el CSS de arriba mira, y no en el
   * escenario ni en ningún otro sitio. La geometría se fabrica porque jsdom no
   * hace layout: 800 px de escenario contra 2.049 px de diapositiva son las
   * dos medidas del hallazgo.
   */
  it("la PISTA real de Story recibe el estado cuando una diapositiva no cabe", async () => {
    // La presentación solo existe en la rama oscura (`HomeSections`), y el
    // tema sale de `localStorage`: mismo preparativo que el resto de los
    // bloques de este fichero que miran el deck.
    window.localStorage.setItem("vti-theme", "dark");
    const disparos: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          disparos.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    const altoOriginal = window.innerHeight;
    window.innerHeight = 800;
    try {
      const { container } = renderWithProviders(<Story />);
      await waitFor(() => {
        expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
          STORY_SLIDES,
        );
      });
      const stage = container.querySelector("[data-slide]") as HTMLElement;
      const track = stage.parentElement as HTMLElement;
      const slides = Array.from(
        stage.querySelectorAll<HTMLElement>("[data-slide-index]"),
      );
      const fijar = (el: HTMLElement, prop: string, valor: number): void => {
        Object.defineProperty(el, prop, { value: valor, configurable: true });
      };
      fijar(stage, "clientHeight", 800);
      for (const slide of slides) fijar(slide, "scrollHeight", 2049);

      act(() => disparos.forEach((disparar) => disparar()));
      expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);
      // El estado vive en la PISTA: el escenario no lo lleva, o la rama
      // descendiente del selector dejaría fuera al propio escenario.
      expect(stage.hasAttribute(DECK_FIT_ATTRIBUTE)).toBe(false);

      for (const slide of slides) fijar(slide, "scrollHeight", 522);
      act(() => disparos.forEach((disparar) => disparar()));
      expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);
    } finally {
      window.innerHeight = altoOriginal;
      window.localStorage.clear();
    }
  });
});
