import { describe, it, expect } from "vitest";
import {
  SITE,
  ROUTES,
  LEGAL_ROUTE_KEYS,
  LOCALES,
  absoluteUrl,
  resolveRoute,
  routePath,
} from "./site";

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

  /*
   * Las palabras de control cambian con el copy (2026-09-29): hasta la
   * reescritura de la opción B eran "imaginación" y "travesía", que ya no
   * están. La regla es la misma: las palabras acentuadas que la copia usa hoy
   * no pueden salir sin tilde, y deben seguir presentes para que la ausencia
   * no pase por vacuidad.
   */
  it("la copia pública de la home lleva los acentos correctos", () => {
    for (const [clave, valor] of Object.entries({
      homeTitle: SITE.homeTitle,
      description: SITE.description,
    })) {
      for (const falta of ["diseno", "tecnologia"]) {
        expect(
          valor.toLowerCase(),
          `${clave} contiene "${falta}" sin acentuar`,
        ).not.toContain(falta);
      }
      // Sonda positiva: si estas dos palabras dejaran de estar, los asserts
      // de ausencia de arriba pasarían por vacuidad sobre una cadena
      // cualquiera.
      expect(valor).toContain("diseño");
      expect(valor).toContain("tecnología");
    }
  });

  /*
   * Candado de VERACIDAD, no de estilo (barrido de §2 de `PRE-LAUNCH-QA.md`
   * contra el `out/` real, 2026-08-15). `SITE.description` decía "VoidToInfinite
   * es un equipo creativo" cuando la Fase 0 había decidido dos cosas
   * incompatibles con esa frase: la identidad es "proyecto creativo", y detrás
   * hay UNA persona. La entrega de la Fase 3 propagó la decisión al copy
   * visible -- voz en singular, `story.body` deja de decir "un espacio" -- pero
   * se detuvo un nivel antes de llegar a esta cadena, que es justo la que un
   * buscador enseña y la que viaja en cada vista previa compartida.
   *
   * Este test no comprueba que la frase suene bien: comprueba que no afirme
   * algo que el proyecto no puede sostener. Se ata la ausencia del sustantivo
   * problemático MÁS la presencia del que la Fase 0 fijó, porque solo con la
   * ausencia el assert pasaría por vacuidad si alguien vaciara la cadena.
   */
  it("no se presenta como un equipo: la Fase 0 fijó «proyecto creativo» y detrás hay una persona", () => {
    for (const prohibido of ["equipo", "team", "nuestro equipo", "somos"]) {
      expect(
        SITE.description.toLowerCase(),
        `SITE.description afirma "${prohibido}", y no hay equipo detrás del proyecto`,
      ).not.toContain(prohibido);
    }
    expect(SITE.description).toContain("proyecto creativo");
  });

  /*
   * §2 de `PRE-LAUNCH-QA.md` exige que la `<meta name="description">` mida
   * entre 120 y 165 caracteres, y esta cadena ES esa etiqueta. Se ata aquí
   * -- en la fuente -- y no solo en el HTML construido, para que un cambio de
   * copy salga en rojo en `pnpm test` y no dos pasos más tarde, al auditar el
   * `out/`.
   */
  it("mide entre 120 y 165 caracteres, el rango que §2 exige a la meta description", () => {
    expect(SITE.description.length).toBeGreaterThanOrEqual(120);
    expect(SITE.description.length).toBeLessThanOrEqual(165);
  });
});

describe("ROUTES", () => {
  it("expone exactamente las tres rutas públicas", () => {
    expect(Object.keys(ROUTES).sort()).toEqual([
      "home",
      "legalNotice",
      "privacy",
    ]);
  });

  /*
   * Candado de la retirada del 2026-08-08. Comparar el conjunto COMPLETO de
   * claves (arriba) ya haría fallar una reintroducción, pero no diría POR QUÉ:
   * este test nombra las dos rutas y su motivo, para que quien las devuelva
   * tenga que borrar una aserción que explica lo que está deshaciendo en vez
   * de ajustar un array. Reintroducir `/terminos` sin que el sitio contrate
   * nada, o `/accesibilidad` sin ser sujeto obligado del RD 1112/2018, es
   * exactamente lo que esta revisión retiró.
   */
  it.each(["terms", "accessibility"] as const)(
    "la ruta retirada '%s' no reaparece",
    (retirada) => {
      expect(Object.keys(ROUTES)).not.toContain(retirada);
    },
  );
});

