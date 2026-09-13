/**
 * @vitest-environment node
 *
 * Entorno de Node, como `serve-measure.test.mjs`: este fichero importa el
 * lector de ese servidor, y bajo jsdom el `URL` global es el de jsdom, que
 * `fileURLToPath` rechaza («The URL must be of scheme file»).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { ROUTES } from "../src/config/site.ts";
import { reglasDe404 } from "./serve-measure.mjs";

/*
 * ESTE FICHERO ATA DOS COSAS QUE VIVEN EN CONFIGURACIÓN QUE NADA COMPILA: QUE
 * EL CENSO DEL BUNDLE SE COMPARE CONTRA EL ARTEFACTO REAL, Y QUE PRODUCCIÓN
 * CONSERVE LAS REGLAS DE SERVIDOR QUE EL SITIO NECESITA.
 *
 * 1. EL CENSO CONTRA EL ARTEFACTO (2026-09-05). `scripts/measure-home-js.mjs`
 * vigila nueve candados, y los tres que corren sin build se satisfacen editando
 * `scripts/home-js-baseline.<plataforma>.json` y recalculando el sello con la
 * propia función que lo calcula, que es pura sobre ese JSON. Un recorte
 * coordinado del censo pasaba `pnpm run ci` en verde. El arreglo es de
 * pipeline: `.github/workflows/ci.yml` construye y mide detrás del gate
 * (`pnpm run ci`, `pnpm build`, `pnpm measure:js`, tres pasos `run:` en ese
 * orden). Aquí se ata la CONDICIÓN, no el texto: los tres comandos, en ese
 * orden, sin el sellador `--update-baseline` en ningún sitio, y con los tres
 * TECLEADOS fuera de cualquier bucle más un suelo numérico, porque un candado
 * que itera una lista sale verde cuando la lista encoge (frente J, 2026-09-05:
 * el recorte simétrico de tres ficheros dejó ocho casos en verde).
 *
 * 2. LA MUDANZA A VERCEL (2026-09-13). Producción se sirve desde Vercel: la API
 * de GitHub registra el despliegue `Production` de `vercel[bot]` sobre
 * `5f85c7d` a las 10:50 UTC de ese día, y las respuestas llevan
 * `Server: Vercel`. Hasta esa fecha este fichero ataba `netlify.toml`, que
 * producción no leía: medido con curl ese mismo día, `/terminos` y
 * `/accesibilidad` respondían 404 en vez de 301, `/opengraph-image` salía como
 * `application/octet-stream`, los `.webp` con `max-age=0` y `/en/no-existe`
 * con la 404 castellana. Decisión del dueño: Vercel es el hosting definitivo,
 * las reglas se portan a `vercel.json` y `netlify.toml` se retira.
 *
 * QUÉ CAMBIÓ DEL GATE DE DESPLIEGUE, y por qué ya no se ata aquí. `netlify.toml`
 * encadenaba `pnpm run ci && pnpm build && pnpm measure:js` y este fichero lo
 * ataba. Vercel construye con su comando por defecto y, por decisión del dueño,
 * el gate antes de publicar lo ponen las Deployment Checks del panel de Vercel
 * (retienen el despliegue de producción hasta que el check `ci` de GitHub pase,
 * https://vercel.com/docs/deployment-checks), no un `buildCommand`. El motivo:
 * el censo linux se selló en Ubuntu con Node 22 (cabecera de `ci.yml`) y Vercel
 * construye en Amazon Linux 2023 con otro Node y otro pnpm, así que medirlo allí
 * arriesgaba bloquear todos los despliegues por una diferencia de compilador.
 * Esa comprobación vive en un panel que el repo no puede leer: está declarada
 * en `CLAUDE.md` §2, y lo que sí se ata aquí es que ningún `buildCommand` del
 * repo ejecute el sellador.
 *
 * LO QUE NO SE PORTA, medido: `/_next/static/*` ya sale de Vercel con
 * `public,max-age=31536000,immutable` sin regla propia.
 *
 * LO QUE NINGÚN TEST PUEDE VER: cómo interpreta Vercel de verdad estas reglas
 * con el preset de Next.js. `routes` es la vía legacy, y la documentación
 * vigente dice que convive con `redirects` y `headers`
 * (https://vercel.com/docs/project-configuration/vercel-json#routes), pero eso
 * se comprueba contra un despliegue, con curl o con el navegador, no aquí.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CI_PATH = path.join(ROOT, ".github", "workflows", "ci.yml");
const VERCEL_PATH = path.join(ROOT, "vercel.json");
const NETLIFY_PATH = path.join(ROOT, "netlify.toml");
const PACKAGE_PATH = path.join(ROOT, "package.json");

/**
 * Los tres comandos de la secuencia, TECLEADOS uno a uno y con nombre propio:
 * un recorte de `SECUENCIA` tiene que borrar además una constante con nombre y
 * una aserción escrita a mano, que se ve en el diff.
 */
