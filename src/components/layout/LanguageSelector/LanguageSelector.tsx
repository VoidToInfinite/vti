"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { type DefaultTheme } from "styled-components";
import { LOCALES, resolveRoute, routePath, type Locale } from "@/config/site";
import {
  isMountedBranchEffective,
  scheduleBranchSettledCorrection,
} from "@/hooks/branchSettledCorrection";
import {
  captureReadingAnchor,
  type ReadingAnchor,
} from "@/hooks/themeScrollAnchor";
import { useActiveSectionKey } from "@/hooks/useActiveSection";
import { FRAGMENT_LANDING_SETTLE_MS } from "@/hooks/useFragmentLanding";
import { PRESS } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";

const LANGUAGES = LOCALES;

/*
 * Color del idioma ACTIVO (Task 33, gate F4, hallazgo del evaluador
 * independiente 2026-08-12): antes `theme.data.semantic.brand`
 * (`palette.primary[500]`) en las DOS ramas de tema. Medido con
 * `contrastRatio` contra el fondo REAL de la barra en sus dos estados
 * (transparente sobre el hero -- `AURA_SURFACE`/`EYE_SURFACE` -- y con
 * cristal -- `glass.bg` compuesto sobre `semantic.bg`/`semantic.surface`/
 * el void del hero, `contrastRatioOverAlpha`), describe "Task 33" en
 * `LanguageSelector.contrast.test.ts`:
 *
 *   TEMA CLARO (semantic.brand = primary[500]):
 *     transparente (sobre AURA_SURFACE)         1.915:1  <- incumple AA
 *     cristal (peor de los 3 fondos probados)    2.162:1  <- incumple AA
 *   TEMA OSCURO (semantic.brand = primary[400]):
 *     transparente (sobre EYE_SURFACE)          10.641:1  ya pasaba
 *     cristal (peor de los 3 fondos probados)    8.271:1  ya pasaba
 *
 * El evaluador midió el pixel real en tema claro sin scroll: #01B7FF sobre
 * #EBE8F9, 1,89:1 -- coincide con el 1.915:1 de `contrastRatio` contra
 * `AURA_SURFACE` (primary[500] resuelve a #02B7FF, un redondeo de un dígito
 * hex). Tema oscuro nunca incumplió: `semantic.onBrand` no aplica aquí --
 * este es texto sobre el propio fondo de la barra, no sobre un botón sólido.
 *
 * Resolución POR RAMA (`theme.data.isLight`), precedente Task 26
 * (`accentColor`, `Features.tsx`): en claro sube a `semantic.brandText`
 * (`primary[800]`, el MISMO rol que ya usan el kicker de marca y el CTA de
 * Features sobre `surface` en este sitio -- no un paso de `palette` suelto)
 * -- 4.909:1 transparente / 5.540-5.837:1 con cristal, los cuatro casos con
 * margen sobre AA. En oscuro NO cambia (`semantic.brand`, `primary[400]`):
 * ya pasaba.
 *
 * Se exporta como función nombrada (no ternario inline) para que
 * `LanguageSelector.contrast.test.ts` importe y mida la MISMA función que
 * pinta el botón real, y para que TAMBIÉN gobierne `:hover`/`:focus-visible`
 * (ver `ScLanguageButton`, más abajo): antes de esta tarea el hover usaba
 * `semantic.brand` sin condición de `$active`, así que pasar el cursor por
 * CUALQUIER botón -- activo o no -- en tema claro mostraba el mismo
 * primary[500] que incumplía AA.
 *
 * ## EL 4,909:1 DE ARRIBA ES CONTRA UN TOKEN PLANO; SOBRE EL ARTE REAL SON
 * 4,7 (crítica externa #16, medido 2026-09-03) -- pasa AA, con margen fino
 *
 * Aquella cifra de la Task 33 se calculó con `contrastRatio` contra
 * `AURA_SURFACE`, es decir contra el color con el que este repo NOMBRA el
 * fondo del hero en claro. El fondo real no es plano: es arte pintado, y bajo
 * la caja del enlace hay una distribución de píxeles, no un valor. Medido en
 * navegador real (1440x900, tema claro, `scrollY` 0, animaciones pausadas con
 * `document.getAnimations()`, tinta nominal `oklch(0.5 0.114 235.851)` =
 * rgb(0,108,155) resuelta por canvas 1x1, texto puesto en transparente para
 * muestrear SOLO el fondo bajo la caja de 66x44 del enlace):
 *
 *   evaluador de la #16      p05 4,70   mediana 4,75   mínimo 4,66   0 % < 4,5
 *   re-medición de esta ola  p05 4,71   mediana 4,75   mínimo 4,70   0 % < 4,5
 *
 * Las dos medidas coinciden dentro de 0,04, y la diferencia tiene explicación:
 * la re-medición se tomó DESPUÉS de que el raíl de la barra (hallazgo L4 de la
 * misma crítica, `Navbar.tsx`) moviera este control unos 112 px hacia el
 * centro a 1440, así que muestrea un trozo de arte ligeramente distinto. El
 * inactivo («English», rgb(99,99,99)) da 4,81-4,97 y el tema oscuro
 * 10,44-10,62 en los dos enlaces: ninguno de esos dos casos está cerca del
 * umbral.
 *
 * QUÉ SIGNIFICA: el control pasa AA (4,5:1) en el peor píxel de su caja, con
 * un margen de 0,16-0,25 -- fino pero real, y con el 0 % de los píxeles por
 * debajo del umbral. NO SE CAMBIA EL COLOR en esta entrega: subir el margen
 * exige oscurecer más la tinta activa sobre un fondo de marca, y eso es una
 * decisión de diseño del dueño, no una corrección de defecto.
 *
 * MÉTODO, escrito porque un evaluador de la misma crítica midió 4,24-4,38 en
 * esta misma pieza y esa cifra NO vale: muestreó por CLÚSTER DE GLIFO, es
 * decir, tomando los píxeles que el texto pinta. A 14 px, la mayoría de esos
 * píxeles son antialiasing -- mezclas parciales de tinta y fondo -- así que lo
 * que mide ese método es el suavizado del renderizador, no el contraste entre
 * la tinta y su fondo. WCAG 1.4.3 compara el color del TEXTO con el color del
 * FONDO; el fondo se muestrea con el texto retirado, que es lo que hacen las
 * dos filas de la tabla de arriba. Quien vuelva a medir esta pieza: retira la
 * tinta (`color` y `-webkit-text-fill-color` en transparente, y el subrayado
 * con ellos), captura la caja del enlace y compara la distribución del fondo
 * contra la tinta nominal.
 *
 * ## LOS DOS ENLACES BAJAN A 3,4:1 CUANDO EL ARTE PASA POR DEBAJO DE LA BARRA
 * (crítica externa #20, 2026-09-07, P1; y una segunda banda, en tema CLARO,
 * que esa crítica no vio y esta entrega midió)
 *
 * Todo lo de arriba mide esta pieza en el SITIO donde carga: sobre el hero, y
 * sobre los tres fondos que el cristal de la barra puede componer. Lo que
 * ninguna de las dos rondas midió es la barra FIJA con la página desplazada,
 * que es la mitad de la vida de este control: el arte de las secciones sigue
 * pasando por debajo, y lo que hay detrás del texto deja de ser el hero o un
 * token para ser el píxel que toque en ese instante.
 *
 * MEDIDO CON SONDA PROPIA sobre el build servido de `ecf55bc` (Chrome real sin
 * ventana, 1440x900, `deviceScaleFactor: 1`, tema fijado en `localStorage`
 * antes de cargar, SIN `prefers-reduced-motion` -- con la preferencia activa el
 * arte no se desplaza y la banda no existe), con el método de arriba: fondo
 * capturado con la tinta apagada, caja de LÍNEA (`Range.getClientRects`)
 * erosionada 2 px, p05 de la distribución. 240 mediciones en oscuro (120
 * posiciones por enlace, paso de 100 px y de 25 px en la banda mala) y 174 en
 * claro:
 *
 *   TEMA OSCURO, banda y = 9.275-9.750 (Contacto)   37 de 240 mediciones < 4,5
 *     «English» neutral/400  peor p05 3,400 en y=9.450   100 % de la caja < 4,5
 *     «Español» primary/400  peor p05 3,436 en y=9.425   100 % de la caja < 4,5
 *     peor fondo medido bajo cualquiera de las dos cajas: L = 0,10446
 *   TEMA CLARO, banda y = 4.900-5.200 (Contacto)    12 de 174 mediciones < 4,5
 *     «Español» primary/800  peor p05 3,488 en y=4.925    64 % de la caja < 4,5
 *     «English» neutral/800  peor p05 4,904 (no incumple en ninguna posición)
 *     peor fondo medido bajo cualquiera de las dos cajas: L = 0,58110
 *
 * El p05 de 3,400 reproduce el 3,41 que la crítica midió en y = 9.280, y el
 * 3,436 su 3,61: la banda es la misma. LO QUE AÑADE ESTA MEDICIÓN es la banda
 * CLARA, que nadie había mirado y que incumple igual.
 *
 * PALANCA ELEGIDA: la TINTA, un escalón (claro) o dos (oscuro) más lejos del
 * peor fondo medido. Se exige AA contra ese peor fondo y contra la caja de LOS
 * DOS enlaces, no contra la que a cada uno le tocó en el barrido: el arte se
 * desplaza y el parche oscuro que hoy pasa bajo «Español» pasará mañana bajo
 * «English» -- por eso «English» en claro también sube aunque su peor medición
 * cumpla.
 *
 *   TEMA CLARO (fondo medido L = 0,58110)   TEMA OSCURO (L = 0,10446)
 *     activo   primary/800  3,509  ->        activo   primary/400  3,444  ->
 *              primary/900  4,956                     primary/200  5,372
 *     inactivo neutral/800  3,606  ->        inactivo neutral/400  3,393  ->
 *              neutral/900  5,090                     neutral/200  5,362
 *
 * En oscuro NO basta el escalón 300 y por eso se van dos: `neutral/300` da
 * 4,439 y `primary/300` 4,460 contra ese mismo fondo, las dos por debajo de
 * 4,5 -- rozar el umbral con 0,06 de déficit es incumplirlo.
 *
 * POR QUÉ NO LA OTRA PALANCA (dar a la barra un fondo que no dependa de lo que
 * pase por debajo). Es la que arreglaría de raíz toda la cabecera de una vez
 * -- estos dos enlaces, los de sección y la marca --, y por eso mismo no es de
 * este fichero: ese fondo lo declara `ScSurface` en `Navbar.tsx`, con
 * `backdrop-filter` (el cristal que el repo declara como rasgo de diseño).
 * Hacerlo opaco retiraría ese efecto en toda la barra, que es una decisión de
 * diseño del dueño y no una corrección de defecto. Queda escrito en el informe
 * de la entrega como lo que es: la alternativa que cierra la familia entera.
 *
 * LOS DOS ESCALONES SALEN DE `palette` Y NO DE UN ROL, a diferencia de la Task
 * 33. No es un descuido: los roles de este tema (`text`, `textMuted`,
 * `textSubtle`, `brand`, `brandText`) están auditados contra los fondos PLANOS
 * del sistema (`semantic.bg`/`surface`), y aquí el fondo no es plano ni es un
 * token -- es arte medido en navegador. Ningún rol de la rama oscura cae en el
 * escalón que ese fondo exige (`text` es neutral/50, `textMuted` neutral/300 y
 * `brandText` primary/300, y los dos últimos no llegan). El precedente de
 * tomar el escalón medido en vez del rol vive dos declaraciones más abajo, en
 * el color del enlace inactivo, desde el 2026-08-14.
 *
 * SI EL ARTE O EL FONDO DE LA BARRA CAMBIAN, ESTA MEDICIÓN CADUCA: las cifras
 * de arriba viven también en el censo (`scripts/check-text-contrast.mjs`,
 * filas `header/*`), que es donde el gate las vigila.
 */
