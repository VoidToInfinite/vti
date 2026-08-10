import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HERO_COPY_RETURN_MS } from "@/components/sections/Hero/hero.transition";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Hero de prueba minimo (mismo `id="hero"` que busca `isInHeroZone`/
 * `willCrossfade` en useThemeScrollReset.ts), para las pruebas de Task 5 que
 * necesitan que el hook decida que SI va a haber un cruce de composiciones
 * que esperar. jsdom no hace layout real (task/lessons.md 2026-07-28): el
 * `getBoundingClientRect` se sustituye a mano.
 */
function mountHero(bottom: number): void {
  const hero = document.createElement("section");
  hero.id = "hero";
  hero.getBoundingClientRect = () => ({ bottom }) as DOMRect;
  document.body.appendChild(hero);
}

// ThemeProvider lee "vti-theme" de localStorage al montar (ver
// ThemeProvider.tsx) — mismo patrón ya usado por Eye.test.tsx/Story.qa.test.tsx
// para fijar el tema de arranque en los tests.
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
  document.getElementById("hero")?.remove();
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
    // simular scroll. Task 5: `requestThemeChange` SI lee `matchMedia` en
    // esta rama tambien ahora (para decidir `willCrossfade`/`busy`, ver el
    // hook), asi que jsdom necesita el stub aunque el viaje sea instantaneo
    // -- mismo stub minimo que Hero.test.tsx.
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
    } finally {
      vi.unstubAllGlobals();
    }
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

  /*
   * Task 5 (plan premium F1-F5): `aria-busy` cubre el viaje COMPLETO --
   * scroll (D6) MAS el cruce de composiciones del hero (HeroBackdrop.tsx),
   * que sigue en marcha un buen tramo despues de que el scroll ya termino y
   * el tema ya cambio. Se ata la AUSENCIA de `disabled` (la causa del bug de
   * foco de la leccion 2026-08-04), no la permanencia del foco como unico
   * criterio -- mismo razonamiento que el test de arriba -- pero aqui SI se
   * comprueba tambien el foco, porque el encargo lo pide explicitamente y no
   * cuesta nada adicional atarlo a la vez que `aria-busy`.
   */
  it("Task 5: aria-busy queda presente durante el viaje completo (scroll + cruce de composiciones) y se retira al asentarse; el foco permanece y disabled sigue AUSENTE", () => {
    mountHero(100); // fuera de zona: dispara el viaje de scroll Y el cruce
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
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.useFakeTimers();

    try {
      renderWithProviders(<ThemeToggle />);
      const boton = screen.getByRole("button", {
        name: "Cambiar a tema oscuro",
      });
      boton.focus();
      expect(boton).not.toHaveAttribute("aria-busy");
      // jsdom no calcula un valor inicial de `opacity` para una propiedad
      // que ninguna regla fija (a diferencia de un navegador real, que
      // resolveria el `1` inicial de la spec): el valor en reposo es cadena
      // vacia, no "1" -- comprobado con una sonda antes de escribir este
      // test. Lo que SI se afirma, en los dos extremos, es la AUSENCIA del
      // 0.65 que solo declara la regla `[aria-busy="true"]`.
      expect(getComputedStyle(boton).opacity).not.toBe("0.65");

      act(() => {
        boton.click();
      });

      // Durante el tramo de scroll: aria-busy YA presente, sin disabled, con
      // el foco intacto. El indicador visual (opacity minima, IconButton.tsx)
      // acompaña al mismo atributo que lee la CSS -- ninguna prop nueva.
      const botonEnViaje = screen.getByRole("button", {
        name: "Cambiar a tema oscuro",
      });
      expect(botonEnViaje).toHaveAttribute("aria-busy", "true");
      expect(botonEnViaje).not.toBeDisabled();
      expect(botonEnViaje).toHaveFocus();
      expect(getComputedStyle(botonEnViaje).opacity).toBe("0.65");

      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event("scrollend"));
      });

      // El scroll ya termino y el tema YA cambio (icono/etiqueta invertidos),
      // pero el cruce de composiciones del hero sigue en marcha: aria-busy NO
      // se retira todavia.
      const botonTrasElScroll = screen.getByRole("button", {
        name: "Cambiar a tema claro",
      });
      expect(botonTrasElScroll).toHaveAttribute("aria-busy", "true");
      expect(botonTrasElScroll).not.toBeDisabled();
      expect(botonTrasElScroll).toHaveFocus();

      act(() => {
        vi.advanceTimersByTime(HERO_COPY_RETURN_MS);
      });

      const botonAsentado = screen.getByRole("button", {
        name: "Cambiar a tema claro",
      });
      expect(botonAsentado).not.toHaveAttribute("aria-busy");
      expect(botonAsentado).not.toBeDisabled();
      expect(botonAsentado).toHaveFocus();
      expect(getComputedStyle(botonAsentado).opacity).not.toBe("0.65");
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
    }
  });

  it("en una pagina sin hero (legales, via LegalHeader): aria-busy se retira en el mismo tick que el tema cambia, sin esperar a un cruce inexistente", () => {
    // Sin #hero en el documento: useThemeScrollReset degrada a "en zona"
    // (scrollY/innerHeight por defecto de jsdom) y no hay ningun cruce de
    // composiciones que esperar (ver "willCrossfade" en el hook). Necesita el
    // stub de matchMedia por el mismo motivo que el primer test del archivo
    // (Task 5: `requestThemeChange` lo lee tambien en la rama instantanea).
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

      act(() => {
        boton.click();
      });

      expect(
        screen.getByRole("button", { name: "Cambiar a tema claro" }),
      ).not.toHaveAttribute("aria-busy");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
