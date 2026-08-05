import { act } from "@testing-library/react";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esConsent from "@/i18n/locales/es/consent.json";
import enConsent from "@/i18n/locales/en/consent.json";
import { ConsentProvider, useConsent } from "@/consent/ConsentProvider";
import { CookiePreferences } from "./CookiePreferences";

/*
 * El namespace `consent` todavía no está registrado en `src/i18n/config.ts`
 * (lo hace el hilo principal en integración, spec §5): se registra SOLO
 * dentro de este fichero de test, vía `addResourceBundle` — mismo patrón
 * que `LegalDocument.test.tsx`/`CookieBanner.test.tsx`.
 */
beforeAll(() => {
  i18n.addResourceBundle("es", "consent", esConsent, true, true);
  i18n.addResourceBundle("en", "consent", enConsent, true, true);
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

function click(element: HTMLElement): void {
  act(() => {
    element.click();
  });
}

/** Expone `hasConsent` para comprobar el gate tras "Guardar preferencias",
 *  igual que hace `ConsentProvider.test.tsx` para atar el contrato del
 *  contexto, no solo el DOM. */
function AnalyticsProbe() {
  const { hasConsent } = useConsent();
  return (
    <span data-testid="has-analytics">{String(hasConsent("analytics"))}</span>
  );
}

/**
 * Monta un botón disparador REAL (fuera del panel) y, tras un clic, el
 * propio `CookiePreferences` — así el efecto de "guarda qué tenía el foco
 * al montar" captura el disparador de verdad, igual que ocurriría con el
 * botón "Configurar" del banner o el enlace del footer en producción.
 */
function PreferencesHarness() {
  const { isPreferencesOpen, openPreferences } = useConsent();
  return (
    <div>
      <button
        type="button"
        onClick={openPreferences}
      >
        abrir preferencias
      </button>
      <AnalyticsProbe />
      {isPreferencesOpen && <CookiePreferences />}
    </div>
  );
}

function renderHarness() {
  return renderWithProviders(
    <ConsentProvider>
      <PreferencesHarness />
    </ConsentProvider>,
  );
}

async function openViaTrigger(): Promise<HTMLElement> {
  const trigger = await screen.findByRole("button", {
    name: "abrir preferencias",
  });
  // Un clic de ratón REAL sobre un elemento focuseable le da el foco antes
  // de que se dispare su evento `click` (así es como `CookiePreferences`
  // sabe, en producción, a qué disparador devolver el foco al cerrar).
  // `HTMLElement.click()` de jsdom simula el evento pero NO replica ese
  // paso de foco previo -- verificado: sin este `.focus()` explícito,
  // `document.activeElement` se queda en `<body>` y el test de devolución
  // de foco falla incluso con el componente correcto. Se hace explícito
  // aquí para no depender de un detalle no soportado del propio jsdom.
  act(() => {
    trigger.focus();
  });
  click(trigger);
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  return trigger;
}

describe("CookiePreferences", () => {
  it("es un diálogo modal real: role='dialog' + aria-modal='true'", async () => {
    renderHarness();
    await openViaTrigger();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("el checkbox de 'necessary' está disabled y checked (D11 — no es conmutable)", async () => {
    renderHarness();
    await openViaTrigger();

    const necessaryCheckbox = screen.getByRole("checkbox", {
      name: esConsent.Consent.categories.necessary.name,
    });
    expect(necessaryCheckbox).toBeDisabled();
    expect(necessaryCheckbox).toBeChecked();
  });

  it("las categorías vacías (analytics, marketing) declaran explícitamente que no hay tecnología", async () => {
    renderHarness();
    await openViaTrigger();

    const emptyNotes = screen.getAllByText(
      esConsent.Consent.preferences.emptyCategory,
    );
    // analytics y marketing están vacías hoy (cookies.ts); necessary no.
    expect(emptyNotes).toHaveLength(2);
  });

  it("Escape cierra el diálogo", async () => {
    renderHarness();
    await openViaTrigger();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("al cerrar, el foco vuelve al elemento que abrió el diálogo", async () => {
    renderHarness();
    const trigger = await openViaTrigger();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("Tab desde el último elemento focuseable vuelve al primero (foco atrapado)", async () => {
    renderHarness();
    await openViaTrigger();

    const dialog = screen.getByRole("dialog");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThan(1);

    const last = focusable[focusable.length - 1] as HTMLElement;
    const first = focusable[0] as HTMLElement;

    act(() => {
      last.focus();
    });
    expect(document.activeElement).toBe(last);

    act(() => {
      last.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(document.activeElement).toBe(first);
  });

  /*
   * Test ESPEJO del de arriba, añadido tras la auditoría adversarial de la
   * entrega. El hueco era real y estaba medido: vaciando la rama
   * `if (event.shiftKey) { ... }` de `CookiePreferences.tsx` -- sin tocar la
   * rama de Tab hacia delante -- los 32 tests de consentimiento seguían en
   * VERDE. El código de producción era correcto, pero la mitad hacia atrás
   * del atrapado de foco no tenía quien la protegiera: un refactor futuro
   * podía escaparse el foco del diálogo con Shift+Tab sin romper nada.
   *
   * Las dos direcciones se cubren por separado porque son dos ramas
   * distintas del mismo `if`, y una sola no implica la otra.
   */
  it("Shift+Tab desde el primer elemento focuseable vuelve al último (foco atrapado hacia atras)", async () => {
    renderHarness();
    await openViaTrigger();

    const dialog = screen.getByRole("dialog");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    act(() => {
      first.focus();
    });
    expect(document.activeElement).toBe(first);

    act(() => {
      first.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(document.activeElement).toBe(last);
  });

  /*
   * `aria-modal="true"` DECLARA que el resto del documento está inerte. Si
   * la página de detrás sigue desplazándose con rueda o gesto táctil, el
   * atributo miente — el backdrop `position: fixed` tapa, pero no detiene el
   * scroll del documento. Hallazgo de la auditoría adversarial.
   */
  it("bloquea el scroll del documento mientras esta abierto y lo restaura al cerrar", async () => {
    renderHarness();
    const previo = document.body.style.overflow;

    await openViaTrigger();
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe(previo);
  });

  it("guardar con 'analytics' marcado hace que hasConsent('analytics') pase a true", async () => {
    renderHarness();
    await openViaTrigger();

    expect(screen.getByTestId("has-analytics")).toHaveTextContent("false");

    const analyticsCheckbox = screen.getByRole("checkbox", {
      name: esConsent.Consent.categories.analytics.name,
    });
    act(() => {
      analyticsCheckbox.click();
    });

    const saveButton = screen.getByRole("button", {
      name: esConsent.Consent.preferences.save,
    });
    click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId("has-analytics")).toHaveTextContent("true");
    });
  });
});
