# Lecciones

## 2026-08-11 — Un CLS de `0` puede significar «no hay shift» o «no había nada visible que desplazar»

- **Qué pasó:** la Task 10 sacó el intro del hero de la máquina de fases JS y lo pasó a `@keyframes`
  estáticas, de modo que el texto es visible desde el primer pintado. El LCP throttled cayó de
  4520 ms a 932 ms — y el CLS del mismo escenario subió de `0` a `0,000118`. Leído sin más, eso dice
  «has regresado el CLS que la Task 9 acababa de arreglar».
- **Qué era de verdad, aislado con evidencia:** el desplazamiento se registra a `~1167 ms`, su única
  fuente es el `<h1>` y el muestreo de su caja lo explica entero: al llegar la webfont (`~1054 ms`)
  el ancho pasa de `213,63` a `219,64 px` y el `left` de `80,69` a `77,67` — reflujo HORIZONTAL,
  alto y `top` intactos. El `<h1>` es hijo de un flex con `align-items: center`, así que su caja
  mide lo que mide su texto. Ese reflujo existía exactamente igual antes; lo que no existía era un
  texto VISIBLE al que se le pudiera contabilizar: la API de inestabilidad de layout solo cuenta
  contenido visible, y hasta la entrega anterior el hero seguía en `opacity: 0` a esa altura.
- **Regla:** un `0` de CLS medido sobre una pantalla que todavía está en blanco no es un `0`
  ganado, es un `0` que no ha tenido ocasión de contar. Al hacer visible antes cualquier contenido,
  hay que **re-medir CLS esperando que suba** y, si sube, aislar la fuente (`entry.sources[].node`)
  y muestrear la caja del elemento en el eje correcto — el horizontal también cuenta — antes de
  atribuirse la regresión. Aquí el residuo (`0,000118`, el `0,12 %` del umbral «bueno») es lo que
  el fallback con métricas ajustadas de `next/font` no llega a absorber, y se declara en la spec
  en vez de esconderse.
- **Corolario ya conocido que volvió a morder:** la abreviatura `animation:` no se expande en jsdom
  (regla 38 de `RULES.md`). El candado del retardo del navbar leía `''` en vez de `760ms` hasta que
  la declaración se reescribió con longhands (`animation-name`/`-duration`/`-delay`/`-fill-mode`),
  igual que ya hacía `eyeStagger`. Si una coreografía necesita un candado sobre su retardo, nace
  con longhands, no se convierte después.

## 2026-08-11 — `next/script strategy="beforeInteractive"` NO se sirve como `<script>` literal en `<head>`, ni en export estático

