"use client";
import { useSyncExternalStore } from "react";
import { NAV_GROUPS } from "@/config/navigation";

/**
 * IDs de sección que participan en el resaltado de navegación activa
 * (Tarea 1, navegación accesible): los mismos `key` de los items
 * `kind: "section"` del grupo `onSite` de `NAV_GROUPS` -- que además son
 * el `id` real de cada `<section>` de la home (`id="story"` en `Story.tsx`,
 * y lo mismo en `Journey.tsx`/`Features.tsx`/`Contact.tsx`/`About.tsx`). Las
 * cuatro primeras son además el `cssVarPrefix` con el que cada una llama a
 * `useSectionProgress` (`useSectionProgress(ref, { cssVarPrefix: "story" })`,
 * etc.); `about` no llama a ese hook y por tanto no escribe `data-inview` --
 * ver "TERCERA CLASE DE SECCIÓN" en el docblock de `resolveActiveKey`, más
 * abajo, para cómo se resuelve eso. Derivarla
 * del propio modelo de navegación en vez de repetirla como array literal es
 * la misma invariante que la regla 13 de `RULES.md`: si `onSite` gana o
 * pierde una sección, este módulo la sigue sin que nadie tenga que
 * acordarse de una segunda lista.
 */
const ACTIVE_SECTION_IDS: readonly string[] = (
  NAV_GROUPS.find((group) => group.key === "onSite")?.items ?? []
)
  .filter((item) => item.kind === "section")
  .map((item) => item.key);

let activeKey: string | null = null;
let subscriberCount = 0;
const listeners = new Set<() => void>();
let sectionMutationObserver: MutationObserver | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

/*
 * `evaluate()` NO crea ningún `IntersectionObserver` propio (regla del
 * brief de la Tarea 1: "Detección por el motor existente -- reutilizar, no
 * crear un observer nuevo"). `useSectionProgress` ya monta UN
 * `IntersectionObserver` por cada una de las cuatro secciones de la home
 * (Story/Journey/Features/Contact) y ya escribe `dataset.inview`
 * ("true"/"false") directamente sobre el elemento de esa sección en cada
 * frame de su propio bucle de rAF (ver `src/hooks/useSectionProgress.ts`).
 * Este módulo se limita a LEER esa señal ya calculada; no vuelve a medir
 * ninguna geometría de scroll por su cuenta.
 *
 * Más de una sección puede tener `data-inview="true"` a la vez, y de hecho
 * es lo normal: el `IntersectionObserver` de `useSectionProgress` usa el
 * `threshold` por defecto (0), así que "dentro" es cualquier solape mayor
 * que cero. `data-inview` es por tanto el FILTRO de candidatas de este
 * módulo, no su respuesta: quién gana ENTRE las candidatas lo decide la
 * geometría, con la regla que documenta `resolveAmongCandidates()` más
 * abajo (reescrita el 2026-08-18 por la crítica externa #10; hasta esa
 * fecha ganaba la última en el orden de la página, y ahí estaba el fallo).
 *
 * FIX WAVE A, hallazgo A2 (revisión final de rama). Bajo
 * `prefers-reduced-motion: reduce`, `useSectionProgress.stopForReduced()`
 * escribe `data-inview="true"` de forma INCONDICIONAL en las CUATRO
 * secciones a la vez (ver su JSDoc: "el consumidor debe quedar visible y
 * quieto exista o no una interseccion previa") y desconecta su propio
 * observer -- una decisión correcta para SU consumidor (un parallax
 * inmóvil no tiene "dentro/fuera de pantalla" que describir bajo `reduce`,
 * así que se queda fijo en el estado "ya colocada"). Pero la lectura de
 * arriba ("gana la ÚLTIMA con `data-inview=true`") asume que esa señal
 * significa "visible AHORA", y bajo `reduce` deja de significarlo: con las
 * CUATRO secciones en `true` de forma permanente, la última del orden de
 * página (`contact`) ganaba SIEMPRE, sin importar dónde estuviera el
 * scroll real -- `aria-current="location"` quedaba clavado en "Contacto"
 * para cualquier visitante con `reduce` activado, en el panel de escritorio
 * Y en la hoja móvil. Es información FALSA anunciada a lectores de
 * pantalla, más grave que no anunciar nada, y afecta desproporcionadamente
 * a quien más depende de tecnología asistiva.
 *
 * Arreglo elegido (de las dos opciones razonables -- resolver por geometría
 * real, o devolver `null` sin más -- se prefiere la primera): bajo `reduce`
 * se ignora `data-inview` por completo y se resuelve con
 * `getBoundingClientRect()` sobre las mismas cuatro secciones, con la MISMA
 * regla de resolución que el camino normal (`resolveAmongCandidates`, ver su
 * docblock): lo único que cambia entre los dos caminos es de dónde salen las
 * candidatas -- de la señal ya calculada, o de la geometría medida aquí --,
 * nunca cómo se decide entre ellas. Se prefiere a devolver `null` porque el
 * usuario con `reduce` activado sigue navegando por scroll con normalidad
 * -- solo el PARALLAX está inmóvil, no la página -- así que apagar
 * `aria-current` del todo para este grupo de visitantes sería perder la
 * función completa por una limitación de un consumidor DISTINTO
 * (`useSectionProgress`) que no aplica aquí. El coste (un
 * `getBoundingClientRect` por sección en cada `scroll`/`resize`) es barato
 * porque ni `reduce` ni el scrollspy corren a 60fps: se paga solo en los
 * eventos discretos que este mismo módulo ya escuchaba.
 */
