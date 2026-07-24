import { describe, it, expect } from "vitest";
import { color, STEPS } from "./color";

describe("color primitives", () => {
  it("cada hue tiene los 12 pasos como oklch()", () => {
    for (const ramp of Object.values(color)) {
      expect(Object.keys(ramp).map(Number)).toEqual([...STEPS]);
      for (const v of Object.values(ramp)) expect(v).toMatch(/^oklch\(/);
    }
  });
  it("la luminosidad decrece de 50 a 1100", () => {
    const l = (s: string) => Number(s.slice(6).split(" ")[0]);
    expect(l(color.primary[50])).toBeGreaterThan(l(color.primary[1100]));
  });
});
