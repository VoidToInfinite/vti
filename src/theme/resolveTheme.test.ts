import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "@/config/storage";
import {
  buildThemeBootstrapScript,
  resolveInitialTheme,
  THEME_ATTRIBUTE,
  THEME_COLORS,
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
      // La ruta es load-bearing desde el 2026-08-18 (las precargas solo se
      // emiten en la home), asi que se fija explicitamente en vez de heredar
      // la URL por defecto de jsdom: un cambio de `environmentOptions.jsdom
      // .url` no puede convertir estos casos en un fallo desconcertante.
      window.history.replaceState(null, "", "/");
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
      window.history.replaceState(null, "", "/");
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

/*
 * El type de las precargas AVIF (2026-08-18). Ejecuta el script real: una
 * entrada con type tiene que aterrizar con el atributo (asi un navegador
 * sin AVIF la ignora en vez de descargar de mas) y una sin type, sin el.
 * Validado con bug inyectado real: retirando la linea del type del
 * template, rojo; restaurada, verde.
 */
describe("buildThemeBootstrapScript: el type de la precarga viaja cuando la entrada lo declara", () => {
  it("entrada con type -> link con type; entrada sin type -> link sin el", () => {
    const original = window.localStorage.getItem(STORAGE_KEYS.theme);
    document.head
      .querySelectorAll('link[rel="preload"][imagesrcset]')
      .forEach((node) => node.remove());
    try {
      window.history.replaceState(null, "", "/");
      window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
      new Function(
        buildThemeBootstrapScript({
          dark: [
            { srcSet: "/a.avif 1x", sizes: "100vw", type: "image/avif" },
            { srcSet: "/b.webp 1x", sizes: "100vw" },
          ],
        }),
      )();
      const links = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>(
          'link[rel="preload"][imagesrcset]',
        ),
      );
      expect(links).toHaveLength(2);
      expect(links[0].getAttribute("type")).toBe("image/avif");
      expect(links[1].getAttribute("type")).toBeNull();
    } finally {
      if (original === null) {
        window.localStorage.removeItem(STORAGE_KEYS.theme);
      } else {
        window.localStorage.setItem(STORAGE_KEYS.theme, original);
      }
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
      document.head
        .querySelectorAll('link[rel="preload"][imagesrcset]')
        .forEach((node) => node.remove());
    }
  });
});

/*
 * La ruta acota las precargas (2026-08-18, critica #11). El script viaja en el
 * DOCUMENTO del sitio (`app/RootDocument.tsx` desde el 2026-09-06; entonces,
 * el `app/layout.tsx` unico): se emite en TODAS las rutas, pero el hero solo
 * existe en la home -- en `/privacidad` se medieron 253.833 B de arte que no
 * pinta nunca (41 % de la pagina) y en la 404, cuatro avisos de Chrome
 * "preloaded but not used".
 *
 * Estos casos EJECUTAN el script real en jsdom (no inspeccionan su texto) y
 * conducen `location.pathname` con `history.replaceState`, que es lo que el
 * script lee. Lo que se afirma es el desenlace en el DOM: que fuera de la home
 * no aparece NI UN `<link rel="preload">` del hero, y que aun asi `data-theme`
 * queda puesto -- el anti-flash es del sitio entero, no de la home.
 *
 * Validado con bug inyectado REAL: sustituyendo el ternario de la guarda por
 * el `var p=pl[theme]||[];` anterior, los dos casos de ruta no-home se pusieron
 * en rojo (2 fallos); restaurada la linea, verde otra vez.
 */
describe("buildThemeBootstrapScript: las precargas del hero solo se emiten donde hay hero", () => {
  const HERO = [
    { srcSet: "/hero-a.avif 1x", sizes: "100vw", type: "image/avif" },
    { srcSet: "/hero-b.webp 1x", sizes: "100vw" },
  ];

  function runAtPath(pathname: string): {
    links: HTMLLinkElement[];
    resolvedTheme: string | null;
  } {
    const originalStored = window.localStorage.getItem(STORAGE_KEYS.theme);
    const originalPath = window.location.pathname;
    document.head
      .querySelectorAll('link[rel="preload"][imagesrcset]')
      .forEach((node) => node.remove());
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
      window.history.replaceState(null, "", pathname);
      new Function(buildThemeBootstrapScript({ dark: HERO }))();
      return {
        links: Array.from(
          document.head.querySelectorAll<HTMLLinkElement>(
            'link[rel="preload"][imagesrcset]',
          ),
        ),
        // Se captura ANTES del `finally` que lo limpia: el atributo es la
        // mitad del contrato de este bloque y tiene que poder afirmarse desde
        // el caso de prueba.
        resolvedTheme: document.documentElement.getAttribute(THEME_ATTRIBUTE),
      };
    } finally {
      window.history.replaceState(null, "", originalPath);
      if (originalStored === null) {
        window.localStorage.removeItem(STORAGE_KEYS.theme);
      } else {
        window.localStorage.setItem(STORAGE_KEYS.theme, originalStored);
      }
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    }
  }

  it("en la home ('/') emite las precargas del tema resuelto, en orden y con el type intacto", () => {
    const { links, resolvedTheme } = runAtPath("/");
    expect(links.map((l) => l.getAttribute("imagesrcset"))).toEqual(
      HERO.map((p) => p.srcSet),
    );
    expect(links[0].getAttribute("type")).toBe("image/avif");
    expect(links[1].getAttribute("type")).toBeNull();
    expect(links[0].getAttribute("fetchpriority")).toBe("high");
    expect(resolvedTheme).toBe("dark");
  });

  it("en una ruta legal ('/privacidad') no emite NI UNA precarga -- pero deja data-theme puesto igualmente", () => {
    const { links, resolvedTheme } = runAtPath("/privacidad");
    expect(links).toHaveLength(0);
    expect(resolvedTheme).toBe("dark");
  });

  it("en una ruta inexistente (la 404, servida en cualquier path) tampoco -- eran 4 avisos de consola de Chrome", () => {
    const { links, resolvedTheme } = runAtPath("/ruta-que-no-existe");
    expect(links).toHaveLength(0);
    expect(resolvedTheme).toBe("dark");
  });

  it("'/index.html' cuenta como home: es la forma que sirve un host que no canonicaliza el nombre de fichero", () => {
    // `npx serve out` (`pnpm start`) es el entorno de verificacion del repo, y
    // no todo host reescribe /index.html -> /. Sin esta segunda forma, la home
    // perderia su precarga justo donde se la mide.
    const { links } = runAtPath("/index.html");
    expect(links.map((l) => l.getAttribute("imagesrcset"))).toEqual(
      HERO.map((p) => p.srcSet),
    );
  });
});

