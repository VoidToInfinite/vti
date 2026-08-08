# PRE-LAUNCH-QA — VoidToInfinite

Checklist previo a publicar el sitio. Consolida los informes de los auditores de arquitectura, visual/UX, rendimiento y SEO de la auditoría integral del 2026-08-08 (rama `feature/general-refactoring`, HEAD de partida `78987a2`).

Convención de casillas: `- [ ]` pendiente de verificar o de decidir; `- [x]` ya arreglado hoy en código y solo pendiente de confirmar en build/deploy (se indica explícitamente en cada caso). Ninguna casilla se marca por estar "probablemente bien" — solo por verificación ejecutada.

## 0. Cómo usar este documento

Tres orígenes de verificación distintos; no son intercambiables:

- **Contra `out/` local** (secciones 2 y 4): se generan con `pnpm build` y se inspeccionan los ficheros estáticos resultantes (HTML, JSON-LD, imágenes, sitemap, robots.txt) sin servidor. No requieren red ni despliegue.
- **Contra el sitio desplegado** (secciones 3 y 5): requieren el dominio real en producción (cabeceras HTTP, redirecciones, herramientas externas de Google/Facebook/X) o, en su defecto, `out/` servido en local con `pnpm start` (`npx serve out`) para las pruebas de rendimiento que no dependen de DNS/TLS reales.
- **Ojo humano** (sección 6): nada de esto lo detecta un comando. Requiere abrir el sitio en navegador real, en los viewports y condiciones indicadas, con la preferencia `prefers-reduced-motion` real del sistema activada donde se pida.

**Regla anti-regresión (léela antes de tocar nada más):** ninguna suite de este repo ejecuta el pipeline de export de Next.js. Un `pnpm test` o `pnpm check` en verde **no prueba nada sobre el HTML/JSON-LD/imágenes que realmente se sirven**. Después de cualquier cambio que toque SEO, metadata o rendimiento, el paso obligatorio es:

```
pnpm build
```

seguido de una re-auditoría manual de `out/` contra las secciones 2 y 4. Ver también la sección 7.

Gate de calidad completo del repo: `pnpm check` (typecheck + ESLint + formato) y `pnpm run ci` (añade `pnpm test`). Ninguno de los dos sustituye la re-auditoría de `out/`.

---

## 1. Bloqueante legal (impide publicar — sin excepciones)

Sin estos datos, `/privacidad` no cumple el art. 13.1.a RGPD y `/aviso-legal` no cumple los arts. 10.a) y 10.e) LSSI-CE. Los propios documentos legales lo declaran mientras el marcador `POR_COMPLETAR` siga presente. Estos datos **solo puede darlos el usuario/titular del sitio**; no se inventan ni se estiman.

- [ ] `LEGAL_ENTITY` completa en `src/config/legal.ts`: nombre o razón social, forma jurídica, NIF/CIF, domicilio y registro (mercantil u otro) donde corresponda.
- [ ] Los 6 marcadores `POR_COMPLETAR` resueltos en `src/i18n/locales/es/legal.json` y en `src/i18n/locales/en/legal.json` (paridad es/en).
- [ ] Garantía de transferencia internacional de datos de Netlify (dónde se alojan/procesan los datos que recoge el sitio).
- [ ] Plazo de conservación de los correos recibidos a través del sitio.
- [ ] Confirmación de que `hello@voidtoinfinite.com` está operativo y se supervisa.
- [ ] Proveedor de correo declarado en el aviso legal / política de privacidad si aplica.

---

## 2. SEO verificable en el build (contra `out/`, sin sitio vivo)

Ejecutar `pnpm build` primero. Todo lo de esta sección se inspecciona en los HTML generados en `out/` (home, `/privacidad`, `/aviso-legal`) y en `out/404.html`.

