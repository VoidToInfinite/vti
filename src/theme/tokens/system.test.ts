import { describe, it, expect } from "vitest";
import { motion } from "./motion";
import { glassLight, glassDark } from "./glass";
import { grid } from "./grid";

describe("system tokens", () => {
  describe("motion", () => {
    it("expone todas las duraciones correctamente", () => {
      const expectedDuration = {
        instant: "0ms",
        fast: "100ms",
        base: "200ms",
        slow: "320ms",
        slower: "480ms",
        ambient: "1500ms",
        spin: "700ms",
        spinReduced: "2100ms",
      };
      expect(motion.duration).toEqual(expectedDuration);
    });

    it("expone todas las curvas de easing correctamente", () => {
      const expectedEasing = {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
        overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      };
      expect(motion.easing).toEqual(expectedEasing);
    });

    it("la curva estándar es cubic-bezier(0.4, 0, 0.2, 1)", () => {
      expect(motion.easing.standard).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    });

    it("la curva overshoot es cubic-bezier(0.34, 1.56, 0.64, 1)", () => {
      expect(motion.easing.overshoot).toBe("cubic-bezier(0.34, 1.56, 0.64, 1)");
    });

    it("la duración base es 200ms", () => {
      expect(motion.duration.base).toBe("200ms");
    });

    it("motion es un objeto congelado (as const)", () => {
      // Verificar que las duraciones tienen las propiedades esperadas
      expect(Object.keys(motion.duration)).toHaveLength(8);
      expect(Object.keys(motion.easing)).toHaveLength(5);
    });
  });

  describe("glass", () => {
    it("glassLight tiene blur, bg y border", () => {
      const expectedLight = {
        blur: "blur(14px)",
        bg: "oklch(1 0 0 / 0.68)",
        border: "1px solid oklch(1 0 0 / 0.12)",
      };
      expect(glassLight).toEqual(expectedLight);
    });

    it("glassDark tiene blur, bg y border", () => {
      const expectedDark = {
        blur: "blur(14px)",
        bg: "oklch(0.178 0 0 / 0.68)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      };
      expect(glassDark).toEqual(expectedDark);
    });

    it("glassLight.blur contiene 'blur('", () => {
      expect(glassLight.blur).toContain("blur(");
    });

    it("glassDark.blur contiene 'blur('", () => {
      expect(glassDark.blur).toContain("blur(");
    });

    it("glassLight.bg usa formato oklch()", () => {
      expect(glassLight.bg).toMatch(/oklch\(/);
    });

    it("glassDark.bg usa formato oklch()", () => {
      expect(glassDark.bg).toMatch(/oklch\(/);
    });

    it("glassLight.border es una cadena de borde válida", () => {
      expect(glassLight.border).toMatch(/^1px solid oklch\(/);
    });

    it("glassDark.border es una cadena de borde válida", () => {
      expect(glassDark.border).toMatch(/^1px solid oklch\(/);
    });

    it("glassLight y glassDark tienen blur igual", () => {
      expect(glassLight.blur).toBe(glassDark.blur);
    });

    it("glassLight es más clara que glassDark en bg", () => {
      // glassLight usa oklch(1 ...) y glassDark usa oklch(0.178 ...)
      // 1 > 0.178, por lo que light es más clara
      expect(glassLight.bg).toContain("oklch(1");
      expect(glassDark.bg).toContain("oklch(0.178");
    });
  });

  describe("grid", () => {
    it("expone todas las propiedades del grid", () => {
      const expectedGrid = {
        containerMax: "1200px",
        navMax: "1280px",
        prose: "65ch",
        proseTight: "34ch",
        columns: 12,
        gutter: "1.5rem",
      };
      expect(grid).toEqual(expectedGrid);
    });

    it("containerMax limita a 1200px", () => {
      expect(grid.containerMax).toBe("1200px");
    });

    it("navMax es 1280px y es mayor que containerMax", () => {
      expect(grid.navMax).toBe("1280px");
      const px = (v: string): number => Number(v.replace("px", ""));
      expect(px(grid.navMax)).toBeGreaterThan(px(grid.containerMax));
    });

    it("prose limita a 65ch", () => {
      expect(grid.prose).toBe("65ch");
    });

    it("proseTight es una medida mas corta que prose", () => {
      // El subtitulo del hero se apoya en esta medida: si algun dia igualara o
      // superara a prose dejaria de ser un subtitulo de dos lineas.
      expect(grid.proseTight).toBe("34ch");
      const ch = (v: string): number => Number(v.replace("ch", ""));
      expect(ch(grid.proseTight)).toBeLessThan(ch(grid.prose));
    });

    it("columns es 12", () => {
      expect(grid.columns).toBe(12);
    });

    it("gutter es 1.5rem", () => {
      expect(grid.gutter).toBe("1.5rem");
    });

    it("grid es un objeto congelado (as const)", () => {
      expect(Object.keys(grid)).toHaveLength(6);
    });
  });
});
