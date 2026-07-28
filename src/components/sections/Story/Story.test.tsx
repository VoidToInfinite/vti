import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import i18n from "@/i18n/config";
import { Story } from "./Story";

/*
 * Reescritura completa (spec 2026-07-28, D3/D4): Story ya no es una
 * superficie siempre oscura con ThemeProvider/SceneLoader/costura propios --
 * es una sección de tema ambiental corriente que solo se monta en claro
 * (gate `HomeSections`, fuera de esta propiedad). Los tests viejos (contraste
 * forzado contra el póster de Three.js, costura negra, no-rerender bajo
 * scroll de `useScrollProgress`) describían un componente que ya no existe;
 * se sustituyen por los que sí describen el nuevo: título accesible,
 * copia real de i18n, figura con srcset de dos pistas, reveal por
 * intersección y el guard de reduced-motion (atado por CSS inyectado, no por
 * `getComputedStyle` -- jsdom no evalúa `@media`, lección 2026-07-27).
 */

let trigger: (isIntersecting: boolean) => void;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = (v) => cb([{ isIntersecting: v }]);
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * (lección 2026-07-27: jsdom no evalúa NINGÚN `@media`, así que un guard de
 * `prefers-reduced-motion` solo se puede atar inspeccionando el TEXTO de la
 * regla, nunca con `getComputedStyle`).
 */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

describe("Story", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    // Misma lección que ya documentaba este archivo: buscar por el NOMBRE
    // real (i18n), no solo comprobar que existe una region cualquiera.
    renderWithProviders(<Story />);
    // El titulo real trae un <br/> entre "titleLead" y "titleAccent"
    // (mockup L78): la forma robusta de verificar el nombre REAL, sin
    // acoplarse a como el navegador concatena texto alrededor de un salto de
    // linea, es comprobar que el nombre accesible contiene las DOS mitades.
    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.story.titleLead) &&
        accessibleName.includes(esHome.Home.story.titleAccent),
    });
    expect(region).toHaveAccessibleName();
    expect(region).toHaveAttribute("id", "story");
  });

  it("tiene un h2 (jerarquia correcta bajo el h1 del hero) y ningun h1 propio", () => {
    const { container } = renderWithProviders(<Story />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("el kicker y los tres pilares muestran el texto REAL de i18n, no uno inventado", () => {
    renderWithProviders(<Story />);
    expect(screen.getByText(esHome.Home.story.kicker)).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.learn.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.learn.body),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.create.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.grow.title),
    ).toBeInTheDocument();
    // La numeracion "01 -- / 02 -- / 03 --" es del componente, no de i18n
    // (spec §7.1): se comprueba aparte, sin acoplarla a una clave de json.
    expect(screen.getByText(/^01 —/)).toBeInTheDocument();
    expect(screen.getByText(/^02 —/)).toBeInTheDocument();
    expect(screen.getByText(/^03 —/)).toBeInTheDocument();
  });

  it("en ingles renderiza la copia inglesa, no la espanola (mitad del contrato de paridad)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Story />);
      expect(screen.getByText(enHome.Home.story.kicker)).toBeInTheDocument();
      expect(
        screen.getByText(enHome.Home.story.pillars.create.body),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(esHome.Home.story.kicker),
      ).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  it("la figura lleva alt de i18n y srcset con las dos pistas publicadas", () => {
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);

    expect(figure).toHaveAttribute("loading", "lazy");
    expect(figure).toHaveAttribute("decoding", "async");
    const srcSet = figure.getAttribute("srcset") ?? "";
    expect(srcSet).toContain("/figures/story-pointing-640.webp 640w");
    expect(srcSet).toContain("/figures/story-pointing-1024.webp 1024w");
  });

  it("revela el contenido al intersectar (false -> true)", () => {
    const { container } = renderWithProviders(<Story />);
    const grid = container.querySelector("[data-revealed]") as HTMLElement;

    expect(grid).toHaveAttribute("data-revealed", "false");
    act(() => trigger(true));
    expect(grid).toHaveAttribute("data-revealed", "true");
  });

  it("bajo prefers-reduced-motion el reveal queda forzado a su estado final, sin transicion", () => {
    // Ata el guard por TEXTO del CSS inyectado (jsdom no evalua @media). Este
    // caso se validó con el bug inyectado a proposito: quitando este bloque
    // de `Story.tsx` el assert de abajo falla (ver Registro/lecciones); se
    // restauro para dejar la suite en verde.
    const { container } = renderWithProviders(<Story />);
    const grid = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(grid);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("opacity: 1");
    expect(reduceBlock).toContain("transform: none");
  });

  it("la flotacion de la figura y de la tarjeta de nota solo corren bajo no-preference (apagadas bajo reduce por construccion)", () => {
    // Patron ya usado por `ctaGlowPulse` en Hero.tsx: la animacion se declara
    // UNICAMENTE dentro de `@media (prefers-reduced-motion: no-preference)`,
    // asi que bajo `reduce` queda apagada sin necesitar un bloque `reduce`
    // explicito (no hay animacion incondicional que anular).
    renderWithProviders(<Story />);
    const figure = screen.getByAltText(esHome.Home.story.figureAlt);
    const card = screen.getByText(esHome.Home.story.note)
      .parentElement as HTMLElement;

    for (const el of [figure, card]) {
      const css = cssRuleTextFor(el);
      expect(css).toContain("prefers-reduced-motion: no-preference");
      expect(css).toContain("animation:");
      // La declaracion de nivel superior (fuera de cualquier @media) NO debe
      // traer ya una animacion incondicional -- si la trajera, "apagada bajo
      // reduce" seria falso: la unica forma de que quede apagada bajo
      // reduce es que la animacion viva EXCLUSIVAMENTE dentro del bloque
      // no-preference.
      const topLevelRule = css.split("@media")[0];
      expect(topLevelRule).not.toContain("animation:");
    }
  });
});

// Regresion 2026-07-28: GlobalStyles declara svg width 100% y el sparkle de
// la tarjeta de nota confiaba en su atributo width="20" (se estiraba al
// ancho de la tarjeta, medido 186px en navegador). Mismo candado computado
// que en Features/Journey.
describe("tamano del sparkle de la nota (reset global de svg)", () => {
  it("computa 20px por CSS, no por atributo", () => {
    renderWithProviders(<Story />);
    const card = screen.getByText(esHome.Home.story.note)
      .parentElement as HTMLElement;
    const sparkle = card.querySelector("svg") as SVGSVGElement;
    expect(getComputedStyle(sparkle).width).toBe("20px");
    expect(getComputedStyle(sparkle).height).toBe("20px");
  });
});
