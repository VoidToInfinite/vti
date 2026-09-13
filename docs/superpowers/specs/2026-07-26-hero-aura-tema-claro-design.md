# Hero — composición «Aura» para tema claro

**Fecha:** 2026-07-26 (revisada 2026-07-27) **Rama:** `feature/mejoras-hero-navbar` **Estado:** implementado; §15 documenta la revisión de assets del 2026-07-27

---

## 1. Contexto y estado actual

El hero monta hoy **una sola composición**: el ojo cósmico negro (`src/components/eye/`), cinco capas WebP con blending aditivo sobre negro, documentado en `assets/hero-eye/manifest.json`. Esa composición se pinta **igual en los dos temas** porque `Hero.tsx:33` anida un `ThemeProvider` con `basicDarkTheme` y `eye.parts.tsx:28` pinta el lienzo con `EYE_SURFACE = oklch(0 0 0)`.

Verificado en navegador real (`localhost:3000`, tema claro forzado por `localStorage`):

```
socketBg     : "oklch(0 0 0)"          <- el hero es negro tambien en claro
layers       : /hero/eye/00..04.webp   <- capas del ojo
copyAlign    : "center | textAlign=center"
mascot       : ["sol", "compass"]      <- Sol ya se monta dentro de la pupila
```

Lo único que hoy distingue al tema claro es la **mascota**: `Eye.tsx:146` monta `Sol` en claro y `Wormhole` en oscuro, ambos dentro de la misma pupila negra.

### Lo que aporta esta entrega

El tema claro deja de ser «el hero oscuro con otra mascota» y pasa a tener su **propia composición de fondo**: el arte pastel de manos y orbe, separado en capas, con la copia alineada a la izquierda. El cambio de tema deja de ser un salto y pasa a ser una **transición coreografiada** de las capas del fondo.

---

## 2. Objetivo

1. En **tema claro** el hero monta la composición pastel («Aura»): campo de fondo, mano izquierda, mano derecha, energía/partículas, y el componente **`Sol` en el lugar del orbe** del arte.
2. En **tema oscuro** el hero conserva exactamente la composición actual del ojo cósmico.
3. El cambio de tema anima el fondo con un **stagger** en el orden pedido: campo → mano izquierda → mano derecha → energía → orbe (`Sol`).
4. La transición anima **solo `opacity`** (propiedad de compositor), sin re-render por frame, y colapsa a instantánea bajo `prefers-reduced-motion: reduce`.
5. La distribución del tema claro sigue el mockup: copia a la izquierda, arte a la derecha.

### Criterio de éxito medible

- El hero en tema claro no pinta ningún píxel del lienzo negro salvo la rampa del pie.
- La transición no dispara ningún re-render de React por frame (se verifica con el Profiler o contando renders en test).
- `pnpm check` y `pnpm test` en verde, sin errores nuevos.
- Contraste AA del texto del hero sobre el fondo claro, medido, no estimado.

---

## 3. Datos medidos (fuente de verdad de la geometría)

Todo lo de esta sección está **medido**, no estimado. Los scripts que lo produjeron están en el scratchpad de la sesión; los resultados se transcriben a `assets/hero-aura/manifest.json`.

### 3.1 Las capas y su modelo de composición

| # | Fichero fuente | Alfa=0 | Alfa parcial | Bbox del contenido (alfa > 8) |
| --- | --- | --- | --- | --- |
| 01 | `01_fondo.png` | 0 % | 0 % (opaca) | lienzo completo |
| 02 | `02_mano_izquierda.png` | 94.94 % | 5.06 % | x 25.1–38.8 %, y 28.3–82.8 % |
| 03 | `03_mano_derecha.png` | 91.51 % | 8.36 % | x 60.8–85.3 %, y 26.9–99.9 % |
| 04 | `04_orbe.png` | 90.19 % | 9.65 % | x 37.8–62.1 %, y 19.8–63.9 % |
| 05 | `05_energia_particulas.png` | 15.79 % | 84.21 % | lienzo completo |

**Modelo de composición: `source-over` (alfa normal). NO es aditivo.** Recomponiendo las cinco capas en orden 01→05 con alfa normal:

| Comparación | Error medio | p99 | Máximo |
| --- | --- | --- | --- |
| vs `verificacion_recompuesta.png` | **0.49**/255 | 1/255 | 1/255 |
| vs `…Pastel Cosmic landing Page 2.png` (arte original) | **5.09**/255 | 18/255 | 26/255 |
| vs `…Pastel Cosmic landing Page.png` | 11.97/255 | 103/255 | 243/255 |

Las dos primeras filas confirman el modelo y confirman que **`Page 2.png` es el arte original** (coincide con el dato del encargo: 5.1/255 y p99 17.8). La tercera confirma que `Page.png` es **otra imagen**: el mockup de distribución, con 14 728 píxeles oscuros concentrados en los deciles X 0–3 (la copia, a la izquierda) y ninguno en el arte.

> Consecuencia directa: las capas de Aura **NO llevan `mix-blend-mode`**. El aditivo del ojo no es una preferencia estética sino la condición bajo la que se extrajeron sus máscaras (`eye.layers.ts:12-17`); aquí la condición es la contraria y copiar el patrón del ojo ensuciaría los bordes con feathering.

### 3.2 Geometría del orbe (lo que `Sol` tiene que ocupar)

Centroide del orbe ponderado por alfa: **(838.4, 391.7) px = (50.14 %, 41.63 %)** del lienzo.

Perfil radial de alfa media desde ese centro:

```
r=  60px  alfa  39      r= 144px  alfa 203  <- pico
r=  96px  alfa 116      r= 156px  alfa 203  <- pico
r= 120px  alfa 172      r= 180px  alfa  86  <- mitad del pico
r= 132px  alfa 191      r= 192px  alfa  28
                        r>=228px  alfa   0
```

- **Disco visible** (hasta la mitad del pico): r ≈ 180 px → Ø ≈ 360 px = **21.5 % del ancho**.
- **Resplandor** hasta r ≈ 210 px → Ø ≈ 420 px = 25.1 % del ancho.

### 3.3 La energía NO cubre el orbe

Alfa media de `05_energia_particulas.png` dentro del disco del orbe:

```
r <=  60px : 0.0/255      r <= 180px : 1.6/255
r <= 120px : 0.0/255      r <= 210px : 7.0/255
```

**Consecuencia de diseño:** aunque en el arte original la energía va _encima_ del orbe, no lo toca. Por eso `Sol` puede montarse como la capa **más alta** del stack sin perder fidelidad — que además es el orden que pide el encargo («…y final el orbe»).

### 3.4 Distribución del tema claro (dónde va el arte)

Correlación cruzada de la plantilla de alfa del orbe contra la cromaticidad del mockup `Page.png`, barriendo escala 0.85–1.35 y desplazamiento ±(60..160, 40) px:

```
MEJOR AJUSTE  escala=1.00  dx=+320px (+19.14% ancho)  dy=-48px (-5.10% alto)
centro del orbe en el MOCKUP = (69.28%, 36.52%)
centro del orbe en el ARTE   = (50.14%, 41.63%)
```

**El arte no se escala: se traslada.** El punto de anclaje del diseño es, por tanto:

> el orbe del arte, que vive en (50.14 %, 41.63 %) del marco, se ancla al eje **X = 69.28 %** del hero.

El desplazamiento vertical medido (−5.10 %) **no se adopta**: ver §3.6, donde la medida de los bordes de la capa de energía obliga a fijar el eje Y y hace que ese offset sea incompatible con un encuadre sin costuras. La diferencia (36.52 % medido en el mockup vs 41.63 % adoptado) es de 48 px sobre 941 en el arte original — dentro del margen de una referencia generada, no una desviación de diseño.

### 3.6 Bordes de la capa de energía: lo que decide el encuadre

Alfa media de `05_energia_particulas.png` en sus bandas de borde:

