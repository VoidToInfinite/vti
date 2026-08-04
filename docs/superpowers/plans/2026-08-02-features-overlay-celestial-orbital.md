# Plan — Transición Journey→Features + escena «Celestial Orbital»

**Spec:** `docs/superpowers/specs/2026-08-02-features-overlay-celestial-orbital-design.md` **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `6eb4653`

Orquestación pedida por el usuario: el hilo principal (Opus) planifica, revisa e integra; los flujos mecánicos van a subagentes Sonnet. Los tres flujos de implementación tocan conjuntos de ficheros **disjuntos**, así que corren en paralelo; el contrato entre ellos (los nombres exportados por la escena nueva y por `features.layers.ts`) se fija por escrito en esta plan antes de lanzarlos, no se descubre al integrar.

## Fase 0 — Medición (hilo principal, hecha)

- [x] `git rev-parse HEAD` / `git branch --show-current` / `git status --porcelain` en el árbol principal.
- [x] Baseline del gate: `pnpm vitest run --maxWorkers=4` → **591/591 en 57 ficheros**; `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm check-format` señala solo `graphify-out/**` (preexistente).
- [x] Lectura de los precedentes: spec Story→Journey, `story.layers.ts`, `journey.deck.tsx`, `useSlideDeck.ts`, `useSceneParallax.ts`, `task/lessons.md`.

## Fase AS — Assets (hilo principal, hecha: no es trabajo delegable)

No se delega porque cada decisión es una medición, no una transcripción.

- [x] Probar el pipeline contra un activo que NO cambia (lección 2026-08-01): recodificar los 10 WebP máster de la escena saliente y comparar sha256 contra los 20 desplegados. `q=85` → 0/20; **`q=90`, `method=6`, `LANCZOS` → 20/20 byte a byte**. Queda demostrado el filtro y el `method`; la calidad es la única variable por escena.
- [x] Medir la curva de calidad sobre la escena COMPUESTA a 2560px (no sobre una capa suelta): q70 41.87 dB / 1576.8 KiB · q80 42.65 / 1732.0 · q85 43.22 / 1868.8 · q88 43.63 / 1991.6 · q90 43.84 / 2093.1 · q93 44.12 / 2305.5. Rodilla en **q85** (de q85 a q90: +224 KiB por +0.62 dB). Misma metodología y misma conclusión que la escena de Journey.
- [x] Medir si el orden de pintado del README y el del demo divergen: diferencia `0.0/255` de media por canal, bbox `None`, 18 píxeles de alfa compartida. Equivalentes → se elige el orden del demo (D13).
- [x] Publicar 14 WebP en `public/features/celestial-orbital/` (2560×1441 y 1024×576, q85, method=6, LANCZOS).
- [x] Escribir `assets/features-celestial-orbital/manifest.json` con las cifras medidas, no con las del README.
- [x] Verificar el resultado: recomponer los 7 WebP desplegados y compararlo visualmente contra el compuesto de los másteres.

## Flujos paralelos (subagentes Sonnet)

### Flujo J — Zona de hold de Journey (D3, D4)

Ficheros: `journey.layers.ts`, `Journey.tsx`, `journey.layers.test.ts`.

- [x] `JOURNEY_DECK_TAIL_SCREENS = 1` con su docblock y la invariante hacia `FEATURES_OVERLAY_RISE`.
- [x] `JOURNEY_DECK_TRACK_HEIGHT` suma la cola; docblock reescrito como reversión CONSCIENTE de D9 de la spec de las 8 diapositivas.
- [x] `tailScreens` a `useSlideDeck` (el hook no se toca).
- [x] El test «la pista NO lleva cola» se sustituye por su contrario, contra constantes y nunca contra el literal `9`.

### Flujo E — Escena «Celestial Orbital» (D12, D13, D14, D16)

Ficheros: `src/components/featuresCelestialOrbital/**` (nuevo), borrado de la escena saliente, comentario de `HomeSections.tsx`.

- [x] `featuresCelestialOrbital.layers.ts` con el contrato de exports fijado en la instrucción.
- [x] `.parts.tsx` sin `isolation: isolate` y **sin `mix-blend-mode`** (es el punto que un copia-pega desde la escena saliente rompería).
- [x] `FeaturesCelestialOrbital.tsx` calcado de `JourneyCosmicPortal.tsx`.
- [x] `featuresCelestialOrbital.layers.test.ts`.
- [x] `git rm -r` de `featuresCelestialGuide/`, `public/features/celestial-guide/`, `assets/features-celestial-guide/`.

### Flujo F — Sección Features (D2, D5, D6, D7, D8, D10, D11)

Ficheros: `features.layers.ts`, `Features.tsx`, `Features.test.tsx`.

- [x] Constantes nuevas y borrado de `FEATURES_DARK_MAX_WIDTH` / `FEATURES_DARK_MIN_HEIGHT`.
- [x] Rama oscura: solape, sección a sangre en grid de una celda, slot pegado de la escena, contenido a 1280.
- [x] Docblock obsoleto de la cabecera («imagen plana, sin capas») corregido.
- [x] Tests §7 puntos 1-6, 11, 12.

## Fase de integración (hilo principal)

- [x] Revisar los tres diffs contra la spec, decisión por decisión.
- [x] Recuperar la cobertura que se va con el borrado: `FeaturesCelestialGuide.test.tsx` no tenía equivalente asignado a ningún flujo → se reescribe como `FeaturesCelestialOrbital.test.tsx` en el hilo principal.
- [x] Gate completo: `pnpm vitest run`, `pnpm typecheck`, `pnpm lint`, `pnpm check-format`.
- [x] Verificación en **navegador real** de todo lo que jsdom no puede ver (§11 de la spec).
- [x] Auditoría adversarial independiente del resultado: 3 hallazgos reales (test 10 prometido y no escrito, DoD marcado con `check-format` sucio, dos docblocks huérfanos en `contactNeonGalaxy`), los tres cerrados. Sin bloqueantes ni altos.
- [x] `graphify update .` → 2412 nodos, 3014 aristas, 174 comunidades.
- [x] Registro en el vault (`01-Projects/vti.md` + copia de la spec) + `task/todo.md` + 3 lecciones nuevas en `task/lessons.md`.
