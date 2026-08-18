/**
 * ANCLA DE LECTURA DEL CAMBIO DE TEMA: qué sección está leyendo la persona
 * en el instante del click, y dónde queda ESA MISMA sección después de que
 * las dos ramas de tema hayan re-maquetado la página entera.
 *
 * ## Por qué existe este módulo (el dato, no la intuición)
 *
 * Las cuatro secciones de la home ramifican VEHÍCULO por tema (tarjeta
 * acotada en claro contra deck de diapositivas a sangre en oscuro,
 * `DESIGN.md` §4), y un deck mide varias pantallas donde la tarjeta mide
 * una. Consecuencia medida, no supuesta:
 *
 * - Review final de rama, 2026-08-12 (`docs/qa-3d-pendiente.md`, entrada
 *   "Divergencia de longitud de scroll entre temas"): la home mide 5.827 px
 *   en claro contra 12.821 px en oscuro a 1280x720 (x2,20), y 9.255 contra
 *   14.877 en móvil 375x812 (x1,61). 8 de 8 escenarios de toggle REAL
 *   dejaban al lector en una sección distinta de la que estaba mirando.
 * - Crítica externa #8, 2026-08-17: el mismo defecto reportado por los tres
 *   evaluadores por separado, con la página de hoy (docH claro ~6.700 px,
 *   oscuro ~16.300 px): el punto de lectura pasa del 50 % del documento al
 *   18,4 %, y quien estaba en Features aterriza en Story.
 *
 * La causa raíz es geométrica y se enuncia en una línea: **el contenido que
 * queda POR ENCIMA del lector cambia de alto**, así que conservar el mismo
 * `scrollY` en píxeles absolutos (lo que hace el sitio desde la Task 17)
 * conserva la posición pero NO el contenido. La corrección exacta de ese
 * arrastre es la diferencia entre dónde empezaba la sección que se está
 * leyendo ANTES y dónde empieza DESPUÉS: eso, y solo eso, es lo que este
 * módulo calcula.
 *
 * ## Qué cuenta como ancla, y por qué se excluyen las secciones anidadas
 *
 * Ancla = `<section>` con `id` que NO vive dentro de otra `<section [id]>`.
 * El caso concreto que obliga a la exclusión es `#statement`: en la rama
 * clara es una sección hermana de `#story` (posición de documento estable,
 * ancla legítima), pero en la oscura es la última DIAPOSITIVA del deck de
 * Story (`Story.tsx`, `<ScSlide as="section" id="statement">`), es decir un
 * hijo de un `ScStage` con `position: sticky`. La caja de un elemento
 * pegado se mueve CON el scroll: su "top de documento" no es una propiedad
 * del documento sino del instante en que se mide, así que como ancla
 * mentiría. La regla estructural ("no anidada") describe exactamente esa
 * diferencia sin tener que preguntar por `position` computada.
 *
 * ## Criterio de dominancia, y por qué NO es el de `useActiveSection.ts`
 *
 * `useActiveSection` resuelve por CONTENCIÓN del centro del viewport (con
 * dominancia solo como respaldo para huecos, y empate hacia la sección de
 * más abajo — crítica #10; antes usaba "la última en orden de página con
 * cualquier solape", que se adelantaba desde el primer píxel del vecino):
 * alimenta `aria-current` y responde "¿en qué sección ESTÁ el lector?".
 * Este módulo responde otra pregunta: "¿a qué sección le debo el MENOR
 * desplazamiento correctivo?" — en la franja de transición, con la
 * saliente ocupando el 90 % de la pantalla, anclar a la entrante mandaría
 * al lector al principio de una sección que todavía no está leyendo, un
 * salto de casi un viewport. Un reposicionamiento CORRECTIVO quiere el
 * desplazamiento mínimo, así que aquí gana la sección con MÁS superficie
 * visible (y el empate exacto cae del lado contrario, `>` vs `>=`, también
 * a propósito). Los dos módulos preguntan cosas distintas con la misma
 * palabra; no se comparte la función a propósito, y esta nota es el enlace
 * entre ambas.
 */