- **Qué se asumió:** para el anti-flash de tema (Task 9), la lectura de la documentación de Next
  ("scripts are injected into the initial HTML from the server... downloaded before any Next.js
  module") sugiere un `<script>` bloqueante y literal dentro de `<head>`, servido tal cual desde el
  HTML — el patrón clásico de "anti-FOUC" de toda la vida.
- **Qué hay de verdad, medido leyendo `out/index.html` byte a byte tras `pnpm build`:** `<head>`
  contiene ÚNICAMENTE los `<script async>` de los chunks de la app; el contenido real del script
  (`resolveInitialTheme` serializado) vive dentro de un `<script>` síncrono normal, pero colocado
  como PRIMER hijo de `<body>` — `(self.__next_s=self.__next_s||[]).push([0,{"children":"...",
  "id":"theme-bootstrap"}])`. Ese array lo consume `app-bootstrap.ts` (parte del runtime de Next,
  confirmado vía context7 leyendo su fuente): crea un `<script>` real con `document.createElement` +
  `el.innerHTML = props.children`, lo añade a `document.head`, y SOLO ENTONCES llama a `hydrate()` —
  es decir, la garantía real es "antes de que React hidrate", no "antes de que el navegador pinte
  nada del HTML estático". El export estático no cambia este mecanismo: es el mismo runtime cliente
  de Next, solo que sin servidor detrás.
- **Por qué no rompió el objetivo de todos modos:** medido con `PerformanceObserver` (`layout-shift`,
  `buffered: true`, mismo método que el baseline) en Chrome real vía `playwright-cli`, con
  `prefers-color-scheme: dark` emulado y sin storage: el atributo `data-theme` tarda hasta ~70ms en
  fijarse (bastante después de `DOMContentLoaded`), pero el CLS medido dio **0** (baseline 0,0799).
  La explicación que sostienen los datos: la propiedad que el script protege (`--hero-title-vw` y
  compañía, variables CSS puras — ver la entrada de abajo) se resuelve en el momento en que el
  navegador COMPONE el primer frame, no en el momento en que se declaró; si ese primer frame real
  llega después de los ~70ms, nunca hay un frame intermedio "equivocado" que componer.
- **Cómo evitarlo la próxima vez:** no dar por sentado el comportamiento de `next/script` en
  `output: "export"` a partir de la prosa de la documentación (escrita pensando en SSR clásico).
  Verificar SIEMPRE leyendo el `out/*.html` literal tras el build — mismo criterio que ya exige el
  brief de esta tarea — y, si el objetivo es evitar un flash de layout medible (no solo "que el
  script exista"), la prueba que de verdad responde a la pregunta es el `PerformanceObserver` en un
  navegador real, no la posición del script en el documento.

## 2026-08-11 — Cambiar el estado INICIAL de un `ThemeProvider` para que arranque ya corregido rompe la hidratación de las secciones que ramifican por tema; las variables CSS por atributo no

- **Qué se planteó:** la Task 9 pedía que `ThemeProvider` "pase a inicializar desde" el tema resuelto
  por el script pre-pintado, para que ningún componente tuviera que re-corregirse tras montar.
  Tentación directa: leer el atributo `data-theme` (ya fijado por el script) en el inicializador de
  `useState` del proveedor.
- **Por qué es una trampa:** `Story`/`Features`/`Journey`/`Contact` NO solo cambian de color por tema
  — montan un COMPONENTE HIJO distinto por rama (regla 6 de `RULES.md`: "la rama de tema es siempre
  un componente hijo"). Si el estado inicial de React difiere entre el HTML horneado en build (SIEMPRE
  "light", el proveedor no puede leer `localStorage` durante ese render) y el primer render del
  cliente, React tiene que descartar y re-montar esos subárboles enteros al hidratar — un mismatch
  ESTRUCTURAL (tipos de componente distintos), no un simple atributo, que `suppressHydrationWarning`
  NO cubre (solo funciona "un nivel", para diferencias de texto/atributo en el MISMO nodo).
- **La causa raíz real del CLS 0,0799 medido (spec 3.1), aislada con evidencia:** no era el cambio de
  rama de las secciones (fuera del viewport en el momento del shift, t=400ms) sino el propio Hero —
  concretamente `ScHeroBrand` (el elemento LCP de esa medición), cuyo `font-size: clamp(34px, 8vw,
  258px)` bajaba a `7vw` vía un prop `$light` que solo se corregía en el efecto post-montaje. Contraste
  que lo confirmó: `HeroBackdrop` (Aura/Eye) usa `position: absolute; inset: 0` — nunca contribuye a
  CLS pese a cambiar de tema, porque no participa del flujo de layout.
- **La solución que SÍ es segura:** dejar el estado de React de `ThemeProvider` intacto (arranca en
  "light", igual en build y en el primer render de cliente — cero riesgo de mismatch) y sacar las
  propiedades puramente de TAMAÑO/POSICIÓN que sí importaban (`font-size`, `align-items`,
  `justify-content`, `text-align`, `max-width` de Hero) a variables CSS (`var(--hero-title-vw, 7vw)`)
  redefinidas por un selector de atributo estático (`:root[data-theme="dark"] { --hero-title-vw: 8vw;
  }`, en `GlobalStyles.tsx`, con FALLBACK = el valor que el build ya hornea por defecto). Esa regla no
  depende del prop `theme` de React en ningún momento, así que está presente en el HTML horneado desde
  el primer build, sin importar qué tema tuviera el proveedor al generarlo.
- **Candado de test que hizo falta inventar:** `getComputedStyle` en jsdom NO resuelve `var()` —
  devuelve el texto crudo de la declaración sin sustituir la variable (ninguna lección previa del repo
  lo documentaba; es de la misma familia que "jsdom no evalúa `@media`" pero no es lo mismo). Eso
  permitió un candado directo y barato: afirmar que el `fontSize` computado es IDÉNTICO con y sin
  storage oscuro (antes de esta tarea, ese mismo assert habría fallado — el valor SÍ cambiaba). Y como
  `createGlobalStyle` tampoco inyecta nada bajo jsdom (lección ya existente, 2026-07-25), el valor
  numérico del override (`8vw`) solo se pudo candar leyendo el FICHERO fuente con `node:fs` (mismo
  patrón que `app/layout.test.ts`), nunca por render.
- **Regla:** antes de mover una rama de tema de React a un mecanismo pre-pintado, separar qué de esa
  rama es GEOMETRÍA (tamaño/posición, candidato real a CLS) de qué es COLOR/OPACIDAD (nunca cuenta
  para CLS) y de qué es un COMPONENTE DISTINTO por rama (nunca migrable a CSS puro sin un rediseño
  mucho más grande). Solo el primer grupo justifica el coste de una variable CSS nueva.

## 2026-08-08 — `pnpm ci` a secas ejecuta el clean-install interno AUNQUE exista un script llamado `ci`

- **Qué pasó:** tras añadir el script `"ci"` a `package.json`, el orquestador ejecutó `pnpm ci`
  para el gate final. Salió `exit 0` — pero la salida eran líneas de instalación
  (`+ cspell 8.19.4`, `+ eslint 9.39.5`…), no typecheck/lint/tests: pnpm trató `ci` como su
  comando interno de clean-install (compatibilidad con `npm ci`), que **sombrea al script del
  mismo nombre**, y el gate no corrió. El manual global ya decía «nunca `pnpm ci` a secas»;
  el matiz nuevo, medido hoy, es que definir el script NO desactiva la trampa.
- **Por qué es peligroso:** el mismo comando estaba escrito en `netlify.toml`
  (`command = "pnpm ci && pnpm build"`) y en `.github/workflows/ci.yml` (`- run: pnpm ci`).
  En los dos, el «gate» habría sido un no-op silencioso con exit 0: despliegues y PRs en verde
  sin ejecutar un solo test — exactamente el agujero que el script `ci` venía a cerrar.
- **Detección:** si la salida de un «gate» muestra líneas `+ paquete versión` en vez de
  `tsc`/`eslint`/`vitest`, no corrió el gate: corrió una instalación.
- **Regla:** el script se invoca SIEMPRE como `pnpm run ci` — en terminal, en `netlify.toml`,
  en workflows y en documentación. Todas las referencias del repo quedaron corregidas hoy y
  los comentarios de `netlify.toml` y del workflow documentan la trampa in situ.

## 2026-08-06 — Un requisito puede pedir una TÉCNICA que el repo ya retiró tras medirla

- **Qué pasó:** el usuario pidió «scroll-snap» para el statement de Story. `scroll-snap-type: y
  proximity` había vivido en `html` de este repo y **se retiró el 2026-07-31** tras medirlo: con
  anclas de una pantalla exacta degenera en `mandatory` y roba el control del scroll (`900 → 720`,
  `1200 → 1440`, `3100 → 2880`; tirones de hasta 240 px, a veces en contra del gesto).
- **Qué NO hacer:** ni implementarlo en silencio (reabre una regresión medida) ni negarse en
  silencio (el usuario pidió un efecto, no una propiedad concreta).
- **Regla:** separa el EFECTO del MECANISMO. Se entrega el efecto por la vía que el repo ya tiene
  probada — aquí el pin de `position: sticky`, que además es el motor del deck oscuro — y se le dice
  al usuario, con la medición delante, qué se hizo, qué no y qué reactivaría la alternativa. La
  decisión informada es suya; la de no reintroducir en silencio un fallo conocido, mía.
- **Candado:** un test que afirme que el componente NO declara `scroll-snap-type`/`scroll-snap-align`.
  Sin él, la técnica retirada vuelve a colarse en la siguiente iteración sin que nada avise.

## 2026-08-06 — «No avanza» en pestaña oculta: instrumenta antes de diagnosticar

- **Qué pasó:** con el deck del statement montado, scrollear no avanzaba ni una línea. Leído
  literal, eso dice «el deck no funciona» y lleva a reescribir código correcto.
- **El control, en dos niveles:** primero una pieza que la entrega NO tocaba (`--story-progress`, que
  escribe `useSectionProgress` desde antes de esta sesión) — también vacía. Después, la medida
  directa: instrumentar la propia página con un listener de `scroll`, un bucle de
  `requestAnimationFrame` y un `IntersectionObserver` propios, y provocar cuatro saltos de scroll
  reales. Resultado: **0 eventos, 0 frames, 0 callbacks**, con `visibilityState: "hidden"`.
- **Regla:** cuando algo ligado a scroll «no responde», no midas el componente: mide si el ENTORNO
  entrega los eventos de los que depende. Tres líneas de instrumentación convierten una sospecha en
  un dato y evitan reescribir código que ya era correcto. Y lo que quede sin observar se declara
  como tal —«verificado por estructura y por test, no por observación del gesto»— en vez de darlo
  por bueno.

## 2026-08-06 — `align-items: center` en un grid ANULA el `stretch` que hace falta

- **Qué pasó:** la tarjeta de la figura de Story tenía que igualar la altura de la columna de
  contenido. Medido: **548 px contra 863 px**. La tentación es buscar dónde poner una altura.
- **Causa raíz:** CSS Grid ya estira los ítems a la altura de su fila **por defecto**
  (`align-items: stretch`). El contenedor declaraba `align-items: center`, que lo anula. No faltaba
  una altura: sobraba una declaración.
- **Regla:** antes de añadir una medida, comprueba si el comportamiento que quieres es el que el
  layout ya tiene por defecto y alguien desactivó. Una altura en píxeles habría quedado
  desincronizada a la primera línea de copia que cambiara; quitar el `center` no puede
  desincronizarse nunca. Medido después: 863 px las dos columnas.

## 2026-08-06 — Añadir una sección cambia contratos que viven en OTRO fichero

- **Qué pasó:** promover la nota de cierre de Story a un bloque a pantalla completa la convirtió en
  una `<section>` propia. `HomeSections.test.tsx` —fichero que la tarea no tocaba— afirma el orden
  COMPLETO de las secciones de la home y se puso en rojo: esperaba cuatro, había cinco.
- **Por qué está bien que fallara:** ese test hace exactamente su trabajo. Afirma la lista entera en
  vez de un «contiene», así que caza una sección que se cuela en medio. Relajarlo para que pasara
  habría sido perder la única propiedad que protege.
- **Regla:** cuando una entrega **añade o quita un elemento de nivel de sección**, busca los tests
  que afirman estructura de página aunque estén fuera del alcance de ficheros del cambio. Y al
  actualizarlos, actualiza también su complementario: aquí, que en claro sean cinco y en oscuro
  cuatro es justo lo que demuestra que el bloque nuevo es exclusivo de una rama.

## 2026-08-06 — Un acento de marca no es un color de texto: medir antes de reutilizarlo

- **Qué pasó:** las tarjetas nuevas de Story pintan el número del paso con el acento que ya usaba el
  pilar (`pillarColor`), sobre un fondo `color-mix(in oklab, <acento> 12%, surface)`. Tres de los
  cuatro números quedaban en **2.06:1, 2.45:1 y 3.05:1** frente al 4.5:1 de AA. Gate entero en
  verde: 989 tests, typecheck, lint.
- **Por qué no lo cazó nada:** los tests de contraste del repo miden **roles semánticos**
  (`text`/`textMuted`/`textSubtle`) sobre `surface`. El badge usa un color de `palette` directo
  sobre un fondo que no es `surface` sino una mezcla. Ninguna aserción cubría esa combinación. Y
  `jsdom` **no resuelve `color-mix()`**, así que medirlo exige reproducir la mezcla a mano.
- **La spec se contradecía a sí misma:** una decisión decía «reutiliza el acento existente, no
  introduzcas una segunda escala» y otra exigía AA sobre el fondo del badge. **Gana el requisito de
  accesibilidad**, y la decisión antigua se corrige EN LA SPEC, con la medición al lado — no se
  elige en silencio.
- **Regla:** cuando un token de `palette` vaya a portar glifos, su contraste contra el **fondo real**
  (no contra `surface` genérico) es parte de la definición de hecho. Si el fondo es un `color-mix`,
  el candado reproduce la mezcla y se contrasta además contra el motor real del navegador — ahí sí
  se resuelve, y de paso valida la fórmula del test. Medido en navegador tras el arreglo: 4.88 ·
  4.99 · 5.51 · 7.45, frente al 4.87 · 4.98 · 5.52 que calculaba el test.

## 2026-08-06 — Una medición de animación en pestaña oculta da cero, no «no funciona»

- **Qué pasó:** para verificar que `@property --vti-angle` interpola de verdad en este motor (el
  riesgo real del borde cónico), se montó una sonda con la animación y se leyó el ángulo dos veces
  con 700 ms de diferencia: **0deg las dos veces**. Leído literal, eso dice «`@property` no
  funciona» y habría tumbado la decisión de diseño.
- **Causa:** `document.visibilityState === "hidden"` en este panel. Una pestaña oculta **congela el
  reloj de las animaciones** — el mismo síntoma que ya documentan las lecciones del 2026-07-27 y
  del 2026-08-02, aquí en su tercera forma.
- **Cómo se midió de verdad:** pausando la animación y conduciendo el reloj a mano
  (`Animation.currentTime`), la misma técnica que el repo ya usó para `eyeStagger`: **0° → 90° →
  180° → 270°** a 0/800/1600/2400 ms de un ciclo de 3200 ms. Interpolación lineal exacta.
- **Regla:** antes de concluir que una animación «no corre», comprueba `document.visibilityState`.
  Si está oculta, no midas por reloj de pared: conduce `Animation.currentTime` y lee el valor
  computado en cada instante. Un cero medido con el reloj parado no es un cero.

## 2026-08-05 — Un token de invalidación escrito a mano no sobrevive a un remontaje

- **Qué pasó:** al volver a `/` desde una página legal con `next/link`, el fondo del hero
  desaparecía: el envoltorio se quedaba en `data-state="pending"` de forma permanente (medido hasta
  3,6 s) y sus cuatro capas en `opacity: 0`. En una carga completa de página no ocurría nunca.
- **Causa raíz:** `HeroBackdrop` invalida las carreras de `img.decode()` en vuelo con un contador
  (`tokenRef`), que su limpieza de desmontaje incrementa. Pero el token con el que cada carrera se
  compara viajaba **escrito a mano** dentro del estado (`pendingEntry.token`), inicializado a `0` en
  el inicializador de `useState`. React StrictMode (activo en desarrollo) simula desmontaje +
  remontaje en cada montaje de cliente: la limpieza sube `tokenRef` a 1, la carrera vuelve a correr
  comparando contra el 0 congelado, y la guarda descarta `finishLoad()` **para siempre**.
- **Por qué la carga completa no lo veía:** ahí no hay desmontaje simulado. Traza medida en el
  navegador (instrumentación temporal a `sessionStorage`, ya retirada) — carga: tres carreras con
  `tok=0` y ninguna entrada `unmount`; regreso por navegación de cliente:
  `|unmount tok=1|race c=true tok=1 my=0|race c=false tok=1 my=0`.
- **Regla:** un contador de invalidación se lee del ref **en el instante en que arranca el efecto**,
  nunca se copia dentro del estado en el momento de crearlo. Copiarlo congela el valor en el
  ciclo de vida del ESTADO, mientras el ref sigue el ciclo de vida de los EFECTOS: en cuanto los dos
  ciclos se separan —y un remontaje los separa siempre— la comparación queda desincronizada sin un
  solo error que lo delate. El candado correspondiente monta el componente con
  `renderWithProviders(..., { reactStrictMode: true })`; `unmount()` + volver a montar NO sirve,
  porque crea una instancia nueva con los refs reinicializados y no reproduce la carrera.
- **Corolario de método:** el primer intento de reproducción dio un falso «funciona» porque el
  script de navegación no comprobaba `location.pathname` — el click de ida no había navegado y se
  midió la home sin salir de ella. Cualquier verificación de un flujo de navegación afirma en qué
  ruta está en cada paso, no solo el estado final.

## 2026-08-05 — `svg { width: 100% }` global: tercera vez, mismo fallo

- **Qué pasó:** el chevron de los desplegables nuevos del navbar se renderizó a **215x143 px** e
  hinchó su disparador a 143 px de alto dentro de una banda de 56 px. Medido en navegador real; la
  suite de 964 tests estaba entera en verde.
- **Causa raíz:** `GlobalStyles` declara `svg { width: 100%; display: block; }` para todo el sitio, y
  una declaración CSS gana siempre a la geometría implícita del `viewBox`. Un `<svg>` nuevo sin
  `width`/`height` propios se estira a su contenedor y arrastra la altura por relación de aspecto.
  `ScLogo` (`src/components/ui/Logo/Logo.tsx`) ya documenta exactamente el mismo fallo medido.
- **Por qué ningún test lo vio:** jsdom no hace layout — `getBoundingClientRect()` devuelve ceros —,
  así que la regresión es literalmente invisible para la suite.
- **Regla:** todo `<svg>` inline nuevo declara `width`, `height` y `flex: none` en su propio CSS, sin
  excepción. Y el candado se escribe sobre las **declaraciones** (`getComputedStyle`, que jsdom sí
  resuelve por CSSOM), no sobre la geometría. Corolario más general: cuando la suite entera está en
  verde y el cambio es visual, la verificación no ha terminado hasta haberlo mirado en un navegador.

## 2026-08-05 — Traducir un centinela de máquina lo desactiva, y la paridad de claves no lo ve

- **Qué pasó:** las páginas legales marcan los datos que faltan envolviendo el literal `POR_COMPLETAR`
  en un `<mark>` visible. La traducción inglesa lo tradujo como `PENDING` en sus 8 apariciones. Como
  prosa es correcto; como token es otro string, y el renderer busca el literal exacto. Medido en
  navegador real sobre la misma página: **español 2 tokens → 2 marcas, inglés 0 tokens → 0 marcas**.
  Un lector en inglés veía documentos legales que parecían completos y no lo estaban.
- **Por qué no lo cazó nadie:** el candado de paridad de `locales.test.ts` compara **rutas de clave**,
  y las rutas eran idénticas — lo que cambiaba era el valor. `legal.test.ts` mira una constante de
  TypeScript, no el texto. Los tests de `LegalDocument` renderizan en español, que era el idioma que
  funcionaba. Cuatro capas en verde con el defecto dentro. Solo apareció midiendo la página **en
  inglés** en un navegador real, que no es un paso obvio: la lengua no cambia el código que corre.
- **Cómo evitarlo:** distinguir **centinela de prosa** antes de mandar traducir. Un string de locale
  puede ser texto para una persona o un token para el código; los del segundo tipo se declaran como
  constante importada y se documentan como «no traducir» ahí mismo. Su explicación al usuario sí se
  traduce, y va en otra clave. Y cuando una propiedad vive en el VALOR y no en la clave, hace falta
  un candado que mire el valor: aquí, contar las apariciones **documento a documento** (no el total:
  cinco de más en uno y cinco de menos en otro dan el mismo total).

## 2026-08-05 — Verificar una herencia de metadata en la raíz no demuestra nada sobre una ruta anidada

- **Qué pasó:** se midió correctamente que Next 16 **sustituye** el objeto `openGraph` del padre por
  el del hijo en vez de fusionarlo, y se protegieron `siteName`/`locale`/`type` repitiéndolos en cada
  ruta. A la imagen del convenio `app/opengraph-image.tsx` se le dio trato distinto porque un
  experimento la vio sobrevivir a ese reemplazo. Resultado en el build real: la home con `og:image`,
  y **las cuatro páginas legales sin `og:image` ni `twitter:image`**.
- **Por qué:** el experimento usaba `app/page.tsx`, el **mismo segmento** donde vive el fichero de
  imagen — ahí se adjunta después y sobrevive. En una ruta anidada la imagen llega dentro del
  `openGraph` ya resuelto del PADRE, así que el `openGraph` de la página se la lleva por delante,
  igual que a `og:site_name` y `og:type`. Un caso de prueba en la raíz recorre otro camino de código
  que casualmente da el mismo HTML.
- **Cómo evitarlo:** al verificar cualquier comportamiento de **herencia** en un enrutador por
  segmentos, el caso de prueba tiene que estar **al menos un nivel por debajo** de lo que se hereda.
  Y ninguna suite de Vitest ejecuta el pipeline de export: toda entrega que toque metadata termina
  leyendo el HTML emitido de **todas** las rutas, no de una. Corolario del mismo arreglo: un fichero
  generado sin extensión (`out/opengraph-image`) no tiene `Content-Type` deducible, así que un host
  estático lo sirve como `application/octet-stream` y los rastreadores descartan la vista previa —
  hay que declararlo a mano en la config del host.

## 2026-08-04 — Una palanca fluida tiene que medir el EJE que restringe, no el que se escribe por costumbre

- **Qué pasó:** para que Features cupiera en una pantalla se hicieron fluidos su relleno vertical, la
  separación entre identidades y el tamaño del título, todos con `clamp(min, Nvw, max)`. Medido
  después en navegador: a **1280×720 la sección seguía desbordando los mismos 128 px que antes del
  cambio**. Ni un píxel de mejora en el viewport más común del rango.
- **Por qué:** la restricción que había que satisfacer era «el contenido cabe en el ALTO del
  viewport», y `vw` mide el ancho. A 1280 de ancho, `6vw` son 76,8 px, por encima del techo de 64 px
  del `clamp`, así que la expresión se quedaba clavada en su máximo justo donde el presupuesto
  vertical apretaba. La palanca solo apretaba en móviles estrechos — que resultan ser los viewports
  **altos**, donde menos falta hacía. `vw` es la unidad fluida por defecto de la memoria muscular
  (tipografía responsive, anchos de columna), y por eso se escribió sin pensar cuál era la magnitud
  restringida.
- **Cómo evitarlo:** antes de escribir un `clamp()`, decir en voz alta qué desigualdad se quiere
  satisfacer. Si es `contenido + relleno ≤ alto`, el término fluido va en `dvh`; si es
  `contenido ≤ ancho`, en `vw`. Cuando las dos restricciones son reales a la vez —un móvil estrecho y
  alto y un portátil ancho y bajo—, `min(Nvw, Mdvh)` deja que gane la que esté más apretada en cada
  caso, con una sola declaración. Y el test que ata la decisión **asevera la unidad**, no solo que
  «hay un clamp»: una aserción de `clamp(...)` genérica pasa en verde con el eje equivocado dentro.

## 2026-08-04 — Deshabilitar un control nativo a mitad de su propia interacción le arranca el foco al usuario de teclado

- **Qué pasó:** el botón de tema pasó a hacer un viaje de scroll antes de cambiar el tema, y se le
  añadió `disabled` mientras ese viaje durase, para reflejar en la interfaz que la acción estaba en
  marcha. Parece una mejora de retroalimentación y es una regresión de accesibilidad.
- **Por qué:** un `<button>` que pasa a `disabled` deja de ser enfocable, y el navegador **manda el
  foco al `<body>`**. Un usuario de teclado que activa el control con Enter desde el pie de la página
  pierde el foco durante todo el viaje y, cuando el botón vuelve, ya no está en él: tiene que tabular
  otra vez desde el principio del documento. Un lector de pantalla, además, anuncia «deshabilitado»
  justo después de que la persona haya pulsado, que se lee como «tu acción ha fallado». Y el atributo
  no aportaba nada funcional: la reentrada ya la bloqueaba un guard síncrono por `ref`, que actúa en
  el mismo tick, antes de que React llegue a repintar.
- **Cómo evitarlo:** un control **nunca** se deshabilita como consecuencia de su propia activación.
  Si hace falta señalar «en curso», se usa `aria-busy` o un cambio visual que no toque la
  focusabilidad, y el bloqueo real de reentrada vive en la lógica, no en el atributo. Corolario para
  los tests: jsdom **no** reproduce ese auto-blur, así que el aserto que ata la regla es la ausencia
  del atributo (la causa), no la permanencia del foco (el síntoma) — atar el síntoma daría un test
  verde con el bug dentro.

## 2026-08-04 — Un breakpoint de «contenido recogido a un lado» no es el breakpoint en que las columnas se recogen

- **Qué pasó:** el contenido oscuro de Contacto tiene dos regímenes de legibilidad — velo completo
  cuando las columnas se apilan a ancho completo, velo lateral cuando van recogidas a un lado — y el
  corte entre los dos se puso en `md` (768px), que es donde el resto del componente cambia de layout.
  Con el arte siguiente (figura al otro lado) apareció el fallo: **a 768×900 el peor píxel bajo el
  kicker daba 1,83:1**, por debajo incluso de AA.
- **Por qué:** las dos columnas no se recogen en `md`. Se recogen cuando el contenido mide al menos
  `flex-basis + flex-basis + gap` = 748px, y con el tope de `58vw` eso no ocurre hasta pasados los
  ~1290px de viewport. Entre 768 y 991 el contenido seguía a ancho completo mientras el velo lateral
  ya se había retirado: una franja de anchos con el peor de los dos mundos. El defecto ya existía en
  la entrega anterior; no se vio porque la masa luminosa de aquel arte caía en otro sitio.
- **Cómo evitarlo:** cuando dos reglas describen el MISMO hecho («¿el contenido está recogido a un
  lado?»), tienen que cortar en el mismo punto y ese punto se **deriva del layout**, no se toma
  prestado del breakpoint que ya estaba escrito al lado. Aquí: sumar los `flex-basis` y el `gap`,
  compararlo con el ancho disponible, y comprobar en navegador —a un ancho DENTRO de la franja
  sospechosa— que el régimen que se activa es el que se cree. Un breakpoint que «parece el natural»
  porque el fichero ya lo usa para otra cosa es una coincidencia, no una razón.

## 2026-08-04 — Un backtick en un comentario CSS rompe el build, y la consola sigue enseñándolo después de arreglarlo

- **Qué pasó:** al documentar el arreglo de arriba escribí `` `lg` `` y `` `md` `` en un comentario
  `/* */` **dentro** del template de un `styled.div`. El backtick cierra el template literal: `tsc`
  dio `TS1146: Declaration expected` y el dev server, `Expected a semicolon`. Es exactamente la
  lección del 2026-07-25, cometida otra vez.
- **El corolario nuevo, que sí es información:** tras corregirlo y recargar, `read_console_messages`
  seguía devolviendo el mismo error de parseo, repetido más de diez veces. El búfer del panel
  conserva los errores de la ventana rota y no se limpia con la recarga. Leerlo sin más habría hecho
  creer que el fallo seguía vivo.
- **Cómo evitarlo:** los comentarios dentro de un template de styled-components nombran las
  propiedades y los tokens **sin comillas de ningún tipo**; si el comentario necesita citar código,
  se saca fuera del template, encima del `const`. Y ante un error de consola que se supone corregido,
  la evidencia del estado ACTUAL no es el log: es que el `nextjs-portal` no contenga diálogo de error
  y que una medición en vivo (geometría, `getComputedStyle`) devuelva datos reales del componente.

## 2026-08-04 — Una prop interpolada en una lista genera una clase de styled-components por elemento

- **Qué pasó:** al añadir al footer un campo de 24 estrellas titilantes, `pnpm test` (el script real,
  sin `--maxWorkers`) empezó a fallar por timeout de 5000 ms en `app/home-page.flujo.test.tsx`. La
  explicación cómoda estaba escrita ya en el repo — «contención de CPU», documentada para ESE mismo
  fichero en la entrega del 2026-08-02.
- **Por qué era falsa:** ese test es **síncrono**, no tiene ni un `await`. Un timeout ahí no mide
  espera, mide render. Medido con una edición invertible (renderizar cero estrellas y comparar):
  **5160 ms con 24, 4315 ms con cero** — ~850 ms, unos 35 ms por estrella. La causa: cada estrella
  interpolaba cinco props distintas en el template, así que styled-components generaba **una clase
  por estrella**, con sus dos bloques `@media` cada una (~72 reglas inyectadas en runtime). No es
  coste de DOM: 24 `<div>` vacíos no cuestan nada.
- **Cómo evitarlo:** antes de interpolar una prop en un `styled` que se renderiza en bucle, contar
  cuántas combinaciones distintas va a haber. Una booleana o un enum corto generan 2-3 clases y da
  igual; una prop continua (posición, tamaño, retardo) genera tantas clases como elementos. Para ese
  caso, **propiedades personalizadas en el atributo `style`**: el template se queda estático, las N
  instancias comparten una clase y la variación viaja por el DOM. Y en general: **un timeout en un
  test síncrono nunca es «la máquina iba cargada»** — antes de aceptar un diagnóstico ya escrito,
  comprobar si el test tiene algo que esperar. Si no lo tiene, hay que medir.

## 2026-08-04 — El contraste MEDIO de un bloque no dice nada sobre la legibilidad de una letra

- **Qué pasó:** el contenido nuevo de Contacto se colocó sobre `ContactNeonGalaxy` y la verificación
  de contraste salió holgada: 10:1 de media, muy por encima de AA. Pero el **peor píxel** bajo el
  párrafo de cuerpo daba **1.06:1**: había un punto casi blanco del arte justo donde empieza el
  texto. Una letra que cayera ahí sería invisible, y la media no lo veía.
- **Segundo error, en la propia medición:** el primer cálculo leyó `getComputedStyle(el).color` con
  un `match(/[\d.]+/g)` — pero ese valor viene en `oklch(0.86 0.004 286)`, así que los tres números
  se tomaron como si fueran RGB y todos los ratios salieron mal. La forma correcta de convertir es
  dejar que lo haga el navegador: pintar el color en un canvas de 1×1 y leer el píxel.
- **Tercer error, más caro:** el primer arreglo fue un tope en píxeles (`max-width: 800px`) que
  esquivaba el arte a 1440. A 1200 el problema volvía tal cual, porque la escena se pinta con
  `object-fit: cover` y **el borde de su masa luminosa no vive en un píxel fijo sino en una fracción
  del ancho** (34-37% en todo el rango medido). Un tope proporcional (`min(800px, 58vw)`) sí vale en
  todo el rango. Y por debajo de `md`, donde las columnas se apilan a ancho completo, ningún tope
  ayuda: ahí quien resuelve es el velo de la viñeta de la escena, que sube en ese régimen.
- **Cómo evitarlo:** para texto sobre arte, medir el **peor píxel** del rectángulo de cada pieza,
  nunca la media, componiendo las capas reales con el mismo `cover`/`overscan` de producción. Antes
  de dar por bueno un umbral en píxeles, comprobarlo en al menos dos anchos que caigan a distinto
  lado del `max-width` del contenedor: si el número solo vale en uno, la magnitud correcta era una
  proporción.

## 2026-08-03 — La captura del panel no ve ningún subárbol `sticky` tras un scroll programático

- **Qué pasó:** tras publicar el arte nuevo del fondo de Story, la captura de pantalla del panel a la
  altura de la sección devolvía un rectángulo de color plano — ni la escena, ni el texto de la
  diapositiva, nada. El DOM decía justo lo contrario en ese mismo instante: stage pegado en
  `y=0` midiendo 1280×720, las 11 capas con `naturalWidth` 1280 y `opacity: 1`, la diapositiva 0 en
  `data-state="current"` con `opacity: 1`, `--story-enter` a 1 y `--story-progress` avanzando. El
  color plano era el `background-color` del propio stage: se pintaba el contenedor y no su contenido.
- **Por qué NO era un defecto de la entrega:** el control lo descarta en una llamada — **Journey**,
  una sección que no se había tocado y que usa la misma técnica (pin por `position: sticky` + capas
  con `mix-blend-mode`), sale igual de vacía en la misma sesión. Y la captura a `scrollY` 0, con el
  hero, sale perfecta: el problema aparece al combinar scroll programático con un subárbol promovido
  a capa de compositor. Quitar `will-change` a mano no lo arregla, así que no basta con despromover.
- **Cómo evitarlo:** una captura vacía de este panel **no es evidencia de nada** mientras no se
  ejecute el control (capturar una pieza equivalente que se sepa buena — otra sección con la misma
  técnica, o la misma página a scroll 0). Es la misma familia que la lección del 2026-07-31 sobre el
  resultado negativo de `getComputedStyle`. Y para ver de verdad un fondo compuesto por capas, la vía
  que sí funciona es una **sonda `position: fixed` a scroll 0**: se monta a mano un apilado a pantalla
  completa con las imágenes REALES ya desplegadas, replicando `isolation: isolate` y el
  `mix-blend-mode` de producción. Eso verifica exactamente lo que se quería verificar (que esos bytes
  componen esa imagen en un navegador real), se revierte con una recarga y no toca el repo.

## 2026-08-02 — Un test de reproducibilidad de un pipeline demuestra el FILTRO, no la calidad

- **Qué pasó:** para publicar la escena nueva de Features había que reproducir el pipeline de
  WebP del repo. El manifest de `journey-cosmic-portal` lo documenta con precisión —
  "Pillow: `Image.resize(LANCZOS)` → `save WEBP quality=85 method=6`" — así que se probó ese
  triplete contra un activo que NO cambia (los 10 WebP máster de la escena saliente de
  Features, recodificados y comparados por sha256 contra los 20 desplegados). Resultado:
  **0/20**. Barriendo la calidad, `q=90` con el mismo filtro y el mismo `method` da **20/20
  byte a byte**.
- **Por qué:** el manifest de Journey documenta la calidad **de Journey**, y su propio texto lo
  dice ("Lo unico que cambio respecto a aquella fue la calidad, 90 → 85"). Lo que es común a
  todas las escenas del repo es el filtro de reescalado y el `method`; la calidad se eligió
  escena por escena, midiendo la curva peso/PSNR sobre el COMPUESTO. Leer el manifest de una
  escena como si describiera "el pipeline del repo" mezcla el parámetro compartido con el
  parámetro local.
- **Cómo evitarlo:** el test contra un activo inmutable sigue siendo obligatorio y sigue siendo
  el que da la respuesta — pero se interpreta como "esto fija el filtro y el `method`", no
  "esto fija los tres". La calidad se decide midiendo la curva sobre el arte nuevo (aquí: q85,
  rodilla real, +224 KiB por +0.62 dB si se sube a q90) y se escribe en el manifest DE ESA
  escena. Si el barrido no reproduce a ninguna calidad, entonces sí hay que sospechar del
  filtro o del `method`.

## 2026-08-02 — Un margen negativo sobre un elemento `sticky` AMPLÍA su rectángulo de restricción

- **Qué pasó:** para que la escena de Features (un slot pegado de una pantalla de alto) y el
  contenido de la sección se superpusieran, el primer diseño ponía
  `margin-block-end: calc(-1 * 100dvh)` sobre el slot, de modo que devolviera al flujo la
  pantalla que ocupa y el contenido empezara en el borde superior de la sección.
- **Por qué está mal:** un elemento `sticky` está confinado a su bloque contenedor **ajustado
  por su propio margen**. Un margen inferior NEGATIVO no solo recoloca al hermano siguiente:
  corre hacia abajo el límite de viaje del propio pegado, así que el slot podía seguir pegado
  una pantalla MÁS ALLÁ del final de la sección y pintar sobre la sección siguiente (Contact).
  Es un fallo que no da error, no rompe ningún test y solo se ve al scrollear hasta el final
  de la sección.
- **Cómo evitarlo:** para superponer dos hijos sin tocar sus cajas, `display: grid` en el padre
  y `grid-area: 1 / 1` en los dos — el recurso que este repo ya usaba en `ScJourneySlide`. Los
  márgenes negativos se reservan para mover cajas en flujo (el solape ENTRE secciones, que sí
  es un `margin-block-start` negativo sobre un elemento no pegado). Verificación que lo cierra:
  medir `slotBottom` contra `sectionBottom` en el último tramo de scroll; tienen que coincidir.

## 2026-08-02 — Un inventario de ficheros escrito desde una tabla de shell recortada miente

- **Qué pasó:** la spec declaraba que la escena saliente eran "3 ficheros" y la instrucción del
  subagente decía "4". Eran **5** (los 3 de código, más `featuresCelestialGuide.layers.test.ts`
  y `FeaturesCelestialGuide.test.tsx`). El `git rm -r` los cubrió igual, pero uno de esos dos
  tests no tenía equivalente asignado a ningún flujo y su cobertura se habría perdido en
  silencio.
- **Por qué:** el inventario se escribió a partir de un `Get-ChildItem ... | Format-Table`
  cuya columna `FullName` venía **truncada con puntos suspensivos**, de modo que varias filas
  parecían la misma entrada. Una salida recortada por presentación se leyó como si fuera la
  lista completa.
- **Cómo evitarlo:** para inventariar un directorio del que se va a hablar en una spec o en una
  instrucción, listar con una forma que no pueda recortar (`Select-Object -ExpandProperty
  FullName`, `ls` de Bash, o `git ls-files <dir>`) y contar el resultado. Y al borrar un
  directorio, comprobar explícitamente qué TESTS se van con él y a quién se le asigna
  reescribirlos.

## 2026-07-28 — `git checkout --` NUNCA es el "deshacer" de un experimento sobre un árbol sin commitear

- **Qué pasó:** para validar un test de regresión con el bug inyectado, se editó
  `Features.tsx` (quitar una línea), se vio el test en rojo, y se "restauró" con
  `git checkout -- Features.tsx`. El archivo entero estaba SIN COMMITEAR (reescritura completa
  de un flujo paralelo de esta misma entrega): checkout lo devolvió a la versión de HEAD y
  borró todo el trabajo nuevo, no solo la línea del experimento.
- **Por qué:** `checkout --` restaura al último commit, no al estado previo a "mi" edición.
  Sobre un árbol limpio ambos coinciden y el hábito parece seguro; sobre un árbol con trabajo
  sin commitear son cosas radicalmente distintas. Es la misma clase de riesgo que la lección
  del DoD (2026-07-26): el valor de una sesión vive en el árbol hasta el commit, y cualquier
  comando que "restaura desde git" lo pisa.
- **Cómo se recuperó:** el archivo completo estaba leído en el contexto de la revisión (leer
  el diff entero línea a línea no es ceremonia: esta vez fue la copia de seguridad). Se
  reescribió idéntico y se verificó contra los tests intactos en disco + tsc + eslint +
  medición en navegador igual a la previa al incidente.
- **Cómo evitarlo:** un experimento de bug inyectado se deshace INVIRTIENDO la edición
  concreta (o copiando el archivo a un lado antes: `cp x x.bak`), jamás con
  `git checkout`/`git restore`. Antes de CUALQUIER comando que restaure desde git, mirar
  `git status` del archivo: si está modificado/untracked, ese comando destruye trabajo. Y
  commitear pronto por fases reduce la ventana en la que este error es posible.

## 2026-07-28 — Una altura porcentual del mockup presupone el alto fijo de SU contenedor

- **Qué pasó:** el mockup de Features declara las figuras a `height: 96%/92%` dentro de
  tarjetas con `height: 300px`. Al portarlo, la tarjeta nuestra dimensiona por contenido, y
  un porcentaje contra un padre cuyo alto depende a su vez del hijo es una dependencia
  circular: las tarjetas se inflaron hasta ~620px (el doble del diseño). jsdom no puede verlo
  (no hace layout); solo apareció midiendo `getBoundingClientRect` en navegador real.
- **Cómo evitarlo:** al transcribir un valor relativo (%) de un mockup, transcribir TAMBIÉN la
  medida absoluta de la que depende, o congelar directamente el resultado que el mockup
  calculaba (aquí 288/276px). Y toda geometría portada de un mockup se verifica con
  `getBoundingClientRect` en navegador, nunca solo con la suite: los cuatro defectos reales
  de esta entrega (circularidad del %, `svg { width: 100% }` global estirando iconos,
  `object-fit: cover` global recortando figuras, `as` vs `forwardedAs` en styled(Typography))
  eran invisibles para jsdom y los cuatro salieron de la misma pasada de medición.

## 2026-07-28 — En el panel oculto tampoco disparan IntersectionObserver ni loading=lazy

- **Qué pasó:** al verificar el reveal por scroll en el dev server, ni un solo
  `IntersectionObserver` llegó a disparar (sonda sobre un elemento `position: fixed` visible:
  0 callbacks) y ninguna imagen `loading="lazy"` cargó, incluso con scroll programático
  (que además exige `scroll-behavior: auto`: el smooth nunca progresa sin frames).
- **Por qué:** misma causa raíz que las lecciones de rAF y de las animaciones sin `startTime`
  (2026-07-26/27): IO y lazy-load están ligados a los pasos de render, y este panel no
  compone frames. Tercera superficie de la misma familia.
- **Cómo evitarlo:** para verificar carga de assets, `fetch` directo (status + bytes) y
  forzar `img.loading = "eager"` + `decode()` antes de medir geometría. Para el reveal,
  aceptar que el efecto compuesto solo lo verá un humano: atarlo con tests (IO mockeado) y
  registrarlo como QA visual pendiente, no fingir que se vio.

## 2026-07-27 — Dos animaciones CSS sobre la misma propiedad SÍ conviven: gana la última de la lista

- **Qué pasó:** la lección del 2026-07-26 (justo debajo) cerró correctamente que una `@keyframes`
  sobre `opacity` impide que una `transition` sobre `opacity` del mismo elemento **llegue a
  existir**. De ahí se dio por hecho lo contrario de lo que es cierto: que el escalonado por capa
  del ojo era imposible sin mover el glow a otro elemento o envolver cada capa en un div con
  opacidad (que rompe el `mix-blend-mode` aditivo). Las dos salidas eran malas y bloquearon el
  escalonado del ojo durante toda una entrega, dejándolo como un fundido uniforme.
- **Lo que en realidad ocurre** (medido en Chromium, reloj conducido con `Animation.currentTime`):
  el conflicto es entre **animación y transición**, no entre dos animaciones. Dos `@keyframes`
  sobre la misma propiedad del mismo elemento conviven, y **gana la que aparece ÚLTIMA en
  `animation-name`**. Con la entrada declarada al final: `fill: backwards` sostiene su `from`
  durante el retardo (medido `0` a t=100 con delay 220), interpola (`0.5` a mitad), y al terminar
  con `fill: none` **el control vuelve al glow infinito** (`0.851`). Con `fill: forwards` sostiene
  el valor final contra la infinita indefinidamente. Control negativo: invirtiendo el orden
  (`pIn, pGlow`) el valor queda clavado en el del glow — el orden es lo que decide.
- **Cómo evitarlo:** cuando una propiedad ya está tomada por una `@keyframes`, la salida no es
  mudar el efecto a otro elemento: es declarar el efecto nuevo **también como animación**, última
  de la lista. Y en general: una restricción medida («la transición no se crea») acota exactamente
  lo que se midió, no la familia entera de mecanismos. Antes de rediseñar la arquitectura alrededor
  de un bloqueo, medir el mecanismo ALTERNATIVO — cuesta una sonda de veinte líneas.
- **Detalle que importa:** los `@keyframes` del escalonado necesitan `from` **Y** `to` explícitos.
  Con un fotograma implícito, el endpoint se resuelve contra el valor subyacente (el del glow) y la
  curva depende de en qué punto de su respiración esté la capa: medido `0.422` a mitad de recorrido
  en vez de `0.5`.

## 2026-07-27 — En pestaña oculta las animaciones CSS no reciben `startTime`: hay que conducir el reloj a mano

- **Qué pasó:** dos sondas seguidas en el mismo navegador dieron resultados contradictorios. La
  primera midió una progresión coherente (`0.5`, `0.72`, glow retomado); la segunda, con la misma
  mecánica pero disparando la animación al cambiar un `data-state`, devolvió el valor inicial
  **congelado** en todos los instantes muestreados. Se llegó a atribuir a los fotogramas
  implícitos, que no tenían nada que ver.
- **Por qué:** este entorno corre con `document.hidden === true` de forma permanente. Una animación
  creada por un cambio de estilo en una pestaña oculta no recibe `startTime` —no hay frames que se
  lo asignen—, así que se queda en su fase inicial para siempre y `getComputedStyle` devuelve el
  valor de `fill: backwards`. Es la MISMA causa raíz que la lección del `requestAnimationFrame`
  (2026-07-26), en otra superficie: allí una promesa no resolvía nunca, aquí un reloj no arranca
  nunca.
- **Cómo evitarlo:** en este entorno, **ninguna medición de movimiento por muestreo con `setTimeout`
  es fiable**. Se conduce el reloj a mano: `el.getAnimations().forEach(a => a.currentTime = t)`
  fuerza el recálculo de estilo y es determinista y reproducible. Para verificar el estado FINAL de
  una secuencia, saltar todas las animaciones del documento a un `currentTime` grande y leer. Y
  cuando dos mediciones del mismo mecanismo se contradicen, sospechar del INSTRUMENTO antes que de
  la hipótesis.

## 2026-07-27 — jsdom no evalúa NINGÚN `@media`: un guard de reduced-motion no se puede verificar con `getComputedStyle`

- **Qué pasó:** al añadir a `auraStagger()` el guard de `prefers-reduced-motion` que le faltaba
  para el estado `pending`, el test que debía atarlo pasaba en verde **con el bug y sin él**:
  `getComputedStyle(...).opacity` devolvía `"0"` en los dos casos.
- **Por qué:** se comprobó con un experimento de control —una regla dentro de
  `@media (min-width: 0px)`, universalmente verdadera en cualquier navegador real— y **tampoco se
  aplicó**. jsdom no evalúa condiciones de media query en absoluto al calcular estilos; no es una
  particularidad de `prefers-reduced-motion`. La lección de 2026-07-25 ya decía que jsdom «resuelve
  las reglas inyectadas», lo que se leyó como que las resolvía TODAS.
- **Cómo evitarlo:** cualquier regla dentro de un `@media` se ata inspeccionando el CSS inyectado
  (`document.styleSheets`) y comprobando el texto del bloque —incluida la lista de selectores—,
  nunca con `getComputedStyle`. Y como ese test verifica texto y no comportamiento, hay que
  ejecutarlo **con el bug inyectado a propósito** para confirmar que se pone rojo: aquí se hizo
  (quitar `[data-state="pending"]` de la lista → rojo; restaurar → verde). La pregunta de cascada
  que jsdom no puede responder («¿gana el bloque del media query al `opacity: 0` de arriba?») se
  responde en navegador real replicando la estructura con un media query trivialmente verdadero y
  su control negativo: **con** el selector → `1`, **sin** él → `0`.

## 2026-07-27 — Un estado que solo existía en un camino se vuelve un bug al reutilizar la máquina en otro

- **Qué pasó:** la coreografía de carga se implementó reutilizando la máquina del cambio de tema:
  el fondo pasa a arrancar en `"pending"` en vez de en `"active"`. `auraStagger()` declaraba
  `[data-state="pending"] { opacity: 0 }` y su bloque de `prefers-reduced-motion` cubría solo
  `active` y `leaving`. Ese hueco era inofensivo mientras `pending` solo existía a mitad de un
  cambio de tema; con la carga arrancando ahí, bajo `reduce` el fondo pastel quedaba **invisible
  hasta que resolvía el `decode()`** (~650 ms) y después aparecía de golpe — y como la máquina de
  fases bajo `reduce` va directa a `settled`, el texto ya estaba visible sobre el fondo desnudo.
  Justo el destello que `reduce` existe para evitar. `eyeStagger()`, escrito en la misma entrega,
  sí cubría los tres estados: las dos composiciones divergían.
- **Por qué no lo cazó nadie:** los tres subagentes que tocaron esos archivos verificaron su propio
  flujo, y la suite entera quedó verde — el hueco no era un fallo de ninguna pieza, era una
  interacción entre el cambio de una (la carga arranca en `pending`) y una omisión preexistente de
  otra. Y jsdom no puede verlo (lección de arriba).
- **Cómo evitarlo:** al **reutilizar** una máquina de estados para un camino nuevo, enumerar los
  estados que ese camino ahora alcanza y que antes no alcanzaba, y revisar TODOS los guards
  (`prefers-reduced-motion`, `forced-colors`, `print`) contra esa lista nueva — no solo los que
  el camino nuevo ejercita de forma feliz. Y cuando dos implementaciones hermanas cubren el mismo
  contrato (aquí `auraStagger`/`eyeStagger`), compararlas lado a lado: la divergencia entre ellas
  es la señal más barata de que a una le falta algo.

## 2026-07-26 — Una `@keyframes` sobre una propiedad impide que su `transition` llegue a existir

- **Qué pasó:** el plan era escalonar por capas las dos composiciones del fondo del hero. Las
  capas del ojo ya animan `opacity` con `@keyframes` (la respiración de la corona). Medido con
  una sonda en el navegador real —elemento con `transition: opacity 5000ms`, `animation` de
  opacidad y un cambio de clase—: la opacidad computada es la de la ANIMACIÓN, y
  `getAnimations()` devuelve **solo la `CSSAnimation`**. No es que la transición pierda: **no
  se crea**.
- **Por qué importa:** el `transition-delay` habría quedado escrito en la hoja de estilos,
  inspeccionable y aparentemente correcto, sin ningún efecto. Un test que aseverase ese retardo
  pasaría en verde describiendo algo que no ocurre.
- **Cómo evitarlo:** antes de escribir una `transition` sobre una propiedad, comprobar si algún
  `@keyframes` del mismo elemento ya la toca — en un componente con estilos repartidos entre
  varios archivos eso no se ve leyendo uno solo. La herramienta correcta para verificarlo es
  `getAnimations()`, no `getComputedStyle`: la segunda da un número plausible, la primera dice
  si la transición existe siquiera. Cuando dos efectos necesitan la misma propiedad del mismo
  elemento, uno de los dos tiene que mudarse a otro elemento.

## 2026-07-26 — Un guard que ignora «el primer evento» falla cuando ese evento puede no ocurrir

- **Qué pasó:** el fondo del hero no debe animar el ajuste de tema que hace `ThemeProvider` al
  hidratar. Se descartó con un contador local: «ignora el primer cambio que veas». Funciona para
  quien tiene tema guardado. Para quien **no tiene nada guardado** no hay ajuste de hidratación,
  así que el comodín seguía intacto y **se lo comía su primer toggle real** — el visitante nuevo,
  que es el caso mayoritario, y el momento exacto para el que existía la coreografía.
- **Por qué:** el guard estaba en el consumidor, que solo ve el resultado (`themeName` cambió),
  no la causa. «El primero que llegue» es una heurística sobre el orden, y el orden no es fiable
  cuando uno de los dos eventos puede no producirse.
- **Cómo evitarlo:** cuando un consumidor necesita saber **por qué** cambió un valor, esa
  información la publica quien conoce la causa —aquí `ThemeProvider`, con un `changeSource`—, no
  se reconstruye aguas abajo. Y todo guard que cubra un caso de arranque necesita un test con el
  **arranque limpio**: todos los tests del cruce fijaban `localStorage` antes de renderizar, que
  es justo la rama donde el bug no aparece.

## 2026-07-26 — La pestaña oculta no dispara `requestAnimationFrame`: cualquier `await` sobre rAF necesita tope

- **Qué pasó:** la máquina del cruce esperaba `decode()` **con** una carrera contra un
  temporizador (previsto: una promesa que no resuelve nunca dejaría el tema anterior pegado sin
  lanzar error) y justo después esperaba un `requestAnimationFrame` **sin** ninguna protección.
  En una pestaña oculta el navegador no dispara rAF: esa promesa no se resolvía jamás y el cruce
  se quedaba en `"pending"` — fondo entrante invisible, saliente a la vista. Medido en este
  entorno, que corre con `document.hidden === true` de forma permanente: 0 disparos en 500 ms.
- **Por qué costó verlo:** el modo de fallo ya estaba identificado y mitigado **un `await` más
  arriba**. Se protegió la promesa de la que se sospechaba y se dio por segura la siguiente,
  que era de la misma familia.
- **Cómo evitarlo:** en una cadena de promesas donde una ya necesitó tope por poder no
  resolverse, revisar **todas** las demás con el mismo criterio, no solo la sospechosa. Y
  distinguir qué esperas son condición de corrección y cuáles son mejoras: el frame de margen
  solo alinea el arranque con el pintado, así que perderlo es aceptable y colgarse no —esa
  asimetría es la que justifica la carrera.

## 2026-07-26 — Sustituir un test exige medir ANTES los dos modos de fallo, no solo el nuevo

- **Qué pasó:** en la revisión de `Aura.test.tsx` se sustituyó una aserción de blending
  basada en `getComputedStyle(img).mixBlendMode || CONSTANTE` por otra que lee
  `document.styleSheets`, justificándolo por escrito como que la primera «pasaría igual de
  verde tanto si la regla existe como si no». Se verificó que la NUEVA falla al inyectar
  `mix-blend-mode: plus-lighter` a mano — pero **no se verificó que la vieja no fallara**.
  El autor original lo comprobó y la vieja también falla: el `||` solo actúa cuando el valor
  computado es cadena vacía; con una regla real, `getComputedStyle` devuelve `"plus-lighter"`
  y la comparación revienta igual. La justificación escrita era falsa y se revirtió.
- **Por qué:** medir solo el lado que confirma la hipótesis. Se ejecutó el experimento que
  demostraba «la nueva funciona» y se dio por hecho el complementario, «la vieja no», que era
  justo el que sostenía la decisión de sustituirla.
- **Cómo evitarlo:** un test solo se sustituye por otro cuando se han ejecutado **los dos**
  contra el mismo bug inyectado y se ha visto al viejo pasar en verde mientras el nuevo falla.
  Si el viejo también falla, lo que queda es una preferencia de estilo, no una corrección — y
  entonces no se toca el trabajo de otro. Aplica igual a los subagentes: reescribir el
  artefacto de otro flujo sin esa prueba doble genera exactamente el conflicto de escrituras
  que `CLAUDE.md §9` advierte para sesiones paralelas.

## 2026-07-26 — currentColor puede heredar del ThemeProvider ambiental, no del contextual

- **Qué pasó:** el icono del navbar (`Logo`, `fill: currentColor`) se leía casi invisible
  en UNA sola combinación de estado: tema ambiental claro + barra sin scroll. `Logo.tsx` no
  fija su propio `color`; `ScBrandLink` tampoco. Sin ancla, heredaba desde `body`, que
  resuelve contra el `ThemeProvider` AMBIENTAL de la página — no contra `barTheme`, el tema
  oscuro que `Navbar.tsx` fuerza mientras flota transparente. Los dos temas COINCIDEN en tres
  de cuatro combinaciones, así que el bug sobrevivió varias sesiones (todas arrancadas en el
  tema por defecto).
- **Por qué:** el contexto de React (`ThemeProvider`) y la cascada de CSS (`currentColor`,
  herencia) son dos árboles distintos que solo coinciden si algo en medio los reconecta con
  una declaración `color` real. `BrandName` lo hacía (arreglo local, protegía solo a
  BrandName); `Logo` no.
- **Cómo evitarlo:** cuando dos `ThemeProvider` anidados pueden divergir (uno ambiental, uno
  contextual forzado), fijar `color` explícito en el CONTENEDOR que los separa, no confiar
  en que cada consumidor de `currentColor` lo redeclare por su cuenta. Y verificar TODAS las
  combinaciones de estado que los separan (aquí: 2 temas × 2 estados de scroll), no solo el
  estado por defecto de la sesión de desarrollo — con 3 de 4 coincidiendo, la probabilidad de
  detectarlo a ojo es baja.

## 2026-07-26 — `background: valor` en :hover resetea background-image aunque no lo mencione

- **Qué pasó:** el CTA primario del hero perdía su degradado animado justo al pasar el
  cursor. La causa no estaba en el degradado: `Button.tsx` declara en su variante `solid`
  `&:hover:not(:disabled) { background: color-mix(...) }`. `background` es la propiedad
  ABREVIADA: al escribirla, TODAS sus sub-propiedades (`background-image`,
  `background-position`, `background-size`...) vuelven a su valor inicial salvo la que se
  especifica explícitamente. El hover no tocaba `background-image` a propósito — lo
  reseteaba a `none` como efecto colateral de usar el shorthand.
- **Por qué costó verlo:** el degradado se declaraba correctamente en otro componente
  (`styled(Button)`, capa aditiva por composición), así que "el código que pinta el
  degradado" nunca cambió. El bug estaba en un componente que el CTA ni siquiera toca a
  propósito — Button.tsx no sabe que existe un degradado, solo pisa una propiedad que
  comparte por casualidad de sintaxis abreviada.
- **Cómo evitarlo:** al añadir una capa aditiva sobre un componente base (`styled(Base)`),
  revisar TODOS los estados del base (`:hover`, `:focus`, `:active`, `:disabled`) buscando
  shorthands (`background`, `border`, `font`, `transition`) que puedan resetear sub-propiedades
  que la capa nueva depende de mantener. Si el conflicto existe, reafirmar la sub-propiedad
  con el MISMO selector exacto que usa el base (misma especificidad) dentro de la capa
  aditiva: como `styled(Base)` se inyecta después del propio `Base` (medido en este repo,
  mismo patrón para `styled(Typography)` y `styled(Button)`), el empate lo gana la capa
  aditiva por orden de inserción — sin `!important`, sin tocar el componente base.
- **Cómo verificarlo sin cursor real:** este entorno no compone frames, así que `:hover` no
  se puede disparar de verdad. Se verifica leyendo el CSSOM que el propio navegador ya
  parseó (`document.styleSheets`), localizando las dos reglas por su selector exacto y
  comprobando el orden de aparición en el texto — determinista por spec, no una suposición.

## 2026-07-26 — Un plan de pruebas heredado puede describir un estado ya superado del repo

- **Qué pasó:** tres testers independientes de la misma ronda recibieron un plan de pruebas
  que daba por bloqueantes cuatro hallazgos (código sin commitear, spec ausente, Registro
  ausente, mayoría del trabajo sin cerrar) que la revisión del Tech Lead **ya había resuelto
  antes de que el testing arrancara** (mismo HEAD `5096b17`, verificado con `git status`,
  `git log` y lectura directa de los archivos del vault). Los tres reportaron el mismo bug
  menor por separado en vez de confiar ciegamente en el plan recibido.
- **Por qué:** en un flujo con varias rondas de consolidación (implementación → revisión del
  Tech Lead → testing → gate), un plan de pruebas escrito antes de la última consolidación
  queda desactualizado si el testing no reverifica el estado real del repo antes de ejecutar
  los casos. El plan no miente por mala fe, describe una fotografía que el propio pipeline
  movió después de tomarla.
- **Cómo evitarlo:** todo tester (humano o agente) reverifica `git status`/`git log` y el
  contenido real de los artefactos citados en su plan de pruebas ANTES de reportar un hallazgo
  como bloqueante — nunca asume que la fotografía del plan sigue vigente. Si el hallazgo ya no
  reproduce contra el estado actual, se reclasifica como bug de proceso desactualizado, no como
  defecto de producto vigente, y se deduplica entre testers en vez de repetirse tres veces.

## 2026-07-26 — El DoD no está cumplido hasta que el árbol de trabajo está vacío

- **Qué pasó:** una entrega completa y funcionalmente correcta (Logo compartido, IconButton,
  cambio de convención sol/luna, degradado animado del título, CTAs animados) quedó con 10
  archivos modificados y 6 sin trackear **sin un solo commit** en la rama, pese a que el código
  en sí ya cumplía el encargo al detalle. Tres testers independientes lo reportaron por
  separado como el hallazgo más severo de la entrega — más que cualquier defecto de código.
- **Por qué:** el trabajo se dio por "hecho" en el momento en que el código funcionaba y los
  tests pasaban en el árbol de trabajo, sin completar la fase de cierre (commit + registro en
  el vault + spec). Un DoD que solo mira "¿el código es correcto?" y no "¿queda un registro
  verificable de que existe?" dejaba todo el valor de la sesión en riesgo de perderse con un
  `git checkout` o un crash — exactamente lo que la sección 3 del CLAUDE.md global exige
  comprobar ("Registro de sesión hecho") y que aquí no se comprobó.
- **Cómo evitarlo:** el DoD de CUALQUIER tarea que toque el repo termina en `git status --short`
  vacío (o explícitamente en un estado intermedio anunciado como tal) y con la entrada del
  vault escrita, no en "los tests pasan". Antes de reportar una tarea como cerrada: `git status`
  primero, y si hay algo sin commitear, esa es la primera línea del informe, no una nota al
  pie. Ya existía un precedente idéntico un día antes (revisión del Tech Lead 2026-07-25,
  DOD-8) — la lección de esa sesión no se generalizó a "todo flujo termina con commit", se leyó
  como un incidente puntual de esa rama.

## 2026-07-25 — Backticks dentro de un template de styled-components

- **Qué pasó:** TRES veces en la misma sesión, un comentario CSS escrito DENTRO de un
  `styled.div\`...\`` citaba identificadores con backticks (`` `screen` ``, `` `line-height` ``).
  El backtick cierra el template literal: el build de Turbopack falló con "Expected a
  semicolon" y esbuild con "Expected } but found screen", ambos apuntando al comentario.
- **Por qué:** el hábito de citar con backticks viene de Markdown y de los comentarios
  JSDoc, donde es correcto; dentro de un template literal es sintaxis, no prosa.
- **Cómo evitarlo:** en comentarios `/* */` dentro de un template de styled-components,
  nombrar las propiedades sin comillas de ningún tipo. Si el comentario necesita citar
  código, sacarlo fuera del template, encima del `const`.

## 2026-07-25 — Blending y contextos de apilamiento

- **Qué pasó:** al montar capas con `mix-blend-mode` aditivo se estuvo a punto de envolver
  cada imagen en un `div` transformado por el rAF del parallax.
- **Por qué:** cualquier elemento que crea contexto de apilamiento (y `transform` lo crea)
  aísla el blending de sus hijos: la imagen se habría sumado contra un grupo vacío. No da
  error, solo bordes sucios donde las máscaras tienen feathering — un fallo silencioso.
- **Cómo evitarlo:** `mix-blend-mode` y el `transform` que se anima van en el MISMO
  elemento, hijo directo del contenedor con `isolation: isolate`. Si además hace falta una
  animación ambiental, animar `opacity` (no `transform`), que es la otra propiedad de
  compositor y no colisiona con lo que escribe el rAF.

## 2026-07-25 — Separar una imagen radial en capas para parallax

- **Qué pasó:** al separar el ojo cósmico del hero en capas con transiciones puramente
  radiales desde el centro, las líneas nítidas de los párpados (que pasan cerca del
  centro por arriba y abajo) quedaban partidas entre capas, y un corte radial mal
  calibrado (r 430-560, mayor que la semialtura del interior del ojo) dejaba una capa
  casi vacía.
- **Por qué:** las máscaras radiales ignoran la semántica de la imagen; los radios se
  eligieron a ojo en lugar de medirse.
- **Cómo evitarlo:** particionar jerárquicamente (regiones semánticas primero —
  interior/contorno/fondo —, radial después solo dentro de cada región) y calibrar
  cada corte con el perfil radial de luminancia medido, situándolo en zonas de
  contenido difuso. Verificar recomponiendo la pila (partición de la unidad +
  blending aditivo → RMS contra el original) y revisando cada capa aislada, no solo
  el composite.

## 2026-07-25 — Un degradado de continuidad puede crear la costura que venía a borrar

- **Qué pasó:** la capa que une el hero negro con Story interpola de `oklch(0 0 0)` a
  `semantic.bg`. En tema oscuro `semantic.bg` es `oklch(0.22 0.004 286)`, **más claro** que
  el borde superior del póster que Story pinta debajo. Pintada opaca, la capa habría dejado
  una banda gris sobre la escena: exactamente el artefacto que iba a eliminar.
- **Por qué:** «terminar en el fondo de la sección» solo es honesto si el fondo de la
  sección es lo que realmente se ve ahí. Cuando debajo hay otra capa (un póster, un canvas),
  el extremo del degradado no coincide con el píxel de destino.
- **Primer intento, y por qué era falso:** se tapó el tramo claro con `mask-image` opaca
  hasta el 45%, y se escribió que «el resultado compuesto es negro que se apaga». **No lo
  era.** Con alfa 1 hasta el 45%, los primeros 2,7rem se pintaban OPACOS con un gris que
  sube hasta ~L 0.10, por encima del ~L 0.05 del póster: un realce justo debajo de la junta
  — el mismo artefacto — más una discontinuidad de pendiente de la alfa en el 45%,
  candidata a banda de Mach. La máscara **es** una parada intermedia, justo lo que el propio
  QA prohibía.
- **Cómo evitarlo:** un velo de continuidad se escribe como **una sola rampa monótona de un
  color a alfa 0** (`linear-gradient(to bottom, <negro> 0%, transparent 100%)`), que compone
  `L(p) = p × lo-que-haya-debajo`: solo puede oscurecer, nunca aclara, no necesita máscara
  ni prefijos de fabricante. NO se interpola «hacia el token de fondo de la sección de
  destino»: ese token casi nunca es el píxel real que hay ahí (debajo puede haber un póster
  o un canvas). Y antes de dar por buena una mitigación, **calcular el compuesto punto a
  punto**: si el comentario dice «se apaga» y la aritmética dice «sube y luego baja», manda
  la aritmética. Test que lo ata: comparar la claridad de cada parada opaca contra la de lo
  que se pinta debajo (`Story.test.tsx`).

## 2026-07-25 — Añadir una clave a un objeto de tokens rompe los tests que lo cierran

- **Qué pasó:** añadir `proseTight` a `src/theme/tokens/grid.ts` rompía dos aserciones ya
  existentes en `src/theme/tokens/system.test.ts`: un `expect(grid).toEqual(expectedGrid)` y
  un `expect(Object.keys(grid)).toHaveLength(4)`.
- **Por qué:** son tests de contrato cerrado, escritos a propósito para que ninguna clave
  entre sin revisión. Funcionan: el fallo es la señal, no el problema.
- **Cómo evitarlo:** quien añade la clave actualiza `system.test.ts` **en el mismo commit**,
  subiendo el conteo y añadiendo la aserción de valor de la clave nueva. No se relaja la
  aserción (nada de `toMatchObject` ni de quitar el `toHaveLength`): se actualiza la fuente
  de verdad y el candado se queda igual de fuerte.

## 2026-07-25 — Qué resuelve y qué no resuelve `getComputedStyle` en jsdom

- **Qué pasó:** se dio por hecho que verificar CSS de styled-components en tests requería
  `jest-styled-components`. Medido en este repo: **no**. jsdom + styled-components v6
  resuelven las reglas vía `window.getComputedStyle` y devuelven los valores **tal como se
  escriben** (`height` → `"6rem"`, `font-size` → `"0.6875rem"`, `color` →
  `"oklch(0.985 0 286)"`, `background-image` con sus paradas `oklch()` intactas), y también
  resuelven `> *:nth-child(N)`.
- **Por qué:** jsdom implementa la cascada sobre las reglas inyectadas; lo que no hace es
  expandir shorthands ni conocer propiedades con prefijo de fabricante.
- **Cómo evitarlo:** (a) asevera sobre `getComputedStyle` comparando contra el **token
  importado**, nunca contra un string escrito a mano; (b) la shorthand `animation:` NO se
  expande — asevera `animationDelay`, jamás `animationName`, que sale vacío; (c) las
  propiedades `-webkit-*` NO aparecen en el estilo computado, pero sí sobreviven en el
  `cssText` de la regla inyectada (`document.styleSheets`), que es donde hay que buscarlas.
  Cero dependencias nuevas.

## 2026-07-25 — `styled(Typography)` gana la cascada del color

- **Qué pasó:** se planificó un `&& { color: ... }` por si el `color` de un
  `styled(Typography)` perdía contra el `color` que el propio `ScTypography` declara.
- **Por qué:** styled-components v6 inyecta el componente envolvente **después**, así que su
  regla gana con la misma especificidad. Verificado por medición en este repo: un
  `styled(Typography)` con `color: oklch(0.5 0.5 100)` computa exactamente ese color.
- **Cómo evitarlo:** no escribir `&&` ni `!important` «por si acaso». Duplicar especificidad
  sin haber medido el conflicto es deuda que nadie se atreve a quitar después.

## 2026-07-25 — `createGlobalStyle` no inyecta nada bajo jsdom + vitest

- **Qué pasó:** al intentar atornillar con un test la regla
  `:where(section[id]) { scroll-margin-top: var(--nav-height) }` de `GlobalStyles.tsx`, el
  test falló con la hoja de estilos **vacía**. No era el selector ni el `var()`.
- **Por qué:** medido con un `createGlobalStyle` mínimo (`body { margin: 0 }`) renderizado
  con los providers reales: `document.head.innerHTML` queda en `""` y
  `getComputedStyle(document.body).margin` sigue siendo `8px` (el defecto de jsdom).
  styled-components v6.4.4 **sí** inyecta las reglas de los componentes `styled.*` (se ve
  el `<style data-styled="active">` con la clase), pero las de `createGlobalStyle` no
  llegan al documento en este entorno.
- **Cómo evitarlo:** no se escriben tests contra `GlobalStyles`: **todo** lo que vive ahí
  (reset, `--nav-height`, `scroll-margin-top` de las anclas, anillo de foco, colapso de
  duraciones por `prefers-reduced-motion`) es invisible para la suite y solo se verifica en
  navegador. Si un comportamiento necesita cobertura de test, se declara en el componente
  que lo consume, no en el estilo global. Antes de dar por rota una regla porque «el test
  no la ve», comprobar primero si el canal de inyección existe.

## 2026-07-26 — Un atributo de presentación no es un contrato de tamaño

- **Qué pasó:** el átomo `Logo` declaraba su tamaño como atributo `width` del svg. Con
  `GlobalStyles` declarando `svg { width: 100% }` para todo el sitio, ese atributo NUNCA se
  aplicó: los tres consumidores renderizaban el logo al 100% de su contenedor (medido:
  167×184 px en un navbar de 56 px). Y los dos tests que lo cubrían aseveraban
  `toHaveAttribute("width", "1em")`, así que **pasaban en verde con el render roto**.
- **Por qué:** en la cascada CSS, cualquier declaración vence a un atributo de presentación
  — entran con la especificidad más baja que existe. Y una aserción sobre el atributo
  comprueba que el componente *escribe* lo que se le pidió, no que el elemento *mida* lo que
  dice.
- **Cómo evitarlo:** con un reset global en el proyecto, dimensionar SIEMPRE por CSS, no por
  atributo SVG. Y aseverar sobre `getComputedStyle`, que es lo que reproduce el fallo — en
  este repo funciona sin dependencias nuevas (jsdom + styled-components v6 resuelven las
  reglas inyectadas y devuelven el valor tal cual se escribe). Mismo patrón que la lección
  de `css: false`: el test miraba una capa distinta de la que produce el efecto.

## 2026-07-31 — En pestaña oculta, `getComputedStyle` devuelve el valor INICIAL de una transición, no el final

- **Qué pasó:** verificando la geometría del navbar en el navegador, el `<header>` medía
  `transform: matrix(1,0,0,1,0,-8)` con `data-intro="in"` — el valor de `[data-intro="pending"]`,
  que ya no aplicaba. Se mantuvo 24 segundos, así que no parecía una transición a medias.
  Diagnóstico real: `h.getAnimations()` devolvía dos `CSSTransition` en `playState: "running"`
  con `currentTime: 0` y `fill: "backwards"`, y `document.visibilityState === "hidden"`.
- **Por qué:** la lección del 2026-07-27 (en pestaña oculta las animaciones no reciben
  `startTime`) tiene un corolario que no estaba escrito: una transición congelada en
  `currentTime: 0` con relleno `backwards` **impone su valor de PARTIDA al estilo computado**.
  El elemento no está "a mitad": está clavado en el origen, y `getComputedStyle` lo refleja.
  Medir geometría así lee el estado ANTERIOR al cambio y lo hace pasar por el definitivo.
- **Cómo evitarlo:** antes de creerse cualquier medida de un estado post-transición en un panel
  de navegador sin foco, comprobar `document.visibilityState` y `elemento.getAnimations()`. Si
  el reloj está parado, conducirlo a mano: `document.getAnimations().forEach(a => a.finish())`
  para el estado final, o `a.currentTime = p * duracion` para muestrear un punto concreto de la
  curva (así se verificó que `easing.overshoot` baja a 1252px antes de asentar en 1280px). Y
  ojo con el scroll: `window.scrollTo(0, N)` no hace nada con `scroll-behavior: smooth`, porque
  el desplazamiento suave también necesita ese reloj — hay que pasar `behavior: "instant"`.

## 2026-07-31 — Una medida de CSS tras HMR puede venir de la hoja anterior

- **Qué pasó:** con el viewport a 1600px, la barra medía 1280px de ancho en el estado SIN
  scroll, donde debía ocupar los 1600. El CSS leído del DOM en ese mismo momento decía
  `max-width: 100vw` para ese estado. Tras un `location.reload()`, la misma medida daba 1600px.
- **Por qué:** styled-components + Fast Refresh pueden dejar reglas de una generación anterior
  aplicándose a clases con el mismo hash. La hoja que se lee y la que el motor aplica no tienen
  por qué coincidir mientras la página lleva varios ciclos de HMR encima.
- **Cómo evitarlo:** toda verificación de geometría o de cascada en navegador se hace **después
  de una recarga completa**, no sobre la página que lleva media sesión de HMR. Si una medida
  contradice al CSS que se acaba de leer, la primera hipótesis es hoja obsoleta, no un bug en
  el componente: recargar antes de investigar nada más.

## 2026-07-31 — Un ref creado inline en el render hace que el efecto se re-suscriba en cada `setState`

- **Qué pasó:** al endurecer `useStoryDeck` (guarda de reentrada del bucle de rAF + olvidar la
  línea base al parar), dos tests que estaban en verde se pusieron en rojo: `direction` se
  quedaba en `forward` donde antes daba `rewind`. El hook era correcto; el que mentía era el
  test.
- **Por qué:** los tests llamaban `renderHook(() => useStoryDeck(refOf(track), refOf(stage), N))`,
  con `refOf()` **dentro** del callback de render. Cada render devolvía objetos NUEVOS, y como
  el efecto del hook depende de esos refs, se desmontaba y volvía a montarse entero **cada vez
  que el propio hook hacía `setState`**. Con `cancelAnimationFrame` mockeado a un no-op, la
  cadena de rAF de la instancia vieja seguía ejecutándose desde la cola de callbacks pendientes,
  pero contra el estado interno recién reiniciado: un frame extra se consumía en refijar la
  línea base en vez de calcular el delta. En producción nada de esto ocurre — los refs vienen de
  `useRef` y son estables de por vida —, así que el test estaba probando un escenario que no
  existe.
- **Cómo evitarlo:** en `renderHook`, todo lo que el hook reciba y use como dependencia de efecto
  se crea **una vez, fuera del callback de render**, y se pasa por referencia. Y ante un test que
  se pone rojo tras endurecer una implementación, la primera pregunta es "¿el test reproduce
  producción?" antes de tocar la implementación: aquí, revertir la guarda habría devuelto el
  verde y dejado la fuga de rAF dentro.

## 2026-07-31 — `overflow-x: hidden` en `html`/`body` rompe `position: sticky` (y `clip` no)

- **Qué pasó:** antes de escribir una línea de la presentación de Story, la búsqueda previa
  encontró `html, body { overflow-x: hidden }` en `GlobalStyles`. Habría hecho que el pin de la
  presentación no pegara, y el síntoma en pantalla ("sticky no hace nada") no apunta al culpable.
- **Por qué:** declarar `overflow` distinto de `visible` en un eje obliga al eje contrario a
  computar `auto`. Eso convierte a `html`/`body` en **contenedor de scroll**, y un
  `position: sticky` se pega respecto a su contenedor de scroll más cercano, no al viewport. La
  regla general: cualquier ancestro con `overflow` distinto de `visible`/`clip` desactiva el
  sticky de sus descendientes, en silencio y sin error de consola.
- **Cómo evitarlo:** para "recortar sin romper sticky" se usa `overflow-x: clip`, que recorta
  igual pero NO crea contenedor de scroll (Chrome 90+/Firefox 81+/Safari 16+). Y antes de montar
  cualquier pin, se audita la cadena de ancestros buscando `overflow` — incluidos `html`/`body`
  y el contenedor de la propia sección, que aquí también tenía el suyo.

## 2026-07-31 — El panel de navegador deja de recalcular estilos: un resultado NEGATIVO no prueba nada

- **Qué pasó:** verificando el raíl de progreso de la presentación, cambiar `data-slide` a `"3"`
  dejaba la marca 0 como activa. Parecía un bug de selectores.
- **Por qué:** no lo era. El texto de la regla inyectada era correcto
  (`[data-slide="3"] .jcLWXZ{opacity:1;...}`) y el motor de selectores del DOM también
  (`elemento.matches('[data-slide="3"] *')` → `true`). Lo que fallaba era el entorno: en el panel
  oculto (`document.visibilityState === "hidden"`) el navegador deja de recalcular estilos ante
  cambios de selector, así que `getComputedStyle` sigue devolviendo el resultado del último pase
  real. Confirmado con dos controles: (a) inyectar un `<style>` NUEVO con `!important` sobre la
  misma clase no cambiaba nada; (b) el navbar, verificado funcionando media hora antes en esa
  misma sesión, tampoco reaccionaba ya a un `setAttribute`.
- **Cómo evitarlo:** en este panel, un resultado NEGATIVO de `getComputedStyle` tras un
  `setAttribute` no es evidencia de nada — hay que ejecutar antes un control (una sonda con
  `!important`, o una pieza que ya se sepa buena) para saber si el entorno sigue vivo. Lo que sí
  sigue siendo fiable: el LAYOUT ante scroll real (el pin y el snap se verificaron así), la
  geometría, y las propiedades personalizadas leídas sobre el propio elemento.

## 2026-07-31 — Una capa a sangre que se traslada necesita sobredimensión, o descubre su borde

- **Qué pasó:** la escena de la presentación de Story se desplazaba hasta 48px hacia abajo con el
  progreso del scroll (efecto de profundidad). La capa medía EXACTAMENTE lo que su contenedor
  (`position: absolute; inset: 0`), así que al moverse dejaba una banda de fondo plano asomando
  por arriba —creciendo conforme se scrolleaba— y se salía otro tanto por abajo. El usuario lo
  reportó como "las diapositivas se desplazan hacia abajo y no se mantienen en el alto de la
  vista"; el pin, en realidad, sujetaba perfectamente.
- **Por qué:** es la regla básica del parallax y se me pasó justo en la capa que la necesitaba.
  Las 8 imágenes DE DENTRO sí tenían su `overscan` (`scale(1.06)`), pero el envoltorio que
  añadí encima para el desplazamiento de profundidad no. Cualquier elemento que se traslade y
  mida lo mismo que su contenedor descubre el borde por el que se va: la sobredimensión no es
  un extra, es parte de la técnica.
- **Segundo fallo, latente, en la misma línea:** el desplazamiento estaba en `%`. Un porcentaje
  en `translateY` se resuelve contra la altura del **propio elemento**, y en `top`/`bottom`
  contra la del **contenedor**. Mientras la capa medía igual que el contenedor las dos
  referencias coincidían y el error no se veía; en cuanto se la sobredimensiona, dejan de
  coincidir y el borde vuelve a quedar descubierto. Se fija en `dvh`, la misma referencia en
  los dos sitios.
- **Cómo evitarlo:** toda capa que se traslade se estira al menos el recorrido máximo por cada
  lado (más un píxel de colchón de subpíxel), y las unidades del recorrido y de la sobredimensión
  se eligen para resolverse contra la MISMA referencia. Y al verificar, no basta con mirar el
  elemento que se supone que sujeta: hay que medir cada capa contra la caja que debe cubrir, en
  varios puntos del recorrido, no solo en el inicial.

## 2026-07-31 — Anclas de snap del tamaño del viewport: `proximity` y `mandatory` son lo mismo

- **Qué pasó:** la presentación de Story usaba `scroll-snap-type: y proximity` con 6 anclas de
  `100dvh`. El usuario reportó que "el scroll a veces no funciona". Medido pidiendo posiciones
  concretas y comprobando dónde aterrizaba de verdad: `900 → 720`, `1200 → 1440`, `1500 → 1440`,
  `2000 → 2160`, `3100 → 2880`, y otras veces exacto. Tirones de hasta 240px, a veces **en contra**
  del sentido del gesto, y de forma inconsistente.
- **Por qué:** la elección `proximity` sobre `mandatory` se tomó para "no secuestrar la página",
  pero es irrelevante con esta geometría: si las anclas miden exactamente una pantalla, **toda**
  posición de scroll cae siempre a menos de media pantalla de un ancla, así que el scroller
  captura casi cualquier parada. `proximity` solo se comporta como `proximity` cuando hay huecos
  mayores que su radio de captura.
- **Cómo evitarlo:** antes de elegir la modalidad de snap, comparar la separación entre anclas
  con el tamaño del viewport. Anclas del tamaño de la pantalla (o menores) ⇒ el snap será
  efectivamente obligatorio, se pida lo que se pida. Y si lo único que se busca es "que la vista
  quede atada", un pin por `position: sticky` ya lo consigue **sin** quitarle al usuario el
  control de su propio scroll: el snap solo añade el acople a cada parada, y lo cobra caro.

## 2026-07-31 — Un rAF sin guarda de visibilidad se multiplica por cada consumidor del hook

- **Qué pasó:** el usuario reportó que la landing "no se ve fluida". `useSceneParallax` arrancaba
  su bucle de `requestAnimationFrame` en el montaje y lo reprogramaba **para siempre**, sin
  comprobar si su escena seguía en pantalla. Ese hook lo consumen CUATRO secciones del tema
  oscuro, cada una con 8 capas: 4 bucles permanentes escribiendo `transform` en 32 elementos por
  frame durante toda la sesión, estuvieran o no en el viewport.
- **Cómo se confirmó, y la sorpresa:** tras añadir la guarda por `IntersectionObserver`, la suite
  completa pasó de ~40s a ~18s **y desapareció el fallo por timeout de
  `app/home-page.flujo.test.tsx`**, que llevábamos toda la sesión arrastrando y documentando como
  "preexistente y ajeno". No era ajeno: era el mismo defecto, medido desde otro sitio.
- **Cómo evitarlo:** todo bucle de rAF nace con su guarda de visibilidad, igual que todo listener
  nace con su limpieza — y con más razón en un hook COMPARTIDO, donde el coste se multiplica por
  cada consumidor sin que ninguno lo vea en su propia pantalla. Y un test que falla por timeout de
  forma intermitente merece que se investigue el consumo de CPU antes de etiquetarlo como flaky
  del entorno: aquí, esa etiqueta escondió un defecto real de producto durante toda una sesión.

## 2026-07-31 — Reincidencia: backticks dentro de un template de styled-components (tercera vez)

- **Qué pasó:** al añadir dos comentarios a `story.deck.tsx` escribí `` `padding-inline` `` y
  `` `type.scale` `` con backticks, dentro de los templates de `styled.div`/`styled.p`. Cada
  backtick cierra el template literal: `tsc` cayó con tres `TS1005: ',' expected`.
- **Por qué reincide:** la lección estaba escrita (2026-07-25) y se había vuelto a tropezar con
  ella el mismo día en `GlobalStyles.tsx`. El motivo de la recaída es que el hábito de citar
  identificadores con backticks es correcto en TODOS los demás sitios del repo —docblocks JSDoc,
  markdown de specs, mensajes de commit— y solo es fatal dentro de un template de
  styled-components. La regla no se olvida por desconocimiento, sino por transferencia de un
  hábito bueno a un contexto donde no aplica.
- **Cómo evitarlo:** dentro de un template de styled-components, los identificadores se citan
  SIN backticks y punto (`padding-inline de arriba`, `la escala type.scale`). Y como esta clase de
  fallo la caza `tsc` de inmediato, la regla práctica es no encadenar varias ediciones a un
  archivo de styled-components sin pasar `pnpm typecheck` entre medias: aquí las dos ediciones
  rotas se detectaron juntas, pero la señal habría sido más barata una a una.

## 2026-07-31 — "Está en pantalla" no es "el cursor está dentro": son dos guardas distintas

- **Qué pasó:** `useSceneParallax` ya tenía una guarda de `IntersectionObserver` (no animar lo que
  no se ve). Aun así, el usuario reportó que con el cursor en el Hero las demás secciones seguían
  el cursor. Las dos cosas son compatibles: la escena estaba en pantalla —así que el bucle corría,
  correctamente— y leía un puntero normalizado contra el VIEWPORT, no contra ella.
- **Por qué es fácil de pasar por alto:** al añadir la guarda de visibilidad uno da por cerrada la
  pregunta "¿cuándo debe animarse esta escena?". Pero son dos preguntas: *cuándo correr el bucle*
  (visibilidad) y *a qué reaccionar mientras corre* (contención del puntero). Un hook de puntero
  compartido y normalizado al viewport es cómodo hasta que hay varias escenas a la vez.
- **Dónde va la guarda:** en el consumidor que conoce su propia caja, no en el hook de puntero.
  `usePointer` lo comparten el ojo y el aura del Hero, que sí deben seguir al cursor por viewport;
  moverla allí habría roto el hero para arreglar las secciones.
- **La trampa del arreglo:** activar/desactivar un modo introduce una discontinuidad que antes no
  se notaba porque ocurría rara vez. Aquí el cambio "sigue al puntero" ↔ "deriva" era un salto
  duro que solo pasaba tras 2,2 s sin mover el ratón; con la puerta pasa a ocurrir en cada cruce
  de frontera, y con las amplitudes de la escena llegaba a ~50px. **Antes de dar por buena una
  guarda nueva, hay que preguntarse con qué frecuencia pasa a dispararse una transición que ya
  existía**: multiplicar su frecuencia puede convertir un detalle inocuo en el defecto principal.

## 2026-08-01 — Antes de regenerar un asset derivado, PRUEBA el pipeline contra uno que no cambió

- **Qué pasó:** el zip 3 de "Cosmic Being" cambiaba dos capas de once. Los WebP desplegados no
  salen del zip: se recodifican a 1280/1024 con q70, y nadie había anotado con qué herramienta
  ni con qué parámetros. Regenerar 08 y 09 "con algo razonable" habría metido dos archivos
  codificados de forma distinta al resto de la escena, sin que nada lo delatara.
- **Por qué importa:** un asset derivado es el resultado de una función que no está en el repo.
  Suponer esa función es exactamente el tipo de suposición que el §0 prohíbe rellenar a ojo, y
  aquí además es **falsable barato**: hay nueve capas intactas cuyo resultado ya está en disco.
- **Cómo se hizo:** búsqueda por fuerza bruta de (filtro de resize × quality × method) contra el
  tamaño exacto de una capa intacta, y luego validación byte a byte (sha256) del candidato sobre
  las nueve, 18/18 idénticos. Solo entonces se aplicó a las dos nuevas. El pipeline quedó escrito
  en el manifest para que la próxima vez no haya que buscarlo.
- **Cómo evitar el fallo:** si vas a regenerar parte de un conjunto de assets derivados, primero
  reproduce EXACTAMENTE un miembro que no cambia. Si no lo reproduces, no conoces el pipeline.

## 2026-08-01 — El PSNR crudo sobre RGBA miente en capas de alpha recta

- **Qué pasó:** medido sobre los cuatro canales, el aura de la figura "empeoraba" de 16,9 a
  16,5 dB al recodificar. Parecía una regresión grave; no lo era.
- **Por qué:** en una capa de alpha recta (no premultiplicada) las zonas transparentes tienen RGB
  arbitrario —no se ve— y el codificador con pérdida lo reescribe libremente. Ese error entra en
  el MSE con el mismo peso que un píxel visible, y en una capa que es 95% transparente **domina**
  la cifra. El PSNR crudo mide entonces sobre todo ruido invisible.
- **Cómo evitarlo:** medir la CONTRIBUCIÓN real de la capa, que con `plus-lighter` es `rgb × alpha`.
  Con esa métrica los mismos archivos daban 59,59 → 55,27 dB (aura) y 44,79 → 46,01 dB (figura),
  que sí describen lo que se ve. Regla general: la métrica tiene que operar sobre lo que llega a
  la pantalla, no sobre el contenedor del archivo.

## 2026-08-01 — "Actualiza el fondo con este ZIP" no implica que el ZIP sea el mismo arte

- **Qué pasó:** dos encargos idénticos en su redacción, el mismo día. El primero (Story, zip 3)
  cambiaba 2 de 11 capas del MISMO arte. El segundo (Journey, zip 2) traía otra escena entera,
  con otros nombres de capa y —lo importante— **otro modelo de composición**: el anterior era
  partición aditiva (`plus-lighter`), el nuevo guarda el color despremultiplicado para alpha
  normal. Aplicarle el blending del anterior lo habría lavado sin que ningún test fallara.
- **Por qué importa:** el parecido del encargo empuja a reutilizar el plan de la vez anterior.
  Lo que decide el trabajo no es la frase del usuario sino lo que el paquete es, y eso se lee
  del paquete: su README, su demo, y —cuando existe— el arte anterior con el que compararlo.
- **Cómo evitarlo:** antes de tocar nada, contestar tres preguntas con evidencia del propio
  paquete: (1) ¿son las mismas capas? (sha256 contra la entrega anterior si la hay); (2) ¿cómo
  se compone? (buscar `mix-blend-mode` en la demo y si el color viene premultiplicado o no);
  (3) ¿qué afirma de fidelidad y se sostiene al medirlo? Recién entonces decidir si es un
  reemplazo de assets o una escena nueva.

## 2026-08-01 — Un test sobre CSS en jsdom se sondea ANTES de escribirlo

- **Qué pasó:** el contrato clave de la escena nueva de Journey es "ninguna capa declara
  `mix-blend-mode`". Es exactamente el tipo de aserción que puede quedar verde para siempre si
  jsdom no implementa la propiedad: devolvería `""` tanto con el código bueno como con el malo.
- **Cómo se resolvió:** antes de escribir el test se creó uno desechable que renderiza dos
  `styled.div`, uno con `mix-blend-mode: plus-lighter` y otro sin nada, y se imprimió lo que
  devuelve `getComputedStyle`. Resultado: `""` sin declarar y `"plus-lighter"` cuando sí. La
  aserción es falsable. El sondeo se borró antes de commitear.
- **Regla:** cuando un test dependa de que jsdom resuelva una propiedad CSS concreta, demuestra
  primero que sabe distinguir el caso bueno del malo. Es la misma familia de fallos que las
  lecciones de `css:false` y de los media queries: un test que no puede fallar no protege nada,
  y encima da confianza falsa.

## 2026-08-01 — Un test que escribe a mano el número de elementos puede mentir en su propio título

- **Qué pasó:** `Journey.test.tsx` se llamaba "monta la escena Astral Pathway (5 capas
  decorativas)" y comprobaba `expect(...).toHaveLength(5)`. Por la mañana la sección cambió a
  otra escena distinta, "Cosmic Portal", que casualmente **también** tenía 5 capas: el test
  siguió verde, el título pasó a nombrar un componente borrado, y nadie lo notó. Solo saltó
  medio día después, cuando la v6 del paquete trajo una sexta capa.
