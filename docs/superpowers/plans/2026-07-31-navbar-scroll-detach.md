# Navbar: despegue al hacer scroll ("slime detach") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-31-navbar-scroll-detach-design.md` **Goal:** Al cruzar el umbral de scroll, la barra pasa de banda a sangre a píldora flotante (máx. 1280px centrada, 8px de separación arriba y a los lados, 16px de radio, cristal + sombra), con una transición que se lee como material que se despega al bajar y vuelve a pegarse al subir.

**Architecture:** `Navbar.tsx` se parte en tres capas — `ScHeader` (posición fija + intro + hueco lateral), `ScBar` (geometría: `max-width`/`margin-top`, centrado) y `ScSurface` (chrome visual: cristal, borde, radio, sombra, y las `@keyframes` de squash & stretch). Un hook nuevo `useNavDetach` produce el estado `data-detach` (`idle`/`detaching`/`attaching`) que dispara las `@keyframes` solo en cruces reales de umbral.

**Tech Stack:** Next.js 16 (export estático) + React 19 + TypeScript strict + styled-components 6 + Vitest/Testing Library.

## Global Constraints

- TypeScript strict, sin `any`, tipos de retorno explícitos en toda función exportada.
- Colores, radios, sombras, duraciones y curvas SIEMPRE por token de tema (`theme.data.*`). Los únicos números literales admitidos son los porcentajes y factores de escala dentro de las `@keyframes` (son la forma de la curva, no medidas del sistema).
- El estado vive en `ScHeader`; cualquier regla que dependa de él en un DESCENDIENTE usa el selector descendiente `[data-scrolled="true"] &`, nunca `&[data-scrolled="true"]` (que solo casa el mismo elemento — regla §5.1 de CLAUDE.md global).
- Nunca redeclarar la lista `transition` completa de `ScHeader` dentro de un bloque de estado: borraría las entradas del intro. En `ScHeader` solo se AÑADE una entrada; la coreografía por sentido vive en `ScBar`.
- Toda `@keyframes` se declara únicamente dentro de `@media (prefers-reduced-motion: no-preference)`; las `transition` nuevas se anulan con `transition: none` en el bloque `@media (prefers-reduced-motion: reduce)` del componente.
- Tests: Vitest + Testing Library, sin snapshots. jsdom NO evalúa `@media`: los bloques de reduced-motion se verifican por el TEXTO del CSS inyectado (helper `allCssRules()` ya existente en `Navbar.test.tsx`). `getComputedStyle` sí resuelve las reglas de styled-components; se asevera contra el TOKEN IMPORTADO, nunca contra un literal.
- No se tocan: `useScrolled.ts`, `src/test/test-utils.tsx`, `StageProvider`, i18n, ni ningún test existente salvo los dos contratos cerrados de `system.test.ts` (Task 1).
- Baseline conocido que NO se arregla en esta entrega y NO debe empeorar: `app/home-page.flujo.test.tsx` tiene 1 fallo preexistente (timeout); `check-format` falla solo en `graphify-out/**`; `check-spelling` tiene 31122 incidencias previas.

---

## Task 1: Tokens y variables de layout

**Files:**

- Modify: `src/theme/tokens/grid.ts`
- Modify: `src/theme/tokens/motion.ts`
- Modify: `src/theme/tokens/system.test.ts`
- Modify: `src/theme/GlobalStyles.tsx`

**Interfaces:**

- Produces: `theme.data.grid.navMax`, `theme.data.motion.easing.overshoot`, variable CSS `--nav-gap` (consumidas por Task 3).

- [ ] **Step 1: añadir `navMax` a `grid.ts`**

Junto a `containerMax`, con comentario que explique por qué es una medida distinta (el navbar flotante mide 1280px; el ancho de contenido del sitio sigue siendo 1200px, y deben poder divergir).

- [ ] **Step 2: añadir `overshoot` a `motion.ts`**

`overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)"`, con comentario: es la única curva de la escala que sobrepasa su valor final; existe para los rebotes elásticos (despegue del navbar), no para transiciones de interfaz normales.

- [ ] **Step 3: actualizar los dos contratos cerrados de `system.test.ts`**

Son tests de contrato deliberado (lección `task/lessons.md` 2026-07-25): se ACTUALIZAN, no se relajan.

- `expectedGrid` gana `navMax: "1280px"`; `expect(Object.keys(grid)).toHaveLength(5)` pasa a `6`; se añade un `it` de valor (`grid.navMax` es `"1280px"` y es mayor que `containerMax`).
- `expectedEasing` gana `overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)"`; `expect(Object.keys(motion.easing)).toHaveLength(4)` pasa a `5`; se añade un `it` de valor.

- [ ] **Step 4: `--nav-gap` en `GlobalStyles.tsx`**

En el mismo `:root` donde ya vive `--nav-height`, con comentario que reutilice el razonamiento existente: es una medida de LAYOUT con dos consumidores que no pueden derivarla el uno del otro (el Navbar, que la aplica; y el `scroll-margin-top` de las secciones ancladas, que ahora tiene que descontar barra **más** separación).

