export const motion = {
  duration: {
    instant: "0ms",
    fast: "100ms",
    base: "200ms",
    slow: "320ms",
    slower: "480ms",
    ambient: "1500ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  },
} as const;
