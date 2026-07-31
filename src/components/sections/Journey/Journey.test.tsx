import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { Journey } from "./Journey";
import { JOURNEY_STEPS, JOURNEY_PATH_VIEWBOX } from "./journey.layers";
import enHome from "@/i18n/locales/en/home.json";
import esHome from "@/i18n/locales/es/home.json";

let trigger: (isIntersecting: boolean) => void;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = (v) => cb([{ isIntersecting: v }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

describe("Journey", () => {
  it("es una region con su nombre accesible real (aria-labelledby -> h2)", () => {
    renderWithProviders(<Journey />);
    const region = screen.getByRole("region", {
      name: esHome.Home.journey.title,
    });
    expect(region).toHaveAccessibleName(esHome.Home.journey.title);
    expect(region).toHaveAttribute("id", "journey");
  });

  it("muestra los 6 pasos con su label de i18n (0N · Label)", () => {
    renderWithProviders(<Journey />);
    JOURNEY_STEPS.forEach((step, index) => {
      const label = esHome.Home.journey.steps[step.id].label;
      const number = String(index + 1).padStart(2, "0");
      expect(screen.getByText(`${number} · ${label}`)).toBeInTheDocument();
      expect(
        screen.getByText(esHome.Home.journey.steps[step.id].body),
      ).toBeInTheDocument();
    });
  });

  it("la figura trae alt de i18n y srcset con las dos pistas (640/1024)", () => {
    const { container } = renderWithProviders(<Journey />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", esHome.Home.journey.figureAlt);
    const srcset = img?.getAttribute("srcset") ?? "";
    expect(srcset).toContain("640w");
    expect(srcset).toContain("1024w");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("muestra la cita final con comillas tipograficas alrededor del texto de i18n", () => {
    renderWithProviders(<Journey />);
    expect(
      screen.getByText(`“${esHome.Home.journey.quote}”`),
    ).toBeInTheDocument();
  });

  it("el contenedor de pasos empieza sin revelar y pasa a revelado al intersecar", () => {
    const { container } = renderWithProviders(<Journey />);
    const items = container.querySelectorAll("[data-revealed]");
    expect(items.length).toBe(JOURNEY_STEPS.length);
    items.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "false"),
    );

    act(() => trigger(true));

    const revealedItems = container.querySelectorAll("[data-revealed]");
    revealedItems.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "true"),
    );
  });

  it("escalona el transition-delay de cada paso segun su indice (~90ms)", () => {
    const { container } = renderWithProviders(<Journey />);
    const items = Array.from(container.querySelectorAll("[data-revealed]"));
    expect(items).toHaveLength(JOURNEY_STEPS.length);
    items.forEach((item, index) => {
      const delay = getComputedStyle(item).transitionDelay;
      // jsdom SI resuelve longhands (transition-delay) de una propiedad
      // shorthand (transition) declarada en styled-components -- NUNCA
      // aseverar animationName de una shorthand (lección repo, task/lessons.md
      // 2026-07-27: jsdom no evalua @media, pero longhands de shorthand no
      // media si se resuelven). Medido: jsdom devuelve el literal declarado
      // ("Nms"), no lo normaliza a segundos.
      expect(delay).toBe(`${index * 90}ms`);
    });
  });

  it("paridad es/en: las claves de journey existen en los dos locales", () => {
    expect(Object.keys(enHome.Home.journey.steps)).toEqual(
      Object.keys(esHome.Home.journey.steps),
    );
    JOURNEY_STEPS.forEach((step) => {
      expect(enHome.Home.journey.steps).toHaveProperty(step.id);
    });
  });

  describe("guard de prefers-reduced-motion (CSS inyectado, no getComputedStyle)", () => {
    // Lección 2026-07-27 (task/lessons.md): jsdom no evalua NINGUN @media al
    // calcular estilos, asi que un guard de reduced-motion no se puede atar
    // con getComputedStyle -- solo inspeccionando el TEXTO del bloque
    // inyectado por styled-components. Se valida el test con el bug
    // inyectado a proposito (ver el test siguiente: sin el selector, este
    // test se pone rojo).
    function injectedCss(): string {
      return Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((rule) => rule.cssText);
          } catch {
            return [];
          }
        })
        .join("\n");
    }

    it("declara un bloque @media (prefers-reduced-motion: reduce) que fuerza el estado final del paso", () => {
      renderWithProviders(<Journey />);
      const css = injectedCss();
      const reduceBlock = css
        .split("@media (prefers-reduced-motion: reduce)")
        .slice(1)
        .join("\n");
      expect(reduceBlock).toMatch(/transition:\s*none/);
      expect(reduceBlock).toMatch(/opacity:\s*1/);
      expect(reduceBlock).toMatch(/transform:\s*none/);
    });
  });
});

// Regresion 2026-07-28: GlobalStyles declara svg width 100% y el icono de
// cada paso confiaba en su atributo width="22" (perdia la cascada y se
// estiraba al ancho del disco, medido 54px en navegador). La regla correcta
// vive en ScDisc como selector hijo (& > svg); se asevera el estilo computado
// del icono, que es donde el bug se manifiesta.
describe("tamano del icono de paso (reset global de svg)", () => {
  it("computa 22px por CSS via la regla del disco", () => {
    renderWithProviders(<Journey />);
    const icon = [...document.querySelectorAll("svg")].find(
      (s) => s.getAttribute("viewBox") === "0 0 24 24",
    ) as SVGSVGElement;
    expect(getComputedStyle(icon).width).toBe("22px");
    expect(getComputedStyle(icon).height).toBe("22px");
  });
});

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

describe("Journey en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("monta la escena Astral Pathway (5 capas decorativas) en vez de la tarjeta/camino/figura de claro", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(5);
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("sigue mostrando el kicker, el titulo, los 6 pasos y la cita con el mismo i18n que en claro", async () => {
    renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.journey.kicker)).toBeInTheDocument();
    });
    JOURNEY_STEPS.forEach((step, index) => {
      const label = esHome.Home.journey.steps[step.id].label;
      const number = String(index + 1).padStart(2, "0");
      expect(screen.getByText(`${number} · ${label}`)).toBeInTheDocument();
    });
    expect(
      screen.getByText(`“${esHome.Home.journey.quote}”`),
    ).toBeInTheDocument();
  });

  it("no hay ninguna imagen con alt de i18n ni el camino SVG punteado de claro", async () => {
    const { container } = renderWithProviders(<Journey />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    expect(
      container.querySelector(`img[alt="${esHome.Home.journey.figureAlt}"]`),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(`svg[viewBox="${JOURNEY_PATH_VIEWBOX}"]`),
    ).not.toBeInTheDocument();
  });
});
