import { describe, it, expect } from "vitest";
import { ROUTES, LEGAL_ROUTE_KEYS, absoluteUrl } from "@/config/site";
import { LEGAL_VERSIONS } from "@/config/legal";
import sitemap, { dynamic } from "./sitemap";

describe("app/sitemap.ts — export const dynamic (H1)", () => {
  it(
    'exporta dynamic === "force-static" — sin esta línea el build de ' +
      '`output: "export"` falla (ver el comentario junto a la línea en ' +
      "sitemap.ts, con la cita literal del error de Next)",
    () => {
      expect(dynamic).toBe("force-static");
    },
  );
});

describe("sitemap()", () => {
  it("devuelve las tres rutas públicas con URL absoluta", () => {
    const entries = sitemap();
    const expectedUrls = [
      absoluteUrl(ROUTES.home),
      ...LEGAL_ROUTE_KEYS.map((key) => absoluteUrl(ROUTES[key])),
    ];

    expect(entries.map((entry) => entry.url).sort()).toEqual(
      [...expectedUrls].sort(),
    );
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\//);
    }
  });

  it("la home tiene prioridad mayor que las páginas legales", () => {
    const entries = sitemap();
    const home = entries.find(
      (entry) => entry.url === absoluteUrl(ROUTES.home),
    );
    const legales = entries.filter(
      (entry) => entry.url !== absoluteUrl(ROUTES.home),
    );
    expect(home?.priority).toBeDefined();
    for (const legal of legales) {
      expect(legal.priority).toBeLessThan(home?.priority ?? 0);
    }
  });

  it(
    "dos llamadas seguidas devuelven el mismo lastModified (no usa new Date() " +
      "en tiempo de ejecución — decisión atada por este test)",
    () => {
      const primera = sitemap();
      const segunda = sitemap();
      expect(primera[0]?.lastModified).toBe(segunda[0]?.lastModified);
      expect(typeof primera[0]?.lastModified).toBe("string");
    },
  );

  /*
   * El `lastModified` del sitemap y el `updated` de los documentos legales
   * describen el mismo hecho —cuándo cambió por última vez el contenido de
   * esas páginas— y hasta la revisión del 2026-08-08 podían divergir en
   * silencio: el sitemap seguía anunciando el 2026-08-05 con los dos
   * documentos ya reescritos. Un rastreador usa esa fecha para decidir si
   * vuelve a leer la página; si miente hacia atrás, no vuelve.
   */
  it("el lastModified del sitemap no es anterior al 'updated' de ningún documento legal", () => {
    const declarado = sitemap()[0]?.lastModified as string;
    for (const key of LEGAL_ROUTE_KEYS) {
      expect(
        declarado >= LEGAL_VERSIONS[key].updated,
        `el sitemap declara ${declarado}, anterior al ${LEGAL_VERSIONS[key].updated} de '${key}'`,
      ).toBe(true);
    }
  });
});
