import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { LEGAL_VERSIONS } from "@/config/legal";
import { navBarSectionsFor } from "@/config/navigation";
import { ROUTES } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import esLegal from "@/i18n/locales/es/legal.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import { LocaleShell, Providers } from "../providers";
import { SITE } from "@/config/site";
import LegalNoticePage, {
  metadata as legalNoticeMetadata,
} from "./aviso-legal/page";
import PrivacyPage, { metadata as privacyMetadata } from "./privacidad/page";

/*
 * Candado de las DOS rutas legales montadas de verdad, no de sus piezas por
 * separado (que ya cubren `LegalDocument.test.tsx` para el renderer y
 * `PrivacyDocument.test.tsx` / `LegalNoticeDocument.test.tsx` para los
 * envoltorios; `LegalHeader.test.tsx` se citaba aquí hasta el 2026-09-03 y
 * desapareció con su componente al revertirse D20 -- las legales montan hoy
 * el `Navbar` del sitio, y sus candados los sostiene `Navbar.test.tsx`).
 * Fueron cuatro hasta el 2026-08-08: `/terminos` y `/accesibilidad` se
 * retiraron en la revisión legal de esa fecha (ver `LEGAL_ROUTE_KEYS` en
 * `src/config/site.ts`).
 *
 * Lo que solo se puede comprobar AQUÍ, en el punto de ensamblaje, es que cada
 * `page.tsx` conecta el documento correcto con la metadata correcta. Un
 * copiar-pegar entre las dos cáscaras -- que son casi idénticas -- podría
 * dejar `/aviso-legal` sirviendo el documento de privacidad con el título del
 * aviso, y ni el typecheck ni ningún test de componente lo verían.
 */
const paginas = [
  {
    nombre: "privacidad",
    Page: PrivacyPage,
    metadata: privacyMetadata,
    ruta: ROUTES.privacy,
    doc: esLegal.Legal.privacy,
    version: LEGAL_VERSIONS.privacy,
  },
  {
    nombre: "aviso-legal",
    Page: LegalNoticePage,
    metadata: legalNoticeMetadata,
    ruta: ROUTES.legalNotice,
    doc: esLegal.Legal.legalNotice,
    version: LEGAL_VERSIONS.legalNotice,
  },
] as const;

/*
 * MONTA EL ÁRBOL REAL DE LA RUTA: root layout + layout de rama + página
 * (2026-09-04, frente del presupuesto de JS).
 *
 * Antes bastaba `renderRuta(<Page />)` porque cada envoltorio legal
 * montaba por su cuenta `Navbar` y `Footer`. Desde que la cáscara del sitio
 * cuelga de `LocaleShell` -- el ancestro común de las ocho páginas, que es lo
 * que impide que Turbopack la emita dos veces en las portadas (ver el docblock
 * de `app/providers.tsx`) -- una página montada SIN su layout ya no trae
 * cabecera ni pie, y este fichero comprueba justo eso. Se reproduce aquí el
 * anidamiento real, igual que `app/providers.test.tsx`, en vez de aflojar los
 * asertos: la afirmación que se protege no ha cambiado (la ruta expone la
 * navegación del sitio), solo el sitio del árbol donde se cumple.
 */
function renderRuta(ui: ReactElement) {
  return render(
    <Providers>
      <LocaleShell locale="es">{ui}</LocaleShell>
    </Providers>,
  );
}

