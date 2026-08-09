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

export type FeatureKey = "learning" | "imagination" | "gaming";

export const FEATURE_KEYS: readonly FeatureKey[] = [
  "learning",
  "imagination",
  "gaming",
] as const;

/**
 * Radio de esquina del ENVOLTORIO de las tres tarjetas (spec
 * `2026-08-06-story-features-tema-claro-design.md`, D7/D8; mockup
 * `Landing v2.dc.html` L197/220/243: `border-radius: 26px`). SUSTITUYE al
 * valor anterior (22px, mockup viejo L164/179/194): la entrega 2026-08-06
 * rehace la tarjeta entera como envoltorio-borde (D7), con una geometría de
 * radio distinta a la de la versión con patrón SVG que sustituye. No
 * coincide con ningún paso de `theme.tokens.radius` (xl=16px, 2xl=24px): se
 * conserva el valor exacto del arte en vez de redondear a un token.
 *
 * El radio INTERIOR (la superficie blanca dentro del envoltorio, mockup
 * L198: `border-radius: 24.5px`) NO es una segunda constante: se calcula en
 * el componente como `calc(${FEATURES_CARD_RADIUS} - ${FEATURES_CARD_BORDER_WIDTH})`
 * (26px − 1.5px = 24.5px, exacto), que es literalmente la regla que describe
 * el encargo ("el radio interior es el radio exterior menos el padding") en
 * vez de un segundo literal que podría desincronizarse si cualquiera de los
 * dos cambia.
 */
export const FEATURES_CARD_RADIUS = "26px";

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

/** Degradado de texto del término "Gaming" en el `h2` (mockup L160): los dos
 *  stops son literales `oklch()` en el propio mockup, no una `var()` — se
 *  transcriben tal cual, sin pasar por la escalera de tema. */
export const FEATURES_GAMING_TITLE_GRADIENT =
  "linear-gradient(100deg, oklch(0.72 0.15 292), oklch(0.77 0.13 335))";

/** Acento propio de Gaming para el check de los bullets y el CTA (mockup
 *  L201-204 y L206): literal `oklch()`, no `var(--secondary-*)` — es un
 *  matiz deliberadamente distinto del `secondary` de tema, así que no se
 *  sustituye por un token. */
export const FEATURES_GAMING_ACCENT = "oklch(0.62 0.17 340)";
/** Estado hover del acento de Gaming (mockup L206: `color: oklch(0.55 0.18 340)`). */
export const FEATURES_GAMING_ACCENT_HOVER = "oklch(0.55 0.18 340)";

/*
 * `FeaturePatternShape`/`FeatureCardVisual`/`FEATURE_CARD_VISUALS` (patrón
 * SVG decorativo + borde/fondo/sombra/hover propios por tarjeta) RETIRADOS
 * en esta entrega (spec `2026-08-06-story-features-tema-claro-design.md`,
 * D5/D7/D8): la tarjeta rehecha no tiene patrón de fondo ni borde/fondo/
 * sombra distintos por identidad -- las tres son geométricamente IGUALES
 * (D5), con un envoltorio-borde común (D7, `FEATURES_CARD_RADIUS`/
 * `FEATURES_CARD_BORDER_WIDTH`) y un panel de imagen común (D8, constantes
 * más abajo); lo único que varía por tarjeta es el color de acento, que ya
 * resuelven `accentColor`/`accentColorHover` (`Features.tsx`) contra la
 * rampa real del tema -- no hace falta un registro paralelo de literales de
 * arte para eso. Verificado (grep del repo, informe de la tarea): ningún
 * fichero fuera de `Features.tsx` importaba `FEATURE_CARD_VISUALS`.
 */

/**
 * Geometría del badge numérico de cada tarjeta (spec 2026-08-06, D6; mockup
 * `Landing v2.dc.html` L200: `width: 38px; height: 38px; border-radius: 13px`).
 * 2.375rem = 38px exacto; el radio SÍ tiene equivalente de tema
 * (`radius.lg`, `Features.tsx`) y no se repite aquí.
 */
export const FEATURES_BADGE_SIZE = "2.375rem";

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

/**
 * Duración del reveal escalonado de la cabecera clara y las tres tarjetas
 * (D9; mockup L190/191/192/197/220/243: `transition: opacity 640ms
 * cubic-bezier(0.4,0,0.2,1), transform 640ms cubic-bezier(0.4,0,0.2,1)…`).
 * 640ms no coincide con ningún paso de `theme.tokens.motion.duration`
 * (`slower` es 480ms, el más próximo): se conserva el literal del mockup.
 * El easing SÍ es un token (`motion.easing.standard`, ver `Features.tsx`) --
 * coincide literalmente con `cubic-bezier(0.4, 0, 0.2, 1)`.
 */
export const FEATURES_LIGHT_REVEAL_DURATION_MS = "640ms";

/** Desplazamiento vertical de entrada del reveal escalonado (D9; mockup:
 *  `transform: translateY(22px)` en los elementos del bloque -- seis hasta
 *  Task 11 (2026-08-09), cinco desde que esa tarea retira el eyebrow de la
 *  rama clara). */
export const FEATURES_LIGHT_REVEAL_TRANSLATE_Y = "22px";

/**
 * Retardo (`transition-delay`) de cada uno de los elementos del reveal
 * escalonado de la rama clara, en el mismo orden en que el mockup los
 * declara -- `data-reveal-delay` de cada nodo (D9; mockup L190/192,
 * h2/párrafo de la cabecera, y L197/220/243, las tres tarjetas): `h2` 80ms,
 * párrafo de entrada 140ms, tarjeta Learning 200ms, tarjeta Imagination
 * 280ms, tarjeta Gaming 360ms. Un solo `IntersectionObserver` (`useReveal`,
 * ya existente) cubre los cinco; cada uno declara su propio escalón en CSS
 * -- ver `ScReveal`, `Features.tsx`.
 *
 * Task 11 (dieta de ornamento A, 2026-08-09): el eyebrow (mockup L188,
 * antes 0ms) se retira de la rama clara -- se quita ese primer valor del
 * array en vez de renumerar el resto, así los cinco retardos que SÍ siguen
 * en pantalla conservan el mismo timing verbatim del mockup que ya tenían
 * (h2 seguía entrando a 80ms, no a 0ms).
 */
export const FEATURES_LIGHT_REVEAL_DELAYS_MS = [
  80, 140, 200, 280, 360,
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
 */
export const FEATURES_CONTENT_MAX_WIDTH = "1280px";

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