/** Selector único de ancla. Se declara aquí (y no en el hook que lo consume)
 *  porque la definición de "ancla" es de este módulo. */
export const SECTION_ANCHOR_SELECTOR = "section[id]";

/** Geometría mínima de una sección, medida contra el viewport (`rect.top`
 *  y `rect.height` tal cual los devuelve `getBoundingClientRect`). */
export interface SectionViewportGeometry {
  readonly id: string;
  readonly top: number;
  readonly height: number;
}

/**
 * `id` de la sección que ocupa MÁS superficie vertical del viewport, o
 * `null` si ninguna lo interseca (el lector está en un tramo sin ancla).
 *
 * Empate exacto: gana la PRIMERA en el orden en que llegan (el del
 * documento, tal como las entrega `querySelectorAll`), porque la
 * comparación es estrictamente mayor. Es la elección conservadora para un
 * reposicionamiento: ante dos candidatas idénticas, quedarse con la que el
 * lector lleva más rato viendo mueve menos que saltar a la siguiente.
 */
export function dominantSectionId(
  sections: readonly SectionViewportGeometry[],
  viewportHeight: number,
): string | null {
  let bestId: string | null = null;
  let bestVisible = 0;

  for (const section of sections) {
    const visible =
      Math.min(section.top + section.height, viewportHeight) -
      Math.max(section.top, 0);
    if (visible > bestVisible) {
      bestVisible = visible;
      bestId = section.id;
    }
  }

  return bestId;
}

/** Entrada de `anchoredScrollY`: todo en coordenadas de DOCUMENTO salvo
 *  `viewportHeight`, para que la función no tenga que saber nada de scroll
 *  actual mientras la calcula. */
export interface AnchoredScrollInput {
  /** `window.scrollY` en el instante del click. */
  readonly scrollYBefore: number;
  /** Top de documento del ancla ANTES del cambio de tema. */
  readonly anchorTopBefore: number;
  /** Top de documento de la MISMA ancla tras el re-maquetado. */
  readonly anchorTopAfter: number;
  /** Alto del ancla ANTES del cambio de tema. Solo se usa para saber si la
   *  sección encogió -- ver el techo en el docblock de `anchoredScrollY`. */
  readonly anchorHeightBefore: number;
  /** Alto del ancla tras el re-maquetado. */
  readonly anchorHeightAfter: number;
  readonly viewportHeight: number;
  /**
   * `false` cuando el ancla capturada dejó de ser un ancla válida en la
   * rama nueva y se cayó a su sección contenedora (caso `#statement`, ver
   * el docblock de cabecera): el desplazamiento DENTRO de la vieja no
   * significa nada dentro de la nueva, así que se aterriza en su inicio.
   */
  readonly preserveOffset: boolean;
}

