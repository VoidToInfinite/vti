import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { BrandName } from "./BrandName";
import { AMBIENT } from "@/motion/vocabulary";

/** Todas las reglas inyectadas, incluidas las anidadas dentro de `@media`
 *  y `@supports` (mismo helper que `Hero.qa.test.tsx`). */
function todasLasReglas(): string[] {
  const out: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      out.push(rule.cssText);
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) walk(anidadas);
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return out;
}

/** Reglas cuyo selector menciona alguna de las clases del elemento. */
function reglasDe(el: Element): string[] {
  const clases = Array.from(el.classList);
  return todasLasReglas().filter((texto) =>
    clases.some((cls) => texto.includes(`.${cls}`)),
  );
}

/** true si alguna regla del elemento recorta el fondo al texto. */
function tieneClipDeTexto(el: Element): boolean {
  const css = reglasDe(el).join("\n");
  return (
    css.includes("background-clip: text") ||
    css.includes("background-clip:text")
  );
}

describe("BrandName", () => {
  it("el textContent es exactamente 'VoidToInfinite' sin la prop gradientTail", () => {
    const { container } = renderWithProviders(<BrandName />);
    expect(container.textContent).toBe("VoidToInfinite");
  });

  it("el textContent es exactamente 'VoidToInfinite' con gradientTail", () => {
    const { container } = renderWithProviders(<BrandName gradientTail />);
    expect(container.textContent).toBe("VoidToInfinite");
  });

  it("sin la prop, el render es identico al actual: dos <span> planos, ningun nodo con clip de texto", () => {
    // Guarda explicita de que NO hay background-clip:text sin la prop,
    // protegiendo al Navbar (unico consumidor sin gradientTail).
    const { container } = renderWithProviders(<BrandName />);
    const spans = container.querySelectorAll("span");
    // El wrapper (ScBrandName) + los dos tramos "Void"/"ToInfinite".
    expect(spans).toHaveLength(3);
    spans.forEach((span) => {
      expect(tieneClipDeTexto(span)).toBe(false);
    });
  });

  it("con gradientTail, hay un solo nodo con clip de texto y 'Void' sigue en un span plano", () => {
    const { container } = renderWithProviders(<BrandName gradientTail />);
    const spans = Array.from(container.querySelectorAll("span"));
    const conClip = spans.filter((span) => tieneClipDeTexto(span));

    expect(conClip).toHaveLength(1);
    expect(conClip[0]).toHaveTextContent("ToInfinite");

    const spanVoid = spans.find((span) => span.textContent === "Void");
    expect(spanVoid).toBeDefined();
    expect(tieneClipDeTexto(spanVoid as Element)).toBe(false);
  });

  it("as='h1' sigue renderizando un unico <h1> con el nombre de marca completo", () => {
    const { container } = renderWithProviders(
      <BrandName
        as="h1"
        gradientTail
      />,
    );
    const encabezados = container.querySelectorAll("h1");
    expect(encabezados).toHaveLength(1);
    expect(encabezados[0].textContent).toBe("VoidToInfinite");
  });

  it("el nombre accesible es 'VoidToInfinite' SIN espacio, pese a los dos <span>", () => {
    // Candado del hallazgo de esta entrega: partir la marca en dos <span>
    // mantiene el textContent exacto, pero el algoritmo de nombre accesible
    // (AccName) concatena el texto de nodos hermanos con un ESPACIO --
    // medido con Testing Library/dom-accessibility-api en esta sesion. Sin
    // el aria-label explicito de BrandName.tsx, cualquier consumidor que
    // consulte por nombre accesible (getByRole con `name`, como
    // Navbar.test.tsx) dejaria de encontrar "VoidToInfinite" y encontraria
    // "Void ToInfinite" en su lugar.
    renderWithProviders(
      <a href="/x">
        <BrandName />
      </a>,
    );
    expect(
      screen.getByRole("link", { name: "VoidToInfinite" }),
    ).toBeInTheDocument();
  });

  /*
   * Task 19 (motion core, punto 7 del brief -- gate F2: AMBIENT con cero
   * consumidores): gradientShift pasa de un literal escrito a mano (9000ms)
   * a `${AMBIENT.floatMs}ms` (@/motion/vocabulary) -- mismo valor numérico
   * resultante (9000 === AMBIENT.floatMs), así que el CSS renderizado no
   * puede distinguir "literal" de "token" por texto; lo que SÍ prueba que es
   * el token y no una coincidencia es que `BrandName.tsx` importa y usa
   * `AMBIENT.floatMs` de verdad (`src/test/vocabulary-consumers.test.ts`).
   * Este test es la mitad "el valor renderizado es el correcto" del par.
   * Validado con el bug inyectado a propósito (ver informe de la tarea):
   * cambiando temporalmente `AMBIENT.floatMs` a 9999 en `vocabulary.ts`,
   * este test se puso en rojo (9999ms en vez de 9000ms); restaurado, volvió
   * a verde. Hero.tsx/Contact.tsx tienen su propio candado equivalente
   * sobre este mismo `gradientShift`.
   */
  it("Task 19: el degradado animado (gradientTail) renderiza AMBIENT.floatMs (9000ms)", () => {
    const { container } = renderWithProviders(<BrandName gradientTail />);
    const spans = Array.from(container.querySelectorAll("span"));
    const conClip = spans.find((span) => tieneClipDeTexto(span)) as Element;
    const css = reglasDe(conClip).join("\n");

    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain(`${AMBIENT.floatMs}ms linear infinite alternate`);
  });
});
