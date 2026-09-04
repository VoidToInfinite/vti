"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { NAVBAR_LABEL_QUERY } from "@/components/layout/Navbar/navbarContainer";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { useThemeScrollReset } from "@/hooks/useThemeScrollReset";
import { useTheme } from "@/theme/ThemeProvider";
import { IconMoon, IconSun } from "./ThemeIcons";

// Migrado a IconButton (área táctil 44px, hover-lift, prefers-reduced-motion
// y disabled/aria-disabled se heredan de Button vía IconButton, no se
// reescriben aquí — ver IconButton.tsx).
//
// CAMBIO DE CONVENCIÓN (2026-07-26): hasta hoy el icono mostraba el tema
// DESTINO (luna estando en claro). A partir de ahora muestra el tema ACTIVO
// (sol en claro, luna en oscuro) — lectura directa sin traducción mental,
// icono = lo que ves ahora, no lo que vas a activar. El aria-label/title
// siguen describiendo la ACCIÓN (mismas claves i18n
// Common.ThemeToggle.switchToDark/switchToLight).
//
// LA ETIQUETA DECLARA LAS DOS COSAS (crítica externa #9, punto 5, evaluador
// Nielsen H6). El hallazgo: el icono anunciaba el tema ACTUAL y la etiqueta
// la acción CONTRARIA, así que quien percibía los dos canales a la vez -- un
// sol y un texto que dice "oscuro" -- recibía dos mensajes que se
// contradicen, sin nada que dijera cuál de los dos describe el estado y cuál
// la consecuencia de pulsar. La convención del icono NO se revierte: es una
// decisión declarada de 2026-07-26, con su motivo escrito, y una crítica que
// señala una AMBIGÜEDAD no es una medición que tumbe la decisión que la
// causó. Lo que se corrige es la mitad que sí puede desambiguar sin perder
// nada: el VALOR de las dos claves pasa de la acción sola ("Cambiar a tema
// oscuro") a estado + acción ("Tema claro activo: cambiar a tema oscuro").
// Ahora el icono ilustra la primera mitad de su propia etiqueta en vez de
// contradecir la segunda, y quien solo oye el nombre accesible se entera
// además de en qué tema está -- un dato que este control no daba por ningún
// canal a quien no ve la pantalla.
//
// Sin claves nuevas y sin componer frases por concatenación: cada idioma
// escribe su oración entera en su propio JSON (una concatenación
// "estado" + ": " + "acción" impondría el orden y la puntuación del español
// a todos los idiomas futuros). El nombre de las claves sigue siendo el de la
// ACCIÓN, que es lo que el control hace.
//
// LA ETIQUETA ANUNCIA LO QUE EL CONTROL HACE DE VERDAD (decisión del dueño,
// 2026-09-04, tras tres rondas de crítica externa penalizando este punto en
// Nielsen H4 «consistencia y estándares»). El hallazgo: este botón se
// presentaba como una preferencia de visualización -- «Tema claro activo:
// cambiar a tema oscuro» -- y lo que hace es CAMBIAR EL DOCUMENTO. Medido en
// Chrome real sobre el build de producción a 1440x900, castellano: el alto de
// la página pasa de 6.432 px en claro a 10.976 px en oscuro (+71 %), Story
// pasa de rejilla de tarjetas a deck de diapositivas, Journey de recorrido a
// deck, y la composición se espeja (en claro el arte va a un lado y la copia
// al otro; en oscuro al revés). Un control que promete color y entrega otra
// página incumple la expectativa que él mismo crea.
//
// LA FORMA ELEGIDA es «nombre accesible + rótulo», no un texto de apoyo
// aparte, y el motivo es que este control ya tenía media solución escrita: su
// nombre accesible es una oración de dos mitades (estado, luego acción) desde
// la crítica #9, así que la consecuencia cabe como tercera mitad de la MISMA
// oración -- «..., que recompone la página entera con las secciones en
// diapositivas y un recorrido más largo» -- sin añadir ni una clave, ni una frase
// compuesta por concatenación, ni un párrafo de advertencia en una fila de
// 56 px de alto. Esa oración llega por TRES canales a la vez y no solo al
// lector de pantalla: es el `aria-label`, es el `title` (el globo que ve
// cualquiera que pase el cursor) y su primera mitad es el rótulo visible que
// estrena esta misma entrega (`ScThemeToggleLabel`, más abajo).
//
// EL TONO ES DE CARACTERÍSTICA, NO DE AVISO, y es parte de la decisión: se
// describe lo que se gana («otra composición», «en diapositivas»), no se
// advierte de un peligro. No hay nada que temer -- el cambio es reversible con
// el mismo botón, y `useThemeScrollReset` ya devuelve al lector a la sección
// que estaba leyendo (ver su docblock).
//
// D6 (2026-08-04): `onClick` ya NO llama a `toggleTheme` directo -- pasa por
// `useThemeScrollReset`. HISTORIA: hasta Task 17 (plan premium F1-F5,
// 2026-08-11) ese hook decidia si habia que volver arriba (viaje de scroll)
// antes de cambiar el tema; Task 17 retiro ese viaje por completo (una
// auditoria independiente midio que era el propio viaje el que tiraba la
// posicion de lectura -- ver el docblock de cabecera de useThemeScrollReset.ts
// para el porque completo). Hoy el tema cambia SIEMPRE en el mismo tick del
// click; el scroll solo se toca DESPUES, y de forma instantanea, para
// devolver al lector a la seccion que estaba leyendo -- el documento cambia
// de alto x2,20 entre temas y mantener el scrollY absoluto lo dejaba en otra
// seccion (enmienda 2026-08-17, ver el docblock de useThemeScrollReset.ts).
// `themeName` sigue saliendo de `useTheme()` tal cual: el icono/etiqueta
// muestran el tema ACTIVO en todo momento.
//
// A PROPOSITO no se pasa `disabled` (revision 2026-08-04): un <button>
// nativo que pasa a disabled deja de ser enfocable y el navegador le
// arrebata el foco (lo manda a <body>). Un usuario de teclado que activa el
// toggle con Enter/Espacio perderia el foco mientras dure el cruce de
// composiciones del hero (hasta HERO_COPY_RETURN_MS), y al reactivarse el
// boton el foco YA NO esta ahi -- tendria que volver a tabular desde el
// principio del documento. Un lector de pantalla, ademas, anuncia
// "deshabilitado" justo tras la pulsacion, que se lee como "tu accion ha
// fallado", no como "tu accion esta en marcha".
//
// Task 5 (plan premium F1-F5): en su lugar se pasa `aria-busy={busy}` --
// `busy` (`useThemeScrollReset`) cubre el cruce de composiciones del hero
// (ver el docblock del hook) cuando va a ocurrir uno. Es la senal para quien
// NO ve nada moverse ante sus ojos (un lector de pantalla): "esta accion
// sigue en marcha", sin tocar la focusabilidad. Se pasa como atributo nativo, NO como
// la prop `loading` de Button (que Button.tsx acopla a `disabled` a
// proposito para su propio caso de uso -- formularios que quieren bloquear
// el reenvio, ver Button.test.tsx "en loading marca aria-busy y
// deshabilita") -- reutilizar `loading` aqui reintroduciria exactamente el
// bug de foco de la lección de arriba. `aria-busy` es un atributo ARIA
// estandar que `IconButton`/`Button` reenvian sin mas via `{...rest}`
// (Button.tsx spread `{...rest}` DESPUES de su propio `aria-busy={loading ||
// undefined}`, asi que el valor de aqui gana); el indicador visual minimo lo
// declara IconButton.tsx a partir de ese mismo atributo, no de una prop
// nueva, para que CSS y ARIA no puedan divergir. `aria-busy={busy ||
// undefined}` (no `busy` a secas) omite el atributo por completo cuando NO
// esta ocupado, en vez de dejar `aria-busy="false"` -- mismo patron que
// Button.tsx usa para `loading`.
/**
 * Hueco del conmutador, y SU SALIDA SIN JAVASCRIPT (crítica externa #10,
 * hallazgo A, P1).
 *
 * El hallazgo, medido con `javaScriptEnabled: false` real -- deshabilitación
 * del motor, no bloqueo de los `*.js` --: este botón se pinta visible y con
 * aspecto activo mientras `data-theme` ni siquiera existe en el `<html>` y
 * ningún manejador puede correr. `requestThemeChange` es JavaScript de cabo a
 * rabo (`useThemeScrollReset` -> `toggleTheme` del `ThemeProvider`), así que
 * pulsar no hacía nada y nada lo explicaba. Sin JavaScript el sitio se sirve
 * SIEMPRE en la composición clara (el HTML horneado monta el stack claro, ver
 * el docblock del guard de `eyeStagger` en `eye.parts.tsx`): no hay ningún
 * segundo tema al que se pueda llegar, ni por enlace ni por ruta.
 *
 * Por eso se OCULTA en vez de avisar: un `<noscript>` como el del formulario
 * de contacto (`ScNoscriptNote`, `Contact.tsx`) existe allí porque hay una
 * salida real que ofrecer -- la dirección de correo --; aquí no hay ninguna.
 * Un botón que no puede hacer su única acción es peor que su ausencia, y la
 * página completa sigue siendo legible en claro sin él.
 *
 * ENVOLTORIO PROPIO, no `styled(IconButton)`, y no es preferencia de estilo:
 * es el precedente literal de `ScSheetTriggerSlot` (`NavSheet.tsx`), que
 * resuelve este mismo problema para el disparador de la hoja. Conmutar el
 * `display` desde una capa `styled(IconButton)` dependería del orden de
 * inyección de tres clases encadenadas (ScButton -> ScSquare -> la capa
 * nueva), y `ScButton` declara `display: inline-flex` con la misma
 * especificidad. Un envoltorio con su propio `display` no depende de ninguna
 * cascada ajena: si no genera caja, el botón no existe, sea cual sea el CSS
 * del botón.
 *
 * CON JavaScript no cambia NADA: `inline-flex` sin más declaraciones, dentro
 * de un `ScActions` que ya es flex -- misma caja que ocupaba el botón por sí
 * solo, mismo foco y mismo orden de tabulación (un `<span>` sin `tabindex` no
 * entra en la secuencia). `@media (scripting: none)` es el mecanismo ya
 * sancionado en el repo para este caso (`GlobalStyles.tsx` con
 * `[data-revealed]`, `auraStagger`/`eyeStagger`); un navegador sin soporte del
 * feature ignora el bloque entero y se queda con el comportamiento de siempre.
 *
 * El gancho de test (`data-theme-toggle`) va en el envoltorio y no en el
 * `IconButton` por el mismo motivo que documenta `NavSheetTrigger`: un `data-*`
 * sobre un COMPONENTE tendría que declararse en la interfaz de props de un
 * primitivo compartido de `ui/`; sobre un elemento del DOM no hace falta nada.
 */
