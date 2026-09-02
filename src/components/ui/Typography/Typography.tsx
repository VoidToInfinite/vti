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

/*
 * AQUÍ VIVIERON `BODY_VARIANTS` (la lista `["body", "bodySm"]`) y
 * `BALANCE_DECLARATIONS` (`text-wrap: balance` + `text-wrap-style: balance`),
 * que este componente aplicaba a las dos variantes de CUERPO desde el encargo
 * del usuario del 2026-08-04. RETIRADOS los dos en la crítica externa #14
 * (2026-09-02), decisión D1 del dueño: manda el token de prosa, y el
 * equilibrado se queda SOLO en los titulares (`h*`/`display`, la
 * interpolación que sigue viva justo abajo).
 *
 * QUÉ SE MIDIÓ, y no se supuso. El evaluador de Craft hizo un A/B en
 * navegador real sobre los MISMOS nodos y la MISMA caja (`grid.prose`, 56ch),
 * contando caracteres por línea:
 *
 *   con equilibrado:  53,5 caracteres de media; 2 de 11 líneas en 60-75
 *   sin equilibrado:  64,5 caracteres de media; 10 de 11 líneas en 60-75
 *
 * El rango 60-75 es el que persigue el sistema (`DESIGN.md` §3.4) y el que
 * `grid.prose` promete por escrito. Las dos superficies de la home que hoy
 * entregan 60-69 son justo las que NO pasan por este componente
 * (`About.tsx` y la nota de privacidad de Contact).
 *
 * POR QUÉ ERAN DOS REGLAS QUE SE CONTRADECÍAN, y no dos ajustes que se suman.
 * `grid.prose` no promete un ancho: promete un RECUENTO de caracteres
 * REALIZADOS por línea, y su derivación multiplica la capacidad de la caja
 * por un factor de realización de 0,92 medido sobre corte GREEDY con bandera
 * derecha — el algoritmo que llena cada línea hasta donde cabe y desperdicia
 * el hueco de la palabra que no entra. `text-wrap: balance` NO es ese
 * algoritmo: reparte el texto para igualar las líneas —minimiza la línea más
 * larga sin cambiar el número de líneas— así que deja de llenar la caja a
 * propósito. Con las dos reglas activas ganaba el equilibrado, y el token
 * quedaba gobernando un ancho que ya no decidía el recuento.
 *
 * Eso explica además el hallazgo que la ola I no consiguió mover: ensanchar
 * la caja de 52ch a 56ch dejó la realización clavada en 59 caracteres. No fue
 * una medida insuficiente ni un error de derivación — con equilibrado, el
 * ancho de la caja deja de ser la restricción activa: el ancho extra se
 * convierte en holgura al final de cada línea, no en más caracteres. Sin
 * equilibrado, la caja vuelve a mandar y la derivación de 56ch vuelve a
 * describir lo que pasa (condición que `grid.prose` declara hoy en su propio
 * docblock).
 *
 * ESTO CIERRA, no ignora, la decisión T6 de la spec de tipografía de Story
 * (`docs/superpowers/specs/2026-07-31-story-deck-tipografia-design.md`), que
 * discutía CÓMO escribir el equilibrado del cuerpo —solo la shorthand
 * `text-wrap`, por cobertura, frente a la longhand `text-wrap-style` que
 * nombraba el encargo— y que este fichero había revisado el 2026-08-04
 * declarando las dos formas. Aquel debate era sobre la sintaxis; la #14 lo
 * resuelve un nivel más arriba: sobre el cuerpo no va NINGUNA de las dos
 * formas. El criterio de T6 sigue vigente donde el equilibrado sí se aplica
 * (los titulares, que declaran la shorthand).
 *
 * QUÉ NO CIERRA ESTE CAMBIO. Cuatro piezas de cuerpo fuera de este componente
 * declaran el equilibrado por su cuenta y ganan la cascada aunque sean
 * `styled(Typography)` — `ScBody` (`Contact.tsx`), `ScTagline` (`Hero.tsx`),
 * `ScDeckIntroBody`/`ScDeckPillarSubtitle`/`ScDeckPillarBody`
 * (`story.deck.tsx`) y `ScJourneyIntroBody`/`ScJourneyStepSubtitle`
 * (`journey.deck.tsx`). Siguen equilibrando después de esta retirada; están
 * fuera del alcance de este cambio y quedan declaradas aquí en vez de
 * corregidas en silencio desde un fichero que no es su dueño.
 */

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
