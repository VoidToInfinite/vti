"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Tope por INACTIVIDAD (ms): cuanto tiempo sin que `scrollY` avance ni un
 * pixel hace falta para dar el viaje de scroll por terminado (D6, revision
 * 2026-08-04). Sustituye a un tope por DURACION TOTAL (la version anterior
 * de esta constante, `THEME_SCROLL_TIMEOUT_MS = 1200`) porque ese diseño
 * era, en el fondo, una apuesta sobre cuanto tarda un navegador en un
 * `scrollTo` suave -- y esa duracion NO es una propiedad de este codigo,
 * es una propiedad del motor de scroll del navegador (variable entre
 * Chromium/WebKit/Firefox) Y de la configuracion del usuario (Firefox deja
 * ajustar la duracion del scroll suave). Un navegador mas lento, o un
 * usuario con esa preferencia mas alta, dispararia el tope ANTES de llegar
 * arriba, cambiando el tema con la pagina a mitad de camino -- exactamente
 * el defecto que D6 existe para evitar. Ademas, ese numero no se puede
 * verificar en NINGUN entorno de este equipo: este panel de navegador corre
 * con `document.visibilityState === "hidden"`, donde `scroll-behavior:
 * smooth` no progresa en absoluto (`task/lessons.md` 2026-07-31), asi que
 * la duracion real de un scroll suave es, aqui, indemostrable.
 *
 * Un tope por inactividad no necesita adivinar esa duracion: se REARMA cada
 * vez que llega un evento `scroll` con `scrollY` distinto del ultimo leido
 * (ver el listener de `scroll` en `requestThemeChange`), asi que un scroll
 * largo pero que sigue avanzando nunca lo dispara -- solo dispara cuando el
 * avance se detiene de verdad, sea cual sea la duracion total. 300ms es el
 * valor elegido: un `scrollTo` suave dispara `scroll` aproximadamente una
 * vez por frame compuesto (~16ms a 60fps) mientras esta en marcha, asi que
 * 300ms sin ni un solo evento es ~19 frames de silencio -- muy por encima de
 * un frame lento o un frame perdido en un dispositivo cargado (que retrasa
 * el SIGUIENTE evento, no produce un vacio de cientos de ms), pero corto
 * como para no demorar la reaccion percibida cuando el scroll de verdad ya
 * paro.
 */
export const THEME_SCROLL_IDLE_MS = 300;

/**
 * Techo ABSOLUTO (ms), sin rearmar nunca, para el viaje de scroll (D6,
 * revision 2026-08-04). Complementa a `THEME_SCROLL_IDLE_MS`, que por si
 * solo tiene un punto ciego: si llegara una sucesion INFINITA de eventos
 * `scroll` con avance real -- una fisica de scroll que jamas termina de
 * asentarse en el pixel exacto, un jitter de compositor, un bug de otra
 * capa -- el tope por inactividad se rearmaria para siempre y el boton de
 * tema quedaria inerte, el mismo fallo que el tope original queria evitar
 * pero por la via contraria. `THEME_SCROLL_MAX_MS` se programa UNA vez, al
 * arrancar el viaje, y no se toca mas: pase lo que pase con `scroll`,
 * `scrollend` o el sondeo por rAF, el tema cambia como mucho a los 3000ms.
 * (El caso "no llega ni un solo evento de scroll" -- pestaña oculta, cero
 * `requestAnimationFrame`, cero progreso -- ya queda cubierto por
 * `THEME_SCROLL_IDLE_MS`, que arranca armado desde el primer instante del
 * viaje y por tanto dispara a los 300ms aunque no llegue ningun evento; este
 * techo no depende de esa deduccion para declarar, POR ESCRITO, cual es el
 * peor caso absoluto del sistema completo.) 3000ms es holgado frente a
 * cualquier duracion de `scrollTo` suave configurable en un navegador real
 * sin llegar a percibirse como "el boton no responde".
 */
export const THEME_SCROLL_MAX_MS = 3000;

export interface ThemeScrollReset {
  /** Punto de entrada unico del boton de tema: sustituye a `toggleTheme` a
   *  secas (ver `ThemeToggle.tsx`). */
  readonly requestThemeChange: () => void;
  /** `true` mientras dura el viaje de scroll que precede al cambio de tema.
   *  El consumidor lo usa para deshabilitar el boton -- no hay nada que
   *  encolar mientras esto sea `true` (ver el guard de reentrada, mas
   *  abajo). */
  readonly pending: boolean;
}

