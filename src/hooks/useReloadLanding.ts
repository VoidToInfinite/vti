"use client";
import { useEffect, useRef } from "react";
import { STORAGE_KEYS } from "@/config/storage";
import {
  isMountedBranchEffective,
  scheduleBranchSettledCorrection,
} from "./branchSettledCorrection";
import { FRAGMENT_LANDING_SETTLE_MS } from "./useFragmentLanding";
import {
  applyStoredReadingPosition,
  captureReadingAnchor,
  type ReadingAnchor,
} from "./themeScrollAnchor";

/**
 * LA RECARGA EN TEMA OSCURO DEVUELVE AL LECTOR A SU SECCIÓN
 * (crítica externa #19, 2026-09-06, P1 #2).
 *
 * EN UNA FRASE: antes de descargarse, la portada anota en qué sección estaba
 * leyendo la persona; cuando vuelve a cargarse por una RECARGA (o por el
 * historial) y la rama de tema efectiva ya ha montado, la devuelve ahí -- una
 * sola vez, y solo si no ha tomado ella el control del scroll mientras tanto.
 *
 * ## El defecto, medido (no supuesto)
 *
 * Sonda propia sobre el build de `f3594ad`, Chrome 1440x900, tema oscuro
 * fijado en `localStorage`:
 *
 *   oscuro   scroll a y = 9.000 (contact)  ->  recarga  ->  y = 5.623 (journey)
 *   claro    scroll a y = 5.000            ->  recarga  ->  y = 5.016
 *
 * Deriva de −3.377 px en oscuro, una sección entera hacia atrás. La altura del
 * documento es 11.008 px antes y después de la recarga, así que el destino
 * existía: el problema no es que la página encogiera.
 *
 * ## La causa raíz, en una línea
 *
 * El navegador restituye la posición de la recarga contra la geometría del
 * HTML HORNEADO, que bajo `output: "export"` es SIEMPRE la rama clara (6.523
 * px de alto). La cuenta sale exacta y por eso no hay que suponer nada:
 * 6.523 − 900 (viewport) = 5.623, que es literalmente donde aterriza -- el
 * final del documento claro. Después la hidratación monta los decks de la rama
 * oscura, el documento crece a 11.008 px, y NADIE vuelve a medir: la
 * restitución de scroll es un paso de la navegación, no un observador del
 * layout.
 *
 * Es el hermano exacto del defecto que `useFragmentLanding.ts` arregló para
 * las cargas CON fragmento (crítica externa #11), con la misma causa y la
 * misma forma de esperar -- por eso los dos comparten
 * `branchSettledCorrection.ts`. Lo único que cambia es de dónde sale el
 * destino: allí de la URL, aquí de lo que la propia página anotó antes de
 * irse.
 *
 * ## La reincidencia del 2026-09-06, y la puerta que la cierra
 *
 * El primer arreglo dejó la corrección atada a `branchKey` confiando en que el
 * commit de la rama oscura limpiara el efecto de la clara ANTES de que sus
 * relojes vencieran. Medido sobre el build servido de `8213019` con la máquina
 * ocupada (cinco páginas recargando a la vez), NUEVE de quince recargas
 * aplicaron la corrección con el documento CLARO todavía montado: `scrollTo`
 * pedía 4.062,875 px --`contactTopDoc` 4.237 del documento de 6.258 px, en vez
 * de 9.174 del de 11.008-- y el lector acababa en `y = 4.063`, en Journey,
 * 4.937 px arriba. Peor que sin arreglo, porque `onFinish` cierra
 * `finishedRef` y ya no se vuelve a intentar.
 *
 * Desde esa fecha el efecto no arma NADA hasta que `isMountedBranchEffective`
 * confirma que la rama montada es la que el script anti-flash dejó escrita en
 * `<html>`. Ver ese docblock: ahí están las cifras y el porqué de leer el
 * atributo en vez de subir el tope de espera.
 *
 * `history.scrollRestoration` lo fija el sitio desde el 2026-09-10 (F20,
 * `scrollRestorationFor` en `resolveTheme.ts`): `"manual"` en la portada
 * --primero solo en oscuro y, desde el 2026-09-11 (P7-2, opción 1 del
 * dueño), en los DOS temas-- y `"auto"` fuera de ella. Cuando este hook se
 * escribió (crítica #19) nadie lo tocaba y la restitución que corregía era la
 * NATIVA del navegador; hoy, en la portada, ES ESTE HOOK quien restituye la
 * recarga, y en las legales sigue corrigiendo detrás de la nativa.
 *
 * ## Por qué NO se apagaba la restitución nativa, y por qué en la portada hoy sí
 *
 * Hasta F20 se descartaba a propósito: en la rama CLARA el navegador acierta
 * (control medido arriba: 5.000 -> 5.016, +16 px) y lo hace ANTES del primer
 * pintado; apagarlo cambiaba una restitución correcta e invisible por otra
 * que llega dos frames más tarde. Lo que cambió la decisión fue Atrás y
 * Adelante: con `"auto"` la nativa llega DESPUÉS de la única corrección de
 * este hook y pisa la lectura (F20, experimento emparejado de 15 pares: 47 de
 * 75 páginas en rojo con `"auto"`, 0 con `"manual"`), y en claro P7-2A midió
 * que la nativa llevaba el Atrás al fragmento de la URL en vez de a la
 * lectura. El salto visible de la recarga en claro es el precio declarado de
 * esa decisión: la familia 20 del candado lo acota (deriva <= 64 px) y exige
 * la llamada de restitución propia (`exigeLlamada`) en los dos temas.
 *
 * ## Qué se guarda, dónde y por qué ahí
 *
 * El ANCLA DE LECTURA que ya calcula `themeScrollAnchor.ts` para el cambio de
 * tema (sección de primer nivel bajo el centro del viewport, más el
 * desplazamiento dentro de ella), con el `pathname` y el `scrollY` del
 * momento. Va a `sessionStorage` bajo la clave declarada en
 * `src/config/storage.ts`, y las tres propiedades de esa elección son
 * deliberadas:
 *
 * - **`sessionStorage` y no `localStorage`:** una posición de lectura solo
 *   tiene sentido dentro de la pestaña que la produjo y solo hasta que se
 *   cierra. Sobrevivir al cierre del navegador convertiría un dato de sesión
 *   en un rastro persistente sin ninguna ganancia.
 * - **Números y un `id`, nunca un elemento ni nada de la persona:** es la
 *   misma disciplina que ya documenta `ReadingAnchor`, y hace que la entrada
 *   sea almacenamiento técnico exento del art. 22.2 LSSI-CE (declarada igual
 *   en el registro y en la tabla de `/privacidad`, porque esa tabla dice
 *   TODO lo que el sitio escribe).
 * - **Se escribe en `pagehide` y, como respaldo, en `visibilitychange` ->
 *   `hidden`:** `pagehide` es el único evento que un navegador móvil garantiza
 *   antes de descartar una página, y `visibilitychange` cubre el caso de que
 *   la pestaña se mate sin llegar a emitirlo. Los dos escriben lo mismo y la
 *   escritura es idempotente, así que duplicarla no cuesta nada.
 *
 * Lo que se anota es siempre lo que estaba EN PANTALLA en ese instante, sin
 * ninguna guarda extra. Si la persona oculta la pestaña justo después de una
 * recarga y antes de que este hook corrija, lo que se guarda es la sección
 * que de verdad está viendo -- no hay nada que proteger ahí.
 *
 * ## Cuándo se restituye, y los tres casos en los que NO
 *
 * 1. **Solo si la navegación es `reload` o `back_forward`**
 *    (`performance.getEntriesByType("navigation")`). Una visita nueva
 *    (`navigate`) no trae posición que restituir: arrastrar ahí una posición
 *    guardada sería secuestrar la entrada de alguien que acaba de llegar. Si
 *    el tipo no se puede leer, no se restituye -- ante la duda, la que manda
 *    es la carga nueva. ESTA CONDICIÓN NO BASTA POR SÍ SOLA, y el porqué está
 *    medido más abajo ("La navegación de cliente").
 * 2. **Solo si la URL NO trae fragmento.** Ese caso ya es entero de
 *    `useFragmentLanding.ts`, y los dos peleándose por el mismo scroll darían
 *    el peor resultado posible: el destino de la URL es lo que la persona
 *    pidió explícitamente, la posición guardada solo lo que había antes.
 * 3. **Solo si el `pathname` guardado es el de ahora.** La posición de la
 *    portada en castellano no dice nada sobre `/en` ni sobre una legal.
 *
 * La decisión se toma UNA vez, en la primera ejecución del efecto, y se
 * recuerda: sin eso, la escritura de `pagehide`/`visibilitychange` podría
 * cambiarle los datos a una corrección todavía pendiente.
 *
 * ## La navegación de cliente del 2026-09-06, y por qué el tipo de navegación
 * ## no basta por sí solo
 *
 * La primera versión de este hook (commit `58cb80f`) confiaba en que las tres
 * condiciones de arriba describieran LA NAVEGACIÓN EN CURSO. No la describen:
 * `performance.getEntriesByType("navigation")[0].type` describe el DOCUMENTO,
 * y bajo el App Router una navegación por `Link` no crea documento nuevo. Tras
 * una sola recarga, el tipo se queda en `"reload"` durante toda la vida de la
 * pestaña.
 *
 * Sonda propia sobre el build servido (Chrome headless 1440x900, tema oscuro,
 * muestreo del `scrollY` cada 100 ms durante 3 s tras volver a la portada):
 *
 *   A (control, sin recarga previa)
 *     scroll a 9.000 -> clic a /privacidad -> clic a /
 *     navType "navigate", 30 muestras a 0, sessionStorage vacío. Correcto.
 *
 *   B (con UNA recarga previa)
 *     scroll a 9.000 -> recarga (restituye 9.000, correcto)
 *     -> clic a /privacidad: navType SIGUE siendo "reload" y la entrada
 *        `{"pathname":"/","scrollY":9000,"anchor":{"id":"contact",...}}` sigue
 *        entera, porque una navegación de cliente no emite `pagehide`
 *     -> clic a /: 30 muestras a 9.000. ROTO.
 *
 * Tres cosas tenían que fallar a la vez, y fallaban las tres: el tipo de
 * navegación se quedaba en `"reload"`, la entrada de `sessionStorage` no se
 * retiraba nunca (no había un solo `removeItem` en este fichero), y
 * `HomeSections` REMONTA el hook en cada vuelta a la portada, con lo que
 * `finishedRef` --un `useRef`, que muere con el desmontaje-- no cerraba
 * ninguna puerta. Las tres condiciones volvían a cumplirse y la corrección se
 * aplicaba sobre una entrada que la persona no había pedido.
 *
 * EL ARREGLO ES QUE LA RESTITUCIÓN SE CONSUME, con dos refuerzos que se
 * apoyan mutuamente y que hacen falta LOS DOS:
 *
 * - **La entrada se retira al decidir** (`consumeStoredPosition`), tanto si se
 *   va a restituir como si se descarta. La reescribe el siguiente `pagehide`
 *   --que una recarga real SÍ emite-- así que la próxima recarga tiene su
 *   valor fresco y una navegación de cliente posterior no encuentra nada. De
 *   paso deja de haber un dato de sesión vivo sin necesitarlo, que es lo que
 *   la ficha de `/privacidad` promete de esta entrada.
 * - **Un guard de MÓDULO** (`restorationConsumed`), porque el borrado solo no
 *   cierra el caso realista de cambiar de pestaña: restituida la posición y
 *   borrada la entrada, ocultar la pestaña dispara `visibilitychange` y la
 *   REESCRIBE con la posición de ese momento; una navegación de cliente
 *   posterior volvería a encontrarla, con el tipo todavía en `"reload"`. Un
 *   `useRef` no puede llevar esa marca (muere con el desmontaje) y
 *   `sessionStorage` tampoco (es justo lo que se acaba de retirar): la marca
 *   tiene que vivir exactamente lo que vive el DOCUMENTO, y eso es lo que dura
 *   una variable de módulo -- una carga nueva trae un módulo nuevo.
 *
 * ## Cómo se restituye: el ancla, no el píxel
 *
 * `restoreReadingAnchor(anchor)`, nunca `scrollTo` al `scrollY` guardado a
 * secas. En el caso normal las dos opciones dan EXACTAMENTE lo mismo -- tras
 * una recarga el tema sale del mismo `localStorage`, así que la rama es la
 * misma, el ancla no se ha movido y `anchoredScrollY` devuelve el `scrollY` de
 * partida byte a byte. Divergen cuando la geometría SÍ cambió entre las dos
 * cargas: otra anchura de ventana, otra preferencia de tamaño de texto, o un
 * despliegue con contenido distinto. Ahí el píxel guardado es una cifra que ya
 * no significa nada y el ancla sigue significando "la sección que estabas
 * leyendo, por donde ibas". El píxel se conserva solo como RESPALDO para el
 * caso en que no hubiera ancla que capturar (ninguna sección intersecaba el
 * viewport), donde no hay nada mejor a lo que agarrarse.
 *
 * `behavior: "instant"` lo garantiza `restoreReadingAnchor` por construcción,
 * con su propio porqué escrito: `"auto"` resolvería al `scroll-behavior:
 * smooth` global de `GlobalStyles.tsx` y convertiría una corrección de
 * colocación en un viaje animado de miles de píxeles.
 *
 * ## Lo que este hook NO hace
 *
 * - NO unifica la longitud de scroll entre temas: sigue siendo la decisión
 *   pendiente del dueño que `docs/qa-3d-pendiente.md` declara desde el
 *   2026-08-12. Esta corrección hace que la divergencia deje de romper la
 *   recarga mientras se decide.
 * - NO vive en las páginas legales: sin decks no hay divergencia de alto entre
 *   ramas, así que ahí la restitución nativa ya acierta.
 * - NO le hace falta a `useFragmentLanding.ts` el mismo remedio, y se
 *   comprobó antes de descartarlo: su `finishedRef` muere igual al
 *   desmontarse y su `loadHashRef` se recaptura igual en cada montaje, pero lo
 *   que recaptura es `window.location.hash`, que SÍ cambia con la navegación
 *   de cliente. Al volver a la portada por un enlace sin fragmento lee `""` y
 *   no hace nada; al volver por `/#contact` --el caso del pie de las
 *   legales-- corrige hacia el destino que la persona acaba de pedir, que es
 *   su trabajo. Su entrada describe la navegación EN CURSO; la de este hook
 *   describía el documento, y de ahí la asimetría.
 */

