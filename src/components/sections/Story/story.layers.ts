/**
 * Constantes de arte de Story ("Why VoidToInfinite"), tema claro.
 *
 * Mismo precedente que `aura.layers.ts`/`eye.layers.ts`: los colores propios
 * de esta sección NO entran en los tokens semánticos del sistema (D10, spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §2) —
 * son literales decorativos de UNA composición concreta, no roles de UI que
 * deban cambiar con el tema (Story solo se monta en tema claro, vía
 * `HomeSections`). Se copian VERBATIM del mockup aprobado
 * (`Landing v2.dc.html`, sección `#story`, líneas 70-101) y se citan aquí con
 * su línea de origen para que un futuro retoque compare contra la fuente, no
 * contra un número sin contexto.
 *
 * Los colores que SÍ resuelven a un rol de token existente (bordes ->
 * `semantic.border`, kicker -> `semantic.brandText`, numeración de pilares ->
 * pasos de `palette.primary`/`palette.secondary`) se referencian directamente
 * desde `Story.tsx` contra el tema, sin duplicarlos aquí — mismo criterio que
 * ya aplica `Hero.tsx`/`BrandName.tsx` (p. ej. `theme.data.palette.secondary[300]`
 * en `ctaGlow`).
 */

/**
 * Halo radial detrás de la figura (mockup L73): dos paradas de alfa
 * decreciente sobre un violeta/azul frío, disuelto en `transparent` al 72%.
 * Los tres hue (`275`, `260`) no coinciden con los hue de marca del sistema
 * (`235.851` primary, `311.928` secondary), así que no es sustituible por un
 * paso de `palette.*`: es un degradado propio de esta pieza de arte.
 */
export const STORY_HALO_GRADIENT =
  "radial-gradient(circle at 55% 55%, oklch(0.9 0.05 275 / 0.55) 0%, oklch(0.93 0.03 260 / 0.3) 45%, transparent 72%)";

/**
 * Degradado de texto de "to creation." (mockup L78, tema claro): tres
 * paradas propias (`235`, `255`, `290`), distintas de los hue de
 * `palette.primary`/`palette.secondary`. A diferencia del titular del hero
 * (`heroGradient`, `BrandName.tsx`), este NO anima — el mockup no le aplica
 * `vtiGradientShift` a este span, solo al `ToInfinite` del hero — así que se
 * declara estático. Renombrado con sufijo `_LIGHT` (2026-07-29) al añadir la
 * variante oscura de abajo — incluida en la rama clara de `Story.tsx`.
 */
export const STORY_ACCENT_GRADIENT_LIGHT =
  "linear-gradient(110deg, oklch(0.56 0.14 235), oklch(0.7 0.15 255), oklch(0.72 0.15 290))";

/**
 * Variante oscura del degradado de texto (spec 2026-07-29 D10): MISMA familia
 * de hue (235/255/290) que la versión clara, con luminosidad mucho mayor
 * (0.78–0.86 en vez de 0.56–0.72) para que el `background-clip: text` siga
 * siendo legible sobre el negro-violeta de `StoryCosmicBeing`
 * (`STORY_COSMIC_BEING_VOID`, `#05010e`). No hay mockup oscuro de esta
 * sección — el spec señala explícitamente que estas paradas se verifican a
 * ojo en el paso de verificación en navegador, no con un contraste medido
 * (el helper `contrast.ts` del repo solo resuelve colores planos, no
 * degradados de texto).
 */
export const STORY_ACCENT_GRADIENT_DARK =
  "linear-gradient(110deg, oklch(0.78 0.13 235), oklch(0.82 0.13 255), oklch(0.86 0.12 290))";

/**
 * Ancho máximo del CONTENIDO de cada diapositiva de la presentación (D11,
 * spec `2026-07-31-story-deck-hero-transition-design.md`). Mismo valor
 * `1280px` que ya declaraba esta constante, pero cambia lo que acota: hasta
 * esta entrega ceñía la SECCIÓN entera (`ScStory`) a una caja centrada;
 * ahora la escena `StoryCosmicBeing` va a sangre (llena el stage a
 * `100vw`/`100vh`, D7) y es el deck de cada diapositiva quien queda acotado
 * a este ancho mientras la escena de fondo lo ignora. No se crea un token
 * nuevo en `grid.*`: el valor ya existía con este nombre en el propio
 * archivo de la sección, solo cambia a qué se aplica.
 */
