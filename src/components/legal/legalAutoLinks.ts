import { EMAIL_ADDRESS, links } from "@/config/links";

/**
 * Destinos que la prosa legal ESCRIBE como texto y que tienen que llegar al
 * lector como enlace (crítica #13, T1).
 *
 * EL DEFECTO QUE CIERRA, medido en navegador sobre el build servido:
 * `hello@voidtoinfinite.com` aparecía en el CUERPO de `/aviso-legal` y de
 * `/privacidad` como texto plano (`main a[href^="mailto:"]` = 0) mientras el
 * PIE de esas mismas páginas sí lo llevaba enlazado (= 1), y la misma
 * dirección SÍ era `mailto:` en la home. Y `www.aepd.es` —la autoridad ante
 * la que la propia política te dice que puedes reclamar— tampoco lo era
 * (`a[href*=aepd]` = 0). Afordancia invertida: lo accionable no lo parecía,
 * justo en los dos puntos donde el documento pide actuar.
 *
 * POR QUÉ ESTE MECANISMO Y NO OTRO. `LegalDocument.tsx` es un renderer de
 * DATOS: los documentos son árboles JSON y el candado de paridad de
 * `locales.test.ts` compara rutas recursivas, así que cualquier cambio en la
 * FORMA de un bloque hay que hacerlo simétrico en los dos idiomas. Las tres
 * vías posibles y por qué gana esta:
 *
 *   (a) Un `kind` de bloque nuevo (`{kind:"p", links:[...]}`) obligaría a
 *       reescribir las dos entradas de JSON afectadas en los dos idiomas y a
 *       mantener a mano la correspondencia texto ↔ enlace. Además NO cubriría
 *       el correo de la ficha `entity`, que no sale del JSON sino de
 *       `LEGAL_ENTITY.contactEmail` (`src/config/legal.ts`).
 *   (b) Un marcado ligero dentro del texto (`[[link:email]]…[[/link]]`),
 *       resuelto por el renderer al estilo de `PLACEHOLDER`. Es el precedente
 *       del repo, pero exige EDITAR las cadenas legales de los dos idiomas
 *       para insertar la marca — y el encargo prohíbe tocar el contenido
 *       legal. Tampoco cubre la ficha `entity`.
 *   (c) ESTA: el renderer reconoce, en el texto YA RESUELTO, los literales
 *       que este registro declara. Es el mismo mecanismo que
 *       `splitPlaceholderMarkers` (un centinela que el código busca en
 *       tiempo de ejecución para envolverlo en un elemento, regla 30 de
 *       `RULES.md`), aplicado a un centinela que además es prosa legítima.
 *       Consecuencias: CERO ediciones en `legal.json` — así que la paridad
 *       es/en se conserva por construcción y no hay ni una palabra del
 *       contenido legal que pueda cambiar —, y cobertura automática de las
 *       DOS procedencias del correo (el párrafo de «Tus derechos», que sale
 *       del JSON, y la fila «Correo de contacto» de la ficha `entity`, que
 *       sale de la config).
 *
 * El precio declarado de (c): es IMPLÍCITO. Toda aparición de estos literales
 * en el cuerpo de un documento legal pasa a ser enlace, la quiera quien la
 * escribió o no. Es deseable en los tres sitios donde hoy ocurre, y el
 * registro es corto y está aquí a la vista precisamente para que ampliarlo
 * sea una decisión y no un efecto colateral.
 */

/**
 * El host de la AEPD tal y como está ESCRITO en el texto legal de los dos
 * idiomas (`Legal.privacy.sections.<reclamacion>`), sin esquema.
 *
 * Es a la vez el literal que se busca en el documento y la base del `href`:
 * el destino se DERIVA del texto (`https://` + este host) en lugar de
 * escribirse aparte, para que un enlace no pueda apuntar a un sitio distinto
 * del que el documento nombra.
 */
export const AEPD_HOST = "www.aepd.es";

