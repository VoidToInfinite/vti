import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { I18nProvider } from "@/i18n/I18nProvider";
import {
  EN_ROUTES,
  OG_LOCALES,
  ROUTES,
  SITE,
  absoluteUrl,
} from "@/config/site";
import { LEGAL_VERSIONS } from "@/config/legal";
import enCommon from "@/i18n/locales/en/common.json";
import enLegal from "@/i18n/locales/en/legal.json";
import esCommon from "@/i18n/locales/es/common.json";
import esLegal from "@/i18n/locales/es/legal.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import EnHomePage, { metadata as homeMetadata } from "./page";
import EnLegalNoticePage, {
  metadata as legalNoticeMetadata,
} from "./legal-notice/page";
import EnPrivacyPage, { metadata as privacyMetadata } from "./privacy/page";

/*
 * LAS TRES RUTAS INGLESAS, MONTADAS DE VERDAD (2026-08-18).
 *
 * Lo que solo se puede comprobar AQUÍ, en el punto de ensamblaje, es la
 * propiedad que motivó la entrega y que ningún test de componente ve: que el
 * inglés está en el PRIMER render de estas rutas -- es decir, en el HTML que
 * hornea `output: "export"` y que leen los rastreadores y quien navega sin
 * JavaScript -- y no tras hidratar. Hasta esta entrega el inglés solo existía
 * en memoria bajo la URL castellana, y tres críticas seguidas midieron la
 * consecuencia: no se comparte, no se marca, no se indexa.
 *
 * El envoltorio `I18nProvider locale="en"` reproduce lo que hace
 * `app/en/layout.tsx` en producción: las páginas no lo montan por su cuenta,
 * lo reciben de su layout. Va DENTRO de `renderWithProviders` para heredar el
 * tema real; el `I18nextProvider` interno gana al externo por proximidad, que
 * es exactamente el mecanismo del árbol real.
 */
function renderEn(page: ReactElement) {
  return renderWithProviders(<I18nProvider locale="en">{page}</I18nProvider>);
}

const paginasLegales = [
  {
    nombre: "privacy",
    Page: EnPrivacyPage,
    metadata: privacyMetadata,
    ruta: EN_ROUTES.privacy,
    rutaEs: ROUTES.privacy,
    doc: enLegal.Legal.privacy,
    docEs: esLegal.Legal.privacy,
    version: LEGAL_VERSIONS.privacy,
  },
  {
    nombre: "legal-notice",
    Page: EnLegalNoticePage,
    metadata: legalNoticeMetadata,
    ruta: EN_ROUTES.legalNotice,
    rutaEs: ROUTES.legalNotice,
    doc: enLegal.Legal.legalNotice,
    docEs: esLegal.Legal.legalNotice,
    version: LEGAL_VERSIONS.legalNotice,
  },
] as const;

