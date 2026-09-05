import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { inlineSpace } from "@/theme/tokens/space";

/**
 * UNA SOLA LEY PARA EL RELLENO DEL EJE INLINE.
 *
 * QUÉ SE CANDA, en una frase: ningún relleno del eje en línea de una pieza de
 * `src/components/`, de `src/theme/` o de `app/` lee un peldaño DESNUDO de
 * `theme.data.space` --ni escrito en su propia línea ni heredado de una
 * custom property--; los lee de `theme.data.inlineSpace`, salvo las
 * excepciones declaradas más abajo con su motivo escrito. El eje de BLOQUE
 * (`padding-block`, `padding-top`, `padding-bottom`) y los huecos (`gap`) no
 * entran: siguen en `space` a propósito, y este candado no los mira.
 *
 * EL DEFECTO QUE LO MOTIVA, medido el 2026-09-05 sobre el build de producción
 * servido en Chrome con `Page.setFontSizes` a 32 px --la MISMA palanca que la
 * preferencia de tamaño de texto del usuario que exige WCAG 1.4.4--,
 * `prefers-reduced-motion: reduce` y 320 px de viewport: los rellenos
 * laterales en `rem` se doblaban mientras el viewport se quedaba donde estaba,
 * y anidados (sección + tarjeta + panel + control) se comían la columna. En
 * tema claro, la columna de texto de las tarjetas de canal de Contacto medía
 * 23,2 px --27 caracteres en 23 líneas--, el texto de ayuda del formulario 28
 * px (99 caracteres en 61 líneas) y el rótulo del CTA salía letra por línea
 * (58,8 px en 9). El arreglo anterior (`overflow-wrap: anywhere`, crítica #19)
 * había convertido la PÉRDIDA de texto en ILEGIBILIDAD.
 *
 * POR QUÉ UN CANDADO DE LEY Y NO UN TEST POR COMPONENTE: porque el defecto no
 * era de un componente, era de una convención. Migrar veinte ficheros y dejar
 * la regla en la memoria de quien los migró garantiza que el vigesimoprimero
 * nazca en `rem` -- es exactamente el patrón que este repo ya ha pagado con
 * `--nav-gap` (crítica #18: un espaciado literal invisible para el gate
 * durante meses). Aquí la regla se ejecuta.
 *
 * CÓMO SE MIDE, y sus límites declarados: barrido de ficheros por sistema de
 * ficheros (mismo patrón que `vocabulary-consumers.test.ts` y
 * `no-external-hosts.test.ts`), despojo de comentarios --un docblock que CITA
 * `space[5]` en prosa no puede contar como código, lección del repo del
 * 2026-08-11--, localización de las declaraciones de relleno con una expresión
 * regular y lectura del VALOR con un recorrido que respeta paréntesis,
 * llaves e interpolaciones, para poder partir la abreviatura en sus términos
 * y quedarse solo con los del eje en línea. Es un motor de TEXTO, no un AST:
 * un relleno construido en tiempo de ejecución desde una variable (por
 * ejemplo `padding: ${unaFuncion(theme)}`) no lleva el peldaño en la línea y
 * este candado no lo ve. Declarado, no escondido.
 *
 * ## LAS CUSTOM PROPERTIES TAMBIÉN CUENTAN (ampliación del 2026-09-05)
 *
 * EL PUNTO CIEGO QUE SE CIERRA, y no es hipotético: `--nav-gap` se declaraba
 * en `GlobalStyles.tsx` como `${space[2]}` y `Navbar.tsx` la consumía en TRES
 * rellenos del eje en línea --el `padding-inline` de `ScHeader` y los dos
 * términos del suelo de `ScNav`--. Ninguno de los cuatro sitios era visible
 * para esta ley: la declaración vivía fuera del barrido (`src/theme` no estaba
 * en `RAICES_BARRIDAS`) y los consumos no llevaban ningún peldaño en su línea,
 * solo un `var()`. Un espaciado que dobla con la raíz tipográfica entrando en
 * la columna por una puerta que el candado no miraba -- el mismo patrón que la
 * crítica #18 ya había pagado con esta misma variable.
 *
 * CÓMO SE RESUELVE: el barrido indexa las DECLARACIONES de custom property que
 * encuentra (`DECLARACION_CUSTOM`, con guard a la izquierda para no confundir
 * una declaración con la referencia de un `var(--x, 0px)`) y guarda TODOS los
 * valores de cada nombre, porque una misma propiedad se redeclara por media
 * query (`--story-statement-pad`, `Story.tsx`) y basta con que UNO de esos
 * tramos meta un peldaño desnudo. Después, por cada `var()` que aparezca en un
 * término del eje en línea, se leen esos valores y se busca en ellos el
 * peldaño. El hallazgo se anota con el nombre de la propiedad en `via`, para
 * que el mensaje diga por dónde entró y no solo que entró.
 *
 * Y SI LA DECLARACIÓN NO APARECE, el caso NO se da por bueno: hay un tercer
 * caso ("toda custom property que llega a un relleno del eje inline se declara
 * DENTRO del barrido") que lo denuncia. Una `var()` que el barrido no puede
 * resolver es un valor del que la ley no puede responder, y callarlo sería
 * exactamente la vacuidad que las otras dos ataduras evitan.
 *
 * ## Validado con el bug inyectado a propósito (regla 34 de RULES.md)
 *
 * Los tres sabotajes se aplicaron de verdad, se vio el rojo, se restauró y se
 * volvió a ver el verde (13/13). Las líneas van copiadas de la salida, no
 * predichas: la lección del 2026-08-17 (bis) de este repo se pagó por escribir
 * «validado con el bug inyectado» sobre una predicción razonable y falsa.
 *
 * 1. DEVOLVIENDO A `space` UN RELLENO YA MIGRADO -- el término lateral de
 *    `ScCard` (`src/components/ui/Card/Card.tsx`), de `inlineSpace[6]` a
 *    `space[6]`. Rojo en DOS casos, la ley y la atadura de consumidores:
 *
 *      AssertionError: 1 relleno(s) del eje inline leen un peldano desnudo de space sin excepcion declarada:
 *        src/components/ui/Card/Card.tsx | padding | space[6] | termino inline: "${({ theme }) => theme.data.space[6]}"
 *      Migralos a theme.data.inlineSpace[n], o declara la excepcion con su motivo en EXCEPCIONES (este fichero).: expected [ { …(4) } ] to have a length of +0 but got 1
 *
 *      AssertionError: src/components/ui/Card/Card.tsx dejo de consumir inlineSpace: expected [ …(18) ] to include 'src/components/ui/Card/Card.tsx'
 *
 * 2. ENCOGIENDO EL BARRIDO -- `RAICES_BARRIDAS` reducido a `["app"]`, que es
 *    la raíz sin ningún relleno migrado. Rojo en las tres ataduras de
 *    extensión, que es exactamente lo que tienen que hacer cuando la ley se
 *    queda sin territorio que vigilar:
 *
 *      AssertionError: el barrido encogio: 16 ficheros, por debajo del minimo declarado (80). Si la reduccion es legitima, baja la constante A MANO y explica por que.: expected 16 to be greater than or equal to 80
 *
 *      AssertionError: solo 0 ficheros de produccion consumen inlineSpace: : expected 0 to be greater than or equal to 18
 *
 *      AssertionError: excepcion declarada que ya no describe el relleno que decia: src/components/layout/Navbar/NavSheet.tsx | padding-inline | space[1] (esperadas 1 apariciones, encontradas 0). Retirala o corrigela: una excepcion caducada es un permiso en blanco, y una aparicion de mas es un caso que nadie ha decidido.: expected +0 to be 1 // Object.is equality
 *
 * 3. ROMPIENDO LA LISTA DE EXCEPCIONES -- la entrada del `padding-left` de
 *    `ScTocList` pasa del peldaño 4 al 7, que a la vez retira el permiso del
 *    caso real y deja la excepción describiendo algo que no existe. Rojo en
 *    las DOS direcciones a la vez:
 *
 *      AssertionError: 1 relleno(s) del eje inline leen un peldano desnudo de space sin excepcion declarada:
 *        src/components/legal/legalPage.parts.tsx | padding-left | space[4] | termino inline: "${({ theme }) => theme.data.space[4]}"
 *
 *      AssertionError: excepcion declarada que ya no describe el relleno que decia: src/components/legal/legalPage.parts.tsx | padding-left | space[7] (esperadas 1 apariciones, encontradas 0). Retirala o corrigela: una excepcion caducada es un permiso en blanco, y una aparicion de mas es un caso que nadie ha decidido.: expected +0 to be 1 // Object.is equality
 *
 * ## Validación de la ampliación de custom properties (2026-09-05)
 *
 * PRIMERO, EL HALLAZGO REAL. Con la resolución de `var()` ya escrita y
 * `Navbar.tsx` todavía sin migrar (el árbol tal cual en `dcafec4`), la ley
 * denunció los tres consumos de golpe. Copiado de la salida; el primero
 * entero, y los otros dos con su término elidido por longitud --son el `calc`
 * completo del suelo de `ScNav`, que ocupa cuatro líneas de código:
 *
 *      AssertionError: 3 relleno(s) del eje inline leen un peldano desnudo de space sin excepcion declarada:
 *        src/components/layout/Navbar/Navbar.tsx | padding-inline | space[2] | via --nav-gap | termino inline: "var(--nav-gap)"
 *        src/components/layout/Navbar/Navbar.tsx | padding-right | space[2] | via --nav-gap | termino inline: "calc( max( calc(...
 *        src/components/layout/Navbar/Navbar.tsx | padding-left | space[2] | via --nav-gap | termino inline: "calc( max( calc(...
 *      Migralos a theme.data.inlineSpace[n], o declara la excepcion con su motivo en EXCEPCIONES (este fichero).: expected [ { …(5) }, { …(5) }, { …(5) } ] to have a length of +0 but got 3
 *
 * 4. DEVOLVIENDO EL RELLENO A LA CUSTOM PROPERTY -- el `padding-inline` de
 *    `ScHeader` (`Navbar.tsx`), de `inlineSpace[2]` a `var(--nav-gap)`, con la
 *    declaración de `--nav-gap` intacta en `space[2]`:
 *
 *      AssertionError: 1 relleno(s) del eje inline leen un peldano desnudo de space sin excepcion declarada:
 *        src/components/layout/Navbar/Navbar.tsx | padding-inline | space[2] | via --nav-gap | termino inline: "var(--nav-gap)"
 *      Migralos a theme.data.inlineSpace[n], o declara la excepcion con su motivo en EXCEPCIONES (este fichero).: expected [ { …(5) } ] to have a length of +0 but got 1
 *
 * 5. SACANDO `src/theme` DEL BARRIDO -- la raíz nueva fuera de
 *    `RAICES_BARRIDAS`, todo lo demás igual. Rojo por el suelo:
 *
 *      AssertionError: el barrido encogio: 83 ficheros, por debajo del minimo declarado (95). Si la reduccion es legitima, baja la constante A MANO y explica por que.: expected 83 to be greater than or equal to 95
 *
 * 5-bis. EL MISMO SABOTAJE CON EL SUELO BAJADO A 80, para que la comprobación
 *    siguiente llegue a ejecutarse (la primera aserción del caso corta el
 *    resto). Rojo por la pieza nombrada:
 *
 *      AssertionError: el barrido no ve src/theme/GlobalStyles.tsx: expected [ …(83) ] to include 'src/theme/GlobalStyles.tsx'
 *
 * 6. APUNTANDO A UNA CUSTOM PROPERTY QUE NADIE DECLARA -- el mismo
 *    `padding-inline` de `ScHeader` a `var(--hueco-sin-declarar)`. La ley de
 *    peldaños queda en verde (no hay peldaño que leer) y salta la atadura que
 *    existe justo para eso:
 *
 *      AssertionError: 1 referencia(s) var() en el eje inline que el barrido no puede resolver:
 *        src/components/layout/Navbar/Navbar.tsx | padding-inline | --hueco-sin-declarar
 *      Una custom property cuya declaracion queda fuera del barrido es un peldano que la ley no puede leer: o su fichero entra en RAICES_BARRIDAS, o el relleno lee el token directamente.: expected [ { …(3) } ] to have a length of +0 but got 1
 *
 * Los cuatro sabotajes se aplicaron y se deshicieron dentro de un solo comando
 * encadenado, con la restauración por sustitución inversa y NUNCA con
 * `git checkout` --el árbol tenía trabajo sin commitear, y un `checkout` de
 * ruta lo borra: pasó en esta misma sesión y costó rehacer dos ficheros
 * enteros--. Verde restaurado y comprobado en cada vuelta: 18/18 aquí y
 * 143/143 en `Navbar.test.tsx`.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Las tres raíces que escriben CSS del sitio: los componentes, las rutas del
 * App Router y `src/theme` -- que no es "solo tokens": `GlobalStyles.tsx`
 * declara reglas globales y custom properties de layout, y una de ellas
 * (`--nav-gap`) llegaba a un `padding-inline` sin que esta ley la viera. Es la
 * misma lista de raíces que barre `css-template-comments.test.ts`, por el mismo
 * motivo: donde hay un template de styled-components hay CSS que se sirve.
 */
