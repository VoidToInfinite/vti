import { links } from "@/config/links";
import { DEFAULT_LOCALE, LOCALES, routePath, type Locale } from "@/config/site";

/**
 * Modelo de navegación compartido por `Navbar` y `Footer`.
 *
 * Hasta esta entrega cada componente repetía su propia lista literal de
 * enlaces (`NAV_SECTION_LINKS` en `Navbar.tsx`, `SECTION_LINKS`/
 * `DISCOVER_LINKS` en `Footer.tsx`), y el comentario del Footer justificaba
 * la duplicación por "cambio mínimo": los dos componentes necesitaban su
 * propio par clave/traducción pero no compartían estilo, así que extraer un
 * módulo común no aportaba nada todavía. Esa premisa deja de sostenerse a
 * partir de aquí: el navbar y el pie tienen que mostrar LAS MISMAS secciones,
 * así que dos listas literales pasan a ser dos fuentes de verdad que
 * divergen al primer retoque (renombrar una sección, añadir una cuarta
 * columna de "discover"...). Un único array resuelto en un solo sitio es lo
 * que impide esa divergencia por construcción.
 *
 * Este módulo NO resuelve etiquetas: solo modela QUÉ enlaces existen, en qué
 * grupo y con qué mecanismo de navegación (`kind`). Resolver el texto visible
 * es responsabilidad de cada consumidor (Navbar, Footer), que ya conoce su
 * propio `useTranslation`. La tabla de resolución es el CONTRATO entre este
 * módulo y sus consumidores:
 *
 * - Título de grupo   -> t("Common.Nav.<groupKey>")           (namespace "common")
 * - Item kind:section -> t("Common.Navigation.<key>")         (namespace "common")
 * - Item kind:feature -> t("home:Home.features.<key>.title")  (namespace "home")
 * - Item kind:external -> t("Common.Nav.<key>")                (namespace "common")
 *
 * Renombrar una `key` de aquí sin actualizar la clave i18n correspondiente
 * (o viceversa) deja una etiqueta vacía en la interfaz sin que nada lo avise
 * en tiempo de compilación -- para eso existe el candado de
 * `navigation.test.ts`, que resuelve de verdad las cuatro rutas contra los
 * JSON de es/en.
 */

/**
 * Mecanismo de navegación del item, que decide cómo lo renderiza el
 * consumidor:
 * - `"section"`: ancla a una sección de la propia home (`#story`, ...).
 * - `"feature"`: ancla a `#features`, pero la etiqueta no sale de
 *   `Common.Navigation` sino del título de la propia feature en `home.json`
 *   (Learning/Imagination/Gaming son títulos de contenido, no navegación).
 * - `"external"`: sale del sitio; el consumidor lo navega con `target="_blank"`
 *   + `rel="noopener noreferrer"` y avisa del cambio de pestaña (WCAG 3.2.5,
 *   texto en `Common.Nav.newTab`).
 */
export type NavItemKind = "section" | "feature" | "external";

export interface NavItem {
  readonly key: string;
  readonly href: string;
  readonly kind: NavItemKind;
}

export type NavGroupKey = "onSite" | "discover" | "resources" | "community";

export interface NavGroup {
  readonly key: NavGroupKey;
  readonly items: readonly NavItem[];
}

