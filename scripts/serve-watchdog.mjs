#!/usr/bin/env node
/**
 * VIGILANTE DEL SERVIDOR ESTÁTICO DE LAS CRÍTICAS.
 *
 * POR QUÉ EXISTE, con la fecha y el daño delante. Durante la crítica externa
 * #19 (2026-09-06) el servidor estático que servía el build —`serve`, oculto,
 * en el puerto 4321— murió a mitad de la fase técnica. El evaluador B3 lo
 * sondeó durante trece minutos (58 intentos), acabó montando el artefacto por
 * interceptación de rutas y demostró de paso que el estrangulamiento de red de
 * CDP no se aplica a las respuestas interceptadas: la fase de rendimiento
 * quedó «no puntuable». La causa de la muerte del proceso NO está determinada
 * —nadie lo mató a propósito y ningún evaluador arranca ni para servidores—,
 * así que el arreglo no puede ser «que no se muera»: tiene que ser «que
 * alguien lo esté mirando». Es la regla 1 de la lección del 2026-09-06 en
 * `task/lessons.md`: un servidor sin vigilante es una medición que puede no
 * ocurrir.
 *
 * QUÉ HACE. Arranca el servidor como proceso HIJO, lo sondea por HTTP cada
 * pocos segundos y lo relanza cuando deja de responder o cuando se muere por
 * su cuenta, dejando en un log la hora ISO, el motivo y el PID nuevo. Escribe
 * su propio PID y el del hijo en un fichero, para que el pre-registro de la
 * ronda pueda anotarlos y para que al cerrarla se sepa a quién parar.
 *
 * QUÉ NO CONFUNDE CON UNA MUERTE: el arranque. Un servidor recién lanzado
 * todavía no atiende el puerto, y un vigilante que cuente ese silencio como
 * fallo mata lo que acaba de lanzar y vuelve a empezar — un bucle que deja la
 * ronda igual de sin servidor que la crítica #19. Por eso los silencios de la
 * ventana de arranque no cuentan hasta la primera respuesta, con plazo
 * máximo: ver `ARRANQUE_MS`.
 *
 * QUÉ NO HACE, y es deliberado: NO sirve los ficheros él mismo. Lanza SIEMPRE
 * el mismo `serve` que usaron las rondas anteriores, con los mismos
 * argumentos, porque la compresión y las cabeceras del servidor son parte del
 * instrumento — un servidor propio cambiaría las cifras de peso transferido y
 * de rendimiento, y las haría incomparables con las críticas #11 a #19. El
 * candado de esa decisión está en `serve-watchdog.test.mjs`: cada spawn que
 * hace el vigilante, el primero y los relanzamientos, se comprueba que ejecuta
 * el `main.js` de `serve` y no otra cosa.
 *
 * SIN VENTANAS EN LA PANTALLA DEL DUEÑO. `windowsHide: true` no es un detalle
 * de estilo: en Windows, un proceso de consola lanzado desde un padre sin
 * consola recibe una consola NUEVA y VISIBLE, y eso costó dos quejas del dueño
 * el 2026-09-05 (lecciones «bis» y «quater»). El vigilante lo arranca el
 * orquestador con `Start-Process -WindowStyle Hidden`, y el hijo hereda esa
 * invisibilidad solo si el spawn lleva la bandera. Por eso la construcción de
 * las opciones del spawn es una función exportada aparte: para poder atarla.
 *
 * USO:
 *
 *   node scripts/serve-watchdog.mjs --dir=out --port=4321
 *   node scripts/serve-watchdog.mjs --dir=C:/tmp/copia-f3594ad --port=4321 \
 *       --log=C:/tmp/vigilante.log --probe-ms=2000
 *
 * El log y el fichero de PIDs, si no se dicen, van al directorio temporal del
 * sistema con el puerto en el nombre.
 */
