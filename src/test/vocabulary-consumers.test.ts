import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { REVEAL, DECK, PRESS, AMBIENT, OVERLAY } from "@/motion/vocabulary";

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
 *
 * ## Fix de revisión (fix wave B, 2026-08-12): el candado medía por GRUPO,
 * no por CAMPO -- añade `fieldConsumersOf`, mide por campo y suma `OVERLAY`
 *
 * `realConsumersOf(group)` (abajo) comprueba que exista AL MENOS UN campo
 * del grupo con consumidor real -- suficiente para que el GRUPO pase, pero
 * no para que cada CAMPO tenga uno. La review final de rama demostró el
 * agujero con el código delante: `DECK` pasaba este candado gracias a
 * `railDurationMs`/`exitDurationMs`, mientras `slideDurationMs`/`slideShift`/
 * `scrubMs`/`sceneDepthShift` llevaban desde su creación sin ningún
 * consumidor -- cuatro campos muertos escondidos detrás de dos vivos. Y
 * `OVERLAY` (Task 17) no tenía NINGÚN candado, ni de grupo ni de campo --
 * el único de los cinco grupos sin cobertura.
 *
 * `fieldConsumersOf(group, field)` (nuevo) mide `\b${group}\.${field}\b`
 * (borde de campo exacto, para que `DECK.railDurationMs` no cuente como
 * consumidor de un `DECK.rail` que no existe) y el describe "cada CAMPO de
 * cada grupo tiene consumidor real" itera las claves REALES de los cinco
 * objetos importados (`Object.keys(REVEAL)`, etc.), no una lista escrita a
 * mano -- así un campo nuevo queda cubierto automáticamente el día que se
 * añada, sin que nadie tenga que acordarse de ampliar este fichero. Fix wave
 * B retiró los cinco campos que este candado, de haber existido antes, habría
 * atrapado (`REVEAL.stepMs`, `DECK.slideDurationMs`/`slideShift`/`scrubMs`/
 * `sceneDepthShift` -- ver `vocabulary.ts` para el porqué de cada retirada),
 * así que hoy los cinco grupos pasan con cero campos huérfanos.
 *
 * Verificado con el bug inyectado a propósito (regla 34): se añadió
 * temporalmente un campo `phantomMs: 1` a `PRESS` en `vocabulary.ts` (sin
 * ningún consumidor real) -- el nuevo test "cada CAMPO..." cayó en rojo
 * señalando `PRESS.phantomMs: cero consumidores reales`, mientras que
 * `realConsumersOf("PRESS")` (el candado de grupo, sin tocar) seguía en
 * verde -- confirma exactamente el agujero que este fix cierra. Retirado el
 * campo, volvió a verde.
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

/**
 * Despoja comentarios de bloque y de línea ANTES de buscar (lección del
 * repo, `task/lessons.md` 2026-08-11): un docblock que CITA
 * `REVEAL.durationMs` en prosa para explicar una migración no puede contar
 * como "consumo real" -- solo el CÓDIGO que sobrevive a este despojo cuenta.
 *
 * Fix de revisión (Task 19): un `//` de línea NO siempre abre un comentario
 * -- `"https://…"` lo contiene dentro de un string, y un despojo ciego
 * (`\/\/.*$`) trunca el resto de la línea, incluida cualquier referencia de
 * código real que viniera DESPUÉS en esa misma línea (falso negativo: un
 * consumidor real desaparecería de la lista). El guard `(?<!:)` exige que el
 * `//` NO esté precedido por `:` -- cubre el caso real y común (`http://`,
 * `https://`, y cualquier URL con esquema), que es la fuente casi universal
 * de `//` dentro de un string en código TypeScript de este repo (verificado:
 * `src/config/links.ts`/`src/seo/*` son los únicos ficheros con URLs
 * literales, y ninguno comparte línea con un símbolo de vocabulario). NO es
 * un tokenizador completo -- una línea con `//` dentro de un string que NO
 * vaya precedido de `:` (infrecuente, no observado en este repo) seguiría
 * truncándose de más; declarado como límite conocido, no escondido.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/.*$/gm, "");
}

/** Los cinco grupos del vocabulario. `OVERLAY` (Task 17) se suma a la unión
 *  en el fix wave B (2026-08-12): era el único de los cinco sin candado,
 *  ni de grupo ni de campo. */
type VocabularyGroup = "REVEAL" | "AMBIENT" | "PRESS" | "DECK" | "OVERLAY";

/**
 * Ficheros de PRODUCCIÓN (no tests, no el propio `vocabulary.ts`) que
 * consumen `${group}.<campo>` de verdad -- acceso de propiedad en CÓDIGO
 * activo, no solo el import y no una cita en un comentario.
 */
