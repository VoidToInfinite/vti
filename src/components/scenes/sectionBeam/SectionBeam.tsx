"use client";
import type { ReactElement } from "react";
import { useReveal } from "@/hooks/useReveal";
import {
  ScBeamDrawLeft,
  ScBeamDrawRight,
  ScBeamHotspot,
  ScBeamSweepLeft,
  ScBeamSweepRight,
  ScSectionBeam,
} from "./sectionBeam.parts";

/**
 * Haz de luz de costura: una línea de 2px pegada al borde superior de una
 * sección, portada VERBATIM del mockup `Footer animado v2.dc.html` (líneas
 * 45-51 en Contacto, 113-119 en el Footer -- mismos cinco elementos, mismos
 * literales). Componente compartido (D7 de la spec
 * `2026-08-03-contacto-footer-oscuro-design.md`): Contacto y el Footer lo
 * consumen igual, sin props (YAGNI).
 *
 * Puramente decorativo: `aria-hidden`, sin texto, sin foco. El dibujado se
 * dispara con su PROPIO `useReveal` (D8), no al montar -- en la landing real
 * esta costura vive a varias pantallas del pliegue, y sin el reveal la
 * animación de entrada habría terminado mucho antes de que nadie la viera.
 */
export function SectionBeam(): ReactElement {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <ScSectionBeam
      ref={ref}
      aria-hidden="true"
      data-revealed={revealed}
    >
      <ScBeamDrawLeft />
      <ScBeamDrawRight />
      <ScBeamSweepLeft />
      <ScBeamSweepRight />
      <ScBeamHotspot />
    </ScSectionBeam>
  );
}
