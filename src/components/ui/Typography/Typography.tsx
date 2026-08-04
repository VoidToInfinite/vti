"use client";

import type { ElementType, ReactElement, ReactNode } from "react";
import styled from "styled-components";
import type { TypeVariant } from "@/theme/tokens/type";

/**
 * `lead` no existe en la escala nueva (`theme.data.type.scale`); se conserva
 * como alias de `bodyLg` para no romper a los consumidores actuales (Hero).
 * Su migración a `bodyLg` explícito es responsabilidad de la Task 15.
 */
export type TypographyVariant = TypeVariant | "lead";

const defaultElement: Partial<Record<TypeVariant, ElementType>> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  overline: "span",
  caption: "span",
  code: "code",
};

interface TypographyProps {
  "variant": TypographyVariant;
  /** Override del elemento por defecto de la variante. */
  "as"?: ElementType;
  "children": ReactNode;
  "className"?: string;
  "id"?: string;
  /** Gancho de test. No participa en el estilado. */
  "data-testid"?: string;
}

/**
 * Variantes de CUERPO de texto, las que reciben el equilibrado de línea
 * (encargo del usuario 2026-08-04). Se declara como lista y no como
 * `startsWith("body")` para que `caption`, `overline` y `code` queden fuera de
 * forma explícita y no por accidente de nombre: `overline` es una etiqueta de
 * una o dos palabras (equilibrar no tiene nada que repartir), y `code` es
 * monoespaciado, donde reagrupar líneas altera la lectura del propio código.
 */
const BODY_VARIANTS: readonly TypeVariant[] = ["bodyLg", "body", "bodySm"];

/**
 * Equilibrado de línea de las variantes de cuerpo: se declaran LAS DOS
 * formas, y no es redundancia.
 *
 * El encargo nombra la longhand de CSS Text 4 (`text-wrap-style`), que es la
 * propiedad correcta y la que queda escrita. Pero su soporte es más estrecho
 * que el de la shorthand `text-wrap` para EXACTAMENTE el mismo efecto, así
 * que la shorthand va delante como base: un motor que no conozca la longhand
 * descarta esa declaración y se queda con el valor de la shorthand — mismo
 * resultado visual — y uno que sí la conozca la aplica encima con el mismo
 * valor. En ningún orden de soporte se pierde el equilibrado, que es lo que
 * el encargo pide de verdad.
 *
 * Esto REVISA la decisión T6 de la spec de tipografía de Story (2026-08-02),
 * que resolvió el mismo dilema quedándose solo con la shorthand. No era
 * incorrecta; lo que cambia es que ahora se puede tener la longhand pedida
 * sin renunciar a la cobertura, en vez de elegir entre las dos.
 */
const BALANCE_DECLARATIONS = `
  text-wrap: balance;
  text-wrap-style: balance;
`;

const ScTypography = styled.p<{ $variant: TypeVariant }>`
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${({ theme, $variant }) => theme.data.type.scale[$variant].size};
  font-weight: ${({ theme, $variant }) =>
    theme.data.type.scale[$variant].weight};
  line-height: ${({ theme, $variant }) =>
    theme.data.type.scale[$variant].lineHeight};
  letter-spacing: ${({ theme, $variant }) =>
    theme.data.type.scale[$variant].tracking};
  ${({ $variant }) =>
    ($variant.startsWith("h") || $variant === "display") &&
    "text-wrap: balance;"}
  ${({ $variant }) => BODY_VARIANTS.includes($variant) && BALANCE_DECLARATIONS}
`;

export function Typography({
  variant,
  as,
  children,
  className,
  id,
  "data-testid": testId,
}: TypographyProps): ReactElement {
  const resolvedVariant: TypeVariant = variant === "lead" ? "bodyLg" : variant;
  const element: ElementType = as ?? defaultElement[resolvedVariant] ?? "p";
  return (
    <ScTypography
      as={element}
      $variant={resolvedVariant}
      className={className}
      id={id}
      data-testid={testId}
    >
      {children}
    </ScTypography>
  );
}
