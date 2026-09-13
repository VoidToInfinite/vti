# Sistema de interfaz de lujo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** materializar el sistema de interfaz de lujo de VTI como token layer vivo (styled-components, 3 capas) + componentes de referencia (Button, Card, Input, Nav con glass) que prueban que tokens + motion resuelven.

**Architecture:** migración **aditiva**. Fase 1 añade los grupos de token nuevos (`palette`, `semantic`, `type`, `space`, `radius`, `elevation`, `glass`, `motion`, `zIndex`, `grid`) al theme **junto a** los antiguos (`color`, `background`, `typography`) → cero rotura. Fase 2 construye hooks y componentes de referencia sobre los nuevos. Fase 3 re-mapea los componentes existentes a los tokens nuevos y **elimina** los antiguos. La app compila y despliega al final de cada fase.

**Tech Stack:** Next.js 16 (export estático), React 19, styled-components 6, TypeScript strict, Vitest + Testing Library, `next/font/google` (self-host en build).

## Global Constraints

- **Package manager:** pnpm (`pnpm@11.10.0`, Corepack). Gate: `pnpm check` (typecheck + lint + check-format) y `pnpm test`. Nunca `pnpm ci`.
- **Node:** ≥ 22.4.
- **TypeScript strict**, sin `any`. Tipos de retorno explícitos en funciones exportadas. `import type` para tipos.
- **React 19:** componentes funcionales, `ref` como prop (sin `forwardRef`).
- **Estilos:** styled-components; **tokens de tema, cero colores/spacing/radii hardcodeados**. Un componente **nunca** lee un primitivo (`palette.*`) — solo `semantic.*` y escalas (`space`, `radius`, `type`, `motion`…).
    - **Única excepción sancionada (no es violación):** componentes puramente decorativos y `aria-hidden` —los orbes de fondo del hero— pueden leer `palette.*` cuando el color es espectáculo de marca y no un rol de UI. Debe llevar comentario en el código que lo justifique. Autorizada explícitamente aquí para que no se reporte como defecto.
- **Animación:** solo `transform`/`opacity`. Todo colapsa bajo `prefers-reduced-motion: reduce`. El foco nunca se anima.
- **Glass:** solo en nav-scrolled / modal / sheet / toast. Nunca en estático.
- **A11y:** AA en ambos temas; `:focus-visible` ring 2px en todo interactivo; targets ≥44px; una `<h1>`/página.
- **i18n:** cero strings de UI hardcodeados; todo por i18next (es/en a la par).
- **Theme shape:** el provider entrega `theme={{ data: ThemeDefinition }}` (acceso `theme.data.*`). No cambiar ese contrato.
- **Tests:** Vitest + Testing Library, `renderWithProviders` de `@/test/test-utils`, descripciones en español, **sin snapshots**, co-localizados `*.test.tsx`.
- **Spec de referencia:** `docs/superpowers/specs/2026-07-24-luxury-interface-system-design.md` (§ citadas en cada task).

---

## Mapa de archivos

```
src/theme/tokens/            (NUEVO)
├─ color.ts        primitivos OKLCH + generador de rampa        [Task 2]
├─ semantic.ts     roles light + dark                           [Task 5]
├─ type.ts         familias + escala tipográfica                [Task 3]
├─ space.ts        base-8                                       [Task 1]
├─ radius.ts       squircle                                     [Task 1]
├─ elevation.ts    sombras                                      [Task 1]
├─ zIndex.ts       escala z                                     [Task 1]
├─ motion.ts       duraciones, easings                          [Task 4]
├─ glass.ts        blur/bg/border (por tema)                    [Task 4]
└─ grid.ts         container/prose/columns                      [Task 4]
src/theme/theme.types.ts     extender ThemeDefinition           [Task 6]
src/theme/themes.ts          ensamblar light+dark               [Task 6]
src/theme/GlobalStyles.tsx   recablear a semantic/type          [Task 7]
app/layout.tsx               fuentes next/font/google           [Task 3]
src/hooks/useReveal.ts       IntersectionObserver               [Task 8]
src/hooks/useScrolled.ts     estado scrolled para nav-glass     [Task 9]
src/components/ui/Typography  reconstruir a la escala           [Task 10]
src/components/ui/Button/     NUEVO                              [Task 11]
src/components/ui/Card/       NUEVO                              [Task 12]
src/components/ui/Input/      NUEVO                              [Task 13]
src/components/layout/Navbar  upgrade glass-on-scroll           [Task 14]
(remap) Hero, About, Footer, ThemeToggle, LanguageSelector,
        Socials, BrandName, BackOrbs                            [Task 15]
src/theme/{theme.types,themes}.ts  eliminar grupos legacy       [Task 16]
```

---

# FASE 1 — Token layer (aditiva, cero rotura)

### Task 1: Primitivos escalares (space · radius · elevation · zIndex)

**Files:**

- Create: `src/theme/tokens/space.ts`, `src/theme/tokens/radius.ts`, `src/theme/tokens/elevation.ts`, `src/theme/tokens/zIndex.ts`
- Test: `src/theme/tokens/scalars.test.ts`

**Interfaces:**

- Produces: `space` (`Record<SpaceKey,string>`), `radius` (`Record<RadiusKey,string>`), `elevation` (`Record<ElevationKey,string>`), `zIndex` (`Record<ZKey,number>`). Spec §5/§6/§7/§10.

- [ ] **Step 1 — Test (falla):** `src/theme/tokens/scalars.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { space } from "./space";
import { radius } from "./radius";
import { elevation } from "./elevation";
import { zIndex } from "./zIndex";

describe("scalar tokens", () => {
    it("space sigue la escala base-8", () => {
        expect(space[1]).toBe("0.25rem"); // 4px
        expect(space[5]).toBe("1.5rem"); // 24px
        expect(space[9]).toBe("6rem"); // 96px
    });
    it("radius asigna la excepción del radio a círculo", () => {
        expect(radius.full).toBe("9999px");
        expect(radius.lg).toBe("0.75rem"); // 12px botón
    });
    it("elevation-0 es plano (sin sombra)", () => {
        expect(elevation[0]).toBe("none");
    });
    it("zIndex escala en orden", () => {
        expect(zIndex.stickyNav).toBeLessThan(zIndex.modal);
    });
});
```

- [ ] **Step 2 — Run (FAIL, módulos no existen):** `pnpm test src/theme/tokens/scalars.test.ts`
- [ ] **Step 3 — Implementar:**

```ts
// src/theme/tokens/space.ts   (spec §5)
export const space = {
    0: "0",
    px: "1px",
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
} as const;
export type SpaceKey = keyof typeof space;
```

