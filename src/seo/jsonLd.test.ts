import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES, ROUTES, SITE, absoluteUrl, routePath } from "@/config/site";
import { links } from "@/config/links";
import { LEGAL_ENTITY } from "@/config/legal";
import {
  founderJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
  webPageJsonLd,
} from "./jsonLd";

/** Recorre cualquier valor JSON-LD y recoge todas las cadenas que contiene. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

describe("organizationJsonLd", () => {
  it("expone un @id estable con el patrón esperado", () => {
    expect(organizationJsonLd()["@id"]).toBe(`${SITE.url}#organization`);
  });

  it("el @id no cambia entre llamadas (estabilidad de referencia)", () => {
    expect(organizationJsonLd()["@id"]).toBe(organizationJsonLd()["@id"]);
  });

  /*
   * Hasta el 2026-09-30 apuntaba a `/brand/logo.svg`, el glifo blanco sobre
   * transparente. La guía de logos de Google pide que la imagen se vea bien
   * sobre blanco puro; el PNG lleva el fondo oscuro del icono del sitio.
   */
  it("logo apunta al PNG con fondo que existe en public/brand/", () => {
    expect(organizationJsonLd().logo).toBe(absoluteUrl("/brand/logo.png"));
    /* Ruta con `join` y no con `new URL(…, import.meta.url)`: Vite reescribe
       ese patrón como la URL HTTP del asset en el servidor de desarrollo, no
       como una ruta de disco. */
    const publicRoot = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../public",
    );
    expect(existsSync(join(publicRoot, "brand/logo.png"))).toBe(true);
  });

  it("description reutiliza la descripcion canonica del sitio", () => {
    expect(organizationJsonLd().description).toBe(SITE.description);
  });

  it("email expone la direccion desnuda, sin el esquema mailto:", () => {
    expect(organizationJsonLd().email).toBe(
      links.email.replace(/^mailto:/, ""),
    );
    expect(organizationJsonLd().email).not.toContain("mailto:");
    expect(organizationJsonLd().email).toContain("@");
  });

  it("sameAs contiene EXACTAMENTE los perfiles del proyecto en otras plataformas", () => {
    expect(organizationJsonLd().sameAs).toEqual([links.github, links.discord]);
  });

  /*
   * EL PERFIL PERSONAL NO ES EL PROYECTO (2026-09-28). `sameAs` declara URLs
   * de la MISMA entidad; el LinkedIn del titular estuvo aquí del 2026-08-13 a
   * esta fecha y decía a un buscador que el proyecto y la persona eran una sola
   * cosa. Ahora la persona es su propio nodo y el proyecto la cita como
   * `founder`.
   */
  it("sameAs NO incluye el perfil personal: la persona se enlaza como founder", () => {
    expect(organizationJsonLd().sameAs).not.toContain(links.linkedin);
    expect(organizationJsonLd().founder).toEqual({
      "@id": founderJsonLd()["@id"],
    });
  });

  /*
   * 2026-09-30, decisión del dueño: «VTI» entra como nombre de la marca.
   * Google lee la lista por orden de preferencia, así que el primero sigue
   * siendo la marca en palabras. Solo nombres: «Void2Infinite» es una forma de
   * buscar la marca, no un nombre (corrección del dueño ese mismo día), y no
   * se declara.
   */
  it("alternateName lista los nombres alternativos, la marca en palabras primero", () => {
    expect(organizationJsonLd().alternateName).toEqual(SITE.alternateNames);
    expect(SITE.alternateNames).toEqual(["Void to Infinite", "VTI"]);
    expect(SITE.alternateNames).not.toContain(SITE.name);
    expect(SITE.alternateNames[0].replace(/\s+/g, "").toLowerCase()).toBe(
      SITE.name.toLowerCase(),
    );
  });

  it("sameAs NO incluye el subdominio propio de desarrollo (no es un perfil externo)", () => {
    expect(organizationJsonLd().sameAs).not.toContain(links.playground);
    expect(organizationJsonLd().sameAs).not.toContain(links.sdk);
    for (const destino of organizationJsonLd().sameAs) {
      expect(destino).not.toContain("dev.voidtoinfinite.com");
    }
  });
});

describe("webSiteJsonLd", () => {
  it("expone un @id estable con el patrón esperado", () => {
    expect(webSiteJsonLd()["@id"]).toBe(`${SITE.url}#website`);
  });

  it("referencia a la organización por @id, no la duplica entera", () => {
    expect(webSiteJsonLd().publisher).toEqual({
      "@id": organizationJsonLd()["@id"],
    });
  });

  /*
   * Hasta el 2026-09-28 declaraba solo `SITE.lang` ("es"), y este nodo se
   * emite igual en las rutas inglesas: `/en` le decía a un buscador que el
   * sitio entero estaba en castellano.
   */
  it("declara los dos idiomas del sitio: el mismo nodo viaja en todas las rutas", () => {
    expect(webSiteJsonLd().inLanguage).toEqual(LOCALES);
  });

  it("lleva los mismos nombres alternativos que la organización (nombre del sitio en Google)", () => {
    expect(webSiteJsonLd().alternateName).toEqual(SITE.alternateNames);
  });
});