/** Lo que la portada anota antes de irse. Todo son datos planos: se serializa
 *  a JSON y se vuelve a validar campo por campo al leerlo, porque entre la
 *  escritura y la lectura cabe un despliegue con otro formato. */
interface StoredReadingPosition {
  /** Ruta que produjo la posición. Sin esto, la posición de `/` se aplicaría
   *  en `/en` o en una legal. */
  readonly pathname: string;
  /** `window.scrollY` del momento. Respaldo para cuando no hubo ancla. */
  readonly scrollY: number;
  /** El ancla de lectura, o `null` si ninguna sección intersecaba el
   *  viewport (una página sin secciones, o un tramo sin ninguna). */
  readonly anchor: ReadingAnchor | null;
}

/** Tipos de navegación en los que la posición guardada describe la MISMA
 *  visita que se está reanudando. `navigate` y `prerender` quedan fuera: ahí
 *  la persona está llegando, no volviendo. */
const RESUMED_NAVIGATION_TYPES: ReadonlySet<string> = new Set([
  "reload",
  "back_forward",
]);

function isReadingAnchor(value: unknown): value is ReadingAnchor {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.topDoc === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.scrollY === "number"
  );
}

function isStoredReadingPosition(
  value: unknown,
): value is StoredReadingPosition {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.pathname === "string" &&
    typeof candidate.scrollY === "number" &&
    (candidate.anchor === null || isReadingAnchor(candidate.anchor))
  );
}