const RAICES_BARRIDAS = ["src/components", "src/theme", "app"] as const;

const EXTENSIONES = new Set([".ts", ".tsx"]);

/**
 * Suelo del barrido, TECLEADO A MANO (atadura de extensión, dirección 1: que
 * el candado no se vacíe en silencio). El 2026-09-05, con `src/theme` dentro,
 * el barrido ve 101 ficheros (eran 83 con dos raíces); el suelo se deja en 95
 * --el mismo que `css-template-comments.test.ts` sobre las mismas tres
 * raíces-- para que una reorganización pequeña no lo ponga rojo por sí sola, y
 * lo bastante cerca para que vaciar el barrido --el fallo que de verdad
 * importa, porque dejaría la ley pasando por vacuidad-- no pueda pasar
 * desapercibido. Retirar una raíz entera lo tumba: sin `src/theme` el barrido
 * cae a 83.
 */
const MINIMO_FICHEROS_BARRIDOS = 95;

/**
 * Suelo de consumidores REALES del token (atadura de extensión, dirección 2:
 * que la ley no se cumpla porque nadie usa el token). El 2026-09-05 son 19
 * ficheros de producción, y el suelo se deja en 18.
 *
 * CÓMO SE CUENTAN, escrito para que la próxima revisión no tenga que deducirlo
 * ni fiarse de esta cifra: son los ficheros que devuelve `ficherosEscaneados()`
 * --las tres raíces, sin `.test.ts(x)`-- cuya fuente, con los comentarios ya
 * despojados, casa la expresión regular de `inlineSpace` seguido de corchete.
 * Es el mismo cómputo que ejecuta el caso "el token tiene consumidores
 * REALES", así que la cifra se puede releer sin instrumento propio: se sube el
 * suelo a 999 y el mensaje del rojo los lista uno a uno. Hasta esta fecha aquí
 * ponía "son 20", uno de más: el revisor adversarial de la ola R lo replicó
 * con esta misma lógica y le dieron 19. Los 19 son las seis piezas de
 * `layout/` (Footer, LanguageSelector, Navbar, NavSheet, SkipLink,
 * ThemeToggle), `legalPage.parts.tsx`, las nueve de `sections/` (About,
 * Contact, Features, Hero, Journey, journey.deck, NotFound, Story,
 * story.deck) y tres primitivos de `ui/` (Button, Card, Input). Añadir
 * `src/theme` al barrido no mueve esta cifra: los tokens DECLARAN
 * `inlineSpace`, no lo indexan.
 */
