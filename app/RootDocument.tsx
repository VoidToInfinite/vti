import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
import type { Locale } from "@/config/site";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { founderJsonLd, organizationJsonLd, webSiteJsonLd } from "@/seo/jsonLd";
import { AURA_PRELOADS } from "@/components/scenes/aura/aura.layers";
import { EYE_PRELOADS } from "@/components/scenes/eye/eye.layers";
import { buildThemeBootstrapScript } from "@/theme/resolveTheme";
import { Providers } from "./providers";

/*
 * EL AVISO «woff2 preloaded but not used» YA ESTÁ IDENTIFICADO — NO ES UN PESO
 * NI UN SUBSET DE MÁS, Y POR ESO SIGUE ABIERTO (crítica externa #15, 2026-09-02,
 * hallazgo A P2-8; el aviso lo arrastra el repo al menos desde el 2026-08-10,
 * declarado entonces como «preexistente y ajeno» en el informe de la Task 14).
 *
 * QUÉ FICHERO ES, medido sobre el build de producción versionado en `out/`
 * (`out/index.html` + `out/_next/static/chunks/416_*.css`, del 2026-09-02), no
 * supuesto: `/_next/static/media/c47649aa31f9e140-s.p.*.woff2`, 34.664 B. Su
 * `@font-face` dice `font-family: Hanken Grotesk; font-style: normal;
 * font-weight: 100 900; unicode-range: U+??,U+131,U+152-153,…` — es decir, el
 * subset LATIN de la fuente de cuerpo de todo el sitio. No es un peso muerto ni
 * un subset exótico: es la única cara que el sitio pinta.
 *
 * LAS DOS SALIDAS OBVIAS ESTÁN DESCARTADAS POR ESA MEDICIÓN:
 *
 * - «Retirar el peso/subset que nadie usa»: el `<head>` emite UN solo preload
 *   de fuente y es el de esta cara. Las otras tres caras de Hanken
 *   (cyrillic-ext, vietnamese, latin-ext) se declaran pero NO se precargan, así
 *   que no pueden ser el aviso.
 * - «`preload: false` en la fuente secundaria»: `JetBrains_Mono`, justo debajo,
 *   ya lo lleva desde el 2026-08-08.
 *
 * QUEDA `preload: false` AQUÍ, Y NO SE HACE: silenciaría el aviso quitando la
 * precarga de la fuente que el PRIMER pintado necesita, con la carga en vuelo
 * desde el `<head>`. Es un parche de síntoma que no explica el síntoma, y su
 * coste es justo la métrica que la ola I compró (LCP 5,3 s → 1,3 s). Todo lo
 * demás está bien cableado y verificado en el mismo build: el CSS del
 * `@font-face` entra como hoja BLOQUEANTE en el `<head>`, `<html>` lleva la
 * clase que declara `--font-body: "Hanken Grotesk", "Hanken Grotesk Fallback"`
 * y el HTML horneado ya trae 22 declaraciones `font-family: var(--font-body)`.
 * Sobre el papel, la cara precargada se usa en el primer pintado.
 *
 * LO QUE FALTA, y hace falta un navegador real contra un build servido para
 * discriminarlo (fuera del alcance de la sesión que escribe esto): si el
 * preload se consume TARDE en vez de no consumirse — y entonces lo que hay que
 * mirar es qué compite con él en el `<head>`, no esta declaración — o si el
 * aviso es un artefacto de medir con la pestaña oculta (`visibilityState ===
 * "hidden"`: sin pintado no hay glifo que pedir, así que la precarga no se
 * empareja nunca y Chrome dice exactamente esto). El repo ya cerró la MISMA
 * familia de aviso una vez por la primera vía, y la historia está escrita en el
 * docblock de `buildThemeBootstrapScript` (`src/theme/resolveTheme.ts`): eran
 * cuatro precargas de imagen emitidas en rutas que no pintaban ese arte.
 *
 * LAS FUENTES SE DECLARAN AQUÍ Y NO EN CADA RAÍZ (2026-09-06). Desde que hay
 * tres ficheros de convención que renderizan documento —los dos root layouts de
 * idioma y `app/global-not-found.tsx`—, repetir estas dos llamadas en cada uno
 * generaría tres instancias de fuente distintas para la misma cara: `next/font`
 * emite CSS y ficheros por CALL SITE, no por familia. Con una sola llamada,
 * compartida por importación, el sitio sigue sirviendo un único `@font-face` y
 * un único preload.
 */
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

/**
 * EL DOCUMENTO DEL SITIO, UNO SOLO PARA LAS TRES RAÍCES (2026-09-06).
 *
 * Este componente NO es un fichero de convención de Next: es el cuerpo común
 * que montan las tres raíces reales del árbol —`app/(es)/layout.tsx`,
 * `app/en/layout.tsx` y `app/global-not-found.tsx`—, cada una pasando su
 * `lang`. Todo lo que antes vivía en el root layout único (`app/layout.tsx`,
 * retirado en esta misma entrega) está aquí sin cambiar: las fuentes, los
 * atributos de `<html>`, el script anti-flash del `<head>`, los datos
 * estructurados de sitio y `Providers`. Lo único que se parametriza es el
 * idioma del documento.
 *
 * Que sea un Server Component importado por las tres raíces —y no tres copias—
 * es además lo que mantiene UNA sola frontera de cliente sobre `Providers`: la
 * regla de peso que documenta `app/providers.tsx` («todo lo que monten a la vez
 * una rama de idioma y la 404 tiene que colgar de un ancestro común») se cumple
 * por importación, no por posición en el árbol de rutas.
 */
