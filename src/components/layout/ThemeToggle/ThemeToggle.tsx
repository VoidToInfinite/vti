"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
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
// Common.ThemeToggle.switchToDark/switchToLight, sin cambio de texto).
//
// D6 (2026-08-04): `onClick` ya NO llama a `toggleTheme` directo -- pasa por
// `useThemeScrollReset`, que decide si hay que volver arriba antes de
// cambiar el tema (ver el hook para el porqué completo). `themeName` sigue
// saliendo de `useTheme()` tal cual: el icono/etiqueta muestran el tema
// ACTIVO en todo momento, incluso mientras el viaje de scroll esta en
// curso -- no hay un tema "intermedio" que representar.
//
// A PROPOSITO no se pasa `disabled={pending}` (revision 2026-08-04): un
// <button> nativo que pasa a disabled deja de ser enfocable y el navegador
// le arrebata el foco (lo manda a <body>). Un usuario de teclado que activa
// el toggle con Enter/Espacio desde el pie de la pagina perderia el foco
// hasta 1200ms, y al reactivarse el boton el foco YA NO esta ahi -- tendria
// que volver a tabular desde el principio del documento. Un lector de
// pantalla, ademas, anuncia "deshabilitado" justo tras la pulsacion, que se
// lee como "tu accion ha fallado", no como "tu accion esta en marcha". La
// reentrada NO depende de este atributo: `useThemeScrollReset` ya la
// bloquea con un guard sincrono por ref (`pendingRef`, ver el hook), que
// actua incluso en el mismo tick, antes de que React repinte -- mas fuerte
// que cualquier `disabled`.
//
// Task 5 (plan premium F1-F5): en su lugar se pasa `aria-busy={busy}` --
// `busy` (`useThemeScrollReset`) cubre el viaje COMPLETO (scroll + cruce de
// composiciones del hero, ver el docblock del hook), no solo el tramo de
// scroll que ya cubria `pending`. Es la senal para quien NO ve la pagina
// desplazarse ante sus ojos (un lector de pantalla): "esta accion sigue en
// marcha", sin tocar la focusabilidad. Se pasa como atributo nativo, NO como
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
export function ThemeToggle(): ReactElement {
  const { t } = useTranslation("common");
  const { themeName } = useTheme();
  const { requestThemeChange, busy } = useThemeScrollReset();
  const isLight = themeName === "light";
  const label = isLight
    ? t("Common.ThemeToggle.switchToDark")
    : t("Common.ThemeToggle.switchToLight");

  return (
    <IconButton
      icon={isLight ? <IconSun /> : <IconMoon />}
      onClick={requestThemeChange}
      aria-label={label}
      aria-busy={busy || undefined}
      title={label}
    />
  );
}
