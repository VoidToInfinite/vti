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
import { navGroupsFor, type NavGroup, type NavItem } from "@/config/navigation";
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
 * ## Por qué el bloqueo de scroll NO es `overflow: hidden` (regla 21 de
 * `RULES.md`)
 *
 * El patrón clásico de una hoja o un modal es `overflow: hidden` en
 * `html`/`body` mientras está abierta. ESE patrón está VETADO aquí:
 * `html`/`body` con `overflow: hidden` obliga al eje contrario a computar
 * `auto`, lo que convierte a `html`/`body` en contenedor de scroll y hace que
 * los cuatro `position: sticky` de las presentaciones (Story, Journey,
 * Features, Contact) se peguen respecto a ESE contenedor en vez de respecto al
 * viewport: el pin de las cuatro secciones se rompería en silencio mientras
 * la hoja estuviera abierta. Es la lección ya pagada que documenta
 * `GlobalStyles.tsx` (`overflow-x: clip`, nunca `hidden`).
 *
 * Lo que SÍ hay, desde la crítica externa #9 (punto 4, evaluador Nielsen):
 * el bloqueo se hace por EVENTO, no por CSS -- `wheel`/`touchmove` con
 * `preventDefault()` mientras la hoja está abierta, salvo dentro de su propia
 * capa de scroll (ver el punto 8 del docblock de `useNavSheet`). Un diálogo
 * `aria-modal` que deja correr el fondo 600 px bajo el dedo no es un diálogo
 * modal; y esta vía consigue el efecto sin tocar el `overflow` de nadie, así
 * que ningún `sticky` se entera. Regalo colateral: como la barra de scroll
 * del documento nunca desaparece, tampoco hay salto de layout que compensar
 * -- el defecto habitual del bloqueo por `overflow`.
 *
 * El resto de la defensa, que ya existía y sigue en pie:
 * - `overscroll-behavior: contain` en la capa de scroll de la hoja: llegar al
 *   final de su propia lista NO encadena el scroll a la página de debajo.
 * - Cierre al scrollear la página, con listener PASIVO (ver `useNavSheet`):
 *   red de seguridad para los desplazamientos que el bloqueo por evento no
 *   puede interceptar (teclado, colapso de la barra de direcciones del móvil,
 *   scroll programático).
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
 * Relleno inferior de la hoja: el token más el recorte de hardware (la barra
 * de gestos de iOS), que en escritorio y en casi todo Android colapsa a cero.
 *
 * VIVE EN UNA FUNCIÓN Y NO ESCRITO DOS VECES porque lo consumen DOS reglas
 * que tienen que valer lo mismo o el resultado es un defecto silencioso: el
 * `padding-bottom` de `ScNavSheet` (que es donde TERMINA la capa de scroll) y
 * el `bottom` de `ScSheetFade` (que es donde EMPIEZA la señal de que hay más
 * contenido). Si divergen, el degradado deja de marcar el filo del recorte y
 * pasa a pintar sobre relleno vacío -- que es exactamente el defecto que la
 * crítica externa #15 midió; ver el docblock de `ScSheetFade`.
 */
function sheetBottomInset(theme: DefaultTheme): string {
  return `calc(${theme.data.space[6]} + env(safe-area-inset-bottom, 0px))`;
}

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
 *
 * ## SIN JAVASCRIPT: OCULTO (crítica externa #10, hallazgo A, P1)
 *
 * DECISIÓN, no herencia: este disparador se oculta bajo
 * `@media (scripting: none)`, con el mismo criterio que el conmutador de tema
 * (`ThemeToggle.tsx`) y el selector de idioma (`LanguageSelector.tsx`) de su
 * misma fila.
 *
 * El motivo: la apertura de la hoja es estado de React (`useNavSheet`, y de
 * ahí `data-open` sobre `ScNavSheet`/`ScSheetVeil`). Sin JavaScript ese estado
 * no cambia nunca, así que la hoja se queda en `visibility: hidden` + `inert`
 * para siempre y el botón es una promesa que no se puede cumplir -- el mismo
 * defecto que el evaluador midió en los otros dos controles, y aquí además en
 * el ÚNICO acceso a la navegación bajo 768 px.
 *
 * Y ocultarlo NO deja a nadie sin salida, que es lo que decide el caso: el pie
 * de página recorre `NAV_GROUPS` entero y pinta cada destino como un `<a
 * href>` normal, siempre presente en el HTML exportado y sin ninguna capa que
 * abrir (`Footer.tsx`). La navegación completa sigue disponible sin
 * JavaScript; lo que desaparece es el atajo que no funciona.
 *
 * ESO ERA VERDAD Y ERA INSUFICIENTE (crítica externa #17, P1 del evaluador
 * Nielsen, 2026-09-03). Medido con `javaScriptEnabled: false` real a 390x844:
 * con este disparador oculto y `ScNavLinks` todavía en `display: none` bajo
 * `md`, de los 18 controles de la cabecera DIECISIETE median 0x0 y solo
 * sobrevivía el logotipo -- es decir, la única salida quedaba a 10.201 px de
 * scroll. «Hay salida en el pie» no es lo mismo que «hay navegación». Este
 * guard NO se retira (sigue siendo un botón que no puede cumplir lo que
 * promete), pero deja de ser la única respuesta: desde esa crítica la barra
 * muestra los cuatro destinos de sección y el selector de idioma también en
 * móvil sin JavaScript, y son ellos los que sostienen la degradación (ver los
 * bloques `@media (scripting: none)` de `ScNavLinks` y `ScBarLanguage`,
 * `Navbar.tsx`). La alternativa
 * -- dejarlo visible con un aviso -- exigiría un `<noscript>` que en cliente
 * sale VACÍO (React trata sus hijos como texto, ver `ScNoscriptNote` en
 * `Contact.tsx`) y, sobre todo, seguiría mostrando un control muerto para
 * explicar que está muerto.
 *
 * El guard va DESPUÉS del bloque de `md` a propósito: los dos declaran lo
 * mismo (`display: none`) y no compiten, pero el orden deja la lectura en el
 * sentido en que se aplican -- primero el ancho, luego la capacidad. CON
 * JavaScript no cambia nada de nada.
 */
