import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { space } from "./space";
import { radius } from "./radius";
import { elevation } from "./elevation";
import { zIndex } from "./zIndex";

describe("scalar tokens", () => {
  describe("space: todos los valores", () => {
    it("contiene la escala completa de espaciado", () => {
      const expectedSpace = {
        0: "0",
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.5rem",
        6: "2rem",
        7: "3rem",
        8: "4rem",
        9: "6rem",
        10: "8rem",
      };
      expect(space).toEqual(expectedSpace);
    });
  });

  describe("radius: todos los valores", () => {
    it("contiene la escala completa de bordes redondeados", () => {
      const expectedRadius = {
        "xs": "2px",
        "sm": "4px",
        "md": "8px",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
        "full": "9999px",
      };
      expect(radius).toEqual(expectedRadius);
    });
  });

  describe("elevation: todos los valores", () => {
    it("contiene la escala completa de sombras", () => {
      const expectedElevation = {
        0: "none",
        1: "0 1px 2px oklch(0 0 0 / 0.06)",
        2: "0 4px 12px oklch(0 0 0 / 0.10)",
        3: "0 12px 32px oklch(0 0 0 / 0.16)",
        4: "0 20px 48px oklch(0 0 0 / 0.20)",
      };
      expect(elevation).toEqual(expectedElevation);
    });
  });

  describe("zIndex: todos los valores", () => {
    it("contiene la escala completa de capas", () => {
      const expectedZIndex = {
        base: 0,
        raised: 10,
        stickyNav: 100,
        dropdown: 200,
        overlay: 900,
        modal: 1000,
      };
      expect(zIndex).toEqual(expectedZIndex);
    });

    it("mantiene el orden correcto de capas", () => {
      expect(zIndex.base).toBeLessThan(zIndex.raised);
      expect(zIndex.raised).toBeLessThan(zIndex.stickyNav);
      expect(zIndex.stickyNav).toBeLessThan(zIndex.dropdown);
      expect(zIndex.dropdown).toBeLessThan(zIndex.overlay);
      expect(zIndex.overlay).toBeLessThan(zIndex.modal);
    });

    /*
     * CANDADO DE HOJA MUERTA (crítica externa #18, 2026-09-04), el que faltaba
     * y el motivo de que `toast: 1100` sobreviviera tres rondas: los dos tests
     * de arriba cierran la escala con `toEqual` y comprueban su orden, así que
     * un peldaño que nadie consume los pasa en verde por construcción — basta
     * con escribirlo también en el `toEqual`. Lo que ninguno miraba es si
     * alguien lo LEE.
     *
     * Mide por PELDAÑO y sobre el código real, con los comentarios despojados
     * por el mismo motivo que el candado gemelo de `motion.staggerMs`: los
     * docblocks de esta ola citan `zIndex.toast` en prosa para explicar su
     * retirada, y sin despojarlos esas citas bastarían para dar por vivo un
     * peldaño que no pinta nada. Cuenta las DOS formas de acceso que el repo
     * usa (`zIndex.modal` y `zIndex["modal"]`).
     */
    const raizSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const EXTENSIONES = new Set([".ts", ".tsx"]);

    function recorrer(dir: string, salida: string[] = []): string[] {
      for (const entrada of readdirSync(dir)) {
        const completo = join(dir, entrada);
        if (statSync(completo).isDirectory()) recorrer(completo, salida);
        else if (EXTENSIONES.has(extname(completo))) salida.push(completo);
      }
      return salida;
    }

    function despojar(fuente: string): string {
      return fuente
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(?<!:)\/\/.*$/gm, "");
    }

    function consumidoresDe(peldano: string): string[] {
      const patron = new RegExp(
        String.raw`\bzIndex(?:\.` +
          peldano +
          String.raw`\b|\[["']` +
          peldano +
          String.raw`["']\])`,
      );
      const encontrados: string[] = [];
      for (const fichero of recorrer(raizSrc)) {
        const relativo = fichero
          .slice(raizSrc.length + 1)
          .split("\\")
          .join("/");
        if (relativo === "theme/tokens/zIndex.ts") continue; // la fuente
        if (relativo.endsWith(".test.ts") || relativo.endsWith(".test.tsx"))
          continue;
        if (patron.test(despojar(readFileSync(fichero, "utf8"))))
          encontrados.push(relativo);
      }
      return encontrados;
    }

    it("cada peldaño tiene al menos un consumidor real en código de producción", () => {
      const sinConsumidor = (
        Object.keys(zIndex) as Array<keyof typeof zIndex>
      ).filter((peldano) => consumidoresDe(peldano).length === 0);

      expect(sinConsumidor).toEqual([]);
    });

    /*
     * SONDA POSITIVA del mecanismo de arriba, sin la cual un `consumidoresDe`
     * roto (una ruta mal formada en Windows, un despojo demasiado agresivo)
     * devolvería cero para todos y el candado pasaría en verde diciendo lo
     * contrario de lo que mide. `stickyNav` es el peldaño con UN solo
     * consumidor conocido: si el motor lo ve, ve cualquiera.
     */
    it("sonda positiva: el mismo mecanismo encuentra al consumidor de stickyNav", () => {
      expect(consumidoresDe("stickyNav").length).toBeGreaterThan(0);
    });
  });
});
