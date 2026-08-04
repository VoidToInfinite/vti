# Navegación fluida, parallax por sección y microinteracciones en los dos temas

**Fecha:** 2026-08-04 · **Rama:** `feature/landing-motion-interactions`

**Encargo (literal del usuario):**

> Mejorar la transición y presentación de las secciones en general y las microinteracciones en ambos temas. La navegación en la página debe ser fluida. Al realizar scroll, en perspectiva del usuario, debe sentir que está navegando lentamente en la página observando cada detalle. El efecto parallax de cada sección debe interaccionar cuando se encuentra dentro de esa sección y, cuando se abandona esa sección, restaurar cada elemento del efecto parallax a su posición inicial. Secciones Features y Contacto: ajustar el alto a tamaño vista del dispositivo en todas las resoluciones. En sección Contacto, bajar el background para que se vea correctamente la figura celestial. Cuando se cambia de tema, si el usuario no se encuentra en la zona del Hero, realizar animación de scroll hacia arriba y después cambiar el tema.

---

## 1. Estado medido antes de tocar nada

Todas las cifras de esta sección son medidas reales tomadas en el dev server (`http://localhost:3000`, HEAD `7500214` más los cambios manuales sin commitear del usuario), no estimaciones.

### 1.1 Geometría de la página (tema oscuro, 1280×720)

| Sección  | Alto    | Pantallas                         |
| -------- | ------- | --------------------------------- |
| Hero     | 720 px  | 1,00                              |
| Story    | 5040 px | 7,00 (6 diapositivas + 1 de cola) |
| Journey  | 6480 px | 9,00 (8 diapositivas + 1 de cola) |
| Features | 1568 px | **2,18**                          |
| Contacto | 720 px  | 1,00                              |

El desglose de Features es `ScDarkSceneSlot` 720 px (pegado) + `ScDarkFrame` **847,8 px** + `ScDarkTail` 720 px, con el marco y el slot compartiendo la fila 1 del grid. El marco declara `min-height: 100dvh`, así que **el contenido lo desborda en 128 px** a 1280×720.

### 1.2 Alto del marco de contenido por viewport

| Viewport | Features `ScDarkFrame` | Sobrante | Contacto `ScDarkFrame` | Sobrante |
| --- | --- | --- | --- | --- |
| 1280×720 | 848 px | +128 | 720 px | 0 |
| 390×844 | 1074 px | +230 | 844 px | 0 |
| 375×667 | 1074 px | **+407** | 772 px | **+105** |

Contacto sí cumple «una pantalla» en viewports altos y falla en los cortos: su contenido real mide 644 px a 375 px de ancho y el marco añade `space[8]`/`space[8]` (128 px) de relleno vertical.

### 1.3 Encuadre de la escena de Contacto

`ScLayer` (`contactCosmicGuardian.parts.tsx:52`) se pinta con `object-fit: cover`, `object-position: 50% 50%` y `transform: scale(1.06)` con `transform-origin` en el centro. El lienzo es 3344×1882 (proporción 1,7765) y la figura ocupa **y = 2,92 %…98,72 %** del alto (sprite 770×1803 pegado en (2030, 55), dato del manifest).

Consecuencia calculada (script reproducible, `object-fit: cover` + overscan):

| Viewport      | Proporción | ¿Cabeza visible? | Franja del lienzo visible |
| ------------- | ---------- | ---------------- | ------------------------- |
| 1280×720      | 1,78       | sí               | 2,9 %…97,1 %              |
| 1440×900      | 1,60       | sí               | 2,8 %…97,2 %              |
| **1366×650**  | 2,10       | **NO**           | 10,1 %…89,9 %             |
| **1600×780**  | 2,05       | **NO**           | 9,1 %…90,9 %              |
| **1920×930**  | 2,06       | **NO**           | 9,4 %…90,6 %              |
| **2560×1080** | 2,37       | **NO**           | 14,6 %…85,4 %             |

Es decir: **en cuanto la ventana es más apaisada que ≈1,83 la guardiana pierde la cabeza**, que es exactamente el defecto reportado. Una ventana maximizada de 1920×1080 con cromo de navegador y barra de tareas cae en 1920×930 → proporción 2,06 → decapitada. Los pies, en cambio, **nunca** se ven enteros en ningún viewport medido, ni antes ni después del arreglo: la última fila del arte cae siempre bajo el borde inferior o bajo el tramo más opaco de la viñeta.

### 1.4 Parallax: qué hace hoy al abandonar la sección

