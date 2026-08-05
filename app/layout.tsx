import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { SITE } from "@/config/site";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { organizationJsonLd, webSiteJsonLd } from "@/seo/jsonLd";
import { buildMetadata } from "@/seo/metadata";
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
 *    `node_modules`), así que cada una de las cuatro páginas legales declara
 *    el suyo completo por su cuenta. Aquí solo queda el de `/`, que no tiene
 *    `page.tsx` con metadata propia.
 *
 * `title` sale de `SITE.name`, así que `buildMetadata` no le añade sufijo de
 * marca: seria "VoidToInfinite · VoidToInfinite".
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  ...buildMetadata({
    path: "/",
    title: SITE.name,
    description: SITE.description,
  }),
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
     */
    <html
      lang={SITE.lang}
      className={`${fontBody.variable} ${fontMono.variable}`}
    >
      <body>
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
