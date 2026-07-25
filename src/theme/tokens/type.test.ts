import { describe, it, expect } from "vitest";
import { type as typo } from "./type";

describe("type tokens", () => {
  it("familias apuntan a variables CSS self-hosted", () => {
    expect(typo.fontBody).toBe("var(--font-body)");
    expect(typo.fontMono).toBe("var(--font-mono)");
  });

  it("escala tipográfica completa tiene los valores canónicos correctos", () => {
    const expectedScale = {
      display: {
        size: "clamp(2.5rem, 4.4vw, 3.5rem)",
        weight: 800,
        lineHeight: 1.03,
        tracking: "-0.02em",
      },
      h1: {
        size: "2.5rem",
        weight: 700,
        lineHeight: 1.1,
        tracking: "-0.018em",
      },
      h2: {
        size: "2rem",
        weight: 700,
        lineHeight: 1.15,
        tracking: "-0.014em",
      },
      h3: {
        size: "1.5rem",
        weight: 600,
        lineHeight: 1.2,
        tracking: "-0.012em",
      },
      h4: {
        size: "1.25rem",
        weight: 600,
        lineHeight: 1.3,
        tracking: "-0.008em",
      },
      h5: {
        size: "1.125rem",
        weight: 600,
        lineHeight: 1.35,
        tracking: "0",
      },
      bodyLg: {
        size: "1.125rem",
        weight: 400,
        lineHeight: 1.55,
        tracking: "0",
      },
      body: {
        size: "1rem",
        weight: 400,
        lineHeight: 1.6,
        tracking: "0",
      },
      bodySm: {
        size: "0.875rem",
        weight: 400,
        lineHeight: 1.55,
        tracking: "0",
      },
      caption: {
        size: "0.75rem",
        weight: 500,
        lineHeight: 1.4,
        tracking: "0.01em",
      },
      overline: {
        size: "0.6875rem",
        weight: 600,
        lineHeight: 1.2,
        tracking: "0.18em",
      },
      code: {
        size: "0.875rem",
        weight: 400,
        lineHeight: 1.5,
        tracking: "0",
      },
    };

    expect(typo.scale).toEqual(expectedScale);
  });
});
