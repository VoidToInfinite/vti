import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { themes } from "@/theme/themes";
import {
  ScBackLink,
  ScDd,
  ScDl,
  ScDlRow,
  ScDt,
  ScInlineLink,
  ScMain,
  ScSection,
  ScTable,
  ScTocLink,
} from "./legalPage.parts";

/** Texto CSS de las reglas que styled-components inyectó para un elemento
 *  (jsdom no evalúa ningún @media, regla 36): mismo patrón que
 *  Footer.test.tsx/Story.test.tsx. */
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

/*
 * Task 9 (craft de interacción): ScBackLink/ScTocLink ganan
 * :active { transform: scale(...) }, tomado de vocabulary.PRESS, con su
 * propia entrada en transition y su guard de prefers-reduced-motion. Sin
 * hover que guardar: los dos solo cambian color en hover (punto 2 del
 * brief, "los de color pueden quedarse"). Validado con el bug inyectado a
 * propósito (ver informe de la tarea, tabla ScBackLink/ScTocLink):
 * comentando temporalmente el bloque &:active de cada uno
 * (legalPage.parts.tsx) el test correspondiente se pone en rojo (no hay
 * ninguna regla :active con scale); restaurado, vuelve a verde.
 */
describe("legalPage.parts: :active (Task 9, vocabulary.PRESS)", () => {
  it("ScBackLink declara :active con transform: scale(PRESS.activeScale), transition de transform con PRESS.durationMs/PRESS.easing, y guard de reduce", () => {
    renderWithProviders(<ScBackLink href="/">Volver</ScBackLink>);
    const enlace = screen.getByText("Volver");
    const css = cssRuleTextFor(enlace);

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transform: none");
  });

  it("ScTocLink declara :active con transform: scale(PRESS.activeScale), transition de transform con PRESS.durationMs/PRESS.easing, y guard de reduce", () => {
    renderWithProviders(<ScTocLink href="#s1">Sección 1</ScTocLink>);
    const enlace = screen.getByText("Sección 1");
    const css = cssRuleTextFor(enlace);

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transform: none");
  });
});

/*
 * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado con
 * el bug inyectado a propósito (ver informe de la tarea): comentando
 * temporalmente `touch-action: manipulation;` de cada uno
 * (legalPage.parts.tsx), el test correspondiente se pone en rojo;
 * restaurado, vuelve a verde.
 */
describe("legalPage.parts: touch-action (Task 13, punto 2 del brief)", () => {
  it("ScBackLink declara touch-action: manipulation", () => {
    renderWithProviders(<ScBackLink href="/">Volver</ScBackLink>);
    const enlace = screen.getByText("Volver");
    expect(cssRuleTextFor(enlace)).toContain("touch-action: manipulation");
  });

  it("ScTocLink declara touch-action: manipulation", () => {
    renderWithProviders(<ScTocLink href="#s1">Sección 1</ScTocLink>);
    const enlace = screen.getByText("Sección 1");
    expect(cssRuleTextFor(enlace)).toContain("touch-action: manipulation");
  });
});

/*
 * Afordancia de enlace (Ola B, 2026-08-16). `GlobalStyles` declara
 * `a { text-decoration: none }` para todo el sitio, y `ScBackLink` usaba
 * EXACTAMENTE el mismo color que el cuerpo de texto que lo rodea
 * (`oklch(0.86 0.004 286)` los dos: contraste 1,0:1). En una página legal de
 * 5.198 px es la única salida de la parte alta, y los enlaces del índice de la
 * MISMA página sí se distinguían — la incoherencia era interna.
 *
 * Lo que se bloquea es la afordancia EN REPOSO, no en hover: un hover no
 * existe para quien navega con el dedo.
 *
 * Validado con el bug inyectado a propósito: quitando `text-decoration:
 * underline` de `ScBackLink` (`legalPage.parts.tsx`), este test cae en rojo;
 * restaurado, vuelve a verde.
 */
