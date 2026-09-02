import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import { links } from "@/config/links";
import { About } from "./About";

/*
 * `About` usa `useReveal`, que monta un IntersectionObserver. Mismo stub
 * mínimo que el resto de secciones: jsdom no lo implementa y sin él el render
 * lanza.
 */
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
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("About", () => {
  it("es una region con nombre accesible, anclada en #about", () => {
    const { container } = renderWithProviders(<About />);

    const section = container.querySelector("section");
    expect(section).toHaveAttribute("id", "about");
    expect(screen.getByRole("region", { name: esHome.Home.about.title })).toBe(
      section,
    );
  });

  /*
   * NO ESCRIBE `data-inview`, Y ESO ES UNA PREMISA DE OTRO MÓDULO (regla 41;
   * decisión del dueño D2, 2026-09-02, que mete `about` en el scrollspy).
   *
   * Esa señal la escribe `useSectionProgress`, y esta sección no lo monta:
   * es plana a propósito -- sin escena, sin deck y sin parallax cuyo progreso
   * describir (ver su docblock). `useActiveSection` depende de ello en las
   * DOS direcciones, así que el día que alguien le dé un parallax a esta
   * sección tiene que leer esto antes:
   *
   * - En la rama CLARA, `about` es la única sección que no declara la señal,
   *   y por eso entra al camino normal por geometría.
   * - En la OSCURA no la declara NADIE, y de eso depende que el módulo entero
   *   caiga al camino por geometría. Si esta sección empezara a escribirla,
   *   sería la única del árbol oscuro que lo hace: el camino normal se
   *   activaría con una sola candidata posible y el resaltado se apagaría en
   *   las otras cuatro secciones.
   *
   * Se afirma sobre el elemento con `id="about"` -- el que `useActiveSection`
   * consulta por `getElementById` -- y no sobre "el componente no importa el
   * hook": lo que el otro módulo lee es el atributo, no el import.
   */
  it("no declara data-inview: el scrollspy la resuelve por geometría en las dos ramas", () => {
    const { container } = renderWithProviders(<About />);

    const section = container.querySelector("#about") as HTMLElement;
    expect(section).not.toBeNull();
    expect(
      section.dataset.inview,
      "About empezó a escribir data-inview: en la rama oscura sería la única, y apagaría el resaltado de las otras cuatro secciones",
    ).toBeUndefined();
  });

  /* El encabezado es `h2` REAL, no un párrafo con aspecto de título: es lo que
     permite que un buscador o un asistente cite el bloque como respuesta a
     "¿qué es VoidToInfinite?". Un `div` estilado se vería igual y no serviría
     para nada de eso. */
  it("el título es un h2 de verdad", () => {
    renderWithProviders(<About />);

    expect(
      screen.getByRole("heading", { level: 2, name: esHome.Home.about.title }),
    ).toBeInTheDocument();
  });

  it("pinta los tres párrafos del bloque, comparados contra el JSON", () => {
    const { container } = renderWithProviders(<About />);
    const texto = container.textContent ?? "";

    expect(texto).toContain(esHome.Home.about.what);
    expect(texto).toContain(esHome.Home.about.sdk);
    expect(texto).toContain(esHome.Home.about.proof);
  });

  /*
   * CANDADOS DE VERACIDAD. El resto de este fichero no comprueba que el
   * componente funcione: comprueba que no MIENTA. Son las tres afirmaciones
   * que el dueño respondió en la Fase 0 (`PRODUCT.md` §10, puntos 12, 15 y
   * 21) y que un copy futuro podría deshacer sin que ningún test de render lo
   * notara.
   */
  describe("veracidad del bloque de hechos", () => {
    /* Punto 15: `dev.voidtoinfinite.com` se verificó el 2026-08-13 y es un
       placeholder sin contenido. Enlazarlo como prueba llevaría al visitante a
       una página vacía, que es peor que no enseñar nada. */
    it("no enlaza el SDK como prueba: su destino es hoy un placeholder", () => {
      const { container } = renderWithProviders(<About />);

      expect(container.querySelectorAll("a")).toHaveLength(0);
      expect(container.textContent).not.toContain(links.sdk);
      expect(container.textContent).not.toContain("dev.voidtoinfinite.com");
    });

    /* Punto 21: no hay métricas reales y no se inventa ninguna. La ausencia de
       prueba social fabricada es de lo poco que las tres auditorías del
       2026-08-08 elogian sin reservas, así que se protege con un candado en
       vez de con buena voluntad.

       El año declarado (2020) es el ÚNICO número admitido: es un hecho del
       dueño, no una métrica. Cualquier otra cifra en este bloque sería una
       afirmación cuantitativa que nadie puede sostener. */
    it("no contiene ninguna cifra salvo el año declarado", () => {
      for (const [idioma, copy] of [
        ["es", esHome.Home.about],
        ["en", enHome.Home.about],
      ] as const) {
        const texto = [copy.what, copy.sdk, copy.proof].join(" ");
        const numeros = texto.match(/\d+/g) ?? [];

        expect(numeros, `${idioma}: cifras encontradas`).toEqual(["2020"]);
      }
    });

    /* Punto 12: no existe una plataforma detrás de las menciones de Features.
       El bloque describe un proyecto y un recorrido; declararlo "plataforma",
       "producto" o "servicio" en positivo lo convertiría en la misma promesa
       vacía que esta entrega vino a retirar. */
    it("no se presenta como plataforma, producto ni servicio", () => {
      const prohibidas = {
        es: ["nuestra plataforma", "el producto", "nuestro servicio"],
        en: ["our platform", "the product", "our service"],
      };

      for (const [idioma, copy] of [
        ["es", esHome.Home.about],
        ["en", enHome.Home.about],
      ] as const) {
        const texto = [copy.what, copy.sdk, copy.proof].join(" ").toLowerCase();
        for (const frase of prohibidas[idioma]) {
          expect(texto, `${idioma}: "${frase}"`).not.toContain(frase);
        }
      }
    });
  });

  it("el bloque existe completo en los dos idiomas", async () => {
    const claves = ["title", "what", "sdk", "proof"] as const;

    for (const clave of claves) {
      expect(esHome.Home.about[clave].trim()).not.toBe("");
      expect(enHome.Home.about[clave].trim()).not.toBe("");
      // Traducido de verdad, no copiado: si coincidieran, o falta la
      // traduccion o alguien duplico el español.
      expect(enHome.Home.about[clave]).not.toBe(esHome.Home.about[clave]);
    }

    await i18n.changeLanguage("en");
    renderWithProviders(<About />);
    expect(
      screen.getByRole("heading", { level: 2, name: enHome.Home.about.title }),
    ).toBeInTheDocument();
    await i18n.changeLanguage("es");
  });
});

