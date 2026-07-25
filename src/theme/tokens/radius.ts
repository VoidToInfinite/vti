export const radius = {
  "xs": "2px",
  "sm": "4px",
  "md": "8px",
  "lg": "0.75rem",
  "xl": "1rem",
  "2xl": "1.5rem",
  "full": "9999px",
} as const;
export type RadiusKey = keyof typeof radius;
