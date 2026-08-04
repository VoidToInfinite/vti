import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "./ThemeToggle";

// ThemeProvider lee "vti-theme" de localStorage al montar (ver
// ThemeProvider.tsx) — mismo patrón ya usado por Eye.test.tsx/Story.qa.test.tsx
// para fijar el tema de arranque en los tests.
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe("ThemeToggle", () => {
  it("con themeName='light' muestra el icono de sol (tema activo) y ofrece pasar a oscuro", () => {
    // ThemeProvider arranca en claro por defecto, sin nada en localStorage.
    const { container } = renderWithProviders(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeInTheDocument();
    // El icono de sol es un <circle> + rayos; el de luna es un único <path>.
    expect(container.querySelector("circle")).toBeInTheDocument();
    expect(container.querySelector("path")).not.toBeInTheDocument();
  });

  it("con themeName='dark' muestra el icono de luna (tema activo) y ofrece pasar a claro", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeInTheDocument();
    expect(container.querySelector("path")).toBeInTheDocument();
    expect(container.querySelector("circle")).not.toBeInTheDocument();
  });

  it("el title coincide con el aria-label (mismo texto, misma clave i18n)", () => {
    renderWithProviders(<ThemeToggle />);
    const boton = screen.getByRole("button", { name: "Cambiar a tema oscuro" });
    expect(boton).toHaveAttribute("title", "Cambiar a tema oscuro");
  });

  it("click dispara toggleTheme: el tema activo cambia y el icono/etiqueta se invierten", () => {
    // Sin ningun elemento #hero en el documento y con scrollY/innerHeight en
    // sus valores por defecto de jsdom, useThemeScrollReset degrada a
    // "en zona del hero" (ver el hook) y llama a toggleTheme de inmediato,
    // en el mismo click -- por eso este test no necesita tocar timers ni
    // simular scroll.
    const { container } = renderWithProviders(<ThemeToggle />);

    // Arranca en claro: sol + "Cambiar a tema oscuro".
    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeInTheDocument();

    act(() => {
      screen.getByRole("button").click();
    });

    // Tras el click pasa a oscuro: luna + "Cambiar a tema claro".
    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeInTheDocument();
    expect(container.querySelector("path")).toBeInTheDocument();
    expect(container.querySelector("circle")).not.toBeInTheDocument();
  });

  /*
   * D6 (spec 2026-08-04), revision 2026-08-04: fuera de la zona del hero,
   * requestThemeChange no cambia el tema de inmediato -- viaja de scroll
   * primero. El boton NO se deshabilita mientras dura ese viaje (ver el
   * docblock de ThemeToggle.tsx): un <button> nativo disabled deja de ser
   * enfocable y el navegador le arrebata el foco a quien lo activo por
   * teclado. Este test ata la CAUSA del bug que se corrigio -- el
   * componente ya no pasa `disabled` a IconButton -- y no el SINTOMA (la
   * perdida de foco), porque jsdom no reproduce el "auto-blur al
   * deshabilitar" de un navegador real (comprobado con una sonda de DOM
   * plano contra jsdom antes de escribir este test: fijar
   * `boton.disabled = true` con foco activo NO mueve `document.activeElement`
   * en este entorno). Aseverar solo "sigue con foco" habria dado el mismo
   * verde con el bug presente que sin el -- exactamente el tipo de test que
   * `task/lessons.md` (2026-07-27, jsdom + `@media`) avisa que no prueba
   * nada. El segundo aserto (`toBeDisabled()` ausente + reentrada
   * bloqueada) es el que protege de verdad la regla: la ausencia del
   * atributo es la causa comprobable, y que un segundo click no dispare un
   * segundo cambio de tema demuestra que la reentrada NO dependia de ese
   * atributo para empezar -- la cubre el guard sincrono de
   * useThemeScrollReset (atado en detalle en
   * useThemeScrollReset.test.tsx). Este test cubre solo la INTEGRACION con
   * IconButton.
   */
  it("fuera de la zona del hero, el boton sigue enfocable (sin disabled) durante el viaje, y un segundo clic no dispara un segundo cambio de tema", () => {
    Object.defineProperty(window, "scrollY", {
      value: 5000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
      configurable: true,
    });
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    // Fuera de la zona del hero, useThemeScrollReset lee
    // prefers-reduced-motion antes de decidir el viaje (ver el hook); jsdom
    // no implementa matchMedia, así que sin este stub el click lanza
    // "matchMedia is not a function" -- mismo stub mínimo que Hero.test.tsx.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    try {
      renderWithProviders(<ThemeToggle />);
      const boton = screen.getByRole("button", {
        name: "Cambiar a tema oscuro",
      });
      boton.focus();
      expect(boton).toHaveFocus();
      expect(boton).not.toBeDisabled();

      act(() => {
        boton.click();
      });

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
      // El tema TODAVIA no cambio: sigue anunciando "pasar a oscuro". El
      // boton NO se deshabilita -- sigue enfocable y sin `disabled`.
      const botonDuranteElViaje = screen.getByRole("button", {
        name: "Cambiar a tema oscuro",
      });
      expect(botonDuranteElViaje).not.toBeDisabled();
      expect(botonDuranteElViaje).toHaveFocus();

      // Segundo clic MIENTRAS el viaje sigue en marcha: no reprograma otro
      // scrollTo (la reentrada la bloquea useThemeScrollReset, no un
      // atributo `disabled` que ya no existe).
      act(() => {
        botonDuranteElViaje.click();
      });
      expect(scrollToMock).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
      ).toBeInTheDocument();

      // El scroll real ya llego arriba (revision 2026-08-04, COMPROBACION 1:
      // useThemeScrollReset descarta un `scrollend` espurio si `scrollY` no
      // es 0 -- ver su docblock -- asi que el test tiene que simular que el
      // viaje de verdad progreso antes de disparar el evento).
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event("scrollend"));
      });

      // El viaje original termina y cambia el tema UNA sola vez.
      expect(
        screen.getByRole("button", { name: "Cambiar a tema claro" }),
      ).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
      vi.unstubAllGlobals();
    }
  });

  it("tiene el area tactil minima de 44px heredada de IconButton", () => {
    renderWithProviders(<ThemeToggle />);
    const boton = screen.getByRole("button");
    const estilo = getComputedStyle(boton);
    expect(estilo.width).toBe("44px");
    expect(estilo.height).toBe("44px");
  });
});