export function languageAccent(theme: DefaultTheme): string {
  return theme.data.isLight
    ? theme.data.palette.primary[900]
    : theme.data.palette.primary[200];
}

/**
 * Tinta del idioma INACTIVO, y por qué es una función exportada como su
 * hermana de arriba: para que `LanguageSelector.contrast.test.ts` mida la
 * MISMA función que pinta el enlace en vez de una copia del literal.
 *
 * Aquí vivía un ternario dentro del template de `ScLanguageButton`
 * (`palette.neutral[800]` en claro, `semantic.textSubtle` en oscuro). El
 * porqué de aquellos dos valores sigue escrito en el comentario de esa
 * declaración; lo que cambia el 2026-09-07 es el escalón, por la medición del
 * docblock de `languageAccent`: los dos suben un peldaño (claro) o dos
 * (oscuro) para pasar AA sobre el peor fondo que la cabecera llega a tener
 * encima, no solo sobre el que tenía al cargar.
 */
export function languageInactiveInk(theme: DefaultTheme): string {
  return theme.data.isLight
    ? theme.data.palette.neutral[900]
    : theme.data.palette.neutral[200];
}

/*
 * EL CONTROL VUELVE A EXISTIR SIN JAVASCRIPT (2026-08-18) — se retira el
 * `@media (scripting: none) { display: none }` que lo ocultaba.
 *
 * Historia, porque el guard no fue una decisión estética: la crítica externa
 * #10 (hallazgo A, P1) midió con `javaScriptEnabled: false` real que los dos
 * botones de idioma se pintaban visibles —uno incluso con el aspecto del
 * idioma ACTIVO— mientras ninguno de sus dos manejadores podía correr
 * (`i18n.changeLanguage` y la escritura de `STORAGE_KEYS.lang` son las dos
 * JavaScript; esa escritura se retiró en la crítica externa #15, 2026-09-02,
 * porque el idioma vive en la URL y la clave nunca se leía). Pulsar no hacía nada y nada lo explicaba, así que se ocultó: un
 * `<noscript>` como el del formulario de contacto (`ScNoscriptNote`,
 * `Contact.tsx`) tiene sentido allí porque hay una salida REAL que ofrecer —la
 * dirección de correo—, y aquí no existía ninguna.
 *
 * La frase exacta que justificaba ocultarlo era: «Tampoco hay una ruta por
 * idioma a la que un enlace pudiera llevar en su lugar». Desde esta entrega
 * SÍ la hay — `/en`, `/en/privacy`, `/en/legal-notice` son documentos reales
 * horneados por el build—, así que la premisa del guard ha dejado de ser
 * cierta y el guard se retira con ella. Un `<a href>` navega sin ejecutar una
 * sola línea de JavaScript: el control ya no promete algo que no puede
 * cumplir, lo cumple.
 */
