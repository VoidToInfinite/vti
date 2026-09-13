"use client";

import { useEffect } from "react";
import { pageTitle } from "./metadata";

/**
 * EL TÍTULO (Y LA DESCRIPCIÓN) DEL DOCUMENTO SIGUEN AL IDIOMA ACTIVO.
 *
 * Mecanismo ÚNICO del repo para esto. Nació en `LegalDocument.tsx` (ola D,
 * 2026-08-16) como un `useEffect` local que solo cubría las dos páginas
 * legales, y una crítica externa señaló el resultado: en `/privacidad` con el
 * inglés activo la pestaña decía «Privacy policy · VoidToInfinite», pero en
 * la home y en la 404 seguía diciendo el castellano horneado en build. El
 * visitante leía una corrección aplicada a la parte secundaria del sitio y no
 * a la principal. La causa raíz de esa incoherencia no era el efecto de las
 * legales, sino que ese efecto era LOCAL: nada permitía reutilizarlo, así que
 * las otras dos rutas se quedaron sin él. Este módulo es ese efecto,
 * extraído; sus tres consumidores (home, 404 y las dos legales) comparten
 * ahora la misma implementación, y con ella el mismo formato de título — dos
 * copias del efecto divergirían al primer retoque.
 *
 * POR QUÉ EN CLIENTE Y NO EN LA `metadata` DE LA RUTA: `next.config.ts`
 * declara `output: "export"`, así que la metadata de cada ruta se hornea UNA
 * vez, en castellano (`src/i18n/config.ts`: `lng: "es"`), y el idioma lo
 * elige el visitante DESPUÉS, en cliente. El HTML estático no se toca — es lo
 * que ven los rastreadores y es correcto sin JavaScript. Esto es coherencia
 * de UX para quien ya está en la página, no SEO: no crea URLs por idioma, no
 * declara `hreflang` y no cambia una sola etiqueta del HTML servido.
 *
 * ALCANCE DECLARADO: `title` y `meta[name="description"]`. `og:*`,
 * `twitter:*`, `og:locale` y `hreflang` siguen en castellano y sin
 * alternativa, a propósito: son metadatos para terceros (rastreadores, vistas
 * previas al compartir), que leen el HTML servido y nunca ejecutan este
 * efecto. Cambiarlos aquí no tendría ningún efecto observable para ellos.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ EL TÍTULO SE RE-AFIRMA Y LA DESCRIPCIÓN NO
 * (regresión medida el 2026-08-17 contra el build de producción)
 *
 * SÍNTOMA: en una carga DIRECTA de la ruta del aviso legal con el inglés ya
 * guardado en el equipo del visitante, el `<h1>` decía «Legal notice» y la
 * pestaña se quedaba en «Aviso legal · VoidToInfinite» para siempre. Por
 * navegación de cliente (home, cambiar a inglés, ir a la legal) el MISMO
 * código daba el título correcto — la contradicción que obligó a medir en vez
 * de razonar sobre el código.
 *
 * TRAZA MEDIDA (Chrome real sobre el `out/` servido; `t` en ms desde el
 * inicio de la navegación; instrumentado el setter de `document.title` Y el
 * de `nodeValue`, porque React escribe por el segundo y no pasa por el
 * primero):
 *
 *   t=20,1   el parser inserta el `<title>` horneado: «Aviso legal · …»
 *   t=71,0   document.title = «Aviso legal · …»   ← ESTE efecto (i18n aún es)
 *   t=96,4   document.title = «Legal notice · …»  ← ESTE efecto, ya en inglés
 *   t=99,6   Text.nodeValue = «Aviso legal · …»   ← React, NO este efecto
 *   t=300 / 1200 / 3000: sigue en castellano.
 *
 * La home tenía el MISMO defecto, nunca reportado: 124,0 (es) → 172,8 (en) →
 * 186,6 React lo pisa. Y por navegación de cliente el orden se INVIERTE
 * (React a t=69706,8, este efecto a t=69741,5), que es exactamente por qué
 * ese camino nunca falló y por qué el defecto parecía "de las legales".
 *
 * CAUSA RAÍZ: el `<title>` tiene DOS dueños que escriben el mismo nodo.
 *   1. Este hook, con el texto del idioma activo.
 *   2. React, al commitear la `metadata` de la ruta — horneada en castellano
 *      en build. Su rama de `title` no compara el texto: toma
 *      `getElementsByTagName("title")[0]` y le aplica sus props sin más
 *      (`node_modules/react-dom/cjs/react-dom-client.development.js`, commit
 *      de fibras hoistable, `case "title"` — adopta el nodo existente salvo
 *      que ya sea suyo, y llama a `setInitialProperties` incondicionalmente).
 * Y ese commit no es simultáneo a la hidratación: la metadata de Next es un
 * Server Component ASÍNCRONO (`Next.Metadata` dentro de `MetadataBoundary`,
 * `node_modules/next/dist/lib/metadata/metadata.js`), así que su commit llega
 * DESPUÉS de los efectos pasivos del árbol en una carga directa, y ANTES en
 * una navegación de cliente. Como `fullTitle` ya no vuelve a cambiar tras ese
 * pisado, el efecto no se re-ejecuta: el castellano queda como valor final.
 *
 * LA SOLUCIÓN, Y POR QUÉ ESTA Y NO OTRA: un `MutationObserver` acotado a
 * `document.head`, vivo SOLO mientras el componente está montado, que
 * re-afirma el título cuando el documento deja de decir lo que este hook
 * decidió. No depende de CUÁNDO llegue el pisado, que es justo la variable
 * que no controlamos.
 *   - Descartado «volver a escribir tras un temporizador o un frame»: aquí el
 *     pisado llegó 3,2 ms después, pero su instante depende de cuándo resuelva
 *     el chunk de metadata. Sería una carrera con otro número, no un arreglo.
 *   - Descartado «pintar nuestro propio `<title>` con React»: habría dos
 *     elementos y el navegador usa el PRIMERO, que seguiría siendo el de Next.
 *   - Descartado «quitar `title` de la metadata de la ruta»: el HTML estático
 *     es lo que ven los rastreadores y tiene que llevar su título horneado.
 *
 * LA DESCRIPCIÓN NO NECESITA EL MISMO CANDADO, y la razón está medida, no
 * supuesta: para `<meta>` React empareja los candidatos por atributos —
 * `content` incluido — y, si ninguno coincide, CREA el suyo y lo añade al
 * `head` en vez de pisar el existente (mismo fichero, `case "meta"`). Medido:
 * con el castellano guardado el documento acaba con UNA etiqueta; con el
 * inglés, con DOS (la nuestra en inglés primero, la de React en castellano
 * después). Es decir, en el único camino donde React escribe después que
 * nosotros, su escritura va a OTRO nodo siempre que el contenido difiera — y
 * cuando no difiere, pisarlo es indistinguible de no hacerlo. Ese nodo
 * duplicado queda DECLARADO como observación abierta (nada visible para el
 * visitante, y los rastreadores leen el HTML servido, que trae una sola
 * etiqueta), no como algo que este cambio resuelva.
 */

