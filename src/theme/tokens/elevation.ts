export const elevation = {
  0: "none",
  1: "0 1px 2px oklch(0 0 0 / 0.06)",
  2: "0 4px 12px oklch(0 0 0 / 0.10)",
  3: "0 12px 32px oklch(0 0 0 / 0.16)",
  4: "0 20px 48px oklch(0 0 0 / 0.20)",
} as const;
export type ElevationKey = keyof typeof elevation;
