/**
 * Constantes de arte de la sección Features (spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §7.3),
 * transcritas VERBATIM de `Landing v2.dc.html` (líneas 157-210, citadas en
 * cada bloque) — decisión D10 de la spec: los colores propios de estas
 * tarjetas no son tokens semánticos (no cambian con el tema; la sección solo
 * vive en claro) y viven aquí, no en `theme/tokens/`.
 *
 * Entrega 2026-08-06 (spec `2026-08-06-story-features-tema-claro-design.md`,
 * D4-D9): rehace la cabecera y las tres tarjetas de la rama CLARA sobre una
 * sección NUEVA del mismo `Landing v2.dc.html` (líneas 187-267, `<section
 * id="features">`), que sustituye a la versión con patrón SVG citada arriba.
 * Las constantes de ESA versión anterior que ya no describen ningún nodo del
 * árbol (patrón decorativo, borde/fondo/sombra por tarjeta) se retiraron; las
 * que siguen vigentes (radio del envoltorio, alto del CTA…) se actualizaron
 * a los literales de la sección nueva, con su docblock explicando la
 * sustitución.
 *
 * ## Qué SÍ es verbatim y qué es una equivalencia deliberada
 *
 * El mockup resuelve sus colores de rol (`var(--primary-600)`,
 * `var(--secondary-700)`…) contra una hoja de tokens externa
 * (`_ds/.../tokens/colors.css`) que NO está presente en el `.html` entregado
 * ni en ningún archivo local accesible — es un enlace relativo a un paquete
 * de herramienta de diseño que no se pudo resolver (protocolo de veracidad:
 * no se inventa el valor numérico de esa variable). Como el propio nombre de
 * paso (`primary-500`, `primary-600`, `primary-800`…) coincide exactamente
 * con la escalera `STEPS` de `theme/tokens/color.ts`, esos casos se resuelven
 * en el COMPONENTE contra el token real del tema
 * (`theme.data.palette.primary[600]`, etc.) en vez de fabricar aquí un
 * `oklch(...)` que nadie puede verificar. Lo que SÍ es un literal `oklch()`
 * o `#hex` escrito directamente en el `style` del mockup (bordes, fondos,
 * sombras, patrones decorativos, y los dos acentos de Gaming que no usan
 * `var()`) se transcribe tal cual en este archivo.
 */
import { grid } from "@/theme/tokens/grid";

export type FeatureKey = "learning" | "imagination" | "gaming";

export const FEATURE_KEYS: readonly FeatureKey[] = [
  "learning",
  "imagination",
  "gaming",
] as const;

/*
 * AQUÍ VIVIÓ `FEATURES_CARD_RADIUS` ("26px", el radio de esquina del
 * envoltorio de las tres tarjetas; D7/D8 de la spec
 * `2026-08-06-story-features-tema-claro-design.md`, mockup `Landing
 * v2.dc.html` L197/220/243). RETIRADA en la Task 23 (plan premium F1-F5):
 * decisión del dueño, tomada con capturas delante en la Fase 0 del plan, de
 * bajar el radio de 26px a 16px. A diferencia del valor anterior (que no
 * coincidía con ningún paso de `theme.tokens.radius` y por eso vivía aquí
 * como literal de arte), 16px SÍ coincide EXACTO con `radius.xl` (`1rem`)
 * -- el mismo token que `ScImagePanel` (Features.tsx) ya usa para el radio
 * del panel de imagen de estas mismas tarjetas. Mantener un literal de
 * escena que vale lo mismo que un token del sistema es la duplicación que
 * la regla 13 del manual (`RULES.md`) prohíbe ("una constante de valor
 * idéntico repetida... es un token de tema, no dos constantes de fichero"),
 * así que en vez de reescribir el valor aquí, `ScCardBorder`/`ScCardSurface`
 * (Features.tsx) pasan a consumir `theme.data.radius.xl` directamente y
 * este fichero deja de declarar ningún radio de tarjeta.
 *
 * El radio INTERIOR (la superficie blanca dentro del envoltorio) se sigue
 * calculando en el componente, ahora como
 * `calc(${theme.data.radius.xl} - ${FEATURES_CARD_BORDER_WIDTH})` (16px −
 * 1.8px = 14.2px) -- MISMA fórmula que antes (radio interior = radio
 * exterior − grosor del envoltorio-borde, la regla estándar de radios
 * anidados: se resta el hueco que separa los dos contornos, no una
 * proporción fija), así que se reaplica sola al bajar el radio exterior sin
 * que nadie tenga que recalcular nada. Nota de precisión sobre el valor
 * ANTERIOR: el docblock que este bloque sustituye citaba "26px − 1.5px =
 * 24.5px", pero `FEATURES_CARD_BORDER_WIDTH` llevaba ya en "1.8px" desde el
 * commit `7a2d2ac` (2026-08-08) -- el resultado real con ese grosor era
 * 24.2px, no 24.5px; ese docblock nunca se actualizó tras aquel cambio. Se
 * corrige aquí en vez de arrastrar la cifra equivocada a la nueva nota.
 */

