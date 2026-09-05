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
import { DECK_SLIDE_TRAVEL } from "@/hooks/useSlideDeck";
import { AMBIENT, DECK } from "@/motion/vocabulary";
import { grid } from "@/theme/tokens/grid";
import { motion } from "@/theme/tokens/motion";
import { type as typeTokens } from "@/theme/tokens/type";

/**
 * Halo radial detrás de la figura (mockup L73): dos paradas de alfa
 * decreciente sobre un violeta/azul frío, disuelto en `transparent` al 72%.
 * Los tres hue (`275`, `260`) no coinciden con los hue de marca del sistema
 * (`235.851` primary, `311.928` secondary), así que no es sustituible por un
 * paso de `palette.*`: es un degradado propio de esta pieza de arte.
 */
export const STORY_HALO_GRADIENT =
  "radial-gradient(circle at 55% 55%, oklch(0.9 0.05 275 / 0.55) 0%, oklch(0.93 0.03 260 / 0.3) 45%, transparent 72%)";

/*
 * AQUI VIVIERON STORY_ACCENT_GRADIENT_LIGHT/_DARK, el degradado de texto de
 * "to creation." (mockup L78). Retirados en Task 12 (dieta de ornamento B,
 * auditoria premium 2026-08-08, 2026-08-09): `ScAccent` (Story.tsx) pasa a
 * color solido (`semantic.brandText`, el mismo rol que `ScKicker` ya usa en
 * esta seccion) para poder medir su contraste con `contrast.ts` -- un
 * degradado de texto no es medible, y por eso nunca se habia medido (ver el
 * docblock que traian estas dos constantes, verbatim antes de este borrado:
 * "estas paradas se verifican a ojo... el helper contrast.ts del repo solo
 * resuelve colores planos"). Medicion completa en el docblock de `ScAccent`,
 * Story.tsx, y en Story.test.tsx, describe "Task 12".
 */

/**
 * Ancho máximo del CONTENIDO de cada diapositiva de la presentación (D11,
 * spec `2026-07-31-story-deck-hero-transition-design.md`). Mismo valor
 * `1280px` que ya declaraba esta constante, pero cambia lo que acota: hasta
 * esta entrega ceñía la SECCIÓN entera (`ScStory`) a una caja centrada;
 * ahora la escena `StoryCosmicBeing` va a sangre (llena el stage a
 * `100vw`/`100vh`, D7) y es el deck de cada diapositiva quien queda acotado
 * a este ancho mientras la escena de fondo lo ignora.
 *
 * DESDE LA CRÍTICA EXTERNA #12 (2026-08-19) EL NÚMERO NO VIVE AQUÍ: deriva de
 * `grid.sectionMax`, el token que nombra el ancho de contenido de las
 * secciones que componen a sangre completa. El valor resultante es EXACTAMENTE
 * el mismo (1280px) — nombrar una medida repetida es refactor de vocabulario,
 * no rediseño —, así que el CSS renderizado no cambia ni un carácter. Lo que
 * cambia es que este fichero deja de ser una de las cuatro copias del mismo
 * número (regla 13 de `RULES.md`). El docblock de esta constante decía hasta
 * hoy que "no se crea un token nuevo en `grid.*`" porque el valor ya existía
 * aquí: ese razonamiento es justo el que la crítica #12 desmonta — el mismo
 * número vivía a mano en CUATRO secciones y en dos lecturas de `grid.navMax`,
 * que es un tope de la píldora del navbar y no de una sección.
 *
 * La constante NO se retira en favor de leer el token directamente desde
 * `story.deck.tsx`: sigue siendo el nombre con el que ESTA sección se refiere
 * a su propio tope de contenido, y conservarla deja el día de mañana abierto a
 * que Story diverja del resto sin tocar a nadie más. Mismo patrón, mismas
 * palabras y misma ola que `FEATURES_CONTENT_MAX_WIDTH`
 * (`features.layers.ts`) y `CONTACT_CONTENT_MAX_WIDTH`
 * (`contact.layers.ts`). El candado de que el número no vuelva a escribirse a
 * mano se observa en la FUENTE (`Story.test.tsx`), porque token y literal
 * resuelven a la misma cadena y ningún candado de valor puede distinguirlos
 * (`task/lessons.md`, 2026-08-12).
 */
