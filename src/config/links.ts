/**
 * Destinos de los CTA del viaje.
 *
 * Los marcados `por-completar` son entradas pendientes del usuario (spec §19):
 * NO se inventan URLs. Al sustituirlos, actualiza también `links.test.ts`.
 */
export const links = {
  playground: "https://example.invalid/por-completar-playground",
  docs: "https://example.invalid/por-completar-docs",
  github: "https://github.com/voidtoinfinite",
  discord: "https://discord.gg/CuGhqdG3g3",
  email: "mailto:por-completar@voidtoinfinite.com",
} as const;

export type LinkKey = keyof typeof links;