/**
 * Dueño actual del `<title>`: la última instancia del hook cuyo efecto corrió.
 *
 * Solo el dueño re-afirma desde su observador. Sin esto, dos consumidores
 * montados a la vez con títulos distintos entrarían en un ping-pong infinito
 * — cada escritura notifica al observador del otro, que responde escribiendo,
 * y las notificaciones de `MutationObserver` son microtareas: el hilo quedaría
 * inutilizable. Hoy cada ruta monta exactamente un consumidor, así que este
 * testigo no cambia ningún comportamiento observable; existe porque el riesgo
 * lo introduce el propio observador y el modo de fallo sería un navegador
 * colgado, no un test en rojo.
 */
let titleOwner: symbol | null = null;

export interface DocumentMetaInput {
  /** Título de la página SIN sufijo de marca: `pageTitle()` lo añade. */
  readonly title: string;
  /**
   * Descripción de la página. Opcional: si no se pasa, la etiqueta
   * `meta[name="description"]` del HTML servido se deja intacta (no se
   * vacía).
   */
  readonly description?: string;
}

export function useDocumentMeta({
  title,
  description,
}: DocumentMetaInput): void {
  // Fuera del efecto y sin `useMemo`: es una concatenación de dos cadenas, y
  // el valor COMPUESTO (no el título crudo) es la dependencia correcta -- así
  // el efecto no vuelve a escribir el título cuando cambia algo que no
  // altera el resultado final.
  const fullTitle = pageTitle(title);

  useEffect(() => {
    const owner = Symbol("documentMetaTitleOwner");
    titleOwner = owner;

    // Escribe SOLO si el documento no dice ya lo que toca. Es la mitad que
    // hace que el observador no pueda realimentarse: su propia escritura deja
    // el título igual al esperado, así que la notificación que provoca no
    // vuelve a escribir. El bucle termina siempre, en una iteración.
    const applyTitle = (): void => {
      if (document.title !== fullTitle) document.title = fullTitle;
    };

    applyTitle();

    /*
     * `subtree` + `characterData` no son opcionales: el pisado medido no
     * reemplaza el elemento `<title>` ni llama al setter de `document.title`,
     * sino que reescribe el NODO DE TEXTO de dentro (React escribe
     * `firstChild.nodeValue` cuando el elemento tiene un único hijo de texto).
     * Sin `characterData` el observador no vería nada; sin `subtree` tampoco,
     * porque el nodo mutado es descendiente, no el propio `head`. `childList`
     * cubre además el caso en que alguien sustituya el elemento entero.
     */
    const observer = new MutationObserver(() => {
      if (titleOwner !== owner) return;
      applyTitle();
    });
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (titleOwner === owner) titleOwner = null;
    };
  }, [fullTitle]);

  useEffect(() => {
    if (description === undefined) return;

    /*
     * La etiqueta ya existe SIEMPRE en producción: `buildMetadata()` emite
     * `description` en la home y en las dos legales, y el fichero de
     * convención de la 404 (`app/global-not-found.tsx` desde el 2026-09-06,
     * antes `app/not-found.tsx`) declara la suya. El camino de creación existe
     * para el documento que no
     * la traiga (jsdom en los tests, y cualquier ruta futura que se olvide de
     * declararla) y se limpia solo: si este efecto la creó, este efecto la
     * retira al desmontar. Nunca se retira la que venía en el HTML -- eso
     * dejaría al documento sin descripción al navegar a otra ruta.
     */
    const existing = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const meta = existing ?? document.createElement("meta");
    if (existing === null) {
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    return () => {
      if (existing === null) meta.remove();
    };
  }, [description]);
}
