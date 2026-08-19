"use client";

import React, { type ReactElement } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/config/site";
import StyledComponentsRegistry from "@/theme/registry";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlobalStyles } from "@/theme/GlobalStyles";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SkipLink } from "@/components/layout/SkipLink/SkipLink";
import { BackToTop } from "@/components/layout/BackToTop/BackToTop";

/*
 * DOS ENVOLTORIOS, NO UNO, Y LA FRONTERA ES EL IDIOMA (2026-08-19).
 *
 * `Providers` = lo que NO depende del idioma (registro de styled-components,
 * tema, estilos globales). Lo monta UNA sola vez `app/layout.tsx`, el root
 * layout que comparten las seis rutas y la 404.
 *
 * `LocaleShell` = lo que SÍ depende del idioma (la instancia de i18next, y con
 * ella `SkipLink` y `BackToTop`, cuyo texto se traduce). Lo monta el layout de
 * cada rama —`app/(es)/layout.tsx`, `app/en/layout.tsx`— y, por su cuenta,
 * `app/not-found.tsx`.
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
 * a la vez una rama de idioma y `app/not-found.tsx` tiene que colgar de un
 * envoltorio del ROOT layout, o se paga dos veces en cada página del sitio.
 */

/**
 * Envoltorio SIN idioma: registro de estilos, tema y estilos globales.
 *
 * Ninguno de los tres emite un nodo DOM propio, así que subirlos al root
 * layout no cambia el orden de documento de nada — `SkipLink` (dentro de
 * `LocaleShell`) sigue siendo el primer hijo focalizable de `<body>`.
 *
 * `StyledComponentsRegistry` TIENE que ser ancestro de todo lo que renderice
 * un componente estilado: es quien recoge la hoja del servidor y la inserta en
 * el HTML horneado. El root layout es exactamente ese sitio.
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
 * las dos piezas de chrome global cuyo texto se traduce.
 *
 * El idioma tiene que envolver a `SkipLink`/`BackToTop` y no solo a la página:
 * son hermanos de `children`, y el enlace de salto es literalmente lo primero
 * que anuncia un lector de pantalla en una página inglesa. Por eso los monta
 * este envoltorio y no cada `page.tsx`.
 *
 * `app/not-found.tsx` lo monta por su cuenta en castellano: no vive dentro de
 * ningún grupo de idioma (tiene que seguir en la raíz de `app/` para ser la 404
 * global) y sin esto se quedaría sin i18n y sin el chrome global.
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
          `Providers`) y no en app/layout.tsx, que es Server Component y no
          puede consumir ninguno de los dos. */}
      <SkipLink />
      {children}
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
