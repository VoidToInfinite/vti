import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import i18n from "@/i18n/config";
import { links } from "@/config/links";
import { Contact } from "./Contact";

/*
 * Reescritura completa (spec 2026-07-28 §7.4, mockup `#contact` L212-238):
 * la tarjeta de degradado pastel, el chip de email + CTA, y la figura con
 * anillos concéntricos sustituyen al Contact viejo (título + párrafo +
 * Button + Socials). `Socials` ya no vive aquí (se muda al footer, spec
 * §7.5) -- el test viejo que comprobaba el camino de contacto por email se
 * reescribe contra el chip/CTA reales del mockup.
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
 * regla, nunca con `getComputedStyle`). Mismo helper que ya usa
 * `Story.test.tsx`.
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

describe("Contact", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    renderWithProviders(<Contact />);
    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.contact.titleLead) &&
        accessibleName.includes(esHome.Home.contact.titleAccent),
    });
    expect(region).toHaveAccessibleName();
    expect(region).toHaveAttribute("id", "contact");
  });

  it("el h2 concatena titleLead + titleAccent exactamente, y no hay un h1 propio", () => {
    const { container } = renderWithProviders(<Contact />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    const heading = container.querySelector("h2");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(
      `${esHome.Home.contact.titleLead} ${esHome.Home.contact.titleAccent}`,
    );
  });

  it("muestra el kicker real de i18n", () => {
    renderWithProviders(<Contact />);
    expect(screen.getByText(esHome.Home.contact.kicker)).toBeInTheDocument();
  });

  it("el chip muestra el email real, y el CTA enlaza a links.email con su aria-label de i18n", () => {
    renderWithProviders(<Contact />);
    // El email del chip es texto (spec §7.4), no un enlace -- se busca por
    // contenido, no por rol.
    expect(screen.getByText(esHome.Home.contact.email)).toBeInTheDocument();

    const cta = screen.getByRole("link", {
      name: esHome.Home.contact.ctaAria,
    });
    // El href sale de `links.email` importado, no de un literal reescrito a
    // mano: si `links.ts` cambiara, este test lo detectaria.
    expect(cta).toHaveAttribute("href", links.email);
    expect(cta).toHaveTextContent(esHome.Home.contact.cta);
  });

  it("en ingles renderiza la copia inglesa, no la espanola (mitad del contrato de paridad)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Contact />);
      expect(screen.getByText(enHome.Home.contact.kicker)).toBeInTheDocument();
      expect(screen.getByText(enHome.Home.contact.email)).toBeInTheDocument();
      expect(
        screen.queryByText(esHome.Home.contact.kicker),
      ).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  it("la figura lleva alt de i18n y srcset con las dos pistas publicadas", () => {
    renderWithProviders(<Contact />);
    const figure = screen.getByAltText(esHome.Home.contact.figureAlt);

    expect(figure).toHaveAttribute("loading", "lazy");
    expect(figure).toHaveAttribute("decoding", "async");
    const srcSet = figure.getAttribute("srcset") ?? "";
    expect(srcSet).toContain("/figures/contact-waving-640.webp 640w");
    expect(srcSet).toContain("/figures/contact-waving-1024.webp 1024w");
  });

  it("los anillos concentricos son decorativos (aria-hidden) y son tres", () => {
    const { container } = renderWithProviders(<Contact />);
    const rings = container.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    // El SVG del icono del chip TAMBIEN es aria-hidden (decorativo dentro
    // de un chip con texto visible): se localiza el contenedor de anillos
    // por ser el UNICO aria-hidden con exactamente 3 hijos <div>.
    const ringContainers = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).filter((el) => el.children.length === 3);
    expect(ringContainers).toHaveLength(1);
    expect(
      Array.from(ringContainers[0].children).every(
        (child) => child.tagName === "DIV",
      ),
    ).toBe(true);
    expect(rings).toBeTruthy();
  });

  it("revela la tarjeta al intersectar (false -> true)", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;

    expect(card).toHaveAttribute("data-revealed", "false");
    act(() => trigger(true));
    expect(card).toHaveAttribute("data-revealed", "true");
  });

  it("bajo prefers-reduced-motion el reveal de la tarjeta queda forzado a su estado final, sin transicion", () => {
    // Ata el guard por TEXTO del CSS inyectado (jsdom no evalua @media).
    // Validado con el bug inyectado a proposito (lección 2026-07-27): se
    // comentó el bloque `@media (prefers-reduced-motion: reduce)` de
    // `ScCard` en `Contact.tsx` y este test pasó a fallar (la aserción
    // `toContain("prefers-reduced-motion: reduce")` no encontraba el
    // bloque); se restauró el bloque y el test volvió a verde -- ver el
    // reporte de la tarea para la salida literal de ambas corridas.
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("opacity: 1");
    expect(reduceBlock).toContain("transform: none");
  });

  it("la flotacion de la figura solo corre bajo no-preference (apagada bajo reduce por construccion)", () => {
    // Mismo patron que Story.test.tsx: la animacion se declara UNICAMENTE
    // dentro de `@media (prefers-reduced-motion: no-preference)`, asi que
    // bajo `reduce` queda apagada sin necesitar un bloque `reduce` con
    // animation explicito (el que SI existe fuerza ademas `transform: none`).
    renderWithProviders(<Contact />);
    const figure = screen.getByAltText(esHome.Home.contact.figureAlt);
    const css = cssRuleTextFor(figure);

    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("animation:");
    const topLevelRule = css.split("@media")[0];
    expect(topLevelRule).not.toContain("animation:");
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

describe("Contact en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("monta la escena Neon Galaxy (7 capas decorativas) en vez de la tarjeta/anillos/figura de claro", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(7);
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("sigue mostrando el kicker, el titulo, el cuerpo, el chip y el CTA con el mismo i18n que en claro", async () => {
    renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.contact.kicker)).toBeInTheDocument();
    });
    expect(screen.getByText(esHome.Home.contact.email)).toBeInTheDocument();
    const cta = screen.getByRole("link", {
      name: esHome.Home.contact.ctaAria,
    });
    expect(cta).toHaveAttribute("href", links.email);
  });

  it("no hay ninguna imagen con alt de i18n (la figura de claro es una capa decorativa mas aqui)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    expect(
      container.querySelector(`img[alt="${esHome.Home.contact.figureAlt}"]`),
    ).not.toBeInTheDocument();
  });
});