export const STORY_DARK_MAX_WIDTH = "1280px";

/**
 * Alto de UNA diapositiva de la presentación, a pantalla completa (D12): el
 * encargo pide que la presentación ocupe "el ancho y alto de la vista del
 * dispositivo", así que pasa de `90dvh` a `100dvh`. El resto de secciones
 * oscuras (Aura, Eye…) se quedan deliberadamente en `90dvh`: la divergencia
 * es exclusiva de Story porque es la única sección que se convierte en
 * presentación a pantalla completa, no un ajuste que deba propagarse al
 * resto de la página.
 */
export const STORY_DARK_HEIGHT = "100dvh";

/**
 * Número de diapositivas de la presentación: 1 intro (kicker + h2 + body) +
 * 4 pilares (`learn`/`create`/`grow`/`practice`) + 1 nota de cierre = 6, tal
 * cual pide el encargo. Se declara como constante — y no como un `.length`
 * derivado en el componente — porque el hook `useSlideDeck` la necesita
 * como parámetro de entrada sin importar nada de esta sección (así puede
 * gobernar otra presentación el día de mañana).
 */
export const STORY_SLIDES = 6;

/**
 * Zona de "hold" al final de la pista (D3/D5, spec
 * `2026-08-02-journey-overlay-transition-design.md`), en pantallas: el tramo
 * final durante el cual el `stage` sigue pegado (`position: sticky`), la
 * presentación ya ha terminado de recorrer sus diapositivas y lo ÚNICO que
 * ocurre en ese tramo es que la sección Journey sube por encima
 * superponiéndose (D2 de ese mismo spec). Sin esta zona el solape de Journey
 * se comería el recorrido de la última diapositiva: Journey empezaría a
 * taparla mientras todavía está activa.
 *
 * Tiene que valer EXACTAMENTE lo mismo que el solape de Journey
 * (`JOURNEY_OVERLAY_RISE`, `journey.layers.ts`): si el hold es más corto que
 * el solape, queda una banda de fondo de Story sin tapar entre las dos
 * secciones; si es más largo, el `stage` se despega antes de que Journey
 * termine de cubrir el viewport y se ve el borde inferior de Story desnudo.
 * Las dos constantes viven en ficheros de datos distintos (acoplarlas
 * importando una desde la otra mezclaría los datos de dos secciones que no
 * se conocen entre sí), así que la igualdad NO se declara aquí en prosa: la
 * ata un test que importa las dos (`Journey.test.tsx`, invariante D5).
 */
export const STORY_DECK_TAIL_SCREENS = 1;

/**
 * Alto total de la pista que da recorrido de scroll a la presentación
 * entera (D2): con el `stage` pegado por `position: sticky`, cada
 * `100dvh` adicional de pista es exactamente un tramo de scroll dedicado a
 * una diapositiva. Sin esta altura la pista mediría lo mismo que el stage
 * y el pin se despegaría en el mismo frame en que se pega, sin dar tiempo
 * a recorrer nada.
 *
 * Suma `STORY_DECK_TAIL_SCREENS` (D3): las diapositivas siguen repartiéndose
 * `STORY_SLIDES` pantallas de recorrido (ver `tailScreens` en
 * `useSlideDeck.ts`, que resta esa misma cola del `span` antes de derivar el
 * progreso), y la pantalla añadida encima es, exclusivamente, la zona de
 * hold en la que Journey se superpone.
 */
export const STORY_DECK_TRACK_HEIGHT = `calc((${STORY_SLIDES} + ${STORY_DECK_TAIL_SCREENS}) * ${STORY_DARK_HEIGHT})`;

/**
 * Desplazamiento vertical de entrada/salida de cada diapositiva
 * (`data-state="past"`/`"next"`). Pequeño a propósito: suficiente para que
 * el cambio de diapositiva se lea como un paso, no como un salto de layout;
 * solo se anima junto a `opacity`, nunca una propiedad que dispare reflow
 * (regla de la casa: solo `transform`/`opacity`).
 */
