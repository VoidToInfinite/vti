import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import { LOCALES, ROUTES_BY_LOCALE, routePath } from "@/config/site";
import { PRESS } from "@/motion/vocabulary";
import { type } from "@/theme/tokens/type";
import {
  languageHref,
  LanguageSelector,
  parseReadingOffset,
  readingOffsetRatio,
  readingOffsetTarget,
  resetLanguageReadingOffsetForTests,
} from "./LanguageSelector";

/*
 * `usePathname()` devuelve `null` fuera del contexto del App Router, que es
 * justo la situación de jsdom: el componente ya trata ese caso (cae a la
 * portada). Cuando un test necesita situarse en una ruta concreta, se
 * sustituye SOLO ese export y se conserva el resto del módulo con
 * `importOriginal` -- `next/navigation` también exporta
 * `useServerInsertedHTML`, del que depende `StyledComponentsRegistry`.
 */
const pathnameMock = vi.hoisted(() => ({ current: null as string | null }));

vi.mock("next/navigation", async (importOriginal) => {
  const real = await importOriginal<typeof import("next/navigation")>();
  return { ...real, usePathname: () => pathnameMock.current };
});

/** Mismo patrón que Button.test.tsx/Card.test.tsx: lee el CSSOM real
 *  inyectado por styled-components -- jsdom no evalúa ningún `@media` ni
 *  pseudo-clase dinámica al resolver `getComputedStyle` (regla 36/44). */
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

function reglasDe(el: HTMLElement): string[] {
  const reglas = allCssRules();
  const clases = Array.from(el.classList).filter((c) =>
    reglas.some((r) => r.includes(c)),
  );
  expect(
    clases.length,
    "no se encontró ninguna clase inyectada del elemento",
  ).toBeGreaterThan(0);
  return reglas.filter((r) => clases.some((c) => r.includes(c)));
}

afterEach(() => {
  pathnameMock.current = null;
});

