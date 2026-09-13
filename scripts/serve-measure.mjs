#!/usr/bin/env node
/**
 * SERVIDOR DE MEDICIÓN: `serve` con la 404 por prefijo de Netlify.
 *
 * POR QUÉ EXISTE. Desde el 2026-09-10 `netlify.toml` sirve `out/en/404.html`
 * con estado 404 para cualquier camino inexistente bajo `/en/` (regla
 * `from = "/en/*"`, `status = 404`, `force = false`). `serve` no puede
 * reproducirlo: `serve-handler` solo sirve el `${statusCode}.html` de la raíz,
 * las `rewrites` de `serve.json` responden 200 y tapan rutas reales, y el CLI
 * llama al handler sin el cuarto argumento (`methods`) que permite sobrescribir
 * `sendError`. Así, el instrumento de las críticas veía una 404 castellana que
 * producción ya no sirve. Decisión del dueño (2026-09-10): el servidor de
 * medición reproduce la regla de Netlify con la MISMA compresión que `serve`.
 *
 * QUÉ ES IGUAL A `serve`, y por qué no cambia las cifras: `serve-handler` y
 * `compression` se cargan de la MISMA instalación de `serve` que usa el
 * vigilante (`createRequire` sobre su `build/main.js`: la misma resolución de
 * módulos que hace ese fichero, sin copiar versiones), la compresión se monta
 * igual (`promisify(compression())`, opciones por defecto, antes del
 * handler) y el handler recibe la misma configuración que le pasa el CLI con
 * los argumentos del vigilante (`public` relativo al directorio de trabajo,
 * `etag: true`, `symlinks` sin fijar).
 *
 * LO ÚNICO QUE CAMBIA: `sendError`, que `serve-handler` solo invoca por esa vía
 * para un 404 (camino inexistente o enlace simbólico no permitido). Llegar ahí
 * ES el shadowing de Netlify: la ruta no existe como fichero. Si además cae
 * bajo el `from` de una regla 404 de `netlify.toml`, la respuesta la produce
 * `serve-handler` otra vez, pero con la raíz en el directorio del destino, de
 * modo que su propia página de error es el `to` de la regla, con sus mismas
 * cabeceras y estado. En cualquier otro caso se vuelve a llamar al handler SIN
 * métodos: el comportamiento de `serve` intacto.
 *
 * Las reglas se LEEN de `netlify.toml` en cada arranque (fuente única). No hay
 * `Start-Process` ni ventanas: lo lanza el vigilante con `windowsHide`.
 *
 * USO:
 *
 *   node scripts/serve-measure.mjs --dir=out --port=4323
 *   node scripts/serve-measure.mjs --dir=out --port=4323 \
 *       --serve-main=<ruta a serve/build/main.js> --netlify=netlify.toml
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { resolveServeMain } from "./serve-watchdog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Dónde se leen las reglas si nadie dice otra cosa. */
export const NETLIFY_POR_DEFECTO = path.join(ROOT, "netlify.toml");

/**
 * Las reglas `[[redirects]]` de `netlify.toml` con `status = 404`, como
 * `{ from, to, force }`. Salta comentarios: una regla comentada no sirve nada.
 * Solo reproduce la forma que usa el repo (`/prefijo/*` o un camino exacto) y
 * un destino que se llame `404.html`, porque la delegación en `serve-handler`
 * sirve el `${statusCode}.html` del directorio del destino; cualquier otra
 * forma falla aquí en vez de medirse en silencio con otra semántica.
 */
export function reglasDe404(texto) {
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
        const encaje = /^([a-z_]+)\s*=\s*"?([^"]*?)"?\s*$/.exec(limpia);
        if (actual && encaje) actual[encaje[1]] = encaje[2];
    }
    const reglas = [];
    for (const bloque of bloques) {
        if (bloque.status !== "404") continue;
        const { from, to } = bloque;
        const formaValida =
            typeof from === "string" &&
            from.startsWith("/") &&
            !/[:*]/.test(from.replace(/\/\*$/, ""));
        if (!formaValida || typeof to !== "string" || !to.startsWith("/")) {
            throw new Error(
                `Regla 404 de netlify.toml que el servidor de medición no ` +
                    `sabe reproducir: ${JSON.stringify(bloque)}.`,
            );
        }
        if (path.posix.basename(to) !== "404.html") {
            throw new Error(
                `El destino de la regla 404 «${from}» tiene que llamarse ` +
                    `404.html, y es «${to}».`,
            );
        }
        reglas.push({ from, to, force: bloque.force === "true" });
    }
    return reglas;
}

/** Si una ruta pedida cae bajo el `from` de una regla. */
export function caeBajo(ruta, from) {
    if (from.endsWith("/*")) return ruta.startsWith(from.slice(0, -1));
    return ruta === from;
}

/**
 * La decisión de `sendError`, pura: el destino que sirve la regla o `null`
 * para dejar a `serve-handler` como está. Solo un 404 se reescribe, la
 * primera regla que encaja gana (el orden de Netlify) y un destino que no
 * existe en el build no se sirve.
 */
