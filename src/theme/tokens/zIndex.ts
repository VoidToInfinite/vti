/**
 * Escala de capas del sistema. SEIS peldaños desde la crítica externa #18
 * (2026-09-04); siete entre la #8 y esa fecha, ocho antes de la #8.
 *
 * AQUÍ VIVIÓ `toast: 1100`, el séptimo peldaño, RETIRADO en la #18 tras haber
 * sido señalado en tres rondas consecutivas (#8, #16 y #18) y conservado en
 * las dos primeras. Se retira ahora porque esta vez NO se repitió el veredicto
 * anterior: se fue a comprobar la evidencia externa que lo sostenía, y esa
 * evidencia no dice lo que el docblock afirmaba que decía.
 *
 * QUÉ SOSTENÍA AL PELDAÑO, textualmente: que "toast" es uno de los cuatro
 * roles de capa flotante que el sistema nombra como los únicos donde se
 * admite cristal, y que esos cuatro roles están escritos en código vivo
 * (`Navbar.tsx` línea 46 y `Card.tsx` línea 17, los dos con la misma lista
 * literal «nav on-scroll, modal, sheet, toast»). Las dos líneas siguen ahí
 * hoy, verbatim — no se retira porque la cita haya caducado.
 *
 * POR QUÉ LA CONCLUSIÓN NO SE SIGUE, medido sobre esa misma lista: de sus
 * CUATRO nombres, `sheet` NUNCA ha tenido peldaño en esta escala, y nadie lo
 * ha echado en falta en las tres rondas que llevan citándola. Es decir, la
 * lista y esta escala no están —ni han estado nunca— en correspondencia uno a
 * uno: es un catálogo de los roles donde se admite CRISTAL (§13.2 de la
 * spec), no un índice de la escala de capas. Retirar `toast` no deja esos dos
 * comentarios nombrando una capa que la escala ya no define, exactamente
 * igual que hoy no la deja `sheet`; lo que hacía era dar por buena una
 * dependencia que la evidencia no contiene.
 *
 * CENSO PROPIO en esta revisión (mismo motor que el resto de censos del repo:
 * comentarios despojados, `src/` y `app/` sin tests, contando también la
 * forma con corchete `zIndex["..."]`), consumidores por peldaño:
 * base 5 usos / 4 ficheros, raised 3/3, stickyNav 1/1, dropdown 1/1,
 * overlay 1/1, modal 2/2 y **toast 0**. Era el único de los siete a cero, y
 * lo era ya en la #8.
 *
 * Con la evidencia externa refutada, se aplica el criterio que este mismo
 * fichero declaraba para ese momento —y el mismo que retiró `max: 9999` aquí,
 * `grid.proseTight` en `grid.ts` y `motion.duration.ambient` en el commit
 * `3734fd0`—: un peldaño existe si alguien lo consume o si algo escrito fuera
 * de su propio docblock lo reserva. Ninguna de las dos cosas se cumple.
 *
 * QUÉ LO DEVOLVERÍA: una capa de notificación real en el sitio. En ese
 * momento el peldaño se declara con su consumidor en el mismo cambio, que es
 * como se añade cualquier otro. Nótese que `space[10]` NO se retira por este
 * mismo criterio y la diferencia es exactamente la que aquí falla: su reserva
 * vive en `docs/qa-3d-pendiente.md`, en un ítem sin marcar que lo nombra por
 * su nombre como la mitigación de una comprobación abierta.
 *
 * El candado de que ningún peldaño de esta escala vuelva a quedarse sin
 * consumidor vive en `scalars.test.ts` y mide por PELDAÑO, sobre el código
 * real con los comentarios despojados.
 */
export const zIndex = {
  base: 0,
  raised: 10,
  stickyNav: 100,
  dropdown: 200,
  overlay: 900,
  modal: 1000,
} as const;
