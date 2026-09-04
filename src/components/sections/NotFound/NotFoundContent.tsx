"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { navLocale } from "@/config/navigation";
import { routePath } from "@/config/site";
import styled from "styled-components";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import {
  ctaGradient,
  gradientShift,
} from "@/components/layout/Brand/BrandName";
import { AMBIENT } from "@/motion/vocabulary";

/*
 * Cuerpo de cliente de la 404 (auditoria SEO 2026-08-08, mismo patron que
 * las paginas legales -- ver `PrivacyDocument.tsx`): `app/not-found.tsx`
 * exporta `metadata`, y una ruta que exporta `metadata` NO puede ser
 * Client Component (el plugin de TypeScript de Next lo marca como error
 * explicito, ver el docblock de `app/privacidad/page.tsx`). El texto
 * traducido SI necesita cliente (`useTranslation`), asi que vive aqui, en un
 * componente aparte que la cascara de servidor solo monta.
 */

/*
 * CONTENEDOR (Task 35, hallazgo de un evaluador independiente en el gate F4,
 * 2026-08-12): hasta esta tarea el `<main>` no llevaba NINGUN estilo propio
 * -- Task 3 ya le habia dado tamaño de titulo al `h1`, pero el bloque entero
 * quedaba pegado a (0,0), con las astas superiores del titulo cortadas por
 * el borde del viewport, sin contenedor, sin padding, sin cabecera ni pie.
 * Es la superficie que ve alguien que ya se ha equivocado.
 *
 * `padding-top: calc(var(--nav-height) + space[8])`: `ScHeader` (Navbar.tsx,
 * ahora montado por `app/not-found.tsx`) es `position: fixed` -- no reserva
 * hueco en el flujo del documento --, asi que sin este padding el `h1`
 * nacia DEBAJO de la barra flotante, tapado por ella en vez de solo "cerca
 * del borde". `var(--nav-height)` es la MISMA variable global que ya usa
 * `scroll-margin-top` en `GlobalStyles.tsx` para compensar la misma barra,
 * no un numero inventado aqui.
 *
 * `max-width` + `margin-inline: auto`: el mismo ancho de lectura que ya usa
 * `ScMain` de `legalPage.parts.tsx` (56ch desde la critica #13, ~65 caracteres
 * reales; D21/§3 de la spec legal) -- esta pagina no es un articulo largo,
 * pero reutiliza la misma medida del sistema en vez de inventar una tercera,
 * y centra el bloque en vez de dejarlo pegado al borde izquierdo del
 * viewport.
 *
 * `width: 100%` + `calc(prose + 2 * padding-inline)` (critica #10, hallazgo
 * C, mismo arreglo que la ScMain legal): este es el OTRO `styled.main` del
 * repo con el patron `max-width: prose` + `margin-inline: auto` + padding
 * dentro de `border-box`. Sin el `calc`, el relleno se comia 48 px de la
 * medida (columna real 417,92 px); sin el `width` definido, un item flex de
 * la columna de `body` con margenes auto no se estira (Flexbox §8.3) y se
 * dimensiona por contenido -- aqui el mecanismo esta latente (texto
 * centrado, sin tabla que dispare el `min-content`), pero se cierra igual
 * para que nadie lo herede al anadir contenido ancho. El `calc` sigue al
 * padding en cada breakpoint (space[5] base, space[6] en `md`).
 */
