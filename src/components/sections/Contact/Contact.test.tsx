import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import i18n from "@/i18n/config";
import { links } from "@/config/links";
import { PRESS } from "@/motion/vocabulary";
import { Contact } from "./Contact";
import {
  CONTACT_CARD_BORDER,
  CONTACT_CONTENT_MAX_WIDTH,
  CONTACT_DARK_HEIGHT,
  CONTACT_OVERLAY_RISE,
} from "./contact.layers";
import {
  CONTACT_GUARDIAN_LAYERS,
  CONTACT_GUARDIAN_VOID,
} from "@/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers";
import { FEATURES_TAIL_HOLD } from "@/components/sections/Features/features.layers";
import { themes } from "@/theme/themes";
import { contrastRatio, contrastRatioHex } from "@/theme/tokens/contrast";

/*
 * Reescritura completa (spec 2026-07-28 §7.4, mockup `#contact` L212-238):
 * la tarjeta de degradado pastel, el chip de email + CTA, y la figura con
 * anillos concéntricos sustituyen al Contact viejo (título + párrafo +
 * Button + Socials). `Socials` ya no vive aquí (se muda al footer, spec
 * §7.5) -- el test viejo que comprobaba el camino de contacto por email se
 * reescribe contra el chip/CTA reales del mockup.
 */

/*
 * `trigger` dispara TODAS las instancias de IntersectionObserver vivas, no
 * solo la última creada (D7, encargo 2026-08-04): desde que la rama clara
 * llama a `useSectionProgress` de forma incondicional (ver `Contact()`), un
 * render monta DOS observers a la vez -- el de `useReveal` (sobre `ScCard`,
 * revealRef) y el de `useSectionProgress` (sobre `ScContact`, contactRef).
 * Antes de esta entrega solo existía uno, así que "guardar el callback de
 * la última instancia" bastaba; con dos, el segundo pisaba al primero y
 * `trigger(true)` dejaba de disparar el reveal -- exactamente el fallo que
 * Journey.test.tsx ya documenta para su propio caso de dos observers
 * (`useSlideDeck` + `useSceneParallax`). No hace falta distinguir CUÁL
 * observer es cuál para estos tests (ninguno asevera nada sobre
 * `--contact-progress`): notificar a todos con el mismo valor es suficiente
 * y más simple que el `ioTargets`/`triggerFor` de Journey.
 */
let ioCallbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
function trigger(isIntersecting: boolean): void {
  ioCallbacks.forEach((cb) => cb([{ isIntersecting }]));
}

