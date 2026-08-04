export const grid = {
  containerMax: "1200px",
  /**
   * Ancho máximo de la píldora del navbar flotante al hacer scroll. Es una
   * medida DISTINTA de `containerMax`: esta última acota el contenido del
   * sitio (1200px), mientras que `navMax` acota la barra de navegación
   * (1280px). Son magnitudes con propósitos distintos y deben poder
   * divergir sin arrastrarse la una a la otra.
   */
  navMax: "1280px",
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