/*
 * LAS ANCLAS SON ABSOLUTAS (`/#story`), NO RELATIVAS (`#story`), y ésa es la
 * diferencia entre un enlace que funciona y uno que no hace absolutamente
 * nada. Crítica #6 (2026-08-15), P0-2, verificado con clic REAL y no por
 * inspección:
 *
 *   En `/privacidad`, con `scrollY = 7427`, clic en «Contacto» del pie:
 *   la URL pasa a `/privacidad#contact`, el `h1` sigue siendo «Política de
 *   privacidad» y `scrollY` sigue siendo 7427. No se mueve nada, y no hay
 *   ningún feedback de que el clic no llevó a ninguna parte.
 *
 * El motivo es que este modelo lo consumen TRES superficies —`Navbar`,
 * `NavSheet` y `Footer`— y las tres se montan en TODAS las páginas, no solo
 * en la home. Una ancla relativa se resuelve contra el documento actual, y
 * fuera de la home no existe ningún `#story`:
 * `['story','journey','features','contact'].filter(id =>
 * document.getElementById(id))` devuelve `[]` en `/privacidad`,
 * `/aviso-legal` y la 404.
 *
 * Alcance del defecto: 7 enlaces × 3 páginas = 21 instancias. En la 404 se
 * sumaban los 8 de los desplegables de cabecera —las legales sí retiran esos
 * desplegables, la 404 no—, así que quedaban **15 de 17 enlaces de navegación
 * inertes en la única página cuyo trabajo entero es devolverte al sitio**.
 * Agravante en las legales: su cabecera no lleva navegación de secciones, así
 * que el pie era el único camino de vuelta al contenido, y era el que fallaba
 * en silencio.
 *
 * Por qué `/#story` y no otra cosa: dentro de la propia home el navegador
 * resuelve `/#story` contra el mismo documento y hace exactamente lo que
 * hacía antes (desplazamiento suave por `scroll-behavior`, sin recarga),
 * mientras que fuera de ella navega a la home y aterriza en la sección. Es la
 * forma que funciona en los dos casos, no un parche para uno.
 *
 * NOTA PARA QUIEN AÑADA UN DESTINO: el `key` NO lleva barra y se sigue usando
 * como `id` de la sección (`useActiveSection` deriva `ACTIVE_SECTION_IDS` de
 * estos `key`, no de los `href`). Lo que lleva `/` es el `href`, y solo él.
 *
 * ESTE ARRAY ES LA RAMA CASTELLANA, y desde 2026-08-19 esa precisión importa:
 * `navGroupsFor(idioma)` (final del fichero) deriva de aquí la rama inglesa
 * cambiando el prefijo `/` por `/en`. La derivación EXIGE la forma canónica
 * `/#<id>` que el candado de `navigation.test.ts` ya obliga a respetar: un
 * `href` que no empiece por `/#` viaja tal cual a las dos ramas y, en `/en`,
 * expulsaría al visitante inglés al castellano sin que nada avise.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  /* Las secciones de la home, EN EL ORDEN EN QUE APARECEN EN LA PÁGINA. Nació
     con los mismos 4 destinos que ya usaban `NAV_SECTION_LINKS` (Navbar) y
     `SECTION_LINKS` (Footer); desde el 2026-09-02 son 5, con `about` al final
     (ver su comentario). */
  {
    key: "onSite",
    items: [
      { key: "story", href: "/#story", kind: "section" },
      { key: "journey", href: "/#journey", kind: "section" },
      { key: "features", href: "/#features", kind: "section" },
      { key: "contact", href: "/#contact", kind: "section" },
      /* QUINTO DESTINO, ÚLTIMO DEL GRUPO (decisión del dueño D2, 2026-09-02;
         crítica #15, hallazgo C 5, pendiente desde la #12).
         `About` («¿Qué es VoidToInfinite?») es una sección real de la home,
         con su propio `h2` y su propio `id`, y hasta hoy NO existía ninguna
         forma de llegar a ella que no fuera desplazarse hasta encontrarla:
         no estaba en la barra, ni en «Más», ni en la hoja móvil, ni en el
         pie -- las cuatro superficies recorren este array, así que una
         sección que no esté aquí es invisible para la navegación entera.
         ÚLTIMO, y no entre `features` y `contact`: el orden de este grupo es
         el ORDEN DE LA PÁGINA (ver el bloque de arriba), y `About` se pinta
         DESPUÉS de Contacto desde la crítica #6 -- en la rama oscura, entre
         Features y Contacto quedaba enteramente bajo el solape y no había
         posición de scroll en la que se viera (el porqué completo vive en
         `HomeSections.tsx`, no se duplica aquí). Colocarla aquí en cuarto
         lugar dejaría el menú anunciando un orden que la página no tiene.
         Su etiqueta NO es el `h2` literal: `Common.Navigation.about`
         («Qué es VoidToInfinite») es la misma frase sin la forma
         interrogativa, que es lo que distingue un rótulo de navegación de un
         encabezado -- el resto del grupo también nombra el destino en corto.
         NO entra en la barra de escritorio: la partición del final del
         fichero (`NAV_BAR_SECTION_KEYS`) la deja en «Más», con la barra
         conservando sus cuatro enlaces de siempre. */
      { key: "about", href: "/#about", kind: "section" },
    ],
  },
  /* Mismo criterio que ya seguía `DISCOVER_LINKS` en el Footer: Learning,
     Imagination y Gaming son los TÍTULOS de `Home.features.*`, no claves de
     navegación nuevas.
   *
   * CADA UNO LLEVA A SU PROPIA TARJETA, no los tres a `/#features`. Hasta el
   * 2026-08-16 los tres compartían destino, y el efecto medido era peor de lo
   * que suena: contando las tres superficies que consumen este modelo
   * (`Navbar`, `NavSheet`, `Footer`), `/#features` era el destino de **12
   * enlaces con 4 etiquetas distintas** — «Características», «Aprende»,
   * «Imagina» y «Juega» —, frente a 3 enlaces por cada una de las otras
   * secciones. Un menú que ofrece cuatro nombres y entrega un solo sitio no
   * está informando de nada: está prometiendo una elección que no existe.
   *
   * Los destinos separados YA EXISTÍAN en el DOM sin que nadie los usara:
   * `Features.tsx` emite `id={`feature-${key}-title`}` en el `<h3>` de cada
   * tarjeta desde que existen las tarjetas. Lo único que faltaba era que la
   * navegación dejara de ignorarlos.
   *
   * El `key` NO cambia: sigue siendo `learning`/`imagination`/`gaming` porque
   * es la clave i18n (`home:Home.features.<key>.title`, tabla de resolución
   * del docblock de arriba). Lo que cambia es solo el `href`. */
  {
    key: "discover",
    items: [
      { key: "learning", href: "/#feature-learning-title", kind: "feature" },
      {
        key: "imagination",
        href: "/#feature-imagination-title",
        kind: "feature",
      },
      { key: "gaming", href: "/#feature-gaming-title", kind: "feature" },
    ],
  },
  /* Único destino externo del modelo hasta esta entrega: el SDK público de
     VTI. Su URL vive en `links.sdk` (fuente de verdad única de destinos,
     `src/config/links.ts`), nunca repetida aquí como cadena literal. */
  {
    key: "resources",
    items: [{ key: "sdk", href: links.sdk, kind: "external" }],
  },
  /* Grupo nuevo (auditoría premium, tarea 6): hasta esta entrega Discord y
     GitHub solo existían como tarjetas del Contact oscuro
     (`Home.contact.cards.community`/`code`, `Contact.tsx`) -- el tema claro
     no tenía ninguna salida a la comunidad, y el pie no tenía enlaces
     sociales en NINGÚN tema (retirados el 2026-08-04 junto con `Socials`).
     Tres lentes de auditoría convergieron en promoverlos a ambas ramas vía
     este modelo compartido, que Navbar y Footer ya consumían -- ningún
     componente necesita un camino nuevo, solo un grupo más que recorrer.
     Las tarjetas del Contact oscuro NO se tocan: siguen siendo su propia
     superficie, con su propio copy (valor visible, no solo el título) --
     este grupo es la salida de navegación, no un reemplazo.

     Mismo mecanismo `kind: "external"` que ya usaba `resources.sdk`,
     replicado sin variación: `target="_blank"` + `rel="noopener noreferrer"`
     + aviso de pestaña nueva para lectores de pantalla, resueltos por cada
     consumidor (Navbar, Footer) exactamente igual que el SDK. Últimos en el
     array a propósito: los tres grupos anteriores ya existían y este es
     puramente aditivo, así que no reordena nada que un usuario ya conociera. */
  {
    key: "community",
    items: [
      { key: "discord", href: links.discord, kind: "external" },
      { key: "github", href: links.github, kind: "external" },
      /* Último del grupo, mismo criterio aditivo que el propio grupo estrenó:
         los dos anteriores ya existían y reordenarlos cambiaría un camino que
         alguien ya conoce. Su etiqueta sale de `Common.Nav.linkedin`, igual
         que las otras dos -- el `switch` de `itemLabel` resuelve todo
         `kind: "external"` por clave, así que este destino no toca ninguna de
         sus tres copias (Navbar, Footer, NavSheet). */
      { key: "linkedin", href: links.linkedin, kind: "external" },
    ],
  },
] as const;