/**
 * jsdom no implementa `window.matchMedia` -- lo necesitan tanto las guardas
 * de `prefers-reduced-motion` de los componentes como, desde esta entrega,
 * `useSectionProgress` (D7, se llama de forma INCONDICIONAL en `Contact()`,
 * también en la rama clara que la mayoría de estos tests ejercita).
 * `matches: false` en todas las queries: ningún test de este bloque quiere
 * reduced-motion activo por defecto -- los tests que SÍ verifican ese guard
 * lo hacen por TEXTO del CSS inyectado, no por el valor de retorno de
 * `matchMedia` (jsdom no evalúa `@media`, lección repo 2026-07-27), así que
 * este stub no interfiere con ellos.
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

beforeEach(() => {
  ioCallbacks = [];
  stubMatchMedia();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioCallbacks.push(cb);
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * (lección 2026-07-27: jsdom no evalúa NINGÚN `@media`, así que un guard de
 * `prefers-reduced-motion` solo se puede atar inspeccionando el TEXTO de la
 * regla, nunca con `getComputedStyle`). Mismo helper que ya usa
 * `Story.test.tsx`.
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

describe("Contact", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    renderWithProviders(<Contact />);
    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.contact.titleLead) &&
        accessibleName.includes(esHome.Home.contact.titleAccent),
    });
    expect(region).toHaveAccessibleName();
    expect(region).toHaveAttribute("id", "contact");
  });

  it("el h2 concatena titleLead + titleAccent exactamente, y no hay un h1 propio", () => {
    const { container } = renderWithProviders(<Contact />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    const heading = container.querySelector("h2");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(
      `${esHome.Home.contact.titleLead} ${esHome.Home.contact.titleAccent}`,
    );
  });

  // Task 11 (dieta de ornamento A, 2026-08-09): el kicker «Contacto» se
  // retira en las dos ramas -- la clave i18n `Home.contact.kicker` se borró
  // junto con su render (regla 28), así que el literal se hardcodea aquí a
  // propósito, solo como regresión. Verificado con el bug inyectado (ver
  // informe de la tarea): reintroduciendo `<ScKicker>Contacto</ScKicker>`
  // antes del h2 este assert se pone en rojo.
  it("ya NO muestra ningun kicker: la cabecera abre directamente con el h2", () => {
    renderWithProviders(<Contact />);
    expect(screen.queryByText("Contacto")).not.toBeInTheDocument();
  });

  it("el chip muestra el email real, y el CTA enlaza a links.email con su aria-label de i18n", () => {
    renderWithProviders(<Contact />);
    // El email del chip es texto (spec §7.4), no un enlace -- se busca por
    // contenido, no por rol.
    expect(screen.getByText(esHome.Home.contact.email)).toBeInTheDocument();

    const cta = screen.getByRole("link", {
      name: esHome.Home.contact.ctaAria,
    });
    // El href sale de `links.email` importado, no de un literal reescrito a
    // mano: si `links.ts` cambiara, este test lo detectaria.
    expect(cta).toHaveAttribute("href", links.email);
    expect(cta).toHaveTextContent(esHome.Home.contact.cta);
  });

  it("en ingles renderiza la copia inglesa, no la espanola (mitad del contrato de paridad)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Contact />);
      expect(screen.getByText(enHome.Home.contact.email)).toBeInTheDocument();
      expect(
        screen.getByText(enHome.Home.contact.titleAccent),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(esHome.Home.contact.titleAccent),
      ).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  it("la figura lleva alt de i18n y srcset con las dos pistas publicadas", () => {
    renderWithProviders(<Contact />);
    const figure = screen.getByAltText(esHome.Home.contact.figureAlt);

    expect(figure).toHaveAttribute("loading", "lazy");
    expect(figure).toHaveAttribute("decoding", "async");
    const srcSet = figure.getAttribute("srcset") ?? "";
    expect(srcSet).toContain("/figures/contact-waving-640.webp 640w");
    expect(srcSet).toContain("/figures/contact-waving-1024.webp 1024w");
  });

  it("los anillos concentricos son decorativos (aria-hidden) y son tres", () => {
    const { container } = renderWithProviders(<Contact />);
    const rings = container.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    // El SVG del icono del chip TAMBIEN es aria-hidden (decorativo dentro
    // de un chip con texto visible): se localiza el contenedor de anillos
    // por ser el UNICO aria-hidden con exactamente 3 hijos <div>.
    const ringContainers = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).filter((el) => el.children.length === 3);
    expect(ringContainers).toHaveLength(1);
    expect(
      Array.from(ringContainers[0].children).every(
        (child) => child.tagName === "DIV",
      ),
    ).toBe(true);
    expect(rings).toBeTruthy();
  });

  it("revela la tarjeta al intersectar (false -> true)", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;

    expect(card).toHaveAttribute("data-revealed", "false");
    act(() => trigger(true));
    expect(card).toHaveAttribute("data-revealed", "true");
  });

  it("bajo prefers-reduced-motion el reveal de la tarjeta queda forzado a su estado final, sin transicion", () => {
    // Ata el guard por TEXTO del CSS inyectado (jsdom no evalua @media).
    // Validado con el bug inyectado a proposito (lección 2026-07-27): se
    // comentó el bloque `@media (prefers-reduced-motion: reduce)` de
    // `ScCard` en `Contact.tsx` y este test pasó a fallar (la aserción
    // `toContain("prefers-reduced-motion: reduce")` no encontraba el
    // bloque); se restauró el bloque y el test volvió a verde -- ver el
    // reporte de la tarea para la salida literal de ambas corridas.
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("opacity: 1");
    expect(reduceBlock).toContain("transform: none");
  });

  it("la flotacion de la figura solo corre bajo no-preference (apagada bajo reduce por construccion)", () => {
    // Mismo patron que Story.test.tsx: la animacion se declara UNICAMENTE
    // dentro de `@media (prefers-reduced-motion: no-preference)`, asi que
    // bajo `reduce` queda apagada sin necesitar un bloque `reduce` con
    // animation explicito (el que SI existe fuerza ademas `transform: none`).
    renderWithProviders(<Contact />);
    const figure = screen.getByAltText(esHome.Home.contact.figureAlt);
    const css = cssRuleTextFor(figure);

    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("animation:");
    const topLevelRule = css.split("@media")[0];
    expect(topLevelRule).not.toContain("animation:");
  });
});

/**
 * Raíz de `ContactCosmicGuardian` (`ScScene`, `aria-hidden="true"` con las
 * capas WebP como hijas -- `CONTACT_GUARDIAN_LAYERS.length`, NUNCA un número
 * a mano) -- mismo ancla que ya usa el test de "monta la escena", localizada
 * por estructura (`<img>` descendientes) y no por clase de
 * styled-components, que cambia de hash entre builds. A partir de ella se
 * llega SIN ambigüedad al slot pegado (`sceneRoot.parentElement`, D6) y
 * sirve de sonda positiva para la ausencia de `overflow` en `ScContact`
 * (`ScScene` sí declara el suyo, `contactCosmicGuardian.parts.tsx`).
 */
function getSceneRoot(container: HTMLElement): HTMLElement {
  const found = Array.from(
    container.querySelectorAll('[aria-hidden="true"]'),
  ).find(
    (el) =>
      el.querySelectorAll("img").length === CONTACT_GUARDIAN_LAYERS.length,
  );
  if (!found) {
    throw new Error(
      "getSceneRoot: no se encontró la raíz de ContactCosmicGuardian " +
        `(${CONTACT_GUARDIAN_LAYERS.length} <img> aria-hidden)`,
    );
  }
  return found as HTMLElement;
}

