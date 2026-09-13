# Story en tema oscuro: escena parallax "Cosmic Heart" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que la sección `Story` se muestre también en tema oscuro, con una escena de fondo parallax de 8 capas ("Cosmic Heart") en vez de la figura recortada + halo + tarjeta que usa el tema claro, y que `HomeSections` deje de ocultar TODAS las secciones en oscuro (ahora monta `Story` en los dos temas).

**Architecture:** `Story.tsx` se vuelve consciente del tema (`themeName` de `useTheme()`, `@/theme/ThemeProvider`): la rama clara es el componente actual sin cambios de comportamiento; la rama oscura monta un componente nuevo (`StoryCosmicHeart`) que pinta 8 `<img>` a sangre con `mix-blend-mode` aditivo y las anima con un hook de parallax nuevo (puntero + scroll + deriva en reposo), siguiendo el mismo patrón ya usado por `Eye`/`eye.parts.tsx` para el hero oscuro. El contenido textual (kicker/título/cuerpo/pilares) se comparte entre las dos ramas vía los mismos componentes styled, con el degradado del titular seleccionado por tema.

**Tech Stack:** Next.js 16 (export estático) + React 19 + TypeScript strict + styled-components 6 + Vitest/Testing Library + react-i18next.

## Global Constraints

- TypeScript strict; sin `any`; tipos de retorno explícitos en toda función exportada.
- Solo se anima `transform`/`opacity`; toda animación lleva guard de `prefers-reduced-motion` (o vive únicamente dentro de `@media (prefers-reduced-motion: no-preference)` cuando no hay nada que anular).
- Colores: tokens de tema (`theme.data.semantic.*`/`theme.data.palette.*`) salvo excepciones sancionadas de arte decorativo — igual que `EYE_SURFACE`/`STORY_HALO_GRADIENT` — que se copian VERBATIM de la fuente y se documentan con su origen.
- Sin strings de UI hardcodeados: toda copia sale de `t("Home.story.*")` (`i18n/locales/{es,en}/home.json`); ninguna clave nueva ni perdida en esta entrega.
- Tests: Vitest + Testing Library, sin snapshots, sin `getComputedStyle` para `@media` (jsdom no lo evalúa — atar los guards de reduced-motion por el TEXTO del CSS inyectado, patrón ya usado en `Story.test.tsx`).
- Gate de calidad: `pnpm check` (`typecheck` + `lint` + `check-format`) y `pnpm check-spelling` limpios; `pnpm test` completo en verde.
- Tras cambios de código: `graphify update .`.
- Commits temáticos en español, sin `--no-verify`.

---

## Task 0: Publicar los assets de la escena

**Files:**

- Create: `assets/story-cosmic-heart/manifest.json`
- Create: `assets/story-cosmic-heart/01-deep-space.webp` … `08-heart-core.webp` (8 archivos, copiados del zip)
- Create: `public/story/cosmic-heart/01-deep-space.webp` … `08-heart-core.webp` (nativos, 1672×941)
- Create: `public/story/cosmic-heart/01-deep-space-1024.webp` … `08-heart-core-1024.webp` (pista reducida, 1024×576)

**Interfaces:**

- Produces: las 16 rutas públicas bajo `/story/cosmic-heart/*.webp` que consumirá `storyCosmicHeart.layers.ts` (Task 2).

Los 8 WebP nativos y sus versiones a 1024px ya están generados en el directorio de trabajo de esta sesión (extraídos del zip `Story Dark Theme 1.zip` y redimensionados con Pillow). Este task solo los copia a su destino final en el repo.

- [ ] **Step 1: Copiar los 8 WebP nativos al origen archivado**

```bash
mkdir -p "assets/story-cosmic-heart"
cp "$SCRATCH_DIR/story-dark-zip/layers/"*.webp "assets/story-cosmic-heart/"
```

(`$SCRATCH_DIR` es el directorio de scratchpad de esta sesión — el agente que ejecute este plan debe sustituirlo por la ruta real donde extrajo el zip, o volver a extraer `Story Dark Theme 1.zip` con el mismo procedimiento: leer `parallax-demo.html`, localizar los 8 `data-d="…"` con `background-image:url(data:image/webp;base64,…)` y decodificar cada base64 a `layers/<nombre>.webp` según la tabla de profundidades de `layers.json`.)

- [ ] **Step 2: Escribir el manifest del origen archivado**

```json
{
    "name": "story-cosmic-heart-layers",
    "description": "Figura celestial con el pecho encendido, separada en 8 planos de profundidad para parallax 2.5D en el fondo de Story (tema oscuro). Particion de energia (las mascaras suman 1.0 por pixel); compuestas con blending aditivo sobre --void:#05030f reconstruyen el original.",
    "source": "Story Dark Theme 1.zip (Downloads), entregado por el usuario 2026-07-29. Fuente original citada en layers.json del zip: ChatGPT_Image_Jul_29__2026__02_54_33_PM_Cosmic_Heart_Guardian_in_Violet_Nebula.png.",
    "canvas": { "width": 1672, "height": 941 },
    "compositing": {
        "css": "cada capa mix-blend-mode: plus-lighter (fallback screen) sobre --void:#05030f"
    },
    "layers": [
        { "file": "01-deep-space.webp", "depth": 0.03, "share": 0.0533 },
        { "file": "02-nebula-back.webp", "depth": 0.09, "share": 0.4714 },
        { "file": "03-sparkles-far.webp", "depth": 0.13, "share": 0.029 },
        { "file": "04-geometry.webp", "depth": 0.19, "share": 0.0013 },
        { "file": "05-nebula-front.webp", "depth": 0.26, "share": 0.3386 },
        { "file": "06-sparkles-near.webp", "depth": 0.34, "share": 0.0335 },
        { "file": "07-figure.webp", "depth": 0.46, "share": 0.0593 },
        { "file": "08-heart-core.webp", "depth": 0.5, "share": 0.0137 }
    ]
}
```

Guardar como `assets/story-cosmic-heart/manifest.json`.

- [ ] **Step 3: Copiar las pistas desplegadas**

```bash
mkdir -p "public/story/cosmic-heart"
cp "$SCRATCH_DIR/story-dark-zip/layers/"*.webp "public/story/cosmic-heart/"
for f in "$SCRATCH_DIR/story-dark-zip/layers-1024/"*.webp; do
  name=$(basename "$f" .webp)
  cp "$f" "public/story/cosmic-heart/${name}-1024.webp"
done
```

- [ ] **Step 4: Verificar que los 16 archivos están y pesan lo esperado**

```bash
ls -la public/story/cosmic-heart/ | wc -l   # 16 archivos + . + .. = 18 lineas
du -sh public/story/cosmic-heart/
```

Expected: 16 ficheros `.webp` (8 nativos + 8 `-1024`), peso total ≈ 750 KB (556 KB nativo + 196 KB reducido).

- [ ] **Step 5: Commit**

```bash
git add assets/story-cosmic-heart public/story/cosmic-heart
git commit -m "assets(story): publica las 8 capas de la escena Cosmic Heart (tema oscuro)"
```

---

## Task 1: Hook de parallax de escena (`useSceneParallax`)

**Files:**

- Create: `src/hooks/useSceneParallax.ts`
- Test: `src/hooks/useSceneParallax.test.tsx`

**Interfaces:**

- Consumes: `usePointer` de `@/hooks/usePointer` (ya existe — `{ x: RefObject<number>, y: RefObject<number>, enabled: boolean }`).
- Produces: `useSceneParallax(sceneRef: RefObject<HTMLElement | null>, targets: readonly SceneParallaxTarget[], options: SceneParallaxOptions): void`, con `SceneParallaxTarget = { ref: RefObject<HTMLElement | null>; depth: number }` y `SceneParallaxOptions = { pointerAmp: {x:number;y:number}; scrollAmp: number; overscan: number; driftAmp?: {x:number;y:number}; idleMs?: number }`. `StoryCosmicHeart.tsx` (Task 3) importa estos tres tipos/función.

