import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

// OBLIGATORIO con `output: "export"` (H1, misma causa que en
// `app/sitemap.ts` y `app/robots.ts`, verificado con el paquete instalado y
// con un build real): sin esta línea, el build falla con
//   export const dynamic = "force-static"/export const revalidate not
//   configured on route "/opengraph-image" with "output: export".
// (`node_modules/next/dist/server/route-modules/app-route/module.js:153`).
// No la borres "para limpiar": es la línea cuyo olvido rompe el export
// estático.
export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Alt real, no genérico: reutiliza la descripción canónica de `SITE`
// (misma fuente que consume `buildMetadata()`) para no mantener dos frases
// de marca que puedan divergir.
export const alt = `${SITE.name} — ${SITE.description}`;

/*
 * Colores: NO se importan los tokens `oklch(...)` de `src/theme/tokens/`
 * directamente. Satori (el motor que usa `ImageResponse`, empaquetado en
 * `next/dist/compiled/@vercel/og`) soporta solo un subconjunto de CSS y no
 * hay garantía documentada de que su parser de color entienda la función
 * `oklch()`; arriesgar el build del sitio entero a esa incertidumbre por
 * ahorrarse una conversión no compensa. Los hex de abajo SÍ salen del tema:
 * son la conversión real oklch → OKLab → sRGB lineal → sRGB con gamma (el
 * mismo algoritmo, con las mismas matrices de Björn Ottosson, que ya usa
 * `src/theme/tokens/contrast.ts`) de tokens concretos del tema oscuro, no
 * colores inventados a ojo:
 *   - fondo (inicio del degradado): color.secondary[1100]
 *     (= semanticDark.bg)                                    → #280739
 *   - fondo (fin del degradado):    color.neutral[1100]       → #1A1A1C
 *   - acento de marca:              color.primary[500] (brand) → #02B7FF
 *   - texto del wordmark:           color.neutral[50]
 *     (= semanticDark.text)                                   → #FAFAFA
 *   - línea de apoyo:               color.neutral[400]
 *     (= semanticDark.textSubtle)                              → #B7B7BB
 */
const BG_FROM = "#280739";
const BG_TO = "#1A1A1C";
const BRAND = "#02B7FF";
const TEXT = "#FAFAFA";
const TEXT_SUBTLE = "#B7B7BB";

/**
 * Imagen Open Graph/Twitter generada en el build (D9, H4): 1200×630, fondo
 * oscuro con degradado de marca, wordmark grande y una línea de apoyo.
 * Composición deliberadamente sobria — legible a tamaño de miniatura en un
 * timeline o un resultado de búsqueda, sin texto pequeño que se pierda.
 *
 * Sin recursos remotos a propósito: nada de `<img src="https://…">` ni
 * fuentes de Google — un build sin red tiene que poder generar esta imagen.
 * No se pasa la opción `fonts` a `ImageResponse`: `@vercel/og` (el paquete
 * que Next empaqueta para esto) trae de fábrica `Geist-Regular.ttf` en
 * `node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf` y la usa
 * como fuente por defecto cuando no se especifica ninguna —
 * `fonts: options.fonts || defaultFonts` en
 * `node_modules/next/dist/compiled/@vercel/og/index.node.js` (función
 * `render`, línea 21413) — así que no hace falta leer ningún `.ttf` a mano
 * con `fs.readFileSync`: la fuente por defecto YA es local y ya está
 * incluida en el paquete instalado, ninguna red de por medio. Verificado con
 * un build real (ver informe de la entrega): el PNG resultante tiene texto
 * renderizado correctamente sin declarar `fonts`.
 */
export default function Image(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        backgroundImage: `linear-gradient(135deg, ${BG_FROM} 0%, ${BG_TO} 100%)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: BRAND,
            marginRight: "28px",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: "88px",
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "-2px",
          }}
        >
          {SITE.name}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "30px",
          color: TEXT_SUBTLE,
          maxWidth: "1000px",
          lineHeight: 1.4,
        }}
      >
        {SITE.description}
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
    },
  );
}
