# Coreografía de carga y de cambio de tema del hero — spec de diseño

- **Fecha:** 2026-07-27
- **Rama:** `feature/mejoras-hero-navbar`
- **Base:** `67dce4d`
- **Alcance:** hero (fondo + copia), navbar. No toca Story/Features/About/Contact/Footer.

---

## 1. Encargo

Del brief, literal:

1. **Carga, tema oscuro:** primero el Wormhole, después las capas del ojo «como si se mostrase desde el fondo (como una aparición)», y al final el navbar y los textos del hero.
2. **Carga, tema claro:** primero el componente Sol, después las capas de Aura y las manos, y al final el navbar y los textos del hero.
3. **Cambio de tema (los dos sentidos):** las animaciones de aparición **a la inversa**. En oscuro: primero desaparecen los textos, luego las capas del ojo, y por último el Wormhole. En claro: primero los textos, luego las capas de Aura y las manos, y por último Sol.

### 1.1 Lo que el brief NO dice, y cómo se resuelve

- **El navbar no aparece en ninguna de las dos listas de salida.** Las dos enumeran exactamente tres piezas (textos → capas → mascota). Se toma al pie de la letra: **el navbar anima solo en la carga**, y en el cambio de tema se queda quieto. Además de ser la lectura literal, es la correcta de producto: el disparador del cambio de tema (`ThemeToggle`) vive dentro del navbar, y hacerlo desaparecer apagaría el control justo debajo del cursor que acaba de usarlo.
- **Orden interno de «las capas de Aura y las manos».** El brief las enumera en ese orden, así que el escalonado claro queda `orb → field → energy → handLeft → handRight`: Sol, después el lienzo y la nebulosa, y las manos al final.
- **«Como si se mostrase desde el fondo».** Se implementa como revelado de atrás hacia adelante en el orden de profundidad que la tabla `EYE_LAYERS` ya declara (`background → eyelid → nebula → iris → pupil`), no como un efecto de escala o desenfoque: `transform` en esos elementos lo escribe el rAF del parallax frame a frame (ver §6.3), así que la única propiedad disponible es `opacity`.

---

## 2. Estado de partida

Lo que ya existe y **se conserva**:

- `HeroBackdrop.tsx` monta las dos composiciones y cruza entre ellas con una máquina `pending → active → leaving`, con carrera de `img.decode()` contra `HERO_DECODE_TIMEOUT_MS`, token de ejecución contra dobles toggles, y desmontaje por temporizador (nunca por `transitionend`).
- `aura.parts.tsx` escalona las capas claras leyendo `data-state` de un ancestro con el selector descendiente `[data-state="..."] &`, con el retardo contado en reverso al salir.
- `useHeroCopySwap` cruza la distribución de la copia por opacidad.
- `ThemeProvider` publica `changeSource` (`initial | hydration | user`).

Lo que **cambia**:

| Pieza | Antes | Ahora |
| --- | --- | --- |
| Carga | Sin coreografía: el stack se monta ya en `active` | Escalonado completo, igual que el cruce |
| Orden claro | `field → handLeft → handRight → energy → orb` | `orb → field → energy → handLeft → handRight` |
| Ojo | Fundido **uniforme** en `ScEyeStack` | Escalonado por capa, `mascot` primero |
| Cruce de temas | Los dos stacks se solapan | **Secuencial**: sale uno entero, entra el otro |
| Copia | Espera `HERO_COPY_HOLD_MS` y luego se apaga | Se apaga **primero**, vuelve al final |
| Navbar | Sin animación | Entra en la carga, con la copia |

---

## 3. Por qué el cruce pasa a ser secuencial

No es una preferencia estética: es la única forma de que la salida que pide el brief **sea visible**.

`HeroBackdrop` monta siempre Aura después del ojo en el árbol, porque su capa `field` es opaca y tiene que quedar encima para resolver el cambio de lienzo sin animar `background-color`. Con los dos stacks solapados, en oscuro → claro el `field` entrante se pinta **por encima** del ojo que todavía está saliendo: sus últimos escalones —y en particular el Wormhole, que el brief exige que sea el último en irse— quedarían tapados por un rectángulo opaco antes de llegar a apagarse. La coreografía existiría en la hoja de estilos y no se vería.