/**
 * Defensivo ante `typeof window.matchMedia !== "function"` (jsdom SIN stub):
 * a diferencia de `useSectionProgress`/`useSlideDeck` -- hooks que solo monta
 * la sección concreta que los usa, con un puñado de ficheros de test que ya
 * saben que necesitan el stub -- este módulo es un SINGLETON que arranca
 * desde `useActiveSectionKey()`, y hoy lo llaman tanto `Navbar.tsx` (panel de
 * escritorio) como `NavSheet.tsx` (hoja móvil): cualquier test de CUALQUIER
 * parte del repo que renderice `<Navbar />` sin stubar `matchMedia` pasaría a
 * fallar por una rama nueva que ni siquiera ejercita a propósito. Sin
 * `matchMedia` disponible se asume "no reduce" -- exactamente el
 * comportamiento de ANTES de este arreglo (fix wave A, A2) para cualquier
 * entorno que no declare la preferencia.
 */
function isReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Mismo criterio de "está en el viewport" que exige un solape > 0 contra
 *  `rect.top`/`rect.bottom` -- el mismo umbral implícito (threshold 0) que
 *  ya usa el `IntersectionObserver` por defecto de `useSectionProgress` en
 *  el camino normal. Es lo que hace que el camino por geometría produzca
 *  EXACTAMENTE el mismo conjunto de candidatas que `data-inview` marcaría en
 *  el normal, y por tanto que la regla de resolución
 *  (`resolveAmongCandidates`) dé la misma respuesta en los dos. */
function intersectsViewport(rect: DOMRect): boolean {
  return rect.top < window.innerHeight && rect.bottom > 0;
}

/**
 * Criterio con el que se DESCARTA una candidata del camino normal (crítica
 * externa #14): no "¿interseca?", sino "¿hay evidencia de que NO?".
 *
 * Es a propósito más débil que `intersectsViewport` -- su negación, no su
 * complemento. Descartar exige que la geometría sitúe la sección entera por
 * encima (`bottom < 0`) o entera por debajo (`top > vh`) del viewport; el
 * borde exacto y la caja degenerada se conservan. Los dos casos que esa
 * diferencia protege son reales:
 *
 * - El BORDE EXACTO (`top === vh`, cero píxeles de solape). El
 *   `IntersectionObserver` real lo cuenta como `isIntersecting: true` -- medido
 *   en Chrome en este repo, ver `SETTLE_TOLERANCE_PX` en
 *   `useSectionProgress.ts` --, así que la señal es correcta ahí y descartarla
 *   sería contradecir al motor que la escribe.
 * - La CAJA SIN LAYOUT (todo a cero). No es evidencia de nada: es lo que
 *   devuelve `getBoundingClientRect()` en cualquier entorno que no haga layout
 *   -- jsdom, donde vive la suite entera de este repo, y la ventana entre el
 *   montaje y el primer layout en el navegador. Con el criterio estricto,
 *   cualquier candidata quedaría descartada ahí por no haberse medido todavía,
 *   y el camino normal dejaría de existir en toda la suite sin que nadie lo
 *   notara.
 *
 * Lo que sí caza es exactamente el defecto medido: un `data-inview="true"`
 * fosilizado en una sección que quedó muy lejos del viewport.
 */
function clearlyOutsideViewport(rect: DOMRect): boolean {
  return rect.bottom < 0 || rect.top > window.innerHeight;
}

