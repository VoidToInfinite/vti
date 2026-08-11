import { describe, it, expect } from "vitest";
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EYE_LAYERS } from "@/components/scenes/eye/eye.layers";
import { AURA_LAYERS } from "@/components/scenes/aura/aura.layers";
import { STORY_COSMIC_BEING_LAYERS } from "@/components/scenes/storyCosmicBeing/storyCosmicBeing.layers";
import { CONTACT_GUARDIAN_LAYERS } from "@/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers";
import { JOURNEY_PORTAL_LAYERS } from "@/components/scenes/journeyCosmicPortal/journeyCosmicPortal.layers";
import { FEATURES_ORBITAL_LAYERS } from "@/components/scenes/featuresCelestialOrbital/featuresCelestialOrbital.layers";
import {
  JOURNEY_FIGURE_SRC,
  JOURNEY_FIGURE_SRC_SMALL,
} from "@/components/sections/Journey/journey.layers";
import { FEATURE_FIGURE_BASENAME } from "@/components/sections/Features/features.layers";

/**
 * Task 8 (plan premium F1-F5, 2026-08-10) -- candado de CI de presupuesto de
 * assets. Tres cerrojos, ninguno depende de red y los tres corren dentro de
 * `pnpm test`:
 *
 * 1. Presupuesto de bytes por carpeta de escena de `public/`.
 * 2. Tope de bytes por fichero WebP individual.
 * 3. Invariante de `srcset`: todo descriptor `Nw` que el código declara
 *    coincide con el ancho REAL del WebP al que apunta.
 *
 * Los candados 1 y 2 son cifras CONGELADAS (medidas hoy + ~5% de margen) --
 * existen para cazar una regresión de peso, no para perseguir que el
 * proyecto adelgace más. La Task 11 del mismo plan SÍ baja el peso real de
 * los assets; cuando lo haga, baja también estos techos en el mismo commit
 * (están aislados en constantes con su cifra medida al lado, precisamente
 * para que ese ajuste sea una edición de una tabla, no una arqueología).
 *
 * El candado 3 es DERIVADO a propósito: lee qué declara el código fuente
 * (nombre de campo o ruta interpolada, ancho en `Nw`) y lo contrasta contra
 * el fichero real en disco -- no compara contra una lista de anchos
 * congelada. Así, cuando la Task 11 añada una pista `1600w` reutilizando el
 * mismo patrón (`${layer.<campo>}` en las escenas, o la misma variable de
 * interpolación en las figuras), este test la recoge sola. Solo se rompe --
 * a propósito, con un mensaje que dice qué mirar -- si el PATRÓN sintáctico
 * cambia de forma (nuevo nombre de variable de interpolación, o un `srcSet`
 * que deja de tener forma `<ruta> Nw, <ruta> Nw, ...`).
 *
 * ## El parser de anchos WebP (candado 3)
 *
 * Sin dependencias nuevas: un WebP es un contenedor RIFF con un único chunk
 * de imagen (`VP8 ` con pérdida, `VP8L` sin pérdida, o `VP8X` extendido --
 * este repo produce los tres, verificado empíricamente sobre los ~90
 * ficheros de `public/` al escribir este test). El ancho vive en la
 * cabecera binaria de ese chunk, con un layout de bytes distinto para cada
 * uno. Fuentes citadas (protocolo de veracidad, §0 de CLAUDE.md):
 *
 * - Cabecera RIFF/WEBP y layout de `VP8X`:
 *   https://developers.google.com/speed/webp/docs/riff_container
 *   ("VP8X": byte 0 flags, bytes 1-3 reservado, bytes 4-6 ancho-menos-uno
 *   de 24 bits LE, bytes 7-9 alto-menos-uno de 24 bits LE).
 * - Cabecera de fotograma clave `VP8 ` (con pérdida):
 *   RFC 6386 §9.1, https://datatracker.ietf.org/doc/html/rfc6386#section-9.1
 *   (3 bytes de "frame tag" + 3 bytes de código de arranque `0x9d 0x01
 *   0x2a` + 2 bytes de ancho LE de 16 bits con los 2 bits superiores de
 *   escala + 2 bytes de alto en el mismo formato).
 * - Cabecera `VP8L` (sin pérdida):
 *   https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification
 *   (1 byte de firma `0x2F` + 32 bits LE: 14 bits de ancho-menos-uno
 *   (LSB primero), 14 bits de alto-menos-uno, 1 bit de alfa, 3 de versión).
 *
 * Verificado contra los ficheros reales del repo: los tres formatos
 * aparecen (`VP8 ` en los `-1024`/nativos más livianos, `VP8X` en el resto),
 * y los anchos leídos coinciden exactamente con los que ya documentan
 * `eye.layers.ts`/`aura.layers.ts` (1672px) y con los que usan los propios
 * `srcSet` del código (1024/1280/1672/2560/640) -- ver el bug inyectado en
 * el informe de esta tarea para la verificación en rojo/verde.
 */

