import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import styled from "styled-components";
import { renderWithProviders } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import { EYE_SURFACE } from "@/components/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { semanticDark, semanticLight } from "@/theme/tokens/semantic";
import { space } from "@/theme/tokens/space";
import HomePage from "../../../app/page";
import { Hero } from "./Hero/Hero";
import { Story } from "./Story/Story";

/*
 * Lente de INTEGRACION / REGRESION.
 *
 * Los tests de Hero y de Story miden cada seccion por separado, dentro de su
 * propio contenedor. Este archivo monta las DOS a la vez, que es como se
 * entregan al usuario, y cubre los huecos que solo aparecen al juntarlas:
 *
 *  - la jerarquia de encabezados es de PAGINA, no de seccion (un h1 unico);
 *  - el ancla del CTA del hero tiene que resolver a un elemento REAL;
 *  - el contraste forzado de Story debe sostenerse tambien con la pagina en
 *    tema OSCURO (los tests existentes solo arrancan en claro);
 *  - la copia INGLESA no la comprobaba nadie: todos los tests comparan contra
 *    el locale espanol, que es la mitad del contrato de paridad.
 *
 * No se toca codigo de produccion.
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
 * Sonda del tema de PAGINA. Vive fuera de Hero y de Story, asi que resuelve al
 * tema que sirve el ThemeProvider de la app y no al oscuro anidado: sin ella,
 * un test "en tema oscuro" no probaria que la pagina esta de verdad en oscuro
 * (todo lo que se mide dentro de las dos secciones es oscuro por construccion).
 */
const ScProbe = styled.div`
  color: ${({ theme }) => theme.data.semantic.text};
`;

function renderPage(): HTMLElement {
  const { container } = renderWithProviders(
    <>
      <ScProbe data-testid="page-theme-probe" />
      <Hero />
      <Story />
    </>,
  );
  return container;
}

function pageThemeText(container: HTMLElement): string {
  const probe = container.querySelector(
    '[data-testid="page-theme-probe"]',
  ) as HTMLElement;
  return window.getComputedStyle(probe).color;
}