describe("Contact en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("monta la escena Cosmic Guardian (CONTACT_GUARDIAN_LAYERS.length capas decorativas) en vez de la tarjeta/anillos/figura de claro", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("sigue mostrando el titulo y el cuerpo con el mismo i18n que en claro, sin kicker (el chip+CTA de claro NO se porta a oscuro, D12/D14; Task 11 retira el kicker de las dos ramas)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent(
      `${esHome.Home.contact.titleLead} ${esHome.Home.contact.titleAccent}`,
    );
    // El cuerpo va seguido de bodySecond dentro del MISMO elemento (separados
    // por un <br/>), así que su texto no coincide EXACTO con ningún nodo --
    // se busca por contención en el texto acumulado del contenedor.
    expect(container.textContent).toContain(esHome.Home.contact.body);
    expect(container.textContent).toContain(esHome.Home.contact.bodySecond);
    // Sonda negativa (Task 11): el literal se hardcodea a propósito -- la
    // clave i18n del kicker se borró junto con su render.
    expect(screen.queryByText("Contacto")).not.toBeInTheDocument();
  });

  it("no hay ninguna imagen con alt de i18n (la figura de claro es una capa decorativa mas aqui)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    expect(
      container.querySelector(`img[alt="${esHome.Home.contact.figureAlt}"]`),
    ).not.toBeInTheDocument();
  });

  // Tests 6-13 de §7.2, spec
  // `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`. Por
  // texto del CSS inyectado (`cssRuleTextFor`) o por DOM/constantes, nunca
  // `getComputedStyle` de algo que jsdom no evalúa (ningún `@media`, lección
  // repo 2026-07-27). Todo test de ausencia lleva su sonda positiva.

  it("declara el solape con Features: margin-block-start negativo de CONTACT_OVERLAY_RISE y z-index 3 (test 6, D2)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#contact") as HTMLElement;
    const css = cssRuleTextFor(section);

    expect(css).toContain(
      `margin-block-start: calc(-1 * ${CONTACT_OVERLAY_RISE})`,
    );
    expect(css).toContain("z-index: 3");
  });

  it("bajo prefers-reduced-motion el solape se anula (margin-block-start: 0) (test 7, D5)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const section = container.querySelector("#contact") as HTMLElement;
    const css = cssRuleTextFor(section);

    // Misma técnica que Features.test.tsx (D6): la MISMA línea tiene que ser
    // a la vez un bloque reduce y mencionar margin-block-start, para no
    // arrastrar el resto del stylesheet acumulado.
    const reduceLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("margin-block-start"),
      );
    expect(reduceLine).toBeDefined();
    expect(reduceLine).toMatch(/margin-block-start:\s*0[;}]/);
  });

  it("la escena vive en un slot pegado (sticky/top 0/height de CONTACT_DARK_HEIGHT, static bajo reduce) y ScContact no declara overflow -- el fallo que rompe el pin en silencio (test 8, D6)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    const sceneRoot = getSceneRoot(container);
    const slot = sceneRoot.parentElement as HTMLElement;
    const slotCss = cssRuleTextFor(slot);

    expect(slotCss).toContain("position: sticky");
    expect(slotCss).toContain("top: 0");
    expect(slotCss).toContain(`height: ${CONTACT_DARK_HEIGHT}`);

    const slotReduceLine = slotCss
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("position"),
      );
    expect(slotReduceLine).toBeDefined();
    expect(slotReduceLine).toMatch(/position:\s*static/);

    // Sonda positiva: ScScene (la propia escena) SÍ declara `overflow:
    // hidden` (contactNeonGalaxy.parts.tsx) -- así la ausencia de abajo no
    // pasa por vacuidad, el mecanismo detecta "overflow" cuando existe.
    const sceneCss = cssRuleTextFor(sceneRoot);
    expect(sceneCss).toContain("overflow: hidden");

    const sectionCss = cssRuleTextFor(
      container.querySelector("#contact") as HTMLElement,
    );
    expect(sectionCss).not.toMatch(/overflow/);
  });

  it("el marco topa el CONTENIDO con CONTACT_CONTENT_MAX_WIDTH, no un literal a mano (test 9, D6)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    // `SectionBeam` tiene su PROPIO `useReveal` y también escribe
    // `data-revealed` en su contenedor (`aria-hidden="true"`, primer hijo de
    // `ScContact`) -- filtrar por ese atributo a secas coge el suyo, no el de
    // `ScDarkContent`. Se descarta explícitamente el aria-hidden para llegar
    // al `data-revealed` real del contenido.
    const revealedEl = Array.from(
      container.querySelectorAll("[data-revealed]"),
    ).find((el) => el.getAttribute("aria-hidden") !== "true") as HTMLElement;
    const frame = revealedEl.parentElement as HTMLElement;
    const frameCss = cssRuleTextFor(frame);

    expect(frameCss).toContain(`max-width: ${CONTACT_CONTENT_MAX_WIDTH}`);
  });

  it("el contenido oscuro se espeja a la izquierda: declara margin-inline-end: auto y NO margin-inline-start: auto -- es el lado, justo lo que decide este cambio (Cosmic Guardian deja su figura en la mitad DERECHA del lienzo)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    // Mismo ancla que el test anterior: `ScDarkContent` es el ÚNICO
    // `[data-revealed]` que no es el `aria-hidden="true"` de `SectionBeam`.
    const revealedEl = Array.from(
      container.querySelectorAll("[data-revealed]"),
    ).find((el) => el.getAttribute("aria-hidden") !== "true") as HTMLElement;
    const css = cssRuleTextFor(revealedEl);

    // Sonda positiva: se afirma PRIMERO que el mecanismo (cssRuleTextFor +
    // toContain) encuentra `margin-inline-end: auto` de verdad -- si el CSS
    // inyectado estuviera vacío o el ancla fuera la equivocada, esta
    // aserción positiva fallaría antes que la de ausencia de abajo, así que
    // esa ausencia no puede colarse por vacuidad del propio mecanismo.
    expect(css).toContain("margin-inline-end: auto");
    expect(css).not.toContain("margin-inline-start: auto");
  });

  /*
   * SUSTITUYE al test que afirmaba 3 tarjetas (email/discord/github). La
   * tarjeta de correo se retiró el 2026-08-04: el formulario ya arranca con
   * `links.email` como valor por defecto (ver el test del valor inicial,
   * más abajo), así que mostrarlo también en una tarjeta era el mismo dato
   * repetido. Quedan las dos tarjetas restantes, Comunidad y Código.
   */
  it("hay exactamente 2 tarjetas de contacto con href a links.discord/github importados, cada una con su icono aria-hidden", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });

    const cardLinks = screen.getAllByRole("link");
    expect(cardLinks).toHaveLength(2);

    const hrefs = cardLinks.map((el) => el.getAttribute("href"));
    expect(hrefs.sort()).toEqual([links.discord, links.github].sort());

    cardLinks.forEach((link) => {
      expect(link.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    // Sonda de la retirada: la tarjeta de correo ya no existe en el DOM.
    expect(
      screen.queryByText(esHome.Home.contact.cards.community.title),
    ).toBeInTheDocument();
    expect(
      container.querySelector(`a[href="${links.email}"]`),
    ).not.toBeInTheDocument();
  });

  it("el formulario tiene exactamente un control (email, required) y exactamente un boton type=submit (test 11, D12)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toBeInTheDocument();

    const controls = within(form).getAllByRole("textbox");
    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAttribute("type", "email");
    expect(controls[0]).toHaveAttribute("required");
    expect(controls[0]).toHaveAccessibleName(esHome.Home.contact.form.label);

    const submitButtons = form.querySelectorAll('button[type="submit"]');
    expect(submitButtons).toHaveLength(1);
  });

  /*
   * SUSTITUYE al test que afirmaba que el campo arrancaba prerrellenado con
   * `links.email` (retirado task 1, auditoría premium 2026-08-08, P0
   * confianza): un formulario de contacto que arranca con la dirección DE
   * LA PROPIA EMPRESA ya escrita leía como VTI escribiéndose a sí misma. El
   * placeholder (`form.placeholder`) sigue existiendo y ahora por fin se ve.
   */
  it("el campo de correo arranca vacio (el placeholder pasa a verse, no prerrellenado con links.email)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });

    const input = screen.getByLabelText(
      esHome.Home.contact.form.label,
    ) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input).toHaveAttribute(
      "placeholder",
      esHome.Home.contact.form.placeholder,
    );
  });

  /*
   * SUSTITUYE al test "al enviar SIN editar el campo, el correo por defecto
   * llega en el cuerpo del mailto": con el campo ahora vacío por defecto,
   * enviar SIN editar es precisamente el caso "vacío" que la validación
   * propia (task 1) tiene que atrapar -- ya no navega, y pinta el error
   * accesible en vez de partir hacia `links.email` sin que el visitante haya
   * escrito nada.
   */
  it("al enviar con el campo vacio, NO navega y pinta el error de validacion con role=status (task 1, item 2/5)", async () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });

      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(assignSpy).not.toHaveBeenCalled();
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(esHome.Home.contact.form.emailError);
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      expect(input).toHaveAttribute("aria-invalid", "true");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("al enviar con un valor sin forma de correo (sin arroba), NO navega y pinta el mismo error de validacion", async () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });

      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "no-es-un-correo" } });
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(assignSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent(
        esHome.Home.contact.form.emailError,
      );
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("corregir el valor tras un error lo retira de inmediato, sin esperar a un nuevo submit", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });

    const input = screen.getByLabelText(esHome.Home.contact.form.label);
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    expect(screen.getByRole("status")).toHaveTextContent(
      esHome.Home.contact.form.emailError,
    );

    fireEvent.change(input, { target: { value: "v" } });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("al enviar navega a una URL que empieza por links.email con el correo escrito en el cuerpo, y no aparece ningun texto de exito (test 12, D13)", async () => {
    // `vi.spyOn(window.location, "assign")` no vale en este jsdom: `assign`
    // es una propiedad PROPIA de la instancia `Location` con
    // `configurable: false` (medido en este repo) -- `spyOn` necesita
    // redefinirla y lanza `TypeError: Cannot redefine property`. La vía que
    // SÍ funciona es `Object.defineProperty` reemplazando el objeto
    // `window.location` ENTERO por una copia con `assign` mockeado (la otra
    // alternativa que cita el encargo), restaurado en el `finally`.
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });

      const input = screen.getByLabelText(
        esHome.Home.contact.form.label,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(assignSpy).toHaveBeenCalledTimes(1);
      const url = assignSpy.mock.calls[0][0] as string;
      expect(url.startsWith(links.email)).toBe(true);
      expect(url).toContain(encodeURIComponent("visitante@test.com"));
      expect(screen.queryByText(/mensaje enviado/i)).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  /*
   * Task 1 (auditoría premium 2026-08-08), item 3: resuelve "mailto sin
   * cliente de correo instalado = botón que no hace nada visible". El panel
   * NO existe antes del envío (sonda positiva de ausencia) y aparece
   * DESPUÉS de un submit válido, con la dirección real en texto plano y un
   * botón «Copiar» -- nunca antes.
   */
  it("un submit valido revela el panel de fallback con la direccion real en texto plano y el boton Copiar (task 1, item 3/5)", async () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });

      const plainEmail = links.email.replace(/^mailto:/, "");
      expect(screen.queryByText(plainEmail)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        }),
      ).not.toBeInTheDocument();

      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(assignSpy).toHaveBeenCalledTimes(1);
      const panel = screen.getByText(plainEmail).closest('[role="status"]');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveTextContent(esHome.Home.contact.form.fallbackLead);
      expect(
        screen.getByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        }),
      ).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  // Regla 27: un control nunca se deshabilita como consecuencia de su
  // propia activación -- deshabilitarlo en ese instante le arranca el foco
  // a quien lo estaba operando por teclado. El botón de envío no tiene
  // ningún estado "en curso" que representar (la navegación es síncrona),
  // así que no lleva `disabled` ni antes ni después de un envío.
  it("el boton de envio nunca lleva el atributo disabled, ni antes ni despues de un envio valido (regla 27, task 1 item 4/5)", async () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });

      const button = container.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(button).not.toBeDisabled();

      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      expect(button).not.toBeDisabled();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  describe("boton Copiar (navigator.clipboard)", () => {
    afterEach(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
    });

    async function submitValidEmail(container: HTMLElement): Promise<void> {
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    }

    it("escribe la direccion real (sin mailto:) en el portapapeles, cambia el texto del boton a la clave copied y NO muestra el mensaje de error (task 3)", async () => {
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, assign: vi.fn() },
      });
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      try {
        const { container } = renderWithProviders(<Contact />);
        await submitValidEmail(container);

        const copyButton = screen.getByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        });
        await act(async () => {
          fireEvent.click(copyButton);
        });

        expect(writeText).toHaveBeenCalledWith(
          links.email.replace(/^mailto:/, ""),
        );
        expect(
          screen.getByRole("button", {
            name: esHome.Home.contact.form.copied,
          }),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(esHome.Home.contact.form.copyError),
        ).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        });
      }
    });

    /*
     * Task 3 (tres cierres pequeños, 2026-08-10): hasta esta tarea, sin
     * `navigator.clipboard` disponible, el fallo era silencioso -- el texto
     * del boton no cambiaba a nada, sin ninguna senal para el usuario. Ahora
     * revela `Home.contact.form.copyError`, un mensaje que senala la
     * direccion YA seleccionable del parrafo de arriba (`ScFallbackEmail`),
     * sin inventar un camino de copia nuevo. Sonda negativa incluida: el
     * mensaje NO existe antes del click.
     */
    it("sin navigator.clipboard disponible, revela el mensaje de error (copyError) senalando la direccion ya seleccionable; el texto del boton no cambia a copied", async () => {
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, assign: vi.fn() },
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
      try {
        const { container } = renderWithProviders(<Contact />);
        await submitValidEmail(container);

        expect(
          screen.queryByText(esHome.Home.contact.form.copyError),
        ).not.toBeInTheDocument();

        const copyButton = screen.getByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        });
        await act(async () => {
          fireEvent.click(copyButton);
        });

        expect(
          screen.getByRole("button", {
            name: esHome.Home.contact.form.copyAddress,
          }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", {
            name: esHome.Home.contact.form.copied,
          }),
        ).not.toBeInTheDocument();

        const errorMessage = screen.getByText(
          esHome.Home.contact.form.copyError,
        );
        expect(errorMessage).toBeInTheDocument();
        // Vive dentro del MISMO role="status" que ya declara el panel
        // (patron existente desde task 1): no hace falta un role propio.
        expect(errorMessage.closest('[role="status"]')).toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        });
      }
    });

    /*
     * Segundo modo de fallo (task 3): la API existe pero `writeText`
     * RECHAZA (permiso denegado, origen no seguro tratado por el propio
     * navegador, etc.) -- distinto del caso "API ausente" de arriba, y el
     * unico que ejercita la rama `catch` de `handleCopy`. Converge en el
     * MISMO mensaje `copyError`.
     */
    it("si navigator.clipboard.writeText rechaza, revela el mismo mensaje de error (copyError)", async () => {
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, assign: vi.fn() },
      });
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      try {
        const { container } = renderWithProviders(<Contact />);
        await submitValidEmail(container);

        const copyButton = screen.getByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        });
        await act(async () => {
          fireEvent.click(copyButton);
        });

        expect(writeText).toHaveBeenCalledWith(
          links.email.replace(/^mailto:/, ""),
        );
        expect(
          screen.getByText(esHome.Home.contact.form.copyError),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", {
            name: esHome.Home.contact.form.copied,
          }),
        ).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        });
      }
    });
  });

  it("no existe ninguna clave i18n ni ningun nodo con la afirmacion de mensaje enviado (test 13, D13)", async () => {
    const esJson = JSON.stringify(esHome.Home.contact).toLowerCase();
    const enJson = JSON.stringify(enHome.Home.contact).toLowerCase();
    expect(esJson).not.toContain("mensaje enviado");
    expect(enJson).not.toContain("message sent");

    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    expect(screen.queryByText(/mensaje enviado/i)).not.toBeInTheDocument();
  });

  // Falsable (verificado a mano, ver informe): quitar el bloque
  // `&:hover:not(:disabled) { background-image: ... }` de `ScSubmitButton`
  // (o adelantarlo antes de la declaración base) pone este test en rojo.
  it("el boton de envio declara background-image en reposo Y en :hover:not(:disabled), con la segunda DESPUES de la base -- lo unico que hace que gane la cascada", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(button);

    const firstBgImageIdx = css.indexOf("background-image");
    expect(firstBgImageIdx).toBeGreaterThan(-1);

    // El botón también carga la regla PROPIA de `Button.tsx` (variante
    // `solid`), que declara su propio `&:hover:not(:disabled)` (con
    // `background`, no `background-image`) y aparece ANTES en el CSS
    // acumulado -- por eso la búsqueda del selector de hover empieza DESDE
    // `firstBgImageIdx`: el primer "background-image" solo puede vivir en la
    // regla de `ScSubmitButton` (es la única que declara esa propiedad), así
    // que cualquier `:hover:not(:disabled)` a partir de ahí es el de ESA
    // regla, no el de `Button.tsx`.
    const hoverSelectorIdx = css.indexOf(
      ":hover:not(:disabled)",
      firstBgImageIdx,
    );
    expect(hoverSelectorIdx).toBeGreaterThan(firstBgImageIdx);

    const secondBgImageIdx = css.indexOf("background-image", hoverSelectorIdx);
    expect(secondBgImageIdx).toBeGreaterThan(hoverSelectorIdx);
  });

  // Falsable: quitar el bloque `@media (prefers-reduced-motion: reduce) {
  // animation: none; }` de `ScSubmitButton` pone este test en rojo (verificado
  // a mano, mismo procedimiento que el resto de guards de esta suite).
  it("el degradado animado del boton de envio solo corre bajo no-preference, con animation: none explicito bajo reduce (heroGradient/gradientShift, 2026-08-04)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(button);

    // Sonda positiva: SI ve animation: bajo no-preference -- si no la viera,
    // el assert de ausencia de mas abajo pasaria por vacuidad.
    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("animation:");

    const reduceLine = css
      .split("\n")
      .find(
        (line) =>
          line.includes("prefers-reduced-motion: reduce") &&
          line.includes("animation:"),
      );
    expect(reduceLine).toBeDefined();
    expect(reduceLine as string).toContain("animation: none");
  });
});