const ScThemeToggleSlot = styled.span`
  display: inline-flex;

  /* Sin JavaScript no hay tema que conmutar: ver el docblock de arriba. */
  @media (scripting: none) {
    display: none;
  }
`;

/**
 * EL CONMUTADOR DEJA DE SER SOLO UN ICONO EN PANTALLAS ANCHAS (crítica externa
 * #18, hallazgo O-3).
 *
 * EL HALLAZGO: este control era 44x44 de icono puro -- con su `aria-label`
 * correcto, pero sin una sola palabra en pantalla -- mientras su vecino de la
 * misma fila, el selector de idioma, lleva sus dos rótulos escritos («ES»,
 * «EN»). Un icono solo obliga a adivinar o a pasar el cursor por encima, y el
 * gesto de pasar el cursor no existe en táctil ni para quien navega con
 * teclado.
 *
 * DESDE 75em (1200 px con la raíz por defecto, o sea `xl`) Y NO ANTES, y la
 * cifra sale de medir, no de elegir: la
 * fila tiene 446 px de holgura total a partir de 1200 px (donde el contenido
 * topa en `containerMax` y deja de crecer), 238 px a 992 px y 32 px a 768 px
 * -- y en la misma entrega la barra gasta 156 px de esa holgura en el quinto
 * destino de sección desde 992 px (ver `navigation.ts`). El rótulo pide unos
 * 80 px más: a 1200 px sobran de largo, a 992 px se comerían casi todo lo que
 * queda tras el quinto enlace, y a 768 px la marca ya se recorta hoy. Por eso
 * los dos umbrales son distintos -- `lg` para el destino, `xl` para el rótulo
 * --: cada uno entra donde su propia medición dice que cabe.
 *
 * Y LA CONSULTA ES DE CONTENEDOR (`@container`), NO DE VENTANA (`@media`): la
 * segunda variable de esta cuenta es el tamaño de fuente, y una consulta de
 * contenedor sí lo tiene en cuenta -- con la raíz del documento al 200 % este
 * rótulo se retira solo, porque a ese tamaño la fila no tiene sitio para él a
 * ningún ancho hasta 1440 px (medido; la tabla y el porqué del mecanismo
 * viven en `Navbar/navbarContainer.ts`, que declara el nombre y los dos
 * umbrales para que la barra y este componente no puedan divergir).
 *
 * `styled(IconButton)` Y `&&`, no una capa suelta: `ScSquare` (`IconButton`)
 * declara `width`, `padding` y `gap` con especificidad de una clase, así que
 * una segunda clase encadenada empataría con ella y el resultado dependería
 * del orden de inyección -- justo lo que el docblock de `ScThemeToggleSlot`
 * (arriba) evita para el `display`. `&&` duplica la clase propia y sube la
 * especificidad a (0,2,0), que gana siempre y sin depender de nada. Componer
 * sobre `IconButton` en vez de re-declarar un botón propio conserva de una
 * pieza TODO lo que ese primitivo ya decide (el suelo táctil de 44px, el
 * `aria-busy` que apaga la opacidad, la forma de botón bajo colores forzados)
 * -- copiarlas aquí sería la clase de duplicación que este repo ya paga en
 * `ScNavTrigger`, el único botón del sitio escrito a mano, que se quedó sin la
 * regla de colores forzados hasta la crítica #16.
 *
 * `box-shadow: none` en el régimen ancho NO es una pérdida: el anillo inset de
 * `IconButton` existe porque «un botón de solo icono en ghost es invisible en
 * reposo» (su propio docblock), y con el rótulo escrito al lado esa premisa ya
 * no se cumple -- la palabra es la afordancia, igual que en los dos enlaces de
 * idioma de al lado, que tampoco llevan anillo.
 */
