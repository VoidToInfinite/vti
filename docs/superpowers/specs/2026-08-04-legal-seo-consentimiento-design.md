# Spec — Páginas legales, capa de SEO/AEO/GEO, sitemap y consentimiento configurable

**Fecha:** 2026-08-05 · **Rama:** `feature/gdpr-legal-terms-accessibility` · **HEAD de partida:** `aec8c48`

> El nombre de fichero de esta spec y el de su plan conservan `2026-08-04`: se crearon con esa fecha por un error de datación que se detectó al cerrar la entrega, y para entonces el slug ya estaba citado en los docblocks de quince ficheros y en un commit empujado. Se corrigieron **las fechas que son afirmaciones factuales** (versión y última revisión de los cuatro documentos legales, fecha de la autoevaluación de accesibilidad, `lastmod` del sitemap y las referencias en prosa a esta entrega); el slug se conserva como identificador. La entrega es del **2026-08-05**.

**Encargo del usuario (literal):**

```text
Objetivo: orquesta Opus como planeador, revisor y documentador utilizando Sonnet
como agentes/subagentes, crear las paginas "Politica de privacidad", "Terminos de
uso" y "Accesibilidad". Generar el sitemap.xml para Google Analytics. Meta tags
para la indexacion de Google, SEO (AEO, GEO, SXO, AIO). Meta tags OG y Twitter
funcionalmente preparadas y definidas. Cockies banner.
Resultado: SEO garantizado, legal preparado, Coockie banner y su configurable.
Formato: entrega el contexto, specs y todo lo necesario actualizados en el vault.
Restricciones: no entreges resultados hasta que este todo correcto, verificado y
documentado cumpliendo la reglas del proyecto.
Checkpoints: pausa solo por acciones destructivas o irreversible. Pausa si aparece
un cambio del alcance fuera del brief. Pausa si necesitas un dato que solo yo pueda
dar. Si no, sigue hasta cuando termines.
```

**Decisiones tomadas por el usuario en el arranque** (checkpoint «dato que solo yo puedo dar», 2026-08-05):

| Pregunta | Respuesta |
| --- | --- |
| Responsable del tratamiento / titular legal | **Sin definir — dejar `POR_COMPLETAR`** |
| NIF/CIF, domicilio, correo de contacto legal | **Todo `POR_COMPLETAR`** |
| Analítica que mide o medirá el sitio | **Analítica sin cookies (Plausible/Umami)** |
| Cobertura del Aviso Legal (LSSI-CE art. 10) | **Cuarta página `/aviso-legal`** — ampliación del alcance del brief aprobada explícitamente |

---

## 1. Estado actual (medido en el árbol, no de memoria)

`git rev-parse HEAD` = `aec8c48e813a8dcbe21aeed58545de01fe35f89d`, rama `feature/gdpr-legal-terms-accessibility`. `git status --porcelain` señala **solo** `graphify-out/**` (9 ficheros, artefactos del grafo, preexistentes).

Baseline de calidad medida en este HEAD **antes de tocar nada**:

- `pnpm vitest run --maxWorkers=4` → **735 tests en 62 ficheros, todos verdes**.
- `pnpm typecheck` → exit 0, sin salida. `pnpm lint` → exit 0, sin salida.
- `pnpm check-format` → señala **solo** `graphify-out/**` (17 ficheros), ninguno de código. Fallo preexistente, fuera del alcance (§9).

Estructura vigente de lo que toca esta entrega:

