import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import i18n from "@/i18n/config";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import { StageProvider } from "@/motion/StageProvider";
import HomePage from "./page";

/*
 * Lente end-to-end: la pagina COMPLETA, no cada seccion por separado. Los
 * tests de Hero/Story/Journey/Features/Contact/HomeSections cuentan
 * encabezados o regiones dentro de SU contenedor, asi que ninguno puede ver
 * un segundo h1 en la pagina ni comprobar el flujo completo hero -> gate por
 * tema -> footer. Estos casos cubren ese hueco.
 *
 * REESCRITURA (spec 2026-07-28-landing-v2-secciones-design.md, D1/D2/D3,
 * tarea Flow F): la version anterior de este archivo asumia que `Story` era
 * una superficie SIEMPRE oscura (ThemeProvider anidado forzado) y que
 * `About` existia entre `Features` y `Contact`. Las dos premisas dejaron de
 * ser ciertas -- `About` se elimina (D1) y las 4 secciones de tema claro
 * (`Story`/`Journey`/`Features`/`Contact`, D2) ahora se montan o no segun el
 * tema de la PAGINA completa (`HomeSections`, D3): claro monta las 4, en
 * orden, entre el hero y el footer; oscuro no monta ninguna (el encargo del
 * usuario, spec §1, es "tema oscuro: solo hero y footer").
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
  window.localStorage.clear();
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
  window.localStorage.clear();
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

/*
 * `HomePage` monta `Navbar` y `Hero`, los dos consumidores de `useStage()`
 * (tareas C4/C5): sin un `StageProvider` en el arbol, el hook lanza.
 * `renderWithProviders` (test-utils.tsx) es un helper COMPARTIDO con otros
 * flujos y no se toca (CLAUDE.md §9): se envuelve aqui, localmente, mismo
 * patron que Navbar.test.tsx/Hero.test.tsx. Ninguno de los casos de este
 * archivo mide opacidad del navbar/copia -- el boton de idioma sigue siendo
 * clickeable en fase "backdrop" (opacity 0 no lo saca del arbol ni lo
 * deshabilita, ver el comentario de accesibilidad en Navbar.tsx) -- asi que
 * basta con el proveedor a secas, sin forzar "chrome".
 */
function renderHomePage(): RenderResult {
  return renderWithProviders(
    <StageProvider>
      <HomePage />
    </StageProvider>,
  );
}

describe("Home (pagina completa)", () => {
  it("tiene UN solo h1 en toda la pagina y precede al primer h2", () => {
    const { container } = renderHomePage();

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
    const { container } = renderHomePage();

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
    const { container } = renderHomePage();

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

  /*
   * Gate por tema (D3, tarea Flow F): CLARO es el arranque por defecto (sin
   * nada guardado en localStorage) -- `HomeSections` monta las 4 secciones
   * de tema claro, en el orden D2, entre el hero y el footer.
   */
  it("con el tema de pagina en CLARO (por defecto), se montan las 4 secciones en orden entre el hero y el footer", () => {
    const { container } = renderHomePage();

    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();

    const seccionIds = ["story", "journey", "features", "contact"];
    const secciones = seccionIds.map((id) => {
      const el = container.querySelector(`section#${id}`);
      expect(el, `falta la seccion #${id}`).not.toBeNull();
      return el as HTMLElement;
    });

    // Orden real en el documento: cada seccion sigue a la anterior, y la
    // primera sigue al h1 del hero.
    let anterior: Element = h1 as Element;
    for (const seccion of secciones) {
      expect(
        anterior.compareDocumentPosition(seccion) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      anterior = seccion;
    }

    const footer = container.querySelector("footer");
    expect(footer, "falta el footer").not.toBeNull();
    expect(
      anterior.compareDocumentPosition(footer as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /*
   * Gate por seccion (spec 2026-07-29-story-dark-cosmic-heart-design.md,
   * D2): Story ya tiene tratamiento oscuro (escena Cosmic Heart) y se monta
   * tambien en oscuro -- Journey/Features/Contact TODAVIA no lo tienen
   * (construccion seccion por seccion, encargo del usuario) y siguen sin
   * montarse. El hero y el footer siguen presentes en los dos temas (D6 del
   * spec anterior).
   */
  it("con el tema de pagina en OSCURO (real), se monta Story ademas del hero y el footer: Journey/Features/Contact aun no", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderHomePage();

    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.querySelector("section#story")).not.toBeNull();

    for (const id of ["journey", "features", "contact"]) {
      expect(
        container.querySelector(`#${id}`),
        `la seccion #${id} no deberia existir en tema oscuro todavia`,
      ).toBeNull();
    }
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
      renderHomePage();
      const botonEn = screen.getByRole("button", { name: /english/i });
      await act(async () => {
        fireEvent.click(botonEn);
      });
      expect(document.documentElement.lang).toBe("en");
    },
  );

  it("la pieza decorativa del pie del hero no entra en el orden de tabulacion", () => {
    const { container } = renderHomePage();

    const pieza = testId(container, "hero-foot");
    expect(pieza).toHaveAttribute("aria-hidden", "true");
    expect(pieza.hasAttribute("tabindex")).toBe(false);
    expect(pieza.querySelectorAll("a,button,input,[tabindex]")).toHaveLength(0);
  });
});