- [ ] Un solo `<title>` por página, ≤60 caracteres. Medido hoy: 49 / 39 / 28 — cumple.
- [ ] `<meta name="description">` única por página, 120-165 caracteres. Medido hoy: home 156 (cumple); `/privacidad` 179 y `/aviso-legal` 186 (se pasan del rango — aceptable en páginas legales por su naturaleza, pero conviene recortar si es fácil sin perder precisión legal).
- [ ] Una sola canónica (`<link rel="canonical">`) por página, apuntando a su propia URL absoluta.
- [ ] Ninguna página indexable emite dos `<meta name="robots">`.
- [x] `out/404.html` emite **solo** `noindex` y **no** emite canónica — arreglado hoy (404 como Server Component con metadata propia). Pendiente: verificar en el `out/` del build actual que el HTML generado refleja este cambio.
- [ ] Bloque Open Graph completo por página: `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:type`, `og:image` (+ `width`/`height`/`type`), y `twitter:card=summary_large_image`. `og:url` debe coincidir carácter a carácter con la canónica de esa misma página.
- [ ] Un solo `<h1>` por página, descriptivo y no solo la marca. Hoy hay exactamente un `<h1>` (`ScHeroBrand`) y su texto es solo «VoidToInfinite»: la tagline descriptiva que se probó el 2026-08-08 se retiró por decisión del usuario. **El ítem sigue abierto**: falta decidir cómo describir el sitio en el encabezado principal sin la pieza retirada.
- [ ] Jerarquía de encabezados sin saltos (h1 → h2 → h3, sin saltarse niveles) en las tres páginas.
- [ ] Cero `<img>` sin `alt`: decorativas con `alt=""`, informativas con texto real. Medido hoy: cumple.
- [ ] `robots.txt` permite `/`, declara el sitemap, y no bloquea `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` ni `ChatGPT-User` (fichero: `app/robots.ts`).
- [ ] `sitemap.xml` contiene las 3 URLs públicas en absoluto (home, `/privacidad`, `/aviso-legal`), ninguna retirada y sin incluir la 404. Cada `<loc>` coincide con la canónica de esa página. `lastModified` refleja un cambio real (se actualiza a mano en `app/sitemap.ts` — no es automático).
- [ ] JSON-LD parsea sin errores; `WebPage.isPartOf` apunta a `#website`, `WebSite.publisher` apunta a `#organization`, y todos los `@id` referenciados existen en el grafo. `WebPage.name` coincide con el `<title>` sin sufijo añadido.
- [x] `Organization` con `description` y `email` — añadidos hoy en el JSON-LD. Pendiente: confirmar en el build.
- [ ] Cero schema no verificable: sin `AggregateRating`, `Review`, `FAQPage`, `Product`, `Offer` ni `SearchAction` mientras esos hechos no existan de verdad (no se declara lo que no se puede sostener).
- [ ] `out/opengraph-image` (u homónimo generado por `app/opengraph-image.tsx`) es un PNG válido: firma PNG correcta, chunk `IHDR` con 1200×630. Medido hoy: OK, 74.845 bytes.
- [ ] `<html lang="es">` presente en las tres páginas. Sin `<meta name="keywords">` en ninguna.

---

## 3. SEO solo verificable con el sitio desplegado

Requiere el dominio real en producción (DNS, TLS, CDN/Netlify aplicados).

- [ ] `curl -I https://voidtoinfinite.com/opengraph-image` → `Content-Type: image/png`.
- [ ] Repetir la misma comprobación con la query string real que emite el HTML (ej. `?d4460d69e776f39c`) — **no basta con probar la URL sin query**: si la segunda llamada falla, la regla de `netlify.toml` no cubre la URL que realmente se comparte en redes.
- [ ] Ruta inexistente devuelve 404 real (no 200 disfrazado de 404).
- [ ] `/terminos` → redirección 301 a `/aviso-legal`.
- [ ] `/accesibilidad` → redirección 301 a `/`.
- [ ] `curl -I https://voidtoinfinite.com/robots.txt` y `.../sitemap.xml` → 200 con `Content-Type` correcto (`text/plain` y `application/xml` o equivalente).
- [ ] Sitemap enviado a Google Search Console y a Bing Webmaster Tools.
- [ ] Rich Results Test de Google en `/` y en `/privacidad` sin errores. Vigilar el aviso por el logo en SVG; si la herramienta avisa, exportar un PNG de respaldo para el logo del schema.
- [ ] Depurador de Open Graph de Facebook carga la imagen correctamente (esta prueba es la que caza el fallo de `Content-Type` si la regla de caché de Netlify no cubre la URL con query).
- [ ] Card Validator de X carga la imagen correctamente.
- [ ] Una sola versión canónica del dominio: `www` → sin `www` con 301, `HTTP` → `HTTPS` con 301.
- [ ] Con y sin barra final sirven el mismo contenido sin cadena de redirecciones (una sola redirección, no dos o tres encadenadas).
- [ ] Cabeceras de caché medidas en la pestaña Network del navegador contra el sitio real: `/_next/static/*` con `immutable`; `.webp` con `max-age` de varios días. Regla añadida hoy en `netlify.toml` — pendiente confirmar que Netlify la aplica tal cual en producción.