| Pieza | Medida hoy | Fichero |
| --- | --- | --- |
| Metadata global | `title`, `description`, `metadataBase`, `openGraph` con solo `{title, description, type}` | `app/layout.tsx:16-25` |
| `viewport` | solo `themeColor: "#000000"` | `app/layout.tsx:27-29` |
| Rutas de `app/` | `layout.tsx`, `page.tsx`, `not-found.tsx`, `providers.tsx`, `favicon.svg`, `icon.svg` — **ninguna subruta** | `app/` |
| `sitemap` / `robots` / `manifest` / `opengraph-image` | **no existen** | — |
| `links.privacy/terms/accessibility` | `https://example.invalid/por-completar-*` (marcadores deliberados, RFC 2606) | `src/config/links.ts:17-19` |
| Enlaces legales del footer | 3 anclas con `target="_blank" rel="noopener noreferrer"` a esos marcadores | `Footer.tsx:377-431` |
| `html lang` | **`"es"` hardcodeado**, no se sincroniza al cambiar de idioma | `app/layout.tsx:38` |
| Almacenamiento en el terminal | `localStorage`: `vti-theme` (`ThemeProvider.tsx:14`), `vti-lang` (`I18nProvider.tsx:9`; **retirada el 2026-09-02, crítica externa #15**: se escribía sin elección y nunca se leía). **Cero cookies HTTP** (`grep document.cookie` sin resultados) | — |
| Analítica / terceros | **Ninguna** (`grep` de `gtag\|googletagmanager\|analytics\|plausible\|umami\|sentry\|posthog\|hotjar\|sendBeacon` sobre `src app public` sin resultados) | — |
| Formulario de contacto | **No postea a ningún servidor**: `preventDefault()` + `window.location.assign(mailto:…?subject=&body=)` | `Contact.tsx:926-939` |
| Namespaces i18n registrados | `common`, `home` | `src/i18n/config.ts:10-13,24` |
| Candado de paridad i18n | `namespaces` cubre solo `common` y `home` | `src/i18n/locales.test.ts:49-52` |

### 1.1 Hallazgos del reconocimiento que cambian el diseño

Tres hechos verificados empíricamente (no de memoria) que invalidan el diseño «obvio»:

**H1 — `export const dynamic = "force-static"` es obligatorio.** En Next **16.2.11** con `output: "export"`, las rutas de metadata `sitemap.ts`, `robots.ts`, `manifest.ts` y `opengraph-image.tsx` **fallan el build** si no lo declaran. Fuente en el propio paquete instalado, `node_modules/next/dist/server/route-modules/app-route/module.js:144-157`:

```
export const dynamic = "force-static"/export const revalidate not configured
on route "/data.json" with "output: export".
```

El wrapper autogenerado (`next-metadata-route-loader.js`) **no** inyecta ese flag: solo lo hace para assets estáticos literales. Verificado además con un build real en scratchpad: los 5 ficheros de prueba fallaron uno a uno sin el flag y compilaron los 5 con él. La documentación embebida dice lo contrario; manda el código y el build.

**H2 — `openGraph` NO se fusiona entre `layout` y `page`: se REEMPLAZA entero.** `node_modules/next/dist/lib/metadata/resolve-metadata.js`, función `mergeMetadata` (líneas 166-312): para cada clave presente en el segmento actual, el resultado del resolver **sustituye** la clave entera; no hay spread del padre. Verificado con build real: un layout con `openGraph:{title, description, type, siteName, images}` y una página con `openGraph:{title}` produce HTML **sin ningún** `og:site_name` ni `og:type`. `og:description` sobrevive solo por un fallback puntual desde el `description` de nivel raíz (`postProcessMetadata`, líneas 603-659), no por merge.

→ Consecuencia de diseño: **cada página debe declarar su bloque `openGraph`/`twitter` completo**. Escribirlo a mano en 5 sitios garantiza divergencia. De ahí `buildMetadata()` (D3).

**H3 — Con `trailingSlash: false` el export produce ficheros planos.** `node_modules/next/dist/export/worker.js:133,267`: `getHtmlFilename = (p) => subFolders ? p+sep+"index.html" : p+".html"`, con `subFolders = trailingSlash && !buildExport`. Verificado con build real: `app/test-page/page.tsx` → **`out/test-page.html`**, no `out/test-page/index.html`. La canónica pública correcta es por tanto `https://voidtoinfinite.com/privacidad`, sin barra final ni extensión.

**H4 — `opengraph-image.tsx` con `ImageResponse` SÍ funciona en export estático.** Verificado con build real: `out/opengraph-image` con firma PNG (`89 50 4E 47`), `IHDR` = 1200×630, y `<meta property="og:image">` inyectado en el HTML con `type`, `width`, `height` y `alt`.

**H5 — Hoy, legalmente, este sitio no necesita banner de consentimiento.** El art. 22.2 LSSI-CE exige consentimiento para «dispositivos de almacenamiento y recuperación de datos en equipos terminales». Las dos únicas claves que este sitio escribe (`vti-theme`, `vti-lang`) son **personalización de interfaz elegida activamente por el propio visitante**, supuesto que la Guía de cookies de la AEPD (ed. julio 2023) lista entre los exentos. Y la analítica sin cookies elegida por el usuario (Plausible/Umami) no instala nada en el terminal, así que **queda fuera del ámbito** del art. 22.2, no «exenta dentro» de él.

→ Consecuencia de diseño: el banner **se construye igual** —lo pide el encargo, y la analítica futura o cualquier tercero lo necesitarán— pero se construye **honesto**: declara lo que realmente hay, no simula un consentimiento que ninguna tecnología presente requiere, y el gate de consentimiento queda operativo para el día en que sí haya algo que gatear (D10-D14). Esto se registra como límite declarado en §9, no se esconde.

---

## 2. Objetivo y alcance

1. **Cuatro páginas legales** en rutas propias, en los dos idiomas, con la estructura que exige la norma española/europea aplicable y con todo dato identificativo aún desconocido marcado `POR_COMPLETAR` de forma visible y atada por test.
2. **Capa de SEO completa y única**: título/descripción/canónica/robots/OG/Twitter/JSON-LD para las 5 rutas, generada por un solo helper para que no puedan divergir.
3. **`sitemap.xml` y `robots.txt`** emitidos por el build al `out/`.
4. **Imagen OG real** de 1200×630 generada en el build.
5. **Banner de consentimiento configurable**: registro declarativo de tecnologías por categoría, panel de preferencias reabrible, persistencia versionada, API de gate para scripts futuros.
6. **Dos defectos de accesibilidad preexistentes** que esta entrega toca de lleno y arregla (D18, D19).

**Fuera de alcance** (§10): instalar Plausible/Umami, enrutado por idioma (`/es/…`, `/en/…`), `hreflang`, formatear `graphify-out/**`.

---

## 3. Decisiones de diseño

### Rutas y URLs

**D1 — Slugs en español, sin prefijo de idioma.** `/privacidad`, `/terminos`, `/accesibilidad`, `/aviso-legal`. El sitio tiene i18n **de cliente** con una sola URL por documento: `lng: "es"` es lo que se prerenderiza (`config.ts:21`), el inglés solo aparece tras hidratar si `localStorage.vti-lang === "en"`. Poner slugs en inglés describiría mal lo que Google va a indexar. Corolario honesto declarado en §9: **solo el español es indexable hoy**; no se declara `hreflang` ni `alternates.languages` porque no existen URLs alternativas que declarar — hacerlo sería mentirle al rastreador.

**D2 — Canónicas sin barra final ni extensión.** Derivado de H3, no de la costumbre: `https://voidtoinfinite.com/privacidad`. `metadataBase` ya existe y se conserva.

### SEO

**D3 — Un solo constructor de metadata: `buildMetadata()`.** Motivado por H2. Recibe `{ path, title, description, keywords?, robots? }` y devuelve un `Metadata` **completo**: `title`, `description`, `alternates.canonical`, `openGraph` entero (`title`, `description`, `url`, `siteName`, `locale`, `type`) y `twitter` entero (`card: "summary_large_image"`, `title`, `description`). Todas las rutas —incluida la home— pasan por él. Ninguna página escribe un objeto `openGraph` a mano.

**D4 — ~~Las imágenes OG NO se declaran en `buildMetadata()`~~ → CORREGIDA por medición.** ⚠️ Ver **D4-bis**.

La decisión original decía: no declarar `openGraph.images`, porque ya las inyecta la convención de fichero `app/opengraph-image.tsx` y esta sobrevive al reemplazo de H2. Se apoyaba en una verificación **incompleta**: se comprobó que la imagen sobrevivía en una página del **mismo segmento** que el fichero de imagen (`app/page.tsx` junto a `app/opengraph-image.tsx`) y se generalizó a las rutas anidadas sin volver a medir.

**D4-bis — Las imágenes OG SÍ se declaran en `buildMetadata()`.** El build real de esta entrega refutó D4: `out/index.html` llevaba `og:image` y `twitter:image`, y los **cuatro** HTML de las páginas legales no llevaban **ninguno de los dos**. La explicación encaja exactamente con H2: para una ruta anidada la imagen del convenio entra en el `openGraph` **ya resuelto del segmento padre**, y el `openGraph` que declara la página lo sustituye entero, imagen incluida; en la raíz no ocurre porque ahí la imagen pertenece al propio segmento.

`buildMetadata()` declara por tanto `openGraph.images` y `twitter.images` apuntando a `OG_IMAGE_PATH` (`/opengraph-image`), que `metadataBase` convierte en absoluta. Verificado tras el arreglo: las **5** rutas emiten `og:image` y `twitter:image`, exactamente uno de cada, sin duplicados. `app/twitter-image.tsx` no hizo falta.

**D4-ter — `Content-Type` de la imagen, declarado en Netlify.** El fichero se emite como `out/opengraph-image`, **sin extensión** (es el nombre que Next da a la ruta de metadata y no se puede cambiar). Un servidor de estáticos deduce el tipo de la extensión, así que sin cabecera explícita lo serviría como `application/octet-stream` y los rastreadores de Facebook, LinkedIn o X descartarían la vista previa. `netlify.toml` declara `Content-Type = "image/png"` para esa ruta. Que el fichero **es** un PNG válido está verificado en el build (firma `89 50 4E 47 0D 0A 1A 0A`, IHDR 1200×630), no supuesto.

**D5 — `robots` explícito y por página.** Las 5 rutas se indexan (`index: true, follow: true`) con `googleBot: { "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }` — los tres directivos que habilitan rich results y fragmentos largos, que es lo que pide un AEO/AIO real. El `404` (`not-found.tsx`) **no** lleva metadata propia: no es una URL canónica y Next ya la sirve como `404.html`.

**D6 — JSON-LD, tres tipos, un solo componente.** `Organization` + `WebSite` en el layout (una vez, en todas las páginas); `WebPage` con `breadcrumb` en cada página legal. Es la palanca concreta de AEO/GEO/AIO del encargo: lo que un motor generativo cita es entidad + autoría + fecha, y eso vive en el JSON-LD, no en `<meta keywords>`. Se serializa con `JSON.stringify` dentro de `<script type="application/ld+json">` en un **Server Component** (sin `dangerouslySetInnerHTML` sobre entrada de usuario: el contenido es un objeto literal del repo, no entrada externa).

- `Organization.name/url/logo/sameAs` se toman de `src/config/site.ts` y `links.ts` (github, discord reales).
- Todo campo que dependa de datos identificativos aún desconocidos (dirección postal, NIF) **se omite del JSON-LD**, no se rellena con `POR_COMPLETAR`: un dato falso en datos estructurados es peor que su ausencia.

**D7 — `sitemap.ts` y `robots.ts` con `export const dynamic = "force-static"`.** Obligatorio por H1. El sitemap declara las 5 rutas con `lastModified` tomado de la fecha de versión del documento (`legal.ts`), no de `new Date()`: `new Date()` en tiempo de build haría que cada build cambiara el sitemap entero y le diría a Google que todo se ha modificado cuando no es cierto. `changeFrequency`/`priority` se declaran porque el formato los admite, con el matiz honesto de que Google los ignora desde hace años.

**D8 — `robots.txt` sin `Disallow` decorativo.** `User-agent: *` / `Allow: /` + `Sitemap:`. No se bloquean rastreadores de IA: el encargo pide AEO/GEO/AIO, que es exactamente lo contrario de bloquearlos. Se declara explícitamente en el vault que esa es la decisión, para que un cambio futuro sea deliberado.

**D9 — Imagen OG generada, 1200×630, `force-static`.** `app/opengraph-image.tsx` con `ImageResponse` (H4). Composición: fondo con el degradado de marca, wordmark y tagline, todo con primitivas que Satori soporta (`div`, `flex`, gradientes CSS) — **sin imágenes remotas ni fuentes remotas**, que romperían un build sin red. Si `ImageResponse` exige una fuente explícita en esta versión, se embebe leyendo un `.ttf` del disco en tiempo de build; el flujo lo verifica con un build real antes de darlo por bueno.

### Consentimiento

**D10 — Registro declarativo, no lógica dispersa.** `src/config/cookies.ts` exporta la lista de tecnologías de almacenamiento con `{ id, category, name, purpose, storage, duration, provider }`. Es la fuente de verdad **única** para: el panel de preferencias, la tabla de la política de privacidad y los tests. Hoy contiene exactamente tres entradas reales (`vti-theme`, `vti-lang`, `vti-consent`), todas `necessary`. Las categorías `analytics` y `marketing` existen, están vacías y **por defecto desactivadas**.

**D11 — Categoría `necessary` no conmutable.** Su interruptor se renderiza `disabled` + `checked` con texto que explica por qué. Es lo que exige la guía de la AEPD y lo que evita el patrón oscuro de fingir una elección que no existe.

**D12 — Rechazar cuesta exactamente lo mismo que aceptar.** Los dos botones viven en la **primera capa** del banner, con la misma jerarquía visual (mismo componente `Button`, mismo `size`, variantes distintas pero ninguna atenuada) y el mismo número de clics: uno. Requisito expreso de la Guía de cookies de la AEPD ed. 2023, exigible desde 2024-01-11. Atado por test (§7.4).

**D13 — Consentimiento versionado y con caducidad.** `localStorage` clave `vti-consent`, valor `{ version, timestamp, categories }`. Si `version` no coincide con `CONSENT_VERSION` del código, o si han pasado más de `CONSENT_MAX_AGE_DAYS` (**365**), el registro se descarta y el banner vuelve. 365 y no 730: la guía de la AEPD fija el techo de referencia en 24 meses y un año queda holgadamente dentro; elegir el techo exacto no aporta nada y envejece peor. Sin ninguna tecnología no exenta desplegada, este parámetro no afecta hoy a nadie — existe para el día en que sí.

**D14 — El gate es una función, no un `if` repetido.** `hasConsent(category)` del contexto es el único punto por el que un script futuro puede pasar. Se documenta con un ejemplo real en la spec y en el vault. Sin este punto único, el primer script que llegue lo esquivará.

**D15 — El banner no bloquea.** `z-index: overlay` (900), no `modal` (1000): el visitante puede seguir leyendo y navegando sin decidir. No hay muro de cookies. Nada se carga hoy antes de decidir porque no hay nada que cargar. El **panel de preferencias** sí es un diálogo modal real (`z-index: modal`, `role="dialog"`, `aria-modal="true"`, foco atrapado, `Esc` cierra, foco devuelto al disparador).

**D16 — Retirar el consentimiento es tan fácil como darlo.** Enlace permanente «Preferencias de cookies» en la barra inferior del footer, junto a los legales, que reabre el panel desde cualquier página. Requisito del art. 7.3 RGPD por remisión.

**D17 — SSR-safe por construcción.** Nada de `localStorage` durante el render: el estado arranca en «sin decidir / todo denegado» y se sincroniza en un `useEffect` tras montar, exactamente el patrón que ya usan `ThemeProvider` (`ThemeProvider.tsx:45,49-63`) e `I18nProvider` (`I18nProvider.tsx:12-21`). Con `output: "export"` cualquier otra cosa rompe la hidratación.

### Accesibilidad

**D18 — `html lang` se sincroniza con el idioma. (Arregla un defecto real preexistente.)** Hoy `app/layout.tsx:38` fija `lang="es"` y nada lo actualiza: al pasar a inglés, todo lector de pantalla sigue pronunciando el contenido con fonética española. Es un incumplimiento de **WCAG 3.1.1 (Language of Page, nivel A)**. `I18nProvider` pasa a escribir `document.documentElement.lang` en el `useEffect` de sincronización y en cada `languageChanged`. No se puede resolver en el layout: es un Server Component y el idioma solo se conoce en cliente.

**D19 — Los enlaces legales del footer dejan de abrirse en pestaña nueva.** Hoy los tres usan `target="_blank"` (`Footer.tsx:379-430`) apuntando a marcadores externos. Siendo ya rutas internas, `target="_blank"` es un antipatrón: rompe el botón «atrás», desorienta a usuarios de lector de pantalla y no avisa del cambio de contexto (**WCAG 3.2.5**). Pasan a `next/link` normales. Los enlaces genuinamente externos (`docs`, `guides`) conservan su `target="_blank" rel="noopener noreferrer"`.

**D20 — Cabecera propia para las páginas legales, no el `Navbar`.** El `Navbar` está acoplado al hero (`useStage`, `useNavDetach`, anclas `#story`/`#journey`/`#features`/`#contact` que en `/privacidad` no existirían). Montarlo ahí produciría cuatro anclas muertas —exactamente el defecto que el footer arrastró durante dos entregas, documentado en `Footer.tsx:31-41`— y una barra con lógica de despegue sin nada de lo que despegarse. `LegalHeader` es una cabecera sobria: logo enlazado a `/`, `ThemeToggle`, `LanguageSelector`. El **`Footer` se reutiliza tal cual**: es autónomo y ya funciona en los dos temas.

> **D20 REVERTIDA el 2026-09-03** (decisión del dueño tras la crítica externa #16). Su premisa caducó: las anclas del modelo compartido son ABSOLUTAS desde la crítica #6 (`/#story`, verificado con clic real) y conscientes del idioma desde la #12 (`/en#story`), así que ninguna queda muerta al pulsarlas desde una página legal — navegan a la home y aterrizan en su sección. El defecto que forzó el cambio, medido: la 404 exponía 15 enlaces en su cabecera y las legales 3, o sea el mismo sitio con dos identidades según la página. Desde esa fecha `/privacidad` y `/aviso-legal` montan el `Navbar` completo, `LegalHeader.tsx` y su test están retirados, y el razonamiento íntegro vive en el docblock de `src/components/legal/documents/PrivacyDocument.tsx`. Las dos menciones de D20 que quedan más abajo (la tabla de ficheros tocados y la lista de descartes) son el registro de lo que ESTA entrega hizo aquel día y se conservan como historia.

**D21 — El documento legal se renderiza desde datos, no desde JSX por documento.** Cada documento es un árbol `{ id, heading, blocks[] }` en el JSON de locale, y **un solo** renderer lo pinta. Cuatro documentos × dos idiomas escritos como JSX serían ocho ficheros que divergen a la primera corrección. Además hace que el candado de paridad de `locales.test.ts` (que recorre rutas recursivamente, incluidos índices de array) compare **la estructura del documento**, no solo sus títulos: un párrafo añadido en español y olvidado en inglés pone el test en rojo.

**D22 — Índice de contenidos y `<h2>` anclados.** Cada sección lleva `id` estable y el documento abre con una lista de saltos. Es navegación por teclado real (WCAG 2.4.1) y, de paso, lo que hace citable un documento largo para un motor generativo (GEO): un ancla estable es la unidad que un modelo puede referenciar.

**D23 — Marcadores visibles, no invisibles.** Todo dato identificativo desconocido se renderiza como `POR_COMPLETAR` dentro de un `<mark>` con `title` explicativo, no como una cadena vacía ni como un texto plausible. Misma doctrina que `links.ts:1-9` («no se inventan URLs… falla de forma visible»). Atado por test (§7.2): si algún día alguien sustituye el marcador, el test le obliga a actualizarlo, y mientras tanto un despliegue accidental es imposible de pasar por alto.

---

## 4. Contenido legal: qué exige la norma y de dónde sale

Toda la investigación normativa está verificada con fuente oficial (BOE / EUR-Lex / AEPD) en el informe de reconocimiento; aquí queda el mapeo a secciones. Lo que la investigación **no** pudo confirmar literalmente se marca y se traslada a §9.

### 4.1 `/privacidad` — RGPD art. 13 + LOPDGDD art. 11

Modelo de **dos capas**, habilitado expresamente por el art. 11.1 LOPDGDD y descrito en la _Guía para el cumplimiento del deber de informar_ de la AEPD.

- **Primera capa** (tabla resumen): responsable, finalidad, legitimación, destinatarios, derechos.
- **Segunda capa**, con una sección por apartado del art. 13: 13.1.a (identidad y contacto del responsable), 13.1.b (DPO — se declara que no se ha designado y por qué), 13.1.c (fines y base jurídica), 13.1.d (interés legítimo), 13.1.e (destinatarios), 13.1.f (transferencias internacionales), 13.2.a (plazos), 13.2.b (derechos 15-22), 13.2.c (retirada del consentimiento), 13.2.d (reclamación ante la AEPD), 13.2.e (carácter obligatorio o no de facilitar datos), 13.2.f (decisiones automatizadas — se declara que no las hay).
- Sección propia de **almacenamiento en el terminal**, generada desde `cookies.ts` (D10), y sección de **alojamiento** (Netlify) como encargado del tratamiento.
- Sección **contacto**: se describe con precisión lo que el sitio hace de verdad —el formulario abre el cliente de correo del visitante mediante `mailto:`, el sitio no recibe ni almacena nada (verificado en `Contact.tsx:926-939`)— y se informa del tratamiento del correo una vez recibido.

### 4.2 `/aviso-legal` — LSSI-CE art. 10

Las **siete** letras, a) a **g)** (el art. 10 no termina en f), verificado en el texto consolidado del BOE): denominación y domicilio y correo; datos registrales; autorización administrativa si aplica; profesión regulada si aplica; NIF; precios si los hubiera; códigos de conducta. Las que hoy no se conocen van con marcador (D23); las que no aplican se declaran «no aplica» con su motivo, que es información, no relleno.

