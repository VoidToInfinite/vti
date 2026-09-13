import type { ReactElement } from "react";

export interface JsonLdScriptProps {
  /** Objeto (o array de objetos) JSON-LD ya construido por `jsonLd.ts`. */
  readonly data: object | readonly object[];
  /** Identificador opcional del `<script>`, útil para localizar el bloque en tests. */
  readonly id?: string;
}

/**
 * Serializa datos estructurados JSON-LD en un `<script type="application/
 * ld+json">`. Server Component a propósito (SIN `"use client"`): no hay
 * estado ni interacción, y mantenerlo en servidor evita mandar JS al cliente
 * para algo que solo el rastreador necesita.
 *
 * El uso de `dangerouslySetInnerHTML` aquí es seguro y deliberado, no un
 * atajo: `data` es SIEMPRE un objeto literal construido en este repo a
 * partir de constantes propias (`src/config/site.ts`, `src/config/links.ts`)
 * — nunca entrada de usuario ni una respuesta de red — así que no hay nada
 * que un atacante pueda inyectar a través de esta prop. Es además la ÚNICA
 * forma correcta de emitir JSON-LD en React: un `<script>{JSON.stringify(
 * data)}</script>` con hijos de texto pasa por el escapado normal de JSX
 * (convierte `"` en `&quot;`, etc.) y produce JSON inválido dentro del
 * `<script>`. `dangerouslySetInnerHTML` es el único punto de la API de
 * React que escribe la cadena tal cual, sin ese escapado de texto.
 */
export function JsonLdScript({ data, id }: JsonLdScriptProps): ReactElement {
  return (
    <script
      {...(id ? { id } : {})}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
