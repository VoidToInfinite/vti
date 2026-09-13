# Spec — Fondo nuevo de Contacto: escena «Cosmic Guardian» (sin orbes) y espejado del contenido

**Fecha:** 2026-08-04 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `6c79c5f` (con la entrega del 2026-08-03 sin commitear en el árbol)

**Encargo del usuario (literal):**

```text
@"C:\Users\Daniel\Downloads\cosmic-guardian-parallax-kit.zip"
Este es un nuevo background para la seccion Contacto, cambia y en el proceso
no agreges las orbes que se muestran.
```

---

## 1. Estado de partida (medido, no de memoria)

La sección Contacto en tema oscuro quedó ayer así (spec `2026-08-03-contacto-footer-oscuro-design.md`): a sangre, con la escena `ContactNeonGalaxy` (7 capas) en un slot pegado de una pantalla, el contenido topado a `min(800px, 58vw)` y **pegado a la derecha**, y una viñeta que oscurece la derecha. Todo eso está construido sobre un hecho del arte saliente: **la figura y los tres orbes viven en la mitad izquierda del encuadre**.

Inventario del arte saliente que esta entrega retira:

| Qué | Dónde | Tamaño |
| --- | --- | --- |
| Componente | `src/components/contactNeonGalaxy/` | 5 ficheros |
| Desplegado | `public/contact/neon-galaxy/*.webp` | 14 ficheros, 348 KiB |
| Máster + manifest | `assets/contact-neon-galaxy/` | 7 WebP de 3344px + `manifest.json` |

## 2. El kit nuevo, medido

Fuente: `cosmic-guardian-parallax-kit.zip` (Downloads, 2026-08-04). Lienzo `3344 × 1882`. Seis PNG y una demo.

| Capa del kit | Modo | Tamaño | `depth` sugerido | ¿se despliega? |
| --- | --- | --- | --- | --- |
| `background.png` | **RGB (opaca)** | 3344 × 1882 | 0 | sí |
| `figure.png` | RGBA (alfa 0-255) | **770 × 1803**, sprite en (2030, 55) | 0.03 | sí |
| `stardust.png` | RGBA (alfa 0-254) | 3344 × 1882 | 0.085 | sí |
| `orb_chat.png` | RGBA | 354 × 354 | 0.05 | **no** |
| `orb_phone.png` | RGBA | 352 × 352 | 0.058 | **no** |
| `orb_mail.png` | RGBA | 362 × 362 | 0.046 | **no** |

Los modos y las alfas están **medidos con Pillow**, no leídos del README.

Dos hechos del kit gobiernan toda la entrega:

1. **La figura está a la DERECHA.** `meta.json` la sitúa en `left: 60.71%`, `width: 23.03%` — ocupa del 60.71% al 83.74% del ancho. El arte saliente la tenía a la izquierda. Es el cambio de mayor consecuencia: **el contenido de la sección se muda al lado contrario**.
2. **La figura viene como sprite suelto, no como capa a lienzo completo.** Es el primer kit de la serie que lo hace; los tres anteriores entregaban todas las capas al tamaño del lienzo.

## 3. Decisiones

