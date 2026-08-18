import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fireEvent,
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { type as typeTokens } from "@/theme/tokens/type";
import { HERO_COPY_STEP_MS } from "./hero.transition";
import { Hero } from "./Hero";

/**
 * Mismo stub minimo de `matchMedia` que `Eye.test.tsx`: `Hero` monta `<Eye />`,
 * que consume `usePointer()`, y ese hook llama a `window.matchMedia` de verdad
 * al montar. jsdom no lo implementa, asi que sin este stub cualquier render de
 * `<Hero />` lanza "matchMedia is not a function".
 */
function stubMatchMedia(fineMatches = false, reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : fineMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => stubMatchMedia());
afterEach(() => vi.unstubAllGlobals());

/**
 * `Hero` YA NO consume `useStage()` (revision 2026-08-11, Task 10: su intro
 * de carga es CSS estatico). `HeroBackdrop` -- que `Hero` monta -- tampoco
 * lo consume desde la Task 27 (2026-08-11): la maquina de fases del stage
 * (`useStage()`/`StageProvider`) se retiro entera, sin consumidores reales
 * desde la Task 10. Se renderiza `<Hero />` directamente, sin ningun
 * envoltorio de proveedor propio de este archivo.
 */
function renderHero(): RenderResult {
  return renderWithProviders(<Hero />);
}

/** Devuelve el elemento marcado con ese gancho de test o falla el test. */
function testId(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  expect(el, `falta [data-testid="${id}"]`).not.toBeNull();
  return el as HTMLElement;
}

/** `true` si `a` precede a `b` en el orden del documento. */
function precede(a: Element, b: Element): boolean {
  return Boolean(
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

/** Texto CSS de todas las reglas inyectadas por styled-components, planas
 *  (incluidas las anidadas dentro de @media): mismo patron que Eye.test.tsx
 *  para leer el bloque de prefers-reduced-motion. */
function allCssRules(): string[] {
  const reglas: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      reglas.push(rule.cssText);
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) walk(anidadas);
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return reglas;
}

/** Reglas de estilo (no @media/@keyframes) inyectadas por
 *  styled-components, aplanadas. Se devuelve el OBJETO, no su texto, porque
 *  la FORMA de un selector solo se puede aseverar sobre `selectorText`
 *  (regla 35 de RULES.md): `[x] &` y `&[x]` comparten substring y describen
 *  selectores distintos. */
function allStyleRules(): CSSStyleRule[] {
  const reglas: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      if ((rule as CSSStyleRule).selectorText !== undefined) {
        reglas.push(rule as CSSStyleRule);
      }
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) walk(anidadas);
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return reglas;
}

