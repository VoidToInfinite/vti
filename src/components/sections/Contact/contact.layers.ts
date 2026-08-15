/**
 * Constantes de arte de Contact ("Let's build something infinite."), tema
 * claro. Mismo precedente que `aura.layers.ts`/`eye.layers.ts`/
 * `story.layers.ts`: los colores propios de esta sección NO entran en los
 * tokens semánticos del sistema (D10, spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §2/§7.4)
 * — son literales decorativos de UNA composición concreta, no roles de UI
 * que deban cambiar con el tema. Se copian VERBATIM del mockup aprobado
 * (`Landing v2.dc.html`, sección `#contact`, líneas 212-238) y se citan aquí
 * con su línea de origen para que un futuro retoque compare contra la
 * fuente, no contra un número sin contexto. (La frase "Contact solo se monta
 * en tema claro" que encabezaba este párrafo caducó el 2026-08-03, cuando la
 * sección estrenó rama oscura propia: lo que sigue siendo cierto es que
 * ESTAS constantes describen la composición CLARA; las de la oscura son las
 * de más abajo, con el sufijo `_DARK` o nombre propio.)
 *
 * Los colores que SÍ resuelven a un rol de token existente (fallback del
 * degradado de acento sin `background-clip: text` -> `semantic.brandText`,
 * los acentos de las tarjetas de canal -> `palette.secondary[*]` por rama)
 * se referencian directamente desde `Contact.tsx` contra el tema, sin
 * duplicarlos aquí — mismo criterio que ya aplica `Story.tsx`/`Hero.tsx`.
 * (Hasta Task 11, 2026-08-09, el kicker también resolvía contra
 * `semantic.brandText`; se retiró de las dos ramas de Contacto. Hasta Task
 * 16, 2026-08-11, el degradado del CTA de sección resolvía contra
 * `palette.primary[600]`/`palette.secondary[600]`; ese CTA se retiró con el
 * chip — ver `Contact.tsx`.)
 *
 * Mapeo de rol de texto (el mockup usa un design system externo no incluido
 * en el HTML, `_ds/.../tokens/colors.css`, cuyas variables no están
 * disponibles para leer aquí): `var(--text-secondary)` (cuerpo/chip) se
 * mapea al rol `semantic.textMuted` de este sistema; `var(--text-default)`
 * a `semantic.text`; `var(--border-default)` a `semantic.border`. Mismo
 * criterio de mapeo por rol, no por nombre literal, que ya usa el resto del
 * repo (p. ej. `accent()` en `Button.tsx`).
 */

/** Borde de la tarjeta (mockup L213). El fondo del propio degradado
 * pastel de la tarjeta va en `CONTACT_CARD_GRADIENT`.
 *
 * Task 12 (dieta de ornamento B, 2026-08-09, ghost-card): `CONTACT_CARD_SHADOW`
 * (la sombra de 44px que acompañaba a este borde) se retira -- ver el
 * docblock de `ScCard` en `Contact.tsx` para la regla completa (borde O
 * sombra, nunca los dos) y por qué esta tarjeta concreta se queda con el
 * borde. */
export const CONTACT_CARD_BORDER = "oklch(0.88 0.04 270)";
export const CONTACT_CARD_GRADIENT =
  "linear-gradient(110deg, #EFF4FC 0%, #F5F2FB 55%, #F9F0F7 100%)";

/*
 * AQUI VIVIERON CONTACT_TITLE_ACCENT_GRADIENT_LIGHT/_DARK, el degradado de
 * texto de "infinito." (mockup L216). Retirados en Task 12 (dieta de
 * ornamento B, auditoria premium 2026-08-08, 2026-08-09): `ScAccent`
 * (Contact.tsx) pasa a color solido (`semantic.brandText`, el mismo rol que
 * ya usaba como fallback de `@supports not (background-clip: text)`) para
 * poder medir su contraste con `contrast.ts` -- un degradado de texto no es
 * medible. Medicion completa en el docblock de `ScAccent`, Contact.tsx, y en
 * Contact.test.tsx, describe "Task 12".
 */