/**
 * EL MISMO MODELO, CONSCIENTE DEL IDIOMA DE LA PÁGINA (crítica #12, P0).
 *
 * EL DEFECTO QUE CIERRA, medido sobre el `out/` del build y no supuesto:
 * `out/en.html` llevaba **21 `href="/#..."` y cero enlaces internos que
 * conservaran `/en`**. Es decir: en la home inglesa, los 7 destinos de sección
 * del cabecero, los 7 del pie y los 7 de la hoja móvil devolvían al visitante
 * a la home CASTELLANA. El inglés estrenó URL propia el 2026-08-18, y con esta
 * fuga el idioma se perdía al primer clic — cualquier clic — así que la URL
 * inglesa solo sobrevivía mientras nadie navegara por ella.
 *
 * La causa raíz es la decisión que documenta el bloque de arriba, correcta
 * cuando se tomó y ya no: las anclas se hicieron ABSOLUTAS (`/#story`, no
 * `#story`) porque las tres superficies que consumen este modelo (`Navbar`,
 * `NavSheet`, `Footer`) se montan en TODAS las páginas y un ancla relativa no
 * navega desde `/privacidad`. Ese `/` inicial era «la home» cuando solo había
 * una; desde que hay dos, nombra una de las dos, y siempre la misma.
 *
 * El arreglo NO es volver a las anclas relativas (reabriría el P0-2 de la
 * crítica #6, medido con clic real) sino hacer el prefijo consciente del
 * idioma: `/` en castellano — byte a byte lo que había, `NAV_GROUPS` se
 * devuelve tal cual, por identidad — y `/en` en inglés. El fragmento (`#story`)
 * no cambia nunca, así que `navAnchorTargetId`/`focusNavAnchorTarget`
 * (`navAnchorFocus.ts`), `useActiveSection` (que deriva sus ids de los `key`,
 * no de los `href`) y el contrato de `NavItem` siguen intactos.
 *
 * POR QUÉ EL PREFIJO SALE DE `routePath("home", locale)` y no de un literal
 * `"/en"`: `src/config/site.ts` ya es la fuente de verdad única de las seis
 * rutas del sitio (`ROUTES_BY_LOCALE`), y es la misma función que ya usa el
 * selector de idioma. Un literal aquí sería una segunda copia que se
 * desincronizaría el día que el prefijo cambie.
 *
 * MEMOIZADO POR IDIOMA a propósito: los tres consumidores llaman a esta
 * función EN CADA RENDER, y `NavSheet` además parte el resultado en dos mitades
 * (`isExitGroup`). Devolver un array nuevo cada vez no rompería nada hoy
 * —ningún efecto lo tiene como dependencia— pero fabricaría basura en cada
 * frame de scroll de la hoja sin necesidad. Con el mapa, cada idioma se
 * construye UNA vez por proceso.
 *
 * El parámetro es la cadena cruda de i18next (`i18n.language`), no un `Locale`
 * ya validado, porque quien llama es siempre un componente que acaba de leer
 * `useTranslation()`: normalizar aquí evita repetir la misma guarda en las tres
 * superficies. Cualquier valor que no sea uno de los dos idiomas del sitio cae
 * en `DEFAULT_LOCALE` — el mismo criterio conservador que ya aplica
 * `LanguageSelector` ante una ruta que no reconoce.
 */
