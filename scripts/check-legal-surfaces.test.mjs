import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
    BROKEN_SEGMENT,
    CHECKS,
    EN_PREFIX,
    LEGAL_DOCS,
    SURFACES,
    WIDTH_SWEEP,
} from "./check-legal-surfaces.mjs";
/* Alias del repo, no ruta relativa con extension: este fichero es `.mjs` y el
   parser de Rollup no admite un `.ts` explicito en el especificador. */
import { EN_ROUTES, ROUTES, resolveRoute } from "@/config/site";

/*
 * ESTE FICHERO ES LO QUE METE EL CANDADO DE NAVEGADOR DENTRO DEL GATE, y es
 * tambien lo que impide que ese candado se vacie en silencio.
 *
 * `check-legal-surfaces.mjs` sabe medir seis superficies y sabe fallar por su
 * cuenta, pero `pnpm run ci` no lo llama: necesita el sitio SERVIDO, y el gate
 * corre antes de `pnpm build` -- el mismo motivo por el que
 * `scripts/measure-home-js.mjs` tampoco entra. Lo que SI corre en el gate es
 * esto, con el mismo patron que `check-dark-art-weight.test.mjs` con su script.
 *
 * QUE PROTEGE, exactamente. Un candado de navegador al que alguien le borra la
 * mitad de las rutas, o una familia de comprobaciones, SIGUE SALIENDO VERDE: se
 * limita a medir menos. Es la forma de vacuidad que este repo ya pago dos veces
 * y que las dos veces se descubrio tarde. Aqui se ata la COBERTURA:
 *
 *   1. las rutas del script son las rutas REALES del sitio, comparadas contra
 *      `src/config/site.ts` (la fuente unica) y no contra strings gemelos;
 *   2. el camino que provoca la 404 no es ninguna ruta conocida, verificado con
 *      el propio `resolveRoute()` del repo;
 *   3. el barrido de anchos cubre de verdad los dos extremos del encargo y el
 *      escalon `md` donde la cabecera cambia de forma;
 *   4. cada familia declarada en `CHECKS` tiene una comprobacion REAL en el
 *      cuerpo del script, marcada con `[check: <id>]`, y cada marca del cuerpo
 *      esta declarada en `CHECKS`. El vinculo es bidireccional a proposito:
 *      declarar una familia que nadie mide y medir una que nadie declara son
 *      los dos la misma mentira.
 *
 * Validado con bug inyectado a proposito (ver el informe del frente Q-2):
 * borrando el marcador `[check: forced-colors]` del cuerpo del script, el cuarto
 * caso cae en rojo con "la familia declarada forced-colors no tiene ninguna
 * comprobacion marcada en el cuerpo del script"; restaurado, verde.
 */

const SCRIPT = readFileSync(
    path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "check-legal-surfaces.mjs",
    ),
    "utf8",
);

describe("cobertura del candado de las superficies legales y la 404", () => {
    it("cubre los dos documentos legales en los dos idiomas mas una 404 por idioma", () => {
        expect(SURFACES).toHaveLength(LEGAL_DOCS.length * 2 + 2);

        const legales = SURFACES.filter((s) => s.kind === "legal");
        const cuatrocientos = SURFACES.filter((s) => s.kind === "notFound");
        expect(legales).toHaveLength(LEGAL_DOCS.length * 2);
        expect(cuatrocientos).toHaveLength(2);

        for (const locale of ["es", "en"]) {
            expect(
                legales.filter((s) => s.locale === locale),
                `falta la rama ${locale} de algun documento legal`,
            ).toHaveLength(LEGAL_DOCS.length);
            expect(
                cuatrocientos.filter((s) => s.locale === locale),
                `falta la 404 de la rama ${locale}`,
            ).toHaveLength(1);
        }
    });

    it("las rutas del script son las del sitio, leidas de src/config/site.ts", () => {
        // Sonda positiva: sin documentos, los `toContain` de abajo no correrian.
        expect(LEGAL_DOCS.length).toBeGreaterThan(0);

        const caminos = SURFACES.map((s) => s.path);
        for (const clave of ["privacy", "legalNotice"]) {
            expect(
                caminos,
                `el script no recorre la ruta castellana de ${clave}`,
            ).toContain(ROUTES[clave]);
            expect(
                caminos,
                `el script no recorre la ruta inglesa de ${clave}`,
            ).toContain(EN_ROUTES[clave]);
        }
        expect(EN_PREFIX).toBe(EN_ROUTES.home);
    });

    it("el camino que provoca la 404 no es ninguna ruta conocida del sitio", () => {
        /* Si `BROKEN_SEGMENT` se convirtiera algun dia en una ruta real, las dos
           superficies de 404 medirian una pagina normal y el candado seguiria en
           verde midiendo lo que no toca. Se comprueba con el propio resolvedor
           del repo, no con una lista aparte. */
        expect(resolveRoute(`/${BROKEN_SEGMENT}`)).toBeNull();
        expect(resolveRoute(`${EN_PREFIX}/${BROKEN_SEGMENT}`)).toBeNull();
    });

    it("el barrido de anchos cubre los dos extremos del encargo y el escalon md", () => {
        expect(Math.min(...WIDTH_SWEEP)).toBe(320);
        expect(Math.max(...WIDTH_SWEEP)).toBe(1920);
        expect(
            WIDTH_SWEEP,
            "sin 768 el barrido no cruza el escalon en el que la cabecera cambia de la hoja movil a la fila",
        ).toContain(768);
        // Estrictamente creciente: un ancho repetido o desordenado mide menos de
        // lo que la lista aparenta.
        for (let i = 1; i < WIDTH_SWEEP.length; i++) {
            expect(WIDTH_SWEEP[i]).toBeGreaterThan(WIDTH_SWEEP[i - 1]);
        }
    });

    it("cada familia declarada tiene comprobacion real en el script, y cada comprobacion esta declarada", () => {
        const marcados = [...SCRIPT.matchAll(/\/\/ \[check: ([a-z-]+)\]/g)].map(
            (m) => m[1],
        );

        // Sonda positiva: sin marcas, las dos comparaciones de abajo pasarian
        // por vacuidad, que es justo el fallo que este fichero existe para
        // impedir.
        expect(marcados.length).toBeGreaterThan(0);
        expect(CHECKS.length).toBeGreaterThan(0);

        for (const familia of CHECKS) {
            expect(
                marcados,
                `la familia declarada ${familia} no tiene ninguna comprobacion marcada en el cuerpo del script`,
            ).toContain(familia);
        }
        for (const marca of marcados) {
            expect(
                CHECKS,
                `el script comprueba ${marca}, que no esta declarada en CHECKS`,
            ).toContain(marca);
        }
    });
});
