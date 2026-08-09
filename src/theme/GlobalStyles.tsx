import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
  /*
   * Ángulo del borde cónico animado de las tarjetas de Features en hover
   * (spec 2026-08-06-story-features-tema-claro-design.md, D7). Vive AQUÍ y no
   * dentro del styled-component que lo usa por una restricción del lenguaje,
   * no por preferencia: \`@property\` es una regla de NIVEL SUPERIOR de la
   * hoja de estilos, y styled-components inyecta el CSS de un componente
   * anidado bajo su propia clase -- ahí dentro la regla sería inválida y se
   * descartaría en silencio.
   *
   * Registrar la propiedad es lo que la hace INTERPOLABLE: una propiedad
   * personalizada sin registrar es, para el motor, una cadena de texto, y una
   * animación entre dos cadenas salta de una a otra sin pasos intermedios. Con
   * \`syntax: "<angle>"\` el motor sabe que es un ángulo y lo interpola.
   *
   * Degradación conocida y aceptada (D7): sin soporte de \`@property\` el
   * ángulo no interpola y el borde queda como un degradado cónico ESTÁTICO en
   * hover -- sigue siendo un borde de marca legible, no hay estado roto, así
   * que no hace falta ningún \`@supports\`.
   */
  @property --vti-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }

  :root {
    /* Alto de la banda del navbar. Vive aquí, y no en los tokens de tema,
       porque es una medida de LAYOUT que se consume desde dos sitios sin
       poder derivarla: el propio Navbar (que la fija) y el margen de scroll
       de las secciones ancladas, que tienen que quedar por debajo de la barra
       flotante. Un token de tema obligaría a leerla desde JS en un sitio y
       desde CSS en otro. */
    --nav-height: 3.5rem;
    /* Separación de la píldora del navbar al despegarse en scroll. Vive
       aquí, y no en los tokens de tema, por el mismo motivo que
       --nav-height: es una medida de LAYOUT que consumen dos sitios sin
       poder derivarla el uno del otro — el Navbar (que la aplica como
       margen/hueco lateral) y el margen de scroll de las secciones
       ancladas, que ahora tiene que descontar la barra MÁS esta
       separación. */
    --nav-gap: 0.5rem;
  }

  *,
  html,
  body {
    padding: 0;
    margin: 0;
  }

  *,
  *::after,
  *::before {
    border: 0;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    vertical-align: baseline;
  }

  html {
    -webkit-scroll-behavior: smooth;
    -moz-scroll-behavior: smooth;
    -ms-scroll-behavior: smooth;
    -o-scroll-behavior: smooth;
    scroll-behavior: smooth;

    line-height: 1.15;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;

    -webkit-overflow-scrolling: touch;
    overflow-scrolling: touch;

    /* AQUI VIVIO scroll-snap-type: y proximity, para la presentacion de
       Story. RETIRADO el 2026-07-31 tras medirlo en navegador: se ejecuto
       el plan de retirada que la propia spec dejaba escrito (D3).

       El motivo: las anclas de la presentacion miden exactamente una
       pantalla, asi que CUALQUIER posicion de scroll cae siempre a menos de
       media pantalla de un ancla. Con esa geometria, proximity deja de
       comportarse como proximity y degenera en mandatory: el scroller
       captura casi cualquier parada. Medido pidiendo posiciones concretas y
       viendo donde aterrizaba de verdad -- 900 -> 720, 1200 -> 1440,
       3100 -> 2880 --, es decir tirones de hasta 240px, a veces EN CONTRA
       del sentido del gesto, y otras veces ninguno. De ahi el sintoma
       reportado: "el scroll a veces no funciona".

       La vista sigue atada sin snap: de eso se encarga el pin por
       position: sticky del stage, que es quien mantiene la escena en
       pantalla mientras la pista pasa por debajo. El snap solo anadia el
       acople a cada diapositiva, y lo pagaba con el control del usuario
       sobre su propio scroll. */
  }

  html,
  body {
    /* hidden obliga al eje contrario (vertical) a computar auto, lo que
       convierte a html/body en CONTENEDOR DE SCROLL. Un position: sticky
       dentro se pega respecto a ESE contenedor, no respecto al viewport:
       es la causa clasica de "sticky no pega" y rompe el pin de la
       presentacion de Story. clip recorta el desbordamiento horizontal
       igual que hidden, pero no crea contenedor de scroll, asi que el pin
       queda libre de pegarse al viewport. */
    overflow-x: clip;
  }

  body {
    height: unset;
    background-color: ${({ theme }) => theme.data.semantic.bg};
    color: ${({ theme }) => theme.data.semantic.text};
    font-size: 100%;
    font-family: ${({ theme }) => theme.data.type.fontBody};
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    font-smoothing: always;
    line-height: 1.4em;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    hyphens: auto;
    position: relative;
  }

  body::-webkit-scrollbar {
    width: 0px;
  }

  body::-webkit-scrollbar-track {
    background: transparent;
  }

  body::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.data.semantic.borderStrong};
    border-radius: ${({ theme }) => theme.data.radius.md};
    border: 1px solid ${({ theme }) => theme.data.semantic.borderStrong};
  }

  a {
    color: inherit;
    display: block;
    font-size: inherit;
    text-decoration: none;
  }

  p a {
    display: inline;
  }

  h1, h2, h3, h4, h5, h6, p, span, a, strong, blockquote, i, b, u, em {
    font-size: 1em;
    font-weight: inherit;
    font-style: inherit;
    text-decoration: none;
    color: inherit;
  }

  blockquote:before, blockquote:after, q:before, q:after {
    content: "";
    content: none;
  }

  ::-moz-selection {
    background-color: ${({ theme }) => theme.data.semantic.brand};
    color: ${({ theme }) => theme.data.semantic.onBrand};
  }
  ::selection {
    background-color: ${({ theme }) => theme.data.semantic.brand};
    color: ${({ theme }) => theme.data.semantic.onBrand};
  }

  /* El navbar flota fijo sobre el contenido: al saltar a un ancla (#story
     desde el CTA del hero), el destino quedaría tapado por la barra. El
     margen de scroll lo compensa sin tocar el layout. */
  :where(section[id]) {
    scroll-margin-top: calc(var(--nav-height) + var(--nav-gap));
  }

  /* WCAG 2.4.11 (Focus Not Obscured, Minimum). scroll-margin-top (arriba)
     compensa el salto a una ANCLA COMPLETA -- section[id], click/tap en el
     CTA del hero o en un enlace de sección --, pero un Tab de teclado puede
     posar el foco en CUALQUIER elemento focalizable de la página, no solo
     en el contenedor con id, y el navegador dispara su propio
     scroll-into-view automático cuando ese elemento queda fuera de la
     ventana visible. scroll-margin-top no cubre ese caso -- solo aplica al
     elemento que la declara --; scroll-padding-top en html sí: es la
     propiedad que el navegador consulta para CUALQUIER scroll-into-view
     inducido por foco, sea cual sea el destino. Sin ella, un control que
     recibe foco por Tab puede aterrizar con el anillo de foco visible pero
     oculto bajo la barra fija -- exactamente el fallo que 2.4.11 exige
     evitar.

     Mismo calc() que scroll-margin-top, no solo var(--nav-height): reserva
     el hueco del PEOR caso -- la barra ya desprendida, con el hueco lateral
     var(--nav-gap) sumado a su huella vertical efectiva (ver ScBar en
     Navbar.tsx) --, así que un mismo umbral vale sin importar si el navbar
     sigue en su estado inicial o ya se desprendió al hacer scroll.

     No hay test unitario de esta regla y no lo va a haber: createGlobalStyle
     no inyecta nada bajo jsdom + Vitest (lección del repo, 2026-07-25), así
     que cualquier aserción contra document.styleSheets aquí pasaría en
     verde sin comprobar nada real. La verificación real es en navegador
     (Playwright), fuera de esta tarea. */
  html {
    scroll-padding-top: calc(var(--nav-height) + var(--nav-gap));
  }

  :where(a, button, input, textarea, select, [tabindex]):focus-visible {
    outline: 2px solid ${({ theme }) => theme.data.semantic.focus};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }

  ol, ul, menu {
    list-style: none;
  }

  form, input, textarea, select, button, label {
    font-family: inherit;
    font-size: inherit;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    hyphens: auto;
    background-color: transparent;
    color: inherit;
    display: block;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  table, tr, td {
    border-collapse: collapse;
    border-spacing: 0;
  }

  svg {
    width: 100%;
    display: block;
  }

  img, picture, video, iframe, figure {
    max-width: 100%;
    width: 100%;
    display: block;
    -o-object-fit: cover;
    object-fit: cover;
    -o-object-position: center center;
    object-position: center center;
  }

  meter {
    -webkit-appearance: revert;
    appearance: revert;
  }

  ::placeholder {
    color: unset;
  }

  :where([hidden]) {
    display: none;
  }

  :where([contenteditable]:not([contenteditable="false"])) {
    -moz-user-modify: read-write;
    overflow-wrap: break-word;
    -webkit-line-break: after-white-space;
    -webkit-user-select: auto;
    -webkit-user-modify: read-write;
  }

  :where([draggable="true"]) {
    -webkit-user-drag: element;
  }

  /*
   * Fallback sin-JS para los reveals por IntersectionObserver (useReveal,
   * src/hooks/useReveal.ts). Este sitio es un export estatico -- ver
   * next.config.ts, output: export -- no hay servidor Next detras: si el
   * navegador nunca ejecuta JS, el observer que enciende cada reveal tampoco
   * se crea nunca. Los cinco consumidores actuales de useReveal renderizan
   * data-revealed con su estado inicial en falso (SectionBeam.tsx linea 33,
   * Story.tsx lineas 1133 y 1174, Features.tsx lineas 1083 y 1174,
   * Contact.tsx lineas 1113 y 1278, Journey.tsx linea 588), y sus estilos de
   * base arrancan en opacity 0 (Story.tsx linea 296 y otras, Features.tsx
   * linea 953, Contact.tsx lineas 212 y 699, Journey.tsx linea 263,
   * sectionBeam.parts.tsx varias reglas): sin JS ese atributo se queda
   * congelado en falso para siempre y el contenido no llega a verse jamas.
   *
   * scripting es el media feature que distingue justo ese caso: none
   * cuando el navegador no ejecuta scripts (JS desactivado, o un rastreador
   * que no lo soporta), initial-only durante un primer pintado sin
   * hidratar (no aplica aqui) e initial-only o enabled cuando si hay JS
   * corriendo. Soporte: Chrome 120+, Firefox 113+, Safari 17+, Edge 120+
   * (verificado en MDN/caniuse antes de escribir este comentario). En un
   * navegador sin soporte el bloque completo se ignora y el comportamiento
   * actual -- reveal por observer -- se mantiene sin cambios.
   *
   * El selector cubre las dos formas en que los componentes leen el
   * atributo: presencia simple ([data-revealed]) para cuando el propio
   * nodo animado lo lleva y su regla es calificada (por ejemplo
   * Contact.tsx linea 212, &[data-revealed=true]), y descendiente
   * ([data-revealed] *) para cuando el atributo vive en un padre comun y
   * cada hijo lo lee con el selector [data-revealed=true] & (por ejemplo
   * Story.tsx linea 428, Features.tsx linea 354, sectionBeam.parts.tsx
   * linea 150). No se filtra por valor (=true) a proposito: bajo scripting
   * none el atributo nunca deja de ser falso, asi que la condicion util
   * aqui es que exista, no lo que valga.
   *
   * important es intencional y no una duplicacion de especificidad por
   * costumbre (la regla 25 del RULES.md prohibe justo eso): cada regla de
   * componente que aplica opacity 1 esta calificada con su propia clase
   * generada (por ejemplo .sc-xxxx[data-revealed=true], especificidad de
   * clase mas atributo) y le gana en especificidad a un simple
   * [data-revealed] de aqui pase lo que pase con el orden de insercion en
   * el documento; sin important esta regla nunca llegaria a aplicarse.
   *
   * No hay test unitario de esta regla y no lo va a haber: createGlobalStyle
   * no inyecta nada bajo jsdom + Vitest (leccion del repo, 2026-07-25), asi
   * que cualquier asercion contra document.styleSheets aqui pasaria en
   * verde sin comprobar nada real. La verificacion real es en navegador con
   * JS deshabilitado (Playwright), fuera de esta tarea.
   */
  @media (scripting: none) {
    [data-revealed],
    [data-revealed] * {
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;