```
--nav-gap: 0.5rem;
```

Y la regla de anclas pasa a:

```
:where(section[id]) {
  scroll-margin-top: calc(var(--nav-height) + var(--nav-gap));
}
```

- [ ] **Step 5: verificar**

```bash
pnpm vitest run src/theme
pnpm typecheck
```

Los dos verdes. No se escriben tests contra `GlobalStyles` (lección 2026-07-25: `createGlobalStyle` no inyecta nada bajo jsdom); el Step 4 se verifica en navegador en la fase final.

---

## Task 2: Hook `useNavDetach` (TDD)

**Files:**

- Create: `src/hooks/useNavDetach.ts`
- Create: `src/hooks/useNavDetach.test.tsx`

**Interfaces:**

- Produces: `useNavDetach(offset?: number): { scrolled: boolean; phase: NavDetachPhase }` y `NAV_DETACH_ANIM_MS`, consumidos por Task 3.
- Consumes: `useScrolled` (`src/hooks/useScrolled.ts`), sin modificarlo.

**Contrato exacto:**

```ts
export type NavDetachPhase = "idle" | "detaching" | "attaching";
export const NAV_DETACH_ANIM_MS = 480; // atado a motion.duration.slower por test
export function useNavDetach(offset?: number): {
    scrolled: boolean;
    phase: NavDetachPhase;
};
```

Comportamiento:

1. `scrolled` es exactamente lo que devuelve `useScrolled(offset)` (por defecto 8).
2. `phase` arranca en `"idle"`.
3. Un cambio `false → true` pone `"detaching"`; `true → false` pone `"attaching"`.
4. Pasados `NAV_DETACH_ANIM_MS` desde el último cambio, vuelve a `"idle"` (temporizador reiniciado si llega otro cambio antes).
5. **La sincronización de montaje no cuenta como cruce.** `useScrolled` hace un `onScroll()` síncrono al montar: al abrir la página ya scrolleada emite `false → true` en el commit siguiente. El hook fija su línea base leyendo `window.scrollY > offset` en su PROPIO efecto de montaje (declarado ANTES del efecto que calcula la fase), de modo que ese primer cambio se reconoce como el valor inicial y no dispara nada.
6. El temporizador se limpia al desmontar y al reprogramarse.

- [ ] **Step 1: escribir `useNavDetach.test.tsx` PRIMERO (rojo)**

Con `renderHook` + `vi.useFakeTimers()`, siguiendo el estilo de `useScrolled.test.tsx` (mismo patrón de `Object.defineProperty(window, "scrollY", …)` + `dispatchEvent(new Event("scroll"))` dentro de `act`). Casos mínimos:

- arranca en `"idle"`;
- cruce hacia abajo → `"detaching"`;
- vuelve a `"idle"` tras avanzar `NAV_DETACH_ANIM_MS`;
- cruce hacia arriba → `"attaching"`;
- montar con `window.scrollY` ya por encima del umbral NO produce fase (queda `"idle"` con `scrolled === true`) — este es el test que ata el punto 5;
- desmontar no deja temporizadores pendientes (`vi.getTimerCount()` a 0 tras `unmount`);
- `NAV_DETACH_ANIM_MS` es igual a `parseInt(motion.duration.slower, 10)` — importando el token, no un literal.

Ejecutar y ver el rojo (el módulo aún no existe).

- [ ] **Step 2: implementar `useNavDetach.ts` (verde)**

Documentar en el propio archivo, en comentario, el punto 5 (por qué la línea base se lee del `window`, no del primer valor de `useScrolled`) y el punto de por qué `NAV_DETACH_ANIM_MS` es una constante exportada y no un literal en el CSS (JS y CSS comparten el número; el test lo ata al token — mismo patrón que `HERO_CHROME_OFFSET_MS` en `hero.transition.ts`).

- [ ] **Step 3: verificar**

```bash
pnpm vitest run src/hooks/useNavDetach.test.tsx
pnpm typecheck
```

Los dos verdes, sin tocar `useScrolled.ts` ni sus tests.

---

## Task 3: Reestructurar `Navbar` y montar la coreografía

**Depende de:** Task 1 y Task 2.

**Files:**

- Modify: `src/components/layout/Navbar/Navbar.tsx`
- Modify: `src/components/layout/Navbar/Navbar.test.tsx`

- [ ] **Step 1: tests nuevos PRIMERO (rojo), añadidos SIN tocar los 17 existentes**

Un `describe` nuevo ("despegue al hacer scroll") con:

- al montar, el `banner` tiene `data-detach="idle"`;
- tras `scrollPast()` (helper ya existente en el archivo) el `banner` tiene `data-detach="detaching"`; con `vi.useFakeTimers()`, tras avanzar `NAV_DETACH_ANIM_MS` vuelve a `"idle"`;
- al volver a `scrollY = 0`, `data-detach="attaching"`;
- existe exactamente un `[data-nav-surface]`, con `aria-hidden="true"`;
- con scroll, `getComputedStyle` del contenedor de geometría devuelve `max-width` igual a `basicLightTheme.grid.navMax`, y la superficie devuelve `border-radius` igual a `basicLightTheme.radius.xl` (contra el token importado);
- el CSS inyectado contiene un bloque `@media (prefers-reduced-motion: no-preference)` con las dos `@keyframes`, y un bloque `reduce` que anula las transiciones nuevas (verificado con `allCssRules()`, por texto).