export function RootDocument({
  lang,
  children,
}: {
  /** Idioma que este documento hornea en `<html lang>`. */
  readonly lang: Locale;
  readonly children: ReactNode;
}): ReactElement {
  return (
    /*
     * CADA RAMA DE IDIOMA HORNEA SU PROPIO `lang` DESDE EL 2026-09-06
     * (decisión del dueño; WCAG 3.1.1 nivel A, P1 de la crítica externa #19).
     *
     * ANTES: las seis rutas del sitio y la 404 se servían con `lang="es"`,
     * inglesas incluidas. El motivo era real y estaba escrito: bajo App Router
     * dos `<html lang>` distintos exigen DOS root layouts —y un root layout es,
     * por definición, un `layout` sin `layout` padre—, así que había que borrar
     * `app/layout.tsx`; y eso lo bloqueaba la 404 propia del repo, porque la
     * entrada `/_not-found` resuelve su `layout` en el segmento RAÍZ (`app/`) y
     * sin ninguno el build sale por `log.error("... doesn't have a root layout
     * ...")` + `process.exit(1)`.
     *
     * QUÉ LO DESBLOQUEA, verificado leyendo el paquete instalado (Next
     * 16.2.11), no supuesto: `experimental.globalNotFound: true` en
     * `next.config.ts` más `app/global-not-found.tsx`. En
     * `next/dist/build/webpack/loaders/next-app-loader/index.js`, con la
     * bandera activa, la rama `if (isNotFoundRoute && isGlobalNotFoundEnabled)`
     * RETIRA el `layout` de la entrada `/_not-found` y lo sustituye por el
     * propio `global-not-found`; y la guarda que mata el build
     * (`if (!treeCodeResult.rootLayout && !isGlobalNotFoundPath && ...)`) deja
     * de aplicarse a esa entrada. Con la 404 fuera de la ecuación, `app/` se
     * queda sin `layout.tsx` y los dos layouts de rama pasan a ser root layouts
     * de pleno derecho: cada uno renderiza su propio `<html>`.
     *
     * LO QUE SIGUE SIENDO CIERTO de la nota anterior: `/en/*` ya tenía el
     * contenido, el `<title>`, la canónica, el `og:locale`, el `hreflang` y el
     * sitemap en inglés desde el 2026-08-18, e `I18nProvider` corregía este
     * atributo tras montar. Lo que faltaba —y es lo que cierra esta entrega— es
     * el atributo del HTML SERVIDO EN CRUDO, que es lo que lee un rastreador
     * sin ejecutar JavaScript y lo que un lector de pantalla usa antes de que
     * hidrate nada.
     *
     * LA 404 HORNEA `es` A PROPÓSITO: bajo `output: "export"` existe un único
     * `out/404.html` para las dos ramas y su contenido horneado ES castellano,
     * así que `lang="es"` describe lo que el documento realmente dice. En una
     * URL rota bajo `/en/`, `NotFoundLocaleShell` resuelve el idioma desde el
     * camino e `I18nProvider` escribe `lang="en"` en el DOM vivo (candado en
     * `app/not-found.test.tsx`).
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
      lang={lang}
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
         * genera a partir de `metadata`/`viewport` (`app/rootMetadata.ts`, que
         * las tres raíces exportan) en uno solo, verificado leyendo
         * `out/index.html`: un único `<head>`, con `<title>`/`<meta>` Y este
         * `<script>` dentro.
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
         * este documento lo comparten las seis rutas y la 404, y no sabe cuál
         * está renderizando (no recibe `params` que la identifiquen y, bajo
         * `output: "export"`, se compila una sola vez por raíz). Quien conoce
         * la ruta es el navegador, así que la guarda es `location.pathname` en
         * tiempo de ejecución. Medido antes del arreglo: 253.833 B de arte del
         * hero descargados en `/privacidad` —el 41 % de esa página— sin que
         * nada de eso llegue a pintarse. Las dos constantes de abajo se siguen
         * pasando enteras: es el script, no esta llamada, quien decide si
         * emitirlas. El porqué completo y la normalización de pathname viven
         * en el docblock de `buildThemeBootstrapScript`.
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
          data={[organizationJsonLd(), webSiteJsonLd(), founderJsonLd()]}
        />
        {/* `Providers` vuelve a montarse AQUÍ desde el 2026-08-19, y solo con
            la mitad del árbol que NO depende del idioma (registro de estilos,
            tema, estilos globales). La otra mitad —`LocaleShell`: i18next,
            `SkipLink`, `BackToTop`, `Navbar`, `Footer`— la monta cada raíz
            (`app/(es)/layout.tsx`, `app/en/layout.tsx`) y, por su cuenta,
            `app/NotFoundRoute.tsx`, porque este documento no sabe qué ruta está
            renderizando y no puede elegir idioma.

            El motivo de que la parte sin idioma tenga que estar aquí es de
            PESO, no de orden: entre el 2026-08-18 y el 2026-08-19 no hubo
            ninguna frontera de cliente en el root layout, así que los mismos
            módulos vivían en dos grupos de chunks hermanos (el de `(es)` y el
            de `/_not-found`, que viaja en el manifiesto de TODAS las páginas)
            y Turbopack los emitía dos veces: 313.928 B brotli en la portada
            frente a 285.430 B con esta partición. La medición completa y la
            regla que se deriva están en el docblock de `app/providers.tsx`. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
