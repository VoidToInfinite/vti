# QA pendiente — viaje 3D (checklist para un humano con navegador real)

> **AVISO (añadido 2026-08-09): las secciones §1-§7 están OBSOLETAS.** Describían la escena WebGL «El Descenso» (Three.js), retirada del repo por completo en la entrega Landing v2 del 2026-07-28 (ver la nota "2026-07-28 — Retirada de Three.js" más abajo, que ya lo declaraba a nivel de sección pero quedaba enterrada a mitad de documento). `src/three/` ya no existe, no hay `starfield.ts` que calibrar ni escena WebGL que perfilar: nada de §1-§7 es accionable hoy — sus casillas abiertas se han neutralizado in situ (marcadas `N/A`, sin marcarlas `[x]` ni borrar el enunciado: nadie las verificó, dejaron de tener sentido) para que no se lean como pendientes de un QA real. El QA visual vigente de las secciones actuales de la home vive en `PRE-LAUNCH-QA.md` §6. **Cifra corregida 2026-08-12 (Task 25):** la cifra de "96 ítems numerados 1-49" que esta nota traía hasta hoy era incorrecta en las dos partes — el propio rango 1-49 solo suma 49 ítems, no 96 (posible confusión con un recuento de casillas incluyendo alguna otra sección, nunca reconciliada); contando literalmente las casillas de `PRE-LAUNCH-QA.md` §6 hoy (`grep -cE '^\s*-\s*\[[ x]\]'` acotado a esa sección) da **60 ítems** (numerados 1-59, más el 40.b) tras las ampliaciones del 2026-08-09 (Tareas 1-13 de la auditoría premium, +8), del 2026-08-11 (Task 15 del plan premium F1-F5, +2) y del 2026-08-12 (Tasks 16-35 del mismo plan, +8, Task 25). §8 en adelante (jerarquía del Hero, coreografía de carga/tema, Navbar/Logo/CTAs, Landing v2) sigue vigente y se conserva sin cambios: no depende de Three.js.
>
> **Petición de perfil de FPS actualizada** (sustituye a la de §1-§2, que pedía perfilar el descenso WebGL): las dos escenas de sección con más capas animadas hoy son `storyCosmicBeing` (11 capas: 1 base opaca `blend: "normal"` + 10 aditivas `blend: "plus-lighter"`, verificado en `src/components/scenes/storyCosmicBeing/storyCosmicBeing.layers.ts`) y `featuresCelestialOrbital` (7 capas, todas con blend `"normal"` — sin `mix-blend-mode`, D12 de su spec —, verificado en `src/components/scenes/featuresCelestialOrbital/featuresCelestialOrbital.layers.ts`). Nadie ha perfilado el coste de compositor de ninguna de las dos en un navegador real. Cómo: DevTools → Performance, grabar ~5s de scroll continuo por Story (oscuro) y por Features (oscuro) por separado, comparar FPS medio, tiempo de scripting/pintado por frame y long tasks entre las dos — la hipótesis a confirmar o refutar es si el blending aditivo de 10 capas de Story cuesta perceptiblemente más que las 7 capas sin blend especial de Features, y si alguna de las dos cae por debajo de 55 FPS sostenidos.

> **Por qué existe este documento:** el spec (§14/§19) pedía calibrar la densidad de partículas (`starCountForViewport` en `src/three/starfield.ts`) _midiendo_ FPS reales en escritorio y en un móvil de gama media, y hacer QA visual de `prefers-reduced-motion` y del fallback sin WebGL. El entorno en el que se implementó la task 3D·T13 no puede componer frames de navegador: no hay render real, no hay captura de rendimiento, no hay forma de ver el resultado. Se verificó dos veces y quedó confirmado por un implementer anterior. Los valores de `starCountForViewport` que quedaron en el código son **defaults conservadores sin medir**, no una calibración validada. Protocolo de veracidad del proyecto: no se inventan cifras de FPS ni se afirma haber visto algo que no se vio. Esta checklist es el trabajo real que falta, con instrucciones concretas de cómo hacerlo y qué cuenta como correcto.

Marca cada casilla solo tras comprobarlo de verdad en un navegador real (no en este entorno de agente).

---

## 1. FPS del descenso (escritorio)

**Cómo:**

1. `pnpm build && pnpm start` (sirve el export estático en `http://localhost:3000`, o el puerto que indique `serve`).
2. Abre la página en Chrome/Edge de escritorio, DevTools → pestaña **Performance**.
3. Pulsa grabar, haz scroll continuo por la escena de "El Descenso" durante ~5 segundos, para de grabar.
4. Lee en el resumen: **FPS medio**, **tiempo de scripting por frame**, y si el panel marca **long tasks** (barras rojas sobre 50 ms).

**Qué se considera correcto:** FPS medio ≥ 55 sostenido durante el scroll, sin long tasks recurrentes durante el tramo del descenso.

**Si baja de 50 FPS:** reduce los valores de `starCountForViewport` en `src/three/starfield.ts` (los cortes actuales — 500 / 900 / `DEFAULT_STAR_COUNT` = 1200 — son el punto de partida, no un suelo). Vuelve a medir tras el cambio.

- [N/A] Medido en escritorio. Dispositivo/navegador: **\_\_\_**. FPS medio: **\_\_\_**. Long tasks: **\_\_\_**.

---

## 2. FPS del descenso (móvil de gama media)

**Cómo (dos opciones, la primera es más fiel):**

- **Dispositivo real:** sirve el build en la red local (`pnpm start` ya expone el puerto; usa la IP de tu máquina, ej. `http://192.168.x.x:3000`, desde el móvil en la misma red) y repite la grabación de la sección 1 usando las DevTools remotas de Chrome (`chrome://inspect` desde el equipo, conectado el móvil por USB) o simplemente observando fluidez a ojo si no hay forma de perfilar.
- **Alternativa sin dispositivo físico:** DevTools → Performance → icono de engranaje → **CPU: 4x slowdown**, y repite la grabación de la sección 1 en el mismo Chrome de escritorio.

**Qué se considera correcto:** FPS medio ≥ 50 durante el scroll del descenso.

**Si baja de 50 FPS:** reduce `starCountForViewport` para el rango `<=640` (móvil) primero; si con eso no basta, reduce también el rango `<=1024`. Documenta el valor final elegido y por qué.

- [N/A] Medido en móvil/throttling. Dispositivo o throttling usado: **\_\_\_**. FPS medio: **\_\_\_**. ¿Se ajustó `starCountForViewport`? **\_\_\_** (valores antes → después).

---

## 3. `prefers-reduced-motion` — verificar una por una

Activa la preferencia (macOS: Ajustes → Accesibilidad → Pantalla → Reducir movimiento; Windows: Configuración → Accesibilidad → Efectos visuales → Animaciones desactivadas; o en Chrome DevTools → Cmd/Ctrl+Shift+P → "Emulate CSS prefers-reduced-motion: reduce"), recarga la página, y comprueba:

