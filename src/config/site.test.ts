import { describe, it, expect } from "vitest";
import { SITE, ROUTES, LEGAL_ROUTE_KEYS, absoluteUrl } from "./site";

describe("absoluteUrl", () => {
  it("la raíz no acaba en barra final (evita declarar dos formas de la misma URL)", () => {
    expect(absoluteUrl("/")).toBe(SITE.url);
    expect(absoluteUrl("/")).not.toMatch(/\/$/);
  });

  it("compone una ruta interna con el origen del sitio", () => {
    expect(absoluteUrl("/privacidad")).toBe(
      "https://voidtoinfinite.com/privacidad",
    );
  });

  it("lanza si la ruta no empieza por barra", () => {
    expect(() => absoluteUrl("privacidad")).toThrow();
  });
});

describe("SITE", () => {
  /*
   * Candado de la copia PÚBLICA de la home (entrega 2026-08-05). `homeTitle`
   * y `description` no son cadenas internas: alimentan el `<title>`, la
   * `<meta name="description">`, el `og:`/`twitter:` de la home y el subtítulo
   * de la imagen Open Graph. Lo que se ata aquí es lo que un descuido rompe
   * sin síntoma visible en la aplicación:
   *
   * - que `homeTitle` NO vuelva a ser la marca desnuda (si alguien lo iguala a
   *   `SITE.name`, `buildMetadata` deja de añadir el sufijo y el `<title>`
   *   regresa a "VoidToInfinite" a secas, que es justo el defecto corregido);
   * - que las dos cadenas lleven los acentos correctos. La `description`
   *   estuvo publicada con "imaginacion", "travesia" y "como" sin tilde, y
   *   nada en la suite lo veía porque ningún componente la renderiza en la
   *   página: solo sale en la pestaña, en el resultado de búsqueda y en las
   *   vistas previas compartidas.
   */
  it("homeTitle describe el sitio y NO es la marca desnuda", () => {
    expect(SITE.homeTitle).not.toBe(SITE.name);
    expect(SITE.homeTitle.length).toBeGreaterThan(0);
    expect(SITE.homeTitle).not.toContain(SITE.name);
  });

  it("la copia pública de la home lleva los acentos correctos", () => {
    for (const [clave, valor] of Object.entries({
      homeTitle: SITE.homeTitle,
      description: SITE.description,
    })) {
      for (const falta of [
        "imaginacion",
        "travesia",
        "Aprendizaje, imaginacion",
      ]) {
        expect(
          valor.toLowerCase(),
          `${clave} contiene "${falta}" sin acentuar`,
        ).not.toContain(falta.toLowerCase());
      }
    }
    // Sonda positiva: si estas dos palabras dejaran de estar, los asserts de
    // ausencia de arriba pasarían por vacuidad sobre una cadena cualquiera.
    expect(SITE.description).toContain("imaginación");
    expect(SITE.description).toContain("travesía");
  });
});

describe("ROUTES", () => {
  it("expone exactamente las cinco rutas públicas", () => {
    expect(Object.keys(ROUTES).sort()).toEqual([
      "accessibility",
      "home",
      "legalNotice",
      "privacy",
      "terms",
    ]);
  });
});

describe("LEGAL_ROUTE_KEYS", () => {
  it("contiene las cuatro claves legales", () => {
    expect([...LEGAL_ROUTE_KEYS].sort()).toEqual([
      "accessibility",
      "legalNotice",
      "privacy",
      "terms",
    ]);
  });

  it("todas las claves legales existen en ROUTES", () => {
    for (const key of LEGAL_ROUTE_KEYS) {
      expect(ROUTES).toHaveProperty(key);
      expect(typeof ROUTES[key]).toBe("string");
    }
  });
});
