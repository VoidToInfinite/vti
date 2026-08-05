import { act } from "@testing-library/react";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esConsent from "@/i18n/locales/es/consent.json";
import enConsent from "@/i18n/locales/en/consent.json";
import { ConsentProvider } from "@/consent/ConsentProvider";
import { CookieBanner } from "./CookieBanner";

/** Click envuelto en `act()` — mismo patrón que `ThemeToggle.test.tsx:59-61`
 *  y `ConsentProvider.test.tsx`. */
function click(element: HTMLElement): void {
  act(() => {
    element.click();
  });
}

/*
 * El namespace `consent` todavía no está registrado en `src/i18n/config.ts`
 * (lo hace el hilo principal en integración, spec §5): se registra SOLO
 * dentro de este fichero de test, vía `addResourceBundle`, sin tocar
 * `config.ts` — mismo patrón que ya usa `LegalDocument.test.tsx` para el
 * namespace `legal`.
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

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * (jsdom no evalúa `getComputedStyle` de propiedades derivadas de una hoja
 * de estilos inyectada dinámicamente de forma fiable para esto, así que se
 * inspecciona el TEXTO de la regla). Mismo helper que ya usan
 * `Footer.test.tsx`/`Contact.test.tsx`/`SectionBeam.test.tsx`.
 */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

function renderBanner() {
  return renderWithProviders(
    <ConsentProvider>
      <CookieBanner />
    </ConsentProvider>,
  );
}

describe("CookieBanner", () => {
  it("sin decisión previa, muestra aceptar y rechazar como <button> reales tras hidratar, sin abrir nada más", async () => {
    renderBanner();

    const accept = await screen.findByRole("button", {
      name: esConsent.Consent.banner.accept,
    });
    const reject = screen.getByRole("button", {
      name: esConsent.Consent.banner.reject,
    });

    expect(accept.tagName).toBe("BUTTON");
    expect(reject.tagName).toBe("BUTTON");

    // "sin abrir nada más": el panel de preferencias (diálogo modal) NO
    // está montado por defecto -- solo "Configurar" lo abre.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("D12 — aceptar y rechazar comparten el MISMO size declarado (mismo alto de Button.tsx)", async () => {
    renderBanner();

    const accept = await screen.findByRole("button", {
      name: esConsent.Consent.banner.accept,
    });
    const reject = screen.getByRole("button", {
      name: esConsent.Consent.banner.reject,
    });

    const acceptCss = cssRuleTextFor(accept);
    const rejectCss = cssRuleTextFor(reject);

    // Sonda positiva: si esto no apareciera en NINGUNO de los dos, la
    // comparación de abajo pasaría por vacuidad.
    expect(acceptCss).toContain("height: 44px");
    expect(rejectCss).toContain("height: 44px");
  });

  it("el banner NO tiene role='dialog' (D15 — no es modal, no bloquea)", async () => {
    renderBanner();

    await screen.findByRole("button", {
      name: esConsent.Consent.banner.accept,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("tras aceptar, el banner desaparece del documento", async () => {
    renderBanner();

    const accept = await screen.findByRole("button", {
      name: esConsent.Consent.banner.accept,
    });
    click(accept);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: esConsent.Consent.banner.accept }),
      ).not.toBeInTheDocument();
    });
  });

  it("'Configurar' abre el panel de preferencias como diálogo modal", async () => {
    renderBanner();

    const configure = await screen.findByRole("button", {
      name: esConsent.Consent.banner.configure,
    });
    click(configure);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
