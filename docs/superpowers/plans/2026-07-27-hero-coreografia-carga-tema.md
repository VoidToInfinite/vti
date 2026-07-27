# Plan de implementación — coreografía de carga y cambio de tema del hero

- **Spec:** `docs/superpowers/specs/2026-07-27-hero-coreografia-carga-tema-design.md`
- **Rama:** `feature/mejoras-hero-navbar` · **Base:** `67dce4d`
- **Línea base verde:** 47 archivos / 445 tests

## Orquestación

Opus planifica, revisa e integra. Sonnet implementa cada flujo de trabajo. Cada flujo tiene **propiedad exclusiva** de sus archivos: ningún flujo escribe un archivo de otro (regla de `CLAUDE.md §9` sobre sesiones paralelas).

```
A (datos y tiempos)  ──┬──►  B (escalonado del ojo)  ──►  D (HeroBackdrop)  ──►  revisión + gate
                       └──►  C (fases, navbar, copia) ──┘
```

---

## A — Datos y tiempos

**Archivos (exclusivos):** `src/components/eye/eye.layers.ts`, `src/components/aura/aura.layers.ts`, `src/components/sections/Hero/hero.transition.ts`, y sus tres tests.

1. `eye.layers.ts`: exportar `EYE_STAGGER = ["mascot","background","eyelid","nebula","iris","pupil"]` con docblock que explique los sinónimos (`socket`≡`mascot`, `scrim`≡`pupil`) y por qué el orden es el de profundidad de `EYE_LAYERS`.
2. `aura.layers.ts`: reordenar `AURA_STAGGER` a `["orb","field","energy","handLeft","handRight"]`. Actualizar su docblock: el orden lo fija el brief, sigue desacoplado de `AURA_LAYERS`.
3. `hero.transition.ts`: añadir `HERO_STAGGER_STEPS`, `HERO_STACK_MS`, `HERO_BACKDROP_HOLD_MS`, `HERO_HANDOFF_MS`, `HERO_CHROME_OFFSET_MS`, `HERO_COPY_RETURN_MS`. Redefinir `HERO_TRANSITION_MS = HERO_STACK_MS`. **Eliminar** `HERO_COPY_HOLD_MS`. Reescribir `useHeroCopySwap`: oculta en `t=0`, devuelve en `HERO_COPY_RETURN_MS`.
4. Tests: cerrar los dos arrays con `toEqual`; reescribir los tramos de `hero.transition.test.tsx`.

**Hecho cuando:** `pnpm typecheck` limpio y los tests de esos tres archivos en verde. Los tests de `HeroBackdrop`/`Hero` pueden quedar en rojo — los arreglan D y C.

## B — Escalonado por capa del ojo

**Archivos (exclusivos):** `src/components/eye/eye.parts.tsx`, `src/components/eye/Eye.tsx`, `src/components/eye/Eye.test.tsx`.

1. Helper `eyeStep(part)` + `eyeStagger(part)` en `eye.parts.tsx`, espejo de `auraStep`/`auraStagger` pero **por `animation`, no por `transition`** (spec §6.1–6.2), con la animación del escalonado **última** en la lista y `@keyframes` de endpoints explícitos.
2. Aplicarlo a `ScSocket`, `ScLayer`, `ScMascotSlot`, `ScScrim`. `ScLayer` compone la lista con su `$glow` cuando lo tiene.
3. `Eye.tsx`: `data-part="socket"` en `ScSocket`. Nada más.
4. Guard explícito `animation: none` bajo `prefers-reduced-motion` (spec §6.5).

**No tocar:** `mix-blend-mode`, `transform`, `EYE_LAYERS`, geometría, pulso.

## C — Fases de página, navbar y copia

**Archivos (exclusivos):** `src/motion/stage.ts`, `src/motion/StageProvider.tsx`, `src/motion/StageProvider.test.tsx`, `app/providers.tsx`, `src/components/layout/Navbar/Navbar.tsx`, `Navbar.test.tsx`, `src/components/sections/Hero/Hero.tsx`, `Hero.test.tsx`.

1. `StageProvider` según spec §7.1, con red de seguridad y `reduce` → `settled`.
2. Montar en `app/providers.tsx` dentro de `ThemeProvider`.
3. `Navbar`: entra en `chrome` con `opacity` + `translateY(-8px)`, `motion.duration.slow`.
4. `Hero`: `ScCopy` retrasa su `rise` hasta `chrome`. El paso interno de 80 ms no cambia.

## D — Orquestación del fondo

**Archivos (exclusivos):** `src/components/sections/Hero/HeroBackdrop.tsx`, `HeroBackdrop.test.tsx`.

1. `ScEyeStack` deja de animar opacidad (spec §6.4).
2. Carga: montar en `"pending"`, correr la carrera de `decode()`, pasar a `"active"`, avisar a `markBackdropRevealed()` una sola vez.
3. Cambio de tema: relevo secuencial (spec §7.3), reutilizando token y limpieza actuales.
4. Reescribir los tests de retardo (ahora `animationDelay` para el ojo, `transitionDelay` para Aura) y añadir los del relevo y la carga.

---

## Definition of Done

- [ ] `pnpm test` — 100 % verde, sin tests borrados para «arreglar» el rojo.
- [ ] `pnpm check` (typecheck + lint + formato) sin errores nuevos.
- [ ] Verificación en navegador con el reloj conducido a mano (spec §8.1).
- [ ] `git status --short` vacío.
- [ ] Spec, plan, `task/todo.md`, `task/lessons.md` y `docs/qa-3d-pendiente.md` al día.
- [ ] Registro en el vault (`CLAUDE.md §8`).