- [N/A] **El ojo no respira ni sigue al cursor.** Mueve el ratón sobre el hero: el iris no debe desplazarse hacia el puntero, y no debe haber ninguna pulsación/escala periódica visible en el ojo.
- [N/A] **El descenso no ocurre: se ve el gradiente.** Haz scroll por la sección de "El Descenso": la cámara no debe avanzar ni aparecer el campo de estrellas — debe quedarse visible el gradiente CSS de fondo (el fallback de `SceneLoader`, no una imagen — no busques un `.webp`).
- [N/A] **Los reveals de sección aparecen sin desplazamiento.** En Story y Features (las secciones que usan reveal por scroll), el contenido debe aparecer/desaparecer (cambio de opacidad) sin ningún desplazamiento vertical/horizontal al entrar en viewport.
- [N/A] **El anillo de foco sigue visible al tabular.** Con el teclado (`Tab` desde el principio de la página), cada control interactivo (enlaces, botones, inputs, toggles) debe mostrar un anillo de foco claramente visible (2px, color `theme.data.semantic.focus`, con offset) en cada parada. Confirma explícitamente que reduced-motion no lo atenúa ni lo hace desaparecer — el foco **nunca** se anima ni se suprime, con o sin reduced-motion.

---

## 4. QA sin WebGL

**Cómo:** en Chrome, `chrome://flags` → deshabilita "WebGL"/"WebGL2", o usa un navegador que no soporte WebGL (o DevTools → Rendering → "Disable WebGL" si tu versión lo expone), y recarga la página desde cero.

- [N/A] **Se ve el gradiente CSS** en la zona del canvas (no un rectángulo vacío/negro).
- [N/A] **No falta ningún contenido.** Recorre la página entera: toda la copia (Hero, Story, Features, Contact), todos los CTAs y todos los enlaces (Socials, Navbar) siguen presentes.
- [N/A] **Todo es navegable por teclado.** `Tab` a través de toda la página sin WebGL: cada CTA, cada link, cada control debe ser alcanzable y activable (`Enter`/`Space`), con el mismo anillo de foco visible del punto anterior.

---

## 5. Aspecto visual real (nadie lo ha visto todavía)

Nada de esto lo ha podido comprobar ningún agente de este entorno — es la primera vez que un ojo humano ve el resultado real:

- [N/A] **Composición del ojo (hero):** el hero monta las cinco capas de `public/hero/eye/*.webp` con blending aditivo. Confirma que el resultado se ve como la imagen de referencia (`assets/hero-eye/`, composición completa): párpado, campo de nebulosa, corona e interior de la pupila, sin costuras ni halos entre capas y sin banda visible por la compresión WebP en los degradados oscuros.
- [N/A] **Encuadre en vertical:** en móvil el marco se amplía al 185% del ancho (recorta las puntas del párpado a propósito). Confirma que el encuadre resultante se sostiene y que la copia queda dentro del ojo, no desbordándolo.
- [N/A] **Contraste de la copia sobre la corona:** los párrafos del hero son más anchos que la pupila y sus extremos caen sobre la corona iluminada. Hay velo radial + sombra de texto, pero **el contraste real no se ha medido en píxeles**: comprueba con un medidor de contraste sobre captura real que el texto pasa AA (4.5:1) también en los extremos de línea.
- [N/A] **`plus-lighter` vs `screen`:** el aditivo usa `plus-lighter` con fallback a `screen` (`@supports`). Comprueba el hero en un navegador sin `plus-lighter` (Firefox < 122) y confirma que la diferencia no es perceptible.
- [N/A] **Parallax al cursor:** mueve el ratón sobre el hero (con reduced-motion **desactivado**) y confirma que las capas siguen al puntero de forma suave (lerp, sin saltos ni jitter), que la pupila se mueve más que el párpado, y que ninguna capa deja ver un borde transparente al desplazarse.
- [N/A] **Pulso al click** (versión corta — duplicado del ítem "Pulso al click" más abajo en esta misma sección, que lo amplía con el detalle de Wormhole/Sol; señalado 2026-08-12, Task 25, sin borrar ninguno de los dos): un click/tap sobre el fondo del hero dispara el anillo que se expande desde la pupila, y se puede repetir inmediatamente.
- [N/A] **Transición póster → escena viva:** confirma que el fundido de opacidad entre el gradiente CSS y el canvas de Three.js (cuando WebGL y reduced-motion lo permiten) no produce un salto de color perceptible.
- [N/A] **Marca-esquina persistente (`EyeCornerMark`):** al pasar el hero, confirma que la marca aparece de forma legible y no se superpone de forma confusa con el contenido siguiente.
- [N/A] **Mascota del centro del ojo:** en tema **oscuro** el centro lo ocupa el `Wormhole` portado de `vti-sdk` (remolino + 4 anillos + núcleo); en **claro**, `Sol` (halo, corona, 12 rayos, núcleo blanco y, cada 8 minutos o al hacer click, la cara brújula). Ocupan exactamente el diámetro de la pupila pintada: confirma que el anillo exterior del Wormhole cae sobre el borde de la pupila sin leerse como un recorte, y que el halo de Sol (que se sale de su caja por diseño, 165%) no invade el párpado.
- [N/A] **La mascota sigue al cursor con la pupila:** mueve el ratón sobre el hero (reduced-motion **desactivado**) y confirma que la mascota se desplaza **exactamente igual** que la pupila pintada — misma profundidad de parallax — sin despegarse del pozo ni arrastrarse por detrás. Verificado en test unitario conduciendo el rAF a mano; en un navegador real no lo ha visto nadie.
- [N/A] **Sol contra la copia:** el velo de contraste del hero apaga justo el centro, que es donde Sol tiene su núcleo blanco, y ahora que la mascota cabe dentro de la pupila queda entera bajo el velo. Decisión tomada a favor de la legibilidad del texto: mira si el sol queda demasiado apagado y si compensa aflojar el velo (`ScScrim` en `Hero.tsx`).
- [N/A] **Pulso al click** (versión larga — duplica y amplía el ítem "Pulso al click" de más arriba en esta misma sección; señalado 2026-08-12, Task 25): en oscuro la respuesta al click es la coreografía completa del Wormhole (destello del remolino, anillos que fulguran, dos ondas de choque escalonadas a 1200/1300ms); en claro es el anillo simple del ojo, y además Sol gira y cambia de cara. Comprueba los dos, y que un segundo click vuelve a disparar.
- [N/A] **Navbar sobre el hero:** arriba del todo la barra debe ser invisible (solo su contenido flotando sobre la composición) y al empezar a scrollear debe aparecer el cristal esmerilado. Comprueba los dos temas. En **tema claro** el cambio de color del texto de la barra ocurre en el mismo umbral que el cristal (8px): confirma que la transición no se lee como un parpadeo — el fondo se funde en 200ms y el color salta de golpe, y ese desfase solo se puede juzgar mirándolo.

---

## 6. Peso y LCP del hero

Las capas pesan **400 KiB** en la pista de 1672px y **224 KiB** en la de 1024px (medido con `du` sobre `public/hero/eye/`). La selección la hace el navegador con `srcset`/`sizes`, y `sizes` declara 60vw por debajo de 700px a propósito para que ningún móvil se lleve la pista grande.

- [N/A] **LCP medido:** Lighthouse o DevTools → Performance sobre el build de producción. Anota el LCP y qué elemento lo produce.
- [N/A] **Pista servida en móvil:** DevTools → Network, emulando un móvil, confirma que se descargan los `-1024.webp` y **no** los de 1672px.

**Si el LCP no cumple:** el primer recorte razonable es bajar la calidad de las capas 01/03/04 (las tres pesadas) o añadir una pista intermedia; el script de conversión y su verificación de recomposición están descritos en el registro del vault de esta sesión.

---

## 7. Deuda 3D todavía abierta

No se ha tocado en esta pasada, a la espera de tener la escena completa y correcta:

