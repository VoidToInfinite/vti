import { useCallback, useRef, useState } from "react";

/**
 * El umbral declarado del revelado: un quinto del ÁREA DE LA PIEZA dentro de
 * la ventana del observador. Es la intención de diseño ("un quinto de la pieza
 * dentro"), y sigue siendo lo que se pide en toda pieza pequeña -- ver
 * `umbralConscienteDeLaAltura`, que solo lo BAJA cuando cumplirlo costaría más
 * pantalla de la que el diseño se puede gastar.
 */
export const UMBRAL_DE_REVELADO = 0.2;

/**
 * TOPE DEL RETRASO QUE EL UMBRAL PUEDE AÑADIR, como fracción de la altura de la
 * VENTANA DEL NAVEGADOR (`window.innerHeight`), no del objetivo.
 *
 * EL PORQUÉ, medido (crítica externa #21, ola U, 2026-09-08). Un umbral de área
 * fijo se traduce en un retraso en PÍXELES DE SCROLL que crece con la altura de
 * la pieza: para que el ratio llegue a 0,2 hacen falta `0,2 * alto` px de la
 * pieza dentro de la ventana, así que hay una banda de scroll --de exactamente
 * ese tamaño-- en la que la pieza YA asoma por encima de la línea del
 * `rootMargin` y sigue apagada. Nada la vuelve a comprobar si el lector se
 * detiene ahí: el contrato de `IntersectionObserver` solo habla al CRUZAR el
 * umbral. Censo propio de los objetivos de revelado del sitio, medido sobre el
 * build servido (2 temas x 5 anchos x raíz 16 y 32; `banda` = `0,2 * alto`, los
 * px de scroll que el umbral fijo deja en negro POR ENCIMA de la línea):
 *
 *     Story    ScGrid          1440x900 raíz 16   h=  938   banda= 188 px
 *     Story    ScGrid          1440x900 raíz 32   h= 2855   banda= 571 px
 *     Story    ScGrid           390x844 raíz 32   h= 6073   banda= 1215 px (*)
 *     Features ScRevealGroup   1440x900 raíz 16   h= 1095   banda= 219 px
 *     Contact  ScCard          1440x900 raíz 16   h=  944   banda= 189 px
 *     Contact  ScCard           390x844 raíz 32   h= 3250   banda= 650 px
 *     About    ScInner         1440x900 raíz 16   h=  390   banda=  78 px
 *     Story    ScStatementText 1440x900 raíz 16   h=  376   banda=  75 px
 *     Journey  ScStepsRow      1440x900 raíz 16   h=  165   banda=  33 px
 *     Beam     ScSectionBeam   cualquiera         h=    2   banda=   0 px
 *
 * (*) Ese caso es peor que una banda: con la ventana en 743 px el ratio MÁXIMO
 * que esa pieza puede alcanzar es 743/6073 = 0,1223, por debajo de 0,2. El
 * umbral no se cruza NUNCA y la rejilla de pilares no se revela jamás a 390 px
 * con el texto al 200 %.
 *
 * Y no es un problema solo de piezas más altas que la ventana: `ScStatementText`
 * (376 px) y `About ScInner` (390 px) miden la mitad de la ventana y su banda
 * se midió en el navegador con el 44,1 % y el 54,1 % del texto del viewport
 * dentro del DOM y sin pintar.
 *
 * EL VALOR, 0,01 -- un 1 % de la altura de la ventana. Tres razones, todas con
 * número delante:
 *   1. Contra el diseño declarado: el `rootMargin` de abajo ADELANTA el disparo
 *      un 12 % de la ventana. Que el umbral pueda gastarse un 1 % es una
 *      duodécima parte de ese adelanto: el umbral deja de poder comerse el
 *      rasgo perceptivo que el `rootMargin` compra.
 *   2. Contra la medición: el aterrizaje más ajustado de los medidos
 *      (`/?read=0.50#features`, 1440x900) deja la tarjeta de Contacto con 21 px
 *      por encima de la línea. Un tope de 9 px (1 % de 900) la obliga a
 *      revelarse ahí con un factor 2,3 de margen; con 0,02 el margen sería 1,2
 *      y el candado quedaría clavado a la geometría de hoy.
 *   3. Contra lo que se ve: 9 px de una pantalla de 900 es la altura de media
 *      línea de texto pequeño. La franja que el diseño YA declara oscura --el
 *      12 % de abajo, 108 px-- es doce veces más grande.
 *
 * LO QUE GARANTIZA, y es la frase que el candado comprueba: ninguna pieza, a
 * ningún ancho y a ninguna raíz de fuente, puede quedarse apagada asomando más
 * de un 1 % de la altura de la ventana por encima de la línea del `rootMargin`.
 * El tope no depende del alto de la pieza, así que no hay geometría que lo
 * desborde.
 *
 * LO QUE NO ARREGLA, declarado en vez de tapado: la franja del `rootMargin`
 * sigue ahí y es diseño (ver abajo). En los aterrizajes en los que la pieza cae
 * ENTERA por debajo de esa línea, su texto sigue sin pintarse y el umbral no
 * tiene nada que ver: medido, hasta el 45,4 % del texto del viewport en
 * `/?read=0.40#contact`.
 *
 * SE MIDE CONTRA `window.innerHeight` Y NO CONTRA LA VENTANA DEL OBSERVADOR
 * (que es la de `rootMargin`, un 12 % más corta) a propósito: el tope es un
 * presupuesto perceptivo en píxeles de PANTALLA, y dónde ponga la línea el
 * `rootMargin` es otra decisión. Un consumidor que encoja más la ventana no se
 * gana con ello un retraso mayor.
 */
