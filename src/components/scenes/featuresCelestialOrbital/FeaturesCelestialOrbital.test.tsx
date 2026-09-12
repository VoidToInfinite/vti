import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { FeaturesCelestialOrbital } from "./FeaturesCelestialOrbital";
import { FEATURES_ORBITAL_LAYERS } from "./featuresCelestialOrbital.layers";

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * CONCRETO (mismo helper que `Features.test.tsx`/`Journey.test.tsx`): filtra
 * por las clases del propio elemento, así que NO arrastra el resto del
 * stylesheet acumulado -- imprescindible para poder aseverar la AUSENCIA de
 * una propiedad sin caer en la trampa ya registrada (task/lessons.md,
 * 2026-08-02: "un test que trocea el CSS inyectado por @media se contamina
 * con el stylesheet entero"). Aquí el riesgo es el simétrico y peor: sobre el
 * stylesheet completo, el `mix-blend-mode` de CUALQUIER otro componente del
 * sitio haría fallar este test sin que esta escena tenga nada que ver.
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
 * observer de `useReveal`. El stub no dispara interseccion por si solo, que
 * es justo lo que estos tests quieren: comprueban el MARCADO de las capas,
 * no su animacion.
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

/*
 * Heredado tal cual de `FeaturesCelestialGuide.test.tsx`, la escena que esta
 * sustituye (D12/D16, spec
 * `docs/superpowers/specs/2026-08-02-features-overlay-celestial-orbital-design.md`):
 * el marcado que estos dos tests protegen -- contenedor `aria-hidden`, una
 * `<img>` decorativa por capa con sus dos pistas de `srcSet` -- no cambia al
 * cambiar el arte, asi que la cobertura viaja con el componente en vez de
 * desaparecer con el borrado. El recuento NO se escribe a mano: sale de
 * `FEATURES_ORBITAL_LAYERS.length` (misma leccion del repo que ya obligo a
 * derivar `JOURNEY_SLIDES`).
 */
describe("FeaturesCelestialOrbital", () => {
  it("renderiza una capa por entrada de la tabla como imagen decorativa dentro de un contenedor aria-hidden", () => {
    const { container } = render(<FeaturesCelestialOrbital />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(FEATURES_ORBITAL_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = FEATURES_ORBITAL_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.srcMedium} 1600w, ${layer.src} 2560w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<FeaturesCelestialOrbital />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });

  /*
   * Test 10 de la spec (D12,
   * `docs/superpowers/specs/2026-08-02-features-overlay-celestial-orbital-design.md`).
   * Este paquete guarda el color DESPREMULTIPLICADO para componerse con alpha
   * NORMAL: sumarlo en aditivo lavaria el arte entero. La escena SALIENTE de
   * esta misma seccion (`featuresCelestialGuide.parts.tsx`, borrada con esta
   * entrega) si declaraba `mix-blend-mode: screen` con fallback
   * `plus-lighter`, asi que el fallo concreto contra el que protege este test
   * es un copia-pega de aquel `ScLayer` -- que dejaria la suite VERDE y el
   * fondo lavado, porque no se pierde ni un elemento del DOM ni una palabra
   * de texto.
   *
   * Se asevera sobre las reglas de la CAPA, no sobre el stylesheet completo
   * (ver `cssRuleTextFor`, arriba): otros componentes del sitio si usan
   * blending legitimamente.
   */
  it("las capas se componen con alpha normal: su CSS no declara mix-blend-mode", () => {
    const { container } = render(<FeaturesCelestialOrbital />);
    const layer = container.querySelector("img") as HTMLElement;
    const css = cssRuleTextFor(layer);

    // Sonda de que el helper esta viendo algo: si `css` viniera vacio, la
    // asercion de abajo pasaria por vacuidad y este test dejaria de proteger
    // en silencio.
    expect(css).toContain("object-fit: cover");
    expect(css).not.toMatch(/mix-blend-mode/i);
  });
});