/*
 * DOS CAMINOS PARA UNA MISMA PREGUNTA, y la condición que elige entre ellos
 * es la parte que hay que entender antes de tocar nada aquí.
 *
 * Camino normal: leer `data-inview`, la señal que el `IntersectionObserver`
 * de `useSectionProgress` ya calculó (ver el docblock de `evaluate()`, más
 * arriba: "reutilizar, no crear un observer nuevo").
 *
 * Camino por geometría: `getBoundingClientRect()` sobre las mismas cuatro
 * secciones, con el MISMO criterio de desempate. Nació en la fix wave A (A2)
 * como camino exclusivo de `prefers-reduced-motion` y se llamaba
 * `resolveActiveKeyReduced`; desde el ítem 16 del QA visual tiene un SEGUNDO
 * motivo que no tiene nada que ver con `reduce`, así que ya no lleva ese
 * nombre.
 *
 * QA §6, hallazgo derivado del ítem 16 (2026-08-15): EN EL TEMA OSCURO ESTE
 * MÓDULO NO RESALTABA NADA, NUNCA.
 *
 * Medido en navegador sobre build de producción, 25 posiciones a lo largo de
 * los 16.297 px de la página oscura: `aria-current="location"` era `null` en
 * los cuatro enlaces de sección en LAS 25, y no había ni un solo elemento con
 * `data-inview` en ninguna. En claro el mismo barrido seguía al scroll sin
 * fallar (`#story` → `#journey` → `#features` → `#contact`).
 *
 * CAUSA RAÍZ, y es de reparto de responsabilidades, no de un bug puntual:
 * `data-inview` lo escribe `useSectionProgress`, y ese hook lo montan los
 * componentes de la rama CLARA (`JourneyLight`, `Features` claro, `Contact`).
 * La rama oscura usa `useSlideDeck`, que no escribe ese atributo -- ni tiene
 * por qué: describe el progreso de un deck, no una intersección. La señal que
 * este módulo lee sencillamente NO EXISTE en ese árbol, así que el camino
 * normal devolvía `null` en todas las posiciones y nadie lo había notado
 * porque `null` es también la respuesta legítima cuando el lector está en el
 * Hero.
 *
 * No era incumplimiento WCAG (`aria-current` refuerza la navegación; su
 * ausencia no la rompe, y anunciar la sección EQUIVOCADA -- lo que arregló la
 * fix wave A -- es peor que no anunciar ninguna), pero sí una asimetría entre
 * ramas que nadie había declarado, y justo en la rama que la decisión D-C
 * convierte en el camino por defecto de una primera visita con el sistema en
 * oscuro.
 *
 * ARREGLO: cuando la señal no existe en el árbol, se resuelve por geometría
 * con la función de arriba -- exactamente el mismo mecanismo, la misma regla
 * de resolución y el mismo coste que el camino de `reduce` ya validó, sin un
 * `IntersectionObserver` nuevo ni un hook nuevo en la rama oscura. Los
 * listeners de `scroll`/`resize` que ese camino necesita ya estaban
 * registrados.
 *
 * SE MIRA LA PRESENCIA DEL ATRIBUTO, NO SU VALOR, y la diferencia importa:
 * "las cuatro en `false`" es un estado legítimo del camino normal (el lector
 * está en el Hero) y ahí `null` es la respuesta correcta, así que tomar ese
 * estado por "no hay señal" pisaría la rama clara. "Ninguna declara el
 * atributo" solo ocurre en dos situaciones: la rama oscura, y la ventana
 * entre el montaje y la primera entrega del `IntersectionObserver` en la
 * clara -- y en esa ventana la geometría no degrada nada, da la respuesta
 * correcta antes; en cuanto `useSectionProgress` escribe el atributo, el
 * módulo vuelve solo al camino de la señal ya calculada.
 */
/** Una sección de la home y su elemento real, tal como los recoge la única
 *  pasada por el DOM de `resolveActiveKey()`. */
interface SectionElement {
  readonly id: string;
  readonly el: HTMLElement;
}

/** Una candidata YA medida: la geometría se toma una sola vez por evaluación
 *  y viaja con ella, así que ninguna de las dos mitades de la regla vuelve a
 *  pedir el `getBoundingClientRect()` de un elemento ya medido. */
interface MeasuredSection {
  readonly id: string;
  readonly rect: DOMRect;
}

function measure(secciones: readonly SectionElement[]): MeasuredSection[] {
  return secciones.map(({ id, el }) => ({
    id,
    rect: el.getBoundingClientRect(),
  }));
}

/**
 * Punto del viewport contra el que se decide qué sección se está leyendo,
 * como fracción de su alto: 0,5 = el centro vertical. Se elige el centro y no
 * un punto sesgado hacia arriba (el patrón de "línea de lectura" bajo la
 * barra de navegación) porque el centro es el único valor que no depende del
 * alto de la barra ni de la altura del viewport: con él, la ventana de scroll
 * en la que una sección está activa mide exactamente su propio alto,
 * empezando y terminando cuando sus bordes cruzan el punto. Cualquier sesgo
 * es una preferencia estética que habría que volver a justificar cada vez que
 * cambie la barra; el centro no.
 */
const VIEWPORT_REFERENCE_FRACTION = 0.5;