// ---------------------------------------------------------------------------
// Utilidades de fichero
// ---------------------------------------------------------------------------

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(srcRoot, "..", "public");

/** Recorre `dir` recursivamente y devuelve las rutas absolutas de todos los
 *  `.webp` que encuentra. */
function walkWebp(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkWebp(full));
    } else if (entry.name.toLowerCase().endsWith(".webp")) {
      out.push(full);
    }
  }
  return out;
}

/** Ruta de `file` relativa a `public/`, siempre con `/` (normaliza el `\`
 *  de Windows) -- es la que usa `public/<ruta>` como carpeta lógica. */
function publicRelative(file: string): string {
  return relative(publicRoot, file).replace(/\\/g, "/");
}

/**
 * Ancho real (px) de un WebP, leído de su cabecera binaria. Solo lee los
 * primeros bytes del fichero (no lo carga entero) -- ver el docblock de
 * cabecera para el layout exacto y sus fuentes.
 */
function readWebpWidth(filePath: string): number {
  const fd = openSync(filePath, "r");
  try {
    const header = Buffer.alloc(30);
    readSync(fd, header, 0, header.length, 0);
    if (
      header.toString("ascii", 0, 4) !== "RIFF" ||
      header.toString("ascii", 8, 12) !== "WEBP"
    ) {
      throw new Error(`${filePath}: no es un contenedor RIFF/WEBP válido`);
    }
    const fourCC = header.toString("ascii", 12, 16);
    // 12 (cabecera RIFF: 'RIFF' + tamaño + 'WEBP') + 8 (FourCC de 4B +
    // tamaño de chunk de 4B del primer -- y único -- chunk de imagen).
    const chunkData = 20;
    if (fourCC === "VP8 ") {
      // Lossy (RFC 6386 §9.1): bytes 0-2 frame tag, 3-5 código de arranque
      // (0x9d 0x01 0x2a), 6-7 ancho LE de 16 bits (14 bits de ancho + 2 de
      // escala en los bits altos), 8-9 alto en el mismo formato.
      return header.readUInt16LE(chunkData + 6) & 0x3fff;
    }
    if (fourCC === "VP8L") {
      // Lossless: byte 0 firma 0x2F, bytes 1-4 un entero LE de 32 bits con
      // 14 bits de ancho-menos-uno (LSB primero), 14 de alto-menos-uno, 1
      // de alfa, 3 de versión.
      const bits = header.readUInt32LE(chunkData + 1);
      return (bits & 0x3fff) + 1;
    }
    if (fourCC === "VP8X") {
      // Extendido: byte 0 flags, bytes 1-3 reservado, bytes 4-6 ancho de
      // lienzo menos uno (24 bits LE), bytes 7-9 alto menos uno (24 bits LE).
      const w =
        header[chunkData + 4] |
        (header[chunkData + 5] << 8) |
        (header[chunkData + 6] << 16);
      return w + 1;
    }
    throw new Error(
      `${filePath}: FourCC de chunk WebP no reconocido: "${fourCC}"`,
    );
  } finally {
    closeSync(fd);
  }
}

// ---------------------------------------------------------------------------
// Candados 1 y 2: presupuesto de bytes
// ---------------------------------------------------------------------------

