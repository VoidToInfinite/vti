import { describe, it, expect } from "vitest";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import {
  FOOTER_DARK_BG,
  FOOTER_STARS,
  FOOTER_STAR_DARK_GLOW_ALPHA,
  FOOTER_STAR_DARK_POINT_ALPHA,
  FOOTER_STAR_LIGHT_ALPHA,
  FOOTER_STAR_LIGHT_GLOW_ALPHA,
  STAR_TINT_PRIMARY,
  STAR_TINT_SECONDARY,
  STAR_TINT_WHITE,
  footerStarGlow,
  footerStarTint,
} from "./footer.layers";

/*
 * D10/D17/D18 de la spec `2026-08-03-contacto-footer-oscuro-design.md`:
 * `FOOTER_STARS` es una tabla PRECALCULADA de 24 entradas, no una muestra de
 * `Math.random()` -- ver el docblock de `footer.layers.ts` para el porqué
 * (mismatch de hidratación en un sitio con `output: 'export'`).
 *
 * Desde 2026-08-07 (spec `2026-08-07-footer-beam-estrellas-tema-claro-design.md`,
 * D3/D4) la tabla guarda `tintKey`/`glowBlurPx` (datos), no `tint`/`glow`
 * (CSS ya compuesto): `footerStarTint`/`footerStarGlow` hacen la composición
 * contra el tema activo.
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

  it("todos los tintKey son una de las 3 ranuras válidas (D4)", () => {
    const validKeys = ["white", "secondary", "primary"];
    for (const star of FOOTER_STARS) {
      expect(validKeys).toContain(star.tintKey);
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

  it("cada glowBlurPx es null o un número positivo, y siguen siendo SEIS halos (D4)", () => {
    const withGlow = FOOTER_STARS.filter((star) => star.glowBlurPx !== null);
    expect(withGlow).toHaveLength(6);
    for (const star of withGlow) {
      expect(star.glowBlurPx as number).toBeGreaterThan(0);
    }
  });
});

/*
 * Candado obligatorio de D4: el cambio de forma (`tint`/`glow` ->
 * `tintKey`/`glowBlurPx` + composición en el render) no puede tocar ni un
 * byte del arte oscuro. La tabla de abajo es el ESTADO ORIGINAL de cada fila
 * (los literales `tint`/`glow` que `FOOTER_STARS` tenía antes de este
 * cambio, copiados aquí a mano desde el fichero previo a la refactorización,
 * NO derivados de `footer.layers.ts`): comparar contra un dato independiente
 * es lo que hace de este candado una prueba real y no una tautología que
 * pasaría aunque la composición se rompiera de una forma que "se explica a
 * sí misma".
 */