- **Por qué importa:** el fallo no fue el `5` sino el acoplamiento roto. El test decía verificar
  "la escena de esta sección" y en realidad verificaba "hay exactamente cinco `img`". Cuando la
  constante duplicada coincide por casualidad, el test deja de proteger sin dar ninguna señal, y
  encima su nombre queda documentando algo falso.
- **Cómo evitarlo:** un test sobre "todos los X del componente" lee el recuento de la MISMA
  fuente que el componente (`expect(imgs).toHaveLength(JOURNEY_PORTAL_LAYERS.length)`), no de un
  literal. Y al renombrar o sustituir un componente, `grep` de su nombre viejo **incluyendo los
  títulos de los tests**: un `it("...")` obsoleto no rompe el build ni el lint.

## 2026-08-01 — Normalizar la profundidad a 1.0 aisla del retuneo del proveedor

- **Qué pasó:** el paquete de Journey publica profundidades de parallax y las cambió entre
  versiones (su `DMAX`, la profundidad del plano más cercano, pasó de 0.22 a 0.24). Adoptar sus
  números tal cual habría movido el recorrido de la sección en cada entrega de arte, sin que
  nadie lo pidiera.
- **Cómo se resolvió:** se adoptan las PROPORCIONES pero normalizadas a 1.0 en el plano más
  cercano, que es además lo que hace la propia demo del paquete (divide por `DMAX`). Así las
  amplitudes en px **son** el recorrido máximo, y un cambio de escala del proveedor solo
  redistribuye los planos intermedios. Al llegar la v6 no hubo que tocar ni una amplitud.
