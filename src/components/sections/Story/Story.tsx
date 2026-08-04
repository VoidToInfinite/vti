"use client";
import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useSlideDeck } from "@/hooks/useSlideDeck";
import { useTheme } from "@/theme/ThemeProvider";
import { StoryCosmicBeing } from "@/components/storyCosmicBeing/StoryCosmicBeing";
import {
  ScDeck,
  ScDeckIntroBody,
  ScDeckNote,
  ScDeckNoteAccent,
  ScDeckPillarBody,
  ScDeckPillarSubtitle,
  ScDeckPillarTitle,
  ScDeckTitle,
  ScRail,
  ScRailMark,
  ScSceneWrap,
  ScSlide,
  ScStage,
  ScTrack,
} from "./story.deck";
import {
  STORY_ACCENT_GRADIENT_DARK,
  STORY_ACCENT_GRADIENT_LIGHT,
  STORY_CARD_BG,
  STORY_CARD_BORDER,
  STORY_CARD_FLOAT_MS,
  STORY_CARD_SHADOW,
  STORY_DECK_TAIL_SCREENS,
  STORY_FIGURE_ASPECT,
  STORY_FIGURE_FLOAT_MS,
  STORY_FIGURE_HEIGHT,
  STORY_FIGURE_SCROLL_SHIFT,
  STORY_FIGURE_SIZES,
  STORY_FIGURE_WIDTH,
  STORY_FLOAT_AMPLITUDE,
  STORY_HALO_GRADIENT,
  STORY_HALO_INSET,
  STORY_NOTE_SCROLL_SHIFT,
  STORY_SLIDES,
} from "./story.layers";

/*
 * Story ("Why VoidToInfinite?"). Rama CLARA (mockup `Landing v2.dc.html`
 * L70-101): grid figura+contenido, sin cambios de comportamiento respecto a
 * la reescritura de 2026-07-28 (D3/D4 de ese spec).
 *
 * Rama OSCURA (spec 2026-07-29): no hay mockup oscuro de esta seccion. En
 * vez de la figura recortada + halo + tarjeta flotante, el fondo es la
 * escena parallax `StoryCosmicBeing` (11 capas, D1-D12 del spec) y el
 * contenido (mismo i18n `Home.story.*`) se superpone encima. La nota
 * (`Home.story.note`) se conserva como linea de cierre bajo los pilares,
 * SIN la tarjeta flotante ni el icono sparkle (D8): esta composicion no
 * tiene sitio para una tarjeta sin tapar el nucleo del corazon.
 *
 * `themeName` decide la rama (no `theme.data.isLight`): mismo criterio que
 * `HomeSections.tsx`, que ya usa `useTheme()` de `@/theme/ThemeProvider`
 * para esta misma decision.
 */

/* Flotacion compartida por la figura y la tarjeta de nota EN CLARO (mismo
   keyframe que el mockup reutiliza con dos duraciones distintas, ver
   story.layers.ts). La rama oscura no la usa: su unica animacion es el
   pulso del nucleo, declarado en storyCosmicBeing.parts.tsx. */
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(${STORY_FLOAT_AMPLITUDE}); }
`;

const PILLARS = [
  { key: "learn", number: "01" },
  { key: "create", number: "02" },
  { key: "grow", number: "03" },
  { key: "practice", number: "04" },
] as const;

/** Color de cada numero de pilar: los tres primeros son pasos reales de
 *  `palette.primary`/`palette.secondary` (mockup L82/87/92: `--primary-500`,
 *  `--secondary-500`, `--secondary-600`) -- referencia directa al tema, no
 *  un literal nuevo. El cuarto pilar ("practice", 2026-07-28) continua la
 *  MISMA rampa un paso mas (`secondary[700]`). `palette.*` no cambia entre
 *  temas (vive en `shared` de `themes.ts`), asi que estos colores sirven
 *  tal cual en las dos ramas. */
function pillarColor(
  index: number,
): (props: { theme: DefaultTheme }) => string {
  return ({ theme }) => {
    if (index === 0) return theme.data.palette.primary[500];
    if (index === 1) return theme.data.palette.secondary[500];
    if (index === 2) return theme.data.palette.secondary[600];
    return theme.data.palette.secondary[700];
  };
}

/*
 * Rama clara: contenedor de contenido normal (padding + tope de ancho,
 * centrado -- sin cambios respecto a la version anterior).
 *
 * Rama oscura ($fullBleed, spec 2026-07-31-story-deck-hero-transition-design.md
 * D15c, tercera iteracion): las dos entregas anteriores acotaban esta
 * seccion a una caja fija (primero a sangre, luego a `STORY_DARK_MAX_WIDTH` x
 * `STORY_DARK_HEIGHT`). Con la presentacion de 6 diapositivas esa caja fija
 * desaparece: `ScTrack` (story.deck.tsx) es quien mide 6 pantallas de alto
 * ahora, y `ScStory` vuelve a ser solo un contenedor relativo sin medida
 * propia, que crece con su contenido. Pierde su `overflow: hidden`: CUALQUIER
 * ancestro con overflow distinto de `visible`/`clip` rompe el
 * `position: sticky` del stage de mas abajo (D15c) -- el recorte del
 * overscan del parallax pasa a `ScStage`, que no es ancestro de si mismo.
 * `background-color` explicito (no solo heredado de `body`) porque, con el
 * stage escalandose durante la apertura/cierre de la presentacion, el borde
 * que asoma detras tiene que ser el mismo `secondary[1100]` del encargo
 * (D8), no lo que hubiera detras por casualidad.
 */
const ScStory = styled.section<{ $fullBleed: boolean }>`
  ${({ $fullBleed, theme }) =>
    $fullBleed
      ? css`
          position: relative;
          background-color: ${theme.data.semantic.bg};
        `
      : css`
          padding: ${theme.data.space[9]} ${theme.data.space[5]};
          max-width: ${theme.data.grid.containerMax};
          margin-inline: auto;
        `}