Por eso el stack entrante **no arranca hasta que el saliente ha terminado**. El coste es la duración total (§5.3, ~2.0 s). Es una decisión consciente y de un solo número: `HERO_HANDOFF_MS`.

---

## 4. Tablas de escalonado

El **índice** de cada pieza en su array **es** su escalón. Cada tabla vive junto a la tabla de capas de su composición, no en el módulo de tiempos, por el mismo motivo que ya documenta `AURA_STAGGER`: el orden es un dato de la composición, los tiempos son de la coreografía.

### 4.1 Oscuro — `EYE_STAGGER` (nuevo, en `eye.layers.ts`)

```
["mascot", "background", "eyelid", "nebula", "iris", "pupil"]   // 6 escalones
```

Sinónimos (comparten escalón, no ocupan entrada propia):

- `socket` ≡ `mascot` (escalón 0). El lienzo negro es el vacío en el que aparece el Wormhole: tiene que estar exactamente cuando él está, y al salir cerrarse con él.
- `scrim` ≡ `pupil` (escalón 5). El velo de contraste existe para la copia, que llega después de todas las capas: aparecer antes solo oscurecería un lienzo ya negro.

### 4.2 Claro — `AURA_STAGGER` (reordenado, en `aura.layers.ts`)

```
["orb", "field", "energy", "handLeft", "handRight"]             // 5 escalones
```

Sinónimos: `base` ≡ `field` y `foot` ≡ `field` (escalón 1), sin cambios respecto a hoy — el color plano y la rampa violeta son el mismo instante visual que el lienzo.

> `AURA_LAYERS` (orden de **pintado**) NO se toca. Sigue desacoplado de `AURA_STAGGER` (orden de **revelado**), y `auraStep()` resuelve por nombre de `data-part`, no por posición.

### 4.3 Salida

El retardo de salida se cuenta en reverso **contra la longitud de su propia tabla**:

```
retardoSalida(i) = (tabla.length - 1 - i) * HERO_STEP_MS
```

Con esto, el escalón 0 —`mascot` en oscuro, `orb` en claro— recibe el retardo mayor y es el último en apagarse, que es exactamente lo que pide el brief. La fórmula ya existe en `auraStagger()`; **no cambia**. Lo único que cambia es el orden de los arrays.

---

## 5. Tiempos

### 5.1 Constantes que se conservan

| Constante                | Valor | Papel                             |
| ------------------------ | ----- | --------------------------------- |
| `HERO_FADE_MS`           | 420   | Fundido de UNA pieza              |
| `HERO_STEP_MS`           | 110   | Paso entre escalones consecutivos |
| `HERO_DECODE_TIMEOUT_MS` | 600   | Tope de espera de `decode()`      |
| `HERO_COPY_OUT_MS`       | 100   | Apagado de la copia               |
| `HERO_COPY_IN_MS`        | 320   | Encendido de la copia             |

### 5.2 Constantes nuevas o redefinidas

```
HERO_STAGGER_STEPS    = max(EYE_STAGGER.length, AURA_STAGGER.length)       = 6
HERO_STACK_MS         = HERO_FADE_MS + (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS = 970
HERO_BACKDROP_HOLD_MS = HERO_COPY_OUT_MS                                   = 100
HERO_HANDOFF_MS       = HERO_BACKDROP_HOLD_MS + HERO_STACK_MS              = 1070
HERO_CHROME_OFFSET_MS = (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS
                        + HERO_FADE_MS / 2                                 = 760
HERO_COPY_RETURN_MS   = HERO_HANDOFF_MS + HERO_CHROME_OFFSET_MS            = 1830
```

`HERO_CHROME_OFFSET_MS` es el instante, medido desde el arranque de un stack, en que el **último** escalón va por la mitad de su fundido. La copia y el navbar entran ahí y no al final del todo: así terminan de asentarse **después** que la última capa (cumpliendo «finalizando con … los textos») sin dejar medio segundo de texto en blanco.

Dos constantes **se eliminan**:

