# Framework de interacción 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** construir el viaje cinemático de 4 escenas de la landing — ojo cósmico persistente en CSS + una única escena Three.js de carga diferida para los beats que el CSS no puede fingir (profundidad, cámara, partículas).

**Architecture:** el ojo se **porta** desde la referencia CSS/DOM ya existente (no se reescribe en shader). Three.js entra **una sola vez**, en un módulo cargado dinámicamente, con una escena y una cámara cuyo progreso va ligado al scroll (`scrubbed`, sin scrolljacking). Todas las duraciones y curvas salen del token layer del sistema de lujo, ya construido. El LCP no depende de Three.js: si la escena nunca carga, el sitio está completo.

**Tech Stack:** Next.js 16 (export estático), React 19, styled-components 6, TypeScript strict, Vitest + Testing Library, `three` (única dep nueva, import dinámico).

## Global Constraints

- **Package manager:** pnpm (`pnpm@11.10.0`, Corepack). Gate: `pnpm check` (typecheck + lint + check-format) y `pnpm test`. Nunca `pnpm ci`.
- **TypeScript strict**, sin `any`. Tipos de retorno explícitos en funciones exportadas. `import type` para tipos.
- **React 19:** `ref` como prop, sin `forwardRef`. El canvas **nunca** se re-renderiza por frame: el estado va por refs/uniforms, jamás por `useState` en el bucle.
- **Tokens obligatorios.** Duraciones y curvas SOLO de `theme.data.motion`; color SOLO de `theme.data.semantic.*` (nunca `palette.*`, salvo la excepción ya sancionada de `BackOrbs`); spacing/radii de las escalas. **Cero valores hardcodeados.**
- **Movimiento:** en DOM solo `transform`/`opacity`, más las propiedades de _paint_ que §9 (revisada) permite para tintes de estado; **prohibido animar layout** (`width`/`height`/`margin`/`padding`/`top`/`left`/`font-size`). En Three.js solo posición/rotación/uniforms — nunca reconstruir geometría por frame.
- **`prefers-reduced-motion`** colapsa todo: ojo congelado al póster, descenso → fundido de opacidad, sin parallax/magnetic/pulse, loops ambiente detenidos. El **foco nunca se anima**.
- **Accesibilidad:** canvas `aria-hidden="true"` (es decoración); contenido completo y navegable sin WebGL; anillo `:focus-visible` del sistema de lujo, **jamás anulado** (ningún `outline: none`: el anillo global tiene especificidad (0,1,0) y cualquiera lo destruiría en todo el sitio); targets ≥44px; **una sola `<h1>` por página**; landmarks y headings en orden.
- **Sin scrolljacking.** El scroll nativo manda siempre. Requisito de accesibilidad, no de gusto.
- **i18n:** todo string por i18next con paridad es/en. **Cero copia hardcodeada. Cero claims inventados** (protocolo de veracidad).
- **Three.js:** import dinámico, fuera del bundle inicial. DPR capado a 2. Render loop en pausa fuera de viewport y con pestaña oculta. Starfield en **un draw call**.
- **Spec de referencia:** `docs/superpowers/specs/2026-07-24-3d-interaction-framework-design.md` (§ citadas por task).

## Estado del repo del que parte este plan (verificado)

Ya existe y **se consume, no se reinventa**:

- `theme.data.motion` (`duration.fast|base|slow|slower|ambient|spin|spinReduced`, `easing.standard|decelerate|accelerate|emphasized`), `semantic` (16 roles), `space`, `radius`, `elevation`, `zIndex`, `glass`, `grid`, `type`.
- `src/hooks/useReveal.ts` → `{ ref, revealed }` con `IntersectionObserver`.
- `src/hooks/useScrolled.ts` → `boolean`.
- `src/components/ui/`: `Button` (4 variantes × 4 intents, loading), `Card` (`interactive`), `Input`+`Field`, `Typography` (12 variantes + alias `lead`).
- `Navbar` con glass-on-scroll; `Hero`, `About`, `Footer`, `BackOrbs`, `Socials`, `BrandName`, `ThemeToggle`, `LanguageSelector`.
- i18n `es`/`en` con paridad, namespace `home`. **Ya contiene copia real del equipo** en `Home.sections` (`learning` / `imagination` / `gaming`, cada una con `title`/`subtitle`/`description`) — se usa para el showcase en vez de inventar.
- **No existe** `three` en dependencias. **No existe** póster en `public/`.

## Entradas del usuario aún pendientes (spec §19)

Estas **no se inventan**. El plan las trata así:

1. **Copia de Story y Contact** → se añaden claves i18n con texto **placeholder explícito** (`[por completar]`), es y en a la vez. El usuario las rellena; ninguna task depende de su contenido para pasar.
2. **Enlaces de CTA** (playground, docs, GitHub, email) → constante única `src/config/links.ts` con valores placeholder marcados. GitHub y Discord **sí** se conocen (ya en `Socials`) y se reutilizan.
3. **Póster** → Task 7 lo genera exportando el primer frame de la escena (opción sin dependencias externas ni assets de 1,8 MB).
4. **Densidad de partículas** → Task 13 la calibra midiendo; el plan fija defaults conservadores hasta entonces.

---

## Mapa de archivos

```
src/config/links.ts                    destinos de CTA (placeholders marcados)        [T1]
src/hooks/
├─ usePointer.ts                       puntero suavizado (lerp); no-op en táctil      [T2]
└─ useScrollProgress.ts                progreso 0→1 por elemento (scrubbed)           [T3]
src/components/eye/
├─ Eye.tsx                             ojo CSS portado: breathe · gaze · pulse        [T4]
├─ eye.parts.tsx                       styled-components del ojo (iris, glints, lid)  [T4]
└─ EyeCornerMark.tsx                   marca-esquina persistente                      [T6]
src/components/sections/
├─ Hero/Hero.tsx                       reconstruido alrededor del ojo                 [T5]
├─ Story/Story.tsx                     escena 2 (el vacío)                            [T9]
├─ Features/Features.tsx               escena 3 (showcase + assembly)                 [T10]
└─ Contact/Contact.tsx                 escena 4 (la invitación)                       [T11]
src/three/
├─ Scene.tsx                           canvas + ciclo de vida + póster                [T7]
├─ starfield.ts                        Points instanciado + drift                     [T8]
├─ camera.ts                           mapeo progreso de scroll → cámara              [T12]
└─ SceneLoader.tsx                     import dinámico + fallback                     [T7]
src/i18n/locales/{es,en}/home.json     claves de Story/Features/Contact               [T9-T11]
app/page.tsx                           composición de las 4 escenas                   [T5,T9-T11]
public/brand/eye-poster.webp           póster (generado en T7)                        [T7]
```

**Orden:** Fase A (T1-T6) no toca Three.js y es shippable entera. Fase B (T7-T8, T12-T13) añade la escena. Fase C (T9-T11) las secciones de contenido. **Fase A y B no dependen de las entradas pendientes del usuario; Fase C sí para el texto final** (pero pasa con placeholders).

---

# FASE A — El ojo y el andamiaje (sin Three.js, cero deps nuevas)

### Task 1: Configuración de enlaces de CTA

**Files:**

- Create: `src/config/links.ts`
- Test: `src/config/links.test.ts`

**Interfaces:**

- Produces: `links` (`{ playground: string; docs: string; github: string; discord: string; email: string }`), `type LinkKey`.

- [ ] **Step 1: Escribe el test que falla**

```ts
// src/config/links.test.ts
import { describe, it, expect } from "vitest";
import { links } from "./links";

describe("links de CTA", () => {
    it("expone todos los destinos que el viaje necesita", () => {
        expect(Object.keys(links).sort()).toEqual([
            "discord",
            "docs",
            "email",
            "github",
            "playground",
        ]);
    });

    it("github y discord apuntan a destinos reales ya conocidos", () => {
        expect(links.github).toBe("https://github.com/VoidToInfinite");
        expect(links.discord).toBe("https://discord.gg/voidtoinfinite");
    });

    it("marca explícitamente los destinos aún sin confirmar", () => {
        // Protocolo de veracidad: lo desconocido se marca, no se inventa.
        expect(links.playground).toContain("por-completar");
        expect(links.docs).toContain("por-completar");
        expect(links.email).toContain("por-completar");
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/config/links.test.ts` Expected: FAIL — `Cannot find module './links'`

- [ ] **Step 3: Implementa**

```ts
// src/config/links.ts

/**
 * Destinos de los CTA del viaje.
 *
 * Los marcados `por-completar` son entradas pendientes del usuario (spec §19):
 * NO se inventan URLs. Al sustituirlos, actualiza también `links.test.ts`.
 */
export const links = {
    playground: "https://example.invalid/por-completar-playground",
    docs: "https://example.invalid/por-completar-docs",
    github: "https://github.com/VoidToInfinite",
    discord: "https://discord.gg/voidtoinfinite",
    email: "mailto:por-completar@voidtoinfinite.com",
} as const;

export type LinkKey = keyof typeof links;
```