### 4.3 `/terminos` — sin contenido tasado por norma

No existe ley española que fije el contenido de unos términos de uso para un sitio de mera presentación. Se declara así en el propio documento. Cláusulas: objeto, aceptación, uso permitido, propiedad intelectual (RDL 1/1996), enlaces a terceros (GitHub, Discord), exención de responsabilidad, modificaciones, y ley aplicable y fuero. **Nota de diseño**: la cláusula de fuero se redacta sin renuncia al fuero del consumidor — el art. 90 TRLGDCU declara **abusivas y nulas** las cláusulas que impongan un fuero distinto al del domicilio del consumidor. Escribir la cláusula «estándar» de sumisión expresa sería escribir una cláusula nula.

Se declara explícitamente que el sitio **no comercializa nada**, por lo que no se activa el régimen de contratación electrónica (arts. 23-29 LSSI) ni la información precontractual (arts. 97-98 TRLGDCU).

### 4.4 `/accesibilidad` — declaración voluntaria

**Ámbito, dicho con precisión y sin inflar:** el RD 1112/2018 obliga al **sector público**, no a una empresa privada. La Directiva (UE) 2019/882 (EAA) y la Ley 11/2023 son aplicables desde el **2025-06-28** —fecha ya cumplida— pero su art. 2.2 enumera una lista **cerrada** de servicios en la que una web de presentación sin comercio electrónico no encaja; además el art. 4.5 exime a las microempresas. La investigación no halló pronunciamiento oficial sobre este supuesto concreto: se declara como interpretación fundamentada, no como certeza (§9).

