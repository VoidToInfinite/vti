"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button/Button";
import { useConsent } from "@/consent/ConsentProvider";
import { CookiePreferences } from "./CookiePreferences";
import {
  ScBannerActions,
  ScBannerBody,
  ScBannerSurface,
  ScBannerText,
  ScBannerTitle,
  ScBannerWrapper,
  ScConfigureLink,
} from "./consent.parts";

/**
 * Punto único de montaje del sistema de consentimiento (integración,
 * `app/providers.tsx`): monta tanto la franja de la primera capa como el
 * diálogo modal de preferencias, así el hilo principal solo necesita
 * montar `<CookieBanner />` una vez para tener el flujo completo operable
 * desde cualquier página (D16 — el enlace "Preferencias de cookies" del
 * footer reabre el mismo diálogo llamando a `openPreferences()` del mismo
 * contexto, sin necesitar un segundo punto de montaje).
 *
 * `role="region"`, NUNCA `role="dialog"` (D15): el banner no es modal, no
 * atrapa el foco y no bloquea la navegación -- anunciarlo como diálogo le
 * mentiría a un lector de pantalla sobre su propio comportamiento. Solo
 * `CookiePreferences` es el diálogo modal real.
 */
export function CookieBanner(): ReactElement {
  const { t } = useTranslation("consent");
  const {
    isBannerVisible,
    isPreferencesOpen,
    acceptAll,
    rejectAll,
    openPreferences,
  } = useConsent();

  return (
    <>
      {isBannerVisible && (
        <ScBannerWrapper>
          <ScBannerSurface
            role="region"
            aria-label={t("Consent.banner.label")}
          >
            <ScBannerText>
              <ScBannerTitle>{t("Consent.banner.title")}</ScBannerTitle>
              <ScBannerBody>{t("Consent.banner.body")}</ScBannerBody>
            </ScBannerText>
            <ScBannerActions>
              {/*
                D12, atado por test (CookieBanner.test.tsx): "Aceptar" y
                "Rechazar" están los dos aquí, en la primera capa, son
                `<button>` reales (Button.tsx renderiza un <button> nativo
                por defecto), con el MISMO `size` y el MISMO `variant`
                ("solid") -- ninguno atenuado. `intent` es la única
                diferencia, y es semántica (afirmar vs. denegar), no una
                jerarquía de prioridad visual.
              */}
              <Button
                type="button"
                variant="solid"
                intent="primary"
                size="md"
                onClick={acceptAll}
              >
                {t("Consent.banner.accept")}
              </Button>
              <Button
                type="button"
                variant="solid"
                intent="neutral"
                size="md"
                onClick={rejectAll}
              >
                {t("Consent.banner.reject")}
              </Button>
              <ScConfigureLink
                type="button"
                onClick={openPreferences}
              >
                {t("Consent.banner.configure")}
              </ScConfigureLink>
            </ScBannerActions>
          </ScBannerSurface>
        </ScBannerWrapper>
      )}
      {isPreferencesOpen && <CookiePreferences />}
    </>
  );
}
