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
   */
  durationMs: DURATION_MS,
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
