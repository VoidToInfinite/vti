#!/usr/bin/env node
/**
 * Genera los iconos rasterizados del sitio a partir de su máster,
 * `app/icon.svg`.
 *
 * POR QUE EXISTE (2026-09-30). El dueño reportó que Google no enseñaba el
 * icono del sitio en los resultados de búsqueda. Medido en producción con
 * `curl`, la portada solo declaraba `<link rel="icon" href="/icon.svg…"
 * type="image/svg+xml">`, y la guía de Google
 * (https://developers.google.com/search/docs/appearance/favicon-in-search,
 * actualizada el 2026-08-28) dice que Google Search admite «BMP, GIF, ICO,
 * PNG, JPEG, PPM, and TIFF»: el SVG no está en esa lista. Además el SVG de
 * entonces medía 500×550 (la guía exige 1:1) y era un glifo blanco sobre
 * transparente, invisible sobre el fondo blanco de la página de resultados. Y
 * `/favicon.ico` devolvía 404.
 *
 * QUE ESCRIBE. Tres ficheros derivados del máster, que se commitean:
 *
 * - `app/favicon.ico`: 16, 32 y 48 px, cada fotograma como PNG embebido (lo
 *   admiten todos los navegadores actuales y es un ICO válido para Google).
 *   Next lo publica en `/favicon.ico`, la ruta a la que acuden por defecto los
 *   rastreadores y los navegadores que no leen el `<head>`.
 * - `app/apple-icon.png`: 180 px. Next emite `rel="apple-touch-icon"`, uno de
 *   los cuatro valores de `rel` que la guía de Google acepta, y de paso es el
 *   único icono del sitio por encima de los 48 px que la guía recomienda.
 * - `public/brand/logo.png`: 512 px, el `logo` de `Organization` en el
 *   JSON-LD (`src/seo/jsonLd.ts`). La guía de logos
 *   (https://developers.google.com/search/docs/appearance/structured-data/logo,
 *   actualizada el 2026-09-08) pide 112 px como mínimo y que la imagen se vea
 *   bien sobre blanco puro; `public/brand/logo.svg`, blanco sobre
 *   transparente, no cumplía lo segundo.
 *
 * `app/icon.svg` sigue siendo el icono de las pestañas de los navegadores que
 * leen SVG: es el máster, no un derivado.
 *
 * COMO RASTERIZA. Con `ImageResponse` de `next/og`, el mismo motor que ya
 * genera `app/opengraph-image.tsx` (Satori + resvg en WebAssembly, empaquetados
 * dentro de `next`). Así no entra ninguna dependencia nueva al repo, y la
 * salida es determinista: el mismo máster con la misma versión de `next`
 * produce los mismos bytes en Windows y en Linux.
 *
 * USO.
 *
 *   node scripts/generate-icons.mjs          reescribe los tres ficheros
 *   node scripts/generate-icons.mjs --check  sale con 1 si alguno no coincide
 *                                           con lo que produce el máster
 *
 * `scripts/generate-icons.test.mjs` ejecuta la comprobación de `--check` dentro
 * de `pnpm test`, así que editar `app/icon.svg` sin regenerar pone el gate en
 * rojo. Si lo que cambia es la versión de `next` y el rojo viene de ahí, se
 * regenera y se miran los PNG antes de commitearlos.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
// Con extensión: `next` no declara `exports`, y el resolvedor ESM de Node no
// completa `next/og` a `next/og.js` por su cuenta.
import { ImageResponse } from "next/og.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** El máster de todos los iconos, relativo a la raíz del repo. */
export const ICON_MASTER = "app/icon.svg";

/** El ICO con sus fotogramas, en el orden en que se escriben. */
export const FAVICON = { path: "app/favicon.ico", sizes: [16, 32, 48] };

/** Los PNG sueltos, cada uno cuadrado. */
export const PNG_TARGETS = [
    { path: "app/apple-icon.png", size: 180 },
    { path: "public/brand/logo.png", size: 512 },
];

/** Rasteriza el SVG a un PNG cuadrado de `size` px de lado. */
export async function renderPng(svg, size) {
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    const response = new ImageResponse(
        createElement("img", { src, width: size, height: size }),
        { width: size, height: size },
    );
    return Buffer.from(await response.arrayBuffer());
}

/**
 * Empaqueta PNG ya rasterizados en un ICO: cabecera ICONDIR de 6 bytes, una
 * entrada ICONDIRENTRY de 16 bytes por fotograma y, detrás, los PNG tal cual.
 * El formato guarda ancho y alto en un byte, y 0 significa 256.
 */
export function packIco(frames) {
    const HEADER_BYTES = 6;
    const ENTRY_BYTES = 16;
    const header = Buffer.alloc(HEADER_BYTES);
    header.writeUInt16LE(0, 0); // reservado
    header.writeUInt16LE(1, 2); // 1 = icono (2 sería cursor)
    header.writeUInt16LE(frames.length, 4);

    let offset = HEADER_BYTES + ENTRY_BYTES * frames.length;
    const entries = frames.map(({ size, png }) => {
        const entry = Buffer.alloc(ENTRY_BYTES);
        entry.writeUInt8(size >= 256 ? 0 : size, 0);
        entry.writeUInt8(size >= 256 ? 0 : size, 1);
        entry.writeUInt8(0, 2); // sin paleta
        entry.writeUInt8(0, 3); // reservado
        entry.writeUInt16LE(1, 4); // planos
        entry.writeUInt16LE(32, 6); // bits por píxel
        entry.writeUInt32LE(png.length, 8);
        entry.writeUInt32LE(offset, 12);
        offset += png.length;
        return entry;
    });

    return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

/** Todos los derivados del máster, indexados por su ruta relativa. */
export async function buildIcons(svg) {
    const outputs = new Map();
    const frames = [];
    for (const size of FAVICON.sizes) {
        frames.push({ size, png: await renderPng(svg, size) });
    }
    outputs.set(FAVICON.path, packIco(frames));
    for (const { path, size } of PNG_TARGETS) {
        outputs.set(path, await renderPng(svg, size));
    }
    return outputs;
}

/** Rutas de los derivados cuyo contenido en disco no coincide con el máster. */
export async function staleIcons(root = ROOT) {
    const svg = readFileSync(join(root, ICON_MASTER));
    const stale = [];
    for (const [path, expected] of await buildIcons(svg)) {
        let actual;
        try {
            actual = readFileSync(join(root, path));
        } catch {
            stale.push(path);
            continue;
        }
        if (!actual.equals(expected)) stale.push(path);
    }
    return stale;
}

async function main() {
    if (process.argv.includes("--check")) {
        const stale = await staleIcons();
        if (stale.length > 0) {
            console.error(
                `Iconos desfasados respecto a ${ICON_MASTER}: ${stale.join(", ")}.\n` +
                    "Regenera con: node scripts/generate-icons.mjs",
            );
            process.exit(1);
        }
        console.log("Iconos al día con su máster.");
        return;
    }

    const svg = readFileSync(join(ROOT, ICON_MASTER));
    for (const [path, data] of await buildIcons(svg)) {
        writeFileSync(join(ROOT, path), data);
        console.log(`${path}  ${data.length} B`);
    }
}

if (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    await main();
}
