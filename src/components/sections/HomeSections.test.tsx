import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { HomeSections } from "./HomeSections";

/*
 * Las 4 secciones (spec 2026-07-30) ya tienen tratamiento propio para los
 * dos temas -- este componente ya no bifurca por tema (era un gate
 * incremental mientras se construian una a una, ver el docblock de
 * HomeSections.tsx): siempre monta las 4, en orden. Cada una resuelve su
 * propia rama claro/oscuro internamente. Las 4 usan `useReveal`
 * (IntersectionObserver) -- mismo stub minimo que Story.test.tsx/etc.
 */

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

function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("HomeSections", () => {
  /*
   * En CLARO son CINCO secciones desde el 2026-08-06, no cuatro: `Story`
   * emite ademas `#statement`, la nota de cierre promovida a pantalla
   * completa (spec `2026-08-06-story-features-tema-claro-design.md`, D12).
   * Va entre `#story` y `#journey`, exactamente donde la coloca el mockup
   * `Landing v2.dc`.
   *
   * Desde la Task 15 (unificacion de contenido, D-C, 2026-08-11) la lista es
   * la MISMA en los dos temas: la rama oscura emite tambien `#statement` --
   * su diapositiva de cierre, con la misma frase y la misma salida a Discord,
   * pasa a ser `<section id="statement">` (anidada dentro de `#story`, que es
   * donde el deck coloca su cierre; el orden del documento sale identico).
   * Este fichero es exactamente el "contrato de estructura que vive en OTRO
   * fichero" de la leccion del 2026-08-06: cualquier entrega que anada o
   * quite un elemento de nivel de seccion pasa por aqui.
   *
   * El orden se sigue aseverando ENTERO, no relajado a "contiene": es la
   * unica propiedad que este test protege, y una lista parcial dejaria pasar
   * que una seccion se colara en medio de otras dos.
   */
  it("en tema claro (por defecto, sin nada guardado) monta las 5 secciones, en orden story/statement/journey/features/contact", () => {
    const { container } = renderWithProviders(<HomeSections />);

    const ids = Array.from(container.querySelectorAll("section")).map(
      (el) => el.id,
    );
    expect(ids).toEqual([
      "story",
      "statement",
      "journey",
      "features",
      "about",
      "contact",
    ]);
  });

  it("en tema claro, el titulo real de Story esta presente (region con nombre accesible)", () => {
    renderWithProviders(<HomeSections />);

    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.story.titleLead) &&
        accessibleName.includes(esHome.Home.story.titleAccent),
    });
    expect(region).toHaveAttribute("id", "story");
  });

  /*
   * El complementario del de arriba, y desde la Task 15 su ESPEJO EXACTO: la
   * misma lista, con las mismas cinco secciones y en el mismo orden. Que las
   * dos aserciones sean identicas ES el candado -- mientras lo sean, ninguna
   * rama tiene una seccion que la otra no tenga. Si una entrega futura las
   * separa otra vez, este par de tests lo dice en el acto.
   *
   * PRECIO de ese espejo, y por que hace falta la ultima asercion: mientras
   * las dos listas fueron DISTINTAS (5 en claro, 4 en oscuro), este test
   * cazaba de rebote una regresion de hidratacion -- si el arbol oscuro no
   * llegaba a montarse, la lista se quedaba en la clara y el `toEqual`
   * fallaba. Siendo identicas eso deja de ser cierto: el test pasaria aunque
   * el tema nunca hidratara a oscuro. Se recupera la propiedad con un
   * marcador EXCLUSIVO del arbol oscuro (`[data-slide-index]`: el deck de
   * diapositivas de Story, que la rama clara no monta jamas). Sin el, el
   * fichero pierde la unica pieza capaz de distinguir "monta las secciones de
   * la rama oscura" de "monta las de la clara".
   */
  it("en tema oscuro (guardado en localStorage) monta las MISMAS 5 secciones que en claro, en el mismo orden", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<HomeSections />);

    await waitFor(() => {
      const ids = Array.from(container.querySelectorAll("section")).map(
        (el) => el.id,
      );
      expect(ids).toEqual([
        "story",
        "statement",
        "journey",
        "features",
        "about",
        "contact",
      ]);
      expect(
        container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse: sin deck de diapositivas, la lista de secciones de arriba es la de la rama CLARA",
      ).toBeGreaterThan(0);
    });
  });

  /*
   * Paridad de CONTENIDO entre ramas (Task 15, D-C), no solo de estructura:
   * un candado que renderiza las dos y compara los textos que cada una
   * ofrece para las claves que la unificacion toca. No compara el arbol
   * entero -- el arte y el vehiculo de presentacion SI ramifican por tema, y
   * exigir igualdad literal ahi seria exigir un solo diseno -- sino las
   * piezas concretas cuya divergencia senalaron las auditorias: el h2 de
   * Features, su kicker y su parrafo de entrada, y la frase de cierre de
   * Story con su enlace de comunidad.
   */
  it("Task 15: el h2/kicker/intro de Features y la frase de cierre de Story dicen lo MISMO en los dos temas", async () => {
    const textos = [
      esHome.Home.features.kicker,
      esHome.Home.features.title,
      esHome.Home.features.intro,
      esHome.Home.story.statement.third,
      esHome.Home.story.communityLink,
    ];

    const claro = renderWithProviders(<HomeSections />);
    for (const texto of textos) {
      expect(claro.container.textContent, `falta en CLARO: ${texto}`).toContain(
        texto,
      );
    }
    claro.unmount();

    window.localStorage.setItem("vti-theme", "dark");
    const oscuro = renderWithProviders(<HomeSections />);
    await waitFor(() => {
      // Mismo marcador exclusivo que el test de arriba, y por el mismo
      // motivo: sin el, este candado pasaria comparando la rama clara
      // consigo misma.
      expect(
        oscuro.container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse",
      ).toBeGreaterThan(0);
      for (const texto of textos) {
        expect(
          oscuro.container.textContent,
          `falta en OSCURO: ${texto}`,
        ).toContain(texto);
      }
    });
  });

  /*
   * Task 16 (unificacion parte 2, 2026-08-11): el mismo candado de paridad,
   * ahora sobre Journey y Contacto. Dos mitades distintas:
   *
   * - TEXTO: los seis pasos de Journey y toda la copia del bloque de
   *   contacto. Los ORDINALES ("01".."06") NO entran en esta lista: son
   *   visibles solo en la rama clara por decision del dueno (D16 de la spec
   *   de las 8 diapositivas, reconfirmada el 2026-08-11) y la oscura da su
   *   senal de posicion con texto para lector de pantalla, que se verifica
   *   en Journey.test.tsx. Lo que ESTE fichero protege es que ninguna rama
   *   se quede sin la senal, cada una en su forma.
   * - SALIDAS Y CONTROLES: que en las DOS ramas haya un `<form>` con un
   *   campo de correo real y enlaces a Discord y GitHub. Esta mitad es la
   *   que de verdad cierra el hallazgo #1 de la critica del 2026-08-11 --
   *   la rama clara tenia el texto "correo" por todas partes y ni un solo
   *   control con el que escribirlo.
   */
  it("Task 16: los pasos de Journey, la senal de posicion y el formulario + salidas de Contacto existen en los DOS temas", async () => {
    const posicionOscura = esHome.Home.journey.stepPosition
      .replace("{{current}}", "1")
      .replace("{{total}}", "6");
    const textos = [
      esHome.Home.journey.steps.discover.label,
      esHome.Home.journey.steps.evolve.label,
      esHome.Home.contact.form.label,
      esHome.Home.contact.form.submit,
      esHome.Home.contact.cards.community.title,
      esHome.Home.contact.cards.code.title,
    ];

    function comprobar(container: HTMLElement, rama: string): void {
      for (const texto of textos) {
        expect(container.textContent, `falta en ${rama}: ${texto}`).toContain(
          texto,
        );
      }
      const form = container.querySelector("form");
      expect(form, `sin <form> en ${rama}`).not.toBeNull();
      expect(
        form?.querySelector('input[type="email"]'),
        `sin campo de correo real en ${rama}`,
      ).not.toBeNull();
      expect(
        container.querySelector('a[href*="discord"]'),
        `sin salida a Discord en ${rama}`,
      ).not.toBeNull();
      expect(
        container.querySelector('a[href*="github"]'),
        `sin salida a GitHub en ${rama}`,
      ).not.toBeNull();
    }

    const claro = renderWithProviders(<HomeSections />);
    comprobar(claro.container, "CLARO");
    // Senal de posicion en claro: el ordinal VISIBLE pegado a la etiqueta,
    // verbatim del mockup aprobado.
    expect(claro.container.textContent).toContain(
      `01 · ${esHome.Home.journey.steps.discover.label}`,
    );
    expect(claro.container.textContent).not.toContain(posicionOscura);
    claro.unmount();

    window.localStorage.setItem("vti-theme", "dark");
    const oscuro = renderWithProviders(<HomeSections />);
    await waitFor(() => {
      expect(
        oscuro.container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse",
      ).toBeGreaterThan(0);
      comprobar(oscuro.container, "OSCURO");
      // Senal de posicion en oscuro: las mismas palabras, solo para lector
      // de pantalla, y sin ningun ordinal visible.
      expect(oscuro.container.textContent).toContain(posicionOscura);
      expect(oscuro.container.textContent).not.toContain(
        `01 · ${esHome.Home.journey.steps.discover.label}`,
      );
    });
  });
});
