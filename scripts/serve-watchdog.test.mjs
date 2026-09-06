/**
 * @vitest-environment node
 *
 * Entorno de Node y no el jsdom del resto de la suite, a propósito: este
 * fichero arranca procesos hijos y sondea un puerto con `fetch`, y el
 * `AbortSignal` de jsdom no es el que la implementación de `fetch` de Node
 * acepta. Con jsdom, todo sondeo fallaría por el motivo equivocado.
 */
import { spawn } from "node:child_process";
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    DEFAULT_PROBE_MS,
    FALLOS_PARA_RELANZAR,
    MIN_PROBE_MS,
    SERVE_MAIN_POR_DEFECTO,
    argumentosDelServidor,
    lineaDeArranque,
    lineaDeRelanzamiento,
    motivoDeSalidaDelHijo,
    motivoDeSondeosFallidos,
    opcionesDeSpawn,
    parseArgs,
    resolveServeMain,
    rutasPorDefecto,
    siguienteEstadoDeSondeo,
    sondeaUnaVez,
    startWatchdog,
    urlDeSondeo,
} from "./serve-watchdog.mjs";

/*
 * QUÉ ATA ESTE FICHERO. El vigilante existe porque el servidor estático de la
 * crítica #19 murió a mitad de la fase técnica y nadie lo estaba mirando (13
 * minutos, 58 sondeos del evaluador, Perf «no puntuable»). Un vigilante es un
 * instrumento, y un instrumento que no se ha visto fallar no está verificado:
 * aquí se ejercitan las cuatro condiciones de las que depende que la próxima
 * ronda no se quede sin medición.
 *
 *   1. La POLÍTICA: tres sondeos fallidos SEGUIDOS, ni uno ni cuatro, y un
 *      sondeo bueno reinicia la cuenta. Relanzar al primer fallo cortaría la
 *      medición en curso, que es el daño que el instrumento evita.
 *   2. Que el hijo se lanza SIN VENTANA, en el primer arranque y en cada
 *      relanzamiento. El dueño se ha quejado dos veces de consolas en su
 *      pantalla (2026-09-05 «bis» y «quater»); un vigilante que las abre es
 *      peor que no tenerlo.
 *   3. Que lo que se lanza es el `serve` de las críticas y no un servidor
 *      propio: la compresión y las cabeceras son parte del instrumento y las
 *      cifras de las rondas anteriores dejan de ser comparables si cambian.
 *   4. Que el relanzamiento OCURRE y RESTAURA EL SERVICIO, por las dos vías
 *      por las que la crítica pudo perderlo: el proceso que se muere solo y el
 *      proceso que sigue vivo pero deja de contestar.
 *
 * LA MATRIZ, declarada porque la regla 2 de la lección del 2026-09-06 lo
 * exige. Combinaciones cubiertas: {muerte del hijo, cuelgue sin muerte,
 * servidor sano} x {primer arranque, relanzamiento}. Fijadas a propósito y lo
 * que queda fuera: (a) el servidor real es un `serve` de verdad en producción
 * y aquí un servidor de Node mínimo — se fija porque lo que se vigila es la
 * MECÁNICA del vigilante, no `serve`, y el candado 3 cubre justo que en la
 * máquina real se lance `serve` y no otra cosa; (b) `--probe-ms` se fija en
 * cada caso al valor que aísla la vía que se mide (5000 ms cuando el
 * relanzamiento tiene que venir del evento `exit`, 300 ms cuando tiene que
 * venir de los sondeos), en vez de dejar el defecto de 2000, para que ninguna
 * prueba pueda pasar por la vía equivocada; (c) queda fuera el reinicio de la
 * MÁQUINA y la muerte del propio vigilante, que no son recuperables desde
 * dentro y son responsabilidad del pre-registro de la ronda (se anota su PID);
 * (d) queda fuera el caso «el puerto lo ocupa otro proceso», que no es una
 * muerte del servidor sino un error de arranque de la ronda.
 *
 * VALIDADO CON BUG INYECTADO, tres inyecciones, cada una aplicada y deshecha
 * dentro de un solo comando encadenado y con el fichero restaurado desde una
 * copia (nunca `git checkout`, que se llevaría por delante el trabajo sin
 * commitear del propio fichero; lección del 2026-09-05 «septies»). Al terminar
 * las tres, `diff` contra las tres copias: idéntico. Las líneas son literales
 * de la salida de `pnpm exec vitest run scripts/serve-watchdog.test.mjs`:
 *
 *  1. Política de relanzamiento — en `siguienteEstadoDeSondeo`, cambiando
 *     `fallosSeguidos >= FALLOS_PARA_RELANZAR` por `fallosSeguidos >= 1`
 *     (relanzar al primer fallo). Cuatro casos en rojo, `Tests 4 failed |
 *     24 passed (28)`, encabezados por
 *
 *       AssertionError: un sondeo suelto puede fallar por un pico de carga de
 *       la máquina; relanzar por eso corta la medición en curso, que es justo
 *       el daño que este instrumento existe para evitar: expected [ +0, 1 ] to
 *       deeply equal []
 *
 *  2. Ventanas de consola — en `opcionesDeSpawn`, borrando la línea
 *     `windowsHide: true`. Dos casos en rojo, `Tests 2 failed | 26 passed
 *     (28)`: el de las opciones puras y, lo que importa, el que mira los
 *     spawns REALES del vigilante
 *
 *       AssertionError: cada spawn del vigilante, el primero y los
 *       relanzamientos, tiene que ser invisible: una ventana de consola por
 *       relanzamiento en la pantalla del dueño es la queja del 2026-09-05, dos
 *       veces: expected undefined to be true // Object.is equality
 *
 *  3. El relanzamiento mismo — en `lanza`, cambiando la guarda del manejador
 *     de `exit` (`if (parando || hijo !== proceso) return;`) por
 *     `if (true) return;`, que es un vigilante que ve morir a su hijo y no
 *     hace nada. Un solo caso en rojo, `Tests 1 failed | 27 passed (28)`, y es
 *     el del hijo que se muere — el del hijo colgado sigue verde, que es lo
 *     que demuestra que las dos vías se miden por separado:
 *
 *       AssertionError: el log se quedó en: [2026-09-06T09:49:35.846Z]
 *       ARRANQUE — vigilante PID 9872 sirve
 *       C:\Users\Daniel\AppData\Local\Temp\vti-vigilante-ONgsXR en
 *       http://localhost:51124 (hijo PID 9456)
 *       : expected false to be true // Object.is equality
 */

