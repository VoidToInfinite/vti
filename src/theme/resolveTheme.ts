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
 * Una precarga de imagen del arte del hero, con la MISMA firma que emite el
 * `<img>` que después la consume. Las dos claves tienen que coincidir con
 * `srcSet`/`sizes` del componente carácter a carácter: si no coinciden, el
 * navegador no reconoce la precarga como la misma petición y descarga la
 * imagen DOS veces — el arreglo saldría más caro que el defecto.
 */
export interface HeroPreload {
  readonly srcSet: string;
  readonly sizes: string;
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
 *
 * ## `darkHeroPreloads`: por qué el arte oscuro se precarga desde aquí
 *
 * Bajo `output: "export"` hay UN solo HTML y el tema lo decide `localStorage`
 * (decisión D-C), así que el build no puede saber qué arte tocará. React
 * renderiza el primer paso con `themeName` en `"light"` —`ThemeProvider` no
 * puede leer `localStorage` durante el render— y su Float hoistea al `<head>`
 * las cuatro precargas del aura, la primera con `fetchpriority="high"`.
 * Resultado medido contra el build de producción con estrangulamiento (4× CPU,
 * ~1,6 Mbps, 150 ms de latencia, contexto nuevo por corrida, 3 corridas por
 * tema):
 *
 *   claro   LCP 1.524 / 1.568 / 1.608 ms   elemento: texto
 *   oscuro  LCP 8.384 / 8.384 / 9.088 ms   elemento: capas del ojo
 *
 * El visitante oscuro no solo NO tiene su arte en el HTML: además compite
 * contra 309.276 B de arte claro que el propio documento pide con prioridad
 * alta y que no se mostrará nunca (verificado con `performance
 * .getEntriesByType("resource")`: en oscuro se descargan las 4 de aura Y las
 * 5 del ojo).
 *
 * Este script ya corre en `<head>`, antes del primer pintado, y ya conoce el
 * tema resuelto: es el ÚNICO punto del sitio donde esa información existe
 * antes de hidratar. Inyectar desde aquí los `<link rel="preload">` del arte
 * oscuro pone sus peticiones en marcha a la altura del `<head>` en vez de
 * después de hidratar, y con prioridad alta para que ganen la contienda.
 *
 * Es un arreglo ADITIVO a propósito: en claro no inyecta nada y el camino no
 * cambia ni un byte. NO resuelve el desperdicio de los 309.276 B —eso exige
 * que el HTML deje de emitir los `<img>` del aura, con su respaldo
 * `<noscript>` correspondiente, y es un cambio de otro tamaño en
 * `HeroBackdrop`— pero ataca la mitad del problema que no depende de tocar
 * la coreografía del relevo.
 */
export function buildThemeBootstrapScript(
  darkHeroPreloads: readonly HeroPreload[] = [],
): string {
  const storageKeyLiteral = JSON.stringify(STORAGE_KEYS.theme);
  const attrLiteral = JSON.stringify(THEME_ATTRIBUTE);
  const preloadsLiteral = JSON.stringify(darkHeroPreloads);
  return (
    `(function(){try{` +
    `var resolveInitialTheme=${resolveInitialTheme.toString()};` +
    `var stored=null;` +
    `try{stored=window.localStorage.getItem(${storageKeyLiteral});}catch(e){}` +
    `var prefersDark=false;` +
    `try{prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){}` +
    `var theme=resolveInitialTheme(stored,prefersDark);` +
    `document.documentElement.setAttribute(${attrLiteral},theme);` +
    // Precarga del arte oscuro: su propio try/catch, separado del de arriba.
    // Fijar `data-theme` es lo que impide el flash y no puede quedar a merced
    // de que `createElement`/`appendChild` fallen en un navegador raro.
    `try{if(theme==="dark"){` +
    `var p=${preloadsLiteral};` +
    `for(var i=0;i<p.length;i++){` +
    `var l=document.createElement("link");` +
    `l.rel="preload";l.as="image";` +
    `l.setAttribute("imagesrcset",p[i].srcSet);` +
    `l.setAttribute("imagesizes",p[i].sizes);` +
    `if(i===0){l.setAttribute("fetchpriority","high");}` +
    `document.head.appendChild(l);` +
    `}}}catch(e){}` +
    `}catch(e){}})();`
  );
}
