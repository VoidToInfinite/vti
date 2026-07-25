import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import styled from "styled-components";
import { EYE_SURFACE } from "@/components/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { semanticDark, semanticLight } from "@/theme/tokens/semantic";
import { Story } from "./Story";

/**
 * Casos de la lente funcional que `Story.test.tsx` no cubre (TC-K1-03,
 * TC-M2-01, TC-M1-02).
 *
 * El test existente de contraste solo prueba el arranque en tema CLARO. El
 * criterio exige los DOS temas: si alguien invirtiera la condicion del anidado
 * (por ejemplo, aplicando el tema oscuro solo cuando la pagina esta en claro),
 * la suite actual seguiria en verde.
 */

/** Sonda del tema de PAGINA: si no cambia, el caso no prueba lo que dice. */
const ScSonda = styled.div`
  background-color: ${({ theme }) => theme.data.semantic.bg};
`;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function todasLasReglas(): string[] {
  const out: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      out.push(rule.cssText);
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
  return out;
}

function reglasDe(el: HTMLElement): string[] {
  const clases = Array.from(el.classList);
  return todasLasReglas().filter((texto) =>
    clases.some((cls) => texto.includes(`.${cls}`)),
  );
}

describe("Story (lente funcional)", () => {
  it("con la pagina en tema OSCURO la copia sigue usando el texto del tema oscuro", () => {
    // `ThemeProvider` de la app lee `vti-theme` de localStorage al montar.
    window.localStorage.setItem("vti-theme", "dark");

    const { container } = renderWithProviders(
      <>
        <ScSonda data-testid="sonda-tema" />
        <Story />
      </>,
    );

    // Control: el tema de PAGINA es realmente oscuro en este caso.
    const sonda = container.querySelector(
      '[data-testid="sonda-tema"]',
    ) as HTMLElement;
    expect(getComputedStyle(sonda).backgroundColor).toBe(semanticDark.bg);

    const title = container.querySelector("#story-title") as HTMLElement;
    const body = title.nextElementSibling as HTMLElement;
    expect(getComputedStyle(title).color).toBe(semanticDark.text);
    expect(getComputedStyle(body).color).toBe(semanticDark.text);

    const section = container.querySelector("#story") as HTMLElement;
    expect(getComputedStyle(section).backgroundColor).toBe(semanticDark.bg);
  });

  it("la sonda confirma que sin preferencia guardada la pagina arranca en CLARO", () => {
    // Sin este control, el caso anterior podria estar pasando por casualidad
    // (si el tema de pagina fuera oscuro siempre).
    const { container } = renderWithProviders(<ScSonda data-testid="sonda" />);
    expect(
      getComputedStyle(
        container.querySelector('[data-testid="sonda"]') as HTMLElement,
      ).backgroundColor,
    ).toBe(semanticLight.bg);
  });

  it("el texto de Story pasa AA sobre sus tres superficies tambien con la pagina en oscuro", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const posterLightestStop = "oklch(0.35 0.142 235.851)";

    const { container } = renderWithProviders(<Story />);
    const color = getComputedStyle(
      container.querySelector("#story-title") as HTMLElement,
    ).color;

    expect(contrastRatio(color, semanticDark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color, EYE_SURFACE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color, posterLightestStop)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("bajo prefers-reduced-motion el contenido queda visible y sin transicion", () => {
    const { container } = renderWithProviders(<Story />);
    const contenido = (container.querySelector("#story-title") as HTMLElement)
      .parentElement as HTMLElement;

    const reduce = reglasDe(contenido).filter((texto) =>
      texto.includes("prefers-reduced-motion: reduce"),
    );
    expect(reduce.length).toBeGreaterThan(0);
    const css = reduce.join("\n");
    expect(css).toContain("transition: none");
    expect(css).toContain("opacity: 1");
    expect(css).toContain("transform: none");
  });

  it("la costura es CSS estatico: ni transicion ni animacion", () => {
    const { container } = renderWithProviders(<Story />);
    const css = reglasDe(
      container.querySelector(
        '[data-testid="story-continuity"]',
      ) as HTMLElement,
    ).join("\n");

    expect(css).not.toContain("transition");
    expect(css).not.toContain("animation");
  });
});
