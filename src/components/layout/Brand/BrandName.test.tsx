import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { basicLightTheme } from "@/theme/themes";
import {
  BrandName,
  heroGradientStops,
  HERO_GRADIENT_SIZE_X_PERCENT,
} from "./BrandName";
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

/*
 * Crítica externa #18 (P1, 2026-09-04) -- EL ESLABÓN entre el candado de
 * contraste y lo que de verdad se pinta.
 *
 * `BrandName.contrast.test.ts` mide el degradado del título llamando a
 * `heroGradientStops`, no leyendo CSS. Eso es lo correcto (medir colores
 * exige aritmética, no cadenas), pero por sí solo deja un hueco: si alguien
 * volviera a escribir las paradas a mano dentro del bloque `css`, la función
 * quedaría huérfana y el candado de contraste seguiría en verde midiendo un
 * degradado que ya no existe en pantalla. Este test cierra ese hueco: afirma
 * que el `background-image` REALMENTE inyectado por styled-components lleva,
 * en orden, exactamente las paradas que declara `heroGradientStops`, y que
 * el `background-size` sale de `HERO_GRADIENT_SIZE_X_PERCENT`.
 *
 * Se mide en tema CLARO porque es el que `renderWithProviders` monta por
 * defecto, y es además la rama donde vivía el defecto.
 *
 * Validado con el bug inyectado que de verdad corresponde a lo que este test
 * protege: reescribir las cuatro paradas A MANO dentro del bloque `css`
 * (dejando `heroGradientStops` huérfano, que es la regresión temida) lo pone
 * en rojo -- "falta la parada 65% (oklch(0.53 0.212 311.928)) en el
 * background-image inyectado" --; restaurado, vuelve a verde. Cambiar el
 * VALOR dentro de `heroGradientStops` NO lo pone en rojo, y es correcto que
 * no lo haga: este test afirma la coherencia entre la función y el CSS, no
 * que el color elegido sea legible -- de eso responde
 * `BrandName.contrast.test.ts`.
 */
describe("Crítica externa #18 -- el degradado inyectado son las paradas de heroGradientStops", () => {
  it("el background-image del tramo recortado lleva las paradas de heroGradientStops, en orden y con su posición", () => {
    const { container } = renderWithProviders(<BrandName gradientTail />);
    const spans = Array.from(container.querySelectorAll("span"));
    const conClip = spans.find((span) => tieneClipDeTexto(span)) as Element;
    // Espacios normalizados: el round-trip por `cssText` de jsdom no
    // garantiza el mismo espaciado que escribió styled-components.
    const css = reglasDe(conClip).join("\n").replace(/\s+/g, " ");

    for (const stop of heroGradientStops(basicLightTheme)) {
      expect(
        css,
        `falta la parada ${stop.position}% (${stop.color}) en el background-image inyectado`,
      ).toContain(`${stop.color} ${stop.position}%`);
    }

    expect(css).toContain(
      `background-size: ${HERO_GRADIENT_SIZE_X_PERCENT}% 100%`,
    );
  });
});
