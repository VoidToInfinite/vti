"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import styled, { type DefaultTheme } from "styled-components";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import { NAV_GROUPS, type NavGroup, type NavItem } from "@/config/navigation";
import { useActiveSectionKey } from "@/hooks/useActiveSection";
import { DECK, OVERLAY, PRESS } from "@/motion/vocabulary";
import { focusNavAnchorTarget } from "./navAnchorFocus";

/*
 * HOJA DE NAVEGACIÓN MÓVIL (Task 10 de la auditoría premium; spec del vault
 * `2026-08-08-mobile-first-spec.md`, orden #5).
 *
 * ## Qué problema resuelve
 *
 * Bajo 768 px la navegación entera del sitio era `display: none` sin ninguna
 * alternativa: `ScNavLinks` (`Navbar.tsx`) solo pasa a `flex` dentro de
 * `@media md`, así que en móvil el único enlace de navegación visible era la
 * marca. El recorrido móvil medido en vivo (375x812) es de 10,9 pantallas en
 * tema claro y 17,9 en oscuro, y era SOLO-SCROLL: no había forma de saltar a
 * una sección, ni de llegar al SDK, a Discord o a GitHub, sin recorrer la
 * página entera.
 *
 * ## Por qué el selector de idioma se muda aquí dentro
 *
 * Restricción física medida en la spec, no preferencia: a 375 px el navbar
 * tiene 337 px de contenido intrínseco en 343 px disponibles. Un disparador
 * de 44x44 (el mínimo táctil AA que el resto del sitio ya respeta) NO CABE
 * sin liberar espacio, y el selector de idioma es lo único de la barra que
 * puede mudarse sin perder función: el toggle de tema cambia toda la página
 * de un toque y la marca es el enlace a la home.
 *
 * El mecanismo elegido es renderizarlo DOS VECES con visibilidad excluyente
 * por CSS -- una copia en la barra (oculta bajo `md`, ver `ScBarLanguage` en
 * `Navbar.tsx`) y otra aquí dentro (oculta desde `md`, junto con toda la
 * hoja) -- en vez de moverlo con JavaScript. El porqué:
 *
 * - Con `output: "export"` (ver `CLAUDE.md` §1) el HTML se prerenderiza sin
 *   saber el ancho del cliente. Decidir la posición con `matchMedia`
 *   produciría un primer pintado en el sitio equivocado y un salto al
 *   hidratar, además de dejar el selector donde cayera si el visitante no
 *   ejecuta JavaScript.
 * - `display: none` retira el subárbol del árbol de accesibilidad por
 *   completo, así que en CUALQUIER ancho real hay exactamente UNA copia
 *   anunciable: no hay controles duplicados para un lector de pantalla.
 * - Los dos botones ya son idénticos (`LanguageSelector` no recibe ninguna
 *   prop), así que no hay estado que sincronizar entre las dos copias: las
 *   dos leen `i18n.language` del mismo proveedor.
 *
 * COSTE REAL, declarado y no escondido: en el DOM hay dos copias. En jsdom,
 * que no evalúa ningún `@media` (regla 36), las DOS existen a la vez, así que
 * cualquier consulta por rol de un botón de idioma pasa a devolver dos
 * resultados y necesita `hidden: true` -- exactamente el mismo peaje que
 * `ScNavLinks` ya cobra hoy (ver el comentario de `getTrigger` en
 * `Navbar.test.tsx`). Los tests afectados se actualizan a esa verdad nueva
 * (regla 40), no se relajan.
 *
 * ## Por qué NO hay bloqueo de scroll (regla 21 de `RULES.md`)
 *
 * El patrón clásico de una hoja o un modal es `overflow: hidden` en
 * `html`/`body` mientras está abierta. Aquí está VETADO: `html`/`body` con
 * `overflow: hidden` obliga al eje contrario a computar `auto`, lo que
 * convierte a `html`/`body` en contenedor de scroll y hace que los cuatro
 * `position: sticky` de las presentaciones (Story, Journey, Features,
 * Contact) se peguen respecto a ESE contenedor en vez de respecto al
 * viewport: el pin de las cuatro secciones se rompería en silencio mientras
 * la hoja estuviera abierta. Es la lección ya pagada que documenta
 * `GlobalStyles.tsx` (`overflow-x: clip`, nunca `hidden`).
 *
 * La sustitución, punto por punto:
 * - `overscroll-behavior: contain` en la hoja: llegar al final de su propia
 *   lista NO encadena el scroll a la página de debajo.
 * - Cierre al scrollear la página, con listener PASIVO (ver `useNavSheet`):
 *   si la página se mueve, la hoja deja de tener sentido y se retira sola.
 * - El velo captura el puntero mientras está abierta, así que un toque fuera
 *   cierra en vez de activar lo que hubiera debajo.
 */

/**
 * Tolerancia del cierre por scroll, en píxeles. Sin ella, CUALQUIER
 * movimiento de un solo píxel cerraría la hoja: en móvil el propio navegador
 * mueve el scroll sin que el usuario lo pida (colapso de la barra de
 * direcciones al aparecer una capa, rebote elástico al final del documento),
 * y la hoja se cerraría sola nada más abrirse. 8 px es el mismo orden de
 * magnitud que el umbral con el que `useNavDetach(8)` ya decide "la página
 * está scrolleada" en esta misma barra; no se comparte constante con él
 * porque son dos decisiones distintas (aquí, "el usuario ha movido la
 * página de verdad"; allí, "la barra ya no está pegada arriba") que pueden
 * divergir sin arrastrarse.
 */
export const NAV_SHEET_SCROLL_TOLERANCE_PX = 8;

/**
 * Alto máximo de la hoja. `dvh` y no `vh`: en móvil la barra de direcciones
 * entra y sale, y `vh` se resuelve contra el viewport GRANDE (sin barra), así
 * que una hoja de "70vh" puede quedar parcialmente fuera de la pantalla
 * mientras la barra está visible. `dvh` sigue el viewport real en cada
 * momento, que es lo que esta medida necesita. Verbatim de la spec del vault.
 */
const NAV_SHEET_MAX_HEIGHT = "70dvh";

/**
 * Disparador de la hoja: el hueco responsivo que lo contiene.
 *
 * Es un envoltorio propio, y no un `styled(IconButton)`, a propósito: el
 * botón real es un `IconButton` (mismo átomo que `ThemeToggle`, su vecino en
 * la barra, del que hereda el área de 44x44, el anillo de descubribilidad de
 * la variante ghost, el halo de foco y el press de `vocabulary.PRESS`), y
 * conmutar SU `display` desde una capa `styled(IconButton)` dependería del
 * orden de inyección de tres clases encadenadas (ScButton -> ScSquare -> la
 * capa nueva). Un envoltorio con su propio `display: none` no depende de
 * ninguna cascada: si el envoltorio no genera caja, el botón tampoco existe,
 * sea cual sea el CSS del botón.
 *
 * Mobile-first (regla transversal de la spec): la regla base es la MÓVIL
 * (visible) y se corrige hacia arriba con `min-width`, nunca con un
 * `max-width` de layout.
 */
const ScSheetTriggerSlot = styled.span`
  display: inline-flex;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: none;
  }
`;