/*
 * El script es el UNICO DUENO de `meta[name="theme-color"]` (2026-09-03,
 * critica #16, hallazgo P1 del evaluador tecnico B1). Hasta esa fecha la
 * etiqueta la horneaba `viewport.themeColor` en `app/layout.tsx` (el root
 * layout unico de entonces; hoy el `viewport` vive en `app/rootMetadata.ts`,
 * sin `themeColor`) y este script
 * se limitaba a reescribir su `content`; medido en Chrome real contra el build
 * de produccion con `vti-theme = "dark"`, eso dejaba DOS etiquetas (React 19 no
 * lograba adoptar la estatica porque su cache de elementos «hoistable» las
 * indexa por el atributo `content`, que este script acababa de cambiar) y una
 * ventana con la barra del navegador en claro sobre la pagina oscura.
 *
 * Estos casos EJECUTAN el string generado sobre el DOM de jsdom, no inspeccionan
 * su texto: lo que hay que afirmar es el DESENLACE —cuantas etiquetas quedan y
 * con que color— y no que la plantilla contenga ciertas letras. Un candado de
 * texto pasaria igual con un script que insertara una etiqueta por llamada.
 */
describe("buildThemeBootstrapScript: crea y posee UNA sola meta theme-color", () => {
  function runWithStoredTheme(
    stored: string,
    pathname = "/",
  ): HTMLMetaElement[] {
    const originalStored = window.localStorage.getItem(STORAGE_KEYS.theme);
    const originalPath = window.location.pathname;
    try {
      window.history.replaceState(null, "", pathname);
      window.localStorage.setItem(STORAGE_KEYS.theme, stored);
      new Function(buildThemeBootstrapScript())();
      return Array.from(
        document.head.querySelectorAll<HTMLMetaElement>(
          'meta[name="theme-color"]',
        ),
      );
    } finally {
      window.history.replaceState(null, "", originalPath);
      if (originalStored === null) {
        window.localStorage.removeItem(STORAGE_KEYS.theme);
      } else {
        window.localStorage.setItem(STORAGE_KEYS.theme, originalStored);
      }
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    }
  }

  beforeEach(() => {
    // El `<head>` de jsdom sobrevive entre casos: se parte SIEMPRE del estado
    // real del HTML exportado desde este cambio, que es "ninguna etiqueta".
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((node) => node.remove());
  });

  afterEach(() => {
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((node) => node.remove());
  });

  it("sin ninguna etiqueta previa (el HTML de hoy) crea exactamente una, con el color del tema resuelto", () => {
    const metas = runWithStoredTheme("dark");
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute("content")).toBe(THEME_COLORS.dark);
  });

  it("con el tema claro resuelto, la unica etiqueta lleva el color claro", () => {
    const metas = runWithStoredTheme("light");
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute("content")).toBe(THEME_COLORS.light);
  });

  it("con una etiqueta previa (HTML de un build anterior, o un viewport.themeColor repuesto) la ADOPTA en vez de anadir otra", () => {
    // Este es el caso que producia el duplicado medido: una etiqueta estatica
    // en claro y un visitante oscuro. El script tiene que dejar UNA, no dos.
    const previa = document.createElement("meta");
    previa.setAttribute("name", "theme-color");
    previa.setAttribute("content", THEME_COLORS.light);
    document.head.appendChild(previa);

    const metas = runWithStoredTheme("dark");
    expect(metas).toHaveLength(1);
    expect(metas[0]).toBe(previa);
    expect(metas[0].getAttribute("content")).toBe(THEME_COLORS.dark);
  });

  it("dos ejecuciones seguidas del script no acumulan etiquetas", () => {
    runWithStoredTheme("dark");
    const metas = runWithStoredTheme("dark");
    expect(metas).toHaveLength(1);
  });

  it("fuera de la home tambien crea la etiqueta: el anti-flash es del sitio, no de la portada", () => {
    // Las precargas del hero SI se acotan a la home (bloque de arriba); el
    // color de la barra, no. En `/privacidad` la etiqueta tiene que existir
    // igual, o esa ruta se queda sin `theme-color` en ningun momento.
    const metas = runWithStoredTheme("dark", "/privacidad");
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute("content")).toBe(THEME_COLORS.dark);
  });
});
