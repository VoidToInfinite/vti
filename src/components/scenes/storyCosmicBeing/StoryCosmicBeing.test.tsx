import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { StoryCosmicBeing } from "./StoryCosmicBeing";
import { AMBIENT } from "@/motion/vocabulary";
import { STORY_COSMIC_BEING_LAYERS } from "./storyCosmicBeing.layers";

/** Texto CSS de todas las reglas inyectadas por styled-components (lección
 *  2026-07-27: jsdom no evalúa NINGÚN `@media`, así que una `animation:`
 *  dentro de uno solo se puede atar inspeccionando el TEXTO inyectado). */
function allCssText(): string {
  const reglas: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      reglas.push(rule.cssText);
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) walk(anidadas);
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return reglas.join("\n");
}

function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * jsdom no implementa IntersectionObserver, y useSceneParallax guarda su
 * bucle por visibilidad: sin este stub, el render lanza IntersectionObserver
 * is not defined. Mismo patron que StoryCosmicHeart.test.tsx. El stub no
 * dispara interseccion por si solo, que es justo lo que estos tests quieren:
 * comprueban el MARCADO de las capas, no su animacion.
 */
function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  stubMatchMedia();
  stubIntersectionObserver();
});
afterEach(() => vi.unstubAllGlobals());

describe("StoryCosmicBeing", () => {
  it("renderiza las 11 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<StoryCosmicBeing />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(STORY_COSMIC_BEING_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = STORY_COSMIC_BEING_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.src} 1280w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<StoryCosmicBeing />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });

  it("space-base se compone en blend normal; las otras diez capas en el aditivo (plus-lighter con fallback screen)", () => {
    const { container } = render(<StoryCosmicBeing />);
    const imgs = Array.from(container.querySelectorAll("img"));
    const [base, ...rest] = imgs;

    expect(base).toHaveAttribute("data-part", "space-base");
    expect(getComputedStyle(base as HTMLElement).mixBlendMode).toBe("normal");

    expect(rest).toHaveLength(10);
    rest.forEach((img) => {
      expect(getComputedStyle(img).mixBlendMode).toBe("screen");
    });
  });

  /*
   * Task 19 (motion core, punto 7 del brief -- gate F2: AMBIENT con cero
   * consumidores): heartBeat pasa de un literal (6.5s) a AMBIENT.pulseMs
   * (@/motion/vocabulary), mismo valor numérico. Validado con el bug
   * inyectado a propósito (ver informe de la tarea): revirtiendo
   * temporalmente heartBeat a 6.5s en storyCosmicBeing.parts.tsx, este test
   * se puso en rojo; restaurado, volvió a verde.
   */
  it("Task 19: el pulso del nucleo (heart-core) consume AMBIENT.pulseMs, no el literal 6.5s", () => {
    render(<StoryCosmicBeing />);
    const css = allCssText();

    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain(`${AMBIENT.pulseMs}ms ease-in-out infinite`);
    expect(css).not.toContain("6.5s");
  });
});
