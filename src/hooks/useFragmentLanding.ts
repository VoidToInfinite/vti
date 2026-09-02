"use client";
import { useEffect, useRef } from "react";

/**
 * ATERRIZAJE EN UN FRAGMENTO CUANDO LA PÁGINA CAMBIA DE ALTO AL HIDRATAR
 * (crítica externa #11, hallazgo A).
 *
 * EN UNA FRASE: tras montarse la rama de tema que de verdad va a quedarse, si
 * la carga traía un fragmento en la URL, vuelve a llevar al lector a ese
 * destino -- una sola vez, y solo si no ha tomado él el control del scroll
 * mientras tanto.
 *
 * ## El defecto, medido (no supuesto)
 *
 * Una navegación con fragmento hecha como CARGA DE PÁGINA (`/#contact`,
 * `/#features`, `/#journey`) aterriza en tema oscuro a miles de píxeles de su
 * destino y no se corrige nunca. Medido por el orquestador de esta ola a
 * 1440x900, `.top` = distancia del destino al borde superior del viewport una
 * vez la página se ha asentado:
 *
 *   /#contact  claro    scrollY 4.615    destino a   +128 px  (correcto)
 *   /#contact  OSCURO   scrollY 4.615    destino a +9.993 px  (roto)
 *   /#features OSCURO   scrollY 3.119    destino a +10.381 px (roto)
 *   /#story    OSCURO   scrollY   772    destino a   +128 px  (se salva)
 *
 * El `scrollY` final es IDÉNTICO en claro y en oscuro para `/#contact`: nadie
 * lo tocó después. `/#story` se salva por estar antes de la expansión, no por
 * ser un caso distinto.
 *
 * ## La causa raíz, en una línea
 *
 * Bajo `output: "export"` el primer render es SIEMPRE la rama clara
 * (`ThemeProvider` no puede leer `localStorage` durante el render sin romper
 * el HTML horneado -- ver su docblock). El navegador ejecuta su algoritmo de
 * "scroll to the fragment" sobre ESA geometría, la del documento claro
 * (~6.698 px), y cuando la hidratación monta los decks de la rama oscura
 * (~16.379 px, la divergencia de vehículo que `DESIGN.md` §4 documenta) NADIE
 * vuelve a medir. El navegador no repite ese algoritmo: es un paso de la
 * navegación, no un observador del layout.
 *
 * POR QUÉ LOS CLICS DENTRO DE LA PÁGINA SÍ FUNCIONAN, y por qué eso no es una
 * pista falsa: cuando alguien pulsa «Contacto» en el navbar, la página lleva
 * rato hidratada y el desplazamiento se calcula contra la geometría REAL de la
 * rama que está montada. El defecto no está en el destino ni en el
 * `scroll-margin-top`: está en el INSTANTE en que se mide.
 *
 * AGRAVANTE: las páginas legales no tienen navegación de sección en la
 * cabecera, así que su pie (`Footer.tsx`, enlaces `/#...` que en una carga
 * completa son exactamente este caso) es la única vuelta a la home por
 * sección -- rota en oscuro para todo el mundo que llegue a una legal desde
 * fuera.
 *
 * ## Mecanismo, y por qué el "cuándo" no se resuelve con un temporizador a ojo
 *
 * El efecto de este hook depende de `branchKey` -- `HomeSections.tsx` le pasa
 * el `themeName` del proveedor. Eso ata la corrección al hecho observable que
 * importa (LA RAMA EFECTIVA YA ESTÁ MONTADA) en vez de a una estimación de
 * cuánto tarda la hidratación:
 *
 * - Carga clara sin corrección de tema: el efecto corre UNA vez, con la rama
 *   definitiva ya montada. La corrección llega y es un no-op observable -- el
 *   navegador ya había acertado, y volver al MISMO destino con el MISMO
 *   `block: "start"` no mueve la página.
 * - Carga oscura: el efecto corre primero con la rama clara (todavía la del
 *   HTML horneado) y, en cuanto el efecto de hidratación de `ThemeProvider`
 *   confirma el tema, React limpia ese efecto -- lo que CANCELA la corrección
 *   pendiente -- y lo vuelve a arrancar con la rama oscura ya montada. La
 *   corrección que llega a aplicarse es siempre la de la geometría buena.
 *
 * Sobre esa base, la espera son DOS RELOJES en carrera, el mismo patrón que
 * `useThemeScrollReset.ts` (su hermano: aquel corrige el ancla de lectura al
 * CONMUTAR tema, este el aterrizaje en la CARGA):
 *
 * 1. `requestAnimationFrame` ANIDADO: el primero cae en el commit de la rama,
 *    el segundo ya con la página nueva compuesta. Las alturas de los decks son
 *    CSS por viewport (`100dvh` y múltiplos), no dependen de que ninguna
 *    imagen decodifique, así que dos frames bastan para que el layout sea el
 *    definitivo.
 * 2. Un tope de `FRAGMENT_LANDING_SETTLE_MS`, porque en una pestaña oculta NO
 *    HAY FRAMES -- ni `requestAnimationFrame`, ni relojes de animación
 *    (CLAUDE.md §5 punto 3, y las tres lecciones de `task/lessons.md` sobre
 *    `visibilityState: "hidden"`). Un aviso que puede no llegar jamás no puede
 *    ser la única vía de progreso.
 *
 * Gana el que llegue primero; el otro se encuentra la puerta cerrada.
 *
 * ## Cómo se corrige: `scrollIntoView`, nunca aritmética propia
 *
 * `GlobalStyles.tsx` declara `:where(section[id], h3[id]) { scroll-margin-top:
 * calc(var(--nav-height) + var(--nav-gap)) }`, que es EXACTAMENTE el desfase de
 * cabecera que el destino necesita (los 128 px que mide la columna «correcto»
 * de la tabla de arriba). `scrollIntoView({ block: "start" })` lo consume por
 * construcción; reimplementarlo con `scrollTo({ top: rect.top + scrollY - X })`
 * crearía una segunda fuente de ese número que se desincronizaría del CSS al
 * primer retoque de la barra.
 *
 * `behavior: "instant"` SIEMPRE, nunca `"auto"` ni `"smooth"`: esto es una
 * CORRECCIÓN DE COLOCACIÓN, no un viaje que el lector haya pedido. Y `"auto"`
 * no serviría, porque resuelve al `scroll-behavior` computado, que en este
 * sitio es `smooth` para todo el mundo salvo bajo `prefers-reduced-motion`
 * (`GlobalStyles.tsx`) -- un desplazamiento animado de 10.000 px sería
 * justo el defecto que la Task 17 midió y retiró. Como efecto colateral
 * declarado, `"instant"` respeta `prefers-reduced-motion` por construcción: no
 * hay movimiento que la preferencia pueda pedir retirar.
 *
 * ## Lo que este hook NO hace
 *
 * - NO unifica la longitud de scroll entre temas: sigue siendo la decisión
 *   pendiente del dueño que `docs/qa-3d-pendiente.md` declara desde el
 *   2026-08-12. Esta corrección hace que la divergencia deje de romper la
 *   navegación por fragmento mientras se decide.
 * - NO reacciona a cambios de hash POSTERIORES a la carga. El fragmento se
 *   captura una sola vez, en la primera ejecución del efecto, y no se vuelve a
 *   leer: de los clics dentro de la página ya se ocupa el navegador con la
 *   geometría real, y volver a saltar al fragmento cada vez que alguien pulsa
 *   el conmutador de tema pelearía con la restitución del ancla de lectura de
 *   `useThemeScrollReset.ts`.
 * - NO vive en las páginas legales: sin decks no hay divergencia de alto entre
 *   ramas, así que ahí no hay nada que corregir.
 *
 * LIMITACIÓN CONOCIDA, declarada y no resuelta: `#statement` es la única `id`
 * de sección que no es una sección hermana en NINGUNA rama -- desde la
 * crítica externa #15 (2026-09-02, C10) cuelga de `#story` también en claro,
 * y en la rama OSCURA es además la última DIAPOSITIVA del deck de Story,
 * hija de un `ScStage` con `position: sticky`
 * (ver el docblock de `themeScrollAnchor.ts`, que excluye ese mismo caso por
 * el mismo motivo: la caja de un elemento pegado se mueve CON el scroll, así
 * que su posición no es una propiedad del documento sino del instante en que
 * se mide). Una carga `/#statement` en oscuro puede por tanto recolocarse mal.
 * No se le pone remedio aquí a propósito: `#statement` no es destino de
 * ninguna entrada de `src/config/navigation.ts` ni del pie, así que no hay un
 * caso de uso real que verificar en navegador, y una regla sin caso que la
 * ejercite envejecería sin que nadie la mirara. Si algún día se enlaza, la
 * salida ya está escrita: la misma exclusión estructural de
 * `isTopLevelSectionAnchor`.
 */

