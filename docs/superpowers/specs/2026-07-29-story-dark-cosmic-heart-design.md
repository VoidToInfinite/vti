# Spec — Story en tema oscuro: escena parallax "Cosmic Heart"

**Fecha:** 2026-07-29 · **Rama:** `feature/dark-mode-landing` · **HEAD de partida:** `b8ad206`
**Fuente de arte:** `C:\Users\Daniel\Downloads\Story Dark Theme 1.zip` (README, `layers.json`, `split_layers.py`, `ParallaxScene.jsx`, `parallax-demo.html` con las 8 capas WebP embebidas en base64 — extraídas y verificadas en esta sesión).

## 1. Encargo

El usuario pide construir, sección por sección, las secciones de la landing para tema oscuro — que el spec previo (`2026-07-28-landing-v2-secciones-design.md`, D3/D6) dejó **deliberadamente fuera** del oscuro ("tema oscuro: solo hero y footer"). Esta entrega cubre **solo Story**; Journey/Features/Contact quedan para su propio ciclo spec→plan→implementación cuando el usuario los pida.

## 2. Qué hay en el zip

8 capas WebP (1672×941, RGB, sin alfa, color premultiplicado, compositado aditivo — la suma reconstruye el original con error ≤ 0.006 fuera de la figura, según el README adjunto):

| Capa | Profundidad | Contenido | % energía |
| --- | --- | --- | --- |
| `01-deep-space` | 0.03 | Vacío/degradado de fondo | 5.3% |
| `02-nebula-back` | 0.09 | Bruma difusa violeta/azul | 47.1% |
| `03-sparkles-far` | 0.13 | Campo de estrellas tenue | 2.9% |
| `04-geometry` | 0.19 | Círculos/mandalas/ondas finas | 0.13% |
| `05-nebula-front` | 0.26 | Cintas de energía brillantes | 33.9% |
| `06-sparkles-near` | 0.34 | Destellos cercanos | 3.4% |
| `07-figure` | 0.46 | Figura celestial + halo | 5.9% |
| `08-heart-core` | 0.50 | Núcleo luminoso del pecho | 1.4% |

Lienzo a sangre (16:9): el vacío queda a la izquierda (hueco natural para el texto), la figura con el corazón encendido a la derecha — a diferencia del Story claro (figura recortada 375×548 en columna propia), esto es una escena completa, no una figura aislada.

Paquete NO incluido en el zip pero SÍ contenía el HTML de demo (base64): las 8 capas ya extraídas a `layers/*.webp` (556 KB) y a `layers-1024/*.webp` (196 KB, generadas en esta sesión) — quedan pendientes de copiar a su destino final en el repo (Fase de implementación).

## 3. Decisiones de alcance

