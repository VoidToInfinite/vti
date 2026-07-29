import type { ElementType, ReactElement } from "react";
import styled, { css, keyframes } from "styled-components";

const ScBrandName = styled.span`
  display: inline-flex;
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.data.semantic.text};
`;

/*
 * Excepcion documentada al lenguaje de movimiento del sistema (solo
 * transform/opacity; ver BackOrbs.tsx, eye.parts.tsx, EyeCornerMark, poster
 * de SceneLoader, Wormhole, Sol). Un degradado de texto ANIMADO exige mover
 * background-position (o un angulo registrado con @property) porque
 * background-position/background-size no son propiedades de compositor -- no
 * hay forma de desplazar un fondo recortado a texto solo con transform u
 * opacity. Se anima background-position (no @property) por soporte
 * universal: @property no cubre navegadores mas antiguos y esta pieza es la
 * cabecera de portada, la primera superficie que ve cualquier visitante --
 * degradar a "no anima, pero se lee" es aceptable, degradar a "el titulo no
 * aparece" no lo es.
 *
 * La animacion INFINITA se acota a @media (prefers-reduced-motion:
 * no-preference) porque, medido en GlobalStyles.tsx, el colapso global bajo
 * reduced-motion fuerza a la vez animation-duration: 0.001ms !important Y
 * animation-iteration-count: 1 !important -- NO detiene una animacion
 * infinita "girando para siempre" (esa frase describe bien a Wormhole/Sol,
 * animaciones puramente decorativas sin estado final relevante, pero es
 * imprecisa aqui): con iteration-count forzado a 1 la animacion CORRE una vez
 * en ~0ms y luego revierte a su valor base no animado -- es decir, un flash
 * de un punto no determinista del recorrido del degradado, no el ultimo
 * frame del keyframe. Por eso hace falta el guard no-preference (bajo
 * reduced-motion la animacion nunca se declara, así que el colapso global no
 * tiene nada que colapsar) MAS un fallback estatico explicito: sin el, el
 * texto quedaria en el flash de un frame arbitrario en vez de un color fijo
 * legible.
 *
 * Sin el hint de interpolacion "in oklch" (a proposito, decision de
 * compatibilidad): linear-gradient(100deg in oklch, ...) es una sintaxis de
 * espacio de interpolacion mas reciente que el soporte base de oklch() en
 * gradientes -- un motor que entienda oklch() como color pero no el hint "in
 * <space>" puede invalidar la declaracion COMPLETA y perder el fondo. Los
 * stops siguen siendo oklch() literales (ya usados en el resto del repo), sin
 * el hint explicito -- mismo resultado visual, menor superficie de fallo.
 * color-mix(in oklch, ...) de Button.tsx no es un precedente comparable: ese
 * hint es obligatorio y estable desde el dia uno de esa funcion, no una
 * extension posterior como el hint de interpolacion en gradientes.
 */
export const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
`;

/* Compartido con los CTA del Hero (ver ScCtaPrimary/ScCtaSecondary en
   Hero.tsx): MISMO degradado, una sola definicion de los stops -- así el
   titulo y los dos CTA recorren exactamente el mismo color en el mismo
   instante en vez de tres declaraciones que podrian divergir con el tiempo. */
export const heroGradient = css`
  background-image: linear-gradient(
    100deg,
    ${({ theme }) => theme.data.semantic.text} 0%,
    ${({ theme }) => theme.data.semantic.brandText} 35%,
    ${({ theme }) => theme.data.palette.secondary[300]} 65%,
    ${({ theme }) => theme.data.semantic.text} 100%
  );
  background-size: 260% 100%;
`;

/*
 * Bloque de "texto con el degradado animado", compartido con el CTA
 * secundario del Hero (ver ScCtaSecondaryLabel en Hero.tsx) por el mismo
 * motivo que heroGradient ya se comparte: una sola definicion de la mecanica
 * de recorte, para que el titulo y el CTA secundario recorran exactamente el
 * mismo color en el mismo instante y con las mismas tres redes de seguridad,
 * en vez de dos declaraciones que podrian divergir con el tiempo.
 *
 * OBLIGATORIO, no cosmetico, el `text-shadow: none`: cualquier consumidor que
 * herede una sombra de texto (ScCopy del Hero hereda una negra de 0 0 18px
 * para proteger la copia sobre la corona del ojo) la pinta POR ENCIMA del
 * fondo del elemento, y con background-clip: text el degradado ES el fondo:
 * con el texto relleno en transparente, lo que se ve a traves de los glifos
 * es la sombra tapando el degradado. Medido en el render real: sin esto el
 * tramo ToInfinite salia NEGRO.
 */
export const gradientTextClip = css`
  ${heroGradient}
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${gradientShift} 9000ms linear infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    background-image: none;
    color: ${({ theme }) => theme.data.semantic.brandText};
    -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
  }

  /* Red de seguridad adicional: sin soporte de background-clip: text el
     texto NO puede quedar transparente e invisible -- se degrada al mismo
     color fijo de arriba, incondicional (no depende de reduced-motion). */
  @supports not (background-clip: text) {
    background-image: none;
    color: ${({ theme }) => theme.data.semantic.brandText};
    -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
  }
`;

const ScGradientTail = styled.span`
  ${gradientTextClip}
`;

interface BrandNameProps {
  /**
   * Polymorphic tag override (styled-components' built-in `as` prop, so it
   * never leaks onto the DOM node as a literal `as` attribute). Defaults to
   * `span`. Pass `"h1"` for the one place per page that should render the
   * brand as the page's main heading (e.g. the Hero).
   */
  as?: ElementType;
  /**
   * Activa el degradado animado en el tramo "ToInfinite". Default false: el
   * Navbar (y cualquier otro consumidor futuro) sigue en texto plano sin
   * saber que esta prop existe -- ningun consumidor actual cambia de
   * aspecto sin pasarla explicitamente.
   */
  gradientTail?: boolean;
}

export function BrandName({
  as,
  gradientTail = false,
}: BrandNameProps): ReactElement {
  return (
    // aria-label="VoidToInfinite": partir la marca en dos <span> mantiene
    // `textContent` exacto (verificado en BrandName.test.tsx), pero el
    // algoritmo de nombre accesible (AccName) concatena el texto de nodos
    // hermanos con un ESPACIO entre ellos -- medido en este repo con
    // Testing Library: sin este aria-label, el nombre accesible calculado
    // pasa a ser "Void ToInfinite" (con espacio) en cualquier consumidor
    // (Navbar, Hero), con o sin gradientTail. El aria-label fija el nombre
    // accesible explicito, sin depender de como el DOM interno reparte el
    // texto entre nodos.
    <ScBrandName
      as={as}
      aria-label="VoidToInfinite"
    >
      <span>Void</span>
      {gradientTail ? (
        <ScGradientTail>ToInfinite</ScGradientTail>
      ) : (
        <span>ToInfinite</span>
      )}
    </ScBrandName>
  );
}