/*
 * Contraste AA del mensaje de error del boton Copiar (Task 3, "tres cierres
 * pequeños", 2026-08-10). `ScCopyErrorText` solo pinta contra el fondo REAL
 * de `ScFallbackPanel` (`semantic.surfaceSunken`, opaco -- no un
 * `color-mix()`, asi que no hace falta reproducir ninguna mezcla a mano,
 * lección repo 2026-08-06), y ese panel solo existe en la rama OSCURA (el
 * formulario no se monta en la rama clara -- ver el `return` de
 * `Contact.tsx`): por eso se mide solo `themes.dark`, no los dos temas como
 * hace el candado generico de `contrast.test.ts` (ese mide `error` contra
 * `bg`, no contra `surfaceSunken`, que es el fondo que aplica aqui).
 */
describe("Contact: Task 3, mensaje de error del boton Copiar (contraste AA)", () => {
  it("semantic.error sobre semantic.surfaceSunken (fondo real de ScFallbackPanel, tema oscuro) cumple AA texto normal (4.5:1)", () => {
    const { semantic } = themes.dark;
    const ratio = contrastRatio(semantic.error, semantic.surfaceSunken);
    expect(
      ratio,
      `contraste ${ratio.toFixed(2)}:1, por debajo de AA (4.5:1)`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});

/*
 * Espejo Cosmic Guardian (2026-08-04): `Contact.tsx` sustituyó por completo a
 * `ContactNeonGalaxy` -- este test cierra el candado de que el módulo de la
 * SECCIÓN (el componente, no `contact.layers.ts`, cuyos docblocks SÍ citan
 * la escena saliente a propósito, en prosa, para explicar el porqué del
 * espejado -- mismo criterio que `footer.layers.test.ts` con `Math.random`)
 * no arrastra ningún import, JSX ni comentario de la escena retirada.
 */
describe("Contact.tsx: el módulo de la sección ya no menciona la escena saliente (Neon Galaxy)", () => {
  it("ni el import, ni el JSX, ni ningún comentario mencionan ContactNeonGalaxy ni la ruta neon-galaxy", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "Contact.tsx"), "utf-8");

    // Sonda positiva: el fichero SÍ tiene que mencionar la escena nueva --
    // así una lectura vacía o del fichero equivocado no dejaría pasar la
    // ausencia de abajo por vacuidad.
    expect(source).toContain("ContactCosmicGuardian");
    expect(source).not.toContain("ContactNeonGalaxy");
    expect(source).not.toContain("neon-galaxy");
  });
});