- [ ] **Step 1: Escribir el test que falla (arranque/apagado bajo reduced-motion)**

```typescript
// src/hooks/useSceneParallax.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSceneParallax } from "./useSceneParallax";
import type { SceneParallaxTarget } from "./useSceneParallax";

function stubMatchMedia(reducedMatches: boolean): void {
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
            matches: query.includes("prefers-reduced-motion")
                ? reducedMatches
                : false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

function sceneOf(el: HTMLElement) {
    return { current: el };
}

function targetOf(el: HTMLElement, depth: number): SceneParallaxTarget {
    return { ref: { current: el }, depth };
}

const OPTS = { pointerAmp: { x: 20, y: 12 }, scrollAmp: 60, overscan: 1.06 };

beforeEach(() => stubMatchMedia(false));
afterEach(() => vi.unstubAllGlobals());

describe("useSceneParallax", () => {
    it("bajo reduced-motion no arranca ningun rAF", () => {
        stubMatchMedia(true);
        const raf = vi.fn().mockReturnValue(1);
        vi.stubGlobal("requestAnimationFrame", raf);
        vi.stubGlobal("cancelAnimationFrame", vi.fn());

        const scene = document.createElement("div");
        const targets = [targetOf(document.createElement("div"), 0.5)];
        renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

        expect(raf).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
pnpm test src/hooks/useSceneParallax.test.tsx
```

Expected: FAIL — `Cannot find module './useSceneParallax'`.

- [ ] **Step 3: Implementación completa**

```typescript
// src/hooks/useSceneParallax.ts
"use client";
import { useEffect, useRef, type RefObject } from "react";
import { usePointer } from "@/hooks/usePointer";

export interface SceneParallaxTarget {
    /** Ref al elemento que recibe el transform. */
    readonly ref: RefObject<HTMLElement | null>;
    /** 0 = plano de fondo inmovil, 1 = plano mas cercano. */
    readonly depth: number;
}

export interface SceneParallaxAmplitude {
    readonly x: number;
    readonly y: number;
}

export interface SceneParallaxOptions {
    /** Amplitud del parallax de puntero en px, a profundidad 1. */
    readonly pointerAmp: SceneParallaxAmplitude;
    /** Amplitud del parallax de scroll en px, a profundidad 1. */
    readonly scrollAmp: number;
    /** Escala base comun a todas las capas (evita bordes vacios al desplazar). */
    readonly overscan: number;
    /** Amplitud de la deriva automatica cuando el puntero lleva quieto `idleMs`. */
    readonly driftAmp?: SceneParallaxAmplitude;
    /** Milisegundos sin movimiento de puntero antes de que la deriva tome el control. */
    readonly idleMs?: number;
}

const DEFAULT_DRIFT_AMP: SceneParallaxAmplitude = { x: 0.55, y: 0.35 };
const DEFAULT_IDLE_MS = 2200;

/**
 * Parallax de puntero + scroll + deriva en reposo para UNA escena a sangre
 * (`StoryCosmicHeart`, spec 2026-07-29 §5). Distinto de `useParallaxLayers`
 * (Eye/Aura, que solo sigue al puntero): aqui hace falta ademas un termino de
 * scroll y una deriva lenta cuando nadie toca el puntero, asi que se declara
 * un hook nuevo en vez de anadir features a uno compartido que ya sirve al
 * hero -- tocar `useParallaxLayers` arriesgaria una regresion en Eye/Aura por
 * una necesidad que no es la suya.
 *
 * Reutiliza `usePointer()` para la coordenada de puntero (lerp, se apaga solo
 * en tactil) pero NO delega en su `enabled` la decision de arrancar este
 * hook: ese flag mezcla "tactil" con "reduced-motion", y aqui el scroll/deriva
 * SI deben seguir vivos en tactil (no hay puntero que seguir, pero si hay
 * scroll). El unico apagado total de este hook es `prefers-reduced-motion:
 * reduce`, comprobado con su propio listener reactivo (mismo patron que
 * `usePointer`): al apagarse, cada objetivo vuelve a `transform: ""`, dejando
 * que la regla CSS estatica (`scale(overscan)`, sin traslacion) sea la unica
 * en efecto -- el estado de reposo que pide D6 del spec.
 */
export function useSceneParallax(
    sceneRef: RefObject<HTMLElement | null>,
    targets: readonly SceneParallaxTarget[],
    options: SceneParallaxOptions,
): void {
    const pointer = usePointer();
    const { x: pointerX, y: pointerY } = pointer;

    const targetsRef = useRef(targets);
    const optionsRef = useRef(options);
    useEffect(() => {
        targetsRef.current = targets;
        optionsRef.current = options;
    });

    const lastMoveRef = useRef(0);

    useEffect(() => {
        const reducedQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );
        let raf = 0;
        let running = false;
        let scrollProgress = 0;

        const onPointerMove = (): void => {
            lastMoveRef.current = performance.now();
        };

        const onScroll = (): void => {
            const el = sceneRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            scrollProgress = Math.max(
                -1,
                Math.min(1, -rect.top / window.innerHeight),
            );
        };

        const tick = (now: number): void => {
            const opts = optionsRef.current;
            const drift = opts.driftAmp ?? DEFAULT_DRIFT_AMP;
            const idleMs = opts.idleMs ?? DEFAULT_IDLE_MS;
            const idle = now - lastMoveRef.current > idleMs;

            const px = idle ? Math.sin(now / 7000) * drift.x : pointerX.current;
            const py = idle ? Math.cos(now / 9500) * drift.y : pointerY.current;

            for (const target of targetsRef.current) {
                const el = target.ref.current;
                if (!el) continue;
                const x = px * opts.pointerAmp.x * target.depth;
                const y =
                    py * opts.pointerAmp.y * target.depth +
                    scrollProgress * opts.scrollAmp * target.depth;
                const scale =
                    opts.overscan + scrollProgress * target.depth * 0.05;
                el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
            }
            raf = window.requestAnimationFrame(tick);
        };

        const start = (): void => {
            if (running) return;
            running = true;
            lastMoveRef.current = performance.now();
            window.addEventListener("pointermove", onPointerMove, {
                passive: true,
            });
            window.addEventListener("scroll", onScroll, { passive: true });
            onScroll();
            raf = window.requestAnimationFrame(tick);
        };

        const stop = (): void => {
            if (!running) return;
            running = false;
            window.cancelAnimationFrame(raf);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("scroll", onScroll);
            for (const target of targetsRef.current) {
                const el = target.ref.current;
                if (el) el.style.transform = "";
            }
        };

        const evaluate = (): void => {
            if (reducedQuery.matches) stop();
            else start();
        };

        evaluate();
        reducedQuery.addEventListener("change", evaluate);

        return () => {
            reducedQuery.removeEventListener("change", evaluate);
            stop();
        };
    }, [pointerX, pointerY, sceneRef]);
}
```

- [ ] **Step 4: Ejecutar y confirmar que el Step 1 pasa**

```bash
pnpm test src/hooks/useSceneParallax.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Añadir el resto de la suite (arranque, transform combinado, deriva, apagado en caliente)**

Añadir estos `it(...)` dentro del mismo `describe("useSceneParallax", ...)`, después del ya escrito:

```typescript
it("arranca un rAF al montar y lo cancela al desmontar", () => {
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const scene = document.createElement("div");
    const targets = [targetOf(document.createElement("div"), 0.5)];
    const { unmount } = renderHook(() =>
        useSceneParallax(sceneOf(scene), targets, OPTS),
    );
    expect(raf).toHaveBeenCalled();

    unmount();
    expect(caf).toHaveBeenCalled();
});

