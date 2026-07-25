"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { ThemeProvider } from "styled-components";
import { Eye } from "@/components/eye/Eye";
import { EYE_CENTER } from "@/components/eye/eye.layers";
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
  /* Exactamente una pantalla MENOS la banda del navbar (que es sticky y ocupa
     flujo): con 100dvh a secas el hero medía una pantalla entera empezando 56px
     mas abajo, asi que la composicion del ojo quedaba descentrada y cortada por
     el pliegue. */
  min-height: calc(100vh - var(--nav-height));
  min-height: calc(100dvh - var(--nav-height));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[6]}
    ${({ theme }) => theme.data.space[5]};
  overflow: hidden;
`;

const ScEye = styled(Eye)`
  z-index: ${({ theme }) => theme.data.zIndex.base};
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
`;

/* Copy stagger-rise (spec §5): fija el orden de lectura en la carga. Cada hijo
   entra 120ms despues del anterior. Solo transform/opacity. */
const ScCopy = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[4]};
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
    animation-delay: 120ms;
  }
  > *:nth-child(3) {
    animation-delay: 240ms;
  }
  > *:nth-child(4) {
    animation-delay: 360ms;
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
`;

const ScActions = styled.div`
  /* Los CTAs tienen su propio fondo solido: la sombra que protege a la copia
     sobre la ilustracion aqui solo ensuciaria la etiqueta. */
  text-shadow: none;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  justify-content: center;
`;

/* El titular de portada usa la unica variante de la escala pensada para el
   hero (theme.data.type.scale.display): BrandName renderiza a font-size: 1em,
   asi que sin este contenedor el <h1> hereda el 1em del body (GlobalStyles
   resetea h1..h6 a font-size: 1em) y queda mas pequeno que el lead de abajo. */
const ScHeroBrand = styled.div`
  font-size: ${({ theme }) => theme.data.type.scale.display.size};
  /* line-height tambien hay que fijarlo: GlobalStyles pone 1.4em en el body,
     que se hereda como LONGITUD ya resuelta (22.4px), no como factor. Sin
     esto la caja del h1 mide 22px con glifos de 56px, el titular se desborda
     de su propia linea y se come el gap que lo separa del lead. */
  line-height: ${({ theme }) => theme.data.type.scale.display.lineHeight};
`;

export function Hero(): ReactElement {
  const { t } = useTranslation("home");

  return (
    <ThemeProvider theme={heroTheme}>
      <ScHero>
        <ScEye />
        <ScScrim aria-hidden="true" />
        <ScCopy>
          <ScHeroBrand>
            <BrandName as="h1" />
          </ScHeroBrand>
          <Typography variant="lead">{t("Home.description")}</Typography>
          <Typography variant="body">
            {t("Home.additionalDescription")}
          </Typography>
          <ScActions>
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
