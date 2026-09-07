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
 * 2. Subiendo `superficieL` de la fila de «Descubre» de 0.87434 a 0.95 (el
 *    atajo obvio para «arreglar» una pieza justa sin tocar el diseno), el
 *    cuarto test se pone en rojo. Reverificado en la ola S sobre la fila ya
 *    corregida a `primary/800` (2026-09-06):
 *
 *      AssertionError: journey/light/primary/800 calcula 5.56:1 y el censo en
 *      navegador midio 5.14:1. Una separacion mayor que 0.06 significa que
 *      alguien movio un token o la superficie medida sin repetir el censo.:
 *      expected 0.4193531354776363 to be less than or equal to 0.06
 *
 *    Restaurado el valor medido, «Tests 7 passed». (La fila llevaba entonces
 *    el p05 NOMINAL 5,14 a la espera del recenso; tras medir en Chrome dice
 *    5,04 con su `superficieL` derivada, y el mismo sabotaje daria otra
 *    separacion, no esa.) Es decir: el candado
 *    vigila los dos lados -- la tinta que se degrada Y la superficie que
 *    alguien retoca para que el numero salga bien. (Cuando esta inyeccion se
 *    hizo por primera vez, la fila era `primary/700` y ademas estaba
 *    sancionada, asi que caia tambien el tercer test con «la pieza sancionada
 *    ya cumple: retira su entrada de SANCIONADAS»; esa asercion ya no existe,
 *    porque desde la ola S no hay sanciones.)
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
 *
 * 4. Devolviendo el censo al estado que tenia ANTES de la ola S -- la fila de
 *    «Descubre» con `tinta: "primary/700"` y `p05: 4.47`, que es el P1 #5 de
 *    la critica externa #19 -- el CLI sale con codigo 1 y la linea
 *
 *      NO CUMPLE journey/light/primary/700 («Descubre»): 4.47:1 contra un
 *      umbral de 4.5:1. No bajes el umbral ni toques superficieL: vuelve a
 *      medir en navegador con el metodo del docblock.
 *
 *    y caen tres tests: el primero por el anclaje («el censo ya no incluye
 *    journey/light/primary/800…»), el segundo («1 piezas de texto bajan de su
 *    umbral WCAG sin estar sancionadas: journey/light/primary/700
 *    («Descubre») 4.47:1 < 4.5») y el tercero («1 piezas del censo estan por
 *    debajo de su umbral WCAG: journey/light/primary/700 («Descubre») 4.47:1
 *    < 4.5. Sancionarlas no es una salida: se arreglan.»).
 *
 *    Y LA VARIANTE QUE IMPORTA, la que motiva el tercer test: el MISMO
 *    incumplimiento mas una entrada en `SANCIONADAS` que lo tape. El CLI
 *    vuelve a salir con codigo 0 diciendo «sancionadas y documentadas: 1 /
 *    incumplimientos nuevos: 0» -- exactamente el estado en el que este gate
 *    vivio entre el 2026-09-04 y la critica #19 -- y el segundo test pasa en
 *    verde, porque `incumplen` resta las sancionadas. Lo unico que lo atrapa
 *    es el tercero:
 *
 *      AssertionError: SANCIONADAS solo puede volver a crecer con una DECISION
 *      DEL DUENO FECHADA, escrita en el propio fichero con lo que se midio y
 *      lo que haria falta para retirarla (ver su docblock). Mientras haya una
 *      entrada ahi, este gate sale verde con un incumplimiento de WCAG 1.4.3
 *      medido dentro -- que es exactamente lo que paso entre el censo del
 *      2026-09-04 y la critica externa #19.: expected [
 *      'journey/light/primary/700' ] to deeply equal []
 *
 *    Restaurado todo, «Tests 7 passed» y el CLI en «piezas del censo: 45 /
 *    sancionadas y documentadas: 0 / incumplimientos nuevos: 0», codigo 0.
 *
 * 5. Con la familia `header` recien anadida (critica externa #20, 2026-09-07),
 *    las dos formas de perderla. BORRANDO sus cuatro filas -- que es lo que
 *    haria quien encontrara incomoda una familia nueva -- cae el primer test:
 *
 *      AssertionError: el censo encogio o cambio de forma sin volver a medir
 *      en navegador. Si has vuelto a medir de verdad, actualiza CENSO_ESPERADO
 *      con las cifras nuevas; si no, restaura las filas que faltan.: expected
 *      { 'contact/dark': 6, …(7) } to deeply equal { 'contact/dark': 6, …(9) }
 *      -   "header/dark": 2,
 *      -   "header/light": 2,
 *
 *    Y DEVOLVIENDO LA TINTA VIEJA a una de esas filas (`neutral/400` con su
 *    `p05: 3.39`, que es el P1 medido), el CLI sale con codigo 1 y la linea
 *
 *      NO CUMPLE header/dark/neutral/400 («English»): 3.39:1 contra un umbral
 *      de 4.5:1. No bajes el umbral ni toques superficieL: vuelve a medir en
 *      navegador con el metodo del docblock.
 *
 *    con dos tests en rojo («1 piezas de texto bajan de su umbral WCAG sin
 *    estar sancionadas: header/dark/neutral/400 («English») 3.39:1 < 4.5» y su
 *    hermano que mira las filas crudas). Restaurado, el CLI vuelve a «piezas
 *    del censo: 49 / sancionadas y documentadas: 0 / incumplimientos nuevos:
 *    0», codigo 0.
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
    "header/dark": 2,
    "header/light": 2,
    "journey/dark": 3,
    "journey/light": 8,
    "story/dark": 3,
    "story/light": 6,
};
const PIEZAS_MEDIDAS = 49;

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

        /* Anclaje por nombre de las piezas mas justas: son las primeras que
           tentaria borrar quien quisiera un censo comodo. Las dos primeras son
           las de menos holgura del censo de hoy (4,62 y 4,66 contra 4,5); la
           tercera es «Descubre», que fue el UNICO incumplimiento de la tabla y
           el P1 #5 de la critica #19 -- desde la ola S se pinta con
           `primary/800`, y sigue anclada aqui para que el arreglo no
           desaparezca del censo junto con el problema. La cuarta es el enlace
           de idioma ACTIVO en claro, el P1 de la critica #20 y la pieza mas
           justa de la familia `header` (4,96): la familia entera es nueva y
           una familia nueva es lo mas facil de perder en el siguiente
           recorte. */
        const sinAncho = PIEZAS.map((p) => `${p.seccion}/${p.tema}/${p.tinta}`);
        for (const clave of [
            "journey/light/secondary/700",
            "features/dark/FEATURES_GAMING_ACCENT_DARK",
            "journey/light/primary/800",
            "header/light/primary/900",
        ]) {
            expect(
                sinAncho,
                `el censo ya no incluye ${clave}, que es una de las piezas ancladas ` +
                    `por nombre (las dos de menos holgura, mas la que fue el unico ` +
                    `incumplimiento): no se retira sin volver a medir`,
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

    it("la lista de sancionadas esta VACIA y ninguna pieza del censo se apoya en una excepcion", () => {
        expect(
            Object.keys(SANCIONADAS),
            `SANCIONADAS solo puede volver a crecer con una DECISION DEL DUENO ` +
                `FECHADA, escrita en el propio fichero con lo que se midio y lo que ` +
                `haria falta para retirarla (ver su docblock). Mientras haya una ` +
                `entrada ahi, este gate sale verde con un incumplimiento de WCAG ` +
                `1.4.3 medido dentro -- que es exactamente lo que paso entre el ` +
                `censo del 2026-09-04 y la critica externa #19.`,
        ).toEqual([]);

        const { filas, sancionadasVivas } = comprobarContrasteDeTexto();
        expect(sancionadasVivas).toHaveLength(0);

        /*
         * La CONDICION, no el valor. Este barrido es DELIBERADAMENTE
         * independiente del segundo test: aquel mira `incumplen`, que resta las
         * sancionadas, asi que una entrada nueva en SANCIONADAS lo dejaria en
         * verde. Este mira las filas crudas. Los dos juntos dicen lo que el
         * gate promete: ninguna pieza del censo baja de su umbral, ni siquiera
         * con permiso.
         */
        const pordebajo = filas.filter((f) => f.calculado < f.umbral);
        expect(
            pordebajo.map((f) => f.clave),
            `${pordebajo.length} piezas del censo estan por debajo de su umbral ` +
                `WCAG: ${pordebajo
                    .map(
                        (f) =>
                            `${f.clave} («${f.ejemplo}») ${f.calculado.toFixed(2)}:1 < ${f.umbral}`,
                    )
                    .join("; ")}. Sancionarlas no es una salida: se arreglan.`,
        ).toEqual([]);
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
