import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { type as typeTokens } from "@/theme/tokens/type";

/**
 * UNA SOLA LEY PARA LA TIPOGRAFÍA FLUIDA.
 *
 * QUÉ SE CANDA, en una frase: ningún `font-size` del sitio mezcla unidades de
 * viewport (`vw`, `vh`, `dvh`…) con extremos en PÍXELES. Un tamaño fluido se
 * escribe `clamp(<rem>, <vw>, <rem>)` --o `max(<rem>, min(<vw>, …))`--, nunca
 * con un suelo o un techo en px.
 *
 * EL DEFECTO QUE LO MOTIVA, medido el 2026-09-05 en Chrome sobre el build
 * servido (`dcafec4`, tema claro, `reducedMotion: reduce`, 320 px de
 * viewport, `Page.setFontSizes` a 16 y a 32 -- la misma palanca que la
 * preferencia de tamaño de texto del usuario): el `h1` de la portada medía
 * 34px con las DOS raíces, su tagline 15px con las DOS y el cartel de Story
 * 24px con las DOS, mientras el cuerpo de la página doblaba de 16 a 32 en la
 * MISMA muestra. Los tres declaraban su suelo en píxeles y a 320 px el suelo
 * es justo el término que manda (7vw = 22,4px; 2vw = 6,4px; el tope de ancho
 * = 24px), así que el texto no llegaba al 200 % que exige WCAG 1.4.4.
 *
 * POR QUÉ UNA LEY Y NO SOLO DOS TESTS DE COMPONENTE: porque `Hero.test.tsx` y
 * `Story.test.tsx` candan las cuatro declaraciones que HOY existen, y el
 * defecto no era de esas cuatro, era de una convención -- exactamente el
 * patrón que este repo ya pagó con `--nav-gap` y con los rellenos en `rem`
 * (`inline-space-consumers.test.ts`). La quinta declaración fluida que nazca
 * mañana no la mira nadie si la regla vive solo en la memoria de quien
 * escribió las cuatro primeras.
 *
 * CÓMO SE MIDE, y sus límites declarados. Barrido por sistema de ficheros
 * (mismo patrón que `inline-space-consumers.test.ts`), despojo de comentarios
 * --un docblock que CITA `clamp(34px, 7vw, 258px)` en prosa no es código--,
 * localización de las declaraciones `font-size` con lectura del valor
 * respetando paréntesis, llaves e interpolaciones (los `clamp()` multilínea
 * de `Features.tsx` ocupan cinco líneas), y RESOLUCIÓN de los valores que
 * llegan por nombre: una constante `SCREAMING_SNAKE` con una cadena literal
 * (`STORY_DECK_PILLAR_TITLE_SIZE`, `JOURNEY_DECK_STEP_LABEL_SIZE`) o una
 * función que devuelve una plantilla (`storyStatementFontSize`), en dos
 * rondas -- lo justo para que la plantilla de una función pueda a su vez
 * nombrar sus constantes. Es un motor de TEXTO, no un AST:
 *
 *   - Un valor que llega desde un PROP (`font-size: ${({ $iconSide }) =>
 *     $iconSide}` en `IconButton.tsx`) no se puede resolver aquí.
 *   - Un valor que llega desde los TOKENS del tema (`theme.data.type.scale.*`)
 *     tampoco se resuelve por texto: lo cubre el segundo describe de este
 *     fichero, que lee el objeto importado en vez de parsear su fuente.
 *   - Un `font-size` construido en tiempo de ejecución desde una variable no
 *     lleva su valor en la línea y este candado no lo ve.
 *
 * QUÉ NO ES: no persigue el `font-size` LITERAL sin unidades de viewport
 * (`font-size: 18px`) -- de eso se ocupa la familia `font-size-literal` de
 * `scripts/detect-anti-patterns.mjs`, que exime `clamp()` justo porque un
 * tramo fluido es legítimo. Aquí se persigue la MEZCLA, que es lo que rompe
 * el criterio de accesibilidad.
 *
 * ## Validado con el bug inyectado a propósito (regla 34 de RULES.md)
 *
 * Los dos sabotajes se aplicaron de verdad sobre el árbol, se vio el rojo y se
 * restauró. Las líneas van copiadas de la salida, no predichas.
 *
 * 1. DEVOLVIENDO EL DEFECTO REAL AL CÓDIGO -- el suelo del `h1` de `Hero.tsx`
 *    y el de `STORY_STATEMENT_MIN_SIZE` (`Story.tsx`) de vuelta a píxeles. Es
 *    además la prueba de que la resolución por nombre funciona: el de Story
 *    llega a la declaración a DOS saltos (función + constante) y aun así se
 *    ve:
 *
 *      AssertionError: 4 font-size fluido(s) con extremo en pixeles:
 *        src/components/sections/Hero/Hero.tsx | font-size: clamp(34px, var(--hero-title-vw, 7vw), 258px)
 *        src/components/sections/Story/Story.tsx | font-size: ${storyStatementFontSize} | resuelto: max(24px, min(10.5vw, 19.2vh, 21.25rem, calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12)))
 *        src/components/sections/Story/Story.tsx | font-size: ${storyStatementFontSize} | resuelto: max(24px, min(10.5vw, 19.2vh, 21.25rem, calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12)))
 *        src/components/sections/Story/Story.tsx | font-size: ${storyStatementFontSize} | resuelto: max(24px, min(10.5vw, 19.2vh, 21.25rem, calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12)))
 *      Un pixel no crece con la preferencia de tamano de texto del usuario (WCAG 1.4.4): escribe los extremos en rem.: expected [ { …(3) }, { …(3) }, { …(3) }, …(1) ] to have a length of +0 but got 4
 *
 * 2. SUBIENDO EL SUELO DEL CENSO a 999 (la atadura de vacuidad, ejercitada al
 *    revés para leer el censo real). Rojo con el inventario completo, que es
 *    lo que fija el número de la constante:
 *
 *      AssertionError: solo 9 font-size fluidos encontrados: src/components/sections/Features/Features.tsx, src/components/sections/Features/Features.tsx, src/components/sections/Hero/Hero.tsx, src/components/sections/Hero/Hero.tsx, src/components/sections/Journey/journey.deck.tsx, src/components/sections/Story/story.deck.tsx, src/components/sections/Story/Story.tsx, src/components/sections/Story/Story.tsx, src/components/sections/Story/Story.tsx: expected 9 to be greater than or equal to 999
 *
 * Las sondas del último describe cierran lo demás: el mecanismo se ejercita
 * contra fuentes sintéticas con el defecto (positivas) y contra las formas que
 * NO debe cazar (negativas).
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Las dos raíces con piezas de interfaz: componentes y rutas del App Router. */
const RAICES_BARRIDAS = ["src/components", "app"] as const;