---

## 4. Presupuestos de rendimiento (medidos hoy contra el build local)

Los números de esta sección son los medidos hoy por el auditor de rendimiento. No se re-miden aquí: quien ejecute este checklist debe volver a medir y comparar contra estos mismos umbrales, especialmente en los ítems ya tocados hoy por cambios de código.

| Presupuesto | Umbral | Medido hoy | Estado |
| --- | --- | --- | --- |
| Primera visita, tema claro, escritorio 1440 DPR1 | ≤1,5 MB | 1.194.809 B | Cumple |
| Página entera, tema oscuro, móvil 390 DPR3 | ≤3 MB | 6.645.195 B | **No cumple** — bloqueado por la pista `srcset` intermedia pendiente (ver sección 5 de decisiones no aplicadas más abajo) |
| JS de la home | ≤250 KB gzip | 245.787 B | Cumple sin margen — el split del namespace `legal` fuera del bundle de la home se aplicó hoy; medir de nuevo tras el build |
| CSS bloqueante | ≤100 KB gzip | 29.474 B | Cumple |
| Fuentes en ventana crítica | ≤100 KB | 75.144 B | Cumple hoy; `JetBrains_Mono` salió de la precarga hoy (`preload: false`) — medir de nuevo |
| Ninguna imagen individual | >400 KB = fallo | 4 imágenes lo superan | **No cumple** |
| Imágenes | >2,5 bpp = fallo | 3 la superan: `story/cosmic-being/07-geometry.webp` 5,74 bpp · `07-geometry-1024.webp` 5,87 bpp · `01-nebula.webp` 3,37 bpp | **No cumple** |
| Peticiones a terceros | 0 | 0 | Cumple |

Checklist de verificación de esta tabla:

- [ ] Reproducir la medición de "primera visita, claro, escritorio 1440 DPR1" y confirmar ≤1,5 MB.
- [ ] Reproducir "página entera, oscuro, móvil 390 DPR3" tras aplicar la pista `srcset` intermedia (pendiente, no aplicada hoy) y confirmar que baja a los ~3,1 MB estimados.
- [ ] Re-medir el JS de la home gzip tras el split del namespace `legal` aplicado hoy.
- [ ] Re-medir fuentes en ventana crítica tras retirar la precarga de la mono.
- [ ] Identificar y recomprimir las 4 imágenes >400 KB.
- [ ] Recomprimir `07-geometry.webp`, `07-geometry-1024.webp` y `01-nebula.webp` por debajo de 2,5 bpp.
- [ ] Confirmar que siguen sin existir peticiones a terceros tras los cambios de hoy.

---

## 5. Rendimiento con `out/` servido en local

Servir con `pnpm start` (`npx serve out`) tras `pnpm build`, y medir sobre esa instancia local.