export const STORY_DARK_MAX_WIDTH = grid.sectionMax;

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
 * entera (D2): con el `stage` pegado por `position: sticky`, cada tramo de
 * pista que sobra por encima del alto del stage es scroll que la
 * presentación puede repartir entre sus diapositivas. Sin esta altura la
 * pista mediría lo mismo que el stage y el pin se despegaría en el mismo
 * frame en que se pega, sin dar tiempo a recorrer nada.
 *
 * La fórmula tiene TRES términos, y cada uno paga una cosa distinta:
 *
 * - `(STORY_SLIDES - 1) * DECK_SLIDE_TRAVEL` — el recorrido de la
 *   presentación. Son los HUECOS entre diapositivas, no las diapositivas:
 *   con 6 paradas hay 5 saltos, que es exactamente el reparto que
 *   `useSlideDeck` hace al derivar `index = round(progress * (slides - 1))`.
 * - `1 * STORY_DARK_HEIGHT` — la pantalla que ocupa el propio stage pegado.
 *   `useSlideDeck` la resta del `span` (`measure()`), así que no es
 *   recorrido: es el alto de lo que se ve.
 * - `STORY_DECK_TAIL_SCREENS * STORY_DARK_HEIGHT` (D3) — la zona de hold en
 *   la que la presentación ya terminó y Journey sube superponiéndose. El
 *   hook también la resta del `span`.
 *
 * CAMBIÓ DE FORMA EN LA CRÍTICA EXTERNA #16 (2026-09-03, decisión del dueño).
 * Hasta esta ola decía `calc((STORY_SLIDES + STORY_DECK_TAIL_SCREENS) *
 * STORY_DARK_HEIGHT)` — 7 pantallas — porque el recorrido por diapositiva
 * era, sin nombrarlo, una pantalla entera. La #16 midió que Story y Journey
 * juntos eran el 88 % de un documento oscuro de 16.376 px frente a 6.558 en
 * claro, y el dueño decidió recortar ese recorrido a la mitad. Al nombrarlo
 * (`DECK_SLIDE_TRAVEL`, `useSlideDeck.ts`) la fórmula deja de poder escribirse
 * como un múltiplo de pantallas: los tres términos tienen unidades distintas
 * de verdad, y confundirlos era justo lo que hacía parecer que recortar el
 * recorrido obligaba a tocar la cola. No obliga — ver el docblock de
 * `JOURNEY_DECK_TAIL_SCREENS`, que rehace las dos costuras del relevo con
 * este término dentro y comprueba que se cancela.
 *
 * La pista pasa de 7 pantallas a 4,5 (2,5 de recorrido + 1 de stage + 1 de
 * cola): 5.600 → 3.600 px a 1280×800, y 6.300 → 4.050 px a 1440×900.
 */
export const STORY_DECK_TRACK_HEIGHT = `calc(${STORY_SLIDES - 1} * ${DECK_SLIDE_TRAVEL} + (1 + ${STORY_DECK_TAIL_SCREENS}) * ${STORY_DARK_HEIGHT})`;

/**
 * Desplazamiento vertical de entrada/salida de cada diapositiva
 * (`data-state="past"`/`"next"`). Pequeño a propósito: suficiente para que
 * el cambio de diapositiva se lea como un paso, no como un salto de layout;
 * solo se anima junto a `opacity`, nunca una propiedad que dispare reflow
 * (regla de la casa: solo `transform`/`opacity`).
 *
 * Deriva de `DECK.slideShift` (fix wave D, hallazgo D2, 2026-08-12): hasta
 * esta revisión declaraba el literal `"40px"` a mano, DUPLICADO byte a byte
 * en `JOURNEY_SLIDE_SHIFT` (`journey.layers.ts`) -- el propio patrón
 * "literal repetido que debería ser token" que motivó crear
 * `src/motion/vocabulary.ts`. Mismo valor exacto, cero cambio visual; ver el
 * docblock de `DECK` en ese fichero para el detalle completo.
 */
export const STORY_SLIDE_SHIFT = DECK.slideShift;

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
 *
 * Deriva de `DECK.sceneDepthShift` (fix wave D, hallazgo D2, 2026-08-12):
 * hasta esta revisión declaraba el literal `"6dvh"` a mano, DUPLICADO byte a
 * byte en `JOURNEY_SCENE_DEPTH_SHIFT` (`journey.layers.ts`). Mismo valor
 * exacto, cero cambio visual; ver el docblock de `DECK` en
 * `src/motion/vocabulary.ts` para el detalle completo.
 */
export const STORY_SCENE_DEPTH_SHIFT = DECK.sceneDepthShift;