/*
 * Icono hamburguesa. Tres barras que se transforman en aspa al abrir.
 *
 * `width`/`height`/`flex` son OBLIGATORIOS y no cosméticos (regla 20 de
 * `RULES.md`): `GlobalStyles` declara `svg { width: 100%; display: block; }`
 * para todo el sitio y una declaración CSS gana SIEMPRE a la geometría
 * implícita del `viewBox`. Es el mismo fallo que ya se midió tres veces en
 * este repo (`ScLogo` en `Logo.tsx`: 167 px de ancho dentro de una barra de
 * 56 px; `ScChevron` en `Navbar.tsx`: 215x143 px). `1em`, no un valor
 * absoluto: `IconButton` fija `font-size` por tamaño (`ICON_SIDE`, 20 px en
 * `md`), así que el icono escala con esa tabla en vez de fijar un número
 * propio que se desincronizaría de ella.
 *
 * Las barras son `<rect>` y no `<line>` por el morfado: `transform-box:
 * fill-box` resuelve `transform-origin: center` contra la caja del propio
 * elemento (sin él, el origen sería la esquina del sistema de coordenadas
 * del SVG y las barras rotarían alrededor de un punto ajeno), y una `<line>`
 * horizontal tiene caja de altura CERO, un caso degenerado que no todos los
 * motores resuelven igual. Un `<rect>` siempre tiene caja real.
 *
 * Solo se animan `transform` y `opacity` (regla 18). Las barras superior e
 * inferior viajan 4 unidades hasta el centro (y=4 y y=12 -> y=8) y rotan en
 * contrafase; la central se desvanece encogiendo en X. Misma asimetría
 * 120/180 que la propia hoja, para que icono y hoja se muevan como una sola
 * pieza en vez de con dos relojes distintos.
 */
const ScBurger = styled.svg`
  width: 1em;
  height: 1em;
  flex: none;

  rect {
    fill: currentColor;
    transform-box: fill-box;
    transform-origin: center;
    transition:
      transform ${OVERLAY.closeMs}ms ${PRESS.easing},
      opacity ${OVERLAY.closeMs}ms ${PRESS.easing};
  }

  &[data-open="true"] {
    rect {
      transition:
        transform ${OVERLAY.openMs}ms ${PRESS.easing},
        opacity ${OVERLAY.openMs}ms ${PRESS.easing};
    }

    [data-burger-line="top"] {
      transform: translateY(4px) rotate(45deg);
    }

    [data-burger-line="middle"] {
      opacity: 0;
      transform: scaleX(0.2);
    }

    [data-burger-line="bottom"] {
      transform: translateY(-4px) rotate(-45deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    rect {
      transition: none;
    }

    /* Mismo hallazgo 4 que ScBar/ScNavPanel en Navbar.tsx: el bloque
       anidado de arriba redeclara la transition de rect con MAYOR
       especificidad (atributo + clase + tipo) que el rect suelto de este
       bloque reduce (clase + tipo). Sin redeclararlo aquí dentro, bajo
       reduce el icono abierto seguiría animando. */
    &[data-open="true"] rect {
      transition: none;
    }
  }
`;

/*
 * Velo. Existe por una razón funcional, no decorativa: sin él, un toque
 * fuera de la hoja cerraría la hoja Y activaría el enlace o el botón que
 * hubiera debajo, porque no hay bloqueo de scroll ni captura de puntero de
 * ningún otro tipo (ver la nota sobre la regla 21, arriba). Con el velo
 * abierto el toque cae SIEMPRE sobre él, y el manejador de `pointerdown` de
 * `useNavSheet` lo interpreta como "fuera" y cierra, sin activar nada.
 *
 * `glass.bg` + `glass.blur`: el sistema reserva el glassmorphism justo para
 * este rol -- capas que flotan sobre contenido en scroll, y el docblock de
 * `ScHeader` (`Navbar.tsx`) nombra literalmente "sheet" entre ellas. El velo
 * es la capa esmerilada; la hoja, encima, es superficie OPACA (ver
 * `ScNavSheet`), así que no se apilan dos `backdrop-filter` -- caro en GPU y
 * de resultado impredecible entre motores.
 *
 * Duración: `DECK.railDurationMs` (200 ms), el valor que el vocabulario ya
 * reserva para el fade de una capa de presentación. El velo es más lento que
 * la hoja a propósito: la hoja es el objeto que el usuario está mirando y
 * llega antes; el fondo cede después.
 *
 * `visibility` entra en la lista de `transition` SOLO en el sentido de
 * CIERRE (la lista base), nunca en el bloque de apertura. Ver la nota
 * "VISIBILITY, MEDIDO EN NAVEGADOR REAL" en `ScNavSheet`, más abajo: es el
 * mismo mecanismo y el mismo motivo, y aquí evita además que el velo tarde un
 * frame en capturar el puntero.
 */
const ScSheetVeil = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.data.zIndex.overlay};
  background: ${({ theme }) => theme.data.glass.bg};
  /* -webkit- primero, mismo orden de fallback que ScSurface/ScNavPanel:
     Safari solo reconoce el prefijo y el estándar lo sobrescribe donde los
     dos existen. Sin ninguno de los dos el velo sigue siendo legible: la
     capa ya es semitransparente por sí sola. */
  -webkit-backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity ${DECK.railDurationMs}ms ${PRESS.easing},
    visibility ${DECK.railDurationMs}ms ${PRESS.easing};

  &[data-open="true"] {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    /* Sin entrada de visibility, igual que la hoja: aquí no hay foco que
       meter, pero sí un frame de captura de puntero que se perdería.
       (Regla 23: nada de comillas invertidas dentro de un comentario de
       template, cierran el literal y rompen el build.) */
    transition: opacity ${DECK.railDurationMs}ms ${PRESS.easing};
  }

  /* Desde md la hoja entera deja de existir visualmente, SIN desmontarse:
     mismo patrón que ScNavLinks (que hace el camino inverso) -- el orden de
     tabulación no cambia de forma condicional al viewport por obra de
     JavaScript, lo decide el CSS. */
  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &[data-open="true"] {
      transition: none;
    }
  }
