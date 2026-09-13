import type { Metadata, Viewport } from "next";
import { SITE } from "@/config/site";

/*
 * LOS EXPORTS DE DOCUMENTO, EN UN SOLO SITIO PARA LAS DOS RAMAS DE IDIOMA
 * (2026-09-06).
 *
 * Desde que cada rama hornea su propio `<html lang>` hay DOS root layouts
 * —`app/(es)/layout.tsx` y `app/en/layout.tsx`— más la 404 global
 * (`app/global-not-found.tsx`), y Next lee `metadata`/`viewport` del FICHERO de
 * cada convención: un export declarado en un módulo compartido no lo ve. Lo que
 * sí puede compartirse es el VALOR, y eso es lo que hacen estas dos constantes:
 * los tres ficheros exportan `metadata`/`viewport` asignando lo de aquí, así que
 * las tres raíces declaran exactamente el mismo documento y no pueden divergir
 * en silencio. El candado está en `app/RootDocument.test.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AQUÍ SOLO QUEDA `metadataBase`, y desde el 2026-08-18 ya NO la metadata de
 * la home.
 *
 * `metadataBase` es lo único que las páginas hijas HEREDAN de verdad y
 * necesitan. Es la base con la que Next resuelve a URL absoluta la imagen que
 * genera `app/opengraph-image.tsx`; sin ella, `og:image` saldría con una ruta
 * relativa que ningún rastreador puede seguir.
 *
 * La metadata de la portada (`buildMetadata({ routeKey: "home" })`) vivía en el
 * root layout y se mudó a `app/(es)/page.tsx`, junto a su gemela inglesa de
 * `app/en/page.tsx`. El motivo no es de orden: una canónica
 * `https://voidtoinfinite.com` declarada en un layout se heredaría en toda ruta
 * que no la sustituyera — el mismo mecanismo de herencia que la 404 ya tuvo que
 * neutralizar a mano con `alternates: { canonical: null }` (ver el docblock de
 * `app/global-not-found.tsx`, con la medición sobre `out/404.html` del
 * 2026-08-08). Con la metadata en cada página, cada URL declara la suya y
 * ninguna hereda la de otra.
 *
 * Los campos concretos de la portada (por qué `SITE.homeTitle` y no
 * `SITE.name`) se explican en `app/(es)/page.tsx`.
 */
export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE.url),
};

/*
 * AQUÍ NO HAY `themeColor`, Y ES UNA DECISIÓN MEDIDA (2026-09-03, crítica #16,
 * hallazgo P1 del evaluador técnico B1). Declararlo es lo que producía DOS
 * etiquetas `meta[name="theme-color"]` en el documento y, entre ellas, una
 * ventana con la barra del navegador en CLARO sobre la página oscura.
 *
 * Traza sobre el build de producción servido, Chrome real, contexto nuevo,
 * `localStorage.vti-theme = "dark"` antes de cargar:
 *
 *   t=  24  1 meta  [#280739]            ← el script de arranque, pre-pintado
 *   t= 204  2 metas [#280739, #FAFAFA]   ← React inserta una SEGUNDA, en claro
 *   t= 214  2 metas [#FAFAFA, #FAFAFA]   ← el efecto de ThemeProvider las pisa
 *   t= 282  2 metas [#280739, #280739]   ← y las corrige
 *
 * La segunda etiqueta la crea React 19, no Next: al hidratar, su caché de
 * elementos «hoistable» busca el `<meta>` al que engancharse INDEXÁNDOLO POR
 * SU ATRIBUTO `content` (rama `case "meta"` de `commitMutationEffectsOnFiber`
 * en `react-dom-client.development.js`, leída en `node_modules`), y el script
 * de arranque acababa de cambiar ese `content` de `#FAFAFA` a `#280739`: la
 * búsqueda falla y React cae en `createElement` + `head.appendChild`. En tema
 * claro el valor no cambiaba, la búsqueda acertaba y React adoptaba la
 * estática — por eso el defecto solo aparecía en oscuro.
 *
 * ARREGLO DE CAUSA RAÍZ: si React no renderiza ninguna etiqueta `theme-color`,
 * no hay nada que pueda duplicar. La etiqueta la CREA y la posee el script de
 * arranque (`buildThemeBootstrapScript`), antes del primer pintado y ya con el
 * tema resuelto, y `ThemeProvider` actualiza esa única etiqueta en cada cambio
 * real de tema. El porqué completo, con la traza y los dos hex —los mismos que
 * documenta `app/opengraph-image.tsx` para estos mismos primitivos— vive en el
 * docblock de `THEME_COLORS` (`src/theme/resolveTheme.ts`).
 *
 * COSTE DECLARADO: sin JavaScript no hay `theme-color` y la barra queda en el
 * color por defecto del navegador. El HTML estático se pinta en claro, así que
 * ahí la diferencia es entre `#FAFAFA` y el blanco del navegador; lo que se
 * evita a cambio es una barra casi blanca sobre una página casi negra.
 *
 * `viewportFit: "cover"` (Task 13, punto 1 del brief): sin él, iOS Safari
 * NUNCA rellena `env(safe-area-inset-*)` -- resuelve siempre al fallback de
 * la función `env()`, sea cual sea el hardware. Verificado leyendo el motor
 * (WebKit solo activa el layout "cover", que extiende el viewport bajo el
 * notch/home-indicator y con ello da valor real a esos `env()`, cuando el
 * meta viewport declara `viewport-fit=cover`; el valor por defecto es
 * "auto", equivalente a "contain": el navegador ya evita el notch por su
 * cuenta y `env()` se queda en 0 para siempre). Es la ÚNICA clave nueva de
 * este objeto: `mergeViewport()` (`next/dist/lib/metadata/resolve-metadata.js`,
 * confirmado leyendo la fuente en `node_modules`) parte de
 * `createDefaultViewport()` (`width: "device-width", initialScale: 1`) y
 * solo SUSTITUYE las claves presentes en el objeto exportado -- añadir
 * `viewportFit` no toca `width`/`initialScale`, que siguen sin declararse
 * aquí y siguen resolviendo al default de Next. Verificado además en el HTML
 * exportado tras `pnpm build`: `<meta name="viewport" content="width=
 * device-width, initial-scale=1, viewport-fit=cover">` -- ningún otro
 * atributo cambia de valor.
 */
export const ROOT_VIEWPORT: Viewport = {
  viewportFit: "cover",
};