- `HERO_COPY_HOLD_MS` existía para que la copia no repintara con la paleta nueva mientras el fondo seguía siendo el viejo; en el diseño secuencial ese papel lo cumple `HERO_COPY_RETURN_MS`, que devuelve la copia cuando el fondo nuevo ya está establecido. Mantener una constante a 0 sería deuda muerta.
- `HERO_TRANSITION_MS` era el nombre con el que `HeroBackdrop` conocía «cuánto tarda un stack en escalonarse». El relevo secuencial ya no necesita un desmontaje diferido —el saliente se desmonta en el mismo tick en que el entrante se activa—, así que quedó sin ningún consumidor de producción. Se borra en vez de conservarse como alias de `HERO_STACK_MS`: dos nombres para el mismo número son el antipatrón de «dos literales que divergen» que este repo ya documenta.

### 5.3 Presupuesto total

> **Enmienda 2026-08-11 (§5.5):** el bloque «Carga» de aquí abajo describe el mecanismo original (máquina de fases JS, reloj contado desde que resuelve `decode()`). Desde el 2026-08-11 la carga de la copia y del navbar es CSS estático y su reloj arranca con el **primer pintado**; el presupuesto vigente está en §5.5. El bloque «Cambio de tema» sigue vigente sin cambios.

**Carga** (desde que el `decode()` resuelve):

```
0      capas: escalón 0 (mascota) arranca
550    capas: escalón 5 arranca
760    navbar + copia arrancan
970    capas asentadas
1080   navbar asentado           (760 + 320)
1400   copia asentada            (760 + 320 in + 320 de su escalonado interno de 80 ms x 4)
```

**Cambio de tema** (desde el click):

```
0      la copia empieza a apagarse
100    copia fuera; el stack saliente empieza a colapsar (mascota la última)
1070   stack saliente fuera; el entrante empieza a florecer (mascota la primera)
1830   navbar quieto; la copia empieza a volver
2040   stack entrante asentado
2470   copia asentada
```

> **Riesgo asumido y declarado:** ~2,5 s de cambio de tema es largo para un control de UI. Es la consecuencia directa de que el brief pida ver la salida completa antes de la entrada (§3). Todo el presupuesto cuelga de `HERO_STEP_MS` y `HERO_FADE_MS`: comprimirlo es cambiar dos números en `hero.transition.ts`, sin tocar ninguna coreografía.

### 5.4 Riesgo de LCP declarado

La copia del hero —que incluye el `<h1>`— queda a `opacity: 0` durante ~760 ms desde el arranque del stack. El texto **está en el DOM desde el primer pintado** (solo cambia la opacidad), así que no hay impacto en SEO ni en el árbol de accesibilidad, pero **sí puede desplazar el Largest Contentful Paint** hasta ~1,1 s. Mitigaciones aplicadas:

- El intro completo se salta bajo `prefers-reduced-motion: reduce`.
- El arranque está acotado por `HERO_DECODE_TIMEOUT_MS` (600 ms), no por una espera abierta.
- El presupuesto se mantiene por debajo de 1,5 s.

No se mide en esta entrega (este entorno no compone frames, §8): queda anotado en `docs/qa-3d-pendiente.md` como pendiente de verificación en navegador real.

---

## 5.5 Enmienda 2026-08-11 — el motor de la carga pasa a CSS estático (Task 10, plan premium F1-F5)

> Esta sección **no reescribe** §5.3, §5.4, §7.2 ni §7.4: las deja como el registro de lo que se decidió el 2026-07-27 y anota qué cambió, por qué y con qué medición. Todo lo que no se menciona aquí sigue vigente tal cual.

**El riesgo declarado en §5.4 se midió, y era peor de lo estimado.** Chrome real sobre el build estático (`pnpm build` + `serve out`, caché fría, `PerformanceObserver` con `buffered: true`):

| Escenario | FCP | LCP (antes) | Elemento LCP |
| --- | --- | --- | --- |
| Claro escritorio 1280×720 | 156 ms | 1268 ms | `span` de `BrandName`, dentro del `<h1>` |
| Claro móvil 375×812 | 68 ms | 1292 ms | `<p>` de apoyo (`hero-support`) |
| Móvil, CPU 4× + Slow 4G | 812 ms | **4520 ms** | `<p>` de apoyo (`hero-support`) |

§5.4 estimaba «hasta ~1,1 s» contando **desde el arranque del stack**. El coste real se mide desde el primer pintado y encadena tres esperas más que la spec no contabilizó: descarga del bundle, hidratación de React y la carrera de `decode()` del fondo — sólo **después** empiezan a contar los `HERO_CHROME_OFFSET_MS`. El elemento LCP es siempre TEXTO del hero, nunca el arte, así que el coste caía entero sobre la métrica.

