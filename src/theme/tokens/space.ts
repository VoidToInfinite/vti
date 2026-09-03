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
   *
   * ## Re-examinado en la crítica externa #13 (2026-08-18): SE CONSERVA, con
   * dos evidencias NUEVAS — no con la de la vez pasada repetida
   *
   * 1. **La casilla que lo justifica sigue ABIERTA.** No se da por buena la
   *    cita de arriba: se volvió a leer `docs/qa-3d-pendiente.md` y su ítem
   *    "Banding y costura en la rampa de 10rem Hero→Story" sigue sin marcar
   *    (`- [ ]`) y sigue nombrando este paso como la mitigación. La razón que
   *    conserva el token no es su propio docblock —eso sería inercia, y por
   *    eso mismo se retiró `grid.proseTight` en esta misma ola— sino un
   *    pendiente EXTERNO, vivo y comprobado hoy.
   * 2. **Censo propio paso a paso de la escala entera** (consumidores reales
   *    en `src/`+`app/`, sin tokens ni tests, con las cuatro formas de acceso
   *    y comprobando además que nadie indexa `space` con una clave dinámica —
   *    no hay ni un `space[<variable>]` en el repo): 0→4, 1→18, 2→61, 3→37,
   *    4→41, 5→63, 6→37, 7→14, 8→15, 9→6, **10→0**. Es el ÚLTIMO peldaño de
   *    una escala continua, no un token suelto: el cero de un extremo de una
   *    rampa es el estado normal de una escala que todavía no ha necesitado
   *    su tramo más largo, y retirarlo dejaría el sistema sin la casilla que
   *    la QA abierta ya reservó. Distinto por completo de un token con nombre
   *    propio y cero consumidores, que no forma serie con nada.
   *
   * QUÉ LO RETIRARÍA, escrito para que la próxima revisión no tenga que
   * volver a deducirlo: que esa casilla de `docs/qa-3d-pendiente.md` se
   * cierre —en el sentido que sea— sin que este paso haya llegado a
   * consumirse. En ese momento deja de haber evidencia externa y aplica el
   * mismo criterio que a `proseTight`.
   *
   * ## Tercera revisión (crítica externa #16, 2026-09-03): SE CONSERVA
   *
   * Se aplicó el criterio de arriba en vez de repetir el veredicto: se
   * volvió a abrir `docs/qa-3d-pendiente.md` y su ítem «Banding y costura en
   * la rampa de 10rem Hero→Story» sigue **sin marcar** (`- [ ]`) y sigue
   * nombrando este paso por su nombre como la mitigación. La evidencia
   * externa sigue viva, así que la condición de retirada no se cumple.
   *
   * Censo propio de la escala repetido en esta revisión (mismo método:
   * comentarios despojados, `src/` y `app/` sin tests, más la comprobación
   * de que nadie indexa `space` con una clave dinámica): 0→2, 1→9, 2→15,
   * 3→14, 4→13, 5→15, 6→14, 7→8, 8→7, 9→5, **10→0**. Los recuentos por
   * peldaño difieren de los de la #13 porque aquel censo contaba
   * APARICIONES y este cuenta FICHEROS consumidores; el único dato que
   * decide —que el último peldaño sigue a cero y el resto no— es el mismo.
   */
  10: "8rem",
} as const;
