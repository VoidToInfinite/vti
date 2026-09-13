import type { ReactElement } from "react";
import { NotFoundContent } from "@/components/sections/NotFound/NotFoundContent";
import { DocumentMeta } from "@/seo/DocumentMeta";
import { NotFoundLocaleShell } from "./NotFoundLocaleShell";

/*
 * EL ÁRBOL DE LA 404, SEPARADO DE SU FICHERO DE CONVENCIÓN (2026-09-06).
 *
 * Mismo criterio que `app/HomeRoute.tsx` con las dos portadas: el fichero de
 * convención (`app/global-not-found.tsx`) declara `metadata`, `viewport` y el
 * DOCUMENTO —renderiza su propio `<html>`, que es justo lo que le exige la
 * bandera `experimental.globalNotFound`—, y el árbol de la página vive aquí.
 *
 * No es una separación estética: `global-not-found.tsx` importa
 * `RootDocument`, y con él `next/font/google`, cuya llamada solo existe dentro
 * de `next build`/`next dev` (fuera revienta con «Hanken_Grotesk is not a
 * function»; la comprobación está escrita en `app/RootDocument.test.ts`). Con
 * el árbol aquí, los candados de DOM de la 404 —14 en `app/not-found.test.tsx`,
 * desde la cabecera completa hasta el idioma de la salida— siguen renderizando
 * el árbol REAL en jsdom sin depender de ningún doble de las fuentes.
 *
 * LA CÁSCARA LA MONTA `LocaleShell` DESDE EL 2026-09-04, NO ESTA RUTA, y el
 * bloque de abajo se conserva porque explica POR QUÉ esta página lleva la
 * navegación completa del sitio -- decisión que no cambia. Lo que cambia es
 * quién la pone: montarla aquí abría una frontera de cliente propia sobre
 * `Navbar`/`Footer`, y como el árbol de esta ruta viaja en el manifiesto de
 * cliente de TODAS las páginas, esa copia acababa emitida dos veces en las dos
 * portadas (28.413 B brotli redundantes, medidos por chunk). Es la misma
 * lección que el docblock de `app/providers.tsx` ya había dejado escrita para
 * el tema y el i18n, aplicada por fin a la cáscara. El DOM de la 404 es el
 * mismo; el candado está en `app/providers.test.tsx`.
 *
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
export function NotFoundRoute(): ReactElement {
  return (
    /*
     * `LocaleShell` (el IDIOMA, con `SkipLink`/`BackToTop`) se monta AQUÍ desde
     * el 2026-08-18. La 404 no vive dentro de `app/(es)/` ni de `app/en/` —es
     * la 404 GLOBAL, y su fichero de convención tiene que estar en la raíz de
     * `app/`—, así que no hereda el idioma de ninguna de las dos ramas.
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
     * El TEMA y los estilos globales NO se montan aquí: los pone `Providers`
     * dentro de `RootDocument`, que es también quien renderiza el `<html>` de
     * esta página. Desde el 2026-08-19 eso no es un detalle de gusto — el árbol
     * de esta ruta viaja en el manifiesto de cliente de TODAS las páginas (es
     * su `NotFoundBoundary`), así que cada módulo que se monte aquí y no cuelgue
     * de un ancestro común se emite por duplicado y lo descarga también quien
     * solo abre la portada. Medido: 313.928 → 285.430 B brotli (docblock de
     * `app/providers.tsx`).
     */
    <NotFoundLocaleShell>
      {/*
       * Mismo mecanismo que la home y que las dos legales (crítica externa
       * #8): la `metadata` de `global-not-found.tsx` se hornea en castellano en
       * build y nada la actualizaba al cambiar de idioma, así que el `<h1>`
       * traducido y la pestaña afirmaban idiomas distintos. Las claves son las
       * MISMAS que ya consume esa `metadata` (`notFound.title`/
       * `notFound.message`) y las mismas que pinta `NotFoundContent`: una sola
       * fuente para el titular, la pestaña y la descripción. Ver
       * `src/seo/useDocumentMeta.ts`.
       */}
      <DocumentMeta
        titleKey="notFound.title"
        descriptionKey="notFound.message"
      />
      <NotFoundContent />
    </NotFoundLocaleShell>
  );
}
