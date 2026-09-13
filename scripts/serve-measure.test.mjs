/**
 * @vitest-environment node
 *
 * Entorno de Node, como `serve-watchdog.test.mjs`: se leen ficheros del repo y
 * se ejercita un manejador HTTP sin DOM de por medio.
 */
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
    VERCEL_POR_DEFECTO,
    caeBajo,
    configuracionComoServe,
    creaManejador,
    destinoDelError,
    reglasDe404,
} from "./serve-measure.mjs";
import {
    SERVE_MEASURE,
    SERVIDOR_POR_DEFECTO,
    argumentosDelServidor,
    parseArgs,
} from "./serve-watchdog.mjs";

/*
 * QUÉ ATA ESTE FICHERO. El servidor de medición existe para que el instrumento
 * vea la 404 inglesa que producción sirve bajo `/en/` y, fuera de eso, sea
 * `serve` byte a byte. Aquí se atan las dos mitades que se pueden atar sin red:
 * que las reglas salen de `vercel.json` y no de una copia, y la decisión de
 * `sendError`. La equivalencia con `serve` sobre un build se mide aparte.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Un `vercel.json` sintético con las `routes` dadas, como texto. */
function vercelCon(routes, resto = {}) {
    return JSON.stringify({ ...resto, routes });
}

describe("las reglas 404 salen de vercel.json", () => {
    it("el vercel.json real declara la 404 inglesa, y es la única regla 404", () => {
        const reglas = reglasDe404(readFileSync(VERCEL_POR_DEFECTO, "utf8"));
        expect(reglas).toEqual([{ from: "/en/*", to: "/en/404.html" }]);
    });

    it("lee vercel.json de la raíz del repo", () => {
        expect(VERCEL_POR_DEFECTO).toBe(path.join(ROOT, "vercel.json"));
    });

    it("ignora las redirecciones, las cabeceras y las routes que no son 404", () => {
        const texto = vercelCon(
            [
                { src: "/x/(.*)", status: 301, headers: { Location: "/" } },
                { handle: "filesystem" },
                { src: "/y/(.*)", dest: "/y" },
            ],
            {
                redirects: [
                    { source: "/terminos", destination: "/aviso-legal" },
                ],
                headers: [{ source: "/(.*)", headers: [] }],
            },
        );
        expect(reglasDe404(texto)).toEqual([]);
    });

    it("sin routes no hay reglas", () => {
        expect(reglasDe404("{}")).toEqual([]);
    });

    it("acepta el destino como URL limpia o como fichero .html", () => {
        const texto = vercelCon([
            { handle: "filesystem" },
            { src: "/en/(.*)", status: 404, dest: "/en/404.html" },
        ]);
        expect(reglasDe404(texto)).toEqual([
            { from: "/en/*", to: "/en/404.html" },
        ]);
    });

    it("falla ante una regla 404 DELANTE de filesystem: taparía rutas reales", () => {
        const texto = vercelCon([
            { src: "/en/(.*)", status: 404, dest: "/en/404" },
            { handle: "filesystem" },
        ]);
        expect(() => reglasDe404(texto)).toThrow(/filesystem/);
    });

    it("falla ante una regla 404 sin ninguna fase filesystem", () => {
        const texto = vercelCon([
            { src: "/en/(.*)", status: 404, dest: "/en/404" },
        ]);
        expect(() => reglasDe404(texto)).toThrow(/filesystem/);
    });

    it("falla ante un destino que no es una 404, en vez de medir otra cosa", () => {
        const texto = vercelCon([
            { handle: "filesystem" },
            { src: "/en/(.*)", status: 404, dest: "/en/perdido" },
        ]);
        expect(() => reglasDe404(texto)).toThrow(/404\.html/);
    });

    it("falla ante un src que no es un prefijo seguido de (.*)", () => {
        const texto = vercelCon([
            { handle: "filesystem" },
            { src: "/en/[a-z]+", status: 404, dest: "/en/404" },
        ]);
        expect(() => reglasDe404(texto)).toThrow(/no sabe reproducir/);
    });
});

