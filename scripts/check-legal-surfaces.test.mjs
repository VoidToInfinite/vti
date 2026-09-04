import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, it, expect } from "vitest";
import {
    BROKEN_SEGMENT,
    CHECKS,
    EN_PREFIX,
    LEGAL_DOCS,
    SURFACES,
    WIDTH_SWEEP,
    especificadoresDePlaywright,
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
 *
 * DOS HUECOS DE ESA PRIMERA VERSION, medidos y cerrados por el frente de
 * correccion de la misma ola:
 *
 *   a. El vinculo bidireccional ataba la COHERENCIA, no la EXTENSION. Quitando
 *      A LA VEZ la familia `"forced-colors"` de `CHECKS` (linea 159 del script) y
 *      su marcador del cuerpo (linea 714) -- la supresion SIMETRICA, que es la
 *      que hace quien recorta de verdad -- los cinco casos seguian en verde:
 *      «Test Files  1 passed (1) / Tests  5 passed (5)». El script pasaba a medir
 *      trece familias diciendo catorce y nadie se enteraba. Lo cierra
 *      `FAMILIAS_ESPERADAS`, tecleada abajo.
 *   b. El primer caso derivaba su expectativa de la MISMA lista que verificaba
 *      (`LEGAL_DOCS.length * 2 + 2`), asi que era autorreferencial: quitando la
 *      entrada `legalNotice` de `LEGAL_DOCS` (linea 107 del script) salia «✓
 *      cubre los dos documentos legales en los dos idiomas mas una 404 por
 *      idioma» en verde, y solo caia su hermano, que tecleaba las dos claves. Y
 *      tecleadas, un TERCER documento legal en `src/config/site.ts` no quedaria
 *      obligado a entrar en el barrido. Ahora la lista de documentos se DERIVA
 *      de `ROUTES`, la fuente unica del sitio, con las rutas que no son un
 *      documento legal excluidas por nombre.
 *
 * Los dos cierres, validados repitiendo LA MISMA supresion que antes salia en
 * verde:
 *
 *   a. quitadas la linea 159 (`"forced-colors",`) y la 714 (`// [check:
 *      forced-colors]`) del script --
 *
 *        AssertionError: el candado declara 13 familias y prometio 14: si de
 *        verdad mide otra cosa, actualiza FAMILIAS_ESPERADAS a la vez que el
 *        script; si no, restaura lo que falta: expected [ …(13) ] to deeply
 *        equal [ …(14) ]
 *        - Expected
 *        + Received
 *        -   "forced-colors",
 *
 *   b. quitada la entrada `legalNotice` de `LEGAL_DOCS` (linea 107) --
 *
 *        AssertionError: los documentos que recorre el script no son los que
 *        declara src/config/site.ts: uno de los dos lados se movio solo:
 *        expected [ 'privacy' ] to deeply equal [ 'legalNotice', 'privacy' ]
 *
 *      El caso que antes salia «✓» ahora es el primero en caer. Restauradas las
 *      tres lineas, los nueve casos en verde.
 */

const RUTA_SCRIPT = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "check-legal-surfaces.mjs",
);
const SCRIPT = readFileSync(RUTA_SCRIPT, "utf8");

/**
 * Las rutas del sitio que NO son un documento legal, excluidas por nombre. Todo
 * lo demas que `ROUTES` declare es un documento que este candado tiene que
 * recorrer: si manana nace `/cookies`, el test cae hasta que alguien decida
 * explicitamente si entra en el barrido o se anade a esta lista con su motivo.
 * Esa decision forzada es el punto; una lista de claves tecleada no la fuerza.
 */
const RUTAS_SIN_DOCUMENTO_LEGAL = new Set(["home"]);

/** Los documentos legales que el sitio declara HOY, derivados de la fuente unica. */
const IDS_LEGALES = Object.keys(ROUTES).filter(
    (clave) => !RUTAS_SIN_DOCUMENTO_LEGAL.has(clave),
);

/*
 * El CONTRATO del candado, tecleado aqui y no derivado de `CHECKS`: derivarlo de
 * la lista que se verifica es el test autorreferencial que deja pasar cualquier
 * recorte. Estas catorce familias solo se tocan cuando el script mida algo
 * distinto de verdad, y entonces se tocan a la vez que el script.
 */
