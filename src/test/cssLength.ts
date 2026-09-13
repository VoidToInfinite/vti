/**
 * Resolutor de longitudes CSS para los candados de tipografia fluida.
 *
 * POR QUE EXISTE. jsdom no hace layout y no resuelve `clamp()`, `min()`,
 * `max()`, `calc()` ni `var()`: `getComputedStyle(el).fontSize` devuelve el
 * TEXTO CRUDO de la declaracion (lo aprovechan ya `Hero.qa.test.tsx` y
 * `Story.test.tsx`). Atar ese texto letra a letra convierte el candado en una
 * copia del codigo: cambia el codigo, se actualiza el test, y nadie ha
 * comprobado nunca lo unico que importa -- cuantos pixeles mide el texto con
 * la raiz por defecto y cuantos con la preferencia de tamano de texto del
 * usuario al 200 % (WCAG 1.4.4). Este modulo cierra ese hueco: resuelve la
 * declaracion a un numero, dado un contexto (raiz tipografica, ancho y alto
 * de viewport), para poder aseverar la PROPIEDAD en vez de la cadena.
 *
 * QUE RESUELVE: `clamp(a, b, c)` (como `max(a, min(b, c))`, que es su
 * definicion en CSS Values 4), `min()`/`max()` con cualquier numero de
 * argumentos, `calc()` con `+ - * /` y parentesis anidados, `var(--x)` con o
 * sin valor de reserva, y las unidades `px`, `rem`, `vw`, `vh`, `vmin`,
 * `vmax` mas los numeros desnudos (los factores de un `calc`).
 *
 * QUE NO RESUELVE, declarado y no escondido: `em` (necesitaria el tamano de
 * fuente del PADRE, que este contexto no modela), los porcentajes (se
 * resuelven contra una caja que jsdom no calcula) y cualquier otra funcion
 * CSS. No devuelve un valor aproximado en esos casos: lanza, para que un
 * candado no pueda pasar en verde sobre una expresion que nadie ha
 * resuelto.
 *
 * SU PROPIA VERIFICACION vive en `cssLength.test.ts`, incluidas las sondas
 * que comparan el resultado con las cifras MEDIDAS en Chrome sobre el build
 * servido: un resolutor que no reproduce el navegador no vale como
 * instrumento.
 */

/** Contexto contra el que se resuelve una longitud. */
export interface ContextoCss {
  /** `font-size` computado de `<html>`, en px. 16 es la raiz de fabrica. */
  readonly raizPx: number;
  /** Ancho del viewport en px CSS (unidad `vw`). */
  readonly anchoPx: number;
  /** Alto del viewport en px CSS (unidad `vh`). */
  readonly altoPx: number;
  /**
   * Custom properties visibles para la expresion, con el nombre COMPLETO
   * (`--story-statement-pad`) como clave y su declaracion como valor -- que
   * puede ser a su vez una expresion (`min(1rem, 5vw)`).
   */
  readonly vars?: Readonly<Record<string, string>>;
}

type Ficha =
  | { readonly tipo: "numero"; readonly valor: number; readonly unidad: string }
  | { readonly tipo: "nombre"; readonly valor: string }
  | { readonly tipo: "simbolo"; readonly valor: string };

const NUMERO = /^\d*\.?\d+/;
const UNIDAD = /^[A-Za-z%]+/;
/** Identificadores CSS, incluidas las custom properties (`--nombre`). */
const NOMBRE = /^-{0,2}[A-Za-z_][A-Za-z0-9_-]*/;

/** Profundidad maxima de `var()` dentro de `var()`: corta un ciclo. */
const MAX_PROFUNDIDAD = 8;

function partirEnFichas(expresion: string): Ficha[] {
  const salida: Ficha[] = [];
  let resto = expresion.trim();

  while (resto.length > 0) {
    if (/^\s/.test(resto)) {
      resto = resto.replace(/^\s+/, "");
      continue;
    }

    const numero = NUMERO.exec(resto);
    if (numero !== null) {
      resto = resto.slice(numero[0].length);
      const unidad = UNIDAD.exec(resto);
      if (unidad !== null) resto = resto.slice(unidad[0].length);
      salida.push({
        tipo: "numero",
        valor: Number(numero[0]),
        unidad: unidad === null ? "" : unidad[0],
      });
      continue;
    }

    const nombre = NOMBRE.exec(resto);
    if (nombre !== null) {
      resto = resto.slice(nombre[0].length);
      salida.push({ tipo: "nombre", valor: nombre[0] });
      continue;
    }

    salida.push({ tipo: "simbolo", valor: resto[0] });
    resto = resto.slice(1);
  }

  return salida;
}

function aPx(valor: number, unidad: string, ctx: ContextoCss): number {
  switch (unidad.toLowerCase()) {
    case "":
      return valor;
    case "px":
      return valor;
    case "rem":
      return valor * ctx.raizPx;
    case "vw":
      return (valor * ctx.anchoPx) / 100;
    case "vh":
      return (valor * ctx.altoPx) / 100;
    case "vmin":
      return (valor * Math.min(ctx.anchoPx, ctx.altoPx)) / 100;
    case "vmax":
      return (valor * Math.max(ctx.anchoPx, ctx.altoPx)) / 100;
    default:
      throw new Error(
        `unidad no resoluble por este instrumento: "${unidad}" (em y % dependen de una caja que jsdom no calcula)`,
      );
  }
}

