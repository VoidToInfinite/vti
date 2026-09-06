"use client";

import React, { type ReactElement } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/config/site";
import StyledComponentsRegistry from "@/theme/registry";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlobalStyles } from "@/theme/GlobalStyles";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SkipLink } from "@/components/layout/SkipLink/SkipLink";
import { BackToTop } from "@/components/layout/BackToTop/BackToTop";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { Footer } from "@/components/layout/Footer/Footer";

/*
 * DOS ENVOLTORIOS, NO UNO, Y LA FRONTERA ES EL IDIOMA (2026-08-19).
 *
 * `Providers` = lo que NO depende del idioma (registro de styled-components,
 * tema, estilos globales). Lo monta UNA sola vez `app/RootDocument.tsx`, el
 * documento que renderizan las TRES raíces del sitio y que por tanto comparten
 * las seis rutas y la 404. Hasta el 2026-09-06 ese documento era
 * `app/layout.tsx`, el root layout único; se partió en tres raíces para que
 * cada rama pudiera hornear su propio `<html lang>` (crítica externa #19), pero
 * el ANCESTRO COMÚN —lo único de lo que depende la partición de abajo— sigue
 * siendo uno solo.
 *
 * `LocaleShell` = lo que SÍ depende del idioma (la instancia de i18next, y con
 * ella `SkipLink` y `BackToTop`, cuyo texto se traduce). Lo monta el layout de
 * cada rama —`app/(es)/layout.tsx`, `app/en/layout.tsx`— y, por su cuenta,
 * `app/NotFoundRoute.tsx` (el árbol de la 404).
 *
 * POR QUÉ ESTÁ PARTIDO ASÍ, Y NO ES ORDEN SINO PESO MEDIDO. Entre el 2026-08-18
 * y el 2026-08-19 el árbol entero (tema + i18n + SkipLink + BackToTop) se
 * montaba desde la rama de idioma, así que el root layout se quedó SIN ninguna
 * frontera de cliente propia. Consecuencia en el empaquetado: los mismos
 * módulos pasaron a vivir en dos grupos de chunks HERMANOS —el de `app/(es)/`
 * y el de `/_not-found`— y Turbopack los emitió DOS VECES. La 404 no es una
 * ruta más: su árbol viaja en el manifiesto de cliente de TODAS las páginas
 * (es el `NotFoundBoundary` de cada una), así que esa segunda copia la
 * descargaba también quien solo abría la portada.
 *
 * Medido con el instrumento canónico de `PRE-LAUNCH-QA.md` §4 (suma brotli de
 * los chunks que referencia `out/index.html`), tres builds del mismo árbol:
 *
 *   - cierre de la ola F (`e6606e4`, `Providers` en el root layout):
 *     285.567 B en 17 chunks;
 *   - ola G (`b31be06`, `Providers` en las ramas de idioma):
 *     313.928 B en 18 chunks — el chunk de tema+i18n (55.673 B crudos)
 *     duplicado, y el de `Providers`+`useScrolled` duplicado también;
 *   - esta partición: 285.430 B en 17 chunks.
 *
 * Con `Providers` de vuelta en el root layout, ese chunk vuelve a ser un
 * ANCESTRO común de las dos ramas y de la 404, y se emite una sola vez. Lo que
 * baja a `LocaleShell` no lo duplica porque sus dependencias pesadas
 * (styled-components, tema, i18next) ya están en el chunk del ancestro.
 *
 * REGLA PRÁCTICA que se deja escrita para la próxima vez: todo lo que monten
 * a la vez una rama de idioma y el árbol de la 404 (`app/NotFoundRoute.tsx`)
 * tiene que colgar de un envoltorio del DOCUMENTO compartido, o se paga dos
 * veces en cada página del sitio.
 */

/**
 * Envoltorio SIN idioma: registro de estilos, tema y estilos globales.
 *
 * Ninguno de los tres emite un nodo DOM propio, así que subirlos al documento
 * no cambia el orden de documento de nada — `SkipLink` (dentro de
 * `LocaleShell`) sigue siendo el primer hijo focalizable de `<body>`.
 *
 * `StyledComponentsRegistry` TIENE que ser ancestro de todo lo que renderice
 * un componente estilado: es quien recoge la hoja del servidor y la inserta en
 * el HTML horneado. `app/RootDocument.tsx` es exactamente ese sitio.
 */
