# VTI — Framework de interacción 3D · design spec

**Fecha:** 2026-07-24 · **Estado:** aprobado en brainstorm, pendiente de plan de implementación · **Proyecto:** `vti` (landing VoidToInfinite) · **Autor:** Daniel Mosquera + Claude Code

> Contrato, no sugerencia. Define el **viaje cinemático 3D** de la landing: escenas, movimientos de cámara, animaciones de objeto, hover/cursor, transiciones de sección, experiencia de carga, showcase y CTAs. **Para cada interacción se especifica trigger, duración, curva de easing y el problema UX que resuelve.**
>
> **Documento hermano y prerrequisito:** `2026-07-24-luxury-interface-system-design.md` (sistema de interfaz de lujo). Este framework **consume su token layer** — especialmente el lenguaje de movimiento (§9 de aquel spec). No define duraciones ni curvas propias: las referencia.

---

## 0 · Decisiones tomadas en el brainstorm (base de este spec)

| Eje | Decisión |
| --- | --- |
| Dirección | **Ancla + beats ganados.** El ojo cósmico es el momento estrella y persiste (encoge a marca en la esquina). Además, beats 3D **ganados** en momentos narrativos clave. Las secciones de contenido siguen en DOM plano y en calma. |
| Motor | **Three.js disciplinado.** El ojo se queda en **CSS/DOM** (ya funciona, cuesta ~0). Three.js entra como motor de los beats 3D ganados — permite object animations, camera moves y showcase reales. **Revisa conscientemente la decisión previa de OGL** (~15KB) → Three.js (~150KB, carga diferida), porque el alcance pedido lo justifica. |
| Alcance narrativo | **Arco completo de 4 escenas:** Hero · Descenso/Story · Sistema/Features · Invitación/Contact. Docs/Playground quedan como **enlaces externos** al proyecto `vti-sdk` (no se construyen aquí). |
| Rigor | Cada interacción declara **trigger · duración · easing · problema UX**. Si no resuelve un problema, no entra. |

**Restricción rectora:** _cada efecto debe servir a la historia; cero decoración por sí misma._ El espectáculo aparece donde se lo gana y **se retira** cuando estorba.

---

## 1 · Hecho verificado: el punto de partida real

Antes de diseñar, se auditó el repo y la referencia. Esto corrige una afirmación del handoff original (`VoidToInfinite Website OS`):

- **El `Cosmic Eye Hero` de referencia NO es WebGL ni Three.js.** Es **CSS/DOM puro**: `clip-path` para el almendro, `radial-gradient` para nebulosa y ~20 estrellas, `conic-gradient` para el remolino del iris, keyframes CSS, y un `requestAnimationFrame` pequeño para el _gaze_ (parallax con lerp) y el _pulse_ periódico. Ya respeta `prefers-reduced-motion`.
- El spec original afirma "R3F + fragment shader, single draw call": **es aspiracional, no lo que existe**. Lo que existe es liviano y funciona.
- **Consecuencia de diseño:** el ojo se **porta** a React tal cual (CSS), no se reescribe en shader. Three.js se reserva para lo que el CSS no puede: profundidad real, cámara y campos de partículas.

Estado del repo hoy: Next.js 16 (export estático), React 19, styled-components; página única `Navbar + Hero + About + Footer`; **sin Three.js ni librería de animación instalada**; sin las secciones Story/Features/Contact.

---

## 2 · La espina narrativa: 4 escenas

**vacío → foco → sistema → invitación.**

| # | Escena | Motor | Rol narrativo |
| --- | --- | --- | --- |
| 1 | **Hero — El Ojo** | CSS/DOM (+ campo Three.js de fondo) | Detener al visitante; establecer asombro y qué es esto |
| 2 | **Descenso — Story** | **Three.js** (el beat canónico) | Convertir el scroll en "entrar en el vacío" |
| 3 | **Sistema — Features** | Three.js → DOM | Probar sustancia: el sistema se materializa; empuja al playground |
| 4 | **Invitación — Contact** | DOM plano | El espectáculo se retira; la petición queda imposible de no ver |