- [ ] **Con JS desactivado**, la home muestra el fondo del hero y el titular. Medido hoy: **FALLA** — el HTML sale en `opacity: 0` sin JS; pendiente de la entrega «estado inicial visible del hero en el HTML prerenderizado» (no aplicada hoy, ver decisiones pendientes).
- [ ] LCP <2,5 s en perfil Moto G Power / Slow 4G, en ambos temas (claro y oscuro).
- [ ] CLS <0,1. Atención: el swap de fuente está mitigado por las métricas de fallback de Next — confirmar que se siguen emitiendo tras los cambios de hoy en fuentes. El cambio de tema remonta 4 secciones y dispara reveals; medir CLS también durante esa transición, no solo en carga.
- [ ] Toda imagen no-absoluta declara `aspect-ratio` o `width`/`height` explícitos. Medido hoy: cumplen las 6 figuras existentes.
- [x] La cascada de red del primer viewport no contiene imágenes que no se muestren — mejorado hoy: `loading="eager"` retirado de 3 de las 4 capas de Aura (solo `field`, candidata a LCP, mantiene `fetchPriority="high"`). Pendiente: verificar en la pestaña Network que efectivamente solo se piden las capas visibles del primer viewport.
- [ ] INP <200 ms en las dos interacciones más caras de la interfaz: el botón de cambio de tema (remonta 4 secciones y puede disparar hasta 27 imágenes) y el selector de idioma.
- [x] Página en reposo sin trabajo por frame — mejorado hoy: `usePointer` como singleton de módulo (`useSyncExternalStore`, un único listener + un único `rAF` para toda la app, con parada por umbral de movimiento). Pendiente: verificar con el profiler de rendimiento del navegador que efectivamente no hay trabajo en reposo.
- [ ] Sin long tasks >50 ms fuera de la ventana de hidratación inicial.
- [ ] Coste de GPU: perfilar en dispositivo real las 27 capas con `mix-blend-mode` + `will-change` permanente, más el `backdrop-filter` de la barra de navegación. El `will-change` dinámico (solo activo durante la animación) queda pendiente, no aplicado hoy.

---

## 6. QA visual pendiente de ojo humano

Consolidado del auditor visual/UX. Nadie ha visto todavía un frame renderizado de este repo en navegador — toda esta sección parte de cero. Numeración continua 1-41 para poder referenciar cada ítem en comentarios de PR o de código.

### Bloqueantes antes de publicar (1-6)

- [ ] 1. Statement de Story: posible desbordamiento horizontal (`nowrap` en 3 sitios, con un tope estimado sin haber abierto un navegador real). Verificar a 320 / 375 / 768 / 1280 / 1920 px, en ES y EN, comprobando `body.scrollWidth === document.documentElement.clientWidth`.
- [ ] 2. Tarjetas de Features en reposo: ¿se distinguen del fondo? Hoy son blanco sobre `neutral[50]` sin borde ni sombra, con un contraste estimado de ~1,0:1. La intención de `7a2d2ac` quedó congelada hoy en el test correspondiente, pero falta la verificación visual real.
- [ ] 3. Figura de Journey a ≥1200px: ¿solapa la cabecera o el camino? Los valores actuales (`height: 150%`, `top: -50`, `right: -50`) rompen el invariante documentado en el docblock del componente — si la medición confirma la ruptura, reescribir el docblock para que describa el comportamiento real, no el previsto.
- [ ] 4. LCP real medido con Lighthouse sobre el build de producción, identificando qué elemento concreto de la página lo produce.
- [ ] 5. Contraste en el peor píxel del kicker, subtítulo y texto de apoyo del hero sobre la corona y el degradado pastel de fondo.
- [ ] 6. Reflow a 320px y zoom 200% (WCAG 1.4.10): confirmar que «VoidToInfinite» no se corta en ningún punto.

### Coreografía (7-16)

- [ ] 7. La carga se lee como una aparición, no como un salto brusco, en ambos temas.
- [ ] 8. El presupuesto de ~2,5 s del cambio de tema resulta aceptable a ojo.
- [ ] 9. La mascota es el último elemento en apagarse en la secuencia de transición.
- [ ] 10. El navbar no compite visualmente con la copia del hero.
- [ ] 11. `reduced-motion` observado con la preferencia real del sistema operativo activada (no simulada por devtools).
- [ ] 12. Coste de compositor moderado en un portátil real, no solo en el perfilador.
- [ ] 13. Con `decode()` artificialmente lento (throttling), la página no se lee como rota.
- [ ] 14. El reveal escalonado de Features en tema claro se lee como una cascada tanto en viewports altos como bajos.
- [ ] 15. El statement de Story se deshace en reversa sin parpadeo.
- [ ] 16. El reveal por scroll funciona en general: `IntersectionObserver` no deja de disparar en ningún panel oculto.

