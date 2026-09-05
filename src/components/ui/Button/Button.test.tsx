import { createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { basicLightTheme } from "@/theme/themes";
import { Button } from "./Button";

/** Texto CSS de todas las reglas inyectadas por styled-components, planas
 *  (incluidas las anidadas dentro de selectores como &:focus-visible): mismo
 *  patrón que Navbar.test.tsx/Eye.test.tsx. jsdom no evalúa pseudo-clases
 *  dinámicas como :focus-visible al calcular getComputedStyle (no hay
 *  "modalidad de foco" real sin un navegador), así que la única forma fiable
 *  de atar la regla es leer el CSSOM que styled-components ya inyectó. */
function allCssRules(): string[] {
  const reglas: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      reglas.push(rule.cssText);
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) walk(anidadas);
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return reglas;
}

describe("Button", () => {
  it("renderiza como button con su label", () => {
    renderWithProviders(<Button>Explorar</Button>);
    expect(
      screen.getByRole("button", { name: "Explorar" }),
    ).toBeInTheDocument();
  });

  it("en loading marca aria-busy y deshabilita", () => {
    renderWithProviders(<Button loading>Enviar</Button>);
    const b = screen.getByRole("button");
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b).toBeDisabled();
  });

  it("en loading conserva el label en el DOM (el ancho no salta)", () => {
    renderWithProviders(<Button loading>Enviar</Button>);
    expect(screen.getByText("Enviar")).toBeInTheDocument();
  });

  it("en loading conserva el nombre accesible del botón (el label se oculta con opacity, no visibility)", () => {
    renderWithProviders(<Button loading>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  it("no dispara onClick si está disabled", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button
        disabled
        onClick={onClick}
      >
        X
      </Button>,
    );
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    b.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("no dispara onClick si está loading", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button
        loading
        onClick={onClick}
      >
        X
      </Button>,
    );
    screen.getByRole("button").click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("dispara onClick cuando está habilitado", () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Guardar</Button>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /*
   * Ocho combinaciones, no dieciséis: `success` y `danger` se retiraron del
   * union `ButtonIntent` en la crítica externa #10 (2026-08-18) por
   * inalcanzables — cero call sites de producción pasaban la prop `intent`, y
   * esta tabla era, junto con `IconButton.test.tsx`, el único sitio del repo
   * que los ejercitaba. La tabla se recorta con el union en el mismo cambio
   * (regla 40: se actualiza, no se relaja); si alguien devolviera un valor
   * muerto al union sin volver aquí, `tsc` ya no lo señalaría, pero el
   * docblock de `ButtonIntent` explica por qué no debe volver.
   */
  it.each([
    ["solid", "primary"],
    ["solid", "neutral"],
    ["soft", "primary"],
    ["soft", "neutral"],
    ["outline", "primary"],
    ["outline", "neutral"],
    ["ghost", "primary"],
    ["ghost", "neutral"],
  ] as const)(
    "renderiza sin fallar con variant='%s' e intent='%s'",
    (variant, intent) => {
      renderWithProviders(
        <Button
          variant={variant}
          intent={intent}
        >
          Botón
        </Button>,
      );
      expect(screen.getByRole("button", { name: "Botón" })).toBeInTheDocument();
    },
  );

  it.each(["sm", "md", "lg"] as const)(
    "renderiza sin fallar con size='%s'",
    (size) => {
      renderWithProviders(<Button size={size}>Tamaño {size}</Button>);
      expect(
        screen.getByRole("button", { name: `Tamaño ${size}` }),
      ).toBeInTheDocument();
    },
  );

  /*
   * Task 9 (craft de interacción, punto 4 del brief): la curva del press
   * (transform, compartida con el hover-lift) migra de motion.easing.standard
   * a vocabulary.PRESS.easing -- primera adopción real de PRESS.
   * background-color se queda con motion.easing.standard, sin tocar.
   * Validado con el bug inyectado a propósito (ver informe de la tarea,
   * tabla Button): revirtiendo temporalmente la entrada de transform de
   * PRESS.durationMs/PRESS.easing a motion.duration.fast/easing.standard en
   * Button.tsx, este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 9: la transition de transform usa PRESS.durationMs/PRESS.easing, background-color se queda en motion.easing.standard", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    const transitionRule = propias.find(
      (r) => r.includes("transition") && r.includes("transform"),
    );
    expect(transitionRule).toBeDefined();
    expect(transitionRule).toContain(`${PRESS.durationMs}ms`);
    expect(transitionRule).toContain(PRESS.easing);
    expect(transitionRule).toContain(basicLightTheme.motion.easing.standard);
  });

  /*
   * Task 19 (punto 5 del brief, inventario de hoverGuard por grep de `:hover`
   * fuera de `@media (hover: hover)`): Button.tsx era, hasta esta tarea, el
   * ÚNICO de las ~10 familias pulsables del sitio con un hover-lift que MUEVE
   * (translateY) sin `PRESS.hoverGuard` -- pese a ser el propio origen citado
   * por el docblock de `PRESS.hoverLift` en `vocabulary.ts`. Validado con el
   * bug inyectado a propósito (ver informe de la tarea): quitando el bloque
   * `@media ${PRESS.hoverGuard}` de Button.tsx (dejando el `:hover` suelto),
   * este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 19: el hover-lift (translateY) vive dentro de PRESS.hoverGuard -- (hover: hover) and (pointer: fine)", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    const guardado = propias.some(
      (r) =>
        r.includes(`@media ${PRESS.hoverGuard}`) &&
        r.includes(":hover") &&
        r.includes("translateY(-2px)"),
    );
    expect(
      guardado,
      "el hover-lift de Button no está guardado tras PRESS.hoverGuard",
    ).toBe(true);
  });

  /*
   * Fix de revisión (Task 19): `&:hover, &:active { transform: none }` bajo
   * `prefers-reduced-motion: reduce` compilaba a especificidad (0,2,0) --
   * menor que la de las reglas reales que quiere anular,
   * `&:hover:not(:disabled):not([aria-disabled="true"])` (0,4,0): `:not()`
   * toma la especificidad de su argumento, así que cada uno de los dos
   * `:not()` suma un punto sobre el simple `:hover`. Con menor especificidad
   * el guard nunca gana, pese a venir después en la hoja: bajo `reduce`,
   * `transform: translateY(-2px)` seguía aplicándose en `:hover` (el
   * colapso global de `transition-duration` lo dejaba como salto instantáneo
   * de 2px en vez de movimiento animado, pero seguía siendo movimiento).
   *
   * jsdom no simula pseudo-clases dinámicas (`:hover`/`:active`) al resolver
   * `getComputedStyle` (mismo motivo que `:focus-visible`, ver el docblock de
   * `allCssRules`), así que este candado no puede medir "quién gana la
   * cascada" directamente -- mide que el SELECTOR del guard tiene la MISMA
   * forma (mismos `:not()`) que las reglas reales, que es la condición que
   * garantiza la victoria por especificidad. La victoria real (transform se
   * queda en "none" bajo reduce con el ratón encima) se verificó en
   * navegador real (informe de la tarea).
   *
   * Validado con el bug inyectado a propósito: quitando los dos `:not(...)`
   * del guard de `reduce` (dejando `&:hover, &:active` a secas, el código
   * previo a este fix), este test se pone en rojo; restaurado, vuelve a
   * verde.
   */
  it("Task 19 (fix de revisión): el guard de reduce iguala la especificidad de :hover/:active reales -- (0,4,0), no (0,2,0)", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    const reduceBlock = propias.find(
      (r) =>
        r.includes("prefers-reduced-motion: reduce") &&
        r.includes("transform: none"),
    );
    expect(
      reduceBlock,
      "no se encontró el bloque de reduce con transform: none",
    ).toBeDefined();
    expect(reduceBlock).toContain(
      ':hover:not(:disabled):not([aria-disabled="true"])',
    );
    expect(reduceBlock).toContain(
      ':active:not(:disabled):not([aria-disabled="true"])',
    );
  });

  /*
   * Task 13, punto 2 del brief: elimina el retardo de ~300ms de doble-tap.
   * Raíz de composición -- IconButton (`styled(Button)`) y todo lo que
   * compone sobre él (BackToTop, ThemeToggle) heredan esta declaración sin
   * repetirla. Validado con el bug inyectado a propósito (ver informe de la
   * tarea): comentando temporalmente `touch-action: manipulation;` en
   * Button.tsx, este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: declara touch-action: manipulation", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    expect(propias.some((r) => r.includes("touch-action: manipulation"))).toBe(
      true,
    );
  });

  it("acepta el ref como prop (React 19, sin forwardRef) y apunta al <button>", () => {
    const ref = createRef<HTMLButtonElement>();
    renderWithProviders(<Button ref={ref}>Con ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  it("con as='a' y href se anuncia como enlace, no como boton", () => {
    renderWithProviders(
      <Button
        as="a"
        href="https://example.invalid/x"
      >
        Ir
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Ir" })).toHaveAttribute(
      "href",
      "https://example.invalid/x",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("propaga props nativas del <button> (type, aria-label, onClick)", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button
        type="submit"
        aria-label="Enviar formulario"
        onClick={onClick}
      >
        Enviar
      </Button>,
    );
    const b = screen.getByRole("button", { name: "Enviar formulario" });
    expect(b).toHaveAttribute("type", "submit");
    b.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("con as='a' y disabled no emite el atributo disabled, marca aria-disabled y retira el href", () => {
    renderWithProviders(
      <Button
        as="a"
        href="/x"
        disabled
      >
        Ir
      </Button>,
    );
    // Sin href, el <a> deja de tener rol "link" (HTML-AAM), así que se
    // localiza por el texto y se sube al elemento <a> real con closest.
    const anchor = screen.getByText("Ir").closest("a");
    expect(anchor).not.toBeNull();
    expect(anchor).not.toHaveAttribute("disabled");
    expect(anchor).toHaveAttribute("aria-disabled", "true");
    expect(anchor).not.toHaveAttribute("href");
  });

  it("con as='a' y disabled queda fuera del orden de tabulación", () => {
    renderWithProviders(
      <Button
        as="a"
        href="/x"
        disabled
      >
        Ir
      </Button>,
    );
    const anchor = screen.getByText("Ir").closest("a");
    expect(anchor).toHaveAttribute("tabindex", "-1");
  });

  it("el <button> deshabilitado sigue usando el atributo nativo disabled (no-regresion)", () => {
    renderWithProviders(<Button disabled>Enviar</Button>);
    const b = screen.getByRole("button", { name: "Enviar" });
    expect(b).toHaveAttribute("disabled");
    expect(b).not.toHaveAttribute("aria-disabled");
  });

  it("con as='a' sin disabled conserva el href y no lleva aria-disabled", () => {
    renderWithProviders(
      <Button
        as="a"
        href="/x"
      >
        Ir
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ir" });
    expect(link).toHaveAttribute("href", "/x");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  /*
   * ESTE BLOQUE SE DIO LA VUELTA el 2026-09-02 (crítica externa #14, P1 de
   * Craft). Hasta esa fecha ataba lo contrario de lo que ata ahora: que las
   * cuatro variantes declararan un halo PROPIO de `:focus-visible`
   * (`focusHalo`, box-shadow de 4px contra `semantic.focus`) además del
   * anillo global. Ese halo se retiró -- el sitio tenía tres vocabularios de
   * anillo de foco y ahora tiene uno solo, declarado en `GlobalStyles.tsx`
   * con la geometría de `src/theme/tokens/focus.ts` --, así que el candado
   * pasa a proteger la propiedad NUEVA: que `Button` no vuelva a declarar
   * anillo por su cuenta.
   *
   * Un candado de AUSENCIA es débil si se queda solo, así que cada test lleva
   * su sonda positiva: `reglasDe` ya falla si el elemento no tiene ninguna
   * clase inyectada, y la variante `outline` comprueba además que su anillo
   * `inset` de reposo -- lo único que este componente sigue pintando con
   * `box-shadow` -- sobrevive intacto.
   */
  describe("anillo de foco único (crítica #14, P1): Button no declara anillo propio", () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    afterEach(() => {
      window.localStorage.clear();
    });

    // Localiza, para un render concreto, la clase que styled-components le
    // asignó de verdad (identificada porque ALGUNA regla inyectada la
    // menciona) y devuelve solo las reglas que la mencionan. Es obligatorio
    // acotar así: este describe renderiza varias variantes/temas en el MISMO
    // `document` a lo largo de la suite (styled-components no limpia su
    // hoja de estilos entre tests), así que buscar ":focus-visible" sin
    // acotar por clase puede devolver la regla de UN RENDER ANTERIOR -- el
    // primer `.find()` de una versión previa de este test lo demostró: el
    // filtro genérico encontraba la regla de la variante `solid` (renderizada
    // muchas veces antes en la suite) en vez de la de `outline`, y la
    // aserción sobre `inset` fallaba por el motivo equivocado.
    function reglasDe(el: HTMLElement): string[] {
      const reglas = allCssRules();
      const clases = Array.from(el.classList).filter((c) =>
        reglas.some((r) => r.includes(c)),
      );
      expect(
        clases.length,
        "no se encontró ninguna clase inyectada del elemento",
      ).toBeGreaterThan(0);
      return reglas.filter((r) => clases.some((c) => r.includes(c)));
    }

    /**
     * Reglas cuyo SELECTOR incluye `:focus-visible`. Se ata el MECANISMO --
     * que ninguna de ellas pinte anillo, con `box-shadow` o con `outline` --
     * y no el color: `semantic.focus` resuelve en claro al mismo valor exacto
     * que algún acento del sitio (medido: `oklch(0.53 0.13 235.851)` es a la
     * vez el rol de foco y el acento de una tarjeta de Features), así que un
     * candado por color daría rojo por el motivo equivocado en cuanto un
     * componente use ese tono para otra cosa.
     */
    function anillosDeFoco(el: HTMLElement): string[] {
      return reglasDe(el).filter(
        (regla) =>
          regla.includes(":focus-visible") &&
          (regla.includes("box-shadow") || regla.includes("outline")),
      );
    }

    // Solo el NOMBRE del tema: desde que el candado ata el mecanismo y no el
    // color, el objeto de tema ya no hace falta en el cuerpo del test.
    it.each(["light", "dark"] as const)(
      "variante solid: ninguna regla de :focus-visible pinta anillo, en el tema %s (lo pone GlobalStyles)",
      (nombreTema) => {
        window.localStorage.setItem("vti-theme", nombreTema);
        renderWithProviders(<Button variant="solid">Guardar</Button>);
        const boton = screen.getByRole("button", { name: "Guardar" });

        expect(anillosDeFoco(boton)).toEqual([]);
        // Y tampoco apaga el global (regla dura del repo: outline: none
        // vetado) en ningún selector, no solo en :focus-visible.
        expect(
          reglasDe(boton).some((regla) => /outline\s*:\s*none/.test(regla)),
        ).toBe(false);
      },
    );

    it("variante outline: conserva su anillo inset de reposo, que ya no hay que repetir en ningún bloque de foco", () => {
      renderWithProviders(<Button variant="outline">Cancelar</Button>);
      const boton = screen.getByRole("button", { name: "Cancelar" });
      const reglas = reglasDe(boton);

      // Sonda positiva: la variante sigue pintando SU sombra propia -- la
      // que existía antes del halo y no tiene nada que ver con el foco.
      const inset = reglas.find(
        (regla) =>
          regla.includes("box-shadow") &&
          regla.includes("inset") &&
          regla.includes(basicLightTheme.semantic.borderStrong),
      );
      expect(
        inset,
        "la variante outline perdió su anillo inset de reposo",
      ).toBeDefined();

      // Y ninguna regla de foco vuelve a mezclar ese anillo con un halo:
      // esa duplicación era una consecuencia de escribir el anillo de foco
      // con box-shadow, y desaparece con el anillo único por outline.
      expect(anillosDeFoco(boton)).toEqual([]);
    });

    it("las cuatro variantes dependen del MISMO anillo global: ninguna declara uno propio", () => {
      const variantes = ["solid", "soft", "outline", "ghost"] as const;
      const botones: HTMLElement[] = [];
      for (const variant of variantes) {
        window.localStorage.clear();
        renderWithProviders(
          <Button
            key={variant}
            variant={variant}
          >
            {`Variante ${variant}`}
          </Button>,
        );
        botones.push(
          screen.getByRole("button", { name: `Variante ${variant}` }),
        );
      }

      for (const boton of botones) {
        expect(
          anillosDeFoco(boton),
          `la variante del botón "${boton.textContent}" declara un anillo de foco propio`,
        ).toEqual([]);
      }
    });
  });

  /*
   * Crítica externa #12 (2026-08-19): el CTA medido bajo `forced-colors:
   * active` daba fondo `Canvas`, color `LinkText` y `border-top-width: 0px`
   * — sin borde ni fondo propios se leía como texto enlazado, no como botón.
   * En modo de colores forzados el navegador descarta los valores de autor de
   * `color`/`background-color`/`border-color` y fuerza `box-shadow: none`, así
   * que el fondo de `solid`, el anillo `inset` de `outline` y el halo de
   * `:focus-visible` desaparecen a la vez; el borde es lo único que ese modo
   * sí pinta.
   *
   * jsdom no evalúa NINGÚN `@media` (regla 36), así que este candado no puede
   * "activar" el modo forzado: inspecciona `document.styleSheets` acotando la
   * búsqueda al bloque `@media (forced-colors: active)` concreto — nunca por
   * substring del CSS completo — y comprueba, además, que la regla del borde
   * cuelga del MISMO elemento (su propia clase en `selectorText`, regla 35) y
   * no de un descendiente. Que el borde se vea de verdad en modo forzado es
   * verificación de navegador real, pendiente de humano (regla 47).
   */
  describe("forma de botón bajo forced-colors (crítica externa #12)", () => {
    /** Reglas de estilo declaradas DENTRO de un `@media (forced-colors: active)`. */
    function reglasForcedColors(): CSSStyleRule[] {
      const out: CSSStyleRule[] = [];
      const walk = (rules: CSSRuleList, dentro: boolean): void => {
        Array.from(rules).forEach((rule) => {
          const media = (rule as CSSMediaRule).media;
          const aqui =
            dentro ||
            (media ? /forced-colors:\s*active/.test(media.mediaText) : false);
          const anidadas = (rule as CSSGroupingRule).cssRules;
          if (anidadas) {
            walk(anidadas, aqui);
            return;
          }
          if (aqui && (rule as CSSStyleRule).selectorText !== undefined) {
            out.push(rule as CSSStyleRule);
          }
        });
      };
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          walk(sheet.cssRules, false);
        } catch {
          /* hoja inaccesible: no aporta */
        }
      });
      return out;
    }

    it.each(["solid", "soft", "outline", "ghost"] as const)(
      "variante %s: declara un borde propio dentro de @media (forced-colors: active)",
      (variant) => {
        renderWithProviders(
          <Button variant={variant}>{`Forzado ${variant}`}</Button>,
        );
        const boton = screen.getByRole("button", {
          name: `Forzado ${variant}`,
        });
        // Solo las clases que styled-components inyectó de verdad para ESTE
        // render (mismo criterio que reglasDe, arriba): la hoja acumula
        // renders anteriores de la suite entera.
        const propias = reglasForcedColors().filter((regla) =>
          Array.from(boton.classList).some((cls) =>
            regla.selectorText.includes(`.${cls}`),
          ),
        );
        const conBorde = propias.filter((regla) =>
          /border(-(top|right|bottom|left))?(-width|-style)?\s*:/.test(
            regla.style.cssText || regla.cssText,
          ),
        );
        expect(
          conBorde.length,
          `la variante ${variant} no declara borde bajo forced-colors`,
        ).toBeGreaterThan(0);
        // El borde cuelga del propio elemento, no de un descendiente suyo:
        // `.claseX` a secas, sin nada detrás (regla 35 — la forma del
        // selector se afirma sobre selectorText, no por substring del CSS).
        for (const regla of conBorde) {
          expect(regla.selectorText.trim()).toMatch(/^\.[\w-]+$/);
        }
      },
    );
  });
});