```ts
// src/theme/tokens/radius.ts   (spec §6)
export const radius = {
    "xs": "2px",
    "sm": "4px",
    "md": "8px",
    "lg": "0.75rem",
    "xl": "1rem",
    "2xl": "1.5rem",
    "full": "9999px",
} as const;
export type RadiusKey = keyof typeof radius;
```

```ts
// src/theme/tokens/elevation.ts   (spec §7)
export const elevation = {
    0: "none",
    1: "0 1px 2px oklch(0 0 0 / 0.06)",
    2: "0 4px 12px oklch(0 0 0 / 0.10)",
    3: "0 12px 32px oklch(0 0 0 / 0.16)",
    4: "0 20px 48px oklch(0 0 0 / 0.20)",
} as const;
export type ElevationKey = keyof typeof elevation;
```

```ts
// src/theme/tokens/zIndex.ts   (spec §10)
export const zIndex = {
    base: 0,
    raised: 10,
    stickyNav: 100,
    dropdown: 200,
    overlay: 900,
    modal: 1000,
    toast: 1100,
    max: 9999,
} as const;
export type ZKey = keyof typeof zIndex;
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/theme/tokens/scalars.test.ts`
- [ ] **Step 5 — Commit:** `git add src/theme/tokens && git commit -m "feat(tokens): scalar primitives (space, radius, elevation, zIndex)"`

---

### Task 2: Primitivos de color (OKLCH + generador de rampa)

**Files:**

- Create: `src/theme/tokens/color.ts`
- Test: `src/theme/tokens/color.test.ts`

**Interfaces:**

- Produces: `STEPS` (tupla de 12), `type Step`, `type Ramp = Record<Step,string>`, `color` (`{ primary, secondary, success, warning, error, neutral }: Record<hue, Ramp>`), `type ColorPrimitives`. Spec §3.1.

- [ ] **Step 1 — Test (falla):** `src/theme/tokens/color.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { color, STEPS } from "./color";

describe("color primitives", () => {
    it("cada hue tiene los 12 pasos como oklch()", () => {
        for (const ramp of Object.values(color)) {
            expect(Object.keys(ramp).map(Number)).toEqual([...STEPS]);
            for (const v of Object.values(ramp)) expect(v).toMatch(/^oklch\(/);
        }
    });
    it("la luminosidad decrece de 50 a 1100", () => {
        const l = (s: string) => Number(s.slice(6).split(" ")[0]);
        expect(l(color.primary[50])).toBeGreaterThan(l(color.primary[1100]));
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/theme/tokens/color.test.ts`
- [ ] **Step 3 — Implementar** (generador DRY; escala de L y taper de croma de spec §3.1):

```ts
// src/theme/tokens/color.ts
export const STEPS = [
    50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100,
] as const;
export type Step = (typeof STEPS)[number];
export type Ramp = Record<Step, string>;

// Escalera de luminosidad compartida por todos los hues (spec §3.1)
const L = [
    0.985, 0.96, 0.92, 0.86, 0.78, 0.737, 0.66, 0.58, 0.5, 0.42, 0.32, 0.22,
];
// Multiplicador de croma: pico en 500, decae hacia los extremos claro/oscuro
const CMUL = [0.1, 0.2, 0.42, 0.66, 0.9, 1, 0.94, 0.82, 0.72, 0.62, 0.5, 0.36];

function ramp(hue: number, peakChroma: number): Ramp {
    const out = {} as Ramp;
    STEPS.forEach((step, i) => {
        out[step] =
            `oklch(${L[i]} ${+(peakChroma * CMUL[i]).toFixed(3)} ${hue})`;
    });
    return out;
}

// Neutral: croma casi nulo, hue frío 286
function neutral(): Ramp {
    const nc = [0, 0.002, 0.004, 0.004, 0.006, 0.006, 0, 0, 0, 0.004, 0, 0.004];
    const out = {} as Ramp;
    STEPS.forEach((step, i) => {
        out[step] = `oklch(${L[i]} ${nc[i]} 286)`;
    });
    return out;
}

export const color = {
    primary: ramp(235.851, 0.158),
    secondary: ramp(311.928, 0.259),
    success: ramp(140, 0.17),
    warning: ramp(70, 0.16),
    error: ramp(12, 0.24),
    neutral: neutral(),
} as const;

export type ColorPrimitives = typeof color;
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/theme/tokens/color.test.ts`
- [ ] **Step 5 — Commit:** `git add src/theme/tokens/color.* && git commit -m "feat(tokens): OKLCH color primitives with ramp generator"`

> **Nota AA (spec §18):** los valores son la escala de trabajo derivada de las anclas. Antes de cerrar Fase 3, validar contraste AA de los pares semánticos (Task 5) con una herramienta OKLCH→sRGB y ajustar `L`/`CMUL` por celda si algún par no libra AA.

---

### Task 3: Tipografía (tokens + fuentes)

**Files:**

- Create: `src/theme/tokens/type.ts`
- Modify: `app/layout.tsx` (fuentes `next/font/google` → variables CSS)
- Test: `src/theme/tokens/type.test.ts`

**Interfaces:**

- Produces: `type` (`{ fontBody, fontMono, scale: Record<TypeVariant, TypeStyle> }`), `type TypeVariant`, `type TypeStyle = { size:string; weight:number; lineHeight:number; tracking:string }`. Spec §4.
- Consumes (layout): variables CSS `--font-body`, `--font-mono`.

- [ ] **Step 1 — Test (falla):** `src/theme/tokens/type.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { type as typo } from "./type";

describe("type tokens", () => {
    it("familias apuntan a variables CSS self-hosted", () => {
        expect(typo.fontBody).toBe("var(--font-body)");
        expect(typo.fontMono).toBe("var(--font-mono)");
    });
    it("expone la escala con tracking negativo en display", () => {
        expect(typo.scale.display.tracking).toBe("-0.02em");
        expect(typo.scale.body.weight).toBe(400);
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/theme/tokens/type.test.ts`
- [ ] **Step 3 — Implementar tokens:**

```ts
// src/theme/tokens/type.ts   (spec §4)
export type TypeVariant =
    | "display"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "bodyLg"
    | "body"
    | "bodySm"
    | "caption"
    | "overline"
    | "code";

export interface TypeStyle {
    size: string;
    weight: number;
    lineHeight: number;
    tracking: string;
}

export const type = {
    fontBody: "var(--font-body)",
    fontMono: "var(--font-mono)",
    scale: {
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
        h5: { size: "1.125rem", weight: 600, lineHeight: 1.35, tracking: "0" },
        bodyLg: {
            size: "1.125rem",
            weight: 400,
            lineHeight: 1.55,
            tracking: "0",
        },
        body: { size: "1rem", weight: 400, lineHeight: 1.6, tracking: "0" },
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
        code: { size: "0.875rem", weight: 400, lineHeight: 1.5, tracking: "0" },
    } satisfies Record<TypeVariant, TypeStyle>,
} as const;
```

