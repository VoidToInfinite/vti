import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";
import { SITE } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import { NotFoundRoute } from "./NotFoundRoute";
import { RootDocument } from "./RootDocument";
import { ROOT_METADATA, ROOT_VIEWPORT } from "./rootMetadata";

/*
 * LA 404 GLOBAL, Y POR QUÉ ES `global-not-found.tsx` Y NO `not-found.tsx`
 * (2026-09-06).
 *
 * Este fichero era `app/not-found.tsx` hasta esta entrega. El cambio no es de
 * nombre: es lo que permite que cada rama de idioma hornee su propio
 * `<html lang>` (WCAG 3.1.1, P1 de la crítica externa #19). Con
 * `app/not-found.tsx`, la entrada `/_not-found` exigía un `layout` en el
 * segmento RAÍZ, y ese `app/layout.tsx` obligado era el que imponía un único
 * `lang` a las seis rutas. Con `experimental.globalNotFound: true`
 * (`next.config.ts`) la 404 renderiza su PROPIO documento y deja de necesitar
 * root layout, así que `app/layout.tsx` desaparece y los dos layouts de rama
 * pasan a ser raíces con su propio `<html lang>`. La lectura del código de Next
 * 16.2.11 que lo respalda está en el docblock de `app/RootDocument.tsx`.
 *
 * Server Component a proposito, SIN "use client" (auditoria SEO 2026-08-08,
 * mismo patron que las paginas legales -- ver el docblock de
 * `app/privacidad/page.tsx`): una ruta que exporta `metadata` no puede ser
 * Client Component. Antes de aquella entrega, la 404 era enteramente de
 * cliente y heredaba la metadata de la HOME: el `<title>` de la 404 era el de
 * la home, `robots` quedaba en `index,follow` -- justo lo contrario de lo que
 * una pagina de error deberia declarar -- y la canonica apuntaba a `/`, no a
 * la URL rota que el visitante pidio de verdad.
 *
 * ESTA RUTA NO DECLARA `robots`, Y ESA AUSENCIA ES DELIBERADA (critica
 * externa #17, 2026-09-03). Hasta esa fecha declaraba
 * `robots: { index: false, follow: true }` y el resultado medido era que la
 * 404 emitia DOS `<meta name="robots">` a la vez:
 *
 *     <meta name="robots" content="noindex"/>
 *     <meta name="robots" content="noindex, follow"/>
 *
 * Medido sobre el build de produccion servido (`out/404.html` y
 * `GET /una-ruta-rota`, que responde 404 con ese mismo documento) y
 * reproducido igual en `next dev`. La segunda salia de aqui; la PRIMERA la
 * emite el propio framework: `HTTPAccessFallbackErrorBoundary`
 * (`next/dist/client/components/http-access-fallback/error-boundary.js`)
 * antepone un `<meta name="robots" content="noindex">` fijo a los hijos del
 * limite de not-found en cuanto ese limite se dispara. No es configurable ni
 * suprimible desde `metadata`: esta escrito en el render del componente.
 *
 * Asi que de las dos etiquetas solo una esta bajo nuestro control, y la
 * unica forma de dejar UNA es no anadir la nuestra. La directiva efectiva no
 * cambia: `noindex` a secas significa `noindex` + `follow`, porque `follow`
 * es el valor por defecto de la etiqueta y solo `nofollow` lo revoca. Es
 * decir, la 404 sigue sin indexarse y sigue permitiendo que el rastreador
 * siga sus enlaces -- que es lo que se queria desde la auditoria premium
 * 2026-08-08, cuando esta plantilla estreno navegacion propia.
 *
 * VERIFICADO DE NUEVO EL 2026-09-06, tras la mudanza a `global-not-found`: el
 * `out/404.html` del build sigue emitiendo UNA sola
 * `<meta name="robots" content="noindex"/>`, la del framework. La bandera
 * cambia QUIÉN renderiza el documento, no el limite que antepone esa etiqueta.
 *
 * LO QUE HAY QUE COMPROBAR ANTES DE VOLVER A DECLARARLO: que el limite de
 * Next siga emitiendo su etiqueta. Si una actualizacion de Next la retira,
 * esta ruta se queda SIN ninguna directiva y una pagina de error pasa a ser
 * indexable -- exactamente el defecto que la auditoria SEO 2026-08-08
 * cerro. Ese es el riesgo real de esta decision y por eso lleva candado
 * propio en `not-found.test.tsx`, que lee el fichero del framework
 * instalado: en cuanto deje de emitirla, el gate se pone en rojo y hay que
 * devolver el `robots` a este objeto.
 *
 * `metadataBase` SE DECLARA AQUI EXPLICITAMENTE, y es nuevo del 2026-09-06:
 * hasta ahora lo HEREDABA de `app/layout.tsx`. Una 404 que renderiza su propio
 * documento no tiene layout padre del que heredar nada, asi que sin este
 * `...ROOT_METADATA` la imagen de `app/opengraph-image.tsx` saldria con una URL
 * relativa (o con el `localhost` por defecto de Next). Es el mismo valor que
 * exportan las dos raices de idioma.
 *
 * `alternates.canonical: null` es una anulacion DELIBERADA, no una omision:
 * en la metadata de Next un campo de primer nivel que el hijo NO declara se
 * HEREDA del padre, y cuando `app/layout.tsx` todavia declaraba la metadata
 * de la portada eso dejaba a la 404 emitiendo
 * `<link rel="canonical" href="https://voidtoinfinite.com">` -- medido en
 * `out/404.html` el 2026-08-08. Hoy esta ruta ya no tiene padre del que
 * heredar; el campo se conserva porque expresa la intencion (una 404 no tiene
 * URL propia que canonicalizar) y porque `ROOT_METADATA` podria volver a
 * declarar `alternates` el dia que alguien lo necesite. Verificado el
 * 2026-09-06: `out/404.html` no emite ningun `<link rel="canonical">`.
 *
 * NO SE DECLARAN `openGraph`/`twitter`, PERO LA PAGINA SI LOS EMITE, y este
 * docblock afirmaba lo contrario hasta la critica externa #17. Lo que decia
 * -- que no tiene sentido compartir un "resultado" que no es una pagina real
 * -- describe la intencion de no usar `buildMetadata()`, no el HTML que sale.
 * Medido en `out/404.html` el 2026-09-03: la 404 emite `og:title`,
 * `og:description`, `og:image` (con sus cuatro metas de tipo y tamano) y las
 * siete de `twitter:*`. La causa es la convencion de fichero
 * `app/opengraph-image.tsx`, que vive en el MISMO segmento raiz que esta
 * ruta y por tanto tambien la cubre: Next crea el bloque Open Graph para
 * colgar de el la imagen y lo completa con el `title` y la `description` de
 * arriba. Queda escrito como hecho medido; cerrarlo (si es que debe
 * cerrarse) es una decision de SEO con su propia medicion, no una omision de
 * esta entrega.
 *
 * La copia sale del locale ESPAÑOL directamente, no vía `t()`: `metadata`
 * se resuelve en tiempo de build, sobre el HTML prerrenderizado en español
 * (`src/i18n/config.ts`: `lng: "es"`) -- mismo criterio que
 * `app/privacidad/page.tsx`, mismo motivo (que el `<title>` del HTML
 * estatico y el `<h1>` que monta `NotFoundContent` no puedan divergir).
 */
