# QA pendiente — viaje 3D (checklist para un humano con navegador real)

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

- [ ] Medido en escritorio. Dispositivo/navegador: **\_\_\_**. FPS medio: **\_\_\_**. Long tasks: **\_\_\_**.

---

## 2. FPS del descenso (móvil de gama media)

**Cómo (dos opciones, la primera es más fiel):**

- **Dispositivo real:** sirve el build en la red local (`pnpm start` ya expone el puerto; usa la IP de tu máquina, ej. `http://192.168.x.x:3000`, desde el móvil en la misma red) y repite la grabación de la sección 1 usando las DevTools remotas de Chrome (`chrome://inspect` desde el equipo, conectado el móvil por USB) o simplemente observando fluidez a ojo si no hay forma de perfilar.
- **Alternativa sin dispositivo físico:** DevTools → Performance → icono de engranaje → **CPU: 4x slowdown**, y repite la grabación de la sección 1 en el mismo Chrome de escritorio.

**Qué se considera correcto:** FPS medio ≥ 50 durante el scroll del descenso.

**Si baja de 50 FPS:** reduce `starCountForViewport` para el rango `<=640` (móvil) primero; si con eso no basta, reduce también el rango `<=1024`. Documenta el valor final elegido y por qué.

- [ ] Medido en móvil/throttling. Dispositivo o throttling usado: **\_\_\_**. FPS medio: **\_\_\_**. ¿Se ajustó `starCountForViewport`? **\_\_\_** (valores antes → después).

---

## 3. `prefers-reduced-motion` — verificar una por una

Activa la preferencia (macOS: Ajustes → Accesibilidad → Pantalla → Reducir movimiento; Windows: Configuración → Accesibilidad → Efectos visuales → Animaciones desactivadas; o en Chrome DevTools → Cmd/Ctrl+Shift+P → "Emulate CSS prefers-reduced-motion: reduce"), recarga la página, y comprueba:

- [ ] **El ojo no respira ni sigue al cursor.** Mueve el ratón sobre el hero: el iris no debe desplazarse hacia el puntero, y no debe haber ninguna pulsación/escala periódica visible en el ojo.
- [ ] **El descenso no ocurre: se ve el gradiente.** Haz scroll por la sección de "El Descenso": la cámara no debe avanzar ni aparecer el campo de estrellas — debe quedarse visible el gradiente CSS de fondo (el fallback de `SceneLoader`, no una imagen — no busques un `.webp`).
- [ ] **Los reveals de sección aparecen sin desplazamiento.** En Story y Features (las secciones que usan reveal por scroll), el contenido debe aparecer/desaparecer (cambio de opacidad) sin ningún desplazamiento vertical/horizontal al entrar en viewport.
- [ ] **El anillo de foco sigue visible al tabular.** Con el teclado (`Tab` desde el principio de la página), cada control interactivo (enlaces, botones, inputs, toggles) debe mostrar un anillo de foco claramente visible (2px, color `theme.data.semantic.focus`, con offset) en cada parada. Confirma explícitamente que reduced-motion no lo atenúa ni lo hace desaparecer — el foco **nunca** se anima ni se suprime, con o sin reduced-motion.

---

## 4. QA sin WebGL

**Cómo:** en Chrome, `chrome://flags` → deshabilita "WebGL"/"WebGL2", o usa un navegador que no soporte WebGL (o DevTools → Rendering → "Disable WebGL" si tu versión lo expone), y recarga la página desde cero.

- [ ] **Se ve el gradiente CSS** en la zona del canvas (no un rectángulo vacío/negro).
- [ ] **No falta ningún contenido.** Recorre la página entera: toda la copia (Hero, Story, Features, Contact), todos los CTAs y todos los enlaces (Socials, Navbar) siguen presentes.
- [ ] **Todo es navegable por teclado.** `Tab` a través de toda la página sin WebGL: cada CTA, cada link, cada control debe ser alcanzable y activable (`Enter`/`Space`), con el mismo anillo de foco visible del punto anterior.

---

## 5. Aspecto visual real (nadie lo ha visto todavía)

Nada de esto lo ha podido comprobar ningún agente de este entorno — es la primera vez que un ojo humano ve el resultado real:

- [ ] **Composición del ojo (hero):** el hero monta las cinco capas de `public/hero/eye/*.webp` con blending aditivo. Confirma que el resultado se ve como la imagen de referencia (`assets/hero-eye/`, composición completa): párpado, campo de nebulosa, corona e interior de la pupila, sin costuras ni halos entre capas y sin banda visible por la compresión WebP en los degradados oscuros.
- [ ] **Encuadre en vertical:** en móvil el marco se amplía al 185% del ancho (recorta las puntas del párpado a propósito). Confirma que el encuadre resultante se sostiene y que la copia queda dentro del ojo, no desbordándolo.
- [ ] **Contraste de la copia sobre la corona:** los párrafos del hero son más anchos que la pupila y sus extremos caen sobre la corona iluminada. Hay velo radial + sombra de texto, pero **el contraste real no se ha medido en píxeles**: comprueba con un medidor de contraste sobre captura real que el texto pasa AA (4.5:1) también en los extremos de línea.
- [ ] **`plus-lighter` vs `screen`:** el aditivo usa `plus-lighter` con fallback a `screen` (`@supports`). Comprueba el hero en un navegador sin `plus-lighter` (Firefox < 122) y confirma que la diferencia no es perceptible.
- [ ] **Parallax al cursor:** mueve el ratón sobre el hero (con reduced-motion **desactivado**) y confirma que las capas siguen al puntero de forma suave (lerp, sin saltos ni jitter), que la pupila se mueve más que el párpado, y que ninguna capa deja ver un borde transparente al desplazarse.
- [ ] **Pulso al click:** un click/tap sobre el fondo del hero dispara el anillo que se expande desde la pupila, y se puede repetir inmediatamente.
- [ ] **Transición póster → escena viva:** confirma que el fundido de opacidad entre el gradiente CSS y el canvas de Three.js (cuando WebGL y reduced-motion lo permiten) no produce un salto de color perceptible.
- [ ] **Marca-esquina persistente (`EyeCornerMark`):** al pasar el hero, confirma que la marca aparece de forma legible y no se superpone de forma confusa con el contenido siguiente.
- [ ] **Navbar sobre el hero:** arriba del todo la barra debe ser invisible (solo su contenido flotando sobre la composición) y al empezar a scrollear debe aparecer el cristal esmerilado. Comprueba los dos temas. En **tema claro** el cambio de color del texto de la barra ocurre en el mismo umbral que el cristal (8px): confirma que la transición no se lee como un parpadeo — el fondo se funde en 200ms y el color salta de golpe, y ese desfase solo se puede juzgar mirándolo.

---

## 6. Peso y LCP del hero

Las capas pesan **400 KiB** en la pista de 1672px y **224 KiB** en la de 1024px (medido con `du` sobre `public/hero/eye/`). La selección la hace el navegador con `srcset`/`sizes`, y `sizes` declara 60vw por debajo de 700px a propósito para que ningún móvil se lleve la pista grande.

- [ ] **LCP medido:** Lighthouse o DevTools → Performance sobre el build de producción. Anota el LCP y qué elemento lo produce.
- [ ] **Pista servida en móvil:** DevTools → Network, emulando un móvil, confirma que se descargan los `-1024.webp` y **no** los de 1672px.

**Si el LCP no cumple:** el primer recorte razonable es bajar la calidad de las capas 01/03/04 (las tres pesadas) o añadir una pista intermedia; el script de conversión y su verificación de recomposición están descritos en el registro del vault de esta sesión.

---

## 7. Deuda 3D todavía abierta

No se ha tocado en esta pasada, a la espera de tener la escena completa y correcta:

- [ ] Tests de `src/three/Scene.tsx`.
- [ ] Render loop en idle (la escena sigue pintando aunque no haya cambios ni esté en viewport).
- [ ] Carga diferida por tiempo del módulo de Three.js.
- [ ] **Contraste de Story en tema claro:** `Story` monta el póster oscuro de `SceneLoader` pero su copia usa `semantic.text`, que en tema claro es casi negro (verificado en navegador: `oklch(0.32 0 286)` sobre el póster oscuro). El hero resuelve el mismo problema anidando el tema oscuro; Story necesita el mismo tratamiento cuando se escriba su copia real.

---

## Registro de resultados

Rellena esta tabla al completar cada sección (una fila por sesión de QA):

| Fecha | Sección(es) verificada(s) | Dispositivo/navegador | Resultado | Ajuste aplicado (si hubo) |
| --- | --- | --- | --- | --- |
| _por completar_ |  |  |  |  |