const ScSheetTriggerSlot = styled.span`
  display: inline-flex;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: none;
  }

  /* Sin JavaScript la hoja no abre y el pie ya expone la navegación completa:
     ver el docblock de arriba. */
  @media (scripting: none) {
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
 *
 * `padding`: los dos términos LATERALES leen `inlineSpace` y los dos de BLOQUE
 * siguen en `space` (ver el docblock de `inlineSpace` en `tokens/space.ts`).
 * Con la raíz por defecto la hoja mide exactamente lo mismo, y con la fuente
 * al 200 % el relleno deja de crecer cuando el viewport ya no da más de sí. El
 * `calc()` con `env()` no cambia de forma: lo que cambia es de qué escala sale
 * el sumando de la izquierda.
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
   *
   * El valor de ABAJO sale de sheetBottomInset() y no se escribe aquí: es la
   * misma medida que necesita el degradado de desbordamiento para saber dónde
   * termina la capa de scroll (ver el docblock de esa función y el de
   * ScSheetFade). Sigue siendo el mismo calc() de siempre, ahora con un solo
   * origen.
   */
  padding: ${({ theme }) => theme.data.space[3]}
    calc(
      ${({ theme }) => theme.data.inlineSpace[4]} +
        env(safe-area-inset-right, 0px)
    )
    ${({ theme }) => sheetBottomInset(theme)}
    calc(
      ${({ theme }) => theme.data.inlineSpace[4]} +
        env(safe-area-inset-left, 0px)
    );
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

/*
 * AFORDANCIA DE SCROLL (crítica externa #9, punto 3). El evaluador midió que
 * a 390x844 la hoja mide 591 px visibles y su contenido 623: el final de la
 * lista queda fuera, alcanzable con scroll interno pero SIN ninguna señal de
 * que exista -- la única pista era una fila cortada, que igual de bien podría
 * ser el borde de la hoja. Este degradado es esa señal: aparece solo cuando
 * de verdad queda contenido por debajo (`data-sheet-clipped`, calculado en
 * `NavSheet()` a partir de `scrollTop`/`clientHeight`/`scrollHeight` reales)
 * y se retira al llegar al final, así que nunca miente.
 *
 * Hermano de la capa de scroll, no hijo: dentro de ella se desplazaría con el
 * contenido y dejaría de marcar el borde -- es el mismo hallazgo que ya pagó
 * el botón de cierre (ver el docblock de `ScSheetScroll`).
 *
 * ## LA SEÑAL EXISTÍA Y NO SE VEÍA (crítica externa #15, hallazgo A, P2-6)
 *
 * El evaluador volvió a medir el MISMO síntoma que esta pieza existe para
 * cerrar: a 390x844 en oscuro la hoja mide 591 px con scroller interno
 * (`scrollHeight` 692 > `clientHeight` 546) y el grupo «Comunidad» queda
 * partido en el borde inferior «sin degradado ni indicador». Y la medida de
 * `data-sheet-clipped` era correcta -- con `scrollTop` 0 y esos números,
 * `clipped` vale `true` y el atributo se escribe.
 *
 * CAUSA RAÍZ, que es de GEOMETRÍA y no de la medida: este elemento es
 * `position: absolute` dentro de `ScNavSheet`, así que su bloque contenedor
 * es la CAJA DE RELLENO de la hoja -- `bottom: 0` no es el filo del
 * contenido, es el filo INTERIOR del borde, por debajo del
 * `padding-bottom`. Con `height` = `space[6]` y `padding-bottom` =
 * `space[6] + env(safe-area-inset-bottom)`, el degradado ocupaba EXACTAMENTE
 * la banda de relleno (o menos, con recorte de hardware): CERO píxeles de
 * solape con la capa de scroll. Se pintaba, pero sobre superficie vacía y del
 * mismo color al que llega su propia parada opaca -- invisible por
 * construcción, que es justo lo que el docblock anterior afirmaba del tramo
 * de relleno... sin notar que ese tramo era el degradado ENTERO.
 *
 * ARREGLO: el filo inferior del degradado se ancla donde TERMINA la capa de
 * scroll (`bottom: sheetBottomInset(theme)`, la misma medida que el
 * `padding-bottom` de la hoja, de una sola fuente para que no puedan
 * divergir), así que sus 32 px cubren las últimas 32 filas de píxeles del
 * contenido recortado y su parada opaca cae EN la línea de corte. Por debajo
 * queda la banda de relleno, que ya es el mismo `semantic.surface` en el que
 * termina el degradado: la continuidad se conserva sin pintar nada allí.
 *
 * POR QUÉ NO SE AGRANDA LA HOJA EN VEZ DE SEÑALAR EL CORTE, que era la otra
 * salida posible: no cabe. Con `about` en la navegación la hoja gana una fila
 * más (`min-height: 44px`, sin `gap` en la lista), así que el contenido pasa
 * de 692 a 736 px sobre un `clientHeight` de 546. Hacerlo caber exigiría
 * ~92dvh de alto de hoja a 390x844 -- una hoja que tapa la pantalla entera y
 * deja el velo en una franja de 8 %, es decir, otra cosa: un menú a pantalla
 * completa, no una hoja. `NAV_SHEET_MAX_HEIGHT` se queda en el 70dvh que
 * declara la spec, y lo que se arregla es la señal, que es lo que estaba roto.
 *
 * `pointer-events: none` es obligatorio: cubre la última fila de la lista, y
 * sin él se comería sus toques. Anima SOLO `opacity` (regla 18) con el mismo
 * tiempo del velo, y el selector de estado es DESCENDIENTE
 * (`[data-sheet-clipped="true"] &`), no `&[...]`: el atributo vive en el
 * padre, y las dos formas comparten substring pero describen selectores
 * distintos (regla 35).
 */
const ScSheetFade = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  /* NO bottom: 0 -- ver el docblock de arriba: esta caja se resuelve contra
     la caja de RELLENO de la hoja, asi que el cero cae por debajo del
     padding-bottom y el degradado entero se pintaba sobre relleno vacio.
     Anclado aqui, sus 32 px cubren el contenido recortado de verdad. */
  bottom: ${({ theme }) => sheetBottomInset(theme)};
  height: ${({ theme }) => theme.data.space[6]};
  pointer-events: none;
  background: linear-gradient(
    to top,
    ${({ theme }) => theme.data.semantic.surface},
    transparent
  );
  opacity: 0;
  transition: opacity ${DECK.railDurationMs}ms ${PRESS.easing};

  [data-sheet-clipped="true"] & {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/*
 * AQUÍ VIVIÓ `ScSheetHandle`, el asa decorativa del borde superior --
 * "la señal universal de que esto es una hoja que se puede retirar", decía su
 * comentario. RETIRADA por la crítica #14 (P2), y el motivo es exactamente esa
 * frase: era una señal de un gesto que no existe.
 *
 * EL DEFECTO, medido por el evaluador: el asa era un `<div>` `aria-hidden` sin
 * un solo manejador. Arrastrada 320 px, la hoja no se movía ni un píxel ni se
 * cerraba. Una afordancia que promete un gesto que el componente no implementa
 * es peor que ninguna: enseña al usuario un camino que falla en silencio, y
 * quien lo intenta no aprende que no existe -- aprende que no funcionó.
 *
 * LA DECISIÓN ENTRE LAS DOS SALIDAS (implementar el arrastre o retirar el asa)
 * cae del lado de retirar, y por tres razones que se sostienen juntas:
 *
 * 1. La hoja YA tiene cuatro formas de descartarse, las cuatro implementadas y
 *    con candado en la suite: Escape (devuelve el foco al disparador), su
 *    botón de cierre propio, el toque fuera sobre el velo y el scroll de la
 *    página. El arrastre no añadiría ninguna capacidad nueva: añadiría una
 *    quinta forma de hacer lo que ya se puede hacer de cuatro maneras.
 * 2. Implementarlo bien no es "escuchar pointermove": exige capturar el
 *    puntero, un umbral de distancia y de velocidad, seguir el dedo con
 *    `transform` sin pelearse con la transición de apertura/cierre, decidir
 *    qué pasa bajo `prefers-reduced-motion` y no robarle el gesto de scroll a
 *    la lista de dentro (que sí scrollea, ver `ScSheetScroll`). Nada de eso se
 *    puede verificar en jsdom, que no hace layout ni tiene Pointer Events
 *    reales: entraría en el repo sin ningún candado que lo sostenga.
 * 3. El presupuesto de JavaScript del sitio está medido y ajustado. Un gesto
 *    que duplica una salida existente no es donde gastarlo.
 *
 * LA HOJA SIGUE LEYÉNDOSE COMO HOJA sin el asa, verificado en el CSS y no
 * supuesto: `ScNavSheet` declara `border-top` explícito (`glass.border`) y
 * `border-radius: xl xl 0 0` -- esquinas superiores redondeadas y filo
 * dibujado --, más `elevation[4]`, la sombra más alta de la escala. El lenguaje
 * de "panel anclado al borde inferior" lo llevan esas tres declaraciones, no el
 * asa.
 */

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
   esto.

   `padding`: mismo sangrado lateral que `ScSheetRow`, y de la misma escala
   acotada al viewport (`inlineSpace`, ver `tokens/space.ts`). Si uno de los
   dos se quedara en `space`, el rótulo dejaría de alinearse con su lista al
   200 %. */
const ScSheetGroupTitle = styled.p`
  margin: 0;
  padding: 0 ${({ theme }) => theme.data.inlineSpace[2]};
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
  padding: 0 ${({ theme }) => theme.data.inlineSpace[2]};
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
   *
   * TAMAÑO space[2] (8px), antes space[1] (4px) -- crítica externa #11,
   * hallazgo A, P2. El evaluador midió el punto del PANEL de escritorio
   * (ScNavPanelLink, Navbar.tsx), no este; sube igualmente, y no por
   * simetría cosmética: el párrafo de arriba declara como invariante que las
   * dos superficies comparten "mismo lenguaje visual y mismo criterio", y
   * dejar aquí un indicador de la mitad de tamaño convertiría esa frase en
   * un comentario que ya no describe el código (regla 16 de RULES.md). El
   * porqué completo del valor -- y por qué es el mismo diámetro que la marca
   * del rail de Journey -- vive en el docblock de ScNavPanelLink.
   */
  &::before {
    content: "";
    width: ${({ theme }) => theme.data.space[2]};
    height: ${({ theme }) => theme.data.space[2]};
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
   de idioma ya traen.

   `padding-inline`: `space[1]` y no `inlineSpace[1]`, porque la escala acotada
   al viewport arranca en el peldaño 2 -- es el primero con consumidor real en
   el eje inline (ver su docblock en `tokens/space.ts`). Este peldaño son 4px
   con la raíz por defecto y 8px al 200 %: una diferencia que no compite con la
   columna. */
const ScSheetLanguage = styled.div`
  display: flex;
  align-items: center;
  padding-inline: ${({ theme }) => theme.data.space[1]};
`;

/*
 * EL FONDO QUEDA `inert` MIENTRAS LA HOJA ESTÁ ABIERTA (crítica #12).
 *
 * QUÉ FALTABA, exactamente: la trampa de foco (Ola C.1) ya impedía que el
 * TABULADOR saliera de la hoja, y eso es solo la mitad del contrato de un
 * `aria-modal`. Un lector de pantalla en modo exploración (las flechas de
 * NVDA/JAWS, el rotor de VoiceOver) NO usa el orden de tabulación: recorre el
 * árbol de accesibilidad completo, así que seguía leyendo la página entera por
 * detrás del velo -- una página que la propia hoja declara no disponible con
 * `aria-modal="true"`. Declarar una cosa y hacer la contraria es peor que no
 * declararla.
 *
 * `inert` y no `aria-hidden`: `aria-hidden` solo esconde del árbol de
 * accesibilidad y deja el contenido clicable y focalizable (y un `aria-hidden`
 * sobre un ancestro del elemento enfocado es, además, una violación conocida de
 * ARIA). `inert` hace las dos cosas a la vez y es la propiedad que la propia
 * plataforma define para esto -- la MISMA que este fichero ya usa sobre
 * `ScNavSheet` cuando la hoja está cerrada.
 *
 * QUÉ SE MARCA: los HERMANOS de la hoja en cada nivel, subiendo hasta `body`
 * -- nunca un ancestro suyo (dejaría inerte a la propia hoja) y nunca una lista
 * escrita a mano de landmarks ("`#main` y el pie"), que se quedaría corta el día
 * que alguien monte algo nuevo en la raíz. El velo se excluye por su
 * `data-nav-sheet-veil`: tiene que seguir capturando el puntero para que un
 * toque fuera cierre. La CABECERA no se excluye, y es deliberado: APG lo pide
 * (el disparador queda fuera del diálogo) y quien esté dentro tiene tres
 * salidas ya implementadas -- Escape, el botón de cierre propio de la hoja y el
 * toque en el velo.
 *
 * SSR / HIDRATACIÓN (`output: "export"`): esto NO puede ser un atributo del
 * JSX. El HTML se hornea con la hoja cerrada, así que un `inert` renderizado
 * condicionalmente estaría siempre ausente en el HTML y aparecería solo tras
 * una interacción -- pero además viviría en nodos (`<main>`, el pie, el
 * cabecero) que este componente no renderiza y no puede tocar desde su JSX. Se
 * aplica en un efecto, que por definición corre solo en cliente y solo tras
 * montar: el primer render del cliente es idéntico al HTML horneado.
 *
 * SOLO SE RETIRA LO QUE ESTA HOJA PUSO: si un nodo ya traía su propio `inert`
 * (hoy no ocurre, mañana puede), se deja fuera de la lista y el cierre no se lo
 * quita.
 */
const INERT_SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "TEMPLATE"]);

