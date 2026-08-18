import { describe, it, expect } from "vitest";
import { type as typo } from "./type";

describe("type tokens", () => {
  it("familias apuntan a variables CSS self-hosted", () => {
    expect(typo.fontBody).toBe("var(--font-body)");
    expect(typo.fontMono).toBe("var(--font-mono)");
  });

  it("escala tipográfica completa tiene los valores canónicos correctos", () => {
    const expectedScale = {
      deckTitle: {
        size: "clamp(2rem, 6vw, 4rem)",
        weight: 700,
        lineHeight: 1.15,
        tracking: "-0.014em",
      },
      display: {
        size: "clamp(2.5rem, 4.4vw, 3.5rem)",
        weight: 800,
        lineHeight: 1.03,
        tracking: "-0.02em",
      },
      h1: {
        size: "2.5rem",
        weight: 700,
        lineHeight: 1.1,
        tracking: "-0.018em",
      },
      h2: {
        size: "2rem",
        weight: 700,
        lineHeight: 1.15,
        tracking: "-0.014em",
      },
      h3: {
        size: "1.5rem",
        weight: 600,
        lineHeight: 1.2,
        tracking: "-0.012em",
      },
      h5: {
        size: "1.125rem",
        weight: 600,
        lineHeight: 1.35,
        tracking: "0",
      },
      body: {
        size: "1rem",
        weight: 400,
        lineHeight: 1.6,
        tracking: "0",
      },
      bodySm: {
        size: "0.875rem",
        weight: 400,
        lineHeight: 1.55,
        tracking: "0",
      },
      caption: {
        size: "0.75rem",
        weight: 500,
        lineHeight: 1.4,
        tracking: "0.01em",
      },
      overline: {
        size: "0.6875rem",
        weight: 600,
        lineHeight: 1.2,
        tracking: "0.18em",
      },
    };

    expect(typo.scale).toEqual(expectedScale);
  });

  /*
   * Recuento cerrado de la escala, NUEVO con la crítica externa #9
   * (2026-08-17). El `toEqual` de arriba ya es un contrato cerrado sobre los
   * VALORES, pero no dejaba escrito en ninguna parte CUÁNTOS peldaños tiene la
   * escala -- aquel cambio la bajó de 12 a 9 (`h4`, `bodyLg` y `code`
   * retirados por cero consumidores; ver el docblock de `TypeVariant` en
   * `type.ts` para el censo y el motivo de cada una).
   *
   * Se añade en el mismo cambio que la retirada, no como aserción aparte:
   * quien vuelva a añadir un peldaño tiene que tocar los dos sitios a la vez,
   * que es justo lo que la regla 40 pide de un contrato cerrado. Y así ha
   * funcionado: la crítica externa #11 (2026-08-18) sube el recuento a 10 al
   * añadir `deckTitle`, y esta cifra se actualiza CON el `toEqual` de arriba,
   * nunca relajando ninguno de los dos.
   */
  it("la escala tiene exactamente 10 peldaños vivos", () => {
    expect(Object.keys(typo.scale)).toHaveLength(10);
  });

  /*
   * Crítica externa #11 (2026-08-18), hallazgo C. `deckTitle` es el ÚNICO
   * peldaño cuyo máximo supera al de `display`, y su docblock declara que eso
   * es deliberado: es tipografía de CARTEL (una diapositiva a sangre completa)
   * y no de documento. Sin este candado, esa afirmación viviría solo en prosa
   * -- y la siguiente revisión que viera un 4rem por encima del techo de
   * `display` podría "corregirlo" a 3.5rem creyendo que arregla una fuga de la
   * escala, cambiando de paso lo que pintan los dos decks.
   *
   * Se afirma la RELACIÓN (deckTitle > display), no los dos números sueltos:
   * si algún día `display` se recalibrara, lo que tiene que seguir siendo
   * cierto es el orden, no el par de cifras de hoy.
   */
  it("deckTitle es el único peldaño por encima del techo de display, y es deliberado", () => {
    const tope = (size: string): number =>
      parseFloat(/,\s*([\d.]+)rem\)$/.exec(size)?.[1] ?? size);
    expect(tope(typo.scale.deckTitle.size)).toBe(4);
    expect(tope(typo.scale.display.size)).toBe(3.5);
    expect(tope(typo.scale.deckTitle.size)).toBeGreaterThan(
      tope(typo.scale.display.size),
    );
  });
});
