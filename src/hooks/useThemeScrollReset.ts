"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_COPY_RETURN_MS } from "@/components/sections/Hero/hero.transition";
import { useTheme } from "@/theme/ThemeProvider";
import {
  captureReadingAnchor,
  restoreReadingAnchor,
  type ReadingAnchor,
} from "./themeScrollAnchor";

/**
 * QUÉ HACE HOY, EN UNA FRASE (revisión 2026-08-17, crítica externa #8):
 * cambia el tema en el mismo tick del click, sin viajar a ninguna parte, y
 * cuando el re-maquetado de las dos ramas se ha asentado devuelve al lector
 * a la MISMA sección que estaba mirando, en el mismo punto de ella, con un
 * salto instantáneo. La corrección solo la dispara una llamada real a
 * `requestThemeChange` (un click humano); el ajuste de tema de la
 * hidratación, que no pasa por aquí, no mueve nada.
 *
 * Las tres capas de historia de este archivo, porque ninguna se entiende
 * sin la anterior:
 *
 * 1. **D6 (spec 2026-08-04, encargo literal del usuario):** "cuando se
 *    cambia de tema, si el usuario no se encuentra en la zona del Hero,
 *    realizar animación de scroll hacia arriba y después cambiar el tema".
 *    Así nació este hook.
 * 2. **Task 17 (plan premium F1-F5, 2026-08-11):** retira ese viaje. El
 *    detalle completo y las razones siguen abajo, intactas.
 * 3. **Hoy (2026-08-17):** el hook vuelve a tocar el scroll, pero por el
 *    motivo contrario al de D6 y con el gesto contrario -- no viaja a
 *    ninguna parte "interesante", solo deshace el arrastre que el propio
 *    cambio de tema le provoca al lector. El porqué, con las cifras, en la
 *    sección "ENMIENDA 2026-08-17" al final de este bloque.
 *
 * ---
 *
 * Task 17 (plan premium F1-F5, 2026-08-11): este hook dejó de mover el
 * scroll. Hasta esa tarea, `requestThemeChange` --fuera de la "zona del
 * hero" (D6, spec 2026-08-04)-- hacía viajar la página hasta `top: 0` con
 * `scrollTo({ behavior: "smooth" })`, esperaba a que el viaje terminara
 * (carrera entre `scrollend`, un sondeo por `requestAnimationFrame` y dos
 * temporizadores de seguridad) y SOLO ENTONCES cambiaba el tema. El motivo
 * original (D6): mostrar el cruce de composiciones del hero
 * (`HeroBackdrop.tsx`) como confirmación visual de que el tema cambió de
 * verdad, evitando que alguien a mitad de una página con layouts distintos
 * por tema viera un re-maquetado brusco lejos de donde estaba mirando.
 *
 * Una auditoría independiente (2026-08-11, hallazgo #5 de 5) midió el coste
 * real de ese viaje: `scrollY` 2500 → 2400 → 193 → 0 en ~1s, sin ningún
 * anuncio para quien no ve la página desplazarse, y sin paridad con el
 * cambio de idioma (que no mueve el scroll en absoluto). Quien cambia de
 * tema a mitad de página "vuelve al principio" -- exactamente el defecto que
 * este hook existía para evitar, pero por la vía contraria: el viaje EN SÍ
 * es el que tira la posición de lectura.
 *
 * Dos salidas se evaluaron para el punto 1 del brief de Task 17:
 *
 * A) NO viajar fuera del hero: `toggleTheme()` en el sitio, sin tocar
 *    `scrollTo` en absoluto. Conserva la posición de forma EXACTA (mismo
 *    `scrollY` antes y después, cero riesgo de desajuste) al coste de que
 *    quien no está mirando el hero deja de ver su cruce de composiciones.
 * B) SEGUIR viajando (conservando toda la maquinaria de `scrollend`/rAF/
 *    temporizadores) y, tras el asentamiento, restaurar el `scrollY`
 *    original con un segundo `scrollTo`.
 *
 * Se eligió (A), con el código delante y estas razones (1 y 3 siguen en
 * pie; la 2 se corrigió el 2026-08-12, fix wave B -- ver la nota tras la
 * lista):
 *
 * 1. `HERO_COPY_RETURN_MS` (`hero.transition.ts`) mide 1830ms -- el cruce de
 *    composiciones por sí solo, SIN contar el viaje de scroll previo (hasta
 *    3000ms más, `THEME_SCROLL_MAX_MS` retirada). La opción B habría forzado
 *    a CUALQUIER usuario fuera del hero a presenciar entre ~1.8s y ~4.8s de
 *    scroll automático (subida + bajada) por un simple cambio de color --
 *    más automatismo de scroll que el propio defecto que el hallazgo #5
 *    denuncia, no menos. La opción A no tiene ese coste: es instantánea.
 * 2. [PREMISA CORREGIDA 2026-08-12, fix wave B -- se midió FALSA en la
 *    review final de rama, detalle completo en `docs/qa-3d-pendiente.md`,
 *    entrada "Divergencia de longitud de scroll entre temas"] Se razonó en
 *    su momento que, con el contenido ya unificado entre temas (Tasks 15-16
 *    de este mismo plan: Story/Features/Journey/Contact comparten árbol de
 *    contenido, solo difiere el arte), el layout NO cambiaba de alto entre
 *    temas -- así que quedarse exactamente donde se estaba (opción A)
 *    mostraría CONTENIDO EQUIVALENTE al de antes del cambio, no una sección
 *    distinta. Medido en navegador real (build de producción, toggle real
 *    pulsado -- no `toggleTheme()` a mano --, `document.visibilityState`
 *    verificado antes de medir): la premisa es falsa. Las dos ramas
 *    divergen ×2,20 en escritorio 1280×720 (5.827 px claro contra 12.821 px
 *    oscuro) y ×1,61 en móvil 375×812 (9.255 contra 14.877), concentrado en
 *    Story (+3.910 px en escritorio) y Journey (+5.845 px) -- el deck de
 *    diapositivas de la rama oscura mide bastante más que la tarjeta de la
 *    rama clara, la divergencia de vehículo que `DESIGN.md` §4 ya
 *    documenta. 8 de 8 escenarios de toggle real probados (2 viewports × 2
 *    sentidos × 2 posiciones) dejan al lector en una SECCIÓN DISTINTA de la
 *    que tenía en el centro del viewport -- nunca en la misma; en los 3
 *    casos oscuro→claro el salto de scroll implícito del navegador CLAMPA
 *    contra el límite del documento más corto (hasta −3.868 px) y empuja al
 *    lector al final, sin aterrizar dentro de ninguna `<section>` en el peor
 *    caso (móvil, 70% de recorrido). Conservar el mismo `scrollY` NO
 *    garantiza contenido equivalente -- eso exigiría medir la posición como
 *    FRACCIÓN del recorrido total de cada rama, no en píxeles absolutos, y
 *    decidir esa unificación es una decisión de arquitectura visual del
 *    dueño (fuera de alcance de este hook y de este fix -- ver el detalle
 *    completo, las ocho mediciones y el pendiente de decisión en
 *    `docs/qa-3d-pendiente.md`).
 * 3. Coherencia con el cambio de idioma, que el propio hallazgo #5 usa como
 *    vara de medir ("el cambio de idioma sí conserva el scroll"): `i18n`
 *    nunca mueve la página al cambiar de idioma. El tema pasa a comportarse
 *    igual, en vez de ser el único control del sitio que fuerza un viaje.
 *
 * MATIZ IMPORTANTE (no se borra con la corrección de arriba): esta tarea SÍ
 * hace lo que promete. `scrollY` se conserva EXACTO, bit a bit, en los 5
 * casos sin clamp (medido, ver `docs/qa-3d-pendiente.md`) -- el hook no
 * mueve el scroll, y eso está verificado y sigue siendo cierto. Lo que era
 * falso era la PREMISA con la que se justificó la decisión (razón 2,
 * arriba), no el comportamiento que entrega. La razón real y suficiente
 * para NO viajar sigue siendo la 1: viajar destruía la posición de lectura
 * (medido entonces: `scrollY` 2500 → 2400 → 193 → 0 en ~1s), y eso seguiría
 * siendo cierto aunque las dos ramas midieran exactamente lo mismo de alto.
 *
 * COSTE ACEPTADO, no escondido: quien cambia de tema estando lejos del hero
 * ya NO ve el cruce de composiciones (`HeroBackdrop.tsx`) -- esa pieza queda
 * reservada a quien cambia de tema estando en o cerca del hero, donde ya
 * ocurría sin viaje (ver más abajo). El resto de la página sigue
 * recolorándose de inmediato vía las variables CSS del tema, la misma señal
 * que ya usa cualquier otro cambio de tema del sitio.
 *
 * CONSECUENCIA EN EL CÓDIGO: al no haber ya ningún escenario que dispare un
 * viaje de scroll, la distinción "zona del hero" (`isInHeroZone`, retirada)
 * deja de tener efecto -- las dos ramas hacían cosas distintas SOLO porque
 * una viajaba y la otra no; ahora ninguna viaja. Con ella se retiran
 * `THEME_SCROLL_IDLE_MS`/`THEME_SCROLL_MAX_MS`, la detección de `scrollend`/
 * el sondeo por `requestAnimationFrame`, y el campo `pending` (cubría
 * exclusivamente el tramo de scroll que ya no existe). `busy` SÍ se
 * conserva: sigue cubriendo el cruce de composiciones del hero cuando va a
 * ocurrir uno (ver su docblock, más abajo), que es movimiento real e
 * independiente del scroll.
 *
 * El nombre `useThemeScrollReset` se mantiene deliberadamente (no se
 * renombra en esta tarea): sigue siendo el único punto de entrada para
 * "pedir un cambio de tema" con la coreografía que le corresponda, y los
 * dos consumidores que le quedan (`ThemeToggle.tsx` y este propio test) ya
 * usan ese nombre. Renombrarlo es limpieza de nomenclatura fuera del
 * alcance de Task 17, declarada aquí en vez de hecha en silencio.
 *
 * ---
 *
 * ## ENMIENDA 2026-08-17 -- el ancla de lectura (crítica externa #8)
 *
 * La razón 2 de arriba ya quedó marcada como PREMISA FALSA el 2026-08-12:
 * las dos ramas no miden lo mismo de alto. Lo que faltaba entonces era la
 * consecuencia en el código, aplazada a propósito por considerarse
 * arquitectura visual. Los tres evaluadores de la crítica #8 (2026-08-17)
 * volvieron a reportar el mismo defecto por separado, con la página de hoy:
 * documento de ~6.700 px en claro contra ~16.300 px en oscuro, el punto de
 * lectura pasa del 50 % del recorrido al 18,4 %, y quien estaba en Features
 * aterriza en Story.
 *
 * QUÉ SE CORRIGE Y QUÉ NO, para que la frontera quede escrita:
 *
 * - **Se corrige la NAVEGACIÓN.** Conservar el `scrollY` numérico (Task 17)
 *   conserva la posición pero no el contenido, porque lo que cambia de alto
 *   es lo que queda POR ENCIMA del lector. Este hook captura qué sección
 *   está leyendo la persona en el instante del click y, tras el
 *   re-maquetado, deshace exactamente ese arrastre. Ver
 *   `themeScrollAnchor.ts` para el criterio de ancla —desde la crítica
 *   externa #13 (2026-08-18), el MISMO que usa el scrollspy del navbar:
 *   contención del centro del viewport, con la superficie visible solo como
 *   respaldo—, la exclusión de las secciones anidadas y la fórmula (con su
 *   clamp para el sentido oscuro -> claro).
 * - **NO se unifica la longitud de scroll entre temas.** Sigue siendo la
 *   decisión pendiente del dueño que `docs/qa-3d-pendiente.md` (entrada del
 *   2026-08-12) declara: cambiar el vehículo oscuro, aceptar la divergencia,
 *   o navegar por fracción de recorrido. Esta enmienda no la toma ni la
 *   cierra; solo hace que la divergencia deje de tirar al lector de sección
 *   mientras se decide.
 * - **NO vuelve el viaje de D6.** El salto es instantáneo (`behavior:
 *   "instant"`) y su longitud es exactamente el arrastre a compensar, nunca
 *   "hasta arriba". Las tres razones de Task 17 para no viajar siguen
 *   íntegras: aquí no hay animación de scroll que presenciar, ni espera, ni
 *   pérdida de la posición de lectura -- es su restitución.
 *
 * POR QUÉ HAY QUE ESPERAR, Y POR QUÉ CON DOS RELOJES: el alto nuevo de la
 * página no existe en el mismo tick del click. React confirma el cambio de
 * tema al terminar el manejador, y las ramas nuevas montan y maquetan
 * después. Se pide un `requestAnimationFrame` ANIDADO (el primero cae en el
 * commit del cambio, el segundo ya con la página nueva compuesta) y, en
 * paralelo, un temporizador de `THEME_ANCHOR_SETTLE_MS`: en una pestaña
 * oculta NO hay frames -- ni `requestAnimationFrame`, ni relojes de
 * animación (CLAUDE.md §5.3 y las tres lecciones de `task/lessons.md` sobre
 * `visibilityState: "hidden"`) --, así que un aviso que puede no llegar
 * jamás no puede ser la única vía de progreso. Es la misma lección que ya
 * exigía el tope de D6, aplicada al gesto contrario. Gana el que llegue
 * primero y cancela al otro: la corrección se aplica UNA sola vez.
 */

