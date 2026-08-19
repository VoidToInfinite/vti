import { describe, it, expect } from "vitest";
import {
  NAV_GROUPS,
  navGroupsFor,
  navLocale,
  type NavGroupKey,
  type NavItem,
} from "./navigation";
import { links } from "./links";
import { DEFAULT_LOCALE, LOCALES, routePath } from "./site";
import esCommon from "@/i18n/locales/es/common.json";
import enCommon from "@/i18n/locales/en/common.json";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";

/**
 * Candado del modelo de navegación compartido. `Navbar` y `Footer` construyen
 * su interfaz a partir de `NAV_GROUPS` en tareas paralelas a esta, así que el
 * riesgo real no es que el array esté vacío -- es que alguien renombre una
 * `key` (aquí o en el JSON de traducciones) y deje una etiqueta vacía en la
 * interfaz sin que nada falle en tiempo de compilación. Por eso el candado
 * que importa no es "los grupos existen": es que la etiqueta de cada grupo y
 * de cada item se pueda RESOLVER DE VERDAD contra los locales reales, según
 * la tabla de resolución que documenta `navigation.ts`.
 */

type JsonValue = string | JsonTree;
type JsonTree = { [key: string]: JsonValue };

/** Valor de una ruta con notación de puntos, o undefined si no existe. */
function valueAt(tree: JsonTree, path: string): string | undefined {
  const found = path
    .split(".")
    .reduce<JsonValue | undefined>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as JsonTree)[key]
          : undefined,
      tree,
    );
  return typeof found === "string" ? found : undefined;
}

/** Ruta i18n que resuelve la etiqueta de un item, según la tabla de
    resolución documentada en `navigation.ts`. */
function itemLabelPath(item: NavItem): string {
  switch (item.kind) {
    case "section":
      return `Common.Navigation.${item.key}`;
    case "feature":
      return `Home.features.${item.key}.title`;
    case "external":
      return `Common.Nav.${item.key}`;
  }
}

const GROUP_ORDER: readonly NavGroupKey[] = [
  "onSite",
  "discover",
  "resources",
  "community",
];

const EXPECTED_ITEMS: Record<
  NavGroupKey,
  readonly { key: string; href: string; kind: NavItem["kind"] }[]
> = {
  onSite: [
    { key: "story", href: "/#story", kind: "section" },
    { key: "journey", href: "/#journey", kind: "section" },
    { key: "features", href: "/#features", kind: "section" },
    { key: "contact", href: "/#contact", kind: "section" },
  ],
  discover: [
    { key: "learning", href: "/#feature-learning-title", kind: "feature" },
    {
      key: "imagination",
      href: "/#feature-imagination-title",
      kind: "feature",
    },
    { key: "gaming", href: "/#feature-gaming-title", kind: "feature" },
  ],
  resources: [{ key: "sdk", href: links.sdk, kind: "external" }],
  // Grupo nuevo (auditoría premium, tarea 6): Discord y GitHub, ambos
  // externos, mismo mecanismo que resources.sdk (ver navigation.ts).
  // LinkedIn se suma el 2026-08-13 al cerrar la Fase 0, el último del grupo:
  // los dos primeros apuntan al proyecto, este a la persona que responde de
  // él (`links.ts`, docblock de `linkedin`).
  community: [
    { key: "discord", href: links.discord, kind: "external" },
    { key: "github", href: links.github, kind: "external" },
    { key: "linkedin", href: links.linkedin, kind: "external" },
  ],
};

