import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactElement, ReactNode } from "react";
import { SITE } from "@/config/site";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { organizationJsonLd, webSiteJsonLd } from "@/seo/jsonLd";
import { buildMetadata } from "@/seo/metadata";
import { buildThemeBootstrapScript } from "@/theme/resolveTheme";
import { Providers } from "./providers";

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
 * La metadata del layout hace DOS cosas distintas que conviene no confundir:
 *
 * 1. `metadataBase` es lo único que las páginas hijas HEREDAN de verdad y
 *    necesitan. Es la base con la que Next resuelve a URL absoluta la imagen
 *    que genera `app/opengraph-image.tsx`; sin ella, `og:image` saldría con
 *    una ruta relativa que ningún rastreador puede seguir.
 * 2. El resto (`buildMetadata({ path: "/" })`) es la metadata DE LA HOME.
 *    No es un "valor por defecto" que las legales completen: en esta versión
 *    de Next el objeto `openGraph` del hijo SUSTITUYE entero al del padre
 *    (ver el docblock de `src/seo/metadata.ts`, con la evidencia en
 *    `node_modules`), así que cada una de las DOS páginas legales (ver
 *    `LEGAL_ROUTE_KEYS`, `src/config/site.ts`; eran cuatro hasta el
 *    2026-08-08) declara el suyo completo por su cuenta. Aquí solo queda el
 *    de `/`, que no tiene `page.tsx` con metadata propia.
 *
 * `title` sale de `SITE.homeTitle`, NO de `SITE.name` (cambio del
 * 2026-08-05). Pasar la marca como título activaba el caso especial de
 * `buildMetadata()` -- título === marca, no se añade sufijo, para no producir
 * "VoidToInfinite · VoidToInfinite" -- y el efecto colateral era que el
 * `<title>` de la home quedaba en la marca desnuda, sin una sola palabra
 * sobre qué es el sitio. Ese mismo valor alimenta el `<title>`, el
 * `og:title` y el `twitter:title` (ver `buildMetadata`), así que la carencia
 * se repetía en la pestaña, en el resultado de búsqueda y en cada vista
 * previa compartida. Con `homeTitle` el resultado es
 * "Aprendizaje, imaginación y juego · VoidToInfinite"; el caso especial de
 * `buildMetadata` sigue existiendo y sigue cubierto por su propio test, solo
 * que esta ruta ya no lo ejerce.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  ...buildMetadata({
    path: "/",
    title: SITE.homeTitle,
    description: SITE.description,
  }),
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
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#280739" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    /*
     * `lang="es"` es el valor del HTML PRERENDERIZADO, que es el que ve un
     * rastreador y el correcto mientras nadie cambie de idioma. Cuando el
     * visitante pasa a inglés, quien actualiza este atributo es
     * `I18nProvider` (spec D18): este layout es un Server Component y el
     * idioma elegido solo se conoce en cliente, así que aquí no se puede
     * resolver. Sin esa sincronización, un lector de pantalla seguiría
     * pronunciando el contenido inglés con fonética española -- incumplimiento
     * de WCAG 3.1.1 (nivel A).
     *
     * `data-scroll-behavior="smooth"`: Next detecta `scroll-behavior: smooth`
     * en `html` (declarado a propósito en `GlobalStyles.tsx` para los saltos
     * a ancla del CTA del hero y para el `scrollTo({ top: 0, behavior:
     * "smooth" })` de `useThemeScrollReset`) y, sin este atributo, avisa en
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
    >
      <body>
        {/*
         * Anti-flash de tema (Task 9). `strategy="beforeInteractive"` es la
         * vía que Next.js documenta para scripts que tienen que correr ANTES
         * de que React hidrate. Verificado leyendo `out/index.html` literal
         * tras `pnpm build` (no asumido de la prosa de la documentación,
         * pensada para SSR clásico): NO se sirve como `<script>` bloqueante
         * dentro de `<head>` -- vive como `self.__next_s.push(...)`, un
         * `<script>` síncrono normal pero como PRIMER hijo de `<body>`, que
         * el propio runtime de Next (`app-bootstrap.ts`) ejecuta ANTES de
         * hidratar, no necesariamente antes de cualquier pintado del HTML
         * estático (detalle completo en `task/lessons.md`, 2026-08-11).
         * Sigue funcionando bajo `output: "export"`: es HTML/JS plano en el
         * fichero estático, no depende de ninguna ruta de servidor.
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
         * ALCANCE REAL, declarado explícitamente (no todo lo que cambia con
         * el tema queda cubierto pre-pintado):
         *   - CUBIERTO: `body { background-color; color }` y las 6
         *     variables CSS de geometría de Hero (`--hero-title-vw` y
         *     compañía, `GlobalStyles.tsx`) — las únicas propiedades que
         *     cambian TAMAÑO/POSICIÓN entre temas y que, sin este
         *     mecanismo, causaban el CLS 0,0799 medido (baseline spec 3.1;
         *     ahora 0, verificado con PerformanceObserver en navegador
         *     real, ver `task-9-report.md`).
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
         *   - NO CUBIERTO y ACEPTADO como límite de esta tarea:
         *     Story/Features/Journey/Contact siguen montando su rama CLARA
         *     hasta que `ThemeProvider` corrige tras hidratar. No
         *     contribuyen al CLS medido (están fuera del viewport en el
         *     instante del shift, scroll 0), pero un visitante que
         *     scrollee de inmediato podría ver un instante de rama clara.
         *     Cerrarlo del todo exigiría o bien tolerar un mismatch de
         *     hidratación estructural (descartado, ver arriba) o bien un
         *     rediseño de "doble render + reveal por CSS" que excede el
         *     alcance de Task 9 — candidato a una tarea futura, no un hueco
         *     silencioso.
         */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }}
        />
        {/* Datos estructurados de sitio, una sola vez para todas las rutas.
            La `WebPage` concreta la declara cada página legal en su propio
            `page.tsx`. */}
        <JsonLdScript
          id="jsonld-organization"
          data={[organizationJsonLd(), webSiteJsonLd()]}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