- [N/A] Tests de `src/three/Scene.tsx`.
- [N/A] Render loop en idle (la escena sigue pintando aunque no haya cambios ni esté en viewport).
- [N/A] Carga diferida por tiempo del módulo de Three.js.
- [x] **Contraste de Story en tema claro — RESUELTO el 2026-07-25.** El síntoma registrado era real: `Story` monta el póster oscuro de `SceneLoader` y su copia usaba `semantic.text`, que en tema claro es casi negro (verificado en navegador: `oklch(0.32 0 286)` sobre el póster oscuro). Se ha resuelto con el mismo patrón que el hero: `Story.tsx` anida un `ThemeProvider` con el tema oscuro (`storyTheme`, constante de módulo con su justificación por escrito en el propio archivo), de modo que **todo** token dentro de la sección resuelve al valor diseñado para fondo oscuro en los dos temas de página. Cubierto por test (`Story.test.tsx`: la copia computa `semanticDark.text` renderizando bajo el `ThemeProvider` **claro** de la app, y `contrastRatio` ≥ 4.5:1 contra `semanticDark.bg`, contra el negro del hero y contra la parada más clara del póster tomada como opaca). **Sigue vivo arriba** (§8) el caso que esto NO cubre: el texto sobre la escena 3D **viva** en sus frames más claros, que solo se puede medir en píxeles con un navegador real.

---

## 8. Entrega 2026-07-25 — jerarquía del Hero y costura Hero→Story

**Qué entró:** el Hero pasa de dos párrafos con el mismo tratamiento visual a cuatro escalones (kicker, título, subtítulo, apoyo) con su propio ritmo vertical; y la junta Hero→Story deja de ser un corte gracias a una rampa de 10rem repartida entre un pie negro en el hero (`ScHeroFoot`, `space[8]` = 4rem) y una costura al inicio de Story (`ScSeam`, `space[9]` = 6rem), más el tema oscuro anidado en Story.

**Corrección aplicada en revisión (misma entrega):** la primera versión de `ScSeam` interpolaba de `EYE_SURFACE` a `semantic.bg` y ocultaba el tramo claro con una `mask-image` opaca hasta el 45%. Eso pintaba los primeros 2,7rem con un gris de hasta ~L 0.10 — **más claro** que el borde superior del póster (~L 0.05) —, es decir un realce justo debajo de la junta, más una discontinuidad de pendiente de la alfa en el 45%. Se sustituyó por una sola declaración monótona (`linear-gradient(to bottom, EYE_SURFACE 0%, transparent 100%)`), que compone `L(p) = p × lo-que-haya-debajo`. Esto **elimina** el ítem de QA sobre `mask-image` en Safari/Firefox que figuraba aquí: ya no hay `mask-image` ni propiedades con prefijo de fabricante en la costura.

**Qué NO se pudo verificar aquí y por qué:** el entorno de agente en el que se implementó no compone frames (`document.hidden === true`, rAF pausado, transiciones CSS congeladas, sin capturas). **Además, ningún flujo de esta entrega dispuso de herramienta de navegador**: las mediciones por `getBoundingClientRect` que exigían los criterios TRANSICIÓN-1 y TRANSICIÓN-3 **no se han hecho**, ni siquiera contra un dev server; están inferidas de la estructura del DOM y del CSS, no medidas. Lo verificado se verificó con la suite de tests (jsdom + `getComputedStyle`, que no hace layout: todos los rects son 0). **Nada de lo de abajo se ha visto ni medido.** Marca cada casilla solo tras comprobarlo en un navegador real.

### 8.a Mediciones bloqueantes (no son apariencia: son números)

Estas dos son **bloqueo de despliegue**, no casilla estética. Se hacen en la consola del navegador sobre `pnpm dev` (o el build) y se anotan los números obtenidos.

- [x] **La costura nace exactamente donde acaba el hero.** _Medido el 2026-07-25 en el navegador del entorno de agente (Chromium, 1280×720 y 375×812)._ A 1280×720: `bottom` del hero = **720 px**, `top` de la costura = **720 px** → diferencia **0 px**, alto de la costura **96 px** (6 rem). A 375×812: `bottom` del hero = **812 px**, `top` de la costura = **812 px** → diferencia **0 px**. Cumple en los dos. Sigue el enunciado original por si hay que repetirlo: `const h = document.querySelector('section:has(#hero-title), header + section') ?? document.querySelectorAll('section')[0]; const s = document.querySelector('[data-testid=story-continuity]'); h.getBoundingClientRect().bottom - s.getBoundingClientRect().top` → _Correcto_ = |diferencia| ≤ 1px **y** `s.getBoundingClientRect().height > 0`. _Incorrecto_ = cualquier hueco o solape: la rampa dejaría de ser continua y volvería a verse la junta. Medido: **\_\_\_** px, alto: **\_\_\_** px.
- [x] **El título de Story no queda bajo el navbar al saltar al ancla.** _Medido el 2026-07-25, con una salvedad que hay que leer._ `getComputedStyle(document.querySelector('#story')).scrollMarginTop` = **56 px**: la regla de `GlobalStyles` sí llega al navegador real (lo que no llega es a jsdom, ver la nota de abajo). **Salvedad:** el scroll suave NO avanza en este panel, que no compone frames, así que activar el ancla dejó `scrollY` en 0 y esa medición habría sido falsa. Se reprodujo el aterrizaje aritméticamente — `scrollTo(story.offsetTop - scrollMarginTop)` = **664 px**, que es exactamente donde el navegador deja el ancla — y ahí: `#story` arranca en `top` = **56 px** (justo bajo la barra) y `#story-title` en `top` = **367 px**, o sea **311 px de holgura** sobre los 56 px del navbar. Queda por confirmar en un navegador que sí anime el scroll que el aterrizaje real coincide con el calculado. Enunciado original: `location.hash = '#story'`, esperar al scroll, y comparar `document.querySelector('#story-title').getBoundingClientRect().top` contra `parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) * 16` (3,5rem = 56px). _Correcto_ = `top` > alto del navbar. Nota: `GlobalStyles.tsx:116-118` ya declara `scroll-margin-top: var(--nav-height)` sobre `:where(section[id])`, así que el margen existe y no depende del `padding-block-start` de Story; lo que falta es **confirmarlo medido**. Medido: `top` = **\_\_\_** px, `--nav-height` = **\_\_\_** px.

    > **Por qué esto no puede cubrirlo un test:** medido en este repo, `createGlobalStyle` de styled-components v6.4.4 **no inyecta nada** bajo jsdom + vitest (se renderizó un `createGlobalStyle` mínimo con `body { margin: 0 }`: `document.head.innerHTML` queda vacío y el margen computado del body sigue siendo el `8px` por defecto de jsdom). Todo lo que vive en `GlobalStyles.tsx` — el reset, `--nav-height`, el `scroll-margin-top` de las anclas, el anillo de foco y el colapso de duraciones por `prefers-reduced-motion` — es **invisible para la suite**. Solo se puede verificar en navegador.

