import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import { semanticDark } from "@/theme/tokens/semantic";
import HomePage from "./page";

/*
 * Lente end-to-end: la pagina COMPLETA, no cada seccion por separado. Los
 * tests de Hero y de Story cuentan encabezados dentro de SU contenedor, asi
 * que ninguno puede ver un segundo h1 en la pagina ni comprobar que el ancla
 * del CTA tenga destino real. Estos casos cubren ese hueco y los dos flujos
 * de usuario que atraviesan las dos secciones a la vez: cambio de idioma y
 * cambio de tema desde la barra.
 */

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

beforeEach(() => {
  stubMatchMedia();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  // i18n es un singleton del proceso de test: sin esto el idioma se filtra
  // a los demas archivos de la suite.
  if (i18n.language !== "es") {
    await act(async () => {
      await i18n.changeLanguage("es");
    });
  }
});

function testId(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  expect(el, `falta [data-testid="${id}"]`).not.toBeNull();
  return el as HTMLElement;
}

describe("Home (pagina completa)", () => {
  it("tiene UN solo h1 en toda la pagina y precede al primer h2", () => {
    const { container } = renderWithProviders(<HomePage />);

    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/VoidToInfinite/i);

    const encabezados = Array.from(container.querySelectorAll("h1,h2"));
    expect(encabezados.length).toBeGreaterThan(1);
    expect(encabezados[0]).toBe(h1s[0]);
    expect(encabezados[1].tagName).toBe("H2");
    expect(
      h1s[0].compareDocumentPosition(encabezados[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("el ancla del CTA secundario del hero tiene destino real en la pagina", () => {
    const { container } = renderWithProviders(<HomePage />);

    const cta = testId(container, "hero-actions").querySelectorAll("a")[1];
    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("#")).toBe(true);

    const destino = container.querySelector(href);
    expect(
      destino,
      `el ancla ${href} no resuelve a ningun elemento`,
    ).not.toBeNull();
    expect(destino?.tagName).toBe("SECTION");
  });

  it("cambiar el idioma desde la barra reescribe los tres escalones del hero", async () => {
    const { container } = renderWithProviders(<HomePage />);

    expect(testId(container, "hero-kicker")).toHaveTextContent(
      esHome.Home.hero.kicker,
    );

    const botonEn = screen.getByRole("button", { name: /english/i });
    await act(async () => {
      fireEvent.click(botonEn);
    });

    expect(testId(container, "hero-kicker")).toHaveTextContent(
      enHome.Home.hero.kicker,
    );
    expect(testId(container, "hero-subtitle")).toHaveTextContent(
      enHome.Home.hero.subtitle,
    );
    expect(testId(container, "hero-support")).toHaveTextContent(
      enHome.Home.hero.support,
    );
  });

  it("cambiar el tema de pagina no devuelve la copia del hero ni la de Story al texto claro", async () => {
    const { container } = renderWithProviders(<HomePage />);

    const subtitulo = testId(container, "hero-subtitle");
    const tituloStory = container.querySelector<HTMLElement>("#story-title");
    expect(tituloStory).not.toBeNull();

    expect(getComputedStyle(subtitulo).color).toBe(semanticDark.text);
    expect(getComputedStyle(tituloStory as HTMLElement).color).toBe(
      semanticDark.text,
    );

    const toggle = screen.getByRole("button", {
      name: /oscuro|claro|dark|light/i,
    });
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(getComputedStyle(subtitulo).color).toBe(semanticDark.text);
    expect(getComputedStyle(tituloStory as HTMLElement).color).toBe(
      semanticDark.text,
    );
  });

  /*
   * BUG CONOCIDO (preexistente, ajeno a los dos objetivos de la entrega):
   * al cambiar de idioma, `document.documentElement.lang` sigue en "es"
   * aunque toda la copia pase a ingles. Es un fallo de WCAG 2.1 SC 3.1.1
   * (nivel A): el lector de pantalla sigue leyendo el texto ingles con voz
   * espanola. Verificado tambien en Chrome real sobre el export estatico.
   *
   * Se fija con it.fails a proposito: documenta el comportamiento actual sin
   * dejar la suite en rojo, y el dia que alguien sincronice el atributo lang
   * este caso empezara a fallar, obligando a convertirlo en un test normal.
   */
  it.fails(
    "BUG: cambiar de idioma NO actualiza el atributo lang del documento",
    async () => {
      renderWithProviders(<HomePage />);
      const botonEn = screen.getByRole("button", { name: /english/i });
      await act(async () => {
        fireEvent.click(botonEn);
      });
      expect(document.documentElement.lang).toBe("en");
    },
  );

  it("ninguna pieza decorativa de la junta entra en el orden de tabulacion", () => {
    const { container } = renderWithProviders(<HomePage />);

    for (const id of ["hero-foot", "story-continuity"]) {
      const pieza = testId(container, id);
      expect(pieza).toHaveAttribute("aria-hidden", "true");
      expect(pieza.hasAttribute("tabindex")).toBe(false);
      expect(pieza.querySelectorAll("a,button,input,[tabindex]")).toHaveLength(
        0,
      );
    }
  });
});
