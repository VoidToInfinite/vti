"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { type DefaultTheme } from "styled-components";
import { STORAGE_KEYS } from "@/config/storage";
import { PRESS } from "@/motion/vocabulary";

const LANGUAGES = ["es", "en"] as const;

/*
 * Color del idioma ACTIVO (Task 33, gate F4, hallazgo del evaluador
 * independiente 2026-08-12): antes `theme.data.semantic.brand`
 * (`palette.primary[500]`) en las DOS ramas de tema. Medido con
 * `contrastRatio` contra el fondo REAL de la barra en sus dos estados
 * (transparente sobre el hero -- `AURA_SURFACE`/`EYE_SURFACE` -- y con
 * cristal -- `glass.bg` compuesto sobre `semantic.bg`/`semantic.surface`/
 * el void del hero, `contrastRatioOverAlpha`), describe "Task 33" en
 * `LanguageSelector.contrast.test.ts`:
 *
 *   TEMA CLARO (semantic.brand = primary[500]):
 *     transparente (sobre AURA_SURFACE)         1.915:1  <- incumple AA
 *     cristal (peor de los 3 fondos probados)    2.162:1  <- incumple AA
 *   TEMA OSCURO (semantic.brand = primary[400]):
 *     transparente (sobre EYE_SURFACE)          10.641:1  ya pasaba
 *     cristal (peor de los 3 fondos probados)    8.271:1  ya pasaba
 *
 * El evaluador midió el pixel real en tema claro sin scroll: #01B7FF sobre
 * #EBE8F9, 1,89:1 -- coincide con el 1.915:1 de `contrastRatio` contra
 * `AURA_SURFACE` (primary[500] resuelve a #02B7FF, un redondeo de un dígito
 * hex). Tema oscuro nunca incumplió: `semantic.onBrand` no aplica aquí --
 * este es texto sobre el propio fondo de la barra, no sobre un botón sólido.
 *
 * Resolución POR RAMA (`theme.data.isLight`), precedente Task 26
 * (`accentColor`, `Features.tsx`): en claro sube a `semantic.brandText`
 * (`primary[800]`, el MISMO rol que ya usan el kicker de marca y el CTA de
 * Features sobre `surface` en este sitio -- no un paso de `palette` suelto)
 * -- 4.909:1 transparente / 5.540-5.837:1 con cristal, los cuatro casos con
 * margen sobre AA. En oscuro NO cambia (`semantic.brand`, `primary[400]`):
 * ya pasaba.
 *
 * Se exporta como función nombrada (no ternario inline) para que
 * `LanguageSelector.contrast.test.ts` importe y mida la MISMA función que
 * pinta el botón real, y para que TAMBIÉN gobierne `:hover`/`:focus-visible`
 * (ver `ScLanguageButton`, más abajo): antes de esta tarea el hover usaba
 * `semantic.brand` sin condición de `$active`, así que pasar el cursor por
 * CUALQUIER botón -- activo o no -- en tema claro mostraba el mismo
 * primary[500] que incumplía AA.
 */
export function languageAccent(theme: DefaultTheme): string {
  return theme.data.isLight
    ? theme.data.semantic.brandText
    : theme.data.semantic.brand;
}

