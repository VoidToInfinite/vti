import { describe, it, expect, beforeAll } from "vitest";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esCommon from "@/i18n/locales/es/common.json";
import enCommon from "@/i18n/locales/en/common.json";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import { I18nProvider } from "@/i18n/I18nProvider";
import { AEPD_HOST } from "./legalAutoLinks";
import { STORAGE_REGISTRY } from "@/config/storage";
import { LEGAL_ENTITY } from "@/config/legal";
import { routePath } from "@/config/site";
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

/** Los párrafos (`kind: "p"`) de una sección, leídos del JSON tal cual: el
 *  valor esperado de los candados de contenido sale del documento, nunca de
 *  lo que el renderer haya pintado. */
function parrafosDe(
  bundle: unknown,
  docKey: LegalDocKey,
  sectionId: string,
): string[] {
  const arbol = (
    bundle as {
      Legal: Record<
        string,
        { sections: Array<{ id: string; blocks: Array<{ text?: string }> }> }
      >;
    }
  ).Legal;
  const seccion = arbol[docKey].sections.find(
    (candidata) => candidata.id === sectionId,
  );
  return (seccion?.blocks ?? []).flatMap((bloque) =>
    typeof bloque.text === "string" ? [bloque.text] : [],
  );
}

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
    const { unmount } = renderWithProviders(
      <LegalDocument docKey="legalNotice" />,
    );
    const texto = document.body.textContent ?? "";

    expect(texto).toContain(enLegal.Legal.common.legalForm.naturalPerson);
    expect(texto).not.toContain(esLegal.Legal.common.legalForm.naturalPerson);
    expect(texto).toContain(enLegal.Legal.common.notApplicable);
    expect(texto).not.toContain(esLegal.Legal.common.notApplicable);

    /* Desmontar ANTES de revertir el idioma, por el mismo motivo ya
       documentado en «el idioma inglés también monta sin errores» más abajo:
       con el componente montado, `useTranslation` dispara una actualización
       de estado fuera de `act()`. La crítica #13 (T1) lo hizo visible por
       partida doble — `AutoLink` añade su propia suscripción al namespace
       `common` —, así que se cierra aquí igual que allí. */
    unmount();
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

  /*
   * LA DURACIÓN DE UNA ENTRADA DE SESIÓN NO PUEDE ANUNCIARSE COMO PERSISTENTE
   * (2026-09-06, verificación de la ola S).
   *
   * El defecto medido en el HTML horneado de las dos rutas: la fila de
   * `vti-reading-position` pintaba Tipo «sessionStorage» y Duración
   * «Persistente hasta que la borres», mientras su propia celda de finalidad
   * decía que vive solo en esa pestaña y se borra sola al cerrarla. Causa
   * raíz: `durationLabelFor` decidía el rótulo mirando SOLO `durationDays`,
   * que es `null` en las dos entradas del registro.
   *
   * Este candado NO espeja el valor del código: ata la CONDICIÓN que el
   * defecto incumplía —ninguna fila de `sessionStorage` puede llevar el
   * rótulo de lo persistente— contra los textos traducidos reales, y en el
   * mismo caso comprueba que la entrada que SÍ sobrevive al cierre conserva
   * el suyo, para que nadie lo «arregle» poniendo el rótulo de sesión a
   * todas. Las dos listas se exigen no vacías: sin eso el caso pasaría por
   * vacuidad el día que alguien vaciara el registro.
   *
   * Validado con bug inyectado (`durationLabelFor` devolviendo
   * `storageLabels.persistent` para todo `durationDays === null`, que es
   * exactamente el código anterior):
   *   AssertionError: la fila de sessionStorage anuncia el rótulo de lo
   *   persistente: expected 'Persistente hasta que la borres' not to contain
   *   'Persistente hasta que la borres'
   */
  it.each([["es", esLegal] as const, ["en", enLegal] as const])(
    "%s: la duración de una entrada de sessionStorage no dice «persistente»",
    (locale, bundle) => {
      const etiquetas = bundle.Legal.common.storageTable;
      const { container } = renderWithProviders(
        <I18nProvider locale={locale}>
          <LegalDocument docKey="privacy" />
        </I18nProvider>,
      );
      const filas = Array.from(
        container.querySelectorAll("table tbody tr"),
      ) as HTMLTableRowElement[];

      const deSesion = STORAGE_REGISTRY.flatMap((entrada, indice) =>
        entrada.kind === "sessionStorage" ? [filas[indice]] : [],
      );
      const queSobreviven = STORAGE_REGISTRY.flatMap((entrada, indice) =>
        entrada.kind !== "sessionStorage" && entrada.durationDays === null
          ? [filas[indice]]
          : [],
      );
      expect(deSesion.length).toBeGreaterThan(0);
      expect(queSobreviven.length).toBeGreaterThan(0);

      for (const fila of deSesion) {
        expect(
          fila.cells[3].textContent,
          "la fila de sessionStorage anuncia el rótulo de lo persistente",
        ).not.toContain(etiquetas.persistent);
        expect(fila.cells[3]).toHaveTextContent(etiquetas.session);
      }
      for (const fila of queSobreviven) {
        expect(fila.cells[3]).toHaveTextContent(etiquetas.persistent);
      }
    },
  );

  /*
   * El nombre técnico de la tecnología («localStorage», «sessionStorage») es
   * un identificador y no tiene por dónde partirse. Medido por el candado de
   * superficies el 2026-09-06 con la raíz a 32 px: en una celda de 91 px,
   * «sessionStorage» se partía en cuatro líneas de 3,5 caracteres. La regla
   * que lo impide vive en `ScStorageKind`; jsdom no maqueta, así que se lee
   * del CSSOM. Validado con bug inyectado (retirando `white-space: nowrap`
   * de `ScStorageKind`):
   *   AssertionError: la regla de ScStorageKind no declara white-space:
   *   nowrap: expected [ '' ] to include 'nowrap'
   */
  it("la celda del tipo de almacenamiento no parte el nombre técnico letra a letra", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const celda = container.querySelector("table tbody tr td:nth-child(3) > *");
    expect(celda).not.toBeNull();
    const clases = Array.from(celda?.classList ?? []);
    expect(clases.length).toBeGreaterThan(0);
    const reglas = Array.from(document.styleSheets)
      .flatMap((hoja) => Array.from(hoja.cssRules))
      .filter(
        (regla): regla is CSSStyleRule =>
          regla instanceof CSSStyleRule &&
          clases.some((clase) => regla.selectorText.includes(`.${clase}`)),
      )
      .map((regla) => regla.style.getPropertyValue("white-space"));
    expect(
      reglas,
      "la regla de ScStorageKind no declara white-space: nowrap",
    ).toContain("nowrap");
  });

  /*
   * El párrafo que abre la sección de almacenamiento nombra la tecnología
   * con la que se guarda cada entrada. Hasta la ola S decía solo
   * «localStorage», y la ola añadió la primera entrada de `sessionStorage`
   * (la posición de lectura): un registro con un tipo nuevo y un párrafo que
   * no lo nombra es la clase de divergencia silenciosa que este candado
   * existe para cazar, en los dos idiomas. Validado con bug inyectado
   * (quitando «sessionStorage» del párrafo castellano):
   *   AssertionError: expected 'Esta es la lista completa y única de …' to
   *   contain 'sessionStorage'
   */
  it("el párrafo de la sección de almacenamiento nombra cada tecnología del registro, en los dos idiomas", () => {
    const tipos = Array.from(new Set(STORAGE_REGISTRY.map((e) => e.kind)));
    expect(tipos.length).toBeGreaterThan(1);
    for (const legal of [esLegal, enLegal]) {
      const secciones = legal.Legal.privacy.sections as Array<{
        blocks: Array<{ kind: string; text?: string }>;
      }>;
      const seccion = secciones.find((s) =>
        s.blocks.some((b) => b.kind === "storage"),
      );
      expect(seccion).toBeDefined();
      const parrafo = seccion?.blocks.find((b) => b.kind === "p")?.text ?? "";
      for (const tipo of tipos) expect(parrafo).toContain(tipo);
    }
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

  /*
   * CRÍTICA #12, P0 (resto legal): el «volver al inicio» con `href="/"` fijo
   * era una de las dos salidas de las legales inglesas que expulsaban al
   * castellano (la otra era el logotipo de `LegalHeader`, la cabecera propia
   * que estas páginas montaban hasta el 2026-09-03; desde la reversión de D20
   * ese logotipo es el del `Navbar` y su candado vive en `Navbar.test.tsx`).
   * El idioma se lee del
   * i18n del ÁRBOL (`useTranslation`, que en `/en/*` ve el `cloneInstance`
   * del provider), no de la instancia de módulo — por eso el candado monta
   * `I18nProvider locale="en"` reproduciendo `app/en/layout.tsx` (patrón de
   * `Navbar.test.tsx`, ola H). Complemento castellano incluido: sin él, un
   * enlace clavado en `/en` también pasaría el test inglés.
   */
  it.each(DOC_KEYS)(
    "%s: el «volver al inicio» conserva el idioma (en → /en, es → /)",
    (docKey) => {
      const en = renderWithProviders(
        <I18nProvider locale="en">
          <LegalDocument docKey={docKey} />
        </I18nProvider>,
      );
      expect(
        en.getByRole("link", { name: enLegal.Legal.common.backToHome }),
      ).toHaveAttribute("href", routePath("home", "en"));
      en.unmount();

      const es = renderWithProviders(<LegalDocument docKey={docKey} />);
      expect(
        es.getByRole("link", { name: esLegal.Legal.common.backToHome }),
      ).toHaveAttribute("href", "/");
    },
  );

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
 * LA SEMÁNTICA DE LA SUPERFICIE, ATADA POR PRIMERA VEZ (frente Q-2,
 * 2026-09-04).
 *
 * POR QUÉ ESTE BLOQUE EXISTE. Un evaluador técnico declaró el hueco con
 * nombre: «todo lo anterior es sobre / (home); no se repitió el protocolo en
 * /privacidad, /aviso-legal ni la 404». Estas dos rutas nunca habían pasado por
 * un recorrido de teclado, una comprobación de jerarquía de encabezados, ni una
 * de referencias `aria-*`. La ola M, además, las cambió a fondo: montan la
 * navegación completa del sitio, así que el documento aporta AHORA un segundo
 * landmark de navegación que antes no competía con nada.
 *
 * QUÉ SE MIDIÓ, y por qué los candados van igual aunque saliera limpio. En
 * Chrome sobre el build de `0226846` servido, las cuatro rutas legales × dos
 * idiomas: 29 paradas de teclado en `/privacidad` con anillo de foco visible en
 * las 29 y sin una sola trampa; un `<h1>`; cero saltos de nivel; cero ids
 * duplicados; cero referencias `aria-*` colgantes; y los dos landmarks de
 * navegación con nombre y con nombres DISTINTOS («Navegación del sitio» y
 * «Índice» / «Site navigation» y «Contents»). Un resultado limpio sin candado
 * es un resultado que mañana no lo será.
 *
 * TODO SE DERIVA DEL MODELO, nunca de una lista tecleada (regla 39): los
 * niveles esperados salen del árbol de secciones del propio `legal.json`, y el
 * nombre del índice de su clave i18n. Cada caso lleva su sonda positiva porque
 * el repo ya tuvo dos candados que pasaban por vacuidad y los dos se
 * descubrieron tarde.
 */
describe("LegalDocument: la semántica de la superficie legal", () => {
  const BUNDLES = { es: esLegal, en: enLegal } as const;

  it.each(DOC_KEYS)(
    "%s: la jerarquía de encabezados no salta ningún nivel — un h1 y una sección por h2",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const niveles = Array.from(
        container.querySelectorAll("h1,h2,h3,h4,h5,h6"),
      ).map((h) => Number(h.tagName[1]));

      // Sonda positiva: sin ella, un documento sin un solo encabezado pasaría
      // el bucle de abajo por vacuidad.
      expect(niveles.length).toBeGreaterThan(1);
      expect(niveles[0]).toBe(1);
      expect(niveles.filter((n) => n === 1)).toHaveLength(1);

      /* El recuento de h2 sale del árbol del documento, no de un número: una
         sección del JSON = un h2 en el DOM. */
      expect(niveles.filter((n) => n === 2)).toHaveLength(
        esLegal.Legal[docKey].sections.length,
      );

      niveles.forEach((nivel, indice) => {
        if (indice === 0) return;
        expect(
          nivel,
          `salto de nivel h${niveles[indice - 1]} -> h${nivel} en la posición ${indice}`,
        ).toBeLessThanOrEqual(niveles[indice - 1] + 1);
      });
    },
  );

  it.each(DOC_KEYS)(
    "%s: ningún atributo aria-* del documento apunta a un id que no existe",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const ATRIBUTOS = [
        "aria-labelledby",
        "aria-describedby",
        "aria-controls",
        "aria-owns",
        "aria-details",
      ] as const;

      const referencias = ATRIBUTOS.flatMap((attr) =>
        Array.from(container.querySelectorAll(`[${attr}]`)).flatMap((el) =>
          (el.getAttribute(attr) ?? "")
            .split(/\s+/)
            .filter(Boolean)
            .map((ref) => ({ attr, ref })),
        ),
      );

      for (const { attr, ref } of referencias) {
        expect(
          container.querySelector(`[id="${ref}"]`),
          `${attr} apunta a #${ref}, que no existe en el documento`,
        ).not.toBeNull();
      }
    },
  );

  /*
   * El landmark del índice, con NOMBRE y con nombre PROPIO. Desde la ola M la
   * página monta dos `<nav>`: el del sitio (rotulado `Common.Nav.landmark`,
   * candado en `Navbar.tsx`) y este. Una lista de landmarks con dos entradas
   * que se llaman igual —o con una sin nombre— no dice cuál es cuál, que es
   * exactamente el motivo por el que el `Navbar` estrenó su propio rótulo.
   */
  it.each(DOC_KEYS)(
    "%s: el índice es un landmark de navegación rotulado con su clave i18n, distinto del rótulo del sitio",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const indice = container.querySelector("nav");
      expect(indice).not.toBeNull();
      expect(indice).toHaveAttribute(
        "aria-label",
        esLegal.Legal.common.tocLabel,
      );
      expect(esLegal.Legal.common.tocLabel).not.toBe(
        esCommon.Common.Nav.landmark,
      );
    },
  );

  /*
   * EL ÍNDICE, EN LOS DOS IDIOMAS. El candado que ya existía («el índice enlaza
   * únicamente a ids que existen») corre solo en castellano, que es justo el
   * idioma donde un desajuste de la rama inglesa es invisible — la misma
   * lección que pagó el bloque `entity` el 2026-08-13. Los `id` de sección son
   * los MISMOS en los dos árboles (los compara `locales.test.ts` por ruta
   * recursiva), así que lo que esto caza es que el renderer inglés pinte
   * secciones o enlaces que no se correspondan.
   */
  it.each(DOC_KEYS)(
    "%s: en inglés el índice sigue teniendo un enlace vivo por sección del documento",
    async (docKey) => {
      await i18n.changeLanguage("en");
      const { container, unmount } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );

      const secciones = (
        BUNDLES.en as unknown as {
          Legal: Record<string, { sections: Array<{ id: string }> }>;
        }
      ).Legal[docKey].sections;
      expect(secciones.length).toBeGreaterThan(0);

      const enlaces = Array.from(
        container.querySelectorAll('nav a[href^="#"]'),
      );
      expect(enlaces).toHaveLength(secciones.length);
      for (const enlace of enlaces) {
        const destino = (enlace.getAttribute("href") ?? "").slice(1);
        expect(
          container.querySelector(`section[id="${destino}"]`),
          `el índice inglés enlaza a #${destino}, que no es una sección del documento`,
        ).not.toBeNull();
      }

      unmount();
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
/*
 * CRÍTICA #13, T1: lo accionable no lo parecía.
 *
 * Medido por el integrador en navegador sobre el build servido, en las dos
 * rutas legales y en sus gemelas inglesas: `hello@voidtoinfinite.com` aparecía
 * en el CUERPO de `/aviso-legal` y `/privacidad` como texto plano
 * (`main a[href^="mailto:"]` = 0) mientras el PIE de esas mismas páginas sí lo
 * llevaba enlazado (= 1) y la home también; y `www.aepd.es` — la autoridad
 * ante la que la propia política te dice que puedes reclamar — tampoco era
 * enlace (`a[href*=aepd]` = 0).
 *
 * Los selectores de estos candados son LOS MISMOS con los que se midió el
 * defecto, a propósito: lo que se ata es la propiedad observable que estaba en
 * cero, no la implementación que hoy la entrega.
 *
 * Validados con el bug inyectado a propósito (ver el informe de la tarea):
 * neutralizando el segundo troceo de `MarkedText` (`splitAutoLinks`) los
 * candados de enlace caen en rojo; restaurado, vuelven a verde.
 */
describe("LegalDocument: los destinos del cuerpo son enlaces (crítica #13, T1)", () => {
  it.each(DOC_KEYS)(
    "%s: el correo del CUERPO es un mailto: real, no texto plano",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const enlaces = Array.from(
        container.querySelectorAll<HTMLAnchorElement>(
          'main a[href^="mailto:"]',
        ),
      );

      expect(
        enlaces.length,
        "el correo del cuerpo sigue siendo texto plano",
      ).toBeGreaterThan(0);

      for (const enlace of enlaces) {
        /* El destino se comprueba contra el texto VISIBLE del propio enlace:
           si lo que se lee y adónde lleva divergieran, esto lo caza sin
           depender de ninguna constante del código bajo prueba. */
        expect(enlace.getAttribute("href")).toBe(
          `mailto:${enlace.textContent}`,
        );
        /* Un mailto: no abre pestaña, delega en la aplicación de correo: ni
           target ni aviso de cambio de contexto (mismo criterio que el pie). */
        expect(enlace.hasAttribute("target")).toBe(false);
        expect(enlace.textContent).not.toContain(esCommon.Common.Nav.newTab);
      }
    },
  );

  /*
   * La ficha identificativa es la procedencia que NO sale del JSON: su correo
   * viene de `LEGAL_ENTITY.contactEmail` (`src/config/legal.ts`). Es la única
   * aparición del correo en `/aviso-legal`, así que sin este caso la página
   * entera podría volver a quedarse sin enlace con el candado de arriba en
   * verde por lo que pintara `/privacidad`.
   */
  it.each(DOC_KEYS)(
    "%s: la ficha 'entity' enlaza su correo de contacto",
    (docKey) => {
      const { container } = renderWithProviders(
        <LegalDocument docKey={docKey} />,
      );
      const enlace = container.querySelector<HTMLAnchorElement>(
        'dd a[href^="mailto:"]',
      );

      expect(
        enlace,
        "el correo de la ficha sigue siendo texto plano",
      ).not.toBeNull();
      expect(enlace?.textContent).toBe(LEGAL_ENTITY.contactEmail);
    },
  );

  it("privacidad: la AEPD es un enlace externo con el rel, el target y el aviso del repo", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const enlaces = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a[href*="aepd"]'),
    );

    expect(
      enlaces,
      "la autoridad ante la que reclamar no es enlace",
    ).toHaveLength(1);

    const [enlace] = enlaces;
    /* El primer hijo es el texto visible; el segundo es el aviso oculto. */
    expect(enlace.firstChild?.textContent).toBe(AEPD_HOST);
    expect(enlace.getAttribute("href")).toBe(`https://${AEPD_HOST}`);
    expect(enlace).toHaveAttribute("target", "_blank");
    expect(enlace).toHaveAttribute("rel", "noopener noreferrer");
    expect(enlace).toHaveAccessibleName(
      new RegExp(`${esCommon.Common.Nav.newTab}$`),
    );
  });

  /*
   * EL ENCARGO PROHÍBE TOCAR EL CONTENIDO LEGAL: solo su marcado. Este es el
   * candado de esa promesa — el texto que el visitante lee tiene que seguir
   * siendo, carácter a carácter, el del JSON. Se asevera con `toBe` sobre
   * `textContent`, no con `toHaveTextContent` (lección 2026-08-11: compara por
   * substring, así que un párrafo con una palabra de más pasaría igual).
   */
  it("privacidad: el párrafo del correo conserva EXACTAMENTE el texto del JSON", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const esperado = parrafosDe(esLegal, "privacy", "derechos").find((texto) =>
      texto.includes("@"),
    );
    expect(
      esperado,
      "el JSON ya no trae el correo en 'derechos'",
    ).toBeDefined();

    const parrafo = Array.from(
      container.querySelectorAll("section#derechos p"),
    ).find((candidato) => candidato.querySelector('a[href^="mailto:"]'));

    expect(parrafo?.textContent).toBe(esperado);
  });

  it("privacidad: el párrafo de la AEPD solo añade el aviso oculto, ni una palabra visible", () => {
    const { container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const original = parrafosDe(esLegal, "privacy", "reclamacion")[0];
    const parrafo = container.querySelector("section#reclamacion p");

    expect(parrafo?.textContent).toBe(
      original.replace(AEPD_HOST, `${AEPD_HOST} ${esCommon.Common.Nav.newTab}`),
    );
  });

  /*
   * PARIDAD es/en. El defecto se midió también en las rutas inglesas, y el
   * mecanismo busca literales que viven en los dos árboles de copia: si una
   * traducción escribiera el correo o la sede de otra forma, el enlace
   * desaparecería solo en ese idioma. Se monta `I18nProvider locale="en"`
   * reproduciendo `app/en/layout.tsx`, el mismo patrón que el candado del
   * «volver al inicio» de este fichero.
   */
  it("inglés: el correo y la AEPD también son enlaces, con el aviso en inglés", () => {
    const { container } = renderWithProviders(
      <I18nProvider locale="en">
        <LegalDocument docKey="privacy" />
      </I18nProvider>,
    );

    expect(
      container.querySelectorAll('main a[href^="mailto:"]').length,
    ).toBeGreaterThan(0);

    const aepd = container.querySelector<HTMLAnchorElement>('a[href*="aepd"]');
    expect(aepd, "la AEPD no es enlace en la ruta inglesa").not.toBeNull();
    expect(aepd).toHaveAccessibleName(
      new RegExp(`${enCommon.Common.Nav.newTab}$`),
    );

    const original = parrafosDe(enLegal, "privacy", "reclamacion")[0];
    expect(container.querySelector("section#reclamacion p")?.textContent).toBe(
      original.replace(AEPD_HOST, `${AEPD_HOST} ${enCommon.Common.Nav.newTab}`),
    );
  });
});