const groupsByLocale = new Map<Locale, readonly NavGroup[]>([
  /* La rama castellana ES `NAV_GROUPS`, sin copiar ni recomponer nada: así
     ninguna página castellana puede cambiar de href por esta entrega, ni
     siquiera por un error de la derivación. */
  [DEFAULT_LOCALE, NAV_GROUPS],
]);

function localizedHref(item: NavItem, locale: Locale): string {
  /* `external` sale del sitio: su `href` es una URL completa a otro dominio y
     el idioma de ESTE sitio no le dice nada. */
  if (item.kind === "external") return item.href;
  /* Guarda explícita, no defensiva: la derivación solo sabe traducir la forma
     canónica `/#<id>`. Cualquier otra se devuelve intacta en vez de producir
     una ruta inventada, y el candado de `navigation.test.ts` impide que esa
     rama llegue a existir en el modelo real. */
  if (!item.href.startsWith("/#")) return item.href;
  const home = routePath("home", locale);
  return home === "/" ? item.href : `${home}${item.href.slice(1)}`;
}

/**
 * El idioma del sitio que corresponde a una cadena de i18next
 * (`i18n.language`), o `DEFAULT_LOCALE` si no es ninguno de los dos.
 *
 * Vive aquí y no en `src/config/site.ts` -- su hogar "natural", que es quien
 * declara `LOCALES` -- porque sus tres consumidores son exactamente las tres
 * superficies de navegación (`Navbar`, `NavSheet`, `Footer`), que ya importan
 * este módulo y no importaban `site.ts`. Se exporta en vez de resolverse en
 * cada una porque además del modelo de enlaces hay DOS destinos que también
 * dependen del idioma y no salen de `NAV_GROUPS`: el logotipo de la barra
 * (`routePath("home", ...)`) y los dos documentos legales del pie
 * (`routePath("privacy"/"legalNotice", ...)`). Repetir la normalización tres
 * veces sería justo la clase de copia que diverge al primer idioma nuevo.
 */
