import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

/*
 * ESTE FICHERO ATA QUE EL CENSO DEL BUNDLE SE COMPARE CONTRA EL ARTEFACTO
 * REAL, Y NO CONTRA SÍ MISMO.
 *
 * EL DEFECTO, medido por el verificador de la ola Q el 2026-09-05 y
 * reproducido antes de escribir nada: `scripts/measure-home-js.mjs` vigila
 * nueve candados, y los tres que corren sin build (`BASELINE_CHUNKS`,
 * `BASELINE_PAGES` y `BASELINE_DIGEST`) se satisfacen editando
 * `scripts/home-js-baseline.<plataforma>.json` y recalculando el sello con la propia
 * función que lo calcula, que es pura sobre ese JSON. El único sitio que
 * contrasta el censo contra el build es el bloque de integración de
 * `scripts/measure-home-js.test.mjs`, envuelto en
 * `describe.skipIf(!existsSync("out/index.html"))`; en CI no hay `out/` y ese
 * bloque se salta. Resultado: un recorte coordinado del censo —borrar una
 * fila, restarle el peso al total y bajar en el mismo gesto la constante que
 * las cuenta— pasaba `pnpm run ci` en verde, en local y en el runner.
 *
 * EL ARREGLO, que es de pipeline y no de script: la única verdad de referencia
 * contra la que un censo puede contrastarse es el artefacto, así que el
 * candado se ejecuta donde hay artefacto. `.github/workflows/ci.yml` construye
 * y mide detrás del gate (`pnpm run ci`, luego `pnpm build`, luego
 * `pnpm measure:js`, tres pasos `run:` en ese orden) y `netlify.toml` encadena
 * los tres con `&&`, de forma que si falla el gate no se construye y si falla
 * el censo no se publica.
 *
 * QUÉ PROTEGE ESTE FICHERO, exactamente. Un arreglo que vive en dos ficheros de
 * configuración que nada compila y nada ejecuta en local es justo el que se
 * deshace sin que nadie se entere: basta con borrar un paso de un YAML o
 * reordenar dos eslabones de una cadena de shell. Aquí se ata la CONDICIÓN, no
 * el texto:
 *
 *   1. el workflow ejecuta los tres comandos y en ese orden — construir antes
 *      de medir no es un detalle de estilo, es lo que hace que se mida el
 *      artefacto de este commit;
 *   2. la cadena de Netlify une los tres con `&&` y en el mismo orden: cada
 *      eslabón es un eslabón EXACTO, así que cambiar el separador por `;` (que
 *      construiría aunque el gate cayera) o colgarle un `|| true` al censo
 *      rompe el candado;
 *   3. el script `measure:js` de `package.json` es el instrumento en modo
 *      veredicto, `node scripts/measure-home-js.mjs`, sin `--update-baseline`:
 *      un paso que resella siempre sale 0 y sería un candado que se
 *      autosatisface — la forma exacta de vacuidad que este frente vino a
 *      cerrar. Ese mismo argumento vale para los pipelines, así que ninguno de
 *      los comandos que ejecutan puede llevar el sellador;
 *   4. sonda positiva: los tres ficheros existen, tienen contenido y los dos
 *      lectores de este fichero encuentran algo en ellos. Un candado que lee
 *      configuración se queda sin filo en silencio si su lector deja de
 *      reconocer el formato, así que los dos lectores se ejercitan además
 *      contra texto sintético, incluido el caso que los volvería una mentira:
 *      un paso o un `command` ESCRITOS EN UN COMENTARIO no cuentan.
 *
 * VALIDADO CON BUG INYECTADO, cuatro, cada uno aplicado SOLO, ejecutado,
 * observado en rojo y restaurado (los tres ficheros quedaron byte a byte como
 * estaban, comprobado con `diff` contra una copia previa). Las líneas de abajo
 * son literales de la salida de
 * `pnpm exec vitest run scripts/build-pipeline.test.mjs`, partidas para caber
 * en el margen:
 *
 *  1. Quitando el paso `- run: pnpm measure:js` de `.github/workflows/ci.yml`
 *     — «Tests 1 failed | 7 passed (8)»:
 *       AssertionError: el workflow de CI no ejecuta `pnpm measure:js`: sin ese
 *       paso el censo del bundle vuelve a compararse solo contra sí mismo.
 *       Pasos reales: corepack enable | pnpm install --frozen-lockfile | pnpm
 *       run ci | pnpm build: expected [ 'corepack enable', …(3) ] to include
 *       'pnpm measure:js'
 *  2. Invirtiendo el orden de `pnpm build` y `pnpm measure:js` en el `command`
 *     de `netlify.toml`:
 *       AssertionError: el `command` de netlify.toml tiene que encadenar pnpm
 *       run ci && pnpm build && pnpm measure:js en ese orden; los eslabones
 *       reales son: pnpm run ci | pnpm measure:js | pnpm build: expected [ +0,
 *       2, 1 ] to deeply equal [ +0, 1, 2 ]
 *  3. Añadiendo `--update-baseline` al script `measure:js` de `package.json`:
 *       AssertionError: el script `measure:js` tiene que ser exactamente `node
 *       scripts/measure-home-js.mjs`: en modo veredicto sale con código 1 si el
 *       censo no cuadra, y con `--update-baseline` lo reescribiría y saldría 0
 *       siempre: expected 'node scripts/measure-home-js.mjs --up…' to be 'node
 *       scripts/measure-home-js.mjs' // Object.is equality
 *  4. Dejando el paso del workflow como `- run: pnpm measure:js
 *     --update-baseline` — el caso que el punto 3 NO cubre, porque el script de
 *     `package.json` sigue intacto y el sellador entra por el pipeline:
 *       AssertionError: un pipeline que ejecuta `--update-baseline` regenera el
 *       censo en vez de comprobarlo: sale 0 pase lo que pase y el candado se
 *       autosatisface: expected [ 'pnpm measure:js --update-baseline' ] to
 *       deeply equal []
 *
 * LO QUE ANADE EL FRENTE J (2026-09-05): LA SECUENCIA NO TENÍA ATADURA DE
 * EXTENSIÓN. Los cuatro casos de arriba recorren `SECUENCIA`, y ninguno decía
 * cuántos eslabones tiene que haber ni cuáles: el verificador de candados de la
 * ola R quitó `pnpm measure:js` de los TRES sitios a la vez —el paso del
 * workflow, el eslabón del `command` de Netlify y la entrada de la lista— y los
 * ocho casos siguieron en verde sobre un pipeline que ya no contrasta el censo
 * contra el artefacto. Es la misma vacuidad que `check-site-surfaces.test.mjs`
 * cerró cuatro veces: un candado que itera una lista sale verde cuando la lista
 * encoge.
 *
 * Se cierra con los tres comandos TECLEADOS uno a uno (`GATE`, `BUILD`,
 * `CENSO`) afirmados FUERA de cualquier bucle sobre `SECUENCIA`, más el suelo
 * numérico `MINIMO_ESLABONES`. Las dos inyecciones, cada una aplicada sola,
 * ejecutada, vista en rojo y restaurada (los tres ficheros se restauraron desde
 * una copia previa y `git status` los dejó sin marcar):
 *
 *  5. EL RECORTE SIMÉTRICO DE LOS TRES FICHEROS, repetido tal cual —«Tests 1
 *     failed | 8 passed (9)», y el único que cae es el caso nuevo, que es
 *     exactamente la demostración de que los otros ocho no lo veían:
 *       AssertionError: el workflow de CI no ejecuta `pnpm measure:js`: sin ese
 *       paso el censo del bundle vuelve a compararse solo contra sí mismo. Pasos
 *       reales: corepack enable | pnpm install --frozen-lockfile | pnpm run ci |
 *       pnpm build: expected [ 'corepack enable', …(3) ] to include 'pnpm
 *       measure:js'
 *  6. RECORTADA SOLO `SECUENCIA`, con los dos pipelines intactos —la variante en
 *     la que alguien borra la lista sin tocar la configuración— cae el suelo:
 *       AssertionError: la secuencia bajó de 3 eslabones: este número solo sube,
 *       y recortar la lista es justo la supresión que los cuatro casos que la
 *       recorren no ven. Si de verdad sobra un paso, se quita aquí, a la vista,
 *       y no de paso mientras se limpia un YAML: expected 2 to be greater than
 *       or equal to 3
 *
 * Restauradas las dos, 9 casos en verde.
 *
 * RIESGO DECLARADO, no resuelto (2026-09-05): el censo versionado se generó a
 * partir de un build hecho en Windows con Node 25 y los pipelines lo compararán
 * contra uno hecho en Linux con Node 22. Este fichero no puede decir nada sobre
 * eso —ata la secuencia, no el resultado de medir—; el análisis de la fuente y
 * la declaración honesta de que la primera ejecución del workflow es la que lo
 * confirma están en la cabecera de `.github/workflows/ci.yml`.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CI_PATH = path.join(ROOT, ".github", "workflows", "ci.yml");
const NETLIFY_PATH = path.join(ROOT, "netlify.toml");
const PACKAGE_PATH = path.join(ROOT, "package.json");

/**
 * Los tres comandos de la secuencia, TECLEADOS uno a uno y con nombre propio.
 *
 * Existen aparte de `SECUENCIA` porque los cuatro casos de abajo recorrían esa
 * lista y NADA la ataba: el recorte simétrico de tres ficheros —quitar `pnpm
 * measure:js` del paso del workflow, del `command` de Netlify y de esta
 * lista— dejaba los ocho casos en verde sobre un pipeline que ya no medía el
 * censo. Es la misma vacuidad que este repo ya pagó cuatro veces con listas que
 * se recorren: un candado que itera una lista sale verde cuando la lista
 * encoge.
 *
 * Con los tres tecleados, ese recorte tiene que borrar además una constante con
 * nombre y una aserción escrita a mano, que es una decisión visible en el diff
 * en vez de tres borrados que se leen como limpieza.
 */
