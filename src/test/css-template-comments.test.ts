import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * LOS COMENTARIOS DE CSS NO VIAJAN EN EL BUNDLE.
 *
 * QUÉ SE CANDA, en una frase: la suma de bytes de comentarios de bloque que
 * viven DENTRO de un template de styled-components (`styled.x`, `styled(X)`,
 * `css`, `keyframes`, `createGlobalStyle`) en `src/components/`, `src/theme/`
 * y `app/` no crece. Es un TRINQUETE: el techo solo baja.
 *
 * POR QUÉ EXISTE. Lo que se escribe entre la comilla invertida de apertura y
 * la de cierre de un template de styled-components no es un comentario de
 * JavaScript: es CSS. El compilador de styled-components no lo elimina, el
 * minificador tampoco --porque para él es el contenido de una cadena, no
 * código--, así que acaba dentro del chunk servido y se paga en el
 * presupuesto de JavaScript de la home: 290.000 B, con un límite de
 * crecimiento por chunk de 1.000 B brotli (`pnpm measure:js`).
 *
 * Ya se ha pagado DOS veces, con la factura medida las dos:
 *
 *  - `2e319cf` (2026-09-05): la primera versión del arreglo de zoom escribió
 *    su docblock dentro del template y `measure:js` cayó por 1.010 B sobre el
 *    límite de 1.000. El propio mensaje de ese commit lo deja escrito.
 *  - Ola R (`47d0b4e..928927b`, 2026-09-05): treinta y nueve bloques de prosa
 *    escritos dentro de templates al documentar el paso a `inlineSpace`. El
 *    chunk de la portada (`1kwg2bi7oa5vj.js`) pasó de 236.367 a 248.933 B
 *    crudos, +12.566, y `measure:js` lo midió en +2.729 B brotli sobre la
 *    línea base, casi el triple del límite. Confirmado sobre el build de
 *    `928927b` antes de arreglar nada: ese chunk conservaba 88.056 B de
 *    comentarios de bloque en sus 248.933 B totales, y frases de la ola como
 *    "CANAL DEL RAIL" aparecían literalmente dentro de él.
 *
 * La prosa no se pierde: se sube al docblock JS que hay encima del componente
 * --donde el minificador SÍ la elimina-- y allí se refiere a la declaración
 * por su nombre (`padding-inline`, `inset-inline-end`) para seguir siendo
 * legible desde fuera. Este candado no prohíbe comentar el CSS: prohíbe
 * PAGARLO en cada carga de página.
 *
 * CÓMO SE MIDE, y sus límites declarados. Barrido de ficheros por sistema de
 * ficheros (mismo patrón que `inline-space-consumers.test.ts` y
 * `vocabulary-consumers.test.ts`) y un recorrido carácter a carácter que
 * distingue código de texto de template: dentro de un template solo cuentan
 * `` ` ``, `${` y `\`; dentro de un `${...}` se vuelve a leer como código, de
 * modo que un comentario escrito en una interpolación NO cuenta (es JS, el
 * minificador se lo lleva) y un `css` anidado dentro de una interpolación se
 * contabiliza UNA sola vez, no dos. Límites: es un motor de texto, no un AST,
 * así que una expresión regular con comillas dentro podría desincronizarlo
 * (hoy no hay ninguna en las raíces barridas, comprobado), y un `${}` escrito
 * DENTRO de un comentario de CSS se salta con el comentario. Los finales de
 * línea se normalizan a `\n` antes de contar: el repo fuerza LF con
 * `.gitattributes` (`* text=auto eol=lf`), y normalizar impide que una máquina
 * mal configurada tiña de rojo un techo que no ha cambiado.
 *
 * ## Validado con el bug inyectado a propósito (regla 34 de RULES.md)
 *
 * Los tres sabotajes se aplicaron de verdad, se vio el rojo, se restauró y se
 * volvió a ver el verde (6/6). Las líneas van copiadas de la salida, no
 * predichas: la lección del 2026-08-17 (bis) de este repo se pagó por escribir
 * «validado con el bug inyectado» sobre una predicción razonable y falsa, y
 * dos de las tres predicciones de esta tanda eran falsas (ver el sabotaje 2).
 *
 * 1. UN COMENTARIO DE 200 BYTES DENTRO DE UN TEMPLATE -- añadido en
 *    `src/components/ui/Card/Card.tsx`, dentro del template de `ScCard`, con
 *    su longitud comprobada byte a byte antes de inyectarlo. Rojo en el caso
 *    del techo, con la aritmética completa en el mensaje:
 *
 *      AssertionError: los comentarios dentro de templates de styled-components suman 151656 B, 200 B por encima del techo de 151456 B.
 *      [...]
 *      expected 151656 to be less than or equal to 151456
 *
 * 2. ENCOGIENDO EL BARRIDO -- `RAICES_BARRIDAS` reducido a `["src/theme"]`.
 *    Rojo en la atadura de extensión:
 *
 *      AssertionError: el barrido ve 18 ficheros de produccion, por debajo del suelo de 95: alguien ha encogido RAICES_BARRIDAS o ha movido los componentes, y el techo estaria pasando por vacuidad.: expected 18 to be greater than or equal to 95
 *
 *    DOS PREDICCIONES FALSAS que este sabotaje corrigió, y por eso se anotan:
 *    se esperaban 9 ficheros (son 18: `src/theme` tiene más módulos de los que
 *    tiene tokens) y se esperaba que el caso cayera también por el suelo de
 *    TEMPLATES. No cae: el primer `expect` lanza y el segundo no llega a
 *    ejecutarse nunca. El suelo de templates necesita su propio sabotaje, que
 *    es el 3.
 *
 * 3. CEGANDO EL RECONOCEDOR DE TEMPLATES -- `esTagStyled` forzada a devolver
 *    `false`. El techo pasa (0 bytes ≤ techo: exactamente el falso verde
 *    contra el que existe esta atadura) y caen cuatro casos, el suelo de
 *    templates y tres de las sondas positivas:
 *
 *      AssertionError: el barrido encuentra 0 templates de styled-components, por debajo del suelo de 380.: expected 0 to be greater than or equal to 380
 *      AssertionError: no reconoce styled.div[...]: expected [] to have a length of 1 but got +0
 *
 *    En la segunda línea, `[...]` sustituye al comentario de prueba de la
 *    sonda: lleva un cierre de comentario de bloque y citarlo literal aquí
 *    cerraría este docblock. Es la única elisión de las cinco líneas citadas.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Raíces con CSS de producción. `src/test` queda fuera a propósito: mide el
 *  CSS que se sirve, no el que se afirma. */
const RAICES_BARRIDAS = ["src/components", "src/theme", "app"] as const;

const EXTENSIONES = new Set([".ts", ".tsx"]);

/**
 * Techo del trinquete, TECLEADO A MANO. Es el valor MEDIDO el 2026-09-05
 * después de sacar de los templates los 20.970 B que la ola R había escrito
 * dentro (172.426 B antes, 151.456 después), sin ni un byte de margen: el
 * margen es lo que convierte un trinquete en un presupuesto.
 *
 * SOLO BAJA. Quien saque más prosa de un template baja este número en el mismo
 * commit; quien necesite explicar una declaración escribe el docblock FUERA
 * del template, que es gratis. Subirlo es la única forma de romper el candado
 * y por eso está escrito aquí, en una línea que nadie toca por accidente.
 *
 * 2026-09-11 (P5, presupuesto medido sobre lo que se sirve): BAJA a 77.862 B,
 * el valor medido por el mismo barrido después de sacar a docblocks JS la
 * prosa de los cuatro ficheros que más pagaban: `Navbar.tsx` (34 comentarios,
 * 25.980 B), `GlobalStyles.tsx` (17, 19.197 B), `Story.tsx` (25, 11.761 B) y
 * `Hero.tsx` (24, 9.832 B), 66.770 B en total. La home pasó de servir 296.757
 * a 272.252 B a calidad 4 (-24.505 B) con el CSS horneado idéntico salvo el
 * renombrado biyectivo de las clases, que styled-components deriva del texto
 * del template. Sin margen, por el mismo motivo que el techo anterior.
 *
 * 2026-09-13 (extracción de `StarField` del pie para montarlo también en
 * `About`): BAJA a 77.522 B (-340 B). El único comentario que vivía dentro del
 * template de `ScStar` («Círculo por token…», `Footer.tsx`) pasó al docblock JS
 * de `scenes/starField/StarField.tsx` al mover la pieza.
 *
 * Lo que queda por debajo del techo es prosa que todavía vive dentro de
 * templates: `legalPage.parts.tsx`, `Contact.tsx`, `Button.tsx`,
 * `Features.tsx` y `story.deck.tsx` son los mayores, y bajarlos es trabajo
 * futuro con su propia medición delante.
 */
const TEMPLATE_COMMENT_BYTES_MAX = 77522;

/**
 * Suelo del barrido, TECLEADO A MANO (atadura de extensión, dirección 1: que
 * el candado no se vacíe en silencio). El 2026-09-05 el barrido ve 101
 * ficheros; el suelo se deja en 95 para que una reorganización pequeña no lo
 * ponga rojo por sí sola, y lo bastante cerca para que vaciar el barrido --el
 * fallo que de verdad importa, porque dejaría el techo pasando por vacuidad--
 * no pueda pasar desapercibido.
 */
const MINIMO_FICHEROS_BARRIDOS = 95;

/**
 * Suelo de templates encontrados (atadura de extensión, dirección 2: que el
 * techo no se cumpla porque el reconocedor de templates ha dejado de
 * reconocerlos). Un fallo en `esTagStyled` no vaciaría el barrido de FICHEROS
 * --seguirían leyéndose los 101--, pero sí el de templates, y con él la cuenta
 * de bytes. El 2026-09-05 son 414; el suelo se deja en 380.
 */
const MINIMO_TEMPLATES = 380;

interface ComentarioDeTemplate {
  readonly bytes: number;
  readonly texto: string;
}

interface LecturaDeFichero {
  readonly comentarios: readonly ComentarioDeTemplate[];
  readonly templates: number;
}

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

/** Ficheros de PRODUCCIÓN de las raíces barridas. */
function ficherosEscaneados(): string[] {
  const ficheros: string[] = [];
  for (const raiz of RAICES_BARRIDAS) walk(join(repoRoot, raiz), ficheros);
  return ficheros.filter(
    (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );
}

const TAG_SIMPLE = /(?:^|[^\w$.])(?:css|keyframes|createGlobalStyle)$/;
const TAG_MIEMBRO = /(?:^|[^\w$.])styled\s*\.\s*[A-Za-z]\w*$/;
const TAG_LLAMADA = /(?:^|[^\w$.])styled\s*\([\w\s.]*\)$/;

/**
 * Retrocede desde un `>` final hasta su `<` pareja para poder reconocer
 * `styled.div<{ $x: boolean }>` y `styled(X)<Props>`, cuyos genéricos pueden
 * ocupar varias líneas y llevar `;` dentro. Salta `=>` para no confundir la
 * flecha de una función con un cierre de genérico.
 */
function sinGenerico(texto: string): string | null {
  if (!texto.endsWith(">")) return null;
  let profundidad = 0;
  for (let j = texto.length - 1; j >= 0; j -= 1) {
    const c = texto[j];
    if (c === ">") {
      if (texto[j - 1] === "=") continue;
      profundidad += 1;
    } else if (c === "<") {
      profundidad -= 1;
      if (profundidad === 0) return texto.slice(0, j).replace(/\s+$/, "");
    } else if (c === "`") {
      return null;
    }
  }
  return null;
}