function backgroundSiblings(sheet: HTMLElement): HTMLElement[] {
  const fondo: HTMLElement[] = [];
  let node: HTMLElement | null = sheet;

  while (node !== null && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (parent === null) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node) continue;
      if (!(sibling instanceof HTMLElement)) continue;
      if (INERT_SKIP_TAGS.has(sibling.tagName)) continue;
      /* El velo sigue vivo a propósito: es quien captura el toque de "fuera". */
      if (sibling.hasAttribute("data-nav-sheet-veil")) continue;
      fondo.push(sibling);
    }
    node = parent;
  }

  return fondo;
}

/**
 * Estado y contrato de comportamiento de la hoja, compartido por el
 * disparador (que vive DENTRO de la barra) y por la hoja en sí (que vive
 * FUERA de ella, ver el docblock de `ScNavSheet`). Los dos nodos no tienen
 * ancestro común propio, así que el estado sube a `Navbar()` y baja a las
 * dos piezas, igual que `NavMoreMenu` recibe `isOpen`/`onToggle`/`onClose`.
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
 * escritorio (`NavMoreMenu`, `Navbar.tsx`), que es la referencia de la casa.
 * Punto por punto:
 *
 * 1. `aria-expanded` en el disparador + `aria-controls` al id real de la
 *    hoja. IDÉNTICO. DIVERGENCIA DELIBERADA en el sentido contrario del
 *    vínculo (crítica externa #9, punto 2): el panel de escritorio se nombra
 *    con `aria-labelledby` al id de su disparador, y la hoja NO -- se nombra
 *    con su propio `aria-label`. Ver el JSX de `NavSheet()` para el porqué
 *    medido.
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
 *    `NAV_SHEET_SCROLL_TOLERANCE_PX`). No tiene equivalente en escritorio.
 * 8. El fondo NO se desplaza mientras la hoja está abierta (crítica externa
 *    #9, punto 4). Tampoco tiene equivalente en escritorio: el panel de
 *    escritorio no es `aria-modal` y no reclama la página entera.
 * 9. El fondo queda `inert` mientras la hoja está abierta (crítica #12).
 *    Tampoco tiene equivalente en escritorio, y por el mismo motivo que el
 *    punto 8: solo una capa que declara `aria-modal` tiene que hacer cierto lo
 *    que declara. Ver el docblock de `backgroundSiblings`.
 */
