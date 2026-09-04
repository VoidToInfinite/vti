import { describe, it, expect } from "vitest";
import {
  NAV_BAR_GROUP_KEY,
  NAV_BAR_NARROW_SECTION_KEYS,
  NAV_GROUPS,
  navBarMoreGroupsFor,
  navBarSectionsFor,
  navBarWideSectionsFor,
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
    // `about` se suma el 2026-09-02 (decisión del dueño D2, crítica #15): la
    // quinta sección de la home, hasta entonces alcanzable solo desplazándose.
    // ÚLTIMA porque este grupo va en el orden de la página, y `About` se pinta
    // después de Contacto desde la crítica #6 (ver `HomeSections.tsx`).
    { key: "about", href: "/#about", kind: "section" },
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

    /* Guarda de no-vacuidad: sin ella el bucle de abajo pasaría con el modelo
       vacío. El número sale de `EXPECTED_ITEMS` -- la tabla cerrada de este
       mismo fichero, que se actualiza a propósito con cada destino nuevo
       (regla 40) -- y no de un literal, que caducó en cuanto `about` entró en
       el modelo el 2026-09-02 y dio "expected 8 to be 7". */
    const internosEsperados = Object.values(EXPECTED_ITEMS)
      .flat()
      .filter((item) => item.kind !== "external").length;
    expect(internos.length, "el modelo se quedó sin destinos internos").toBe(
      internosEsperados,
    );
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

/*
 * LA PARTICIÓN QUE PINTA LA BARRA DE ESCRITORIO (decisión D2 del dueño,
 * 2026-09-02, crítica #14): cuatro destinos de sección visibles y el resto tras
 * un único disclosure.
 *
 * LO QUE SE BLOQUEA AQUÍ NO ES "que las dos funciones devuelvan esto", que ya
 * lo cubriría la tabla `EXPECTED_ITEMS` de arriba, sino la propiedad de la que
 * depende que la barra no pierda un destino por el camino: que las dos mitades
 * RECONSTRUYAN `NAV_GROUPS` sin perder ni repetir nada. Un corte que se coma un
 * grupo dejaría enlaces fuera de la barra sin que ningún candado de forma se
 * enterara -- y el pie los seguiría pintando, así que ni siquiera un recuento
 * global de enlaces del sitio lo delataría.
 *
 * Se afirma sobre el MODELO y no sobre el render de la barra porque es aquí
 * donde vive la partición: si se rompiera, se rompería una sola vez y en un
 * solo sitio.
 */
describe("la partición de la barra de escritorio (decisión D2)", () => {
  it("las dos mitades reconstruyen NAV_GROUPS: ni un destino de menos, ni uno repetido", () => {
    const enLaBarra = navBarSectionsFor("es");
    const trasElDesplegable = navBarMoreGroupsFor("es").flatMap(
      (group) => group.items,
    );
    const todos = NAV_GROUPS.flatMap((group) => group.items);

    expect([...enLaBarra, ...trasElDesplegable]).toEqual(todos);
  });

  /*
   * REESCRITO el 2026-09-02 (decisión del dueño D2, crítica #15). Hasta hoy
   * afirmaba que los destinos visibles eran EXACTAMENTE el grupo `onSite`
   * entero, y esa igualdad dejó de describir la barra en cuanto la home tuvo
   * cinco secciones y la barra siguió teniendo sitio para cuatro. Lo que se
   * conserva es la propiedad que importa -- que la barra pinta destinos de
   * sección, los únicos que el scrollspy puede marcar --; lo que cambia es que
   * ahora hay una lista explícita de QUIÉNES caben, y este candado la ata a
   * las cuatro claves y a que `about` NO esté entre ellas.
   *
   * ACOTADO el 2026-09-04 (crítica externa #18, hallazgo O-4): esta lista es
   * la del régimen ESTRECHO (`md`..`lg`). Que `about` no esté aquí ya NO
   * significa que la barra no lo pinte -- desde `lg` sí lo pinta, y de eso se
   * ocupa el candado siguiente.
   */
  it("los destinos visibles de la barra ESTRECHA son EXACTAMENTE las cuatro claves de NAV_BAR_NARROW_SECTION_KEYS, y todos son secciones", () => {
    expect(navBarSectionsFor("es").map((item) => item.key)).toEqual(
      NAV_BAR_NARROW_SECTION_KEYS,
    );
    expect(NAV_BAR_NARROW_SECTION_KEYS).toEqual([
      "story",
      "journey",
      "features",
      "contact",
    ]);
    /* La barra NO gana un quinto enlace por que el modelo gane una sección:
       ese es justo el defecto que la lista explícita existe para impedir. */
    expect(
      navBarSectionsFor("es").map((item) => item.key),
      "about se coló en la barra de escritorio: D2 lo deja en «Más»",
    ).not.toContain("about");

    for (const item of navBarSectionsFor("es")) {
      /* Que TODOS sean `kind: "section"` es lo que permite a la barra pintar
         `aria-current` sin abrir nada: son los únicos destinos que
         `useActiveSection` puede marcar como actuales. */
      expect(
        item.kind,
        `${item.key} no es una sección: la barra le pintaría un aria-current que el scrollspy nunca puede encender`,
      ).toBe("section");
    }
  });

  /*
   * CANDADO DEL QUINTO DESTINO (crítica externa #18, hallazgo O-4).
   *
   * EL DEFECTO QUE ATRAPA: que una sección de la home vuelva a quedarse fuera
   * de la barra de escritorio por olvido. Hasta hoy la presencia en la barra
   * salía ENTERA de una lista tecleada a mano, así que añadir una sección al
   * modelo la dejaba invisible en la barra sin que nada avisara -- que es
   * exactamente lo que le pasó a `about` entre el 2026-09-02 y hoy.
   *
   * Lo que se afirma es una IGUALDAD entre dos derivaciones: lo que la barra
   * ancha pinta (los cuatro fijos más lo que devuelve `navBarWideSectionsFor`)
   * y lo que el modelo declara como sección del grupo partido. Ninguna de las
   * dos mitades se escribe a mano en este test, así que la igualdad no se
   * puede satisfacer tecleando una clave nueva en el sitio equivocado: o la
   * barra ancha deriva del modelo, o el test se pone rojo.
   *
   * Se comprueba en los DOS idiomas: la derivación pasa por `navGroupsFor`,
   * que reescribe los `href` por idioma, y una regresión ahí dejaría a la rama
   * inglesa con otra lista.
   */
  it("la barra ANCHA pinta todas las secciones del grupo partido, derivadas del modelo y no de una lista tecleada", () => {
    const seccionesDelModelo = NAV_GROUPS.find(
      (group) => group.key === NAV_BAR_GROUP_KEY,
    )!
      .items.filter((item) => item.kind === "section")
      .map((item) => item.key);

    for (const idioma of LOCALES) {
      const enLaBarraAncha = [
        ...navBarSectionsFor(idioma),
        ...navBarWideSectionsFor(idioma),
      ].map((item) => item.key);

      expect(
        enLaBarraAncha,
        `la barra ancha de ${idioma} no pinta todas las secciones del modelo: alguna quedó escondida tras «Más» a cualquier ancho`,
      ).toEqual(seccionesDelModelo);
    }

    /* Y la mitad derivada es la que NO cabe en la barra estrecha: ni repite
       ninguno de los cuatro fijos ni se inventa destinos de otro kind. */
    const anchos = navBarWideSectionsFor("es");
    expect(anchos.map((item) => item.key)).toEqual(["about"]);
    for (const item of anchos) {
      expect(item.kind).toBe("section");
      expect(NAV_BAR_NARROW_SECTION_KEYS).not.toContain(item.key);
    }
  });

  /*
   * La otra mitad del régimen: lo que la barra ancha pinta es EXACTAMENTE lo
   * que «Más» deja de necesitar. Si las dos listas se separan, el panel se
   * queda con un rótulo sobre una lista vacía (o con un destino duplicado a
   * dos centímetros del que ya se ve en la fila), que es lo que el
   * `data-wide-only` de `Navbar.tsx` retira por CSS.
   */
  it("lo que la barra ancha pinta es exactamente el resto del grupo que vive en «Más»", () => {
    const grupoEnMas = navBarMoreGroupsFor("es").find(
      (group) => group.key === NAV_BAR_GROUP_KEY,
    );
    expect(grupoEnMas?.items.map((item) => item.key)).toEqual(
      navBarWideSectionsFor("es").map((item) => item.key),
    );
  });

  /*
   * REESCRITO el 2026-09-02 (D2 + crítica #15). El candado anterior exigía que
   * «Más» NO contuviera el grupo de la barra, que era cierto mientras el corte
   * fuera "el grupo entero o nada". Con el corte DENTRO del grupo, esa
   * exigencia se volvería del revés: `about` es un destino de sección que la
   * barra no pinta, y el único sitio de escritorio donde puede vivir es «Más».
   *
   * Lo que se ata ahora es lo que de verdad importa: que ahí aparezca BAJO SU
   * RÓTULO (el grupo, no un enlace suelto entre los externos), con exactamente
   * los destinos que la barra no pinta y ni uno de los que sí.
   */
  it("«Más» lleva el grupo de la barra con lo que la barra NO pinta -- hoy, about -- y ninguno de los que sí", () => {
    const grupoEnMas = navBarMoreGroupsFor("es").find(
      (group) => group.key === NAV_BAR_GROUP_KEY,
    );
    expect(
      grupoEnMas,
      "«Más» perdió el grupo de sección: about no tendría dónde vivir en escritorio",
    ).toBeDefined();
    expect(grupoEnMas?.items.map((item) => item.key)).toEqual(["about"]);

    const visibles = navBarSectionsFor("es").map((item) => item.key);
    for (const item of grupoEnMas?.items ?? []) {
      expect(visibles).not.toContain(item.key);
    }
  });

  /*
   * EL PIE Y LA HOJA NO SE ENTERAN DEL CORTE: recorren `navGroupsFor`, así que
   * reciben el grupo COMPLETO. Es la otra mitad de "la partición es de
   * presentación": la barra es la única superficie que renuncia a un destino.
   */
  it("el pie sigue recibiendo el grupo onSite entero, `about` incluido", () => {
    const onSite = navGroupsFor("es").find(
      (group) => group.key === NAV_BAR_GROUP_KEY,
    );
    expect(onSite?.items).toEqual(EXPECTED_ITEMS[NAV_BAR_GROUP_KEY]);
    expect(onSite?.items.map((item) => item.key)).toContain("about");
    expect(onSite?.items.length).toBeGreaterThan(
      navBarSectionsFor("es").length,
    );
  });

  /*
   * EL PIE NO SE ENTERA DE NADA, y es la restricción explícita de D2: la
   * partición es de PRESENTACIÓN. `Footer.tsx` consume `navGroupsFor`, así que
   * este candado afirma que lo que el pie lee sigue siendo idéntico a
   * `NAV_GROUPS` -- byte a byte y por identidad en castellano.
   */
  it("no toca lo que consume el pie: navGroupsFor sigue devolviendo los cuatro grupos completos", () => {
    expect(navGroupsFor("es")).toBe(NAV_GROUPS);
    expect(navGroupsFor("en").map((group) => group.key)).toEqual(GROUP_ORDER);
  });

  /* El idioma viaja igual por las dos vistas: son envoltorios de
     `navGroupsFor`, no una segunda derivación que pueda divergir. */
  it("en inglés las dos vistas conservan el prefijo de la home inglesa", () => {
    for (const item of navBarSectionsFor("en")) {
      expect(item.href.startsWith(`${routePath("home", "en")}#`)).toBe(true);
    }
    const internos = navBarMoreGroupsFor("en")
      .flatMap((group) => group.items)
      .filter((item) => item.kind !== "external");
    expect(internos.length).toBeGreaterThan(0);
    for (const item of internos) {
      expect(item.href.startsWith(`${routePath("home", "en")}#`)).toBe(true);
    }
  });

  /* Memoizadas por idioma, mismo motivo que `navGroupsFor`: las llama el
     render de la barra, que se rehace en cada cruce de umbral de scroll y en
     cada cambio de sección activa. */
  it("devuelven el mismo array en llamadas sucesivas del mismo idioma", () => {
    expect(navBarSectionsFor("en")).toBe(navBarSectionsFor("en"));
    expect(navBarMoreGroupsFor("en")).toBe(navBarMoreGroupsFor("en"));
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
