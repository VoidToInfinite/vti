import { describe, it, expect } from "vitest";
import {
  ROUTES,
  LEGAL_ROUTE_KEYS,
  LOCALES,
  ROUTES_BY_LOCALE,
  absoluteUrl,
  routePath,
} from "@/config/site";
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
  /*
   * SEIS, no tres (2026-08-18): tres páginas × dos idiomas. El test pasa de
   * enumerar `ROUTES` a componer el producto de `LOCALES` × páginas, así que
   * un idioma nuevo entra solo en la expectativa (regla 39) y una ruta inglesa
   * que se cayera del sitemap —el defecto exacto que la crítica midió tres
   * veces: "el inglés no se indexa"— cae en rojo aquí.
   */
  it("devuelve las SEIS rutas públicas con URL absoluta", () => {
    const entries = sitemap();
    const expectedUrls = LOCALES.flatMap((locale) =>
      ["home", ...LEGAL_ROUTE_KEYS].map((key) =>
        absoluteUrl(routePath(key as keyof typeof ROUTES, locale)),
      ),
    );

    expect(entries).toHaveLength(6);
    expect(entries.map((entry) => entry.url).sort()).toEqual(
      [...expectedUrls].sort(),
    );
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\//);
    }
  });

  /*
   * Sin `alternates`, las seis URLs estarían en el sitemap pero nada diría que
   * son la MISMA página en dos idiomas -- un rastreador las trataría como seis
   * documentos sin relación, que es la mitad del hallazgo ("el inglés no se
   * marca"). Contrato CERRADO a propósito (regla 40): las tres claves, ni una
   * más ni una menos.
   */
  it("cada entrada declara sus alternativas de idioma, la propia incluida", () => {
    for (const entry of sitemap()) {
      const languages = entry.alternates?.languages;
      expect(
        languages,
        `${entry.url} no declara alternates.languages`,
      ).toBeDefined();
      expect(Object.keys(languages ?? {}).sort()).toEqual([
        "en",
        "es",
        "x-default",
      ]);
      expect(
        Object.values(languages ?? {}),
        `${entry.url} no aparece en su propio grupo de alternativas`,
      ).toContain(entry.url);
    }
  });

  it("las alternativas del sitemap coinciden exactamente con las rutas reales", () => {
    for (const key of ["home", ...LEGAL_ROUTE_KEYS] as const) {
      for (const locale of LOCALES) {
        const entry = sitemap().find(
          (candidate) => candidate.url === absoluteUrl(routePath(key, locale)),
        );
        expect(entry?.alternates?.languages).toEqual({
          "es": absoluteUrl(ROUTES_BY_LOCALE.es[key]),
          "en": absoluteUrl(ROUTES_BY_LOCALE.en[key]),
          "x-default": absoluteUrl(ROUTES_BY_LOCALE.es[key]),
        });
      }
    }
  });

  it("la portada de CADA idioma tiene prioridad mayor que sus páginas legales", () => {
    const entries = sitemap();
    const portadas = LOCALES.map((locale) =>
      absoluteUrl(routePath("home", locale)),
    );
    const homes = entries.filter((entry) => portadas.includes(entry.url));
    const legales = entries.filter((entry) => !portadas.includes(entry.url));

    expect(homes).toHaveLength(LOCALES.length);
    for (const home of homes) {
      expect(home.priority).toBeDefined();
      for (const legal of legales) {
        expect(legal.priority).toBeLessThan(home.priority ?? 0);
      }
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