> Nota: `example.invalid` es un TLD reservado por RFC 2606 — imposible que resuelva por accidente a un sitio real. Es deliberado: un placeholder que se escapase a producción falla de forma ruidosa, no silenciosa.

- [ ] **Step 4: Ejecuta y verifica que PASA**

Run: `pnpm test src/config/links.test.ts` Expected: PASS (3 tests)

- [ ] **Step 5: Verifica los valores reales de github/discord**

Run: `grep -rn "github.com\|discord" src/components/layout/Socials/Socials.tsx` Si los valores del repo difieren de los del test, **usa los del repo** y ajusta el test. No inventes.

- [ ] **Step 6: Gate y commit**

```bash
pnpm check && pnpm test
git add src/config
git commit -m "feat(config): destinos de CTA con placeholders marcados"
```

---

### Task 2: Hook `usePointer` (puntero suavizado, no-op en táctil)

**Files:**

- Create: `src/hooks/usePointer.ts`
- Test: `src/hooks/usePointer.test.tsx`

**Interfaces:**

- Produces: `usePointer(): { x: RefObject<number>; y: RefObject<number>; enabled: boolean }` — `x`/`y` normalizados a −1..1, suavizados por lerp. **Devuelve refs, no estado**: el consumidor lee en su propio rAF sin provocar re-render.

**Por qué refs y no estado (spec §13):** un `useState` por frame re-renderizaría React 60 veces por segundo. El ojo y la escena leen `.current` dentro de su bucle.

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/hooks/usePointer.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePointer } from "./usePointer";

