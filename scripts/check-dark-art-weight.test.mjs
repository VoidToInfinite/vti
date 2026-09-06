import { describe, it, expect } from "vitest";
import {
    ANCHOR_BYTES,
    ART_BUDGET_BYTES,
    DARK_ART,
    EXCLUIDO_POR_CANDADO,
    NON_ART_BYTES,
    SAFETY_BYTES,
    checkDarkArtWeight,
    verificarExclusiones,
} from "./check-dark-art-weight.mjs";

/*
 * Este fichero es lo que mete el candado de peso DENTRO del gate. El script
 * `check-dark-art-weight.mjs` sabe medir y sabe fallar por su cuenta, pero
 * `pnpm run ci` no lo llama: llama a `pnpm test`. Aqui se cierra ese hueco —
 * mismo patron que `detect-anti-patterns.test.mjs` con su detector.
 *
 * Validado con bug inyectado REAL, y el bug era el propio HEAD: restaurando
 * las 22 pistas AVIF de la escena de Story tal y como estaban en `f486570`
 * (655.523 B en la pista ancha, con canal alfa), el primer test de aqui se
 * puso en rojo con
 *
 *   AssertionError: el arte oscuro del peor caso se pasa del presupuesto por
 *   117.569 B: story/cosmic-being=655.523 B. No subas el presupuesto sin
 *   volver a medir que descarga una visita oscura.
 *   - Expected   0
 *   + Received   117569
 *
 * y el CLI salio con codigo 1 ("NO CUMPLE — 117.569 B por encima del
 * presupuesto de arte"). Restaurado el arte premultiplicado, verde. Es decir:
 * este candado no es teorico, habria parado el repo tal y como estaba.
 *
 * SEGUNDO HUECO, medido y cerrado en la ola Q (frente de correccion). El candado
 * ataba el PESO pero no la EXTENSION del inventario, y el cuarto caso comparaba
 * `entries` con `DARK_ART.length`, o sea consigo mismo. Quitando la entrada
 * `story/cosmic-being` de `DARK_ART` (lineas 98-103 del script), el CLI decia
 * «arte oscuro (peor caso): 382.196 B ... CUMPLE — 537.954 B libres» con codigo
 * de salida 0 y los cuatro casos seguian en verde: el presupuesto se relajaba en
 * 59.696 B por el procedimiento de dejar de mirar. Con `hero/eye`, que es la
 * entrada mas pesada, la relajacion habrian sido 218.828 B. Es la misma forma de
 * vacuidad que el candado de contraste y el de las superficies legales tenian, y
 * se cierra igual: los identificadores del inventario, tecleados aparte.
 */

/*
 * El inventario que se midio, tecleado aqui y NO derivado de `DARK_ART`: es lo
 * unico que impide que el presupuesto se cumpla midiendo menos arte. Se toca
 * cuando cambie de verdad lo que una visita oscura descarga sobre el pliegue, y
 * entonces se toca a la vez que el script.
 */
const INVENTARIO_ESPERADO = ["hero/eye", "story/cosmic-being"];

/*
 * TERCER HUECO, el que abre la ola S (2026-09-06). `figures/journey` salio del
 * inventario de arriba porque el producto dejo de descargarla en oscuro: la
 * columna de la figura de Story pierde su caja bajo `[data-theme="dark"]` y
 * una imagen perezosa sin caja no interseca. Medido con el arreglo puesto,
 * sobre el build propio servido por interceptacion de rutas en Chrome: cero
 * peticiones de `journey-presenting-*` en oscuro a DPR 1 y 2, a 1440x900 y a
 * 390x844, con y sin `reduce`, en `/` y en `/en`; el arte oscuro medido cae de
 * 441.892 B a 278.524 B, que es exactamente lo que Chrome pidio.
 *
 * Sacar una entrada del inventario es, literalmente, la forma de vacuidad que
 * este fichero existe para impedir. La diferencia entre esta salida y aquel
 * recorte es que esta declara de que depende y lo comprueba: los casos de
 * `EXCLUIDO_POR_CANDADO`, mas abajo, leen `Story.tsx` y exigen que sigan ahi
 * la regla y el `loading="lazy"`. Sin las dos cosas a la vez la figura vuelve
 * a descargarse, y entonces esta exclusion seria mentira.
 */
