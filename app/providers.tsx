"use client";

import React, { type ReactElement } from "react";
import StyledComponentsRegistry from "@/theme/registry";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlobalStyles } from "@/theme/GlobalStyles";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SkipLink } from "@/components/layout/SkipLink/SkipLink";
import { BackToTop } from "@/components/layout/BackToTop/BackToTop";

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
        {/* Aquí vivía `ConsentProvider` + `CookieBanner`, retirados el
            2026-08-08. No se "simplificó" el árbol: la revisión legal de esa
            fecha comprobó que el sitio no escribe NADA que requiera
            consentimiento previo (`src/config/storage.ts`), y un banner que
            pide permiso para almacenamiento exento del art. 22.2 LSSI-CE no
            es una cautela, es fricción sin cobertura legal y una petición de
            consentimiento inválida por innecesaria. Si algún día entra una
            tecnología no exenta, el proveedor vuelve AQUÍ, dentro de
            `I18nProvider` (su copia se traduce) y con el banner montado
            DESPUÉS de `children`, que es el orden de tabulación correcto para
            una capa no bloqueante. */}
        {/* SkipLink (Task 2): primer hijo focalizable de <body> en la
            practica -- ni StyledComponentsRegistry, ni ThemeProvider ni
            I18nProvider renderizan un nodo DOM propio, asi que en el arbol
            real precede a {children} sin intermediarios. Necesita
            traducirse y leer tokens de tema, de ahi que viva aqui (dentro de
            I18nProvider/ThemeProvider) y no en app/layout.tsx, que es Server
            Component y no puede consumir ninguno de los dos. */}
        <I18nProvider>
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
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
