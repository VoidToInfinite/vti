import { describe, it, expect } from "vitest";
import { INTERNAL_LINK_KEYS, links } from "./links";
import { ROUTES } from "./site";

describe("links de CTA", () => {
  it("expone todos los destinos que el viaje necesita", () => {
    expect(Object.keys(links).sort()).toEqual([
      "discord",
      "email",
      "github",
      "legalNotice",
      "playground",
      "privacy",
      "sdk",
    ]);
  });

  it("github, discord y email apuntan a destinos reales ya conocidos", () => {
    expect(links.github).toBe("https://github.com/voidtoinfinite");
    expect(links.discord).toBe("https://discord.gg/CuGhqdG3g3");
    expect(links.email).toBe("mailto:hello@voidtoinfinite.com");
  });

  /*
   * `docs` y `guides` desaparecieron de la lista el 2026-08-05 junto con sus
   * dos únicos consumidores (los enlaces «Documentación» y «Guías» de la
   * columna de Recursos del pie). Las dos apuntaban a la MISMA URL que
   * `playground` y que la nueva `sdk`; el test de arriba, que compara el
   * conjunto COMPLETO de claves, es el que impide que vuelvan a colarse sin
   * que nadie lo decida.
   */
  it("playground y sdk apuntan al dominio de desarrollo ya confirmado", () => {
    expect(links.playground).toBe("https://dev.voidtoinfinite.com");
    expect(links.sdk).toBe("https://dev.voidtoinfinite.com");
  });

  /*
   * Los legales DEJARON de ser marcadores el 2026-08-05, cuando se crearon
   * las páginas reales. La aserción se hace contra `ROUTES`, no contra la
   * cadena literal, porque lo que hay que atar es que los dos ficheros NO
   * PUEDAN divergir: si alguien cambia el slug en `site.ts` y olvida el pie,
   * el sitemap y los enlaces apuntarían a sitios distintos sin que nada
   * fallara. El candado del valor literal de cada slug vive en
   * `site.test.ts`, que es su dueño.
   *
   * Son DOS desde el 2026-08-08: `terms` y `accessibility` se retiraron con
   * sus páginas. El test del conjunto completo de claves, arriba, es el que
   * impide que vuelvan a colarse sin que nadie lo decida.
   */
  it("los dos legales apuntan a las rutas internas reales", () => {
    expect(links.privacy).toBe(ROUTES.privacy);
    expect(links.legalNotice).toBe(ROUTES.legalNotice);
  });

  /*
   * Candado de no-regresión que sustituye a la cobertura que perdieron los
   * dos tests de marcadores: ya no queda ningún destino sin confirmar, así
   * que la invariante pasa a ser que NINGUNA clave puede llevar el TLD
   * reservado. Si mañana entra un destino nuevo con un `example.invalid`
   * olvidado, esto lo caza; y si entra un marcador legítimo, quien lo añada
   * tiene que venir aquí a declararlo, que es justo el punto de revisión que
   * el fichero busca.
   */
  it("no queda ningún marcador sin confirmar", () => {
    for (const [clave, valor] of Object.entries(links)) {
      expect(valor, `${clave} lleva el TLD reservado`).not.toContain(
        "example.invalid",
      );
      expect(valor, `${clave} sigue marcado como pendiente`).not.toContain(
        "por-completar",
      );
    }
  });

  /*
   * Los dos regímenes no se pueden mezclar: un destino interno que se cuele
   * con esquema `https:` se abriría como enlace externo (pestaña nueva,
   * `rel="noopener"`), y uno externo declarado como interno produciría un
   * `next/link` a una ruta que no existe. Ninguno de los dos fallos rompe
   * nada visible: los dos se ven solo al pulsar.
   */
  it("los internos empiezan por barra y los externos llevan esquema", () => {
    const internos = new Set<string>(INTERNAL_LINK_KEYS);
    for (const [clave, valor] of Object.entries(links)) {
      if (internos.has(clave)) {
        expect(valor, `${clave} deberia ser una ruta interna`).toMatch(/^\//);
      } else {
        expect(valor, `${clave} deberia ser un destino externo`).toMatch(
          /^(https:|mailto:)/,
        );
      }
    }
  });
});