/**
 * Interpreta lo que había guardado. Entre la escritura y la lectura cabe un
 * despliegue con otro formato, y `sessionStorage` es texto que cualquiera
 * puede editar desde las herramientas del navegador: lo que no se reconoce se
 * descarta sin lanzar.
 */
function parseStoredPosition(raw: unknown): StoredReadingPosition | null {
  return isStoredReadingPosition(raw) ? raw : null;
}

/**
 * DOS FORMATOS, SEGÚN EL NAVEGADOR (F20-A, ruta R2 del diseño).
 *
 * CON la Navigation API, el almacén es un MAPA POR ENTRADA DEL HISTORIAL,
 * indexado por `navigation.currentEntry.key` (estable entre documentos: una
 * recarga o un Atrás que vuelve a cargar la entrada traen la misma clave).
 * Cada ranura solo se aplica en la entrada que la escribió. Un mapa por
 * `pathname` NO basta: la ranura de `/` sobrevivía a varias cargas y se
 * aplicaba a OTRA entrada `/` (A a 5000 -> `/en` -> C `/` a 200 -> Atrás ->
 * Atrás dejaba A en 200, donde la nativa acertaba).
 *
 * SIN la Navigation API, el formato y la regla son EXACTAMENTE los de
 * `403bd29`: una sola posición en la raíz, que la carga siguiente consume
 * entera y solo aplica con el mismo `pathname`. No hay forma fiable de
 * distinguir dos entradas con la misma URL, así que ahí no se añade nada.
 *
 * `null` en `parseStoredMap` = lo guardado no es un mapa (JSON roto, o una
 * posición suelta con `pathname` en la raíz): cuenta como ilegible, es decir,
 * se retira entero y no se aplica.
 */