/**
 * Duración del "scrub" de rewind (`data-dir="rewind"`): el micro-desplazamiento
 * en X + caída breve de opacidad que hace que invertir el sentido se lea
 * como cinta rebobinando y no como "ir hacia atrás despacio". DERIVA de
 * `motion.durationMs.slow` (320) desde la crítica externa #14 (2026-09-02):
 * hasta esa ronda era el literal `320` "atado al valor de
 * `motion.duration.slow` (verificado por test)" -- atado por un TEST, no
 * derivado en código, que es exactamente la diferencia que mide la familia
 * `duration-const` del detector estrenada en esa misma ola. Cero cambio de
 * valor; el test de la escala se conserva como candado del número.
 */
export const STORY_SCRUB_MS = motion.durationMs.slow;

/*
 * AQUI VIVIERON `STORY_CARD_BG`/`STORY_CARD_BORDER`/`STORY_CARD_SHADOW`, el
 * chrome de la tarjeta flotante de nota (mockup L98). Retiradas el 2026-08-06
 * junto con la propia tarjeta: la nota de cierre de Story pasa a ser el
 * statement a pantalla completa (spec
 * `2026-08-06-story-features-tema-claro-design.md`, D12), que no usa
 * superficie ni borde propios. Se borran en vez de dejarlas exportadas sin
 * consumidor: tres literales de color huerfanos son justo lo que alguien
 * copia por costumbre el dia que necesita "una tarjeta" y reintroduce colores
 * fuera del tema.
 */

/**
 * Geometría de la figura (mockup L74): lienzo 375×548, fuera de la escala de
 * `space`/`grid` porque es el tamaño de UNA imagen concreta, no una medida de
 * layout reutilizable (mismo criterio que `AURA_ORB_SIZE`/`EYE_PUPIL_SIZE`).
 */
export const STORY_FIGURE_WIDTH = "450px";
export const STORY_FIGURE_HEIGHT = "548px";
export const STORY_FIGURE_ASPECT = "375 / 548";

/** Expansión del halo más allá del marco de la figura (mockup L73: `inset: -30px`). */
export const STORY_HALO_INSET = "0px";

/**
 * Flotación (mockup: keyframe `vtiFloat6`, definido en el `<style>` de
 * cabecera del mockup — `translateY(0)` en 0%/100%, `translateY(-6px)` en
 * 50%). La figura (L74) y la tarjeta de nota (L98) comparten el MISMO
 * keyframe con duraciones distintas: 9s la figura, 7s la tarjeta.
 */
export const STORY_FLOAT_AMPLITUDE = "-6px";
/**
 * El RITMO no lo declara esta seccion: lo lee del vocabulario (critica externa
 * #18, 2026-09-04). Hasta esa revision aqui habia un `9000` escrito a mano que
 * era `AMBIENT.floatMs` byte a byte -- mismo numero, mismo nombre ("float") y
 * mismo rol (un bucle ambiental infinito de una pieza decorativa), en dos
 * sitios que no se conocian. Regla 13 de `RULES.md`. Cero cambio de valor
 * renderizado: 9000 === 9000, y el candado de `story.layers.test.ts` lo mide.
 *
 * Lo que esta constante sigue haciendo, y por eso no se borra: es el NOMBRE
 * con el que Story habla de la flotacion de su figura. Deja de declarar el
 * valor, no de existir -- mismo desenlace que tuvo `STORY_SCRUB_MS` con
 * `motion.durationMs.slow` en la ola J.
 */
export const STORY_FIGURE_FLOAT_MS = AMBIENT.floatMs;
/* `STORY_CARD_FLOAT_MS` (7000) se retiro el 2026-08-06 con la tarjeta de nota
   (D12): la figura se queda como unica pieza que flota, asi que el keyframe ya
   no lo comparten dos duraciones. */

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
/* `STORY_NOTE_SCROLL_SHIFT` ("18px") se retiro el 2026-08-06 con la tarjeta de
   nota (D12). Con ella desaparece el SEGUNDO plano del desplazamiento: ya no
   hay dos piezas moviendose en sentidos opuestos, solo la figura. El docblock
   de arriba conserva el razonamiento porque sigue explicando por que la figura
   se mueve, aunque su pareja ya no exista. */

