import { useCallback, useRef, useState } from "react";

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
 * `useReveal` no usa hoy (todos sus 5 consumidores actuales observan scroll
 * vertical descendente).
 *
 * Verificado (lectura de código, los 5) que el valor por defecto no cambia
 * la firma de llamada de ninguno de los 5 consumidores actuales
 * (SectionBeam, Contact, Features, Story, Journey): todos llaman
 * `useReveal<T>()` sin opciones, así que solo cambia CUÁNDO dispara el
 * observer (antes), nunca SI dispara -- su contrato de revealed/once sigue
 * idéntico, y ninguno depende del instante exacto del cruce (sus tests
 * mockean IntersectionObserver e invocan el callback a mano, sin usar
 * rootMargin en la aserción). Suite ejecutada y en verde para 3 de los 5
 * (SectionBeam.test.tsx, Story.test.tsx, Journey.test.tsx); Contact.tsx y
 * Features.tsx no compilan en este momento por un backtick suelto dentro de
 * un comentario CSS en SUS PROPIOS ficheros (bug de otro flujo en curso,
 * sin relación con este cambio -- ver el informe de la entrega), así que
 * `Contact.test.tsx`/`Features.test.tsx` no se pudieron ejecutar todavía.
 */
export function useReveal<T extends Element>(
  opts: { threshold?: number; once?: boolean; rootMargin?: string } = {},
): { ref: (node: T | null) => void; revealed: boolean } {
  const {
    threshold = 0.2,
    once = true,
    rootMargin = "0px 0px -12% 0px",
  } = opts;
  const [revealed, setRevealed] = useState(false);
  const obs = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      obs.current?.disconnect();
      if (!node) return;
      obs.current = new IntersectionObserver(
        (entries) => {
          // LA ULTIMA ENTRADA DEL LOTE, no la primera (P0 de la critica
          // externa #21, 2026-09-08). `IntersectionObserver` no entrega una
          // entrada por invocacion: entrega un LOTE con todos los cambios
          // acumulados desde la ultima entrega, en orden cronologico. Si el
          // maquetado se mueve entre el `observe()` de arriba y esa primera
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
            if (once) obs.current?.disconnect();
          } else if (!once) setRevealed(false);
        },
        { threshold, rootMargin },
      );
      obs.current.observe(node);
    },
    [threshold, once, rootMargin],
  );

  return { ref, revealed };
}