→ La declaración se publica por tanto como **voluntaria**, y así lo dice su primera línea. Estructura tomada del modelo europeo (Decisión de Ejecución (UE) 2018/1523) porque es la referencia de buenas prácticas, con las cinco secciones: situación de cumplimiento · contenido no accesible · preparación de la declaración · observaciones y contacto · procedimiento de aplicación.

**Norma técnica:** EN 301 549 **V3.2.1** (marzo 2021) incorpora **WCAG 2.1 AA**. La V4.1.1 (WCAG 2.2 AA) está en curso sin confirmación de publicación. Se declara conformidad objetivo **WCAG 2.2 AA**, que es retrocompatible con 2.1 AA y evita reescribir el documento cuando entre en vigor.

**Situación declarada: conformidad parcial**, y se enumera lo realmente pendiente. Declarar «conformidad total» sin auditoría externa sería exactamente el tipo de afirmación que el protocolo de veracidad prohíbe. Lo que sí puede afirmarse con evidencia en el repo, y por tanto se afirma: contraste AA medido y atado por test (`contrast.ts`, `semantic.test.ts`, `BrandName.contrast.test.ts`), `prefers-reduced-motion` respetado en todo el sistema de movimiento (`GlobalStyles.tsx:160-172`), anillo de foco visible global (`GlobalStyles.tsx:155-158`), y navegación por teclado en los átomos. Lo pendiente conocido se enumera desde `docs/qa-3d-pendiente.md` y desde §9.

