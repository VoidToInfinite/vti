import { describe, it, expect } from "vitest";
import {
    ANCHOR_BYTES,
    ART_BUDGET_BYTES,
    DARK_ART,
    NON_ART_BYTES,
    SAFETY_BYTES,
    checkDarkArtWeight,
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
const INVENTARIO_ESPERADO = [
    "hero/eye",
    "story/cosmic-being",
    "figures/journey",
];
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