it("escribe transform con la escala de overscan incluso sin movimiento", () => {
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
        "requestAnimationFrame",
        (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 0.5)];
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);

    expect(layer.style.transform).toContain("scale(1.06");
});

it("tras superar idleMs sin movimiento de puntero, usa la deriva en vez del ultimo target de puntero", () => {
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
        "requestAnimationFrame",
        (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

    // Primer frame, timestamp temprano: dentro de idleMs, sin deriva.
    let batch = pending;
    pending = [];
    for (const cb of batch) cb(100);
    const earlyTransform = layer.style.transform;

    // Un frame muy posterior (> 2200ms desde el arranque): la deriva toma
    // el control, y sin() de un argumento distinto produce un desplazamiento
    // X distinto del que dejo el frame temprano (que partia de puntero en 0).
    batch = pending;
    pending = [];
    for (const cb of batch) cb(100 + 2300);

    expect(layer.style.transform).not.toBe(earlyTransform);
});

it("al pasar a reduced-motion en caliente, congela las capas (transform vacio)", () => {
    let changeHandler: (() => void) | undefined;
    let reduced = false;
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
            matches: query.includes("prefers-reduced-motion") ? reduced : false,
            media: query,
            addEventListener: (_: string, handler: () => void) => {
                if (query.includes("prefers-reduced-motion"))
                    changeHandler = handler;
            },
            removeEventListener: vi.fn(),
        })),
    );
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal(
        "requestAnimationFrame",
        (cb: FrameRequestCallback) => (pending.push(cb), pending.length),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    scene.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const layer = document.createElement("div");
    const targets = [targetOf(layer, 1)];
    renderHook(() => useSceneParallax(sceneOf(scene), targets, OPTS));

    const batch = pending;
    pending = [];
    for (const cb of batch) cb(0);
    expect(layer.style.transform).not.toBe("");

    reduced = true;
    act(() => changeHandler?.());
    expect(layer.style.transform).toBe("");
});
```

- [ ] **Step 6: Ejecutar la suite completa y confirmar que pasa**

```bash
pnpm test src/hooks/useSceneParallax.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSceneParallax.ts src/hooks/useSceneParallax.test.tsx
git commit -m "feat(hooks): useSceneParallax (puntero + scroll + deriva, freeze bajo reduced-motion)"
```

---

## Task 2: Tabla de datos de la escena (`storyCosmicHeart.layers.ts`)

**Files:**

- Create: `src/components/storyCosmicHeart/storyCosmicHeart.layers.ts`
- Test: `src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts`

**Interfaces:**

- Produces: `STORY_COSMIC_HEART_LAYERS: readonly StoryCosmicHeartLayer[]` (con `StoryCosmicHeartLayer = { part: string; src: string; srcSmall: string; depth: number; glow?: "core" }`), `STORY_COSMIC_HEART_SIZES: string`, `STORY_COSMIC_HEART_OVERSCAN: number`, `STORY_COSMIC_HEART_VOID: string`, `STORY_COSMIC_HEART_POINTER_AMP: {x:number;y:number}`, `STORY_COSMIC_HEART_SCROLL_AMP: number`. Consumidos por `StoryCosmicHeart.tsx` (Task 4) y `storyCosmicHeart.parts.tsx` (Task 3).

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts
import { describe, it, expect } from "vitest";
import {
    STORY_COSMIC_HEART_LAYERS,
    STORY_COSMIC_HEART_VOID,
} from "./storyCosmicHeart.layers";

describe("storyCosmicHeart.layers", () => {
    it("tiene las 8 capas, de fondo a frente, con el nucleo del corazon al final", () => {
        expect(STORY_COSMIC_HEART_LAYERS).toHaveLength(8);
        const depths = STORY_COSMIC_HEART_LAYERS.map((l) => l.depth);
        for (let i = 1; i < depths.length; i += 1) {
            expect(depths[i]).toBeGreaterThan(depths[i - 1]);
        }
        expect(STORY_COSMIC_HEART_LAYERS.at(-1)?.part).toBe("heart-core");
        expect(STORY_COSMIC_HEART_LAYERS.at(-1)?.glow).toBe("core");
    });

    it("cada capa publica su pista nativa y su pista reducida bajo /story/cosmic-heart/", () => {
        for (const layer of STORY_COSMIC_HEART_LAYERS) {
            expect(layer.src).toMatch(/^\/story\/cosmic-heart\/.+\.webp$/);
            expect(layer.srcSmall).toMatch(
                /^\/story\/cosmic-heart\/.+-1024\.webp$/,
            );
        }
    });

    it("STORY_COSMIC_HEART_VOID es el negro-violeta verbatim del paquete original", () => {
        expect(STORY_COSMIC_HEART_VOID).toBe("#05030f");
    });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
pnpm test src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementación completa**

```typescript
// src/components/storyCosmicHeart/storyCosmicHeart.layers.ts
/**
 * Tabla de capas de la escena "Cosmic Heart" (fondo de Story, tema oscuro).
 * Datos (orden, profundidad de parallax) medidos y documentados en
 * `assets/story-cosmic-heart/manifest.json`, junto a los WebP fuente.
 *
 * Las 8 capas son una particion de energia (sus mascaras suman 1.0 por
 * pixel, ver el manifest): compuestas con blending ADITIVO sobre
 * `STORY_COSMIC_HEART_VOID` reconstruyen la imagen original. Igual que
 * `eye.layers.ts`, se declara aqui en TypeScript en vez de leer el manifest
 * en tiempo de ejecucion.
 */

export interface StoryCosmicHeartLayer {
    /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
    readonly part: string;
    /** Ruta publica del WebP a ancho nativo (1672px). */
    readonly src: string;
    /** Variante de 1024px para viewports estrechos. */
    readonly srcSmall: string;
    /** Profundidad de parallax, 0 = plano de fondo, 1 = plano mas cercano. */
    readonly depth: number;
    /** Pulso lento de opacidad. `undefined` = capa quieta salvo el parallax. */
    readonly glow?: "core";
}

export const STORY_COSMIC_HEART_LAYERS: readonly StoryCosmicHeartLayer[] = [
    {
        part: "deep-space",
        src: "/story/cosmic-heart/01-deep-space.webp",
        srcSmall: "/story/cosmic-heart/01-deep-space-1024.webp",
        depth: 0.03,
    },
    {
        part: "nebula-back",
        src: "/story/cosmic-heart/02-nebula-back.webp",
        srcSmall: "/story/cosmic-heart/02-nebula-back-1024.webp",
        depth: 0.09,
    },
    {
        part: "sparkles-far",
        src: "/story/cosmic-heart/03-sparkles-far.webp",
        srcSmall: "/story/cosmic-heart/03-sparkles-far-1024.webp",
        depth: 0.13,
    },
    {
        part: "geometry",
        src: "/story/cosmic-heart/04-geometry.webp",
        srcSmall: "/story/cosmic-heart/04-geometry-1024.webp",
        depth: 0.19,
    },
    {
        part: "nebula-front",
        src: "/story/cosmic-heart/05-nebula-front.webp",
        srcSmall: "/story/cosmic-heart/05-nebula-front-1024.webp",
        depth: 0.26,
    },
    {
        part: "sparkles-near",
        src: "/story/cosmic-heart/06-sparkles-near.webp",
        srcSmall: "/story/cosmic-heart/06-sparkles-near-1024.webp",
        depth: 0.34,
    },
    {
        part: "figure",
        src: "/story/cosmic-heart/07-figure.webp",
        srcSmall: "/story/cosmic-heart/07-figure-1024.webp",
        depth: 0.46,
    },
    {
        part: "heart-core",
        src: "/story/cosmic-heart/08-heart-core.webp",
        srcSmall: "/story/cosmic-heart/08-heart-core-1024.webp",
        depth: 0.5,
        glow: "core",
    },
] as const;

