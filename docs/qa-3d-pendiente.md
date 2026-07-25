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

- [ ] **Silueta y color del ojo:** confirma que el ojo (iris, glints, párpado) se ve como se pretendía — proporciones, nitidez de bordes, que no haya artefactos de recorte (`clip-path`) en ningún tamaño de viewport.
- [ ] **Parallax al cursor:** mueve el ratón sobre el hero (con reduced-motion **desactivado**) y confirma que el iris/gaze sigue al puntero de forma suave (lerp, sin saltos ni jitter) y con un rango de movimiento que se sienta contenido, no exagerado.
- [ ] **Transición póster → escena viva:** confirma que el fundido de opacidad entre el gradiente CSS y el canvas de Three.js (cuando WebGL y reduced-motion lo permiten) no produce un salto de color perceptible.
- [ ] **Marca-esquina persistente (`EyeCornerMark`):** al pasar el hero, confirma que la marca aparece de forma legible y no se superpone de forma confusa con el contenido siguiente.

---

## Registro de resultados

Rellena esta tabla al completar cada sección (una fila por sesión de QA):

| Fecha | Sección(es) verificada(s) | Dispositivo/navegador | Resultado | Ajuste aplicado (si hubo) |
| --- | --- | --- | --- | --- |
| _por completar_ |  |  |  |  |