/** Grosor del envoltorio-borde de la tarjeta (D7, mockup L197: `padding:
 *  1.5px`): el envoltorio pinta su fondo (color-mix en reposo, cónico en
 *  hover) y ese fondo asoma exactamente este grosor alrededor de la
 *  superficie interior. */
export const FEATURES_CARD_BORDER_WIDTH = "1.8px";

/*
 * FEATURES_CTA_TRANSITION_MS (mockup L176/191/206: transition: transform
 * 150ms ..., color 150ms ...) RETIRADA en Task 9 (craft de interacción,
 * punto 3 del brief): el transform del CTA (translateX en hover, scale en
 * el :active nuevo) pasa a vocabulary.PRESS.durationMs (100ms) +
 * PRESS.easing -- la misma entrada gobierna hover-lift Y press, y CSS no
 * admite dos duraciones para una sola propiedad en la misma lista. El 150ms
 * verbatim del mockup ya no tiene ningún consumidor: color, que compartía
 * el literal, pasa a motion.duration.fast (100ms) + motion.easing.standard
 * -- mismo criterio que Button.tsx aplica a su background-color (no es una
 * primitiva de press, se queda con el token de paint estándar). Verificado
 * (grep del repo, informe de la tarea): ningún fichero fuera de
 * Features.tsx importaba esta constante.
 */

/** Desplazamiento horizontal del CTA en hover, igual en las tres tarjetas
 *  (mockup L176/191/206: `transform: translateX(3px)`). */
export const FEATURES_CTA_HOVER_TRANSLATE_X = "3px";

/**
 * Altura mínima del CTA de texto (spec `2026-08-06-story-features-tema-claro-
 * design.md` §3: "el área de clic del CTA de cada tarjeta conserva sus 44 px
 * de alto mínimo"). SUSTITUYE al valor anterior (40px): la asimetría
 * 40px/36px del mockup viejo (L176/191/206, unificada entonces a 40px) ya no
 * existe en el mockup 2026-08-06 -- las tres tarjetas declaran
 * `min-height: 44px` de forma literalmente idéntica (L217/240/263), así que
 * aquí no hace falta ningún criterio de unificación: es el mismo valor tres
 * veces. */
export const FEATURES_CTA_MIN_HEIGHT = "44px";

/** Trazo del check de los bullets: mismo `path` en las tres tarjetas
 *  (mockup L171-174/186-189/201-204). */
export const FEATURES_CHECK_ICON_PATH = "M20 6L9 17l-4-4";

/*
 * AQUI VIVIO FEATURES_GAMING_TITLE_GRADIENT, el degradado de texto del
 * término "Gaming" en el `h2` (mockup L160). Retirado en Task 12 (dieta de
 * ornamento B, auditoria premium 2026-08-08, 2026-08-09): `ScSpanGaming`
 * (Features.tsx) pasa a color solido (`FEATURES_GAMING_ACCENT`, ver debajo --
 * el mismo literal que ya usaba como fallback de
 * `@supports not (background-clip: text)`) para poder medir su contraste con
 * `contrast.ts`. Medido: 5.31:1 sobre `FEATURES_ORBITAL_VOID` -- por encima
 * de AA (4.5:1); ver el docblock de `ScSpanGaming`, Features.tsx. Hasta la
 * Task 26 (2026-08-10) este literal también alimentaba el CTA/check/badge de
 * la tarjeta vía `accentColor()` -- ya NO, ver el bloque de abajo.
 */