function setPointerFine(matches: boolean): void {
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

beforeEach(() => {
    setPointerFine(true);
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("usePointer", () => {
    it("arranca centrado", () => {
        const { result } = renderHook(() => usePointer());
        expect(result.current.x.current).toBe(0);
        expect(result.current.y.current).toBe(0);
    });

    it("se habilita cuando hay puntero fino", () => {
        const { result } = renderHook(() => usePointer());
        expect(result.current.enabled).toBe(true);
    });

    it("queda deshabilitado en táctil (sin puntero fino)", () => {
        setPointerFine(false);
        const { result } = renderHook(() => usePointer());
        expect(result.current.enabled).toBe(false);
    });

    it("no registra listeners de puntero cuando está deshabilitado", () => {
        setPointerFine(false);
        const addSpy = vi.spyOn(window, "addEventListener");
        renderHook(() => usePointer());
        const pointerCalls = addSpy.mock.calls.filter(
            ([evt]) => evt === "pointermove",
        );
        expect(pointerCalls).toHaveLength(0);
        addSpy.mockRestore();
    });

    it("limpia el listener al desmontar", () => {
        const removeSpy = vi.spyOn(window, "removeEventListener");
        const { unmount } = renderHook(() => usePointer());
        unmount();
        const pointerCalls = removeSpy.mock.calls.filter(
            ([evt]) => evt === "pointermove",
        );
        expect(pointerCalls.length).toBeGreaterThan(0);
        removeSpy.mockRestore();
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/hooks/usePointer.test.tsx` Expected: FAIL — `Cannot find module './usePointer'`

- [ ] **Step 3: Implementa**

```ts
// src/hooks/usePointer.ts
import { useEffect, useRef, useState, type RefObject } from "react";

/** Factor de suavizado por frame. ~0.085 ≈ 85ms de asentamiento a 60fps (spec §4). */
const LERP = 0.085;

export interface Pointer {
    /** Posición X normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
    x: RefObject<number>;
    y: RefObject<number>;
    /** `false` en táctil o sin puntero fino: no hay cursor al que reaccionar. */
    enabled: boolean;
}

export function usePointer(): Pointer {
    const x = useRef(0);
    const y = useRef(0);
    const targetX = useRef(0);
    const targetY = useRef(0);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        // `hover: hover` + `pointer: fine` = ratón/trackpad de verdad. En táctil no
        // hay cursor que seguir, así que el efecto no aporta nada y se apaga (spec §7).
        const fine = window.matchMedia(
            "(hover: hover) and (pointer: fine)",
        ).matches;
        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        const active = fine && !reduced;
        setEnabled(active);
        if (!active) return;

        const onMove = (e: PointerEvent): void => {
            targetX.current = Math.max(
                -1,
                Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2),
            );
            targetY.current = Math.max(
                -1,
                Math.min(1, (e.clientY / window.innerHeight - 0.5) * 2),
            );
        };
        const onLeave = (): void => {
            targetX.current = 0;
            targetY.current = 0;
        };

        let raf = 0;
        const tick = (): void => {
            x.current += (targetX.current - x.current) * LERP;
            y.current += (targetY.current - y.current) * LERP;
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);

        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("mouseleave", onLeave);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("mouseleave", onLeave);
        };
    }, []);

    return { x, y, enabled };
}
```

- [ ] **Step 4: Ejecuta y verifica que PASA**

Run: `pnpm test src/hooks/usePointer.test.tsx` Expected: PASS (5 tests)

- [ ] **Step 5: Gate y commit**

```bash
pnpm check && pnpm test
git add src/hooks/usePointer.ts src/hooks/usePointer.test.tsx
git commit -m "feat(hooks): usePointer (lerp, no-op en tactil y reduced-motion)"
```

---

### Task 3: Hook `useScrollProgress` (progreso scrubbed 0→1)

**Files:**

- Create: `src/hooks/useScrollProgress.ts`
- Test: `src/hooks/useScrollProgress.test.tsx`

**Interfaces:**

- Produces: `useScrollProgress(): { ref: (node: Element | null) => void; progress: RefObject<number> }` — `progress.current` va de 0 (el elemento acaba de entrar por abajo) a 1 (acaba de salir por arriba). Refs, no estado, por la misma razón que T2.

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/hooks/useScrollProgress.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollProgress } from "./useScrollProgress";

function nodeWith(top: number, height: number): Element {
    const el = document.createElement("div");
    el.getBoundingClientRect = () =>
        ({ top, height, bottom: top + height }) as DOMRect;
    return el;
}

beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
        value: 1000,
        configurable: true,
    });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("useScrollProgress", () => {
    it("arranca en 0", () => {
        const { result } = renderHook(() => useScrollProgress());
        expect(result.current.progress.current).toBe(0);
    });

    it("da 0 cuando el elemento aun no ha entrado", () => {
        const { result } = renderHook(() => useScrollProgress());
        act(() => result.current.ref(nodeWith(1000, 500)));
        act(() => {
            window.dispatchEvent(new Event("scroll"));
        });
        expect(result.current.progress.current).toBe(0);
    });

    it("da 1 cuando el elemento ya salio por arriba", () => {
        const { result } = renderHook(() => useScrollProgress());
        act(() => result.current.ref(nodeWith(-500, 500)));
        act(() => {
            window.dispatchEvent(new Event("scroll"));
        });
        expect(result.current.progress.current).toBe(1);
    });

    it("da ~0.5 a mitad de recorrido", () => {
        const { result } = renderHook(() => useScrollProgress());
        // recorrido total = innerHeight + height = 1500; top = 250 → recorrido
        // consumido = (1000 - 250) / 1500 = 0.5
        act(() => result.current.ref(nodeWith(250, 500)));
        act(() => {
            window.dispatchEvent(new Event("scroll"));
        });
        expect(result.current.progress.current).toBeCloseTo(0.5, 2);
    });

    it("limpia el listener al desmontar", () => {
        const removeSpy = vi.spyOn(window, "removeEventListener");
        const { result, unmount } = renderHook(() => useScrollProgress());
        act(() => result.current.ref(nodeWith(0, 500)));
        unmount();
        expect(removeSpy.mock.calls.some(([evt]) => evt === "scroll")).toBe(
            true,
        );
        removeSpy.mockRestore();
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/hooks/useScrollProgress.test.tsx` Expected: FAIL — `Cannot find module './useScrollProgress'`

- [ ] **Step 3: Implementa**

```ts
// src/hooks/useScrollProgress.ts
import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface ScrollProgress {
    ref: (node: Element | null) => void;
    /** 0 = acaba de entrar por abajo · 1 = acaba de salir por arriba. */
    progress: RefObject<number>;
}

/**
 * Progreso de scroll de un elemento, normalizado 0→1 (modo `scrubbed`, spec §4).
 *
 * NO secuestra el scroll: solo lo observa. El usuario controla el tiempo; si
 * deja de hacer scroll, el progreso deja de avanzar.
 */
export function useScrollProgress(): ScrollProgress {
    const progress = useRef(0);
    const node = useRef<Element | null>(null);

    const ref = useCallback((n: Element | null) => {
        node.current = n;
    }, []);

    useEffect(() => {
        let raf = 0;
        let queued = false;

        const measure = (): void => {
            queued = false;
            const el = node.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            // Recorrido total: desde que el borde superior entra por abajo hasta que
            // el inferior sale por arriba.
            const total = window.innerHeight + rect.height;
            const done = window.innerHeight - rect.top;
            progress.current = Math.max(0, Math.min(1, done / total));
        };

        // El listener solo encola; la medición ocurre en rAF para no forzar
        // reflow sincrónico en cada evento de scroll.
        const onScroll = (): void => {
            if (queued) return;
            queued = true;
            raf = window.requestAnimationFrame(measure);
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    return { ref, progress };
}
```

- [ ] **Step 4: Ejecuta y verifica que PASA**

Run: `pnpm test src/hooks/useScrollProgress.test.tsx` Expected: PASS (5 tests)

- [ ] **Step 5: Gate y commit**

```bash
pnpm check && pnpm test
git add src/hooks/useScrollProgress.ts src/hooks/useScrollProgress.test.tsx
git commit -m "feat(hooks): useScrollProgress (scrubbed 0-1, sin scrolljacking)"
```

---

### Task 4: El ojo — port CSS a React

**Files:**

- Create: `src/components/eye/eye.parts.tsx`, `src/components/eye/Eye.tsx`, `src/components/eye/Eye.test.tsx`

**Interfaces:**

- Consumes: `usePointer` (T2).
- Produces: `Eye` — props `{ className?: string }`. Renderiza el ojo completo con `breathe`, `gaze` y `pulse`. Todo el subárbol es `aria-hidden="true"`: es decoración (spec §15).

**Referencia de origen:** `C:\Users\Daniel\Downloads\Cosmic Eye Hero.dc.html`. Es CSS/DOM puro y **funciona**: se porta, no se reescribe (spec §1). Lo que cambia: los `ref="{{ … }}"` del formato DC pasan a refs de React, y el `DCLogic` a un `useEffect` con un solo rAF.

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/components/eye/Eye.test.tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Eye } from "./Eye";

describe("Eye", () => {
    it("es decoracion: todo el ojo queda fuera del arbol de accesibilidad", () => {
        const { container } = renderWithProviders(<Eye />);
        const root = container.firstElementChild;
        expect(root).toHaveAttribute("aria-hidden", "true");
    });

    it("no expone el logo como imagen accesible (el nombre lo da el DOM real)", () => {
        renderWithProviders(<Eye />);
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("renderiza las capas del ojo", () => {
        const { container } = renderWithProviders(<Eye />);
        expect(
            container.querySelector('[data-part="universe"]'),
        ).toBeInTheDocument();
        expect(
            container.querySelector('[data-part="iris"]'),
        ).toBeInTheDocument();
        expect(
            container.querySelector('[data-part="pupil"]'),
        ).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/components/eye` Expected: FAIL — `Cannot find module './Eye'`

- [ ] **Step 3: Implementa las partes (styled-components)**

```tsx
// src/components/eye/eye.parts.tsx
"use client";
import styled, { keyframes } from "styled-components";

/* Silueta de almendra (vesica). Es un clip-path en coordenadas de caja, así que
   el ojo se RE-AJUSTA a cualquier viewport en vez de recortarse (spec §14). */
export const ALMOND =
    "M0,0.5 C0.17,0.08 0.4,0.02 0.5,0.02 C0.6,0.02 0.83,0.08 1,0.5 C0.83,0.92 0.6,0.98 0.5,0.98 C0.4,0.98 0.17,0.92 0,0.5 Z";

const spin = keyframes`to { transform: rotate(360deg); }`;
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
`;

export const ScSocket = styled.div`
    position: relative;
    width: min(94vw, 1440px);
    height: min(56vh, 520px);
    margin-inline: auto;
`;

export const ScClip = styled.div`
    position: absolute;
    inset: 0;
    clip-path: path("${ALMOND}");
    clip-path: path(evenodd, "${ALMOND}");
`;

export const ScUniverse = styled.div`
    position: absolute;
    inset: 0;
    background:
        radial-gradient(
            ellipse 70% 100% at 50% 42%,
            oklch(0.2 0.06 280 / 0.9),
            transparent 62%
        ),
        radial-gradient(
            ellipse 55% 75% at 82% 74%,
            oklch(0.24 0.15 311.928 / 0.5),
            transparent 60%
        ),
        radial-gradient(
            circle at 50% 46%,
            oklch(0.1 0.02 285),
            oklch(0.05 0.012 288) 78%
        );
`;

export const ScEyeball = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform;
`;

export const ScIris = styled.div`
    position: relative;
    width: min(42vh, 52vw, 460px);
    aspect-ratio: 1;
    will-change: transform;
    animation: ${breathe} 5s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

export const ScSwirl = styled.div`
    position: absolute;
    inset: 6%;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background: conic-gradient(
        from 0deg,
        oklch(0.66 0.142 235.851 / 0),
        oklch(0.66 0.142 235.851 / 0.4),
        oklch(0.66 0.233 311.928 / 0.4),
        oklch(0.66 0.142 235.851 / 0)
    );
    filter: blur(10px);
    animation: ${spin} 34s linear infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

export const ScRing = styled.div<{ $inset: string; $tint: string }>`
    position: absolute;
    inset: ${({ $inset }) => $inset};
    border-radius: ${({ theme }) => theme.data.radius.full};
    border: 1px solid ${({ $tint }) => $tint};
    animation: ${spin} 22s linear infinite;

    &:nth-of-type(even) {
        animation-direction: reverse;
    }
    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

/* La pupila: pozo oscuro que sostiene la marca. Es el "vacío" al que el
   descenso entra (spec §8). */
export const ScPupil = styled.div`
    position: absolute;
    inset: 40%;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background: radial-gradient(
        circle,
        oklch(0.66 0.142 235.851 / 0.9),
        oklch(0.528 0.259 311.928 / 0.5) 62%,
        transparent 82%
    );
    filter: blur(3px);
`;

export const ScGlint = styled.span<{
    $size: string;
    $top: string;
    $left: string;
}>`
    position: absolute;
    top: ${({ $top }) => $top};
    left: ${({ $left }) => $left};
    width: ${({ $size }) => $size};
    aspect-ratio: 1;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background: radial-gradient(
        circle,
        oklch(1 0 0) 0%,
        oklch(1 0 0 / 0.6) 40%,
        transparent 72%
    );
    mix-blend-mode: screen;
    pointer-events: none;
    will-change: transform;
`;

/* Sombra del párpado superior: da volumen y evita que el óvalo se lea plano. */
export const ScLidShadow = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        linear-gradient(180deg, oklch(0.02 0.01 288 / 0.6) 0%, transparent 22%),
        radial-gradient(
            ellipse 120% 55% at 50% -16%,
            oklch(0.02 0.01 288 / 0.6),
            transparent 55%
        );
`;

export const ScOutline = styled.svg`
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
    filter: drop-shadow(0 0 8px oklch(0.72 0.12 250 / 0.45));

    path {
        fill: none;
        stroke: oklch(0.9 0.05 250 / 0.75);
        stroke-width: 2.5;
        vector-effect: non-scaling-stroke;
    }
`;
```

- [ ] **Step 4: Implementa el componente**

```tsx
// src/components/eye/Eye.tsx
"use client";
import { useEffect, useRef, type ReactElement } from "react";
import { usePointer } from "@/hooks/usePointer";
import {
    ALMOND,
    ScClip,
    ScEyeball,
    ScGlint,
    ScIris,
    ScLidShadow,
    ScOutline,
    ScPupil,
    ScRing,
    ScSocket,
    ScSwirl,
    ScUniverse,
} from "./eye.parts";

/** Amplitudes de parallax en px. El iris se mueve más que el globo: eso es lo
 *  que produce la sensación de profundidad dentro del ojo (spec §7). */
const AMP = { eyeball: 14, iris: 40, glint: -16 } as const;

export function Eye({ className }: { className?: string }): ReactElement {
    const pointer = usePointer();
    const eyeball = useRef<HTMLDivElement>(null);
    const iris = useRef<HTMLDivElement>(null);
    const glint = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!pointer.enabled) return;
        let raf = 0;
        // Un solo rAF escribe transforms directamente en el DOM. React NUNCA
        // re-renderiza por frame (spec §13).
        const tick = (): void => {
            const x = pointer.x.current;
            const y = pointer.y.current;
            if (eyeball.current)
                eyeball.current.style.transform = `translate(${x * AMP.eyeball}px, ${y * (AMP.eyeball * 0.64)}px)`;
            if (iris.current)
                iris.current.style.transform = `translate(${x * AMP.iris}px, ${y * (AMP.iris * 0.7)}px)`;
            if (glint.current)
                glint.current.style.transform = `translate(${x * AMP.glint}px, ${y * (AMP.glint * 0.7)}px)`;
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [pointer]);

    return (
        <ScSocket
            className={className}
            aria-hidden="true"
        >
            <ScClip>
                <ScUniverse data-part="universe" />
                <ScEyeball ref={eyeball}>
                    <ScIris
                        ref={iris}
                        data-part="iris"
                    >
                        <ScSwirl />
                        <ScRing
                            $inset="0"
                            $tint="oklch(0.66 0.142 235.851 / 0.5)"
                        />
                        <ScRing
                            $inset="10%"
                            $tint="oklch(0.66 0.233 311.928 / 0.45)"
                        />
                        <ScRing
                            $inset="21%"
                            $tint="oklch(0.8 0.117 235.851 / 0.4)"
                        />
                        <ScPupil data-part="pupil" />
                    </ScIris>
                    <ScGlint
                        ref={glint}
                        $size="7%"
                        $top="24%"
                        $left="34%"
                    />
                </ScEyeball>
                <ScLidShadow />
            </ScClip>
            <ScOutline
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
            >
                <path d={ALMOND} />
            </ScOutline>
        </ScSocket>
    );
}
```

- [ ] **Step 5: Ejecuta y verifica que PASA**

Run: `pnpm test src/components/eye` Expected: PASS (3 tests)

- [ ] **Step 6: Verifica en navegador**

Run: `pnpm dev` y monta `<Eye />` temporalmente en `app/page.tsx`. Comprueba: el ojo se ve completo (no recortado), el iris respira, y al mover el ratón el iris se desplaza más que el globo. Con `prefers-reduced-motion` activado en el navegador, todo queda quieto. **Revierte el montaje temporal antes de commitear** (el Hero real llega en T5).

- [ ] **Step 7: Gate y commit**

```bash
pnpm check && pnpm test
git add src/components/eye
git commit -m "feat(eye): port del ojo cosmico CSS a React (breathe + gaze)"
```

---

### Task 5: Hero reconstruido alrededor del ojo

**Files:**

- Modify: `src/components/sections/Hero/Hero.tsx`, `src/components/sections/Hero/Hero.test.tsx`
- Modify: `src/i18n/locales/es/home.json`, `src/i18n/locales/en/home.json`

**Interfaces:**

- Consumes: `Eye` (T4), `Button` + `links` (T1), `Typography`, `BrandName`.

**Contrato del LCP (spec §10):** el HTML estático pinta copia, CTA y nav **ya**. El ojo es CSS puro, sin coste de red. Nada aquí espera a JS.

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/components/sections/Hero/Hero.test.tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Hero } from "./Hero";

describe("Hero", () => {
    it("muestra la marca VoidToInfinite", () => {
        renderWithProviders(<Hero />);
        expect(screen.getByText(/VoidToInfinite/i)).toBeInTheDocument();
    });

    it("expone el CTA primario hacia el playground (north-star)", () => {
        renderWithProviders(<Hero />);
        const cta = screen.getByRole("link", {
            name: /componentes|components/i,
        });
        expect(cta).toHaveAttribute("href");
    });

    it("el contenido es legible sin el ojo: la copia vive en el DOM", () => {
        renderWithProviders(<Hero />);
        expect(screen.getByText(/presente|present/i)).toBeInTheDocument();
    });

    it("mantiene una sola h1 en la seccion", () => {
        const { container } = renderWithProviders(<Hero />);
        expect(container.querySelectorAll("h1")).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/components/sections/Hero` Expected: FAIL — no existe el link del CTA.

- [ ] **Step 3: Añade las claves i18n (es y en a la vez)**

En `src/i18n/locales/es/home.json`, dentro de `Home`, añade:

```json
"cta": {
  "explore": "Explorar los componentes",
  "story": "Leer la historia"
}
```

En `src/i18n/locales/en/home.json`, dentro de `Home`:

```json
"cta": {
  "explore": "Explore the components",
  "story": "Read the story"
}
```

- [ ] **Step 4: Implementa el Hero**

```tsx
// src/components/sections/Hero/Hero.tsx
"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Eye } from "@/components/eye/Eye";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";

const ScHero = styled.section`
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.data.space[5]};
    padding: ${({ theme }) => theme.data.space[6]}
        ${({ theme }) => theme.data.space[5]};
    overflow: hidden;
`;

const ScEye = styled(Eye)`
    flex: none;
`;

/* Copy stagger-rise (spec §5): fija el orden de lectura en la carga. Cada hijo
   entra 120ms después del anterior. Solo transform/opacity. */
const ScCopy = styled.div`
    position: relative;
    z-index: ${({ theme }) => theme.data.zIndex.raised};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[4]};
    max-width: ${({ theme }) => theme.data.grid.prose};
    text-align: center;

    > * {
        animation: rise ${({ theme }) => theme.data.motion.duration.base}
            ${({ theme }) => theme.data.motion.easing.decelerate} backwards;
    }
    > *:nth-child(2) {
        animation-delay: 120ms;
    }
    > *:nth-child(3) {
        animation-delay: 240ms;
    }
    > *:nth-child(4) {
        animation-delay: 360ms;
    }

    @keyframes rise {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        > * {
            animation: none;
        }
    }
`;

const ScActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.data.space[3]};
    justify-content: center;
`;

export function Hero(): ReactElement {
    const { t } = useTranslation("home");

    return (
        <ScHero>
            <ScEye />
            <ScCopy>
                <BrandName as="h1" />
                <Typography variant="lead">{t("Home.description")}</Typography>
                <Typography variant="body">
                    {t("Home.additionalDescription")}
                </Typography>
                <ScActions>
                    <Button
                        as="a"
                        href={links.playground}
                        size="lg"
                    >
                        {t("Home.cta.explore")}
                    </Button>
                    <Button
                        as="a"
                        href="#story"
                        variant="ghost"
                        size="lg"
                    >
                        {t("Home.cta.story")}
                    </Button>
                </ScActions>
            </ScCopy>
        </ScHero>
    );
}
```

- [ ] **Step 4b: Haz `Button` polimórfico (prerrequisito verificado del paso anterior)**

`Button` hoy renderiza siempre un `<button>` y **no** acepta `as` — verificado: su interfaz solo extiende `ButtonHTMLAttributes<HTMLButtonElement>`. Pero un CTA que navega debe ser un `<a>`, no un `<button>` (semántica y teclado). `Card` y `Typography` ya resuelven esto con `as?: ElementType`; sigue ese mismo patrón.

En `src/components/ui/Button/Button.tsx`, añade al import de tipos `ElementType`, extiende la interfaz y pásalo al styled-component:

```tsx
import type {
    ButtonHTMLAttributes,
    ElementType,
    ReactElement,
    ReactNode,
    Ref,
} from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Override del elemento. `as="a"` + `href` para CTAs que navegan. */
    as?: ElementType;
    href?: string;
    // …resto de props existentes sin cambios
}
```

En la firma de la función añade `as: asProp,` y en el JSX pasa `as={asProp}` a `ScButton`. **No** toques `variant`/`intent`/`size`/`loading`: están aprobados.

Añade a `src/components/ui/Button/Button.test.tsx`:

```tsx
it("con as='a' y href se anuncia como enlace, no como boton", () => {
    renderWithProviders(
        <Button
            as="a"
            href="https://example.invalid/x"
        >
            Ir
        </Button>,
    );
    expect(screen.getByRole("link", { name: "Ir" })).toHaveAttribute(
        "href",
        "https://example.invalid/x",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
```

Ejecuta `pnpm test src/components/ui/Button` — debe pasar el nuevo test y **los 28 existentes**.

- [ ] **Step 5: Ejecuta y verifica que PASA**

Run: `pnpm test src/components/sections/Hero` Expected: PASS (4 tests)

- [ ] **Step 6: Gate, build y commit**

```bash
pnpm check && pnpm test && pnpm build
git add src/components src/i18n app
git commit -m "feat(hero): reconstruido alrededor del ojo, con CTA al playground"
```

---

### Task 6: Marca-esquina persistente (eye → corner mark)

**Files:**

- Create: `src/components/eye/EyeCornerMark.tsx`, `src/components/eye/EyeCornerMark.test.tsx`
- Modify: `src/components/layout/Navbar/Navbar.tsx`

**Interfaces:**

- Consumes: `useScrolled` (ya existe).
- Produces: `EyeCornerMark` — marca reducida que aparece en la nav al pasar el hero.

**Por qué existe (spec §9):** cose las 4 escenas en una identidad continua, en vez de un hero que se abandona tras el primer scroll.

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/components/eye/EyeCornerMark.test.tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { EyeCornerMark } from "./EyeCornerMark";

describe("EyeCornerMark", () => {
    it("es decoracion pura", () => {
        const { container } = renderWithProviders(<EyeCornerMark visible />);
        expect(container.firstElementChild).toHaveAttribute(
            "aria-hidden",
            "true",
        );
    });

    it("refleja su visibilidad en un atributo testeable", () => {
        const { container, rerender } = renderWithProviders(
            <EyeCornerMark visible={false} />,
        );
        expect(container.firstElementChild).toHaveAttribute(
            "data-visible",
            "false",
        );
        rerender(<EyeCornerMark visible />);
        expect(container.firstElementChild).toHaveAttribute(
            "data-visible",
            "true",
        );
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/components/eye/EyeCornerMark.test.tsx` Expected: FAIL — `Cannot find module './EyeCornerMark'`

- [ ] **Step 3: Implementa**

```tsx
// src/components/eye/EyeCornerMark.tsx
"use client";
import type { ReactElement } from "react";
import styled from "styled-components";

const ScMark = styled.span`
    display: inline-block;
    width: 1.5rem;
    height: 1.5rem;
    flex: none;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background: radial-gradient(
        circle at 50% 50%,
        oklch(0.66 0.142 235.851 / 0.95),
        oklch(0.528 0.259 311.928 / 0.6) 55%,
        transparent 78%
    );
    opacity: 0;
    transform: scale(0.6);
    transition:
        opacity ${({ theme }) => theme.data.motion.duration.base}
            ${({ theme }) => theme.data.motion.easing.standard},
        transform ${({ theme }) => theme.data.motion.duration.base}
            ${({ theme }) => theme.data.motion.easing.standard};

    &[data-visible="true"] {
        opacity: 1;
        transform: scale(1);
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
        transform: none;
        &[data-visible="true"] {
            transform: none;
        }
    }
`;

export function EyeCornerMark({ visible }: { visible: boolean }): ReactElement {
    return (
        <ScMark
            aria-hidden="true"
            data-visible={visible}
        />
    );
}
```

- [ ] **Step 4: Cablea en la Navbar**

En `src/components/layout/Navbar/Navbar.tsx`, dentro de `ScBrandLink`, antes de `<BrandName />`:

```tsx
<EyeCornerMark visible={scrolled} />
```

Añade el import `import { EyeCornerMark } from "@/components/eye/EyeCornerMark";` y ajusta `ScBrandLink` con `gap: ${({ theme }) => theme.data.space[2]};` para separar la marca del texto.

- [ ] **Step 5: Ejecuta y verifica que PASA**

Run: `pnpm test src/components/eye src/components/layout/Navbar` Expected: PASS (los 2 nuevos + los 7 de Navbar siguen verdes)

- [ ] **Step 6: Gate y commit**

```bash
pnpm check && pnpm test
git add src/components
git commit -m "feat(eye): marca-esquina persistente al pasar el hero"
```

**Gate de Fase A:** `pnpm check && pnpm test && pnpm build` en verde. El viaje ya tiene ojo, hero y continuidad de marca, **sin una sola dependencia nueva**. Desplegable.

---

# FASE B — La escena Three.js

### Task 7: Dependencia, `Scene` y póster de fallback

**Files:**

- Modify: `package.json`
- Create: `src/three/Scene.tsx`, `src/three/SceneLoader.tsx`, `src/three/SceneLoader.test.tsx`
- Create: `public/brand/eye-poster.webp`

**Interfaces:**

- Produces: `SceneLoader` — props `{ progress: RefObject<number> }`. Carga `Scene` dinámicamente; hasta entonces (y siempre, si no hay WebGL o hay reduced-motion) muestra el póster.
- Produces: `Scene` — el canvas real.

**Contrato duro (spec §10, §13):** el LCP **no** puede depender de Three.js. Si la escena nunca carga, el sitio está completo.

- [ ] **Step 1: Instala la dependencia**

```bash
pnpm add three
pnpm add -D @types/three
```

- [ ] **Step 2: Escribe el test que falla**

```tsx
// src/three/SceneLoader.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRef } from "react";
import { renderWithProviders, screen } from "@/test/test-utils";
import { SceneLoader } from "./SceneLoader";

beforeEach(() => {
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((q: string) => ({
            matches: false,
            media: q,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
});
afterEach(() => vi.unstubAllGlobals());

describe("SceneLoader", () => {
    it("muestra el poster antes de que la escena cargue", () => {
        renderWithProviders(<SceneLoader progress={createRef<number>()} />);
        const poster = screen.getByTestId("scene-poster");
        expect(poster).toBeInTheDocument();
    });

    it("el poster es decoracion (no aporta contenido)", () => {
        renderWithProviders(<SceneLoader progress={createRef<number>()} />);
        expect(screen.getByTestId("scene-poster")).toHaveAttribute(
            "aria-hidden",
            "true",
        );
    });

    it("no intenta cargar la escena bajo reduced-motion", () => {
        vi.stubGlobal(
            "matchMedia",
            vi.fn().mockImplementation((q: string) => ({
                matches: q.includes("reduced-motion"),
                media: q,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        );
        renderWithProviders(<SceneLoader progress={createRef<number>()} />);
        // El póster permanece: es el still de reduced-motion (spec §10).
        expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
    });
});
```

- [ ] **Step 3: Ejecuta y verifica que FALLA**

Run: `pnpm test src/three` Expected: FAIL — `Cannot find module './SceneLoader'`

- [ ] **Step 4: Implementa el loader**

```tsx
// src/three/SceneLoader.tsx
"use client";
import {
    lazy,
    Suspense,
    useEffect,
    useState,
    type ReactElement,
    type RefObject,
} from "react";
import styled from "styled-components";

const Scene = lazy(() => import("./Scene").then((m) => ({ default: m.Scene })));

const ScWrap = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: ${({ theme }) => theme.data.zIndex.base};
`;

const ScPoster = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(
            canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
        );
    } catch {
        return false;
    }
}

export function SceneLoader({
    progress,
}: {
    progress: RefObject<number>;
}): ReactElement {
    const [live, setLive] = useState(false);

    useEffect(() => {
        // Tres motivos para quedarse en el póster (spec §10, §15):
        // reduced-motion, ausencia de WebGL, o que el navegador no llegue a cargar
        // el módulo. En los tres, el sitio está completo igualmente.
        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        if (reduced || !supportsWebGL()) return;
        setLive(true);
    }, []);

    return (
        <ScWrap>
            <ScPoster
                data-testid="scene-poster"
                aria-hidden="true"
                src="/brand/eye-poster.webp"
                alt=""
                loading="eager"
                decoding="async"
            />
            {live && (
                <Suspense fallback={null}>
                    <Scene progress={progress} />
                </Suspense>
            )}
        </ScWrap>
    );
}
```

- [ ] **Step 5: Implementa la escena (ciclo de vida; el contenido llega en T8)**

```tsx
// src/three/Scene.tsx
"use client";
import { useEffect, useRef, type ReactElement, type RefObject } from "react";
import * as THREE from "three";
import styled from "styled-components";
import { createStarfield } from "./starfield";

const ScCanvas = styled.canvas`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Fundido poster → live cuando la escena está lista (spec §10). */
    opacity: 0;
    transition: opacity ${({ theme }) => theme.data.motion.duration.base}
        ${({ theme }) => theme.data.motion.easing.decelerate};
    &[data-ready="true"] {
        opacity: 1;
    }
`;

export function Scene({
    progress,
}: {
    progress: RefObject<number>;
}): ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: true,
        });
        // DPR capado a 2: por encima, el coste crece sin ganancia perceptible.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.z = 6;

        const stars = createStarfield();
        scene.add(stars.points);

        const resize = (): void => {
            const { clientWidth: w, clientHeight: h } = canvas;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        // El loop se pausa fuera de viewport y con la pestaña oculta (spec §13):
        // una escena invisible no debe consumir ni un frame.
        let raf = 0;
        let visible = true;
        let onscreen = true;
        const running = (): boolean => visible && onscreen;

        const tick = (): void => {
            stars.update(progress.current ?? 0);
            renderer.render(scene, camera);
            raf = window.requestAnimationFrame(tick);
        };
        const start = (): void => {
            if (raf === 0 && running())
                raf = window.requestAnimationFrame(tick);
        };
        const stop = (): void => {
            if (raf !== 0) {
                window.cancelAnimationFrame(raf);
                raf = 0;
            }
        };

        const io = new IntersectionObserver(([entry]) => {
            onscreen = entry.isIntersecting;
            running() ? start() : stop();
        });
        io.observe(canvas);

        const onVisibility = (): void => {
            visible = document.visibilityState === "visible";
            running() ? start() : stop();
        };
        document.addEventListener("visibilitychange", onVisibility);

        canvas.dataset.ready = "true";
        start();

        return () => {
            stop();
            io.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", resize);
            stars.dispose();
            renderer.dispose();
        };
    }, [progress]);

    return (
        <ScCanvas
            ref={canvasRef}
            aria-hidden="true"
        />
    );
}
```

- [ ] **Step 6: Genera el póster**

Arranca `pnpm dev` con la escena montada, ajusta la ventana a 1600×900, y captura el primer frame de la escena. Guárdalo como `public/brand/eye-poster.webp`, **≤ 60 KB** (WebP calidad ~70). Verifica el peso:

```bash
ls -la public/brand/eye-poster.webp
```

Si supera 60 KB, baja calidad o resolución: es un fallback, no un asset de galería. **No uses los PNG de 1,8 MB de `Downloads/` sin optimizar.**

- [ ] **Step 7: Ejecuta, verifica y commit**

```bash
pnpm test src/three && pnpm check && pnpm build
git add package.json pnpm-lock.yaml src/three public/brand/eye-poster.webp
git commit -m "feat(three): escena con carga diferida, poster de fallback y pausa de loop"
```

---

### Task 8: Starfield en un draw call

**Files:**

- Create: `src/three/starfield.ts`, `src/three/starfield.test.ts`

**Interfaces:**

- Produces: `createStarfield(count?: number): { points: THREE.Points; update: (progress: number) => void; dispose: () => void }`.

**Contrato (spec §13):** `Points` instanciado → **un draw call**. `update` solo escribe posición/rotación; **nunca** reconstruye geometría.

- [ ] **Step 1: Escribe el test que falla**

```ts
// src/three/starfield.test.ts
import { describe, it, expect } from "vitest";
import { createStarfield } from "./starfield";

describe("starfield", () => {
    it("crea un unico objeto dibujable (un draw call)", () => {
        const s = createStarfield(100);
        expect(s.points.type).toBe("Points");
        expect(s.points.children).toHaveLength(0);
        s.dispose();
    });

    it("genera 3 componentes por particula", () => {
        const s = createStarfield(100);
        const pos = s.points.geometry.getAttribute("position");
        expect(pos.count).toBe(100);
        expect(pos.itemSize).toBe(3);
        s.dispose();
    });

    it("update NO reconstruye la geometria", () => {
        const s = createStarfield(100);
        const before = s.points.geometry.getAttribute("position");
        s.update(0.5);
        expect(s.points.geometry.getAttribute("position")).toBe(before);
        s.dispose();
    });

    it("el progreso mueve la camara-objeto hacia dentro (eje z)", () => {
        const s = createStarfield(100);
        s.update(0);
        const z0 = s.points.position.z;
        s.update(1);
        expect(s.points.position.z).toBeGreaterThan(z0);
        s.dispose();
    });

    it("dispose libera geometria y material", () => {
        const s = createStarfield(10);
        const geo = s.points.geometry;
        s.dispose();
        expect(geo.getAttribute("position")).toBeUndefined();
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/three/starfield.test.ts` Expected: FAIL — `Cannot find module './starfield'`

- [ ] **Step 3: Implementa**

```ts
// src/three/starfield.ts
import * as THREE from "three";

/** Default conservador. Se calibra midiendo en móvil de gama media (T13). */
export const DEFAULT_STAR_COUNT = 1200;

/** Profundidad del campo. El descenso recorre este rango en z. */
const DEPTH = 24;

export interface Starfield {
    points: THREE.Points;
    /** `progress` 0→1 ligado al scroll (scrubbed). Solo mueve; no reconstruye. */
    update: (progress: number) => void;
    dispose: () => void;
}

export function createStarfield(count = DEFAULT_STAR_COUNT): Starfield {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
        // Distribución en un cilindro alrededor del eje de vuelo: da sensación de
        // atravesar el campo, no de mirarlo desde fuera.
        const angle = (i / count) * Math.PI * 2 * 7.3;
        const radius = 1.5 + (((i * 37) % 100) / 100) * 6;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        positions[i * 3 + 2] = -((i / count) * DEPTH);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.035,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);

    function update(progress: number): void {
        const p = Math.max(0, Math.min(1, progress));
        // Avanzar el campo hacia el espectador = volar hacia dentro del vacío.
        points.position.z = p * DEPTH;
        // Deriva ambiente lenta: el vacío nunca se lee como muerto (spec §6).
        points.rotation.z = p * 0.35;
    }

    function dispose(): void {
        geometry.dispose();
        material.dispose();
    }

    return { points, update, dispose };
}
```

- [ ] **Step 4: Ejecuta y verifica que PASA**

Run: `pnpm test src/three/starfield.test.ts` Expected: PASS (5 tests)

- [ ] **Step 5: Gate y commit**

```bash
pnpm check && pnpm test
git add src/three/starfield.ts src/three/starfield.test.ts
git commit -m "feat(three): starfield instanciado en un draw call"
```

**Gate de Fase B (parcial):** la escena renderiza y se pausa correctamente. El descenso ligado al scroll llega en T12.

---

# FASE C — Las secciones de contenido

> **Dependencia de entradas del usuario:** las claves de Story y Contact se crean con texto `[por completar]` **explícito**, en es y en. Los tests verifican estructura y accesibilidad, nunca el texto concreto, así que pasan igual. Features **sí** usa copia real: la que ya existe en `Home.sections`.

### Task 9: Sección Story (el vacío)

**Files:**

- Create: `src/components/sections/Story/Story.tsx`, `src/components/sections/Story/Story.test.tsx`
- Modify: `src/i18n/locales/{es,en}/home.json`, `app/page.tsx`

**Interfaces:**

- Consumes: `useReveal`, `useScrollProgress` (T3), `SceneLoader` (T7), `Typography`.

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/components/sections/Story/Story.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Story } from "./Story";

beforeEach(() => {
    vi.stubGlobal(
        "IntersectionObserver",
        class {
            observe() {}
            disconnect() {}
        },
    );
});

describe("Story", () => {
    it("es una region con nombre accesible", () => {
        renderWithProviders(<Story />);
        expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("tiene un h2 (jerarquia correcta bajo la h1 del hero)", () => {
        const { container } = renderWithProviders(<Story />);
        expect(container.querySelectorAll("h1")).toHaveLength(0);
        expect(container.querySelector("h2")).toBeInTheDocument();
    });

    it("tiene el ancla de navegacion del CTA del hero", () => {
        const { container } = renderWithProviders(<Story />);
        expect(container.querySelector("#story")).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/components/sections/Story` Expected: FAIL — `Cannot find module './Story'`

- [ ] **Step 3: Añade las claves i18n**

`es/home.json` → dentro de `Home`:

```json
"story": {
  "title": "Desde una página vacía",
  "body": "[por completar] Texto de la sección Story en español.",
  "additional": "[por completar] Segundo párrafo de la sección Story."
}
```

`en/home.json` → dentro de `Home`:

```json
"story": {
  "title": "From an empty page",
  "body": "[por completar] Story section copy in English.",
  "additional": "[por completar] Second paragraph of the Story section."
}
```

- [ ] **Step 4: Implementa**

```tsx
// src/components/sections/Story/Story.tsx
"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useReveal } from "@/hooks/useReveal";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { SceneLoader } from "@/three/SceneLoader";
import { Typography } from "@/components/ui/Typography/Typography";

const ScStory = styled.section`
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${({ theme }) => theme.data.space[9]}
        ${({ theme }) => theme.data.space[5]};
    overflow: hidden;
`;

/* Section reveal (spec §9): una idea a la vez. Solo transform/opacity. */
const ScContent = styled.div`
    position: relative;
    z-index: ${({ theme }) => theme.data.zIndex.raised};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.data.space[4]};
    max-width: ${({ theme }) => theme.data.grid.prose};
    text-align: center;
    opacity: 0;
    transform: translateY(12px);
    transition:
        opacity ${({ theme }) => theme.data.motion.duration.slow}
            ${({ theme }) => theme.data.motion.easing.decelerate},
        transform ${({ theme }) => theme.data.motion.duration.slow}
            ${({ theme }) => theme.data.motion.easing.decelerate};

    &[data-revealed="true"] {
        opacity: 1;
        transform: none;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
        opacity: 1;
        transform: none;
    }
`;

export function Story(): ReactElement {
    const { t } = useTranslation("home");
    const reveal = useReveal<HTMLDivElement>();
    const scroll = useScrollProgress();

    return (
        <ScStory
            id="story"
            ref={scroll.ref}
            aria-labelledby="story-title"
        >
            <SceneLoader progress={scroll.progress} />
            <ScContent
                ref={reveal.ref}
                data-revealed={reveal.revealed}
            >
                <Typography
                    variant="h2"
                    id="story-title"
                >
                    {t("Home.story.title")}
                </Typography>
                <Typography variant="lead">{t("Home.story.body")}</Typography>
                <Typography variant="body">
                    {t("Home.story.additional")}
                </Typography>
            </ScContent>
        </ScStory>
    );
}
```

- [ ] **Step 4b: Haz que `Typography` reenvíe `id` (prerrequisito verificado)**

`Typography` hoy solo acepta `variant`, `as`, `children` y `className` — verificado: **no reenvía `id`**. Sin `id` no hay `aria-labelledby`, y sin él las secciones son `region` sin nombre accesible: un lector de pantalla anuncia "región" a secas, tres veces seguidas.

En `src/components/ui/Typography/Typography.tsx`, añade `id?: string;` a la interfaz de props, recíbelo en la firma y pásalo al styled-component (`<ScText … id={id}>`).

Añade a `src/components/ui/Typography/Typography.test.tsx`:

```tsx
it("reenvia id para poder asociarlo con aria-labelledby", () => {
    renderWithProviders(
        <Typography
            variant="h2"
            id="titulo-x"
        >
            Título
        </Typography>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute(
        "id",
        "titulo-x",
    );
});
```

Ejecuta `pnpm test src/components/ui/Typography` — nuevo test en verde y los existentes intactos.

- [ ] **Step 5: Monta en la página**

En `app/page.tsx`, añade `<Story />` tras `<Hero />`.

- [ ] **Step 6: Ejecuta, verifica y commit**

```bash
pnpm test && pnpm check && pnpm build
git add src app
git commit -m "feat(sections): Story con reveal y escena ligada al scroll"
```

---

### Task 10: Sección Features (el showcase)

**Files:**

- Create: `src/components/sections/Features/Features.tsx`, `src/components/sections/Features/Features.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**

- Consumes: `Card`, `Button`, `links`, `useReveal`, `Typography`.

**Veracidad (spec §11):** los componentes reales de `vti-sdk` viven en otro repo. El showcase usa **la copia real que ya existe** en `Home.sections` (`learning` / `imagination` / `gaming`) y un enlace al playground. **No se inventan componentes ni métricas.**

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/components/sections/Features/Features.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Features } from "./Features";

beforeEach(() => {
    vi.stubGlobal(
        "IntersectionObserver",
        class {
            observe() {}
            disconnect() {}
        },
    );
});

describe("Features", () => {
    it("muestra las tres areas reales del equipo", () => {
        renderWithProviders(<Features />);
        expect(screen.getByText(/Estudio|Learning/i)).toBeInTheDocument();
        expect(
            screen.getByText(/Imaginacion|Imagination/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/Gaming/i)).toBeInTheDocument();
    });

    it("cada area es un articulo con su encabezado", () => {
        const { container } = renderWithProviders(<Features />);
        expect(container.querySelectorAll("article")).toHaveLength(3);
        expect(container.querySelectorAll("h3")).toHaveLength(3);
    });

    it("culmina en el CTA al playground (north-star)", () => {
        renderWithProviders(<Features />);
        const cta = screen.getByRole("link", {
            name: /playground|componentes|components/i,
        });
        expect(cta).toHaveAttribute("href");
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/components/sections/Features` Expected: FAIL — `Cannot find module './Features'`

- [ ] **Step 3: Implementa**

```tsx
// src/components/sections/Features/Features.tsx
"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { links } from "@/config/links";

/** Áreas reales del equipo, ya presentes en i18n. No se inventan. */
const AREAS = ["learning", "imagination", "gaming"] as const;

const ScFeatures = styled.section`
    padding: ${({ theme }) => theme.data.space[9]}
        ${({ theme }) => theme.data.space[5]};
    max-width: ${({ theme }) => theme.data.grid.containerMax};
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[7]};
`;

const ScGrid = styled.div`
    display: grid;
    gap: ${({ theme }) => theme.data.grid.gutter};
    grid-template-columns: 1fr;
    width: 100%;

    @media ${({ theme }) => theme.data.breakPoint.md} {
        grid-template-columns: repeat(3, 1fr);
    }
`;

/* Component assembly (spec §6/§11): las cards se ensamblan desde la profundidad
   con stagger de 120ms — "el sistema se enfoca desde el vacío", hecho literal. */
const ScItem = styled.div<{ $index: number }>`
    opacity: 0;
    transform: translateY(16px);
    transition:
        opacity ${({ theme }) => theme.data.motion.duration.slow}
            ${({ theme }) => theme.data.motion.easing.emphasized},
        transform ${({ theme }) => theme.data.motion.duration.slow}
            ${({ theme }) => theme.data.motion.easing.emphasized};
    transition-delay: ${({ $index }) => $index * 120}ms;

    &[data-revealed="true"] {
        opacity: 1;
        transform: none;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
        transition-delay: 0ms;
        opacity: 1;
        transform: none;
    }
`;

export function Features(): ReactElement {
    const { t } = useTranslation("home");
    const reveal = useReveal<HTMLDivElement>();

    return (
        <ScFeatures
            id="features"
            aria-labelledby="features-title"
        >
            <Typography
                variant="h2"
                id="features-title"
            >
                {t("Home.sections.title")}
            </Typography>
            <ScGrid ref={reveal.ref}>
                {AREAS.map((area, i) => (
                    <ScItem
                        key={area}
                        $index={i}
                        data-revealed={reveal.revealed}
                    >
                        <Card as="article">
                            <Typography variant="h3">
                                {t(`Home.sections.${area}.title`)}
                            </Typography>
                            <Typography variant="bodySm">
                                {t(`Home.sections.${area}.subtitle`)}
                            </Typography>
                            <Typography variant="body">
                                {t(`Home.sections.${area}.description`)}
                            </Typography>
                        </Card>
                    </ScItem>
                ))}
            </ScGrid>
            <Button
                as="a"
                href={links.playground}
                size="lg"
            >
                {t("Home.cta.explore")}
            </Button>
        </ScFeatures>
    );
}
```

- [ ] **Step 4: Monta en la página**

En `app/page.tsx`, añade `<Features />` tras `<Story />`.

- [ ] **Step 5: Ejecuta, verifica y commit**

```bash
pnpm test && pnpm check && pnpm build
git add src app
git commit -m "feat(sections): Features con assembly escalonado y copia real del equipo"
```

---

### Task 11: Sección Contact (la invitación)

**Files:**

- Create: `src/components/sections/Contact/Contact.tsx`, `src/components/sections/Contact/Contact.test.tsx`
- Modify: `src/i18n/locales/{es,en}/home.json`, `app/page.tsx`

**Interfaces:**

- Consumes: `Button`, `links`, `Typography`, `Socials`.

**Por qué es la escena en calma (spec §2):** el espectáculo se retira del todo para que la petición sea imposible de no ver. **Sin escena 3D aquí.**

- [ ] **Step 1: Escribe el test que falla**

```tsx
// src/components/sections/Contact/Contact.test.tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Contact } from "./Contact";

describe("Contact", () => {
    it("ofrece un camino de contacto por email", () => {
        renderWithProviders(<Contact />);
        const email = screen.getByRole("link", {
            name: /email|correo|escribir/i,
        });
        expect(email.getAttribute("href")).toMatch(/^mailto:/);
    });

    it("tiene un h2 y no introduce una segunda h1", () => {
        const { container } = renderWithProviders(<Contact />);
        expect(container.querySelectorAll("h1")).toHaveLength(0);
        expect(container.querySelector("h2")).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/components/sections/Contact` Expected: FAIL — `Cannot find module './Contact'`

- [ ] **Step 3: Añade las claves i18n**

`es/home.json` → dentro de `Home`:

```json
"contact": {
  "title": "Hablemos",
  "body": "[por completar] Una línea de invitación al contacto.",
  "email": "Escribir un email"
}
```

`en/home.json` → dentro de `Home`:

```json
"contact": {
  "title": "Let's talk",
  "body": "[por completar] One line inviting contact.",
  "email": "Send an email"
}
```

- [ ] **Step 4: Implementa**

```tsx
// src/components/sections/Contact/Contact.tsx
"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Button } from "@/components/ui/Button/Button";
import { Socials } from "@/components/layout/Socials/Socials";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";

const ScContact = styled.section`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[5]};
    padding: ${({ theme }) => theme.data.space[9]}
        ${({ theme }) => theme.data.space[5]};
    max-width: ${({ theme }) => theme.data.grid.prose};
    margin-inline: auto;
    text-align: center;
`;

export function Contact(): ReactElement {
    const { t } = useTranslation("home");

    return (
        <ScContact
            id="contact"
            aria-labelledby="contact-title"
        >
            <Typography
                variant="h2"
                id="contact-title"
            >
                {t("Home.contact.title")}
            </Typography>
            <Typography variant="lead">{t("Home.contact.body")}</Typography>
            <Button
                as="a"
                href={links.email}
                size="lg"
            >
                {t("Home.contact.email")}
            </Button>
            <Socials />
        </ScContact>
    );
}
```

- [ ] **Step 5: Monta en la página**

En `app/page.tsx`, añade `<Contact />` tras `<Features />`.

- [ ] **Step 6: Ejecuta, verifica y commit**

```bash
pnpm test && pnpm check && pnpm build
git add src app
git commit -m "feat(sections): Contact, la escena en calma que cierra el viaje"
```

**Gate de Fase C:** las 4 escenas montadas, `pnpm check && pnpm test && pnpm build` en verde, **una sola `<h1>`** en la página.

---

# FASE D — Cámara, cursor y cierre

### Task 12: El Descenso — cámara ligada al scroll

**Files:**

- Create: `src/three/camera.ts`, `src/three/camera.test.ts`
- Modify: `src/three/Scene.tsx`

**Interfaces:**

- Produces: `applyCameraProgress(camera: THREE.PerspectiveCamera, progress: number): void`.

**Contrato (spec §8):** una **única** cámara. El scroll **nunca** se secuestra: si el usuario se detiene, la escena se detiene.

- [ ] **Step 1: Escribe el test que falla**

```ts
// src/three/camera.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyCameraProgress, START_Z, END_Z } from "./camera";

const cam = (): THREE.PerspectiveCamera =>
    new THREE.PerspectiveCamera(60, 1, 0.1, 100);

describe("camera", () => {
    it("en progreso 0 esta en la posicion de partida", () => {
        const c = cam();
        applyCameraProgress(c, 0);
        expect(c.position.z).toBeCloseTo(START_Z, 5);
    });

    it("en progreso 1 ha llegado al final del descenso", () => {
        const c = cam();
        applyCameraProgress(c, 1);
        expect(c.position.z).toBeCloseTo(END_Z, 5);
    });

    it("avanza hacia dentro de forma monotona", () => {
        const c = cam();
        applyCameraProgress(c, 0.25);
        const a = c.position.z;
        applyCameraProgress(c, 0.75);
        expect(c.position.z).toBeLessThan(a);
    });

    it("recorta valores fuera de rango en vez de extrapolar", () => {
        const c = cam();
        applyCameraProgress(c, 5);
        expect(c.position.z).toBeCloseTo(END_Z, 5);
        applyCameraProgress(c, -3);
        expect(c.position.z).toBeCloseTo(START_Z, 5);
    });
});
```

- [ ] **Step 2: Ejecuta y verifica que FALLA**

Run: `pnpm test src/three/camera.test.ts` Expected: FAIL — `Cannot find module './camera'`

- [ ] **Step 3: Implementa**

```ts
// src/three/camera.ts
import type * as THREE from "three";

export const START_Z = 6;
export const END_Z = -10;

/** Ease-out sobre el progreso: la entrada al vacío acelera y luego se asienta,
 *  en vez de avanzar de forma lineal y mecánica (spec §8, `camera settle`). */
function ease(t: number): number {
    return 1 - (1 - t) * (1 - t);
}

/**
 * Mapea el progreso de scroll (0→1) a la posición de la cámara.
 *
 * `scrubbed`: sin duración propia. El usuario controla el tiempo; esta función
 * es pura y sin estado, así que la escena solo avanza si el scroll avanza.
 */
export function applyCameraProgress(
    camera: THREE.PerspectiveCamera,
    progress: number,
): void {
    const p = ease(Math.max(0, Math.min(1, progress)));
    camera.position.z = START_Z + (END_Z - START_Z) * p;
}
```

- [ ] **Step 4: Cablea en la escena**

En `src/three/Scene.tsx`, añade el import y sustituye dentro de `tick`:

```ts
import { applyCameraProgress } from "./camera";
// …
const tick = (): void => {
    const p = progress.current ?? 0;
    applyCameraProgress(camera, p);
    stars.update(p);
    renderer.render(scene, camera);
    raf = window.requestAnimationFrame(tick);
};
```

Y sustituye la inicialización `camera.position.z = 6;` por `applyCameraProgress(camera, 0);`.

- [ ] **Step 5: Ejecuta, verifica y commit**

```bash
pnpm test src/three && pnpm check
git add src/three
git commit -m "feat(three): El Descenso - camara scrubbed sin scrolljacking"
```

---

### Task 13: Calibración de densidad y QA final de accesibilidad

**Files:**

- Modify: `src/three/starfield.ts` (constante de densidad)
- Create: `docs/superpowers/plans/notas-calibracion-3d.md`

**Esta task es medición y verificación, no código nuevo.** Cierra las entradas pendientes 3 y 4 del spec §19.

- [ ] **Step 1: Mide el coste en escritorio**

```bash
pnpm build && pnpm start
```

Abre la página, DevTools → Performance, graba 5 segundos haciendo scroll por el descenso. Anota: FPS medio, tiempo de scripting por frame, y si aparecen _long tasks_.

- [ ] **Step 2: Mide en móvil de gama media**

Con la misma build servida en red local, abre en un móvil real de gama media (o DevTools → _CPU throttling 4×_). Repite la medición.

- [ ] **Step 3: Ajusta la densidad según lo medido**

Si el móvil baja de 50 FPS, reduce `DEFAULT_STAR_COUNT`. Implementa el ajuste por rango en `starfield.ts`:

```ts
/** Densidad por capacidad. Valores fijados MIDIENDO, no a ojo (spec §19). */
export function starCountForViewport(width: number): number {
    if (width <= 640) return 500;
    if (width <= 1024) return 900;
    return DEFAULT_STAR_COUNT;
}
```

Y en `Scene.tsx`: `const stars = createStarfield(starCountForViewport(window.innerWidth));`

**Anota en `notas-calibracion-3d.md` los números medidos**: dispositivo, FPS antes y después, y el valor elegido. Sin cifras medidas, no cierres esta task.

- [ ] **Step 4: QA de reduced-motion (manual, no lo cubre la suite)**

Activa `prefers-reduced-motion` en el SO/navegador y verifica **una por una**:

- El ojo no respira ni sigue al cursor.
- El descenso no ocurre: se ve el póster.
- Los reveals de sección aparecen sin desplazamiento.
- El anillo de foco **sigue visible** al tabular.

- [ ] **Step 5: QA sin WebGL**

En DevTools, desactiva WebGL (o usa un navegador con WebGL deshabilitado). Verifica que se ve el póster y que **no falta ningún contenido**: toda la copia, los CTAs y los enlaces siguen ahí y son navegables por teclado.

- [ ] **Step 6: Verifica el contrato del LCP**

```bash
pnpm build
grep -c "three" out/index.html || echo "0 = three NO esta en el HTML inicial"
```

`three` no debe aparecer en el bundle inicial: se carga por import dinámico.

- [ ] **Step 7: Verifica las invariantes duras del sistema**

```bash
grep -rn "outline:\s*\(none\|0\)" src/ && echo "FALLO: hay outline:none" || echo "OK: sin outline:none"
grep -rn "data\.palette\." src/ --include=*.tsx | grep -v BackOrbs && echo "FALLO: primitivos fuera de BackOrbs" || echo "OK"
grep -c "<h1" out/index.html
```

Esperado: sin `outline:none`, sin primitivos fuera de `BackOrbs`, exactamente **1** `<h1>`.

- [ ] **Step 8: Gate final y commit**

```bash
pnpm check && pnpm test && pnpm build
git add src docs
git commit -m "perf(three): densidad de particulas calibrada + QA de a11y y fallbacks"
```

---

## Self-review (cobertura del spec)

| Sección del spec | Task(s) |
| --- | --- |
| §2 espina de 4 escenas | T5 (Hero), T9 (Story), T10 (Features), T11 (Contact) |
| §3 política de motor | T4 (ojo en CSS), T7-T8, T12 (Three.js solo en los beats) |
| §4 vocabulario de movimiento | consumido en todas; `scrubbed` en T3/T12, `lerp` en T2 |
| §5 Hero (breathing, field, stagger, cue) | T4 (breathing), T5 (stagger), T7-T8 (field) |
| §6 object animations | T4 (float/breathe), T8 (drift), T10 (assembly) |
| §7 hover y cursor | T2 (`usePointer`), T4 (gaze), T10 (item hover vía `Card interactive`) |
| §8 cámara scrubbed | T3, T12 |
| §9 transiciones de sección | T6 (eye→corner), T9/T10 (reveals) |
| §10 experiencia de carga | T7 (póster→live, fallback) |
| §11 product showcase | T10 |
| §12 CTA animations | T5 (aparición tras stagger), `press` ya vive en `Button` |
| §13 contrato de ingeniería | T7 (DPR, pausa, aria-hidden), T8 (un draw call) |
| §14 responsive | T13 (densidad por rango); el ojo ya re-ajusta por `clip-path` |
| §15 accesibilidad | T13 (QA), más las constraints globales en cada task |
| §16 estructura de archivos | mapa de archivos |
| §17 dependencias | T7 |
| §19 entradas pendientes | T1 (enlaces), T7 (póster), T13 (densidad), T9/T11 (copia con placeholder) |

**Huecos declarados (no son placeholders del plan, son decisiones conscientes):**

- **Magnetic CTA** (§7) queda **fuera**: es el efecto con menos retorno del catálogo y el que más riesgo de molestar tiene en trackpad. Si se quiere, es una task posterior aislada sobre `Button`.
- **Skeleton shimmer** (§10) queda fuera: no hay contenido async en la landing hoy; añadirlo sería resolver un problema que no existe (YAGNI).
- **Cursor-reactive field** (§7): el andamiaje está (`usePointer` + uniforms de la escena), pero el cableado se deja para después de calibrar el coste en T13. No tiene sentido añadir trabajo por frame antes de saber cuánto margen hay en móvil.
- **Copia real de Story y Contact:** el usuario la aporta; el plan entrega la estructura con placeholders visibles.

---

## Execution Handoff

**Plan completo y guardado en `docs/superpowers/plans/2026-07-25-3d-interaction-framework.md`. Dos opciones de ejecución:**

**1. Subagent-Driven (recomendado)** — despacho un subagente fresco por task, reviso entre tasks, iteración rápida.

**2. Inline Execution** — ejecuto las tasks en esta sesión con executing-plans, por lotes con checkpoints.

**¿Cuál prefieres?**
