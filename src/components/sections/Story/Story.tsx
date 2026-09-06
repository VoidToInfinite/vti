"use client";
import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";
import { Kicker } from "@/components/ui/Kicker/Kicker";
import { Typography } from "@/components/ui/Typography/Typography";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import { links } from "@/config/links";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useSlideDeck } from "@/hooks/useSlideDeck";
import { PRESS, REVEAL } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import { motion } from "@/theme/tokens/motion";
import type { ThemeDefinition } from "@/theme/theme.types";
import { StoryCosmicBeing } from "@/components/scenes/storyCosmicBeing/StoryCosmicBeing";
import {
  ScDeck,
  ScDeckIntroBody,
  ScDeckNote,
  ScDeckNoteAccent,
  ScDeckPillarBody,
  ScDeckPillarSubtitle,
  ScDeckPillarTitle,
  ScDeckTitle,
  ScRail,
  ScRailMark,
  ScRailStatus,
  ScRailStatusCurrent,
  ScRailStatusTotal,
  ScScrollHint,
  ScSceneWrap,
  ScSlide,
  ScStage,
  ScTrack,
} from "./story.deck";
import {
  STORY_DECK_TAIL_SCREENS,
  STORY_FIGURE_ASPECT,
  STORY_FIGURE_FLOAT_MS,
  STORY_FIGURE_HEIGHT,
  STORY_FIGURE_SCROLL_SHIFT,
  STORY_FIGURE_SIZES,
  STORY_FIGURE_WIDTH,
  STORY_FLOAT_AMPLITUDE,
  STORY_HALO_GRADIENT,
  STORY_HALO_INSET,
  STORY_SLIDES,
} from "./story.layers";

/*
 * Story ("Why VoidToInfinite?"). Rama CLARA (mockup `Landing v2.dc.html`
 * L70-131): grid figura+contenido (L70-101) seguido del statement a
 * pantalla completa (L127-131, D11/D12 de la segunda ronda, spec
 * 2026-08-06-story-features-tema-claro-design.md).
 *
 * Rama OSCURA (spec 2026-07-29): no hay mockup oscuro de esta seccion. En
 * vez de la figura recortada + halo, el fondo es la escena parallax
 * `StoryCosmicBeing` (11 capas, D1-D12 del spec 2026-07-29) y el contenido
 * (mismo i18n `Home.story.*`) se superpone encima.
 *
 * Task 15 (unificacion de contenido, D-C, 2026-08-11): el CONTENIDO de las dos
 * ramas es el mismo y sale de las mismas claves; lo que ramifica por tema es el
 * ARTE y el VEHICULO. En concreto, el cierre de Story ya no diverge: la
 * diapositiva final del deck consume `Home.story.statement.first/second/third`
 * -- las MISMAS claves que el bloque a pantalla completa de la rama clara -- y
 * es ella misma una `<section id="statement">`, de modo que la lista de
 * secciones de la pagina sale identica en los dos temas. Desde la critica
 * externa #15 (hallazgo C10) tambien sale identico el ANIDAMIENTO: `#statement`
 * es hija de `#story` en las DOS ramas, no solo en la oscura (ver el docblock
 * de `ScStatement`). Hasta esa tarea esta
 * rama tenia dos claves propias (`noteLead`/`noteAccent`, T3 de la spec
 * 2026-07-31-story-deck-tipografia-design.md) que decian la misma frase con
 * otra particion; se retiraron del JSON. Ver el JSX de `StoryDeckDark`, al
 * final de este fichero, para el porque de no sacar el cierre del deck.
 *
 * `themeName` decide la rama (no `theme.data.isLight`): mismo criterio que
 * `HomeSections.tsx`, que ya usa `useTheme()` de `@/theme/ThemeProvider`
 * para esta misma decision.
 */