**Qué cambia (el motor, no la partitura).** La coreografía de carga de la copia y del navbar deja de ser una máquina JS que escribe `data-intro` y pasa a ser `@keyframes` + `animation-delay` declaradas sin condición, presentes en el CSS del HTML exportado. El escalonado interno de 80 ms (`HERO_COPY_STEP_MS`), la duración (`motion.duration.base`), la curva (`easing.decelerate`), el recorrido de 10 px y los 320 ms del navbar (`motion.duration.slow`) son **idénticos**.

**El único número que se mueve, y por qué.** `HERO_CHROME_OFFSET_MS` (760 ms) deja de retrasar la entrada de **la copia**; el **navbar lo conserva verbatim**. El offset no es ritmo, es **sincronía**: mide (§5.2) el instante en que el último escalón del fondo va por la mitad de su fundido, contado desde el arranque del stack — un evento que sólo JS conoce y que un reloj CSS estático no puede observar. Conservarlo como retardo fijo habría mantenido 760 ms de hero sin texto en cada carga **sin comprar el orden que lo justificaba**: medido en este mismo navegador con caché fría, a 1600 ms desde el `commit` el stack seguía en `pending` — es decir, en la carga lenta (justo donde el LCP importa) el arte llega mucho después de esos 760 ms de todas formas, así que «primero el arte, al final los textos» (§1) no se preservaba. En el navbar el número se paga sin coste: no es candidato LCP en ninguna medición, así que «al final el navbar» sí sigue cumpliéndose al pie de la letra, y ahora también sin JavaScript.

**Presupuesto de carga resultante** (sustituye al bloque «Carga» de §5.3, que contaba desde que resolvía `decode()`; éste cuenta desde el **primer pintado**, que es el único origen que un reloj CSS conoce):

```
0      copia: título arranca
80     copia: subtítulo arranca
160    copia: apoyo arranca
240    copia: acciones (CTA) arrancan
520    copia asentada           (240 + 200 de duración)
760    navbar arranca           (HERO_CHROME_OFFSET_MS, verbatim)
1080   navbar asentado          (760 + 320)
—      capas del fondo: cuando su decode() resuelve (sigue en JS, spec §7.2)
```

**Resultado medido** (mismo entorno, mismo método, tras el cambio):

| Escenario                 | LCP antes | LCP después | Δ       |
| ------------------------- | --------- | ----------- | ------- |
| Claro escritorio 1280×720 | 1268 ms   | **184 ms**  | −85,5 % |
| Claro móvil 375×812       | 1292 ms   | **432 ms**  | −66,6 % |
| Móvil, CPU 4× + Slow 4G   | 4520 ms   | **932 ms**  | −79,4 % |

Objetivo del plan (`< 2500 ms` en el escenario throttled) cumplido con 2,7× de margen.

**Lo que NO cambia:** el fondo conserva su decode-gating en JS (§7.2) — es arte, no LCP de texto; el relevo secuencial del cambio de tema (§7.3) y los tiempos de la copia en ese cruce (`HERO_COPY_RETURN_MS` y compañía, §5.2) siguen intactos y siguen siendo JS; `StageProvider` sigue montado y `HeroBackdrop` sigue avisándole. Lo que sí queda **sin ningún consumidor** es su `phase`: era lo que leían la copia y el navbar. Retirar la máquina entera es una decisión de arquitectura que excede esta tarea y se deja anotada aquí, no ejecutada en silencio.

**`prefers-reduced-motion`** (§6.5) sigue colapsando a visible-inmediato, ahora por un guard explícito `animation: none` en cada pieza: `GlobalStyles` colapsa `animation-duration` pero **no** `animation-delay`, así que sin ese guard el navbar quedaría invisible los 760 ms del retardo y aparecería de golpe.

