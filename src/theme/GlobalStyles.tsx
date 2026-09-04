import { createGlobalStyle } from "styled-components";
import { grid } from "./tokens/grid";
import { semanticDark } from "./tokens/semantic";
import { space } from "./tokens/space";

/*
 * `overflow-wrap: anywhere` EN `body`: ninguna palabra puede empujar su caja
 * fuera del viewport (critica externa #19, 2026-09-04, WCAG 1.4.4 Resize text).
 *
 * Este docblock vive FUERA del template a proposito, y no es una manía de
 * formato: el texto que se escribe DENTRO de un template de styled-components
 * es CSS, viaja al bundle y se paga en el presupuesto de JavaScript que vigila
 * `scripts/measure-home-js.mjs`. La primera version de este arreglo lo escribio
 * dentro y ese candado cayo en rojo por 1.010 B de mas sobre un limite de 1.000.
 *
 * QUE PASABA. Con la preferencia de tamano de texto del usuario al 200 % (raiz
 * del documento a 32px, emulada con `Page.setFontSizes`, que es la palanca real
 * de esa preferencia) las longitudes en `rem` crecen y el viewport se queda
 * donde estaba. Toda caja que se dimensione por su contenido --un item flex con
 * `min-width: auto`, una pista de rejilla `auto` o `1fr`-- se enrasa entonces al
 * `min-content` de lo que contiene, y el `min-content` de un parrafo es su
 * palabra mas larga. Medido en Chrome real sobre el build de produccion a 320 px
 * de ancho: el kicker de Story pedia 314,47 px en una caja de 224 y se salia
 * 42,47 px; las tarjetas de Features en ingles se salian 72,50 px, arrastrando
 * titulo, cuerpo, vinetas y su enlace; a 768 px la fila de destinos de la barra
 * se salia 24,13 px con su disparador «Mas» dentro.
 *
 * POR QUE ESOS PIXELES SON CONTENIDO PERDIDO Y NO CONTENIDO DESPLAZABLE: `html`
 * y `body` declaran `overflow-x: clip` --deliberado, por el pin de los decks--,
 * asi que `scrollWidth` no se mueve y no hay gesto ni tecla que alcance lo que
 * sobresale.
 *
 * POR QUE `anywhere` Y NO `break-word`, que es la forma que este mismo fichero
 * usa para el contenido editable: solo `anywhere` entra tambien en el calculo
 * del `min-content` de la caja. `break-word` parte la linea pero deja el
 * `min-content` en la palabra entera, asi que la caja seguiria inflandose
 * exactamente igual -- que es el defecto, no el sintoma.
 *
 * POR QUE EN GLOBAL Y NO SECCION A SECCION: es una propiedad heredada y el
 * defecto es de clase, no de pieza. Las rejillas que ademas declaraban su pista
 * sin minimo cero se corrigen aparte, en su fichero (`Footer`, el deck de
 * Journey, la rejilla de Features): esta regla y aquellas son las dos mitades
 * del mismo arreglo, y ninguna sirve sola.
 *
 * NO CAMBIA NADA MIENTRAS EL TEXTO QUEPA: una palabra solo se parte cuando la
 * alternativa es salirse. Medido antes y despues con la raiz por defecto a 320,
 * 390 y 768 px en los dos temas: las mismas capas de arte a sangre en las dos
 * corridas y ni un pixel de diferencia en el resto.
 */
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
    /* color-scheme le dice al NAVEGADOR en que esquema esta el documento, y de
       el dependen piezas que esta hoja no pinta: barra de scroll, controles de
       formulario nativos y fondo por defecto del lienzo. No se declaraba en
       ninguna parte del repo hasta el 2026-08-16, y el efecto era medible:
       como el tema lo decide el CONMUTADOR y no el sistema (localStorage gana
       a prefers-color-scheme, decision D-C), quien tuviera el sistema en claro
       y pulsara a oscuro se quedaba con la barra de scroll clara sobre un
       documento casi negro de 12.821 px.

       Va atado a data-theme (la rama oscura, mas abajo) y no a
       prefers-color-scheme: es el atributo que el script de arranque fija
       ANTES del primer pintado y que ThemeProvider mantiene al dia en cada
       cambio, asi que vale en los tres momentos sin ningun estado nuevo. El
       valor base es light porque el HTML estatico que hornea el build es el
       claro: sin JavaScript, ese es el estado real de la pagina.

       NO PASA A light dark, Y ESO SE MIDIO (critica externa #17, P2 del
       evaluador Nielsen, 2026-09-03). El hallazgo es cierto y esta
       reproducido: sin JavaScript, un visitante con el sistema en oscuro
       recibe la pagina clara (data-theme null, background del body
       oklch(0.985 0 286) medido en Chrome con javaScriptEnabled false y
       colorScheme dark). El arreglo que proponia -- declarar aqui
       light dark y dejar que el script de arranque fije el tema resuelto --
       NO cambia ese sintoma, y eso tambien esta medido, no razonado: con la
       regla inyectada en el HTML servido, misma sonda, dos capturas de la
       pagina a 390x844 con prefers-color-scheme dark y reduced-motion (para
       congelar la fase) salen BYTE A BYTE identicas a las dos capturas sin
       ella, y el background computado del body sigue en oklch(0.985 0 286).

       El motivo es que color-scheme solo decide el fondo del lienzo cuando la
       pagina no declara ninguno, y body declara background-color siempre;
       ademas este mismo fichero anula la apariencia nativa de los controles de
       formulario (appearance: none) y esconde la barra de scroll de WebKit. Es
       decir: cero beneficio medible, a cambio de anunciar al navegador un
       esquema que la pagina no pinta -- un motor que no honre
       ::-webkit-scrollbar pintaria barra oscura sobre pagina clara.

       Lo que el hallazgo pide de verdad -- una pagina oscura sin JavaScript --
       no es un cambio de CSS: exige hornear una variante oscura del HTML
       estatico, y las cuatro secciones montan un componente hijo DISTINTO por
       tema (regla 6 de RULES.md). Es una decision de arquitectura del dueno,
       no algo que se resuelva aqui en silencio.

       SIN BACKTICKS: esto vive dentro del template literal de
       styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
    color-scheme: light;

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
    /* El VALOR sale de la escala, aunque la MEDIDA viva en una variable CSS:
       son dos preguntas distintas y el comentario de arriba solo contesta la
       segunda. Hasta la crítica externa #18 (2026-09-04) aquí había un
       \`0.5rem\` escrito a mano que era \`space[2]\` byte a byte -- el hallazgo
       que la familia \`spacing-literal\` de scripts/detect-anti-patterns.mjs
       se creó para cazar, y que esa familia dejó sancionado como PROVISIONAL
       en vez de excepción. Es la deriva silenciosa de la regla 17 de
       RULES.md en estado puro: el día que la escala se retoque, la variable
       no se entera y el CSS renderizado no distingue los dos casos. El token
       se importa por módulo, como \`grid\` y \`semanticDark\` arriba, y no por
       \`theme.data\`: es una medida de layout que no cambia con el tema. */
    --nav-gap: ${space[2]};
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
    /* El pie llega SIEMPRE al borde inferior, aunque el contenido no dé para
       llenar la pantalla (Ola B, 2026-08-16). Medido en la 404 a 1440x900:
       body medía 656 px en un viewport de 900, con display: block y
       min-height: 0, asi que el pie terminaba en y=656 y quedaban 244 px de
       fondo vacio debajo. document.scrollHeight era 900 y la pagina no
       scrolleaba: no era contenido cortado, era una pagina que no llenaba el
       viewport. En una pagina de error, donde alguien ya frustrado juzga si
       el sitio esta mantenido, un pie flotando a media pantalla se lee como
       roto.

       Se resuelve en global y no solo en la 404 a proposito: es la unica
       pagina corta que existe HOY, y acotar el arreglo dejaria el defecto
       esperando a la siguiente.

       display: flex NO rompe el pin de la presentacion de Story, y eso habia
       que comprobarlo antes de escribirlo, no despues: lo que convierte a
       html/body en contenedor de scroll --y por tanto lo que romperia
       position: sticky-- es el overflow, no el display (ver el bloque de
       overflow-x: clip unas lineas mas arriba, que documenta esa trampa).
       Verificado en navegador tras el cambio, no razonado: el stage de Story
       sigue clavado en top 0 en las 8 posiciones muestreadas de su pista, en
       oscuro.

       LO QUE SI SE MUEVE, y se declara en vez de ocultarse: la altura de
       documento de la home baja 31 px EXACTOS en los dos temas (claro
       6.727 -> 6.696, oscuro 16.297 -> 16.266). No es aleatorio ni es el
       sticky: un contenedor flex no colapsa los margenes de sus hijos, asi
       que un margen que antes se escapaba a traves del body ahora se queda
       dentro. El delta identico en las dos ramas confirma que es un solo
       margen, no un efecto disperso. 31 px sobre 16.266 es un 0,19 % y el
       resultado es mas predecible que el anterior, no menos.

       SIN BACKTICKS: esto vive dentro del template literal de
       styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: ${({ theme }) => theme.data.semantic.bg};
    /* La tipografia del sitio se declara AQUI, en body, y no solo en
       body > main (donde vivio hasta el 2026-08-17): con ella scoped a main,
       todo lo que vive FUERA de main --navbar, hoja de navegacion, footer--
       caia al serif por defecto del navegador (Times New Roman computado,
       medido en el build de produccion sobre una fila de la hoja movil
       mientras un parrafo de main daba Hanken Grotesk). Tres rondas de
       critica externa midieron tipografia siempre DENTRO de main y ninguna
       lo vio; lo destapo la captura del footer de la 404. El bloque de
       body > main conserva su propia declaracion (redundante pero inocua)
       porque su docblock y sus candados razonan sobre ese bloque entero. */
    font-family: ${({ theme }) => theme.data.type.fontBody};
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    /* WCAG 1.4.4, critica externa #19: el porque completo, con las medidas,
       en el docblock que precede a este createGlobalStyle. */
    overflow-wrap: anywhere;
  }

  /* La mitad que hace el trabajo: sin esto el body seria alto pero el pie
     seguiria pegado al contenido. main crece hasta ocupar el sobrante y
     empuja el pie al borde inferior. En las paginas cuyo contenido YA pasa
     del viewport --la home, las legales-- no hay sobrante que repartir y la
     regla no cambia nada. */
  body > main {
    flex: 1;
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

  /*
   * Anti-flash de tema (Task 9). Reglas ESTÁTICAS, sin interpolar
   * theme.data.*: a diferencia de todo lo demás en este fichero, su texto
   * NO cambia según el prop theme que reciba GlobalStyles en cada render,
   * así que quedan presentes DESDE EL BUILD (idénticas en el HTML estático
   * horneado, sea cual sea el tema con el que arrancó ese build) y en cada
   * re-render posterior. El script inline de app/layout.tsx
   * (buildThemeBootstrapScript, src/theme/resolveTheme.ts) fija el
   * atributo data-theme=dark en el elemento html ANTES del primer pintado,
   * así que estas reglas ya están activas en el primer frame -- sin
   * esperar a que React monte, hidrate ni corrija nada.
   *
   * ThemeProvider SIGUE arrancando su estado de React en "light" (no puede
   * leer localStorage durante el render sin romper el export estático ni
   * arriesgar un mismatch de hidratación en las secciones que ramifican
   * por tema -- Story/Features/Journey/Contact). Estas reglas no sustituyen
   * esa corrección: la hacen invisible, porque cuando el efecto
   * post-montaje de ThemeProvider por fin corrige el estado, el resultado
   * visual YA coincide con lo que estas reglas venían pintando desde el
   * primer frame.
   *
   * Especificidad deliberada: el selector data-theme=dark de :root
   * combinado con body tiene MÁS especificidad que el simple "body { }" de
   * arriba (dos selectores de atributo/pseudo-clase más el tipo, contra
   * solo el tipo), así que gana SIEMPRE que el atributo esté presente, sea
   * cual sea el orden de inserción real de las dos reglas en la hoja de
   * estilos.
   *
   * semanticDark se importa DIRECTO del token (no de theme.data.semantic,
   * que solo resuelve al tema activo del render): es el MISMO primitivo
   * que ya usa el resto del tema oscuro, no un hex reescrito a mano (regla
   * 17, RULES.md).
   */
  :root[data-theme="dark"] body {
    background-color: ${semanticDark.bg};
    color: ${semanticDark.text};
  }

  /*
   * Task 9, misma mecánica que arriba pero para las ÚNICAS propiedades de
   * Hero que cambian TAMAÑO/POSICIÓN (no solo color) entre temas --
   * confirmado como la causa del CLS 0,0799 medido en el arranque oscuro de
   * escritorio (baseline spec 3.1): un único shift a t=400ms sobre el texto
   * de BrandName, el elemento LCP de esa medición. Hero.tsx
   * (ScHero/ScCopy/ScActions/ScHeroBrand) lee estas variables con
   * var(--x, valor-claro): el fallback ES el valor que el build hornea por
   * defecto (ThemeProvider arranca en "light"), así que un visitante sin
   * JS -- el script nunca fija el atributo -- ve EXACTAMENTE el mismo
   * resultado que antes de esta tarea. Solo esta rama, activa desde antes
   * del primer pintado, redefine las variables al valor oscuro.
   *
   * Las demás ramas de Hero por tema (texto, sombra, fondo del pie) NO
   * están aquí a propósito: son opacidad/color, no geometría -- no
   * contribuyen a CLS -- y su fundido al cambiar de tema sigue siendo
   * intencional (docblock de HeroBackdrop.tsx). Sacarlas de React habría
   * apagado esa animación sin necesidad.
   */
  :root[data-theme="dark"] {
    color-scheme: dark;

    --hero-title-vw: 8vw;
    --hero-align-items-lg: center;
    --hero-justify-lg: flex-end;
    --hero-text-align-lg: center;
    /* Mismo tope de columna que Hero.tsx, hoy leído del token en vez de
       reescrito (crítica externa #10, 2026-08-18). Se importa DIRECTO de
       tokens/grid.ts, no vía theme.data: esta regla tiene que existir en el
       CSS horneado sea cual sea el tema del render, exactamente por el mismo
       motivo que semanticDark unas líneas más arriba. Aquí no hay min(...,
       70%) a propósito -- en la composición oscura la copia va centrada y no
       compite con la mano del arte (ver el docblock de ScCopy). */
    --hero-copy-maxwidth-lg: ${grid.heroCopyMax};
    --hero-actions-justify-lg: center;
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
     margen de scroll lo compensa sin tocar el layout.

     h3[id] entra en la lista desde el 2026-08-16, cuando los tres destinos de
     «Descubre» dejaron de apuntar todos a /#features y pasaron a apuntar cada
     uno a su propia tarjeta (src/config/navigation.ts). Esos destinos son los
     h3 con id="feature-...-title" que Features.tsx ya emitía, y sin este
     margen aterrizarían justo DEBAJO de la barra fija: el arreglo de
     navegación habría creado un defecto de layout. Son los UNICOS h3 con id
     del sitio (verificado contra el HTML construido), así que el selector no
     alcanza nada más.

     SIN BACKTICKS en este comentario, a proposito: vive DENTRO del template
     literal de styled-components, donde un backtick lo cierra y rompe el
     build (leccion del repo, task/lessons.md 2026-07-25). */
  :where(section[id], h3[id]) {
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

  /* ANILLO DE FOCO: ÚNICO PUNTO DE DECLARACIÓN DE TODO EL SITIO.
     Desde la crítica externa #14 (P1 de Craft, 2026-09-02) ningún componente
     declara anillo propio -- ni aditivo por box-shadow, ni sustitutivo con
     outline: none. La geometría sale de tokens/focus.ts (vía el bloque
     shared del tema) y el color del rol semantic.focus, que ya cambia por
     piel. El porqué completo -- los tres vocabularios que había, por qué
     gana el outline y qué se pierde -- vive en el docblock de
     src/theme/tokens/focus.ts, no se repite aquí. */
  :where(a, button, input, textarea, select, [tabindex]):focus-visible {
    outline: ${({ theme }) => theme.data.focusRing.width}
      ${({ theme }) => theme.data.focusRing.style}
      ${({ theme }) => theme.data.semantic.focus};
    outline-offset: ${({ theme }) => theme.data.focusRing.offset};
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