/**
 * `sizes` de las capas: la escena llena el ancho del contenido de Story,
 * tope `grid.containerMax` (1200px) — no el viewport completo — asi que se
 * declara ese tope en vez de `100vw` a secas (mismo razonamiento que
 * `EYE_SIZES`/`STORY_FIGURE_SIZES`: pedir de mas en desktop ancho no
 * aporta nitidez, la caja nunca crece mas alla de 1200px).
 */
export const STORY_COSMIC_HEART_SIZES = "(min-width: 1200px) 1200px, 100vw";

/** Escala base comun a las 8 capas: evita bordes vacios al desplazar. */
export const STORY_COSMIC_HEART_OVERSCAN = 1.06;

/**
 * Negro-violeta del lienzo (`--void` del paquete original, `parallax-demo.html`
 * §`:root`). Se copia VERBATIM en vez de convertir a `oklch()` (mismo criterio
 * que D10 de `2026-07-28-landing-v2-secciones-design.md`): un redondeo de
 * conversion desviaria el resultado del aditivo, calibrado contra este negro
 * exacto. Excepcion de color sancionada — igual que `EYE_SURFACE` — porque
 * esta escena es puramente decorativa y su identidad no cambia con el tema
 * (solo se monta en oscuro).
 */
export const STORY_COSMIC_HEART_VOID = "#05030f";

/** Amplitud del parallax de puntero en px, a profundidad 1. */
export const STORY_COSMIC_HEART_POINTER_AMP = { x: 22, y: 13 } as const;

/** Amplitud del parallax de scroll en px, a profundidad 1. */
export const STORY_COSMIC_HEART_SCROLL_AMP = 70;
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
pnpm test src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/storyCosmicHeart/storyCosmicHeart.layers.ts src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts
git commit -m "feat(story): tabla de capas de la escena Cosmic Heart"
```

---

## Task 3: Piezas styled de la escena (`storyCosmicHeart.parts.tsx`)

**Files:**

- Create: `src/components/storyCosmicHeart/storyCosmicHeart.parts.tsx`

**Interfaces:**

- Consumes: `STORY_COSMIC_HEART_OVERSCAN`, `STORY_COSMIC_HEART_VOID` de `./storyCosmicHeart.layers` (Task 2).
- Produces: `ScScene`, `ScVoid`, `ScLayer` (`styled.img<{ $glow?: "core" }>`), `ScVignette`. Consumidos por `StoryCosmicHeart.tsx` (Task 4).

Sin test dedicado — se verifica a través de `StoryCosmicHeart.test.tsx` (Task 4), mismo criterio que `eye.parts.tsx` (sin test propio, cubierto por `Eye.test.tsx`).

- [ ] **Step 1: Implementación completa**

```tsx
// src/components/storyCosmicHeart/storyCosmicHeart.parts.tsx
"use client";
import styled, { css, keyframes } from "styled-components";
import {
    STORY_COSMIC_HEART_OVERSCAN,
    STORY_COSMIC_HEART_VOID,
} from "./storyCosmicHeart.layers";

/*
 * Marco de la escena: `isolation: isolate` la convierte en el grupo de
 * blending -- sin el, el `plus-lighter` de las capas se sumaria contra el
 * fondo de la pagina y desbordaria luz fuera de Story (mismo motivo que
 * `ScFrame` en eye.parts.tsx).
 */
export const ScScene = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    isolation: isolate;
`;

/*
 * Negro-violeta de base: el aditivo suma sobre lo que haya detras, y este
 * literal es el mismo `STORY_COSMIC_HEART_VOID` contra el que se calibro el
 * arte (excepcion de color sancionada, ver su docblock en
 * storyCosmicHeart.layers.ts).
 */
export const ScVoid = styled.div`
    position: absolute;
    inset: 0;
    background-color: ${STORY_COSMIC_HEART_VOID};
`;

const heartBeat = keyframes`
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
`;

/*
 * Una capa. El parallax (rAF de `useSceneParallax`) y el `mix-blend-mode`
 * viven en el MISMO elemento a proposito -- cualquier envoltorio con
 * `transform` crearia su propio contexto de apilamiento y aislaria el
 * blending de su contenido (mismo motivo documentado en `ScLayer` de
 * eye.parts.tsx). El pulso del nucleo anima `opacity`, no `transform`: esa
 * propiedad la escribe el rAF del parallax frame a frame, y una animacion
 * CSS sobre la misma propiedad se pisaria con el.
 */
export const ScLayer = styled.img<{ $glow?: "core" }>`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
    transform: scale(${STORY_COSMIC_HEART_OVERSCAN});
    will-change: transform;

    /* screen es el fallback practicamente indistinguible sobre negro;
     plus-lighter es la suma exacta con la que se extrajeron las mascaras
     (mismo criterio que ScLayer en eye.parts.tsx). */
    mix-blend-mode: screen;
    @supports (mix-blend-mode: plus-lighter) {
        mix-blend-mode: plus-lighter;
    }

    ${({ $glow }) =>
        $glow === "core" &&
        css`
            @media (prefers-reduced-motion: no-preference) {
                animation: ${heartBeat} 6.5s ease-in-out infinite;
            }
        `}
`;

/*
 * Viñeta de legibilidad: oscurece la escena bajo el contenido de texto sin
 * tocar el grupo de blending de las capas (vive FUERA de ScScene en el JSX
 * de StoryCosmicHeart, mismo motivo que ScScrim en eye.parts.tsx -- dentro
 * heredaria isolation:isolate y el aditivo se la comeria en vez de
 * oscurecer). El tope opaco es el MISMO literal que ScVoid (continuidad de
 * color, mismo criterio que el sellado Hero->Story de EYE_SURFACE).
 */
export const ScVignette = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        linear-gradient(
            to right,
            ${STORY_COSMIC_HEART_VOID}f2 0%,
            ${STORY_COSMIC_HEART_VOID}00 60%
        ),
        linear-gradient(
            to top,
            ${STORY_COSMIC_HEART_VOID}f2 0%,
            ${STORY_COSMIC_HEART_VOID}00 45%
        );
`;
```

- [ ] **Step 2: Verificar que compila (typecheck, sin test propio en este paso)**

```bash
pnpm typecheck
```

Expected: sin errores nuevos (el módulo aún no se importa desde ningún sitio, pero debe compilar solo).

- [ ] **Step 3: Commit**

```bash
git add src/components/storyCosmicHeart/storyCosmicHeart.parts.tsx
git commit -m "feat(story): piezas styled de la escena Cosmic Heart"
```

---

## Task 4: Componente `StoryCosmicHeart`

**Files:**

- Create: `src/components/storyCosmicHeart/StoryCosmicHeart.tsx`
- Test: `src/components/storyCosmicHeart/StoryCosmicHeart.test.tsx`

**Interfaces:**

- Consumes: `useSceneParallax` (Task 1), `STORY_COSMIC_HEART_LAYERS`/`STORY_COSMIC_HEART_POINTER_AMP`/`STORY_COSMIC_HEART_SCROLL_AMP`/`STORY_COSMIC_HEART_OVERSCAN`/`STORY_COSMIC_HEART_SIZES` (Task 2), `ScScene`/`ScVoid`/`ScLayer`/`ScVignette` (Task 3).
- Produces: `export function StoryCosmicHeart(): ReactElement`. Consumido por `Story.tsx` (Task 6).

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/components/storyCosmicHeart/StoryCosmicHeart.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { StoryCosmicHeart } from "./StoryCosmicHeart";
import { STORY_COSMIC_HEART_LAYERS } from "./storyCosmicHeart.layers";

function stubMatchMedia(): void {
    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

beforeEach(stubMatchMedia);
afterEach(() => vi.unstubAllGlobals());

describe("StoryCosmicHeart", () => {
    it("renderiza las 8 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
        const { container } = render(<StoryCosmicHeart />);
        const root = container.firstElementChild as HTMLElement;
        expect(root).toHaveAttribute("aria-hidden", "true");

        const imgs = container.querySelectorAll("img");
        expect(imgs).toHaveLength(STORY_COSMIC_HEART_LAYERS.length);
        imgs.forEach((img, i) => {
            const layer = STORY_COSMIC_HEART_LAYERS[i];
            expect(img).toHaveAttribute("alt", "");
            expect(img).toHaveAttribute("loading", "lazy");
            expect(img).toHaveAttribute("decoding", "async");
            expect(img).toHaveAttribute("src", layer.src);
            expect(img.getAttribute("srcset")).toBe(
                `${layer.srcSmall} 1024w, ${layer.src} 1672w`,
            );
            expect(img).toHaveAttribute("data-part", layer.part);
        });
    });

    it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
        const { container } = render(<StoryCosmicHeart />);
        container
            .querySelectorAll("img")
            .forEach((img) => expect(img).not.toHaveAccessibleName());
    });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
pnpm test src/components/storyCosmicHeart/StoryCosmicHeart.test.tsx
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementación completa**

```tsx
// src/components/storyCosmicHeart/StoryCosmicHeart.tsx
"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
    useSceneParallax,
    type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
    STORY_COSMIC_HEART_LAYERS,
    STORY_COSMIC_HEART_OVERSCAN,
    STORY_COSMIC_HEART_POINTER_AMP,
    STORY_COSMIC_HEART_SCROLL_AMP,
    STORY_COSMIC_HEART_SIZES,
} from "./storyCosmicHeart.layers";
import { ScLayer, ScScene, ScVignette, ScVoid } from "./storyCosmicHeart.parts";

