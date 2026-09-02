import { describe, it, expect } from "vitest";
import { color, STEPS, type Step } from "./color";
import { contrastRatio } from "./contrast";
import { themes } from "@/theme/themes";
import { languageAccent } from "@/components/layout/LanguageSelector/LanguageSelector";
import { navActiveAccent } from "@/components/layout/Navbar/NavSheet";
import { stepLabelColor } from "@/components/sections/Journey/Journey";
import { JOURNEY_STEPS } from "@/components/sections/Journey/journey.layers";

/**
 * Candado de FAMILIA (fix wave E, hallazgo E2 -- evaluador de navegador real,
 * 2026-08-13), no de caso. El propio hallazgo lo dice explícito: "es la
 * TERCERA vez que aparece esta familia exacta" -- Task 33 la arregló para
 * `languageAccent` (idioma activo del navbar), fix wave A hallazgo A4 para
 * `navActiveAccent` (punto de sección activa), y esta tarea para
 * `stepLabelColor` (etiquetas de paso de Journey). Las tres correcciones
 * fueron puntuales; este fichero es el primer candado que vigila el PATRÓN
 * -- "un acento de marca tomado directo de `palette` (sin pasar por un rol
 * semántico ya auditado) incumple AA por defecto sobre los fondos claros del
 * sistema" -- en vez de solo el síntoma de cada componente.
 *
 * Dos capas, deliberadamente distintas:
 *
 * 1. **El LÍMITE de la rampa** (`describe` de abajo, "límite de escalón"):
 *    barre cada escalón (`50`..`1100`) de las tres rampas de acento
 *    (`primary`/`secondary`/`error` -- las que este repo usa como acento de
 *    marca fuera de `semantic.*`; `warning`/`neutral` son roles (`success` fue rol hasta la crítica #10 y rampa hasta la #14, ya retirada)
 *    semánticos ya auditados por `contrast.test.ts`, no acentos sueltos)
 *    contra los DOS fondos claros del sistema (`semantic.bg`/
 *    `semantic.surface`) y AFIRMA el límite real: **700 es el primer
 *    escalón que pasa 4.5:1 en las tres rampas, ningún escalón por debajo
 *    lo pasa**. Esto es lo que hace que el candado cubra la FAMILIA: si
 *    mañana un componente nuevo usa `palette.secondary[600]` como color de
 *    texto sobre un fondo claro del sistema, este mismo límite (ya
 *    demostrado aquí) dice que incumple, sin tener que escribir un test
 *    nuevo por componente para descubrirlo.
 * 2. **Los CONSUMIDORES reales** (`describe` de abajo, "consumidores
 *    reales"): importa y mide las funciones YA resueltas por rama que este
 *    repo usa hoy para accents de marca sobre fondos claros
 *    (`languageAccent`, `navActiveAccent`, `stepLabelColor` -- las tres
 *    documentadas con sus propios candados por componente, que siguen
 *    viviendo en sus ficheros; esto NO los sustituye, los agrupa) -- si
 *    cualquiera de las tres retrocede a un escalón <700 en tema claro, sale
 *    en rojo aquí ADEMÁS de en su candado propio.
 *
 * `contrastRatio` importado de `./contrast`, contra los tokens reales
 * (`color.*`/`themes.light.semantic.*`), nunca literales copiados a mano.
 */
