import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { SITE } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import NotFound, { metadata } from "./not-found";

/*
 * Split de la 404 (auditoria SEO 2026-08-08): `not-found.tsx` paso de
 * Client Component monolitico a cascara de Server Component + metadata
 * propia, con el `<h1>`/`<p>` traducidos movidos a
 * `NotFoundContent.test.tsx` (mismo patron que las paginas legales, ver
 * `PrivacyDocument.tsx`/`app/privacidad/page.tsx`). Este archivo se queda
 * con lo que ESTE fichero declara de verdad: la `metadata` propia (antes
 * inexistente -- la ruta heredaba la de la home) y que el default export
 * siga montando el contenido real.
 */
describe("not-found metadata", () => {
  it("declara un titulo propio, no el de la home heredado del layout", () => {
    expect(metadata.title).toBe(
      `${esCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
  });

  it("la descripcion sale del mensaje 404 real, no de la de la home", () => {
    expect(metadata.description).toBe(esCommon.notFound.message);
  });

  /*
   * Candado del bug que esta entrega corrige: la version anterior, al
   * heredar la metadata de la home, emitia a la vez `noindex` (de un ajuste
   * suelto) e `index,follow` (de `buildMetadata()`) -- contradictorios. Una
   * 404 debe seguir enlaces (`follow: true`) pero NUNCA indexarse
   * (`index: false`).
   */
  it("robots declara index:false, follow:true -- nunca index:true ni un noindex/follow contradictorio", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  /*
   * `alternates` NO puede quedar sin declarar: un campo de primer nivel que
   * el hijo omite se HEREDA del padre, y `app/layout.tsx` declara la
   * canonica de la home -- medido en `out/404.html` (2026-08-08): la 404
   * emitia `<link rel="canonical" href="https://voidtoinfinite.com">`.
   * `canonical: null` sustituye la herencia y suprime la etiqueta.
   */
  it("anula la canonica heredada con alternates.canonical: null -- una 404 no tiene URL propia que canonicalizar", () => {
    expect(metadata.alternates).toEqual({ canonical: null });
  });
});

describe("NotFound (cascara de servidor)", () => {
  it("monta el contenido traducido real, no un marcador vacio", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument();
  });
});