import { spawn } from "node:child_process";
import {
    appendFileSync,
    closeSync,
    existsSync,
    openSync,
    readdirSync,
    statSync,
    writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Cada cuánto se sondea el puerto, si nadie dice otra cosa. */
export const DEFAULT_PROBE_MS = 2000;

/**
 * Suelo del intervalo de sondeo. No es una preferencia: por debajo de esto el
 * intervalo se acerca al arranque de un proceso de Node (~67 ms medidos en
 * esta máquina para `node -e "0"`) y el vigilante relanzaría por impaciencia
 * un servidor que todavía no ha atado el puerto.
 */
export const MIN_PROBE_MS = 50;

/**
 * Sondeos fallidos SEGUIDOS que hacen falta para dar el servidor por muerto.
 * Tres y no uno: un sondeo suelto puede fallar por una petición perdida o por
 * un pico de carga de la máquina —que durante una ronda de crítica tiene un
 * navegador midiendo—, y relanzar por eso cortaría la medición en curso, que
 * es exactamente el daño que este instrumento existe para evitar.
 */
export const FALLOS_PARA_RELANZAR = 3;

/**
 * Dónde buscar el `serve` que usan las críticas cuando nadie lo dice.
 *
 * `serve` NO es dependencia de este proyecto a propósito (`pnpm start` lo
 * invoca con `npx`), así que no vive en el `node_modules` del repo: vive en la
 * caché de `npx`, bajo un directorio cuyo nombre es un hash de la petición que
 * lo instaló. Por eso no se puede escribir aquí una ruta fija: el hash cambia
 * al reinstalar, y en otra máquina o en CI no existe ninguno.
 *
 * Lo que se declara es el PATRÓN de búsqueda, y la ruta concreta se encuentra
 * mirando: `<caché de npx>/ * /node_modules/serve/build/main.js`, ordenado por
 * fecha de modificación descendente para quedarse con la instalación más
 * reciente. La caché sale de `npm_config_cache`, de `NPM_CONFIG_CACHE` o del
 * sitio por defecto de cada sistema (`%LOCALAPPDATA%/npm-cache` en Windows,
 * `~/.npm` en el resto). Si no aparece ninguna, el error dice las dos salidas
 * explícitas que existen: `--serve-main=` y la variable `SERVE_MAIN`.
 *
 * Hasta el 2026-09-06 esta constante era la ruta absoluta de UNA máquina
 * (`.../npm-cache/_npx/aab42732f01924e5/...`), señalada por la revisión
 * adversarial de la ola S: un `$HOME` concreto y un hash de caché dentro de un
 * fichero versionado.
 */
export const SUBRUTA_DE_SERVE = "node_modules/serve/build/main.js";

/** Directorios donde `npx` deja lo que instala, en orden de preferencia. */
export function directoriosDeCacheNpx(env = process.env) {
    const raices = [env.npm_config_cache, env.NPM_CONFIG_CACHE];
    if (process.platform === "win32") {
        if (env.LOCALAPPDATA)
            raices.push(path.join(env.LOCALAPPDATA, "npm-cache"));
    } else if (env.HOME) {
        raices.push(path.join(env.HOME, ".npm"));
    }
    return raices
        .filter((raiz) => typeof raiz === "string" && raiz !== "")
        .map((raiz) => path.join(raiz, "_npx"));
}

/**
 * Instalaciones de `serve` en la caché de `npx`, la más reciente primero.
 *
 * `listar` y `fecha` se inyectan en los tests para no depender del disco de
 * quien ejecuta la suite; por defecto leen el sistema de ficheros.
 */
export function buscarServeEnCacheNpx({
    env = process.env,
    listar = (dir) => readdirSync(dir),
    fecha = (ruta) => statSync(ruta).mtimeMs,
    existe = (ruta) => existsSync(ruta),
} = {}) {
    const candidatos = [];
    for (const cache of directoriosDeCacheNpx(env)) {
        let entradas;
        try {
            entradas = listar(cache);
        } catch {
            continue;
        }
        for (const entrada of entradas) {
            const ruta = path.join(cache, entrada, SUBRUTA_DE_SERVE);
            if (!existe(ruta)) continue;
            let cuando = 0;
            try {
                cuando = fecha(ruta);
            } catch {
                cuando = 0;
            }
            candidatos.push({ ruta, cuando });
        }
    }
    candidatos.sort((a, b) => b.cuando - a.cuando);
    return candidatos.map((c) => c.ruta);
}

/** Las únicas banderas que el vigilante acepta. */
const CLAVES = new Set([
    "dir",
    "port",
    "log",
    "probe-ms",
    "serve-main",
    "pid-file",
]);

/** Rutas por defecto del log y del fichero de PIDs, derivadas del puerto. */
export function rutasPorDefecto(port) {
    return {
        log: path.join(os.tmpdir(), `serve-watchdog-${port}.log`),
        pidFile: path.join(os.tmpdir(), `serve-watchdog-${port}.pid`),
    };
}

/**
 * Parseo de la línea de órdenes. Falla con un mensaje que dice qué falta o qué
 * sobra: un vigilante que arranca a medias con un valor por defecto inventado
 * es peor que uno que no arranca, porque nadie se entera hasta que la ronda ya
 * está midiendo el puerto equivocado.
 */
export function parseArgs(argv) {
    const bruto = new Map();
    for (const arg of argv) {
        const encaje = /^--([a-z-]+)=([\s\S]*)$/.exec(arg);
        if (!encaje) {
            throw new Error(
                `Argumento no reconocido: «${arg}». Se esperaba la forma ` +
                    `--clave=valor con una de estas claves: ` +
                    `${[...CLAVES].join(", ")}.`,
            );
        }
        const [, clave, valor] = encaje;
        if (!CLAVES.has(clave)) {
            throw new Error(
                `Bandera desconocida: «--${clave}». Las que hay son: ` +
                    `${[...CLAVES].join(", ")}.`,
            );
        }
        bruto.set(clave, valor);
    }

    const dir = bruto.get("dir");
    if (!dir) {
        throw new Error(
            "Falta --dir=<carpeta>: el directorio que se sirve (el `out/` " +
                "construido, o la copia del build de la ronda).",
        );
    }

    const puertoCrudo = bruto.get("port");
    if (puertoCrudo === undefined) {
        throw new Error("Falta --port=<n>: el puerto en el que se sirve.");
    }
    const port = Number(puertoCrudo);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
            `--port tiene que ser un entero entre 1 y 65535, y llegó ` +
                `«${puertoCrudo}».`,
        );
    }

    const probeCrudo = bruto.get("probe-ms");
    const probeMs =
        probeCrudo === undefined ? DEFAULT_PROBE_MS : Number(probeCrudo);
    if (!Number.isInteger(probeMs) || probeMs < MIN_PROBE_MS) {
        throw new Error(
            `--probe-ms tiene que ser un entero de al menos ${MIN_PROBE_MS} ` +
                `ms, y llegó «${probeCrudo}».`,
        );
    }

    const defectos = rutasPorDefecto(port);
    const log = bruto.get("log");
    const pidFile = bruto.get("pid-file");

    return {
        dir: path.resolve(dir),
        port,
        log: log ? path.resolve(log) : defectos.log,
        pidFile: pidFile ? path.resolve(pidFile) : defectos.pidFile,
        probeMs,
        serveMain: bruto.get("serve-main") ?? null,
    };
}

