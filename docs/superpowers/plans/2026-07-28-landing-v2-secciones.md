# Plan — Landing v2: secciones de tema claro, retirada de Three.js y gate por tema

**Spec:** `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` **Orquestación:** el hilo principal (rol de planificador/revisor/documentador) planifica, revisa, integra, verifica en navegador y documenta; los flujos de implementación son subagentes Sonnet con propiedad EXCLUSIVA de sus archivos. Nadie toca archivos de otro flujo; los conflictos se devuelven al orquestador.

## Oleada 1 (paralela)

- **Flow AS — assets.** Propiedad: `assets/figures/**`, `public/figures/**`, scripts en scratchpad. Copia los 6 PNG (spec §6), genera manifest y WebP 1024/640 con alfa preservada, reporta pesos y verificación.
- **Flow A — fundación.** Propiedad: `src/i18n/locales/{es,en}/{home,common}.json`, `src/i18n/locales.test.ts` (solo si el contrato del test lo exige), `src/config/links.ts`, `src/config/links.test.ts`, `.cspell.json` (añadir palabras si el gate lo pide). Escribe el contrato i18n de la spec §4 VERBATIM y los links §5.
- **Flow G — retirada de Three.js.** Propiedad: `src/three/**` (borrar), `src/hooks/useScrollProgress.ts(.test.tsx)` (borrar), `package.json` (quitar `three`, `@types/three`) + `pnpm install` para el lockfile, nota fechada en `docs/qa-3d-pendiente.md` (la escena «El Descenso» se retira; los ítems 3D quedan como historia). NO toca Story (el import roto lo elimina Flow B en la misma oleada de integración; la suite solo se exige verde al final de la oleada 2).

## Oleada 2 (paralela, tras cerrar A — las claves i18n deben existir)

- **Flow B — Story.** Propiedad: `src/components/sections/Story/**`, `src/components/sections/hero-story.integration.test.tsx`. Reescritura completa según spec §7.1 (sin SceneLoader, sin useScrollProgress, sin ThemeProvider oscuro, sin ScSeam negro; decisión de costura hero→story documentada y medida).
- **Flow C — Journey.** Propiedad: `src/components/sections/Journey/**` (nuevo). Spec §7.2.
- **Flow D — Features.** Propiedad: `src/components/sections/Features/**`. Spec §7.3.
- **Flow E — Contact.** Propiedad: `src/components/sections/Contact/**`. Spec §7.4.

## Oleada 3 (tras B–E)

- **Flow F — composición.** Propiedad: `app/page.tsx`, `app/home-page.flujo.test.tsx`, `src/components/sections/HomeSections.tsx` (+ test), `src/components/layout/Navbar/**` (enlaces §7.6), `src/components/layout/Footer/**` (rediseño §7.5), `src/components/sections/About/**` (borrar).

## Cierre (orquestador)

1. Revisión línea a línea del diff contra la spec; arreglos vía flujo de fixes si hacen falta.
2. Gate: `pnpm test` · `pnpm check` · `pnpm check-spelling` · `pnpm build`.
3. Verificación en navegador real (dev server, tema claro/oscuro, reveal, figuras, consola).
4. Commits temáticos; `task/todo.md` + lecciones; vault (Registro + spec, frontmatter 7 claves).

## Riesgos señalados

- Reveal + jsdom: los guards `@media` solo se atan por texto del CSS inyectado (lecciones 2026-07-27). Los flujos deben validar esos tests con el bug inyectado.
- `system.test.ts` es contrato cerrado: nadie lo toca (spec D10).
- Sesiones paralelas: cada flujo re-verifica `git status` de SUS archivos antes de escribir.
- El lockfile lo regenera solo Flow G (`pnpm install`); nadie más ejecuta instalaciones.
