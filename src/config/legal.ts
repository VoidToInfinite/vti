/**
 * Identidad del responsable del tratamiento y versionado de los documentos
 * legales.
 *
 * Decisión del usuario, checkpoint "dato que solo yo puedo dar" (spec
 * `docs/superpowers/specs/2026-08-04-legal-seo-consentimiento-design.md`,
 * tabla de decisiones del arranque, 2026-08-05): "Responsable del tratamiento
 * / titular legal" y "NIF/CIF, domicilio, correo de contacto legal" quedan
 * explícitamente `PLACEHOLDER` — el usuario no los aportó y pidió no
 * inventarlos. Mismo criterio que `src/config/links.ts` ya aplica a las
 * URLs legales sin confirmar: un valor plausible-pero-inventado es peor que
 * su ausencia marcada.
 *
 * CONSECUENCIA, no cosmética: sin identidad real del responsable, `/privacidad`
 * no cumple el art. 13.1.a RGPD ("la identidad y los datos de contacto del
 * responsable") ni `/aviso-legal` cumple el art. 10.a LSSI-CE ("nombre o
 * denominación social... domicilio... dirección de correo electrónico").
 * Las dos páginas legales quedan por tanto ESTRUCTURALMENTE completas pero
 * NO PUBLICABLES hasta que estos campos se rellenen con datos reales — es el
 * único bloqueante real de esta entrega (spec §9.1). `hasPendingLegalData()`
 * es el candado programático de ese hecho: mientras exista un solo campo sin
 * rellenar, la función devuelve `true` y cualquier consumidor futuro (un
 * gate de build, un aviso en el propio sitio) puede engancharse a ella en vez
 * de repetir la comprobación campo a campo.
 *
 * `dpo: null` NO es un dato pendiente: es un valor deliberado ("no se ha
 * designado Delegado de Protección de Datos", sección `delegado` de
 * `/privacidad`, art. 13.1.b RGPD) que puede seguir siendo `null` incluso
 * después de rellenar el resto — por eso `hasPendingLegalData()` no lo
 * evalúa como pendiente.
 */

/** Marcador de dato aún no aportado. Se renderiza visible, nunca se
 *  sustituye por un valor plausible (misma doctrina que `links.ts:1-9`). */
export const PLACEHOLDER = "POR_COMPLETAR";

export interface LegalEntity {
  readonly name: string;
  readonly legalForm: string;
  readonly taxId: string;
  readonly address: string;
  readonly registry: string;
  readonly contactEmail: string;
  /** `null` = no se ha designado Delegado de Protección de Datos. */
  readonly dpo: string | null;
}

export const LEGAL_ENTITY: LegalEntity = {
  name: PLACEHOLDER,
  legalForm: PLACEHOLDER,
  taxId: PLACEHOLDER,
  address: PLACEHOLDER,
  registry: PLACEHOLDER,
  contactEmail: PLACEHOLDER,
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
  /* 2.0.0, no 1.0.1: la revisión del 2026-08-08 no corrigió una errata, cambió
     el contenido sustantivo de los dos documentos. La privacidad pierde todo
     lo relativo al consentimiento (retirado del sitio) y describe el correo de
     contacto como lo que es; el aviso legal absorbe las cláusulas de uso del
     retirado `/terminos`. Un visitante que leyera la versión 1.0.0 no puede
     dar por buena su lectura, y eso es exactamente lo que un salto de mayor
     comunica. */
  privacy: { version: "2.0.0", updated: "2026-08-08" },
  legalNotice: { version: "2.0.0", updated: "2026-08-08" },
};

/** Campos de `LEGAL_ENTITY` que identifican al responsable y por tanto
 *  pueden estar "pendientes". `dpo` queda fuera a propósito: es una
 *  declaración legítima (`null` = no designado), no un dato desconocido. */
const IDENTIFYING_FIELDS = [
  "name",
  "legalForm",
  "taxId",
  "address",
  "registry",
  "contactEmail",
] as const satisfies readonly (keyof LegalEntity)[];

/** `true` mientras quede algún dato identificativo de `LEGAL_ENTITY` sin
 *  aportar. `dpo` no entra en esta comprobación: `null` es un valor
 *  legítimo, no una ausencia de dato (ver docblock del módulo). */
export function hasPendingLegalData(): boolean {
  return IDENTIFYING_FIELDS.some(
    (field) => LEGAL_ENTITY[field] === PLACEHOLDER,
  );
}