/**
 * `"onscrollend" in window`, aislado en su propia funcion. `onscrollend` ya
 * esta declarado en el tipo `Window` de lib.dom.d.ts (todo navegador expone
 * el atributo IDL del manejador, lo soporte o no de verdad), asi que
 * TypeScript estrecha `window` como si la rama negativa de `in window`
 * fuera IMPOSIBLE (`never`) si el chequeo se escribe inline en el `if` que
 * usa `window` despues. Aislar la comprobacion aqui, devolviendo un
 * `boolean` plano, es lo que evita que esa estrechez se propague a la rama
 * `else` del llamador -- que si necesita seguir usando `window` con su tipo
 * normal para programar el sondeo por rAF.
 */
function supportsScrollEndEvent(): boolean {
  return "onscrollend" in window;
}

/**
 * `true` si el usuario esta en la "zona del hero" (D6): el punto en el que
 * cambiar el tema sin viaje de scroll sigue siendo una transicion legible,
 * porque el hero todavia ocupa buena parte de la pantalla.
 *
 * Con `#hero` presente en el documento, la zona es `heroRect.bottom >=
 * innerHeight / 2` -- el hero sigue cubriendo AL MENOS media pantalla.
 * Dos alternativas mas obvias se descartan a proposito:
 *
 * - `scrollY === 0`: demasiado estricto. Un solo pixel de inercia de rueda
 *   (o un navegador que redondea el scroll a 1px) ya deja de cumplirlo, y
 *   dispararia el viaje de scroll completo por una diferencia invisible
 *   para el usuario -- una animacion de varios cientos de ms para "corregir"
 *   algo que el usuario no percibe como fuera de sitio.
 * - Un umbral fijo en pixeles (p.ej. `scrollY < 600`): miente en cuanto
 *   cambia el alto del hero o el del viewport. El hero mide `100dvh`
 *   (Hero.tsx): un umbral escrito a mano quedaria corto en un movil alto y
 *   largo en un portatil bajo, y habria que re-medirlo cada vez que el
 *   hero cambiara de alto. Medir contra `heroRect`/`innerHeight` en vivo no
 *   necesita mantenimiento: se ajusta solo a cualquier viewport o cambio de
 *   maquetacion futuro del hero.
 *
 * Sin `#hero` en el documento (hoy: `app/not-found.tsx`, que monta el
 * navbar sin ninguna seccion hero) la regla degrada a `scrollY <
 * innerHeight / 2`: la misma proporcion de pantalla, sin el elemento que la
 * ancla. Es el mismo criterio expresado sin geometria de un elemento que no
 * existe, no una regla distinta.
 */
function isInHeroZone(): boolean {
  const hero = document.getElementById("hero");
  if (hero) {
    return hero.getBoundingClientRect().bottom >= window.innerHeight / 2;
  }
  return window.scrollY < window.innerHeight / 2;
}

