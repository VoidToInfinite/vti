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
});