const BUDGET_MARGIN = 1.05;

/**
 * Bytes REALES por carpeta de escena, medidos el 2026-08-10 recorriendo
 * `public/` con `readWebpWidth`/`statSync` (mismo mecanismo que usa el test
 * de abajo). Nota de estructura real del repo: no existe `public/scenes/`
 * (la carpeta mencionada en el encargo original) -- cada escena vive bajo
 * `public/<sección>/<nombre-de-escena>/`, más `public/figures/` para los
 * seis retratos compartidos entre secciones. Estas 7 son TODAS las carpetas
 * con `.webp` que tiene hoy el repo (`public/brand/logo.svg` es el único
 * asset fuera de esta lista, y no es WebP).
 *
 * **Actualizado 2026-08-11 (Task 11, plan premium F1-F5).** Esta tarea es el
 * cambio legítimo que el docblock de cabecera anuncia: cuatro carpetas se
 * recalcularon tras (a) añadir la pista intermedia de 1600px a las 16 capas
 * de Features/Journey/Contact y (b) recomprimir en color `07-geometry`/
 * `01-nebula` de Story. Antes → después (bytes reales en `public/`,
 * `MEASURED_FOLDER_BYTES` previo entre paréntesis):
 * - `features/celestial-orbital`: 2022094 → 2774032 (+751938, exactamente el
 *   peso de las 7 pistas `-1600.webp` nuevas; ninguna pista existente
 *   cambió).
 * - `journey/cosmic-portal`: 1266500 → 1758720 (+492220, las 6 pistas
 *   `-1600.webp` nuevas).
 * - `contact/cosmic-guardian`: 492334 → 680776 (+188442, las 3 pistas
 *   `-1600.webp` nuevas).
 * - `story/cosmic-being`: 2294216 → 2002824 (-291392): esta carpeta NO gana
 *   pista nueva (sus anchos siguen siendo 1024/1280) -- baja de peso porque
 *   `07-geometry`/`01-nebula` se recomprimieron en color (ver
 *   `assets/story-cosmic-being/manifest.json`, sección
 *   `colorRecompression20260811`).
 * Sin cambios: `figures`, `hero/aura`, `hero/eye` (fuera del alcance de esta
 * tarea).
 */
const MEASURED_FOLDER_BYTES: Readonly<Record<string, number>> = {
  "contact/cosmic-guardian": 680776,
  "features/celestial-orbital": 2774032,
  "figures": 1562352,
  "hero/aura": 444888,
  "hero/eye": 619638,
  "journey/cosmic-portal": 1758720,
  "story/cosmic-being": 2002824,
};

/** Techo = bytes medidos × 1.05, redondeado hacia arriba. */
const FOLDER_BUDGET_BYTES: Readonly<Record<string, number>> =
  Object.fromEntries(
    Object.entries(MEASURED_FOLDER_BYTES).map(([folder, bytes]) => [
      folder,
      Math.ceil(bytes * BUDGET_MARGIN),
    ]),
  );

/**
 * Fichero WebP más pesado medido en `public/` el 2026-08-11 (corregido tras
 * revisión: la primera medición de esta tarea había citado por error
 * `story/cosmic-being/07-geometry.webp`, 661472 bytes -- el SEGUNDO más
 * pesado, no el primero -- reverificado con `stat` directo sobre los 84
 * WebP de `public/`):
 * `features/celestial-orbital/02-ondas.webp`, 669238 bytes (~654 KiB) -- la
 * capa nativa (2560×1441) de las ondas de la escena de Features. Techo =
 * ese valor × 1.05, redondeado hacia arriba: 702700 bytes.
 *
 * Reverificado 2026-08-11 (Task 11): sigue siendo el fichero más pesado del
 * repo. `story/cosmic-being/07-geometry.webp`, el que ocupaba el segundo
 * puesto (661472 bytes), bajó a 554792 bytes tras su recompresión de color
 * (`colorRecompression20260811` en su manifest) y ya no es competencia; las
 * 16 pistas `-1600.webp` nuevas de Features/Journey/Contact son todas más
 * ligeras que sus propias pistas nativas de 2560px, así que ninguna se
 * acerca al techo tampoco (la más pesada de las nuevas es
 * `features/celestial-orbital/02-ondas-1600.webp`, 300394 bytes).
 */