```
columna izq 2 %  :   3.9/255  (max  50)     fila sup 2 % :  23.4/255  (max 118)
columna izq 10 % :   4.0/255  (max  72)     fila inf 2 % :  41.7/255  (max 154)
columna der 2 %  : 119.8/255  (max 154)
```

**El borde izquierdo es transparente; el derecho, el superior y el inferior no.** De ahí salen las tres reglas de encuadre:

1. El marco **puede cortarse por la izquierda** sin dejar costura (alfa 4/255 es invisible). Esto es lo que libera el diseño: no hay que magnificar el arte para tapar el hueco de la izquierda.
2. El marco **tiene que sangrar** por la derecha, por arriba y por abajo.
3. Imponiendo (2) sobre el eje Y: el borde superior exige `fh ≥ heroH · ancY / 0.4163` y el inferior `fh ≥ heroH · (1 − ancY) / 0.5837`. Las dos se cruzan en su mínimo conjunto **exactamente cuando `ancY = 0.4163`**, y ahí valen las dos `fh ≥ heroH`.

> Por tanto el marco del sujeto mide **exactamente el alto del hero** (`height: 100 %` + `aspect-ratio`), y su posición vertical es `top: 0` sin ningún desplazamiento. Toda la colocación se reduce a un anclaje en X. Es la solución de menor magnificación posible que cumple (2).

Se comprobó por render, no por aritmética: con el encuadre de la §3.4 (marco al 140 % para cubrir también por la izquierda) el arte se amplía 1.4× y **recorta las manos**, que dejan de leerse como dos manos sosteniendo el orbe. Con el encuadre por altura las manos entran completas.

| Viewport  | Marco resultante | Borde izq. del marco | Mano izq. ocupa |
| --------- | ---------------- | -------------------- | --------------- |
| 1280×720  | 1279×720         | 19.2 %               | 44.3 %–57.9 %   |
| 1440×900  | 1599×900         | 13.6 %               | 41.5 %–56.7 %   |
| 1920×1080 | 1919×1080        | 19.2 %               | 44.3 %–57.9 %   |

La columna de la copia se queda por tanto en el **40 %** izquierdo, no en el 46 %: a 16:10 la mano izquierda entra hasta el 41.5 %.

### 3.5 Color del lienzo claro

Media RGB del campo (`01_fondo.png`) sobre el lienzo completo: **#F0F1FD** = rgb(240, 241, 253). Muestras: esquina sup-izq #EBECF9 · centro #F5F5FE · **zona de la copia #EDF0FD** · esquina inf-der #FEFEFE. Luminancia relativa media 0.9461, mínimo 0.9104.

Convertido a OKLCH: **`oklch(0.961 0.016 283)`** → constante `AURA_SURFACE`.

---

## 4. Arquitectura

### 4.1 Ficheros

```
assets/hero-aura/                     (NUEVO — PNG fuente + manifest)
  00-field.png  01-hand-left.png  02-hand-right.png  03-energy.png
  04-orb.png                          (archivado, NO se publica: lo sustituye Sol)
  manifest.json

public/hero/aura/                     (NUEVO — 4 capas x 2 anchos)
  00-field.webp        00-field-1024.webp
  01-hand-left.webp    01-hand-left-1024.webp
  02-hand-right.webp   02-hand-right-1024.webp
  03-energy.webp       03-energy-1024.webp

src/hooks/useParallaxLayers.ts        (NUEVO — rAF extraido de Eye.tsx)
src/hooks/useParallaxLayers.test.tsx  (NUEVO)

src/components/aura/                  (NUEVO — la composicion clara)
  aura.layers.ts   aura.layers.test.ts
  aura.parts.tsx
  Aura.tsx         Aura.test.tsx

src/components/sections/Hero/
  hero.transition.ts                  (NUEVO — tiempos, compartidos CSS/tests)
  HeroBackdrop.tsx                    (NUEVO — orquesta el crossfade)
  HeroBackdrop.test.tsx               (NUEVO)
  Hero.tsx                            (MODIFICADO)

src/components/eye/Eye.tsx            (MODIFICADO — usa el hook; deja de ramificar por tema)
src/components/eye/eye.parts.tsx      (MODIFICADO — ScShock se muda a Aura)
src/components/eye/mascots/Sol.tsx    (SIN CAMBIOS — se reubica su consumidor, no el componente)
src/components/layout/Navbar/Navbar.tsx (MODIFICADO — barTheme deja de forzar oscuro)
```

### 4.2 Reutilización (qué NO se escribe de cero)

- **`Sol`** ya está portado en `src/components/eye/mascots/Sol.tsx` desde `vti-sdk/src/widgets/landing-fx/Sol.tsx`. Su API es `{ className?: string }` y ya se monta hoy en el hero. **No se re-porta, no se copia y no se toca**: solo cambia quién lo monta (`Aura` en vez de `Eye`) y con qué tamaño. El `Sol` del sdk usa vanilla-extract y props `{ dock, pulsing }` obligatorias, ligadas a un docking por scroll que aquí no existe: la versión de este repo es la buena y la que ya pasó tests.
- **El rAF del parallax** de `Eye.tsx:58-83` se extrae a `useParallaxLayers` y lo usan las dos composiciones. No se duplica.
- **`usePointer`**, **`Typography`**, **`Button`**, `BrandName`, `heroGradient`, `gradientShift`, `gradientTextClip`, `links`: sin cambios, se siguen consumiendo igual.
- **La costura con Story** (`ScHeroFoot` + `ScSeam`) conserva su contrato actual: ver §6.4.

### 4.3 Estructura del DOM

```
<section>                                     ScHero          [data-theme=light|dark]
  <div>                                       HeroBackdrop
    <div data-stack="eye">      …             (solo montado si oscuro o saliendo)
    <div data-stack="aura">     …             (solo montado si claro o saliendo)
  </div>
  <div/>                                      ScScrim         (solo oscuro)
  <div data-testid="hero-foot"/>              ScHeroFoot
  <div>                                       ScCopy          [data-swap=in|out]
    kicker · titulo · subtitulo · apoyo · acciones
  </div>
</section>
```

El stack del ojo es `ScSocket > ScFrame > 5 capas + slot de mascota` (sin cambios). El de Aura tiene **dos** contenedores, por lo razonado en §5.2:

```
<div data-stack="aura" data-state="pending|active|leaving">   ScAuraSocket
  <div data-part="base"/>                               ScAuraBase   color plano, escalon 0
  <img data-part="field">                               ScAuraField  a sangre, escalon 0
  <div>                                                 ScAuraSubject  (alto = alto del hero)
    <img data-part="handLeft">                          escalon 1
    <img data-part="handRight">                         escalon 2
    <img data-part="energy">                            escalon 3
    <div data-part="orb"><Sol/></div>                   ScOrbSlot, escalon 4
    <div data-part="shock"/>                            ScShock
  </div>
</div>
```

**Cada stack mantiene su propio `isolation: isolate`**: sin eso, el `plus-lighter` del ojo se sumaría contra las capas pastel del otro stack durante el cruce y el aditivo se desbordaría fuera de su grupo. En Aura el aislamiento va en el **socket**, no en el marco del sujeto: el campo a sangre y el sujeto tienen que componerse dentro del mismo grupo.

---

## 5. API

### 5.1 `useParallaxLayers`

```ts
export interface ParallaxTarget {
    /** Ref al elemento que recibe el transform. */
    readonly ref: RefObject<HTMLElement | null>;
    /** 0 = plano de fondo inmovil, 1 = plano mas cercano. */
    readonly depth: number;
}

export interface ParallaxAmplitude {
    readonly x: number;
    readonly y: number;
}

export function useParallaxLayers(
    targets: readonly ParallaxTarget[],
    amplitude: ParallaxAmplitude,
): void;
```

Contrato, idéntico al del rAF que sustituye:

