"use client";
import { useEffect, useId, useRef, type ReactElement } from "react";
import { usePointer } from "@/hooks/usePointer";
import {
  ALMOND,
  ScClip,
  ScClipDefs,
  ScEyeball,
  ScGlint,
  ScIris,
  ScLidShadow,
  ScOutline,
  ScPupil,
  ScRing,
  ScSocket,
  ScSwirl,
  ScUniverse,
} from "./eye.parts";

/** Amplitudes de parallax en px. El iris se mueve mas que el globo: eso es lo
 *  que produce la sensacion de profundidad dentro del ojo (spec §7). */
const AMP = { eyeball: 14, iris: 40, glint: -16 } as const;

export interface EyeProps {
  className?: string;
}

/**
 * El ojo cosmico: silueta de almendra, nebulosa interior, iris que respira y
 * remolino que gira, pupila que sostiene la marca (la marca real la monta el
 * Hero, T5). Puro CSS/DOM -- sin WebGL (spec §1): `clip-path` para la
 * silueta, gradientes para la nebulosa, `conic-gradient` para el remolino,
 * keyframes CSS para respirar/girar, y un unico rAF para el seguimiento del
 * cursor.
 *
 * Todo el subarbol es decorativo (`aria-hidden="true"`): nada de lo que
 * comunica el ojo vive solo aqui, el contenido real esta en el DOM del Hero.
 */
export function Eye({ className }: EyeProps): ReactElement {
  const pointer = usePointer();
  const eyeball = useRef<HTMLDivElement>(null);
  const iris = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLSpanElement>(null);

  // useId() incluye ":" (p.ej. ":r0:"), valido en un atributo id HTML pero
  // fragil como referencia `url(#...)` en algunos motores. Se despoja para
  // usarlo con seguridad como fragment identifier.
  const clipId = `eye-almond-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (!pointer.enabled) return;
    let raf = 0;
    // Un solo rAF escribe transforms directamente en el DOM. React NUNCA
    // re-renderiza por frame (spec §13).
    const tick = (): void => {
      const x = pointer.x.current;
      const y = pointer.y.current;
      if (eyeball.current)
        eyeball.current.style.transform = `translate(${x * AMP.eyeball}px, ${y * (AMP.eyeball * 0.64)}px)`;
      if (iris.current)
        iris.current.style.transform = `translate(${x * AMP.iris}px, ${y * (AMP.iris * 0.7)}px)`;
      if (glint.current)
        glint.current.style.transform = `translate(${x * AMP.glint}px, ${y * (AMP.glint * 0.7)}px)`;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [pointer]);

  return (
    <ScSocket
      className={className}
      aria-hidden="true"
    >
      <ScClipDefs>
        <defs>
          <clipPath
            id={clipId}
            clipPathUnits="objectBoundingBox"
          >
            <path d={ALMOND} />
          </clipPath>
        </defs>
      </ScClipDefs>
      <ScClip $clipId={clipId}>
        <ScUniverse data-part="universe" />
        <ScEyeball ref={eyeball}>
          <ScIris
            ref={iris}
            data-part="iris"
          >
            <ScSwirl />
            <ScRing
              $inset="0"
              $tint="oklch(0.66 0.142 235.851 / 0.5)"
            />
            <ScRing
              $inset="10%"
              $tint="oklch(0.66 0.233 311.928 / 0.45)"
            />
            <ScRing
              $inset="21%"
              $tint="oklch(0.8 0.117 235.851 / 0.4)"
            />
            <ScPupil data-part="pupil" />
          </ScIris>
          <ScGlint
            ref={glint}
            $size="7%"
            $top="24%"
            $left="34%"
          />
        </ScEyeball>
        <ScLidShadow />
      </ScClip>
      <ScOutline
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <path d={ALMOND} />
      </ScOutline>
    </ScSocket>
  );
}
