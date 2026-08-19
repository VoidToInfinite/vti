import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { themes } from "@/theme/themes";
import {
  ScBackLink,
  ScInlineLink,
  ScMain,
  ScTable,
  ScTocLink,
} from "./legalPage.parts";

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

/*
 * Afordancia de enlace (Ola B, 2026-08-16). `GlobalStyles` declara
 * `a { text-decoration: none }` para todo el sitio, y `ScBackLink` usaba
 * EXACTAMENTE el mismo color que el cuerpo de texto que lo rodea
 * (`oklch(0.86 0.004 286)` los dos: contraste 1,0:1). En una página legal de
 * 5.198 px es la única salida de la parte alta, y los enlaces del índice de la
 * MISMA página sí se distinguían — la incoherencia era interna.
 *
 * Lo que se bloquea es la afordancia EN REPOSO, no en hover: un hover no
 * existe para quien navega con el dedo.
 *
 * Validado con el bug inyectado a propósito: quitando `text-decoration:
 * underline` de `ScBackLink` (`legalPage.parts.tsx`), este test cae en rojo;
 * restaurado, vuelve a verde.
 */
describe("legalPage.parts: afordancia de enlace (Ola B)", () => {
  it("ScBackLink se subraya en reposo, no solo al pasar el puntero", () => {
    renderWithProviders(<ScBackLink href="/">Volver</ScBackLink>);
    const enlace = screen.getByText("Volver");
    const css = cssRuleTextFor(enlace);
    const reposo = css.split(":hover")[0];

    expect(
      reposo,
      "sin subrayado el enlace es tipográficamente indistinguible de la prosa que lo rodea",
    ).toContain("text-decoration: underline");
    expect(reposo).toContain("text-underline-offset");
  });

  /*
   * Crítica externa #10, hallazgo C: los enlaces del índice se distinguían
   * SOLO por color (`semantic.brandText` contra `semantic.text`), que es lo
   * que WCAG 1.4.1 (nivel A) no admite como única señal. Se replica el
   * precedente del propio fichero (`ScBackLink`, Ola B) con sus mismos
   * valores, no un estilo nuevo.
   *
   * Se afirma sobre el bloque EN REPOSO (todo lo anterior al primer
   * `:hover`) a propósito, igual que el test de arriba: un hover no existe
   * para quien navega con el dedo.
   *
   * Validado con el bug inyectado a propósito: comentando
   * `text-decoration: underline;` en `ScTocLink` (`legalPage.parts.tsx`)
   * este test cae en rojo; restaurada la línea, vuelve a verde.
   */
  it("ScTocLink se subraya en reposo: el color no puede ser su única señal", () => {
    renderWithProviders(<ScTocLink href="#s1">Sección 1</ScTocLink>);
    const enlace = screen.getByText("Sección 1");
    const css = cssRuleTextFor(enlace);
    const reposo = css.split(":hover")[0];

    expect(
      reposo,
      "sin subrayado, el índice solo se distingue del texto por su color (WCAG 1.4.1)",
    ).toContain("text-decoration: underline");
    expect(reposo).toContain("text-underline-offset");
  });

  /*
   * Crítica #13, T1: `ScInlineLink` es el segundo consumidor del bloque
   * compartido `legalLinkStyles` — el enlace que vive DENTRO del texto
   * corrido (el correo de ejercicio de derechos y la sede de la AEPD).
   *
   * Aquí la afordancia pesa todavía más que en el índice: un enlace en prosa
   * está rodeado de texto que se le parece, así que sin las DOS señales
   * (color propio + subrayado) es literalmente indistinguible de la frase que
   * atraviesa. Se afirma sobre el bloque EN REPOSO, igual que los dos de
   * arriba: un hover no existe para quien navega con el dedo.
   *
   * El color se compara contra el TOKEN importado (regla 38), no contra un
   * string escrito a mano, y contra el rol del cuerpo del documento
   * (`semantic.text`, el de `ScParagraph`) para que «distinto del cuerpo» sea
   * una comprobación y no una afirmación de prosa.
   *
   * Validado con el bug inyectado a propósito: comentando
   * `text-decoration: underline;` en `legalLinkStyles` (`legalPage.parts.tsx`)
   * este caso cae en rojo; restaurada la línea, vuelve a verde.
   */
  it("ScInlineLink se subraya en reposo y no comparte color con el cuerpo del documento", () => {
    renderWithProviders(
      <ScInlineLink href="mailto:x@y.test">x@y.test</ScInlineLink>,
    );
    const enlace = screen.getByText("x@y.test");
    const css = cssRuleTextFor(enlace);
    const reposo = css.split(":hover")[0];

    expect(
      reposo,
      "sin subrayado, un enlace en prosa es indistinguible de la frase que atraviesa",
    ).toContain("text-decoration: underline");
    expect(reposo).toContain("text-underline-offset");
    expect(reposo).toContain(`color: ${themes.light.semantic.brandText}`);
    expect(themes.light.semantic.brandText).not.toBe(
      themes.light.semantic.text,
    );
    expect(themes.dark.semantic.brandText).not.toBe(themes.dark.semantic.text);
  });
});

