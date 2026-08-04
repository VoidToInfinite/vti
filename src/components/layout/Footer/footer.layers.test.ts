import { describe, it, expect } from "vitest";
import {
  FOOTER_DARK_BG,
  FOOTER_STARS,
  STAR_TINT_PRIMARY,
  STAR_TINT_SECONDARY,
  STAR_TINT_WHITE,
} from "./footer.layers";

/*
 * D10/D17/D18 de la spec `2026-08-03-contacto-footer-oscuro-design.md`:
 * `FOOTER_STARS` es una tabla PRECALCULADA de 24 entradas, no una muestra de
 * `Math.random()` -- ver el docblock de `footer.layers.ts` para el porqué
 * (mismatch de hidratación en un sitio con `output: 'export'`).
 */

describe("footer.layers: FOOTER_DARK_BG (D17)", () => {
  it("vale exactamente el literal del mockup (Footer animado v2.dc.html L112)", () => {
    expect(FOOTER_DARK_BG).toBe("oklch(0.055 0.01 288)");
  });
});

describe("footer.layers: FOOTER_STARS (D10 -- tabla precalculada, no Math.random)", () => {
  it("tiene exactamente 24 entradas", () => {
    expect(FOOTER_STARS).toHaveLength(24);
  });

  it("todos los top/left terminan en % y su valor numérico cae en 0-100", () => {
    for (const star of FOOTER_STARS) {
      for (const field of [star.top, star.left]) {
        expect(field.endsWith("%")).toBe(true);
        const value = Number(field.slice(0, -1));
        expect(Number.isNaN(value)).toBe(false);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("todos los size terminan en px", () => {
    for (const star of FOOTER_STARS) {
      expect(star.size.endsWith("px")).toBe(true);
    }
  });

  it("todos los tint son uno de los 3 literales exactos del mockup", () => {
    const validTints = [
      STAR_TINT_WHITE,
      STAR_TINT_SECONDARY,
      STAR_TINT_PRIMARY,
    ];
    for (const star of FOOTER_STARS) {
      expect(validTints).toContain(star.tint);
    }
  });

  it("todas las duraciones y retardos son números positivos", () => {
    for (const star of FOOTER_STARS) {
      expect(star.durationMs).toBeGreaterThan(0);
      expect(star.delayMs).toBeGreaterThan(0);
    }
  });

  it("los id son únicos", () => {
    const ids = FOOTER_STARS.map((star) => star.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada glow es null o un box-shadow con el mismo tinte a alfa 0.7", () => {
    for (const star of FOOTER_STARS) {
      if (star.glow === null) continue;
      expect(star.glow).toMatch(/^0 0 \d+px 1px oklch\(/);
      expect(star.glow).toContain("/ 0.7)");
    }
  });
});

describe("footer.layers: sin Math.random (D10)", () => {
  it("el CODIGO del módulo (fuera de comentarios) no invoca Math.random(", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "footer.layers.ts"), "utf-8");

    // El docblock del fichero SI menciona `Math.random()` en prosa -- para
    // explicar por qué esta tabla NO lo usa (D10). Un `.not.toContain` crudo
    // sobre el texto entero pondría ese propio docblock en rojo, así que se
    // despojan los comentarios primero: lo que de verdad hay que probar es
    // que el CÓDIGO no invoca `Math.random(`, no que la palabra esté ausente
    // del fichero.
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    // Sonda positiva: el docblock de arriba prueba que el fichero SI
    // contiene la cadena "Math.random" en algún sitio (en prosa) -- así que
    // el assert de abajo no pasa por vacuidad de "el fichero está vacío".
    expect(source).toContain("Math.random");
    expect(withoutComments).not.toContain("Math.random(");
  });
});
