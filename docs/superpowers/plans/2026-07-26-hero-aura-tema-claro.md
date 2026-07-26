# Plan — Hero «Aura» para tema claro

**Spec:** `docs/superpowers/specs/2026-07-26-hero-aura-tema-claro-design.md` **Rama:** `feature/mejoras-hero-navbar` · **HEAD de partida:** `284d1b6`

Reparto de modelos: **Opus** planifica, revisa e integra; **Sonnet** implementa cada tarea. Cada tarea es independiente dentro de su fase y toca ficheros disjuntos, salvo donde se indica.

---

## Contratos de test que este plan tiene que respetar o actualizar

Inventario verificado antes de empezar (ruta:línea reales). **Ninguna aserción se relaja: se califica por tema o se sustituye por su equivalente correcto.**

### Rompen y hay que actualizar

| # | Fichero:línea | Qué asume | Qué hacer |
| --- | --- | --- | --- |
| R1 | `Hero.test.tsx:173-187` | `ScCopy` tiene EXACTAMENTE 5 hijos directos con delays 80/160/240/320 ms | **No se toca.** El plan conserva los 5 hijos. Es un candado a favor: si alguien mete un wrapper para alinear a la izquierda, salta |
| R2 | `Hero.qa.test.tsx:131-138` | kicker computa `semanticDark.brandText` con la app en claro | Partir en dos: en oscuro `semanticDark.brandText`, en claro `semanticLight.brandText` |
| R3 | `Hero.qa.test.tsx:194-208` | pie mide `space[8]` y cierra en `EYE_SURFACE` | ~~Calificar por tema~~ → **YA NO ROMPE.** La rampa violeta del tema claro vive en `ScAuraFoot`, dentro del stack de Aura, no en `ScHeroFoot` (spec §6.4). `ScHeroFoot` conserva altura y degradado idénticos; solo se le añade un caso nuevo para su `opacity` en claro |
| R4 | `hero-story.integration.test.tsx:189-196` | duplica R2 | Mismo tratamiento que R2 |
| R5 | `hero-story.integration.test.tsx:198-211` | duplica R3 | **YA NO ROMPE**, mismo motivo que R3 |
| R6 | `hero-story.integration.test.tsx:249-261` | `hero-foot` existe y Story es hermana inmediata | Conservar el `data-testid="hero-foot"` en las dos ramas → no rompe |
| R7 | `app/home-page.flujo.test.tsx:116-139` | **falla en su primera aserción**: exige `hero-subtitle.color === semanticDark.text` con la app en claro | Partir en dos tests: (1) camino oscuro real (`localStorage` a `dark`) conserva la paleta oscura tras el toggle; (2) camino claro usa `semanticLight.text` y Story **sigue** en `semanticDark.text` (Story no cambia) |
| R8 | `app/home-page.flujo.test.tsx:164-176` | `hero-foot`/`story-continuity` fuera del orden de tabulación | Conservar ambos testids → no rompe |

### Quedan huérfanas (no fallan, pero dejan de describir la realidad)

- `Hero.qa.test.tsx:140-153` y `describe("CTAs animados del hero (Flujo 3)")`: comparan constantes contra `EYE_SURFACE`/`semanticDark` sin render. **Se amplían** con el par equivalente del tema claro contra `AURA_SURFACE`.

### No se tocan (y que sigan verdes es la prueba de que no hubo regresión)

`Eye.test.tsx`, `eye.layers.test.ts`, `Sol.test.tsx`, `Story.test.tsx`.

### Datos de entorno de test ya verificados — no re-descubrirlos

- `renderWithProviders` (`src/test/test-utils.tsx`) **no acepta tema**: el único mecanismo es `window.localStorage.setItem("vti-theme", "dark")` **antes** de renderizar (`ThemeProvider.tsx:27-34` lo lee en un `useEffect` al montar).
- **No hay ratchet de cobertura** en `vitest.config.ts` ni en `package.json`. La gate es «todo verde», no un umbral numérico.
- Disparar el cambio de tema por UI: `screen.getByRole("button", { name: /oscuro|claro|dark|light/i })` + `fireEvent.click` dentro de `act`.
- `getComputedStyle` sí resuelve las reglas de styled-components v6 en jsdom y devuelve los valores tal como se escriben; `transition-delay` se lee, la shorthand `animation` no se expande. `createGlobalStyle` no inyecta nada.

---

## Fase A — cimientos (A1 ∥ A2)

### A1 · Assets pastel → WebP _(en curso)_

Salida: `assets/hero-aura/*` (5 PNG + `manifest.json`) y `public/hero/aura/*` (4 capas × 2 anchos). Criterio de aceptación: recomposición WebP vs `verificacion_recompuesta.png` con error medio ≤ 2.0/255 y p99 ≤ 8/255; cabecera `VP8X`+`ALPH` en las capas con alfa y `VP8 ` en la opaca.

