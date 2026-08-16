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
 *
 * ENMIENDA 2026-08-14: vuelve a haber una seccion `About` entre `Features` y
 * `Contact`, y NO es la que D1 elimino. Aquella era una declaracion de marca
 * (funcion que el tagline del pie ya cubria, motivo por el que se retiro);
 * esta es el bloque de hechos verificables de F3.3 del plan premium, que el
 * mockup no podia prever porque su encargo es posterior. El porque completo
 * vive en el docblock de `src/components/sections/About/About.tsx`. Los dos
 * casos de abajo la incluyen en su lista de secciones.
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
 * `HomePage` monta `Navbar` y `Hero`. Los dos consumian `useStage()`
 * (tareas C4/C5) hasta la revision 2026-08-11: primero Navbar/Hero pasaron
 * su intro de carga a CSS estatico (Task 10), y despues la maquina entera
 * (`useStage()`/`StageProvider`) se retiro por quedarse sin consumidores
 * reales (Task 27) -- `HeroBackdrop`, el ultimo que le avisaba, dejo de
 * hacerlo. Se renderiza `<HomePage />` directamente, sin ningun envoltorio
 * de proveedor propio de este archivo.
 */
function renderHomePage(): RenderResult {
  return renderWithProviders(<HomePage />);
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

  it("el ancla del CTA principal del hero tiene destino real en la pagina", () => {
    const { container } = renderHomePage();

    // Indice 0 (encargo 2026-08-08): el hero se queda con un solo CTA, el de
    // "Leer la historia"; el enlace al playground que ocupaba el indice 0 se
    // retiro.
    const cta = testId(container, "hero-actions").querySelectorAll("a")[0];
    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("#")).toBe(true);

    const destino = container.querySelector(href);
    expect(
      destino,
      `el ancla ${href} no resuelve a ningun elemento`,
    ).not.toBeNull();
    expect(destino?.tagName).toBe("SECTION");
  });

  it("cambiar el idioma desde la barra reescribe los dos escalones del hero", async () => {
    const { container } = renderHomePage();

    expect(testId(container, "hero-subtitle")).toHaveTextContent(
      esHome.Home.hero.subtitle,
    );

    /*
     * `hidden: true` desde la hoja de navegación móvil (Task 10, regla 40).
     * El selector de idioma de la BARRA es ahora mobile-first: su regla base
     * es `display: none` y solo vuelve dentro de `@media md` (bajo 768 px el
     * idioma vive dentro de la hoja, ver `NavSheet.tsx`). jsdom no evalúa
     * ningún `@media` (regla 36), así que computa siempre la regla base y
     * `getByRole` sin `hidden` no encuentra ese botón -- exactamente el mismo
     * peaje que `ScNavLinks` ya cobraba en `Navbar.test.tsx`. La copia que
     * vive dentro de la hoja NO añade ambigüedad: la hoja está cerrada, y un
     * subárbol con `inert` queda fuera del árbol accesible aunque se pida
     * `hidden: true`.
     */
    const botonEn = screen.getByRole("button", {
      name: /english/i,
      hidden: true,
    });
    await act(async () => {
      fireEvent.click(botonEn);
    });

    expect(testId(container, "hero-subtitle")).toHaveTextContent(
      enHome.Home.hero.subtitle,
    );
    expect(testId(container, "hero-tagline")).toHaveTextContent(
      enHome.Home.hero.tagline,
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

    const seccionIds = ["story", "journey", "features", "contact", "about"];
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
   * Las 4 secciones (spec 2026-07-30) ya tienen tratamiento oscuro propio
   * (escenas Cosmic Heart / Astral Pathway / Celestial Guide / Neon Galaxy):
   * el gate por seccion que existia mientras se construian una a una
   * (spec 2026-07-29-story-dark-cosmic-heart-design.md, D2) ya no aplica --
   * las 4 se montan SIEMPRE, en los dos temas. El hero y el footer siguen
   * presentes en los dos temas (D6 del spec anterior).
   *
   * TIMEOUT EXPLICITO (2026-08-03, spec
   * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`
   * §12): este es el render SINCRONO mas pesado de toda la suite -- la
   * pagina entera en oscuro monta las 4 escenas de parallax (31 imagenes
   * entre Story, Journey, Features y Contact), el hero, las tres tarjetas y
   * el formulario de Contacto, los dos haces de costura y el campo de
   * estrellas del footer. MEDIDO en aislamiento con la maquina descargada:
   * **3830 ms**, contra los 5000 ms que Vitest da por defecto. Ese margen del
   * 23% no sobrevive a la contencion de CPU de los workers por defecto
   * (`pnpm test` a secas), y el fallo resultante es un timeout, no una
   * asercion: no dice nada sobre el producto.
   *
   * El presupuesto de 5000 ms no lo eligio nadie para este caso: es el
   * defecto de la herramienta. Se sube a 15000 ms para que la señal del test
   * sea "las 4 secciones se montan en oscuro" y no "cuantos nucleos tenia
   * libres la maquina". Antes de subirlo se recorto lo que SI era coste
   * evitable: el campo de estrellas del footer pasaba su variacion por props
   * interpoladas, lo que generaba una clase de styled-components por
   * estrella; con propiedades personalizadas en el atributo `style` el
   * template es estatico y son 850 ms menos (ver el docblock de `ScStar` en
   * `Footer.tsx`, con la medida). El timeout es lo que queda DESPUES de esa
   * optimizacion, no en lugar de ella.
   */
  it("con el tema de pagina en OSCURO (real), se montan las 4 secciones ademas del hero y el footer", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderHomePage();

    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
    for (const id of ["story", "journey", "features", "contact", "about"]) {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
    }
  }, 15000);

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
      // `hidden: true` por el mismo motivo que en el test de arriba (Task 10).
      const botonEn = screen.getByRole("button", {
        name: /english/i,
        hidden: true,
      });
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