/**
 * Fondo translúcido de las superficies de la rama CLARA que se apoyan sobre
 * el degradado pastel de la tarjeta (mockup L219): blanco con alfa — no es
 * un rol semántico (`semantic.surface` es opaco), es la superposición
 * específica de esta composición.
 *
 * RENOMBRADO en la Task 16 (unificación de contenido parte 2, 2026-08-11),
 * de `CONTACT_CHIP_BG_LIGHT` a `CONTACT_PANEL_BG_LIGHT`, con el MISMO valor.
 * El chip que le daba nombre era el recuadro con borde e icono de sobre que
 * la rama clara pintaba donde va un campo de captura: se retira entero (una
 * crítica independiente lo señaló como el problema #1 del sitio — «en tema
 * claro no existe formulario de contacto, y lo que hay simula serlo»), y la
 * rama clara pasa a montar el formulario REAL y las dos tarjetas de salida
 * de la rama oscura. La superficie translúcida sobrevive porque sigue
 * haciendo el mismo trabajo — separar un panel del degradado pastel sin
 * romperlo con un blanco opaco — pero ahora bajo `ScForm`/`ScCardLink`, no
 * bajo un chip. Conservar el nombre viejo habría dejado una constante que
 * describe una pieza inexistente (regla 16 de RULES.md).
 *
 * Historia de su pareja oscura, sin borrar: existió `CONTACT_CHIP_BG_DARK`
 * (`rgba(2, 4, 14, 0.55)`, el void de la escena saliente con alfa) para
 * cuando la rama oscura también montaba el chip. Dejó de montarlo el
 * 2026-08-03, cuando esa rama pasó a tarjetas de contacto y formulario
 * (D12/D14), y se retiró en la entrega del arte nuevo (2026-08-04) — que
 * además la habría dejado describiendo un void que ya no existe.
 */
export const CONTACT_PANEL_BG_LIGHT = "rgba(255, 255, 255, 0.82)";

/*
 * AQUI VIVIO CONTACT_CTA_HOVER_SHADOW, la sombra de hover del CTA de sección
 * de la rama clara (mockup L223, `style-hover`). Retirada en la Task 16
 * (2026-08-11) junto con su único consumidor, `ScCta` (`Contact.tsx`): con
 * el formulario real montado también en claro, el botón de envío ES el
 * camino a `mailto:` en las dos ramas, y un ancla aparte que abre el mismo
 * cliente de correo era una segunda salida al mismo sitio presente en un
 * solo tema — contenido redundante, no arte. Ver el docblock de `Contact()`.
 */

/** Halo radial detrás de la figura (mockup L228): violeta frío que no
 * coincide con los hue de marca del sistema — pieza de arte propia. */
export const CONTACT_RING_HALO_GRADIENT =
  "radial-gradient(circle, oklch(0.8 0.1 320 / 0.2) 0%, oklch(0.8 0.1 320 / 0.07) 45%, transparent 70%)";
/** Bordes de los dos anillos concéntricos intermedios (mockup L229/230). */
export const CONTACT_RING_A_BORDER = "oklch(0.75 0.1 300 / 0.22)";
export const CONTACT_RING_B_BORDER = "oklch(0.75 0.1 300 / 0.12)";

/** Sombra de la figura que saluda (mockup L234, `filter: drop-shadow(...)`). */
export const CONTACT_FIGURE_SHADOW = "oklch(0.55 0.15 300 / 0.3)";

/**
 * Geometría de la tarjeta y sus anillos (mockup L213/228-230): medidas de
 * UNA composición concreta, fuera de la escala de `space`/`radius` (mismo
 * criterio que `STORY_FIGURE_WIDTH`/`STORY_FIGURE_HEIGHT` en
 * `story.layers.ts` — el `border-radius` de 13px del chip/CTA sí se resuelve
 * al token `radius.lg` más cercano desde `Contact.tsx`, no se duplica aquí,
 * porque es cromo de UI reutilizable, no una medida de arte).
 */
export const CONTACT_RING_HALO_SIZE = "480px";
export const CONTACT_RING_HALO_RIGHT = "40px";
export const CONTACT_RING_A_SIZE = "360px";
export const CONTACT_RING_A_RIGHT = "96px";
export const CONTACT_RING_B_SIZE = "448px";
export const CONTACT_RING_B_RIGHT = "52px";

/** Geometría de la figura que saluda (mockup L233/234). */
export const CONTACT_FIGURE_HEIGHT = "560px";
export const CONTACT_FIGURE_LEFT = "8px";
export const CONTACT_FIGURE_TOP = "80px";

