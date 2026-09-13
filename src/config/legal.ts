/**
 * Identidad del responsable del tratamiento y versionado de los documentos
 * legales.
 *
 * HISTORIA DE ESTE FICHERO, en dos actos, porque el segundo solo se entiende
 * con el primero delante:
 *
 * 1. Del 2026-08-05 al 2026-08-12 los seis campos identificativos valieron
 *    `PLACEHOLDER`. El usuario no había aportado los datos y pidió no
 *    inventarlos; `hasPendingLegalData()` devolvía `true` y las dos páginas
 *    legales quedaban estructuralmente completas pero NO PUBLICABLES (spec
 *    `docs/superpowers/specs/2026-08-04-legal-seo-consentimiento-design.md`
 *    §9.1). Ese era el único bloqueante real de aquella entrega.
 *
 * 2. El 2026-08-13 el dueño aportó los datos en sesión y cerró la Fase 0 del
 *    plan premium. La consecuencia NO es solo rellenar seis strings: tres de
 *    los seis campos no tienen valor porque el dato NO PROCEDE, y eso es una
 *    declaración distinta de «todavía no lo sé». El modelo tenía que
 *    distinguirlas, porque `hasPendingLegalData()` las trataba igual y habría
 *    dejado el sitio bloqueado para siempre por datos ya decididos.
 *
 * DATOS APORTADOS (dueño, 2026-08-13, verbatim de la sesión):
 * VoidToInfinite es un proyecto personal de **Daniel Mosquera**, persona
 * física. No hay sociedad, no hay alta de autónomo, no hay actividad
 * económica: el sitio no vende, no anuncia y no ingresa. De ahí las tres
 * declaraciones de «no procede»:
 *
 *   - `registry`: no existe sociedad inscribible en ningún registro público.
 *     Es una imposibilidad material, no una omisión.
 *   - `taxId` y `address`: decisión expresa del dueño de no publicar su DNI
 *     ni su domicilio particular en un sitio que no recaba información
 *     sensible de nadie. Ver el LÍMITE DECLARADO más abajo.
 *
 * LÍMITE DECLARADO, que ningún agente debe «arreglar» por su cuenta: el art.
 * 10.a LSSI-CE exige domicilio y NIF a quien presta un servicio de la
 * sociedad de la información, y ese régimen se activa con la ACTIVIDAD
 * ECONÓMICA. La lectura sobre la que se apoya esta configuración es que un
 * proyecto personal sin actividad económica queda fuera de ese supuesto. Es
 * una lectura fundamentada, NO una certeza confirmada por un profesional, y
 * así consta también en `PRODUCT.md` §10. Si algún día el proyecto ingresa
 * dinero —donaciones, patrocinio, venta, publicidad—, esta decisión hay que
 * volver a tomarla, no heredarla.
 *
 * `dpo: null` es la tercera declaración deliberada del fichero y la más
 * antigua: «no se ha designado Delegado de Protección de Datos» (art. 13.1.b
 * RGPD), no un dato pendiente. Tiene su propio texto en el documento porque
 * dice algo distinto de «no procede».
 *
 * REGLA DURA para quien toque esto: `PLACEHOLDER` sigue existiendo y sigue
 * significando «dato desconocido». Si mañana entra un campo nuevo sin valor
 * real, se marca con `PLACEHOLDER` —nunca con `null`— para que
 * `hasPendingLegalData()` vuelva a bloquear la publicación. `null` es una
 * afirmación sobre el mundo; `PLACEHOLDER` es una ausencia. Confundirlas
 * publica un documento legal incompleto sin que nada avise.
 */

import { EMAIL_ADDRESS } from "@/config/links";

