import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { Wormhole } from "./Wormhole";

describe("Wormhole", () => {
  it("es decoracion: queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Wormhole pulsing={false} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("monta las nueve piezas de la construccion", () => {
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
      "mark",
      "shock1",
      "shock2",
    ]);
  });

  it("la marca del logo vive dentro, entre el nucleo y la primera onda de choque", () => {
    // La reaccion al pulso del logo depende del MISMO data-pulse que ya
    // gobierna swirl/ring1-4/core (selector descendiente [data-pulse="true"]
    // &): con pulsing=true el nodo existe y la raiz lleva el atributo; con
    // pulsing=false el nodo existe igual, sin el atributo de pulso activo.
    // jsdom no computa keyframes, asi que se testea el contrato de
    // atributos, no la animacion en si (mismo patron que el resto del
    // archivo).
    const { container, rerender } = renderWithProviders(
      <Wormhole pulsing={false} />,
    );
    const root = container.firstElementChild;
    expect(container.querySelector('[data-part="mark"]')).toBeInTheDocument();
    expect(root).toHaveAttribute("data-pulse", "false");

    rerender(<Wormhole pulsing={true} />);
    expect(container.querySelector('[data-part="mark"]')).toBeInTheDocument();
    expect(root).toHaveAttribute("data-pulse", "true");
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