- `useSceneParallax` (4 escenas oscuras) **pausa** el bucle al salir del viewport (`pause()`, `useSceneParallax.ts:228-234`) y **no** restaura el `transform`. El reset (`stop()`, líneas 242-248) solo ocurre con `prefers-reduced-motion: reduce` o al desmontar.
- `useParallaxLayers` (Eye/Aura del hero) **no tiene guarda de visibilidad ninguna**: su rAF corre desde el montaje hasta el desmontaje, esté el hero en pantalla o no, y tampoco restaura nada.

### 1.5 Movimiento ligado a scroll en tema claro

Ninguno. Las cuatro secciones claras solo tienen `useReveal` con `once: true` (una entrada, una vez) y hover en tarjetas/CTA. No hay ni una propiedad ligada al progreso de scroll.

### 1.6 Cambio de tema

`ThemeToggle` (`ThemeToggle.tsx:30`) llama `toggleTheme()` directamente. No hay ninguna relación con la posición de scroll. El hero **no tiene `id`** ni ningún ancla que permita preguntar «¿el usuario está en la zona del hero?».

---

## 2. Decisiones

### D1 — El scroll del usuario NO se secuestra

La sensación de «navegar lentamente observando cada detalle» se consigue con **movimiento ligado al progreso de scroll**, nunca interceptando la rueda ni con una librería de scroll suavizado ni con `scroll-snap`. Este repo ya pagó esa lección: `GlobalStyles.tsx:52-70` documenta la retirada de `scroll-snap-type: y proximity` porque, con anclas del tamaño del viewport, degeneraba en `mandatory` y producía tirones de hasta 240 px, a veces en contra del gesto. Cualquier mecanismo que vuelva a decidir por el usuario cuánto avanza su rueda reproduce ese fallo con otro nombre.

Lo que sí se hace: que cada sección tenga algo que mirar mientras pasa. Un fondo que se desplaza a distinta velocidad que el texto, una entrada que se resuelve con calma y un cierre que devuelve las piezas a su sitio hacen que el mismo recorrido de rueda se perciba más lento y más habitado.

### D2 — Un solo hook publica el progreso de sección: `useSectionProgress`

Nuevo hook `src/hooks/useSectionProgress.ts`. Contrato:

```ts
useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  options?: { readonly smooth?: number; readonly cssVarPrefix?: string },
): void
```

Escribe **sobre el propio elemento**, en cada frame y solo mientras intersecta:

- `--section-enter`: 0 cuando el borde superior de la sección está en el borde inferior del viewport, 1 cuando la sección ya ocupa su sitio. Es la rampa de ENTRADA.
- `--section-progress`: 0…1 sobre todo el recorrido de la sección por el viewport. Es el término de TRAVESÍA, el que consume el parallax de contenido.
- `data-inview="true" | "false"` en el elemento.

Reglas duras del hook, heredadas de los tres precedentes del repo (`useSceneParallax`, `useSlideDeck`, `useParallaxLayers`):

1. **Nunca provoca un render de React por frame.** Escribe `style.setProperty` y `dataset` a pelo.
2. **Guarda de `IntersectionObserver`** obligatoria: el bucle de rAF solo corre mientras la sección intersecta (lección `task/lessons.md` 2026-07-31, «un rAF sin guarda de visibilidad se multiplica por cada consumidor del hook»).
3. **Guarda de `prefers-reduced-motion: reduce`** reactiva, con su propio listener: bajo `reduce` el hook no arranca, fija `--section-enter: 1`, `--section-progress: 0` y `data-inview="true"` una vez, y se apaga. Un valor congelado en el estado final es siempre mejor que un valor congelado a medias.
4. **Suavizado por lerp** (`smooth`, defecto `0.12`) entre el valor medido y el aplicado, mismo patrón que `MODE_LERP` de `useSceneParallax`: es lo que convierte el escalón de la rueda en una rampa continua y lo que produce, de hecho, la sensación de lentitud pedida.
5. **Al salir, devuelve los valores a reposo** (ver D3) en vez de congelarlos.

### D3 — El parallax se restaura al abandonar la sección (encargo explícito)

Cambia el contrato de `useSceneParallax` y de `useParallaxLayers`: salir de la sección deja de ser «pausar y congelar» y pasa a ser «volver a reposo y luego parar».

