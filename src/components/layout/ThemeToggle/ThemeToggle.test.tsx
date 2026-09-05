import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HERO_COPY_RETURN_MS } from "@/components/sections/Hero/hero.transition";
import enCommon from "@/i18n/locales/en/common.json";
import esCommon from "@/i18n/locales/es/common.json";
import { NAVBAR_LABEL_EM } from "@/components/layout/Navbar/navbarContainer";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "./ThemeToggle";

/*
 * Etiquetas esperadas, LEÍDAS DEL MISMO JSON que consume el componente
 * (crítica externa #9, punto 5). Hasta esa entrega este archivo las escribía
 * a mano ("Cambiar a tema oscuro"), y ese literal es justo lo que el arreglo
 * cambia: el valor de las dos claves pasa de la acción sola a estado +
 * acción, para que la etiqueta deje de contradecir al icono (que muestra el
 * tema ACTIVO desde 2026-07-26). Con el valor derivado del JSON, el candado
 * sigue atando QUÉ clave usa cada estado -- que es la propiedad real -- sin
 * romperse cada vez que alguien reescriba la copia.
 */
const ETIQUETA_EN_CLARO = esCommon.Common.ThemeToggle.switchToDark;
const ETIQUETA_EN_OSCURO = esCommon.Common.ThemeToggle.switchToLight;

/**
 * Hero de prueba minimo (mismo `id="hero"` que busca `willCrossfade` en
 * useThemeScrollReset.ts), para las pruebas de Task 5 que necesitan que el
 * hook decida que SI va a haber un cruce de composiciones que esperar.
 *
 * El rect a medida NO es opcional (fix wave B, 2026-08-12): `willCrossfade`
 * dejó de conformarse con que el elemento EXISTA y ahora exige que se VEA
 * (`isElementVisible()`, umbral 0 de intersección con el viewport). jsdom no
 * hace layout, así que un elemento recién insertado devuelve un rect en
 * cero -- que es exactamente el caso "existe pero no se ve" que el hook
 * ahora descarta, y por tanto el hero de prueba dejaría de producir cruce.
 * `top: 100 / bottom: 900` lo pone dentro del viewport de 768 de jsdom,
 * mismo par que usa useThemeScrollReset.test.tsx para su rama visible.
 *
 * La versión anterior de este docblock afirmaba que "el hook solo comprueba
 * que el elemento exista, así que no hace falta un `getBoundingClientRect` a
 * medida". Era cierto entre Task 17 y la fix wave B, y dejó de serlo sin que
 * este archivo se enterara: de ahí el fallo que destapó la review de rama.
 */
