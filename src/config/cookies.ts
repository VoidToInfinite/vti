/**
 * Registro declarativo de TODO lo que este sitio escribe en el equipo del
 * visitante.
 *
 * Fuente de verdad única para tres consumidores que, si cada uno mantuviera
 * su propia lista, divergirían a la primera incorporación:
 *
 *   1. el panel de preferencias de consentimiento,
 *   2. la tabla de almacenamiento de la política de privacidad,
 *   3. los tests que impiden que se añada almacenamiento sin declararlo.
 *
 * NOTA LEGAL, medida y no supuesta (spec §1.1 H5): a fecha de hoy este
 * registro contiene EXCLUSIVAMENTE almacenamiento exento de consentimiento.
 * El art. 22.2 LSSI-CE exceptúa lo estrictamente necesario para prestar el
 * servicio pedido por el usuario, y la Guía de cookies de la AEPD (ed. julio
 * 2023) lista la personalización de interfaz ELEGIDA POR EL PROPIO USUARIO
 * entre esos supuestos: `vti-theme` y `vti-lang` solo se escriben cuando la
 * persona pulsa el conmutador de tema o el selector de idioma. `vti-consent`
 * guarda la decisión sobre el propio consentimiento, que por definición no
 * puede requerirlo.
 *
 * Las categorías `analytics` y `marketing` existen y están VACÍAS. No es un
 * descuido: es el estado real del sitio (cero scripts de terceros, cero
 * cookies HTTP, comprobado con grep sobre `src`, `app` y `public`). Existen
 * para que el día que entre una tecnología no exenta tenga un sitio evidente
 * donde declararse y un gate por el que pasar (`hasConsent`), en vez de
 * colarse sin que nadie la vea.
 */

/** Categorías de consentimiento, en el orden en que se muestran al usuario. */
export const CONSENT_CATEGORIES = [
  "necessary",
  "analytics",
  "marketing",
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

/**
 * La única categoría no conmutable. Su interruptor se pinta marcado y
 * deshabilitado: fingir que se puede rechazar lo que no se puede rechazar es
 * el patrón oscuro que la guía de la AEPD señala expresamente.
 */
export const ALWAYS_ON_CATEGORY: ConsentCategory = "necessary";

export interface StorageEntry {
  /** Identificador literal escrito en el equipo. Es también la clave i18n. */
  readonly id: string;
  readonly category: ConsentCategory;
  readonly kind: "localStorage" | "cookie";
  /**
   * Duración en días, o `null` si persiste hasta que la persona la borra.
   * `localStorage` no caduca por sí solo: `null` es el valor honesto para
   * esas entradas, no un cero ni un número inventado.
   */
  readonly durationDays: number | null;
  /** Titular del almacenamiento. `"first-party"` = el propio sitio. */
  readonly provider: "first-party";
}

/**
 * El nombre legible y la finalidad de cada entrada NO viven aquí: viven en
 * el namespace i18n `consent`, bajo `Consent.storage.<id>.name` y
 * `Consent.storage.<id>.purpose`, porque son copia de interfaz y tienen que
 * existir en los dos idiomas como todo lo demás.
 */
export const STORAGE_REGISTRY: readonly StorageEntry[] = [
  {
    id: "vti-theme",
    category: "necessary",
    kind: "localStorage",
    durationDays: null,
    provider: "first-party",
  },
  {
    id: "vti-lang",
    category: "necessary",
    kind: "localStorage",
    durationDays: null,
    provider: "first-party",
  },
  {
    id: "vti-consent",
    category: "necessary",
    kind: "localStorage",
    durationDays: 365,
    provider: "first-party",
  },
] as const;

/** Entradas declaradas para una categoría, en orden de declaración. */
export function storageByCategory(
  category: ConsentCategory,
): readonly StorageEntry[] {
  return STORAGE_REGISTRY.filter((entry) => entry.category === category);
}