export function Providers({
  children,
}: {
  children: React.ReactNode;
}): ReactElement {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider>
        <GlobalStyles />
        {/* Aquí vivía `StageProvider` (máquina de fases de la página, spec
            §7.1), retirado el 2026-08-11 (Task 27, plan premium): su `phase`
            se quedó sin ningún consumidor tras la Task 10 (la copia y el
            navbar pasaron a `@keyframes` estáticas) y `HeroBackdrop` dejó de
            avisarle -- ver §5.6 de
            `docs/superpowers/specs/2026-07-27-hero-coreografia-carga-tema-design.md`
            para la medición y el porqué completo. Si algún día vuelve a
            hacer falta coordinar entre hermanos del árbol algo que de verdad
            no pueda resolverse por CSS, el proveedor va AQUÍ, dentro de
            `ThemeProvider` -- misma ubicación, mismo motivo (cualquier
            proveedor "de interfaz global" de la página). */}
        {children}
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}

/**
 * Envoltorio CON idioma: la instancia de i18next de esta rama de rutas, más
 * TODO el chrome global cuyo texto se traduce — `SkipLink`, `Navbar`, `Footer`
 * y `BackToTop`.
 *
 * El idioma tiene que envolver a `SkipLink`/`BackToTop` y no solo a la página:
 * son hermanos de `children`, y el enlace de salto es literalmente lo primero
 * que anuncia un lector de pantalla en una página inglesa. Por eso los monta
 * este envoltorio y no cada `page.tsx`.
 *
 * ## LA CÁSCARA DEL SITIO (`Navbar` + `Footer`) SUBE AQUÍ EL 2026-09-04
 *
 * Hasta esa fecha la montaban por su cuenta `app/HomeRoute.tsx`, el árbol de la
 * 404 (entonces `app/not-found.tsx`, hoy `app/NotFoundRoute.tsx`),
 * `PrivacyDocument.tsx` y `LegalNoticeDocument.tsx`: cuatro sitios, el mismo
 * DOM. Es LA MISMA situación que la partición `Providers`/`LocaleShell` de
 * arriba resolvió para el tema y el i18n, y la regla que ese docblock dejó
 * escrita —«todo lo que monten a la vez una rama de idioma y el árbol de la 404
 * tiene que colgar de un envoltorio del DOCUMENTO compartido, o se paga dos
 * veces en cada página del sitio»— describía exactamente lo que estaba pasando
 * con la cáscara. Nadie la aplicó a ella durante cinco
 * olas porque la regla vivía en prosa y no en un candado; ahora sí lo tiene
 * (`app/providers.test.tsx`, «la cáscara del sitio se monta una sola vez»).
 *
 * LA FACTURA, medida por chunk sobre el build de `0226846` servido en local.
 * `out/index.html` y `out/en.html` referenciaban DOS chunks con la MISMA
 * composición —los mismos 17 identificadores de módulo, 109.716 B crudos cada
 * uno— con la cáscara entera dentro: `Navbar` (con `NavSheet`, `ThemeToggle`,
 * `LanguageSelector`), `Footer`, `Logo`, `Typography`, `VisuallyHidden`,
 * `BrandName`, `SectionBeam`, `useReveal`, `useDocumentMeta`, `links`,
 * `NAV_GROUPS` y las constantes del arte del hero. Uno lo pedían las ocho
 * páginas del build; el otro, 28.413 B brotli, solo las dos portadas, y era
 * íntegramente redundante.
 *
 * EL PORQUÉ TÉCNICO, y es el mismo de la ola G: cada uno de esos cuatro
 * ficheros es un Server Component, así que cada uno abría su PROPIA frontera de
 * servidor a cliente sobre los mismos módulos. Con la cáscara aquí hay una sola
 * frontera, y cuelga del ancestro común de las ocho páginas. Se descartaron dos
 * alternativas más baratas, las dos MEDIDAS con su build antes de descartarlas:
 * marcar `HomeRoute` como `"use client"` (284.559 → 284.954 B: los gemelos
 * siguen, +395 B) y componer un envoltorio de cliente compartido entre la
 * portada y la 404 (284.708 B: los gemelos siguen, +149 B). El número de
 * fronteras no es lo que decide el reparto; la posición en el árbol, sí.
 *
 * RESULTADO, dos builds consecutivos del mismo árbol: **284.559 → 253.853 B
 * brotli descargados (−30.706 B, −10,8 %)**, margen libre del presupuesto de
 * 5.441 a 36.147 B, la duplicación de módulos de 116.368 a 4.264 B crudos (de
 * 21 módulos repetidos a 5, todos del runtime de Next) y cero pares de chunks
 * con la misma composición emitidos por el repo.
 *
 * EL ORDEN DEL DOM NO CAMBIA en ninguna de las ocho páginas: las cuatro rutas
 * que la montaban ya la ponían como primer y último hijo de su fragmento, y
 * aquí queda en el mismo sitio relativo (`SkipLink`, `Navbar`, la página,
 * `Footer`, `BackToTop`). Lo único que se mueve es el `<script>` de datos
 * estructurados de la portada, que pasa de preceder al `<header>` a seguirlo;
 * no es contenido renderizado y no altera ni el orden de lectura ni el de
 * tabulación.
 *
 * El árbol de la 404 (`app/NotFoundRoute.tsx`) lo monta por su cuenta a través
 * de `NotFoundLocaleShell`: no vive dentro de ningún grupo de idioma (tiene que
 * seguir en la raíz de `app/` para ser la 404 global) y sin esto se quedaría
 * sin i18n y sin el chrome global. El idioma no es fijo desde el 2026-08-20: lo
 * resuelve esa cáscara desde la URL rota, arrancando en castellano.
 *
 * Aquí vivía `ConsentProvider` + `CookieBanner`, retirados el 2026-08-08. No se
 * "simplificó" el árbol: la revisión legal de esa fecha comprobó que el sitio no
 * escribe NADA que requiera consentimiento previo (`src/config/storage.ts`), y
 * un banner que pide permiso para almacenamiento exento del art. 22.2 LSSI-CE no
 * es una cautela, es fricción sin cobertura legal y una petición de
 * consentimiento inválida por innecesaria. Si algún día entra una tecnología no
 * exenta, el proveedor vuelve AQUÍ, dentro de `I18nProvider` (su copia se
 * traduce) y con el banner montado DESPUÉS de `children`, que es el orden de
 * tabulación correcto para una capa no bloqueante.
 */