describe("NAV_GROUPS", () => {
  it("expone los cuatro grupos, en orden onSite, discover, resources, community", () => {
    expect(NAV_GROUPS.map((group) => group.key)).toEqual(GROUP_ORDER);
  });

  it.each(GROUP_ORDER)(
    "el grupo '%s' tiene exactamente los items esperados, en orden",
    (groupKey) => {
      const group = NAV_GROUPS.find((g) => g.key === groupKey);
      expect(group).toBeDefined();
      expect(group?.items).toEqual(EXPECTED_ITEMS[groupKey]);
    },
  );

  it("todo item 'external' tiene un href absoluto que empieza por https://", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.kind === "external") {
          expect(
            item.href,
            `${group.key}.${item.key} deberia ser un href absoluto https://`,
          ).toMatch(/^https:\/\//);
        }
      }
    }
  });

  /*
   * ESTE CANDADO EXIGÍA EXACTAMENTE EL BUG QUE LA CRÍTICA #6 ENCONTRÓ. Pedía
   * que las anclas de sección empezaran por `#`, y una ancla relativa se
   * resuelve contra el documento actual: en `/privacidad`, `/aviso-legal` y la
   * 404 no existe ningún `#story`, así que los 7 enlaces de sección del pie no
   * hacían absolutamente nada — verificado con clic real, `scrollY` sin
   * moverse. En la 404 eran 15 de 17 enlaces inertes.
   *
   * Ahora exige `/#`, que funciona en los DOS casos: dentro de la home el
   * navegador lo resuelve contra el mismo documento y se comporta igual que
   * antes; fuera de ella navega a la home y aterriza en la sección.
   *
   * Se ata también que NO empiecen por `#` a secas, y no solo que empiecen por
   * `/#`: sin esa segunda mitad, un futuro `href: "#story"` seguiría pasando
   * el `toMatch` si alguien relajara la expresión regular.
   */
  it("todo item 'section' tiene un href ABSOLUTO a la home (`/#`), no un ancla relativa", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.kind === "section" || item.kind === "feature") {
          expect(
            item.href,
            `${group.key}.${item.key}: un ancla relativa no navega desde /privacidad, /aviso-legal ni la 404`,
          ).toMatch(/^\/#/);
          expect(
            item.href.startsWith("#"),
            `${group.key}.${item.key} vuelve a ser un ancla relativa`,
          ).toBe(false);
        }
      }
    }
  });

  describe("las etiquetas se resuelven de verdad contra los locales", () => {
    const locales = [
      { lang: "es", common: esCommon as JsonTree, home: esHome as JsonTree },
      { lang: "en", common: enCommon as JsonTree, home: enHome as JsonTree },
    ];

    it.each(
      locales.flatMap(({ lang, common }) =>
        GROUP_ORDER.map((groupKey) => ({ lang, common, groupKey })),
      ),
    )(
      "$lang: el titulo del grupo '$groupKey' resuelve Common.Nav.$groupKey",
      ({ common, groupKey }) => {
        const value = valueAt(common, `Common.Nav.${groupKey}`);
        expect(value).toBeDefined();
        expect(value?.trim()).not.toBe("");
      },
    );

    it.each(
      locales.flatMap(({ lang, common, home }) =>
        NAV_GROUPS.flatMap((group) =>
          group.items.map((item) => ({ lang, common, home, group, item })),
        ),
      ),
    )(
      "$lang: el item '$group.key/$item.key' resuelve su etiqueta i18n",
      ({ common, home, item }) => {
        const path = itemLabelPath(item);
        const tree = item.kind === "feature" ? home : common;
        const value = valueAt(tree, path);
        expect(value, `no se resolvio "${path}"`).toBeDefined();
        expect(value?.trim()).not.toBe("");
      },
    );
  });
});

/*
 * Candado de destinos DISTINGUIBLES (Ola B, 2026-08-16). Hasta esa fecha los
 * tres ítems de «Descubre» apuntaban los tres a `/#features`, y contando las
 * tres superficies que consumen este modelo (Navbar, NavSheet, Footer) eso
 * eran 12 enlaces con 4 etiquetas distintas cayendo en un único sitio.
 *
 * Lo que se bloquea no es "que los href sean estos" —eso ya lo hace la tabla
 * EXPECTED_ITEMS de arriba— sino la propiedad de la que depende que el menú
 * informe: que dos etiquetas distintas no compartan destino.
 *
 * Validado con el bug inyectado a propósito: devolviendo `learning` a
 * `/#features` en `navigation.ts`, este test cae en rojo nombrando el destino
 * duplicado; restaurado, vuelve a verde.
 */
/*
 * EL MODELO CONSERVA EL IDIOMA DE LA PÁGINA (crítica #12, P0).
 *
 * Lo que se bloquea aquí es exactamente lo que el build medía en `out/en.html`
 * antes de esta entrega: **21 `href="/#..."` y cero enlaces internos con `/en`**
 * en la home inglesa. Cada `href` del modelo lo pintan TRES superficies
 * (`Navbar`, `NavSheet`, `Footer`), así que un solo destino mal prefijado en
 * este array son tres enlaces rotos en la página, no uno.
 *
 * Se afirma sobre el modelo y no solo sobre el render de cada superficie
 * porque es aquí donde vive la propiedad: si la derivación se rompiera, las
 * tres superficies se romperían a la vez y por la misma causa.
 */
