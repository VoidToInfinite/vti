import { describe, it, expect } from "vitest";
import { longitudCssEnPx, redondear, type ContextoCss } from "./cssLength";

/**
 * VERIFICACION DEL INSTRUMENTO, no de la interfaz.
 *
 * `longitudCssEnPx` es la pieza de la que dependen los candados de tipografia
 * fluida de `Hero.test.tsx` y `Story.test.tsx`: si resolviera mal, esos
 * candados afirmarian cifras inventadas con toda la apariencia de una
 * medicion. Por eso su prueba mas importante no son los casos sinteticos de
 * abajo sino el bloque final, que le pide reproducir las cifras MEDIDAS en
 * Chrome sobre el build servido de `dcafec4` (tema claro, `reducedMotion:
 * reduce`, `Page.setFontSizes` a 16 y a 32, alto de viewport 800):
 *
 *   h1 del hero      320px -> 34      390px -> 34      768px -> 53,76   1280px -> 89,6
 *   subtitulo        320px -> 15      390px -> 15      768px -> 15,36   1280px -> 22
 *   statement Story  320px -> 24      390px -> 29,8333 768px -> 58,6667 1280px -> 101,333
 *
 * Las expresiones de ese bloque son las que el repo tenia ANTES del arreglo
 * del 2026-09-05, a proposito: es la unica forma de comprobar el resolutor
 * contra un navegador real sin volver a construir el sitio.
 */

const VIEWPORT_ALTO = 800;

function ctx(raizPx: number, anchoPx: number): ContextoCss {
  return { raizPx, anchoPx, altoPx: VIEWPORT_ALTO };
}

describe("longitudCssEnPx: unidades", () => {
  it("px es px; rem se multiplica por la raiz; vw y vh por el viewport", () => {
    const c = ctx(16, 320);
    expect(longitudCssEnPx("34px", c)).toBe(34);
    expect(longitudCssEnPx("2.125rem", c)).toBe(34);
    expect(longitudCssEnPx("2.125rem", ctx(32, 320))).toBe(68);
    expect(longitudCssEnPx("10.5vw", c)).toBeCloseTo(33.6, 6);
    expect(longitudCssEnPx("19.2vh", c)).toBeCloseTo(153.6, 6);
    expect(longitudCssEnPx("50vmin", c)).toBe(160);
    expect(longitudCssEnPx("50vmax", c)).toBe(400);
  });

  it("las unidades que este instrumento NO modela lanzan en vez de aproximar", () => {
    const c = ctx(16, 320);
    expect(() => longitudCssEnPx("1.2em", c)).toThrow(/unidad no resoluble/);
    expect(() => longitudCssEnPx("50%", c)).toThrow(/unidad no resoluble/);
    expect(() => longitudCssEnPx("attr(data-x)", c)).toThrow(
      /funcion CSS no resoluble/,
    );
  });
});

describe("longitudCssEnPx: funciones", () => {
  it("clamp(a, b, c) es max(a, min(b, c)), incluidos los dos extremos", () => {
    const c = ctx(16, 320);
    expect(longitudCssEnPx("clamp(10px, 5px, 100px)", c)).toBe(10);
    expect(longitudCssEnPx("clamp(10px, 50px, 100px)", c)).toBe(50);
    expect(longitudCssEnPx("clamp(10px, 500px, 100px)", c)).toBe(100);
  });

  it("min() y max() admiten cualquier numero de argumentos, y anidan", () => {
    const c = ctx(16, 320);
    expect(longitudCssEnPx("min(10.5vw, 19.2vh, 340px)", c)).toBeCloseTo(
      33.6,
      6,
    );
    expect(longitudCssEnPx("max(1.5rem, min(10.5vw, 12px))", c)).toBe(24);
  });

  it("calc() resuelve sumas, restas, productos y parentesis", () => {
    const c = ctx(16, 320);
    expect(longitudCssEnPx("calc((100vw - 16px - 16px) / 12)", c)).toBe(24);
    expect(longitudCssEnPx("calc(2 * 8px + 4px)", c)).toBe(20);
  });

  it("var() lee la propiedad declarada, y si no la hay usa su reserva", () => {
    const base: ContextoCss = {
      raizPx: 16,
      anchoPx: 320,
      altoPx: VIEWPORT_ALTO,
      vars: { "--story-statement-pad": "min(1rem, 5vw)" },
    };
    expect(longitudCssEnPx("var(--story-statement-pad)", base)).toBe(16);
    expect(longitudCssEnPx("var(--hero-title-vw, 7vw)", base)).toBeCloseTo(
      22.4,
      6,
    );
    expect(
      longitudCssEnPx("var(--hero-title-vw, 7vw)", {
        ...base,
        vars: { "--hero-title-vw": "8vw" },
      }),
    ).toBeCloseTo(25.6, 6);
    expect(() => longitudCssEnPx("var(--sin-nada)", base)).toThrow(
      /sin valor declarado ni reserva/,
    );
  });
});

