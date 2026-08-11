import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
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

  it("mantiene compatibilidad: 'lead' es un alias de bodyLg y renderiza <p>", () => {
    renderWithProviders(<Typography variant="lead">Texto lead</Typography>);
    const el = screen.getByText("Texto lead");
    expect(el.tagName).toBe("P");
  });

  it.each([
    ["display", "H1"],
    ["h1", "H1"],
    ["h2", "H2"],
    ["h3", "H3"],
    ["h4", "H4"],
    ["h5", "H5"],
  ] as const)(
    "la variante de titular '%s' renderiza <%s> por defecto",
    (variant, expectedTag) => {
      renderWithProviders(
        <Typography variant={variant}>Titular {variant}</Typography>,
      );
      expect(screen.getByText(`Titular ${variant}`).tagName).toBe(expectedTag);
    },
  );

  it.each(["overline", "caption"] as const)(
    "la variante '%s' renderiza <span> por defecto",
    (variant) => {
      renderWithProviders(
        <Typography variant={variant}>Texto {variant}</Typography>,
      );
      expect(screen.getByText(`Texto ${variant}`).tagName).toBe("SPAN");
    },
  );

  it("la variante 'code' renderiza <code> por defecto", () => {
    renderWithProviders(<Typography variant="code">const x = 1;</Typography>);
    expect(screen.getByText("const x = 1;").tagName).toBe("CODE");
  });

  it.each(["bodyLg", "body", "bodySm"] as const)(
    "la variante de prosa '%s' renderiza <p> por defecto",
    (variant) => {
      renderWithProviders(
        <Typography variant={variant}>Prosa {variant}</Typography>,
      );
      expect(screen.getByText(`Prosa ${variant}`).tagName).toBe("P");
    },
  );

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
   * Equilibrado de linea de las variantes de CUERPO (encargo del usuario
   * 2026-08-04). Se lee el CSS inyectado y no `getComputedStyle`: jsdom no
   * conoce `text-wrap-style` como propiedad, asi que el estilo computado la
   * devuelve vacia y una asercion sobre el pasaria en verde con la regla
   * ausente. El texto de la regla inyectada, en cambio, es exactamente lo que
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

  it.each(["bodyLg", "body", "bodySm"] as const)(
    "la variante de cuerpo %s declara las DOS formas del equilibrado",
    (variant) => {
      renderWithProviders(
        <Typography
          variant={variant}
          data-testid={`cuerpo-${variant}`}
        >
          Texto de cuerpo
        </Typography>,
      );
      const css = reglasDe(screen.getByTestId(`cuerpo-${variant}`));

      // La shorthand es la base de compatibilidad y la longhand la propiedad
      // que pide el encargo: se exigen las dos, no una cualquiera.
      expect(css).toContain("text-wrap: balance");
      expect(css).toContain("text-wrap-style: balance");
    },
  );

  it.each(["overline", "code"] as const)(
    "la variante %s NO recibe el equilibrado de cuerpo",
    (variant) => {
      renderWithProviders(
        <Typography
          variant={variant}
          data-testid={`otra-${variant}`}
        >
          Etiqueta
        </Typography>,
      );
      const css = reglasDe(screen.getByTestId(`otra-${variant}`));

      // Control negativo: sin esto, "aplicalo a todo" pasaria el test de
      // arriba igual de verde y nadie notaria que se equilibra tambien un
      // bloque de codigo monoespaciado o una etiqueta de dos palabras.
      expect(css).not.toContain("text-wrap-style: balance");
    },
  );
});