**Fallback sin JavaScript.** Con la copia y el navbar en CSS estático, la única pieza del hero que seguía dependiendo de JS era el fondo: sin scripts, `HeroBackdrop` nunca corre su carrera de `decode()` y su envoltorio se queda en `data-state="pending"` para siempre. `auraStagger`/`eyeStagger` ganan un guard `@media (scripting: none)` que devuelve sus capas a `opacity: 1`, con la misma especificidad que la regla que neutralizan (gana por orden de cascada, sin `!important`) y sin tocar `ScShock`, que arranca invisible a propósito. Verificado con JavaScript deshabilitado en Chrome real, 1280×720 y 375×812: hero completo visible — arte, `<h1>`, subtítulo, apoyo, CTA y navbar, todos a `opacity: 1` — y el anillo del pulso correctamente en `0`.

**Efecto colateral medido y declarado.** El CLS del escenario throttled pasa de `0` a `0,000118` (reproducible en 3 pasadas; escritorio y móvil sin throttling siguen en `0` exacto). La causa, aislada: al intercambiarse la webfont (`~1054 ms`), la caja del `<h1>` reflúe en horizontal — ancho `213,63 → 219,64 px`, `left 80,69 → 77,67 px`, alto y `top` sin cambio — y el desplazamiento se registra a `~1167 ms`. Ese reflujo **no lo introduce esta entrega** (nada del cambio toca layout): lo que cambia es que el texto ya es visible cuando ocurre, y la API de inestabilidad de layout sólo contabiliza contenido visible — antes el hero seguía invisible a esa altura. El fallback con métricas ajustadas que genera `next/font` («Hanken Grotesk Fallback») absorbe casi todo; el residuo es `0,12 %` del umbral «bueno» (`0,1`).

---

## 6. Mecánica

### 6.1 El hallazgo que lo desbloquea todo

`task/lessons.md` (2026-07-26) registra que una `@keyframes` sobre una propiedad **impide que su `transition` llegue a existir**. Por eso el ojo se fundía uniformemente en `ScEyeStack`: sus capas `iris` y `pupil` ya animan `opacity` con `@keyframes` (la respiración de la corona), así que un `transition-delay` por capa habría sido código muerto.

**Medido en este navegador (Chromium, reloj conducido a mano vía `Animation.currentTime`):** dos animaciones CSS sobre la misma propiedad del mismo elemento **sí** conviven, y gana **la última de la lista `animation-name`**.

| Sonda | Resultado |
| --- | --- |
| `pGlow, pIn` (entrada la última) | En el retardo: `0` (fill `backwards`). A mitad: `0.5`. Al terminar: `0.851` → **el glow retoma el control** |
| `pIn, pGlow` (glow la última) | `0.2` fijo siempre → control negativo: **el orden importa** |
| `pGlow, pOut` (`forwards`) | A mitad: `0.5`. Después: `0` sostenido **contra la animación infinita** |
| `active → leaving` por `[data-state]` | La última entrada se sustituye y arranca de cero; el glow sobrevive |

Es decir: el escalonado por capa del ojo se declara **como animación, no como transición**, con la animación del escalonado **última** en la lista. Ni `mix-blend-mode` ni el `transform` del parallax se tocan, que es justo lo que hacía inviables las dos alternativas obvias (envolver cada capa en un div con opacidad rompe el grupo de blending; mover el glow rompe el parallax).

### 6.2 Forma del escalonado

Compartida por las dos composiciones, con la tabla y el ancestro `[data-state]` como únicas diferencias:

```css
/* estado pending: montado pero invisible, sin animación en curso */
[data-state="pending"] & { opacity: 0; animation: none; }

/* estado active: entrada, ÚLTIMA de la lista */
[data-state="active"] & {
  animation-name:           <glow…>, heroPieceIn;
  animation-duration:       <…>,     420ms;
  animation-delay:          <…>,     {i * 110}ms;
  animation-fill-mode:      <…>,     backwards;
  animation-iteration-count:<…>,     1;
}

/* estado leaving: salida, con fill forwards para sostener el 0 */
[data-state="leaving"] & {
  animation-name:      <glow…>, heroPieceOut;
  animation-delay:     <…>,     {(len - 1 - i) * 110}ms;
  animation-fill-mode: <…>,     forwards;
}
```

Las piezas sin glow declaran la lista de un solo elemento. Los `@keyframes` del escalonado llevan **`from` Y `to` explícitos** (`0 → 1` y `1 → 0`): un fotograma implícito se resuelve contra el valor subyacente —el del glow— y produce una curva que depende de en qué punto de su respiración esté la capa. Medido: con endpoints explícitos, `0.5` exacto a mitad de recorrido; con endpoint implícito, `0.422`. Se quiere lo primero.