describe("legalPage.parts: afordancia de enlace (Ola B)", () => {
  it("ScBackLink se subraya en reposo, no solo al pasar el puntero", () => {
    renderWithProviders(<ScBackLink href="/">Volver</ScBackLink>);
    const enlace = screen.getByText("Volver");
    const css = cssRuleTextFor(enlace);
    const reposo = css.split(":hover")[0];

    expect(
      reposo,
      "sin subrayado el enlace es tipográficamente indistinguible de la prosa que lo rodea",
    ).toContain("text-decoration: underline");
    expect(reposo).toContain("text-underline-offset");
  });

  /*
   * Crítica externa #10, hallazgo C: los enlaces del índice se distinguían
   * SOLO por color (`semantic.brandText` contra `semantic.text`), que es lo
   * que WCAG 1.4.1 (nivel A) no admite como única señal. Se replica el
   * precedente del propio fichero (`ScBackLink`, Ola B) con sus mismos
   * valores, no un estilo nuevo.
   *
   * Se afirma sobre el bloque EN REPOSO (todo lo anterior al primer
   * `:hover`) a propósito, igual que el test de arriba: un hover no existe
   * para quien navega con el dedo.
   *
   * Validado con el bug inyectado a propósito: comentando
   * `text-decoration: underline;` en `ScTocLink` (`legalPage.parts.tsx`)
   * este test cae en rojo; restaurada la línea, vuelve a verde.
   */
  it("ScTocLink se subraya en reposo: el color no puede ser su única señal", () => {
    renderWithProviders(<ScTocLink href="#s1">Sección 1</ScTocLink>);
    const enlace = screen.getByText("Sección 1");
    const css = cssRuleTextFor(enlace);
    const reposo = css.split(":hover")[0];

    expect(
      reposo,
      "sin subrayado, el índice solo se distingue del texto por su color (WCAG 1.4.1)",
    ).toContain("text-decoration: underline");
    expect(reposo).toContain("text-underline-offset");
  });

  /*
   * Crítica #13, T1: `ScInlineLink` es el segundo consumidor del bloque
   * compartido `legalLinkStyles` — el enlace que vive DENTRO del texto
   * corrido (el correo de ejercicio de derechos y la sede de la AEPD).
   *
   * Aquí la afordancia pesa todavía más que en el índice: un enlace en prosa
   * está rodeado de texto que se le parece, así que sin las DOS señales
   * (color propio + subrayado) es literalmente indistinguible de la frase que
   * atraviesa. Se afirma sobre el bloque EN REPOSO, igual que los dos de
   * arriba: un hover no existe para quien navega con el dedo.
   *
   * El color se compara contra el TOKEN importado (regla 38), no contra un
   * string escrito a mano, y contra el rol del cuerpo del documento
   * (`semantic.text`, el de `ScParagraph`) para que «distinto del cuerpo» sea
   * una comprobación y no una afirmación de prosa.
   *
   * Validado con el bug inyectado a propósito: comentando
   * `text-decoration: underline;` en `legalLinkStyles` (`legalPage.parts.tsx`)
   * este caso cae en rojo; restaurada la línea, vuelve a verde.
   */
  it("ScInlineLink se subraya en reposo y no comparte color con el cuerpo del documento", () => {
    renderWithProviders(
      <ScInlineLink href="mailto:x@y.test">x@y.test</ScInlineLink>,
    );
    const enlace = screen.getByText("x@y.test");
    const css = cssRuleTextFor(enlace);
    const reposo = css.split(":hover")[0];

    expect(
      reposo,
      "sin subrayado, un enlace en prosa es indistinguible de la frase que atraviesa",
    ).toContain("text-decoration: underline");
    expect(reposo).toContain("text-underline-offset");
    expect(reposo).toContain(`color: ${themes.light.semantic.brandText}`);
    expect(themes.light.semantic.brandText).not.toBe(
      themes.light.semantic.text,
    );
    expect(themes.dark.semantic.brandText).not.toBe(themes.dark.semantic.text);
  });
});

