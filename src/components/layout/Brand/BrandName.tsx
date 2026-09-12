import type { ElementType, ReactElement } from "react";
import styled, { css, keyframes } from "styled-components";
import { AMBIENT } from "@/motion/vocabulary";
import type { ThemeDefinition } from "@/theme/theme.types";

/*
 * `flex-wrap: wrap` + `overflow-wrap: anywhere`: el rotulo cede ENVOLVIENDO
 * cuando la preferencia de tamano de texto del usuario lo deja sin sitio
 * (critica externa #19, 2026-09-04, WCAG 1.4.4).
 *
 * Medido en Chrome real sobre el build de produccion, raiz del documento a
 * 32px con `Page.setFontSizes` y viewport de 320 px: el rotulo pedia 238 px en
 * una caja de 160, y su consumidor de la barra (`ScBrandLink`, `Navbar.tsx`)
 * lo tapaba con `overflow: hidden` -- 78 px de tinta cortados a media letra y
 * «ToInfinite» terminando en x=349,72 sobre 320 px de viewport, inalcanzable
 * porque `GlobalStyles` declara `html, body { overflow-x: clip }`. El
 * `text-overflow: ellipsis` que aquel bloque declaraba no llegaba a pintar
 * nada: no se aplica a un contenedor flex, y este `span` lo es.
 *
 * `flex-wrap: wrap` parte por la juntura natural del nombre (los dos `span`
 * de «Void» y «ToInfinite» son items de este flex), asi que la degradacion
 * normal son dos lineas, no una palabra rota. `overflow-wrap: anywhere` es el
 * ultimo recurso para el caso extremo en que ni «ToInfinite» sola quepa, y
 * ademas es lo que reduce el `min-content` de esta caja -- la magnitud de la
 * que dependen las cajas de arriba para poder encoger. Ninguna de las dos
 * actua mientras el nombre quepa entero en una linea.
 */
const ScBrandName = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  overflow-wrap: anywhere;
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.data.semantic.text};
`;

/*
 * Excepcion documentada al lenguaje de movimiento del sistema (solo
 * transform/opacity; ver BackOrbs.tsx, eye.parts.tsx, poster de SceneLoader,
 * Wormhole, Sol). Un degradado de texto ANIMADO exige mover
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

/*
 * Hasta la Task 33 (2026-08-12) este mismo degradado alimentaba TAMBIÉN los
 * dos CTA del sitio (ScCtaPrimary en Hero.tsx, ScSubmitButton en
 * Contact.tsx): "MISMO degradado, una sola definición de los stops, para que
 * título y CTA recorran exactamente el mismo color en el mismo instante".
 * ESO YA NO ES CIERTO -- ver `ctaGradient`, más abajo, para el porqué del
 * split y las cifras que lo obligan. `heroGradient` se queda con su único
 * consumidor real: `gradientTextClip`, el degradado que recorta a texto el
 * tramo "ToInfinite" del h1 del Hero y el cierre de la última diapositiva
 * del deck oscuro de Story (`ScDeckNoteAccent`, story.deck.tsx).
 *
 * CORRECCIÓN DE ESTE MISMO DOCBLOCK (crítica externa #18, P1, 2026-09-04).
 * Hasta esa crítica, este bloque justificaba el split diciendo que aquí "el
 * degradado ES el texto y no hay ningún glifo opaco superpuesto cuyo
 * contraste dependa de él". La primera mitad es cierta; la conclusión que se
 * sacaba de ella era falsa, y es exactamente lo que dejó vivo el defecto: que
 * el degradado sea la TINTA no elimina el contraste que hay que medir, lo
 * MUEVE. En un botón se mide degradado-contra-la-letra-de-encima
 * (`semantic.onBrand`, umbral AA de texto normal, 4.5:1); aquí se mide
 * degradado-contra-el-FONDO-de-la-página (`semantic.bg` y la superficie real
 * del hero, umbral AA de texto grande, 3:1, porque el h1 es display). Nadie
 * medía la segunda, así que la parada de 65% se quedó leyendo un peldaño
 * CRUDO de paleta (`palette.secondary[300]`, L 0.86) que resuelve igual en
 * las dos ramas -- correcto sobre el void casi negro del tema oscuro, y a
 * 1,6:1 sobre el casi blanco del tema claro.
 */
export function heroGradientMidStop(theme: ThemeDefinition): string {
  return theme.isLight
    ? theme.palette.secondary[700]
    : theme.palette.secondary[300];
}

/*
 * `HERO_GRADIENT_SIZE_X_PERCENT` no es decoración: es la mitad de la
 * geometría que produce el defecto. Con el fondo escalado al 260% del ancho
 * de la caja, en cada instante solo se ve 100/260 = 38,5% del degradado, y
 * `gradientShift` recorre `background-position` de 0% a 100% -- así que a lo
 * largo de la animación la ventana visible BARRE el degradado entero y toda
 * parada llega a pintar glifo, incluida la de 65%. Por eso el candado
 * (`BrandName.contrast.test.ts`) no muestrea "el degradado" en abstracto:
 * reconstruye la ventana visible fase a fase leyendo ESTE número, en vez de
 * copiarlo a mano al test (regla 39: el recuento se lee de la misma fuente
 * que consume el componente).
 */
export const HERO_GRADIENT_SIZE_X_PERCENT = 260;

export interface GradientStop {
  /** Posición de la parada dentro del degradado, en porcentaje. */
  readonly position: number;
  /** Color `oklch()` ya resuelto contra el tema recibido. */
  readonly color: string;
}

/*
 * Las paradas se declaran como DATOS y el bloque `css` de abajo las serializa,
 * en vez de escribirlas a mano dentro del template. Mismo motivo que hizo
 * nombrar `ctaGradientMidStop` en la Task 33, un paso más allá: así el candado
 * importa la función que de verdad pinta -- colores Y posiciones -- y no puede
 * quedarse midiendo un degradado que ya no existe en pantalla.
 */
export function heroGradientStops(theme: ThemeDefinition): GradientStop[] {
  return [
    { position: 0, color: theme.semantic.text },
    { position: 35, color: theme.semantic.brandText },
    { position: 65, color: heroGradientMidStop(theme) },
    { position: 100, color: theme.semantic.text },
  ];
}

export const heroGradient = css`
  background-image: linear-gradient(
    100deg,
    ${({ theme }) =>
      heroGradientStops(theme.data)
        .map((stop) => `${stop.color} ${stop.position}%`)
        .join(", ")}
  );
  background-size: ${HERO_GRADIENT_SIZE_X_PERCENT}% 100%;
