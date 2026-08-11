import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esCommon from "@/i18n/locales/es/common.json";
import esHome from "@/i18n/locales/es/home.json";
import { links } from "@/config/links";
import { PRESS } from "@/motion/vocabulary";
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
   * Task 16, fix round (2026-08-11): la direccion de correo vuelve a estar
   * a la vista sin rellenar nada, y su sitio es el pie.
   *
   * Contexto, porque el "por que aqui" es la mitad del candado: la Task 16
   * retiro de Contacto un chip que mostraba la direccion dentro de un
   * recuadro con borde e icono de sobre, colocado donde va un campo de
   * captura -- se leia como formulario sin serlo (hallazgo #1 de la critica
   * independiente). Al retirarlo, la direccion dejo de verse antes de
   * enviar. El dueno pidio devolverla, pero al PIE y no junto al
   * formulario, para no arriesgar el mismo anti-patron.
   *
   * Por eso el test comprueba tambien la forma, no solo la presencia: es un
   * enlace `mailto:` real (no un `<span>` dentro de un `<div>`), su texto es
   * la direccion sin esquema y NO lleva `target="_blank"` -- un `mailto:` no
   * abre ninguna pestana, asi que anunciar un cambio de contexto que no
   * ocurre seria ruido para un lector de pantalla (mismo criterio que D19
   * aplica a las rutas propias).
   *
   * La direccion esperada se DERIVA aqui de `links.email` en vez de importar
   * `EMAIL_ADDRESS` (fix round 2, 2026-08-11): importar la constante habria
   * hecho que este candado se moviera con ella -- comprobado con el bug
   * inyectado, rompiendo la derivacion de `EMAIL_ADDRESS` este test seguia en
   * VERDE y solo caia el de `jsonLd.test.ts`, que si deriva por su cuenta.
   * Un test que asevera una constante contra si misma no protege nada.
   */
  it.each(["light", "dark"] as const)(
    "en tema %s muestra la direccion de correo como enlace mailto real (Task 16)",
    async (tema) => {
      window.localStorage.setItem("vti-theme", tema);
      const { container } = renderWithProviders(<Footer />);

      await waitFor(() => {
        const enlace = container.querySelector(
          `a[href="${links.email}"]`,
        ) as HTMLAnchorElement;
        expect(enlace, `sin enlace mailto en tema ${tema}`).not.toBeNull();
        // Texto EXACTO, no `toHaveTextContent` (que compara por substring):
        // con substring, un `EMAIL_ADDRESS` que dejara de retirar el esquema
        // seguiria pasando -- "mailto:hello@..." CONTIENE "hello@...".
        // Comprobado con el bug inyectado antes de dar este candado por
        // bueno.
        expect(enlace.textContent?.trim()).toBe(
          links.email.replace(/^mailto:/, ""),
        );
        expect(enlace).not.toHaveAttribute("target");
        expect(enlace.tagName).toBe("A");
      });
    },
  );

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
      expect(
        document.querySelector(`a[href="${links.legalNotice}"]`),
      ).not.toBeNull();

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
   * Tarea 6 (auditoría premium): el Footer construye sus columnas recorriendo
   * `NAV_GROUPS` (ver el docblock de cabecera, entrega 2026-08-05) -- el
   * grupo "community" nuevo (Discord, GitHub) llega a las DOS ramas de tema
   * sin que este componente necesite ningún camino propio, mismo mecanismo
   * "external" que ya usaba la columna Resources. Candado análogo al de esa
   * columna: exactamente los dos enlaces esperados, ninguno más.
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s la columna Comunidad contiene exactamente los enlaces de Discord y GitHub",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      const titulo = screen.getByText(esCommon.Common.Nav.community);
      const columna = titulo.parentElement as HTMLElement;
      const anclas = Array.from(columna.querySelectorAll("a"));

      expect(anclas.map((ancla) => ancla.getAttribute("href")).sort()).toEqual(
        [links.discord, links.github].sort(),
      );
    },
  );

  it.each([["light"], ["dark"]] as const)(
    "en tema %s los enlaces de Discord y GitHub llevan target='_blank', rel='noopener noreferrer' y avisan del cambio de pestaña en su nombre accesible",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      for (const [href, label] of [
        [links.discord, esCommon.Common.Nav.discord],
        [links.github, esCommon.Common.Nav.github],
      ] as const) {
        const enlace = screen.getByRole("link", {
          name: `${label} ${esCommon.Common.Nav.newTab}`,
        });
        expect(enlace).toHaveAttribute("href", href);
        expect(enlace).toHaveAttribute("target", "_blank");
        expect(enlace).toHaveAttribute("rel", "noopener noreferrer");
      }
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
   * visible. Y comprueba a la vez el complementario -- que el SDK, que SI
   * sale del sitio, conserva su target -- para que el test no pase en verde
   * con un "he quitado el target de todos".
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s los dos legales son enlaces internos sin target=_blank",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      const legales = [links.privacy, links.legalNotice];
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
   * Candado de la revision legal del 2026-08-08. Aqui vivia el disparador de
   * "Preferencias de cookies"; el sitio no escribe nada que requiera
   * consentimiento (`src/config/storage.ts`), asi que no hay preferencia que
   * configurar y el boton desaparecio con el banner.
   *
   * El test comprueba la barra inferior COMPLETA, no solo la ausencia del
   * boton: lo que hay que atar es que en el pie no queden mas destinos legales
   * que los dos que la revision dejo. Un `/terminos` reintroducido, o un
   * segundo boton de preferencias, romperia esta cuenta.
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s la barra inferior lleva exactamente los dos legales y ningun boton",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      const copyright = screen.getByText(
        new RegExp(String(new Date().getFullYear())),
      );
      const barra = copyright.parentElement as HTMLElement;

      const hrefs = Array.from(barra.querySelectorAll("a")).map((ancla) =>
        ancla.getAttribute("href"),
      );
      expect(hrefs.sort()).toEqual([links.legalNotice, links.privacy].sort());
      expect(barra.querySelectorAll("button")).toHaveLength(0);
      expect(
        Array.from(barra.querySelectorAll("a")).map(
          (ancla) => ancla.textContent,
        ),
      ).toEqual([
        esCommon.Common.Footer.privacy,
        esCommon.Common.Footer.legalNotice,
      ]);
    },
  );

  /*
   * Candado de FUENTE para `prefetch={false}` (Task 32, review): `next/link`
   * desestructura `prefetch` de las props ANTES de esparcir el resto sobre el
   * `<a>` (`node_modules/next/dist/client/link.js:138`), así que nunca llega
   * al DOM -- por render, jsdom no tiene nada que leer, y el repo no mockea
   * `next/link` en ningún sitio para interceptar props. Mismo patrón que
   * `footer.layers.test.ts` ("sin Math.random") y
   * `Hero.qa.test.tsx` ("candado de fuente"): leer el `.tsx` real con
   * `node:fs` y afirmar sobre su TEXTO, acotado al bloque de `LEGAL_LINKS.map()`
   * para no afirmar sobre cualquier `prefetch={false}` suelto en el fichero.
   *
   * Trampa concreta de ESTE fichero (misma familia que la lección del
   * 2026-08-11 sobre `toContain()` y comentarios): el propio comentario JSX
   * que documenta la decisión, justo encima del `.map()` en `Footer.tsx`,
   * cita la cadena literal `prefetch={false}` en prosa. Sin despojar
   * comentarios antes de buscar, el assert pasaría en verde AUNQUE alguien
   * borrara la prop real -- por eso se despoja el comentario de bloque, igual
   * que `footer.layers.test.ts`, antes de recortar el bloque.
   */
  describe("LEGAL_LINKS.map(): ScFooterNavLink lleva prefetch={false}", () => {
    it("el bloque de LEGAL_LINKS.map() (fuera de comentarios) declara prefetch={false} en ScFooterNavLink", async () => {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(here, "Footer.tsx"), "utf-8");

      const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      const bloque = withoutComments.match(
        /LEGAL_LINKS\.map\([\s\S]*?<\/ScBottomLinks>/,
      )?.[0];

      // Sonda positiva: el bloque existe y monta ScFooterNavLink -- así el
      // assert de `prefetch={false}` no pasa por vacuidad de un match nulo
      // o de haber recortado el fichero equivocado.
      expect(
        bloque,
        "no se encontro el bloque LEGAL_LINKS.map()...</ScBottomLinks>",
      ).toBeDefined();
      expect(bloque).toContain("<ScFooterNavLink");
      expect(bloque).toContain("prefetch={false}");
    });
  });

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
   * ausencia de Instagram no pase por vacuidad -- si `getByText`/`queryByRole`
   * no encontraran NADA en esta página, el test pasaría igual de verde con el
   * componente entero roto.
   *
   * ACTUALIZADO en la tarea 6 (auditoría premium, regla 40: se actualiza el
   * candado, no se relaja): Discord y GitHub DEJAN de estar ausentes -- la
   * propia tarea los promueve a columna "Comunidad" vía `NAV_GROUPS`, con su
   * propia cobertura arriba (target/rel/aviso de pestaña). Este test ya NO
   * puede afirmar su ausencia sin mentir; lo que sigue vigente de la
   * regresión original es que Instagram -- que nunca tuvo un destino en
   * `links.ts` y que esta tarea tampoco añade -- no reaparece por ningún
   * camino.
   */
  it.each([["light"], ["dark"]] as const)(
    "en tema %s no aparece ningún enlace a Instagram (Socials retirado, y esta tarea no lo reintroduce)",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      expect(
        screen.getByText(esCommon.Common.Footer.tagline),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /Instagram/i }),
      ).not.toBeInTheDocument();
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

  /*
   * Task 9 (craft de interacción): footerLinkStyles (compartido por
   * ScFooterLink/ScFooterNavLink) gana :active { transform: scale(...) },
   * tomado de vocabulary.PRESS, con su propia entrada en transition y su
   * guard de prefers-reduced-motion. Validado con el bug inyectado a
   * propósito (ver informe de la tarea, tabla footerLinkStyles): comentando
   * temporalmente el bloque &:active de footerLinkStyles (Footer.tsx) el
   * primer test de este bloque se pone en rojo (no hay ninguna regla :active
   * con scale); restaurado, vuelve a verde.
   */
  describe(":active de los enlaces del footer (Task 9, vocabulary.PRESS)", () => {
    it("declara :active con transform: scale(PRESS.activeScale) y transition de transform con PRESS.durationMs/PRESS.easing", () => {
      window.localStorage.setItem("vti-theme", "light");
      renderWithProviders(<Footer />);
      const enlace = screen.getByText(
        esCommon.Common.Footer.privacy,
      ) as HTMLElement;
      const css = cssRuleTextFor(enlace);

      expect(css).toContain(":active");
      const activeBlock = css.slice(css.indexOf(":active"));
      expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
      expect(css).toContain(`${PRESS.durationMs}ms`);
      expect(css).toContain(PRESS.easing);
    });

    it("el guard de prefers-reduced-motion anula la transición y el transform de :active", () => {
      window.localStorage.setItem("vti-theme", "light");
      renderWithProviders(<Footer />);
      const enlace = screen.getByText(
        esCommon.Common.Footer.privacy,
      ) as HTMLElement;
      const css = cssRuleTextFor(enlace);

      expect(css).toContain("prefers-reduced-motion: reduce");
      const reduceBlock = css.slice(
        css.indexOf("prefers-reduced-motion: reduce"),
      );
      expect(reduceBlock).toContain("transition: none");
      expect(reduceBlock).toContain("transform: none");
    });

    /*
     * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Un único
     * punto de declaración (footerLinkStyles) cubre ScFooterLink Y
     * ScFooterNavLink. Validado con el bug inyectado a propósito (ver
     * informe de la tarea): comentando temporalmente `touch-action:
     * manipulation;` de footerLinkStyles en Footer.tsx, este test se pone en
     * rojo; restaurado, vuelve a verde.
     */
    it("Task 13: declara touch-action: manipulation", () => {
      window.localStorage.setItem("vti-theme", "light");
      renderWithProviders(<Footer />);
      const enlace = screen.getByText(
        esCommon.Common.Footer.privacy,
      ) as HTMLElement;
      const css = cssRuleTextFor(enlace);

      expect(css).toContain("touch-action: manipulation");
    });
  });
});