- **Regla:** cuando un asset externo trae valores de movimiento, sepáralos en "forma" (las
  proporciones, que son datos del arte) y "intensidad" (la amplitud, que es una decisión del
  producto). Ancla la forma en 1.0 y deja la intensidad en una constante propia, con un test que
  la ate.

## 2026-08-02 — Un `transform` sobre un elemento EN FLUJO no superpone nada

- **Qué pasó:** el encargo era "que Journey aparezca desde abajo superponiéndose a Story". La
  entrega anterior lo implementó como `transform: translateY(calc(100% * (1 - offset)))` sobre la
  sección de Journey, con el offset calculado por scroll. Se veía movimiento, así que parecía
  funcionar, pero no había superposición: un elemento en flujo conserva su caja original y el
  `transform` solo lo PINTA desplazado dentro de ese hueco. Story terminaba donde siempre y
  Journey se movía dentro de su propio sitio.
- **Por qué importa:** "se mueve" y "se superpone" se parecen mucho en una captura y no se
  parecen en nada en el modelo de caja. Superponer exige que la caja del elemento OCUPE el mismo
  tramo de documento que el otro (margen negativo) o que salga del flujo; pintar desplazado no
  cambia dónde está la caja de nadie.
- **Cómo se resolvió:** `margin-block-start` negativo + `z-index`, aprovechando que la sección
  anterior ya tenía un `position: sticky`. Cero JavaScript en el camino crítico del scroll.