const ScLanguageSelector = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[1]};
`;

/*
 * WCAG 1.4.1 (Task 33, punto 2 del hallazgo): el color NUNCA fue el único
 * medio de indicar el idioma activo -- `font-weight` ya distinguía 700/400 --
 * pero a 14px la diferencia de peso es sutil para quien no distingue el
 * color. Se refuerza con `text-decoration: underline` (mismo criterio que el
 * brief sugiere: "peso tipográfico, subrayado, marca"), aditivo al peso que
 * ya existía -- ninguna señal sustituye a la otra, se suman.
 * `text-underline-offset` se explicita porque el subrayado por defecto del
 * navegador pega la línea al descendente de la tipografía a este tamaño; el
 * valor es un múltiplo del font-size, no un literal de píxeles sueltos.
 *
 * `padding`: término INLINE en `inlineSpace` (ver su docblock en
 * `tokens/space.ts`). Es el relleno lateral de un control con rótulo, y con la
 * fuente al 200 % deja de crecer cuando el viewport ya no da más de sí. El de
 * BLOQUE sigue en `space` -- el suelo táctil lo pone `min-height`, no el
 * relleno.
 */
const ScLanguageButton = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Área táctil mínima AA (44px), literal como en Button md/Input: no hay
     casilla de la escala de space para este tamaño mínimo, mismo precedente
     ya usado en el sistema. min- en vez de fijo: el botón renderiza el
     nombre completo del idioma ("Español"/"English", no un código de dos
     letras), así que 44px es solo el suelo del área táctil, no el ancho que
     va a ocupar en la práctica. */
  min-height: 44px;
  min-width: 44px;
  padding: ${({ theme }) => theme.data.space[1]}
    ${({ theme }) => theme.data.inlineSpace[2]};
  border-radius: ${({ theme }) => theme.data.radius.md};
  /* El peldaño bodySm, y no un 0.875rem a mano (crítica externa #15, hallazgo
     C6): el literal que había aquí resolvía EXACTAMENTE al peldaño, así que el
     CSS renderizado no distinguía los dos casos -- solo la fuente los separa
     (task/lessons.md, 2026-08-12). Los docblocks de arriba y de abajo hablan
     de "14px" y de "a 14px la diferencia de peso es sutil": ese 14px es este
     peldaño, y ahora lo lee en vez de repetirlo.

     Sin comillas invertidas en este comentario a propósito: vive DENTRO del
     template literal de styled-components, donde una sola cerraría el
     template (lección reincidente de task/lessons.md, 2026-07-31 y
     2026-08-16). */
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  /* INACTIVO: un escalon por debajo de textSubtle SOLO en claro (QA §6, item
     41, 2026-08-14). Medido sobre pixel pintado con el selector encima del
     arte del hero -- que es donde vive al cargar, antes de que el navbar pase
     a cristal --, textSubtle daba 4,27 de mediana con el 100% del texto bajo
     el umbral de 4,5. No era un borde rozando el arte: era uniformemente
     bajo.

     Por que aqui y no en el token: textSubtle es global. Aquel arreglo dejo
     el valor solo en la rama clara porque en oscuro la misma pieza medía
     10,5 sobre el hero; con la pagina desplazada NO, y desde el 2026-09-07
     las dos ramas resuelven por la misma funcion, languageInactiveInk, cuyo
     docblock lleva la medicion (sin comillas invertidas en este comentario a
     proposito: vive DENTRO del template literal, donde una sola cerraria el
     template).

     La Task 33 midio este mismo control en 4,909, y no se contradice con el
     4,27: aquella cifra era contra el CRISTAL del navbar, esta es contra el
     arte del hero. Son dos fondos distintos para el mismo texto, y el peor
     manda.

     La jerarquia activo/inactivo NO depende de este color: la dan el peso
     (700 contra 400) y el subrayado, los dos declarados justo aqui debajo. */
  color: ${({ theme, $active }) =>
    $active ? languageAccent(theme) : languageInactiveInk(theme)};
  text-decoration: ${({ $active }) => ($active ? "underline" : "none")};
  text-underline-offset: 0.2em;
  cursor: pointer;
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  /* Mismo patrón (propiedad, duración y curva) que sus dos hermanos con el
     mismo rol -- ScNavLink (Navbar.tsx) y ScFooterLink (Footer.tsx): los
     tres son enlaces/controles de texto que cambian de color en hover/foco,
     y hasta ahora este era el único de los tres sin transition, así que el
     cambio de color aquí saltaba en seco mientras en los otros dos se
     animaba (hallazgo 3, D7).

     transform se AÑADE a esta lista (Task 9, primera adopción real de
     vocabulary.PRESS): el único cambio de transform de este control es
     el :active de abajo, así que la entrada nace ya con los valores de
     PRESS -- no hay ningún hover-lift previo con el que colisionar. */
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => languageAccent(theme)};
  }

  /* Press (Task 9): único feedback táctil de este control -- el hover de
     arriba es solo color, así que no hay nada que guardar tras
     PRESS.hoverGuard (punto 2 del brief: "los de color pueden quedarse").
     :active SÍ se declara sin guard: es la única primitiva de las dos que
     funciona igual de bien con dedo que con ratón. */
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

/**
 * CAMBIAR DE IDIOMA YA NO TIRA LA POSICIÓN DE LECTURA (2026-08-20, ola
 * post-crítica #13).
 *
 * EL DEFECTO, medido: leyendo la home en `scrollY = 2500` y pulsando
 * «English» se llegaba a `/en` con `scrollY = 0`
 * (`performance.getEntriesByType("navigation")[0].type === "navigate"`: es
 * navegación de documento completo, así que el navegador arranca arriba). El
 * lector reiniciaba la lectura desde el principio justo cuando acababa de
 * declarar que no entiende el idioma. La inconsistencia era además INTERNA: el
 * conmutador de TEMA sí conserva la sección de lectura desde el 2026-08-17
 * (`useThemeScrollReset` + `themeScrollAnchor.ts`).
 *
 * EL ARREGLO EN UNA LÍNEA: el enlace del OTRO idioma lleva como fragmento la
 * sección que el lector tiene delante -- `/en#journey` en vez de `/en` --, así
 * que el navegador aterriza en esa misma sección del documento nuevo.
 *
 * POR QUÉ EN TÉRMINOS DE SECCIÓN Y NO DE PÍXELES: los dos documentos NO miden
 * lo mismo (el copy inglés no ocupa lo que el castellano), así que restaurar un
 * `scrollY` literal conservaría la posición y no el contenido -- exactamente lo
 * que `themeScrollAnchor.ts` ya midió entre ramas de tema y documenta en su
 * cabecera. Se aterriza en el INICIO de la sección, que es el mismo trato que
 * ese módulo reserva para el caso en que el desplazamiento dentro del ancla
 * vieja no significa nada en la nueva (`preserveOffset: false`).
 *
 * POR QUÉ UN FRAGMENTO EN EL `href` Y NO UN TRASPASO POR ALMACENAMIENTO
 * (`sessionStorage`/`localStorage` leído al montar en el destino):
 *
 *   1. NO ES UN MECANISMO NUEVO EN ESTE SITIO. Desde el arreglo del P0-2 de la
 *      crítica #6, los 7 destinos de sección del pie y de la barra son
 *      `/#story`-style ABSOLUTOS precisamente para poder navegar a la home
 *      desde otro documento y aterrizar en la sección (ver el docblock de
 *      `NAV_GROUPS`, `src/config/navigation.ts`). Un idioma es otro documento
 *      más: se reutiliza el camino ya sancionado en vez de abrir uno propio.
 *   2. NO ESCRIBE NADA EN EL EQUIPO DEL VISITANTE. `src/config/storage.ts` es
 *      el registro único de lo que el sitio guarda y la tabla legal de
 *      `/privacidad` se apoya en él: un traspaso por almacenamiento habría
 *      añadido una entrada nueva a esa superficie para resolver algo que la URL
 *      ya sabe expresar.
 *   3. NO DEPENDE DE QUE EL DESTINO EJECUTE JAVASCRIPT. El salto lo hace el
 *      navegador al procesar el documento; un traspaso por almacenamiento
 *      aterrizaría arriba y corregiría después de hidratar, con un salto
 *      visible y una carrera contra el re-maquetado que habría que temporizar.
 *   4. EL DESTINO ES HONESTO: se ve en la barra de estado, se puede copiar,
 *      abrir en pestaña nueva o compartir, y lleva al mismo sitio que el click.
 *
 * NO CAMBIA NADA SIN JAVASCRIPT, y es deliberado: `useActiveSectionKey` es un
 * `useSyncExternalStore` cuyo `getServerSnapshot()` devuelve `null`, así que el
 * HTML horneado por el build lleva SIEMPRE el `href` pelado (`/en`) -- el
 * control sigue siendo el enlace normal a la portada del otro idioma que la
 * entrega del 2026-08-18 dejó, y el fragmento solo aparece después de hidratar.
 * Ese mismo contrato es lo que garantiza que la hidratación no tenga mismatch:
 * React usa el snapshot de servidor para el render de hidratación.
 *
 * EL IDIOMA ACTIVO NO LO LLEVA (`active ? null : ...`, ver el JSX): su enlace
 * apunta a la página en la que ya estás, así que añadirle el fragmento
 * convertiría un click inocuo en un salto al inicio de la sección más una
 * entrada de historial.
 *
 * ## LA SECCIÓN NO BASTA: SE CONSERVA TAMBIÉN EL PUNTO DENTRO DE ELLA
 * (crítica externa #20, 2026-09-07, P1)
 *
 * El arreglo de arriba dejó de tirar al lector al principio del DOCUMENTO,
 * pero lo sigue dejando en el principio de la SECCIÓN. Medido por el
 * orquestador de esta ola a 1440x900 en tema claro, colocando el centro del
 * viewport al 85 % de cada sección y pulsando el otro idioma:
 *
 *   #story    1.905 -> 772    (−1.133 px)   #features 3.929 -> 3.067  (−862)
 *   #journey  2.701 -> 2.433  (−268)        #contact  5.082 -> 4.387  (−695)
 *
 * A 390x844 la pérdida llega a −2.227 px, dos pantallas y media, el 75 % de la
 * sección. Los dos documentos miden casi lo mismo (6.588 contra 6.536 px en
 * claro), así que no es geometría: es que el destino no lleva más información
 * que el nombre de la sección.
 *
 * QUÉ VIAJA AHORA, Y POR QUÉ COMO FRACCIÓN. Un parámetro de consulta,
 * `?read=<fracción>`, con el desplazamiento del lector DENTRO de la sección
 * dividido por el alto de la sección. La fracción, y no los píxeles, porque
 * las dos secciones no miden lo mismo en los dos idiomas -- el mismo párrafo
 * ocupa más líneas en uno que en otro-- y lo que se quiere conservar es el
 * CONTENIDO que la persona tiene delante, no una distancia. Con la fracción no
 * hace falta mandar además el alto de la sección de partida ni recortar contra
 * él: `readingOffsetTarget` la multiplica por el alto que la sección tenga en
 * el documento de llegada.
 *
 * POR QUÉ EL FRAGMENTO SE QUEDA. El `#seccion` sigue siendo el destino de la
 * URL y lo hace todo lo que ya hacía: el navegador aterriza en la sección
 * ANTES de hidratar (sin esperar a que corra una sola línea de JavaScript), y
 * `useFragmentLanding.ts` lo recoloca cuando la rama oscura cambia el alto del
 * documento. La fracción es un REFINAMIENTO que se aplica encima; si nada la
 * lee -- porque el destino no ejecutó JavaScript, o porque el lector ya tomó el
 * control del scroll --, el resultado es exactamente el de antes de esta
 * entrega, nunca peor.
 *
 * POR QUÉ NO VA TAMBIÉN EN EL `href` HORNEADO, y esto es una restricción real,
 * no una preferencia: la fracción cambia con cada píxel de scroll, y el `href`
 * se calcula en RENDER. Meterla ahí obligaría a re-renderizar la cabecera en
 * cada evento de scroll, y además leer geometría durante el render está
 * prohibido en este repo (rompe el export estático: ver `captureReadingAnchor`
 * en `themeScrollAnchor.ts`, que por eso se llama SIEMPRE desde un manejador
 * de click). Así que el atributo `href` que se hornea y el que se ve al pasar
 * el ratón siguen siendo exactamente los de antes -- `/en` pelado en el HTML
 * estático, `/en#journey` tras hidratar -- y la fracción se añade en el
 * momento del click, que es cuando se puede medir sin coste.
 *
 * NO SE GUARDA NADA EN EL EQUIPO DEL VISITANTE, igual que el arreglo anterior:
 * el registro de `src/config/storage.ts` y la tabla de `/privacidad` siguen
 * describiendo exactamente lo que el sitio escribe, y una fracción en la URL no
 * añade una fila a esa tabla.
 */
export function languageHref(
  path: string,
  sectionId: string | null,
  readingRatio: number | null = null,
): string {
  if (sectionId === null) return path;
  if (readingRatio === null) return `${path}#${sectionId}`;
  return `${path}?${READING_OFFSET_PARAM}=${readingRatio}#${sectionId}`;
}

/**
 * Nombre del parámetro que lleva el punto de lectura DENTRO de la sección. Se
 * declara una sola vez porque lo escriben y lo leen dos mitades distintas de
 * este mismo fichero (el click que compone la URL y el efecto que la consume),
 * y una copia suelta las desincronizaría sin que nada fallara: la mitad que
 * escribe seguiría funcionando y la que lee no encontraría nunca nada.
 */
export const READING_OFFSET_PARAM = "read";

/**
 * Decimales con los que viaja la fracción. Cuatro no es un número redondo
 * elegido a ojo: la sección más larga del sitio es el deck oscuro de Story
 * (~16.000 px), y 1/10.000 de esa altura es 1,6 px -- por debajo de lo que
 * nadie puede ver. Con tres decimales serían 16 px, ya visibles.
 */
const READING_OFFSET_DECIMALS = 4;

/**
 * Fracción del alto de la sección que el lector tiene por encima del borde
 * superior del viewport, o `null` si el ancla no permite calcularla.
 *
 * PUEDE SER NEGATIVA con toda normalidad, y recortarla sería el mismo error
 * que `anchoredScrollY` (`themeScrollAnchor.ts`) ya documenta para su propio
 * desplazamiento: significa que la sección empieza POR DEBAJO del borde
 * superior de la pantalla, que es el estado de cualquier franja de transición
 * entre dos secciones.
 */
export function readingOffsetRatio(anchor: ReadingAnchor): number | null {
  if (!(anchor.height > 0)) return null;
  const ratio = (anchor.scrollY - anchor.topDoc) / anchor.height;
  if (!Number.isFinite(ratio)) return null;
  return Number(ratio.toFixed(READING_OFFSET_DECIMALS));
}

/** El punto de lectura tal y como viaja en la URL: la sección (del fragmento)
 *  y la fracción dentro de ella (del parámetro). */
export interface ReadingOffset {
  readonly id: string;
  readonly ratio: number;
}

/**
 * Lee el punto de lectura de la URL de LLEGADA, o `null` si esta carga no
 * trae ninguno.
 *
 * Se valida campo a campo y se descarta en silencio lo que no encaje, por el
 * mismo motivo que `parseStoredPosition` (`useReloadLanding.ts`) valida lo que
 * saca de `sessionStorage`: una URL la puede escribir cualquiera a mano, y
 * entre la escritura y la lectura cabe un despliegue con otro formato. Una
 * fracción fuera de [−1, 1] no es un desplazamiento dentro de una sección, así
 * que no se recorta: se ignora entera y la carga se comporta como cualquier
 * otra con fragmento.
 */
export function parseReadingOffset(
  search: string,
  hash: string,
): ReadingOffset | null {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (id === "") return null;
  const raw = new URLSearchParams(search).get(READING_OFFSET_PARAM);
  if (raw === null || raw === "") return null;
  const ratio = Number(raw);
  if (!Number.isFinite(ratio) || Math.abs(ratio) > 1) return null;
  return { id, ratio };
}

/** Entrada de `readingOffsetTarget`: la geometría de la sección en el
 *  documento de LLEGADA, más la fracción que viajó en la URL. */
export interface ReadingOffsetTargetInput {
  /** Top de documento de la sección de destino, ya montada la rama efectiva. */
  readonly sectionTopDoc: number;
  /** Alto de esa sección en el documento de llegada, que no tiene por qué ser
   *  el que tenía en el de partida. */
  readonly sectionHeight: number;
  readonly ratio: number;
  readonly viewportHeight: number;
}

/**
 * `scrollY` al que hay que ir para que el lector siga leyendo por donde iba.
 *
 * LA COTA NO ES DECORATIVA: es la misma garantía que `anchoredScrollY`
 * (`themeScrollAnchor.ts`) demuestra para el cambio de tema, y aquí hay que
 * volver a imponerla porque la fracción se multiplica por un alto DISTINTO del
 * que la produjo. El ancla la eligió `useActiveSectionKey` por contención del
 * centro del viewport, así que en el documento de partida el centro estaba
 * dentro de la sección; recortando el desplazamiento a `[−viewport/2,
 * alto − viewport/2]` el centro cae en `[0, alto]` respecto al inicio de la
 * sección de llegada, es decir DENTRO de ella, sea cual sea el alto nuevo. Sin
 * la cota, una sección que en el otro idioma midiera el doble podría dejar al
 * lector antes de que empiece o después de que acabe -- que es exactamente el
 * defecto que esta entrega arregla, con otro disfraz.
 *
 * El `Math.max(0, ...)` final es el borde del documento, no una tercera regla:
 * no existe scroll negativo.
 */
export function readingOffsetTarget(input: ReadingOffsetTargetInput): number {
  const { sectionTopDoc, sectionHeight, ratio, viewportHeight } = input;
  const medioViewport = viewportHeight / 2;
  const suelo = -medioViewport;
  const techo = Math.max(suelo, sectionHeight - medioViewport);
  const offset = Math.min(Math.max(ratio * sectionHeight, suelo), techo);
  return Math.max(0, sectionTopDoc + offset);
}

/**
 * Teclas cuyo comportamiento por defecto es desplazar el documento. Pulsar una
 * de ellas ES tomar el control del scroll, exactamente igual que una rueda o
 * un arrastre táctil.
 *
 * ES UNA COPIA DECLARADA de `SCROLL_KEYS` (`branchSettledCorrection.ts`), no
 * una lista nueva: la guarda de este fichero cubre el frame que la compartida
 * ya no cubre --se libera justo antes de aplicar la corrección--, así que las
 * dos tienen que entender por "desplazar" exactamente lo mismo o habría un
 * frame con otro criterio. La copia existe porque aquel módulo no exporta la
 * suya, y lo que impide que diverjan no es la memoria de quien escribió las
 * dos: es el candado de FUENTE que las compara elemento a elemento
 * (`LanguageSelector.test.tsx`). La salida limpia --exportar la lista, o mejor
 * el observador entero, desde `branchSettledCorrection.ts`-- queda declarada
 * como pendiente en el informe de esta entrega: toca un fichero que este
 * frente no podía modificar.
 */
const SCROLL_INTENT_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Spacebar",
]);