/**
 * Flotación (mockup: keyframe `vtiFloat4`, definido en el `<style>` de
 * cabecera del mockup — `translateY(0)` en 0%/100%, `translateY(-4px)` en
 * 50%). Solo transform, guard `prefers-reduced-motion` en `Contact.tsx`
 * (mismo criterio que `ctaGlow`/`gradientTextClip` en `BrandName.tsx`/
 * `Hero.tsx`: la animación SOLO se declara bajo `no-preference`, y el bloque
 * `reduce` fuerza `animation: none; transform: none;` explícito en vez de
 * confiar en el colapso global de `GlobalStyles` — jsdom no evalúa `@media`,
 * lección 2026-07-27, así que este guard se ata inspeccionando
 * `document.styleSheets`, nunca `getComputedStyle`).
 */
export const CONTACT_FLOAT_AMPLITUDE = "-4px";
export const CONTACT_FIGURE_FLOAT_MS = 8000;

/**
 * Dimensiones nativas del PNG fuente (spec §6: 1024×1536, medido con
 * System.Drawing) — de ahí sale el ancho aproximado a media que la figura se
 * muestra a 560px de alto: 560 × (1024/1536) ≈ 373px. `sizes` solo declara
 * ancho honesto en el punto de corte donde la figura SÍ se muestra (`md`,
 * spec §7.4); por debajo se oculta entera (mismo criterio que
 * `STORY_FIGURE_SIZES`/Journey, "oculta debajo para no romper el flujo"),
 * así que el valor de fallback no necesita ser preciso.
 */
export const CONTACT_FIGURE_SIZES = "(min-width: 768px) 373px, 100vw";

/**
 * Alto del slot pegado de la escena de Contacto en tema oscuro (D6, spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`): una
 * pantalla completa. Hasta esta entrega valía `90dvh` (2026-07-30, misma
 * época en que `ScContact` era una caja acotada y centrada, sin solape con
 * ningún vecino): con la sección ahora A SANGRE y superpuesta sobre el hold
 * de Features (D2/D6), una escena de `90dvh` dejaría `10dvh` de fondo plano
 * (el `background-color` de `ScContact`) visibles bajo el pin, justo antes de
 * que el slot se despegue — banda muerta que el mockup no tiene. `100dvh` es
 * el mismo valor que `FEATURES_DARK_HEIGHT`/`CONTACT_OVERLAY_RISE`, por el
 * mismo motivo: el slot debe medir SIEMPRE una pantalla exacta, sin margen.
 */
export const CONTACT_DARK_HEIGHT = "100dvh";

/**
 * Cuánto sube Contacto por encima del hold de Features al superponerse
 * (D2/D4, spec `2026-08-03-contacto-footer-oscuro-design.md`): una pantalla
 * completa, aplicada como `margin-block-start` NEGATIVO sobre la rama oscura
 * de `ScContact` (`Contact.tsx`). DEBE valer EXACTAMENTE lo mismo que
 * `FEATURES_TAIL_HOLD` (`features.layers.ts`): si el solape es MAYOR que el
 * hold de Features, Contacto empieza a subir tapando todavía contenido REAL
 * de la tercera identidad; si es MENOR, asoma una banda de fondo plano de
 * Features (su `background-color`, sin escena pegada detrás) entre el fin
 * del hold y el principio de Contacto. Las dos constantes viven en ficheros
 * de datos de secciones distintas a propósito — importar una desde la otra
 * acoplaría los datos de Features y Contacto, que no se conocen entre sí —
 * así que la igualdad NO se declara aquí en prosa: la ata un test que importa
 * los dos ficheros (`Contact.test.tsx`, la sección que SUBE, mismo criterio
 * que la invariante Journey↔Features vive en `Features.test.tsx` y no en
 * `journey.layers.ts`). Mismo par y mismo razonamiento que
 * `FEATURES_OVERLAY_RISE` ↔ `JOURNEY_DECK_TAIL_SCREENS`.
 */
export const CONTACT_OVERLAY_RISE = "100dvh";

