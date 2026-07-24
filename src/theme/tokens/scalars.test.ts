import { describe, it, expect } from "vitest";
import { space } from "./space";
import { radius } from "./radius";
import { elevation } from "./elevation";
import { zIndex } from "./zIndex";

describe("scalar tokens", () => {
  it("space sigue la escala base-8", () => {
    expect(space[1]).toBe("0.25rem"); // 4px
    expect(space[5]).toBe("1.5rem"); // 24px
    expect(space[9]).toBe("6rem"); // 96px
  });
  it("radius asigna la excepción del radio a círculo", () => {
    expect(radius.full).toBe("9999px");
    expect(radius.lg).toBe("0.75rem"); // 12px botón
  });
  it("elevation-0 es plano (sin sombra)", () => {
    expect(elevation[0]).toBe("none");
  });
  it("zIndex escala en orden", () => {
    expect(zIndex.stickyNav).toBeLessThan(zIndex.modal);
  });
});