- [x] **Valores computados reales** (los tests corren en jsdom, que devuelve las declaraciones tal cual se escriben y **no** resuelve unidades). _Medido el 2026-07-25:_

    |  | 1280×720 | 375×812 |
    | --- | --- | --- |
    | kicker | 11 px | 11 px |
    | título (`<h1>`) | 56 px | **37,5 px** (manda el tope `10vw` de `min()`) |
    | subtítulo | 24 px | 24 px |
    | apoyo | 16 px | 16 px |
    | rect de `ScHero` | 1280 × 720 | 375 × 812 |
    | rect de `ScCopy` | 582 × 265 | 327 × 381 |

    Título > subtítulo > apoyo en los dos anchos, y `ScCopy` cabe entero dentro del hero en ambos (sin desbordamiento vertical, sin scroll horizontal: `body.scrollWidth - documentElement.clientWidth` = 0). El `100dvh` del hero resolvió a 720 y 812 px respectivamente, que es el alto completo del viewport en cada caso.

- [ ] **Jerarquía percibida del Hero.** _Correcto_ = a 1 m de la pantalla y en 2 segundos se distinguen cuatro escalones sin llegar a leer: etiqueta pequeña muy espaciada, marca grande, frase mediana, párrafo pequeño. _Incorrecto_ = subtítulo y apoyo se leen como un solo bloque.
- [ ] **Contraste en píxeles del kicker** (11px, `semantic.brandText` del tema oscuro, centrado sobre el núcleo del velo radial). _Correcto_ = ≥ 4.5:1 medido con un medidor de contraste sobre captura real. **Si falla, el fallback ya está decidido y no vuelve al panel de diseño:** cambiar el `color` de `ScKicker` a `semantic.textMuted` y no tocar nada más.
- [ ] **Contraste en píxeles de subtítulo y apoyo en los extremos de línea**, que caen sobre la corona (la zona más brillante e irregular de la ilustración). _Correcto_ = ≥ 4.5:1. Amplía el ítem abierto de la §5 (contraste de la copia sobre la corona). Nota de diseño: el apoyo **no** se atenuó a `semantic.textMuted` a propósito, precisamente para no apilar riesgo de contraste donde ya lo hay.
- [ ] **Contraste en píxeles de la copia de Story** sobre el póster **y sobre la escena 3D viva en sus frames más claros**, en tema claro y en tema oscuro (cuatro casos). _Correcto_ = ≥ 4.5:1 en los cuatro. Lo que la entrega sí garantiza por test es el texto sobre `semantic.bg` y sobre las paradas del póster; la escena viva no es medible sin navegador. _Si falla sobre la escena viva_, la mitigación pendiente es un velo de contraste en Story (propuesta evaluada y aplazada en esta entrega por estar fuera del alcance).
- [ ] **Banding y costura en la rampa de 10rem Hero→Story**, en los dos temas, a 100% de zoom, en un **panel de 8 bits**, con póster y con escena viva. _Correcto_ = ninguna línea horizontal ni escalón perceptible a lo largo de la rampa; no se distingue dónde acaba una sección y empieza la otra. _Si aparece banding_, la mitigación es alargar la costura a `space[10]` (8rem), **no** añadir paradas intermedias al degradado: una parada intermedia introduce una discontinuidad de pendiente, que es precisamente lo que produce una banda de Mach (fue el fallo de la primera versión, ver arriba). `Story.test.tsx` atornilla las dos paradas y la ausencia de máscara.
- [ ] **Encaje del pie negro en viewports extremos:** 21:9, portátil 1440×720 (donde el marco del ojo, con `aspect-ratio: 1672/941`, desborda en vertical y la fila inferior es campo de nebulosa) y móvil vertical (`max-aspect-ratio: 1/1`). _Correcto_ = en los tres, la última fila de píxeles del hero es negra y la junta no se distingue.
- [ ] **La costura no aclara nada en Safari y Firefox estables.** _Correcto_ = a lo largo de los 6rem el negro se retira de forma continua y en ningún punto la zona bajo la junta se ve **más clara** que el póster unos píxeles más abajo. Ya no hay `mask-image` que soportar (se retiró en revisión), así que lo único que queda por confirmar entre motores es la interpolación de `oklch(0 0 0)` → `transparent`: si algún motor la hiciera sin premultiplicar, la rampa seguiría siendo negra (misma tinta, alfa 0), pero conviene mirarlo.
- [ ] **`forced-colors: active`** (emulable en DevTools → Rendering). _Correcto_ = ojo, velo, pie del hero y costura de Story desaparecen, y todo el texto del Hero y de Story es legible con los colores del sistema.
- [ ] **Reflow a 320px CSS y zoom 200%** (WCAG 1.4.10). _Correcto_ = la marca `VoidToInfinite` no se corta contra el `overflow: hidden` del hero ni se hifena, y los cuatro escalones siguen ordenados por tamaño.
- [ ] **Cascada de entrada a 80 ms** (0/80/160/240/320) y **pulsabilidad de los CTAs durante los 520 ms** del escalonado. _Correcto_ = la secuencia se percibe como secuencia (no como cinco cosas a la vez ni como una espera), y un clic sobre un CTA antes de que termine su animación funciona igual.

**Deuda registrada, fuera del alcance de esta entrega:** con Story forzada a superficie oscura, en **tema claro** el borde Story→Features puede leerse como corte (sección oscura contra sección casi blanca). Es **preexistente** — el póster de `SceneLoader` ya era oscuro en tema claro —, esta entrega no lo empeora ni lo arregla, y resolverlo es alcance nuevo (afecta a Features, que no se ha tocado).

---

## 9. Entrega 2026-07-26 — Logo en Navbar/Sol/Wormhole, IconButton, degradado animado del título y CTAs

**Qué entró:** átomo `Logo` compartido por Navbar/Sol/Wormhole; `IconButton` (composición sobre `Button`) para el `ThemeToggle`, con iconos sol/luna inline; `BrandName` partido en `Void`/`ToInfinite` con degradado animado opt-in (`gradientTail`); tamaños `clamp()` literales del título y subtítulo del hero; CTAs del hero con fondo/borde animados que reutilizan el mismo degradado. Mismo entorno de agente que las entregas anteriores de este documento: no compone frames (`document.hidden === true`), rAF pausado, transiciones y animaciones CSS congeladas, sin capturas. Nada de lo de abajo se ha visto ni medido en un navegador real.

- [ ] **Logo visible dentro del núcleo del Wormhole/Sol.** _Cómo:_ con el tema oscuro activo, mirar el centro de la pupila (Wormhole) y, en claro, el núcleo de Sol; confirmar que el trazo del logo (`vector-effect="non-scaling-stroke"`) no se pierde contra el brillo/destello del núcleo ni contra el `drop-shadow` que lo acompaña. _Correcto_ = el logo se lee como marca de agua reconocible, con relieve suficiente sobre el fondo del núcleo en reposo y durante el pulso. _Incorrecto_ = el logo desaparece o se funde con el núcleo. _Mitigación_ = subir la intensidad del `drop-shadow` del logo o bajar la opacidad/brillo del núcleo detrás.

- [ ] **Sincronía del pulso del logo con el resto de la coreografía del Wormhole.** _Cómo:_ click/tap sobre el lienzo del hero en tema oscuro y observar el centro del remolino. _Correcto_ = el logo escala y gana brillo en el mismo instante que el destello del núcleo (`corePulseStep`, retardo 1150ms), sin percibirse como un evento separado o retrasado. _Incorrecto_ = el logo se anima antes/después del resto o no se anima en absoluto. _Mitigación_ = ya decidida por diseño: el logo reacciona al MISMO atributo `data-pulse` que gobierna el resto de las piezas (sin estado ni rAF propio), así que un desfase indicaría un problema de especificidad CSS o de orden de pintado, no de temporización — revisar el `z-index`/orden del nodo `[data-part="mark"]` primero.