- **Regla:** ante un encargo de superposición, pregúntate qué caja ocupa qué tramo de documento
  ANTES de elegir la propiedad. Si la respuesta no cambia, no hay superposición, por mucho que se
  mueva.

## 2026-08-02 — `getBoundingClientRect()` devuelve el rect YA transformado: escribir el transform desde él es un lazo cerrado

- **Qué pasó:** el mismo código derivaba `scrollOffset` de `rect.top` y escribía ese offset en el
  `transform: translateY(...)` del MISMO elemento. Pero `getBoundingClientRect()` incluye los
  transforms aplicados, así que `rect.top` ya reflejaba el desplazamiento que se estaba a punto de
  recalcular: la variable no converge al progreso pretendido sino al punto fijo de su propia
  ecuación.
- **Por qué no salta:** el lazo produce números plausibles entre 0 y 1 y el elemento se mueve. No
  hay excepción, no hay `NaN`, no hay test que se ponga rojo.
- **Regla:** si mides un elemento para escribirle una propiedad que altera esa misma medida, la
  medida tiene que venir de una fuente que la propiedad NO mueva — el elemento padre, `scrollY`, o
  un elemento espaciador aparte. Y si además la propiedad lleva `transition`, cada tick de scroll
  arranca una transición nueva: la latencia es la duración entera, por diseño.