const GATE = "pnpm run ci";
const BUILD = "pnpm build";
const CENSO = "pnpm measure:js";

/**
 * El suelo numérico de la secuencia, con el mismo papel que los suelos de
 * `check-site-surfaces.test.mjs`: la igualdad de abajo ata `SECUENCIA` a los
 * tres nombres, y este número es lo único que no se puede recortar sin escribir
 * a mano un número más pequeño.
 */
const MINIMO_ESLABONES = 3;

/**
 * La secuencia que los dos pipelines tienen que ejecutar, en este orden: el
 * gate primero, el build después y la medición del censo contra ese build al
 * final.
 */
const SECUENCIA = [GATE, BUILD, CENSO];

/** El instrumento en modo veredicto: mide y falla, no resella. */
const MEASURE_JS = "node scripts/measure-home-js.mjs";

/** La bandera que convertiría la medición en un sellador que siempre sale 0. */
const SELLADOR = "--update-baseline";

const CI_TEXT = readFileSync(CI_PATH, "utf8");
const NETLIFY_TEXT = readFileSync(NETLIFY_PATH, "utf8");
const PACKAGE_TEXT = readFileSync(PACKAGE_PATH, "utf8");

/**
 * Los comandos que el workflow EJECUTA, en orden. Se leen las líneas `run:`
 * saltando las comentadas a propósito: un paso escrito dentro de un comentario
 * no ejecuta nada, y contarlo dejaría el candado satisfecho por prosa.
 */