- [ ] **Step 4 — Fuentes en `app/layout.tsx`** (self-host en build; sin peticiones externas en runtime; compatible con export estático):

```tsx
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

const fontBody = Hanken_Grotesk({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-body",
});
const fontMono = JetBrains_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-mono",
});

// en RootLayout:
// <html lang="es" className={`${fontBody.variable} ${fontMono.variable}`}>
```

- [ ] **Step 5 — Run (PASS) + build sanity:** `pnpm test src/theme/tokens/type.test.ts && pnpm build` Expected: test PASS; build OK (fuentes descargadas y self-hosted).
- [ ] **Step 6 — Commit:** `git add src/theme/tokens/type.* app/layout.tsx && git commit -m "feat(tokens): typography scale + self-hosted fonts"`

---

### Task 4: Motion · Glass · Grid

**Files:**

- Create: `src/theme/tokens/motion.ts`, `src/theme/tokens/glass.ts`, `src/theme/tokens/grid.ts`
- Test: `src/theme/tokens/system.test.ts`

**Interfaces:**

- Produces: `motion` (`{ duration:Record<...,string>, easing:Record<...,string> }`), `glassLight`/`glassDark` (`{ blur:string; bg:string; border:string }`), `grid` (`{ containerMax:string; prose:string; columns:number; gutter:string }`). Spec §8/§9/§11.

- [ ] **Step 1 — Test (falla):** `src/theme/tokens/system.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { motion } from "./motion";
import { glassLight, glassDark } from "./glass";
import { grid } from "./grid";

describe("system tokens", () => {
    it("motion expone la curva estándar y la duración base", () => {
        expect(motion.easing.standard).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
        expect(motion.duration.base).toBe("200ms");
    });
    it("glass define blur y tinte translúcido por tema", () => {
        expect(glassLight.blur).toContain("blur(");
        expect(glassDark.bg).toMatch(/oklch\(/);
    });
    it("grid limita el container a 1200px y la prosa a 65ch", () => {
        expect(grid.containerMax).toBe("1200px");
        expect(grid.prose).toBe("65ch");
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/theme/tokens/system.test.ts`
- [ ] **Step 3 — Implementar:**

```ts
// src/theme/tokens/motion.ts   (spec §9)
export const motion = {
    duration: {
        instant: "0ms",
        fast: "100ms",
        base: "200ms",
        slow: "320ms",
        slower: "480ms",
        ambient: "1500ms",
    },
    easing: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
    },
} as const;
```

```ts
// src/theme/tokens/glass.ts   (spec §8) — solo capas flotantes
export interface Glass {
    blur: string;
    bg: string;
    border: string;
}
export const glassLight: Glass = {
    blur: "blur(14px)",
    bg: "oklch(1 0 0 / 0.68)",
    border: "1px solid oklch(1 0 0 / 0.12)",
};
export const glassDark: Glass = {
    blur: "blur(14px)",
    bg: "oklch(0.178 0 0 / 0.68)",
    border: "1px solid oklch(1 0 0 / 0.08)",
};
```

```ts
// src/theme/tokens/grid.ts   (spec §11)
export const grid = {
    containerMax: "1200px",
    prose: "65ch",
    columns: 12,
    gutter: "1.5rem",
} as const;
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/theme/tokens/system.test.ts`
- [ ] **Step 5 — Commit:** `git add src/theme/tokens/{motion,glass,grid}.* && git commit -m "feat(tokens): motion, glass, grid"`

---

### Task 5: Capa semántica (roles light + dark)

**Files:**

- Create: `src/theme/tokens/semantic.ts`
- Test: `src/theme/tokens/semantic.test.ts`

**Interfaces:**

- Produces: `interface SemanticColors`, `semanticLight`, `semanticDark`. Spec §3.2/§3.3.
- Consumes: `color` (Task 2).

- [ ] **Step 1 — Test (falla):** `src/theme/tokens/semantic.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { semanticLight, semanticDark } from "./semantic";
import { color } from "./color";

describe("semantic colors", () => {
    it("ambos temas exponen el mismo set de roles", () => {
        expect(Object.keys(semanticLight).sort()).toEqual(
            Object.keys(semanticDark).sort(),
        );
    });
    it("dark usa step-500 para el sólido de marca (libra AA en oscuro)", () => {
        expect(semanticDark.brandSolid).toBe(color.primary[500]);
        expect(semanticLight.brandSolid).toBe(color.primary[700]);
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/theme/tokens/semantic.test.ts`
- [ ] **Step 3 — Implementar:**

```ts
// src/theme/tokens/semantic.ts   (spec §3.2 / §3.3)
import { color } from "./color";

export interface SemanticColors {
    bg: string;
    surface: string;
    surfaceSunken: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    brand: string;
    brandSolid: string;
    brandText: string;
    focus: string;
    onBrand: string;
    success: string;
    warning: string;
    error: string;
}

const white = "oklch(1 0 0)";

export const semanticLight: SemanticColors = {
    bg: color.neutral[50],
    surface: white,
    surfaceSunken: color.neutral[100],
    border: color.neutral[300],
    borderStrong: color.neutral[400],
    text: color.neutral[1000],
    textMuted: color.neutral[800],
    textSubtle: color.neutral[600],
    brand: color.primary[500],
    brandSolid: color.primary[700],
    brandText: color.primary[800],
    focus: color.primary[500],
    onBrand: white,
    success: color.success[700],
    warning: color.warning[700],
    error: color.error[700],
};

export const semanticDark: SemanticColors = {
    bg: color.neutral[1100],
    surface: color.neutral[1000],
    surfaceSunken: color.neutral[1100],
    border: color.neutral[800],
    borderStrong: color.neutral[700],
    text: color.neutral[50],
    textMuted: color.neutral[300],
    textSubtle: color.neutral[400],
    brand: color.primary[400],
    brandSolid: color.primary[500],
    brandText: color.primary[300],
    focus: color.primary[400],
    onBrand: color.neutral[1100],
    success: color.success[500],
    warning: color.warning[500],
    error: color.error[500],
};
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/theme/tokens/semantic.test.ts`
- [ ] **Step 5 — Commit:** `git add src/theme/tokens/semantic.* && git commit -m "feat(tokens): semantic color roles (light + dark)"`

