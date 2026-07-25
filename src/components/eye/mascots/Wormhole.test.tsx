import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { Wormhole } from "./Wormhole";

describe("Wormhole", () => {
  it("es decoracion: queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Wormhole pulsing={false} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("monta las ocho piezas de la construccion", () => {
    const { container } = renderWithProviders(<Wormhole pulsing={false} />);
    const parts = [...container.querySelectorAll("[data-part]")].map((el) =>
      el.getAttribute("data-part"),
    );
    expect(parts).toEqual([
      "swirl",
      "ring1",
      "ring2",
      "ring3",
      "ring4",
      "core",
      "shock1",
      "shock2",
    ]);
  });

  it("expone el estado del pulso en la raiz, que es donde lo lee el CSS", () => {
    // El CSS del pulso usa el selector DESCENDIENTE [data-pulse="true"] &:
    // el atributo tiene que vivir en la raiz, no en cada anillo (mismo gotcha
    // que documenta CLAUDE.md §5.1 — un &[data-...] en el propio elemento no
    // dispararia nunca).
    const { container, rerender } = renderWithProviders(
      <Wormhole pulsing={false} />,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-pulse", "false");

    rerender(<Wormhole pulsing={true} />);
    expect(root).toHaveAttribute("data-pulse", "true");
  });

  it("avisa del fin del pulso con la ULTIMA onda, no con la primera", () => {
    // shock1 termina a los 2100ms y shock2 a los 2160ms: si el fin del pulso
    // se anunciara con shock1, apagar el estado quitaria a shock2 su animacion
    // a media reproduccion.
    const onPulseEnd = vi.fn();
    const { container } = renderWithProviders(
      <Wormhole
        pulsing={true}
        onPulseEnd={onPulseEnd}
      />,
    );

    fireEvent.animationEnd(
      container.querySelector('[data-part="shock1"]') as HTMLElement,
    );
    expect(onPulseEnd).not.toHaveBeenCalled();

    fireEvent.animationEnd(
      container.querySelector('[data-part="shock2"]') as HTMLElement,
    );
    expect(onPulseEnd).toHaveBeenCalledTimes(1);
  });
});