`;

/*
 * La hoja. Panel inferior anclado al borde de la pantalla.
 *
 * `position: fixed` obliga a que este nodo viva FUERA de `ScHeader`: esa
 * cabecera declara `transform: translateY(...)` para su entrada en la carga,
 * y un ancestro con `transform` se convierte en el bloque contenedor de
 * cualquier `position: fixed` de su interior. Dentro de `ScHeader`,
 * `bottom: 0` no significaría "el borde inferior de la pantalla" sino "el
 * borde inferior de la barra". Por eso `Navbar()` devuelve un fragmento con
 * la hoja como HERMANA de `ScHeader` y no como hija, y por eso el contrato
 * de teclado se resuelve con listeners de documento en vez de con
 * `onKeyDown`/`onBlur` sobre un envoltorio común (ver `useNavSheet`).
 *
 * Superficie OPACA (`semantic.surface`), no cristal: el cristal ya lo pone
 * el velo de debajo, y una hoja con texto encima necesita un fondo con
 * contraste garantizado sea cual sea la sección de la página que quede
 * detrás. `elevation[4]` es la sombra más alta de la escala, coherente con
 * una capa que flota por encima de todo lo demás.
 *
 * `border-top`, declarado explícitamente: `GlobalStyles` aplica `border: 0`
 * al selector universal, así que sin esta línea no habría filo.
 *
 * MOVIMIENTO (gramática de Task 9, escala añadida en Task 17): `transform-
 * origin: bottom center` -- la hoja nace del borde inferior, que es de donde
 * entra --, `translateY(100%) scale(OVERLAY.closedScale)` en cerrado y
 * asimetría 180/120 con `PRESS.easing`, declarada como DOS bloques de
 * `transition` (base = cerrar, `[data-open="true"]` = abrir) sin ningún
 * estado de React adicional (regla 26).
 *
 * HISTORIA DE LA ESCALA: hasta Task 17 esta hoja NO llevaba `scale`, a
 * diferencia de `ScNavPanel` -- la razón original: "un panel que cuelga de
 * su disparador se lee como algo que se despliega y encoger la escala
 * refuerza ese origen, pero una hoja DESLIZA desde el borde, añadirle escala
 * la haría leerse como un modal que salta, que es otro gesto". Task 17 (plan
 * premium F1-F5, 2026-08-11) revierte esa exclusión a propósito: su brief
 * pide paridad de motion EXPLÍCITA entre panel y hoja ("cierre con
 * scale(0.97) en ambos"), y la auditoría independiente que motivó la tarea
 * señala la inconsistencia entre las dos superficies de navegación flotante
 * como parte del mismo defecto de coherencia que el punto 1 de esa tarea
 * corrige para el scroll de tema. Con `transform-origin: bottom center` (sin
 * cambiar, a diferencia del `top left` del panel) el encogimiento es
 * simétrico en X y tira el borde superior levemente hacia el inferior -- el
 * mismo patrón de "hoja que se asienta" de las hojas inferiores nativas de
 * iOS/Material al cerrarse, no el "modal que salta" que la razón original
 * temía. Ver el docblock de `OVERLAY` (`src/motion/vocabulary.ts`) para el
 * detalle completo de la decisión.
 *
 * `overscroll-behavior: contain` (regla 21, sustituto del bloqueo de scroll
 * clásico): al llegar al final de esta lista, el gesto NO encadena a la
 * página de debajo. Vive en `ScSheetScroll` (más abajo), no aquí -- ver su
 * docblock para el porqué de la división en dos capas.
 *
 * ## VISIBILITY, MEDIDO EN NAVEGADOR REAL: en la lista de CIERRE, nunca en la
 * de apertura
 *
 * `visibility` sigue siendo la propiedad correcta para ocultar una superficie
 * cerrada (saca su contenido del árbol de accesibilidad y del orden de
 * tabulación; `opacity` sola nunca basta), y sigue en la lista base de
 * `transition` -- la del CIERRE -- por el motivo que documenta `ScNavPanel`
 * (`Navbar.tsx`): su animación es DISCRETA por especificación, así que al
 * pasar de `visible` a `hidden` el cambio se aplica al FINAL y la hoja sigue
 * pintando durante todo el fundido de salida.
 *
 * En el bloque de APERTURA está retirada a propósito, y esto NO es una
 * simetría rota por descuido: la misma especificación dice que, en una
 * transición discreta, los valores del temporizador ENTRE 0 y 1 mapean al
 * valor final -- t=0 exacto todavía vale el valor de PARTIDA. Al abrir eso
 * significa que, en el instante 0, `visibility` sigue computando `hidden`, y
 * un elemento con `visibility: hidden` NO ES FOCALIZABLE. Medido en Chrome
 * real (375x812, dev server): con `visibility` en la lista de apertura, el
 * `focus()` que mete el foco en la primera fila (ver el punto 6 del docblock
 * de `useNavSheet`) se ejecutaba con `getComputedStyle(fila).visibility ===
 * "hidden"` y el navegador lo descartaba en silencio -- la hoja se abría sin
 * foco dentro y quedaba inalcanzable por teclado. jsdom no puede ver este
 * fallo: no implementa transiciones ni la focalización condicionada por
 * `visibility`, así que su test pasaba en verde con el bug delante.
 *
 * Sin `visibility` en la lista de apertura, el valor salta a `visible` de
 * inmediato y la fila es focalizable en el mismo tick. El fundido de entrada
 * lo siguen haciendo `opacity` y `transform`, así que no se pierde nada del
 * movimiento; y el sentido de cierre conserva su retardo intacto. El candado
 * que impide que alguien "arregle" la asimetría volviendo a añadirla vive en
 * `Navbar.test.tsx`.
 */
const ScNavSheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.data.zIndex.modal};
  display: flex;
  flex-direction: column;
  max-height: ${NAV_SHEET_MAX_HEIGHT};
  /*
   * Safe area (Task 13, punto 1 del brief): la hoja está anclada a
   * left/right/bottom: 0 del VIEWPORT (docblock de arriba: por diseño, vive
   * FUERA de ScHeader para que estos fixed se resuelvan contra la pantalla,
   * no contra la barra), así que sus tres bordes físicos pueden caer bajo
   * un recorte de hardware: el inferior es el que más importa en la
   * práctica -- la barra de gestos/home-indicator de iOS se solapa justo
   * con la fila de enlaces inferior sin este relleno --, y left/right
   * cubren el notch lateral en landscape, igual que ScNav (Navbar.tsx).
   * calc() en las tres, nunca la mera longitud del token: con insets a 0
   * (escritorio, la inmensa mayoría de Android) los tres colapsan al valor
   * de siempre -- layout idéntico al de antes de esta tarea. padding-top se
   * queda en el token puro, sin env(): el borde superior de la hoja nunca
   * toca un edge físico del dispositivo (nace por encima del contenido, no
   * del viewport).
   */
  padding: ${({ theme }) => theme.data.space[3]}
    calc(
      ${({ theme }) => theme.data.space[4]} + env(safe-area-inset-right, 0px)
    )
    calc(
      ${({ theme }) => theme.data.space[6]} + env(safe-area-inset-bottom, 0px)
    )
    calc(${({ theme }) => theme.data.space[4]} + env(safe-area-inset-left, 0px));
  border-top: ${({ theme }) => theme.data.glass.border};
  border-radius: ${({ theme }) => theme.data.radius.xl}
    ${({ theme }) => theme.data.radius.xl} 0 0;
  background: ${({ theme }) => theme.data.semantic.surface};
  box-shadow: ${({ theme }) => theme.data.elevation[4]};

  transform-origin: bottom center;
  visibility: hidden;
  opacity: 0;
  transform: translateY(100%) scale(${OVERLAY.closedScale});
  pointer-events: none;
  transition:
    opacity ${OVERLAY.closeMs}ms ${PRESS.easing},
    transform ${OVERLAY.closeMs}ms ${PRESS.easing},
    visibility ${OVERLAY.closeMs}ms ${PRESS.easing};

  &[data-open="true"] {
    visibility: visible;
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    /* Sin entrada de visibility a propósito: ver la nota "VISIBILITY,
       MEDIDO EN NAVEGADOR REAL" del docblock de arriba. */
    transition:
      opacity ${OVERLAY.openMs}ms ${PRESS.easing},
      transform ${OVERLAY.openMs}ms ${PRESS.easing};
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &[data-open="true"] {
      transition: none;
    }
  }
`;

