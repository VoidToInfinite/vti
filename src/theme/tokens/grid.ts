export const grid = {
  containerMax: "1200px",
  prose: "65ch",
  /**
   * Medida corta para subtítulos: dos líneas legibles de un vistazo. A los 65ch
   * de `prose` y 24px, el subtítulo del hero sería una única línea
   * interminable, que es lo contrario de un subtítulo.
   */
  proseTight: "34ch",
  columns: 12,
  gutter: "1.5rem",
} as const;