**Cómo, y por qué así:** no se escribe el reposo de golpe. Un `transform = ""` en el instante del cruce produce un salto de hasta ~50 px en la capa más cercana de Story (`pointerAmp.y` 20 × depth 0,72 × 2 + el término de scroll) — es exactamente el salto que el docblock actual de `useSceneParallax` describe como motivo para NO resetear. La objeción es correcta y se respeta: lo que cambia no es «resetear sí o no», es **cómo**. Al salir, el bucle sigue vivo con el objetivo fijado en el reposo (puntero 0, deriva 0, progreso de scroll 0) y el mismo lerp que ya suaviza el cambio de modo lleva las capas a su sitio en unos pocos frames; cuando el residuo baja de `REST_EPSILON`, se escribe el `transform` de reposo exacto, se cancela el rAF y se quitan los listeners. Se conserva íntegro el ahorro de CPU que motivó la guarda de visibilidad (el bucle acaba parado igual), y se gana lo que pide el encargo: la sección se reencuentra siempre en su posición inicial, no torcida en la postura que tenía el cursor al salir.

`useParallaxLayers` (Eye/Aura del hero) recibe **además** la guarda de `IntersectionObserver` que hoy no tiene. Sin ella, «restaurar al abandonar la sección» ni siquiera es expresable para el hero, y de paso se corrige un rAF permanente que corre durante toda la sesión aunque el hero lleve doce pantallas fuera de vista.

### D4 — Features y Contacto miden una pantalla; el contenido se compacta para caber

El marco de contenido de las dos secciones oscuras pasa de `min-height: 100dvh` a **`height: 100dvh`** exacto, y el contenido se compacta hasta caber en él en todo el rango de resoluciones medido. No se recorta nada: el orden es al revés — primero cabe, después se fija la altura.

Palancas de compactación, en este orden (de menos a más invasiva):

1. Relleno vertical del marco fluido con `clamp()` en vez de `space[8]` fijo.
2. Interlineado y separación entre bloques fluidos.
3. Bullets a dos columnas desde un ancho MENOR (`sm`), no solo desde `lg`: en Features son cuatro filas por identidad × 3 identidades, la partida más cara del presupuesto vertical en móvil.
4. Escala tipográfica del contenido oscuro con `clamp()` acotado por abajo al mínimo legible.

**Presupuesto medido a batir:** Features debe perder 407 px a 375×667 y 128 px a 1280×720; Contacto, 105 px a 375×667. El punto de control obligatorio es 375×667 (el viewport más corto del rango de soporte) y 1280×720.

**Regla de seguridad (no negociable):** si en algún viewport el contenido sigue sin caber tras la compactación, ese viewport se declara y se mide en el informe, y el marco crece en vez de recortar. Un texto cortado es un defecto peor que una sección de 1,1 pantallas.

**Tema claro:** las mismas dos secciones adoptan `min-height: 100dvh` con el contenido centrado, no `height` exacto. La rama clara de Features son tres tarjetas con figura, cuerpo, cuatro bullets y CTA cada una: en un teléfono de 667 px de alto no caben en una pantalla sin destruir la legibilidad, y forzarlo sería recortar. `min-height` da el mismo efecto de «sección a pantalla completa» donde el contenido lo permite y crece donde no.

### D5 — La escena de Contacto se ancla por arriba

`ScLayer` pasa a `object-position: 50% var(--guardian-focus-y)` con `CONTACT_GUARDIAN_FOCUS_Y = "0%"`, y `transform-origin: 50% 0%` para que el overscan de 1,06 crezca hacia abajo en vez de repartirse arriba y abajo.

Con eso, **la franja visible del lienzo empieza siempre en el 0 % y todo el recorte se va al borde inferior**: la cabeza de la guardiana está garantizada en los diez viewports calculados, incluidos los cuatro que hoy la decapitan. El coste es recorte por abajo (hasta el 70,7 % del lienzo a 2560×1080), y es un coste casi gratis: los pies no se veían enteros en ningún viewport ni antes ni después, y la banda inferior es justo donde la viñeta (`ScVignette`, parada `f7` = 97 % de opacidad en el 0 %) ya tapa el arte por completo.

**Lo que NO se toca:** el encuadre horizontal. Está medido que en viewports estrechos la figura queda casi fuera de cuadro (a 390×844 solo asoman ~25 px de sus 366 px de ancho), y existe un `object-position` en X que lo corregiría (≈72 %, el centro de la figura). Se deja fuera **a propósito**: el encargo pide bajar el fondo, no moverlo de lado, y la banda de anchos entre `md` y `lg` es exactamente la que produjo el peor píxel de 1,83:1 documentado en `task/lessons.md` (2026-08-04). Traer la figura al centro del cuadro ahí mete la masa luminosa debajo del texto en el único régimen donde el contenido va a ancho completo. Se mide y se reporta como recomendación separada, no se aplica de tapadillo.