**Continuidad:** pasada la escena 1, el ojo **encoge a marca-esquina** (transform/opacity) y acompaña el resto del viaje. Es el mecanismo que cose las 4 escenas: una identidad continua, no un hero que se abandona.

**North-star:** todo embudo hacia **explorar los componentes** (playground). "Leer la historia" y "contactar" son secundarios.

---

## 3 · Política de motor (qué corre en qué, y por qué)

| Capa | Motor | Justificación |
| --- | --- | --- |
| Ojo (párpado, iris, pupila, glints, gaze, pulse) | **CSS/DOM** | Ya existe y funciona; resolución-independiente; degrada solo. Reescribirlo en shader sería sobre-ingeniería. |
| Logo en la pupila | **DOM/SVG** | Nítido, seleccionable, accesible. |
| Campo estelar profundo, descenso, cámara, assembly | **Three.js** | Profundidad real, cámara perspectiva y partículas: el CSS solo las finge. |
| Copia, CTAs, cards, nav, formularios | **DOM plano** | Usable, accesible, indexable. La calma que hace que el ojo se sienta caro. |

**Regla dura:** si un efecto puede lograrse en DOM/CSS sin perder su función narrativa, **se hace en CSS**. Three.js debe justificar cada aparición.

---

## 4 · Vocabulario de movimiento (heredado, no reinventado)

Del sistema de lujo, §9. **Este spec no define curvas ni duraciones nuevas**, salvo el modo `scrubbed`.

**Duraciones:** `fast` 100ms · `base` 200ms · `slow` 320ms · `slower` 480ms · `ambient` 1500ms+. **Curvas:** `standard` `cubic-bezier(0.4,0,0.2,1)` · `decelerate` `cubic-bezier(0,0,0.2,1)` · `accelerate` `cubic-bezier(0.4,0,1,1)` · `emphasized` `cubic-bezier(0.2,0,0,1)`. **Modos añadidos aquí:**

- `scrubbed` — progreso ligado al scroll (0→1), **sin duración propia**: el usuario controla el tiempo. Nunca secuestra el scroll.
- `lerp` — suavizado por frame hacia un objetivo (factor ~0.085/frame ≈ 85ms de asentamiento percibido a 60fps). Para seguimiento de cursor.

**Reglas duras:** solo `transform`/`opacity` en DOM; en Three.js, solo posición/rotación/uniforms (sin reconstruir geometría por frame). El foco **nunca** se anima.

---

## 5 · Escena 1 — Hero · El Ojo

**Qué se ve:** el ojo cósmico casi a pantalla completa; el logo flotando en la pupila; copia y CTA primario debajo.

**Cómo guía al visitante:** el ojo _te mira_ → reciprocidad. Su geometría concentra la mirada en el centro exacto donde está el logo y, justo debajo, el CTA. Marca y "qué es esto" se leen de un vistazo.

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **Iris breathing** | idle (siempre) | ~5s loop (`ambient`) | `standard` in-out | CSS | El sistema está vivo y observa antes de cualquier input; ancla focal en calma |
| **Deep-space field** | idle drift, tras carga | realtime continuo | `lerp` | **Three.js** | Profundidad real tras el ojo (no un degradado plano); prepara el descenso |
| **Copy stagger-rise** | load | `base` + stagger 120ms | `decelerate` | DOM | Fija orden de lectura y jerarquía; guía la vista de arriba abajo |
| **Scroll cue** | idle en el top | 1.9s loop (`ambient`) | `standard` | CSS | Affordance: indica que la página continúa bajo el pliegue |

**Reduced-motion:** breathing congelado a mitad de dilatación; field estático; copia aparece instantánea; cue oculto.

---

