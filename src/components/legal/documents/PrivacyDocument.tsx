"use client";

import type { ReactElement } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { LegalDocument } from "@/components/legal/LegalDocument";

/**
 * Envoltorio finísimo de `/privacidad` (D21 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md): la navegación del sitio +
 * el renderer único de documentos legales + el `Footer` de la home, tal cual,
 * sin modificarlo (es autónomo y ya funciona en los dos temas). El hilo
 * principal monta este componente desde `app/(es)/privacidad/page.tsx`.
 *
 * ## D20 SE REVIERTE: aquí va el `Navbar`, no una cabecera propia
 *
 * Decisión del dueño del 2026-09-03, tras la crítica externa #16: las páginas
 * legales pasan a llevar la navegación completa, la misma cabecera que la 404
 * y la home. El hallazgo que la motiva, medido por el evaluador de artesanía:
 * la 404 exponía 15 enlaces en su cabecera y las legales 3 (marca + los dos de
 * idioma), así que el mismo sitio se presentaba con dos identidades según la
 * página. Su motivo está escrito: hoy un aviso legal es un callejón con dos
 * salidas.
 *
 * Hasta esta entrega el componente montado aquí era `LegalHeader`, una
 * cabecera propia y deliberadamente sobria que D20 justificaba así: el
 * `Navbar` monta anclas a las secciones de la home, y en `/privacidad` esas
 * secciones no existen, así que reusarlo dejaría anclas muertas. **Esa premisa
 * dejó de ser cierta el 2026-08-15**, y esta entrega solo cobra el cambio: la
 * crítica #6 (P0-2) midió con clic real que las anclas RELATIVAS no navegaban
 * desde las legales y las hizo ABSOLUTAS en el modelo compartido
 * (`/#story`, no `#story`; ver el bloque "LAS ANCLAS SON ABSOLUTAS" de
 * `src/config/navigation.ts`), y la crítica #12 las hizo además conscientes
 * del idioma (`/en#story` en la rama inglesa, vía `navGroupsFor`). Un ancla
 * del `Navbar` pulsada desde aquí navega a la home y aterriza en su sección:
 * no queda ninguna muerta, que era el único defecto que D20 evitaba.
 *
 * ## POR QUÉ EL PROPIO `Navbar` Y NO UNA LISTA COMPUESTA AQUÍ
 *
 * La alternativa considerada era componer los mismos destinos desde
 * `src/config/navigation.ts` dentro de una cabecera legal propia. Se descarta
 * por lo que habría que duplicar para igualar la cabecera, no por comodidad:
 *
 * - El desplegable «Más» (`NavMoreMenu`) NO se exporta desde `Navbar.tsx`, así
 *   que componer aquí obligaría a reescribirlo entero -- disparador con
 *   `aria-expanded`/`aria-controls`, cierre por Escape, cierre por click fuera
 *   y el `switch` que resuelve la etiqueta i18n de cada `kind`. Ese `switch` ya
 *   tiene TRES copias en el repo (`Navbar`, `NavSheet`, `Footer`) y RULES.md lo
 *   declara deuda conocida; una cuarta copia es exactamente lo que esa deuda
 *   pide no hacer.
 * - Y el objetivo del encargo es que no haya dos identidades. Dos componentes
 *   que hoy pintan la misma lista vuelven a divergir en cuanto uno de los dos
 *   se retoque; un solo componente no puede divergir de sí mismo.
 *
 * El precedente ya existía y esta entrega solo lo extiende: `app/not-found.tsx`
 * monta `Navbar` + `Footer` desde la Task 35 (2026-08-12) por este mismo
 * razonamiento, y es la página con la que las legales estaban desalineadas.
 *
 * ## QUÉ ARRASTRA EL `Navbar` QUE AQUÍ NO TIENE SUJETO, Y POR QUÉ NO ESTORBA
 *
 * - **Scrollspy** (`useActiveSectionKey`): se neutraliza SOLO, por su propio
 *   contrato -- fuera de la home ninguna de las secciones está en el DOM y
 *   devuelve `null`, así que no se emite ningún `aria-current="location"` en
 *   los enlaces de sección. Lo dice y lo aprovecha ya `LanguageSelector.tsx`,
 *   que depende del mismo singleton desde la ola G.
 * - **Despegue al hacer scroll** (`useNavDetach`): SÍ tiene sujeto aquí. No
 *   describe el hero -- describe el scroll --, y un documento legal es la
 *   página más larga del sitio (12.821 px medidos en `/privacidad`). La barra
 *   se despega en píldora igual que en la home, y como pasa a ser
 *   `position: fixed`, la navegación queda alcanzable a cualquier altura del
 *   documento en vez de solo arriba del todo. La compensación de layout que
 *   eso exige vive en `ScMain` (`legalPage.parts.tsx`), no aquí.
 *
 * ## «MÁS» Y LA HOJA MÓVIL
 *
 * Ninguno de los dos necesita nada propio en las legales: viajan dentro del
 * `Navbar` con su comportamiento intacto. A partir de `md` la barra pinta los
 * cuatro destinos de sección visibles y agrupa los otros nueve tras «Más»
 * (partición de presentación, `NAV_BAR_SECTION_KEYS`); por debajo de `md` la
 * barra oculta esa fila entera y el disparador de la hoja (`NavSheetTrigger`)
 * abre `NavSheet` con los catorce destinos agrupados y rotulados -- que es
 * justo la superficie que a 390 px resuelve mejor el problema, y la razón de
 * que a ese ancho la cabecera legal no necesite ningún tratamiento aparte.
 *
 * `NavSheet` se monta FUERA de `ScHeader` (lo decide el propio `Navbar`, ver
 * su JSX): un ancestro con `transform` sería el bloque contenedor de su
 * `position: fixed`. Aquí eso no cambia nada -- se monta como en la home.
 */
export function PrivacyDocument(): ReactElement {
  return (
    <>
      <Navbar />
      <LegalDocument docKey="privacy" />
      <Footer />
    </>
  );
}