/** Acento propio de Gaming para el término "Gaming" del `h2` oscuro (mockup
 *  L206, desde Task 12): literal `oklch()`, no `var(--secondary-*)` — es un
 *  matiz deliberadamente distinto del `secondary` de tema, así que no se
 *  sustituye por un token.
 *
 *  Task 26 (2026-08-10, CTA con AA en las seis combinaciones): hasta esta
 *  tarea, `accentColor()`/`accentColorHover()` (Features.tsx) también
 *  resolvían el check de los bullets, el badge y el CTA de la tarjeta contra
 *  ESTE MISMO literal (reposo) y `FEATURES_GAMING_ACCENT_HOVER` (hover,
 *  retirada, ver más abajo) en las DOS ramas de tema -- exactamente el mismo
 *  problema que ya tenían `primary`/`secondary`: un único L no puede pasar
 *  AA (4.5:1) a la vez sobre `semantic.surface` claro (blanco) y
 *  `semantic.bg` oscuro (casi negro). Medido: 3.98:1/4.47:1 (claro/oscuro,
 *  reposo). Ahora `accentColor()`/`accentColorHover()` resuelven Gaming por
 *  RAMA con las cuatro constantes de abajo (mismo hue 340, L vecino del de
 *  este literal); ESTE literal queda RESERVADO en exclusiva para
 *  `ScSpanGaming` (el término del `h2`, que mide contra el void de la
 *  escena, no contra `semantic.bg` -- un fondo distinto con su propio
 *  presupuesto de contraste, sin relación con el CTA).
 *
 *  L SUBE DE 0.62 A 0.65 (QA §6, ítem 44, 2026-08-15). El 4.71:1 que este
 *  bloque declaró desde la Task 12 se medía contra el void HEXADECIMAL de la
 *  escena, que es el suelo que `contrast.ts` puede calcular, no el píxel que
 *  el visitante ve: encima del void van las capas WebP de
 *  `featuresCelestialOrbital`, y son más claras que él. Medido sobre píxel
 *  pintado con las animaciones congeladas, barriendo las 7 posiciones de
 *  scroll en las que el término es visible, a 1280 y a 1920: la mediana del
 *  contraste de borde de glifo iba de 4.49 a 4.66 según la posición -- es
 *  decir, ATRAVESANDO el umbral de 4.5, con el peor caso (scrollY 13800,
 *  idéntico en los dos anchos) 0.01 POR DEBAJO de AA. No era ruido de un
 *  píxel suelto: la distribución entera estaba centrada en el umbral.
 *
 *  0.65 y no 0.63 (que ya bastaba para cruzar, mediana 4.66) porque 0.63
 *  deja 0.16 de holgura y la variación medida entre posiciones de scroll es
 *  de 0.17 -- el arreglo se comería su propio margen. Con 0.65 la mediana
 *  sobre el arte real sube a 5.05 y el 0% del borde de glifo queda bajo
 *  umbral; contra el void hexadecimal da 5.31:1, el mismo orden de margen
 *  que sus cuatro constantes hermanas de abajo (5.04-6.61). Mismo hue 340 y
 *  misma croma 0.17: es un L vecino, no un matiz nuevo.
 *
 *  Consumidor único (`ScSpanGaming`, el término del `h2` de la rama oscura),
 *  así que el radio de impacto del cambio es esa palabra. */
export const FEATURES_GAMING_ACCENT = "oklch(0.65 0.17 340)";

/*
 * `FEATURES_GAMING_ACCENT_HOVER` ("oklch(0.55 0.18 340)", mockup L206)
 * RETIRADA en Task 26 (2026-08-10): era el hover COMPARTIDO de
 * `accentColor()`/`ScSpanGaming` en las dos ramas -- sin consumidor propio
 * fuera de `accentColorHover()` (verificado por grep, informe de la tarea) --
 * y `accentColorHover()` deja de usarla al resolver Gaming por rama (ver las
 * cuatro constantes de abajo). No hay resto que limpiar: ningún test
 * importaba este literal (`FEATURES_GAMING_ACCENT`, sin `_HOVER`, es el único
 * que cierra `Features.test.tsx`).
 */

