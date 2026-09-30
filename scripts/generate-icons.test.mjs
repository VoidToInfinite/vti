// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
    FAVICON,
    ICON_MASTER,
    PNG_TARGETS,
    packIco,
    staleIcons,
} from "./generate-icons.mjs";

/*
 * Candados de los iconos del sitio (2026-09-30). Google no enseñaba el icono
 * en los resultados porque la portada solo declaraba un SVG, formato que
 * Google Search no admite, y encima no era cuadrado ni se veía sobre blanco.
 * El porqué completo está en el docblock de `generate-icons.mjs`.
 *
 * Validado con fallos inyectados el 2026-09-30, uno por candado y restaurados
 * después. En los tres cae además el de «están al día», porque el máster o el
 * ICO dejan de coincidir:
 * - cambiar un `stop-color` de `app/icon.svg` sin regenerar pone en rojo el
 *   de la paleta;
 * - devolver el `viewBox` a `0 0 500 550` pone en rojo el del máster cuadrado;
 * - escribir el ICO con los fotogramas `[16, 32]` pone en rojo el del ICO.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path));
const PNG_SIGNATURE = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Ancho y alto de un PNG, leídos del bloque IHDR (bytes 16-23). */
function pngSize(png) {
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** Los fotogramas de un ICO: tamaño declarado en su entrada y PNG embebido. */
function readIco(ico) {
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    return Array.from({ length: count }, (_, i) => {
        const entry = 6 + 16 * i;
        const declared = ico.readUInt8(entry) || 256;
        const length = ico.readUInt32LE(entry + 8);
        const offset = ico.readUInt32LE(entry + 12);
        return { declared, png: ico.subarray(offset, offset + length) };
    });
}

describe("packIco", () => {
    it("escribe cabecera, una entrada por fotograma y los PNG en orden", () => {
        const a = Buffer.from("aaaa");
        const b = Buffer.from("bbbbbb");
        const ico = packIco([
            { size: 16, png: a },
            { size: 256, png: b },
        ]);

        expect(ico.readUInt16LE(4)).toBe(2);
        expect(ico.readUInt8(6)).toBe(16);
        expect(ico.readUInt8(6 + 16)).toBe(0); // 256 se escribe como 0
        expect(ico.readUInt32LE(6 + 8)).toBe(a.length);
        expect(ico.readUInt32LE(6 + 12)).toBe(6 + 16 * 2);
        expect(ico.readUInt32LE(6 + 16 + 12)).toBe(6 + 16 * 2 + a.length);
        expect(ico.subarray(6 + 16 * 2).toString()).toBe("aaaabbbbbb");
    });
});

describe("app/icon.svg, el máster", () => {
    const svg = read(ICON_MASTER).toString();

    /* Google exige 1:1 y un fondo que se vea sobre el blanco de la página de
       resultados: el máster de antes medía 500×550 y era blanco sobre
       transparente. */
    it("es cuadrado y su primera forma es un fondo a sangre", () => {
        const [, , w, h] =
            svg
                .match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/)
                ?.slice(1)
                .map(Number) ?? [];
        expect(w).toBeGreaterThan(0);
        expect(w).toBe(h);

        const firstShape =
            svg
                .replace(/<defs>[\s\S]*?<\/defs>/, "")
                .match(/<(rect|circle|polyline|path|polygon|g)\b[^>]*>/)?.[0] ??
            "";
        expect(firstShape).toMatch(/^<rect\b/);
        expect(firstShape).toContain(`width="${w}"`);
        expect(firstShape).toContain(`height="${h}"`);
        expect(firstShape).toMatch(/fill="url\(#[\w-]+\)"/);
    });

    /* Regla 41: la paleta del icono es la de la imagen Open Graph, y esa
       invariante cruza dos ficheros. */
    it("usa la paleta de la imagen Open Graph: degradado de fondo y glifo", () => {
        const og = read("app/opengraph-image.tsx").toString();
        const constant = (name) =>
            og
                .match(new RegExp(`const ${name} = "(#\\w+)"`))?.[1]
                ?.toUpperCase();
        const stops = [...svg.matchAll(/stop-color="(#\w+)"/g)].map((m) =>
            m[1].toUpperCase(),
        );
        const glyph = svg.match(/<g\b[^>]*\bfill="(#\w+)"/)?.[1]?.toUpperCase();

        expect(stops).toEqual([constant("BG_FROM"), constant("BG_TO")]);
        expect(glyph).toBe(constant("TEXT"));
    });
});

describe("derivados del máster", () => {
    it("app/favicon.ico lleva exactamente sus fotogramas, cada uno un PNG de su tamaño", () => {
        const frames = readIco(read(FAVICON.path));
        expect(frames.map((f) => f.declared)).toEqual(FAVICON.sizes);
        for (const { declared, png } of frames) {
            expect(pngSize(png)).toEqual({ width: declared, height: declared });
        }
    });

    it.each(PNG_TARGETS)(
        "$path es un PNG cuadrado de $size px",
        ({ path, size }) => {
            expect(pngSize(read(path))).toEqual({ width: size, height: size });
        },
    );

    it("están al día con app/icon.svg (si falla: node scripts/generate-icons.mjs)", async () => {
        expect(await staleIcons(ROOT)).toEqual([]);
    });
});
