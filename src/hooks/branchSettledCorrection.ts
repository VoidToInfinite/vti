/**
 * CORRECCIÓN DE SCROLL QUE ESPERA A QUE LA RAMA EFECTIVA SE ASIENTE.
 *
 * EN UNA FRASE: aplica UNA sola cosa, UNA sola vez, cuando el maquetado de la
 * rama de tema que de verdad va a quedarse ya existe -- y no la aplica en
 * absoluto si el lector ha tomado él el control del scroll mientras tanto.
 *
 * ## Por qué este módulo existe (el problema compartido, no el mecanismo)
 *
 * Bajo `output: "export"` el primer render es SIEMPRE la rama clara
 * (`ThemeProvider` no puede leer `localStorage` durante el render sin romper
 * el HTML horneado -- ver su docblock). Cualquier decisión de scroll que el
 * NAVEGADOR tome durante la carga la toma sobre ESA geometría, la del
 * documento claro, y cuando la hidratación monta los decks de la rama oscura
 * el documento crece varios miles de píxeles sin que nadie vuelva a medir.
 *
 * Ese mismo instante mal elegido produce DOS defectos distintos, medidos por
 * separado y con dos hallazgos propios:
 *
 * - **El aterrizaje en un fragmento** (`useFragmentLanding.ts`, crítica
 *   externa #11): `/#contact` en oscuro deja el destino a +9.993 px.
 * - **La restitución de la recarga** (`useReloadLanding.ts`, crítica externa
 *   #19, P1 #2): recargar a `y = 9.000` en oscuro devuelve a `y = 5.623`,
 *   3.377 px arriba y una sección atrás.
 *
 * Los dos son el mismo error de tiempo con dos consumidores. Lo que cambia
 * entre ellos es QUÉ se corrige (un `scrollIntoView` al destino contra un
 * `scrollTo` al ancla de lectura) y CUÁNDO decide corregir (un fragmento en
 * la URL contra un tipo de navegación y una posición guardada). Lo que NO
 * cambia -- el reloj, la carrera, la guarda de intención humana y el "una
 * sola vez" -- vive aquí, para que arreglar una de las dos mitades no deje a
 * la otra con una copia envejecida.
 *
 * ## Los DOS RELOJES, y por qué no basta con uno
 *
 * 1. `requestAnimationFrame` ANIDADO: el primero cae en el commit de la rama,
 *    el segundo ya con la página nueva compuesta. Las alturas de los decks
 *    son CSS por viewport (`100dvh` y múltiplos), no dependen de que ninguna
 *    imagen decodifique, así que dos frames bastan para que el layout sea el
 *    definitivo.
 * 2. Un tope en milisegundos, porque en una pestaña oculta NO HAY FRAMES --
 *    ni `requestAnimationFrame`, ni relojes de animación (CLAUDE.md §5 punto
 *    3, y las tres lecciones de `task/lessons.md` sobre `visibilityState:
 *    "hidden"`). Un aviso que puede no llegar jamás no puede ser la única vía
 *    de progreso.
 *
 * Gana el que llegue primero; el otro se encuentra la puerta cerrada. El
 * ganador NO cancela al perdedor, y es deliberado -- misma decisión ya
 * documentada en `scheduleAnchorCorrection` (`useThemeScrollReset.ts`):
 * cancelar desde aquí dejaría el guard `settled` sin poder observarse (el
 * perdedor no llegaría a intentarlo nunca), y un guard que ningún test puede
 * ver fallar no está verificado. Cancelar sí se cancela donde de verdad hace
 * falta: al abortar y al desmontar/cambiar de rama.
 *
 * ## Lo que este módulo NO decide
 *
 * - NO decide si hay que corregir: eso es del hook que lo llama, que lo
 *   resuelve ANTES de programar nada (un fragmento vacío, una navegación que
 *   no es recarga). Aquí solo se llega cuando ya hay algo que hacer, y por
 *   eso los listeners de la guarda tampoco se registran nunca "por si acaso".
 * - NO recuerda nada entre llamadas. El "una sola vez" que sobrevive a un
 *   cambio de rama lo lleva el hook en su propio `useRef`, porque el cambio
 *   de rama tiene que poder volver a armar mientras la corrección siga
 *   pendiente y NO poder hacerlo una vez resuelta. `onFinish` es exactamente
 *   ese aviso.
 */