### D6 — El cambio de tema vuelve al hero primero

Nuevo hook `src/hooks/useThemeScrollReset.ts`, consumido por `ThemeToggle`. Comportamiento:

1. Si el usuario **está en la zona del hero**, cambia el tema igual que hoy, sin más.
2. Si **no** lo está: `window.scrollTo({ top: 0, behavior: "smooth" })`, espera a que el scroll termine, y **después** cambia el tema.

**Definición de «zona del hero», y por qué esta:** el hero recibe `id="hero"` (hoy no tiene ninguno) y la zona es «el hero todavía cubre al menos la mitad del viewport», es decir `heroRect.bottom >= innerHeight / 2`. No se usa `scrollY === 0` (demasiado estricto: un pixel de inercia dispararía un viaje absurdo) ni un umbral en píxeles escrito a mano (miente en cuanto el viewport cambia de alto). Si no hay elemento `#hero` en la página —`app/not-found.tsx` monta el navbar sin hero—, la regla degrada a `scrollY < innerHeight / 2`, que es lo mismo para una página de una sola pantalla.

**Espera del scroll, con tope obligatorio:** se escucha `scrollend` cuando el navegador lo soporta y se cae a un sondeo por rAF cuando no. **En los dos casos hay un temporizador tope** (`THEME_SCROLL_TIMEOUT_MS`) tras el cual el tema cambia igual. Es la lección del repo de 2026-07-26, literal: en una pestaña oculta el navegador no dispara rAF y `scroll-behavior: smooth` no progresa nunca; un aviso que puede no llegar jamás no puede ser la única vía de progreso. Sin el tope, el botón de tema se quedaría inerte para siempre en ese entorno.

**`prefers-reduced-motion: reduce`:** `behavior: "instant"` y cambio de tema en el mismo tick, sin esperas. La intención del encargo —no cambiar el tema con el usuario perdido a doce pantallas del hero— se conserva; lo que se pierde es el viaje animado, que es justo lo que `reduce` pide perder.

**Reentrada:** un segundo clic mientras el viaje está en curso no encola un segundo cambio ni cancela el primero: se ignora mientras `pending` esté activo. Dos toggles encadenados dejarían el tema donde estaba con una animación de scroll de regalo.

### D7 — Microinteracciones: mismo lenguaje en los dos temas

Auditoría y nivelación, no invención de efectos nuevos:

- Todo estado interactivo (`:hover`, `:focus-visible`, `:active`) de los átomos (`Button`, `IconButton`, `Card`, `Input`, enlaces de navegación, CTA de sección) tiene que existir **en los dos temas** y resolver contra tokens de tema, nunca contra literales de una rama.
- Toda transición anima solo `transform`/`opacity`/`box-shadow`/`color`/`border-color` — nunca propiedades de layout.
- Todo bloque con `transition` o `animation` lleva su guard explícito de `prefers-reduced-motion: reduce` en el propio componente. El colapso global de `GlobalStyles` (`animation-iteration-count: 1 !important`) **no** basta para una animación infinita: la deja en un fotograma arbitrario (lección 2026-07-25).
- Las entradas de las secciones claras pasan a `motion.duration.slower` con `easing.decelerate`, y `useReveal` gana un `rootMargin` para arrancar un poco antes de que la pieza cruce el borde: una entrada que ya está a medias cuando la miras se lee como serenidad, una que arranca cuando ya la estás mirando se lee como retraso.

### D7-bis — Excepción declarada: el despegue del navbar sigue animando longitudes

La auditoría de microinteracciones encontró tres transiciones sobre propiedades de layout que incumplen la letra de D7: `ScHeader` anima `padding-inline` (`Navbar.tsx:87-98`) y `ScBar` anima `max-width` y `margin-top` (`Navbar.tsx:162-186`).

**No se corrigen en esta entrega, y esto es una excepción declarada, no un descuido.** Son el mecanismo central del despegue del navbar, que tiene spec propia (`2026-07-31-navbar-scroll-detach-design.md`) y una justificación escrita en el propio fichero: se interpolan dos longitudes absolutas conocidas, nunca hay un salto, y el efecto —una píldora que se estrecha y se separa— no es reproducible con `transform` sin deformar el contenido de la barra. Reescribirlo es una entrega en sí misma, con su propia verificación en navegador, y el encargo de hoy no la pide. Queda anotado como deuda con nombre y línea en `task/todo.md`.