export function useNavSheet(): NavSheetController {
  const [isOpen, setIsOpen] = useState(false);
  const triggerId = useId();
  const sheetId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  /* Los nodos de fondo a los que ESTA hoja les puso `inert` (ver
     `backgroundSiblings`), para no retirar el de nadie más. */
  const inertedRef = useRef<HTMLElement[]>([]);

  /*
   * SE LIBERA ANTES DE CERRAR, NUNCA DESPUÉS, y el orden no es cosmético.
   *
   * Los dos caminos de cierre de abajo mueven el foco a un elemento que está
   * FUERA de la hoja -- al disparador (`closeAndFocusTrigger`) o al destino del
   * ancla que se acaba de pulsar (`focusNavAnchorTarget`, llamado por
   * `NavSheetGroup` justo después de `close`) -- y los dos lo hacen de forma
   * SÍNCRONA, dentro del mismo manejador. La limpieza del efecto que aplica
   * `inert` corre mucho más tarde (efecto pasivo, tras el commit), así que en
   * ese instante el destino del `focus()` todavía sería inerte y el navegador
   * descartaría la llamada en silencio: el foco acabaría en `<body>`. Sería
   * reintroducir, por otra puerta, los dos defectos que el repo ya pagó (fix
   * wave A hallazgo A3, y crítica externa #9 punto 1).
   *
   * Liberar antes es seguro: lo único que ocurre en ese hueco de unos
   * milisegundos es que el fondo vuelve a ser explorable mientras la hoja se
   * cierra, que es exactamente lo que va a pasar de todas formas.
   */
  const releaseBackgroundInert = useCallback((): void => {
    inertedRef.current.forEach((el) => el.removeAttribute("inert"));
    inertedRef.current = [];
  }, []);

  const close = useCallback((): void => {
    releaseBackgroundInert();
    setIsOpen(false);
  }, [releaseBackgroundInert]);

  // Fix wave A, hallazgo A3: ver el docblock de `closeAndFocusTrigger` en
  // `NavSheetController`. `triggerRef` es un ref (identidad estable), así
  // que este callback no necesita ninguna dependencia externa.
  const closeAndFocusTrigger = useCallback((): void => {
    releaseBackgroundInert();
    setIsOpen(false);
    triggerRef.current?.querySelector("button")?.focus();
  }, [releaseBackgroundInert]);

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

  /*
   * Punto 8: BLOQUEO DE SCROLL DEL FONDO (crítica externa #9, punto 4,
   * evaluador Nielsen). El defecto medido: con la hoja abierta (y por tanto
   * con `aria-modal="true"`), la rueda sobre la cabecera cerraba la hoja Y
   * arrastraba el fondo 600 px. Las dos mitades están mal. Un diálogo modal
   * declara que el resto de la página no está disponible; que se desplace
   * bajo el dedo lo desmiente, y además reubica al lector en otro punto del
   * documento como efecto colateral de un gesto que no iba dirigido a la
   * página.
   *
   * POR QUÉ POR EVENTO Y NO POR CSS: ver la sección "Por qué el bloqueo de
   * scroll NO es overflow: hidden" del docblock de cabecera de este fichero.
   * `overflow: hidden` en `html`/`body` rompería los cuatro `sticky` de las
   * presentaciones (regla 21, ya pagada); `preventDefault()` sobre los dos
   * gestos que producen scroll de usuario no toca el layout de nada.
   *
   * `{ passive: false }` es OBLIGATORIO y no cosmético: desde hace años los
   * navegadores registran `wheel`/`touchmove` sobre `document` como PASIVOS
   * por defecto, y en un listener pasivo `preventDefault()` no hace nada (con
   * un aviso en consola). Sin ese flag este efecto sería un no-op silencioso.
   *
   * La ÚNICA excepción es la propia capa de scroll de la hoja: ahí el gesto
   * va dirigido a la lista y tiene que seguir funcionando. Se comprueba por
   * contención de nodos (`[data-nav-sheet-scroll]`), no por coordenadas.
   * Cualquier otro punto -- velo, cabecera, relleno de la propia hoja -- queda
   * bloqueado; ninguno de ellos scrollea nada por sí mismo.
   *
   * QUÉ HACE AHORA LA RUEDA SOBRE LA CABECERA, decidido y no heredado: nada.
   * El gesto se bloquea, `window.scrollY` no cambia, y por tanto el cierre por
   * scroll del efecto de arriba (punto 7) ya no se dispara desde ahí. Es el
   * comportamiento que prescribe APG para un diálogo modal -- intentar
   * desplazar el fondo no es una forma de descartarlo; para eso están Escape,
   * el botón de cierre y el toque fuera, los tres ya implementados. El punto 7
   * NO se retira: sigue cubriendo los desplazamientos que este bloqueo no
   * puede ver (teclado, colapso de la barra de direcciones en móvil, scroll
   * programático), que son justamente aquellos en los que la hoja sí se ha
   * quedado descolgada de lo que el usuario está mirando.
   */
  useEffect(() => {
    if (!isOpen) return;

    function blockBackgroundScroll(event: Event): void {
      if (!event.cancelable) return;
      if (!(event.target instanceof Node)) return;
      const areaDeScroll = sheetRef.current?.querySelector(
        "[data-nav-sheet-scroll]",
      );
      if (areaDeScroll?.contains(event.target) === true) return;
      event.preventDefault();
    }

    document.addEventListener("wheel", blockBackgroundScroll, {
      passive: false,
    });
    document.addEventListener("touchmove", blockBackgroundScroll, {
      passive: false,
    });
    return () => {
      document.removeEventListener("wheel", blockBackgroundScroll);
      document.removeEventListener("touchmove", blockBackgroundScroll);
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

    /*
     * EL TOQUE FUERA DEVUELVE EL FOCO AL DISPARADOR (crítica #14, P2), igual
     * que ya hacían Escape y el botón de cierre propio.
     *
     * EL DEFECTO, medido por el evaluador: tras cerrar con un clic en el velo,
     * `document.activeElement` quedaba en `BODY`. No es un detalle estético --
     * es la misma familia que el repo ya pagó dos veces (fix wave A hallazgo
     * A3, crítica externa #9 punto 1) y por el mismo mecanismo: al cerrarse,
     * `ScNavSheet` recibe `inert` + `visibility: hidden`, y la focus fixup rule
     * del HTML resetea a `<body>` el foco que quedara dentro. Quien cerró la
     * hoja con el dedo o el ratón y luego pulsa Tab no continúa desde el
     * cabecero: vuelve a empezar la página entera.
     *
     * `closeAndFocusTrigger`, no un `focus()` a mano: es la MISMA función que
     * usan los otros dos caminos, y la que garantiza el orden que importa
     * (liberar el `inert` del fondo ANTES de mover el foco, ver
     * `releaseBackgroundInert` -- el disparador vive dentro de la cabecera, que
     * es uno de los nodos inertizados, así que enfocarlo antes de liberar sería
     * un no-op silencioso).
     *
     * SIN GUARDA de "¿estaba el foco dentro?": con la hoja abierta no puede
     * estar en otro sitio. El foco entra en su primera fila al abrirse (punto
     * 6), el ciclo de `handleKeyDown` lo devuelve dentro si se escapara, y el
     * fondo entero está `inert`. La única razón por la que este manejador se
     * ejecuta es que alguien tocó el velo.
     */
    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;
      if (isInside(event.target)) return;
      closeAndFocusTrigger();
    }

    function handleFocusIn(event: FocusEvent): void {
      if (!(event.target instanceof Node)) return;
      /*
       * "El foco se ha PERDIDO" no es "el foco se ha ido a otro control"
       * (crítica #12, segunda red del fondo inerte). Cuando el navegador no
       * tiene dónde poner el foco lo devuelve al documento -- `<body>`, el
       * `<html>` o el propio `document` --, y eso ocurre por vías que NO son
       * un usuario navegando fuera: la focus fixup rule al inertizar u ocultar
       * el elemento enfocado, o al retirarlo del DOM. Cerrar la hoja ahí sería
       * reaccionar a un accidente; el contrato del punto 5 es cerrar cuando el
       * foco ATERRIZA en algo de fuera, y el ciclo de `handleKeyDown` ya
       * devuelve el foco dentro si se hubiera escapado por cualquier otra vía.
       */
      if (
        event.target === document ||
        event.target === document.body ||
        event.target === document.documentElement
      ) {
        return;
      }
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

  /*
   * Punto 9: el FONDO queda `inert` mientras la hoja está abierta (crítica
   * #12). El porqué completo -- qué se marca, qué se excluye y por qué esto no
   * puede ser un atributo del JSX bajo `output: "export"` -- vive en el
   * docblock de `backgroundSiblings`, justo encima de este hook.
   *
   * DECLARADO EL ÚLTIMO A PROPÓSITO, y el orden es la parte no obvia: los
   * efectos corren en orden de declaración dentro del mismo commit, así que
   * cuando este aplica `inert` el foco YA está dentro de la hoja (lo acaba de
   * meter el efecto de arriba). Si se declarara antes, en el instante de
   * marcar la cabecera el foco seguiría en el disparador que abrió la hoja --
   * y un elemento que queda dentro de un subárbol inerte pierde el foco por la
   * focus fixup rule del HTML, con el `focusin` de rebote que el contrato de
   * abajo (punto 5) interpretaría como "el foco se ha ido fuera": la hoja se
   * cerraría sola en el mismo frame en que se abre. jsdom no implementa `inert`
   * ni esa regla, así que ese fallo no sería visible en la suite; el orden es
   * la defensa, y `handleFocusIn` ignora además el foco que cae en `<body>`
   * como segunda red.
   *
   * La limpieza cubre el desmontaje y los cierres que no mueven el foco
   * (puntero fuera, foco que se va, scroll de la página); los dos que SÍ lo
   * mueven liberan antes, de forma síncrona: ver `releaseBackgroundInert`.
   */
  useEffect(() => {
    if (!isOpen) return;
    const sheet = sheetRef.current;
    if (sheet === null) return;

    const fondo = backgroundSiblings(sheet).filter(
      (el) => !el.hasAttribute("inert"),
    );
    fondo.forEach((el) => el.setAttribute("inert", ""));
    inertedRef.current = fondo;

    return () => {
      releaseBackgroundInert();
    };
  }, [isOpen, releaseBackgroundInert]);

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
 * `NavMoreMenu` vive fuera de `Navbar()`: necesita SU PROPIO
 * `useId()` para atar el título a su lista, y `useId` no se puede llamar
 * dentro de un `map`.
 */
interface NavSheetGroupProps {
  readonly group: NavGroup;
  readonly onNavigate: () => void;
  /** Mismo contrato que `NavMoreMenuProps.activeSectionKey` en
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
   * `NavMoreMenu` (`Navbar.tsx`) y `Footer.tsx` -- porque extraerla a un
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

/**
 * ORDEN DE LA HOJA (crítica externa #9, punto 3). Medido a 390x844: la hoja
 * muestra 591 px y su contenido ocupa 623, así que su cola quedaba fuera de la
 * primera pantalla -- y hasta esta entrega la cola era el SELECTOR DE IDIOMA,
 * el único control de la hoja, a 91 px por debajo del filo inferior. Un
 * control indescubrible es un control que no existe para la mayoría.
 *
 * El arreglo es de ORDEN, no de tamaño (nada que recortar, ninguna medida que
 * pelear): los grupos de SALIDA del sitio bajan por debajo del control. Y no
 * es una lista escrita a mano de "qué grupo va dónde" -- eso se desincronizaría
 * con `NAV_GROUPS` a la primera --, sino la partición que el propio modelo ya
 * contiene: un grupo cuyos items son TODOS `kind: "external"` no lleva a
 * ninguna parte de esta página. El criterio declarado, en una línea: primero
 * lo que te mantiene en el sitio (secciones y tarjetas), luego los controles
 * de la página que estás viendo (idioma), y al final las puertas de salida
 * (SDK, Discord, GitHub, LinkedIn).
 *
 * `filter` conserva el orden relativo del array original, así que la
 * concatenación de las dos mitades reproduce EXACTAMENTE el orden del modelo
 * -- el candado que compara los `href` de la hoja contra él, en orden, sigue
 * diciendo la verdad sin tocarlo. Lo único que se mueve es dónde cae el bloque
 * de idioma entre ellos.
 *
 * El foco de apertura tampoco cambia: sigue entrando en la primera fila de
 * navegación real, porque el primer `a, button` del subárbol sigue siendo el
 * primer enlace de «En el sitio» -- los grupos que se quedan arriba son los de
 * dentro del sitio, no el control.
 *
 * LA PARTICIÓN SE CALCULA EN RENDER desde 2026-08-19 (crítica #12, P0), no en
 * dos constantes de módulo: el modelo ya no es único, se resuelve para el
 * idioma de la página (`navGroupsFor`), y una constante de módulo lo habría
 * congelado en castellano para las dos ramas. El criterio no cambia ni un
 * ápice -- `kind` es idéntico en los dos idiomas, solo cambia el prefijo del
 * `href` -- y el coste es filtrar cuatro grupos por render.
 */
function isExitGroup(group: NavGroup): boolean {
  return group.items.every((item) => item.kind === "external");
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
  readonly sheetId: string;
  readonly sheetRef: RefObject<HTMLDivElement | null>;
}

export function NavSheet({
  isOpen,
  onNavigate,
  onClose,
  sheetId,
  sheetRef,
}: NavSheetProps): ReactElement {
  const { t, i18n } = useTranslation("common");
  /* Mismo modelo y mismo idioma que la barra de escritorio (ver el docblock de
     `navGroupsFor`): la hoja es la ÚNICA navegación bajo 768 px, así que era
     donde la fuga de idioma de la crítica #12 se pagaba entera. */
  const groups = navGroupsFor(i18n.language);
  const inSiteGroups = groups.filter((group) => !isExitGroup(group));
  const exitGroups = groups.filter(isExitGroup);
  // Tarea 1 (navegación accesible): mismo singleton que consume `Navbar()`
  // para su propio panel de escritorio (ver `useActiveSection.ts`) -- las
  // dos superficies leen el mismo valor sin duplicar ningún listener.
  const activeSectionKey = useActiveSectionKey();

  /*
   * ¿Queda contenido por debajo del filo de la hoja? (crítica externa #9,
   * punto 3.) Es la entrada de `ScSheetFade` -- ver su docblock para el
   * porqué de la pieza; aquí vive solo la MEDIDA.
   *
   * Estado local de este componente, no del controlador (`useNavSheet`): la
   * hoja es la única que lo consume y `Navbar()` no tiene nada que decidir con
   * él, así que subirlo obligaría a atravesar dos componentes con una prop que
   * nadie más usa.
   *
   * ORDEN CON EL REINICIO DE `scrollTop`: `useNavSheet` vive en `Navbar()`
   * (nuestro padre) y sus efectos corren DESPUÉS de los de este componente,
   * así que la primera medida de cada apertura puede leer todavía el
   * `scrollTop` de la apertura anterior. No hace falta coordinarlos: al
   * reponerlo a 0 el navegador emite un `scroll` sobre esa misma capa, que
   * vuelve a pasar por aquí. Lo peor que puede ocurrir es un fotograma con el
   * degradado apagado mientras la hoja todavía está entrando en `opacity`.
   *
   * El margen de 1 px absorbe los `scrollHeight`/`clientHeight` fraccionarios
   * que un zoom o un DPR no entero producen: sin él, una hoja ya scrolleada
   * hasta el final podría quedarse marcando "hay más" para siempre.
   */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const area = scrollRef.current;
    if (!isOpen || area === null) {
      setClipped(false);
      return;
    }

    // Relee del ref en vez de cerrar sobre `area`: una declaración de función
    // es izada, así que TypeScript no conserva dentro de ella el estrechamiento
    // a no-nulo que hizo la guarda de arriba (verificado: `pnpm typecheck` lo
    // rechaza). Releer es además lo correcto si el nodo se reemplazara.
    function update(): void {
      const zona = scrollRef.current;
      if (zona === null) return;
      setClipped(zona.scrollTop + zona.clientHeight < zona.scrollHeight - 1);
    }

    update();
    area.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      area.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  return (
    <>
      {/* `onMouseDown` con `preventDefault` es la OTRA MITAD del arreglo del
          foco al tocar fuera (crítica #14, P2), y sin ella la primera mitad se
          deshace sola en un navegador real.
          `handlePointerDown` (`useNavSheet`) corre en `pointerdown`, que
          precede a `mousedown`; la acción por defecto de `mousedown` sobre un
          elemento NO focalizable -- este velo es un `<div>` decorativo -- es
          quitarle el foco a lo que lo tuviera, así que se ejecutaría DESPUÉS
          de nuestro `focus()` y lo mandaría igualmente a `<body>`. Cancelar
          esa acción por defecto es el mecanismo estándar para que un clic no
          mueva el foco, el mismo que se usa para que pulsar un botón no le
          robe el foco a un campo de texto.
          jsdom no implementa esa acción por defecto, así que el candado de la
          suite pasa igual con esta línea y sin ella: queda declarada aquí para
          quien la lea, y verificada por el integrador en navegador real.
          No cancela nada más: el velo no tiene ninguna otra acción por defecto
          que importe (no arrastra selección de texto porque tapa la página
          entera), y el `click` sigue emitiéndose con normalidad. */}
      <ScSheetVeil
        aria-hidden="true"
        data-nav-sheet-veil
        data-open={isOpen}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
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
          emite el atributo.

          NOMBRE ACCESIBLE PROPIO (crítica externa #9, punto 2; medido sobre
          el árbol de accesibilidad real por dos evaluadores). Hasta esta
          entrega la hoja se nombraba con `aria-labelledby={triggerId}`, el
          patrón que el desplegable de escritorio sí puede usar porque el texto
          de SU disparador es fijo. Aquí no lo es: el disparador cambia de
          etiqueta al abrirse (`Common.Nav.openMenu` -> `closeMenu`), así que
          el diálogo heredaba el nombre «Cerrar el menú de navegación» --
          justo en el único momento en que se anuncia, y describiendo la
          acción de un BOTÓN en vez del contenido del DIÁLOGO. Quien lo oye no
          sabe dónde ha entrado.

          `aria-label` con clave propia, no un `<h2>` visualmente oculto
          referenciado por `aria-labelledby`: la hoja NO tiene encabezados a
          propósito (sus cuatro rótulos de grupo son `<p>` atados con
          `aria-labelledby`, ver `ScSheetGroupTitle`) para no meter títulos en
          el esquema del documento que solo existirían bajo 768 px, y hay un
          candado que lo afirma. Un encabezado oculto reabriría eso a cambio de
          nada: el nombre de un diálogo no necesita ser visible ni ser un
          encabezado. */}
      <ScNavSheet
        id={sheetId}
        ref={sheetRef}
        role="dialog"
        aria-modal={isOpen ? true : undefined}
        aria-label={t("Common.Nav.sheetTitle")}
        data-nav-sheet
        data-open={isOpen}
        data-sheet-clipped={clipped}
        inert={!isOpen}
      >
        {/* Capa de scroll (Task 35, ver el docblock de ScSheetScroll):
            único hijo de flujo normal de ScNavSheet, aísla el
            `overflow-y: auto` del botón de cierre de más abajo -- que
            necesita quedar FUERA de cualquier contenedor que scrollee para
            seguir alcanzable con la lista desplazada. */}
        <ScSheetScroll
          ref={scrollRef}
          data-nav-sheet-scroll
        >
          {inSiteGroups.map((group) => (
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
              copia nueva.

              ENTRE LAS DOS MITADES DE `NAV_GROUPS`, no al final (crítica
              externa #9, punto 3): ver el docblock de `isExitGroup`, más
              arriba, para el criterio y para por qué el orden de los enlaces
              no cambia ni un puesto. */}
          <ScSheetGroup>
            <ScSheetGroupTitle>{t("Common.Lang.title")}</ScSheetGroupTitle>
            <ScSheetLanguage>
              <LanguageSelector />
            </ScSheetLanguage>
          </ScSheetGroup>
          {exitGroups.map((group) => (
            <NavSheetGroup
              key={group.key}
              group={group}
              onNavigate={onNavigate}
              activeSectionKey={activeSectionKey}
            />
          ))}
        </ScSheetScroll>
        {/* Afordancia de scroll: hermana de la capa de scroll, nunca hija
            (ver el docblock de ScSheetFade). `aria-hidden`: lo que anuncia es
            una propiedad visual del recorte, y quien no ve la pantalla ya
            recorre la lista entera con el foco.

            `data-sheet-fade`: gancho de test, mismo criterio que
            `data-nav-sheet-scroll`/`data-nav-sheet-close` de este mismo
            fichero -- la pieza no tiene texto, ni rol, ni ninguna otra forma
            estable de seleccionarla, y su POSICIÓN es justo lo que la crítica
            #15 encontró mal. */}
        <ScSheetFade
          aria-hidden="true"
          data-sheet-fade
        />
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