| # | Decisión | Porqué |
| --- | --- | --- |
| **G1** | **Los tres orbes NO se despliegan.** | Lo pidió el usuario de forma explícita, y **el propio README del kit lo desaconseja**: _«Esta imagen no contiene orbes (solo figura, lunas y ondas). Los tres orbes incluidos proceden de la imagen anterior de la misma serie … Sus posiciones en la demo son una propuesta editable: no están ancladas a nada del fondo.»_ Serían tres sprites prestados de otro arte flotando en posiciones arbitrarias sobre un cielo que no los contempla. Y los tres canales que aquellos orbes representaban ya viven como **tarjetas reales, con texto y destino**, en el contenido de la sección desde la entrega de ayer (correo, comunidad, código): el fondo no tiene que repetirlos. |
| **G2** | La figura se **rellena a lienzo completo** (3344 × 1882, transparente, pegada en (2030, 55)) antes de codificar. | Es lo que permite que las tres capas las consuma la MISMA maquinaria que las otras tres escenas (`ScLayer` con `inset: 0` + `object-fit: cover`), sin estrenar capas posicionadas ni tocar `useSceneParallax`, que comparten cuatro secciones. `bbox` del resultado verificado: `(2030, 55, 2800, 1858)` — exactamente la caja que declara `meta.json`. |
| **G3** | Blending **por capa**: alpha normal en `01-fondo` y `02-figura`, `mix-blend-mode: screen` **solo** en `03-polvo`. | Lo pide el kit (`stardust`: _«capa sintetica opcional, direccion de movimiento opuesta, mix-blend-mode:screen»_) y lo confirma la medición: el fondo es RGB opaco y aplicarle `screen` lo lavaría por completo. Es la primera escena del repo con blending no uniforme — las anteriores eran todas aditivas (`contact-neon-galaxy`) o todas alpha normal (`features-celestial-orbital`). |
| **G4** | Profundidades **normalizadas a 1.0** en la capa más cercana: `0` / `0.353` / `1`. Amplitudes `pointerAmp {x:10, y:6}`, `scrollAmp 32`, `overscan 1.06`. | Normalizar aísla del retuneo del proveedor (`task/lessons.md`, 2026-08-01) y es lo que ya hacen Journey y Features. Las amplitudes **no** se toman del kit: se fijan para **conservar el recorrido que esta sección ya tenía** — la escena saliente daba `22 × 0.46 = 10.1` px de puntero en x, `13 × 0.46 = 6.0` en y y `70 × 0.46 = 32.2` de scroll; con el ancla en 1.0, `{x:10,y:6}` y `32` reproducen 10.0 / 6.0 / 32.0. Cambiar el fondo no debe retunear el movimiento de la sección. |
| **G5** | **No** se implementa la «dirección de movimiento opuesta» que el kit propone para el polvo. | `useSceneParallax` colapsa puntero y scroll en UNA sola profundidad por capa **y la usa también en el término de escala** (`scale = overscan + scrollProgress * depth * 0.05`). Invertir la dirección con una profundidad negativa acoplaría dos efectos que no deben ir juntos: el polvo encogería al scrollear. No se toca un hook que comparten cuatro escenas por un efecto secundario del arte. |
| **G6** | `CONTACT_GUARDIAN_SIZES = "100vw"`, y **no** el `"(min-width: 1280px) 1280px, 100vw"` que heredaba la escena saliente. | **Defecto preexistente que esta entrega corrige de paso**: la sección pasó a sangre ayer (D6) y aquel `sizes` se quedó describiendo una caja de 1280px que ya no existe — le mentía al navegador y le hacía elegir la pista de 1024px en pantallas anchas. Mismo cambio y mismo motivo que D9 de la spec de Features, que allí sí se hizo en su momento. |
| **G7** | **El contenido de la sección se muda a la izquierda** (`margin-inline-end: auto` en vez de `margin-inline-start`), y la viñeta de la escena se espeja (`to right` en vez de `to left`). El tope `min(800px, 58vw)` se **conserva** (medido contra el arte nuevo, §8): cambia el lado, no la técnica. **Lo que sí cambia es dónde cortan los dos regímenes: pasa de `md` a `lg`** — ver §9, es una corrección de un defecto de la entrega anterior que este arte destapó. | Consecuencia directa de §2.1. Si el contenido se quedara a la derecha caería justo encima de la guardiana — exactamente el defecto que la entrega de ayer descubrió midiendo, y que costó dos correcciones. La técnica que lo resolvió (tope proporcional al viewport porque el borde del arte vive en una fracción del ancho, más velo completo mientras las columnas estén apiladas) sigue siendo válida: solo hay que aplicarla al otro lado, y con el corte en el breakpoint correcto. |
| **G8** | Se retira la escena saliente entera: `src/components/contactNeonGalaxy/**` (5 ficheros), `public/contact/neon-galaxy/**` (14 WebP) y `assets/contact-neon-galaxy/**` (7 WebP máster + manifest). El paquete nuevo **no** versiona másteres: solo `assets/contact-cosmic-guardian/manifest.json`. | Dejar los ficheros de una escena que ya no monta nadie es exactamente la deuda que este repo evita, y todo está en la historia de git, así que es reversible. `assets/contact-neon-galaxy/` era **la última superviviente** de la vieja excepción que versionaba másteres de 3344px; con ella se retira la excepción. Precedente exacto: `FeaturesCelestialGuide` → `FeaturesCelestialOrbital` (D16 de aquella spec). |

