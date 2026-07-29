"use client";
import { useEffect, useRef, useState } from "react";
import { AURA_STAGGER } from "@/components/aura/aura.layers";
import { EYE_STAGGER } from "@/components/eye/eye.layers";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeName } from "@/theme/themes";

/**
 * Tiempos del cruce de fondos del hero y de la coreografía de carga
 * (revisión 2026-07-27, spec §5): cuánto tarda el fundido de una capa,
 * cuánto se retrasa cada escalón del stagger, cuánto se espera como máximo a
 * que las imágenes entrantes decodifiquen, y cómo se reparte el presupuesto
 * entre el fondo, el navbar y la copia del hero.
 *
 * Ahora hay DOS tablas de escalonado, una por composición —`EYE_STAGGER`
 * (oscuro, `eye.layers.ts`) y `AURA_STAGGER` (claro, `aura.layers.ts`)— y
 * ninguna de las dos se declara aquí: cada una es un dato de SU composición
 * (qué capa va antes que cuál), así que su fuente natural es el módulo que
 * ya describe esas capas, no este. Este archivo solo añade los TIEMPOS
 * —duración, paso, tope de espera— que se aplican por igual a cualquier
 * orden, y los deriva `HERO_STACK_MS` de la tabla más LARGA de las dos (6
 * escalones en oscuro contra 5 en claro): el presupuesto de la coreografía
 * tiene que caber la composición que más escalones necesita, o el tema
 * oscuro se quedaría sin tiempo para su último paso.
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
 * Nº de escalones del stagger más largo de las dos composiciones: 6 en
 * oscuro (`EYE_STAGGER`) contra 5 en claro (`AURA_STAGGER`). Se calcula con
 * `Math.max` sobre las dos longitudes, en vez de escribir `6` a mano, porque
 * el número no es un dato propio de este archivo — es un derivado de dos
 * tablas que viven en otros dos módulos, y un literal se desincroniza en
 * silencio el día que cualquiera de las dos gane o pierda un escalón.
 *
 * Resuelve a 6 (`EYE_STAGGER.length`).
 */
export const HERO_STAGGER_STEPS = Math.max(
  EYE_STAGGER.length,
  AURA_STAGGER.length,
);

/**
 * Duración total de UN stack escalonándose (entrando o saliendo): el último
 * escalón (índice `HERO_STAGGER_STEPS - 1`) arranca a `(HERO_STAGGER_STEPS -
 * 1) * HERO_STEP_MS` y tarda `HERO_FADE_MS` en completarse. Se deriva del
 * stagger MÁS LARGO (`HERO_STAGGER_STEPS`), no del de la composición activa
 * en cada caso, porque este valor programa temporizadores compartidos por
 * las dos composiciones (`HeroBackdrop` desmonta el stack saliente con él,
 * sea cual sea el tema): si se derivara del stagger corto, el escalonado de
 * 6 pasos del ojo se quedaría sin los últimos 110 ms de margen.
 *
 * Resuelve a 970 (420 + 5×110), antes 860 (420 + 4×110) cuando solo existía
 * `AURA_STAGGER` de 5 pasos.
 */
export const HERO_STACK_MS =
  HERO_FADE_MS + (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS;

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
 * Instante, medido desde el ARRANQUE de un stack (carga o entrada de un
 * cruce), en el que su ÚLTIMO escalón va por la mitad de su propio fundido:
 * `(HERO_STAGGER_STEPS - 1) * HERO_STEP_MS` para llegar al arranque de ese
 * escalón, más `HERO_FADE_MS / 2` para llegar a su punto medio. El navbar y
 * la copia usan este offset —no el final del stack— para empezar a entrar:
 * así terminan de asentarse DESPUÉS de la última capa (spec §1: «al final el
 * navbar y los textos»), sin dejar medio segundo de interfaz en blanco
 * esperando a que el fondo termine del todo. Resuelve a 760 (550 + 210).
 */
export const HERO_CHROME_OFFSET_MS =
  (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS + HERO_FADE_MS / 2;

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
