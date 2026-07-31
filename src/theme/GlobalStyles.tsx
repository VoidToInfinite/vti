import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
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

    /* La presentacion de Story (D3) fija su escena con position: sticky y
       recorre 6 diapositivas atadas al scroll. El scroller sigue siendo la
       pagina entera: proximity, no mandatory, deja intactos los elementos
       SIN scroll-snap-align (todo lo que no sea una diapositiva de Story) y
       permite atravesar la presentacion sin pararse en cada diapositiva.
       mandatory en el scroller raiz secuestraria la pagina completa. Si en
       verificacion de navegador interfiere con el scroll-behavior smooth de
       arriba o con los saltos a ancla del navbar, se retira esta linea y el
       pin de Story se queda solo, que por si mismo ya ata la vista. */
    scroll-snap-type: y proximity;
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
