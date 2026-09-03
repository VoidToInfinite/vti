/**
 * Escala de movimiento del sistema: el ÚNICO sitio de este repo donde nace
 * una duración o una curva (regla 48 de `RULES.md`, y el motivo por el que
 * las familias `easing-literal`/`easing-keyword`/`duration-literal` de
 * `scripts/detect-anti-patterns.mjs` se saltan este fichero entero).
 *
 * ## Una sola escala, dos formatos (crítica externa #14, 2026-09-02)
 *
 * `duration` (cadenas CSS, `"480ms"`) y `durationMs` (números,
 * `480`) NO son dos escalas: son el mismo objeto `DURATION_MS` leído de dos
 * formas. Existe el formato numérico porque `src/motion/vocabulary.ts`
 * declara sus tiempos como NÚMEROS (`REVEAL.durationMs`, interpolado en CSS
 * como `${REVEAL.durationMs}ms`) y hasta esa crítica tenía que escribirlos a
 * mano —`durationMs: 480`— porque el token solo existía en formato cadena.
 * El resultado medido: la escala tenía dos declaraciones del mismo número,
 * una en cada sistema, y nada obligaba a que siguieran coincidiendo. Con
 * `DURATION_MS` como fuente única, un cambio en un peldaño llega a la vez a
 * los dos formatos y a los dos sistemas.
 *
 * `DURATION_MS` no se exporta: se lee siempre por `motion.durationMs`, para
 * que no haya dos caminos de import hacia el mismo dato.
 */
const DURATION_MS = {
  instant: 0,
  fast: 100,
  base: 200,
  slow: 320,
  slower: 480,
  spin: 700,
  spinReduced: 2100,
} as const;

/**
 * Peldaños de la escala de retardos. No se exporta, por el mismo motivo que
 * `DURATION_MS`: se lee siempre por `motion.staggerMs`, para que no haya dos
 * caminos de import hacia el mismo dato.
 *
 * Lo que esta escala NO gobierna, dicho aquí para que su nombre no prometa
 * de más: los DESFASES DE FASE de un bucle ambiental —las 24 estrellas del
 * pie (`footer.layers.ts`, 800-3600 ms) y los orbes y destellos del mascota
 * Sol (`Sol.constants.ts`, −0,2 a −4 s)— no son escalonado de una entrada,
 * son lo contrario: números deliberadamente IRREGULARES para que dos piezas
 * vecinas nunca laten a la vez. Colapsarlos en tres peldaños destruiría
 * justo aquello para lo que existen, así que se quedan donde están, con su
 * sanción escrita en `scripts/detect-anti-patterns.mjs`.
 */
const STAGGER_MS = {
  /**
   * Paso APRETADO: piezas que deben leerse como un bloque, no como una
   * secuencia de cosas separadas. Es el paso de la cascada de tarjetas de
   * Story y el de los dos escalones centrales de la cabecera de Features.
   */
  tight: 60,
  /**
   * Paso BASE, el más repetido del repo: la distancia por defecto entre dos
   * hermanos de una misma entrada. Lo escribían por su cuenta la copia del
   * hero (`HERO_COPY_STEP_MS`), el primer escalón de las cabeceras de Story
   * y Features, y los dos escalones entre tarjetas de Features.
   */
  base: 80,
  /**
   * Paso HOLGADO: el de una composición cuyas piezas son CAPAS y no
   * hermanas de una lista, donde cada escalón tiene que llegar a leerse por
   * separado sobre un fundido largo. Único consumidor hoy, y por diseño: el
   * escalonado del stack de fondo del hero (`HERO_STEP_MS`, seis capas con
   * un fundido de 420 ms cada una).
   */
  loose: 110,
} as const;