/*
 * Crítica externa #10, hallazgo A (P0). `/privacidad` recortaba contenido en
 * todo móvil por debajo de 466 px: a 320 px se perdían 122 px de página y el
 * `h1` renderizaba «Política de privacidac».
 *
 * La causa raíz completa vive en el comentario de `ScMain`
 * (`legalPage.parts.tsx`); en dos líneas: `body` es un contenedor flex en
 * columna desde la Ola B, un ítem flex con un margen AUTO en el eje
 * transversal NO se estira, y sin estirarse su ancho cae a `fit-content` —
 * que la tabla de almacenamiento de 5 columnas empujaba hasta ~476 px,
 * topados por el `max-width` de la propia caja.
 *
 * Lo que estos dos candados protegen es exactamente la línea que impide ese
 * camino (`width: 100%`, un ancho DEFINIDO) y la que entrega la medida de
 * lectura prometida. jsdom no hace layout, así que ninguno de los dos puede
 * medir el recorte: afirman la declaración que lo evita, contra los tokens
 * importados y nunca contra un número escrito a mano.
 *
 * Validados con el bug inyectado a propósito (ver informe de la tarea):
 * comentando la línea real de cada uno en `legalPage.parts.tsx` el candado
 * correspondiente cae en rojo; restaurada la línea, vuelve a verde.
 */