---

## 5. Arquitectura de ficheros y propiedad por flujo

**Regla dura de paralelismo:** ningún fichero tiene dos dueños. Los ficheros compartidos los edita **solo el hilo principal** en la fase de integración.

### Flujo S1 · SEO e indexación

| Fichero | Estado |
| --- | --- |
| `src/config/site.ts` | nuevo — URL canónica base, nombre, locale, descripciones por defecto |
| `src/config/site.test.ts` | nuevo |
| `src/seo/metadata.ts` | nuevo — `buildMetadata()` (D3) |
| `src/seo/metadata.test.ts` | nuevo |
| `src/seo/jsonLd.ts` | nuevo — constructores `Organization`, `WebSite`, `WebPage` (D6) |
| `src/seo/jsonLd.test.ts` | nuevo |
| `src/seo/JsonLdScript.tsx` | nuevo — Server Component de serialización. **Nombrado así, y no `JsonLd.tsx`, tras el renombrado que documenta la tabla de añadidos más abajo: colisionaba en mayúsculas con `jsonLd.ts`.** |
| `app/sitemap.ts` | nuevo — `force-static` (D7) |
| `app/sitemap.test.ts` | nuevo |
| `app/robots.ts` | nuevo — `force-static` (D8) |
| `app/robots.test.ts` | nuevo |
| `app/opengraph-image.tsx` | nuevo — `force-static` (D9) |

### Flujo S2 · Páginas legales

| Fichero | Estado |
| --- | --- |
| `src/config/legal.ts` | nuevo — entidad `POR_COMPLETAR`, fechas de versión, `LEGAL_ROUTES` |
| `src/config/legal.test.ts` | nuevo |
| `src/config/cookies.ts` | nuevo — registro declarativo (D10) |
| `src/config/cookies.test.ts` | nuevo |
| `src/components/legal/legalPage.parts.tsx` | nuevo — piezas con estilo |
| `src/components/legal/LegalHeader.tsx` | nuevo (D20) |
| `src/components/legal/LegalHeader.test.tsx` | nuevo |
| `src/components/legal/LegalDocument.tsx` | nuevo — renderer desde datos (D21, D22, D23) |
| `src/components/legal/LegalDocument.test.tsx` | nuevo |
| `src/i18n/locales/es/legal.json`, `en/legal.json` | nuevos — los 4 documentos |
| `src/components/legal/documents/{Privacy,Terms,Accessibility,LegalNotice}Document.tsx` | nuevos — los 4 envoltorios de cliente |
| ~~`app/<ruta>/page.tsx` + `<ruta>.client.tsx`~~ | **Reubicados durante la ejecución.** El plan original ponía cáscara y documento juntos bajo `app/`; lo implementado deja las 4 `page.tsx` en `app/` (integración, hilo principal) y los 4 componentes de cliente en `src/components/legal/documents/` (flujo S2). Motivo: así la frontera de propiedad entre S2 y la integración coincide con la frontera de directorios (`src/` para S2, `app/` para el hilo principal) y no hay dos autores escribiendo en la misma carpeta. Funcionalmente idéntico: sigue siendo cáscara-de-servidor + documento-de-cliente. |
| `app/legal-pages.test.tsx` | pasa a la integración — ver la tabla de añadidos |

Patrón por ruta (H2 + restricción de Next verificada: **una página que exporta `metadata` no puede llevar `"use client"`**): `page.tsx` es Server Component, exporta `metadata = buildMetadata(...)` y `<JsonLd>`, y renderiza `<XClient />`, que sí es `"use client"` y consume `useTranslation`.

### Flujo S3 · Consentimiento

| Fichero | Estado |
| --- | --- |
| `src/consent/consentTypes.ts` | nuevo |
| `src/consent/consentStorage.ts` | nuevo — versión + caducidad (D13) |
| `src/consent/consentStorage.test.ts` | nuevo |
| `src/consent/ConsentProvider.tsx` | nuevo — contexto, `useConsent()`, `hasConsent()` (D14, D17) |
| `src/consent/ConsentProvider.test.tsx` | nuevo |
| `src/components/consent/consent.parts.tsx` | nuevo |
| `src/components/consent/CookieBanner.tsx` | nuevo (D12, D15) |
| `src/components/consent/CookieBanner.test.tsx` | nuevo |
| `src/components/consent/CookiePreferences.tsx` | nuevo — diálogo modal (D11, D15) |
| `src/components/consent/CookiePreferences.test.tsx` | nuevo |
| `src/i18n/locales/es/consent.json`, `en/consent.json` | nuevos |

### Integración — hilo principal (Opus), después de S1-S3

