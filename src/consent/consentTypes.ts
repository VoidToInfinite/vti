import type { ConsentCategory } from "@/config/cookies";

/**
 * Estado de consentimiento por categoría. Contiene SIEMPRE las tres claves
 * de `CONSENT_CATEGORIES` (`cookies.ts`): un `Record` sobre un tipo unión
 * cerrado obliga a TypeScript a exigir las tres, así que no puede
 * construirse una decisión que olvide una categoría nueva el día que se
 * añada una a `cookies.ts`.
 */
export type ConsentDecision = Record<ConsentCategory, boolean>;

/**
 * Forma persistida en `localStorage` (clave `vti-consent`, D13 de la spec).
 * Versionado y con marca de tiempo para poder invalidar registros antiguos
 * o incompatibles sin tener que entender su contenido — ver
 * `consentStorage.ts`.
 */
export interface ConsentRecord {
  readonly version: number;
  /** Epoch en milisegundos del momento de la decisión. */
  readonly timestamp: number;
  readonly categories: ConsentDecision;
}
