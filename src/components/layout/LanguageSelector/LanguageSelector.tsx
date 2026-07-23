"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";

const LANGUAGES = ["es", "en"] as const;

const ScLanguageSelector = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const ScLanguageButton = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  color: ${({ theme, $active }) =>
    $active
      ? theme.data.color.primary[500]
      : theme.data.typography.secondaryColor[500]};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.color.primary[500]};
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
          }}
        >
          {t(`language.${lng}`)}
        </ScLanguageButton>
      ))}
    </ScLanguageSelector>
  );
}
