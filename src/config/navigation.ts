import { links } from "@/config/links";

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

export const NAV_GROUPS: readonly NavGroup[] = [
  /* Mismos 4 destinos que ya usaban `NAV_SECTION_LINKS` (Navbar) y
     `SECTION_LINKS` (Footer): las 4 secciones de la home, en el orden en que
     aparecen en la página. */
  {
    key: "onSite",
    items: [
      { key: "story", href: "#story", kind: "section" },
      { key: "journey", href: "#journey", kind: "section" },
      { key: "features", href: "#features", kind: "section" },
      { key: "contact", href: "#contact", kind: "section" },
    ],
  },
  /* Mismo criterio que ya seguía `DISCOVER_LINKS` en el Footer: Learning,
     Imagination y Gaming son los TÍTULOS de `Home.features.*`, no claves de
     navegación nuevas -- los tres apuntan a la misma sección `#features`. */
  {
    key: "discover",
    items: [
      { key: "learning", href: "#features", kind: "feature" },
      { key: "imagination", href: "#features", kind: "feature" },
      { key: "gaming", href: "#features", kind: "feature" },
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