describe("navGroupsFor: el idioma de la página viaja en cada href", () => {
  it("navLocale reconoce los dos idiomas del sitio y cae en el por defecto con cualquier otra cosa", () => {
    for (const locale of LOCALES) {
      expect(navLocale(locale)).toBe(locale);
    }
    expect(navLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(navLocale("")).toBe(DEFAULT_LOCALE);
    // Una etiqueta regional no es ninguno de los dos idiomas declarados: se
    // resuelve al de por defecto en vez de fabricar un prefijo inexistente.
    expect(navLocale("en-US")).toBe(DEFAULT_LOCALE);
  });

  /*
   * La rama castellana tiene que ser EL MISMO OBJETO, no una copia con los
   * mismos valores: es lo que garantiza que ninguna página castellana pueda
   * cambiar de href por esta entrega, ni siquiera por un error de la
   * derivación. `toBe` (identidad), nunca `toEqual`.
   */
  it("en castellano devuelve NAV_GROUPS tal cual, por identidad", () => {
    expect(navGroupsFor("es")).toBe(NAV_GROUPS);
    expect(navGroupsFor(undefined)).toBe(NAV_GROUPS);
  });

  it("en inglés prefija TODO destino interno con la home inglesa, y ninguno se queda en /#", () => {
    const internos = navGroupsFor("en")
      .flatMap((group) => group.items)
      .filter((item) => item.kind !== "external");

    expect(internos.length, "el modelo se quedó sin destinos internos").toBe(7);
    for (const item of internos) {
      expect(
        item.href.startsWith(`${routePath("home", "en")}#`),
        `${item.key} manda al visitante inglés a la home castellana: ${item.href}`,
      ).toBe(true);
      expect(item.href.startsWith("/#")).toBe(false);
      expect(item.href).not.toContain("//");
    }
  });

  it("los externos no se tocan: su href es de otro sitio y el idioma de éste no le dice nada", () => {
    const externos = navGroupsFor("en")
      .flatMap((group) => group.items)
      .filter((item) => item.kind === "external");
    const originales = NAV_GROUPS.flatMap((group) => group.items).filter(
      (item) => item.kind === "external",
    );

    expect(externos.map((item) => item.href)).toEqual(
      originales.map((item) => item.href),
    );
  });

  /*
   * El FRAGMENTO es la parte que consumen `navAnchorTargetId`/
   * `focusNavAnchorTarget` (`navAnchorFocus.ts`) para mover el foco al destino,
   * y `useActiveSection` para casar la sección visible. Si la derivación lo
   * tocara -- aunque solo fuera un carácter -- el foco dejaría de llegar en la
   * rama inglesa sin que ningún test de href se enterara.
   */
  it("el fragmento (#id) es idéntico en los dos idiomas: solo cambia el prefijo", () => {
    const fragmento = (href: string): string => href.slice(href.indexOf("#"));
    const es = NAV_GROUPS.flatMap((group) => group.items).filter(
      (item) => item.kind !== "external",
    );
    const en = navGroupsFor("en")
      .flatMap((group) => group.items)
      .filter((item) => item.kind !== "external");

    expect(en.map((item) => fragmento(item.href))).toEqual(
      es.map((item) => fragmento(item.href)),
    );
  });

  it("la estructura no se mueve: mismos grupos, mismas claves y mismos kind, en el mismo orden", () => {
    const forma = (
      grupos: readonly { key: NavGroupKey; items: readonly NavItem[] }[],
    ) =>
      grupos.map((group) => ({
        key: group.key,
        items: group.items.map((item) => ({ key: item.key, kind: item.kind })),
      }));

    expect(forma(navGroupsFor("en"))).toEqual(forma(NAV_GROUPS));
  });

  /* Memoizado por idioma (ver el docblock de `navGroupsFor`): las tres
     superficies llaman en cada render, y la hoja además parte el resultado en
     dos mitades. */
  it("devuelve el mismo array en llamadas sucesivas del mismo idioma", () => {
    expect(navGroupsFor("en")).toBe(navGroupsFor("en"));
  });
});

describe("destinos distinguibles", () => {
  it("dos ítems de navegación no comparten href, salvo los externos", () => {
    const internos = NAV_GROUPS.flatMap((group) => group.items).filter(
      (item) => item.kind !== "external",
    );
    const porHref = new Map<string, string[]>();
    internos.forEach((item) => {
      porHref.set(item.href, [...(porHref.get(item.href) ?? []), item.key]);
    });
    const duplicados = [...porHref.entries()].filter(
      ([, claves]) => claves.length > 1,
    );
    expect(
      duplicados,
      `estos destinos los comparten varias etiquetas, así que el menú ofrece una elección que no existe: ${duplicados
        .map(([href, claves]) => `${href} <- ${claves.join(", ")}`)
        .join(" | ")}`,
    ).toHaveLength(0);
  });
});
