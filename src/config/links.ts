/**
 * Destinos de los CTA del viaje.
 *
 * Los marcados `por-completar` son entradas pendientes del usuario (spec §19):
 * NO se inventan URLs. Se usa el TLD reservado `example.invalid` (RFC 2606) para
 * garantizar que un placeholder olvidado falle de forma visible (no resuelve a un
 * sitio real) en lugar de llevar al usuario a un destino equivocado.
 * Al sustituirlos, actualiza también `links.test.ts`.
 */
export const links = {
  playground: "https://example.invalid/por-completar-playground",
  docs: "https://example.invalid/por-completar-docs",
  github: "https://github.com/voidtoinfinite",
  discord: "https://discord.gg/CuGhqdG3g3",
  email: "mailto:hello@voidtoinfinite.com",
  guides: "https://example.invalid/por-completar-guides",
  accessibility: "https://example.invalid/por-completar-accessibility",
  privacy: "https://example.invalid/por-completar-privacy",
  terms: "https://example.invalid/por-completar-terms",
} as const;

export type LinkKey = keyof typeof links;