/**
 * REGLA DE RESOLUCIÓN entre las candidatas de cualquiera de los dos caminos:
 * gana la sección que CONTIENE el punto de referencia del viewport y, solo si
 * ese punto cae en un hueco entre secciones, la de MAYOR superficie visible.
 *
 * POR QUÉ CAMBIÓ (crítica externa #10, 2026-08-18, hallazgo convergente en
 * tres barridos independientes). Hasta esa fecha ganaba la ÚLTIMA candidata
 * en el orden de la página. Sobre un `threshold` 0 -- cualquier solape mayor
 * que cero marca `data-inview` -- eso significa que la sección SIGUIENTE gana
 * desde su primer píxel de solape. Medido en navegador (tema claro,
 * 1440x900, viewport de 800 px; en coordenadas de documento: story 800-1882,
 * journey 2442-3076,6 -- 634,6 px de alto --, features 3077-4573): con el
 * scroll en 2500, Viaje ocupa 577 px del viewport (72 %) y Características
 * 223 px (28 %), y la navegación anunciaba «Características». Viaje solo
 * ganaba en una ventana de 395 px de scroll, menos de dos tercios de su
 * propio alto. El mecanismo castiga a TODA sección más corta que el viewport,
 * y anunciar por ARIA una ubicación falsa es peor que no anunciar ninguna --
 * el mismo criterio con el que se arregló la fix wave A, más arriba.
 *
 * POR QUÉ EL PUNTO DE REFERENCIA, y no la alternativa razonable (dominancia
 * directa: gana siempre la de mayor superficie visible), que arreglaría igual
 * de bien el caso medido. La dominancia tiene un SUELO DE ALTURA por debajo
 * del cual una sección no puede ganar en NINGUNA posición de scroll: con una
 * sección corta de alto `h` entre dos vecinas contiguas y un viewport de alto
 * `V`, la superficie de la corta nunca pasa de `h`, mientras que las vecinas
 * se reparten `V - h`; en su mejor posición (centrada) cada vecina enseña
 * `(V - h) / 2`, así que la corta solo gana si `h > V/3`. Con el viewport de
 * 800 px medido, cualquier sección de menos de 267 px de alto quedaría
 * invisible para la navegación para siempre -- exactamente la familia de
 * defecto que se está arreglando, con otro disfraz. El punto de referencia no
 * tiene suelo: basta con que la sección exista bajo él. Y da además la
 * propiedad que hace la regla explicable en una línea: cada sección es la
 * activa durante tantos píxeles de scroll como mide de alto, sea cual sea el
 * viewport.
 *
 * La dominancia se conserva como RESPALDO porque el punto de referencia puede
 * caer en un HUECO entre dos secciones (el que separa el Hero de Story, o
 * Story de Viaje: el arte de fondo y los márgenes de sección no son sección),
 * y ahí sigue habiendo una respuesta correcta -- la que más pantalla ocupa --
 * en vez de apagar `aria-current` a mitad de la página. Sin candidatas la
 * respuesta sigue siendo `null`: ese contrato (el lector está en el Hero) no
 * cambia.
 *
 * EMPATE EXACTO, en las dos mitades: gana la sección de MÁS ABAJO en el orden
 * de la página. La contención se prueba sobre el intervalo SEMIABIERTO
 * `[top, bottom)`, así que dos secciones contiguas que comparten un borde
 * exacto no lo contienen las dos: lo contiene la de abajo, la que se está
 * entrando -- con dos secciones repartiéndose la pantalla, eso pone el cambio
 * exactamente en el 50/50, ni un píxel antes ni después. El respaldo compara
 * con `>=` (se recorre de arriba abajo, así que gana la última empatada) por
 * coherencia con lo anterior. No hay parpadeo posible en la frontera porque
 * no hay histéresis ni estado que mantener: la respuesta es una función pura
 * de la geometría, con UN solo cruce por frontera y monótona en el sentido
 * del scroll -- para que oscilara tendría que oscilar el propio scroll.
 * `readingAnchorSectionId` (`themeScrollAnchor.ts`) usa desde la crítica
 * externa #13 (2026-08-20) esta MISMA regla, no una propia: lo único que
 * cambia allí es el conjunto de candidatas. Antes se llamaba
 * `dominantSectionId` y resolvía por superficie visible, lo que devolvía al
 * lector a una sección que este mismo hook ya consideraba abandonada -- dos
 * reglas para la misma pregunta. La fracción de referencia que las une está
 * atada por un candado de fuente en `themeScrollAnchor.test.ts`.
 */
function resolveAmongCandidates(
  candidatas: readonly MeasuredSection[],
): string | null {
  const vh = window.innerHeight;
  const referencia = vh * VIEWPORT_REFERENCE_FRACTION;
  let contiene: string | null = null;
  let dominante: string | null = null;
  let mayorSolape = -1;

  for (const { id, rect } of candidatas) {
    if (rect.top <= referencia && referencia < rect.bottom) contiene = id;
    const solape = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (solape >= mayorSolape) {
      mayorSolape = solape;
      dominante = id;
    }
  }

  return contiene ?? dominante;
}