### 6.3 Lo que NO se toca

- `mix-blend-mode` sigue en el **mismo** elemento que el `transform` del parallax (`ScLayer`), hijo directo del contenedor con `isolation: isolate`.
- Ningún elemento nuevo con `opacity < 1` envuelve una capa aditiva: crearía un contexto de apilamiento y el `plus-lighter` se sumaría contra un grupo vacío.
- `AURA_LAYERS`, `EYE_LAYERS`, las profundidades de parallax y la geometría del encuadre.

### 6.4 `ScEyeStack` deja de animar su opacidad

Pasa a ser posicionamiento puro, igual que `ScAuraStack`. Si el envoltorio siguiera animando su opacidad, el efecto compuesto sería el **producto** de las dos y la coreografía se aplanaría en un único fundido blando — el mismo razonamiento que ya documenta `ScAuraSubject`. El atributo `data-state` se queda donde está; las piezas del ojo lo leen con el selector **descendiente** `[data-state="..."] &`, no calificado.

### 6.5 `prefers-reduced-motion`

`GlobalStyles` colapsa `animation-duration` a `0.001ms` pero **no toca `animation-delay`**. Un escalonado con 550 ms de retardo y `fill: backwards` dejaría la capa invisible medio segundo y luego aparecería de golpe: peor que no animar. **Cada pieza escalonada declara explícitamente `animation: none`** bajo `reduce`, y la máquina de fases entrega el estado final de inmediato. Bajo `reduce` no hay intro, no hay secuencia y el cambio de tema es instantáneo.

El guard tiene que cubrir **los TRES estados, `pending` incluido**, y en las DOS composiciones. Es un bug que esta misma revisión introdujo y que la revisión encontró: hasta ahora `pending` solo existía durante un cambio de tema, así que el hueco era inofensivo; con la carga arrancando en `pending` (§7.2), una composición cuyo guard de `reduce` no cubriera ese estado se quedaría **invisible hasta que resolviera el `decode()`** (hasta ~650 ms) y luego aparecería de golpe — y como la máquina de fases bajo `reduce` va directa a `settled`, el usuario vería el texto sobre el fondo desnudo del tema y después un salto. Exactamente el destello que `reduce` existe para evitar. `auraStagger()` tenía ese hueco (cubría solo `active`/`leaving`); `eyeStagger()` no. Ahora las dos tratan `reduce` igual.

El ojo necesita **además** un guard ambiental, sin ningún `[data-state]` en el selector: la respiración de la corona (`glowStrong`/`glowSoft`) no depende del escalonado, así que un `<Eye/>` montado fuera de un backdrop —como lo monta su propio test, y como lo haría cualquier consumidor futuro— seguiría respirando bajo `reduce` si el único guard estuviera calificado por `[data-state]`. Los dos niveles cubren dos situaciones de montaje distintas; ninguno sustituye al otro.

---

## 7. Arquitectura

### 7.1 Máquina de fases de la página — `src/motion/`

El navbar es hermano del hero en `app/page.tsx`, no descendiente: no puede leer el estado del hero por CSS ni por props. Se añade un proveedor propio, montado en `app/providers.tsx` dentro de `ThemeProvider`.

- `src/motion/stage.ts` — tipos y tiempos derivados. Sin React.
- `src/motion/StageProvider.tsx` — proveedor + `useStage()`.

```ts
export type StagePhase = "backdrop" | "chrome" | "settled";

interface StageValue {
    readonly phase: StagePhase;
    /** Lo llama HeroBackdrop cuando el stack de la CARGA pasa a "active". */
    readonly markBackdropRevealed: () => void;
}
```

- Arranca en `"backdrop"`.
- `markBackdropRevealed()` programa `"chrome"` a `HERO_CHROME_OFFSET_MS` y `"settled"` después.
- **Red de seguridad obligatoria:** si nadie reporta en `HERO_DECODE_TIMEOUT_MS + HERO_STACK_MS`, avanza igual. Sin ella, cualquier página con navbar y sin hero —hoy `not-found`, mañana cualquiera— dejaría el navbar invisible para siempre. Es el mismo criterio de la lección de 2026-07-26 sobre esperas sin tope.
- Bajo `reduce`: `"settled"` desde el primer render, sin temporizadores.
- Llama a `markBackdropRevealed` **una sola vez** (guardado con una ref): los cambios de tema posteriores no reinician el intro.