describe("founderJsonLd", () => {
  it("expone un @id estable con el patrón esperado", () => {
    expect(founderJsonLd()["@id"]).toBe(`${SITE.url}#founder`);
  });

  it("el nombre sale de la ficha legal, no de un literal propio", () => {
    expect(founderJsonLd().name).toBe(LEGAL_ENTITY.name);
  });

  it("sameAs lleva EXACTAMENTE el perfil personal del titular", () => {
    expect(founderJsonLd().sameAs).toEqual([links.linkedin]);
  });
});

describe("webPageJsonLd", () => {
  const input = {
    routeKey: "privacy",
    locale: "es",
    name: "Política de privacidad",
    description: "Descripción de prueba.",
  } as const;

  it("referencia al WebSite por @id, no lo duplica entero", () => {
    expect(webPageJsonLd(input).isPartOf).toEqual({
      "@id": webSiteJsonLd()["@id"],
    });
  });

  it("compone breadcrumb de dos niveles: Inicio → la página", () => {
    const breadcrumb = webPageJsonLd(input).breadcrumb;
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb?.itemListElement).toHaveLength(2);
    expect(breadcrumb?.itemListElement[0]).toEqual({
      "@type": "ListItem",
      "position": 1,
      "name": "Inicio",
      "item": absoluteUrl("/"),
    });
    expect(breadcrumb?.itemListElement[1]).toEqual({
      "@type": "ListItem",
      "position": 2,
      "name": input.name,
      "item": absoluteUrl(ROUTES.privacy),
    });
  });

  it("omite breadcrumb en la raíz: no hay jerarquía por encima de sí misma", () => {
    const home = webPageJsonLd({
      routeKey: "home",
      locale: "es",
      name: "VoidToInfinite",
      description: "Descripción de prueba.",
    });
    expect(home).not.toHaveProperty("breadcrumb");
    // El resto de campos se mantiene intacto: la omisión es quirúrgica.
    expect(home["@id"]).toBe(`${absoluteUrl("/")}#webpage`);
    expect(home.url).toBe(absoluteUrl("/"));
    expect(home.name).toBe("VoidToInfinite");
    expect(home.description).toBe("Descripción de prueba.");
    expect(home.inLanguage).toBe(SITE.lang);
    expect(home.isPartOf).toEqual({ "@id": webSiteJsonLd()["@id"] });
  });

  it("omite datePublished/dateModified cuando no se pasan, en vez de escribirlos vacíos", () => {
    const page = webPageJsonLd(input);
    expect(page).not.toHaveProperty("datePublished");
    expect(page).not.toHaveProperty("dateModified");
  });

  it("incluye datePublished/dateModified cuando sí se pasan", () => {
    const page = webPageJsonLd({
      ...input,
      datePublished: "2026-08-04",
      dateModified: "2026-08-04",
    });
    expect(page.datePublished).toBe("2026-08-04");
    expect(page.dateModified).toBe("2026-08-04");
  });

  /*
   * EL NODO SIGUE AL IDIOMA DE LA RUTA (2026-08-18). Hasta esta entrega
   * `inLanguage` era la constante `SITE.lang` en TODAS las páginas, así que
   * `/en/privacy` habría declarado castellano a cualquier motor que lea datos
   * estructurados — la misma familia de defecto que el `og:locale` fijo en
   * `es_ES` que arrastraban tres críticas seguidas.
   */
  it("declara inLanguage según el idioma de la ruta, no una constante del sitio", () => {
    expect(webPageJsonLd({ ...input, locale: "en" }).inLanguage).toBe("en");
    expect(webPageJsonLd(input).inLanguage).toBe("es");
  });

  it("la ruta inglesa usa su propia URL y su propio breadcrumb", () => {
    const page = webPageJsonLd({
      ...input,
      locale: "en",
      name: "Privacy policy",
    });

    expect(page.url).toBe(absoluteUrl(routePath("privacy", "en")));
    expect(page["@id"]).toBe(
      `${absoluteUrl(routePath("privacy", "en"))}#webpage`,
    );
    // La migaja de vuelta lleva a la portada del MISMO idioma, no a la
    // castellana: desde `/en/privacy` el "arriba" es `/en`.
    expect(page.breadcrumb?.itemListElement[0]).toEqual({
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": absoluteUrl(routePath("home", "en")),
    });
  });
});

describe("veracidad y serialización — los cuatro constructores", () => {
  const nodes = [
    organizationJsonLd(),
    webSiteJsonLd(),
    founderJsonLd(),
    webPageJsonLd({
      routeKey: "legalNotice",
      locale: "es",
      name: "Aviso legal",
      description: "Descripción de prueba.",
    }),
  ];

  it("ningún valor contiene el marcador POR_COMPLETAR (regla de veracidad de D6)", () => {
    for (const node of nodes) {
      for (const value of collectStrings(node)) {
        expect(value).not.toContain("POR_COMPLETAR");
      }
    }
  });

  it("cada nodo sobrevive a JSON.stringify + JSON.parse sin perder datos", () => {
    for (const node of nodes) {
      expect(JSON.parse(JSON.stringify(node))).toEqual(node);
    }
  });

  it("un array de los nodos también es serializable (uso real: <JsonLd data={[...]} />)", () => {
    expect(() => JSON.parse(JSON.stringify(nodes))).not.toThrow();
    expect(JSON.parse(JSON.stringify(nodes))).toEqual(nodes);
  });
});