/**
 * ¿Ha llegado el punto de referencia a la primera sección? Dicho de otro modo:
 * ¿alguna candidata EMPIEZA en el punto o por encima de él?
 *
 * CRÍTICA EXTERNA #14, P2 (mismo origen que el P0). Con `scrollY = 0` en tema
 * claro el centro del viewport cae en el Hero -- que no tiene entrada de
 * navegación --, pero Story ya asoma por el borde inferior: era la única
 * candidata y el respaldo por DOMINANCIA la elegía. `aria-current` anunciaba
 * «Historia» y el enlace de idioma apuntaba a `/en#story` (medido: cambiar de
 * idioma desde lo alto de la página saltaba 772 px). En OSCURO, en la misma
 * posición, la respuesta era `null`. Dos temas, dos respuestas a la misma
 * pregunta.
 *
 * La regla que faltaba: la dominancia es el respaldo para un HUECO ENTRE
 * secciones (el arte de fondo y los márgenes de sección no son sección), no
 * para el tramo ANTERIOR a todas ellas. Por encima de la primera el lector no
 * ha llegado a ninguna sección todavía -- está en el Hero -- y `null` es la
 * respuesta correcta. No es una preferencia nueva: es lo que el repo ya daba
 * por cierto sin serlo (`themeScrollAnchor.ts` documenta desde la crítica #13
 * que «`useActiveSection` [...] responde `null` en el Hero»). Esto lo hace
 * verdad, y lo hace igual en los dos temas y en los dos caminos, porque la
 * condición vive donde los dos convergen.
 *
 * NO toca el extremo de abajo -- el punto de referencia por DEBAJO de la
 * última sección, con el lector en About o en el pie --, donde la dominancia
 * sigue decidiendo igual que hasta hoy: el defecto medido está en el Hero y el
 * cambio se acota a él.
 *
 * Vive AQUÍ y no dentro de `resolveAmongCandidates()` a propósito. Esa función
 * es la regla que `readingAnchorSectionId` (`themeScrollAnchor.ts`) refleja
 * literalmente, y el ancla de tema NO puede heredar esta condición: necesita
 * una sección a la que devolver al lector también cuando cambia de tema
 * mirando el Hero (su propio docblock lo declara). Misma regla de desempate,
 * pregunta distinta.
 *
 * Solo puede cambiar la respuesta en la mitad de DOMINANCIA: una sección que
 * contiene el punto de referencia empieza, por definición, en él o por encima.
 */
function referenceReachedFirstSection(
  candidatas: readonly MeasuredSection[],
): boolean {
  const referencia = window.innerHeight * VIEWPORT_REFERENCE_FRACTION;
  return candidatas.some(({ rect }) => rect.top <= referencia);
}

/** Respuesta del módulo para un conjunto de candidatas ya medidas: la regla de
 *  desempate compartida, acotada por el tramo del Hero. LOS DOS CAMINOS pasan
 *  por aquí, y eso es lo que garantiza que la misma posición conteste lo mismo
 *  en claro y en oscuro. */
function resolveVisibleSection(
  candidatas: readonly MeasuredSection[],
): string | null {
  if (!referenceReachedFirstSection(candidatas)) return null;
  return resolveAmongCandidates(candidatas);
}

