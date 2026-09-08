import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    ALLOWLIST,
    FAMILIES,
    FAMILY_GUIDANCE,
} from "./detect-anti-patterns.mjs";

/**
 * Primer test del detector (critica externa #17, 2026-09-03). El script vivio
 * desde la Task 24 sin ninguno: se validaba a mano, rompiendo el codigo real
 * de forma reversible y mirando si el gate se ponia rojo. Este fichero cubre
 * SOLO la familia que esta entrega anade -- `color-literal` -- mas la guarda
 * de entrada que la hizo importable, siguiendo la politica de testing del
 * repo (seccion 6 de CLAUDE.md: solo se testea lo que la tarea toca).
 *
 * Se ejercita la familia LINEA A LINEA, que es como funciona el motor, en vez
 * de escanear el repo: un test que dependiera del contenido de `src/` medira
 * el repo de hoy, no la regla. Los casos de abajo son literales REALES del
 * corpus (con su fichero anotado) mas los falsos positivos que el diseno de
 * la familia descarta a proposito.
 */
const familia = FAMILIES.find((f) => f.id === "color-literal");

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(AQUI, "detect-anti-patterns.mjs");

describe("familia color-literal: que cuenta como color escrito a mano", () => {
    it("la familia existe, se salta la carpeta de tokens y tiene guia propia", () => {
        expect(familia).toBeDefined();
        // Ahi el literal ES la definicion del sistema, no una copia suelta.
        expect(familia.appliesTo("src/theme/tokens/color.ts")).toBe(false);
        expect(familia.appliesTo("src/theme/tokens/glass.ts")).toBe(false);
        // Cualquier otro fichero si se mira, `app/` incluido.
        expect(familia.appliesTo("src/components/sections/Hero/Hero.tsx")).toBe(
            true,
        );
        expect(familia.appliesTo("src/theme/resolveTheme.ts")).toBe(true);
        expect(familia.appliesTo("app/opengraph-image.tsx")).toBe(true);
        // Sin guia, el mensaje de fallo mandaria al lector a la regla
        // equivocada (la 48, que es de movimiento).
        expect(FAMILY_GUIDANCE["color-literal"]).toMatch(/regla 17/);
    });

    it.each([
        // oklch con alfa -- journey.layers.ts
        [
            'const DISC_GLOW_PRIMARY = "oklch(0.6 0.12 260 / 0.14)";',
            "oklch(0.6 0.12 260 / 0.14)",
        ],
        // oklch sin alfa -- sectionBeam.layers.ts
        [
            'export const BEAM_CORE = "oklch(0.85 0.13 311.928)";',
            "oklch(0.85 0.13 311.928)",
        ],
        // La forma con el triplete entrecomillado -- Wormhole.tsx
        ['color: ${oklch("0.985 0 0", 1)};', 'oklch("0.985 0 0", 1)'],
        // rgba -- contact.layers.ts
        [
            'export const CONTACT_PANEL_BG_LIGHT = "rgba(255, 255, 255, 0.82)";',
            "rgba(255, 255, 255, 0.82)",
        ],
        // Hexadecimal de 6 -- los cuatro voids de escena
        ['export const CONTACT_GUARDIAN_VOID = "#0d0416";', "#0d0416"],
        // Hexadecimal de 3 -- las mascaras de aura.parts.tsx
        ["#fff 8%,", "#fff"],
        // Hexadecimal de 8 (con alfa dentro) -- journey.layers.ts
        ['"linear-gradient(135deg, #FFEBFDEB, #E3F6FFEB)";', "#FFEBFDEB"],
        // Notaciones que el repo no usa hoy, cubiertas por el mismo motivo
        // por el que duration-literal acepta `ms` y `s`.
        ["background: hsl(200 50% 40%);", "hsl(200 50% 40%)"],
        ["background: lab(52.2% 40.1 59.9);", "lab(52.2% 40.1 59.9)"],
    ])("dispara sobre %s", (linea, esperado) => {
        expect(familia.test(linea)).toBe(esperado);
    });

    it.each([
        // El falso positivo REAL del corpus: el ayudante JS homonimo de
        // Wormhole.tsx, que recibe constantes con nombre. El color no esta en
        // la linea, esta en la constante -- limite declarado de la familia.
        ["${oklch(RING_1, 0.4)},"],
        ["border-color: ${oklch(RING_2, 0.45)};"],
        // Un triplete suelto tampoco se ve (misma frontera, otro lado).
        ['const RING_1 = "0.66 0.142 235.851";'],
        // Anclas de fragmento: ningun `#` de navegacion del repo llega a tres
        // digitos hexadecimales seguidos hasta su frontera de palabra.
        ['<a href="#contacto">'],
        ['href="#journey"'],
        ['href="#story"'],
        // Color que SI sale del sistema.
        ["color: ${({ theme }) => theme.data.semantic.text};"],
        ["background: ${({ theme }) => theme.data.palette.primary[600]};"],
        // Una linea de movimiento no es una linea de color.
        ["transition: opacity 320ms ease-out;"],
        // Palabras clave: fuera a proposito (ausencia de color o herencia).
        ["background: transparent;"],
        ["fill: currentColor;"],
    ])("NO dispara sobre %s", (linea) => {
        expect(familia.test(linea)).toBeNull();
    });

    it("cada excepcion sancionada de la familia lleva su motivo escrito", () => {
        // La condicion que el propio script exige para sancionar algo. Un
        // allowlist con anclas y sin porque es una lista de silencios.
        const entradas = ALLOWLIST.filter((e) => e.family === "color-literal");
        expect(entradas.length).toBeGreaterThan(0);
        for (const entrada of entradas) {
            expect(entrada.anchors.length).toBeGreaterThan(0);
            expect(entrada.reason.length).toBeGreaterThan(80);
        }
    });
});