/**
 * `scrollY` al que hay que saltar para que el lector siga viendo la misma
 * sección, en el mismo punto de ella que estaba leyendo.
 *
 * Conserva el DESPLAZAMIENTO DENTRO DE LA SECCIÓN (`scrollY - topAntes`) en
 * vez de aterrizar siempre en su inicio, por dos motivos medibles:
 *
 * 1. Cuando la sección no se movió (el caso de Story, primera tras un hero
 *    que mide lo mismo en los dos temas), el desplazamiento conservado hace
 *    que la cuenta dé EXACTAMENTE el `scrollY` de partida -- corrección
 *    cero. Aterrizar siempre en el inicio introduciría un tirón nuevo justo
 *    donde hoy no hay ningún defecto.
 * 2. Cuando sí se movió, el resultado equivale a `scrollY + (topDespués -
 *    topAntes)`: se compensa el arrastre exacto que causó el defecto, ni un
 *    píxel más.
 *
 * El techo `alto - viewport` cubre el sentido contrario (la sección ENCOGE
 * al cambiar de tema, oscuro -> claro): sin él, un desplazamiento de 4.000
 * px heredado de un deck se saldría por el final de la tarjeta que lo
 * sustituye y volvería a dejar al lector en otra sección. Con la sección
 * más corta que el viewport el techo resuelve a 0, que es su inicio.
 *
 * SOLO SE APLICA SI LA SECCIÓN ENCOGIÓ, y esa condición no es cosmética:
 * un techo incondicional rompe la propiedad (1) para cualquier sección que
 * mida EXACTAMENTE un viewport, que es el caso del hero (`min-height:
 * 100dvh`). Con `alto - viewport = 0`, un lector 200 px dentro del hero
 * -- que sigue siendo la sección dominante -- saltaría a `top: 0` al
 * cambiar de tema aunque el hero mida lo mismo en las dos ramas y nada se
 * hubiera movido: exactamente el "vuelve al principio" que la Task 17
 * retiró, reintroducido por una aritmética demasiado prudente. Si la
 * sección creció o mide lo mismo, el desplazamiento capturado sigue siendo
 * válido por construcción y no hay nada que recortar.
 *
 * NO HAY SUELO, y esa ausencia es una decisión, no un olvido: el
 * desplazamiento capturado puede ser NEGATIVO con toda normalidad --
 * significa que la sección dominante empieza por debajo del borde superior
 * del viewport, que es el estado de cualquier franja de transición entre
 * dos secciones. Recortarlo a 0 "por prudencia" rompería la propiedad más
 * importante de esta función: que con el ancla inmóvil la cuenta devuelva
 * EXACTAMENTE el `scrollY` de partida. Con un suelo en 0, un lector parado
 * en esa franja recibiría un tirón de hasta un viewport entero al cambiar
 * de tema aunque nada se hubiera movido -- un defecto nuevo, del mismo
 * tamaño que el que esta función existe para arreglar. Un negativo no se
 * puede desbocar: si la sección domina el viewport, su inicio nunca está
 * más de una pantalla por debajo del borde superior.
 */
export function anchoredScrollY(input: AnchoredScrollInput): number {
  const {
    scrollYBefore,
    anchorTopBefore,
    anchorTopAfter,
    anchorHeightBefore,
    anchorHeightAfter,
    viewportHeight,
    preserveOffset,
  } = input;

  if (!preserveOffset) return Math.max(0, anchorTopAfter);

  const rawOffset = scrollYBefore - anchorTopBefore;
  const shrank = anchorHeightAfter < anchorHeightBefore;
  const offset = shrank
    ? Math.min(rawOffset, Math.max(0, anchorHeightAfter - viewportHeight))
    : rawOffset;

  return Math.max(0, anchorTopAfter + offset);
}

/** Lo que hay que recordar del instante del click para poder corregir
 *  después. Todo son números y un `id`: NUNCA una referencia al elemento,
 *  que el cambio de rama de tema puede desmontar y volver a montar. */
export interface ReadingAnchor {
  readonly id: string;
  readonly topDoc: number;
  readonly height: number;
  readonly scrollY: number;
}

function isTopLevelSectionAnchor(el: Element): boolean {
  if (el.id === "") return false;
  const parent = el.parentElement;
  return parent === null || parent.closest(SECTION_ANCHOR_SELECTOR) === null;
}

/**
 * Sección que domina el viewport AHORA, con su posición de documento.
 * `null` si ninguna ancla interseca el viewport (el lector está en un tramo
 * sin sección: la 404, o cualquier página que no monte ninguna).
 *
 * Se llama DENTRO de un manejador de click, nunca durante el render: lee
 * `getBoundingClientRect`/`window.scrollY`, y leer geometría en render
 * rompe el export estático (mismo motivo que ya documenta
 * `useThemeScrollReset.ts` para `willCrossfade`).
 */