/** ¿La comilla invertida de `indice` abre un template de styled-components? */
function esTagStyled(fuente: string, indice: number): boolean {
  const ventana = fuente.slice(Math.max(0, indice - 800), indice);
  let antes = ventana.replace(/\s+$/, "");
  const podado = sinGenerico(antes);
  if (podado !== null) antes = podado;
  return (
    TAG_SIMPLE.test(antes) || TAG_MIEMBRO.test(antes) || TAG_LLAMADA.test(antes)
  );
}

/**
 * Comentarios de bloque que viven en el TEXTO de un template styled, y cuántos
 * templates styled se han visto. Ver el docblock de cabecera para el criterio
 * completo y sus límites.
 */
export function comentariosDeTemplate(fuenteCruda: string): LecturaDeFichero {
  const fuente = fuenteCruda.replace(/\r\n/g, "\n");
  const comentarios: ComentarioDeTemplate[] = [];
  const pila: { tipo: "tpl" | "expr"; styled: boolean; nivel: number }[] = [];
  let templates = 0;
  let i = 0;
  const n = fuente.length;
  while (i < n) {
    const cima = pila[pila.length - 1];
    if (cima !== undefined && cima.tipo === "tpl") {
      const c = fuente[i];
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        pila.pop();
        i += 1;
        continue;
      }
      if (c === "$" && fuente[i + 1] === "{") {
        pila.push({ tipo: "expr", styled: false, nivel: 0 });
        i += 2;
        continue;
      }
      if (c === "/" && fuente[i + 1] === "*") {
        const cierre = fuente.indexOf("*/", i + 2);
        const fin = cierre === -1 ? n : cierre + 2;
        if (cima.styled) {
          const texto = fuente.slice(i, fin);
          comentarios.push({ bytes: Buffer.byteLength(texto, "utf8"), texto });
        }
        i = fin;
        continue;
      }
      i += 1;
      continue;
    }
    const dos = fuente.slice(i, i + 2);
    if (dos === "//") {
      const salto = fuente.indexOf("\n", i);
      i = salto === -1 ? n : salto;
      continue;
    }
    if (dos === "/*") {
      const cierre = fuente.indexOf("*/", i + 2);
      i = cierre === -1 ? n : cierre + 2;
      continue;
    }
    const c = fuente[i];
    if (c === '"' || c === "'") {
      i += 1;
      while (i < n && fuente[i] !== c) i += fuente[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }
    if (c === "`") {
      const styled = esTagStyled(fuente, i);
      if (styled) templates += 1;
      pila.push({ tipo: "tpl", styled, nivel: 0 });
      i += 1;
      continue;
    }
    if (cima !== undefined && cima.tipo === "expr") {
      if (c === "{") {
        cima.nivel += 1;
        i += 1;
        continue;
      }
      if (c === "}") {
        if (cima.nivel === 0) pila.pop();
        else cima.nivel -= 1;
        i += 1;
        continue;
      }
    }
    i += 1;
  }
  return { comentarios, templates };
}