export const RETRASO_MAXIMO_DEL_UMBRAL = 0.01;

/**
 * El umbral efectivo: `min(umbral declarado, tope / alto del objetivo)`.
 *
 * En una pieza cuya banda con el umbral declarado ya cabe en el tope --alto por
 * debajo de `tope / umbral`, o sea 45 px en una ventana de 900-- devuelve el
 * umbral tal cual y la intención declarada queda intacta. Por encima de eso
 * devuelve justo el umbral que hace que la banda MIDA el tope.
 *
 * Sin geometría no se adapta nada: un alto o una ventana de 0 son "todavía no
 * hay layout" (jsdom, elemento sin medir, pestaña que nunca se pintó), no una
 * pieza infinitamente alta, y ahí se devuelve el umbral declarado. El
 * `ResizeObserver` del hook vuelve a preguntar en cuanto hay caja.
 */
export function umbralConscienteDeLaAltura(
  altoDelObjetivo: number,
  altoDeLaVentana: number,
  umbral: number,
): number {
  if (!(altoDelObjetivo > 0) || !(altoDeLaVentana > 0)) return umbral;
  return Math.min(
    umbral,
    (RETRASO_MAXIMO_DEL_UMBRAL * altoDeLaVentana) / altoDelObjetivo,
  );
}

/**
 * Cuánto tiene que cambiar el solape EXIGIDO (en px) para que valga la pena
 * rehacer el observador. Un píxel, el mismo criterio de holgura subpixel que ya
 * usan las familias del candado de navegador: por debajo de eso el observador
 * en vigor y el que se crearía piden lo mismo, y recrearlo sería trabajo sin
 * consecuencia. Es lo que impide que un arrastre de redimensionado recree
 * observadores por cada píxel de ratón.
 */
const HOLGURA_DE_RECALCULO_PX = 1;