/*
 * OLA R (2026-09-05): EL RELLENO DEL EJE INLINE DEJA DE COMERSE EL ROTULO.
 *
 * EL DEFECTO, MEDIDO ANTES DE TOCAR NADA. Chrome sobre el build de produccion
 * servido, `Page.setFontSizes` a 32 px --la MISMA palanca que la preferencia
 * de tamano de texto del usuario, la que exige WCAG 1.4.4--,
 * `prefers-reduced-motion: reduce`, 320 px de viewport: el CTA «Escribeme» de
 * la seccion de Contacto, que es un Button `lg`, quedaba con 58,8 px de rotulo
 * en 9 lineas --una letra por linea-- en las DOS ramas de tema. Con la raiz al
 * doble, sus `space[6]` valian 64 px por lado dentro de un contenedor de 192,
 * asi que el relleno se quedaba con dos tercios del control.
 *
 * QUE ATA ESTE DESCRIBE, y por que no es un espejo del codigo. No afirma que
 * el relleno "valga 2rem": lee el valor REALMENTE inyectado por
 * styled-components para cada tamano, comprueba que ES el peldano de
 * `inlineSpace` que le toca --comparado contra el token importado, nunca
 * contra una cadena escrita a mano (regla 38)-- y resuelve con la aritmetica
 * del navegador cuanto rotulo queda a raiz 32 y 320 px de viewport dentro del
 * marco oscuro de Contacto. La CONDICION que el defecto incumplia es esa
 * ultima: que en la banda mas estrecha, con la fuente al doble, el rotulo siga
 * teniendo columna.
 *
 * VALIDADO CON BUG INYECTADO (2026-09-05). Se devolvio el tamano `lg` a
 * `padding: 0 space[6]` y se ejecuto la suite. Dos casos en rojo con estas
 * lineas LITERALES:
 *
 *   lg declara un relleno inline que se dobla con la fuente mientras el
 *   viewport sigue en 320 px: expected '2rem' to be 'min(2rem, 10vw)' //
 *   Object.is equality
 *
 *   con la fuente al 200 % sobre 320 px el rotulo de un boton lg se queda con
 *   128px dentro de un contenedor de 256px; el 2026-09-05 el CTA de Contacto
 *   medido en Chrome daba 58,8px en 9 lineas, una letra por linea.: expected
 *   128 to be greater than or equal to 190
 *
 * Restaurado `inlineSpace[6]`, los cuatro casos en verde.
 */
