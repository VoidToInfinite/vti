import { describe, it, expect, beforeAll } from "vitest";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import { STORAGE_REGISTRY } from "@/config/storage";
import { LEGAL_ENTITY } from "@/config/legal";
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

  /*
   * Estos dos candados están INVERTIDOS desde el 2026-08-13. Aseveraban que
   * los dos documentos pintaban al menos un `<mark>` y que TODO `<mark>`
   * contenía `POR_COMPLETAR` -- el mecanismo que impedía publicar datos
   * identificativos que nadie había aportado.
   *
   * Cerrada la Fase 0, el recuento correcto es CERO: un `<mark>` hoy
   * significaría que un dato volvió a estar pendiente sin que nadie lo
   * declarara. La aserción cambia de dirección, no de fuerza.
   */
  it.each(["privacy", "legalNotice"] as const)(
    "'%s' no pinta ningún <mark>: no queda dato pendiente",
    (docKey) => {
      renderWithProviders(<LegalDocument docKey={docKey} />);
      expect(document.querySelectorAll("mark")).toHaveLength(0);
      expect(document.body.textContent).not.toContain("POR_COMPLETAR");
    },
  );

  /*
   * Sonda de contenido real: sin ella, un `EntityBlock` que no pintara NADA
   * pasaría el candado de cero marcas. Se comprueban las tres clases de valor
   * que el bloque sabe distinguir (string real, `null` = no procede, y el
   * correo derivado), porque son justo las que un refactor podría colapsar en
   * una sola sin que ningún otro test lo notara.
   */
  it("el bloque 'entity' pinta el titular, el «no procede» y el correo", () => {
    renderWithProviders(<LegalDocument docKey="legalNotice" />);
    const texto = document.body.textContent ?? "";

    expect(texto).toContain(LEGAL_ENTITY.name);
    expect(texto).toContain(esLegal.Legal.common.legalForm.naturalPerson);
    expect(texto).toContain(LEGAL_ENTITY.contactEmail);
    // Los tres campos declarados `null` comparten un único texto localizado.
    expect(texto).toContain("No procede.");
  });

  /*
   * ESTE CANDADO EXISTE PORQUE EL DEFECTO OCURRIÓ (2026-08-13, verificación en
   * navegador): `legalForm` era el literal "Persona física" en `legal.ts` y el
   * documento INGLÉS lo pintaba tal cual, en español. Ningún test lo vio
   * porque todos renderizaban en español, que es justo el idioma donde una
   * fuga de español es invisible.
   *
   * La lección general, más allá de este campo: un dato que sale de la config
   * y aterriza en un documento bilingüe hay que verlo en el OTRO idioma.
   */
  it("el bloque 'entity' en inglés no filtra ni una palabra en español", async () => {
    await i18n.changeLanguage("en");
    renderWithProviders(<LegalDocument docKey="legalNotice" />);
    const texto = document.body.textContent ?? "";

    expect(texto).toContain(enLegal.Legal.common.legalForm.naturalPerson);
    expect(texto).not.toContain(esLegal.Legal.common.legalForm.naturalPerson);
    expect(texto).toContain(enLegal.Legal.common.notApplicable);
    expect(texto).not.toContain(esLegal.Legal.common.notApplicable);

    await i18n.changeLanguage("es");
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

/*
 * Candado del título de la pestaña (Ola D, 2026-08-16).
 *
 * El defecto era visible dentro de una sola página: con el inglés activo en
 * `/privacidad`, el `<h1>` decía «Privacy policy» mientras `document.title`
 * seguía siendo «Política de privacidad · VoidToInfinite». La pestaña del
 * navegador y el encabezado del documento afirmaban idiomas distintos a la vez,
 * y el título es lo que acaba en el marcador, en el historial y en lo que se
 * comparte.
 *
 * Bajo `output: "export"` la metadata de la ruta se hornea UNA vez, en
 * castellano, y el idioma lo elige el visitante después: por eso el título lo
 * sincroniza el componente, desde el MISMO árbol traducido que pinta el `<h1>`.
 * Lo que este test ata es justamente esa igualdad — que el título de la pestaña
 * y el encabezado no puedan volver a divergir.
 *
 * Validado con el bug inyectado a propósito: comentando el efecto que escribe
 * `document.title`, el caso en inglés cae en rojo; restaurado, vuelve a verde.
 * Ese efecto ya no vive en este componente — desde la crítica externa #8 es
 * `useDocumentMeta()` (`src/seo/useDocumentMeta.ts`), el mismo mecanismo que
 * usan la home y la 404 —, así que el sabotaje se aplica allí. Este candado se
 * conserva TAL CUAL a propósito: mide la propiedad observable de esta página
 * (que la pestaña y el `<h1>` no puedan afirmar idiomas distintos), que es
 * independiente de dónde viva la implementación, y por eso siguió en verde
 * durante la extracción sin tocar ni una aserción.
 */
describe("LegalDocument: el título de la pestaña sigue al idioma", () => {
  it.each(DOC_KEYS)(
    "%s: document.title usa el título traducido, en los dos idiomas",
    async (docKey) => {
      for (const lang of ["es", "en"] as const) {
        await i18n.changeLanguage(lang);
        const bundle = lang === "es" ? esLegal : enLegal;
        const esperado = (
          bundle as unknown as {
            Legal: Record<string, { title: string }>;
          }
        ).Legal[docKey].title;

        const { unmount } = renderWithProviders(
          <LegalDocument docKey={docKey} />,
        );

        expect(
          screen.getByRole("heading", { level: 1 }).textContent,
          "el encabezado no está en el idioma activo",
        ).toBe(esperado);
        expect(
          document.title,
          `la pestaña y el <h1> afirman idiomas distintos en ${lang}`,
        ).toContain(esperado);

        unmount();
      }
      await i18n.changeLanguage("es");
    },
  );
});

/*
 * Ola F de la critica #11 (integracion; barrido del agente del hero): las
 * anclas del indice movian el scroll pero no el foco -- el mismo defecto
 * que el hallazgo B2 midio en el CTA del hero. Cableadas con el helper de
 * la nav (focusNavAnchorTarget), descriptor construido del propio
 * section.id. Aqui el destino vive en el MISMO render (las ScSection con
 * id), asi que el candado observa el ciclo completo sin stubs. Validado con
 * bug inyectado (onClick retirado -> rojo; restaurado -> verde).
 */
describe("LegalDocument: el indice mueve el foco a la seccion destino (ola F)", () => {
  it.each(DOC_KEYS)(
    "%s: clic en la primera entrada del indice deja el foco en su seccion, con tabindex=-1 ganado",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const tocLink = container.querySelector(
        'a[href^="#"]',
      ) as HTMLElement | null;
      expect(tocLink, "no hay entradas de indice").not.toBeNull();
      const id = (tocLink as HTMLElement).getAttribute("href")!.slice(1);
      const target = container.querySelector(
        `[id="${id}"]`,
      ) as HTMLElement | null;
      expect(target, `no existe la seccion #${id}`).not.toBeNull();
      expect((target as HTMLElement).hasAttribute("tabindex")).toBe(false);

      fireEvent.click(tocLink as HTMLElement);

      expect(document.activeElement).toBe(target);
      expect(target).toHaveAttribute("tabindex", "-1");
    },
  );
});