/*
 * Invariante D4 (spec `2026-08-03-contacto-footer-oscuro-design.md`, test
 * §7.2.6bis / §4). Es el único punto del repo donde los datos de Contacto y
 * Features se miran a la cara: el solape con el que Contacto sube
 * (`CONTACT_OVERLAY_RISE`) y la zona de hold al final de Features
 * (`FEATURES_TAIL_HOLD`) TIENEN que medir lo mismo -- si el solape es mayor,
 * Contacto tapa contenido real de Features; si es menor, asoma una banda de
 * fondo plano sin escena detrás. Los ficheros de datos de cada sección no se
 * importan entre sí a propósito (acoplarlos mezclaría los datos de dos
 * secciones que no se conocen), así que la igualdad no puede vivir en
 * ninguno de los dos: vive aquí, en la sección que SUBE (mismo criterio que
 * la invariante Journey↔Features vive en `Features.test.tsx`).
 */
describe("invariante solape de Contacto ↔ hold de Features (D4)", () => {
  it("CONTACT_OVERLAY_RISE y FEATURES_TAIL_HOLD miden EXACTAMENTE lo mismo", () => {
    expect(CONTACT_OVERLAY_RISE).toBe(FEATURES_TAIL_HOLD);
  });
});

/*
 * Objetivo 1 (D4, ajuste visual 2026-08-08): la rama CLARA baja a
 * `min-height: 50dvh` -- media pantalla mínima, no una pantalla completa --
 * conservando el centrado vertical de la entrega anterior. `flex-direction:
 * column` (no el defecto `row`): ver el docblock de `ScContact` en
 * `Contact.tsx` para el porqué (con `row` la tarjeta, sin `flex-grow`,
 * dejaría de estirarse al ancho del contenedor).
 */