const MEASURED_MAX_FILE_BYTES = 669238;
const MAX_FILE_BUDGET_BYTES = Math.ceil(
  MEASURED_MAX_FILE_BYTES * BUDGET_MARGIN,
);

describe("candado 1: presupuesto de bytes por carpeta de escena", () => {
  it("cada carpeta con WebP en public/ está dentro de su presupuesto (+5% sobre lo medido)", () => {
    const byFolder = new Map<string, number>();
    for (const file of walkWebp(publicRoot)) {
      const rel = publicRelative(file);
      const folder = rel.split("/").slice(0, -1).join("/");
      byFolder.set(folder, (byFolder.get(folder) ?? 0) + statSync(file).size);
    }

    // Contrato cerrado (RULES.md #40): el conjunto de carpetas encontradas
    // tiene que ser EXACTAMENTE el de MEASURED_FOLDER_BYTES. Una carpeta
    // nueva sin presupuesto, o una vieja que desaparece dejando un
    // presupuesto huérfano, paran aquí a propósito -- quien la añade/quita
    // actualiza esta tabla en el mismo commit, no relaja el test.
    expect([...byFolder.keys()].sort()).toEqual(
      Object.keys(MEASURED_FOLDER_BYTES).sort(),
    );

    for (const [folder, bytes] of byFolder) {
      const budget = FOLDER_BUDGET_BYTES[folder];
      expect(
        bytes,
        `${folder}: ${bytes} bytes supera el presupuesto de ${budget} ` +
          `(medido ${MEASURED_FOLDER_BYTES[folder]} bytes + 5% de margen)`,
      ).toBeLessThanOrEqual(budget);
    }
  });
});

describe("candado 2: tope de bytes por fichero WebP individual", () => {
  it("ningún WebP de public/ supera el tope (+5% sobre el más pesado medido)", () => {
    const files = walkWebp(publicRoot);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const bytes = statSync(file).size;
      expect(
        bytes,
        `${publicRelative(file)}: ${bytes} bytes supera el tope por fichero ` +
          `de ${MAX_FILE_BUDGET_BYTES} (el más pesado medido hoy es ` +
          `${MEASURED_MAX_FILE_BYTES} bytes, features/celestial-orbital/02-ondas.webp, + 5%)`,
      ).toBeLessThanOrEqual(MAX_FILE_BUDGET_BYTES);
    }
  });
});

// ---------------------------------------------------------------------------
// Candado 3: invariante de srcset (derivado, sin lista congelada)
// ---------------------------------------------------------------------------

interface SrcSetToken {
  /** Texto de la ruta tal cual aparece en el código: literal
   *  ("/figures/x.webp") o con una interpolación ("${layer.srcSmall}",
   *  "/figures/${basename}-640.webp"). */
  pathTemplate: string;
  /** Descriptor de ancho declarado (el número antes de la "w"). */
  width: number;
}

/** Todas las apariciones de `srcSet={\`...\`}` o `srcSet="..."` en un
 *  fuente, devueltas como el contenido crudo entre comillas/backticks. */
