/**
 * Tiempos de apertura y cierre de las DOS superficies de navegación que
 * aparecen y desaparecen sobre la página: el panel desplegable de escritorio
 * (`ScNavPanel`, `Navbar.tsx`, tarea W4 + craft de Task 9) y la hoja de
 * navegación móvil (`ScNavSheet`, `NavSheet.tsx`, Task 10).
 *
 * Vive en su propio módulo, y no como dos constantes privadas repetidas en
 * cada fichero, por la regla 13 de `RULES.md`: los dos valores son
 * IDÉNTICOS en las dos superficies a propósito -- Task 10 pide explícitamente
 * que la hoja use "la MISMA gramática" que el panel de escritorio --, así que
 * son una invariante que debe mantenerse igual entre ficheros, no dos
 * decisiones independientes que casualmente coinciden hoy. Con una sola
 * fuente de verdad no hace falta ningún test que compare los dos ficheros
 * entre sí: no existe la posibilidad de que diverjan.
 *
 * El sufijo `.transition.ts` es el que `RULES.md` (regla 1) reserva para los
 * tiempos de una transición concreta, mismo criterio que
 * `hero.transition.ts`.
 *
 * ASIMETRÍA (regla 26 de `RULES.md`, D5 del brief de Task 9): abrir tarda MÁS
 * que cerrar. Abrir presenta contenido que hay que leer y pide tiempo de
 * lectura; cerrar solo retira algo que el usuario ya ha decidido descartar, y
 * alargarlo se siente como una interfaz que no obedece. Los dos sentidos se
 * declaran como DOS bloques de `transition` en CSS (base = cerrar,
 * `[data-open="true"]` = abrir), nunca con estado de React adicional.
 *
 * La curva la aporta `PRESS.easing` (`src/motion/vocabulary.ts`), no este
 * módulo: aquí solo viven las duraciones, que es lo que las dos superficies
 * comparten. Sin `"use client"`, mismo motivo que `timings.ts` y
 * `vocabulary.ts`: son literales puros sin ningún hook, así que quien los
 * importe no hereda una directiva de cliente que no necesita.
 */

/** Apertura: 180 ms. Ver la nota de asimetría del docblock. */
export const NAV_OVERLAY_OPEN_MS = 180;

/** Cierre: 120 ms. Ver la nota de asimetría del docblock. */
export const NAV_OVERLAY_CLOSE_MS = 120;