export interface LegalAutoLink {
  /** Literal que aparece en el texto del documento. */
  readonly text: string;
  readonly href: string;
  /** `true` = abandona el sitio: `target="_blank"` + aviso de pestaña nueva. */
  readonly external: boolean;
}

/**
 * Registro único de lo que se enlaza dentro de la prosa legal.
 *
 * El correo NO es `external` a pesar de llevar esquema: un `mailto:` delega
 * en la aplicación de correo, no abre una pestaña — mismo criterio ya
 * razonado en `Footer.tsx` para el correo del pie, que por eso tampoco lleva
 * `target="_blank"` ni el aviso de `Common.Nav.newTab`. No se anuncia un
 * cambio de contexto que no ocurre.
 *
 * Los dos destinos se derivan de su fuente de verdad, nunca se reescriben:
 * el correo de `links.email`/`EMAIL_ADDRESS` (`src/config/links.ts`, regla 13
 * de `RULES.md`), y la AEPD de `AEPD_HOST`, el mismo literal que el texto
 * legal contiene.
 *
 * POR QUÉ LA AEPD NO VIVE EN `src/config/links.ts`, que es donde a primera
 * vista tocaría: ese módulo es el mapa de DESTINOS NAVEGABLES del sitio (CTA,
 * navegación y pie) y su conjunto de claves está cerrado por un contrato
 * `toEqual` en `links.test.ts` — añadir una clave allí obliga a actualizar
 * ese test en el mismo commit (regla 40). La AEPD no es un destino de la
 * navegación: es una CITA dentro de un documento legal, sin ningún consumidor
 * fuera de esta carpeta. Vive junto a su único consumidor.
 */
export const LEGAL_AUTO_LINKS: readonly LegalAutoLink[] = [
  { text: EMAIL_ADDRESS, href: links.email, external: false },
  { text: AEPD_HOST, href: `https://${AEPD_HOST}`, external: true },
];

/** Un tramo de texto legal, enlazado o no. */
export interface LegalTextPiece {
  readonly text: string;
  readonly link: LegalAutoLink | null;
}

/**
 * Parte un texto en tramos alrededor de las apariciones literales de los
 * destinos declarados. Función pura y exportada a propósito, igual que
 * `splitPlaceholderMarkers`: se testea aparte de cualquier render.
 *
 * Recorre de izquierda a derecha eligiendo SIEMPRE la aparición más temprana;
 * a igualdad de posición gana el literal más largo, para que un destino que
 * fuera prefijo de otro no se quedara con el trozo del otro. Hoy los dos
 * literales son disjuntos, así que ese desempate no se ejerce en producción
 * — está para que ampliar el registro no exija revisar el algoritmo.
 */
export function splitAutoLinks(
  text: string,
  targets: readonly LegalAutoLink[] = LEGAL_AUTO_LINKS,
): LegalTextPiece[] {
  const pieces: LegalTextPiece[] = [];
  let rest = text;

  while (rest !== "") {
    let best: { index: number; link: LegalAutoLink } | null = null;
    for (const link of targets) {
      if (link.text === "") continue;
      const index = rest.indexOf(link.text);
      if (index === -1) continue;
      const mejor =
        best === null ||
        index < best.index ||
        (index === best.index && link.text.length > best.link.text.length);
      if (mejor) best = { index, link };
    }

    if (best === null) {
      pieces.push({ text: rest, link: null });
      break;
    }
    if (best.index > 0) {
      pieces.push({ text: rest.slice(0, best.index), link: null });
    }
    pieces.push({ text: best.link.text, link: best.link });
    rest = rest.slice(best.index + best.link.text.length);
  }

  /* Texto vacío: un único tramo vacío sin enlace, misma forma que devuelve
     `splitPlaceholderMarkers("")`. El bucle de arriba no llega a entrar. */
  if (pieces.length === 0) pieces.push({ text, link: null });

  return pieces;
}
