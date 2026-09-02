import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DefaultTheme } from "styled-components";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esCommon from "@/i18n/locales/es/common.json";
import esHome from "@/i18n/locales/es/home.json";
import {
  BACK_TO_TOP_SIDE_PX,
  backToTopClearance,
} from "@/components/layout/BackToTop/BackToTop";
import { links } from "@/config/links";
import { navGroupsFor } from "@/config/navigation";
import { LEGAL_ROUTE_KEYS, routePath } from "@/config/site";
import { I18nProvider } from "@/i18n/I18nProvider";
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

    for (const href of ["/#story", "/#journey", "/#features", "/#contact"]) {
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

    for (const href of ["/#story", "/#journey", "/#features", "/#contact"]) {
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
    "en tema %s la columna Comunidad contiene exactamente los enlaces de Discord, GitHub y LinkedIn",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      const titulo = screen.getByText(esCommon.Common.Nav.community);
      const columna = titulo.parentElement as HTMLElement;
      const anclas = Array.from(columna.querySelectorAll("a"));

      expect(anclas.map((ancla) => ancla.getAttribute("href")).sort()).toEqual(
        [links.discord, links.github, links.linkedin].sort(),
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
   * `node:fs` y afirmar sobre su TEXTO, acotado al bloque de
   * `LEGAL_ROUTE_KEYS.map()` para no afirmar sobre cualquier `prefetch={false}`
   * suelto en el fichero. (La lista se llamó `LEGAL_LINKS` hasta la crítica
   * #12, cuando dejó de ser una constante de módulo para poder componer su
   * `href` por idioma -- ver el docblock que sustituyó a esa constante.)
   *
   * Trampa concreta de ESTE fichero (misma familia que la lección del
   * 2026-08-11 sobre `toContain()` y comentarios): el propio comentario JSX
   * que documenta la decisión, justo encima del `.map()` en `Footer.tsx`,
   * cita la cadena literal `prefetch={false}` en prosa. Sin despojar
   * comentarios antes de buscar, el assert pasaría en verde AUNQUE alguien
   * borrara la prop real -- por eso se despoja el comentario de bloque, igual
   * que `footer.layers.test.ts`, antes de recortar el bloque.
   */
  /*
   * Crítica externa #9, punto 1. El pie era la superficie ASIMÉTRICA de las
   * tres que consumen `NAV_GROUPS`: `Navbar` y `NavSheet` ya movían el foco al
   * destino desde la entrega anterior, y el pie no -- así que el MISMO enlace
   * («Historia») dejaba el foco en `<body>` o lo llevaba a la sección según
   * desde dónde se pulsara. Dos evaluadores midieron el caso del pie por
   * separado.
   *
   * El destino se monta aquí con la forma exacta que le dan las cuatro
   * secciones reales (`<section id="story">`, SIN `tabindex`: ver `Story.tsx`)
   * y la tarjeta de Features (`<h3 id="feature-…-title" tabindex="-1">`), para
   * cubrir los dos `kind` que apuntan dentro de la página. La tercera mitad --
   * que un `kind: "external"` no toque el foco -- va en su propio caso: ahí no
   * hay ningún destino en este documento que enfocar.
   */
  describe("foco en el destino al activar un enlace de sección (crítica externa #9, punto 1)", () => {
    it.each([
      ["/#story", "story", "section"],
      ["/#feature-learning-title", "feature-learning-title", "h3"],
    ] as const)("%s mueve el foco a su destino", (href, id, etiqueta) => {
      const { container } = renderWithProviders(<Footer />);
      const destino = document.createElement(etiqueta);
      destino.id = id;
      document.body.appendChild(destino);

      try {
        const enlace = container.querySelector(
          `a[href="${href}"]`,
        ) as HTMLElement;
        expect(enlace, `el pie no monta ${href}`).not.toBeNull();

        enlace.click();

        expect(destino).toHaveAttribute("tabindex", "-1");
        expect(
          document.activeElement,
          "el pie desplazaba sin enfocar: para quien no ve la pantalla, el salto no ocurrió",
        ).toBe(destino);
      } finally {
        destino.remove();
      }
    });

    it("un enlace externo no toca el foco: su destino no está en este documento", () => {
      const { container } = renderWithProviders(<Footer />);
      const enlace = container.querySelector(
        `a[href="${links.sdk}"]`,
      ) as HTMLElement;
      const antes = document.activeElement;

      enlace.click();

      expect(document.activeElement).toBe(antes);
    });
  });

  describe("LEGAL_ROUTE_KEYS.map(): ScFooterNavLink lleva prefetch={false}", () => {
    it("el bloque de LEGAL_ROUTE_KEYS.map() (fuera de comentarios) declara prefetch={false} en ScFooterNavLink", async () => {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(here, "Footer.tsx"), "utf-8");

      const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      const bloque = withoutComments.match(
        /LEGAL_ROUTE_KEYS\.map\([\s\S]*?<\/ScBottomLinks>/,
      )?.[0];

      // Sonda positiva: el bloque existe y monta ScFooterNavLink -- así el
      // assert de `prefetch={false}` no pasa por vacuidad de un match nulo
      // o de haber recortado el fichero equivocado.
      expect(
        bloque,
        "no se encontro el bloque LEGAL_ROUTE_KEYS.map()...</ScBottomLinks>",
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

    /*
     * Crítica externa #9, encargo transversal de tokens de movimiento: el
     * titileo declaraba la palabra clave `ease-in-out`, la única curva del
     * fichero fuera de `motion.easing` (regla 48 de `RULES.md`).
     *
     * Aquí SÍ vale un candado sobre el texto renderizado, a diferencia del
     * caso que documenta `task/lessons.md` (2026-08-12, Task 19): allí el
     * token resolvía al MISMO valor que el literal que sustituía, así que el
     * CSS era indistinguible antes y después. `ease-in-out` y
     * `motion.easing.standard` son textos DISTINTOS, así que la migración es
     * observable en el CSS inyectado -- y la aserción de ausencia no es
     * vacía: la sonda positiva de arriba ya comprueba que el helper ve la
     * declaración `animation:` de verdad.
     */
    it.each([["light"], ["dark"]] as const)(
      "en tema %s el titileo usa la curva de motion.easing.standard, no la palabra clave ease-in-out",
      async (theme) => {
        window.localStorage.setItem("vti-theme", theme);
        const { container } = renderWithProviders(<Footer />);

        await waitFor(() => {
          expect(findStarsContainer(container)).toBeDefined();
        });

        const starsContainer = findStarsContainer(container) as HTMLElement;
        const firstStar = starsContainer.children[0] as HTMLElement;
        const animacion = cssRuleTextFor(firstStar)
          .split("\n")
          .find(
            (line) =>
              line.includes("prefers-reduced-motion: no-preference") &&
              line.includes("animation:"),
          );

        expect(animacion).toBeDefined();
        // Contra el token IMPORTADO (regla 38), nunca contra la cadena
        // `cubic-bezier(...)` escrita a mano en el test.
        expect(animacion as string).toContain(
          themes[theme].motion.easing.standard,
        );
        expect(animacion as string).not.toContain("ease-in-out");
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

  /*
   * SUBRAYADO EN REPOSO EN LOS ENLACES DEL PIE (crítica externa #14,
   * dimensión 4 de Craft; decisión del dueño D3, 2026-09-02).
   *
   * El defecto que protege, medido en navegador: los 14 anclas del pie
   * computaban `rgb(99, 99, 99)`, `font-weight: 400`, `14px` y
   * `text-decoration: none` -- los mismos cuatro valores exactos que el texto
   * PLANO del pie. El único indicio interactivo era el cambio de color al
   * pasar el puntero, y en táctil no hay puntero: ahí un enlace del pie no
   * tenía ninguna señal de serlo.
   *
   * POR QUÉ SE ATA LA REGLA BASE Y NO EL CSS COMPLETO: un subrayado que solo
   * apareciera bajo `:hover` dejaría el hallazgo intacto en el escenario que
   * lo motivó. El candado busca la regla cuyo SELECTOR no lleva pseudo-clase
   * -- ojo, el cuerpo de toda regla sí lleva dos puntos en cada declaración,
   * así que hay que partir por la llave, no filtrar por `includes(":")` (misma
   * trampa que ya documenta `Input.test.tsx`).
   *
   * jsdom no pinta (regla 44): esto ata la DECLARACIÓN. Que la línea se vea
   * de verdad a 390 y a 1440 es verificación de navegador real, declarada
   * como pendiente en el informe de la tarea.
   */
  describe("crítica #14 (D3): los enlaces del pie llevan subrayado en reposo", () => {
    /** Regla de la clase, sin pseudo-clase en el selector: el estado de reposo. */
    function reglaBaseDe(el: HTMLElement): string | undefined {
      return cssRuleTextFor(el)
        .split("\n")
        .find((regla) => {
          const llave = regla.indexOf("{");
          if (llave === -1) return false;
          const selector = regla.slice(0, llave);
          return selector.includes(".") && !selector.includes(":");
        });
    }

    it("TODOS los anclas del pie declaran subrayado en reposo, con el grosor y la separación de los enlaces legales", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Footer />);

      // Los 14 anclas, no una muestra: los 11 destinos de NAV_GROUPS, la
      // dirección de correo y los 2 documentos legales comparten
      // `footerLinkStyles`, y el día que alguien monte un enlace con estilos
      // propios este candado lo caza.
      const enlaces = Array.from(container.querySelectorAll("a"));
      expect(enlaces.length, "el pie no montó ningún enlace").toBeGreaterThan(
        0,
      );

      enlaces.forEach((enlace) => {
        const base = reglaBaseDe(enlace as HTMLElement);
        const donde = enlace.getAttribute("href");
        expect(base, `sin regla base para ${donde}`).toBeDefined();
        expect(
          base,
          `un enlace del pie se quedó sin subrayado en reposo: ${donde}`,
        ).toContain("text-decoration: underline");
        expect(base).toContain("text-decoration-thickness: 1px");
        expect(base).toContain("text-underline-offset: 0.25em");
      });
    });
  });

  /*
   * DIANA TÁCTIL DE 24px EN EL PIE (crítica externa #11, hallazgo A, P2,
   * WCAG 2.5.8 Target Size (Minimum), AA en WCAG 2.2). El evaluador midió a
   * 390x844 que los enlaces del pie median 342x16 px con paso vertical de
   * 24 px: los 8 px que faltaban hasta el paso eran `gap` del contenedor --
   * espacio visible que no pertenecía a ninguna diana.
   *
   * El arreglo tiene DOS mitades que solo funcionan juntas, y por eso las
   * miden los dos primeros tests de este bloque: el enlace gana relleno
   * vertical y suelo de 24 px, y el contenedor CEDE el `gap` que ese relleno
   * sustituye. Sin la segunda mitad, el pie crecería 8 px por enlace también
   * en escritorio; sin la primera, la diana seguiría midiendo 16 px.
   *
   * jsdom no hace layout (regla 44 de RULES.md): estos candados afirman las
   * DECLARACIONES, no la altura pintada. La comprobación de que la caja
   * resultante mide de verdad >=24 px en un motor real queda declarada como
   * pendiente en el informe de la tarea, no como verificada aquí.
   *
   * Validado con el bug inyectado a propósito (regla 34): borrada la línea
   * `min-height` de `footerLinkStyles` (`Footer.tsx`), el primer test cae en
   * rojo; devuelto el `gap` de `ScColumnLinks` a `space[2]`, cae el segundo.
   * Restauradas las dos líneas, los dos vuelven a verde.
   */
  describe("crítica externa #11, hallazgo A: diana táctil de 24px en los enlaces del pie", () => {
    /** El mínimo de WCAG 2.5.8 en píxeles CSS. Es la cifra del criterio, no
     *  un valor de diseño del repo: por eso se escribe aquí y no sale de
     *  ningún token. */
    const WCAG_TARGET_MIN_PX = 24;

    it("todo enlace del pie declara min-height y padding-block, y el token del suelo llega al mínimo de WCAG", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Footer />);

      const suelo = themes.light.space[5];
      const relleno = themes.light.space[1];

      // El token del suelo tiene que VALER de verdad 24px o más: sin esta
      // comprobación, el candado seguiría en verde el día que `space[5]`
      // bajara de escalón y la diana volviera a incumplir sin avisar.
      expect(
        parseFloat(suelo) * 16,
        "space[5] dejó de llegar al mínimo de WCAG 2.5.8",
      ).toBeGreaterThanOrEqual(WCAG_TARGET_MIN_PX);

      // TODOS los anclas del pie, no una muestra: los 11 destinos de
      // NAV_GROUPS, la dirección de correo y los 2 documentos legales
      // comparten `footerLinkStyles`, y el día que alguien añada un enlace
      // con estilos propios este candado lo caza.
      const enlaces = Array.from(container.querySelectorAll("a"));
      expect(enlaces.length, "el pie no montó ningún enlace").toBeGreaterThan(
        0,
      );

      enlaces.forEach((enlace) => {
        const css = cssRuleTextFor(enlace as HTMLElement);
        expect(
          css,
          `un enlace del pie se quedó sin suelo de diana: ${enlace.getAttribute("href")}`,
        ).toContain(`min-height: ${suelo}`);
        expect(
          css,
          `un enlace del pie se quedó sin relleno vertical: ${enlace.getAttribute("href")}`,
        ).toContain(`padding-block: ${relleno}`);
      });
    });

    it("la columna de enlaces cede su gap: el relleno del enlace lo sustituye, así que el paso vertical no se mueve", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Footer />);

      const enlace = container.querySelector(
        'a[href="/#story"]',
      ) as HTMLElement;
      const columna = enlace.parentElement as HTMLElement;
      const css = cssRuleTextFor(columna);

      expect(css, "la columna de enlaces perdió su display: flex").toContain(
        "flex-direction: column",
      );
      // El valor se PARSEA, no se compara por substring: `toContain("gap: 0")`
      // seguiría en verde con `gap: 0.5rem` (el valor viejo lo contiene como
      // prefijo) y el bug inyectado no llegaría a ponerse en rojo -- misma
      // familia de falso candado que ya documenta task/lessons.md para las
      // migraciones literal-a-token.
      const gapDeclarado = /gap:\s*([^;]+);/.exec(css)?.[1];
      expect(
        gapDeclarado,
        "la columna de enlaces no declara gap",
      ).toBeDefined();
      expect(
        parseFloat(gapDeclarado as string),
        "la columna de enlaces recuperó un gap que ahora duplica el relleno del enlace",
      ).toBe(parseFloat(themes.light.space[0]));

      // La compensación, comprobada en aritmética y no de palabra: los dos
      // rellenos verticales del enlace suman EXACTAMENTE el gap que la
      // columna deja de aportar, así que la distancia entre dos textos
      // consecutivos es la misma que antes de esta tarea.
      expect(parseFloat(themes.light.space[1]) * 2).toBeCloseTo(
        parseFloat(themes.light.space[2]),
        5,
      );
    });
  });

  /*
   * CRÍTICA #12, P0: EL PIE INGLÉS DEVOLVÍA AL CASTELLANO POR SUS 9 ENLACES
   * INTERNOS.
   *
   * Los 7 destinos de sección salían de `NAV_GROUPS` con prefijo `/`, y los 2
   * legales de `links.privacy`/`links.legalNotice`, que son las rutas
   * CASTELLANAS: «Privacy Policy» llevaba a `/privacidad` y «Legal Notice» a
   * `/aviso-legal`. El pie es además la ÚNICA navegación completa disponible
   * sin JavaScript (ver el docblock de `ScNavLinks` en `Navbar.tsx`), así que
   * era también la única salida de quien no ejecuta el bundle.
   *
   * `I18nProvider locale="en"` reproduce `app/en/layout.tsx`: mismo patrón que
   * `app/en/en-routes.test.tsx` y que los candados equivalentes de
   * `Navbar.test.tsx`.
   */
  describe("crítica #12: en /en el pie conserva el idioma", () => {
    function renderFooterEn() {
      return renderWithProviders(
        <I18nProvider locale="en">
          <Footer />
        </I18nProvider>,
      );
    }

    it("los 7 destinos de sección llevan el prefijo /en", () => {
      const { container } = renderFooterEn();
      const internos = navGroupsFor("en")
        .flatMap((group) => group.items)
        .filter((item) => item.kind !== "external");

      expect(internos).toHaveLength(7);
      for (const item of internos) {
        expect(
          container.querySelector(`a[href="${item.href}"]`),
          `${item.key} no apunta a ${item.href}`,
        ).not.toBeNull();
      }
    });

    it("los dos documentos legales llevan a su contraparte inglesa, no a la castellana", () => {
      const { container } = renderFooterEn();

      for (const key of LEGAL_ROUTE_KEYS) {
        expect(
          container.querySelector(`a[href="${routePath(key, "en")}"]`),
          `${key} no apunta a ${routePath(key, "en")}`,
        ).not.toBeNull();
        expect(
          container.querySelector(`a[href="${routePath(key, "es")}"]`),
          `${key} sigue llevando al documento castellano`,
        ).toBeNull();
      }
    });

    it("no queda NI UN enlace interno apuntando a la rama castellana", () => {
      const { container } = renderFooterEn();

      const fugas = Array.from(container.querySelectorAll("a"))
        .map((ancla) => ancla.getAttribute("href") ?? "")
        .filter(
          (href) =>
            href.startsWith("/#") ||
            href === routePath("privacy", "es") ||
            href === routePath("legalNotice", "es"),
        );

      expect(
        fugas,
        "estos enlaces del pie devuelven al visitante inglés al castellano",
      ).toEqual([]);
    });

    /* Complementario: sin él, "he quitado todos los destinos castellanos"
       pasaría en verde. La rama castellana es el 100 % del tráfico de hoy. */
    it("la rama castellana no se mueve: legales en /privacidad y /aviso-legal", () => {
      const { container } = renderWithProviders(<Footer />);

      for (const key of LEGAL_ROUTE_KEYS) {
        expect(
          container.querySelector(`a[href="${routePath(key, "es")}"]`),
          `${key} dejó de apuntar a su ruta castellana`,
        ).not.toBeNull();
      }
      expect(container.querySelector('a[href="/#story"]')).not.toBeNull();
    });
  });

  /*
   * CRÍTICA #12: EL BOTÓN FLOTANTE «VOLVER ARRIBA» TAPABA DOS ENLACES DEL PIE.
   *
   * Medido a 390x844 en tema oscuro: el botón (44x44, `position: fixed` al filo
   * inferior derecho) cubría los últimos ~36 px de «Únete a la comunidad» y
   * «Explora el código». La reserva no es un número escrito aquí: se compone en
   * `backToTopClearance` (`BackToTop.tsx`) con el MISMO `bottom` y el MISMO
   * lado que usa el botón real -- es una invariante que cruza dos ficheros, así
   * que el test importa los dos y los cruza (regla 41).
   *
   * jsdom no hace layout: no puede medir el solape (ésa es verificación de
   * navegador real, regla 44). Lo que sí se puede atar, y es donde vive el
   * defecto, es que la banda esté DECLARADA y que su valor siga siendo el del
   * botón.
   */
  describe("crítica #12: la barra inferior reserva el hueco del botón «volver arriba»", () => {
    function barraInferior(container: HTMLElement): HTMLElement {
      const copyright = screen.getByText(
        new RegExp(String(new Date().getFullYear())),
      );
      expect(container).toContainElement(copyright);
      return copyright.parentElement as HTMLElement;
    }

    it("declara padding-bottom con la banda exacta que ocupa el botón", () => {
      const { container } = renderWithProviders(<Footer />);
      /*
       * SOLO la regla BASE, sin los bloques `@media`: el bloque de `md` declara
       * su propio `padding-bottom` (el relleno de siempre), y `cssRuleTextFor`
       * devuelve el texto de las dos reglas concatenado. Sin este filtro, al
       * borrar la declaración base el `exec()` encontraría la de `md` y el
       * candado pasaría en verde con el defecto delante -- comprobado con el
       * bug inyectado, que devolvía "1.5rem" en vez de fallar por ausencia.
       */
      const css = cssRuleTextFor(barraInferior(container))
        .split("\n")
        .filter((regla) => !regla.startsWith("@media"))
        .join("\n");

      const esperado = backToTopClearance({
        data: themes.light,
      } as DefaultTheme);
      expect(esperado).toContain(`${BACK_TO_TOP_SIDE_PX}px`);
      expect(esperado).toContain("env(safe-area-inset-bottom, 0px)");

      /* El CSSOM normaliza los espacios de `calc()`, así que se comparan los
         TÉRMINOS de la banda, no la cadena entera: los cuatro tienen que estar
         en el `padding-bottom` de esta barra. */
      const paddingBottom = /padding-bottom:\s*([^;]+);/.exec(css)?.[1];
      expect(
        paddingBottom,
        "la barra inferior no declara padding-bottom propio",
      ).toBeDefined();
      expect(paddingBottom).toContain("env(safe-area-inset-bottom, 0px)");
      expect(paddingBottom).toContain(`${BACK_TO_TOP_SIDE_PX}px`);
      expect(paddingBottom).toContain(themes.light.space[5]);
      expect(paddingBottom).toContain(themes.light.space[3]);
    });

    /*
     * Desde `md` la barra se alinea a la izquierda y el botón vive en el borde
     * derecho del viewport: no hay nada bajo él que reservar. jsdom no evalúa
     * ningún `@media` (regla 36), así que el bloque se lee del CSSOM.
     */
    it("desde md vuelve al relleno de siempre: en escritorio no hay solape que compensar", () => {
      const { container } = renderWithProviders(<Footer />);
      const barra = barraInferior(container);
      const clase = Array.from(barra.classList).find((c) =>
        Array.from(document.styleSheets).some((sheet) => {
          try {
            return Array.from(sheet.cssRules).some((rule) =>
              rule.cssText.includes(`.${c}`),
            );
          } catch {
            return false;
          }
        }),
      );
      expect(clase, "la barra inferior no tiene clase inyectada").toBeDefined();

      const enMd = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((rule) => rule.cssText);
          } catch {
            return [];
          }
        })
        .filter(
          (texto) =>
            texto.startsWith("@media") &&
            /min-width:\s*768px/.test(texto) &&
            texto.includes(`.${clase}`),
        )
        .join("\n");

      expect(enMd, "no se encontró el bloque md de la barra inferior").not.toBe(
        "",
      );
      expect(enMd).toContain(`padding-bottom: ${themes.light.space[5]}`);
      expect(enMd).not.toContain(`${BACK_TO_TOP_SIDE_PX}px`);
    });
  });
});