/*
 * CAPA DE SCROLL, separada de `ScNavSheet` (Task 35, hallazgo de un
 * evaluador independiente en el gate F4, 2026-08-12; medido en navegador
 * real, no en jsdom -- jsdom no hace layout ni scroll de verdad, así que
 * este defecto era invisible a la suite hasta que se probó en Chrome real).
 *
 * Hasta esta tarea, `ScNavSheet` era a la vez el CONTENEDOR DE POSICIÓN (el
 * panel fijo que anima apertura/cierre) Y el CONTENEDOR DE SCROLL
 * (`overflow-y: auto`) de su propio contenido. El primer intento de esta
 * tarea añadió `ScSheetCloseSlot` (el botón de cierre nuevo, ver su
 * docblock) como descendiente `position: absolute` DIRECTO de `ScNavSheet`
 * -- y un descendiente posicionado (`absolute` o `fixed`, probados los dos)
 * de un elemento que es SIMULTÁNEAMENTE su bloque contenedor Y su propio
 * contenedor de scroll se desplaza CON el contenido al hacer scroll: su
 * `top`/`right` se miden desde el borde de la caja, pero esa caja arrastra
 * consigo el desplazamiento que `scrollTop` le aplica a su propio contenido
 * (el mismo mecanismo por el que las filas de la lista se mueven al
 * scrollear, aplicado también al botón). Medido con la hoja scrolleada al
 * final (`scrollTop = 177`, el valor exacto del hallazgo original de esta
 * tarea): `getBoundingClientRect().top` del botón pasaba de 252,6 (correcto,
 * cerca del borde superior del panel) a 75,6 -- fuera de la zona visible del
 * panel, recortado por su propio `overflow-y: auto` -- y `elementFromPoint`
 * sobre su centro volvía a devolver `ScSheetVeil`, el MISMO síntoma que este
 * botón existe para arreglar, ahora condicionado a "la hoja está
 * scrolleada" en vez de a "la hoja está abierta".
 *
 * La solución real es separar las dos responsabilidades en dos elementos:
 * `ScNavSheet` (arriba) se queda con la posición/z-index/apariencia/
 * animación y dejó de scrollear (ya no declara `overflow-y`/`gap`); ESTA
 * capa (`ScSheetScroll`) es su ÚNICO hijo de flujo normal, un `<div>`
 * puramente de contenido que hereda el hueco restante
 * (`flex: 1 1 auto; min-height: 0` -- el patrón estándar de "hijo flex que
 * scrollea dentro de un contenedor de altura acotada": sin `min-height: 0`
 * un elemento flex nunca se encoge por debajo del tamaño intrínseco de su
 * contenido, así que `overflow-y: auto` nunca llegaría a activarse) y
 * scrollea SU PROPIO contenido con normalidad. `ScSheetCloseSlot`, ahora
 * HERMANO de esta capa (no descendiente), queda fuera de su contenedor de
 * scroll por completo: su `position: absolute` sigue resolviendo contra
 * `ScNavSheet` (que sigue siendo su bloque contenedor, `position: fixed`),
 * pero esa caja YA NO se desplaza con nada -- el `scrollTop` que cambia vive
 * en un elemento DISTINTO del que establece la posición del botón.
 */
const ScSheetScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[4]};
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

/* Asa decorativa: la señal universal de "esto es una hoja que se puede
   retirar". `aria-hidden` y sin texto: no aporta nada a quien no ve la
   pantalla, que ya tiene el disparador con su `aria-expanded`. */
const ScSheetHandle = styled.div`
  align-self: center;
  width: ${({ theme }) => theme.data.space[7]};
  height: ${({ theme }) => theme.data.space[1]};
  flex: none;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: ${({ theme }) => theme.data.semantic.borderStrong};
`;

/*
 * Botón de cierre PROPIO de la hoja (Task 35, punto 2 del brief; hallazgo de
 * un evaluador independiente en el gate F4, 2026-08-12).
 *
 * Por qué hace falta uno nuevo, si el disparador de la barra YA muta a un
 * icono de aspa (`aria-expanded="true"`, `ScBurger` con `data-open="true"`)
 * en cuanto la hoja se abre: ese disparador vive DENTRO de `ScHeader`
 * (`Navbar.tsx`), que crea su PROPIO contexto de apilamiento
 * (`position: fixed` + `z-index: stickyNav` -- ver el docblock de `ScHeader`
 * en ese fichero). Un contexto de apilamiento se pinta como una unidad
 * ATÓMICA frente a sus hermanos: ningún `z-index` que se le ponga a un
 * DESCENDIENTE de `ScHeader` puede escapar de él para ganarle al velo
 * (`zIndex.overlay`, 900), que es SIEMPRE hermano de `ScHeader`, nunca su
 * descendiente. Medido con `elementFromPoint` en navegador real sobre el
 * centro del icono con la hoja abierta: devolvía `ScSheetVeil`, no el botón
 * -- el velo sobre el header es el patrón modal correcto (sancionado en su
 * día), pero tapar también su propio botón de cierre no lo es.
 *
 * La solución NO es subir el `z-index` de `ScHeader` entero: eso sacaría
 * TODA la barra por encima del velo -- marca, selector de idioma,
 * conmutador de tema -- y reabriría el problema que el velo existe para
 * evitar (un toque sobre esos controles los activaría de verdad en vez de
 * solo cerrar la hoja). Este botón es DESCENDIENTE de `ScNavSheet`, que ya
 * vive fuera de `ScHeader` (ver su docblock) con
 * `z-index: zIndex.modal` (1000) > `zIndex.overlay` (900): hereda esa
 * posición en el apilamiento por construcción, sin necesitar ningún
 * `z-index` propio ni tocar el disparador de la barra.
 *
 * `position: absolute`: el bloque contenedor es `ScNavSheet` (`position:
 * fixed`, su padre directo), y desde esta tarea `ScNavSheet` YA NO es
 * también un contenedor de scroll -- esa responsabilidad se aisló en
 * `ScSheetScroll`, un HERMANO de este botón (ver su docblock para la
 * historia completa: el primer intento de esta tarea puso este botón como
 * descendiente `absolute` -- y luego, sin éxito, `fixed` -- de la propia
 * `ScNavSheet` de ANTES de la división, mientras esa capa combinaba las dos
 * responsabilidades, y el botón se desplazaba con el scroll de la lista,
 * midiendo en navegador real el MISMO síntoma que este botón existe para
 * arreglar). Con las dos responsabilidades separadas, `absolute` es la
 * elección correcta y más simple: sale del flujo, así que su posición en el
 * JSX no desplaza ni la capa de scroll ni nada dentro de ella -- se declara
 * DESPUÉS de `ScSheetScroll` a propósito, para no adelantarse al primer
 * enlace en el `querySelector("a, button")` del efecto de foco de
 * `useNavSheet` (que asume que la primera fila real, no este botón, es el
 * primer resultado).
 */
const ScSheetCloseSlot = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.data.space[2]};
  right: ${({ theme }) => theme.data.space[2]};
`;

const ScSheetGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};
`;

/* Mismo rol y mismo tratamiento que `ScColumnTitle` en `Footer.tsx`: no es
   un encabezado del documento (`h2`/`h3`) sino la etiqueta de una lista.
   Convertirlo en `h*` metería cuatro títulos en el esquema de encabezados de
   la página que solo existirían bajo 768 px; el nombre accesible de la lista
   se resuelve con `aria-labelledby`, que es la herramienta correcta para
   esto. */
const ScSheetGroupTitle = styled.p`
  margin: 0;
  padding: 0 ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;

const ScSheetList = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`;

/*
 * Fila. `min-height: 44px` es el suelo táctil AA que ya usan
 * `ScLanguageButton`, `ScNavTrigger` y `ScBrandLink`; `display: flex` gana al
 * `a { display: block }` global por especificidad de clase.
 *
 * El hover cambia SOLO color y fondo (dos propiedades de pintado), así que no
 * necesita guardarse tras `PRESS.hoverGuard`: ese guard existe para los
 * hovers que MUEVEN, que en un dispositivo táctil se quedan enganchados tras
 * el toque. El press (`:active`, `PRESS.activeScale`) sí se declara sin
 * guard, igual que en el resto de controles del sitio: es la primitiva que
 * funciona igual de bien con dedo que con ratón.
 */