/**
 * Empieza a observar si el lector toma el control del scroll. Devuelve la
 * función que retira los tres listeners y contesta si lo tomó.
 *
 * Escucha INTENCIÓN (`wheel`/`touchmove`/`keydown`) y NUNCA el evento
 * `scroll`, por el mismo motivo que la guarda compartida: el aterrizaje en el
 * fragmento, la restitución de una recarga y la propia corrección de este
 * fichero emiten `scroll`, así que escucharlo abortaría siempre y contra la
 * nada.
 *
 * Los tres listeners se retiran al leer la respuesta, y quien llama está
 * obligado a leerla también al desmontar (ver `useReadingOffsetLanding`): en
 * una pestaña oculta no hay frames, así que el `requestAnimationFrame` que
 * normalmente los suelta puede tardar en llegar todo lo que dure la pestaña.
 */
function watchScrollIntent(): () => boolean {
  let intent = false;

  function onIntent(): void {
    intent = true;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (SCROLL_INTENT_KEYS.has(event.key)) intent = true;
  }

  window.addEventListener("wheel", onIntent, { passive: true });
  window.addEventListener("touchmove", onIntent, { passive: true });
  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("wheel", onIntent);
    window.removeEventListener("touchmove", onIntent);
    window.removeEventListener("keydown", onKeyDown);
    return intent;
  };
}

