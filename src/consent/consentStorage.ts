import { ALWAYS_ON_CATEGORY, CONSENT_CATEGORIES } from "@/config/cookies";
import type { ConsentDecision, ConsentRecord } from "./consentTypes";

/**
 * Persistencia versionada del consentimiento (spec D13).
 *
 * `readConsent`/`writeConsent`/`clearConsent` son las ÚNICAS funciones de
 * este fichero que tocan `localStorage`, y las tres lo hacen siempre dentro
 * de un `try/catch` y comprobando `typeof window !== "undefined"`: con
 * `output: "export"` el HTML se prerenderiza sin `window`, y en runtime real
 * `localStorage` puede lanzar (modo privado de Safari, cuota llena). Un
 * fallo aquí nunca puede tumbar la página — en el peor caso el banner
 * reaparece en la siguiente carga, que es un fallo abierto aceptable, no un
 * crash.
 */

/**
 * Debe coincidir con el `id` de la entrada `vti-consent` de
 * `STORAGE_REGISTRY` (`src/config/cookies.ts`) — esa lista es la fuente de
 * verdad única de lo que este sitio escribe en el equipo. No se importa el
 * valor de ahí porque `cookies.ts` no expone el string suelto, solo el
 * array completo; en su lugar, `consentStorage.test.ts` ata este literal
 * contra `STORAGE_REGISTRY` para que un cambio en uno sin el otro rompa el
 * test en vez de divergir en silencio.
 */
export const CONSENT_STORAGE_KEY = "vti-consent";

export const CONSENT_VERSION = 1;

/**
 * Techo de vigencia del consentimiento, en días. La Guía de cookies de la
 * AEPD (ed. julio 2023) fija el techo de referencia en 24 meses; un año
 * queda holgadamente dentro de ese límite y envejece mejor que fijar el
 * techo exacto (spec D13). Sin ninguna tecnología no exenta desplegada hoy
 * (H5), este parámetro no afecta a nadie todavía — existe para el día en
 * que sí haya algo que gatear.
 */
export const CONSENT_MAX_AGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Valida la forma completa de un valor desconocido leído de `localStorage`
 *  antes de confiar en él como `ConsentRecord`. JSON.parse solo garantiza
 *  "es JSON válido", no "tiene la forma que espero" — un registro escrito
 *  por una versión futura o corrompido a mano no debe ni acercarse a un
 *  cast. */
function isConsentRecordShape(value: unknown): value is ConsentRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.version !== "number") return false;
  if (typeof record.timestamp !== "number") return false;
  if (typeof record.categories !== "object" || record.categories === null) {
    return false;
  }
  const categories = record.categories as Record<string, unknown>;
  return CONSENT_CATEGORIES.every(
    (category) => typeof categories[category] === "boolean",
  );
}

/**
 * Lee el registro de consentimiento vigente, o `null` si no hay nada
 * utilizable: sin registro, JSON inválido, forma inesperada, `version`
 * distinta de `CONSENT_VERSION`, o más de `CONSENT_MAX_AGE_DAYS` días desde
 * `timestamp`. **Nunca lanza.**
 *
 * Recibe `now` por parámetro (en vez de leer `Date.now()` internamente) para
 * que los tests puedan controlar el paso del tiempo sin mockear `Date`
 * globalmente.
 *
 * Regla dura (spec D13/D11): al leer, `ALWAYS_ON_CATEGORY` (`necessary`) se
 * fuerza a `true` en el resultado aunque el registro almacenado diga
 * `false`. No es una categoría conmutable, así que un registro manipulado a
 * mano en las DevTools no puede apagarla.
 */
export function readConsent(now: number): ConsentRecord | null {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isConsentRecordShape(parsed)) return null;
  if (parsed.version !== CONSENT_VERSION) return null;

  const ageMs = now - parsed.timestamp;
  if (ageMs > CONSENT_MAX_AGE_DAYS * DAY_MS) return null;

  return {
    ...parsed,
    categories: { ...parsed.categories, [ALWAYS_ON_CATEGORY]: true },
  };
}

/**
 * Persiste una decisión de consentimiento con la marca de tiempo `now`
 * (mismo motivo que en `readConsent`: controlable desde tests sin mockear
 * `Date`). Tolera que `localStorage` lance (modo privado de Safari, cuota
 * llena): captura el error y sigue sin persistir nada — un fallo al guardar
 * no puede tumbar la página, aunque signifique que el banner vuelva a
 * aparecer en la próxima carga.
 */
export function writeConsent(decision: ConsentDecision, now: number): void {
  if (typeof window === "undefined") return;

  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: now,
    categories: decision,
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ver docblock: fallo de persistencia tolerado a propósito.
  }
}

/** Borra el registro de consentimiento. Mismo blindaje que las dos
 *  funciones anteriores: nunca lanza. */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Ver docblock de writeConsent.
  }
}