function pasosDeWorkflow(texto) {
    const pasos = [];
    for (const linea of texto.split("\n")) {
        const limpia = linea.trim();
        if (limpia.startsWith("#")) continue;
        const match = /^-?\s*run:\s*(.+?)\s*$/.exec(limpia);
        if (match) pasos.push(match[1]);
    }
    return pasos;
}

/**
 * El `command` que Netlify ejecuta, partido por `&&` y con cada eslabón
 * recortado. Mismo criterio con los comentarios que arriba. Devuelve `null` si
 * no hay ninguno, para que la ausencia se lea como ausencia y no como una
 * cadena vacía que pasaría cualquier comprobación de subcadena.
 */
function eslabonesDeNetlify(texto) {
    for (const linea of texto.split("\n")) {
        const limpia = linea.trim();
        if (limpia.startsWith("#")) continue;
        const match = /^command\s*=\s*"([^"]*)"$/.exec(limpia);
        if (match) return match[1].split("&&").map((parte) => parte.trim());
    }
    return null;
}

describe("el censo del bundle se compara contra el artefacto real", () => {
    it("la secuencia no puede ENCOGER: los tres comandos, tecleados, siguen en los dos pipelines", () => {
        /*
         * EL HUECO QUE CIERRA ESTE CASO, reproducido antes de escribirlo: los
         * cuatro casos de abajo recorren `SECUENCIA`, así que un recorte
         * simétrico de tres ficheros —el paso `- run: pnpm measure:js` del
         * workflow, el eslabón `&& pnpm measure:js` del `command` de Netlify y
         * la entrada de `SECUENCIA`— los deja a los ocho en verde: el bucle
         * comprueba dos comandos, los encuentra, y el pipeline ya no mide el
         * censo contra el artefacto. El candado se recortaba a sí mismo.
         *
         * Aquí los tres van TECLEADOS y FUERA de cualquier bucle sobre la lista
         * que se verifica, que es la única forma de que la lista no pueda
         * decidir cuánto se comprueba. El suelo numérico cierra la variante en
         * la que alguien borra también la constante con nombre.
         */
        const pasos = pasosDeWorkflow(CI_TEXT);
        const eslabones = eslabonesDeNetlify(NETLIFY_TEXT) ?? [];

        expect(
            pasos,
            `el workflow de CI no ejecuta \`${GATE}\`: sin el gate, CI publicaría ` +
                `código que no pasa typecheck, lint, formato, anti-patrones ni tests. ` +
                `Pasos reales: ${pasos.join(" | ")}`,
        ).toContain(GATE);
        expect(
            pasos,
            `el workflow de CI no ejecuta \`${BUILD}\`: sin artefacto no hay nada ` +
                `contra lo que contrastar el censo. Pasos reales: ${pasos.join(" | ")}`,
        ).toContain(BUILD);
        expect(
            pasos,
            `el workflow de CI no ejecuta \`${CENSO}\`: sin ese paso el censo del ` +
                `bundle vuelve a compararse solo contra sí mismo. Pasos reales: ` +
                `${pasos.join(" | ")}`,
        ).toContain(CENSO);

        expect(
            eslabones,
            `el \`command\` de netlify.toml no encadena \`${GATE}\`: el despliegue ` +
                `pasaría por encima del gate. Eslabones reales: ${eslabones.join(" | ")}`,
        ).toContain(GATE);
        expect(
            eslabones,
            `el \`command\` de netlify.toml no encadena \`${BUILD}\`: Netlify no ` +
                `tendría artefacto que publicar. Eslabones reales: ${eslabones.join(" | ")}`,
        ).toContain(BUILD);
        expect(
            eslabones,
            `el \`command\` de netlify.toml no encadena \`${CENSO}\`: se publicaría ` +
                `sin contrastar el censo contra el artefacto. Eslabones reales: ` +
                `${eslabones.join(" | ")}`,
        ).toContain(CENSO);

        expect(
            SECUENCIA.length,
            `la secuencia bajó de ${MINIMO_ESLABONES} eslabones: este número solo ` +
                `sube, y recortar la lista es justo la supresión que los cuatro casos ` +
                `que la recorren no ven. Si de verdad sobra un paso, se quita aquí, a ` +
                `la vista, y no de paso mientras se limpia un YAML`,
        ).toBeGreaterThanOrEqual(MINIMO_ESLABONES);
    });

    it("el workflow de CI construye y mide DESPUÉS del gate, en tres pasos y en ese orden", () => {
        const pasos = pasosDeWorkflow(CI_TEXT);
        for (const comando of SECUENCIA) {
            expect(
                pasos,
                `el workflow de CI no ejecuta \`${comando}\`: sin ese paso el censo ` +
                    `del bundle vuelve a compararse solo contra sí mismo. Pasos reales: ` +
                    `${pasos.join(" | ")}`,
            ).toContain(comando);
        }
        const indices = SECUENCIA.map((comando) => pasos.indexOf(comando));
        expect(
            indices,
            `el workflow de CI tiene que ejecutar ${SECUENCIA.join(" → ")} en ese ` +
                `orden —medir antes de construir mide el build anterior, o ninguno—; ` +
                `los pasos reales son: ${pasos.join(" | ")}`,
        ).toEqual([...indices].sort((a, b) => a - b));
    });

    it("el `command` de Netlify encadena los tres con `&&`, en el mismo orden", () => {
        const eslabones = eslabonesDeNetlify(NETLIFY_TEXT);
        expect(
            eslabones,
            "netlify.toml no declara ningún `command`: sin él el despliegue no pasa " +
                "ni el gate ni el censo",
        ).not.toBeNull();
        for (const comando of SECUENCIA) {
            expect(
                eslabones,
                `el \`command\` de netlify.toml no encadena \`${comando}\` como eslabón ` +
                    `propio unido por \`&&\`: con otro separador un fallo del gate o del ` +
                    `censo no detendría el despliegue. Eslabones reales: ` +
                    `${eslabones.join(" | ")}`,
            ).toContain(comando);
        }
        const indices = SECUENCIA.map((comando) => eslabones.indexOf(comando));
        expect(
            indices,
            `el \`command\` de netlify.toml tiene que encadenar ${SECUENCIA.join(" && ")} ` +
                `en ese orden; los eslabones reales son: ${eslabones.join(" | ")}`,
        ).toEqual([...indices].sort((a, b) => a - b));
    });

    it("el script `measure:js` mide y falla, no resella", () => {
        const paquete = JSON.parse(PACKAGE_TEXT);
        expect(
            paquete.scripts?.["measure:js"],
            `el script \`measure:js\` tiene que ser exactamente \`${MEASURE_JS}\`: en ` +
                `modo veredicto sale con código 1 si el censo no cuadra, y con ` +
                `\`${SELLADOR}\` lo reescribiría y saldría 0 siempre`,
        ).toBe(MEASURE_JS);
    });

    it("ninguno de los dos pipelines ejecuta el sellador del censo", () => {
        const comandos = [
            ...pasosDeWorkflow(CI_TEXT),
            ...(eslabonesDeNetlify(NETLIFY_TEXT) ?? []),
        ];
        const selladores = comandos.filter((comando) =>
            comando.includes(SELLADOR),
        );
        expect(
            selladores,
            `un pipeline que ejecuta \`${SELLADOR}\` regenera el censo en vez de ` +
                `comprobarlo: sale 0 pase lo que pase y el candado se autosatisface`,
        ).toEqual([]);
    });
});

