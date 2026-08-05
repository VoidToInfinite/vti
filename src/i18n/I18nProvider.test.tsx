import { act, render, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import i18n from "./config";
import { I18nProvider } from "./I18nProvider";

/*
 * D18 de la spec 2026-08-04-legal-seo-consentimiento-design.md.
 *
 * `app/layout.tsx` fija `lang="es"` en el HTML prerenderizado y hasta esta
 * entrega NADA lo actualizaba al cambiar de idioma: un visitante en inglés se
 * quedaba con el documento declarado como español, y un lector de pantalla lo
 * pronuncia con fonética española. Es un incumplimiento de WCAG 3.1.1
 * (Language of Page, nivel A).
 *
 * El atributo no se puede fijar desde el layout porque es un Server Component
 * y el idioma vive en `localStorage`, así que el candado tiene que estar
 * aquí, sobre el proveedor de cliente que sí lo conoce.
 *
 * Verificado con el bug inyectado: quitando la suscripción a
 * `languageChanged` de `I18nProvider.tsx`, el segundo test falla con
 * `expected 'es' to be 'en'`. Quitando además la llamada directa a
 * `syncDocumentLang` del efecto, falla también el tercero.
 */
describe("I18nProvider — sincronizacion de <html lang> (WCAG 3.1.1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "";
  });

  afterEach(async () => {
    // `i18n` es un singleton de módulo: se devuelve al idioma por defecto
    // para no contaminar los tests siguientes de este mismo fichero.
    if (i18n.language !== "es") {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
    window.localStorage.clear();
  });

  it("al montar declara el idioma activo en el documento", async () => {
    render(
      <I18nProvider>
        <span>contenido</span>
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es");
    });
  });

  it("al cambiar de idioma actualiza el atributo del documento", async () => {
    render(
      <I18nProvider>
        <span>contenido</span>
      </I18nProvider>,
    );
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es");
    });

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
    });
  });

  it("hidrata el atributo desde la preferencia guardada", async () => {
    window.localStorage.setItem("vti-lang", "en");

    render(
      <I18nProvider>
        <span>contenido</span>
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
    });
  });

  /*
   * Sonda de no-vacuidad: sin esto, los tres tests de arriba pasarían igual
   * de verdes si `syncDocumentLang` escribiera SIEMPRE "es"/"en" por
   * casualidad de orden. Al desmontar, el proveedor debe haber retirado su
   * suscripción -- un cambio de idioma posterior ya no puede tocar el
   * documento.
   */
  it("al desmontar deja de escuchar cambios de idioma", async () => {
    const { unmount } = render(
      <I18nProvider>
        <span>contenido</span>
      </I18nProvider>,
    );
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es");
    });

    unmount();
    document.documentElement.lang = "centinela";

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    expect(document.documentElement.lang).toBe("centinela");
  });
});