/*
 * Critica externa #13 (2026-08-19), P0 de la ronda: WCAG 2.1 SC 1.4.4 (AA).
 * Ver el docblock equivalente en `Story.test.tsx` para el mecanismo completo.
 * Medido en Chrome real a 390x844 con la raiz a 32px: sin `grid-template-
 * columns` propio, esta seccion creaba una pista IMPLICITA de tamano `auto`
 * cuyo minimo es el min-content de su contenido -- el termino de marca del h2
 * aportaba 412px dentro de una caja de 294px y el bloque entero terminaba en
 * x=460.3 sobre un viewport de 390, sin scroll horizontal que lo recuperase
 * (`html` declara `overflow-x: clip`, regla 21). Las dos declaraciones son
 * necesarias y ninguna sustituye a la otra: la pista acota la CAJA, el
 * overflow-wrap permite que la palabra larga quepa DENTRO de esa caja.
 *
 * Candado de CSSOM, no de geometria: jsdom no hace layout.
 */
describe("About: critica #13 -- ampliar la fuente no recorta texto (SC 1.4.4)", () => {
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

  it("ScAbout declara su pista (minmax(0, 1fr)) y overflow-wrap: break-word", () => {
    renderWithProviders(<About />);
    const section = document.getElementById("about") as HTMLElement;
    const css = cssRuleTextFor(section);
    const base = css
      .split("\n")
      .find((line) => !line.includes("@media") && line.includes("display"));

    expect(base).toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/,
    );
    expect(base).toMatch(/overflow-wrap:\s*break-word/);
  });
});
