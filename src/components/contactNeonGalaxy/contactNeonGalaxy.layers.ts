/**
 * Tabla de capas de la escena "Neon Galaxy" (fondo de Contact, tema oscuro).
 * Datos (orden, profundidad de parallax) medidos y documentados en
 * `assets/contact-neon-galaxy/manifest.json`, junto a los WebP fuente. Mismo
 * criterio que `storyCosmicBeing.layers.ts`/`journeyCosmicPortal.layers.ts`/
 * `featuresCelestialGuide.layers.ts`.
 *
 * 7 capas: 1 fondo + 2 de ambientación + 3 orbes (uno por canal de contacto:
 * sobre, chat, arroba) + la figura unida al holograma del suelo y su
 * reflejo. Profundidades escalonadas (0.30/0.34/0.38) para que cada orbe
 * derive a una velocidad ligeramente distinta con el puntero.
 */

export interface ContactNeonGalaxyLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /** Ruta pública del WebP a ancho nativo (2560px, reescalado desde el
   *  3344px original). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano más cercano. */
  readonly depth: number;
}

export const CONTACT_NEON_LAYERS: readonly ContactNeonGalaxyLayer[] = [
  {
    part: "fondo",
    src: "/contact/neon-galaxy/01-fondo.webp",
    srcSmall: "/contact/neon-galaxy/01-fondo-1024.webp",
    depth: 0.04,
  },
  {
    part: "ambiente",
    src: "/contact/neon-galaxy/02-ambiente.webp",
    srcSmall: "/contact/neon-galaxy/02-ambiente-1024.webp",
    depth: 0.1,
  },
  {
    part: "estrellas",
    src: "/contact/neon-galaxy/03-estrellas.webp",
    srcSmall: "/contact/neon-galaxy/03-estrellas-1024.webp",
    depth: 0.18,
  },
  {
    part: "orb-mail",
    src: "/contact/neon-galaxy/04-orb-mail.webp",
    srcSmall: "/contact/neon-galaxy/04-orb-mail-1024.webp",
    depth: 0.3,
  },
  {
    part: "orb-chat",
    src: "/contact/neon-galaxy/05-orb-chat.webp",
    srcSmall: "/contact/neon-galaxy/05-orb-chat-1024.webp",
    depth: 0.34,
  },
  {
    part: "orb-at",
    src: "/contact/neon-galaxy/06-orb-at.webp",
    srcSmall: "/contact/neon-galaxy/06-orb-at-1024.webp",
    depth: 0.38,
  },
  {
    part: "figura-holograma",
    src: "/contact/neon-galaxy/07-figura-holograma.webp",
    srcSmall: "/contact/neon-galaxy/07-figura-holograma-1024.webp",
    depth: 0.46,
  },
] as const;

/** `sizes`: mismo criterio que las otras tres escenas oscuras. */
export const CONTACT_NEON_SIZES = "(min-width: 1280px) 1280px, 100vw";

/** Escala base común a las 7 capas: evita bordes vacíos al desplazar. */
export const CONTACT_NEON_OVERSCAN = 1.06;

/**
 * Negro-azulado del lienzo (`--void` del paquete original,
 * `parallax-neon-galaxy.html` §`:root`). Copiado VERBATIM.
 *
 * Hasta el 2026-08-02 este literal lo compartía con `FEATURES_CELESTIAL_VOID`
 * (la escena «Celestial Guide» de Features, del mismo paquete generado), y
 * antes del 2026-08-01 también con la escena de Journey. Hoy **no lo comparte
 * con ninguna**: Journey trajo su propio lienzo con `JourneyCosmicPortal`
 * (`#0b0620`) y Features hizo lo mismo con `FeaturesCelestialOrbital`
 * (`#150b2e`, spec `2026-08-02-features-overlay-celestial-orbital-design.md`,
 * D12). Que las tres coincidieran nunca fue una referencia cruzada — cada
 * sección declara su propia constante y ninguna importa la de otra — así que
 * quedarse sola no cambia nada de esta escena; solo deja de ser cierta la
 * coincidencia que este comentario documentaba.
 */
export const CONTACT_NEON_VOID = "#02040e";

/** Amplitud del parallax de puntero en px, a profundidad 1. */
export const CONTACT_NEON_POINTER_AMP = { x: 22, y: 13 } as const;

/** Amplitud del parallax de scroll en px, a profundidad 1. */
export const CONTACT_NEON_SCROLL_AMP = 70;
