import { describe, it, expect } from "vitest";
import {
    PIEZAS,
    SANCIONADAS,
    UMBRAL_GRANDE,
    UMBRAL_NORMAL,
    comprobarContrasteDeTexto,
    leerAcentosGaming,
    leerPaleta,
    luminancia,
    ratio,
    resolverTinta,
    umbralDe,
} from "./check-text-contrast.mjs";
import { contrastRatio } from "../src/theme/tokens/contrast.ts";

/*
 * Este fichero es lo que mete el candado de contraste DENTRO de `pnpm test`.
 * El script sabe medir y sabe fallar por su cuenta, y ademas corre como paso
 * propio del gate (`pnpm check:text-contrast`); esto es el segundo camino, el mismo
 * patron que `check-dark-art-weight.test.mjs` con su script.
 *
 * VALIDADO CON BUG INYECTADO, dos veces y en los dos mecanismos que este
 * candado protege:
 *
 * 1. Aclarando un peldano de la escalera L en `src/theme/tokens/color.ts` (el
 *    indice 8, que es el paso 800 de las cinco rampas, de 0.5 a 0.62 -- el
 *    tipo de retoque de escala que nadie relaciona con «Journey»), el segundo
 *    test de aqui se puso en rojo con
 *
 *      - Expected
 *      + Received
 *      - []
 *      + [
 *      +   "contact/light/neutral/800",
 *      +   "features/light/neutral/800",
 *      +   "features/light/primary/800",
 *      +   "journey/light/neutral/800",
 *      +   "journey/light/primary/800",
 *      +   "journey/light/secondary/800",
 *      +   "story/light/neutral/800",
 *      +   "story/light/primary/800",
 *      +   "story/light/secondary/800",
 *      + ]
 *
 *    y el cuarto con «contact/light/neutral/800 calcula 3.27:1 y el censo en
 *    navegador midio 5.39:1». El CLI salio con codigo 1 y ocho lineas «NO
 *    CUMPLE», la peor `story/light/primary/800 («01»): 3.00:1 contra un
 *    umbral de 4.5:1`. Restaurado el 0.5, los siete tests en verde.
 *
 * 2. Subiendo `superficieL` de `journey/light/primary/700` de 0.87434 a 0.95
 *    (el atajo obvio para «arreglar» la unica pieza sancionada sin tocar el
 *    diseno), el tercer y el cuarto test se pusieron en rojo con
 *
 *      AssertionError: la pieza sancionada ya cumple: retira su entrada de
 *      SANCIONADAS: expected 4.831543069834413 to be less than 4.5
 *
 *      AssertionError: journey/light/primary/700 calcula 4.83:1 y el censo en
 *      navegador midio 4.47:1. Una separacion mayor que 0.06 significa que
 *      alguien movio un token o la superficie medida sin repetir el censo.:
 *      expected 0.3615430698344131 to be less than or equal to 0.06
 *
 *    Restaurado el valor medido, verde. Es decir: el candado vigila los dos
 *    lados -- la tinta que se degrada Y la superficie que alguien retoca para
 *    que el numero salga bien.
 */
describe("candado de contraste del texto de la home fuera del hero", () => {
    it("el censo cubre las cuatro secciones en los dos temas", () => {
        const combinaciones = new Set(
            PIEZAS.map((p) => `${p.seccion}/${p.tema}`),
        );
        for (const seccion of ["story", "journey", "features", "contact"]) {
            for (const tema of ["light", "dark"]) {
                expect(
                    combinaciones.has(`${seccion}/${tema}`),
                    `el censo no tiene ninguna pieza de ${seccion} en tema ${tema}: ` +
                        `un hueco aqui es exactamente el que esta ola vino a cerrar`,
                ).toBe(true);
            }
        }
        expect(PIEZAS.length).toBeGreaterThanOrEqual(40);
    });

    it("ninguna pieza de texto baja de su umbral WCAG sin estar sancionada", () => {
        const { incumplen } = comprobarContrasteDeTexto();
        const detalle = incumplen
            .map(
                (f) =>
                    `${f.clave} («${f.ejemplo}») ${f.calculado.toFixed(2)}:1 < ${f.umbral}`,
            )
            .join("; ");
        expect(
            incumplen.map((f) => f.clave),
            `${incumplen.length} piezas de texto bajan de su umbral WCAG sin ` +
                `estar sancionadas: ${detalle}. No bajes el umbral: vuelve a medir ` +
                `en navegador.`,
        ).toEqual([]);
    });

    it("la lista de sancionadas es exactamente la que el dueno tiene pendiente, y sigue existiendo en el censo", () => {
        const claves = Object.keys(SANCIONADAS);
        expect(claves).toEqual(["journey/light/primary/700"]);
        const { sancionadasVivas } = comprobarContrasteDeTexto();
        expect(sancionadasVivas).toHaveLength(1);
        expect(sancionadasVivas[0].clave).toBe("journey/light/primary/700");
        /* Si la pieza sancionada dejara de incumplir, la sancion sobra y hay
           que retirarla en vez de arrastrarla como deuda invisible. */
        expect(
            sancionadasVivas[0].calculado,
            "la pieza sancionada ya cumple: retira su entrada de SANCIONADAS",
        ).toBeLessThan(sancionadasVivas[0].umbral);
    });

    it("cada pieza calcula lo mismo que midio el navegador, dentro del redondeo de 8 bits", () => {
        const { filas } = comprobarContrasteDeTexto();
        for (const f of filas) {
            expect(
                Math.abs(f.calculado - f.medido),
                `${f.clave} calcula ${f.calculado.toFixed(2)}:1 y el censo en ` +
                    `navegador midio ${f.medido.toFixed(2)}:1. Una separacion mayor ` +
                    `que 0.06 significa que alguien movio un token o la superficie ` +
                    `medida sin repetir el censo.`,
            ).toBeLessThanOrEqual(0.06);
        }
    });

    it("todas las tintas del censo son tokens del repo, no colores sueltos", () => {
        const paleta = leerPaleta();
        const gaming = leerAcentosGaming();
        for (const pieza of PIEZAS) {
            expect(() => resolverTinta(pieza, paleta, gaming)).not.toThrow();
        }
    });

    it("la matematica de contraste de este script coincide con la de src/theme/tokens/contrast.ts", () => {
        const paleta = leerPaleta();
        const pares = [
            [paleta.primary[700], paleta.neutral[50]],
            [paleta.neutral[1000], paleta.neutral[50]],
            [paleta.secondary[300], paleta.neutral[1100]],
        ];
        for (const [a, b] of pares) {
            expect(ratio(luminancia(a), luminancia(b))).toBeCloseTo(
                contrastRatio(a, b),
                6,
            );
        }
    });

    it("el umbral sale del tamano computado, con las fronteras de WCAG en su sitio", () => {
        expect(umbralDe(24, 400)).toBe(UMBRAL_GRANDE);
        expect(umbralDe(23.9, 400)).toBe(UMBRAL_NORMAL);
        expect(umbralDe(18.66, 700)).toBe(UMBRAL_GRANDE);
        expect(umbralDe(18.66, 600)).toBe(UMBRAL_NORMAL);
        expect(umbralDe(14, 700)).toBe(UMBRAL_NORMAL);
    });
});