/**
 * Tope de ancho del CONTENIDO de la rama oscura (D6, spec
 * `2026-08-03-contacto-footer-oscuro-design.md`). El 1280px que antes medía
 * la SECCIÓN entera (`CONTACT_DARK_MAX_WIDTH`, eliminada de este fichero)
 * ahora acota solo el CONTENIDO (`ScDarkFrame`, `Contact.tsx`): la escena
 * (`ContactNeonGalaxy`) pasa a sangre en esta misma entrega y pierde su
 * propio tope de ancho. Es una constante PROPIA y NO un renombrado de
 * `CONTACT_DARK_MAX_WIDTH`, aunque el número coincida: aquella acotaba la
 * SECCIÓN entera (escena incluida) y esta acota solo el contenido —
 * reutilizarla escondería el cambio de sujeto. Mismo criterio y mismas
 * palabras que `FEATURES_CONTENT_MAX_WIDTH` (`features.layers.ts`) cuando
 * reemplazó a `FEATURES_DARK_MAX_WIDTH`.
 */
export const CONTACT_CONTENT_MAX_WIDTH = "1280px";

/**
 * Tope de ancho de la PAREJA de columnas (copia + tarjeta de formulario)
 * DENTRO del marco de 1280px, y alineada a la izquierda
 * (`margin-inline-end: auto` en `ScDarkContent`, `Contact.tsx`). D20,
 * añadida durante la verificación en navegador de la escena anterior — ver
 * §12 de la spec `2026-08-03-contacto-footer-oscuro-design.md`.
 *
 * Espejado 2026-08-04: la escena de fondo pasó de `ContactNeonGalaxy`
 * (figura y orbes a la izquierda, vacío a la derecha) a
 * `ContactCosmicGuardian` (figura en la mitad DERECHA del lienzo, 60.71% a
 * 83.74% del ancho — dato de
 * `assets/contact-cosmic-guardian/manifest.json`, `geometry.figureSide`), así
 * que el lado que le sobra al contenido para no pisar la masa luminosa
 * cambió de la derecha a la izquierda: la pareja deja de pegarse a la
 * derecha (`margin-inline-start: auto`) y pasa a pegarse a la izquierda
 * (`margin-inline-end: auto`).
 *
 * Por qué sigue haciendo falta un tope y por qué es un `min()` con un
 * segundo tope en `vw` (`CONTACT_CONTENT_PAIR_MAX_VW`, abajo) y no un número
 * suelto: la escena se pinta con `object-fit: cover`, así que su encuadre se
 * reescala con el viewport y el borde de la masa luminosa de la figura **no
 * vive en un píxel fijo, vive en una fracción del ancho del viewport** — el
 * mismo argumento geométrico que sostenía el tope de la escena anterior,
 * solo que ahora el borde relevante es el IZQUIERDO de la figura (60.71%
 * del lienzo) en vez del derecho. Un tope solo en `px` deja de proteger en
 * cuanto el viewport es lo bastante estrecho como para que ese `%` del
 * lienzo caiga por debajo del tope fijo — el mismo fallo que documentó D20
 * para `ContactNeonGalaxy` a 1200×800.
 *
 * **Los dos valores heredados de la escena saliente (800px y 58vw) se han
 * MEDIDO contra el arte nuevo y se conservan.** Método: recompuestas las 3
 * capas más la viñeta en un canvas del tamaño del viewport, con el mismo
 * `cover` + `scale(CONTACT_GUARDIAN_OVERSCAN)` y el mismo `screen` del
 * polvo que producción, y contados los píxeles con luminancia relativa
 * > 0.2 en franjas de 20px. El borde izquierdo de la masa luminosa de la
 * guardiana cae en el 65% del ancho a 1440 (x=940), el 67% a 1200 (x=800)
 * y el 69% a 992 (x=680); la pareja termina en 912, 728 y 607
 * respectivamente, siempre por delante. No hace falta tocar los números:
 * la fracción del ancho donde arranca la figura resultó ser muy parecida a
 * la que tenía la escena anterior por el otro lado.
 */
export const CONTACT_CONTENT_PAIR_MAX = "800px";

