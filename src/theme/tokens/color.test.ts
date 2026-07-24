import { describe, it, expect } from "vitest";
import { color, STEPS } from "./color";

// Parser para extraer componentes de oklch(L C H)
function parseOklch(s: string): { l: number; c: number; h: number } {
  const match = s.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+)\)$/);
  if (!match) throw new Error(`Formato oklch inválido: ${s}`);
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

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

  it("escalera de luminosidad es exacta en todos los pasos", () => {
    const expectedL = [
      0.985, 0.96, 0.92, 0.86, 0.78, 0.737, 0.66, 0.58, 0.5, 0.42, 0.32,
      0.22,
    ];

    // Verifica en primary
    STEPS.forEach((step, i) => {
      const parsed = parseOklch(color.primary[step]);
      expect(parsed.l).toBe(expectedL[i]);
    });

    // Verifica en neutral (comparten escalera)
    STEPS.forEach((step, i) => {
      const parsed = parseOklch(color.neutral[step]);
      expect(parsed.l).toBe(expectedL[i]);
    });
  });

  it("cada rampa de hue usa su ancla en todos los pasos", () => {
    const hues: Record<
      keyof typeof color,
      number | { value: number; neutral: boolean }
    > = {
      primary: 235.851,
      secondary: 311.928,
      success: 140,
      warning: 70,
      error: 12,
      neutral: 286,
    };

    for (const [rampName, expectedHue] of Object.entries(hues)) {
      const ramp = color[rampName as keyof typeof color];
      STEPS.forEach((step) => {
        const parsed = parseOklch(ramp[step]);
        const hueValue =
          typeof expectedHue === "number" ? expectedHue : expectedHue.value;
        expect(parsed.h).toBe(hueValue);
      });
    }
  });

  it("croma en paso 500 es exactamente el pico para cada rampa de hue", () => {
    const peakChromas: Record<string, number> = {
      primary: 0.158,
      secondary: 0.259,
      success: 0.17,
      warning: 0.16,
      error: 0.24,
    };

    for (const [rampName, expectedPeakChroma] of Object.entries(peakChromas)) {
      const ramp = color[rampName as keyof typeof color];
      const parsed = parseOklch(ramp[500]);
      expect(parsed.c).toBe(expectedPeakChroma);
    }
  });

  it("croma en paso 500 es el máximo de la rampa", () => {
    const peakChromas: Record<string, number> = {
      primary: 0.158,
      secondary: 0.259,
      success: 0.17,
      warning: 0.16,
      error: 0.24,
    };

    for (const [rampName] of Object.entries(peakChromas)) {
      const ramp = color[rampName as keyof typeof color];
      const cromas = STEPS.map((step) => parseOklch(ramp[step]).c);
      const maxChroma = Math.max(...cromas);
      const peak500Chroma = parseOklch(ramp[500]).c;
      expect(peak500Chroma).toBe(maxChroma);
    }
  });
});