/**
 * Acento de Gaming resuelto POR RAMA para `accentColor()`/`accentColorHover()`
 * (Features.tsx): check de los bullets, badge, panel/círculo decorativos
 * (`color-mix`, sin requisito AA) y CTA de texto (con requisito AA). Mismo
 * hue 340 y misma croma (0.17) que `FEATURES_GAMING_ACCENT` -- solo cambia L,
 * como "vecinos" del literal original -- para no introducir un segundo matiz
 * de marca; la elección de L es la que pasa AA midiendo con `contrastRatio`
 * contra el fondo real de cada rama (`contrast.ts`), siguiendo el mismo
 * criterio "un paso más oscuro en claro, aclarar en oscuro" que ya resuelve
 * `primary`/`secondary` con pasos 700/800 (claro) y 600/500 (oscuro) — aquí
 * sin rampa compartida, así que los "pasos" son L propios en vez de índices
 * de `palette`. Ratios medidos (`contrastRatio`, `Features.test.tsx`, Task 26):
 *
 *   reposo claro  (vs `semantic.surface`, blanco):  5.33:1
 *   hover  claro  (vs `semantic.surface`, blanco):  6.61:1
 *   reposo oscuro (vs `semantic.bg`):                5.04:1
 *   hover  oscuro (vs `semantic.bg`):                6.13:1
 *
 * Las cuatro pasan AA (4.5:1) con margen comparable al resto de acentos de
 * esta tarea (5.07-7.81:1 en `primary`/`secondary`). L elegida cerca de la de
 * `primary`/`secondary` en cada rama (claro ~0.50-0.55, oscuro ~0.65-0.70)
 * para que las tres tarjetas mantengan un peso visual similar; el hue 340
 * (vs 235.851 `primary`/311.928 `secondary`) sigue distinguiendo a Gaming de
 * las otras dos identidades en las cuatro combinaciones.
 */
export const FEATURES_GAMING_ACCENT_LIGHT = "oklch(0.55 0.17 340)";
export const FEATURES_GAMING_ACCENT_LIGHT_HOVER = "oklch(0.5 0.17 340)";
export const FEATURES_GAMING_ACCENT_DARK = "oklch(0.65 0.17 340)";
export const FEATURES_GAMING_ACCENT_DARK_HOVER = "oklch(0.7 0.17 340)";

/*
 * `FeaturePatternShape`/`FeatureCardVisual`/`FEATURE_CARD_VISUALS` (patrón
 * SVG decorativo + borde/fondo/sombra/hover propios por tarjeta) RETIRADOS
 * en esta entrega (spec `2026-08-06-story-features-tema-claro-design.md`,
 * D5/D7/D8): la tarjeta rehecha no tiene patrón de fondo ni borde/fondo/
 * sombra distintos por identidad -- las tres son geométricamente IGUALES
 * (D5), con un envoltorio-borde común (D7, `theme.data.radius.xl`/
 * `FEATURES_CARD_BORDER_WIDTH`, ver Features.tsx desde la Task 23) y un
 * panel de imagen común (D8, constantes
 * más abajo); lo único que varía por tarjeta es el color de acento, que ya
 * resuelven `accentColor`/`accentColorHover` (`Features.tsx`) contra la
 * rampa real del tema -- no hace falta un registro paralelo de literales de
 * arte para eso. Verificado (grep del repo, informe de la tarea): ningún
 * fichero fuera de `Features.tsx` importaba `FEATURE_CARD_VISUALS`.
 */

/*
 * AQUI VIVIO `FEATURES_BADGE_SIZE` (2.375rem = 38px, la caja del badge
 * numerico de cada tarjeta clara; spec 2026-08-06 D6, mockup L200).
 * RETIRADA en la Task 15 (unificacion de contenido, 2026-08-11) junto con el
 * propio badge: el numero 01/02/03 era decorativo (`aria-hidden`, el orden ya
 * lo comunica el DOM) y la numeracion honesta que pide esa tarea lo saca de
 * Features -- solo Journey conserva numeracion, porque su secuencia SI es
 * real. La etiqueta que lo acompanaba (`Home.features.<key>.badge`) se retira
 * en el mismo movimiento: ver el docblock de `Features()` para el porque
 * completo.
 */

