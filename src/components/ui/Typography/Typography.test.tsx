import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import type { TypeVariant } from "@/theme/tokens/type";
import { Typography } from "./Typography";

describe("Typography", () => {
  it("renderiza h2 como <h2>", () => {
    renderWithProviders(<Typography variant="h2">Título</Typography>);
    expect(
      screen.getByRole("heading", { level: 2, name: "Título" }),
    ).toBeInTheDocument();
  });

  it("permite override de elemento con as", () => {
    renderWithProviders(
      <Typography
        variant="h3"
        as="p"
      >
        P
      </Typography>,
    );
    expect(screen.getByText("P").tagName).toBe("P");
  });

  /*
   * AQUÍ VIVIÓ el test del alias 'lead' -> bodyLg. Retirado con el propio
   * alias en la crítica externa #9 (2026-08-17): era el ÚNICO sitio de todo
   * `src/`/`app/` que pasaba `variant="lead"`, así que probaba una
   * compatibilidad que no protegía a ningún consumidor real -- ver el docblock
   * del hueco que dejó en `Typography.tsx`.
   *
   * De aquel `it.each` de titulares desapareció la fila `["h4", "H4"]`, y más
   * abajo el test de `variant="code"`, por el mismo motivo y en el mismo
   * cambio que sus peldaños de la escala (`theme/tokens/type.ts`). Los tres
   * `it.each` sueltos que quedaban se sustituyeron por la tabla exhaustiva de
   * más abajo en la crítica externa #15 (2026-09-02).
   */
  /*
   * CANDADO EXHAUSTIVO variante -> etiqueta (crítica externa #15, 2026-09-02,
   * hallazgo C7). SUSTITUYE a los tres `it.each` que vivían aquí -- uno de
   * titulares, uno de `<span>` y uno de prosa --, que entre los tres cubrían
   * las variantes que a alguien le apeteció listar: `deckClosing` y
   * `deckBody`, añadidos en la #14, no estaban en ninguno de los tres, así
   * que su elemento por defecto nunca se decidió ni se probó.
   *
   * La tabla es un `Record<TypeVariant, ...>` COMPLETO, no un `Partial`, y
   * eso es todo el mecanismo: añadir un peldaño a `type.scale` sin decidir
   * qué etiqueta renderiza deja de compilar (`pnpm typecheck`), y cambiar el
   * mapa de `Typography` sin actualizar esta tabla sale en rojo. Es el mismo
   * criterio de contrato cerrado que la regla 40 pide del recuento de
   * `type.test.ts`: los dos sitios se tocan a la vez o no se toca ninguno.
   *
   * `h5` renderiza `<p>`, no `<h5>`: ver el docblock del hueco que dejó
   * `h5: "h5"` en `Typography.tsx` para el censo y para por qué un `<h5>`
   * bajo el `<h3>` de Features sería un salto de nivel.
   */
  const ELEMENTO_POR_DEFECTO: Record<TypeVariant, string> = {
    deckClosing: "P",
    display: "H1",
    h1: "H1",
    h2: "H2",
    h3: "H3",
    wordmark: "SPAN",
    h5: "P",
    deckBody: "P",
    body: "P",
    bodySm: "P",
    caption: "SPAN",
    overline: "SPAN",
  };

  it.each(Object.entries(ELEMENTO_POR_DEFECTO))(
    "la variante '%s' renderiza <%s> por defecto",
    (variant, etiqueta) => {
      renderWithProviders(
        <Typography variant={variant as TypeVariant}>
          Texto {variant}
        </Typography>,
      );
      expect(screen.getByText(`Texto ${variant}`).tagName).toBe(etiqueta);
    },
  );

  /*
   * La otra mitad del candado anterior: que NINGUNA variante fuera de las
   * cuatro de titular cree un encabezado. Sin esto, un mapa que devolviera
   * `h6` para `caption` seguiría en verde arriba mientras la tabla lo
   * declarase -- aquí se afirma la propiedad de accesibilidad (¿hay
   * encabezado?), no la etiqueta.
   */
  it.each(
    Object.entries(ELEMENTO_POR_DEFECTO).filter(
      ([, etiqueta]) => !/^H[1-6]$/.test(etiqueta),
    ),
  )("la variante '%s' NO añade un encabezado a la página", (variant) => {
    renderWithProviders(
      <Typography variant={variant as TypeVariant}>Sin encabezado</Typography>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("'as' tiene prioridad incluso sobre el elemento por defecto de un titular", () => {
    renderWithProviders(
      <Typography
        variant="display"
        as="p"
      >
        Display forzado a párrafo
      </Typography>,
    );
    const el = screen.getByText("Display forzado a párrafo");
    expect(el.tagName).toBe("P");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("reenvia data-testid al nodo renderizado", () => {
    // Sin esta propagacion el Hero no puede exponer los ganchos
    // hero-tagline/hero-subtitle y no hay nada que medir en navegador con
    // getComputedStyle.
    renderWithProviders(
      <Typography
        variant="body"
        data-testid="x"
      >
        Con gancho
      </Typography>,
    );
    expect(screen.getByText("Con gancho")).toHaveAttribute("data-testid", "x");
    expect(screen.getByTestId("x").tagName).toBe("P");
  });

  it("variant h3 con as p renderiza <p> y no crea un encabezado", () => {
    // Patron exacto del subtitulo del Hero: escala de titular sin anadir un
    // segundo encabezado a la pagina.
    renderWithProviders(
      <Typography
        variant="h3"
        as="p"
        data-testid="hero-subtitle"
      >
        Subtitulo
      </Typography>,
    );
    const el = screen.getByTestId("hero-subtitle");
    expect(el.tagName).toBe("P");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("reenvia id para poder asociarlo con aria-labelledby", () => {
    renderWithProviders(
      <Typography
        variant="h2"
        id="titulo-x"
      >
        Título
      </Typography>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute(
      "id",
      "titulo-x",
    );
  });

  /*
   * Equilibrado de linea: SOLO en titulares desde la critica externa #14
   * (2026-09-02, decision D1 del dueno). Hasta esa fecha lo recibian tambien
   * las dos variantes de CUERPO (encargo del usuario 2026-08-04) y el bloque
   * de tests de abajo probaba lo contrario de lo que prueba hoy -- el porque
   * completo, con las dos medidas del A/B en navegador, vive en el docblock
   * del hueco que dejaron `BODY_VARIANTS`/`BALANCE_DECLARATIONS` en
   * `Typography.tsx`.
   *
   * Se lee el CSS inyectado y no `getComputedStyle`: jsdom no conoce
   * `text-wrap-style` como propiedad, asi que el estilo computado la devuelve
   * vacia y una asercion sobre el pasaria en verde con la regla ausente -- y
   * en un test que ahora afirma AUSENCIA, esa via daria un verde vacio
   * siempre. El texto de la regla inyectada, en cambio, es exactamente lo que
   * llega al navegador.
   */
  function reglasDe(el: HTMLElement): string {
    const clases = el.className.split(" ").filter(Boolean);
    let texto = "";
    for (const hoja of Array.from(document.styleSheets)) {
      let reglas;
      try {
        reglas = hoja.cssRules;
      } catch {
        continue;
      }
      for (const regla of Array.from(reglas)) {
        if (clases.some((c) => regla.cssText.includes(`.${c}`))) {
          texto += regla.cssText;
        }
      }
    }
    return texto;
  }

  /*
   * Control POSITIVO, y es el que da sentido al negativo de abajo: el
   * equilibrado no desaparece del componente, se concentra en los titulares.
   * Sin esta mitad, borrar la interpolacion entera de `ScTypography` dejaria
   * el bloque completo en verde.
   */
  it.each(["display", "h1", "h2", "h3", "h5"] as const)(
    "critica #14: el titular %s SI conserva el equilibrado de linea",
    (variant) => {
      renderWithProviders(
        <Typography
          variant={variant}
          data-testid={`titular-${variant}`}
        >
          Titular equilibrado
        </Typography>,
      );
      const css = reglasDe(screen.getByTestId(`titular-${variant}`));

      expect(css).toContain("text-wrap: balance");
    },
  );

  /*
   * Control NEGATIVO. Las dos variantes de cuerpo entran aqui con la critica
   * externa #14 (decision D1: el equilibrado contradecia la promesa de
   * recuento de `grid.prose` -- 53,5 caracteres por linea con el, 64,5 sin
   * el, medido en navegador sobre los mismos nodos). `overline` y `caption`
   * ya estaban fuera y se quedan: un control negativo con cuatro miembros es
   * mas dificil de satisfacer por casualidad que uno con dos.
   *
   * Se exigen las DOS formas por separado (`text-wrap` y `text-wrap-style`),
   * no una cualquiera: `BALANCE_DECLARATIONS` declaraba ambas, asi que una
   * retirada a medias -- borrar la longhand y dejar la shorthand -- seguiria
   * equilibrando en todos los motores y tiene que salir en rojo.
   */
  it.each(["body", "bodySm", "overline", "caption"] as const)(
    "critica #14: la variante %s NO declara equilibrado de linea",
    (variant) => {
      renderWithProviders(
        <Typography
          variant={variant}
          data-testid={`sin-balance-${variant}`}
        >
          Texto sin equilibrado
        </Typography>,
      );
      const css = reglasDe(screen.getByTestId(`sin-balance-${variant}`));

      // Guarda contra el verde vacio: si `reglasDe` no encontrase la regla de
      // esta variante, los dos `not.toContain` pasarian sin probar nada.
      expect(css).toContain("font-size");

      expect(css).not.toContain("text-wrap: balance");
      expect(css).not.toContain("text-wrap-style: balance");
    },
  );
});