function realConsumersOf(group: VocabularyGroup): string[] {
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

/**
 * Igual que `realConsumersOf`, pero acotado a UN CAMPO concreto del grupo
 * (`\b${group}\.${field}\b`, borde de campo exacto -- así `DECK.rail` no
 * cuenta como consumidor de `DECK.railDurationMs`). Es la pieza que faltaba
 * para medir el candado por CAMPO en vez de por GRUPO (fix wave B,
 * 2026-08-12, ver el docblock de cabecera de este fichero).
 */
function fieldConsumersOf(group: VocabularyGroup, field: string): string[] {
  const files = walk(srcRoot);
  const pattern = new RegExp(`\\b${group}\\.${field}\\b`);
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

  // OVERLAY (Task 17) era el único de los cinco grupos sin NINGÚN candado
  // antes de esta revisión (fix wave B, 2026-08-12). Mismo criterio de sonda
  // positiva que arriba: confirma que el mecanismo encuentra sus
  // consumidores YA CONOCIDOS (Navbar.tsx/NavSheet.tsx, Task 9/10/17).
  it("sonda positiva: OVERLAY.* se consume de verdad desde Navbar.tsx y NavSheet.tsx", () => {
    const overlayConsumers = realConsumersOf("OVERLAY");

    expect(overlayConsumers).toContain("components/layout/Navbar/Navbar.tsx");
    expect(overlayConsumers).toContain("components/layout/Navbar/NavSheet.tsx");
  });
});

/**
 * Fix de revisión (fix wave B, 2026-08-12): el candado de arriba solo exige
 * un consumidor por GRUPO -- ver el docblock de cabecera de este fichero
 * para la medición completa (`DECK` pasaba con dos campos vivos y cuatro
 * campos muertos escondidos detrás). Este bloque mide por CAMPO: itera las
 * claves REALES de cada grupo exportado por `vocabulary.ts` (nunca una
 * lista escrita a mano, que se desincronizaría el día que alguien añada o
 * retire un campo) y exige que CADA UNO tenga al menos un consumidor real de
 * producción.
 */
describe("fix wave B: cada CAMPO de cada grupo del vocabulario tiene consumidor real, no solo el grupo", () => {
  const GROUPS: Record<VocabularyGroup, Record<string, unknown>> = {
    REVEAL,
    DECK,
    PRESS,
    AMBIENT,
    OVERLAY,
  };

  for (const [groupName, groupValue] of Object.entries(GROUPS) as Array<
    [VocabularyGroup, Record<string, unknown>]
  >) {
    describe(groupName, () => {
      for (const field of Object.keys(groupValue)) {
        it(`${groupName}.${field} tiene al menos un consumidor real de producción`, () => {
          const consumers = fieldConsumersOf(groupName, field);
          expect(
            consumers,
            `${groupName}.${field}: cero consumidores reales -- migra un consumidor o retira el campo (ver el docblock de ${groupName} en vocabulary.ts)`,
          ).not.toHaveLength(0);
        });
      }
    });
  }
});

/*
 * Fix de revisión (Task 19): `stripComments` despoja `//` de línea con un
 * regex ciego (`\/\/.*$`), que trunca cualquier `//` -- incluido el que vive
 * dentro de un string (`"https://…"`), no solo el que abre un comentario
 * real. Sin el guard `(?<!:)`, una línea con una URL y un uso REAL de
 * `REVEAL.`/`AMBIENT.` a su derecha desaparecería entera -- un falso
 * negativo silencioso en el candado cuyo trabajo es justo no tener falsos
 * negativos. Validado con el bug inyectado a propósito: quitando `(?<!:)`
 * del regex (dejando `\/\/.*$` a secas, el código previo a este fix), el
 * segundo test de este bloque cae en rojo; restaurado, vuelve a verde.
 */
describe("Task 19 (fix de revisión): stripComments no trunca una linea por un `//` dentro de una URL", () => {
  it("SI despoja un comentario de linea real", () => {
    const fuente =
      "const x = 1; // REVEAL.durationMs citado en un comentario\nconst y = 2;";
    const limpio = stripComments(fuente);
    expect(limpio).not.toContain("REVEAL.durationMs");
    expect(limpio).toContain("const x = 1;");
    expect(limpio).toContain("const y = 2;");
  });

  it("NO trunca codigo real que viene DESPUES de una URL en la misma linea", () => {
    // example.invalid (RFC 2606): TLD reservado que nunca resuelve a un host
    // real -- mismo marcador que ya usa Button.test.tsx, y ya vive en la
    // allowlist de no-external-hosts.test.ts (Task 18), asi que este literal
    // no necesita (ni merece) una excepcion nueva en ese candado.
    const fuente =
      'const href = "https://example.invalid"; const d = REVEAL.durationMs;';
    const limpio = stripComments(fuente);
    expect(limpio).toContain("REVEAL.durationMs");
    expect(limpio).toContain("https://example.invalid");
  });
});