type StoredReadingPositions = Record<string, unknown>;

interface NavigationEntryLike {
  readonly key?: string;
}

/** Clave de la entrada ACTIVA del historial, o `null` sin Navigation API. */
function currentEntryKey(): string | null {
  const { navigation } = window as Window & {
    navigation?: { readonly currentEntry?: NavigationEntryLike | null };
  };
  const key = navigation?.currentEntry?.key;
  return typeof key === "string" && key !== "" ? key : null;
}

function parseStoredMap(raw: string): StoredReadingPositions | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  if (Array.isArray(parsed)) return null;
  // El formato anterior (una sola posición en la raíz) no es un mapa aunque
  // sea un objeto: se reconoce por su `pathname` de texto en la raíz.
  if (typeof (parsed as Record<string, unknown>).pathname === "string") {
    return null;
  }
  return parsed as StoredReadingPositions;
}

function readStoredMap(): StoredReadingPositions {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEYS.readingPosition);
  } catch {
    return {};
  }
  return raw === null ? {} : (parseStoredMap(raw) ?? {});
}

function writeStoredMap(map: StoredReadingPositions): void {
  try {
    if (Object.keys(map).length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEYS.readingPosition);
      return;
    }
    window.sessionStorage.setItem(
      STORAGE_KEYS.readingPosition,
      JSON.stringify(map),
    );
  } catch {
    // Sin almacenamiento no hay restitución: se degrada, no se rompe.
  }
}

