import { describe, it, expect } from "vitest";
import { absoluteUrl } from "@/config/site";
import robots, { dynamic } from "./robots";

describe("app/robots.ts — export const dynamic (H1)", () => {
  it(
    'exporta dynamic === "force-static" — sin esta línea el build de ' +
      '`output: "export"` falla (misma causa que app/sitemap.ts)',
    () => {
      expect(dynamic).toBe("force-static");
    },
  );
});

describe("robots()", () => {
  it("incluye la URL absoluta del sitemap", () => {
    expect(robots().sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });

  it("permite todo a todos los rastreadores, sin Disallow decorativo (D8: AEO/GEO/AIO)", () => {
    const { rules } = robots();
    if (Array.isArray(rules)) {
      throw new Error("se esperaba un único bloque de reglas, no un array");
    }
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toBeUndefined();
  });
});