beforeEach(() => {
  window.localStorage.clear();
  // Los documentos legales y la home montan `Footer`, que desde 2026-08-07
  // monta `SectionBeam` siempre -- y `SectionBeam` usa `useReveal`, que llama a
  // `IntersectionObserver`, ausente en jsdom. Mismo stub que ya usan
  // `Footer.test.tsx` y `legal-pages.test.tsx` por el mismo motivo.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor() {}
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): [] {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("rutas inglesas — metadata horneada", () => {
  it.each([
    {
      nombre: "/en",
      metadata: homeMetadata,
      ruta: EN_ROUTES.home,
      rutaEs: ROUTES.home,
      titulo: enCommon.Common.Meta.home.title,
    },
    ...paginasLegales.map((pagina) => ({
      nombre: pagina.ruta,
      metadata: pagina.metadata,
      ruta: pagina.ruta,
      rutaEs: pagina.rutaEs,
      titulo: pagina.doc.title,
    })),
  ])(
    "$nombre canoniza su PROPIA URL inglesa y declara og:locale en_US",
    ({ metadata, ruta, titulo }) => {
      expect(metadata.alternates?.canonical).toBe(absoluteUrl(ruta));
      expect(metadata.title).toBe(`${titulo}${TITLE_SEPARATOR}${SITE.name}`);

      const openGraph = metadata.openGraph;
      expect(
        openGraph && "locale" in openGraph ? openGraph.locale : undefined,
      ).toBe(OG_LOCALES.en);
      expect(openGraph && "url" in openGraph ? openGraph.url : undefined).toBe(
        absoluteUrl(ruta),
      );
    },
  );

  it.each([
    { nombre: "/en", metadata: homeMetadata, rutaEs: ROUTES.home },
    ...paginasLegales.map((pagina) => ({
      nombre: pagina.ruta,
      metadata: pagina.metadata,
      rutaEs: pagina.rutaEs,
    })),
  ])(
    "$nombre apunta a su contraparte castellana por hreflang, y ésa es el x-default",
    ({ metadata, rutaEs }) => {
      const languages = metadata.alternates?.languages;
      expect(languages?.es).toBe(absoluteUrl(rutaEs));
      expect(languages?.["x-default"]).toBe(absoluteUrl(rutaEs));
    },
  );

  /*
   * El título horneado de una ruta inglesa NO puede ser el castellano: ése era
   * literalmente el defecto ("el inglés no se comparte"), porque `<title>` y
   * `og:title` salen del mismo valor y son lo que ve un buscador y una vista
   * previa compartida. Sonda de no-vacuidad: sin esto, los asserts de arriba
   * pasarían igual si `en/legal.json` fuera una copia del castellano.
   */
  it.each(paginasLegales)(
    "$nombre no hornea el título castellano de su contraparte",
    ({ metadata, doc, docEs }) => {
      expect(doc.title).not.toBe(docEs.title);
      expect(metadata.title).toContain(doc.title);
      expect(metadata.title).not.toContain(docEs.title);
    },
  );
});

describe("rutas inglesas — el inglés está en el PRIMER render", () => {
  it("/en pinta la copia inglesa de la portada, sin esperar a ningún efecto", () => {
    const { container } = renderEn(<EnHomePage />);

    // Sin `waitFor` ni `act` a propósito: lo que importa es el HTML que sale
    // del primer render, que es el que se hornea en el build.
    //
    // Se comprueban DOS textos que difieren de verdad entre los dos idiomas
    // ("Story"/"Historia", "Journey"/"Viaje"): un texto que coincidiera en
    // ambos pasaría el test sin probar nada.
    expect(enCommon.Common.Navigation.story).not.toBe(
      esCommon.Common.Navigation.story,
    );
    expect(container.textContent).toContain(enCommon.Common.Navigation.story);
    expect(container.textContent).toContain(enCommon.Common.Navigation.journey);
    expect(container.textContent).not.toContain(
      esCommon.Common.Navigation.story,
    );
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it.each(paginasLegales)(
    "/en/$nombre pinta el <h1> inglés del documento, no el castellano",
    ({ Page, doc, docEs }) => {
      renderEn((<Page />) as ReactElement);

      const encabezado = screen.getByRole("heading", { level: 1 });
      expect(encabezado).toHaveTextContent(doc.title);
      expect(encabezado).not.toHaveTextContent(docEs.title);
    },
  );

  it.each(paginasLegales)(
    "/en/$nombre emite un WebPage con inLanguage en y su URL inglesa",
    ({ Page, ruta, doc, version }) => {
      const { container } = renderEn((<Page />) as ReactElement);

      const script = container.querySelector(
        'script[type="application/ld+json"]',
      );
      const datos = JSON.parse(script?.textContent ?? "null");

      expect(datos["@type"]).toBe("WebPage");
      expect(datos.url).toBe(absoluteUrl(ruta));
      expect(datos.inLanguage).toBe("en");
      expect(datos.name).toBe(doc.title);
      expect(datos.dateModified).toBe(version.updated);
      expect(JSON.stringify(datos)).not.toContain("POR_COMPLETAR");
    },
  );

  /*
   * La salida de vuelta importa tanto como la ida: desde una ruta inglesa, el
   * selector tiene que llevar a la contraparte CASTELLANA de esa misma página,
   * no a la portada. Aquí `usePathname()` devuelve `null` (jsdom, sin App
   * Router), así que el componente cae a la portada -- que es su
   * comportamiento declarado para una ruta desconocida. Lo que este test
   * comprueba es lo que sí es observable en el ensamblaje: que la cabecera
   * inglesa monta el selector con los dos idiomas y sus `hreflang`.
   *
   * LA CONSULTA BAJA AL DOM EL 2026-09-03, y el contrato no se relaja (regla
   * 40): desde que las legales montan el `Navbar` del sitio en vez de una
   * cabecera propia (decisión del dueño tras la crítica externa #16, ver el
   * docblock de `PrivacyDocument.tsx`), el par de idioma vive dentro de
   * `ScBarLanguage`, cuya regla BASE es `display: none` -- mobile-first: por
   * debajo de `md` el idioma se entrega en la hoja móvil. jsdom no evalúa
   * ningún `@media`, así que se queda con esa regla base y `getAllByRole`,
   * que filtra por visibilidad, devolvía cero enlaces. En Chrome a 1440 los
   * dos siguen en la barra (verificado: paradas 8 y 9 del recorrido de
   * teclado sobre `/privacidad`). Se sigue exigiendo lo mismo -- dos enlaces
   * de idioma con sus `hreflang`, en ese orden, dentro de la cabecera -- pero
   * leyéndolo del DOM, que es donde jsdom sí puede verlo.
   */
  it.each(paginasLegales)(
    "/en/$nombre monta el selector de idioma con enlaces reales en su cabecera",
    ({ Page }) => {
      const { container } = renderEn((<Page />) as ReactElement);

      const cabecera = container.querySelector("header");
      expect(cabecera).not.toBeNull();
      const porIdioma = Array.from(cabecera!.querySelectorAll("a")).filter(
        (enlace) => enlace.hasAttribute("hreflang"),
      );

      expect(porIdioma).toHaveLength(2);
      expect(porIdioma.map((e) => e.getAttribute("hreflang"))).toEqual([
        "es",
        "en",
      ]);
    },
  );

  /*
   * EL ENSAMBLAJE INGLÉS DE LA OLA M (frente Q-2, 2026-09-04).
   *
   * EL HUECO QUE CIERRA: un evaluador técnico declaró que el protocolo nunca se
   * había repetido en `/privacidad`, `/aviso-legal` ni la 404. La rama inglesa
   * de esas rutas es la mitad menos vista de todas — el propio repo ya pagó esa
   * lección el 2026-08-13, cuando `legalForm` pintaba español dentro del
   * documento inglés porque TODOS los tests renderizaban en castellano.
   *
   * MEDIDO en Chrome sobre el build de `0226846` servido, `/en/privacy` y
   * `/en/legal-notice`: dos landmarks de navegación rotulados «Site navigation»
   * y «Contents»; 29 paradas de teclado con anillo visible en las 29 y sin
   * trampas; el índice con 14 y 15 destinos VIVOS respectivamente; y el
   * documento entero servido sin JavaScript (10.315 y 5.725 caracteres de
   * `main`, con los 14/15 destinos del índice resolviendo a una sección real).
   *
   * Los rótulos salen de `en/common.json` y `en/legal.json`, no de un string
   * tecleado aquí, y se exige además que DIFIERAN de sus gemelos castellanos:
   * sin esa comparación, una rama inglesa que se quedara con el rótulo
   * castellano pasaría este candado en verde.
   */
  it.each(paginasLegales)(
    "/en/$nombre expone los DOS landmarks de navegacion rotulados en ingles",
    ({ Page }) => {
      const { container } = renderEn((<Page />) as ReactElement);

      const rotulos = Array.from(container.querySelectorAll("nav")).map((nav) =>
        nav.getAttribute("aria-label"),
      );

      expect(rotulos).toHaveLength(2);
      expect(new Set(rotulos).size).toBe(2);
      expect(rotulos).toContain(enCommon.Common.Nav.landmark);
      expect(rotulos).toContain(enLegal.Legal.common.tocLabel);

      // Sonda de idioma: si la rama inglesa heredara los rótulos castellanos,
      // los `toContain` de arriba seguirían pasando el día que las dos claves
      // coincidieran por descuido.
      expect(enCommon.Common.Nav.landmark).not.toBe(
        esCommon.Common.Nav.landmark,
      );
      expect(enLegal.Legal.common.tocLabel).not.toBe(
        esLegal.Legal.common.tocLabel,
      );
    },
  );

  it.each(paginasLegales)(
    "/en/$nombre monta el indice ingles con un destino vivo por seccion del documento",
    ({ Page, doc }) => {
      const { container } = renderEn((<Page />) as ReactElement);

      // Sonda positiva: sin secciones el bucle no se ejecutaría y el candado
      // pasaría por vacuidad, que es como se colaron los dos anteriores.
      expect(doc.sections.length).toBeGreaterThan(0);

      const enlaces = Array.from(
        container.querySelectorAll('main nav a[href^="#"]'),
      );
      expect(enlaces).toHaveLength(doc.sections.length);

      for (const enlace of enlaces) {
        const destino = (enlace.getAttribute("href") ?? "").slice(1);
        expect(
          container.querySelector(`section[id="${destino}"]`),
          `el índice de /en/${destino} enlaza a #${destino}, que no es una sección del documento`,
        ).not.toBeNull();
      }
    },
  );
});
