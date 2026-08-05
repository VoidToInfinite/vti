import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esCommon from "@/i18n/locales/es/common.json";
import esHome from "@/i18n/locales/es/home.json";
import { links } from "@/config/links";
import { themes } from "@/theme/themes";
import { FOOTER_DARK_BG, FOOTER_STARS } from "./footer.layers";
import { Footer } from "./Footer";

/*
 * Footer (spec 2026-07-28-landing-v2-secciones-design.md §7.5/§8 y
 * 2026-08-03-contacto-footer-oscuro-design.md D9/D10/D16/D17): vive en los
 * dos temas. Las columnas Explore/Discover (anclas a las 4 secciones)
 * vuelven a montarse SIEMPRE (D16) -- ver el test que sustituye al anterior
 * mas abajo. Resources y la barra inferior (copyright + legales) nunca
 * dependieron del tema.
 */

beforeEach(() => {
  // El footer monta `<SectionBeam />` en oscuro, que usa `useReveal`
  // internamente -- jsdom no implementa `IntersectionObserver`. Mismo stub
  // que `Contact.test.tsx`/`SectionBeam.test.tsx`.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor() {}
      observe(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * (jsdom no evalúa NINGÚN `@media`, así que un guard de
 * `prefers-reduced-motion` solo se puede atar inspeccionando el TEXTO de la
 * regla, nunca con `getComputedStyle`). Mismo helper que ya usan
 * `Contact.test.tsx`/`SectionBeam.test.tsx`.
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

/** El campo de estrellas es el único contenedor `aria-hidden` con
 *  `FOOTER_STARS.length` hijos -- `SectionBeam` también es `aria-hidden`,
 *  pero monta 5 hijos fijos, nunca 24, así que este filtro los distingue sin
 *  depender de un índice de posición en el DOM. (`Logo` también se monta
 *  como `aria-hidden` -- decorativo, sin `title` -- en los DOS temas: no
 *  sirve como señal de "esto es de la rama oscura", por eso el filtro es por
 *  número de hijos y no por la mera presencia del atributo.) */
function findStarsContainer(container: HTMLElement): HTMLElement | undefined {
  return Array.from(container.querySelectorAll('[aria-hidden="true"]')).find(
    (el) => el.children.length === FOOTER_STARS.length,
  ) as HTMLElement | undefined;
}

/** `SectionBeam` es el único elemento del footer con `data-revealed` (lo
 *  escribe su propio `useReveal`, `SectionBeam.tsx`): sirve para detectar si
 *  se montó sin ambigüedad con `Logo`, que también es `aria-hidden` en los
 *  dos temas. */
function findBeam(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-revealed]");
}

describe("Footer", () => {
  it("en tema claro (por defecto) muestra las columnas Explore y Discover", () => {
    window.localStorage.setItem("vti-theme", "light");
    renderWithProviders(<Footer />);

    expect(
      screen.getByText(esCommon.Common.Footer.explore),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esCommon.Common.Footer.discover),
    ).toBeInTheDocument();

    for (const href of ["#story", "#journey", "#features", "#contact"]) {
      expect(
        document.querySelector(`a[href="${href}"]`),
        `falta el enlace ${href}`,
      ).not.toBeNull();
    }
    expect(
      screen.getByText(esHome.Home.features.learning.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.features.imagination.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.features.gaming.title),
    ).toBeInTheDocument();
  });

  /*
   * SUSTITUYE al test que antes afirmaba lo contrario ("en tema oscuro NO
   * muestra Explore ni Discover, sus destinos no existen"): esa premisa era
   * falsa desde que `HomeSections` (`HomeSections.tsx:17-26`) dejó de
   * condicionar el montaje de Story/Journey/Features/Contact por tema -- las
   * 4 se montan SIEMPRE, y cada una declara su `id` en las dos ramas
   * (comprobado con grep antes de escribir este test, no asumido:
   * `Story.tsx:363,482`, `Journey.tsx:479,634`, `Features.tsx:702,788`,
   * `Contact.tsx:425,455`). D16 revierte a propósito la decisión anterior de
   * este mismo fichero de test.
   */
  it("en tema oscuro SI muestra las columnas Explore y Discover, con sus 4+3 enlaces y sus anclas reales (D16)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Footer />);

    // Espera al efecto de hidratación (ThemeProvider arranca siempre en
    // "light" y se corrige a "dark" en un efecto tras montar): se usa la
    // aparición del campo de estrellas -- exclusivo de la rama oscura -- como
    // señal de que el tema ya aplicó, en vez de una propiedad que ahora es
    // igual en los dos temas.
    await waitFor(() => {
      expect(findStarsContainer(container)).toBeDefined();
    });

    expect(
      screen.getByText(esCommon.Common.Footer.explore),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esCommon.Common.Footer.discover),
    ).toBeInTheDocument();

    for (const href of ["#story", "#journey", "#features", "#contact"]) {
      expect(
        document.querySelector(`a[href="${href}"]`),
        `falta el enlace ${href}`,
      ).not.toBeNull();
    }
    expect(
      screen.getByText(esHome.Home.features.learning.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.features.imagination.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.features.gaming.title),
    ).toBeInTheDocument();
  });

  it.each([["light"], ["dark"]] as const)(
    "en tema %s siempre muestra Resources y la barra inferior con el copyright",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      expect(
        screen.getByText(esCommon.Common.Footer.resources),
      ).toBeInTheDocument();
      expect(document.querySelector(`a[href="${links.docs}"]`)).not.toBeNull();
      expect(
        document.querySelector(`a[href="${links.guides}"]`),
      ).not.toBeNull();
      expect(
        document.querySelector(`a[href="${links.privacy}"]`),
      ).not.toBeNull();
      expect(document.querySelector(`a[href="${links.terms}"]`)).not.toBeNull();

      const year = new Date().getFullYear();
      expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument();
    },
  );

  /*
   * D19 de la spec 2026-08-04-legal-seo-consentimiento-design.md. Hasta esta
   * entrega los tres enlaces legales del pie eran anclas con
   * target="_blank" hacia marcadores `example.invalid`. Ahora son cuatro
   * rutas PROPIAS, y mantener target="_blank" sobre una ruta propia rompe el
   * boton atras y cambia de contexto sin avisar -- lo que WCAG 3.2.5 pide
   * evitar.
   *
   * El test no comprueba solo que los enlaces existan (eso ya lo hace el
   * bloque de arriba): comprueba la PROPIEDAD que se acaba de cambiar, que
   * es la unica que un descuido futuro podria revertir sin romper nada
   * visible. Y comprueba a la vez el complementario -- que docs y guides,
   * que SI salen del sitio, conservan su target -- para que el test no pase
   * en verde con un "he quitado el target de todos".
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s los cuatro legales son enlaces internos sin target=_blank",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      const legales = [
        links.privacy,
        links.terms,
        links.accessibility,
        links.legalNotice,
      ];
      for (const href of legales) {
        const anclas = document.querySelectorAll(`a[href="${href}"]`);
        expect(anclas.length, `${href} no esta en el pie`).toBeGreaterThan(0);
        for (const ancla of anclas) {
          expect(
            ancla.getAttribute("target"),
            `${href} abre pestana`,
          ).toBeNull();
        }
      }

      // Control complementario: los destinos que SI son externos conservan
      // su target y su rel.
      for (const href of [links.docs, links.guides]) {
        const ancla = document.querySelector(`a[href="${href}"]`);
        expect(ancla?.getAttribute("target")).toBe("_blank");
        expect(ancla?.getAttribute("rel")).toBe("noopener noreferrer");
      }
    },
  );

  /*
   * Retirar el consentimiento tiene que costar lo mismo que darlo (art. 7.3
   * RGPD por remision, y criterio expreso de la guia de cookies de la AEPD).
   * El disparador vive en el pie porque el pie esta en TODAS las paginas.
   * Es un <button> y no un ancla a proposito: no navega, abre un dialogo.
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s ofrece el disparador de preferencias de cookies como boton",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      const boton = screen.getByRole("button", {
        name: esCommon.Common.Footer.cookiePreferences,
      });
      expect(boton.tagName).toBe("BUTTON");
      expect(boton).not.toHaveAttribute("href");
    },
  );

  it.each([["light"], ["dark"]] as const)(
    "en tema %s siempre muestra el tagline de marca",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      expect(
        screen.getByText(esCommon.Common.Footer.tagline),
      ).toBeInTheDocument();
    },
  );

  /*
   * El bloque de marca ya no monta `Socials` (retirado 2026-08-04): sonda
   * positiva contra el propio tagline (que SÍ está en el DOM) para que la
   * ausencia de los tres enlaces sociales no pase por vacuidad -- si
   * `getByText`/`queryByRole` no encontraran NADA en esta página, el test
   * pasaría igual de verde con el componente entero roto.
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s ya no monta Socials (sin enlaces a Discord/GitHub/Instagram)",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      expect(
        screen.getByText(esCommon.Common.Footer.tagline),
      ).toBeInTheDocument();
      for (const network of ["Discord", "GitHub", "Instagram"]) {
        expect(
          screen.queryByRole("link", { name: network }),
        ).not.toBeInTheDocument();
      }
    },
  );

  describe("fondo y costura por tema (D17)", () => {
    it("en oscuro declara background-color con FOOTER_DARK_BG y no declara border-top", async () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderWithProviders(<Footer />);
      const footerEl = container.querySelector("footer") as HTMLElement;

      await waitFor(() => {
        expect(cssRuleTextFor(footerEl)).toContain(FOOTER_DARK_BG);
      });

      const css = cssRuleTextFor(footerEl);
      expect(css).not.toContain("border-top");
    });

    it("en claro declara surfaceSunken y sí declara border-top", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Footer />);
      const footerEl = container.querySelector("footer") as HTMLElement;

      const css = cssRuleTextFor(footerEl);
      // Sonda positiva: el selector SI ve reglas de este elemento.
      expect(css).toContain("background-color:");
      expect(css).toContain(themes.light.semantic.surfaceSunken);
      expect(css).toContain("border-top:");
      expect(css).not.toContain(FOOTER_DARK_BG);
    });
  });

  describe("campo de estrellas (D9/D10)", () => {
    it("renderiza exactamente una estrella por entrada de FOOTER_STARS, dentro de un contenedor aria-hidden", async () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderWithProviders(<Footer />);

      await waitFor(() => {
        expect(findStarsContainer(container)).toBeDefined();
      });

      const starsContainer = findStarsContainer(container) as HTMLElement;
      expect(starsContainer).toHaveAttribute("aria-hidden", "true");
      expect(starsContainer.children).toHaveLength(FOOTER_STARS.length);
    });

    it("la animación de titileo solo corre bajo no-preference y el bloque reduce fuerza animation: none (D8)", async () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderWithProviders(<Footer />);

      await waitFor(() => {
        expect(findStarsContainer(container)).toBeDefined();
      });

      const starsContainer = findStarsContainer(container) as HTMLElement;
      const firstStar = starsContainer.children[0] as HTMLElement;
      const css = cssRuleTextFor(firstStar);

      // Sonda positiva: el helper SI ve `animation:` bajo no-preference -- si
      // no la viera, el assert de ausencia de mas abajo pasaria por vacuidad.
      expect(css).toContain("prefers-reduced-motion: no-preference");
      expect(css).toContain("animation:");

      const reduceLine = css
        .split("\n")
        .find(
          (line) =>
            line.includes("prefers-reduced-motion: reduce") &&
            line.includes("animation:"),
        );
      expect(reduceLine).toBeDefined();
      expect(reduceLine as string).toContain("animation: none");
    });

    it("dos renders independientes producen el mismo marcado del campo de estrellas (D10: si viniera de Math.random(), diferirían)", async () => {
      window.localStorage.setItem("vti-theme", "dark");

      const first = renderWithProviders(<Footer />);
      await waitFor(() => {
        expect(findStarsContainer(first.container)).toBeDefined();
      });
      const firstHtml = (findStarsContainer(first.container) as HTMLElement)
        .innerHTML;
      first.unmount();

      const second = renderWithProviders(<Footer />);
      await waitFor(() => {
        expect(findStarsContainer(second.container)).toBeDefined();
      });
      const secondHtml = (findStarsContainer(second.container) as HTMLElement)
        .innerHTML;

      expect(firstHtml.length).toBeGreaterThan(0);
      expect(firstHtml).toBe(secondHtml);
    });
  });

  it("en oscuro monta el haz de costura (SectionBeam) -- sonda positiva de la ausencia de mas abajo", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Footer />);

    await waitFor(() => {
      expect(findBeam(container)).not.toBeNull();
    });
  });

  it("en claro no monta el haz de costura ni el campo de estrellas", () => {
    window.localStorage.setItem("vti-theme", "light");
    const { container } = renderWithProviders(<Footer />);

    // El test anterior ya prueba que `findBeam`/`findStarsContainer` SI
    // encuentran coincidencias cuando la rama oscura los monta -- aquí, en
    // claro, ninguno de los dos debe aparecer. `Logo` sigue siendo
    // `aria-hidden` en los dos temas (es decorativo siempre), así que no
    // sirve como señal y no se usa.
    expect(findBeam(container)).toBeNull();
    expect(findStarsContainer(container)).toBeUndefined();
  });
});