/**
 * Retira la entrada. Es la mitad de "la restitución se consume": una posición
 * de lectura solo vale para LA carga que la produjo, y dejarla viva después es
 * lo que permitía que una navegación de cliente posterior la aplicara (ver el
 * escenario B del docblock de cabecera).
 *
 * `try/catch` por el mismo motivo medido que la lectura y la escritura: el
 * acceso LANZA, no devuelve `null`, con el almacenamiento de sitio bloqueado.
 * Si no se pudo borrar tampoco pasa nada grave -- el guard de módulo cubre el
 * mismo caso desde el otro lado, que es justamente por lo que son dos.
 */
function clearStoredPosition(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.readingPosition);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** Con Navigation API escribe SOLO la ranura de la entrada activa: las de
 *  otras entradas (la de `/` cuando se sale a `/en`) sobreviven para su propio
 *  Atrás. Sin ella, la única posición de `403bd29`. */
function writeStoredPosition(): void {
  const position: StoredReadingPosition = {
    pathname: window.location.pathname,
    scrollY: window.scrollY,
    anchor: captureReadingAnchor(),
  };
  const key = currentEntryKey();
  if (key === null) {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEYS.readingPosition,
        JSON.stringify(position),
      );
    } catch {
      // Sin almacenamiento no hay restitución, que es exactamente el
      // comportamiento de hoy: se degrada, no se rompe.
    }
    return;
  }
  const map = readStoredMap();
  map[key] = position;
  writeStoredMap(map);
}

/**
 * `true` si esta carga REANUDA una visita anterior. La entrada de navegación
 * puede faltar (motores antiguos, o una medición que el navegador decidió no
 * exponer): ahí se devuelve `false`, porque confundir una visita nueva con
 * una recarga movería a alguien que acaba de llegar.
 */
function isResumedNavigation(): boolean {
  const [entry] = window.performance.getEntriesByType("navigation");
  if (entry === undefined) return false;
  const { type } = entry as PerformanceNavigationTiming;
  return typeof type === "string" && RESUMED_NAVIGATION_TYPES.has(type);
}

