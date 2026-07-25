export const zIndex = {
  base: 0,
  raised: 10,
  stickyNav: 100,
  dropdown: 200,
  overlay: 900,
  modal: 1000,
  toast: 1100,
  max: 9999,
} as const;
export type ZKey = keyof typeof zIndex;