export const STORY_SLIDE_SHIFT = "40px";

/**
 * Escala del `stage` cuando `--story-enter` vale 0, es decir, antes de que
 * la presentación empiece a abrirse. Un valor cercano a 1 (no 0, no un
 * encogimiento drástico) para que la apertura se lea como "la escena se
 * expande hasta llenar la pantalla" y no como una animación de entrada
 * genérica; el mismo valor, invertido, es la forma en que la presentación
 * "se cierra" con carácter de rewind al subir de vuelta al Hero.
 */
export const STORY_STAGE_ENTER_SCALE = 0.92;

/**
 * Recorrido (en `transform`) del envoltorio de la escena a lo largo de
 * `--story-progress` (D10). Con el stage pegado, `rect.top` de la escena se
 * queda en ~0 por definición, así que el término de scroll de
 * `useSceneParallax` no aporta profundidad durante el pase de
 * diapositivas — comportamiento correcto, no un bug a compensar tocando
 * ese hook (arriesgaría Journey/Features/Contact, que lo comparten). Este
 * desplazamiento, pequeño y solo en el envoltorio, devuelve esa sensación
 * de profundidad sin tocar el parallax compartido.
 *
 * En `dvh`, NO en `%`, y esto no es un detalle de estilo: un porcentaje en
 * `translateY` se resuelve contra la altura del PROPIO elemento, mientras que
 * el mismo porcentaje en `top`/`bottom` se resuelve contra la del CONTENEDOR.
 * Con el envoltorio sobredimensionado (ver `ScSceneWrap`) esas dos alturas ya
 * no coinciden, así que la sobredimensión y el traslado se calcularían contra
 * referencias distintas y quedaría un borde descubierto — que es exactamente
 * el bug que esta unidad cierra: la escena se iba 48px hacia abajo al
 * scrollear y dejaba una banda de fondo plano asomando por arriba.
 * `dvh` es la misma referencia para los dos.
 */
export const STORY_SCENE_DEPTH_SHIFT = "6dvh";

/**
 * Duración del "scrub" de rewind (`data-dir="rewind"`): el micro-desplazamiento
 * en X + caída breve de opacidad que hace que invertir el sentido se lea
 * como cinta rebobinando y no como "ir hacia atrás despacio". Atada al
 * valor de `motion.duration.slow` (verificado por test) para no introducir
 * una duración fuera de la escala de movimiento del tema.
 */
export const STORY_SCRUB_MS = 320;

/** Fondo/borde/sombra de la tarjeta flotante de nota (mockup L98). */
export const STORY_CARD_BG = "oklch(0.97 0.018 260)";
export const STORY_CARD_BORDER = "oklch(0.88 0.04 255)";
/** Color de sombra; la geometría (offset/blur) vive junto al selector que la usa. */
export const STORY_CARD_SHADOW = "oklch(0.6 0.1 265 / 0.18)";

/**
 * Geometría de la figura (mockup L74): lienzo 375×548, fuera de la escala de
 * `space`/`grid` porque es el tamaño de UNA imagen concreta, no una medida de
 * layout reutilizable (mismo criterio que `AURA_ORB_SIZE`/`EYE_PUPIL_SIZE`).
 */
export const STORY_FIGURE_WIDTH = "375px";
export const STORY_FIGURE_HEIGHT = "548px";
export const STORY_FIGURE_ASPECT = "375 / 548";

/** Expansión del halo más allá del marco de la figura (mockup L73: `inset: -30px`). */
export const STORY_HALO_INSET = "-30px";

/**
 * Flotación (mockup: keyframe `vtiFloat6`, definido en el `<style>` de
 * cabecera del mockup — `translateY(0)` en 0%/100%, `translateY(-6px)` en
 * 50%). La figura (L74) y la tarjeta de nota (L98) comparten el MISMO
 * keyframe con duraciones distintas: 9s la figura, 7s la tarjeta.
 */
export const STORY_FLOAT_AMPLITUDE = "-6px";
export const STORY_FIGURE_FLOAT_MS = 9000;
export const STORY_CARD_FLOAT_MS = 7000;

