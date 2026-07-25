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
});
