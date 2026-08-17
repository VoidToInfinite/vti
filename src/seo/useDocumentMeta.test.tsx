import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { SITE } from "@/config/site";
import { TITLE_SEPARATOR } from "./metadata";
import { useDocumentMeta } from "./useDocumentMeta";

/*
 * Candado del mecanismo compartido (crítica externa #8, 2026-08-17). Cubre lo
 * que el hook hace por sí mismo, sin i18n de por medio: componer el título con
 * la marca y mantener `meta[name="description"]` sin duplicarla.
 *
 * VALIDADO CON BUG INYECTADO (regla 34), no por analogía:
 *   - comentando `document.title = fullTitle` en `useDocumentMeta.ts` caen los
 *     casos de título de este archivo, los de `DocumentMeta.test.tsx`, los de
 *     `app/home-page.meta.test.tsx`, los de `app/not-found.test.tsx` y el de
 *     `LegalDocument.test.tsx`;
 *   - comentando `meta.setAttribute("content", description)` caen los casos de
 *     descripción.
 * Restaurados los dos, todo vuelve a verde. Salidas literales en el informe de
 * la tarea.
 */

/** Sonda mínima: el hook necesita un componente que lo llame. */
function Probe({
  title,
  description,
}: {
  title: string;
  description?: string;
}): null {
  useDocumentMeta({ title, description });
  return null;
}

function descriptionMetas(): HTMLMetaElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLMetaElement>('meta[name="description"]'),
  );
}

beforeEach(() => {
  // jsdom comparte `document` entre casos del mismo archivo: sin esto, la
  // etiqueta creada por un caso anterior convierte al siguiente en un test
  // distinto del que dice ser.
  for (const meta of descriptionMetas()) meta.remove();
  document.title = "";
});

describe("useDocumentMeta: título", () => {
  it("escribe el título de la página con el sufijo de marca", () => {
    render(<Probe title="Política de privacidad" />);
    expect(document.title).toBe(
      `Política de privacidad${TITLE_SEPARATOR}${SITE.name}`,
    );
  });

  it("no duplica la marca cuando el título YA es la marca", () => {
    render(<Probe title={SITE.name} />);
    expect(document.title).toBe(SITE.name);
  });

  it("reescribe el título cuando cambia el que se le pasa (el caso del cambio de idioma)", () => {
    const { rerender } = render(<Probe title="Página no encontrada" />);
    expect(document.title).toContain("Página no encontrada");

    rerender(<Probe title="Page not found" />);
    expect(document.title).toBe(`Page not found${TITLE_SEPARATOR}${SITE.name}`);
    expect(document.title).not.toContain("Página no encontrada");
  });
});

describe("useDocumentMeta: descripción", () => {
  it("actualiza la etiqueta que YA existe en el documento, sin crear una segunda", () => {
    const existente = document.createElement("meta");
    existente.setAttribute("name", "description");
    existente.setAttribute("content", "descripción horneada en build");
    document.head.appendChild(existente);

    render(
      <Probe
        title="Home"
        description="descripción del idioma activo"
      />,
    );

    expect(descriptionMetas()).toHaveLength(1);
    expect(descriptionMetas()[0].getAttribute("content")).toBe(
      "descripción del idioma activo",
    );

    // La que venía en el HTML NO se retira al desmontar: quitarla dejaría al
    // documento sin descripción al navegar a otra ruta.
    cleanup();
    expect(descriptionMetas()).toHaveLength(1);
    existente.remove();
  });

  it("crea la etiqueta si el documento no la trae, y retira SOLO la que creó", () => {
    expect(descriptionMetas()).toHaveLength(0);

    render(
      <Probe
        title="Home"
        description="una descripción"
      />,
    );
    expect(descriptionMetas()).toHaveLength(1);
    expect(descriptionMetas()[0].getAttribute("content")).toBe(
      "una descripción",
    );

    cleanup();
    expect(descriptionMetas()).toHaveLength(0);
  });

  it("sin descripción no toca la etiqueta del documento", () => {
    const existente = document.createElement("meta");
    existente.setAttribute("name", "description");
    existente.setAttribute("content", "descripción horneada en build");
    document.head.appendChild(existente);

    render(<Probe title="Home" />);

    expect(descriptionMetas()).toHaveLength(1);
    expect(descriptionMetas()[0].getAttribute("content")).toBe(
      "descripción horneada en build",
    );
    existente.remove();
  });
});