/**
 * Familia `spacing-literal` (critica externa #18, 2026-09-04). Es la tercera
 * magnitud de la regla 17 de RULES.md -- "Cero colores, espaciados o radios
 * literales fuera de `src/theme/tokens/`" -- y la unica que el detector no
 * implementaba pese a prometerla en su cabecera.
 *
 * Se ejercita LINEA A LINEA, que es como funciona el motor, y no escaneando
 * el repo: un test que dependiera del contenido de `src/` mediria el repo de
 * hoy, no la regla -- y ademas los diez hallazgos del censo estan sancionados
 * en el allowlist, asi que un escaneo daria verde diga lo que diga la familia.
 * Los casos de abajo son lineas REALES del corpus (con su fichero anotado)
 * mas los falsos positivos que el diseno de la familia descarta a proposito.
 */
const espaciado = FAMILIES.find((f) => f.id === "spacing-literal");

describe("familia spacing-literal: que cuenta como espaciado escrito a mano", () => {
    it("la familia existe, se salta la carpeta de tokens y tiene guia propia", () => {
        expect(espaciado).toBeDefined();
        // Ahi el literal ES la definicion de la escala, no una copia suelta.
        expect(espaciado.appliesTo("src/theme/tokens/space.ts")).toBe(false);
        // Cualquier otro fichero si se mira, `app/` incluido.
        expect(espaciado.appliesTo("src/theme/GlobalStyles.tsx")).toBe(true);
        expect(espaciado.appliesTo("app/opengraph-image.tsx")).toBe(true);
        // Sin guia, el mensaje de fallo mandaria al lector a la regla
        // equivocada (la 48, que es de movimiento; esta es de la 17).
        expect(FAMILY_GUIDANCE["spacing-literal"]).toMatch(/regla 17/);
    });

    it.each([
        // EL HALLAZGO que abrio la familia: `0.5rem` es space[2] byte a byte,
        // y era invisible para siempre -- GlobalStyles.tsx:93.
        ["--nav-gap: 0.5rem;", "0.5rem"],
        // Los suelos de clamp() que el evaluador de artesania midio. El tope
        // ya lee el token y el suelo se escribe a mano: Contact.tsx:706 y
        // Features.tsx:1257 son la MISMA linea byte a byte.
        [
            "padding-block: clamp(1rem, 3.5dvh, ${({ theme }) => theme.data.space[8]});",
            "1rem",
        ],
        [
            "gap: clamp(0.75rem, 2vw, ${({ theme }) => theme.data.space[4]});",
            "0.75rem",
        ],
        [
            "gap: clamp(0.5rem, 1.5vw, ${({ theme }) => theme.data.space[3]});",
            "0.5rem",
        ],
        // El cero de una shorthand NO esconde el literal que viene detras
        // (mismo recorrido de todas las coincidencias que duration-literal)
        // -- legalPage.parts.tsx:426.
        ["padding: 0 0.25em;", "0.25em"],
        // Un negativo es una decision de espaciado como cualquier otra
        // -- VisuallyHidden.tsx:40.
        ["margin: -1px;", "1px"],
        // Objeto de estilo JS: la forma con guion y la camelCase, las dos
        // -- opengraph-image.tsx:76 y :88.
        ['padding: "80px",', "80px"],
        ['marginRight: "28px",', "28px"],
        // Variantes de guion que el repo no escribe hoy, cubiertas por el
        // mismo motivo por el que duration-literal acepta `ms` y `s`.
        ["row-gap: 12px;", "12px"],
        ["padding-inline-start: 2rem;", "2rem"],
        // Este caso fija las DOS mitades del recorrido a la vez: el cero CON
        // unidad se exime y aun asi no esconde el literal que viene detras.
        // Si la familia devolviera en el primer match, aqui daria "0px".
        ["padding: 0px 1.5rem;", "1.5rem"],
    ])("dispara sobre %s", (linea, esperado) => {
        expect(espaciado.test(linea)).toBe(esperado);
    });

    it.each([
        // El cero es la ausencia de separacion, no una separacion elegida
        // (precedente de radius-literal).
        ["padding: 0;"],
        ["margin: 0 auto;"],
        // El cero CON unidad tampoco: es la misma ausencia escrita de otra
        // forma, y es el unico que llega a probar la exencion (un `0` pelado
        // no lleva unidad y la regex ni lo mira).
        ["padding: 0rem;"],
        ["gap: 0px;"],
        // Espaciado que SI sale del sistema.
        ["gap: ${({ theme }) => theme.data.space[4]};"],
        [
            "padding-block: clamp(${({ theme }) => theme.data.space[2]}, 2vh, ${({ theme }) => theme.data.space[5]});",
        ],
        // EL falso positivo que mas facil se cuela: `letter-spacing` y
        // `word-spacing` llevan la palabra "spacing" y NO son espaciado de
        // composicion. Ninguna de las tres propiedades vigiladas aparece.
        ["letter-spacing: 0.02em;"],
        ["word-spacing: 0.1em;"],
        // Limite declarado: medidas de LAYOUT que no son espaciado. Esta
        // vive tres lineas por encima del hallazgo, en el mismo fichero.
        ["--nav-height: 3.5rem;"],
        ["min-height: 100dvh;"],
        // Otra familia, otra magnitud.
        ["border-radius: 0.75rem;"],
        // Limite declarado: porcentajes y unidades de viewport no tienen
        // peldano de la escala al que migrar.
        ["gap: 2vw;"],
        ["padding: 0 5%;"],
        // Una linea de movimiento no es una linea de espaciado, aunque
        // nombre la propiedad que anima.
        ["transition: gap 200ms;"],
    ])("NO dispara sobre %s", (linea) => {
        expect(espaciado.test(linea)).toBeNull();
    });

    it("cada excepcion sancionada de la familia lleva su motivo escrito", () => {
        // La condicion que el propio script exige para sancionar algo. Un
        // allowlist con anclas y sin porque es una lista de silencios.
        const entradas = ALLOWLIST.filter(
            (e) => e.family === "spacing-literal",
        );
        expect(entradas.length).toBeGreaterThan(0);
        for (const entrada of entradas) {
            expect(entrada.anchors.length).toBeGreaterThan(0);
            expect(entrada.reason.length).toBeGreaterThan(80);
        }
    });
});