/* Flotacion de la figura EN CLARO (mismo keyframe que el mockup tambien
   aplicaba a la tarjeta de nota, con otra duracion -- ver STORY_CARD_FLOAT_MS
   en story.layers.ts). La tarjeta de nota y su flotacion se retiraron en la
   segunda ronda de esta entrega (D12, spec 2026-08-06): la nota pasa a
   statement a pantalla completa, sin flotacion propia. La rama oscura no usa
   este keyframe: su unica animacion es el pulso del nucleo, declarado en
   storyCosmicBeing.parts.tsx. */
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(${STORY_FLOAT_AMPLITUDE}); }
`;

/**
 * Los cuatro pilares de Story. Se llama PILLARS, en plural y sin prefijo de
 * seccion, y esa es la unica forma en que existe: nunca hubo un STORY_STEPS
 * (verificado con `git log -S` sobre `src/`, cero commits) -- el nombre lo
 * inventó la entrada `numbering` del allowlist de
 * `scripts/detect-anti-patterns.mjs` al sancionar estas cuatro lineas, y
 * quedó corregido ahí en la misma revisión que escribe este docblock
 * (crítica externa #8, 2026-08-17).
 *
 * `number` es DECORACION, no una secuencia. Task 15 (numeracion honesta,
 * 2026-08-11) retiró la etiqueta "Paso"/"Step" que lo acompañaba justo por
 * eso: los cuatro pilares son cuatro maneras simultaneas de mirar lo mismo,
 * y prometer un orden que no existe era el defecto. La unica secuencia real
 * del sitio es la de Journey. Ver el comentario del badge en `StoryLight`.
 *
 * Lo consumen LAS DOS ramas de tema con el mismo array: la rejilla de
 * tarjetas de `StoryLight` y las diapositivas de pilar del deck de
 * `StoryDeckDark`.
 */
const PILLARS = [
  { key: "learn", number: "01" },
  { key: "create", number: "02" },
  { key: "grow", number: "03" },
  { key: "practice", number: "04" },
] as const;

/*
 * AQUI VIVIERON `pillarAccent` y su envoltorio `pillarColor`, la rampa de
 * acento del numeral de pilar del deck OSCURO (`ScPillarNumber`). Se retiran
 * con esa pieza (critica externa #19, 2026-09-04, decision del dueno "una
 * sola forma de contar": el porque completo, con las cifras medidas, esta en
 * el comentario de la diapositiva de pilar, al final de este fichero).
 *
 * Lo que se va con ellas, declarado para que no se lea como una perdida
 * silenciosa: la critica externa #12 (2026-08-19) midio que el cuarto escalon
 * de esa rampa (`secondary[700]`) daba 3.01:1 sobre el pixel real de la
 * escena y desplazo los tres escalones de `secondary` un paso hacia el lado
 * claro para que las cuatro libraran AA. Ese arreglo no se revierte: deja de
 * existir el elemento que protegia. Su describe de contraste en
 * `Story.test.tsx` ("critica #12 -- el numeral de pilar del deck oscuro libra
 * AA") se retira en el mismo commit por lo mismo -- un candado que mide el
 * color de un elemento inexistente no vigila nada.
 *
 * La rampa de la rama CLARA (`pillarBadgeAccent`, mas abajo) NO se toca: su
 * badge sigue vivo, con su propio fondo, sus propios ratios y su propio
 * candado. Las dos escalas siempre estuvieron separadas, y esta retirada es
 * justo lo que confirma que separarlas era correcto.
 */

/*
 * Constantes de esta entrega (tarjetas de pilar, mockup L86-123, spec
 * 2026-08-06-story-features-tema-claro-design.md D2/D3/D4/D9): valores que
 * el mockup fija en px/ms y para los que el sistema de tokens no tiene un
 * paso equivalente. Viven aquí, junto al componente que los consume -- no en
 * story.layers.ts, que documenta en su propia cabecera que solo contiene
 * arte VERBATIM de la reescritura 2026-07-28/2026-07-31, ajena a esta
 * entrega.
 */
/** Badge cuadrado del número de cada tarjeta (mockup L88/97/106/115: 38px):
 *  ningún paso de `radius`/`space` mide exactamente esto. */
const STORY_CARD_BADGE_SIZE = "2.375rem";
/** Hover de tarjeta (D3, mockup `style-hover`): `translateY(-3px)`, un
 *  desplazamiento demasiado pequeño para ningún paso de `space`. */
const STORY_CARD_HOVER_LIFT = "-3px";
/*
 * Entrada escalonada (D9 original, mockup: 640ms/`translateY(22px)` +
 * `easing.standard`): las 7 piezas que se revelan en cascada (barra+kicker,
 * h2, body, las 4 tarjetas) empezaron con esos valores del mockup, distintos
 * de los 480ms/decelerate/16px que `ScGrid` (el padre) ya llevaba desde D7 --
 * padre e hijo con gramáticas de entrada distintas.
 *
 * Task 19 (D7, "terminar la unificación") cierra esa divergencia: los 7
 * hijos pasan a `REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift`
 * (`@/motion/vocabulary`), EXACTAMENTE la misma gramática que `ScGrid` (ver
 * su docblock, más abajo). Las dos constantes locales que llevaban el valor
 * del mockup (`STORY_REVEAL_DURATION_MS`/`STORY_REVEAL_TRANSLATE`) se
 * retiran: regla 13 del manual -- una constante de valor idéntico repetida
 * en dos secciones (aquí, en Story Y en Features) es un token de tema, no
 * una constante de fichero, y ese token ya existe (`REVEAL`). Es además la
 * migración que cierra el hallazgo del gate F2: `REVEAL` pasa de cero
 * consumidores a consumidor real aquí.
 */
/**
 * Retardo de cada pieza en cascada, mismo orden que el mockup (L74-121):
 * barra+kicker, h2, body, tarjeta 1..4 (D9).
 *
 * Los siete números son EXACTAMENTE los de antes —0, 80, 140, 200, 260, 320,
 * 380— pero dejan de escribirse a mano. Sus diferencias dicen lo que la tabla
 * escondía: 80, 60, 60, 60, 60. Dos pasos, y los dos son peldaños de
 * `motion.staggerMs` (`base` = 80 para despegar el titular del kicker,
 * `tight` = 60 para que las cuatro tarjetas se lean como un bloque). El censo
 * de la crítica #16 encontró esta cascada y su gemela de Features escritas por
 * separado en dos ficheros que no se conocen (regla 13 de `RULES.md`); aquélla
 * migró en la ola que creó la escala y ésta quedó pendiente de integración,
 * con la sanción provisional que `scripts/detect-anti-patterns.mjs` dejó
 * escrita. Esto la cierra.
 *
 * | # | pieza          | suma                        | ms  |
 * | - | -------------- | --------------------------- | --- |
 * | 0 | barra + kicker | 0                           | 0   |
 * | 1 | h2             | `base`                      | 80  |
 * | 2 | cuerpo         | `base + tight`              | 140 |
 * | 3 | tarjeta 1      | `base + 2·tight`            | 200 |
 * | 4 | tarjeta 2      | `base + 3·tight`            | 260 |
 * | 5 | tarjeta 3      | `base + 4·tight`            | 320 |
 * | 6 | tarjeta 4      | `base + 5·tight`            | 380 |
 *
 * Los peldaños se leen enteros (`motion.staggerMs.base`) y no por un alias
 * local: el candado que impide que un peldaño de la escala se quede sin
 * consumidor (`motion.test.ts`) busca el acceso literal, y un alias lo dejaría
 * ciego ante este fichero — el mismo punto ciego que el docblock de `grid.ts`
 * ya declara para los censos de tokens. Los retardos del statement (220 y 440)
 * NO entran aquí: no tienen peldaño y siguen sancionados con su motivo.
 */
const STORY_REVEAL_DELAY_EYEBROW_MS = 0;
const STORY_REVEAL_DELAY_TITLE_MS = motion.staggerMs.base;
const STORY_REVEAL_DELAY_BODY_MS =
  motion.staggerMs.base + motion.staggerMs.tight;
const STORY_CARD_REVEAL_DELAYS_MS = [
  motion.staggerMs.base + 2 * motion.staggerMs.tight,
  motion.staggerMs.base + 3 * motion.staggerMs.tight,
  motion.staggerMs.base + 4 * motion.staggerMs.tight,
  motion.staggerMs.base + 5 * motion.staggerMs.tight,
] as const;
/** Interlineado del párrafo de inspiración (D2, mockup L96:
 *  `line-height: 1.7`): ninguna variante de `type.scale` mide un cuerpo de
 *  texto a este interlineado (bodySm da 1.55) -- mismo recurso que
 *  `ScDeckPillarBody`/`ScDeckNote` (story.deck.tsx) ya usan para el mismo
 *  problema en la diapositiva oscura. */
const STORY_CARD_INSPIRATION_LINE_HEIGHT = 1.7;

/*
 * Statement a pantalla completa (D12, segunda ronda 2026-08-06 de esta misma
 * spec: la nota de cierre de Story, promovida a bloque de cartel tras la
 * rejilla -- mockup L127-131). Los valores de aqui abajo son VERBATIM del
 * mockup, salvo el divisor de ancho (nuevo, ver `storyStatementFontSize` mas
 * abajo). Ninguno tiene equivalente en `motion.*`/`type.scale` -- mismo
 * criterio que el resto de constantes de esta entrega (D2/D3/D4/D9, arriba).
 *
 * Cuarta ronda (D1/D3, spec 2026-08-07-story-statement-scroll-observer-design.md):
 * el bloque deja de recorrerse con el scroll (D13 de la tercera ronda,
 * `useSlideDeck`) y pasa a revelarse con un `IntersectionObserver` de ida y
 * vuelta (`useReveal({ once: false })`, ver StoryLight mas abajo) -- el
 * encargo pide "cuando se llegue al elemento" y, al retroceder, la animacion
 * "a la inversa", no un recorrido paso a paso anclado por scroll.
 */
/** Duracion de la entrada de cada linea (mockup L128-130): no coincide con
 *  ningun paso de `motion.duration` (el mas cercano de la familia general de
 *  interfaz, `slower`, es 480ms; `ambient` -- que hubiera sido el paso mas
 *  cercano hasta esta entrega -- se retiro por 0 consumidores, ver
 *  `src/theme/tokens/motion.ts`). */
const STORY_STATEMENT_REVEAL_MS = 900;
/** Curva de la entrada (mockup L128-130): ninguna de las cinco curvas de
 *  `motion.easing` tiene estos cuatro puntos de control -- ni siquiera
 *  `overshoot` (la unica no monotona de la escala), ni tampoco `REVEAL.easing`
 *  (`@/motion/vocabulary`) -- constante local documentada, mismo recurso que
 *  la curva propia de `EASE_ENTRANCE` en `Sol.tsx` para el mismo problema. */
const STORY_STATEMENT_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";
/*
 * D5 (spec 2026-08-07): las tres constantes de retardo, retiradas en D13
 * (tercera ronda, 2026-08-06) cuando el paso lo marcaba el usuario con su
 * propio scroll, VUELVEN -- con el observer las tres lineas intersecan a la
 * vez salvo que algo las escalone, y el encargo las pide en cascada ("el
 * primero..., el segundo..., el tercero..."). Mismos valores del mockup que
 * ya llevaban antes de D13.
 */
const STORY_STATEMENT_DELAY_FIRST_MS = 0;
const STORY_STATEMENT_DELAY_SECOND_MS = 220;
const STORY_STATEMENT_DELAY_THIRD_MS = 440;

/*
 * AQUI VIVIERON STORY_STATEMENT_LINES/_TAIL_SCREENS/_SCREEN_HEIGHT/
 * _TRACK_HEIGHT, la geometria de la pista de 400dvh que D13 (tercera ronda,
 * 2026-08-06) necesitaba para que `useSlideDeck` tuviera un recorrido de
 * scroll que medir. Retiradas en D1/D2 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md: el bloque vuelve a
 * ser un `<section>` normal en flujo (`min-height: 100dvh`, sin pista ni
 * pin), asi que no hay ninguna geometria de scroll que declarar -- el
 * disparo lo da un `IntersectionObserver` sobre el propio texto (ver
 * StoryLight, mas abajo), no una medida en pantallas.
 */
/** `line-height`/`letter-spacing` del cartel (mockup L128-130: `1.04`/
 *  `-0.03em`): la variante mas cercana de `type.scale`, `display`, da
 *  1.03/-0.02em -- lo bastante distinto del pedido del mockup para no
 *  reutilizarla sin alterar la composicion que el usuario aprobo. */
const STORY_STATEMENT_LINE_HEIGHT = 1.04;
const STORY_STATEMENT_LETTER_SPACING = "-0.03em";
/** Suelo/techo de la tipografia fluida (mockup: `max(24px, min(10.5vw,
 *  19.2vh, 340px))`). Ver `storyStatementFontSize`, debajo, para el termino
 *  ANADIDO que acota tambien por ancho disponible -- el riesgo que la propia
 *  spec señala: esta formula por si sola puede desbordar horizontalmente en
 *  viewports estrechos.
 *
 *  LOS DOS EXTREMOS PASAN DE PIXELES A `rem` (WCAG 1.4.4, 2026-09-05), con
 *  el valor EXACTO que ya tenian con la raiz por defecto: 1.5rem = 24px y
 *  21.25rem = 340px. Un extremo en pixeles no sabe nada de la preferencia de
 *  tamano de texto del usuario, y a 320px es el suelo quien decide (10.5vw =
 *  33,6px, por encima del tope de ancho): medido en Chrome sobre el build
 *  servido con `Page.setFontSizes` a 16 y a 32, estas tres lineas median
 *  24px con las DOS raices mientras el cuerpo doblaba de 16 a 32. */
const STORY_STATEMENT_MIN_SIZE = "1.5rem";
const STORY_STATEMENT_MAX_SIZE = "21.25rem";

/**
 * Tamano de fuente de las tres lineas del statement (D12). Envuelve la
 * formula VERBATIM del mockup (`max(24px, min(10.5vw, 19.2vh, 340px))`) en
 * un `min()` EXTERIOR con un tope derivado del ancho disponible: el mockup
 * es un lienzo fijo de 1280px y puede permitirse ignorar el ancho real de la
 * ventana; este sitio no.
 *
 * Criterio del tope, documentado porque es una ESTIMACION (no hay navegador
 * en este entorno para medirlo -- ver el informe de la entrega): la linea
 * mas larga de las tres, en las dos copias publicadas, es "un nuevo
 * comienzo" (es, 17 caracteres con espacios; "a new beginning", en, tiene
 * 15). Para palo-seco en mayusculas y negrita, ~0.6em de avance medio por
 * caracter es la cifra habitual citada; aqui se usa 0.65em A PROPOSITO por
 * encima de esa cifra (un ancho asumido mayor da un tope MENOR, nunca al
 * reves -- mas margen de seguridad), y el producto (17 * 0.65 = 11.05) se
 * redondea AL ALZA a 12 por el mismo motivo. El resultado es
 * `calc((100vw - 2 * pad) / 12)`, donde `pad` es `var(--story-statement-pad)`
 * (Regla 13 del manual: no un literal nuevo) -- la MISMA custom property que
 * `ScStatement` declara para su `padding-inline` (ver su docblock, mas
 * abajo), asi que las dos no pueden desincronizarse ni cuando el pad cambia
 * de valor por breakpoint: un `var()` se resuelve de nuevo en cada
 * recalculo del navegador con el valor que la cascada tenga vigente en ESE
 * viewport -- a diferencia de un valor de tema leido en JS (fijo desde el
 * primer render), esto seria mobile-first sin que esta funcion necesite
 * saber en que breakpoint esta.
 *
 * Desigualdad que fija el pad base (Regla 24 del manual): en el viewport MAS
 * estrecho soportado (320px), el termino de ancho tiene que seguir en el
 * suelo de legibilidad o por encima --
 * `(320px - 2 * pad) / 12 >= 24px`. Despejando,
 * `pad <= (320px - 24px * 12) / 2 = 16px`. `theme.data.space[4]` (16px) es
 * EXACTAMENTE ese limite (igualdad, no margen de sobra):
 * `(320 - 2 * 16) / 12 = 24,00px` en el viewport minimo -- el suelo deja de
 * poder perforarse (el parrafo anterior de este mismo docblock, antes de
 * esta tarea, documentaba lo contrario: quedaba una eleccion consciente
 * "puede pisar el suelo, es aceptable"; con el pad mobile-first ya no hace
 * falta esa concesion). Desde `sm` (600px) el pad sube a
 * `theme.data.space[6]` (32px, el valor VERBATIM que este fichero ya usaba
 * para TODO ancho antes de esta tarea) porque a partir de ahi sobra ancho
 * para pagarlo sin volver a rozar el suelo -- ver la tabla 320/375/599/600px
 * del informe de esta tarea para el valor exacto y el termino ganador del
 * `min()` exterior en cada punto.
 *
 * LA DESIGUALDAD SOLO SE CUMPLIA CON LA RAIZ POR DEFECTO, y eso se corrige el
 * 2026-09-05 (ola de `inlineSpace`): el despeje de arriba resuelve `pad <=
 * 16px` en PIXELES, pero el pad estaba escrito en `rem`, asi que con la
 * preferencia de tamano de texto del usuario al 200 % (raiz 32px) valia 32px
 * y el termino de ancho caia a `(320 - 64) / 12 = 21,33px`, por debajo del
 * suelo de 24px que este mismo docblock declara intocable. Con
 * `theme.data.inlineSpace[4]` --`min(1rem, 5vw)`, ver su docblock en
 * `tokens/space.ts`-- el pad vale 16px a 320px CON CUALQUIER RAIZ, asi que la
 * igualdad `(320 - 2 * 16) / 12 = 24,00px` pasa a cumplirse tambien al 200 %.
 * Con la raiz por defecto no cambia ni un pixel a ningun ancho: a 320px los
 * dos terminos del `min()` valen 16px, y por encima gana el `rem`.
 *
 * EL SUELO SALE DEL `min()` EXTERIOR Y PASA A ENVOLVERLO (WCAG 1.4.4,
 * 2026-09-05). Hasta aqui la forma era `min(max(suelo, fluido), tope)`: el
 * tope de ancho podia PERFORAR el suelo, y de hecho lo perforaba en cuanto
 * el suelo crecia -- con el suelo ya en `rem` y la raiz a 32px, el tope
 * `(320 - 2*16)/12 = 24px` habria seguido devolviendo 24px y el arreglo de
 * la unidad no habria servido de nada. La forma nueva es
 * `max(suelo, min(fluido, tope))`: el suelo manda siempre.
 *
 * CON LA RAIZ POR DEFECTO NO CAMBIA NADA A NINGUN ANCHO SOPORTADO, y no es
 * una impresion: las dos formas solo difieren cuando el tope es MENOR que el
 * suelo (la vieja devuelve el tope, la nueva el suelo), y eso exige
 * `(100vw - 2*pad)/12 < 24px`, es decir `100vw < 288 + 2*pad`; con
 * `pad = min(16px, 5vw)` eso solo ocurre por debajo de 320px CSS, fuera del
 * soporte declarado (`MIN_VIEWPORT_PX`). Verificado ademas contra el
 * navegador: 24 / 29,8333 / 58,6667 / 101,333px a 320 / 390 / 768 / 1280px
 * con la raiz a 16, antes y despues.
 *
 * Y `white-space: nowrap` SE RETIRA de las tres lineas (mas abajo). Con el
 * suelo escalando, a 320px y raiz 32px la fuente pasa a 48px y la linea mas
 * larga pide 9,84em (medido: 236,11px de caja a 24px de fuente, o sea 0,579em
 * por caracter en los 17 de "un nuevo comienzo"), es decir 472px sobre 288px
 * utiles: con `nowrap` el cartel se saldria del viewport (perdida de
 * contenido, WCAG 1.4.10) en vez de envolver. La garantia de UNA linea por
 * cartel con la raiz por defecto no dependia de `nowrap` sino de esta misma
 * formula -- el tope divide el ancho util entre 12 em y el texto real ocupa
 * 9,84 --, asi que sigue en pie por construccion: siempre que el tope sea el
 * termino que manda, `9,84 * fuente <= 9,84 * tope < ancho util`. El reveal
 * por lineas tampoco depende de `nowrap`: cada linea es su propio elemento
 * con su propia transicion (ScStatementFirst/Second/Third), no un fragmento
 * de linea renderizada.
 */
function storyStatementFontSize(): string {
  return `max(${STORY_STATEMENT_MIN_SIZE}, min(10.5vw, 19.2vh, ${STORY_STATEMENT_MAX_SIZE}, calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12)))`;
}

/*
 * Rama clara: contenedor de contenido normal (padding + tope de ancho,
 * centrado -- sin cambios respecto a la version anterior).
 *
 * Rama oscura ($fullBleed, spec 2026-07-31-story-deck-hero-transition-design.md
 * D15c, tercera iteracion): las dos entregas anteriores acotaban esta
 * seccion a una caja fija (primero a sangre, luego a `STORY_DARK_MAX_WIDTH` x
 * `STORY_DARK_HEIGHT`). Con la presentacion de 6 diapositivas esa caja fija
 * desaparece: `ScTrack` (story.deck.tsx) es quien mide 6 pantallas de alto
 * ahora, y `ScStory` vuelve a ser solo un contenedor relativo sin medida
 * propia, que crece con su contenido. Pierde su `overflow: hidden`: CUALQUIER
 * ancestro con overflow distinto de `visible`/`clip` rompe el
 * `position: sticky` del stage de mas abajo (D15c) -- el recorte del
 * overscan del parallax pasa a `ScStage`, que no es ancestro de si mismo.
 * `background-color` explicito (no solo heredado de `body`) porque, con el
 * stage escalandose durante la apertura/cierre de la presentacion, el borde
 * que asoma detras tiene que ser el mismo `secondary[1100]` del encargo
 * (D8), no lo que hubiera detras por casualidad.
 *
 * EL `overflow-wrap` DE ABAJO PASA DE `break-word` A `anywhere` (critica externa
 * #19, 2026-09-04), y la diferencia no es de matiz: `break-word` parte la LINEA
 * pero deja el `min-content` de la caja en la palabra entera, asi que cualquier
 * caja que se dimensione por su contenido --un item flex con `min-width: auto`,
 * una pista `auto`-- sigue inflandose hasta esa palabra y saliendose. Medido en
 * Chrome real sobre el build de produccion a 320 px con la raiz a 32px: el
 * kicker de esta misma seccion, que es un contenedor flex y por tanto se
 * dimensiona asi, pedia 314,47 px en una caja de 224 y se salia 42,47 px con
 * `break-word` puesto y heredado. Con `anywhere` el `min-content` baja y la caja
 * encoge. Es la misma correccion, y por el mismo motivo, que ya llevaban `ScDd`
 * y `ScTableWrap` en `legalPage.parts.tsx`; las otras cuatro secciones de la
 * home la reciben en el mismo commit.
 */
const ScStory = styled.section<{ $fullBleed: boolean }>`
  /* WCAG 2.1 SC 1.4.4 (critica externa #13, corregida en la #19). overflow-wrap
     SE HEREDA, asi que una sola declaracion en la raiz de la seccion cubre las
     dos ramas de tema y todo su texto. Solo parte una palabra cuando NO cabe
     entera en su propia linea -- a tamano normal no cambia ni un salto de
     linea --, y es lo unico que evita que un termino largo (una URL, un
     compuesto de marca) siga saliendose de su caja despues de acotar las
     pistas del grid: acotar la caja sin permitir la rotura mueve el recorte,
     no lo quita.

     El valor pasa de break-word a anywhere en la critica externa #19: ver el
     docblock de esta seccion para la medicion. */
  overflow-wrap: anywhere;

  /* La rama CLARA ya no declara nada aqui, y no es que se haya quedado vacia
     por descuido: su caja acotada (relleno, tope de ancho y centrado) vive
     desde la critica #15 en ScStoryInner, justo debajo. El motivo esta en el
     docblock de ese componente -- resumido: el statement pasa a ser hijo de
     esta seccion tambien en claro, y no podia heredar el tope de 1280px de un
     bloque que es a sangre completa por diseño.

     SIN BACKTICKS: esto vive dentro del template literal de
     styled-components (regla 23 de RULES.md, task/lessons.md 2026-07-25). */
  ${({ $fullBleed, theme }) =>
    $fullBleed &&
    css`
      position: relative;
      background-color: ${theme.data.semantic.bg};
    `}
`;

/*
 * La caja acotada de la rama CLARA: relleno, tope de ancho y centrado. Vivio
 * hasta la critica #15 en `ScStory` mismo (rama `$fullBleed === false`), y se
 * muda aqui SIN cambiar ni una declaracion porque `#statement` pasa a ser hijo
 * de `#story` tambien en claro (hallazgo C10, ver el docblock de
 * `ScStatement`). Dejarlas en la seccion habria metido el cartel a pantalla
 * completa dentro de una caja de 1280px con 24px de relleno lateral: la misma
 * estructura de documento, pero con el statement recortado. Con la caja aqui,
 * la geometria pintada es la MISMA que antes del cambio -- este div ocupa
 * exactamente el sitio que ocupaba la seccion, y el statement queda a sangre
 * completa como hermano suyo dentro de ella.
 *
 * `padding`: el termino INLINE lee `inlineSpace` y el de BLOQUE sigue en
 * `space` (ver el docblock de `inlineSpace` en `tokens/space.ts`): mismo valor
 * con la raiz por defecto, acotado al viewport con la fuente al 200 %.
 */
const ScStoryInner = styled.div`
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.inlineSpace[5]};
  /* Recorte del relleno de la FRONTERA con el statement (Ola B,
     2026-08-16). Medido a 1440x900 en tema claro, scrollY 1500: entre
     el ultimo texto de Story (acaba en y=383) y el primero del
     statement (empieza en y=739) habia 356 px sin nada a la vista, un
     40 % del viewport. Ningun margen que culpar -- margin-bottom de
     Story y margin-top del statement son los dos 0 px: el hueco lo
     ponen los rellenos.

     Solo se recorta ESTE lado, no el de arriba: la respiracion sobre
     Story separa el hero de la seccion y esa si esta bien. Y solo se
     toca Story, no el statement, porque la medicion desmintio la
     hipotesis obvia -- el statement declara min-height como suelo y
     centra su contenido con justify-content: center, asi que su
     padding-block NO participa del hueco: lo que separa su borde
     superior de su primer texto es el centrado, no el relleno.
     Recortarselo no habria movido un pixel.

     space[7] en vez de space[9]: de 96 a 48 px, la mitad exacta. El
     hueco baja de 356 a 308 px. El resto es estructural (el statement
     ES un bloque de un viewport con su contenido centrado, por
     diseño) y cerrarlo del todo exige decidir que ocupa el espacio,
     no restar relleno.

     SIN BACKTICKS: esto vive dentro de un template literal css de
     styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
  padding-block-end: ${({ theme }) => theme.data.space[7]};
  /* grid.sectionMax, NO grid.navMax (critica externa #12,
     2026-08-19). Esta rama leia el tope de la PILDORA DEL NAVBAR como
     ancho de contenido de la seccion -- contra el docblock del propio
     navMax, que se declara exclusivo de esa pildora y exige que las
     dos medidas puedan divergir sin arrastrarse. Coincidian en el
     numero (1280px) y por eso nadie lo notaba: el dia que alguien
     retocara la pildora, la seccion se habria movido con ella. El CSS
     renderizado no cambia ni un caracter; lo que cambia es de que
     promesa cuelga. */
  max-width: ${({ theme }) => theme.data.grid.sectionMax};
  margin-inline: auto;
`;

