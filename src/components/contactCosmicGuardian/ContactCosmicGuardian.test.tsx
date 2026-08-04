import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
/*
 * `renderWithProviders`, no el `render` pelado de Testing Library: igual que
 * `ContactNeonGalaxy.test.tsx`, `ScVignette`
 * (`contactCosmicGuardian.parts.tsx`) lee `theme.data.breakPoint.md` para
 * separar sus dos regimenes, y sin `ThemeProvider` en el arbol el render
 * revienta con "Cannot read properties of undefined (reading
 * 'breakPoint')".
 */
import { renderWithProviders as render } from "@/test/test-utils";
import { ContactCosmicGuardian } from "./ContactCosmicGuardian";
import { CONTACT_GUARDIAN_LAYERS } from "./contactCosmicGuardian.layers";

/**
 * Texto CSS de las reglas que styled-components inyecto para un elemento
 * CONCRETO (mismo helper que `FeaturesCelestialOrbital.test.tsx`): filtra
 * por las clases del propio elemento, asi que NO arrastra el resto del
 * stylesheet acumulado. Aqui hace falta ademas comprobar la AUSENCIA de
 * `mix-blend-mode` en dos capas (fondo, figura) y su PRESENCIA en la
 * tercera (polvo): sobre el stylesheet completo, el `mix-blend-mode` de
 * CUALQUIER otro componente del sitio contaminaria esas dos aserciones de
 * ausencia sin que esta escena tenga nada que ver.
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
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * jsdom no implementa `IntersectionObserver`, y desde que `useSceneParallax`
 * guarda su bucle por visibilidad (2026-07-31) montar esta escena lo
 * construye: sin este stub, el render lanza `IntersectionObserver is not
 * defined`. Mismo patron que ya usan `Story.test.tsx` y compania para el
 * observer de `useReveal`.
 */
function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  stubMatchMedia();
  stubIntersectionObserver();
});
afterEach(() => vi.unstubAllGlobals());

describe("ContactCosmicGuardian", () => {
  it("renderiza una capa por entrada de la tabla como imagen decorativa dentro de un contenedor aria-hidden", () => {
    const { container } = render(<ContactCosmicGuardian />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(CONTACT_GUARDIAN_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = CONTACT_GUARDIAN_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.src} 2560w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<ContactCosmicGuardian />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });

  /*
   * El test que de verdad importa (manifest, `compositing.css`): solo
   * `03-polvo` lleva `mix-blend-mode: screen`; `01-fondo` (opaca) y
   * `02-figura` van en alpha normal. Aplicar `screen` al fondo opaco lo
   * lavaria por completo sin perder ni un nodo del DOM ni una palabra de
   * texto -- el marcado y la accesibilidad quedarian intactos y los dos
   * tests de arriba seguirian en verde -- asi que la suite no lo veria de
   * ninguna otra forma. Se asevera sobre las reglas de CADA CAPA (ver
   * `cssRuleTextFor`), no sobre el stylesheet completo: otros componentes
   * del sitio si usan blending legitimamente.
   */
  it("solo la capa de polvo declara mix-blend-mode: screen; fondo y figura no lo declaran", () => {
    const { container } = render(<ContactCosmicGuardian />);
    const fondo = container.querySelector(
      'img[data-part="fondo"]',
    ) as HTMLElement;
    const figura = container.querySelector(
      'img[data-part="figura"]',
    ) as HTMLElement;
    const polvo = container.querySelector(
      'img[data-part="polvo"]',
    ) as HTMLElement;

    const fondoCss = cssRuleTextFor(fondo);
    const figuraCss = cssRuleTextFor(figura);
    const polvoCss = cssRuleTextFor(polvo);

    // Sonda de que el helper esta viendo algo para las tres capas: si `css`
    // viniera vacio, las aserciones de ausencia de abajo pasarian por
    // vacuidad y este test dejaria de proteger en silencio.
    expect(fondoCss).toContain("object-fit: cover");
    expect(figuraCss).toContain("object-fit: cover");
    expect(polvoCss).toContain("object-fit: cover");

    expect(fondoCss).not.toMatch(/mix-blend-mode/i);
    expect(figuraCss).not.toMatch(/mix-blend-mode/i);
    expect(polvoCss).toMatch(/mix-blend-mode:\s*screen/i);
  });
});