const ScLanguageSelector = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[1]};
`;

/*
 * WCAG 1.4.1 (Task 33, punto 2 del hallazgo): el color NUNCA fue el único
 * medio de indicar el idioma activo -- `font-weight` ya distinguía 700/400 --
 * pero a 14px la diferencia de peso es sutil para quien no distingue el
 * color. Se refuerza con `text-decoration: underline` (mismo criterio que el
 * brief sugiere: "peso tipográfico, subrayado, marca"), aditivo al peso que
 * ya existía -- ninguna señal sustituye a la otra, se suman.
 * `text-underline-offset` se explicita porque el subrayado por defecto del
 * navegador pega la línea al descendente de la tipografía a este tamaño; el
 * valor es un múltiplo del font-size, no un literal de píxeles sueltos.
 */
const ScLanguageButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Área táctil mínima AA (44px), literal como en Button md/Input: no hay
     casilla de la escala de space para este tamaño mínimo, mismo precedente
     ya usado en el sistema. min- en vez de fijo: el botón renderiza el
     nombre completo del idioma ("Español"/"English", no un código de dos
     letras), así que 44px es solo el suelo del área táctil, no el ancho que
     va a ocupar en la práctica. */
  min-height: 44px;
  min-width: 44px;
  padding: ${({ theme }) => theme.data.space[1]}
    ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.md};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  color: ${({ theme, $active }) =>
    $active ? languageAccent(theme) : theme.data.semantic.textSubtle};
  text-decoration: ${({ $active }) => ($active ? "underline" : "none")};
  text-underline-offset: 0.2em;
  cursor: pointer;
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  /* Mismo patrón (propiedad, duración y curva) que sus dos hermanos con el
     mismo rol -- ScNavLink (Navbar.tsx) y ScFooterLink (Footer.tsx): los
     tres son enlaces/controles de texto que cambian de color en hover/foco,
     y hasta ahora este era el único de los tres sin transition, así que el
     cambio de color aquí saltaba en seco mientras en los otros dos se
     animaba (hallazgo 3, D7).

     transform se AÑADE a esta lista (Task 9, primera adopción real de
     vocabulary.PRESS): el único cambio de transform de este control es
     el :active de abajo, así que la entrada nace ya con los valores de
     PRESS -- no hay ningún hover-lift previo con el que colisionar. */
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => languageAccent(theme)};
  }

  /* Press (Task 9): único feedback táctil de este control -- el hover de
     arriba es solo color, así que no hay nada que guardar tras
     PRESS.hoverGuard (punto 2 del brief: "los de color pueden quedarse").
     :active SÍ se declara sin guard: es la única primitiva de las dos que
     funciona igual de bien con dedo que con ratón. */
  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

/*
 * Tarea 1 (navegación accesible), punto 2 del brief: `role="group"` +
 * `aria-label` en el envoltorio, no un patrón `radiogroup` completo.
 *
 * Los dos botones ya usan `aria-pressed` -- semántica de "activar/desactivar"
 * (WAI-ARIA "button", no "radio")-- y ESO es lo que había sin nombre de
 * grupo: dos botones pulsables sueltos que un lector de pantalla anuncia sin
 * decir a qué pertenecen. Migrar a `role="radiogroup"` + `role="radio"` +
 * `aria-checked` habría sido un cambio de widget completo (exige, además,
 * navegación por flechas y sacar los radios no seleccionados del orden de
 * Tab -- "roving tabindex" -- que hoy NO tienen: los dos botones son
 * alcanzables por Tab de forma independiente, y así se quedan). La
 * corrección mínima que resuelve el hallazgo sin reescribir el widget es
 * nombrar el GRUPO que ya envuelve a los dos botones: `role="group"` +
 * `aria-label` (reutiliza `Common.Lang.title`, la misma clave que ya nombra
 * este control en la hoja de navegación móvil, `NavSheet.tsx` -- ningún
 * string nuevo). Con esto, un lector de pantalla anuncia "Idioma, grupo" al
 * entrar y cada botón sigue anunciando su propio estado pulsado/no pulsado.
 */
export function LanguageSelector(): ReactElement {
  const { t, i18n } = useTranslation("common");

  return (
    <ScLanguageSelector
      role="group"
      aria-label={t("Common.Lang.title")}
    >
      {LANGUAGES.map((lng) => (
        <ScLanguageButton
          key={lng}
          type="button"
          $active={i18n.language === lng}
          aria-pressed={i18n.language === lng}
          title={t(`Common.Lang.${lng}.title`)}
          onClick={() => {
            void i18n.changeLanguage(lng);
            window.localStorage.setItem(STORAGE_KEYS.lang, lng);
          }}
        >
          {t(`language.${lng}`)}
        </ScLanguageButton>
      ))}
    </ScLanguageSelector>
  );
}