- [ ] **Step 2: implementar la estructura (verde)**

```
ScHeader (header)         position fixed; top/left/right 0; z-index stickyNav;
                          padding-inline 0 -> var(--nav-gap);
                          intro (opacity/transform) INTACTO;
                          a su lista de transition SOLO se le AÑADE una entrada de padding-inline
  ScBar (div)             position relative; width auto; margin-inline auto; margin-top 0;
                          max-width 100vw -> theme.data.grid.navMax
  ScSurface (div)         position absolute; inset 0; aria-hidden="true"; data-nav-surface;
                          glass.bg + blur (-webkit- primero) + glass.border + elevation[2];
                          border-radius 0 -> radius.xl; opacity 0 -> 1
  ScNav (nav)             position relative; resto IDÉNTICO al actual
```

El cristal, el borde y la sombra dejan de estar en `ScHeader` y pasan a `ScSurface`, conmutados por `opacity` (y `border-radius`) en vez de por `background-color`/`border-color`/`backdrop-filter`.

Coreografía (valores exactos en §5 de la spec):

- `ScBar` base (sentido "pegarse"): `max-width 100vw`, `margin-top 0`, `transition: max-width slow emphasized fast, margin-top fast accelerate 0ms`.
- `ScBar` en `[data-scrolled="true"] &`: `max-width navMax`, `margin-top var(--nav-gap)`, `transition: max-width slow overshoot 0ms, margin-top base emphasized fast`.
- `ScSurface`: `transition: opacity base standard, border-radius base standard`; en `[data-scrolled="true"] &`, `opacity: 1` y `border-radius: radius.xl`.
- `@keyframes peelOff` / `stickOn` (`transform-origin: top center`), disparadas por `[data-detach="detaching"] &` / `[data-detach="attaching"] &`, duración `NAV_DETACH_ANIM_MS`, curva `standard`, `both`. Ambas viven SOLO dentro de `@media (prefers-reduced-motion: no-preference)`.

```
peelOff:  0% scaleY(1) scaleX(1) · 30% scaleY(1.06) scaleX(0.996) · 62% scaleY(0.98) scaleX(1.003) · 100% scaleY(1) scaleX(1)
stickOn:  0% scaleY(1) scaleX(1) · 28% scaleY(0.93) scaleX(1.004) · 60% scaleY(1.03) scaleX(0.998) · 100% scaleY(1) scaleX(1)
```

`Navbar()` pasa de `useScrolled(8)` a `useNavDetach(8)` y escribe `data-detach={phase}` en `ScHeader`. `EyeCornerMark visible={scrolled}` y todo el contenido de `ScNav` quedan **igual**.

- [ ] **Step 3: bloque `reduce`**

En `ScBar` y `ScSurface`, `@media (prefers-reduced-motion: reduce) { transition: none; }`. Las `@keyframes` no necesitan anulación: no existen fuera de `no-preference`.

- [ ] **Step 4: verificar**

```bash
pnpm vitest run src/components/layout/Navbar
pnpm typecheck && pnpm lint
```

Los 17 tests previos + los nuevos, todos verdes, sin modificar los previos.

---

## Task 4: Gate, verificación en navegador y cierre

**Depende de:** Tasks 1–3. La ejecuta el hilo principal (revisor), no un subagente.

- [ ] **Step 1: gate completo**

```bash
pnpm test
pnpm check
```

Criterio: `pnpm test` sin fallos nuevos respecto al baseline (495 verdes + el fallo preexistente de `home-page.flujo.test.tsx`); `typecheck`/`lint` limpios; `check-format` sin diferencias fuera de `graphify-out/**`.

- [ ] **Step 2: verificación en navegador real (obligatoria — jsdom no ve nada de esto)**

Servidor `vti-dev` (`.claude/launch.json`). Comprobar: geometría exacta (1280px, 8px arriba y a los lados, radio 16px) medida con `getBoundingClientRect`/`getComputedStyle`; despegue y pegado fluidos en los dos sentidos; cristal y sombra solo en estado despegado; los cuatro estados tema × scroll sin regresión de color del logo; `prefers-reduced-motion` emulado = salto instantáneo; consola sin errores; `backdrop-filter` sobre la capa con `opacity: 0` no pinta nada (riesgo §12 de la spec).

- [ ] **Step 3: `graphify update .`**

- [ ] **Step 4: commits temáticos en español y registro en el vault**

Registro con la skill `registro-vault`: entrada fechada en `01-Projects/vti.md` referenciando spec y plan, y lección nueva en `task/lessons.md` si la verificación descubre alguna.
