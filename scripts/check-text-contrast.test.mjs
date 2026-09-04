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
 *
 * 3. Vaciando el censo por un lado en vez de degradarlo (ola Q, frente de
 *    correccion). El candado ataba la TINTA y la SUPERFICIE pero no la
 *    EXTENSION: `PIEZAS.length` solo se comparaba contra cero, y el primer test
 *    exigia >= 1 fila por combinacion de seccion y tema. Borrada la fila
 *    `features/dark/FEATURES_GAMING_ACCENT_DARK` -- que es precisamente la
 *    SEGUNDA pieza mas justa del censo, p05 4,65 -- el CLI seguia diciendo
 *    «piezas del censo: 44 / incumplimientos nuevos: 0» con codigo 0 y los
 *    siete tests seguian en verde: el censo encogia y nadie se enteraba. Es la
 *    forma de vacuidad que el candado de presupuesto SI evita (retirar un chunk
 *    de la linea base cuadrando el total lo pone en rojo). Con el primer test de
 *    abajo ya reescrito, la MISMA supresion cae con
 *
 *      AssertionError: el censo encogio o cambio de forma sin volver a medir en
 *      navegador. Si has vuelto a medir de verdad, actualiza CENSO_ESPERADO con
 *      las cifras nuevas; si no, restaura las filas que faltan.: expected {
 *      'contact/dark': 6, …(7) } to deeply equal { 'contact/dark': 6, …(7) }
 *      - Expected
 *      + Received
 *      -   "features/dark": 7,
 *      +   "features/dark": 6,
 *
 *    Y la variante que cuadra las cuentas -- quitar esa misma fila y duplicar la
 *    siguiente, con la que el CLI vuelve a decir «piezas del censo: 45» y sale
 *    con codigo 0 -- cae con
 *
 *      AssertionError: hay filas repetidas en el censo: alguien cuadro el total
 *      duplicando una pieza en vez de conservar la que falta: expected 44 to be
 *      45 // Object.is equality
 *
 *    Restaurada la fila, los siete tests en verde y el CLI en 45.
 */

/*
 * La EXTENSION del censo del 2026-09-04, una cifra por combinacion de seccion y
 * tema. Se teclea aqui a proposito, y no se deriva de `PIEZAS`: derivarla de lo
 * mismo que verifica seria el test autorreferencial que deja pasar cualquier
 * recorte. Estas cifras solo se tocan volviendo a medir en navegador con el
 * metodo del docblock de `check-text-contrast.mjs`.
 */
const CENSO_ESPERADO = {
    "contact/dark": 6,
    "contact/light": 6,
    "features/dark": 7,
    "features/light": 6,
    "journey/dark": 3,
    "journey/light": 8,
    "story/dark": 3,
    "story/light": 6,
};
const PIEZAS_MEDIDAS = 45;

describe("candado de contraste del texto de la home fuera del hero", () => {
    it("el censo conserva la extension que se midio, no solo su forma", () => {
        const cuenta = {};
        for (const pieza of PIEZAS) {
            const combinacion = `${pieza.seccion}/${pieza.tema}`;
            cuenta[combinacion] = (cuenta[combinacion] ?? 0) + 1;
        }
        expect(
            cuenta,
            `el censo encogio o cambio de forma sin volver a medir en navegador. ` +
                `Si has vuelto a medir de verdad, actualiza CENSO_ESPERADO con las ` +
                `cifras nuevas; si no, restaura las filas que faltan.`,
        ).toEqual(CENSO_ESPERADO);
        expect(
            PIEZAS.length,
            `el censo declara ${PIEZAS.length} piezas y se midieron ${PIEZAS_MEDIDAS}`,
        ).toBe(PIEZAS_MEDIDAS);

        /* Sin esto, quitar una fila y duplicar otra cuadraria las cuentas de
           arriba y el censo mediria una pieza menos en silencio -- que es
           exactamente la trampa que el candado del presupuesto de JavaScript ya
           cierra cuando alguien retira un chunk cuadrando el total. */
        const claves = PIEZAS.map(
            (p) => `${p.seccion}/${p.tema}/${p.tinta}/${p.vp}`,
        );
        expect(
            new Set(claves).size,
            `hay filas repetidas en el censo: alguien cuadro el total duplicando ` +
                `una pieza en vez de conservar la que falta`,
        ).toBe(PIEZAS.length);

        /* Anclaje por nombre de las dos piezas mas justas: son las primeras que
           tentaria borrar quien quisiera un censo comodo. La sancionada la ancla
           ademas el tercer test. */
        const sinAncho = PIEZAS.map((p) => `${p.seccion}/${p.tema}/${p.tinta}`);
        for (const clave of [
            "features/dark/FEATURES_GAMING_ACCENT_DARK",
            "journey/light/primary/700",
        ]) {
            expect(
                sinAncho,
                `el censo ya no incluye ${clave}, que es una de las dos piezas mas ` +
                    `justas que se midieron: no se retira sin volver a medir`,
            ).toContain(clave);
        }
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