export const motion = {
  duration: {
    instant: `${DURATION_MS.instant}ms`,
    fast: `${DURATION_MS.fast}ms`,
    base: `${DURATION_MS.base}ms`,
    slow: `${DURATION_MS.slow}ms`,
    slower: `${DURATION_MS.slower}ms`,
    spin: `${DURATION_MS.spin}ms`,
    spinReduced: `${DURATION_MS.spinReduced}ms`,
  },
  /**
   * La MISMA escala en milisegundos, para los consumidores que necesitan el
   * número y no la cadena CSS (hoy: los cinco grupos de
   * `src/motion/vocabulary.ts`). No añade ni un peldaño: son las siete
   * claves de `duration`, sin el sufijo.
   *
   * ## `durationMs.instant` y `durationMs.spin` NO son hojas muertas
   *
   * El evaluador de Craft de la crítica externa #16 las listó entre las 34
   * hojas de vocabulario sin consumidor. **Refutado por censo propio**
   * (comentarios despojados, `src/` y `app/` sin tests): `instant` lo
   * consume `Navbar.tsx` (dos declaraciones, la transición del panel) y
   * `spin` lo consume `Button.tsx` (la animación del spinner). Lo que sí es
   * cierto es que los DOS se leen por su forma en cadena
   * (`motion.duration.instant`, `motion.duration.spin`) y ninguno por la
   * numérica — pero eso no las convierte en peldaños distintos: los dos
   * formatos son el MISMO objeto `DURATION_MS` leído de dos maneras, como
   * dice el docblock de cabecera y como canda `motion.test.ts` clave a
   * clave. No existe una hoja `durationMs.instant` que se pueda retirar sin
   * retirar `duration.instant` con ella y romper sus dos consumidores.
   *
   * Es el mismo falso positivo, y por la misma causa, que el de `type.scale`
   * en esta misma crítica: `Typography.tsx` indexa la escala con una
   * variable (`theme.data.type.scale[$variant].size`, cuatro lecturas), así
   * que un censo que busque el nombre del peldaño no ve a su consumidor. En
   * los dos casos el error es contar consumidores de un CAMINO DE ACCESO en
   * vez de consumidores del dato.
   */
  durationMs: DURATION_MS,
  /**
   * Escala de RETARDOS de coreografía, en milisegundos (crítica externa #16).
   *
   * ## El hueco que cierra
   *
   * Hasta esta revisión este token tenía escala para las DURACIONES y para
   * las CURVAS, y ninguna para el tercer número que gobierna cualquier
   * coreografía: cuánto espera una pieza respecto a su hermana. La medición
   * del evaluador de Craft en la #16 —22 de 26 retardos como valores sueltos
   * entre 80 y 1.800 ms— es la consecuencia directa: sin escala de donde
   * elegir, cada sección se inventó la suya. Censo propio (mismo motor que
   * `scripts/detect-anti-patterns.mjs`: comentarios recortados, línea a
   * línea sobre `src/` y `app/`, tests fuera) de los PASOS entre hermanos
   * que el repo escribió de forma independiente:
   *
   * - **60 ms** — cascada de tarjetas de Story (×3, `Story.tsx`) y los dos
   *   pasos centrales de la cabecera de Features (`features.layers.ts`).
   * - **80 ms** — copia del hero (`HERO_COPY_STEP_MS`, `src/motion/
   *   timings.ts`), primer paso de las cabeceras de Story y de Features, y
   *   los dos pasos entre tarjetas de Features.
   * - **90 ms** — reveal escalonado de Journey (`STEP_STAGGER_MS`).
   * - **110 ms** — escalonado de capas del fondo del hero
   *   (`HERO_STEP_MS`), consumido por `aura.parts.tsx` y `eye.parts.tsx`.
   *
   * Cuatro números para el MISMO trabajo, elegidos por cuatro piezas que no
   * se conocen: es la regla 13 de `RULES.md` («una constante de valor
   * idéntico repetida en dos secciones es un token de tema») aplicada al
   * eje que faltaba.
   *
   * ## Por qué TRES peldaños y no cuatro, y de dónde sale cada cifra
   *
   * Las cifras son las del censo, no una progresión inventada: `tight` y
   * `base` son los dos pasos que las dos cascadas de mockup (Story y
   * Features) ya alternaban, y `loose` es el del stack del hero. Los 90 ms
   * de Journey NO tienen peldaño propio a propósito — su docblock los
   * declara como «~90ms por paso», un valor aproximado, y darles casilla
   * sería convertir la escala en el cajón que la crítica #16 pide cerrar;
   * migrarlos a `base` o a `loose` cambia el valor renderizado y por eso
   * queda como decisión, no como refactor.
   *
   * No se deriva de `durationMs` (ni al revés): un retardo y una duración
   * son magnitudes distintas —cuándo empieza algo frente a cuánto tarda— y
   * atarlas obligaría a que retocar el ritmo de una cascada moviera las
   * transiciones de hover de todo el sitio. Que `spinReduced` y el retardo
   * más largo de una cascada acaben en el mismo número sería una
   * coincidencia, no una relación.
   *
   * ## Por qué NO hay gemelo en cadena CSS (a diferencia de `duration`)
   *
   * `duration` existe en cadena porque hay decenas de consumidores que la
   * interpolan tal cual. Aquí ocurre lo contrario: los SEIS consumidores
   * reales de estos peldaños necesitan el NÚMERO —lo multiplican por un
   * índice (`step * motion.staggerMs.loose`) o lo suman para acumular una
   * cascada—, así que un `stagger` en cadena nacería con cero consumidores,
   * que es exactamente la hoja muerta que la misma crítica #16 pide podar
   * (mismo criterio que retiró `REVEAL.stepMs`, `grid.proseTight` y
   * `color.success`). El sufijo `Ms` del nombre del objeto avisa de que lo
   * que sale de aquí es un número, igual que en `durationMs`.
   *
   * El candado de que ningún peldaño se quede sin consumidor real vive en
   * `motion.test.ts` y mide por PELDAÑO, no por escala.
   */
  staggerMs: STAGGER_MS,
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
    /**
     * Curva de ATERRIZAJE: sale disparada y se asienta. Es la más usada del
     * sitio con diferencia — la crítica externa #14 (2026-09-02) la midió en
     * el CSS servido, 72 ocurrencias en tema claro y 105 en oscuro — y hasta
     * esa crítica NO era un token: vivía como literal propio en
     * `src/motion/vocabulary.ts` (`REVEAL.easing`/`PRESS.easing`) y, con
     * otros puntos de control por 0,01/0,04, como `EASE_ENTRANCE` en
     * `src/components/scenes/eye/mascots/Sol.tsx`. Las tres pasan ahora por
     * aquí.
     *
     * Por qué estos cuatro puntos de control, y por qué ninguna de las otras
     * cinco sirve. `y1 = 1` significa que la curva alcanza su valor final de
     * progreso ya en el primer punto de control: casi todo el recorrido se
     * consume al principio y el resto de la duración es asentamiento. Es la
     * deceleración más pronunciada de la escala, y es MONÓTONA (no sobrepasa
     * su valor final; eso lo hace solo `overshoot`). Distancia máxima de
     * progreso, medida punto a punto sobre 10.001 muestras de la curva
     * paramétrica: **0,200 frente a `decelerate`** y **0,552 frente a
     * `standard`** — un orden de magnitud por encima del ruido, así que
     * ninguna de las dos es un sustituto de ésta.
     *
     * Absorbe `EASE_ENTRANCE` (`cubic-bezier(0.22, 1, 0.36, 1)`, el morph de
     * identidad del mascota Sol) por medición, no por parecido. Las dos
     * medidas, ejecutadas en `motion.test.ts` sobre 10.001 muestras y no
     * citadas de memoria:
     *
     * - Distancia máxima de PROGRESO a un mismo instante: **0,0109** — 1,09
     *   puntos porcentuales, con el pico en x ≈ 0,28. Traducido a lo que el
     *   morph de Sol anima de verdad (`scale` de 0,88 a 1 y `rotateY` de 48°
     *   a 0°, más la opacidad), ese 1,09 % del recorrido son 0,52° de giro y
     *   0,0013 de escala en el instante de máxima separación.
     * - Desfase TEMPORAL máximo para un mismo progreso: **0,0158 de la
     *   duración**, que sobre los 1100 ms del morph son **17,3 ms** — algo
     *   más que un fotograma a 60 Hz (16,7 ms). El dato que lo vuelve
     *   irrelevante es DÓNDE está ese pico: en y ≈ 0,974, es decir, en el
     *   último 2,6 % del recorrido, cuando las dos curvas ya están
     *   prácticamente asentadas y lo que se desplaza un fotograma es el
     *   final de un fundido, no su arranque.
     *
     * Las dos curvas eran de la misma familia (`easeOutQuint`), como ya
     * declaraba la propia entrada del allowlist del detector que remitía la
     * unificación al dueño.
     */
    settle: "cubic-bezier(0.23, 1, 0.32, 1)",
    /**
     * Única curva de la escala que SOBREPASA su valor final antes de asentar
     * (las otras cinco son monótonas). Existe para rebotes elásticos como
     * el despegue del navbar al hacer scroll, no para transiciones de
     * interfaz normales.
     */
    overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;