/*
 * LA 404 INGLESA SIN JAVASCRIPT (2026-09-10, P2 de la crítica externa #21, H9).
 *
 * El arreglo vive en dos mitades que nada compila juntas: la página que hornea
 * `out/en/404.html` (`app/en/404/page.tsx`) y la regla de `netlify.toml` que la
 * sirve con estado 404 bajo `/en/`. Basta con borrar la regla, cambiarle el
 * estado a 200 (serviría una página rota como si existiera) o forzarla (por
 * shadowing, `force = true` taparía `/en/privacy` y `/en/legal-notice` con la
 * 404) para que el defecto vuelva sin que ningún test de componente lo vea.
 * Aquí se ata la regla, y que su destino corresponda a una página que existe.
 */
const EN_NOT_FOUND_RULE = {
    from: "/en/*",
    to: "/en/404.html",
    status: "404",
};
const EN_NOT_FOUND_PAGE = path.join(ROOT, "app", "en", "404", "page.tsx");
const OUT_EN_NOT_FOUND = path.join(ROOT, "out", "en", "404.html");

/**
 * Los bloques `[[redirects]]` de un TOML, como objetos `clave -> valor crudo`
 * (sin comillas). Salta los comentarios por el mismo motivo que los lectores de
 * arriba: una regla escrita en un comentario no redirige nada.
 */