/*
 * CENTRADO VERTICAL (crítica externa #15, hallazgo C 4; la #14 ya había
 * medido el mismo síntoma como «~330 px de vacío»).
 *
 * LO MEDIDO: a 1440x900 el `<main>` de esta página mide 621 px, de los que
 * 137 son tinta (título + mensaje + botón) y 368 quedan VACÍOS bajo el botón.
 * El bloque se lee pegado al techo con un desierto debajo, en la única página
 * cuyo trabajo entero es reorientar a alguien que ya se ha equivocado.
 *
 * LA CAUSA NO ES QUE FALTE ALTURA, es que sobra y nadie la reparte: `body`
 * ya es `display: flex; flex-direction: column; min-height: 100dvh` y
 * `body > main` ya declara `flex: 1` (los dos en `GlobalStyles.tsx`, Ola B
 * 2026-08-16, para que el pie llegue siempre al borde inferior). Ese `flex: 1`
 * es lo que estira este `<main>` hasta los 621 px -- el viewport menos el pie
 * --, así que el hueco ya está DENTRO de la caja: lo único que faltaba era
 * decirle a la columna dónde poner su contenido, y el valor inicial de
 * `justify-content` es `flex-start`.
 *
 * POR QUÉ NO SE AÑADE AQUÍ UN `min-height` PROPIO, que es lo primero que
 * apetece escribir: el alto disponible YA lo entrega el `flex: 1` de arriba,
 * en `dvh` y descontando el pie -- algo que ningún `min-height` local puede
 * hacer, porque en CSS este elemento no conoce el alto de su hermano. Un
 * `min-height: calc(100dvh - var(--nav-height))` daría 844 px a 1440x900 y,
 * sumado al pie, empujaría a 1123 px una página que hoy cabe entera: una 404
 * que aparece scrolleada. Se descarta por medición, no por gusto.
 *
 * `justify-content: center` no puede dejar contenido inalcanzable por arriba
 * -- el caso clásico del centrado en flex --: un item flex no baja de su
 * `min-height: auto` (el tamaño mínimo automático), así que cuando la tinta
 * crece por encima del hueco (tipografía al 200 %, viewport corto) `main`
 * mide exactamente su contenido y el centrado no desplaza nada.
 *
 * NINGUN HIJO PUEDE SER MAS ANCHO QUE ESTA CAJA (critica externa #19,
 * 2026-09-04, WCAG 1.4.4). Con `align-items: center` un item flex se dimensiona
 * a `fit-content`, que NO baja de su `min-content`: la palabra mas larga del
 * titulo manda. Medido en Chrome real sobre el build de produccion, raiz a 32px
 * con `Page.setFontSizes` y viewport de 320 px: el `h1` se pintaba a 80 px de
 * cuerpo, pedia 402,56 px en una caja de contenido de 224 y quedaba centrado
 * DESBORDANDO POR LOS DOS LADOS (left -41,28 / right 361,28). Los 41,28 px de
 * la derecha no se alcanzan --`GlobalStyles` declara
 * `html, body { overflow-x: clip }`--, y los de la izquierda no se alcanzan en
 * ningun caso. Con el ancho topado, el `hyphens: auto` que el titulo ya heredaba
 * pasa a tener donde actuar y parte la palabra con guion en vez de salirse.
 */
const ScMain = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[4]};
  width: 100%;
  max-width: calc(
    ${({ theme }) => theme.data.grid.prose} + 2 *
      ${({ theme }) => theme.data.space[5]}
  );
  margin-inline: auto;
  padding: calc(var(--nav-height) + ${({ theme }) => theme.data.space[8]})
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[9]};
  text-align: center;

  /* Ningun hijo mas ancho que esta caja (WCAG 1.4.4, critica #19): ver el
     docblock de este componente. */
  > * {
    max-width: 100%;
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    max-width: calc(
      ${({ theme }) => theme.data.grid.prose} + 2 *
        ${({ theme }) => theme.data.space[6]}
    );
    padding-inline: ${({ theme }) => theme.data.space[6]};
  }