export function navLocale(language: string | undefined): Locale {
  return LOCALES.find((candidate) => candidate === language) ?? DEFAULT_LOCALE;
}

export function navGroupsFor(
  language: string | undefined,
): readonly NavGroup[] {
  const locale = navLocale(language);

  const cached = groupsByLocale.get(locale);
  if (cached) return cached;

  const localized: readonly NavGroup[] = NAV_GROUPS.map((group) => ({
    key: group.key,
    items: group.items.map((item) => ({
      ...item,
      href: localizedHref(item, locale),
    })),
  }));
  groupsByLocale.set(locale, localized);
  return localized;
}

/**
 * LA MISMA LISTA, PARTIDA COMO LA PINTA LA BARRA DE ESCRITORIO (decisión del
 * dueño D2, 2026-09-02, tras la crítica #14).
 *
 * EL DEFECTO QUE CIERRA, medido por el evaluador a 1440x900: los únicos
 * enlaces visibles del cabecero eran el logotipo y los dos de idioma. Los 11
 * destinos de este modelo vivían tras CUATRO botones de disclosure («En el
 * sitio», «Descubre», «Recursos», «Comunidad») cuyas etiquetas no nombran
 * ningún destino, uno de ellos («Recursos») abriendo un panel entero para
 * revelar UN solo enlace. Llegar a Contacto exigía abrir un menú a ciegas y
 * elegir dentro (Nielsen H6 «reconocer antes que recordar», 2/4; H7
 * «flexibilidad y eficiencia», 2/4). La hoja móvil, que muestra los 14
 * elementos agrupados y rotulados de una vez, resolvía mejor el mismo
 * problema en una pantalla ocho veces más pequeña.
 *
 * LA PARTICIÓN ES DE PRESENTACIÓN, NO DE MODELO, y esa distinción es la parte
 * que hay que respetar: `NAV_GROUPS` no se toca ni una coma. Lo consumen
 * TRES superficies —`Navbar` (barra de escritorio), `NavSheet` (hoja móvil) y
 * `Footer` (pie, en todas las páginas)— y solo la primera cambia de forma. El
 * pie sigue recorriendo los cuatro grupos enteros con `navGroupsFor`, la hoja
 * sigue entregando TODOS los destinos agrupados, y estas dos funciones son
 * SOLO la vista que necesita la barra: los destinos que se pintan como
 * enlaces visibles, y los grupos que quedan detrás del único disclosure
 * («Más»).
 *
 * DÓNDE CAE EL CORTE, Y POR QUÉ CAMBIÓ DE FORMA EL 2026-09-02. Hasta la
 * llegada de `about` el corte era «el grupo `onSite` entero va a la barra, el
 * resto a «Más»», y el razonamiento que lo sostenía era que `onSite` ya ES
 * «las secciones de la home, en el orden en que aparecen en la página»: una
 * segunda lista de claves aquí sería la duplicación que este módulo existe
 * para evitar. Ese razonamiento se rompe en cuanto la home tiene CINCO
 * secciones y la barra sigue teniendo sitio para cuatro: «todo `onSite`» deja
 * de ser una descripción de la barra y pasa a ser una promesa de que el grupo
 * nunca crecerá.
 *
 * Así que la lista explícita se escribe, pero es la de la BARRA
 * (`NAV_BAR_SECTION_KEYS`), no una copia del grupo: nombra los cuatro
 * destinos que caben en la píldora de escritorio -- una decisión de ESPACIO,
 * que es justo lo que ninguna propiedad del modelo puede derivar -- y todo lo
 * demás se sigue derivando. `about` no aparece en ella y, por tanto, cae en
 * «Más» sin que nadie lo enumere en ningún sitio: quien añada una sexta
 * sección a la home la verá aparecer en «Más» y en el pie sin tocar este
 * bloque, y solo tendrá que venir aquí si decide darle un enlace visible.
 *
 * `onSite` sigue siendo el ÚNICO grupo con items `kind: "section"` -- los que
 * `useActiveSection` puede marcar como actuales --, así que el corte sigue
 * cayendo dentro de un solo grupo y «Más» recibe el resto de ese grupo BAJO SU
 * PROPIO RÓTULO, no suelto: un destino de sección presentado sin el «En el
 * sitio» que lo agrupa perdería la única pista de que lleva a la misma página.
 * `navigation.test.ts` ata que las dos mitades reconstruyan `NAV_GROUPS` sin
 * perder ni repetir nada, y que la lista de la barra sea exactamente esas
 * cuatro claves.
 *
 * MEMOIZADAS POR IDIOMA, mismo motivo que `navGroupsFor`: `Navbar()` las llama
 * EN CADA RENDER, y la barra se re-renderiza en cada cruce de umbral de scroll
 * y en cada cambio de sección activa.
 */