- Un único `requestAnimationFrame` para todos los objetivos. **Cero `setState` por frame.**
- No hace nada si `usePointer().enabled` es `false` (táctil, reduced-motion).
- Salta los objetivos con `depth === 0` (el fondo no se mueve nunca).
- Depende de `x`, `y` (refs estables) y `enabled` — **nunca del objeto de `usePointer()` entero**, que es un literal nuevo en cada invocación (`Eye.tsx:38-45`).

### 5.2 `aura.layers.ts`

```ts
export interface AuraLayer {
    readonly part: string; // data-part y key de React
    readonly src: string; // WebP a 1672px
    readonly srcSmall: string; // WebP a 1024px
    readonly depth: number;
    /**
     * `true`  -> se pinta a sangre sobre el socket con `object-fit: cover`.
     * `false` -> vive dentro del marco del sujeto, anclado por el orbe.
     */
    readonly fullBleed: boolean;
}

export const AURA_LAYERS: readonly AuraLayer[]; // field, handLeft, handRight, energy
export const AURA_SIZES = "(max-width: 700px) 60vw, 100vw";
export const AURA_ASPECT = "1672 / 941";
export const AURA_SURFACE = "oklch(0.961 0.016 283)";
/** Posicion del orbe DENTRO del marco del arte (medida, §3.2). */
export const AURA_ORB = { x: "50.14%", y: "41.63%" } as const;
/** Eje X del hero al que se ancla el orbe (§3.4). El eje Y lo fija la geometria (§3.6). */
export const AURA_ANCHOR_X = "69.28%";
export const AURA_ORB_SIZE = "28.5%"; // lado del slot de Sol, % del ancho del marco
export const AURA_ORB_DEPTH = 0.8;
```

| Capa            | `part`      | `depth` | `fullBleed` |
| --------------- | ----------- | ------- | ----------- |
| `00-field`      | `field`     | 0.00    | **sí**      |
| `01-hand-left`  | `handLeft`  | 0.30    | no          |
| `02-hand-right` | `handRight` | 0.30    | no          |
| `03-energy`     | `energy`    | 0.55    | no          |
| (`Sol`)         | `orb`       | 0.80    | no          |

**Por qué el campo va a sangre y el resto no.** El campo es un degradado difuso: estirarlo con `object-fit: cover` es invisible y garantiza que **no haya un solo píxel del hero sin cubrir**, sea cual sea la relación de aspecto. Las manos, la energía y el orbe sí tienen forma reconocible, así que van en el marco del sujeto, a escala natural y anclados por el orbe (§3.6). Separar las dos cosas es lo que evita tener que magnificar el arte para cubrir.

Las dos manos comparten profundidad **a propósito**: son el mismo plano físico; darles valores distintos las despegaría una de otra al mover el cursor.

`AURA_ORB_SIZE = 28.5 %` sale de la medida de §3.2: el disco de `Sol` es `ScCoronaWrap` (92 % de `ScFaces`, que es el 82 % del slot) = **75.4 % del slot**; para que lea a los 21.5 % de ancho del disco pintado, el slot debe medir 21.5 / 0.754 ≈ 28.5 %. Es un valor **calculado, no final**: se calibra contra el render y se documenta la desviación si cambia (igual que `EYE_PUPIL_SIZE`, que también es un ajuste sobre el render).

### 5.2.1 Geometría en CSS (la parte que es fácil escribir mal)

```css
/* Campo: cubre siempre, cualquier aspecto. */
.field {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Marco del sujeto: alto EXACTO del hero, anclado solo en X. */
.subject {
    position: absolute;
    top: 0;
    height: 100%;
    aspect-ratio: 1672 / 941;
    left: 69.28%; /* AURA_ANCHOR_X, respecto al HERO   */
    translate: -50.14% 0; /* AURA_ORB.x,   respecto AL PROPIO MARCO */
}
```

`translate` en porcentaje resuelve contra **el propio elemento**, no contra el padre: por eso las dos líneas juntas colocan el punto «50.14 % del marco» en «69.28 % del hero» sea cual sea el tamaño del viewport, **sin una sola media query de cobertura**. Escribirlo con `transform` sería un bug: esa propiedad la sobrescribe el rAF del parallax en cada frame (mismo motivo que documenta `eye.parts.tsx:149-157` para `ScMascotSlot`).

En **vertical** (`max-aspect-ratio: 1 / 1`) el encuadre por altura dejaría el marco 1.78 veces más ancho que el hero y las manos fuera de pantalla. Ahí se vuelve al encuadre por ancho, con el mismo recurso que ya usa `ScFrame` del ojo: `height: auto; width: 185%; top: 41.63%; left: 50%; translate: -50.14% -41.63%`.

### 5.3 `hero.transition.ts`

```ts
/** Duracion del fundido de UNA capa. */
export const HERO_FADE_MS = 420;
/** Paso del stagger entre capas consecutivas. */
export const HERO_STEP_MS = 110;
/** Orden EXACTO del encargo. El indice en este array es el escalon del stagger. */
export const HERO_STAGGER = [
    "field",
    "handLeft",
    "handRight",
    "energy",
    "orb",
] as const;
/** 420 + 4*110 = 860ms. Lo consume el temporizador que desmonta el stack saliente. */
export const HERO_TRANSITION_MS =
    HERO_FADE_MS + (HERO_STAGGER.length - 1) * HERO_STEP_MS;
/** Tope de espera de `img.decode()` antes de arrancar igualmente (ver §6.1). */
export const HERO_DECODE_TIMEOUT_MS = 600;
```

**Dónde vive cada cosa, y por qué.** El **orden** (`HERO_STAGGER`) es la tabla de capas de Aura más el orbe, así que su fuente natural es `aura.layers.ts`. Los **tiempos** viven en `hero.transition.ts` y `aura.parts.tsx` los importa. Sí, eso acopla `components/aura` a `components/sections/Hero`: es deliberado y se documenta. Aura no es un componente de uso general —solo lo monta el backdrop del hero— y la alternativa (pasar los tiempos como custom properties en línea) los volvería invisibles para `getComputedStyle` en jsdom, que no resuelve `var()`: el test que ata el orden del escalonado dejaría de poder comprobarlo. Se prefiere un acoplamiento explícito y probado a uno implícito y no verificable.

No se añaden a `motion.duration`: `system.test.ts` cierra ese objeto por contrato (`toEqual` + `toHaveLength`), y meter aquí una clave obligaría a tocarlo por una coreografía que no es un rol del sistema de movimiento.

Estos números no salen de `motion.duration`: la escala de la casa es de **transiciones de UI** (100/200/320/480 ms) y esto es una **coreografía de cinco escalones**. Se declara como excepción explícita, igual que `Sol.tsx:147` declara sus 1100 ms de morph. `HERO_FADE_MS` sí es un múltiplo reconocible (2 × `base`), y el conjunto se apaga entero bajo reduced-motion.

---

## 6. Comportamiento

### 6.1 Máquina de estados del crossfade

`HeroBackdrop` mantiene qué stacks están montados y en qué fase está el entrante.

```
themeName cambia
  |
  v
1. MONTAR el stack entrante con data-state="pending"  (todas sus capas a opacity 0)
  |
  v
2. AWAIT  Promise.all(imgs.map(img => img.decode().catch(() => undefined)))
  |         + un requestAnimationFrame, para que el navegador haya pintado el frame 0
  v
3. data-state="active" en el entrante  ->  arrancan las transiciones CSS escalonadas
  |
  v
4. a los HERO_TRANSITION_MS: DESMONTAR el stack saliente
```

- **El `decode()` del paso 2 es la condición de fluidez**, no un adorno: sin él, el primer frame del stagger compite con la decodificación de cuatro WebP de 1672 px y el escalonado se ve a tirones justo la primera vez que el usuario cambia de tema.
- **El `decode()` va en carrera contra un temporizador** (`HERO_DECODE_TIMEOUT_MS = 600`), no esperado indefinidamente:

    ```ts
    await Promise.race([
        Promise.all(imgs.map((img) => img.decode().catch(() => undefined))),
        wait(HERO_DECODE_TIMEOUT_MS),
    ]);
    ```

    Con `.catch()` solo, una promesa que **nunca se resuelve** —red muy lenta, un `decode()` que jsdom no implementa igual que el navegador, una imagen que falla a medias— dejaría la transición sin arrancar y el tema anterior pegado en pantalla para siempre. Un fallo así no lanza ningún error: simplemente no pasa nada, que es la peor forma de fallar. La carrera convierte «no arranca nunca» en «arranca sin la garantía de fluidez», que es degradación aceptable.