function redireccionesDeNetlify(texto) {
    const bloques = [];
    let actual = null;
    for (const linea of texto.split("\n")) {
        const limpia = linea.trim();
        if (limpia === "" || limpia.startsWith("#")) continue;
        if (limpia.startsWith("[")) {
            actual = limpia === "[[redirects]]" ? {} : null;
            if (actual) bloques.push(actual);
            continue;
        }
        const match = /^([a-z_]+)\s*=\s*"?([^"]*?)"?\s*$/.exec(limpia);
        if (actual && match) actual[match[1]] = match[2];
    }
    return bloques;
}

describe("la 404 inglesa se sirve con estado 404 y sin JavaScript", () => {
    it("netlify.toml sirve `/en/404.html` con estado 404 bajo `/en/*`, sin forzar", () => {
        const reglas = redireccionesDeNetlify(NETLIFY_TEXT);
        const regla = reglas.find((r) => r.from === EN_NOT_FOUND_RULE.from);
        expect(
            regla,
            `netlify.toml no declara la regla de la 404 inglesa (from = ` +
                `"${EN_NOT_FOUND_RULE.from}"): sin ella \`/en/no-existe\` vuelve a ` +
                `servirse con \`out/404.html\`, en castellano. Reglas reales: ` +
                `${JSON.stringify(reglas)}`,
        ).toBeDefined();
        expect(regla.to).toBe(EN_NOT_FOUND_RULE.to);
        expect(
            regla.status,
            "la 404 inglesa tiene que servirse con estado 404: con 200 una URL " +
                "rota se anunciaría como página existente",
        ).toBe(EN_NOT_FOUND_RULE.status);
        expect(
            regla.force ?? "false",
            "con `force = true` la regla taparía por shadowing las rutas " +
                "inglesas reales (`/en/privacy`, `/en/legal-notice`) con la 404",
        ).toBe("false");
    });

    it("el destino de la regla lo emite una página que existe", () => {
        expect(
            existsSync(EN_NOT_FOUND_PAGE),
            `falta ${EN_NOT_FOUND_PAGE}: la regla de netlify.toml apuntaría a un ` +
                "fichero que el build ya no emite",
        ).toBe(true);
    });

    it.skipIf(!existsSync(OUT_EN_NOT_FOUND))(
        "el build hornea `out/en/404.html` en inglés (solo si hay `out/`)",
        () => {
            const html = readFileSync(OUT_EN_NOT_FOUND, "utf8");
            expect(html).toMatch(/<html lang="en"/);
            expect(html).toContain("<title>Page not found");
            expect(html).toContain('<meta name="robots" content="noindex');
            expect(html).not.toContain('rel="canonical"');
        },
    );

    it("el lector de redirecciones no cuenta una regla escrita en un comentario", () => {
        const sintetico = [
            "# [[redirects]]",
            '#   from = "/en/*"',
            "[[redirects]]",
            '  from = "/terminos"',
            "  status = 301",
        ].join("\n");
        expect(redireccionesDeNetlify(sintetico)).toEqual([
            { from: "/terminos", status: "301" },
        ]);
    });
});