/** Diferencia por debajo de la cual una corrección de scroll no es observable
 *  y sí lo es su coste (un evento `scroll` sintético que despierta a
 *  `useScrolled`/`useNavDetach`/`BackToTop`). Mismo umbral y mismo motivo que
 *  `restoreReadingAnchor` (`themeScrollAnchor.ts`). */
const READING_OFFSET_EPSILON_PX = 1;

/**
 * Coloca al lector en su punto de lectura, y lo vuelve a colocar UN frame
 * después si algo lo ha movido mientras tanto. Devuelve la función que suelta
 * la guarda de intención de ese frame, o `null` si no llegó a armarse.
 *
 * LA SEGUNDA PASADA EXISTE POR UN VECINO CONCRETO, no por desconfianza:
 * `useFragmentLanding.ts` corrige el aterrizaje del fragmento con la misma
 * espera compartida (`branchSettledCorrection.ts`), así que su
 * `scrollIntoView({ block: "start" })` y esta corrección caen en el MISMO
 * frame. Cuál de los dos se aplica primero depende del orden en que React
 * ejecuta los efectos de dos componentes hermanos --la cabecera y la portada--
 * y eso no es un contrato del que deba depender el destino del lector. En vez
 * de competir por ese orden, esta corrección se aplica dos veces: en el frame
 * asentado y en el siguiente. La del frame siguiente llega SIEMPRE después que
 * el vecino, y no por suerte: un `requestAnimationFrame` pedido desde dentro
 * de un callback de frame se ejecuta en el frame siguiente, nunca en el que lo
 * pidió.
 *
 * ## LA GUARDA DE ESTA SEGUNDA PASADA ES UN HECHO SOBRE EL LECTOR, NO UNA
 * POSICIÓN CALCULADA (2026-09-07, la mitad de llegada del P1 de la crítica #20)
 *
 * Hasta esta entrega la condición era "la página está EXACTAMENTE donde el
 * aterrizaje en el fragmento la habría dejado", con ese punto calculado aquí
 * como `topDoc − scroll-margin-top`. La corrección no llegaba a aplicarse
 * NUNCA, y el motivo es que ese cálculo estaba incompleto: le faltaba el
 * `scroll-padding-top` del contenedor que desplaza.
 *
 * MEDIDO con sonda propia sobre el build servido de `b974fa2` (Chrome real sin
 * ventana, 1440x900, `deviceScaleFactor: 1`, tema fijado en `localStorage`,
 * envolviendo `window.scrollTo` y `Element.prototype.scrollIntoView` desde un
 * `addInitScript` para registrar quién mueve la página, cuándo y a dónde).
 * Cargando `/en?read=0.587#story` en claro:
 *
 *   t = 273,4 ms   scrollTo(1874,9)          <- primera pasada, correcta
 *   t = 273,5 ms   scrollIntoView(#story)    <- el vecino, MISMO frame
 *                  topDoc 900, scroll-margin-top 64px  ->  y = 772
 *   (la segunda pasada corre y se abstiene: su cuenta daba 900 − 64 = 836)
 *
 * Los 64 px que faltaban son EXACTAMENTE otro desfase de cabecera, y están en
 * `GlobalStyles.tsx`: además del `scroll-margin-top` de las secciones,
 * `html` declara `scroll-padding-top: calc(var(--nav-height) + var(--nav-gap))`
 * (WCAG 2.4.11, para el scroll que induce el foco por teclado). Un
 * `scrollIntoView` alinea el borde con margen del destino contra la región de
 * visualización del contenedor, que es su caja YA descontado el
 * `scroll-padding`: el desfase efectivo es la SUMA de los dos, 128 px. Es el
 * mismo 128 que la tabla de `useFragmentLanding.ts` lleva escrito como
 * "correcto" desde la crítica #11, atribuido allí a una sola de las dos
 * propiedades. Comprobado en las OCHO combinaciones de la sonda (dos temas x
 * cuatro secciones): en las ocho, la página acaba en `topDoc − 128`.
 *
 * POR QUÉ NO SE ARREGLA SUMANDO EL SEGUNDO TÉRMINO. Sería la tercera copia del
 * mismo número --el CSS, el `scroll-margin-top` que ya se leía, y ahora el
 * `scroll-padding-top`--, y la próxima propiedad que el navegador meta en ese
 * cálculo volvería a dejar la guarda muda sin que nada se pusiera rojo. El
 * defecto no es que faltara un sumando: es que la condición era una FÓRMULA
 * sobre dónde aterriza otro módulo.
 *
 * LA CONDICIÓN AHORA es la misma que usa el programador compartido para
 * decidir si sigue teniendo permiso: que el lector no haya tomado el control
 * del scroll (`wheel`/`touchmove`/tecla que desplaza) durante ese frame. Es un
 * hecho observable sobre una persona, no una cuenta sobre la geometría, así
 * que no puede desincronizarse de ningún CSS. Un gesto humano en ese frame
 * cancela la segunda pasada; lo que mueva la página sin gesto --el vecino, o
 * cualquier otro que llegue después-- se deshace. La guarda compartida cubre
 * la ventana grande (los ~200 ms hasta el frame asentado) y se suelta justo
 * antes de aplicar; ésta cubre el único frame que queda después de ella.
 *
 * SIGUE SIN PODER APLICARSE DOS VECES SEGUIDAS AL MISMO SITIO: si la página ya
 * está en el destino, la comparación contra el propio destino (la única cuenta
 * que queda, y es sobre un número de este fichero) se salta el `scrollTo` y no
 * emite ningún evento `scroll` sintético.
 */
