import { describe, it, expect } from "vitest";
import { color } from "@/theme/tokens/color";
import { basicLightTheme } from "@/theme/themes";
import {
  BEAM_CORE,
  BEAM_MID,
  BEAM_TAIL,
  HOTSPOT_GLOW,
  SECTION_BEAM_DRAW_DELAY_MS,
  SECTION_BEAM_DRAW_MS,
  SECTION_BEAM_EASING,
  SECTION_BEAM_HEIGHT,
  SECTION_BEAM_HOTSPOT_W,
  SECTION_BEAM_PULSE_MS,
  SECTION_BEAM_SWEEP_DELAY_MS,
  SECTION_BEAM_SWEEP_MS,
  SECTION_BEAM_Z,
  SWEEP_CORE,
  SWEEP_GLOW,
  SWEEP_MID,
  beamCoreLight,
  beamMidLight,
  beamTailLight,
  hotspotGlowLight,
  sweepCoreLight,
  sweepGlowLight,
  sweepMidLight,
} from "./sectionBeam.layers";

/*
 * Los 7 literales oklch() y las 8 constantes de geometria/tiempo son
 * VERBATIM del mockup (`Footer animado v2.dc.html`, D18 de la spec): este
 * archivo los ata a las cadenas exactas citadas en la spec y en el docblock
 * de `sectionBeam.layers.ts`, para que un futuro retoque que "redondee" un
 * literal a un paso de `palette.*` se detecte aqui primero.
 */
describe("sectionBeam.layers: los 7 literales oklch() son verbatim del mockup", () => {
  it("semihaz de dibujado (mockup L46/L114)", () => {
    expect(BEAM_CORE).toBe("oklch(0.85 0.13 311.928)");
    expect(BEAM_MID).toBe("oklch(0.75 0.18 311.928 / 0.6)");
    expect(BEAM_TAIL).toBe("oklch(0.7 0.19 311.928 / 0.2)");
  });

  it("semihaz de barrido (mockup L48/L116)", () => {
    expect(SWEEP_CORE).toBe("oklch(0.97 0.06 311.928)");
    expect(SWEEP_MID).toBe("oklch(0.9 0.12 235.851 / 0.5)");
    expect(SWEEP_GLOW).toBe("oklch(0.8 0.17 311.928 / 0.9)");
  });

  it("punto caliente central (mockup L50/L118)", () => {
    expect(HOTSPOT_GLOW).toBe("oklch(0.8 0.17 311.928 / 0.95)");
  });
});

/*
 * Tonalidad CLARA (D1/D2 de la spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`): las 7 funciones
 * se miden contra `color`, los tokens REALES que resuelven
 * `theme.data.palette` (via `basicLightTheme.palette`, el mismo objeto que
 * usa el `ThemeProvider` para el tema claro) -- nunca contra un literal
 * oklch() copiado a mano aqui, que se desincronizaria de la rampa al primer
 * retoque sin que nada fallara. Los porcentajes de `color-mix` SI se
 * escriben literales: son la tabla D2 (el contrato), no un color.
 */
describe("sectionBeam.layers: tonalidad clara (D1/D2 -- funciones derivadas de palette)", () => {
  it("BEAM_CORE claro es secondary[600], sin alfa (nucleo denso)", () => {
    expect(beamCoreLight(basicLightTheme.palette)).toBe(color.secondary[600]);
  });

  it("BEAM_MID claro mezcla secondary[500] al 60% con transparent", () => {
    expect(beamMidLight(basicLightTheme.palette)).toBe(
      `color-mix(in oklab, ${color.secondary[500]} 60%, transparent)`,
    );
  });

  it("BEAM_TAIL claro mezcla secondary[400] al 20% con transparent", () => {
    expect(beamTailLight(basicLightTheme.palette)).toBe(
      `color-mix(in oklab, ${color.secondary[400]} 20%, transparent)`,
    );
  });

  it("SWEEP_CORE claro es secondary[700] -- MAS OSCURO que el nucleo dibujado (secondary[600]), al reves que en oscuro", () => {
    const sweepCore = sweepCoreLight(basicLightTheme.palette);
    expect(sweepCore).toBe(color.secondary[700]);
    expect(sweepCore).not.toBe(beamCoreLight(basicLightTheme.palette));
  });

  it("SWEEP_MID claro mezcla primary[600] al 50% con transparent (cruce de hue, como en oscuro)", () => {
    expect(sweepMidLight(basicLightTheme.palette)).toBe(
      `color-mix(in oklab, ${color.primary[600]} 50%, transparent)`,
    );
  });

  it("SWEEP_GLOW claro mezcla secondary[600] al 45% -- alfa reducida frente al 90% embebido en el literal oscuro (D2)", () => {
    expect(sweepGlowLight(basicLightTheme.palette)).toBe(
      `color-mix(in oklab, ${color.secondary[600]} 45%, transparent)`,
    );
  });

  it("HOTSPOT_GLOW claro mezcla secondary[600] al 50% -- alfa reducida frente al 95% embebido en el literal oscuro (D2)", () => {
    expect(hotspotGlowLight(basicLightTheme.palette)).toBe(
      `color-mix(in oklab, ${color.secondary[600]} 50%, transparent)`,
    );
  });
});

describe("sectionBeam.layers: geometria y tiempos", () => {
  it("las 9 constantes valen exactamente lo que documenta la spec", () => {
    expect(SECTION_BEAM_HEIGHT).toBe("2px");
    expect(SECTION_BEAM_Z).toBe(2);
    expect(SECTION_BEAM_HOTSPOT_W).toBe("170px");
    expect(SECTION_BEAM_DRAW_MS).toBe(1600);
    expect(SECTION_BEAM_DRAW_DELAY_MS).toBe(200);
    expect(SECTION_BEAM_SWEEP_MS).toBe(18000);
    expect(SECTION_BEAM_SWEEP_DELAY_MS).toBe(1800);
    expect(SECTION_BEAM_PULSE_MS).toBe(4500);
    expect(SECTION_BEAM_EASING).toBe("cubic-bezier(0.16, 0.8, 0.3, 1)");
  });
});
