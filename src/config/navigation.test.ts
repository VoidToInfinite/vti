import { describe, it, expect } from "vitest";
import { NAV_GROUPS, type NavGroupKey, type NavItem } from "./navigation";
import { links } from "./links";
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
    { key: "story", href: "#story", kind: "section" },
    { key: "journey", href: "#journey", kind: "section" },
    { key: "features", href: "#features", kind: "section" },
    { key: "contact", href: "#contact", kind: "section" },
  ],
  discover: [
    { key: "learning", href: "#features", kind: "feature" },
    { key: "imagination", href: "#features", kind: "feature" },
    { key: "gaming", href: "#features", kind: "feature" },
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

  it("todo item 'section' tiene un href que empieza por #", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.kind === "section") {
          expect(
            item.href,
            `${group.key}.${item.key} deberia ser un ancla de seccion`,
          ).toMatch(/^#/);
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