---

### Task 6: Extender ThemeDefinition + ensamblar themes

**Files:**

- Modify: `src/theme/theme.types.ts` (añadir grupos nuevos, mantener legacy)
- Modify: `src/theme/themes.ts` (poblar grupos nuevos en light y dark)
- Test: `src/theme/themes.test.ts`

**Interfaces:**

- Produces: `ThemeDefinition` extendido con `palette, semantic, type, space, radius, elevation, glass, motion, zIndex, grid, name, isLight` **junto a** los legacy `color, background, typography, breakPoint`.
- Consumes: todos los token modules (Tasks 1–5).

- [ ] **Step 1 — Test (falla):** `src/theme/themes.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { themes } from "./themes";

describe("themes", () => {
    it("light y dark exponen los grupos de token nuevos", () => {
        for (const t of [themes.light, themes.dark]) {
            expect(t.semantic.brand).toMatch(/^oklch\(/);
            expect(t.space[5]).toBe("1.5rem");
            expect(t.motion.easing.standard).toContain("cubic-bezier");
            expect(t.type.scale.h1.size).toBe("2.5rem");
        }
    });
    it("mantiene el flag isLight correcto", () => {
        expect(themes.light.isLight).toBe(true);
        expect(themes.dark.isLight).toBe(false);
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/theme/themes.test.ts`
- [ ] **Step 3 — Extender `theme.types.ts`** (añadir; NO borrar legacy todavía; corregir el typo `weigth`→`weight` en la interfaz `Typography` legacy):

```ts
import type { ColorPrimitives } from "./tokens/color";
import type { SemanticColors } from "./tokens/semantic";
import type { type as TypeTokens } from "./tokens/type"; // valor; ver nota
// (para el tipo: usar `typeof import`) — en la práctica:
import type { space } from "./tokens/space";
import type { radius } from "./tokens/radius";
import type { elevation } from "./tokens/elevation";
import type { zIndex } from "./tokens/zIndex";
import type { motion } from "./tokens/motion";
import type { Glass } from "./tokens/glass";
import type { grid } from "./tokens/grid";

// ...interfaces legacy existentes se mantienen (Color, ThemeColor, etc.),
// corrigiendo `weigth` -> `weight` en `interface Typography`.

export interface ThemeDefinition {
    // --- nuevo ---
    name: "light" | "dark";
    isLight: boolean;
    palette: ColorPrimitives;
    semantic: SemanticColors;
    type: typeof import("./tokens/type").type;
    space: typeof space;
    radius: typeof radius;
    elevation: typeof elevation;
    glass: Glass;
    motion: typeof motion;
    zIndex: typeof zIndex;
    grid: typeof grid;
    // --- legacy (se elimina en Task 16) ---
    background: ThemeBackgroundColor;
    color: ThemeColor;
    typography: ThemeTypography;
    breakPoint: BreakPoints;
    themeName: string;
    themeTitle: string;
}
```

> Nota TS: para tipar `type`/`space`/… desde su valor, usar `typeof import("./tokens/x").x`. Mantener `styled.d.ts` sin cambios (sigue `{ data: ThemeDefinition }`).

- [ ] **Step 4 — Poblar `themes.ts`** — a cada theme (light/dark) añadir los grupos nuevos, sin tocar los objetos legacy existentes:

```ts
import { color } from "./tokens/color";
import { semanticLight, semanticDark } from "./tokens/semantic";
import { type } from "./tokens/type";
import { space } from "./tokens/space";
import { radius } from "./tokens/radius";
import { elevation } from "./tokens/elevation";
import { zIndex } from "./tokens/zIndex";
import { motion } from "./tokens/motion";
import { glassLight, glassDark } from "./tokens/glass";
import { grid } from "./tokens/grid";

const shared = {
    palette: color,
    type,
    space,
    radius,
    elevation,
    zIndex,
    motion,
    grid,
} as const;

// en basicLightTheme: { ...campos legacy..., name:"light", isLight:true,
//   semantic: semanticLight, glass: glassLight, ...shared }
// en basicDarkTheme:  { ...campos legacy..., name:"dark", isLight:false,
//   semantic: semanticDark, glass: glassDark, ...shared }
```

- [ ] **Step 5 — Run (PASS) + gate:** `pnpm test src/theme/themes.test.ts && pnpm typecheck`
- [ ] **Step 6 — Commit:** `git add src/theme && git commit -m "feat(theme): extend ThemeDefinition with luxury token groups (additive)"`

---

### Task 7: Recablear GlobalStyles a los tokens nuevos

**Files:**

- Modify: `src/theme/GlobalStyles.tsx`
- Test: manual + `pnpm build` (GlobalStyles no se testea unitariamente; verificación por render).

- [ ] **Step 1 — Recablear** bg/text/font/selection a `semantic`/`type`; añadir `:focus-visible` global y base reduced-motion:

```tsx
body {
  background-color: ${({ theme }) => theme.data.semantic.bg};
  color: ${({ theme }) => theme.data.semantic.text};
  font-family: ${({ theme }) => theme.data.type.fontBody};
}
::selection {
  background-color: ${({ theme }) => theme.data.semantic.brand};
  color: ${({ theme }) => theme.data.semantic.onBrand};
}
:where(a, button, input, textarea, select, [tabindex]):focus-visible {
  outline: 2px solid ${({ theme }) => theme.data.semantic.focus};
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 2 — Run:** `pnpm dev` → verificar en navegador que fondo/tipo/selección/foco usan los nuevos tokens en light y dark. `pnpm build` OK.
- [ ] **Step 3 — Commit:** `git add src/theme/GlobalStyles.tsx && git commit -m "feat(theme): wire GlobalStyles to semantic/type tokens + global focus ring"`

**Gate de fase 1:** `pnpm check && pnpm test` en verde. App desplegable.

---

# FASE 2 — Hooks de motion + componentes de referencia

### Task 8: Hook `useReveal` (IntersectionObserver)

**Files:**

- Create: `src/hooks/useReveal.ts`
- Test: `src/hooks/useReveal.test.tsx`

**Interfaces:**

- Produces: `function useReveal<T extends Element>(opts?: { threshold?: number; once?: boolean }): { ref: RefCallback<T>; revealed: boolean }`.

- [ ] **Step 1 — Test (falla):** mock de `IntersectionObserver`, assert `revealed` arranca `false` y pasa a `true` al intersecar.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReveal } from "./useReveal";

let trigger: (isIntersecting: boolean) => void;
beforeEach(() => {
    vi.stubGlobal(
        "IntersectionObserver",
        class {
            constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
                trigger = (v) => cb([{ isIntersecting: v }]);
            }
            observe() {}
            disconnect() {}
        },
    );
});

describe("useReveal", () => {
    it("empieza oculto y revela al intersecar", () => {
        const { result } = renderHook(() => useReveal());
        act(() => {
            (result.current.ref as (n: Element | null) => void)(
                document.createElement("div"),
            );
        });
        expect(result.current.revealed).toBe(false);
        act(() => trigger(true));
        expect(result.current.revealed).toBe(true);
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/hooks/useReveal.test.tsx`
- [ ] **Step 3 — Implementar:**

