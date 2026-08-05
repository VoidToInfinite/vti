import type { ReactElement } from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, within } from "@/test/test-utils";
import { LEGAL_VERSIONS } from "@/config/legal";
import { ROUTES } from "@/config/site";
import esLegal from "@/i18n/locales/es/legal.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import { SITE } from "@/config/site";
import AccessibilityPage, {
  metadata as accessibilityMetadata,
} from "./accesibilidad/page";
import LegalNoticePage, {
  metadata as legalNoticeMetadata,
} from "./aviso-legal/page";
import PrivacyPage, { metadata as privacyMetadata } from "./privacidad/page";
import TermsPage, { metadata as termsMetadata } from "./terminos/page";

/*
 * Candado de las CUATRO rutas legales montadas de verdad, no de sus piezas
 * por separado (que ya cubren `LegalDocument.test.tsx` y `LegalHeader.test.tsx`).
 *
 * Lo que solo se puede comprobar AQUÍ, en el punto de ensamblaje, es que cada
 * `page.tsx` conecta el documento correcto con la metadata correcta. Un
 * copiar-pegar entre las cuatro cáscaras -- que son casi idénticas -- podría
 * dejar `/terminos` sirviendo el documento de privacidad con el título de
 * términos, y ni el typecheck ni ningún test de componente lo verían.
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
    nombre: "terminos",
    Page: TermsPage,
    metadata: termsMetadata,
    ruta: ROUTES.terms,
    doc: esLegal.Legal.terms,
    version: LEGAL_VERSIONS.terms,
  },
  {
    nombre: "accesibilidad",
    Page: AccessibilityPage,
    metadata: accessibilityMetadata,
    ruta: ROUTES.accessibility,
    doc: esLegal.Legal.accessibility,
    version: LEGAL_VERSIONS.accessibility,
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

describe("rutas legales", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it.each(paginas)(
    "/$nombre monta el documento correcto con un unico h1",
    ({ Page, doc }) => {
      renderWithProviders((<Page />) as ReactElement);

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
      const { container } = renderWithProviders((<Page />) as ReactElement);

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

  it.each(paginas)("/$nombre monta cabecera propia y pie", ({ Page }) => {
    renderWithProviders((<Page />) as ReactElement);

    const cabecera = screen.getByRole("banner");
    expect(within(cabecera).getByRole("link", { name: /./ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
