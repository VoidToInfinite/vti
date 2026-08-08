import { describe, it, expect } from "vitest";
import { contrastRatioOverAlpha } from "@/theme/tokens/contrast";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";

/*
 * Contraste del marcador de dato pendiente (`ScMark`,
 * `src/components/legal/legalPage.parts.tsx`, D23 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md).
 *
 * Este test existe por un hallazgo de la auditoría adversarial de la entrega
 * del 2026-08-05, y el hallazgo NO era un fallo visual: era una afirmación de
 * prosa sin candado. La declaración de accesibilidad de entonces (retirada el
 * 2026-08-08) decía que el contraste de color cumple AA y que eso estaba
 * "respaldado por pruebas automatizadas", pero `contrast.test.ts` solo cubría
 * los roles de texto sobre las superficies OPACAS del sistema
 * (`text`/`textMuted`/`textSubtle` sobre `bg`/`surface`/`surfaceSunken`).
 * `ScMark` es la primera superficie del sistema con ALFA: pinta
 * `color-mix(in oklch, semantic.warning 30%, transparent)` bajo un texto que
 * hereda `semantic.text`. Ninguna aserción existente tocaba esa combinación,
 * así que la declaración afirmaba estar atada por algo que no la miraba.
 *
 * El test sigue en pie después de retirar aquella página: el marcador no
 * dependía de ella. Aparece hoy en 18 sitios del HTML emitido (11 en
 * `/privacidad` y 7 en `/aviso-legal`, contados en navegador el 2026-08-08) y
 * es, por definición, el texto que MÁS importa que se lea: señala justo lo
 * que falta por completar.
 */

/** Alfa efectiva del `color-mix(... warning 30%, transparent)` de `ScMark`. */
const MARK_ALPHA = 0.3;

/** Umbral WCAG 2.2 AA para texto normal (el marcador va en negrita pero a
 *  tamaño de cuerpo, así que NO se le aplica el umbral relajado de 3:1 del
 *  texto grande, que exige 18,66px en negrita). */
const AA_TEXTO_NORMAL = 4.5;

const temas = [
  { nombre: "claro", theme: basicLightTheme },
  { nombre: "oscuro", theme: basicDarkTheme },
] as const;

/* El marcador puede caer sobre cualquiera de las tres superficies del
   sistema: el documento legal se pinta sobre `bg`, y las piezas destacadas
   (`note`) sobre `surface`/`surfaceSunken`. Se comprueban las tres, no solo
   la más favorable. */
const superficies = ["bg", "surface", "surfaceSunken"] as const;

describe("ScMark — contraste del marcador de dato pendiente", () => {
  it.each(
    temas.flatMap(({ nombre, theme }) =>
      superficies.map((superficie) => ({ nombre, theme, superficie })),
    ),
  )(
    "tema $nombre: el texto del marcador sobre $superficie cumple AA",
    ({ theme, superficie }) => {
      const ratio = contrastRatioOverAlpha(
        theme.semantic.text,
        theme.semantic.warning,
        MARK_ALPHA,
        theme.semantic[superficie],
      );

      expect(
        ratio,
        `contraste ${ratio.toFixed(2)}:1, por debajo de AA`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  /*
   * Sonda de no-vacuidad. Sin esto, los seis casos de arriba pasarían igual
   * de verdes si `contrastRatioOverAlpha` devolviera siempre un número
   * grande por un error de signo o de composición: un texto del MISMO color
   * que el acento sobre ese mismo acento tiene que dar un ratio bajísimo.
   */
  it("la funcion de composicion no devuelve siempre un valor alto", () => {
    const ratio = contrastRatioOverAlpha(
      basicLightTheme.semantic.warning,
      basicLightTheme.semantic.warning,
      1,
      basicLightTheme.semantic.warning,
    );
    expect(ratio).toBeCloseTo(1, 5);
  });
});
