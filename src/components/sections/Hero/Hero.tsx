"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes, ThemeProvider } from "styled-components";
import { Eye } from "@/components/eye/Eye";
import { EYE_CENTER, EYE_SURFACE } from "@/components/eye/eye.layers";
import {
  BrandName,
  gradientShift,
  gradientTextClip,
  heroGradient,
} from "@/components/layout/Brand/BrandName";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";
import { basicDarkTheme } from "@/theme/themes";

/*
 * El hero es una superficie SIEMPRE oscura: la composicion del ojo es negra en
 * tema claro y en tema oscuro (es identidad de marca, no un modo de color).
 * Sin esto, en tema claro `semantic.text` resuelve a casi-negro y la copia
 * desaparece sobre el ojo. En vez de forzar colores literales elemento a
 * elemento -- que ademas dejaria fuera el foco, los botones y cualquier pieza
 * que se anada despues -- se anida un `ThemeProvider` con el tema oscuro: cada
 * token dentro del hero (texto, marca, anillo de foco) resuelve al valor
 * disenado para fondo oscuro, y el contraste queda garantizado por el mismo
 * sistema que lo garantiza en el resto del sitio.
 *
 * La identidad del objeto es estable a proposito (constante de modulo, no un
 * literal en el render): un objeto nuevo por render invalidaria el contexto de
 * styled-components y re-renderizaria todo el subarbol en cada render del Hero.
 */
const heroTheme = { data: basicDarkTheme };

const ScHero = styled.section`
  position: relative;
  /* Una pantalla exacta: el navbar es fixed, esta fuera de flujo, asi que el
     hero empieza en el borde superior y la composicion queda centrada en el
     viewport en vez de descolgada por debajo del pliegue. */
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[6]}
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[8]};
  overflow: hidden;
`;

/*
 * En forced-colors el sistema fuerza color y fondos, pero NO ajusta las
 * imagenes: el texto del sistema quedaria sobre la ilustracion con un
 * contraste impredecible. El subarbol del ojo ya es aria-hidden y puramente
 * decorativo, asi que ocultarlo no pierde informacion y devuelve el contraste
 * que garantiza el SO. Eye reenvia className a su elemento raiz (Eye.tsx:106),
 * asi que la regla aplica al lienzo real y no a un envoltorio vacio.
 */
const ScEye = styled(Eye)`
  z-index: ${({ theme }) => theme.data.zIndex.base};

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Velo de contraste. La copia se lee sobre la pupila -- negra, contraste de
 * sobra -- pero los parrafos son mas anchos que ella y se derraman sobre la
 * corona, que es la zona mas brillante de la composicion. Este degradado
 * radial, anclado al MISMO centro que el ojo, apaga la corona justo debajo del
 * texto y se desvanece antes de tocar el anillo exterior, que es lo que hay
 * que preservar. Misma excepcion de color sancionada que `eye.parts.tsx`.
 */
const ScScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${({ theme }) => theme.data.zIndex.base};
  pointer-events: none;
  background: radial-gradient(
    ellipse 32% 30% at ${EYE_CENTER.x} ${EYE_CENTER.y},
    oklch(0 0 0 / 0.82) 0%,
    oklch(0 0 0 / 0.6) 58%,
    transparent 88%
  );

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Pie del hero. Garantiza que la ULTIMA fila de pixeles del hero sea el negro
 * del lienzo en cualquier relacion de aspecto. ScFrame mantiene la relacion
 * 1672/941 centrada: en viewports mas apaisados que 16:9 (un portatil de
 * 1440x720, una ultrapanoramica) el marco desborda en vertical y la fila
 * inferior es campo de nebulosa. Sin este pie, el extremo superior de la
 * costura de Story no coincidiria con lo que hay encima justo ahi, y el tajo
 * entre secciones reaparece. Con 4rem el coste decorativo es minimo y en la
 * mayoria de viewports el degradado cae sobre negro, donde es invisible.
 *
 * EYE_SURFACE es el negro de identidad importado de la capa de datos del ojo,
 * no un literal reescrito: dos literales iguales en dos archivos distintos se
 * separan al primer retoque y la costura reaparece. Misma excepcion de color
 * sancionada que documenta eye.parts.tsx.
 */
const ScHeroFoot = styled.div`
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  height: ${({ theme }) => theme.data.space[8]};
  z-index: ${({ theme }) => theme.data.zIndex.base};
  pointer-events: none;
  background-image: linear-gradient(
    to bottom,
    oklch(0 0 0 / 0) 0%,
    ${EYE_SURFACE} 100%
  );

  @media (forced-colors: active) {
    display: none;
  }