- [ ] **Legibilidad del recorrido del degradado (9s, `linear`, `alternate`)** en el título (`ToInfinite`) y en los dos CTAs. _Cómo:_ con `prefers-reduced-motion: no-preference`, observar el título y los CTAs durante al menos un ciclo completo (9s ida, 9s vuelta). _Correcto_ = el recorrido de color se percibe como un cambio suave y lento, sincronizado entre las tres piezas (mismo `keyframes`, misma duración, mismo `heroGradient` importado de `BrandName.tsx`); en ningún punto el texto queda ilegible. _Incorrecto_ = el recorrido se ve tan lento que parece estático, o tan rápido que resulta llamativo/mareante, o las tres piezas se perciben desincronizadas entre sí (lo que indicaría que alguna quedó con un `animation-delay` implícito distinto por haber montado en un instante distinto — la spec no fija un `animation-delay` explícito, así que un desajuste de fase real es posible y no se ha podido observar en este entorno). _Mitigación_ = ajustar la duración (9000ms es un literal sin casilla en `theme.data.motion.duration`, documentado como tal en `BrandName.tsx`); si el desfase de fase entre título y CTAs molesta, fijar un mismo `animation-delay: 0s` explícito en los tres o disparar la animación desde un único punto de sincronización.

- [ ] **Hover-lift + anillo de descubribilidad de `IconButton`** en interacción real de puntero y teclado sobre el `ThemeToggle` del navbar. _Cómo:_ pasar el cursor y tabular hasta el botón de tema en los dos temas. _Correcto_ = en reposo se distingue un anillo tenue (`box-shadow` al 18% de `currentColor`) incluso sin hover; al pasar el cursor o enfocar, el botón se eleva (`translateY(-2px)`, heredado de `Button`) y el tinte de fondo aparece; con teclado, el anillo de foco del sistema es visible además del anillo de descubribilidad. _Incorrecto_ = el anillo de reposo es imperceptible en alguno de los dos temas, o el hover-lift no se nota. _Mitigación_ = heredado de `Button` (cubierto por `Button.test.tsx`, no tocado); si el anillo de reposo no se distingue, subir el porcentaje de `color-mix` en `ScSquare` (`IconButton.tsx`) por encima del 18% actual.

- [ ] **Máscara del borde del CTA secundario (`::before` con `mask-composite`) en Firefox y Safari.** _Cómo:_ abrir el hero en Firefox y Safari (o WebKit) estables y mirar el borde animado del CTA "story" de cerca, especialmente en las esquinas redondeadas. _Correcto_ = el borde se ve como un anillo continuo de grosor uniforme (2px) alrededor del botón, sin huecos ni doble trazo. _Incorrecto_ = artefactos de anti-aliasing en las esquinas, el borde desaparece por completo (fallo de soporte de `mask-composite`/`-webkit-mask-composite`), o el interior del botón queda recortado por error. _Mitigación_ = ya se declaran las dos formas (`mask`/`mask-composite: exclude` sin prefijo y `-webkit-mask`/`-webkit-mask-composite: xor` con prefijo) precisamente para cubrir Chromium/Safari legado y los motores con soporte estándar; si un motor concreto sigue fallando, la mitigación de repliegue es sustituir el truco de máscara por un `padding-box` sólido con `background-clip: padding-box` sobre un fondo degradado en el propio `::before` (pierde la transparencia del interior pero no depende de `mask-composite`).

- [ ] **`forced-colors: active` sobre el `<h1>` con `background-clip: text`.** _Cómo:_ activar el modo de contraste forzado del SO (o emularlo en DevTools → Rendering → "Emulate CSS media feature forced-colors") y mirar el título del hero. _Correcto_ = el texto sigue siendo legible con los colores que imponga el SO (típicamente `CanvasText`), sin quedar transparente ni invisible — es una limitación conocida de la técnica `background-clip: text` bajo `forced-colors`, no específica de este cambio, y no se ha añadido ninguna regla `@media (forced-colors: active)` propia para `ScGradientTail` porque el modo forzado del SO ya sustituye el color del texto por su cuenta en la mayoría de motores. _Incorrecto_ = el texto queda transparente/invisible bajo `forced-colors`. _Mitigación_ = si se confirma el caso incorrecto, añadir una regla `@media (forced-colors: active) { background-image: none; color: CanvasText; -webkit-text-fill-color: CanvasText; }` explícita en `ScGradientTail` (mismo patrón que el `@supports not (background-clip: text)` ya presente).

- [ ] **Contraste renderizado en píxeles reales del punto interpolado más oscuro del degradado**, frente al cálculo de `contrast.ts`. _Cómo:_ con un medidor de contraste sobre una captura real del título/CTAs en el instante en que la animación pasa por el stop `secondary[300]` (65% del recorrido) — pausar la animación con DevTools o `prefers-reduced-motion` (que fija el color en `semantic.brandText`, un punto distinto pero también medible) y tomar la muestra. _Correcto_ = el contraste medido en píxeles reales es ≥ 4.5:1, coherente con `contrastRatio(palette.secondary[300], EYE_SURFACE)` = 12.43:1 y `contrastRatio(semanticDark.brandText, EYE_SURFACE)` = 13.78:1 (medidos con el propio `contrast.ts`, margen muy amplio sobre el umbral). _Incorrecto_ = el motor del navegador interpola/renderiza el gradiente con un gamut-mapping perceptiblemente distinto al cálculo OKLab→sRGB de `contrast.ts` y el contraste real cae por debajo de 4.5:1 en algún punto no muestreado por los tests (los tests solo miden los STOPS declarados, no cada punto intermedio del recorrido). _Mitigación_ = el margen entre 4.5:1 (umbral) y 12.43:1/13.78:1 (medido en los stops) es amplio (>2.7x): un desvío de renderizado tendría que ser muy grande para cruzar el umbral; si ocurre, sustituir `secondary[300]` por `secondary[200]` (un paso más claro), mismo criterio conservador ya aplicado en la auditoría AA de `semantic.ts`.

**Hallazgo colateral, RESUELTO en esta misma entrega (no numérico, no pendiente de navegador — verificado con tests en este entorno):** partir `BrandName` en dos `<span>` (`Void`/`ToInfinite`) mantiene `textContent` exactamente `"VoidToInfinite"` (verificado, `BrandName.test.tsx`), pero el algoritmo de nombre accesible (AccName) concatena el texto de nodos hermanos con un ESPACIO — sin corrección, el nombre accesible calculado pasaba a ser `"Void ToInfinite"` en cualquier consumidor, con o sin `gradientTail` (verificado con Testing Library en esta sesión), y rompía `Navbar.test.tsx:87` (`getByRole("link", { name: /VoidToInfinite/i })`) pese a que ese archivo no está en el alcance de este flujo. Se resolvió en `BrandName.tsx` con `aria-label="VoidToInfinite"` explícito en el wrapper (`ScBrandName`): fija el nombre accesible sin depender de cómo el DOM interno reparte el texto entre nodos, sin tocar `Navbar.tsx` ni `Navbar.test.tsx`. Cubierto por un test nuevo en `BrandName.test.tsx` ("el nombre accesible es 'VoidToInfinite' SIN espacio..."); `Navbar.test.tsx` y `Hero.test.tsx` verificados en verde tras el cambio.

---

## Registro de resultados

Rellena esta tabla al completar cada sección (una fila por sesión de QA):

