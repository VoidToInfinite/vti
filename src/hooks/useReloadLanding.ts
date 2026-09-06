"use client";
import { useEffect, useRef } from "react";
import { STORAGE_KEYS } from "@/config/storage";
import { scheduleBranchSettledCorrection } from "./branchSettledCorrection";
import { FRAGMENT_LANDING_SETTLE_MS } from "./useFragmentLanding";
import {
  captureReadingAnchor,
  restoreReadingAnchor,
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
 * `history.scrollRestoration` NO lo toca nadie en este repo ni en el
 * framework (censo sobre `node_modules/next/dist/client`: cero ficheros),
 * así que la restitución que se está corrigiendo es la NATIVA del navegador.
 *
 * ## Por qué no se apaga la restitución nativa, que sería lo obvio
 *
 * `history.scrollRestoration = "manual"` la desactivaría de raíz y dejaría
 * este hook como única vía. Se descarta a propósito: en la rama CLARA el
 * navegador acierta (control medido arriba: 5.000 -> 5.016, +16 px) y lo hace
 * ANTES del primer pintado. Apagarlo cambiaría una restitución correcta e
 * invisible por otra que llega dos frames más tarde, es decir, por un salto
 * visible desde el principio de la página. Se conserva la nativa y se corrige
 * DESPUÉS solo lo que haga falta; en claro esa corrección es un no-op
 * observable, porque el ancla no se ha movido y la aritmética devuelve el
 * mismo `scrollY` (ver `anchoredScrollY`, propiedad 1).
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
 *    es la carga nueva.
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
 * - NO borra la entrada al restituirla. No hace falta: el siguiente
 *   `pagehide` la reescribe entera, y la pestaña se la lleva al cerrarse.
 * - NO vive en las páginas legales: sin decks no hay divergencia de alto entre
 *   ramas, así que ahí la restitución nativa ya acierta.
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
 * `try/catch` alrededor de CADA acceso a `sessionStorage`, igual que
 * `ThemeProvider.tsx` alrededor de `localStorage` y por el mismo motivo
 * medido: el acceso lanza --no devuelve `null`-- en navegación privada de
 * algunos motores y con el almacenamiento de sitio bloqueado por política.
 * Una preferencia de scroll no puede tumbar la página.
 */
function readStoredPosition(): StoredReadingPosition | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEYS.readingPosition);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isStoredReadingPosition(parsed) ? parsed : null;
}

function writeStoredPosition(): void {
  const position: StoredReadingPosition = {
    pathname: window.location.pathname,
    scrollY: window.scrollY,
    anchor: captureReadingAnchor(),
  };
  try {
    window.sessionStorage.setItem(
      STORAGE_KEYS.readingPosition,
      JSON.stringify(position),
    );
  } catch {
    // Sin almacenamiento no hay restitución, que es exactamente el
    // comportamiento de hoy: se degrada, no se rompe.
  }
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

/** La posición que hay que restituir en ESTA carga, o `null` si no hay nada
 *  que hacer. Se evalúa una sola vez: ver "Cuándo se restituye" arriba. */
function resolveRestorablePosition(): StoredReadingPosition | null {
  if (!isResumedNavigation()) return null;
  if (window.location.hash !== "") return null;

  const stored = readStoredPosition();
  if (stored === null) return null;
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
   *  o `null`. La decisión es de la CARGA y no se vuelve a tomar. */
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
      restorableRef.current = resolveRestorablePosition();
    }
    const restorable = restorableRef.current;
    if (restorable === null) return;

    // La limpieza del programador compartido se devuelve TAL CUAL: descarta la
    // corrección pendiente entera al cambiar de rama, sin tocar `finishedRef`
    // -- el cambio de rama tiene que poder volver a armar. Ver
    // `branchSettledCorrection.ts`.
    return scheduleBranchSettledCorrection({
      settleMs: FRAGMENT_LANDING_SETTLE_MS,
      onFinish: () => {
        finishedRef.current = true;
      },
      apply: () => {
        if (restorable.anchor !== null) {
          // `restoreReadingAnchor` decide por su cuenta si hay algo que
          // corregir y no llama a `scrollTo` cuando la cuenta da el mismo
          // sitio (umbral de 1 px). Su `false` NO es un fallo del que haya que
          // recuperarse con el píxel guardado: significa "no hacía falta" o
          // "el ancla ya no existe en esta rama", y en los dos casos mover la
          // página a un número viejo sería peor que no hacer nada.
          restoreReadingAnchor(restorable.anchor);
          return;
        }
        if (Math.abs(window.scrollY - restorable.scrollY) < 1) return;
        window.scrollTo({ top: restorable.scrollY, behavior: "instant" });
      },
    });
  }, [branchKey]);
}