function mountHero(): void {
  const hero = document.createElement("section");
  hero.id = "hero";
  hero.getBoundingClientRect = (): DOMRect =>
    ({ top: 100, bottom: 900 }) as DOMRect;
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
      screen.getByRole("button", { name: ETIQUETA_EN_CLARO }),
    ).toBeInTheDocument();
    // El icono de sol es un <circle> + rayos; el de luna es un único <path>.
    expect(container.querySelector("circle")).toBeInTheDocument();
    expect(container.querySelector("path")).not.toBeInTheDocument();
  });

  it("con themeName='dark' muestra el icono de luna (tema activo) y ofrece pasar a claro", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: ETIQUETA_EN_OSCURO }),
    ).toBeInTheDocument();
    expect(container.querySelector("path")).toBeInTheDocument();
    expect(container.querySelector("circle")).not.toBeInTheDocument();
  });

  /*
   * Crítica externa #9, punto 5 (evaluador Nielsen, H6): el icono mostraba el
   * tema ACTUAL y la etiqueta anunciaba solo la acción CONTRARIA, así que los
   * dos canales del mismo control se contradecían para quien percibe ambos.
   *
   * El arreglo NO revierte la convención del icono (decisión declarada de
   * 2026-07-26, ver el docblock de `ThemeToggle.tsx`): amplía la etiqueta para
   * que nombre primero el estado que el icono ilustra y después la acción. Lo
   * que este candado ata es exactamente eso, y no la copia palabra por
   * palabra: que el nombre accesible mencione los DOS temas y que el ACTIVO
   * -- el que dibuja el icono -- aparezca ANTES que el destino.
   *
   * Los dos términos van escritos aquí a propósito: son la parte de la copia
   * de la que depende la propiedad, y no existe ninguna clave i18n de "tema
   * claro"/"tema oscuro" sueltos de la que derivarlos. Si la copia de es
   * cambiara de palabras, este test tiene que verse y decidirse, no pasar de
   * largo.
   */
  it.each([
    ["light", "circle", "claro", "oscuro"],
    ["dark", "path", "oscuro", "claro"],
  ] as const)(
    "en tema %s la etiqueta nombra el tema activo (el que dibuja el icono) antes que el destino",
    (tema, marcaDelIcono, activo, destino) => {
      window.localStorage.setItem("vti-theme", tema);
      const { container } = renderWithProviders(<ThemeToggle />);

      const boton = screen.getByRole("button");
      const etiqueta = boton.getAttribute("aria-label") ?? "";

      // Sonda del canal visual: el icono montado es el del tema ACTIVO.
      expect(container.querySelector(marcaDelIcono)).toBeInTheDocument();

      expect(
        etiqueta.includes(activo),
        `la etiqueta no nombra el tema activo: el icono (${marcaDelIcono}) dice una cosa y el texto otra`,
      ).toBe(true);
      expect(etiqueta.includes(destino)).toBe(true);
      expect(
        etiqueta.indexOf(activo),
        "el estado tiene que leerse antes que la acción: es el orden en que el icono y el texto se perciben",
      ).toBeLessThan(etiqueta.indexOf(destino));
    },
  );

  it("el title coincide con el aria-label (mismo texto, misma clave i18n)", () => {
    renderWithProviders(<ThemeToggle />);
    const boton = screen.getByRole("button", { name: ETIQUETA_EN_CLARO });
    expect(boton).toHaveAttribute("title", ETIQUETA_EN_CLARO);
  });

  it("click dispara toggleTheme: el tema activo cambia y el icono/etiqueta se invierten", () => {
    // Sin ningun elemento #hero en el documento, useThemeScrollReset llama a
    // toggleTheme de inmediato, en el mismo click -- desde Task 17 esto ya
    // es SIEMPRE asi, con o sin #hero (el hook no vuelve a tocar scroll) --
    // por eso este test no necesita tocar timers ni simular scroll.
    // `requestThemeChange` SI lee `matchMedia` (para decidir `willCrossfade`/
    // `busy`, ver el hook), asi que jsdom necesita el stub aunque el cambio
    // sea instantaneo -- mismo stub minimo que Hero.test.tsx.
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

      // Arranca en claro: sol + la etiqueta que ofrece pasar a oscuro.
      expect(
        screen.getByRole("button", { name: ETIQUETA_EN_CLARO }),
      ).toBeInTheDocument();

      act(() => {
        screen.getByRole("button").click();
      });

      // Tras el click pasa a oscuro: luna + la etiqueta que ofrece volver a claro.
      expect(
        screen.getByRole("button", { name: ETIQUETA_EN_OSCURO }),
      ).toBeInTheDocument();
      expect(container.querySelector("path")).toBeInTheDocument();
      expect(container.querySelector("circle")).not.toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  /*
   * Task 17 (plan premium F1-F5, 2026-08-11): sustituye al test que ataba el
   * viaje de scroll de D6 ("fuera de la zona del hero, el boton sigue
   * enfocable... durante el viaje"), retirado junto con ese viaje (ver el
   * docblock de cabecera de useThemeScrollReset.ts). Lo que este test ata
   * ahora es justo lo contrario: a mitad de página, el click cambia el tema
   * EN EL SITIO, sin llamar a `scrollTo` ni mover `scrollY`, y sin tocar la
   * focalización del botón -- el criterio de "restauración (mock)" del
   * brief de Task 17, verificado a nivel de componente (el hook ya lo ata
   * con más detalle en useThemeScrollReset.test.tsx).
   */
  it("a mitad de página, el click cambia el tema en el sitio: scrollTo nunca se llama, scrollY no se toca, y el boton sigue enfocable sin disabled", () => {
    Object.defineProperty(window, "scrollY", {
      value: 5000,
      writable: true,
      configurable: true,
    });
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    // useThemeScrollReset lee prefers-reduced-motion en cada llamada (para
    // decidir `willCrossfade`/`busy`, ver el hook); jsdom no implementa
    // matchMedia, así que sin este stub el click lanza "matchMedia is not a
    // function" -- mismo stub mínimo que Hero.test.tsx.
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
        name: ETIQUETA_EN_CLARO,
      });
      boton.focus();
      expect(boton).toHaveFocus();
      expect(boton).not.toBeDisabled();

      act(() => {
        boton.click();
      });

      // El tema cambió de inmediato, en el mismo click -- sin ningún tramo
      // de scroll previo.
      expect(
        screen.getByRole("button", { name: ETIQUETA_EN_OSCURO }),
      ).toBeInTheDocument();
      expect(scrollToMock).not.toHaveBeenCalled();
      expect(window.scrollY).toBe(5000);

      const botonTrasElClick = screen.getByRole("button", {
        name: ETIQUETA_EN_OSCURO,
      });
      expect(botonTrasElClick).not.toBeDisabled();
      expect(botonTrasElClick).toHaveFocus();
    } finally {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
      vi.unstubAllGlobals();
    }
  });

  /*
   * El lado vertical se lee en `min-height` desde el frente F (2026-09-05):
   * `Button.sizeStyles` cambió `height` fijo por `min-height` con los mismos
   * tres valores, porque con la preferencia de tamaño de texto al 200 % un
   * rótulo de dos líneas se salía de la píldora (medición en el docblock de
   * `sizeStyles`, Button.tsx). El suelo táctil AA que este caso protege es el
   * mismo: 44x44.
   */
  it("tiene el area tactil minima de 44px heredada de IconButton", () => {
    renderWithProviders(<ThemeToggle />);
    const boton = screen.getByRole("button");
    const estilo = getComputedStyle(boton);
    expect(estilo.width).toBe("44px");
    expect(estilo.minHeight).toBe("44px");
  });

  /*
   * Task 5 (plan premium F1-F5), simplificado en Task 17: `aria-busy` cubre
   * el cruce de composiciones del hero (HeroBackdrop.tsx), que sigue en
   * marcha un buen tramo después de que el tema YA cambió (Task 17 retiró el
   * tramo previo de scroll, ver el docblock de cabecera de
   * useThemeScrollReset.ts -- por eso este test ya no simula scrollY ni
   * despacha "scrollend": el tema cambia en el mismo click). Se ata la
   * AUSENCIA de `disabled` (la causa del bug de foco de la lección
   * 2026-08-04), no la permanencia del foco como único criterio -- mismo
   * razonamiento que el test de arriba -- pero aquí SI se comprueba también
   * el foco, porque el encargo lo pide explícitamente y no cuesta nada
   * adicional atarlo a la vez que `aria-busy`.
   */
  it("Task 5/17: aria-busy queda presente durante el cruce de composiciones del hero y se retira al asentarse; el foco permanece y disabled sigue AUSENTE", () => {
    mountHero();
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
        name: ETIQUETA_EN_CLARO,
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

      // El tema YA cambió (icono/etiqueta invertidos) en el mismo click,
      // pero el cruce de composiciones del hero sigue en marcha: aria-busy
      // presente, sin disabled, con el foco intacto. El indicador visual
      // (opacity mínima, IconButton.tsx) acompaña al mismo atributo que lee
      // la CSS -- ninguna prop nueva.
      const botonEnCruce = screen.getByRole("button", {
        name: ETIQUETA_EN_OSCURO,
      });
      expect(botonEnCruce).toHaveAttribute("aria-busy", "true");
      expect(botonEnCruce).not.toBeDisabled();
      expect(botonEnCruce).toHaveFocus();
      expect(getComputedStyle(botonEnCruce).opacity).toBe("0.65");

      act(() => {
        vi.advanceTimersByTime(HERO_COPY_RETURN_MS);
      });

      const botonAsentado = screen.getByRole("button", {
        name: ETIQUETA_EN_OSCURO,
      });
      expect(botonAsentado).not.toHaveAttribute("aria-busy");
      expect(botonAsentado).not.toBeDisabled();
      expect(botonAsentado).toHaveFocus();
      expect(getComputedStyle(botonAsentado).opacity).not.toBe("0.65");
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  /*
   * SALIDA SIN JAVASCRIPT (crítica externa #10, hallazgo A, P1). El evaluador
   * midió con `javaScriptEnabled: false` real que este botón se pinta visible
   * y con aspecto activo mientras `data-theme` ni siquiera existe en el
   * `<html>` y `requestThemeChange` no puede correr. Se oculta con el guard de
   * `ScThemeToggleSlot`: ver su docblock (`ThemeToggle.tsx`) para el porqué de
   * ocultar en vez de avisar, y de un envoltorio propio en vez de
   * `styled(IconButton)`.
   *
   * jsdom no evalúa ningún `@media` (regla 36 de RULES.md), así que se lee
   * `document.styleSheets` acotando al bloque `@media (scripting: none)`
   * concreto, y la FORMA del selector se afirma sobre `selectorText`
   * (regla 35): tiene que apuntar al PROPIO envoltorio, no a un descendiente.
   *
   * Validado con el bug inyectado a propósito (regla 34): borrada la línea
   * `display: none` del guard de `ScThemeToggleSlot`, este bloque se pone en
   * rojo ("el conmutador de tema se sigue presentando sin JavaScript");
   * restaurada esa línea, vuelve a verde.
   */
  describe("sin JavaScript no se presenta (@media (scripting: none))", () => {
    /** Reglas de estilo declaradas DENTRO de un `@media (scripting: none)`,
     *  mismo patrón que `aura.parts.test.tsx`/`Eye.test.tsx`. */
    function reglasSinScripting(): CSSStyleRule[] {
      const out: CSSStyleRule[] = [];
      const walk = (rules: CSSRuleList, dentro: boolean): void => {
        Array.from(rules).forEach((rule) => {
          const media = (rule as CSSMediaRule).media;
          const aqui =
            dentro ||
            (media ? /scripting:\s*none/.test(media.mediaText) : false);
          const anidadas = (rule as CSSGroupingRule).cssRules;
          if (anidadas) {
            walk(anidadas, aqui);
            return;
          }
          if (aqui && (rule as CSSStyleRule).selectorText !== undefined) {
            out.push(rule as CSSStyleRule);
          }
        });
      };
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          walk(sheet.cssRules, false);
        } catch {
          /* hoja inaccesible: no aporta */
        }
      });
      return out;
    }

    it("el envoltorio del boton se retira con display: none sobre su PROPIA clase", () => {
      const { container } = renderWithProviders(<ThemeToggle />);
      const slot = container.querySelector(
        "[data-theme-toggle]",
      ) as HTMLElement;
      expect(slot, "el conmutador no monta ningun envoltorio").not.toBeNull();
      const clases = Array.from(slot.classList);

      const propias = reglasSinScripting().filter((regla) =>
        clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
      );
      expect(
        propias.length,
        "el conmutador de tema se sigue presentando sin JavaScript",
      ).toBeGreaterThan(0);

      propias.forEach((regla) => {
        // Mismo elemento, nunca un descendiente (regla 35).
        expect(regla.selectorText).not.toMatch(/\s/);
        expect(regla.style.display).toBe("none");
      });
    });

    it("CON JavaScript nada cambia: envoltorio inline-flex, sin tabindex propio, y el boton sigue siendo el mismo control de 44px", () => {
      const { container } = renderWithProviders(<ThemeToggle />);
      const slot = container.querySelector(
        "[data-theme-toggle]",
      ) as HTMLElement;
      const boton = screen.getByRole("button", { name: ETIQUETA_EN_CLARO });

      expect(getComputedStyle(slot).display).toBe("inline-flex");
      // El envoltorio no entra en la secuencia de tabulacion: el unico control
      // enfocable sigue siendo el boton, igual que antes de esta tarea.
      expect(slot).not.toHaveAttribute("tabindex");
      expect(slot.contains(boton)).toBe(true);
      expect(getComputedStyle(boton).width).toBe("44px");
    });
  });

  it("en una pagina sin hero (legales, via LegalHeader): aria-busy se retira en el mismo tick que el tema cambia, sin esperar a un cruce inexistente", () => {
    // Sin #hero en el documento no hay ningun cruce de composiciones que
    // esperar (ver "willCrossfade" en el hook). Necesita el stub de
    // matchMedia por el mismo motivo que el primer test del archivo (Task 5:
    // `requestThemeChange` lo lee siempre, tenga o no cruce que esperar).
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
        name: ETIQUETA_EN_CLARO,
      });

      act(() => {
        boton.click();
      });

      expect(
        screen.getByRole("button", { name: ETIQUETA_EN_OSCURO }),
      ).not.toHaveAttribute("aria-busy");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  /*
   * EL RÓTULO VISIBLE Y LO QUE ANUNCIA (crítica externa #18, hallazgo O-3, más
   * la decisión del dueño de rotular este control por lo que de verdad hace).
   *
   * Los tres candados de este bloque atrapan tres defectos distintos, y
   * ninguno de ellos lo ve el ojo en jsdom: (1) que el rótulo visible vuelva a
   * ser una cadena tecleada en el componente en vez de su clave i18n --
   * defecto que dejaría el conmutador en castellano dentro de la home inglesa
   * --; (2) que la copia vuelva a prometer solo un cambio de color, que es la
   * penalización de H4 que arrastra tres rondas; y (3) que el rótulo se pinte
   * a cualquier ancho, incluido el que no tiene sitio para él.
   */
  describe("rótulo visible (crítica #18, O-3)", () => {
    /** El `span` del rótulo dentro del botón, por su gancho de DOM. */
    function rotulo(container: HTMLElement): HTMLElement {
      const nodo = container.querySelector("[data-theme-toggle-label]");
      expect(nodo, "el conmutador no pinta ningún rótulo").not.toBeNull();
      return nodo as HTMLElement;
    }

    /* Los dos temas se fijan por `localStorage` y no pulsando el botón (el
       patrón que ya usan los dos primeros tests del archivo): así este candado
       mide SOLO el rótulo, sin arrastrar el stub de `matchMedia` que
       `requestThemeChange` necesita. */
    it.each([
      ["light", esCommon.Common.ThemeToggle.stateLight],
      ["dark", esCommon.Common.ThemeToggle.stateDark],
    ] as const)(
      "en tema %s el rótulo sale de su clave i18n y nombra el tema ACTIVO, igual que el icono",
      (tema, esperado) => {
        window.localStorage.setItem("vti-theme", tema);
        const { container } = renderWithProviders(<ThemeToggle />);

        /* Resuelto contra el MISMO JSON que consume el componente, nunca
           contra un literal escrito aquí: si alguien cambia la clave por otra
           (o por una cadena tecleada), el texto deja de coincidir. */
        expect(rotulo(container)).toHaveTextContent(esperado);
      },
    );

    it("el rótulo visible ES la primera mitad del nombre accesible (WCAG 2.5.3) y este anuncia que la página cambia, en los dos idiomas", () => {
      /* CENTINELA, no prosa: la palabra que distingue «esto cambia el color»
         de «esto recompone el documento». No se compara la oración entera --
         la copia puede reescribirse -- sino la propiedad que la decisión del
         dueño exige que se conserve: que hable de la PÁGINA. */
      const HABLA_DE_LA_PAGINA: Record<string, string> = {
        es: "página",
        en: "page",
      };

      for (const [idioma, copia] of [
        ["es", esCommon],
        ["en", enCommon],
      ] as const) {
        const pares = [
          [
            copia.Common.ThemeToggle.stateLight,
            copia.Common.ThemeToggle.switchToDark,
          ],
          [
            copia.Common.ThemeToggle.stateDark,
            copia.Common.ThemeToggle.switchToLight,
          ],
        ];

        for (const [estado, anuncio] of pares) {
          expect(
            anuncio.startsWith(estado),
            `${idioma}: el nombre accesible no empieza por el rótulo visible (${estado}), así que quien lo lee en pantalla y quien lo oye reciben nombres distintos`,
          ).toBe(true);
          expect(
            anuncio.toLowerCase(),
            `${idioma}: el conmutador vuelve a prometer solo un cambio de tema sin decir que recompone el documento`,
          ).toContain(HABLA_DE_LA_PAGINA[idioma]);
        }
      }
    });

    /*
     * jsdom no evalúa ninguna consulta condicional (regla 36, que nació con
     * `@media` y vale igual para `@container`), así que las dos reglas de
     * ancho se afirman leyendo el CSSOM: la regla BASE del rótulo (oculto) y
     * la que vive dentro de la consulta de contenedor. La FORMA del selector
     * se comprueba sobre `selectorText` (regla 35).
     *
     * El umbral no se escribe aquí: sale de `NAVBAR_LABEL_EM`, el mismo
     * módulo que consume el componente, así que moverlo no deja este candado
     * comprobando un número que ya no existe.
     */
    it("el rótulo está oculto en la regla base y solo se enciende dentro de la consulta de contenedor del régimen rotulado", () => {
      const { container } = renderWithProviders(<ThemeToggle />);
      const clases = Array.from(rotulo(container).classList);

      const reglasPropias: { rule: CSSStyleRule; media: string | null }[] = [];
      const walk = (rules: CSSRuleList, media: string | null): void => {
        Array.from(rules).forEach((rule) => {
          const anidadas = (rule as CSSGroupingRule).cssRules;
          if (anidadas) {
            /* Del `cssText`, no de `media.mediaText`: la regla del rótulo
               es `@container` (`CSSContainerRule`), que no expone `media`. */
            walk(anidadas, rule.cssText.split("{")[0].trim() || media);
            return;
          }
          const estilo = rule as CSSStyleRule;
          if (
            estilo.selectorText !== undefined &&
            clases.some((cls) => estilo.selectorText.includes(`.${cls}`))
          ) {
            reglasPropias.push({ rule: estilo, media });
          }
        });
      };
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          walk(sheet.cssRules, null);
        } catch {
          /* hoja inaccesible: no aporta */
        }
      });

      const base = reglasPropias.filter((entrada) => entrada.media === null);
      expect(
        base.length,
        "el rótulo no declara ninguna regla base propia",
      ).toBeGreaterThan(0);
      base.forEach((entrada) => {
        expect(entrada.rule.selectorText).not.toMatch(/\s/);
        expect(
          entrada.rule.style.display,
          "el rótulo se pinta también en la barra estrecha, donde la medición dice que no cabe",
        ).toBe("none");
      });

      const anchas = reglasPropias.filter((entrada) =>
        (entrada.media ?? "").includes(`min-width: ${NAVBAR_LABEL_EM}em`),
      );
      expect(
        anchas.length,
        "el rótulo no se enciende en ninguna consulta de contenedor: sería invisible a cualquier ancho",
      ).toBeGreaterThan(0);
      anchas.forEach((entrada) => {
        expect(entrada.rule.style.display).toBe("inline");
      });
    });
  });
});
