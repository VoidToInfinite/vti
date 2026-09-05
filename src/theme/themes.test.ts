import { describe, it, expect } from "vitest";
import { themes } from "./themes";

describe("themes", () => {
  it("light y dark exponen los grupos de token nuevos", () => {
    for (const t of [themes.light, themes.dark]) {
      expect(t.semantic.brand).toMatch(/^oklch\(/);
      expect(t.space[5]).toBe("1.5rem");
      expect(t.motion.easing.standard).toContain("cubic-bezier");
      expect(t.type.scale.h1.size).toBe("2.5rem");
    }
  });

  it("mantiene el flag isLight correcto", () => {
    expect(themes.light.isLight).toBe(true);
    expect(themes.dark.isLight).toBe(false);
  });

  it("conserva breakPoint en ambos temas (sigue en uso fuera de theme/)", () => {
    expect(themes.light.breakPoint.md).toBe("screen and (min-width: 48em)");
    expect(themes.dark.breakPoint.md).toBe("screen and (min-width: 48em)");
  });

  /*
   * LOS CUATRO ESCALONES EN `em`, Y VALIENDO LO MISMO QUE SIEMPRE A LA RAÍZ
   * DE FÁBRICA (frente F, 2026-09-05).
   *
   * EL DEFECTO. Una media query en píxeles no se entera de la preferencia de
   * tamaño de texto del usuario. Medido en Chrome sobre el build de
   * producción servido, `Page.setFontSizes` a 32 px —la misma palanca que esa
   * preferencia, la que exige WCAG 1.4.4—, `prefers-reduced-motion: reduce`,
   * tema claro, sobre la tarjeta de Contacto: a 768 px la pista de la tarjeta
   * daba `278.828px 199.156px`, es decir, DOS columnas sobre lo que para el
   * usuario son 24rem —el ancho de un móvil pequeño a la raíz de fábrica—, y
   * la columna del formulario dejaba el rótulo del CTA en 58,83 px repartidos
   * en 8 líneas: menos que en la banda de 320 px. En `em` el escalón se dobla
   * con la preferencia y esa banda vuelve a una columna.
   *
   * QUÉ ATA ESTE CASO, y por qué no es un espejo del código: no afirma que
   * `md` "valga 48em". Exige las DOS mitades a la vez —que la unidad sea `em`
   * (la que responde a la preferencia) y que su equivalencia en píxeles con
   * la raíz de fábrica sea EXACTAMENTE la de siempre—, que es justo lo que
   * hace de esta migración una mudanza y no un rediseño. Una sola de las dos
   * se puede satisfacer rompiendo la otra.
   *
   * VALIDADO CON BUG INYECTADO (2026-09-05). Se devolvió `md` a
   * `screen and (min-width: 768px)` en `themes.ts` y se ejecutó este fichero:
   * 3 casos en rojo de 7. El de este candado, con su línea LITERAL:
   *
   *   AssertionError: el breakpoint md se declara como "screen and (min-width:
   *   768px)": una condicion en px ignora la preferencia de tamano de texto del
   *   usuario, y el 2026-09-05 eso puso la tarjeta de Contacto en dos columnas
   *   sobre 24rem de ancho efectivo.: expected null not to be null
   *
   * Restaurado el `em`, los 7 en verde.
   */
  it("los cuatro breakpoints se declaran en em y valen lo mismo que siempre con la raiz de fabrica", () => {
    /** Raíz tipográfica de fábrica de los navegadores, en px. */
    const RAIZ_DE_FABRICA_PX = 16;

    /** El ancho en píxeles que cada escalón tenía y tiene que seguir teniendo. */
    const EQUIVALENCIA_PX = { sm: 600, md: 768, lg: 992, xl: 1200 } as const;

    (
      Object.keys(EQUIVALENCIA_PX) as Array<keyof typeof EQUIVALENCIA_PX>
    ).forEach((escalon) => {
      const consulta = themes.light.breakPoint[escalon];
      const enEm = /\(min-width:\s*([\d.]+)em\)/.exec(consulta);

      expect(
        enEm,
        `el breakpoint ${escalon} se declara como "${consulta}": una condicion en px ignora la ` +
          "preferencia de tamano de texto del usuario, y el 2026-09-05 eso puso la tarjeta de " +
          "Contacto en dos columnas sobre 24rem de ancho efectivo.",
      ).not.toBeNull();

      expect(
        Number((enEm as RegExpExecArray)[1]) * RAIZ_DE_FABRICA_PX,
        `el breakpoint ${escalon} dejo de valer ${EQUIVALENCIA_PX[escalon]}px con la raiz de fabrica: ` +
          "la migracion a em es una mudanza, no un rediseno del layout.",
      ).toBe(EQUIVALENCIA_PX[escalon]);

      // Y ni un px suelto en la condicion: un `min-width: 768px` colado
      // detras del `em` volveria a fijar el escalon sin que la aritmetica de
      // arriba se enterase.
      expect(
        consulta,
        `el breakpoint ${escalon} conserva una longitud en px en su condicion`,
      ).not.toMatch(/[\d.]px/);
    });
  });

  /*
   * Crítica externa #14, P3: hasta el 2026-09-02 los cuatro breakpoints se
   * escribían DOS veces, byte a byte, una dentro de cada tema. `toEqual`
   * (mismos valores) no habría bastado como candado: era exactamente lo que
   * cumplían las dos copias duplicadas mientras nadie tocara una sola de
   * ellas. `toBe` exige la MISMA referencia, es decir, que el bloque viva en
   * `shared` y no pueda divergir por construcción -- el mismo criterio con el
   * que ya estaba atada `palette` justo aquí abajo.
   */
  it("los dos temas comparten la MISMA referencia de breakPoint (vive en shared, no duplicado por tema)", () => {
    expect(themes.light.breakPoint).toBe(themes.dark.breakPoint);
    expect(themes.light.breakPoint).toEqual({
      sm: "screen and (min-width: 37.5em)",
      md: "screen and (min-width: 48em)",
      lg: "screen and (min-width: 62em)",
      xl: "screen and (min-width: 75em)",
    });
  });

  it("light y dark exponen exactamente el mismo conjunto de claves de nivel superior", () => {
    const lightKeys = Object.keys(themes.light).sort();
    const darkKeys = Object.keys(themes.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it("los nuevos grupos de paleta y grid son consistentes entre temas (tokens compartidos)", () => {
    expect(themes.light.palette).toBe(themes.dark.palette);
    expect(themes.light.grid).toEqual(themes.dark.grid);
    expect(themes.light.zIndex).toEqual(themes.dark.zIndex);
  });
});
