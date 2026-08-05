import { describe, it, expect } from "vitest";
import type { Metadata } from "next";
import { SITE, ROUTES, LEGAL_ROUTE_KEYS, absoluteUrl } from "@/config/site";
import {
  buildMetadata,
  OG_IMAGE_PATH,
  OG_IMAGE_SIZE,
  TITLE_SEPARATOR,
} from "./metadata";

/** Las cinco rutas reales del sitio: home + las cuatro legales. */
const ALL_ROUTE_KEYS = ["home", ...LEGAL_ROUTE_KEYS] as const;

/** Títulos de prueba por ruta — fixtures del test, no copy de producción. */
const FIXTURE_TITLES: Record<(typeof ALL_ROUTE_KEYS)[number], string> = {
  home: SITE.name,
  privacy: "Política de privacidad",
  terms: "Términos de uso",
  accessibility: "Accesibilidad",
  legalNotice: "Aviso legal",
};

const FIXTURE_DESCRIPTION = "Descripción de prueba para metadata.test.ts.";

/**
 * `Metadata["openGraph"]` es la unión `OpenGraphWebsite | OpenGraphArticle |
 * … | OpenGraphMetadata` (el último miembro, sin `type`, es el que cubre el
 * caso "no se declaró tipo"). `buildMetadata()` siempre declara
 * `type: "website"`, pero TypeScript no lo sabe desde el tipo de retorno —
 * hay que angostar la unión con `in` (en vez de un cast a `any`) para poder
 * leer `.type` de forma segura.
 */
function expectOpenGraphWebsite(
  openGraph: Metadata["openGraph"],
): asserts openGraph is Extract<
  NonNullable<Metadata["openGraph"]>,
  { type: string }
> {
  if (!openGraph || !("type" in openGraph)) {
    throw new Error("se esperaba que buildMetadata() declarara openGraph.type");
  }
}

/** Misma razón que `expectOpenGraphWebsite`, para la unión `Twitter`. */
function expectTwitterCard(
  twitter: Metadata["twitter"],
): asserts twitter is Extract<
  NonNullable<Metadata["twitter"]>,
  { card: string }
> {
  if (!twitter || !("card" in twitter)) {
    throw new Error("se esperaba que buildMetadata() declarara twitter.card");
  }
}

/**
 * `robots.googleBot` está tipado `string | RobotsInfo | undefined` en Next
 * porque acepta también una directiva en texto plano (p. ej. "noindex").
 * `buildMetadata()` siempre construye un objeto, nunca un string, pero el
 * test tiene que demostrarlo en tiempo de ejecución para poder leer
 * `["max-image-preview"]` sin `any` ni un cast que finja saberlo de
 * antemano.
 */
function expectMaxImagePreviewLarge(metadata: Metadata): void {
  const { robots } = metadata;
  if (typeof robots !== "object" || robots === null) {
    throw new Error(
      "se esperaba que buildMetadata() devolviera robots como objeto",
    );
  }
  const { googleBot } = robots;
  if (typeof googleBot !== "object" || googleBot === null) {
    throw new Error("se esperaba que googleBot fuera un objeto, no un string");
  }
  expect(googleBot["max-image-preview"]).toBe("large");
  expect(googleBot["max-snippet"]).toBe(-1);
  expect(googleBot["max-video-preview"]).toBe(-1);
}