const MINIMO_CONSUMIDORES = 18;

interface ExcepcionDeclarada {
  /** Ruta relativa a la raíz del repo, con `/`. */
  readonly fichero: string;
  /** Propiedad tal y como se declara en el CSS. */
  readonly propiedad: string;
  /** Peldaño de `space` que se conserva. */
  readonly peldano: number;
  /** Custom property por la que el peldaño llega al término, cuando el relleno
   *  no lo escribe sino que lo hereda de un `var()`. Ausente en el caso
   *  normal, en el que el término cita el peldaño directamente. */
  readonly via?: string;
  /** Cuántas veces aparece ese peldaño desnudo en términos inline de ese
   *  fichero y esa propiedad. Se compara con igualdad: una segunda aparición
   *  bajo la misma excepción es un caso NUEVO que nadie ha decidido. */
  readonly apariciones: number;
  readonly motivo: string;
}

/**
 * Las únicas piezas que conservan un peldaño desnudo de `space` en el eje en
 * línea. Cada una con su motivo: una excepción sin motivo es un permiso, y un
 * permiso no se distingue de un olvido.
 */
const EXCEPCIONES: readonly ExcepcionDeclarada[] = [
  {
    fichero: "src/components/layout/Navbar/NavSheet.tsx",
    propiedad: "padding-inline",
    peldano: 1,
    apariciones: 1,
    motivo:
      "ScSheetLanguage: la escala acotada arranca en el peldano 2, que es el primero con consumidor real en el eje inline (docblock de inlineSpace). El peldano 1 son 4 px por defecto y 8 al 200 %: no compite con ninguna columna.",
  },
  {
    fichero: "src/components/legal/legalPage.parts.tsx",
    propiedad: "padding-left",
    peldano: 4,
    apariciones: 1,
    motivo:
      "ScTocList: no es el rail que separa el texto del borde de la pantalla, es el hueco donde el navegador PINTA los numeros de la lista. Crece con la fuente porque el marcador crece con la fuente; acotarlo dejaria los numeros fuera de su caja justo cuando mas grandes son.",
  },
  {
    fichero: "src/components/legal/legalPage.parts.tsx",
    propiedad: "padding-left",
    peldano: 5,
    apariciones: 1,
    motivo:
      "ScList: mismo motivo que ScTocList, con el marcador de vinetas en vez del numero.",
  },
  {
    fichero: "src/components/sections/Journey/Journey.tsx",
    propiedad: "padding-inline-end",
    peldano: 5,
    apariciones: 1,
    motivo:
      "ScStepsAndQuote: el termino no es aire, es la reserva del ancho de la figura decorativa (JOURNEY_FIGURE_WIDTH mas su hueco), y solo existe desde el breakpoint xl, donde el viewport es ancho y los dos valores coinciden de todas formas.",
  },
  {
    fichero: "src/components/sections/Story/story.deck.tsx",
    propiedad: "padding-inline-end",
    peldano: 5,
    apariciones: 1,
    motivo:
      "ScDeck: el sumando central de la geometria del rail es el ANCHO REAL de la diana de la marca (24 px de WCAG 2.5.8), no aire. Acotarlo reservaria menos canal del que el rail ocupa al 200 % de texto. Los otros dos sumandos, que si son aire, leen inlineSpace.",
  },
  {
    fichero: "src/components/sections/Journey/journey.deck.tsx",
    propiedad: "padding-inline-end",
    peldano: 5,
    apariciones: 1,
    motivo:
      "ScJourneyDeck: gemelo declarado del deck de Story (deuda 'Decks Story/Journey gemelos', RULES.md), mismo reparto y mismo motivo.",
  },
];