### A2 · Extraer `useParallaxLayers`

**Ficheros:** crear `src/hooks/useParallaxLayers.ts` + `src/hooks/useParallaxLayers.test.tsx`; modificar `src/components/eye/Eye.tsx`.

1. Mover el efecto de `Eye.tsx:58-83` al hook, con la API de la spec §5.1. Conservar **literalmente** los comentarios que explican por qué se depende de `x`/`y`/`enabled` y no del objeto de `usePointer()`: son el registro de un bug real.
2. `Eye.tsx` pasa a consumirlo. Al hacerlo:
    - **Elimina la ramificación por tema.** `Eye` queda como composición **solo oscura**: monta siempre `Wormhole`, nunca `Sol`, y **no** monta `ScShock`.
    - Deja de importar `useTheme` y `Sol`.
    - `ScShock` se **mueve** de `eye.parts.tsx` a `aura.parts.tsx` en la fase B1. En A2 basta con dejar de montarlo y **no borrar el styled todavía** (lo borra B1 al mudarlo), para que A2 y B1 no se pisen el mismo fichero.
3. `Eye.test.tsx` **cambia**: los dos `it` de elección de mascota (`Eye.test.tsx:163-169` y `:171-184`) se sustituyen por uno solo — «el centro del ojo lo ocupa siempre el Wormhole» — y se añade «no monta el anillo de choque simple: la coreografía del pulso es del Wormhole». El resto de `Eye.test.tsx` y todo `eye.layers.test.ts` quedan intactos.
4. Verificar: `pnpm test` verde y `pnpm check` sin errores nuevos.

---

## Fase B — la composición clara

### B1 · `Aura`

**Depende de:** A1 (necesita las rutas WebP reales) y A2 (necesita el hook). **Ficheros:** crear `src/components/aura/{aura.layers.ts, aura.layers.test.ts, aura.parts.tsx, Aura.tsx, Aura.test.tsx}`; modificar `src/components/eye/eye.parts.tsx` (sacar `ScShock`).

1. `aura.layers.ts` con las constantes de la spec §5.2. Documentar en el docblock, como hace `eye.layers.ts`, que **el modelo es `source-over` y NO aditivo**, con las cifras medidas.
2. `aura.parts.tsx` — geometría literal en la spec §5.2.1, cópiala de ahí:
    - `ScAuraSocket` — `position: absolute; inset: 0; overflow: hidden; isolation: isolate;` y `background-color: AURA_SURFACE`. Es el color medido del arte, no un `semantic.*` (excepción sancionada, §7 de la spec). El aislamiento va AQUÍ, no en el marco.
    - `ScAuraField` — la capa `field`, **a sangre**: `inset: 0; width/height: 100%; object-fit: cover`. Es lo que garantiza cobertura en cualquier aspecto.
    - `ScAuraSubject` — `top: 0; height: 100%; aspect-ratio: AURA_ASPECT; left: AURA_ANCHOR_X; translate: -50.14% 0`. **No lleva `width`**: la fija el `aspect-ratio` a partir del alto. Bajo `max-aspect-ratio: 1/1`, encuadre por ancho (`height: auto; width: 185%; top: 41.63%; left: 50%; translate: -50.14% -41.63%`).
    - `ScAuraLayer` — **sin `mix-blend-mode`**. Con un comentario que diga por qué, para que nadie lo «arregle» copiando el aditivo del ojo.
    - `ScOrbSlot` — cuadrado de lado `AURA_ORB_SIZE` centrado en `AURA_ORB` con la propiedad independiente `translate: -50% -50%` (nunca `transform`: lo escribe el rAF).
    - `ScShock` — **mudado** desde `eye.parts.tsx`, sin cambios de comportamiento.
3. `Aura.tsx` — mismo esqueleto que `Eye.tsx` ya refactorizado: `usePointer`, `useParallaxLayers`, `aria-hidden="true"`, `alt=""`, `loading="eager"`, `decoding="async"`, pulso por `pointerdown` con el guard de reduced-motion. Monta `Sol` dentro de `ScOrbSlot`. Amplitud del parallax: la misma `AMP = { x: 26, y: 15 }` que el ojo (mismo lienzo, misma lectura de profundidad).
4. Tests según la spec §9. El de «ninguna capa lleva `mix-blend-mode`» es obligatorio.
5. `eye.parts.tsx`: borrar `ScShock` y su `keyframes shock` una vez mudados. Comprobar que no quedan importaciones huérfanas.

---

## Fase C — integración

### C1 · `hero.transition.ts` + `HeroBackdrop`

**Depende de:** B1. **Ficheros:** crear `src/components/sections/Hero/{hero.transition.ts, HeroBackdrop.tsx, HeroBackdrop.test.tsx}`.

