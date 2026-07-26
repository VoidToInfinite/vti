"use client";
import { useEffect, useRef, useState } from "react";
import { AURA_STAGGER } from "@/components/aura/aura.layers";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeName } from "@/theme/themes";

/**
 * Tiempos del cruce de fondos del hero (tarea C1, spec §5.3): cuánto tarda
 * el fundido de una capa, cuánto se retrasa cada escalón del stagger, y
 * cuánto se espera como máximo a que las imágenes entrantes decodifiquen
 * antes de arrancar la transición de todas formas.
 *
 * `AURA_STAGGER` (el ORDEN del escalonado: campo → mano izquierda → mano
 * derecha → energía → orbe) se importa de `aura.layers.ts` en vez de
 * declararse aquí: es la tabla de capas de Aura más el orbe, así que su
 * fuente natural es el módulo que ya describe esas capas (`aura.layers.ts`).
 * Este archivo solo añade los TIEMPOS —duración, paso, tope de espera—, que
 * `aura.parts.tsx` importa para calcular cada `transition-delay` (spec
 * §6.2.1) y que este mismo archivo usa para derivar `HERO_TRANSITION_MS`.
 *
 * ## Por qué estos números NO salen de `theme.data.motion.duration`
 *
 * La escala de movimiento de la casa (`src/theme/tokens/motion.ts`:
 * `instant/fast/base/slow/slower/ambient/spin/spinReduced`) está pensada
 * para TRANSICIONES DE INTERFAZ —hover, foco, aparición de un panel—, no
 * para una COREOGRAFÍA de cinco escalones con un orden y un retardo
 * relativo entre piezas. Forzar esta coreografía dentro de `motion.duration`
 * obligaría a añadir una clave (`heroStagger`, `heroStep`...) a un objeto
 * que un test de contrato cierra por completo (`system.test.ts`, con
 * `toEqual` + `toHaveLength`: ver la lección de `task/lessons.md` del
 * 2026-07-25 sobre añadir una clave a un objeto de tokens) por una
 * coreografía puntual que no es un rol del sistema de movimiento — igual
 * que `Sol.tsx:147` declara sus 1100 ms de morph como una excepción propia
 * en vez de forzarlos en la escala.
 *
 * `HERO_FADE_MS` sí es un múltiplo reconocible de la escala (2 × `base` =
 * 2 × 200 ms), así que no es un número arbitrario, pero vive aquí, como
 * constante propia de la coreografía, no como alias de `motion.duration`:
 * un alias se rompería en silencio el día que alguien cambiara `base` por
 * una razón de UI ajena a esta transición. El conjunto completo se apaga
 * bajo `prefers-reduced-motion` en `aura.parts.tsx` y en `HeroBackdrop.tsx`,
 * igual que el resto del lenguaje de movimiento del sitio.
 */

/** Duración del fundido de UNA capa del stagger. */
export const HERO_FADE_MS = 420;

/** Paso del stagger entre capas consecutivas. */
export const HERO_STEP_MS = 110;

/**
 * Tope de espera de `img.decode()` antes de arrancar la transición de todas
 * formas (spec §6.1): la condición de fluidez, no una espera indefinida. Ver
 * `HeroBackdrop.tsx` para la carrera completa (`Promise.race` contra este
 * temporizador) y por qué un `.catch()` solo no basta.
 */
export const HERO_DECODE_TIMEOUT_MS = 600;

/**
 * Duración total del cruce: el último escalón (índice
 * `AURA_STAGGER.length - 1`) arranca a `(length - 1) * HERO_STEP_MS` y tarda
 * `HERO_FADE_MS` en completarse. `HeroBackdrop` programa por este valor el
 * temporizador que desmonta el stack saliente (420 + 4×110 = 860 ms).
 */
export const HERO_TRANSITION_MS =
  HERO_FADE_MS + (AURA_STAGGER.length - 1) * HERO_STEP_MS;

/**
 * Cuánto sigue la copia con su aspecto VIEJO antes de empezar a apagarse.
 *
 * No es una pausa estética: sin ella la copia queda ilegible durante ~300 ms.
 * El fondo tarda `HERO_FADE_MS` en cambiar de lienzo (el campo de Aura es el
 * escalón 0, sin retardo), así que a los 100 ms va por menos de la cuarta
 * parte. Si la copia cambiara de paleta ahí, pintaría texto oscuro sobre un
 * fondo que sigue siendo casi negro —o texto claro sobre pastel al volver—
 * hasta que el fondo la alcanzara.
 *
 * Con 240 ms de espera, la copia se apaga (100 ms) y aplica la distribución
 * nueva a los **340 ms**, cuando el campo ya está por encima del 80 % de
 * opacidad: entra sobre el fondo al que pertenece. Queda asentada a los
 * 660 ms, holgadamente dentro de los `HERO_TRANSITION_MS` del fondo.
 *
 * La alternativa —ocultar la copia desde `t = 0` hasta que el fondo terminara—
 * dejaba el bloque de texto en blanco medio segundo, que es peor: el usuario
 * ve desaparecer el contenido, no cambiar el tema.
 */
export const HERO_COPY_HOLD_MS = 240;

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
 * provocan un re-wrap que no se puede animar, y cambiarlas en `t = 0` —
 * cuando el fondo todavía es el del tema anterior— produciría un destello de
 * texto en la paleta contraria sobre el fondo viejo (oscuro sobre negro, o
 * claro sobre pastel a medio decodificar).
 *
 * Comportamiento (spec §6.5):
 * - Cambio de USUARIO (`changeSource === "user"`): la copia mantiene su
 *   aspecto viejo durante `HERO_COPY_HOLD_MS` mientras el fondo arranca;
 *   entonces se oculta (`hidden = true`) y, a los `HERO_COPY_OUT_MS`, aplica
 *   la distribución nueva (todavía invisible) y vuelve a mostrarse. La espera
 *   inicial es lo que evita que el texto entre con la paleta nueva sobre un
 *   fondo que todavía es el viejo — ver el docblock de `HERO_COPY_HOLD_MS`.
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

    // Tres tramos encadenados: espera con el aspecto viejo -> apagado ->
    // aplicar la distribucion nueva y volver. El segundo temporizador se
    // guarda en la MISMA ref que el primero, asi que un segundo cambio de tema
    // cancela el que este pendiente sea cual sea el tramo en curso.
    timeoutRef.current = window.setTimeout(() => {
      setHidden(true);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setLayoutTheme(themeName);
        setHidden(false);
      }, HERO_COPY_OUT_MS);
    }, HERO_COPY_HOLD_MS);
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
