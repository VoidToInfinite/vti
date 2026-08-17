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
 * Color de la barra del navegador por tema. Los dos hex son EXACTAMENTE los
 * que `app/opengraph-image.tsx` ya documenta y usa para estos MISMOS
 * primitivos (conversión oklch → OKLab → sRGB lineal → sRGB con gamma, con las
 * matrices de `src/theme/tokens/contrast.ts`), no un hex elegido a ojo:
 * claro = `semanticLight.bg` (`color.neutral[50]`), oscuro = `semanticDark.bg`
 * (`color.secondary[1100]`).
 *
 * POR QUÉ VIVEN AQUÍ Y NO EN `layout.tsx`, donde estaban: hasta el 2026-08-16
 * el `theme-color` se declaraba con DOS entradas, una por
 * `prefers-color-scheme`. Eso ata el color de la barra al SISTEMA OPERATIVO,
 * mientras que el tema de este sitio lo decide el CONMUTADOR (`localStorage`
 * gana a `prefers`, decisión D-C). Quien tenga el sistema en claro y pulse el
 * conmutador a oscuro veía la barra del navegador en `#FAFAFA` sobre una
 * página casi negra — el navegador no tenía forma de enterarse.
 *
 * Ahora hay UNA sola entrada sin `media` (la clara, que es la del HTML
 * estático y por tanto la correcta sin JavaScript) y son el script de arranque
 * —antes del primer pintado— y `ThemeProvider` —en cada cambio— quienes la
 * ponen al día. Los tres consumidores leen de aquí para que no puedan
 * divergir.
 */
export const THEME_COLORS: Readonly<Record<ThemeName, string>> = {
  light: "#FAFAFA",
  dark: "#280739",
};

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
 * Lee el tema que el script de arranque ya dejó escrito en `<html>` ANTES del
 * primer pintado. Devuelve `null` si el atributo no está o trae basura — lo
 * que ocurre exactamente en un caso: que el script de arranque haya lanzado
 * (almacenamiento bloqueado en modo privado estricto) y su `try/catch` lo haya
 * absorbido.
 *
 * POR QUÉ EXISTE, teniendo `useTheme()` a mano. Hay una ventana —desde el
 * montaje hasta que el efecto de corrección de `ThemeProvider` se ejecuta— en
 * la que `themeName` vale `"light"` para TODO EL MUNDO, incluido el visitante
 * oscuro: el proveedor no puede leer `localStorage` durante el render sin
 * romper el export estático. Quien tenga que decidir en esa ventana **qué
 * bytes pedir** (no cómo pintar) no puede fiarse de `themeName`: pediría el
 * arte equivocado y lo descartaría un instante después, que es precisamente el
 * defecto que esta función existe para cerrar. El atributo, en cambio, ya está
 * resuelto: lo escribió el script inline del `<head>`.
 *
 * Es una lectura del DOM, así que solo tiene sentido en cliente. Los efectos
 * la llaman después de montar; nunca durante el render de servidor.
 */