`;

/* Copy stagger-rise (spec §5): fija el orden de lectura en la carga. Los CINCO
   hijos (kicker, titulo, subtitulo, apoyo, acciones) entran con un paso de
   80ms, no de 120ms: con 120ms el CTA aparecia a 680ms desde el primer
   pintado; con 80ms entra a 520ms y la secuencia se sigue percibiendo como
   secuencia. Solo transform/opacity. */
const ScCopy = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  display: flex;
  flex-direction: column;
  align-items: center;
  /* space[0] es el token de cero: el gap UNIFORME es exactamente lo que
     aplanaba el bloque (los cuatro escalones separados por la misma
     distancia). El ritmo lo da ahora cada pieza con su margin-block-start
     logico, proporcional a la distancia semantica del par que separa. */
  gap: ${({ theme }) => theme.data.space[0]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  text-align: center;
  /* Segunda linea de defensa del contraste, ademas del velo: los parrafos son
     mas anchos que la pupila y sus extremos caen sobre la corona, que es la
     zona mas brillante y la mas irregular (filamentos finos, no un tono
     plano). Una sombra pegada al glifo garantiza el borde oscuro justo donde
     hace falta sin apagar la ilustracion entera. */
  text-shadow:
    0 1px 2px oklch(0 0 0 / 0.9),
    0 0 18px oklch(0 0 0 / 0.75);

  > * {
    animation: rise ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.decelerate} backwards;
  }
  > *:nth-child(2) {
    animation-delay: 80ms;
  }
  > *:nth-child(3) {
    animation-delay: 160ms;
  }
  > *:nth-child(4) {
    animation-delay: 240ms;
  }
  > *:nth-child(5) {
    animation-delay: 320ms;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none;
    }
  }

  /* Con el ojo oculto en forced-colors, la sombra que protegia la copia sobre
     la ilustracion solo ensuciaria el texto del sistema. */
  @media (forced-colors: active) {
    text-shadow: none;
  }
`;

const ScActions = styled.div`
  /* Los CTAs tienen su propio fondo solido: la sombra que protege a la copia
     sobre la ilustracion aqui solo ensuciaria la etiqueta. */
  text-shadow: none;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  justify-content: center;
  /* La mayor separacion del bloque: es la frontera entre leer y actuar. */
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

/* El titular de portada usa la unica variante de la escala pensada para el
   hero (theme.data.type.scale.display): BrandName renderiza a font-size: 1em,
   asi que sin este contenedor el <h1> hereda el 1em del body (GlobalStyles
   resetea h1..h6 a font-size: 1em) y queda mas pequeno que el subtitulo.

   EXCEPCION: font-size es un valor LITERAL pedido por el usuario --
   clamp(34px, 8vw, 258px) -- que sustituye a
   min(theme.data.type.scale.display.size, 10vw). Es una decision explicita
   que se salta la escala tipografica (theme.data.type.scale.display) a
   proposito: NO se corrige a un token, se documenta como excepcion. El suelo
   de 34px (mayor que 8vw por debajo de ~425px CSS) sigue evitando que
   "VoidToInfinite" -- 14 caracteres inseparables, hyphens: manual mas abajo
   -- se corte contra el overflow hidden del hero a anchos pequenos. */
const ScHeroBrand = styled.div`
  font-size: clamp(34px, 8vw, 258px);
  /* line-height tambien hay que fijarlo: GlobalStyles pone 1.4em en el body,
     que se hereda como LONGITUD ya resuelta (22.4px), no como factor. Sin
     esto la caja del h1 mide 22px con glifos de 56px, el titular se desborda
     de su propia linea y se come el espacio que lo separa del subtitulo. */
  line-height: ${({ theme }) => theme.data.type.scale.display.lineHeight};
  /* El body fija hyphens auto: sin esto el navegador puede partir el nombre de
     marca al final de linea. */
  hyphens: manual;
  /* Kicker y titulo son una unidad: el kicker etiqueta al titulo. */
  margin-block-start: ${({ theme }) => theme.data.space[2]};