/** Vigilantes y carpetas creados por cada caso, para no dejar nada vivo. */
const vigilantes = [];
const carpetas = [];

afterEach(async () => {
    while (vigilantes.length > 0) {
        const vigilante = vigilantes.pop();
        await vigilante.stop();
    }
    while (carpetas.length > 0) {
        const carpeta = carpetas.pop();
        try {
            rmSync(carpeta, { recursive: true, force: true, maxRetries: 5 });
        } catch {
            /* Windows puede tener algo abierto todavía: no es asunto del test */
        }
    }
});

/** Carpeta temporal propia del caso, borrada en el `afterEach`. */
function carpetaTemporal() {
    const carpeta = mkdtempSync(path.join(os.tmpdir(), "vti-vigilante-"));
    carpetas.push(carpeta);
    return carpeta;
}

/** Un puerto libre de verdad: se pide al sistema el 0 y se suelta. */
function puertoLibre() {
    return new Promise((resolve, reject) => {
        const servidor = createServer();
        servidor.once("error", reject);
        servidor.listen(0, "127.0.0.1", () => {
            const { port } = servidor.address();
            servidor.close(() => resolve(port));
        });
    });
}

/**
 * El «hijo falso»: un servidor HTTP mínimo que se comporta como le digan la
 * PRIMERA vez que arranca y con normalidad a partir de la segunda (lo
 * distingue por un fichero marca). Así el relanzamiento se puede observar
 * exactamente una vez y comprobar que el servicio vuelve, en vez de entrar en
 * un bucle de muertes.
 *
 * Se escribe como lista de líneas y no como plantilla para que no haya ni un
 * escape que interpretar por el camino (lección del 2026-09-03).
 */
