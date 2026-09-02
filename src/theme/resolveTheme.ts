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
 * Entre el 2026-08-16 y el 2026-09-03 quedó UNA sola entrada sin `media`, la
 * clara, declarada como `viewport.themeColor` en `app/layout.tsx`: el HTML
 * estático la horneaba y el script de arranque le reescribía el `content`
 * antes del primer pintado. Ese reparto producía DOS defectos medibles en
 * oscuro, y los dos están cerrados desde el 2026-09-03 (crítica #16, hallazgo
 * P1 del evaluador técnico B1).
 *
 * LA TRAZA QUE LO DEMUESTRA (build de producción servido en :4321, Chrome
 * real, contexto nuevo, `localStorage.vti-theme = "dark"` antes de cargar,
 * sonda que registra cada cambio de (número, contenidos) y la PILA de quien
 * escribe):
 *
 *   t=  24  1 meta  [#280739]            loading    ← el script de arranque
 *   t= 204  2 metas [#280739, #FAFAFA]   complete   ← React inserta una SEGUNDA
 *   t= 214  2 metas [#FAFAFA, #FAFAFA]   complete   ← `ThemeProvider` las pone en CLARO
 *   t= 282  2 metas [#280739, #280739]   complete   ← y las corrige a oscuro
 *
 * DEFECTO 1, la etiqueta duplicada — es de React 19, no de Next. En su
 * commit de elementos «hoistable» (`react-dom-client.development.js`, rama
 * `case "meta"` de `commitMutationEffectsOnFiber`), React busca en el DOM un
 * `<meta>` al que engancharse con una caché INDEXADA POR EL ATRIBUTO
 * `content`: `getHydratableHoistableCache("meta","content",doc).get("meta" +
 * props.content)`, y además exige `getAttribute("content") === props.content`.
 * El script de arranque había cambiado ese `content` de `#FAFAFA` a `#280739`,
 * así que la búsqueda por `meta#FAFAFA` no encontraba nada y React caía en la
 * rama de abajo: `createElement("meta")` + `setInitialProperties` +
 * `head.appendChild`. De ahí la segunda etiqueta, con el valor CLARO. En tema
 * claro el `content` no cambiaba, la búsqueda acertaba y React ADOPTABA la
 * estática: por eso el defecto solo se veía en oscuro (medido: una sola meta
 * en todo momento con el tema claro guardado).
 *
 * DEFECTO 2, la ventana en claro sobre página oscura (t=214→282, 68 ms en
 * producción y 1.472 ms medidos en el servidor de desarrollo) — es NUESTRA: el
 * efecto de `ThemeProvider` escribía `THEME_COLORS[themeName]` en TODAS las
 * etiquetas también en la pasada inicial, cuando `themeName` todavía vale
 * `"light"` para todo el mundo (no puede leer `localStorage` durante el render
 * sin romper el export estático). Es decir, pisaba con el color claro lo que
 * el script de arranque acababa de acertar. La pila de la sonda lo señalaba
 * literalmente: `NodeList.forEach` dentro del chunk que contiene
 * `document.querySelectorAll('meta[name="theme-color"]').forEach(...)`.
 *
 * EL REPARTO DE HOY: `app/layout.tsx` ya NO declara `themeColor` en su
 * `viewport`, así que React no renderiza ninguna etiqueta `theme-color` y no
 * tiene ninguna que duplicar. La CREA el script de arranque (más abajo), antes
 * del primer pintado y ya con el tema resuelto, y `ThemeProvider` se limita a
 * actualizar esa única etiqueta cuando el tema cambia de verdad — nunca en la
 * pasada inicial. Los dos consumidores leen los hex de aquí para que no puedan
 * divergir.
 *
 * COSTE DECLARADO: sin JavaScript no hay `theme-color` en absoluto (antes
 * había la clara, que era la correcta para el HTML estático), así que la barra
 * del navegador se queda en su color por defecto. Se acepta a cambio de que
 * ningún visitante oscuro vea la barra clara: el camino sin JavaScript pinta
 * la página en claro, donde la diferencia es entre el `#FAFAFA` del sitio y el
 * blanco del navegador; el camino con JavaScript era el que enseñaba una barra
 * casi blanca sobre una página casi negra.
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
  /**
   * Tipo MIME de la pista precargada (2026-08-18: "image/avif" en las capas
   * convertidas). Con el, el navegador SOLO ejecuta la precarga si soporta
   * el formato — un navegador sin AVIF la ignora y no descarga de más; el
   * coste declarado es que ese navegador pierde la precarga y cae al WebP
   * del `<img>` a la altura del parse, el camino pre-Ola A.1. Sin `type`
   * (la capa `energy` del aura, que sigue en WebP), la precarga corre en
   * todos los navegadores, como siempre.
   */
  readonly type?: string;
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
 *
 * ### Tercera pasada (2026-08-18, crítica #11): solo donde vive el hero
 *
 * `app/layout.tsx` es el layout RAÍZ, así que este script se emitía —y con él
 * sus precargas— en TODAS las rutas del sitio. El hero, en cambio, solo existe
 * en la home. Medido sobre el HTML servido: en `/privacidad`, **253.833 B** de
 * arte que no pinta nunca (el 41 % de los bytes de esa página) y, en la 404,
 * cuatro avisos de Chrome "was preloaded using link preload but not used
 * within a few seconds".
 *
 * POR QUÉ LA GUARDA VIVE DENTRO DEL SCRIPT y no en quien lo construye: bajo
 * App Router el layout raíz no recibe la ruta (no hay `params` que la
 * identifiquen; se renderiza igual para la home, para las dos legales y para
 * la 404) y bajo `output: "export"` hay UN solo layout compilado para todas.
 * Quien sí conoce la ruta es el NAVEGADOR, en tiempo de ejecución: por eso la
 * condición es `location.pathname` y no una rama de build.
 *
 * NORMALIZACIÓN, deliberadamente mínima y explícita: cuenta como home `"/"` y
 * `"/index.html"`, nada más. Con `trailingSlash: false` (`next.config.ts`) el
 * export escribe la home en `out/index.html` y las legales como
 * `out/privacidad.html` — es decir, las rutas servidas son `/`, `/privacidad`
 * y `/aviso-legal`, sin barra final. Netlify canonicaliza `/index.html` → `/`,
 * pero `npx serve out` (`pnpm start`) y cualquier host de ficheros sin esa
 * canonicalización sirven la home también por su nombre de fichero: aceptar
 * las dos formas cuesta ~20 B y evita que la home pierda su precarga en un
 * entorno de verificación. NO se normaliza con expresión regular a propósito:
 * dentro de esta plantilla de texto un `\/` lo consume el propio literal de
 * TypeScript y el regex llegaría al navegador convertido en un comentario —
 * exactamente la familia de fallo silencioso que documenta `task/lessons.md`
 * (2026-08-17). Un `basePath` haría falsa esta comparación; hoy no hay ninguno
 * declarado en `next.config.ts`, y si algún día lo hay, este es el punto a
 * tocar.
 *
 * LO QUE NO CAMBIA: resolver el tema (`data-theme`) y crear y poner al día la
 * etiqueta `theme-color` siguen ocurriendo en TODAS las rutas — el anti-flash
 * no es de la home, es del sitio, y desde el 2026-09-03 esa etiqueta no existe
 * en ninguna ruta hasta que este script la crea. En la home, el orden de emisión, el
 * `fetchpriority="high"` de la primera y el `type` de las pistas AVIF quedan
 * idénticos.
 *
 * COSTE DECLARADO: una navegación de cliente (`Link`) desde una legal hacia
 * `/` no vuelve a ejecutar este script, así que esa visita pide el arte del
 * hero cuando `Aura`/`Eye` montan su `<picture>`, sin precarga previa — el
 * mismo camino que tenía todo el sitio antes de la Ola A.1, y solo para una
 * navegación que ya ocurre con la página en pie. Y el registro serializado
 * (1.338 B medidos en el HTML construido, que además viaja dos veces: en el
 * `<script>` del `<head>` y en la carga de datos de React) sigue presente en
 * todas las rutas: el texto del script es el mismo para todas y no hay build
 * por ruta que pueda podarlo.
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
    // operativo (ver el docblock de THEME_COLORS).
    //
    // Este script es el ÚNICO DUEÑO de la etiqueta desde el 2026-09-03: la
    // CREA él, porque `app/layout.tsx` ya no declara `themeColor` en su
    // `viewport` y el HTML estático no trae ninguna. Mientras la traía, React
    // 19 no lograba adoptarla al hidratar —su caché de elementos «hoistable»
    // indexa los `<meta>` por el atributo `content`, que este script acababa
    // de cambiar— e insertaba una SEGUNDA con el valor claro; la traza
    // completa está en el docblock de THEME_COLORS.
    //
    // El `||` cubre el caso de que la etiqueta ya exista (un HTML servido
    // desde un build anterior a este cambio, o un `viewport.themeColor` que
    // alguien reponga): se ADOPTA la que haya en vez de añadir otra.
    // `appendChild` devuelve el nodo insertado, así que la creación cabe en la
    // misma expresión y NO abre ningún bloque nuevo — el número de llaves de
    // este `try` sigue siendo exactamente el de antes, que es la cuenta que
    // costó la lección del 2026-08-17 (`task/lessons.md`).
    `try{var tc=${JSON.stringify(THEME_COLORS)}[theme];` +
    `var mc=document.querySelector('meta[name="theme-color"]')||document.head.appendChild(document.createElement("meta"));` +
    `mc.setAttribute("name","theme-color");` +
    `mc.setAttribute("content",tc);}catch(e){}` +
    // Precarga del arte del tema resuelto: su propio try/catch, separado del
    // de arriba. Fijar `data-theme` es lo que impide el flash y no puede
    // quedar a merced de que `createElement`/`appendChild` fallen en un
    // navegador raro. El `||[]` cubre el caso de un tema sin entrada en el
    // registro: no inyecta nada, en vez de reventar sobre `undefined.length`.
    //
    // La guarda de ruta (`home`) es lo que impide que las legales y la 404
    // paguen 253.833 B de arte que no pintan nunca: el layout raiz emite este
    // script en todas las rutas, pero el hero solo existe en la home (ver la
    // seccion "Tercera pasada" del docblock, con la normalizacion de pathname
    // y su porque). Se aplica como TERNARIO, no como bloque `if`, a proposito:
    // asi el numero de llaves de cierre de este bloque NO cambia -- justo la
    // familia de fallo silencioso que costo la leccion del 2026-08-17. Fuera
    // de la home el bucle recorre un array vacio y no inyecta nada.
    `try{var pn=window.location.pathname;` +
    `var home=(pn==="/"||pn==="/index.html");` +
    `var pl=${preloadsLiteral};var p=home?(pl[theme]||[]):[];` +
    `for(var i=0;i<p.length;i++){` +
    `var l=document.createElement("link");` +
    `l.rel="preload";l.as="image";` +
    `l.setAttribute("imagesrcset",p[i].srcSet);` +
    `l.setAttribute("imagesizes",p[i].sizes);` +
    // El type viaja cuando la entrada lo declara (pistas AVIF): con el, un
    // navegador sin el formato ignora la precarga en vez de descargar de mas.
    `if(p[i].type){l.setAttribute("type",p[i].type);}` +
    // Solo la PRIMERA lleva prioridad alta: es la candidata a LCP y el resto
    // no debe competir con ella por ancho de banda.
    `if(i===0){l.setAttribute("fetchpriority","high");}` +
    `document.head.appendChild(l);` +
    // DOS llaves, no tres: la del cuerpo del `for` y la del `try` de esta
    // precarga. La tercera existia mientras el bloque llevaba dentro un
    // `if(theme==="dark")`; al pasar a un registro por tema ese `if`
    // desaparecio y la llave sobrante dejaba el script sin parsear entero
    // ("SyntaxError: Missing catch or finally after try"). Lo unico que
    // delata un error asi es EJECUTAR el string, que es lo que hace
    // `resolveTheme.test.ts`: ningun typecheck ni lint mira dentro de una
    // plantilla de texto. La guarda de ruta del 2026-08-18 NO anadio una
    // tercera: se escribio como ternario precisamente para no volver a mover
    // esta cuenta.
    `}}catch(e){}` +
    `}catch(e){}})();`
  );
}