const FAMILIAS_ESPERADAS = [
    "recorrido-teclado",
    "foco-visible",
    "sin-trampas-de-foco",
    "jerarquia-encabezados",
    "ids-unicos",
    "aria-sin-referencias-colgantes",
    "landmarks-con-nombre",
    "aterrizaje-del-indice",
    "disclosure-escape-y-foco",
    "hoja-movil-escape-y-foco",
    "reduced-motion",
    "forced-colors",
    "responsive-sin-desbordamiento",
    "sin-javascript",
];

describe("cobertura del candado de las superficies legales y la 404", () => {
    it("recorre TODOS los documentos legales que el sitio declara, en los dos idiomas, mas una 404 por idioma", () => {
        /* Sonda positiva: si `ROUTES` se quedara sin documentos legales, todo lo
           de abajo pasaria por vacuidad. */
        expect(IDS_LEGALES.length).toBeGreaterThan(0);
        expect(
            [...LEGAL_DOCS.map((d) => d.id)].sort(),
            `los documentos que recorre el script no son los que declara ` +
                `src/config/site.ts: uno de los dos lados se movio solo`,
        ).toEqual([...IDS_LEGALES].sort());

        expect(SURFACES).toHaveLength(IDS_LEGALES.length * 2 + 2);

        const legales = SURFACES.filter((s) => s.kind === "legal");
        const cuatrocientos = SURFACES.filter((s) => s.kind === "notFound");
        expect(legales).toHaveLength(IDS_LEGALES.length * 2);
        expect(cuatrocientos).toHaveLength(2);

        for (const locale of ["es", "en"]) {
            expect(
                legales.filter((s) => s.locale === locale),
                `falta la rama ${locale} de algun documento legal`,
            ).toHaveLength(IDS_LEGALES.length);
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
        for (const clave of IDS_LEGALES) {
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

    it("la lista de familias sigue siendo la que el candado prometio medir", () => {
        /* La supresion SIMETRICA -- quitar la familia de `CHECKS` y su marcador
           del cuerpo a la vez -- no la ve el caso de abajo, porque despues de
           quitarla los dos lados siguen coincidiendo. La ve esto. */
        expect(
            [...CHECKS].sort(),
            `el candado declara ${CHECKS.length} familias y prometio ` +
                `${FAMILIAS_ESPERADAS.length}: si de verdad mide otra cosa, actualiza ` +
                `FAMILIAS_ESPERADAS a la vez que el script; si no, restaura lo que falta`,
        ).toEqual([...FAMILIAS_ESPERADAS].sort());
        expect(
            new Set(CHECKS).size,
            `hay familias repetidas en CHECKS: alguien cuadro la cuenta duplicando ` +
                `una en vez de conservar la que falta`,
        ).toBe(CHECKS.length);
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

/*
 * LA SALIDA DE EMERGENCIA, ATADA. Este candado no corre en el gate porque
 * necesita el sitio servido; se ejecuta a mano, y la unica forma de ejecutarlo en
 * esta maquina es apuntar `PLAYWRIGHT_CORE` al paquete instalado fuera del repo.
 * Esa variable estuvo ROTA para la lectura natural de su propia documentacion --
 * la ruta del DIRECTORIO del paquete --, y el script moria diciendo que
 * Playwright no estaba instalado. Un candado que la ronda siguiente no sabe
 * arrancar siguiendo sus instrucciones es un candado que no correra.
 *
 * Se prueba contra un paquete de mentira montado en disco, no contra el
 * Playwright de esta maquina: la ruta real es de UNA maquina y el gate corre en
 * otras. Lo que se verifica es lo que fallaba -- que una ruta de DIRECTORIO
 * termine en un especificador que `import()` sabe resolver.
 *
 * VALIDADO CON BUG INYECTADO: desactivando la deteccion de directorio
 * (`esDirectorio = false && statSync(valor).isDirectory()`, que devuelve
 * exactamente el comportamiento anterior) los dos primeros casos caen con
 *
 *   AssertionError: un directorio tiene que resolverse al FICHERO de entrada: un
 *   import() de una URL file:// de carpeta no lee el package.json del paquete
 *
 *   Error: loadChromium no supo cargar el paquete desde la ruta de su
 *   DIRECTORIO, que es la forma en que la variable se reparte en los encargos y
 *   la lectura natural de su propia documentacion. Salida de node: Error: Este
 *   candado necesita Playwright, que NO es dependencia del repo a proposito...
 *
 * Restaurada la deteccion, verde. Y con el arreglo puesto, el candado entero
 * corrio contra el build servido apuntando `PLAYWRIGHT_CORE` al DIRECTORIO del
 * paquete: «CUMPLE - 6 superficies, 14 familias, cero incumplimientos (tema
 * dark, base http://localhost:4321)», codigo de salida 0.
 */
const paquetesFalsos = [];
function paqueteFalso(pkg, entrada) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "vti-playwright-falso-"));
    paquetesFalsos.push(dir);
    writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg));
    writeFileSync(
        path.join(dir, entrada),
        "export const chromium = { marca: 'paquete falso del candado' };\n",
    );
    return dir;
}

afterAll(() => {
    for (const dir of paquetesFalsos)
        rmSync(dir, { recursive: true, force: true });
});

describe("la salida de emergencia PLAYWRIGHT_CORE del candado de navegador", () => {
    it("resuelve la ruta de un DIRECTORIO al fichero de entrada que declara su package.json", () => {
        /* `playwright-core` declara `exports` y NO declara `main`, asi que
           quedarse en `main` tampoco habria bastado (comprobado en el paquete
           real de esta maquina). */
        const dir = paqueteFalso(
            {
                name: "playwright-core-falso",
                exports: { ".": { import: "./index.mjs" } },
            },
            "index.mjs",
        );
        const candidatos = especificadoresDePlaywright(dir);
        expect(
            candidatos[0],
            `un directorio tiene que resolverse al FICHERO de entrada: un import() ` +
                `de una URL file:// de carpeta no lee el package.json del paquete`,
        ).toBe(pathToFileURL(path.join(dir, "index.mjs")).href);
        expect(
            candidatos.at(-2),
            "los nombres de paquete siguen como ultimo recurso",
        ).toBe("playwright-core");
    });

    it("importa de verdad el paquete cuando PLAYWRIGHT_CORE apunta a su directorio", () => {
        /*
         * En NODE PELADO, no dentro de Vitest, y a proposito: el defecto vivia en
         * el `import()` real y el script se ejecuta con `node scripts/...`. Vite
         * reescribe los import dinamicos y no sabe cargar un fichero de fuera de
         * la raiz del proyecto (reproducido: llamar aqui a `loadChromium()`
         * directamente falla aunque la ruta sea correcta), asi que medirlo desde
         * dentro del corredor mediria otra cosa.
         */
        const dir = paqueteFalso(
            {
                name: "playwright-core-falso",
                exports: { ".": { import: "./entrada.mjs" } },
            },
            "entrada.mjs",
        );
        const sonda = path.join(dir, "sonda.mjs");
        writeFileSync(
            sonda,
            `import { loadChromium } from ${JSON.stringify(pathToFileURL(RUTA_SCRIPT).href)};\n` +
                `const chromium = await loadChromium();\n` +
                `process.stdout.write(String(chromium.marca));\n`,
        );

        let salida;
        try {
            salida = execFileSync(process.execPath, [sonda], {
                encoding: "utf8",
                env: { ...process.env, PLAYWRIGHT_CORE: dir },
            });
        } catch (error) {
            throw new Error(
                `loadChromium no supo cargar el paquete desde la ruta de su ` +
                    `DIRECTORIO, que es la forma en que la variable se reparte en los ` +
                    `encargos y la lectura natural de su propia documentacion. ` +
                    `Salida de node: ${String(error.stderr || error.message).trim()}`,
            );
        }
        expect(salida).toBe("paquete falso del candado");
    });

    it("acepta tambien el fichero de entrada y el nombre del paquete, y no inventa candidatos sin variable", () => {
        const dir = paqueteFalso(
            {
                name: "playwright-core-falso",
                exports: { ".": { import: "./index.mjs" } },
            },
            "index.mjs",
        );
        const fichero = path.join(dir, "index.mjs");
        expect(especificadoresDePlaywright(fichero)[0]).toBe(
            pathToFileURL(fichero).href,
        );
        expect(especificadoresDePlaywright("playwright-core")[0]).toBe(
            "playwright-core",
        );
        expect(especificadoresDePlaywright(undefined)).toEqual([
            "playwright-core",
            "playwright",
        ]);
    });
});
