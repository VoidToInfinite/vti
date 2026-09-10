/**
 * @vitest-environment node
 *
 * Entorno de Node, como `serve-watchdog.test.mjs`: se leen ficheros del repo y
 * se ejercita un manejador HTTP sin DOM de por medio.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
    NETLIFY_POR_DEFECTO,
    caeBajo,
    configuracionComoServe,
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
 * vea la 404 inglesa que Netlify sirve bajo `/en/` y, fuera de eso, sea `serve`
 * byte a byte. Aquí se atan las dos mitades que se pueden atar sin red: que
 * las reglas salen de `netlify.toml` y no de una copia, y la decisión de
 * `sendError`. La equivalencia con `serve` sobre un build se mide aparte.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("las reglas 404 salen de netlify.toml", () => {
    it("el netlify.toml real declara la 404 inglesa, y es la única regla 404", () => {
        const reglas = reglasDe404(readFileSync(NETLIFY_POR_DEFECTO, "utf8"));
        expect(reglas).toEqual([
            { from: "/en/*", to: "/en/404.html", force: false },
        ]);
    });

    it("lee netlify.toml de la raíz del repo", () => {
        expect(NETLIFY_POR_DEFECTO).toBe(path.join(ROOT, "netlify.toml"));
    });

    it("ignora las 301, los comentarios y los bloques que no son redirects", () => {
        const texto = [
            "# [[redirects]]",
            '#   from = "/x/*"',
            '#   to = "/x/404.html"',
            "#   status = 404",
            "[[redirects]]",
            '  from = "/terminos"',
            '  to = "/aviso-legal"',
            "  status = 301",
            "[[headers]]",
            '  for = "/*"',
        ].join("\n");
        expect(reglasDe404(texto)).toEqual([]);
    });

    it("falla ante una regla 404 que no sabe reproducir, en vez de medir otra cosa", () => {
        const texto = [
            "[[redirects]]",
            '  from = "/en/*"',
            '  to = "/en/perdido.html"',
            "  status = 404",
        ].join("\n");
        expect(() => reglasDe404(texto)).toThrow(/404\.html/);
    });
});

describe("la decisión de sendError", () => {
    const reglas = [{ from: "/en/*", to: "/en/404.html", force: false }];
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

describe("el vigilante sigue lanzando serve por defecto", () => {
    it("sin --servidor, el hijo es serve con los argumentos de siempre", () => {
        const opciones = parseArgs(["--dir=out", "--port=4321"]);
        expect(opciones.servidor).toBe("serve");
        expect(SERVIDOR_POR_DEFECTO).toBe("serve");
        expect(
            argumentosDelServidor({
                serveMain: "C:/x/serve/build/main.js",
                dir: "C:/y/out",
                port: 4321,
            }),
        ).toEqual([
            "C:/x/serve/build/main.js",
            "C:/y/out",
            "-l",
            "4321",
            "--no-clipboard",
        ]);
    });

    it("con --servidor=medicion lanza serve-measure con la misma entrada de serve", () => {
        const opciones = parseArgs([
            "--dir=out",
            "--port=4321",
            "--servidor=medicion",
        ]);
        expect(opciones.servidor).toBe("medicion");
        expect(
            argumentosDelServidor({
                serveMain: "C:/x/serve/build/main.js",
                dir: "C:/y/out",
                port: 4321,
                servidor: "medicion",
            }),
        ).toEqual([
            SERVE_MEASURE,
            "--dir=C:/y/out",
            "--port=4321",
            "--serve-main=C:/x/serve/build/main.js",
        ]);
    });

    it("rechaza un servidor desconocido", () => {
        expect(() =>
            parseArgs(["--dir=out", "--port=4321", "--servidor=otro"]),
        ).toThrow(/--servidor/);
    });
});
