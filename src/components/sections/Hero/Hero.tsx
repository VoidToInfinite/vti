"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { ThemeProvider } from "styled-components";
import { Eye } from "@/components/eye/Eye";
import { EYE_CENTER, EYE_SURFACE } from "@/components/eye/eye.layers";
import { BrandName } from "@/components/layout/Brand/BrandName";
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
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[6]}
    ${({ theme }) => theme.data.space[5]};
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
   resetea h1..h6 a font-size: 1em) y queda mas pequeno que el subtitulo. */
const ScHeroBrand = styled.div`
  /* min() es un tope de reflow, no un tamano de diseno: VoidToInfinite son 14
     caracteres inseparables. A 320px CSS quedan 272px utiles (padding space[5]
     a cada lado) y con el minimo del clamp -- 40px, avance medio estimado
     0.55em por glifo -- la palabra ocuparia unos 308px: se cortaria contra el
     overflow hidden del hero, que es un fallo de WCAG 1.4.10. El tope solo
     actua por debajo de 400px de ancho; por encima manda el token. */
  font-size: min(${({ theme }) => theme.data.type.scale.display.size}, 10vw);
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
   estilado. */
const ScSubtitle = styled(Typography)`
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
            <BrandName as="h1" />
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
            <Button
              as="a"
              href={links.playground}
              size="lg"
            >
              {t("Home.cta.explore")}
            </Button>
            <Button
              as="a"
              href="#story"
              variant="ghost"
              size="lg"
            >
              {t("Home.cta.story")}
            </Button>
          </ScActions>
        </ScCopy>
      </ScHero>
    </ThemeProvider>
  );
}