## 2026-08-02 — Una invariante entre dos ficheros de datos no la sostiene un comentario en cada uno

- **Qué pasó:** el solape de Journey (`JOURNEY_OVERLAY_RISE`) y la cola de la pista de Story
  (`STORY_DECK_TAIL_SCREENS` × `STORY_DARK_HEIGHT`) tienen que medir exactamente lo mismo, o
  aparece una banda de fondo sin tapar (si el solape es menor) o Journey empieza a subir sobre una
  diapositiva todavía activa (si es mayor). Los dos ficheros de datos son de secciones distintas y
  no se importan entre sí a propósito. Cada uno describía la invariante en su docblock.
- **Lo que eso no impide:** nada. Los dos defectos son visuales puros; la suite entera seguiría
  verde con las constantes desincronizadas.
- **Detalle de la delegación, que es la mitad de la lección:** los DOS subagentes escribieron en su
  docblock que "la igualdad la ata un test", cada uno dando por hecho que el otro lo escribiría.
  Ninguno podía: el test cruza los dos ficheros y cada agente tenía el alcance acotado al suyo. El
  docblock describía trabajo de otro, y ese trabajo no existía hasta que lo escribió el hilo
  principal al integrar.
- **Regla:** una invariante que cruza dos ficheros vive en un TEST que importa los dos, y ese test
  es responsabilidad de quien integra, no de ninguno de los alcances parciales. Y al repartir
  trabajo en paralelo, cualquier afirmación de un agente sobre lo que hay "en el otro lado" se
  verifica al integrar: no es una fuente, es una expectativa.

