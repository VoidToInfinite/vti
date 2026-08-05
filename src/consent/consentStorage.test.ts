import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { STORAGE_REGISTRY } from "@/config/cookies";
import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  clearConsent,
  readConsent,
  writeConsent,
} from "./consentStorage";
import type { ConsentDecision, ConsentRecord } from "./consentTypes";

const NOW = 1_700_000_000_000; // fecha fija arbitraria, controlada por parámetro (nunca Date real)
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("consentStorage", () => {
  it("CONSENT_STORAGE_KEY coincide con un id declarado en STORAGE_REGISTRY", () => {
    expect(
      STORAGE_REGISTRY.some((entry) => entry.id === CONSENT_STORAGE_KEY),
    ).toBe(true);
  });

  it("sin ningún registro previo, readConsent devuelve null", () => {
    expect(readConsent(NOW)).toBeNull();
  });

  it("descarta un registro con version distinta de CONSENT_VERSION", () => {
    const record: ConsentRecord = {
      version: CONSENT_VERSION + 1,
      timestamp: NOW,
      categories: { necessary: true, analytics: true, marketing: true },
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));

    expect(readConsent(NOW)).toBeNull();
  });

  it("descarta un registro con más de CONSENT_MAX_AGE_DAYS días de antigüedad", () => {
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      timestamp: NOW - (CONSENT_MAX_AGE_DAYS * DAY_MS + 1),
      categories: { necessary: true, analytics: false, marketing: false },
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));

    expect(readConsent(NOW)).toBeNull();
  });

  it("conserva un registro justo por debajo del techo de antigüedad", () => {
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      timestamp: NOW - (CONSENT_MAX_AGE_DAYS * DAY_MS - 1),
      categories: { necessary: true, analytics: true, marketing: false },
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));

    expect(readConsent(NOW)).not.toBeNull();
  });

  it("un JSON inválido se descarta y devuelve null sin lanzar", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{ esto no es JSON");

    expect(() => readConsent(NOW)).not.toThrow();
    expect(readConsent(NOW)).toBeNull();
  });

  it("un registro con forma inesperada (categorías incompletas) se descarta", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, timestamp: NOW }),
    );

    expect(readConsent(NOW)).toBeNull();
  });

  it("ida y vuelta (writeConsent + readConsent) preserva las categorías", () => {
    const decision: ConsentDecision = {
      necessary: true,
      analytics: true,
      marketing: false,
    };
    writeConsent(decision, NOW);

    const read = readConsent(NOW);
    expect(read).not.toBeNull();
    expect(read?.categories).toEqual(decision);
    expect(read?.version).toBe(CONSENT_VERSION);
    expect(read?.timestamp).toBe(NOW);
  });

  it("necessary se fuerza a true al leer aunque el registro almacenado diga false", () => {
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      timestamp: NOW,
      categories: { necessary: false, analytics: false, marketing: false },
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));

    expect(readConsent(NOW)?.categories.necessary).toBe(true);
  });

  it("writeConsent no lanza si localStorage.setItem lanza (cuota llena / modo privado)", () => {
    // vi.spyOn sobre la INSTANCIA `window.localStorage` no intercepta la
    // llamada real en jsdom (el método vive en el prototipo, no en la
    // instancia); hay que espiar `Storage.prototype` para que el mock
    // sustituya de verdad la implementación que usa `writeConsent`.
    // Verificado: con el spy sobre la instancia este test pasaba en falso
    // incluso habiendo quitado el try/catch de producción.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() =>
      writeConsent(
        { necessary: true, analytics: false, marketing: false },
        NOW,
      ),
    ).not.toThrow();
  });

  it("clearConsent borra el registro y una lectura posterior devuelve null", () => {
    writeConsent({ necessary: true, analytics: true, marketing: true }, NOW);
    expect(readConsent(NOW)).not.toBeNull();

    clearConsent();

    expect(readConsent(NOW)).toBeNull();
  });
});