### Micro-interacciones (17-22)

- [ ] 17. Glow de hover de los CTAs: intensidad correcta, respiración de 1600 ms, sin recorte, y convive bien con el anillo de foco por teclado.
- [ ] 18. El degradado del CTA primario no se corta bruscamente al entrar o salir del hover.
- [ ] 19. `ThemeToggle` hace hover-lift correctamente en ambos temas.
- [ ] 20. El borde cónico de Features (animado con `@property`) gira y se lee como parte de la marca, no como un artefacto.
- [ ] 21. `mask-composite` se renderiza correctamente en Firefox y Safari (no solo Chromium).
- [ ] 22. Los desplegables del navbar no sufren recorte y su `visibility` se difiere de forma natural, sin parpadeo.

### Composición y arte (23-34)

- [ ] 23. Sin costuras, halos ni banding visibles en el ojo.
- [ ] 24. Encuadre vertical al 185% correcto.
- [ ] 25. El parallax al cursor se comporta bien (la pupila se mueve más que el párpado, sin revelar bordes transparentes).
- [ ] 26. La mascota en la pupila es coherente por tema: Wormhole en oscuro, Sol en claro; el halo del Sol no invade el párpado.
- [ ] 27. El logo es legible en el núcleo y su pulso está sincronizado.
- [ ] 28. El recorrido del degradado de 9 s no muestra desfase.
- [ ] 29. Sin banding en el pastel de Aura ni en la rampa violeta del pie de página.
- [ ] 30. El tamaño del Sol es proporcional al orbe; la copia no invade la mano izquierda en el encuadre 16:10 (EN).
- [ ] 31. Sin halos de des-premultiplicación en los bordes de las figuras.
- [ ] 32. Juicio estético final contra el mockup de referencia `Landing v2.dc.html`.
- [ ] 33. El navbar sobre el hero es invisible arriba, pasa a cristal al hacer scroll, y no parpadea en el umbral de los 8px.
- [ ] 34. Squash & stretch del despegue se ve natural.

### Modos especiales y peso (35-41)

- [ ] 35. `forced-colors: active` — el ojo, el velo, el pie de página y la costura desaparecen correctamente y el texto sigue siendo legible.
- [ ] 36. La pista de 1024px se sirve en móvil DPR3 real, sin descargar de más la variante de 1672px.
- [ ] 37. Peso de las pistas nativas de imagen: 4 de 6 superan el umbral orientativo de 150 KB — decidir si se recomprimen o se acepta el peso.
- [ ] 38. `check-spelling` está roto (76.035 incidencias en 228 ficheros, sin diccionario español configurado) — configurar el diccionario `es` en `.cspell.json` o retirar el script hasta tenerlo, para que deje de ser ruido.
- [ ] 39. Contraste AA del texto sobre degradados pastel: kickers y `textMuted` en las tarjetas de Journey y Contact.
- [ ] 40. El anillo de foco sobre elementos de arte cumple WCAG 2.4.11 (contraste 3:1 mínimo).
- [ ] 41. El indicador de idioma inactivo (`textSubtle`) es legible sobre la barra transparente del hero.

---

## 7. Anti-regresión

Ejecutar después de cualquier cambio que toque SEO, metadata o rendimiento — incluidos los cambios que resulten de marcar ítems de este mismo documento.

- [ ] `pnpm build` ejecutado sin errores.
- [ ] `out/` re-auditado manualmente contra las secciones 2 y 4 de este documento (un test verde en `pnpm test`/`pnpm check` no prueba nada sobre el HTML/JSON-LD/imágenes realmente emitidos — ninguna suite del repo ejecuta el pipeline de export).
- [ ] Comparación del `<head>` de las tres páginas (home, `/privacidad`, `/aviso-legal`) antes y después del cambio, buscando diferencias no intencionadas en título, descripción, canónica, Open Graph o JSON-LD.
- [ ] `pnpm run ci` en verde (typecheck + ESLint + formato + tests) como gate de deploy, tal como exige el pipeline definido hoy en `.github/workflows/ci.yml`.
