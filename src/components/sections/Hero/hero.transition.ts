"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeName } from "@/theme/themes";
import {
  HERO_CHROME_OFFSET_MS,
  HERO_DECODE_TIMEOUT_MS,
  HERO_FADE_MS,
  HERO_STACK_MS,
  HERO_STAGGER_STEPS,
  HERO_STEP_MS,
} from "@/motion/timings";

/**
 * Tiempos del CRUCE DE LA COPIA del hero (revisión 2026-07-27, spec
 * §5/§6.5). Los timings NÚCLEO de la coreografía del fondo —duración de un
 * fundido, paso del stagger, tope de `decode()`, nº de escalones y duración
 * de un stack completo— viven en `@/motion/timings` (ver su docblock de
 * cabecera para el porqué del traslado); este archivo los REEXPORTA a
 * continuación para que sus consumidores existentes (`HeroBackdrop.tsx`,
 * `Hero.tsx`, `aura.parts.tsx`, `eye.parts.tsx` y sus tests) no tengan que
 * cambiar el origen de su import.
 *
 * Lo que SÍ es propio de este archivo: los tiempos del cruce de la COPIA
 * (el bloque de texto del hero) durante un cambio de tema de usuario
 * —`HERO_COPY_OUT_MS`, `HERO_COPY_IN_MS`, `HERO_BACKDROP_HOLD_MS`,
 * `HERO_HANDOFF_MS`, `HERO_COPY_RETURN_MS`— y el hook `useHeroCopySwap` que
 * los consume. Ese conjunto sí necesita `"use client"` (usa
 * `useState`/`useEffect`/`useRef`), y es justo lo que motivó separar los
 * timings núcleo: `src/motion/stage.ts` —la máquina de fases de LA PÁGINA
 * completa, no solo del hero— necesitaba `HERO_CHROME_OFFSET_MS` y
 * compañía sin arrastrar esta directiva de cliente por transitividad desde
 * una sección hoja, pese a no usar ningún hook.
 */

export {
  HERO_CHROME_OFFSET_MS,
  HERO_DECODE_TIMEOUT_MS,
  HERO_FADE_MS,
  HERO_STACK_MS,
  HERO_STAGGER_STEPS,
  HERO_STEP_MS,
};

/**
 * Duración del fundido de SALIDA de la copia del hero (tarea C2, spec §6.5):
 * el tramo en el que el bloque de texto se apaga a opacidad 0 con la
 * distribución VIEJA todavía aplicada. Igual a `motion.duration.fast`
 * (100ms), pero no se importa de `theme.data.motion.duration` por el mismo
 * motivo que `HERO_FADE_MS` no lo hace (ver el docblock de cabecera): es una
 * coreografía propia del cruce del hero, no un alias que se rompería en
 * silencio el día que `fast` cambiara por una razón de UI ajena a esta
 * transición.
 */
export const HERO_COPY_OUT_MS = 100;

/**
 * Duración del fundido de ENTRADA de la copia, ya con la distribución nueva
 * aplicada mientras sigue invisible. Igual a `motion.duration.slow` (320ms):
 * más larga que la salida a propósito, para que la copia entre con calma
 * mientras el fondo todavía está escalonando sus dos últimos pasos.
 */
export const HERO_COPY_IN_MS = 320;

/**
 * Cuánto sigue el fondo saliente con su estado `"active"` después de que la
 * copia ya se ha apagado, antes de empezar a colapsar hacia `"leaving"`
 * (spec §7.3). Es EXACTAMENTE `HERO_COPY_OUT_MS`: el relevo secuencial no
 * arranca hasta que la copia —la primera pieza en desaparecer, spec §1— ya
 * es invisible, ni un instante antes (se vería el fondo moverse con texto
 * todavía encima) ni uno después (retrasaría el resto de la coreografía sin
 * ganar nada). Resuelve a 100.
 */
export const HERO_BACKDROP_HOLD_MS = HERO_COPY_OUT_MS;

/**
 * Instante, medido desde el click que cambia el tema, en el que el fondo
 * saliente ha terminado de colapsar y el entrante puede pasar a `"active"`
 * (spec §3, §7.3): la espera de `HERO_BACKDROP_HOLD_MS` más el tiempo que
 * tarda el stack saliente en escalonarse por completo. El cruce es
 * SECUENCIAL —el entrante no arranca hasta que el saliente ha terminado— por
 * la razón que documenta la spec §3: con los dos stacks solapados, el
 * `field` opaco de Aura entrando taparía los últimos escalones del ojo
 * saliente antes de que llegaran a apagarse. Resuelve a 1070 (100 + 970).
 */
export const HERO_HANDOFF_MS = HERO_BACKDROP_HOLD_MS + HERO_STACK_MS;

