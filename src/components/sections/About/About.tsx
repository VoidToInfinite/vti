"use client";

import type { ReactElement } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useReveal } from "@/hooks/useReveal";
import { motion } from "@/theme/tokens/motion";

/**
 * Sección «¿Qué es VoidToInfinite?» — el bloque de hechos citable (F3.3, F3.4
 * y F3.5 del plan premium, 2026-08-13).
 *
 * HUBO OTRA `About` AQUÍ, Y SE ELIMINÓ. La spec
 * `2026-07-28-landing-v2-secciones-design.md` (D1) retiró una sección `About`
 * que ocupaba EXACTAMENTE esta posición, entre `Features` y `Contact`. Su
 * motivo: "el mockup no tiene sección About; su función de declaración de
 * marca la cubre el tagline del footer". Ese motivo sigue siendo válido para
 * lo que aquella sección hacía — y por eso esta NO lo hace.
 *
 * La diferencia no es cosmética: aquella era una DECLARACIÓN DE MARCA, que en
 * efecto ya vive en el pie. Esta es un BLOQUE DE HECHOS VERIFICABLES, que no
 * existe en ninguna otra parte del sitio y que el mockup no podía prever
 * porque su encargo es posterior (F3.3 del plan premium, con los datos de la
 * Fase 0 que el dueño no había aportado cuando se dibujó el mockup). D1 no se
 * ignora: se enmienda a propósito, con el motivo escrito y con el mockup
 * dejando de ser la fuente de verdad SOLO para este bloque.
 *
 * POR QUÉ ES UNA SECCIÓN PROPIA Y NO UN BLOQUE DENTRO DE STORY. Story ramifica
 * en dos vehículos —tarjeta acotada en claro, deck de diapositivas en
 * oscuro— y meter contenido nuevo ahí obliga a operar las dos ramas a la vez,
 * que es exactamente el coste que `CLAUDE.md` §5.1 avisa. Una sección nueva es
 * código aislado: no toca ninguna de las cuatro existentes.
 *
 * POR QUÉ ES PLANA A PROPÓSITO. Es la única sección del sitio SIN escena, sin
 * deck y sin ramificación por tema — y eso no es una carencia, es el vehículo
 * correcto para lo que hace:
 *
 *   1. Es un bloque de HECHOS VERIFICABLES, no de narrativa. El contrato de
 *      F3.3 es que sea citable por un buscador o un asistente; una diapositiva
 *      que aparece con scroll no lo es, un `<h2>` seguido de tres `<p>` sí.
 *   2. Tras Story, Journey y Features —tres secciones cargadas y la tercera
 *      rejilla consecutiva que las auditorías del 2026-08-08 señalaron—, un
 *      bloque tranquilo es un cambio de ritmo, no un hueco.
 *   3. Desde la unificación de contenido (Tasks 15-16, D-C) el tema es piel.
 *      Esta sección lleva esa decisión al extremo honesto: mismo contenido y
 *      misma piel, porque un hecho no cambia según el tema.
 *
 * VERACIDAD, que aquí no es un adorno. Cada afirmación del copy sale de una
 * respuesta del dueño registrada en `PRODUCT.md` §10 (puntos 12, 14, 15, 16,
 * 17 y 21) y ninguna se puede escribir «porque queda bien»:
 *
 *   - NO se afirma que exista una plataforma: el punto 12 dice que no existe.
 *   - NO se enlaza `dev.voidtoinfinite.com` como prueba: se verificó el
 *     2026-08-13 y es un placeholder sin contenido. Se menciona el SDK como
 *     recorrido EN CONSTRUCCIÓN, que es lo que es.
 *   - NO hay cifras de comunidad, descargas ni usuarios: el punto 21 dice que
 *     no existen y la regla es que no se inventan. La ausencia de prueba
 *     social fabricada es de lo poco que las tres auditorías elogian sin
 *     reservas.
 *   - La afirmación de privacidad es la única del sitio comprobable con el
 *     código delante, y está atada por `no-external-hosts.test.ts`.
 */

