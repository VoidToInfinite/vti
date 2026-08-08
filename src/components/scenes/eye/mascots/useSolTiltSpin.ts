"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { SOL_TILT_MAX_DEG } from "./Sol.constants";

export interface SolTiltSpin {
  hitRef: RefObject<HTMLDivElement | null>;
  tiltRef: RefObject<HTMLDivElement | null>;
  spinRef: RefObject<HTMLDivElement | null>;
  spinning: boolean;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Inclinacion hacia el cursor y giro al click del mascota Sol, portado desde
 * `vti-sdk` (`src/widgets/landing-fx/useSolTiltSpin.ts`).
 *
 * Los listeners se registran de forma imperativa con `addEventListener`, no
 * como props de React: la inclinacion se escribe directamente en el
 * `transform` en linea del elemento en cada frame de movimiento, sin pasar por
 * estado ni re-render (misma regla que el gaze del ojo, spec §13). `spinning`
 * si es estado porque ademas gobierna el CSS via `data-spinning`.
 *
 * El click dispara el cambio de cara SIEMPRE; lo unico que se salta bajo
 * reduced-motion es el floreo de giro y la inclinacion.
 */
export function useSolTiltSpin(onToggle: () => void): SolTiltSpin {
  const hitRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const spinningRef = useRef(false);
  const [spinning, setSpinning] = useState(false);
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(() => {
    const hit = hitRef.current;
    const tilt = tiltRef.current;
    const spin = spinRef.current;
    if (!hit || !tilt || !spin) return;

    const handleMouseMove = (e: MouseEvent): void => {
      // La inclinacion ambiental es decorativa: se salta bajo reduced-motion
      // (el cambio de cara al click sigue funcionando).
      if (prefersReducedMotion()) return;
      const rect = hit.getBoundingClientRect();
      const px = (e.clientX - rect.left) / (rect.width || 1) - 0.5;
      const py = (e.clientY - rect.top) / (rect.height || 1) - 0.5;
      const rx = (-py * SOL_TILT_MAX_DEG * 2).toFixed(2);
      const ry = (px * SOL_TILT_MAX_DEG * 2).toFixed(2);
      tilt.style.transition = "transform 140ms ease-out";
      tilt.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.07)`;
    };

    const handleMouseLeave = (): void => {
      if (prefersReducedMotion()) return;
      tilt.style.transition = "transform 480ms cubic-bezier(0.4, 0, 0.2, 1)";
      tilt.style.transform = "";
    };

    const handleClick = (): void => {
      onToggleRef.current();
      if (prefersReducedMotion() || spinningRef.current) return;
      spinningRef.current = true;
      setSpinning(true);
    };

    const handleAnimationEnd = (e: Event): void => {
      if (e.target !== spin) return;
      spinningRef.current = false;
      setSpinning(false);
    };

    hit.addEventListener("mousemove", handleMouseMove);
    hit.addEventListener("mouseleave", handleMouseLeave);
    hit.addEventListener("click", handleClick);
    spin.addEventListener("animationend", handleAnimationEnd);

    return () => {
      hit.removeEventListener("mousemove", handleMouseMove);
      hit.removeEventListener("mouseleave", handleMouseLeave);
      hit.removeEventListener("click", handleClick);
      spin.removeEventListener("animationend", handleAnimationEnd);
    };
  }, []);

  return { hitRef, tiltRef, spinRef, spinning };
}