## 4. Pipeline de imagen (medido de punta a punta)

**El filtro y el `method` no se suponen.** Se probaron contra un activo que no cambia — los 7 WebP máster de la escena **saliente**, recodificados a las dos pistas y comparados por sha256 contra los 14 desplegados:

| calidad | coincidencias byte a byte |
| ------- | ------------------------- |
| 80      | 0/14                      |
| 85      | 0/14                      |
| 88      | 0/14                      |
| **90**  | **14/14**                 |
| 92      | 0/14                      |

Queda demostrado que `Image.resize(LANCZOS)` → `save WEBP method=6` es el pipeline correcto en esta máquina, y de paso que la escena saliente se desplegó a q90. La **calidad** es la única variable que se elige por escena.

**La calidad se elige midiendo la curva sobre el compuesto**, que es lo que ve el usuario, no una capa suelta. Compuestas las 3 capas recodificadas contra las 3 máster, a 2560px, con el mismo orden y el mismo `screen` del polvo:

| q      | Peso 2560 (KiB) | PSNR compuesto |
| ------ | --------------- | -------------- |
| 70     | 345.9           | 40.23 dB       |
| 80     | 386.4           | 41.49 dB       |
| **85** | **435.2**       | **42.51 dB**   |
| 88     | 478.6           | 43.19 dB       |
| 90     | 525.1           | 43.76 dB       |
| 93     | 654.7           | 44.71 dB       |

La rodilla está en **q85**: de q70 a q85 se pagan 89 KiB por +2.28 dB; de q85 a q90, otros 90 KiB por solo +1.25 dB — el coste por decibelio se dobla justo ahí. Misma métrica y misma conclusión que Journey y Features.

**Peso desplegado: 545 192 B (0,52 MiB) en 6 imágenes**, frente a 356 476 B (0,34 MiB) en las 14 salientes. **Sube pese a tener menos de la mitad de capas**, y el motivo es uno solo: `02-figura` pesa 284 KB en la pista de 2560, más que las 14 imágenes salientes juntas. Es un cuerpo grande con textura estrellada fina y un glow de alfa suave y ancha, justo lo que peor comprime WebP; los orbes planos y las nebulosas difusas del arte anterior comprimían muy bien. Se declara como deuda conocida, no se disimula.

## 5. Ficheros afectados

| Fichero | Cambio |
| --- | --- |
| `public/contact/cosmic-guardian/*.webp` | **Nuevo** (6 ficheros) |
| `assets/contact-cosmic-guardian/manifest.json` | **Nuevo** |
| `src/components/contactCosmicGuardian/**` | **Nuevo** (5 ficheros: 3 de código + 2 de test) |
| `src/components/sections/Contact/Contact.tsx` | Escena nueva + contenido espejado a la izquierda (G7) |
| `src/components/sections/Contact/contact.layers.ts` | Docblocks de D20 reescritos para la geometría nueva |
| `src/components/sections/Contact/Contact.test.tsx` | Escena nueva por recuento derivado; test del lado del contenido |
| `src/components/contactNeonGalaxy/**` | **Borrado** (5 ficheros) |
| `public/contact/neon-galaxy/*.webp` | **Borrado** (14 ficheros) |
| `assets/contact-neon-galaxy/**` | **Borrado** (7 WebP + manifest) |

## 6. Tests

Mismo criterio que siempre: por texto del CSS inyectado o por constantes, nunca por `getComputedStyle` de algo dentro de un `@media`; toda aserción de ausencia con sonda positiva.

