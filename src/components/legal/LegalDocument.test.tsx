import { describe, it, expect, beforeAll } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import {
  LegalDocument,
  splitPlaceholderMarkers,
  type LegalDocKey,
} from "./LegalDocument";

/*
 * El namespace `legal` todavía no está registrado en `src/i18n/config.ts`
 * (lo hace el hilo principal en integración, spec §5): se registra SOLO
 * dentro de este fichero de test, vía `addResourceBundle`, sin tocar
 * `config.ts`. El namespace `consent` (nombre/finalidad de la tabla de
 * almacenamiento) NO se registra a propósito: lo escribe otro flujo en
 * paralelo, y este componente tiene que tolerar la clave ausente (contrato
 * explícito del encargo) -- por eso ninguno de los tests de abajo depende de
 * lo que `tConsent` devuelva cuando la clave todavía no existe.
 */
beforeAll(() => {
  i18n.addResourceBundle("es", "legal", esLegal, true, true);
  i18n.addResourceBundle("en", "legal", enLegal, true, true);
});

const DOC_KEYS: readonly LegalDocKey[] = [
  "privacy",
  "terms",
  "accessibility",
  "legalNotice",
];

describe("LegalDocument", () => {
  it.each(DOC_KEYS)(
    "%s monta y expone el título del JSON como su único <h1>",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const headings = container.querySelectorAll("h1");
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(esLegal.Legal[docKey].title);
    },
  );

  it.each(DOC_KEYS)(
    "%s: los id de sección no se repiten dentro del documento",
    (docKey) => {
      const ids = esLegal.Legal[docKey].sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it.each(DOC_KEYS)(
    "%s: cada sección declarada en el JSON existe en el DOM con su id",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      for (const section of esLegal.Legal[docKey].sections) {
        expect(
          container.querySelector(`section[id="${section.id}"]`),
          `falta la sección ${section.id}`,
        ).not.toBeNull();
      }
    },
  );

  it.each(DOC_KEYS)(
    "%s: el índice enlaza únicamente a ids de sección que existen en el documento (un ancla rota rompería la navegación en silencio)",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const tocLinks = Array.from(
        container.querySelectorAll('nav a[href^="#"]'),
      );
      // Sonda positiva: el índice SÍ tiene enlaces -- si no, la comprobación
      // de abajo pasaría por vacuidad.
      expect(tocLinks.length).toBe(esLegal.Legal[docKey].sections.length);
      for (const link of tocLinks) {
        const targetId = (link.getAttribute("href") ?? "").slice(1);
        expect(
          container.querySelector(`[id="${targetId}"]`),
          `el índice enlaza a #${targetId}, que no existe`,
        ).not.toBeNull();
      }
    },
  );

  it("el bloque 'entity' (privacidad y aviso legal) pinta los campos POR_COMPLETAR dentro de <mark>", () => {
    renderWithProviders(<LegalDocument docKey="privacy" />);
    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of Array.from(marks)) {
      expect(mark).toHaveTextContent("POR_COMPLETAR");
    }
  });

  it("legalNotice también pinta el bloque entity con <mark>", () => {
    renderWithProviders(<LegalDocument docKey="legalNotice" />);
    expect(document.querySelectorAll("mark").length).toBeGreaterThan(0);
  });

  it("la tabla de almacenamiento tiene exactamente 3 filas (una por STORAGE_REGISTRY)", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(3);
  });

  it("la tabla de almacenamiento declara th[scope='col'] y <caption>", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const table = container.querySelector("table") as HTMLTableElement;
    expect(table.querySelector("caption")).not.toBeNull();
    const headers = Array.from(table.querySelectorAll("th"));
    expect(headers.length).toBeGreaterThan(0);
    for (const header of headers) {
      expect(header.getAttribute("scope")).toBe("col");
    }
  });

  it("el idioma inglés también monta sin errores (paridad de estructura)", async () => {
    await i18n.changeLanguage("en");
    const { container, unmount } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByText(enLegal.Legal.privacy.title)).toBeInTheDocument();
    // Desmontar ANTES de revertir el idioma: si se revirtiera con el
    // componente todavía montado, `useTranslation` dispararía una
    // actualización de estado fuera de `act()` (el aviso de React que
    // `LegalDocument.test.tsx` disparaba antes de este cambio).
    unmount();
    await i18n.changeLanguage("es");
  });
});

describe("splitPlaceholderMarkers", () => {
  it("texto sin marcador devuelve un único tramo sin marcar", () => {
    expect(splitPlaceholderMarkers("hola mundo")).toEqual([
      { text: "hola mundo", isPlaceholder: false },
    ]);
  });

  it("texto que ES solo el marcador devuelve un único tramo marcado", () => {
    expect(splitPlaceholderMarkers("POR_COMPLETAR")).toEqual([
      { text: "POR_COMPLETAR", isPlaceholder: true },
    ]);
  });

  it("marcador en medio del texto se parte en tres tramos", () => {
    expect(splitPlaceholderMarkers("antes POR_COMPLETAR despues")).toEqual([
      { text: "antes ", isPlaceholder: false },
      { text: "POR_COMPLETAR", isPlaceholder: true },
      { text: " despues", isPlaceholder: false },
    ]);
  });

  it("dos ocurrencias del marcador en el mismo texto se parten correctamente", () => {
    expect(splitPlaceholderMarkers("POR_COMPLETAR y POR_COMPLETAR")).toEqual([
      { text: "POR_COMPLETAR", isPlaceholder: true },
      { text: " y ", isPlaceholder: false },
      { text: "POR_COMPLETAR", isPlaceholder: true },
    ]);
  });

  it("texto vacío devuelve un único tramo vacío sin marcar", () => {
    expect(splitPlaceholderMarkers("")).toEqual([
      { text: "", isPlaceholder: false },
    ]);
  });
});