export function captureReadingAnchor(): ReadingAnchor | null {
  const anchors = Array.from(
    document.querySelectorAll<HTMLElement>(SECTION_ANCHOR_SELECTOR),
  ).filter(isTopLevelSectionAnchor);

  const geometries: SectionViewportGeometry[] = anchors.map((el) => {
    const rect = el.getBoundingClientRect();
    return { id: el.id, top: rect.top, height: rect.height };
  });

  const id = dominantSectionId(geometries, window.innerHeight);
  if (id === null) return null;

  const dominant = geometries.find((geometry) => geometry.id === id);
  if (dominant === undefined) return null;

  const scrollY = window.scrollY;
  return {
    id,
    topDoc: dominant.top + scrollY,
    height: dominant.height,
    scrollY,
  };
}

/** Resultado de volver a encontrar el ancla tras el re-maquetado.
 *  `exact: false` significa "esta ya no es un ancla válida y se cayó a su
 *  contenedora" -- ver `preserveOffset` en `AnchoredScrollInput`. */
interface ResolvedAnchor {
  readonly el: HTMLElement;
  readonly exact: boolean;
}

function resolveAnchorElement(id: string): ResolvedAnchor | null {
  const el = document.getElementById(id);
  if (el === null) return null;
  if (isTopLevelSectionAnchor(el)) return { el, exact: true };

  const container =
    el.parentElement?.closest<HTMLElement>(SECTION_ANCHOR_SELECTOR) ?? null;
  return container === null ? null : { el: container, exact: false };
}

/**
 * Devuelve al lector a su ancla tras el re-maquetado, o `false` si no hubo
 * nada que corregir (el valor de retorno existe para que el consumidor
 * pueda distinguir "no hacía falta" de "no se pudo", y para poder aseverar
 * la ausencia de salto sin espiar `scrollTo`).
 *
 * `behavior: "instant"`, NUNCA `"auto"` y mucho menos `"smooth"`: esto es
 * una corrección de posición, no un viaje que el lector haya pedido -- y
 * `"auto"` no serviría, porque resuelve al `scroll-behavior` computado del
 * elemento de scroll, que en este sitio es `smooth` para todo el mundo
 * salvo bajo `prefers-reduced-motion` (`GlobalStyles.tsx`, `html { scroll-
 * behavior: smooth }`). Un reposicionamiento animado de hasta 10.000 px
 * sería precisamente el defecto que la Task 17 midió y retiró.
 *
 * Bajo `prefers-reduced-motion: reduce` NO se hace nada distinto y es
 * correcto: un salto instantáneo no es una animación, y la alternativa
 * (dejar al lector desplazado) le costaría exactamente igual que a
 * cualquier otro. La preferencia pide quitar movimiento, no quitar
 * corrección.
 *
 * Umbral de 1 px para no llamar a `scrollTo`: por debajo de un píxel la
 * corrección no es observable y sí lo es su coste (un evento `scroll`
 * sintético que despierta a `useScrolled`/`useNavDetach`/`BackToTop`). Es
 * también el camino del lector que está en el Hero -- el hero mide lo mismo
 * en los dos temas, así que su ancla no se mueve y la cuenta da 0.
 */
export function restoreReadingAnchor(anchor: ReadingAnchor): boolean {
  const resolved = resolveAnchorElement(anchor.id);
  if (resolved === null) return false;

  const rect = resolved.el.getBoundingClientRect();
  const target = anchoredScrollY({
    scrollYBefore: anchor.scrollY,
    anchorTopBefore: anchor.topDoc,
    anchorTopAfter: rect.top + window.scrollY,
    anchorHeightBefore: anchor.height,
    anchorHeightAfter: rect.height,
    viewportHeight: window.innerHeight,
    preserveOffset: resolved.exact,
  });

  if (Math.abs(target - window.scrollY) < 1) return false;

  window.scrollTo({ top: target, behavior: "instant" });
  return true;
}
