import { describe, it, expect } from "vitest";
import {
  ROUTES,
  LEGAL_ROUTE_KEYS,
  LOCALES,
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
   * SIN `alternates` desde el 2026-09-13 (auditoría del sitemap para Search
   * Console, decisión del dueño). Con ellos Next emite `<xhtml:link>` entre
   * `<loc>` y `<lastmod>`, y el sitemap servido no validaba contra el esquema
   * oficial de sitemaps.org: 24 errores medidos, 0 sin ellos. El porqué
   * completo está en el docblock de `sitemap()`. La declaración de idioma no se
   * pierde: el grupo `es`/`en`/`x-default` viaja en el `<head>` de cada página
   * y lo ata `src/seo/metadata.test.ts`.
   */
  it("ninguna entrada declara alternates: el hreflang vive en el <head>, no en el sitemap", () => {
    for (const entry of sitemap()) {
      expect(
        entry.alternates,
        `${entry.url} vuelve a declarar alternates en el sitemap`,
      ).toBeUndefined();
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
   * esas páginas—. Hasta el 2026-09-13 el sitemap tenía su propia fecha y este
   * candado solo exigía que no fuera ANTERIOR a la de los documentos, así que
   * una fecha única bastaba para pasarlo: la privacidad cambió de texto en
   * septiembre y el sitemap siguió declarando el 13 de agosto con el test en
   * verde. Ahora es igualdad exacta, por página y en los dos idiomas: la
   * contraparte inglesa de un documento es el mismo documento.
   */
  it("cada página legal declara exactamente el 'updated' de su documento, en los dos idiomas", () => {
    const entries = sitemap();
    for (const key of LEGAL_ROUTE_KEYS) {
      for (const locale of LOCALES) {
        const url = absoluteUrl(routePath(key, locale));
        const entry = entries.find((candidate) => candidate.url === url);
        expect(entry?.lastModified, url).toBe(LEGAL_VERSIONS[key].updated);
      }
    }
  });

  /*
   * La constante única de antes declaraba el 2026-08-13 para las rutas
   * inglesas, que nacieron el 2026-08-18 (`1f89ec6`): una fecha de cambio
   * anterior a que la página existiera. La portada no tiene `LEGAL_VERSIONS`
   * que la ate, así que lo que se puede exigir sin inventar es que las dos
   * portadas declaren la misma fecha, que sea una fecha de calendario real y
   * que no sea anterior al nacimiento de la rama inglesa.
   */
  it("las dos portadas declaran la misma fecha real, no anterior al nacimiento de /en", () => {
    const entries = sitemap();
    const [es, en] = LOCALES.map(
      (locale) =>
        entries.find(
          (candidate) =>
            candidate.url === absoluteUrl(routePath("home", locale)),
        )?.lastModified as string,
    );

    expect(es).toBe(en);
    expect(es).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${es}T00:00:00.000Z`).toISOString().slice(0, 10)).toBe(es);
    expect(es >= "2026-08-18", `la portada declara ${es}`).toBe(true);
  });
});