`;

/*
 * ctaGradient (Task 33, gate F4, hallazgo del evaluador independiente
 * 2026-08-12): degradado de fondo para los DOS CTA con texto legible ENCIMA
 * -- ScCtaPrimary (Hero.tsx) y ScSubmitButton (Contact.tsx) -- separado de
 * `heroGradient` porque ese SÍ necesita pasar AA contra `semantic.onBrand`
 * (el color del texto del botón) en cada fotograma de la animación, y
 * `heroGradient` no lo pasaba.
 *
 * CAUSA RAÍZ, medida con `contrastRatio` (`BrandName.contrast.test.ts`,
 * describe "Task 33"), no muestreada a ojo:
 *
 *   TEMA CLARO (texto del botón = semantic.onBrand = blanco):
 *     parada 0%/100% (semantic.text)      12.686:1
 *     parada 35% (semantic.brandText)      5.837:1
 *     parada 65% (palette.secondary[300])  1.690:1  <- PEOR, incumple AA (4.5:1)
 *
 *   TEMA OSCURO (texto del botón = semantic.onBrand = casi negro):
 *     parada 0%/100% (semantic.text)      16.590:1
 *     parada 35% (semantic.brandText)     11.365:1
 *     parada 65% (palette.secondary[300]) 10.248:1  <- PEOR, YA pasaba AA
 *
 * El tema oscuro nunca incumplió -- su `semantic.onBrand` es casi negro
 * (`neutral[1100]`), no blanco, así que hasta el punto más claro del
 * degradado le sobra contraste. Solo la parada de 65% en tema CLARO necesita
 * un color distinto.
 *
 * POR QUÉ MEDIR SOLO LOS 3 STOPS BASTA AQUÍ -- Y POR QUÉ NO ES UNA LEY
 * GENERAL (fix de revisión: corrige una afirmación previa de esta misma
 * tarea que era incorrecta -- ver el historial del commit). Un
 * `linear-gradient()` sin hint `in <space>` interpola en OKLab (CSS Color 4,
 * "Interpolation"): entre dos paradas adyacentes, `L` SÍ es lineal (y por
 * tanto monótona). Pero de ahí NO se sigue que la LUMINANCIA RELATIVA WCAG
 * -- la que de verdad decide el contraste -- también lo sea:
 * `oklchToLinearSrgb` (`contrast.ts`) deriva R/G/B de l/m/s con
 * COEFICIENTES DE SIGNO MIXTO (`R = 4.077·l − 3.308·m + 0.231·s`), así que
 * un camino monótono en `L` (o en OKLab en general) puede producir una
 * luminancia sRGB NO monótona a lo largo del mismo segmento -- la
 * conflación "L monótona ⇒ contraste mínimo siempre en un stop" era el
 * error, no la conclusión práctica de esta tarea.
 *
 * La condición que de verdad sostiene "3 stops bastan" aquí es otra,
 * ESTRUCTURAL de este caso concreto: `semantic.onBrand` es un EXTREMO de la
 * escala de luminancia (blanco puro en claro; casi negro, con croma ~0, en
 * oscuro), así que NINGÚN par de paradas del degradado puede "flanquear"
 * (rodear) su luminancia -- el fondo nunca CRUZA el color del texto, solo
 * se aleja o se acerca desde un único lado. Si `onBrand` dejara de ser un
 * extremo algún día, este argumento dejaría de sostenerse y el candado de 3
 * stops podría dejar pasar un mínimo interior real sin avisar. Por eso el
 * candado (`BrandName.contrast.test.ts`) NO se apoya solo en esta
 * demostración analítica: también MUESTREA cada segmento del degradado (25
 * puntos por segmento, interpolados en OKLab -- L/a/b lineales, igual que
 * hace el motor del navegador) y exige AA en cada punto, así que sigue
 * siendo válido aunque la condición estructural de arriba deje de cumplirse.
 *
 * Resolución POR RAMA (`theme.data.isLight`), mismo precedente que la
 * Task 26 (`accentColor`/`accentColorHover`, `Features.tsx`: `palette` es
 * compartida entre `themes.light`/`themes.dark`, así que un único paso no
 * puede servir a las dos ramas a la vez): en claro la parada de 65% sube de
 * `secondary[300]` (L 0.86) a `secondary[700]` (L 0.53, mismo hue 311.928)
 * -- **5.921:1** contra blanco, con margen sobre AA. En oscuro se queda
 * igual (`secondary[300]`, ya pasaba con 10.248:1).
 *
 * La animación NO se retira -- el brief de la tarea lo permite si el peor
 * fotograma pasa AA, y ahora pasa -- sigue siendo `gradientShift`, 9000ms,
 * `linear infinite alternate`, sobre `background-position`: la única
 * diferencia con `heroGradient` es qué color pinta la parada de 65% en tema
 * claro.
 *
 * `ctaGradientMidStop` se exporta como función nombrada, no como ternario
 * inline dentro del `css` (mismo motivo que `accentColor`/
 * `accentColorHover` en `Features.tsx`, Task 26): así el candado de
 * `BrandName.contrast.test.ts` importa y llama la MISMA función que resuelve
 * el color real en pantalla, en vez de duplicar el ternario a mano en el
 * test -- una duplicación que podría divergir del código real sin que nada
 * lo delate.
 */
export function ctaGradientMidStop(theme: ThemeDefinition): string {
  return theme.isLight
    ? theme.palette.secondary[700]
    : theme.palette.secondary[300];
}

export const ctaGradient = css`
  background-image: linear-gradient(
    100deg,
    ${({ theme }) => theme.data.semantic.text} 0%,
    ${({ theme }) => theme.data.semantic.brandText} 35%,
    ${({ theme }) => ctaGradientMidStop(theme.data)} 65%,
    ${({ theme }) => theme.data.semantic.text} 100%
  );
  background-size: ${HERO_GRADIENT_SIZE_X_PERCENT}% 100%;