/**
 * Alto del panel de imagen de cada tarjeta (D8; mockup L203:
 * `height: 216px`). 13.5rem = 216px exacto -- coincidencia con el propio
 * literal del mockup, no una aproximación.
 */
export const FEATURES_IMAGE_PANEL_HEIGHT = "13.5rem";

/** Diámetro del círculo decorativo del panel de imagen (D8; mockup L204:
 *  `width: 178px; height: 178px`). 11.125rem = 178px exacto. */
export const FEATURES_IMAGE_CIRCLE_SIZE = "11.125rem";

/** Desbordamiento inferior del círculo decorativo (D8; mockup L204:
 *  `bottom: -46px`). Verbatim -- no hay token de espaciado que produzca
 *  este valor negativo específico (no es un paso de `space` ni una fracción
 *  simple de `FEATURES_IMAGE_CIRCLE_SIZE`). */
export const FEATURES_IMAGE_CIRCLE_OFFSET = "-2.875rem";

/** Duración del giro del borde cónico en hover (D7; mockup L197:
 *  `animation: vtiBorderSpin 3200ms linear infinite`). No coincide con
 *  ningún paso de `theme.tokens.motion.duration`: es una animación
 *  ambiental de marca, no una transición de interfaz, y su ritmo es
 *  deliberadamente lento y constante -- se conserva el literal. */
export const FEATURES_CONIC_BORDER_SPIN_MS = "3200ms";

/*
 * AQUÍ VIVIERON FEATURES_LIGHT_REVEAL_DURATION_MS ("640ms") y
 * FEATURES_LIGHT_REVEAL_TRANSLATE_Y ("22px") -- la duración/desplazamiento
 * VERBATIM del mockup (D9) para el reveal escalonado de la cabecera clara y
 * las tres tarjetas. Task 19 (D7, "terminar la unificación") las retira:
 * `ScReveal` (`Features.tsx`) migra a 480ms/16px vía `REVEAL.durationMs`/
 * `REVEAL.shift` (`@/motion/vocabulary`), el MISMO valor que ya llevaba
 * `STORY_REVEAL_DURATION_MS`/`STORY_REVEAL_TRANSLATE` en Story.tsx antes de
 * esta tarea -- regla 13 del manual: una constante de valor idéntico
 * repetida en dos secciones es un token de tema, no dos constantes de
 * fichero. Ver el docblock de `REVEAL` en `vocabulary.ts` para el detalle
 * completo de la migración (padre `ScDarkContent` + hijo `ScReveal`, las dos
 * ramas de Features convergiendo en la misma gramática que Story).
 */

/**
 * Retardo (`transition-delay`) de cada uno de los elementos del reveal
 * escalonado de la rama clara, en el mismo orden en que el mockup los
 * declara -- `data-reveal-delay` de cada nodo (D9; mockup L190/192,
 * h2/párrafo de la cabecera, y L197/220/243, las tres tarjetas): `h2` 80ms,
 * párrafo de entrada 140ms, tarjeta Learning 200ms, tarjeta Imagination
 * 280ms, tarjeta Gaming 360ms. Un solo `IntersectionObserver` (`useReveal`,
 * ya existente) cubre los seis; cada uno declara su propio escalón en CSS
 * -- ver `ScReveal`, `Features.tsx`.
 *
 * Historia de este array, porque explica por qué el primer valor es 0ms y no
 * 80ms: la Task 11 (dieta de ornamento A, 2026-08-09) retiró el eyebrow de la
 * rama clara y con él su retardo de 0ms (mockup L188), quitando ese primer
 * valor en vez de renumerar el resto -- así los cinco que seguían en pantalla
 * conservaban su timing verbatim. La Task 15 (unificación de contenido,
 * 2026-08-11) devuelve un kicker a la cabecera clara, pero YA NO es aquel
 * eyebrow genérico: es el kicker con voz propia que sanciona la decisión D-E
 * del dueño (`Home.features.kicker`, "¿Por dónde empiezas?"), y se muestra en
 * las DOS ramas. Recupera su posición y su retardo originales del mockup, de
 * modo que los cinco retardos posteriores siguen sin renumerarse: el h2 sigue
 * entrando a 80ms, exactamente igual que antes y que después.
 */
