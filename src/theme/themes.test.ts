import { describe, it, expect } from "vitest";
import { themes } from "./themes";

describe("themes", () => {
  it("light y dark exponen los grupos de token nuevos", () => {
    for (const t of [themes.light, themes.dark]) {
      expect(t.semantic.brand).toMatch(/^oklch\(/);
      expect(t.space[5]).toBe("1.5rem");
      expect(t.motion.easing.standard).toContain("cubic-bezier");
      expect(t.type.scale.h1.size).toBe("2.5rem");
    }
  });

  it("mantiene el flag isLight correcto", () => {
    expect(themes.light.isLight).toBe(true);
    expect(themes.dark.isLight).toBe(false);
  });

  it("conserva breakPoint en ambos temas (sigue en uso fuera de theme/)", () => {
    expect(themes.light.breakPoint.md).toBe("screen and (min-width: 768px)");
    expect(themes.dark.breakPoint.md).toBe("screen and (min-width: 768px)");
  });

  /*
   * Crítica externa #14, P3: hasta el 2026-09-02 los cuatro breakpoints se
   * escribían DOS veces, byte a byte, una dentro de cada tema. `toEqual`
   * (mismos valores) no habría bastado como candado: era exactamente lo que
   * cumplían las dos copias duplicadas mientras nadie tocara una sola de
   * ellas. `toBe` exige la MISMA referencia, es decir, que el bloque viva en
   * `shared` y no pueda divergir por construcción -- el mismo criterio con el
   * que ya estaba atada `palette` justo aquí abajo.
   */
  it("los dos temas comparten la MISMA referencia de breakPoint (vive en shared, no duplicado por tema)", () => {
    expect(themes.light.breakPoint).toBe(themes.dark.breakPoint);
    expect(themes.light.breakPoint).toEqual({
      sm: "screen and (min-width: 600px)",
      md: "screen and (min-width: 768px)",
      lg: "screen and (min-width: 992px)",
      xl: "screen and (min-width: 1200px)",
    });
  });

  it("light y dark exponen exactamente el mismo conjunto de claves de nivel superior", () => {
    const lightKeys = Object.keys(themes.light).sort();
    const darkKeys = Object.keys(themes.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it("los nuevos grupos de paleta y grid son consistentes entre temas (tokens compartidos)", () => {
    expect(themes.light.palette).toBe(themes.dark.palette);
    expect(themes.light.grid).toEqual(themes.dark.grid);
    expect(themes.light.zIndex).toEqual(themes.dark.zIndex);
  });
});