`;

/*
 * Reveal de sección en CLARO (mismo patrón que `ScItem` en Features.tsx).
 * Duración/easing unificados (D7, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`):
 * `motion.duration.slower` (480ms) + `motion.easing.decelerate` en vez de
 * `duration.slow` (320ms) que llevaba antes -- mismo lenguaje de entrada que
 * `ScStepReveal` en Journey.tsx, que hasta esta entrega usaba la MISMA
 * duración pero `easing.emphasized`, sin ninguna razón documentada para la
 * divergencia entre las dos secciones.
 */
const ScGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[7]};
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    grid-template-columns: minmax(280px, ${STORY_FIGURE_WIDTH}) 1fr;
    gap: ${({ theme }) => theme.data.space[8]};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }
`;

const ScFigureWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(${STORY_FIGURE_HEIGHT}, 70vh);
`;

const ScHalo = styled.div`
  position: absolute;
  inset: ${STORY_HALO_INSET};
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: ${STORY_HALO_GRADIENT};
  pointer-events: none;
`;

/*
 * Envoltorio del desplazamiento de scroll de la figura (D1, ver el docblock
 * de STORY_FIGURE_SCROLL_SHIFT en story.layers.ts para el porque no vive
 * directamente en ScFigureImg): un elemento DISTINTO al que ya anima
 * transform con @keyframes.
 *
 * El ancho se declara AQUI con la MISMA formula que antes llevaba
 * ScFigureImg (min(STORY_FIGURE_WIDTH, 100%)) y no se deja en "auto" -- este
 * div es el item de flex de ScFigureWrap ahora, y un item de flex con ancho
 * "auto" se dimensiona por shrink-to-fit de SU CONTENIDO; con el hijo
 * (ScFigureImg) declarando a su vez `width: 100%` contra ESTE envoltorio,
 * las dos reglas dependerian una de la otra (el envoltorio de su hijo, el
 * hijo de un envoltorio que todavia no tiene ancho resuelto). CSS resuelve
 * esa circularidad tratando el porcentaje del hijo como si el ancho del
 * padre fuera indefinido (CSS2.1 SS10.3.3: un porcentaje contra un
 * contenedor sin ancho explicito se trata como "auto"), lo que aqui
 * colapsaria la imagen -- la misma familia de fallo que ya documenta
 * task/lessons.md (2026-07-28, "Una altura porcentual del mockup presupone
 * el alto fijo de SU contenedor"), en el eje horizontal en vez del vertical.
 * Declarando la formula real aqui, el envoltorio tiene un ancho DEFINITIVO
 * (se resuelve contra ScFigureWrap, que a su vez lo tiene por el grid que lo
 * contiene) y el `width: 100%` del hijo deja de ser circular. El resultado
 * es la MISMA caja, pixel a pixel, que ocupaba ScFigureImg antes de este
 * envoltorio.
 */