/**
 * ¿ESTE documento ya consumió su restitución?
 *
 * Vive en el módulo y no en un `useRef` porque la propiedad que expresa es del
 * DOCUMENTO, no del componente: `HomeSections` se desmonta y se vuelve a
 * montar en cada vuelta a la portada por un enlace, y un `useRef` se lleva por
 * delante la única marca que impedía repetir la restitución (escenario B del
 * docblock de cabecera, 30 muestras a 9.000 px). Una variable de módulo dura
 * exactamente lo que dura el documento: una recarga trae un módulo nuevo, que
 * es justo cuando la restitución vuelve a tener sentido.
 */
let restorationConsumed = false;

/**
 * Reinicia el guard de módulo. EXISTE SOLO PARA LOS CANDADOS, y el nombre lo
 * dice para que nadie lo llame por error: en el sitio real un documento nuevo
 * trae un módulo nuevo y esta función no haría falta, pero jsdom reutiliza el
 * mismo módulo para todos los casos de un fichero de test, así que sin ella
 * solo el primero podría ejercitar una restitución. El candado que impide que
 * ningún fichero de producción la nombre está en `useReloadLanding.test.ts`,
 * y es una barredura por `fs` sobre `src/` y `app/`: una función que abre el
 * guard no puede quedarse sin vigilancia solo porque su nombre lo desaconseje.
 */
export function resetReadingRestorationForTests(): void {
  restorationConsumed = false;
}

/**
 * Lee la entrada y la CONSUME: la retira del almacén y marca este documento
 * como ya restituido. Los dos refuerzos se aplican aquí juntos a propósito --
 * son la misma decisión vista desde dos sitios, y separarlos dejaría uno de
 * los dos sin la otra mitad.
 *
 * SE CONSUME LO QUE HABÍA, se pueda interpretar o no: lo que decide es la
 * existencia de la entrada, no que su contenido sirva. Una entrada ilegible
 * --el formato de un despliegue anterior-- también se retira, porque dejarla
 * viva sin marcar el guard abriría exactamente el agujero que este arreglo
 * cierra: bastaría con que el siguiente `visibilitychange` escribiera una
 * legible encima para que un montaje posterior volviera a obtener un sí.
 *
 * Cuando NO había nada no se consume nada, y ahí el guard tiene que quedarse
 * abierto: una página que todavía no ha recibido su anotación no ha gastado
 * ninguna restitución.
 *
 * `try/catch` alrededor de CADA acceso a `sessionStorage`, igual que
 * `ThemeProvider.tsx` alrededor de `localStorage` y por el mismo motivo
 * medido: el acceso lanza --no devuelve `null`-- en navegación privada de
 * algunos motores y con el almacenamiento de sitio bloqueado por política.
 * Una preferencia de scroll no puede tumbar la página.
 */
function consumeStoredPosition(): StoredReadingPosition | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEYS.readingPosition);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const key = currentEntryKey();
  if (key === null) {
    // Sin Navigation API: la regla de `403bd29`, entera.
    clearStoredPosition();
    restorationConsumed = true;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    return parseStoredPosition(parsed);
  }

  const map = parseStoredMap(raw);
  if (map === null) {
    clearStoredPosition();
    restorationConsumed = true;
    return null;
  }

  // Con el mapa, "no había nada" es "no hay ranura para ESTA entrada": ahí no
  // se consume nada y las ranuras de las demás entradas se quedan donde
  // estaban.
  if (!Object.prototype.hasOwnProperty.call(map, key)) return null;

  const slot = map[key];
  const rest: StoredReadingPositions = { ...map };
  delete rest[key];
  writeStoredMap(rest);
  restorationConsumed = true;
  return parseStoredPosition(slot);
}

/**
 * La posición que hay que restituir en ESTA carga, o `null` si no hay nada que
 * hacer. Se evalúa una sola vez: ver "Cuándo se restituye" arriba.
 *
 * La entrada se consume ANTES de aplicar las tres condiciones, no después: se
 * retira tanto si se va a restituir como si se descarta. Una posición que este
 * documento ya ha mirado no vuelve a estar disponible para nadie, y el
 * siguiente `pagehide` la reescribe con la posición del momento.
 */
function resolveRestorablePosition(): StoredReadingPosition | null {
  const stored = consumeStoredPosition();
  if (stored === null) return null;

  if (!isResumedNavigation()) return null;
  if (window.location.hash !== "") return null;
  return stored.pathname === window.location.pathname ? stored : null;
}

