import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { themes } from "@/theme/themes";
import { ctaGradientMidStop } from "@/components/layout/Brand/BrandName";
import { NotFoundContent } from "./NotFoundContent";

/** Texto CSS de las reglas que styled-components inyecto para un elemento
 *  (jsdom no evalua ningun @media, regla 36): mismo patron que
 *  legalPage.parts.test.tsx/Footer.test.tsx/Story.test.tsx. */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

/*
 * Aserciones de render trasladadas desde `app/not-found.test.tsx` (auditoria
 * SEO 2026-08-08): `app/not-found.tsx` paso a Server Component con
 * `metadata` propia y ya no puede llevar `"use client"`, asi que el `<h1>`/
 * `<p>` traducidos -- que SI necesitan cliente, consumen `useTranslation` --
 * se movieron a este componente aparte, mismo patron que
 * `PrivacyDocument.tsx`/`LegalDocument.test.tsx` para las paginas legales.
 */
describe("NotFoundContent", () => {
  it("renderiza el heading 404 traducido", () => {
    renderWithProviders(<NotFoundContent />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument();
  });

  /*
   * Task 3 (tres cierres pequeños, 2026-08-10): antes de esta tarea el h1
   * era un elemento nativo pelado, y `GlobalStyles.tsx` fuerza
   * `h1..h6 { font-size: 1em }` para TODO el sitio (regla que este test NO
   * toca) -- el titular real de la pagina heredaba el tamaño de fuente de
   * su contenedor en vez de leer como un titulo de nivel 1. Se mide
   * `getComputedStyle`, no el CSS inyectado: `font-size` no vive dentro de
   * ningun `@media`, asi que jsdom SI lo resuelve (regla 36/38 -- el
   * candado compara contra el TOKEN importado, nunca un literal a mano).
   * Bug inyectado a proposito (verificado en esta tarea): devolviendo el
   * heading a `variant="display"` (o a un `<h1>` nativo sin `Typography`)
   * este test se pone en rojo; restaurado a `variant="h1"`, vuelve a verde.
   */
  it("Task 3: el h1 mide el tamaño real de titulo (type.scale.h1), no el 1em heredado del reset global", () => {
    renderWithProviders(<NotFoundContent />);
    const heading = screen.getByRole("heading");
    expect(heading.tagName).toBe("H1");
    expect(getComputedStyle(heading).fontSize).toBe(
      themes.light.type.scale.h1.size,
    );
    expect(getComputedStyle(heading).fontSize).not.toBe("1em");
  });

  it("renderiza tambien el mensaje descriptivo", () => {
    renderWithProviders(<NotFoundContent />);
    expect(screen.getByText(/no existe/i)).toBeInTheDocument();
  });

  /*
   * Task 2 (skip link), review fix round 1 — hueco de evidencia señalado:
   * el <main> gana id="main" tabIndex={-1} como destino real del skip link
   * en esta ruta. Sin este test, la única prueba de que la 404 tiene el
   * landmark era una pasada de navegador que no cubría cada ruta por
   * separado.
   */
  it("el <main> tiene id='main' y tabIndex=-1 (destino del skip link)", () => {
    const { container } = renderWithProviders(<NotFoundContent />);
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  /*
   * P0 de la auditoria premium 2026-08-08: la 404 no tenia NINGUN enlace de
   * salida. Estas tres aserciones verifican, en este orden, las tres partes
   * del criterio del brief: el enlace existe, apunta a "/", y es un <a> REAL
   * (no un boton ni un <span> con onClick) -- lo tercero importa porque solo
   * un <a> real es alcanzable por teclado y anunciado como enlace por un
   * lector de pantalla sin JS adicional.
   */
  it("renderiza un enlace de vuelta al inicio", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace).toBeInTheDocument();
  });

  it("el enlace de vuelta apunta a la home ('/')", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace).toHaveAttribute("href", "/");
  });

  it("el enlace de vuelta es un <a> real, no un elemento simulado", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace.tagName).toBe("A");
  });

  /*
   * Revision final de rama (auditoria premium, hallazgo MENOR): el enlace de
   * vuelta era el unico enlace de texto pulsable del sitio sin la primitiva
   * de press de la Task 9 (vocabulary.PRESS), pese a que su propio docblock
   * afirmaba compartir "el MISMO lenguaje visual" que
   * `legalPage.parts.tsx#ScBackLink` -- que si la tenia desde esa tarea.
   * Mismo patron de aserciones que `legalPage.parts.test.tsx` ("ScBackLink
   * declara :active..."). Validado con el bug inyectado a proposito (regla
   * 34): comentando temporalmente el bloque `&:active` de `ScBackLink`
   * (`NotFoundContent.tsx`) este test se puso en rojo (no habia ninguna
   * regla :active con scale ni la entrada de transform en la transicion);
   * restaurado el bloque, volvio a verde.
   */
  it("el enlace de vuelta declara :active con transform: scale(PRESS.activeScale), transition de transform con PRESS.durationMs/PRESS.easing, y guard de reduce", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    const css = cssRuleTextFor(enlace);

    expect(css).toContain(":active");
    const activeBlock = css.slice(css.indexOf(":active"));
    expect(activeBlock).toContain(`scale(${PRESS.activeScale})`);
    expect(css).toContain(`${PRESS.durationMs}ms`);
    expect(css).toContain(PRESS.easing);

    expect(css).toContain("prefers-reduced-motion: reduce");
    const reduceBlock = css.slice(
      css.indexOf("prefers-reduced-motion: reduce"),
    );
    expect(reduceBlock).toContain("transition: none");
    expect(reduceBlock).toContain("transform: none");
  });

  /*
   * Task 13, punto 2 del brief: elimina el retardo de doble-tap. Validado
   * con el bug inyectado a propósito (ver informe de la tarea): comentando
   * temporalmente `touch-action: manipulation;` de ScBackLink
   * (NotFoundContent.tsx), este test se pone en rojo; restaurado, vuelve a
   * verde.
   */
  it("Task 13: el enlace de vuelta declara touch-action: manipulation", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    const css = cssRuleTextFor(enlace);
    expect(css).toContain("touch-action: manipulation");
  });

  /*
   * Critica #10, hallazgo C (integracion de la ola): este es el otro
   * `styled.main` del repo con el patron `max-width: prose` +
   * `margin-inline: auto` + padding dentro de `border-box`. Mismo arreglo y
   * mismo candado que `legalPage.parts.test.tsx`: `width: 100%` (sin ancho
   * definido, un item flex de la columna de `body` con margenes auto no se
   * estira y se dimensiona por contenido — Flexbox §8.3) y el tope sumando
   * los dos rellenos para que `grid.prose` gobierne la caja de CONTENIDO.
   * jsdom conserva el `calc()` con los saltos de linea del template, asi
   * que se normaliza el espacio antes de comparar. Validado con bug
   * inyectado (linea `width: 100%` retirada -> rojo; restaurada -> verde;
   * `calc` devuelto a `max-width: prose` pelado -> rojo).
   */
  it("critica #10: el main tiene ancho definido y la medida de prosa gobierna la caja de contenido", () => {
    const { container } = renderWithProviders(<NotFoundContent />);
    const main = container.querySelector("main") as HTMLElement;
    const css = cssRuleTextFor(main)
      .replace(/\s+/g, " ")
      .replace(/\(\s/g, "(")
      .replace(/\s\)/g, ")");

    expect(css).toMatch(/[{;]\s*width: 100%/);
    expect(css).toContain(
      `max-width: calc(${themes.light.grid.prose} + 2 * ${themes.light.space[5]})`,
    );
    expect(css).toContain(
      `max-width: calc(${themes.light.grid.prose} + 2 * ${themes.light.space[6]})`,
    );
  });

  /*
   * CRITICA EXTERNA #15, HALLAZGO C 4 -- LAS DOS MITADES DEL MISMO SINTOMA:
   * "la 404 no es del sitio". El evaluador midio (1) un CTA plano
   * -- `oklch(0.737 0.158 235.851)`, `padding: 0 24px` -- distinto del boton
   * primario real del sitio (`ctaGradient`, `padding: 0 32px`, el del hero y
   * el de Contacto), y (2) un `<main>` de 621 px con 137 px de tinta y 368
   * vacios bajo el boton.
   *
   * Los dos candados se afirman sobre el CSS REALMENTE INYECTADO (jsdom no
   * pinta ni evalua `@media`, reglas 36/44): lo que se ve en pantalla lo
   * cierra el integrador en navegador.
   */
  it("critica #15 C4: el CTA de vuelta pinta el MISMO degradado que el primario del hero y de Contacto, con el mismo tamano", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    const css = cssRuleTextFor(enlace);

    /* Las tres paradas se derivan de la MISMA fuente que consume el
       componente (`ctaGradient`/`ctaGradientMidStop` en `BrandName.tsx`),
       nunca de colores escritos a mano aqui: es lo que convierte este test en
       un candado de "es el mismo degradado" y no en una segunda copia que
       podria divergir (regla 41). */
    const paradasEsperadas = [
      themes.light.semantic.text,
      themes.light.semantic.brandText,
      ctaGradientMidStop(themes.light),
    ];
    const declaraciones =
      css.match(/background-image:\s*linear-gradient\([^;]*\);/g) ?? [];
    expect(
      declaraciones.length,
      "el CTA de la 404 volvio a ser un boton de relleno plano: ninguna declaracion background-image: linear-gradient(...)",
    ).toBeGreaterThan(0);
    for (const parada of paradasEsperadas) {
      expect(
        declaraciones.join(" "),
        `falta la parada ${parada} de ctaGradient`,
      ).toContain(parada);
    }

    /* El tamano sale de `size="lg"` del primitivo, no de un padding propio:
       esta asercion es ademas la que caza el gotcha `as`/`forwardedAs` -- con
       `as` sobre una capa `styled(Button)`, styled-components renderiza un
       `<a>` PELADO y `Button` entero (tamanos incluidos) desaparece, asi que
       este padding no se declararia.

       El peldano se lee de `inlineSpace` desde el 2026-09-05 (`Button.tsx`,
       ola de rellenos del eje inline): es el relleno LATERAL de un control con
       rotulo, y el token es el mismo peldano acotado al viewport. Se compara
       contra el token importado, no contra un rem a mano (regla 38). */
    expect(css.replace(/\s+/g, " ")).toContain(
      `padding: 0 ${themes.light.inlineSpace[6]}`,
    );
  });

  it("critica #15 C4: el bloque se centra en el alto disponible en vez de quedar pegado al techo", () => {
    const { container } = renderWithProviders(<NotFoundContent />);
    const main = container.querySelector("main") as HTMLElement;
    const css = cssRuleTextFor(main).replace(/\s+/g, " ");

    /* El alto disponible lo entrega `body > main { flex: 1 }`
       (`GlobalStyles.tsx`), que jsdom NO inyecta (regla 37: `createGlobalStyle`
       no inyecta nada bajo Vitest), asi que lo que se puede afirmar aqui es la
       mitad que vive en este componente: que la columna reparte su hueco
       centrando en vez de amontonar arriba. Que el hueco EXISTE se mide en
       navegador. */
    expect(css).toContain("flex-direction: column");
    expect(
      css,
      "sin justify-content la columna vuelve a flex-start: el bloque se pega al techo y deja el vacio debajo",
    ).toContain("justify-content: center");
  });
});