/**
 * Fondo a sangre de Story en tema oscuro: 8 capas WebP con blending aditivo
 * (particion documentada en `assets/story-cosmic-heart/manifest.json`),
 * animadas con parallax de puntero + scroll + deriva en reposo
 * (`useSceneParallax`). Puramente decorativo (`aria-hidden`): el contenido
 * real de la seccion (kicker/titulo/pilares) vive en `Story.tsx`, superpuesto
 * encima de esta escena -- mismo criterio que `Eye` en el hero.
 */
export function StoryCosmicHeart(): ReactElement {
    const sceneRef = useRef<HTMLDivElement>(null);

    // Un ref por capa, no un callback-ref con array compartido: mismo patron
    // que `Eye.tsx` (useMemo con deps `[]` da identidad estable sin leer
    // `.current` durante el render, lo que violaria `react-hooks/refs`).
    const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
        () => STORY_COSMIC_HEART_LAYERS.map(() => ({ current: null })),
        [],
    );

    const targets: SceneParallaxTarget[] = STORY_COSMIC_HEART_LAYERS.map(
        (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
    );

    useSceneParallax(sceneRef, targets, {
        pointerAmp: STORY_COSMIC_HEART_POINTER_AMP,
        scrollAmp: STORY_COSMIC_HEART_SCROLL_AMP,
        overscan: STORY_COSMIC_HEART_OVERSCAN,
    });

    return (
        <ScScene
            ref={sceneRef}
            aria-hidden="true"
        >
            <ScVoid />
            {STORY_COSMIC_HEART_LAYERS.map((layer, index) => (
                <ScLayer
                    key={layer.part}
                    ref={layerRefs[index]}
                    data-part={layer.part}
                    src={layer.src}
                    srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1672w`}
                    sizes={STORY_COSMIC_HEART_SIZES}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    $glow={layer.glow}
                />
            ))}
            <ScVignette />
        </ScScene>
    );
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

```bash
pnpm test src/components/storyCosmicHeart/StoryCosmicHeart.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/storyCosmicHeart/StoryCosmicHeart.tsx src/components/storyCosmicHeart/StoryCosmicHeart.test.tsx
git commit -m "feat(story): componente StoryCosmicHeart (escena de fondo, tema oscuro)"
```

---

## Task 5: Degradado del titular por tema en `story.layers.ts`

**Files:**

- Modify: `src/components/sections/Story/story.layers.ts`

**Interfaces:**

- Produces: `STORY_ACCENT_GRADIENT_LIGHT` (antes `STORY_ACCENT_GRADIENT`, mismo valor) y `STORY_ACCENT_GRADIENT_DARK` (nuevo). Consumidos por `Story.tsx` (Task 6).

No hay test dedicado para este archivo hoy (`story.layers.ts` no tiene `.test.ts` propio); el cambio se verifica indirectamente por los tests de `Story.tsx` (Task 6), que sí referencian el degradado a través del DOM.

- [ ] **Step 1: Renombrar la constante y añadir la variante oscura**

En `src/components/sections/Story/story.layers.ts`, sustituir el bloque:

```typescript
/**
 * Degradado de texto de "to creation." (mockup L78): tres paradas propias
 * (`235`, `255`, `290`), distintas de los hue de `palette.primary`/
 * `palette.secondary`. A diferencia del titular del hero (`heroGradient`,
 * `BrandName.tsx`), este NO anima — el mockup no le aplica `vtiGradientShift`
 * a este span, solo al `ToInfinite` del hero — así que se declara estático.
 */
export const STORY_ACCENT_GRADIENT =
    "linear-gradient(110deg, oklch(0.56 0.14 235), oklch(0.7 0.15 255), oklch(0.72 0.15 290))";
```

por:

```typescript
/**
 * Degradado de texto de "to creation." (mockup L78, tema claro): tres
 * paradas propias (`235`, `255`, `290`), distintas de los hue de
 * `palette.primary`/`palette.secondary`. A diferencia del titular del hero
 * (`heroGradient`, `BrandName.tsx`), este NO anima — el mockup no le aplica
 * `vtiGradientShift` a este span, solo al `ToInfinite` del hero — así que se
 * declara estático. Renombrado con sufijo `_LIGHT` (2026-07-29) al añadir la
 * variante oscura de abajo — incluida en la rama clara de `Story.tsx`.
 */
export const STORY_ACCENT_GRADIENT_LIGHT =
    "linear-gradient(110deg, oklch(0.56 0.14 235), oklch(0.7 0.15 255), oklch(0.72 0.15 290))";

/**
 * Variante oscura del degradado de texto (spec 2026-07-29 D10): MISMA familia
 * de hue (235/255/290) que la versión clara, con luminosidad mucho mayor
 * (0.78–0.86 en vez de 0.56–0.72) para que el `background-clip: text` siga
 * siendo legible sobre el negro-violeta de `StoryCosmicHeart`
 * (`STORY_COSMIC_HEART_VOID`, `#05030f`). No hay mockup oscuro de esta
 * sección — el spec señala explícitamente que estas paradas se verifican a
 * ojo en el paso de verificación en navegador, no con un contraste medido
 * (el helper `contrast.ts` del repo solo resuelve colores planos, no
 * degradados de texto).
 */
export const STORY_ACCENT_GRADIENT_DARK =
    "linear-gradient(110deg, oklch(0.78 0.13 235), oklch(0.82 0.13 255), oklch(0.86 0.12 290))";
```

- [ ] **Step 2: Verificar que no queda ninguna referencia al nombre viejo**

```bash
grep -rn "STORY_ACCENT_GRADIENT[^_]" src/
```

Expected: sin resultados (todas las referencias deben llevar el sufijo `_LIGHT` o `_DARK`; el propio `Story.tsx` se corrige en el Task 6, así que en este punto SÍ puede fallar la compilación de `Story.tsx` hasta completar ese task — es un estado intermedio esperado, no se ejecuta `pnpm typecheck` completo hasta el final del Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/Story/story.layers.ts
git commit -m "refactor(story): separa el degradado del titular en variante clara/oscura"
```

---

## Task 6: `Story.tsx` consciente del tema

**Files:**

- Modify: `src/components/sections/Story/Story.tsx`
- Modify: `src/components/sections/Story/Story.test.tsx`

**Interfaces:**

- Consumes: `useTheme` de `@/theme/ThemeProvider` (`{ themeName: "light" | "dark" }`), `StoryCosmicHeart` (Task 4), `STORY_ACCENT_GRADIENT_LIGHT`/`STORY_ACCENT_GRADIENT_DARK` (Task 5).
- Produces: `Story.tsx` sigue exportando `export function Story(): ReactElement` sin cambiar su firma — el cambio es interno.

- [ ] **Step 1: Escribir los tests que fallan (rama oscura)**

Añadir al final de `src/components/sections/Story/Story.test.tsx` (después del último `describe` existente), con sus imports añadidos arriba del archivo (`import { waitFor } from "@testing-library/react";` ya viene incluido si se usa el mismo import de `renderWithProviders`/`screen` — añadir `waitFor` a esa misma línea de import):

```typescript
function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("Story en tema oscuro", () => {
  beforeEach(() => {
    stubMatchMedia();
    window.localStorage.setItem("vti-theme", "dark");
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("monta la escena Cosmic Heart (8 capas decorativas) en vez de la figura/tarjeta de claro", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("img")).toHaveLength(8);
    });
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });

  it("sigue mostrando el kicker, el titulo y los 4 pilares con el mismo i18n que en claro", async () => {
    renderWithProviders(<Story />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.story.kicker)).toBeInTheDocument();
    });
    expect(
      screen.getByText(esHome.Home.story.pillars.learn.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(esHome.Home.story.pillars.practice.body),
    ).toBeInTheDocument();
  });

  it("la nota se muestra como texto simple, sin la tarjeta ni el sparkle de claro", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(screen.getByText(esHome.Home.story.note)).toBeInTheDocument();
    });
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("no hay ninguna imagen con alt de i18n (figureAlt es cosa de la rama clara)", async () => {
    const { container } = renderWithProviders(<Story />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    expect(
      container.querySelector(`img[alt="${esHome.Home.story.figureAlt}"]`),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que fallan**

```bash
pnpm test src/components/sections/Story/Story.test.tsx
```

Expected: FAIL — en oscuro, `Story` sigue montando la rama clara (Task 6 aún no implementada) o el import de `STORY_ACCENT_GRADIENT_LIGHT`/`_DARK` rompe la compilación (según el estado dejado por el Task 5).

- [ ] **Step 3: Reescribir `Story.tsx` completo**

Reemplazar el archivo entero por:

```tsx
"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes, type DefaultTheme } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useTheme } from "@/theme/ThemeProvider";
import { StoryCosmicHeart } from "@/components/storyCosmicHeart/StoryCosmicHeart";
import {
    STORY_ACCENT_GRADIENT_DARK,
    STORY_ACCENT_GRADIENT_LIGHT,
    STORY_CARD_BG,
    STORY_CARD_BORDER,
    STORY_CARD_FLOAT_MS,
    STORY_CARD_SHADOW,
    STORY_FIGURE_ASPECT,
    STORY_FIGURE_FLOAT_MS,
    STORY_FIGURE_HEIGHT,
    STORY_FIGURE_SIZES,
    STORY_FIGURE_WIDTH,
    STORY_FLOAT_AMPLITUDE,
    STORY_HALO_GRADIENT,
    STORY_HALO_INSET,
} from "./story.layers";

/*
 * Story ("Why VoidToInfinite?"). Rama CLARA (mockup `Landing v2.dc.html`
 * L70-101): grid figura+contenido, sin cambios de comportamiento respecto a
 * la reescritura de 2026-07-28 (D3/D4 de ese spec).
 *
 * Rama OSCURA (spec 2026-07-29): no hay mockup oscuro de esta seccion. En
 * vez de la figura recortada + halo + tarjeta flotante, el fondo es la
 * escena parallax `StoryCosmicHeart` (8 capas, D1-D12 del spec) y el
 * contenido (mismo i18n `Home.story.*`) se superpone encima. La nota
 * (`Home.story.note`) se conserva como linea de cierre bajo los pilares,
 * SIN la tarjeta flotante ni el icono sparkle (D8): esta composicion no
 * tiene sitio para una tarjeta sin tapar el nucleo del corazon.
 *
 * `themeName` decide la rama (no `theme.data.isLight`): mismo criterio que
 * `HomeSections.tsx`, que ya usa `useTheme()` de `@/theme/ThemeProvider`
 * para esta misma decision.
 */

/* Flotacion compartida por la figura y la tarjeta de nota EN CLARO (mismo
   keyframe que el mockup reutiliza con dos duraciones distintas, ver
   story.layers.ts). La rama oscura no la usa: su unica animacion es el
   pulso del nucleo, declarado en storyCosmicHeart.parts.tsx. */
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(${STORY_FLOAT_AMPLITUDE}); }
`;

const PILLARS = [
    { key: "learn", number: "01" },
    { key: "create", number: "02" },
    { key: "grow", number: "03" },
    { key: "practice", number: "04" },
] as const;

/** Color de cada numero de pilar: los tres primeros son pasos reales de
 *  `palette.primary`/`palette.secondary` (mockup L82/87/92: `--primary-500`,
 *  `--secondary-500`, `--secondary-600`) -- referencia directa al tema, no
 *  un literal nuevo. El cuarto pilar ("practice", 2026-07-28) continua la
 *  MISMA rampa un paso mas (`secondary[700]`). `palette.*` no cambia entre
 *  temas (vive en `shared` de `themes.ts`), asi que estos colores sirven
 *  tal cual en las dos ramas. */
function pillarColor(
    index: number,
): (props: { theme: DefaultTheme }) => string {
    return ({ theme }) => {
        if (index === 0) return theme.data.palette.primary[500];
        if (index === 1) return theme.data.palette.secondary[500];
        if (index === 2) return theme.data.palette.secondary[600];
        return theme.data.palette.secondary[700];
    };
}

const ScStory = styled.section`
    padding: ${({ theme }) => theme.data.space[9]}
        ${({ theme }) => theme.data.space[5]};
    max-width: ${({ theme }) => theme.data.grid.containerMax};
    margin-inline: auto;
`;

/* Reveal de sección en CLARO (mismo patrón que `ScItem` en Features.tsx). */
const ScGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[7]};
    opacity: 0;
    transform: translateY(16px);
    transition:
        opacity ${({ theme }) => theme.data.motion.duration.slow}
            ${({ theme }) => theme.data.motion.easing.decelerate},
        transform ${({ theme }) => theme.data.motion.duration.slow}
            ${({ theme }) => theme.data.motion.easing.decelerate};

    &[data-revealed="true"] {
        opacity: 1;
        transform: none;
    }

    @media ${({ theme }) => theme.data.breakPoint.lg} {
        grid-template-columns: minmax(280px, ${STORY_FIGURE_WIDTH}) 1fr;
        gap: ${({ theme }) => theme.data.space[8]};
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
        opacity: 1;
        transform: none;
    }
`;

const ScFigureWrap = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: min(${STORY_FIGURE_HEIGHT}, 70vh);
`;

const ScHalo = styled.div`
    position: absolute;
    inset: ${STORY_HALO_INSET};
    border-radius: ${({ theme }) => theme.data.radius.full};
    background-image: ${STORY_HALO_GRADIENT};
    pointer-events: none;
`;

const ScFigureImg = styled.img`
    position: relative;
    display: block;
    width: min(${STORY_FIGURE_WIDTH}, 100%);
    height: auto;
    aspect-ratio: ${STORY_FIGURE_ASPECT};
    object-fit: contain;
    border-radius: ${({ theme }) => theme.data.radius["2xl"]};

    @media (prefers-reduced-motion: no-preference) {
        animation: ${float} ${STORY_FIGURE_FLOAT_MS}ms ease-in-out infinite;
    }
`;

const ScNoteCard = styled.div`
    position: absolute;
    inset-block-end: 90%;
    inset-inline-start: -25%;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[3]};
    max-width: 220px;
    background-color: ${STORY_CARD_BG};
    border: 1px solid ${STORY_CARD_BORDER};
    border-radius: ${({ theme }) => theme.data.radius.lg};
    padding: ${({ theme }) => theme.data.space[3]}
        ${({ theme }) => theme.data.space[4]};
    box-shadow: 0 12px 30px ${STORY_CARD_SHADOW};

    @media ${({ theme }) => theme.data.breakPoint.lg} {
        inset-inline-end: -6%;
    }

    @media (prefers-reduced-motion: no-preference) {
        animation: ${float} ${STORY_CARD_FLOAT_MS}ms ease-in-out infinite;
    }
`;

const ScSparkle = styled.svg`
    flex: none;
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.data.palette.primary[600]};
`;

const ScContent = styled.div`
    display: flex;
    flex-direction: column;
`;

const ScKicker = styled(Typography)`
    text-transform: uppercase;
    color: ${({ theme }) => theme.data.semantic.brandText};
`;

const ScTitle = styled(Typography)`
    margin-block-start: ${({ theme }) => theme.data.space[3]};
`;

/* Degradado seleccionado por tema (spec 2026-07-29 D10): mismas paradas de
   hue, luminosidad mucho mayor en oscuro para que el background-clip:text
   siga siendo legible sobre el negro-violeta de StoryCosmicHeart. */
const ScAccent = styled.span`
    background-image: ${({ theme }) =>
        theme.data.isLight
            ? STORY_ACCENT_GRADIENT_LIGHT
            : STORY_ACCENT_GRADIENT_DARK};
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;

    @supports not (background-clip: text) {
        background-image: none;
        color: ${({ theme }) => theme.data.semantic.brandText};
        -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
    }
`;

const ScBody = styled(Typography)`
    margin-block-start: ${({ theme }) => theme.data.space[5]};
    max-width: ${({ theme }) => theme.data.grid.prose};
`;

const ScPillars = styled.div`
    display: flex;
    flex-direction: column;
    margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

const ScPillarRow = styled.div`
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: ${({ theme }) => theme.data.space[4]};
    align-items: baseline;
    padding-block: ${({ theme }) => theme.data.space[4]};
    border-block-start: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

const ScPillarNumber = styled.span<{ $index: number }>`
    font-family: ${({ theme }) => theme.data.type.fontBody};
    font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
    font-weight: 700;
    color: ${({ $index }) => pillarColor($index)};
`;

const ScPillarCopy = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.data.space[1]};
`;

/* Envoltorio de la rama OSCURA: caja con altura propia (la escena de fondo
   es `position:absolute; inset:0`, necesita un ancestro con tamaño real) y
   `overflow:hidden` para que el overscan del parallax no desborde el layout
   de la pagina. */
const ScDarkSection = styled.div`
    position: relative;
    overflow: hidden;
    border-radius: ${({ theme }) => theme.data.radius["2xl"]};
    min-height: 520px;

    @media ${({ theme }) => theme.data.breakPoint.lg} {
        min-height: 620px;
    }
`;

/* Reveal de la rama oscura: mismo mecanismo que ScGrid, pero SOLO sobre el
   contenido -- la escena de fondo (StoryCosmicHeart) no usa useReveal, esta
   siempre presente y en movimiento propio. */
const ScDarkContent = styled.div`
    position: relative;
    z-index: 1;
    max-width: ${({ theme }) => theme.data.grid.prose};
    padding: ${({ theme }) => theme.data.space[7]}
        ${({ theme }) => theme.data.space[6]};
    opacity: 0;
    transform: translateY(16px);
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

const ScNote = styled(Typography)`
    margin-block-start: ${({ theme }) => theme.data.space[6]};
    color: ${({ theme }) => theme.data.semantic.textMuted};
`;

export function Story(): ReactElement {
    const { t } = useTranslation("home");
    const { themeName } = useTheme();
    const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

    const pillars = (
        <ScPillars>
            {PILLARS.map((pillar, index) => (
                <ScPillarRow key={pillar.key}>
                    <ScPillarNumber $index={index}>
                        {pillar.number} —
                    </ScPillarNumber>
                    <ScPillarCopy>
                        <Typography
                            variant="h5"
                            as="p"
                        >
                            {t(`Home.story.pillars.${pillar.key}.title`)}
                        </Typography>
                        <Typography variant="bodySm">
                            {t(`Home.story.pillars.${pillar.key}.body`)}
                        </Typography>
                    </ScPillarCopy>
                </ScPillarRow>
            ))}
        </ScPillars>
    );

    const heading = (
        <>
            <ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>
            <ScTitle
                variant="h2"
                id="story-title"
            >
                {t("Home.story.titleLead")}
                <br />
                <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
            </ScTitle>
            <ScBody variant="body">{t("Home.story.body")}</ScBody>
        </>
    );

    if (themeName === "light") {
        return (
            <ScStory
                id="story"
                aria-labelledby="story-title"
            >
                <ScGrid
                    ref={revealRef}
                    data-revealed={revealed}
                >
                    <ScFigureWrap>
                        <ScHalo aria-hidden="true" />
                        <ScFigureImg
                            src="/figures/journey-presenting-1024.webp"
                            srcSet="/figures/journey-presenting-640.webp 640w, /figures/journey-presenting-1024.webp 1024w"
                            sizes={STORY_FIGURE_SIZES}
                            alt={t("Home.story.figureAlt")}
                            loading="lazy"
                            decoding="async"
                        />
                        <ScNoteCard>
                            <ScSparkle
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                                <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
                            </ScSparkle>
                            <Typography variant="bodySm">
                                {t("Home.story.note")}
                            </Typography>
                        </ScNoteCard>
                    </ScFigureWrap>

                    <ScContent>
                        {heading}
                        {pillars}
                    </ScContent>
                </ScGrid>
            </ScStory>
        );
    }

    return (
        <ScStory
            id="story"
            aria-labelledby="story-title"
        >
            <ScDarkSection>
                <StoryCosmicHeart />
                <ScDarkContent
                    ref={revealRef}
                    data-revealed={revealed}
                >
                    {heading}
                    {pillars}
                    <ScNote variant="bodySm">{t("Home.story.note")}</ScNote>
                </ScDarkContent>
            </ScDarkSection>
        </ScStory>
    );
}
```

- [ ] **Step 4: Ejecutar la suite completa de `Story.test.tsx` y confirmar que pasa**

```bash
pnpm test src/components/sections/Story/Story.test.tsx
```

Expected: PASS — los tests de la rama clara (sin cambios de comportamiento) y los 4 nuevos de la rama oscura.

- [ ] **Step 5: Typecheck completo**

```bash
pnpm typecheck
```

Expected: sin errores (confirma que no queda ninguna referencia rota a `STORY_ACCENT_GRADIENT` sin sufijo tras el Task 5).

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Story/Story.tsx src/components/sections/Story/Story.test.tsx
git commit -m "feat(story): rama oscura de Story con la escena Cosmic Heart"
```

---

## Task 7: Gate por sección en `HomeSections`

**Files:**

- Modify: `src/components/sections/HomeSections.tsx`
- Modify: `src/components/sections/HomeSections.test.tsx`

**Interfaces:**

- Produces: `HomeSections()` sigue con la misma firma pública; el comportamiento en oscuro pasa de "ninguna sección" a "solo `Story`".

- [ ] **Step 1: Actualizar el test que ahora debe fallar**

En `src/components/sections/HomeSections.test.tsx`, sustituir el test:

```typescript
  it("en tema oscuro (guardado en localStorage), tras la correccion de hidratacion no queda ninguna de las 4 regiones montada", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<HomeSections />);

    await waitFor(() => {
      expect(container.querySelector("section")).toBeNull();
    });

    for (const id of ["story", "journey", "features", "contact"]) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
  });