function escribeServidorFalso({ carpeta, modo, vidaMs = 700 }) {
    const ruta = path.join(carpeta, "servidor-falso.mjs");
    const marca = path.join(carpeta, "ya-arranco-una-vez.txt");
    const fuente = [
        'import { createServer } from "node:http";',
        'import { existsSync, writeFileSync } from "node:fs";',
        `const MARCA = ${JSON.stringify(marca)};`,
        `const MODO = ${JSON.stringify(modo)};`,
        `const VIDA_MS = ${vidaMs};`,
        "const args = process.argv.slice(2);",
        'const puerto = Number(args[args.indexOf("-l") + 1]);',
        "const primera = !existsSync(MARCA);",
        'if (primera) writeFileSync(MARCA, "1");',
        'const cuelga = primera && MODO === "cuelga";',
        "const servidor = createServer((peticion, respuesta) => {",
        "    if (cuelga) return;",
        "    respuesta.writeHead(200);",
        '    respuesta.end("ok");',
        "});",
        /* Reintento de escucha: al relanzar, el puerto del hijo anterior puede
           tardar un instante en soltarse en Windows. */
        'servidor.on("error", () => {',
        '    setTimeout(() => servidor.listen(puerto, "127.0.0.1"), 100);',
        "});",
        'servidor.listen(puerto, "127.0.0.1");',
        'if (primera && MODO === "muere") {',
        "    setTimeout(() => process.exit(7), VIDA_MS);",
        "}",
    ].join("\n");
    writeFileSync(ruta, fuente);
    return ruta;
}

/** Arranca un vigilante y lo apunta para que el `afterEach` lo pare. */
async function arrancaVigilante(opciones) {
    const vigilante = await startWatchdog(opciones);
    vigilantes.push(vigilante);
    return vigilante;
}

/** Espera activa con límite: devuelve si la condición llegó a cumplirse. */
async function esperaHasta(condicion, limiteMs, pasoMs = 50) {
    const fin = Date.now() + limiteMs;
    for (;;) {
        if (await condicion()) return true;
        if (Date.now() > fin) return false;
        await new Promise((resolver) => setTimeout(resolver, pasoMs));
    }
}

/** Espera pasiva, para observar una ventana de tiempo en la que NO debe pasar nada. */
function espera(ms) {
    return new Promise((resolver) => setTimeout(resolver, ms));
}

const leeLog = (ruta) => (existsSync(ruta) ? readFileSync(ruta, "utf8") : "");

const relanzamientosDelLog = (ruta) =>
    leeLog(ruta)
        .split("\n")
        .filter((linea) => linea.includes("RELANZADO"));

/** Un `spawn` que apunta cada llamada y delega en el de verdad. */
function spawnEspia(llamadas) {
    return (...argumentos) => {
        llamadas.push(argumentos);
        return spawn(...argumentos);
    };
}

describe("política de relanzamiento: tres sondeos fallidos SEGUIDOS", () => {
    /** Índices de la secuencia en los que la política manda relanzar. */
    function relanzamientosDe(secuencia) {
        let estado = { fallosSeguidos: 0 };
        const indices = [];
        secuencia.forEach((sondeoOk, indice) => {
            const siguiente = siguienteEstadoDeSondeo(estado, sondeoOk);
            estado = { fallosSeguidos: siguiente.fallosSeguidos };
            if (siguiente.relanzar) indices.push(indice);
        });
        return indices;
    }

    it("dos fallos seguidos NO relanzan", () => {
        expect(
            relanzamientosDe([false, false]),
            "un sondeo suelto puede fallar por un pico de carga de la máquina; " +
                "relanzar por eso corta la medición en curso, que es justo el " +
                "daño que este instrumento existe para evitar",
        ).toEqual([]);
    });

    it("el tercer fallo seguido relanza, y solo el tercero", () => {
        expect(relanzamientosDe([false, false, false])).toEqual([2]);
    });

    it("un sondeo bueno reinicia la cuenta", () => {
        expect(
            relanzamientosDe([false, false, true, false, false]),
            "cuatro fallos con uno bueno en medio no son tres seguidos",
        ).toEqual([]);
    });

    it("tras relanzar, la cuenta vuelve a empezar", () => {
        expect(
            relanzamientosDe([false, false, false, false, false, false]),
            "si la cuenta no se reiniciara al relanzar, cada fallo posterior " +
                "relanzaría otra vez y el servidor no llegaría a arrancar",
        ).toEqual([2, 5]);
    });

    it("el umbral declarado es tres", () => {
        expect(FALLOS_PARA_RELANZAR).toBe(3);
    });
});

describe("opciones del spawn: el hijo no abre ventana", () => {
    it("las opciones llevan windowsHide", () => {
        expect(
            opcionesDeSpawn(9).windowsHide,
            "en Windows, un proceso de consola lanzado desde un padre sin " +
                "consola recibe una consola NUEVA y VISIBLE: sin esta bandera " +
                "el vigilante llena la pantalla del dueño de ventanas",
        ).toBe(true);
    });

    it("la salida del hijo va al mismo log que la del vigilante", () => {
        expect(opcionesDeSpawn(9).stdio).toEqual(["ignore", 9, 9]);
    });
});

