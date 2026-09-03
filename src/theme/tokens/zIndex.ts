export const zIndex = {
  base: 0,
  raised: 10,
  stickyNav: 100,
  dropdown: 200,
  overlay: 900,
  modal: 1000,
  /**
   * RESERVADO POR DOCTRINA DEL SISTEMA, no muerto. Censo de consumidores
   * (crítica externa #8, 2026-08-17): cero usos en `src/` y `app/` — pero
   * "toast" es uno de los cuatro roles de capa FLOTANTE que el sistema
   * nombra como los únicos donde se admite cristal, y esos cuatro roles
   * están escritos hoy en código vivo (`Navbar.tsx` y `Card.tsx`, los dos:
   * "nav on-scroll, modal, sheet, toast"). Retirar este peldaño dejaría esos
   * dos comentarios nombrando una capa que la escala ya no define.
   *
   * En la misma revisión SÍ se retiró `max: 9999`, el otro peldaño sin
   * consumidores: era una válvula de escape genérica, sin un solo uso ni una
   * sola mención en todo el repo (mismo criterio y mismo precedente que
   * `motion.duration.ambient`, commit `3734fd0`).
   *
   * ## Re-examinado en la crítica externa #16 (2026-09-03): SE CONSERVA
   *
   * No se dio por buena la cita de arriba: se volvió a leer el código vivo y
   * los dos comentarios que nombran la capa siguen ahí y siguen nombrándola
   * —`Navbar.tsx` y `Card.tsx`, los dos con la misma lista literal «nav
   * on-scroll, modal, sheet, toast»—, así que la evidencia EXTERNA que
   * sostiene el peldaño (la doctrina escrita en otro sitio, no este
   * docblock) sigue viva. Es el listón que `grid.proseTight` no pasó y que
   * `space[10]` sí pasa, por el mismo motivo.
   *
   * Censo propio de la escala en esta revisión, por ficheros consumidores:
   * base 3, raised 3, stickyNav 1, dropdown 1, overlay 1, modal 2,
   * **toast 0**. Es el ÚNICO peldaño a cero de los siete.
   *
   * QUÉ LO RETIRARÍA: que esos dos comentarios dejen de nombrar «toast» —
   * porque el sistema de cristal se redefina o porque las piezas
   * desaparezcan— sin que este peldaño haya llegado a consumirse. En ese
   * momento no quedaría evidencia externa y aplicaría el criterio de
   * `proseTight`.
   */
  toast: 1100,
} as const;
