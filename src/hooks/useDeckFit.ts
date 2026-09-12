"use client";
import { useEffect, type RefObject } from "react";

/**
 * Atributo de estado que este hook escribe en la PISTA de una presentación
 * pegajosa (`ScTrack` / `ScJourneyTrack`). Vive aquí, y no duplicado como
 * literal en los dos ficheros de deck, porque es exactamente el caso de la
 * regla 13 de `RULES.md`: un valor idéntico que dos secciones tienen que
 * escribir igual o el CSS de una de las dos deja de casar en silencio.
 *
 * Tres estados, no dos, y el tercero es el importante:
 *
 * - `"true"`  -- medido, y cada diapositiva cabe en el escenario pegado.
 * - `"false"` -- medido, y alguna diapositiva NO cabe.
 * - AUSENTE   -- todavía no se ha medido nada. Es el estado del HTML servido
 *   (el export estático no ejecuta este hook), el del primer render antes de
 *   que el efecto corra, y el de cualquier entorno sin `ResizeObserver`
 *   -- jsdom entre ellos. La ausencia deja el deck EXACTAMENTE como estaba
 *   antes de esta pieza: el CSS del estado "no cabe" solo se activa con el
 *   valor `"false"` explícito, nunca por omisión.
 */
export const DECK_FIT_ATTRIBUTE = "data-deck-fit";

/** Valor de `DECK_FIT_ATTRIBUTE` cuando todas las diapositivas caben. */
export const DECK_FITS = "true";

/**
 * Valor de `DECK_FIT_ATTRIBUTE` cuando alguna diapositiva no cabe. Es el que
 * los dos ficheros de deck interpolan en su selector de estado, así que
 * cambiarlo aquí mueve el CSS de las dos secciones a la vez.
 */
export const DECK_DOES_NOT_FIT = "false";

/**
 * Tolerancia (px) del contraste "cabe / no cabe". Un píxel: `scrollHeight`
 * redondea a entero y el alto del escenario puede salir fraccionario
 * (`dvh` sobre una pantalla HiDPI), así que una diferencia de subpíxel entre
 * dos medidas de la MISMA caja no es un desbordamiento -- y sin tolerancia
 * bastaría para linealizar un deck que en realidad cabe.
 */
export const DECK_FIT_TOLERANCE_PX = 1;

/**
 * Selector de las diapositivas dentro del escenario. `data-slide-index` ya lo
 * escriben los dos consumidores en el JSX de cada diapositiva (Story.tsx,
 * Journey.tsx) desde mucho antes que este hook, y varios candados lo usan
 * como contrato estable: se reutiliza en vez de inventar un atributo nuevo
 * que tendría que mantenerse sincronizado con aquel.
 */
const SELECTOR_DIAPOSITIVA = "[data-slide-index]";

