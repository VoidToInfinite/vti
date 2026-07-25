"use client";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { usePointer } from "@/hooks/usePointer";
import { useTheme } from "@/theme/ThemeProvider";
import { EYE_LAYERS, EYE_SIZES } from "./eye.layers";
import { ScFrame, ScLayer, ScMascotSlot, ScShock, ScSocket } from "./eye.parts";
import { Sol } from "./mascots/Sol";
import { Wormhole } from "./mascots/Wormhole";

/** Amplitud del parallax en px a profundidad 1. Cada capa la escala por su
 *  `depth`: el parpado (0.25) se mueve 6px y la pupila (0.85) 22px, y esa
 *  diferencia es lo que produce la sensacion de profundidad (spec §7). La
 *  amplitud vertical es menor porque el lienzo es apaisado: el mismo
 *  desplazamiento se lee mas fuerte en el eje corto. */
const AMP = { x: 26, y: 15 } as const;

export interface EyeProps {
  className?: string;
}

/**
 * El ojo cosmico del hero: la composicion real, montada como pila de capas
 * WebP con blending aditivo (la partición documentada en
 * `assets/hero-eye/manifest.json`), no como aproximacion en CSS.
 *
 * Sobre la pila, dos movimientos: parallax 2.5D siguiendo al cursor -- un
 * unico rAF que escribe `transform` directamente en el DOM, cero re-render por
 * frame (spec §13) -- y una onda de pulso al click/tap. La corona respira por
 * animacion CSS (`ScLayer`), no por rAF, para que tambien tenga vida en tactil
 * donde el seguimiento del cursor no aplica.
 *
 * Todo el subarbol es decorativo (`aria-hidden="true"`): nada de lo que
 * comunica el ojo vive solo aqui -- la marca que ocupa la pupila es el `<h1>`
 * real del Hero, y las imagenes van con `alt=""`.
 */
export function Eye({ className }: EyeProps): ReactElement {
  const pointer = usePointer();
  // `usePointer()` devuelve un objeto literal nuevo en cada invocacion (no
  // memoizado): depender de `pointer` entero en el efecto de abajo lo haria
  // re-ejecutarse en CADA render de `Eye` (cancela + reprograma el rAF),
  // aunque `enabled` no cambiara. `x`/`y` si son refs estables (el mismo
  // objeto en cada invocacion de `usePointer`), asi que extraerlas aqui y
  // depender de los primitivos/refs -- no del objeto envolvente -- deja el
  // efecto quieto entre renders del padre (Hero) y solo lo reinicia cuando
  // `enabled` cambia de verdad.
  const { x, y, enabled } = pointer;
  // Tema REAL de la pagina, no el que el Hero fuerza para sus tokens: el Hero
  // anida el tema oscuro porque su superficie es negra siempre, pero la
  // eleccion de mascota es del usuario, no de la superficie.
  const { themeName } = useTheme();
  const layers = useRef<(HTMLImageElement | null)[]>([]);
  // Onda de "pulse" al click/tap (spec §12). Estado de React, no rAF: se
  // dispara una vez por interaccion, no en cada frame, asi que no interfiere
  // con la regla de "cero re-render por frame" del gaze (spec §13).
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    // Un solo rAF para las cinco capas. React NUNCA re-renderiza por frame.
    const tick = (): void => {
      const px = x.current;
      const py = y.current;
      for (const [index, layer] of EYE_LAYERS.entries()) {
        if (layer.depth === 0) continue; // el fondo no se mueve nunca
        const el = layers.current[index];
        if (!el) continue;
        el.style.transform = `translate3d(${px * AMP.x * layer.depth}px, ${py * AMP.y * layer.depth}px, 0)`;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, x, y]);

  // `pointerdown` cubre raton y tactil en un solo handler (spec §12: "click
  // pulse", trigger "click / tap"). El lienzo entero (`ScSocket`) es el hit
  // target: la composicion ocupa el hero de fondo a fondo, asi que cualquier
  // punto que no sea copia ni CTA responde.
  //
  // Bajo reduced-motion NI SE MARCA el estado. El pulso se apaga solo cuando
  // termina su animacion, y con reduced-motion no hay animacion que termine:
  // marcarlo dejaria `data-pulsing="true"` pegado para siempre y el segundo
  // click ya no dispararia nada el dia que se reactive el movimiento.
  const handlePulseStart = (): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPulsing(true);
  };
  // Se limpia al terminar la animacion CSS (no con un timeout) para que un
  // segundo click dispare la onda otra vez incluso si el usuario clickea muy
  // rapido: `onAnimationEnd` solo se dispara cuando el navegador termina de
  // verdad el keyframe.
  const handlePulseEnd = (): void => setPulsing(false);

  return (
    <ScSocket
      className={className}
      aria-hidden="true"
      data-pulsing={pulsing ? "true" : undefined}
      onPointerDown={handlePulseStart}
    >
      <ScFrame>
        {EYE_LAYERS.map((layer, index) => (
          <ScLayer
            key={layer.part}
            ref={(el: HTMLImageElement | null) => {
              layers.current[index] = el;
            }}
            data-part={layer.part}
            src={layer.src}
            srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1672w`}
            sizes={EYE_SIZES}
            alt=""
            // Las capas son el fondo del hero: cargarlas en diferido las
            // pondria por detras de la copia en la cola de red justo donde
            // mas se notan. `decoding="async"` evita que la decodificacion
            // bloquee el primer pintado del texto.
            loading="eager"
            decoding="async"
            $additive={layer.additive}
            $moves={layer.depth > 0}
            $glow={layer.glow}
          />
        ))}
        {/* El centro del ojo: Wormhole en oscuro, Sol en claro (portados de
            `vti-sdk`). El Wormhole trae su propia coreografia de pulso -- dos
            ondas de choque, destello del remolino, anillos que fulguran --
            asi que en oscuro NO se monta ademas el anillo simple `ScShock`:
            serian tres ondas para el mismo click. En claro, donde Sol no
            reacciona al pulso del ojo (su interaccion es propia: inclinacion,
            giro y cambio de cara), el anillo se queda como la respuesta del
            ojo al click. */}
        <ScMascotSlot data-part="mascot">
          {themeName === "light" ? (
            <Sol />
          ) : (
            <Wormhole
              pulsing={pulsing}
              onPulseEnd={handlePulseEnd}
            />
          )}
        </ScMascotSlot>
        {themeName === "light" && (
          <ScShock
            data-part="shock"
            onAnimationEnd={handlePulseEnd}
          />
        )}
      </ScFrame>
    </ScSocket>
  );
}