### 7.2 Carga: reutilizar la máquina que ya existe

> **Enmienda 2026-08-11 (§5.5):** todo lo de esta sección sigue vigente **para el fondo** — sigue montándose en `"pending"`, sigue corriendo la carrera de `decode()` y sigue avisando a `markBackdropRevealed()`. Lo que ya no cuelga de ese aviso es la entrada de la copia y del navbar (§7.4), que pasaron a CSS estático por LCP. Añadido en la misma entrega: un guard `@media (scripting: none)` en `auraStagger`/`eyeStagger` para que el fondo no se quede invisible para siempre cuando el navegador no ejecuta scripts y `data-state` nunca sale de `"pending"`.

`HeroBackdrop` monta hoy el stack inicial directamente en `"active"`. Pasa a montarlo en `"pending"` y a correr **la misma** carrera de `decode()` que ya usa el cruce; al terminar, lo pasa a `"active"` (lo que dispara el escalonado de entrada) y avisa al proveedor. No se añade ninguna máquina nueva: la coreografía de carga **es** la de entrada del cruce, con el stack saliente ausente.

El ajuste de hidratación (`changeSource === "hydration"`) sustituye el stack pendiente y vuelve a correr la carrera, sin cruzar y sin reiniciar el intro: sigue siendo la carga asentándose.

### 7.3 Cambio de tema: el relevo secuencial

`HeroBackdrop` gana un tramo entre el `decode()` y el `finishCrossfade`:

1. `t=0` — cambio de tema de usuario. El stack entrante se monta en `"pending"`; el saliente pasa a `"leaving"` a los `HERO_BACKDROP_HOLD_MS`, cuando la copia ya se ha apagado.
2. El `decode()` del entrante corre **en paralelo** con el colapso del saliente: al llegar el relevo, sus imágenes ya están listas y no hay espera visible.
3. `t=HERO_HANDOFF_MS` — el saliente se desmonta y el entrante pasa a `"active"`.

El token de ejecución y la limpieza de temporizadores existentes se conservan tal cual y cubren los dos temporizadores nuevos: dos toggles rápidos no pueden dejar un stack huérfano ni pisarse el relevo.

**Reversión a mitad de camino** (el usuario vuelve al tema anterior antes del relevo): el stack que entra ya estaba montado y saliendo; se reactiva directamente a `"active"` sin pasar por `"pending"`, que es la rama que ya existe hoy.

### 7.4 Copia y navbar

> **Enmienda 2026-08-11 (§5.5):** el primer punto (el cruce de tema de la copia, `useHeroCopySwap`) sigue vigente tal cual. Los dos siguientes ya no: en la carga, ni la copia ni el navbar leen `useStage().phase` — su entrada es `@keyframes` + `animation-delay` estáticos, presentes en el CSS del HTML exportado. El escalonado de 80 ms y los 320 ms del navbar no cambian; el navbar conserva además su `HERO_CHROME_OFFSET_MS` verbatim, la copia no (razón medida en §5.5).

- `useHeroCopySwap` deja de esperar: oculta la copia en `t=0` y la devuelve en `HERO_COPY_RETURN_MS`, aplicando la distribución nueva mientras sigue invisible. Los dos temporizadores encadenados y la cancelación por cambio de tema se conservan.
- En la carga, la copia y el navbar leen `useStage().phase` y arrancan su animación al entrar en `"chrome"`. El escalonado interno de 80 ms de los cinco hijos de la copia **no cambia**.
- El navbar entra con `opacity` + `translateY(-8px)`, con `motion.duration.slow` de la escala del sistema: es una transición de interfaz normal, no parte de la coreografía del hero, así que aquí sí corresponde el token y no una constante propia.

---

## 8. Verificación

