export const space = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.5rem",
  6: "2rem",
  7: "3rem",
  8: "4rem",
  9: "6rem",
  /**
   * RESERVADO CON DESTINO CONOCIDO, no muerto. Censo de consumidores
   * (crítica externa #8, 2026-08-17): cero usos en `src/` y `app/` — pero
   * `docs/qa-3d-pendiente.md` lo nombra por su nombre como la mitigación
   * exacta de una comprobación visual todavía abierta ("si aparece banding
   * en la rampa Hero→Story, la mitigación es alargar la costura a
   * `space[10]` (8rem), NO añadir paradas intermedias al degradado").
   * Retirarlo dejaría esa instrucción apuntando a un paso que ya no existe;
   * se conserva hasta que esa comprobación se cierre en un sentido o en
   * otro.
   *
   * En la misma revisión SÍ se retiró `px: "1px"`, el otro paso sin
   * consumidores de esta escala, que no tenía ningún destino declarado en
   * ninguna parte (mismo criterio y mismo precedente que
   * `motion.duration.ambient`, commit `3734fd0`).
   */
  10: "8rem",
} as const;