interface Censo {
  readonly bytes: number;
  readonly ficheros: number;
  readonly templates: number;
  readonly porFichero: readonly { ruta: string; bytes: number }[];
}

function censar(): Censo {
  const ficheros = ficherosEscaneados();
  let bytes = 0;
  let templates = 0;
  const porFichero: { ruta: string; bytes: number }[] = [];
  for (const fichero of ficheros) {
    const lectura = comentariosDeTemplate(readFileSync(fichero, "utf8"));
    const suma = lectura.comentarios.reduce((acc, c) => acc + c.bytes, 0);
    bytes += suma;
    templates += lectura.templates;
    if (suma > 0) porFichero.push({ ruta: rutaRelativa(fichero), bytes: suma });
  }
  porFichero.sort((a, b) => b.bytes - a.bytes);
  return { bytes, ficheros: ficheros.length, templates, porFichero };
}

describe("los comentarios de CSS no viajan en el bundle", () => {
  it("la suma de bytes de comentario dentro de templates no supera el techo", () => {
    const censo = censar();
    const top = censo.porFichero
      .slice(0, 10)
      .map((f) => `  ${f.bytes} B  ${f.ruta}`)
      .join("\n");
    const exceso = censo.bytes - TEMPLATE_COMMENT_BYTES_MAX;
    const mensaje =
      `los comentarios dentro de templates de styled-components suman ${censo.bytes} B, ` +
      `${exceso} B por encima del techo de ${TEMPLATE_COMMENT_BYTES_MAX} B.\n\n` +
      `Este techo es un TRINQUETE: solo baja. Lo que va DENTRO de un template es CSS\n` +
      `y viaja al bundle (2e319cf pago 1.010 B; la ola R, 2.729 B brotli en un chunk).\n` +
      `La prosa nueva va al docblock JS de encima del componente, no dentro del template.\n\n` +
      `Los diez ficheros que mas bytes cargan hoy:\n${top}`;
    expect(censo.bytes, mensaje).toBeLessThanOrEqual(
      TEMPLATE_COMMENT_BYTES_MAX,
    );
  });

  it("el extractor caza un comentario DENTRO del template y no cuenta el de fuera", () => {
    const dentro = [
      "const ScX = styled.div`",
      "  /* doce bytes o mas de prosa dentro del template */",
      "  color: red;",
      "`;",
    ].join("\n");
    const fuera = [
      "/* doce bytes o mas de prosa dentro del template */",
      "const ScX = styled.div`",
      "  color: red;",
      "`;",
    ].join("\n");

    const lecturaDentro = comentariosDeTemplate(dentro);
    expect(lecturaDentro.templates).toBe(1);
    expect(lecturaDentro.comentarios).toHaveLength(1);
    expect(lecturaDentro.comentarios[0]?.bytes).toBe(51);

    const lecturaFuera = comentariosDeTemplate(fuera);
    expect(lecturaFuera.templates).toBe(1);
    expect(lecturaFuera.comentarios).toHaveLength(0);
  });

  it("no cuenta un comentario escrito dentro de una interpolacion (eso es JS)", () => {
    const fuente = [
      "const ScX = styled.div`",
      "  color: ${(/* esto es JS y el minificador se lo lleva */ p) => p.c};",
      "`;",
    ].join("\n");
    expect(comentariosDeTemplate(fuente).comentarios).toHaveLength(0);
  });

  it("un template anidado en una interpolacion no cuenta su comentario dos veces", () => {
    const fuente = [
      "const ScX = styled.div`",
      "  ${({ a }) =>",
      "    a",
      "      ? css`",
      "          /* una sola vez */",
      "          color: red;",
      "        `",
      "      : null}",
      "`;",
    ].join("\n");
    const lectura = comentariosDeTemplate(fuente);
    expect(lectura.templates).toBe(2);
    expect(lectura.comentarios).toHaveLength(1);
  });

  it("reconoce las formas de tag que el repo usa de verdad", () => {
    const formas = [
      "styled.div`/* x */`",
      "styled.section<{ $a: boolean }>`/* x */`",
      "styled.img<{ $a: boolean } & B>`/* x */`",
      "styled(Typography)`/* x */`",
      "styled(Typography)<{ $a: boolean }>`/* x */`",
      "css`/* x */`",
      "keyframes`/* x */`",
      "createGlobalStyle`/* x */`",
    ];
    for (const forma of formas) {
      expect(
        comentariosDeTemplate(`const X = ${forma};`).comentarios,
        `no reconoce ${forma}`,
      ).toHaveLength(1);
    }
    // Un template que NO es de styled no aporta bytes.
    expect(
      comentariosDeTemplate("const X = `/* x */`;").comentarios,
    ).toHaveLength(0);
  });

  it("el barrido sigue viendo todo el CSS de produccion", () => {
    const censo = censar();
    expect(
      censo.ficheros,
      `el barrido ve ${censo.ficheros} ficheros de produccion, por debajo del suelo de ` +
        `${MINIMO_FICHEROS_BARRIDOS}: alguien ha encogido RAICES_BARRIDAS o ha movido los ` +
        `componentes, y el techo estaria pasando por vacuidad.`,
    ).toBeGreaterThanOrEqual(MINIMO_FICHEROS_BARRIDOS);
    expect(
      censo.templates,
      `el barrido encuentra ${censo.templates} templates de styled-components, por debajo ` +
        `del suelo de ${MINIMO_TEMPLATES}.`,
    ).toBeGreaterThanOrEqual(MINIMO_TEMPLATES);
  });
});