const GATE = "pnpm run ci";
const BUILD = "pnpm build";
const CENSO = "pnpm measure:js";

/** El suelo numérico de la secuencia: solo sube. */
const MINIMO_ESLABONES = 3;

/** La secuencia que CI ejecuta, en este orden. */
const SECUENCIA = [GATE, BUILD, CENSO];

/** El instrumento en modo veredicto: mide y falla, no resella. */
const MEASURE_JS = "node scripts/measure-home-js.mjs";

/** La bandera que convertiría la medición en un sellador que siempre sale 0. */
const SELLADOR = "--update-baseline";

const CI_TEXT = readFileSync(CI_PATH, "utf8");
const VERCEL_TEXT = readFileSync(VERCEL_PATH, "utf8");
const PACKAGE_TEXT = readFileSync(PACKAGE_PATH, "utf8");
const VERCEL = JSON.parse(VERCEL_TEXT);

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

/** Los comandos que `vercel.json` le hace ejecutar a Vercel, si declara alguno. */
function comandosDeVercel(config) {
    return ["buildCommand", "installCommand"]
        .map((clave) => config[clave])
        .filter((valor) => typeof valor === "string");
}

describe("el censo del bundle se compara contra el artefacto real", () => {
    it("la secuencia no puede ENCOGER: los tres comandos, tecleados, siguen en CI", () => {
        const pasos = pasosDeWorkflow(CI_TEXT);

        expect(
            pasos,
            `el workflow de CI no ejecuta \`${GATE}\`: sin el gate, CI daría por ` +
                `bueno código que no pasa typecheck, lint, formato, anti-patrones ni ` +
                `tests, y las Deployment Checks de Vercel promoverían a producción ` +
                `sobre ese verde. Pasos reales: ${pasos.join(" | ")}`,
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
            SECUENCIA.length,
            `la secuencia bajó de ${MINIMO_ESLABONES} eslabones: este número solo ` +
                `sube, y recortar la lista es justo la supresión que los casos que ` +
                `la recorren no ven`,
        ).toBeGreaterThanOrEqual(MINIMO_ESLABONES);
    });

    it("el workflow de CI construye y mide DESPUÉS del gate, en tres pasos y en ese orden", () => {
        const pasos = pasosDeWorkflow(CI_TEXT);
        for (const comando of SECUENCIA) {
            expect(
                pasos,
                `el workflow de CI no ejecuta \`${comando}\`. Pasos reales: ` +
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

    it("el script `measure:js` mide y falla, no resella", () => {
        const paquete = JSON.parse(PACKAGE_TEXT);
        expect(
            paquete.scripts?.["measure:js"],
            `el script \`measure:js\` tiene que ser exactamente \`${MEASURE_JS}\`: en ` +
                `modo veredicto sale con código 1 si el censo no cuadra, y con ` +
                `\`${SELLADOR}\` lo reescribiría y saldría 0 siempre`,
        ).toBe(MEASURE_JS);
    });

    it("ni CI ni vercel.json ejecutan el sellador del censo", () => {
        const comandos = [
            ...pasosDeWorkflow(CI_TEXT),
            ...comandosDeVercel(VERCEL),
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
 * LAS DOS URLs RETIRADAS EN LA REVISIÓN LEGAL DEL 2026-08-08. Estuvieron
 * publicadas desde el 2026-08-05, así que un 404 seco deja enlaces rotos. Cada
 * destino se eligió por EQUIVALENCIA, no por comodidad: las cláusulas con
 * sentido de `/terminos` viven ahora en el aviso legal; `/accesibilidad` no
 * tiene equivalente y vuelve a la portada, que es mejor que llevar a un
 * documento que no habla de lo que se buscaba. 301 y no el 308 que Vercel pone
 * con `permanent: true`: es el código que se publicó desde el principio, y
 * Vercel exige `statusCode` para cualquier valor distinto de 307/308
 * (https://vercel.com/docs/project-configuration/vercel-json#redirects).
 */
const REDIRECCIONES_RETIRADAS = [
    { source: "/terminos", destination: ROUTES.legalNotice },
    { source: "/accesibilidad", destination: ROUTES.home },
];

describe("vercel.json redirige las dos URLs retiradas con 301", () => {
    it.each(REDIRECCIONES_RETIRADAS)(
        "$source -> $destination con statusCode 301",
        ({ source, destination }) => {
            const reglas = Array.isArray(VERCEL.redirects)
                ? VERCEL.redirects
                : [];
            const regla = reglas.find((r) => r.source === source);
            expect(
                regla,
                `vercel.json no redirige ${source}: vuelve a ser un 404 seco. ` +
                    `Reglas reales: ${JSON.stringify(reglas)}`,
            ).toBeDefined();
            expect(regla.destination).toBe(destination);
            expect(regla.statusCode).toBe(301);
            expect(
                regla.permanent,
                "Vercel no admite `permanent` junto a `statusCode`",
            ).toBeUndefined();
        },
    );
});

/*
 * LAS DOS CABECERAS QUE PRODUCCIÓN NO PONÍA SOLA (medido el 2026-09-13).
 *
 * - `/opengraph-image`: Next emite la imagen Open Graph SIN extensión y un
 *   servidor de ficheros deduce el tipo de la extensión; en producción salía
 *   `application/octet-stream`, y los rastreadores de Facebook, LinkedIn o X
 *   descartan una vista previa sin `Content-Type` de imagen. Que el fichero ES
 *   un PNG está verificado en el build: firma `89 50 4E 47 0D 0A 1A 0A` y IHDR
 *   de 1200x630.
 * - `.webp`: no llevan hash en el nombre, así que `immutable` mentiría. 30 días
 *   con `stale-while-revalidate` de 7: se sirve la copia al instante y se
 *   revalida en segundo plano. En producción salían con `max-age=0`.
 */
const CABECERAS = [
    {
        source: "/opengraph-image",
        key: "Content-Type",
        value: "image/png",
    },
    {
        source: "/(.*).webp",
        key: "Cache-Control",
        value: "public, max-age=2592000, stale-while-revalidate=604800",
    },
];

describe("vercel.json pone las cabeceras que producción no ponía sola", () => {
    it.each(CABECERAS)(
        "$source lleva $key: $value",
        ({ source, key, value }) => {
            const bloques = Array.isArray(VERCEL.headers) ? VERCEL.headers : [];
            const bloque = bloques.find((b) => b.source === source);
            expect(
                bloque,
                `vercel.json no declara cabeceras para ${source}. Bloques reales: ` +
                    `${JSON.stringify(bloques)}`,
            ).toBeDefined();
            const cabecera = (bloque.headers ?? []).find((h) => h.key === key);
            expect(cabecera?.value).toBe(value);
        },
    );

    it("los .webp no se declaran immutable: su nombre no lleva hash", () => {
        const bloque = (VERCEL.headers ?? []).find(
            (b) => b.source === "/(.*).webp",
        );
        for (const cabecera of bloque?.headers ?? []) {
            expect(cabecera.value).not.toMatch(/immutable/);
        }
    });
});

/*
 * LA 404 INGLESA SIN JAVASCRIPT (2026-09-10, P2 de la crítica externa #21, H9).
 *
 * El arreglo vive en dos mitades que nada compila juntas: la página que hornea
 * `out/en/404.html` (`app/en/404/page.tsx`) y la regla de `vercel.json` que la
 * sirve con estado 404 bajo `/en/`. Ni `redirects` ni `rewrites` pueden
 * responder un 404 con cuerpo propio (una `rewrite` responde 200 y anunciaría
 * una URL rota como página existente), así que va en `routes`, la vía legacy.
 *
 * El ORDEN es la mitad peligrosa: la regla va detrás de
 * `{ "handle": "filesystem" }`. Delante, Vercel la aplicaría antes de mirar si
 * el fichero existe y `/en/privacy` y `/en/legal-notice` responderían la 404.
 * El destino es `/en/404` y no `/en/404.html` porque Vercel sirve el export con
 * URLs limpias: medido el 2026-09-13 en producción, `/en/404` responde 200 con
 * `lang="en"` y `/en/404.html` responde 404.
 *
 * `reglasDe404` es el lector del servidor de medición: se usa aquí para que el
 * candado y el instrumento de las críticas lean `vercel.json` con el MISMO
 * código, y ese lector falla ante una regla 404 delante de `filesystem`.
 */
const EN_NOT_FOUND_ROUTE = { src: "/en/(.*)", status: 404, dest: "/en/404" };
const EN_NOT_FOUND_PAGE = path.join(ROOT, "app", "en", "404", "page.tsx");
const OUT_EN_NOT_FOUND = path.join(ROOT, "out", "en", "404.html");

describe("la 404 inglesa se sirve con estado 404 y sin JavaScript", () => {
    it("vercel.json sirve /en/404 con estado 404 bajo /en/, DETRÁS de la fase filesystem", () => {
        const rutas = Array.isArray(VERCEL.routes) ? VERCEL.routes : [];
        const filesystem = rutas.findIndex((r) => r.handle === "filesystem");
        const indice = rutas.findIndex((r) => r.src === EN_NOT_FOUND_ROUTE.src);

        expect(
            indice,
            `vercel.json no declara la regla de la 404 inglesa (src ` +
                `"${EN_NOT_FOUND_ROUTE.src}"): sin ella \`/en/no-existe\` vuelve a ` +
                `servirse con la 404 castellana. Routes reales: ${JSON.stringify(rutas)}`,
        ).toBeGreaterThanOrEqual(0);
        expect(rutas[indice]).toEqual(EN_NOT_FOUND_ROUTE);
        expect(
            filesystem,
            "sin { handle: filesystem } delante, la regla taparía /en/privacy y " +
                "/en/legal-notice con la 404",
        ).toBeGreaterThanOrEqual(0);
        expect(filesystem).toBeLessThan(indice);
    });

    it("el servidor de medición lee la misma regla", () => {
        expect(reglasDe404(VERCEL_TEXT)).toEqual([
            { from: "/en/*", to: "/en/404.html" },
        ]);
    });

    it("el destino de la regla lo emite una página que existe", () => {
        expect(
            existsSync(EN_NOT_FOUND_PAGE),
            `falta ${EN_NOT_FOUND_PAGE}: la regla de vercel.json apuntaría a un ` +
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
});

describe("los lectores de este candado no se quedan sin filo en silencio", () => {
    it("los ficheros del pipeline existen y tienen contenido", () => {
        for (const [ruta, texto] of [
            [CI_PATH, CI_TEXT],
            [VERCEL_PATH, VERCEL_TEXT],
            [PACKAGE_PATH, PACKAGE_TEXT],
        ]) {
            expect(existsSync(ruta), `falta ${ruta}`).toBe(true);
            expect(
                texto.trim().length,
                `${ruta} está vacío: un candado que lee un fichero vacío no lee nada`,
            ).toBeGreaterThan(0);
        }
    });

    it("netlify.toml no vuelve: producción no lo lee, y un fichero que nadie aplica se lee como si mandara", () => {
        expect(
            existsSync(NETLIFY_PATH),
            "netlify.toml ha vuelto al repo. Producción se sirve desde Vercel " +
                "(ver la cabecera de este fichero): sus reglas no se aplicarían y " +
                "quien lo lea creerá que sí. Si el hosting cambia de verdad, se " +
                "cambia este candado a la vista",
        ).toBe(false);
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

    it("el lector de vercel.json solo cuenta buildCommand e installCommand declarados como texto", () => {
        expect(comandosDeVercel({})).toEqual([]);
        expect(
            comandosDeVercel({
                buildCommand: "pnpm build",
                installCommand: "pnpm install",
                outputDirectory: "out",
            }),
        ).toEqual(["pnpm build", "pnpm install"]);
    });
});