/**
 * Color del punto indicador de sección activa (fix wave A, hallazgo A4,
 * WCAG 1.4.11 Non-text Contrast -- revisión final de rama). Antes
 * `semantic.brand` en las DOS ramas, en las DOS superficies (`ScSheetRow`
 * aquí, `ScNavPanelLink` en `Navbar.tsx`). Medido con `contrastRatio`/
 * `contrastRatioOverAlpha` (`src/theme/tokens/contrast.ts`, mismas
 * funciones que ya usa `LanguageSelector.contrast.test.ts`, Task 33) contra
 * los fondos REALES sobre los que pinta el punto:
 *
 *   TEMA CLARO (semantic.brand = primary[500]):
 *     hoja (semantic.surface, superficie OPACA)              2.277:1  <- incumple 3:1
 *     panel (glass.bg 68% compuesto sobre semantic.bg)        2.247:1  <- incumple 3:1
 *   TEMA OSCURO (semantic.brand = primary[400]):
 *     hoja (semantic.surface, superficie OPACA)               6.428:1  ya pasaba
 *     panel (glass.bg 68% compuesto sobre semantic.bg)        9.381:1  ya pasaba
 *
 * Es la MISMA familia de hallazgo que la Task 33 ya corrigió para el idioma
 * activo del navbar (`languageAccent`, `LanguageSelector.tsx`): introducido
 * por la Task 1 (navegación accesible), ANTERIOR a la Task 33, cuyo barrido
 * de contraste no llegó a este indicador porque entonces no existía ningún
 * candado de contraste sobre él -- el punto es el ÚNICO signo visual de
 * sección activa (los docblocks de `ScSheetRow`/`ScNavPanelLink` declaran a
 * propósito que no se toca `color` ni `font-weight` del texto), mide 4px y
 * es un indicador de estado, así que el umbral que aplica es el de
 * componentes de interfaz/objetos gráficos (3:1), no el de texto (4.5:1).
 *
 * Resolución POR RAMA (`theme.data.isLight`), mismo precedente que
 * `languageAccent` (`LanguageSelector.tsx`) y `ctaGradientMidStop`
 * (`BrandName.tsx`, las dos de Task 33): en claro sube a
 * `semantic.brandText` (`primary[800]`) -- 5.837:1 hoja / 5.758:1 panel, los
 * dos con margen de sobra sobre 3:1 (de hecho también sobre el 4.5:1 de
 * texto, aunque el indicador solo necesite 3:1 por no ser texto). En oscuro
 * NO cambia (`semantic.brand`, ya pasaba de sobra).
 *
 * Se define aquí (no en `Navbar.tsx`) y se exporta porque `Navbar.tsx` ya
 * importa de este módulo (`NavSheet`/`NavSheetTrigger`/`useNavSheet`) --
 * añadir un símbolo más a esa misma importación no crea ninguna dependencia
 * circular nueva, mientras que la importación en el sentido contrario sí la
 * crearía. Exportada como función nombrada (no ternario inline), mismo
 * motivo que `languageAccent`/`ctaGradientMidStop`: así el candado de
 * contraste (`navActiveAccent.contrast.test.ts`) importa y mide la MISMA
 * función que pinta el punto real en las DOS superficies, contra los tokens
 * importados, nunca contra un literal copiado.
 */
export function navActiveAccent(theme: DefaultTheme): string {
  return theme.data.isLight
    ? theme.data.semantic.brandText
    : theme.data.semantic.brand;
}

const ScSheetRow = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.md};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  color: ${({ theme }) => theme.data.semantic.text};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap -- la fila
     más directamente táctil del sitio, dentro de la hoja móvil. */
  touch-action: manipulation;
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    background-color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brandText};
    background-color: color-mix(
      in oklch,
      ${({ theme }) => theme.data.semantic.text} 6%,
      transparent
    );
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  /*
   * Indicador de sección activa (Tarea 1), mismo lenguaje visual y mismo
   * criterio que ScNavPanelLink en Navbar.tsx (ver su docblock): un punto
   * ligado al MISMO estado que decide aria-current (NavSheetGroup, más
   * abajo), que solo anima opacity/transform (regla 18). Se repite aquí, no
   * se comparte un componente, porque ScSheetRow y ScNavPanelLink ya son dos
   * árboles de estilos independientes (deuda conocida documentada en
   * RULES.md: "tercera copia" del switch de etiquetas de navegación, misma
   * familia de duplicación deliberada).
   *
   * navActiveAccent(theme), NO semantic.brand a secas (fix wave A,
   * hallazgo A4): ver su docblock, más arriba en este mismo fichero, para
   * las cuatro cifras medidas y el porqué de la resolución por rama. SIN
   * BACKTICKS en este comentario, a propósito: vive DENTRO del template
   * literal de styled-components (lección del repo, task/lessons.md
   * 2026-07-25).
   */
  &::before {
    content: "";
    width: ${({ theme }) => theme.data.space[1]};
    height: ${({ theme }) => theme.data.space[1]};
    flex: none;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background: ${({ theme }) => navActiveAccent(theme)};
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({ theme }) => theme.data.motion.duration.fast}
        ${({ theme }) => theme.data.motion.easing.standard},
      transform ${({ theme }) => theme.data.motion.duration.fast}
        ${({ theme }) => theme.data.motion.easing.standard};
  }

  &[aria-current="location"]::before {
    opacity: 1;
    transform: scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }

    &::before {
      transition: none;
    }
  }
`;

/* El selector de idioma dentro de la hoja se alinea con las filas: mismo
   sangrado lateral que `ScSheetRow`, menos el relleno propio que los botones
   de idioma ya traen. */
const ScSheetLanguage = styled.div`
  display: flex;
  align-items: center;
  padding-inline: ${({ theme }) => theme.data.space[1]};