describe("Hero", () => {
  it("muestra la marca VoidToInfinite", () => {
    // getByText(/VoidToInfinite/i) dejo de encontrar el nodo cuando BrandName
    // se partio en dos <span> ("Void"/"ToInfinite", ver BrandName.tsx): el
    // matcher por defecto de Testing Library solo concatena los nodos de
    // texto DIRECTOS de un elemento (no recorre descendientes), asi que ni
    // el <h1> (sin texto directo, solo dos <span> hijos) ni ningun <span>
    // individual (cada uno con solo media palabra) igualaban el regex
    // completo. toHaveTextContent SI usa el textContent recursivo -- mismo
    // patron que ya usa el test de mas abajo ("mantiene UN solo
    // encabezado...") para el mismo <h1>.
    renderHero();
    expect(screen.getByRole("heading")).toHaveTextContent(/VoidToInfinite/i);
  });

  /*
   * D6 (spec 2026-08-04), actualizado por Task 17 (plan premium F1-F5,
   * 2026-08-11): `useThemeScrollReset` busca `document.getElementById
   * ("hero")` para decidir si va a correr un cruce de composiciones que
   * esperar (`willCrossfade`) al cambiar de tema -- ya no para decidir un
   * viaje de scroll (retirado en Task 17, ver el docblock de cabecera del
   * hook). Sin este id, `willCrossfade` es siempre `false` y `aria-busy`
   * nunca se activa -- por eso este candado vive en el propio Hero, no solo
   * en el test del hook que consume el id.
   */
  it("la seccion raiz tiene id='hero'", () => {
    const { container } = renderHero();
    const seccion = container.querySelector("section");
    expect(seccion).not.toBeNull();
    expect(seccion).toHaveAttribute("id", "hero");
  });

  /*
   * El CTA primario YA NO apunta al playground (encargo 2026-08-08): el
   * enlace "Explorar los componentes" desaparece del hero y "Leer la
   * historia" pasa a ser la accion principal, con destino interno #story.
   */
  it("expone el CTA primario hacia la seccion Story", () => {
    renderHero();
    const cta = screen.getByRole("link", {
      name: /historia|story/i,
    });
    expect(cta).toHaveAttribute("href", "#story");
  });

  /*
   * Sustituye al test que buscaba /presente|present/ en la copia. Aquel
   * comentario describia claves (Home.description, Home.additionalDescription)
   * que ya no existen, y su asercion -- "al menos un nodo contiene la palabra
   * presente" -- pasaba igual con la copia hardcodeada en el JSX. Este test es
   * estrictamente mas fuerte: compara los tres textos contra los strings
   * IMPORTADOS del locale, asi que falla si alguien deja de pasar por i18n o
   * cambia el JSON sin querer.
   *
   * TASK 14 (plan premium F3, 2026-08-11): `Home.hero.kicker` -- huerfana
   * desde que el usuario retiro el <ScKicker> suelto de ScCopy y, el mismo
   * dia (auditoria SEO 2026-08-08), la tagline del h1 que lo recupero
   * brevemente -- se RETIRA como clave y se sustituye por `Home.hero.tagline`,
   * que si se renderiza (hijo 2 de ScCopy, INMEDIATO bajo la marca -- fix de
   * revision, decision del dueno: la linea llega antes que el subtitulo).
   * `Home.hero.support` ("Aunque el infinito...") sale del hero hacia la
   * apertura de Story -- ver Story.test.tsx.
   */
  it("los dos textos del bloque salen de i18n, no de literales en el JSX", () => {
    const { container } = renderHero();
    expect(testId(container, "hero-subtitle")).toHaveTextContent(
      esHome.Home.hero.subtitle,
    );
    expect(testId(container, "hero-tagline")).toHaveTextContent(
      esHome.Home.hero.tagline,
    );
  });

  it("mantiene UN solo encabezado en la seccion, y es el h1 de la marca", () => {
    const { container } = renderHero();
    const headings = container.querySelectorAll("h1,h2,h3,h4,h5,h6");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0]).toHaveTextContent(/VoidToInfinite/i);
  });

  it("subtitulo y linea son P: ninguno usurpa un encabezado", () => {
    const { container } = renderHero();
    expect(testId(container, "hero-subtitle").tagName).toBe("P");
    expect(testId(container, "hero-tagline").tagName).toBe("P");
  });

  /*
   * FIX DE REVISION (Task 14): la primera entrega afirmaba
   * titulo/subtitulo/linea/acciones. El dueno invirtio linea y subtitulo
   * (ver el docblock de ScTagline en Hero.tsx): la linea ahora precede al
   * subtitulo, no al reves.
   */
  it("el orden del DOM es titulo, linea, subtitulo, acciones", () => {
    const { container } = renderHero();
    const orden = [
      "hero-title",
      "hero-tagline",
      "hero-subtitle",
      "hero-actions",
    ].map((id) => testId(container, id));

    for (let i = 0; i < orden.length - 1; i += 1) {
      expect(
        precede(orden[i], orden[i + 1]),
        `${orden[i].dataset.testid} deberia preceder a ${orden[i + 1].dataset.testid}`,
      ).toBe(true);
    }
  });

  /*
   * Este test es ademas el candado del bug que cazo en esta entrega: con
   * as="p" (en vez de forwardedAs="p") styled-components consume el prop y
   * renderiza un <p> pelado, descartando el componente envuelto -- el
   * subtitulo salia sin NINGUNA regla de Typography (font-size vacio, color
   * canvastext). Aseverar el tier completo, y no solo "son distintos", es lo
   * que lo detecta.
   */
  it("subtitulo y linea se diferencian en al menos dos propiedades tipograficas", () => {
    const { container } = renderHero();
    const sub = getComputedStyle(testId(container, "hero-subtitle"));
    const linea = getComputedStyle(testId(container, "hero-tagline"));

    // Cada uno computa SU tier de la escala, no el del otro. El subtitulo ya
    // no consume typeTokens.scale.h3.size: ScSubtitle sobrescribe font-size
    // con el clamp(15px, 2vw, 22px) literal del usuario (ver excepcion
    // documentada en Hero.tsx), pero SIGUE computando el peso de h3 --
    // font-weight no se toco. La linea (ScTagline, Task 14) usa variant=body
    // SIN override: token del sistema, tal cual.
    expect(sub.fontSize).toBe("clamp(15px, 2vw, 22px)");
    expect(sub.fontWeight).toBe(String(typeTokens.scale.h3.weight));
    expect(linea.fontSize).toBe(typeTokens.scale.body.size);
    expect(linea.fontWeight).toBe(String(typeTokens.scale.body.weight));

    const distintas = (
      ["fontSize", "fontWeight", "letterSpacing"] as const
    ).filter((prop) => sub[prop] !== linea[prop]);
    expect(distintas.length).toBeGreaterThanOrEqual(2);
  });

  /*
   * Task 22 (tipografia de lectura, plan premium F1-F5, punto 3 del brief).
   * Hasta esta tarea `ScSubtitle` no declaraba `line-height` propio y
   * heredaba el 1.2 de `variant="h3"` -- el detector de craft lo caza en
   * runtime, en los dos gates, sobre un parrafo de 63 caracteres (el grep
   * estatico no lo ve: llega heredado del token, no de una declaracion local
   * en Hero.tsx). Se sustituye por `type.scale.body.lineHeight` (1.6), el
   * MISMO campo que ya usan `ScDeckPillarSubtitle` (story.deck.tsx) y
   * `ScJourneyStepSubtitle` (journey.deck.tsx) para su mismo rol de
   * "subtitulo de cuerpo" -- ver el docblock de ScSubtitle en Hero.tsx para
   * el razonamiento completo (por que 1.6 y no un literal dentro del rango
   * aproximado "~1.4-1.5" que citaba el encargo).
   */
  it("Task 22: el subtitulo sube su line-height al escalon de cuerpo del sistema (type.scale.body, ya no hereda el 1.2 de h3)", () => {
    const { container } = renderHero();
    const sub = getComputedStyle(testId(container, "hero-subtitle"));
    expect(sub.lineHeight).toBe(String(typeTokens.scale.body.lineHeight));
    expect(sub.lineHeight).not.toBe(String(typeTokens.scale.h3.lineHeight));
  });

  /*
   * CANDADO DE ESTRUCTURA (Task 10, plan premium 2026-08-11). El intro de la
   * copia dejo de depender de la maquina de fases de JS: ni el atributo
   * `data-intro` existe ya en este componente, ni ningun hijo arranca en
   * `opacity: 0` esperando a que algo lo encienda. Es la propiedad que hace
   * al `<h1>` candidato LCP elegible en el primer pintado y la que sostiene
   * el "visible sin JavaScript" del brief.
   *
   * Este test es el inverso EXACTO del que habia hasta esta revision ("los
   * cuatro hijos quedan en opacity 0 en fase backdrop"): se conserva el
   * mismo gancho y la misma forma para que la regresion sea evidente si
   * alguien vuelve a atar la copia a un estado de React.
   */
  it("la copia no depende de ningun estado de JS para ser visible: sin data-intro y sin hijos en opacity 0", () => {
    const { container } = renderHero();
    // Se llega al contenedor (ScCopy) por el parentElement del titulo, el
    // primer hijo que sigue existiendo tras retirarse el kicker.
    const copia = testId(container, "hero-title").parentElement;
    expect(copia).not.toBeNull();
    expect(copia).not.toHaveAttribute("data-intro");

    const hijos = Array.from((copia as HTMLElement).children);
    expect(hijos).toHaveLength(4);
    hijos.forEach((hijo, i) => {
      expect(
        getComputedStyle(hijo).opacity,
        `hijo ${i + 1} no puede arrancar invisible: seria un candidato LCP no elegible`,
      ).not.toBe("0");
    });
  });

  /*
   * CANDADO RF-6. Se asevera sobre animationDelay y NUNCA sobre animationName:
   * jsdom no expande la shorthand animation:, asi que animationName sale vacio
   * (medido). El primer hijo no declara delay -- entra a 0ms, con el primer
   * pintado -- por eso la tabla empieza en el segundo.
   *
   * Ya NO se fuerza ninguna fase: se monta y se mide. Que estos retardos
   * esten computados en un render pelado ES la prueba de que la regla de
   * animacion no esta calificada por ningun atributo que solo JS escribe --
   * si volviera a estarlo (`&[data-intro="in"] > *`), el atributo no
   * existiria y los tres saldrian a "0s".
   *
   * Los valores se derivan de HERO_COPY_STEP_MS, la constante IMPORTADA que
   * consume el propio Hero.tsx, nunca de una tabla de strings escrita a mano
   * (regla 38 de RULES.md).
   */
  it("los cuatro hijos del bloque entran escalonados con paso de HERO_COPY_STEP_MS, sin fase de JS", () => {
    const { container } = renderHero();
    const copia = testId(container, "hero-title").parentElement;
    expect(copia).not.toBeNull();
    const hijos = Array.from((copia as HTMLElement).children);
    expect(hijos).toHaveLength(4);

    const esperado = [1, 2, 3].map((n) => `${n * HERO_COPY_STEP_MS}ms`);
    esperado.forEach((delay, i) => {
      expect(
        getComputedStyle(hijos[i + 1]).animationDelay,
        `hijo ${i + 2} deberia entrar a ${delay}`,
      ).toBe(delay);
    });
  });

  /*
   * La FORMA del selector, sobre `selectorText` y nunca por substring del
   * CSS (regla 35): la regla que reparte los retardos tiene que colgar
   * directamente de la clase del bloque, sin ningun selector de atributo por
   * medio. Un `[data-intro="in"]` (o cualquier otro estado escrito por
   * React) reintroduciria la dependencia de hidratacion que esta tarea
   * elimina, y el test de arriba no lo distinguiria de un cambio de nombre
   * del atributo.
   */
  it("la regla del escalonado no esta calificada por ningun atributo de estado", () => {
    renderHero();
    const conRetardo = allStyleRules().filter((regla) =>
      regla.cssText.includes(`animation-delay: ${HERO_COPY_STEP_MS}ms`),
    );
    expect(conRetardo.length).toBeGreaterThan(0);
    conRetardo.forEach((regla) => {
      expect(regla.selectorText).not.toContain("[");
      expect(regla.selectorText).toContain("nth-child(2)");
    });
  });

  it("existe el bloque prefers-reduced-motion: reduce que fuerza la copia visible de inmediato", () => {
    renderHero();
    const reglas = allCssRules();

    const bloqueReduce = reglas.filter(
      (regla) =>
        regla.includes("@media (prefers-reduced-motion: reduce)") &&
        regla.includes("opacity: 1") &&
        regla.includes("animation: none"),
    );
    expect(bloqueReduce.length).toBeGreaterThan(0);
  });

  it("el pie del hero es decorativo e inerte", () => {
    const { container } = renderHero();
    const pie = testId(container, "hero-foot");
    expect(pie).toHaveAttribute("aria-hidden", "true");
    expect(pie.textContent).toBe("");
    expect(getComputedStyle(pie).pointerEvents).toBe("none");
  });

  it("el unico CTA conserva destino y etiqueta", () => {
    const { container } = renderHero();
    const acciones = testId(container, "hero-actions");
    const enlaces = acciones.querySelectorAll("a");

    // UNO, no dos: el CTA al playground se retiro con el encargo del
    // 2026-08-08 -- si alguien lo reintroduce sin decidirlo, este numero lo
    // delata.
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute("href", "#story");
    expect(enlaces[0]).toHaveTextContent(esHome.Home.cta.story);
  });

  /*
   * CRITICA EXTERNA #11, punto B2. La ola de la #10 cableo el foco de las
   * anclas en las TRES superficies que consumen `NAV_GROUPS` (`Navbar`,
   * `NavSheet`, `Footer`) -- ver `navAnchorFocus.ts` --, pero el CTA del hero
   * quedo fuera: apunta al MISMO `#story` y su enlace no sale de ese modelo,
   * asi que tras el clic `document.activeElement` seguia siendo
   * `document.body`. Quien navega por teclado perdia la referencia: la
   * siguiente tabulacion continuaba desde el enlace de origen, no desde
   * Story.
   *
   * El destino se monta aqui con la forma EXACTA que le da la seccion real
   * (`<section id="story">`, SIN `tabindex`: ver `Story.tsx`) para que el
   * candado observe las DOS mitades del arreglo -- que el destino, que no era
   * focalizable, lo pasa a ser, y que el foco acaba ahi. Y esa es tambien la
   * razon de que un test en verde signifique algo: jsdom NO implementa la
   * navegacion por fragmento, asi que no hay ningun paso del "navegador" que
   * pueda mover el foco por su cuenta -- si acaba en la seccion, lo movio
   * este componente.
   */
  describe("foco en el destino al activar el CTA (critica externa #11, punto B2)", () => {
    /** Monta el destino real de `#story` y lo retira pase lo que pase. */
    function conDestinoStory(
      run: (destino: HTMLElement) => void,
      tabindexPropio?: string,
    ): void {
      const destino = document.createElement("section");
      destino.id = "story";
      if (tabindexPropio !== undefined) {
        destino.setAttribute("tabindex", tabindexPropio);
      }
      document.body.appendChild(destino);
      try {
        run(destino);
      } finally {
        destino.remove();
      }
    }

    it("el foco salta a la seccion Story, que gana tabindex=-1 para poder recibirlo", () => {
      const { container } = renderHero();

      conDestinoStory((destino) => {
        const cta = container.querySelector<HTMLElement>('a[href="#story"]');
        expect(cta, "el hero no monta el CTA hacia #story").not.toBeNull();
        expect(
          destino,
          "el destino tiene que empezar SIN tabindex: es lo que lo hace no focalizable",
        ).not.toHaveAttribute("tabindex");

        fireEvent.click(cta as HTMLElement);

        expect(destino).toHaveAttribute("tabindex", "-1");
        expect(
          document.activeElement,
          "el CTA desplazaba sin enfocar: quien navega por teclado seguia tabulando desde el hero",
        ).toBe(destino);
      });
    });

    /*
     * La otra mitad del helper, ejercitada tambien por ESTE camino: un
     * destino que ya declara su propio `tabindex` no se sobrescribe. Es la
     * guarda `hasAttribute` de `navAnchorFocus.ts`; el candado vive aqui
     * ademas de en `Navbar.test.tsx` porque lo que se afirma es que este
     * consumidor IMPORTA el helper en vez de reimplementar la llamada a
     * `focus()` por su cuenta -- una copia local sin la guarda pasaria el
     * test de arriba y caeria en este.
     */
    it("un destino que ya declara su propio tabindex no se sobrescribe", () => {
      const { container } = renderHero();

      conDestinoStory((destino) => {
        fireEvent.click(
          container.querySelector<HTMLElement>(
            'a[href="#story"]',
          ) as HTMLElement,
        );

        expect(destino).toHaveAttribute("tabindex", "0");
        expect(document.activeElement).toBe(destino);
      }, "0");
    });
  });
});