/**
 * Tope de espera al re-maquetado cuando el doble `requestAnimationFrame` no
 * llega (pestaña oculta, donde no hay frames en absoluto). No temporiza
 * ninguna animación, así que no sale de `motion.duration` ni del vocabulario:
 * es una constante de seguridad, de la misma familia que
 * `HERO_DECODE_TIMEOUT_MS` (`timings.ts`).
 *
 * Es el DOBLE de `THEME_ANCHOR_SETTLE_MS` (100 ms, `useThemeScrollReset.ts`) y
 * no el mismo número, a propósito: aquel espera UN render de React (el cambio
 * de tema ya confirmado en el tick del click), mientras que esta ventana puede
 * tener que cubrir la hidratación entera MÁS el render de corrección de tema.
 * Más trabajo, más plazo. En una pestaña visible el tope no se usa nunca: los
 * dos frames (~33 ms a 60 Hz) ganan la carrera con holgura, y este número solo
 * decide cuánto tarda la corrección en un contexto donde nadie la está viendo.
 */
export const FRAGMENT_LANDING_SETTLE_MS = 200;

/**
 * Teclas cuyo comportamiento por defecto es desplazar el documento. Pulsar una
 * de ellas ES tomar el control del scroll, exactamente igual que una rueda o
 * un arrastre táctil.
 *
 * La lista es cerrada a propósito: un `keydown` cualquiera (escribir en el
 * campo de correo de Contacto, tabular) no desplaza nada por sí mismo y
 * abortar por él dejaría al lector tirado sin motivo. `" "` es la barra
 * espaciadora en navegadores actuales; `"Spacebar"` es el valor heredado que
 * todavía emiten motores antiguos.
 */
