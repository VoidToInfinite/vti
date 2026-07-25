import { Profiler } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import { EYE_SURFACE } from "@/components/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { semanticDark } from "@/theme/tokens/semantic";
import { space } from "@/theme/tokens/space";
import { Story } from "./Story";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Texto CSS de las reglas que styled-components inyecto para un elemento. Se
 * usa solo para lo que `getComputedStyle` de jsdom no expone (propiedades con
 * prefijo de fabricante); todo lo demas se asevera sobre el estilo computado.
 */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.startsWith(`.${cls}`)))
    .join("\n");
}

/**
 * Colores de las paradas de un `linear-gradient`, en orden y sin sus
 * posiciones. Se ignora la direccion (`to bottom`), que no es una parada.
 */
function gradientStops(backgroundImage: string): string[] {
  const inside = backgroundImage.slice(
    backgroundImage.indexOf("(") + 1,
    backgroundImage.lastIndexOf(")"),
  );
  return (
    inside.match(
      /oklch\([^)]*\)|rgba?\([^)]*\)|transparent|#[0-9a-f]{3,8}/gi,
    ) ?? []
  );
}

describe("Story", () => {
  it("es una region con nombre accesible", () => {
    // Buscar la region POR SU NOMBRE, no solo comprobar que existe: un
    // `aria-labelledby` apuntando a un id equivocado dejaria la seccion sin
    // nombre (un lector de pantalla anunciaria "region" a secas) y aun asi
    // pasaria un `getByRole("region")` a secas.
    renderWithProviders(<Story />);
    const region = screen.getByRole("region", {
      name: (accessibleName) => accessibleName.length > 0,
    });
    expect(region).toHaveAccessibleName();
  });

  it("tiene un h2 (jerarquia correcta bajo la h1 del hero)", () => {
    const { container } = renderWithProviders(<Story />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("tiene el ancla de navegacion del CTA del hero", () => {
    const { container } = renderWithProviders(<Story />);
    expect(container.querySelector("#story")).toBeInTheDocument();
  });

  it("la costura Hero->Story es decorativa e inerte", () => {
    // La capa de continuidad no aporta informacion: si llegara al arbol
    // accesible seria un nodo vacio anunciado por un lector de pantalla, y si
    // fuera focalizable seria una parada de tabulacion sin destino.
    renderWithProviders(<Story />);
    const seam = screen.getByTestId("story-continuity");

    expect(seam).toHaveAttribute("aria-hidden", "true");
    expect(seam.textContent).toBe("");
    expect(seam).not.toHaveAttribute("tabindex");
    // `getAllByRole` ignora por defecto el subarbol `aria-hidden`: si la
    // costura apareciera aqui, es que no esta oculta de verdad.
    expect(screen.queryAllByRole("generic")).not.toContain(seam);
  });

  it("la costura arranca en el negro del hero y termina en alfa 0", () => {
    // El extremo superior se compara contra el token IMPORTADO, no contra un
    // string escrito a mano: si manana cambia el negro del ojo, el test sigue
    // describiendo el contrato ("el primer pixel de Story es el ultimo pixel
    // del hero") en vez de quedarse anclado a un literal.
    //
    // El extremo inferior es alfa 0 A PROPOSITO, no un color: lo que se ve ahi
    // es lo que Story pinte debajo (poster, canvas o su propio fondo). Lo que
    // el test ata es que ese fondo de seccion sea la superficie oscura que la
    // rampa da por supuesta, aunque la pagina este en tema claro.
    const { container } = renderWithProviders(<Story />);
    const seam = screen.getByTestId("story-continuity");
    const computed = window.getComputedStyle(seam);

    expect(computed.pointerEvents).toBe("none");
    expect(computed.height).toBe(space[9]);
    expect(computed.backgroundImage).toContain(EYE_SURFACE);
    expect(computed.backgroundImage).toContain("transparent");

    const section = container.querySelector("#story") as HTMLElement;
    expect(window.getComputedStyle(section).backgroundColor).toBe(
      semanticDark.bg,
    );
  });

  it("la costura solo puede oscurecer: ninguna parada aporta luz sobre el poster", () => {
    // ESTE es el test que habria cazado el bug de la primera version.
    //
    // Aquella costura interpolaba de `EYE_SURFACE` a `semantic.bg`
    // (oklch(0.22 0.004 286)) y ocultaba el tramo claro con una `mask-image`
    // que mantenia alfa 1 hasta el 45%. Resultado real: los primeros 2,7rem se
    // pintaban OPACOS con un gris de hasta ~L 0.10, MAS CLARO que el borde
    // superior del poster (~L 0.05) -> un realce justo debajo de la junta, el
    // mismo artefacto que la mascara decia eliminar.
    //
    // El contrato que se atornilla aqui es el del degradado DESNUDO, sin
    // considerar mascaras, y eso es deliberado: tapar con una mascara una
    // parada mas clara que lo que hay debajo es exactamente la construccion
    // que produjo la banda gris. Si alguien la reintroduce, este test falla.
    //
    // La comparacion se hace con el helper real del sistema de color: el ratio
    // de contraste contra negro puro es monotono en la luminancia, asi que
    // sirve de comparador de claridad sin exportar nada nuevo.
    const posterTopEdge = "oklch(0.05 0.012 288)"; // SceneLoader.tsx:54
    const ceiling = contrastRatio(posterTopEdge, EYE_SURFACE);

    renderWithProviders(<Story />);
    const seam = screen.getByTestId("story-continuity");
    const stops = gradientStops(
      window.getComputedStyle(seam).backgroundImage,
    ).filter((stop) => stop !== "transparent");

    expect(stops.length).toBeGreaterThan(0);
    for (const stop of stops) {
      expect(contrastRatio(stop, EYE_SURFACE)).toBeLessThanOrEqual(ceiling);
    }
  });

  it("la costura es una sola rampa monotona: dos paradas, sin mascara", () => {
    // La mitigacion documentada para el banding (docs/qa-3d-pendiente.md §8)
    // es alargar la costura, NO anadir paradas intermedias: una parada
    // intermedia mete una discontinuidad de pendiente, que es justo lo que
    // produce una banda de Mach. Y una `mask-image` reintroduce ademas el
    // riesgo de soporte en Safari/Firefox y una propiedad con prefijo de
    // fabricante que `getComputedStyle` ni siquiera expone.
    renderWithProviders(<Story />);
    const seam = screen.getByTestId("story-continuity");

    expect(
      gradientStops(window.getComputedStyle(seam).backgroundImage),
    ).toEqual([EYE_SURFACE, "transparent"]);
    expect(cssRuleTextFor(seam)).not.toContain("mask-image");
  });

  it("la costura se pinta sobre el poster y por debajo del contenido", () => {
    // Entre hermanos posicionados con el mismo z-index (`base`) gana el ultimo
    // del DOM. Por eso el orden es contrato, no casualidad: DESPUES del poster
    // (para taparlo, junto al canvas) y ANTES de `ScContent` (que ademas vive
    // en `raised`, asi que la costura nunca puede taparlo).
    const { container } = renderWithProviders(<Story />);
    const seam = screen.getByTestId("story-continuity");
    const poster = screen.getByTestId("scene-poster");
    const content = container.querySelector("#story-title")?.parentElement;

    expect(content).toBeTruthy();
    expect(
      seam.compareDocumentPosition(poster) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(
      seam.compareDocumentPosition(content as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("la copia usa el texto del tema oscuro aunque la pagina este en claro", () => {
    // `renderWithProviders` monta el `ThemeProvider` de la app, que arranca en
    // tema CLARO. Si el anidado de `storyTheme` no ganara, el color computado
    // seria el casi-negro `semanticLight.text` sobre el poster oscuro: el bug
    // registrado en la seccion 7 de docs/qa-3d-pendiente.md.
    const { container } = renderWithProviders(<Story />);
    const title = container.querySelector("#story-title") as HTMLElement;
    const body = title.nextElementSibling as HTMLElement;

    expect(window.getComputedStyle(title).color).toBe(semanticDark.text);
    expect(window.getComputedStyle(body).color).toBe(semanticDark.text);
  });

  it("el texto de Story pasa AA sobre las tres superficies que puede tener debajo", () => {
    // Medido con el helper real del sistema de color, no estimado.
    //
    // La tercera constante es la parada MAS CLARA del poster
    // (`SceneLoader.tsx:51-55`) tomada COMO OPACA: en el poster va al 35% de
    // alfa sobre oklch(0.05 0.012 288), asi que la composicion real es mas
    // oscura y mas favorable que esta medicion. Es un peor caso deliberado.
    // Ojo: `parseOklch` no admite alfa, asi que nunca se le pasa una parada
    // con `/ alpha`.
    const posterLightestStop = "oklch(0.35 0.142 235.851)";

    expect(
      contrastRatio(semanticDark.text, semanticDark.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticDark.text, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticDark.text, posterLightestStop),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("no re-renderiza aunque se conduzcan frames de rAF y eventos de scroll", () => {
    // Regresion real, no ceremonia: Story monta `useScrollProgress`, que
    // escucha scroll y mide en rAF. Si esa medicion pasara alguna vez por
    // `useState`, cada frame de scroll re-renderizaria Story entera --
    // `SceneLoader` y el canvas de Three.js incluidos. El `Profiler` cuenta
    // COMMITS del subarbol: si Story no vuelve a renderizar, no hay commit.
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    let commits = 0;
    renderWithProviders(
      <Profiler
        id="story"
        onRender={() => {
          commits += 1;
        }}
      >
        <Story />
      </Profiler>,
    );

    const afterMount = commits;
    expect(afterMount).toBeGreaterThan(0);

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        window.dispatchEvent(new Event("scroll"));
        frames.splice(0, frames.length).forEach((cb) => cb(i));
      });
    }

    expect(commits).toBe(afterMount);
  });
});
