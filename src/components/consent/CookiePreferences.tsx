"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ALWAYS_ON_CATEGORY,
  CONSENT_CATEGORIES,
  storageByCategory,
  type ConsentCategory,
} from "@/config/cookies";
import { Button } from "@/components/ui/Button/Button";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { useConsent } from "@/consent/ConsentProvider";
import type { ConsentDecision } from "@/consent/consentTypes";
import {
  ScAlwaysOnNote,
  ScBackdrop,
  ScCategoryDescription,
  ScCategoryHeader,
  ScCategoryList,
  ScCategoryName,
  ScCategoryRow,
  ScCheckbox,
  ScDialogFooter,
  ScDialogHeader,
  ScDialogIntro,
  ScDialogPanel,
  ScDialogTitle,
  ScEmptyCategoryNote,
  ScStorageItem,
  ScStorageList,
  ScStorageMeta,
  ScStorageName,
} from "./consent.parts";

// Icono en línea, sin dependencias nuevas -- mismo patrón que
// ThemeIcons.tsx (viewBox 24x24, width/height="1em" para heredar el
// tamaño de IconButton, aria-hidden porque el nombre accesible del botón
// lo da `aria-label`, no el icono).
function IconClose(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line
          x1="5"
          y1="5"
          x2="19"
          y2="19"
        />
        <line
          x1="19"
          y1="5"
          x2="5"
          y2="19"
        />
      </g>
    </svg>
  );
}

/** Selector de elementos focuseables usado por el atrapado de foco manual
 *  de abajo. No incluye `[tabindex="-1"]`: esos nodos existen para poder
 *  recibir foco por programa (como el propio panel) pero no forman parte
 *  del recorrido de Tab. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Decisión de partida del panel cuando NO hay ninguna decisión previa:
 *  todo denegado salvo `necessary` -- mismo criterio "opt-in" que
 *  `ConsentProvider.buildDeniedDecision`, redeclarado aquí porque esa
 *  función no se exporta (es un detalle interno del provider) y este
 *  componente solo necesita el valor, no la implementación. */
function buildDeniedDecision(): ConsentDecision {
  const decision = {} as ConsentDecision;
  for (const category of CONSENT_CATEGORIES) {
    decision[category] = category === ALWAYS_ON_CATEGORY;
  }
  return decision;
}

/**
 * Diálogo modal real de preferencias de consentimiento (D11, D15, D16). El
 * repo no tiene un componente de diálogo genérico, así que el atrapado de
 * foco se implementa aquí a mano con `querySelectorAll` en vez de añadir
 * una dependencia nueva solo para este único diálogo del sitio.
 *
 * Contrato de foco (spec §7.4): al montar, guarda qué elemento tenía el
 * foco (el disparador -- "Configurar" del banner o "Preferencias de
 * cookies" del footer, según por dónde se haya abierto) y mueve el foco
 * dentro del panel; `Tab`/`Shift+Tab` circulan dentro del panel sin salir
 * nunca a la página de detrás; `Escape` cierra; al desmontar, el foco
 * vuelve SIEMPRE al disparador original.
 */
