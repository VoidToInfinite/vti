import { describe, it, expect } from "vitest";
import { REVEAL, DECK, OVERLAY, PRESS, AMBIENT } from "./vocabulary";

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
 *
 * Fix wave B (2026-08-12): `REVEAL` pierde `stepMs`, `DECK` pierde
 * `slideDurationMs`/`slideShift`/`scrubMs`/`sceneDepthShift` y `PRESS` pierde
 * `hoverLift` -- los seis campos sin consumidor real de producción que
 * `vocabulary-consumers.test.ts` (medición corregida a nivel de CAMPO en
 * esta misma revisión) atrapó (los cinco primeros ya los traía la review de
 * rama; `hoverLift` lo encontró el propio candado nuevo). Ver el docblock de
 * cabecera de `vocabulary.ts` para el porqué completo, y los docblocks de
 * `DECK`/`PRESS` en ese mismo fichero para la deuda de migración/duplicación
 * que queda abierta en `src/components/**`.
 */
describe("vocabulary", () => {
  it("REVEAL expone su contrato exacto", () => {
    const expectedReveal = {
      durationMs: 480,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      shift: "16px",
    };
    expect(REVEAL).toEqual(expectedReveal);
  });

  it("DECK expone su contrato exacto", () => {
    const expectedDeck = {
      railDurationMs: 200,
      exitDurationMs: 200,
    };
    expect(DECK).toEqual(expectedDeck);
  });

  it("OVERLAY expone su contrato exacto (Task 17, plan premium F1-F5)", () => {
    const expectedOverlay = {
      openMs: 180,
      closeMs: 120,
      closedScale: 0.97,
    };
    expect(OVERLAY).toEqual(expectedOverlay);
  });

  it("PRESS expone su contrato exacto", () => {
    const expectedPress = {
      durationMs: 100,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      activeScale: 0.98,
      hoverGuard: "(hover: hover) and (pointer: fine)",
    };
    expect(PRESS).toEqual(expectedPress);
  });

  /*
   * Task 20 (motion resto) colapsa AMBIENT de cinco campos a tres: `pulseMs`
   * se fusiona en `breathMs` (storyCosmicBeing.parts.tsx pasa a consumirlo) y
   * `orbitSlowMs` se retira porque Sol.tsx lo deriva de `AMBIENT.orbitMs * 2`
   * (mismo valor exacto, 40000, sin necesitar un cuarto campo). Ver el
   * docblock de AMBIENT en vocabulary.ts para el criterio completo.
   */
  it("AMBIENT expone su contrato exacto (Task 20: colapsado de 5 a 3 campos)", () => {
    const expectedAmbient = {
      breathMs: 5400,
      floatMs: 9000,
      orbitMs: 20000,
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
