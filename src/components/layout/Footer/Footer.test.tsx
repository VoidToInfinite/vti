import { describe, it, expect, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import esCommon from "@/i18n/locales/es/common.json";
import esHome from "@/i18n/locales/es/home.json";
import { links } from "@/config/links";
import { Footer } from "./Footer";

/*
 * Footer (spec 2026-07-28-landing-v2-secciones-design.md §7.5/§8): vive en
 * los dos temas, pero las columnas Explore/Discover (anclas a las 4
 * secciones de tema claro) solo tienen sentido cuando esas secciones están
 * montadas -- D6. Resources y la barra inferior (copyright + legales) no
 * dependen del tema.
 */

afterEach(() => {
  window.localStorage.clear();
});

describe("Footer", () => {
  it("en tema claro (por defecto) muestra las columnas Explore y Discover", () => {
    window.localStorage.setItem("vti-theme", "light");
    renderWithProviders(<Footer />);

    expect(
      screen.getByText(esCommon.Common.Footer.explore),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esCommon.Common.Footer.discover),
    ).toBeInTheDocument();

    for (const href of ["#story", "#journey", "#features", "#contact"]) {
      expect(
        document.querySelector(`a[href="${href}"]`),
        `falta el enlace ${href}`,
      ).not.toBeNull();
    }
    expect(
      screen.getByText(esHome.Home.features.learning.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.features.imagination.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.features.gaming.title),
    ).toBeInTheDocument();
  });

  it("en tema oscuro NO muestra las columnas Explore ni Discover (sus destinos no existen)", () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(<Footer />);

    expect(
      screen.queryByText(esCommon.Common.Footer.explore),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(esCommon.Common.Footer.discover),
    ).not.toBeInTheDocument();
    for (const href of ["#story", "#journey", "#contact"]) {
      expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
    }
  });

  it.each([["light"], ["dark"]] as const)(
    "en tema %s siempre muestra Resources y la barra inferior con el copyright",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      expect(
        screen.getByText(esCommon.Common.Footer.resources),
      ).toBeInTheDocument();
      expect(document.querySelector(`a[href="${links.docs}"]`)).not.toBeNull();
      expect(
        document.querySelector(`a[href="${links.guides}"]`),
      ).not.toBeNull();
      expect(
        document.querySelector(`a[href="${links.privacy}"]`),
      ).not.toBeNull();
      expect(document.querySelector(`a[href="${links.terms}"]`)).not.toBeNull();

      const year = new Date().getFullYear();
      expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument();
    },
  );

  it.each([["light"], ["dark"]] as const)(
    "en tema %s siempre muestra el tagline de marca",
    (theme) => {
      window.localStorage.setItem("vti-theme", theme);
      renderWithProviders(<Footer />);

      expect(
        screen.getByText(esCommon.Common.Footer.tagline),
      ).toBeInTheDocument();
    },
  );
});