/**
 * Tope de espera al re-maquetado cuando el doble `requestAnimationFrame` no
 * llega (pestaña oculta, donde no hay frames en absoluto). No es un tiempo
 * de animación --no hay ninguna que temporizar-- así que no sale de
 * `motion.duration` ni del vocabulario: es el mismo tipo de constante de
 * seguridad que `HERO_DECODE_TIMEOUT_MS` (`timings.ts`), un plazo tras el
 * cual se actúa igual. 100 ms deja margen de sobra para los dos frames del
 * camino normal (~33 ms a 60 Hz, y son ellos los que ganan la carrera casi
 * siempre) sin que la corrección llegue a leerse como un salto tardío si
 * hay que esperar al tope.
 */
export const THEME_ANCHOR_SETTLE_MS = 100;

export interface ThemeScrollReset {
  /** Punto de entrada único del botón de tema: sustituye a `toggleTheme` a
   *  secas (ver `ThemeToggle.tsx`). Cambia el tema en el mismo tick de la
   *  llamada, siempre -- no hay ningún tramo asíncrono antes del cambio en
   *  sí. Lo único asíncrono ocurre DESPUÉS: la restitución del ancla de
   *  lectura cuando el re-maquetado se asienta (enmienda 2026-08-17 del
   *  docblock de cabecera). */
  readonly requestThemeChange: () => void;
  /** `true` desde el click hasta que el cruce de composiciones del hero
   *  (Task 5, plan premium F1-F5) se asienta, cuando va a ocurrir uno.
   *  Pensado para `aria-busy`, NUNCA para `disabled` (un botón nativo
   *  deshabilitado deja de ser enfocable y le arrebata el foco a quien lo
   *  activó por teclado -- lección `task/lessons.md` 2026-08-04). Ver el
   *  docblock de `requestThemeChange` para el criterio exacto de cuándo se
   *  activa y cuándo no. */
  readonly busy: boolean;
}

