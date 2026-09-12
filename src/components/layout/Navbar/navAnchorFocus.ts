import type { NavItem } from "@/config/navigation";

/**
 * Foco en el destino de un ancla de navegación (crítica externa #8, punto 3).
 *
 * EL DEFECTO QUE CIERRA, medido y no teórico. La entrega del 2026-08-16 separó
 * los tres destinos de «Descubre» (`/#feature-learning-title`,
 * `/#feature-imagination-title`, `/#feature-gaming-title`) para que tres
 * etiquetas distintas dejaran de caer en el mismo sitio. Eso arregla el modelo,
 * pero no la PERCEPCIÓN en la rama clara: ahí las tarjetas de Features están
 * una al lado de otra, así que `feature-imagination-title` y
 * `feature-gaming-title` resuelven al MISMO píxel de scroll (4354, medido). El
 * lector llega, la página se queda quieta en el mismo sitio para dos enlaces
 * distintos, y nada le dice a cuál de los dos ha llegado.
 *
 * El scroll no puede distinguirlos -- comparten posición -- así que la señal
 * tiene que venir por otro canal: EL FOCO. Moverlo al titular de destino
 * (a) hace que un lector de pantalla anuncie ese titular concreto y su nivel,
 * (b) deja el anillo de `:focus-visible` del tema sobre la tarjeta correcta
 * para quien navega por teclado, y (c) fija ahí el punto de partida de la
 * siguiente tabulación, en vez de dejarlo donde estaba el menú.
 *
 * `preventScroll: true` NO es cosmético: sin él, `focus()` arrastra el
 * elemento al viewport de golpe en el mismo instante en que el navegador está
 * empezando su desplazamiento suave hacia el ancla (`scroll-behavior: smooth`,
 * `GlobalStyles`) -- el salto brusco pisaría justo el movimiento que la página
 * acaba de arrancar. Con el flag, el foco se mueve sin tocar el scroll y el
 * navegador sigue haciendo su trabajo.
 *
 * POR QUÉ NO BASTA CON EL NAVEGADOR. El algoritmo de "scroll to the fragment"
 * de HTML sí ejecuta los pasos de foco sobre el destino, así que en un motor
 * real el `tabIndex={-1}` de los titulares (`Features.tsx`) haría parte de
 * este trabajo por su cuenta. Se hace explícito de todas formas por dos
 * motivos: el orden respecto al cierre del panel/hoja queda bajo control de
 * este código en vez de depender de en qué momento el navegador procese la
 * navegación, y jsdom no implementa navegación por fragmento en absoluto -- sin
 * esta llamada, la propiedad no tendría ningún candado posible en la suite.
 *
 * Ese mismo algoritmo explica además por qué las SECCIONES se quedaban sin
 * foco pese a desplazarse bien: sus pasos solo enfocan un destino que YA sea
 * focalizable, y un `<section>` sin `tabindex` no lo es -- el navegador
 * desplaza, resetea el foco al `<body>` y sigue. Ver la nota de ampliación
 * de más abajo.
 */