## 2026-08-02 — Un test que trocea el CSS inyectado por `@media` se contamina con el stylesheet entero

- **Qué pasó:** el patrón que ya vivía en `Journey.test.tsx` para el guard de reduced-motion
  (`css.split("@media (prefers-reduced-motion: reduce)").slice(1).join("\n")`) se lleva TODO lo
  que viene después del primer bloque reduce, no solo ese bloque. Al reutilizarlo para un guard
  nuevo (`margin-block-start: 0`), la aserción daba verde contra el `margin-block-start: 0.75rem`
  de OTRO componente del mismo fichero, y seguía verde al quitar la declaración real.
- **Cómo se detectó:** solo porque se comprobó la falsabilidad quitando la declaración a propósito.
  Sin ese paso, el test habría entrado en la suite ya inservible.
- **Cómo se resolvió:** cada regla `@media (...) { ... }` se serializa como UNA entrada sin salto
  de línea interno (comprobado con un sondeo desechable), así que se busca la LÍNEA que sea a la
  vez bloque reduce y mencione la propiedad, y se asevera sobre esa línea sola.
- **Regla:** al aseverar sobre el texto del CSS inyectado, acota al bloque concreto, nunca a "todo
  lo que viene después de". Y la comprobación de falsabilidad no es opcional en esta familia de
  tests: es lo único que distingue una aserción de un adorno.

## 2026-08-02 — Antes de atribuir un fallo de la suite a tu cambio, ponlo a prueba en el árbol SIN tu cambio

- **Qué pasó:** al cerrar la entrega, `pnpm test` pasó de verde (562/562 y 563/563 en tres
  ejecuciones anteriores del mismo día) a rojo con 3 fallos. La tentación inmediata es asumir que
  el último cambio los provocó y ponerse a buscar en el diff.
- **Qué eran en realidad:** los tres fallos eran **timeouts de `waitFor`** (5,9 s / 6,3 s / 11,8 s),
  no aserciones falsas, en los tests que renderizan la página entera. La máquina llevaba horas
  acumulando procesos de la propia sesión (panel de navegador, subagentes), y los workers de vitest
  competían por CPU.
- **Cómo se resolvió, en tres medidas y no en una:** (1) los ficheros afectados pasan en
  aislamiento, 17/17, tres veces seguidas; (2) `git stash push -- src/` deja el árbol en el HEAD
  anterior y **la misma ejecución también falla ahí** (554/556, mismos tests) — el fallo existe sin
  la entrega; (3) `pnpm vitest run --maxWorkers=4` da 563/563 en verde con la entrega puesta. Las
  tres juntas identifican la causa (contención de CPU) sin dejar la duda de "¿y si era mío?".
- **Regla:** un fallo nuevo no es tuyo por ser nuevo. Un timeout no es una aserción falsa, y la
  forma barata de separarlos es ejecutar la misma suite en el árbol sin tu cambio, en la misma
  máquina y en el mismo momento. `git stash push -- <ruta>` + `git stash pop` cuesta un minuto y
  convierte una sospecha en un dato. Y al reportar, la cifra que se da es la de la ejecución que se
  ha hecho, con la condición en la que se hizo — no la mejor de las que se recuerdan.

## 2026-08-02 — Comprueba `document.hidden` ANTES de medir nada en el navegador

- **Qué pasó:** al verificar la presentación de Journey, las variables CSS del scroll salían
  vacías y el índice de diapositiva congelado en 0. Parecía una regresión del hook recién
  renombrado. Lo que lo delató fue el **control**: la presentación de **Story**, que esa entrega
  apenas tocaba y que había funcionado horas antes, estaba igual de muerta.
- **Causa raíz:** el tab del panel estaba en segundo plano (`document.hidden === true`). Un tab
  oculto no despacha eventos de `scroll`, no ejecuta callbacks de `IntersectionObserver` y no
  corre `requestAnimationFrame`. Todo el motor de estas presentaciones cuelga de esas tres cosas,
  así que no escribía nada — sin ningún error que lo delatara. Confirmado montando un observer y
  un listener de `scroll` propios: **cero callbacks** mientras `scrollY` cambiaba de verdad.
