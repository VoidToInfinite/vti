import { act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { ConsentProvider, useConsent } from "./ConsentProvider";
import { CONSENT_STORAGE_KEY } from "./consentStorage";
import type { ConsentRecord } from "./consentTypes";

/** Click envuelto en `act()` — mismo patrón que
 *  `ThemeToggle.test.tsx:59-61`: el handler dispara un `setState` fuera del
 *  ciclo de eventos que React Testing Library instrumenta automáticamente
 *  para un `fireEvent`, así que se envuelve a mano. */
function click(element: HTMLElement): void {
  act(() => {
    element.click();
  });
}

/**
 * Arnés mínimo de consumo del contexto: expone el estado relevante como
 * texto en el DOM (para `getByTestId`) y botones que invocan cada acción,
 * en vez de montar `CookieBanner`/`CookiePreferences` (que son de otros
 * ficheros de test) — este archivo ata SOLO el contrato de
 * `ConsentProvider`/`useConsent`.
 */
function ConsentHarness() {
  const {
    decision,
    isBannerVisible,
    isPreferencesOpen,
    acceptAll,
    rejectAll,
    openPreferences,
    closePreferences,
    hasConsent,
  } = useConsent();

  return (
    <div>
      <span data-testid="banner-visible">
        {isBannerVisible ? "visible" : "oculto"}
      </span>
      <span data-testid="preferences-open">
        {isPreferencesOpen ? "abierto" : "cerrado"}
      </span>
      <span data-testid="decision">{JSON.stringify(decision)}</span>
      <span data-testid="has-necessary">{String(hasConsent("necessary"))}</span>
      <span data-testid="has-analytics">{String(hasConsent("analytics"))}</span>
      <button onClick={acceptAll}>aceptar todo</button>
      <button onClick={rejectAll}>rechazar todo</button>
      <button onClick={openPreferences}>abrir preferencias</button>
      <button onClick={closePreferences}>cerrar preferencias</button>
    </div>
  );
}

function renderHarness() {
  return renderWithProviders(
    <ConsentProvider>
      <ConsentHarness />
    </ConsentProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("ConsentProvider", () => {
  it("sin registro previo, el banner es visible tras hidratar", async () => {
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("visible");
    });
  });

  it("tras acceptAll() el banner desaparece y NO reaparece al remontar", async () => {
    const { unmount } = renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("visible");
    });

    click(screen.getByRole("button", { name: "aceptar todo" }));

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("oculto");
    });

    unmount();
    renderHarness();

    // El segundo montaje lee el registro ya persistido: nunca debe pasar
    // por "visible", ni siquiera brevemente durante la hidratación.
    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("oculto");
    });
  });

  it("rejectAll() persiste un registro en localStorage (rechazar no puede costar más que aceptar, D12)", async () => {
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("visible");
    });

    click(screen.getByRole("button", { name: "rechazar todo" }));

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("oculto");
    });

    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const record = JSON.parse(raw as string) as ConsentRecord;
    expect(record.categories.necessary).toBe(true);
    expect(record.categories.analytics).toBe(false);
    expect(record.categories.marketing).toBe(false);
  });

  it("hasConsent('necessary') es true incluso sin ninguna decisión tomada", async () => {
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("visible");
    });

    expect(screen.getByTestId("has-necessary")).toHaveTextContent("true");
  });

  it("hasConsent('analytics') es false sin decisión y tras rejectAll(), y true tras acceptAll()", async () => {
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("banner-visible")).toHaveTextContent("visible");
    });
    expect(screen.getByTestId("has-analytics")).toHaveTextContent("false");

    click(screen.getByRole("button", { name: "rechazar todo" }));
    await waitFor(() => {
      expect(screen.getByTestId("has-analytics")).toHaveTextContent("false");
    });

    click(screen.getByRole("button", { name: "aceptar todo" }));
    await waitFor(() => {
      expect(screen.getByTestId("has-analytics")).toHaveTextContent("true");
    });
  });
});
