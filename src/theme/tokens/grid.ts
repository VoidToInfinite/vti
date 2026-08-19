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
   * Ancho máximo del CONTENIDO de las secciones de la home que componen a
   * sangre completa (Story, Journey, Features, Contact). Nombra una medida que
   * ya existía repetida: hasta la crítica externa #12 (2026-08-18) el mismo
   * valor vivía escrito a mano como cuatro constantes de sección
   * (`STORY_DARK_MAX_WIDTH`, `JOURNEY_CONTENT_MAX_WIDTH`,
   * `FEATURES_CONTENT_MAX_WIDTH`, `CONTACT_CONTENT_MAX_WIDTH`) y además dos
   * secciones LEÍAN `navMax` como ancho de contenido — contra el docblock del
   * propio `navMax`, que lo declara exclusivo de la píldora del navbar y
   * exige que ambas medidas puedan divergir sin arrastrarse.
   *
   * Que hoy coincida numéricamente con `navMax` es un hecho, no un contrato:
   * son magnitudes de propósitos distintos y este token existe precisamente
   * para que retocar la píldora del navbar no mueva cuatro secciones.
   *
   * Lo que este token NO resuelve: la convivencia de DOS raíles en la misma
   * página (`containerMax` 1200 vs este 1280, bordes de sección a 120 y 80 px
   * — crítica #12, Craft dim. 4). Unificarlos es una decisión de diseño del
   * dueño; nombrar la medida existente es refactor de vocabulario, no
   * rediseño (mismo criterio que `heroCopyMax`).
   */
  sectionMax: "1280px",
  /**
   * Tope de ancho de la COLUMNA DE COPIA DEL HERO. Gobierna hoy cinco
   * declaraciones y ninguna más: `ScCopy` (el contenedor de la columna, en su
   * forma centrada y otra vez dentro del `min(..., 70%)` de escritorio),
   * `ScTagline` y `ScSubtitle` — las tres en `Hero.tsx` — más el override
   * `--hero-copy-maxwidth-lg` de la rama oscura, en `GlobalStyles.tsx`.
   *
   * Hasta la crítica externa #10 (2026-08-18) las cinco escribían el valor a
   * mano: de las tres medidas de prosa que convivían en el sitio, la que
   * gobierna la copia más vista era la única sin nombre, y la del medio
   * (`prose`) la única tokenizada.
   *
   * Por qué NO entra en la familia de `prose` — y por eso NO se llama
   * `proseWide`: `prose` promete un RECUENTO DE CARACTERES (~65 reales por
   * línea, rango 60-75 de `DESIGN.md` §3.4) y su valor sale de dividir esa
   * promesa por el ratio medido de Hanken Grotesk. Este token no hace esa
   * promesa: es el tope de una COLUMNA, el mismo rol que `navMax` cumple para
   * la píldora del navbar, y lo que acota es un `<h1>` de
   * `clamp(34px, 8vw, 258px)` con dos piezas cortas debajo. Nombrarlo como
   * pariente de `prose` invitaría a "recalibrarlo" por ese ratio, que aquí no
   * describe nada: aplicado daría 70 × 1,259 ≈ 88 caracteres, muy por encima
   * del rango, pero el tope casi nunca llega a morder — en escritorio el
   * término que gana suele ser el `70%` del `min()` (la mano izquierda del
   * arte, spec S3.6), y las dos líneas que sí son texto de cuerpo se midieron
   * en navegador real a 1280x720 oscuro en 458,73px (tagline) y 585,94px
   * (subtítulo), muy por debajo del tope (docblock de `ScTagline`,
   * `Hero.tsx`). Mismo criterio que `navMax` frente a `containerMax`:
   * magnitudes con propósitos distintos, que deben poder divergir sin
   * arrastrarse la una a la otra.
   *
   * Por qué este valor y no otro: es EXACTAMENTE el que el hero ya pintaba, y
   * esta entrada no lo cambia ni un carácter — nombrar una medida repetida es
   * refactor de vocabulario, no rediseño. Lo que este token NO cierra es si
   * el tope es el correcto; esa es una decisión de diseño con navegador
   * delante, declarada como pendiente y no resuelta aquí. El candado del
   * valor vive en `system.test.ts`; el de que los cinco consumidores lo LEAN
   * (en vez de reescribir el literal) vive en `Hero.qa.test.tsx`, porque un
   * candado de valor renderizado no puede distinguir un token de un literal
   * que resuelve a lo mismo (`task/lessons.md`, 2026-08-12).
   */
  heroCopyMax: "70ch",
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
   * 2026-08-17, y otra vez en la crítica externa #10, 2026-08-18): el
   * subtítulo del hero que lo justificó nunca lo consumió. Hasta el
   * 2026-08-18 declaraba su propio `max-width` literal; desde esa fecha
   * consume `heroCopyMax` (arriba), que es el tope de la columna entera del
   * hero, no esta medida corta — así que el subtítulo sigue sin ser
   * consumidor de este token. Sin consumidor no hay medida real que
   * recalibrar; recalibrarlo "por coherencia" sería mover un número que nadie
   * lee, contra una promesa que nunca hizo.
   *
   * NO se retira pese al cero: a diferencia de `columns`/`gutter`, este token
   * tiene un DESTINO escrito aquí — la medida de dos líneas para un
   * subtítulo — y su docblock es la propia decisión de conservarlo.
   */
  proseTight: "34ch",
} as const;
