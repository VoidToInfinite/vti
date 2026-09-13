import type { Metadata } from "next";
import type { ReactElement } from "react";
import { NotFoundContent } from "@/components/sections/NotFound/NotFoundContent";
import { SITE } from "@/config/site";
import enCommon from "@/i18n/locales/en/common.json";
import { DocumentMeta } from "@/seo/DocumentMeta";
import { TITLE_SEPARATOR } from "@/seo/metadata";

/*
 * LA 404 INGLESA HORNEADA (2026-09-10, P2 de la crítica externa #21, H9).
 *
 * EL DEFECTO: `GET /en/no-existe` SIN JavaScript se servía en castellano. Bajo
 * `output: "export"` la 404 global (`app/global-not-found.tsx`) hornea UN solo
 * `out/404.html` castellano, y la corrección de idioma de
 * `NotFoundLocaleShell` solo existe tras hidratar. Sin JS, quien venía
 * navegando en inglés recibía `<html lang="es">` y copia castellana.
 *
 * EL ARREGLO, sin servidor: el build hornea ADEMÁS este documento inglés como
 * fichero estático (`out/en/404.html`) y el hosting lo sirve con estado 404
 * para cualquier camino inexistente bajo `/en/`. Esa segunda mitad vive en
 * `vercel.json` (`routes`: `src: "/en/(.*)"`, `status: 404`, `dest: "/en/404"`,
 * detrás de `{ "handle": "filesystem" }`), y solo aplica a caminos que no
 * existen como fichero, así que las rutas inglesas reales no se tocan. Del
 * 2026-09-10 al 2026-09-13 estuvo en `netlify.toml`, que producción no leía. La
 * 404 castellana no cambia: sigue siendo `out/404.html`.
 *
 * POR QUÉ UNA PÁGINA BAJO `app/en/` Y NO OTRA 404 DE CONVENCIÓN: la entrada
 * `/_not-found` resuelve sus ficheros en el segmento raíz de `app/`, fuera de
 * las ramas de idioma, así que Next no sabe hornear una 404 por rama. Una
 * página normal dentro de `app/en/` hereda `app/en/layout.tsx` —`<html
 * lang="en">` y `LocaleShell locale="en"`, con `Navbar`, `Footer`, `SkipLink`
 * y `BackToTop` en inglés— y monta el MISMO `NotFoundContent` que la 404
 * global. Ni un componente duplicado: la identidad es la misma y la salida
 * «Back to home» compone `routePath("home", "en")`, es decir `/en`.
 *
 * LO QUE ESTA RUTA NO DEBE SER, y cómo se evita:
 *
 * - INDEXABLE. Al ser una página normal, el límite de not-found de Next no se
 *   dispara y NO antepone su `<meta name="robots" content="noindex">` (el que
 *   la 404 global recibe gratis; ver su docblock). Por eso aquí SÍ se declara
 *   `robots` con `index: false` —el mismo `noindex` + `follow` efectivo que la
 *   global— y sin canónica (`alternates.canonical: null`, sin `hreflang`): una
 *   404 no tiene URL propia que canonicalizar ni versiones por idioma que
 *   anunciar.
 * - ANUNCIADA. No entra en `app/sitemap.ts` (que compone sus URLs desde
 *   `SITEMAP_ROUTE_KEYS`, las tres páginas públicas por idioma) ni en ningún
 *   enlace del sitio. `robots.ts` no se toca: bloquearla ahí impediría que el
 *   rastreador leyera justamente el `noindex`.
 * - UN 200 QUE CONFUNDA. `GET /en/404` sí existe como fichero y responde 200:
 *   es el precio de hornearla con `output: "export"`, que no emite estados. Lo
 *   que sirve de verdad es la regla de `vercel.json`, que la entrega con 404 en las
 *   URLs rotas; la dirección `/en/404` no la enlaza nadie y declara `noindex`.
 *
 * La copia de la metadata sale del locale INGLÉS directamente, no vía `t()`:
 * mismo criterio que `app/en/privacy/page.tsx` y que la 404 global con el
 * castellano —`metadata` se resuelve en build—, y con las MISMAS claves que
 * pintan el `<h1>` y el mensaje (`notFound.title`/`notFound.message`).
 */
export const metadata: Metadata = {
  title: `${enCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
  description: enCommon.notFound.message,
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function EnNotFoundPage(): ReactElement {
  return (
    <>
      <DocumentMeta
        titleKey="notFound.title"
        descriptionKey="notFound.message"
      />
      <NotFoundContent />
    </>
  );
}