describe("los lectores de este candado no se quedan sin filo en silencio", () => {
    it("los tres ficheros del pipeline existen y tienen contenido", () => {
        for (const [ruta, texto] of [
            [CI_PATH, CI_TEXT],
            [NETLIFY_PATH, NETLIFY_TEXT],
            [PACKAGE_PATH, PACKAGE_TEXT],
        ]) {
            expect(existsSync(ruta), `falta ${ruta}`).toBe(true);
            expect(
                texto.trim().length,
                `${ruta} está vacío: un candado que lee un fichero vacío no lee nada`,
            ).toBeGreaterThan(0);
        }
    });

    it("el lector del workflow no cuenta un paso escrito en un comentario", () => {
        const sintetico = [
            "jobs:",
            "    ci:",
            "        steps:",
            "            # - run: pnpm measure:js",
            "            - run: pnpm build",
        ].join("\n");
        expect(pasosDeWorkflow(sintetico)).toEqual(["pnpm build"]);
    });

    it("el lector de Netlify no cuenta un `command` escrito en un comentario", () => {
        const sintetico = [
            "[build]",
            '  # command = "pnpm build"',
            '  command = "pnpm run ci && pnpm build"',
        ].join("\n");
        expect(eslabonesDeNetlify(sintetico)).toEqual([
            "pnpm run ci",
            "pnpm build",
        ]);
    });

    it("el lector de Netlify distingue la ausencia de un `command` vacío", () => {
        expect(eslabonesDeNetlify('[build]\n  publish = "out"')).toBeNull();
    });
});
