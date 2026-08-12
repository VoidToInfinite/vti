import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Task 19 (motion core) — candado del "defecto de fondo del vocabulario" que
 * detectó el gate F2 (2026-08-11, detector B): `REVEAL` y `AMBIENT`
 * (`src/motion/vocabulary.ts`) tenían CERO consumidores de producción pese a
 * llevar tareas enteras documentando sus valores -- un vocabulario sin
 * consumidores es un comentario, no un contrato.
 *
 * Este candado afirma consumo REAL, no la mera existencia del símbolo: un
 * fichero que hiciera `import { REVEAL } from "@/motion/vocabulary"` sin
 * usarlo en ningún sitio (import muerto) NO cuenta como consumidor aquí --
 * se exige que `REVEAL\.<campo>` (acceso de propiedad) aparezca de verdad en
 * el cuerpo del fichero. Mismo patrón de "grep sobre `src/` real" que
 * `no-external-hosts.test.ts` (Task 18): simple, no depende de parsear AST,
 * y barato de mantener.
 *
 * Comentarios/docblocks se DESPOJAN antes de buscar (bloque y de línea) --
 * lección del repo (`task/lessons.md`, 2026-08-11, "Un candado de literal no
 * distingue código de comentario que CITA ese literal"): los propios
 * docblocks de esta tarea citan `REVEAL.durationMs`/`AMBIENT.floatMs` en
 * prosa para explicar la migración, y sin despojar, esas citas bastarían
 * para que el candado pasara aunque el CÓDIGO real no consumiera nada -- el
 * mismo agujero que ya midió esa lección para `viewportFit`.
 *
 * Verificado con el bug inyectado a propósito (regla 34 de RULES.md, informe
 * de la tarea), en DOS pasos:
 *
 * 1. Comentando temporalmente la línea `import { PRESS, REVEAL }` de
 *    `Story.tsx` (dejando `REVEAL.durationMs` etc. como referencias sueltas
 *    en el CÓDIGO, simulando que el import "se olvidó"): no cambia el
 *    resultado de este test (sigue viendo el patrón `REVEAL\.` en código,
 *    no en comentario -- el candado es sobre TEXTO de código, no sobre que
 *    el módulo compile). El candado que sí cae en rojo con ESE bug es el
 *    propio build/typecheck (`pnpm run ci`), la capa correcta para un
 *    import roto.
 * 2. Despojando TODO uso real de `REVEAL\.` en `Story.tsx` (las 4 piezas
 *    hijas MÁS `ScGrid`, sustituidas por los literales/tokens sueltos que
 *    llevaban antes de esta tarea -- dejando intactos solo los docblocks
 *    que CITAN `REVEAL.durationMs` en prosa): el test "REVEAL se consume
 *    desde Story.tsx" cayó en rojo (Story.tsx desaparece de la lista de
 *    consumidores reales pese a que sus comentarios siguen mencionando el
 *    símbolo) -- confirma que el despojo de comentarios funciona y que el
 *    candado mide código, no prosa. Restaurado, volvió a verde.
 */

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Recorre `dir` recursivamente y devuelve las rutas de los ficheros a escanear. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTENSIONS.has(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

/** Ruta relativa a `src/`, con `/` normalizado (mismo criterio que
 *  `no-external-hosts.test.ts`). */
function relativePath(file: string): string {
  return file.slice(srcRoot.length + 1).replace(/\\/g, "/");
}

/** Despoja comentarios de bloque y de línea ANTES de buscar (lección del
 *  repo, `task/lessons.md` 2026-08-11): un docblock que CITA
 *  `REVEAL.durationMs` en prosa para explicar una migración no puede contar
 *  como "consumo real" -- solo el CÓDIGO que sobrevive a este despojo
 *  cuenta. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/**
 * Ficheros de PRODUCCIÓN (no tests, no el propio `vocabulary.ts`) que
 * consumen `${group}.<campo>` de verdad -- acceso de propiedad en CÓDIGO
 * activo, no solo el import y no una cita en un comentario.
 */
function realConsumersOf(
  group: "REVEAL" | "AMBIENT" | "PRESS" | "DECK",
): string[] {
  const files = walk(srcRoot);
  const pattern = new RegExp(`\\b${group}\\.[a-zA-Z]+`);
  const consumers: string[] = [];

  for (const file of files) {
    const relative = relativePath(file);
    if (relative === "motion/vocabulary.ts") continue; // la fuente, no un consumidor
    if (relative.endsWith(".test.ts") || relative.endsWith(".test.tsx"))
      continue;

    const content = stripComments(readFileSync(file, "utf-8"));
    if (pattern.test(content)) {
      consumers.push(relative);
    }
  }
  return consumers;
}

describe("Task 19: REVEAL y AMBIENT tienen consumidores REALES de producción (gate F2)", () => {
  it("REVEAL.* se consume de verdad desde Story.tsx y Features.tsx", () => {
    const consumers = realConsumersOf("REVEAL");

    expect(
      consumers,
      `consumidores reales encontrados: ${consumers.join(", ") || "ninguno"}`,
    ).not.toHaveLength(0);
    expect(consumers).toContain("components/sections/Story/Story.tsx");
    expect(consumers).toContain("components/sections/Features/Features.tsx");
  });

  it("AMBIENT.* se consume de verdad desde Sol.tsx, storyCosmicBeing.parts.tsx, BrandName.tsx, Hero.tsx y Contact.tsx", () => {
    const consumers = realConsumersOf("AMBIENT");

    expect(
      consumers,
      `consumidores reales encontrados: ${consumers.join(", ") || "ninguno"}`,
    ).not.toHaveLength(0);
    expect(consumers).toContain("components/scenes/eye/mascots/Sol.tsx");
    expect(consumers).toContain(
      "components/scenes/storyCosmicBeing/storyCosmicBeing.parts.tsx",
    );
    expect(consumers).toContain("components/layout/Brand/BrandName.tsx");
    expect(consumers).toContain("components/sections/Hero/Hero.tsx");
    expect(consumers).toContain("components/sections/Contact/Contact.tsx");
  });

  // Sonda positiva (mismo criterio que no-external-hosts.test.ts): si el
  // propio mecanismo de grep estuviera roto (regex mal escrita, ruta base
  // equivocada...), los dos tests de arriba podrían pasar por VACUIDAD si
  // alguna vez se relajara el `not.toHaveLength(0)`. Confirmar aquí que el
  // mecanismo SÍ encuentra los consumidores YA CONOCIDOS de PRESS/DECK
  // (nunca tuvieron el problema de "cero consumidores": Task 9/Task 4)
  // demuestra que el detector funciona en general, no solo para el caso que
  // se quiere que pase.
  it("sonda positiva: el mismo mecanismo encuentra los consumidores YA CONOCIDOS de PRESS y DECK", () => {
    const pressConsumers = realConsumersOf("PRESS");
    const deckConsumers = realConsumersOf("DECK");

    expect(pressConsumers.length).toBeGreaterThanOrEqual(10);
    expect(pressConsumers).toContain("components/ui/Button/Button.tsx");
    expect(deckConsumers).toContain("components/sections/Story/story.deck.tsx");
    expect(deckConsumers).toContain(
      "components/sections/Journey/journey.deck.tsx",
    );
  });
});
