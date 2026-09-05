"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { type DefaultTheme } from "styled-components";
import { LOCALES, resolveRoute, routePath, type Locale } from "@/config/site";
import { useActiveSectionKey } from "@/hooks/useActiveSection";
import { PRESS } from "@/motion/vocabulary";

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
 */
export function languageAccent(theme: DefaultTheme): string {
  return theme.data.isLight
    ? theme.data.semantic.brandText
    : theme.data.semantic.brand;
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

     Por que aqui y no en el token: textSubtle es global. Por que solo en
     claro: en oscuro la misma pieza mide 10,5 y no necesita nada.

     La Task 33 midio este mismo control en 4,909, y no se contradice con el
     4,27: aquella cifra era contra el CRISTAL del navbar, esta es contra el
     arte del hero. Son dos fondos distintos para el mismo texto, y el peor
     manda.

     La jerarquia activo/inactivo NO depende de este color: la dan el peso
     (700 contra 400) y el subrayado, los dos declarados justo aqui debajo. */
  color: ${({ theme, $active }) =>
    $active
      ? languageAccent(theme)
      : theme.data.isLight
        ? theme.data.palette.neutral[800]
        : theme.data.semantic.textSubtle};
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
 */
export function languageHref(path: string, sectionId: string | null): string {
  return sectionId === null ? path : `${path}#${sectionId}`;
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
        return (
          <ScLanguageButton
            key={lng}
            href={languageHref(
              routePath(routeKey, lng),
              active ? null : readingSection,
            )}
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
