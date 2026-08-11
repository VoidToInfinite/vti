import { describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "@/config/storage";
import {
  buildThemeBootstrapScript,
  resolveInitialTheme,
  THEME_ATTRIBUTE,
} from "./resolveTheme";

describe("resolveInitialTheme (decisión D-C: storage gana a prefers-color-scheme)", () => {
  it("storage 'dark' gana aunque el sistema prefiera claro", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });

  it("storage 'light' gana aunque el sistema prefiera oscuro", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
  });

  it("sin storage, decide el sistema: prefers-color-scheme dark", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
  });

  it("sin storage, decide el sistema: prefers-color-scheme claro (default)", () => {
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("un valor de storage inválido (no 'light'/'dark') se trata como ausente", () => {
    expect(resolveInitialTheme("azul", true)).toBe("dark");
    expect(resolveInitialTheme("", false)).toBe("light");
  });
});

describe("buildThemeBootstrapScript", () => {
  it("reutiliza el CUERPO SERIALIZADO de resolveInitialTheme, no una copia manual", () => {
    // Candado contra la lección de la casa: dos copias iguales de la misma
    // lógica se separan al primer retoque. Si alguien reescribe el script a
    // mano en vez de reusar resolveInitialTheme.toString(), este test lo
    // detecta sin necesidad de ejecutar el script (que exigiría un DOM real).
    const script = buildThemeBootstrapScript();
    expect(script).toContain(resolveInitialTheme.toString());
  });

  it("referencia la clave real de STORAGE_KEYS.theme, no un literal reescrito", () => {
    const script = buildThemeBootstrapScript();
    expect(script).toContain(JSON.stringify(STORAGE_KEYS.theme));
  });

  it("fija el mismo atributo que exporta THEME_ATTRIBUTE", () => {
    const script = buildThemeBootstrapScript();
    expect(script).toContain(JSON.stringify(THEME_ATTRIBUTE));
    expect(script).toContain("setAttribute(");
  });

  it("está envuelto en try/catch: un localStorage/matchMedia que lanza no debe propagar", () => {
    const script = buildThemeBootstrapScript();
    expect(script.startsWith("(function(){try{")).toBe(true);
    expect(script.trim().endsWith("}catch(e){}})();")).toBe(true);
  });

  it("el script generado es JS válido y produce el atributo esperado en un DOM real", () => {
    // Ejecuta el string literal (no resolveInitialTheme importado) para
    // probar EXACTAMENTE lo que el navegador correría desde <head>.
    const original = window.localStorage.getItem(STORAGE_KEYS.theme);
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
      // Ejecuta el script REAL tal cual se sirve en <head>, no una
      // reimplementación de test.
      new Function(buildThemeBootstrapScript())();
      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(
        "dark",
      );
    } finally {
      if (original === null) {
        window.localStorage.removeItem(STORAGE_KEYS.theme);
      } else {
        window.localStorage.setItem(STORAGE_KEYS.theme, original);
      }
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    }
  });
});
