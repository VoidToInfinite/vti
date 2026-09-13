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
 *
 * AMPLIADO EL 2026-08-17 con el bloque de re-afirmación, y validado con TRES
 * sabotajes distintos sobre `useDocumentMeta.ts` (10/10 en verde antes y
 * después de restaurar cada uno):
 *   A. quitando la llamada a `observer.observe(...)` caen los 3 casos de
 *      re-afirmación (3 failed | 7 passed) y el de limpieza sigue en verde,
 *      que es lo correcto: sin observador no hay nada que desconectar;
 *   B. quitando SOLO `characterData: true` de las opciones del observador cae
 *      el caso del canal de React (nodo de texto) y NO el del setter de
 *      `document.title` (2 failed | 8 passed) -- la prueba de que el candado
 *      mide el canal que falló de verdad en producción y no uno parecido;
 *   C. quitando la función de limpieza entera cae SOLO el caso del desmontaje
 *      (1 failed | 9 passed).
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

/**
 * Reproduce el pisado externo EXACTAMENTE por el canal medido en producción:
 * no el setter de `document.title` (que este hook usa) sino la reescritura del
 * nodo de texto de dentro del `<title>`, que es lo que hace React al commitear
 * la metadata horneada de la ruta. Si el candado se escribiera con el setter,
 * pasaría en verde con un observador que solo mirase `childList` — es decir,
 * mediría un mecanismo distinto del que falló de verdad.
 */
function pisarTituloComoReact(texto: string): void {
  const titleEl = document.head.querySelector("title");
  const textNode = titleEl?.firstChild ?? null;
  if (textNode === null) {
    throw new Error(
      "no hay <title> con nodo de texto que pisar: el montaje no escribió el título",
    );
  }
  textNode.nodeValue = texto;
}

/**
 * Las notificaciones de `MutationObserver` se entregan como microtareas; un
 * salto por el bucle de eventos garantiza que ya corrieron. Se usa también en
 * las aserciones NEGATIVAS (tras desmontar), donde `waitFor` no sirve: allí lo
 * que hay que demostrar es que NO pasa nada.
 */
async function entregarMutaciones(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
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

/*
 * EL CAMINO QUE FALLÓ EN PRODUCCIÓN (regresión del 2026-08-17).
 *
 * En una carga directa, React commitea el `<title>` de la metadata horneada
 * (castellano) 3,2 ms DESPUÉS de que este hook escribiera el traducido, y como
 * su dependencia ya no cambia, el efecto no se re-ejecuta: la pestaña se queda
 * en el idioma equivocado para siempre. La traza completa está en el docblock
 * de `useDocumentMeta.ts`.
 *
 * Lo que estos casos atan es la propiedad que arregla eso: que el valor de
 * este hook GANE aunque alguien de fuera escriba después.
 */
describe("useDocumentMeta: el título traducido gana a un pisado externo", () => {
  it("revierte el pisado que reescribe el nodo de texto del <title> (el canal de React)", async () => {
    render(<Probe title="Legal notice" />);
    const esperado = `Legal notice${TITLE_SEPARATOR}${SITE.name}`;
    expect(document.title).toBe(esperado);

    pisarTituloComoReact("Aviso legal · VoidToInfinite");
    expect(document.title).toBe("Aviso legal · VoidToInfinite");

    await entregarMutaciones();
    expect(document.title).toBe(esperado);
  });

  it("revierte también un pisado por el setter de document.title", async () => {
    render(<Probe title="Page not found" />);
    const esperado = `Page not found${TITLE_SEPARATOR}${SITE.name}`;

    document.title = "Página no encontrada · VoidToInfinite";
    await entregarMutaciones();

    expect(document.title).toBe(esperado);
  });

  it("re-afirma cada vez, no solo la primera (el pisado puede repetirse)", async () => {
    render(<Probe title="Legal notice" />);
    const esperado = `Legal notice${TITLE_SEPARATOR}${SITE.name}`;

    for (const intruso of ["uno", "dos", "tres"]) {
      pisarTituloComoReact(intruso);
      await entregarMutaciones();
      expect(document.title).toBe(esperado);
    }
  });

  it("deja de vigilar al desmontar: sin candado de limpieza el observador seguiría vivo", async () => {
    render(<Probe title="Legal notice" />);
    expect(document.title).toBe(`Legal notice${TITLE_SEPARATOR}${SITE.name}`);

    cleanup();

    document.title = "Otra página · VoidToInfinite";
    await entregarMutaciones();

    expect(document.title).toBe("Otra página · VoidToInfinite");
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
