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

/*
 * El registro de precargas por tema (2026-08-17). Hasta esta revision el
 * parametro era "las precargas del arte OSCURO" y el arte claro no lo
 * necesitaba: viajaba en el HTML estatico y el Float de React hoisteaba su
 * precarga solo. Desde que `HeroBackdrop` dejo de emitir arte en el HTML, esa
 * via desaparecio y las dos ramas dependen de este script.
 *
 * Estos tests EJECUTAN el string generado en el DOM real de jsdom, no
 * inspeccionan su texto: lo que importa no es que la plantilla contenga
 * ciertas letras, sino que el navegador acabe con las precargas de UN tema y
 * solo uno. Un candado de texto pasaria igual con un bucle que inyectase las
 * dos ramas.
 */
describe("buildThemeBootstrapScript: precargas del tema resuelto y solo de ese", () => {
  const LIGHT = [{ srcSet: "/claro-a.webp 1x", sizes: "100vw" }];
  const DARK = [
    { srcSet: "/oscuro-a.webp 1x", sizes: "100vw" },
    { srcSet: "/oscuro-b.webp 1x", sizes: "50vw" },
  ];

  function runWithStoredTheme(stored: string): HTMLLinkElement[] {
    const original = window.localStorage.getItem(STORAGE_KEYS.theme);
    document.head
      .querySelectorAll('link[rel="preload"][imagesrcset]')
      .forEach((node) => node.remove());
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, stored);
      new Function(buildThemeBootstrapScript({ light: LIGHT, dark: DARK }))();
      return Array.from(
        document.head.querySelectorAll<HTMLLinkElement>(
          'link[rel="preload"][imagesrcset]',
        ),
      );
    } finally {
      if (original === null) {
        window.localStorage.removeItem(STORAGE_KEYS.theme);
      } else {
        window.localStorage.setItem(STORAGE_KEYS.theme, original);
      }
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    }
  }

  it("con el tema oscuro resuelto inyecta las precargas oscuras, ninguna clara", () => {
    const links = runWithStoredTheme("dark");
    expect(links.map((l) => l.getAttribute("imagesrcset"))).toEqual(
      DARK.map((p) => p.srcSet),
    );
    expect(links.map((l) => l.getAttribute("imagesizes"))).toEqual(
      DARK.map((p) => p.sizes),
    );
  });

  it("con el tema claro resuelto inyecta las precargas claras, ninguna oscura -- la regresion que el parametro viejo no podia evitar", () => {
    const links = runWithStoredTheme("light");
    expect(links.map((l) => l.getAttribute("imagesrcset"))).toEqual(
      LIGHT.map((p) => p.srcSet),
    );
  });

  it("solo la PRIMERA precarga lleva fetchpriority alto: es la candidata a LCP y el resto no debe competir con ella", () => {
    const links = runWithStoredTheme("dark");
    expect(links[0].getAttribute("fetchpriority")).toBe("high");
    expect(links[1].getAttribute("fetchpriority")).toBeNull();
  });

  it("un tema sin entrada en el registro no inyecta nada ni lanza", () => {
    const original = window.localStorage.getItem(STORAGE_KEYS.theme);
    document.head
      .querySelectorAll('link[rel="preload"][imagesrcset]')
      .forEach((node) => node.remove());
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
      expect(() =>
        new Function(buildThemeBootstrapScript({ light: LIGHT }))(),
      ).not.toThrow();
      expect(
        document.head.querySelectorAll('link[rel="preload"][imagesrcset]'),
      ).toHaveLength(0);
      // Y lo importante: el atributo de tema SI se fijo. La precarga es
      // accesoria; el anti-flash no puede caerse con ella.
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
