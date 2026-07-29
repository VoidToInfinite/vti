import { useEffect, type ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import { act } from "@testing-library/react";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { StageProvider, useStage } from "@/motion/StageProvider";
import { HERO_CHROME_OFFSET_MS } from "@/components/sections/Hero/hero.transition";
import { Navbar } from "./Navbar";

/**
 * `StageProvider` llama a `window.matchMedia` de verdad en un efecto de
 * montaje (lee `prefers-reduced-motion`); jsdom no lo implementa. Mismo stub
 * minimo que ya usan Hero.test.tsx/hero.transition.test.tsx/
 * HeroBackdrop.test.tsx para el mismo motivo -- necesario en ESTE archivo
 * desde que `Navbar` pasa a depender de `useStage()` (tarea C4), aunque
 * ningun otro componente de este arbol lo llamara antes.
 */
function stubMatchMedia(reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/*
 * `Navbar` consume `useStage()` (tarea C4): sin un `StageProvider` en el
 * arbol, el hook lanza. `renderWithProviders` (test-utils.tsx) es un helper
 * COMPARTIDO con otros flujos y no se toca (CLAUDE.md §9): se envuelve aqui,
 * localmente, en vez de modificar su firma. `StageProvider` no necesita
 * ThemeProvider en el arbol para funcionar en los tests (deriva
 * STAGE_CHROME_DURATION_MS del token de movimiento crudo, no de
 * `useTheme()`, ver stage.ts), pero SI lo necesita para no lanzar `useStage`
 * fuera de contexto -- montarlo aqui, dentro de `renderWithProviders`,
 * reproduce el mismo orden que `app/providers.tsx` (StageProvider DENTRO de
 * ThemeProvider).
 */
function renderNavbar(): RenderResult {
  return renderWithProviders(
    <StageProvider>
      <Navbar />
    </StageProvider>,
  );
}

/**
 * Fuerza la fase de pagina a "chrome" (spec §7.4, tarea C6): monta un
 * componente sonda que llama a `markBackdropRevealed()` en su primer efecto
 * -- el mismo gancho que en produccion usa `HeroBackdrop` cuando su stack
 * pasa a "active" -- y avanza el reloj falso exactamente
 * `HERO_CHROME_OFFSET_MS`, la CONSTANTE importada que StageProvider usa para
 * programar la transicion (nunca un literal escrito a mano). Requiere
 * `vi.useFakeTimers()` activo en el test que la llama.
 */
function RevealBackdrop(): ReactElement | null {
  const { markBackdropRevealed } = useStage();
  useEffect(() => {
    markBackdropRevealed();
  }, [markBackdropRevealed]);
  return null;
}

function renderNavbarInChrome(): RenderResult {
  const result = renderWithProviders(
    <StageProvider>
      <RevealBackdrop />
      <Navbar />
    </StageProvider>,
  );
  act(() => {
    vi.advanceTimersByTime(HERO_CHROME_OFFSET_MS);
  });
  return result;
}

/** Texto CSS de todas las reglas inyectadas por styled-components, planas
 *  (incluidas las anidadas dentro de @media): mismo patron que Eye.test.tsx
 *  para leer el bloque de prefers-reduced-motion, que getComputedStyle no
 *  puede reproducir sin conducir el reloj de animaciones a mano. */
function allCssRules(): string[] {
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
  return reglas;
}

// Dispara el estado `scrolled` del hook `useScrolled(8)` igual que el resto
// de la suite (ver los `it` de arriba): mismo patron, extraido para no
// repetirlo en las cuatro combinaciones tema x scroll de mas abajo.
function scrollPast(): void {
  act(() => {
    Object.defineProperty(window, "scrollY", {
      value: 20,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("Navbar", () => {
  beforeEach(() => {
    // Restaurar scrollY al inicio de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    // ThemeProvider lee "vti-theme" de localStorage al montar: sin limpiarlo,
    // el test que lo fija a un tema contaminaria a los siguientes dentro del
    // mismo fichero (mismo razonamiento que Eye.test.tsx, necesario ahora que
    // hay tests que alternan light/dark en la misma suite).
    window.localStorage.clear();
    stubMatchMedia();
  });

  afterEach(() => {
    // Restaurar scrollY después de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("expone el landmark de navegación", () => {
    renderNavbar();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("arranca sin estado scrolled", () => {
    renderNavbar();
    expect(screen.getByRole("banner")).toHaveAttribute(
      "data-scrolled",
      "false",
    );
  });

  it("pasa a data-scrolled='true' cuando scrollY supera el offset de 8px", () => {
    renderNavbar();
    const header = screen.getByRole("banner");

    // Verificar estado inicial
    expect(header).toHaveAttribute("data-scrolled", "false");

    // Disparar scroll con scrollY > 8
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 20,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Verificar cambio de estado
    expect(header).toHaveAttribute("data-scrolled", "true");
  });

  it("vuelve a data-scrolled='false' cuando scrollY retorna a 0", () => {
    renderNavbar();
    const header = screen.getByRole("banner");

    // Subir scroll
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 20,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header).toHaveAttribute("data-scrolled", "true");

    // Volver a 0
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Verificar vuelta al estado inicial
    expect(header).toHaveAttribute("data-scrolled", "false");
  });

  it("renderiza el enlace de marca", () => {
    renderNavbar();
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("el enlace de marca incluye el atomo Logo compartido (A1)", () => {
    // Regresion: sin esta aserción, quitar <Logo size="1.5rem" /> de
    // ScBrandLink en Navbar.tsx no lo detecta ningun test (el de arriba solo
    // mira nombre accesible y href). Mismo patron ya usado en
    // Sol.test.tsx ("dibuja el atomo Logo compartido...") y en Wormhole.test.tsx.
    const { container } = renderNavbar();
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });
    const logo = brandLink.querySelector('svg[viewBox="0 7.5 500 550"]');

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("aria-hidden", "true");
    // El h1 del hero es el unico titular de la pagina; Navbar no debe aportar
    // ninguno.
    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });

  describe("el Logo (currentColor) hereda el tema de la pagina en las cuatro combinaciones tema x scroll", () => {
    // Regresion real (documentada en task/lessons.md), corregida ahora en
    // espejo: `Navbar` forzaba `basicDarkTheme` mientras la barra era
    // transparente, razonando que el hero era negro en los dos temas. Con la
    // pagina en claro y la barra sin scroll ese forzado pintaba el Logo
    // (`fill: currentColor`, sin `color` propio) en BLANCO, casi invisible
    // sobre el hero, que en esa combinacion ya no es negro (hero "Aura",
    // pastel). El arreglo quita el ThemeProvider anidado: `ScBrandLink` (que
    // si fija `color: theme.semantic.text`) resuelve siempre contra el
    // ThemeProvider AMBIENTAL, asi que el Logo hereda el token de texto del
    // TEMA DE LA PAGINA, sea cual sea, y el estado de scroll deja de influir
    // en el color. La leccion es explicita: "verificar TODAS las
    // combinaciones de estado que los separan (aqui: 2 temas x 2 estados de
    // scroll), no solo el estado por defecto" -- de ahi los cuatro `it`.
    //
    // getComputedStyle, no un matcher de jest-styled-components (no esta en
    // el repo): jsdom + styled-components v6 ya resuelven las reglas
    // inyectadas via CSSOM real, mismo patron usado en el resto de la suite.
    // Contra el token importado (basicLightTheme/basicDarkTheme.semantic.text),
    // no un literal escrito a mano que pueda desincronizarse si la rampa de
    // color cambia.
    function logoColor(container: HTMLElement): string {
      const logo = container.querySelector('a svg[viewBox="0 7.5 500 550"]');
      expect(logo).not.toBeNull();
      return getComputedStyle(logo as Element).color;
    }

    it("tema claro + sin scroll: hereda el texto claro, no el blanco forzado", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderNavbar();

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "false",
      );
      expect(logoColor(container)).toBe(basicLightTheme.semantic.text);
    });

    it("tema claro + con scroll: sigue heredando el texto claro", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderNavbar();

      scrollPast();

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "true",
      );
      expect(logoColor(container)).toBe(basicLightTheme.semantic.text);
    });

    it("tema oscuro + sin scroll: hereda el texto oscuro", () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderNavbar();

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "false",
      );
      expect(logoColor(container)).toBe(basicDarkTheme.semantic.text);
    });

    it("tema oscuro + con scroll: sigue heredando el texto oscuro", () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderNavbar();

      scrollPast();

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "true",
      );
      expect(logoColor(container)).toBe(basicDarkTheme.semantic.text);
    });
  });

  it("renderiza el selector de idioma", () => {
    renderNavbar();
    // El selector de idioma se expone como botones de idioma individual
    const spanishButton = screen.getByRole("button", { name: /Español/i });
    const englishButton = screen.getByRole("button", { name: /English/i });
    expect(spanishButton).toBeInTheDocument();
    expect(englishButton).toBeInTheDocument();
  });

  it("renderiza el toggle de tema", () => {
    renderNavbar();
    // El toggle de tema se expone como un botón con aria-label
    const themeToggle = screen.getByRole("button", { name: /Cambiar a tema/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it("la marca-esquina sigue al estado de scroll, no un valor fijo", () => {
    // Test de integración: sin esto, un `visible={true}` hardcodeado por error
    // en el cableado pasaría desapercibido — los tests de EyeCornerMark lo
    // cubren aislado y los de Navbar no lo miraban.
    const { container } = renderNavbar();
    const mark = (): Element | null =>
      container.querySelector("[data-visible]");

    expect(mark()).toHaveAttribute("data-visible", "false");

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 200,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(mark()).toHaveAttribute("data-visible", "true");

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(mark()).toHaveAttribute("data-visible", "false");
  });

  describe("entrada del navbar en la carga (data-intro, tarea C4/C6)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        vi.runOnlyPendingTimers();
      });
      vi.useRealTimers();
    });

    it("arranca con data-intro='pending' mientras la fase de pagina sigue en 'backdrop'", () => {
      renderNavbar();
      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-intro",
        "pending",
      );
    });

    it("pasa a data-intro='in' cuando el fondo del hero avisa (fase 'chrome')", () => {
      renderNavbarInChrome();
      expect(screen.getByRole("banner")).toHaveAttribute("data-intro", "in");
    });

    it("sigue siendo focalizable durante el intro: opacity 0 no saca el navbar del orden de tabulacion", () => {
      // Regresion que este test previene: si el intro se hiciera con
      // `display: none`/`visibility: hidden`/`aria-hidden`, el boton
      // dejaria de ser focalizable mientras "pending" -- opacity, la unica
      // propiedad que usa el intro, no tiene ese efecto (spec: accesibilidad
      // durante opacity 0, ver el comentario de Navbar()).
      renderNavbar();
      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-intro",
        "pending",
      );

      const themeToggle = screen.getByRole("button", {
        name: /Cambiar a tema/i,
      });
      themeToggle.focus();
      expect(document.activeElement).toBe(themeToggle);
    });

    it("existe el bloque prefers-reduced-motion: reduce que fuerza visible de inmediato en los dos estados de data-intro", () => {
      renderNavbar();
      const reglas = allCssRules();

      const bloqueReduce = reglas.filter(
        (regla) =>
          regla.includes("@media (prefers-reduced-motion: reduce)") &&
          regla.includes('[data-intro="pending"]') &&
          regla.includes("opacity: 1"),
      );
      expect(bloqueReduce.length).toBeGreaterThan(0);
    });
  });

  describe("enlaces de sección (Common.Navigation, tarea Flow F/spec §7.6)", () => {
    // Los cuatro destinos SOLO existen cuando `HomeSections` los monta (gate
    // por tema, D3): en oscuro serian anclas muertas (spec D5), asi que el
    // bloque entero se desmonta con `themeName`. Se busca por `href`, no por
    // nombre accesible: en es-ES `Common.Navigation.story` y
    // `Common.Navigation.history` traducen los dos a "Historia" (mismo
    // string), asi que el nombre accesible no identifica de forma unica cual
    // de los cuatro enlaces es.
    const SECTION_HREFS = ["#story", "#journey", "#features", "#contact"];

    it("en tema claro (por defecto) los 4 enlaces de sección están presentes en el DOM", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderNavbar();

      for (const href of SECTION_HREFS) {
        expect(
          container.querySelector(`a[href="${href}"]`),
          `falta el enlace ${href}`,
        ).not.toBeNull();
      }
    });

    it("en tema oscuro ninguno de los 4 enlaces de sección se renderiza (destinos inexistentes)", () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderNavbar();

      for (const href of SECTION_HREFS) {
        expect(container.querySelector(`a[href="${href}"]`)).toBeNull();
      }
    });
  });
});