/**
 * AMPLIACIÓN A LAS SECCIONES (crítica externa #9, punto 1), medida por dos
 * evaluadores por separado y en las TRES superficies: pulsar «Historia»
 * (`/#story`, desde el navbar o desde el pie) desplazaba el viewport pero
 * dejaba `document.activeElement` en `<body>`. La entrega anterior solo
 * cubrió `kind: "feature"`, con el argumento de que una sección entera «ya es
 * distinguible por sí sola porque llega una pantalla distinta». Ese argumento
 * describe lo que ve quien MIRA la pantalla, no lo que recibe quien navega
 * por teclado o con lector de pantalla: para ellos el salto no ocurrió (nada
 * se anuncia, la siguiente tabulación sigue partiendo del menú, y con el menú
 * ya cerrado el punto de partida es el principio del documento). Desde aquí,
 * TODO destino dentro de la página mueve el foco -- secciones y tarjetas --
 * y `kind: "external"` sigue fuera por definición: sale del documento.
 *
 * ## Qué elemento se enfoca en una sección: el del `id`, nunca su `<h2>`
 *
 * Las cuatro secciones declaran su `id` en el `<section>` y su título en un
 * `<h2 id="<key>-title">` al que ese `<section>` apunta con `aria-labelledby`
 * (verificado leyendo `Story.tsx`, `Journey.tsx`, `Features.tsx` y
 * `Contact.tsx`, no de memoria). El titular parece el destino "fino" y sería
 * el equivalente exacto del `<h3>` que ya usan las tarjetas -- y es la opción
 * INCORRECTA aquí, por una razón medida y ya pagada en este repo: en la rama
 * OSCURA ese `<h2>` vive dentro de una diapositiva del deck, y las
 * diapositivas en reposo son `visibility: hidden` (lección del 2026-08-12,
 * hallazgo A1 de la fix wave A). Un elemento con `visibility: hidden` NO es
 * focalizable: el `focus()` se descartaría en silencio y el defecto volvería,
 * ahora de forma intermitente -- según en qué diapositiva estuviera el deck
 * en ese instante --, que es peor que no arreglarlo. El `<section>` está
 * siempre visible en las dos ramas.
 *
 * Además es el elemento que el propio fragmento de la URL identifica (foco y
 * URL dicen lo mismo) y, al llevar nombre accesible por `aria-labelledby`,
 * es un landmark `region`: un lector de pantalla anuncia el nombre de la
 * sección a la que se acaba de llegar, que es exactamente la información que
 * faltaba.
 *
 * ## Por qué el `tabindex` se pone aquí y no en cada sección
 *
 * Un `<section>` no es focalizable por sí solo. Ponerle `tabIndex={-1}` en el
 * JSX de las cuatro secciones sería el gesto habitual (es lo que ya hacen
 * `#main` para el enlace de salto y los `<h3>` de las tarjetas), pero
 * repartiría en cuatro ficheros ajenos una condición que solo esta función
 * necesita, sin nada que impida que la quinta sección nazca sin ella. Puesto
 * aquí, con `setAttribute`, la propiedad se cumple para CUALQUIER destino de
 * ancla del modelo, exista o no una declaración propia en el destino.
 *
 * `hasAttribute("tabindex")` antes de escribir: un destino que YA declara el
 * suyo (los `<h3>` de `Features.tsx`, `tabIndex={-1}`) no se toca -- y si
 * alguno declarara un valor positivo a propósito, este código no lo
 * sobrescribe. El atributo NO se retira después: `tabindex="-1"` no mete al
 * elemento en el orden de tabulación (solo lo hace focalizable por
 * programación), así que quitarlo al perder el foco costaría un listener por
 * navegación a cambio de ningún efecto observable.
 */

/**
 * `id` del elemento al que apunta un item de navegación, o `null` si el item
 * no es un destino de ancla dentro de la página.
 *
 * `kind: "external"` es el único excluido: su `href` es una URL completa a
 * otro sitio, y su `#` -- si lo tuviera -- pertenece a ese otro documento.
 */
export function navAnchorTargetId(item: NavItem): string | null {
  if (item.kind === "external") return null;
  const hashIndex = item.href.indexOf("#");
  if (hashIndex === -1) return null;
  const id = item.href.slice(hashIndex + 1);
  return id === "" ? null : id;
}

/**
 * Mueve el foco al destino de `item`, si lo tiene y si ese destino existe en
 * el documento actual.
 *
 * Silencioso cuando no hay nada que enfocar, y ese caso es real, no defensivo:
 * las tres superficies que consumen `NAV_GROUPS` (`Navbar`, `NavSheet`,
 * `Footer`) se montan en TODAS las páginas, y fuera de la home el `href`
 * `/#story` es una navegación a otro documento -- el elemento no existe aquí,
 * y el foco lo resuelve la carga de la página destino.
 */
export function focusNavAnchorTarget(item: NavItem): void {
  const id = navAnchorTargetId(item);
  if (id === null) return;
  const target = document.getElementById(id);
  if (target === null) return;
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}