```

por:

```typescript
  it("en tema oscuro (guardado en localStorage), tras la correccion de hidratacion monta SOLO Story (Journey/Features/Contact aun no tienen tratamiento oscuro)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<HomeSections />);

    await waitFor(() => {
      const ids = Array.from(container.querySelectorAll("section")).map(
        (el) => el.id,
      );
      expect(ids).toEqual(["story"]);
    });

    for (const id of ["journey", "features", "contact"]) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
  });
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
pnpm test src/components/sections/HomeSections.test.tsx
```

Expected: FAIL — `HomeSections` todavía devuelve `null` entero en oscuro.

- [ ] **Step 3: Reescribir `HomeSections.tsx`**

```tsx
"use client";

import type { ReactElement } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Story } from "./Story/Story";
import { Journey } from "./Journey/Journey";
import { Features } from "./Features/Features";
import { Contact } from "./Contact/Contact";

/*
 * Gate por seccion (spec 2026-07-29-story-dark-cosmic-heart-design.md, D2):
 * antes de esta revision, este componente era todo-o-nada (D3 del spec
 * anterior, 2026-07-28) -- claro montaba las 4 secciones, oscuro ninguna.
 * Story ya tiene tratamiento oscuro propio (StoryCosmicHeart); Journey,
 * Features y Contact NO lo tienen todavia -- se construyen uno a uno, en
 * ciclos spec->plan->implementacion separados (encargo del usuario:
 * "vamos a ir seccion por seccion").
 *
 * "use client" + `useTheme()`, sin ThemeProvider anidado: las secciones
 * resuelven contra el tema AMBIENTAL de la pagina, igual que antes.
 *
 * SEO/hidratacion: sin cambios respecto al razonamiento del spec anterior --
 * el export estatico sigue prerenderizando SIEMPRE en claro (`ThemeProvider`
 * arranca en `"light"`), asi que el HTML estatico contiene las 4 secciones;
 * el ajuste de hidratacion a oscuro desmonta Journey/Features/Contact pero
 * ahora deja `Story` montada.
 */