/*
 * Reveal de sección en CLARO (mismo patrón que `ScReveal`/`ScDarkContent` en
 * Features.tsx). Duración/easing unificados (D7, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`):
 * 480ms + decelerate en vez de `duration.slow` (320ms) que llevaba antes --
 * mismo lenguaje de entrada que `ScStepReveal` en Journey.tsx, que hasta esa
 * entrega usaba la MISMA duración pero `easing.emphasized`, sin ninguna razón
 * documentada para la divergencia entre las dos secciones.
 *
 * Task 19 (curva propia de REVEAL, punto 3 del brief) sustituye
 * `easing.decelerate` por `REVEAL.easing` aquí Y lee los tres campos del
 * token (`REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift`) en vez de
 * `theme.data.motion.duration.slower`/`easing.decelerate` + un `16px`
 * suelto -- incluso siendo el MISMO valor numérico, es la migración que da a
 * `REVEAL` su primer consumidor real (gate F2: 0 consumidores antes de esta
 * tarea). Es además la mitad "padre" de D7: los 4 grupos hijos (más abajo)
 * migran a la MISMA gramática en esta misma tarea.
 */
const ScGrid = styled.div`
  display: grid;
  /* minmax(0, 1fr), NO 1fr (WCAG 2.1 SC 1.4.4, critica externa #13). 1fr es
     minmax(auto, 1fr) y ese auto es el TAMANO MINIMO AUTOMATICO de la pista:
     el min-content de lo que contiene. Con la raiz a 150-200% el min-content
     de ScContent (que arrastra el suelo de ScPillarGrid, ver mas abajo) supera
     el ancho disponible y la pista crece POR ENCIMA del contenedor -- medido a
     390px de ancho y raiz 32px: pista de 480px dentro de una caja de 294px.
     Como html declara overflow-x: clip (GlobalStyles, deliberado por el sticky
     de los decks, regla 21), ese sobrante no se puede recuperar con scroll: es
     texto perdido. El 0 del minmax solo cambia el MINIMO de la pista; el 1fr
     sigue repartiendo igual, asi que a raiz 16px la geometria es identica
     (342px medidos antes y despues). */
  grid-template-columns: minmax(0, 1fr);
  /* D11 (segunda ronda, 2026-08-06): stretch, NO center. SIN BACKTICKS en
     este comentario a proposito (vive dentro del template literal de
     styled-components, un backtick lo cierra y rompe el build -- leccion del
     repo, task/lessons.md 2026-07-25, reincidida el 2026-08-02). Medido en
     navegador antes de tocar nada: columna de la figura 548px, columna de
     contenido 863px. Con center la tarjeta de la figura quedaba flotando
     centrada y corta; con stretch (el valor por defecto de CSS Grid, que
     center estaba anulando) el item de la figura ocupa el alto COMPLETO de
     la fila del grid sin que nadie fije un numero. Solo tiene efecto visible
     desde el breakpoint lg (abajo), donde las dos columnas comparten fila --
     en columna unica cada item tiene su propia fila y no hay nada que
     estirar. */
  align-items: stretch;
  gap: ${({ theme }) => theme.data.space[7]};
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    grid-template-columns: minmax(280px, ${STORY_FIGURE_WIDTH}) minmax(0, 1fr);
    gap: ${({ theme }) => theme.data.space[8]};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Columna de la figura de la rama CLARA.
 *
 * EL BLOQUE `[data-theme="dark"] &` NO ES ESTILO: ES EL CANDADO DE PESO DEL
 * TEMA OSCURO (P1 numero 4 de la critica externa #19, 2026-09-06; ancla
 * tecnica "ningun tema descarga mas de 100 KB de arte que no pinta"). Sin el,
 * una visita OSCURA descarga la figura CLARA de esta seccion y no la pinta
 * jamas.
 *
 * EL DEFECTO, MEDIDO. Sobre el build de `f3594ad` servido por interceptacion
 * de rutas en Chrome (1440x900, tema oscuro fijado en `localStorage`, 3 s tras
 * `load`, sin tocar el scroll): a DPR 1 el navegador pedia
 * `/figures/journey-presenting-640.webp` (87.260 B) y a DPR 2
 * `/figures/journey-presenting-1024.webp` (163.368 B), y NINGUNO de los dos
 * aparecia en el DOM tras hidratar. La misma medicion con este bloque puesto
 * da CERO peticiones de `journey-presenting-*` en oscuro. El ancla solo se
 * cruza a DPR 2, y las seis corridas del protocolo de perf van a DPR 1: por
 * eso el defecto sobrevivio diecinueve criticas.
 *
 * LA CAUSA RAIZ. El HTML horneado es SIEMPRE la rama clara -- `ThemeProvider`
 * no puede leer `localStorage` durante el render sin romper el export estatico
 * (ver su docblock y el de `HeroBackdrop`), asi que el tema se corrige en un
 * efecto, ya en cliente. El parser, por tanto, ve esta figura tambien en una
 * visita oscura, y `loading="lazy"` NO la salva: en la geometria CLARA la
 * figura queda a unos 770 px del borde superior, dentro del umbral de carga
 * perezosa de Chrome, asi que el cargador la pide en el PRIMER layout, mucho
 * antes de que la hidratacion sustituya la rama entera por el deck oscuro.
 *
 * POR QUE ESTE BLOQUE LO CIERRA. La carga perezosa es por INTERSECCION, y un
 * elemento sin caja no interseca nunca. El script anti-flash escribe
 * `data-theme` en el `<html>` desde el `<head>` (indice 4.376 del HTML
 * exportado) y el CSS de styled-components viaja en ese mismo `<head>` (un
 * unico `<style>`, que cierra en el 89.890), los dos ANTES del `<body>`
 * (89.897). En una visita oscura, pues, esta columna ya no tiene caja en el
 * primer layout y el cargador perezoso no llega a pedir la imagen; despues, la
 * hidratacion desmonta la rama clara y no vuelve. En claro no cambia
 * absolutamente nada (el selector no aplica) y sin JavaScript tampoco: sin
 * script anti-flash el atributo ni siquiera existe (medido: `data-theme` es
 * `null`) y la figura se descarga y se pinta igual que siempre.
 *
 * ES UNA CONJUNCION CON `loading="lazy"`, y eso importa para quien venga
 * despues: una imagen NO perezosa se pide en cuanto el parser ve su `src`,
 * tenga caja o no. Medido sirviendo este mismo build sin el atributo: la
 * visita oscura vuelve a pedir 702.088 B de figuras claras que no pinta
 * (`journey-presenting-1024` 163.368 + `contact-waving-1024` 185.716 +
 * `story-pointing-640` 106.770). Quitar el `loading="lazy"` de esta figura
 * reabre el hallazgo, y por eso el candado de `Story.test.tsx` ata las DOS
 * cosas a la vez, no solo la regla.
 *
 * VA EN EL ENVOLTORIO Y NO EN EL `<img>` a proposito: ocultar solo la imagen
 * dejaria a `ScHalo` pintando su degradado radial sobre un hueco vacio durante
 * la prehidratacion de una visita oscura. Ocultar la columna se lleva los dos.
 *
 * LO QUE SE DESCARTO, tambien por medicion:
 * - Renderizar `src`/`srcSet` solo tras confirmar el tema en cliente: sin
 *   JavaScript la rama clara perderia la figura, y su `alt` es CONTENIDO
 *   ("Figura celestial ofreciendo la palma abierta"), no decoracion. Hoy con
 *   `javaScriptEnabled: false` la figura se pinta (450x658 a DPR 1 y 2); con
 *   esa via dejaria de hacerlo.
 * - El patron de `HeroBackdrop` (no emitir arte en el HTML y sembrarlo en el
 *   efecto de montaje leyendo `readResolvedTheme()`): mismo coste que el
 *   anterior MAS retrasar la figura CLARA a despues de la hidratacion.
 *   `HeroBackdrop` puede permitirselo porque sus capas son decorativas
 *   (`aria-hidden`, `alt=""`) y no prometen nada sin JavaScript; esta figura
 *   si.
 *
 * MATRIZ VERIFICADA (regla 2 de la leccion 2026-09-06): tema claro/oscuro x
 * DPR 1/2 x 1440x900 y 390x844 x `reduce` activo e inactivo x `/` y `/en` x
 * JavaScript activo y apagado. Queda FUERA la recarga con el tema ya fijado,
 * que no la cambia: la regla es CSS estatico del `<head>` y no depende de
 * ningun estado de cliente.
 */
const ScFigureWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(${STORY_FIGURE_HEIGHT}, 70vh);

  [data-theme="dark"] & {
    display: none;
  }
`;

const ScHalo = styled.div`
  position: absolute;
  inset: ${STORY_HALO_INSET};
  width: 100%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: ${STORY_HALO_GRADIENT};
  pointer-events: none;
`;

/*
 * Envoltorio del desplazamiento de scroll de la figura (D1, ver el docblock
 * de STORY_FIGURE_SCROLL_SHIFT en story.layers.ts para el porque no vive
 * directamente en ScFigureImg): un elemento DISTINTO al que ya anima
 * transform con @keyframes.
 *
 * El ancho se declara AQUI con la MISMA formula que antes llevaba
 * ScFigureImg (min(STORY_FIGURE_WIDTH, 100%)) y no se deja en "auto" -- este
 * div es el item de flex de ScFigureWrap ahora, y un item de flex con ancho
 * "auto" se dimensiona por shrink-to-fit de SU CONTENIDO; con el hijo
 * (ScFigureImg) declarando a su vez `width: 100%` contra ESTE envoltorio,
 * las dos reglas dependerian una de la otra (el envoltorio de su hijo, el
 * hijo de un envoltorio que todavia no tiene ancho resuelto). CSS resuelve
 * esa circularidad tratando el porcentaje del hijo como si el ancho del
 * padre fuera indefinido (CSS2.1 SS10.3.3: un porcentaje contra un
 * contenedor sin ancho explicito se trata como "auto"), lo que aqui
 * colapsaria la imagen -- la misma familia de fallo que ya documenta
 * task/lessons.md (2026-07-28, "Una altura porcentual del mockup presupone
 * el alto fijo de SU contenedor"), en el eje horizontal en vez del vertical.
 * Declarando la formula real aqui, el envoltorio tiene un ancho DEFINITIVO
 * (se resuelve contra ScFigureWrap, que a su vez lo tiene por el grid que lo
 * contiene) y el `width: 100%` del hijo deja de ser circular. El resultado
 * es la MISMA caja, pixel a pixel, que ocupaba ScFigureImg antes de este
 * envoltorio.
 */
const ScFigureShift = styled.div`
  width: min(${STORY_FIGURE_WIDTH}, 100%);
  transform: translateY(
    calc(${STORY_FIGURE_SCROLL_SHIFT} * var(--story-progress, 0))
  );

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const ScFigureImg = styled.img`
  position: relative;
  display: block;
  /* El ancho ya lo fija ScFigureShift (ver su docblock): aqui solo se llena
     ese envoltorio, ahora con un ancho definitivo, sin circularidad. */
  width: 100%;
  height: auto;
  aspect-ratio: ${STORY_FIGURE_ASPECT};
  /* GlobalStyles declara img { object-fit: cover } para todo el sitio; con
     la caja del mockup (375/548) sobre un arte 2:3, cover recortaria ~2.5%
     del alto (medido en navegador, revision 2026-07-28). contain no recorta
     nada y el margen sobrante es alfa puro, invisible. */
  object-fit: contain;
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};

  /* CURVA POR TOKEN, no la palabra clave nativa (critica externa #9,
     2026-08-17; regla 48 de RULES.md). Hasta hoy esta flotacion declaraba
     ease-in-out a secas: una curva que no nace de src/theme/tokens/motion.ts
     y que el detector de anti-patrones no podia ver, porque su unica familia
     de palabra clave vigilaba ease-in SUELTO y eximia por construccion tanto
     ease-in-out como ease a secas (hueco cerrado en la misma revision, ver la
     familia easing-keyword del detector).
     El token elegido es standard, cubic-bezier(0.4, 0, 0.2, 1): es la unica
     de las cinco curvas del sistema que arranca Y termina suave, que es la
     intencion de una flotacion infinita que invierte el sentido en el 50%.
     decelerate y accelerate son curvas de un solo lado, emphasized frena
     mucho mas tarde y overshoot rebota -- las cuatro cambiarian el caracter
     del movimiento, no solo su procedencia. Mismo token y mismo razonamiento
     que ScFigure en Contact.tsx y ScStar en Footer.tsx, las otras dos piezas
     de UI ordinaria migradas en esta misma ola. */
  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} ${STORY_FIGURE_FLOAT_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard} infinite;
  }
`;

/*
 * AQUI VIVIERON ScNoteShift/ScNoteCard/ScSparkle (la tarjeta flotante de la
 * nota, con su desplazamiento de scroll propio y su icono). RETIRADOS en la
 * segunda ronda de esta entrega (D12, spec 2026-08-06): la nota
 * (`Home.story.note`) deja de ser una tarjeta flotante y pasa a ser el
 * statement a pantalla completa (`ScStatement`, mas abajo, tras
 * `StoryLight`). Sin consumidor, se retiran tambien sus constantes
 * exclusivas de story.layers.ts (`STORY_CARD_BG`/`STORY_CARD_BORDER`/
 * `STORY_CARD_SHADOW`/`STORY_CARD_FLOAT_MS`/`STORY_NOTE_SCROLL_SHIFT`) de la
 * lista de imports de este fichero -- siguen exportadas alli (fuera del
 * alcance de esta entrega, que solo toca Story.tsx/Story.test.tsx), pero ya
 * no las consume nadie.
 */

const ScContent = styled.div`
  display: flex;
  flex-direction: column;
`;

/* Kicker: mockup usa `var(--primary-600)` (L77). Se resuelve contra
   `semantic.brandText`, no contra un paso de palette -- mismo mapeo que ya
   aplica `ScKicker` en Hero.tsx para el mismo rol visual ("etiqueta de
   marca"). */
/* Segunda pieza de la cascada de D9 (retardo 80ms): mismo mecanismo que
   ScEyebrowRow -- ver su docblock, más arriba -- reutilizando el MISMO
   `data-revealed` de ScGrid. */
const ScTitle = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};
  transition-delay: ${STORY_REVEAL_DELAY_TITLE_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08): el
 * degradado de texto (`background-clip: text` + `STORY_ACCENT_GRADIENT_LIGHT`/
 * `_DARK`, ambos retirados de `story.layers.ts`) pasa a color solido. Motivo:
 * la auditoria senalo que `color: transparent` deja esta pieza FUERA del
 * alcance de `contrast.ts` -- nadie puede medir el contraste de un degradado
 * de texto, asi que nadie lo habia medido nunca (el propio spec de origen,
 * 2026-07-29 D10, lo admitia: "estas paradas se verifican a ojo... el helper
 * contrast.ts del repo solo resuelve colores planos"). Un color solido SI se
 * puede medir.
 *
 * El color elegido no es nuevo: es el MISMO `semantic.brandText` que este
 * bloque ya usaba como fallback de `@supports not (background-clip: text)` --
 * y el MISMO rol que `ScKicker` (mas arriba en este fichero) ya resuelve en
 * esta seccion, en las DOS ramas (D10 del brief de la tarea: "usar el token
 * de acento que la seccion ya usa para otros elementos"). `ScAccent` en si
 * se renderiza en las DOS ramas (verificado leyendo el JSX: StoryLight lo usa
 * dentro de `ScTitle`, StoryDeckDark dentro de `ScDeckTitle`), asi que hacen
 * falta las dos medidas:
 *
 * - Rama CLARA: `ScAccent` se pinta sobre la pagina (`ScStory` no fija fondo
 *   propio en esta rama) -- brandText sobre `semantic.bg` da 5.59:1.
 * - Rama OSCURA: se pinta sobre la escena `StoryCosmicBeing`, cuyo void
 *   (`STORY_COSMIC_BEING_VOID`, "#05010e") es lo unico medible por codigo
 *   (jsdom no compone las capas WebP reales) -- brandText sobre ese void da
 *   13.55:1. Las dos por encima de AA (4.5:1); medicion completa y formula en
 *   `Story.test.tsx`, describe "Task 12".
 */
const ScAccent = styled.span`
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* Tercera pieza de la cascada de D9 (retardo 140ms): mismo mecanismo que
   ScEyebrowRow/ScTitle -- ver el docblock de ScEyebrowRow, más arriba. */
const ScBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};
  transition-delay: ${STORY_REVEAL_DELAY_BODY_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * TASK 14, fix de revision (plan premium F3, 2026-08-11): `Home.story.support`
 * -- el parrafo trasladado desde `Home.hero.support` -- va ANTES del primer
 * contenido actual de Story (kicker/eyebrow), tal como pide el brief
 * literalmente ("antes del primer contenido actual de Story"), no despues del
 * cuerpo (la primera entrega lo dejo al final por error de lectura).
 *
 * Extiende `ScBody` en vez de reescribir su hoja de estilos: MISMA tipografia
 * y MISMO recorrido de reveal (opacity/transform, `[data-revealed="true"] &`),
 * solo dos ajustes de posicion:
 * - `margin-block-start: 0`: es ahora el PRIMER hijo de ScContent (el hueco
 *   que ocupaba ScEyebrowRow, que no declara margen propio); heredar el
 *   space[5] de ScBody habria dejado un hueco vacio arriba del bloque.
 * - `margin-block-end: space[5]`: MISMO espaciado que `ScBody` ya declaraba
 *   como `margin-block-start` (el separador entre el bloque de intro y lo que
 *   viene despues). La convencion del fichero es margen SUPERIOR en el
 *   elemento que se separa del anterior; aqui es la UNICA excepcion
 *   deliberada, porque este parrafo es el que abre -- el hueco tiene que ir
 *   DESPUES de el (hacia el eyebrow que lo sigue), no antes (no hay nada por
 *   encima de lo que separarse).
 * - `transition-delay: STORY_REVEAL_DELAY_EYEBROW_MS` (0ms, la constante
 *   IMPORTADA, regla 13 del manual): heredar el retardo de `ScBody` (140ms,
 *   pensado para la TERCERA pieza de la cascada) habria dejado este parrafo
 *   invisible mientras el eyebrow y el titulo, mas abajo en el DOM, ya se
 *   veian -- un orden de entrada invertido respecto al de lectura. Como
 *   primer elemento visual, entra en el mismo instante que el eyebrow (los
 *   dos a 0ms es valido: no hay ninguna regla que exija un escalon distinto
 *   por elemento, solo que el orden de entrada no contradiga el de lectura).
 */
const ScSupportLead = styled(ScBody)`
  margin-block-start: 0;
  margin-block-end: ${({ theme }) => theme.data.space[5]};
  transition-delay: ${STORY_REVEAL_DELAY_EYEBROW_MS}ms;
`;

/*
 * La copia de un pilar del deck OSCURO: titulo, subtitulo y cuerpo apilados.
 *
 * AQUI VIVIERON `ScPillarRow` (rejilla de dos columnas: numero | copia) y
 * `ScPillarNumber` (el numeral "01".."04"). Se retiran con la decision del
 * dueno de la critica externa #19 ("una sola forma de contar"): sin numeral
 * no queda columna que reservar, y una rejilla de una sola pista no es una
 * rejilla -- la copia es hija directa de la diapositiva. El porque completo,
 * con las cifras medidas parada a parada, esta en el comentario de la
 * diapositiva de pilar (`StoryDeckDark`, al final de este fichero).
 *
 * Se conserva el nombre `ScPillarCopy` porque sigue siendo exactamente lo que
 * era -- la columna de texto del pilar --, solo que ahora sin hermano.
 */
const ScPillarCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};
`;

/*
 * Barra + kicker (D4, "eyebrow"): SOLO rama clara -- envoltorio NUEVO, no
 * mutación de `ScKicker`, que la rama OSCURA reutiliza tal cual
 * (StoryDeckDark, más abajo, la sigue consumiendo directamente). La barra es
 * puramente decorativa (`aria-hidden`): puntuación visual, no contenido (D4).
 * Primera pieza de la cascada de D9 (retardo 0, ver
 * STORY_REVEAL_DELAY_EYEBROW_MS): arranca invisible y desplazada, y solo se
 * resuelve bajo el `data-revealed` que ya escribe el `useReveal` de
 * `ScGrid` -- ningún observer nuevo.
 */
const ScEyebrowRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};
  transition-delay: ${STORY_REVEAL_DELAY_EYEBROW_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/* La barra (D4, 1.75rem x 2px del mockup L75) vivía aquí como `ScEyebrowBar`,
   un span decorativo hermano del kicker, y solo se pintaba en ESTA rama:
   una de las cuatro combinaciones sección x tema improvisaba (crítica
   externa #15, 2026-09-02). Desde la integración de la ola K la regla es
   el `::before` del primitivo compartido `Kicker` (src/components/ui/Kicker)
   y se pinta en las cuatro. */

/*
 * Rejilla de tarjetas (D2): sustituye a la antigua `ScPillars` (columna con
 * `border-block-start` por fila). `repeat(auto-fit, minmax(15rem, 1fr))`
 * mapea el `minmax(240px, 1fr)` del mockup (L85) al paso de `space` más
 * cercano por abajo que sigue dejando cuatro tarjetas legibles en una
 * columna estrecha.
 */
const ScPillarGrid = styled.div`
  display: grid;
  /* El suelo va envuelto en min(..., 100%) (WCAG 2.1 SC 1.4.4, critica externa
     #13): 15rem es una medida RELATIVA A LA RAIZ, asi que con la preferencia
     del usuario al 200% valen 480px -- mas que los 294px disponibles a 390px
     de ancho -- y la pista desborda el contenedor sin scroll que lo recupere
     (html declara overflow-x: clip, regla 21). min(15rem, 100%) conserva el
     suelo mientras cabe y lo rinde al ancho real cuando no; con la raiz por
     defecto min() resuelve a los mismos 15rem y no cambia nada. */
  grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: ${({ theme }) => theme.data.space[4]};
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

/*
 * Envoltorio de ENTRADA de cada tarjeta (D9): capa SEPARADA de
 * `ScPillarCard` (más abajo) por el mismo motivo que separa `ScItem`/
 * `ScCard` en Features.tsx -- si el `transition-delay` de la cascada de
 * entrada viviera en el MISMO elemento que anima `transform` en hover (D3),
 * cualquier hover posterior a la entrada heredaría ese mismo retardo (hasta
 * 380ms en la cuarta tarjeta) antes de reaccionar, porque `transition-delay`
 * se aplica a TODOS los cambios de esa propiedad en ese elemento, no solo al
 * primero. Con dos elementos, la entrada (aquí) y el hover (`ScPillarCard`)
 * no comparten `transition-delay`.
 *
 * `:nth-child` (D9, mismo patrón de escalonado por `nth-child` que `ScCopy`
 * en Hero.tsx), NO una prop `$index`: las CUATRO tarjetas son el MISMO
 * componente en el MISMO contenedor (`ScPillarGrid`), así que su posición ya
 * la da el DOM -- no hace falta que React se la pase por prop. El selector
 * es DESCENDIENTE (`[data-revealed="true"] &`), no `&[data-revealed="true"]
 * > &`, porque el atributo vive en `ScGrid` (un ANCESTRO, no el padre
 * directo) -- REUTILIZADO del `useReveal` que ya corre sobre ella (D9: "uno
 * solo, sobre el contenedor"), sin montar un segundo `IntersectionObserver`.
 */
const ScPillarCardItem = styled.div`
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  [data-revealed="true"] &:nth-child(1) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[0]}ms;
  }
  [data-revealed="true"] &:nth-child(2) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[1]}ms;
  }
  [data-revealed="true"] &:nth-child(3) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[2]}ms;
  }
  [data-revealed="true"] &:nth-child(4) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[3]}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Superficie visible de la tarjeta (D2, tabla de mapeo mockup -> token) +
 * hover (D3). Componente NUEVO, no `ScPillarRow` mutado: la regla D1 de la
 * spec prohibía tocar `ScPillarRow` (la fila de dos columnas que el deck
 * oscuro extendía) o levantar la geometría de tarjeta encima de ella. Aquella
 * fila ya no existe -- se retiró con el numeral de pilar en la crítica externa
 * #19 --, y esta tarjeta sigue siendo, como entonces, una pieza propia.
 *
 * `box-shadow` en la transición de hover: excepción ya sancionada (D3, "el
 * mismo motivo que los tintes de estado", enmienda §9 del sistema de lujo),
 * acotada a hover, nunca ambiental.
 *
 * Task 9 (craft de interacción, punto 3 del brief): la duración del
 * hover-lift se UNIFICA de motion.duration.base (200ms) a PRESS.durationMs
 * (100ms) + PRESS.easing -- la misma entrada de transform pasa a gobernar
 * también el press de abajo (:active), y CSS no admite dos duraciones
 * distintas para una sola propiedad en la misma lista. box-shadow se quedó
 * entonces en duration.base/easing.standard, sin tocar -- solo se unificó el
 * hover-lift, no la sombra.
 *
 * Task 19 (punto 2 del brief, "unificar transition de hover base->fast")
 * termina esa unificación: box-shadow pasa de `duration.base` (200ms) a
 * `duration.fast` (100ms), mismo `easing.standard` -- ahora las DOS
 * propiedades de esta lista entran/salen en el mismo tiempo de reloj (100ms),
 * aunque con curvas distintas (`PRESS.easing` para transform, `standard`
 * para box-shadow, un tinte de estado no una primitiva de press). Mismo
 * cambio que ya llevaba `Card.tsx` (`src/components/ui/Card/Card.tsx`) desde
 * Task 9 -- esta tarea alinea Story/Features con ese precedente.
 *
 * TARJETA FANTASMA, corregido en la critica externa #13 (2026-08-19). Esta
 * tarjeta se pintaba `semantic.surface` (blanco puro) sobre una pagina
 * `semantic.bg` casi identica -- 1.044:1 medido, invisible como superficie --
 * y su unica delimitacion, un filete de `semantic.border` (`neutral[100]`),
 * daba 1.124:1 contra la propia tarjeta y 1.076:1 contra la pagina. Sin
 * sombra en reposo, el conjunto no leia como tarjeta: leia como texto suelto
 * sobre el fondo. Comprobado tambien en captura de navegador real, no solo
 * por la cifra.
 *
 * El borde pasa a `palette.neutral[600]`: **3.111:1 contra la superficie de
 * la tarjeta y 2.980:1 contra la pagina**, frente a 1.124/1.076. Es el MISMO
 * paso y el MISMO motivo que `Input.tsx` ya documenta para el borde de sus
 * campos -- ese docblock deja escrito el hallazgo de sistema que se aplica
 * aqui letra por letra: `semantic.borderStrong`, el rol que el sistema ofrece
 * como "borde fuerte", NO llega a 3:1 en ninguna rama (1.999:1 en claro con
 * `neutral[400]`, medido de nuevo aqui: 2.004:1 contra blanco). Elegir el rol
 * semantico habria dejado el borde por debajo del unico umbral objetivo que
 * existe para un limite no textual (WCAG 1.4.11).
 *
 * NO se anade sombra en reposo, y no por olvido: la Task 12 ("dieta de
 * ornamento B", misma familia de hallazgo "ghost-card") dejo la regla escrita
 * en `contact.layers.ts` -- borde O sombra, nunca los dos. Esta tarjeta se
 * queda con el borde, igual que la de Contacto. El `elevation[1]` de hover no
 * se toca.
 *
 * El hover TAMPOCO refuerza el borde a `borderStrong` como hace `Card.tsx`:
 * con el reposo ya en `neutral[600]`, ese "refuerzo" lo DEBILITARIA
 * (2.004:1 < 3.111:1) -- exactamente la trampa que `Input.tsx` documenta para
 * su propio estado de foco.
 *
 * ## LA MEDIDA DE LINEA DE ESTA TARJETA NO CONSUME `grid.prose`, Y ES UNA
 * DECISION MEDIDA -- critica externa #17 (2026-09-03)
 *
 * EL HALLAZGO, y es CIERTO: en la misma pagina y en el mismo rol -- texto de
 * cuerpo dentro de una tarjeta -- conviven dos medidas de linea separadas por
 * casi un 50 %. Medido en navegador real (servidor de desarrollo, 1440x900,
 * tema claro, `document.visibilityState` en `visible`, contando caracter a
 * caracter con `Range.getClientRects()` sobre lineas llenas y descartando
 * siempre la ultima linea de cada parrafo, que no la limita el ancho):
 *
 *   tarjetas de Features/Journey   4 nodos, 5 lineas llenas
 *     caja 439,03px (= `grid.prose`)   61-70 caracteres, media 64,6
 *   tarjetas de pilar de Story     8 nodos, 16 lineas llenas
 *     caja 301px (sin `max-width`)     35-48 caracteres, media 43,2
 *
 * (Los 439,04px son este mismo token a 14px: `prose` se expresa en `ch`, asi
 * que su valor en pixeles depende del cuerpo de quien lo lee.)
 *
 * Y AUN ASI ESTAS OCHO PIEZAS NO PASAN A LEER EL TOKEN, porque ponerlo aqui
 * NO MOVERIA NI UN CARACTER. Barrido de viewport de 320 a 1920px sobre el
 * ancho real del parrafo de tarjeta: el maximo de TODO el recorrido son
 * 442px, a 540px de viewport, y el token vale 439,04px. Es decir, `max-width`
 * solo llegaria a morder en una franja de siete pixeles de viewport (536px
 * da 438px y 544px cae a 190px, cuando la rejilla salta de una columna a
 * dos), y ahi recortaria 2,96px. A 1440px, que es donde se midio el hallazgo,
 * el parrafo mide 301px: 138px POR DEBAJO del token. Es el mismo caso que el
 * docblock de `grid.prose` ya razona para el movil -- "cambiar un `max-width`
 * que no muerde no moveria ni un caracter" -- y se resuelve igual, para no
 * dejar un token que promete gobernar algo que gobierna otro.
 *
 * LO QUE SI DECIDE ESTA MEDIDA es la REJILLA, no el token. A 1440px la
 * tarjeta mide 351px (los 301px de texto mas 24px de `space[5]` y 1px de
 * borde por lado), porque `ScPillarGrid` declara cuatro pistas de
 * `minmax(min(15rem, 100%), 1fr)` y los cuatro pilares caben en una fila.
 * Para que el parrafo alcanzara los ~439px que entregan 64 caracteres harian
 * falta pistas de ~489px, es decir DOS por fila en vez de cuatro: los pilares
 * pasarian de una fila de cuatro a un 2x2. Eso es una decision de composicion
 * del dueño -- cambia la lectura de la seccion entera, no la de un parrafo --
 * y queda declarada aqui, no tomada desde una tarea de vocabulario.
 *
 * `padding`: dos terminos, no uno. El de BLOQUE sigue en `space` y el INLINE
 * lee `inlineSpace` (ver su docblock en `tokens/space.ts`). Con la raiz por
 * defecto la tarjeta mide exactamente lo mismo que antes.
 */
const ScPillarCard = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.data.semantic.surface};
  border: 1px solid ${({ theme }) => theme.data.palette.neutral[600]};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  padding: ${({ theme }) => theme.data.space[5]}
    ${({ theme }) => theme.data.inlineSpace[5]};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  transition:
    transform ${PRESS.durationMs}ms ${PRESS.easing},
    box-shadow ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard};

  /* Guardado tras PRESS.hoverGuard (Task 9, punto 2 del brief): mueve
     (translateY), así que un tap en táctil no puede dejarlo "pegado". */
  @media ${PRESS.hoverGuard} {
    &:hover {
      transform: translateY(${STORY_CARD_HOVER_LIFT});
      box-shadow: ${({ theme }) => theme.data.elevation[1]};
    }
  }

  /* Press (Task 9): comparte la entrada de transform de la lista de arriba,
     así que entra y sale con PRESS.durationMs/PRESS.easing igual que el
     hover-lift. */
  &:active {
    transform: scale(${PRESS.activeScale});
  }

  /* Mismo guard que ScCard (Card.tsx): bajo reduce se anula la transición Y
     el transform de hover/active (movimiento); el realce de box-shadow al
     pasar el puntero se conserva, ahora instantáneo -- no es motion, es la
     misma excepción ya documentada arriba. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

/*
 * AQUI VIVIO `ScCardTopRow`, la fila superior de la tarjeta de pilar (badge
 * numerico + etiqueta "Paso"). Se retira en la Task 15 junto con
 * `ScCardStepLabel`: sin la etiqueta le queda un solo hijo y un
 * `justify-content: space-between` que ya no reparte nada. El badge cuelga
 * ahora directamente de `ScPillarCard` (flex column), que lo alinea al
 * comienzo sin estirarlo -- `ScCardBadge` declara su propio ancho/alto y
 * `flex: none`.
 */

/**
 * Acento del BADGE, distinto del de `pillarColor` y por un motivo medido, no
 * estético.
 *
 * D2 de la spec pedía reutilizar `pillarColor` tal cual («no se introduce una
 * segunda escala de acentos»), y así se implementó primero. Al medir el
 * contraste que la propia spec exige en su §3 (el número sobre el fondo
 * `color-mix` del badge), **tres de los cuatro acentos no llegaban a AA**:
 *
 * | pilar | `pillarColor` (2026-08-06) | sobre `surface` | sobre el `color-mix` 12% |
 * |-------|---------------------------|-----------------|--------------------------|
 * | 01    | `primary[500]`            | 2.28:1          | 2.06:1                   |
 * | 02    | `secondary[500]`          | 2.76:1          | 2.45:1                   |
 * | 03    | `secondary[600]`          | 3.50:1          | 3.05:1                   |
 * | 04    | `secondary[700]`          | 5.92:1          | 4.98:1                   |
 *
 * La columna del medio es la escala que `pillarAccent` (antes `pillarColor`)
 * tenia EN AQUELLA FECHA; desde la critica externa #12 (2026-08-19) su cadena
 * `secondary` va un paso mas clara (ver su docblock). La medicion de arriba no
 * se re-hace ni se borra: describe por que ESTA funcion existe, y esa razon no
 * cambia -- un acento pensado para leerse sobre el void oscuro nunca fue el
 * mismo que hace falta sobre el blanco de una tarjeta.
 *
 * Es decir: la spec se contradecía a sí misma, y gana §3 -- un requisito de
 * accesibilidad no cede ante una preferencia de reutilización. El propio
 * mockup ya lo resolvía igual: sus cuatro badges usan los pasos OSCUROS
 * (`--primary-700`, `--secondary-600`, `--secondary-700`, `--primary-600`),
 * no los claros, precisamente porque el número tiene que leerse.
 *
 * Esta función continúa esa misma rampa un paso más abajo hasta que las
 * CUATRO libran AA (los ratios reales los mide `Story.test.tsx`, contra los
 * tokens importados, nunca contra literales copiados aquí).
 *
 * Las dos escalas estuvieron SEPARADAS mientras las dos existieron:
 * `pillarAccent` era el acento del numeral de la rama OSCURA, donde el fondo
 * era otro y los ratios eran otros -- por eso la crítica #12 pudo mover aquella
 * sin tocar esta. Desde la crítica externa #19 (2026-09-04) el numeral oscuro
 * ya no existe y `pillarAccent` se retiró con él; esta función es ahora la
 * única rampa de acento de pilar viva, y su candado de contraste
 * (`Story.test.tsx`) el único que queda.
 */
export function pillarBadgeAccent(
  palette: ThemeDefinition["palette"],
  index: number,
): string {
  if (index === 0) return palette.primary[800];
  if (index === 1) return palette.secondary[700];
  if (index === 2) return palette.secondary[800];
  return palette.secondary[900];
}

/* Se exporta `pillarBadgeAccent` (valor puro, sin `theme` de
   styled-components) y no este envoltorio: es lo que permite que
   `Story.test.tsx` MIDA el contraste real contra los mismos tokens que pinta
   el componente, en vez de repetir la tabla de acentos en el test -- una
   copia que se desincronizaría del código al primer retoque sin que nada
   fallara. */
function pillarBadgeColor(
  index: number,
): (props: { theme: DefaultTheme }) => string {
  return ({ theme }) => pillarBadgeAccent(theme.data.palette, index);
}

/*
 * Badge del número (D2 + §3): `color-mix` se resuelve a mano (no vía
 * interpolación anidada de styled-components) para poder usar el MISMO
 * acento resuelto tanto en `background-color` como en `color`, sin evaluarlo
 * dos veces con dos mecanismos distintos.
 */
const ScCardBadge = styled.span<{ $index: number }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: ${STORY_CARD_BADGE_SIZE};
  height: ${STORY_CARD_BADGE_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  font-family: ${({ theme }) => theme.data.type.fontMono};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: 700;
  letter-spacing: 0.04em;
  background-color: ${({ theme, $index }) =>
    `color-mix(in oklab, ${pillarBadgeColor($index)({ theme })} 12%, ${theme.data.semantic.surface})`};
  color: ${({ theme, $index }) => pillarBadgeColor($index)({ theme })};
`;