export function destinoDelError({ ruta, statusCode, reglas, existe }) {
    if (statusCode !== 404) return null;
    const regla = reglas.find((r) => caeBajo(ruta, r.from));
    if (!regla || !existe(regla.to)) return null;
    return regla.to;
}

/**
 * La configuración con la que el CLI de `serve` llama al handler con los
 * argumentos del vigilante (`<dir> -l <puerto> --no-clipboard`), leída en su
 * `build/main.js` (`loadConfiguration`): `public` relativo al directorio de
 * trabajo, `etag` activo y `symlinks` sin fijar. `serve` además fusionaría un
 * `serve.json`, `now.json` o `package.json` del directorio servido; eso no se
 * reproduce, así que si existe alguno se falla en vez de servir distinto.
 */
export function configuracionComoServe({
    dir,
    cwd = process.cwd(),
    existe = existsSync,
}) {
    for (const fichero of ["serve.json", "now.json", "package.json"]) {
        if (existe(path.join(dir, fichero))) {
            throw new Error(
                `${path.join(dir, fichero)} existe y \`serve\` lo fusionaría ` +
                    "en su configuración; el servidor de medición no lo reproduce.",
            );
        }
    }
    return {
        public: path.relative(cwd, path.resolve(dir)),
        etag: true,
        symlinks: undefined,
    };
}

/** `serve-handler` y `compression` de la instalación de `serve` dada. */
export function cargaDeServe(serveMain) {
    const requiere = createRequire(serveMain);
    return {
        handler: requiere("serve-handler"),
        compression: requiere("compression"),
    };
}

/** La ruta pedida tal como la calcula `serve-handler`. */
function rutaPedida(url) {
    try {
        return decodeURIComponent(new URL(url, "http://x").pathname);
    } catch {
        return null;
    }
}

/**
 * El manejador de peticiones: compresión y handler en el orden de `serve`,
 * con `sendError` sustituido solo cuando la regla aplica.
 */
export function creaManejador({ handler, compression, config, reglas }) {
    const comprime = promisify(compression());
    return async (request, response) => {
        await comprime(request, response);
        const ruta = rutaPedida(request.url ?? "/");
        const aplica =
            ruta !== null && reglas.some((r) => caeBajo(ruta, r.from));
        if (!aplica) {
            await handler(request, response, config);
            return;
        }
        const sendError = async (...argumentos) => {
            const current = argumentos[3];
            const spec = argumentos[6];
            const destino = destinoDelError({
                ruta,
                statusCode: spec?.statusCode,
                reglas,
                existe: (to) => existsSync(path.join(current, to)),
            });
            if (destino === null) {
                await handler(request, response, config);
                return;
            }
            const inexistente = Object.create(request, {
                url: { value: `/${randomUUID()}` },
            });
            await handler(inexistente, response, {
                ...config,
                public: path.join(current, path.posix.dirname(destino)),
            });
        };
        await handler(request, response, config, { sendError });
    };
}

/** Parseo mínimo: `--dir`, `--port`, y opcionales `--serve-main`, `--netlify`. */
export function parseArgs(argv) {
    const valores = new Map();
    for (const arg of argv) {
        const encaje = /^--(dir|port|serve-main|netlify)=([\s\S]*)$/.exec(arg);
        if (!encaje) throw new Error(`Argumento no reconocido: «${arg}».`);
        valores.set(encaje[1], encaje[2]);
    }
    const port = Number(valores.get("port"));
    if (!valores.get("dir") || !Number.isInteger(port) || port < 1) {
        throw new Error("Hacen falta --dir=<carpeta> y --port=<n>.");
    }
    return {
        dir: path.resolve(valores.get("dir")),
        port,
        serveMain: valores.get("serve-main") ?? null,
        netlify: path.resolve(valores.get("netlify") ?? NETLIFY_POR_DEFECTO),
    };
}

function main() {
    let opciones;
    let manejador;
    try {
        opciones = parseArgs(process.argv.slice(2));
        const serveMain = resolveServeMain({ explicito: opciones.serveMain });
        const { handler, compression } = cargaDeServe(serveMain);
        manejador = creaManejador({
            handler,
            compression,
            config: configuracionComoServe({ dir: opciones.dir }),
            reglas: reglasDe404(readFileSync(opciones.netlify, "utf8")),
        });
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 2;
        return;
    }
    const servidor = createServer((request, response) => {
        manejador(request, response).catch((error) => {
            throw error;
        });
    });
    servidor.listen(opciones.port, () => {
        process.stdout.write(
            `servidor de medición sirve ${opciones.dir} en http://localhost:${opciones.port}\n`,
        );
    });
}

/* Misma guarda que el vigilante: su test lo importa y no debe arrancar nada. */
const invocadoComoPrograma =
    typeof process.argv[1] === "string" &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invocadoComoPrograma) main();