const ScThemeToggleButton = styled(IconButton)`
  @container ${NAVBAR_LABEL_QUERY} {
    && {
      width: auto;
      padding-inline: ${({ theme }) => theme.data.space[3]};
      gap: ${({ theme }) => theme.data.space[2]};
      box-shadow: none;
    }
  }
`;

/**
 * El rótulo visible, que es la PRIMERA MITAD LITERAL del nombre accesible.
 *
 * No es una coincidencia ni un adorno: `Common.ThemeToggle.switchTo*` empieza
 * por el estado («Tema claro activo: ...») desde la crítica #9, y este rótulo
 * es exactamente ese estado (`Common.ThemeToggle.stateLight`/`stateDark`). Así
 * el texto que se lee en pantalla está contenido en el nombre que anuncia un
 * lector de pantalla -- WCAG 2.5.3, Label in Name, que un rótulo con otras
 * palabras habría roto -- y, sobre todo, el rótulo dice lo MISMO que el icono:
 * los dos nombran el tema ACTIVO, que es la convención declarada de este
 * control desde 2026-07-26. Un rótulo con el tema DESTINO habría reabierto la
 * contradicción entre canales que la crítica #9 cerró.
 *
 * `display: none` en la regla base y encendido con `min-width`, mobile-first:
 * bajo `xl` el botón vuelve a ser el cuadrado de 44px de siempre, y el rótulo
 * no ocupa ni una caja. El texto sigue en el DOM en los dos regímenes -- no
 * hay dos árboles distintos entre el HTML horneado y el cliente, que bajo
 * `output: "export"` es la única forma segura de resolver un cambio por ancho.
 *
 * Cuerpo y peso propios (`bodySm`/500) y no los del botón: `Button` pinta sus
 * rótulos a `body`/600 -- el peso de una llamada a la acción -- y `ScSquare`
 * además sube el `font-size` a 20px para dimensionar el glifo, que es lo que
 * este `span` heredaría sin declarar nada. Los valores son los de
 * `ScNavLink`/`ScNavTrigger`, los vecinos de esta misma fila.
 */