/**
 * Familia `radius-literal`: el punto ciego de los PORCENTAJES, cerrado en la
 * misma revision (critica externa #18). Su alternacion de unidades era
 * `px|rem|em`, asi que `border-radius: 50%` era invisible -- y ese limite, al
 * reves que los de otras cuatro familias, no estaba declarado en ninguna
 * parte. Este bloque fija las dos mitades: que el porcentaje dispara, y que
 * cerrar el hueco no rompio nada de lo que la familia ya cazaba ni eximia.
 */
const radios = FAMILIES.find((f) => f.id === "radius-literal");

describe("familia radius-literal: el porcentaje deja de ser invisible", () => {
    it.each([
        // El hallazgo: un circulo escrito a mano donde el resto del repo
        // escribe radius.full -- Footer.tsx:184 (ScStar).
        ["border-radius: 50%;", "border-radius: 50%"],
        // Forma organica de ocho valores del morfeo de la corona de Sol.tsx:
        // ningun peldano uniforme puede expresarla, pero ahora se VE.
        [
            "border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;",
            "border-radius: 46%",
        ],
        // Lo que la familia ya cazaba antes de tocarla, intacto.
        ["border-radius: 3px;", "border-radius: 3px"],
        ["border-radius: 1.5rem;", "border-radius: 1.5rem"],
    ])("dispara sobre %s", (linea, esperado) => {
        expect(radios.test(linea)).toBe(esperado);
    });

    it.each([
        // El cero se exime en las CUATRO unidades: la ausencia de radio no es
        // un radio elegido. El `0%` es el caso nuevo.
        ["border-radius: 0;"],
        ["border-radius: 0%;"],
        ["border-radius: 0px;"],
        // Radio que SI sale del sistema.
        ["border-radius: ${({ theme }) => theme.data.radius.full};"],
        // Heredar no es elegir (no lleva unidad, no llega a probarse).
        ["border-radius: inherit;"],
        // Limites DECLARADOS en el comentario de la familia, fijados aqui
        // para que nadie los lea como cobertura: la forma camelCase de un
        // objeto de estilo JS y el calc() multilinea.
        ['borderRadius: "8px",'],
        ["border-radius: calc("],
        // Otra propiedad con porcentaje: no es un radio.
        ["width: 92%;"],
    ])("NO dispara sobre %s", (linea) => {
        expect(radios.test(linea)).toBeNull();
    });
});

