import { act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import { SkipLink } from "./SkipLink";

/** Texto CSS de las reglas que styled-components inyectó para un elemento
 *  (jsdom no evalúa ningún @media, regla 36 de RULES.md): mismo patrón que
 *  legalPage.parts.test.tsx/NotFoundContent.test.tsx. */
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

describe("SkipLink", () => {
  it("renderiza un enlace real, con el texto traducido y destino #main", () => {
    renderWithProviders(<SkipLink />);
    const enlace = screen.getByRole("link", { name: "Saltar al contenido" });
    expect(enlace.tagName).toBe("A");
    expect(enlace).toHaveAttribute("href", "#main");
  });

  /*
   * "Orden" del brief (Task 2, punto 3): el skip link tiene que ser el
   * PRIMER elemento focalizable de lo que le sigue en el documento. No se
   * puede reproducir el árbol completo de app/providers.tsx aquí (necesita
   * ThemeProvider + I18nProvider reales, cubiertos en app/providers.test.tsx);
   * este test ata la propiedad estructural mínima y reutilizable: renderizado
   * ANTES de cualquier otro contenido, precede a ese contenido en
   * document order, sea cual sea.
   */
  it("precede en orden de documento a cualquier contenido que se renderice después de él", () => {
    renderWithProviders(
      <>
        <SkipLink />
        <button>otro control</button>
      </>,
    );
    const enlace = screen.getByRole("link", { name: "Saltar al contenido" });
    const otro = screen.getByRole("button", { name: "otro control" });
    expect(
      enlace.compareDocumentPosition(otro) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /*
   * Patrón estándar "visualmente oculto hasta :focus-visible" (brief, punto
   * 1): en reposo, transform lo saca del viewport; en :focus-visible, vuelve
   * a su posición. Validado con bug inyectado (ver informe de la tarea):
   * comentando temporalmente el bloque `&:focus-visible` de SkipLink.tsx,
   * este test se pone en rojo (no hay ninguna regla :focus-visible con
   * translateY(0)); restaurado, vuelve a verde.
   */
  it("oculto en reposo (transform fuera de pantalla) y visible en :focus-visible (transform: translateY(0))", () => {
    renderWithProviders(<SkipLink />);
    const enlace = screen.getByRole("link", { name: "Saltar al contenido" });
    const css = cssRuleTextFor(enlace);

    const baseBlock = css.slice(0, css.indexOf(":focus-visible"));
    expect(baseBlock).toContain("translateY(-150%)");

    expect(css).toContain(":focus-visible");
    const focusBlock = css.slice(css.indexOf(":focus-visible"));
    expect(focusBlock).toContain("translateY(0)");
  });

  /*
   * LA SOMBRA NO MANCHA EL LOGOTIPO (crítica #14, P2).
   *
   * El defecto que este candado cierra, medido por el evaluador sobre
   * capturas reales de `/` y de la 404 en tema claro: `translateY(-150%)`
   * mueve la CAJA del enlace fuera de la ventana, pero una `box-shadow` no se
   * recorta contra el borde de la pantalla. Con la caja terminando en y ~= -10
   * y `elevation[3]` (`0 12px 32px`, alfa 0,16), el desenfoque dejaba una
   * mancha gris de y ~= 2 a y ~= 34 sobre la zona del logotipo -- en TODAS las
   * páginas del sitio, y producida por un elemento invisible.
   *
   * Se afirman las DOS mitades: que la sombra NO está en el bloque base y que
   * SÍ está en `:focus-visible`. Solo la primera dejaría pasar el arreglo
   * perezoso (borrarla y quedarse sin elevación cuando el enlace se ve), y
   * solo la segunda no diría nada del defecto.
   *
   * jsdom no pinta ni hace layout: la mancha en sí es inobservable desde aquí
   * (regla 44). Lo que se puede atar es la declaración que la producía, que es
   * donde vive la causa.
   *
   * Validado con el bug inyectado a propósito (regla 34): ver el informe de la
   * entrega.
   */
  it("no declara box-shadow en reposo (fuera de pantalla su desenfoque manchaba el logotipo), y sí en :focus-visible", () => {
    renderWithProviders(<SkipLink />);
    const enlace = screen.getByRole("link", { name: "Saltar al contenido" });
    const css = cssRuleTextFor(enlace);

    const baseBlock = css.slice(0, css.indexOf(":focus-visible"));
    expect(
      baseBlock,
      "el enlace vuelve a proyectar sombra estando fuera de pantalla: mancha el logotipo en todas las páginas",
    ).not.toContain("box-shadow");

    const focusBlock = css.slice(css.indexOf(":focus-visible"));
    expect(focusBlock, "el enlace enfocado se quedó sin elevación").toContain(
      "box-shadow",
    );
  });

  it("respeta prefers-reduced-motion: reduce (transition: none dentro del media query)", () => {
    renderWithProviders(<SkipLink />);
    const enlace = screen.getByRole("link", { name: "Saltar al contenido" });
    const css = cssRuleTextFor(enlace);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
  });

  it("i18n: en inglés muestra 'Skip to content'", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<SkipLink />);
      expect(
        screen.getByRole("link", { name: "Skip to content" }),
      ).toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });
});