const ScThemeToggleLabel = styled.span`
  display: none;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 500;

  @container ${NAVBAR_LABEL_QUERY} {
    display: inline;
  }
`;

export function ThemeToggle(): ReactElement {
  const { t } = useTranslation("common");
  const { themeName } = useTheme();
  const { requestThemeChange, busy } = useThemeScrollReset();
  const isLight = themeName === "light";
  const label = isLight
    ? t("Common.ThemeToggle.switchToDark")
    : t("Common.ThemeToggle.switchToLight");
  const state = isLight
    ? t("Common.ThemeToggle.stateLight")
    : t("Common.ThemeToggle.stateDark");

  return (
    <ScThemeToggleSlot data-theme-toggle>
      <ScThemeToggleButton
        /* `icon` es el hueco de CONTENIDO del botón (`IconButton` lo pinta
           como sus children, sin envolverlo en nada), y aquí recibe el glifo
           MÁS su rótulo. El nombre de la prop se queda corto desde esta
           entrega: describe lo único que se le pasaba hasta hoy, no lo que
           acepta. Retiparla (`content`, o una prop `label` propia) es trabajo
           dentro de `src/components/ui/IconButton`, que esta entrega no toca;
           queda anotado como pendiente. Pasar el rótulo por aquí y no como un
           `<span>` hermano del botón es lo que lo hace parte del control: un
           texto fuera del `<button>` no sería zona de clic ni contaría como
           su etiqueta visible para WCAG 2.5.3. */
        icon={
          <>
            {isLight ? <IconSun /> : <IconMoon />}
            <ScThemeToggleLabel data-theme-toggle-label>
              {state}
            </ScThemeToggleLabel>
          </>
        }
        onClick={requestThemeChange}
        aria-label={label}
        aria-busy={busy || undefined}
        title={label}
      />
    </ScThemeToggleSlot>
  );
}