/**
 * EL PIN DE UNA PRESENTACIÓN ES CONDICIONAL A QUE SU CONTENIDO QUEPA
 * (crítica externa #19, P1 número 3; WCAG 1.4.4 Resize Text).
 *
 * ## El defecto que cierra
 *
 * Medido sobre el build de `f3594ad` en Chrome, tema oscuro, sin
 * `prefers-reduced-motion`, con la raíz a 32 px (el 200 % de tamaño de texto
 * que exige el criterio) y 320x800 de viewport: con la diapositiva de cierre
 * del deck de Story activa, el enlace de comunidad quedaba 706 px POR DEBAJO
 * del borde inferior del escenario. El escenario mide `100dvh` y recorta
 * (`overflow: hidden`), y su contenido medía 2.049 px. A 390x800 con la misma
 * raíz, 458 px fuera; a raíz 24, 69 px fuera. Ningún gesto alcanzaba ese
 * contenido: el escenario no scrollea, y la página, por debajo, ya ha pasado
 * de largo la diapositiva.
 *
 * ## La matriz medida, y lo que queda fuera
 *
 * Sobre el build propio, en Chrome sin ventana: tema OSCURO (el claro no monta
 * ninguna presentación: no hay pin que condicionar), anchos 320, 390 y 1.440,
 * raíces 16, 24 y 32 px por `Page.setFontSizes`, movimiento `no-preference` y
 * `reduce`, DPR 1, sin gesto de teclado ni de puntero, idioma español. Las dos
 * secciones con deck (Story y Journey) en cada combinación. Queda fuera a
 * propósito: DPR 2 (el estado depende de longitudes CSS, no de píxeles de
 * dispositivo), el idioma inglés (el texto inglés es más corto que el español
 * en estas cadenas, así que el español es el caso peor) y el tema claro.
 *
 * Con `prefers-reduced-motion: reduce` NO ocurría, y ese es justo el punto
 * ciego que lo mantuvo vivo: bajo esa preferencia los dos decks ya se
 * linealizan (la pista pasa a alto automático, el escenario a `position:
 * static` y las diapositivas fluyen una debajo de otra), así que el contenido
 * que no cabe simplemente alarga la página. El defecto solo existía en la
 * combinación "texto grande + movimiento permitido", que ningún candado
 * cubría (lección del 2026-09-06, regla 2).
 *
 * ## La causa raíz
 *
 * El escenario fijaba su alto al viewport y recortaba, pero NADA comprobaba
 * que el contenido de una diapositiva cupiera en ese alto. El pin era
 * incondicional; la geometría del texto, no.
 *
 * ## Lo que hace este hook
 *
 * Observa el escenario y cada diapositiva y responde a UNA pregunta:
 * ¿cabría cada diapositiva en un escenario pegado? Si la respuesta es no,
 * escribe `data-deck-fit="false"` en la PISTA, y el CSS de los dos decks
 * reacciona a ese atributo con EXACTAMENTE el mismo bloque de declaraciones
 * que ya usa bajo `prefers-reduced-motion: reduce` -- la linealización que la
 * sección ya sabía hacer, ahora también por esta segunda causa. No hay una
 * segunda forma de degradar que mantener: el helper `deckStatic` de cada
 * fichero de deck emite las dos condiciones desde una sola fuente.
 *
 * ## Por qué la medida NO usa el alto del escenario a secas
 *
 * Es la parte que no puede escribirse "como suena". Si el contraste fuera
 * `diapositiva.scrollHeight > escenario.clientHeight`, el hook entraría en un
 * bucle: al escribir `"false"` el escenario pasa a `position: static` con alto
 * automático, así que su `clientHeight` se convierte en el alto de TODAS las
 * diapositivas apiladas; entonces cada diapositiva "cabe", el atributo vuelve
 * a `"true"`, el escenario vuelve a pegarse y a medir una pantalla, y la
 * diapositiva vuelve a no caber. Oscilación en cada frame, provocada por la
 * propia consecuencia de la medida.
 *
 * El alto disponible es `min(clientHeight del escenario, alto del viewport)`,
 * que responde a la pregunta de arriba con independencia del estado que la
 * respuesta produce: mientras el escenario está pegado mide `100dvh` y el
 * mínimo es él mismo; cuando ya está linealizado, su alto crece con el
 * contenido y el mínimo pasa a ser el viewport -- que es justo el alto que
 * tendría si volviera a pegarse. La medida converge en un paso en los dos
 * sentidos: si el usuario devuelve el texto a su tamaño, las diapositivas
 * vuelven a caber en el viewport, el atributo vuelve a `"true"` y el pin
 * vuelve. `window.innerHeight` es además la MISMA referencia que
 * `useSlideDeck.measure()` ya usa para invertir la geometría de la pista.
 *
 * ## El segundo eje que el estado mueve: el ANCHO de la diapositiva
 *
 * El párrafo de arriba cerraba el bucle por el alto del escenario y daba el
 * problema por resuelto. No lo estaba: la linealización mueve TAMBIÉN el ancho
 * de la columna, y con él el alto que la diapositiva necesita. El bloque
 * `deckStatic` devuelve el `padding-inline-end` del deck a su peldaño
 * simétrico --el canal que el rail reservaba deja de reservarse porque el rail
 * no se pinta-- y cambia el `display` de `grid` a `block`. La columna se
 * ensancha, el texto reflowea con menos líneas y la diapositiva encoge.
 *
 * MEDIDO sobre el build de `6047302` en Chrome sin ventana, tema oscuro, sin
 * `prefers-reduced-motion`, 390x800 y la raíz a 24 px, portada española: con el
 * escenario pegado la primera diapositiva de Story mide 276 px de columna y
 * 926 px de alto; con el deck ya linealizado mide 312 px de columna y 794 px de
 * alto. El alto disponible es 800 px en los dos estados (el mínimo contra el
 * viewport hace su trabajo). Así que 926 > 800 escribía `"false"`, la columna
 * se ensanchaba a 312, 794 <= 800 devolvía `"true"`, la columna volvía a 276 y
 * el ciclo se repetía: 653 escrituras del atributo en 3,6 s, sin converger
 * nunca. Lo mismo en Journey a 390x800 con la raíz a 32 (901 pegado contra 701
 * linealizado), en Story de `/en` a 320x800 con la raíz a 24 (984 contra 756) y
 * en Journey de `/en` a 390x800 con la raíz a 32 (849 contra 701).
 *
 * La consecuencia visible era el P1 que reabría la crítica: quien mirase la
 * página en la mitad `"true"` del ciclo veía el escenario pegado recortando
 * 126 px de párrafo (926 - 800), que es exactamente lo que el candado de
 * superficies reportaba.
 *
 * ## Por qué la respuesta se vuelve a tomar SIN el estado puesto
 *
 * La pregunta del hook es "¿cabría esta diapositiva en un escenario PEGADO?", y
 * esa pregunta solo se puede responder mirando la geometría pegada. Mientras el
 * deck está linealizado, un `scrollHeight` que cabe no responde que sí: responde
 * que cabe EN LA COLUMNA ANCHA, que es más fácil. Un `scrollHeight` que no cabe,
 * en cambio, sigue siendo concluyente --la columna pegada es más estrecha, así
 * que el alto pegado nunca es menor--, y por eso el caso frecuente no paga nada.
 *
 * Cuando la medida linealizada dice que cabe, y solo entonces, el atributo se
 * QUITA, se vuelve a leer el layout --lo que fuerza el recálculo síncrono, en el
 * mismo turno y sin ningún fotograma intermedio que pintar-- y se decide con esa
 * lectura. Si sigue sin caber, el atributo se restituye y el estado no se ha
 * movido; si ahora cabe de verdad, el deck vuelve a pinarse. La respuesta se
 * toma siempre en la geometría de la pregunta, así que ya no depende del estado
 * que ella misma produce, y el ciclo se cierra en una sola pasada.
 *
 * ## Por qué no consulta `prefers-reduced-motion`
 *
 * Porque no hay nada que decidir: bajo esa preferencia el escenario ya está
 * linealizado y el CSS que este atributo activa es, declaración a
 * declaración, el mismo. Que el hook escriba `"false"` también ahí no cambia
 * ni un píxel, y ahorra una guarda -- y una llamada a `matchMedia` -- que
 * habría que mantener sincronizada con el CSS de dos ficheros.
 *
 * ## `useEffect`, no `useLayoutEffect`
 *
 * Decisión ya cerrada en este repo con medición delante (`useScrolled.ts`,
 * 2026-07-25, y repetida en `NavSheet.tsx`): con `output: "export"` el
 * navegador pinta el HTML prerenderizado ANTES de hidratar, así que
 * `useLayoutEffect` tampoco evita el primer pintado -- corre después de él
 * igualmente -- y a cambio emite el aviso de SSR en cada build. Aquí el
 * argumento pesa todavía más que allí: los dos decks viven varias pantallas
 * por debajo del pliegue, así que cuando el usuario llega a ellos la
 * hidratación terminó hace mucho y no hay ningún fotograma intermedio que
 * ahorrar.
 *
 * @param trackRef Pista de la presentación: el elemento en el que se escribe
 *   el atributo. Es el ANCESTRO de todo lo que el CSS del estado tiene que
 *   alcanzar, y por eso el estado vive aquí y no en el escenario.
 * @param stageRef Escenario pegado: el que aporta el alto disponible y el que
 *   contiene las diapositivas que se miden.
 */