describe("Familia: acentos de marca como color de texto sobre fondos claros del sistema", () => {
  const AA_TEXTO = 4.5;
  const ACCENT_RAMPS = ["primary", "secondary", "error"] as const;
  const LIGHT_BACKGROUNDS = [
    { nombre: "semantic.bg", value: themes.light.semantic.bg },
    { nombre: "semantic.surface", value: themes.light.semantic.surface },
  ] as const;

  describe("límite de escalón (documenta el piso real, no un número elegido a ojo)", () => {
    it.each(ACCENT_RAMPS)(
      "rampa %s: el escalón 700 pasa 4.5:1 contra los dos fondos claros del sistema",
      (ramp) => {
        LIGHT_BACKGROUNDS.forEach(({ nombre, value }) => {
          const ratio = contrastRatio(color[ramp][700], value);
          expect(
            ratio,
            `${ramp}/700 sobre ${nombre} da ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_TEXTO);
        });
      },
    );

    it.each(ACCENT_RAMPS)(
      "rampa %s: NINGÚN escalón por debajo de 700 (400/500/600) pasa 4.5:1 contra los dos fondos -- 700 es el piso real, no un margen de sobra",
      (ramp) => {
        const escalonesPorDebajo: Step[] = STEPS.filter(
          (step) => step >= 400 && step < 700,
        );
        expect(escalonesPorDebajo.length).toBeGreaterThan(0);

        escalonesPorDebajo.forEach((step) => {
          LIGHT_BACKGROUNDS.forEach(({ nombre, value }) => {
            const ratio = contrastRatio(color[ramp][step], value);
            expect(
              ratio,
              `${ramp}/${step} sobre ${nombre} da ${ratio.toFixed(2)}:1 -- se esperaba que incumpliera 4.5:1`,
            ).toBeLessThan(AA_TEXTO);
          });
        });
      },
    );
  });

  describe("consumidores reales (los resolvers por rama que ya usa el repo)", () => {
    it("languageAccent (LanguageSelector.tsx, Task 33) resuelve un escalón >= 700 de sobra en tema claro", () => {
      const color2 = languageAccent({ data: themes.light });
      LIGHT_BACKGROUNDS.forEach(({ nombre, value }) => {
        const ratio = contrastRatio(color2, value);
        expect(
          ratio,
          `languageAccent sobre ${nombre} da ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXTO);
      });
    });

    it("navActiveAccent (NavSheet.tsx, fix wave A hallazgo A4) resuelve un escalón que pasa incluso el umbral de texto (4.5:1), no solo el 3:1 que necesita como indicador no-textual", () => {
      const color2 = navActiveAccent({ data: themes.light });
      LIGHT_BACKGROUNDS.forEach(({ nombre, value }) => {
        const ratio = contrastRatio(color2, value);
        expect(
          ratio,
          `navActiveAccent sobre ${nombre} da ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXTO);
      });
    });

    it("stepLabelColor (Journey.tsx, fix wave E hallazgo E2) resuelve >= 4.5:1 en tema claro para los seis pasos, contra los dos fondos del sistema", () => {
      JOURNEY_STEPS.forEach((step) => {
        const resolved = stepLabelColor(themes.light, {
          colorRamp: step.colorRamp,
          colorStep: step.colorStep,
        });
        LIGHT_BACKGROUNDS.forEach(({ nombre, value }) => {
          const ratio = contrastRatio(resolved, value);
          expect(
            ratio,
            `stepLabelColor(${step.id}) sobre ${nombre} da ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_TEXTO);
        });
      });
    });
  });

  /*
   * Sonda de no-vacuidad (mismo patrón que `navActiveAccent.contrast.test.ts`/
   * `LanguageSelector.contrast.test.ts`): confirma que los escalones VIEJOS
   * que motivaron cada una de las tres correcciones (Task 33, fix wave A/A4,
   * fix wave E/E2) de verdad incumplían -- si esto pasara en verde con un
   * escalón que SÍ cumple, demostraría que el test de arriba no mide nada
   * real.
   */
  it("sonda de no-vacuidad: los escalones VIEJOS de las tres correcciones (semantic.brand = primary/500, primary/600, secondary/500, secondary/600, error/500) incumplían 4.5:1", () => {
    const viejos: { nombre: string; color: string }[] = [
      {
        nombre: "semantic.brand (primary/500, Task 33 antes)",
        color: color.primary[500],
      },
      {
        nombre: "primary/600 (stepLabelColor 'Aprende' antes)",
        color: color.primary[600],
      },
      {
        nombre: "secondary/500 (stepLabelColor 'Imagina' antes)",
        color: color.secondary[500],
      },
      {
        nombre: "secondary/600 (stepLabelColor 'Crea' antes)",
        color: color.secondary[600],
      },
      {
        nombre: "error/500 (stepLabelColor 'Evoluciona' antes)",
        color: color.error[500],
      },
    ];

    viejos.forEach(({ nombre, color: viejo }) => {
      const ratio = contrastRatio(viejo, themes.light.semantic.surface);
      expect(
        ratio,
        `${nombre} da ${ratio.toFixed(2)}:1 sobre semantic.surface -- se esperaba que incumpliera 4.5:1`,
      ).toBeLessThan(AA_TEXTO);
    });
  });
});