describe("argumentos del servidor", () => {
    it("lanza la entrada de serve y le pasa el puerto como cadena", () => {
        const argumentos = argumentosDelServidor({
            serveMain: "C:/x/serve/build/main.js",
            dir: "C:/y/out",
            port: 4321,
        });

        expect(argumentos[0]).toBe("C:/x/serve/build/main.js");
        expect(argumentos).toContain("C:/y/out");
        expect(
            argumentos[argumentos.indexOf("-l") + 1],
            "`spawn` rechaza un argumento numérico: el puerto viaja como cadena",
        ).toBe("4321");
        expect(argumentos).toContain("--no-clipboard");
    });
});

describe("resolución de la entrada de serve", () => {
    it("una ruta explícita que existe se usa tal cual", () => {
        expect(
            resolveServeMain({
                explicito: "C:/x/main.js",
                env: {},
                existe: () => true,
            }),
        ).toBe("C:/x/main.js");
    });

    it("una ruta explícita que NO existe falla en vez de caer a otra", () => {
        expect(() =>
            resolveServeMain({
                explicito: "C:/no/existe.js",
                env: { SERVE_MAIN: "C:/otra.js" },
                existe: (ruta) => ruta === "C:/otra.js",
            }),
        ).toThrow(/C:\/no\/existe\.js/);
    });

    it("sin ruta explícita se usa SERVE_MAIN", () => {
        expect(
            resolveServeMain({
                env: { SERVE_MAIN: "C:/otra.js" },
                existe: (ruta) => ruta === "C:/otra.js",
            }),
        ).toBe("C:/otra.js");
    });

    it("sin nada dicho se prueba la ruta conocida de la máquina", () => {
        expect(
            resolveServeMain({
                env: {},
                existe: (ruta) => ruta === SERVE_MAIN_POR_DEFECTO,
            }),
        ).toBe(SERVE_MAIN_POR_DEFECTO);
    });

    it("sin ninguna entrada resoluble, el error dice cómo fijarla", () => {
        let mensaje = "";
        try {
            resolveServeMain({ env: {}, existe: () => false });
        } catch (error) {
            mensaje = error.message;
        }

        expect(mensaje).toMatch(/--serve-main/);
        expect(mensaje).toMatch(/SERVE_MAIN/);
        expect(
            mensaje,
            "el error tiene que decir por qué el vigilante no sirve los " +
                "ficheros él mismo, o el siguiente que lo lea lo 'arreglará' " +
                "escribiendo un servidor propio y las cifras de la ronda " +
                "dejarán de ser comparables",
        ).toMatch(/cabeceras|compresión/);
    });
});

describe("línea de registro del relanzamiento", () => {
    it("lleva hora ISO, motivo y PID nuevo", () => {
        const ahora = "2026-09-06T10:11:12.345Z";
        const motivo = motivoDeSalidaDelHijo({ code: 7, signal: null });
        const linea = lineaDeRelanzamiento({ ahora, motivo, hijoPid: 4242 });

        expect(linea).toMatch(
            /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/,
        );
        expect(linea).toContain(ahora);
        expect(linea).toContain(motivo);
        expect(linea).toMatch(/\b4242\b/);
    });

    it("distingue morir por señal de salir con código", () => {
        expect(
            motivoDeSalidaDelHijo({ code: null, signal: "SIGTERM" }),
        ).toMatch(/SIGTERM/);
        expect(motivoDeSalidaDelHijo({ code: 7, signal: null })).toMatch(/7/);
    });

    it("el motivo por sondeos dice cuántos fallaron y cada cuánto", () => {
        const motivo = motivoDeSondeosFallidos({ fallos: 3, probeMs: 2000 });

        expect(motivo).toMatch(/3/);
        expect(motivo).toMatch(/2000/);
    });

    it("la línea de arranque nombra el directorio, el puerto y los dos PID", () => {
        const linea = lineaDeArranque({
            pid: 111,
            hijoPid: 222,
            dir: "C:/y/out",
            port: 4321,
        });

        expect(linea).toContain("C:/y/out");
        expect(linea).toContain("http://localhost:4321");
        expect(linea).toMatch(/\b111\b/);
        expect(linea).toMatch(/\b222\b/);
    });
});