`;

/*
 * Bloque de "texto con el degradado animado", compartido con el cierre de la
 * ultima diapositiva del deck oscuro de Story (ScDeckNoteAccent,
 * story.deck.tsx; T7 de la spec 2026-07-31-story-deck-tipografia) por el
 * mismo motivo que heroGradient ya se comparte: una sola definicion de la
 * mecanica de recorte, para que el titulo y esa nota recorran exactamente el
 * mismo color en el mismo instante y con las mismas tres redes de seguridad,
 * en vez de dos declaraciones que podrian divergir con el tiempo.
 *
 * El OTRO consumidor que este docblock citaba -- el label del CTA secundario
 * del Hero (ScCtaSecondaryLabel) -- ya no existe: el CTA secundario se retiro
 * el 2026-08-08 y su styled se borro con el (el porque completo, en el
 * docblock "CTA SECUNDARIO RETIRADO" de Hero.tsx). Se corrige aqui al pasar
 * por la critica externa #18 (regla 16: un comentario que ya no describe el
 * codigo es peor que ningun comentario).
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
    /* Task 19 (motion core, punto 7 del brief): 9000ms pasa a
       AMBIENT.floatMs (arroba/motion/vocabulary) -- mismo valor, ahora
       consumidor real del vocabulario (gate F2: AMBIENT tenia 0 consumidores
       antes de esta tarea). Hero.tsx y Contact.tsx migran el mismo literal en
       sus propias declaraciones de animation sobre este mismo gradientShift. */
    animation: ${gradientShift} ${AMBIENT.floatMs}ms linear infinite alternate;
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