export function CookiePreferences(): ReactElement {
  const { t } = useTranslation("consent");
  const { decision, save, acceptAll, rejectAll, closePreferences } =
    useConsent();
  const titleId = useId();

  const [pending, setPending] = useState<ConsentDecision>(
    () => decision ?? buildDeniedDecision(),
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // El elemento con foco en el momento de montar ES el disparador: un
    // clic de ratón real sobre un elemento focuseable (botón o enlace) le
    // da el foco antes de que su `onClick` -- que es lo que abre este
    // diálogo -- termine de ejecutarse, y una activación por teclado
    // (Enter/Espacio) exige que ya estuviera enfocado de antemano. Cubre
    // los dos disparadores reales del sitio: "Configurar" del banner
    // (CookieBanner.tsx) y el enlace "Preferencias de cookies" del footer
    // (integración, fuera de este flujo).
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreferences();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      const active = document.activeElement;
      const activeIsInside =
        active instanceof Node && panelRef.current?.contains(active);

      if (event.shiftKey) {
        if (!activeIsInside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (!activeIsInside || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // Bloqueo del scroll de fondo mientras el diálogo está abierto.
    // `aria-modal="true"` DECLARA a las tecnologías de apoyo que el resto
    // del documento está inerte; si la página de detrás sigue
    // desplazándose con rueda o gesto táctil, el atributo miente. El
    // backdrop es `position: fixed` y tapa visualmente, pero eso no detiene
    // el scroll del documento. Se guarda el valor previo en vez de asumir
    // que era la cadena vacía: si algún día otra capa lo hubiera fijado, el
    // cleanup lo restauraría a lo que de verdad había.
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = scrollPrevio;
      // Devuelve el foco al disparador SIEMPRE al desmontar, sea cual sea
      // la vía de cierre (Escape, botón cerrar, Guardar, Aceptar/Rechazar
      // todo desde el propio panel).
      triggerRef.current?.focus();
    };
  }, [closePreferences]);

  const handleToggle = useCallback(
    (category: ConsentCategory) =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        // Defensivo: el checkbox de ALWAYS_ON_CATEGORY se pinta disabled,
        // así que el navegador no debería disparar este evento para él,
        // pero no confiar en eso es gratis (D11 no es conmutable, punto).
        if (category === ALWAYS_ON_CATEGORY) return;
        const checked = event.target.checked;
        setPending((prev) => ({ ...prev, [category]: checked }));
      },
    [],
  );

  const handleSave = useCallback((): void => {
    save(pending);
    closePreferences();
  }, [save, pending, closePreferences]);

  const handleAcceptAll = useCallback((): void => {
    acceptAll();
    closePreferences();
  }, [acceptAll, closePreferences]);

  const handleRejectAll = useCallback((): void => {
    rejectAll();
    closePreferences();
  }, [rejectAll, closePreferences]);

  return (
    <ScBackdrop>
      <ScDialogPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <ScDialogHeader>
          <ScDialogTitle id={titleId}>
            {t("Consent.preferences.title")}
          </ScDialogTitle>
          <IconButton
            icon={<IconClose />}
            aria-label={t("Consent.preferences.close")}
            variant="ghost"
            intent="neutral"
            size="sm"
            onClick={closePreferences}
          />
        </ScDialogHeader>
        <ScDialogIntro>{t("Consent.preferences.intro")}</ScDialogIntro>

        <ScCategoryList>
          {CONSENT_CATEGORIES.map((category) => {
            const isAlwaysOn = category === ALWAYS_ON_CATEGORY;
            const entries = storageByCategory(category);
            const checkboxId = `${titleId}-${category}`;

            return (
              <ScCategoryRow key={category}>
                <ScCategoryHeader>
                  <ScCheckbox
                    type="checkbox"
                    id={checkboxId}
                    checked={isAlwaysOn ? true : pending[category]}
                    disabled={isAlwaysOn}
                    onChange={handleToggle(category)}
                  />
                  <ScCategoryName htmlFor={checkboxId}>
                    {t(`Consent.categories.${category}.name`)}
                  </ScCategoryName>
                </ScCategoryHeader>
                <ScCategoryDescription>
                  {t(`Consent.categories.${category}.description`)}
                </ScCategoryDescription>
                {isAlwaysOn && (
                  <ScAlwaysOnNote>
                    {t("Consent.preferences.alwaysOn")}
                  </ScAlwaysOnNote>
                )}
                {entries.length === 0 ? (
                  <ScEmptyCategoryNote>
                    {t("Consent.preferences.emptyCategory")}
                  </ScEmptyCategoryNote>
                ) : (
                  <ScStorageList>
                    {entries.map((entry) => (
                      <ScStorageItem key={entry.id}>
                        <ScStorageName>
                          {t(`Consent.storage.${entry.id}.name`)}
                        </ScStorageName>
                        <ScStorageMeta>
                          <dt>{t("Consent.table.id")}</dt>
                          <dd>{entry.id}</dd>
                          <dt>{t("Consent.table.purpose")}</dt>
                          <dd>{t(`Consent.storage.${entry.id}.purpose`)}</dd>
                          <dt>{t("Consent.table.kind")}</dt>
                          <dd>{entry.kind}</dd>
                          <dt>{t("Consent.table.duration")}</dt>
                          <dd>
                            {entry.durationDays === null
                              ? t("Consent.table.persistent")
                              : t("Consent.table.days", {
                                  count: entry.durationDays,
                                })}
                          </dd>
                        </ScStorageMeta>
                      </ScStorageItem>
                    ))}
                  </ScStorageList>
                )}
              </ScCategoryRow>
            );
          })}
        </ScCategoryList>

        <ScDialogFooter>
          <Button
            type="button"
            variant="solid"
            intent="primary"
            size="md"
            onClick={handleSave}
          >
            {t("Consent.preferences.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            intent="neutral"
            size="md"
            onClick={handleAcceptAll}
          >
            {t("Consent.preferences.acceptAll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            intent="neutral"
            size="md"
            onClick={handleRejectAll}
          >
            {t("Consent.preferences.rejectAll")}
          </Button>
        </ScDialogFooter>
      </ScDialogPanel>
    </ScBackdrop>
  );
}
