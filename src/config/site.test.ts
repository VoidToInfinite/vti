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