describe("footer.layers: candado byte a byte -- la composición OSCURA reproduce los literales originales (D4/D5)", () => {
  const ORIGINAL_DARK_ROWS: ReadonlyArray<{
    id: number;
    tint: string;
    glow: string | null;
  }> = [
    { id: 1, tint: STAR_TINT_WHITE, glow: null },
    {
      id: 2,
      tint: STAR_TINT_SECONDARY,
      glow: "0 0 10px 1px oklch(0.73 0.195 311.928 / 0.7)",
    },
    { id: 3, tint: STAR_TINT_WHITE, glow: null },
    { id: 4, tint: STAR_TINT_PRIMARY, glow: null },
    {
      id: 5,
      tint: STAR_TINT_WHITE,
      glow: "0 0 8px 1px oklch(1 0 0 / 0.7)",
    },
    { id: 6, tint: STAR_TINT_WHITE, glow: null },
    {
      id: 7,
      tint: STAR_TINT_SECONDARY,
      glow: "0 0 13px 1px oklch(0.73 0.195 311.928 / 0.7)",
    },
    { id: 8, tint: STAR_TINT_WHITE, glow: null },
    { id: 9, tint: STAR_TINT_WHITE, glow: null },
    { id: 10, tint: STAR_TINT_WHITE, glow: null },
    {
      id: 11,
      tint: STAR_TINT_PRIMARY,
      glow: "0 0 9px 1px oklch(0.8 0.117 235.851 / 0.7)",
    },
    { id: 12, tint: STAR_TINT_WHITE, glow: null },
    { id: 13, tint: STAR_TINT_WHITE, glow: null },
    { id: 14, tint: STAR_TINT_SECONDARY, glow: null },
    {
      id: 15,
      tint: STAR_TINT_WHITE,
      glow: "0 0 11px 1px oklch(1 0 0 / 0.7)",
    },
    { id: 16, tint: STAR_TINT_WHITE, glow: null },
    { id: 17, tint: STAR_TINT_WHITE, glow: null },
    { id: 18, tint: STAR_TINT_PRIMARY, glow: null },
    { id: 19, tint: STAR_TINT_WHITE, glow: null },
    { id: 20, tint: STAR_TINT_WHITE, glow: null },
    {
      id: 21,
      tint: STAR_TINT_SECONDARY,
      glow: "0 0 14px 1px oklch(0.73 0.195 311.928 / 0.7)",
    },
    { id: 22, tint: STAR_TINT_WHITE, glow: null },
    { id: 23, tint: STAR_TINT_WHITE, glow: null },
    { id: 24, tint: STAR_TINT_WHITE, glow: null },
  ];

  it("el fixture cubre las 24 filas, en el mismo orden que FOOTER_STARS", () => {
    expect(ORIGINAL_DARK_ROWS.map((row) => row.id)).toEqual(
      FOOTER_STARS.map((star) => star.id),
    );
  });

  it.each(ORIGINAL_DARK_ROWS.map((row) => [row.id, row] as const))(
    "estrella id=%s: footerStarTint/footerStarGlow en oscuro == literal original",
    (id, expected) => {
      const star = FOOTER_STARS.find((s) => s.id === id);
      if (!star) throw new Error(`no existe la estrella id=${id}`);

      expect(footerStarTint(basicDarkTheme, star.tintKey)).toBe(expected.tint);
      expect(
        footerStarGlow(basicDarkTheme, star.tintKey, star.glowBlurPx),
      ).toBe(expected.glow);
    },
  );

  it("los tres tintes oscuros VERBATIM (STAR_TINT_*) no cambiaron", () => {
    expect(STAR_TINT_WHITE).toBe("oklch(1 0 0 / 0.95)");
    expect(STAR_TINT_SECONDARY).toBe("oklch(0.73 0.195 311.928 / 0.95)");
    expect(STAR_TINT_PRIMARY).toBe("oklch(0.8 0.117 235.851 / 0.95)");
  });

  it("los alfas oscuros documentados son 0.95 (punto) y 0.7 (halo)", () => {
    expect(FOOTER_STAR_DARK_POINT_ALPHA).toBe(0.95);
    expect(FOOTER_STAR_DARK_GLOW_ALPHA).toBe(0.7);
  });
});

/*
 * Tonalidad CLARA (D3): se mide contra los TOKENS REALES de
 * `basicLightTheme.palette` (el mismo objeto que resuelve `theme.data.palette`
 * en el ThemeProvider), nunca contra un literal oklch()/color-mix() copiado a
 * mano -- si la rampa de color se recalibra, este test lo acusa en vez de
 * seguir en verde con un valor desincronizado.
 */
describe("footer.layers: tonalidad clara (D3 -- funciones derivadas de palette)", () => {
  it("alfas claros documentados: 0.8 el punto, 0.35 el halo (menores que en oscuro)", () => {
    expect(FOOTER_STAR_LIGHT_ALPHA).toBe(0.8);
    expect(FOOTER_STAR_LIGHT_GLOW_ALPHA).toBe(0.35);
  });

  it("ranura white -> neutral[500] al 80% sobre transparent", () => {
    expect(footerStarTint(basicLightTheme, "white")).toBe(
      `color-mix(in oklab, ${basicLightTheme.palette.neutral[500]} 80%, transparent)`,
    );
  });

  it("ranura secondary -> secondary[500] al 80% sobre transparent", () => {
    expect(footerStarTint(basicLightTheme, "secondary")).toBe(
      `color-mix(in oklab, ${basicLightTheme.palette.secondary[500]} 80%, transparent)`,
    );
  });

  it("ranura primary -> primary[500] al 80% sobre transparent", () => {
    expect(footerStarTint(basicLightTheme, "primary")).toBe(
      `color-mix(in oklab, ${basicLightTheme.palette.primary[500]} 80%, transparent)`,
    );
  });

  it("el halo claro usa el MISMO token que el punto, a alfa 35% (menor que el 80% del punto)", () => {
    const blurPx = 10;
    expect(footerStarGlow(basicLightTheme, "secondary", blurPx)).toBe(
      `0 0 ${blurPx}px 1px color-mix(in oklab, ${basicLightTheme.palette.secondary[500]} 35%, transparent)`,
    );
  });

  it("footerStarGlow devuelve null cuando glowBlurPx es null, en los dos temas", () => {
    expect(footerStarGlow(basicLightTheme, "white", null)).toBeNull();
    expect(footerStarGlow(basicDarkTheme, "white", null)).toBeNull();
  });

  it("footerStarTint claro y oscuro nunca coinciden para la misma ranura (son dos construcciones distintas, D1)", () => {
    for (const key of ["white", "secondary", "primary"] as const) {
      expect(footerStarTint(basicLightTheme, key)).not.toBe(
        footerStarTint(basicDarkTheme, key),
      );
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
