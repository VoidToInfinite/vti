import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { semanticDark, semanticLight } from "@/theme/tokens/semantic";
import { space } from "@/theme/tokens/space";
import { StageProvider } from "@/motion/StageProvider";
import { Hero } from "./Hero/Hero";
import { Story } from "./Story/Story";

/*
 * Lente de INTEGRACION entre Hero y Story, reescrita para la landing v2
 * (spec 2026-07-28, D3/D4).
 *
 * QUE CAMBIO respecto a la version anterior de este archivo: Story dejaba de
 * ser una superficie SIEMPRE oscura con ThemeProvider propio y una costura
 * (`ScSeam`) que empalmaba el negro del hero con el poster de Three.js. Las
 * dos cosas desaparecieron (Three.js se retira del repo entero, D4) y la
 * costura ya no hace falta: medido en `aura.parts.tsx:473-485`, el pie del
 * hero CLARO (`ScAuraFoot`) ya es una rampa que asciende hasta terminar
 * exactamente en `theme.data.semantic.bg` -- la misma superficie contra la
 * que resuelve Story, que no declara un `background` propio. Los tests que
 * describian ese mundo viejo (costura negra, contraste forzado contra un
 * poster, Story computando SIEMPRE el texto oscuro) ya no describen nada
 * real y se eliminan; se conservan los que siguen siendo ciertos:
 *
 *  - la jerarquia de encabezados es de PAGINA (un solo h1, el h2 de Story
 *    despues);
 *  - el ancla del CTA principal del hero (#story) resuelve a un elemento
 *    real;
 *  - Hero y Story son hermanos INMEDIATOS al montarlos juntos;
 *  - el pie del hero (oscuro siempre, claro solo por opacidad) sigue sin
 *    cambios -- Hero esta fuera de alcance de esta entrega;
 *  - la paridad de copia ES/EN sigue cubierta para las dos secciones.
 *
 * Se monta `<Hero/><Story/>` directamente, NO `app/page.tsx`: la composicion
 * final de la pagina (Navbar + HomeSections + Footer) es propiedad de otro
 * flujo de esta misma entrega y puede seguir cambiando mientras este archivo
 * se escribe -- acoplarse a ella aqui arriesgaria un fallo por una causa
 * ajena a la integracion Hero/Story que este archivo existe para cubrir.
 */

/** Stub minimo de matchMedia: Hero monta Eye -> usePointer, que lo llama. */
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

/** Story monta useReveal, que construye un IntersectionObserver al montar. */
function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  stubMatchMedia();
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/** Texto CSS de las reglas inyectadas por styled-components para un elemento. */
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
 * `Hero` consume `useStage()` (tarea C5): sin un `StageProvider` en el
 * arbol, el hook lanza. `renderWithProviders` (test-utils.tsx) es un helper
 * COMPARTIDO con otros flujos y no se toca (CLAUDE.md §9): se envuelve aqui,
 * localmente, mismo patron que Navbar.test.tsx/Hero.test.tsx.
 */
function renderPage(): HTMLElement {
  const { container } = renderWithProviders(
    <StageProvider>
      <Hero />
      <Story />
    </StageProvider>,
  );
  return container;
}