/**
 * Dónde está el `serve` que se va a lanzar. El orden es explícito primero,
 * entorno después y la ruta conocida de esta máquina al final; una ruta que
 * alguien pidió a propósito y no existe NO cae al siguiente candidato, porque
 * caer en silencio es lanzar un servidor distinto del que se pidió.
 */
export function resolveServeMain({
    explicito = null,
    env = process.env,
    existe = existsSync,
    buscar = buscarServeEnCacheNpx,
} = {}) {
    if (explicito) {
        if (existe(explicito)) return explicito;
        throw new Error(
            `La ruta de --serve-main no existe: ${explicito}. Apunta al ` +
                "`build/main.js` del paquete `serve`.",
        );
    }

    const delEntorno = env.SERVE_MAIN;
    if (delEntorno) {
        if (existe(delEntorno)) return delEntorno;
        throw new Error(
            `La ruta de la variable SERVE_MAIN no existe: ${delEntorno}. ` +
                "Apunta al `build/main.js` del paquete `serve`.",
        );
    }

    const [enCache] = buscar({ env, existe });
    if (enCache) return enCache;

    throw new Error(
        "No encuentro el `serve` que usan las críticas. Este vigilante NO " +
            "sirve los ficheros por su cuenta a propósito: la compresión y " +
            "las cabeceras de `serve` son parte del instrumento. Fija su " +
            "entrada con --serve-main=<ruta a serve/build/main.js> o con la " +
            "variable de entorno SERVE_MAIN. Si no está instalado, una " +
            "corrida de `npx serve out` lo deja en la caché de npx, que es " +
            "donde este script lo busca por defecto " +
            `(${directoriosDeCacheNpx().join(", ") || "sin caché de npx conocida"}` +
            `, subruta ${SUBRUTA_DE_SERVE}).`,
    );
}

