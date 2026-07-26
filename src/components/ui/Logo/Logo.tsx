"use client";
import type { ReactElement, SVGAttributes } from "react";
import styled from "styled-components";

export interface LogoProps extends Omit<
  SVGAttributes<SVGSVGElement>,
  "children"
> {
  /** Ancho CSS; el alto se deriva del viewBox (500x550). Default 1em: hereda
   *  el contexto tipográfico salvo que el consumidor pase un valor propio. */
  size?: string;
  /** Nombre accesible opcional. Ausente por defecto: en los tres
   *  consumidores actuales (Navbar, Sol, Wormhole) el logo es decorativo —
   *  el nombre de marca lo lleva BrandName o el elemento ya es aria-hidden.
   *  Darle nombre aquí lo duplicaría. */
  title?: string;
}

/*
 * El tamano se declara en CSS, no solo como atributo `width` del SVG. Es
 * obligatorio, no una preferencia de estilo: GlobalStyles declara
 * `svg { width: 100%; display: block; }` para todo el sitio, y una
 * declaracion CSS gana SIEMPRE a un atributo de presentacion. Con el tamano
 * solo en el atributo, los tres consumidores renderizaban el logo al 100% de
 * su contenedor -- medido: 167px de ancho en un navbar de 56px de alto, que
 * ademas aplastaba el nombre de marca hasta partirlo en tres lineas.
 *
 * Los consumidores que necesiten otra medida la declaran en su propio CSS
 * (`styled(Logo)`), que se inyecta despues y gana por orden de cascada.
 */
const ScLogo = styled.svg<{ $size: string }>`
  display: block;
  flex: none;
  width: ${({ $size }) => $size};
  height: auto;
  fill: currentColor;
  stroke: currentColor;
`;

export function Logo({
  size = "1em",
  title,
  ...rest
}: LogoProps): ReactElement {
  const decorative = !title && rest["aria-label"] === undefined;
  return (
    <ScLogo
      /*
       * "0 7.5 500 550", no "0 0 500 550". El dibujo (circulo + dos
       * polilineas) mide, medido con las coordenadas reales de los tres
       * elementos de abajo: x en [10, 490] e y en [25, 540]. Contra un
       * viewBox "0 0 500 550" eso deja 10px de margen a cada lado en X
       * (simetrico) pero 25px arriba y solo 10px abajo en Y -- 15 unidades
       * de mas por arriba, un 2.7% de la altura total. A cualquier tamano el
       * icono se leia "colgando" hacia abajo dentro de su propia caja, mas
       * perceptible cuanto mas pequeno el render (navbar) o mas grande la
       * caja (Wormhole/Sol). Desplazar minY a 7.5 = 25 - (25-10)/2 centra el
       * dibujo sin tocar el ancho ni el alto del viewBox: misma relacion de
       * aspecto, mismo tamano renderizado en los tres consumidores, cero
       * distorsion.
       */
      viewBox="0 7.5 500 550"
      $size={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      focusable={false}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {/* vector-effect="non-scaling-stroke": el trazo se dibuja SIEMPRE a un
          ancho constante en pantalla, sin importar la escala viewBox->render.
          Verificado necesario: stroke-width="2" (heredado literal del asset
          public/brand/logo.svg) esta pensado para un render de ~400px; a los
          24px del navbar ese mismo valor se dibuja en ~0.1px fisicos y
          desaparece. En vez de exponer un strokeWidth distinto por consumidor
          (que obligaria a calibrar un numero magico en cada sitio: navbar
          24px, ~16% del marco en Wormhole, 50% de la pupila en Sol), esta
          propiedad SVG hace que el MISMO valor "2" sea valido en los tres
          sitios a la vez. El relleno (currentColor) sigue dando la silueta
          principal; el trazo es refuerzo de borde, no la unica fuente de
          forma. */}
      <circle
        cx="250"
        cy="75"
        r="50"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        points="10,75 250,540 490,75 440,75 250,460 60,75 10,75 250,540"
      />
      <polyline
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        points="110,140 145,210 210,210 250,400 290,210 355,210 390,140 110,140 130,180"
      />
    </ScLogo>
  );
}