## 6 · Object animations

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **Logo dock float** | idle | ~6s loop (`ambient`) | `standard` in-out | CSS | Riqueza focal en la pupila sin robar atención al logo |
| **Starfield drift** | idle | continuo (`ambient`) | `linear` | **Three.js** | Espacio vivo: el vacío nunca se lee como muerto |
| **Component assembly** | scroll → Features | `slow` + stagger 120ms | `emphasized` | **Three.js** → DOM | "El sistema se enfoca desde el vacío", hecho literal |

**Reduced-motion:** todos los loops congelados; assembly → aparición por opacidad.

---

## 7 · Hover y efectos de cursor

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **Gaze parallax** | `pointermove` (ventana) | realtime (asentamiento ~85ms) | `lerp` | CSS | Reciprocidad: el ojo reconoce tu presencia y premia estar ahí |
| **Cursor-reactive field** | `pointermove` | realtime | `lerp` | **Three.js** | El vacío reacciona a ti; recompensa la exploración |
| **Magnetic CTA** | puntero dentro del radio del botón | `fast` | `standard` | CSS | Atrae la mano hacia la acción north-star |
| **Showcase item hover** | raycast sobre objeto / hover DOM | `fast` | `standard` | Three.js / DOM | Señala que el showcase es explorable (target de foco) |

**Táctil:** en dispositivos sin puntero fino (`hover: none`), gaze y magnetic se **desactivan** (no hay cursor que seguir). El pulse por tap los sustituye como feedback. **Reduced-motion:** gaze, field-reactivo y magnetic desactivados; hover queda en cambio de color/borde, sin desplazamiento.

---

## 8 · Movimientos de cámara ligados al scroll

**El beat canónico.** Una **única** cámara perspectiva; el descenso y los ajustes por sección son la misma cámara con progreso `scrubbed`.

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **El Descenso** | scroll 0→1 al salir del hero | `scrubbed` (usuario) | mapeo ease sobre el progreso | **Three.js** | Convierte el scroll en "entrar en la pupila": el puente narrativo marca→contenido |
| **Depth parallax** | scroll continuo | `scrubbed` | `linear` | **Three.js** | La profundidad refuerza que es un viaje real, no un fondo que se mueve |
| **Camera settle** | umbral de scroll (Story→Features) | `scrubbed` → `base` al asentar | `decelerate` | **Three.js** | Marca la llegada al "sistema"; cierra el movimiento en calma, sin marear |

**Contrato:** el scroll **nunca** se secuestra (sin scrolljacking, sin scroll infinito falso). El usuario controla la velocidad; si se detiene, la escena se detiene. **Reduced-motion:** el descenso completo degrada a un **fundido de opacidad** entre secciones. Sin movimiento de cámara.

---

## 9 · Transiciones de sección

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **Section reveal** | `IntersectionObserver` enter (threshold 0.2) | `slow` + stagger 120ms | `decelerate` | CSS (`useReveal`) | Una idea a la vez: baja la carga cognitiva y dirige la atención |
| **Void → System** | scroll Story→Features | `base`/`slow` | `emphasized` | **Three.js** → DOM | Significado desde el vacío; entrega la atención al CTA del playground |
| **Eye → corner mark** | scroll pasado el hero | `base` | `standard` | CSS | Continuidad de identidad en todo el viaje (no un hero desechable) |

**Reduced-motion:** reveals se muestran sin transform (solo opacidad o directamente visibles); el encogimiento del ojo es instantáneo.

---

## 10 · Experiencia de carga

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **Poster → live** | canvas Three.js listo | `base` | `decelerate` | ambos | Upgrade elegante; evita el flash de canvas vacío |
| **Skeleton shimmer** | contenido async (previews) | loop `ambient` | `linear` | CSS | Rendimiento percibido; comunica "viene contenido", no "está roto" |
| **Fallback no-WebGL / reduced-motion** | detección de capacidad | instantáneo | — | póster estático | El contenido nunca queda bloqueado por el espectáculo |

**Secuencia de arranque (contrato):**