/*
 * CRÍTICA #13, T2: la tabla scrolleable no se anunciaba.
 *
 * Medido: la tabla de almacenamiento ocupa ~476 px dentro de un contenedor
 * con `overflow-x: auto` de 342 px a móvil, así que su última columna solo se
 * alcanza desplazando. Funcionaba con ratón y con gesto, pero el contenedor no
 * tenía `tabindex` ni `role="region"` con nombre accesible: por teclado
 * dependía de que el navegador hiciera focusables los scrollers por su cuenta
 * (Chrome moderno sí; no es garantía), y para un lector de pantalla no había
 * nada que anunciara la región.
 *
 * Se consulta por ROL y por NOMBRE (`getByRole("region", { name })`), no por
 * el atributo suelto: así el candado mide lo que de verdad importa — que el
 * árbol de accesibilidad expone una región con ese nombre —, que es
 * exactamente lo que un `role="region"` sin nombre NO hace.
 *
 * Validados con el bug inyectado a propósito (ver el informe de la tarea):
 * retirando `role`/`aria-label` la consulta por rol falla, y retirando
 * `tabIndex` cae el caso del punto de tabulación; restaurados, vuelven a
 * verde.
 */
describe("LegalDocument: el scroller de la tabla se anuncia y se alcanza (crítica #13, T2)", () => {
  it("el contenedor de la tabla es una región con nombre accesible y punto de tabulación propio", () => {
    const { getByRole, container } = renderWithProviders(
      <LegalDocument docKey="privacy" />,
    );
    const region = getByRole("region", {
      name: esLegal.Legal.common.storageTable.regionLabel,
    });

    expect(region).toHaveAttribute("tabindex", "0");
    /* Es el contenedor de scroll, no otro nodo cualquiera con ese nombre. */
    expect(region.contains(container.querySelector("table"))).toBe(true);
  });

  it("inglés: la región conserva el nombre accesible, traducido", () => {
    const { getByRole } = renderWithProviders(
      <I18nProvider locale="en">
        <LegalDocument docKey="privacy" />
      </I18nProvider>,
    );
    const region = getByRole("region", {
      name: enLegal.Legal.common.storageTable.regionLabel,
    });

    expect(region).toHaveAttribute("tabindex", "0");
  });
});

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