/**
 * D6 de la spec de cabecera: "cuando se cambia de tema, si el usuario no se
 * encuentra en la zona del Hero, realizar animacion de scroll hacia arriba
 * y despues cambiar el tema". Consumido por `ThemeToggle.tsx` en lugar de
 * `toggleTheme` directo.
 *
 * Usa `toggleTheme()` (NUNCA `setThemeName`/el setter crudo): es el unico
 * setter de `ThemeProvider` que marca `changeSource: "user"`, la senal que
 * la coreografia del fondo del hero necesita para reconocer el cambio como
 * humano y animarlo (ver el docblock de `ThemeChangeSource` en
 * `ThemeProvider.tsx`). Publicar aqui un cambio de tema por otra via dejaria
 * ese cruce sin animar, un fallo silencioso identico al que ya documenta
 * ese archivo para la hidratacion.
 *
 * Bajo `prefers-reduced-motion: reduce` (leido con `window.matchMedia`
 * DENTRO de `requestThemeChange`, nunca durante el render -- leerlo en
 * render rompe el export estatico, mismo motivo por el que
 * `ThemeProvider.tsx` no lee `localStorage` ahi): el scroll es instantaneo
 * (`behavior: "instant"`) y el tema cambia en el MISMO tick, sin ninguna
 * espera. La intencion del encargo -- no cambiar el tema con el usuario
 * perdido a varias pantallas del hero -- se conserva; lo unico que se pierde
 * es el viaje animado, que es justo lo que `reduce` pide perder.
 *
 * Fuera de la zona del hero y sin `reduce`, el viaje se resuelve con DOS
 * vias de deteccion de fin de scroll en carrera, mas dos temporizadores de
 * seguridad (`THEME_SCROLL_IDLE_MS` por inactividad y `THEME_SCROLL_MAX_MS`
 * como techo absoluto, ver sus docblocks para el porque de cada uno):
 *
 * 1. El evento `scrollend`, si el navegador lo soporta
 *    (`"onscrollend" in window` -- el idiom de deteccion de soporte
 *    estandar, valido incluso para navegadores que declaran la propiedad
 *    del manejador sin implementar el evento). Se acepta SOLO si
 *    `window.scrollY === 0` al dispararse (ver `onScrollEnd`, mas abajo):
 *    un gesto anterior con inercia (un fling que todavia se estuviera
 *    asentando justo cuando el usuario pulso el boton) podria disparar SU
 *    PROPIO `scrollend` -- de una posicion intermedia, no de `top: 0` --
 *    despues de que este hook ya registrara el listener pero antes de que
 *    el `scrollTo` propio hubiera progresado. Sin el guard, ese evento
 *    espurio cambiaria el tema con la pagina todavia a mitad de camino,
 *    justo el defecto que el encargo pide evitar. El registro NO usa
 *    `{ once: true }` a proposito: un disparo espurio se ignora sin
 *    consumir el listener, que sigue vivo para el `scrollend` real que
 *    vendra despues.
 * 2. Si no, un sondeo por `requestAnimationFrame` hasta que `window.scrollY
 *    === 0`. (Esta comparacion es DISTINTA de la de `isInHeroZone`: alli
 *    `scrollY === 0` se descarto por demasiado estricto para decidir SI hay
 *    que viajar; aqui es el propio destino del viaje que ya se decidio
 *    hacer -- `scrollTo({ top: 0 })` -- asi que comparar contra el mismo
 *    cero que se le pidio al navegador es exacto, no una aproximacion. Esta
 *    via no necesita guard adicional: cada frame comprueba `scrollY` de
 *    verdad, no se apoya en un evento que pueda venir de otro gesto.)
 *
 * Cualquiera de las cuatro vias que llegue primero "gana" (`scrollend`
 * valido, el sondeo por rAF, el tope por inactividad o el techo absoluto):
 * cancela los dos temporizadores, el listener de `scroll`, el de
 * `scrollend` y el rAF pendientes de las demas, y dispara el cambio de tema
 * una sola vez.
 *
 * Reentrada (paso 7 del encargo): mientras `pending` sea `true`, una nueva
 * llamada a `requestThemeChange` no hace NADA -- ni encola un segundo
 * cambio ni cancela el viaje en curso. Se comprueba contra una `ref`
 * (`pendingRef`), no contra el `pending` de estado: la ref es sincrona y
 * bloquea incluso una segunda llamada que llegue en el MISMO tick, antes de
 * que React haya repintado el boton deshabilitado.
 */
