import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { NotFoundContent } from "@/components/sections/NotFound/NotFoundContent";
import { SITE } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import { DocumentMeta } from "@/seo/DocumentMeta";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import { NotFoundLocaleShell } from "./NotFoundLocaleShell";

/*
 * Server Component a proposito, SIN "use client" (auditoria SEO 2026-08-08,
 * mismo patron que las paginas legales -- ver el docblock de
 * `app/privacidad/page.tsx`): una ruta que exporta `metadata` no puede ser
 * Client Component. Antes de esta entrega, `not-found.tsx` era enteramente
 * de cliente y heredaba la metadata de la HOME (`app/layout.tsx`): el
 * `<title>` de la 404 era el de la home, `robots` quedaba en
 * `index,follow` -- justo lo contrario de lo que una pagina de error
 * deberia declarar -- y la canonica apuntaba a `/`, no a la URL rota que el
 * visitante pidio de verdad.
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
 * LO QUE HAY QUE COMPROBAR ANTES DE VOLVER A DECLARARLO: que el limite de
 * Next siga emitiendo su etiqueta. Si una actualizacion de Next la retira,
 * esta ruta se queda SIN ninguna directiva y una pagina de error pasa a ser
 * indexable -- exactamente el defecto que la auditoria SEO 2026-08-08
 * cerro. Ese es el riesgo real de esta decision y por eso lleva candado
 * propio en `not-found.test.tsx`, que lee el fichero del framework
 * instalado: en cuanto deje de emitirla, el gate se pone en rojo y hay que
 * devolver el `robots` a este objeto.
 *
 * Tampoco se HEREDA ninguna: `app/layout.tsx` dejo de declarar metadata de
 * pagina el 2026-08-18 y hoy solo declara `metadataBase` (ver su docblock),
 * asi que aqui no llega el `index: true` de `buildMetadata()` que aquella
 * auditoria encontro.
 *
 * `alternates.canonical: null` es una anulacion DELIBERADA, no una omision:
 * en la metadata de Next un campo de primer nivel que el hijo NO declara se
 * HEREDA del padre, y cuando `app/layout.tsx` todavia declaraba la metadata
 * de la portada eso dejaba a la 404 emitiendo
 * `<link rel="canonical" href="https://voidtoinfinite.com">` -- medido en
 * `out/404.html` el 2026-08-08. El padre ya no declara `alternates`, asi que
 * hoy no hay nada que anular; el campo se conserva porque expresa la
 * intencion (una 404 no tiene URL propia que canonicalizar) y porque
 * retirarlo devolveria la herencia el dia que la portada vuelva al layout.
 * Verificado el 2026-09-03: `out/404.html` no emite ningun
 * `<link rel="canonical">`.
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
  title: `${esCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
  description: esCommon.notFound.message,
  alternates: { canonical: null },
};

/*
 * Task 35 (hallazgo de un evaluador independiente, gate F4, 2026-08-12):
 * esta cáscara pasa de montar SOLO `NotFoundContent` a montar también
 * `Navbar` y `Footer` -- los MISMOS componentes que `app/page.tsx`, sin
 * duplicar lógica. Server Component + Client Components hijos es
 * exactamente el mismo patrón que ya usa `app/page.tsx` (`HomePage` no
 * lleva "use client" y monta `Navbar`/`Footer`, los dos de cliente,
 * directamente).
 *
 * Ya NO hay divergencia con `/privacidad` y `/aviso-legal`: desde la ola M
 * (2026-09-03, decisión del dueño tras la crítica externa #16) esas dos
 * rutas montan este mismo `Navbar` y `LegalHeader` se retiró. El argumento
 * que sostenía la cabecera sobria era que `Navbar` monta anclas a secciones
 * (`src/config/navigation.ts`) que en una página sin esas secciones no
 * navegan a ningún sitio; lo que lo desactiva es que esas anclas se emiten
 * como rutas ABSOLUTAS a la home (`/#story`, o `/en#story` en inglés), así
 * que desde una legal o desde aquí sí navegan y aterrizan -- medido. Se
 * conserva escrito porque explica por qué el sitio tuvo dos cabeceras
 * durante un mes, y porque el brief de esta ruta ya pedía "los mismos
 * componentes que la home", con la marca completa, el selector de idioma,
 * el conmutador de tema Y la navegación entera visibles -- priorizando que
 * quien aterriza en un error de verdad vea el sitio COMPLETO y pueda saltar
 * a cualquier destino real (SDK, Discord, GitHub, las 4 anclas SI vuelve a
 * la home), aunque mientras siga en esta ruta las 4 anclas de sección no
 * resuelvan nada -- el mismo trade-off, sin gravedad añadida, que ya asume
 * cualquier enlace del `Footer` de la home a esas mismas anclas cuando se
 * clica desde `/privacidad`. Decisión del brief de la tarea, no una omisión
 * de este cambio.
 */
export default function NotFound(): ReactElement {
  return (
    /*
     * `LocaleShell` (el IDIOMA, con `SkipLink`/`BackToTop`) se monta AQUÍ desde
     * el 2026-08-18. Esta página tiene que seguir viviendo en la raíz de `app/`
     * para ser la 404 global (la entrada `/_not-found` resuelve sus ficheros en
     * el segmento raíz, no dentro de los grupos de ruta), así que no cae dentro
     * de `app/(es)/` ni de `app/en/` y no hereda el idioma de ninguno de los
     * dos.
     *
     * EL `locale="es"` FIJO SE RETIRA EL 2026-08-20 (crítica #13). Decía que
     * «una URL rota no pertenece a ninguna rama de idioma», y eso es falso en
     * cuanto el sitio tiene dos: `GET /en/lo-que-sea` respondía 404 correcto
     * pero enteramente en castellano —`<html lang="es">`, título «Página no
     * encontrada», cuerpo castellano y el selector marcando Español como
     * actual— a alguien que venía navegando en inglés. La rama SÍ está en la
     * URL que falló, y `NotFoundLocaleShell` la lee del navegador tras montar:
     * el porqué completo, el motivo de que arranque en castellano y el coste
     * declarado (un instante de copia castellana antes de corregir) viven en su
     * docblock, no se duplican aquí.
     *
     * El TEMA y los estilos globales NO se montan aquí: los pone `Providers` en
     * `app/layout.tsx`, que también envuelve a esta página. Desde el 2026-08-19
     * eso no es un detalle de gusto — el árbol de esta ruta viaja en el
     * manifiesto de cliente de TODAS las páginas (es su `NotFoundBoundary`), así
     * que cada módulo que se monte aquí y no cuelgue de un ancestro común se
     * emite por duplicado y lo descarga también quien solo abre la portada.
     * Medido: 313.928 → 285.430 B brotli (docblock de `app/providers.tsx`).
     */
    <NotFoundLocaleShell>
      {/*
       * Mismo mecanismo que la home y que las dos legales (crítica externa
       * #8): la `metadata` de arriba se hornea en castellano en build y nada
       * la actualizaba al cambiar de idioma, así que el `<h1>` traducido y la
       * pestaña afirmaban idiomas distintos. Las claves son las MISMAS que ya
       * consume esa `metadata` (`notFound.title`/`notFound.message`) y las
       * mismas que pinta `NotFoundContent`: una sola fuente para el titular,
       * la pestaña y la descripción. Ver `src/seo/useDocumentMeta.ts`.
       */}
      <DocumentMeta
        titleKey="notFound.title"
        descriptionKey="notFound.message"
      />
      <Navbar />
      <NotFoundContent />
      <Footer />
    </NotFoundLocaleShell>
  );
}