Lo que sí se cierra del navbar es el guard incompleto de `reduce` en `ScBar` (`Navbar.tsx:188-190`), que no redeclara su estado anidado `[data-scrolled="true"] &` mientras su vecino `ScHeader` sí lo hace: eso no es una excepción, es una divergencia entre dos hermanos del mismo fichero.

### D8 — Alcance explícitamente excluido

- No se convierte Features en una presentación de diapositivas al estilo Story/Journey, aunque resolvería el alto de un plumazo: es un cambio de arquitectura de sección que el encargo no pide.
- No se toca la cadena de solapes Story → Journey → Features → Contacto ni ninguna de sus invariantes de `dvh` (las atan tests: `Features.test.tsx`, `Contact.test.tsx`).
- No se toca el pipeline de imágenes ni se regenera ningún WebP.
- No se corrige el encuadre HORIZONTAL de la escena de Contacto (ver D5).

---

## 3. Reparto en flujos de trabajo

| Flujo | Alcance | Ficheros |
| --- | --- | --- |
| **G1** | D3 — retorno a reposo del parallax | `src/hooks/useSceneParallax.ts`, `useSceneParallax.test.tsx`, `useParallaxLayers.ts`, `useParallaxLayers.test.tsx` |
| **G2** | D2 — hook de progreso de sección | `src/hooks/useSectionProgress.ts` (+ test) |
| **G3** | D5 — encuadre vertical de la escena de Contacto | `contactCosmicGuardian.parts.tsx`, `.layers.ts`, `ContactCosmicGuardian.test.tsx` |
| **G4** | D6 — cambio de tema con vuelta al hero | `src/hooks/useThemeScrollReset.ts` (+ test), `ThemeToggle.tsx` (+ test), `Hero.tsx` (`id="hero"`), `Hero.test.tsx` |
| **G5** | D4 + D7 en Features y Contacto | `Features.tsx`, `features.layers.ts`, `Features.test.tsx`, `Contact.tsx`, `contact.layers.ts`, `Contact.test.tsx` |
| **G6** | D1 + D7 en Story, Journey y átomos | `Story.tsx`, `Journey.tsx`, `useReveal.ts` (+ tests), átomos de `components/ui/` |

G1, G2, G3 y G4 son independientes entre sí y corren en paralelo. G5 y G6 consumen el hook de G2 y corren después. Ningún flujo escribe un fichero que otro flujo también escriba.

---

## 4. Definition of Done

- [x] `pnpm test` en verde, con la suite COMPLETA, y con un test nuevo por cada decisión atable. — **735/735 en 62 ficheros** (baseline de la entrega anterior: 656).
- [x] `pnpm check` (typecheck + eslint + prettier) sin errores nuevos. — `tsc --noEmit` y `eslint .` con exit 0; `prettier --list-different` vacío sobre `src/**`, `app/**`, `docs/**` y `task/**`. Único resto: `graphify-out/**`, artefacto generado que ya venía sin formatear de la entrega anterior.
- [x] Medición en navegador tras recarga completa (§5).
- [x] `graphify update .` — 2585 nodos, 3277 aristas, 181 comunidades.
- [x] Registro en el vault (`01-Projects/vti.md`), `task/todo.md` y `task/lessons.md`.

---

## 5. Verificación medida (navegador real, tras recarga completa)

### 5.1 Alto de las dos secciones, tema oscuro

Medido sobre `ScDarkFrame` (el marco del contenido; el slot de la escena mide siempre `100dvh` por construcción). «Sobrante» = alto del marco menos alto del viewport; 0 significa **exactamente una pantalla**.

| Viewport | Features antes | Features después | Contacto antes | Contacto después |
| --- | --- | --- | --- | --- |
| 1440×900 | — | **0** | — | **0** |
| 768×1024 | — | **0** | — | **0** |
| 1280×720 | +128 | **0** | 0 | **0** |
| 1366×650 | — | +28 | — | **0** |
| 390×844 | +230 | +98 | 0 | **0** |
| 375×667 | +407 | +240 | +105 | **0** |

**Contacto cumple el encargo en los seis viewports.** Features lo cumple en los tres centrales y no lo cumple del todo en los tres extremos; §5.4 explica por qué y qué haría falta para cerrarlo.

### 5.2 Tema claro

