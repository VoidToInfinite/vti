import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { contrastRatio } from "@/theme/tokens/contrast";
import { EYE_SURFACE } from "@/components/eye/eye.layers";
import { ScAuraFoot } from "./aura.parts";

/**
 * ScAuraFoot es la rampa violeta de la costura Hero -> Story en tema claro
 * (spec S6.4). Este archivo prueba la pieza directamente (sin montar Aura
 * entera), igual que aura.layers.test.ts prueba aura.layers.ts sin montar
 * Aura.
 */

/** Extrae las paradas oklch() de un background-image de gradiente lineal. */
function stops(backgroundImage: string): string[] {
  return backgroundImage.match(/oklch\([^)]*\)/g) ?? [];
}

/**
 * Separa una parada `oklch(L C H)` u `oklch(L C H / A)` en su color OPACO
 * (sin la barra de alfa, que `parseOklch` de contrast.ts no acepta) y su
 * alfa (1 si no declara barra).
 */
function parseStop(stop: string): { colorOnly: string; alpha: number } {
  const match = stop.match(
    /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/,
  );
  expect(match, `parada inesperada: ${stop}`).not.toBeNull();
  const [, l, c, h, a] = match as RegExpMatchArray;
  return { colorOnly: `oklch(${l} ${c} ${h})`, alpha: a ? Number(a) : 1 };
}

/**
 * Luminancia relativa WCAG de un oklch() SIN alfa, via contrastRatio contra
 * el negro puro: contrastRatio(c, negro) = (L(c) + 0.05) / 0.05, porque la
 * luminancia del negro es 0 y c siempre es igual o mas claro. Evita duplicar
 * la conversion OKLCH -> sRGB lineal que ya vive en contrast.ts (que no
 * exporta la luminancia por si sola).
 */
function luminanceOf(colorOnly: string): number {
  return contrastRatio(colorOnly, "oklch(0 0 0)") * 0.05 - 0.05;
}

function footElement(): HTMLElement {
  const { container } = renderWithProviders(<ScAuraFoot data-part="foot" />);
  return container.firstElementChild as HTMLElement;
}

describe("ScAuraFoot (rampa violeta del pie claro)", () => {
  it("es estrictamente monotona en luminancia, compuesta sobre el peor caso (fondo blanco)", () => {
    // Mismo patron que exige la leccion del velo de continuidad
    // (task/lessons.md, 2026-07-25): se calcula, no se afirma, y se compone
    // L(p) = alpha * L(color) + (1 - alpha) * L(fondo) sobre el peor caso
    // (blanco puro), no sobre las paradas literales sin componer.
    const paradas = stops(getComputedStyle(footElement()).backgroundImage);
    expect(paradas.length).toBe(4);

    const compuestas = paradas.map((stop) => {
      const { colorOnly, alpha } = parseStop(stop);
      return alpha * luminanceOf(colorOnly) + (1 - alpha) * 1;
    });

    for (let i = 1; i < compuestas.length; i += 1) {
      expect(
        compuestas[i],
        `la parada ${i} (${paradas[i]}, L=${compuestas[i].toFixed(4)}) no puede ser mas clara que la ${i - 1} (${paradas[i - 1]}, L=${compuestas[i - 1].toFixed(4)})`,
      ).toBeLessThan(compuestas[i - 1]);
    }
  });

  it("la ultima parada es exactamente EYE_SURFACE: sostiene la costura con Story", () => {
    const paradas = stops(getComputedStyle(footElement()).backgroundImage);
    expect(paradas.at(-1)).toBe(EYE_SURFACE);
  });

  it("la primera parada NO es negro transparente: es el violeta con alfa 0", () => {
    // Si la primera parada fuera `transparent` (o un oklch(0 0 0 / 0)), el
    // tramo inicial de la rampa viraria a gris en vez de partir del violeta
    // (spec S6.4, la excepcion contraria a la de Story.tsx/ScSeam).
    const paradas = stops(getComputedStyle(footElement()).backgroundImage);
    const { colorOnly, alpha } = parseStop(paradas[0]);
    expect(alpha).toBe(0);
    expect(colorOnly).toBe("oklch(0.33 0.075 285)");
  });

  it("es puramente decorativa: no captura el puntero", () => {
    expect(getComputedStyle(footElement()).pointerEvents).toBe("none");
  });
});