export function HomeSections(): ReactElement | null {
    const { themeName } = useTheme();

    if (themeName === "light") {
        return (
            <>
                <Story />
                <Journey />
                <Features />
                <Contact />
            </>
        );
    }

    return <Story />;
}
```

- [ ] **Step 4: Ejecutar la suite completa de `HomeSections.test.tsx` y confirmar que pasa**

```bash
pnpm test src/components/sections/HomeSections.test.tsx
```

Expected: PASS, 3 tests (los 2 de claro sin cambios + el actualizado de oscuro).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/HomeSections.tsx src/components/sections/HomeSections.test.tsx
git commit -m "feat(home): HomeSections monta Story tambien en tema oscuro"
```

---

## Task 8: Verificación final y cierre

**Files:** ninguno nuevo — solo comandos de verificación y housekeeping.

- [ ] **Step 1: Suite completa**

```bash
pnpm test
```

Expected: todos los archivos en verde, sin regresión no explicada (línea base previa a esta entrega: la de `2026-07-28-landing-v2-secciones-design.md` §9, "48 archivos / 481 tests" — el total ahora será mayor por los tests nuevos de esta entrega).

- [ ] **Step 2: Gate de calidad**

```bash
pnpm check
pnpm check-spelling
```

Expected: sin errores. Si `check-spelling` marca palabras nuevas legítimas (`webp`, `cosmic`, nombres propios de archivo), añadirlas a `.cspell.json`.