describe("Objetivo 1 (D4): tema claro con min-height 50dvh y tarjeta centrada", () => {
  it("ScContact (rama clara) declara min-height: 50dvh y centra con flex-direction column + justify-content center", () => {
    const { container } = renderWithProviders(<Contact />);
    const section = container.querySelector("#contact") as HTMLElement;
    const css = cssRuleTextFor(section);

    expect(css).toContain("min-height: 50dvh");
    expect(css).toContain("flex-direction: column");
    expect(css).toContain("justify-content: center");
  });
});

/*
 * Objetivo 2 / D7 (encargo 2026-08-04): `useSectionProgress` se llama de
 * forma incondicional en `Contact()` y se ata SOLO al `<ScContact>` de la
 * rama clara (`contactRef`). Test FUNCIONAL, no solo de CSS: dispara el
 * IntersectionObserver mockeado y comprueba que el hook escribe de verdad
 * `--contact-enter`/`--contact-progress` sobre el elemento.
 */
describe("D7/D1: progreso de scroll de la rama clara (useSectionProgress)", () => {
  it("escribe --contact-enter/--contact-progress sobre ScContact al intersecar, y no --section-* (prefix propio)", () => {
    const { container } = renderWithProviders(<Contact />);
    const section = container.querySelector("#contact") as HTMLElement;

    expect(section.style.getPropertyValue("--contact-progress")).toBe("");
    act(() => trigger(true));

    expect(section.style.getPropertyValue("--contact-enter")).not.toBe("");
    expect(section.style.getPropertyValue("--contact-progress")).not.toBe("");
    expect(section.style.getPropertyValue("--section-enter")).toBe("");
  });

  it("ScFigureWrap y ScRings se desplazan ligados a --contact-progress (sentidos opuestos), con guard de reduced-motion", () => {
    const { container } = renderWithProviders(<Contact />);
    // ScFigureWrap se localiza por ser el padre de la figura de i18n.
    // ScRings, mismo ancla que el test "los anillos concentricos..." de
    // arriba: es el UNICO aria-hidden con exactamente 3 hijos <div> (el
    // ChipIcon de la rama clara TAMBIEN es aria-hidden y precede a ScRings
    // en el DOM, así que un simple primer-match se equivocaría de nodo).
    const figureWrap = (
      container.querySelector(
        `img[alt="${esHome.Home.contact.figureAlt}"]`,
      ) as HTMLElement
    ).parentElement as HTMLElement;
    const ringsWrap = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).find((el) => el.children.length === 3) as HTMLElement;
    const ringsCss = cssRuleTextFor(ringsWrap);
    const figureWrapCss = cssRuleTextFor(figureWrap);

    expect(figureWrapCss).toContain("translateY(");
    expect(figureWrapCss).toContain("var(--contact-progress");
    expect(figureWrapCss).toContain("-28px");
    const figureReduceLine = figureWrapCss
      .split("\n")
      .find(
        (line) =>
          line.includes("@media (prefers-reduced-motion: reduce)") &&
          line.includes("transform"),
      );
    expect(figureReduceLine).toBeDefined();
    expect(figureReduceLine).toMatch(/transform:\s*none/);

    expect(ringsCss).toContain("translateY(");
    expect(ringsCss).toContain("var(--contact-progress");
  });
});