const EXTENSIONES = new Set([".ts", ".tsx"]);

/**
 * Suelo del barrido, TECLEADO A MANO (atadura de extensión: que el candado no
 * se vacíe en silencio). El 2026-09-05 el barrido ve 83 ficheros de
 * producción; el suelo se deja en 80.
 */
const MINIMO_FICHEROS_BARRIDOS = 80;

/**
 * Suelo de declaraciones fluidas REALES (atadura de extensión, dirección 2:
 * que la ley no se cumpla por vacuidad). El 2026-09-05 son 9 -- dos en
 * `Hero.tsx`, dos en `Features.tsx`, tres en `Story.tsx` (las del cartel, por
 * `storyStatementFontSize`), una en `story.deck.tsx` y una en
 * `journey.deck.tsx` (las dos por constante con nombre).
 */
const MINIMO_DECLARACIONES_FLUIDAS = 8;

/** Unidades relativas al viewport, incluidas las dinámicas. */
const UNIDAD_VIEWPORT =
  /\d*\.?\d+(?:vw|vh|vmin|vmax|dvw|dvh|svw|svh|lvw|lvh)\b/i;

/**
 * Una longitud en píxeles escrita a mano. Dos constantes y no una: un regex
 * con la bandera `g` conserva `lastIndex` entre llamadas, así que reutilizar
 * el mismo objeto para `test()` daría falsos negativos alternos -- la clase de
 * fallo que deja un candado verde sin que nadie lo note.
 */