```ts
// src/hooks/useReveal.ts
import { useCallback, useRef, useState } from "react";

export function useReveal<T extends Element>(
    opts: { threshold?: number; once?: boolean } = {},
): { ref: (node: T | null) => void; revealed: boolean } {
    const { threshold = 0.2, once = true } = opts;
    const [revealed, setRevealed] = useState(false);
    const obs = useRef<IntersectionObserver | null>(null);

    const ref = useCallback(
        (node: T | null) => {
            obs.current?.disconnect();
            if (!node) return;
            obs.current = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setRevealed(true);
                        if (once) obs.current?.disconnect();
                    } else if (!once) setRevealed(false);
                },
                { threshold },
            );
            obs.current.observe(node);
        },
        [threshold, once],
    );

    return { ref, revealed };
}
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/hooks/useReveal.test.tsx`
- [ ] **Step 5 — Commit:** `git add src/hooks/useReveal.* && git commit -m "feat(hooks): useReveal (IntersectionObserver)"`

---

### Task 9: Hook `useScrolled` (estado para nav-glass)

**Files:**

- Create: `src/hooks/useScrolled.ts`
- Test: `src/hooks/useScrolled.test.tsx`

**Interfaces:**

- Produces: `function useScrolled(offset?: number): boolean` — `true` cuando `window.scrollY > offset`.

- [ ] **Step 1 — Test (falla):**

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrolled } from "./useScrolled";

