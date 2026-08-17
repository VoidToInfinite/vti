import { describe, it, expect } from "vitest";
import { space } from "./space";
import { radius } from "./radius";
import { elevation } from "./elevation";
import { zIndex } from "./zIndex";

describe("scalar tokens", () => {
  describe("space: todos los valores", () => {
    it("contiene la escala completa de espaciado", () => {
      const expectedSpace = {
        0: "0",
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.5rem",
        6: "2rem",
        7: "3rem",
        8: "4rem",
        9: "6rem",
        10: "8rem",
      };
      expect(space).toEqual(expectedSpace);
    });
  });

  describe("radius: todos los valores", () => {
    it("contiene la escala completa de bordes redondeados", () => {
      const expectedRadius = {
        "xs": "2px",
        "sm": "4px",
        "md": "8px",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
        "full": "9999px",
      };
      expect(radius).toEqual(expectedRadius);
    });
  });

  describe("elevation: todos los valores", () => {
    it("contiene la escala completa de sombras", () => {
      const expectedElevation = {
        0: "none",
        1: "0 1px 2px oklch(0 0 0 / 0.06)",
        2: "0 4px 12px oklch(0 0 0 / 0.10)",
        3: "0 12px 32px oklch(0 0 0 / 0.16)",
        4: "0 20px 48px oklch(0 0 0 / 0.20)",
      };
      expect(elevation).toEqual(expectedElevation);
    });
  });

  describe("zIndex: todos los valores", () => {
    it("contiene la escala completa de capas", () => {
      const expectedZIndex = {
        base: 0,
        raised: 10,
        stickyNav: 100,
        dropdown: 200,
        overlay: 900,
        modal: 1000,
        toast: 1100,
      };
      expect(zIndex).toEqual(expectedZIndex);
    });

    it("mantiene el orden correcto de capas", () => {
      expect(zIndex.base).toBeLessThan(zIndex.raised);
      expect(zIndex.raised).toBeLessThan(zIndex.stickyNav);
      expect(zIndex.stickyNav).toBeLessThan(zIndex.dropdown);
      expect(zIndex.dropdown).toBeLessThan(zIndex.overlay);
      expect(zIndex.overlay).toBeLessThan(zIndex.modal);
      expect(zIndex.modal).toBeLessThan(zIndex.toast);
    });
  });
});