/** Recorre `dir` y devuelve las rutas de los ficheros a escanear. */
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

/** Ficheros de PRODUCCIÓN de las raíces barridas (los tests no cuentan: el
 *  candado mide el CSS que se sirve, no el que se afirma). */
function ficherosEscaneados(): string[] {
  const ficheros: string[] = [];
  for (const raiz of RAICES_BARRIDAS) walk(join(repoRoot, raiz), ficheros);
  return ficheros.filter(
    (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );
}

/**
 * Despoja comentarios de bloque y de línea. Mismo criterio y mismo guard
 * `(?<!:)` que `vocabulary-consumers.test.ts`: un `//` dentro de una URL no
 * abre un comentario.
 */
function despojarComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/.*$/gm, "");
}

/**
 * Localiza el NOMBRE de un relleno del eje en línea (o la abreviatura, que
 * lleva términos de los dos ejes). Las longhands del eje de bloque
 * (`padding-block`, `padding-top`, `padding-bottom`) no están en la
 * alternativa a propósito, y por eso no las caza: no compiten con la columna.
 */
const DECLARACION =
  /\bpadding(-inline-start|-inline-end|-inline|-left|-right)?\s*:\s*/g;

/**
 * Lee el valor que empieza en `inicio` hasta el final de la declaración,
 * respetando anidamiento. Un `;` cierra una declaración CSS; una `,` de nivel
 * cero cierra la propiedad de un objeto de estilo de JavaScript (`padding:
 * "80px",` en `app/opengraph-image.tsx`), que no es CSS pero comparte el
 * nombre; una `}` de nivel cero cierra el bloque. Ninguna de las tres puede
 * aparecer dentro de un `calc()`, un `min()` o un `${...}` sin estar anidada.
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

/** Parte un valor en sus términos de nivel cero (la abreviatura del relleno
 *  admite de uno a cuatro). */