/**
 * Amplitud del desplazamiento de scroll (D1, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`) de
 * la FIGURA y de la tarjeta de nota en tema CLARO, ligado a
 * `--story-progress` -- el termino de TRAVESIA que publica
 * `useSectionProgress` sobre `ScStory` (0 al asomar la seccion por el borde
 * inferior del viewport, 1 al abandonarla por arriba).
 *
 * Van en un elemento ENVOLVENTE (`ScFigureShift`/`ScNoteShift`, Story.tsx),
 * nunca en `ScFigureImg`/`ScNoteCard` mismos: los dos YA animan `transform`
 * con `@keyframes` (la flotacion, `STORY_FLOAT_AMPLITUDE` arriba) y una
 * `@keyframes` sobre una propiedad gana SIEMPRE frente a cualquier otro
 * valor de esa misma propiedad en el MISMO elemento -- transicion o
 * declaracion estatica -- mientras la animacion esta activa
 * (task/lessons.md, 2026-07-26: "Una @keyframes sobre una propiedad impide
 * que su transition llegue a existir"; el mismo bloqueo alcanza a un
 * `transform` estatico, no solo a una `transition`, porque la animacion
 * sustituye el valor computado de la propiedad durante todo su ciclo -- los
 * dos son "otro valor de la misma propiedad"). El desplazamiento de scroll,
 * en el envoltorio, compone visualmente con la flotacion del hijo -- dos
 * `transform` en dos elementos anidados se suman sin pisarse -- sin tocar la
 * propiedad que la animacion ya posee.
 *
 * Sentidos OPUESTOS a proposito (figura hacia arriba, tarjeta hacia abajo):
 * son dos "planos" decorativos de la misma composicion, y moverse en
 * direcciones distintas -- no solo a velocidades distintas -- es lo que se
 * lee como profundidad (D1 del encargo: "que cada seccion tenga algo que
 * mirar mientras pasa"). Magnitud en decenas de pixeles (encargo del
 * usuario, no cientos): un desplazamiento sutil, perceptible sin competir
 * con el propio contenido.
 */
export const STORY_FIGURE_SCROLL_SHIFT = "-28px";
export const STORY_NOTE_SCROLL_SHIFT = "18px";

/**
 * `sizes` de la figura: se muestra a un ancho fijo de 375px desde `lg` en
 * adelante (mismo punto de corte que el resto del sitio,
 * `theme.data.breakPoint.lg`) y a un ancho fluido por debajo, cuando la
 * sección cae a columna única. Con solo dos pistas publicadas (640w/1024w,
 * spec §6), declarar más ancho del real en el tramo estrecho haría que un
 * móvil de DPR alto se llevase igualmente la pista de 1024px — el mismo
 * razonamiento que ya documenta `AURA_SIZES`.
 */
export const STORY_FIGURE_SIZES =
  "(min-width: 992px) 375px, (min-width: 600px) 60vw, 90vw";

/**
 * Escala tipográfica de la presentación oscura (spec
 * `2026-07-31-story-deck-tipografia-design.md` §3, T4/T5). Cinco roles, cinco
 * constantes: `h2` de la intro, título de pilar, subtítulo de pilar, cuerpo de
 * pilar y nota de cierre. Viven aquí y no como literales en `story.deck.tsx`
 * ni como tokens nuevos de `type.scale` porque son medidas de ESTA
 * composición (un cartel a pantalla completa), no de la escala de texto del
 * sitio: 4rem/3rem/8rem no tienen equivalente en `type.scale` y forzarlos ahí
 * contaminaría un contrato que otras secciones también consumen.
 *
 * Todas salvo el subtítulo se declaran como `clamp(mínimo, preferido-en-vw,
 * máximo)` en vez de con `@media`: un término en `vw` escala de forma
 * continua en todo el ancho de viewport, sin el salto brusco que un `@media`
 * produce justo en el breakpoint — que es precisamente lo que un tamaño de
 * 8rem necesita para no partirse en un ancho intermedio cualquiera. Además
 * evita declarar un bloque `@media` distinto por cada uno de los cinco
 * tamaños. El máximo de cada `clamp()` es, en los cinco casos, el valor
 * literal que pide el encargo del usuario (4rem/3rem/1rem/1.115rem/8rem):
 * no se ha redondeado ni ajustado ninguno.
 */

