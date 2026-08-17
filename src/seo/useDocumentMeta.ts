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
 */
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
    document.title = fullTitle;
  }, [fullTitle]);

  useEffect(() => {
    if (description === undefined) return;

    /*
     * La etiqueta ya existe SIEMPRE en producción: `buildMetadata()` emite
     * `description` en la home y en las dos legales, y `app/not-found.tsx`
     * declara la suya. El camino de creación existe para el documento que no
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