/**
 * Cambia el tema y, si corresponde, mantiene `busy` activo mientras dura el
 * cruce de composiciones del hero (Task 5). Sobre el scroll decide UNA sola
 * cosa (enmienda 2026-08-17, ver el docblock de cabecera): captura el ancla
 * de lectura antes del cambio y la restituye cuando el re-maquetado se
 * asienta. No viaja a ningún destino propio, y si el ancla no se movió no
 * llama a `scrollTo` en absoluto.
 *
 * `busy` NO cubre esa corrección, y es deliberado: la ventana de
 * asentamiento son dos frames (~33 ms, `THEME_ANCHOR_SETTLE_MS` en el peor
 * caso), y anunciar "ocupado" durante ese tramo sería el mismo estado de
 * carga fantasma que la fix wave B retiró de aquí abajo. `busy` sigue
 * significando exactamente "hay un cruce de composiciones del hero en
 * marcha", ni más ni menos.
 *
 * Usa `toggleTheme()` (NUNCA `setThemeName`/el setter crudo): es el único
 * setter de `ThemeProvider` que marca `changeSource: "user"`, la señal que
 * la coreografía del fondo del hero necesita para reconocer el cambio como
 * humano y animarlo (ver el docblock de `ThemeChangeSource` en
 * `ThemeProvider.tsx`). Publicar aquí un cambio de tema por otra vía dejaría
 * ese cruce sin animar, un fallo silencioso idéntico al que ya documenta ese
 * archivo para la hidratación.
 *
 * `willCrossfade` (leído con `window.matchMedia`/`document.getElementById`/
 * `getBoundingClientRect` DENTRO del callback, nunca durante el render --
 * leerlo en render rompe el export estático, mismo motivo por el que
 * `ThemeProvider.tsx` no lee `localStorage` ahí) decide si `busy` tiene algo
 * que esperar: bajo `prefers-reduced-motion: reduce`, en una página sin
 * ningún elemento `#hero` (legales, `not-found`), o con un `#hero` que
 * EXISTE pero no se ve (fix wave B, 2026-08-12, ver más abajo), no va a
 * correr ningún cruce, así que `busy` se apaga en el MISMO tick en que el
 * tema cambia. Con cruce, `busy` sigue activo hasta `HERO_COPY_RETURN_MS`
 * (`hero.transition.ts`) después del click -- REUTILIZADO de la propia
 * máquina de fases del hero, no un número nuevo inventado para este hook:
 * es el mismo instante que `HeroBackdrop.tsx`/`useHeroCopySwap` ya calculan
 * para "la copia del hero vuelve a ser visible con la distribución nueva",
 * el último cambio visible de todo el cruce. Este criterio es idéntico al
 * que ya usaban las dos ramas de la versión anterior de este hook (Task 5):
 * lo único que cambia en Task 17 es que ya no hay ninguna rama que dependa
 * de dónde esté el usuario en la página.
 *
 * Fix wave B (2026-08-12, hallazgo de review de rama): hasta esta revisión
 * `willCrossfade` solo comprobaba que `document.getElementById("hero")` NO
 * fuera `null` -- EXISTENCIA, no VISIBILIDAD. La Task 5 lo diseñó cuando el
 * toggle todavía hacía un viaje de scroll observable HASTA el hero (D6, ver
 * el docblock de cabecera): en esa versión, tras el viaje, el hero SIEMPRE
 * estaba a la vista, así que "existe" y "se ve" coincidían. La Task 17
 * retiró el viaje (arriba) y dejó el criterio de existencia intacto -- el
 * `<section id="hero">` sigue montado en TODAS las páginas de la home
 * (`HomeSections.tsx`), esté o no dentro del viewport. Medido: cambiar de
 * tema desde el pie de página (`Footer.tsx`, muy lejos del hero) marcaba
 * `aria-busy="true"` durante los 1.830ms completos de `HERO_COPY_RETURN_MS`
 * por un cruce que NUNCA ocurre fuera de pantalla -- un lector de pantalla
 * anunciaba "ocupado" sin nada que esperar, el propio patrón de "estado de
 * carga fantasma" que ARIA Authoring Practices desaconseja. `heroIsVisible`
 * (abajo) añade el chequeo que faltaba: `rect.top < innerHeight && rect.bottom
 * > 0` -- mismo criterio de intersección con el viewport (umbral 0) que ya
 * usa `intersectsViewport()` en `useActiveSection.ts`, para que "visible"
 * signifique lo mismo en todo el repo. No hace falta un `IntersectionObserver`
 * aparte: `requestThemeChange` es una respuesta a un click, no un bucle de
 * scroll, así que una lectura puntual de `getBoundingClientRect()` en el
 * momento del click es suficiente y más barata que suscribir un observer que
 * viviría todo el ciclo de vida del componente para un dato que solo hace
 * falta una vez por click.
 *
 * Reentrada: un segundo click mientras `busy` todavía cubre un cruce
 * ANTERIOR cancela la ventana de asentamiento vieja y arranca una nueva
 * (mismo criterio que la versión anterior), y hace lo propio con la
 * corrección de ancla pendiente -- que se descarta entera, no se encola:
 * un ancla capturada contra el maquetado de hace un click describe una
 * página que ya no existe. Sigue sin hacer falta ningún guard síncrono que
 * BLOQUEE la segunda llamada (el patrón de D6, cuando había un viaje de
 * scroll que no se podía interrumpir): aquí el segundo click siempre gana y
 * el tema cambia en su propio tick, como el primero.
 */