const EXCLUSIONES_ESPERADAS = ["figures/journey"];
describe("candado de peso del arte del tema oscuro", () => {
    it("el peor caso de arte oscuro cabe en el presupuesto declarado", () => {
        const result = checkDarkArtWeight();
        const detalle = result.entries
            .map((e) => `${e.id}=${e.bytes.toLocaleString("es-ES")} B`)
            .join(", ");
        expect(
            Math.max(0, result.overBytes),
            `el arte oscuro del peor caso se pasa del presupuesto por ` +
                `${result.overBytes.toLocaleString("es-ES")} B: ${detalle}. No subas ` +
                `el presupuesto sin volver a medir que descarga una visita oscura.`,
        ).toBe(0);
    });

    it("el total oscuro proyectado se queda por debajo del ancla de 1,5 MB", () => {
        const { worstCaseTotalBytes } = checkDarkArtWeight();
        expect(worstCaseTotalBytes).toBeLessThan(ANCHOR_BYTES);
    });

    it("el presupuesto de arte es exactamente lo que sobra del ancla, no un numero suelto", () => {
        expect(ART_BUDGET_BYTES).toBe(
            ANCHOR_BYTES - NON_ART_BYTES - SAFETY_BYTES,
        );
        expect(SAFETY_BYTES).toBeGreaterThan(0);
    });

    it("el inventario sigue siendo el arte que se midio, y no uno recortado", () => {
        /* Sin esto, el presupuesto se cumple por el procedimiento de dejar de
           mirar: quitar una escena de `DARK_ART` baja el peso medido y ningun
           caso cae. La comparacion es contra la lista tecleada arriba, no contra
           `DARK_ART`, que es la que se verifica. */
        expect(
            DARK_ART.map((e) => e.id),
            `el inventario de arte oscuro encogio o cambio de escenas: si la ` +
                `visita oscura descarga otra cosa, vuelve a medir y actualiza ` +
                `INVENTARIO_ESPERADO; si no, restaura lo que falta`,
        ).toEqual(INVENTARIO_ESPERADO);
    });

    it("cada exclusion sigue siendo cierta en el codigo, o la entrada tiene que volver al inventario", () => {
        /* Validado con bug inyectado: quitando el bloque
           `[data-theme="dark"] & { display: none; }` de `ScFigureWrap`
           (`src/components/sections/Story/Story.tsx`), que es el estado del
           repo en `f3594ad`, este caso se pone en rojo con

             AssertionError: figures/journey salio del inventario de arte
             oscuro porque la regla [data-theme="dark"] & { display: none; }
             de ScFigureWrap lo impedia descargar, y eso ya no esta en el
             codigo: restaura el mecanismo o devuelve la entrada a DARK_ART
             (163.368 B).: expected false to be true // Object.is equality
             - Expected
             + Received
             - true
             + false

           ("Tests 1 failed | 6 passed (7)".) Restaurado el bloque, verde. */
        const filas = verificarExclusiones();
        expect(
            filas.length,
            "sin requisitos que comprobar, una exclusion es una entrada borrada del inventario y nada mas",
        ).toBeGreaterThan(0);
        filas.forEach((fila) => {
            const bytes =
                EXCLUIDO_POR_CANDADO.find((e) => e.id === fila.id)?.bytes ?? 0;
            expect(
                fila.ok,
                `${fila.id} salio del inventario de arte oscuro porque ` +
                    `${fila.descripcion} lo impedia descargar, y eso ya no ` +
                    `esta en el codigo: restaura el mecanismo o devuelve la ` +
                    `entrada a DARK_ART (${bytes.toLocaleString("es-ES")} B).`,
            ).toBe(true);
        });
    });

    it("la lista de exclusiones es la que se midio, y no una puerta abierta para vaciar el inventario", () => {
        /* Mismo razonamiento que el caso del inventario, en el otro sentido:
           alli se impide QUITAR entradas de `DARK_ART`, aqui se impide
           ANADIRLAS a `EXCLUIDO_POR_CANDADO`, que tendria el mismo efecto
           sobre el presupuesto. La lista se teclea aparte a proposito.

           Validado con bug inyectado (vaciando `EXCLUIDO_POR_CANDADO` a `[]`
           en el script, que es como se relajaria el presupuesto sin tocar
           ninguna cifra):

             AssertionError: para excluir arte del inventario hace falta medir
             que el producto dejo de descargarlo y declarar aqui de que
             mecanismo depende: expected [] to deeply equal
             [ 'figures/journey' ]
             - Expected
             + Received
             - [
             -   "figures/journey",
             - ]
             + []

           (Esa inyeccion dio "Tests 2 failed | 5 passed (7)": tambien cae el
           caso de arriba, porque sin exclusiones no hay requisitos que
           comprobar -- "expected 0 to be greater than 0".) */
        expect(
            EXCLUIDO_POR_CANDADO.map((e) => e.id),
            "para excluir arte del inventario hace falta medir que el producto " +
                "dejo de descargarlo y declarar aqui de que mecanismo depende",
        ).toEqual(EXCLUSIONES_ESPERADAS);
    });

    it("cada entrada del inventario sigue encontrando pistas en public/", () => {
        const { entries } = checkDarkArtWeight();
        expect(entries).toHaveLength(DARK_ART.length);
        entries.forEach((entry) => {
            expect(
                entry.files,
                `${entry.id} no encuentra ninguna pista: un cero aqui no es "pesa cero", es un patron que dejo de coincidir`,
            ).toBeGreaterThan(0);
        });
    });
});