describe("parseo de la línea de órdenes", () => {
    it("exige el directorio y el puerto", () => {
        expect(() => parseArgs(["--port=4321"])).toThrow(/--dir/);
        expect(() => parseArgs(["--dir=out"])).toThrow(/--port/);
    });

    it("rechaza un puerto que no es un puerto", () => {
        expect(() => parseArgs(["--dir=out", "--port=cuatromil"])).toThrow(
            /--port/,
        );
        expect(() => parseArgs(["--dir=out", "--port=70000"])).toThrow(
            /--port/,
        );
    });

    it("rechaza una bandera desconocida en vez de ignorarla", () => {
        expect(
            () => parseArgs(["--dir=out", "--port=4321", "--puerto=4321"]),
            "una bandera mal escrita que se ignora en silencio es un " +
                "vigilante que arranca con el valor por defecto y nadie se " +
                "entera hasta que la ronda mide el puerto equivocado",
        ).toThrow(/puerto/);
    });

    it("rechaza un intervalo de sondeo por debajo del suelo declarado", () => {
        expect(() =>
            parseArgs(["--dir=out", "--port=4321", "--probe-ms=10"]),
        ).toThrow(/probe-ms/);
        expect(MIN_PROBE_MS).toBeGreaterThan(0);
    });

    it("sin --probe-ms usa el intervalo por defecto", () => {
        const opciones = parseArgs(["--dir=out", "--port=4321"]);

        expect(opciones.probeMs).toBe(DEFAULT_PROBE_MS);
        expect(opciones.port).toBe(4321);
        expect(path.isAbsolute(opciones.dir)).toBe(true);
    });

    it("sin --log ni --pid-file usa las rutas derivadas del puerto", () => {
        const opciones = parseArgs(["--dir=out", "--port=4321"]);
        const defectos = rutasPorDefecto(4321);

        expect(opciones.log).toBe(defectos.log);
        expect(opciones.pidFile).toBe(defectos.pidFile);
        expect(
            defectos.log.startsWith(os.tmpdir()),
            "el log por defecto vive fuera del repo: un vigilante no ensucia " +
                "el árbol de trabajo de nadie",
        ).toBe(true);
    });

    it("las rutas dichas a mano se respetan", () => {
        const opciones = parseArgs([
            "--dir=out",
            "--port=4321",
            "--log=C:/tmp/v.log",
            "--pid-file=C:/tmp/v.pid",
            "--probe-ms=500",
        ]);

        expect(opciones.log).toBe(path.resolve("C:/tmp/v.log"));
        expect(opciones.pidFile).toBe(path.resolve("C:/tmp/v.pid"));
        expect(opciones.probeMs).toBe(500);
    });
});