/**
 * El bloque que convierte este fichero en un instrumento verificado: las tres
 * declaraciones REALES del sitio antes del arreglo, contra las cifras que
 * Chrome computo sobre el build servido.
 */
describe("reproduce las cifras medidas en Chrome (build dcafec4)", () => {
  const HERO_ANTES = "clamp(34px, var(--hero-title-vw, 7vw), 258px)";
  const SUBTITULO_ANTES = "clamp(15px, 2vw, 22px)";
  const STATEMENT_ANTES =
    "min(max(24px, min(10.5vw, 19.2vh, 340px)), calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12))";

  /** El pad del statement por breakpoint (sm = 37.5em) y raiz, como en el
   *  sitio: `inlineSpace[4]` por debajo, `inlineSpace[6]` a partir de ahi. */
  function ctxStatement(raizPx: number, anchoPx: number): ContextoCss {
    const pad = anchoPx >= 37.5 * raizPx ? "min(2rem, 10vw)" : "min(1rem, 5vw)";
    return {
      raizPx,
      anchoPx,
      altoPx: VIEWPORT_ALTO,
      vars: { "--story-statement-pad": pad },
    };
  }

  it("h1 del hero: 34 / 34 / 53,76 / 89,6 px con la raiz a 16", () => {
    expect(longitudCssEnPx(HERO_ANTES, ctx(16, 320))).toBe(34);
    expect(longitudCssEnPx(HERO_ANTES, ctx(16, 390))).toBe(34);
    expect(redondear(longitudCssEnPx(HERO_ANTES, ctx(16, 768)))).toBe(53.76);
    expect(redondear(longitudCssEnPx(HERO_ANTES, ctx(16, 1280)))).toBe(89.6);
  });

  it("subtitulo del hero: 15 / 15 / 15,36 / 22 px con la raiz a 16", () => {
    expect(longitudCssEnPx(SUBTITULO_ANTES, ctx(16, 320))).toBe(15);
    expect(longitudCssEnPx(SUBTITULO_ANTES, ctx(16, 390))).toBe(15);
    expect(redondear(longitudCssEnPx(SUBTITULO_ANTES, ctx(16, 768)))).toBe(
      15.36,
    );
    expect(redondear(longitudCssEnPx(SUBTITULO_ANTES, ctx(16, 1280)))).toBe(22);
  });

  it("statement de Story: 24 / 29,8333 / 58,6667 / 101,333 px con la raiz a 16", () => {
    expect(longitudCssEnPx(STATEMENT_ANTES, ctxStatement(16, 320))).toBe(24);
    expect(longitudCssEnPx(STATEMENT_ANTES, ctxStatement(16, 390))).toBeCloseTo(
      29.8333,
      3,
    );
    expect(longitudCssEnPx(STATEMENT_ANTES, ctxStatement(16, 768))).toBeCloseTo(
      58.6667,
      3,
    );
    expect(
      longitudCssEnPx(STATEMENT_ANTES, ctxStatement(16, 1280)),
    ).toBeCloseTo(101.333, 3);
  });

  it("y reproduce TAMBIEN el defecto: con la raiz a 32 y 320px las tres cifras no se movian", () => {
    expect(longitudCssEnPx(HERO_ANTES, ctx(32, 320))).toBe(34);
    expect(longitudCssEnPx(SUBTITULO_ANTES, ctx(32, 320))).toBe(15);
    expect(longitudCssEnPx(STATEMENT_ANTES, ctxStatement(32, 320))).toBe(24);
    // Y el pad del statement a 390px con la raiz a 32 (19,5px, el termino en
    // vw de inlineSpace[4]) da los 29,25px medidos, no los 29,8333 de la raiz
    // por defecto: la sonda distingue las dos ramas.
    expect(longitudCssEnPx(STATEMENT_ANTES, ctxStatement(32, 390))).toBeCloseTo(
      29.25,
      3,
    );
  });
});