export function useThemeScrollReset(): ThemeScrollReset {
  const { toggleTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  // Deja limpios los dos temporizadores (inactividad + techo absoluto), el
  // listener de `scroll`, el de `scrollend` y el rAF en vuelo de la carrera
  // en curso, SIN disparar el cambio de tema -- lo usa el efecto de
  // desmontaje (mas abajo) y, dentro de cada carrera, la via que gana para
  // cancelar a las demas. Arranca en no-op: si el hook se desmonta sin
  // ningun viaje en marcha, no hay nada que limpiar.
  const abortWaitRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Limpieza al desmontar (paso 8 del encargo): SOLO libera los mecanismos
    // en vuelo, nunca completa el cambio de tema por su cuenta -- un
    // consumidor que se desmonta a mitad del viaje no deberia disparar un
    // `toggleTheme()` sobre un arbol que ya no esta.
    return () => abortWaitRef.current();
  }, []);

  const requestThemeChange = useCallback((): void => {
    if (pendingRef.current) return; // reentrada: ver JSDoc del hook

    if (isInHeroZone()) {
      toggleTheme();
      return;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      window.scrollTo({ top: 0, behavior: "instant" });
      toggleTheme();
      return;
    }

    pendingRef.current = true;
    setPending(true);

    let settled = false;
    let idleTimeoutId = 0;
    let maxTimeoutId = 0;
    let raf = 0;
    // Ultima lectura de `scrollY` conocida por el listener de `scroll` (ver
    // `onScroll`, mas abajo): arranca en la posicion ACTUAL, antes de pedir
    // el propio `scrollTo`, para que el primer evento de scroll real (el que
    // sale de ESE `scrollTo`) se reconozca como avance.
    let lastScrollY = window.scrollY;

    // Punto de union de las CUATRO vias (`scrollend` valido, el sondeo por
    // rAF, el tope por inactividad y el techo absoluto): cualquiera de ellas
    // lo invoca, `settled` garantiza que solo la primera cuenta, y ella
    // misma cancela a las demas antes de cambiar el tema.
    const finish = (): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(idleTimeoutId);
      window.clearTimeout(maxTimeoutId);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      abortWaitRef.current = () => {};
      pendingRef.current = false;
      setPending(false);
      toggleTheme();
    };

    // Envoltorio de `scrollend` que descarta un disparo espurio de un gesto
    // ANTERIOR todavia asentandose (ver el docblock del hook, punto 1 de
    // las vias de deteccion): solo cuenta como "el viaje termino" si
    // `scrollY` ya esta de verdad en el destino pedido.
    const onScrollEnd = (): void => {
      if (window.scrollY === 0) finish();
    };

    // Rearma el tope por inactividad: se llama al arrancar el viaje (para
    // que exista un tope desde el primer instante, sin esperar a ningun
    // evento) y cada vez que `onScroll` detecta un avance real.
    const armIdleTimeout = (): void => {
      window.clearTimeout(idleTimeoutId);
      idleTimeoutId = window.setTimeout(finish, THEME_SCROLL_IDLE_MS);
    };

    // Escucha pasiva de `scroll`: NO decide nada por si sola (`scrollend`/el
    // sondeo por rAF siguen siendo quienes reconocen la LLEGADA a `top: 0`),
    // solo rearma el tope por inactividad cada vez que `scrollY` cambia de
    // verdad respecto a la ultima lectura -- ver el docblock de
    // `THEME_SCROLL_IDLE_MS` para el porque de comparar contra la ultima
    // lectura en vez de disparar en cada evento sin mas.
    const onScroll = (): void => {
      const current = window.scrollY;
      if (current !== lastScrollY) {
        lastScrollY = current;
        armIdleTimeout();
      }
    };

    // Version "silenciosa" de la limpieza de arriba, para el desmontaje: NO
    // llama a `finish` (que cambiaria el tema y haria `setState`), solo
    // apaga los mecanismos en vuelo. `settled = true` evita que un `finish`
    // que ya estuviera en la cola de microtareas/rAF llegue a ejecutarse
    // tras la limpieza.
    abortWaitRef.current = (): void => {
      settled = true;
      window.clearTimeout(idleTimeoutId);
      window.clearTimeout(maxTimeoutId);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
    };

    // El techo absoluto se programa UNA vez y no se rearma nunca (ver su
    // docblock): es el unico de los dos temporizadores que sobrevive a
    // cualquier cantidad de eventos `scroll`.
    maxTimeoutId = window.setTimeout(finish, THEME_SCROLL_MAX_MS);
    // El tope por inactividad arranca armado desde el primer instante: si no
    // llegara ni un solo evento de `scroll` (pestaña oculta), este es el que
    // dispara, a los `THEME_SCROLL_IDLE_MS` -- no hace falta esperar a
    // `onScroll` para tener un tope en marcha.
    armIdleTimeout();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (supportsScrollEndEvent()) {
      // SIN `{ once: true }` a proposito (ver `onScrollEnd`): un primer
      // disparo espurio (scrollY todavia no es 0) no debe consumir el
      // listener, o el `scrollend` real posterior no tendria quien lo
      // escuche.
      window.addEventListener("scrollend", onScrollEnd);
    } else {
      const poll = (): void => {
        if (window.scrollY === 0) {
          finish();
          return;
        }
        raf = window.requestAnimationFrame(poll);
      };
      raf = window.requestAnimationFrame(poll);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [toggleTheme]);

  return { requestThemeChange, pending };
}