/** Los argumentos con los que se lanza `serve`, iguales a los de `pnpm start`. */
export function argumentosDelServidor({ serveMain, dir, port }) {
    return [serveMain, dir, "-l", String(port), "--no-clipboard"];
}

/**
 * Opciones del spawn del hijo. `windowsHide: true` es EL candado de este
 * fichero, no un detalle: sin él, en Windows el servidor abre una ventana de
 * consola en la pantalla del dueño y esa es una queja ya pagada dos veces
 * (lecciones del 2026-09-05 «bis» y «quater»). La salida del hijo va al mismo
 * descriptor que el log del vigilante para que un error del servidor quede
 * escrito al lado del relanzamiento que provocó.
 *
 * `NO_UPDATE_CHECK` no es cosmética. Leído en el `main.js` instalado (líneas
 * 415-424 y 508): `serve` consulta el registro de npm por si hay versión nueva
 * y AWAITEA esa consulta ANTES de atar el puerto. Es decir, el arranque del
 * instrumento depende de que la red conteste. Un vigilante que sondea cada dos
 * segundos y da por muerto al tercer fallo tiene seis segundos de presupuesto,
 * y un `fetch` a un registro que no responde se los come sin despeinarse: el
 * vigilante mataría un servidor perfectamente sano que solo estaba esperando a
 * npm. La variable apaga esa consulta y deja el arranque en E/S local. Lo que
 * `serve` sirve —compresión, cabeceras, códigos— no cambia ni un byte, que es
 * la condición para que las cifras sigan siendo comparables con las rondas
 * anteriores. El entorno se PROPAGA entero: un `env` que solo llevara esta
 * variable dejaría al hijo sin PATH.
 */
export function opcionesDeSpawn(logFd, env = process.env) {
    return {
        windowsHide: true,
        stdio: ["ignore", logFd, logFd],
        env: { ...env, NO_UPDATE_CHECK: "1" },
    };
}

/** La URL que se sondea. Numérica y no `localhost`: sin resolución de nombres. */
export function urlDeSondeo(port) {
    return `http://127.0.0.1:${port}/`;
}

/**
 * Un sondeo. Devuelve `true` si el servidor CONTESTA, sea cual sea el código:
 * lo que se vigila es que el proceso siga atendiendo el puerto, no lo que
 * responde. Un 404 de `serve` sigue siendo un servidor vivo; lo que la crítica
 * #19 se encontró fue silencio.
 */
