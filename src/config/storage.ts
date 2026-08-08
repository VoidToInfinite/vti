/**
 * Registro declarativo de TODO lo que este sitio escribe en el equipo del
 * visitante.
 *
 * Fuente de verdad única para dos consumidores que, si cada uno mantuviera su
 * propia lista, divergirían a la primera incorporación:
 *
 *   1. la tabla de almacenamiento de la política de privacidad,
 *   2. los tests que impiden que se añada almacenamiento sin declararlo.
 *
 * SUSTITUYE a `src/config/cookies.ts` (retirado el 2026-08-08). Aquel fichero
 * modelaba además tres CATEGORÍAS de consentimiento (`necessary`, `analytics`,
 * `marketing`), de las que solo la primera llegó a tener entradas: el sitio no
 * ha tenido nunca una sola cookie HTTP ni un solo script de terceros. El
 * nombre `cookies` describía por tanto algo que no existe, y la maquinaria de
 * consentimiento que sostenía —banner, panel de preferencias y la propia
 * entrada `vti-consent`— pedía permiso para almacenamiento que la ley EXIME de
 * pedirlo.
 *
 * NOTA LEGAL, medida y no supuesta: este registro contiene EXCLUSIVAMENTE
 * almacenamiento exento de consentimiento. El art. 22.2 LSSI-CE exceptúa lo
 * estrictamente necesario para prestar el servicio expresamente solicitado por
 * el usuario, y la Guía de cookies de la AEPD (ed. julio 2023) lista la
 * personalización de interfaz ELEGIDA POR EL PROPIO USUARIO entre esos
 * supuestos: `vti-theme` y `vti-lang` solo se escriben cuando la persona pulsa
 * el conmutador de tema o el selector de idioma.
 *
 * REGLA DURA para quien añada algo aquí: este fichero solo admite
 * almacenamiento técnico exento. El día que entre una tecnología NO exenta
 * (analítica con cookies, píxeles, publicidad), declararla aquí no basta —
 * hace falta volver a introducir un mecanismo de consentimiento previo, y esa
 * decisión no puede tomarse añadiendo una línea a un array.
 */

export interface StorageEntry {
  /** Identificador literal escrito en el equipo. Es también la clave i18n. */
  readonly id: string;
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
 * El nombre legible y la finalidad de cada entrada NO viven aquí: viven en el
 * namespace i18n `legal`, bajo `Legal.common.storage.<id>.name` y
 * `Legal.common.storage.<id>.purpose`, porque son copia de interfaz y tienen
 * que existir en los dos idiomas como todo lo demás.
 */
export const STORAGE_REGISTRY: readonly StorageEntry[] = [
  {
    id: "vti-theme",
    kind: "localStorage",
    durationDays: null,
    provider: "first-party",
  },
  {
    id: "vti-lang",
    kind: "localStorage",
    durationDays: null,
    provider: "first-party",
  },
] as const;
