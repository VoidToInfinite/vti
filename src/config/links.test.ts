import { describe, it, expect } from "vitest";
import { links } from "./links";

describe("links de CTA", () => {
  it("expone todos los destinos que el viaje necesita", () => {
    expect(Object.keys(links).sort()).toEqual([
      "accessibility",
      "discord",
      "docs",
      "email",
      "github",
      "guides",
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

  /*
   * Playground, docs y guides DEJARON de ser marcadores el 2026-08-04: el
   * usuario los sustituyó a mano por destinos reales bajo su propio dominio
   * (`dev.voidtoinfinite.com`). Este test se actualiza en consecuencia --
   * `links.ts` lo pide literalmente en su cabecera ("Al sustituirlos,
   * actualiza también links.test.ts") -- y NO se relaja: pasa de aseverar
   * "contiene por-completar" a aseverar el valor EXACTO, que es un candado
   * igual de fuerte. Relajar la aserción a algo genérico ("es una URL
   * válida") habría dejado la puerta abierta a que un destino se cambiara
   * sin revisión, que es justo lo que el test viene a impedir.
   */
  it("playground, docs y guides apuntan al dominio de desarrollo ya confirmado", () => {
    expect(links.playground).toBe("https://dev.voidtoinfinite.com");
    expect(links.docs).toBe("https://dev.voidtoinfinite.com");
    expect(links.guides).toBe("https://dev.voidtoinfinite.com");
  });

  it("marca explícitamente los destinos aún sin confirmar", () => {
    // Protocolo de veracidad: lo desconocido se marca, no se inventa.
    expect(links.accessibility).toContain("por-completar");
    expect(links.privacy).toContain("por-completar");
    expect(links.terms).toContain("por-completar");
  });

  it("los destinos sin confirmar usan el TLD reservado example.invalid para fallar visible", () => {
    // RFC 2606: example.invalid nunca resuelve a un sitio real, así que un
    // placeholder olvidado falla de forma ruidosa en lugar de llevar al usuario
    // a un destino equivocado o real.
    expect(links.accessibility).toContain("example.invalid");
    expect(links.privacy).toContain("example.invalid");
    expect(links.terms).toContain("example.invalid");
  });

  /*
   * Candado de no-regresión que sustituye a la cobertura que los dos tests de
   * arriba perdieron al quedarse con tres claves en vez de seis: ningún
   * destino real puede colarse con el TLD reservado, y ningún marcador puede
   * quedarse sin marcar. Sin esto, añadir mañana una clave nueva con un
   * `example.invalid` olvidado no rompería nada.
   */
  it("ninguna clave mezcla los dos regímenes", () => {
    const pendientes = ["accessibility", "privacy", "terms"] as const;
    for (const [clave, valor] of Object.entries(links)) {
      const esPendiente = (pendientes as readonly string[]).includes(clave);
      expect(valor.includes("example.invalid")).toBe(esPendiente);
      expect(valor.includes("por-completar")).toBe(esPendiente);
    }
  });
});