describe("el vigilante sobre procesos de verdad", () => {
    it("relanza el servidor que se muere y deja la razón y el PID en el log", async () => {
        const carpeta = carpetaTemporal();
        const port = await puertoLibre();
        const servidorFalso = escribeServidorFalso({
            carpeta,
            modo: "muere",
            vidaMs: 700,
        });
        const log = path.join(carpeta, "vigilante.log");
        const pidFile = path.join(carpeta, "vigilante.pid");
        const llamadas = [];

        const vigilante = await arrancaVigilante({
            dir: carpeta,
            port,
            log,
            pidFile,
            /* 5000 ms: dentro de la ventana de este caso no llega a haber ni un
               sondeo, así que el relanzamiento SOLO puede venir del evento
               `exit` del hijo. Si un día viniera del sondeo, este caso lo
               distingue por el motivo que exige más abajo. */
            probeMs: 5000,
            serveMain: servidorFalso,
            spawnFn: spawnEspia(llamadas),
        });
        const primerPid = vigilante.hijoPid;

        const relanzo = await esperaHasta(
            () => relanzamientosDelLog(log).length > 0,
            6000,
        );
        expect(relanzo, `el log se quedó en: ${leeLog(log)}`).toBe(true);

        const [linea] = relanzamientosDelLog(log);
        expect(linea).toMatch(/código 7/);
        const nuevoPid = Number(/PID (\d+)$/.exec(linea)?.[1]);
        expect(Number.isInteger(nuevoPid)).toBe(true);
        expect(nuevoPid).not.toBe(primerPid);

        const vuelveAServir = await esperaHasta(
            () => sondeaUnaVez(urlDeSondeo(port), 1000),
            5000,
        );
        expect(
            vuelveAServir,
            "relanzar y no restaurar el servicio es no haber relanzado",
        ).toBe(true);

        const pids = JSON.parse(readFileSync(pidFile, "utf8"));
        expect(pids.hijo).toBe(nuevoPid);
        expect(pids.vigilante).toBe(process.pid);

        /* El segundo hijo sobrevive: un relanzamiento, no un bucle. */
        await espera(600);
        expect(relanzamientosDelLog(log).length).toBe(1);

        expect(llamadas.length).toBeGreaterThanOrEqual(2);
        for (const [ejecutable, argumentos, opciones] of llamadas) {
            expect(ejecutable).toBe(process.execPath);
            expect(
                argumentos[0],
                "el vigilante lanza SIEMPRE la entrada que se le dio (en la " +
                    "máquina real, el `serve` de las críticas), nunca un " +
                    "servidor propio: la compresión y las cabeceras son parte " +
                    "del instrumento",
            ).toBe(servidorFalso);
            expect(argumentos).toEqual(
                argumentosDelServidor({
                    serveMain: servidorFalso,
                    dir: carpeta,
                    port,
                }),
            );
            expect(
                opciones.windowsHide,
                "cada spawn del vigilante, el primero y los relanzamientos, " +
                    "tiene que ser invisible: una ventana de consola por " +
                    "relanzamiento en la pantalla del dueño es la queja del " +
                    "2026-09-05, dos veces",
            ).toBe(true);
        }
    });

    it("relanza el servidor que sigue vivo pero deja de contestar", async () => {
        const carpeta = carpetaTemporal();
        const port = await puertoLibre();
        const servidorFalso = escribeServidorFalso({
            carpeta,
            modo: "cuelga",
        });
        const log = path.join(carpeta, "vigilante.log");

        await arrancaVigilante({
            dir: carpeta,
            port,
            log,
            /* 300 ms: el hijo colgado no muere nunca, así que el relanzamiento
               SOLO puede venir de los sondeos. Tres fallos con este intervalo
               son ~1,8 s contando que cada sondeo agota su propio tiempo. */
            probeMs: 300,
            serveMain: servidorFalso,
        });

        const relanzo = await esperaHasta(
            () => relanzamientosDelLog(log).length > 0,
            9000,
        );
        expect(relanzo, `el log se quedó en: ${leeLog(log)}`).toBe(true);

        const [linea] = relanzamientosDelLog(log);
        expect(
            linea,
            "el motivo tiene que decir que fueron los sondeos, no una muerte",
        ).toMatch(/3 sondeos seguidos sin respuesta/);

        const vuelveAServir = await esperaHasta(
            () => sondeaUnaVez(urlDeSondeo(port), 1000),
            5000,
        );
        expect(vuelveAServir).toBe(true);
    });

    it("NO relanza un servidor sano", async () => {
        const carpeta = carpetaTemporal();
        const port = await puertoLibre();
        const servidorFalso = escribeServidorFalso({
            carpeta,
            modo: "sano",
        });
        const log = path.join(carpeta, "vigilante.log");

        const vigilante = await arrancaVigilante({
            dir: carpeta,
            port,
            log,
            probeMs: 300,
            serveMain: servidorFalso,
        });
        const primerPid = vigilante.hijoPid;

        /* Seis sondeos: el doble de los que harían falta para relanzar. */
        await espera(2000);

        expect(
            relanzamientosDelLog(log),
            "un vigilante que relanza un servidor sano corta la medición que " +
                "está protegiendo",
        ).toEqual([]);
        expect(vigilante.hijoPid).toBe(primerPid);
        expect(
            await sondeaUnaVez(urlDeSondeo(port), 1000),
            "y el sondeo que dio por sano al servidor es el mismo que se usa " +
                "aquí: si `fetch` no funcionara en este entorno, el caso de " +
                "arriba pasaría por el motivo equivocado",
        ).toBe(true);
    });

    it("al parar, el hijo se muere con él", async () => {
        const carpeta = carpetaTemporal();
        const port = await puertoLibre();
        const servidorFalso = escribeServidorFalso({
            carpeta,
            modo: "sano",
        });

        const vigilante = await startWatchdog({
            dir: carpeta,
            port,
            log: path.join(carpeta, "vigilante.log"),
            probeMs: 5000,
            serveMain: servidorFalso,
        });

        const arrancado = await esperaHasta(
            () => sondeaUnaVez(urlDeSondeo(port), 1000),
            5000,
        );
        expect(arrancado).toBe(true);

        await vigilante.stop();

        const muerto = await esperaHasta(
            async () => !(await sondeaUnaVez(urlDeSondeo(port), 500)),
            5000,
        );
        expect(
            muerto,
            "un vigilante que se va y deja el servidor vivo es un proceso " +
                "huérfano en la máquina del dueño",
        ).toBe(true);
    });
});
