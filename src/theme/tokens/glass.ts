export interface Glass {
  blur: string;
  bg: string;
  border: string;
}

export const glassLight: Glass = {
  blur: "blur(14px)",
  bg: "oklch(1 0 0 / 0.68)",
  border: "1px solid oklch(1 0 0 / 0.12)",
};

export const glassDark: Glass = {
  blur: "blur(14px)",
  bg: "oklch(0.178 0 0 / 0.68)",
  border: "1px solid oklch(1 0 0 / 0.08)",
};