/*
 * UNA SOLA PASADA POR EL DOM. La primera versión del arreglo del tema oscuro
 * preguntaba dos veces: un predicado "hay señal" que recorría las cuatro
 * secciones con `getElementById`, y después el resolutor elegido, que las
 * volvía a recorrer. `evaluate()` está en camino caliente -- lo dispara cada
 * `scroll`/`resize` y, en la rama clara, cada cambio de `data-inview` vía
 * `MutationObserver` --, así que no se duplican cuatro `getElementById` por
 * evaluación pudiendo no hacerlo. (Ese `MutationObserver` NO se dispara por
 * frame, aunque el bucle de rAF de `useSectionProgress` sí corra a esa
 * frecuencia: su `writeVars()` compara contra `lastInViewText` y solo escribe
 * el atributo cuando el valor CAMBIA de verdad, así que las mutaciones son
 * los cruces reales de entrada/salida, un puñado por recorrido de página.)
 *
 * NOTA DE HONESTIDAD SOBRE POR QUÉ SE ESCRIBIÓ ASÍ, porque la primera
 * atribución fue FALSA y la corrección vale más que el dato: al ver la
 * versión de dos pasadas, dos ficheros de test (`hero-story.integration` y
 * `HomeSections`) agotaron su límite de 5 s en la suite con paralelismo por
 * defecto, y lo atribuí a esta duplicación. Medido después back-to-back en
 * la misma ventana de carga de máquina -- dos pasadas con el cambio y dos
 * sin él -- resultó que SIN el cambio fallan 3 ficheros y CON él 2: los
 * timeouts son la contención de CPU que este repo documenta desde el
 * 2026-08-12, no esta función. La pasada única se conserva porque sigue
 * siendo la forma correcta de escribirlo, no porque arregle ningún timeout.
 *
 * COSTE DE MEDIR GEOMETRÍA, y la corrección de lo que este mismo bloque
 * afirmaba hasta la crítica externa #14: «con 0 o 1 candidata la geometría no
 * puede cambiar la respuesta y no se llama a `getBoundingClientRect()` ni una
 * vez». La premisa era falsa y el P0 de esa crítica es su consecuencia
 * exacta -- con UNA sola candidata la señal se devolvía sin comprobar nada, y
 * un `data-inview="true"` FOSILIZADO en un nodo que ya no tenía dueño (ver el
 * bloque "DUEÑO DEL NODO Y RETRACCIÓN" de `useSectionProgress.ts`) pasaba a
 * ser la respuesta del módulo en TODA la página. Medido en Chrome real tras
 * conmutar a oscuro leyendo Características: `/#features` en las cinco
 * posiciones barridas (centro real: hero, story, journey, journey, about) y,
 * con él, el enlace de idioma, que aterrizaba en `scrollY = 13.372` de la home
 * inglesa.
 *
 * Desde aquí la señal es una PISTA que hay que confirmar, nunca una respuesta:
 * las candidatas se validan contra geometría (`clearlyOutsideViewport`, ver su
 * docblock para por qué descartar exige evidencia) y, si no sobrevive ninguna,
 * se cae al camino por geometría sobre las cuatro secciones -- la señal
 * entera era mentira, así que se ignora entera. El coste sube de 0 a entre 1 y
 * 4 `getBoundingClientRect()` por `evaluate()`, que sigue sin correr por frame:
 * lo disparan `scroll`/`resize` y las mutaciones de `data-inview` (un puñado
 * por recorrido de página, ver el paréntesis de arriba). Es el mismo coste que
 * el camino por geometría ya paga en la rama oscura y bajo `reduce` desde hace
 * dos críticas, y compra que ninguna afirmación de este módulo se apoye ya en
 * una señal que nadie comprueba.
 *
 * LO QUE NO CAMBIA: "hay atributo y las que lo declaran dicen `false`" sigue
 * siendo `null` sin mirar geometría. Ese estado es legítimo y significa algo
 * (la rama clara opinó: el lector está en el Hero); lo que se acaba de dejar
 * de creer a ciegas es el `true`, no el `false`.
 *
 * TERCERA CLASE DE SECCIÓN: LA QUE LA SEÑAL NO DESCRIBE (decisión del dueño
 * D2, 2026-09-02; crítica #15, hallazgo C 5). Hasta esa fecha las cuatro
 * secciones de `ACTIVE_SECTION_IDS` eran, en la rama clara, exactamente las
 * cuatro que montan `useSectionProgress`, así que "no declara `data-inview`"
 * solo podía significar dos cosas -- rama oscura (ninguna lo declara) o la
 * ventana anterior a la primera entrega del observer --, y las dos las
 * resuelve el camino por geometría de más abajo.
 *
 * `about` rompe esa coincidencia: es una sección real de la home, con su
 * `h2` y su `id`, PLANA a propósito (sin escena, sin deck y sin ramificar por
 * tema, ver el docblock de `About.tsx`), así que no monta `useSectionProgress`
 * -- no tiene ningún parallax cuyo progreso describir -- y no escribe la señal
 * en NINGUNA de las dos ramas. En la rama clara, donde las otras cuatro sí la
 * escriben, `haySenal` es cierto y el camino normal era el único que decidía:
 * con el centro del viewport DENTRO de About, la única candidata marcada era
 * Contacto (queda arriba en pantalla, `threshold` 0) y la navegación
 * anunciaba «Contacto» estando el lector en otra sección. En oscuro, donde
 * nadie escribe la señal, la geometría ya contestaba «about» correctamente:
 * dos ramas, dos respuestas, el mismo defecto de familia que la crítica #14.
 *
 * LA REGLA QUE LO CIERRA, y por qué no es un caso especial: una sección que
 * la señal NO DESCRIBE no puede ser filtrada por ella -- ni admitida ni
 * descartada --, así que entra al camino normal por la ÚNICA evidencia que
 * existe sobre ella, su geometría, con el criterio `intersectsViewport`. No
 * es un umbral nuevo: es el mismo `threshold` 0 del observer que escribe la
 * señal (ver el docblock de `intersectsViewport`), es decir, EXACTAMENTE el
 * conjunto que `data-inview` marcaría si alguien lo escribiera sobre ella. El
 * criterio más débil de `clearlyOutsideViewport` no sirve aquí: existe para
 * no contradecir a un observer real que dijo `true`, y aquí no hay ningún
 * observer que respetar -- aplicarlo admitiría la caja sin layout de jsdom y
 * la sección entraría como candidata en todas las posiciones a la vez.
 *
 * Coste: un `getBoundingClientRect()` más por evaluación (uno por sección sin
 * señal, hoy solo `about`) en la rama clara. La rama oscura ya medía las
 * cinco.
 */
function resolveActiveKey(): string | null {
  const secciones: SectionElement[] = [];
  const candidatas: SectionElement[] = [];
  const sinSenal = new Set<string>();
  let haySenalActiva = false;
  let haySenal = false;

  for (const id of ACTIVE_SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    secciones.push({ id, el });
    const senal = el.dataset.inview;
    if (senal === undefined) {
      /* Nadie describe esta sección con la señal: entra por geometría (ver el
         bloque de arriba). Se recorre `ACTIVE_SECTION_IDS`, así que
         `candidatas` conserva el ORDEN DE LA PÁGINA mezclando las dos
         procedencias -- y de ese orden depende el desempate documentado en
         `resolveAmongCandidates` (gana la de más abajo). */
      sinSenal.add(id);
      candidatas.push({ id, el });
      continue;
    }
    haySenal = true;
    if (senal === "true") {
      haySenalActiva = true;
      candidatas.push({ id, el });
    }
  }

  if (!isReducedMotion() && haySenal) {
    const validadas = measure(candidatas).filter(({ id, rect }) =>
      sinSenal.has(id)
        ? intersectsViewport(rect)
        : !clearlyOutsideViewport(rect),
    );
    if (validadas.length > 0) return resolveVisibleSection(validadas);
    // Nadie se declaró dentro: el estado legítimo de la rama clara con el
    // lector en el Hero. `null` sin mirar más, igual que antes.
    if (!haySenalActiva) return null;
    // Ninguna candidata resiste la geometría: la señal del árbol es fósil.
    // Se ignora y se resuelve como si no existiera.
  }

  return resolveVisibleSection(
    measure(secciones).filter(({ rect }) => intersectsViewport(rect)),
  );
}

