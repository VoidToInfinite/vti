import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { BackToTop, BACK_TO_TOP_THRESHOLD_SCREENS } from "./BackToTop";

/** Mismo patrón que Button.test.tsx/Navbar.test.tsx: lee el CSSOM real
 *  inyectado por styled-components -- jsdom no resuelve `env()` (no hay
 *  hardware que consultar), así que la única forma de atar la declaración es
 *  leer el TEXTO de la regla, nunca `getComputedStyle`. */
function allCssRules(): string[] {
  const reglas: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      reglas.push(rule.cssText);
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
  return reglas;
}

function reglasDe(el: HTMLElement): string[] {
  const reglas = allCssRules();
  const clases = Array.from(el.classList).filter((c) =>
    reglas.some((r) => r.includes(c)),
  );
  expect(
    clases.length,
    "no se encontró ninguna clase inyectada del elemento",
  ).toBeGreaterThan(0);
  return reglas.filter((r) => clases.some((c) => r.includes(c)));
}

function setViewport(innerHeight: number, scrollY: number): void {
  Object.defineProperty(window, "innerHeight", {
    value: innerHeight,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    writable: true,
    configurable: true,
  });
}

function stubMatchMedia(reducedMatches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/*
 * `document.getElementById("main")` (BackToTop.tsx, manejo de foco) apunta
 * al MISMO landmark que consume SkipLink -- ver el docblock de ambos
 * componentes. Se monta un <main> real junto al botón, mismo contrato que
 * app/page.tsx/LegalDocument.tsx/NotFoundContent.tsx.
 */
function renderWithMain(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <>
      <main
        id="main"
        tabIndex={-1}
      />
      <BackToTop />
    </>,
  );
}

beforeEach(() => {
  setViewport(800, 0);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setViewport(800, 0);
});

