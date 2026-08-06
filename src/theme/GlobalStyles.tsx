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
`;
