# Plan — Contacto (transición + presentación) y Footer oscuro

**Spec:** `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md` · **HEAD de partida:** `6c79c5f` · **Rama:** `feature/landing-motion-interactions`

**Orquestación (encargo del usuario):** Opus planifica, revisa e integra; **Sonnet** ejecuta cada flujo de trabajo como subagente. Un flujo = un subagente, foco único. La síntesis y la decisión se quedan en el hilo principal.

**Baseline medida en este HEAD:** 604 tests / 57 ficheros verdes · `typecheck` 0 · `lint` 0 · `check-format` señala solo `graphify-out/**`.

---

## Fases

### Fase 1 — piezas independientes (3 subagentes en paralelo)

| Flujo | Alcance | Ficheros exclusivos |
| --- | --- | --- |
| **T1 · i18n** | 11 claves nuevas bajo `Home.contact.*`, es y en, misma forma y mismo orden (D19/§9) | `src/i18n/locales/es/home.json`, `src/i18n/locales/en/home.json` |
| **T2 · SectionBeam** | Componente del haz de costura: 5 elementos, 3 `@keyframes`, dibujado atado a `useReveal`, guards de `reduce` explícitos, literales `oklch()` verbatim (D7/D8/D18, tests §7.4) | `src/components/sectionBeam/**` (5 ficheros nuevos) |
| **T3 · Hold de Features** | `FEATURES_TAIL_HOLD`, `ScDarkTail`, slot a `grid-row: 1 / span 2`, guard `height: 0` bajo `reduce` (D3/D5, tests §7.1 salvo la invariante) | `src/components/sections/Features/{features.layers.ts,Features.tsx,Features.test.tsx}` |

Sin solapes de fichero entre los tres. **Puerta de fase:** los tres verdes + `pnpm typecheck` + `pnpm lint`.

### Fase 2 — consumidores (2 subagentes en paralelo)

| Flujo | Alcance | Ficheros exclusivos | Depende de |
| --- | --- | --- | --- |
| **T4 · Contacto oscuro** | Solape + a sangre + slot pegado + marco 1280 + 3 tarjetas + formulario de un campo + envío por `mailto:` + la invariante D4 (D2/D6/D12/D13/D14/D15, tests §7.2) | `src/components/sections/Contact/{contact.layers.ts,Contact.tsx,Contact.test.tsx}` | T1, T2, T3 |
| **T5 · Footer oscuro** | `footer.layers.ts` nuevo (fondo + 24 estrellas), haz en la costura, columnas Explore/Discover restauradas en oscuro, sustitución del test que afirma lo contrario (D9/D10/D16/D17, tests §7.3) | `src/components/layout/Footer/**` | T2 |

**Puerta de fase:** los dos verdes + suite completa + gate.

### Fase 3 — revisión, verificación y cierre (hilo principal, Opus)

1. Revisión de código de los 5 flujos (diff completo, línea a línea).
2. Auditoría adversarial en subagente Sonnet independiente: recalcular la aritmética de §4 desde el código, inyectar a mano el bug que cada test nuevo dice proteger y comprobar que se pone rojo, barrer referencias huérfanas y prosa obsoleta.
3. Verificación en navegador real (dev server): geometría, barrido de `scrollY`, CSSOM de los guards de `reduce`, 375px sin scroll horizontal, consola limpia.
4. Suite + gate completos, con salida literal.
5. `graphify update .`
6. Registro: `task/todo.md`, `task/lessons.md`, vault (`01-Projects/vti.md` + copia de la spec y del plan).

---

## Contratos comunes a todos los subagentes

- **Estándares del repo** (obligatorios, no negociables):
    - Tokens del tema para todo lo que sea rol de UI (`theme.data.*`); literales solo en `*.layers.ts` con su línea de origen del mockup citada.
    - Animar solo `transform`/`opacity`. Toda animación **infinita** lleva su bloque `@media (prefers-reduced-motion: reduce) { animation: none; }` explícito — no basta el colapso global de `GlobalStyles`.
    - React 19: sin `forwardRef`, `ref` como prop. Tipos de retorno explícitos, sin `any`.
    - Sin strings de UI hardcodeados: todo por `t('ns:key')`, con paridad es/en.
    - Comentarios CSS dentro de un template de styled-components **sin backticks** (rompen el template).
- **Tests**: nada de `getComputedStyle` para reglas dentro de un `@media` (jsdom no evalúa media queries) — se asevera sobre el texto CSS inyectado, sobre la **línea concreta** del bloque, nunca troceando el stylesheet acumulado. Todo test de ausencia lleva una sonda positiva para que no pueda pasar por vacuidad.
- **Verificación antes de reportar**: `pnpm vitest run <sus ficheros>` + `pnpm typecheck` + `pnpm lint` ejecutados de verdad, con la salida literal en el informe. Nada de «debería pasar».
- **Prohibido**: `git checkout`/`git restore`/`git stash` sobre ficheros con trabajo sin commitear (lección 2026-07-28: destruye trabajo de flujos paralelos). Un experimento de bug inyectado se deshace invirtiendo la edición.
- **Alcance cerrado**: cada flujo toca **solo** sus ficheros. Si encuentra un defecto fuera de su alcance, lo **reporta**, no lo arregla.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| `grid-row: 1 / span 2` no abarca la fila del hold y el slot se despega antes de tiempo | Medición en navegador en Fase 3 (§11): `slotBottom` contra `sectionBottom` en el último tramo de scroll. `1 / -1` está descartado de antemano (no abarca filas implícitas). |
| Un `overflow` heredado desactiva en silencio el `sticky` del slot de Contacto | Test §7.2.8 (ausencia de `overflow` en `ScContact`, con sonda positiva) + medición del pin en navegador. |
| El campo de estrellas del footer introduce mismatch de hidratación | D10: tabla de constantes precalculada; test §7.3.17 comprueba que el módulo no contiene `Math.random`. |
| Regresión silenciosa de la rama clara | Los tests claros existentes **no se tocan**; se ejecutan tal cual y tienen que seguir verdes. `git diff` acotado en la revisión. |
| El panel del navegador no compone frames (`document.hidden`) | Todo lo que es layout se mide con `getBoundingClientRect`/`getComputedStyle`/CSSOM; lo que depende de rAF se declara como no verificable aquí y se cubre con tests, sin fingir que se vio. |