| Qué | Cómo | Dónde |
| --- | --- | --- |
| Órdenes de las tablas | `toEqual` sobre `EYE_STAGGER` / `AURA_STAGGER` | `eye.layers.test.ts`, `aura.layers.test.ts` |
| Retardos de entrada y salida | `getComputedStyle(...).animationDelay` contra la constante importada | `HeroBackdrop.test.tsx` |
| Relevo secuencial | Fake timers: a `HERO_HANDOFF_MS - 1` el saliente sigue montado; a `HERO_HANDOFF_MS` se ha ido y el entrante está `active` | `HeroBackdrop.test.tsx` |
| Carga escalonada | Al montar, el stack arranca en `pending` y pasa a `active` tras la carrera | `HeroBackdrop.test.tsx` |
| Fases | `backdrop → chrome → settled`; red de seguridad sin hero; `reduce` = `settled` directo | `StageProvider.test.tsx` (nuevo) |
| Copia | Se apaga en `t=0` y vuelve en `HERO_COPY_RETURN_MS` | `hero.transition.test.tsx` |
| Navbar | Invisible en `backdrop`, visible en `chrome` | `Navbar.test.tsx` |
| `reduce` | Todo instantáneo, sin retardos pendientes | Los anteriores, con `matchMedia` stubeado |

**Aserciones sobre `animation`:** siempre por longhand (`animationDelay`, `animationFillMode`), nunca por la abreviatura `animation`, que jsdom no expande — lección de 2026-07-25. Y siempre contra la constante **importada**, nunca contra un literal escrito a mano.

**Resultado:** `pnpm test` → 48 archivos / 481 tests en verde (línea base antes de esta entrega: 47 / 445). `pnpm check` (typecheck + lint + formato) limpio.

### 8.0 Verificado en navegador real (Chromium, 2026-07-27)

Lo que la suite **no** puede medir —jsdom no evalúa condiciones `@media` en absoluto, ni siquiera una trivialmente verdadera, así que `getComputedStyle` no distingue el guard de `reduce` presente del ausente— se verificó en el navegador del dev server, con el reloj conducido a mano (§8.1):

| Comprobación | Resultado |
| --- | --- |
| Retardos de Aura en `active` | `orb 0s · field/base/foot 0.11s · energy 0.22s · handLeft 0.33s · handRight 0.44s` — el orden nuevo, exacto |
| Retardos del ojo en `active` | `socket/mascot 0s · background 0.11s · eyelid 0.22s · nebula 0.33s · iris 0.44s · pupil/scrim 0.55s` |
| Lista de animaciones de `iris`/`pupil` | `animation-delay: "0s, 0.44s"` / `"0s, 0.55s"`, `fill-mode: "none, backwards"` → **dos animaciones, el escalonado el ÚLTIMO**, sobre los componentes reales |
| Estado final tras conducir el reloj | Todas las piezas llegan a `opacity 1` (`iris` 0.993 / `pupil` 0.981 = su respiración; `shock` 0 = solo pulso de click). Ninguna queda invisible |
| Relevo secuencial | `aura:active` → `eye:pending \| aura:active` → `eye:pending \| aura:leaving` → `eye:active`. El ORDEN de estados, confirmado; el instante exacto (1070 ms) lo fijan los fake timers |
| Navbar | `data-intro="in"`, llega a `opacity 1` y `translateY(0)` |
| Cascada del guard de `reduce` en `pending` | Réplica de la estructura con un media query universalmente verdadero: **con** `pending` en la lista → `opacity 1`; **sin** él (control negativo) → `opacity 0`. Confirma que el bug de §6.5 era real y que el arreglo gana la cascada |

### 8.1 Límite honesto de este entorno

El navegador de esta sesión corre con `document.hidden === true` de forma permanente: **no compone frames y las animaciones CSS nunca reciben un `startTime`**, así que muestrear opacidades con `setTimeout` devuelve valores congelados. Toda verificación de movimiento aquí conduce el reloj a mano (`Animation.currentTime`), que sí fuerza el recálculo de estilo y es determinista. Lo que **no** se puede verificar en este entorno queda anotado en `docs/qa-3d-pendiente.md`:

- Aspecto real de la secuencia a 60 fps.
- Impacto en LCP (§5.4).
- Coste de compositor de las capas con `will-change` durante el escalonado.

---

## 9. Fuera de alcance

- Comprimir el presupuesto de §5.3 (es una decisión de dirección, no de implementación).
- Animar el navbar en el cambio de tema (§1.1).
- Tocar el arte, la geometría, el parallax o el pulso de click de cualquiera de las dos composiciones.
- `Story` y las secciones siguientes.