describe("legalPage.parts: ancho de ScMain (crítica externa #10, hallazgos A y C)", () => {
  it("ScMain declara un ancho DEFINIDO (width: 100%), sin el que la caja se dimensiona por su contenido", () => {
    renderWithProviders(<ScMain>documento</ScMain>);
    const css = cssRuleTextFor(screen.getByRole("main"));

    expect(
      css,
      "sin un ancho definido, el min-content de la tabla infla la caja por encima del viewport",
    ).toMatch(/[{;]\s*width:\s*100%/);
  });

  it("ScMain suma los dos rellenos a su tope, para que quien mida grid.prose sea la caja de CONTENIDO", () => {
    renderWithProviders(<ScMain>documento</ScMain>);
    /* Se compara sobre el texto NORMALIZADO, no crudo: el valor de un
       `calc()` conserva los saltos de línea con los que se escribió en el
       template de styled-components (verificado leyendo el `cssText` real
       que devuelve jsdom, no supuesto), así que un `toContain` literal
       dependería del ancho con el que Prettier decida partir la línea —
       una propiedad del formateo, no del CSS. */
    const css = cssRuleTextFor(screen.getByRole("main"))
      .replace(/\s+/g, " ")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")");

    expect(
      css,
      "con el tope a grid.prose pelado, el padding se come 48 px de la medida de lectura",
    ).toContain(
      `calc(${themes.light.grid.prose} + 2 * ${themes.light.space[5]})`,
    );
  });

  /*
   * DECISIÓN DEL DUEÑO 2026-09-03 (crítica externa #16): las páginas legales
   * pasan a montar el `Navbar` del sitio (ver el docblock de
   * `documents/PrivacyDocument.tsx`), que es `position: fixed` y NO deja hueco
   * en el flujo -- a diferencia de la cabecera propia que montaban hasta hoy.
   * Sin este descuento, el enlace de vuelta y el `h1` nacen debajo de la barra.
   *
   * jsdom no hace layout, así que la superposición real no se puede observar
   * aquí: se inspecciona `document.styleSheets`, que es exactamente el texto
   * que llega al navegador (regla 36/44). La comprobación en Chrome de que el
   * `main` empieza por debajo de la banda va en el informe de la tarea.
   */
  it("ScMain descuenta la banda del navbar fijo en su relleno superior, en los dos escalones", () => {
    renderWithProviders(<ScMain>documento</ScMain>);
    // Normalizado por el mismo motivo que el test de arriba: un `calc()`
    // conserva los saltos de línea del template.
    const css = cssRuleTextFor(screen.getByRole("main"))
      .replace(/\s+/g, " ")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")");

    expect(
      css,
      "sin descontar --nav-height, el documento nace tapado por la barra fija",
    ).toContain(`calc(var(--nav-height) + ${themes.light.space[7]})`);
    expect(
      css,
      "el escalón md tiene su propio relleno de bloque y también tiene que descontar la banda",
    ).toContain(`calc(var(--nav-height) + ${themes.light.space[8]})`);
  });

  /*
   * El suelo de la tabla: lo que impide que «que ScMain deje de inflarse» se
   * pague aplastando las 5 columnas (el atajo `table-layout: fixed` con
   * `width: 100%` daría columnas de 64 px a 320 px). Se afirma contra el
   * token, no contra su valor.
   */
  /*
   * EL ATERRIZAJE DEL ÍNDICE, Y LA DEPENDENCIA CRUZADA QUE LO SOSTIENE
   * (frente Q-2, 2026-09-04; regla 41).
   *
   * QUÉ SE MIDIÓ, y por qué este candado existe aunque la medición saliera
   * limpia. Ninguna de las tres superficies que la ola M rehízo —
   * `/privacidad`, `/aviso-legal` y la 404, en los dos idiomas — había pasado
   * nunca por el protocolo técnico. Medido en Chrome sobre el build de
   * `0226846` servido, en las cuatro rutas legales y en los dos idiomas:
   * `getComputedStyle(header).position === "fixed"` con la banda terminando en
   * `bottom = 64 px`; los 14 destinos del índice de `/privacidad` y los 15 de
   * `/aviso-legal` aterrizan con su `<h2>` en `top = 88 px` (el primero) o
   * `137 px` (los demás). CERO quedan bajo la barra.
   *
   * DE DÓNDE SALEN ESOS 88 px, que es lo que este candado ata: NO de la
   * declaración de `ScSection`, que aporta solo 24 px (`space[5]`) y por sí
   * sola dejaría el título a 24 px del borde superior — es decir, 40 px POR
   * DEBAJO del borde inferior de una barra que termina en 64. Los otros 64
   * salen de `html { scroll-padding-top: calc(var(--nav-height) +
   * var(--nav-gap)) }`, declarado en `GlobalStyles.tsx`: una propiedad del
   * CONTENEDOR DE SCROLL, que gobierna cualquier desplazamiento hacia un
   * destino de este documento, el salto por fragmento del índice incluido.
   *
   * Es una invariante que cruza dos ficheros y hasta hoy no vivía en ninguno:
   * el comentario de `ScSection` afirmaba, al contrario, que «este header no es
   * fixed, así que no hace falta compensar nada» — cierto para la cabecera
   * legal propia que se retiró al revertirse D20, falso desde la ola M. Quien
   * retirara el `scroll-padding-top` global convencido de que las legales no lo
   * necesitan dejaría los 29 destinos de los dos índices bajo la barra sin que
   * nada se pusiera en rojo.
   *
   * `createGlobalStyle` no inyecta nada bajo jsdom (regla 37), así que la mitad
   * global se comprueba sobre la FUENTE de `GlobalStyles.tsx` — el mismo
   * recurso que ya usa `app/not-found.test.tsx` para vigilar el fichero del
   * framework instalado.
   */
  it("ScSection declara su propio scroll-margin-top desde la escala, no un literal", () => {
    renderWithProviders(<ScSection id="s1">sección</ScSection>);
    const css = cssRuleTextFor(
      screen.getByText("sección") as HTMLElement,
    ).replace(/\s+/g, " ");

    expect(
      css,
      "sin margen de scroll propio, el título de la sección nace pegado al borde inferior de la barra",
    ).toContain(`scroll-margin-top: ${themes.light.space[5]}`);
  });

  it("el aterrizaje del índice supera la banda de la barra: scroll-padding-top global + scroll-margin-top propio", () => {
    const fuenteGlobal = readFileSync(
      path.join(process.cwd(), "src/theme/GlobalStyles.tsx"),
      "utf8",
    );

    /* La declaración que compensa la barra, sobre el `html` y no sobre la
       sección: es la única que gobierna el salto por fragmento del índice. */
    expect(
      fuenteGlobal.replace(/\s+/g, " "),
      "sin scroll-padding-top en html, los destinos del índice legal aterrizan bajo la barra fija",
    ).toContain(
      "scroll-padding-top: calc(var(--nav-height) + var(--nav-gap));",
    );

    /* Aritmética del aterrizaje, con las dos mitades leídas de su fuente y
       nunca de un número escrito aquí: la banda mide `--nav-height` +
       `--nav-gap`, y el desfase efectivo es esa banda MÁS el margen propio de
       la sección. Se exige que el desfase supere de verdad la banda, que es la
       propiedad observable (el título no queda tapado), no que las cadenas
       coincidan. */
    const nav = /--nav-height:\s*([\d.]+)rem/.exec(fuenteGlobal);
    expect(
      nav,
      "--nav-height dejó de declararse en rem en GlobalStyles",
    ).not.toBeNull();
    const remAPx = (valor: string): number => parseFloat(valor) * 16;
    const bandaPx = remAPx(nav![1]) + remAPx(themes.light.space[2]);
    const desfasePx = bandaPx + remAPx(themes.light.space[5]);

    expect(bandaPx).toBeGreaterThan(0);
    expect(
      desfasePx,
      "el desfase de aterrizaje no supera la banda: el título quedaría bajo la barra",
    ).toBeGreaterThan(bandaPx);
  });

  /*
   * SONDA NEGATIVA del candado de arriba (el repo ya tuvo dos candados que
   * pasaban por vacuidad y los dos se descubrieron tarde). La mitad global no
   * se puede poner en rojo con un bug inyectado sin editar `GlobalStyles.tsx`,
   * que pertenece a otro frente de esta ola; lo que sí se puede demostrar —y es
   * evidencia más fuerte que una edición temporal— es que el matcher RECHAZA de
   * verdad una fuente sin la regla. Si alguien "simplificara" la comprobación a
   * algo que siempre pasa, este caso cae con ella.
   */
  it("sonda negativa: la comprobación anterior rechaza una fuente global sin scroll-padding-top", () => {
    const fuenteMutilada = `
      html { scroll-behavior: smooth; }
      :where(section[id]) { scroll-margin-top: calc(var(--nav-height) + var(--nav-gap)); }
    `.replace(/\s+/g, " ");

    expect(fuenteMutilada).not.toContain(
      "scroll-padding-top: calc(var(--nav-height) + var(--nav-gap));",
    );
  });

  it("ScTable declara un suelo de ancho igual a la medida de lectura", () => {
    renderWithProviders(
      <ScTable>
        <tbody>
          <tr>
            <td>dato</td>
          </tr>
        </tbody>
      </ScTable>,
    );
    const css = cssRuleTextFor(screen.getByRole("table"));

    expect(css).toContain(`min-width: ${themes.light.grid.prose}`);
  });
});