/**
 * Teclas cuyo comportamiento por defecto es desplazar el documento. Pulsar
 * una de ellas ES tomar el control del scroll, exactamente igual que una
 * rueda o un arrastre táctil.
 *
 * La lista es cerrada a propósito: un `keydown` cualquiera (escribir en el
 * campo de correo de Contacto, tabular) no desplaza nada por sí mismo y
 * abortar por él dejaría al lector tirado sin motivo. `" "` es la barra
 * espaciadora en navegadores actuales; `"Spacebar"` es el valor heredado que
 * todavía emiten motores antiguos.
 */
const SCROLL_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Spacebar",
]);

export interface BranchSettledCorrection {
  /**
   * Tope de espera al re-maquetado cuando el doble `requestAnimationFrame`
   * no llega (pestaña oculta, donde no hay frames en absoluto). Lo pone el
   * consumidor y no este módulo: el número tiene un solo dueño en el repo
   * (`FRAGMENT_LANDING_SETTLE_MS`, con su porqué y su excepción sancionada
   * en el detector de anti-patrones) y duplicarlo aquí crearía una segunda
   * fuente del mismo plazo.
   */
  readonly settleMs: number;
  /** Qué corregir. Se llama como MUCHO una vez, y solo con la rama efectiva
   *  ya montada. */
  readonly apply: () => void;
  /** Aviso de que esta corrección ya no está pendiente: se aplicó, o el
   *  lector tomó el control y se abortó. NO se llama al cambiar de rama ni
   *  al desmontar -- ahí la corrección se descarta para volver a armarse. */
  readonly onFinish: () => void;
}

/**
 * Programa la corrección y devuelve su limpieza, pensada para devolverse tal
 * cual desde un `useEffect` dependiente de la rama de tema.
 *
 * La limpieza descarta la corrección pendiente ENTERA, nunca la encola: un
 * cambio de rama significa que lo que se iba a corregir se midió contra una
 * página que ya no existe.
 */
export function scheduleBranchSettledCorrection(
  correction: BranchSettledCorrection,
): () => void {
  const { settleMs, apply, onFinish } = correction;

  let settled = false;
  let frameId: number | null = null;
  let timeoutId: number | null = null;

  function cancelClocks(): void {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  /** Cero listeners permanentes: los tres de la guarda se retiran al
   *  corregir, al abortar y al desmontar, sin excepción. */
  function releaseGuard(): void {
    window.removeEventListener("wheel", onManualScroll);
    window.removeEventListener("touchmove", onManualScroll);
    window.removeEventListener("keydown", onKeyDown);
  }

  /**
   * El lector ha tomado el control del scroll antes de que llegara la
   * corrección: se aborta y no se vuelve a intentar. Arrebatarle el scroll a
   * quien ya está leyendo por su cuenta sería un defecto peor que el que
   * estos hooks arreglan.
   *
   * La guarda escucha INTENCIÓN (`wheel`/`touchmove`/`keydown`), nunca el
   * evento `scroll`: tanto el salto al fragmento que hace el navegador al
   * cargar como la restitución de posición de una recarga emiten `scroll`, y
   * la propia corrección de estos hooks también -- escuchar `scroll`
   * abortaría siempre, contra la nada.
   */
  function onManualScroll(): void {
    if (settled) return;
    settled = true;
    onFinish();
    cancelClocks();
    releaseGuard();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (SCROLL_KEYS.has(event.key)) onManualScroll();
  }

  function applyOnce(): void {
    if (settled) return;
    settled = true;
    onFinish();
    releaseGuard();
    apply();
  }

  window.addEventListener("wheel", onManualScroll, { passive: true });
  window.addEventListener("touchmove", onManualScroll, { passive: true });
  window.addEventListener("keydown", onKeyDown);

  if (typeof window.requestAnimationFrame === "function") {
    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(applyOnce);
    });
  }
  timeoutId = window.setTimeout(applyOnce, settleMs);

  return () => {
    // Desmontaje, o cambio de rama.
    //
    // LAS DOS PRIMERAS LÍNEAS SON REDUNDANTES ENTRE SÍ, y está medido, no
    // supuesto: con solo `settled = true`, un frame viejo que llegue igual se
    // encuentra la puerta cerrada (cierra sobre ESTA clausura, no sobre la
    // del efecto nuevo); con solo `cancelClocks()`, ese frame no llega a
    // ejecutarse. Cada una basta para la propiedad que importa (la corrección
    // de la rama vieja NO se aplica), así que el candado de esa propiedad no
    // puede distinguirlas -- se verificó retirando `cancelClocks()` y la
    // suite siguió en verde. Se conservan las dos: la segunda no está para la
    // propiedad sino para no dejar relojes huérfanos corriendo tras un
    // desmontaje, y ESA sí tiene candado propio ("al cambiar de rama no deja
    // relojes huérfanos").
    settled = true;
    cancelClocks();
    releaseGuard();
  };
}
