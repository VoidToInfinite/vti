import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, fireEvent, act } from "@/test/test-utils";
import { Sol } from "./Sol";
import {
  SOL_AUTO_CYCLE_MS,
  SOL_MANUAL_OVERRIDE_LIMIT,
  SOL_MANUAL_OVERRIDE_MS,
  SOL_RAY_ANGLES,
  SOL_TILT_MAX_DEG,
} from "./Sol.constants";

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
});