1. HTML estático (SSG) pinta **ya**: copia, CTA, nav. Nada espera a JS.
2. El **ojo CSS** aparece de inmediato (sin coste de red más allá del CSS).
3. Three.js se carga **en diferido** (fuera del bundle inicial); mientras, se ve el póster.
4. Cuando la escena está lista → `poster → live` con `base`/`decelerate`.

**Regla:** el LCP no puede depender de Three.js. Si la escena nunca carga, el sitio está completo y usable.

---

## 11 · Product showcase (Features)

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **Assembly desde profundidad** | scroll into view | `slow` + stagger 120ms | `emphasized` | **Three.js** → DOM | El sistema se materializa desde el vacío; culmina en "abrir el playground" |
| **Item hover-lift** | hover / focus | `fast` | `standard` | DOM | Feedback de que el item es un target; invita a explorar (north-star) |

**Nota de veracidad (importante):** los componentes reales de `vti-sdk` **viven en otro repo**. El showcase usa **cards/previews representativas + enlace al playground**, enmarcadas por el beat de assembly. **No se inventan componentes ni métricas** que no existen en este proyecto. Si más adelante se integran previews reales, se hará por enlace o embed explícito, no simulando.

---

## 12 · CTA animations

| Interacción | Trigger | Duración | Easing | Motor | Problema UX que resuelve |
| --- | --- | --- | --- | --- | --- |
| **CTA primario aparición** | tras el copy stagger (load) | `base` | `decelerate` | DOM | Presenta la acción north-star en su momento de máxima atención |
| **CTA press** | click / tap | `fast` | `standard` | CSS | Confirmación táctil (reutiliza `press`, scale .98, del sistema de lujo) |
| **Click pulse (ojo)** | click / tap sobre el ojo | `slower` con decaimiento | `accelerate`-out | CSS | Prueba táctil de que la superficie está viva y responde |

**Reduced-motion:** aparición instantánea; press colapsa a ~0ms; pulse desactivado.

---

## 13 · Contrato de ingeniería (la escena Three.js)

- **Una sola escena / un solo grafo**, una **cámara perspectiva**. Descenso y ajustes por sección son la **misma** cámara con progreso ligado al scroll.
- **Starfield** = `Points` instanciado → **un draw call**. Sin reconstruir geometría por frame.
- **`devicePixelRatio` capado a 2.**
- **Pausa del render loop** cuando el canvas sale del viewport (`IntersectionObserver`) **y** cuando la pestaña está oculta (`visibilitychange`).
- **React nunca re-renderiza el canvas:** el estado va por refs/uniforms, no por `useState` por frame.
- **Carga diferida** de Three.js: import dinámico; no entra en el bundle inicial.
- **Póster PNG** (existen candidatos: las nebulosas generadas) como fallback sin-WebGL y como still de `reduced-motion`.
- **Canvas `aria-hidden="true"`**: es decoración. Todo lo que comunica está también en DOM semántico.
- **Sin scrolljacking.** El scroll nativo manda siempre.

---

## 14 · Responsive

| Rango | Ojo | Escena 3D | Motion |
| --- | --- | --- | --- |
| ≤ 640 (móvil) | ~55% superior del viewport, copia en scrim debajo | densidad de partículas reducida; descenso simplificado | sin gaze ni magnetic (táctil); pulse por tap |
| 641–1024 (tablet) | centrado, ~70% de alto | escena completa, DPR ≤ 2 | completo salvo cursor |
| ≥ 1025 (desktop) | full-bleed, anclado a los dos tercios superiores | escena completa | completo |

**El ojo se re-ajusta, no se recorta:** la silueta permanece entera en cualquier viewport — es lo que la hace reconocible como marca igual en móvil que en 4K.

---

## 15 · Accesibilidad (el espectáculo nunca bloquea el contenido)