describe("la decisión de sendError", () => {
    const reglas = [{ from: "/en/*", to: "/en/404.html" }];
    const existe = (to) => to === "/en/404.html";

    it("una ruta inexistente bajo /en/ recibe /en/404.html", () => {
        expect(
            destinoDelError({
                ruta: "/en/no-existe",
                statusCode: 404,
                reglas,
                existe,
            }),
        ).toBe("/en/404.html");
    });

    it("una ruta fuera de /en/ se queda con la 404 raíz de serve-handler", () => {
        expect(
            destinoDelError({
                ruta: "/no-existe",
                statusCode: 404,
                reglas,
                existe,
            }),
        ).toBeNull();
        expect(caeBajo("/enlaces", "/en/*")).toBe(false);
    });

    it("solo un 404 se reescribe", () => {
        expect(
            destinoDelError({
                ruta: "/en/no-existe",
                statusCode: 400,
                reglas,
                existe,
            }),
        ).toBeNull();
    });

    it("sin el destino en el build, serve-handler se queda como está", () => {
        expect(
            destinoDelError({
                ruta: "/en/no-existe",
                statusCode: 404,
                reglas,
                existe: () => false,
            }),
        ).toBeNull();
    });
});

describe("la configuración del handler es la del CLI de serve", () => {
    it("public relativo al directorio de trabajo, etag activo, symlinks sin fijar", () => {
        const config = configuracionComoServe({
            dir: path.join(ROOT, "out"),
            cwd: ROOT,
            existe: () => false,
        });
        expect(config).toEqual({
            public: "out",
            etag: true,
            symlinks: undefined,
        });
    });

    it("un serve.json en el directorio servido hace fallar, no se ignora", () => {
        expect(() =>
            configuracionComoServe({
                dir: "C:/y/out",
                cwd: "C:/y",
                existe: (ruta) => ruta.endsWith("serve.json"),
            }),
        ).toThrow(/serve\.json/);
    });
});

describe("el vigilante lanza el servidor de medición por defecto", () => {
    it("sin --servidor, el hijo es serve-measure con la misma entrada de serve", () => {
        const opciones = parseArgs(["--dir=out", "--port=4321"]);
        expect(opciones.servidor).toBe("medicion");
        expect(SERVIDOR_POR_DEFECTO).toBe("medicion");
        expect(
            argumentosDelServidor({
                serveMain: "C:/x/serve/build/main.js",
                dir: "C:/y/out",
                port: 4321,
            }),
        ).toEqual([
            SERVE_MEASURE,
            "--dir=C:/y/out",
            "--port=4321",
            "--serve-main=C:/x/serve/build/main.js",
        ]);
    });

    it("con --servidor=serve el hijo sigue siendo serve con los argumentos de siempre", () => {
        const opciones = parseArgs([
            "--dir=out",
            "--port=4321",
            "--servidor=serve",
        ]);
        expect(opciones.servidor).toBe("serve");
        expect(
            argumentosDelServidor({
                serveMain: "C:/x/serve/build/main.js",
                dir: "C:/y/out",
                port: 4321,
                servidor: "serve",
            }),
        ).toEqual([
            "C:/x/serve/build/main.js",
            "C:/y/out",
            "-l",
            "4321",
            "--no-clipboard",
        ]);
    });

    it("rechaza un servidor desconocido", () => {
        expect(() =>
            parseArgs(["--dir=out", "--port=4321", "--servidor=otro"]),
        ).toThrow(/--servidor/);
    });
});

/*
 * EL MANEJADOR, con dobles de `serve-handler` y `compression`. Es la pieza que
 * reproduce la regla 404 de producción (que solo actúa cuando el fichero no
 * existe) y hasta el 2026-09-10 no la cubría ningún
 * test (aviso de la revisión de P3b-1): una regresión en la delegación
 * —índices de los argumentos de `sendError`, el `public` del destino, o la
 * llamada sin métodos del caso normal— pasaba el gate en verde.
 *
 * El doble del handler reproduce lo justo del contrato de `serve-handler`
 * 6.1.7: resuelve la ruta contra `config.public` (con `.html` implícito); si
 * existe responde 200; si no, llama a `methods.sendError` con la firma real
 * `(absolutePath, response, acceptsJSON, current, handlers, config, spec)` o,
 * sin métodos, sirve `${current}/404.html` con estado 404. El build es real,
 * en una carpeta temporal, porque `creaManejador` comprueba en disco que el
 * destino de la regla existe.
 */
