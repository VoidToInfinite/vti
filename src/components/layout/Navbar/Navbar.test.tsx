import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import { act, fireEvent } from "@testing-library/react";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { HERO_CHROME_OFFSET_MS } from "@/motion/timings";
import { NAV_DETACH_ANIM_MS } from "@/hooks/useNavDetach";
import { links } from "@/config/links";
import esCommon from "@/i18n/locales/es/common.json";
import {
  NAV_GROUPS,
  navBarMoreGroupsFor,
  navBarSectionsFor,
  navGroupsFor,
} from "@/config/navigation";
import { routePath } from "@/config/site";
import { I18nProvider } from "@/i18n/I18nProvider";
import { DECK, OVERLAY, PRESS } from "@/motion/vocabulary";
import { NAV_SHEET_SCROLL_TOLERANCE_PX, navActiveAccent } from "./NavSheet";
import { Navbar } from "./Navbar";

/**
 * Stub minimo de `window.matchMedia`, que jsdom no implementa. Entro en este
 * archivo cuando `Navbar` dependia de `useStage()` (tarea C4) y se queda
 * aunque esa dependencia haya desaparecido (revision 2026-08-11: la entrada
 * de carga del navbar es CSS estatico): `useNavSheet` lo sigue consultando
 * al montar, y varios tests de mas abajo necesitan poder forzar
 * `prefers-reduced-motion`. Mismo stub que usan Hero.test.tsx/
 * hero.transition.test.tsx/HeroBackdrop.test.tsx.
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
 * Hasta la revision 2026-08-11 (Task 10), `Navbar` consumia `useStage()`
 * (tarea C4) y este helper tenia que envolverlo en un `StageProvider` para
 * que el hook no lanzara. Ya no: su entrada de carga es una @keyframes
 * estatica con animation-delay = HERO_CHROME_OFFSET_MS, sin ninguna
 * dependencia de la maquina de fases -- asi que el envoltorio se retiro en
 * vez de dejarse "por si acaso" (regla 16 de RULES.md: un comentario o un
 * andamio que ya no describe el codigo es peor que ninguno).
 * `renderWithProviders` (test-utils.tsx) es un helper COMPARTIDO y sigue sin
 * tocarse.
 *
 * CIERRE 2026-08-11 (Task 27, minor diferido de la Task 10): la maquina
 * entera (`useStage()`/`StageProvider`, `src/motion/stage.ts`) se retiro del
 * repo por quedarse sin ningun consumidor real -- `HeroBackdrop`, el ultimo
 * que le avisaba, tambien dejo de hacerlo. Los dos simbolos que este bloque
 * nombra ya no existen en ningun fichero de produccion, solo en este
 * registro historico.
 */