/*
 * AQUI VIVIO `ScCardStepLabel` (la etiqueta "Paso"/"Step" en versalitas,
 * `semantic.textSubtle`). Retirada en la Task 15 -- ver el comentario del
 * badge en `StoryLight`, mas abajo, para el porque: los pilares no son pasos.
 * La clave i18n `Home.story.stepLabel` se retira en el mismo commit, en es Y
 * en en, y `locales.test.ts` la cuida para que no reaparezca.
 */

const ScCardTitle = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  font-weight: 700;
`;

const ScCardLead = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.text};
  font-weight: 600;
`;

const ScCardInspiration = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  line-height: ${STORY_CARD_INSPIRATION_LINE_HEIGHT};
`;

/*
 * Statement a pantalla completa (D12): sustituye a la tarjeta flotante de
 * nota.
 *
 * HIJO de `ScStory` desde la critica externa #15 (2026-09-02, hallazgo C10).
 * Nacio HERMANO -- el mockup lo declara como dos <section> hermanos (L72/L127)
 * y `StoryLight` los devolvia asi, en un fragmento-- pero la rama OSCURA nunca
 * pudo copiar esa forma: alli el cierre es la ultima DIAPOSITIVA del deck, y
 * sacarlo a una seccion hermana lo dejaria debajo de Journey (ver el comentario
 * de esa diapositiva, al final del fichero, para la medicion). Resultado: la
 * MISMA pieza tenia dos estructuras de documento segun el tema, que es
 * exactamente lo que «tema = piel con contenido unificado» (D-C, Task 15) no
 * admite.
 *
 * Se unifica hacia la forma ANIDADA, no hacia la hermana, por tres razones
 * medidas y no supuestas:
 *
 * 1. `#statement` NO es destino de navegacion. No aparece en
 *    `src/config/navigation.ts` ni en el pie, asi que no es una de las cuatro
 *    `ACTIVE_SECTION_IDS` que resuelve `useActiveSection` ni un fragmento al
 *    que nadie enlace (`useFragmentLanding.ts` ya lo declara por escrito). Una
 *    seccion de nivel superior que nadie nombra no gana nada por serlo.
 * 2. El scrollspy pasa a decir lo mismo en los dos temas. Como hermano, el
 *    tramo del statement quedaba FUERA de la caja de `#story`, asi que
 *    mientras se leia el cierre de Story el navbar no podia afirmar Story;
 *    en oscuro si, porque alli ya estaba dentro. Anidarlo iguala las dos.
 * 3. La estructura la fija el CONTENIDO, no el vehiculo: el statement ES el
 *    cierre de Story en los dos temas. Que en claro sea un cartel a sangre
 *    completa y en oscuro una diapositiva sigue siendo la piel, y sigue
 *    ramificando.
 *
 * Lo que NO cambia, y por eso el cambio es estructural y no visual: la caja
 * acotada de la rama clara se muda a `ScStoryInner` (su docblock, mas arriba),
 * asi que este bloque sigue siendo a sangre completa y sigue empezando
 * exactamente donde empezaba. El orden del documento tampoco cambia --
 * `querySelectorAll("section")` sigue devolviendo story, statement, journey...
 * (candado en `HomeSections.test.tsx`) -- porque anidar no reordena. Y una
 * `<section>` sin nombre accesible no entra en el arbol de accesibilidad como
 * landmark, asi que tampoco compite con la region de Story: el mismo argumento
 * que ya sostenia la rama oscura.
 *
 * D13 (tercera ronda, 2026-08-06) partio este bloque UNICO en DOS piezas
 * (`ScStatementTrack`/`ScStatementStage`), calcado de como `ScTrack`/
 * `ScStage` cablean la presentacion oscura, para poder anclarlo con
 * `useSlideDeck`. D2 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md REVIERTE esa
 * particion: sin pista que recorrer ni pin que sostener, las dos piezas
 * vuelven a fundirse en un unico `ScStatement` -- la misma forma que tenia
 * en D12, antes de que D13 la partiera.
 *
 * `min-height: 100dvh`, NO `height`: el cartel conserva la presencia a
 * pantalla completa que el usuario aprobo en D12, pero deja de imponer una
 * altura fija -- si la frase creciera (traduccion mas larga, tipografia
 * mayor), el bloque crece con ella en vez de recortarla. Sin
 * `position: sticky` ni `top`: el documento pierde las ~300dvh de pista que
 * D13 anadia, y ninguna otra pieza media contra `#statement` (verificado por
 * grep, D2 de la spec). Sin guard de `reduce` propio para esta pieza: sin
 * pin ni pista no hay nada que degradar bajo reduce (D6) -- las tres lineas
 * siguen quedando visibles por su PROPIO guard (ver
 * ScStatementFirst/Second/Third, mas abajo).
 *
 * `--story-statement-pad`: mobile-first (Task 7, auditoria premium
 * 2026-08-08), unica fuente del pad inline, leida tambien por
 * `storyStatementFontSize` (su docblock, mas arriba, trae la desigualdad
 * completa que fija el valor base) -- una custom property, no un valor de tema
 * resuelto una vez en JS, porque necesita cambiar de valor segun el breakpoint
 * SIN que la formula de tamano de fuente tenga que saber en cual esta: el
 * navegador resuelve `var()` de nuevo en cada recalculo, con el valor que la
 * cascada tenga vigente en ESE viewport. `theme.data.inlineSpace[4]` (16px)
 * hasta `sm` (600px); `theme.data.inlineSpace[6]` (32px, el valor VERBATIM que
 * esta seccion ya usaba para TODO ancho antes de esa tarea) desde ahi.
 *
 * `inlineSpace` y no `space` desde el 2026-09-05: con la raiz por defecto los
 * dos peldanos valen lo mismo a cualquier ancho, pero con la fuente al 200 %
 * el pad en `rem` se doblaba y hundia el termino de ancho de
 * `storyStatementFontSize` por debajo de su suelo de 24px -- la desigualdad
 * que ese docblock declara se despeja en PIXELES y solo se cumplia con la raiz
 * a 16. Ver alli la aritmetica completa.
 */
const ScStatement = styled.section`
  /* 70dvh y no 100dvh (Ola B, 2026-08-16). Esta seccion es un remate a
     pantalla completa por diseño, y el problema no era ese: era que su
     contenido mide unos 120 px y se centra en una banda de 900, asi que entre
     el ultimo texto de Story y el primero de este quedaban 308 px sin nada a
     la vista incluso despues de recortar el relleno de la frontera.

     LO QUE NO SE HACE, y conviene dejarlo escrito porque era la salida obvia:
     NO se cambia justify-content a flex-start. Anclar arriba un bloque
     pequeño dentro de una banda alta es exactamente el defecto que el dueño
     rechazo esta misma mañana en la diapositiva de cierre del deck oscuro
     --dejaba 431 px de hueco vacio DEBAJO a 1920x905-- y aqui produciria lo
     mismo un poco mas abajo. Mover el hueco no es cerrarlo.

     Reducir la banda si lo cierra, y de forma simetrica: el contenido sigue
     centrado, y los dos huecos --el de arriba y el de abajo-- se encogen a la
     vez. 70dvh conserva el caracter de remate (sigue siendo la pieza mas alta
     de la rama clara y sigue ocupando la mayor parte del viewport) sin
     reservar una pantalla entera para 120 px de texto.

     SIN BACKTICKS: esto vive dentro del template literal de
     styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
  min-height: 70dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding-block: ${({ theme }) => theme.data.space[8]};
  --story-statement-pad: ${({ theme }) => theme.data.inlineSpace[4]};
  padding-inline: var(--story-statement-pad);

  @media ${({ theme }) => theme.data.breakPoint.sm} {
    --story-statement-pad: ${({ theme }) => theme.data.inlineSpace[6]};
  }
`;

/*
 * El PARRAFO real (marcado obligatorio, D12): un lector de pantalla tiene
 * que leer la frase entera y seguida, no tres bloques sueltos -- de ahi que
 * las tres lineas vivan DENTRO de un unico <p>, no como hermanas directas de
 * `ScStatement`. El `gap` del mockup (L127: `clamp(4px, 1vh, 14px)`, entre
 * las tres lineas) se declara AQUI, no en `ScStatement`, precisamente porque
 * el envoltorio flex que agrupa las tres lineas es este <p>, no la seccion.
 *
 * D3 (spec 2026-08-07): este PARRAFO es tambien el nodo que observa
 * `useReveal` (ver StoryLight, mas abajo) -- no la seccion. `useReveal` usa
 * `threshold: 0.2`: sobre `ScStatement` (`min-height: 100dvh`) eso dispararia
 * con un 80% de bloque vacio todavia por delante, con el texto fuera de
 * pantalla; el parrafo ES el texto, asi que su interseccion al 20% coincide
 * con "se llego al elemento". El atributo `data-revealed` que escribe
 * `useReveal` vive por tanto AQUI, en el propio parrafo -- las tres lineas lo
 * leen con el selector descendiente `[data-revealed="true"] &` (ver
 * ScStatementFirst/Second/Third, mas abajo).
 */
const ScStatementText = styled.p`
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 1vh, 14px);
`;