`;

/* Las mayusculas se hacen por CSS y no en el JSON: varios lectores de pantalla
   deletrean como siglas las cadenas escritas en caja alta, asi que el nombre
   accesible conserva la caja natural de la traduccion. El color de marca no
   necesita && ni !important: styled(Typography) inyecta su clase despues de la
   de ScTypography y gana la cascada (medido en este repo). */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
  hyphens: manual;
`;

/* Cambio de tier: el subtitulo se despega del titular. La medida corta lo
   mantiene en dos lineas legibles de un vistazo; con los 65ch de prose a 24px
   seria una sola linea interminable.
   Se consume con forwardedAs="p", NO con as="p": en styled-components v6 el
   prop `as` lo consume el propio wrapper -- renderiza un <p> pelado y descarta
   el componente envuelto --, asi que con `as` el subtitulo perdia TODA la
   escala tipografica de Typography (medido: clase base ausente, font-size
   vacio, color canvastext). `forwardedAs` se pasa hacia abajo como `as` del
   componente envuelto, que es lo que anula el h3 por defecto sin perder el
   estilado.

   EXCEPCION: font-size es un valor LITERAL pedido por el usuario --
   clamp(15px, 2vw, 22px) -- que sustituye al 1.5rem/24px de
   theme.data.type.scale.h3 que aporta variant="h3". Se documenta como
   excepcion, no se corrige a la escala. Gana la cascada por el mismo motivo
   que el color de ScKicker: la clase de ScSubtitle se inyecta despues de la
   de ScTypography. */
const ScSubtitle = styled(Typography)`
  font-size: clamp(15px, 2vw, 22px);
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.proseTight};
`;

/* Misma prosa que el subtitulo: separacion corta. NO baja a textMuted a
   proposito -- es la linea mas ancha y sus extremos caen sobre la corona, la
   zona mas brillante e irregular de la ilustracion, donde el contraste ya esta
   en QA. La jerarquia la dan tamano, peso, tracking y espacio. */
const ScSupport = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  text-wrap: pretty;
`;

/*
 * CTA primario: MISMO degradado y animacion que ScGradientTail
 * (BrandName.tsx) -- ver alli la excepcion completa al lenguaje de
 * movimiento del sistema (background-position no es una propiedad de
 * compositor, guard no-preference, y por que el colapso de GlobalStyles
 * bajo reduced-motion es un flash de un punto no determinista del
 * degradado, no "gira para siempre"). heroGradient/gradientShift se
 * IMPORTAN de BrandName.tsx en vez de redeclararse aqui: titulo y CTA
 * recorren exactamente el mismo color en el mismo instante, no tres
 * declaraciones que podrian divergir con el tiempo.
 *
 * Aditivo sobre Button: ScButton.tsx no se toca, esto es un envoltorio
 * styled(Button) que anade una capa de fondo por encima -- las 4 variantes x
 * 3 tamanos de Button en cualquier otro punto del sitio siguen exactamente
 * igual porque la clase solo se aplica aqui, via composicion explicita,
 * nunca por defecto.
 */
/*
 * Glow de hover de los dos CTA, con los MISMOS colores que recorre el
 * degradado del titular. Vive en un ::after propio y no en el box-shadow del
 * boton por dos motivos: el pseudo-elemento se puede animar por OPACIDAD
 * (propiedad de compositor, la regla de movimiento de la casa) en vez de
 * animar el box-shadow, que obliga a repintar; y al quedar fuera del flujo no
 * empuja nada ni altera el area de click -- por eso lleva pointer-events:
 * none.
 *
 * La respiracion solo corre MIENTRAS hay hover o foco: no es una animacion
 * ambiental permanente, asi que no arrastra la deuda de "animacion infinita
 * que nadie pausa al salir del viewport" que ya tienen el titular y el fondo
 * de los CTA (anotada en docs/qa-3d-pendiente.md).
 */
const ctaGlowPulse = keyframes`
  from { opacity: 0.65; }
  to { opacity: 1; }
