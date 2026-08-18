import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
import { SITE } from "@/config/site";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { organizationJsonLd, webSiteJsonLd } from "@/seo/jsonLd";
import { AURA_PRELOADS } from "@/components/scenes/aura/aura.layers";
import { EYE_PRELOADS } from "@/components/scenes/eye/eye.layers";
import { buildThemeBootstrapScript, THEME_COLORS } from "@/theme/resolveTheme";

const fontBody = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  // Solo se usa bajo el pliegue (badges de Story/Features): medido en 40 KB
  // dentro de la ventana critica de carga. `preload: false` saca su <link
  // rel="preload"> del <head>, que competia por ancho de banda con recursos
  // que SI hacen falta para el primer pintado (auditoria SEO 2026-08-08).
  preload: false,
});

/*
 * AQUÍ SOLO QUEDA `metadataBase`, y desde el 2026-08-18 ya NO la metadata de
 * la home.
 *
 * `metadataBase` es lo único que las páginas hijas HEREDAN de verdad y
 * necesitan. Es la base con la que Next resuelve a URL absoluta la imagen que
 * genera `app/opengraph-image.tsx`; sin ella, `og:image` saldría con una ruta
 * relativa que ningún rastreador puede seguir.
 *
 * La metadata de la portada (`buildMetadata({ routeKey: "home" })`) vivía aquí
 * y se ha mudado a `app/(es)/page.tsx`, junto a su gemela inglesa de
 * `app/en/page.tsx`. El motivo no es de orden: este layout es el ÚNICO root
 * layout y ahora lo comparten SEIS rutas en DOS idiomas, así que una canónica
 * `https://voidtoinfinite.com` declarada aquí se heredaría en toda ruta que no
 * la sustituyera — el mismo mecanismo de herencia que `app/not-found.tsx` ya
 * tuvo que neutralizar a mano con `alternates: { canonical: null }` (ver su
 * docblock, con la medición sobre `out/404.html` del 2026-08-08). Con la
 * metadata en cada página, cada URL declara la suya y ninguna hereda la de
 * otra.
 *
 * Los campos concretos de la portada (por qué `SITE.homeTitle` y no
 * `SITE.name`) se explican ahora en `app/(es)/page.tsx`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
};

/*
 * `themeColor` por esquema, no un unico literal (el `#000000` anterior no
 * coincidia con NINGUN token real del tema oscuro). Los dos hex son
 * EXACTAMENTE los que `app/opengraph-image.tsx` ya documenta y usa para
 * estos MISMOS primitivos (conversion oklch → OKLab → sRGB lineal → sRGB
 * con gamma, matrices de Björn Ottosson de `src/theme/tokens/contrast.ts`),
 * no un hex inventado a ojo:
 *   - claro:  semanticLight.bg  (= color.neutral[50])    → "#FAFAFA"
 *     (el mismo primitivo que ese archivo etiqueta TEXT, para
 *     semanticDark.text -- es el mismo token neutral[50], solo cambia el
 *     rol semantico que lo consume)
 *   - oscuro: semanticDark.bg   (= color.secondary[1100]) → "#280739"
 *     (BG_FROM del degradado de esa misma imagen)
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
export const viewport: Viewport = {
  /*
   * UNA sola entrada y SIN `media`, desde el 2026-08-16 (Ola C). Antes había
   * dos, una por `prefers-color-scheme`, y eso ataba el color de la barra del
   * navegador al SISTEMA OPERATIVO — mientras que el tema de este sitio lo
   * decide el CONMUTADOR (`localStorage` gana a `prefers`, decisión D-C).
   * Medido: con el sistema en claro y el conmutador en oscuro, la barra seguía
   * en `#FAFAFA` sobre una página casi negra.
   *
   * El valor estático es el CLARO a propósito: es el tema del HTML que hornea
   * el build, así que es el correcto mientras nadie ejecute JavaScript. A
   * partir de ahí lo actualizan el script de arranque (antes del primer
   * pintado) y `ThemeProvider` (en cada cambio), los dos leyendo de
   * `THEME_COLORS`.
   */
  themeColor: THEME_COLORS.light,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    /*
     * `lang="es"` EN LAS SEIS RUTAS, INCLUIDAS LAS INGLESAS: LÍMITE CONOCIDO,
     * NO DESCUIDO (2026-08-18).
     *
     * Bajo App Router, dos `<html lang>` distintos exigen DOS root layouts, y
     * un root layout es, por definición, un `layout` sin `layout` padre: hay
     * que BORRAR `app/layout.tsx` y dar a cada grupo de ruta el suyo. Ese
     * reparto está bloqueado en este repo por su propia 404, y está verificado
     * leyendo el paquete instalado, no supuesto — `next/dist/build/webpack/
     * loaders/next-app-loader/index.js`:
     *
     *   - la entrada `/_not-found` resuelve su `layout` en el segmento RAÍZ
     *     (`app/`), no dentro de los grupos;
     *   - el único camino que inyecta un layout por defecto cuando ahí no hay
     *     ninguno está guardado por `isDefaultNotFound` (`isAppBuiltinPage`),
     *     es decir, solo cuando NO existe un `app/not-found.tsx` propio;
     *   - con un `not-found.tsx` propio y sin `app/layout.tsx`, `rootLayout`
     *     queda sin resolver y el build sale por
     *     `log.error("... doesn't have a root layout ...")` + `process.exit(1)`.
     *
     * Es decir: o dos `<html lang>`, o la 404 propia del sitio (endurecida en
     * la Task 35 y por la crítica externa) — no las dos, salvo activando
     * `experimental.globalNotFound` en `next.config.ts` y reescribiendo la 404
     * como `app/global-not-found.tsx` (bandera experimental, `false` por
     * defecto en 16.2.11: `next/dist/server/config-shared.js`). Esa es una
     * decisión de arquitectura del dueño, no algo que se resuelva aquí en
     * silencio.
     *
     * Mientras tanto, lo que SÍ está resuelto para `/en/*`: el contenido, el
     * `<title>`, la canónica, el `og:locale`, el `hreflang` y el sitemap son
     * ingleses ya en el HTML horneado; y `I18nProvider` corrige este atributo
     * a `en` tras montar, que es lo que leen los lectores de pantalla (DOM
     * vivo) y cualquier rastreador que ejecute JavaScript. Lo que queda fuera
     * es el atributo del HTML servido en crudo.
     *
     * `data-scroll-behavior="smooth"`: Next detecta `scroll-behavior: smooth`
     * en `html` (declarado a propósito en `GlobalStyles.tsx` para los saltos
     * a ancla del CTA del hero y del navbar; `useThemeScrollReset` dejó de
     * viajar a top en la Task 17 — 2026-08-11 — y hoy usa `behavior:
     * "instant"` precisamente para escapar de esta regla global) y, sin este
     * atributo, avisa en
     * consola en cada carga y cada transición de ruta con el mensaje "Detected
     * `scroll-behavior: smooth` on the `<html>` element. To disable smooth
     * scrolling during route transitions, add `data-scroll-behavior="smooth"`
     * to your <html> element." La documentación oficial
     * (https://nextjs.org/docs/messages/missing-data-scroll-behavior)
     * explica el porqué: "Next.js automatically attempts to detect the smooth
     * scrolling configuration to ensure that navigating back/forward through
     * the router doesn't also trigger the smooth scrolling behavior, as this
     * is often not desired." y da como arreglo "Add
     * `data-scroll-behavior="smooth"` to your `<html>` element if you want to
     * disable smooth scrolling when routing via Next.js." El CSS se mantiene
     * intacto -- las anclas y el viaje de scroll del cambio de tema lo siguen
     * necesitando --; el atributo solo le dice al router que use scroll
     * instantáneo en SUS propias transiciones (back/forward, cambio de
     * página), dejando el scroll suave para los saltos que dispara el propio
     * usuario.
     */
    <html
      lang={SITE.lang}
      data-scroll-behavior="smooth"
      className={`${fontBody.variable} ${fontMono.variable}`}
      /*
       * El script anti-flash del `<head>` escribe `data-theme` en ESTE
       * elemento antes de que React hidrate. React compara los atributos del
       * DOM hidratado con los que él renderizó, encuentra uno de más y avisa:
       * "some attributes of the server rendered HTML didn't match the client
       * properties. This won't be patched up."
       *
       * "This won't be patched up" es la parte que explica por qué el tema
       * funcionaba igual: React deja el atributo puesto, no lo borra. Por eso
       * el aviso era ruido y no un fallo -- pero ruido en cada carga, y el
       * ruido en consola es exactamente lo que hace que nadie mire la consola
       * el día que aparece algo de verdad.
       *
       * ALCANCE, y es la razón por la que esto no tapa nada: la propiedad
       * suprime los mismatches de ESTE elemento -- sus atributos y su
       * contenido directo -- y NO los de su subárbol. Un mismatch dentro de
       * cualquier sección sigue apareciendo con todo detalle. Comprobado en
       * esta misma sesión: con esta prop puesta, el mismatch de copy de
       * `Story` (texto viejo servido desde el chunk SSR cacheado del dev)
       * seguía reportándose entero.
       */
      suppressHydrationWarning
    >
      <head>
        {/*
         * Anti-flash de tema (Task 9, MECANISMO DE ENTREGA rehecho en Task
         * 31). Un `<head>` explícito en el layout raíz es soportado por
         * Next.js a propósito para justo este caso: la propia documentación
         * oficial de Next ("Preventing flash before hydration",
         * docs/01-app/02-guides/preventing-flash-before-hydration.mdx) usa
         * EXACTAMENTE este patrón —`<head><script dangerouslySetInnerHTML=
         * {{__html: "..."}} /></head>`— como el ejemplo canónico de anti-
         * flash de tema. "No añadas `<head>` a mano" (la advertencia general
         * de la guía de metadata) es sobre `<title>`/`<meta>`, que SÍ cubre
         * la Metadata API; un `<script>` de arranque no lo cubre ("Unsupported
         * Metadata" de esa misma guía lo lista explícitamente), así que aquí
         * SÍ es la vía correcta -- Next fusiona este `<head>` con el que
         * genera a partir de `metadata`/`viewport` (de arriba) en uno solo,
         * verificado leyendo `out/index.html`: un único `<head>`, con
         * `<title>`/`<meta>` Y este `<script>` dentro.
         *
         * POR QUÉ NO `next/script strategy="beforeInteractive"` (usado hasta
         * Task 31, RETIRADO): verificado leyendo `out/index.html` literal
         * tras `pnpm build` bajo `output: "export"` (no asumido de la prosa
         * de la documentación, pensada para SSR clásico) -- NO se sirve como
         * `<script>` bloqueante dentro de `<head>`. Vive como
         * `self.__next_s.push(...)`, un `<script>` síncrono normal pero como
         * PRIMER hijo de `<body>`, que el propio runtime de Next
         * (`app-bootstrap.ts`) ejecuta como parte de un CHUNK ASÍNCRONO --
         * medido en 109-208 ms tras la navegación, bastante después de
         * `DOMContentLoaded` -- antes de hidratar, pero NO antes de que el
         * navegador pinte el HTML estático (detalle en `task/lessons.md`,
         * 2026-08-11). Con Task 9 sola esto no producía CLS observable
         * porque el `<h1>` del hero arrancaba en `opacity: 0` (escalonado de
         * entrada, gateado a la fase "chrome"): nada visible reflowaba
         * cuando el atributo llegaba tarde. Task 10 hizo ese `<h1>` visible
         * DESDE el primer pintado (candidato a LCP) -- y a partir de ahí, la
         * llegada tardía de `data-theme` SÍ reflowaba contenido ya pintado
         * (el factor `vw` del título y las 4 variables `-lg` de alineación,
         * `GlobalStyles.tsx`): el CLS 0,0799 de la baseline REAPARECÍA en
         * todo camino que resolviera a tema oscuro (Task 31, gate F2). Un
         * `<script>` literal, síncrono, dentro de `<head>` no depende de
         * ningún chunk JS: el propio parser HTML lo ejecuta en línea,
         * bloqueando el resto del documento hasta terminar -- garantía real
         * de "antes del primer pintado del `<body>`", no solo "antes de
         * hidratar".
         *
         * `dangerouslySetInnerHTML` es deliberado y seguro, mismo criterio
         * que documenta `JsonLdScript.tsx`: `buildThemeBootstrapScript()`
         * construye el texto ÍNTEGRAMENTE en este repo, a partir de código
         * propio (`resolveInitialTheme.toString()`) y de una constante
         * propia (`STORAGE_KEYS.theme`) — nunca de entrada de usuario ni de
         * una respuesta de red — así que no hay nada que un atacante pueda
         * inyectar a través de esta prop. El script en sí es mínimo (una
         * IIFE que lee `localStorage`/`matchMedia` y fija un atributo) y no
         * toca el DOM más allá de `document.documentElement`.
         *
         * Qué hace: resuelve `localStorage` → `prefers-color-scheme` →
         * "light" (decisión D-C, vinculante: storage gana a prefers) y fija
         * `data-theme` en `<html>`. `ThemeProvider` SIGUE arrancando en
         * "light" en su propio estado de React, en TODOS los casos (no
         * puede leer `localStorage` durante el render sin romper el export
         * estático ni arriesgar un mismatch de hidratación estructural en
         * las secciones que montan un componente hijo distinto por tema —
         * Story/Features/Journey/Contact, regla 6 de RULES.md) — este
         * script no sustituye la corrección post-montaje de ese proveedor,
         * la hace invisible allí donde SÍ está cubierta.
         *
         * CORRECCIÓN 2026-08-14: este bloque afirmaba que NO hacía falta
         * `suppressHydrationWarning` en `<html>` porque "este layout nunca
         * renderiza `data-theme` como prop de React, así que React no tiene
         * ninguna expectativa sobre ese atributo". **Es falso**, y lo refutó
         * la consola del dueño con Next 16.2.11: React no compara solo los
         * atributos que él declaró, compara el elemento hidratado ENTERO, así
         * que un `data-theme` de más lo hace avisar en cada carga. La
         * afirmación "verificado sin warnings en consola" del informe de la
         * Task 31 no se sostiene hoy. La prop está puesta arriba, con el
         * razonamiento de su alcance y la verificación que lo respalda.
         *
         * ALCANCE REAL, declarado explícitamente (no todo lo que cambia con
         * el tema queda cubierto pre-pintado):
         *   - CUBIERTO: `body { background-color; color }` y las 6
         *     variables CSS de geometría de Hero (`--hero-title-vw` y
         *     compañía, `GlobalStyles.tsx`) — las únicas propiedades que
         *     cambian TAMAÑO/POSICIÓN entre temas. Con la entrega de Task
         *     31, cubierto de verdad ANTES del primer pintado en los 5
         *     caminos de resolución medidos (storage/prefers × control),
         *     no solo cuando el contenido protegido resultaba invisible por
         *     casualidad.
         *   - NO CUBIERTO, y verificado que NO hace falta cubrirlo:
         *     `HeroBackdrop.tsx` elige Aura (claro) vs Eye (oscuro) por
         *     `themeName` de React, que arranca en "light" y se corrige
         *     tras montar — pero el propio stack "pending" (el estado en el
         *     que arranca SIEMPRE, sea cual sea el tema) ya declara
         *     `opacity: 0` en `aura.parts.tsx`/`eye.parts.tsx` (mecanismo
         *     preexistente a esta tarea, no introducido por ella). Medido
         *     en navegador real con un muestreo por `requestAnimationFrame`
         *     (566 muestras a lo largo de 3,5s, visitante de sistema
         *     oscuro sin storage): la opacidad máxima observada de las
         *     capas de Aura fue **0** en TODAS las muestras — nunca llega a
         *     pintarse.
         *   - NO CUBIERTO y ACEPTADO como límite: Story/Features/Journey/
         *     Contact siguen montando su rama CLARA hasta que
         *     `ThemeProvider` corrige tras hidratar. No contribuyen al CLS
         *     medido (están fuera del viewport en el instante del shift,
         *     scroll 0), pero un visitante que scrollee de inmediato podría
         *     ver un instante de rama clara. Cerrarlo del todo exigiría o
         *     bien tolerar un mismatch de hidratación estructural
         *     (descartado, ver arriba) o bien un rediseño de "doble render
         *     + reveal por CSS" que excede el alcance de esta tarea —
         *     candidato a una tarea futura, no un hueco silencioso.
         *
         * LAS PRECARGAS QUE VIAJAN EN ESTE SCRIPT SE ACOTAN A LA HOME DESDE
         * DENTRO DEL PROPIO SCRIPT (2026-08-18, crítica #11), no desde aquí:
         * este es el layout RAÍZ y no sabe qué ruta está renderizando (no
         * recibe `params` que la identifiquen y, bajo `output: "export"`, hay
         * un único layout compilado para la home, las dos legales y la 404).
         * Quien conoce la ruta es el navegador, así que la guarda es
         * `location.pathname` en tiempo de ejecución. Medido antes del
         * arreglo: 253.833 B de arte del hero descargados en `/privacidad`
         * —el 41 % de esa página— sin que nada de eso llegue a pintarse.
         * Las dos constantes de abajo se siguen pasando enteras: es el
         * script, no esta llamada, quien decide si emitirlas. El porqué
         * completo y la normalización de pathname viven en el docblock de
         * `buildThemeBootstrapScript`.
         */}
        <script
          id="theme-bootstrap"
          dangerouslySetInnerHTML={{
            __html: buildThemeBootstrapScript({
              light: AURA_PRELOADS,
              dark: EYE_PRELOADS,
            }),
          }}
        />
      </head>
      <body>
        {/* Datos estructurados de sitio, una sola vez para todas las rutas.
            La `WebPage` concreta la declara cada página legal en su propio
            `page.tsx`. */}
        <JsonLdScript
          id="jsonld-organization"
          data={[organizationJsonLd(), webSiteJsonLd()]}
        />
        {/* `Providers` ya NO se monta aquí: lo monta el layout de cada rama de
            idioma (`app/(es)/layout.tsx`, `app/en/layout.tsx`) y, por su
            cuenta, `app/not-found.tsx`. Este layout no sabe qué ruta está
            renderizando, así que no puede elegir el idioma del proveedor —
            el porqué completo está en el docblock de `app/providers.tsx`. */}
        {children}
      </body>
    </html>
  );
}
