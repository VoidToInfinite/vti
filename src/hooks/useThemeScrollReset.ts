"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_COPY_RETURN_MS } from "@/components/sections/Hero/hero.transition";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Task 17 (plan premium F1-F5, 2026-08-11): este hook ya NO mueve el scroll.
 * Hasta esta tarea, `requestThemeChange` --fuera de la "zona del hero" (D6,
 * spec 2026-08-04)-- hacía viajar la página hasta `top: 0` con
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
 * Se eligió (A), con el código delante y estas razones:
 *
 * 1. `HERO_COPY_RETURN_MS` (`hero.transition.ts`) mide 1830ms -- el cruce de
 *    composiciones por sí solo, SIN contar el viaje de scroll previo (hasta
 *    3000ms más, `THEME_SCROLL_MAX_MS` retirada). La opción B habría forzado
 *    a CUALQUIER usuario fuera del hero a presenciar entre ~1.8s y ~4.8s de
 *    scroll automático (subida + bajada) por un simple cambio de color --
 *    más automatismo de scroll que el propio defecto que el hallazgo #5
 *    denuncia, no menos. La opción A no tiene ese coste: es instantánea.
 * 2. Con el contenido ya unificado entre temas (Tasks 15-16 de este mismo
 *    plan: Story/Features/Journey/Contact comparten árbol de contenido, solo
 *    difiere el arte), la razón original de D6 --evitar un re-maquetado
 *    brusco al cambiar de tema lejos del hero-- ya no aplica: el layout no
 *    cambia de alto entre temas, así que quedarse exactamente donde se
 *    estaba (opción A) muestra CONTENIDO EQUIVALENTE al de antes del cambio,
 *    no una sección distinta. Es la lectura de "la restauración es estable"
 *    del brief: fiarse del mismo `scrollY` sin tocarlo es fiable ahora
 *    precisamente porque el contenido ya no diverge por tema.
 * 3. Coherencia con el cambio de idioma, que el propio hallazgo #5 usa como
 *    vara de medir ("el cambio de idioma sí conserva el scroll"): `i18n`
 *    nunca mueve la página al cambiar de idioma. El tema pasa a comportarse
 *    igual, en vez de ser el único control del sitio que fuerza un viaje.
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
 */

export interface ThemeScrollReset {
  /** Punto de entrada único del botón de tema: sustituye a `toggleTheme` a
   *  secas (ver `ThemeToggle.tsx`). Cambia el tema en el mismo tick de la
   *  llamada, siempre -- ya no hay ningún tramo asíncrono antes del cambio
   *  en sí (ver el docblock de cabecera, Task 17). */
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
 * cruce de composiciones del hero (Task 5). Ya NO decide nada sobre scroll
 * (Task 17, ver el docblock de cabecera de este fichero): ni lo mueve ni lo
 * restaura, así que la posición de lectura queda exactamente donde estaba
 * antes del click, en cualquier punto de la página.
 *
 * Usa `toggleTheme()` (NUNCA `setThemeName`/el setter crudo): es el único
 * setter de `ThemeProvider` que marca `changeSource: "user"`, la señal que
 * la coreografía del fondo del hero necesita para reconocer el cambio como
 * humano y animarlo (ver el docblock de `ThemeChangeSource` en
 * `ThemeProvider.tsx`). Publicar aquí un cambio de tema por otra vía dejaría
 * ese cruce sin animar, un fallo silencioso idéntico al que ya documenta ese
 * archivo para la hidratación.
 *
 * `willCrossfade` (leído con `window.matchMedia`/`document.getElementById`
 * DENTRO del callback, nunca durante el render -- leerlo en render rompe el
 * export estático, mismo motivo por el que `ThemeProvider.tsx` no lee
 * `localStorage` ahí) decide si `busy` tiene algo que esperar: bajo
 * `prefers-reduced-motion: reduce`, o en una página sin ningún elemento
 * `#hero` (legales, `not-found`), no va a correr ningún cruce, así que
 * `busy` se apaga en el MISMO tick en que el tema cambia. Con cruce, `busy`
 * sigue activo hasta `HERO_COPY_RETURN_MS` (`hero.transition.ts`) después
 * del click -- REUTILIZADO de la propia máquina de fases del hero, no un
 * número nuevo inventado para este hook: es el mismo instante que
 * `HeroBackdrop.tsx`/`useHeroCopySwap` ya calculan para "la copia del hero
 * vuelve a ser visible con la distribución nueva", el último cambio visible
 * de todo el cruce. Este criterio es idéntico al que ya usaban las dos ramas
 * de la versión anterior de este hook (Task 5): lo único que cambia en Task
 * 17 es que ya no hay ninguna rama que dependa de dónde esté el usuario en
 * la página.
 *
 * Reentrada: un segundo click mientras `busy` todavía cubre un cruce
 * ANTERIOR cancela la ventana de asentamiento vieja y arranca una nueva
 * (mismo criterio que la versión anterior) -- ya NO hace falta ningún guard
 * síncrono por `ref` para bloquear una segunda llamada mientras un viaje de
 * scroll está en marcha, porque ya no hay ningún viaje en marcha: la función
 * es síncrona de principio a fin salvo por la propia ventana de `busy`.
 */
export function useThemeScrollReset(): ThemeScrollReset {
  const { toggleTheme } = useTheme();
  const [busy, setBusy] = useState(false);
  const busySettleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Limpieza al desmontar: solo libera el temporizador de asentamiento en
    // vuelo, nunca completa nada por su cuenta.
    return () => {
      if (busySettleTimeoutRef.current !== null) {
        window.clearTimeout(busySettleTimeoutRef.current);
        busySettleTimeoutRef.current = null;
      }
    };
  }, []);

  const requestThemeChange = useCallback((): void => {
    // Cancela la ventana de asentamiento de un cruce ANTERIOR que todavía
    // siguiera en marcha (segundo click legítimo durante esa ventana): sin
    // esto, la ventana vieja apagaría `busy` a mitad del cruce nuevo.
    if (busySettleTimeoutRef.current !== null) {
      window.clearTimeout(busySettleTimeoutRef.current);
      busySettleTimeoutRef.current = null;
    }
    setBusy(true);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const willCrossfade = !reduced && document.getElementById("hero") !== null;

    toggleTheme();

    if (!willCrossfade) {
      setBusy(false);
      return;
    }

    busySettleTimeoutRef.current = window.setTimeout(() => {
      busySettleTimeoutRef.current = null;
      setBusy(false);
    }, HERO_COPY_RETURN_MS);
  }, [toggleTheme]);

  return { requestThemeChange, busy };
}