| Fichero | Cambio |
| --- | --- |
| `app/layout.tsx` | `buildMetadata()` + `<JsonLd>` de `Organization`/`WebSite` |
| `app/providers.tsx` | monta `ConsentProvider` + `CookieBanner` |
| `app/page.tsx` | sin cambios de estructura; su metadata viene del layout |
| `src/i18n/config.ts` | registra `legal` y `consent` en `resources` y en `ns` |
| `src/i18n/I18nProvider.tsx` | D18 — sincroniza `document.documentElement.lang` |
| `src/i18n/I18nProvider.test.tsx` | nuevo — atado de D18 |
| `src/i18n/locales.test.ts` | añade `legal` y `consent` al array `namespaces` |
| `src/config/links.ts` | privacy/terms/accessibility → rutas internas; nueva clave `legalNotice` |
| `src/config/links.test.ts` | reescritura del candado (§7.5) |
| `src/components/layout/Footer/Footer.tsx` | D19 + enlace «Preferencias de cookies» |
| `src/components/layout/Footer/Footer.test.tsx` | actualiza los tests de enlaces legales |
| `src/i18n/locales/{es,en}/common.json` | clave `Common.Footer.legalNotice` y `Common.Footer.cookiePreferences` |

**Añadidos a la integración durante la ejecución, no previstos en el plan:**

| Fichero | Cambio | Motivo |
| --- | --- | --- |
| `src/seo/JsonLd.tsx` → `src/seo/JsonLdScript.tsx` | renombrado (fichero y símbolo) | Colisionaba con `src/seo/jsonLd.ts` **solo en mayúsculas**. TypeScript los trata como el mismo módulo: `TS1149: File name 'src/seo/JsonLd.ts' differs from already included file name 'src/seo/jsonLd.ts' only in casing`. En un sistema de ficheros sensible a mayúsculas serían dos módulos distintos con nombres indistinguibles a ojo, que es igual de malo. |
| `src/test/test-utils.tsx` | `AllProviders` monta `ConsentProvider` | Desde D16 el `Footer` consume `useConsent()`, y el `Footer` lo montan la home y las cuatro legales: sin el proveedor, todo test que renderice el pie fallaría por algo que no tiene que ver con lo que comprueba. |
| `netlify.toml` | cabecera `Content-Type` para `/opengraph-image` | D4-ter. |
| `app/legal-pages.test.tsx` | nuevo | Pasa de S2 al hilo principal: las cuatro `page.tsx` son de la integración, y este candado ata el punto de ENSAMBLAJE (que cada cáscara conecta su documento con su metadata), que ningún test de componente puede ver. |
| `src/i18n/locales.test.ts` | candado de marcadores es/en (§7.4-bis) | Defecto encontrado en verificación. |

---

## 6. Contratos comunes a todos los flujos

Idénticos a los de entregas anteriores de este repo, más los específicos de esta:

- Tokens del tema para todo rol de UI (`theme.data.*`). Cero colores/espaciados literales fuera de un `*.layers.ts`.
- Animar solo `transform`/`opacity`. Toda animación infinita lleva su bloque `@media (prefers-reduced-motion: reduce)` explícito: el colapso global de `GlobalStyles` usa `!important` y deja un fotograma arbitrario.
- React 19: sin `forwardRef`, `ref` como prop. Tipos de retorno explícitos. Sin `any` (`no-explicit-any` es **error** vía `tseslint.configs.recommended`).
- Sin strings de UI hardcodeados: todo por `t('ns:key')`, paridad es/en obligatoria.
- **Comentarios CSS dentro de un template de styled-components sin comillas de ningún tipo** — un backtick cierra el template y rompe el build (lección repetida tres veces en este repo).
- Prettier: comillas dobles, `printWidth` 80 por defecto, `singleAttributePerLine: true`, `endOfLine: "crlf"`.
- Nada de `localStorage` en render; solo en `useEffect` (D17).
- Tests: `renderWithProviders` de `@/test/test-utils`; para tema, `localStorage.setItem("vti-theme", …)` **antes** de renderizar + `waitFor` sobre una señal exclusiva de esa rama; las aserciones de copia comparan contra el JSON de locale importado, nunca contra un string escrito a mano.

---

## 7. Contratos de test

**7.1 SEO.** `buildMetadata()` devuelve `openGraph` y `twitter` **completos** para cada ruta (test explícito contra H2: aserción de que `openGraph.siteName`, `openGraph.locale` y `openGraph.type` están presentes en el resultado de cada ruta, no solo en el de la home). Canónica exacta por ruta, sin barra final. `robots.googleBot["max-image-preview"] === "large"`. `sitemap()` devuelve las 5 rutas con URL absoluta y `lastModified` estable entre dos llamadas. `robots()` incluye la URL del sitemap. Los ficheros `app/sitemap.ts` y `app/robots.ts` exportan `dynamic === "force-static"` — atado por test, porque es la línea cuyo olvido rompe el build (H1).

**7.2 Legal.** Los 4 documentos existen en `legal.json` en los dos idiomas con la misma estructura. Todo campo identificativo de `legal.ts` aún desconocido contiene `POR_COMPLETAR`; ninguno contiene un valor plausible-pero-inventado. Cada documento tiene `h1` único y todas sus secciones tienen `id` no vacío y **sin duplicados** (D22 — un ancla duplicada rompe el índice en silencio). La tabla de almacenamiento se genera desde `cookies.ts` y no desde una copia literal.

**7.3 Consentimiento — persistencia.** Un registro con `version` distinta a `CONSENT_VERSION` se descarta. Un registro con más de 365 días se descarta. Un registro corrupto (JSON inválido) se descarta sin lanzar. Guardar y releer preserva las categorías. `necessary` siempre `true` al leer, aunque el registro almacenado diga `false` (no es conmutable, D11).

**7.4 Consentimiento — interfaz.** Aceptar y rechazar están **los dos** en la primera capa, son `<button>`, con el mismo `size` (D12). El interruptor de `necessary` está `disabled` y `checked`. El panel tiene `role="dialog"` y `aria-modal="true"`, `Esc` lo cierra y el foco vuelve al disparador. Tras decidir, el banner desaparece y no reaparece al remontar.

**7.4-bis Marcadores de dato pendiente, es/en.** Candado escrito porque el defecto **ocurrió**: la primera traducción inglesa de `legal.json` tradujo el centinela `POR_COMPLETAR` como «PENDING» en sus 8 apariciones. La paridad de rutas de §7 no lo vio —las claves eran idénticas, lo que cambiaba era el contenido— y el renderer, que busca el literal para envolverlo en `<mark>`, no marcaba **nada** en inglés: medido en navegador real, `/accesibilidad` pintaba 2 marcas en español y **cero** en inglés. Un lector en inglés veía documentos que parecían completos sin estarlo. El marcador es un **centinela de máquina, no prosa**: idéntico en los dos idiomas. El candado compara el número de apariciones **documento a documento**, no el total (cinco de más en uno y cinco de menos en otro darían el mismo total).

**7.5 Candado de `links` reescrito, no relajado.** El test vigente afirma que privacy/terms/accessibility contienen `example.invalid` y `por-completar`; al pasar a rutas internas eso deja de ser cierto. Se sustituye por un candado **igual de fuerte**, siguiendo la doctrina que el propio fichero ya documenta (`links.test.ts:25-35`, sustitución previa de `playground`/`docs`/`guides`): aserción del valor **exacto** de cada ruta interna, más la invariante de que ninguna clave mezcla los dos regímenes. No se admite «es una URL válida».