function applyReadingOffset(offset: ReadingOffset): (() => boolean) | null {
  const target = readingOffsetScrollY(offset);
  if (target === null) return null;
  if (Math.abs(target - window.scrollY) >= READING_OFFSET_EPSILON_PX) {
    window.scrollTo({ top: target, behavior: "instant" });
  }
  if (typeof window.requestAnimationFrame !== "function") return null;
  const readIntent = watchScrollIntent();
  window.requestAnimationFrame(() => {
    if (readIntent()) return;
    const segundo = readingOffsetScrollY(offset);
    if (segundo === null) return;
    if (Math.abs(segundo - window.scrollY) < READING_OFFSET_EPSILON_PX) return;
    window.scrollTo({ top: segundo, behavior: "instant" });
  });
  return readIntent;
}

/**
 * El destino en coordenadas de documento, medido AHORA. `null` si la sección
 * que nombra la URL no existe en la rama montada -- que es un estado legítimo,
 * no un error: el fragmento puede pertenecer a un elemento que solo monta una
 * de las dos ramas de tema.
 *
 * `behavior: "instant"` en quien llama, nunca `"auto"`: esto es una corrección
 * de colocación, y `"auto"` resolvería al `scroll-behavior: smooth` global de
 * `GlobalStyles.tsx` -- un viaje animado de miles de píxeles, que es el defecto
 * que la Task 17 midió y retiró.
 */