function partirValor(valor: string): string[] {
  const partes: string[] = [];
  let actual = "";
  let profundidad = 0;
  for (const ch of valor) {
    if (ch === "(" || ch === "{" || ch === "[") profundidad += 1;
    else if (ch === ")" || ch === "}" || ch === "]") profundidad -= 1;
    if (profundidad === 0 && /\s/.test(ch)) {
      if (actual.trim() !== "") partes.push(actual.trim());
      actual = "";
    } else actual += ch;
  }
  if (actual.trim() !== "") partes.push(actual.trim());
  return partes;
}

/**
 * Los términos del valor que gobiernan el eje EN LÍNEA. Con la abreviatura:
 * un término vale para los dos ejes, dos y tres términos ponen el inline en
 * el segundo, y cuatro lo reparten entre el segundo (derecha) y el cuarto
 * (izquierda). Con una longhand del eje en línea, el valor entero.
 */
function terminosInline(sufijo: string, valor: string): string[] {
  if (sufijo !== "") return [valor.trim()];
  const partes = partirValor(valor);
  if (partes.length === 1) return [partes[0]];
  if (partes.length === 2 || partes.length === 3) return [partes[1]];
  if (partes.length === 4) return [partes[1], partes[3]];
  return [];
}

/**
 * Peldaños DESNUDOS de `space` dentro de un término. `inlineSpace[5]` no
 * dispara: la `S` mayúscula lo separa del `space[5]` que se persigue, y el
 * guard de la izquierda evita que un identificador que TERMINE en `space` se
 * confunda con el token.
 */
const PELDANO_DESNUDO = /(?<![A-Za-z0-9_])space\s*\[\s*(\d+)\s*\]/g;

/**
 * DECLARACIÓN de una custom property de CSS. El guard de la izquierda pide un
 * separador real delante (principio de línea, espacio, `;` o `{`), que es lo
 * que la separa de una REFERENCIA: dentro de `var(--x, 0px)` el nombre va
 * precedido de `(` y no casa.
 */
const DECLARACION_CUSTOM = /(?:^|[\s;{])(--[A-Za-z][\w-]*)\s*:\s*/gm;

/** REFERENCIA a una custom property dentro de un valor. */
const REFERENCIA_VAR = /var\(\s*(--[\w-]+)/g;

interface Hallazgo {
  readonly fichero: string;
  readonly propiedad: string;
  readonly peldano: number;
  readonly termino: string;
  /**
   * Custom property por la que el peldaño llega al término, o `null` cuando el
   * término lo escribe directamente. Un `padding-inline: var(--x)` no lleva
   * ningún peldaño en su línea: el peldaño está en la declaración de `--x`, y
   * este campo deja escrito por dónde entró.
   */
  readonly via: string | null;
}

/**
 * Valores declarados de cada custom property del barrido, indexados por nombre.
 * Una misma propiedad puede declararse varias veces (base más media query, como
 * `--story-statement-pad` en `Story.tsx`): se guardan TODAS, porque basta con
 * que una de ellas meta un peldaño desnudo en el eje en línea para que el
 * relleno que la consume lo herede en ese tramo.
 */
function declaracionesDeCustomProperties(
  ficheros: string[],
): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const fichero of ficheros) {
    const fuente = despojarComentarios(readFileSync(fichero, "utf-8"));
    for (const encontrado of fuente.matchAll(DECLARACION_CUSTOM)) {
      const nombre = encontrado[1];
      const inicio = (encontrado.index ?? 0) + encontrado[0].length;
      const valores = mapa.get(nombre) ?? [];
      valores.push(valorDesde(fuente, inicio));
      mapa.set(nombre, valores);
    }
  }
  return mapa;
}

/**
 * El extractor, sobre UNA fuente ya en memoria. Lo comparten el barrido real y
 * las sondas sintéticas del final del fichero: si divergieran, las sondas
 * dejarían de probar el mecanismo que la ley usa de verdad.
 */