`;

/* Jerarquía tipográfica (Task 35): título con peso completo, mensaje
   atenuado -- mismo rol que `semantic.textMuted` cumple en el resto del
   sitio para texto secundario (p. ej. `ScTagline` en Hero.tsx). `styled(Typography)`
   reenvía `className` a `ScTypography` (`Typography.tsx`: el componente
   desestructura `className` y lo pasa explícito), así que esta capa solo
   añade el color, sin reimplementar tamaño/peso/interlineado. */
const ScMessage = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/*
 * LA SALIDA SE PARECE A LAS OTRAS DOS SALIDAS DEL SITIO (crítica externa
 * #15, hallazgo C 4).
 *
 * LO MEDIDO: este CTA se pintaba con el relleno sólido por defecto de
 * `Button` (`oklch(0.737 0.158 235.851)`, `padding: 0 24px`) mientras que el
 * botón primario real del sitio -- el «Leer la historia» del hero
 * (`ScCtaPrimary`, `Hero.tsx`) y el de envío de Contacto (`ScSubmitButton`,
 * `Contact.tsx`) -- lleva `ctaGradient` y `padding: 0 32px`. Dos acciones
 * primarias con dos aspectos distintos: quien aterriza en un error ve un
 * botón que no ha visto en ninguna otra parte del sitio, justo cuando lo que
 * necesita es reconocer que sigue dentro de él.
 *
 * SE COMPONE, NO SE COPIA. El degradado no se vuelve a escribir: se importa
 * `ctaGradient` de `BrandName.tsx`, la MISMA fuente que consumen los otros
 * dos -- con su parada de 65 % resuelta por rama para pasar AA sobre
 * `semantic.onBrand`, medida y con candado en `BrandName.contrast.test.ts`.
 * El `padding` no se escribe tampoco: sale de `size="lg"` (`space[6]`), el
 * mismo tamaño que usa el CTA del hero.
 *
 * LA FORMA ES LA DE CONTACTO, no la del hero, y la diferencia es deliberada:
 * el hero mete el degradado DENTRO de `prefers-reduced-motion: no-preference`
 * (bajo `reduce` su CTA vuelve al relleno sólido), Contacto lo declara fuera
 * y apaga solo la animación. Aquí manda el mismo motivo que la corrección:
 * bajo `reduce` esta salida tiene que seguir siendo reconocible como la
 * acción primaria del sitio, así que pierde el movimiento y conserva el
 * degradado estático. Los dos casos pasan AA -- el sólido está auditado en
 * `contrast.test.ts` y el degradado en `BrandName.contrast.test.ts` --, así
 * que la elección es de identidad visual, no de contraste.
 *
 * NO se copia `ctaGlow` (el resplandor pulsante del hero): es una llamada de
 * atención para la primera pantalla de la portada, no para una página de
 * error, y además no está exportado -- traerlo aquí obligaría a tocar
 * `Hero.tsx`.
 *
 * El `:hover` reafirma `ctaGradient` con el MISMO selector que declara
 * `Button.tsx` en su variante `solid` (`&:hover:not(:disabled)`): esa regla
 * usa la propiedad ABREVIADA `background`, que resetea `background-image` a
 * `none`: sin esta reafirmación el degradado desaparecía al pasar el cursor.
 * Lección ya pagada dos veces en el repo (`task/lessons.md` 2026-07-26, y los
 * docblocks de `ScCtaPrimary`/`ScSubmitButton`); se aplica igual aquí porque
 * es el mismo primitivo y el mismo orden de inyección.
 */
const ScBackHome = styled(Button)`
  ${ctaGradient}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${gradientShift} ${AMBIENT.floatMs}ms linear infinite alternate;
  }

  /* SIN COMILLAS DE NINGÚN TIPO en este comentario: vive DENTRO del template
     literal de styled-components, donde un backtick lo cierra y rompe el
     build (regla 23 de RULES.md, task/lessons.md 2026-07-25 y 2026-08-16).
     El apagado explícito no confía en el colapso global: el reset de
     GlobalStyles fuerza animation-iteration-count: 1, que no detiene una
     animación infinita -- la deja parada en un fotograma arbitrario. Mismo
     guard, y por el mismo motivo, que ScSubmitButton en Contact.tsx. */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:hover:not(:disabled) {
    ${ctaGradient}
  }
