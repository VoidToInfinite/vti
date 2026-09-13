# Pasada única hacia el objetivo ≥98

> **Para Codex:** ejecutar este plan de extremo a extremo en esta sesión, con TDD estricto y una única integración final.

**Objetivo:** convertir los hallazgos verificables de la crítica #22 en una sola ola coherente que aspire a Nielsen 39/40, Técnica 20/20 y Craft 24/25, sin relajar candados ni inventar mejoras sobre hallazgos ya cubiertos.

**Estrategia:** cambios mínimos sobre los controles existentes. El rail conserva todos sus botones y nombres accesibles, pero adopta el patrón de tabulación itinerante; el conmutador conserva estado + acción + consecuencia con menos palabras; la rama oscura de Features recupera la misma jerarquía `h2` que la clara. Los instrumentos solo cambian cuando el código demuestra la carencia: el contraste documenta y expone una malla de 50 px; DPR2 no se duplica porque `check-site-surfaces.mjs` ya audita `[1, 2]`.

**Stack:** Next.js 16, React 19, TypeScript estricto, styled-components 6, Vitest/Testing Library, Playwright CLI.

---

## Tarea 1: entrada y etiqueta del encabezado

**Ficheros:**

- Modificar: `src/components/layout/LanguageSelector/LanguageSelector.test.tsx`
- Modificar: `src/components/layout/LanguageSelector/LanguageSelector.tsx`
- Modificar: `src/components/layout/ThemeToggle/ThemeToggle.test.tsx`
- Modificar: `src/components/layout/ThemeToggle/ThemeToggle.tsx`
- Modificar: `src/i18n/locales/es/common.json`
- Modificar: `src/i18n/locales/en/common.json`

- [x] Revisar el supuesto de `?read` negativo contra el contrato generador y sus tests; se refuta el cambio porque los desfases de transición negativos están documentados y son producidos por `readingOffsetRatio`.
- [x] Añadir un test CSSOM que exija `white-space: nowrap`; la implementación actual lo hacía fallar y la corrección lo dejó en verde.
- [x] Acortar las etiquetas ES/EN conservando estado visible, acción y efecto estructural de la página.
- [x] Ejecutar los tests focalizados en verde: 404 tests superados en las cinco áreas.

## Tarea 2: rail con tabulación itinerante

**Ficheros:**

- Modificar: `src/components/sections/Story/Story.test.tsx`
- Modificar: `src/components/sections/Story/Story.tsx`
- Modificar: `src/components/sections/Journey/Journey.test.tsx`
- Modificar: `src/components/sections/Journey/Journey.tsx`

- [x] Añadir tests que exijan exactamente una marca con `tabIndex=0`, ligada a `aria-current`, y teclado para Flechas/Fin.
- [x] Ejecutarlos rojos antes de la implementación.
- [x] Implementar refs estables y manejadores con ciclo circular para flechas y extremos para Inicio/Fin.
- [x] Ejecutar Story y Journey en verde.

## Tarea 3: paridad visual verificable

**Ficheros:**

- Modificar: `src/components/sections/Features/Features.test.tsx`
- Modificar: `src/components/sections/Features/Features.tsx`

- [x] Convertir el test existente en un candado CSSOM que exige el token `type.scale.h2.size` también en oscuro; fallaba con el `clamp` previo.
- [x] Retirar el suelo móvil de 24 px y consumir el token de jerarquía compartido.
- [ ] Validar el test con inyección reversible y revisar en navegador real 390×844 y 1440×900 que no haya recorte ni solapamiento.
- [ ] Reproducir el supuesto tramo muerto oscuro/390 antes de tocar geometría; solo corregirlo si la medición lo confirma.

## Tarea 4: densidad del instrumento y cierre

**Ficheros:**

- Modificar: `scripts/check-text-contrast.test.mjs`
- Modificar: `scripts/check-text-contrast.mjs`
- Modificar: `task/lessons.md` si aparece una corrección o una trampa nueva

- [x] Confirmar por código y test que el arte ya se audita a DPR1 y DPR2; no se añadió un segundo mecanismo.
- [ ] El supuesto barrido de 110 px es prosa histórica del censo, no una separación ejecutable en este script; queda sin tocar para no crear un candado ficticio.
- [ ] Ejecutar `pnpm run ci`, `pnpm build`, `pnpm measure:js` y `pnpm check:site-surfaces` cuando el entorno permita descargar las fuentes de `next/font`.
- [ ] Servir el build y verificar con una sesión propia de Playwright.
- [ ] Ejecutar `graphify update .` y registrar el cierre en el vault cuando se levante el bloqueo de herramientas.

## Tarea 5: vocabulario de movimiento compartido

**Ficheros:**

- Modificar: `src/theme/tokens/motion.ts`
- Modificar: `src/components/scenes/sectionBeam/sectionBeam.layers.ts`
- Modificar: `src/components/scenes/sectionBeam/sectionBeam.layers.test.ts`
- Modificar: `scripts/detect-anti-patterns.mjs`

- [x] Hacer que la curva compartida del haz lea `motion.easing.beam` sin cambiar su cadena CSS.
- [x] Retirar la excepción del detector que ya no tiene un literal que sancionar.
- [ ] Ejecutar el test unitario del haz en un entorno de Vitest sin el bloqueo de uso.

## Criterio de cierre

- Los cuatro tests nuevos se vieron rojos antes de la implementación y verdes después.
- El gate completo y el build salen con código 0.
- El peso JS sigue dentro del presupuesto del censo.
- No se reclama una puntuación ≥98 sin una nueva evaluación de Claude; esta pasada solo entrega las condiciones que, según la aritmética de la crítica #22, pueden alcanzarla.