/**
 * Segundo tope de la misma pareja, en unidades de VIEWPORT, que se combina
 * con el anterior mediante `min()` en `ScDarkContent` (`Contact.tsx`) — ver
 * el porqué del `min()` de dos topes en el docblock de
 * `CONTACT_CONTENT_PAIR_MAX`, arriba.
 *
 * Espejado 2026-08-04 junto con `CONTACT_CONTENT_PAIR_MAX`, y **medido**: el
 * 58vw heredado de `ContactNeonGalaxy` resulta seguir valiendo contra
 * `ContactCosmicGuardian`. La pareja termina en el 63% del ancho (58vw más
 * el padding del marco) y el borde izquierdo de la figura arranca en el
 * 65-69% según el viewport, así que el margen se mantiene en todo el rango
 * medido (992, 1200 y 1440). Que el número sobreviva al espejado no es
 * suerte: los dos kits sitúan su figura a una distancia parecida del borde
 * del lienzo, solo que por lados opuestos.
 *
 * Por debajo de `lg` no aplica ningún tope (ni este ni
 * `CONTACT_CONTENT_PAIR_MAX`): las columnas se apilan a ancho completo y es
 * la viñeta de la escena (`ScVignette` en
 * `contactCosmicGuardian.parts.tsx`), no un tope de ancho, quien resuelve la
 * legibilidad en ese régimen — mismo criterio documentado en `Contact.tsx`
 * junto al `@media` que consume estas dos constantes. **El corte es `lg` y
 * no `md`**: entre 768 y 991 las dos columnas siguen apiladas, así que un
 * régimen lateral ahí dejaba texto a ancho completo sin velo — medido a
 * 768×900, el peor píxel de la cabecera daba 1.83:1 (medición previa a Task
 * 11, 2026-08-09, con el kicker todavía presente encima del h2 -- pendiente
 * reverificar en navegador que el peor píxel sigue en el mismo punto tras su
 * retirada). Con el corte en `lg`, 10.16:1.
 */
export const CONTACT_CONTENT_PAIR_MAX_VW = "58vw";

/** Fondo/borde de las tres tarjetas de contacto (mockup L63/67/71, idéntico
 *  en las tres): blanco translúcido sobre el negro de la escena de fondo
 *  (`ContactCosmicGuardian` desde 2026-08-04), no un rol semántico — mismo criterio D10 que el resto
 *  de este fichero (composición propia, no token de UI). */
export const CONTACT_CARD_BG_DARK = "oklch(1 0 0 / 0.05)";
export const CONTACT_CARD_BORDER_DARK = "oklch(1 0 0 / 0.12)";

/** Fondo/borde de la tarjeta del formulario (mockup L87): mismo blanco
 *  translúcido que las tarjetas de contacto pero con su propia alfa de fondo
 *  (`.04` frente a `.05`) — constante independiente aunque el borde coincida
 *  numéricamente con `CONTACT_CARD_BORDER_DARK`, para no acoplar dos piezas
 *  que el mockup declara por separado. */
export const CONTACT_FORM_BG = "oklch(1 0 0 / 0.04)";
export const CONTACT_FORM_BORDER = "oklch(1 0 0 / 0.12)";

/**
 * Halo radial superior de Contacto (mockup L52, bloque `globeGlow`):
 * degradado, geometría y desenfoque VERBATIM (D18 — hue `311.928` de
 * `palette.secondary`, pero con croma/paradas que no coinciden con ningún
 * paso de la rampa). Marca visualmente la costura con Features, igual que el
 * haz de `SectionBeam` marca el borde exacto pero con una mancha de luz más
 * amplia y difusa detrás.
 */
export const CONTACT_TOP_GLOW_GRADIENT =
  "radial-gradient(ellipse 55% 100% at 50% 0%, oklch(0.5 0.18 311.928 / 0.34), transparent 72%)";
export const CONTACT_TOP_GLOW_WIDTH = "70%";
export const CONTACT_TOP_GLOW_HEIGHT = "140px";
export const CONTACT_TOP_GLOW_BLUR = "24px";

/** Duración de `glowPulse` (mockup L28/L52: `animation:glowPulse 7s
 *  ease-in-out infinite`). Infinita — se declara solo bajo
 *  `prefers-reduced-motion: no-preference` en `Contact.tsx`, con su propio
 *  `animation: none` explícito en el bloque `reduce` (mismo criterio D8 que
 *  `sectionBeam.layers.ts`). */
export const CONTACT_TOP_GLOW_PULSE_MS = 7000;
