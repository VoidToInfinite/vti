import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { ScBackLink, ScTocLink } from "./legalPage.parts";

/** Texto CSS de las reglas que styled-components inyectó para un elemento
 *  (jsdom no evalúa ningún @media, regla 36): mismo patrón que
 *  Footer.test.tsx/Story.test.tsx. */
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

/*
 * Task 9 (craft de interacción): ScBackLink/ScTocLink ganan
 * :active { transform: scale(...) }, tomado de vocabulary.PRESS, con su
 * propia entrada en transition y su guard de prefers-reduced-motion. Sin
 * hover que guardar: los dos solo cambian color en hover (punto 2 del
 * brief, "los de color pueden quedarse"). Validado con el bug inyectado a
 * propósito (ver informe de la tarea, tabla ScBackLink/ScTocLink):
 * comentando temporalmente el bloque &:active de cada uno
 * (legalPage.parts.tsx) el test correspondiente se pone en rojo (no hay
 * ninguna regla :active con scale); restaurado, vuelve a verde.
 */
describe("legalPage.parts: :active (Task 9, vocabulary.PRESS)", () => {
  it("ScBackLink declara :active con transform: scale(PRESS.activeScale), transition de transform con PRESS.durationMs/PRESS.easing, y guard de reduce", () => {
    renderWithProviders(<ScBackLink href="/">Volver</ScBackLink>);
    const enlace = screen.getByText("Volver");
    const css = cssRuleTextFor(enlace);

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transform: none");
  });

  it("ScTocLink declara :active con transform: scale(PRESS.activeScale), transition de transform con PRESS.durationMs/PRESS.easing, y guard de reduce", () => {
    renderWithProviders(<ScTocLink href="#s1">Sección 1</ScTocLink>);
    const enlace = screen.getByText("Sección 1");
    const css = cssRuleTextFor(enlace);

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transform: none");
  });
});

/*
 * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado con
 * el bug inyectado a propósito (ver informe de la tarea): comentando
 * temporalmente `touch-action: manipulation;` de cada uno
 * (legalPage.parts.tsx), el test correspondiente se pone en rojo;
 * restaurado, vuelve a verde.
 */
describe("legalPage.parts: touch-action (Task 13, punto 2 del brief)", () => {
  it("ScBackLink declara touch-action: manipulation", () => {
    renderWithProviders(<ScBackLink href="/">Volver</ScBackLink>);
    const enlace = screen.getByText("Volver");
    expect(cssRuleTextFor(enlace)).toContain("touch-action: manipulation");
  });

  it("ScTocLink declara touch-action: manipulation", () => {
    renderWithProviders(<ScTocLink href="#s1">Sección 1</ScTocLink>);
    const enlace = screen.getByText("Sección 1");
    expect(cssRuleTextFor(enlace)).toContain("touch-action: manipulation");
  });
});
