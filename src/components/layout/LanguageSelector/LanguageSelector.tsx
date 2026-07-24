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
  padding: ${({ theme }) => theme.data.space[1]}
    ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.md};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  color: ${({ theme, $active }) =>
    $active ? theme.data.semantic.brand : theme.data.semantic.textSubtle};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brand};
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
