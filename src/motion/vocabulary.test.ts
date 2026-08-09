import { describe, it, expect } from "vitest";
import { REVEAL, DECK, PRESS, AMBIENT } from "./vocabulary";

/**
 * Contrato cerrado (regla 40 del manual): los cuatro grupos se aseveran con
 * `toEqual` completo, mismo criterio que `system.test.ts` aplica a
 * `motion.duration`/`motion.easing`. Quien añada, quite o cambie un campo de
 * cualquiera de los cuatro grupos actualiza estos objetos esperados en el
 * MISMO commit — la aserción nunca se relaja para que el test vuelva a
 * pasar sin más.
 *
 * Validado con bug inyectado (regla 34): se cambió temporalmente
 * `REVEAL.durationMs` de 480 a 999 en `vocabulary.ts`, se confirmó que
 * "REVEAL expone su contrato exacto" se ponía en rojo (valor recibido 999
 * frente al 480 esperado), se restauró el valor original y se confirmó que
 * la suite completa de este fichero volvía a verde. Ver el informe de la
 * tarea para la salida literal de las dos ejecuciones.
 */
describe("vocabulary", () => {
  it("REVEAL expone su contrato exacto", () => {
    const expectedReveal = {
      durationMs: 480,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      shift: "16px",
      stepMs: 60,
    };
    expect(REVEAL).toEqual(expectedReveal);
  });

  it("DECK expone su contrato exacto", () => {
    const expectedDeck = {
      slideDurationMs: 320,
      slideShift: "40px",
      railDurationMs: 200,
      scrubMs: 320,
      sceneDepthShift: "6dvh",
      exitDurationMs: 200,
    };
    expect(DECK).toEqual(expectedDeck);
  });

  it("PRESS expone su contrato exacto", () => {
    const expectedPress = {
      durationMs: 100,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      hoverLift: "-2px",
      activeScale: 0.98,
      hoverGuard: "(hover: hover) and (pointer: fine)",
    };
    expect(PRESS).toEqual(expectedPress);
  });

  it("AMBIENT expone su contrato exacto", () => {
    const expectedAmbient = {
      breathMs: 5400,
      pulseMs: 6500,
      floatMs: 9000,
      orbitMs: 20000,
      orbitSlowMs: 40000,
    };
    expect(AMBIENT).toEqual(expectedAmbient);
  });

  it("REVEAL y PRESS comparten la misma curva de easing (D del docblock final de vocabulary.ts)", () => {
    // Documenta la coincidencia deliberada, no accidental: si algun dia deja
    // de ser cierta, esta asercion obliga a decidirlo a proposito en vez de
    // que el drift pase desapercibido.
    expect(REVEAL.easing).toBe(PRESS.easing);
  });
});