/*
 * Las tres lineas comparten casi toda su declaracion (tipografia de cartel
 * fluida y mayusculas; el `white-space: nowrap` que las tres llevaban se
 * retiro el 2026-09-05 -- ver el docblock de `storyStatementFontSize` para la
 * medicion que lo obliga) y solo
 * difieren en color/transform-de-entrada (tabla D4 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md, VERBATIM de D12 --
 * esta entrega no toca ni una de estas declaraciones, solo QUIEN las
 * dispara). Se escriben TRES styled-components completos, no un mixin
 * compartido + variantes por prop: mismo criterio que
 * `ScEyebrowRow`/`ScTitle`/`ScBody`, mas arriba en este fichero, que ya
 * toleran la misma repeticion en vez de introducir una abstraccion nueva
 * para tres usos.
 *
 * D5 (spec 2026-08-07): `&[data-visible="true"]` (D13, tercera ronda
 * 2026-08-06 -- un selector SOBRE EL PROPIO elemento, porque `data-visible`
 * lo calculaba `StoryLight` LINEA A LINEA) se sustituye de vuelta por el
 * selector DESCENDIENTE `[data-revealed="true"] &`: el atributo vive ahora
 * en `ScStatementText`, el PARRAFO padre de las tres lineas (D3), no en cada
 * elemento -- NUNCA `&[data-revealed="true"]`, que evaluaria el atributo
 * sobre el propio elemento y no matchearia jamas (leccion §5.1 del manual
 * global, git `63c7fa9`). Mismo patron que `ScTitle`/`ScBody`/
 * `ScPillarCardItem`, mas arriba en este mismo fichero.
 *
 * La cascada (D9/D12) tambien vuelve, y su INVERSA es de verdad inversa
 * (D5): la regla `[data-revealed="true"] &` (estado visible) lleva el
 * retardo DIRECTO -- 1a linea 0ms, 2a 220ms, 3a 440ms. La regla BASE del
 * elemento (el estado que gana cuando `data-revealed` vuelve a "false")
 * lleva el retardo INVERSO -- 1a linea 440ms, 2a 220ms, 3a 0ms --
 * aprovechando que `transition-delay` se toma siempre del estado AL QUE se
 * transita: al retroceder, la frase se deshace empezando por la derecha (la
 * 3a linea, con 0ms, es la primera en desaparecer). En el montaje la regla
 * base ya lleva su retardo pero no hay transicion que correr (es el estilo
 * inicial, no un cambio) -- no produce ningun efecto observable.
 */
const ScStatementFirst = styled.span`
  display: block;
  font-size: ${storyStatementFontSize};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${STORY_STATEMENT_LINE_HEIGHT};
  letter-spacing: ${STORY_STATEMENT_LETTER_SPACING};
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.text};
  opacity: 0;
  transform: translateX(-16%);
  transition:
    opacity ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING},
    transform ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING};
  /* Retardo INVERSO (D5): la 1a linea es la ULTIMA en deshacerse al
     retroceder. */
  transition-delay: ${STORY_STATEMENT_DELAY_THIRD_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
    /* Retardo DIRECTO (D5): la 1a linea entra sin espera. */
    transition-delay: ${STORY_STATEMENT_DELAY_FIRST_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

const ScStatementSecond = styled.span`
  display: block;
  font-size: ${storyStatementFontSize};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${STORY_STATEMENT_LINE_HEIGHT};
  letter-spacing: ${STORY_STATEMENT_LETTER_SPACING};
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING},
    transform ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING};
  /* Retardo INVERSO (D5): la linea del medio, a mitad de camino tanto
     entrando como saliendo. */
  transition-delay: ${STORY_STATEMENT_DELAY_SECOND_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
    /* Retardo DIRECTO (D5). */
    transition-delay: ${STORY_STATEMENT_DELAY_SECOND_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Tercera linea: EXTIENDE `ScAccent` (no lo duplica) para heredar su color de
 * marca (D12 de la spec: "el degradado de marca que ya usa ScAccent en este
 * mismo fichero -- reutilizalo"; Task 12, 2026-08-09, convierte ese
 * degradado en el color solido `semantic.brandText` -- ver el docblock de
 * `ScAccent`, mas arriba, para la medicion completa. Esta linea solo se
 * renderiza en la rama CLARA (`StoryLight`, mas abajo): el cierre de la rama
 * OSCURA usa `ScDeckNoteAccent`, una pieza distinta de `story.deck.tsx`).
 * Extiende `ScAccent` con el mismo recurso de styled-components con el que la
 * fila de pilar del deck extendía su base antes de retirarse.
 */
const ScStatementThird = styled(ScAccent)`
  display: block;
  font-size: ${storyStatementFontSize};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${STORY_STATEMENT_LINE_HEIGHT};
  letter-spacing: ${STORY_STATEMENT_LETTER_SPACING};
  text-transform: uppercase;
  opacity: 0;
  transform: translateX(16%);
  transition:
    opacity ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING},
    transform ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING};
  /* Retardo INVERSO (D5): la 3a linea es la PRIMERA en deshacerse al
     retroceder. */
  transition-delay: ${STORY_STATEMENT_DELAY_FIRST_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
    /* Retardo DIRECTO (D5): la 3a linea es la ULTIMA en entrar. */
    transition-delay: ${STORY_STATEMENT_DELAY_THIRD_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Salida de pertenencia (Task 6, plan
 * `2026-08-10-implementacion-plan-premium-f1-f5`): el cierre de Story invita
 * a seguir en Discord como enlace REAL, no decorativo. Mismo destino que ya
 * enlazan Navbar/Footer (grupo "community" de `NAV_GROUPS`,
 * `src/config/navigation.ts`, añadido en una entrega anterior) y que las
 * tarjetas del Contact oscuro ya ofrecen (`Home.contact.cards.community`) --
 * `links.discord` (`src/config/links.ts`), CERO urls nuevas.
 *
 * Estilo calcado de `footerLinkStyles` (Footer.tsx, la misma decisión citada
 * en su propio docblock): color `textMuted` en reposo, `brandText` al
 * hover/foco -- ese hover solo cambia COLOR, sin movimiento que guardar tras
 * `PRESS.hoverGuard` (la excepción que el propio vocabulario documenta para
 * hovers que no mueven nada), así que la lista de `transition` nace ya con
 * `PRESS.durationMs`/`PRESS.easing` gobernando solo el `:active` de abajo.
 * `communityLinkStyles` es un bloque `css` compartido (no un componente
 * único) porque las DOS ramas lo consumen sobre elementos `styled.a`
 * distintos (`ScStatementLink` en claro, `ScDeckNoteLink` en oscuro), cada
 * uno con su propio margen de separación del bloque que lo precede.
 */
const communityLinkStyles = css`
  display: inline-flex;
  align-items: center;
  /*
   * OBJETIVO DE 24 px (critica externa #16, hallazgo L3; WCAG 2.5.8 Target
   * Size, AA en WCAG 2.2). Medido en tema oscuro a 390x844, este enlace era
   * la UNICA diana del sitio por debajo del minimo: 208x22 px. Los 2 px que
   * faltaban salen de que la caja se ajustaba al texto -- bodySm con su
   * interlineado -- sin declarar altura minima propia.
   *
   * min-height y no padding-block: el elemento ya es un inline-flex con
   * align-items: center, asi que la altura extra se reparte sola arriba y
   * abajo alrededor del texto, sin mover la linea base ni empujar nada.
   * Medido antes/despues, la caja pasa de 22,4 a 24 px de alto y ninguna otra
   * medida de la diapositiva cambia -- que es lo que "sin salto de layout"
   * significa aqui.
   *
   * space[5] es el mismo peldano con el que ScRailMark (story.deck.tsx) y el
   * pie ya resuelven este mismo minimo: 24 px no es un numero de este enlace,
   * es el umbral de la norma, y el sitio lo nombra siempre igual.
   */
  min-height: ${({ theme }) => theme.data.space[5]};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.textMuted};
  /* SUBRAYADO, porque sin el esto no parece un enlace (Ola B, 2026-08-16).
     GlobalStyles declara text-decoration: none para todo elemento a del sitio,
     y este enlace usaba EXACTAMENTE el mismo color que el cuerpo de texto que
     lo rodea: medido, el contraste entre el enlace y su prosa vecina era de
     2,18:1 en claro y 1,46:1 en oscuro. WCAG 1.4.1 pide 3:1 cuando el color es
     lo UNICO que distingue un enlace, y aqui ni siquiera llegaba a eso -- no
     habia nada que distinguir. El hover cambiaba el color, pero un hover no
     existe para quien navega con el dedo.

     Se subraya y no se recolorea porque el color es la palanca que ya esta
     agotada: subir el enlace al color de marca en reposo lo separaria de la
     prosa, si, pero dejaria el hover sin ningun cambio que comunicar. El
     subrayado da la afordancia en reposo y deja el color libre para el estado.

     text-underline-offset separa la linea de las descendentes; sin el, con
     este tamaño de cuerpo, la linea corta las jotas y las ges.

     SIN BACKTICKS: esto vive dentro de un template literal css de
     styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. Un único
     punto de declaración -- ScStatementLink/ScDeckNoteLink (más abajo) lo
     heredan interpolando este mismo bloque css, no lo redeclaran. */
  touch-action: manipulation;
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brandText};
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

/* Rama clara: sigue al parrafo del statement, dentro de `ScStatement`
   (`align-items: center`, hereda el centrado sin declarar nada nuevo). */
const ScStatementLink = styled.a`
  ${communityLinkStyles}
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

/* Rama oscura: sigue a `ScDeckNote` dentro de la ultima diapositiva -- mismo
   contenedor, mismo `text-align` por defecto (izquierda, heredado de
   `ScDeck`, sin `text-align: center` propio). */
const ScDeckNoteLink = styled.a`
  ${communityLinkStyles}
  margin-block-start: ${({ theme }) => theme.data.space[5]};