const ScFigureShift = styled.div`
  width: min(${STORY_FIGURE_WIDTH}, 100%);
  transform: translateY(
    calc(${STORY_FIGURE_SCROLL_SHIFT} * var(--story-progress, 0))
  );

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const ScFigureImg = styled.img`
  position: relative;
  display: block;
  /* El ancho ya lo fija ScFigureShift (ver su docblock): aqui solo se llena
     ese envoltorio, ahora con un ancho definitivo, sin circularidad. */
  width: 100%;
  height: auto;
  aspect-ratio: ${STORY_FIGURE_ASPECT};
  /* GlobalStyles declara img { object-fit: cover } para todo el sitio; con
     la caja del mockup (375/548) sobre un arte 2:3, cover recortaria ~2.5%
     del alto (medido en navegador, revision 2026-07-28). contain no recorta
     nada y el margen sobrante es alfa puro, invisible. */
  object-fit: contain;
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} ${STORY_FIGURE_FLOAT_MS}ms ease-in-out infinite;
  }
`;

/*
 * Envoltorio del desplazamiento de scroll de la tarjeta de nota (D1, mismo
 * motivo que ScFigureShift: ScNoteCard ya anima transform con @keyframes).
 *
 * `position: absolute; inset: 0` -- en vez de un div de flujo normal --
 * porque ScNoteCard es EL MISMO `position: absolute` de siempre, con sus
 * insets (inset-block-end/inset-inline-start) medidos contra el
 * contenedor POSICIONADO mas cercano. Declarar aqui `transform` (cualquier
 * valor salvo none) convierte a ESTE envoltorio en ese contenedor -- asi lo
 * exige la especificacion de CSS para transform -- desplazando a
 * ScNoteCard de su ancestro posicionado real (ScFigureWrap) a este nuevo
 * envoltorio. Con `inset: 0` la caja de este envoltorio coincide EXACTAMENTE
 * con la caja de ScFigureWrap (mismo origen, mismo tamano, sin padding ni
 * borde de por medio), asi que los insets de ScNoteCard resuelven a los
 * MISMOS valores que resolvian antes: cero cambio de geometria, solo un
 * nivel mas de indireccion para poder desplazar la caja entera con scroll.
 * `pointer-events: none`: este envoltorio cubre TODA la zona de la figura
 * (inset: 0), y sin esto interceptaria el hover/click de lo que hay debajo
 * en su hueco vacio (la propia figura) -- ScNoteCard no tiene contenido
 * interactivo, asi que no hace falta reactivarlo en el hijo.
 */
const ScNoteShift = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateY(
    calc(${STORY_NOTE_SCROLL_SHIFT} * var(--story-progress, 0))
  );

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const ScNoteCard = styled.div`
  position: absolute;
  inset-block-end: 90%;
  inset-inline-start: -25%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  max-width: 220px;
  background-color: ${STORY_CARD_BG};
  border: 1px solid ${STORY_CARD_BORDER};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[4]};
  box-shadow: 0 12px 30px ${STORY_CARD_SHADOW};

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    inset-inline-end: -6%;
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} ${STORY_CARD_FLOAT_MS}ms ease-in-out infinite;
  }
`;

const ScSparkle = styled.svg`
  flex: none;
  /* GlobalStyles fuerza svg { width: 100% }: sin esta declaracion el
     atributo width="20" pierde la cascada y el sparkle se estira al ancho
     de la tarjeta (medido 186px en navegador, revision 2026-07-28 -- misma
     leccion que el Logo en task/lessons.md). */
  width: 20px;
  height: 20px;
  color: ${({ theme }) => theme.data.palette.primary[600]};
`;

const ScContent = styled.div`
  display: flex;
  flex-direction: column;
`;

/* Kicker: mockup usa `var(--primary-600)` (L77). Se resuelve contra
   `semantic.brandText`, no contra un paso de palette -- mismo mapeo que ya
   aplica `ScKicker` en Hero.tsx para el mismo rol visual ("etiqueta de
   marca"). */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

const ScTitle = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
`;

/* Degradado seleccionado por tema (spec 2026-07-29 D10): mismas paradas de
   hue, luminosidad mucho mayor en oscuro para que el background-clip:text
   siga siendo legible sobre el negro-violeta de StoryCosmicBeing. */