/*
 * EL CANDADO DEL TEXTO AL 200 % (P1 del 2026-09-04; WCAG 1.4.4, nivel AA).
 *
 * QUÉ SE MIDIÓ, con Chrome sobre el build servido, la raíz a 32 px vía
 * `Page.setFontSizes` (la misma palanca que la preferencia real del usuario), en
 * `/privacidad`, `/en/privacy`, `/aviso-legal` y `/en/legal-notice`, en los dos
 * temas y a nueve anchos. La ficha identificativa se salía del viewport
 * **79,11 px a 320, 39,11 px a 360 y 9,11 px a 390**, con 22-23 elementos
 * afectados por página, y en `/privacidad` se salía además el correo de
 * ejercicio de derechos DENTRO del texto corrido, con las mismas cifras. No era
 * contenido desplazable: `GlobalStyles` declara `html, body { overflow-x: clip }`
 * y `documentElement.scrollWidth` se quedaba clavado en el ancho del viewport,
 * así que esos píxeles no eran alcanzables de ninguna forma. Tras el arreglo:
 * cero en las 72 combinaciones, y la maquetación a 16 px sale IDÉNTICA línea a
 * línea (altura de documento, ancho de `main`, pistas de rejilla, alturas de
 * fila y el enlace en prosa en una sola línea).
 *
 * POR QUÉ ESTE CANDADO ES DE DECLARACIONES Y NO DE MEDIDAS: jsdom no hace
 * layout, no pinta y no evalúa `@media` (reglas 36 y 44), así que no puede ver
 * un recorte. Lo que sí puede es afirmar que las declaraciones que lo evitan
 * siguen escritas — y, sobre todo, que el CENSO de piezas que las necesitan no
 * ha encogido. La medición en navegador vive en el informe de la tarea y en
 * `scripts/check-legal-surfaces.mjs`, familia `texto-al-200-por-ciento`.
 *
 * LA EXTENSIÓN, ATADA. El modo de fallo caro de este repo no es que una regla
 * se borre, es que la LISTA que la vigila encoja: borrar `ScDl` del fichero
 * dejaría un candado feliz recorriendo lo que queda. Por eso los dos censos de
 * abajo se comparan contra listas TECLEADAS, no derivadas de lo que el fichero
 * declare hoy: quitar una pieza los pone en rojo, y añadir una pieza nueva en
 * rejilla o con envoltura también, obligando a decidir explícitamente si entra.
 */
