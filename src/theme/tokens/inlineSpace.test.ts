import { describe, it, expect } from "vitest";
import { space, inlineSpace, MIN_VIEWPORT_PX } from "./space";
import { themes } from "../themes";

/*
 * `inlineSpace` promete tres cosas (ver su docblock): que con la raíz por
 * defecto no cambia nada, que con la raíz ampliada crece hasta donde el
 * viewport da de sí y se detiene ahí, y que por debajo del soporte encoge en
 * vez de desbordar. jsdom no resuelve `min()` ni `vw`, así que las tres se
 * comprueban resolviendo la expresión aquí con la misma aritmética que hace el
 * navegador: `min(A rem, B vw)` = min(A · raíz, B · viewport / 100).
 *
 * VALIDADO CON BUG INYECTADO (2026-09-05): con la raíz de calibración a 15 en
 * vez de 16 (`ROOT_FONT_BASE_PX = 15` en space.ts) caen cuatro de los seis
 * casos, con estas líneas literales:
 *
 *   expected { '2': 'min(0.5rem, 2.34375vw)', …(5) } to deeply equal
 *     { '2': 'min(0.5rem, 2.5vw)', …(5) }
 *   peldaño 2 a 320 px: expected 7.5 to be 8
 *   expected 15 to be 16   (raíz 32 px, 320 px de viewport)
 *   expected 3.75 to be 4  (raíz 16 px, 160 px de viewport)
 *
 * Restaurado el 16, los seis en verde.
 */

const RAIZ_POR_DEFECTO_PX = 16;

function resolver(
  expresion: string,
  raizPx: number,
  viewportPx: number,
): number {
  const m = expresion.match(/^min\(([\d.]+)rem, ([\d.]+)vw\)$/);
  if (!m) throw new Error(`no es un min(rem, vw): "${expresion}"`);
  return Math.min(Number(m[1]) * raizPx, (Number(m[2]) * viewportPx) / 100);
}

function remAPx(rem: string, raizPx: number): number {
  const m = rem.match(/^([\d.]+)rem$/);
  if (!m) throw new Error(`no es un rem: "${rem}"`);
  return Number(m[1]) * raizPx;
}

const PELDANOS = Object.keys(inlineSpace).map(Number) as Array<
  keyof typeof inlineSpace
>;

describe("inlineSpace: relleno del eje inline acotado al viewport", () => {
  it("cada peldaño es min(space[n], vw) con el vw igual al peldaño en píxeles a 320 px", () => {
    expect(inlineSpace).toEqual({
      2: "min(0.5rem, 2.5vw)",
      3: "min(0.75rem, 3.75vw)",
      4: "min(1rem, 5vw)",
      5: "min(1.5rem, 7.5vw)",
      6: "min(2rem, 10vw)",
      7: "min(3rem, 15vw)",
    });
    expect(MIN_VIEWPORT_PX).toBe(320);
  });

  it("el término en rem de cada peldaño ES el peldaño de space, no una copia escrita a mano", () => {
    for (const n of PELDANOS) {
      expect(inlineSpace[n].startsWith(`min(${space[n]}, `)).toBe(true);
    }
  });

  it("con la raíz por defecto y cualquier viewport desde 320 px vale exactamente space[n]: la composición no cambia", () => {
    for (const viewport of [320, 360, 390, 768, 1280, 1920]) {
      for (const n of PELDANOS) {
        expect(
          resolver(inlineSpace[n], RAIZ_POR_DEFECTO_PX, viewport),
          `peldaño ${n} a ${viewport} px`,
        ).toBe(remAPx(space[n], RAIZ_POR_DEFECTO_PX));
      }
    }
  });

  it("con la fuente al 200 % (raíz 32 px) sigue creciendo mientras el viewport da de sí y se detiene a 320 px en el valor por defecto", () => {
    const raiz200 = RAIZ_POR_DEFECTO_PX * 2;
    for (const n of PELDANOS) {
      const porDefecto = remAPx(space[n], RAIZ_POR_DEFECTO_PX);
      // Viewport ancho: el relleno se dobla con la fuente, como manda 1.4.4.
      expect(resolver(inlineSpace[n], raiz200, 1280)).toBe(porDefecto * 2);
      // Umbral exacto: a 20rem (640 px con raíz 32) los dos términos empatan.
      expect(resolver(inlineSpace[n], raiz200, 640)).toBe(porDefecto * 2);
      // Viewport mínimo: vale lo mismo que a 320 px con la raíz por defecto.
      expect(resolver(inlineSpace[n], raiz200, MIN_VIEWPORT_PX)).toBe(
        porDefecto,
      );
    }
  });

  it("por debajo del ancho soportado encoge con el viewport en vez de desbordarlo", () => {
    for (const n of PELDANOS) {
      const porDefecto = remAPx(space[n], RAIZ_POR_DEFECTO_PX);
      expect(resolver(inlineSpace[n], RAIZ_POR_DEFECTO_PX, 160)).toBe(
        porDefecto / 2,
      );
    }
  });

  it("los dos temas exponen el token tal cual, como cualquier otro de la escala", () => {
    expect(themes.light.inlineSpace).toBe(inlineSpace);
    expect(themes.dark.inlineSpace).toBe(inlineSpace);
  });
});
