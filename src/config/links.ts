import { ROUTES } from "@/config/site";

/**
 * Destinos de los CTA y de los enlaces del pie.
 *
 * Conviven DOS regímenes, y la diferencia importa al consumidor: los
 * destinos EXTERNOS llevan esquema (`https:`, `mailto:`) y se abren en
 * pestaña nueva con `rel="noopener noreferrer"`; los INTERNOS empiezan por
 * barra y se navegan con `next/link`, sin `target`.
 *
 * Los legales dejaron de ser marcadores `example.invalid` el 2026-08-05: esa
 * entrega creó las páginas reales, así que apuntan a las rutas de `ROUTES`
 * (fuente de verdad única, `src/config/site.ts`) en vez de repetir aquí las
 * cadenas. Repetirlas habría dejado dos sitios que corregir el día que una
 * ruta cambie de slug, y el sitemap habría seguido apuntando a la vieja sin
 * que nada fallara.
 *
 * Quedan DOS, no cuatro: `terms` y `accessibility` se retiraron el 2026-08-08
 * junto con sus páginas — el porqué está en `LEGAL_ROUTE_KEYS`
 * (`src/config/site.ts`), que es su dueño.
 *
 * Sigue vigente la regla que este fichero estrenó: un destino que aún no se
 * conoce NO se inventa. Se marca con el TLD reservado `example.invalid`
 * (RFC 2606) para que un marcador olvidado falle de forma visible en lugar
 * de llevar a un destino equivocado. Hoy no queda ninguno. Al añadir uno,
 * actualiza también `links.test.ts`.
 */
export const links = {
  playground: "https://dev.voidtoinfinite.com",
  github: "https://github.com/voidtoinfinite",
  discord: "https://discord.gg/CuGhqdG3g3",
  email: "mailto:hello@voidtoinfinite.com",
  /* Destino público del SDK (VTI - SDK), consumido por el grupo "resources"
     del modelo de navegación compartido (`src/config/navigation.ts`).
     Externo -- se abre con `target="_blank"` + `rel="noopener noreferrer"`,
     igual que el resto de destinos que abandonan el sitio.

     SUSTITUYE a `docs` y `guides` (entrega 2026-08-05), retiradas aquí: las
     tres claves apuntaban a la MISMA URL y sus dos únicos consumidores eran
     los enlaces «Documentación» y «Guías» de la columna de Recursos del pie,
     que esta entrega reduce a un solo enlace por encargo del usuario. Tres
     nombres para un mismo destino, dos de ellos ya sin consumidor, son
     exactamente la clase de configuración muerta que se copia por costumbre
     el día que alguien necesita "otro enlace externo". `playground` se
     conserva porque SÍ tiene consumidor propio y distinto: el CTA primario
     del hero (`Hero.tsx`). */
  sdk: "https://dev.voidtoinfinite.com",
  privacy: ROUTES.privacy,
  legalNotice: ROUTES.legalNotice,
} as const;

export type LinkKey = keyof typeof links;

/**
 * La dirección de correo SIN el esquema `mailto:`, para pintarla como texto
 * (Task 16, fix round, 2026-08-11).
 *
 * Existe porque el mismo `links.email.replace(/^mailto:/, "")` estaba escrito
 * a mano en tres sitios (dos veces en `Contact.tsx` -- el párrafo del panel de
 * recuperación y el valor que copia el portapapeles -- y una en el pie, al
 * devolver la dirección a la vista): regla 13 de RULES.md, un mismo valor
 * derivado repetido deja de ser un literal y pasa a ser una constante. Se
 * deriva de `links.email`, nunca se reescribe: así no puede divergir de él.
 *
 * NO entra dentro del objeto `links`: ese es el mapa de DESTINOS navegables y
 * su conjunto de claves está atado por un contrato cerrado (`links.test.ts`).
 * Esto no es un destino, es la representación textual de uno.
 */
export const EMAIL_ADDRESS = links.email.replace(/^mailto:/, "");

/**
 * Claves cuyo destino es una ruta INTERNA de este mismo sitio. El pie las usa
 * para decidir entre `next/link` y un ancla con `target="_blank"`: no es una
 * decisión estética, un `target="_blank"` sobre una ruta propia rompe el
 * botón "atrás" y cambia de contexto sin avisar (WCAG 3.2.5).
 */
export const INTERNAL_LINK_KEYS = [
  "privacy",
  "legalNotice",
] as const satisfies readonly LinkKey[];

export type InternalLinkKey = (typeof INTERNAL_LINK_KEYS)[number];