describe("Button: los rellenos del eje inline con la fuente al 200 % (ola R)", () => {
  /**
   * Ancho de viewport mas estrecho que el sitio soporta: el suelo de reflow de
   * WCAG 1.4.10 (320 px CSS, lo que queda de 1280 px al 400 % de zoom). Es el
   * mismo numero contra el que se calibra `inlineSpace`.
   */
  const ANCHO_MINIMO_SOPORTADO_PX = 320;

  /** La raiz del documento en reposo, contra la que se resuelven los rem. */
  const RAIZ_PX = 16;

  /** La raiz con la preferencia de tamano de texto del usuario al 200 %. */
  const RAIZ_AL_200_PX = 32;

  /**
   * Columna minima que le tiene que quedar al rotulo de un boton `lg` dentro
   * del marco oscuro de Contacto en la banda estrecha con la fuente al 200 %.
   * Es la aritmetica de la ola R: el marco deja 256 px y el boton devuelve 192
   * al rotulo, asi que 190 es un suelo con margen y muy por encima de los 58,8
   * px medidos en Chrome antes del arreglo.
   */
  const ROTULO_MINIMO_PX = 190;

  /**
   * Resuelve un valor CSS a pixeles con la misma aritmetica que el navegador:
   * el `rem` contra la raiz que se le pase y el `min(<rem>, <vw>)` de
   * `inlineSpace` como min(A * raiz, B * viewport / 100).
   */
  function aPx(valor: string, raizPx: number, viewportPx: number): number {
    const limpio = valor.trim();
    if (limpio === "0") return 0;
    const rem = limpio.match(/^([\d.]+)rem$/);
    if (rem) return Number(rem[1]) * raizPx;
    const px = limpio.match(/^([\d.]+)px$/);
    if (px) return Number(px[1]);
    const acotado = limpio.match(/^min\(\s*([\d.]+)rem\s*,\s*([\d.]+)vw\s*\)$/);
    if (acotado) {
      return Math.min(
        Number(acotado[1]) * raizPx,
        (Number(acotado[2]) * viewportPx) / 100,
      );
    }
    throw new Error(`el candado no sabe convertir "${limpio}" a pixeles`);
  }

  /**
   * Separa los valores de una lista CSS por espacios de NIVEL SUPERIOR: los
   * que quedan dentro de un parentesis no cuentan. Sin esto,
   * `0 min(1rem, 5vw)` se partiria en tres trozos y el segundo seria
   * "min(1rem,".
   */
  function separarValores(lista: string): string[] {
    const salida: string[] = [];
    let actual = "";
    let profundidad = 0;
    Array.from(lista.trim()).forEach((caracter) => {
      if (caracter === "(") profundidad += 1;
      if (caracter === ")") profundidad -= 1;
      if (profundidad === 0 && /\s/.test(caracter)) {
        if (actual !== "") salida.push(actual);
        actual = "";
        return;
      }
      actual += caracter;
    });
    if (actual !== "") salida.push(actual);
    return salida;
  }

  /**
   * Valor del eje INLINE de la shorthand `padding` realmente inyectada para
   * ESTE render. Se acota por las clases del propio elemento: la hoja de
   * styled-components acumula todos los renders de la suite y una busqueda sin
   * acotar devolveria el relleno de otro tamano (mismo motivo que documenta
   * `reglasDe` en el describe del anillo de foco, mas arriba).
   */
  function rellenoInlineDe(boton: HTMLElement): string {
    const conRelleno = allCssRules().filter(
      (regla) =>
        Array.from(boton.classList).some((cls) => regla.includes(`.${cls}`)) &&
        /(?:^|[\s;{])padding:/.test(regla),
    );
    expect(
      conRelleno.length,
      "ninguna regla inyectada para este boton declara padding",
    ).toBeGreaterThan(0);
    const valores = separarValores(
      conRelleno[0].match(/(?:^|[\s;{])padding:\s*([^;}]+)/)?.[1] as string,
    );
    // 1 valor: los cuatro lados. 2, 3 o 4: el segundo es el eje inline.
    return valores.length === 1 ? valores[0] : valores[1];
  }

  it.each([
    ["sm", 4],
    ["md", 5],
    ["lg", 6],
  ] as const)(
    "el tamano %s declara el relleno inline con el peldano acotado inlineSpace[%i], no con el rem desnudo",
    (size, peldano) => {
      renderWithProviders(<Button size={size}>{`Rotulo ${size}`}</Button>);
      const boton = screen.getByRole("button", { name: `Rotulo ${size}` });

      expect(
        rellenoInlineDe(boton),
        `${size} declara un relleno inline que se dobla con la fuente mientras el viewport sigue en ` +
          `${ANCHO_MINIMO_SOPORTADO_PX} px`,
      ).toBe(basicLightTheme.inlineSpace[peldano]);

      // Y con la raiz por defecto vale EXACTAMENTE el peldano de siempre: la
      // composicion normal del sitio no cambia ni un pixel al acotar.
      expect(
        aPx(rellenoInlineDe(boton), RAIZ_PX, ANCHO_MINIMO_SOPORTADO_PX),
        `${size} cambia de relleno en el regimen normal, que es lo unico que esta migracion NO puede hacer`,
      ).toBe(
        aPx(basicLightTheme.space[peldano], RAIZ_PX, ANCHO_MINIMO_SOPORTADO_PX),
      );
    },
  );

  it("con la fuente al 200 % sobre 320 px un boton lg deja columna de sobra al rotulo dentro del marco oscuro", () => {
    renderWithProviders(<Button size="lg">Escribeme</Button>);
    const boton = screen.getByRole("button", { name: "Escribeme" });

    // El contenedor es el marco oscuro de Contacto, que separa del viewport
    // con el MISMO peldano acotado (`ScDarkFrame`, padding-inline
    // inlineSpace[6]); su propio candado vive en Contact.test.tsx. Se resuelve
    // aqui desde el token en vez de escribir 256 a mano, para que el dia que el
    // peldano cambie las dos cuentas se muevan juntas.
    const relleno = (raizPx: number, valor: string): number =>
      aPx(valor, raizPx, ANCHO_MINIMO_SOPORTADO_PX);
    const contenedor =
      ANCHO_MINIMO_SOPORTADO_PX -
      2 * relleno(RAIZ_AL_200_PX, basicLightTheme.inlineSpace[6]);
    const rotulo =
      contenedor - 2 * relleno(RAIZ_AL_200_PX, rellenoInlineDe(boton));

    expect(
      rotulo,
      `con la fuente al 200 % sobre ${ANCHO_MINIMO_SOPORTADO_PX} px el rotulo de un boton lg se queda ` +
        `con ${rotulo}px dentro de un contenedor de ${contenedor}px; el 2026-09-05 el CTA de Contacto ` +
        "medido en Chrome daba 58,8px en 9 lineas, una letra por linea.",
    ).toBeGreaterThanOrEqual(ROTULO_MINIMO_PX);
  });
});