/**
 * Marcador de dato aún no aportado. Se renderiza visible, nunca se sustituye
 * por un valor plausible (misma doctrina que `links.ts:1-9`).
 *
 * CENTINELA DE MÁQUINA, NO PROSA (regla 30 de `RULES.md`): el renderer lo
 * busca literalmente para envolverlo en `<mark>`, así que es idéntico en
 * español y en inglés y NO SE TRADUCE. El texto explicativo dirigido a quien
 * lee vive en la clave i18n `Legal.common.placeholderTitle`.
 *
 * Hoy no queda ninguna aparición en `LEGAL_ENTITY` ni en `legal.json`, pero
 * la constante NO se retira: es el mecanismo con el que un campo futuro sin
 * dato vuelve a bloquear la publicación (ver REGLA DURA del docblock del
 * módulo). `locales.test.ts` ata que su recuento siga siendo cero.
 */
export const PLACEHOLDER = "POR_COMPLETAR";

/**
 * Forma jurídica del responsable, como IDENTIFICADOR, no como texto.
 *
 * Nació siendo el literal "Persona física" y duró unas horas: la verificación
 * en navegador del 2026-08-13 lo pilló pintado EN ESPAÑOL dentro del
 * documento inglés (`/aviso-legal` con `lang="en"` mostraba «Forma jurídica:
 * Persona física»). Los tests no lo vieron porque renderizan en español, que
 * es el idioma en el que la fuga es invisible.
 *
 * Es el mismo defecto que la regla 30 de `RULES.md` describe: prosa metida en
 * el código en vez de en i18n. `name` y `contactEmail` pueden quedarse como
 * literales porque un nombre propio y una dirección de correo no se traducen;
 * una forma jurídica sí.
 */
export type LegalForm = "naturalPerson";

export interface LegalEntity {
  readonly name: string;
  /** Clave, no prosa: la resuelve `Legal.common.legalForm.<valor>`. */
  readonly legalForm: LegalForm;
  /** `null` = no procede: persona física sin actividad económica declarada. */
  readonly taxId: string | null;
  /** `null` = no procede, mismo motivo que `taxId`. */
  readonly address: string | null;
  /** `null` = no procede: no hay sociedad inscribible en registro público. */
  readonly registry: string | null;
  readonly contactEmail: string;
  /** `null` = no se ha designado Delegado de Protección de Datos. */
  readonly dpo: string | null;
}

export const LEGAL_ENTITY: LegalEntity = {
  name: "Daniel Mosquera",
  legalForm: "naturalPerson",
  taxId: null,
  address: null,
  registry: null,
  /* Derivado, no reescrito: es el QUINTO consumidor de `EMAIL_ADDRESS`
     (`src/config/links.ts`), que existe justamente para que la dirección no
     viva a mano en varios sitios (regla 13 de `RULES.md`). Escribirla aquí
     como literal habría dejado el correo de ejercicio de derechos del RGPD
     capaz de divergir en silencio del que el sitio pinta y copia. */
  contactEmail: EMAIL_ADDRESS,
  dpo: null,
};

export interface LegalVersion {
  readonly version: string;
  /** `YYYY-MM-DD`, fecha de la última revisión sustantiva del documento. */
  readonly updated: string;
}

/**
 * Versión y fecha de cada documento legal, fuente única para el `<h1>` de
 * `LegalDocument` y para `sitemap.ts` (`lastModified`, spec D7): el sitemap
 * usa esta fecha en vez de `new Date()` precisamente para no declarar un
 * cambio en cada build cuando el documento no ha cambiado de verdad.
 */
