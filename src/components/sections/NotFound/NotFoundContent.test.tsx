import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { NotFoundContent } from "./NotFoundContent";

/** Texto CSS de las reglas que styled-components inyecto para un elemento
 *  (jsdom no evalua ningun @media, regla 36): mismo patron que
 *  legalPage.parts.test.tsx/Footer.test.tsx/Story.test.tsx. */
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
 * Aserciones de render trasladadas desde `app/not-found.test.tsx` (auditoria
 * SEO 2026-08-08): `app/not-found.tsx` paso a Server Component con
 * `metadata` propia y ya no puede llevar `"use client"`, asi que el `<h1>`/
 * `<p>` traducidos -- que SI necesitan cliente, consumen `useTranslation` --
 * se movieron a este componente aparte, mismo patron que
 * `PrivacyDocument.tsx`/`LegalDocument.test.tsx` para las paginas legales.
 */
describe("NotFoundContent", () => {
  it("renderiza el heading 404 traducido", () => {
    renderWithProviders(<NotFoundContent />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument();
  });

  it("renderiza tambien el mensaje descriptivo", () => {
    renderWithProviders(<NotFoundContent />);
    expect(screen.getByText(/no existe/i)).toBeInTheDocument();
  });

  /*
   * Task 2 (skip link), review fix round 1 — hueco de evidencia señalado:
   * el <main> gana id="main" tabIndex={-1} como destino real del skip link
   * en esta ruta. Sin este test, la única prueba de que la 404 tiene el
   * landmark era una pasada de navegador que no cubría cada ruta por
   * separado.
   */
  it("el <main> tiene id='main' y tabIndex=-1 (destino del skip link)", () => {
    const { container } = renderWithProviders(<NotFoundContent />);
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  /*
   * P0 de la auditoria premium 2026-08-08: la 404 no tenia NINGUN enlace de
   * salida. Estas tres aserciones verifican, en este orden, las tres partes
   * del criterio del brief: el enlace existe, apunta a "/", y es un <a> REAL
   * (no un boton ni un <span> con onClick) -- lo tercero importa porque solo
   * un <a> real es alcanzable por teclado y anunciado como enlace por un
   * lector de pantalla sin JS adicional.
   */
  it("renderiza un enlace de vuelta al inicio", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace).toBeInTheDocument();
  });

  it("el enlace de vuelta apunta a la home ('/')", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace).toHaveAttribute("href", "/");
  });

  it("el enlace de vuelta es un <a> real, no un elemento simulado", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace.tagName).toBe("A");
  });

  /*
   * Revision final de rama (auditoria premium, hallazgo MENOR): el enlace de
   * vuelta era el unico enlace de texto pulsable del sitio sin la primitiva
   * de press de la Task 9 (vocabulary.PRESS), pese a que su propio docblock
   * afirmaba compartir "el MISMO lenguaje visual" que
   * `legalPage.parts.tsx#ScBackLink` -- que si la tenia desde esa tarea.
   * Mismo patron de aserciones que `legalPage.parts.test.tsx` ("ScBackLink
   * declara :active..."). Validado con el bug inyectado a proposito (regla
   * 34): comentando temporalmente el bloque `&:active` de `ScBackLink`
   * (`NotFoundContent.tsx`) este test se puso en rojo (no habia ninguna
   * regla :active con scale ni la entrada de transform en la transicion);
   * restaurado el bloque, volvio a verde.
   */
  it("el enlace de vuelta declara :active con transform: scale(PRESS.activeScale), transition de transform con PRESS.durationMs/PRESS.easing, y guard de reduce", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
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