const ScAccent = styled.span`
  background-image: ${({ theme }) =>
    theme.data.isLight
      ? STORY_ACCENT_GRADIENT_LIGHT
      : STORY_ACCENT_GRADIENT_DARK};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;

  /* Red de seguridad: sin soporte de background-clip: text el degradado no
     puede quedar como único portador del color -- se degrada al rol de
     marca del tema (mismo recurso que gradientTextClip en BrandName.tsx). */
  @supports not (background-clip: text) {
    background-image: none;
    color: ${({ theme }) => theme.data.semantic.brandText};
    -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
  }
`;

const ScBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

const ScPillars = styled.div`
  display: flex;
  flex-direction: column;
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

const ScPillarRow = styled.div`
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: ${({ theme }) => theme.data.space[4]};
  align-items: baseline;
  padding-block: ${({ theme }) => theme.data.space[4]};
  border-block-start: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

const ScPillarNumber = styled.span<{ $index: number }>`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 700;
  color: ${({ $index }) => pillarColor($index)};
`;

const ScPillarCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};
`;

/*
 * El MISMO pilar, pero como diapositiva suelta. `ScPillarRow` lleva un
 * `border-block-start` porque en la rama clara los cuatro pilares son una
 * LISTA y esa línea es su separador: es lo que convierte cuatro bloques
 * sueltos en una tabla legible. Aislado en su propia diapositiva a pantalla
 * completa no separa nada de nada — queda una raya suelta flotando encima
 * del contenido, que se lee como un resto de maquetación, no como una
 * decisión. Se anula aquí, en el contexto donde deja de tener sentido, en
 * vez de quitarla de `ScPillarRow`, que seguiría necesitándola en claro.
 */
const ScDeckPillarRow = styled(ScPillarRow)`
  border-block-start: none;
  padding-block: 0;