Implementa la máquina de estados de la spec §6.1 y el CSS de §6.2. Puntos donde es fácil equivocarse, ordenados por probabilidad:

1. **El selector del estado es DESCENDIENTE** (`[data-state="active"] &`), no `&[data-state="active"]`. El estado vive en el contenedor del stack, las capas son hijas. Es el fallo silencioso que ya documenta `CLAUDE.md §5.1`.
2. **`img.decode()` debe ir con `.catch(() => undefined)`.** En jsdom no existe o rechaza, y sin el catch el test se queda colgado esperando una promesa que nunca resuelve.
3. **El desmontaje del stack saliente se programa por temporizador**, no por `transitionend`: bajo `prefers-reduced-motion` no hay transición y por tanto no hay evento — el stack saliente se quedaría montado para siempre. Mismo razonamiento que `Eye.tsx:90-96`.
4. **Token de ejecución** para cancelar una transición en curso: dos toggles rápidos no pueden dejar un stack huérfano. Es un `it` del test, no una precaución teórica.
5. El stack de **Aura va siempre por encima** del stack del ojo, en los dos sentidos de la transición, para que su capa opaca `00-field` sea la que resuelve el cambio de lienzo sin animar ningún `background-color` (spec §6.3).
6. `HERO_STAGGER` fija el orden **campo → mano izq → mano der → energía → orbe**. El índice en ese array es el escalón; el test lo lee de la constante, nunca de números escritos a mano.

### C2 · `Hero.tsx`

**Depende de:** C1. **Ficheros:** `src/components/sections/Hero/Hero.tsx`, `Hero.test.tsx`, `Hero.qa.test.tsx`, `src/components/sections/hero-story.integration.test.tsx`, `app/home-page.flujo.test.tsx`.

1. **Eliminar el `ThemeProvider` anidado** (`Hero.tsx:33` y `:454`). La superficie del hero ya sigue al tema de la página, así que forzar `basicDarkTheme` es redundante y es la fuente exacta del bug de `task/lessons.md`. Actualizar el comentario de cabecera: hoy afirma que el hero es negro en los dos temas y eso deja de ser cierto.
2. Sustituir `<ScEye />` por `<HeroBackdrop />`.
3. Distribución por tema (spec §6.5) con prop transitoria `$light`, sin duplicar componentes. **Los cinco hijos de `ScCopy` siguen siendo cinco y directos** (candado R1).
4. `ScScrim`: solo en oscuro.
5. `ScHeroFoot`: en claro `height: space[9]`; **la parada final sigue siendo `EYE_SURFACE`** en los dos temas — es lo que sostiene la costura con Story.
6. Cruce de la copia por opacidad (spec §6.5), sin animar layout.
7. Actualizar R2, R3, R4, R5, R7 según la tabla de arriba. **Ninguna aserción se borra: se desdobla por tema.**
8. Ampliar las pruebas huérfanas con el contraste real contra `AURA_SURFACE`, usando el helper de `src/theme/tokens/contrast.ts`.

### C3 · `Navbar.tsx` — `barTheme`

**Independiente de C1/C2.** `Navbar.tsx:134-137` fuerza `basicDarkTheme` mientras la barra es transparente «porque el hero es negro en los dos temas». Esa premisa deja de valer: en claro la marca se pintaría blanca sobre pastel. Como la superficie del hero ya coincide con el tema de la página, `barTheme` se reduce a `themes[themeName]`.

Reescribir el comentario explicando el cambio de premisa —no borrarlo—, y verificar en navegador las **cuatro** combinaciones (tema × scroll), que es exactamente lo que la lección del 2026-07-26 exige. Comprobar si `ThemeToggle.test.tsx` o los tests de navbar aseveran el tema forzado; si lo hacen, actualizarlos.

---

## Fase D — cierre (Opus)

1. Revisión del diff completo contra esta spec; anotar desviaciones en §14 de la spec.
2. Verificación en **navegador real** (este entorno no compone frames: se verifica leyendo el CSSOM y el DOM con `javascript_tool`, como ya se hizo para el bug del `background` shorthand):
    - los `transition-delay` reales de las capas siguen el orden pedido;
    - la navbar es legible en las cuatro combinaciones tema × scroll;
    - contraste medido de la copia sobre el pastel;
    - el marco de Aura cubre el hero a 5 tamaños de viewport, sin borde desnudo.
3. Gate: `pnpm typecheck` · `pnpm lint` · `pnpm check-format` · `pnpm check-spelling` · `pnpm test`. La afirmación «verde» tiene que coincidir literalmente con la salida.
4. `docs/qa-3d-pendiente.md`: añadir lo que este entorno no puede comprobar.
5. `task/todo.md` (review) y `task/lessons.md` (lecciones).
6. Commits pequeños por fase. **`git status --short` vacío al terminar** (DoD del 2026-07-26).
7. Registro en el vault con la skill `registro-vault`.