export function readResolvedTheme(): ThemeName | null {
  const value = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return value === "light" || value === "dark" ? value : null;
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
 * ## `heroPreloads`: por qué el arte del hero se precarga desde aquí
 *
 * Bajo `output: "export"` hay UN solo HTML y el tema lo decide `localStorage`
 * (decisión D-C), así que el build no puede saber qué arte tocará. Este script
 * ya corre en `<head>`, antes del primer pintado, y ya conoce el tema
 * resuelto: es el ÚNICO punto del sitio donde esa información existe antes de
 * hidratar.
 *
 * ### Primera mitad (2026-08-16, Ola A.1): la precarga del arte oscuro
 *
 * Hasta entonces React renderizaba el primer paso con `themeName` en
 * `"light"` —`ThemeProvider` no puede leer `localStorage` durante el render— y
 * su Float hoisteaba al `<head>` las cuatro precargas del aura, la primera con
 * `fetchpriority="high"`. El visitante oscuro no tenía su arte en el HTML.
 * Medido contra el build de producción con estrangulamiento (4× CPU,
 * ~1,6 Mbps, 150 ms de latencia, contexto nuevo por corrida, 3 corridas por
 * tema):
 *
 *   claro   LCP 1.524 / 1.568 / 1.608 ms   elemento: texto
 *   oscuro  LCP 8.384 / 8.384 / 9.088 ms   elemento: capas del ojo
 *
 * Inyectar aquí los `<link rel="preload">` del arte oscuro puso sus peticiones
 * en marcha a la altura del `<head>` en vez de después de hidratar: LCP oscuro
 * 10.388 → 2.108 ms, con el elemento LCP pasando de una capa del ojo a texto.
 *
 * ### Segunda mitad (2026-08-17): la simetría, y por qué el parámetro cambió
 *
 * Aquel arreglo era ADITIVO y dejaba escrito lo que le faltaba: el visitante
 * oscuro seguía descargando **309.276 B medidos** de arte claro que no vería
 * nunca (el 13,1 % de su carga, verificado con `performance
 * .getEntriesByType("resource")`: en oscuro llegaban las 4 de aura Y las 5 del
 * ojo). Cerrarlo exigía que el HTML dejara de emitir los `<img>` del aura —
 * hecho ya, ver el docblock de `HeroBackdrop.tsx` — y en cuanto el HTML no los
 * emite, el Float de React deja de hoistear la precarga clara por su cuenta.
 *
 * De ahí que el parámetro ya no sea "las precargas del tema oscuro" sino **un
 * registro por tema**: las dos ramas se sirven ahora por la misma vía, y la
 * rama clara no puede quedarse sin precarga por descuido — pasarla es la única
 * forma de que exista. El `<head>` de un visitante claro sigue arrancando
 * exactamente las mismas cuatro peticiones que antes; lo que cambia es quién
 * las declara.
 */
export function buildThemeBootstrapScript(
  heroPreloads: Readonly<
    Partial<Record<ThemeName, readonly HeroPreload[]>>
  > = {},
): string {
  const storageKeyLiteral = JSON.stringify(STORAGE_KEYS.theme);
  const attrLiteral = JSON.stringify(THEME_ATTRIBUTE);
  const preloadsLiteral = JSON.stringify(heroPreloads);
  return (
    `(function(){try{` +
    `var resolveInitialTheme=${resolveInitialTheme.toString()};` +
    `var stored=null;` +
    `try{stored=window.localStorage.getItem(${storageKeyLiteral});}catch(e){}` +
    `var prefersDark=false;` +
    `try{prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;}catch(e){}` +
    `var theme=resolveInitialTheme(stored,prefersDark);` +
    `document.documentElement.setAttribute(${attrLiteral},theme);` +
    // theme-color al día ANTES del primer pintado, en su propio try/catch: la
    // barra del navegador tiene que seguir al conmutador, no al sistema
    // operativo (ver el docblock de THEME_COLORS). El <meta> ya existe en el
    // <head> y aparece ANTES que este script (verificado en el HTML
    // construido), así que aquí siempre se encuentra.
    `try{var mc=document.querySelectorAll('meta[name="theme-color"]');` +
    `var tc=${JSON.stringify(THEME_COLORS)}[theme];` +
    `for(var j=0;j<mc.length;j++){mc[j].setAttribute("content",tc);}}catch(e){}` +
    // Precarga del arte del tema resuelto: su propio try/catch, separado del
    // de arriba. Fijar `data-theme` es lo que impide el flash y no puede
    // quedar a merced de que `createElement`/`appendChild` fallen en un
    // navegador raro. El `||[]` cubre el caso de un tema sin entrada en el
    // registro: no inyecta nada, en vez de reventar sobre `undefined.length`.
    `try{var pl=${preloadsLiteral};var p=pl[theme]||[];` +
    `for(var i=0;i<p.length;i++){` +
    `var l=document.createElement("link");` +
    `l.rel="preload";l.as="image";` +
    `l.setAttribute("imagesrcset",p[i].srcSet);` +
    `l.setAttribute("imagesizes",p[i].sizes);` +
    `if(i===0){l.setAttribute("fetchpriority","high");}` +
    `document.head.appendChild(l);` +
    // DOS llaves, no tres: la del cuerpo del `for` y la del `try` de esta
    // precarga. La tercera existia mientras el bloque llevaba dentro un
    // `if(theme==="dark")`; al pasar a un registro por tema ese `if`
    // desaparecio y la llave sobrante dejaba el script sin parsear entero
    // ("SyntaxError: Missing catch or finally after try"). Lo unico que
    // delata un error asi es EJECUTAR el string, que es lo que hace
    // `resolveTheme.test.ts`: ningun typecheck ni lint mira dentro de una
    // plantilla de texto.
    `}}catch(e){}` +
    `}catch(e){}})();`
  );
}