export const metadata: Metadata = {
  ...ROOT_METADATA,
  title: `${esCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
  description: esCommon.notFound.message,
  alternates: { canonical: null },
};

/*
 * El mismo `viewport` que las dos raíces de idioma, y por el mismo motivo: la
 * 404 es un documento completo del sitio, con su `viewport-fit=cover` y sin
 * `themeColor` (la etiqueta la crea el script de arranque; ver
 * `app/rootMetadata.ts`). Antes lo heredaba de `app/layout.tsx`.
 */
export const viewport: Viewport = ROOT_VIEWPORT;

/**
 * La 404 renderiza su PROPIO documento, que es lo que exige
 * `experimental.globalNotFound`: la convención `global-not-found` sustituye al
 * root layout de la entrada `/_not-found` en vez de anidarse bajo él (leído en
 * `next/dist/build/webpack/loaders/next-app-loader/index.js`, rama
 * `if (isNotFoundRoute && isGlobalNotFoundEnabled)`), y el componente que Next
 * trae por defecto para esa convención emite `<html><body>` él mismo
 * (`next/dist/client/components/builtin/global-not-found.js`).
 *
 * `lang="es"` NO es un descuido en una página que sí resuelve el idioma: bajo
 * `output: "export"` existe un único `out/404.html` para las dos ramas y su
 * contenido HORNEADO es castellano, así que el atributo del HTML en crudo
 * describe lo que el documento realmente dice. En una URL rota bajo `/en/`,
 * `NotFoundLocaleShell` resuelve el idioma desde el camino e `I18nProvider`
 * escribe `lang="en"` en el DOM vivo —que es lo que anuncia un lector de
 * pantalla— antes de que se lea nada. Candado en `app/not-found.test.tsx`.
 */
export default function GlobalNotFound(): ReactElement {
  return (
    <RootDocument lang="es">
      <NotFoundRoute />
    </RootDocument>
  );
}