`;

/**
 * Estado y contrato de comportamiento de la hoja, compartido por el
 * disparador (que vive DENTRO de la barra) y por la hoja en sí (que vive
 * FUERA de ella, ver el docblock de `ScNavSheet`). Los dos nodos no tienen
 * ancestro común propio, así que el estado sube a `Navbar()` y baja a las
 * dos piezas, igual que `NavGroupMenu` recibe `isOpen`/`onToggle`/`onClose`.
 *
 * `Navbar()` DESESTRUCTURA este objeto y pasa cada campo como su propia prop
 * en vez de reenviarlo entero. No es preferencia de estilo: la regla
 * `react-hooks/refs` (parte del preset de React que el repo tiene activado)
 * marca como acceso a ref en render CUALQUIER lectura de propiedad sobre un
 * objeto del que ya ha visto salir un `ref=` -- pasar `sheet` completo y
 * leer `sheet.isOpen` en el JSX deja el lint en rojo con 11 errores
 * (verificado ejecutando `pnpm lint`, no supuesto). Con props sueltas, el
 * `ref` viaja como un identificador propio y el resto de campos son valores
 * normales.
 */
export interface NavSheetController {
  readonly isOpen: boolean;
  readonly toggle: () => void;
  readonly close: () => void;
  /**
   * Fix wave A, hallazgo A3 (revisión final de rama): cierra Y devuelve el
   * foco al disparador, mismo par que ya usa el camino de Escape (ver
   * `handleKeyDown`, más abajo, que delega en esta misma función desde esta
   * tarea). Distinto de `close`: las filas de navegación (`NavSheetGroup`)
   * siguen usando `close` a secas porque NAVEGAN a otra parte de la página
   * -- perder el foco ahí es la consecuencia correcta de activar un enlace,
   * no un defecto. El botón de cierre propio de la hoja (`ScSheetCloseSlot`,
   * Task 35) NO navega a ningún sitio: cerrar es su ÚNICA acción, así que
   * "un control nunca pierde el foco como consecuencia directa de su propia
   * activación" (regla ya aplicada a `BackToTop` en el fix round de la
   * Task 2, y la misma razón por la que la Task 5 prohibió `disabled`)
   * aplica aquí tal cual.
   */
  readonly closeAndFocusTrigger: () => void;
  readonly triggerId: string;
  readonly sheetId: string;
  /** Envoltorio del disparador, no el `<button>`: ver `useNavSheet`. */
  readonly triggerRef: RefObject<HTMLSpanElement | null>;
  readonly sheetRef: RefObject<HTMLDivElement | null>;
}

/**
 * Contrato de accesibilidad de la hoja, replicado del desplegable de
 * escritorio (`NavGroupMenu`, `Navbar.tsx`), que es la referencia de la casa.
 * Punto por punto:
 *
 * 1. `aria-expanded` en el disparador + `aria-controls` al id real de la
 *    hoja, y la hoja con `aria-labelledby` al id del disparador. IDÉNTICO.
 * 2. La hoja se renderiza SIEMPRE: nunca se desmonta ni usa `display: none`
 *    para abrir/cerrar, sino `visibility` + `inert` + `opacity`/`transform`.
 *    IDÉNTICO (`display: none` solo aparece en el `@media md`, que es otra
 *    cosa: ahí la hoja no existe como pieza, no está "cerrada").
 * 3. Escape cierra y devuelve el foco al disparador. MISMO CONTRATO, DISTINTO
 *    MECANISMO: el panel de escritorio escucha `onKeyDown` en el `<div>` que
 *    envuelve disparador y panel, y React le hace burbujear el evento desde
 *    cualquier descendiente. Aquí ese envoltorio común NO PUEDE EXISTIR: la
 *    hoja tiene que salir de `ScHeader` para que su `position: fixed` se
 *    resuelva contra el viewport (ver `ScNavSheet`). Se escucha en
 *    `document`, y solo mientras la hoja está abierta.
 * 4. Un puntero fuera cierra. IDÉNTICO en mecanismo (`pointerdown` en
 *    `document`, ya usado por los grupos de escritorio) y más estricto en
 *    efecto, porque el velo garantiza que ese toque no active nada.
 * 5. El foco que sale del conjunto cierra. MISMO CONTRATO, DISTINTO
 *    MECANISMO: el panel usa `onBlur` + `relatedTarget`; aquí se escucha
 *    `focusin` en `document` y se comprueba contención contra las dos raíces
 *    (disparador y hoja), que es la misma pregunta hecha desde el otro lado.
 * 6. Activar un enlace cierra. IDÉNTICO (`onClick` en cada fila).
 *
 * ÚNICA DIFERENCIA DELIBERADA con el panel de escritorio: al abrir, el foco
 * ENTRA en la primera fila. En escritorio el panel es el hermano inmediato
 * del disparador en el DOM, así que un `Tab` desde el disparador ya lleva
 * dentro; aquí la hoja está al final del documento y ese mismo `Tab` llevaría
 * al contenido de la página -- que además dispararía la regla 5 y cerraría la
 * hoja, dejándola literalmente inalcanzable por teclado. `preventScroll` es
 * obligatorio en ese `focus()`: sin él el navegador desplazaría el documento
 * para "traer a la vista" la fila, y ese desplazamiento dispararía el cierre
 * por scroll del efecto de arriba.
 *
 * 7. Cierre al scrollear la página, con listener PASIVO y tolerancia (ver
 *    `NAV_SHEET_SCROLL_TOLERANCE_PX`). No tiene equivalente en escritorio:
 *    es la contrapartida de no bloquear el scroll (regla 21).
 */
export function useNavSheet(): NavSheetController {
  const [isOpen, setIsOpen] = useState(false);
  const triggerId = useId();
  const sheetId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback((): void => {
    setIsOpen(false);
  }, []);

  // Fix wave A, hallazgo A3: ver el docblock de `closeAndFocusTrigger` en
  // `NavSheetController`. `triggerRef` es un ref (identidad estable), así
  // que este callback no necesita ninguna dependencia externa.
  const closeAndFocusTrigger = useCallback((): void => {
    setIsOpen(false);
    triggerRef.current?.querySelector("button")?.focus();
  }, []);

  const toggle = useCallback((): void => {
    setIsOpen((current) => !current);
  }, []);

  // Punto 7. Se declara ANTES del efecto de foco de más abajo para que la
  // línea base `startY` quede leída antes de que nada pueda mover el
  // documento (los efectos corren en orden de declaración dentro del mismo
  // commit). `passive: true`: este manejador nunca llama a
  // `preventDefault()`, y declararlo permite al navegador seguir
  // desplazando sin esperar a que el JavaScript termine.
  useEffect(() => {
    if (!isOpen) return;
    const startY = window.scrollY;

    function handleScroll(): void {
      if (Math.abs(window.scrollY - startY) <= NAV_SHEET_SCROLL_TOLERANCE_PX) {
        return;
      }
      setIsOpen(false);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  // Puntos 3, 4 y 5. Un solo efecto para los tres: comparten la misma
  // pregunta ("¿el nodo implicado está dentro del disparador o de la
  // hoja?") y el mismo ciclo de vida (viven solo mientras la hoja está
  // abierta; sin hoja abierta no hay nada que cerrar ni listener que
  // mantener vivo, mismo criterio que el `pointerdown` de los grupos de
  // escritorio en `Navbar.tsx`).
  useEffect(() => {
    if (!isOpen) return;

    function isInside(node: Node): boolean {
      return (
        triggerRef.current?.contains(node) === true ||
        sheetRef.current?.contains(node) === true
      );
    }

    /*
     * Trampa de foco (Ola C.1, 2026-08-16). El defecto que cierra estaba
     * medido y no era teórico: con la hoja abierta a 390px y `scrollY = 0`,
     * tabular 14 veces recorría sus 14 elementos y el `Tab` número 15 llevaba
     * el foco a «Hablemos de aprender →», dentro de Features. La hoja se
     * cerraba, y el navegador arrastraba al viewport el elemento recién
     * enfocado: **`scrollY` saltaba de 0 a 12.539** sin ningún aviso. Un
     * usuario de teclado no tenía forma de saber qué había pasado ni de
     * volver salvo recorrer la página entera hacia arriba.
     *
     * Se implementa a mano y no con `<dialog>`: esta hoja se abre y se cierra
     * con `visibility` + `inert` + `opacity`/`transform` (ver el docblock de
     * este fichero, punto 2), no montándose y desmontándose, así que
     * `showModal()` exigiría rehacer toda su coreografía de apertura.
     *
     * `inert` ya saca del orden de tabulación TODO lo que está fuera cuando la
     * hoja está cerrada, pero no al revés: con la hoja ABIERTA, el resto del
     * documento sigue siendo tabulable. Esto lo suple ciclando dentro.
     */
    function focusables(): HTMLElement[] {
      const sheet = sheetRef.current;
      if (!sheet) return [];
      /*
       * SIN filtro de visibilidad a propósito. El primer intento descartaba
       * lo oculto con `offsetParent !== null`, y eso es exactamente la trampa
       * que el repo tiene documentada: jsdom NO calcula layout, así que ahí
       * `offsetParent` es SIEMPRE `null` y la lista se quedaba vacía — el
       * candado de `Navbar.test.tsx` lo cazó en el primer intento.
       *
       * Tampoco hace falta: mientras la hoja está abierta, todo lo que hay
       * dentro es alcanzable de verdad. Lo que se oculta es la hoja ENTERA, y
       * de eso ya se encargan `visibility` + `inert` en `ScNavSheet`, que
       * sacan del orden de tabulación todo el subárbol de una vez.
       */
      return Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        // Fix wave A: MISMO par que el botón de cierre propio (ver
        // `closeAndFocusTrigger` -- antes duplicado aquí a mano, ahora una
        // única función para los dos caminos que "cierran sin navegar").
        closeAndFocusTrigger();
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      const activo = document.activeElement;

      // El ciclo se cierra en los DOS sentidos: Tab desde el último vuelve al
      // primero, y Shift+Tab desde el primero va al último. Sin la segunda
      // mitad, el foco se escaparía hacia atrás -- hacia el disparador y de
      // ahí al resto de la barra -- que es el mismo defecto por el otro lado.
      if (!event.shiftKey && activo === ultimo) {
        event.preventDefault();
        primero.focus();
        return;
      }
      if (event.shiftKey && activo === primero) {
        event.preventDefault();
        ultimo.focus();
        return;
      }
      // Si el foco ya se hubiera ido fuera de la hoja por cualquier otra vía,
      // se devuelve dentro en vez de dejarlo escapar.
      if (
        activo instanceof Node &&
        sheetRef.current?.contains(activo) !== true
      ) {
        event.preventDefault();
        primero.focus();
      }
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;
      if (isInside(event.target)) return;
      setIsOpen(false);
    }

    function handleFocusIn(event: FocusEvent): void {
      if (!(event.target instanceof Node)) return;
      if (isInside(event.target)) return;
      setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
    // `closeAndFocusTrigger` es un `useCallback` de dependencias `[]`
    // (identidad estable de por vida): se declara en la lista por exigencia
    // de `react-hooks/exhaustive-deps`, no porque pueda cambiar y necesite
    // reiniciar este efecto.
  }, [isOpen, closeAndFocusTrigger]);

  // Diferencia deliberada con el panel de escritorio: el foco entra en la
  // hoja al abrirla. Ver el punto 6 del docblock.
  //
  // Task 35 (hallazgo de un evaluador independiente, gate F4, 2026-08-12):
  // este mismo efecto TAMBIÉN reinicia `scrollTop` a 0 en cada apertura, en
  // `[data-nav-sheet-scroll]` -- la capa de scroll de `ScSheetScroll`, NO
  // `sheetRef.current` (`ScNavSheet`) directamente: desde esta misma tarea
  // `ScNavSheet` dejó de ser un contenedor de scroll (ver el docblock de
  // `ScSheetScroll` para el porqué completo de la división en dos capas), así
  // que `sheetRef.current.scrollTop` sería un no-op silencioso sobre un
  // elemento que ya no scrollea. `ScSheetScroll` SÍ es un contenedor
  // PERSISTENTE con scroll interno propio que nunca se desmonta entre
  // aperturas (punto 2 del docblock de accesibilidad, arriba), así que sin
  // este reinicio conserva el `scrollTop` de la vez anterior. Medido: tras
  // scrollear hasta el final (scrollTop=177, su máximo) y cerrar, la
  // SIGUIENTE apertura reabría ya en scrollTop=177 -- la primera pantalla
  // empezaba en "Contacto" y dejaba fuera el rótulo "En el sitio" y los
  // enlaces Historia/Viaje/Características, reproducido en los dos temas.
  //
  // `useEffect`, no `useLayoutEffect`: mismo criterio ya cerrado en
  // `useScrolled.ts` (2026-07-25) para un dilema idéntico ("¿vale la pena un
  // frame sin corregir a cambio del warning de SSR que emite
  // `useLayoutEffect` en cada build de este export estático, verificado
  // ahí?") -- el síntoma de un `useEffect` aquí es, como allí, cosmético y
  // acotado: la hoja arranca su fundido de entrada en `opacity` prácticamente
  // 0 (ver ScNavSheet), así que el único fotograma en el que el scroll viejo
  // podría verse antes de que este efecto corra es, en la práctica,
  // imperceptible. Se reinicia ANTES de mover el foco (mismo orden que el
  // resto de este efecto), aunque las dos operaciones son independientes.
  useEffect(() => {
    if (!isOpen) return;
    const areaDeScroll = sheetRef.current?.querySelector<HTMLElement>(
      "[data-nav-sheet-scroll]",
    );
    if (areaDeScroll) {
      areaDeScroll.scrollTop = 0;
    }
    const primeraFila =
      sheetRef.current?.querySelector<HTMLElement>("a, button");
    primeraFila?.focus({ preventScroll: true });
  }, [isOpen]);

  return {
    isOpen,
    toggle,
    close,
    closeAndFocusTrigger,
    triggerId,
    sheetId,
    triggerRef,
    sheetRef,
  };
}

export interface NavSheetTriggerProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly triggerId: string;
  readonly sheetId: string;
  readonly triggerRef: RefObject<HTMLSpanElement | null>;
}

export function NavSheetTrigger({
  isOpen,
  onToggle,
  triggerId,
  sheetId,
  triggerRef,
}: NavSheetTriggerProps): ReactElement {
  const { t } = useTranslation("common");
  const label = isOpen ? t("Common.Nav.closeMenu") : t("Common.Nav.openMenu");

  return (
    /* El gancho de test (`data-nav-sheet-trigger`) va en el envoltorio, no
       en el `IconButton`: un atributo `data-*` sobre un COMPONENTE (no un
       elemento intrínseco) tendría que estar declarado en su interfaz de
       props para que TypeScript lo acepte, y ampliar la interfaz de un
       primitivo compartido de `ui/` solo para un gancho de test sería
       cambiar más de lo necesario. El envoltorio es un elemento del DOM y
       lo admite sin ninguna ampliación. */
    <ScSheetTriggerSlot
      ref={triggerRef}
      data-nav-sheet-trigger
    >
      <IconButton
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={sheetId}
        aria-label={label}
        title={label}
        onClick={onToggle}
        icon={
          <ScBurger
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
            data-open={isOpen}
          >
            <rect
              data-burger-line="top"
              x="2"
              y="3.2"
              width="12"
              height="1.6"
              rx="0.8"
            />
            <rect
              data-burger-line="middle"
              x="2"
              y="7.2"
              width="12"
              height="1.6"
              rx="0.8"
            />
            <rect
              data-burger-line="bottom"
              x="2"
              y="11.2"
              width="12"
              height="1.6"
              rx="0.8"
            />
          </ScBurger>
        }
      />
    </ScSheetTriggerSlot>
  );
}

/*
 * Un grupo de la hoja. Vive fuera de `NavSheet()` por el mismo motivo que
 * `NavGroupMenu` vive fuera de `Navbar()`: cada instancia necesita SU PROPIO
 * `useId()` para atar el título a su lista, y `useId` no se puede llamar
 * dentro de un `map`.
 */
interface NavSheetGroupProps {
  readonly group: NavGroup;
  readonly onNavigate: () => void;
  /** Mismo contrato que `NavGroupMenuProps.activeSectionKey` en
   *  `Navbar.tsx`: `key` de la sección visible, o `null`. */
  readonly activeSectionKey: string | null;
}

function NavSheetGroup({
  group,
  onNavigate,
  activeSectionKey,
}: NavSheetGroupProps): ReactElement {
  const { t } = useTranslation("common");
  const titleId = useId();

  /*
   * Tabla de resolución de etiquetas del modelo compartido, documentada en
   * `src/config/navigation.ts`. Se repite aquí -- igual que ya la repiten
   * `NavGroupMenu` (`Navbar.tsx`) y `Footer.tsx` -- porque extraerla a un
   * módulo común exigiría tipar la `t` de i18next como parámetro, y esa
   * firma es genérica por namespace: el contrato que impide la divergencia
   * no es este `switch` sino `navigation.test.ts`, que resuelve DE VERDAD
   * las cuatro rutas contra los JSON de es/en.
   */
  function itemLabel(item: NavItem): string {
    switch (item.kind) {
      case "section":
        return t(`Common.Navigation.${item.key}`);
      case "feature":
        return t(`home:Home.features.${item.key}.title`);
      case "external":
        return t(`Common.Nav.${item.key}`);
    }
  }

  /*
   * Mismo par cierre + foco que `handleLinkActivate` en `Navbar.tsx`, con el
   * mismo orden y por el mismo motivo (crítica externa #8, punto 3). La
   * trampa de foco de la hoja (Ola C.1) NO entra en conflicto: su
   * `handleFocusIn` reacciona a un foco que se va fuera de la hoja CERRÁNDOLA
   * -- que es justo lo que `onNavigate` acaba de pedir --, nunca devolviendo
   * el foco dentro a la fuerza. Verificado leyendo ese efecto, no asumido.
   */
  function handleRowActivate(item: NavItem): void {
    onNavigate();
    focusNavAnchorTarget(item);
  }

  return (
    <ScSheetGroup>
      <ScSheetGroupTitle id={titleId}>
        {t(`Common.Nav.${group.key}`)}
      </ScSheetGroupTitle>
      <ScSheetList aria-labelledby={titleId}>
        {group.items.map((item) =>
          item.kind === "external" ? (
            <li key={item.key}>
              <ScSheetRow
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleRowActivate(item)}
              >
                {itemLabel(item)}
                {/* Espacio literal DENTRO del texto oculto, no entre nodos
                    JSX: mismo criterio ya aplicado en `Navbar.tsx` y
                    `Footer.tsx` para este mismo aviso (WCAG 3.2.5). */}
                <VisuallyHidden> {t("Common.Nav.newTab")}</VisuallyHidden>
              </ScSheetRow>
            </li>
          ) : (
            <li key={item.key}>
              <ScSheetRow
                href={item.href}
                onClick={() => handleRowActivate(item)}
                /* Mismo criterio que ScNavPanelLink en Navbar.tsx (ver su
                   docblock): solo los items kind: "section", y "location"
                   (no "true") como valor de aria-current. */
                aria-current={
                  item.kind === "section" && item.key === activeSectionKey
                    ? "location"
                    : undefined
                }
              >
                {itemLabel(item)}
              </ScSheetRow>
            </li>
          ),
        )}
      </ScSheetList>
    </ScSheetGroup>
  );
}

export interface NavSheetProps {
  readonly isOpen: boolean;
  readonly onNavigate: () => void;
  /**
   * Fix wave A, hallazgo A3: acción del botón de cierre PROPIO de la hoja
   * (`ScSheetCloseSlot`, Task 35) -- distinta de `onNavigate`, que las filas
   * de navegación siguen usando porque ELLAS navegan a otra parte de la
   * página (perder el foco ahí es correcto). El botón de cierre no navega a
   * ningún sitio, así que su única acción no puede dejar el foco huérfano en
   * `<body>` cuando `ScNavSheet` recibe `inert` -- ver `closeAndFocusTrigger`
   * en `NavSheetController` para el porqué completo.
   */
  readonly onClose: () => void;
  readonly triggerId: string;
  readonly sheetId: string;
  readonly sheetRef: RefObject<HTMLDivElement | null>;
}

export function NavSheet({
  isOpen,
  onNavigate,
  onClose,
  triggerId,
  sheetId,
  sheetRef,
}: NavSheetProps): ReactElement {
  const { t } = useTranslation("common");
  // Tarea 1 (navegación accesible): mismo singleton que consume `Navbar()`
  // para su propio panel de escritorio (ver `useActiveSection.ts`) -- las
  // dos superficies leen el mismo valor sin duplicar ningún listener.
  const activeSectionKey = useActiveSectionKey();

  return (
    <>
      <ScSheetVeil
        aria-hidden="true"
        data-nav-sheet-veil
        data-open={isOpen}
      />
      {/* `role="dialog"` + `aria-modal` (Ola C.1, 2026-08-16). Hasta ahora
          esta hoja tenía TODO el comportamiento de un diálogo —velo opaco
          real (`ScSheetVeil`, `oklch(0.178 0 0 / 0.68)`), foco que entra al
          abrir, `Escape` que cierra y devuelve el foco al disparador— y
          ninguna de su semántica: `document.querySelector('[role="dialog"]')`
          no encontraba nada, así que un lector de pantalla la anunciaba como
          un grupo cualquiera y no avisaba de que el resto de la página quedaba
          detrás.

          `aria-modal` se declara SOLO mientras está abierta, y no siempre:
          cerrada, la hoja sigue en el DOM (se oculta con `visibility` +
          `inert`, no desmontándose), y un `aria-modal="true"` permanente
          afirmaría que hay un modal activo cuando no lo hay. `undefined` no
          emite el atributo. */}
      <ScNavSheet
        id={sheetId}
        ref={sheetRef}
        role="dialog"
        aria-modal={isOpen ? true : undefined}
        aria-labelledby={triggerId}
        data-nav-sheet
        data-open={isOpen}
        inert={!isOpen}
      >
        {/* Capa de scroll (Task 35, ver el docblock de ScSheetScroll):
            único hijo de flujo normal de ScNavSheet, aísla el
            `overflow-y: auto` del botón de cierre de más abajo -- que
            necesita quedar FUERA de cualquier contenedor que scrollee para
            seguir alcanzable con la lista desplazada. */}
        <ScSheetScroll data-nav-sheet-scroll>
          <ScSheetHandle aria-hidden="true" />
          {NAV_GROUPS.map((group) => (
            <NavSheetGroup
              key={group.key}
              group={group}
              onNavigate={onNavigate}
              activeSectionKey={activeSectionKey}
            />
          ))}
          {/* El idioma es la pieza que se muda desde la barra (ver el
              docblock de este fichero). Reutiliza `Common.Lang.title`, la
              clave que ya existía para nombrar este control: no se inventa
              copia nueva. */}
          <ScSheetGroup>
            <ScSheetGroupTitle>{t("Common.Lang.title")}</ScSheetGroupTitle>
            <ScSheetLanguage>
              <LanguageSelector />
            </ScSheetLanguage>
          </ScSheetGroup>
        </ScSheetScroll>
        {/* Task 35: botón de cierre propio, alcanzable por encima del velo
            (ver el docblock de ScSheetCloseSlot). Etiqueta PROPIA
            (`closeSheet`, no `closeMenu`): el disparador de la barra reusa
            "Cerrar el menú de navegación" para su estado abierto, y las dos
            superficies coexisten en el árbol de accesibilidad mientras la
            hoja está abierta (el disparador no se retira ni se inertiza) --
            un nombre accesible distinto evita dos controles anunciados con
            el MISMO texto a la vez, y evita que un futuro `getByRole` por el
            texto del disparador empiece a devolver dos coincidencias.

            El gancho de test (`data-nav-sheet-close`) va en el envoltorio,
            no en el `IconButton`: mismo motivo que `data-nav-sheet-trigger`
            en `ScSheetTriggerSlot` (ver `NavSheetTrigger`, más arriba en
            este mismo fichero) -- un atributo `data-*` sobre un COMPONENTE
            (no un elemento intrínseco) tendría que estar declarado en su
            interfaz de props para que TypeScript lo acepte.

            `onClick={onClose}`, NO `onNavigate` (fix wave A, hallazgo A3):
            hasta esta tarea usaba `onNavigate`, el mismo cierre a secas que
            las filas -- pensado para un control que YA iba a perder el foco
            por su propia navegación. Este botón no navega a ningún sitio:
            cerrar es su única acción, y al cerrarse `ScNavSheet` recibe
            `inert` más abajo, que por la focus fixup rule del HTML resetea
            el foco a `<body>` si no se le da un destino explícito primero.
            `onClose` (= `closeAndFocusTrigger`, ver `useNavSheet`) cierra Y
            devuelve el foco al disparador, mismo par que ya usa Escape. */}
        <ScSheetCloseSlot data-nav-sheet-close>
          <IconButton
            aria-label={t("Common.Nav.closeSheet")}
            title={t("Common.Nav.closeSheet")}
            onClick={onClose}
            icon={
              <ScBurger
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
                data-open="true"
              >
                <rect
                  data-burger-line="top"
                  x="2"
                  y="3.2"
                  width="12"
                  height="1.6"
                  rx="0.8"
                />
                <rect
                  data-burger-line="middle"
                  x="2"
                  y="7.2"
                  width="12"
                  height="1.6"
                  rx="0.8"
                />
                <rect
                  data-burger-line="bottom"
                  x="2"
                  y="11.2"
                  width="12"
                  height="1.6"
                  rx="0.8"
                />
              </ScBurger>
            }
          />
        </ScSheetCloseSlot>
      </ScNavSheet>
    </>
  );
}
