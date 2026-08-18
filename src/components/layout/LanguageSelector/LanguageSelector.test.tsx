import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { LanguageSelector } from "./LanguageSelector";

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

describe("LanguageSelector", () => {
  it("renderiza los dos botones de idioma", () => {
    renderWithProviders(<LanguageSelector />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  /*
   * Tarea 1 (navegación accesible), punto 2 del brief: el grupo de botones
   * gana un nombre accesible (role="group" + aria-label), en vez de dos
   * botones "pulsados/no pulsados" sueltos sin contexto. Validado con el
   * bug inyectado a propósito: quitando temporalmente `role="group"` de
   * `ScLanguageSelector` (LanguageSelector.tsx) el primer test de este
   * bloque se pone en rojo (getByRole("group") no encuentra nada);
   * restaurado, vuelve a verde.
   */
  describe("nombre accesible del grupo (Tarea 1, punto 2 del brief)", () => {
    it("el envoltorio es un role=group con aria-label = Common.Lang.title", () => {
      renderWithProviders(<LanguageSelector />);
      const grupo = screen.getByRole("group");
      expect(grupo).toHaveAccessibleName("Idioma");
    });

    it("los dos botones siguen siendo alcanzables por Tab de forma independiente (no se migró a radiogroup)", () => {
      renderWithProviders(<LanguageSelector />);
      const botones = screen.getAllByRole("button");
      for (const boton of botones) {
        expect(boton).not.toHaveAttribute("tabindex", "-1");
        expect(boton.tagName).toBe("BUTTON");
      }
    });
  });

  /*
   * Task 9 (craft de interacción): `:active { transform: scale(...) }`
   * tomado de `vocabulary.PRESS`, con su `transition` y su guard de
   * `prefers-reduced-motion`. Validado con el bug inyectado a propósito
   * (ver informe de la tarea, tabla LanguageSelector): comentando
   * temporalmente el bloque `&:active` de `ScLanguageButton`
   * (`LanguageSelector.tsx`) el primer test de este bloque se pone en rojo
   * (no hay ninguna regla `:active` con `scale`); restaurado, vuelve a
   * verde.
   */
  describe(":active (Task 9, vocabulary.PRESS)", () => {
    it("declara :active con transform: scale(PRESS.activeScale) y transition de transform con PRESS.durationMs/PRESS.easing", () => {
      renderWithProviders(<LanguageSelector />);
      const boton = screen.getAllByRole("button")[0] as HTMLElement;
      const reglas = reglasDe(boton);

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
      const boton = screen.getAllByRole("button")[0] as HTMLElement;
      const reglas = reglasDe(boton);

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
     * temporalmente `touch-action: manipulation;` de ScLanguageButton
     * (LanguageSelector.tsx), este test se pone en rojo; restaurado, vuelve
     * a verde.
     */
    it("Task 13: declara touch-action: manipulation", () => {
      renderWithProviders(<LanguageSelector />);
      const boton = screen.getAllByRole("button")[0] as HTMLElement;
      const reglas = reglasDe(boton);
      expect(reglas.some((r) => r.includes("touch-action: manipulation"))).toBe(
        true,
      );
    });
  });

  /*
   * SALIDA SIN JAVASCRIPT (crítica externa #10, hallazgo A, P1). El evaluador
   * midió con `javaScriptEnabled: false` real que los dos botones se pintan
   * visibles -- uno con el aspecto del idioma ACTIVO -- mientras ninguno de
   * sus manejadores puede correr y no hay ningún otro idioma al que ir
   * (`initI18n()` fija `lng: "es"`). Se ocultan: ver el docblock de
   * `ScLanguageSelector` (`LanguageSelector.tsx`).
   *
   * jsdom no evalúa ningún `@media` (regla 36 de RULES.md), así que se
   * inspecciona `document.styleSheets` acotando la búsqueda al bloque
   * `@media (scripting: none)` concreto -- nunca por substring del CSS
   * completo -- y la FORMA del selector se afirma sobre `selectorText`
   * (regla 35): tiene que apuntar al PROPIO elemento, no a un descendiente.
   *
   * Validado con el bug inyectado a propósito (regla 34): borrada la línea
   * `display: none` del guard de `ScLanguageSelector`, este bloque se pone en
   * rojo ("el selector de idioma se sigue presentando sin JavaScript");
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

    it("el grupo entero se retira con display: none sobre su PROPIA clase", () => {
      renderWithProviders(<LanguageSelector />);
      const grupo = screen.getByRole("group");
      const clases = Array.from(grupo.classList);

      const propias = reglasSinScripting().filter((regla) =>
        clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
      );
      expect(
        propias.length,
        "el selector de idioma se sigue presentando sin JavaScript",
      ).toBeGreaterThan(0);

      propias.forEach((regla) => {
        // Mismo elemento, nunca un descendiente: un selector con espacio
        // describiría otra cosa y no retiraría este control (regla 35).
        expect(regla.selectorText).not.toMatch(/\s/);
        expect(regla.style.display).toBe("none");
      });
    });

    it("CON JavaScript nada cambia: el grupo sigue siendo inline-flex y los dos botones siguen en el orden de tabulación", () => {
      renderWithProviders(<LanguageSelector />);
      const grupo = screen.getByRole("group");
      expect(getComputedStyle(grupo).display).toBe("inline-flex");
      expect(screen.getAllByRole("button")).toHaveLength(2);
      for (const boton of screen.getAllByRole("button")) {
        expect(boton).not.toHaveAttribute("tabindex", "-1");
      }
    });
  });
});