const ScAbout = styled.section`
  position: relative;
  z-index: 2;
  display: grid;
  /* Pista UNICA declarada, y declarada como minmax(0, 1fr) (WCAG 2.1 SC 1.4.4,
     critica externa #13). Sin grid-template-columns esta seccion creaba una
     pista IMPLICITA de tamano auto, cuyo minimo es el min-content de su
     contenido: con la raiz al 200% el h2 aportaba 412px de min-content dentro
     de una caja de 294px y la pista crecia con el -- texto fuera del viewport
     sin scroll horizontal que lo recupere (html declara overflow-x: clip,
     regla 21). Una pista auto se estira igualmente hasta llenar el hueco libre
     cuando cabe, asi que a raiz 16px el ancho no cambia (342px antes y
     despues); lo unico que cambia es su minimo. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  /* overflow-wrap se hereda: una declaracion aqui cubre el h2 y los tres
     parrafos. Sin ella, acotar la pista solo mueve el recorte -- el termino de
     marca del titulo sigue siendo mas ancho que su caja al 200%.

     El valor pasa de break-word a anywhere en la critica #19, por el mismo
     motivo y con la misma medicion que documenta ScStory. */
  overflow-wrap: anywhere;
  background-color: ${({ theme }) => theme.data.semantic.surface};
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
`;

const ScInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[5]};
  width: 100%;
  max-width: ${({ theme }) => theme.data.grid.prose};

  /* Entrada por opacidad y desplazamiento, las dos únicas propiedades que el
     sistema anima. El estado base es el VISIBLE: si el JavaScript no llega a
     ejecutarse, el texto se lee igual -- el mismo criterio que el fallback de
     scripting none en GlobalStyles. Un bloque de hechos que depende de un
     observador para existir no es citable.

     Sin comillas de ningún tipo en este comentario: un backtick cierra el
     template y rompe el build (lección repetida tres veces en este repo). */
  opacity: 1;
  transform: none;

  @media (prefers-reduced-motion: no-preference) {
    &[data-revealed="false"] {
      opacity: 0;
      transform: translateY(16px);
    }

    &[data-revealed="true"] {
      opacity: 1;
      transform: none;
      transition:
        opacity ${motion.duration.slow} ${motion.easing.decelerate},
        transform ${motion.duration.slow} ${motion.easing.decelerate};
    }
  }
`;

/* SIN KICKER, y no por olvido: la primera versión de esta sección llevaba uno
   («En corto») y lo cazó el detector de anti-patrones — un kicker fuera de
   Story y Features es un tercero, y la dieta de kickers es decisión sancionada
   del dueño (D-E). Se retiró en vez de pedir excepción: el propio h2 es una
   pregunta que ya dice qué es el bloque, así que el kicker no añadía
   información, solo una línea más antes del contenido. */

/* `h2` explícito: el reset global de `GlobalStyles` lleva `h1..h6` a
   `font-size: 1em`, así que un encabezado sin tamaño propio se pinta a
   tamaño de cuerpo -- el mismo defecto que la Task 3 arregló en la 404. */
const ScTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${({ theme }) => theme.data.type.scale.h2.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${({ theme }) => theme.data.type.scale.h2.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.h2.tracking};
`;

const ScParagraph = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.data.semantic.textMuted};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
`;

export function About(): ReactElement {
  const { t } = useTranslation("home");
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <ScAbout
      id="about"
      aria-labelledby="about-title"
    >
      <ScInner
        ref={ref}
        data-revealed={revealed}
      >
        <ScTitle id="about-title">{t("Home.about.title")}</ScTitle>
        <ScParagraph>{t("Home.about.what")}</ScParagraph>
        <ScParagraph>{t("Home.about.sdk")}</ScParagraph>
        <ScParagraph>{t("Home.about.proof")}</ScParagraph>
      </ScInner>
    </ScAbout>
  );
}