| # | Decisión | Porqué |
| --- | --- | --- |
| D1 | `Story.tsx` se vuelve consciente del tema (`theme.data.isLight`): rama clara = el componente actual, SIN CAMBIOS de comportamiento ni visuales (aparte del renombrado de constante de D10, que no altera el resultado); rama oscura = la escena nueva. Nada de ThemeProvider anidado (mismo criterio que D3 del spec anterior). | Evita duplicar el componente; el contenido (i18n, pilares) es compartido. |
| D2 | `HomeSections.tsx` pasa de un gate binario (`!== "light" → null`) a un gate por sección: claro monta las 4; oscuro monta **solo `Story`** por ahora. | Construcción incremental pedida por el usuario ("sección por sección"). Journey/Features/Contact no tienen aún tratamiento oscuro. |
| D3 | Capas como `<img>` absolutas (no `background-image`), seleccionable por CSS (`mix-blend-mode: screen` con `@supports` a `plus-lighter`), dentro de un marco `isolation: isolate` con `aspect-ratio: 1672/941`. Cada `<img>` lleva `alt=""` explícito (redundante con el `aria-hidden` del contenedor, defensa adicional si algún lector de pantalla no honra el ancestro). | Mismo precedente EXACTO que `eye.parts.tsx` (`ScLayer`, `ScFrame`) — no se reinventa un patrón que ya existe y está probado. |
| D4 | Parallax de puntero reutiliza `usePointer()` (ya gestiona reduced-motion y táctil, con lerp). Se añade un hook NUEVO para scroll-linked offset + deriva en reposo (idle drift) — el hook compartido `useParallaxLayers` (usado por Eye/Aura) NO se toca ni se extiende: solo hace parallax de puntero y lo usan otras dos composiciones; tocarlo arriesga regresión en Hero. | Aísla el riesgo: un hook nuevo, scope propio, sin tocar el que ya sirve a Eye/Aura. |
| D5 | Se descarta la inclinación por giroscopio (`deviceorientation`) del paquete original. | iOS 13+ exige `DeviceOrientationEvent.requestPermission()` tras un gesto de usuario — no encaja en un fondo decorativo pasivo sin añadir un botón de permiso intrusivo. Sin precedente en el repo. Decisión tomada por el planificador, aceptada por el usuario en la aprobación de este documento. |
| D6 | Bajo `prefers-reduced-motion: reduce`, la escena queda COMPLETAMENTE congelada: no arranca ningún rAF (ni puntero ni scroll ni deriva), las capas quedan en su transform de reposo (`scale(overscan)`, sin traslación). | D12 del spec anterior ("guard reduced-motion que fuerza el estado final"), aplicado literalmente: no es una animación lenta, es CERO animación. |
| D7 | El pulso del núcleo (`08-heart-core`) es una `@keyframes` de `opacity` (6.5s ease-in-out), declarada ÚNICAMENTE dentro de `@media (prefers-reduced-motion: no-preference)` — mismo patrón que el `float` que ya usa `Story.tsx` en claro. | Consistencia con el propio archivo; no requiere bloque `reduce` explícito (nada que anular). |
| D8 | Se elimina la tarjeta flotante de nota (sparkle + `Home.story.note`) en oscuro: no tiene equivalente en esta composición. El texto de esa clave i18n se conserva, renderizado como línea de cierre bajo los pilares (sin tarjeta ni icono). Ninguna clave i18n se pierde ni se crea. | No hay sitio en la escena para una tarjeta flotando sobre la figura sin tapar el corazón o desentonar con el arte. Mantener la clave evita romper la paridad es/en. |
| D9 | `Home.story.figureAlt` deja de usarse en oscuro: la figura pasa a ser puramente decorativa (`aria-hidden`, como el ojo del Hero), no una `<img>` con alt. Sigue usándose en claro (sin cambios ahí). | Mismo criterio que `Eye`/`Aura`: arte de fondo decorativo, no contenido. |
| D10 | El degradado del titular (`STORY_ACCENT_GRADIENT`) se renombra a `STORY_ACCENT_GRADIENT_LIGHT` y se añade `STORY_ACCENT_GRADIENT_DARK` (paradas más claras/luminosas para contraste sobre el fondo casi negro). El resto de literales de `story.layers.ts` (halo, tarjeta) quedan SOLO para la rama clara — no se portan al oscuro, que no los usa. | El degradado actual (`L 0.56–0.72`) no tiene contraste suficiente sobre `oklch(0.05 ...)`; kicker/pilares/cuerpo YA resuelven contra tokens de tema y no necesitan variante. |
| D11 | El fondo de la escena usa un literal `oklch` fiel al `--void:#05030f` del paquete (excepción de color sancionada, mismo criterio que `EYE_SURFACE`), NO `semantic.bg` — para que el aditivo se componga tal como se generó el arte. | El aditivo se calibró contra ese negro concreto; `semantic.bg` en oscuro es un gris (`neutral[1100]`), no negro puro, y desviaría el resultado del arte. |
| D12 | Assets: origen → `assets/story-cosmic-heart/` (8 WebP + `manifest.json` con profundidad/blend/`share`, trazable al zip); despliegue → `public/story/cosmic-heart/<capa>.webp` (nativo 1672×941) + `<capa>-1024.webp` (generadas en esta sesión, 196 KB el track completo). | Mismo patrón exacto que `assets/hero-eye` + `public/hero/eye`. |

## 4. Composición (rama oscura de `Story.tsx`)

