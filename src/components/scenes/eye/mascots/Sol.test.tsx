import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, fireEvent, act } from "@/test/test-utils";
import { Sol } from "./Sol";
import { AMBIENT } from "@/motion/vocabulary";
import { motion } from "@/theme/tokens/motion";
import {
  SOL_AUTO_CYCLE_MS,
  SOL_MANUAL_OVERRIDE_LIMIT,
  SOL_MANUAL_OVERRIDE_MS,
  SOL_RAY_ANGLES,
  SOL_TILT_MAX_DEG,
} from "./Sol.constants";

/** Texto CSS de todas las reglas inyectadas por styled-components (lección
 *  2026-07-27: jsdom no evalúa NINGÚN `@media`, así que un guard de
 *  `prefers-reduced-motion` o una `animation:` dentro de uno solo se puede
 *  atar inspeccionando el TEXTO inyectado, nunca con `getComputedStyle`). */
function allCssText(): string {
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
  return reglas.join("\n");
}

/** `useSolTiltSpin` consulta `matchMedia` en cada interaccion; jsdom no lo
 *  implementa. `reduced` controla la unica rama que importa aqui. */
function stubMatchMedia(reduced = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce")
        ? reduced
        : true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

const facesOf = (container: HTMLElement): HTMLElement =>
  container.querySelector("[data-variant]") as HTMLElement;
const hitOf = (container: HTMLElement): HTMLElement =>
  container.firstElementChild?.firstElementChild as HTMLElement;

beforeEach(() => stubMatchMedia());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Sol", () => {
  it("es decoracion: queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Sol />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("mantiene las dos caras montadas a la vez (se cruzan, no se remontan)", () => {
    // Remontarlas produciria un parpadeo en el cambio; el crossfade por
    // opacidad necesita que las dos existan siempre.
    const { container } = renderWithProviders(<Sol />);
    expect(container.querySelector('[data-face="sol"]')).toBeInTheDocument();
    expect(
      container.querySelector('[data-face="compass"]'),
    ).toBeInTheDocument();
  });

  it("dibuja los doce rayos del mascota en cada cara", () => {
    const { container } = renderWithProviders(<Sol />);
    const face = container.querySelector('[data-face="sol"]') as HTMLElement;
    // Los rayos son los hijos del contenedor que gira; se cuentan por su
    // transform en linea, que es lo unico que los distingue entre si.
    const rays = [...face.querySelectorAll("div")].filter((el) =>
      el.style.transform.includes("rotate("),
    );
    expect(rays).toHaveLength(SOL_RAY_ANGLES.length);
  });

  it("arranca en la cara Sol y el click la cambia a la brujula", () => {
    const { container } = renderWithProviders(<Sol />);
    expect(facesOf(container)).toHaveAttribute("data-variant", "sol");

    fireEvent.click(hitOf(container));
    expect(facesOf(container)).toHaveAttribute("data-variant", "compass");
  });

  it("la cara forzada a mano revierte sola a la programada", () => {
    vi.useFakeTimers();
    const { container } = renderWithProviders(<Sol />);

    fireEvent.click(hitOf(container));
    expect(facesOf(container)).toHaveAttribute("data-variant", "compass");

    act(() => void vi.advanceTimersByTime(SOL_MANUAL_OVERRIDE_MS + 1));
    expect(facesOf(container)).toHaveAttribute("data-variant", "sol");
  });

  it("los cambios manuales tienen tope por ventana, y la ventana los repone", () => {
    vi.useFakeTimers();
    const { container } = renderWithProviders(<Sol />);
    const hit = hitOf(container);

    // Gastar el presupuesto entero: cada click alterna y reinicia el timer de
    // reversion, asi que la cara visible depende de la paridad.
    for (let i = 0; i < SOL_MANUAL_OVERRIDE_LIMIT; i += 1) {
      fireEvent.click(hit);
    }
    const spent = facesOf(container).getAttribute("data-variant");

    // Un click de mas ya no hace nada.
    fireEvent.click(hit);
    expect(facesOf(container)).toHaveAttribute("data-variant", spent);

    // Al cerrarse la ventana programada, el contador se repone y el click
    // vuelve a responder.
    act(() => void vi.advanceTimersByTime(SOL_AUTO_CYCLE_MS + 1));
    const scheduled = facesOf(container).getAttribute("data-variant");
    fireEvent.click(hit);
    expect(facesOf(container)).not.toHaveAttribute("data-variant", scheduled);
  });

  it("la inclinacion hacia el cursor escribe el transform directamente en el DOM", () => {
    // Sin re-render de React: mismo contrato que el gaze del ojo (spec §13).
    const { container } = renderWithProviders(<Sol />);
    const hit = hitOf(container);
    const tilt = hit.firstElementChild?.firstElementChild as HTMLElement;

    expect(tilt.style.transform).toBe("");
    fireEvent.mouseMove(hit, { clientX: 100, clientY: 100 });
    expect(tilt.style.transform).toContain("rotateX(");
    expect(tilt.style.transform).toContain("rotateY(");

    fireEvent.mouseLeave(hit);
    expect(tilt.style.transform).toBe("");
  });

  /*
   * Task 19 (punto 7 del brief): `useSolTiltSpin.ts:62` duplicaba a mano
   * motion.duration.slower (480ms) + motion.easing.standard
   * (cubic-bezier(0.4, 0, 0.2, 1)) en un literal de transición inline.
   * Validado con el bug inyectado a propósito (ver informe de la tarea):
   * revirtiendo temporalmente esa línea al literal
   * "transform 480ms cubic-bezier(0.4, 0, 0.2, 1)" en useSolTiltSpin.ts,
   * este test siguió en verde (misma cadena resultante) -- lo que SÍ cayó en
   * rojo fue cambiar el VALOR del token importado (probar con
   * motion.duration.slow en vez de slower): confirma que el test depende
   * del token, no de una coincidencia textual.
   */
  it("Task 19: al salir el cursor, la transicion de retorno usa motion.duration.slower + motion.easing.standard (no un literal duplicado)", () => {
    const { container } = renderWithProviders(<Sol />);
    const hit = hitOf(container);
    const tilt = hit.firstElementChild?.firstElementChild as HTMLElement;

    fireEvent.mouseMove(hit, { clientX: 100, clientY: 100 });
    fireEvent.mouseLeave(hit);

    expect(tilt.style.transition).toBe(
      `transform ${motion.duration.slower} ${motion.easing.standard}`,
    );
  });

  /*
   * Task 19 (motion core, punto 7 del brief -- gate F2: AMBIENT con cero
   * consumidores): cinco animaciones de este fichero pasan de un literal en
   * segundos (5.4s/20s/40s) a `AMBIENT.breathMs`/`AMBIENT.orbitMs`/
   * `AMBIENT.orbitSlowMs` (@/motion/vocabulary), mismo valor numérico.
   * Validado con el bug inyectado a propósito (ver informe de la tarea):
   * revirtiendo temporalmente `solBreathe` a `5.4s` en Sol.tsx, este test se
   * puso en rojo (deja de encontrar `${AMBIENT.breathMs}ms` en el texto
   * inyectado); restaurado, volvió a verde.
   */
  it("Task 19: solBreathe/haloGlow/coreGlow/coronaMorph/sweepSpin consumen AMBIENT.breathMs/orbitMs/orbitSlowMs, no literales en segundos", () => {
    renderWithProviders(<Sol />);
    const css = allCssText();

    // Sonda positiva: confirma que el mecanismo SÍ ve animaciones bajo este
    // guard antes de afirmar la ausencia de los literales viejos.
    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain(`${AMBIENT.breathMs}ms ease-in-out infinite`);
    expect(css).toContain(`${AMBIENT.orbitMs}ms ease-in-out infinite`);
    expect(css).toContain(`${AMBIENT.orbitSlowMs}ms linear infinite`);
    expect(css).not.toContain("5.4s");
    expect(css).not.toContain("20s ease-in-out");
    expect(css).not.toContain("40s linear");
  });

  it("con reduced-motion no inclina ni gira, pero el cambio de cara sigue funcionando", () => {
    stubMatchMedia(true);
    const { container } = renderWithProviders(<Sol />);
    const hit = hitOf(container);
    const tilt = hit.firstElementChild?.firstElementChild as HTMLElement;
    const spin = tilt.firstElementChild as HTMLElement;

    fireEvent.mouseMove(hit, { clientX: 100, clientY: 100 });
    expect(tilt.style.transform).toBe("");

    fireEvent.click(hit);
    expect(spin).toHaveAttribute("data-spinning", "false");
    // Lo accesible del gesto (cambiar de cara) NO se sacrifica: solo el floreo.
    expect(facesOf(container)).toHaveAttribute("data-variant", "compass");
  });

  it("el giro se marca al click y se apaga cuando su animacion termina", () => {
    const { container } = renderWithProviders(<Sol />);
    const hit = hitOf(container);
    const tilt = hit.firstElementChild?.firstElementChild as HTMLElement;
    const spin = tilt.firstElementChild as HTMLElement;

    expect(spin).toHaveAttribute("data-spinning", "false");
    fireEvent.click(hit);
    expect(spin).toHaveAttribute("data-spinning", "true");

    fireEvent.animationEnd(spin);
    expect(spin).toHaveAttribute("data-spinning", "false");
  });

  it("mantiene la inclinacion maxima portada del original", () => {
    // Guarda del dato, no del efecto: si alguien lo sube, el mascota deja de
    // parecerse al de vti-sdk.
    expect(SOL_TILT_MAX_DEG).toBe(11);
  });

  it("dibuja el atomo Logo compartido dentro del iris de la cara brujula", () => {
    // Regresion para el atomo compartido (ver comentario de cabecera de
    // Sol.tsx, ScPupilMark): si alguien quita <ScPupilMark size="50%" /> de
    // SolCompassFace, la pupila se queda vacia y ningun otro test de este
    // archivo lo detecta (los que ya existen solo miran data-variant/data-face
    // y el transform de la inclinacion).
    const { container } = renderWithProviders(<Sol />);
    const compassFace = container.querySelector('[data-face="compass"]');
    const mark = compassFace?.querySelector("svg");

    expect(mark).toBeInTheDocument();
    expect(mark).toHaveAttribute("viewBox", "0 7.5 500 550");
    // Sin title: el atomo Logo se resuelve a puramente decorativo aqui, igual
    // que en Navbar/Wormhole (el nombre de marca ya lo lleva BrandName).
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });
});