- Un cambio de tema **durante** una transición cancela la anterior: se guarda un token de ejecución y el callback del `decode()` comprueba que sigue siendo el vigente antes de tocar el estado. Sin eso, dos toggles rápidos dejan un stack huérfano montado.
- Los estados viven en **atributos de datos**, no en clases generadas: los tests los leen y el CSS los selecciona.

### 6.2 Quién lleva la coreografía, y por qué no puede ser el ojo

**Aura lleva SIEMPRE el escalonado; el ojo se funde de forma uniforme.** No es una preferencia estética: es una restricción técnica medida.

`ScLayer` del ojo (`eye.parts.tsx:118-128`) ya anima `opacity` con `@keyframes` (`glowStrong` / `glowSoft`, la respiración de la corona y la pupila). Una animación CSS y una transición CSS sobre **la misma propiedad del mismo elemento** no conviven: la animación gana. Un escalonado por capa en el ojo, o mata la respiración, o no se aplica — y en ambos casos el fallo es silencioso.

**Medido en el navegador real, no deducido de la spec de CSS.** Sonda con un elemento que declara a la vez `transition: opacity 5000ms linear`, `animation: <keyframes de opacity> 4000ms infinite`, y un cambio de clase de `opacity: 0` a `opacity: 1`:

```
opacidad computada tras activar la transicion : "0.3"   <- el valor de la ANIMACION
animaciones vivas                             : [ { CSSAnimation, running } ]
```

No es que la transición «pierda»: **no llega a existir**. `getAnimations()` devuelve únicamente la `CSSAnimation`; no se crea ninguna `CSSTransition`. Cualquier `transition-delay` que se le pusiera a esas capas sería código muerto sin un solo error que lo delatara.

Por tanto:

| Sentido | Aura | Ojo |
| --- | --- | --- |
| oscuro → claro | escalona **hacia delante**: campo → mano izq → mano der → energía → orbe | funde a 0, uniforme |
| claro → oscuro | escalona **en reverso**: orbe → energía → mano der → mano izq → campo | funde a 1, uniforme |

El reverso no es simetría por simetría: el campo de Aura es **opaco**, así que mientras siga visible tapa al ojo. Apagándolo el último, la secuencia se lee como «el mundo claro se desmonta pieza a pieza y solo entonces se disuelve el propio lienzo, dejando ver el ojo».

### 6.2.1 El escalonado, en CSS

```
opacity: 0;
transition: opacity <HERO_FADE_MS> <easing.decelerate>;
transition-delay: calc(<indice> * <HERO_STEP_MS>);

[data-state="active"] &  { opacity: 1; }
```

- **Solo `opacity`.** Nada de `background-color`, `filter` ni `transform` en la transición: son propiedades de pintado o de layout y romperían el «máximo rendimiento» del encargo.
- El selector es **descendiente** (`[data-state="active"] &`), no `&[data-state="active"]`: el estado vive en el contenedor del stack y las capas son sus hijas. Es el mismo error que ya documenta `CLAUDE.md §5.1` y que `ScShock` (`eye.parts.tsx:197`) resuelve así.
- **Las opacidades animadas no se anidan.** `ScAuraSubject` mantiene `opacity: 1` fijo y son sus hijos los que llevan cada escalón. Si el contenedor también se animara, la opacidad efectiva sería el producto de las dos y las manos no podrían llegar a opaco antes que el campo: la coreografía se aplastaría en un único fundido blando.
- `will-change`: las capas ya declaran `will-change: transform` por el parallax, así que su capa de compositor ya existe y la animación de `opacity` no crea ninguna nueva. El envoltorio del ojo sí necesita `will-change: opacity`, y **solo mientras dura la transición**: dejarlo fijo sobre un elemento a pantalla completa es una capa de compositor permanente que nadie libera.
- El escalón 0 son **dos** elementos con el mismo retardo: `ScAuraBase` (color plano `AURA_SURFACE`, lo que se ve antes de que llegue el WebP) y la imagen `field`. El socket de Aura **no** lleva `background-color`: si lo llevara, al montarse el stack el hero saltaría a pastel de golpe, antes de que la transición empezara.

### 6.3 Por qué no hace falta animar el color del lienzo

`ScSocket` del ojo pinta `EYE_SURFACE` (negro). La capa `00-field` de Aura es **opaca y sin alfa** (§3.1), así que al llegar a `opacity: 1` tapa por completo lo que haya debajo. El cambio de negro a pastel lo produce el fundido de una imagen —propiedad de compositor— y no una transición de `background-color`, que obligaría a repintar el viewport entero en cada frame. El stack de Aura se monta **por encima** del stack del ojo en los dos sentidos de la transición, para que esto se cumpla igual al entrar y al salir.

### 6.4 Costura Hero → Story: el contrato que NO cambia

`Story.tsx:95-111` pinta un velo que **arranca en `EYE_SURFACE` (negro)** y baja a alfa 0. Ese contrato lo cierra un test y su historia está en `task/lessons.md` («Un degradado de continuidad puede crear la costura que venía a borrar»).

Por tanto **el pie del hero claro también termina en `EYE_SURFACE`**. Pero no basta con alargar la rampa negra actual: se comprobó por render que en tema claro **no funciona**.

- A `space[8]` (4 rem) se lee como una **barra gris** que corta la composición.
- A 20 rem, en gris neutro, sigue leyéndose como una **niebla sucia**: interpolar de un pastel saturado a negro puro pasa por gris desaturado, y ese tramo es el que ensucia.

La rampa del tema claro pasa por un **violeta profundo de marca** en vez de por gris, y es **proporcional al alto del hero**, no un valor de la escala de espaciado:

```
height: 32%;                       /* del alto del hero */
background-image: linear-gradient(
  to bottom,
  oklch(0.33 0.075 285 / 0)    0%,
  oklch(0.33 0.075 285 / 0.42) 50%,
  oklch(0.17 0.05  285 / 0.86) 82%,
  <EYE_SURFACE>               100%
);
```

- **Sigue siendo estrictamente monótona en luminancia** — condición que la lección del 2026-07-25 impuso y que un test cierra. Comprobado punto a punto sobre el peor caso (fondo blanco puro): 255 → 0 sin un solo tramo que suba.
- **Sigue cerrando exactamente en `EYE_SURFACE`**, así que el contrato con `ScSeam` de Story no se toca. `EYE_SURFACE` se importa, no se reescribe: dos literales iguales en dos archivos se separan al primer retoque.
- El `32 %` es una **proporción, no un token de espaciado**, y es deliberado: la escala `space` llega a `8rem` y aquí hay que salvar toda la distancia de un pastel a negro sobre un lienzo de altura de viewport. Se documenta como excepción, igual que los `clamp()` literales del titular y del subtítulo (`Hero.tsx:206-227`, `:251-261`).
- **La primera parada NO es `transparent`** sino el violeta con alfa 0: aquí la palabra clave daría negro transparente y el tramo inicial viraría a gris. Es la excepción exacta que la lección del velo de continuidad contempla — allí el color de la rampa **era** negro, así que `transparent` era su mismo color; aquí no lo es. Los gradientes CSS interpolan con alfa premultiplicada, así que la parada coloreada con alfa 0 no produce franjas.
- El valor final se **calibra en navegador**: si a 32 % la rampa toca los CTAs, se acorta y se documenta.

En **tema oscuro no cambia nada**: `space[8]` y la rampa negra actual, que salva negro sobre negro.

#### Dónde vive cada rampa (y por qué no es una sola con dos valores)

