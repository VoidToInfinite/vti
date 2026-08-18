import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { LOCALES, ROUTES_BY_LOCALE, routePath } from "@/config/site";
import { PRESS } from "@/motion/vocabulary";
import { LanguageSelector } from "./LanguageSelector";

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