**7.6 Accesibilidad (D18).** Test que ata la sincronización de `document.documentElement.lang`: tras `i18n.changeLanguage("en")`, el atributo vale `"en"`. Se ejecuta **con el bug inyectado** (quitando la línea) para comprobar que se pone rojo — un test de atributo que pasa en verde con y sin el arreglo no ata nada (lección de 2026-07-26 de este repo).

---

## 8. Verificación (además de la suite)

1. **`pnpm build` real** y comprobación en `out/`: existen `sitemap.xml`, `robots.txt`, `privacidad.html`, `terminos.html`, `accesibilidad.html`, `aviso-legal.html`, y el PNG de OG con firma y dimensiones correctas. Es la única forma de verificar H1 y H4: la suite de Vitest no ejecuta el pipeline de export.
2. **Inspección del HTML emitido** de las 5 rutas: `<link rel="canonical">`, `og:*` completos (incluidos `og:site_name` y `og:type`, que son justo los que H2 hace desaparecer si el diseño está mal), `twitter:*`, y el bloque JSON-LD parseable con `JSON.parse`.
3. **Navegador real** (dev server): las 4 rutas cargan, consola limpia, banner visible en primera visita y ausente tras decidir, panel operable **solo con teclado** (Tab/Shift+Tab/Esc), foco devuelto, y las 4 páginas legibles a 375 px sin scroll horizontal, en los dos temas.
4. **Gate completo** con salida literal: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check-format`.

---

## 8-bis. Resultado medido

Todo lo de esta sección es salida observada, no expectativa.

**Build (`pnpm build`, árbol `out/` limpio).** 11 rutas estáticas. `out/sitemap.xml` con las 5 URLs absolutas y `lastmod` `2026-08-05` en todas. `out/robots.txt` con `User-Agent: *` / `Allow: /` / `Sitemap:`, sin `Disallow`. `out/opengraph-image`: firma `89504e470d0a1a0a`, IHDR **1200×630**, 74 698 bytes.

**HTML emitido, las 5 rutas.** `<link rel="canonical">` correcta y sin barra final en las 5. `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:type` y `og:image` presentes en las 5 —incluidos `og:site_name` y `og:type`, que son justo los que H2 hace desaparecer si el diseño está mal—. `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` en las 5. `<meta name="googlebot">` con `max-video-preview:-1, max-image-preview:large, max-snippet:-1` en las 5. JSON-LD: 1 bloque (`Organization` + `WebSite`) en la home y 2 (más `WebPage`) en cada legal, **todos parseables con `JSON.parse`**.

**Contenido indexable prerenderizado** (el texto legal está en el HTML estático, no solo tras hidratar):

| Ruta | `h1` | `<h2>` | secciones con `id` | `<mark>` | texto visible |
| --- | --- | --- | --- | --- | --- |
| `/privacidad` | Política de privacidad | 17 | 17 | 11 | 9 030 car. |
| `/terminos` | Términos de uso | 9 | 9 | 0 | 3 801 car. |
| `/accesibilidad` | Declaración de accesibilidad | 7 | 7 | 2 | 3 667 car. |
| `/aviso-legal` | Aviso legal | 9 | 9 | 7 | 3 066 car. |

**Navegador real (dev server).** Banner: envoltorio `position: fixed`, `z-index: 900` (`overlay`), anclado abajo, `role="region"` — **no** `dialog`. «Aceptar» 106×44 y «Rechazar» 115×44: **misma altura, los dos en primera capa, un clic cada uno** (D12). Panel: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` que resuelve, `z-index` 1000 (`modal`); `necessary` marcado **y** deshabilitado, `analytics`/`marketing` desmarcadas; foco atrapado en los dos sentidos (Tab desde el último vuelve al primero, Shift+Tab desde el primero va al último); `Escape` cierra y **el foco vuelve al disparador**. Rechazar persiste `{"version":1,...,"analytics":false,"marketing":false}` y el banner **no reaparece** al navegar. El botón del pie reabre el panel desde cualquier página. Los 4 enlaces legales del pie: `target` `null` en los 4 (D19). Índice de `/privacidad`: 17 enlaces, **0 rotos**. Tabla de almacenamiento: `<caption>` presente, 5 `<th scope>`, 3 filas. Jerarquía de encabezados `1,2,2,2,2,2,2,2`, **sin saltos**. A 375 px: `scrollWidth` 375 = `clientWidth`, **cero elementos desbordando**, banner de 343 px con los 3 botones dentro. Consola: **sin errores**.

**Contraste medido** (canvas 1×1, no estimado — el repo ya pagó el error de leer `oklch()` con una expresión regular): marcador `<mark>` **7,72:1 en claro** y **10,03:1 en oscuro**; cuerpo del documento **11,65:1 en oscuro**. AA exige 4,5:1.

**D18 verificado fuera de jsdom:** con `vti-lang = "en"`, `document.documentElement.lang` vale `"en"` en el navegador real y el `h1` sale «Accessibility statement».

**Suite y gate:** ver §11.

## 9. Límites declarados (lo que esta entrega NO garantiza)

Se registran aquí y en el vault porque el encargo dice «SEO garantizado, legal preparado» y hay que ser preciso sobre qué significa cada palabra.

1. **Las páginas legales no son válidas para publicar hasta que se rellenen los `POR_COMPLETAR`.** Sin identidad del responsable no hay cumplimiento del art. 13.1.a RGPD ni del art. 10.a LSSI. La estructura está completa; los datos, por decisión explícita del usuario, no. Es el único bloqueante real de la entrega.
2. **Ni esta entrega ni su autor son asesoramiento jurídico.** El contenido sigue la norma citada con fuente verificable, pero una revisión por abogado antes de publicar es lo prudente, especialmente en la cláusula de fuero y en el alcance del EAA.
3. **Solo el español es indexable.** El i18n es de cliente con URL única (D1): el HTML estático que ve Google está en español. Habilitar inglés para buscadores exige enrutado por idioma, que es una reestructuración de la aplicación entera y queda fuera del brief. Recomendación registrada en el vault.
4. **«SEO garantizado» significa la capa técnica, no posiciones.** Lo que esta entrega garantiza y verifica: indexabilidad, canónicas correctas, metadata completa y no divergente, datos estructurados válidos, sitemap y robots emitidos. El posicionamiento depende de contenido, autoridad y competencia, y nadie puede garantizarlo.
5. **Puntos normativos que la investigación no pudo confirmar literalmente** (fuente inaccesible o inexistente): el pasaje exacto de la Guía de cookies de la AEPD sobre `localStorage` y sobre la vigencia de 24 meses (respaldados por fuentes secundarias coincidentes, no por el PDF original); que un sitio de presentación sin comercio electrónico esté expresamente excluido del ámbito de la Ley 11/2023; el alcance exacto de la modificación de la LSSI vía RDL 9/2024. Los tres se tratan con la interpretación más conservadora.
6. **La declaración de accesibilidad afirma conformidad parcial** y no está auditada por un tercero. Lo que afirma está respaldado por tests del repo; lo pendiente se enumera.
7. **`graphify-out/**` sigue fallando `check-format`.** Preexistente, artefactos generados, fuera del alcance.

