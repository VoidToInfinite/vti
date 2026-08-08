import { motion } from "@/theme/tokens/motion";
import {
  HERO_CHROME_OFFSET_MS,
  HERO_DECODE_TIMEOUT_MS,
  HERO_STACK_MS,
} from "@/motion/timings";

/**
 * Máquina de fases de LA PÁGINA (spec §7.1), no del hero: el navbar es
 * hermano del hero en `app/page.tsx`, no descendiente, así que no puede leer
 * por CSS ni por props cuándo el fondo del hero ha terminado de aparecer.
 * Esta fase la publica `StageProvider` (`@/motion/StageProvider`) y la
 * consumen el navbar y la copia del hero para decidir CUÁNDO arrancar su
 * propia animación de entrada — nunca CÓMO se anima cada uno, que sigue
 * siendo cosa suya.
 *
 * - `"backdrop"` — estado inicial. El fondo del hero (el ojo o Aura, según el
 *   tema) todavía se está revelando por primera vez; el navbar y la copia
 *   permanecen ocultos para no adelantarse a la coreografía del brief («al
 *   final el navbar y los textos», spec §1).
 * - `"chrome"` — el fondo ha avisado (`markBackdropRevealed()`) o la red de
 *   seguridad ha vencido: el navbar y la copia arrancan su propia animación
 *   de entrada. El nombre viene de "chrome" de interfaz (barra + controles),
 *   no de ningún color.
 * - `"settled"` — la animación de entrada del navbar (y, por transitividad,
 *   la copia) ya ha terminado. Estado terminal: nada vuelve a `"backdrop"`
 *   una vez alcanzado (los cambios de tema posteriores NO reinician el
 *   intro, spec §7.1).
 */
export type StagePhase = "backdrop" | "chrome" | "settled";

/**
 * Red de seguridad obligatoria (spec §7.1, plan C): si nadie llama a
 * `markBackdropRevealed()` en este plazo, `StageProvider` avanza igual a
 * `"chrome"` y después a `"settled"`. Sin ella, cualquier página que monte
 * un navbar sin hero —hoy `app/not-found.tsx`, mañana cualquier otra—
 * dejaría el navbar invisible PARA SIEMPRE: exactamente la clase de espera
 * sin tope que documenta `task/lessons.md` (2026-07-26, sobre la carrera de
 * `decode()`/rAF de `HeroBackdrop`) — un aviso que puede no llegar nunca no
 * puede ser la única vía de progreso.
 *
 * Se deriva de `HERO_DECODE_TIMEOUT_MS` (el tope de espera de `decode()` que
 * antecede a que el fondo llegue a avisar) más `HERO_STACK_MS` (lo que tarda
 * el stack en escalonarse por completo una vez arranca): es el peor caso
 * honesto de cuánto puede tardar un hero real en avisar, no un número
 * redondo elegido a ojo. Ambas constantes viven en `@/motion/timings`, la
 * fuente de verdad de los tiempos NÚCLEO del hero (`hero.transition.ts` las
 * reexporta para sus propios consumidores, pero este módulo importa
 * directamente del origen: es infraestructura de la página, no depende de
 * una sección hoja para sus datos base) — importarlas evita que este
 * archivo y aquel diverjan en el primer retoque.
 */
export const STAGE_FALLBACK_MS = HERO_DECODE_TIMEOUT_MS + HERO_STACK_MS;

/**
 * Offset de la coreografía del hero (spec §5.2), reexportado desde aquí para
 * que `StageProvider` no tenga que importar de dos módulos distintos para su
 * único temporizador de contenido: el navbar entra en el mismo instante que
 * la copia del hero, así que comparten esta misma constante.
 */
export { HERO_CHROME_OFFSET_MS };

/**
 * Duración de la transición de entrada del navbar (y, por construcción, del
 * tramo `"chrome" → "settled"` de esta máquina): spec §7.4 — «es una
 * transición de interfaz normal, no parte de la coreografía del hero, así
 * que aquí sí corresponde el token [`motion.duration.slow`] y no una
 * constante propia».
 *
 * No se escribe `320` a mano ni se lee `theme.data.motion.duration.slow` por
 * `useTheme()`: este módulo es "sin React" (no hay `ThemeProvider` montado
 * en tiempo de import) y, además, `motion.duration.slow` es el MISMO valor
 * para los dos temas — `themes.ts` construye `basicLightTheme`/
 * `basicDarkTheme` compartiendo el mismo objeto `motion` (`shared.motion`,
 * ver `src/theme/themes.ts`), así que no hay ninguna variante por tema que
 * perder al leer el token crudo en vez de por contexto. Se parsea el string
 * (`"320ms"` → `320`) para no duplicar el número si la escala de movimiento
 * cambia algún día.
 */
export const STAGE_CHROME_DURATION_MS = Number.parseInt(
  motion.duration.slow,
  10,
);