export function useDeckFit(
  trackRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    // Sin `ResizeObserver` no se mide y no se escribe nada: el deck se queda
    // exactamente como estaba antes de esta pieza (ver el docblock de
    // DECK_FIT_ATTRIBUTE, tercer estado). Es el caso de jsdom, donde ningún
    // test existente cambia de comportamiento por la mera existencia del
    // hook, y el de cualquier navegador sin la API.
    if (typeof ResizeObserver === "undefined") return;

    // El alto disponible se recalcula en cada lectura, y no se cachea, porque
    // leerlo es justo lo que fuerza el recálculo de layout que la medida sin
    // estado necesita (ver el docblock, "Por qué la respuesta se vuelve a tomar
    // SIN el estado puesto").
    const altoDisponible = (): number =>
      Math.min(stage.clientHeight, window.innerHeight);

    const desborda = (
      diapositivas: HTMLElement[],
      disponible: number,
    ): boolean =>
      diapositivas.some(
        (diapositiva) =>
          diapositiva.scrollHeight - disponible > DECK_FIT_TOLERANCE_PX,
      );

    const medir = (): void => {
      const diapositivas = Array.from(
        stage.querySelectorAll<HTMLElement>(SELECTOR_DIAPOSITIVA),
      );
      if (diapositivas.length === 0) return;

      const disponible = altoDisponible();
      // Un alto disponible de 0 no es "no cabe": es "todavía no hay layout"
      // (elemento sin medir, pestaña que nunca se ha pintado). Medir ahí
      // linealizaría el deck por una geometría que no existe.
      if (disponible <= 0) return;

      let cabe = !desborda(diapositivas, disponible);

      if (
        cabe &&
        track.getAttribute(DECK_FIT_ATTRIBUTE) === DECK_DOES_NOT_FIT
      ) {
        // La lectura de arriba se tomó con el deck YA linealizado, o sea en la
        // columna ancha que este mismo atributo produce: ahí "cabe" no responde
        // la pregunta del hook. Se quita el estado, se vuelve a leer --la
        // lectura fuerza el recálculo, en este mismo turno y sin fotograma que
        // pintar-- y se decide con la geometría pegada. Un alto disponible que
        // se va a cero sin el estado es "no hay layout que juzgar", no "cabe":
        // se restituye el estado y no se mueve nada.
        track.removeAttribute(DECK_FIT_ATTRIBUTE);
        const sinEstado = altoDisponible();
        cabe = sinEstado > 0 && !desborda(diapositivas, sinEstado);
        if (!cabe) {
          track.setAttribute(DECK_FIT_ATTRIBUTE, DECK_DOES_NOT_FIT);
          return;
        }
      }

      const siguiente = cabe ? DECK_FITS : DECK_DOES_NOT_FIT;
      // Solo se escribe cuando cambia: un `setAttribute` con el mismo valor
      // invalida estilo igualmente, y este camino corre desde un
      // `ResizeObserver` cuyo callback puede dispararse en ráfaga.
      if (track.getAttribute(DECK_FIT_ATTRIBUTE) !== siguiente) {
        track.setAttribute(DECK_FIT_ATTRIBUTE, siguiente);
      }
    };

    const observer = new ResizeObserver(medir);
    observer.observe(stage);
    for (const diapositiva of stage.querySelectorAll<HTMLElement>(
      SELECTOR_DIAPOSITIVA,
    )) {
      observer.observe(diapositiva);
    }

    medir();

    // El `ResizeObserver` ve el cambio de tamaño de texto (las diapositivas
    // crecen) y el de viewport MIENTRAS el escenario está pegado (su caja es
    // el viewport). Lo que no ve es un cambio de alto de ventana con el deck
    // YA linealizado: ahí el escenario mide su contenido, que no cambia, y
    // ninguna caja observada se mueve -- pero el alto disponible sí, y con él
    // la respuesta. De ahí este listener, que no duplica al observer: cubre
    // el único caso que el observer no puede ver.
    window.addEventListener("resize", medir);

    return () => {
      window.removeEventListener("resize", medir);
      observer.disconnect();
    };
  }, [trackRef, stageRef]);
}