/**
 * FAMILIA `focus-sin-preventscroll` (critica externa #21, ola U, 2026-09-08).
 *
 * Se ejercita con el FICHERO ENTERO y no linea a linea, al reves que sus
 * hermanas, porque la familia no puede decidir con la linea sola: lo que la
 * dispara es que en el MISMO fichero convivan un desplazamiento programatico y
 * un `focus()` sin el flag. El motor le pasa `{ lines, index }` --la misma
 * ventana de contexto que ya usaba `delay-const`-- y estos casos entran por esa
 * puerta, que es la real.
 *
 * El caso D es el que justifica la granularidad de FICHERO: reproduce la forma
 * exacta del defecto de `BackToTop.tsx`, donde el `focus()` vive en un ayudante
 * propio y el `scrollTo` en el manejador que lo llama. Un analisis por ambito
 * lexico --el que el nombre de la familia sugiere-- lo dejaria pasar.
 *
 * Los seis casos se validaron ademas contra el motor completo, inyectando en
 * `src/` seis ficheros con este mismo contenido y borrandolos en la misma orden:
 * dispararon A, D y las dos formas de F (cuatro hallazgos) y callaron B, C y E,
 * junto al hallazgo real de `BackToTop.tsx:164` que motivo la familia.
 */
const foco = FAMILIES.find((f) => f.id === "focus-sin-preventscroll");

/** Ejercita la familia sobre un fichero completo, como hace el motor. */
function hallazgosDeFoco(fuente) {
    const lines = fuente.split("\n");
    return lines
        .map((line, index) => foco.test(line, { lines, index }))
        .filter((s) => s !== null);
}

describe("familia focus-sin-preventscroll: desplazar y mover el foco a la vez", () => {
    it("la familia existe y su guia manda al flag, no a la regla de movimiento", () => {
        expect(foco).toBeDefined();
        expect(FAMILY_GUIDANCE["focus-sin-preventscroll"]).toMatch(
            /preventScroll: true/,
        );
    });

    it.each([
        [
            "A: desplaza y enfoca en el mismo ambito",
            'window.scrollTo({ top: 0, behavior: "smooth" });\ndocument.getElementById("main")?.focus();',
            ["?.focus()"],
        ],
        [
            "D: el focus() detras de una indireccion (la forma de BackToTop)",
            'function mueveElFoco() {\n  document.getElementById("main")?.focus();\n}\nfunction alPulsar() {\n  window.scrollTo({ top: 0, behavior: "smooth" });\n  mueveElFoco();\n}',
            ["?.focus()"],
        ],
        [
            "F: scrollIntoView y scrollBy tambien cuentan como desplazar",
            'destino.scrollIntoView({ block: "start" });\notro.focus();\nwindow.scrollBy({ top: -200 });\ntercero.focus();',
            [".focus()", ".focus()"],
        ],
    ])("dispara sobre %s", (_nombre, fuente, esperado) => {
        expect(hallazgosDeFoco(fuente)).toEqual(esperado);
    });

    it.each([
        [
            "B: el mismo caso A con el flag puesto",
            'window.scrollTo({ top: 0, behavior: "smooth" });\ndocument.getElementById("main")?.focus({ preventScroll: true });',
        ],
        [
            "B bis: la llamada partida en varias lineas por el formateador",
            'window.scrollTo({ top: 0, behavior: "smooth" });\ndocument.getElementById("main")?.focus({\n  preventScroll: true,\n});',
        ],
        [
            "C: mueve el foco pero el fichero no desplaza nada",
            'document.getElementById("main")?.focus();\nprimeraFila.focus();',
        ],
        [
            "E: limite declarado -- scrollTop mueve un panel, no el documento",
            "areaDeScroll.scrollTop = 0;\nfila.focus();",
        ],
    ])("NO dispara sobre %s", (_nombre, fuente) => {
        expect(hallazgosDeFoco(fuente)).toEqual([]);
    });
});