`;

const ctaGlow = css`
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    /* color-mix para dar alfa a un token sin duplicar su valor literal;
       mismo recurso que ya usa Button en su variante soft. */
    box-shadow:
      0 0 18px
        ${({ theme }) =>
          `color-mix(in oklch, ${theme.data.semantic.brandText} 55%, transparent)`},
      0 0 38px
        ${({ theme }) =>
          `color-mix(in oklch, ${theme.data.palette.secondary[300]} 40%, transparent)`};
    transition: opacity ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    &:hover::after,
    &:focus-visible::after {
      animation: ${ctaGlowPulse} 1600ms
        ${({ theme }) => theme.data.motion.easing.standard} infinite alternate;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
`;

const ScCtaPrimary = styled(Button)`
  ${ctaGlow}

  @media (prefers-reduced-motion: no-preference) {
    ${heroGradient}
    animation: ${gradientShift} 9000ms linear infinite alternate;

    /*
     * FIX (medido en render real): sin esto, al pasar el cursor el
     * degradado desaparecia y el boton volvia a su relleno solid. Causa: la
     * variante solid de Button.tsx (ScButton.tsx, bloque
     * $variant==="solid") declara en su propio :hover
     * background: color-mix(...) -- la propiedad ABREVIADA background, no
     * el longhand background-color. Una abreviatura resetea TODAS sus
     * sub-propiedades a su valor inicial salvo la que se especifica
     * explicitamente, asi que ese hover ponia background-image EN NONE,
     * matando el degradado sin que ninguna otra regla lo tocara.
     *
     * Se reafirma aqui con el MISMO selector que usa Button.tsx para ese
     * hover (:hover:not(:disabled)): misma especificidad exacta, asi que
     * gana por orden de insercion -- styled(Button) inyecta su clase
     * DESPUES de ScButton (mismo patron ya medido y documentado para
     * styled(Typography) en Hero.tsx/BrandName.tsx). Verificado en el
     * navegador real: el bloque de Button aparece antes en la hoja de
     * estilos que el de este componente.
     */
    &:hover:not(:disabled) {
      ${heroGradient}
    }
  }
  /* Bajo reduced-motion no se aplica ninguna capa nueva: el boton conserva
     su fondo solid por defecto (semantic.brandSolid), ya auditado AA por
     contrast.test.ts ("onBrand sobre brandSolid >= 4.5:1"). Cero token
     nuevo para este caso. */
`;

/*
 * CTA secundario: mismo heroGradient/gradientShift, aplicados como borde
 * animado en vez de fondo. El truco de mascara (dos capas + composite) deja
 * visible solo el anillo de `padding` px: `content-box` en la primera capa
 * excluye el interior, y `mask-composite`/`-webkit-mask-composite` restan
 * esa capa de la segunda (que cubre toda la caja), dejando solo el borde.
 * Se declaran las dos formas (con y sin prefijo) porque el soporte de
 * `mask-composite` sin prefijo y de `-webkit-mask-composite` (con el valor
 * legado "xor") difiere entre motores -- ver docs/qa-3d-pendiente.md, no
 * verificable en este entorno sin navegador real.
 */
const ScCtaSecondary = styled(Button)`
  position: relative;
  ${ctaGlow}

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    pointer-events: none;

    @media (prefers-reduced-motion: no-preference) {
      ${heroGradient}
      animation: ${gradientShift} 9000ms linear infinite alternate;
    }
    @media (prefers-reduced-motion: reduce) {
      background-color: ${({ theme }) => theme.data.semantic.brandText};
    }
  }
