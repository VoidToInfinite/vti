"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";

const LANGUAGES = ["es", "en"] as const;

const STORAGE_KEY = "vti-lang";

const ScLanguageSelector = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[1]};
`;

const ScLanguageButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Área táctil mínima AA (44px), literal como en Button md/Input: no hay
     casilla de la escala de space para este tamaño mínimo, mismo precedente
     ya usado en el sistema. min- en vez de fijo: preserva el ancho natural
     del texto ("ES"/"EN") si llegara a necesitar más de 44px. */
  min-height: 44px;
  min-width: 44px;
  padding: ${({ theme }) => theme.data.space[1]}
    ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.md};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  color: ${({ theme, $active }) =>
    $active ? theme.data.semantic.brand : theme.data.semantic.textSubtle};
  cursor: pointer;
  /* Mismo patrón (propiedad, duración y curva) que sus dos hermanos con el
     mismo rol -- ScNavLink (Navbar.tsx) y ScFooterLink (Footer.tsx): los
     tres son enlaces/controles de texto que cambian de color en hover/foco,
     y hasta ahora este era el único de los tres sin transition, así que el
     cambio de color aquí saltaba en seco mientras en los otros dos se
     animaba (hallazgo 3, D7). */
  transition: color ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brand};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function LanguageSelector() {
  const { t, i18n } = useTranslation("common");

  return (
    <ScLanguageSelector>
      {LANGUAGES.map((lng) => (
        <ScLanguageButton
          key={lng}
          type="button"
          $active={i18n.language === lng}
          aria-pressed={i18n.language === lng}
          title={t(`Common.Lang.${lng}.title`)}
          onClick={() => {
            void i18n.changeLanguage(lng);
            window.localStorage.setItem(STORAGE_KEY, lng);
          }}
        >
          {t(`language.${lng}`)}
        </ScLanguageButton>
      ))}
    </ScLanguageSelector>
  );
}
