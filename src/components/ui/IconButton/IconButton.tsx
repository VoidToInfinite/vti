"use client";

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import styled from "styled-components";
import {
  Button,
  type ButtonIntent,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/Button/Button";

// Lados del cuadrado — mismo dato que Button.sizeStyles (36/44/52px,
// Button.tsx líneas 38-51). Esa tabla vive en un objeto NO exportado de
// Button.tsx: no hay forma de importarla sin exportarla, y exportarla solo
// para este consumo sería más cambio que el necesario. Por eso se redeclara
// aquí, literal, con los mismos tres números — no es una tabla de decisión
// nueva, es el mismo dato ya existente vuelto a escribir para dimensionar el
// lado del cuadrado.
const SQUARE_SIDE: Record<ButtonSize, string> = {
  sm: "36px",
  md: "44px",
  lg: "52px",
};

// El icono (width/height="1em") escala con el font-size que fija esta
// tabla, un paso por debajo del lado del cuadrado para dejar aire alrededor.
const ICON_SIDE: Record<ButtonSize, string> = {
  sm: "16px",
  md: "20px",
  lg: "24px",
};

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** SVG ya aria-hidden, con width="1em" height="1em" para heredar el
   *  tamaño de ICON_SIDE. */
  "icon": ReactNode;
  /** Nombre accesible OBLIGATORIO (sin default): un icon-button sin texto
   *  visible depende de esto para tener nombre (WCAG 4.1.2). Redeclarado
   *  aquí como string requerido — ButtonHTMLAttributes lo trae opcional. */
  "aria-label": string;
  "variant"?: ButtonVariant;
  "intent"?: ButtonIntent;
  "size"?: ButtonSize;
}

const ScSquare = styled(Button)<{ $side: string; $iconSide: string }>`
  width: ${({ $side }) => $side};
  padding: 0;
  gap: 0;
  font-size: ${({ $iconSide }) => $iconSide};

  /* Afordancia de descubribilidad — SOLO en esta capa de composición de
     IconButton, NO en ScButton/Button.tsx: un botón de solo icono en ghost
     es invisible en reposo (Button.tsx ~114-120: fondo transparente hasta
     hover). Quien no puede "descubrir" pasando el cursor —baja visión,
     temblor, navegación por switch/conmutador— no sabe que ahí hay un
     control. El anillo vive solo aquí: Button.tsx no cambia, sus 4
     variantes en cualquier otro punto del sitio siguen exactamente igual. */
  &[data-variant="ghost"] {
    box-shadow: inset 0 0 0 1px
      color-mix(in oklch, currentColor 18%, transparent);
  }

  /* :focus-visible propio (hallazgo 1, D7) — necesario AQUÍ, no solo en
     Button.tsx: Button.tsx ya declara su propio halo por variante (rama
     ghost incluida), pero esa regla vive en la clase de ScButton, que se
     inyecta ANTES que la de esta capa (lección task/lessons.md 2026-07-26,
     "styled(Base) se inyecta después del propio Base"), y el anillo de
     descubribilidad de arriba tiene la MISMA especificidad que un selector
     de focus-visible suelto (una clase + un selector simple, en los dos
     casos: atributo vs. pseudo-clase pesan igual). En un empate de
     especificidad gana el ÚLTIMO declarado en el documento, que aquí es
     SIEMPRE esta capa — así que sin este bloque, al enfocar por teclado el
     ghost (el variant por defecto de IconButton, y el único que usa hoy
     ThemeToggle) el halo de Button.tsx quedaría tapado por el anillo de
     descubribilidad, invisible en la práctica.
     La combinación de selector atributo+focus-visible de abajo sube la
     especificidad por encima de las dos reglas que compone (atributo +
     pseudo-clase > solo atributo, o que solo pseudo-clase), así que gana
     SIEMPRE, sin depender del orden de inserción — y las dos sombras
     (anillo de descubribilidad + halo de foco) se escriben en la MISMA
     declaración, separadas por coma, para no perder ninguna (box-shadow no
     fusiona entre declaraciones distintas: la última gana entera).
     Para el resto de variantes (solid/soft/outline), pasadas explícitamente
     por el consumidor, no hace falta nada en esta capa: ninguna regla de
     ScSquare las toca, así que el halo que Button.tsx ya declara por su
     cuenta llega intacto. */
  &[data-variant="ghost"]:focus-visible {
    box-shadow:
      inset 0 0 0 1px color-mix(in oklch, currentColor 18%, transparent),
      0 0 0 4px
        color-mix(
          in oklch,
          ${({ theme }) => theme.data.semantic.focus} 35%,
          transparent
        );
  }
`;

export function IconButton({
  icon,
  variant = "ghost",
  intent = "neutral",
  size = "md",
  ...rest
}: IconButtonProps): ReactElement {
  return (
    <ScSquare
      $side={SQUARE_SIDE[size]}
      $iconSide={ICON_SIDE[size]}
      data-variant={variant}
      variant={variant}
      intent={intent}
      size={size}
      {...rest}
    >
      {icon}
    </ScSquare>
  );
}