describe("Hero + Story (integracion)", () => {
  it("la pagina tiene UN solo h1 y el h2 de Story va despues", () => {
    // Hero.test cuenta encabezados dentro del contenedor del Hero y Story.test
    // dentro del suyo: ninguno de los dos puede ver un segundo h1 introducido
    // por la otra seccion.
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

  it("el ancla del CTA secundario del hero resuelve a un elemento real", () => {
    // El href y el id viven en archivos distintos: si alguien renombra uno de
    // los dos, cada suite por separado sigue en verde y el boton deja de
    // navegar. Solo se ve montando las dos secciones juntas.
    const container = renderPage();
    const cta = container.querySelectorAll("a")[1];

    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("#")).toBe(true);
    expect(container.querySelector(href)).not.toBeNull();
    expect(container.querySelector(href)?.tagName).toBe("SECTION");
  });

  it("con la pagina en tema OSCURO la copia de Story sigue en el texto oscuro", () => {
    // El caso existente arranca en tema CLARO. Este es el simetrico: si
    // alguien invirtiera la condicion del anidado, el caso claro seguiria en
    // verde y este fallaria.
    window.localStorage.setItem("vti-theme", "dark");
    const container = renderPage();
    // La sonda demuestra que la pagina esta en oscuro de verdad; sin esta
    // comprobacion el test seria vacuo (pasaria tambien en claro).
    expect(pageThemeText(container)).toBe(semanticDark.text);

    const title = container.querySelector("#story-title") as HTMLElement;
    const body = title.nextElementSibling as HTMLElement;

    expect(window.getComputedStyle(title).color).toBe(semanticDark.text);
    expect(window.getComputedStyle(body).color).toBe(semanticDark.text);
    expect(
      contrastRatio(semanticDark.text, semanticDark.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticDark.text, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("con la pagina en tema CLARO la copia de Story sigue en el texto oscuro", () => {
    // Contraparte del anterior, y prueba de que la sonda discrimina: la pagina
    // computa el texto CLARO mientras Hero y Story computan el OSCURO.
    const container = renderPage();
    const title = container.querySelector("#story-title") as HTMLElement;

    expect(pageThemeText(container)).toBe(semanticLight.text);
    expect(window.getComputedStyle(title).color).toBe(semanticDark.text);
  });

  it("el hero pasa AA sobre el negro del lienzo, kicker y anillo de foco incluidos", () => {
    // El kicker usa un rol de color distinto al del resto de la copia
    // (brandText); nadie medía su contraste sobre el negro del ojo.
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

  it("el kicker computa el color de marca del tema oscuro, no el texto por defecto", () => {
    const container = renderPage();
    const kicker = container.querySelector(
      '[data-testid="hero-kicker"]',
    ) as HTMLElement;

    expect(window.getComputedStyle(kicker).color).toBe(semanticDark.brandText);
  });

  it("el pie del hero mide space[8] y cierra en el negro del lienzo", () => {
    const container = renderPage();
    const pie = container.querySelector(
      '[data-testid="hero-foot"]',
    ) as HTMLElement;
    const computed = window.getComputedStyle(pie);

    expect(computed.height).toBe(space[8]);
    // Ultima parada del degradado: es la fila de pixeles que tiene que
    // coincidir con el extremo superior de la costura de Story.
    const paradas =
      computed.backgroundImage.match(/oklch\([^)]*\)|transparent/g) ?? [];
    expect(paradas[paradas.length - 1]).toBe(EYE_SURFACE);
  });

  it("ni la costura ni el pie declaran transicion o animacion", () => {
    // Una transicion sobre background-image seria un coste de pintado
    // invisible en revision: las dos piezas son CSS estatico a proposito.
    const container = renderPage();
    const costura = container.querySelector(
      '[data-testid="story-continuity"]',
    ) as HTMLElement;
    const pie = container.querySelector(
      '[data-testid="hero-foot"]',
    ) as HTMLElement;

    for (const el of [costura, pie]) {
      const css = cssRuleTextFor(el);
      expect(css).not.toContain("transition");
      expect(css).not.toContain("animation");
    }
  });

  it("declara el bloque de reduced-motion en el bloque de copia y en el contenido de Story", () => {
    // getComputedStyle de jsdom no evalua @media, pero el CSS inyectado si es
    // inspeccionable: al menos queda atornillado que la regla existe.
    const container = renderPage();
    const copia = container.querySelector('[data-testid="hero-kicker"]')
      ?.parentElement as HTMLElement;
    const contenido = container.querySelector("#story-title")
      ?.parentElement as HTMLElement;

    const cssCopia = cssRuleTextFor(copia);
    expect(cssCopia).toContain("prefers-reduced-motion: reduce");
    expect(cssCopia).toContain("animation: none");

    const cssContenido = cssRuleTextFor(contenido);
    expect(cssContenido).toContain("prefers-reduced-motion: reduce");
    expect(cssContenido).toContain("transition: none");
  });

  it("en la pagina real la seccion de Story es la hermana INMEDIATA del hero", () => {
    // Precondicion estructural de la rampa de 10rem: los 4rem del pie del hero
    // y los 6rem de la costura solo son continuos si no hay nada en medio. Un
    // separador, un divisor decorativo o un envoltorio insertado entre las dos
    // secciones romperia la continuidad sin que falle ningun test de seccion.
    const { container } = renderWithProviders(<HomePage />);
    const secciones = container.querySelectorAll("main > section");
    const hero = secciones[0];
    const story = container.querySelector("#story");

    expect(hero.querySelector('[data-testid="hero-foot"]')).not.toBeNull();
    expect(hero.nextElementSibling).toBe(story);
  });

  it("en ingles el hero renderiza la copia inglesa, no la espanola", async () => {
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

      expect(texto("hero-kicker")).toBe(enHome.Home.hero.kicker);
      expect(texto("hero-subtitle")).toBe(enHome.Home.hero.subtitle);
      expect(texto("hero-support")).toBe(enHome.Home.hero.support);
      expect(texto("hero-subtitle")).not.toBe(esHome.Home.hero.subtitle);
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });
});