/**
 * Revela un nodo (una vez, o de ida y vuelta con once: false) cuando cruza el
 * viewport, vía IntersectionObserver.
 *
 * `rootMargin` (D7 de la spec de navegación fluida): por defecto
 * "0px 0px -12% 0px", es decir, el borde INFERIOR del área de intersección
 * se encoge un 12% hacia arriba. El observer dispara antes de que la pieza
 * toque el borde real del viewport -- cuando su recorrido visual ya lleva un
 * 12% de avance. El porqué es perceptivo, no técnico: una entrada que
 * arranca justo cuando el usuario empieza a mirarla se lee como un retraso
 * (la interfaz "reacciona tarde" a que ya está ahí); una entrada que ya
 * lleva un tramo recorrido cuando el usuario la mira de lleno se lee como
 * calma, como si llevara un rato en marcha. Es la misma idea de D1 (la
 * sensación de lentitud/serenidad no se consigue secuestrando el scroll,
 * sino haciendo que cada pieza tenga ya vida propia cuando se la mira).
 * `rootMargin` es la única forma de conseguir ese adelanto sin duplicar el
 * `IntersectionObserver` ni tocar `threshold` (que mide OTRA cosa: cuánta
 * área del nodo, no del viewport, tiene que solaparse).
 *
 * `-12%` en vez de un valor en píxeles: un porcentaje escala con la altura
 * real del viewport (dvh), así que el adelanto es proporcionalmente el mismo
 * en un móvil de 667px que en un escritorio de 1440px -- un valor fijo en
 * píxeles sería un adelanto ínfimo en pantallas altas y desproporcionado en
 * las cortas. Se aplica solo al borde INFERIOR (el que se cruza al hacer
 * scroll hacia abajo, el gesto dominante de esta landing): los otros tres
 * bordes se dejan en 0 para no alterar el comportamiento en los ejes que
 * `useReveal` no usa hoy (todos sus consumidores actuales observan scroll
 * vertical descendente).
 *
 * EL UMBRAL ES CONSCIENTE DE LA ALTURA desde la ola U (2026-09-08, decisión del
 * dueño sobre la crítica externa #21): lo que se le pide al observador no es el
 * 0,2 declarado sino `umbralConscienteDeLaAltura(alto, ventana, umbral)`, que
 * lo conserva en las piezas pequeñas y lo baja en las grandes para que la banda
 * de scroll en la que una pieza puede estar asomando y apagada no dependa de su
 * tamaño. El porqué, el censo que lo motivó y el valor del tope están en el
 * docblock de `RETRASO_MAXIMO_DEL_UMBRAL`.
 *
 * Y SE RECALCULA, porque el alto del objetivo NO es un dato del montaje. Medido
 * sobre el build servido instrumentando `observe()`: en la carga los siete
 * objetivos se observan una sola vez y su alto en ese instante es EXACTAMENTE
 * el asentado (delta 0,00 px en los siete), así que la primera cuenta es buena;
 * pero al redimensionar de 1440x900 a 390x844 nadie vuelve a llamar a
 * `observe()` y los altos se mueven hasta un +463 % (`Journey ScStepsRow` 165 ->
 * 928, `Story ScGrid` 938 -> 2231, `ScStatementText` 376 -> 110). Un umbral
 * calculado solo al montar quedaría mintiendo justo donde más importa. De ahí el
 * `ResizeObserver`: mide la caja del propio objetivo y solo rehace el observador
 * cuando el solape exigido cambiaría más de `HOLGURA_DE_RECALCULO_PX`
 * (`threshold` no se puede cambiar en caliente). Con `once: true` --siete de los
 * ocho consumidores-- los dos observadores se desconectan en cuanto la pieza se
 * revela, así que el coste vive solo en la ventana de tiempo en la que la pieza
 * todavía está por revelar.
 *
 * LÍMITE DECLARADO: un cambio de ALTO de ventana que no reflowee al objetivo
 * (arrastrar el borde inferior en escritorio, la barra de direcciones de un
 * móvil) no mueve ninguna caja observada y no dispara el recálculo, así que el
 * tope se queda calculado contra la altura anterior. El error es proporcional
 * --el tope es el 1 % de la ventana, o sea el 1 % de la diferencia-- y ninguna
 * de las dos direcciones deja una pieza apagada más de eso.
 */
