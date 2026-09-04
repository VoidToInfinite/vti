import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
/* Render de SERVIDOR: reproduce el HTML horneado del export estático, que es
   lo único que recibe un visitante sin JavaScript. Nació como única vía de ver
   el contenido de un `<noscript>` (React trata sus hijos como texto y un
   render de cliente los deja fuera del DOM); ese `<noscript>` se retiró en la
   crítica externa #11 y el helper se quedó atando que el aviso viaja horneado
   -- ver `markupDeServidor` en el describe de la crítica externa #9. */
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@/test/test-utils";
import { ThemeProvider } from "@/theme/ThemeProvider";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import esCommon from "@/i18n/locales/es/common.json";
import enCommon from "@/i18n/locales/en/common.json";
import i18n from "@/i18n/config";
import { links } from "@/config/links";
import { AMBIENT, PRESS, REVEAL } from "@/motion/vocabulary";
import {
  Contact,
  MAILTO_URL_MAX,
  MESSAGE_MAX,
  MESSAGE_WARN,
  buildMailtoUrl,
  exceedsMailtoBudget,
} from "./Contact";
import {
  CONTACT_CARD_BG_DARK,
  CONTACT_CARD_BORDER,
  CONTACT_CONTENT_MAX_WIDTH,
  CONTACT_DARK_HEIGHT,
  CONTACT_FORM_BG,
  CONTACT_OVERLAY_RISE,
  CONTACT_PANEL_BG_LIGHT,
  CONTACT_TOP_GLOW_PULSE_MS,
} from "./contact.layers";
import {
  CONTACT_GUARDIAN_LAYERS,
  CONTACT_GUARDIAN_VOID,
} from "@/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers";
import { FEATURES_TAIL_HOLD } from "@/components/sections/Features/features.layers";
import { themes } from "@/theme/themes";
import { grid } from "@/theme/tokens/grid";
import { motion } from "@/theme/tokens/motion";
import {
  contrastRatio,
  contrastRatioHex,
  relativeLuminance,
  relativeLuminanceHex,
} from "@/theme/tokens/contrast";

/*
 * Reescritura completa (spec 2026-07-28 §7.4, mockup `#contact` L212-238):
 * la tarjeta de degradado pastel y la figura con anillos concéntricos
 * sustituyen al Contact viejo (título + párrafo + Button + Socials).
 * `Socials` ya no vive aquí (se muda al footer, spec §7.5).
 *
 * Dentro de esa tarjeta, el chip de correo + CTA del mockup duraron hasta la
 * Task 16 (2026-08-11), que los sustituyó por el formulario real y las dos
 * salidas de comunidad de la rama oscura -- ver el describe "Task 16, el
 * formulario real vive también en la rama clara", más abajo, y el candado
 * inverso dentro del describe "Contact".
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

/**
 * Reglas de estilo declaradas DENTRO de un `@media (scripting: none)`. Mismo
 * helper y mismo motivo que `ThemeToggle.test.tsx` y `aura.parts.test.tsx`:
 * jsdom no evalua NINGUN `@media` (regla 36) y tampoco conoce el feature
 * `scripting`, asi que la unica via es leer el CSSOM acotando al bloque
 * concreto -- nunca por substring del CSS inyectado (regla 35).
 *
 * Vive en el modulo desde la critica externa #12 (2026-08-18): lo consumen dos
 * describes distintos de este mismo fichero -- el aviso sin JavaScript
 * (hallazgo B2 de la #11, que lo REVELA) y el boton de envio (#12, que se
 * RETIRA) -- y una copia por describe habria sido la tercera del repo.
 */
function reglasSinScripting(): CSSStyleRule[] {
  const out: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList, dentro: boolean): void => {
    Array.from(rules).forEach((rule) => {
      const media = (rule as CSSMediaRule).media;
      const aqui =
        dentro || (media ? /scripting:\s*none/.test(media.mediaText) : false);
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) {
        walk(anidadas, aqui);
        return;
      }
      if (aqui && (rule as CSSStyleRule).selectorText !== undefined) {
        out.push(rule as CSSStyleRule);
      }
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules, false);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return out;
}

/*
 * Mensaje de los tests que ejercitan un envio COMPLETO. Desde la critica
 * externa #8 (Nielsen, 2026-08-17) el formulario tiene DOS campos
 * obligatorios: escribir solo el correo ya no navega a ninguna parte, asi que
 * todo test de "envio valido" tiene que escribir tambien el mensaje. Lleva un
 * `&` y un salto de linea A PROPOSITO: son los dos caracteres que partirian la
 * URL del mailto en parametros que nadie escribio si el cuerpo dejara de
 * codificarse con encodeURIComponent.
 */
const MENSAJE_VALIDO = "Tengo una idea & una pregunta.\nQue tal el martes?";

/**
 * Escribe el mensaje en el textarea real (consultado por su etiqueta, como el
 * campo de correo) y lo devuelve. Sin argumento usa `MENSAJE_VALIDO`.
 */
function escribirMensaje(texto: string = MENSAJE_VALIDO): HTMLTextAreaElement {
  const textarea = screen.getByLabelText(
    esHome.Home.contact.form.messageLabel,
  ) as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: texto } });
  return textarea;
}

/**
 * Texto de TODAS las regiones live del formulario, en orden del DOM.
 *
 * Desde la critica externa #15 (hallazgo B3 P3) las dos regiones de error
 * estan montadas SIEMPRE, vacias en reposo, para que un lector de pantalla
 * anuncie el CAMBIO de su contenido -- tambien cuando lo cambia la
 * revalidacion al salir del campo, que no mueve el foco. La consecuencia
 * directa es que `getByRole("status")` en singular ya no puede ser univoca:
 * hay dos regiones (mas el panel de respaldo cuando existe). Se consulta
 * siempre en plural.
 */
function anunciados(): string[] {
  return screen.getAllByRole("status").map((nodo) => nodo.textContent ?? "");
}

/**
 * El panel de respaldo, identificado por su propio texto entre las regiones
 * live -- no por ser "el unico status", que dejo de serlo.
 */
function panelDeRespaldo(): HTMLElement {
  const panel = screen
    .getAllByRole("status")
    .find((nodo) =>
      (nodo.textContent ?? "").includes(esHome.Home.contact.form.fallbackLead),
    );
  expect(panel, "no esta montado el panel de respaldo").toBeDefined();
  return panel as HTMLElement;
}

/*
 * `overflow` QUE ROMPE UN PIN, no cualquier propiedad cuyo nombre empiece por
 * "overflow". La regla 21 del repo prohibe `overflow: hidden|auto|scroll` en
 * cualquier ancestro de un elemento con `position: sticky` -- eso es lo que
 * estos tests protegen. `overflow-wrap` (anadida en la critica externa #13,
 * 2026-08-19, para que el texto reflote sin recortarse al 200% de tamano de
 * fuente, WCAG 2.1 SC 1.4.4) NO crea contenedor de scroll ni afecta al pin:
 * solo decide si una palabra que no cabe entera puede partirse. El patron
 * anterior (`/overflow/`) las confundia por prefijo compartido, asi que el
 * candado decia mas de lo que su nombre promete. Este patron exige los DOS
 * PUNTOS de la propiedad completa, de modo que sigue cazando exactamente las
 * mismas declaraciones peligrosas (`overflow`, `-x`, `-y`, `-block`,
 * `-inline`) y ninguna mas.
 */
