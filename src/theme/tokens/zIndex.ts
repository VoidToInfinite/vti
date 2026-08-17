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
   */
  toast: 1100,
} as const;