```
<ScStory id="story" aria-labelledby="story-title">     {/* sin cambios de tag/aria */}
  <ScDarkScene aria-hidden="true">                      {/* marco 1672/941, isolation:isolate */}
    <ScVoid />                                          {/* fondo oklch(0.05 ...), detrás de las capas */}
    {8× <ScLayer as="img" data-depth data-part ... />}   {/* orden 01→08, back→front */}
    <ScVignette />                                       {/* legibilidad del texto, fuera del grupo de blending */}
  </ScDarkScene>
  <ScDarkContent>                                        {/* superpuesto, columna única alineada a la izquierda */}
    kicker / h2 (titleLead + accent oscuro) / body / 4 pilares / nota (línea simple, sin tarjeta)
  </ScDarkContent>
</ScStory>
```

`ScDarkContent` reutiliza el `useReveal()` existente (mismo mecanismo de aparición al hacer scroll que ya tiene Story en claro) — la escena de fondo, en cambio, NO usa `useReveal`: está siempre presente y en movimiento propio (parallax), no aparece/desaparece.

## 5. Movimiento (hook nuevo, scope de esta composición)

- Puntero: reexporta el comportamiento de `usePointer()` (x/y normalizados −1..1, lerp, se apaga solo en táctil/reduced-motion).
- Scroll: offset adicional proporcional a cuánto ha atravesado la sección el viewport (`getBoundingClientRect().top` normalizado), multiplicado por la profundidad de cada capa — mismo espíritu que el `ParallaxScene.jsx` adjunto, sin la parte de `deviceorientation` (D5).
- Deriva en reposo: si no hay movimiento de puntero en >2.2s, una oscilación lenta (`sin`/`cos` de baja frecuencia) sustituye al target de puntero — igual que el paquete original.
- Un único `requestAnimationFrame` escribe `transform: translate3d(...) scale(...)` directamente en cada nodo (refs, sin estado de React) — mismo principio que `useParallaxLayers`/`Eye.tsx`: cero re-renders por frame.
- Bajo `prefers-reduced-motion: reduce`: el hook no registra NINGÚN listener ni arranca el rAF (D6) — mismo patrón que `usePointer`.

## 6. Tests (Vitest + Testing Library, sin snapshots)

- `Story.test.tsx` (extendido): montado con tema oscuro — 8 `<img>` decorativas dentro de un contenedor `aria-hidden`, título accesible y pilares idénticos a los de claro (mismo i18n), la nota renderizada como texto simple (sin `role`/tarjeta), SIN `getByAltText(figureAlt)` (ya no aplica en oscuro).
- Guard de reduced-motion: mismo patrón que el resto del archivo (inspección del CSS inyectado por texto, jsdom no evalúa `@media` — lección 2026-07-27) para el pulso del núcleo Y para el bloque que congela el rAF.
- `HomeSections.test.tsx`: en oscuro renderiza `Story` y NO renderiza `Journey`/`Features`/`Contact`; en claro sigue renderizando las 4 (sin cambios).
- Hook nuevo de parallax: test de la fórmula de scroll/deriva con mocks de `getBoundingClientRect`/`requestAnimationFrame` (mismo estilo que `useParallaxLayers.test.tsx`).
- `story.layers.test.ts` (si no existe, se crea): valida que `STORY_ACCENT_GRADIENT_LIGHT`/`_DARK` existen y que el manifest de capas cuadra con los 8 archivos publicados.

## 7. Definition of Done

- [ ] `pnpm test` completo en verde (sin regresión no explicada en el resto de la suite).
- [ ] `pnpm check` limpio (`typecheck` + `lint` + `check-format`) y `pnpm check-spelling` limpio.
- [ ] Verificación en navegador real: tema oscuro muestra la escena con las 8 capas, parallax de puntero/scroll/deriva funcionando, pulso del corazón, contenido legible sobre la viñeta; tema claro sin cambios visuales; toggle claro↔oscuro sin errores de consola; `prefers-reduced-motion` congela la escena por completo (verificar con la emulación del navegador).
- [ ] `graphify update .` tras los cambios de código.
- [ ] Árbol de trabajo limpio, commits temáticos en español (sin push salvo petición).
- [ ] Vault: entrada de Registro + esta spec referenciada desde `01-Projects/vti.md`.