function readingOffsetScrollY(offset: ReadingOffset): number | null {
  const el = document.getElementById(offset.id);
  if (el === null) return null;
  const rect = el.getBoundingClientRect();
  return readingOffsetTarget({
    sectionTopDoc: rect.top + window.scrollY,
    sectionHeight: rect.height,
    ratio: offset.ratio,
    viewportHeight: window.innerHeight,
  });
}

/**
 * Una sola vez por DOCUMENTO, y por eso vive en el módulo y no en un `useRef`:
 * este componente se monta dos o tres veces a la vez (la barra, la hoja móvil,
 * y cualquier cabecera que lo incluya), y las tres compartirían el mismo punto
 * de lectura de la URL. Mismo patrón y mismo porqué que `restorationConsumed`
 * en `useReloadLanding.ts`: una variable de módulo dura exactamente lo que
 * dura el documento, y una carga nueva trae un módulo nuevo.
 */
let readingOffsetConsumed = false;

/**
 * Reinicia el guard de módulo. EXISTE SOLO PARA LOS CANDADOS, igual que
 * `resetReadingRestorationForTests` (`useReloadLanding.ts`) y con el mismo
 * aviso: en el sitio real un documento nuevo trae un módulo nuevo y esta
 * función no haría falta, pero jsdom reutiliza el módulo entre los casos de un
 * mismo fichero de test.
 */
export function resetLanguageReadingOffsetForTests(): void {
  readingOffsetConsumed = false;
}

/**
 * Consume el punto de lectura de la URL de llegada.
 *
 * ESPERA A LA RAMA EFECTIVA con el mecanismo compartido y no con uno propio
 * (`branchSettledCorrection.ts`): bajo `output: "export"` el primer render es
 * siempre la rama clara, así que medir la geometría de la sección antes de que
 * monte la rama que va a quedarse daría un destino calculado sobre un
 * documento que ya no existe -- el defecto que ese módulo documenta con sus
 * cifras. La guarda de intención humana viene con él: si el lector se pone a
 * desplazar mientras tanto, esta corrección no llega a aplicarse nunca.
 *
 * EL FRAGMENTO Y EL PARÁMETRO SE LEEN UNA SOLA VEZ, en la primera pasada del
 * efecto, por el mismo motivo que `useFragmentLanding` captura su hash una
 * sola vez: un cambio de tema media hora después no puede volver a mandar al
 * lector al punto de lectura de la carga.
 *
 * LA LIMPIEZA SE COMPONE en vez de devolver la del programador compartido tal
 * cual: la guarda de intención del frame extra (ver `applyReadingOffset`) la
 * arma este fichero, así que este fichero la suelta también al desmontar. Sin
 * esto, una pestaña oculta --donde el `requestAnimationFrame` que normalmente
 * la suelta puede no llegar en mucho rato-- se quedaría con tres listeners
 * vivos. Mismo criterio que el "cero listeners permanentes" del módulo
 * compartido.
 */
function useReadingOffsetLanding(branchKey: string): void {
  const offsetRef = useRef<ReadingOffset | null | undefined>(undefined);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (offsetRef.current === undefined) {
      offsetRef.current = parseReadingOffset(
        window.location.search,
        window.location.hash,
      );
    }
    const offset = offsetRef.current;
    if (offset === null || finishedRef.current || readingOffsetConsumed) return;
    if (!isMountedBranchEffective(branchKey)) return;

    let releaseIntent: (() => boolean) | null = null;
    const cancel = scheduleBranchSettledCorrection({
      settleMs: FRAGMENT_LANDING_SETTLE_MS,
      onFinish: () => {
        finishedRef.current = true;
        readingOffsetConsumed = true;
      },
      apply: () => {
        releaseIntent = applyReadingOffset(offset);
      },
    });

    return () => {
      cancel();
      if (releaseIntent !== null) releaseIntent();
    };
  }, [branchKey]);
}

/**
 * La URL del otro idioma CON el punto de lectura, o `null` si esta pulsación no
 * puede refinarse y hay que dejar que el enlace navegue a su `href` de siempre.
 *
 * Se exige que el ancla medida ahora sea la MISMA sección que el `href` ya
 * anunciaba. No es prudencia: son dos módulos con conjuntos de candidatas
 * distintos a propósito -- `useActiveSectionKey` solo mira las secciones de la
 * navegación y contesta `null` en el hero, mientras que `captureReadingAnchor`
 * mira toda `section[id]` de primer nivel para poder anclar también ahí (los
 * dos lo declaran en sus docblocks). Con el lector en el hero, el primero dice
 * `null` y el segundo diría `hero`: componer la URL con lo que diga el segundo
 * convertiría un enlace que hoy lleva a la portada del otro idioma en un salto
 * a una sección. Si no coinciden, no se refina.
 */
function refinedLanguageHref(
  path: string,
  sectionId: string | null,
): string | null {
  if (sectionId === null) return null;
  const anchor = captureReadingAnchor();
  if (anchor === null || anchor.id !== sectionId) return null;
  const ratio = readingOffsetRatio(anchor);
  if (ratio === null) return null;
  return languageHref(path, sectionId, ratio);
}