function evaluate(): void {
  const next = resolveActiveKey();
  if (next !== activeKey) {
    activeKey = next;
    notify();
  }
}

function handleScrollOrResize(): void {
  evaluate();
}

/**
 * Fix wave E, hallazgo E1 (evaluador de navegador real, 2026-08-13):
 * `aria-current` se desincroniza tras navegar por ancla y no se recupera,
 * ni siquiera 4s después ni volviendo a scrollear con normalidad. MISMA
 * familia que fix wave A/A2 (`aria-current` afirmando una ubicación falsa
 * por ARIA) pero por un disparador DISTINTO: A2 era `data-inview` clavado
 * de forma PERMANENTE bajo `reduce`; esto es una CARRERA de un solo tiro
 * bajo navegación normal.
 *
 * DIAGNÓSTICO (antes de tocar nada, según pide el encargo): `evaluate()`
 * -- la única función que relee `data-inview` y decide `activeKey` -- solo
 * se re-ejecuta en dos disparadores: los eventos `scroll`/`resize` de
 * `window`, y una vez al montar el primer suscriptor (síncrona + 1 rAF de
 * margen). Pero `data-inview` no lo escribe un evento de `window`: lo
 * escribe, de forma ASÍNCRONA, el propio `IntersectionObserver` de CADA
 * sección (`useSectionProgress.ts`), cuya notificación el navegador entrega
 * en una tarea POSTERIOR al evento `scroll` que causó el cambio de
 * geometría -- nunca en el mismo tick síncrono. En scroll continuo (rueda
 * física, con inercia) esto no se nota: cada muesca genera un nuevo
 * `scroll`, y el navegador sigue emitiendo eventos de inercia varios
 * frames después de que la mano se detenga, así que aunque UN `evaluate()`
 * lea `data-inview` todavía "viejo", el SIGUIENTE evento (pocos ms después,
 * cuando el IntersectionObserver ya entregó) lo corrige -- la carrera se
 * autocura sola, invisible en las 14 paradas medidas de carga limpia.
 *
 * La navegación por ancla nativa (`<a href="#story">`, `scroll-behavior:
 * smooth` global, `GlobalStyles.tsx`) rompe esa autocorrección: la
 * animación de scroll del navegador termina en un alto SECO, sin ningún
 * evento de inercia posterior. Si el ÚLTIMO evento `scroll` de esa
 * animación se procesa ANTES de que el `IntersectionObserver` de la
 * sección de destino entregue su notificación para la posición final
 * (una carrera real y documentada: la entrega de `IntersectionObserver`
 * está gateada a "antes del siguiente pintado", una tarea distinta y
 * posterior al despacho síncrono del evento `scroll`), `evaluate()` lee
 * `data-inview` desactualizado -- y como no vuelve a haber NINGÚN
 * `scroll`/`resize` después (el usuario ya no se está moviendo), nada
 * vuelve a comprobar la señal real. El mismo mecanismo explica el caso de
 * la rueda hacia arriba hasta el Hero: si esa gesticulación también
 * termina en un alto seco justo cuando la última sección activa pasa a
 * `data-inview="false"`, la carrera puede perderse igual y dejar
 * `activeKey` clavado en la sección que ya se abandonó.
 *
 * ARREGLO (causa raíz, no un `setTimeout` que esconda el síntoma): en vez
 * de depender EXCLUSIVAMENTE de la señal PROXY (`scroll`/`resize`, "algo
 * pudo haber cambiado"), este módulo observa también la señal REAL
 * directamente -- un `MutationObserver` sobre el atributo `data-inview` de
 * las cuatro secciones. `evaluate()` se re-ejecuta entonces exactamente
 * cuando `useSectionProgress` escribe el nuevo valor, sin importar qué lo
 * disparó (scroll físico, navegación por ancla, resize) ni cómo terminó el
 * gesto que lo causó -- cierra la carrera por construcción, no por más
 * reintentos. NO es un `IntersectionObserver` nuevo (el docblock de
 * `evaluate()`, arriba, sigue cumpliéndose: "reutilizar, no crear un
 * observer nuevo" se refería a NO duplicar la detección de intersección de
 * `useSectionProgress`; un `MutationObserver` no mide intersección, solo
 * escucha el resultado YA calculado por el observer que ya existe). Los
 * listeners de `scroll`/`resize` se conservan: el camino de
 * `reduce`-motion no usa `data-inview` en absoluto, sigue necesitando el
 * disparador de scroll/resize para su propio `getBoundingClientRect()` -- y
 * desde el arreglo del tema oscuro (ver el docblock de `resolveActiveKey()`)
 * ese mismo camino por geometría es el único que corre en la rama oscura,
 * donde este `MutationObserver` no se dispara nunca porque nadie escribe el
 * atributo que observa.
 */
