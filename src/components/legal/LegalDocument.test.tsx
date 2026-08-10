import { describe, it, expect, beforeAll } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import { STORAGE_REGISTRY } from "@/config/storage";
import {
  LegalDocument,
  splitPlaceholderMarkers,
  type LegalDocKey,
} from "./LegalDocument";

/*
 * Se recargan los dos bundles de `legal` a propósito, aunque `config.ts` ya
 * los registre: así este fichero no depende del orden en que otro test haya
 * podido tocar el singleton de i18next.
 */
beforeAll(() => {
  i18n.addResourceBundle("es", "legal", esLegal, true, true);
  i18n.addResourceBundle("en", "legal", enLegal, true, true);
});

const DOC_KEYS: readonly LegalDocKey[] = ["privacy", "legalNotice"];

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

  /*
   * Task 2 (skip link), review fix round 1 — hueco de evidencia señalado:
   * `ScMain` gana `id="main" tabIndex={-1}` como destino real del skip
   * link en esta ruta (ver LegalDocument.tsx). Sin este test, la única
   * prueba de que las rutas legales tienen el landmark era una pasada de
   * navegador que no cubría cada ruta por separado.
   */
  it.each(DOC_KEYS)(
    "%s: el <main> tiene id='main' y tabIndex=-1 (destino del skip link)",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const main = container.querySelector("main");
      expect(main).not.toBeNull();
      expect(main).toHaveAttribute("id", "main");
      expect(main).toHaveAttribute("tabindex", "-1");
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

  it("la tabla de almacenamiento tiene una fila por entrada de STORAGE_REGISTRY", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(
      STORAGE_REGISTRY.length,
    );
  });

  /*
   * El nombre y la finalidad de cada entrada se mudaron del namespace
   * `consent` (retirado el 2026-08-08) a `Legal.common.storage.<id>`. Si esa
   * mudanza se hubiera hecho a medias, i18next NO lanza: devuelve la propia
   * ruta de clave como texto, así que la tabla se pintaría con
   * "Legal.common.storage.vti-theme.name" en la celda y ningún test de
   * estructura lo vería. Esto es lo que lo caza.
   */
  it("cada fila de la tabla pinta el nombre y la finalidad traducidos, no la ruta de clave", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const filas = Array.from(
      container.querySelectorAll("table tbody tr"),
    ) as HTMLTableRowElement[];

    expect(filas).toHaveLength(STORAGE_REGISTRY.length);
    filas.forEach((fila, indice) => {
      const entrada = STORAGE_REGISTRY[indice];
      const copia = esLegal.Legal.common.storage[
        entrada.id as keyof typeof esLegal.Legal.common.storage
      ] as { name: string; purpose: string };

      expect(fila.cells[0]).toHaveTextContent(copia.name);
      expect(fila.cells[1]).toHaveTextContent(copia.purpose);
      expect(fila.textContent).not.toContain("Legal.common.storage");
    });
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