export function LocaleShell({
  locale = DEFAULT_LOCALE,
  children,
}: {
  /** Idioma de la rama de rutas que monta este árbol. */
  locale?: Locale;
  children: React.ReactNode;
}): ReactElement {
  return (
    <I18nProvider locale={locale}>
      {/* SkipLink (Task 2): primer hijo focalizable de <body> en la
          practica -- ni StyledComponentsRegistry, ni ThemeProvider ni
          I18nProvider renderizan un nodo DOM propio, asi que en el arbol
          real precede a {children} sin intermediarios. Necesita
          traducirse y leer tokens de tema, de ahi que viva aqui (dentro de
          I18nProvider, y por debajo del ThemeProvider que monta
          `Providers`) y no en app/RootDocument.tsx, que es Server Component y
          no puede consumir ninguno de los dos. */}
      <SkipLink />
      {/* Navbar y Footer (2026-09-04): la cascara del sitio, montada UNA sola
          vez desde el ancestro comun de las ocho paginas. Las cuatro rutas
          que antes la montaban por su cuenta pagaban una copia entera de sus
          17 modulos en las dos portadas -- 28.413 B brotli redundantes,
          medidos por chunk. El porque completo y las cifras estan en el
          docblock de arriba; el candado, en providers.test.tsx. */}
      <Navbar />
      {children}
      <Footer />
      {/* BackToTop (Task 2): global, no solo Home -- las paginas
          legales tambien pueden crecer mas de 2 pantallas. Se posiciona
          fijo (position: fixed), asi que su lugar en el DOM no afecta
          al layout visual; va despues de {children} para que su orden
          de tabulacion sea el ultimo de la pagina, coherente con ser
          un atajo de "vuelta al principio". */}
      <BackToTop />
    </I18nProvider>
  );
}
