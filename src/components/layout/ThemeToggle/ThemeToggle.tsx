"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
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

export function ThemeToggle(): ReactElement {
  const { t } = useTranslation("common");
  const { themeName } = useTheme();
  const { requestThemeChange, busy } = useThemeScrollReset();
  const isLight = themeName === "light";
  const label = isLight
    ? t("Common.ThemeToggle.switchToDark")
    : t("Common.ThemeToggle.switchToLight");

  return (
    <ScThemeToggleSlot data-theme-toggle>
      <IconButton
        icon={isLight ? <IconSun /> : <IconMoon />}
        onClick={requestThemeChange}
        aria-label={label}
        aria-busy={busy || undefined}
        title={label}
      />
    </ScThemeToggleSlot>
  );
}
