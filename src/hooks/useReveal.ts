import { useCallback, useRef, useState } from "react";

export function useReveal<T extends Element>(
  opts: { threshold?: number; once?: boolean } = {},
): { ref: (node: T | null) => void; revealed: boolean } {
  const { threshold = 0.2, once = true } = opts;
  const [revealed, setRevealed] = useState(false);
  const obs = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      obs.current?.disconnect();
      if (!node) return;
      obs.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) obs.current?.disconnect();
          } else if (!once) setRevealed(false);
        },
        { threshold },
      );
      obs.current.observe(node);
    },
    [threshold, once],
  );

  return { ref, revealed };
}
