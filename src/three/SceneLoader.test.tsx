import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RefObject } from "react";
import { renderWithProviders, screen } from "@/test/test-utils";
import { SceneLoader } from "./SceneLoader";

/**
 * El progreso real llega de `useScrollProgress`, que lo crea con `useRef(0)` —
 * un `RefObject<number>` sin `null`. `createRef<number>()` NO sirve aquí: en
 * React 19 tipa `RefObject<number | null>` y no es asignable.
 */
const progressRef = (value = 0): RefObject<number> => ({ current: value });

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("SceneLoader", () => {
  it("muestra el poster antes de que la escena cargue", () => {
    renderWithProviders(<SceneLoader progress={progressRef()} />);
    const poster = screen.getByTestId("scene-poster");
    expect(poster).toBeInTheDocument();
  });

  it("el poster es decoracion (no aporta contenido)", () => {
    renderWithProviders(<SceneLoader progress={progressRef()} />);
    expect(screen.getByTestId("scene-poster")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("no intenta cargar la escena bajo reduced-motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((q: string) => ({
        matches: q.includes("reduced-motion"),
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    renderWithProviders(<SceneLoader progress={progressRef()} />);
    // El póster permanece: es el still de reduced-motion (spec §10).
    expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
  });
});