const PIXELES = /\d*\.?\d+px\b/i;
const PIXELES_TODOS = /\d*\.?\d+px\b/gi;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONES.has(extname(full))) out.push(full);
  }
  return out;
}

function rutaRelativa(fichero: string): string {
  return fichero.slice(repoRoot.length + 1).replace(/\\/g, "/");
}

/** Ficheros de PRODUCCIÓN de las raíces barridas (el CSS que se sirve, no el
 *  que se afirma en un test). */
function ficherosEscaneados(): string[] {
  const ficheros: string[] = [];
  for (const raiz of RAICES_BARRIDAS) walk(join(repoRoot, raiz), ficheros);
  return ficheros.filter(
    (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );
}

/** Mismo criterio y mismo guard `(?<!:)` que `inline-space-consumers.test.ts`:
 *  un `//` dentro de una URL no abre un comentario. */
function despojarComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/.*$/gm, "");
}

/**
 * Lee el valor que empieza en `inicio` hasta el final de la declaración,
 * respetando anidamiento (un `clamp()` multilínea con interpolaciones dentro
 * cruza varias líneas y contiene comas de nivel interior).
 */
function valorDesde(fuente: string, inicio: number): string {
  let profundidad = 0;
  let i = inicio;
  for (; i < fuente.length; i += 1) {
    const ch = fuente[i];
    if (ch === "(" || ch === "{" || ch === "[") profundidad += 1;
    else if (ch === ")" || ch === "]") profundidad -= 1;
    else if (ch === "}") {
      if (profundidad === 0) break;
      profundidad -= 1;
    }
    if (profundidad === 0 && (ch === ";" || ch === ",")) break;
  }
  return fuente.slice(inicio, i);
}

const DECLARACION = /\bfont-size\s*:\s*/g;

/** Constantes con nombre y funciones que devuelven una plantilla: el puente
 *  entre `font-size: ${NOMBRE}` y el valor que de verdad se pinta. */