function hallazgosDeFuente(
  fuente: string,
  fichero: string,
  declaraciones: ReadonlyMap<string, readonly string[]>,
): Hallazgo[] {
  const limpia = despojarComentarios(fuente);
  const hallazgos: Hallazgo[] = [];
  for (const encontrado of limpia.matchAll(DECLARACION)) {
    const sufijo = encontrado[1] ?? "";
    const propiedad = `padding${sufijo}`;
    const inicio = (encontrado.index ?? 0) + encontrado[0].length;
    const valor = valorDesde(limpia, inicio);
    for (const termino of terminosInline(sufijo, valor)) {
      const resumido = termino.replace(/\s+/g, " ");
      for (const peldano of termino.matchAll(PELDANO_DESNUDO)) {
        hallazgos.push({
          fichero,
          propiedad,
          peldano: Number(peldano[1]),
          termino: resumido,
          via: null,
        });
      }
      for (const referencia of termino.matchAll(REFERENCIA_VAR)) {
        const nombre = referencia[1];
        for (const declarado of declaraciones.get(nombre) ?? []) {
          for (const peldano of declarado.matchAll(PELDANO_DESNUDO)) {
            hallazgos.push({
              fichero,
              propiedad,
              peldano: Number(peldano[1]),
              termino: resumido,
              via: nombre,
            });
          }
        }
      }
    }
  }
  return hallazgos;
}

/**
 * Custom properties que llegan a un relleno del eje en línea sin que el barrido
 * encuentre dónde se declaran: la ley no puede responder por su valor, así que
 * se denuncian en vez de darse por buenas.
 */
function referenciasSinDeclarar(
  ficheros: string[],
  declaraciones: ReadonlyMap<string, readonly string[]>,
): { fichero: string; propiedad: string; nombre: string }[] {
  const sueltas: { fichero: string; propiedad: string; nombre: string }[] = [];
  for (const fichero of ficheros) {
    const limpia = despojarComentarios(readFileSync(fichero, "utf-8"));
    for (const encontrado of limpia.matchAll(DECLARACION)) {
      const sufijo = encontrado[1] ?? "";
      const inicio = (encontrado.index ?? 0) + encontrado[0].length;
      const valor = valorDesde(limpia, inicio);
      for (const termino of terminosInline(sufijo, valor)) {
        for (const referencia of termino.matchAll(REFERENCIA_VAR)) {
          if (declaraciones.has(referencia[1])) continue;
          sueltas.push({
            fichero: rutaRelativa(fichero),
            propiedad: `padding${sufijo}`,
            nombre: referencia[1],
          });
        }
      }
    }
  }
  return sueltas;
}

/** Todos los rellenos del eje en línea que leen un peldaño desnudo de `space`
 *  --escrito en el término o heredado de una `var()`--, con o sin excepción
 *  declarada. */
function rellenosInlineConSpaceDesnudo(ficheros: string[]): Hallazgo[] {
  const declaraciones = declaracionesDeCustomProperties(ficheros);
  return ficheros.flatMap((fichero) =>
    hallazgosDeFuente(
      readFileSync(fichero, "utf-8"),
      rutaRelativa(fichero),
      declaraciones,
    ),
  );
}

function estaExceptuado(hallazgo: Hallazgo): boolean {
  return EXCEPCIONES.some(
    (e) =>
      e.fichero === hallazgo.fichero &&
      e.propiedad === hallazgo.propiedad &&
      e.peldano === hallazgo.peldano &&
      (e.via ?? null) === hallazgo.via,
  );
}

describe("una sola ley: el relleno del eje inline se lee de inlineSpace", () => {
  it("ningun relleno del eje inline de src/components ni de app lee un peldano desnudo de space sin excepcion declarada", () => {
    const hallazgos = rellenosInlineConSpaceDesnudo(ficherosEscaneados());
    const sinExcepcion = hallazgos.filter((h) => !estaExceptuado(h));

    const detalle = sinExcepcion
      .map(
        (h) =>
          `  ${h.fichero} | ${h.propiedad} | space[${h.peldano}]${h.via === null ? "" : ` | via ${h.via}`} | termino inline: "${h.termino}"`,
      )
      .join("\n");

    expect(
      sinExcepcion,
      `${sinExcepcion.length} relleno(s) del eje inline leen un peldano desnudo de space sin excepcion declarada:\n${detalle}\nMigralos a theme.data.inlineSpace[n], o declara la excepcion con su motivo en EXCEPCIONES (este fichero).`,
    ).toHaveLength(0);
  });

  it("cada excepcion declarada sigue describiendo un relleno REAL, y solo esas apariciones", () => {
    const hallazgos = rellenosInlineConSpaceDesnudo(ficherosEscaneados());

    for (const excepcion of EXCEPCIONES) {
      const coincidencias = hallazgos.filter(
        (h) =>
          h.fichero === excepcion.fichero &&
          h.propiedad === excepcion.propiedad &&
          h.peldano === excepcion.peldano &&
          (excepcion.via ?? null) === h.via,
      );
      expect(
        coincidencias.length,
        `excepcion declarada que ya no describe el relleno que decia: ${excepcion.fichero} | ${excepcion.propiedad} | space[${excepcion.peldano}] (esperadas ${excepcion.apariciones} apariciones, encontradas ${coincidencias.length}). Retirala o corrigela: una excepcion caducada es un permiso en blanco, y una aparicion de mas es un caso que nadie ha decidido.`,
      ).toBe(excepcion.apariciones);
    }
  });

  it("toda excepcion trae motivo escrito: un permiso sin motivo no se distingue de un olvido", () => {
    for (const excepcion of EXCEPCIONES) {
      expect(
        excepcion.motivo.length,
        `${excepcion.fichero} | ${excepcion.propiedad}: motivo vacio o telegrafico`,
      ).toBeGreaterThan(40);
    }
  });
});