export const FEATURES_LIGHT_REVEAL_DELAYS_MS = [
  0, 80, 140, 200, 280, 360,
] as const;

/** Nombre base de los ficheros WebP publicados en `public/figures/`
 *  (pipeline documentado en `assets/figures/manifest.json`, spec §6). */
export const FEATURE_FIGURE_BASENAME: Record<FeatureKey, string> = {
  learning: "feature-learning",
  imagination: "feature-imagination",
  gaming: "feature-gaming",
};

/** `sizes` de las figuras de Features: en escritorio ocupan una franja fija
 *  dentro de la tarjeta (~240px), nunca el ancho completo del viewport. */
export const FEATURES_FIGURE_SIZES =
  "(max-width: 767px) 45vw, (max-width: 1023px) 200px, 240px";

/**
 * Cuánto sube Features por encima de Journey al superponerse (D2/D5, spec
 * `2026-08-02-features-overlay-celestial-orbital-design.md`): una pantalla
 * completa, aplicada como `margin-block-start` NEGATIVO sobre la rama oscura
 * de `ScFeatures` (`Features.tsx`). DEBE valer EXACTAMENTE lo mismo que
 * `JOURNEY_DARK_HEIGHT * JOURNEY_DECK_TAIL_SCREENS` (`journey.layers.ts`): si
 * el solape es MENOR que la zona de hold de Journey, asoma una banda de la
 * escena de Journey sin tapar entre las dos secciones; si es MAYOR, Features
 * empieza a subir con la cita de cierre todavía viva (tapándola antes de que
 * termine su tramo de scroll). Las dos constantes viven en ficheros de datos
 * de secciones distintas a propósito — importar una desde la otra acoplaría
 * los datos de Journey y Features, que no se conocen entre sí — así que la
 * igualdad no se declara aquí en prosa: la comprueba un test
 * (`Features.test.tsx`, invariante D5) que importa las dos. Mismo par y mismo
 * razonamiento que `JOURNEY_OVERLAY_RISE` ↔ `STORY_DECK_TAIL_SCREENS`
 * (`journey.layers.ts`).
 */
export const FEATURES_OVERLAY_RISE = "100dvh";

/**
 * Alto del slot pegado de la escena de Features en tema oscuro (D7, spec
 * `2026-08-02-features-overlay-celestial-orbital-design.md`): una pantalla
 * completa. SUSTITUYE a `FEATURES_DARK_MIN_HEIGHT` (80vh), que era el
 * compromiso que evitaba recortar el contenido de la sección cuando la caja
 * de la sección y la de la escena eran LA MISMA — con D7 dejan de serlo (la
 * escena vive en su propio slot pegado, `ScDarkSceneSlot`, y el contenido en
 * `ScDarkFrame`, que mide lo que mide su contenido real) y el compromiso
 * desaparece: la escena ya no necesita ceder alto para no recortar texto.
 * Mismo nombre y mismo rol que `JOURNEY_DARK_HEIGHT` (`journey.layers.ts`).
 */
export const FEATURES_DARK_HEIGHT = "100dvh";

