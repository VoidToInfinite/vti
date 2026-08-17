export const grid = {
  /**
   * Ancho máximo del contenido del sitio. Es el ÚNICO tope de composición
   * general que este repo aplica de verdad.
   *
   * Aquí vivieron `columns: 12` y `gutter: "1.5rem"`, RETIRADOS en la crítica
   * externa #9 (2026-08-17). Censo propio de consumidores antes de tocarlos
   * (patrones con punto, con corchete, por desestructuración y por alias local
   * de `theme.data`, el punto ciego que el censo anterior sí tuvo): **cero
   * usos en `src/` y en `app/`** — las únicas apariciones de los dos
   * identificadores en todo el repo eran su propia declaración y el contrato
   * de `system.test.ts`. Y a diferencia de `space[10]`/`zIndex.toast`, que se
   * conservaron por tener un destino escrito en código o en docs, estos dos no
   * tenían ninguno: ni un consumidor, ni una mención en `DESIGN.md`, ni una
   * reserva en `docs/qa-3d-pendiente.md`.
   *
   * El motivo de retirarlos no es solo que nadie los leyera: es que
   * DESCRIBÍAN UN SISTEMA QUE NO EXISTE. Prometían una rejilla de 12 columnas
   * con canal de 1.5rem, y ninguna rejilla del sitio se construye así — las
   * reales son `repeat(2, 1fr)`/`repeat(3, 1fr)`/`repeat(6, 1fr)` en Journey,
   * `auto-fit + minmax` en Features/Story, cada una con su propio `gap` de la
   * escala `space`. Un token que miente sobre la arquitectura es peor que uno
   * que solo sobra: el siguiente que lo lea creerá que hay una rejilla maestra
   * a la que alinearse.
   *
   * Mismo criterio y mismo precedente que `motion.duration.ambient` (commit
   * `3734fd0`) y que `space.px`/`zIndex.max` (commit `1c707b3`).
   */
  containerMax: "1200px",
  /**
   * Ancho máximo de la píldora del navbar flotante al hacer scroll. Es una
   * medida DISTINTA de `containerMax`: esta última acota el contenido del
   * sitio (1200px), mientras que `navMax` acota la barra de navegación
   * (1280px). Son magnitudes con propósitos distintos y deben poder
   * divergir sin arrastrarse la una a la otra.
   */
  navMax: "1280px",
  /**
   * Medida de línea del cuerpo largo: el ancho que deja **~65 CARACTERES
   * reales** por línea — el centro del rango de legibilidad 60-75 que persigue
   * el sistema (`DESIGN.md` §3.4, spec `2026-07-24-luxury-interface-system`).
   * Esa es la promesa; el número de abajo es solo cómo se expresa.
   *
   * Por qué NO es "65ch", y por qué 52ch no es un capricho: la unidad `ch` no
   * mide un carácter, mide el ancho de avance del glifo "0". Hanken Grotesk
   * (`type.fontBody`) tiene la caja media de sus caracteres de texto más
   * estrecha que su cero, así que cada `ch` cabe MÁS de un carácter. Ratio
   * medido en navegador real sobre el copy del sitio (crítica externa #8,
   * 2026-08-17; dos evaluadores independientes coincidieron): **1,259
   * caracteres reales por `ch`**.
   *
   *   65ch × 1,259 = 81,8 caracteres reales → fuera del rango, promesa rota
   *   52ch × 1,259 = 65,5 caracteres reales → la promesa, cumplida
   *
   * Derivación del valor: 65 ÷ 1,259 = 51,6ch, redondeado a 52ch.
   *
   * AVISO a quien pase por aquí después: devolverlo a "65ch" REINTRODUCE el
   * defecto — ese 65 es la promesa escrita en la unidad equivocada, no el
   * valor correcto. Si algún día cambia la tipografía de cuerpo, lo que hay
   * que volver a medir es el RATIO (no el 65): se compara el ancho de avance
   * del "0" con el ancho medio de carácter del copy real, y eso solo se mide
   * en un navegador — jsdom no hace layout. El candado del valor y del rango
   * vive en `system.test.ts`.
   */
  prose: "52ch",
  /**
   * Medida corta para subtítulos: dos líneas legibles de un vistazo. Con la
   * medida de `prose` y 24px, el subtítulo del hero sería una única línea
   * interminable, que es lo contrario de un subtítulo.
   *
   * Su valor NO se corrige por el ratio de `prose` (arriba) a propósito: lo
   * que promete no es un recuento de caracteres, sino el número de LÍNEAS de
   * una pieza concreta. Y hoy no tiene ningún consumidor en `src/` (verificado
   * 2026-08-17): el subtítulo del hero que lo justificó declara su propio
   * `max-width` literal en `Hero.tsx`. Sin consumidor no hay medida real que
   * recalibrar; recalibrarlo "por coherencia" sería mover un número que nadie
   * lee, contra una promesa que nunca hizo.
   */
  proseTight: "34ch",
} as const;
