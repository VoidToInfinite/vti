"use client";
import type { ElementType, ReactElement, ReactNode } from "react";
import styled from "styled-components";

/*
 * Texto que SOLO existe para las tecnologías de asistencia: sigue en el árbol
 * de accesibilidad y lo lee un lector de pantalla, pero no ocupa ni un píxel
 * visible.
 *
 * Por qué NO se resuelve con las alternativas obvias:
 *
 * - `display: none` / `visibility: hidden` / el atributo `hidden` sacan el
 *   elemento del árbol de accesibilidad: el lector de pantalla tampoco lo
 *   anuncia, que es justo lo contrario de lo que este átomo existe para
 *   conseguir.
 * - `font-size: 0` o `color: transparent` dejan el nodo ocupando caja y
 *   participando en el layout, y algunos motores de síntesis siguen
 *   respetando el tamaño cero.
 * - `text-indent: -9999px` mueve el contenido fuera del lienzo, lo que
 *   REINTRODUCE scroll horizontal en escritura de derecha a izquierda.
 *
 * La receta de abajo es la variante moderna del patrón `.sr-only`: caja de
 * 1x1 px recortada por `clip-path`, sin desbordamiento y sin ajuste de línea
 * (`white-space: nowrap` evita que un texto largo dentro de 1px de ancho
 * genere una columna de miles de píxeles de alto que sí desplazaría el
 * layout). `position: absolute` la saca del flujo para que no empuje a sus
 * hermanos, y `border-width: 0` neutraliza el `border: 0` que GlobalStyles ya
 * aplica de forma global sin depender de él.
 *
 * Primer consumidor (entrega 2026-08-05): el aviso de "se abre en una pestaña
 * nueva" de los enlaces externos del Navbar y del Footer. WCAG 3.2.5 (Cambio
 * a petición, AAA) pide avisar de un cambio de contexto que la persona no ha
 * solicitado; el icono o el `target` por sí solos no lo comunican a quien no
 * ve la pantalla.
 */
const ScVisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border-width: 0;
`;

export interface VisuallyHiddenProps {
  readonly children: ReactNode;
  /** Elemento renderizado. `span` por defecto: es el único válido dentro de
   *  un enlace o un botón, que son los dos consumidores actuales. */
  readonly as?: ElementType;
  readonly className?: string;
}

export function VisuallyHidden({
  children,
  as,
  className,
}: VisuallyHiddenProps): ReactElement {
  return (
    <ScVisuallyHidden
      as={as}
      className={className}
    >
      {children}
    </ScVisuallyHidden>
  );
}