describe("buildMetadata — contrato H2 (openGraph y twitter completos en TODAS las rutas)", () => {
  it.each(ALL_ROUTE_KEYS)(
    "la ruta %s expone openGraph y twitter completos, no solo title/description",
    (key) => {
      const path = ROUTES[key];
      const metadata = buildMetadata({
        path,
        title: FIXTURE_TITLES[key],
        description: FIXTURE_DESCRIPTION,
      });

      // Estos cuatro son EXACTAMENTE los campos que H2 hace desaparecer si
      // una página declarara su propio `openGraph` parcial en vez de pasar
      // por este helper.
      expectOpenGraphWebsite(metadata.openGraph);
      expect(metadata.openGraph.siteName).toBe(SITE.name);
      expect(metadata.openGraph.locale).toBe(SITE.ogLocale);
      expect(metadata.openGraph.type).toBe("website");
      expect(metadata.openGraph.url).toBe(absoluteUrl(path));

      expectTwitterCard(metadata.twitter);
      expect(metadata.twitter.card).toBe("summary_large_image");
      expect(metadata.twitter.title).toBe(metadata.title);
      expect(metadata.twitter.description).toBe(FIXTURE_DESCRIPTION);

      expectMaxImagePreviewLarge(metadata);
    },
  );

  it.each(ALL_ROUTE_KEYS)(
    "la ruta %s tiene canónica absoluta exacta y sin barra final",
    (key) => {
      const path = ROUTES[key];
      const metadata = buildMetadata({
        path,
        title: FIXTURE_TITLES[key],
        description: FIXTURE_DESCRIPTION,
      });

      expect(metadata.alternates?.canonical).toBe(absoluteUrl(path));
      if (path !== "/") {
        expect(metadata.alternates?.canonical).not.toMatch(/\/$/);
      }
    },
  );

  /*
   * SUSTITUYE al test que afirmaba lo contrario ("la ruta NO declara
   * openGraph.images ni twitter.images, ya los inyecta opengraph-image.tsx").
   * Esa era la decisión D4 original de la spec, y el build real de la entrega
   * la refutó: `out/index.html` llevaba `og:image` y `twitter:image`, pero
   * los cuatro HTML de las páginas legales NO llevaban ninguno de los dos.
   *
   * Causa, coherente con H2: la imagen del convenio de fichero vive en el
   * segmento RAÍZ, así que para una ruta anidada llega dentro del `openGraph`
   * ya resuelto del padre -- y el `openGraph` que declara la página lo
   * sustituye entero, imagen incluida. En `/` no ocurre porque ahí la imagen
   * pertenece al mismo segmento que la página.
   *
   * El test no se relaja: pasa de aseverar la ausencia a aseverar la
   * PRESENCIA con sus cinco campos, que es un candado igual de fuerte y sobre
   * la propiedad que de verdad importa (que un enlace compartido enseñe
   * imagen).
   */
  it.each(ALL_ROUTE_KEYS)(
    "la ruta %s declara la imagen OG completa en openGraph y en twitter",
    (key) => {
      const path = ROUTES[key];
      const metadata = buildMetadata({
        path,
        title: FIXTURE_TITLES[key],
        description: FIXTURE_DESCRIPTION,
      });

      const esperada = {
        url: OG_IMAGE_PATH,
        width: OG_IMAGE_SIZE.width,
        height: OG_IMAGE_SIZE.height,
        alt: metadata.title,
        type: "image/png",
      };

      expect(metadata.openGraph?.images).toEqual([esperada]);
      const twitter = metadata.twitter;
      expect(
        twitter && "images" in twitter ? twitter.images : undefined,
      ).toEqual([esperada]);
    },
  );
});

describe("buildMetadata — título", () => {
  it("la home no duplica el nombre del sitio en el título", () => {
    const metadata = buildMetadata({
      path: "/",
      title: SITE.name,
      description: FIXTURE_DESCRIPTION,
    });
    expect(metadata.title).toBe(SITE.name);
  });

  it("una página legal añade el sufijo de marca separado por el separador exportado", () => {
    const metadata = buildMetadata({
      path: "/privacidad",
      title: "Política de privacidad",
      description: FIXTURE_DESCRIPTION,
    });
    expect(metadata.title).toBe(
      `Política de privacidad${TITLE_SEPARATOR}${SITE.name}`,
    );
  });
});

describe("buildMetadata — keywords", () => {
  it("incluye keywords solo cuando se pasan", () => {
    const conKeywords = buildMetadata({
      path: "/privacidad",
      title: "Política de privacidad",
      description: FIXTURE_DESCRIPTION,
      keywords: ["privacidad", "rgpd"],
    });
    expect(conKeywords.keywords).toEqual(["privacidad", "rgpd"]);

    const sinKeywords = buildMetadata({
      path: "/privacidad",
      title: "Política de privacidad",
      description: FIXTURE_DESCRIPTION,
    });
    expect(sinKeywords).not.toHaveProperty("keywords");
  });
});

describe("buildMetadata — validación de path", () => {
  it("lanza si el path no empieza por barra", () => {
    expect(() =>
      buildMetadata({
        path: "privacidad",
        title: "Política de privacidad",
        description: FIXTURE_DESCRIPTION,
      }),
    ).toThrow();
  });
});