1. **Tabla de capas**: 3 entradas, rutas a `/contact/cosmic-guardian/`, profundidad máxima exactamente `1` y mínima exactamente `0`, orden fondo → figura → polvo.
2. **`sizes` a sangre** (G6): `CONTACT_GUARDIAN_SIZES === "100vw"`.
3. **Blending por capa** (G3): el CSS declara `mix-blend-mode: screen` para la capa de polvo y **no** lo declara para el fondo ni la figura. Es el test que de verdad importa de esta entrega: aplicar `screen` al fondo opaco lavaría el arte entero **sin perder ni un nodo del DOM ni una palabra de texto**, así que la suite no podría verlo de ninguna otra forma.
4. **Marcado de la escena**: contenedor `aria-hidden`, una `<img>` decorativa por entrada (recuento derivado de `.length`), las dos pistas en `srcSet`, ningún nombre accesible.
5. **Lado del contenido** (G7): el CSS de la rama oscura declara `margin-inline-end: auto` y **no** `margin-inline-start: auto`.
6. **Regresión de nombre** (G8): ni los módulos ni el CSS mencionan `neon-galaxy`.
7. **No-regresión**: todo lo que la entrega de ayer ató (solape, guards de `reduce`, slot pegado, ausencia de `overflow`, 3 tarjetas, formulario de un campo, `mailto:` sin estado falso, invariante D4) sigue verde **sin tocarlo**, y los tests de la rama clara también.

## 7. No-objetivos (YAGNI)

- **No** se despliegan los tres orbes del kit (G1), ni se inventa un uso para ellos.
- **No** se toca la rama clara de Contacto, ni Story/Journey/Features/Footer.
- **No** se toca `useSceneParallax` (G5) ni ninguna de las otras tres escenas.
- **No** se cambia el contenido de la sección: mismos textos, mismas tarjetas, mismo formulario. Solo cambia de lado.
- **No** se retunean las amplitudes de parallax (G4).
- **No** se corrigen los fallos preexistentes del gate ajenos a esta entrega (`check-format` sobre `graphify-out/**`, `check-spelling`).

## 8. Definición de «hecho»

- [x] **Suite completa en verde con `pnpm test`** (el script real, sin flags): **656/656 en 60 ficheros**, contra los 649/649 en 60 con los que cerró la entrega anterior. El delta cuadra: **+10** de los dos ficheros nuevos de `contactCosmicGuardian` (7 de la tabla de capas + 3 del marcado), **+2** en `Contact.test.tsx` (lado del contenido y ausencia de la escena saliente) y **−5** que se van con `contactNeonGalaxy` (3 + 2). `10 + 2 − 5 = 7`.
- [x] **`pnpm typecheck` y `pnpm lint` exit 0**; `check-format` señalando solo `graphify-out/**`.
- [x] **Las 3 capas cargan en navegador real**, el navegador elige la **pista de 2560** en pantalla ancha (`currentSrc` sin sufijo `-1024`), `sizes` computado **`100vw`**, `background-color` de la sección **`rgb(13, 4, 22)`** = `#0d0416`, y el `mix-blend-mode` computado es **`normal` / `normal` / `screen`** — exactamente el reparto que pide el kit.
- [x] **Contenido en su lado nuevo**: `margin-inline-end` resuelto a `416px` a 1440 (o sea `auto` empujando la pareja a la izquierda), pareja en `x 112 → 912`.
- [x] **Contraste medido** sobre el compuesto REAL (3 capas + viñeta, mismo `cover`/`overscan`/`screen` de producción), **peor píxel** de cada bloque de texto, no la media:

    | Viewport   | Pareja    | Peor ratio (pieza)   |
    | ---------- | --------- | -------------------- |
    | 375 × 812  | 32 → 343  | **10.55:1** (cuerpo) |
    | 768 × 900  | 32 → 736  | **10.16:1** (kicker) |
    | 992 × 768  | 32 → 607  | **9.87:1** (cuerpo)  |
    | 1200 × 800 | 32 → 728  | **6.40:1** (cuerpo)  |
    | 1440 × 900 | 112 → 912 | **7.26:1** (cuerpo)  |

    Todos por encima de AA (4.5:1 para texto normal; el `h2` de 32px es texto grande y le basta 3:1). Los dos peores casos, a 1200 y 1440, **no** los fija masa luminosa sino estrellas puntuales: en la caja del `h2` a 1200 solo **6 píxeles de 16 720** superan L 0.03 (0.036%) y en la del cuerpo **2 de 22 880** (0.0087%); el resto de cada caja queda en ≥ 8.9:1. Es una propiedad del arte —un cielo estrellado deja puntos de luz detrás del texto— y se reporta con las dos cifras para no exagerarla ni esconderla. Sin scroll horizontal en ninguno de los cinco anchos.