describe("Hero + Story (integracion)", () => {
  it("la pagina tiene UN solo h1 y el h2 de Story va despues", () => {
    // Hero.test cuenta encabezados dentro del contenedor del Hero y
    // Story.test dentro del suyo: ninguno de los dos puede ver un segundo h1
    // introducido por la otra seccion.
    const container = renderPage();

    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/VoidToInfinite/i);

    const encabezados = Array.from(container.querySelectorAll("h1,h2"));
    expect(encabezados.map((el) => el.tagName)).toEqual(["H1", "H2"]);
    expect(
      encabezados[0].compareDocumentPosition(encabezados[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("el ancla del CTA principal del hero resuelve a la seccion Story real", () => {
    // El href y el id viven en archivos distintos (Hero.tsx / Story.tsx): si
    // alguien renombra uno de los dos, cada suite por separado sigue en
    // verde y el boton deja de navegar. Solo se ve montando las dos
    // secciones juntas.
    //
    // Indice 0, no 1 (encargo 2026-08-08): el hero perdio el CTA al
    // playground que ocupaba la primera posicion; "Leer la historia" paso de
    // secundario a UNICO y principal.
    const container = renderPage();
    const cta = container.querySelectorAll("a")[0];

    expect(cta.getAttribute("href")).toBe("#story");
    const target = container.querySelector("#story");
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe("SECTION");
  });

  it("Hero y Story son hermanos inmediatos", () => {
    const container = renderPage();
    const hero = container
      .querySelector('[data-testid="hero-foot"]')
      ?.closest("section");
    const story = container.querySelector("#story");

    expect(hero).not.toBeNull();
    expect(hero?.nextElementSibling).toBe(story);
  });

  it("Story ya NO fuerza un tema propio: su kicker sigue el tema AMBIENTAL de la pagina", () => {
    // Contrafactual de la version anterior: aquella Story forzaba SIEMPRE el
    // texto del tema oscuro via un ThemeProvider anidado, sin importar el
    // tema de pagina. Ahora, sin ese anidado, el kicker tiene que resolver
    // al rol de marca del tema AMBIENTAL -- claro por defecto, oscuro si el
    // usuario lo guardo.
    /*
     * El kicker se localiza por su TEXTO, no por `previousElementSibling` del
     * h2. Hasta el 2026-08-06 eran equivalentes; con la barra de eyebrow que
     * introdujo esa entrega (spec `2026-08-06-story-features-tema-claro-design.md`,
     * D4) el kicker pasa a vivir dentro de un contenedor junto a la barra, así
     * que el hermano anterior del h2 es ese contenedor -- que no fija `color`
     * (lo fija su hijo), y `getComputedStyle` devolvía `canvastext`.
     *
     * Buscar por texto ata lo que este test QUIERE comprobar (que el kicker
     * resuelve al rol de marca del tema ambiental) sin depender de la
     * estructura DOM que lo rodea, que es exactamente la clase de acoplamiento
     * que lo rompió.
     */
    const clara = renderPage();
    const kickerClaro = within(clara).getByText(
      esHome.Home.story.kicker,
    ) as HTMLElement;
    expect(window.getComputedStyle(kickerClaro).color).toBe(
      semanticLight.brandText,
    );

    window.localStorage.setItem("vti-theme", "dark");
    const oscura = renderPage();
    const kickerOscuro = within(oscura).getByText(
      esHome.Home.story.kicker,
    ) as HTMLElement;
    expect(window.getComputedStyle(kickerOscuro).color).toBe(
      semanticDark.brandText,
    );
  });

  it("el hero pasa AA sobre el negro del lienzo, degradado de marca y anillo de foco incluidos", () => {
    // brandText es una parada del degradado detras del tramo "ToInfinite" del
    // titulo y del label del CTA secundario (heroGradient/gradientTextClip,
    // BrandName.tsx), un rol de color distinto al del resto de la copia;
    // nadie medía su contraste sobre el negro del ojo. Esto es exclusivamente
    // del Hero (fuera de alcance de esta entrega) y sigue valiendo tal cual.
    expect(
      contrastRatio(semanticDark.text, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticDark.brandText, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticDark.focus, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(3);
  });

  /*
   * COBERTURA PERDIDA (usuario retiro <ScKicker> de Hero.tsx, ver informe):
   * las dos pruebas que vivian aqui aseveraban `getComputedStyle(...).color`
   * del kicker contra `semanticDark.brandText`/`semanticLight.brandText` --
   * el color de marca por tema. Sin el kicker no queda ningun elemento del
   * hero que resuelva `brandText` como su propiedad `color` PLANA (fuera de
   * un `@media`): el titulo y el label del CTA secundario si consumen
   * brandText, pero como PARADA de un `background-image` degradado recortado
   * a texto (`heroGradient`/`gradientTextClip`, BrandName.tsx), nunca como
   * `color` propio -- su unica declaracion de `color: brandText` vive dentro
   * de `@media (prefers-reduced-motion: reduce)` y `@supports not
   * (background-clip: text)`, que jsdom no evalua para getComputedStyle (ver
   * CLAUDE.md). No hay reapunte fiel: se elimina sin sustituto.
   */

  it("el pie del hero mide space[8] y cierra en el negro del lienzo", () => {
    // La altura y el degradado NO cambian con el tema -- la rampa violeta
    // del tema claro vive aparte, en ScAuraFoot (dentro del stack de Aura,
    // fuera de esta propiedad) -- asi que este test sigue valiendo tal cual,
    // sin desdoblar, con la pagina en su tema por defecto (claro).
    const container = renderPage();
    const pie = container.querySelector(
      '[data-testid="hero-foot"]',
    ) as HTMLElement;
    const computed = window.getComputedStyle(pie);

    expect(computed.height).toBe(space[8]);
    const paradas =
      computed.backgroundImage.match(/oklch\([^)]*\)|transparent/g) ?? [];
    expect(paradas[paradas.length - 1]).toBe(EYE_SURFACE);
  });

  it("declara el bloque de reduced-motion en la copia del hero y en el reveal de Story", () => {
    // getComputedStyle de jsdom no evalua @media, pero el CSS inyectado si
    // es inspeccionable: al menos queda atornillado que la regla existe.
    const container = renderPage();
    // Se llega al contenedor (ScCopy) por el parentElement del titulo, el
    // primer hijo que sigue existiendo tras retirarse el kicker.
    const copiaHero = container.querySelector('[data-testid="hero-title"]')
      ?.parentElement as HTMLElement;
    const storyGrid = container.querySelector(
      "#story [data-revealed]",
    ) as HTMLElement;

    const cssCopiaHero = cssRuleTextFor(copiaHero);
    expect(cssCopiaHero).toContain("prefers-reduced-motion: reduce");

    const cssStoryGrid = cssRuleTextFor(storyGrid);
    expect(cssStoryGrid).toContain("prefers-reduced-motion: reduce");
    expect(cssStoryGrid).toContain("transition: none");
  });

  it("en ingles el hero y Story renderizan la copia inglesa, no la espanola", async () => {
    // Toda la suite compara contra el locale espanol: la mitad inglesa del
    // contrato de paridad no la renderizaba nadie.
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      const container = renderPage();
      const texto = (id: string): string =>
        container
          .querySelector(`[data-testid="${id}"]`)
          ?.textContent?.trim() as string;

      expect(texto("hero-subtitle")).toBe(enHome.Home.hero.subtitle);
      expect(texto("hero-subtitle")).not.toBe(esHome.Home.hero.subtitle);

      expect(container.querySelector("#story")?.textContent).toContain(
        enHome.Home.story.kicker,
      );
      expect(container.querySelector("#story")?.textContent).not.toContain(
        esHome.Home.story.kicker,
      );
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });
});