describe("rutas legales", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Cada documento legal monta el `Footer` de la home (ver
    // `PrivacyDocument.tsx` y `LegalNoticeDocument.tsx`), que desde 2026-08-07 (D6.3 de la spec
    // `2026-08-07-footer-beam-estrellas-tema-claro-design.md`) monta
    // `SectionBeam` SIEMPRE, no solo en oscuro -- y `SectionBeam` usa
    // `useReveal`, que llama a `IntersectionObserver`, ausente en jsdom.
    // Mismo stub que ya usan `Footer.test.tsx`/`Contact.test.tsx`/
    // `SectionBeam.test.tsx` para el mismo motivo.
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
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it.each(paginas)(
    "/$nombre monta el documento correcto con un unico h1",
    ({ Page, doc }) => {
      renderRuta((<Page />) as ReactElement);

      const encabezados = screen.getAllByRole("heading", { level: 1 });
      expect(encabezados).toHaveLength(1);
      expect(encabezados[0]).toHaveTextContent(doc.title);
    },
  );

  it.each(paginas)(
    "/$nombre declara la canonica y el titulo de SU documento",
    ({ metadata, ruta, doc }) => {
      expect(metadata.alternates?.canonical).toBe(`${SITE.url}${ruta}`);
      expect(metadata.title).toBe(`${doc.title}${TITLE_SEPARATOR}${SITE.name}`);
      expect(metadata.description).toBe(doc.description);
    },
  );

  /*
   * H2 de la spec: en esta version de Next el `openGraph` del hijo SUSTITUYE
   * entero al del padre, asi que estos tres campos tienen que venir de
   * `buildMetadata()` en CADA pagina. Si alguien "simplifica" una cascara
   * escribiendo `openGraph: { title }` a mano, desaparecen del HTML sin que
   * nada mas falle -- este es el test que lo caza.
   */
  it.each(paginas)(
    "/$nombre lleva el bloque openGraph completo (H2)",
    ({ metadata, ruta }) => {
      expect(metadata.openGraph?.siteName).toBe(SITE.name);
      expect(metadata.openGraph?.locale).toBe(SITE.ogLocale);
      expect(metadata.openGraph?.url).toBe(`${SITE.url}${ruta}`);
      // `Twitter` es una union discriminada por `card`, asi que la clave no
      // existe en el tipo base: se estrecha con `in` en vez de castear, que
      // seria justo la clase de atajo que dejaria pasar un `twitter` mal
      // formado sin que el compilador dijera nada.
      const twitter = metadata.twitter;
      expect(twitter && "card" in twitter ? twitter.card : undefined).toBe(
        "summary_large_image",
      );
    },
  );

  it.each(paginas)(
    "/$nombre emite datos estructurados WebPage parseables y de su propia ruta",
    ({ Page, ruta, doc, version }) => {
      const { container } = renderRuta((<Page />) as ReactElement);

      const script = container.querySelector(
        'script[type="application/ld+json"]',
      );
      expect(script).not.toBeNull();

      const datos = JSON.parse(script?.textContent ?? "null");
      expect(datos["@type"]).toBe("WebPage");
      expect(datos.url).toBe(`${SITE.url}${ruta}`);
      expect(datos.name).toBe(doc.title);
      expect(datos.dateModified).toBe(version.updated);
      // Regla de veracidad (D6): ningun marcador puede filtrarse a los datos
      // estructurados, donde nadie lo veria.
      expect(JSON.stringify(datos)).not.toContain("POR_COMPLETAR");
    },
  );

  /*
   * LA CONSULTA BAJA AL DOM EL 2026-09-03, y el contrato se ENDURECE, no se
   * relaja (regla 40).
   *
   * Hasta hoy este candado pedía los enlaces de la cabecera con
   * `getAllByRole`, se quedaba con los que NO llevan `hreflang` -- los del
   * selector de idioma sí lo llevan -- y exigía que quedara exactamente UNO,
   * el de la marca. Esa cuenta describía la cabecera legal propia que se
   * retiró al revertirse D20 (ver el docblock de `PrivacyDocument.tsx`). Con
   * el `Navbar` del sitio montado, la cifra real medida en Chrome a 1440
   * sobre `/privacidad` es de 15 enlaces en la cabecera, 13 de ellos sin
   * `hreflang` -- y aun así el test seguía en verde afirmando 1.
   *
   * Por qué pasaba: `getAllByRole` filtra por visibilidad, la fila de la
   * barra vive dentro de un contenedor cuya regla BASE es `display: none`
   * (mobile-first; por debajo de `md` los destinos se entregan en la hoja
   * móvil) y jsdom no evalúa ningún `@media`, así que se queda con la regla
   * base y no ve ni uno. Es el MISMO mecanismo que ya obligó a bajar al DOM
   * el candado hermano de `app/en/en-routes.test.tsx`. Un candado que solo
   * puede pasar no protege nada: si la barra desapareciera entera, "hay
   * exactamente un enlace de marca" seguiría cumpliéndose.
   *
   * Lo que se exige ahora, leyéndolo del DOM: que las DOS cáscaras monten la
   * navegación del sitio -- la marca a la portada y los cuatro destinos
   * VISIBLES de la barra, tomados del modelo compartido y no tecleados -- más
   * el pie. La cuenta exacta de la cabecera completa (los doce destinos del
   * modelo más marca e idiomas) la cierra `PrivacyDocument.test.tsx` sobre su
   * envoltorio; aquí se comprueba lo que solo se ve en el ensamblaje: que
   * ninguna de las dos rutas se quedó sin ella.
   */
  it.each(paginas)(
    "/$nombre monta la navegacion del sitio y el pie",
    ({ Page }) => {
      const { container } = renderRuta((<Page />) as ReactElement);

      const cabecera = container.querySelector("header");
      expect(cabecera).not.toBeNull();
      const hrefs = Array.from(cabecera!.querySelectorAll("a")).map((enlace) =>
        enlace.getAttribute("href"),
      );

      expect(hrefs).toContain(ROUTES.home);

      const visibles = navBarSectionsFor("es");
      // Sonda positiva: sin ella, un modelo vacío dejaría el bucle sin
      // ejecutar y el candado volvería a pasar por vacuidad.
      expect(visibles.length).toBeGreaterThan(0);
      for (const destino of visibles) {
        expect(
          hrefs,
          `falta el destino ${destino.href} en la cabecera`,
        ).toContain(destino.href);
      }

      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    },
  );

  /*
   * LOS DOS LANDMARKS DE NAVEGACIÓN, ROTULADOS Y DISTINTOS (frente Q-2,
   * 2026-09-04).
   *
   * Antes de la ola M una página legal tenía UN `<nav>`: su índice. Desde que
   * monta la navegación del sitio tiene DOS, y esa es una propiedad nueva que
   * solo existe en el ensamblaje —ni `LegalDocument.test.tsx` ni
   * `Navbar.test.tsx` ven al otro— y que nadie había comprobado. Una lista de
   * landmarks con dos entradas sin nombre, o con el mismo nombre, no dice cuál
   * es cuál: es exactamente el motivo por el que el `Navbar` estrenó su propio
   * rótulo (ver el JSX de `ScNav` en `Navbar.tsx`).
   *
   * Medido en Chrome sobre el build de `0226846` servido, las cuatro rutas
   * legales: dos landmarks de navegación, «Navegación del sitio» y «Índice» en
   * castellano, «Site navigation» y «Contents» en inglés. Los dos rótulos salen
   * de su clave i18n y no de un string tecleado aquí.
   */
  it.each(paginas)(
    "/$nombre expone DOS landmarks de navegacion, los dos rotulados y con rotulos distintos",
    ({ Page }) => {
      const { container } = renderRuta((<Page />) as ReactElement);

      const rotulos = Array.from(container.querySelectorAll("nav")).map((nav) =>
        nav.getAttribute("aria-label"),
      );

      expect(rotulos).toHaveLength(2);
      for (const rotulo of rotulos) {
        expect(
          rotulo,
          "un nav sin nombre no se distingue del otro",
        ).toBeTruthy();
      }
      expect(new Set(rotulos).size).toBe(2);
      expect(rotulos).toContain(esCommon.Common.Nav.landmark);
      expect(rotulos).toContain(esLegal.Legal.common.tocLabel);
    },
  );
});