/**
 * Instante, medido desde el click que cambia el tema, en el que la copia
 * empieza a volver a mostrarse: el navbar ya se ha asentado
 * (`HERO_HANDOFF_MS`, cuando el stack entrante pasa a `"active"`, más
 * `HERO_CHROME_OFFSET_MS`, el mismo offset que usan el navbar y la copia de
 * la carga para no esperar al final exacto del stack). Resuelve a 1830
 * (1070 + 760).
 *
 * Este valor sustituye por completo al papel que hacía `HERO_COPY_HOLD_MS`
 * (eliminada en esta revisión): aquella constante existía para que la copia
 * no repintara con la paleta nueva mientras el fondo seguía siendo el viejo,
 * dejando pasar 240 ms antes de apagarse. En el diseño secuencial de esta
 * revisión, la copia se apaga en `t = 0` — no espera nada, es la PRIMERA
 * pieza en desaparecer (spec §1) — y ese mismo papel de «no repintar sobre
 * el fondo equivocado» lo cumple ahora `HERO_COPY_RETURN_MS`: la copia solo
 * vuelve a mostrarse (y solo entonces aplica la distribución nueva) cuando
 * el fondo nuevo ya lleva un buen tramo asentado, nunca antes. Mantener
 * `HERO_COPY_HOLD_MS` a `0` en vez de borrarla habría sido deuda muerta: una
 * constante que ningún cálculo necesita y que solo invita a que alguien
 * vuelva a darle un valor sin entender por qué se puso a cero.
 */
export const HERO_COPY_RETURN_MS = HERO_HANDOFF_MS + HERO_CHROME_OFFSET_MS;

export interface HeroCopySwap {
  /**
   * Distribución que debe pintar la copia AHORA mismo. NO es necesariamente
   * el tema activo: durante el tramo oculto de un cambio de usuario, sigue
   * siendo la distribución VIEJA hasta que la copia está invisible.
   */
  readonly layoutTheme: ThemeName;
  /**
   * `true` durante el tramo en el que la copia está oculta (opacity 0), para
   * poder aplicarle la distribución nueva sin que el re-wrap llegue a verse.
   */
  readonly hidden: boolean;
}

/**
 * Cruza la distribución de la copia del hero por OPACIDAD, nunca
 * interpolando `text-align`/`align-items` (spec §6.5): esas dos propiedades
 * provocan un re-wrap que no se puede animar, y cambiarlas mientras la copia
 * sigue visible produciría un destello de texto en la paleta contraria sobre
 * el fondo que le corresponde (oscuro sobre negro, o claro sobre pastel a
 * medio decodificar).
 *
 * Comportamiento (revisión 2026-07-27, spec §1/§7.4 — la copia es la
 * PRIMERA pieza en desaparecer y la ÚLTIMA en volver, no la intermedia):
 * - Cambio de USUARIO (`changeSource === "user"`): DOS estados, UN
 *   temporizador. En `t = 0` la copia se oculta INMEDIATAMENTE
 *   (`hidden = true`), sin ninguna espera previa — ya no hay un tramo en el
 *   que siga visible con su aspecto viejo, porque el brief exige que los
 *   textos sean lo primero en irse. En `HERO_COPY_RETURN_MS` aplica la
 *   distribución nueva (todavía invisible) y vuelve a mostrarse
 *   (`hidden = false`) en el mismo tick: para entonces el fondo nuevo ya
 *   lleva un buen tramo asentado (ver el docblock de `HERO_COPY_RETURN_MS`),
 *   así que no hay destello de paleta equivocada.
 * - Cambio de hidratación o carga inicial: la distribución sigue al tema al
 *   instante, sin ocultar nunca la copia — mismo criterio que usa
 *   `HeroBackdrop.tsx` para no animar el ajuste de hidratación.
 * - Bajo `prefers-reduced-motion: reduce`: instantáneo, sin ocultar nada.
 * - Cancela el temporizador pendiente si llega otro cambio de tema antes de
 *   que se cumpla: dos toggles rápidos no pueden dejar la copia invisible
 *   para siempre. Limpia el temporizador al desmontar.
 */
export function useHeroCopySwap(): HeroCopySwap {
  const { themeName, changeSource } = useTheme();
  const [layoutTheme, setLayoutTheme] = useState<ThemeName>(themeName);
  const [hidden, setHidden] = useState(false);

  const prevThemeRef = useRef(themeName);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevThemeRef.current === themeName) return;
    prevThemeRef.current = themeName;

    // Cualquier cruce en marcha queda cancelado por este cambio de tema: dos
    // toggles rápidos no pueden dejar la copia invisible para siempre, ni
    // pueden pisarse el uno al otro.
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (changeSource !== "user" || reduced) {
      // Ajuste de hidratación, carga inicial o reduced-motion: instantáneo,
      // sin ocultar la copia — mismo criterio que HeroBackdrop.tsx aplica al
      // fondo para el mismo caso. Los dos setState se agrupan en el mismo
      // efecto y en el mismo render; el linter señala el PRIMER setState del
      // bloque, así que la excepción va aquí y cubre a los dos (mismo patrón
      // que ThemeProvider.tsx).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayoutTheme(themeName);
      setHidden(false);
      return;
    }

    // Cambio de USUARIO: la copia se oculta YA, sin esperar nada — es la
    // primera pieza en desaparecer (spec §1).
    setHidden(true);

    // UN solo temporizador (antes eran dos encadenados: espera -> apagado):
    // ya no hay tramo de espera previa, así que solo queda el de vuelta.
    // Se guarda en la MISMA ref de siempre para que un segundo cambio de
    // tema lo cancele, sea cual sea el punto del recorrido en el que esté.
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setLayoutTheme(themeName);
      setHidden(false);
    }, HERO_COPY_RETURN_MS);
  }, [themeName, changeSource]);

  // Limpieza al desmontar: el temporizador pendiente no debe sobrevivir al
  // componente que consume este hook.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { layoutTheme, hidden };
}