/**
 * `h2#story-title` de la diapositiva de intro. Tope 4rem (encargo). Mínimo
 * 2rem: por debajo de eso el titular de una diapositiva a pantalla completa
 * se queda del tamaño de un párrafo y pierde el peso de "cartel" que pide la
 * composición.
 */
export const STORY_DECK_TITLE_SIZE = "clamp(2rem, 6vw, 4rem)";

/**
 * Título de cada diapositiva de pilar (`01 —`…`04 —` + nombre del pilar).
 * Tope 3rem (encargo). Mínimo 1.75rem: un escalón por debajo del título de
 * intro, para que la jerarquía visual intro > pilar se conserve también en
 * el extremo estrecho del `clamp`.
 */
export const STORY_DECK_PILLAR_TITLE_SIZE = "clamp(1.75rem, 5vw, 3rem)";

/**
 * Subtítulo de la diapositiva de pilar (el texto que hoy vive en
 * `pillars.<key>.body`, pintado en rol de subtítulo — T2 de la spec). Es la
 * ÚNICA de las cinco constantes sin `clamp`: 1rem ya es el tamaño base de
 * lectura del sitio, así que no hay margen para encogerlo sin caer por
 * debajo del mínimo cómodo de lectura; un `clamp` aquí solo introduciría una
 * variación que el encargo no pide y que perjudicaría la legibilidad en
 * viewports estrechos.
 */
export const STORY_DECK_PILLAR_SUBTITLE_SIZE = "1rem";

/**
 * Cuerpo de la diapositiva de pilar: el texto de inspiración nuevo
 * (`pillars.<key>.inspiration`). Tope 1.115rem (encargo). Mínimo 1rem: el
 * mismo suelo de lectura que el subtítulo, para que el párrafo de cuatro
 * frases nunca quede por debajo del tamaño base del sitio en un móvil
 * estrecho.
 */
export const STORY_DECK_PILLAR_BODY_SIZE = "clamp(1rem, 1.4vw, 1.115rem)";

/**
 * Nota de cierre (diapositiva 6). Tope 8rem (encargo): el tamaño de cartel
 * más grande de la presentación. Mínimo 2.5rem: por debajo de eso la nota
 * deja de leerse como el cierre climático de la presentación y se confunde
 * con el resto del texto de la diapositiva.
 */
export const STORY_DECK_NOTE_SIZE = "clamp(2.5rem, 11vw, 8rem)";

/**
 * Peso de la nota de cierre (encargo 2026-07-31). **Excepción deliberada a
 * `type.scale`**, que se detiene en 800 (`display`): ninguna variante del
 * sistema declara 900, y añadirlo allí tocaría un contrato cerrado que
 * consumen todas las secciones para servir a UNA pieza.
 *
 * El 900 es real, no una negrita sintética: `app/layout.tsx` carga
 * `Hanken_Grotesk` por `next/font/google` SIN lista de `weight`, lo que trae
 * el eje variable completo (100–900) de la familia. Si algún día se fijara
 * una lista de pesos concreta en esa carga, este valor caería a la negrita
 * falsa que sintetiza el navegador — de ahí que quede escrito aquí.
 */
export const STORY_DECK_NOTE_WEIGHT = 900;

/**
 * Hueco extra a la DERECHA del contenido de la diapositiva, solo en
 * dispositivos grandes (encargo 2026-07-31). Rompe a propósito la simetría
 * del `padding-inline` del deck: desplaza la columna de texto hacia la
 * izquierda y deja respirar el lado por el que la escena "Cosmic Being"
 * tiene su figura y su núcleo luminoso, en vez de que el texto compita con
 * ellos por el mismo eje.
 *
 * Se aplica con `@media` y no con un `clamp`, al revés que los cinco tamaños
 * de arriba: aquí no se busca una escala continua sino un cambio de
 * COMPOSICIÓN que solo tiene sentido cuando hay ancho de sobra — por debajo
 * del breakpoint, 8rem de hueco muerto estrangularían la medida de lectura.
 */
export const STORY_DECK_PADDING_INLINE_END = "8rem";
