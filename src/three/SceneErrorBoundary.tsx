"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ÚNICO componente de clase de todo el proyecto -- justificado, no una
 * desviación del estilo del repo: React aún no ofrece un equivalente en
 * hooks para `getDerivedStateFromError`/`componentDidCatch`, así que un
 * error boundary solo puede escribirse como clase.
 *
 * Cubre el tercer motivo de no-carga del contrato de `SceneLoader` (spec
 * §10, §15): reduced-motion y ausencia de WebGL ya se resuelven antes de
 * intentar el `import()`, pero si el chunk de `Scene` no llega (fallo de
 * red, 404, bloqueador de contenido), la promesa rechaza y React propaga
 * ese fallo de render hacia el error boundary más cercano. Sin ninguno en
 * `src/` (ni un `error.tsx` de Next dentro de `app/`), React desmontaba el
 * árbol entero: el fallo que el contrato promete absorber era justo el que
 * tumbaba la página.
 *
 * La escena es decoración pura (spec §13): no se muestra ningún mensaje de
 * error al usuario. Al capturar, este límite renderiza `null` sin más --
 * el póster (hermano suyo en `SceneLoader`, fuera de este árbol) sigue
 * visible y el contenido real de la página vive en el DOM, ajeno a esto.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