function renderNavbar(): RenderResult {
  return renderWithProviders(<Navbar />);
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

  /*
   * OLA M (2026-09-03): desde que las paginas legales montan esta misma barra,
   * conviven DOS landmarks de navegacion en esas rutas -- este y el indice del
   * documento, que ya se llama «Indice». Una lista de landmarks con uno sin
   * nombre no dice cual es cual, medido en el arbol de accesibilidad de Chrome
   * sobre /privacidad. El nombre se afirma contra la clave i18n, nunca contra
   * una cadena tecleada (regla 38): asi un cambio de copia no deja el candado
   * comprobando un texto que ya nadie pinta.
   */
  it("el landmark de navegacion del sitio tiene nombre accesible, para distinguirlo del indice de las paginas legales", () => {
    renderWithProviders(<Navbar />);

    expect(
      screen.getByRole("navigation", { name: esCommon.Common.Nav.landmark }),
    ).toBeInTheDocument();
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

  /*
   * Task 13, punto 1 del brief: `viewport-fit=cover` (app/layout.tsx) +
   * `env(safe-area-inset-*)` en las piezas fijas. ScHeader está anclado a
   * `top: 0` del viewport (candidato a notch/dynamic island en vertical);
   * ScNav es el nivel de CONTENIDO real (marca, enlaces, idioma, tema) y
   * necesita apartarse del notch lateral en horizontal -- a diferencia de
   * ScHeader/ScBar/ScSurface, que siguen pintando cristal edge-to-edge sin
   * recorte. `calc(token + env(..., 0px))` en los tres, aditivo por
   * construcción: jsdom no resuelve `env()` (no hay hardware que consultar),
   * así que el candado afirma el TEXTO de la declaración, nunca
   * `getComputedStyle`. Validado con el bug inyectado a propósito (ver
   * informe de la tarea): comentando temporalmente cada `env(safe-area-
   * inset-*)` en Navbar.tsx, el test correspondiente se pone en rojo;
   * restaurado, vuelve a verde.
   */
  describe("Task 13: safe areas (ScHeader/ScNav)", () => {
    it("ScHeader reserva env(safe-area-inset-top) en su padding-top", () => {
      renderNavbar();
      const header = screen.getByRole("banner");
      const reglas = allCssRules();
      const clase = Array.from(header.classList).find((c) =>
        reglas.some((r) => r.includes(c)),
      ) as string;
      expect(
        clase,
        "no se encontró la clase inyectada de ScHeader",
      ).toBeDefined();

      const propias = reglas.filter((r) => r.includes(clase));
      const paddingRule = propias.find((r) => r.includes("padding-top"));
      expect(paddingRule, "ScHeader no declara padding-top").toBeDefined();
      expect(paddingRule).toContain("env(safe-area-inset-top, 0px)");
    });

    it("ScNav reserva env(safe-area-inset-left/right) en su padding horizontal", () => {
      renderNavbar();
      const nav = screen.getByRole("navigation");
      const reglas = allCssRules();
      const clase = Array.from(nav.classList).find((c) =>
        reglas.some((r) => r.includes(c)),
      ) as string;
      expect(clase, "no se encontró la clase inyectada de ScNav").toBeDefined();

      const propias = reglas.filter((r) => r.includes(clase));
      /* `padding-left`/`padding-right`, no la abreviatura `padding:` que este
         candado buscaba hasta la crítica #16: el raíl de contenido (hallazgo
         L4) resuelve cada lado con su propio `max()`, así que las dos
         longhands sustituyen a la shorthand de cuatro valores. Lo que el
         candado ata NO cambia: que el inset del notch se sigue reservando en
         los dos lados, y de forma ADITIVA sobre el raíl. */
      const paddingRule = propias.find((r) => r.includes("padding-left:"));
      expect(paddingRule, "ScNav no declara padding-left").toBeDefined();
      expect(paddingRule).toContain("env(safe-area-inset-left, 0px)");
      expect(paddingRule).toContain("env(safe-area-inset-right, 0px)");
    });
  });

  it("renderiza el enlace de marca", () => {
    renderNavbar();
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("ScBrandLink declara min-height: 44px (área táctil AA -- único enlace de nav visible en móvil, auditoría premium 2026-08-08)", () => {
    // jsdom no hace layout: esta aserción comprueba la DECLARACIÓN de CSS
    // (getComputedStyle resuelve el CSSOM real que styled-components
    // inyecta), no la geometría resultante -- mismo límite que documenta el
    // test del chevron, más abajo ("el candado comprueba las DECLARACIONES,
    // no la geometría: jsdom no hace layout").
    renderNavbar();
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });
    expect(getComputedStyle(brandLink).minHeight).toBe("44px");
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

  /*
   * T2 de la ola post-crítica #13 (2026-08-20): el 404 de prefetch de RSC que
   * quedaba abierto en la barra.
   *
   * Bug abierto de Next 16 en export estático (vercel/next.js #85374 y #92341,
   * reproducido en 16.2.11, Task 28): el prefetch de segmento RSC pide
   * `__next.<ruta>.__PAGE__.txt` (plano) y `output: "export"` genera
   * `__next.<ruta>/__PAGE__.txt` (anidado), así que SIEMPRE devuelve 404. El
   * repo ya lo había cerrado en DOS consumidores -- los enlaces legales del pie
   * (`Footer.tsx`) y el selector de idioma -- y este `<Link>` se quedó fuera:
   * es el logotipo, está en todas las páginas y su destino es justo el que Next
   * prefetcha en cuanto entra en el viewport, es decir en cada carga y sin que
   * nadie interactúe.
   *
   * Candado de FUENTE, no de DOM, y por el mismo motivo que ya documentan
   * `Footer.test.tsx` y `LanguageSelector.test.tsx`: `next/link` desestructura
   * `prefetch` de sus props ANTES de esparcir el resto sobre el `<a>`, así que
   * no hay ningún atributo que observar en el DOM renderizado.
   *
   * Se despoja de comentarios ANTES de buscar y se acota al JSX de
   * `ScBrandLink`: el docblock que acompaña la prop CITA `prefetch={false}` en
   * prosa, así que sin lo primero el candado pasaría en verde con la prop
   * ausente (lección del 2026-08-11), y sin lo segundo pasaría en verde por el
   * `prefetch={false}` de cualquier OTRO enlace del fichero.
   *
   * Validado con bug inyectado (rojo observado): ver el informe de la entrega.
   */
  it("el enlace de marca declara prefetch={false} (fuente, T2)", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "Navbar.tsx"), "utf-8");

    const sinComentarios = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const jsx = sinComentarios.match(/<ScBrandLink[\s\S]*?>/);

    expect(jsx, "no se encontró el JSX de ScBrandLink").not.toBeNull();
    expect(jsx?.[0]).toContain("prefetch={false}");
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

  it("renderiza el selector de idioma DOS veces: en la barra (≥md) y dentro de la hoja (<md)", () => {
    /*
     * VERDAD NUEVA desde la hoja de navegación móvil (Task 10, regla 40: la
     * fuente de verdad del test se actualiza, no se relaja la aserción).
     * Hasta hoy había UNA sola copia, siempre visible en la barra. Ahora hay
     * dos copias con visibilidad EXCLUYENTE por CSS -- la de la barra oculta
     * bajo `md`, la de la hoja oculta desde `md` -- porque a 375 px no cabe
     * el disparador de 44x44 sin mudar el idioma dentro de la hoja (medición
     * de la spec del vault: 337 px de contenido en 343 px disponibles). El
     * porqué completo, y por qué NO se mueve con JavaScript, está en el
     * docblock de `NavSheet.tsx`.
     *
     * En un navegador real solo UNA de las dos copias existe a cualquier
     * ancho. jsdom no evalúa ningún `@media` (regla 36), así que aquí las dos
     * están en el DOM: se cuentan por `container`, no por rol, y se comprueba
     * que cada una está donde le toca.
     */
    const { container } = renderNavbar();

    // Desde la ola G el selector navega (enlaces con hreflang), ya no
    // conmuta con botones — contrato actualizado, no relajado (regla 40).
    const enlacesEs = container.querySelectorAll("a[title*='Español']");
    const enlacesEn = container.querySelectorAll("a[title*='Inglés']");
    expect(enlacesEs).toHaveLength(2);
    expect(enlacesEn).toHaveLength(2);

    const hoja = container.querySelector("[data-nav-sheet]") as HTMLElement;
    const enHoja = hoja.querySelectorAll("a[title*='Español']");
    expect(enHoja, "el idioma no se ha mudado dentro de la hoja").toHaveLength(
      1,
    );

    // La otra copia vive en la barra, FUERA de la hoja: la del banner menos
    // la de la hoja tiene que ser exactamente una.
    const banner = screen.getByRole("banner");
    expect(banner.querySelectorAll("a[title*='Español']")).toHaveLength(1);
  });

  it("renderiza el toggle de tema", () => {
    renderNavbar();
    // El toggle de tema se expone como un botón con aria-label
    const themeToggle = screen.getByRole("button", { name: /Cambiar a tema/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it("no queda ninguna marca decorativa que aparezca al hacer scroll", () => {
    // Regresion de la retirada de `EyeCornerMark` (2026-07-31): el punto
    // decorativo que se encendia con `data-scrolled` se elimino a peticion
    // del usuario. Este test evita que vuelva a colarse en el enlace de
    // marca cualquier elemento que se revele con el scroll: el unico cambio
    // visual al cruzar el umbral tiene que ser la propia pildora.
    const { container } = renderNavbar();
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });

    scrollPast();

    expect(screen.getByRole("banner")).toHaveAttribute("data-scrolled", "true");
    expect(brandLink.querySelector("[data-visible]")).toBeNull();
    expect(container.querySelectorAll("[data-visible]")).toHaveLength(0);
  });

  describe("entrada del navbar en la carga (CSS estatico, revision 2026-08-11)", () => {
    /*
     * CANDADO DE ESTRUCTURA. La entrada dejo de depender de la maquina de
     * fases: `data-intro` ya no existe en este componente. Es lo que hace que
     * la barra sea visible sin JavaScript -- este sitio es un export estatico
     * (`output: "export"`, sin servidor Next detras), asi que un visitante sin
     * scripts nunca veria encenderse nada que dependa de hidratar -- y lo que
     * la desacopla del instante en que `HeroBackdrop` gana su carrera de
     * `decode()`, que era lo que retrasaba su entrada hasta despues de la
     * hidratacion.
     */
    it("no depende de ningun estado de JS: el banner ya no lleva data-intro", () => {
      renderNavbar();
      expect(screen.getByRole("banner")).not.toHaveAttribute("data-intro");
    });

    /*
     * El offset de 760ms se conserva VERBATIM (a diferencia de la copia del
     * hero, que lo pierde por su papel en el LCP -- ver Hero.tsx): se
     * asevera sobre `animationDelay`, longhand, contra la CONSTANTE
     * importada, nunca sobre la shorthand `animation` (que jsdom no expande)
     * ni contra un literal escrito a mano (regla 38 de RULES.md).
     *
     * Que este retardo este computado en un render pelado, sin forzar
     * ninguna fase ni avanzar ningun reloj falso, ES la prueba de que la
     * regla no esta calificada por un atributo que solo JS escribe.
     */
    it("entra con animation-delay = HERO_CHROME_OFFSET_MS, sin fase de JS", () => {
      renderNavbar();
      expect(getComputedStyle(screen.getByRole("banner")).animationDelay).toBe(
        `${HERO_CHROME_OFFSET_MS}ms`,
      );
    });

    it("sigue siendo focalizable durante el intro: opacity 0 no saca el navbar del orden de tabulacion", () => {
      // Regresion que este test previene: si el intro se hiciera con
      // `display: none`/`visibility: hidden`/`aria-hidden`, el boton
      // dejaria de ser focalizable durante el retardo -- opacity/transform,
      // las unicas propiedades que usa el intro, no tienen ese efecto (ver
      // el comentario de accesibilidad en Navbar()).
      renderNavbar();

      const themeToggle = screen.getByRole("button", {
        name: /Cambiar a tema/i,
      });
      themeToggle.focus();
      expect(document.activeElement).toBe(themeToggle);
    });

    /*
     * El guard sigue siendo obligatorio y ahora por un motivo distinto:
     * GlobalStyles colapsa `animation-duration` bajo reduce pero NO
     * `animation-delay`, asi que sin `animation: none` la barra quedaria
     * invisible los 760ms del retardo (fill backwards) y apareceria de
     * golpe. jsdom no evalua `@media` (regla 36), asi que se inspecciona
     * `document.styleSheets` en vez de confiar en el estilo computado.
     */
    it("existe el bloque prefers-reduced-motion: reduce que apaga la animacion y fuerza visible de inmediato", () => {
      renderNavbar();
      const reglas = allCssRules();

      const bloqueReduce = reglas.filter(
        (regla) =>
          regla.includes("@media (prefers-reduced-motion: reduce)") &&
          regla.includes("animation: none") &&
          regla.includes("opacity: 1"),
      );
      expect(bloqueReduce.length).toBeGreaterThan(0);
    });

    /*
     * LA CABECERA INVISIBLE NO SE PUEDE PULSAR (crítica #14, P1).
     *
     * El defecto que este candado cierra estaba medido, no supuesto: la barra
     * computaba `opacity: 0` durante todo el retardo del intro y `opacity` NO
     * desactiva los eventos de puntero, así que el conmutador de tema, el
     * idioma, el logotipo y la hamburguesa recibían clics a ciegas -- hasta
     * ~1,2 s con JavaScript y ~1,7 s sin él.
     *
     * SE AFIRMAN LAS DOS MITADES, y ninguna sola bastaría: (a) que exista la
     * animación hermana que bloquea el puntero, con su salto AL FINAL (el
     * keyframe del 99%: una animación discreta con solo from/to saltaría a
     * mitad de la duración, con la barra a medio aparecer), y (b) que la
     * cabecera declare `pointer-events: auto` como valor de reposo, que es
     * donde vuelve al terminar (sin `fill: forwards`) y lo que rige bajo
     * `prefers-reduced-motion`, donde no hay animación ninguna.
     *
     * Se inspecciona `document.styleSheets` y no `getComputedStyle`: jsdom no
     * ejecuta animaciones ni resuelve `animation-fill-mode`, así que el valor
     * computado durante el retardo es inobservable desde aquí. Lo que sí se
     * puede afirmar es la DECLARACIÓN, que es donde vive el contrato.
     *
     * Validado con el bug inyectado a propósito (regla 34): ver el informe de
     * la entrega.
     */
    it("bloquea el puntero mientras es invisible y lo libera al final del intro, sin JavaScript", () => {
      renderNavbar();
      const banner = screen.getByRole("banner");
      const reglas = allCssRules();

      // (a) La animación hermana existe y su salto cae al FINAL.
      const bloqueo = reglas.find(
        (regla) =>
          regla.includes("@keyframes") &&
          regla.includes("pointer-events: none") &&
          regla.includes("pointer-events: auto"),
      );
      expect(
        bloqueo,
        "el intro no declara ninguna animación que bloquee el puntero mientras la barra es invisible",
      ).toBeDefined();
      const inicio = (bloqueo as string).indexOf("pointer-events: none");
      const fin = (bloqueo as string).indexOf("pointer-events: auto");
      expect(
        fin,
        "el puntero se libera antes de bloquearse: los keyframes están invertidos",
      ).toBeGreaterThan(inicio);
      expect(
        (bloqueo as string).slice(0, fin),
        "sin un keyframe tardío, una animación discreta salta a mitad de la duración: la barra sería pulsable a medio aparecer",
      ).toContain("99%");

      // Y la cabecera la ENCADENA a la del intro: mismo reloj, dos nombres.
      expect(
        getComputedStyle(banner).animationName.split(",").length,
        "la cabecera no monta la animación de bloqueo junto a la del intro",
      ).toBe(2);

      /* (b) El valor de reposo al que vuelve, DECLARADO y no heredado. Se
         afirma sobre la regla inyectada, no sobre `getComputedStyle`: jsdom
         devuelve "auto" para `pointer-events` esté declarado o no, así que un
         assert sobre el valor computado no puede ponerse en rojo -- comprobado
         inyectando el bug (regla 34). La regla de `@keyframes` no contamina la
         búsqueda: su cssText no lleva la clase de la cabecera. */
      expect(
        cssRuleTextFor(banner),
        "la cabecera no declara su pointer-events de reposo: al terminar la animación (sin fill forwards) y bajo reduce, el contrato solo existiría en un comentario",
      ).toContain("pointer-events: auto");
    });
  });

  describe("enlaces de sección, discover y recursos (Common.Navigation/Nav, tarea Flow F/spec §7.6 y W4)", () => {
    // Los cuatro enlaces de sección se renderizan en LOS DOS TEMAS desde
    // 2026-08-04.
    //
    // Hasta hoy el bloque estaba gateado con `themeName === "light"`, y el
    // motivo escrito era que en oscuro serian anclas muertas porque
    // `HomeSections` no montaba esas secciones (D3 de la spec de Story).
    // Ese motivo dejo de ser cierto cuando `HomeSections` paso a montar las
    // CUATRO secciones siempre, cada una con su propia rama de tema
    // (`HomeSections.tsx`: "las 4 se montan siempre") -- el gate sobrevivio a
    // su razon de ser y dejaba la navegacion coja en oscuro. Comprobado
    // ademas en navegador sobre la pagina real en tema oscuro: los cuatro
    // destinos existen (`section[id]` devuelve hero, story, journey,
    // features y contact).
    //
    // Se busca por `href`, no por nombre accesible: en es-ES
    // `Common.Navigation.story` y `Common.Navigation.history` traducen los
    // dos a "Historia" (mismo string), asi que el nombre accesible no
    // identifica de forma unica cual de los cuatro enlaces es.
    const SECTION_HREFS = ["/#story", "/#journey", "/#features", "/#contact"];

    // Ampliación tarea W4, extendida en la tarea 6 (auditoría premium): los
    // cuatro enlaces de sección, ahora dentro del panel del grupo "onSite",
    // conviven con los TRES enlaces de discover (Learning/Imagination/Gaming,
    // grupo "discover", los tres apuntan a "/#features"), el enlace externo
    // del SDK (grupo "resources") y los DOS enlaces externos del grupo nuevo
    // "community" (Discord, GitHub) -- TODOS siguen en el DOM sea cual sea el
    // estado abierto/cerrado de su panel (regla dura de la tarea: el panel se
    // renderiza siempre, sus enlaces nunca se desmontan). `container.querySelector`,
    // no `getByRole`: un panel cerrado es inaccesible a propósito (`inert` +
    // `visibility: hidden`), así que una consulta por rol lo excluiría
    // aunque el enlace siga en el DOM -- que es justo lo que este test
    // verifica.
    it.each(["light", "dark"] as const)(
      "en tema %s los 4 enlaces de sección, los 3 de discover, el del SDK y los de Discord/GitHub siguen en el DOM (paneles cerrados)",
      (tema) => {
        window.localStorage.setItem("vti-theme", tema);
        const { container } = renderNavbar();

        for (const href of SECTION_HREFS) {
          expect(
            container.querySelector(`a[href="${href}"]`),
            `falta el enlace ${href} en tema ${tema}`,
          ).not.toBeNull();
        }

        // "/#features" lo comparten el enlace de sección "features" (onSite)
        // y los tres de discover. Desde la hoja de navegación móvil (Task 10)
        // el Navbar pinta esos mismos destinos DOS veces: una en el panel de
        // escritorio y otra en la hoja (regla 40: se actualiza la fuente de
        // verdad, no se relaja la aserción). El recuento se DERIVA de
        // `NAV_GROUPS` y del número de superficies, nunca de un literal
        // escrito a mano (regla 39): si mañana se añade una cuarta feature,
        // este test sigue diciendo la verdad sin tocarlo.
        const anclasFeatures = NAV_GROUPS.flatMap(
          (group) => group.items,
        ).filter((item) => item.href === "/#features").length;
        const SUPERFICIES_DE_NAV = 2; // panel de escritorio + hoja móvil
        expect(
          container.querySelectorAll('a[href="/#features"]'),
          `deberian ser ${anclasFeatures * SUPERFICIES_DE_NAV} anclas hacia #features en tema ${tema}`,
        ).toHaveLength(anclasFeatures * SUPERFICIES_DE_NAV);

        expect(
          container.querySelector(`a[href="${links.sdk}"]`),
          `falta el enlace del SDK en tema ${tema}`,
        ).not.toBeNull();

        expect(
          container.querySelector(`a[href="${links.discord}"]`),
          `falta el enlace de Discord en tema ${tema}`,
        ).not.toBeNull();
        expect(
          container.querySelector(`a[href="${links.github}"]`),
          `falta el enlace de GitHub en tema ${tema}`,
        ).not.toBeNull();
      },
    );
  });

  describe("grupos de navegación desplegables (tarea W4)", () => {
    /*
     * UN SOLO DISPARADOR desde la decisión D2 del dueño (2026-09-02, crítica
     * #14). Hasta entonces había cuatro (`ON_SITE`/`DISCOVER`/`RESOURCES`/
     * `COMMUNITY`, uno por grupo de `NAV_GROUPS`) y ninguno nombraba un
     * destino; ahora los cuatro destinos de sección son enlaces visibles de la
     * barra y el resto vive tras «Más».
     *
     * `^Más` y no `/Más/`: el nombre accesible del disparador es «Más destinos
     * del sitio» -- la etiqueta visible más el complemento oculto de
     * `Common.Nav.moreHint` (WCAG 2.5.3, Label in Name: el nombre accesible
     * EMPIEZA por lo que se lee en pantalla). Anclar al principio afirma ese
     * orden de paso, no solo que las dos cadenas estén.
     */
    const MORE = /^Más/i;

    /**
     * `ScNavLinks` solo pasa de `display: none` a `flex` dentro de
     * `@media ${breakPoint.md}` -- jsdom NO evalúa condiciones `@media`
     * (mismo límite ya documentado en el propio encargo), así que
     * `getComputedStyle` resuelve SIEMPRE la regla base (`display: none`)
     * sea cual sea `window.innerWidth`. `dom-accessibility-api` (la
     * librería que usa `getByRole` para decidir qué es "accesible") trata
     * ese `display: none` calculado como oculto y excluye el elemento --
     * por eso toda consulta por rol a un disparador o a un enlace de un
     * panel necesita `{ hidden: true }` (la propia opción de
     * testing-library para "incluye también lo que la librería cree
     * oculto"). No es una concesión al componente: en un navegador real la
     * media query aplicaría y no haría falta.
     */
    function getTrigger(name: RegExp): HTMLElement {
      return screen.getByRole("button", { name, hidden: true });
    }

    it("el chevron declara su propio tamaño: sin él, GlobalStyles lo estira al 100% del disparador", () => {
      /*
       * REGRESIÓN REAL, medida en el navegador (no hipotética). `GlobalStyles`
       * declara `svg { width: 100%; display: block; }` para todo el sitio, y
       * esa declaración gana SIEMPRE a la geometría implícita del `viewBox`.
       * Con el chevron sin `width`/`height` propios, medido sobre esta misma
       * barra a 1280 px de ancho: el SVG salía a **215x143 px** y hinchaba el
       * disparador a 143 px de alto dentro de una banda de 56 px
       * (`--nav-height`), descolgando la fila entera de la navegación.
       *
       * Es la TERCERA aparición del mismo fallo en este repo: `ScLogo`
       * (`src/components/ui/Logo/Logo.tsx`) ya lo documenta medido (167 px de
       * ancho en un navbar de 56 px).
       *
       * El candado comprueba las DECLARACIONES, no la geometría: jsdom no
       * hace layout -- `getBoundingClientRect()` devuelve ceros y el fallo es
       * literalmente invisible para la suite -- pero sí resuelve el valor
       * declarado de una propiedad por CSSOM, que es exactamente lo que hay
       * que atar aquí.
       */
      const { container } = renderNavbar();
      const chevron = container.querySelector(
        "button[aria-expanded] svg",
      ) as HTMLElement;
      expect(chevron, "el disparador no monta ningún chevron").not.toBeNull();

      const estilo = getComputedStyle(chevron);
      expect(
        estilo.width,
        "el chevron no declara width propio: heredaría el 100% de GlobalStyles",
      ).not.toBe("");
      expect(estilo.width).not.toBe("100%");
      expect(
        estilo.flex || estilo.flexGrow,
        "el chevron no se blinda contra el estirado del contenedor flexible",
      ).not.toBe("");
    });

    /*
     * EL CANDADO QUE SUSTITUYE A "los cuatro disparadores existen" (decisión
     * D2). El viejo afirmaba que cada grupo de `NAV_GROUPS` tenía su botón, y
     * describía exactamente lo que la crítica #14 midió como defecto: a
     * 1440x900 el cabecero no ofrecía NI UN enlace de navegación visible, y
     * llegar a Contacto exigía abrir un menú a ciegas y elegir dentro.
     *
     * El nuevo afirma la propiedad que D2 compra: los cuatro destinos de
     * sección son ENLACES (no botones), están en el DOM sin abrir nada, y el
     * único disclosure que queda arranca cerrado. El recuento sale de
     * `navBarSectionsFor`, la misma fuente que consume el componente, nunca de
     * un 4 escrito a mano (regla 39).
     */
    it("los cuatro destinos de sección son enlaces visibles de la barra, y el único disparador («Más») arranca cerrado", () => {
      const { container } = renderNavbar();

      const barLinks = navBarSectionsFor("es");
      expect(barLinks.length).toBeGreaterThan(0);
      for (const item of barLinks) {
        const link = container.querySelector(
          `[data-nav-links] a[href="${item.href}"]`,
        );
        expect(
          link,
          `${item.key} no se pinta como enlace visible de la barra`,
        ).not.toBeNull();
        /* Y NOMBRA SU DESTINO, que es la mitad del defecto que D2 cierra:
           «En el sitio» o «Más» no dicen a dónde llevan, «Contacto» sí. El
           texto esperado se lee del MISMO JSON que resuelve el componente
           (regla 39/28), nunca de una cadena escrita a mano en el test. */
        expect(link?.textContent?.trim()).toBe(
          esCommon.Common.Navigation[
            item.key as keyof typeof esCommon.Common.Navigation
          ],
        );
      }

      const triggers = container.querySelectorAll(
        "[data-nav-links] button[aria-expanded]",
      );
      expect(
        triggers,
        "la barra vuelve a esconder destinos tras varios disclosures",
      ).toHaveLength(1);
      expect(getTrigger(MORE)).toHaveAttribute("aria-expanded", "false");
    });

    /*
     * `about` NO ENTRA EN LA BARRA (decisión del dueño D2, 2026-09-02;
     * crítica externa #15, hallazgo C 5). La quinta sección de la home entra
     * en el modelo de navegación, y la barra de escritorio conserva SUS
     * CUATRO enlaces: la decisión es de espacio, no de importancia -- la
     * píldora ya lleva marca, cuatro destinos, «Más», idioma y tema en 56 px
     * de alto, y un quinto rótulo (el más largo de los cinco) la empujaría
     * hacia el problema que la propia crítica #15 midió en la barra a 200 %
     * de fuente.
     *
     * Dos candados, no uno, y la diferencia importa: el de arriba afirma que
     * los destinos de `navBarSectionsFor` se pintan; este afirma que los que
     * NO están en esa lista NO se pintan. Sin el segundo, devolver el grupo
     * entero (lo que hacía `navBarSectionsFor` antes de esta entrega) pasaría
     * en verde.
     */
    it("el quinto destino de sección NO se pinta en la barra: about vive en «Más», con su rótulo de grupo", () => {
      const { container } = renderNavbar();

      expect(
        container.querySelector('[data-nav-links] > a[href="/#about"]'),
        "about se coló como enlace visible de la barra",
      ).toBeNull();

      const trigger = getTrigger(MORE);
      fireEvent.click(trigger);
      const panel = document.getElementById(
        trigger.getAttribute("aria-controls") as string,
      ) as HTMLElement;

      const enlace = panel.querySelector('a[href="/#about"]');
      expect(
        enlace,
        "about no está ni en la barra ni en «Más»: en escritorio no habría forma de llegar a la sección",
      ).not.toBeNull();
      expect(enlace?.textContent?.trim()).toBe(
        esCommon.Common.Navigation.about,
      );

      /* BAJO SU RÓTULO, no suelto entre los externos: la lista que lo contiene
         se nombra con `Common.Nav.onSite`, así que quien abre el panel sabe
         que lleva a la misma página y no a otro sitio. */
      const lista = enlace?.closest("ul");
      const rotulo = document.getElementById(
        lista?.getAttribute("aria-labelledby") as string,
      );
      expect(rotulo?.textContent?.trim()).toBe(esCommon.Common.Nav.onSite);
    });

    /*
     * INVERSIÓN DELIBERADA de un candado anterior (crítica externa #8, punto
     * 2). Hasta el 2026-08-17 este mismo test exigía `aria-haspopup="true"`
     * en los cuatro disparadores, añadido por la Tarea 1 razonando que
     * `"true"` era el valor "genérico" y por tanto más honesto que `"menu"`.
     * Es al revés: en WAI-ARIA `aria-haspopup="true"` es SINÓNIMO EXACTO de
     * `"menu"`, así que el atributo anunciaba un menú -- con su teclado de
     * flechas/Home/End -- que este componente no implementa ni pretende
     * implementar (sus items son enlaces, y el patrón APG correcto para eso
     * es el disclosure: botón con aria-expanded + aria-controls, sin
     * haspopup y sin role="menu").
     *
     * El test afirma las DOS mitades a la vez a propósito: que la promesa
     * falsa no está Y que la señal verdadera sí -- "no hay haspopup" a secas
     * pasaría también si alguien borrara la semántica entera del disparador.
     *
     * Validado con el bug inyectado a propósito: devolviendo
     * `aria-haspopup="true"` al `ScNavTrigger` de `Navbar.tsx`, este test cae
     * en rojo nombrando el atributo; retirado de nuevo, vuelve a verde.
     */
    it("el disparador no promete un menú con aria-haspopup: es un disclosure con aria-expanded", () => {
      renderNavbar();

      const trigger = getTrigger(MORE);
      expect(
        trigger,
        "aria-haspopup anuncia un role=menu con teclado de flechas que este desplegable no implementa",
      ).not.toHaveAttribute("aria-haspopup");
      expect(trigger).toHaveAttribute("aria-expanded");
      expect(trigger).toHaveAttribute("aria-controls");
    });

    /*
     * Crítica externa #8, punto 3: destinos indistinguibles en la rama clara.
     * Los tres enlaces de «Descubre» ya apuntan a tarjetas distintas desde el
     * 2026-08-16, pero en el tema claro esas tarjetas están una al lado de
     * otra: `feature-imagination-title` y `feature-gaming-title` resuelven al
     * MISMO píxel de scroll (4354, medido), así que el desplazamiento no
     * puede informar de a cuál se ha llegado. El foco sí.
     *
     * `Navbar` no monta `Features`, así que el destino se inyecta aquí con la
     * misma forma exacta que `Features.tsx` le da (un `h3` con el id del href
     * y `tabIndex = -1`). La OTRA mitad del contrato -- que Features emita de
     * verdad esos ids y que sean focalizables -- vive en `Features.test.tsx`,
     * que importa `NAV_GROUPS` y las cruza (regla 41).
     */
    function withAnchorTarget(
      id: string,
      run: (target: HTMLElement) => void,
    ): void {
      const target = document.createElement("h3");
      target.id = id;
      target.tabIndex = -1;
      document.body.appendChild(target);
      try {
        run(target);
      } finally {
        target.remove();
      }
    }

    it("al activar un enlace de «Descubre», el foco salta al titular de la tarjeta de destino", () => {
      const { container } = renderNavbar();

      withAnchorTarget("feature-imagination-title", (target) => {
        const link = container.querySelector(
          'a[href="/#feature-imagination-title"]',
        ) as HTMLElement;
        expect(
          link,
          "el panel no monta el enlace de imagination",
        ).not.toBeNull();

        fireEvent.click(link);

        expect(
          document.activeElement,
          "sin mover el foco, dos tarjetas contiguas del tema claro son el mismo destino para el lector",
        ).toBe(target);
      });
    });

    /*
     * SUSTITUYE al test que hasta la crítica externa #9 afirmaba lo contrario
     * ("un enlace de sección no mueve el foco: su destino ya se distingue por
     * el propio scroll"). Ese argumento describía lo que ve quien MIRA la
     * pantalla; dos evaluadores midieron por separado que para quien navega
     * por teclado o con lector de pantalla el salto simplemente no ocurría --
     * `document.activeElement` se quedaba en `<body>`. La fuente de verdad del
     * test se actualiza con el cambio (regla 40), no se relaja.
     *
     * El destino se monta aquí SIN `tabindex`, con la forma exacta que le dan
     * las cuatro secciones reales (`<section id="story">`, ver `Story.tsx`):
     * así el candado observa las DOS mitades del arreglo -- que el helper hace
     * focalizable un destino que no lo era, y que el foco acaba ahí.
     */
    it("al activar un enlace de sección, el foco salta a la sección de destino, que gana tabindex=-1 para poder recibirlo", () => {
      const { container } = renderNavbar();

      const target = document.createElement("section");
      target.id = "story";
      document.body.appendChild(target);

      try {
        const link = container.querySelector(
          'a[href="/#story"]',
        ) as HTMLElement;
        expect(
          target,
          "el destino tiene que empezar SIN tabindex: es lo que lo hace no focalizable",
        ).not.toHaveAttribute("tabindex");

        fireEvent.click(link);

        expect(target).toHaveAttribute("tabindex", "-1");
        expect(
          document.activeElement,
          "el navegador desplaza pero no enfoca: sin foco, quien no ve la pantalla no se entera del salto",
        ).toBe(target);
      } finally {
        target.remove();
      }
    });

    /*
     * La otra mitad del mismo helper: un destino que YA declara su propio
     * `tabindex` no se sobrescribe. Es la guarda `hasAttribute` de
     * `navAnchorFocus.ts`, y su consumidor real son los `<h3>` de
     * `Features.tsx` (`tabIndex={-1}` en el JSX): sin ella, este código estaría
     * reescribiendo un atributo que otro fichero declara a propósito.
     */
    it("un destino que ya declara su propio tabindex no se sobrescribe", () => {
      const { container } = renderNavbar();

      const target = document.createElement("h3");
      target.id = "feature-gaming-title";
      target.setAttribute("tabindex", "0");
      document.body.appendChild(target);

      try {
        const link = container.querySelector(
          'a[href="/#feature-gaming-title"]',
        ) as HTMLElement;

        fireEvent.click(link);

        expect(target).toHaveAttribute("tabindex", "0");
        expect(document.activeElement).toBe(target);
      } finally {
        target.remove();
      }
    });

    it("al pulsar el disparador, su aria-expanded pasa a 'true', su panel pierde inert y aria-controls apunta al id real del panel", () => {
      renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      const panelId = trigger.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();

      // `useId()` genera ids con ":" (no son selectores CSS válidos) --
      // `document.getElementById`, nunca `querySelector("#…")`.
      const panel = document.getElementById(panelId as string);
      expect(panel).not.toBeNull();
      expect(panel).not.toHaveAttribute("inert");
      expect(panel).toHaveAttribute("data-open", "true");
    });

    /*
     * AQUÍ VIVIÓ "abrir un segundo grupo cierra el primero (solo uno con
     * aria-expanded='true' a la vez)". Protegía las reglas 1 y 2 de la tarea
     * W4 -- un solo grupo abierto a la vez -- cuando había CUATRO
     * disparadores, y lo hacía sobre el estado `openGroup: NavGroupKey | null`
     * que las cumplía por construcción.
     *
     * Con la decisión D2 no hay ningún segundo grupo que cerrar: el candado no
     * describe una situación que el sitio pueda alcanzar. Lo que se conserva
     * de él -- que no reaparezcan varios disclosures -- se afirma ahora en "los
     * cuatro destinos de sección son enlaces visibles..." (más arriba), que
     * cuenta los `button[aria-expanded]` del bloque y exige exactamente uno.
     */
    it("los tres grupos del panel se anuncian con su rótulo, y sus listas los nombran con aria-labelledby", () => {
      renderNavbar();
      const trigger = getTrigger(MORE);
      fireEvent.click(trigger);

      const panel = document.getElementById(
        trigger.getAttribute("aria-controls") as string,
      ) as HTMLElement;

      const listas = panel.querySelectorAll("ul[aria-labelledby]");
      const esperados = navBarMoreGroupsFor("es");
      expect(listas).toHaveLength(esperados.length);

      listas.forEach((lista, indice) => {
        const rotuloId = lista.getAttribute("aria-labelledby") as string;
        const rotulo = document.getElementById(rotuloId);
        expect(
          rotulo,
          "el aria-labelledby de la lista no apunta a ningún id real",
        ).not.toBeNull();
        // El rótulo NO puede ser un encabezado: metería en el esquema del
        // documento títulos que solo existen dentro de un desplegable de
        // escritorio (mismo criterio ya atado para la hoja móvil).
        expect(rotulo?.tagName).toBe("P");
        expect(rotulo?.textContent?.trim()).not.toBe("");
        // El orden del panel es el del modelo, sin reordenar nada.
        expect(lista.querySelectorAll("a")).toHaveLength(
          esperados[indice].items.length,
        );
      });
    });

    it("click en el mismo disparador alterna el panel: una segunda pulsación lo cierra", () => {
      renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("Escape cierra el panel abierto y devuelve el foco a su disparador", () => {
      const { container } = renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      // El foco puede estar en cualquier descendiente del grupo cuando se
      // pulsa Escape -- aquí, un enlace de su panel ya abierto --, no solo
      // en el propio disparador.
      const firstLink = container.querySelector(
        'a[href="/#feature-learning-title"]',
      ) as HTMLElement;
      firstLink.focus();
      expect(document.activeElement).toBe(firstLink);

      fireEvent.keyDown(firstLink, { key: "Escape" });

      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(document.activeElement).toBe(trigger);
    });

    it("un click/pointerdown fuera del bloque de navegación cierra el panel abierto", () => {
      renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      fireEvent.pointerDown(document.body);

      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    /*
     * ...pero pulsar un ENLACE DE SECCIÓN de la propia barra no lo cierra por
     * esa vía. Los cuatro enlaces visibles que estrena D2 son hermanos del
     * grupo dentro de `[data-nav-links]`, así que el manejador de "click
     * fuera" tiene que seguir considerándolos DENTRO -- si no, un usuario que
     * abre «Más», lo piensa mejor y pulsa «Historia» vería cerrarse el panel
     * por dos caminos a la vez. La comprobación es sobre el contenedor
     * (`navLinksRef`), no sobre el grupo, y este candado es lo que impide que
     * alguien la estreche al grupo "simplificando".
     */
    it("un pointerdown sobre un enlace de sección de la barra NO cuenta como click fuera", () => {
      const { container } = renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);
      const barLink = container.querySelector(
        '[data-nav-links] a[href="/#story"]',
      ) as HTMLElement;

      fireEvent.pointerDown(barLink);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("el foco saliendo del grupo hacia un elemento externo lo cierra", () => {
      const { container } = renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);
      const link = container.querySelector(
        'a[href="/#feature-learning-title"]',
      ) as HTMLElement;
      const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });

      // React 17+ resuelve `onBlur` sobre el evento nativo `focusout` (que
      // SÍ burbujea), no sobre `blur` (que no burbujea) -- se dispara el
      // primero para que el manejador de `ScNavGroup` lo reciba.
      fireEvent.focusOut(link, { relatedTarget: brandLink });

      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("activar un enlace del panel lo cierra", () => {
      const { container } = renderNavbar();
      const trigger = getTrigger(MORE);

      fireEvent.click(trigger);
      const link = container.querySelector(
        'a[href="/#feature-learning-title"]',
      ) as HTMLElement;

      fireEvent.click(link);

      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("el enlace del SDK tiene target='_blank' y rel='noopener noreferrer', y su nombre accesible incluye el aviso de pestaña nueva", () => {
      renderNavbar();
      fireEvent.click(getTrigger(MORE));

      const sdkLink = screen.getByRole("link", {
        name: /VTI - SDK/i,
        hidden: true,
      });

      expect(sdkLink).toHaveAttribute("target", "_blank");
      expect(sdkLink).toHaveAttribute("rel", "noopener noreferrer");
      expect(sdkLink).toHaveAccessibleName(/se abre en una pestaña nueva/i);
    });

    // Tarea 6 (auditoría premium): grupo "community" nuevo, mismo mecanismo
    // "external" que ya usaba resources.sdk -- replicado sin variación, no
    // reinventado. Un `it.each` sobre los dos enlaces evita duplicar el
    // cuerpo del test de arriba dos veces.
    it.each([
      { network: "Discord", href: links.discord, name: /Discord/i },
      { network: "GitHub", href: links.github, name: /GitHub/i },
    ])(
      "el enlace de $network (grupo community) tiene target='_blank' y rel='noopener noreferrer', y su nombre accesible incluye el aviso de pestaña nueva",
      ({ href, name }) => {
        renderNavbar();
        fireEvent.click(getTrigger(MORE));

        const link = screen.getByRole("link", { name, hidden: true });

        expect(link).toHaveAttribute("href", href);
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        expect(link).toHaveAccessibleName(/se abre en una pestaña nueva/i);
      },
    );

    it("existe el guard de prefers-reduced-motion: reduce para ScNavTrigger, ScChevron y ScNavPanel", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();
      const claseDe = (el: Element): string =>
        Array.from(el.classList).find((c) =>
          reglas.some((r) => r.includes(c)),
        ) ?? "";

      const trigger = getTrigger(MORE);
      const chevron = trigger.querySelector("svg") as SVGElement;
      const panelId = trigger.getAttribute("aria-controls") as string;
      const panel = document.getElementById(panelId) as HTMLElement;
      expect(container).toContainElement(panel);

      for (const [nombre, clase] of [
        ["ScNavTrigger", claseDe(trigger)],
        ["ScChevron", claseDe(chevron)],
        ["ScNavPanel", claseDe(panel)],
      ] as const) {
        expect(
          clase,
          `no se encontro la clase inyectada de ${nombre}`,
        ).not.toBe("");
        const guard = reglas.filter(
          (regla) =>
            regla.includes("@media (prefers-reduced-motion: reduce)") &&
            regla.includes(clase) &&
            regla.includes("transition: none"),
        );
        expect(
          guard.length,
          `${nombre} no anula sus transiciones bajo prefers-reduced-motion: reduce`,
        ).toBeGreaterThan(0);
      }
    });

    /*
     * Task 9 (craft de interacción): ScNavTrigger y ScNavLink (y por
     * composición, ScNavPanelLink = styled(ScNavLink)) ganan
     * :active { transform: scale(...) } (vocabulary.PRESS.activeScale), sin
     * hover que guardar (el hover de los tres es solo color). Validado con
     * el bug inyectado a propósito (ver informe de la tarea, tabla
     * ScNavTrigger/ScNavLink/ScNavPanelLink): comentando temporalmente cada
     * bloque &:active en Navbar.tsx el test correspondiente se pone en
     * rojo; restaurado, vuelve a verde.
     */
    it("ScNavTrigger y ScNavPanelLink (que hereda de ScNavLink) declaran :active con transform: scale(PRESS.activeScale)", () => {
      renderNavbar();
      const reglas = allCssRules();
      const claseDe = (el: Element): string =>
        Array.from(el.classList).find((c) =>
          reglas.some((r) => r.includes(c)),
        ) ?? "";

      const trigger = getTrigger(MORE);
      fireEvent.click(trigger);
      const panelId = trigger.getAttribute("aria-controls") as string;
      const panel = document.getElementById(panelId) as HTMLElement;
      const panelLink = panel.querySelector("a") as HTMLElement;

      for (const [nombre, clase] of [
        ["ScNavTrigger", claseDe(trigger)],
        ["ScNavPanelLink", claseDe(panelLink)],
      ] as const) {
        expect(
          clase,
          `no se encontro la clase inyectada de ${nombre}`,
        ).not.toBe("");
        const activeRule = reglas.find(
          (r) =>
            r.includes(clase) &&
            r.includes(":active") &&
            r.includes("transform"),
        );
        expect(
          activeRule,
          `${nombre} no declara ninguna regla :active con transform`,
        ).toBeDefined();
        expect(activeRule).toContain(`scale(${PRESS.activeScale})`);
      }
    });

    /*
     * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
     * con el bug inyectado a propósito (ver informe de la tarea): comentando
     * temporalmente `touch-action: manipulation;` de ScNavLink en
     * Navbar.tsx, este test se pone en rojo; restaurado, vuelve a verde.
     */
    it("Task 13: ScNavTrigger y ScNavPanelLink (que hereda de ScNavLink) declaran touch-action: manipulation", () => {
      renderNavbar();
      const reglas = allCssRules();
      const claseDe = (el: Element): string =>
        Array.from(el.classList).find((c) =>
          reglas.some((r) => r.includes(c)),
        ) ?? "";

      const trigger = getTrigger(MORE);
      fireEvent.click(trigger);
      const panelId = trigger.getAttribute("aria-controls") as string;
      const panel = document.getElementById(panelId) as HTMLElement;
      const panelLink = panel.querySelector("a") as HTMLElement;

      for (const [nombre, clase] of [
        ["ScNavTrigger", claseDe(trigger)],
        ["ScNavPanelLink", claseDe(panelLink)],
      ] as const) {
        expect(
          clase,
          `no se encontro la clase inyectada de ${nombre}`,
        ).not.toBe("");
        expect(
          reglas.some(
            (r) =>
              r.includes(clase) && r.includes("touch-action: manipulation"),
          ),
          `${nombre} no declara touch-action: manipulation`,
        ).toBe(true);
      }
    });

    /*
     * Task 9, punto 5 del brief: ScNavPanel gana su transform-origin anclado
     * a la esquina de la que cuelga -- `top right` desde la decision D2
     * (2026-09-02), `top left` hasta entonces, cuando cada uno de los cuatro
     * grupos colgaba de su propio disparador y ninguno estaba pegado al filo
     * de la pildora; hoy el unico disclosure es el ULTIMO elemento de la fila
     * y su panel tiene que crecer hacia DENTRO de la barra, no hacia el borde.
     * El resto del contrato no cambia:
     * el estado cerrado suma scale(OVERLAY.closedScale) al translateY
     * existente, y la asimetría 120/180 (regla 26 de RULES.md) se resuelve
     * con dos declaraciones de transition -- base (cierre) y
     * [data-open="true"] (abierto) -- sin estado de React nuevo. Desde Task
     * 17, los tres valores vienen de `OVERLAY` (`src/motion/vocabulary.ts`),
     * no de literales locales. Validado con el bug inyectado a propósito
     * (ver informe de la tarea, tabla ScNavPanel): comentando temporalmente
     * el scale/transform-origin, o igualando las dos duraciones, el test
     * correspondiente se pone en rojo; restaurado, vuelve a verde.
     */
    it("ScNavPanel: transform-origin: top right, scale(OVERLAY.closedScale) en cerrado, y asimetria OVERLAY.closeMs/openMs con la curva de PRESS.easing", () => {
      renderNavbar();
      const trigger = getTrigger(MORE);
      const panelId = trigger.getAttribute("aria-controls") as string;
      const panel = document.getElementById(panelId) as HTMLElement;
      const css = cssRuleTextFor(panel);

      expect(css).toContain("transform-origin: top right");
      // El anclaje del layout va con el del transform-origin: un panel que
      // encoge hacia la derecha pero crece hacia la derecha es el mismo bug
      // que el transform-origin existe para evitar, en el otro eje.
      expect(css).toContain("right: 0");

      // Estado cerrado (base, ANTES de [data-open="true"]): scale(0.97)
      // sumado al translateY(-4px) que ya existía.
      const openIndex = css.indexOf('[data-open="true"]');
      expect(openIndex).toBeGreaterThan(-1);
      const closedRule = css.slice(0, openIndex);
      expect(closedRule).toContain(
        `translateY(-4px) scale(${OVERLAY.closedScale})`,
      );
      expect(closedRule).toContain(`${OVERLAY.closeMs}ms`);
      expect(closedRule).toContain(PRESS.easing);

      // Estado abierto: transition PROPIA (regla 26), 180ms, misma curva.
      const openRule = css.slice(openIndex);
      expect(openRule).toContain(`${OVERLAY.openMs}ms`);
      expect(openRule).toContain(PRESS.easing);
      expect(openRule).not.toContain(`${OVERLAY.closeMs}ms`);
    });
  });

  /*
   * Tarea 1 (navegación accesible), punto 1 del brief: los enlaces de
   * sección del navbar (panel de escritorio) y de la hoja (Task 10)
   * reflejan la sección visible con aria-current="location", detectado por
   * el motor existente (useSectionProgress/data-inview, ver
   * useActiveSection.ts -- reutilizado, sin IntersectionObserver nuevo).
   *
   * Las secciones reales (Story/Journey/Features/Contact) no se montan en
   * estos tests (solo se renderiza <Navbar/>), así que se simulan con
   * cuatro <div id="story|journey|features|contact"> sueltos en
   * document.body y se pilota su dataset.inview a mano -- exactamente la
   * señal que useSectionProgress escribiría en producción sobre esos mismos
   * ids reales (ver Story.tsx/Journey.tsx/Features.tsx/Contact.tsx,
   * id="story" etc.).
   */
  describe("sección activa del scroll (Tarea 1, useActiveSectionKey)", () => {
    const SCROLLSPY_IDS = ["story", "journey", "features", "contact"];

    function mockScrollSections(): void {
      for (const id of SCROLLSPY_IDS) {
        const el = document.createElement("div");
        el.id = id;
        document.body.appendChild(el);
      }
    }

    function setInView(id: string, inView: boolean): void {
      const el = document.getElementById(id);
      if (!el) throw new Error(`no existe la sección de prueba #${id}`);
      el.dataset.inview = inView ? "true" : "false";
    }

    function fireScroll(): void {
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
    }

    beforeEach(() => {
      vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
      mockScrollSections();
    });

    afterEach(() => {
      for (const id of SCROLLSPY_IDS) {
        document.getElementById(id)?.remove();
      }
    });

    it("sin ninguna sección en pantalla, ningún enlace de sección tiene aria-current", () => {
      const { container } = renderNavbar();

      for (const href of ["/#story", "/#journey", "/#features", "/#contact"]) {
        expect(
          container.querySelector(`a[href="${href}"]`),
        ).not.toHaveAttribute("aria-current");
      }
    });

    it("al entrar 'journey' en pantalla, su enlace del panel de escritorio gana aria-current='location' y los demás no", () => {
      const { container } = renderNavbar();

      setInView("journey", true);
      fireScroll();

      expect(container.querySelector('a[href="/#journey"]')).toHaveAttribute(
        "aria-current",
        "location",
      );

      for (const href of ["/#story", "/#features", "/#contact"]) {
        expect(
          container.querySelector(`a[href="${href}"]`),
        ).not.toHaveAttribute("aria-current");
      }
    });

    it("el mismo estado llega también a la hoja de navegación móvil (la otra superficie, Task 10)", () => {
      const { container } = renderNavbar();

      setInView("features", true);
      fireScroll();

      const hoja = container.querySelector("[data-nav-sheet]") as HTMLElement;
      expect(hoja.querySelector('a[href="/#features"]')).toHaveAttribute(
        "aria-current",
        "location",
      );
    });

    /*
     * MAPEO ANCLA -> SECCIÓN, escrito como candado (crítica externa #8, punto
     * 1). Los tres ítems de «Descubre» apuntan DENTRO de Features
     * (`/#feature-*-title`), así que "¿cuál es su sección activa?" tiene dos
     * respuestas posibles y hay que elegir una: encender los tres a la vez
     * cuando Features está en pantalla, o encender solo el ítem de sección
     * («Características») y dejarlos apagados. Se elige la segunda:
     * `aria-current="location"` significa "la ubicación ACTUAL", en singular
     * -- tres enlaces marcados a la vez dentro del mismo menú no señalan una
     * ubicación, la difuminan --, y el ítem que sí representa esa ubicación
     * ya existe y es único. Los `kind: "feature"` son títulos de contenido,
     * no destinos de scrollspy (ver `navigation.ts`).
     *
     * REESCRITO el 2026-08-17: hasta hoy este test se llamaba "los enlaces de
     * discover (mismo href #features, kind distinto)" y filtraba
     * `a[href="/#features"]`. Esa premisa caducó el 2026-08-16, cuando los
     * tres destinos de «Descubre» se separaron: desde entonces ese selector
     * ya solo encuentra los DOS enlaces de sección, y la parte de "discover"
     * del test había dejado de comprobar absolutamente nada -- pasaba en
     * verde por vacuidad, con el nombre describiendo un código que ya no
     * existía (regla 16). Ahora los hrefs se leen de `NAV_GROUPS` (regla 39),
     * así que no pueden volver a caducar en silencio.
     *
     * Validado con el bug inyectado a propósito: implementando la OTRA rama
     * del mapeo en `Navbar.tsx` (`|| (item.kind === "feature" &&
     * activeSectionKey === "features")`), este test cae en rojo nombrando el
     * enlace de discover que se encendió; restaurado, vuelve a verde.
     */
    it("con Features en pantalla se enciende su ítem de sección, y ninguno de los tres de «Descubre»", () => {
      const { container } = renderNavbar();

      setInView("features", true);
      fireScroll();

      // El item kind: "section", en sus DOS superficies (panel de escritorio
      // + hoja móvil), que es donde vive el único "estás aquí" del modelo.
      const conAriaCurrent = Array.from(
        container.querySelectorAll('a[href="/#features"]'),
      ).filter((a) => a.hasAttribute("aria-current"));
      expect(conAriaCurrent).toHaveLength(2);

      const discoverHrefs = NAV_GROUPS.flatMap((group) => group.items)
        .filter((item) => item.kind === "feature")
        .map((item) => item.href);
      expect(discoverHrefs.length).toBeGreaterThan(0);

      for (const href of discoverHrefs) {
        const enlaces = Array.from(
          container.querySelectorAll(`a[href="${href}"]`),
        );
        expect(
          enlaces.length,
          `«${href}» no se monta en ninguna superficie`,
        ).toBeGreaterThan(0);
        enlaces.forEach((enlace) => {
          expect(
            enlace,
            `«${href}» se marca como ubicación actual a la vez que «Características»`,
          ).not.toHaveAttribute("aria-current");
        });
      }
    });

    /*
     * Indicador visual (punto 1 del brief: "token de tema, no color nuevo",
     * "animando solo opacity/transform"). Validado con el bug inyectado a
     * propósito (ver informe de la tarea): comentando temporalmente el
     * bloque `&[aria-current="location"]::before` de ScNavPanelLink
     * (Navbar.tsx) este test se pone en rojo; restaurado, vuelve a verde.
     *
     * ACTUALIZADO (fix wave A, hallazgo A4, WCAG 1.4.11): el color YA NO es
     * `semantic.brand` a secas en las dos ramas -- ver el docblock de
     * `navActiveAccent` (`NavSheet.tsx`). Este test renderiza en tema CLARO
     * (default de `renderNavbar()`, sin storage de tema), así que el valor
     * esperado es `navActiveAccent({ data: basicLightTheme })`
     * (`brandText`), medido contra la MISMA función que pinta el punto real
     * -- nunca un literal de tema copiado a mano, que se desincronizaría
     * del código real al primer retoque sin que nada lo delate. El
     * contraste en sí (2.277:1 -> 5.837:1) lo mide
     * `navActiveAccent.contrast.test.ts`, no este fichero.
     */
    it("el punto indicador (::before) pasa de opacity:0/scale(0.5) a opacity:1/scale(1) bajo [aria-current='location'], con navActiveAccent(theme)", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();

      // Un enlace DEL PANEL, no de la barra: desde la decision D2 los cuatro
      // destinos de seccion salieron del panel y `a[href="/#story"]` ya no lo
      // encuentra ahi (es `ScNavSectionLink`, que lleva subrayado en vez de
      // punto -- ver su propio candado mas abajo). El punto sigue siendo la
      // pieza de `ScNavPanelLink`, asi que se mide sobre un item del panel.
      const link = container.querySelector(
        'a[href="/#feature-learning-title"]',
      ) as HTMLElement;
      // La clase que interesa aquí es la que lleva la regla `::before`
      // -- no la primera clase inyectada cualquiera del `classList`, que
      // encontraría antes la clase base de ScNavLink (hover/:active, sin
      // ::before propio) por composición `styled(ScNavLink)`.
      const clase = Array.from(link.classList).find((c) =>
        reglas.some((r) => r.includes(c) && r.includes("::before")),
      );
      expect(
        clase,
        "no se encontró la clase con la regla ::before inyectada",
      ).toBeTruthy();

      const before = reglas.find(
        (r) => r.includes(`.${clase}::before`) && !r.includes("aria-current"),
      );
      expect(before, "no se encontró la regla ::before base").toBeDefined();
      expect(before).toContain("opacity: 0");
      expect(before).toContain("scale(0.5)");
      expect(before).toContain(navActiveAccent({ data: basicLightTheme }));

      const activo = reglas.find((r) =>
        r.includes(`.${clase}[aria-current="location"]::before`),
      );
      expect(
        activo,
        "no se encontró la regla ::before del estado activo",
      ).toBeDefined();
      expect(activo).toContain("opacity: 1");
      expect(activo).toContain("scale(1)");
    });

    /*
     * TAMAÑO del punto (crítica externa #11, hallazgo A, P2). El evaluador
     * midió 4x4 px con contraste 5.8:1 -- el color ya estaba resuelto (fix
     * wave A, hallazgo A4), lo que fallaba era el tamaño de un indicador que
     * es el ÚNICO signo de "estás aquí" del panel. Sube a `space[2]` (8px),
     * el mismo diámetro que la marca del rail de Journey; ver el docblock de
     * `ScNavPanelLink` (`Navbar.tsx`) para el porqué completo.
     *
     * El valor esperado se lee del TOKEN importado, nunca de un literal
     * escrito a mano (regla 38): un test que compara "0.5rem" contra sí mismo
     * sigue en verde el día que el token cambie de valor.
     *
     * Validado con el bug inyectado a propósito (regla 34): devuelta la
     * `width` del `::before` de `ScNavPanelLink` a `space[1]`, este test cae
     * en rojo ("el punto del panel volvió a 4x4 px"); restaurada la línea a
     * `space[2]`, vuelve a verde.
     */
    it("el punto indicador mide space[2] (8px), no space[1] (4px)", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();

      const link = container.querySelector(
        'a[href="/#feature-learning-title"]',
      ) as HTMLElement;
      const clase = Array.from(link.classList).find((c) =>
        reglas.some((r) => r.includes(c) && r.includes("::before")),
      );
      const before = reglas.find(
        (r) => r.includes(`.${clase}::before`) && !r.includes("aria-current"),
      );
      expect(before, "no se encontró la regla ::before base").toBeDefined();

      const esperado = basicLightTheme.space[2];
      expect(before, "el punto del panel volvió a 4x4 px").toContain(
        `width: ${esperado}`,
      );
      expect(before).toContain(`height: ${esperado}`);
      // Y la mitad exacta -- el valor viejo -- ya no aparece en la regla: si
      // width subiera y height no, este assert lo caza.
      expect(before).not.toContain(basicLightTheme.space[1]);
    });

    /*
     * SEÑAL VISIBLE DE SECCIÓN ACTUAL, AHORA EN EL ENLACE QUE LA REPRESENTA
     * (decisión D2, 2026-09-02, crítica #14).
     *
     * Aquí vivió el bloque "señal visible con los paneles plegados (T3)"
     * (2026-08-20, ola post-crítica #13). Aquellos tres candados afirmaban que
     * el DISPARADOR del grupo que contenía la sección activa se subrayaba y
     * los otros tres no. Era un sustituto declarado como tal: el enlace que
     * llevaba `aria-current` vivía dentro de un panel cerrado, así que la
     * marca del disparador solo podía responder «la sección que lees está en
     * este grupo», nunca «cuál es» -- y su propio docblock dejaba esa segunda
     * mitad pendiente de una decisión del dueño.
     *
     * D2 la toma: los cuatro destinos de sección son enlaces visibles de la
     * barra, así que la marca visual y `aria-current` vuelven a vivir en el
     * MISMO elemento. El candado nuevo afirma justo eso, y por eso NO es una
     * relajación del viejo: comprueba una propiedad más fuerte (el subrayado
     * está atado al atributo por selector CSS, no calculado por una prop en
     * paralelo, así que no pueden divergir) sobre el elemento correcto.
     *
     * Se afirma sobre el CSSOM y no sobre `getComputedStyle` porque jsdom no
     * evalúa el selector de atributo al calcular estilo ni pinta nada: el
     * subrayado no se puede observar, solo su declaración.
     */
    describe("señal visible de sección actual en la barra (decisión D2)", () => {
      /** Reglas inyectadas que pertenecen a alguna clase de `el`. */
      function reglasDe(el: Element): string {
        const reglas = allCssRules();
        const clases = Array.from(el.classList).filter((c) =>
          reglas.some((r) => r.includes(c)),
        );
        expect(
          clases.length,
          "no se encontró ninguna clase inyectada del enlace",
        ).toBeGreaterThan(0);
        return reglas
          .filter((r) => clases.some((c) => r.includes(c)))
          .join("\n");
      }

      function barLink(container: HTMLElement, href: string): HTMLElement {
        const el = container.querySelector(
          `[data-nav-links] a[href="${href}"]`,
        );
        expect(el, `la barra no monta el enlace ${href}`).not.toBeNull();
        return el as HTMLElement;
      }

      it("el enlace de la sección activa lleva aria-current, y solo él", () => {
        const { container } = renderNavbar();
        setInView("journey", true);
        fireScroll();

        for (const item of navBarSectionsFor("es")) {
          const esperado = item.key === "journey" ? "location" : null;
          const enlace = barLink(container, item.href);
          expect(
            enlace.getAttribute("aria-current"),
            `${item.key} no refleja el scrollspy en la barra`,
          ).toBe(esperado);
        }
      });

      it("el subrayado cuelga del propio aria-current, no de una prop paralela", () => {
        const { container } = renderNavbar();
        setInView("journey", true);
        fireScroll();

        const reglas = reglasDe(barLink(container, "/#journey"));
        // El offset acompaña siempre (no depende del estado): sin él, el
        // subrayado se pega al descendente de la tipografía a este tamaño.
        expect(reglas).toContain("text-underline-offset: 0.2em");
        const subrayado = allCssRules().find(
          (r) =>
            r.includes('[aria-current="location"]') &&
            r.includes("text-decoration: underline"),
        );
        expect(
          subrayado,
          "el enlace de sección no declara el subrayado atado a aria-current",
        ).toBeDefined();
      });

      it("sin ninguna sección en pantalla (el lector está en el Hero) ningún enlace de la barra lleva aria-current", () => {
        const { container } = renderNavbar();

        for (const item of navBarSectionsFor("es")) {
          expect(barLink(container, item.href)).not.toHaveAttribute(
            "aria-current",
          );
        }
      });

      /*
       * El suelo táctil de la fila: los enlaces nuevos comparten banda con
       * `ScNavTrigger`, `ScBrandLink` y `ScLanguageButton`, que ya declaran
       * 44px. Muy por encima del mínimo de 24x24 de WCAG 2.5.8, y el mismo
       * valor que el resto de la fila para que la diana no dependa de qué
       * control se pulse.
       */
      it("los enlaces de sección declaran el suelo táctil de 44px", () => {
        const { container } = renderNavbar();
        const reglas = reglasDe(barLink(container, "/#story"));
        expect(reglas).toContain("min-height: 44px");
      });
    });
  });

  /*
   * SALIDA SIN JAVASCRIPT DEL DISCLOSURE (crítica externa #11, hallazgo A, P1
   * -- y la corrección de su ALCANCE por la decisión D2).
   *
   * El hallazgo original: con `javaScriptEnabled: false` los cuatro
   * disparadores se pintaban con su galón y, al pulsarlos, `aria-expanded`
   * seguía en `"false"` sin abrir nada ni explicar nada. La apertura es estado
   * de React, así que no hay forma de que funcione: se retira, igual que la
   * ola anterior retiró el conmutador de tema, el selector de idioma y el
   * disparador de la hoja (commit `acbbcf4`). El pie expone los mismos
   * destinos como enlaces planos, así que nadie se queda sin salida.
   *
   * QUÉ CAMBIA CON D2: el guard vivía sobre el CONTENEDOR (`ScNavLinks`) y
   * ahora vive sobre el disclosure (`ScNavGroup`). El docblock de aquel bloque
   * ya lo dejó escrito: "si algún día este bloque gana un enlace PLANO (que
   * sin JavaScript sí funcionaría), el guard baja a `ScNavGroup`". Los cuatro
   * destinos de sección son ahora exactamente eso, y este candado afirma las
   * DOS mitades: que el disclosure desaparece y que el contenedor NO.
   *
   * jsdom no evalúa ningún `@media` (regla 36): la condición se lee del CSSOM
   * acotada al bloque concreto, y la FORMA del selector se afirma sobre
   * `selectorText` (regla 35) -- tiene que apuntar al PROPIO elemento, no a
   * un descendiente suyo.
   *
   * Validado con el bug inyectado a propósito (regla 34): ver el informe de la
   * entrega -- se probaron las dos direcciones, borrar el `display: none` de
   * `ScNavGroup` y devolver el guard a `ScNavLinks`.
   */
  describe("crítica externa #11, hallazgo A: sin JavaScript el disclosure no se presenta (y los enlaces planos sí)", () => {
    /** El único disparador de la barra desde la decisión D2. `hidden: true`
     *  por el mismo motivo que documenta `getTrigger` en el bloque W4: jsdom
     *  no evalúa el `@media` de `md`, así que el contenedor computa
     *  `display: none` y `getByRole` daría por oculto lo que hay dentro. */
    function getTriggerMore(): HTMLElement {
      return screen.getByRole("button", { name: /^Más/i, hidden: true });
    }

    /** Reglas de estilo declaradas DENTRO de un `@media (scripting: none)`,
     *  mismo helper que `ThemeToggle.test.tsx` de la ola anterior. */
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

    it("el disclosure se retira con display: none sobre su PROPIA clase, y el contenedor NO", () => {
      const { container } = renderNavbar();
      const bloque = container.querySelector("[data-nav-links]") as HTMLElement;
      expect(bloque, "no se montó el bloque de navegación").not.toBeNull();
      const trigger = getTriggerMore();
      // `ScNavGroup` es el envoltorio del disclosure: el padre del disparador.
      const grupo = trigger.parentElement as HTMLElement;

      const sinScripting = reglasSinScripting();
      const reglasDe = (el: HTMLElement): CSSStyleRule[] => {
        const clases = Array.from(el.classList);
        return sinScripting.filter((regla) =>
          clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
        );
      };

      const propias = reglasDe(grupo);
      expect(
        propias.length,
        "el disclosure se sigue presentando sin JavaScript",
      ).toBeGreaterThan(0);
      propias.forEach((regla) => {
        // Mismo elemento, nunca un descendiente (regla 35).
        expect(regla.selectorText).not.toMatch(/\s/);
        expect(regla.style.display).toBe("none");
      });

      /*
       * LA OTRA MITAD, y la que cambia con D2: el CONTENEDOR no se puede
       * ocultar. Hasta esta entrega el guard vivía sobre `ScNavLinks` porque
       * todos sus hijos eran disclosures inservibles sin JavaScript. Ahora
       * cuatro de sus hijos son `<a href>` planos que navegan perfectamente
       * sin él: heredar el guard viejo borraría la navegación de escritorio
       * entera a cambio de nada.
       */
      expect(
        reglasDe(bloque),
        "sin JavaScript se están borrando también los cuatro enlaces de sección, que SÍ funcionan sin él",
      ).toHaveLength(0);
    });

    it("CON JavaScript no cambia nada: los cuatro enlaces y el disparador siguen montados, operables y sin tabindex propio en el contenedor", () => {
      const { container } = renderNavbar();
      const bloque = container.querySelector("[data-nav-links]") as HTMLElement;

      // Los cuatro destinos de sección siguen ahí como enlaces planos -- la
      // mitad que este guard NO puede tocar, porque funcionan sin JavaScript.
      // El recuento sale de `navBarSectionsFor` (regla 39), no de un 4
      // escrito a mano.
      for (const item of navBarSectionsFor("es")) {
        const enlace = bloque.querySelector(`a[href="${item.href}"]`);
        expect(
          enlace,
          `${item.key} dejó de vivir dentro del bloque de navegación`,
        ).not.toBeNull();
      }

      // Y el disparador sigue abriendo de verdad. `hidden: true` por el mismo
      // motivo que documenta `getTrigger` más arriba: jsdom no evalúa el
      // `@media` de `md`, así que el bloque computa `display: none` y
      // `getByRole` lo daría por oculto.
      const disparador = getTriggerMore();
      expect(
        bloque.contains(disparador),
        "el disparador dejó de vivir dentro del bloque de navegación",
      ).toBe(true);
      expect(disparador).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(disparador);
      expect(disparador).toHaveAttribute("aria-expanded", "true");

      expect(bloque).not.toHaveAttribute("tabindex");
      // La regla base del bloque sigue siendo la MÓVIL (mobile-first): sin el
      // `@media` de `md`, que jsdom no evalúa, lo computado es `none`. Lo que
      // importa aquí es que el guard no la haya alterado.
      expect(getComputedStyle(bloque).display).toBe("none");
    });
  });

  /*
   * EL PUNTO DE SECCIÓN ACTIVA, EN LAS DOS SUPERFICIES (crítica externa #11,
   * hallazgo A, P2). `ScSheetRow` (`NavSheet.tsx`) y `ScNavPanelLink`
   * (`Navbar.tsx`) son dos árboles de estilos independientes a propósito
   * (deuda documentada en RULES.md), pero el docblock de `ScSheetRow` declara
   * por escrito que comparten "mismo lenguaje visual y mismo criterio". Esa
   * invariante cruza dos ficheros, así que vive en un test que los mide a los
   * dos (regla 41) y no en la memoria de quien tocó uno de ellos: sin este
   * candado, subir solo el punto del panel dejaría el de la hoja a la mitad
   * y la frase del docblock convertida en mentira, con la suite en verde.
   *
   * Validado con el bug inyectado a propósito (regla 34): devuelta la `width`
   * del `::before` de `ScSheetRow` a `space[1]`, este test cae en rojo ("el
   * punto de la hoja volvió a 4x4 px"); restaurada a `space[2]`, vuelve a
   * verde.
   */
  describe("crítica externa #11, hallazgo A: el punto de sección activa mide lo mismo en la hoja y en el panel", () => {
    /** Regla `::before` BASE (sin el estado `aria-current`) de un enlace. */
    function beforeBaseDe(link: HTMLElement, reglas: string[]): string {
      const clase = Array.from(link.classList).find((c) =>
        reglas.some((r) => r.includes(c) && r.includes("::before")),
      );
      const regla = reglas.find(
        (r) => r.includes(`.${clase}::before`) && !r.includes("aria-current"),
      );
      expect(regla, "no se encontró la regla ::before base").toBeDefined();
      return regla as string;
    }

    it("la fila de la hoja declara el mismo diámetro que el item del panel, y es space[2]", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();
      const esperado = basicLightTheme.space[2];

      const fila = container.querySelector(
        '[data-nav-sheet] a[href="/#story"]',
      ) as HTMLElement;
      expect(fila, "no se montó ninguna fila de la hoja").not.toBeNull();
      const filaBefore = beforeBaseDe(fila, reglas);

      expect(filaBefore, "el punto de la hoja volvió a 4x4 px").toContain(
        `width: ${esperado}`,
      );
      expect(filaBefore).toContain(`height: ${esperado}`);

      // Y el panel de escritorio declara EXACTAMENTE lo mismo: la invariante
      // que el docblock de ScSheetRow promete, medida y no recordada.
      // El item DEL PANEL, no el enlace de la barra: desde la decisión D2 los
      // destinos de sección salieron del panel, así que la pieza comparable
      // con la fila de la hoja es un item que siga viviendo dentro
      // (`ScNavPanelLink`, que es quien declara el punto).
      const item = container.querySelector(
        '[data-nav-links] a[href="/#feature-learning-title"]',
      ) as HTMLElement;
      expect(item, "no se montó ningún item del panel").not.toBeNull();
      const itemBefore = beforeBaseDe(item, reglas);
      expect(itemBefore).toContain(`width: ${esperado}`);
      expect(itemBefore).toContain(`height: ${esperado}`);
    });
  });

  /**
   * Texto CSS de las reglas que styled-components inyectó para un elemento
   * concreto (jsdom no evalúa ningún @media, regla 36): mismo patrón que
   * Story.test.tsx/Footer.test.tsx, necesario aquí para acotar el guard de
   * ScNavPanel a SU PROPIA clase en vez de al stylesheet completo.
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

  describe("despegue al hacer scroll (data-detach, plan navbar-scroll-detach Task 3)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        vi.runOnlyPendingTimers();
      });
      vi.useRealTimers();
    });

    it("al montar, el banner tiene data-detach='idle'", () => {
      renderNavbar();
      expect(screen.getByRole("banner")).toHaveAttribute("data-detach", "idle");
    });

    it("tras scrollPast() el banner pasa a 'detaching' y vuelve a 'idle' tras NAV_DETACH_ANIM_MS", () => {
      renderNavbar();
      const header = screen.getByRole("banner");

      scrollPast();
      expect(header).toHaveAttribute("data-detach", "detaching");

      act(() => {
        vi.advanceTimersByTime(NAV_DETACH_ANIM_MS);
      });
      expect(header).toHaveAttribute("data-detach", "idle");
    });

    it("al volver a scrollY=0 tras un despegue ya asentado, el banner pasa a 'attaching'", () => {
      renderNavbar();
      const header = screen.getByRole("banner");

      scrollPast();
      act(() => {
        vi.advanceTimersByTime(NAV_DETACH_ANIM_MS);
      });
      expect(header).toHaveAttribute("data-detach", "idle");

      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: 0,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });
      expect(header).toHaveAttribute("data-detach", "attaching");
    });

    it("existe exactamente una superficie [data-nav-surface], oculta a lectores de pantalla", () => {
      const { container } = renderNavbar();
      const surfaces = container.querySelectorAll("[data-nav-surface]");

      expect(surfaces).toHaveLength(1);
      expect(surfaces[0]).toHaveAttribute("aria-hidden", "true");
    });

    it("con scroll, el contenedor de geometría computa max-width=grid.navMax y la superficie computa border-radius=radius.xl (contra el token importado)", () => {
      // `ScNav` (el `<nav>`) es hijo directo de `ScBar`, el contenedor de
      // geometría: no hay ningún atributo propio que lo distinga, así que se
      // llega a él por relación de parentesco, no por un selector nuevo.
      const { container } = renderNavbar();
      const nav = screen.getByRole("navigation");
      const geometryContainer = nav.parentElement as HTMLElement;
      const surface = container.querySelector(
        "[data-nav-surface]",
      ) as HTMLElement;

      scrollPast();

      expect(getComputedStyle(geometryContainer).maxWidth).toBe(
        basicLightTheme.grid.navMax,
      );
      expect(getComputedStyle(surface).borderRadius).toBe(
        basicLightTheme.radius.xl,
      );
    });

    it("el CSS inyectado declara las dos animaciones solo bajo no-preference, y anula las transiciones bajo reduce", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();
      // Las clases REALES de las dos capas nuevas, leidas del DOM: sin esto,
      // buscar "cualquier regla con reduce + transition: none" pasaria en
      // verde aunque ScBar y ScSurface se quedaran sin guard, porque ScHeader
      // y ScNavLink ya tenian el suyo desde antes de esta tarea.
      const surface = container.querySelector(
        "[data-nav-surface]",
      ) as HTMLElement;
      const bar = screen.getByRole("navigation").parentElement as HTMLElement;
      const claseDe = (el: HTMLElement): string =>
        Array.from(el.classList).find((c) =>
          reglas.some((r) => r.includes(c)),
        ) ?? "";

      for (const [nombre, clase] of [
        ["ScSurface", claseDe(surface)],
        ["ScBar", claseDe(bar)],
      ] as const) {
        expect(
          clase,
          `no se encontro la clase inyectada de ${nombre}`,
        ).not.toBe("");
        const guard = reglas.filter(
          (regla) =>
            regla.includes("@media (prefers-reduced-motion: reduce)") &&
            regla.includes(clase) &&
            regla.includes("transition: none"),
        );
        expect(
          guard.length,
          `${nombre} no anula sus transiciones bajo prefers-reduced-motion: reduce`,
        ).toBeGreaterThan(0);
      }

      const bloqueNoPreference = reglas.find(
        (regla) =>
          regla.includes("@media (prefers-reduced-motion: no-preference)") &&
          regla.includes('[data-detach="detaching"]') &&
          regla.includes('[data-detach="attaching"]'),
      );
      expect(bloqueNoPreference).toBeDefined();
      // Dos disparadores ([data-detach="detaching"] y [data-detach="attaching"])
      // cada uno con su propia declaracion `animation:` (peelOff y stickOn,
      // nombres hasheados por styled-components, así que se cuentan las
      // declaraciones en vez de buscar el nombre literal).
      expect(
        (bloqueNoPreference?.match(/animation:/g) ?? []).length,
      ).toBeGreaterThanOrEqual(2);

      const bloqueReduce = reglas.filter(
        (regla) =>
          regla.includes("@media (prefers-reduced-motion: reduce)") &&
          regla.includes("transition: none"),
      );
      expect(bloqueReduce.length).toBeGreaterThan(0);
    });

    it('el guard de reduce de ScBar también redeclara el estado anidado [data-scrolled="true"] & (hallazgo 4)', () => {
      // Regresión puntual: el bloque reduce de ScBar solo redeclaraba `&`
      // (una clase, especificidad 0-1-0). El estado scrolled se declara como
      // `[data-scrolled="true"] &` (atributo + clase, 0-2-0) FUERA del
      // bloque reduce, con su propia transition (easings reales, no
      // "none") -- mayor especificidad que el `&` suelto del reduce, así
      // que bajo prefers-reduced-motion: reduce esa transition seguía
      // ganando y el estado scrolled continuaba animando. El arreglo iguala
      // el patrón ya usado por ScHeader, que SÍ redeclara su propio estado
      // anidado (&[data-intro="pending"]) dentro de su bloque reduce (ver
      // el test de arriba, "existe el bloque prefers-reduced-motion...").
      renderNavbar();
      const reglas = allCssRules();
      const bar = screen.getByRole("navigation").parentElement as HTMLElement;
      const claseDe = (el: HTMLElement): string =>
        Array.from(el.classList).find((c) =>
          reglas.some((r) => r.includes(c)),
        ) ?? "";
      const claseBar = claseDe(bar);
      expect(claseBar, "no se encontro la clase inyectada de ScBar").not.toBe(
        "",
      );

      const bloqueScrolledReduce = reglas.filter(
        (regla) =>
          regla.includes("@media (prefers-reduced-motion: reduce)") &&
          regla.includes('[data-scrolled="true"]') &&
          regla.includes(claseBar) &&
          regla.includes("transition: none"),
      );
      expect(
        bloqueScrolledReduce.length,
        'el guard de reduce de ScBar no redeclara [data-scrolled="true"] &',
      ).toBeGreaterThan(0);
    });
  });

  /*
   * HOJA DE NAVEGACIÓN MÓVIL (Task 10 de la auditoría premium).
   *
   * Los tests viven aquí, y no en un `NavSheet.test.tsx` propio, porque la
   * hoja no es renderizable por sí sola: sus dos piezas (el disparador,
   * dentro de la barra; la hoja, fuera de `ScHeader`) comparten un estado que
   * vive en `Navbar()`, así que el único montaje que reproduce el componente
   * real es el del Navbar completo -- que es también lo que este fichero ya
   * hace para el panel de escritorio.
   *
   * LÍMITE DE JSDOM QUE CONDICIONA TODAS LAS CONSULTAS: `@testing-library/dom`
   * v10 excluye del árbol accesible el contenido de un subárbol con `inert`, y
   * la opción `hidden: true` NO lo revierte (verificado empíricamente con una
   * sonda antes de escribir estos tests, no supuesto). Con la hoja cerrada,
   * por tanto, sus filas son invisibles para `getByRole` incluso con
   * `hidden: true`: o se abre la hoja primero, o se consulta el DOM por
   * `container`. Es el mismo comportamiento que el panel de escritorio ya
   * tenía, solo que allí los tests siempre abren el panel antes de consultar.
   */
  describe("hoja de navegación móvil (Task 10)", () => {
    /** Etiqueta real de `Common.Nav.openMenu`/`closeMenu` en es-ES: la misma
     *  expresión sirve para los dos estados (solo cambia el verbo), y solo
     *  hay un disparador de hoja en la barra. */
    const DISPARADOR = /menú de navegación/i;

    function getSheetTrigger(): HTMLElement {
      return screen.getByRole("button", { name: DISPARADOR, hidden: true });
    }

    function getSheet(container: HTMLElement): HTMLElement {
      const hoja = container.querySelector("[data-nav-sheet]");
      expect(hoja, "no se monta ninguna hoja de navegación").not.toBeNull();
      return hoja as HTMLElement;
    }

    function focalizablesDe(hoja: HTMLElement): HTMLElement[] {
      return Array.from(
        hoja.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
    }

    /*
     * Candados de la Ola C.1 (2026-08-16): la hoja pasa a ser un diálogo de
     * verdad. Antes tenía todo el COMPORTAMIENTO —velo opaco real, foco que
     * entra al abrir, Escape que cierra y devuelve el foco al disparador— y
     * nada de la SEMÁNTICA, y además el foco se escapaba por el final: medido
     * en navegador real a 390px, tabular más allá del último elemento llevaba
     * el foco a Features y el navegador arrastraba la página de `scrollY` 0 a
     * 12.539, sin ningún aviso y sin forma de volver.
     *
     * Validados con bugs inyectados a propósito: quitando `role="dialog"` de
     * `ScNavSheet` cae el primero; quitando la rama de `Tab` del `keydown` cae
     * el segundo. Restaurados, los dos vuelven a verde.
     */
    it("es un role=dialog y solo declara aria-modal mientras está abierta", () => {
      const { container } = renderWithProviders(<Navbar />);
      const hoja = getSheet(container);
      expect(hoja).toHaveAttribute("role", "dialog");
      expect(
        hoja.getAttribute("aria-modal"),
        "cerrada la hoja sigue en el DOM: declarar aria-modal afirmaría que hay un modal activo cuando no lo hay",
      ).toBeNull();

      act(() => {
        fireEvent.click(getSheetTrigger());
      });
      expect(hoja).toHaveAttribute("aria-modal", "true");
    });

    it("el foco cicla dentro de la hoja en los dos sentidos", () => {
      const { container } = renderWithProviders(<Navbar />);
      const hoja = getSheet(container);
      act(() => {
        fireEvent.click(getSheetTrigger());
      });

      const focalizables = focalizablesDe(hoja);
      expect(focalizables.length).toBeGreaterThan(1);
      const primero = focalizables[0];
      const ultimo = focalizables[focalizables.length - 1];

      act(() => {
        ultimo.focus();
      });
      act(() => {
        fireEvent.keyDown(document, { key: "Tab" });
      });
      expect(
        document.activeElement,
        "el foco se escapó por el final: fuera de la hoja le espera un salto de 12.539 px",
      ).toBe(primero);

      act(() => {
        fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      });
      expect(
        document.activeElement,
        "el foco se escapó hacia atrás: es el mismo defecto por el otro lado",
      ).toBe(ultimo);
    });

    /** Primera clase del elemento que aparece en alguna regla inyectada. */
    function claseInyectadaDe(el: Element, reglas: string[]): string {
      return (
        Array.from(el.classList).find((c) =>
          reglas.some((r) => r.includes(c)),
        ) ?? ""
      );
    }

    /** Reglas `@media` cuyo texto casa con `patron` y menciona `clase`.
     *  jsdom no evalúa ningún `@media` (regla 36): la única forma honesta de
     *  afirmar algo sobre una regla condicionada es leerla del CSSOM. */
    function reglasEnMedia(
      reglas: string[],
      patron: RegExp,
      clase: string,
    ): string[] {
      return reglas.filter(
        (regla) =>
          regla.startsWith("@media") &&
          patron.test(regla) &&
          regla.includes(clase),
      );
    }

    const MEDIA_MD = /min-width:\s*768px/;
    /** Salida sin JavaScript (crítica externa #10, hallazgo A): el feature que
     *  distingue "JavaScript desactivado o no soportado", ya sancionado en el
     *  repo (GlobalStyles.tsx, auraStagger, eyeStagger). */
    const MEDIA_SIN_JS = /scripting:\s*none/;
    const MEDIA_REDUCE = /prefers-reduced-motion:\s*reduce/;

    it("el disparador existe, arranca cerrado y su aria-controls apunta al id real de la hoja", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();

      expect(trigger).toHaveAttribute("aria-expanded", "false");

      const sheetId = trigger.getAttribute("aria-controls");
      expect(sheetId).toBeTruthy();
      // `useId()` genera ids con ":" (no son selectores CSS válidos):
      // getElementById, nunca querySelector("#…").
      const hoja = document.getElementById(sheetId as string);
      expect(hoja).toBe(getSheet(container));
    });

    /*
     * Crítica externa #9, punto 2 (medido sobre el árbol de accesibilidad real
     * por dos evaluadores). SUSTITUYE a la última aserción del test de arriba,
     * que hasta hoy exigía justo el defecto: `aria-labelledby` al id del
     * disparador. Ese vínculo funciona en el desplegable de escritorio, cuyo
     * disparador tiene texto fijo, y falla aquí porque el de la hoja cambia de
     * etiqueta al abrirse -- así que el diálogo se anunciaba como «Cerrar el
     * menú de navegación», la acción de un botón, precisamente en el único
     * momento en que su nombre se lee.
     *
     * El valor esperado se lee del JSON de es (regla 39: la misma fuente que
     * consume el componente), nunca de una cadena escrita a mano aquí. Y la
     * segunda aserción es la que ata el DEFECTO, no solo el arreglo: con la
     * hoja abierta, su nombre no puede coincidir con la etiqueta del
     * disparador.
     */
    it("la hoja tiene nombre accesible propio, distinto de la etiqueta del disparador (que cambia al abrirse)", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();
      const hoja = getSheet(container);

      expect(hoja).toHaveAttribute(
        "aria-label",
        esCommon.Common.Nav.sheetTitle,
      );
      expect(
        hoja,
        "aria-labelledby volvería a heredar el nombre del disparador y ganaría al aria-label",
      ).not.toHaveAttribute("aria-labelledby");

      act(() => {
        fireEvent.click(trigger);
      });

      expect(trigger).toHaveAttribute(
        "aria-label",
        esCommon.Common.Nav.closeMenu,
      );
      expect(
        hoja.getAttribute("aria-label"),
        "el diálogo se estaría anunciando con la acción del botón que lo abrió",
      ).not.toBe(trigger.getAttribute("aria-label"));
    });

    it("la hoja arranca cerrada con inert y data-open='false', pero SIN desmontarse", () => {
      const { container } = renderNavbar();
      const hoja = getSheet(container);

      expect(hoja).toHaveAttribute("inert");
      expect(hoja).toHaveAttribute("data-open", "false");
      // Sus filas siguen en el DOM aunque no sean alcanzables: mismo contrato
      // que ScNavPanel (el panel nunca se desmonta).
      expect(hoja.querySelectorAll("a[href]").length).toBeGreaterThan(0);
    });

    it("al pulsar el disparador la hoja se abre, pierde inert y el foco entra en su primera fila", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();
      const hoja = getSheet(container);

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(hoja).toHaveAttribute("data-open", "true");
      expect(hoja).not.toHaveAttribute("inert");
      // Diferencia DELIBERADA con el panel de escritorio (ver el docblock de
      // `useNavSheet`): la hoja vive al final del documento, así que un Tab
      // desde el disparador llevaría al contenido de la página en vez de a
      // la hoja -- y el cierre por foco fuera la haría inalcanzable por
      // teclado. El foco entra a mano en la primera fila.
      expect(document.activeElement).toBe(hoja.querySelector("a"));
    });

    it("una segunda pulsación del disparador la cierra (alterna)", () => {
      renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("Escape cierra la hoja y devuelve el foco al disparador", () => {
      renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      // El foco puede estar en cualquier fila cuando se pulsa Escape; el
      // manejador vive en `document`, no en un envoltorio común (la hoja no
      // puede tener uno, ver el docblock de `ScNavSheet`).
      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: "Escape",
      });

      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(document.activeElement).toBe(trigger);
    });

    /*
     * ...Y DEVUELVE EL FOCO AL DISPARADOR (crítica #14, P2).
     *
     * El defecto medido por el evaluador: tras cerrar con un clic fuera,
     * `document.activeElement` quedaba en `BODY`. Es la MISMA familia que el
     * repo ya pagó dos veces (fix wave A hallazgo A3 con el botón de cierre,
     * crítica externa #9 punto 1 con Escape) y por el mismo mecanismo: al
     * cerrarse, `ScNavSheet` recibe `inert`, y la focus fixup rule del HTML
     * resetea a `<body>` el foco que quedara dentro. Quien cierra la hoja con
     * el dedo y luego pulsa Tab no continúa desde el cabecero: vuelve a
     * empezar la página entera.
     *
     * El candado afirma las dos mitades a la vez -- que cierra Y dónde queda
     * el foco -- porque solo la primera es lo que ya había, y pasaba en verde
     * con el defecto delante.
     *
     * Validado con el bug inyectado a propósito (regla 34): ver el informe de
     * la entrega.
     */
    it("un pointerdown fuera del disparador y de la hoja la cierra, y devuelve el foco al disparador", () => {
      renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      fireEvent.pointerDown(document.body);

      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(
        document.activeElement,
        "cerrar con un toque fuera deja el foco huérfano en <body>: el siguiente Tab empieza la página de cero",
      ).toBe(trigger);
    });

    it("el foco saliendo de la hoja hacia un elemento externo la cierra", () => {
      renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      /* Nombre EXACTO, no `/VoidToInfinite/i`: con la hoja ABIERTA sus filas
         entran en el árbol de accesibilidad, y desde que `about` está en la
         navegación una de ellas se llama «Qué es VoidToInfinite» -- la
         expresión regular casaba con dos enlaces y `getByRole` fallaba por
         ambigüedad (regla 31, en su versión de nombre accesible). Los demás
         usos de este mismo `getByRole` en el fichero siguen con la expresión
         regular a propósito: ahí la hoja está CERRADA (`visibility: hidden`)
         y sus filas no están en el árbol. */
      const brandLink = screen.getByRole("link", { name: "VoidToInfinite" });

      // `focusin` SÍ burbujea (a diferencia de `focus`), que es justo por lo
      // que el contrato se implementa con él en `document`.
      fireEvent.focusIn(brandLink);

      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("activar una fila cierra la hoja", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      const fila = getSheet(container).querySelector(
        'a[href="/#story"]',
      ) as HTMLElement;

      fireEvent.click(fila);

      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    /*
     * Crítica externa #9, punto 1, en la TERCERA superficie. La hoja ya
     * llamaba al helper de foco al activar una fila (`handleRowActivate`), así
     * que ampliarlo a `kind: "section"` la cubre sin tocarla -- y justo por eso
     * hace falta el candado: nada en este fichero afirmaba esa propiedad para
     * la hoja, y el día que alguien "simplifique" `handleRowActivate` a un
     * `onNavigate` a secas, el panel de escritorio y el pie seguirían en verde.
     *
     * Ata además que las dos acciones conviven: la fila CIERRA la hoja y el
     * foco acaba en la sección, no en la primera fila ni en `<body>`.
     */
    it("activar una fila de sección cierra la hoja Y deja el foco en la sección de destino", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();
      const destino = document.createElement("section");
      destino.id = "journey";
      document.body.appendChild(destino);

      try {
        fireEvent.click(trigger);
        const fila = getSheet(container).querySelector(
          'a[href="/#journey"]',
        ) as HTMLElement;

        fireEvent.click(fila);

        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(document.activeElement).toBe(destino);
      } finally {
        destino.remove();
      }
    });

    it("scrollear la página cierra la hoja, pero un movimiento dentro de la tolerancia no", () => {
      // Contrapartida de NO bloquear el scroll (regla 21): la hoja se retira
      // sola si la página se mueve. La tolerancia existe porque en móvil el
      // navegador mueve el scroll por su cuenta (barra de direcciones, rebote
      // elástico) y sin ella la hoja se cerraría nada más abrirse.
      renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: NAV_SHEET_SCROLL_TOLERANCE_PX,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });
      expect(
        trigger,
        "un movimiento dentro de la tolerancia no debería cerrar la hoja",
      ).toHaveAttribute("aria-expanded", "true");

      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: NAV_SHEET_SCROLL_TOLERANCE_PX + 40,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("abrir la hoja NO escribe overflow en html ni en body (regla 21: el bloqueo de scroll clásico está vetado)", () => {
      /*
       * Candado de la regla 21, la razón por la que esta hoja existe con la
       * forma que tiene. `overflow: hidden` en `html`/`body` obliga al eje
       * contrario a computar `auto` y convierte a los dos en contenedor de
       * scroll: los cuatro `position: sticky` de las presentaciones dejarían
       * de pegarse al viewport mientras la hoja estuviera abierta.
       *
       * Se afirma sobre el estilo EN LÍNEA porque es ahí donde un bloqueo por
       * JavaScript escribiría (`document.body.style.overflow = "hidden"`);
       * `getComputedStyle` no aportaría nada aquí, porque `createGlobalStyle`
       * no inyecta nada bajo jsdom (regla 37) y devolvería el valor por
       * defecto pasara lo que pasara.
       */
      renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      expect(document.documentElement.style.overflow).toBe("");
      expect(document.documentElement.style.overflowY).toBe("");
      expect(document.body.style.overflow).toBe("");
      expect(document.body.style.overflowY).toBe("");
      expect(document.body.style.position).toBe("");
    });

    it("la hoja entrega TODOS los destinos de NAV_GROUPS, y los externos avisan de la pestaña nueva", () => {
      // Recuento DERIVADO del modelo compartido (regla 39), nunca un literal:
      // el día que `NAV_GROUPS` gane un grupo, este test sigue diciendo la
      // verdad sin que nadie lo actualice a mano.
      const { container } = renderNavbar();
      const items = NAV_GROUPS.flatMap((group) => group.items);
      const hoja = getSheet(container);

      // Desde la ola G el selector de idioma de la hoja también es un par de
      // enlaces (con hreflang, navegan a la ruta del otro idioma): las filas
      // de NAVEGACIÓN se distinguen por NO llevar hreflang — contrato
      // actualizado, no relajado (regla 40).
      const filas = Array.from(
        hoja.querySelectorAll("a[href]:not([hreflang])"),
      );
      expect(filas).toHaveLength(items.length);
      expect(filas.map((fila) => fila.getAttribute("href"))).toEqual(
        items.map((item) => item.href),
      );
      expect(
        hoja.querySelectorAll("a[hreflang]"),
        "la hoja debe seguir montando el par de enlaces de idioma",
      ).toHaveLength(2);

      for (const item of items.filter((i) => i.kind === "external")) {
        const externo = hoja.querySelector(
          `a[href="${item.href}"]`,
        ) as HTMLElement;
        expect(externo).toHaveAttribute("target", "_blank");
        expect(externo).toHaveAttribute("rel", "noopener noreferrer");
        expect(externo.textContent).toMatch(/se abre en una pestaña nueva/i);
      }

      // Cada grupo aporta su título, y la lista lo consume como nombre
      // accesible (aria-labelledby), sin meter encabezados nuevos en el
      // esquema del documento.
      const listas = hoja.querySelectorAll("ul[aria-labelledby]");
      expect(listas).toHaveLength(NAV_GROUPS.length);
      expect(hoja.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(0);
    });

    it("el velo existe, es aria-hidden y sigue el estado de la hoja", () => {
      const { container } = renderNavbar();
      const velo = container.querySelector(
        "[data-nav-sheet-veil]",
      ) as HTMLElement;

      expect(velo).not.toBeNull();
      expect(velo).toHaveAttribute("aria-hidden", "true");
      expect(velo).toHaveAttribute("data-open", "false");

      fireEvent.click(getSheetTrigger());
      expect(velo).toHaveAttribute("data-open", "true");
    });

    it("el icono hamburguesa declara width/height/flex propios (regla 20)", () => {
      /*
       * MISMA regresión ya medida tres veces en este repo (`ScLogo`: 167 px
       * de ancho en una barra de 56; `ScChevron`: 215x143). `GlobalStyles`
       * declara `svg { width: 100% }` para todo el sitio y esa declaración
       * gana a la geometría implícita del `viewBox`. jsdom no hace layout, así
       * que el candado comprueba las DECLARACIONES (que el CSSOM sí resuelve),
       * no la geometría.
       */
      const { container } = renderNavbar();
      const icono = container.querySelector(
        "[data-nav-sheet-trigger] svg",
      ) as HTMLElement;
      expect(icono, "el disparador no monta ningún icono").not.toBeNull();

      const estilo = getComputedStyle(icono);
      expect(estilo.width).not.toBe("");
      expect(estilo.width).not.toBe("100%");
      expect(estilo.height).not.toBe("");
      expect(estilo.flex || estilo.flexGrow).not.toBe("");
    });

    it("el disparador es mobile-first: visible en la regla base y display:none dentro de @media md", () => {
      // Regla transversal de la spec: la regla base es la MÓVIL y se corrige
      // hacia arriba con min-width, nunca con un max-width de layout. jsdom no
      // evalúa @media (regla 36), así que la condición se lee del CSSOM.
      const { container } = renderNavbar();
      const reglas = allCssRules();
      const slot = container.querySelector(
        "[data-nav-sheet-trigger]",
      ) as HTMLElement;
      const clase = claseInyectadaDe(slot, reglas);
      expect(
        clase,
        "no se encontró la clase inyectada del disparador",
      ).not.toBe("");

      expect(getComputedStyle(slot).display).toBe("inline-flex");
      const enMd = reglasEnMedia(reglas, MEDIA_MD, clase);
      expect(
        enMd.some((regla) => /display:\s*none/.test(regla)),
        "el disparador no se retira desde md",
      ).toBe(true);
    });

    /*
     * SALIDA SIN JAVASCRIPT (crítica externa #10, hallazgo A, P1). La apertura
     * de la hoja es estado de React (`useNavSheet`), así que sin JavaScript la
     * hoja no puede abrirse nunca y el disparador es un botón que no cumple lo
     * que promete. Se retira: el pie de página ya expone la navegación
     * completa como enlaces normales, así que ocultarlo no deja a nadie sin
     * salida (ver el docblock de `ScSheetTriggerSlot`, `NavSheet.tsx`).
     *
     * jsdom no evalúa ningún `@media` (regla 36): la condición se lee del
     * CSSOM, acotada al bloque concreto y a la clase de ESTE elemento.
     *
     * Validado con el bug inyectado a propósito (regla 34): borrada la línea
     * `display: none` del bloque `@media (scripting: none)` de
     * `ScSheetTriggerSlot`, este test se pone en rojo ("el disparador de la
     * hoja sigue visible sin JavaScript"); restaurada esa línea, vuelve a
     * verde.
     */
    it("sin JavaScript el disparador se retira (@media (scripting: none)), y con JavaScript no cambia nada", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();
      const slot = container.querySelector(
        "[data-nav-sheet-trigger]",
      ) as HTMLElement;
      const clase = claseInyectadaDe(slot, reglas);
      expect(
        clase,
        "no se encontró la clase inyectada del disparador",
      ).not.toBe("");

      expect(
        reglasEnMedia(reglas, MEDIA_SIN_JS, clase).some((regla) =>
          /display:\s*none/.test(regla),
        ),
        "el disparador de la hoja sigue visible sin JavaScript",
      ).toBe(true);

      // CON JavaScript nada cambia: la regla base sigue siendo la móvil
      // (visible), el envoltorio no entra en el orden de tabulación y el botón
      // real sigue montado y alcanzable.
      expect(getComputedStyle(slot).display).toBe("inline-flex");
      expect(slot).not.toHaveAttribute("tabindex");
      expect(getSheetTrigger()).toBeInTheDocument();
    });

    it("la hoja y el velo se retiran desde md con display:none, sin desmontarse", () => {
      const { container } = renderNavbar();
      const reglas = allCssRules();

      for (const [nombre, selector] of [
        ["la hoja", "[data-nav-sheet]"],
        ["el velo", "[data-nav-sheet-veil]"],
      ] as const) {
        const el = container.querySelector(selector) as HTMLElement;
        const clase = claseInyectadaDe(el, reglas);
        expect(
          clase,
          `no se encontró la clase inyectada de ${nombre}`,
        ).not.toBe("");
        expect(
          reglasEnMedia(reglas, MEDIA_MD, clase).some((regla) =>
            /display:\s*none/.test(regla),
          ),
          `${nombre} no se retira desde md`,
        ).toBe(true);
        // Y sigue en el DOM: el `display: none` de md no desmonta nada.
        expect(el).toBeInTheDocument();
      }
    });

    /*
     * LA HOJA NO PROMETE NINGÚN GESTO QUE NO IMPLEMENTA (crítica #14, P2).
     *
     * El defecto medido por el evaluador: el borde superior llevaba un asa
     * (`ScSheetHandle`), la señal universal de "esto se arrastra para cerrar",
     * y era un `<div>` `aria-hidden` SIN un solo manejador -- arrastrada 320px
     * la hoja no se movía ni se cerraba. Se retiró en vez de implementar el
     * arrastre: la hoja ya tiene cuatro salidas con candado (Escape, botón de
     * cierre, toque fuera, scroll de página) y una quinta que duplica lo mismo
     * no paga ni el código ni el presupuesto de JavaScript. El porqué completo
     * vive donde vivía el asa, en `NavSheet.tsx`.
     *
     * Las DOS mitades: que no vuelva a colarse un adorno delante del contenido
     * de la hoja, y que la hoja siga LEYÉNDOSE como hoja sin el asa -- que era
     * la condición de la decisión. Ese segundo papel lo llevan el filo y las
     * esquinas superiores redondeadas de `ScNavSheet`, no el asa: se afirma
     * aquí para que quien retoque ese borde sepa qué está sosteniendo.
     *
     * Validado con el bug inyectado a propósito (regla 34): ver el informe de
     * la entrega.
     */
    it("la hoja arranca directamente en su primer grupo, y su filo superior es lo que la lee como hoja", () => {
      const { container } = renderNavbar();
      const scroll = container.querySelector(
        "[data-nav-sheet-scroll]",
      ) as HTMLElement;
      expect(scroll, "no se montó la capa de scroll de la hoja").not.toBeNull();

      expect(
        scroll.firstElementChild?.querySelector("ul"),
        "hay un adorno decorativo antes del primer grupo de la hoja: si promete un gesto, tiene que implementarlo",
      ).not.toBeNull();

      const css = cssRuleTextFor(getSheet(container));
      expect(css).toContain("border-top:");
      // Esquinas superiores redondeadas y las inferiores a ras: la forma de
      // un panel anclado al borde inferior de la pantalla.
      expect(css).toMatch(
        /border-radius:[^;]*0px 0px;|border-radius:[^;]*0 0;/,
      );
    });

    /*
     * Task 35: `max-height`/`overscroll-behavior` viven en dos elementos
     * distintos desde esta tarea -- `ScNavSheet` (`[data-nav-sheet]`, la capa
     * de posición/apariencia) y `ScSheetScroll` (`[data-nav-sheet-scroll]`,
     * la capa que scrollea de verdad), ver el docblock de `ScSheetScroll`
     * para el porqué de la división. Antes de esta tarea las dos vivían
     * juntas en el mismo elemento.
     */
    it("la hoja declara max-height 70dvh, su capa de scroll overscroll-behavior: contain, y NINGUNA de las dos overflow: hidden", () => {
      const { container } = renderNavbar();
      const cssHoja = cssRuleTextFor(getSheet(container));
      const areaScroll = getSheet(container).querySelector(
        "[data-nav-sheet-scroll]",
      ) as HTMLElement;
      const cssScroll = cssRuleTextFor(areaScroll);

      expect(cssHoja).toContain("max-height: 70dvh");
      expect(cssScroll).toContain("overscroll-behavior: contain");
      // Regla 21 en su forma CSS: ni la hoja ni su capa de scroll pueden
      // recortar con hidden.
      expect(cssHoja).not.toMatch(/overflow[^:]*:\s*hidden/);
      expect(cssScroll).not.toMatch(/overflow[^:]*:\s*hidden/);
    });

    it("la hoja usa la gramática de Task 9: transform-origin bottom center, translateY(100%) en cerrado y asimetría 120/180 con PRESS.easing", () => {
      const { container } = renderNavbar();
      const css = cssRuleTextFor(getSheet(container));

      expect(css).toContain("transform-origin: bottom center");

      const openIndex = css.indexOf('[data-open="true"]');
      expect(openIndex).toBeGreaterThan(-1);

      // Estado cerrado (base, ANTES de [data-open="true"]).
      const cerrado = css.slice(0, openIndex);
      expect(cerrado).toContain("translateY(100%)");
      expect(cerrado).toContain(`${OVERLAY.closeMs}ms`);
      expect(cerrado).toContain(PRESS.easing);

      // Estado abierto: transition PROPIA (regla 26), más lenta, misma curva.
      const abierto = css.slice(openIndex);
      expect(abierto).toContain(`${OVERLAY.openMs}ms`);
      expect(abierto).toContain(PRESS.easing);
      expect(abierto).not.toContain(`${OVERLAY.closeMs}ms`);
      // La asimetría solo existe si los dos números son distintos.
      expect(OVERLAY.openMs).toBeGreaterThan(OVERLAY.closeMs);
    });

    /*
     * Task 17 (plan premium F1-F5, 2026-08-11): paridad de motion completa
     * entre panel de escritorio y hoja móvil. Hasta esta tarea la hoja
     * compartía las dos duraciones con ScNavPanel pero NO su escala de
     * cierre (ver el docblock de ScNavSheet en NavSheet.tsx, sección
     * "HISTORIA DE LA ESCALA", para el porqué del cambio). Validado con el
     * bug inyectado a propósito: comentando temporalmente el `scale(...)` de
     * los dos estados de ScNavSheet, este test se pone en rojo (el estado
     * cerrado deja de contener "scale(0.97)" y el abierto deja de contener
     * "scale(1)"); restaurado, vuelve a verde.
     */
    it("Task 17: la hoja gana scale(OVERLAY.closedScale) en cerrado y scale(1) en abierto, misma paridad que ScNavPanel", () => {
      const { container } = renderNavbar();
      const css = cssRuleTextFor(getSheet(container));

      const openIndex = css.indexOf('[data-open="true"]');
      expect(openIndex).toBeGreaterThan(-1);

      const cerrado = css.slice(0, openIndex);
      expect(cerrado).toContain(
        `translateY(100%) scale(${OVERLAY.closedScale})`,
      );

      const abierto = css.slice(openIndex);
      expect(abierto).toContain("translateY(0) scale(1)");
    });

    it("la hoja transiciona visibility SOLO al cerrar: en la lista de apertura no aparece (bug medido en navegador real)", () => {
      /*
       * CANDADO DE UN BUG REAL, no hipotético, encontrado en Chrome a 375x812
       * sobre el dev server y CORREGIDO en esta misma tarea. `visibility` se
       * anima de forma DISCRETA: en t=0 exacto todavía vale el valor de
       * PARTIDA, así que con `visibility` en la lista de apertura la hoja
       * seguía computando `visibility: hidden` en el instante en que el
       * efecto llamaba a `focus()` sobre su primera fila -- y un elemento con
       * `visibility: hidden` NO es focalizable. Medido con
       * `HTMLElement.prototype.focus` instrumentado: la llamada ocurría, con
       * `visibility === "hidden"`, y el navegador la descartaba en silencio.
       * Resultado: la hoja se abría SIN foco dentro y, con el cierre por foco
       * fuera, quedaba inalcanzable por teclado.
       *
       * Este test NO puede reproducir el fallo (jsdom no implementa
       * transiciones ni la focalización condicionada por `visibility`: su
       * test de foco pasaba en verde con el bug delante). Lo que sí puede, y
       * es para lo que existe, es atar la FORMA del CSS que lo corrige, para
       * que nadie "arregle" la asimetría volviendo a añadir la entrada.
       */
      const { container } = renderNavbar();

      for (const [nombre, selector] of [
        ["la hoja", "[data-nav-sheet]"],
        ["el velo", "[data-nav-sheet-veil]"],
      ] as const) {
        const css = cssRuleTextFor(
          container.querySelector(selector) as HTMLElement,
        );
        const openIndex = css.indexOf('[data-open="true"]');
        expect(openIndex).toBeGreaterThan(-1);

        expect(
          css.slice(0, openIndex),
          `${nombre} debe conservar visibility en la lista de CIERRE`,
        ).toMatch(/transition:[^;]*visibility/);
        expect(
          css.slice(openIndex).match(/transition:[^;]*/)?.[0] ?? "",
          `${nombre} no puede transicionar visibility al ABRIR`,
        ).not.toContain("visibility");
      }
    });

    it("el velo se funde con DECK.railDurationMs, el valor que el vocabulario reserva para ese rol", () => {
      const { container } = renderNavbar();
      const velo = container.querySelector(
        "[data-nav-sheet-veil]",
      ) as HTMLElement;
      const css = cssRuleTextFor(velo);

      expect(css).toContain(`${DECK.railDurationMs}ms`);
      expect(css).toContain(PRESS.easing);
    });

    it("hoja, velo e icono anulan sus transiciones bajo prefers-reduced-motion: reduce, estado abierto incluido", () => {
      /*
       * El estado abierto se redeclara DENTRO del bloque reduce a propósito
       * (hallazgo 4, ya pagado en ScBar y ScNavPanel): `[data-open="true"]`
       * tiene mayor especificidad (atributo + clase) que el `&` suelto del
       * bloque reduce (solo clase), así que sin redeclararlo la superficie
       * abierta seguiría animando bajo `reduce`.
       */
      const { container } = renderNavbar();
      const reglas = allCssRules();

      for (const [nombre, selector] of [
        ["la hoja", "[data-nav-sheet]"],
        ["el velo", "[data-nav-sheet-veil]"],
        ["el icono", "[data-nav-sheet-trigger] svg"],
      ] as const) {
        const el = container.querySelector(selector) as Element;
        const clase = claseInyectadaDe(el, reglas);
        expect(
          clase,
          `no se encontró la clase inyectada de ${nombre}`,
        ).not.toBe("");

        const guards = reglasEnMedia(reglas, MEDIA_REDUCE, clase).filter(
          (regla) => regla.includes("transition: none"),
        );
        expect(
          guards.length,
          `${nombre} no anula sus transiciones bajo reduce`,
        ).toBeGreaterThan(0);
        expect(
          guards.some((regla) => regla.includes('[data-open="true"]')),
          `${nombre} no redeclara su estado abierto dentro del bloque reduce`,
        ).toBe(true);
      }
    });

    it("las filas declaran el suelo táctil de 44px y el press de vocabulary.PRESS", () => {
      const { container } = renderNavbar();
      const fila = getSheet(container).querySelector("a") as HTMLElement;

      // Declaración, no geometría: jsdom no hace layout.
      expect(getComputedStyle(fila).minHeight).toBe("44px");

      const css = cssRuleTextFor(fila);
      expect(css).toContain(":active");
      expect(css).toContain(`scale(${PRESS.activeScale})`);
    });

    /*
     * Task 13, punto 2 del brief: elimina el retardo de doble-tap en la fila
     * más directamente táctil del sitio. Validado con el bug inyectado a
     * propósito (ver informe de la tarea): comentando temporalmente
     * `touch-action: manipulation;` de ScSheetRow en NavSheet.tsx, este test
     * se pone en rojo; restaurado, vuelve a verde.
     */
    it("Task 13: las filas declaran touch-action: manipulation", () => {
      const { container } = renderNavbar();
      const fila = getSheet(container).querySelector("a") as HTMLElement;
      const css = cssRuleTextFor(fila);
      expect(css).toContain("touch-action: manipulation");
    });

    /*
     * Task 13, punto 1 del brief: la hoja está anclada a `left/right/
     * bottom: 0` del VIEWPORT (docblock de ScNavSheet: vive fuera de
     * ScHeader a propósito), así que sus tres bordes físicos pueden caer
     * bajo un recorte de hardware -- el inferior (home-indicator de iOS) es
     * el que más importa en la práctica. `calc(token + env(..., 0px))`,
     * aditivo por construcción: jsdom no resuelve `env()`, así que el
     * candado afirma el TEXTO de la declaración. Validado con el bug
     * inyectado a propósito (ver informe de la tarea): comentando
     * temporalmente los tres `env(safe-area-inset-*)` del `padding` de
     * ScNavSheet en NavSheet.tsx, este test se pone en rojo; restaurado,
     * vuelve a verde.
     */
    it("Task 13: la hoja reserva env(safe-area-inset-left/right/bottom) en su padding, de forma aditiva", () => {
      const { container } = renderNavbar();
      const css = cssRuleTextFor(getSheet(container));

      expect(css).toContain("env(safe-area-inset-left, 0px)");
      expect(css).toContain("env(safe-area-inset-right, 0px)");
      expect(css).toContain("env(safe-area-inset-bottom, 0px)");
    });

    /*
     * Task 35 (hallazgo de un evaluador independiente, gate F4, 2026-08-12),
     * primer punto: `ScSheetScroll` (`[data-nav-sheet-scroll]`, la capa que
     * scrollea de verdad desde esta misma tarea -- ver su docblock en
     * NavSheet.tsx) es un contenedor PERSISTENTE que nunca se desmonta entre
     * aperturas (ver el docblock del efecto en `useNavSheet`, NavSheet.tsx),
     * así que su `scrollTop` sobrevivía intacto de un cierre al siguiente
     * abrir. Medido en navegador real: tras scrollear hasta el final
     * (scrollTop=177, su máximo) y cerrar, la SIGUIENTE apertura reabría ya
     * en scrollTop=177 -- la primera pantalla empezaba en "Contacto".
     *
     * jsdom no hace layout (`scrollHeight`/`clientHeight` dan siempre 0),
     * pero SÍ conserva el valor crudo que se le asigna a `scrollTop` --
     * suficiente para simular "la hoja quedó scrolleada" y comprobar que el
     * efecto la repone a 0 en la SIGUIENTE apertura. Validado con el bug
     * inyectado a propósito: comentando temporalmente el bloque que reinicia
     * `areaDeScroll.scrollTop` en `useNavSheet` (NavSheet.tsx), este test se
     * pone en rojo (`areaScroll.scrollTop` se queda en 177 en vez de volver a
     * 0); restaurado, vuelve a verde.
     */
    it("Task 35: la hoja reinicia scrollTop a 0 en cada apertura, aunque quedara scrolleada al cerrarse", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();
      const areaScroll = getSheet(container).querySelector(
        "[data-nav-sheet-scroll]",
      ) as HTMLElement;
      expect(areaScroll, "la hoja no monta su capa de scroll").not.toBeNull();

      fireEvent.click(trigger); // abre
      areaScroll.scrollTop = 177;
      expect(areaScroll.scrollTop).toBe(177);

      fireEvent.click(trigger); // cierra, sin tocar scrollTop
      fireEvent.click(trigger); // reabre

      expect(areaScroll.scrollTop).toBe(0);
    });

    /*
     * Task 35, segundo punto: el disparador de la barra vive DENTRO de
     * `ScHeader` (Navbar.tsx), que crea su PROPIO contexto de apilamiento
     * (`position: fixed` + `z-index: stickyNav`) -- ningún z-index que se le
     * ponga a un descendiente suyo puede escapar de ahí para ganarle al
     * velo (`zIndex.overlay`), que es SIEMPRE hermano de `ScHeader`, nunca
     * su descendiente (spec de contextos de apilamiento del CSS Positioned
     * Layout Module). Medido con `elementFromPoint` en navegador real sobre
     * el centro del icono con la hoja abierta: devolvía `ScSheetVeil`, no el
     * botón.
     *
     * jsdom no implementa `document.elementFromPoint` (no hace layout ni
     * pintado real: `typeof document.elementFromPoint === "undefined"`,
     * verificado antes de escribir este test), así que este candado prueba
     * la condición ESTRUCTURAL que garantiza el resultado en un navegador
     * real: el botón de cierre nuevo es DESCENDIENTE de la propia hoja
     * (`[data-nav-sheet]`), no del disparador de la barra, y la hoja ya
     * declara un z-index mayor que el del velo -- por construcción,
     * cualquier punto de su rectángulo se pinta por encima del velo, sea
     * cual sea el punto exacto. La medición real con `elementFromPoint` se
     * hace en navegador (ver el informe de la tarea). Validado con el bug
     * inyectado a propósito: quitando temporalmente `data-nav-sheet-close`
     * de `ScSheetCloseSlot` (NavSheet.tsx), este test se pone en rojo (no
     * encuentra el botón); restaurado, vuelve a verde.
     */
    it("Task 35: la hoja monta un botón de cierre propio, descendiente del contenedor con z-index por encima del velo", () => {
      const { container } = renderNavbar();
      fireEvent.click(getSheetTrigger());

      const hoja = getSheet(container);
      const boton = hoja.querySelector("[data-nav-sheet-close]");
      expect(
        boton,
        "la hoja no monta su propio botón de cierre",
      ).not.toBeNull();

      const velo = container.querySelector(
        "[data-nav-sheet-veil]",
      ) as HTMLElement;
      const zHoja = Number(getComputedStyle(hoja).zIndex);
      const zVelo = Number(getComputedStyle(velo).zIndex);
      expect(Number.isNaN(zHoja), "el z-index de la hoja no es numérico").toBe(
        false,
      );
      expect(Number.isNaN(zVelo), "el z-index del velo no es numérico").toBe(
        false,
      );
      expect(zHoja, "la hoja no se apila por encima del velo").toBeGreaterThan(
        zVelo,
      );
    });

    /*
     * El botón de cierre nuevo cierra de verdad (mismo mecanismo que
     * activar una fila, `onNavigate`), y no interfiere con el foco inicial
     * de la hoja: al abrir, el foco sigue entrando en la primera fila de
     * navegación real, no en este botón -- se declara DESPUÉS de todos los
     * grupos en el JSX (ver el docblock de `ScSheetCloseSlot`) justo para
     * que el `querySelector("a, button")` del efecto de foco de
     * `useNavSheet` siga encontrando la fila primero.
     */
    it("Task 35: pulsar el botón de cierre nuevo cierra la hoja, y no roba el foco inicial a la primera fila", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(document.activeElement).toBe(
        getSheet(container).querySelector("a"),
      );

      const boton = getSheet(container).querySelector(
        "[data-nav-sheet-close] button",
      ) as HTMLElement;
      expect(
        boton,
        "el botón de cierre no monta un <button> real",
      ).not.toBeNull();

      fireEvent.click(boton);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    /*
     * Fix wave A, hallazgo A3 (revisión final de rama). El test de arriba
     * ("no roba el foco inicial") solo comprobaba que el botón nuevo CIERRA
     * -- no a dónde va el foco al hacerlo. Hasta esta tarea, el botón usaba
     * `onNavigate` (el mismo cierre a secas que las filas de navegación,
     * pensadas para perder el foco porque navegan a otra parte de la
     * página): al cerrarse, `ScNavSheet` recibe `inert`, y por la focus
     * fixup rule del HTML el foco se resetea a `<body>` -- exactamente el
     * defecto que esta rama trató como Important en el fix round de la
     * Task 2 (`BackToTop`) y el que motivó prohibir `disabled` en la
     * Task 5. El camino de Escape (test "Escape cierra la hoja y devuelve
     * el foco al disparador", más arriba) ya hacía esto bien; el botón de
     * cierre ahora reutiliza la MISMA función (`closeAndFocusTrigger`,
     * `NavSheet.tsx`).
     *
     * jsdom no implementa la focus fixup rule de `inert` (verificado antes
     * de escribir este test: fijar `inert` sobre un ancestro con foco
     * dentro NO mueve `document.activeElement` en jsdom, a diferencia de un
     * navegador real), así que el candado no puede reproducir literalmente
     * "el foco cae en `<body>`" -- en su lugar afirma la invariante
     * POSITIVA, igual que el test de Escape: tras pulsar el botón de
     * cierre, el foco tiene que estar en el disparador, no donde estuviera
     * antes de pulsar. Esa aserción sí falla sin el arreglo (permanece en
     * la fila `<a>` donde estaba antes del click) y pasa con él.
     *
     * Verificado con un bug inyectado a propósito (informe de la tarea): al
     * revertir `onClick` del botón de cierre a `onNavigate` (NavSheet.tsx),
     * este test cae en rojo (`document.activeElement` sigue siendo la
     * primera fila, no el disparador); restaurado a `onClose`, vuelve a
     * verde.
     */
    /*
     * Crítica externa #9, punto 4 (evaluador Nielsen, P2): con la hoja abierta
     * -- y por tanto con `aria-modal="true"` -- la rueda sobre la cabecera
     * cerraba la hoja Y arrastraba el fondo 600 px. El bloqueo NO puede ser el
     * clásico `overflow: hidden` en `html`/`body` (regla 21, ver el candado
     * "abrir la hoja NO escribe overflow…" más arriba, que sigue en pie): se
     * hace por evento, cancelando `wheel`/`touchmove` fuera de la capa de
     * scroll de la propia hoja.
     *
     * jsdom no hace scroll real, así que lo observable -- y lo que de verdad
     * decide el resultado en un navegador -- es si el evento queda cancelado:
     * `defaultPrevented`. Los eventos se construyen `cancelable: true` a
     * propósito: un evento no cancelable haría pasar este test por vacuidad.
     */
    it("con la hoja abierta, la rueda y el arrastre FUERA de ella quedan cancelados; cerrada, no se toca ningún gesto", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();
      const cabecera = container.querySelector("header") as HTMLElement;

      function rueda(sobre: HTMLElement): Event {
        const evento = new Event("wheel", {
          cancelable: true,
          bubbles: true,
        });
        act(() => {
          sobre.dispatchEvent(evento);
        });
        return evento;
      }

      expect(
        rueda(cabecera).defaultPrevented,
        "sin hoja abierta la página tiene que seguir scrolleando con normalidad",
      ).toBe(false);

      fireEvent.click(trigger);

      expect(
        rueda(cabecera).defaultPrevented,
        "un diálogo aria-modal que deja correr el fondo bajo el dedo no es modal",
      ).toBe(true);

      const arrastre = new Event("touchmove", {
        cancelable: true,
        bubbles: true,
      });
      act(() => {
        cabecera.dispatchEvent(arrastre);
      });
      expect(
        arrastre.defaultPrevented,
        "en móvil el gesto que desplaza el fondo es touchmove, no wheel",
      ).toBe(true);

      // Cerrar tiene que devolver la página a la normalidad: un bloqueo que no
      // se retira es peor que no bloquear.
      fireEvent.click(trigger);
      expect(rueda(cabecera).defaultPrevented).toBe(false);
    });

    it("la propia lista de la hoja SÍ scrollea con la hoja abierta: el bloqueo excluye su capa de scroll", () => {
      const { container } = renderNavbar();
      fireEvent.click(getSheetTrigger());

      const fila = getSheet(container).querySelector("a") as HTMLElement;
      const evento = new Event("wheel", { cancelable: true, bubbles: true });
      act(() => {
        fila.dispatchEvent(evento);
      });

      expect(
        evento.defaultPrevented,
        "cancelar aquí dejaría la hoja sin poder desplazar su propia lista",
      ).toBe(false);
    });

    /*
     * Crítica externa #9, punto 3. El evaluador midió a 390x844 que la hoja
     * muestra 591 px y su contenido ocupa 623: con el selector de idioma al
     * final, el único control de la hoja nacía 91 px por debajo del filo.
     *
     * jsdom no hace layout (no puede ver los 91 px), así que el candado ata la
     * causa estructural: el bloque de idioma va ANTES que los grupos de salida
     * del sitio. Los dos extremos se derivan de `NAV_GROUPS` (regla 39), nunca
     * de una lista escrita a mano aquí: el día que el modelo gane un grupo
     * externo, este test lo incluye solo.
     */
    it("el control de idioma va antes que los grupos de salida del sitio (los de items externos)", () => {
      const { container } = renderNavbar();
      const hoja = getSheet(container);

      const gruposDeSalida = NAV_GROUPS.filter((group) =>
        group.items.every((item) => item.kind === "external"),
      );
      expect(
        gruposDeSalida.length,
        "sin ningún grupo de salida este test no compara nada",
      ).toBeGreaterThan(0);

      // El selector de idioma son los únicos enlaces con `hreflang` de la
      // capa de scroll (las filas de navegación no lo llevan, y el botón de
      // cierre vive fuera de ella) — desde la ola G navega en vez de
      // conmutar: sirve como ancla del bloque de controles sin depender de
      // su texto ni de un índice de posición.
      const areaScroll = hoja.querySelector(
        "[data-nav-sheet-scroll]",
      ) as HTMLElement;
      const primerControl = areaScroll.querySelector(
        "a[hreflang]",
      ) as HTMLElement;
      expect(
        primerControl,
        "la hoja no monta ningún control dentro de su capa de scroll",
      ).not.toBeNull();

      for (const group of gruposDeSalida) {
        for (const item of group.items) {
          const salida = hoja.querySelector(
            `a[href="${item.href}"]`,
          ) as HTMLElement;
          expect(salida, `la hoja no monta ${item.key}`).not.toBeNull();
          expect(
            primerControl.compareDocumentPosition(salida) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            `${item.key} se pinta antes que el control de idioma`,
          ).toBeTruthy();
        }
      }
    });

    /*
     * Crítica externa #9, punto 3, segunda mitad: aunque el control suba, la
     * cola de la lista sigue quedando fuera del filo -- y la única pista era
     * una fila cortada. `ScSheetFade` es la señal, y solo aparece cuando de
     * verdad queda contenido por debajo.
     *
     * jsdom devuelve 0 en las tres métricas de scroll, así que se inyectan a
     * mano sobre la instancia (`Object.defineProperty`) para representar el
     * caso medido -- 623 px de contenido en 591 visibles -- y se dispara el
     * `scroll` que el componente escucha. Sin métricas inyectadas, el estado
     * de reposo de jsdom (todo a 0) es "no hay nada recortado", que es también
     * lo que debe afirmarse antes de tocar nada.
     */
    it("el degradado de scroll se enciende solo cuando queda contenido por debajo del filo", () => {
      const { container } = renderNavbar();
      const hoja = getSheet(container);
      const areaScroll = hoja.querySelector(
        "[data-nav-sheet-scroll]",
      ) as HTMLElement;

      fireEvent.click(getSheetTrigger());
      expect(
        hoja,
        "con todo a la vista el degradado prometería contenido que no existe",
      ).toHaveAttribute("data-sheet-clipped", "false");

      function medir(scrollTop: number): void {
        Object.defineProperty(areaScroll, "clientHeight", {
          value: 591,
          configurable: true,
        });
        Object.defineProperty(areaScroll, "scrollHeight", {
          value: 623,
          configurable: true,
        });
        Object.defineProperty(areaScroll, "scrollTop", {
          value: scrollTop,
          writable: true,
          configurable: true,
        });
        act(() => {
          areaScroll.dispatchEvent(new Event("scroll"));
        });
      }

      medir(0);
      expect(hoja).toHaveAttribute("data-sheet-clipped", "true");

      // Al final del recorrido ya no queda nada por descubrir: la señal se
      // retira en vez de quedarse encendida para siempre.
      medir(32);
      expect(hoja).toHaveAttribute("data-sheet-clipped", "false");
    });

    /*
     * CRÍTICA EXTERNA #15, HALLAZGO A (P2-6): la señal existía, se calculaba
     * bien y NO SE VEÍA. El evaluador midió a 390x844 la hoja recortada
     * (`scrollHeight` 692 > `clientHeight` 546) con el grupo «Comunidad»
     * partido en el borde inferior «sin degradado ni indicador».
     *
     * La causa es de geometría: el degradado es `position: absolute` dentro de
     * `ScNavSheet`, cuyo bloque contenedor es su CAJA DE RELLENO, así que
     * `bottom: 0` caía por debajo del `padding-bottom` -- sus 32 px ocupaban
     * exactamente la banda de relleno y cero píxeles del contenido recortado.
     *
     * ESTE CANDADO ES DE FUENTE, no de píxeles: jsdom no hace layout, así que
     * no puede medir dónde cae la caja (regla 44 -- eso lo cierra el
     * integrador en navegador). Lo que sí puede afirmar, y es donde vive el
     * defecto, son las DOS declaraciones y su igualdad: el degradado se ancla
     * al filo de la capa de scroll y esa medida es la MISMA que el relleno
     * inferior de la hoja (regla 41: una invariante entre dos declaraciones
     * vive en un test que las lee las dos, no en la memoria de quien las
     * escribió a la vez).
     */
    it("crítica #15 P2-6: el degradado se ancla al filo de la capa de scroll, no al relleno de la hoja", () => {
      const { container } = renderNavbar();
      const hoja = getSheet(container);
      const fade = hoja.querySelector("[data-sheet-fade]") as HTMLElement;
      expect(fade, "la hoja perdió su señal de desbordamiento").not.toBeNull();

      const normaliza = (texto: string): string =>
        texto.replace(/\s+/g, " ").replace(/\(\s/g, "(").replace(/\s\)/g, ")");
      const cssFade = normaliza(cssRuleTextFor(fade));
      const cssHoja = normaliza(cssRuleTextFor(hoja));

      const relleno = `calc(${basicLightTheme.space[6]} + env(safe-area-inset-bottom, 0px))`;
      expect(
        cssFade,
        "el degradado vuelve a anclarse al filo de la caja de relleno: se pinta entero sobre relleno vacío",
      ).toContain(`bottom: ${relleno}`);
      expect(cssFade).not.toMatch(/bottom: 0[;\s}]/);

      /* La otra mitad de la invariante: ese anclaje solo marca el corte si
         coincide con dónde TERMINA de verdad la capa de scroll, que es el
         relleno inferior de la hoja. */
      expect(
        cssHoja,
        "el relleno inferior de la hoja dejó de coincidir con el anclaje del degradado",
      ).toContain(relleno);
    });

    it("el degradado lee el estado del PADRE con un selector descendiente, no del propio elemento", () => {
      /*
       * Regla 35: `[data-sheet-clipped="true"] &` y `&[data-sheet-clipped=
       * "true"]` contienen el MISMO substring y describen selectores
       * distintos (descendiente frente a mismo elemento). El atributo vive en
       * `ScNavSheet` y el degradado es su hijo, así que solo la primera forma
       * funciona -- y solo `selectorText` las distingue.
       */
      renderNavbar();
      const reglas = Array.from(document.styleSheets).flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      });
      const selectores = reglas
        .filter((rule): rule is CSSStyleRule => "selectorText" in rule)
        .map((rule) => rule.selectorText)
        .filter((selector) => selector.includes("data-sheet-clipped"));

      expect(selectores.length).toBeGreaterThan(0);
      for (const selector of selectores) {
        expect(selector).toMatch(/\[data-sheet-clipped="true"\]\s+\./);
      }
    });

    it("Task fix wave A (A3): pulsar el botón de cierre nuevo devuelve el foco al disparador, no lo deja huérfano", () => {
      const { container } = renderNavbar();
      const trigger = getSheetTrigger();

      fireEvent.click(trigger);
      expect(document.activeElement).toBe(
        getSheet(container).querySelector("a"),
      );

      const boton = getSheet(container).querySelector(
        "[data-nav-sheet-close] button",
      ) as HTMLElement;

      fireEvent.click(boton);

      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(document.activeElement).toBe(trigger);
    });

    /*
     * EL FONDO QUEDA `inert` MIENTRAS LA HOJA ESTÁ ABIERTA (crítica #12).
     *
     * Qué faltaba: la trampa de foco (Ola C.1) ya impedía que el TABULADOR
     * saliera, y eso es media promesa. Un lector de pantalla en modo
     * exploración no usa el orden de tabulación -- recorre el árbol de
     * accesibilidad --, así que seguía leyendo la página de detrás de una capa
     * que se declara `aria-modal="true"`.
     *
     * LÍMITE DECLARADO DE ESTOS CANDADOS: jsdom no implementa el
     * COMPORTAMIENTO de `inert` (ni el bloqueo de foco ni la retirada del árbol
     * de accesibilidad), así que lo único honesto que se puede afirmar aquí es
     * QUÉ NODOS llevan el atributo y CUÁNDO -- que es justo donde vive el
     * defecto y donde puede reaparecer. Que el navegador lo respete de verdad
     * es verificación de navegador real (regla 44), no de esta suite.
     */
    describe("el fondo queda inert mientras la hoja está abierta (crítica #12)", () => {
      /** Un nodo de fondo que NO pertenece al Navbar: reproduce lo que en la
       *  página real son `<main>`, el pie y el botón de «volver arriba», que
       *  este componente no renderiza pero sí tiene que inertizar. */
      function montarFondoAjeno(): HTMLElement {
        const ajeno = document.createElement("main");
        document.body.appendChild(ajeno);
        return ajeno;
      }

      it("marca la cabecera y el fondo ajeno, y nunca la hoja ni el velo", () => {
        const { container } = renderNavbar();
        const hoja = getSheet(container);
        const velo = container.querySelector(
          "[data-nav-sheet-veil]",
        ) as HTMLElement;
        const cabecera = container.querySelector("header") as HTMLElement;
        const ajeno = montarFondoAjeno();

        try {
          expect(
            cabecera.hasAttribute("inert"),
            "con la hoja cerrada nada del fondo puede estar inerte",
          ).toBe(false);
          expect(ajeno.hasAttribute("inert")).toBe(false);

          fireEvent.click(getSheetTrigger());

          expect(
            cabecera.hasAttribute("inert"),
            "un lector de pantalla seguiría recorriendo la barra por detrás del velo",
          ).toBe(true);
          expect(
            ajeno.hasAttribute("inert"),
            "un lector de pantalla seguiría recorriendo la página por detrás del velo",
          ).toBe(true);
          expect(
            hoja.hasAttribute("inert"),
            "la hoja abierta no puede inertizarse a sí misma",
          ).toBe(false);
          expect(
            velo.hasAttribute("inert"),
            "el velo tiene que seguir capturando el toque de fuera",
          ).toBe(false);
        } finally {
          ajeno.remove();
        }
      });

      it("al cerrar con Escape lo devuelve todo, y el foco vuelve al disparador", () => {
        const { container } = renderNavbar();
        const cabecera = container.querySelector("header") as HTMLElement;
        const ajeno = montarFondoAjeno();
        const trigger = getSheetTrigger();

        try {
          fireEvent.click(trigger);
          expect(cabecera.hasAttribute("inert")).toBe(true);

          fireEvent.keyDown(document.activeElement ?? document.body, {
            key: "Escape",
          });

          expect(cabecera.hasAttribute("inert")).toBe(false);
          expect(ajeno.hasAttribute("inert")).toBe(false);
          expect(
            document.activeElement,
            "cerrar con la cabecera todavía inerte dejaría el foco en <body>",
          ).toBe(trigger);
        } finally {
          ajeno.remove();
        }
      });

      /*
       * EL ORDEN, que es la parte que un refactor puede romper sin que se note,
       * y que NO se puede observar mirando el estado final: los dos caminos de
       * cierre que mueven el foco lo mueven a un elemento del FONDO -- el
       * destino del ancla, o el propio disparador --, y para cuando el test
       * mira, la limpieza del efecto ya ha liberado el `inert` de todas formas.
       * El único instante que importa es el del `focus()`, así que se
       * instrumenta ESE: se envuelve el método del elemento de destino y se
       * anota si en ese momento seguía inerte.
       *
       * jsdom no implementa el comportamiento de `inert` (un `focus()` sobre un
       * elemento inerte le funciona igual), así que sin esta instrumentación el
       * defecto sería invisible aquí -- en un navegador real es la diferencia
       * entre que el foco llegue al destino o acabe en `<body>`, que es el
       * defecto de la crítica externa #9, punto 1.
       */
      /*
       * `closest("[inert]")` y no `hasAttribute("inert")`: `inert` se hereda
       * por SUBÁRBOL, y los dos elementos que estos candados vigilan lo reciben
       * de sitios distintos -- la sección de destino lo lleva ella misma (es
       * hermana de la hoja en `<body>`), y el disparador lo hereda de la
       * cabecera que lo contiene. Preguntar solo por el atributo propio dejaría
       * el segundo caso pasando en verde con el defecto delante (comprobado:
       * con `hasAttribute` el bug inyectado del botón de cierre NO tumbaba el
       * test).
       */
      function espiarInertAlEnfocar(el: HTMLElement): () => boolean | null {
        let inerteAlEnfocar: boolean | null = null;
        const original = el.focus.bind(el);
        el.focus = ((options?: FocusOptions) => {
          inerteAlEnfocar = el.closest("[inert]") !== null;
          original(options);
        }) as typeof el.focus;
        return () => inerteAlEnfocar;
      }

      it("activar una fila libera el fondo ANTES de mover el foco al destino", () => {
        const { container } = renderNavbar();
        const destino = document.createElement("section");
        destino.id = "journey";
        document.body.appendChild(destino);
        const inerteAlEnfocar = espiarInertAlEnfocar(destino);

        try {
          fireEvent.click(getSheetTrigger());
          expect(destino.hasAttribute("inert")).toBe(true);

          const fila = getSheet(container).querySelector(
            'a[href="/#journey"]',
          ) as HTMLElement;
          fireEvent.click(fila);

          expect(
            inerteAlEnfocar(),
            "el destino seguía inerte en el instante del focus(): en un navegador real el foco se habría perdido",
          ).toBe(false);
          expect(document.activeElement).toBe(destino);
        } finally {
          destino.remove();
        }
      });

      it("el botón de cierre libera el fondo ANTES de devolver el foco al disparador", () => {
        const { container } = renderNavbar();
        const trigger = getSheetTrigger();
        const inerteAlEnfocar = espiarInertAlEnfocar(trigger);

        fireEvent.click(trigger);
        const boton = getSheet(container).querySelector(
          "[data-nav-sheet-close] button",
        ) as HTMLElement;

        fireEvent.click(boton);

        expect(
          inerteAlEnfocar(),
          "el disparador seguía dentro de una cabecera inerte al recibir el foco",
        ).toBe(false);
        expect(document.activeElement).toBe(trigger);
      });

      it("no retira el inert que otro ya había puesto: solo suelta el suyo", () => {
        const ajeno = montarFondoAjeno();
        ajeno.setAttribute("inert", "");
        renderNavbar();

        try {
          fireEvent.click(getSheetTrigger());
          fireEvent.keyDown(document.activeElement ?? document.body, {
            key: "Escape",
          });

          expect(ajeno.hasAttribute("inert")).toBe(true);
        } finally {
          ajeno.remove();
        }
      });
    });
  });

  /*
   * CRÍTICA #12, P0: EN `/en` LA NAVEGACIÓN CONSERVABA EL IDIOMA EN CERO
   * ENLACES.
   *
   * Medido sobre el `out/` del build, no supuesto: `out/en.html` llevaba **21
   * `href="/#..."`** -- los 7 destinos de sección del cabecero, los 7 del pie y
   * los 7 de la hoja móvil -- más el logotipo apuntando a `/`. El inglés
   * estrenó URL propia el 2026-08-18 y se perdía al primer clic, cualquiera que
   * fuese.
   *
   * `I18nProvider locale="en"` reproduce lo que hace `app/en/layout.tsx` en
   * producción (mismo patrón que `app/en/en-routes.test.tsx`): el proveedor
   * interno gana al de `renderWithProviders` por proximidad, que es exactamente
   * el mecanismo del árbol real. Se monta el Navbar COMPLETO porque la hoja
   * móvil no es renderizable por su cuenta (ver el docblock de su describe).
   */
  describe("crítica #12: en /en la navegación conserva el idioma", () => {
    function renderNavbarEn(): RenderResult {
      return renderWithProviders(
        <I18nProvider locale="en">
          <Navbar />
        </I18nProvider>,
      );
    }

    /** Los 7 destinos DE DENTRO del sitio, leídos del mismo modelo que consume
     *  el componente (regla 39): el día que el modelo gane una sección, este
     *  test la exige solo. */
    const internosEn = navGroupsFor("en")
      .flatMap((group) => group.items)
      .filter((item) => item.kind !== "external");

    it.each([
      ["la barra de escritorio", "[data-nav-links]"],
      ["la hoja móvil", "[data-nav-sheet]"],
    ])("%s entrega los 7 destinos con el prefijo /en", (_nombre, selector) => {
      const { container } = renderNavbarEn();
      const superficie = container.querySelector(selector) as HTMLElement;
      expect(superficie).not.toBeNull();

      for (const item of internosEn) {
        expect(
          superficie.querySelector(`a[href="${item.href}"]`),
          `${item.key} no apunta a ${item.href}`,
        ).not.toBeNull();
      }
    });

    it("no queda NI UN enlace interno apuntando a la home castellana", () => {
      const { container } = renderNavbarEn();

      const fugas = Array.from(container.querySelectorAll("a"))
        .map((ancla) => ancla.getAttribute("href") ?? "")
        .filter((href) => href.startsWith("/#"));

      expect(
        fugas,
        "estos enlaces devuelven al visitante inglés a la home castellana",
      ).toEqual([]);
    });

    it("el logotipo lleva a la home inglesa", () => {
      renderNavbarEn();
      expect(
        screen.getByRole("link", { name: /VoidToInfinite/i }),
      ).toHaveAttribute("href", routePath("home", "en"));
    });

    /*
     * COMPLEMENTARIO OBLIGATORIO: sin él, "he quitado todos los `/#`" pasaría
     * en verde. La rama castellana tiene que quedar EXACTAMENTE como estaba --
     * es el 100 % del tráfico de hoy.
     */
    it("la rama castellana no se mueve: logotipo a / y los 7 destinos en /#", () => {
      const { container } = renderNavbar();

      expect(
        screen.getByRole("link", { name: /VoidToInfinite/i }),
      ).toHaveAttribute("href", "/");
      for (const item of NAV_GROUPS.flatMap((group) => group.items).filter(
        (candidate) => candidate.kind !== "external",
      )) {
        expect(item.href.startsWith("/#")).toBe(true);
        expect(
          container.querySelector(`a[href="${item.href}"]`),
          `${item.key} dejó de apuntar a ${item.href} en castellano`,
        ).not.toBeNull();
      }
    });
  });
});

/*
 * CRITICA #13, verificacion de la ola I: A 200 % DE FUENTE LA HAMBURGUESA
 * QUEDABA FUERA DE PANTALLA.
 *
 * Medido en navegador real (390x844, raiz del documento a 32px, que es lo que
 * hereda este sitio porque no declara `font-size` en `html`): el boton del
 * menu aterrizaba en `left: 434` sobre 390px de ancho -- entero fuera del
 * viewport -- y `document.elementFromPoint` sobre su centro devolvia null. La
 * unica navegacion en movil dejaba de existir. Causa: `ScNav` es un flex y
 * sus items no encogen por debajo de su contenido (`min-width: auto` es el
 * valor inicial), asi que al escalar todo en `rem` a la vez la fila medía mas
 * que la pantalla y el grupo de la derecha se salia.
 *
 * jsdom NO hace layout, asi que aqui no se puede reproducir la geometria: lo
 * que se ata es la DECLARACION que la gobierna, leida de las reglas que
 * inyecta styled-components. La geometria quedo verificada en navegador
 * (tras el arreglo: `left: 314`, dentro del viewport y alcanzable) y esa
 * medicion vive en el docblock de `ScBrandLink`.
 */
describe("critica #13: la marca cede espacio antes que los controles", () => {
  it("la marca declara min-width: 0 (sin el, un item flex nunca encoge)", () => {
    renderNavbar();
    const marca = allCssRules().filter(
      (r) => r.includes("min-height: 44px") && r.includes("font-size: 1.15rem"),
    );
    expect(marca.length).toBeGreaterThan(0);
    expect(marca.join(" ")).toContain("min-width: 0");
  });

  it("el rotulo de la marca se recorta con puntos suspensivos en vez de empujar", () => {
    renderNavbar();
    const conRecorte = allCssRules().filter(
      (r) =>
        r.includes("text-overflow: ellipsis") &&
        r.includes("white-space: nowrap"),
    );
    expect(conRecorte.length).toBeGreaterThan(0);
  });

  it("el grupo de controles declara flex: none y NUNCA cede", () => {
    renderNavbar();
    const acciones = allCssRules().filter(
      (r) => r.includes("flex: none") && r.includes("align-items: center"),
    );
    expect(acciones.length).toBeGreaterThan(0);
  });
});

/*
 * CRITICA EXTERNA #16 (2026-09-03), hallazgos L12 y L4.
 *
 * jsdom no evalua ningun `@media` (regla 36) y no hace layout (regla 44): ni
 * el modo de colores forzados ni la geometria del rail se pueden observar
 * aqui. Lo que estos candados atan es la DECLARACION que gobierna cada cosa,
 * leida de `document.styleSheets`, y la PROCEDENCIA de sus valores (el token
 * importado, nunca un literal escrito a mano: reglas 35, 36 y 38). La
 * geometria real esta medida en navegador y vive en el docblock de `ScNav`;
 * el borde forzado, en el de `forcedColorsButtonShape` (`Button.tsx`).
 */
describe("critica #16 (L12): el disparador de «Mas» tiene forma de boton bajo colores forzados", () => {
  /** Reglas de estilo declaradas DENTRO de un `@media (forced-colors: active)`.
   *  Mismo helper que ya usa `Button.test.tsx` para el candado hermano. */
  function reglasForcedColors(): CSSStyleRule[] {
    const out: CSSStyleRule[] = [];
    const walk = (rules: CSSRuleList, dentro: boolean): void => {
      Array.from(rules).forEach((rule) => {
        const media = (rule as CSSMediaRule).media;
        const aqui =
          dentro ||
          (media ? /forced-colors:\s*active/.test(media.mediaText) : false);
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

  it("declara un borde propio dentro de @media (forced-colors: active), sobre su MISMO elemento", () => {
    renderNavbar();
    /* `hidden: true`, mismo precedente que los demas candados de este
       disparador en este fichero (ver el helper de la seccion del panel): el
       nombre accesible empieza por la etiqueta visible «Más» y se completa con
       el texto oculto. */
    const disparador = screen.getByRole("button", {
      name: /^Más/i,
      hidden: true,
    });

    const propias = reglasForcedColors().filter((regla) =>
      Array.from(disparador.classList).some((cls) =>
        regla.selectorText.includes(`.${cls}`),
      ),
    );
    const conBorde = propias.filter((regla) =>
      /border(-(top|right|bottom|left))?(-width|-style)?\s*:/.test(
        regla.style.cssText || regla.cssText,
      ),
    );
    expect(
      conBorde.length,
      "el disparador de «Más» no declara borde bajo forced-colors",
    ).toBeGreaterThan(0);
    // La forma del selector se afirma sobre selectorText (regla 35): el borde
    // cuelga del propio boton, no de un descendiente suyo.
    for (const regla of conBorde) {
      expect(regla.selectorText.trim()).toMatch(/^\.[\w-]+$/);
    }
  });

  it("la regla sale del fragmento compartido de Button.tsx, no de una copia del literal", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "Navbar.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("forcedColorsButtonShape");
    // Ni el color de sistema ni el media query aparecen escritos aqui: si
    // alguien copia la regla en vez de interpolarla, este candado cae.
    expect(fuente).not.toContain("ButtonText");
    expect(fuente).not.toContain("forced-colors");
  });
});

describe("critica #16 (L4): el contenido de la barra cuelga del rail de contenido del sitio", () => {
  /** La regla propia de ScNav: es la unica que declara la altura de la banda. */
  function reglaScNav(): string {
    const encontradas = allCssRules().filter(
      (r) =>
        r.includes("height: var(--nav-height)") && r.includes("padding-left:"),
    );
    expect(
      encontradas.length,
      "no se encontro la regla base de ScNav",
    ).toBeGreaterThan(0);
    return encontradas.join(" ");
  }

  /** Las reglas del estado despegado que declaran relleno horizontal. */
  function reglaDespegada(): string {
    const encontradas = allCssRules().filter(
      (r) =>
        r.includes('[data-scrolled="true"]') &&
        r.includes("padding-left:") &&
        r.includes("var(--nav-gap)"),
    );
    expect(
      encontradas.length,
      "no se encontro la regla de ScNav en estado despegado",
    ).toBeGreaterThan(0);
    return encontradas.join(" ");
  }

  it("el relleno se resuelve contra grid.containerMax y space[5], los MISMOS tokens del contenido", () => {
    renderNavbar();
    const regla = reglaScNav();

    // Contra el token importado, nunca contra un string escrito a mano
    // (regla 38). Es el mismo par que declaran ScFeatures/ScContact/ScInner.
    expect(regla).toContain(basicLightTheme.grid.containerMax);
    expect(regla).toContain(basicLightTheme.space[5]);
    expect(regla).toContain("max(");
  });

  it("el rail NO cuelga de grid.navMax: la pildora es chrome y el rail es del contenido (spec 2026-07-31, D7)", () => {
    renderNavbar();
    const regla = reglaScNav();

    expect(regla).not.toContain(basicLightTheme.grid.navMax);
  });

  it("en el estado despegado el suelo del rail descuenta var(--nav-gap), el hueco que la pildora ya mete", () => {
    renderNavbar();
    const regla = reglaDespegada();

    expect(regla).toContain("var(--nav-gap)");
    expect(regla).toContain(basicLightTheme.grid.containerMax);
    // Y el descuento va SOLO en el suelo: el termino del rail sigue siendo el
    // mismo que en reposo, asi que la marca no se mueve al cruzar el umbral.
    expect(regla).toContain(basicLightTheme.space[5]);
  });

  it("los dos rellenos transicionan con la misma duracion y curva que el padding-inline de ScHeader", () => {
    renderNavbar();
    const regla = reglaScNav();

    expect(regla).toContain(
      `padding-left ${basicLightTheme.motion.duration.base} ${basicLightTheme.motion.easing.standard}`,
    );
    expect(regla).toContain(
      `padding-right ${basicLightTheme.motion.duration.base} ${basicLightTheme.motion.easing.standard}`,
    );
  });

  it("bajo reduce, el estado despegado redeclara transition: none (si no, gana por especificidad)", () => {
    stubMatchMedia(true);
    renderNavbar();
    const nav = screen.getByRole("navigation");
    const reglas = allCssRules();
    /* Acotado a la clase de ScNav, no a "alguna regla del documento con esas
       tres palabras": ScBar declara EXACTAMENTE el mismo par de bloques por el
       mismo motivo, asi que un filtro global pasaba en verde leyendo la regla
       del vecino -- comprobado con el bug inyectado de esta tarea. */
    const clase = Array.from(nav.classList).find((c) =>
      reglas.some((r) => r.includes(`.${c}`)),
    ) as string;
    expect(clase, "no se encontro la clase inyectada de ScNav").toBeDefined();

    const reduce = reglas.filter(
      (r) =>
        r.includes("prefers-reduced-motion: reduce") &&
        r.includes(`[data-scrolled="true"] .${clase}`) &&
        r.includes("transition: none"),
    );
    expect(
      reduce.length,
      "el bloque de reduce de ScNav no redeclara el estado despegado",
    ).toBeGreaterThan(0);
  });

  it("la barra ya no reparte relleno por breakpoint: el rail es continuo (candado de fuente)", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "Navbar.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    // Recuento CERRADO (reglas 39/40): el unico consumidor de containerMax en
    // este fichero son los cuatro terminos del rail (dos lados x dos estados).
    expect(fuente.match(/theme\.data\.grid\.containerMax/g)?.length ?? 0).toBe(
      4,
    );
    // space[6] era el relleno de escritorio que el rail sustituye; ya no lo
    // consume nadie en este fichero.
    expect(fuente).not.toContain("space[6]");
  });
});