export async function sondeaUnaVez(url, timeoutMs) {
    try {
        const respuesta = await fetch(url, {
            signal: AbortSignal.timeout(timeoutMs),
        });
        try {
            await respuesta.body?.cancel();
        } catch {
            /* el cuerpo ya venía cerrado: hubo respuesta, que es lo que importa */
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * La política de relanzamiento, aislada como función pura para poder atarla
 * sin procesos de por medio: la cuenta de fallos se reinicia con cualquier
 * sondeo bueno, y solo el tercer fallo SEGUIDO manda relanzar.
 */
export function siguienteEstadoDeSondeo(estado, sondeoOk) {
    if (sondeoOk) return { fallosSeguidos: 0, relanzar: false };
    const fallosSeguidos = (estado?.fallosSeguidos ?? 0) + 1;
    if (fallosSeguidos >= FALLOS_PARA_RELANZAR) {
        return { fallosSeguidos: 0, relanzar: true };
    }
    return { fallosSeguidos, relanzar: false };
}

/**
 * Cuánto se le concede a un servidor recién lanzado para atender el puerto
 * antes de que sus silencios empiecen a contar. NO es un margen de cortesía:
 * sin él, un vigilante con el intervalo por defecto declara muerto a los seis
 * segundos a un servidor que todavía está arrancando, lo mata, lanza otro que
 * tampoco llega a tiempo, y el bucle deja la ronda exactamente igual de sin
 * servidor que la crítica #19 — solo que ruidosamente. Treinta segundos son
 * dos órdenes de magnitud sobre el arranque local de `serve` y siguen siendo
 * poco frente a los trece minutos que el evaluador B3 pasó sondeando en vano.
 *
 * La gracia es ACOTADA por los dos lados: se acaba en cuanto el servidor
 * contesta una sola vez (a partir de ahí manda la política de los tres
 * fallos), y se acaba igualmente al vencer el plazo aunque no haya contestado
 * nunca, que es como un servidor que no llega a arrancar acaba relanzado en
 * vez de esperado para siempre.
 */
export const ARRANQUE_MS = 30_000;

/**
 * Si un sondeo fallido cuenta para la política de relanzamiento. Los que caen
 * en la ventana de arranque, antes de la primera respuesta del servidor, no
 * cuentan.
 */
export function cuentaElFallo({ haRespondido, msDesdeElArranque, arranqueMs }) {
    return haRespondido || msDesdeElArranque >= arranqueMs;
}

/** Motivo cuando el hijo se muere por su cuenta. */
export function motivoDeSalidaDelHijo({ code, signal }) {
    if (signal) return `el servidor murió por la señal ${signal}`;
    return `el servidor salió por su cuenta con código ${code}`;
}

/** Motivo cuando el hijo sigue vivo pero ha dejado de contestar. */
export function motivoDeSondeosFallidos({ fallos, probeMs }) {
    return `${fallos} sondeos seguidos sin respuesta (uno cada ${probeMs} ms)`;
}

/** La línea que se escribe en el log al relanzar: hora ISO, motivo y PID nuevo. */
export function lineaDeRelanzamiento({ ahora, motivo, hijoPid }) {
    return `[${ahora}] RELANZADO — ${motivo}; servidor nuevo con PID ${hijoPid}`;
}

/** La línea que el vigilante imprime al arrancar. */
export function lineaDeArranque({ pid, hijoPid, dir, port }) {
    return `vigilante PID ${pid} sirve ${dir} en http://localhost:${port} (hijo PID ${hijoPid})`;
}

/**
 * Arranca el vigilante y devuelve un mando para pararlo. `spawnFn` y `reloj`
 * se inyectan para que el test pueda observar CADA spawn (es donde se ata que
 * ninguno abre ventana) y fijar la hora sin depender del reloj de la máquina.
 */
export async function startWatchdog({
    dir,
    port,
    log,
    pidFile = null,
    probeMs = DEFAULT_PROBE_MS,
    arranqueMs = ARRANQUE_MS,
    serveMain = null,
    spawnFn = spawn,
    reloj = () => new Date().toISOString(),
    ahoraMs = () => Date.now(),
} = {}) {
    const entrada = serveMain ?? resolveServeMain();
    const rutaLog = log ?? rutasPorDefecto(port).log;
    const logFd = openSync(rutaLog, "a");

    let hijo = null;
    let fallosSeguidos = 0;
    let parando = false;
    let temporizador = null;
    let arrancadoEn = 0;
    let haRespondido = false;

    const escribe = (linea) => appendFileSync(rutaLog, `${linea}\n`);

    function anotaPids(hijoPid) {
        if (!pidFile) return;
        const contenido = JSON.stringify(
            {
                vigilante: process.pid,
                hijo: hijoPid,
                puerto: port,
                dir,
                log: rutaLog,
            },
            null,
            4,
        );
        writeFileSync(pidFile, `${contenido}\n`);
    }

    function lanza(motivo) {
        const proceso = spawnFn(
            process.execPath,
            argumentosDelServidor({ serveMain: entrada, dir, port }),
            opcionesDeSpawn(logFd),
        );
        hijo = proceso;
        fallosSeguidos = 0;
        arrancadoEn = ahoraMs();
        haRespondido = false;
        proceso.once("exit", (code, signal) => {
            /* Si ya no es el hijo en curso, su muerte la provocó un
               relanzamiento o una parada: no se relanza dos veces. */
            if (parando || hijo !== proceso) return;
            relanza(motivoDeSalidaDelHijo({ code, signal }));
        });
        if (motivo !== null) {
            escribe(
                lineaDeRelanzamiento({
                    ahora: reloj(),
                    motivo,
                    hijoPid: proceso.pid,
                }),
            );
        }
        anotaPids(proceso.pid);
        return proceso;
    }

    function relanza(motivo) {
        if (parando) return;
        const anterior = hijo;
        hijo = null;
        if (
            anterior &&
            anterior.exitCode === null &&
            anterior.signalCode === null
        ) {
            anterior.kill();
        }
        lanza(motivo);
    }

    async function ciclo() {
        if (parando) return;
        const responde = await sondeaUnaVez(urlDeSondeo(port), probeMs);
        if (parando) return;
        if (responde) haRespondido = true;
        const cuenta = cuentaElFallo({
            haRespondido,
            msDesdeElArranque: ahoraMs() - arrancadoEn,
            arranqueMs,
        });
        if (responde || cuenta) {
            const siguiente = siguienteEstadoDeSondeo(
                { fallosSeguidos },
                responde,
            );
            fallosSeguidos = siguiente.fallosSeguidos;
            if (siguiente.relanzar) {
                relanza(
                    motivoDeSondeosFallidos({
                        fallos: FALLOS_PARA_RELANZAR,
                        probeMs,
                    }),
                );
            }
        }
        if (parando) return;
        temporizador = setTimeout(() => {
            void ciclo();
        }, probeMs);
    }

    const primero = lanza(null);
    const banner = lineaDeArranque({
        pid: process.pid,
        hijoPid: primero.pid,
        dir,
        port,
    });
    escribe(`[${reloj()}] ARRANQUE — ${banner}`);
    temporizador = setTimeout(() => {
        void ciclo();
    }, probeMs);

    return {
        pid: process.pid,
        get hijoPid() {
            return hijo?.pid ?? null;
        },
        logPath: rutaLog,
        pidFilePath: pidFile,
        serveMain: entrada,
        banner,
        async stop() {
            if (parando) return;
            parando = true;
            if (temporizador) clearTimeout(temporizador);
            temporizador = null;
            const proceso = hijo;
            hijo = null;
            if (
                proceso &&
                proceso.exitCode === null &&
                proceso.signalCode === null
            ) {
                await new Promise((resolve) => {
                    const remate = setTimeout(() => {
                        proceso.kill("SIGKILL");
                    }, 1000);
                    proceso.once("exit", () => {
                        clearTimeout(remate);
                        resolve();
                    });
                    proceso.kill();
                });
            }
            closeSync(logFd);
        },
    };
}

async function main() {
    let opciones;
    let entrada;
    try {
        opciones = parseArgs(process.argv.slice(2));
        entrada = resolveServeMain({ explicito: opciones.serveMain });
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 2;
        return;
    }

    const vigilante = await startWatchdog({ ...opciones, serveMain: entrada });
    process.stdout.write(`${vigilante.banner}\n`);
    process.stdout.write(`log: ${vigilante.logPath}\n`);
    if (vigilante.pidFilePath) {
        process.stdout.write(`pids: ${vigilante.pidFilePath}\n`);
    }

    const cierra = () => {
        void vigilante.stop().then(() => {
            process.exit(0);
        });
    };
    process.once("SIGINT", cierra);
    process.once("SIGTERM", cierra);
}

/*
 * La misma guarda de entrada que `detect-anti-patterns.mjs` y sus hermanos:
 * este fichero se IMPORTA desde su test, y arrancar un servidor de verdad al
 * importarlo dejaría un proceso suelto por cada corrida de Vitest.
 */
const invocadoComoPrograma =
    typeof process.argv[1] === "string" &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invocadoComoPrograma) void main();