/**
 * `sizes` de la figura: se muestra a un ancho fijo de 375px desde 992px de
 * viewport en adelante y a un ancho fluido por debajo, cuando la sección cae a
 * columna única. Con solo dos pistas publicadas (640w/1024w, spec §6),
 * declarar más ancho del real en el tramo estrecho haría que un móvil de DPR
 * alto se llevase igualmente la pista de 1024px — el mismo razonamiento que ya
 * documenta `AURA_SIZES`.
 *
 * ESE 992px COINCIDE CON `theme.data.breakPoint.lg` SOLO A LA RAÍZ DE FÁBRICA,
 * y desde el commit `ecfb6e8` (2026-09-05) hay que decirlo así: `lg` pasó a
 * declararse en `em` (`62em`) para que responda a la preferencia de tamaño de
 * texto del usuario, así que vale 992px con la raíz a 16px y 1984px con la
 * raíz a 32px. La equivalencia que este docblock afirmaba —"el mismo punto de
 * corte que el resto del sitio"— dejó de ser cierta ese día en el único caso
 * que importa, el del usuario que amplía el texto.
 *
 * Y `sizes` SE QUEDA EN PÍXELES A PROPÓSITO, no por olvido de aquella
 * migración: no es layout, es una ESTIMACIÓN del ancho al que se va a
 * renderizar la imagen, y el navegador la usa solo para elegir pista entre las
 * dos publicadas. La decisión ya está escrita como excepción explícita en el
 * docblock de `breakPoint` (`src/theme/themes.ts`: los `sizes` conservan sus
 * consultas en píxeles porque no son layout). El revisor de la ola R lo midió:
 * la pista que se sirve no cambia al ampliar el texto.
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
 * sitio: 3rem/8rem no tienen equivalente en `type.scale` y forzarlos ahí
 * contaminaría un contrato que otras secciones también consumen.
 *
 * CORREGIDO 2026-08-18 (crítica externa #11, hallazgo C): esta frase decía
 * "4rem/3rem/8rem". El 4rem sale de la lista porque resultó no ser una medida
 * de ESTA composición — `journey.layers.ts` declaraba exactamente el mismo
 * `clamp()`, byte a byte, para el mismo rol. Una medida que dos secciones
 * comparten ya no es de una sección, así que ese caso concreto SÍ es un
 * token, y `STORY_DECK_TITLE_SIZE` pasa a derivar de él. El criterio de la
 * frase no se retira: sigue rigiendo para los tamaños que no tienen ningún
 * consumidor fuera de Story.
 *
 * CORREGIDO OTRA VEZ 2026-09-02 (crítica externa #14): con el mismo criterio
 * salen de la lista DOS más, los dos por tener la misma medida escrita byte a
 * byte en `journey.layers.ts` — el 8rem de la nota de cierre
 * (`type.scale.deckClosing`) y el tramo `clamp(1rem, 1.4vw, 1.115rem)` del
 * cuerpo de pilar (`type.scale.deckBody`). De los cinco tamaños de cartel
 * originales quedan DOS que siguen siendo medidas de ESTA composición: el
 * título de pilar y el subtítulo de pilar. Y el titular de intro dejó además
 * de ser un tamaño de cartel: hoy es el `h2` del sistema (decisión D4 de esa
 * misma crítica).
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
 * `h2#story-title` de la diapositiva de intro. Es el `h2` del sistema, sin
 * tamaño propio: `type.scale.h2.size` (2rem = 32px), el mismo rango que ya
 * pintaban Features y Contact en las DOS ramas de tema y que Story y Journey
 * pintaban solo en la clara.
 *
 * TUVO TAMAÑO PROPIO HASTA LA CRÍTICA EXTERNA #14 (2026-09-02, decisión D4
 * del dueño: «un solo h2 dentro del oscuro»). El recorrido completo:
 * declaraba el literal `clamp(2rem, 6vw, 4rem)` hasta la #11 (2026-08-18),
 * que lo tokenizó como `type.scale.deckTitle` al encontrarlo escrito byte a
 * byte también en `JOURNEY_DECK_TITLE_SIZE`; la #14 midió que ese peldaño
 * pintaba el `<h2>` de Story y de Journey a 64px en oscuro mientras
 * Features/Contact pintaban el suyo a 32px en la misma página y el mismo
 * tema, y el dueño decidió bajar estas dos al rango de las otras dos. Con el
 * tamaño igualado, el peldaño se quedó siendo un duplicado exacto de `h2` y
 * se retiró; su docblock de despedida, con las dos mitades del porqué, vive
 * en el hueco que dejó dentro de `type.scale` (`src/theme/tokens/type.ts`).
 *
 * ESTO SÍ CAMBIA LO RENDERIZADO, al revés que la migración de la #11: por
 * encima de ~533px de viewport (donde `6vw` superaba las 2rem) el titular
 * pasa de hasta 64px a 32px fijos. Por debajo de ese ancho no cambia nada --
 * el mínimo del `clamp()` retirado ya era 2rem.
 *
 * Sigue siendo la excepción dentro del bloque de arriba en un sentido: es el
 * único de los cinco tamaños de cartel de Story que NO es una medida de esta
 * composición. Los otros cuatro siguen calibrados contra el texto real de
 * estas diapositivas; este viste un rango semántico de la página entera.
 */