const FUENTE_PARTES = readFileSync(
  path.join(process.cwd(), "src/components/legal/legalPage.parts.tsx"),
  "utf8",
);

/** Las piezas de este fichero que maquetan en rejilla y, por tanto, necesitan
 *  pistas explícitas para poder encoger con su contenedor. Tecleada. */
const PIEZAS_EN_REJILLA = ["ScDl", "ScDlRow"];

/** Las piezas que portan un token que el documento no controla —el correo, la
 *  dirección— y necesitan poder partirlo. Tecleada, por el mismo motivo. */
const PIEZAS_QUE_ENVUELVEN = ["ScDd", "ScInlineLink"];

/**
 * Los bloques de estilo del fichero, por nombre de export. El template literal
 * de cada `styled` no puede contener backticks (regla 23 de RULES.md, que este
 * mismo fichero respeta), así que las comillas invertidas delimitan sin
 * ambigüedad.
 */
function bloquesDeEstilo(fuente: string): Map<string, string> {
  const bloques = new Map<string, string>();
  for (const m of fuente.matchAll(
    /export const (\w+) = styled[^`]*`([\s\S]*?)\n`;/g,
  )) {
    bloques.set(m[1], m[2]);
  }
  return bloques;
}

describe("legalPage.parts: texto al 200 % (WCAG 1.4.4, 2026-09-04)", () => {
  it("el censo de piezas en rejilla no ha encogido, y todas declaran pistas explícitas", () => {
    const bloques = bloquesDeEstilo(FUENTE_PARTES);

    /* Sonda positiva: si el analizador dejara de encontrar bloques, todo lo de
       abajo pasaría por vacuidad — que es exactamente el fallo que este censo
       existe para impedir. */
    expect(
      bloques.size,
      "el analizador no encontró ni un bloque de estilo: la comprobación sería vacua",
    ).toBeGreaterThan(10);
    expect(bloques.has("ScMain")).toBe(true);

    const enRejilla = [...bloques]
      .filter(([, css]) => /display:\s*grid/.test(css))
      .map(([nombre]) => nombre);

    expect(
      enRejilla.sort(),
      "el censo de piezas en rejilla cambió: si nace una pieza nueva decide si necesita " +
        "pistas explícitas y añádela; si desapareció una, restáurala — no dejes que la " +
        "lista encoja sola",
    ).toEqual([...PIEZAS_EN_REJILLA].sort());

    for (const nombre of PIEZAS_EN_REJILLA) {
      expect(
        bloques.get(nombre),
        `${nombre} maqueta en rejilla sin declarar sus pistas: la pista implícita se ` +
          `dimensiona con auto, cuyo mínimo es min-content, y el token del correo la ` +
          `enrasa a 351 px con la raíz a 32 px`,
      ).toMatch(/grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/);
    }
  });

  it("el censo de piezas que envuelven no ha encogido, y todas usan anywhere y no break-word", () => {
    const bloques = bloquesDeEstilo(FUENTE_PARTES);

    const conEnvoltura = [...bloques]
      .filter(([, css]) => /overflow-wrap:/.test(css))
      .map(([nombre]) => nombre);

    expect(
      conEnvoltura.sort(),
      "el censo de piezas con regla de envoltura cambió: decide explícitamente si la " +
        "pieza nueva la necesita, o restaura la que falta",
    ).toEqual([...PIEZAS_QUE_ENVUELVEN].sort());

    for (const nombre of PIEZAS_QUE_ENVUELVEN) {
      const css = bloques.get(nombre) ?? "";
      expect(
        css,
        `${nombre} porta un token indivisible y no declara cómo partirlo`,
      ).toMatch(/overflow-wrap:\s*anywhere/);
      expect(
        css,
        `${nombre} usa break-word, que parte el token al pintarlo pero NO reduce el ` +
          `min-content de la caja: la rejilla seguiría reservando el token entero`,
      ).not.toMatch(/overflow-wrap:\s*break-word/);
    }
  });

  /*
   * SONDA NEGATIVA de los dos censos. El repo ya tuvo candados que pasaban por
   * vacuidad; aquí se demuestra que el analizador RECHAZA de verdad una fuente
   * sin las declaraciones, en vez de aceptar cualquier cosa. Si alguien
   * "simplificara" los matchers a algo que siempre pasa, este caso cae con ellos.
   */
  it("sonda negativa: el analizador ve una rejilla sin pistas y una envoltura equivocada", () => {
    const fuenteRota = [
      "export const ScFalsa = styled.dl`",
      "  display: grid;",
      "  gap: 8px;",
      "`;",
      "",
      "export const ScFalsaDd = styled.dd`",
      "  overflow-wrap: break-word;",
      "`;",
    ].join("\n");

    const bloques = bloquesDeEstilo(fuenteRota);
    expect([...bloques.keys()].sort()).toEqual(["ScFalsa", "ScFalsaDd"]);
    expect(bloques.get("ScFalsa")).not.toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)/,
    );
    expect(bloques.get("ScFalsaDd")).not.toMatch(/overflow-wrap:\s*anywhere/);
    expect(bloques.get("ScFalsaDd")).toMatch(/overflow-wrap:\s*break-word/);
  });

  /*
   * Y lo que de verdad llega al navegador: las mismas declaraciones leídas de
   * `document.styleSheets`, que es el texto que styled-components inyecta. La
   * comprobación de la fuente de arriba ata el CENSO; esta ata que el CSS
   * generado las lleva de verdad —una `css` compartida mal enganchada, o un
   * `styled(X)` que las pise, se vería aquí y no allí.
   */
  it("el CSS que llega al navegador lleva las pistas y la envoltura", () => {
    renderWithProviders(
      <ScDl>
        <ScDlRow>
          <ScDt>Correo</ScDt>
          <ScDd>hello@voidtoinfinite.test</ScDd>
        </ScDlRow>
      </ScDl>,
    );

    const dd = screen.getByText("hello@voidtoinfinite.test");
    const fila = dd.parentElement as HTMLElement;
    const lista = fila.parentElement as HTMLElement;

    const normaliza = (el: HTMLElement): string =>
      cssRuleTextFor(el)
        .replace(/\s+/g, " ")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")");

    expect(normaliza(lista)).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(normaliza(fila)).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(normaliza(dd)).toContain("overflow-wrap: anywhere");
  });

  it("ScInlineLink declara la envoltura sin heredarla del bloque compartido del índice", () => {
    renderWithProviders(
      <>
        <ScInlineLink href="mailto:x@y.test">x@y.test</ScInlineLink>
        <ScTocLink href="#s1">Sección 1</ScTocLink>
      </>,
    );

    expect(
      cssRuleTextFor(screen.getByText("x@y.test")),
      "el enlace en prosa porta el correo: sin envoltura se sale del párrafo, que es " +
        "un mecanismo distinto del de la rejilla y no lo arregla ninguna de sus pistas",
    ).toContain("overflow-wrap: anywhere");
  });
});