const OVERFLOW_DE_SCROLL = /overflow(-x|-y|-block|-inline)?\s*:/;

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

  /*
   * SUSTITUYE al test "el chip muestra el email real, y el CTA enlaza a
   * links.email" (Task 16, 2026-08-11). Ese par de piezas se retiró entero:
   * el chip era un `<div>` con borde, icono de sobre y la dirección dentro,
   * puesto donde va un campo de captura -- hallazgo #1 de la crítica
   * independiente del 2026-08-11 ("en tema claro no existe formulario de
   * contacto, y lo que hay simula serlo") -- y el CTA abría el mismo
   * `mailto:` que el botón de envío del formulario, que ahora sí existe en
   * esta rama.
   *
   * Este test es el candado INVERSO: ni el texto de las claves retiradas ni
   * un ancla `mailto:` suelta pueden reaparecer en la rama clara. Las
   * cadenas van como literales a propósito (las claves ya no existen en el
   * JSON, regla 28) -- `locales.test.ts` impide por su lado que las claves
   * vuelvan.
   */
  it("ya NO existe el chip que simulaba un campo, ni un CTA de correo aparte del formulario", () => {
    const { container } = renderWithProviders(<Contact />);

    expect(screen.queryByText("Contactar por correo")).not.toBeInTheDocument();

    /*
     * ACTUALIZADO, NO RELAJADO (regla 40; critica externa #11, hallazgo B2,
     * 2026-08-18). Este candado exigia CERO anclas al `mailto:` en el DOM de
     * cliente, y eso se cumplia por un accidente: el aviso sin JavaScript
     * vivia dentro de un `<noscript>`, que React deja VACIO en cualquier
     * render de cliente. Desde que ese aviso es un elemento real oculto por
     * CSS (ver la lapida en `ScNoJsNote`), su ancla si existe en el DOM. Lo
     * que el candado protege -- que no vuelvan el chip ni un CTA de correo
     * suelto -- se afirma ahora contando, que es MAS estricto que la ausencia
     * anterior: hay EXACTAMENTE UNA ancla al mailto, esta dentro del aviso, y
     * no se presenta.
     */
    const anclasMailto = Array.from(
      container.querySelectorAll(`a[href="${links.email}"]`),
    );
    expect(anclasMailto).toHaveLength(1);
    expect(anclasMailto[0].closest("[data-nojs-note]")).not.toBeNull();
    expect(anclasMailto[0]).not.toBeVisible();
    // La direccion literal no aparece en ningun otro sitio de la seccion.
    expect(screen.queryByText("hello@voidtoinfinite.com")).toBe(
      anclasMailto[0],
    );
  });

  it("en ingles renderiza la copia inglesa, no la espanola (mitad del contrato de paridad)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Contact />);
      expect(
        screen.getByText(enHome.Home.contact.cards.community.title),
      ).toBeInTheDocument();
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
    // Los iconos de trazo de las tarjetas de canal TAMBIEN son aria-hidden
    // (decorativos junto a texto visible): se localiza el contenedor de
    // anillos por ser el UNICO aria-hidden con exactamente 3 hijos <div>.
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

/*
 * Task 16 (unificación de contenido parte 2, 2026-08-11): la rama CLARA
 * monta el MISMO bloque de canales que la oscura -- formulario real con
 * validación, panel de dirección copiable y las dos salidas de comunidad.
 * Estos tests son el equivalente claro de los que el bloque "Contact en tema
 * oscuro" ya tenía: no comprueban estructura, comprueban el FLUJO (escribir,
 * enviar, fallar, corregir, copiar) sobre la rama que hasta hoy no tenía
 * ninguno de los dos.
 */
describe("Contact: Task 16, el formulario real vive también en la rama clara", () => {
  /*
   * Contrato ampliado por la critica externa #8 (Nielsen, 2026-08-17): el
   * formulario pasa de UN campo a DOS. `toHaveLength(2)` no se relaja nunca a
   * `toBeGreaterThan` (regla 40): quien anada un tercer campo actualiza este
   * numero y declara por que, en vez de aflojar la asercion.
   *
   * D4 (decision del dueno, 2026-09-02): de los dos campos, solo el MENSAJE
   * es obligatorio. El `not.toHaveAttribute("required")` del correo no es una
   * asercion aflojada sino la contraria -- afirma la decision: el atributo
   * tiene que estar AUSENTE, y devolverlo pone este test en rojo.
   */
  it("monta un formulario con dos campos -- correo OPCIONAL, mensaje obligatorio -- y un boton type=submit", () => {
    const { container } = renderWithProviders(<Contact />);

    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toBeInTheDocument();

    const controls = within(form).getAllByRole("textbox");
    expect(controls).toHaveLength(2);
    expect(controls[0]).toHaveAttribute("type", "email");
    // D4: opcional. `type="email"` se queda (describe el campo y da el
    // teclado correcto en movil); `required` no.
    expect(controls[0]).not.toHaveAttribute("required");
    expect(controls[0]).toHaveAccessibleName(esHome.Home.contact.form.label);
    expect(controls[1].tagName).toBe("TEXTAREA");
    expect(controls[1]).toHaveAttribute("required");
    expect(controls[1]).toHaveAccessibleName(
      esHome.Home.contact.form.messageLabel,
    );
    expect(form.querySelectorAll('button[type="submit"]')).toHaveLength(1);
  });

  it("al enviar un correo invalido NO navega y pinta el error accesible; corregirlo lo retira", () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      const form = container.querySelector("form") as HTMLFormElement;
      const input = screen.getByLabelText(esHome.Home.contact.form.label);

      // El mensaje SI es valido: asi el unico error posible es el del correo
      // y `getByRole("status")` sigue siendo una consulta univoca.
      escribirMensaje();
      fireEvent.change(input, { target: { value: "no-es-un-correo" } });
      fireEvent.submit(form);

      expect(assignSpy).not.toHaveBeenCalled();
      expect(anunciados()).toContain(esHome.Home.contact.form.emailError);
      expect(input).toHaveAttribute("aria-invalid", "true");

      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      expect(
        screen.queryByText(esHome.Home.contact.form.emailError),
      ).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("un envio valido navega al mailto y revela el panel con la direccion en texto plano y el boton Copiar", () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    try {
      const { container } = renderWithProviders(<Contact />);
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      expect(assignSpy).toHaveBeenCalledTimes(1);
      expect(assignSpy.mock.calls[0][0].startsWith(links.email)).toBe(true);

      const panel = panelDeRespaldo();
      expect(panel).toHaveTextContent(esHome.Home.contact.form.fallbackLead);
      expect(panel).toHaveTextContent(links.email.replace(/^mailto:/, ""));
      expect(
        within(panel).getByRole("button", {
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

  it("el boton Copiar escribe la direccion real (sin mailto:) y cambia su texto a la clave copied", async () => {
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
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", {
            name: esHome.Home.contact.form.copyAddress,
          }),
        );
      });

      expect(writeText).toHaveBeenCalledWith(
        links.email.replace(/^mailto:/, ""),
      );
      expect(
        screen.getByRole("button", { name: esHome.Home.contact.form.copied }),
      ).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
    }
  });

  it("monta las 2 salidas de comunidad con los href de links.discord/github y su texto de i18n", () => {
    const { container } = renderWithProviders(<Contact />);

    const discord = container.querySelector(
      `a[href="${links.discord}"]`,
    ) as HTMLAnchorElement;
    const github = container.querySelector(
      `a[href="${links.github}"]`,
    ) as HTMLAnchorElement;

    expect(discord).toBeInTheDocument();
    expect(github).toBeInTheDocument();
    expect(discord).toHaveTextContent(
      esHome.Home.contact.cards.community.title,
    );
    expect(github).toHaveTextContent(esHome.Home.contact.cards.code.title);
    // Mismo contrato que la rama oscura: se abren fuera, con rel seguro.
    [discord, github].forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  /*
   * Task 33 (gate F4, hallazgo del evaluador independiente 2026-08-12): el
   * "CTA de conversión" del hallazgo es ESTE botón -- hasta esa tarea
   * compartía `heroGradient` con el título del Hero, y su parada de 65%
   * (`palette.secondary[300]`) daba 1.69:1 contra el texto blanco del botón
   * en tema claro (este describe: `renderWithProviders(<Contact />)` sin
   * localStorage, la rama que Task 16 confirma que YA monta el formulario
   * real). Candado por RENDER, atado al CSS realmente inyectado por
   * `Contact.tsx` -- no una copia recalculada a mano -- mismo patrón que el
   * test equivalente de `Hero.qa.test.tsx` ("Task 33: el degradado
   * renderizado del CTA primario..."). Cifras completas y causa raíz:
   * docblock de `ctaGradient` (`BrandName.tsx`).
   */
  it("Task 33: el degradado renderizado del boton de envio en tema CLARO pasa AA en sus 3 paradas distintas", () => {
    const { container } = renderWithProviders(<Contact />);
    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLElement;
    const css = cssRuleTextFor(button);

    const declaracionesDeGradiente =
      css.match(/background-image:\s*linear-gradient\([^;]*\);/g) ?? [];
    expect(
      declaracionesDeGradiente.length,
      "no se encontro ninguna declaracion background-image: linear-gradient(...)",
    ).toBeGreaterThan(0);

    const paradas = Array.from(
      new Set(
        declaracionesDeGradiente.flatMap(
          (decl) => decl.match(/oklch\([^)]*\)/g) ?? [],
        ),
      ),
    );
    expect(
      paradas.length,
      "se esperaban 3 colores de parada distintos (semantic.text, semantic.brandText, ctaGradientMidStop)",
    ).toBe(3);

    paradas.forEach((parada) => {
      const ratio = contrastRatio(themes.light.semantic.onBrand, parada);
      expect(
        ratio,
        `parada ${parada} da ${ratio.toFixed(3)}:1 contra onBrand, por debajo de AA (4.5:1)`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    // Sonda de no-vacuidad: secondary[300] (la parada VIEJA) NO puede
    // aparecer entre las paradas renderizadas en tema claro.
    expect(paradas).not.toContain(themes.light.palette.secondary[300]);
  });
});

/*
 * Task 18 (M5, "privacidad radical a la superficie", 2026-08-12): línea
 * factual junto al formulario, en las DOS ramas (mismo bloque compartido
 * `contactChannels` que Task 16 unificó) y en los dos idiomas -- ver el
 * docblock de `ScPrivacyNote` en `Contact.tsx` para la fuente completa (gate
 * F2, auditoría `design-taste-frontend` 2026-08-08) y la razón de la
 * precisión del texto.
 */
describe("Contact: Task 18, la linea de privacidad junto al formulario", () => {
  it("se muestra en la rama clara, entre el formulario y las tarjetas de canal (orden real en el DOM)", () => {
    const { container } = renderWithProviders(<Contact />);
    const note = screen.getByText(esHome.Home.contact.privacyNote);
    expect(note).toBeInTheDocument();

    const form = container.querySelector("form") as HTMLFormElement;
    const cardLinks = screen.getAllByRole("link");

    // Sonda de orden real (no solo de presencia): la nota vive DESPUES del
    // <form> y ANTES de la primera tarjeta de canal en el árbol -- mismo
    // mecanismo (`compareDocumentPosition`) que ya usan Story/Journey/Hero.
    expect(
      form.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      note.compareDocumentPosition(cardLinks[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("se muestra tambien en la rama oscura, con el mismo texto (bloque compartido)", () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      renderWithProviders(<Contact />);
      expect(
        screen.getByText(esHome.Home.contact.privacyNote),
      ).toBeInTheDocument();
    } finally {
      window.localStorage.clear();
    }
  });

  it("en ingles muestra la copia inglesa de la nota, no la espanola (paridad es/en)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Contact />);
      expect(
        screen.getByText(enHome.Home.contact.privacyNote),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(esHome.Home.contact.privacyNote),
      ).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  /*
   * Precisión del texto (brief, punto 1): la frase no puede leerse como "tus
   * datos nunca salen de aquí" en general -- el formulario abre el cliente
   * de correo del PROPIO VISITANTE (ver `handleSubmit`), y eso no es "cero
   * salida de datos" sin matiz. Candado de CONTENIDO, no de presencia: la
   * clave tiene que acotar el claim a la navegación Y declarar la segunda
   * cláusula que aclara el matiz del formulario -- las DOS mitades, no solo
   * una.
   *
   * Corrección de revisión (fix de la Task 18, mismo día): la primera
   * versión de este test solo ataba la mitad del matiz -- comprobaba que el
   * texto mencionara "navegar"/"browsing" y que NO contuviera "nunca sale
   * nada"/"never leaves", pero nunca comprobó que la SEGUNDA cláusula (la
   * que aclara que escribir abre el cliente de correo del visitante)
   * siguiera ahí. Con esa cobertura, borrar la segunda cláusula entera --
   * dejando solo "Navegar por esta web no envía ningún dato tuyo a
   * terceros: no hay analítica ni rastreo." -- habría dejado el test en
   * verde, reintroduciendo justo la ambigüedad que el brief pedía evitar
   * (detectado en revisión, no por este agente). Se añaden las dos
   * aserciones que faltaban (`toContain("cliente de correo")` /
   * `toContain("email client")`), verificadas con el bug inyectado real:
   * borrar la segunda cláusula de las dos claves puso este test en rojo
   * (`expected ... to include 'cliente de correo'` / `'email client'`);
   * restaurado, volvió a verde.
   */
  it("el texto acota el claim a NAVEGAR y declara la segunda clausula (cliente de correo del visitante) en los dos idiomas", () => {
    const es = esHome.Home.contact.privacyNote.toLowerCase();
    const en = enHome.Home.contact.privacyNote.toLowerCase();

    // Primera clausula: el claim se acota a NAVEGAR, nunca a una promesa
    // mas amplia que el sitio no puede sostener.
    expect(es).toContain("navegar");
    expect(en).toContain("browsing");
    expect(es).not.toContain("nunca sale nada");
    expect(en).not.toContain("never leaves");

    // Segunda clausula: el matiz del formulario (abre el cliente de correo
    // DEL VISITANTE) tiene que seguir presente -- sin ella, la primera
    // clausula por si sola es exactamente la ambiguedad que el brief pedia
    // evitar.
    expect(es).toContain("cliente de correo");
    expect(en).toContain("email client");
  });

  /*
   * Ata el TOKEN al ELEMENTO real: la medición de contraste de más abajo
   * solo dice algo sobre lo que el visitante ve si `ScPrivacyNote` de verdad
   * pinta con `semantic.textMuted` y no con un literal aparte -- mismo
   * mecanismo que ya usa este fichero para `ScAccent`/`brandText` (describe
   * "Task 12", más abajo, `getComputedStyle(accent).color`).
   *
   * Bug inyectado a propósito (regla 34, informe de la tarea): cambiar
   * `color: theme.data.semantic.textMuted` por `theme.data.semantic.text` en
   * `ScPrivacyNote` (`Contact.tsx`) puso este test en rojo (`getComputedStyle`
   * devolvía el valor de `semantic.text`, no el de `textMuted`); restaurado,
   * volvió a verde.
   */
  it("el color de la nota es exactamente semantic.textMuted (no un literal aparte)", () => {
    const { container: claro } = renderWithProviders(<Contact />);
    const notaClara = within(claro).getByText(esHome.Home.contact.privacyNote);
    expect(getComputedStyle(notaClara).color).toBe(
      themes.light.semantic.textMuted,
    );

    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container: oscuro } = renderWithProviders(<Contact />);
      const notaOscura = within(oscuro).getByText(
        esHome.Home.contact.privacyNote,
      );
      expect(getComputedStyle(notaOscura).color).toBe(
        themes.dark.semantic.textMuted,
      );
    } finally {
      window.localStorage.clear();
    }
  });

  /*
   * Contraste AA medido contra el fondo REAL de cada rama (jsdom no compone
   * layout ni las capas WebP -- misma técnica que el resto de este fichero,
   * `contrastRatioHex`, describe "brandText sobre las tres paradas..." más
   * arriba). Junto con el test anterior (que ata el token al elemento
   * renderizado), esta medición sí dice algo sobre lo que el visitante ve:
   * `semantic.textMuted` es el MISMO rol que ya usan `ScBody`/`ScCardValue`
   * sobre estos dos fondos.
   *
   * Verificado con valores REALES, no supuestos: `textSubtle` (el otro rol
   * "apagado" del sistema, candidato obvio a confundirse con `textMuted`) se
   * midió TAMBIÉN aquí antes de escribir este test -- 4.74:1-4.78:1 sobre las
   * tres paradas claras, así que NO sirve como bug inyectado sobre este
   * fondo concreto (sigue librando AA, solo con menos margen). El bug
   * inyectado real que verificó este test vive en el test anterior (color
   * literal distinto, `semantic.text`), no aquí: este test mide el TOKEN de
   * forma aislada y no puede fallar por un cambio en el componente.
   */
  it("semantic.textMuted libra AA (>=4.5:1) sobre las tres paradas de CONTACT_CARD_GRADIENT (claro) y sobre CONTACT_GUARDIAN_VOID (oscuro)", () => {
    const paradas = ["#EFF4FC", "#F5F2FB", "#F9F0F7"];
    paradas.forEach((parada) => {
      const ratio = contrastRatioHex(themes.light.semantic.textMuted, parada);
      expect(
        ratio,
        `textMuted claro sobre ${parada}: ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    const ratioDark = contrastRatioHex(
      themes.dark.semantic.textMuted,
      CONTACT_GUARDIAN_VOID,
    );
    expect(
      ratioDark,
      `textMuted oscuro sobre el void: ${ratioDark.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
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

  it("sigue mostrando el titulo y el cuerpo con el mismo i18n que en claro, sin kicker (Task 11 lo retira de las dos ramas)", async () => {
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
    expect(sectionCss).not.toMatch(OVERFLOW_DE_SCROLL);
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
  it("hay exactamente 3 tarjetas de contacto con href a links.discord/github/linkedin importados, cada una con su icono aria-hidden", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(
        CONTACT_GUARDIAN_LAYERS.length,
      );
    });

    const cardLinks = screen.getAllByRole("link");
    expect(cardLinks).toHaveLength(3);

    const hrefs = cardLinks.map((el) => el.getAttribute("href"));
    expect(hrefs.sort()).toEqual(
      [links.discord, links.github, links.linkedin].sort(),
    );

    cardLinks.forEach((link) => {
      expect(link.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    // Sonda de la retirada: la tarjeta de correo ya no existe en el DOM.
    expect(
      screen.queryByText(esHome.Home.contact.cards.community.title),
    ).toBeInTheDocument();
    /*
     * ACTUALIZADO, NO RELAJADO (regla 40; critica externa #11, hallazgo B2):
     * mismo motivo que el candado inverso de la rama clara -- el aviso sin
     * JavaScript dejo de ser un `<noscript>` vacio en cliente y su ancla al
     * mailto ya existe en el DOM. Que `getAllByRole("link")` siga devolviendo
     * 3 justo arriba es precisamente la prueba de que esa ancla no se
     * presenta: `display: none` la deja fuera del arbol de accesibilidad. La
     * tarjeta de correo sigue sin existir, que es lo que aqui se protege.
     */
    const anclasMailto = Array.from(
      container.querySelectorAll(`a[href="${links.email}"]`),
    );
    expect(anclasMailto).toHaveLength(1);
    expect(anclasMailto[0].closest("[data-nojs-note]")).not.toBeNull();
  });

  it("el formulario tiene exactamente dos controles (email OPCIONAL + mensaje required) y exactamente un boton type=submit (test 11, D12 ampliado por la critica #8, correo opcional desde D4)", async () => {
    const { container } = renderWithProviders(<Contact />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toBeInTheDocument();

    const controls = within(form).getAllByRole("textbox");
    expect(controls).toHaveLength(2);
    expect(controls[0]).toHaveAttribute("type", "email");
    expect(controls[0]).not.toHaveAttribute("required"); // D4: opcional
    expect(controls[0]).toHaveAccessibleName(esHome.Home.contact.form.label);
    expect(controls[1].tagName).toBe("TEXTAREA");
    expect(controls[1]).toHaveAttribute("required");
    expect(controls[1]).toHaveAccessibleName(
      esHome.Home.contact.form.messageLabel,
    );

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
  it("los dos campos arrancan vacios (el placeholder pasa a verse, nada prerrellenado)", async () => {
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

    /* El campo de mensaje hereda el MISMO candado (critica externa #8,
       2026-08-17): el P0 de confianza de la task 1 fue exactamente un campo
       prerrellenado por el sitio, asi que el control nuevo nace con la sonda
       puesta en vez de esperar a repetir el error. */
    const textarea = screen.getByLabelText(
      esHome.Home.contact.form.messageLabel,
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
    expect(textarea).toHaveAttribute(
      "placeholder",
      esHome.Home.contact.form.messagePlaceholder,
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
  /*
   * REESCRITO POR D4 (decision del dueno, 2026-09-02). Hasta hoy este test
   * afirmaba que un envio en blanco encendia LOS DOS errores; con el correo
   * ya opcional, un correo vacio dejo de ser un error y lo que hay que
   * atornillar es justo lo contrario: que el envio sigue sin navegar (el
   * mensaje sigue siendo obligatorio) y que el mensaje de formato del correo
   * NO puede aparecer sobre un campo en blanco -- el hallazgo A P2-3 de la
   * critica #15.
   *
   * La consulta se queda en `getAllByRole` aunque hoy solo haya un error
   * pintado: es la version que no se rompe cuando el formulario vuelve a
   * tener dos mensajes a la vez (correo mal escrito + mensaje vacio), que es
   * un caso real y esta cubierto mas abajo.
   */
  it("al enviar con los dos campos vacios, NO navega y pinta SOLO el error del mensaje: el correo vacio ya no es un error (D4)", async () => {
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
      const textosAnunciados = screen
        .getAllByRole("status")
        .map((nodo) => nodo.textContent);
      expect(textosAnunciados).toContain(esHome.Home.contact.form.messageError);
      // D4, hallazgo A P2-3: el mensaje de formato del correo NO puede salir
      // con el campo vacio -- vacio es ahora una respuesta valida.
      expect(textosAnunciados).not.toContain(
        esHome.Home.contact.form.emailError,
      );

      expect(
        screen.getByLabelText(esHome.Home.contact.form.label),
      ).not.toHaveAttribute("aria-invalid");
      expect(
        screen.getByLabelText(esHome.Home.contact.form.messageLabel),
      ).toHaveAttribute("aria-invalid", "true");
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
      // Mensaje valido: aisla el fallo al correo, unico error esperado.
      escribirMensaje();
      fireEvent.change(input, { target: { value: "no-es-un-correo" } });
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(assignSpy).not.toHaveBeenCalled();
      expect(anunciados()).toContain(esHome.Home.contact.form.emailError);
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
    // Con el mensaje ya escrito, el unico error del envio es el del correo:
    // asi "no queda ningun status" prueba que se retiro ESE error y no que se
    // solaparon dos. Desde D4 el correo tiene que estar MAL ESCRITO para
    // suspender: dejarlo vacio ya no enciende nada.
    escribirMensaje();
    fireEvent.change(input, { target: { value: "no-es-un-correo" } });
    fireEvent.submit(form);
    expect(anunciados()).toContain(esHome.Home.contact.form.emailError);

    fireEvent.change(input, { target: { value: "v" } });
    // Las regiones siguen montadas (critica #15): lo que se vacia es su
    // CONTENIDO, que es justo lo que un lector de pantalla anuncia.
    expect(anunciados().join("")).toBe("");
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
      escribirMensaje();
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

      /*
       * ACTUALIZADO, NO RELAJADO (regla 40; critica externa #11, hallazgo B2,
       * 2026-08-18): la direccion SI aparece ya antes del envio, dentro del
       * aviso sin JavaScript -- un elemento real oculto por CSS desde que dejo
       * de ser un `<noscript>` (que en cliente quedaba vacio). La sonda de
       * ausencia se afina a lo que de verdad protege: no hay PANEL todavia, y
       * la unica aparicion de la direccion es la del aviso.
       */
      const plainEmail = links.email.replace(/^mailto:/, "");
      const aviso = container.querySelector("[data-nojs-note]") as HTMLElement;
      screen.getAllByText(plainEmail).forEach((nodo) => {
        expect(aviso.contains(nodo)).toBe(true);
      });
      expect(
        screen.queryByText(esHome.Home.contact.form.fallbackLead),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        }),
      ).not.toBeInTheDocument();

      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      escribirMensaje();
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);

      expect(assignSpy).toHaveBeenCalledTimes(1);
      const panel = panelDeRespaldo();
      expect(panel).toHaveTextContent(plainEmail);
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
      escribirMensaje();
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

    // Rellena LOS DOS campos obligatorios y envia: desde la critica externa
    // #8 (2026-08-17) un envio con solo el correo no navega ni revela el
    // panel de fallback, que es lo que estos tests necesitan tener delante.
    async function submitValidForm(container: HTMLElement): Promise<void> {
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "visitante@test.com" } });
      escribirMensaje();
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
        await submitValidForm(container);

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
        await submitValidForm(container);

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
        await submitValidForm(container);

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
  it("el degradado animado del boton de envio solo corre bajo no-preference, con animation: none explicito bajo reduce (ctaGradient/gradientShift, 2026-08-04, renombrado desde heroGradient en la Task 33)", async () => {
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

  /*
   * Task 19 (motion core, punto 7 del brief -- gate F2: AMBIENT con cero
   * consumidores): gradientShift pasa de un literal escrito a mano (9000ms)
   * a `${AMBIENT.floatMs}ms` (@/motion/vocabulary) -- mismo valor numerico
   * resultante, asi que el CSS renderizado no distingue "literal" de
   * "token" por texto; lo que SI prueba que es el token es que Contact.tsx
   * importa y usa AMBIENT.floatMs de verdad
   * (src/test/vocabulary-consumers.test.ts). Validado con el bug inyectado
   * a proposito (ver informe de la tarea): cambiando temporalmente
   * AMBIENT.floatMs a 9999 en vocabulary.ts, este test se puso en rojo;
   * restaurado, volvio a verde. BrandName.tsx/Hero.tsx tienen su propio
   * candado equivalente sobre este mismo gradientShift.
   */
  it("Task 19: el degradado animado del boton de envio renderiza AMBIENT.floatMs (9000ms)", async () => {
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

    expect(css).toContain(`${AMBIENT.floatMs}ms linear infinite alternate`);
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
  /*
   * ACTUALIZADO por la critica externa #9 (2026-08-17): este mensaje ya no
   * pinta `semantic.error` suelto sino el color que resuelve por rama
   * `fieldErrorColor` (`Contact.tsx`) -- `error[300]` en oscuro, porque el
   * OTRO mensaje de error del mismo formulario (el de campo, sobre el panel
   * translucido de `ScForm`) no llegaba a AA con `semantic.error`. Aqui el
   * fondo es distinto (`surfaceSunken`) y `semantic.error` ya libraba AA con
   * 5.56:1, asi que se sigue midiendo esa cifra -- como control de que el
   * cambio no era NECESARIO en esta pieza -- y ademas la del color que se
   * pinta hoy de verdad, que sobre un fondo casi negro solo puede ser mayor.
   */
  it("el color que se pinta hoy, y el semantic.error que pintaba antes, cumplen los dos AA sobre semantic.surfaceSunken (fondo real de ScFallbackPanel, tema oscuro)", () => {
    const { semantic, palette } = themes.dark;

    const anterior = contrastRatio(semantic.error, semantic.surfaceSunken);
    expect(
      anterior,
      `contraste ${anterior.toFixed(2)}:1, por debajo de AA (4.5:1)`,
    ).toBeGreaterThanOrEqual(4.5);

    const actual = contrastRatio(palette.error[300], semantic.surfaceSunken);
    expect(
      actual,
      `contraste ${actual.toFixed(2)}:1, por debajo de AA (4.5:1)`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(actual).toBeGreaterThan(anterior);
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
 *
 * Fix wave D (hallazgo D3, revisión final de rama, 2026-08-12): las DOS
 * ramas migran de `motion.duration.slower`/`motion.easing.decelerate`
 * sueltos a `REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift`
 * (`@/motion/vocabulary`) -- mismo motivo y mismo patrón que Task 19 ya
 * aplicó a Story.tsx/Features.tsx (ver el describe "Task 19 (D7)..." en
 * Features.test.tsx): la duración coincidía (480ms == `REVEAL.durationMs`)
 * pero la curva NO (`decelerate`, `cubic-bezier(0, 0, 0.2, 1)`, frente a la
 * propia de `REVEAL`, `cubic-bezier(0.23, 1, 0.32, 1)`) -- dos curvas de
 * reveal convivían en la misma página. Este bloque deja de comprobar el
 * literal de tema (`motion.duration.slower`/`motion.easing.decelerate`, que
 * el componente YA NO emite) y pasa a comprobar el token de vocabulario, con
 * `not.toContain(decelerate)` como candado explícito de que la curva vieja
 * no vuelve a colarse.
 *
 * Validado con el bug inyectado a propósito: revirtiendo temporalmente
 * `REVEAL.easing` por `${({ theme }) => theme.data.motion.easing.decelerate}`
 * en `ScCard`/`ScDarkContent` (Contact.tsx), las dos aserciones
 * `not.toContain(themes.*.motion.easing.decelerate)` de este bloque cayeron
 * en rojo; restaurado, volvieron a verde.
 */
describe("D7/D3: duración/easing de entrada unificados a REVEAL.*", () => {
  it("ScCard (rama clara) usa REVEAL.durationMs + REVEAL.easing + REVEAL.shift, ya no motion.easing.decelerate en crudo", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain(`${REVEAL.durationMs}ms`);
    expect(css).toContain(REVEAL.easing);
    expect(css).toContain(`translateY(${REVEAL.shift})`);
    expect(css).not.toContain(themes.light.motion.easing.decelerate);
    expect(css).not.toContain(themes.light.motion.duration.slow);
    expect(css).not.toContain(themes.light.motion.easing.emphasized);
  });

  it("ScDarkContent (rama oscura) usa REVEAL.durationMs + REVEAL.easing + REVEAL.shift, ya no motion.easing.decelerate en crudo", async () => {
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

      expect(css).toContain(`${REVEAL.durationMs}ms`);
      expect(css).toContain(REVEAL.easing);
      expect(css).toContain(`translateY(${REVEAL.shift})`);
      expect(css).not.toContain(themes.dark.motion.easing.decelerate);
      expect(css).not.toContain(themes.dark.motion.duration.slow);
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * AQUI VIVIO el describe "D7: :focus-visible propio del CTA de seccion",
 * que ataba el halo de foco de `ScCta` (el ancla `mailto:` de la rama
 * clara) contra `semantic.focus`. Retirado en la Task 16 (2026-08-11) junto
 * con el propio `ScCta`: el boton de envio del formulario, que ahora existe
 * en las dos ramas, abre el mismo `mailto:` y ya trae su propio
 * `:focus-visible` desde `Button.tsx` (`focusHalo`, atado en
 * `Button.test.tsx` contra el mismo rol de token). No se pierde cobertura
 * de foco: cambia de pieza.
 */

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

    /*
     * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
     * con el bug inyectado a propósito (ver informe de la tarea): comentando
     * temporalmente `touch-action: manipulation;` de ScCardLink
     * (Contact.tsx), este test se pone en rojo; restaurado, vuelve a verde.
     */
    it("Task 13: declara touch-action: manipulation", async () => {
      const cardLink = await renderCardLink();
      const css = cssRuleTextFor(cardLink);
      expect(css).toContain("touch-action: manipulation");
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

/*
 * Task 16: el bloque de canales es el MISMO en las dos ramas, pero sus
 * superficies se resuelven por tema (`panelBackground`/`panelBorder`/
 * `channelAccent`, Contact.tsx). Dos candados distintos y los dos hacen
 * falta:
 *
 * 1. CSS: la rama clara no puede quedarse con el blanco al 4-5 % pensado
 *    para la escena casi negra -- sobre el degradado pastel es invisible.
 * 2. CONTRASTE: el acento de las tarjetas es TEXTO (el título de cada
 *    salida), así que se mide contra el fondo REAL de la rama clara, que no
 *    es la página ni la tarjeta: es el panel translúcido compuesto sobre las
 *    tres paradas de `CONTACT_CARD_GRADIENT`.
 */
describe("Contact: Task 16, superficies y acento del bloque de canales por rama", () => {
  it("rama clara: el formulario y las tarjetas pintan CONTACT_PANEL_BG_LIGHT, no el fondo de la rama oscura", () => {
    const { container } = renderWithProviders(<Contact />);
    const form = container.querySelector("form") as HTMLElement;
    const card = container.querySelector(
      `a[href="${links.discord}"]`,
    ) as HTMLElement;

    const formCss = cssRuleTextFor(form);
    const cardCss = cssRuleTextFor(card);

    expect(formCss).toContain(CONTACT_PANEL_BG_LIGHT);
    expect(formCss).not.toContain(CONTACT_FORM_BG);
    expect(cardCss).toContain(CONTACT_PANEL_BG_LIGHT);
    expect(cardCss).not.toContain(CONTACT_CARD_BG_DARK);
    // El borde de los paneles claros es el MISMO de la tarjeta que los
    // contiene, no `semantic.border` (casi invisible sobre el blanco 82 %).
    expect(formCss).toContain(CONTACT_CARD_BORDER);
    expect(cardCss).toContain(CONTACT_CARD_BORDER);
  });

  /*
   * Este test es el que ATA la medición de contraste de más abajo al color
   * que el componente pinta de verdad. Sin él, la medición seguiría en verde
   * midiendo `secondary[700]` aunque `channelAccent` hubiera pasado a otro
   * paso de la rampa: mediría un color que ya no está en la página (regla 39
   * de RULES.md, misma familia).
   */
  it("rama clara: el icono y el titulo de cada tarjeta resuelven secondary[700], el paso que se mide abajo", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector(
      `a[href="${links.discord}"]`,
    ) as HTMLElement;
    const icono = card.querySelector("svg") as unknown as HTMLElement;
    const titulo = card.querySelector("span") as HTMLElement;

    expect(cssRuleTextFor(icono)).toContain(
      themes.light.palette.secondary[700],
    );
    expect(cssRuleTextFor(titulo)).toContain(
      themes.light.palette.secondary[700],
    );
    // Y el paso de la rama oscura no aparece en la clara.
    expect(cssRuleTextFor(icono)).not.toContain(
      themes.dark.palette.secondary[400],
    );
  });

  /*
   * Fix de la revisión de la Task 16: el `:hover` de `ScCardLink` se quedó
   * fuera de la migración por rama (vivía dentro de `@media PRESS.hoverGuard`,
   * un bloque anidado, y la sustitución no lo alcanzó). El resultado era que
   * hover y foco pintaban pasos DISTINTOS de la rampa en la misma tarjeta, y
   * en la rama clara el paso de la oscura (`secondary[400]`) da 2.28:1 sobre
   * el panel -- por debajo del 3:1 de WCAG 1.4.11 para un borde que comunica
   * estado (lo mide el último test de este describe).
   *
   * El candado busca la regla por su `selectorText` (regla 35 de RULES.md:
   * `&:hover` y `[x] &` pueden compartir substring, solo el selector real los
   * distingue) y baja a las reglas internas de cada `@media`, que es donde
   * vive esta.
   */
  function reglasPorSelector(el: HTMLElement, fragmento: string): string[] {
    const clases = Array.from(el.classList);
    const salida: string[] = [];
    const visitar = (reglas: CSSRuleList): void => {
      Array.from(reglas).forEach((regla) => {
        const anidadas = (regla as CSSMediaRule).cssRules;
        if (anidadas) visitar(anidadas);
        const selector = (regla as CSSStyleRule).selectorText;
        if (
          selector &&
          selector.includes(fragmento) &&
          clases.some((clase) => selector.includes(`.${clase}`))
        ) {
          salida.push(regla.cssText);
        }
      });
    };
    Array.from(document.styleSheets).forEach((hoja) => {
      try {
        visitar(hoja.cssRules);
      } catch {
        /* hoja de otro origen: no aplica en jsdom */
      }
    });
    return salida;
  }

  /*
   * CANDADO DE REFLOW (WCAG 1.4.10), escrito porque el defecto OCURRIO el
   * 2026-08-14 y lo introdujo la entrega de ese mismo dia.
   *
   * Los valores de estas tarjetas son cadenas SIN espacios
   * (`discord.gg/...`, `github.com/...`, `linkedin.com/in/...`), asi que su
   * `min-content` es su ancho entero. `ScCard` es un grid cuya pista `auto`
   * nunca baja de ese `min-content`, de modo que la cadena mas larga fija el
   * ancho de la tarjeta ENTERA.
   *
   * Medido a 320px en claro cuando se anadio la tercera tarjeta: la pista
   * paso de 220,9px a 251,4px dentro de una caja de contenido de 206px, la
   * tarjeta desbordo 45px y la nota de privacidad quedo 7px FUERA, recortada
   * por su `overflow: hidden`. Aislado retirando solo esa tarjeta, la nota
   * volvia a quedar 19px dentro.
   *
   * `anywhere` y no `break-word`: solo la primera afecta al calculo de
   * `min-content`, que es la magnitud que aqui hay que dejar encoger. Un
   * test que aceptara cualquiera de las dos no ataria nada.
   */
  it("el valor de cada tarjeta puede partir en cualquier punto: sin eso, una URL larga rompe el reflow a 320px", () => {
    const { container } = renderWithProviders(<Contact />);
    const valores = Array.from(
      container.querySelectorAll('a[target="_blank"] span'),
    ).filter((n) => /[./]/.test(n.textContent ?? ""));

    expect(
      valores.length,
      "no se encontro ningun valor de tarjeta que medir",
    ).toBeGreaterThan(0);

    for (const valor of valores) {
      const reglas = reglasPorSelector(valor as HTMLElement, "");
      const declara = reglas.some((r) => /overflow-wrap:\s*anywhere/.test(r));
      expect(
        declara,
        `"${valor.textContent}" no declara overflow-wrap: anywhere`,
      ).toBe(true);
    }
  });

  it("rama clara: el borde de :hover y el de :focus-visible resuelven el MISMO acento (secondary[700]), no dos pasos distintos", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector(
      `a[href="${links.discord}"]`,
    ) as HTMLElement;

    const hover = reglasPorSelector(card, ":hover");
    const foco = reglasPorSelector(card, ":focus-visible");
    expect(
      hover.length,
      "no se encontró la regla :hover de ScCardLink",
    ).toBeGreaterThan(0);
    expect(
      foco.length,
      "no se encontró la regla :focus-visible",
    ).toBeGreaterThan(0);

    const conBorde = (reglas: string[]): string =>
      reglas.filter((r) => r.includes("border-color")).join("\n");
    expect(conBorde(hover)).toContain(themes.light.palette.secondary[700]);
    expect(conBorde(hover)).not.toContain(themes.dark.palette.secondary[400]);
    expect(conBorde(foco)).toContain(themes.light.palette.secondary[700]);
  });

  it("rama oscura: el mismo par hover/foco conserva secondary[400] -- la migracion es POR RAMA, no un cambio global", async () => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });
      const card = container.querySelector(
        `a[href="${links.discord}"]`,
      ) as HTMLElement;

      const conBorde = (reglas: string[]): string =>
        reglas.filter((r) => r.includes("border-color")).join("\n");
      expect(conBorde(reglasPorSelector(card, ":hover"))).toContain(
        themes.dark.palette.secondary[400],
      );
      expect(conBorde(reglasPorSelector(card, ":focus-visible"))).toContain(
        themes.dark.palette.secondary[400],
      );
    } finally {
      window.localStorage.clear();
    }
  });

  /*
   * Alfa y color del panel se LEEN de la constante, no se escriben a mano:
   * si `CONTACT_PANEL_BG_LIGHT` cambiara de valor, esta medición cambia con
   * ella en vez de seguir afirmando un número viejo.
   *
   * La composición se hace sobre LUMINANCIAS y no canal a canal porque la
   * luminancia relativa es una combinación LINEAL de los canales: mezclar
   * por canal y luego pesar da exactamente lo mismo que pesar y luego
   * mezclar. Con el overlay siendo blanco puro (luminancia 1) el término se
   * reduce a `alfa + (1 - alfa) * L(parada)`.
   */
  const PANEL_RGBA = CONTACT_PANEL_BG_LIGHT.match(
    /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/,
  );

  it("el panel claro es blanco puro con alfa (premisa de la medicion de abajo)", () => {
    expect(PANEL_RGBA).not.toBeNull();
    expect([PANEL_RGBA?.[1], PANEL_RGBA?.[2], PANEL_RGBA?.[3]]).toEqual([
      "255",
      "255",
      "255",
    ]);
  });

  it("el acento claro de las tarjetas (secondary[700]) y el valor (textMuted) libran AA sobre el panel real", () => {
    const alfa = Number(PANEL_RGBA?.[4]);
    // Mismas tres paradas que `CONTACT_CARD_GRADIENT` (contact.layers.ts).
    const paradas = ["#EFF4FC", "#F5F2FB", "#F9F0F7"];

    paradas.forEach((parada) => {
      const lPanel = alfa + (1 - alfa) * relativeLuminanceHex(parada);
      const medir = (color: string): number => {
        const lTexto = relativeLuminance(color);
        const claro = Math.max(lTexto, lPanel);
        const oscuro = Math.min(lTexto, lPanel);
        return (claro + 0.05) / (oscuro + 0.05);
      };

      const acento = medir(themes.light.palette.secondary[700]);
      const valor = medir(themes.light.semantic.textMuted);
      expect(
        acento,
        `acento sobre ${parada}: ${acento.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        valor,
        `valor sobre ${parada}: ${valor.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("el acento oscuro NO se cuela en la rama clara: secondary[400] sobre ese mismo panel no llegaria a AA", () => {
    // Candado de la DECISION, no del valor: mide el paso que la rama oscura
    // usa y comprueba que en claro habria sido insuficiente. Si alguien
    // "simplifica" `channelAccent` a un único paso compartido, este test lo
    // dice con la cifra delante.
    const alfa = Number(PANEL_RGBA?.[4]);
    const lPanel = alfa + (1 - alfa) * relativeLuminanceHex("#EFF4FC");
    const lTexto = relativeLuminance(themes.dark.palette.secondary[400]);
    const ratio =
      (Math.max(lTexto, lPanel) + 0.05) / (Math.min(lTexto, lPanel) + 0.05);
    // Se asevera contra 3:1, no contra 4.5:1, a proposito: este paso pinta
    // ademas el BORDE de hover/foco de la tarjeta, y 3:1 es el umbral de
    // WCAG 1.4.11 para un elemento no textual que comunica estado. Falla
    // incluso ese suelo mas bajo (2.28:1), que es lo que hace la resolucion
    // por rama de `channelAccent` no negociable en claro -- y lo que
    // convierte en defecto real el `:hover` que la revision encontro sin
    // migrar.
    expect(
      ratio,
      `secondary[400] en claro: ${ratio.toFixed(2)}:1`,
    ).toBeLessThan(3);
  });
});

/*
 * Task 16, punto 5 del brief: el detector automático del gate F2 reportó
 * `ScCard` (rama clara) como el único recorte de TEXTO real de la página --
 * `scrollHeight` 422 contra `clientHeight` 364 a 1280×900. Medido en
 * navegador (informe de la tarea): los 58px son `ScRingHalo` (disco
 * decorativo de 480px), y con la figura ya cargada el desbordamiento sube a
 * 533 porque manda `ScFigure` (560px). El texto medía 103-191 dentro de una
 * caja de contenido 32-332: ni un glifo fuera.
 *
 * Este candado NO puede reproducir la medición -- jsdom no hace layout, no
 * pinta y no evalúa @media (regla 36 de RULES.md) -- así que ata la
 * CONDICION que haría posible un recorte de texto de verdad: que la tarjeta
 * fijara su altura, o que la columna de texto recortara por su cuenta. Sin
 * ninguna de las dos, lo único que el `overflow: hidden` puede recortar es
 * el arte que desborda a propósito.
 */
describe("Contact: Task 16, el recorte de ScCard es del arte y no del texto", () => {
  it("ScCard recorta (overflow: hidden) pero NO fija altura: crece con su contenido", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const css = cssRuleTextFor(card);

    expect(css).toContain("overflow: hidden");
    expect(css).not.toMatch(/(^|[^-])height:\s*\d/m);
    expect(css).not.toContain("max-height");
  });

  it("la columna de texto de la tarjeta no declara ningun overflow propio", () => {
    const { container } = renderWithProviders(<Contact />);
    // `ScLeft` es el ancestro comun del h2 y del bloque de canales: se
    // localiza desde el h2 real, no por clase de styled-components (que
    // cambia de hash entre builds).
    const columna = (container.querySelector("h2") as HTMLElement)
      .parentElement as HTMLElement;
    expect(columna.querySelector("form")).not.toBeNull();

    const css = cssRuleTextFor(columna);
    expect(css).not.toContain("overflow");
    expect(css).not.toContain("max-height");
  });
});

/*
 * CRITICA EXTERNA #8 (Nielsen, 2026-08-17). Dos defectos, cerrados juntos
 * porque el segundo dejaba al primero sin forma de fallar visiblemente:
 *
 * 1. El formulario pedia el correo y NADA MAS, asi que el mailto se abria con
 *    un cuerpo que solo repetia esa direccion: el mensaje -- lo unico que el
 *    destinatario necesita -- habia que redactarlo desde cero en el cliente
 *    de correo. Se anade el campo de mensaje y su texto viaja en el body.
 * 2. El form no declaraba noValidate, asi que la validacion NATIVA ganaba: el
 *    navegador atrapaba el envio antes de handleSubmit y mostraba su propio
 *    globo, dejando INALCANZABLE la UI de error propia del repo para los dos
 *    casos mas comunes (campo vacio, correo malformado).
 *
 * ALCANCE: hay UN SOLO form en toda la seccion -- `contactChannels` es un
 * unico arbol de JSX que las dos ramas de tema montan tal cual (Task 16) --
 * asi que el comportamiento se ejercita en la rama clara, y de la oscura se
 * comprueba que monta el MISMO control y el MISMO atributo en vez de duplicar
 * cada escenario.
 */
describe("Contact: critica #8, el mensaje viaja en el mailto y la validacion propia es alcanzable", () => {
  function mockAssign(): {
    assignSpy: ReturnType<typeof vi.fn>;
    restore: () => void;
  } {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    return {
      assignSpy,
      restore: () =>
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        }),
    };
  }

  it("el form declara noValidate: sin el, el navegador se adelanta a handleSubmit y la UI de error propia no llega a verse", () => {
    const { container } = renderWithProviders(<Contact />);
    const form = container.querySelector("form") as HTMLFormElement;

    // Atributo Y propiedad: el atributo es lo que el JSX declara, la
    // propiedad es lo que el navegador consulta antes de validar.
    expect(form).toHaveAttribute("novalidate");
    expect(form.noValidate).toBe(true);

    // Los atributos nativos que quedan NO se retiran: siguen describiendo el
    // campo para un lector de pantalla. Lo que noValidate apaga es el bloqueo
    // y el globo. El `required` del correo si se retiro, pero por D4 (el
    // campo dejo de ser obligatorio), no por esta regla.
    const email = screen.getByLabelText(esHome.Home.contact.form.label);
    expect(email).not.toHaveAttribute("required");
    expect(email).toHaveAttribute("type", "email");
    expect(
      screen.getByLabelText(esHome.Home.contact.form.messageLabel),
    ).toHaveAttribute("required");
  });

  it("un envio valido lleva el mensaje en el body del mailto, decodificable, y conserva el subject existente", () => {
    const { assignSpy, restore } = mockAssign();
    try {
      const { container } = renderWithProviders(<Contact />);
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      expect(assignSpy).toHaveBeenCalledTimes(1);
      /*
       * Se PARSEA la URL en vez de comparar cadenas: searchParams deshace el
       * porcentaje-codificado, asi que el assert lee el texto TAL CUAL lo
       * escribio el visitante. Y es exactamente lo que caza un
       * encodeURIComponent perdido: MENSAJE_VALIDO lleva un ampersand, que
       * sin codificar abriria un parametro nuevo y truncaria el cuerpo ahi.
       */
      const url = new URL(assignSpy.mock.calls[0][0] as string);
      expect(url.protocol).toBe("mailto:");
      expect(url.searchParams.get("subject")).toBe(
        esHome.Home.contact.form.subject,
      );
      const body = url.searchParams.get("body");
      expect(body).toContain(MENSAJE_VALIDO);
      expect(body).toContain("visitante@test.com");
      // La plantilla resolvio las DOS interpolaciones: ningun marcador crudo
      // llega al cliente de correo del visitante.
      expect(body).not.toContain("{{");
    } finally {
      restore();
    }
  });

  it("con el mensaje vacio (aunque sean espacios) NO navega y pinta el error propio del mensaje", () => {
    const { assignSpy, restore } = mockAssign();
    try {
      const { container } = renderWithProviders(<Contact />);
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      // Solo espacios: producen un correo igual de vacio que no escribir nada.
      const textarea = escribirMensaje("   ");
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      expect(assignSpy).not.toHaveBeenCalled();
      expect(anunciados()).toContain(esHome.Home.contact.form.messageError);
      expect(textarea).toHaveAttribute("aria-invalid", "true");
      // El error del correo NO se enciende: el correo era valido.
      expect(
        screen.queryByText(esHome.Home.contact.form.emailError),
      ).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("escribir el mensaje retira su error de inmediato, y el siguiente envio ya navega", () => {
    const { assignSpy, restore } = mockAssign();
    try {
      const { container } = renderWithProviders(<Contact />);
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      fireEvent.submit(form);
      expect(anunciados()).toContain(esHome.Home.contact.form.messageError);

      escribirMensaje();
      expect(
        screen.queryByText(esHome.Home.contact.form.messageError),
      ).not.toBeInTheDocument();

      fireEvent.submit(form);
      expect(assignSpy).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("las tres claves nuevas tienen paridad es/en con texto propio de cada idioma, y la plantilla del cuerpo interpola los dos datos en los dos idiomas", () => {
    const nuevas = [
      "messageLabel",
      "messagePlaceholder",
      "messageError",
    ] as const;

    for (const clave of nuevas) {
      const es = esHome.Home.contact.form[clave];
      const en = enHome.Home.contact.form[clave];
      expect(es.trim(), `es: ${clave} vacia`).not.toBe("");
      expect(en.trim(), `en: ${clave} vacia`).not.toBe("");
      // Una traduccion copiada literal del espanol es el fallo que la paridad
      // de RUTAS (locales.test.ts) no puede ver: aqui se compara el VALOR.
      expect(en, `en: ${clave} sin traducir`).not.toBe(es);
    }

    for (const plantilla of [
      esHome.Home.contact.form.body,
      enHome.Home.contact.form.body,
    ]) {
      expect(plantilla).toContain("{{email}}");
      expect(plantilla).toContain("{{message}}");
    }
  });

  it("en ingles, el campo de mensaje se etiqueta en ingles (la otra mitad del contrato de paridad)", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Contact />);
      expect(
        screen.getByLabelText(enHome.Home.contact.form.messageLabel),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(esHome.Home.contact.form.messageLabel),
      ).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  describe("rama oscura (mismo arbol de JSX)", () => {
    beforeEach(() => {
      stubMatchMedia();
      window.localStorage.setItem("vti-theme", "dark");
    });
    afterEach(() => {
      window.localStorage.clear();
    });

    it("monta el MISMO formulario: noValidate y campo de mensaje con su placeholder", async () => {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelectorAll("img")).toHaveLength(
          CONTACT_GUARDIAN_LAYERS.length,
        );
      });

      const form = container.querySelector("form") as HTMLFormElement;
      expect(form.noValidate).toBe(true);
      const textarea = screen.getByLabelText(
        esHome.Home.contact.form.messageLabel,
      );
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea).toHaveAttribute(
        "placeholder",
        esHome.Home.contact.form.messagePlaceholder,
      );
    });
  });
});

/*
 * CRITICA EXTERNA #9 (Nielsen + craft, 2026-08-17). Siete hallazgos sobre esta
 * seccion, todos con su candado aqui:
 *
 * P1 -- sin JavaScript el formulario destruia el mensaje en silencio (envio
 *       nativo sin `name`, sin `<noscript>` en todo el documento).
 * P2 -- el foco no viajaba al primer campo invalido tras un envio fallido.
 * P2 -- los mensajes de error median 12px (`caption`).
 * P2 -- `aria-describedby` SUSTITUIA la ayuda por el error en vez de sumarlos.
 * P2 -- 3 de los 16 enlaces a pestaña nueva del sitio (los de esta seccion) no
 *       llevaban el aviso que los otros 13 si.
 * Craft -- la entradilla se leia a 82,6 caracteres por linea (sin tope).
 * Craft -- dos animaciones declaraban `ease-in-out`, una curva fuera de token.
 */
describe("Contact: critica externa #9", () => {
  /**
   * Render de SERVIDOR, con los mismos proveedores reales que
   * `renderWithProviders`. Es exactamente el camino que genera el HTML del
   * export estatico -- el unico artefacto que un visitante sin JavaScript
   * llega a recibir, porque sin JS no hay hidratacion que cambie nada.
   *
   * NACIO por el `<noscript>`: era la unica via capaz de ver su contenido,
   * porque React trata los hijos de esa etiqueta como contenido de TEXTO
   * (`shouldSetTextContent` devuelve `true`) y un render de cliente -- el de
   * Testing Library -- la dejaba VACIA. Ese `<noscript>` se retiro en la
   * critica externa #11 (hallazgo B2: se vaciaba tambien en el navegador, en
   * cualquier re-render de cliente -- ver la lapida en el docblock de
   * `ScNoJsNote`). El helper SOBREVIVE porque lo que ahora ata es otra cosa:
   * que el aviso viaja de verdad HORNEADO en el HTML servido, no solo montado
   * por el cliente.
   */
  function markupDeServidor(): string {
    return renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <Contact />
        </ThemeProvider>
      </I18nextProvider>,
    );
  }

  describe("P1: salida real sin JavaScript", () => {
    /*
     * CONTRATO REVERTIDO, NO RELAJADO (regla 40; critica externa #11, hallazgo
     * B2, 2026-08-18). Este test exigia lo contrario -- que el HTML horneado
     * llevara un `<noscript>` dentro del formulario -- y se invierte con la
     * medicion delante, no porque estorbara: en navegador real,
     * `noscript.textContent.length` valia 268 en el HTML servido, 0 tras
     * conmutar el tema y 0 al volver. Lo que aquel candado protegia (que el
     * aviso y el mailto real viajan horneados dentro del formulario) sigue
     * atado aqui, palabra por palabra; lo unico que cambia es la etiqueta que
     * los transporta.
     */
    it("el HTML horneado lleva el aviso y el mailto real de src/config dentro del formulario, y YA NO en un <noscript>", () => {
      const markup = markupDeServidor();

      // La lapida: la etiqueta que se vaciaba sola no vuelve por la puerta de
      // atras. Si alguien la reintroduce, este test lo dice.
      expect(markup).not.toContain("<noscript");

      const form = markup.match(/<form[\s\S]*?<\/form>/)?.[0] ?? "";
      expect(form, "no hay ningun <form> en el markup").not.toBe("");
      expect(form).toContain(esHome.Home.contact.form.noscript);
      // La direccion NO se escribe a mano en el componente: sale de
      // `links.email`, y el texto visible deriva de el.
      expect(form).toContain(`href="${links.email}"`);
      expect(form).toContain(links.email.replace(/^mailto:/, ""));
    });

    it("en ingles el aviso sale en ingles (paridad es/en con texto propio de cada idioma)", async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
      try {
        expect(markupDeServidor()).toContain(enHome.Home.contact.form.noscript);
        expect(enHome.Home.contact.form.noscript).not.toBe(
          esHome.Home.contact.form.noscript,
        );
      } finally {
        await act(async () => {
          await i18n.changeLanguage("es");
        });
      }
    });

    it("los dos campos declaran name: sin el, un envio nativo recarga con la query VACIA y lo escrito se pierde", () => {
      renderWithProviders(<Contact />);

      expect(
        screen.getByLabelText(esHome.Home.contact.form.label),
      ).toHaveAttribute("name", "email");
      expect(
        screen.getByLabelText(esHome.Home.contact.form.messageLabel),
      ).toHaveAttribute("name", "message");
    });

    /*
     * CONTRATO REVERTIDO EN SU MITAD DE `method`, NO RELAJADO (regla 40;
     * critica externa #12, 2026-08-18). Este test exigia que el form NO
     * declarara `method` -- "la decision es GET al propio documento" --, y esa
     * decision se revoca con la medicion delante: ese GET publicaba el correo
     * y el mensaje del visitante en la URL (y con ella en el historial y en
     * los logs del host). La mitad de `action` sigue exactamente igual, con su
     * motivo intacto; la de `method` pasa a exigir el valor que apaga el envio
     * nativo entero. Ver el docblock de `handleSubmit` para la medicion en dos
     * motores y para el caso Enter, y el describe "Contact: critica externa
     * #12" (mas abajo) para el candado del boton y el del ancestro `<dialog>`.
     */
    it("el form NO declara action (no un mailto: como action) y declara method=dialog (envio nativo apagado)", () => {
      /*
       * Candado de la DECISION documentada en el docblock de `handleSubmit`:
       * con `action="mailto:..."` el algoritmo de envio de formularios
       * SUSTITUYE la query del mailto por los datos del formulario, asi que
       * los campos solo llegarian al cliente de correo si se llamaran como
       * los parametros de mailto (`subject`, `body`), y el visitante sin JS
       * veria abrirse un correo vacio -- peor que no abrir nada. Si alguien
       * lo reintroduce, este test lo dice.
       */
      const { container } = renderWithProviders(<Contact />);
      const form = container.querySelector("form") as HTMLFormElement;

      expect(form).not.toHaveAttribute("action");
      expect(form).toHaveAttribute("method", "dialog");
      // La otra mitad de la decision sigue en pie: la validacion propia es la
      // unica que se ve, asi que `noValidate` no se retira.
      expect(form.noValidate).toBe(true);
    });
  });

  describe("P2: el foco viaja al primer campo invalido", () => {
    function submitCon(email: string, mensaje: string): void {
      const { container } = renderWithProviders(<Contact />);
      const form = container.querySelector("form") as HTMLFormElement;
      if (email) {
        fireEvent.change(
          screen.getByLabelText(esHome.Home.contact.form.label),
          { target: { value: email } },
        );
      }
      if (mensaje) escribirMensaje(mensaje);
      fireEvent.submit(form);
    }

    it("con el correo invalido, el foco va al correo (primero en orden del DOM), no al boton de envio", () => {
      submitCon("no-es-un-correo", MENSAJE_VALIDO);

      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      expect(document.activeElement).toBe(input);
      // Sonda del defecto original: el foco se quedaba en el disparador.
      expect(document.activeElement).not.toBe(
        screen.getByRole("button", {
          name: esHome.Home.contact.form.submitAria,
        }),
      );
    });

    it("con el correo valido y el mensaje vacio, el foco va al MENSAJE: es el primer invalido que queda", () => {
      submitCon("visitante@test.com", "");

      expect(document.activeElement).toBe(
        screen.getByLabelText(esHome.Home.contact.form.messageLabel),
      );
    });

    it("con los DOS invalidos, el foco va al correo y los DOS errores siguen pintados a la vez", () => {
      // D4: "invalido" en el correo ya solo puede significar MAL ESCRITO --
      // vacio dejo de suspender, asi que el caso de los dos a la vez se
      // reproduce con un correo con forma incorrecta.
      submitCon("no-es-un-correo", "");

      expect(document.activeElement).toBe(
        screen.getByLabelText(esHome.Home.contact.form.label),
      );
      const anunciados = screen
        .getAllByRole("status")
        .map((nodo) => nodo.textContent);
      expect(anunciados).toContain(esHome.Home.contact.form.emailError);
      expect(anunciados).toContain(esHome.Home.contact.form.messageError);
    });
  });

  describe("P2: aria-describedby SUMA el error a la ayuda, no la sustituye", () => {
    it("sin error, el campo describe solo la ayuda -- y la ayuda existe de verdad en el DOM", () => {
      renderWithProviders(<Contact />);
      const input = screen.getByLabelText(esHome.Home.contact.form.label);

      expect(input).toHaveAttribute("aria-describedby", "contact-email-help");
      expect(document.getElementById("contact-email-help")).toHaveTextContent(
        esHome.Home.contact.form.help,
      );
    });

    it("con error, describe los DOS: el error PRIMERO y la ayuda DESPUES, y los dos nodos existen", () => {
      const { container } = renderWithProviders(<Contact />);
      escribirMensaje();
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "no-es-un-correo" },
      });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      expect(input).toHaveAttribute(
        "aria-describedby",
        "contact-email-error contact-email-help",
      );
      // Un describedby que apunta a un id inexistente no describe nada: los
      // DOS destinos tienen que estar montados a la vez, que es exactamente
      // lo que el `message = error ?? help` de `Field` impedia.
      expect(document.getElementById("contact-email-error")).toHaveTextContent(
        esHome.Home.contact.form.emailError,
      );
      expect(document.getElementById("contact-email-help")).toHaveTextContent(
        esHome.Home.contact.form.help,
      );
    });

    it("el campo de mensaje describe su error con el id que declara, y aria-invalid sigue atado al mismo estado", () => {
      const { container } = renderWithProviders(<Contact />);
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      const textarea = screen.getByLabelText(
        esHome.Home.contact.form.messageLabel,
      );
      /*
       * El contador de caracteres se SUMA a esta descripción desde la ola P
       * (2026-09-04) -- regla 40: quien añade un elemento actualiza la fuente
       * de verdad del test, no relaja la aserción. El orden es el mismo
       * criterio que ya sigue el campo de correo justo arriba: primero el
       * mensaje bloqueante, después el informativo.
       */
      expect(textarea).toHaveAttribute(
        "aria-describedby",
        "contact-message-error contact-message-counter",
      );
      expect(textarea).toHaveAttribute("aria-invalid", "true");
      expect(
        document.getElementById("contact-message-error"),
      ).toHaveTextContent(esHome.Home.contact.form.messageError);
    });
  });

  describe("P2: los mensajes del formulario dejan de medir 12px", () => {
    it("el error de campo y la ayuda resuelven type.scale.bodySm, no caption", () => {
      const { container } = renderWithProviders(<Contact />);
      escribirMensaje();
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "no-es-un-correo" },
      });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      const error = document.getElementById(
        "contact-email-error",
      ) as HTMLElement;
      const ayuda = document.getElementById(
        "contact-email-help",
      ) as HTMLElement;

      [error, ayuda].forEach((nodo) => {
        const css = cssRuleTextFor(nodo);
        expect(css).toContain(
          `font-size: ${themes.light.type.scale.bodySm.size}`,
        );
        // Falsable de verdad: los dos peldaños son valores DISTINTOS
        // (0.875rem vs 0.75rem), asi que revertir al viejo pone esto en rojo.
        expect(css).not.toContain(
          `font-size: ${themes.light.type.scale.caption.size}`,
        );
      });
    });

    it("el mensaje de fallo del boton Copiar sube al mismo peldaño (un solo tamaño de error por formulario)", async () => {
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
        fireEvent.change(
          screen.getByLabelText(esHome.Home.contact.form.label),
          { target: { value: "visitante@test.com" } },
        );
        escribirMensaje();
        fireEvent.submit(container.querySelector("form") as HTMLFormElement);
        await act(async () => {
          fireEvent.click(
            screen.getByRole("button", {
              name: esHome.Home.contact.form.copyAddress,
            }),
          );
        });

        const css = cssRuleTextFor(
          screen.getByText(esHome.Home.contact.form.copyError),
        );
        expect(css).toContain(
          `font-size: ${themes.light.type.scale.bodySm.size}`,
        );
        expect(css).not.toContain(
          `font-size: ${themes.light.type.scale.caption.size}`,
        );
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        });
      }
    });

    /*
     * El TAMAÑO sube y, midiendolo, aparecio ademas un fallo de CONTRASTE
     * preexistente: `semantic.error` en oscuro (`error[500]`) da 3.65:1 sobre
     * el panel real de este formulario -- por debajo de AA. Se resuelve POR
     * RAMA dentro de la seccion (`fieldErrorColor`, `Contact.tsx`), mismo
     * precedente que `channelAccent` aqui mismo y que las Tasks 26/33. La
     * causa raiz (el rol `semanticDark.error`) vive en `theme/`, fuera de la
     * particion de esta entrega, y queda declarada en el docblock de esa
     * funcion.
     *
     * Fondos REALES: en claro, el panel es blanco al 82%
     * (CONTACT_PANEL_BG_LIGHT) compuesto sobre las tres paradas de
     * CONTACT_CARD_GRADIENT; en oscuro, CONTACT_FORM_BG (blanco al 4%) sobre
     * el void de la escena.
     */
    function ratioSobrePanelClaro(color: string, parada: string): number {
      const alfa = Number(
        CONTACT_PANEL_BG_LIGHT.match(/([\d.]+)\)$/)?.[1] ?? "0",
      );
      const lPanel = alfa + (1 - alfa) * relativeLuminanceHex(parada);
      const lTexto = relativeLuminance(color);
      return (
        (Math.max(lTexto, lPanel) + 0.05) / (Math.min(lTexto, lPanel) + 0.05)
      );
    }

    function ratioSobrePanelOscuro(color: string): number {
      const alfa = Number(CONTACT_FORM_BG.match(/([\d.]+)\)$/)?.[1] ?? "0");
      const lPanel =
        alfa + (1 - alfa) * relativeLuminanceHex(CONTACT_GUARDIAN_VOID);
      const lTexto = relativeLuminance(color);
      return (
        (Math.max(lTexto, lPanel) + 0.05) / (Math.min(lTexto, lPanel) + 0.05)
      );
    }

    it("el error y la ayuda libran AA sobre el fondo REAL del panel del formulario en las dos ramas", () => {
      ["#EFF4FC", "#F5F2FB", "#F9F0F7"].forEach((parada) => {
        const error = ratioSobrePanelClaro(themes.light.semantic.error, parada);
        const ayuda = ratioSobrePanelClaro(
          themes.light.semantic.textSubtle,
          parada,
        );
        expect(
          error,
          `error claro sobre ${parada}: ${error.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          ayuda,
          `ayuda clara sobre ${parada}: ${ayuda.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      });

      const errorOscuro = ratioSobrePanelOscuro(themes.dark.palette.error[300]);
      const ayudaOscura = ratioSobrePanelOscuro(
        themes.dark.semantic.textSubtle,
      );
      expect(
        errorOscuro,
        `error oscuro sobre el panel de la escena: ${errorOscuro.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        ayudaOscura,
        `ayuda oscura sobre el panel de la escena: ${ayudaOscura.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("candado de la DECISION: en oscuro, semantic.error NO habria llegado a AA sobre ese panel (ni el paso siguiente)", () => {
      /*
       * Mismo patron que "el acento oscuro NO se cuela en la rama clara": mide
       * el paso que se DESCARTO y comprueba con la cifra delante que habria
       * sido insuficiente. Si alguien "simplifica" `fieldErrorColor` a un solo
       * rol compartido, este test lo dice.
       */
      const conRol = ratioSobrePanelOscuro(themes.dark.semantic.error);
      const conPaso400 = ratioSobrePanelOscuro(themes.dark.palette.error[400]);
      expect(
        conRol,
        `semantic.error en oscuro: ${conRol.toFixed(2)}:1`,
      ).toBeLessThan(4.5);
      expect(
        conPaso400,
        `error[400] en oscuro: ${conPaso400.toFixed(2)}:1`,
      ).toBeLessThan(4.5);
    });

    it("el mensaje RENDERIZADO resuelve ese color por rama, no el rol generico", async () => {
      /* D4: el error del correo solo se enciende con un valor MAL ESCRITO,
         asi que el envio en blanco que servia para provocarlo ya no vale --
         se escribe un correo sin forma de correo antes de enviar. */
      const conCorreoInvalido = (contenedor: HTMLElement): void => {
        fireEvent.change(
          within(contenedor).getByLabelText(esHome.Home.contact.form.label),
          { target: { value: "no-es-un-correo" } },
        );
        fireEvent.submit(contenedor.querySelector("form") as HTMLFormElement);
      };

      // Rama clara: el rol se conserva (ya libraba AA).
      const { container, unmount } = renderWithProviders(<Contact />);
      conCorreoInvalido(container);
      expect(
        cssRuleTextFor(
          document.getElementById("contact-email-error") as HTMLElement,
        ),
      ).toContain(`color: ${themes.light.semantic.error}`);
      unmount();

      // Rama oscura: el paso claro de la rampa, no `semantic.error`.
      window.localStorage.setItem("vti-theme", "dark");
      try {
        const oscuro = renderWithProviders(<Contact />);
        await waitFor(() => {
          expect(
            oscuro.container.querySelectorAll("img").length,
          ).toBeGreaterThan(0);
        });
        conCorreoInvalido(oscuro.container);
        const css = cssRuleTextFor(
          document.getElementById("contact-email-error") as HTMLElement,
        );
        expect(css).toContain(`color: ${themes.dark.palette.error[300]}`);
        expect(css).not.toContain(`color: ${themes.dark.semantic.error}`);
      } finally {
        window.localStorage.clear();
      }
    });
  });

  describe("P2: los 3 enlaces a pestaña nueva avisan como los otros 13 del sitio", () => {
    it("cada tarjeta de canal lleva el aviso de Common.Nav.newTab y este forma parte de su nombre accesible", () => {
      const { container } = renderWithProviders(<Contact />);

      [links.discord, links.github, links.linkedin].forEach((href) => {
        const enlace = container.querySelector(
          `a[href="${href}"]`,
        ) as HTMLAnchorElement;
        expect(enlace, `falta el enlace a ${href}`).toBeInTheDocument();
        // Presencia del nodo...
        expect(
          within(enlace).getByText(esCommon.Common.Nav.newTab),
        ).toBeInTheDocument();
        // ...y que de verdad se ANUNCIE: el aviso cierra el nombre accesible.
        expect(enlace).toHaveAccessibleName(
          new RegExp(`${esCommon.Common.Nav.newTab}$`),
        );
      });
    });

    it("el aviso sale del namespace common (el mismo que usan Navbar/Footer/Story), no de una clave propia de la seccion", async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
      try {
        const { container } = renderWithProviders(<Contact />);
        const enlace = container.querySelector(
          `a[href="${links.discord}"]`,
        ) as HTMLAnchorElement;
        expect(
          within(enlace).getByText(enCommon.Common.Nav.newTab),
        ).toBeInTheDocument();
      } finally {
        await act(async () => {
          await i18n.changeLanguage("es");
        });
      }
    });
  });

  describe("craft: medida de linea y curvas de movimiento", () => {
    it("la entradilla topa su medida con grid.prose, no con el ancho de la columna", () => {
      renderWithProviders(<Contact />);
      const parrafo = screen.getByText(esHome.Home.contact.body, {
        exact: false,
      });
      const css = cssRuleTextFor(parrafo);

      expect(css).toContain(`max-width: ${themes.light.grid.prose}`);
    });

    it("la flotacion de la figura resuelve motion.easing.standard, ya no la palabra clave ease-in-out", () => {
      renderWithProviders(<Contact />);
      const figura = screen.getByAltText(esHome.Home.contact.figureAlt);
      const css = cssRuleTextFor(figura);

      expect(css).toContain(themes.light.motion.easing.standard);
      // Falsable: la palabra clave y la curva del token son cadenas
      // DISTINTAS, asi que revertir la migracion pone esto en rojo.
      expect(css).not.toContain("ease-in-out");
    });

    it("el halo superior de la rama oscura hace la misma migracion de curva", async () => {
      window.localStorage.setItem("vti-theme", "dark");
      try {
        const { container } = renderWithProviders(<Contact />);
        await waitFor(() => {
          expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
        });

        /*
         * El nombre del `keyframes` es un hash generado, no la cadena
         * `glowPulse`, asi que la regla se localiza por su DURACION -- 7000ms,
         * `CONTACT_TOP_GLOW_PULSE_MS`, unica en el fichero.
         */
        const css = Array.from(document.styleSheets)
          .flatMap((sheet) => {
            try {
              return Array.from(sheet.cssRules).map((rule) => rule.cssText);
            } catch {
              return [];
            }
          })
          .filter((text) => text.includes(`${CONTACT_TOP_GLOW_PULSE_MS}ms`))
          .join("\n");

        expect(css, "no hay ninguna regla con la duracion del halo").not.toBe(
          "",
        );
        expect(css).toContain(themes.dark.motion.easing.standard);
        expect(css).not.toContain("ease-in-out");
      } finally {
        window.localStorage.clear();
      }
    });
  });
});

/*
 * CRITICA EXTERNA #11 (2026-08-18). Dos hallazgos P1 sobre esta seccion, los
 * dos reproducidos en navegador real antes de tocar nada:
 *
 * A  -- el panel de respaldo que revela un envio VALIDO sobrevivia a un
 *       reenvio RECHAZADO por la validacion: la pantalla afirmaba a la vez
 *       "si no se ha abierto tu aplicacion de correo, escribeme a ..." (de un
 *       envio anterior) y "escribe un correo valido" (del intento actual).
 * B2 -- el aviso sin JavaScript vivia en un `<noscript>`, y React vacia los
 *       hijos de esa etiqueta en CUALQUIER re-render de cliente. Medido sobre
 *       el HTML servido: `noscript.textContent.length` = 268, conmutar el tema
 *       -> 0, volver -> 0. Si el JavaScript moria despues de la primera
 *       interaccion, el aviso ya no estaba.
 */
describe("Contact: critica externa #11", () => {
  describe("hallazgo A (P1): un reenvio rechazado retira el panel de respaldo", () => {
    /*
     * `assign` doblado, nunca `href` (un setter de propiedad no se puede
     * espiar -- ver el docblock de `handleSubmit`). En beforeEach/afterEach y
     * no en un try/finally por test porque los tres tests de este bloque
     * necesitan exactamente lo mismo.
     */
    const originalLocation = window.location;
    let assignSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      assignSpy = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, assign: assignSpy },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    /** Rellena los dos campos con valores validos y envia. Devuelve el form. */
    function envioValido(): HTMLFormElement {
      const { container } = renderWithProviders(<Contact />);
      const form = container.querySelector("form") as HTMLFormElement;
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      escribirMensaje();
      fireEvent.submit(form);
      return form;
    }

    it("con el correo cambiado a uno invalido: el error aparece y el panel del envio anterior se va", () => {
      const form = envioValido();
      // Reproduccion, paso 1: el panel esta ahi.
      expect(panelDeRespaldo()).toHaveTextContent(
        esHome.Home.contact.form.fallbackLead,
      );
      expect(assignSpy).toHaveBeenCalledTimes(1);

      // Reproduccion, paso 2: correo `roto` y Enviar.
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      fireEvent.change(input, { target: { value: "roto" } });
      fireEvent.submit(form);

      // El cableado de errores que dos rondas midieron como ejemplar sigue
      // intacto: atributo, mensaje anunciado y foco en el campo que fallo.
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(anunciados()).toContain(esHome.Home.contact.form.emailError);
      expect(document.activeElement).toBe(input);

      // Y el panel, que describia un envio anterior, se retira entero --
      // texto y boton.
      expect(
        screen.queryByText(esHome.Home.contact.form.fallbackLead),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: esHome.Home.contact.form.copyAddress,
        }),
      ).not.toBeInTheDocument();
      // El rechazo no navego: sigue habiendo un unico assign, el del valido.
      expect(assignSpy).toHaveBeenCalledTimes(1);
    });

    it("con el mensaje vaciado: mismo resultado por el otro campo, y el foco viaja al mensaje", () => {
      const form = envioValido();
      expect(panelDeRespaldo()).toHaveTextContent(
        esHome.Home.contact.form.fallbackLead,
      );

      const textarea = escribirMensaje("   ");
      fireEvent.submit(form);

      expect(textarea).toHaveAttribute("aria-invalid", "true");
      expect(document.activeElement).toBe(textarea);
      expect(
        screen.queryByText(esHome.Home.contact.form.fallbackLead),
      ).not.toBeInTheDocument();
    });

    it("ciclo completo: aparece, se retira con el rechazo y vuelve EN REPOSO -- el boton Copiar no hereda su estado anterior", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      try {
        const form = envioValido();

        // Se pulsa Copiar: el boton pasa a su texto de exito DENTRO del panel.
        await act(async () => {
          fireEvent.click(
            screen.getByRole("button", {
              name: esHome.Home.contact.form.copyAddress,
            }),
          );
        });
        expect(
          screen.getByRole("button", { name: esHome.Home.contact.form.copied }),
        ).toBeInTheDocument();

        // Rechazo: se va el panel, con su boton dentro.
        const input = screen.getByLabelText(esHome.Home.contact.form.label);
        fireEvent.change(input, { target: { value: "roto" } });
        fireEvent.submit(form);
        expect(
          screen.queryByText(esHome.Home.contact.form.fallbackLead),
        ).not.toBeInTheDocument();

        // Se corrige y se reenvia: el panel vuelve, y vuelve limpio. Si
        // `copyStatus` no se reiniciara, este panel nuevo apareceria ya con el
        // boton en "Copiada" sin que nadie lo haya pulsado en este ciclo.
        fireEvent.change(input, { target: { value: "visitante@test.com" } });
        fireEvent.submit(form);

        expect(panelDeRespaldo()).toHaveTextContent(
          esHome.Home.contact.form.fallbackLead,
        );
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
      } finally {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: undefined,
        });
      }
    });
  });

  describe("hallazgo B2 (P1): el aviso sin JavaScript es un elemento real con guard de CSS", () => {
    function montarAviso(): { form: HTMLFormElement; aviso: HTMLElement } {
      const { container } = renderWithProviders(<Contact />);
      return {
        form: container.querySelector("form") as HTMLFormElement,
        aviso: container.querySelector("[data-nojs-note]") as HTMLElement,
      };
    }

    it("SIN JavaScript se revela: display block dentro de @media (scripting: none), sobre su PROPIA clase", () => {
      const { aviso } = montarAviso();
      expect(
        aviso,
        "el formulario no monta ningun aviso sin JavaScript",
      ).not.toBeNull();
      const clases = Array.from(aviso.classList);

      const propias = reglasSinScripting().filter((regla) =>
        clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
      );
      expect(
        propias.length,
        "el aviso no se revela sin JavaScript: no hay ninguna regla suya bajo scripting none",
      ).toBeGreaterThan(0);

      propias.forEach((regla) => {
        // Mismo elemento, nunca un descendiente (regla 35).
        expect(regla.selectorText).not.toMatch(/\s/);
        expect(regla.style.display).toBe("block");
      });
    });

    it("CON JavaScript no ocupa caja ni entra en el arbol de accesibilidad, y no se tapa con aria-hidden", () => {
      const { aviso } = montarAviso();

      expect(aviso).toBeInTheDocument();
      expect(getComputedStyle(aviso).display).toBe("none");
      expect(aviso).not.toBeVisible();

      // `display: none` ya lo saca del arbol de accesibilidad y del orden de
      // tabulacion: el enlace de dentro no se consulta por rol.
      expect(
        screen.queryByRole("link", {
          name: links.email.replace(/^mailto:/, ""),
        }),
        "el enlace del aviso se sigue anunciando con JavaScript activo",
      ).not.toBeInTheDocument();

      // Y NO se esconde con aria-hidden/hidden: esos seguirian puestos cuando
      // el CSS lo revela, y lo dejarian invisible justo para quien usa lector
      // de pantalla sin JavaScript.
      expect(aviso).not.toHaveAttribute("aria-hidden");
      expect(aviso).not.toHaveAttribute("hidden");
    });

    it("vive DENTRO del formulario y ANTES del boton de envio, con el texto de i18n y el mailto real de config", () => {
      const { form, aviso } = montarAviso();

      expect(form.contains(aviso)).toBe(true);
      expect(aviso).toHaveTextContent(esHome.Home.contact.form.noscript);

      const enlace = aviso.querySelector("a") as HTMLAnchorElement;
      expect(enlace).toHaveAttribute("href", links.email);
      expect(enlace).toHaveTextContent(links.email.replace(/^mailto:/, ""));

      const submit = form.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(
        aviso.compareDocumentPosition(submit) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("ningun re-render de cliente lo vacia: es el defecto EXACTO que tumbo al <noscript>", () => {
      const { aviso } = montarAviso();
      const antes = aviso.textContent?.length ?? 0;
      expect(antes).toBeGreaterThan(0);

      // Re-renders reales del arbol: los dos campos son controlados, asi que
      // escribir en ellos reconstruye este JSX entero. Con un `<noscript>` el
      // contenido ni siquiera llegaba a existir en cliente (medido en
      // navegador real: 268 -> 0 al conmutar el tema).
      escribirMensaje("otra cosa");
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });

      const despues = document.querySelector("[data-nojs-note]") as HTMLElement;
      expect(despues.textContent?.length ?? 0).toBe(antes);
    });
  });
});

/*
 * Critica externa #12 (2026-08-18). Dos hallazgos de esta seccion:
 *
 * P1 (Nielsen) -- el sin-JS de Contacto MENTIA y publicaba el correo. Medido
 * en vivo por el evaluador: sin JavaScript el `<form>` (sin `action` ni
 * `method`) hacia un GET al propio documento, asi que el correo y el mensaje
 * del visitante acababan en la URL, en el historial y en los logs del host, y
 * la pagina volvia arriba con los campos vacios -- mientras el unico aviso
 * visible sin JS afirmaba que "el boton no envia nada".
 *
 * T2 -- el tope de contenido de la seccion escribia 1280px a mano teniendo el
 * token `grid.sectionMax` (creado en el commit `b31be06`) para nombrarlo.
 */
describe("Contact: critica externa #12", () => {
  describe("P1: sin JavaScript el envio nativo no puede ocurrir", () => {
    function montarFormulario(): {
      form: HTMLFormElement;
      submit: HTMLButtonElement;
    } {
      const { container } = renderWithProviders(<Contact />);
      return {
        form: container.querySelector("form") as HTMLFormElement,
        submit: container.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement,
      };
    }

    /*
     * MITAD 1 (el control que no puede funcionar no se ofrece). Mismo
     * mecanismo y mismo candado que el conmutador de tema
     * (`ThemeToggle.test.tsx`) y el disparador de la hoja de navegacion
     * (`Navbar.test.tsx`): la regla se busca en el CSSOM acotando al bloque
     * `@media (scripting: none)`, porque jsdom no evalua ningun `@media`
     * (regla 36) ni conoce el feature `scripting`.
     */
    it("el boton de envio se RETIRA sin JavaScript: display none dentro de @media (scripting: none), sobre su PROPIA clase", () => {
      const { submit } = montarFormulario();
      expect(submit, "el formulario no monta boton de envio").not.toBeNull();
      const clases = Array.from(submit.classList);

      const propias = reglasSinScripting().filter((regla) =>
        clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
      );
      expect(
        propias.length,
        "el boton de envio no se retira sin JavaScript: no hay ninguna regla suya bajo scripting none",
      ).toBeGreaterThan(0);

      propias.forEach((regla) => {
        // Mismo elemento, nunca un descendiente (regla 35).
        expect(regla.selectorText).not.toMatch(/\s/);
        expect(regla.style.display).toBe("none");
      });
    });

    it("CON JavaScript el boton sigue exactamente como estaba: el guard vive SOLO dentro del media query", () => {
      const { submit } = montarFormulario();

      expect(submit).toBeInTheDocument();
      expect(getComputedStyle(submit).display).not.toBe("none");
      // NO se usa `toBeVisible()` a proposito: el matcher tambien mira la
      // `opacity` de los ancestros, y en este render el reveal de la seccion
      // todavia no se ha disparado (`data-revealed` en false => opacity 0), asi
      // que diria "invisible" por un motivo que no tiene nada que ver con este
      // guard. Lo que aqui se afirma es la propiedad del guard: `display` no lo
      // toca fuera del media query.
      //
      // Y el boton tampoco se apaga por atributo: un `disabled` fijo dejaria el
      // formulario inservible tambien CON JavaScript, que es el 99% del
      // trafico real.
      expect(submit).not.toBeDisabled();
    });

    /*
     * MITAD 2 (la unica que cubre el caso Enter). Esconder el boton NO impide
     * el envio nativo: un `<input type="email">` dispara el envio IMPLICITO
     * con Enter aunque el boton este oculto o no exista. Medido en navegador
     * real sobre un fixture estatico SIN NINGUN SCRIPT (Chrome 151.0.7922.138
     * y WebKit 26.5, mismo resultado en los dos motores):
     *
     *     sin method,      boton OCULTO, Enter -> ENVIA  ?email=...&message=...
     *     method="dialog", boton OCULTO, Enter -> NO ENVIA, URL intacta
     *
     * `method="dialog"` solo es ese no-op mientras el formulario NO tenga un
     * `<dialog>` por ancestro; dentro de uno pasaria a CERRAR el dialogo. Las
     * DOS condiciones se atan aqui juntas a proposito: la segunda es
     * exactamente la que rompe un futuro refactor que mueva este JSX, y jsdom
     * no puede observar el envio nativo para avisarlo por su cuenta.
     */
    it("el form declara method=dialog y NO tiene ningun <dialog> por ancestro: las dos condiciones que apagan el envio nativo", () => {
      const { form } = montarFormulario();

      expect(form).toHaveAttribute("method", "dialog");
      expect(
        form.closest("dialog"),
        "el formulario vive dentro de un <dialog>: method=dialog dejaria de ser un no-op y pasaria a cerrarlo",
      ).toBeNull();
    });

    /*
     * LAPIDA DE LA COPIA ANTERIOR. El aviso prometia un comportamiento del
     * navegador ("el boton no envia nada") que el navegador no cumplia: el
     * boton enviaba, y por eso el correo acababa en la URL. La copia nueva
     * describe el ESTADO (necesita JavaScript, sin el no funciona) y da la
     * salida real, que es la direccion enlazada en el propio aviso. Si alguien
     * devuelve la promesa, este test lo dice -- en los dos idiomas.
     */
    it("la copia del aviso ya no promete un comportamiento del navegador (es y en)", () => {
      expect(esHome.Home.contact.form.noscript).not.toContain(
        "el botón no envía nada",
      );
      expect(enHome.Home.contact.form.noscript).not.toContain(
        "the button sends nothing",
      );
      // Sonda positiva: el aviso sigue existiendo y sigue nombrando la
      // condicion, no vaciandose para pasar el assert de arriba.
      expect(esHome.Home.contact.form.noscript).toContain("JavaScript");
      expect(enHome.Home.contact.form.noscript).toContain("JavaScript");
    });
  });

  /*
   * T2. El CSS renderizado es IDENTICO antes y despues (el token resuelve al
   * mismo `1280px`), asi que la propiedad "el numero vive en el token, no en
   * este fichero" solo se observa en la FUENTE (`task/lessons.md`, 2026-08-12;
   * mismo patron que `Hero.qa.test.tsx` con `grid.heroCopyMax` y que
   * `journey.layers.test.ts` con `typeTokens.scale.deckTitle.size`). El lado
   * CONSUMIDOR -- que `ScDarkFrame` topa el contenido con esta constante -- ya
   * lo ata el test 9 (D6) mas arriba en este mismo fichero.
   */
  describe("T2: el tope de contenido deriva de grid.sectionMax", () => {
    it("CONTACT_CONTENT_MAX_WIDTH deriva del token, y contact.layers.ts ya no escribe el literal", async () => {
      expect(CONTACT_CONTENT_MAX_WIDTH).toBe(grid.sectionMax);

      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      // Se despojan los comentarios antes de buscar: el docblock de la propia
      // constante cita el `1280px` en prosa, y sin esto el `not.toContain`
      // fallaria sobre codigo que SI esta migrado.
      const fuente = readFileSync(join(here, "contact.layers.ts"), "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      expect(fuente).toContain("grid.sectionMax");
      expect(fuente).not.toContain("1280px");
    });
  });
});

/*
 * Critica externa #13 (2026-08-19), P0 de la ronda: WCAG 2.1 SC 1.4.4 (AA).
 * Ver el docblock equivalente en `Story.test.tsx` para el mecanismo completo.
 * Medido en Chrome real a 390x844 con la raiz a 32px: en la rama CLARA la
 * pista de `ScCard` valia 414px dentro de una caja de 166px (y esta tarjeta
 * declara `overflow: hidden`, asi que el sobrante se perdia sin siquiera
 * llegar al clip del documento); en la OSCURA `ScDarkCopy` -- item de flex con
 * el `min-width: auto` por defecto -- media 414px dentro de un contenedor de
 * 262px. En las dos ramas el texto terminaba fuera del viewport sin scroll
 * horizontal que lo recuperase.
 *
 * Candado de CSSOM, no de geometria: jsdom no hace layout.
 */
describe("Contact: critica #13 -- ampliar la fuente no recorta texto (SC 1.4.4)", () => {
  function declaracionBase(el: HTMLElement, prop: string): string | undefined {
    return cssRuleTextFor(el)
      .split("\n")
      .find((line) => !line.includes("@media") && line.includes(prop));
  }

  it("ScContact declara overflow-wrap: break-word, que se hereda a todo su texto", () => {
    renderWithProviders(<Contact />);
    const section = document.getElementById("contact") as HTMLElement;
    expect(declaracionBase(section, "overflow-wrap")).toMatch(
      /overflow-wrap:\s*break-word/,
    );
  });

  it("rama clara: ScCard acota el minimo de su pista base con minmax(0, 1fr)", () => {
    const { container } = renderWithProviders(<Contact />);
    const card = container.querySelector("[data-revealed]") as HTMLElement;
    const base = declaracionBase(card, "grid-template-columns");

    expect(base).toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/,
    );
    expect(base).not.toMatch(/grid-template-columns:\s*1fr\s*;/);
  });

  it("rama oscura: ScDarkCopy levanta su min-width automatico a 0 para poder encogerse", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    try {
      const { container } = renderWithProviders(<Contact />);
      await waitFor(() => {
        expect(container.querySelector("[data-revealed]")).not.toBeNull();
      });
      // El h2 de la rama oscura cuelga DIRECTAMENTE de ScDarkCopy: se ancla
      // ahi (id estable del documento) en vez de por posicion de hijo.
      const darkCopy = document.getElementById("contact-title")!
        .parentElement as HTMLElement;

      expect(declaracionBase(darkCopy, "min-width")).toMatch(/min-width:\s*0/);
    } finally {
      window.localStorage.clear();
    }
  });
});

/*
 * Critica externa #13 (2026-08-19): el error del campo se borraba al teclear y
 * no volvia hasta el siguiente envio.
 *
 * Reproduccion del defecto: tras un envio invalido, `contact-email` quedaba
 * con `aria-invalid="true"` y su mensaje; al escribir `no-es-un-correo` los
 * dos desaparecian (eso es correcto y se conserva: mantener el error pintado
 * mientras se corrige afirma un estado que el usuario ya esta resolviendo), y
 * salir del campo NO revalidaba. El usuario solo volvia a enterarse al
 * reenviar -- el aviso llegaba tarde y en el peor momento.
 *
 * El arreglo: una vez que un campo ha suspendido un envio, revalida al SALIR
 * de el (`blur`). Nunca mientras se teclea: avisar en cada pulsacion marca en
 * rojo un correo a medio escribir, que es peor que el defecto que arregla.
 */
describe("Contact: critica #13 -- el campo ya reprobado revalida al salir", () => {
  function envioInvalidoDeCorreo(): HTMLInputElement {
    const { container } = renderWithProviders(<Contact />);
    const form = container.querySelector("form") as HTMLFormElement;
    const input = screen.getByLabelText(
      esHome.Home.contact.form.label,
    ) as HTMLInputElement;

    // El mensaje SI es valido: asi el unico error posible es el del correo.
    escribirMensaje();
    fireEvent.change(input, { target: { value: "no-es-un-correo" } });
    fireEvent.submit(form);
    return input;
  }

  it("teclear sigue retirando el error de inmediato (no se vuelve a validacion agresiva)", () => {
    const input = envioInvalidoDeCorreo();
    expect(input).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(input, { target: { value: "sigue-sin-ser-un-correo" } });

    // Mientras se teclea NO se juzga, aunque el valor siga siendo invalido.
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(
      screen.queryByText(esHome.Home.contact.form.emailError),
    ).not.toBeInTheDocument();
  });

  it("salir del campo con el valor todavia invalido devuelve el error, sin esperar a otro envio", () => {
    const input = envioInvalidoDeCorreo();
    fireEvent.change(input, { target: { value: "sigue-sin-ser-un-correo" } });
    expect(input).not.toHaveAttribute("aria-invalid");

    fireEvent.blur(input);

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(esHome.Home.contact.form.emailError),
    ).toBeInTheDocument();
    // Y el mensaje sigue asociado al control, no suelto en la pagina.
    expect(input).toHaveAttribute(
      "aria-describedby",
      "contact-email-error contact-email-help",
    );
  });

  it("salir del campo ya corregido lo deja limpio", () => {
    const input = envioInvalidoDeCorreo();
    fireEvent.change(input, { target: { value: "visitante@test.com" } });
    fireEvent.blur(input);

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(
      screen.queryByText(esHome.Home.contact.form.emailError),
    ).not.toBeInTheDocument();
  });

  it("un campo que NUNCA ha suspendido no se valida al salir de el", () => {
    renderWithProviders(<Contact />);
    const input = screen.getByLabelText(
      esHome.Home.contact.form.label,
    ) as HTMLInputElement;

    // Sin ningun envio previo: escribir algo invalido y salir no marca nada.
    fireEvent.change(input, { target: { value: "todavia-escribiendo" } });
    fireEvent.blur(input);

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(
      screen.queryByText(esHome.Home.contact.form.emailError),
    ).not.toBeInTheDocument();
  });

  it("el mensaje sigue el mismo criterio: revalida al salir solo si ya suspendio", () => {
    const { container } = renderWithProviders(<Contact />);
    const form = container.querySelector("form") as HTMLFormElement;
    const input = screen.getByLabelText(esHome.Home.contact.form.label);
    const textarea = escribirMensaje("");

    fireEvent.change(input, { target: { value: "visitante@test.com" } });
    fireEvent.submit(form);
    expect(textarea).toHaveAttribute("aria-invalid", "true");

    // Escribir espacios en blanco retira el error (se esta corrigiendo)...
    fireEvent.change(textarea, { target: { value: "   " } });
    expect(textarea).not.toHaveAttribute("aria-invalid");

    // ...y salir con el campo todavia vacio de contenido real lo devuelve.
    fireEvent.blur(textarea);
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });
});

/*
 * D4 (decision del dueno, 2026-09-02): el correo del formulario pasa a
 * OPCIONAL. El razonamiento -- el envio abre el cliente de correo del propio
 * visitante, que ya viaja con su direccion -- vive en el docblock de
 * `hasEmailFormatError` (Contact.tsx); aqui se atornillan las tres
 * consecuencias observables: no bloquea vacio, sigue bloqueando mal escrito,
 * y el cuerpo del mailto pierde la linea del correo cuando no hay ninguno.
 */
describe("Contact: D4 -- el correo del formulario es opcional (2026-09-02)", () => {
  function mockAssignD4(): {
    assignSpy: ReturnType<typeof vi.fn>;
    restore: () => void;
  } {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    return {
      assignSpy,
      restore: () =>
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        }),
    };
  }

  /** El `body=` del `mailto:` de la ultima navegacion, ya decodificado. */
  function cuerpoDelMailto(assignSpy: ReturnType<typeof vi.fn>): string {
    expect(assignSpy).toHaveBeenCalledTimes(1);
    const url = new URL(assignSpy.mock.calls[0][0] as string);
    expect(url.protocol).toBe("mailto:");
    return url.searchParams.get("body") ?? "";
  }

  it("la etiqueta y la ayuda del campo declaran que es opcional, en los DOS idiomas y con texto propio de cada uno", () => {
    // El contrato de copy de D4: la palabra "opcional" tiene que estar donde
    // se lee el campo. La comparacion es/en distinta es la mitad que la
    // paridad de RUTAS (locales.test.ts) no puede ver.
    expect(esHome.Home.contact.form.label.toLowerCase()).toContain("opcional");
    expect(enHome.Home.contact.form.label.toLowerCase()).toContain("optional");
    expect(esHome.Home.contact.form.help.toLowerCase()).toContain("opcional");
    expect(enHome.Home.contact.form.help.toLowerCase()).toContain("optional");
    (["label", "help", "emailError", "submitAria"] as const).forEach(
      (clave) => {
        expect(
          enHome.Home.contact.form[clave],
          `en: ${clave} sin traducir`,
        ).not.toBe(esHome.Home.contact.form[clave]);
      },
    );
  });

  it("con el correo VACIO y el mensaje escrito, envia -- y el cuerpo del mailto es el mensaje a secas, sin la linea del correo", () => {
    const { assignSpy, restore } = mockAssignD4();
    try {
      const { container } = renderWithProviders(<Contact />);
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      const body = cuerpoDelMailto(assignSpy);
      expect(body).toBe(MENSAJE_VALIDO);
      // La prosa de la plantilla (la parte fija que precede a {{email}}) no
      // viaja: se compara contra el texto REAL del locale, no contra una
      // copia escrita a mano aqui.
      const prosaDeLaPlantilla =
        esHome.Home.contact.form.body.split("{{email}}")[0];
      expect(body).not.toContain(prosaDeLaPlantilla.trim());
      expect(body).not.toContain("{{");
    } finally {
      restore();
    }
  });

  it("un correo de solo espacios cuenta como vacio: ni suspende el envio ni viaja al cuerpo", () => {
    const { assignSpy, restore } = mockAssignD4();
    try {
      const { container } = renderWithProviders(<Contact />);
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "   " },
      });
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      expect(cuerpoDelMailto(assignSpy)).toBe(MENSAJE_VALIDO);
      expect(
        screen.queryByText(esHome.Home.contact.form.emailError),
      ).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("con el correo ESCRITO y valido, el cuerpo conserva la plantilla con sus dos interpolaciones (la otra mitad del contrato)", () => {
    const { assignSpy, restore } = mockAssignD4();
    try {
      const { container } = renderWithProviders(<Contact />);
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      const body = cuerpoDelMailto(assignSpy);
      expect(body).toContain("visitante@test.com");
      expect(body).toContain(MENSAJE_VALIDO);
      expect(body).not.toContain("{{");
    } finally {
      restore();
    }
  });

  it("un correo MAL ESCRITO sigue deteniendo el envio y pintando su error de formato", () => {
    const { assignSpy, restore } = mockAssignD4();
    try {
      const { container } = renderWithProviders(<Contact />);
      escribirMensaje();
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "no-es-un-correo" },
      });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      expect(assignSpy).not.toHaveBeenCalled();
      expect(
        screen.getByText(esHome.Home.contact.form.emailError),
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("hallazgo A P2-3: vaciar un correo que YA suspendio y salir del campo retira el error -- vacio es una respuesta valida", () => {
    const { assignSpy, restore } = mockAssignD4();
    try {
      const { container } = renderWithProviders(<Contact />);
      const input = screen.getByLabelText(esHome.Home.contact.form.label);
      escribirMensaje();
      fireEvent.change(input, { target: { value: "no-es-un-correo" } });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
      expect(input).toHaveAttribute("aria-invalid", "true");

      // Vaciar el campo y salir de el: la revalidacion al salir (critica #13)
      // sigue corriendo -- lo que cambia es su veredicto sobre el vacio.
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(
        screen.queryByText(esHome.Home.contact.form.emailError),
      ).not.toBeInTheDocument();

      // Y el envio siguiente ya sale.
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
      expect(assignSpy).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});

/*
 * Hallazgo A P2-4 de la critica externa #15 (2026-09-02): la confirmacion del
 * boton «Copiar direccion» tiene que CADUCAR. El porque -- una confirmacion
 * que no vuelve a reposo deja de serlo, y una segunda copia se quedaba sin
 * ninguna senal -- vive en el docblock de `COPY_FEEDBACK_MS` (Contact.tsx).
 */
describe("Contact: critica externa #15 -- el «Copiada» del boton caduca (2026-09-02)", () => {
  const COPIAR = esHome.Home.contact.form.copyAddress;
  const COPIADA = esHome.Home.contact.form.copied;

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    window.localStorage.clear();
  });

  /** Monta, envia un formulario valido y devuelve el espia de `writeText`. */
  function panelConCopia(): ReturnType<typeof vi.fn> {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { container } = renderWithProviders(<Contact />);
    fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
      target: { value: "visitante@test.com" },
    });
    escribirMensaje();
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    return writeText;
  }

  async function pulsarCopiar(nombre: string): Promise<void> {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: nombre }));
    });
  }

  it("vuelve a su etiqueta de reposo pasados COPY_FEEDBACK_MS, y ni un milisegundo antes", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
    vi.useFakeTimers();
    try {
      panelConCopia();
      await pulsarCopiar(COPIAR);
      expect(screen.getByRole("button", { name: COPIADA })).toBeInTheDocument();

      // Un instante ANTES del vencimiento sigue confirmando: sin esto, el
      // test pasaria igual con un reloj de 1 ms.
      act(() => {
        vi.advanceTimersByTime(motion.durationMs.spinReduced - 1);
      });
      expect(screen.getByRole("button", { name: COPIADA })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByRole("button", { name: COPIAR })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: COPIADA }),
      ).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("una SEGUNDA copia vuelve a confirmar: el defecto era justo que la segunda no decia nada", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
    vi.useFakeTimers();
    try {
      const writeText = panelConCopia();
      await pulsarCopiar(COPIAR);
      act(() => {
        vi.advanceTimersByTime(motion.durationMs.spinReduced);
      });
      expect(screen.getByRole("button", { name: COPIAR })).toBeInTheDocument();

      await pulsarCopiar(COPIAR);
      expect(writeText).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: COPIADA })).toBeInTheDocument();

      // Y el segundo reloj tambien vence: no se queda pegado tras la 2a vez.
      act(() => {
        vi.advanceTimersByTime(motion.durationMs.spinReduced);
      });
      expect(screen.getByRole("button", { name: COPIAR })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("el MENSAJE DE FALLO no caduca: es una instruccion que sigue siendo cierta, no una confirmacion", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
    vi.useFakeTimers();
    try {
      // Sin `navigator.clipboard`: el camino de fallo ya cubierto mas arriba.
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
      const { container } = renderWithProviders(<Contact />);
      fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
        target: { value: "visitante@test.com" },
      });
      escribirMensaje();
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      await pulsarCopiar(COPIAR);
      const fallo = esHome.Home.contact.form.copyError;
      expect(screen.getByText(fallo)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(motion.durationMs.spinReduced * 3);
      });
      expect(screen.getByText(fallo)).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("COPY_FEEDBACK_MS deriva de la escala del sistema, no de un numero escrito a mano", async () => {
    /*
     * Candado de FUENTE, no de comportamiento (mismo criterio que la leccion
     * del 2026-08-12 sobre literales que resuelven al mismo valor que su
     * token): el CSS/JS renderizado no distingue `2100` de
     * `motion.durationMs.spinReduced`, asi que la procedencia solo se puede
     * afirmar leyendo el fichero -- con los comentarios despojados, para que
     * una cita en un docblock no gane la busqueda.
     */
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const aqui = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(aqui, "Contact.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain(
      "const COPY_FEEDBACK_MS = motion.durationMs.spinReduced",
    );
    expect(fuente).toContain('from "@/theme/tokens/motion"');
  });
});

/*
 * Hallazgo B3 P3 de la critica externa #15 (2026-09-02): los mensajes de error
 * tienen que anunciarse tambien cuando la revalidacion al salir del campo los
 * cambia SIN mover el foco. `role="status"` ya era `aria-live="polite"`
 * implicito; lo que faltaba era que la region estuviera VIVA antes del cambio.
 * El porque completo vive en el docblock de `ScLiveRegion` (Contact.tsx).
 */
describe("Contact: critica externa #15 -- la region live del error se actualiza, no se remonta", () => {
  /**
   * Las regiones live del formulario, en orden del DOM: la del error del
   * correo, la del error del mensaje y -- desde la ola P (2026-09-04) -- la
   * del contador de caracteres.
   */
  function regiones(): HTMLElement[] {
    return screen.getAllByRole("status");
  }

  it("las tres regiones existen desde el primer render, vacias y sin mensaje dentro", () => {
    renderWithProviders(<Contact />);
    const live = regiones();
    /*
     * TRES desde la ola P (2026-09-04), no dos: el contador de caracteres
     * estrena la suya con el mismo contrato que las dos de error -- montada
     * siempre, vacia en reposo. Regla 40: el contrato cerrado se actualiza en
     * el mismo commit que anade el elemento, nunca se relaja la asercion para
     * que vuelva a pasar.
     */
    expect(live).toHaveLength(3);
    live.forEach((region) => expect(region.textContent).toBe(""));
    // Ninguna declara aria-live a mano: `status` YA es polite + atomic, y
    // repetirlo solo duplicaria el mapeo del rol.
    live.forEach((region) => expect(region).not.toHaveAttribute("aria-live"));
  });

  it("al aparecer el error, el nodo de la region es EL MISMO de antes: lo que cambia es su contenido", () => {
    const { container } = renderWithProviders(<Contact />);
    const regionCorreoAntes = regiones()[0];

    escribirMensaje();
    fireEvent.change(screen.getByLabelText(esHome.Home.contact.form.label), {
      target: { value: "no-es-un-correo" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    const mensaje = document.getElementById("contact-email-error");
    expect(
      mensaje,
      "no se pinto el mensaje de error del correo",
    ).not.toBeNull();
    // Que el mensaje cuelgue de la region capturada ANTES prueba las dos
    // mitades a la vez: que regiones()[0] es la del correo, y que esa region
    // sobrevivio al cambio en vez de ser sustituida por otra nueva.
    expect(regionCorreoAntes.contains(mensaje)).toBe(true);
    expect(regiones()[0]).toBe(regionCorreoAntes);
    expect(regionCorreoAntes.textContent).toBe(
      esHome.Home.contact.form.emailError,
    );
  });

  it("la REVALIDACION AL SALIR reutiliza esa misma region -- el caso exacto del hallazgo, sin foco que mueva nada", () => {
    const { container } = renderWithProviders(<Contact />);
    const input = screen.getByLabelText(esHome.Home.contact.form.label);
    escribirMensaje();
    fireEvent.change(input, { target: { value: "no-es-un-correo" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    const region = regiones()[0];
    // Teclear retira el error (no se juzga mientras se escribe): la region
    // se queda montada y vacia.
    fireEvent.change(input, { target: { value: "sigue-sin-ser-un-correo" } });
    expect(regiones()[0]).toBe(region);
    expect(region.textContent).toBe("");

    // Salir del campo lo devuelve: mismo nodo, contenido nuevo. Es lo unico
    // que un lector de pantalla puede anunciar aqui -- el foco no viaja.
    fireEvent.blur(input);
    expect(regiones()[0]).toBe(region);
    expect(region.textContent).toBe(esHome.Home.contact.form.emailError);
  });

  it("la region del mensaje es la segunda y sigue el mismo contrato", () => {
    const { container } = renderWithProviders(<Contact />);
    const region = regiones()[1];
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(regiones()[1]).toBe(region);
    expect(region.textContent).toBe(esHome.Home.contact.form.messageError);
    expect(
      region.contains(document.getElementById("contact-message-error")),
    ).toBe(true);
  });
});

/*
 * OLA M (2026-09-03): paridad de arte anunciado entre temas. La rama clara de
 * esta seccion ensena figuras con texto alternativo y la oscura no anunciaba
 * nada de su escena, asi que el mismo contenido se contaba distinto segun el
 * tema -- el hallazgo que la critica externa #16 midio como "32 alt vacios en
 * oscuro frente a 5 descriptivos en claro". La composicion se nombra en el
 * consumidor con role="img" + aria-label, mismo patron que Story, Journey y Features, y las
 * capas de la escena siguen mudas, que es lo correcto.
 */
describe("ola M: la escena oscura se anuncia como una sola imagen con nombre", () => {
  beforeEach(() => {
    window.localStorage.setItem("vti-theme", "dark");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("la escena expone el texto de Home.contact.sceneAlt", () => {
    renderWithProviders(<Contact />);

    const escena = screen.getByRole("img", {
      name: esHome.Home.contact.sceneAlt,
    });
    expect(escena).not.toHaveAttribute("aria-hidden");
  });

  it("ninguna capa de la escena gana texto alternativo: siguen con alt vacio", () => {
    const { container } = renderWithProviders(<Contact />);
    const escena = screen.getByRole("img", {
      name: esHome.Home.contact.sceneAlt,
    });

    Array.from(escena.querySelectorAll("img")).forEach((capa) => {
      expect(capa.getAttribute("alt")).toBe("");
    });
    expect(container).toBeTruthy();
  });
});

/*
 * OLA P (2026-09-04): el mensaje que no cabe en la URL del `mailto:` sale por
 * el panel de rescate, no por un correo roto.
 *
 * EL DEFECTO QUE CIERRAN ESTOS CANDADOS. El formulario entrega el mensaje
 * abriendo un `mailto:` con `window.location.assign`. Un `mailto:` viaja como
 * URL, y la ruta que abre un esquema externo en Windows corta en 2.083
 * caracteres: por encima de ahi, el cliente de correo recibe el cuerpo
 * truncado o no recibe nada. El fallo NO ocurre en esta pagina -- ocurre en
 * otra aplicacion, despues de que el navegador entregue la URL --, asi que la
 * interfaz no puede detectarlo ni explicarlo a posteriori. O lo previene, o el
 * mensaje del visitante se pierde en silencio. Medido antes de tocar nada: un
 * mensaje de 2.280 caracteres produce una URL de 3.554 y uno de 7.200 produce
 * una de 11.061.
 *
 * LA DECISION DEL DUENO: sin tope duro, salida explicada. Nada de `maxLength`
 * ni de truncar; contador vivo con estado de aviso, y por encima del umbral el
 * envio deja de intentar el `mailto:` y abre directamente el panel de rescate
 * que ya existia.
 */
describe("ola P: el mensaje que no cabe en el mailto no rompe el correo, abre el rescate", () => {
  function mockAssign(): {
    assignSpy: ReturnType<typeof vi.fn>;
    restore: () => void;
  } {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
    return {
      assignSpy,
      restore: () =>
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        }),
    };
  }

  /** Un correo de contacto tipico (29 caracteres), el del peor caso medido. */
  const CORREO = "nombre.apellido@miempresa.com";

  /*
   * Prosa espanola real, con sus acentos y su salto de linea: el PEOR CASO
   * REALISTA de la medicion (un caracter acentuado ocupa seis caracteres en la
   * URL, un salto de linea tres). No es un texto decorativo -- de el sale el
   * margen que justifica el valor de MESSAGE_MAX.
   */
  const PROSA_ES =
    "Hola, me gustaría hablar contigo sobre un proyecto nuevo para mi compañía; quiero saber más del proceso, la planificación y el precio aproximado.\n";

  /** Repite `muestra` hasta llegar exactamente a `caracteres`. */
  function mensajeDe(muestra: string, caracteres: number): string {
    let salida = "";
    while (salida.length < caracteres) salida += muestra;
    return salida.slice(0, caracteres);
  }

  /**
   * La URL que produciria ese mensaje, compuesta con las MISMAS piezas que usa
   * el componente: el builder exportado y las cadenas reales del JSON de
   * locales. La plantilla no se reescribe a mano, se resuelve la que existe.
   */
  function urlDe(mensaje: string, correo: string): string {
    const cuerpo = correo
      ? esHome.Home.contact.form.body
          .replace("{{email}}", correo)
          .replace("{{message}}", mensaje)
      : mensaje;
    return buildMailtoUrl(esHome.Home.contact.form.subject, cuerpo);
  }

  const contador = (): HTMLElement =>
    document.getElementById("contact-message-counter") as HTMLElement;

  /*
   * CANDADO DEL UMBRAL. Ata MESSAGE_MAX a la MEDICION que lo justifica, no a
   * un numero tecleado en el test: si alguien sube el umbral, la URL del peor
   * caso realista deja de caber y esto se pone en rojo con la cifra delante.
   */
  describe("el umbral esta atado a la medicion, no a un numero escrito a mano", () => {
    it("a MESSAGE_MAX caracteres de prosa espanola con acentos, la URL real todavia cabe en MAILTO_URL_MAX", () => {
      const mensaje = mensajeDe(PROSA_ES, MESSAGE_MAX);
      const url = urlDe(mensaje, CORREO);

      expect(mensaje).toHaveLength(MESSAGE_MAX);
      expect(
        url.length,
        `URL en el umbral: ${url.length} caracteres, techo ${MAILTO_URL_MAX}`,
      ).toBeLessThanOrEqual(MAILTO_URL_MAX);
      // Y no cabe por casualidad con un margen ridiculo: queda holgura real.
      expect(MAILTO_URL_MAX - url.length).toBeGreaterThan(100);
    });

    it("el predicado del envio cambia EXACTAMENTE en MESSAGE_MAX, ni antes ni despues", () => {
      const enElUmbral = mensajeDe("a", MESSAGE_MAX);
      const unoMas = mensajeDe("a", MESSAGE_MAX + 1);

      expect(exceedsMailtoBudget(enElUmbral, urlDe(enElUmbral, CORREO))).toBe(
        false,
      );
      expect(exceedsMailtoBudget(unoMas, urlDe(unoMas, CORREO))).toBe(true);
    });

    it("la SEGUNDA condicion existe porque el recuento de caracteres no basta: 400 acentos desbordan la URL muy por debajo del umbral", () => {
      const caro = mensajeDe("é", 400);
      const url = urlDe(caro, CORREO);

      // Las dos mitades del porque, medidas aqui mismo:
      expect(caro.length).toBeLessThan(MESSAGE_MAX);
      expect(
        url.length,
        `URL de 400 acentos: ${url.length} caracteres`,
      ).toBeGreaterThan(MAILTO_URL_MAX);
      // ...y aun asi el predicado lo caza.
      expect(exceedsMailtoBudget(caro, url)).toBe(true);
    });

    it("la banda de aviso se deriva del umbral, no se declara aparte", () => {
      expect(MESSAGE_WARN).toBe(Math.round(MESSAGE_MAX * 0.85));
      expect(MESSAGE_WARN).toBeLessThan(MESSAGE_MAX);
    });
  });

  /*
   * CANDADO DEL DESVIO. Es el corazon del encargo: por encima del umbral NO se
   * llama a `window.location.assign` y SI se abre el panel de rescate, con su
   * frase propia -- la que no miente sobre lo que ha pasado.
   */
  describe("por encima del umbral el envio no toca window.location", () => {
    it("un mensaje de MESSAGE_MAX + 1 caracteres NO navega y revela el panel con su frase propia", () => {
      const { assignSpy, restore } = mockAssign();
      try {
        const { container } = renderWithProviders(<Contact />);
        fireEvent.change(
          screen.getByLabelText(esHome.Home.contact.form.label),
          { target: { value: "visitante@test.com" } },
        );
        escribirMensaje(mensajeDe("a", MESSAGE_MAX + 1));
        fireEvent.submit(container.querySelector("form") as HTMLFormElement);

        expect(assignSpy).not.toHaveBeenCalled();

        const panel = screen
          .getAllByRole("status")
          .find((nodo) =>
            (nodo.textContent ?? "").includes(
              esHome.Home.contact.form.fallbackLeadTooLong,
            ),
          );
        expect(panel, "no se revelo el panel de rescate").toBeDefined();
        // La salida real esta dentro: la direccion y el boton de copiar.
        expect(panel?.textContent).toContain(
          links.email.replace(/^mailto:/, ""),
        );
        expect(
          within(panel as HTMLElement).getByRole("button", {
            name: esHome.Home.contact.form.copyAddress,
          }),
        ).toBeInTheDocument();
        // Y NO se afirma lo contrario: la frase del envio entregado no aparece.
        expect(panel?.textContent).not.toContain(
          esHome.Home.contact.form.fallbackLead,
        );
      } finally {
        restore();
      }
    });

    it("justo EN el umbral el envio SI abre el correo, con la frase de siempre", () => {
      const { assignSpy, restore } = mockAssign();
      try {
        const { container } = renderWithProviders(<Contact />);
        fireEvent.change(
          screen.getByLabelText(esHome.Home.contact.form.label),
          { target: { value: "visitante@test.com" } },
        );
        escribirMensaje(mensajeDe("a", MESSAGE_MAX));
        fireEvent.submit(container.querySelector("form") as HTMLFormElement);

        expect(assignSpy).toHaveBeenCalledTimes(1);
        expect(
          (assignSpy.mock.calls[0][0] as string).startsWith(links.email),
        ).toBe(true);
        expect(panelDeRespaldo().textContent).toContain(
          esHome.Home.contact.form.fallbackLead,
        );
      } finally {
        restore();
      }
    });

    it("el mensaje corto pero CARO (400 acentos) tampoco navega: lo caza la longitud real de la URL", () => {
      const { assignSpy, restore } = mockAssign();
      try {
        const { container } = renderWithProviders(<Contact />);
        escribirMensaje(mensajeDe("é", 400));
        fireEvent.submit(container.querySelector("form") as HTMLFormElement);

        expect(assignSpy).not.toHaveBeenCalled();
        expect(
          screen
            .getAllByRole("status")
            .some((nodo) =>
              (nodo.textContent ?? "").includes(
                esHome.Home.contact.form.fallbackLeadTooLong,
              ),
            ),
        ).toBe(true);
      } finally {
        restore();
      }
    });

    it("NADA se trunca: el textarea sigue sin maxLength y conserva el texto entero tras el desvio", () => {
      const { assignSpy, restore } = mockAssign();
      try {
        const { container } = renderWithProviders(<Contact />);
        const largo = mensajeDe("a", MESSAGE_MAX + 500);
        const textarea = escribirMensaje(largo);
        fireEvent.submit(container.querySelector("form") as HTMLFormElement);

        expect(assignSpy).not.toHaveBeenCalled();
        // `maxLength` sin declarar es -1 en el DOM: el campo no tiene tope.
        expect(textarea.maxLength).toBe(-1);
        expect(textarea).not.toHaveAttribute("maxlength");
        expect(textarea.value).toHaveLength(MESSAGE_MAX + 500);
        // Y NO se marca como invalido: pasarse de largo no es un error suyo.
        expect(textarea).not.toHaveAttribute("aria-invalid");
      } finally {
        restore();
      }
    });

    it("un envio invalido POSTERIOR retira el panel, igual que retiraba el del envio entregado", () => {
      const { assignSpy, restore } = mockAssign();
      try {
        const { container } = renderWithProviders(<Contact />);
        const form = container.querySelector("form") as HTMLFormElement;
        const hayPanelDeDesvio = (): boolean =>
          screen
            .getAllByRole("status")
            .some((nodo) =>
              (nodo.textContent ?? "").includes(
                esHome.Home.contact.form.fallbackLeadTooLong,
              ),
            );

        escribirMensaje(mensajeDe("a", MESSAGE_MAX + 1));
        fireEvent.submit(form);
        expect(hayPanelDeDesvio()).toBe(true);

        escribirMensaje("   ");
        fireEvent.submit(form);

        expect(assignSpy).not.toHaveBeenCalled();
        expect(hayPanelDeDesvio()).toBe(false);
      } finally {
        restore();
      }
    });
  });

  /*
   * CANDADO DEL CONTADOR. Que la cifra que ve el visitante salga de la MISMA
   * constante que gobierna el envio: si alguien cambia una sin la otra, la
   * interfaz empieza a mentir sobre su propio limite y esto se pone en rojo.
   */
  describe("el contador ensena el mismo limite que gobierna el envio", () => {
    it("en reposo dice 0 de MESSAGE_MAX, resuelto desde la plantilla de i18n", () => {
      renderWithProviders(<Contact />);

      expect(contador().textContent).toBe(
        esHome.Home.contact.form.counter
          .replace("{{used}}", "0")
          .replace("{{max}}", String(MESSAGE_MAX)),
      );
      // Ninguna interpolacion cruda llega a la pantalla.
      expect(contador().textContent).not.toContain("{{");
    });

    it("cuenta los caracteres REALES del campo, sin recortar espacios", () => {
      renderWithProviders(<Contact />);
      escribirMensaje("hola   ");

      expect(contador().textContent).toContain("7");
    });

    it("el campo lo referencia SIEMPRE con aria-describedby, tambien sin error", () => {
      renderWithProviders(<Contact />);

      expect(
        screen.getByLabelText(esHome.Home.contact.form.messageLabel),
      ).toHaveAttribute("aria-describedby", "contact-message-counter");
    });

    it("la region live calla en reposo, avisa en la banda y cambia de texto al pasarse", () => {
      renderWithProviders(<Contact />);
      const regionDelContador = (): HTMLElement =>
        screen.getAllByRole("status")[2];
      const nodoInicial = regionDelContador();

      expect(nodoInicial.textContent).toBe("");

      escribirMensaje(mensajeDe("a", MESSAGE_WARN));
      expect(regionDelContador()).toBe(nodoInicial);
      expect(nodoInicial.textContent).toBe(
        esHome.Home.contact.form.counterWarn,
      );

      escribirMensaje(mensajeDe("a", MESSAGE_MAX + 1));
      expect(regionDelContador()).toBe(nodoInicial);
      expect(nodoInicial.textContent).toBe(
        esHome.Home.contact.form.counterOver,
      );

      escribirMensaje("corto");
      expect(nodoInicial.textContent).toBe("");
    });

    it("un caracter ANTES de la banda todavia calla: el aviso no se adelanta", () => {
      renderWithProviders(<Contact />);
      escribirMensaje(mensajeDe("a", MESSAGE_WARN - 1));

      expect(screen.getAllByRole("status")[2].textContent).toBe("");
    });

    it("el aviso NO se comunica solo con color: fuera de reposo el contador sube de peso", () => {
      renderWithProviders(<Contact />);
      // Regex y no substring: styled-components serializa un valor
      // interpolado con el espacio del `:` que trae el CSSOM, y un
      // `toContain("font-weight:600")` fallaria por ese espacio sin que nada
      // estuviera mal.
      expect(cssRuleTextFor(contador())).toMatch(/font-weight:\s*400/);

      escribirMensaje(mensajeDe("a", MESSAGE_WARN));
      expect(cssRuleTextFor(contador())).toMatch(/font-weight:\s*600/);
    });

    it("paridad es/en: las cuatro claves nuevas existen en los dos idiomas con texto real", () => {
      (
        [
          "counter",
          "counterWarn",
          "counterOver",
          "fallbackLeadTooLong",
        ] as const
      ).forEach((clave) => {
        expect(esHome.Home.contact.form[clave].trim()).not.toBe("");
        expect(enHome.Home.contact.form[clave].trim()).not.toBe("");
        expect(esHome.Home.contact.form[clave]).not.toBe(
          enHome.Home.contact.form[clave],
        );
      });
      // La plantilla del contador lleva las DOS interpolaciones en los dos
      // idiomas: sin `max`, la cifra del limite no llegaria a la pantalla.
      ["{{used}}", "{{max}}"].forEach((marcador) => {
        expect(esHome.Home.contact.form.counter).toContain(marcador);
        expect(enHome.Home.contact.form.counter).toContain(marcador);
      });
    });
  });

  /*
   * CANDADO DE CONTRASTE. El estado de aviso estrena un rol de color en este
   * formulario (`semantic.warning`) y la decision de NO resolverlo por rama
   * -- al contrario que el error -- se sostiene en estas cifras. Si algun dia
   * el paso de la rampa se mueve, esto lo dice antes que nadie.
   *
   * Fondos REALES, mismo metodo que el candado de la critica externa #9 de
   * este mismo fichero: en claro, blanco al 82 % compuesto sobre las tres
   * paradas del degradado de la tarjeta; en oscuro, blanco al 4 % sobre el
   * void de la escena.
   */
  describe("los tres colores del contador libran AA sobre los fondos reales", () => {
    function ratioClaro(color: string, parada: string): number {
      const alfa = Number(
        CONTACT_PANEL_BG_LIGHT.match(/([\d.]+)\)$/)?.[1] ?? "0",
      );
      const lPanel = alfa + (1 - alfa) * relativeLuminanceHex(parada);
      const lTexto = relativeLuminance(color);
      return (
        (Math.max(lTexto, lPanel) + 0.05) / (Math.min(lTexto, lPanel) + 0.05)
      );
    }

    function ratioOscuro(color: string): number {
      const alfa = Number(CONTACT_FORM_BG.match(/([\d.]+)\)$/)?.[1] ?? "0");
      const lPanel =
        alfa + (1 - alfa) * relativeLuminanceHex(CONTACT_GUARDIAN_VOID);
      const lTexto = relativeLuminance(color);
      return (
        (Math.max(lTexto, lPanel) + 0.05) / (Math.min(lTexto, lPanel) + 0.05)
      );
    }

    it("el aviso (semantic.warning) pasa AA en las DOS ramas -- por eso NO se resuelve por rama como el error", () => {
      ["#EFF4FC", "#F5F2FB", "#F9F0F7"].forEach((parada) => {
        const ratio = ratioClaro(themes.light.semantic.warning, parada);
        expect(
          ratio,
          `aviso claro sobre ${parada}: ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      });
      const oscuro = ratioOscuro(themes.dark.semantic.warning);
      expect(
        oscuro,
        `aviso oscuro sobre el panel de la escena: ${oscuro.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("el reposo y el desbordamiento tambien: son los mismos roles ya medidos de la ayuda y del error", () => {
      ["#EFF4FC", "#F5F2FB", "#F9F0F7"].forEach((parada) => {
        expect(
          ratioClaro(themes.light.semantic.textSubtle, parada),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          ratioClaro(themes.light.semantic.error, parada),
        ).toBeGreaterThanOrEqual(4.5);
      });
      expect(
        ratioOscuro(themes.dark.semantic.textSubtle),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        ratioOscuro(themes.dark.palette.error[300]),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  /*
   * La rama OSCURA monta el MISMO arbol de JSX (Task 16), asi que el contador
   * y el desvio tienen que estar tambien ahi. Se comprueba, no se supone.
   */
  describe("rama oscura (mismo arbol de JSX)", () => {
    beforeEach(() => {
      window.localStorage.setItem("vti-theme", "dark");
    });

    afterEach(() => {
      window.localStorage.clear();
    });

    it("el contador existe y el desvio funciona igual", () => {
      const { assignSpy, restore } = mockAssign();
      try {
        const { container } = renderWithProviders(<Contact />);
        expect(contador()).not.toBeNull();

        escribirMensaje(mensajeDe("a", MESSAGE_MAX + 1));
        fireEvent.submit(container.querySelector("form") as HTMLFormElement);

        expect(assignSpy).not.toHaveBeenCalled();
        expect(
          screen
            .getAllByRole("status")
            .some((nodo) =>
              (nodo.textContent ?? "").includes(
                esHome.Home.contact.form.fallbackLeadTooLong,
              ),
            ),
        ).toBe(true);
      } finally {
        restore();
      }
    });
  });
});