export const STORY_DECK_TITLE_SIZE = typeTokens.scale.h2.size;

/**
 * Título de cada diapositiva de pilar. Acompañó a un numeral («01»…«04»)
 * hasta la crítica externa #19 (2026-09-04), en la que ese numeral se retiró
 * por decisión del dueño: el rail ya rotula la posición en la misma parada y
 * las dos cuentas nunca coincidían (ver el comentario de la diapositiva de
 * pilar en `Story.tsx`). Desde entonces el título abre la diapositiva.
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
 *
 * DEJA DE DECLARAR EL LITERAL (crítica externa #14, 2026-09-02, hallazgo P3):
 * el mismo `clamp(1rem, 1.4vw, 1.115rem)` estaba escrito byte a byte en
 * `JOURNEY_DECK_STEP_SUBTITLE_SIZE` (`journey.layers.ts`), cuyo docblock ya
 * afirmaba en prosa que era el mismo tramo para el mismo rol de lectura. Una
 * medida que dos secciones comparten no es una medida de sección (regla 13 de
 * `RULES.md`): pasa a derivar de `type.scale.deckBody`, el peldaño que la
 * escala del sistema estrena para el cuerpo de lectura de una diapositiva.
 *
 * El valor renderizado NO cambia: refactor de vocabulario, no rediseño.
 */
export const STORY_DECK_PILLAR_BODY_SIZE = typeTokens.scale.deckBody.size;

/**
 * Nota de cierre (diapositiva 6). Tope 8rem (encargo): el tamaño de cartel
 * más grande de la presentación. Mínimo 2.5rem: por debajo de eso la nota
 * deja de leerse como el cierre climático de la presentación y se confunde
 * con el resto del texto de la diapositiva.
 *
 * DEJA DE DECLARAR EL LITERAL (crítica externa #14, 2026-09-02, hallazgo P3):
 * el mismo `clamp(2.5rem, 11vw, 8rem)` estaba escrito byte a byte en
 * `JOURNEY_DECK_QUOTE_SIZE` (`journey.layers.ts`) para el mismo rol —el
 * cierre de un deck a sangre completa—, así que deriva de
 * `type.scale.deckClosing`. Ese peldaño REVISA a propósito la decisión T7 de
 * la spec de tipografía de Journey, que dejó las dos parejas coincidiendo sin
 * acoplarse; el porqué completo vive en su docblock (`tokens/type.ts`).
 *
 * El valor renderizado NO cambia: refactor de vocabulario, no rediseño.
 */
export const STORY_DECK_NOTE_SIZE = typeTokens.scale.deckClosing.size;

/**
 * Peso de la nota de cierre (encargo 2026-07-31). Fue durante trece meses una
 * **excepción deliberada a `type.scale`**, que se detenía en 800 (`display`):
 * ninguna variante del sistema declaraba 900 y añadirlo habría tocado un
 * contrato cerrado que consumen todas las secciones para servir a UNA pieza.
 * Su test dejaba escrito el punto de decisión: «si algún día alguien añadiera
 * un 900 a la escala, esta constante debería desaparecer en favor del token».
 *
 * ESE DÍA LLEGÓ EN LA CRÍTICA EXTERNA #14 (2026-09-02): al tokenizar el
 * TAMAÑO del cierre (arriba), el peldaño `deckClosing` recoge el paquete
 * entero que la pieza compone —tamaño, peso, interlineado y tracking—, y el
 * 900 pasa a estar dentro de la escala. La constante no desaparece, que es la
 * otra mitad de lo que el punto de decisión permitía: sigue siendo el nombre
 * con el que Story habla del peso de su cierre, pero deriva.
 *
 * El 900 es real, no una negrita sintética: `app/layout.tsx` carga
 * `Hanken_Grotesk` por `next/font/google` SIN lista de `weight`, lo que trae
 * el eje variable completo (100–900) de la familia. Si algún día se fijara
 * una lista de pesos concreta en esa carga, este valor caería a la negrita
 * falsa que sintetiza el navegador — de ahí que quede escrito aquí.
 */
export const STORY_DECK_NOTE_WEIGHT = typeTokens.scale.deckClosing.weight;

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