/*
 * SE OBSERVA EL SUBÁRBOL DEL BODY, NO LOS CUATRO NODOS (crítica externa #14,
 * integración de la ola J, 2026-09-02). Hasta esa ronda este observer se
 * ataba a los cuatro elementos que `getElementById` devolvía al suscribirse.
 * Pero las secciones se REMONTAN al cambiar de tema (Story y Journey siempre,
 * por ser componentes distintos por rama), y un observer atado a un nodo que
 * ya no está en el documento observa un fantasma: medido en Chrome, tras
 * conmutar oscuro→claro y saltar a scrollY=1200 con Story en el centro,
 * `evaluate()` leía `story:"false"` (el valor de la posición anterior),
 * devolvía `null` por «las cuatro en false», el `IntersectionObserver`
 * escribía `"true"` unos ms después y NADIE volvía a evaluar -- `aria-current`
 * vacío hasta el siguiente evento de scroll (1 px bastaba), y roto otra vez al
 * volver a la misma posición. Observar el subárbol del body con
 * `attributeFilter` cubre cualquier nodo presente o futuro que escriba el
 * atributo; el filtro deja fuera todo lo demás, así que el coste sigue siendo
 * «un puñado de cruces reales por recorrido de página».
 */
function observeSectionInviewMutations(): void {
  sectionMutationObserver = new MutationObserver(() => {
    evaluate();
  });
  sectionMutationObserver.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-inview"],
  });
}

/*
 * `subscribe` de `useSyncExternalStore`, mismo patrón de singleton de
 * módulo que `usePointer` (ver su docblock): un solo par de listeners de
 * `scroll`/`resize` para toda la aplicación, sin importar cuántos
 * componentes (el panel de escritorio Y la hoja móvil, Tarea 10) llamen a
 * este hook a la vez -- exactamente el motivo por el que "no crear un
 * observer nuevo" importa aquí: sin este singleton, cada consumidor
 * repetiría su propio listener recorriendo las mismas cuatro secciones.
 *
 * Un `requestAnimationFrame` adicional tras el primer `evaluate()` síncrono
 * (solo en el primer suscriptor) cubre la carrera de montaje: el
 * `IntersectionObserver` de `useSectionProgress` resuelve su primer aviso
 * de forma ASÍNCRONA (nunca en el mismo tick en que se llama a
 * `observer.observe()`), así que una carga en la que la página ya arranca
 * desplazada a una sección (recarga con `scrollRestoration`, enlace directo
 * a un ancla) podría no tener todavía `data-inview` escrito en el primer
 * `evaluate()` síncrono. Un frame de margen es suficiente en la práctica
 * (verificado leyendo la spec de IntersectionObserver: el primer aviso se
 * entrega en el primer "update de intersecciones" tras `observe()`, que
 * ocurre antes del siguiente pintado) y no añade ningún listener ni
 * `Observer` nuevo, solo relee la misma señal una vez más.
 */
function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (subscriberCount === 0) {
    evaluate();
    window.requestAnimationFrame(evaluate);
    window.addEventListener("scroll", handleScrollOrResize, {
      passive: true,
    });
    window.addEventListener("resize", handleScrollOrResize, {
      passive: true,
    });
    // Fix wave E, hallazgo E1: ver el docblock de `observeSectionInviewMutations`,
    // arriba, para el porqué (cierra la carrera scroll-vs-IntersectionObserver
    // que scroll/resize por sí solos no cubren tras un salto de ancla).
    observeSectionInviewMutations();
  }
  subscriberCount += 1;
  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      sectionMutationObserver?.disconnect();
      sectionMutationObserver = null;
      activeKey = null;
    }
  };
}

function getSnapshot(): string | null {
  return activeKey;
}

/** Sin `window` (SSR/prerender estático) no hay ninguna sección "activa" todavía. */
function getServerSnapshot(): string | null {
  return null;
}

/**
 * `key` (de `NAV_GROUPS`, grupo `onSite`) de la sección de la home
 * actualmente visible, o `null` si ninguna lo está (por ejemplo, con el
 * usuario todavía en el Hero, que no tiene entrada propia en `onSite`).
 *
 * Reutiliza el motor existente de `useSectionProgress` -- ver el docblock
 * de `evaluate()` -- en vez de montar un `IntersectionObserver` nuevo:
 * singleton de módulo (mismo patrón que `usePointer`), así que Navbar y la
 * hoja de navegación móvil pueden llamarlo cada uno por su cuenta sin
 * duplicar listeners.
 */
export function useActiveSectionKey(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
