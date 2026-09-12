import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTranslation } from "react-i18next";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import i18n from "./config";
import { I18nProvider } from "./I18nProvider";

/*
 * D18 de la spec 2026-08-04-legal-seo-consentimiento-design.md, REESCRITO el
 * 2026-08-18 (el idioma pasa a vivir en la URL).
 *
 * Hasta el 2026-09-06, `app/layout.tsx` fijaba `lang="es"` en TODO el HTML
 * prerenderizado -- era el único root layout del proyecto y no podía saber qué
 * ruta estaba renderizando -- así que este proveedor era el ÚNICO que corregía
 * el atributo. Sin esa corrección, un lector de pantalla pronunciaría el
 * contenido inglés con fonética española: incumplimiento de WCAG 3.1.1
 * (Language of Page, nivel A).
 *
 * DESDE LA OLA S (2026-09-06) el sitio tiene tres raíces y cada rama hornea su
 * propio `<html lang>` (`app/(es)/layout.tsx`, `app/en/layout.tsx` y
 * `app/global-not-found.tsx`, todas sobre `app/RootDocument.tsx`), así que en
 * las seis rutas normales este efecto reescribe el valor que el documento ya
 * trae. Donde SIGUE siendo la única corrección es en la 404: `output:
 * "export"` sirve un solo `out/404.html` horneado en castellano, y una URL
 * rota bajo `/en/` solo llega a anunciarse en inglés por esta vía. Los casos
 * de abajo miden justo eso -- que el idioma lo decide la ruta y `localStorage`
 * no puede cambiarlo -- y siguen siendo el candado de la propiedad.
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
    /*
     * `"vti-lang"` como LITERAL, no como `STORAGE_KEYS.lang`: la clave se
     * retiró del registro el 2026-09-02 (D3) y ya no existe en `storage.ts`.
     * Lo que este candado sigue midiendo no es un valor que el sitio escriba
     * -- no escribe ninguno -- sino el residuo REAL que un visitante de antes
     * de la retirada todavía tiene en su navegador: ni siquiera ese resto
     * puede teñir de inglés la ruta castellana.
     */
    window.localStorage.setItem("vti-lang", "en");

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

  /*
   * D3 (decisión del dueño, 2026-09-02): montar este proveedor NO escribe nada
   * en el equipo del visitante. Sustituye al candado inverso que vivió aquí
   * ("sincroniza vti-lang con el idioma de la ruta"), que ataba justamente la
   * escritura que se retira.
   *
   * El hallazgo P1 del evaluador Nielsen de la crítica #15 era exactamente
   * este recorrido: contexto de navegador nuevo, `goto('/')`, cero
   * interacción, y `localStorage` pasaba de `[]` a `[["vti-lang","es"]]`. La
   * política de privacidad clasificaba entonces todo lo guardado como
   * «preferencias técnicas que guardan una elección hecha por ti», y aterrizar
   * en una URL no es elegir nada. (Desde la ola S esa página distingue la
   * preferencia elegida del estado técnico de sesión; el idioma al aterrizar
   * no era ninguna de las dos.)
   *
   * ESPÍA sobre `setItem`, no una comprobación de que la clave concreta esté
   * ausente: lo que hay que impedir es la ESCRITURA, sea con el nombre que
   * sea. Un `getItem("vti-lang")` a null pasaría en verde el día que alguien
   * reintrodujera la misma escritura con otro nombre de clave.
   *
   * Se afirma sobre el prototipo (`Storage.prototype.setItem`) y no sobre
   * `window.localStorage.setItem`: es donde jsdom tiene el método, y espiar
   * ahí caza también cualquier escritura hecha a través de `sessionStorage` o
   * de otra referencia al mismo almacén.
   */
  it("montar el proveedor NO escribe nada en localStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    render(
      <I18nProvider locale="en">
        <span>contenido</span>
      </I18nProvider>,
    );

    // Se espera al efecto (la sincronía de `lang` sí corre tras montar) para
    // que el candado mire DESPUÉS del punto en el que vivía la escritura, no
    // antes.
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
    });
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
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