---

## 10. Fuera de alcance (deliberadamente)

- Instalar Plausible o Umami: exige una cuenta y un dominio que solo el usuario puede dar, y el brief no lo pedía. El gate (D14) queda listo y documentado.
- Enrutado por idioma y `hreflang` (§9.3).
- `manifest.webmanifest` / PWA: no lo pedía el brief.
- Reescribir el `Navbar` para funcionar fuera de la home (D20 lo esquiva con una cabecera propia).
- Formatear `graphify-out/**`.

---

## 11. Gate de calidad (salida literal)

```
pnpm vitest run --maxWorkers=4
 Test Files  78 passed (78)
      Tests  917 passed (917)

pnpm typecheck   → $ tsc --noEmit          (exit 0, sin salida)
pnpm lint        → $ eslint .              (exit 0, sin salida)
pnpm check-format→ 17 ficheros, TODOS bajo graphify-out/ (preexistente, §9.7)

pnpm build       → ✓ 11 rutas estáticas prerenderizadas
```

Baseline de partida: 735 tests en 62 ficheros. Esta entrega suma **+182 tests y +16 ficheros de test**.

**Candados verificados en rojo con el bug inyectado a mano** (un test que pasa en verde con y sin el arreglo no ata nada). Los ficheros se copiaron al scratchpad antes de tocarlos y se restauraron desde esa copia — nunca con `git checkout`, que sobre un árbol sin commitear destruye trabajo (lección del 2026-07-28):

| Candado | Bug inyectado | Salida en rojo |
| --- | --- | --- |
| D19 — legales sin `target="_blank"` | `target="_blank"` devuelto a `ScFooterNavLink` | `/privacidad abre pestana: expected '_blank' to be null` |
| D18 — `html lang` sincronizado | suscripción a `languageChanged` retirada | `expected 'es' to be 'en'` |
| H2 — `openGraph` completo por página | `/terminos` con `openGraph: { title }` escrito a mano | `expected undefined to be 'VoidToInfinite'` |
| §7.4-bis — marcadores es/en | un `PENDING` devuelto al locale inglés | `expected 5 to be 4` |
| Foco atrapado hacia atrás | rama `if (event.shiftKey)` vaciada | `expected <button…> to be <button…>` |
| Bloqueo de scroll del diálogo | las dos líneas de `body.style.overflow` retiradas | `expected '' to be 'hidden'` |

### 11.1 Auditoría adversarial independiente

Un subagente separado, sin haber escrito ni una línea de la entrega, atacó el resultado con el encargo explícito de romperlo: inyectar a mano el bug que cada test dice proteger, verificar contra la fuente real cada afirmación comprobable de la prosa, y buscar lo que la spec exige y no está. Trabajó sobre copias en scratchpad y confirmó al terminar que dejó el árbol byte a byte como lo encontró.

**Confirmó como cazados** (bug inyectado → rojo → restaurado) once candados, entre ellos los que más fácil habrían sido de falsificar: un valor inventado en `LEGAL_ENTITY`; **cambiar el marcador `PLACEHOLDER` y su valor a la vez**, que es el ataque específico contra un test que compara una constante consigo misma (lo caza igual, porque el test asevera el literal `"POR_COMPLETAR"`); y renombrar `STORAGE_KEY` en `ThemeProvider.tsx`, que confirma que el candado de `cookies.ts` lee de verdad el fichero fuente en vez de compararse consigo mismo.

**Verificó contra la fuente** H1 (mensaje literal en `module.js:153`), H2 (`resolve-metadata.js:166-186`: `mergeMetadata` clona el padre pero el `case 'openGraph'` asigna solo lo del segmento actual), la fuente por defecto de `@vercel/og`, la ausencia real de cookies y analítica, el `mailto:` del formulario, la cita de `Navbar.tsx:406-411` en `LegalHeader`, y que la paridad i18n recorre de verdad los arrays (**267 rutas hoja, 235 con índice de array, 0 huérfanas**). También que la traducción inglesa es completa y no un resumen (ratio de longitud es/en 0,937, sin bloques fuera del rango 0,5-2,0) y que el aviso legal cubre las siete letras a-g del art. 10 LSSI-CE.

**Encontró cuatro huecos reales, los cuatro corregidos en esta misma entrega:**

| Severidad | Hallazgo | Corrección |
| --- | --- | --- |
| GRAVE | El atrapado de foco **hacia atrás** (Shift+Tab desde el primer elemento) no tenía **ningún** test: vaciando esa rama, los 32 tests de consentimiento seguían verdes. El código era correcto; el hueco era de regresión. | Test espejo, verificado en rojo. |
| GRAVE | El diálogo no bloqueaba el scroll del documento de detrás, así que `aria-modal="true"` declaraba una inercia que no existía. | `body.style.overflow` bloqueado y restaurado en el cleanup, con test. |
| MENOR | El contraste de `ScMark` no estaba atado por test, pese a que `/accesibilidad` afirma que el contraste está «respaldado por pruebas automatizadas». `contrast.test.ts` solo cubría superficies **opacas**; `ScMark` es la primera superficie del sistema con alfa. Pasaba AA de hecho. | `contrastRatioOverAlpha()` en `contrast.ts` + `legalPage.contrast.test.ts`: 6 casos (2 temas × 3 superficies) más una sonda de no-vacuidad. |
| MENOR | El sitio no tiene enlace de salto al contenido, y la declaración de accesibilidad **no lo listaba** entre sus pendientes. | Añadido a la lista de contenido no verificado, en los dos idiomas. No se añade un enlace de salto parcial solo en las legales: su impacto ahí es bajo (cabecera de 3 elementos + índice de contenidos al inicio) y dejaría la home sin él igualmente. |

**No encontró**: ningún acceso a `window`/`localStorage`/`document` fuera de un `useEffect` o de las funciones guardadas de `consentStorage`; ningún `Math.random()`/`Date.now()` en render del código nuevo; ninguna clave i18n consumida y no declarada, ni declarada y no consumida.

**Cobertura declarada por el propio auditor:** seis de los siete frentes completos; el recorrido literal de D1-D23 contra §7.1-§7.6 uno a uno lo cubrió por lectura de código pero no ítem a ítem, y lo dice explícitamente en vez de afirmar exhaustividad.
