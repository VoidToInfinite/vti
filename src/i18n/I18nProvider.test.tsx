import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/config/storage";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import i18n from "./config";
import { I18nProvider } from "./I18nProvider";

/*
 * D18 de la spec 2026-08-04-legal-seo-consentimiento-design.md, REESCRITO el
 * 2026-08-18 (el idioma pasa a vivir en la URL).
 *
 * `app/layout.tsx` fija `lang="es"` en el HTML prerenderizado -- es el único
 * root layout del proyecto y no puede saber qué ruta está renderizando (ver su
 * docblock, con la cita del código de Next que lo bloquea) -- así que este
 * proveedor sigue siendo el ÚNICO que corrige el atributo. Sin esa corrección,
 * un lector de pantalla pronunciaría el contenido inglés con fonética
 * española: incumplimiento de WCAG 3.1.1 (Language of Page, nivel A).
 *
 * LO QUE CAMBIA respecto de la versión anterior de este fichero: el idioma ya
 * NO se hidrata desde `localStorage` ni se conmuta en memoria, así que los dos
 * candados que medían eso ("al cambiar de idioma actualiza el atributo",
 * "hidrata el atributo desde la preferencia guardada") describen un
 * comportamiento que el repo retiró a propósito, no una regresión. Los
 * sustituyen los de abajo, que miden la propiedad nueva -- y más fuerte-- : el
 * idioma es el de la ruta, y `localStorage` no puede cambiarlo.
 *
 * Validado con bug inyectado (rojo observado antes de darlo por bueno; ver el
 * informe de la entrega para la salida literal de cada uno).
 */
function Probe(): React.ReactElement {
  const { t, i18n: active } = useTranslation("common");
  return (
    <span
      data-testid="probe"
      data-lng={active.language}
    >
      {t("Common.Meta.home.title")}
    </span>
  );
}

describe("I18nProvider — el idioma lo decide la ruta", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "";
  });

  it("sin `locale`, el proveedor entrega el castellano por defecto", async () => {
    const { getByTestId } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(getByTestId("probe").textContent).toBe(
      esCommon.Common.Meta.home.title,
    );
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es");
    });
  });

  it('con `locale="en"` resuelve las claves en inglés, ya en el primer render', () => {
    const { getByTestId } = render(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>,
    );

    // Sin `waitFor`: la propiedad que importa es que el inglés esté en el
    // PRIMER render (es lo que se hornea en el HTML estático de `/en/`), no
    // que llegue después de un efecto.
    expect(getByTestId("probe").textContent).toBe(
      enCommon.Common.Meta.home.title,
    );
    expect(getByTestId("probe").dataset.lng).toBe("en");
  });

  it('con `locale="en"` declara lang="en" en el documento', async () => {
    render(
      <I18nProvider locale="en">
        <span>contenido</span>
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
    });
  });

  /*
   * EL CANDADO CENTRAL DE LA DECISIÓN DEL DUEÑO: «la URL manda sobre el
   * localStorage al aterrizar en una ruta /en/». Su recíproco importa igual:
   * un inglés guardado NO puede teñir de inglés la ruta castellana -- ahí el
   * HTML horneado es castellano, y hacerlo cambiar tras hidratar sería
   * reintroducir el mismatch y el "idioma sin URL" que esta entrega cierra.
   */
  it("una preferencia guardada NO sobrescribe el idioma de la ruta", async () => {
    window.localStorage.setItem(STORAGE_KEYS.lang, "en");

    const { getByTestId } = render(
      <I18nProvider locale="es">
        <Probe />
      </I18nProvider>,
    );

    expect(getByTestId("probe").textContent).toBe(
      esCommon.Common.Meta.home.title,
    );
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es");
    });
  });

  it("sincroniza vti-lang con el idioma de la ruta", async () => {
    window.localStorage.setItem(STORAGE_KEYS.lang, "es");

    render(
      <I18nProvider locale="en">
        <span>contenido</span>
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEYS.lang)).toBe("en");
    });
  });

  /*
   * Sonda de aislamiento entre instancias. El inglés se sirve desde un
   * `cloneInstance` que COMPARTE el almacén de recursos con el singleton
   * castellano (ver el docblock de `getI18nInstance`); lo que no debe
   * compartir es el IDIOMA ACTIVO. Sin este candado, un clon que arrastrara el
   * idioma del padre pasaría desapercibido en cualquier test que montara solo
   * una de las dos ramas.
   */
  it("montar la rama inglesa no cambia el idioma de la instancia castellana", () => {
    render(
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>,
    );

    expect(i18n.language).toBe("es");
  });
});