function extractSrcSetContents(source: string): string[] {
  const templated = [...source.matchAll(/srcSet=\{`([^`]*)`\}/g)].map(
    (m) => m[1],
  );
  const literal = [...source.matchAll(/srcSet="([^"]*)"/g)].map((m) => m[1]);
  return [...templated, ...literal];
}

/** Divide el contenido de un srcSet en sus tokens `<ruta> <ancho>w`, sin
 *  asumir cuántos hay -- una pista nueva (p.ej. 1600w) se recoge sola. */
function parseSrcSetTokens(content: string): SrcSetToken[] {
  return content.split(",").map((raw) => {
    const token = raw.trim();
    const match = token.match(/^(.+?)\s+(\d+)w$/);
    if (!match) {
      throw new Error(`token de srcSet irreconocible: "${token}"`);
    }
    return { pathTemplate: match[1], width: Number(match[2]) };
  });
}

/** Comprueba, para el fichero en `absUrl`, que su ancho WebP real coincide
 *  con `width`; falla con un mensaje que cita ambos valores si no. */
function assertRealWidth(label: string, url: string, width: number): void {
  const absPath = join(publicRoot, url);
  expect(
    existsSync(absPath),
    `${label}: "${url}" aparece en un srcSet pero no existe en public/`,
  ).toBe(true);
  const real = readWebpWidth(absPath);
  expect(
    real,
    `${label}: "${url}" se declara como ${width}w en el srcSet pero el ` +
      `WebP real mide ${real}px de ancho`,
  ).toBe(width);
}

/**
 * Verifica el patrón de las 6 escenas por capas (`Eye`, `Aura`,
 * `StoryCosmicBeing`, `ContactCosmicGuardian`, `JourneyCosmicPortal`,
 * `FeaturesCelestialOrbital`): `srcSet={\`${layer.<campo>} Nw, ...\`}`.
 *
 * El nombre del CAMPO (`srcSmall`, `src`, o uno nuevo que añada la Task 11)
 * se lee del propio código fuente con una expresión regular -- no se
 * asume de antemano-- y se resuelve indexando el objeto de capa REAL
 * (`layer[campo]`) importado del módulo `.layers.ts`. Así, una pista nueva
 * que reutilice este mismo patrón (`${layer.srcMedium} 1600w`, por
 * ejemplo) queda cubierta sin tocar este test.
 */
function verifyLayerSceneSrcSet(
  label: string,
  tsxRelPath: string,
  layers: readonly Record<string, unknown>[],
): void {
  const source = readFileSync(join(srcRoot, tsxRelPath), "utf-8");
  const contents = extractSrcSetContents(source);
  expect(
    contents.length,
    `${label}: no se encontró ningún srcSet={...} en ${tsxRelPath} -- si el ` +
      `patrón de este componente cambió de forma, hay que revisar el ` +
      `extractor de assets-budget.test.ts`,
  ).toBeGreaterThan(0);

  for (const content of contents) {
    const tokens = parseSrcSetTokens(content);
    expect(
      tokens.length,
      `${label}: srcSet sin pistas ("${content}")`,
    ).toBeGreaterThan(0);
    for (const { pathTemplate, width } of tokens) {
      const fieldMatch = pathTemplate.match(/^\$\{layer\.(\w+)\}$/);
      expect(
        fieldMatch,
        `${label}: el token "${pathTemplate}" no tiene la forma ` +
          `\${layer.<campo>} esperada -- revisa el extractor de este test`,
      ).not.toBeNull();
      const field = fieldMatch![1];
      for (const layer of layers) {
        const url = layer[field];
        expect(
          typeof url,
          `${label}: layer.${field} no es un string en la capa "${String(layer.part)}"`,
        ).toBe("string");
        assertRealWidth(
          `${label} (${String(layer.part)}.${field})`,
          url as string,
          width,
        );
      }
    }
  }
}

/**
 * Verifica un patrón de "figura de sección" (`Story`, `Contact`, `Features`,
 * `Journey`): cada token puede ser una ruta literal o llevar UNA
 * interpolación `${identificador}`. `bindings` resuelve esa interpolación a
 * sus valores REALES -- importados del propio módulo de producción, nunca
 * escritos a mano en este test -- así que una pista nueva que reutilice la
 * MISMA variable (p.ej. un tercer track de `${basename}`) también queda
 * cubierta sin tocar este test.
 */
function verifyFigureSrcSet(
  label: string,
  tsxRelPath: string,
  bindings: Readonly<Record<string, readonly string[]>>,
): void {
  const source = readFileSync(join(srcRoot, tsxRelPath), "utf-8");
  const contents = extractSrcSetContents(source);
  expect(
    contents.length,
    `${label}: no se encontró ningún srcSet={...} / srcSet="..." en ${tsxRelPath}`,
  ).toBeGreaterThan(0);

  for (const content of contents) {
    const tokens = parseSrcSetTokens(content);
    expect(
      tokens.length,
      `${label}: srcSet sin pistas ("${content}")`,
    ).toBeGreaterThan(0);
    for (const { pathTemplate, width } of tokens) {
      const interp = pathTemplate.match(/\$\{([\w.]+)\}/);
      if (!interp) {
        // Ruta totalmente literal (Story/Contact): se usa tal cual.
        assertRealWidth(label, pathTemplate, width);
        continue;
      }
      const key = interp[1];
      const values = bindings[key];
      expect(
        values,
        `${label}: sin binding declarado para "\${${key}}" (visto en ` +
          `"${pathTemplate}") -- si el código introdujo una variable de ` +
          `interpolación nueva, añade su binding en este test`,
      ).toBeDefined();
      for (const value of values) {
        const url = pathTemplate.replace(interp[0], value);
        assertRealWidth(label, url, width);
      }
    }
  }
}

describe("candado 3: invariante de srcset (todo descriptor Nw coincide con el WebP real)", () => {
  it("Eye: EYE_LAYERS", () => {
    verifyLayerSceneSrcSet(
      "Eye",
      "components/scenes/eye/Eye.tsx",
      EYE_LAYERS as unknown as Record<string, unknown>[],
    );
  });

  it("Aura: AURA_LAYERS", () => {
    verifyLayerSceneSrcSet(
      "Aura",
      "components/scenes/aura/Aura.tsx",
      AURA_LAYERS as unknown as Record<string, unknown>[],
    );
  });

  it("StoryCosmicBeing: STORY_COSMIC_BEING_LAYERS", () => {
    verifyLayerSceneSrcSet(
      "StoryCosmicBeing",
      "components/scenes/storyCosmicBeing/StoryCosmicBeing.tsx",
      STORY_COSMIC_BEING_LAYERS as unknown as Record<string, unknown>[],
    );
  });

  it("ContactCosmicGuardian: CONTACT_GUARDIAN_LAYERS", () => {
    verifyLayerSceneSrcSet(
      "ContactCosmicGuardian",
      "components/scenes/contactCosmicGuardian/ContactCosmicGuardian.tsx",
      CONTACT_GUARDIAN_LAYERS as unknown as Record<string, unknown>[],
    );
  });

  it("JourneyCosmicPortal: JOURNEY_PORTAL_LAYERS", () => {
    verifyLayerSceneSrcSet(
      "JourneyCosmicPortal",
      "components/scenes/journeyCosmicPortal/JourneyCosmicPortal.tsx",
      JOURNEY_PORTAL_LAYERS as unknown as Record<string, unknown>[],
    );
  });

  it("FeaturesCelestialOrbital: FEATURES_ORBITAL_LAYERS", () => {
    verifyLayerSceneSrcSet(
      "FeaturesCelestialOrbital",
      "components/scenes/featuresCelestialOrbital/FeaturesCelestialOrbital.tsx",
      FEATURES_ORBITAL_LAYERS as unknown as Record<string, unknown>[],
    );
  });

  it("Story: figura /figures/journey-presenting-*", () => {
    verifyFigureSrcSet("Story", "components/sections/Story/Story.tsx", {});
  });

  it("Contact: figura /figures/contact-waving-*", () => {
    verifyFigureSrcSet(
      "Contact",
      "components/sections/Contact/Contact.tsx",
      {},
    );
  });

  it("Features: figuras /figures/${basename}-* (FEATURE_FIGURE_BASENAME)", () => {
    verifyFigureSrcSet(
      "Features",
      "components/sections/Features/Features.tsx",
      { basename: Object.values(FEATURE_FIGURE_BASENAME) },
    );
  });

  it("Journey: figura JOURNEY_FIGURE_SRC(_SMALL)", () => {
    verifyFigureSrcSet("Journey", "components/sections/Journey/Journey.tsx", {
      JOURNEY_FIGURE_SRC_SMALL: [JOURNEY_FIGURE_SRC_SMALL],
      JOURNEY_FIGURE_SRC: [JOURNEY_FIGURE_SRC],
    });
  });
});