`ScFeatures` y `ScContact` declaran `min-height: 100dvh` con el contenido centrado. Medido a 1440×900: las dos secciones miden exactamente 900 px. Por debajo de eso crecen con su contenido, que es el comportamiento buscado (D4): la rama clara de Features son tres tarjetas con figura, cuerpo, cuatro bullets y CTA cada una, y forzarlas a una pantalla en un teléfono sería recortar.

### 5.3 Encuadre de la escena de Contacto

Verificado con **píxeles reales**, no solo con aritmética: se compusieron las tres capas WebP en un canvas del tamaño del viewport replicando `cover` + `object-position` + `scale(1.06)` con su `transform-origin`, y se buscó la primera fila con alfa de la figura. `fila 0` significa que la figura toca el borde superior, es decir, que está cortada.

| Viewport      | Antes                | Después     |
| ------------- | -------------------- | ----------- |
| 1280×720      | fila 13 (entera)     | fila 36     |
| 1440×900      | fila 17 (entera)     | fila 44     |
| **1366×650**  | **fila 0 — cortada** | **fila 37** |
| **1600×780**  | **fila 0 — cortada** | **fila 44** |
| **1920×930**  | **fila 0 — cortada** | **fila 52** |
| **2560×1080** | **fila 0 — cortada** | **fila 70** |
| 390×844       | fila 139 (entera)    | fila 165    |

### 5.4 Lo que NO se alcanzó, con su cifra

**Features no cabe en una pantalla en viewports cortos (≤ ~690 px de alto) ni en teléfonos estrechos (< 600 px de ancho).** Es un límite del contenido, no de la maquetación, y está medido:

- A 1366×650 el contenido mide **632 px** y el viewport **650**: caben 18 px de relleno vertical en total, 9 por lado. El relleno actual es de 22,75 px por lado, de ahí los 28 px de sobrante. Bajarlo a 9 px cerraría la cifra, pero metería la primera línea del contenido **por debajo del navbar flotante** (`--nav-height` 3,5rem + `--nav-gap`), que es un defecto peor que 28 px de sobrante.
- A 375×667 el contenido mide **860 px**. El suelo teórico de tres identidades con título, cuerpo, cuatro bullets y CTA, a tamaños legibles y con el área táctil de 40 px del CTA, ronda los **790 px** — por encima del viewport aunque el relleno fuera cero. Los bullets no pueden pasar a dos columnas ahí: el bullet más largo del contrato i18n mide 39 caracteres («Trabajo en equipo que se vuelve amistad»), unos 257 px con su icono, así que dos columnas necesitan ~600 px de contenido y a 375 px cada bullet se partiría en dos líneas — mismo número de filas y peor lectura.

Cerrar esos tres viewports exige una decisión de PRODUCTO, no de CSS, y por eso no se toma aquí: o una identidad por pantalla (la técnica de `useSlideDeck` que ya usan Story y Journey, excluida en D8 por ser un cambio de arquitectura de sección), o copia más corta en móvil. Queda planteado en `task/todo.md` como decisión abierta.

### 5.5 Cambio de tema (D6), verificado en vivo

Ejecutado contra la página real, no solo con la suite:

- **Fuera de la zona del hero** (`scrollY` 3505): `window.scrollTo({top:0, behavior:"smooth"})` se llama, el tema **no** cambia en ese instante, el botón **no** queda deshabilitado, y el tema cambia cuando vence el tope. El scroll no progresó ni un píxel porque este panel corre con `document.visibilityState === "hidden"` — o sea que la prueba ejercitó **exactamente** el escenario para el que existe el tope, y el botón no se quedó inerte.
- **Dentro de la zona del hero** (`scrollY` 0): `scrollTo` **no** se llama en absoluto y el tema cambia en menos de 60 ms.
- **Frontera de la zona**: a un 30 % de pantalla desplazada sigue dentro; a un 80 %, fuera.

### 5.6 Movimiento ligado a scroll

Nueve reglas CSS inyectadas consumen `--<sección>-progress` (Story 2, Journey 2, Features 1, Contacto 2, más los guards de `reduce`). Todas se escriben como `var(--x-progress, 0)`: con el hook sin arrancar —que es lo que ocurre en este panel, donde `IntersectionObserver` no dispara— las piezas computan `matrix(1, 0, 0, 1, 0, 0)`, verificado. Es decir: **el movimiento es aditivo y su ausencia no desplaza nada**, que es la propiedad que hace seguro añadirlo.