/**
 * Resuelve una longitud CSS a pixeles dentro de `ctx`.
 *
 * Lanza si la expresion usa algo que este resolutor no modela: un candado que
 * no puede resolver su declaracion tiene que ponerse rojo, no verde.
 */
export function longitudCssEnPx(
  expresion: string,
  ctx: ContextoCss,
  profundidad = 0,
): number {
  if (profundidad > MAX_PROFUNDIDAD) {
    throw new Error(`var() anidada demasiado hondo en "${expresion}"`);
  }

  const fichas = partirEnFichas(expresion);
  let i = 0;

  const mirar = (): Ficha | undefined => fichas[i];

  const comer = (valor: string): void => {
    const ficha = mirar();
    if (ficha === undefined || ficha.valor !== valor) {
      throw new Error(
        `se esperaba "${valor}" en "${expresion}" (posicion ${String(i)})`,
      );
    }
    i += 1;
  };

  const suma = (): number => {
    let acumulado = producto();
    for (;;) {
      const ficha = mirar();
      if (ficha === undefined || ficha.tipo !== "simbolo") break;
      if (ficha.valor === "+") {
        i += 1;
        acumulado += producto();
      } else if (ficha.valor === "-") {
        i += 1;
        acumulado -= producto();
      } else break;
    }
    return acumulado;
  };

  const producto = (): number => {
    let acumulado = factor();
    for (;;) {
      const ficha = mirar();
      if (ficha === undefined || ficha.tipo !== "simbolo") break;
      if (ficha.valor === "*") {
        i += 1;
        acumulado *= factor();
      } else if (ficha.valor === "/") {
        i += 1;
        acumulado /= factor();
      } else break;
    }
    return acumulado;
  };

  const argumentos = (): number[] => {
    comer("(");
    const valores: number[] = [suma()];
    for (;;) {
      const ficha = mirar();
      if (ficha !== undefined && ficha.valor === ",") {
        i += 1;
        valores.push(suma());
        continue;
      }
      break;
    }
    comer(")");
    return valores;
  };

  const variable = (): number => {
    comer("(");
    const nombre = mirar();
    if (nombre === undefined || nombre.tipo !== "nombre") {
      throw new Error(`var() sin nombre de propiedad en "${expresion}"`);
    }
    i += 1;
    const declarado = ctx.vars?.[nombre.valor];
    let reserva: string | undefined;
    const siguiente = mirar();
    if (siguiente !== undefined && siguiente.valor === ",") {
      i += 1;
      // El valor de reserva se toma como TEXTO hasta el cierre de la var:
      // puede ser cualquier expresion, incluida otra var().
      let nivel = 0;
      const trozos: string[] = [];
      for (;;) {
        const ficha = mirar();
        if (ficha === undefined) break;
        if (ficha.valor === "(") nivel += 1;
        if (ficha.valor === ")") {
          if (nivel === 0) break;
          nivel -= 1;
        }
        trozos.push(
          ficha.tipo === "numero"
            ? `${String(ficha.valor)}${ficha.unidad}`
            : ficha.valor,
        );
        i += 1;
      }
      reserva = trozos.join(" ");
    }
    comer(")");

    const elegido = declarado ?? reserva;
    if (elegido === undefined) {
      throw new Error(
        `var(${nombre.valor}) sin valor declarado ni reserva en "${expresion}"`,
      );
    }
    return longitudCssEnPx(elegido, ctx, profundidad + 1);
  };

  const factor = (): number => {
    const ficha = mirar();
    if (ficha === undefined) {
      throw new Error(`expresion incompleta: "${expresion}"`);
    }

    if (ficha.tipo === "simbolo") {
      if (ficha.valor === "(") {
        i += 1;
        const valor = suma();
        comer(")");
        return valor;
      }
      if (ficha.valor === "-") {
        i += 1;
        return -factor();
      }
      if (ficha.valor === "+") {
        i += 1;
        return factor();
      }
      throw new Error(`simbolo inesperado "${ficha.valor}" en "${expresion}"`);
    }

    if (ficha.tipo === "numero") {
      i += 1;
      return aPx(ficha.valor, ficha.unidad, ctx);
    }

    const funcion = ficha.valor.toLowerCase();
    i += 1;
    switch (funcion) {
      case "calc":
      case "min":
      case "max":
      case "clamp":
      case "var":
        break;
      default:
        throw new Error(
          `funcion CSS no resoluble por este instrumento: "${ficha.valor}()" en "${expresion}"`,
        );
    }

    if (funcion === "var") return variable();
    if (funcion === "calc") {
      comer("(");
      const valor = suma();
      comer(")");
      return valor;
    }

    const valores = argumentos();
    if (funcion === "min") return Math.min(...valores);
    if (funcion === "max") return Math.max(...valores);
    if (valores.length !== 3) {
      throw new Error(`clamp() con ${String(valores.length)} argumentos`);
    }
    return Math.max(valores[0], Math.min(valores[1], valores[2]));
  };

  const resultado = suma();
  if (i !== fichas.length) {
    throw new Error(
      `sobran fichas al final de "${expresion}" (${String(fichas.length - i)})`,
    );
  }
  return resultado;
}

/** Redondeo a dos decimales, para comparar contra medidas de navegador. */
export function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