`;

/*
 * Texto del CTA secundario, con el MISMO degradado animado que su borde
 * (gradientTextClip, extraido de BrandName.tsx -- misma mecanica de recorte
 * que ToInfinite en el titulo). Antes el texto era un color solid propio
 * (semantic.brandSolid, heredado del `color` que fija la variante ghost de
 * Button.tsx) mientras el borde recorria un degradado de tres colores: dos
 * tratamientos distintos en el mismo boton.
 *
 * Al ser un <span> propio con su PROPIA declaracion de `color`/
 * `-webkit-text-fill-color`, no compite por especificidad contra el `color`
 * que Button.tsx fija en ScButton: una declaracion directa sobre el propio
 * elemento gana siempre a un valor heredado del padre, sin importar
 * especificidad. Por el mismo motivo "mantiene color y animacion" en hover
 * sin ningun guard adicional: el :hover de la variante ghost de Button.tsx
 * (ScButton.tsx) solo toca el `background` del boton, nunca un descendiente,
 * asi que no hay nada que reafirmar aqui -- a diferencia del fondo del CTA
 * primario (ver el comentario en ScCtaPrimary), este caso no tiene conflicto
 * de cascada que resolver.
 */
const ScCtaSecondaryLabel = styled.span`
  ${gradientTextClip}
`;

export function Hero(): ReactElement {
  const { t } = useTranslation("home");

  return (
    <ThemeProvider theme={heroTheme}>
      <ScHero>
        <ScEye />
        <ScScrim aria-hidden="true" />
        <ScHeroFoot
          aria-hidden="true"
          data-testid="hero-foot"
        />
        <ScCopy>
          <ScKicker
            variant="overline"
            data-testid="hero-kicker"
          >
            {t("Home.hero.kicker")}
          </ScKicker>
          <ScHeroBrand data-testid="hero-title">
            <BrandName
              as="h1"
              gradientTail
            />
          </ScHeroBrand>
          <ScSubtitle
            variant="h3"
            forwardedAs="p"
            data-testid="hero-subtitle"
          >
            {t("Home.hero.subtitle")}
          </ScSubtitle>
          <ScSupport
            variant="body"
            data-testid="hero-support"
          >
            {t("Home.hero.support")}
          </ScSupport>
          <ScActions data-testid="hero-actions">
            {/* forwardedAs="a", NO as="a": ScCtaPrimary/ScCtaSecondary
                envuelven Button con styled(), y Button ya intercepta su
                propio prop `as` internamente (ver Button.tsx) -- el mismo
                gotcha ya documentado arriba para ScSubtitle/Typography.
                Medido en este repo: con `as="a"` styled-components renderiza
                un <a> PELADO con solo la clase del wrapper y descarta Button
                entero (sizeStyles, variantes, ScLabel, spinner); con
                `forwardedAs="a"` Button recibe el as por su propio prop y
                sigue resolviendo su <ScButton as="a">, conservando toda su
                logica -- el wrapper solo anade su clase por encima. */}
            <ScCtaPrimary
              forwardedAs="a"
              href={links.playground}
              size="lg"
            >
              {t("Home.cta.explore")}
            </ScCtaPrimary>
            <ScCtaSecondary
              forwardedAs="a"
              href="#story"
              variant="ghost"
              size="lg"
            >
              <ScCtaSecondaryLabel>{t("Home.cta.story")}</ScCtaSecondaryLabel>
            </ScCtaSecondary>
          </ScActions>
        </ScCopy>
      </ScHero>
    </ThemeProvider>
  );
}
