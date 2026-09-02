#!/usr/bin/env node
/**
 * Instrumento canónico del presupuesto de JavaScript de la home
 * (`PRE-LAUNCH-QA.md` §4). Hasta el 2026-09-01 vivía como un `node -e` suelto
 * escrito a mano en cada medición; que dos personas midieran "lo mismo"
 * dependía de que recordaran los mismos parámetros. Aquí queda fijado.
 *
 * QUÉ MIDE: los chunks que `out/index.html` referencia con `<script src=…>`,
 * comprimidos con **brotli de calidad 11** — que es lo que el hosting sirve de
 * verdad, no gzip. Requiere un `out/` ya construido (`pnpm build`); no lo
 * construye por su cuenta, y por eso no está en `pnpm run ci`: el gate corre
 * sin build.
 *
 * QUÉ NO CUENTA CONTRA EL PRESUPUESTO, y por qué (decisión del dueño,
 * 2026-09-01): el chunk marcado `nomodule`. Es el polyfill que Next emite para
 * navegadores sin soporte de módulos ES; todo navegador moderno lee el
 * atributo y NO LO DESCARGA — verificado el 2026-09-01 sobre el `out/` real
 * servido en local: el log de acceso del servidor y la lista de peticiones de
 * Playwright coinciden en 16 chunks pedidos y cero peticiones a este.
 * Contarlo inflaba la cifra en 35.158 B de bytes
 * que ningún visitante real transfiere, y con ellos dentro el presupuesto
 * salía incumplido por 2.250 B mientras lo que se descarga de verdad sobraba
 * por 32.908 B (medido sobre `86f15a0`). Es la misma lección que dejó escrita la ola I sobre la guarda
 * de AVIF del aura: **una medida de peso se evalúa sobre lo que el visitante
 * DESCARGA**, no sobre lo que el HTML menciona. El polyfill se sigue midiendo
 * y se sigue imprimiendo, aparte, para que el cambio de instrumento sea
 * auditable y no una cifra que baja sola.
 *
 * SALIDA: tabla por chunk, los dos totales (descargado y HTML completo) y el
 * veredicto. Código de salida 1 si el total descargado supera el presupuesto,
 * para poder usarlo como candado manual antes de publicar.
 */
import { readFileSync, existsSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";
import path from "node:path";

/** Presupuesto vigente en bytes brotli (`PRE-LAUNCH-QA.md` §4). */
const BUDGET_BYTES = 290_000;

const OUT_DIR = "out";
const ENTRY_HTML = path.join(OUT_DIR, "index.html");

if (!existsSync(ENTRY_HTML)) {
    console.error(
        `No existe ${ENTRY_HTML}. Este instrumento mide el build real: ejecuta ` +
            `\`pnpm build\` antes.`,
    );
    process.exit(2);
}

const html = readFileSync(ENTRY_HTML, "utf8");

/*
 * Se leen los `<script>` con `src` a un chunk de Next. El atributo se emite
 * como `noModule=""` (React lo serializa en camelCase); el parser de HTML lo
 * trata sin distinguir mayúsculas, así que aquí se compara igual.
 */
const SCRIPT_TAG =
    /<script[^>]*\ssrc="(\/_next\/static\/chunks\/[^"]+)"([^>]*)>/g;

const chunks = [...html.matchAll(SCRIPT_TAG)].map(([, src, rest]) => {
    const file = path.join(OUT_DIR, src);
    const raw = readFileSync(file);
    const brotli = brotliCompressSync(raw, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
    return {
        name: path.basename(src),
        raw: raw.length,
        brotli,
        legacyOnly: /\bnomodule\b/i.test(rest),
    };
});

if (chunks.length === 0) {
    console.error(
        `${ENTRY_HTML} no referencia ningún chunk. El build está incompleto o el ` +
            `formato de salida de Next cambió: revisa el patrón antes de fiarte de ` +
            `un cero.`,
    );
    process.exit(2);
}

const sum = (list) => list.reduce((acc, chunk) => acc + chunk.brotli, 0);
const downloaded = chunks.filter((chunk) => !chunk.legacyOnly);
const legacy = chunks.filter((chunk) => chunk.legacyOnly);

const downloadedBytes = sum(downloaded);
const legacyBytes = sum(legacy);
const es = (bytes) => bytes.toLocaleString("es-ES");

const rows = [...chunks].sort((a, b) => b.brotli - a.brotli);
for (const chunk of rows) {
    const mark = chunk.legacyOnly ? "nomodule" : "        ";
    console.log(
        `${String(chunk.brotli).padStart(7)} B br | ${String(chunk.raw).padStart(8)} B crudo | ${mark} | ${chunk.name}`,
    );
}

const delta = downloadedBytes - BUDGET_BYTES;
console.log("—".repeat(72));
console.log(`chunks referenciados      : ${chunks.length}`);
console.log(
    `polyfill nomodule         : ${es(legacyBytes)} B (no lo descarga ningún navegador moderno)`,
);
console.log(`JS DESCARGADO (presupuesto): ${es(downloadedBytes)} B brotli`);
console.log(
    `total del HTML (contexto) : ${es(downloadedBytes + legacyBytes)} B brotli`,
);
console.log(`presupuesto               : ${es(BUDGET_BYTES)} B brotli`);
console.log(
    delta <= 0
        ? `CUMPLE — ${es(-delta)} B libres`
        : `NO CUMPLE — ${es(delta)} B por encima`,
);

process.exit(delta <= 0 ? 0 : 1);
