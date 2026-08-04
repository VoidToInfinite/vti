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
import { Contact } from "./Contact";
import {
  CONTACT_CONTENT_MAX_WIDTH,
  CONTACT_DARK_HEIGHT,
  CONTACT_OVERLAY_RISE,
} from "./contact.layers";
import { CONTACT_GUARDIAN_LAYERS } from "@/components/contactCosmicGuardian/contactCosmicGuardian.layers";
import { FEATURES_TAIL_HOLD } from "@/components/sections/Features/features.layers";

/*
 * Reescritura completa (spec 2026-07-28 §7.4, mockup `#contact` L212-238):
 * la tarjeta de degradado pastel, el chip de email + CTA, y la figura con
 * anillos concéntricos sustituyen al Contact viejo (título + párrafo +
 * Button + Socials). `Socials` ya no vive aquí (se muda al footer, spec
 * §7.5) -- el test viejo que comprobaba el camino de contacto por email se
 * reescribe contra el chip/CTA reales del mockup.
 */

let trigger: (isIntersecting: boolean) => void;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = (v) => cb([{ isIntersecting: v }]);
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

  it("muestra el kicker real de i18n", () => {
    renderWithProviders(<Contact />);
    expect(screen.getByText(esHome.Home.contact.kicker)).toBeInTheDocument();
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
      expect(screen.getByText(enHome.Home.contact.kicker)).toBeInTheDocument();
      expect(screen.getByText(enHome.Home.contact.email)).toBeInTheDocument();
      expect(
        screen.queryByText(esHome.Home.contact.kicker),
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

  it("sigue mostrando el kicker, el titulo y el cuerpo con el mismo i18n que en claro (el chip+CTA de claro NO se porta a oscuro, D12/D14)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.contact.kicker)).toBeInTheDocument();
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

  it("el campo de correo arranca con el valor de links.email, sin el prefijo mailto: (no es un email valido)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });

    const input = screen.getByLabelText(
      esHome.Home.contact.form.label,
    ) as HTMLInputElement;
    expect(links.email.startsWith("mailto:")).toBe(true);
    expect(input.value).toBe(links.email.replace(/^mailto:/, ""));
    expect(input.value).not.toContain("mailto:");
  });

  it("al enviar SIN editar el campo, el correo por defecto (links.email) llega en el cuerpo del mailto", async () => {
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

      expect(assignSpy).toHaveBeenCalledTimes(1);
      const url = assignSpy.mock.calls[0][0] as string;
      const defaultEmail = links.email.replace(/^mailto:/, "");
      expect(url).toContain(encodeURIComponent(defaultEmail));
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
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
