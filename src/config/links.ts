import { ROUTES } from "@/config/site";

/**
 * Destinos de los CTA y de los enlaces del pie.
 *
 * Conviven DOS regímenes, y la diferencia importa al consumidor: los
 * destinos EXTERNOS llevan esquema (`https:`, `mailto:`) y se abren en
 * pestaña nueva con `rel="noopener noreferrer"`; los INTERNOS empiezan por
 * barra y se navegan con `next/link`, sin `target`.
 *
 * Los cuatro legales dejaron de ser marcadores `example.invalid` el
 * 2026-08-05: esta entrega creó las páginas reales, así que apuntan a las
 * rutas de `ROUTES` (fuente de verdad única, `src/config/site.ts`) en vez de
 * repetir aquí las cadenas. Repetirlas habría dejado dos sitios que corregir
 * el día que una ruta cambie de slug, y el sitemap habría seguido apuntando
 * a la vieja sin que nada fallara.
 *
 * Sigue vigente la regla que este fichero estrenó: un destino que aún no se
 * conoce NO se inventa. Se marca con el TLD reservado `example.invalid`
 * (RFC 2606) para que un marcador olvidado falle de forma visible en lugar
 * de llevar a un destino equivocado. Hoy no queda ninguno. Al añadir uno,
 * actualiza también `links.test.ts`.
 */
export const links = {
  playground: "https://dev.voidtoinfinite.com",
  docs: "https://dev.voidtoinfinite.com",
  github: "https://github.com/voidtoinfinite",
  discord: "https://discord.gg/CuGhqdG3g3",
  email: "mailto:hello@voidtoinfinite.com",
  guides: "https://dev.voidtoinfinite.com",
  accessibility: ROUTES.accessibility,
  privacy: ROUTES.privacy,
  terms: ROUTES.terms,
  legalNotice: ROUTES.legalNotice,
} as const;

export type LinkKey = keyof typeof links;

/**
 * Claves cuyo destino es una ruta INTERNA de este mismo sitio. El pie las usa
 * para decidir entre `next/link` y un ancla con `target="_blank"`: no es una
 * decisión estética, un `target="_blank"` sobre una ruta propia rompe el
 * botón "atrás" y cambia de contexto sin avisar (WCAG 3.2.5).
 */
export const INTERNAL_LINK_KEYS = [
  "accessibility",
  "privacy",
  "terms",
  "legalNotice",
] as const satisfies readonly LinkKey[];

export type InternalLinkKey = (typeof INTERNAL_LINK_KEYS)[number];