/**
 * El único punto donde este componente navega por su cuenta, y solo para
 * añadir al destino algo que el `href` no puede llevar: el punto de lectura,
 * que solo existe en el instante del click (ver el docblock de
 * `languageHref`).
 *
 * SE RESPETA TODO LO QUE NO ES UNA PULSACIÓN NORMAL. Un click con botón
 * secundario o con modificador (abrir en pestaña nueva, en ventana nueva,
 * descargar) no se toca: ahí el navegador usa el ATRIBUTO `href`, que sigue
 * siendo el destino honesto de siempre --la misma página en el otro idioma, en
 * la sección que se está leyendo-- y esa persona ha pedido explícitamente otra
 * cosa que el resto de la sesión. La pulsación con teclado SÍ pasa por aquí:
 * un `Enter` sobre un enlace enfocado despacha un evento `click` normal.
 *
 * EL CONTRATO CON `next/link`, comprobado en su fuente y no supuesto
 * (`node_modules/next/dist/client/app-dir/link.js`: llama al `onClick` del
 * consumidor y, justo después, `if (e.defaultPrevented) return;` antes de
 * navegar). Por eso basta con `preventDefault()` para que el enlace se aparte.
 * Y SI ALGÚN DÍA DEJARA DE CUMPLIRSE, la degradación es la correcta: se
 * navegaría al `href` sin fracción, es decir al inicio de la sección, que es
 * exactamente lo que este sitio hacía antes de esta entrega.
 *
 * `window.location.assign` y no el router: el salto entre idiomas es una
 * navegación de DOCUMENTO completo de todas formas --`/` y `/en` cuelgan de
 * dos raíces distintas desde el 2026-09-06 (`app/(es)/layout.tsx` y
 * `app/en/layout.tsx`), así que el App Router no puede hacerla de cliente--,
 * y es además el mecanismo que este repo ya usa para navegar desde código
 * (`Contact.tsx`). Nada se pierde y el destino queda en la barra de
 * direcciones, copiable y compartible, igual que el del atributo.
 */
function handleLanguageClick(
  event: MouseEvent<HTMLAnchorElement>,
  path: string,
  sectionId: string | null,
): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const refined = refinedLanguageHref(path, sectionId);
  if (refined === null) return;
  event.preventDefault();
  window.location.assign(refined);
}

/*
 * DE CONMUTADOR EN MEMORIA A NAVEGACIÓN REAL (2026-08-18).
 *
 * Hasta esta entrega los dos controles eran `<button>` que llamaban a
 * `i18n.changeLanguage()`: el idioma cambiaba en memoria y la URL no se movía.
 * Tres críticas seguidas midieron las consecuencias, que son todas la misma
 * causa: el inglés no tenía dirección. No se podía compartir (quien recibía el
 * enlace veía castellano), no se podía marcar, ningún buscador lo veía, y el
 * botón Atrás no deshacía el cambio porque no había ninguna entrada de
 * historial que deshacer.
 *
 * Ahora cada control es un `<a href>` a la MISMA página en el otro idioma. Con
 * eso, las cuatro cosas se arreglan a la vez y ninguna necesita código propio:
 * las da el navegador por el hecho de ser un enlace. Se conserva `next/link`
 * (no un `<a>` pelado) para que el salto entre `/` y `/en` sea una navegación
 * de cliente, sin recarga -- el mismo criterio que ya usa el pie para sus
 * destinos internos.
 *
 * `prefetch={false}` por el MISMO motivo documentado en `Footer.tsx`: bug
 * abierto de Next 16 en export estático (vercel/next.js #85374 y #92341,
 * reproducido en 16.2.11, Task 28) -- el nombre de fichero que pide el
 * prefetch de segmento RSC no coincide con el que genera `output: "export"`,
 * así que el prefetch SIEMPRE devuelve 404. El click navega igual (Next cae al
 * fetch de página completa); lo único que evita esta prop es el ruido de 404.
 *
 * ACCESIBILIDAD, y qué cambia respecto al widget anterior:
 *   - `role="group"` + `aria-label` en el envoltorio se conservan tal cual
 *     (Tarea 1, punto 2 del brief): sin ellos un lector de pantalla anuncia
 *     dos controles sueltos sin decir a qué pertenecen. Reutiliza
 *     `Common.Lang.title`, la misma clave que ya nombra este control en la
 *     hoja móvil (`NavSheet.tsx`) -- ningún string nuevo.
 *   - `aria-pressed` SE RETIRA y lo sustituye `aria-current`. No es un cambio
 *     de gusto: `aria-pressed` pertenece al rol `button` (estado
 *     activado/desactivado de un conmutador) y no está permitido en un enlace;
 *     el estado correcto para "de este conjunto de enlaces, éste es el de la
 *     página en la que estás" es `aria-current`.
 *   - `hrefLang` declara el idioma del DESTINO y `lang` el del propio texto
 *     del enlace ("Español" / "English", cada uno escrito en su idioma): sin
 *     el segundo, un lector de pantalla en castellano pronuncia "English" con
 *     fonética española.
 *
 * `usePathname()` y no una prop: este componente se monta desde `Navbar`,
 * `NavSheet` y `LegalHeader`, y ninguno de los tres sabe en qué ruta está --
 * habría que enhebrar la misma prop por los tres. `resolveRoute` casa la ruta
 * de forma EXACTA contra las seis conocidas, así que el `href` que se hornea
 * en el prerenderizado y el que calcula el navegador coinciden siempre,
 * incluida la 404 (ver el docblock de `resolveRoute`).
 */
export function LanguageSelector(): ReactElement {
  const { t, i18n } = useTranslation("common");
  const pathname = usePathname();
  const { themeName } = useTheme();

  /* La otra mitad del punto de lectura: esta es la que lo CONSUME al llegar.
     Vive aquí y no en un hook propio junto a `useFragmentLanding` porque el
     fichero que promete el destino es el que tiene que cumplirlo -- y porque
     este componente es el único que se monta en las dos puntas del viaje. */
  useReadingOffsetLanding(themeName);

  /* Una ruta no reconocida (la URL rota que sirve la 404) no pertenece a
     ninguna página del sitio: desde ahí, el selector lleva a la portada del
     idioma elegido, que es el único destino que existe con seguridad. */
  const current = resolveRoute(pathname ?? "");
  const routeKey = current?.key ?? "home";

  /* La MISMA fuente de verdad que ya decide `aria-current="location"` en la
     barra y en la hoja móvil (`Navbar.tsx`/`NavSheet.tsx`): lo que la
     navegación anuncia como "estás aquí" es exactamente lo que el cambio de
     idioma conserva, sin un segundo criterio que pueda divergir del primero.
     Es además un singleton de módulo, así que las dos o tres copias montadas
     de este componente (barra, hoja móvil, cabecera legal) no duplican ni un
     listener. Fuera de la home no hay ninguna de esas secciones en el DOM y
     devuelve `null` por su propio contrato: en las legales y en la 404 el
     `href` queda byte a byte como estaba. */
  const readingSection = useActiveSectionKey();

  return (
    <ScLanguageSelector
      role="group"
      aria-label={t("Common.Lang.title")}
    >
      {LANGUAGES.map((lng: Locale) => {
        const active = i18n.language === lng;
        const path = routePath(routeKey, lng);
        return (
          <ScLanguageButton
            key={lng}
            href={languageHref(path, active ? null : readingSection)}
            onClick={(event) => {
              if (active) return;
              handleLanguageClick(event, path, readingSection);
            }}
            prefetch={false}
            hrefLang={lng}
            lang={lng}
            $active={active}
            aria-current={active ? "true" : undefined}
            title={t(`Common.Lang.${lng}.title`)}
          >
            {t(`language.${lng}`)}
          </ScLanguageButton>
        );
      })}
    </ScLanguageSelector>
  );
}