| Fecha | Sección(es) verificada(s) | Dispositivo/navegador | Resultado | Ajuste aplicado (si hubo) |
| --- | --- | --- | --- | --- |
| 2026-07-26 | Portada completa (captura del usuario, 1920×908) | navegador del usuario | **4 defectos reales**, ninguno detectado por la suite | Ver commit `da9d67f`: tamaño del logo (atributo SVG vencido por el reset global), `ToInfinite` en negro (la sombra heredada tapaba el degradado), marca del Wormhole al diámetro del tercer anillo, glow de hover en los CTA |
| _por completar_ |  |  |  |  |

---

## 10. Glow de hover de los CTA (añadido el 2026-07-26)

Lo que **sí** está verificado por medición: el `::after` de los dos CTA existe con el `box-shadow` de los colores del degradado (`brandText` al 55 % y `secondary[300]` al 40 %), arranca en `opacity: 0`, y las reglas `:hover::after` / `:focus-visible::after` que lo suben a 1 están inyectadas en la hoja, con el pulso de 1600 ms acotado a `prefers-reduced-motion: no-preference`.

Lo que **no** se puede verificar aquí: el estado de hover real no se puede provocar en este entorno (no compone frames, no hay puntero real), así que nadie ha visto el glow encendido ni en movimiento.

- [ ] **Intensidad del glow en reposo-hover.** _Correcto_ = se lee como un halo suave que sugiere profundidad. _Incorrecto_ = halo duro con borde visible, o tan tenue que no se distingue del estado normal. _Si queda duro_, bajar los porcentajes de `color-mix` en `ctaGlow` (`Hero.tsx`); _si queda invisible_, subir el radio de los dos `box-shadow` antes que la opacidad.
- [ ] **La respiración de 1600 ms no marea.** _Correcto_ = el latido se percibe como vida, no como parpadeo. _Incorrecto_ = oscilación evidente que llama más la atención que la etiqueta del botón. _Si molesta_, subir el suelo de `ctaGlowPulse` de `0.65` hacia `0.8` antes que alargar la duración.
- [ ] **El glow no se recorta.** `Button` no declara `overflow: hidden` (verificado), así que el halo debe salir del borde del botón. Confirmar que ningún ancestro lo recorta, sobre todo en móvil, donde `ScActions` envuelve en dos líneas.
- [ ] **Foco por teclado.** Tabulando hasta los CTA, el glow debe encenderse igual que con el ratón (la regla cubre `:focus-visible`) **sin** tapar el anillo de foco del sistema.

---

## 11. Hover de los CTA con el degradado (añadido el 2026-07-26)

El primer render real reveló que el CTA primario perdía su fondo animado al pasar el cursor (`Button.tsx` resetea `background-image` vía el shorthand `background` en su propio `:hover`) y que el texto del CTA secundario usaba un color plano en vez del degradado de su borde. Los dos arreglos (ver commit `47121c4` y la lección `[[2026-07-26-shorthand-background-resetea-en-hover]]` del vault) se verificaron leyendo `document.styleSheets` — el CSSOM que el Chromium del panel ya había parseado —, no disparando un `:hover` real: **nadie ha visto el resultado en movimiento con un cursor de verdad.**

- [ ] **CTA primario: el degradado no se corta al entrar/salir del hover.** _Correcto_ = al pasar el cursor, el fondo sigue siendo el mismo degradado en movimiento, sin flash a color sólido ni salto de posición del degradado. _Incorrecto_ = un parpadeo o salto en el instante del hover.
- [ ] **CTA secundario: texto y borde se leen como una sola pieza.** _Correcto_ = el texto recorre el mismo degradado que el borde, a simple vista sincronizados (misma duración, mismo punto de partida). _Incorrecto_ = un desfase perceptible entre los dos, o el texto ilegible en algún punto del recorrido (comprobar en tema claro y oscuro, ya que el hero fuerza superficie oscura pero conviene confirmarlo con ojos reales).
- [ ] **El icono del navbar, ya centrado.** El `viewBox` pasó de `"0 0 500 550"` a `"0 7.5 500 550"` para repartir el margen vertical (antes 25px arriba / 10px abajo, medido sobre las coordenadas del dibujo). _Correcto_ = el icono se lee centrado junto al nombre de marca, sin espacio muerto visible arriba o abajo. Confirmar también en el Wormhole y en la cara brújula de Sol, que comparten el mismo átomo.

---

## 12. Color del icono del navbar y su tamaño (añadido el 2026-07-26)

`ScBrandLink` no fijaba su propio `color`, así que el icono (`fill: currentColor`) heredaba desde `body` — que resuelve contra el tema **ambiental** de la página, no contra el tema oscuro que `Navbar.tsx` fuerza mientras la barra flota transparente sobre el hero. Solo divergían en una combinación (tema ambiental claro + sin scroll), donde el icono se leía casi invisible. Ver la lección `[[2026-07-26-currentcolor-hereda-del-tema-ambiental-no-del-contextual]]` del vault.

A diferencia de la sección 11, **esto sí se verificó completo**: las cuatro combinaciones tema×scroll se midieron con `getComputedStyle` contra el navegador real (no una simulación), y un test de regresión confirmó ser efectivo revirtiendo el fix a mano y viendo la aserción fallar antes de restaurarlo. Lo único que sigue sin ojos humanos es el juicio estético:

- [ ] **Tamaño del icono, ahora 1.5rem (antes 1rem).** _Correcto_ = el icono se lee como una marca reconocible junto al nombre, ni diminuto ni desproporcionado frente al texto de 1.15rem que lo acompaña. Si sigue leyéndose pequeño o ahora domina demasiado el conjunto, es un ajuste de un solo número en `Navbar.tsx` (`<Logo size="..." />`).
- [ ] **`app/icon.svg` (el favicon real).** Apareció modificado en el árbol de trabajo con el mismo dibujo de la V — reemplazando un diseño anterior (cuadrado morado con dos círculos) — pero conserva el `viewBox` sin centrar (`"0 0 500 550"`) y un `fill="#fff"` fijo sin fondo opaco detrás. A esa escala (favicon de pestaña, 16-32px) el descentrado es poco perceptible, pero el blanco sin fondo **sí es un riesgo real**: en un navegador con la barra de pestañas en modo claro, el icono podría verse invisible. No se tocó porque está fuera del alcance de este arreglo (era del Navbar, no del favicon) y el archivo lo modificó el usuario, no este trabajo. _Si se confirma el problema_, la corrección es la misma familia que ya se aplicó al átomo `Logo`: centrar el `viewBox` y decidir un fondo opaco (o aceptar el blanco solo si el favicon va a servirse siempre sobre un `<link rel="icon">` con `media` que fuerce claridad/oscuridad, lo cual habría que revisar en `app/layout.tsx`).

---

## 13. Composición «Aura» del tema claro y transición entre temas (añadido el 2026-07-26)

El hero pasa a tener **dos** composiciones de fondo: el ojo cósmico en oscuro y el arte pastel de manos y orbe en claro, con `Sol` en el sitio del orbe, y una transición escalonada entre las dos.

### Lo que SÍ está verificado por medición en el navegador real

No hace falta re-verificarlo; se lista para que quien haga la QA visual sepa qué queda fuera de su alcance.