- **Cómo se resolvió:** frontar el tab (`tabs_select`) y cerrar el tab muerto que estaba activo.
  Con el tab visible, las mismas medidas salieron exactas y coincidentes con la aritmética de la
  spec.
- **Regla:** la PRIMERA medida de cualquier verificación en navegador es
  `document.hidden`/`visibilityState`. Y cuando una medida sugiera que tu cambio rompió algo,
  mide antes una pieza que tu cambio NO toca: si también está rota, el problema es el entorno.
  Es la versión de navegador de la lección del `git stash` de esta misma jornada. Amplía la
  entrada del 2026-07-27 sobre la pestaña oculta, que describía el síntoma en animaciones; aquí el
  síntoma es que el motor de scroll entero parece no existir.

## 2026-08-02 — La captura del panel no compone contenido `position: sticky`

- **Qué pasó:** con el DOM, el CSSOM y la geometría verificados y correctos, la captura de la
  sección devolvía un rectángulo liso del color de fondo. Cero texto, cero escena.
- **Cómo se descartó que fuera un defecto propio:** con dos controles, no con una intuición. (1)
  Se capturó **Story**, una sección que la entrega no tocaba y que se había capturado bien esa
  misma mañana: igual de plana. (2) Se capturó el **Hero**, que no usa `position: sticky`: perfecto,
  en el mismo tab y la misma sesión. Además `elementFromPoint` devolvía el texto de la diapositiva
  como elemento más alto en el punto central, con `opacity: 1` y color casi blanco.
- **Regla:** una captura en blanco no es una prueba de nada por sí sola. Antes de reportar un
  defecto visual —o de darlo por descartado— captura una pieza vecina que no hayas tocado y otra
  que no use la misma técnica. Y cuando la herramienta no puede ver el resultado, dilo en la
  entrega en vez de dejar que la ausencia de capturas pase por verificación: lo medido se afirma,
  lo no visto se declara pendiente de un humano.

## 2026-08-02 — Bajo `reduce`, quitar `position` a un ancestro REPARENTA a sus hijos absolutos

- **Qué pasó:** la degradación de la presentación bajo `prefers-reduced-motion: reduce` pone el
  `stage` en `position: static` (lógico: sin pin no hace falta que sea pegajoso). El efecto
  colateral no es lógico en absoluto: al dejar de ser un elemento posicionado, **deja de ser el
  containing block** de la capa de la escena, que sigue siendo `position: absolute`. Esa capa se
  reancla al siguiente ancestro posicionado — la pista — cuya altura bajo `reduce` es `auto`, o
  sea las 8 diapositivas apiladas. Resultado: la escena, con `object-fit: cover`, se estiraba a
  ocho pantallas de alto y quedaba recortada a una franja vertical.
- **Por qué no lo vio nadie:** no se pierde ni una palabra de texto. Los tests de contenido, los
  de `data-state` y hasta el propio guard de `reduce` del resto de piezas seguían verdes. El único
  síntoma es visual, y sucede solo bajo una media query que jsdom no evalúa. Lo encontró una
  auditoría adversarial que se preguntó explícitamente "¿qué pasa con la escena cuando el stage
  deja de ser positioned?".
- **El arreglo evidente no servía:** devolverle al `stage` un `position: relative` bajo `reduce`
  lo restituye como containing block, pero su altura bajo `reduce` es `height: auto` — las mismas
  ocho pantallas. El estiramiento habría sido idéntico. Lo que cierra el fallo es dar a la capa
  absoluta una **altura explícita** y anclarla a un borde: así es correcta sea cual sea el
  ancestro que acabe gobernándola.
- **Regla:** cada vez que un guard de `reduce` (o cualquier media query) cambie el `position` de
  un elemento, revisa qué descendientes absolutos dependían de él como containing block. Cambiar
  `position` no es un cambio local: reescribe la geometría de todo un subárbol, en silencio y sin
  un solo error. Y cuando un arreglo se proponga "restituir el ancestro", comprueba que el ancestro
  restituido tiene la MEDIDA correcta, no solo el `position` correcto.

## 2026-08-07 — Un `toContain` sobre el CSS no distingue el selector descendiente del calificado

- **Qué pasó:** al probar el bug inyectado obligatorio sobre el statement de Story, se cambió a
  propósito el selector descendiente `[data-revealed="true"] &` por el calificado
  `&[data-revealed="true"]` — el fallo silencioso que la §5.1 del manual global prohíbe — y **el
  test siguió en verde**.
- **Causa raíz:** las dos formas compilan a cadenas que contienen el MISMO substring
  `[data-revealed="true"]`. La descendiente da `[data-revealed="true"] .sc-xxxx` (atributo, espacio,
  clase); la calificada da `.sc-xxxx[data-revealed="true"]` (clase pegada al atributo). Un
  `expect(css).toContain('[data-revealed="true"]')` sobre el `cssText` completo es verdadero en
  ambos casos, así que el candado no candaba nada.
- **Cómo se cerró:** leyendo el `selectorText` de la regla concreta en el CSSOM (no el texto libre
  del `cssText` de todas las reglas juntas) y afirmando que EMPIEZA por `[data-revealed="true"] `,
  con el espacio. Con el sabotaje puesto, ese assert sí se pone en rojo.
- **Regla:** cuando lo que hay que fijar es la FORMA de un selector, afírmalo sobre `selectorText`,
  nunca por substring del CSS inyectado. Y el corolario general: un test de bug inyectado que sigue
  en verde no dice "la implementación es correcta", dice "el test no mide lo que crees" — es la
  única señal fiable de un candado decorativo, y por eso el sabotaje no es opcional.

## 2026-08-07 — La inversa de una cascada se declara en la regla BASE, no con un segundo estado

- **Qué pasó:** el encargo pedía que tres líneas entraran escalonadas y que, al retroceder el
  scroll, se deshicieran "a la inversa". El impulso era añadir estado (un flag de dirección, un
  segundo atributo, `data-dir`) y calcularlo en React.
- **Lo que bastó:** `transition-delay` se toma siempre del estado **al que** se transita. Poniendo
  el retardo DIRECTO (0/220/440 ms) en la regla `[data-revealed="true"] &` y el INVERSO
  (440/220/0 ms) en la regla base del elemento, el repliegue se escalona solo, en orden inverso,
  sin una línea de JavaScript ni un segundo atributo. Medido en navegador: a +560 ms de la entrada
  las opacidades iban 0.93 / 0.74 / 0.30; a +460 ms del repliegue iban 0.97 / 0.40 / 0.13.
- **Regla:** antes de introducir estado para describir el sentido de una animación, comprueba si el
  sentido ya está implícito en qué regla gana. Un `transition-delay` distinto en cada uno de los dos
  estados es una coreografía bidireccional completa, y no hay nada que sincronizar porque no hay
  nada que contar.

## 2026-08-07 — El orden de pintado de CSS ignora el DOM: sin posicionar se pinta ANTES que posicionado

- **Qué pasó:** al habilitar el campo de 24 estrellas del footer también en tema claro, `ScInner`
  recibió su `position: relative; z-index: 1` (ya lo tenía condicionado a oscuro) pero `ScBottomBar`
  —copyright y los cuatro enlaces legales— se quedó con el suyo condicionado a `$dark`. En el DOM
  las estrellas van ANTES que la barra inferior, así que "las estrellas se pintan primero" parecía
  evidente. Es falso.
- **Causa raíz:** dentro de un contexto de apilamiento, el orden de pintado (CSS 2.1 §9.9.1) coloca
  los descendientes de bloque **en flujo y sin posicionar** en el paso 3, y los descendientes
  **posicionados con `z-index: auto`** en el paso 6. El orden del DOM solo desempata DENTRO de un
  mismo paso. Un elemento absoluto sin `z-index` se pinta por encima de cualquier hermano no
  posicionado, vaya donde vaya en el marcado.
- **Por qué no lo vio ningún test:** los tests fijan CSS inyectado y estructura DOM; jsdom no pinta.
  El único síntoma es visual, en un tema concreto. Lo encontró la revisión preguntándose qué otras
  piezas compartían el motivo del `z-index` de `ScInner`.
- **Regla:** cuando levantes un elemento por encima de una capa absoluta con `z-index: 1`, busca
  **todos** sus hermanos en flujo, no solo el que te trajo el problema. Y si una prop condiciona un
  `position`, sospecha: la condición casi siempre describía el estado del mundo cuando se escribió
  ("en claro no hay estrellas"), no una propiedad del componente.

## 2026-08-07 — No reconstruyas el tema a mano si ya hay un ThemeProvider en el árbol

- **Qué pasó:** una pieza necesitaba el `ThemeDefinition` completo (no solo `themeName`) para
  componer un color y lo resolvió con `themes[themeName]`, importando la tabla de temas.
- **Por qué es un problema aunque funcione:** `ThemeProvider.tsx` ya expone exactamente
  `{ data: themes[themeName] }` a todo el árbol. Resolverlo otra vez crea una segunda fuente de
  verdad sobre qué tema está activo — la misma clase de bug que `Navbar.tsx` cerró al retirar su
  `ThemeProvider` anidado, y que `task/lessons.md` ya documenta para `currentColor` heredando del
  proveedor equivocado.
- **Regla:** si necesitas el objeto de tema completo dentro de un componente, léelo del proveedor
  (`useTheme` de styled-components, importado con alias si choca con el `useTheme` del repo), nunca
  del módulo de temas. El `useTheme` del repo devuelve `themeName` para DECIDIR ramas; el de
  styled-components devuelve el tema que de verdad están pintando los styled-components de ese
  mismo fichero.

## 2026-08-08 — Borrar `.next` mata el servidor de desarrollo que el usuario tenía vivo

- **Qué pasó:** al retirar dos rutas legales el typecheck falló contra ficheros generados y
  obsoletos (`.next/types/validator.ts`, `.next/dev/types/validator.ts`), que seguían importando
  las páginas borradas. Se resolvió borrando `.next` entero. Correcto para el typecheck; el efecto
  colateral fue que el `next dev` que el usuario tenía corriendo en el puerto 3000 empezó a
  devolver `Internal Server Error` en cada petición y no se recuperó solo.
- **Causa raíz:** `next dev` mantiene abierta su propia caché en `.next`. Borrar el directorio bajo
  un proceso vivo no dispara una recompilación: le arranca el suelo.
- **Regla:** antes de borrar `.next`, comprueba si hay un servidor escuchando
  (`Get-NetTCPConnection -LocalPort 3000 -State Listen`). Si lo hay, borra solo el subdirectorio de
  tipos que estorba (`.next/types`, `.next/dev/types`) o avisa antes de tirar el directorio entero.
  Si ya lo has borrado, el servidor del usuario está muerto: díselo y levanta uno nuevo con
  `autoPort` en vez de intentar reutilizar el puerto ocupado por el proceso zombi.

## 2026-08-08 — Un requisito legal se retira por el análisis, no por la spec del encargo

- **Qué pasó:** el encargo describía la web como "sin formularios" y pedía retirar todo lo que no
  fuera Aviso legal y Privacidad. La auditoría encontró que el tema oscuro SÍ monta un `<form>` con
  un campo de correo.
- **Por qué no se retiró:** ese formulario no envía nada a ningún servidor —`handleSubmit` compone
  un `mailto:` y delega en el cliente de correo—, así que no recoge datos y no cambia el análisis
  legal. Retirarlo habría sido un cambio de producto ajeno al encargo.
- **Regla:** cuando la spec de un encargo legal y el código discrepan, gana el código para el
  ANÁLISIS y gana el encargo para la DECISIÓN, y las dos cosas se reportan por separado. Nunca
  borres una pieza de producto para que la realidad encaje con el texto del encargo, ni ajustes el
  texto legal para tapar una pieza que el encargo no contemplaba.

## 2026-08-08 — Un "bucle de redirección" se refuta con `redirect: 'manual'`, no discutiendo el routing

- **Qué pasó:** tras retirar dos rutas legales, el usuario reportó un bucle de redirección al entrar
  a `/privacidad` y `/aviso-legal`. La tentación inmediata es revisar `next.config.ts`, el App
  Router y las redirecciones del hosting recién añadidas.
- **Qué lo resolvió:** probar las rutas desde la consola del navegador contra **tres** servidores
  (el del usuario, uno limpio, y `npx serve out` sobre el export):

  ```js
  const probe = async (p) => {
    const r = await fetch(p, { redirect: 'manual', cache: 'no-store' });
    return { path: p, status: r.status, location: r.headers.get('location') };
  };
  await Promise.all(['/privacidad', '/privacidad/', '/'].map(probe));
  ```

  Los tres devolvieron `200` con `location: null`. No había nada que arreglar en el routing: el
  cliente estaba recargando en bucle contra un `next dev` con la caché reventada.
- **Regla:** ante un reporte de "bucle de redirección", mide primero la cadena HTTP real con
  `redirect: 'manual'` y contra más de un servidor. Un `200` sin `Location` refuta la hipótesis
  entera en una llamada. Y ojo con el falso positivo inverso: `/ruta/` con barra final redirigiendo
  a `/ruta` es un salto único de `trailingSlash: false`, no un bucle.
- **Corolario de comunicación:** si has roto tú el entorno del usuario (aquí, borrar `.next` bajo su
  `next dev`), díselo en el mismo mensaje en que ocurre, no enterrado al final del informe. Si se
  entera por el síntoma, lo reportará como un bug del código que acabas de tocar y el diagnóstico
  arranca mirando al sitio equivocado.

## 2026-08-08 — Traducir un título puede colisionar con otra clave i18n de la misma tarjeta

- **Qué pasó:** al traducir los títulos de las tarjetas de Features a `Aprende` / `Imagina` /
  `Juega`, dos de los tres quedaron IDÉNTICOS al `badge` que ya vivía en la misma tarjeta
  (`Aprende`, `Juega`). No fue un detalle estético: rompió un test con
  `Found multiple elements with the text: Aprende`, porque el `getByText` de Testing Library
  falla cuando hay más de una coincidencia.
- **Regla:** antes de cambiar el valor de una clave i18n, busca el resto de claves que se
  renderizan en el MISMO componente y comprueba que ninguna queda con el mismo texto. Un
  `grep` del valor nuevo sobre el JSON del locale basta. Vale también al revés: si un test usa
  `getByText`, cualquier duplicado futuro lo tumbará.
- **Corolario de alcance:** cuando la traducción que pide el usuario obliga a tocar una clave
  vecina (aquí, los `badge`), tómalo, dilo explícitamente en la entrega y deja claro que es
  reversible en una línea — no lo silencies ni lo dejes roto por respetar el alcance literal.

## 2026-08-08 — Repartir en commits temáticos un fichero que mezcla dos temas

- **Qué pasó:** el usuario pidió commits separados por tema, pero `src/i18n/locales/es/common.json`
  mezclaba un cambio de copia (el *tagline* del pie) con la retirada de claves de un refactor legal
  ajeno. `git add -p` es interactivo y no está disponible en este entorno.
- **Regla:** copia el fichero al scratchpad, `git checkout HEAD -- <fichero>`, reaplica SOLO el
  trozo del primer tema, commitea, y restaura la copia completa desde el scratchpad para el commit
  siguiente. Verifica con `git diff -- <fichero>` que lo que queda es exactamente el otro tema.