- `prefers-reduced-motion` **global**: ojo congelado al póster; descenso → fundido; sin parallax/magnetic/pulse; loops ambiente detenidos.
- **Sin WebGL** → póster estático; **cero contenido perdido**.
- Canvas `aria-hidden`; toda la información vive en DOM semántico, navegable por teclado.
- Foco: anillo `:focus-visible` 2px del sistema de lujo, **nunca animado**.
- Targets ≥ 44px. Una `<h1>` por página. Landmarks y headings en orden.
- **i18n:** todo string por i18next (es/en a la par); cero copia hardcodeada.
- **Sin scrolljacking** — requisito de accesibilidad, no solo de gusto.

---

## 16 · Estructura de archivos propuesta

```
src/three/
├─ Scene.tsx            canvas + ciclo de vida (pausa offscreen / hidden tab)
├─ starfield.ts         Points instanciado + drift
├─ camera.ts            mapeo de progreso de scroll → cámara
└─ poster.png           fallback no-WebGL / reduced-motion
src/components/eye/
├─ Eye.tsx              ojo CSS portado (gaze, pulse, breathe)
└─ EyeCornerMark.tsx    la marca-esquina persistente
src/hooks/
├─ useScrollProgress.ts progreso 0→1 por sección (scrubbed)
├─ useReveal.ts         (ya en el plan del sistema de lujo)
└─ usePointer.ts        posición de puntero suavizada (lerp), no-op en táctil
src/components/sections/
└─ Hero · Story · Features · Contact
```

---

## 17 · Dependencias y coste

| Dependencia | Peso | Justificación |
| --- | --- | --- |
| `three` | ~150KB (carga diferida) | Motor de los beats ganados: cámara real, partículas, assembly |

**Decisión consciente:** sustituye la elección previa de OGL (~15KB). El alcance pedido (object animations, camera moves, showcase) lo justifica. **Mitigación obligatoria:** import dinámico, fuera del bundle inicial, LCP independiente de Three.js.

**No se añaden** librerías de animación DOM (framer-motion, GSAP): el lenguaje de movimiento se resuelve con CSS + los tokens del sistema de lujo.

---

## 18 · Dependencia del sistema de lujo

Este framework **no puede implementarse antes** que el sistema de interfaz de lujo:

- Consume sus **tokens de motion** (duraciones, curvas) — §4.
- Consume `useReveal` (section reveal) y sus **componentes** (Button para los CTAs, Card para el showcase).
- Consume su **capa semántica** de color y el anillo de foco.

**Orden correcto:** sistema de lujo (P0/P1) → este framework (P2–P4).

---

## 19 · Decisiones abiertas / entradas pendientes del usuario

Estas quedan **explícitamente por completar** (protocolo de veracidad: no se inventan):

- **Copia es/en** de Story, Features y Contact. El spec deja el andamiaje i18n; los claims reales los aporta el usuario. → `_por completar_`
- **Enlaces reales de CTA:** playground, docs, GitHub, email. → `_por completar_`
- **Póster definitivo:** elegir entre las nebulosas ya generadas o exportar un primer frame de la escena.
- **Densidad de partículas por rango de dispositivo:** valores a calibrar midiendo en móvil de gama media (no se fijan a ojo).

---

## 20 · Checklist de handoff

- [ ] El ojo es CSS/DOM portado, no reescrito en shader
- [ ] Three.js aparece solo en los beats ganados; carga diferida
- [ ] Una sola escena, una sola cámara, starfield en un draw call
- [ ] DPR ≤ 2; render loop pausa offscreen y con pestaña oculta
- [ ] Póster estático para no-WebGL y reduced-motion
- [ ] Cero scrolljacking; el scroll nativo manda
- [ ] Toda animación declara trigger · duración · easing · problema UX
- [ ] Duraciones y curvas vienen del sistema de lujo (no se inventan)
- [ ] Canvas `aria-hidden`; contenido completo sin WebGL
- [ ] `prefers-reduced-motion` colapsa todo; foco nunca animado
- [ ] Todo string por i18n (es/en); ningún claim inventado en el showcase
- [ ] LCP no depende de Three.js

---

_VoidToInfinite · framework de interacción 3D · v1.0 · cabalga sobre el sistema de interfaz de lujo._
