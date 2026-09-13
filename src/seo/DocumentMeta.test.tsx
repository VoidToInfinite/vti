import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SITE } from "@/config/site";
import i18n from "@/i18n/config";
import esCommon from "@/i18n/locales/es/common.json";
import enCommon from "@/i18n/locales/en/common.json";
import { DocumentMeta } from "./DocumentMeta";
import { TITLE_SEPARATOR } from "./metadata";

/*
 * Candado del punto de montaje (crítica externa #8, 2026-08-17). Verifica lo
 * que el hook por sí solo no puede: que las CLAVES i18n resuelvan a texto real
 * en los dos idiomas y que el título cambie al cambiar el idioma.
 *
 * Validado con bug inyectado -- ver el docblock de `useDocumentMeta.test.tsx`.
 */

const CLAVES = {
  title: "Common.Meta.home.title",
  description: "Common.Meta.home.description",
} as const;

function descriptionContent(): string | null {
  return (
    document.head
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ?? null
  );
}

async function cambiarIdioma(lang: "es" | "en"): Promise<void> {
  await act(async () => {
    await i18n.changeLanguage(lang);
  });
}

beforeEach(() => {
  for (const meta of Array.from(
    document.head.querySelectorAll('meta[name="description"]'),
  )) {
    meta.remove();
  }
  document.title = "";
});

afterEach(async () => {
  // i18next es un singleton del proceso de test: sin esto el idioma se filtra
  // a los demás archivos de la suite.
  if (i18n.language !== "es") await cambiarIdioma("es");
});

describe("DocumentMeta", () => {
  it("no pinta nada: su único efecto es sobre el documento", () => {
    const { container } = renderWithProviders(
      <DocumentMeta
        titleKey={CLAVES.title}
        descriptionKey={CLAVES.description}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("en español escribe el título y la descripción de la home", () => {
    renderWithProviders(
      <DocumentMeta
        titleKey={CLAVES.title}
        descriptionKey={CLAVES.description}
      />,
    );

    expect(document.title).toBe(
      `${esCommon.Common.Meta.home.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
    expect(descriptionContent()).toBe(esCommon.Common.Meta.home.description);
  });

  it("al pasar a inglés, título y descripción cambian de idioma", async () => {
    renderWithProviders(
      <DocumentMeta
        titleKey={CLAVES.title}
        descriptionKey={CLAVES.description}
      />,
    );
    await cambiarIdioma("en");

    expect(document.title).toBe(
      `${enCommon.Common.Meta.home.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
    expect(document.title).not.toContain(esCommon.Common.Meta.home.title);
    expect(descriptionContent()).toBe(enCommon.Common.Meta.home.description);
  });

  /*
   * i18next NO lanza cuando una clave no existe: devuelve la propia ruta como
   * texto. Sin esta sonda, un `Common.Meta.*` mal escrito dejaría la pestaña
   * diciendo "Common.Meta.home.title · VoidToInfinite" y los dos casos de
   * arriba seguirían en verde solo si comparasen contra la misma ruta.
   */
  it.each(["es", "en"] as const)(
    "%s: las claves resuelven a texto real, no a la ruta de clave",
    async (lang) => {
      await cambiarIdioma(lang);
      renderWithProviders(
        <DocumentMeta
          titleKey={CLAVES.title}
          descriptionKey={CLAVES.description}
        />,
      );

      expect(document.title).not.toContain("Common.Meta");
      expect(descriptionContent()).not.toContain("Common.Meta");
      expect(descriptionContent()?.length ?? 0).toBeGreaterThan(0);
    },
  );
});

/*
 * INVARIANTE QUE CRUZA DOS FICHEROS (regla 41): el castellano de
 * `Common.Meta.home.*` y `SITE.homeTitle`/`SITE.description` describen la
 * MISMA página, uno para el visitante que ya está dentro y otro para el HTML
 * que ven los rastreadores. Son dos declaraciones del mismo texto en dos
 * ficheros distintos -- exactamente la forma que diverge a la primera
 * corrección que solo toque uno. Este test es lo que obliga a tocar los dos.
 *
 * Se resuelve así, y no leyendo `SITE` desde el componente, porque el inglés
 * NO puede salir de `src/config/site.ts`: ese módulo es monolingüe a propósito
 * (es la fuente de la metadata horneada, que es castellana). La única fuente
 * posible del par es/en es el locale; el candado es lo que le ata el español
 * al de la configuración.
 */
describe("Common.Meta.home (es) y SITE no pueden divergir", () => {
  it("el título es exactamente SITE.homeTitle", () => {
    expect(esCommon.Common.Meta.home.title).toBe(SITE.homeTitle);
  });

  it("la descripción es exactamente SITE.description", () => {
    expect(esCommon.Common.Meta.home.description).toBe(SITE.description);
  });

  /*
   * El inglés es TRADUCCIÓN provisional del mismo copy, pendiente de la
   * bendición del dueño (el copy SEO en inglés completo está bloqueado por
   * decisión suya). Lo que sí se puede aseverar hoy sin invadir esa decisión:
   * que existe, que no es el castellano copiado y que no está vacío.
   */
  it("el inglés existe, tiene texto y no es el castellano sin traducir", () => {
    expect(enCommon.Common.Meta.home.title.trim().length).toBeGreaterThan(0);
    expect(enCommon.Common.Meta.home.description.trim().length).toBeGreaterThan(
      0,
    );
    expect(enCommon.Common.Meta.home.title).not.toBe(SITE.homeTitle);
    expect(enCommon.Common.Meta.home.description).not.toBe(SITE.description);
  });
});