`;

export function NotFoundContent(): ReactElement {
  const { t, i18n } = useTranslation("common");
  return (
    // id="main" + tabIndex={-1}: destino del SkipLink (Task 2), mismo
    // contrato que app/page.tsx/LegalDocument.tsx -- ver el docblock de
    // SkipLink.tsx para el porque del -1.
    <ScMain
      id="main"
      tabIndex={-1}
    >
      {/* Task 3 (tres cierres pequeños, 2026-08-10): el h1 de bloque pelado
          quedaba a tamaño de reset global (`GlobalStyles.tsx`, regla
          `h1..h6 { font-size: 1em }`), es decir, ilegible como titular --
          heredaba el font-size del <main>, sin ningún override propio. El
          arreglo NO toca el reset global (regla compartida por todo el
          sitio, fuera del alcance de esta tarea): `Typography` ya resuelve
          este mismo conflicto en las cuatro secciones de la home
          (`Contact.tsx`/`Features.tsx`, variant="h2"/"h3") porque su regla
          de clase (`.sc-xxxx`) tiene más especificidad que el selector de
          tipo `h1` del reset, así que gana la cascada sin `!important` y sin
          `as` explícito -- `variant="h1"` ya resuelve por defecto al
          elemento `<h1>` real (`defaultElement`, `Typography.tsx`), mismo
          heading semántico que antes. */}
      <Typography variant="h1">{t("notFound.title")}</Typography>
      <ScMessage variant="body">{t("notFound.message")}</ScMessage>
      {/*
       * Salida como ACCIÓN CLARA (Task 35, punto 1 del brief), no un enlace
       * gris a tamaño de cuerpo: se sustituye el `styled(Link)` local que
       * replicaba a mano transform/transition/touch-action de
       * `vocabulary.PRESS` (auditoría premium 2026-08-08 / Task 13) por el
       * primitivo compartido `Button` -- que YA implementa esos mismos
       * valores (`PRESS` se extrajo LITERALMENTE de `Button.tsx`, ver el
       * docblock de `PRESS` en `vocabulary.ts`: `activeScale: 0.98`,
       * `durationMs: 100`, la misma curva), además de fondo sólido, radio,
       * halo de foco y hover-lift, sin reinventar nada de eso aquí.
       * `forwardedAs={Link}`, no `as={Link}`: navegación de cliente real
       * dentro del export estático (`output: "export"`, ver CLAUDE.md), igual
       * que el enlace que sustituye -- `Button` ya soporta esta forma (su
       * propio docblock: "Override del elemento. as='a' + href para CTAs que
       * navegan").
       *
       * `as` pasó a `forwardedAs` al envolver `Button` con `styled()` (ver el
       * docblock de `ScBackHome`), y NO es un detalle de estilo: es el gotcha
       * que `Hero.tsx` ya documenta medido en este repo -- con `as` en una
       * capa `styled(Button)`, styled-components lo intercepta y renderiza el
       * elemento PELADO con la clase del envoltorio, descartando `Button`
       * entero (tamaños, variantes, `ScLabel`, spinner). `forwardedAs` se lo
       * entrega a `Button` por su propio prop, que es quien sabe qué hacer
       * con él.
       */}
      {/* La salida conserva el IDIOMA de la URL que fallo (critica externa
          #13): desde esta misma ola `/en/lo-que-sea` responde en ingles, y
          mandar a la home castellana al unico visitante que ya se ha perdido
          -- y que ademas habia elegido idioma -- deshace justo lo que esa
          correccion arreglo. Mismo camino que LegalHeader/LegalDocument:
          `routePath` + `navLocale`, sin literales "/en".

          NO lleva `prefetch={false}` como los otros seis <Link> del sitio, y
          no por olvido: `ButtonProps` extiende `ButtonHTMLAttributes`, que no
          conoce esa prop, asi que pasarla es error de tipos aunque el
          `...rest` la reenviaria bien en runtime. Cerrarlo exige tipado
          polimorfico real en `Button` (as={ElementType} con las props del
          elemento destino), refactor del primitivo que no cabe en esta ola.
          Coste de dejarlo: una peticion 404 de prefetch RSC por visita a una
          404 -- la pagina menos visitada del sitio. */}
      <ScBackHome
        forwardedAs={Link}
        size="lg"
        href={routePath("home", navLocale(i18n.language))}
      >
        {t("notFound.backToHome")}
      </ScBackHome>
    </ScMain>
  );
}
