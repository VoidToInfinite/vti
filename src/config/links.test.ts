import { describe, it, expect } from "vitest";
import { links } from "./links";

describe("links de CTA", () => {
  it("expone todos los destinos que el viaje necesita", () => {
    expect(Object.keys(links).sort()).toEqual([
      "discord",
      "docs",
      "email",
      "github",
      "playground",
    ]);
  });

  it("github y discord apuntan a destinos reales ya conocidos", () => {
    expect(links.github).toBe("https://github.com/voidtoinfinite");
    expect(links.discord).toBe("https://discord.gg/CuGhqdG3g3");
  });

  it("marca explícitamente los destinos aún sin confirmar", () => {
    // Protocolo de veracidad: lo desconocido se marca, no se inventa.
    expect(links.playground).toContain("por-completar");
    expect(links.docs).toContain("por-completar");
    expect(links.email).toContain("por-completar");
  });

  it("los destinos sin confirmar usan el TLD reservado example.invalid para fallar visible", () => {
    // RFC 2606: example.invalid nunca resuelve a un sitio real, así que un
    // placeholder olvidado falla de forma ruidosa en lugar de llevar al usuario
    // a un destino equivocado o real.
    expect(links.playground).toContain("example.invalid");
    expect(links.docs).toContain("example.invalid");
    expect(links.email).toContain("example.invalid");
  });
});
