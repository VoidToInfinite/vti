"use client";
import { useEffect } from "react";

/**
 * SELLA LA ENTRADA DE HISTORIAL QUE CREA UN ANCLA DEL MISMO DOCUMENTO
 * (crítica externa #21, P0).
 *
 * EN UNA FRASE: en cuanto el navegador crea una entrada de historial por un
 * `<a href="#algo">`, este hook la vuelve a escribir con `replaceState` para
 * que lleve el estado que el enrutador de Next sabe restaurar; sin eso, volver
 * a esa entrada con el botón «atrás» cambia la URL y deja en pantalla el
 * documento anterior.
 *
 * ## El defecto, medido (no supuesto)
 *
 * Gesto: cargar `/`, pulsar «Contacto» en la barra (que es un `<a
 * href="/#contact">` nativo, no un `next/link`), pulsar «Aviso legal» en el pie
 * y pulsar ATRÁS. Medido sobre el build de `6ce08ee` servido en local. Las
 * cifras son las del tema claro a 1440x900; el defecto es el mismo en oscuro y
 * a 390, con los altos de cada rama (la portada oscura mide 11.008 px):
 *
 *   paso           URL             h1                #hero   scrollHeight
 *   carga          /               VoidToInfinite    sí      6.523
 *   clic «Contacto» /#contact      VoidToInfinite    sí      6.588
 *   clic legal     /aviso-legal    Aviso legal       no      5.308
 *   ATRÁS          /#contact       Aviso legal       no      5.308   <-- miente
 *
 * El estado no se corrige solo: medido a +3,6 s por la sonda de este frente, y
 * a 1,2 / 1,5 / 5 / 6 y 7,5 s por el orquestador de esta ola. La barra
 * de direcciones dice «portada, sección Contacto» y en pantalla sigue el aviso
 * legal. Se reprodujo con clics reales desde la barra, desde la hoja móvil (390
 * px), desde el CTA del hero y desde el índice de las legales, en las dos ramas
 * de idioma y en los dos temas: 12 combinaciones, 12 rotas.
 *
 * EL ALCANCE no son esos cuatro sitios: es CUALQUIER `<a>` cuyo destino sea el
 * mismo documento con fragmento. Censo del HTML horneado de este build, por
 * documento: `/` 30, `/en` 30, `/aviso-legal` 16, `/privacidad` 15,
 * `/en/legal-notice` 16, `/en/privacy` 15 y la 404 una (su enlace de salto) —
 * 123 anclas. Lo que hace visible el defecto es que después haya una navegación
 * blanda a otra ruta.
 *
 * ## La causa raíz, y no está en este repo
 *
 * `node_modules/next/dist/client/components/app-router.js:284-298`
 * (`next@16.2.11`), manejador de `popstate`, primera rama, literal:
 *
 *     const onPopState = (event) => {
 *         if (!event.state) {
 *             // TODO-APP: this case only happens when pushState/replaceState
 *             // was called outside of Next.js. It should probably reload the
 *             // page in this case.
 *             return;                        // <-- no hace NADA
 *         }
 *         ...
 *
 * Una navegación de fragmento nativa —la que hace el navegador al pulsar un
 * ancla del mismo documento— crea una entrada nueva cuyo `history.state` es
 * `null` por especificación, y no pasa por el enrutador: no hay `pushState`, no
 * hay `navigate`, no hay nada que Next intercepte. Al volver a esa entrada,
 * `onPopState` sale por ese `return` y el árbol renderizado no cambia. Por eso
 * la URL viaja y el documento no.
 *
 * LA LECTURA DEL CÓDIGO NO ES UNA SUPOSICIÓN: las tres ramas se ejercitaron
 * sobre este build cambiando UNA sola variable —el contenido de `history.state`
 * de la entrada de fragmento— y el resultado del «atrás» cambió entre los tres
 * comportamientos que el código predice:
 *
 *   estado de la entrada                        tras el atrás        ¿recarga?
 *   null                                        h1 «Aviso legal»     no
 *   {u2:1} (escrito con `History.prototype`,    h1 «VoidToInfinite»  SÍ
 *   esquivando el parche de Next)
 *   {__NA, __PRIVATE_NEXTJS_INTERNALS_TREE}     h1 «VoidToInfinite»  no
 *
 * Lo que hace que el defecto se VEA es que después haya una navegación blanda
 * a otra ruta que comparta raíz de documento. Cruzar a `/en` no lo reproduce
 * porque son dos raíces distintas (`app/(es)/layout.tsx` y `app/en/layout.tsx`,
 * entrega del 2026-09-06) y ahí la navegación es de documento; la 404 tampoco,
 * y por lo mismo.
 *
 * ## Por qué esto lo arregla, y por qué no es un truco
 *
 * `replaceState` está PARCHEADO por el propio Next (`app-router.js:268`) justo
 * para esto: «Patch replaceState to ensure external changes to the history are
 * reflected in the Next.js Router». Al llamarlo con una URL, Next despacha
 * `ACTION_RESTORE`, y su `HistoryUpdater` (`app-router.js:38-70`) estampa
 * `{__NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: …}` sobre la entrada ACTUAL —
 * que en ese instante es justamente la entrada de fragmento recién nacida. Es
 * decir: se entra por la puerta que Next declara soportada para los cambios de
 * historial hechos desde fuera del enrutador.
 *
 * Se le pasa `history.state` y no `null` a propósito, y eso le da la propiedad
 * que lo hace barato: si la entrada YA está sellada, el parche de Next ve
 * `data.__NA` y sale por su atajo (`return originalReplaceState(...)`), sin
 * despachar nada y sin re-renderizar. Sellar una entrada ya sellada es un no-op
 * observable.
 *
 * Y no hay bucle: `replaceState` no dispara `hashchange`.
 *
 * ## Lo que NO hace, y por qué se descartó cada alternativa
 *
 * - NO toca ningún `href`, ni intercepta el clic, ni reimplementa la navegación
 *   de fragmento del navegador. La alternativa que sí lo hacía —`preventDefault`
 *   + `pushState` + `scrollIntoView` en las 123 anclas— funciona, pero sustituye
 *   plataforma por código propio: el diagnóstico de este defecto midió que
 *   pierde `:target`, y obliga a reimplementar a mano modificadores de teclado,
 *   botón central, foco y `prefers-reduced-motion`. Con el sellado, `:target`
 *   sigue intacto (medido aquí: `contact` en la portada, `registro` en la legal).
 * - NO endurece los enlaces internos. Convertir `ScFooterNavLink`/`ScBrandLink`
 *   de `next/link` a `<a>` también arregla el síntoma, pero retira un rasgo
 *   declarado en el docblock de `Footer.tsx` («los destinos propios se navegan
 *   con next/link, sin recarga») y cuesta una carga de documento completa por
 *   salto: es decisión del dueño, no de este parche.
 * - NO recarga en `popstate`. Es lo que sugiere el `TODO-APP` de Next, y también
 *   restituiría el documento, pero solo puede hacerlo recargando: en el instante
 *   del «atrás» el árbol de esa entrada nunca se guardó, así que ya no existe la
 *   información para restituirla en cliente. La rama 2 de la tabla de arriba es
 *   justo esa vía —Next recarga cuando la entrada lleva estado ajeno— y la
 *   medida dice `recargado = SÍ`.
 * - NO corrige el scroll ni compite con `useFragmentLanding`/
 *   `useThemeScrollReset`, y esto se midió en A/B sobre el MISMO build (el
 *   sellado se desactiva desde fuera tragándose el registro de `hashchange`,
 *   que en este repo solo lo pide este hook), 1440x900, cuatro combinaciones:
 *
 *     tema   página        con sello        sin sello
 *     claro  /             y=4374 top=192   y=4374 top=192   6 peticiones / 6
 *     claro  /aviso-legal  y=2119 top=88    y=2119 top=88    1 petición  / 1
 *     oscuro /             y=9046 top=128   y=9046 top=128   17 pet.     / 17
 *     oscuro /aviso-legal  y=2119 top=88    y=2119 top=88    1 petición  / 1
 *
 *   El desplazamiento final y el aterrizaje del destino son IDÉNTICOS, `:target`
 *   se conserva (`contact`, `registro`) y el sellado no añade ni una petición de
 *   red. Lo único que se mueve es la muestra a +400 ms (3.160 -> 3.194 en la
 *   portada clara), que es un punto a mitad del desplazamiento suave, no un
 *   destino distinto.
 *
 * ## Riesgo residual, declarado
 *
 * El sellado depende de que Next siga parcheando `replaceState` como hoy. Si una
 * versión futura cambia ese parche, esto dejaría de sellar EN SILENCIO. Por eso
 * el candado que lo vigila (`scripts/check-site-surfaces.mjs`, familia
 * `atras-restituye-el-documento-de-la-url`) mide el GESTO COMPLETO con clics
 * reales en un navegador y, además, afirma explícitamente que la entrada quedó
 * sellada y que la navegación siguió siendo blanda — nunca la existencia de
 * este listener.
 *
 * LÍMITE CONOCIDO, no medido: un clic en un ancla ANTES de que la hidratación
 * monte este efecto crearía una entrada que este listener no llega a ver. Next
 * sella la entrada actual al montar (`HistoryUpdater`), así que lo normal es
 * que quede cubierta por esa vía; la ventana que quedaría descubierta es la de
 * un clic entre ese sellado inicial y el registro de este listener, y es
 * demasiado estrecha para ejercitarla con un clic de Playwright de forma
 * fiable. No se le pone remedio a ciegas: un sellado extra al montar sería
 * código sin caso que lo ejercite (regla del repo) y no se ha podido verificar.
 */
export function useHashHistorySeal(): void {
  useEffect(() => {
    const sellarLaEntrada = (): void => {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.href,
      );
    };
    window.addEventListener("hashchange", sellarLaEntrada);
    return () => {
      window.removeEventListener("hashchange", sellarLaEntrada);
    };
  }, []);
}