/*
 * LAS SEIS RUTAS PÚBLICAS (2026-08-18). Este bloque recoge dos candados que
 * antes vivían dispersos y que ahora tienen un solo sitio natural, porque el
 * mapa de rutas es la única fuente de verdad de las dos:
 *
 *   - la BARRA INICIAL, que hasta esta entrega comprobaba `metadata.test.ts`
 *     ejercitando `buildMetadata({ path: "privacidad" })` para que lanzara.
 *     Ese caso dejó de ser alcanzable: quien llama pasa `routeKey` + `locale`,
 *     no una ruta escrita a mano, así que la propiedad hay que atarla aquí,
 *     sobre el mapa;
 *   - la UNICIDAD, que no existía y ahora sí importa: dos entradas con la
 *     misma ruta harían que el export escribiera un solo fichero para dos
 *     páginas, y que el grupo `hreflang` apuntara dos idiomas a la misma URL.
 */
describe("las seis rutas públicas (ROUTES_BY_LOCALE)", () => {
  const todas = LOCALES.flatMap((locale) =>
    (Object.keys(ROUTES) as (keyof typeof ROUTES)[]).map((key) => ({
      key,
      locale,
      path: routePath(key, locale),
    })),
  );

  it("hay exactamente una ruta por página y por idioma", () => {
    expect(todas).toHaveLength(6);
    expect(new Set(todas.map((r) => r.path)).size).toBe(6);
  });

  it.each(todas)(
    "$key/$locale empieza por barra y no termina en barra",
    ({ path }) => {
      expect(path.startsWith("/")).toBe(true);
      if (path !== "/") expect(path.endsWith("/")).toBe(false);
    },
  );

  /* `trailingSlash: false` hace que el export emita ficheros planos, así que
     la URL pública de `/en` es `/en` y no `/en/`. Un prefijo con barra final
     produciría `/en//privacy` al componer, y una canónica que no coincide con
     el sitemap es justo lo que un rastreador lee como contenido duplicado. */
  it.each(["privacy", "legalNotice"] as const)(
    "la ruta inglesa de %s cuelga del prefijo /en sin barra doble",
    (key) => {
      expect(
        routePath(key, "en").startsWith(`${routePath("home", "en")}/`),
      ).toBe(true);
      expect(routePath(key, "en")).not.toContain("//");
    },
  );

  /* Slugs TRADUCIDOS, no `/en/privacidad`: una URL inglesa con sustantivo
     castellano contradice el `hreflang="en"` que esa misma página declara
     (P2 medido por la crítica). */
  it.each(["privacy", "legalNotice"] as const)(
    "el slug inglés de %s no reutiliza el castellano",
    (key) => {
      expect(routePath(key, "en")).not.toContain(routePath(key, "es"));
    },
  );

  it("resolveRoute reconoce las seis, y solo esas", () => {
    for (const { key, locale, path } of todas) {
      expect(resolveRoute(path)).toEqual({ key, locale });
    }
    // Una URL rota no pertenece a ninguna: es lo que permite que el selector
    // de idioma componga el mismo destino al hornear y en el navegador.
    expect(resolveRoute("/_not-found")).toBeNull();
    expect(resolveRoute("/en/esto-no-existe")).toBeNull();
    expect(resolveRoute("")).toBeNull();
  });
});

describe("LEGAL_ROUTE_KEYS", () => {
  it("contiene las dos claves legales que quedan", () => {
    expect([...LEGAL_ROUTE_KEYS].sort()).toEqual(["legalNotice", "privacy"]);
  });

  it("todas las claves legales existen en ROUTES", () => {
    for (const key of LEGAL_ROUTE_KEYS) {
      expect(ROUTES).toHaveProperty(key);
      expect(typeof ROUTES[key]).toBe("string");
    }
  });
});
