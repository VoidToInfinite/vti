"use client";
import { useEffect, useId, useRef, useState, type ReactElement } from "react";
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
  ScShock,
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
  // `usePointer()` devuelve un objeto literal nuevo en cada invocacion (no
  // memoizado): depender de `pointer` entero en el efecto de abajo lo haria
  // re-ejecutarse en CADA render de `Eye` (cancela + reprograma el rAF),
  // aunque `enabled` no cambiara. `x`/`y` si son refs estables (el mismo
  // objeto en cada invocacion de `usePointer`), asi que extraerlas aqui y
  // depender de los primitivos/refs -- no del objeto envolvente -- deja el
  // efecto quieto entre renders del padre (Hero, T5) y solo lo reinicia
  // cuando `enabled` cambia de verdad.
  const { x, y, enabled } = pointer;
  const eyeball = useRef<HTMLDivElement>(null);
  const iris = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLSpanElement>(null);
  // Onda de "pulse" al click/tap (spec §12). Estado de React, no rAF: se
  // dispara una vez por interaccion, no en cada frame, asi que no interfiere
  // con la regla de "cero re-render por frame" del gaze (spec §13).
  const [pulsing, setPulsing] = useState(false);

  // useId() incluye ":" (p.ej. ":r0:"), valido en un atributo id HTML pero
  // fragil como referencia `url(#...)` en algunos motores. Se despoja para
  // usarlo con seguridad como fragment identifier.
  const clipId = `eye-almond-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    // Un solo rAF escribe transforms directamente en el DOM. React NUNCA
    // re-renderiza por frame (spec §13).
    const tick = (): void => {
      const px = x.current;
      const py = y.current;
      if (eyeball.current)
        eyeball.current.style.transform = `translate(${px * AMP.eyeball}px, ${py * (AMP.eyeball * 0.64)}px)`;
      if (iris.current)
        iris.current.style.transform = `translate(${px * AMP.iris}px, ${py * (AMP.iris * 0.7)}px)`;
      if (glint.current)
        glint.current.style.transform = `translate(${px * AMP.glint}px, ${py * (AMP.glint * 0.7)}px)`;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, x, y]);

  // `pointerdown` cubre raton y tactil en un solo handler (spec §12: "click
  // pulse", trigger "click / tap"). El ojo entero (`ScSocket`) es el hit
  // target -- no solo el iris -- para que la superficie completa responda.
  const handlePulseStart = (): void => setPulsing(true);
  // Se limpia al terminar la animacion CSS (no con un timeout) para que un
  // segundo click dispare la onda otra vez incluso si el usuario clickea muy
  // rapido: `onAnimationEnd` solo se dispara cuando el navegador termina de
  // verdad el keyframe `shock`.
  const handlePulseEnd = (): void => setPulsing(false);

  return (
    <ScSocket
      className={className}
      aria-hidden="true"
      data-pulsing={pulsing ? "true" : undefined}
      onPointerDown={handlePulseStart}
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
            <ScShock
              data-part="shock"
              onAnimationEnd={handlePulseEnd}
            />
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