export const LEGAL_VERSIONS: Record<"privacy" | "legalNotice", LegalVersion> = {
  /* 3.0.0, no 2.1.0: la revisión del 2026-08-13 no corrige una errata ni
     añade un matiz. Sustituye la identidad del responsable —que hasta hoy no
     constaba— y describe por primera vez la cadena real de proveedores del
     correo y el plazo de conservación. Quien leyera la versión 2.0.0 no
     puede dar por buena su lectura: no sabía quién respondía de sus datos.
     Eso es exactamente lo que un salto de mayor comunica, mismo criterio que
     razonó el salto 1.0.0 -> 2.0.0 en su día.

     privacy 3.1.0 (2026-09-10, decisión del dueño en la auditoría del sitemap
     del 2026-09-13): el texto de la política cambió después del 13 de agosto
     sin que esta fecha se moviera, y el `<h1>`, el JSON-LD y el sitemap siguieron
     anunciando el 13. Los cambios, todos en la lista de lo que el sitio guarda
     en el equipo del visitante: el 2026-09-02 deja de guardarse el idioma
     (`8eba2f1`); el 2026-09-06 entra la posición de lectura en
     `sessionStorage`, con su fila y su duración de sesión (`58cb80f`,
     `46d8703`, `6a4b322`); el 2026-09-10 esa fila amplía su finalidad a Atrás
     y Adelante (`3ace92f`). MENOR y no mayor: la identidad del responsable y
     las bases jurídicas no cambian, y lo añadido es una entrada técnica que
     se borra al cerrar la pestaña. El aviso legal no tocó su texto desde el
     13 de agosto (su sección de protección de datos remite a la privacidad
     para lo que se guarda en el equipo), así que sigue en 3.0.0.

     privacy 4.0.0 (2026-09-13, mismo día y decisión del dueño): cambia el
     proveedor de alojamiento. La 3.1.0 nombraba a Netlify, Inc. como encargado
     del tratamiento con cláusulas tipo y Marco de Privacidad de Datos, pero
     ese día se midió que producción se servía desde Vercel (`Server: Vercel`,
     despliegue `Production` de `vercel[bot]` en la API de GitHub). MAYOR, por
     el mismo criterio que la 2.0.0 y la 3.0.0: quien leyera la 3.1.0 no puede
     dar por buena su lectura, porque creía saber quién recibe los datos
     técnicos de sus visitas y con qué garantía. El texto nuevo afirma solo lo
     verificado ese día en fuente oficial: Vercel Inc. figura como
     participante activa del Marco en dataprivacyframework.gov, y su acuerdo
     de tratamiento (vercel.com/legal/dpa, efectivo el 31 de marzo de 2026) se
     declara aplicable a los planes Pro y Enterprise; el proyecto usa el plan
     gratuito (dato del dueño), así que no se afirma una relación de encargado
     por contrato. */
  privacy: { version: "4.0.0", updated: "2026-09-13" },
  legalNotice: { version: "3.0.0", updated: "2026-08-13" },
};

/**
 * Campos de `LEGAL_ENTITY` que identifican al responsable y que, por tanto,
 * pueden estar "pendientes".
 *
 * `dpo` queda fuera desde el principio, y desde el 2026-08-13 quedan fuera
 * de facto `taxId`, `address` y `registry`: los cuatro admiten `null` como
 * DECLARACIÓN, no como hueco. Lo que esta lista sigue vigilando es que
 * ninguno de los campos que SÍ tienen que tener valor real se quede con el
 * centinela.
 *
 * `legalForm` también queda fuera, y por un motivo distinto: desde que es un
 * `LegalForm` y no un string libre, el compilador impide que valga
 * `PLACEHOLDER`. Comprobarlo en tiempo de ejecución sería comprobar algo que
 * el tipo ya garantiza.
 */
const IDENTIFYING_FIELDS = [
  "name",
  "taxId",
  "address",
  "registry",
  "contactEmail",
] as const satisfies readonly (keyof LegalEntity)[];

/**
 * `true` mientras quede algún dato identificativo sin aportar.
 *
 * `null` NO cuenta como pendiente: es una declaración deliberada («no
 * procede», ver docblock del módulo). Solo `PLACEHOLDER` bloquea. Hoy
 * devuelve `false` — las dos páginas legales son publicables por primera vez
 * desde que existen.
 */
export function hasPendingLegalData(): boolean {
  return IDENTIFYING_FIELDS.some(
    (field) => LEGAL_ENTITY[field] === PLACEHOLDER,
  );
}
