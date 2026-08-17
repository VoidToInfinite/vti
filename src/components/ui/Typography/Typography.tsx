"use client";

import type { ElementType, ReactElement, ReactNode } from "react";
import styled from "styled-components";
import type { TypeVariant } from "@/theme/tokens/type";

/*
 * AQUÍ VIVIÓ `TypographyVariant = TypeVariant | "lead"`, con el shim
 * `variant === "lead" ? "bodyLg" : variant` de la función de más abajo.
 * RETIRADOS los dos en la crítica externa #9 (2026-08-17).
 *
 * El docblock que acompañaba al alias decía que se conservaba «para no romper
 * a los consumidores actuales (Hero)» y que migrarlo era responsabilidad de la
 * Task 15. Censo propio antes de tocarlo: `Hero.tsx` no pasa `variant="lead"`
 * en ningún sitio, y NADIE lo hace -- la única aparición de la cadena en todo
 * `src/`/`app/` era el test que probaba el propio shim. El alias estaba muerto
 * por los DOS extremos: sin nadie que lo pasara, y apuntando a `bodyLg`, un
 * peldaño de la escala que tampoco tenía consumidores y que este mismo cambio
 * retira (`theme/tokens/type.ts`).
 *
 * Con `lead` fuera, `TypographyVariant` quedaba como alias exacto de
 * `TypeVariant` -- un nombre de más para el mismo tipo, exportado sin que
 * ningún fichero lo importara -- así que se retira también y las props hablan
 * directamente el tipo del token.
 */

/*
 * `h4` y `code` desaparecen de este mapa porque desaparecen de la escala (ver
 * el docblock de `TypeVariant`): sin ellos en `TypeVariant`, el
 * `Partial<Record<...>>` rechazaría las claves en tiempo de compilación.
 */
const defaultElement: Partial<Record<TypeVariant, ElementType>> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h5: "h5",
  overline: "span",
  caption: "span",
};

interface TypographyProps {
  "variant": TypeVariant;
  /** Override del elemento por defecto de la variante. */
  "as"?: ElementType;
  "children": ReactNode;
  "className"?: string;
  "id"?: string;
  /**
   * Solo `-1`, y a propósito: el único uso legítimo de `tabIndex` sobre un
   * titular es hacerlo DESTINO de foco programático sin meterlo en el orden
   * de tabulación (patrón del skip link, ya usado en `LegalDocument.tsx` y
   * `NotFoundContent.tsx` sobre sus `<main>`). Un valor positivo reordenaría
   * la tabulación de la página entera -- un anti-patrón de accesibilidad que
   * el tipo impide escribir en vez de dejarlo a la revisión humana.
   *
   * Existe desde la crítica externa #8 (punto 3): los `<h3>` de las tarjetas
   * de Features son el destino de los tres enlaces de «Descubre», y en la
   * rama clara dos de esas tarjetas comparten posición de scroll -- el foco
   * es lo único que distingue a cuál se ha llegado (ver
   * `navAnchorFocus.ts`). Sin este paso, `Typography` descarta el atributo en
   * silencio: destructura sus props una a una, así que todo lo que no esté
   * declarado aquí nunca llega al DOM.
   */
  "tabIndex"?: -1;
  /** Gancho de test. No participa en el estilado. */
  "data-testid"?: string;
}

/**
 * Variantes de CUERPO de texto, las que reciben el equilibrado de línea
 * (encargo del usuario 2026-08-04). Se declara como lista y no como
 * `startsWith("body")` para que `caption` y `overline` queden fuera de forma
 * explícita y no por accidente de nombre: `overline` es una etiqueta de una o
 * dos palabras y `caption` un pie corto — en ninguno de los dos hay líneas
 * suficientes que reagrupar para que equilibrar signifique algo.
 *
 * `bodyLg` salió de esta lista al salir de la escala (crítica externa #9,
 * 2026-08-17, ver el docblock de `TypeVariant`). El razonamiento original
 * citaba además a `code` — monoespaciado, donde reagrupar líneas altera la
 * lectura del propio código — que ya no existe como variante; el criterio se
 * conserva escrito aquí por si algún día vuelve a hacer falta.
 */
const BODY_VARIANTS: readonly TypeVariant[] = ["body", "bodySm"];

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
  tabIndex,
  "data-testid": testId,
}: TypographyProps): ReactElement {
  const element: ElementType = as ?? defaultElement[variant] ?? "p";
  return (
    <ScTypography
      as={element}
      $variant={variant}
      className={className}
      id={id}
      tabIndex={tabIndex}
      data-testid={testId}
    >
      {children}
    </ScTypography>
  );
}