La tentación es hacer que `ScHeroFoot` cambie de altura y de degradado según el tema. **No sirve:** `height` y `background-image` no se pueden interpolar, así que en el instante del cambio de tema el pie saltaría de «negro de 4 rem» a «violeta del 32 %» de golpe — y lo haría en `t = 0`, cuando el stack de Aura todavía está en `opacity: 0` y lo que se ve sigue siendo el ojo negro. El resultado sería un velo violeta apareciendo sobre negro antes que el resto de la composición. Un salto que además ninguna aserción existente detectaría.

Se resuelve con **dos rampas independientes, cada una en el stack al que pertenece**:

| Rampa | Dónde vive | Qué hace en el cambio de tema |
| --- | --- | --- |
| Negra, `space[8]` | `ScHeroFoot` en `Hero.tsx` (conserva su `data-testid="hero-foot"`) | se apaga por `opacity` en claro, con la misma duración que el cruce |
| Violeta, 32 % | `ScAuraFoot`, **dentro del stack de Aura** | entra y sale con su stack, sin sincronización extra |

Consecuencias, todas buenas:

- La rampa violeta hereda gratis el escalonado y el desmontaje del stack de Aura: no hay un segundo temporizador que mantener en sincronía con el primero.
- `ScHeroFoot` **no cambia de altura ni de degradado**, así que las aserciones que ya lo atan (`Hero.qa.test.tsx:194-208` y su duplicado en la integración: `height === space[8]`, la última parada `=== EYE_SURFACE`, la primera con `/ 0`) **siguen valiendo tal cual**. Lo único que se añade es un caso nuevo para su opacidad en claro. R3 y R5 dejan de ser roturas.
- El elemento con `data-testid="hero-foot"` sigue existiendo en los dos temas, así que R6 y R8 tampoco rompen.

No se toca `Story`: sigue siendo una superficie siempre oscura, que es su identidad.

### 6.5 Distribución de la copia

|  | Oscuro (sin cambios) | Claro (nuevo) |
| --- | --- | --- |
| Eje del bloque | centrado | pegado a la izquierda |
| `text-align` | `center` | `left` |
| `justify-content` del hero | `flex-end` | `center` |
| Ancho máximo | `grid.prose` | `min(grid.prose, 40%)` — ver abajo |
| `text-shadow` | sí (protege texto claro sobre la corona) | **no** |
| Velo `ScScrim` | sí | **no** (ver §6.6) |

El bloque conserva **las cinco piezas** (kicker, título, subtítulo, apoyo, acciones) y sus mismas claves i18n: la distribución cambia, el contenido no. El stagger de entrada (`ScCopy > *:nth-child(N)`) sigue siendo de cinco escalones.

**La copia no anima su layout.** Cambiar `text-align` o `align-items` provoca un re-wrap que no se puede interpolar. En su lugar la copia hace un **cruce por opacidad** dentro de la ventana de la transición del fondo:

```
0ms            -> data-swap="out": opacity 1 -> 0 en duration.fast (100ms)
~120ms         -> se aplica la distribucion del tema entrante (invisible, opacity 0)
120ms -> 440ms -> data-swap="in": opacity 0 -> 1 en duration.slow (320ms)
```

El re-wrap ocurre a opacidad 0, así que no se ve; y a 440 ms la copia está asentada mientras el fondo todavía está montando sus dos últimos escalones.

En viewports estrechos (por debajo de `breakPoint.lg`) la columna izquierda no cabe: el tema claro **vuelve a la copia centrada** sobre el arte, igual que el oscuro. La distribución partida es una mejora de escritorio, no un requisito de todos los tamaños.

### 6.6 Contraste, en vez del velo oscuro

El velo `ScScrim` existe para apagar la corona del ojo bajo el texto claro. En tema claro sobra y sería contraproducente. En su lugar:

- El texto usa los tokens del tema claro (`semantic.text = neutral[1000]`) sobre un fondo de luminancia medida 0.9393 en la mitad izquierda (mínimo 0.9132) → contraste holgado.
- La mano izquierda arranca en x 25.1 % del **marco**; con el encuadre de §3.6 su borde cae en el **41.5 %** del hero a 16:10 y en el **44.3 %** a 16:9 — el caso estrecho manda. Por eso la columna de la copia es `min(grid.prose, 40%)` y el `padding-inline-start` del hero no la empuja más allá: el objetivo es que la línea más larga termine **antes** del 41.5 %. Es el número que hay que **recalibrar en navegador** si la tipografía real ocupa más de lo previsto: el criterio no es «40 %», es «la copia no invade el núcleo de la mano izquierda».
- **Se verifica midiendo, no suponiendo.** Ratios calculados con la misma aritmética que implementa `src/theme/tokens/contrast.ts`, contra `AURA_SURFACE` (la media medida del campo) y contra el **píxel más oscuro** de la mitad izquierda, que es el peor caso para texto oscuro (luminancia relativa lineal 0.814 frente a 0.885 de la media):

    | Rol | Sobre `AURA_SURFACE` | Sobre el píxel más oscuro | AA (4.5:1) |
    | --- | --- | --- | --- |
    | `semanticLight.text` (título, subtítulo, apoyo) | **11.30:1** | **10.44:1** | ✅ |
    | `semanticLight.brandText` (kicker) | **5.20:1** | **4.80:1** | ✅ |
    | `semanticLight.textMuted` | 5.34:1 | 4.94:1 | ✅ |
    | `semanticLight.textSubtle` | 4.70:1 | **4.31:1** | ⚠️ falla en el peor caso |

    `textSubtle` **no se usa en el hero** (el apoyo se queda en `semantic.text` a propósito, `Hero.tsx:263-266`), así que no hay que corregir nada — pero queda anotado: si alguien lo introduce aquí más adelante, no pasa AA sobre el pastel. El test de C2 asevera los tres roles que sí se usan.

- Si la verificación en navegador encontrara algún par por debajo de 4.5:1, la mitigación es un velo **claro** (`white → transparent`), nunca bajar el peso ni el tamaño del texto.

### 6.7 Accesibilidad

- Los dos stacks son `aria-hidden="true"` con `alt=""`: son decoración. La marca real sigue siendo el `<h1>` del hero.
- `@media (forced-colors: active)`: los dos stacks, el velo y el pie se ocultan (`display: none`), como ya hace el ojo. El SO garantiza el contraste.
- `@media (prefers-reduced-motion: reduce)`: `HERO_FADE_MS` y `HERO_STEP_MS` colapsan a 0, el swap de la copia es instantáneo, y el `Sol`/`Wormhole` ya traen su propio guard. **El desmontaje del stack saliente sigue ocurriendo**: se programa por temporizador, no por `transitionend`, precisamente porque sin transición no hay evento que escuchar. Es el mismo fallo silencioso que `Eye.tsx:90-96` documenta para el pulso.
- El cambio de tema no mueve el foco ni altera el orden de tabulación: el fondo es decorativo y la copia conserva su estructura.

---

## 7. Visual y tokens