- **Geometría del encuadre:** a 1280×720 el marco del sujeto cae en x 19.17 %–119.11 %, top 0 %, bottom 100 %, y el orbe en **exactamente (69.28 %, 41.63 %)** del hero, que es el ancla de diseño. El campo cubre el hero, y el marco sangra por derecha, arriba y abajo.
- **Escalonado:** retardos reales `0 / 0 / 0.11 / 0.22 / 0.33 / 0.44 s` en el orden campo → mano izquierda → mano derecha → energía → orbe, con `transition-property: opacity` y nada más. Al salir, en reverso (orbe 0 s, campo 0.44 s).
- **Máquina del cruce:** `eye:active` → `+aura:pending` → `eye:leaving`+`aura:active` → solo `aura:active`. El velo de contraste desaparece **con** el stack del ojo, no en `t = 0`.
- **Contraste de la copia** sobre el pastel, medido por el propio motor: cuerpo **11.25:1**, kicker **5.17:1**. Los dos pasan AA.
- **Navbar en las cuatro combinaciones** tema × scroll. La crítica (claro + sin scroll, la que se habría roto sin el cambio de `barTheme`) da **11.25:1** sobre el pastel.
- **Estructura por tema:** en claro solo el stack de Aura, copia a la izquierda sin sombra y sin velo; en oscuro solo el ojo, copia centrada con sombra, velo presente, pie de 64 px con su degradado original.

### Lo que NO se puede verificar aquí, y por qué

Este entorno corre con `document.hidden === true` de forma permanente: **no compone frames y `requestAnimationFrame` no dispara** (medido: 0 disparos en 500 ms). Nadie ha visto un solo píxel de esta composición ni un solo frame de la transición.

- [ ] **La transición se lee como una secuencia, no como un fundido.** _Correcto_ = se distingue que el fondo llega primero, las manos después y el orbe al final. _Incorrecto_ = todo aparece a la vez, o el escalonado se percibe como tirones. _Si se lee plano_, subir `HERO_STEP_MS` (110 ms) antes que alargar `HERO_FADE_MS`; _si se percibe lento_, bajar el paso, no la duración.
- [ ] **La espera de la copia (240 ms) es la correcta.** _Correcto_ = el texto nunca llega a leerse mal: mantiene su paleta vieja mientras el fondo cambia y reaparece ya sobre el fondo nuevo. _Incorrecto_ = se ve un instante de texto oscuro sobre fondo oscuro (espera corta) o el bloque de texto desaparece tanto que se nota el hueco (espera larga). Es el ajuste con más probabilidad de necesitar retoque: se calculó, no se vio.
- [ ] **La rampa violeta del pie.** _Correcto_ = el pastel se apaga hacia el negro como un anochecer, y la junta con «El Descenso» no se lee. _Incorrecto_ = una banda visible, un tramo grisáceo, o banding en el degradado. El `32 %` del alto es un valor calibrado sobre mocks renderizados, **no sobre el hero real**. _Si se lee la banda_, alargar antes que oscurecer más rápido.
- [ ] **Tamaño de `Sol` respecto al orbe pintado.** El slot es el 28.5 % del ancho del marco, calculado para que el disco visible de `Sol` lea a los 21.5 % que mide el orbe del arte. Su halo, en cambio, es ~1.5× más ancho que el resplandor pintado. _Correcto_ = `Sol` se lee como el orbe que sustituye, sostenido por las dos manos. _Incorrecto_ = flota demasiado grande y las manos dejan de contenerlo. Ajuste de un número (`AURA_ORB_SIZE`).
- [ ] **La copia no invade la mano izquierda.** La columna es `min(65ch, 40%)` porque la mano entra hasta el 41.5 % del hero a 16:10. _Correcto_ = la línea más larga termina antes del arranque de la mano. _Incorrecto_ = el texto se solapa con los dedos. Comprobar sobre todo en 16:10 y en inglés, que es el idioma con las líneas más largas.
- [ ] **Banding del pastel.** El campo es un degradado muy suave codificado en WebP con pérdida a calidad baja (45 nativo / 38 responsive). _Correcto_ = liso. _Incorrecto_ = escalones visibles en las zonas de transición. _Si aparece_, subir la calidad de esa capa: pesa 4 KB, hay margen de sobra.
- [ ] **La pista de 1024 px en un móvil real.** Se verificó que cada variante pesa menos que su nativa y que el `srcset` está bien declarado, pero no que el navegador elija la pista esperada en un dispositivo con DPR 3.
- [ ] **`prefers-reduced-motion`.** El colapso a instantáneo está escrito y cubierto por tests en jsdom, pero **no observado**: jsdom no evalúa `@media`, y aquí no hay frames.
- [ ] **`forced-colors: active`.** Las dos composiciones y las dos rampas se ocultan. Sin emular el modo de alto contraste, no se ha visto el resultado.

### Anotación de proceso

El cuelgue del `requestAnimationFrame` en pestaña oculta (§14.6 de la spec) se encontró **precisamente porque** este entorno corre oculto. Es un recordatorio útil: la limitación que impide la QA visual también expone fallos que un entorno «normal» habría tapado.

---

## 14. Coreografía de carga y de cambio de tema del hero (añadido el 2026-07-27)

Spec: `docs/superpowers/specs/2026-07-27-hero-coreografia-carga-tema-design.md`.

El hero pasa a tener una **coreografía de carga** (mascota → capas → navbar y textos) y el cambio de tema pasa a ser un **relevo secuencial**: la composición saliente colapsa entera —en el orden inverso al de su aparición, con la mascota apagándose la última— y solo entonces florece la entrante.

### 14.1 Qué queda SUPERSEDIDO de la sección 13

Tres puntos de la lista del 2026-07-26 ya no aplican; no hay que verificarlos:

- **«La espera de la copia (240 ms) es la correcta.»** `HERO_COPY_HOLD_MS` **se eliminó**. La copia ya no espera: se apaga en `t = 0` (es la primera pieza en irse, por encargo) y vuelve en `HERO_COPY_RETURN_MS` (1830 ms), cuando el fondo nuevo ya está asentado. Lo que hay que juzgar ahora es el punto 14.2 de más abajo.
- **El orden del escalonado claro.** Ya no es `campo → manos → energía → orbe`, sino `orbe → campo → energía → mano izquierda → mano derecha`: Sol primero.
- **«La máquina del cruce: `eye:leaving` + `aura:active` a la vez.»** Los dos stacks ya no coexisten activos: el relevo es secuencial.

### 14.2 Lo que SÍ está verificado por medición en el navegador real

Ver §8.0 de la spec para la tabla completa. En resumen: los retardos reales de las dos composiciones (orden nuevo, exacto), que `iris`/`pupil` llevan **dos** animaciones con el escalonado la última (`"0s, 0.44s"` / `"0s, 0.55s"`, fill `"none, backwards"`), que ninguna pieza queda invisible al final del recorrido, el orden de estados del relevo, y que el guard de `prefers-reduced-motion` gana la cascada en `pending` (con control negativo). No hace falta re-verificarlo a ojo.

### 14.3 Lo que NO se puede verificar aquí

Mismo límite que la §13: este entorno corre con `document.hidden === true`, **no compone frames**, y las animaciones CSS nunca reciben un `startTime` (medido: muestrear opacidades con `setTimeout` devuelve valores congelados; la verificación se hizo conduciendo `Animation.currentTime` a mano). El intento de captura de pantalla falla con «the Browser pane is not displayed, so the page is not compositing frames». **Nadie ha visto un solo frame de esta coreografía.**