/*
 * Crítica externa #10, hallazgo A (P0). `/privacidad` recortaba contenido en
 * todo móvil por debajo de 466 px: a 320 px se perdían 122 px de página y el
 * `h1` renderizaba «Política de privacidac».
 *
 * La causa raíz completa vive en el comentario de `ScMain`
 * (`legalPage.parts.tsx`); en dos líneas: `body` es un contenedor flex en
 * columna desde la Ola B, un ítem flex con un margen AUTO en el eje
 * transversal NO se estira, y sin estirarse su ancho cae a `fit-content` —
 * que la tabla de almacenamiento de 5 columnas empujaba hasta ~476 px,
 * topados por el `max-width` de la propia caja.
 *
 * Lo que estos dos candados protegen es exactamente la línea que impide ese
 * camino (`width: 100%`, un ancho DEFINIDO) y la que entrega la medida de
 * lectura prometida. jsdom no hace layout, así que ninguno de los dos puede
 * medir el recorte: afirman la declaración que lo evita, contra los tokens
 * importados y nunca contra un número escrito a mano.
 *
 * Validados con el bug inyectado a propósito (ver informe de la tarea):
 * comentando la línea real de cada uno en `legalPage.parts.tsx` el candado
 * correspondiente cae en rojo; restaurada la línea, vuelve a verde.
 */
describe("legalPage.parts: ancho de ScMain (crítica externa #10, hallazgos A y C)", () => {
  it("ScMain declara un ancho DEFINIDO (width: 100%), sin el que la caja se dimensiona por su contenido", () => {
    renderWithProviders(<ScMain>documento</ScMain>);
    const css = cssRuleTextFor(screen.getByRole("main"));

    expect(
      css,
      "sin un ancho definido, el min-content de la tabla infla la caja por encima del viewport",
    ).toMatch(/[{;]\s*width:\s*100%/);
  });

  it("ScMain suma los dos rellenos a su tope, para que quien mida grid.prose sea la caja de CONTENIDO", () => {
    renderWithProviders(<ScMain>documento</ScMain>);
    /* Se compara sobre el texto NORMALIZADO, no crudo: el valor de un
       `calc()` conserva los saltos de línea con los que se escribió en el
       template de styled-components (verificado leyendo el `cssText` real
       que devuelve jsdom, no supuesto), así que un `toContain` literal
       dependería del ancho con el que Prettier decida partir la línea —
       una propiedad del formateo, no del CSS. */
    const css = cssRuleTextFor(screen.getByRole("main"))
      .replace(/\s+/g, " ")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")");

    expect(
      css,
      "con el tope a grid.prose pelado, el padding se come 48 px de la medida de lectura",
    ).toContain(
      `calc(${themes.light.grid.prose} + 2 * ${themes.light.space[5]})`,
    );
  });

  /*
   * El suelo de la tabla: lo que impide que «que ScMain deje de inflarse» se
   * pague aplastando las 5 columnas (el atajo `table-layout: fixed` con
   * `width: 100%` daría columnas de 64 px a 320 px). Se afirma contra el
   * token, no contra su valor.
   */
  it("ScTable declara un suelo de ancho igual a la medida de lectura", () => {
    renderWithProviders(
      <ScTable>
        <tbody>
          <tr>
            <td>dato</td>
          </tr>
        </tbody>
      </ScTable>,
    );
    const css = cssRuleTextFor(screen.getByRole("table"));

    expect(css).toContain(`min-width: ${themes.light.grid.prose}`);
  });
});