/** Grupo que la barra de escritorio PARTE entre sus enlaces visibles y «Más». */
export const NAV_BAR_GROUP_KEY: NavGroupKey = "onSite";

/**
 * Destinos de `NAV_BAR_GROUP_KEY` que la barra pinta como enlaces VISIBLES,
 * en el orden en que los declara el grupo (esta lista decide QUIÉNES, nunca
 * el orden). El resto del grupo viaja a «Más».
 */
export const NAV_BAR_SECTION_KEYS: readonly string[] = [
  "story",
  "journey",
  "features",
  "contact",
];

const barSectionsByLocale = new Map<Locale, readonly NavItem[]>();
const moreGroupsByLocale = new Map<Locale, readonly NavGroup[]>();

/** Destinos que la barra de escritorio pinta como enlaces VISIBLES. */
export function navBarSectionsFor(
  language: string | undefined,
): readonly NavItem[] {
  const locale = navLocale(language);

  const cached = barSectionsByLocale.get(locale);
  if (cached) return cached;

  const items = (
    navGroupsFor(locale).find((group) => group.key === NAV_BAR_GROUP_KEY)
      ?.items ?? []
  ).filter((item) => NAV_BAR_SECTION_KEYS.includes(item.key));
  barSectionsByLocale.set(locale, items);
  return items;
}

/**
 * Grupos que la barra de escritorio agrupa tras el único disclosure: los que
 * no participan en la barra, más lo que quede del grupo partido -- con su
 * rótulo, en su sitio del orden y sin los destinos ya visibles.
 *
 * El grupo partido DESAPARECE si se queda sin items (hoy no ocurre: `about`
 * vive ahí), en vez de emitir un rótulo con una lista vacía debajo.
 */
export function navBarMoreGroupsFor(
  language: string | undefined,
): readonly NavGroup[] {
  const locale = navLocale(language);

  const cached = moreGroupsByLocale.get(locale);
  if (cached) return cached;

  const groups = navGroupsFor(locale).flatMap((group) => {
    if (group.key !== NAV_BAR_GROUP_KEY) return [group];
    const resto = group.items.filter(
      (item) => !NAV_BAR_SECTION_KEYS.includes(item.key),
    );
    return resto.length > 0 ? [{ key: group.key, items: resto }] : [];
  });
  moreGroupsByLocale.set(locale, groups);
  return groups;
}