- [x] **La transición con Features sigue intacta**, re-medida a 1440×900: Features en documento `13500` con alto `1800`, Contacto en `14400` = borde inferior exacto del contenido de Features; `contactTop === frameBottom` en todos los puntos del barrido (900/450/0), y el slot de Features se despega en el mismo `scrollY` en que Contacto cubre el 100%.
- [x] **Rama clara verificada intacta** (no la toca ningún flujo; los tests claros siguen verdes sin editarlos).
- [x] **Cero referencias huérfanas**: `grep` sobre `src/`, `app/`, `docs/` y `assets/` no devuelve ninguna referencia de CÓDIGO a `neon-galaxy`; lo que queda son menciones en prosa histórica de docblocks («esto sustituye a X»), que es la convención del repo.
- [ ] Registro en el vault y en `task/todo.md` / `task/lessons.md`.

## 9. Desviaciones de implementación

**El corte entre los dos regímenes de viñeta estaba en el breakpoint equivocado, y el arte nuevo lo destapó.** La entrega de ayer puso el corte en `md` (768px) dando por hecho que a partir de ahí el contenido ya iba recogido a un lado. Es falso: las dos columnas solo dejan de apilarse cuando el contenido mide `320 + 380 + 48 = 748px`, y con el tope de `58vw` eso no pasa hasta ~1290px de viewport. Entre 768 y 991 el contenido seguía a ancho completo mientras el velo lateral ya se había retirado. Con el arte anterior el fallo no se veía porque su masa luminosa caía en otro sitio; con la guardiana sí: **medido a 768×900, el peor píxel bajo el kicker daba 1.83:1** — por debajo incluso de AA. Corregido moviendo a `lg` **los dos** gates que tienen que cortar juntos (el de `ScVignette` y el del `max-width` de `ScDarkContent`): ese mismo punto pasa a **10.16:1**. De paso, la parada del régimen ancho sube de `60%` a `66%`, porque el contenido llega hasta ~61% del ancho y el último tramo se quedaba sin velo.

**Un backtick dentro de un comentario CSS rompió el build, que es exactamente la lección de 2026-07-25.** Al documentar el cambio anterior escribí `` `lg` `` y `` `md` `` dentro de un comentario `/* */` **dentro** del template de `styled.div`. El backtick cierra el template literal: `tsc` dio `TS1146: Declaration expected` y el dev server, `Expected a semicolon`. Corregido quitando las comillas. Deja además un corolario que no estaba escrito: **el búfer de consola del panel conserva esos errores después de arreglarlos y recargar**, así que leerlo sin más habría hecho creer que el fallo seguía vivo; lo que sí es evidencia del estado actual es que el `nextjs-portal` no contiene diálogo de error y que las mediciones en vivo devuelven geometría real.

**Tres cosas que los flujos reportaron fuera de su alcance y se cerraron en integración.** (1) `CONTACT_CHIP_BG_DARK` era código muerto desde ayer: el chip solo se monta en la rama clara, así que el ternario contra `theme.data.isLight` tenía una rama inalcanzable — y encima describía el void de la escena saliente. Retirado, con el porqué escrito en la constante que queda. (2) Varios docblocks seguían citando `ContactNeonGalaxy`/`CONTACT_NEON_VOID` como si fueran el estado actual (en `contact.layers.ts` y en `footer.layers.ts`); reescritos. (3) La cifra de luminancia del docblock de `ScContact` estaba mal desde ayer: decía «L ≈ 0.02» para `#02040e` cuando su OKLCH L real es **0.111** (era luminancia relativa confundida con L). Corregida y verificada con un script que hace la conversión sRGB→OKLab y se sanity-checkea contra blanco = 1.0 y negro = 0.0; el void nuevo `#0d0416` da **0.137**. El razonamiento que sostenía la decisión no cambia: los dos siguen muy por debajo del 0.22 del rol semántico.

**El peso sube y no se disimula.** 0,52 MiB en 6 imágenes frente a 0,34 MiB en las 14 salientes, pese a tener menos de la mitad de capas: `02-figura` sola pesa 284 KB en la pista de 2560, más que las 14 imágenes anteriores juntas. Es un cuerpo grande con textura estrellada fina y un glow de alfa ancha, justo lo que peor comprime WebP. Declarado como deuda conocida en el manifest.