/**
 * La guarda de entrada (`invocadoComoPrograma`) es lo que permite importar el
 * script desde este fichero sin que escanee el repo ni toque el
 * `process.exitCode` de Vitest. Su modo de fallo peligroso es el contrario:
 * si se rompiera, el gate pasaria en verde SIN escanear nada y en silencio.
 *
 * Este test no repite el gate -- no exige que el repo este limpio, que es
 * asunto de `pnpm run ci` y cambia con lo que hagan otras entregas -- sino
 * que el script INVOCADO COMO PROGRAMA hace su trabajo: o informa de cuantos
 * ficheros escaneo, o informa de hallazgos sin sancionar.
 */
describe("guarda de entrada: importar no escanea, invocar si", () => {
    it("invocado como programa, escanea y lo dice", () => {
        const res = spawnSync(process.execPath, [SCRIPT], {
            encoding: "utf8",
        });

        expect(res.error).toBeUndefined();
        const salida = `${res.stdout}${res.stderr}`;
        expect(salida).toMatch(
            /ficheros escaneados|Anti-patrones sin sancionar/,
        );
    });
});

/**
 * REGISTRO DE FAMILIAS EN RULES.md (critica externa #17, 2026-09-03).
 *
 * La regla 48 enumera las familias que este script vigila, y cada ola que
 * anadio una la nombro ahi POR SU ID con la critica que la motivo --
 * `easing-literal` (#8), `easing-keyword` (#9), `duration-literal` (#13),
 * `duration-const` (#14), `font-size-literal` y `z-index-literal` (#15). Dos
 * se saltaron esa convencion: `delay-const` (anadida por la #16) y
 * `color-literal` (anadida en esta misma ola), que no aparecian ni una vez en
 * RULES.md. El efecto no es cosmetico: quien lee la regla para saber que
 * vigila el gate se lleva una lista incompleta, y quien recibe el fallo de una
 * familia no registrada no tiene donde leer su porque.
 *
 * El candado afirma el CONJUNTO EXACTO de familias que RULES.md NO nombra por
 * su id, no un minimo: las cinco fundacionales, que la regla describe por su
 * comportamiento en prosa (`transition: all`, degradados repetidos, texto con
 * degradado recortado, franja lateral, numeraciones repetidas) desde antes de
 * que existiera la convencion de nombrarlas. Escrito como conjunto exacto y no
 * como "todas menos estas cinco al menos" por el mismo motivo que el censo de
 * `system.test.ts`: si alguien registra una de las cinco en prosa Y por id, el
 * test lo dice en vez de callarse, y la lista de excepciones no puede crecer
 * en silencio.
 */
describe("registro de familias en RULES.md (regla 48)", () => {
    const RULES = readFileSync(path.join(AQUI, "..", "RULES.md"), "utf8");

    /** Las que RULES.md describe en prosa, sin escribir su id, por ser
     *  anteriores a la convencion. Cualquier otra ausencia es un olvido. */
    const FUNDACIONALES = [
        "gradient-text",
        "numbering",
        "repeating-gradient",
        "side-stripe",
        "transition-all",
    ];

    it("toda familia anadida por una ola aparece nombrada por su id", () => {
        const ausentes = FAMILIES.map((f) => f.id)
            .filter((id) => !RULES.includes(id))
            .sort();

        expect(
            ausentes,
            "familia del detector que RULES.md no registra por su id",
        ).toEqual(FUNDACIONALES);
    });
});
