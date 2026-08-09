import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import i18n from "@/i18n/config";
import { Story, pillarBadgeAccent } from "./Story";
import { motion } from "@/theme/tokens/motion";
import { contrastRatio } from "@/theme/tokens/contrast";
import { basicLightTheme } from "@/theme/themes";
import {
  STORY_DARK_HEIGHT,
  STORY_DARK_MAX_WIDTH,
  STORY_DECK_NOTE_SIZE,
  STORY_DECK_PILLAR_TITLE_SIZE,
  STORY_DECK_TITLE_SIZE,
  STORY_FIGURE_SCROLL_SHIFT,
  STORY_SLIDES,
} from "./story.layers";

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

  it("renderiza 4 tarjetas con numero, etiqueta de paso, titulo, body e inspiration", () => {
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

    // La etiqueta de paso ("Paso"/"Step") se repite una vez por tarjeta.
    expect(screen.getAllByText(esHome.Home.story.stepLabel)).toHaveLength(4);
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
  it("D7: ScGrid unifica su entrada a motion.duration.slower + easing.decelerate en las dos propiedades transicionadas", () => {
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
      `opacity ${motion.duration.slower} ${motion.easing.decelerate},transform ${motion.duration.slower} ${motion.easing.decelerate}`,
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

  it("D2: #statement es UNA sola <section> que contiene directamente el parrafo -- min-height: 100dvh, sin position: sticky/top ni ninguna height: de varias pantallas", () => {
    const { container } = renderWithProviders(<Story />);
    const statement = container.querySelector("#statement") as HTMLElement;
    const paragraph = statement.querySelector("p") as HTMLElement;

    // "Contiene directamente": un solo hijo en flujo, el parrafo -- sin
    // ScStatementStage intermedio (D13 partia el bloque en pista+stage; D2
    // los funde de vuelta en un unico <section>).
    expect(statement.children).toHaveLength(1);
    expect(statement.firstElementChild).toBe(paragraph);

    const css = cssRuleTextFor(statement);
    const topLevelCss = css.split("@media")[0];
    expect(topLevelCss).toContain("min-height: 100dvh");
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

  it("la nota se muestra como noteLead + noteAccent en su propio elemento, sin la tarjeta ni el sparkle de claro", async () => {
    // Sustituye al test que aseveraba `getByText(note)` (spec
    // 2026-07-31-story-deck-tipografia-design.md T3): la nota ya no es un
    // unico nodo de texto, se parte en noteLead + un span con noteAccent.
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.story.noteLead)).toBeInTheDocument();
    });
    const accent = screen.getByText(esHome.Home.story.noteAccent);
    // noteAccent vive en un ELEMENTO PROPIO, no en el mismo nodo de texto
    // que noteLead.
    expect(accent.tagName).toBe("SPAN");
    expect(accent).not.toBe(screen.getByText(esHome.Home.story.noteLead));
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

  it("reparte el contenido de las 6 diapositivas en el orden del encargo: intro, 4 pilares, nota", async () => {
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

    // Diapositiva 5: la nota de cierre, partida en noteLead + noteAccent
    // (T3 de la spec 2026-07-31-story-deck-tipografia-design.md): la nota
    // ya no es un unico nodo de texto (sustituye a la aserción anterior
    // sobre `esHome.Home.story.note`).
    expect(
      within(slides[5]).getByText(esHome.Home.story.noteLead),
    ).toBeInTheDocument();
    const accent = within(slides[5]).getByText(esHome.Home.story.noteAccent);
    expect(accent.tagName).toBe("SPAN");
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
 * Tarea 2 (spec 2026-07-31-story-deck-tipografia-design.md): escala
 * tipografica de cartel de la diapositiva oscura + texto de inspiracion por
 * pilar + nota partida en noteLead/noteAccent con el mismo tratamiento que
 * "ToInfinite" en el Hero. Mismas advertencias de jsdom que el resto del
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

  it("la nota de cierre computa STORY_DECK_NOTE_SIZE", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const noteLead = screen.getByText(esHome.Home.story.noteLead);
    expect(getComputedStyle(noteLead).fontSize).toBe(STORY_DECK_NOTE_SIZE);
  });

  it("noteAccent esta en un elemento PROPIO, no en el mismo nodo de texto que noteLead", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const noteLead = screen.getByText(esHome.Home.story.noteLead);
    const noteAccent = screen.getByText(esHome.Home.story.noteAccent);
    expect(noteAccent).not.toBe(noteLead);
    expect(noteAccent.tagName).toBe("SPAN");
  });

  it("el cuerpo de pilar (inspiration) y la nota declaran text-wrap: balance en el CSS inyectado", async () => {
    // jsdom no evalua NINGUN efecto de layout de text-wrap (leccion
    // 2026-07-27 repetida en todo este archivo): se ata por TEXTO de la
    // regla inyectada, con el mismo helper que ya usa el resto de la suite.
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("[data-slide-index]")).toHaveLength(
        STORY_SLIDES,
      );
    });
    const inspiration = screen.getByText(
      esHome.Home.story.pillars.learn.inspiration,
    );
    const note = screen.getByText(esHome.Home.story.noteLead);

    for (const el of [inspiration, note]) {
      const css = cssRuleTextFor(el);
      expect(css).toMatch(/text-wrap:\s*balance/);
    }
  });
});