describe("BackToTop", () => {
  it("no se monta por debajo del umbral (scrollY = 0)", () => {
    renderWithMain();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /*
   * Brief (Task 2, punto 2): "aparece tras ~2 pantallas de scroll". Validado
   * con bug inyectado (ver informe de la tarea): cambiando temporalmente
   * BACK_TO_TOP_THRESHOLD_SCREENS a un número mucho mayor (p. ej. 100) en
   * BackToTop.tsx, este test se pone en rojo (el botón no aparece con el
   * mismo scroll simulado); restaurado a 2, vuelve a verde.
   */
  it("aparece tras superar el umbral de ~2 pantallas de scroll (mock de scroll)", () => {
    renderWithMain();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Justo por debajo del umbral: sigue sin aparecer.
    act(() => {
      setViewport(800, 800 * BACK_TO_TOP_THRESHOLD_SCREENS - 1);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Por encima del umbral: aparece.
    act(() => {
      setViewport(800, 800 * BACK_TO_TOP_THRESHOLD_SCREENS + 1);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("button")).toBeInTheDocument();

    // Vuelve a subir por debajo del umbral: desaparece otra vez.
    act(() => {
      setViewport(800, 0);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("el umbral se ajusta al alto REAL del viewport, no a un pixel fijo", () => {
    // Viewport alto (movil): el mismo scrollY absoluto que antes activaba el
    // boton ya NO alcanza el umbral, porque el umbral tambien crecio.
    setViewport(1600, 3100); // 2 * 1600 = 3200 > 3100
    renderWithMain();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /*
   * El lado vertical se lee en `min-height` desde el frente F (2026-09-05):
   * `Button.sizeStyles` cambió `height` fijo por `min-height` con los mismos
   * tres valores, porque con la preferencia de tamano de texto al 200 % un
   * rotulo de dos lineas se salia de la pildora (medicion en el docblock de
   * `sizeStyles`, Button.tsx). El suelo tactil AA que este caso protege es el
   * mismo: 44x44.
   */
  it("tiene aria-label traducido y area tactil minima de 44px", () => {
    setViewport(800, 5000);
    renderWithMain();
    const boton = screen.getByRole("button", { name: "Volver arriba" });
    const estilo = getComputedStyle(boton);
    expect(estilo.width).toBe("44px");
    expect(estilo.minHeight).toBe("44px");
  });

  it("sin prefers-reduced-motion, el click hace scroll SUAVE al origen", () => {
    setViewport(800, 5000);
    stubMatchMedia(false);
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    renderWithMain();

    act(() => {
      screen.getByRole("button", { name: "Volver arriba" }).click();
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  /*
   * Brief (Task 2, punto 2): "scroll respetando prefers-reduced-motion
   * (instantáneo bajo reduce)". Validado con bug inyectado (ver informe):
   * forzando `behavior: "smooth"` sin condicional en BackToTop.tsx, este
   * test se pone en rojo; restaurado el condicional, vuelve a verde.
   */
  it("con prefers-reduced-motion: reduce, el click hace scroll INSTANTANEO al origen", () => {
    setViewport(800, 5000);
    stubMatchMedia(true);
    const scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    renderWithMain();

    act(() => {
      screen.getByRole("button", { name: "Volver arriba" }).click();
    });

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: "instant",
    });
  });

  /*
   * Decisión documentada (ver docblock de BackToTop.tsx): el click mueve el
   * foco a #main ANTES de que el botón pueda desmontarse por su propio
   * efecto (scroll cruzando el umbral), para no dejar el foco huérfano en
   * <body> -- mismo principio que RULES.md regla 27.
   */
  it("el click mueve el foco al landmark #main (no lo deja huerfano cuando el boton desaparece)", () => {
    setViewport(800, 5000);
    stubMatchMedia(false);
    vi.stubGlobal("scrollTo", vi.fn());
    renderWithMain();

    const boton = screen.getByRole("button", { name: "Volver arriba" });
    act(() => {
      boton.click();
    });

    expect(document.activeElement).toBe(document.getElementById("main"));
  });

  /*
   * Hallazgo Important (review, fix round 1): `visible` lo gobierna
   * `useScrolled`, que reacciona a CUALQUIER scroll -- no solo al que
   * dispara `handleClick`. Este test ejercita la vía que NO pasa por el
   * click: el usuario llega al botón con Tab (foco real, sin activarlo) y
   * el scroll cruza el umbral por OTRA vía (aquí, un evento `scroll`
   * suelto -- el mismo que dispararían Home/PageUp/rueda/`scrollTo` de
   * otro control). Sin el listener independiente de BackToTop.tsx, el
   * foco se perdería hacia <body> cuando el botón se desmonta -- el mismo
   * síntoma que el test anterior (vía click) cubre por SU vía, pero este
   * es el que faltaba (ver la review). Validado con bug inyectado (ver
   * informe de la tarea): comentando temporalmente el `useEffect` del
   * listener independiente en BackToTop.tsx, este test se pone en rojo
   * (foco huérfano en <body>) mientras el test anterior ("el click mueve
   * el foco...") sigue en verde -- confirma que son dos vías distintas.
   */
  it("con el foco en el botón (SIN click) y un scroll independiente que cruza el umbral, el foco se transfiere a #main sin quedar huérfano en body", () => {
    setViewport(800, 5000);
    renderWithMain();

    const boton = screen.getByRole("button", { name: "Volver arriba" });
    act(() => {
      boton.focus();
    });
    expect(boton).toHaveFocus();

    act(() => {
      setViewport(800, 0);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(
      screen.queryByRole("button", { name: "Volver arriba" }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(document.getElementById("main"));
    expect(document.activeElement).not.toBe(document.body);
  });

  /*
   * Task 13, punto 1 del brief: `right`/`bottom` reservan el hueco de
   * `env(safe-area-inset-*)` desde la Task 2 (docblock de ScBackToTop,
   * BackToTop.tsx) -- esta tarea es la primera que le pone un candado.
   * `calc(token + env(..., 0px))`, aditivo por construcción: jsdom no
   * resuelve `env()` (no hay hardware que consultar), así que el candado
   * afirma el TEXTO de la declaración, no `getComputedStyle`. Validado con
   * el bug inyectado a propósito (ver informe de la tarea): comentando
   * temporalmente `+ env(safe-area-inset-right, 0px)` (y su gemelo de
   * bottom) en BackToTop.tsx, este test se pone en rojo; restaurado, vuelve
   * a verde.
   */
  it("Task 13: right/bottom reservan env(safe-area-inset-right/bottom) de forma aditiva", () => {
    setViewport(800, 5000);
    renderWithMain();
    const boton = screen.getByRole("button", { name: "Volver arriba" });
    const reglas = reglasDe(boton);

    const rightRule = reglas.find(
      (r) => r.includes("right:") && r.includes("env(safe-area-inset-right"),
    );
    expect(
      rightRule,
      "no se encontró la declaración de right con env()",
    ).toBeDefined();
    expect(rightRule).toContain("env(safe-area-inset-right, 0px)");

    const bottomRule = reglas.find(
      (r) => r.includes("bottom:") && r.includes("env(safe-area-inset-bottom"),
    );
    expect(
      bottomRule,
      "no se encontró la declaración de bottom con env()",
    ).toBeDefined();
    expect(bottomRule).toContain("env(safe-area-inset-bottom, 0px)");
  });

  /*
   * Task 13, punto 2 del brief: BackToTop es IconButton -> styled(Button),
   * así que hereda touch-action de ScButton (Button.tsx) por composición --
   * mismo candado de herencia que IconButton.test.tsx, un nivel más abajo en
   * la cadena. Validado con el bug inyectado a propósito (ver informe de la
   * tarea): comentando temporalmente `touch-action: manipulation;` en
   * Button.tsx, este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: hereda touch-action: manipulation de ScButton por composición", () => {
    setViewport(800, 5000);
    renderWithMain();
    const boton = screen.getByRole("button", { name: "Volver arriba" });
    const reglas = reglasDe(boton);

    expect(reglas.some((r) => r.includes("touch-action: manipulation"))).toBe(
      true,
    );
  });
});