`;

export function Story(): ReactElement {
  const { themeName } = useTheme();

  // La rama clara vive en un componente HIJO aparte (StoryLight, justo
  // debajo) por el MISMO motivo que obliga a extraer StoryDeckDark unas
  // lineas mas abajo: useSectionProgress (D1, spec
  // 2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md)
  // llama a window.matchMedia sin condicion en su efecto de montaje (la
  // guarda reactiva de prefers-reduced-motion), exactamente igual que
  // useSlideDeck. Story() es UNA SOLA funcion para las dos ramas y las
  // reglas de los hooks de React prohiben llamar un hook solo "cuando el
  // tema es claro" dentro de ella -- el tema puede cambiar en caliente sin
  // desmontar Story, via el mismo ThemeProvider que ya fuerza la extraccion
  // de la rama oscura. Llamar useSectionProgress aqui rompería tambien los
  // tests claros existentes, ninguno de los cuales stubea matchMedia (nunca
  // lo necesitaron hasta esta entrega). Delegar cada rama a un componente
  // que solo se MONTA cuando le toca resuelve esto en las dos direcciones a
  // la vez: React nunca ejecuta los hooks de un componente que no se
  // renderiza.
  if (themeName === "light") {
    return <StoryLight />;
  }

  return <StoryDeckDark />;
}

/*
 * Rama clara de Story, extraida a su propio componente (ver el comentario de
 * mas arriba, en Story()): aqui SI es seguro llamar useSectionProgress sin
 * condicion, porque este componente en si mismo solo se monta cuando la
 * rama clara esta activa.
 */
function StoryLight(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  // Ref ESTABLE (useRef, no callback-ref): useSectionProgress escribe
  // --story-enter/--story-progress directamente sobre el propio elemento en
  // cada frame de rAF -- mismo motivo por el que useSlideDeck/useSceneParallax
  // exigen refs de identidad estable (ver trackRef/stageRef en
  // StoryDeckDark, mas abajo).
  const sectionRef = useRef<HTMLElement>(null);
  // cssVarPrefix "story" (D1): la rama OSCURA ya escribe --story-progress
  // con este mismo nombre, a traves de useSlideDeck (StoryDeckDark, mas
  // abajo) -- coincidencia deliberada, no un descuido: las dos ramas son
  // mutuamente excluyentes (nunca se montan a la vez) y la variable
  // significa lo mismo en las dos, "cuanto ha avanzado el scroll de esta
  // seccion por el viewport".
  useSectionProgress(sectionRef, { cssVarPrefix: "story" });

  const pillars = (
    <ScPillars>
      {PILLARS.map((pillar, index) => (
        <ScPillarRow key={pillar.key}>
          <ScPillarNumber $index={index}>{pillar.number} —</ScPillarNumber>
          <ScPillarCopy>
            <Typography
              variant="h5"
              as="p"
            >
              {t(`Home.story.pillars.${pillar.key}.title`)}
            </Typography>
            <Typography variant="bodySm">
              {t(`Home.story.pillars.${pillar.key}.body`)}
            </Typography>
          </ScPillarCopy>
        </ScPillarRow>
      ))}
    </ScPillars>
  );

  const heading = (
    <>
      <ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>
      <ScTitle
        variant="h2"
        id="story-title"
      >
        {t("Home.story.titleLead")}
        <br />
        <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
      </ScTitle>
      <ScBody variant="body">{t("Home.story.body")}</ScBody>
    </>
  );

  return (
    <ScStory
      ref={sectionRef}
      id="story"
      aria-labelledby="story-title"
      $fullBleed={false}
    >
      <ScGrid
        ref={revealRef}
        data-revealed={revealed}
      >
        <ScFigureWrap>
          <ScHalo aria-hidden="true" />
          {/* ScFigureShift/ScNoteShift: envoltorios del desplazamiento de
              scroll (D1) -- ver sus docblocks, mas arriba, para el porque de
              cada uno (conflicto @keyframes/transform y preservacion de la
              geometria de ScNoteCard, respectivamente). */}
          <ScFigureShift>
            <ScFigureImg
              src="/figures/journey-presenting-1024.webp"
              srcSet="/figures/journey-presenting-640.webp 640w, /figures/journey-presenting-1024.webp 1024w"
              sizes={STORY_FIGURE_SIZES}
              alt={t("Home.story.figureAlt")}
              loading="lazy"
              decoding="async"
            />
          </ScFigureShift>
          <ScNoteShift>
            <ScNoteCard>
              <ScSparkle
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
              </ScSparkle>
              <Typography variant="bodySm">{t("Home.story.note")}</Typography>
            </ScNoteCard>
          </ScNoteShift>
        </ScFigureWrap>

        <ScContent>
          {heading}
          {pillars}
        </ScContent>
      </ScGrid>
    </ScStory>
  );
}

/*
 * Rama oscura de Story, extraida a su propio componente (ver el comentario
 * de mas arriba, en Story()): aqui SI es seguro llamar useSlideDeck sin
 * condicion, porque este componente en si mismo solo se monta cuando la
 * rama oscura esta activa.
 *
 * YA NO recibe `heading` por prop (spec 2026-07-31-story-deck-tipografia-design.md,
 * Task 2): antes se construia UNA vez en Story() y lo consumian las dos
 * ramas -- la clara directamente, la oscura por prop, el MISMO nodo en las
 * dos. Con la escala tipografica de cartel de esta entrega (h2 hasta 4rem)
 * eso deja de ser seguro: cualquier cambio de tamano sobre ese nodo
 * compartido se habria filtrado tambien al tema claro. Por eso este
 * componente compone su PROPIO kicker/h2/body con los styled de
 * story.deck.tsx (`ScDeckTitle`/`ScDeckIntroBody`), mientras Story()
 * conserva `heading` (con `ScKicker`/`ScTitle`/`ScAccent`/`ScBody`) intacto,
 * exclusivo de la rama clara. `ScKicker`/`ScAccent` SI se reutilizan tal
 * cual (no cambian de tamano en este encargo, no hay riesgo de fuga). El
 * resto (pilares, nota, rail, anclas de snap) ya se construia aqui con su
 * PROPIO `t`, mismo namespace/instancia de i18n que Story().
 */
function StoryDeckDark(): ReactElement {
  const { t } = useTranslation("home");

  // Refs ESTABLES (useRef, no callback-ref): useSlideDeck lee
  // getBoundingClientRect() de la pista en cada frame de rAF y escribe las
  // variables CSS de la coreografia directamente sobre el stage -- mismo
  // motivo por el que useSceneParallax exige refs de identidad estable en
  // vez de callbacks (StoryCosmicBeing.tsx).
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // cssVarPrefix: "story" EXPLICITO (D4, spec
  // 2026-08-02-journey-deck-8-diapositivas-design.md): el hook ya generaliza
  // a cualquier presentacion de N diapositivas y su defecto es "deck", asi
  // que sin este parametro escribiria `--deck-enter`/`--deck-progress` sobre
  // el stage -- variables que `story.deck.tsx` no consume. Pasando "story"
  // explicitamente el hook sigue escribiendo `--story-enter`/
  // `--story-progress`, EXACTAMENTE lo que ese fichero ya lee: el
  // renombrado del hook no mueve ni una linea de CSS en esta seccion.
  const { index, direction } = useSlideDeck(trackRef, stageRef, STORY_SLIDES, {
    tailScreens: STORY_DECK_TAIL_SCREENS,
    cssVarPrefix: "story",
  });

  // Estado de cada diapositiva (spec seccion 5b): se decide AQUI, comparando
  // su indice con el `index` que escribe el hook -- el CSS de ScSlide
  // (story.deck.tsx) solo reacciona al atributo `data-state` resultante,
  // nunca calcula nada por si mismo (jsdom, ademas, no puede evaluar ningun
  // calculo que dependiera de scroll real).
  const slideState = (slideIndex: number): "past" | "current" | "next" => {
    if (slideIndex < index) return "past";
    if (slideIndex === index) return "current";
    return "next";
  };

  return (
    <ScStory
      id="story"
      aria-labelledby="story-title"
      $fullBleed
    >
      {/* ScTrack da a la pagina el recorrido de scroll de las 6
          diapositivas (6 * STORY_DARK_HEIGHT); ScStage, su unico hijo en
          flujo, es quien se pega y permanece en pantalla mientras ese
          recorrido pasa por debajo (spec seccion 4). */}
      <ScTrack ref={trackRef}>
        <ScStage
          ref={stageRef}
          data-slide={index}
          data-dir={direction}
        >
          <ScSceneWrap>
            <StoryCosmicBeing />
          </ScSceneWrap>
          <ScDeck>
            <ScSlide
              data-slide-index={0}
              data-state={slideState(0)}
            >
              <ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>
              <ScDeckTitle id="story-title">
                {t("Home.story.titleLead")}
                <br />
                <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
              </ScDeckTitle>
              <ScDeckIntroBody>{t("Home.story.body")}</ScDeckIntroBody>
            </ScSlide>
            {PILLARS.map((pillar, pillarIndex) => (
              <ScSlide
                key={pillar.key}
                data-slide-index={pillarIndex + 1}
                data-state={slideState(pillarIndex + 1)}
              >
                <ScDeckPillarRow>
                  <ScPillarNumber $index={pillarIndex}>
                    {pillar.number} —
                  </ScPillarNumber>
                  <ScPillarCopy>
                    <ScDeckPillarTitle>
                      {t(`Home.story.pillars.${pillar.key}.title`)}
                    </ScDeckPillarTitle>
                    {/* Rol de SUBTITULO (T2 de la spec): el texto que hoy
                        vive en `pillars.<key>.body`, sin renombrar la
                        clave -- solo cambia el rol en el que se pinta. */}
                    <ScDeckPillarSubtitle>
                      {t(`Home.story.pillars.${pillar.key}.body`)}
                    </ScDeckPillarSubtitle>
                    <ScDeckPillarBody>
                      {t(`Home.story.pillars.${pillar.key}.inspiration`)}
                    </ScDeckPillarBody>
                  </ScPillarCopy>
                </ScDeckPillarRow>
              </ScSlide>
            ))}
            <ScSlide
              data-slide-index={STORY_SLIDES - 1}
              data-state={slideState(STORY_SLIDES - 1)}
            >
              {/* Nota partida en noteLead + noteAccent (T3 de la spec): la
                  clave `note` se conserva intacta para la rama clara, que
                  sigue consumiendola tal cual mas arriba en este archivo. */}
              <ScDeckNote>
                {t("Home.story.noteLead")}{" "}
                <ScDeckNoteAccent>
                  {t("Home.story.noteAccent")}
                </ScDeckNoteAccent>
              </ScDeckNote>
            </ScSlide>
          </ScDeck>
          {/* Rail decorativo (D13): 6 marcas, aria-hidden, que reflejan
              data-slide del stage por CSS puro (ScRailMark, story.deck.tsx) --
              no llevan estado propio de React, solo su indice fijo. */}
          <ScRail aria-hidden="true">
            {Array.from({ length: STORY_SLIDES }, (_, railIndex) => (
              <ScRailMark
                key={railIndex}
                $index={railIndex}
              />
            ))}
          </ScRail>
        </ScStage>
      </ScTrack>
    </ScStory>
  );
}