describe("useScrolled", () => {
    it("es true al pasar el offset", () => {
        const { result } = renderHook(() => useScrolled(10));
        expect(result.current).toBe(false);
        act(() => {
            Object.defineProperty(window, "scrollY", {
                value: 50,
                writable: true,
            });
            window.dispatchEvent(new Event("scroll"));
        });
        expect(result.current).toBe(true);
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/hooks/useScrolled.test.tsx`
- [ ] **Step 3 — Implementar:**

```ts
// src/hooks/useScrolled.ts
import { useEffect, useState } from "react";

export function useScrolled(offset = 8): boolean {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = (): void => setScrolled(window.scrollY > offset);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [offset]);
    return scrolled;
}
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/hooks/useScrolled.test.tsx`
- [ ] **Step 5 — Commit:** `git add src/hooks/useScrolled.* && git commit -m "feat(hooks): useScrolled"`

---

### Task 10: Reconstruir `Typography` a la escala nueva

**Files:**

- Modify: `src/components/ui/Typography/Typography.tsx`
- Test: `src/components/ui/Typography/Typography.test.tsx` (nuevo)

**Interfaces:**

- Produces: `Typography` con `variant: TypeVariant` (mapea a `theme.data.type.scale`), `as?` para override de elemento. Mantiene compat: `lead` → alias de `bodyLg`.

- [ ] **Step 1 — Test (falla):**

```tsx
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
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/components/ui/Typography`
- [ ] **Step 3 — Implementar** (lee `theme.data.type.scale[variant]`; elemento por defecto según variant; color `semantic.text`):

```tsx
"use client";
import type { ElementType, ReactNode } from "react";
import styled from "styled-components";
import type { TypeVariant } from "@/theme/tokens/type";

const defaultEl: Partial<Record<TypeVariant, ElementType>> = {
    display: "h1",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    overline: "span",
    caption: "span",
    code: "code",
};

interface Props {
    variant: TypeVariant | "lead";
    as?: ElementType;
    children: ReactNode;
    className?: string;
}

const ScText = styled.p<{ $v: TypeVariant }>`
    margin: 0;
    font-family: ${({ theme }) => theme.data.type.fontBody};
    color: ${({ theme }) => theme.data.semantic.text};
    font-size: ${({ theme, $v }) => theme.data.type.scale[$v].size};
    font-weight: ${({ theme, $v }) => theme.data.type.scale[$v].weight};
    line-height: ${({ theme, $v }) => theme.data.type.scale[$v].lineHeight};
    letter-spacing: ${({ theme, $v }) => theme.data.type.scale[$v].tracking};
    ${({ $v }) => ($v.startsWith("h") || $v === "display") && "text-wrap: balance;"}
`;

export function Typography({
    variant,
    as,
    children,
    className,
}: Props): React.JSX.Element {
    const v: TypeVariant = variant === "lead" ? "bodyLg" : variant;
    const el: ElementType = as ?? defaultEl[v] ?? "p";
    return (
        <ScText
            as={el}
            $v={v}
            className={className}
        >
            {children}
        </ScText>
    );
}
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/components/ui/Typography`
- [ ] **Step 5 — Commit:** `git add src/components/ui/Typography && git commit -m "feat(ui): rebuild Typography on the new type scale"`

---

### Task 11: `Button`

**Files:**

- Create: `src/components/ui/Button/Button.tsx`, `src/components/ui/Button/Button.test.tsx`

**Interfaces:**

- Produces: `Button` — props `variant?: "solid"|"soft"|"outline"|"ghost"` (def `solid`), `intent?: "primary"|"neutral"|"success"|"danger"` (def `primary`), `size?: "sm"|"md"|"lg"` (def `md`), `loading?: boolean`, más props nativas de `<button>` incluida `ref`. Spec §13.1.

- [ ] **Step 1 — Test (falla):**

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Button } from "./Button";

describe("Button", () => {
    it("renderiza como button con su label", () => {
        renderWithProviders(<Button>Explorar</Button>);
        expect(
            screen.getByRole("button", { name: "Explorar" }),
        ).toBeInTheDocument();
    });
    it("en loading marca aria-busy y deshabilita", () => {
        renderWithProviders(<Button loading>Enviar</Button>);
        const b = screen.getByRole("button");
        expect(b).toHaveAttribute("aria-busy", "true");
        expect(b).toBeDisabled();
    });
    it("en loading conserva el label en el DOM (el ancho no salta)", () => {
        renderWithProviders(<Button loading>Enviar</Button>);
        expect(screen.getByText("Enviar")).toBeInTheDocument();
    });
    it("no dispara onClick si está disabled", () => {
        const onClick = vi.fn();
        renderWithProviders(
            <Button
                disabled
                onClick={onClick}
            >
                X
            </Button>,
        );
        screen.getByRole("button").click();
        expect(onClick).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/components/ui/Button`
- [ ] **Step 3 — Implementar** (tokens `semantic`/`radius`/`space`/`motion`; `press` + `hover-lift`; ancho preservado en loading):

```tsx
"use client";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import styled, { css } from "styled-components";

type Variant = "solid" | "soft" | "outline" | "ghost";
type Intent = "primary" | "neutral" | "success" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    intent?: Intent;
    size?: Size;
    loading?: boolean;
    children: ReactNode;
    ref?: Ref<HTMLButtonElement>;
}

// Color de acento por intent — SIEMPRE rol semántico, nunca primitivo
function accent(theme: DefaultTheme, intent: Intent): string {
    const s = theme.data.semantic;
    if (intent === "neutral") return s.text;
    if (intent === "success") return s.success;
    if (intent === "danger") return s.error;
    return s.brandSolid;
}

const sizes: Record<Size, ReturnType<typeof css>> = {
    sm: css`
        height: 36px;
        padding: 0 ${({ theme }) => theme.data.space[4]};
    `,
    md: css`
        height: 44px;
        padding: 0 ${({ theme }) => theme.data.space[5]};
    `,
    lg: css`
        height: 52px;
        padding: 0 ${({ theme }) => theme.data.space[6]};
    `,
};

const spin = keyframes`to { transform: rotate(360deg); }`;

const ScButton = styled.button<{
    $variant: Variant;
    $intent: Intent;
    $size: Size;
}>`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.data.space[2]};
    border-radius: ${({ theme }) => theme.data.radius.lg};
    font-family: ${({ theme }) => theme.data.type.fontBody};
    font-size: ${({ theme }) => theme.data.type.scale.body.size};
    font-weight: 600;
    cursor: pointer;
    transition: transform ${({ theme }) => theme.data.motion.duration.fast}
        ${({ theme }) => theme.data.motion.easing.standard};
    ${({ $size }) => sizes[$size]}
    ${({ theme, $variant, $intent }) => {
        const a = accent(theme, $intent);
        if ($variant === "solid")
            return css`
                background: ${a};
                color: ${theme.data.semantic.onBrand};
            `;
        if ($variant === "soft")
            return css`
                background: color-mix(in oklch, ${a} 12%, transparent);
                color: ${a};
            `;
        if ($variant === "outline")
            return css`
                background: transparent;
                color: ${a};
                box-shadow: inset 0 0 0 1px ${theme.data.semantic.borderStrong};
            `;
        return css`
            background: transparent;
            color: ${a};
        `;
    }}
  &:hover:not(:disabled) {
        transform: translateY(-2px);
    }
    &:active:not(:disabled) {
        transform: scale(0.98);
    }
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    @media (prefers-reduced-motion: reduce) {
        transition: none;
        &:hover,
        &:active {
            transform: none;
        }
    }
`;

// El label permanece en el flujo (invisible) durante loading para que el ancho
// del botón NO salte; el spinner se superpone centrado.
const ScLabel = styled.span<{ $hidden: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[2]};
    visibility: ${({ $hidden }) => ($hidden ? "hidden" : "visible")};
`;

const ScSpinner = styled.span`
    position: absolute;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: ${({ theme }) => theme.data.radius.full};
    animation: ${spin} 700ms linear infinite;
    /* Excepción documentada a "reduced-motion congela todo": un indicador de
     carga inmóvil deja de comunicar que algo está en curso. Se ralentiza en
     vez de detenerse. */
    @media (prefers-reduced-motion: reduce) {
        animation-duration: 2100ms;
    }
`;

export function Button({
    variant = "solid",
    intent = "primary",
    size = "md",
    loading = false,
    disabled,
    children,
    ref,
    ...rest
}: Props): React.JSX.Element {
    return (
        <ScButton
            ref={ref}
            $variant={variant}
            $intent={intent}
            $size={size}
            aria-busy={loading || undefined}
            disabled={disabled || loading}
            {...rest}
        >
            {loading && <ScSpinner aria-hidden="true" />}
            <ScLabel $hidden={loading}>{children}</ScLabel>
        </ScButton>
    );
}
```

> Nota de imports: este archivo necesita `import styled, { css, keyframes, type DefaultTheme } from "styled-components";`. Las 4 variantes (`solid`/`soft`/`outline`/`ghost`) y los 4 `intent` quedan **implementados**, no diferidos: el spec §13.1 los mandata y una prop declarada que no hace nada es un defecto.

- [ ] **Step 4 — Run (PASS):** `pnpm test src/components/ui/Button`
- [ ] **Step 5 — Commit:** `git add src/components/ui/Button && git commit -m "feat(ui): Button with press + hover-lift and loading state"`

---

### Task 12: `Card`

**Files:**

- Create: `src/components/ui/Card/Card.tsx`, `src/components/ui/Card/Card.test.tsx`

**Interfaces:**

- Produces: `Card` — props `interactive?: boolean` (def false), `as?`, `children`, props nativas. Estático = plano borde 1px; interactive = hover-lift + border-strong. **Sin glass** (spec §13.2).

- [ ] **Step 1 — Test (falla):**

```tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Card } from "./Card";

describe("Card", () => {
    it("renderiza su contenido", () => {
        renderWithProviders(<Card>Contenido</Card>);
        expect(screen.getByText("Contenido")).toBeInTheDocument();
    });
    it("interactive expone role de foco (tabindex/link)", () => {
        renderWithProviders(
            <Card
                interactive
                as="a"
                href="#x"
            >
                Link
            </Card>,
        );
        expect(screen.getByRole("link", { name: "Link" })).toBeInTheDocument();
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/components/ui/Card`
- [ ] **Step 3 — Implementar:**

```tsx
"use client";
import type { ElementType, ReactNode } from "react";
import styled, { css } from "styled-components";

interface Props {
    interactive?: boolean;
    as?: ElementType;
    href?: string;
    children: ReactNode;
    className?: string;
}

const ScCard = styled.div<{ $interactive: boolean }>`
    background: ${({ theme }) => theme.data.semantic.surface};
    border: 1px solid ${({ theme }) => theme.data.semantic.border};
    border-radius: ${({ theme }) => theme.data.radius.xl};
    padding: ${({ theme }) => theme.data.space[6]};
    ${({ theme, $interactive }) =>
        $interactive &&
        css`
            display: block;
            cursor: pointer;
            transition:
                transform ${theme.data.motion.duration.fast}
                    ${theme.data.motion.easing.standard},
                border-color ${theme.data.motion.duration.fast}
                    ${theme.data.motion.easing.standard};
            &:hover {
                transform: translateY(-2px);
                border-color: ${theme.data.semantic.borderStrong};
                box-shadow: ${theme.data.elevation[1]};
            }
            @media (prefers-reduced-motion: reduce) {
                transition: none;
                &:hover {
                    transform: none;
                }
            }
        `}
`;

export function Card({
    interactive = false,
    as,
    children,
    ...rest
}: Props): React.JSX.Element {
    return (
        <ScCard
            as={as}
            $interactive={interactive}
            {...rest}
        >
            {children}
        </ScCard>
    );
}
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/components/ui/Card`
- [ ] **Step 5 — Commit:** `git add src/components/ui/Card && git commit -m "feat(ui): Card (flat static + interactive hover-lift)"`

---

### Task 13: `Input` + `Field`

**Files:**

- Create: `src/components/ui/Input/Input.tsx`, `src/components/ui/Input/Input.test.tsx`

**Interfaces:**

- Produces: `Field` (`{ label, htmlFor, help?, error?, children }`) y `Input` (props nativas `<input>` + `ref`, estado error vía `aria-invalid`). Spec §13.4.

- [ ] **Step 1 — Test (falla):**

```tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Field, Input } from "./Input";

describe("Input / Field", () => {
    it("asocia label con el control", () => {
        renderWithProviders(
            <Field
                label="Email"
                htmlFor="email"
            >
                <Input id="email" />
            </Field>,
        );
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
    it("marca aria-invalid con error", () => {
        renderWithProviders(
            <Input
                aria-invalid
                error
            />,
        );
        expect(screen.getByRole("textbox")).toHaveAttribute(
            "aria-invalid",
            "true",
        );
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/components/ui/Input`
- [ ] **Step 3 — Implementar** (alto 44px, radius sm, focus → border-strong + ring lo aporta GlobalStyles; error → borde error):

```tsx
"use client";
import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import styled from "styled-components";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    ref?: Ref<HTMLInputElement>;
}
const ScInput = styled.input<{ $error?: boolean }>`
    height: 44px;
    width: 100%;
    padding: 0 ${({ theme }) => theme.data.space[4]};
    border-radius: ${({ theme }) => theme.data.radius.sm};
    border: 1px solid
        ${({ theme, $error }) =>
            $error ? theme.data.semantic.error : theme.data.semantic.border};
    background: ${({ theme }) => theme.data.semantic.surface};
    color: ${({ theme }) => theme.data.semantic.text};
    font-family: ${({ theme }) => theme.data.type.fontBody};
    &:focus {
        border-color: ${({ theme }) => theme.data.semantic.borderStrong};
    }
    &:disabled {
        opacity: 0.5;
    }
`;
export function Input({ error, ...rest }: InputProps): React.JSX.Element {
    return (
        <ScInput
            $error={error}
            {...rest}
        />
    );
}

interface FieldProps {
    label: string;
    htmlFor: string;
    help?: string;
    error?: string;
    children: ReactNode;
}
const ScLabel = styled.label`
    display: block;
    margin-bottom: ${({ theme }) => theme.data.space[2]};
    font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
    font-weight: 600;
    color: ${({ theme }) => theme.data.semantic.text};
`;
const ScMsg = styled.p<{ $error?: boolean }>`
    margin: ${({ theme }) => theme.data.space[2]} 0 0;
    font-size: ${({ theme }) => theme.data.type.scale.caption.size};
    color: ${({ theme, $error }) =>
        $error ? theme.data.semantic.error : theme.data.semantic.textSubtle};
`;
export function Field({
    label,
    htmlFor,
    help,
    error,
    children,
}: FieldProps): React.JSX.Element {
    return (
        <div>
            <ScLabel htmlFor={htmlFor}>{label}</ScLabel>
            {children}
            {(error ?? help) && <ScMsg $error={!!error}>{error ?? help}</ScMsg>}
        </div>
    );
}
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/components/ui/Input`
- [ ] **Step 5 — Commit:** `git add src/components/ui/Input && git commit -m "feat(ui): Input + Field with error/help states"`

---

### Task 14: Upgrade `Navbar` — glass on scroll (el glass ganado)

**Files:**

- Modify: `src/components/layout/Navbar/Navbar.tsx`
- Test: `src/components/layout/Navbar/Navbar.test.tsx` (nuevo)

**Interfaces:**

- Consumes: `useScrolled` (Task 9), `theme.data.glass` (Task 4).

- [ ] **Step 1 — Test (falla):** al no estar scrolled, sin glass; se apoya en `useScrolled`. Verificar que renderiza landmark `banner`/`navigation` y aplica atributo `data-scrolled`.

```tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
    it("expone el landmark de navegación", () => {
        renderWithProviders(<Navbar />);
        expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
    it("arranca sin estado scrolled", () => {
        renderWithProviders(<Navbar />);
        expect(screen.getByRole("banner")).toHaveAttribute(
            "data-scrolled",
            "false",
        );
    });
});
```

- [ ] **Step 2 — Run (FAIL):** `pnpm test src/components/layout/Navbar`
- [ ] **Step 3 — Implementar** (transparente sobre hero → glass al hacer scroll; `data-scrolled` dispara el estilo):

```tsx
"use client";
import Link from "next/link";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { useScrolled } from "@/hooks/useScrolled";

const ScHeader = styled.header`
    position: sticky;
    top: 0;
    z-index: ${({ theme }) => theme.data.zIndex.stickyNav};
    transition:
        backdrop-filter ${({ theme }) => theme.data.motion.duration.base}
            ${({ theme }) => theme.data.motion.easing.standard},
        background-color ${({ theme }) => theme.data.motion.duration.base}
            ${({ theme }) => theme.data.motion.easing.standard};
    &[data-scrolled="true"] {
        background: ${({ theme }) => theme.data.glass.bg};
        -webkit-backdrop-filter: ${({ theme }) => theme.data.glass.blur};
        backdrop-filter: ${({ theme }) => theme.data.glass.blur};
        border-bottom: ${({ theme }) => theme.data.glass.border};
    }
    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
`;
const ScNav = styled.nav`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.data.space[4]};
    height: 3.5rem;
    padding: 0 ${({ theme }) => theme.data.space[4]};
    @media ${({ theme }) => theme.data.breakPoint.md} {
        padding: 0 ${({ theme }) => theme.data.space[6]};
    }
`;
const ScActions = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[3]};
`;

export function Navbar(): React.JSX.Element {
    const scrolled = useScrolled(8);
    return (
        <ScHeader data-scrolled={scrolled}>
            <ScNav>
                <Link href="/">
                    <BrandName />
                </Link>
                <ScActions>
                    <LanguageSelector />
                    <ThemeToggle />
                </ScActions>
            </ScNav>
        </ScHeader>
    );
}
```

- [ ] **Step 4 — Run (PASS):** `pnpm test src/components/layout/Navbar`
- [ ] **Step 5 — Commit:** `git add src/components/layout/Navbar src/hooks && git commit -m "feat(nav): glass-on-scroll (the earned glass)"`

**Gate de fase 2:** `pnpm check && pnpm test` verde. Componentes de referencia funcionando en `pnpm dev`.

---

# FASE 3 — Remap de componentes existentes + limpieza

### Task 15: Re-mapear consumidores legacy a tokens nuevos

**Files (modify):** `Hero.tsx`, `About.tsx`, `Footer.tsx`, `ThemeToggle.tsx`, `LanguageSelector.tsx`, `Socials.tsx`, `BrandName.tsx`, `BackOrbs.tsx`.

**Objetivo:** sustituir toda lectura de `theme.data.color.*` / `theme.data.background.*` / `theme.data.typography.*` (legacy) y todo spacing/radii hardcodeado por `theme.data.semantic.*` + escalas (`space`, `radius`, `type`). Cambios concretos por archivo:

- [ ] **Step 1 — Swaps de color/background** (aplicar en cada archivo):
    - `theme.data.background.primary[500]` → `theme.data.semantic.bg`
    - `theme.data.background.primary[300]` (borde nav) → `theme.data.semantic.border`
    - `theme.data.color.primary[100]` (ThemeToggle bg) → `theme.data.semantic.surfaceSunken`
    - `theme.data.color.primary[500]` (orbe primario, BackOrbs) → `theme.data.semantic.brand`
    - `theme.data.color.secondary[500]` (orbe secundario) → `theme.data.palette.secondary[500]` (efecto decorativo del hero; excepción documentada: los orbes son espectáculo de fondo, no UI — se permite leer el primitivo aquí con comentario)
    - `theme.data.color.tertiary?.[500]` (orbe terciario) → `theme.data.palette.error[500]`
    - `theme.data.typography.primaryColor[500]` → `theme.data.semantic.text`
    - `theme.data.typography.secondaryColor[500]` (scroll cue) → `theme.data.semantic.textSubtle`
    - `theme.data.typography.main.font` → `theme.data.type.fontBody`
- [ ] **Step 2 — Swaps de spacing/radii hardcodeado** por escala: `2rem`→`space[6]`, `1.5rem`→`space[5]`, `0.75rem`→`space[3]`, `1rem`→`space[4]`, `border-radius: 6px`→`radius.md`, `border-radius: 50%`→`radius.full`, etc. (revisar cada styled component).
- [ ] **Step 3 — Verificar sin regresión visual:** `pnpm dev` → recorrer light y dark; comparar con `git stash`/before. Los tests existentes (`Hero.test.tsx`) siguen verdes.
- [ ] **Step 4 — Run gate:** `pnpm check && pnpm test`
- [ ] **Step 5 — Commit:** `git add src/components && git commit -m "refactor(theme): migrate existing components to semantic tokens"`

---

### Task 16: Eliminar los grupos de token legacy

**Files (modify):** `src/theme/theme.types.ts`, `src/theme/themes.ts`.

**Precondición:** `grep -rn "theme.data.color\.\|theme.data.background\.\|theme.data.typography\." src/` no devuelve nada (todo migrado en Task 15).

- [ ] **Step 1 — Verificar sin consumidores:** `grep -rn "data.background\.\|data.color\.\|data.typography\." src/` → sin resultados (salvo `data.type`, que es distinto).
- [ ] **Step 2 — Eliminar** de `ThemeDefinition` los campos `background`, `color`, `typography`, `themeName`, `themeTitle`; de `themes.ts` los objetos correspondientes; borrar interfaces legacy huérfanas (`ThemeColor`, `ThemeBackgroundColor`, `ThemeTypography`, `Color`, `Typography`) si nadie más las usa.
- [ ] **Step 3 — Run gate:** `pnpm check && pnpm test` (typecheck confirma que no quedó ninguna referencia).
- [ ] **Step 4 — Commit:** `git add src/theme && git commit -m "refactor(theme): drop legacy HSL token groups"`

**Gate de fase 3 (Definition of Done):** `pnpm check && pnpm test` verde; `pnpm build` OK; recorrido manual light/dark sin regresión; AA validado (Task 2 nota); reduced-motion QA.

---

## Self-review (cobertura del spec)

| Sección del spec | Task(s) |
| --- | --- |
| §2 arquitectura 3 capas | 2, 5, 15 (regla: componentes solo `semantic`) |
| §3 color OKLCH + semántico | 2, 5 |
| §4 tipografía + fuentes | 3 |
| §5 spacing · §6 radii · §7 elevación · §10 z-index | 1 |
| §8 glass + gobierno | 4, 14 (uso), 12 (prohibición en card) |
| §9 lenguaje de movimiento | 4, y consumido en 11/12/14 |
| §11 grid/layout | 4 |
| §12 focus ring | 7 (global) |
| §13 componentes (Button/Card/Nav/Forms) | 11, 12, 13, 14 |
| §14 loading sequences | 11 (button loading), 8 (reveal); skeleton/section-reveal → integración posterior |
| §15 a11y y theming | 7, 10–14, 15 |
| §16 estructura de archivos | mapa de archivos |
| §17 migración | fases 1–3 |

**Huecos conocidos (declarados, no placeholders):** Skeleton/Spinner y el roster largo (Select custom, Tabs, Tooltip, Toast) quedan **especificados en el spec** pero **fuera de este plan** (spec §18: solo se construyen los 4 de referencia). El `intent` no-primary del Button y el `Spinner` real son iteraciones marcadas en la nota de la Task 11. La validación AA de OKLCH es una acción explícita (nota Task 2).

---

## Execution Handoff

**Plan completo y guardado en `docs/superpowers/plans/2026-07-24-luxury-interface-system.md`. Dos opciones de ejecución:**

**1. Subagent-Driven (recomendado)** — despacho un subagente fresco por task, reviso entre tasks, iteración rápida.

**2. Inline Execution** — ejecuto las tasks en esta sesión con executing-plans, por lotes con checkpoints de revisión.

**¿Cuál prefieres?** (Recordatorio: dijiste "no escribas código aún" — este handoff queda a la espera de tu visto bueno para empezar a ejecutar.)