`;
/*
 * AQUI VIVIO LA COMPUERTA DE FOCO del enlace de Discord: un bloque
 * [data-state]:not([data-state="current"]) & { visibility: hidden } con su
 * excepcion de reduce. La puso la critica #10 (tarea derivada del hallazgo A)
 * para cerrar WCAG 2.4.7 -- este enlace es el unico focalizable dentro de una
 * ScSlide, y el stage vive en position: sticky, asi que un foco en el enlace
 * de una diapositiva que todavia no ha llegado desaparecia de la pantalla sin
 * que el navegador desplazara nada para traerlo a la vista.
 *
 * RETIRADA EN LA CRITICA EXTERNA #16 (hallazgo L2), porque el precio ya
 * medido era peor que el defecto: el enlace no era alcanzable con Tab HACIA
 * DELANTE en ningun momento. No es focalizable hasta que su diapositiva es la
 * actual, y para que lo sea hace falta scroll -- que el tabulador no produce.
 * Con Shift+Tab desde la primera marca del rail si se alcanzaba (el enlace
 * precede al rail en el DOM), asi que la unica via de teclado a la salida de
 * pertenencia de Story era ir hacia atras y por casualidad.
 *
 * LA SUSTITUYE UN MECANISMO QUE CONSERVA LA GARANTIA en vez de renunciar a
 * ella: el enlace vuelve al orden de tabulacion SIEMPRE, y al recibir el foco
 * (`onFocus` en el JSX de StoryDeckDark, mas abajo) el deck lleva la pagina a
 * la diapositiva del cierre con la MISMA funcion que activa la ultima marca
 * del rail (`scrollToSlide`, useSlideDeck). El foco deja de poder quedarse
 * fuera de la vista: o la diapositiva ya es la actual, o pasa a serlo por el
 * propio gesto de enfocar. La excepcion de reduce sigue viva, ahora en el
 * handler y no en el CSS -- bajo reduce el deck se linealiza, la pista mide
 * height: auto y la geometria que scrollToSlide invierte no describe nada, asi
 * que no se llama.
 */

export function Story(): ReactElement {
  const { themeName } = useTheme();

  // La rama clara vive en un componente HIJO aparte (StoryLight, justo
  // debajo) por el MISMO motivo que obliga a extraer StoryDeckDark unas
  // lineas mas abajo: useSectionProgress (D1, spec
  // 2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md)
  // llama a window.matchMedia sin condicion en su efecto de montaje (la
  // guarda reactiva de prefers-reduced-motion), exactamente igual que
  // useSlideDeck. Story() es UNA SOLA funcion para las dos ramas y las
  // reglas de los hooks de React prohiben llamar un hook solo "cuando el
  // tema es claro" dentro de ella -- el tema puede cambiar en caliente sin
  // desmontar Story, via el mismo ThemeProvider que ya fuerza la extraccion
  // de la rama oscura. Llamar useSectionProgress aqui rompería tambien los
  // tests claros existentes, ninguno de los cuales stubea matchMedia (nunca
  // lo necesitaron hasta esta entrega). Delegar cada rama a un componente
  // que solo se MONTA cuando le toca resuelve esto en las dos direcciones a
  // la vez: React nunca ejecuta los hooks de un componente que no se
  // renderiza.
  if (themeName === "light") {
    return <StoryLight />;
  }

  return <StoryDeckDark />;
}

/*
 * Rama clara de Story, extraida a su propio componente (ver el comentario de
 * mas arriba, en Story()): aqui SI es seguro llamar useSectionProgress sin
 * condicion, porque este componente en si mismo solo se monta cuando la
 * rama clara esta activa.
 */
function StoryLight(): ReactElement {
  const { t } = useTranslation("home");
  // Namespace SEPARADO (Task 6, plan
  // 2026-08-10-implementacion-plan-premium-f1-f5), mismo motivo que
  // StoryDeckDark mas abajo: el aviso de "se abre en pestaña nueva"
  // (`Common.Nav.newTab`) del enlace de comunidad es un patron de
  // INTERFAZ compartido (Footer/Navbar ya lo usan para el mismo grupo
  // "community" de NAV_GROUPS), no copia propia de esta seccion.
  const { t: tCommon } = useTranslation("common");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  // Ref ESTABLE (useRef, no callback-ref): useSectionProgress escribe
  // --story-enter/--story-progress directamente sobre el propio elemento en
  // cada frame de rAF -- mismo motivo por el que useSlideDeck/useSceneParallax
  // exigen refs de identidad estable (ver trackRef/stageRef en
  // StoryDeckDark, mas abajo).
  const sectionRef = useRef<HTMLElement>(null);
  // cssVarPrefix "story" (D1): la rama OSCURA ya escribe --story-progress
  // con este mismo nombre, a traves de useSlideDeck (StoryDeckDark, mas
  // abajo) -- coincidencia deliberada, no un descuido: las dos ramas son
  // mutuamente excluyentes (nunca se montan a la vez) y la variable
  // significa lo mismo en las dos, "cuanto ha avanzado el scroll de esta
  // seccion por el viewport".
  useSectionProgress(sectionRef, { cssVarPrefix: "story" });
  // Statement a pantalla completa (D3, spec
  // 2026-08-07-story-statement-scroll-observer-design.md): el useSlideDeck
  // que llevaba esta pieza (D13, tercera ronda 2026-08-06 -- recorrido paso
  // a paso anclado por scroll) se sustituye por un useReveal PROPIO, un
  // SEGUNDO IntersectionObserver independiente del de ScGrid (arriba).
  // `once: false` es lo que entrega literalmente el requisito del encargo
  // ("cuando se realice scroll hacia arriba, las animaciones se realiza a la
  // inversa"): revealed vuelve a false cuando el nodo deja de intersecar, y
  // el CSS vuelve solo a su estado base -- el once: true por defecto haria
  // el efecto irreversible. Se observa el PARRAFO (ScStatementText,
  // HTMLParagraphElement), no la seccion: threshold: 0.2 (el defecto de
  // useReveal) sobre una seccion de min-height: 100dvh dispararia con el
  // texto todavia fuera de pantalla; el parrafo ES el texto, asi que su
  // interseccion al 20% coincide con "se llego al elemento". Nombres propios
  // (statementRef/statementRevealed) para no chocar con revealRef/revealed,
  // el useReveal de ScGrid, arriba.
  const { ref: statementRef, revealed: statementRevealed } =
    useReveal<HTMLParagraphElement>({ once: false });

  const pillars = (
    <ScPillarGrid>
      {PILLARS.map((pillar, index) => (
        <ScPillarCardItem key={pillar.key}>
          <ScPillarCard>
            {/* Decorativo (D10): el orden ya lo da el DOM: un lector de
                pantalla que anuncie "cero uno" antes del titulo anade
                ruido sin informacion.

                Task 15 (numeracion honesta, 2026-08-11): la etiqueta "Paso"
                que acompanaba a este numero se retira. Los cuatro pilares no
                son pasos -- son cuatro maneras simultaneas de mirar lo mismo,
                y llamarlas "Paso 01..04" prometia una secuencia que no
                existe. La secuencia REAL del sitio es la de Journey, que si
                conserva su numeracion. Con la etiqueta fuera, el envoltorio
                `ScCardTopRow` (una fila flex con `space-between` para dos
                hijos) se queda sin funcion y se va con ella. */}
            <ScCardBadge
              $index={index}
              aria-hidden="true"
            >
              {pillar.number}
            </ScCardBadge>
            {/* forwardedAs="p", NO as="p" (gotcha documentado en
                Typography.tsx/Hero.tsx:358 -- con `as` en un
                `styled(Typography)` el wrapper consume el prop, renderiza un
                <p> pelado y descarta Typography entero): el h2#story-title
                sigue siendo el unico encabezado accesible de la seccion en
                claro, mismo criterio que ya aplicaba el titulo de fila
                anterior. */}
            <ScCardTitle
              variant="h4"
              forwardedAs="p"
            >
              {t(`Home.story.pillars.${pillar.key}.title`)}
            </ScCardTitle>
            <ScCardLead variant="bodySm">
              {t(`Home.story.pillars.${pillar.key}.body`)}
            </ScCardLead>
            <ScCardInspiration variant="bodySm">
              {t(`Home.story.pillars.${pillar.key}.inspiration`)}
            </ScCardInspiration>
          </ScPillarCard>
        </ScPillarCardItem>
      ))}
    </ScPillarGrid>
  );

  const heading = (
    <>
      {/* Task 14, fix de revision (plan premium F3, 2026-08-11):
          `Home.hero.support` ("Aunque el infinito...") SALE del hero y
          aterriza AQUI, ANTES del primer contenido actual de Story (el
          eyebrow) -- literal del brief: "antes del primer contenido actual
          de Story". Misma clave renombrada (`Home.story.support`), sin
          duplicar el string, un render por rama de tema (Task 15 unificara
          las dos ramas despues; este parrafo abre en las dos, para que
          sobreviva a esa unificacion sin tener que decidir de nuevo donde
          encaja). `ScSupportLead` extiende `ScBody` solo en posicion y
          retardo de entrada -- ver su docblock, mas arriba, para el porque
          completo. */}
      <ScSupportLead
        variant="body"
        data-testid="story-support"
      >
        {t("Home.story.support")}
      </ScSupportLead>
      <ScEyebrowRow>
        <Kicker>{t("Home.story.kicker")}</Kicker>
      </ScEyebrowRow>
      {/* `{" "}` ANTES del `<br />` (critica externa #12, 2026-08-19): sin el,
          las dos mitades del titulo se concatenan sin separador en
          `textContent` ("curiosidada la creacion") -- el nombre accesible se
          salva porque Chrome inserta un espacio al cruzar un `<br>`, pero
          cualquier consumidor que lea el TEXTO del nodo (un test, un scraper,
          un motor de busqueda) lee las dos palabras pegadas. `Contact.tsx` ya
          separaba asi las suyas; esta era la unica de las dos ramas del h2 de
          Story que no lo hacia. */}
      <ScTitle
        variant="h2"
        id="story-title"
      >
        {t("Home.story.titleLead")} <br />
        <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
      </ScTitle>
      <ScBody variant="body">{t("Home.story.body")}</ScBody>
    </>
  );

  return (
    <ScStory
      ref={sectionRef}
      id="story"
      aria-labelledby="story-title"
      $fullBleed={false}
    >
      <ScStoryInner>
        <ScGrid
          ref={revealRef}
          data-revealed={revealed}
        >
          <ScFigureWrap>
            <ScHalo aria-hidden="true" />
            {/* ScFigureShift: envoltorio del desplazamiento de scroll de la
                figura (D1) -- ver su docblock, mas arriba, para el porque
                (conflicto @keyframes/transform). */}
            <ScFigureShift>
              {/* El fichero se llama journey-* a propósito: el 2026-07-28 el
                  dueño intercambió las dos figuras entre Story y Journey y el
                  intercambio se conserva. El alt describe LA IMAGEN (la palma
                  abierta), no el nombre del fichero ni la sección -- ver el
                  docblock de `JOURNEY_FIGURE_SRC` en journey.layers.ts.

                  `loading="lazy"` NO ES SOLO RENDIMIENTO DE LA RAMA CLARA: es
                  la mitad del candado que impide que una visita OSCURA se
                  descargue esta figura (la otra mitad es la regla
                  `[data-theme="dark"]` de `ScFigureWrap` -- ver su docblock,
                  con la medicion de los 702.088 B que vuelven al quitar este
                  atributo). No se cambia a `eager` sin volver a medir. */}
              <ScFigureImg
                src="/figures/journey-presenting-1024.webp"
                srcSet="/figures/journey-presenting-640.webp 640w, /figures/journey-presenting-1024.webp 1024w"
                sizes={STORY_FIGURE_SIZES}
                alt={t("Home.story.figureAlt")}
                loading="lazy"
                decoding="async"
              />
            </ScFigureShift>
          </ScFigureWrap>

          <ScContent>
            {heading}
            {pillars}
          </ScContent>
        </ScGrid>
      </ScStoryInner>

      {/* Statement a pantalla completa (D12; D2/D3 de la spec
          2026-08-07-story-statement-scroll-observer-design.md): HIJO de
          ScStory desde la critica #15 (hallazgo C10), hermano de ScStoryInner
          -- ver el docblock de ScStatement, mas arriba, para el porque y
          para lo que NO cambia al anidarlo. Un solo <p> con las tres lineas como <span>
          en bloque (marcado obligatorio, D12): un lector de pantalla lee la
          frase entera y seguida, "Cada idea puede ser un nuevo comienzo", en
          vez de tres fragmentos sueltos. El PARRAFO lleva el `ref`/
          `data-revealed` de useReveal (D3): las tres lineas ya no calculan
          nada linea a linea (el `data-visible` de D13 queda revertido),
          solo reaccionan al atributo del PADRE por CSS puro, selector
          descendiente (ver el docblock de
          ScStatementFirst/Second/Third, mas arriba). */}
      <ScStatement id="statement">
        <ScStatementText
          ref={statementRef}
          data-revealed={statementRevealed}
        >
          <ScStatementFirst>{t("Home.story.statement.first")}</ScStatementFirst>{" "}
          <ScStatementSecond>
            {t("Home.story.statement.second")}
          </ScStatementSecond>{" "}
          <ScStatementThird>{t("Home.story.statement.third")}</ScStatementThird>
        </ScStatementText>
        {/* Salida de pertenencia (Task 6): enlace REAL, hermano del parrafo
            -- NUNCA dentro de el, para no romper el contrato de "una sola
            frase" que D12 fija (un lector de pantalla tiene que leer las
            tres lineas seguidas, sin un enlace intercalado). */}
        <ScStatementLink
          href={links.discord}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Home.story.communityLink")}
          <VisuallyHidden> {tCommon("Common.Nav.newTab")}</VisuallyHidden>
        </ScStatementLink>
      </ScStatement>
    </ScStory>
  );
}

/*
 * TASK 14, fix de revision (plan premium F3, 2026-08-11): mismo ajuste de
 * posicion que `ScSupportLead` (ver su docblock, mas arriba) para la rama
 * OSCURA -- extiende `ScDeckIntroBody` (estatico, sin reveal propio, asi que
 * aqui NO hace falta tocar ningun retardo) solo para que, al pasar a ser el
 * PRIMER elemento de la diapositiva 0 (antes de `ScKicker`), no herede el
 * `margin-block-start: space[5]` que tenia sentido cuando iba DESPUES del
 * cuerpo -- eso habria dejado un hueco vacio arriba de la diapositiva. El
 * espaciado se traslada a `margin-block-end`, hacia el kicker que le sigue.
 */
const ScDeckSupportLead = styled(ScDeckIntroBody)`
  margin-block-start: 0;
  margin-block-end: ${({ theme }) => theme.data.space[5]};
