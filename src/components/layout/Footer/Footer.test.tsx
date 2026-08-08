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
 * dos temas. Las columnas «On Site»/«Discover» (anclas a las 4 secciones)
 * vuelven a montarse SIEMPRE (D16) -- ver el test que sustituye al anterior
 * mas abajo. Resources y la barra inferior (copyright + legales) nunca
 * dependieron del tema.
 *
 * Entrega 2026-08-05: las tres columnas dejan de escribirse a mano y se
 * generan recorriendo `NAV_GROUPS` (`src/config/navigation.ts`), el mismo
 * modelo que consume el Navbar -- por eso los titulos pasan de
 * `Common.Footer.explore/discover/resources` a `Common.Nav.onSite/discover/
 * resources`, y la columna que se llamaba «Explore» pasa a llamarse «On Site»
 * («En el sitio» en español). En la misma entrega, «Resources» se reduce a un
 * unico enlace, VTI - SDK, por encargo del usuario.
 *
 * Entrega 2026-08-07 (spec `2026-08-07-footer-beam-estrellas-tema-claro-design.md`,
 * D3/D4/D5/D6/D7): el haz (`SectionBeam`) y el campo de 24 estrellas dejan de
 * ser exclusivos de oscuro -- se montan en LOS DOS TEMAS -- y el
 * `border-top` de la rama clara se retira. Varios tests de más abajo
 * SUSTITUYEN a los que hasta esta entrega afirmaban lo contrario; se marcan
 * en el sitio.
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
  it("en tema claro (por defecto) muestra las columnas On Site y Discover", () => {
    window.localStorage.setItem("vti-theme", "light");
    renderWithProviders(<Footer />);

    expect(screen.getByText(esCommon.Common.Nav.onSite)).toBeInTheDocument();
    expect(screen.getByText(esCommon.Common.Nav.discover)).toBeInTheDocument();

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
  it("en tema oscuro SI muestra las columnas On Site y Discover, con sus 4+3 enlaces y sus anclas reales (D16)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Footer />);
    const footerEl = container.querySelector("footer") as HTMLElement;

    // Espera al efecto de hidratación (ThemeProvider arranca siempre en
    // "light" y se corrige a "dark" en un efecto tras montar). Desde
    // 2026-08-07 (D6.3) el campo de estrellas ya NO sirve como señal de "el
    // tema ya aplicó" -- se monta en los DOS temas -- así que la señal pasa a
    // ser `FOOTER_DARK_BG` en el CSS inyectado del propio `<footer>`, que
    // sigue siendo exclusivo de la rama oscura (D5).
    await waitFor(() => {
      expect(cssRuleTextFor(footerEl)).toContain(FOOTER_DARK_BG);
    });

    expect(screen.getByText(esCommon.Common.Nav.onSite)).toBeInTheDocument();
    expect(screen.getByText(esCommon.Common.Nav.discover)).toBeInTheDocument();

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
        screen.getByText(esCommon.Common.Nav.resources),
      ).toBeInTheDocument();
      expect(document.querySelector(`a[href="${links.sdk}"]`)).not.toBeNull();
      expect(
        document.querySelector(`a[href="${links.privacy}"]`),
      ).not.toBeNull();
      expect(document.querySelector(`a[href="${links.terms}"]`)).not.toBeNull();

      const year = new Date().getFullYear();
      expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument();
    },
  );

  /*
   * Candado literal del encargo (2026-08-05): "la sección del footer
   * 'Resources' actualmente solo debe aparecer 'VTI - SDK'". No basta con
   * comprobar que el enlace del SDK está -- eso ya lo hace el bloque de
   * arriba -- hace falta un candado que FALLE si alguien añade un segundo
   * enlace a esa columna (p. ej. reintroduciendo Documentación o Guías).
   */
  it("la columna Resources contiene exactamente un enlace, y es el del SDK", () => {
    window.localStorage.setItem("vti-theme", "light");
    renderWithProviders(<Footer />);

    const titulo = screen.getByText(esCommon.Common.Nav.resources);
    const columna = titulo.parentElement as HTMLElement;
    const anclas = columna.querySelectorAll("a");

    expect(anclas).toHaveLength(1);
    expect(anclas[0]).toHaveAttribute("href", links.sdk);
  });

  /*
   * WCAG 3.2.5 (Cambio a petición, AAA): un enlace externo que abre pestaña
   * nueva tiene que avisarlo a quien no ve la pantalla. El icono o el
   * `target` por sí solos no lo comunican -- por eso el aviso vive en el
   * NOMBRE ACCESIBLE del propio enlace (`VisuallyHidden`, ver su docblock),
   * no solo en un atributo que un lector de pantalla podría no anunciar.
   */
  it("el enlace del SDK avisa del cambio de pestaña en su nombre accesible", () => {
    window.localStorage.setItem("vti-theme", "light");
    renderWithProviders(<Footer />);

    const enlace = screen.getByRole("link", {
      name: `${esCommon.Common.Nav.sdk} ${esCommon.Common.Nav.newTab}`,
    });
    expect(enlace).toHaveAttribute("href", links.sdk);
  });

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
   * visible. Y comprueba a la vez el complementario -- que el SDK, que SI
   * sale del sitio, conserva su target -- para que el test no pase en verde
   * con un "he quitado el target de todos".
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

      // Control complementario: el destino que SI es externo (el SDK)
      // conserva su target y su rel.
      const ancla = document.querySelector(`a[href="${links.sdk}"]`);
      expect(ancla?.getAttribute("target")).toBe("_blank");
      expect(ancla?.getAttribute("rel")).toBe("noopener noreferrer");
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

  describe("fondo y costura por tema (D17, y D6 de la spec 2026-08-07-footer-beam-estrellas-tema-claro-design.md)", () => {
    it("en oscuro declara background-color con FOOTER_DARK_BG, position: relative, y no declara border-top (D5: sin cambios)", async () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderWithProviders(<Footer />);
      const footerEl = container.querySelector("footer") as HTMLElement;

      await waitFor(() => {
        expect(cssRuleTextFor(footerEl)).toContain(FOOTER_DARK_BG);
      });

      const css = cssRuleTextFor(footerEl);
      expect(css).toContain("position: relative");
      expect(css).not.toContain("border-top");
    });

    /*
     * SUSTITUYE al test que hasta esta entrega afirmaba que la rama clara
     * "sí declara border-top": D6.4 lo retira -- ese borde era
     * `neutral[100]`, exactamente el mismo color que `surfaceSunken` (el
     * propio fondo del footer), 1.00:1 de contraste, invisible. D6.1 añade
     * `position: relative`, sin el cual el haz y las estrellas (ahora
     * montados también en claro) se anclarían fuera del footer.
     */
    it("en claro declara surfaceSunken, position: relative, y NO declara border-top (D6.1/D6.4)", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Footer />);
      const footerEl = container.querySelector("footer") as HTMLElement;

      const css = cssRuleTextFor(footerEl);
      // Sonda positiva: el selector SI ve reglas de este elemento.
      expect(css).toContain("background-color:");
      expect(css).toContain(themes.light.semantic.surfaceSunken);
      expect(css).toContain("position: relative");
      expect(css).not.toContain("border-top");
      expect(css).not.toContain(FOOTER_DARK_BG);
    });
  });

  describe("campo de estrellas (D9/D10, y D6.3 de la spec 2026-08-07-footer-beam-estrellas-tema-claro-design.md -- se monta en los DOS temas)", () => {
    it.each([["light"], ["dark"]] as const)(
      "en tema %s renderiza exactamente una estrella por entrada de FOOTER_STARS, dentro de un contenedor aria-hidden",
      async (theme) => {
        window.localStorage.setItem("vti-theme", theme);
        const { container } = renderWithProviders(<Footer />);

        await waitFor(() => {
          expect(findStarsContainer(container)).toBeDefined();
        });

        const starsContainer = findStarsContainer(container) as HTMLElement;
        expect(starsContainer).toHaveAttribute("aria-hidden", "true");
        expect(starsContainer.children).toHaveLength(FOOTER_STARS.length);
      },
    );

    it.each([["light"], ["dark"]] as const)(
      "en tema %s la animación de titileo solo corre bajo no-preference y el bloque reduce fuerza animation: none (D8)",
      async (theme) => {
        window.localStorage.setItem("vti-theme", theme);
        const { container } = renderWithProviders(<Footer />);

        await waitFor(() => {
          expect(findStarsContainer(container)).toBeDefined();
        });

        const starsContainer = findStarsContainer(container) as HTMLElement;
        const firstStar = starsContainer.children[0] as HTMLElement;
        const css = cssRuleTextFor(firstStar);

        // Sonda positiva: el helper SI ve `animation:` bajo no-preference --
        // si no la viera, el assert de ausencia de mas abajo pasaria por
        // vacuidad.
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
      },
    );

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

    /*
     * Candado de D3/D4: el marcado de las 24 estrellas no puede ser
     * IDENTICO entre temas (si lo fuera, `footerStarTint`/`footerStarGlow`
     * no estarían resolviendo contra el tema activo). No comprueba colores
     * concretos -- eso es responsabilidad de `footer.layers.test.ts`, contra
     * los tokens reales -- solo que la salida DIFIERE.
     */
    it("el marcado del campo de estrellas difiere entre claro y oscuro (D3: dos tonalidades distintas)", async () => {
      window.localStorage.setItem("vti-theme", "light");
      const light = renderWithProviders(<Footer />);
      await waitFor(() => {
        expect(findStarsContainer(light.container)).toBeDefined();
      });
      const lightHtml = (findStarsContainer(light.container) as HTMLElement)
        .innerHTML;
      light.unmount();

      window.localStorage.setItem("vti-theme", "dark");
      const dark = renderWithProviders(<Footer />);
      await waitFor(() => {
        expect(findStarsContainer(dark.container)).toBeDefined();
      });
      const darkHtml = (findStarsContainer(dark.container) as HTMLElement)
        .innerHTML;

      expect(lightHtml.length).toBeGreaterThan(0);
      expect(lightHtml).not.toBe(darkHtml);
    });
  });

  it("en oscuro monta el haz de costura (SectionBeam) -- sonda positiva de la ausencia de mas abajo", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Footer />);

    await waitFor(() => {
      expect(findBeam(container)).not.toBeNull();
    });
  });

  /*
   * SUSTITUYE al test que hasta esta entrega afirmaba que en claro NO se
   * montaban el haz ni el campo de estrellas (D6.3 de la spec
   * 2026-08-07-footer-beam-estrellas-tema-claro-design.md): las dos piezas
   * pasan a montarse SIEMPRE. El test previo probaba la ausencia; este
   * prueba la presencia, con el mismo par de finders.
   */
  it("en claro TAMBIÉN monta el haz de costura y el campo de 24 estrellas (D6.3)", () => {
    // "light" es el tema por defecto del ThemeProvider (arranca ahí antes de
    // cualquier efecto de hidratación), así que este render no necesita
    // `waitFor`: si el haz/las estrellas dependieran todavía de `isDark`, ya
    // estarían ausentes en este primer render sin esperar a nada.
    window.localStorage.setItem("vti-theme", "light");
    const { container } = renderWithProviders(<Footer />);

    expect(findBeam(container)).not.toBeNull();
    const starsContainer = findStarsContainer(container) as HTMLElement;
    expect(starsContainer).toBeDefined();
    expect(starsContainer.children).toHaveLength(FOOTER_STARS.length);
  });
});