const SCROLL_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Spacebar",
]);

/**
 * @param branchKey Identidad de la rama montada. `HomeSections.tsx` pasa el
 * `themeName` del proveedor: cuando cambia, la corrección pendiente se cancela
 * y se vuelve a armar contra el maquetado nuevo (ver el docblock de cabecera).
 * Se tipa como `string` y no como `ThemeName` a propósito -- a este hook no le
 * importa QUÉ rama es, solo que ha cambiado.
 */
export function useFragmentLanding(branchKey: string): void {
  /** Fragmento de la CARGA. `null` mientras no se ha capturado; después, el
   *  `id` (cadena vacía si la URL no traía ninguno). Se lee una sola vez para
   *  que un `#hash` posterior --un clic en el navbar-- no pueda rearmar nada. */
  const loadHashRef = useRef<string | null>(null);
  /** `true` en cuanto la corrección se aplicó O se abortó. Cierra la puerta a
   *  cualquier ejecución futura del efecto: sin esto, un cambio de tema del
   *  usuario media hora después volvería a saltar al fragmento de la carga. */
  const finishedRef = useRef(false);

  useEffect(() => {
    if (loadHashRef.current === null) {
      loadHashRef.current = window.location.hash.slice(1);
    }
    const id = loadHashRef.current;
    if (id === "" || finishedRef.current) return;

    let settled = false;
    let frameId: number | null = null;
    let timeoutId: number | null = null;

    function cancelClocks(): void {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    /** Cero listeners permanentes: los tres de la guarda se retiran al
     *  corregir, al abortar y al desmontar, sin excepción. */
    function releaseGuard(): void {
      window.removeEventListener("wheel", onManualScroll);
      window.removeEventListener("touchmove", onManualScroll);
      window.removeEventListener("keydown", onKeyDown);
    }

    /**
     * El lector ha tomado el control del scroll antes de que llegara la
     * corrección: se aborta y no se vuelve a intentar. Arrebatarle el scroll a
     * quien ya está leyendo por su cuenta sería un defecto peor que el que
     * este hook arregla.
     *
     * La guarda escucha INTENCIÓN (`wheel`/`touchmove`/`keydown`), nunca el
     * evento `scroll`: el propio salto al fragmento que hace el navegador al
     * cargar emite `scroll`, y la corrección de este hook también -- escuchar
     * `scroll` abortaría siempre, contra la nada.
     */
    function onManualScroll(): void {
      if (settled) return;
      settled = true;
      finishedRef.current = true;
      cancelClocks();
      releaseGuard();
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (SCROLL_KEYS.has(event.key)) onManualScroll();
    }

    /**
     * Carrera entre el doble `requestAnimationFrame` y el tope: gana el
     * primero que llegue y `settled` deja al perdedor sin efecto.
     *
     * El ganador NO cancela al perdedor, y es deliberado -- misma decisión ya
     * documentada en `scheduleAnchorCorrection` (`useThemeScrollReset.ts`):
     * cancelar desde aquí dejaría el guard `settled` sin poder observarse
     * (el perdedor no llegaría a intentarlo nunca), y un guard que ningún test
     * puede ver fallar no está verificado. Cancelar sí se cancela donde de
     * verdad hace falta: al abortar y al desmontar.
     */
    function applyOnce(): void {
      if (settled) return;
      settled = true;
      finishedRef.current = true;
      releaseGuard();

      // La existencia del destino se comprueba AQUÍ, no al armar: el `id`
      // puede pertenecer a un elemento que solo monta una de las dos ramas, y
      // lo que decide es la rama que hay delante en el momento de corregir.
      const target = document.getElementById(id);
      if (target === null) return;

      target.scrollIntoView({ behavior: "instant", block: "start" });
    }

    window.addEventListener("wheel", onManualScroll, { passive: true });
    window.addEventListener("touchmove", onManualScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    if (typeof window.requestAnimationFrame === "function") {
      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(applyOnce);
      });
    }
    timeoutId = window.setTimeout(applyOnce, FRAGMENT_LANDING_SETTLE_MS);

    return () => {
      // Desmontaje, o cambio de rama: la corrección pendiente se descarta
      // entera, nunca se encola. `settled` se marca sin tocar `finishedRef`
      // -- el cambio de rama tiene que poder volver a armar.
      //
      // LAS DOS PRIMERAS LÍNEAS SON REDUNDANTES ENTRE SÍ, y está medido, no
      // supuesto: con solo `settled = true`, un frame viejo que llegue igual
      // se encuentra la puerta cerrada (cierra sobre ESTA clausura, no sobre
      // la del efecto nuevo); con solo `cancelClocks()`, ese frame no llega a
      // ejecutarse. Cada una basta para la propiedad que importa (la
      // corrección de la rama vieja NO se aplica), así que el candado de esa
      // propiedad no puede distinguirlas -- se verificó retirando
      // `cancelClocks()` y la suite siguió en verde. Se conservan las dos: la
      // segunda no está para la propiedad sino para no dejar relojes
      // huérfanos corriendo tras un desmontaje, y ESA sí tiene candado propio
      // ("al cambiar de rama no deja relojes huérfanos").
      settled = true;
      cancelClocks();
      releaseGuard();
    };
  }, [branchKey]);
}
