"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";

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
 * `ScMain` de `legalPage.parts.tsx` (52ch desde 2026-08-17, ~65 caracteres
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
const ScMain = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
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

export function NotFoundContent(): ReactElement {
  const { t } = useTranslation("common");
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
       * `as={Link}`, no `as="a"`: navegación de cliente real dentro del
       * export estático (`output: "export"`, ver CLAUDE.md), igual que el
       * enlace que sustituye -- `Button` ya soporta esta forma (su propio
       * docblock: "Override del elemento. as='a' + href para CTAs que
       * navegan"), y como se llama SIN envolver con `styled()` encima, no
       * aplica el gotcha `as`/`forwardedAs` que sí afecta a `ScCtaPrimary`
       * en Hero.tsx (esa capa SÍ envuelve `Button` con `styled()`).
       */}
      <Button
        as={Link}
        href="/"
      >
        {t("notFound.backToHome")}
      </Button>
    </ScMain>
  );
}