- [ ] **La carga se lee como una aparición, no como un salto.** _Correcto_ = en oscuro el Wormhole aparece sobre el vacío negro y el ojo se materializa a su alrededor de atrás hacia adelante; en claro Sol aparece y el mundo pastel se forma bajo él, las manos al final. _Incorrecto_ = todo llega a la vez, o se percibe como tirones. _Si se lee plano_, subir `HERO_STEP_MS` (110 ms) antes que alargar `HERO_FADE_MS`.
- [ ] **⚠ El presupuesto del cambio de tema (~2,5 s) es aceptable.** Es el punto con MÁS probabilidad de necesitar retoque, y una consecuencia inevitable del encargo: para que la salida completa se vea, la entrante no puede solaparse (spec §3). _Correcto_ = se lee como una transición deliberada y cinematográfica. _Incorrecto_ = se siente lento o el usuario duda de si el click funcionó. _Si es lento_, bajar `HERO_STEP_MS` y/o `HERO_FADE_MS`: todo el presupuesto cuelga de esos dos números.
- [ ] **⚠ Impacto en LCP.** La copia del hero —incluido el `<h1>`— está a `opacity: 0` durante ~760 ms desde el arranque del stack; el texto está en el DOM desde el primer pintado (solo cambia la opacidad), así que no afecta a SEO ni a accesibilidad, pero **puede desplazar el Largest Contentful Paint hasta ~1,1 s**. _Medirlo con Lighthouse en un navegador real es obligatorio antes de dar la entrega por buena en producción._ Si el LCP se degrada, `HERO_CHROME_OFFSET_MS` es el número a bajar.
- [ ] **La mascota se lee como la última en irse.** Es el requisito central del encargo. _Correcto_ = al cambiar de tema, el Wormhole/Sol se queda solo un instante sobre el lienzo antes de apagarse con él. _Incorrecto_ = desaparece a la vez que las capas, o el lienzo opaco de la composición entrante lo tapa antes de que llegue a apagarse (sería un fallo del relevo, no de los retardos).
- [ ] **La entrada del navbar.** `opacity` + `translateY(-8px)`. _Correcto_ = la barra se descuelga discretamente al final. _Incorrecto_ = se percibe como un salto, o compite con la entrada de la copia.
- [ ] **`prefers-reduced-motion: reduce`.** El colapso a instantáneo está escrito, cubierto por tests y con la cascada verificada por réplica, pero **no observado con la preferencia real activada**. Comprobar en particular que en tema claro NO hay destello: el fondo tiene que estar visible desde el primer pintado, no aparecer al resolver el `decode()`.
- [ ] **Coste de compositor.** Las capas declaran `will-change: transform` de forma permanente y ahora además animan `opacity` en el escalonado. _Comprobar en el panel de rendimiento_ que no hay saltos de frame en un portátil modesto durante la secuencia.
- [ ] **Un `decode()` lento.** Con red lenta el arranque se retrasa hasta `HERO_DECODE_TIMEOUT_MS` (600 ms) y el navbar/copia esperan con él. Comprobar con throttling que la espera no se lee como una página rota.

---

## 2026-07-28 — Retirada de Three.js

Spec: `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §D4.

Con la entrega Landing v2 la escena WebGL «El Descenso» y todo `src/three/` (`Scene.tsx`, `SceneLoader.tsx`, `SceneErrorBoundary.tsx`, `camera.ts`, `starfield.ts` y sus tests) se eliminan del repo, junto con `src/hooks/useScrollProgress.ts` y su test: la landing pasa a secciones estáticas y deja de depender de Three.js. Las dependencias `three` y `@types/three` se retiraron de `package.json` y el lockfile se regeneró con `pnpm install`.

Consecuencia para este documento:

- **Los ítems que se referían a la escena 3D** (secciones 1, 2, 4, 7, y las menciones a "la escena viva"/"frames más claros" dentro de las secciones 5, 8 y 13-14) quedan como **historia**: describen un trabajo real que se hizo y se documentó en su momento, pero ya no son verificables porque el código que describen no existe. No se tachan ni se reescriben — son evidencia de lo que se intentó y de por qué no se pudo comprobar en su día — pero nadie debe intentar marcarlos ya.
- **Los ítems referidos al hero** (capas WebP del ojo/Aura, parallax, pulso, mascota Wormhole/Sol, coreografía de carga y de cambio de tema, navbar, contraste, LCP) **siguen vigentes**: no dependen de Three.js y la QA pendiente sobre ellos sigue siendo el mismo trabajo real por hacer.

---

## 2026-07-28 — QA visual pendiente de las secciones Landing v2 (tema claro)

Spec: `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md`. Entrega: Story («Why VoidToInfinite»), Journey, Features, Contact, footer nuevo, gate por tema (`HomeSections`) y enlaces de sección del navbar.

**Lo que SÍ se verificó en navegador real** (dev server, DOM/estilos computados/red; el panel no compone frames, así que sin capturas): las 4 secciones montan en claro y NINGUNA en oscuro, en carga y en toggle en vivo (ida y vuelta) con cero errores de consola; los 12 WebP sirven 200 con los bytes exactos del manifest; geometría medida tras forzar la carga de imágenes — tarjetas de Features en ~290/309 px (mockup ~300), figuras 288/276 px, iconos 15/22/20 px tras corregir el reset global `svg { width: 100% }`; sin atributos `variant` filtrados al DOM tras corregir los `as` sobre `styled(Typography)`.

**Lo que NADIE ha visto — pendiente de un humano con pantalla:**

- [ ] **El reveal al hacer scroll no se ha visto nunca.** En este entorno `IntersectionObserver` no dispara jamás (medido con una sonda sobre un elemento fijo visible: 0 callbacks) y `loading="lazy"` no carga. El mecanismo está atado por tests (jsdom con IO mockeado) y es el mismo `useReveal` que ya usaba la página, pero el efecto compuesto (timing, escalonados de 90/120 ms, sensación) requiere ojos.
- [ ] **Juicio estético general contra el mockup** `Landing v2.dc.html`: composición, solapes de la figura de Journey (recortada a propósito por el overflow de su tarjeta), tarjeta de nota flotante de Story, anillos de Contact, patrones de fondo de Features.
- [ ] **Halos en los bordes de las figuras**: la pista 640 tiene ruido de des-premultiplicación medido (media 1.9–2.8/255, p99 48–66 en el borde alfa-parcial; `assets/figures/manifest.json`). Sin arreglo aplicado porque no se pudo juzgar percepción; mirar los contornos sobre los fondos pastel reales.
- [ ] **Contraste AA del texto nuevo** sobre los degradados pastel (kickers, textMuted sobre las tarjetas de Journey/Contact) — los tokens vienen del sistema, pero los fondos son literales del mockup.
- [ ] **Peso**: 4 de 6 pistas nativas superan el presupuesto orientativo de 150 KB (162–210 KB a q70). Decidir si duele en móvil real (todas cargan lazy, bajo el pliegue).
- [x] **`check-spelling` estaba roto a nivel de repo desde antes de esta entrega** (25.631 avisos en 113 archivos en esta fecha 2026-07-28, cifra que siguió subiendo con el repo hasta 111.199/264 el 2026-08-12: cspell sin diccionario español real). **Corregido 2026-08-12 (Task 25):** diccionario `@cspell/dict-es-es` instalado y `languageSettings` ampliado a todo tipo de fichero — cae a 2.627 avisos en 221 ficheros (−97,6%), ruido mayormente jerga propia del repo. Sigue fuera de `pnpm run ci` a propósito (ver `PRE-LAUNCH-QA.md` §6 ítem 38 para el detalle completo).