/**
 * Tope de ancho del CONTENIDO de la rama oscura (D8, spec
 * `2026-08-02-features-overlay-celestial-orbital-design.md`). El 1280px del
 * encargo del usuario describe ahora el CONTENIDO (`ScDarkFrame`,
 * `Features.tsx`), no la sección entera: la escena
 * (`FeaturesCelestialOrbital`) pasa a sangre en esta misma entrega (D7) y
 * pierde su propio tope de ancho (`FEATURES_DARK_MAX_WIDTH`, eliminada de
 * este fichero). Es una constante PROPIA y no un renombrado de
 * `FEATURES_DARK_MAX_WIDTH`, aunque el número coincida: aquella acotaba la
 * SECCIÓN entera (escena incluida) y esta acota solo el contenido —
 * reutilizarla escondería el cambio de sujeto. Mismo criterio y mismas
 * palabras que `JOURNEY_CONTENT_MAX_WIDTH` (`journey.layers.ts`) cuando
 * reemplazó a `JOURNEY_PORTAL_MAX_WIDTH`.
 *
 * DESDE LA CRÍTICA EXTERNA #12 (2026-08-18) EL NÚMERO NO VIVE AQUÍ: deriva de
 * `grid.sectionMax`, el token que nombra el ancho de contenido de las
 * secciones que componen a sangre completa. El valor resultante es EXACTAMENTE
 * el mismo (1280px) — nombrar una medida repetida es refactor de vocabulario,
 * no rediseño —, así que el CSS renderizado no cambia ni un carácter. Lo que
 * cambia es que este fichero deja de ser una de las cuatro copias del mismo
 * número (regla 13 de `RULES.md`: una constante de valor idéntico repetida en
 * dos secciones es un token de tema, no dos constantes).
 *
 * La constante NO se retira en favor de leer el token directamente desde
 * `Features.tsx`: sigue siendo el nombre con el que ESTA sección se refiere a
 * su propio tope de contenido, y conservarla deja el día de mañana abierto a
 * que Features diverja del resto sin tocar a nadie más. Mismo patrón y mismo
 * precedente que `JOURNEY_DECK_TITLE_SIZE` (`journey.layers.ts`), que deriva
 * su `clamp()` del peldaño `deckTitle` de la escala tipográfica desde la
 * crítica #11. El candado de que el número no vuelva a escribirse a mano se
 * observa en la FUENTE (`Features.test.tsx`), porque token y literal resuelven
 * a la misma cadena y ningún candado de valor puede distinguirlos
 * (`task/lessons.md`, 2026-08-12).
 */
export const FEATURES_CONTENT_MAX_WIDTH = grid.sectionMax;

/**
 * Zona de "hold" al final de la sección oscura de Features (D3/D4/D5, spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`): una
 * pantalla completa durante la cual la escena (`FeaturesCelestialOrbital`,
 * pegada en `ScDarkSceneSlot`, `Features.tsx`) se queda sola, sin contenido
 * real pasando por delante, mientras Contacto sube desde el borde inferior
 * del viewport y la cubre. Se materializa como un tercer hijo de grid,
 * `ScDarkTail` (`Features.tsx`), no como padding de la sección ni del marco
 * de contenido — ver el docblock de `ScDarkTail` para el porqué completo de
 * cada descarte.
 *
 * DEBE valer EXACTAMENTE lo mismo que `CONTACT_OVERLAY_RISE`
 * (`src/components/sections/Contact/contact.layers.ts`): si el hold es MENOR
 * que el solape de Contacto, asoma una banda de contenido REAL de Features
 * sin tapar entre las dos secciones; si es MAYOR, queda una pantalla de
 * scroll muerto antes de que Contacto empiece a subir. Las dos constantes
 * viven en ficheros de datos de secciones distintas a propósito — importar
 * una desde la otra acoplaría los datos de Features y Contacto, que no se
 * conocen entre sí — así que la igualdad NO se declara aquí en prosa: la ata
 * un test que importa los dos ficheros (`Contact.test.tsx`, la sección que
 * SUBE, mismo criterio que la invariante Journey↔Features vive en
 * `Features.test.tsx` y no en `journey.layers.ts`).
 *
 * Precedente exacto: `JOURNEY_DECK_TAIL_SCREENS` (`journey.layers.ts`) hace
 * lo mismo un peldaño más arriba de la página (Journey↔Features), pero allí
 * es un NÚMERO DE PANTALLAS que consume `useSlideDeck` (`tailScreens`) porque
 * Journey es una presentación de diapositivas con una pista que ese hook
 * dimensiona. Features no tiene deck — no hay pista ni `useSlideDeck` que
 * consuma un recuento de pantallas — así que aquí el hold se declara
 * directamente como CAJA: una `height` de grid, no un factor de una fórmula.
 */
export const FEATURES_TAIL_HOLD = "100dvh";