const CONSTANTE_CADENA = /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"/g;
const FUNCION_PLANTILLA =
  /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*:\s*string\s*\{\s*return\s+`([^`]*)`/g;

function tablaDeSimbolos(fuentes: readonly string[]): Map<string, string> {
  const tabla = new Map<string, string>();
  for (const fuente of fuentes) {
    for (const hallado of fuente.matchAll(CONSTANTE_CADENA)) {
      tabla.set(hallado[1], hallado[2]);
    }
    for (const hallado of fuente.matchAll(FUNCION_PLANTILLA)) {
      tabla.set(hallado[1], hallado[2]);
    }
  }
  return tabla;
}

/** Sustituye `${NOMBRE}` por el valor del símbolo, en dos rondas. */
function resolver(valor: string, tabla: Map<string, string>): string {
  let actual = valor;
  for (let ronda = 0; ronda < 2; ronda += 1) {
    actual = actual.replace(
      /\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g,
      (original, nombre: string) => tabla.get(nombre) ?? original,
    );
  }
  return actual;
}

interface Declaracion {
  readonly fichero: string;
  readonly bruto: string;
  readonly resuelto: string;
}

function declaracionesDeFontSize(ficheros: readonly string[]): Declaracion[] {
  const fuentes = ficheros.map((f) =>
    despojarComentarios(readFileSync(f, "utf-8")),
  );
  const tabla = tablaDeSimbolos(fuentes);
  const salida: Declaracion[] = [];

  fuentes.forEach((fuente, indice) => {
    for (const encontrado of fuente.matchAll(DECLARACION)) {
      const inicio = (encontrado.index ?? 0) + encontrado[0].length;
      const bruto = valorDesde(fuente, inicio).replace(/\s+/g, " ").trim();
      salida.push({
        fichero: rutaRelativa(ficheros[indice]),
        bruto,
        resuelto: resolver(bruto, tabla).replace(/\s+/g, " ").trim(),
      });
    }
  });

  return salida;
}

/** Las declaraciones que dimensionan con el viewport: las únicas que esta ley
 *  mira. */
function declaracionesFluidas(declaraciones: Declaracion[]): Declaracion[] {
  return declaraciones.filter((d) => UNIDAD_VIEWPORT.test(d.resuelto));
}

describe("una sola ley: ningun font-size fluido lleva suelo ni techo en pixeles", () => {
  it("ninguna declaracion de src/components ni de app mezcla unidades de viewport con pixeles", () => {
    const fluidas = declaracionesFluidas(
      declaracionesDeFontSize(ficherosEscaneados()),
    );
    const infractoras = fluidas.filter((d) => PIXELES.test(d.resuelto));

    const detalle = infractoras
      .map(
        (d) =>
          `  ${d.fichero} | font-size: ${d.bruto}${d.bruto === d.resuelto ? "" : ` | resuelto: ${d.resuelto}`}`,
      )
      .join("\n");

    expect(
      infractoras,
      `${String(infractoras.length)} font-size fluido(s) con extremo en pixeles:\n${detalle}\nUn pixel no crece con la preferencia de tamano de texto del usuario (WCAG 1.4.4): escribe los extremos en rem.`,
    ).toHaveLength(0);
  });

  it("la ley tiene territorio: el barrido ve el arbol entero de piezas de interfaz", () => {
    const ficheros = ficherosEscaneados();

    expect(
      ficheros.length,
      `el barrido encogio: ${String(ficheros.length)} ficheros, por debajo del minimo declarado (${String(MINIMO_FICHEROS_BARRIDOS)}). Si la reduccion es legitima, baja la constante A MANO y explica por que.`,
    ).toBeGreaterThanOrEqual(MINIMO_FICHEROS_BARRIDOS);

    const relativas = ficheros.map(rutaRelativa);
    for (const esperada of [
      "src/components/sections/Hero/Hero.tsx",
      "src/components/sections/Story/Story.tsx",
      "src/components/sections/Features/Features.tsx",
      "src/components/sections/Journey/journey.deck.tsx",
      "app/opengraph-image.tsx",
    ]) {
      expect(relativas, `el barrido no ve ${esperada}`).toContain(esperada);
    }
  });

  it("y tiene sujetos: hay tipografia fluida REAL que vigilar, no solo una ley que nadie puede incumplir", () => {
    const fluidas = declaracionesFluidas(
      declaracionesDeFontSize(ficherosEscaneados()),
    );

    expect(
      fluidas.length,
      `solo ${String(fluidas.length)} font-size fluidos encontrados: ${fluidas.map((d) => d.fichero).join(", ")}`,
    ).toBeGreaterThanOrEqual(MINIMO_DECLARACIONES_FLUIDAS);

    const ficheros = new Set(fluidas.map((d) => d.fichero));
    for (const esperado of [
      "src/components/sections/Hero/Hero.tsx",
      "src/components/sections/Story/Story.tsx",
      "src/components/sections/Features/Features.tsx",
      "src/components/sections/Story/story.deck.tsx",
      "src/components/sections/Journey/journey.deck.tsx",
    ]) {
      expect(
        Array.from(ficheros),
        `${esperado} dejo de aportar tipografia fluida al censo (o el resolutor dejo de verla)`,
      ).toContain(esperado);
    }
  });
});

describe("la misma ley en el origen: la escala tipografica del tema", () => {
  it("ningun peldano de type.scale mezcla unidades de viewport con pixeles", () => {
    const fluidos = Object.entries(typeTokens.scale).filter(([, escalon]) =>
      UNIDAD_VIEWPORT.test(escalon.size),
    );

    // El instrumento correcto aqui no es parsear la fuente del token, es leer
    // el objeto que el CSS consume.
    expect(
      fluidos.length,
      "type.scale dejo de tener peldanos fluidos: el censo de esta ley se vacio",
    ).toBeGreaterThanOrEqual(3);

    for (const [nombre, escalon] of fluidos) {
      expect(
        escalon.size.match(PIXELES_TODOS) ?? [],
        `type.scale.${nombre}.size mezcla viewport y pixeles: "${escalon.size}"`,
      ).toHaveLength(0);
    }
  });
});

describe("sondas del extractor: el mecanismo caza lo que dice cazar", () => {
  /** Ejecuta el extractor sobre una fuente sintetica, sin tocar el disco. */
  function fluidasDe(fuente: string): Declaracion[] {
    const limpia = despojarComentarios(fuente);
    const tabla = tablaDeSimbolos([limpia]);
    const salida: Declaracion[] = [];
    for (const encontrado of limpia.matchAll(DECLARACION)) {
      const inicio = (encontrado.index ?? 0) + encontrado[0].length;
      const bruto = valorDesde(limpia, inicio).replace(/\s+/g, " ").trim();
      salida.push({
        fichero: "sonda",
        bruto,
        resuelto: resolver(bruto, tabla).replace(/\s+/g, " ").trim(),
      });
    }
    return declaracionesFluidas(salida);
  }

  function infractorasDe(fuente: string): Declaracion[] {
    return fluidasDe(fuente).filter((d) => PIXELES.test(d.resuelto));
  }

  it("SONDA POSITIVA: caza el defecto real que motivo la ley (el clamp del h1 antes del arreglo)", () => {
    const infractoras = infractorasDe(
      "const Sc = styled.div`\n  font-size: clamp(34px, var(--hero-title-vw, 7vw), 258px);\n`;",
    );
    expect(infractoras).toHaveLength(1);
    expect(infractoras[0].bruto).toContain("34px");
  });

  it("SONDA POSITIVA: caza un clamp multilinea, como los de Features", () => {
    expect(
      infractorasDe(
        "font-size: clamp(\n    24px,\n    min(5vw, 3.6dvh),\n    ${({ theme }) => theme.data.type.scale.h2.size}\n  );",
      ),
    ).toHaveLength(1);
  });

  it("SONDA POSITIVA: caza el defecto escondido detras de una constante con nombre", () => {
    const infractoras = infractorasDe(
      'const MI_TAMANO = "clamp(24px, 10vw, 340px)";\nconst Sc = styled.p`\n  font-size: ${MI_TAMANO};\n`;',
    );
    expect(infractoras).toHaveLength(1);
    expect(infractoras[0].resuelto).toBe("clamp(24px, 10vw, 340px)");
  });

  it("SONDA POSITIVA: caza el defecto a DOS saltos (funcion que nombra su constante)", () => {
    const infractoras = infractorasDe(
      'const MI_SUELO = "24px";\nfunction miTamano(): string {\n  return `max(${MI_SUELO}, min(10.5vw, 340px))`;\n}\nconst Sc = styled.span`\n  font-size: ${miTamano};\n`;',
    );
    expect(infractoras).toHaveLength(1);
    expect(infractoras[0].resuelto).toBe("max(24px, min(10.5vw, 340px))");
  });

  it("SONDA NEGATIVA: la forma correcta (extremos en rem) no dispara", () => {
    expect(
      infractorasDe(
        "font-size: clamp(2.125rem, var(--hero-title-vw, 7vw), 16.125rem);",
      ),
    ).toHaveLength(0);
  });

  it("SONDA NEGATIVA: un font-size en pixeles SIN unidad de viewport no es de esta ley", () => {
    expect(fluidasDe("font-size: 18px;")).toHaveLength(0);
  });

  it("SONDA NEGATIVA: otra propiedad con la misma mezcla no es de esta ley", () => {
    expect(fluidasDe("padding-inline: clamp(16px, 5vw, 32px);")).toHaveLength(
      0,
    );
  });

  it("SONDA NEGATIVA: el defecto CITADO en un comentario no es codigo", () => {
    expect(
      infractorasDe(
        "/* font-size: clamp(34px, 7vw, 258px) vivio aqui hasta la ola de WCAG 1.4.4 */\n  font-size: clamp(2.125rem, 7vw, 16.125rem);",
      ),
    ).toHaveLength(0);
  });
});