describe("ataduras del barrido: la ley no puede pasar por vacuidad", () => {
  it("el barrido cubre el arbol entero de piezas de interfaz, no un rincon", () => {
    const ficheros = ficherosEscaneados();

    expect(
      ficheros.length,
      `el barrido encogio: ${ficheros.length} ficheros, por debajo del minimo declarado (${MINIMO_FICHEROS_BARRIDOS}). Si la reduccion es legitima, baja la constante A MANO y explica por que.`,
    ).toBeGreaterThanOrEqual(MINIMO_FICHEROS_BARRIDOS);

    const relativas = ficheros.map(rutaRelativa);
    // Una pieza de cada categoria de src/components (RULES.md, regla 2), una
    // ruta de app/ y el fichero de src/theme que declara las custom properties
    // de layout: si el barrido dejara de ver una categoria entera, la ley
    // pasaria en verde sobre ella sin que nadie lo notara.
    for (const esperada of [
      "src/components/layout/Footer/Footer.tsx",
      "src/components/legal/legalPage.parts.tsx",
      "src/components/scenes/sectionBeam/SectionBeam.tsx",
      "src/components/sections/Contact/Contact.tsx",
      "src/components/ui/Card/Card.tsx",
      "src/theme/GlobalStyles.tsx",
      "app/opengraph-image.tsx",
    ]) {
      expect(relativas, `el barrido no ve ${esperada}`).toContain(esperada);
    }
  });

  it("toda custom property que llega a un relleno del eje inline se declara DENTRO del barrido", () => {
    const ficheros = ficherosEscaneados();
    const sueltas = referenciasSinDeclarar(
      ficheros,
      declaracionesDeCustomProperties(ficheros),
    );

    const detalle = sueltas
      .map((s) => `  ${s.fichero} | ${s.propiedad} | ${s.nombre}`)
      .join("\n");

    expect(
      sueltas,
      `${sueltas.length} referencia(s) var() en el eje inline que el barrido no puede resolver:\n${detalle}\nUna custom property cuya declaracion queda fuera del barrido es un peldano que la ley no puede leer: o su fichero entra en RAICES_BARRIDAS, o el relleno lee el token directamente.`,
    ).toHaveLength(0);
  });

  it("el token tiene consumidores REALES en el eje inline, no solo una ley que nadie incumple", () => {
    const consumidores = ficherosEscaneados().filter((fichero) => {
      const fuente = despojarComentarios(readFileSync(fichero, "utf-8"));
      return /inlineSpace\s*\[/.test(fuente);
    });
    const relativas = consumidores.map(rutaRelativa);

    expect(
      relativas.length,
      `solo ${relativas.length} ficheros de produccion consumen inlineSpace: ${relativas.join(", ")}`,
    ).toBeGreaterThanOrEqual(MINIMO_CONSUMIDORES);

    for (const esperado of [
      "src/components/layout/Footer/Footer.tsx",
      "src/components/layout/Navbar/Navbar.tsx",
      "src/components/layout/Navbar/NavSheet.tsx",
      "src/components/legal/legalPage.parts.tsx",
      "src/components/sections/About/About.tsx",
      "src/components/sections/Hero/Hero.tsx",
      "src/components/sections/Story/Story.tsx",
      "src/components/sections/Features/Features.tsx",
      "src/components/sections/Journey/Journey.tsx",
      "src/components/sections/NotFound/NotFoundContent.tsx",
      "src/components/ui/Card/Card.tsx",
    ]) {
      expect(relativas, `${esperado} dejo de consumir inlineSpace`).toContain(
        esperado,
      );
    }
  });
});

describe("sondas del extractor: el mecanismo caza lo que dice cazar", () => {
  /**
   * Ejecuta EL MISMO extractor que la ley sobre una fuente sintetica, sin
   * tocar el disco: las declaraciones de custom property se leen de la propia
   * fuente, igual que el barrido las lee del arbol. Antes esta funcion
   * duplicaba el cuerpo del extractor; se unifico el 2026-09-05 al anadir la
   * resolucion de var(), porque una sonda que prueba una copia no prueba nada.
   */
  function hallazgosDe(fuente: string): Hallazgo[] {
    const limpia = despojarComentarios(fuente);
    const declaraciones = new Map<string, string[]>();
    for (const encontrado of limpia.matchAll(DECLARACION_CUSTOM)) {
      const inicio = (encontrado.index ?? 0) + encontrado[0].length;
      const valores = declaraciones.get(encontrado[1]) ?? [];
      valores.push(valorDesde(limpia, inicio));
      declaraciones.set(encontrado[1], valores);
    }
    return hallazgosDeFuente(fuente, "sonda", declaraciones);
  }

  it("SONDA POSITIVA: caza el segundo termino de una abreviatura escrita en space", () => {
    const hallazgos = hallazgosDe(
      "const Sc = styled.div`\n  padding: 0 ${({ theme }) => theme.data.space[4]};\n`;",
    );
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].propiedad).toBe("padding");
    expect(hallazgos[0].peldano).toBe(4);
  });

  it("SONDA POSITIVA: caza los dos lados de una abreviatura de cuatro terminos", () => {
    const hallazgos = hallazgosDe(
      "padding: ${t.space[3]} ${t.space[4]} ${t.space[3]} ${t.space[2]};",
    );
    expect(hallazgos.map((h) => h.peldano)).toEqual([4, 2]);
  });

  it("SONDA POSITIVA: caza un peldano desnudo escondido dentro de un calc()", () => {
    const hallazgos = hallazgosDe(
      "padding-inline: calc(${t.space[5]} + env(safe-area-inset-left, 0px));",
    );
    expect(hallazgos.map((h) => h.peldano)).toEqual([5]);
  });

  it("SONDA POSITIVA: caza el peldano que entra por una custom property declarada con space", () => {
    // El caso REAL que la ley no veia hasta el 2026-09-05: --nav-gap se
    // declaraba en GlobalStyles.tsx (fuera del barrido) y se consumia en
    // Navbar.tsx como padding-inline, asi que ni la declaracion ni el consumo
    // llevaban un peldano en su propia linea.
    const hallazgos = hallazgosDe(
      "  --brecha: ${({ theme }) => theme.data.space[2]};\n  padding-inline: var(--brecha);",
    );
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].propiedad).toBe("padding-inline");
    expect(hallazgos[0].peldano).toBe(2);
    expect(hallazgos[0].via).toBe("--brecha");
  });

  it("SONDA POSITIVA: caza la var() escondida en el termino inline de una abreviatura", () => {
    const hallazgos = hallazgosDe(
      "  --brecha: ${t.space[3]};\n  padding: ${t.space[9]} calc(var(--brecha) + 1px);",
    );
    expect(hallazgos.map((h) => `${h.peldano}/${h.via}`)).toEqual([
      "3/--brecha",
    ]);
  });

  it("SONDA NEGATIVA: una custom property declarada con inlineSpace no dispara", () => {
    // El caso real de ScStatement (Story.tsx): --story-statement-pad se
    // declara dos veces, base y media query, y las dos leen inlineSpace.
    expect(
      hallazgosDe(
        "  --pad: ${t.inlineSpace[4]};\n  padding-inline: var(--pad);\n  @media x {\n    --pad: ${t.inlineSpace[6]};\n  }",
      ),
    ).toHaveLength(0);
  });

  it("SONDA NEGATIVA: una var() en el termino de BLOQUE no entra, aunque su declaracion lleve space", () => {
    // El caso real de ScLegalMain y NotFoundContent: var(--nav-height) suma en
    // el primer termino de la abreviatura, que es altura, no columna.
    expect(
      hallazgosDe(
        "  --alto: ${t.space[7]};\n  padding: calc(var(--alto) + 1px) ${t.inlineSpace[5]} ${t.space[7]};",
      ),
    ).toHaveLength(0);
  });

  it("SONDA NEGATIVA: no confunde inlineSpace con space", () => {
    expect(
      hallazgosDe("padding: ${t.space[6]} ${t.inlineSpace[6]};"),
    ).toHaveLength(0);
  });

  it("SONDA NEGATIVA: el eje de BLOQUE y los huecos no entran en la ley", () => {
    expect(
      hallazgosDe(
        "padding-block: ${t.space[8]};\n  padding-top: ${t.space[9]};\n  padding-bottom: ${t.space[7]};\n  gap: ${t.space[5]};\n  margin-inline: ${t.space[4]};",
      ),
    ).toHaveLength(0);
  });

  it("SONDA NEGATIVA: el primer termino de una abreviatura de dos es de BLOQUE, no de columna", () => {
    expect(
      hallazgosDe("padding: ${t.space[9]} ${t.inlineSpace[5]};"),
    ).toHaveLength(0);
  });

  it("SONDA NEGATIVA: un peldano CITADO en un comentario no es codigo", () => {
    expect(
      hallazgosDe(
        "/* padding: 0 ${t.space[4]} vivio aqui hasta la ola de inlineSpace */\n  padding-inline: ${t.inlineSpace[4]};",
      ),
    ).toHaveLength(0);
  });

  it("el token que la ley persigue es el de verdad: seis peldanos, del 2 al 7", () => {
    expect(Object.keys(inlineSpace).map(Number)).toEqual([2, 3, 4, 5, 6, 7]);
  });
});