describe("LanguageSelector", () => {
  it("renderiza los dos idiomas", () => {
    renderWithProviders(<LanguageSelector />);
    expect(screen.getAllByRole("link")).toHaveLength(LOCALES.length);
  });

  /*
   * EL CANDADO CENTRAL DE LA ENTREGA DEL 2026-08-18: el idioma se cambia
   * NAVEGANDO, no conmutando i18next en memoria.
   *
   * Tres críticas seguidas midieron las consecuencias de lo contrario, y todas
   * son la misma causa -- el inglés no tenía dirección: no se podía compartir
   * (quien recibía el enlace veía castellano), no se podía marcar, ningún
   * buscador lo veía, y Atrás no deshacía el cambio porque no había entrada de
   * historial que deshacer. Un `<a href>` da las cuatro cosas sin código
   * propio, así que lo que hay que atar es que SIGA siendo un enlace con
   * destino real: si alguien lo devolviera a `<button onClick>`, las cuatro se
   * pierden a la vez y en silencio.
   *
   * Validado con bug inyectado (rojo observado): ver el informe de la entrega.
   */
  describe("cada idioma es un enlace a su URL (no un conmutador en memoria)", () => {
    it("son elementos <a> con href, no <button>", () => {
      renderWithProviders(<LanguageSelector />);
      const enlaces = screen.getAllByRole("link");

      expect(screen.queryAllByRole("button")).toHaveLength(0);
      for (const enlace of enlaces) {
        expect(enlace.tagName).toBe("A");
        expect(enlace).toHaveAttribute("href");
        expect(enlace.getAttribute("href")).not.toBe("");
      }
    });

    it("desde la portada castellana, el inglés lleva a /en y el castellano a /", () => {
      pathnameMock.current = ROUTES_BY_LOCALE.es.home;
      renderWithProviders(<LanguageSelector />);

      const [es, en] = screen.getAllByRole("link");
      expect(es).toHaveAttribute("href", routePath("home", "es"));
      expect(en).toHaveAttribute("href", routePath("home", "en"));
    });

    /*
     * La contraparte es la MISMA PÁGINA en el otro idioma, no la portada: si
     * el selector devolviera siempre a `/`, cambiar de idioma desde la
     * política de privacidad tiraría al visitante fuera del documento que
     * estaba leyendo.
     */
    it.each(["privacy", "legalNotice"] as const)(
      "desde la ruta castellana de %s, el inglés lleva a su contraparte inglesa",
      (key) => {
        pathnameMock.current = ROUTES_BY_LOCALE.es[key];
        renderWithProviders(<LanguageSelector />);

        const [es, en] = screen.getAllByRole("link");
        expect(es).toHaveAttribute("href", routePath(key, "es"));
        expect(en).toHaveAttribute("href", routePath(key, "en"));
      },
    );

    it.each(["home", "privacy", "legalNotice"] as const)(
      "desde la ruta inglesa de %s, el castellano lleva de vuelta a su contraparte",
      (key) => {
        pathnameMock.current = ROUTES_BY_LOCALE.en[key];
        renderWithProviders(<LanguageSelector />);

        const [es, en] = screen.getAllByRole("link");
        expect(es).toHaveAttribute("href", routePath(key, "es"));
        expect(en).toHaveAttribute("href", routePath(key, "en"));
      },
    );

    /*
     * Una URL rota (la que sirve la 404) no es ninguna de las seis. El destino
     * tiene que ser el MISMO en el HTML horneado -- donde la ruta de partida
     * es `/_not-found` -- y en el navegador -- donde es la URL que el visitante
     * pidió --, o habría un mismatch de hidratación en la única página donde
     * nadie lo estaría buscando. `resolveRoute` casa de forma exacta, así que
     * las dos caen en la portada.
     */
    it("desde una URL desconocida (404) lleva a la portada de cada idioma", () => {
      pathnameMock.current = "/en/esto-no-existe";
      renderWithProviders(<LanguageSelector />);
      const desdeUrlRota = screen
        .getAllByRole("link")
        .map((enlace) => enlace.getAttribute("href"));

      screen.getAllByRole("link").forEach((enlace) => enlace.remove());
      pathnameMock.current = "/_not-found";
      renderWithProviders(<LanguageSelector />);
      const desdePrerenderizado = screen
        .getAllByRole("link")
        .map((enlace) => enlace.getAttribute("href"));

      expect(desdeUrlRota).toEqual([
        routePath("home", "es"),
        routePath("home", "en"),
      ]);
      expect(desdePrerenderizado).toEqual(desdeUrlRota);
    });

    it("declara hrefLang del destino y lang del propio texto del enlace", () => {
      renderWithProviders(<LanguageSelector />);
      const enlaces = screen.getAllByRole("link");

      LOCALES.forEach((locale, i) => {
        expect(enlaces[i]).toHaveAttribute("hreflang", locale);
        expect(enlaces[i]).toHaveAttribute("lang", locale);
      });
    });

    /*
     * `prefetch={false}`, mismo motivo que `Footer.tsx`: bug abierto de Next 16
     * en export estático (vercel/next.js #85374 y #92341) -- el prefetch de
     * segmento RSC pide un nombre de fichero que `output: "export"` no genera,
     * así que SIEMPRE devuelve 404. Candado de FUENTE porque `next/link`
     * desestructura `prefetch` y no lo refleja en el DOM: no hay atributo que
     * observar (mismo patrón y mismo motivo que `Footer.test.tsx`).
     */
    it("los enlaces declaran prefetch={false} (fuente)", async () => {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(here, "LanguageSelector.tsx"), "utf-8");

      // Despoja comentarios ANTES de buscar: el docblock del componente CITA
      // `prefetch={false}` en prosa, así que sin esto el candado pasaría en
      // verde con la prop ausente del JSX (lección del 2026-08-11).
      const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      expect(withoutComments).toContain("prefetch={false}");
    });
  });

  /*
   * CANDADO DE LA ENTREGA DEL 2026-08-20 (ola post-crítica #13, T1): cambiar de
   * idioma ya no tira la posición de lectura.
   *
   * Lo medido antes del arreglo: leyendo la home en `scrollY = 2500` y pulsando
   * «English» se llegaba a `/en` con `scrollY = 0`, sin aviso. El arreglo es que
   * el enlace del OTRO idioma lleve como fragmento la sección que el lector
   * tiene delante, así que lo que hay que atar es exactamente eso -- y sus dos
   * fronteras, que son donde un arreglo así se rompe en silencio: el idioma
   * ACTIVO no lo lleva (su enlace apunta a la página en la que ya estás) y sin
   * sección en pantalla el destino queda pelado (que es SIEMPRE el caso del HTML
   * horneado por el build, y por tanto el del visitante sin JavaScript).
   *
   * Las secciones reales de la home no se montan aquí (solo se renderiza este
   * componente), así que se simulan con `<div id="story|journey|...">` en
   * `document.body` pilotando `dataset.inview` a mano -- exactamente la señal
   * que `useSectionProgress` escribe en producción sobre esos mismos ids, y el
   * mismo patrón que ya usa `Navbar.test.tsx` para el scrollspy.
   *
   * Validado con bug inyectado (rojo observado): ver el informe de la entrega.
   */
  describe("conserva la sección de lectura al cambiar de idioma (T1, 2026-08-20)", () => {
    const SCROLLSPY_IDS = ["story", "journey", "features", "contact"];

    function mockScrollSections(): void {
      for (const id of SCROLLSPY_IDS) {
        const el = document.createElement("div");
        el.id = id;
        document.body.appendChild(el);
      }
    }

    function setInView(id: string): void {
      const el = document.getElementById(id);
      if (!el) throw new Error(`no existe la sección de prueba #${id}`);
      el.dataset.inview = "true";
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
    }

    beforeEach(() => {
      // Mismo stub que `Navbar.test.tsx`: sin él, el rAF de margen que
      // `useActiveSection` pide al primer suscriptor evalúa fuera de `act`.
      vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
      mockScrollSections();
    });

    afterEach(() => {
      for (const id of SCROLLSPY_IDS) document.getElementById(id)?.remove();
      vi.unstubAllGlobals();
    });

    it("leyendo 'journey', el enlace del OTRO idioma lleva su fragmento", () => {
      pathnameMock.current = ROUTES_BY_LOCALE.es.home;
      renderWithProviders(<LanguageSelector />);
      setInView("journey");

      const [, en] = screen.getAllByRole("link");
      expect(en).toHaveAttribute("href", `${routePath("home", "en")}#journey`);
    });

    it("el idioma ACTIVO nunca lo lleva: su destino es la página en la que ya estás", () => {
      pathnameMock.current = ROUTES_BY_LOCALE.es.home;
      renderWithProviders(<LanguageSelector />);
      setInView("journey");

      const [es] = screen.getAllByRole("link");
      expect(es).toHaveAttribute("href", routePath("home", "es"));
    });

    it("sin ninguna sección en pantalla (el lector está en el Hero) el destino queda pelado", () => {
      pathnameMock.current = ROUTES_BY_LOCALE.es.home;
      renderWithProviders(<LanguageSelector />);

      const [es, en] = screen.getAllByRole("link");
      expect(es).toHaveAttribute("href", routePath("home", "es"));
      expect(en).toHaveAttribute("href", routePath("home", "en"));
    });

    /*
     * El fragmento se compone sobre la ruta del idioma de destino, nunca sobre
     * la de partida: en castellano `/` + `#story` da la forma canónica
     * `/#story` que ya usa `NAV_GROUPS`, y en inglés `/en#story`. Se prueba la
     * función pura porque es donde vive esa composición -- el componente solo
     * decide QUÉ sección pasarle.
     */
    it("languageHref compone ruta + fragmento, y devuelve la ruta intacta sin sección", () => {
      expect(languageHref(routePath("home", "en"), "story")).toBe("/en#story");
      expect(languageHref(routePath("home", "es"), "story")).toBe("/#story");
      expect(languageHref(routePath("privacy", "en"), null)).toBe(
        routePath("privacy", "en"),
      );
    });
  });

  /*
   * CANDADO DE LA CRÍTICA EXTERNA #20 (2026-09-07, P1): la sección no basta,
   * también se conserva el punto DENTRO de ella.
   *
   * LO MEDIDO (orquestador de esta ola, 1440x900, tema claro, con el centro
   * del viewport al 85 % de cada sección y pulsando el otro idioma):
   *
   *   #story    1.905 -> 772    (−1.133 px)   #features 3.929 -> 3.067  (−862)
   *   #journey  2.701 -> 2.433  (−268)        #contact  5.082 -> 4.387  (−695)
   *
   * A 390x844 la pérdida llega a −2.227 px. Los dos documentos miden casi lo
   * mismo (6.588 contra 6.536 px), así que la causa no es geométrica: el
   * destino solo llevaba el NOMBRE de la sección.
   *
   * LO QUE ESTE FICHERO PUEDE ATAR Y LO QUE NO, escrito antes que los tests
   * para que nadie lea de más en un verde: jsdom no maqueta ni desplaza
   * (CLAUDE.md §5, punto 2), así que aquí NO se observa "el lector siguió
   * leyendo por donde iba" -- eso son píxeles de un navegador real y lo
   * confirma el orquestador tras integrar. Lo que sí se ata es el MECANISMO
   * entero, que es donde vivía el defecto: QUÉ viaja en la URL, con qué
   * aritmética, CUÁNDO se consume, contra qué geometría, y en qué casos NO se
   * toca nada.
   *
   * VALIDADO CON BUG INYECTADO, cuatro veces y una por mecanismo. En cada una
   * se rompió la implementación real, se observó el rojo y se restauró:
   *
   * 1. `readingOffsetTarget` aterrizando en el inicio de la sección (`const
   *    offset = 0;`), que es literalmente el defecto medido. Cinco tests en
   *    rojo, el primero con
   *
   *      AssertionError: expected 4000 to be 6400 // Object.is equality
   *
   *    y la garantía del centro con «expected 450 to be less than or equal to
   *    400».
   * 2. `languageHref` olvidando la fracción (devolviendo `${path}#${id}` con
   *    ella delante):
   *
   *      AssertionError: expected '/en#journey' to be '/en?read=0.4213#journey'
   *      // Object.is equality
   *
   *    y, en el click, «expected "spy" to be called with arguments: [
   *    '/en?read=0.8#journey' ]».
   * 3. Sin la SEGUNDA PASADA (retirando el `requestAnimationFrame` de
   *    `applyReadingOffset`), que es la que protege del vecino que corrige el
   *    fragmento en el mismo frame:
   *
   *      AssertionError: expected "spy" to be called 1 times, but got 0 times
   *
   * 4. Sin la comprobación de que el ancla medida y el fragmento del `href`
   *    son la MISMA sección (`if (anchor === null) return null;`):
   *
   *      AssertionError: expected "spy" to not be called at all, but actually
   *      been called 1 times
   */
  describe("conserva el punto de lectura dentro de la sección (crítica #20)", () => {
    const VIEWPORT = 900;

    function setScrollY(value: number): void {
      Object.defineProperty(window, "scrollY", {
        value,
        writable: true,
        configurable: true,
      });
    }

    /** Sección de PRIMER NIVEL con su `rect` mockeado y su `data-inview`: la
     *  primera cosa la necesita `captureReadingAnchor` (que barre
     *  `section[id]`) y la segunda el scrollspy que decide el fragmento. Sin
     *  las dos, las dos mitades del componente no hablarían de la misma
     *  sección y el refinamiento se abstendría por su propia regla. */
    function mountSection(id: string, top: number, height: number): void {
      const el = document.createElement("section");
      el.id = id;
      el.dataset.inview = "true";
      el.getBoundingClientRect = (): DOMRect =>
        ({
          top,
          bottom: top + height,
          height,
          left: 0,
          right: 0,
          width: 0,
          x: 0,
          y: top,
          toJSON: () => ({}),
        }) as DOMRect;
      document.body.appendChild(el);
    }

    let frames: Map<number, FrameRequestCallback>;
    let nextFrameId: number;
    let scrollToMock: ReturnType<typeof vi.fn>;
    let assignMock: ReturnType<typeof vi.fn>;
    let originalLocation: Location;

    /**
     * Frena la navegación por defecto de jsdom, que ante un `<a href="/en">`
     * sin `preventDefault` intenta cargar el documento y escupe «Not
     * implemented: navigation» en la salida de la suite.
     *
     * VA EN LA FASE DE BURBUJA Y SOBRE `document`, no en captura, y la
     * diferencia decide si el test prueba algo: en captura correría ANTES que
     * el manejador del componente, que se abstiene si el evento ya viene con
     * `defaultPrevented` -- los casos de "no se secuestra la pulsación"
     * pasarían en verde por el motivo equivocado. En burbuja corre después,
     * así que el componente ve el evento tal cual llega del navegador.
     */
    function frenarNavegacionDeJsdom(event: Event): void {
      event.preventDefault();
    }

    function flushFrame(): void {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(0);
    }

    /** Sustituye `window.location` entero, que es la única vía que funciona en
     *  este jsdom (`assign` es propiedad propia con `configurable: false`; el
     *  porqué completo está en `Contact.test.tsx`). */
    function setLocation(search: string, hash: string): void {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, search, hash, assign: assignMock },
      });
    }

    beforeEach(() => {
      frames = new Map();
      nextFrameId = 1;
      vi.stubGlobal(
        "requestAnimationFrame",
        (callback: FrameRequestCallback) => {
          const id = nextFrameId;
          nextFrameId += 1;
          frames.set(id, callback);
          return id;
        },
      );
      vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        frames.delete(id);
      });
      scrollToMock = vi.fn();
      vi.stubGlobal("scrollTo", scrollToMock);
      assignMock = vi.fn();
      originalLocation = window.location;
      Object.defineProperty(window, "innerHeight", {
        value: VIEWPORT,
        writable: true,
        configurable: true,
      });
      setScrollY(0);
      setLocation("", "");
      document.addEventListener("click", frenarNavegacionDeJsdom);
      /* Cada caso es un DOCUMENTO NUEVO: en el sitio real eso lo garantiza la
         carga, y aquí hay que decirlo porque jsdom reutiliza el módulo para
         todo el fichero. */
      resetLanguageReadingOffsetForTests();
    });

    afterEach(() => {
      document.removeEventListener("click", frenarNavegacionDeJsdom);
      document.body.innerHTML = "";
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
      vi.unstubAllGlobals();
    });

    /*
     * LA ARITMÉTICA, que es la mitad del arreglo que un test puede ver entera.
     */
    describe("aritmética del punto de lectura", () => {
      it("readingOffsetRatio es el desplazamiento dentro de la sección dividido por su alto, y admite negativos", () => {
        expect(
          readingOffsetRatio({
            id: "story",
            topDoc: 1000,
            height: 3000,
            scrollY: 3400,
          }),
        ).toBe(0.8);
        /* Negativo = la sección empieza POR DEBAJO del borde superior de la
           pantalla, el estado normal de cualquier franja de transición.
           Recortarlo sería el mismo error que `anchoredScrollY` documenta. */
        expect(
          readingOffsetRatio({
            id: "story",
            topDoc: 1000,
            height: 2000,
            scrollY: 800,
          }),
        ).toBe(-0.1);
        expect(
          readingOffsetRatio({
            id: "story",
            topDoc: 1000,
            height: 0,
            scrollY: 1000,
          }),
        ).toBeNull();
      });

      /*
       * LA CONDICIÓN QUE EL DEFECTO INCUMPLÍA, enunciada sin depender de la
       * geometría real del sitio: el destino conserva la FRACCIÓN, así que la
       * distancia al inicio de la sección deja de ser cero. Aterrizar en el
       * inicio -- lo que hacía la entrega anterior -- es justo lo que este
       * candado prohíbe.
       */
      it("readingOffsetTarget conserva la fracción, y por tanto NO aterriza en el inicio de la sección", () => {
        const destino = readingOffsetTarget({
          sectionTopDoc: 4000,
          sectionHeight: 3000,
          ratio: 0.8,
          viewportHeight: VIEWPORT,
        });
        expect(destino).toBe(4000 + 2400);
        expect(destino).not.toBe(4000);
      });

      it("la sección puede medir otra cosa en el otro idioma: la fracción se aplica al alto de LLEGADA", () => {
        expect(
          readingOffsetTarget({
            sectionTopDoc: 4000,
            sectionHeight: 3300,
            ratio: 0.8,
            viewportHeight: VIEWPORT,
          }),
        ).toBe(4000 + 2640);
      });

      /*
       * LA GARANTÍA que hereda de `anchoredScrollY` (`themeScrollAnchor.ts`):
       * tras el salto, el centro del viewport sigue DENTRO de la sección. Se
       * comprueba como propiedad sobre una rejilla de casos --incluidos los
       * extremos y una sección que dobla su alto-- porque es una afirmación
       * sobre TODOS los desplazamientos, no sobre uno.
       */
      it("el centro del viewport cae dentro de la sección de llegada, mida lo que mida", () => {
        for (const ratio of [-0.5, -0.2, 0, 0.25, 0.5, 0.75, 1]) {
          for (const alto of [400, 900, 2000, 6000]) {
            const topDoc = 5000;
            const destino = readingOffsetTarget({
              sectionTopDoc: topDoc,
              sectionHeight: alto,
              ratio,
              viewportHeight: VIEWPORT,
            });
            const centro = destino + VIEWPORT / 2 - topDoc;
            expect(
              centro,
              `ratio ${ratio} con alto ${alto} deja el centro en ${centro}, fuera de [0, ${alto}]`,
            ).toBeGreaterThanOrEqual(0);
            expect(centro).toBeLessThanOrEqual(alto);
          }
        }
      });

      it("languageHref añade la fracción como parámetro y conserva el fragmento", () => {
        expect(languageHref("/en", "journey", 0.4213)).toBe(
          "/en?read=0.4213#journey",
        );
        expect(languageHref("/", "journey", -0.12)).toBe(
          "/?read=-0.12#journey",
        );
        // Sin fracción y sin sección, byte a byte lo de antes de esta entrega.
        expect(languageHref("/en", "journey")).toBe("/en#journey");
        expect(languageHref("/en", null, 0.5)).toBe("/en");
      });

      it("parseReadingOffset lee la pareja fragmento + fracción, y descarta lo que no es una", () => {
        expect(parseReadingOffset("?read=0.42", "#journey")).toEqual({
          id: "journey",
          ratio: 0.42,
        });
        // Sin fragmento no hay sección a la que aplicar la fracción.
        expect(parseReadingOffset("?read=0.42", "")).toBeNull();
        // Sin fracción, la carga es una navegación por fragmento normal.
        expect(parseReadingOffset("", "#journey")).toBeNull();
        // Una URL la puede escribir cualquiera: lo que no encaja se ignora
        // entero, nunca se recorta para que quepa.
        expect(parseReadingOffset("?read=hola", "#journey")).toBeNull();
        expect(parseReadingOffset("?read=12", "#journey")).toBeNull();
      });
    });

    /*
     * EL CLICK. La fracción no puede vivir en el `href` --cambia con cada
     * píxel de scroll y el `href` se calcula en render--, así que se compone
     * en el momento de pulsar. Lo que hay que atar es que se componga con la
     * MISMA sección que el `href` ya anunciaba, que el atributo siga intacto
     * (es el destino del visitante sin JavaScript y el de "abrir en pestaña
     * nueva"), y que las pulsaciones que no son una navegación normal no se
     * toquen.
     */
    describe("al pulsar, el destino lleva el punto de lectura", () => {
      function leyendoJourney(): void {
        /* El lector tiene Journey bajo el centro del viewport: la sección
           empieza 2.400 px por encima del borde superior de la pantalla y
           mide 3.000, así que el centro (450) cae dentro. */
        mountSection("journey", -2400, 3000);
        setScrollY(3400);
      }

      it("compone ruta + fracción + fragmento y navega ahí, sin tocar el href del enlace", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.es.home;
        leyendoJourney();
        renderWithProviders(<LanguageSelector />);
        act(() => {
          window.dispatchEvent(new Event("scroll"));
        });

        const [, en] = screen.getAllByRole("link");
        expect(en).toHaveAttribute("href", "/en#journey");
        fireEvent.click(en);

        expect(assignMock).toHaveBeenCalledTimes(1);
        expect(assignMock).toHaveBeenCalledWith("/en?read=0.8#journey");
        // El atributo NO se toca: es lo que ve quien copia el enlace, quien
        // lo abre en otra pestaña y quien no ejecuta JavaScript.
        expect(en).toHaveAttribute("href", "/en#journey");
      });

      it.each([
        ["ctrlKey", { ctrlKey: true }],
        ["metaKey", { metaKey: true }],
        ["shiftKey", { shiftKey: true }],
        ["botón central", { button: 1 }],
      ])(
        "con %s no se secuestra la pulsación: manda el href del atributo",
        (_nombre, init) => {
          pathnameMock.current = ROUTES_BY_LOCALE.es.home;
          leyendoJourney();
          renderWithProviders(<LanguageSelector />);
          act(() => {
            window.dispatchEvent(new Event("scroll"));
          });

          const [, en] = screen.getAllByRole("link");
          fireEvent.click(en, init);
          expect(assignMock).not.toHaveBeenCalled();
        },
      );

      /* En el hero el scrollspy contesta `null` y el ancla contestaría
         `hero`: dos conjuntos de candidatas distintos a propósito. Si no
         coinciden no se refina, o un enlace que lleva a la portada del otro
         idioma se convertiría en un salto a una sección. */
      it("con el lector en el hero (sin sección activa) no se refina nada", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.es.home;
        mountSection("hero", 0, 900);
        setScrollY(200);
        renderWithProviders(<LanguageSelector />);

        const [, en] = screen.getAllByRole("link");
        expect(en).toHaveAttribute("href", "/en");
        fireEvent.click(en);
        expect(assignMock).not.toHaveBeenCalled();
      });

      /*
       * LOS DOS MÓDULOS PUEDEN DISCREPAR, y el componente tiene que abstenerse
       * cuando lo hacen. `useActiveSectionKey` solo mira las secciones de la
       * navegación; `captureReadingAnchor` mira toda `section[id]` de primer
       * nivel, para poder anclar también en el hero. Aquí se monta esa
       * discrepancia exacta: el centro del viewport cae dentro del hero --que
       * el scrollspy no considera-- mientras la única candidata con señal es
       * Journey, que asoma por arriba. Si el refinamiento no comprobara que
       * las dos hablan de la misma sección, compondría la fracción del HERO
       * sobre el fragmento de JOURNEY: un destino que no es donde estaba
       * nadie.
       */
      it("si el ancla medida y el fragmento del href no son la misma sección, no se refina", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.es.home;
        mountSection("hero", 100, 900);
        mountSection("journey", -2000, 2100);
        setScrollY(3000);
        renderWithProviders(<LanguageSelector />);
        act(() => {
          window.dispatchEvent(new Event("scroll"));
        });

        const [, en] = screen.getAllByRole("link");
        expect(en).toHaveAttribute("href", "/en#journey");
        fireEvent.click(en);
        expect(assignMock).not.toHaveBeenCalled();
      });

      it("el idioma ACTIVO nunca navega por su cuenta: su destino es la página en la que ya estás", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.es.home;
        leyendoJourney();
        renderWithProviders(<LanguageSelector />);
        act(() => {
          window.dispatchEvent(new Event("scroll"));
        });

        const [es] = screen.getAllByRole("link");
        fireEvent.click(es);
        expect(assignMock).not.toHaveBeenCalled();
      });
    });

    /*
     * LA LLEGADA. La corrección espera a la rama efectiva con el programador
     * compartido (`branchSettledCorrection.ts`), así que aquí se cuentan sus
     * dos relojes: dos `requestAnimationFrame` anidados.
     */
    describe("al llegar, se consume el punto de lectura de la URL", () => {
      function llegarA(search: string, hash: string): void {
        setLocation(search, hash);
        /* Journey en el documento de llegada: empieza en 4.000 y mide 3.300
           (el mismo contenido ocupa otra cosa en el otro idioma). */
        mountSection("journey", 4000, 3300);
        renderWithProviders(<LanguageSelector />);
      }

      it("desplaza al punto de lectura, y lo hace instantáneo (no un viaje animado de miles de píxeles)", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.en.home;
        llegarA("?read=0.8", "#journey");

        expect(scrollToMock).not.toHaveBeenCalled();
        act(() => {
          flushFrame();
          flushFrame();
        });

        expect(scrollToMock).toHaveBeenCalledTimes(1);
        expect(scrollToMock).toHaveBeenCalledWith({
          top: 4000 + 0.8 * 3300,
          behavior: "instant",
        });
      });

      /*
       * LA SEGUNDA PASADA, y el vecino concreto que la justifica:
       * `useFragmentLanding` corrige el aterrizaje del fragmento con el MISMO
       * programador compartido, así que su `scrollIntoView` cae en el mismo
       * frame que esta corrección y el orden entre dos componentes hermanos no
       * es un contrato. Se simula su efecto --la página de vuelta al inicio de
       * la sección-- y se exige que el frame siguiente lo deshaga.
       */
      it("si algo devuelve la página al inicio de la sección, el frame siguiente restituye el punto de lectura", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.en.home;
        llegarA("?read=0.8", "#journey");
        act(() => {
          flushFrame();
          flushFrame();
        });
        scrollToMock.mockClear();

        // El vecino acaba de aterrizar en el inicio de la sección: la sección
        // pasa a empezar en el borde superior del viewport.
        document.body.innerHTML = "";
        mountSection("journey", 0, 3300);
        setScrollY(4000);
        act(() => {
          flushFrame();
        });

        expect(scrollToMock).toHaveBeenCalledTimes(1);
        expect(scrollToMock).toHaveBeenCalledWith({
          top: 4000 + 0.8 * 3300,
          behavior: "instant",
        });
      });

      it("si la página NO está en el inicio de la sección, la segunda pasada no le arrebata el scroll a nadie", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.en.home;
        llegarA("?read=0.8", "#journey");
        act(() => {
          flushFrame();
          flushFrame();
        });
        scrollToMock.mockClear();

        // El lector se ha ido por su cuenta a otro sitio: ni es el inicio de
        // la sección ni es el destino de la corrección.
        document.body.innerHTML = "";
        mountSection("journey", -1200, 3300);
        setScrollY(5200);
        act(() => {
          flushFrame();
        });

        expect(scrollToMock).not.toHaveBeenCalled();
      });

      it("sin parámetro en la URL no se programa ninguna corrección", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.en.home;
        llegarA("", "#journey");
        act(() => {
          flushFrame();
          flushFrame();
          flushFrame();
        });
        expect(scrollToMock).not.toHaveBeenCalled();
      });

      it("si la sección del fragmento no existe en la rama montada, no se desplaza a ninguna parte", () => {
        pathnameMock.current = ROUTES_BY_LOCALE.en.home;
        setLocation("?read=0.8", "#statement");
        mountSection("journey", 4000, 3300);
        renderWithProviders(<LanguageSelector />);
        act(() => {
          flushFrame();
          flushFrame();
        });
        expect(scrollToMock).not.toHaveBeenCalled();
      });
    });
  });

  /*
   * Tarea 1 (navegación accesible), punto 2 del brief: el grupo gana un nombre
   * accesible (role="group" + aria-label), en vez de dos controles sueltos sin
   * contexto. Validado con el bug inyectado a propósito: quitando
   * temporalmente `role="group"` de `ScLanguageSelector` el primer test de
   * este bloque se pone en rojo (getByRole("group") no encuentra nada);
   * restaurado, vuelve a verde.
   */
  describe("nombre accesible del grupo (Tarea 1, punto 2 del brief)", () => {
    it("el envoltorio es un role=group con aria-label = Common.Lang.title", () => {
      renderWithProviders(<LanguageSelector />);
      const grupo = screen.getByRole("group");
      expect(grupo).toHaveAccessibleName("Idioma");
    });

    it("los dos enlaces siguen siendo alcanzables por Tab de forma independiente", () => {
      renderWithProviders(<LanguageSelector />);
      for (const enlace of screen.getAllByRole("link")) {
        expect(enlace).not.toHaveAttribute("tabindex", "-1");
      }
    });

    /*
     * `aria-pressed` SUSTITUIDO por `aria-current`, y no es un cambio de
     * gusto: `aria-pressed` es un estado del rol `button` (conmutador
     * activado/desactivado) y no está permitido en un enlace. El estado
     * correcto para "de este conjunto, éste es el de la página en la que
     * estás" es `aria-current`.
     */
    it("solo el idioma activo declara aria-current", () => {
      renderWithProviders(<LanguageSelector />);
      const [es, en] = screen.getAllByRole("link");

      expect(es).toHaveAttribute("aria-current", "true");
      expect(en).not.toHaveAttribute("aria-current");
      // `aria-pressed` en un enlace es ARIA inválido: no puede volver.
      expect(es).not.toHaveAttribute("aria-pressed");
      expect(en).not.toHaveAttribute("aria-pressed");
    });
  });

  /*
   * CRÍTICA EXTERNA #15, hallazgo C6 (2026-09-02). Aquí había un
   * `font-size: 0.875rem` escrito a mano que resolvía EXACTAMENTE a
   * `type.scale.bodySm.size`. Este candado ata la mitad que un test puede
   * ver: que el tamaño que llega al CSS sea el del peldaño, así que un
   * retoque del token y esta pieza no pueden divergir.
   *
   * La otra mitad -- que la fuente LEA el token en vez de reescribir un
   * literal equivalente -- ningún test de jsdom puede verla: el CSS
   * renderizado no distingue los dos casos (`task/lessons.md`, 2026-08-12).
   * Esa mitad la cierra la familia `font-size` de
   * `scripts/detect-anti-patterns.mjs`, que sanciona por PROCEDENCIA. Las dos
   * juntas cubren el caso; ninguna por separado.
   */
  it("crítica #15: el tamaño del control sale de type.scale.bodySm, no de un literal propio", () => {
    renderWithProviders(<LanguageSelector />);
    const enlace = screen.getAllByRole("link")[0] as HTMLElement;
    const reglas = reglasDe(enlace).join("");

    // Guarda contra el verde vacío: sin esto, un `toContain` sobre una cadena
    // que no lleva ninguna declaración de tamaño fallaría por el motivo
    // equivocado o pasaría por casualidad.
    expect(reglas).toContain("font-size");
    expect(reglas).toContain(`font-size: ${type.scale.bodySm.size}`);
  });

  /*
   * Task 9 (craft de interacción): `:active { transform: scale(...) }` tomado
   * de `vocabulary.PRESS`, con su `transition` y su guard de
   * `prefers-reduced-motion`. Validado con el bug inyectado a propósito (ver
   * informe de la tarea, tabla LanguageSelector): comentando temporalmente el
   * bloque `&:active` de `ScLanguageButton` el primer test de este bloque se
   * pone en rojo; restaurado, vuelve a verde.
   */
  describe(":active (Task 9, vocabulary.PRESS)", () => {
    it("declara :active con transform: scale(PRESS.activeScale) y transition de transform con PRESS.durationMs/PRESS.easing", () => {
      renderWithProviders(<LanguageSelector />);
      const enlace = screen.getAllByRole("link")[0] as HTMLElement;
      const reglas = reglasDe(enlace);

      const activeRule = reglas.find(
        (r) => r.includes(":active") && r.includes("transform"),
      );
      expect(
        activeRule,
        "no se encontró ninguna regla :active con transform",
      ).toBeDefined();
      expect(activeRule).toContain(`scale(${PRESS.activeScale})`);

      const transitionRule = reglas.find(
        (r) => r.includes("transition") && r.includes("transform"),
      );
      expect(transitionRule).toBeDefined();
      expect(transitionRule).toContain(`${PRESS.durationMs}ms`);
      expect(transitionRule).toContain(PRESS.easing);
    });

    it("el guard de prefers-reduced-motion anula la transición y el transform de :active", () => {
      renderWithProviders(<LanguageSelector />);
      const enlace = screen.getAllByRole("link")[0] as HTMLElement;
      const reglas = reglasDe(enlace);

      const guard = reglas.filter((r) =>
        r.includes("@media (prefers-reduced-motion: reduce)"),
      );
      expect(guard.length).toBeGreaterThan(0);
      const bloqueTexto = guard.join("\n");
      expect(bloqueTexto).toContain("transition: none");
      expect(bloqueTexto).toContain("transform: none");
    });

    /*
     * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
     * con el bug inyectado a propósito (ver informe de la tarea): comentando
     * temporalmente `touch-action: manipulation;` de ScLanguageButton, este
     * test se pone en rojo; restaurado, vuelve a verde.
     */
    it("Task 13: declara touch-action: manipulation", () => {
      renderWithProviders(<LanguageSelector />);
      const enlace = screen.getAllByRole("link")[0] as HTMLElement;
      const reglas = reglasDe(enlace);
      expect(reglas.some((r) => r.includes("touch-action: manipulation"))).toBe(
        true,
      );
    });
  });

  /*
   * SE RETIRA el bloque "sin JavaScript no se presenta (@media (scripting:
   * none))" y lo sustituye su OPUESTO, que es lo que la entrega del 2026-08-18
   * hace cierto.
   *
   * Aquel guard existía por un motivo medido (crítica externa #10, hallazgo A,
   * P1): con `javaScriptEnabled: false` los dos controles se pintaban visibles
   * mientras ninguno de sus manejadores podía correr, y la frase que lo
   * justificaba era «tampoco hay una ruta por idioma a la que un enlace pudiera
   * llevar en su lugar». Desde que `/en`, `/en/privacy` y `/en/legal-notice`
   * son documentos reales, esa premisa es falsa: el control ya no promete algo
   * que no puede cumplir. No se relaja un candado -- se sustituye por el de la
   * propiedad nueva, que es más fuerte (antes: "no se ve"; ahora: "funciona").
   */
  describe("con JavaScript desactivado el control SÍ funciona (ya no se oculta)", () => {
    /** Reglas declaradas DENTRO de un `@media (scripting: none)`, mismo patrón
     *  que `aura.parts.test.tsx`/`Eye.test.tsx`. jsdom no evalúa ningún
     *  `@media` (regla 36), así que se inspecciona `document.styleSheets`. */
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

    it("ninguna regla de este componente lo oculta bajo (scripting: none)", () => {
      renderWithProviders(<LanguageSelector />);
      const grupo = screen.getByRole("group");
      const clases = Array.from(grupo.classList);

      const propias = reglasSinScripting().filter((regla) =>
        clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
      );
      expect(
        propias,
        "el selector vuelve a ocultarse sin JavaScript, pero ahora SÍ hay rutas por idioma a las que llevar",
      ).toEqual([]);
    });

    it("el destino de cada idioma vive en el atributo href, que no necesita JavaScript", () => {
      pathnameMock.current = ROUTES_BY_LOCALE.es.privacy;
      renderWithProviders(<LanguageSelector />);
      const grupo = screen.getByRole("group");

      expect(getComputedStyle(grupo).display).toBe("inline-flex");
      // Se lee del DOM SERIALIZADO: es exactamente lo que recibe un navegador
      // sin JavaScript, sin pasar por ninguna propiedad de React.
      expect(grupo.innerHTML).toContain(`href="${routePath("privacy", "en")}"`);
      expect(grupo.innerHTML).toContain(`href="${routePath("privacy", "es")}"`);
    });
  });
});