/** `true` si `el` intersecta el viewport actual (umbral 0 -- cualquier
 *  solape cuenta, igual de laxo que el `IntersectionObserver` por defecto).
 *  Mismo criterio que `intersectsViewport()` en `useActiveSection.ts`,
 *  reimplementado aquí (no importado: son módulos hermanos sin dependencia
 *  compartida hoy, y la función es una línea) para que "visible" signifique
 *  lo mismo en los dos sitios del repo que lo preguntan. */
function isElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

export function useThemeScrollReset(): ThemeScrollReset {
  const { toggleTheme } = useTheme();
  const [busy, setBusy] = useState(false);
  const busySettleTimeoutRef = useRef<number | null>(null);
  const anchorFrameRef = useRef<number | null>(null);
  const anchorTimeoutRef = useRef<number | null>(null);

  /** Deja sin efecto la corrección todavía pendiente de un click ANTERIOR:
   *  sus dos relojes (frames y tope) se cancelan juntos, siempre, porque
   *  cualquiera de los dos que sobreviviera aplicaría un ancla capturada
   *  contra una página que ya no existe. */
  const cancelPendingAnchorCorrection = useCallback((): void => {
    if (anchorFrameRef.current !== null) {
      window.cancelAnimationFrame(anchorFrameRef.current);
      anchorFrameRef.current = null;
    }
    if (anchorTimeoutRef.current !== null) {
      window.clearTimeout(anchorTimeoutRef.current);
      anchorTimeoutRef.current = null;
    }
  }, []);

  /**
   * Carrera entre el doble `requestAnimationFrame` (camino normal) y el
   * tope de `THEME_ANCHOR_SETTLE_MS` (pestaña sin frames): gana el primero
   * que llegue y `applied` deja al perdedor sin efecto, así que la
   * corrección se aplica UNA vez. Ver el docblock de cabecera para el
   * porqué de los dos relojes.
   *
   * El ganador NO cancela al perdedor, y es deliberado: cancelar desde aquí
   * dejaría a `applied` sin poder observarse (el perdedor no llegaría a
   * intentarlo nunca), y un guard que ningún test puede ver fallar no está
   * verificado -- medido con el bug inyectado de esta tarea, que con la
   * cancelación puesta seguía en VERDE al retirar el guard. Dejar que el
   * perdedor llegue y se encuentre la puerta cerrada cuesta una llamada a
   * función vacía; a cambio, el mecanismo que garantiza el "una sola vez"
   * es exactamente el que los tests ejercitan. La cancelación sigue
   * existiendo para lo que sí necesita cancelar de verdad: el desmontaje y
   * el segundo click, donde la corrección pendiente NO debe aplicarse
   * jamás.
   */
  const scheduleAnchorCorrection = useCallback(
    (anchor: ReadingAnchor): void => {
      let applied = false;
      const applyOnce = (): void => {
        if (applied) return;
        applied = true;
        restoreReadingAnchor(anchor);
      };

      if (typeof window.requestAnimationFrame === "function") {
        anchorFrameRef.current = window.requestAnimationFrame(() => {
          anchorFrameRef.current = window.requestAnimationFrame(applyOnce);
        });
      }
      anchorTimeoutRef.current = window.setTimeout(
        applyOnce,
        THEME_ANCHOR_SETTLE_MS,
      );
    },
    [],
  );

  useEffect(() => {
    // Limpieza al desmontar: libera los relojes en vuelo (asentamiento de
    // `busy` y corrección del ancla), nunca completa nada por su cuenta.
    return () => {
      if (busySettleTimeoutRef.current !== null) {
        window.clearTimeout(busySettleTimeoutRef.current);
        busySettleTimeoutRef.current = null;
      }
      cancelPendingAnchorCorrection();
    };
  }, [cancelPendingAnchorCorrection]);

  const requestThemeChange = useCallback((): void => {
    // Cancela la ventana de asentamiento de un cruce ANTERIOR que todavía
    // siguiera en marcha (segundo click legítimo durante esa ventana): sin
    // esto, la ventana vieja apagaría `busy` a mitad del cruce nuevo.
    if (busySettleTimeoutRef.current !== null) {
      window.clearTimeout(busySettleTimeoutRef.current);
      busySettleTimeoutRef.current = null;
    }
    // Un segundo click cancela la corrección pendiente del primero antes de
    // capturar la suya: el ancla vieja describe el maquetado viejo.
    cancelPendingAnchorCorrection();
    setBusy(true);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const heroEl = document.getElementById("hero");
    const willCrossfade =
      !reduced && heroEl !== null && isElementVisible(heroEl);

    // ANTES de `toggleTheme()`, a propósito: es la última oportunidad de
    // medir la página que el lector tiene delante. Bajo `reduce` se captura
    // igual -- un salto instantáneo no es movimiento que la preferencia
    // pida retirar (ver `restoreReadingAnchor`).
    const anchor = captureReadingAnchor();

    toggleTheme();

    if (anchor !== null) scheduleAnchorCorrection(anchor);

    if (!willCrossfade) {
      setBusy(false);
      return;
    }

    busySettleTimeoutRef.current = window.setTimeout(() => {
      busySettleTimeoutRef.current = null;
      setBusy(false);
    }, HERO_COPY_RETURN_MS);
  }, [toggleTheme, cancelPendingAnchorCorrection, scheduleAnchorCorrection]);

  return { requestThemeChange, busy };
}