describe("creaManejador delega en serve-handler como la regla 404 de producción", () => {
    const reglas = [{ from: "/en/*", to: "/en/404.html" }];
    const carpetas = [];

    afterEach(() => {
        for (const carpeta of carpetas.splice(0)) {
            rmSync(carpeta, { recursive: true, force: true });
        }
    });

    function buildMinimo({ con404Inglesa = true } = {}) {
        const raiz = mkdtempSync(path.join(os.tmpdir(), "serve-measure-"));
        carpetas.push(raiz);
        mkdirSync(path.join(raiz, "en"));
        writeFileSync(path.join(raiz, "404.html"), "404 raiz es");
        writeFileSync(path.join(raiz, "en", "privacy.html"), "privacy en");
        if (con404Inglesa) {
            writeFileSync(path.join(raiz, "en", "404.html"), "404 en");
        }
        return raiz;
    }

    function dobles() {
        const orden = [];
        const llamadas = [];
        const compression = () => (request, response, next) => {
            orden.push("compression");
            next();
        };
        const handler = async (request, response, config, methods) => {
            orden.push("handler");
            llamadas.push({ url: request.url, config, methods });
            const current = path.resolve(config.public);
            const relativa = new URL(request.url, "http://x").pathname;
            const absoluta = path.join(current, relativa);
            if (existsSync(`${absoluta}.html`)) {
                response.statusCode = 200;
                response.end(readFileSync(`${absoluta}.html`, "utf8"));
                return;
            }
            const spec = {
                statusCode: 404,
                code: "not_found",
                message: "The requested path could not be found",
            };
            if (methods?.sendError) {
                await methods.sendError(
                    absoluta,
                    response,
                    false,
                    current,
                    {},
                    config,
                    spec,
                );
                return;
            }
            response.statusCode = 404;
            response.end(readFileSync(path.join(current, "404.html"), "utf8"));
        };
        return { orden, llamadas, compression, handler };
    }

    async function pide(url, { raiz }) {
        const { orden, llamadas, compression, handler } = dobles();
        const config = { public: raiz, etag: true, symlinks: undefined };
        const manejador = creaManejador({
            handler,
            compression,
            config,
            reglas,
        });
        const response = {
            statusCode: 0,
            cuerpo: null,
            end(cuerpo) {
                this.cuerpo = cuerpo;
            },
        };
        await manejador({ url, headers: {} }, response);
        return { orden, llamadas, config, response };
    }

    it("una ruta sin regla llama al handler una vez, SIN métodos y con la configuración de serve", async () => {
        const raiz = buildMinimo();
        const { orden, llamadas, config, response } = await pide("/no-existe", {
            raiz,
        });

        expect(
            orden,
            "la compresión va antes que el handler, como en serve",
        ).toEqual(["compression", "handler"]);
        expect(llamadas).toHaveLength(1);
        expect(
            llamadas[0].methods,
            "fuera de las reglas el handler se llama como lo llama el CLI de serve: sin cuarto argumento",
        ).toBeUndefined();
        expect(llamadas[0].config).toBe(config);
        expect(response.statusCode).toBe(404);
        expect(response.cuerpo).toBe("404 raiz es");
    });

    it("una ruta inexistente bajo /en/ delega con public en el directorio del destino y acaba en 404 con out/en/404.html", async () => {
        const raiz = buildMinimo();
        const { llamadas, response } = await pide("/en/no-existe", { raiz });

        expect(llamadas).toHaveLength(2);
        expect(llamadas[0].url).toBe("/en/no-existe");
        expect(typeof llamadas[0].methods?.sendError).toBe("function");
        expect(
            llamadas[1].config,
            "la segunda llamada tiene la raíz en el directorio del destino y el resto de la configuración de serve",
        ).toEqual({
            public: path.join(raiz, "en"),
            etag: true,
            symlinks: undefined,
        });
        expect(llamadas[1].methods).toBeUndefined();
        expect(
            llamadas[1].url,
            "la segunda petición pide un camino que no existe, para que serve-handler sirva su propia 404",
        ).toMatch(/^\/[0-9a-f-]{36}$/);
        expect(response.statusCode).toBe(404);
        expect(response.cuerpo).toBe("404 en");
    });

    it("una ruta que existe bajo /en/ no pasa por el sendError propio", async () => {
        const raiz = buildMinimo();
        const { llamadas, response } = await pide("/en/privacy", { raiz });

        expect(
            llamadas,
            "el sendError propio siempre vuelve a llamar al handler: una sola llamada prueba que no se usó",
        ).toHaveLength(1);
        expect(response.statusCode).toBe(200);
        expect(response.cuerpo).toBe("privacy en");
    });

    it("sin el destino en el build, la 404 bajo /en/ se queda con la de serve", async () => {
        const raiz = buildMinimo({ con404Inglesa: false });
        const { llamadas, config, response } = await pide("/en/no-existe", {
            raiz,
        });

        expect(llamadas).toHaveLength(2);
        expect(llamadas[1].config).toBe(config);
        expect(llamadas[1].methods).toBeUndefined();
        expect(response.statusCode).toBe(404);
        expect(response.cuerpo).toBe("404 raiz es");
    });
});