/*
 * D7 (encargo 2026-08-04): las entradas de Contacto (rama clara -- `ScCard`
 * -- y rama oscura -- `ScDarkContent`) se unifican a `motion.duration.slower`
 * + `motion.easing.decelerate`. Por texto del CSS inyectado, no
 * `getComputedStyle`: medido en este repo (ver Features.test.tsx), jsdom no
 * resuelve `transitionDuration`/`transitionTimingFunction` cuando
 * `transition` es una lista de declaraciones separadas por coma.
 */
describe("D7: duración/easing de entrada unificados (slower + decelerate)", () => {
  it("ScCard (rama clara) usa motion.duration.slower + motion.easing.decelerate", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain(themes.light.motion.duration.slower);
    expect(css).toContain(themes.light.motion.easing.decelerate);
    expect(css).not.toContain(themes.light.motion.duration.slow);
    expect(css).not.toContain(themes.light.motion.easing.emphasized);
  });

  it("ScDarkContent (rama oscura) usa motion.duration.slower + motion.easing.decelerate", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });
      const content = Array.from(
        container.querySelectorAll("[data-revealed]"),
      ).find((el) => el.getAttribute("aria-hidden") !== "true") as HTMLElement;
      const css = cssRuleTextFor(content);

      expect(css).toContain(themes.dark.motion.duration.slower);
      expect(css).toContain(themes.dark.motion.easing.decelerate);
      expect(css).not.toContain(themes.dark.motion.duration.slow);
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * D7 (encargo 2026-08-04, decisión propia -- ver el informe de la tarea):
 * `ScCta` (el CTA de `mailto:` de la rama clara) gana `:focus-visible`
 * propio, resuelto contra `semantic.focus`, mismo criterio que `ScCta` en
 * `Features.tsx`. No estaba nombrado explícitamente en el encargo (que citó
 * solo el de Features), pero es el mismo componente de rol "CTA de sección"
 * dentro del mismo fichero en alcance, así que se nivela igual.
 */
describe("D7: :focus-visible propio del CTA de sección", () => {
  it("ScCta declara :focus-visible con box-shadow resuelto contra semantic.focus, compuesto con el de :hover", () => {
    const { container } = renderWithProviders(<Contact />);
    const cta = container.querySelector(
      `a[href="${links.email}"]`,
    ) as HTMLElement;
    const css = cssRuleTextFor(cta);

    expect(css).toContain(":focus-visible");
    const focusBlock = css.slice(css.indexOf(":focus-visible"));
    expect(focusBlock).toContain("box-shadow");
    expect(focusBlock).toContain(themes.light.semantic.focus);
  });
});

/*
 * D4 (encargo 2026-08-04): palancas de compactación vertical del contenido
 * oscuro -- `padding-block` fluido de `ScDarkFrame`, `gap` fluido de
 * `ScDarkCopy` y `ScCards`. Contacto medía +105px de sobrante (frente a los
 * +407px de Features), así que no necesita las palancas de tipografía ni de
 * bullets a dos columnas que sí lleva Features.
 */
describe("D4: palancas de compactación vertical del contenido oscuro (clamp fluido)", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("ScDarkFrame usa padding-block: clamp(...) en vez de space[8] fijo", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    const revealedEl = Array.from(
      container.querySelectorAll("[data-revealed]"),
    ).find((el) => el.getAttribute("aria-hidden") !== "true") as HTMLElement;
    const frame = revealedEl.parentElement as HTMLElement;
    const css = cssRuleTextFor(frame);

    /* Unidad `dvh`, no `vw`, y el test la exige: la restriccion que hay que
       satisfacer es el ALTO del viewport, y un termino en `vw` no ahorra nada
       en un portatil bajo y ancho -- ver el mismo test en `Features.test.tsx`
       para el defecto medido que motivo el cambio de eje. */
    expect(css).toMatch(/padding-block:\s*clamp\(\s*1rem,\s*3\.5dvh,/);
    expect(css).not.toContain("6vw");
  });

  it("ScDarkCopy usa gap: clamp(...) en vez de space[4] fijo", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });
    const revealedEl = Array.from(
      container.querySelectorAll("[data-revealed]"),
    ).find((el) => el.getAttribute("aria-hidden") !== "true") as HTMLElement;
    const copy = revealedEl.firstElementChild as HTMLElement;
    const css = cssRuleTextFor(copy);

    expect(css).toMatch(/gap:\s*clamp\(0\.75rem/);
  });

  /*
   * Task 9 (craft de interacción): ScCardLink (las dos tarjetas de
   * Comunidad/Código) gana :active { transform: scale(...) } (vocabulary.
   * PRESS), su hover-lift pasa a guardarse tras PRESS.hoverGuard (mueve,
   * translateY) y se separa de :focus-visible -- que hasta ahora vivían
   * combinados en un único selector -- porque el guard de hover no puede
   * tapar el feedback de foco de quien navega por teclado. Validado con el
   * bug inyectado a propósito (ver informe de la tarea, tabla ScCardLink):
   * comentando temporalmente cada bloque en Contact.tsx el test
   * correspondiente se pone en rojo; restaurado, vuelve a verde.
   */
  describe("ScCardLink: craft de interacción (Task 9, vocabulary.PRESS)", () => {
    async function renderCardLink(): Promise<HTMLElement> {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });
      return screen.getAllByRole("link")[0] as HTMLElement;
    }

    it("declara :active con transform: scale(PRESS.activeScale) y transition de transform con PRESS.durationMs/PRESS.easing", async () => {
      const cardLink = await renderCardLink();
      const css = cssRuleTextFor(cardLink);

      expect(css).toContain(":active");
      const activeBlock = css.slice(css.indexOf(":active"));
      expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
      expect(css).toContain(`${PRESS.durationMs}ms`);
      expect(css).toContain(PRESS.easing);
    });

    it("el hover-lift (translateY) vive dentro de PRESS.hoverGuard, y :focus-visible queda FUERA del guard con su propio translateY", async () => {
      const cardLink = await renderCardLink();
      const css = cssRuleTextFor(cardLink);

      const guardIndex = css.indexOf(`@media ${PRESS.hoverGuard}`);
      expect(guardIndex).toBeGreaterThan(-1);
      const guardBlock = css.slice(guardIndex);
      expect(guardBlock).toContain(":hover");
      expect(guardBlock).toContain("translateY(-1px)");

      // :focus-visible, ANTES del guard de hover: no depende de la
      // capacidad de puntero fino del dispositivo.
      const restoDelGuard = css.slice(0, guardIndex);
      expect(restoDelGuard).toContain(":focus-visible");
      expect(restoDelGuard).toContain("translateY(-1px)");
    });

    it("el guard de prefers-reduced-motion anula el transform de :hover, :focus-visible Y :active", async () => {
      const cardLink = await renderCardLink();
      const css = cssRuleTextFor(cardLink);

      expect(css).toContain("prefers-reduced-motion: reduce");
      const reduceBlock = css.slice(
        css.indexOf("prefers-reduced-motion: reduce"),
      );
      expect(reduceBlock).toContain("transition: none");
      expect(reduceBlock).toContain(":hover");
      expect(reduceBlock).toContain(":focus-visible");
      expect(reduceBlock).toContain(":active");
      expect(reduceBlock).toContain("transform: none");
    });
  });
});

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, 2026-08-09):
 * `ScAccent` pasa de degradado de texto (`background-clip: text`) a color
 * solido (`semantic.brandText`) -- ver el docblock de `ScAccent`, Contact.tsx,
 * para el porque completo. `ScAccent` se renderiza en las DOS ramas
 * (verificado leyendo el JSX: la oscura dentro de `ScDarkCopy`, la clara
 * dentro de `ScLeft`): las dos se miden.
 */