export function useReveal<T extends Element>(
  opts: { threshold?: number; once?: boolean; rootMargin?: string } = {},
): { ref: (node: T | null) => void; revealed: boolean } {
  const {
    threshold = UMBRAL_DE_REVELADO,
    once = true,
    rootMargin = "0px 0px -12% 0px",
  } = opts;
  const [revealed, setRevealed] = useState(false);
  const obs = useRef<IntersectionObserver | null>(null);
  const medidor = useRef<ResizeObserver | null>(null);
  const umbralEnVigor = useRef(threshold);

  const ref = useCallback(
    (node: T | null) => {
      obs.current?.disconnect();
      medidor.current?.disconnect();
      /* Se suelta la referencia ademas de desconectar: `conecta()` desconecta
         el observador en vigor antes de crear el suyo --lo necesita cuando
         quien la llama es el `ResizeObserver`-- y sin esto el observador
         anterior recibiria DOS `disconnect()` por un solo cambio de nodo. Lo
         vigila el caso «desconecta el observer anterior al reobservar un nodo
         distinto», que cuenta las llamadas. */
      obs.current = null;
      if (!node) return;

      const conecta = (): void => {
        obs.current?.disconnect();
        const umbral = umbralConscienteDeLaAltura(
          node.getBoundingClientRect().height,
          window.innerHeight,
          threshold,
        );
        umbralEnVigor.current = umbral;
        obs.current = new IntersectionObserver(
          (entries) => {
            // LA ULTIMA ENTRADA DEL LOTE, no la primera (P0 de la critica
            // externa #21, 2026-09-08). `IntersectionObserver` no entrega una
            // entrada por invocacion: entrega un LOTE con todos los cambios
            // acumulados desde la ultima entrega, en orden cronologico. Si el
            // maquetado se mueve entre el `observe()` de abajo y esa primera
            // entrega -- lo que hace la correccion del punto de lectura al
            // conmutar el tema, un rAF anidado tras montar la rama nueva --, el
            // lote llega con DOS registros del mismo nodo: el obsoleto de la
            // geometria vieja primero y el vigente despues. Leyendo
            // `entries[0]` se descartaba el vigente, `revealed` se quedaba en
            // falso con la pieza en pantalla, y como el observador solo vuelve
            // a hablar cuando se CRUZA el umbral -- y el ratio ya estaba por
            // encima --, no llegaba ninguna entrada mas: el bloque no se
            // pintaba hasta salir del todo y volver a entrar.
            // Este observador vigila EXACTAMENTE un nodo (`disconnect()` antes
            // de cada `observe()`), asi que todas las entradas del lote son del
            // mismo objetivo y la ultima es, por definicion, el estado vigente.
            const entry = entries[entries.length - 1];
            if (entry.isIntersecting) {
              setRevealed(true);
              if (once) {
                obs.current?.disconnect();
                medidor.current?.disconnect();
              }
            } else if (!once) setRevealed(false);
          },
          { threshold: umbral, rootMargin },
        );
        obs.current.observe(node);
      };

      conecta();

      // Sin `ResizeObserver` no se recalcula nada y el umbral se queda con la
      // geometria del montaje: es el caso de jsdom -- donde ademas no hay
      // layout, asi que el umbral es el declarado y ningun test existente
      // cambia de comportamiento -- y el de cualquier navegador sin la API.
      if (typeof ResizeObserver === "undefined") return;
      medidor.current = new ResizeObserver(() => {
        const alto = node.getBoundingClientRect().height;
        const ideal = umbralConscienteDeLaAltura(
          alto,
          window.innerHeight,
          threshold,
        );
        // La comparacion es en PIXELES DE SOLAPE EXIGIDO, no en umbrales: dos
        // umbrales muy distintos sobre una pieza baja piden casi lo mismo, y es
        // lo que se pide --no el numero-- lo que el lector nota.
        if (
          Math.abs(ideal - umbralEnVigor.current) * alto <=
          HOLGURA_DE_RECALCULO_PX
        )
          return;
        conecta();
      });
      medidor.current.observe(node);
    },
    [threshold, once, rootMargin],
  );

  return { ref, revealed };
}
