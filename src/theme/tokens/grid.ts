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
   * Medida de línea del cuerpo largo: el ancho que entrega un recuento de
   * caracteres REALES por línea dentro del rango de legibilidad **60-75** que
   * persigue el sistema (`DESIGN.md` §3.4, spec
   * `2026-07-24-luxury-interface-system`). Esa es la promesa; el número de
   * abajo es solo cómo se expresa.
   *
   * ## LA CIFRA DE ESTA PROMESA ES MEDIDA, NO DERIVADA — desde la crítica
   * externa #15 (2026-09-02)
   *
   * Hasta esa revisión la primera línea de este docblock prometía «~65
   * CARACTERES reales», un número que salía de la ARITMÉTICA de más abajo y
   * no de contar nada: era el objetivo de la derivación, escrito como si
   * fuera su resultado observado. Con la caja de 56ch ya en producción y el
   * equilibrado de línea ya retirado del cuerpo (la condición que el apartado
   * de más abajo declara), el evaluador de Craft de la #15 midió lo que esta
   * caja entrega DE VERDAD, en navegador real y por DOS métodos de conteo
   * independientes:
   *
   *   legales (párrafos largos):  66-73 caracteres por línea
   *                               media 66,4 por un método, 71,7 por el otro
   *   home    (párrafos cortos):  59-70 caracteres por línea
   *
   * Las dos superficies caen dentro de la banda salvo por un carácter: la
   * PEOR línea de la home mide 59, uno por debajo del suelo de 60. No es un
   * fallo del valor ni una medición que pida corregirlo — es exactamente el
   * caso que el apartado «Lo que este token NO puede prometer» razona más
   * abajo: con bandera derecha, la línea que precede a una palabra larga
   * siempre se queda corta, y un suelo POR LÍNEA es aritméticamente
   * imposible; el contrato es por SUPERFICIE. Queda escrito en vez de
   * redondeado hacia arriba.
   *
   * Qué le hace esto a la derivación de abajo: la CONFIRMA en su orden de
   * magnitud y le quita la falsa precisión. El camino (A) predecía 64,9
   * realizados; lo medido va de 59 a 73 según superficie y método, con las
   * medias de las legales en 66,4 y 71,7. Un solo número no describe eso, y
   * por eso la promesa de la primera línea es ahora la BANDA y no un valor
   * puntual. La aritmética se conserva entera porque es la que explica por
   * qué 56ch y no 52 ni 65 — pero se lee como lo que es: la derivación que
   * eligió el entero, no el recuento que se observa.
   *
   * ## CAPACIDAD NO ES REALIZACIÓN — la distinción que este docblock enseñaba
   * mal hasta la crítica externa #13 (2026-08-18)
   *
   * Hay DOS magnitudes distintas y la promesa habla de la segunda:
   *
   * - **CAPACIDAD**: cuántos caracteres CABEN en la caja. Es una división:
   *   ancho ÷ ancho medio de carácter. La unidad `ch` no mide un carácter,
   *   mide el ancho de avance del glifo "0", y Hanken Grotesk
   *   (`type.fontBody`) tiene la caja media de sus caracteres de texto más
   *   estrecha que su cero, así que cada `ch` cabe MÁS de un carácter. Ratio
   *   medido en navegador real (crítica externa #8, 2026-08-17, dos
   *   evaluadores independientes; reconfirmado en la #13, que midió un rango
   *   de 1,204-1,309 según el texto): **1,259 caracteres reales por `ch`**.
   * - **REALIZACIÓN**: cuántos caracteres hay DE VERDAD en una línea llena.
   *   Siempre son MENOS que los que caben, y no por un margen despreciable:
   *   con bandera derecha (`text-align: start`, lo que este sitio usa en todas
   *   sus superficies de prosa) la línea corta por PALABRA, así que el hueco
   *   que deja la última palabra que no entra se desperdicia entero, línea
   *   tras línea. Pérdida medida por el evaluador de la #13: **8-10 %**.
   *
   * La derivación anterior (`65 ÷ 1,259 = 52ch`) dividía la promesa por el
   * ratio de CAPACIDAD y se detenía ahí. Es decir: calculaba la caja en la que
   * caben 65 caracteres, no la caja que ENTREGA 65. El error no estaba en el
   * ratio (la #13 lo remidió y lo confirmó) sino en el paso que faltaba.
   * Medido en navegador real por dos partes independientes, carácter a
   * carácter con `Range.getClientRects()` sobre líneas llenas — nunca
   * estimando por el ancho de la caja:
   *
   *   caja de 52ch = 465,92 px → capacidad 65,5 caracteres
   *     home  (párrafos cortos): 54 / 61 / 62 por línea, media 59  ← BAJO 60
   *     legales (párrafos largos): 61-69 por línea
   *
   * La home, que es donde vive la mayoría de los consumidores de este token,
   * quedaba POR DEBAJO del suelo de 60 del rango. La promesa estaba rota en la
   * dirección contraria a la que la #8 corrigió.
   *
   * ## Derivación nueva, por dos caminos que convergen en el mismo entero
   *
   * (A) FORWARD — promesa ÷ (capacidad × realización):
   *
   *       65 ÷ (1,259 × 0,92) = 56,1ch  →  **56ch**
   *
   *     El **factor de realización 0,92** (un 8 % de pérdida) sale del extremo
   *     conservador de la banda 8-10 % medida por la #13, y es el que hace
   *     cuadrar el corpus entero (ver (B)); a 56ch la cuenta da 56 × 1,259 ×
   *     0,92 = 64,9 caracteres realizados.
   *
   * (B) EMPÍRICO — el único entero que mete el corpus MEDIDO en la banda.
   *     Los recuentos realizados escalan con el ancho de la caja, así que
   *     desde las medidas tomadas a 52ch:
   *
   *       suelo:  56 × (V/52) ≥ 60  →  V ≥ 55,7ch   (peor línea de la home)
   *       techo:  69 × (V/52) ≤ 75  →  V ≤ 56,5ch   (mejor línea de legales)
   *
   *     V ∈ [55,7 ; 56,5] deja **56ch** como ÚNICO valor entero posible: a
   *     55ch la home cae a 59,2 (bajo el suelo) y a 57ch las legales suben a
   *     75,6 (sobre el techo).
   *
   * Que los dos caminos den 56 es lo que sostiene el valor; ninguno de los dos
   * por separado lo haría.
   *
   * ## LA CONDICIÓN BAJO LA QUE ESTA DERIVACIÓN ES VÁLIDA — declarada desde
   * la crítica externa #14 (2026-09-02)
   *
   * El factor de realización 0,92 no es una propiedad de la tipografía: es
   * una propiedad del ALGORITMO DE CORTE con el que se midió, el corte
   * *greedy* con bandera derecha (`text-align: start`, sin equilibrado), que
   * llena cada línea hasta donde cabe y desperdicia el hueco de la palabra
   * que no entra. **Esta derivación solo describe la realidad mientras la
   * prosa que consume este token NO lleve `text-wrap: balance`.**
   *
   * Por qué son incompatibles: `balance` no llena la caja, la reparte —
   * minimiza la línea más larga sin cambiar el número de líneas — así que el
   * ancho deja de ser la restricción activa. Medido por el evaluador de Craft
   * en la #14, A/B en navegador real sobre los MISMOS nodos y esta MISMA caja
   * de 56ch:
   *
   *   con equilibrado:  53,5 caracteres de media; 2 de 11 líneas en 60-75
   *   sin equilibrado:  64,5 caracteres de media; 10 de 11 líneas en 60-75
   *
   * Eso explica, además, el resultado que la ola I no consiguió mover:
   * ensanchar la caja de 52ch a 56ch dejó la realización de la home clavada
   * en los mismos 59 caracteres que había medido la #13. No fue una
   * corrección insuficiente ni un error de la aritmética de arriba — con
   * equilibrado activo, el ancho extra se convierte en holgura al final de
   * cada línea, no en más caracteres. La caja no podía entregar lo que la
   * regla de reparto le impedía llenar.
   *
   * Desde la #14 (decisión D1 del dueño) `Typography` ya no aplica el
   * equilibrado a `body`/`bodySm`, así que la condición se cumple en todas
   * las superficies que pasan por ese componente. NO se cumple todavía en las
   * que declaran el equilibrado por su cuenta y ganan la cascada — `ScBody`
   * (`Contact.tsx`), `ScTagline` (`Hero.tsx`), `ScDeckIntroBody`/
   * `ScDeckPillarSubtitle`/`ScDeckPillarBody` (`story.deck.tsx`) y
   * `ScJourneyIntroBody`/`ScJourneyStepSubtitle` (`journey.deck.tsx`):
   * mientras sigan equilibrando, este token acota su ancho pero no describe
   * su recuento. Queda declarado, no resuelto desde aquí.
   *
   * ## Lo que este token NO puede prometer, y por qué se dice aquí
   *
   * El contrato es por SUPERFICIE (el rango de una superficie de prosa entra
   * en 60-75), **no por LÍNEA**. No es una rebaja cómoda: es que la versión
   * por línea es aritméticamente imposible. La línea más corta que midió el
   * integrador en la home fueron 54 caracteres a 52ch; exigirle 60 obligaría a
   * V ≥ 57,8ch, y el techo de las legales exige V ≤ 56,5ch — conjunto vacío.
   * Con bandera derecha ninguna medida de línea puede garantizar un suelo
   * POR LÍNEA: la línea anterior a una palabra larga siempre se queda corta.
   *
   * La otra mitad de lo mismo: home y legales realizan ~15 % distinto DENTRO
   * DE LA MISMA CAJA (párrafos cortos contra párrafos largos, y texto con más
   * o menos versales dentro del rango de ratio 1,204-1,309). Ese spread es
   * mayor que la corrección que este token aplica, así que ningún valor único
   * centra las dos superficies a la vez en 65: se elige el que mete a las dos
   * dentro de la banda, con la home — la que realizaba peor — despegada del
   * suelo.
   *
   * AVISO a quien pase por aquí después: ni "65ch" ni "52ch" son el valor
   * correcto, y por motivos OPUESTOS. 65ch es la promesa escrita en la unidad
   * equivocada — realizaría 75,3 por el camino (A) y hasta 86 en las legales
   * por el (B), fuera del techo por los dos; 52ch es la promesa dividida solo
   * por la capacidad, y la home MIDIÓ 59 con él, bajo el suelo. Si algún día
   * cambia la tipografía de cuerpo hay que volver a medir LAS DOS cosas —el
   * ratio de capacidad Y el factor de realización—, y las dos solo se miden en
   * un navegador contando caracteres con `Range.getClientRects()` sobre líneas
   * llenas: jsdom no hace layout, así que ningún test de este repo puede
   * observar la realización. El candado del valor, de la banda y de la
   * promesa vive en `system.test.ts`.
   */
  prose: "56ch",
  /*
   * AQUÍ VIVIÓ `proseTight: "34ch"` — "medida corta para subtítulos: dos
   * líneas legibles de un vistazo". RETIRADO en la crítica externa #13
   * (2026-08-18) tras un censo propio de consumidores, con los cuatro
   * patrones que exige este fichero (con punto, con corchete, por
   * desestructuración y por alias local de `theme.data`, el punto ciego que
   * un censo anterior sí tuvo) más la comprobación de que nadie lee `grid`
   * de forma dinámica (`grid[...]`, `...grid`, `Object.keys/values/entries`
   * sobre `grid`): **cero usos en `src/` y en `app/`**. Sus únicas
   * apariciones en todo el repo eran su declaración, el contrato de
   * `system.test.ts`, una línea de `DESIGN.md` que dice que no tiene
   * consumidores, y un comentario de `Hero.tsx` que dice explícitamente que
   * el subtítulo ya NO lo consume.
   *
   * POR QUÉ AHORA Y NO EN LA #10, que ya midió el mismo cero y lo conservó:
   * porque lo que aquel docblock ofrecía como motivo para conservarlo era él
   * mismo. "Tiene un DESTINO escrito aquí" y "su docblock es la propia
   * decisión de conservarlo" son la misma frase dicha dos veces — un token
   * que se justifica citándose a sí mismo no tiene evidencia externa, tiene
   * inercia. Contrástese con `space[10]`, que en esta misma ola SÍ se
   * conserva y por eso mismo: su destino no lo declara él, lo declara una
   * casilla todavía abierta de `docs/qa-3d-pendiente.md` que lo nombra por su
   * nombre. Ese es el listón, y `proseTight` no lo pasaba: ni un consumidor,
   * ni una reserva en `DESIGN.md`, ni un pendiente que lo nombre.
   *
   * Y hay un motivo de fondo, el mismo que retiró `columns`/`gutter` (ver el
   * docblock de `containerMax`): el token DESCRIBÍA UNA PIEZA QUE NO EXISTE.
   * Prometía la medida de un subtítulo de dos líneas, y el único subtítulo
   * que lo justificó nunca lo leyó — hoy consume `heroCopyMax`, el tope de la
   * columna entera del hero. Un token que promete gobernar algo que gobierna
   * otro es peor que uno que solo sobra: invita a "recalibrarlo" contra una
   * medida real que no es la suya.
   *
   * Mismo criterio y mismo precedente que `motion.duration.ambient` (commit
   * `3734fd0`), `space.px`/`zIndex.max` (commit `1c707b3`) y `columns`/
   * `gutter` (crítica externa #9). El recuento de claves de `system.test.ts`
   * BAJA de 6 a 5 en el mismo cambio, nunca se afloja (regla 40).
   */
} as const;
