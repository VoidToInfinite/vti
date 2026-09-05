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

/**
 * Viewport CSS más estrecho que el sitio soporta: el suelo de reflow de WCAG
 * 1.4.10 (320 px CSS, que es lo que queda de 1280 px al 400 % de zoom). Es el
 * ancho contra el que se calibra `inlineSpace`, abajo, y el primer peldaño del
 * barrido de anchos de `scripts/check-site-surfaces.mjs`.
 */
export const MIN_VIEWPORT_PX = 320;

/**
 * Raíz tipográfica con la que los navegadores salen de fábrica, en px. Es el
 * denominador con el que un peldaño en `rem` se convierte a píxeles para
 * calibrar el término en `vw` de `inlineSpace`; no es una preferencia del repo.
 */
const ROOT_FONT_BASE_PX = 16;

/** Los peldaños de `space` con consumidor real en el eje inline. */
type InlineStep = 2 | 3 | 4 | 5 | 6 | 7;

function inlineOf(step: InlineStep): string {
  const px = Number.parseFloat(space[step]) * ROOT_FONT_BASE_PX;
  const vw = (px / MIN_VIEWPORT_PX) * 100;
  return `min(${space[step]}, ${vw}vw)`;
}

/**
 * Relleno del eje INLINE (izquierda y derecha) acotado al viewport.
 *
 * Es la misma escala que `space`, peldaño a peldaño, con una sola diferencia:
 * deja de crecer con la raíz tipográfica cuando el viewport es más estrecho que
 * 20rem (320 px con la raíz a 16 px). Cada valor es `min(<rem>, <vw>)`, y el
 * término en `vw` vale EXACTAMENTE el peldaño en píxeles a 320 px con la raíz
 * por defecto (`space[5]` = 1.5rem = 24 px = 7,5 vw de 320). De ahí se siguen
 * las tres propiedades que este token promete:
 *
 *   1. Con la raíz a 16 px y cualquier viewport de 320 px o más, el mínimo es
 *      siempre el `rem`: la composición por defecto no cambia ni un píxel.
 *      Verificado el 2026-09-05 comparando la huella de cajas de las ocho
 *      superficies del sitio a 320, 390, 768 y 1280 px antes y después de
 *      migrar los consumidores.
 *   2. Con la raíz ampliada (la preferencia de tamaño de texto del usuario,
 *      el 200 % que exige WCAG 1.4.4), el relleno sigue creciendo con la fuente
 *      mientras el viewport da de sí, y se detiene justo donde el viewport
 *      deja de darlo: a raíz 32 px gana el `vw` por debajo de 640 px, y a 320 px
 *      el relleno vale lo mismo que vale a 320 px con la raíz por defecto.
 *   3. Por debajo de 320 px —fuera del soporte declarado— el relleno encoge
 *      con el viewport en vez de desbordarlo.
 *
 * POR QUÉ EXISTE, medido y no supuesto. El 2026-09-05, sobre el build de
 * producción servido en Chrome con la fuente al 200 % (`Page.setFontSizes`,
 * raíz 32 px) y 320 px de viewport, los rellenos en `rem` de la sección de
 * Contacto, de su tarjeta, de su formulario, de sus campos y de su botón se
 * doblaban mientras el viewport se quedaba donde estaba: la columna de texto de
 * las tarjetas de canal medía 23,2 px (27 caracteres en 23 líneas), el texto de
 * ayuda del formulario 28 px de ancho (99 caracteres en 61 líneas) y el rótulo
 * del CTA salía letra por línea. En los decks oscuros la misma aritmética
 * dejaba la copia en 144 px de 320. El arreglo anterior (`overflow-wrap:
 * anywhere`, crítica #19) había convertido la PÉRDIDA de texto en ILEGIBILIDAD:
 * nada se salía del viewport, pero nada se podía leer.
 *
 * QUÉ NO ES. No se aplica al tamaño de fuente: WCAG 1.4.4 exige que el texto
 * llegue al 200 %, y acotar tipografía con unidades de viewport es exactamente
 * el patrón de fallo F94; el texto crece siempre, lo que se contiene es el aire
 * que lo rodea. Tampoco se aplica al eje de bloque (`padding-block`): la altura
 * no compite con el viewport. Y no sustituye a `space` en los huecos entre
 * piezas (`gap`), que siguen escalando con el texto que separan.
 *
 * POR QUÉ `vw` Y NO PORCENTAJE: un porcentaje de relleno se resuelve contra el
 * ancho del CONTENEDOR, así que el mismo peldaño valdría distinto en cada nivel
 * de anidamiento y la propiedad 1 dejaría de cumplirse en las cajas interiores.
 * El `vw` es una sola referencia para todos los niveles.
 *
 * Solo existen los peldaños con consumidor real en el eje inline; el detector
 * de anti-patrones exime este fichero, y la familia `spacing-literal` no cuenta
 * las unidades de viewport, por el motivo que su propio comentario declara.
 */
export const inlineSpace: Readonly<Record<InlineStep, string>> = {
  2: inlineOf(2),
  3: inlineOf(3),
  4: inlineOf(4),
  5: inlineOf(5),
  6: inlineOf(6),
  7: inlineOf(7),
};