/**
 * @param branchKey Identidad de la rama montada. `HomeSections.tsx` pasa el
 * `themeName` del proveedor: cuando cambia, la corrección pendiente se cancela
 * y se vuelve a armar contra el maquetado nuevo. Es el MISMO parámetro y el
 * mismo contrato que `useFragmentLanding`, y se tipa como `string` por la
 * misma razón -- a este hook no le importa QUÉ rama es, solo que ha cambiado.
 */
export function useReloadLanding(branchKey: string): void {
  /** `true` en cuanto la restitución se aplicó O se abortó. Cierra la puerta a
   *  cualquier ejecución futura del efecto: sin esto, un cambio de tema del
   *  usuario media hora después volvería a saltar a la posición de la carga. */
  const finishedRef = useRef(false);
  /** `undefined` mientras no se ha decidido; después, la posición a restituir
   *  o `null`. La decisión es de la CARGA y no se vuelve a tomar.
   *
   *  Sigue siendo un `useRef` y no una variable de módulo, y la asimetría con
   *  `restorationConsumed` es deliberada: esto memoriza la decisión de ESTE
   *  montaje para que las pasadas siguientes del efecto --las del cambio de
   *  rama-- no la vuelvan a tomar, mientras que aquel recuerda que el
   *  DOCUMENTO ya gastó la suya. Un montaje nuevo tiene que poder preguntar de
   *  nuevo; lo que no puede es volver a obtener un sí. */
  const restorableRef = useRef<StoredReadingPosition | null | undefined>(
    undefined,
  );

  // El escritor. No depende de la rama: lo que anota es la geometría que hay
  // delante en el instante de irse, sea la que sea.
  useEffect(() => {
    function onHidden(): void {
      if (document.visibilityState === "hidden") writeStoredPosition();
    }
    window.addEventListener("pagehide", writeStoredPosition);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", writeStoredPosition);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  useEffect(() => {
    if (finishedRef.current) return;
    if (restorableRef.current === undefined) {
      // El guard de módulo se consulta AQUÍ y no al principio del efecto: si
      // cerrara la puerta en cada pasada, el montaje que sí tiene una
      // restitución pendiente la perdería al cambiar de rama, que es
      // exactamente lo que la puerta de `isMountedBranchEffective` espera para
      // armar. Lo que este guard decide es si un MONTAJE NUEVO puede volver a
      // obtener un sí, y esa pregunta solo se hace una vez por montaje.
      restorableRef.current = restorationConsumed
        ? null
        : resolveRestorablePosition();
    }
    const restorable = restorableRef.current;
    if (restorable === null) return;

    // LA PUERTA. Mientras la rama montada no sea la efectiva no se arma NADA:
    // ni relojes ni guarda. Va DESPUÉS de decidir qué hay que restituir a
    // propósito: esa decisión tiene que tomarse en la PRIMERA pasada del
    // efecto (ver "Cuándo se restituye" arriba), porque un `pagehide` o un
    // `visibilitychange` que ocurriera mientras la puerta está cerrada
    // reescribiría la entrada de `sessionStorage` y le cambiaría los datos a
    // una corrección todavía pendiente.
    //
    // El efecto se vuelve a evaluar solo cuando `branchKey` cambia, que es
    // exactamente cuando la respuesta puede cambiar: el commit de la rama
    // oscura. Ver `isMountedBranchEffective` para el porqué medido.
    if (!isMountedBranchEffective(branchKey)) return;

    // La limpieza del programador compartido se devuelve TAL CUAL: descarta la
    // corrección pendiente entera al cambiar de rama, sin tocar `finishedRef`
    // -- el cambio de rama tiene que poder volver a armar. Ver
    // `branchSettledCorrection.ts`.
    return scheduleBranchSettledCorrection({
      settleMs: FRAGMENT_LANDING_SETTLE_MS,
      onFinish: () => {
        finishedRef.current = true;
      },
      // La regla (ancla primero, píxel solo sin ancla, 1 px de umbral) es la
      // misma que usan los recorridos del historial, y vive una sola vez en
      // `applyStoredReadingPosition`, con su porqué.
      apply: () => {
        applyStoredReadingPosition(restorable);
      },
    });
  }, [branchKey]);
}