- [ ] **Step 3: Build de export estático**

```bash
pnpm build
```

Expected: build OK, sin errores de Next.js sobre los nuevos `<img>`/imports.

- [ ] **Step 4: Verificación en navegador real**

Arrancar el dev server y comprobar en el Browser pane:

- Tema oscuro: Story muestra la escena con las 8 capas, parallax de puntero (mover el ratón sobre la sección) y de scroll (desplazar la página) funcionando, el núcleo del corazón pulsando, contenido (kicker/título/pilares/nota) legible sobre la viñeta.
- Tema claro: Story sin cambios visuales respecto a antes de esta entrega.
- Alternar el `ThemeToggle` con Story en pantalla: sin errores de consola.
- Emular `prefers-reduced-motion: reduce` (DevTools → Rendering): la escena queda congelada por completo (sin parallax, sin pulso).
- Revisar a ojo el contraste de `STORY_ACCENT_GRADIENT_DARK` sobre el fondo oscuro; si se ve insuficiente, ajustar las luminosidades en `story.layers.ts` (Task 5) antes de cerrar.

- [ ] **Step 5: Actualizar el grafo de graphify**

```bash
graphify update .
```

- [ ] **Step 6: Registro en el vault**

Añadir entrada de Registro fechada en `01-Projects/vti.md` (vault `vibe-ai-vault`) enlazando esta spec y este plan, y anotar en `task/lessons.md` (si existe en este repo) cualquier lección nueva (p. ej. el patrón de extraer WebP embebidos en base64 de un HTML de demo).

- [ ] **Step 7: Commit final si quedó algo suelto**

```bash
git status
```

Si `.cspell.json` u otros ficheros de housekeeping cambiaron en el Step 2, commitearlos aparte con un mensaje descriptivo.

---

## Self-Review (completado por el planificador)

**Cobertura del spec:** D1/D2 → Task 6/7. D3 → Task 3/4. D4 → Task 1. D5 (sin giroscopio) → Task 1 no implementa `deviceorientation`. D6 (freeze bajo reduced-motion) → Task 1 Step 5 (test de congelación en caliente). D7 (pulso del núcleo) → Task 3 (`heartBeat` guardado). D8 (nota sin tarjeta) → Task 6 (`ScNote`, sin `ScNoteCard`/sparkle en oscuro). D9 (figura decorativa) → Task 4 (`alt=""`) + Task 6 (test "sin figureAlt"). D10 (degradado oscuro) → Task 5. D11 (fondo literal) → Task 2/3 (`STORY_COSMIC_HEART_VOID`). D12 (assets) → Task 0.

**Escaneo de placeholders:** sin `TBD`/`TODO`; todo paso de código trae el código completo.

**Consistencia de tipos:** `SceneParallaxTarget`/`SceneParallaxOptions` (Task 1) se usan con los mismos nombres en `StoryCosmicHeart.tsx` (Task 4). `StoryCosmicHeartLayer` (Task 2) se consume igual en `storyCosmicHeart.parts.tsx` (Task 3) y `StoryCosmicHeart.tsx` (Task 4). `STORY_ACCENT_GRADIENT_LIGHT`/`_DARK` (Task 5) se importan con esos nombres exactos en `Story.tsx` (Task 6).