describe("Contact: Task 12, ScAccent pasa a color solido", () => {
  it("rama clara: el termino de titulo (ScAccent) resuelve semantic.brandText, sin background-clip", () => {
    renderWithProviders(<Contact />);
    const accent = screen.getByText(esHome.Home.contact.titleAccent);

    expect(getComputedStyle(accent).color).toBe(
      themes.light.semantic.brandText,
    );
    const css = cssRuleTextFor(accent);
    expect(css).not.toContain("background-clip");
    expect(css).not.toContain("color: transparent");
  });

  it("rama oscura: el termino de titulo (ScAccent) resuelve semantic.brandText, sin background-clip", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });
      const accent = screen.getByText(esHome.Home.contact.titleAccent);

      expect(getComputedStyle(accent).color).toBe(
        themes.dark.semantic.brandText,
      );
      const css = cssRuleTextFor(accent);
      expect(css).not.toContain("background-clip");
    } finally {
      window.localStorage.clear();
    }
  });

  /*
   * Medicion de contraste AA (cierra el hueco que senalo la auditoria: "6
   * piezas color:transparent fuera del alcance de contrast.ts"). Rama clara
   * contra las tres paradas de `CONTACT_CARD_GRADIENT` (el fondo REAL de
   * `ScCard`, no la pagina -- a diferencia de Story, esta pieza vive dentro
   * de una tarjeta con fondo propio); rama oscura contra `CONTACT_GUARDIAN_VOID`
   * (el void de la escena, hex -- jsdom no compone las capas WebP reales, asi
   * que es el suelo medible por codigo, no el pixel final compuesto).
   */
  it("brandText sobre las tres paradas de CONTACT_CARD_GRADIENT (rama clara) y sobre CONTACT_GUARDIAN_VOID (rama oscura) libran AA", () => {
    // Las tres paradas del degradado pastel (contact.layers.ts), compuestas
    // sobre `semantic.bg` con su alfa real -- ver Contact.tsx, docblock de
    // ScAccent, para las cifras medidas (5.24:1-5.29:1). Los literales hex
    // son los MISMOS de `CONTACT_CARD_GRADIENT`: si ese degradado cambia de
    // paradas, este test se desincroniza de forma visible (no silenciosa) la
    // proxima vez que alguien lo lea junto al literal real.
    const paradas = ["#EFF4FC", "#F5F2FB", "#F9F0F7"];
    paradas.forEach((parada) => {
      const ratio = contrastRatioHex(themes.light.semantic.brandText, parada);
      expect(
        ratio,
        `parada ${parada}: contraste ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    const ratioDark = contrastRatioHex(
      themes.dark.semantic.brandText,
      CONTACT_GUARDIAN_VOID,
    );
    expect(
      ratioDark,
      `contraste ${ratioDark.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * Bug inyectado a proposito (regla 34), documentado en el informe de la
   * tarea: revertir `ScAccent` (Contact.tsx) a
   * `color: theme.data.semantic.text` (en vez de `brandText`) pone en rojo
   * los dos primeros tests de este describe; restaurado, vuelve a verde.
   */
});

/*
 * Task 12 (ghost-card): `ScCard` (rama clara) conserva su borde 1px
 * (`CONTACT_CARD_BORDER`) y retira la sombra de 44px -- ver el docblock de
 * `ScCard`, Contact.tsx, para la regla completa (borde O sombra, nunca los
 * dos) y por que esta tarjeta concreta se queda con el borde.
 */
describe("Contact: Task 12, ghost-card ScCard (rama clara)", () => {
  it("conserva el borde 1px y NO declara ningun box-shadow", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain(`border: 1px solid ${CONTACT_CARD_BORDER}`);
    expect(css).not.toContain("box-shadow");
  });

  /*
   * Bug inyectado a proposito (regla 34), documentado en el informe de la
   * tarea: reintroducir `box-shadow: 0 18px 44px oklch(0.6 0.1 265 / 0.1);`
   * en `ScCard` (Contact.tsx) pone en rojo la aserción
   * `expect(css).not.toContain("box-shadow")`; restaurado, vuelve a verde.
   */
});