`;

/*
 * Rama oscura de Story, extraida a su propio componente (ver el comentario
 * de mas arriba, en Story()): aqui SI es seguro llamar useSlideDeck sin
 * condicion, porque este componente en si mismo solo se monta cuando la
 * rama oscura esta activa.
 *
 * YA NO recibe `heading` por prop (spec 2026-07-31-story-deck-tipografia-design.md,
 * Task 2): antes se construia UNA vez en Story() y lo consumian las dos
 * ramas -- la clara directamente, la oscura por prop, el MISMO nodo en las
 * dos. Con la escala tipografica de cartel de esta entrega (h2 hasta 4rem)
 * eso deja de ser seguro: cualquier cambio de tamano sobre ese nodo
 * compartido se habria filtrado tambien al tema claro. Por eso este
 * componente compone su PROPIO kicker/h2/body con los styled de
 * story.deck.tsx (`ScDeckTitle`/`ScDeckIntroBody`), mientras Story()
 * conserva `heading` (con `ScKicker`/`ScTitle`/`ScAccent`/`ScBody`) intacto,
 * exclusivo de la rama clara. `ScKicker`/`ScAccent` SI se reutilizan tal
 * cual (no cambian de tamano en este encargo, no hay riesgo de fuga). El
 * resto (pilares, nota, rail, anclas de snap) ya se construia aqui con su
 * PROPIO `t`, mismo namespace/instancia de i18n que Story().
 */
function StoryDeckDark(): ReactElement {
  const { t } = useTranslation("home");
  // Namespace SEPARADO (Task 4, plan
  // 2026-08-10-implementacion-plan-premium-f1-f5): `Common.Deck.scrollHint`
  // vive en `common`, no en `home` -- la pista de scroll es un patron de
  // INTERFAZ compartido entre presentaciones (mismo rol que un `aria-label`
  // de navegacion), no copia propia de la seccion. Bajo `Common.Deck.*`, no
  // como raiz plana propia (regla 29 de RULES.md: un solo arbol de claves
  // por namespace, sin raices nuevas al margen de `Common.*`/`Home.*`).
  // `common` carga sincrono igual que `home` (`i18n/config.ts`), asi que las
  // dos llamadas a `useTranslation` resuelven en el mismo render, sin estado
  // de carga que manejar.
  const { t: tCommon } = useTranslation("common");

  // Refs ESTABLES (useRef, no callback-ref): useSlideDeck lee
  // getBoundingClientRect() de la pista en cada frame de rAF y escribe las
  // variables CSS de la coreografia directamente sobre el stage -- mismo
  // motivo por el que useSceneParallax exige refs de identidad estable en
  // vez de callbacks (StoryCosmicBeing.tsx).
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // cssVarPrefix: "story" EXPLICITO (D4, spec
  // 2026-08-02-journey-deck-8-diapositivas-design.md): el hook ya generaliza
  // a cualquier presentacion de N diapositivas y su defecto es "deck", asi
  // que sin este parametro escribiria `--deck-enter`/`--deck-progress` sobre
  // el stage -- variables que `story.deck.tsx` no consume. Pasando "story"
  // explicitamente el hook sigue escribiendo `--story-enter`/
  // `--story-progress`, EXACTAMENTE lo que ese fichero ya lee: el
  // renombrado del hook no mueve ni una linea de CSS en esta seccion.
  // `scrollToSlide` (critica externa #12, dimension 4 de Craft): el rail deja
  // de ser decorativo y sus marcas pasan a ser botones que llevan al tramo de
  // pista que activa cada diapositiva. La geometria la invierte el hook, que
  // es quien ya la calcula en el sentido directo -- ver su docblock. Journey
  // consume esta misma pieza desde la critica #10 (commit f9cf823).
  const { index, direction, scrollToSlide } = useSlideDeck(
    trackRef,
    stageRef,
    STORY_SLIDES,
    {
      tailScreens: STORY_DECK_TAIL_SCREENS,
      cssVarPrefix: "story",
    },
  );

  // Estado de cada diapositiva (spec seccion 5b): se decide AQUI, comparando
  // su indice con el `index` que escribe el hook -- el CSS de ScSlide
  // (story.deck.tsx) solo reacciona al atributo `data-state` resultante,
  // nunca calcula nada por si mismo (jsdom, ademas, no puede evaluar ningun
  // calculo que dependiera de scroll real).
  const slideState = (slideIndex: number): "past" | "current" | "next" => {
    if (slideIndex < index) return "past";
    if (slideIndex === index) return "current";
    return "next";
  };

  /*
   * Salida de la trampa de foco del enlace de Discord (critica externa #16,
   * hallazgo L2). Ver el comentario que sustituyo a la compuerta de
   * visibility, junto a `ScDeckNoteLink`, para el defecto completo; aqui vive
   * la mitad que no es CSS.
   *
   * Dos guardas, y ninguna es decorativa:
   *
   * 1. `reduce`. El deck se linealiza (la pista pasa a height: auto, el stage
   *    a position: static y todas las diapositivas quedan visibles en flujo),
   *    asi que la geometria que `scrollToSlide` invierte -- pista larga,
   *    stage pegado, span de recorrido -- ya no describe la pagina. Llamarlo
   *    lanzaria el scroll a una posicion arbitraria justo cuando el usuario
   *    acaba de pedir menos movimiento. Se consulta en el momento del foco y
   *    no se cachea porque la preferencia cambia en caliente (mismo criterio
   *    que `scrollToSlide` con su `behavior`).
   * 2. Ya estar en la diapositiva del cierre. Sin esto, cada Tab que entra en
   *    el enlace relanzaria un scroll suave hacia donde ya estamos: el
   *    navegador cancelaria el gesto de scroll del usuario a mitad, que es
   *    justo el tipo de secuestro que este repo retiro con el scroll-snap.
   */
  const focusClosingSlide = (): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (index === STORY_SLIDES - 1) return;
    scrollToSlide(STORY_SLIDES - 1);
  };

  /*
   * Nombre accesible de cada parada del rail (critica externa #12): el TITULO
   * de la diapositiva a la que lleva, leido de las MISMAS claves que esa
   * diapositiva pinta -- no una segunda fuente de copia que tendria que
   * moverse a la vez que la primera (el riesgo real que el rail de Journey
   * declaraba al elegir numerar en vez de nombrar).
   *
   * POR QUE EL DESTINO Y NO LA POSICION, y por que Journey cambia con esta
   * misma ola: numerar las paradas ("Ir a la diapositiva N de 6") obliga a
   * elegir QUE se cuenta, y en Journey esa eleccion choco de frente -- el rail
   * contaba 8 diapositivas mientras las diapositivas anunciaban "Paso N de 6",
   * con desfase de uno. Nombrar el destino no cuenta nada, asi que no puede
   * contradecir a ninguna otra numeracion de la seccion, y ademas dice mas: a
   * donde vas, no cuantos hay.
   *
   * Las CUATRO paradas centrales son los cuatro pilares, en el mismo orden en
   * que `PILLARS` los pinta; la primera es el h2 de la intro (sus dos mitades
   * unidas por el mismo espacio con el que se pintan) y la ultima, la frase de
   * cierre. Todo derivado de `PILLARS`/`STORY_SLIDES`, nunca de un literal
   * (regla 39 de RULES.md): si el deck gana o pierde una diapositiva, esto se
   * corrige solo.
   */
  const slideName = (slideIndex: number): string => {
    if (slideIndex === 0) {
      return `${t("Home.story.titleLead")} ${t("Home.story.titleAccent")}`;
    }
    if (slideIndex === STORY_SLIDES - 1) {
      return [
        t("Home.story.statement.first"),
        t("Home.story.statement.second"),
        t("Home.story.statement.third"),
      ].join(" ");
    }
    return t(`Home.story.pillars.${PILLARS[slideIndex - 1].key}.title`);
  };

  return (
    <ScStory
      id="story"
      aria-labelledby="story-title"
      $fullBleed
    >
      {/* ScTrack da a la pagina el recorrido de scroll de las 6
          diapositivas (6 * STORY_DARK_HEIGHT); ScStage, su unico hijo en
          flujo, es quien se pega y permanece en pantalla mientras ese
          recorrido pasa por debajo (spec seccion 4). */}
      <ScTrack ref={trackRef}>
        <ScStage
          ref={stageRef}
          data-slide={index}
          data-dir={direction}
        >
          {/* Texto alternativo del arte del deck (critica externa #16,
              hallazgo A, decision del dueno del 2026-09-03). El defecto
              medido: en oscuro la seccion no describia ni una sola imagen (32
              `alt=""` en el documento) mientras que en claro `figureAlt`
              describia su figura, asi que el MISMO contenido se contaba
              distinto segun el tema.

              Se nombra AQUI, en el consumidor, y no dentro de la escena:
              `StoryCosmicBeing` sigue intacta -- sus 11 capas conservan su
              `alt=""` y su `aria-hidden="true"`, que es lo correcto, porque
              ninguna capa suelta (nebulosa, estrellas lejanas, geometria)
              significa nada por si misma. Lo que significa algo es la SUMA, y
              esa suma solo la conoce quien la coloca en una seccion concreta.

              `role="img"` + `aria-label` es el patron estandar para una
              imagen compuesta de varias imagenes: convierte este envoltorio
              en una hoja del arbol de accesibilidad, asi que el subarbol
              `aria-hidden` de dentro no entra en el nombre ni se anuncia por
              separado -- se anuncia UNA imagen con UN nombre, igual que la
              figura de la rama clara. El envoltorio no lleva texto propio, y
              el atributo no toca layout ni pintura. */}
          <ScSceneWrap
            role="img"
            aria-label={t("Home.story.sceneAlt")}
          >
            <StoryCosmicBeing />
          </ScSceneWrap>
          <ScDeck>
            <ScSlide
              data-slide-index={0}
              data-state={slideState(0)}
            >
              {/* Task 14, fix de revision (plan premium F3, 2026-08-11):
                  mismo parrafo reubicado que en StoryLight, mas arriba en
                  este fichero -- ANTES del primer contenido actual de la
                  diapositiva (el kicker), literal del brief. Ver el docblock
                  de `ScDeckSupportLead`, mas arriba, para el porque del ajuste
                  de margen. */}
              <ScDeckSupportLead data-testid="story-support">
                {t("Home.story.support")}
              </ScDeckSupportLead>
              <Kicker>{t("Home.story.kicker")}</Kicker>
              {/* `{" "}` ANTES del `<br />`: mismo arreglo y mismo motivo que
                  en la rama clara (ver el comentario de `heading`, mas arriba
                  en este fichero) -- las dos ramas pintan el MISMO titulo, asi
                  que el separador tiene que estar en las dos o el texto de una
                  de ellas se lee pegado. */}
              <ScDeckTitle id="story-title">
                {t("Home.story.titleLead")} <br />
                <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
              </ScDeckTitle>
              <ScDeckIntroBody>{t("Home.story.body")}</ScDeckIntroBody>
            </ScSlide>
            {PILLARS.map((pillar, pillarIndex) => (
              <ScSlide
                key={pillar.key}
                data-slide-index={pillarIndex + 1}
                data-state={slideState(pillarIndex + 1)}
              >
                {/* UNA SOLA FORMA DE CONTAR (critica externa #19,
                    2026-09-04, decision del dueno). Aqui vivio
                    `ScPillarNumber`, el numeral "01".."04" del pilar, dentro
                    de una `ScDeckPillarRow` de dos columnas. Se retira: en
                    esta misma parada, a unos centimetros, el rail ya rotula
                    la posicion, y los dos numeros NUNCA coincidian.

                    Medido en Chrome sobre el build de produccion, tema
                    oscuro, con el deck detenido en cada parada:

                    | parada | badge | rail  | separacion 390 | separacion 1440 |
                    | 1      | "01"  | 2 / 6 | 319 px         | 1290 px         |
                    | 2      | "02"  | 3 / 6 | 319 px         | 1290 px         |
                    | 3      | "03"  | 4 / 6 | 319 px         | 1290 px         |
                    | 4      | "04"  | 5 / 6 | 319 px         | 1290 px         |

                    Las cuatro paradas de pilar mostraban TRES numerales a la
                    vez y ninguna pareja cuadraba: el badge cuenta pilares (4)
                    y el rail cuenta diapositivas (6, con intro y cierre
                    dentro), asi que el badge va siempre uno por detras del
                    numerador. Journey, que usa el MISMO chasis de deck, media
                    2 numerales en sus 8 paradas -- solo la fraccion -- porque
                    su ordinal visible se retiro en 2026-08-02 (D16) y se
                    ratifico cuatro veces. La misma pieza indicaba la posicion
                    de dos maneras en una seccion y de una en la otra.

                    Gana la forma de Journey, y no al reves, porque la
                    alternativa (dar numeral visible a los pasos de Journey)
                    esta cerrada por decision del dueno, y porque el propio
                    repo ya resolvio la mitad ASISTIDA de este defecto en el
                    mismo sentido: la critica #12 encontro el rail de Journey
                    anunciando "diapositiva N de 8" mientras las diapositivas
                    anunciaban "Paso N de 6", y el arreglo fue retirar una de
                    las dos numeraciones, no alinearlas. Esto es su gemelo
                    VISUAL. Desde aqui, en las dos secciones, la unica cuenta
                    que se ve es la fraccion del rail: 2 numerales por parada,
                    siempre, en los dos decks.

                    EFECTO DE LAYOUT, medido en el mismo navegador: la
                    columna de 2,5rem que el numeral reservaba desaparece con
                    el. A 390 no cambia nada -- la fila ya apilaba el numeral
                    sobre la copia por debajo de sm (ola L), asi que la copia
                    seguia midiendo 302 px y su titulo arrancando en x=32; lo
                    que se recupera ahi es alto, no ancho. A 1440 la copia pasa
                    de 1064 a 1120 px y el titulo del pilar de x=168 a x=112 --
                    que es EXACTAMENTE donde arranca el titulo de la intro
                    (medido: 112 px), una alineacion que la columna reservada
                    rompia en las cuatro paradas de pilar.

                    Lo que NO cambia: la lectura asistida. La fraccion sigue
                    siendo `aria-hidden` y cada marca del rail sigue siendo un
                    boton con nombre propio y `aria-current`. El numeral que
                    se va era ademas la unica pieza del sitio que ANUNCIABA un
                    "cero uno" suelto delante del titulo -- lo que la propia
                    rama clara declara como ruido sin informacion en el
                    comentario de `ScCardBadge`. El pilar se identifica por su
                    titulo, que no se toca.

                    El candado que ata las dos secciones a la misma forma de
                    contar vive en `Journey.test.tsx` ("una sola forma de
                    contar"), que es el fichero que ya importa las dos. */}
                <ScPillarCopy>
                  <ScDeckPillarTitle>
                    {t(`Home.story.pillars.${pillar.key}.title`)}
                  </ScDeckPillarTitle>
                  {/* Rol de SUBTITULO (T2 de la spec): el texto que hoy
                      vive en `pillars.<key>.body`, sin renombrar la
                      clave -- solo cambia el rol en el que se pinta. */}
                  <ScDeckPillarSubtitle>
                    {t(`Home.story.pillars.${pillar.key}.body`)}
                  </ScDeckPillarSubtitle>
                  <ScDeckPillarBody>
                    {t(`Home.story.pillars.${pillar.key}.inspiration`)}
                  </ScDeckPillarBody>
                </ScPillarCopy>
              </ScSlide>
            ))}
            {/* Cierre de Story, unificado con la rama clara (Task 15, D-C,
                2026-08-11) en las dos cosas que las auditorias senalaban como
                "dos productos distintos bajo la misma URL":

                1. El TEXTO. Hasta aqui esta diapositiva consumia
                   `Home.story.noteLead`/`noteAccent` (T3 de la spec
                   2026-07-31), claves EXCLUSIVAS de esta rama que decian la
                   MISMA frase que `Home.story.statement.*` de la rama clara
                   con otra particion y un punto final ("Cada idea puede ser
                   un | nuevo comienzo." frente a "Cada idea | puede ser | un
                   nuevo comienzo"). Dos juegos de claves para una sola frase
                   es justo lo que un solo arbol de contenido no admite: gana
                   el de la rama clara -- es el que ademas sostiene el bloque a
                   pantalla completa, la version con MAS presencia -- y las
                   tres claves de la nota se retiran del JSON. El acento sigue
                   cayendo sobre el mismo tramo final de la frase.
                2. El LANDMARK. Este elemento pasa a ser `<section
                   id="statement">`, el mismo id que emite la rama clara, para
                   que la lista de secciones de la pagina sea IDENTICA en los
                   dos temas (candado: `HomeSections.test.tsx`). Desde la
                   critica externa #15 (hallazgo C10) el anidamiento tambien es
                   el mismo: la rama clara dejo de emitirlo como HERMANO de
                   `ScStory` y lo emite, como aqui, DENTRO de `#story` -- el
                   argumento completo esta en el docblock de `ScStatement`, y
                   se resolvio a favor de esta forma, no de la de alla, por lo
                   que el propio parrafo de abajo ya media. Lo que NO se unifica es el
                   VEHICULO: en claro es una seccion a pantalla completa
                   hermana de Story, aqui es la ultima diapositiva del deck --
                   la identidad de esta rama, y el sitio exacto donde el deck
                   coloca su cierre. Sacarla del deck a una seccion hermana
                   NO es una opcion barata: el solape de la pagina oscura
                   reserva EXACTAMENTE una pantalla vacia al final de Story
                   (`STORY_DECK_TAIL_SCREENS`) para que Journey suba sobre
                   ella (`JOURNEY_OVERLAY_RISE`), asi que cualquier contenido
                   real puesto ahi lo taparia Journey; ver el informe de la
                   tarea para las dos opciones y su coste.

                `<section>` anidada dentro de otra es HTML valido y, como esta
                no declara nombre accesible (igual que `ScStatement` en la
                rama clara), no entra en el arbol de accesibilidad como
                landmark: no compite con la region de Story.

                ALINEACION: esta diapositiva NO lleva ningun prop propio y se
                centra como las otras cinco. Entre el 2026-08-12 y el
                2026-08-16 llevaba `$anchorTop` (`align-self: start`) para
                retrasar el momento en que Journey tapa el enlace de Discord:
                el riesgo que el parrafo de arriba ya declaraba ("cualquier
                contenido real puesto ahi lo taparia Journey") se materializo,
                y anclarla arriba compraba 120-180px de ventana limpia. Se
                revirtio el 2026-08-16 por veredicto del dueño mirando la
                pagina: ese anclaje dejaba 431px de hueco vacio debajo del
                bloque a 1920x905 (633px a 390x844), y la ultima diapositiva
                del deck se leia como un bloque desprendido arriba. La medicion
                completa de las dos variantes, y por que el hallazgo D1 sigue
                vivo pero no se arregla desde aqui, en el docblock de `ScSlide`
                (story.deck.tsx). */}
            <ScSlide
              as="section"
              id="statement"
              data-slide-index={STORY_SLIDES - 1}
              data-state={slideState(STORY_SLIDES - 1)}
            >
              <ScDeckNote>
                {t("Home.story.statement.first")}{" "}
                {t("Home.story.statement.second")}{" "}
                <ScDeckNoteAccent>
                  {t("Home.story.statement.third")}
                </ScDeckNoteAccent>
              </ScDeckNote>
              {/* Salida de pertenencia (Task 6): enlace REAL, hermano de
                  ScDeckNote -- mismo criterio que ScStatementLink en la
                  rama clara, ver su docblock mas arriba. */}
              <ScDeckNoteLink
                href={links.discord}
                target="_blank"
                rel="noopener noreferrer"
                onFocus={focusClosingSlide}
              >
                {t("Home.story.communityLink")}
                <VisuallyHidden> {tCommon("Common.Nav.newTab")}</VisuallyHidden>
              </ScDeckNoteLink>
            </ScSlide>
          </ScDeck>
          {/* Rail de progreso (D13), OPERABLE desde la critica externa #12
              (dimension 4 de Craft): STORY_SLIDES marcas que reflejan
              data-slide del stage por CSS puro (ScRailMark, story.deck.tsx) y
              que ademas llevan a su diapositiva al pulsarlas. Mismo contrato
              que el rail de Journey desde la critica #10 (commit f9cf823):
              botones reales, aria-current, diana de 24px.

              De aria-hidden a role="group": seis botones operables no pueden
              estar fuera del arbol de accesibilidad, y sin agrupar se
              anunciarian como seis controles sin relacion entre si.

              El nombre del grupo sale de `Home.story.railLabel` (clave creada
              en la integracion de la ola H: el agente del deck tenia los JSON
              de i18n fuera de su dominio y lo dejo declarado; reutilizar
              `Home.journey.railLabel` habria sido una seccion nombrandose con
              el copy de otra). Los seis botones tienen ademas nombre propio --
              el titulo de su diapositiva, ver slideName mas arriba.

              aria-current marca el activo. NO gobierna el estilo: eso lo sigue
              haciendo el selector descendiente sobre data-slide, que ya estaba
              probado -- ver el docblock de ScRailMark. */}
          <ScRail
            role="group"
            aria-label={t("Home.story.railLabel")}
          >
            {/* Rotulo de posicion (critica externa #16, decision del dueno):
                la fraccion apilada que hace VISIBLE por donde va el deck. No
                lleva ni una palabra -- son dos numeros y una barra dibujada
                con un borde -- asi que no consume ninguna clave de i18n: la
                barra es geometria, no copia (ver el docblock de
                ScRailStatusTotal). Y va aria-hidden a proposito: el rail ya
                tiene su capa accesible (nombre de destino por marca +
                aria-current) y darle voz a un segundo sistema de numeracion
                es exactamente el defecto que la critica #12 midio y retiro en
                Journey. */}
            <ScRailStatus aria-hidden="true">
              <ScRailStatusCurrent>{index + 1}</ScRailStatusCurrent>
              <ScRailStatusTotal>{STORY_SLIDES}</ScRailStatusTotal>
            </ScRailStatus>
            {Array.from({ length: STORY_SLIDES }, (_, railIndex) => (
              <ScRailMark
                key={railIndex}
                type="button"
                $index={railIndex}
                aria-current={railIndex === index ? "true" : undefined}
                aria-label={slideName(railIndex)}
                onClick={() => scrollToSlide(railIndex)}
              />
            ))}
          </ScRail>
          {/* Pista de scroll (Task 4): visual, aria-hidden, se desvanece con
              el PRIMER avance del deck reutilizando data-slide (ver el
              docblock de ScScrollHint, story.deck.tsx). */}
          <ScScrollHint aria-hidden="true">
            {tCommon("Common.Deck.scrollHint")}
          </ScScrollHint>
        </ScStage>
      </ScTrack>
    </ScStory>
  );
}
