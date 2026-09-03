import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
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
