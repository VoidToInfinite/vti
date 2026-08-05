import { describe, it, expect } from "vitest";
import { INTERNAL_LINK_KEYS, links } from "./links";
import { ROUTES } from "./site";

describe("links de CTA", () => {
  it("expone todos los destinos que el viaje necesita", () => {
    expect(Object.keys(links).sort()).toEqual([
      "accessibility",
      "discord",
      "docs",
      "email",
      "github",
      "guides",
      "legalNotice",
      "playground",
      "privacy",
      "terms",
    ]);
  });

  it("github, discord y email apuntan a destinos reales ya conocidos", () => {
    expect(links.github).toBe("https://github.com/voidtoinfinite");
    expect(links.discord).toBe("https://discord.gg/CuGhqdG3g3");
    expect(links.email).toBe("mailto:hello@voidtoinfinite.com");
  });

  it("playground, docs y guides apuntan al dominio de desarrollo ya confirmado", () => {
    expect(links.playground).toBe("https://dev.voidtoinfinite.com");
    expect(links.docs).toBe("https://dev.voidtoinfinite.com");
    expect(links.guides).toBe("https://dev.voidtoinfinite.com");
  });

  /*
   * Privacy, terms, accessibility y legalNotice DEJARON de ser marcadores el
   * 2026-08-04: esta entrega creó las cuatro páginas reales. Los dos tests
   * que afirmaban que contenían `por-completar` y `example.invalid` ya no
   * describen el repo, así que se sustituyen -- y NO se relajan, siguiendo
   * exactamente la doctrina que este mismo fichero fijó al sustituir los de
   * `playground`/`docs`/`guides`: se asevera el valor EXACTO, no algo
   * genérico tipo "es una ruta válida", que dejaría la puerta abierta a
   * cambiar un destino sin revisión.
   *
   * La aserción se hace contra `ROUTES`, no contra la cadena literal, porque
   * lo que hay que atar es que los dos ficheros NO PUEDAN divergir: si
   * alguien cambia el slug en `site.ts` y olvida el pie, el sitemap y los
   * enlaces apuntarían a sitios distintos sin que nada fallara. El candado
   * del valor literal de cada slug vive en `site.test.ts`, que es su dueño.
   */
  it("los cuatro legales apuntan a las rutas internas reales", () => {
    expect(links.privacy).toBe(ROUTES.privacy);
    expect(links.terms).toBe(ROUTES.terms);
    expect(links.accessibility).toBe(ROUTES.accessibility);
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
