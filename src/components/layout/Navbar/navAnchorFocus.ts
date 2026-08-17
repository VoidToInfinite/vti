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
 */

/**
 * `id` del elemento al que apunta un item de navegación, o `null` si el item
 * no es un destino de ancla dentro de la página.
 *
 * Solo `kind: "feature"`: son los únicos cuyo destino es un elemento CONCRETO
 * dentro de una sección (el `<h3>` de una tarjeta). Los `kind: "section"`
 * apuntan a la sección entera, que ya es distinguible por sí sola -- llega con
 * una pantalla distinta -- y cuyo `<section id>` no es focalizable ni tiene por
 * qué serlo. Los `kind: "external"` salen del documento.
 */
export function navAnchorTargetId(item: NavItem): string | null {
  if (item.kind !== "feature") return null;
  const hashIndex = item.href.indexOf("#");
  if (hashIndex === -1) return null;
  const id = item.href.slice(hashIndex + 1);
  return id === "" ? null : id;
}

/**
 * Mueve el foco al titular de destino de `item`, si lo tiene y si ese destino
 * existe en el documento actual.
 *
 * Silencioso cuando no hay nada que enfocar, y ese caso es real, no defensivo:
 * las tres superficies que consumen `NAV_GROUPS` (`Navbar`, `NavSheet`,
 * `Footer`) se montan en TODAS las páginas, y fuera de la home el `href`
 * `/#feature-learning-title` es una navegación a otro documento -- el elemento
 * no existe aquí, y el foco lo resuelve la carga de la página destino.
 */
export function focusNavAnchorTarget(item: NavItem): void {
  const id = navAnchorTargetId(item);
  if (id === null) return;
  document.getElementById(id)?.focus({ preventScroll: true });
}
