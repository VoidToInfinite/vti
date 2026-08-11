import { STORAGE_KEYS } from "@/config/storage";
import type { ThemeName } from "./themes";

/**
 * Atributo que el script de arranque (`buildThemeBootstrapScript`, más abajo)
 * fija en `document.documentElement` ANTES del primer pintado, con el tema ya
 * resuelto. `GlobalStyles.tsx` lo usa como selector (`:root[data-theme="dark"]`)
 * para adelantar, en CSS puro, los valores que de otro modo solo llegarían
 * tras el efecto de corrección de `ThemeProvider` — ver el docblock de esa
 * sección en `GlobalStyles.tsx` para el porqué completo (Task 9).
 */
export const THEME_ATTRIBUTE = "data-theme";

/**
 * Lógica de resolución de tema — decisión D-C (vinculante, dueño del
 * producto): `localStorage` gana a `prefers-color-scheme`; sin storage,
 * decide el sistema. Es la ÚNICA fuente de esta regla en el repo: la
 * consumen DOS sitios que, copiados a mano por separado, divergirían al
 * primer retoque (lección de la casa) —
 *
 *   1. el script inline de `app/layout.tsx` (`buildThemeBootstrapScript`,
 *      más abajo), que la ejecuta ANTES del primer pintado, sobre el
 *      `localStorage`/`matchMedia` reales del navegador visitante;
 *   2. el efecto de corrección de `ThemeProvider.tsx`, que la reutiliza
 *      DESPUÉS de montar, con la misma firma exacta.
 *
 * Función PURA, sin clausura sobre nada externo (ni imports, ni módulo): así
 * `resolveInitialTheme.toString()` es código ejecutable por sí mismo, sin
 * arrastrar nada que un `<script>` no pueda resolver. Cualquier cambio a esta
 * firma (nombres de parámetro incluidos) tiene que mantenerla así.
 */
export function resolveInitialTheme(
  storedValue: string | null,
  prefersDark: boolean,
): ThemeName {
  if (storedValue === "light" || storedValue === "dark") return storedValue;
  return prefersDark ? "dark" : "light";
}

/**
 * Construye el texto del script de arranque anti-flash (Task 9, brief punto
 * 1): lee `localStorage`/`prefers-color-scheme` reales del navegador y fija
 * `data-theme` en `<html>` ANTES de que el navegador pinte el primer frame.
 * `app/layout.tsx` lo inyecta como un `<script>` LITERAL dentro de un
 * `<head>` explícito (Task 31; `next/script strategy="beforeInteractive"`
 * se retiró por correr como chunk asíncrono bajo `output: "export"`, tarde
 * para el `<h1>` visible desde Task 10) — el porqué completo vive en el
 * docblock del propio elemento en `layout.tsx`, no se duplica aquí.
 *
 * Reutiliza `resolveInitialTheme.toString()` en vez de retranscribir la
 * lógica a mano dentro del template: así el CUERPO ejecutado por el
 * navegador es LITERALMENTE el mismo código que corre `ThemeProvider`, no una
 * copia que alguien pueda desincronizar en un futuro retoque. El candado
 * (`resolveTheme.test.ts`) verifica que el string devuelto CONTIENE el cuerpo
 * serializado de la función, no un texto reescrito por su cuenta.
 *
 * Envuelto en `try/catch`: `localStorage`/`matchMedia` pueden lanzar en
 * navegadores con almacenamiento bloqueado (modo privado estricto) — un
 * fallo aquí no puede tumbar el primer pintado de toda la página. Sin tema
 * resuelto, `data-theme` sencillamente no se fija y el HTML estático (tema
 * claro, el que hornea el build) se queda tal cual — el mismo resultado que
 * esta tarea tenía ANTES de existir este script.
 */
export function buildThemeBootstrapScript(): string {
  const storageKeyLiteral = JSON.stringify(STORAGE_KEYS.theme);
  const attrLiteral = JSON.stringify(THEME_ATTRIBUTE);
  return (
    `(function(){try{` +
    `var resolveInitialTheme=${resolveInitialTheme.toString()};` +
    `var stored=null;` +
    `try{stored=window.localStorage.getItem(${storageKeyLiteral});}catch(e){}` +
    `var prefersDark=false;` +
    `try{prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){}` +
    `var theme=resolveInitialTheme(stored,prefersDark);` +
    `document.documentElement.setAttribute(${attrLiteral},theme);` +
    `}catch(e){}})();`
  );
}