- **Excepción de color sancionada, ya existente en el repo:** las composiciones del hero son decoración de marca, no roles de UI. `eye.parts.tsx:10-19` ya declara esta excepción para el ojo. `AURA_SURFACE` la hereda: es el color **medido** del arte (#F0F1FD), no un `semantic.*`. Un token semántico cambiaría con el tema y rompería la identidad.
- Todo lo demás **sí** son tokens: `space`, `radius`, `zIndex`, `motion.easing`, `grid.prose`, y los `semantic.*` de la copia, que ahora resuelven al tema real de la página.
- Se **elimina** el `ThemeProvider` anidado de `Hero.tsx:454`. Existía porque el hero era negro en los dos temas; ahora la superficie del hero **sigue al tema de la página**, así que el proveedor anidado es redundante y, peor, es la fuente exacta del bug de `task/lessons.md` («currentColor puede heredar del ThemeProvider ambiental»). Menos árboles de tema divergentes, menos superficie para ese fallo.

---

## 8. i18n

**Sin cambios.** Se conservan las cinco piezas de copia con sus claves actuales (`Home.hero.kicker`, `Home.hero.subtitle`, `Home.hero.support`, `Home.cta.explore`, `Home.cta.story`). No se añade ni se retira ninguna clave, así que no hay riesgo de paridad es/en. Si la implementación necesitara una etiqueta nueva, se añade a `es` **y** `en` en el mismo commit.

---

## 9. Tests

| Fichero | Qué ata |
| --- | --- |
| `useParallaxLayers.test.tsx` | un solo rAF; cero `setState` por frame; ignora `depth === 0`; se cancela al desmontar; no arranca si `enabled` es false |
| `aura.layers.test.ts` | contrato cerrado de la tabla (nº de capas, orden, rutas, profundidades); `AURA_ORB_DEPTH` coincide con la profundidad de la capa más alta, igual que `eye.layers.test.ts` ata `EYE_MASCOT_DEPTH` |
| `Aura.test.tsx` | monta cuatro capas con sus `data-part`; monta `Sol` y no `Wormhole`; es `aria-hidden`; ninguna capa lleva `mix-blend-mode` (el aditivo del ojo aquí sería un bug) |
| `HeroBackdrop.test.tsx` | en claro monta solo Aura y en oscuro solo el ojo; al cambiar de tema los dos coexisten y el saliente desaparece tras `HERO_TRANSITION_MS`; los `transition-delay` de las capas siguen el orden de `HERO_STAGGER`; dos toggles rápidos no dejan stacks huérfanos |
| `Hero.test.tsx` / `Hero.qa.test.tsx` | se **amplían** a las dos distribuciones; las aserciones que hoy dan por hecho «el hero es oscuro siempre» pasan a estar calificadas por tema |
| `Story.test.tsx` | **no se toca**: la costura sigue arrancando en `EYE_SURFACE`. Que siga verde es la prueba de que §6.4 se respetó |

Notas de entorno, ya medidas y anotadas en `task/lessons.md` — no se re-descubren:

- `getComputedStyle` **sí** funciona con styled-components v6 en jsdom y devuelve los valores tal como se escriben; la shorthand `animation` no se expande, `transition-delay` sí se lee.
- `createGlobalStyle` **no** inyecta nada bajo jsdom: nada que dependa de `GlobalStyles` se puede cubrir con test; va a la QA de navegador.
- jsdom no dispara `transitionend` ni decodifica imágenes: `img.decode()` debe quedar _mockeable_ o resolverse por `catch` para que el test no cuelgue. Este es el punto más frágil del plan y va con test propio.

---

## 10. Documentación

1. `assets/hero-aura/manifest.json` — capas, geometría medida, modelo de composición y **el comando exacto de `sharp`** usado en la conversión. El manifest del ojo no documenta su pipeline; aquí sí, porque esa laguna ya costó una investigación entera esta sesión.
2. `docs/qa-3d-pendiente.md` — se añade la QA visual que este entorno no puede ejecutar (no compone frames, así que no hay screenshot): lectura del escalonado real, ausencia de banding en el degradado pastel, y la costura del pie en tema claro.
3. `task/todo.md` y `task/lessons.md` — plan, review y lecciones.
4. Vault (`registro-vault`): entrada fechada en la nota del proyecto + nota de investigación con las medidas de §3, que son reutilizables y hoy solo existen en el scratchpad.

---

## 11. No-objetivos (YAGNI)

- **La navbar no cambia de contenido.** No se añade el botón «Get Started» del mockup. Lo único que se toca es `barTheme`, y por corrección, no por diseño: hoy fuerza `basicDarkTheme` mientras la barra es transparente «porque el hero es negro en los dos temas» (`Navbar.tsx:122-133`), premisa que esta entrega invalida. Sin ese arreglo la marca se pintaría blanca sobre el fondo pastel.
- **El tema oscuro no cambia de distribución.** Conserva su composición centrada.
- **No se re-porta `Sol` desde `vti-sdk`.** Ya está en este repo y ya pasó tests.
- **No se toca `Story` ni la escena 3D.**
- No se implementa parallax por giroscopio, ni una tercera composición, ni un editor de capas.
- No se sube `04-orb.png` a `public/`: no se publica lo que no se monta.

---

## 12. Fases de entrega

| Fase | Contenido | Paralelizable |
| --- | --- | --- |
| **A1** | Assets: PNG → WebP (4 capas × 2 anchos) + `manifest.json` + verificación de fidelidad | ∥ con A2 |
| **A2** | Extraer `useParallaxLayers`; `Eye.tsx` lo consume y deja de ramificar por tema | ∥ con A1 |
| **B1** | `aura.layers.ts`, `aura.parts.tsx`, `Aura.tsx` + tests | depende de A1, A2 |
| **C1** | `hero.transition.ts` + `HeroBackdrop.tsx` + test | depende de B1 |
| **C2** | `Hero.tsx`: distribución por tema, velo, pie, cruce de la copia | depende de C1 |
| **C3** | `Navbar.tsx`: `barTheme` sigue al tema de la página | ∥ con C1/C2 |
| **D** | Review, verificación en navegador, gate, documentación y registro | secuencial, al final |

---

## 13. Definición de «hecho»

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm check-format`, `pnpm check-spelling` sin errores nuevos.
- [ ] `pnpm test` en verde **entero**, no solo los tests nuevos.
- [ ] Verificado en navegador real, no solo en jsdom: el escalonado se lee en el orden pedido, no hay banding en el pastel, la costura del pie no deja borde, y la navbar es legible en las cuatro combinaciones (tema × scroll).
- [ ] Contraste de la copia sobre el fondo claro **medido**, ≥ 4.5:1.
- [ ] Cero re-render de React por frame durante la transición, comprobado.
- [ ] `git status --short` vacío: todo commiteado (lección del 2026-07-26 sobre el DoD).
- [ ] Registro en el vault hecho.
- [ ] Las desviaciones respecto a esta spec, escritas en §14.

---

## 14. Desviaciones de implementación

Todas verificadas en navegador real salvo donde se indique.

### 14.1 El encuadre de §3.4 se rehízo antes de implementarlo

La spec nació con el marco al 140 % para cubrir también por la izquierda. Renderizado, **recortaba las manos**. La medida de los bordes de la capa de energía (§3.6) permitió cortar por la izquierda y anclar por altura. §3.4 conserva la medida original y §3.6 documenta por qué el eje Y no se adopta. **Verificado**: a 1280×720 el marco cae en x 19.17 %–119.11 %, top 0 %, bottom 100 %, y el orbe en exactamente (69.28 %, 41.63 %).

### 14.2 El escalón se deriva de `data-part`, no de una prop `$step`

La spec pedía una prop transitoria pasada desde `Aura.tsx`. `aura.parts.tsx` la deriva del atributo `data-part` que ya existía. Mismo comportamiento, sin tocar el componente. **Verificado**: retardos reales 0 / 0 / 0.11 / 0.22 / 0.33 / **0.44 s**, y en reverso al salir (orbe 0 s, campo 0.44 s).

### 14.3 El velo de contraste se mudó a la composición oscura

La spec lo dejaba en `Hero.tsx` condicionado al tema. Eso lo montaba y desmontaba **en `t = 0`**, cuando el stack contrario todavía cruza: al pasar a oscuro pintaba un velo negro sobre el pastel aún visible. Ahora es hijo de `ScSocket` y lo arrastra el fundido del propio stack. **Verificado**: el velo desaparece en el mismo instante en que se desmonta el stack del ojo (~1200 ms), no en `t = 0`.

### 14.4 La copia espera antes de cruzar (`HERO_COPY_HOLD_MS`)

La spec ocultaba la copia de inmediato y la cambiaba a los 100 ms. Con el fondo tardando `HERO_FADE_MS` en cambiar de lienzo, a los 100 ms va por menos de la cuarta parte: el texto habría entrado con la paleta nueva sobre el fondo viejo, ilegible ~300 ms. Se añade una espera de 240 ms; el cambio ocurre a los **340 ms**, con el campo por encima del 80 %.

### 14.5 El pie del hero: dos rampas en vez de una (ya recogido en §6.4)

Consecuencia: R3 y R5 dejaron de ser roturas. En cambio rompieron **dos tests que la tabla no preveía** —los de «el pie es CSS estático»—, porque el pie claro sí declara ahora una transición de opacidad. Se desdoblaron por tema, no se relajaron.

### 14.6 Cuelgue real del `requestAnimationFrame`, no previsto por la spec

§6.1 protegía `decode()` contra una promesa que no resuelve nunca, pero **no el frame de margen que va detrás**. En una pestaña oculta el navegador no dispara `requestAnimationFrame`: esa promesa no se resolvía jamás y el cruce se quedaba en `"pending"` — el fondo entrante invisible y el saliente a la vista. **Medido** en este entorno, que corre con `document.hidden === true` de forma permanente (rAF no disparó en 500 ms). Corregido con una carrera contra 50 ms: el frame de margen es una mejora de alineación, no una condición de corrección.

Es exactamente el mismo modo de fallo que la spec sí había anticipado, un `await` más abajo.

### 14.7 Contraste: medido, ligeramente distinto de lo calculado

Los ratios reales del navegador difieren en centésimas de los de §6.6 (kicker **5.17:1** vs 5.20 calculado; cuerpo **11.25:1** vs 11.30), por el ajuste de gamut de OKLCH→sRGB del motor. Los dos pasan AA con holgura. **Manda la medida.**

### 14.8 Lo que NO se hizo, y por qué

- No se amplió el bloque `describe("CTAs animados…")` con el par del tema claro. El plan lo listaba como huérfano; el encargo de C2 acotaba la ampliación a un rango concreto y se respetó la acotación más estricta. **Queda como deuda anotada**, no como olvido.
- ~~`eye.parts.tsx`: el docblock de `ScMascotSlot` menciona un anillo de pulso que ya no vive ahí.~~ Corregido en la misma sesión.

---

## 15. Revisión 2026-07-27 — capas refinadas (6 archivos, no 5)

El usuario adjuntó un segundo lote de capas (`capas_pastel_cosmic.zip`) del **mismo arte**, extraídas con un método más riguroso: alfa por distancia euclídea al color de fondo, reconstrucción del fondo por inpainting gaussiano, y descomposición de color real `C = (pix − fondo·(1−α)) / α` para que la recomposición sea exacta. El paquete incluye `capas.json` (geometría) y `LEEME.md` (metodología), y reclama un error medio de recomposición de **≈0.96/255 (~0.4 %)**, frente al 5.09/255 del primer lote.

Todo lo de esta sección está **medido de forma independiente**, no tomado del `LEEME.md` sin verificar — el protocolo de veracidad del proyecto lo exige, y en el punto 15.1 el número medido difiere ligeramente del reclamado.

### 15.1 Verificación independiente de la fidelidad

Recomponiendo las 6 capas nuevas en orden (`00_fondo → 01_nebulosa_particulas → 02_mano_izquierda → 03_mano_derecha → 04_orbe → 05_destello_central`) con alfa normal:

| Comparación | Error medio | p99 | Máximo |
| --- | --- | --- | --- |
| vs `verificacion_recompuesta.png` (control del paquete) | **0.42**/255 | 1/255 | 1/255 |
| vs el arte original (`…Pastel Cosmic landing Page 2.png`) | **1.23**/255 | 11/255 | 15/255 |
| control del paquete vs el arte original (verificación cruzada) | 1.42/255 | — | 15/255 |

Los tres números están en el mismo rango (~0.4–0.55 %), no en el 0.4 % exacto reclamado — la fila 3 confirma que la discrepancia (0.96 reclamado vs 1.2–1.4 medido) viene del propio archivo de control del usuario contra `Page 2.png` en disco, no de un error en mi recomposición. Dentro de esa tolerancia, el resultado es **~4× más fiel** que el primer lote (5.09/255) y sigue siendo el mismo modelo `source-over`/alfa normal, verificado de nuevo por el propio experimento, no asumido.

### 15.2 Qué se publica y qué no: dos capas archivadas, no una

| # | Fichero del paquete | Contenido | ¿Se publica? |
| --- | --- | --- | --- |
| 0 | `00_fondo.png` | Campo lavanda, fondo reconstruido por inpainting | Sí → `00-field.webp` |
| 1 | `01_nebulosa_particulas.png` | Espirales de energía + partículas dispersas | Sí → `01-energy.webp` |
| 2 | `02_mano_izquierda.png` | Mano izquierda | Sí → `02-hand-left.webp` |
| 3 | `03_mano_derecha.png` | Mano derecha **+ filamentos de energía adheridos** | Sí → `03-hand-right.webp` |
| 4 | `04_orbe.png` | Anillo/halo de la esfera (sin su núcleo) | **No** — archivado, `Sol` lo reemplaza |
| 5 | `05_destello_central.png` | Núcleo de luz blanca del orbe (capa NUEVA) | **No** — archivado, `Sol` lo reemplaza también |

El paquete anterior no separaba el núcleo del anillo; este sí, precisamente para poder «animarlo por separado» (`LEEME.md`). Se decidió **no publicarlo tampoco**, extendiendo el mismo principio ya establecido en la spec original («el disco que ocupa su lugar en el arte lo renderiza `Sol`, no un WebP») al núcleo recién separado. La evidencia que sostiene esto es el propio perfil radial de alfa, medido desde el centroide del orbe (851.4, 392.7):

```
                         DESTELLO (nucleo)          ORBE (anillo)
r=   0px   alfa= 95.1  ############
r=  32px   alfa= 90.5  ###########
r=  64px   alfa= 10.0  #
r=  80px   alfa=  0.1
r=  96px   alfa=  0.0                    r=  96px  alfa= ~85   (rampa ascendente)
                                          r= 150px  alfa=195.3  <- pico
                                          r= 178px  alfa= 97.6  (mitad del pico)
                                          r= 260px  alfa=  0.0
```

El destello ocupa exactamente el hueco (r < 80 px) que el anillo del orbe deja vacío en su centro (el orbe pasa de ~0 en r=0-20 a su rampa ascendente a partir de r≈40-80): son dos regiones **complementarias de una sola figura**, no dos elementos independientes. Montar `Sol` (que ya trae su propia corona Y su propio núcleo animado, ver `Sol.tsx`) encima de un `05-destello.webp` publicado produciría un doble núcleo — uno pintado, fijo, y otro animado por `Sol`, compitiendo por el mismo píxel. No publicarlo es la continuación correcta del principio ya aprobado, no una decisión nueva sin precedente.

Los dos ficheros (`04_orbe.png`, `05_destello_central.png`) se archivan en `assets/hero-aura/` como `04-orb.png` y `05-core-glow.png` — documentales, igual que `05-logo.png` en `assets/hero-eye/`.

### 15.3 El orden de apilado cambia: la energía pasa de última a segunda

El paquete anterior componía `field → hand-left → hand-right → orb → energy` (energía la más alta, encima de las manos). Verificado por recomposición (§15.1), el orden correcto de **este** paquete es `field → nebulosa → hand-left → hand-right → orb`: la energía ahora se compone **detrás** de las manos, no delante. Esto no es arbitrario — explica por qué la mano derecha ahora incluye «filamentos de energía adheridos»: los filamentos que antes habría pintado la propia capa de energía por encima de la mano, aquí quedan atribuidos a la capa de la mano porque la energía, al ir detrás, quedaría tapada por la parte opaca de la mano de todos modos.

**Consecuencia práctica:** `AURA_LAYERS` (`aura.layers.ts`) reordena sus entradas a `[field, energy, handLeft, handRight]` — el orden del array fija el orden de montaje en el DOM y, por tanto, el orden de pintado (position:absolute, sin z-index explícito, gana el último hermano). **`AURA_STAGGER` NO se toca**: ya vive desacoplado de `AURA_LAYERS` (busca por nombre de `data-part`, no por posición en el array — verificado leyendo `auraStep()` en `aura.parts.tsx`), así que el orden de revelado del cruce de temas sigue siendo exactamente el pedido en el encargo original (campo → mano izquierda → mano derecha → energía → orbe), sin relación con el nuevo orden de pintado estático.

### 15.4 Profundidad de parallax de `energy`: 0.55 → 0.15

Con la energía ahora detrás de las manos (no delante de todo), mantener su profundidad en 0.55 (mayor que las manos, 0.30) sería físicamente incoherente: lo que está detrás se mueve MENOS con el cursor, no más. Se baja a **0.15** — entre el campo (0, inmóvil) y las manos (0.30) — para que el parallax lea el mismo orden de profundidad que ahora pinta el DOM.

La justificación de `AURA_ORB_DEPTH = 0.8` en el docblock de cabecera cambia de premisa: antes decía «la energía no cubre el orbe (alfa 0/255 hasta r≈120px)» — medido de nuevo sobre la capa nueva, **no es 0 %**: la nebulosa tiene una presencia real aunque modesta incluso en el centro del disco (alfa media 11.7/255 ≈ 4.6 % en r≤60px, subiendo a 18-20/255 ≈ 7-8 % hacia r≤180-245px). `Sol`, opaco y del tamaño del slot, sigue tapando esa zona igual que antes — la conclusión (`Sol` como capa más alta) no cambia — pero la cifra que la sostiene sí, y el comentario se actualiza para no repetir un «0 %» que ya no es cierto.

### 15.5 Geometría actualizada

| Constante | Valor anterior | Valor nuevo | Origen |
| --- | --- | --- | --- |
| `AURA_ORB` | `{ x: "50.14%", y: "41.63%" }` | `{ x: "50.92%", y: "41.73%" }` | Centroide del orbe ponderado por alfa, `04_orbe.png`: (851.36, 392.70) px sobre 1672×941 |
| `AURA_ORB_SIZE` | `28.5%` | `28.3%` | Radio de mitad de pico del anillo, interpolado con paso de 2px: r=178.10px → Ø=21.30 % del ancho → /0.754 (mismo factor de calibración de `Sol`, sin cambios) = 28.254 %, redondeado a 28.3 % |
| `AURA_ANCHOR_X` | `69.28%` | **sin cambios** | Es una decisión de layout (dónde vive el orbe respecto a la copia), no una medida del arte; el centroide del orbe apenas se movió (0.78 pp en X), no justifica repetir la correlación cruzada contra el mockup |
| `AURA_SURFACE` | `oklch(0.961 0.016 283)` | `oklch(0.942 0.023 285)` | Media RGB de `00_fondo.png` sobre el lienzo completo: (233.5, 234.0, 250.9) → convertido por la matriz OKLab estándar (la misma familia que usa `contrast.ts`) y verificado por ida y vuelta en el motor del navegador: `oklch(0.942 0.023 285)` resuelve a `rgb(234, 234, 251)`, a menos de una unidad del objetivo |

Contraste de la copia, recalculado contra el nuevo `AURA_SURFACE` (fondo más oscuro que antes, así que el margen se reduce, pero sigue pasando con holgura): `semanticLight.text` **10.63:1** (antes 11.25), `semanticLight.brandText` **4.88:1** (antes 5.17). Los dos por encima de 4.5:1.

### 15.6 Problema nuevo: la nebulosa ya no tiene un borde libre — hace falta un fade

Todo el diseño del encuadre (marco anclado solo en X, «se puede cortar por la izquierda porque ese borde es transparente») dependía de una propiedad medida de la capa de energía **anterior**: su borde izquierdo tenía alfa media 3.9/255, prácticamente cero. Medido de nuevo sobre `01_nebulosa_particulas.png`, **esa propiedad ya no existe**: los cuatro bordes tienen alfa media similar y no-trivial (columna izq 27.5/255, columna der 34.9/255, fila sup 26.6/255, fila inf 22.4/255 — todos ≈ 9-14 %), y no decae hacia el interior: un muestreo en bandas del 2 % desde el borde hasta el 24 % del ancho da valores igual de altos (22-29/255) en todo el tramo. Es una neblina ambiental prácticamente uniforme, consecuencia directa del nuevo método («el resto cae en la capa de nebulosa» — cualquier residuo de la partición, por tenue que sea, incluidas motas de polvo cósmico dispersas por todo el lienzo).

Peor aún para un corte limpio: dentro de esa neblina hay partículas brillantes puntuales con alfa de hasta 72-96/255 (~30-38 %) — si una de esas partículas cae justo sobre el borde del marco, un corte sin transición la partiría en seco, un defecto mucho más visible que la neblina de fondo.

**La geometría del encuadre NO cambia** (marco = 100 % del alto del hero, anclado solo en X, sigue sangrando por derecha/arriba/abajo en las 5 relaciones de aspecto probadas — 16:9, 16:10, y un 4:3 extremo — con el nuevo centroide del orbe, verificado por render). Lo que se añade es una **máscara de desvanecido en los 4 bordes** del marco (`ScAuraSubject`), construida con dos `linear-gradient` (uno horizontal, uno vertical) combinados con `mask-composite: intersect` / `-webkit-mask-composite: source-in` — mismo patrón ya usado en este archivo para el anillo del CTA secundario (`ScCtaSecondary`, `mask-composite: exclude` / `-webkit-mask-composite: xor`), mismo motivo de declarar las dos formas (soporte de motor).

```css
mask-image:
    linear-gradient(
        to right,
        transparent 0%,
        #fff 8%,
        #fff 92%,
        transparent 100%
    ),
    linear-gradient(
        to bottom,
        transparent 0%,
        #fff 8%,
        #fff 92%,
        transparent 100%
    );
mask-composite: intersect;
-webkit-mask-image:
    linear-gradient(
        to right,
        transparent 0%,
        #fff 8%,
        #fff 92%,
        transparent 100%
    ),
    linear-gradient(
        to bottom,
        transparent 0%,
        #fff 8%,
        #fff 92%,
        transparent 100%
    );
-webkit-mask-composite: source-in;
```

El **8 %** es un valor calibrado sobre la evidencia (suficiente para que una partícula de alfa~90/255 se desvanezca en una distancia perceptible en vez de cortarse en seco), no medido pixel a pixel — igual que `AURA_ORB_SIZE` o el 32 % de `ScAuraFoot`, se documenta como aproximación y se revisa contra el render real. Efecto colateral aceptado y correcto: la mano derecha, cuyo bbox llega al 99.9 % del ancho del arte (`filamentos adheridos`, §15.3), pierde su último tramo de filamento fino dentro del 8 % del borde derecho — es exactamente el tipo de contenido (una hebra delgada, no la silueta de la mano) que conviene que se apague con gracia en vez de cortarse.

### 15.7 Tabla resumen de rutas

| Rol | Fichero fuente (paquete 2026-07-27) | Publicado como |
| --- | --- | --- |
| Campo | `00_fondo.png` | `00-field.webp` / `-1024` |
| Energía/nebulosa | `01_nebulosa_particulas.png` | `01-energy.webp` / `-1024` |
| Mano izquierda | `02_mano_izquierda.png` | `02-hand-left.webp` / `-1024` |
| Mano derecha | `03_mano_derecha.png` | `03-hand-right.webp` / `-1024` |
| Orbe (anillo) | `04_orbe.png` | archivado, `04-orb.png`, no publicado |
| Núcleo del orbe | `05_destello_central.png` | archivado, `05-core-glow.png`, no publicado |

Las rutas de `public/hero/aura/` del paquete anterior (`00-field`, `01-hand-left`, `02-hand-right`, `03-energy`) se **sustituyen por completo** por las cuatro de esta tabla — no coexisten dos generaciones de assets en `public/`.
