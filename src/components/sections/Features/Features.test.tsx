import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Features } from "./Features";
import { FEATURE_KEYS } from "./features.layers";
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

const BULLET_KEYS = ["one", "two", "three", "four"] as const;

describe("Features", () => {
  it("es una region con su nombre accesible real (los tres terminos del h2, no un aria-labelledby colgando)", () => {
    // Los tres spans de color del h2 concatenan sin espacio en el .html
    // exportado del mockup (ver comentario en Features.tsx); el nombre
    // accesible real de la region debe leer las tres palabras separadas.
    renderWithProviders(<Features />);
    const expectedName = [
      esHome.Home.features.learning.title,
      esHome.Home.features.imagination.title,
      esHome.Home.features.gaming.title,
    ].join(" ");

    const region = screen.getByRole("region", { name: expectedName });
    expect(region).toHaveAccessibleName(expectedName);
    expect(region).toHaveAttribute("id", "features");
  });

  it("muestra el kicker de i18n", () => {
    renderWithProviders(<Features />);
    expect(screen.getByText(esHome.Home.features.kicker)).toBeInTheDocument();
  });

  it("las tres tarjetas muestran su titulo y su cuerpo de i18n", () => {
    renderWithProviders(<Features />);
    FEATURE_KEYS.forEach((key) => {
      const copy = esHome.Home.features[key];
      expect(
        screen.getByRole("heading", { level: 3, name: copy.title }),
      ).toBeInTheDocument();
      expect(screen.getByText(copy.body)).toBeInTheDocument();
    });
  });

  it("expone los 12 bullets (4 por tarjeta x 3 tarjetas) con su texto de i18n", () => {
    renderWithProviders(<Features />);
    let count = 0;
    FEATURE_KEYS.forEach((key) => {
      BULLET_KEYS.forEach((bulletKey) => {
        const text = esHome.Home.features[key].bullets[bulletKey];
        expect(screen.getByText(text)).toBeInTheDocument();
        count += 1;
      });
    });
    expect(count).toBe(12);
  });

  it("cada figura trae alt de i18n y srcset con las dos pistas (640/1024)", () => {
    const { container } = renderWithProviders(<Features />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(3);

    FEATURE_KEYS.forEach((key) => {
      const alt = esHome.Home.features[key].figureAlt;
      const img = images.find((el) => el.getAttribute("alt") === alt);
      expect(img).toBeDefined();
      const srcset = img?.getAttribute("srcset") ?? "";
      expect(srcset).toContain("640w");
      expect(srcset).toContain("1024w");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
    });
  });

  it("los tres CTA de texto apuntan a #contact", () => {
    renderWithProviders(<Features />);
    FEATURE_KEYS.forEach((key) => {
      const ctaText = esHome.Home.features[key].cta;
      const cta = screen.getByRole("link", {
        name: new RegExp(ctaText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      });
      expect(cta).toHaveAttribute("href", "#contact");
    });
  });

  it("el grid empieza sin revelar y pasa a revelado al intersecar", () => {
    const { container } = renderWithProviders(<Features />);
    const items = container.querySelectorAll("[data-revealed]");
    expect(items).toHaveLength(FEATURE_KEYS.length);
    items.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "false"),
    );

    act(() => trigger(true));

    const revealedItems = container.querySelectorAll("[data-revealed]");
    expect(revealedItems).toHaveLength(FEATURE_KEYS.length);
    revealedItems.forEach((item) =>
      expect(item).toHaveAttribute("data-revealed", "true"),
    );
  });

  it("escalona el transition-delay de cada tarjeta segun su indice (120ms)", () => {
    const { container } = renderWithProviders(<Features />);
    const items = Array.from(container.querySelectorAll("[data-revealed]"));
    expect(items).toHaveLength(FEATURE_KEYS.length);
    items.forEach((item, index) => {
      // jsdom SI resuelve el longhand `transition-delay` de una shorthand
      // `transition` declarada en styled-components (lección repo,
      // task/lessons.md 2026-07-25/27) -- lo que NO resuelve es ningun
      // @media, de ahi el test aparte de mas abajo.
      expect(getComputedStyle(item).transitionDelay).toBe(`${index * 120}ms`);
    });
  });

  it("paridad es/en: las claves de features existen en los dos locales", () => {
    expect(Object.keys(enHome.Home.features)).toEqual(
      Object.keys(esHome.Home.features),
    );
    FEATURE_KEYS.forEach((key) => {
      expect(Object.keys(enHome.Home.features[key].bullets)).toEqual(
        Object.keys(esHome.Home.features[key].bullets),
      );
    });
  });

  describe("guard de prefers-reduced-motion (CSS inyectado, no getComputedStyle)", () => {
    // Lección 2026-07-27 (task/lessons.md): jsdom no evalua NINGUN @media al
    // calcular estilos, asi que el guard que fuerza el estado final del
    // reveal bajo reduced-motion no se puede atar con getComputedStyle --
    // solo inspeccionando el TEXTO del bloque inyectado por
    // styled-components. Este test se validó con el bug inyectado a
    // propósito: comentando temporalmente el bloque
    // `@media (prefers-reduced-motion: reduce)` de `ScItem` en Features.tsx
    // el test se pone en rojo (falta `opacity: 1`/`transition-delay: 0ms`);
    // restaurado el bloque, vuelve a verde. Las aserciones de
    // `transition-delay: 0ms` y `opacity: 1` son el candado de regresión:
    // ningún otro bloque de reduced-motion del componente (`ScCard`, `ScCta`,
    // que solo anulan el hover) declara ninguna de las dos, así que solo el
    // guard de `ScItem` puede satisfacerlas.
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

    it("declara un bloque @media (prefers-reduced-motion: reduce) que fuerza el estado final revelado", () => {
      renderWithProviders(<Features />);
      const css = injectedCss();
      const reduceBlocks = css
        .split("@media (prefers-reduced-motion: reduce)")
        .slice(1)
        .join("\n");

      expect(reduceBlocks).toMatch(/transition:\s*none/);
      expect(reduceBlocks).toMatch(/transition-delay:\s*0ms/);
      expect(reduceBlocks).toMatch(/opacity:\s*1/);
      expect(reduceBlocks).toMatch(/transform:\s*none/);
    });
  });
});

// Regresion 2026-07-28: GlobalStyles declara svg width 100% para todo el
// sitio, y ese reset le gana la cascada al atributo width="15" del check
// (misma clase de bug que el Logo, task/lessons.md). Se asevera el estilo
// COMPUTADO, que es la capa que produce el efecto: con el bug presente jsdom
// devuelve cadena vacia (la regla del componente no existiria) y esto se pone
// rojo.
describe("tamano del icono de check (reset global de svg)", () => {
  it("computa 15px por CSS, no por atributo", () => {
    renderWithProviders(<Features />);
    const cta = document.querySelector('a[href="#contact"]');
    const bullets = cta?.previousElementSibling as HTMLElement;
    const check = bullets.querySelector("svg") as SVGSVGElement;
    expect(getComputedStyle(check).width).toBe("15px");
    expect(getComputedStyle(check).height).toBe("15px");
  });
});
