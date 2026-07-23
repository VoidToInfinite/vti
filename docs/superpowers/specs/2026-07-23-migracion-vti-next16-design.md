# Migración VTI a Next.js 16 — Diseño / Spec

- **Fecha:** 2026-07-23
- **Repo:** `vti` (VoidToInfinite) · remoto `https://github.com/VoidToInfinite/vti.git`
- **Rama de trabajo:** `feature/migracion-next16` (base `develop`)
- **Estado:** aprobado por el usuario, pendiente de plan de implementación.

## 1. Objetivo

Migrar el proyecto Next.js 13.1.6 (Pages Router, ~3 años sin tocar) a la **última versión estable (Next.js 16.2.x)**, con dependencias actualizadas y una **estructura profesional y limpia (lean)**, lista para construir *después* una landing de estética "Midjourney" y **desplegable en Netlify**.

**Alcance de este encargo = cimientos.** NO se construye la landing nueva aquí. Se entrega la base migrada, limpia, reestructurada, verificada y documentada en el vault.

### Criterio de éxito (medible)

1. `pnpm install` + `pnpm build` (con `output: 'export'`) producen un artefacto estático en `out/` en clon limpio, sin errores.
2. `pnpm check` (typecheck + lint flat + format) sin errores nuevos.
3. Vitest en verde (smoke tests de home y 404).
4. El export estático se sirve localmente y renderiza home + 404 con tema e i18n (es/en) funcionando.
5. `netlify.toml` presente y coherente con el build.
6. Contexto + spec + registro documentados en `vibe-ai-vault`.

## 2. Decisiones (confirmadas con el usuario)

| Eje | Decisión |
|---|---|
| Alcance | Solo cimientos (no construir la landing nueva ahora) |
| Contenido | Base limpia / lean: una landing de una página + 404 |
| Router | **App Router** |
| Despliegue | **Static export** (`output: 'export'`) en Netlify |
| Gestor de paquetes | **pnpm** + Corepack (migrar desde npm) |
| Estado | **Eliminar Redux**; `ThemeProvider` (Context + localStorage) |
| i18n | **es/en con recursos empaquetados** (sin http-backend ni host hardcodeado) |
| 3D / animación | **Eliminar** three/r3f/drei/lamina/gsap (código muerto tras limpieza); re-añadir al construir la landing |
| Estilos | **styled-components v6** con registry de App Router |

## 3. Estado de partida (resumen del mapeo)

- Next 13.1.6, React 18.2, TS 4.9, styled-components 5, Redux Toolkit, i18next + http-backend.
- 4 páginas: `index`, `reflection`, `game/tictactoe`, `404`. Landing/portfolio de marca **VTI** (sin nada de "Midjourney" en el código).
- Deuda técnica relevante:
  - `lamina` nunca importada; `CubeBackground` (escena r3f) es código muerto; `BackOrbs` 3D comentado → hoy es CSS.
  - `next-redux-wrapper` a medio cablear (`HYDRATE` no conectado al store real).
  - Doble sistema de notificaciones (Redux slice + Context) y de tema.
  - `"use client"` en 41 archivos siendo Pages Router (restos de intento previo de App Router).
  - Ruta rota `/games`; `pages/api/hello` y `taskApi` son mocks del scaffold.
  - i18n con host `https://voidtoinfinite.github.io` hardcodeado.
  - `tsconfig` con paths a 6 carpetas inexistentes; favicon 240 KB; SVG duplicados `public/` vs `src/assets/`.
  - Config ESLint airbnb muy estricta → 65+ `eslint-disable`.
  - Gate `isMounted` en `_app` (espera `window load`) que retrasa el render.

## 4. Arquitectura objetivo

```
app/
  layout.tsx          Raíz: <html>/<body>, providers (registry + theme + i18n), metadata API. Reemplaza _app + _document.
  page.tsx            Landing (versión limpia del home: Hero + About, sin scroll-snap ni 3D).
  not-found.tsx       404 i18n, sin auto-redirect ni strings hardcodeados.
src/
  lib/registry.tsx    Registry styled-components (useServerInsertedHTML + ServerStyleSheet). [client]
  theme/              tokens + BasicLightTheme/BasicDarkTheme + ThemeProvider (Context+localStorage). [client]
  i18n/               config react-i18next + recursos es/en empaquetados (import de JSON).
  components/
    ui/               Box, Flex, Grid, Button, Typography, Icon, CustomLink…
    sections/         Hero, About (piezas de la landing lean).
    layout/           Navbar, Footer, Socials, BackOrbs (CSS).
  styles/             GlobalStyles + utilidades de estilo (Margin/Padding/Flex/Grid…).
  hooks/ constants/ types/ assets/icons/
public/               favicon optimizado + imágenes deduplicadas.
tests/                (o co-localizados) smoke tests Vitest.
netlify.toml · next.config.ts · tsconfig.json · eslint.config.mjs · .nvmrc · .npmrc · pnpm-lock.yaml
```

Principio de aislamiento: cada unidad (theme, i18n, registry, cada componente) con un propósito claro, interfaz definida y testeable de forma independiente.

## 5. Plan por áreas

### 5.1 Versiones y tooling
- Next `16.2.x`, React `19.2`, react-dom `19.2`, TypeScript `5.x`, styled-components `6.x`, `@types/react(-dom)` al día.
- Node **22 LTS** (`.nvmrc` + `engines`). pnpm + Corepack; regenerar lockfile; eliminar `package-lock.json`.
- ESLint **flat config** (`eslint.config.mjs`): `next/core-web-vitals` + `typescript-eslint` + `jsx-a11y` + `import` + `prettier`. **Sin airbnb.**
- Prettier se mantiene. Retirar `stylelint-processor-styled-components` (deprecado). cspell se mantiene.
- Scripts: `dev`, `build`, `start` (o `serve` estático), `lint`, `typecheck`, `format`, `check`, `test`.

### 5.2 App Router + styled-components v6
- `src/lib/registry.tsx` con el patrón oficial (`useServerInsertedHTML`), envolviendo el árbol en `layout.tsx`.
- `compiler.styledComponents: true` en `next.config.ts`.
- Eliminar `_document`/`ServerStyleSheet` y el gate `isMounted`.
- styled-components v6: props transitorias `$`, `shouldForwardProp`, revisar `.attrs`. Actualizar `styled.d.ts`.

### 5.3 Static export
- `output: 'export'`, `images: { unoptimized: true }`.
- Eliminar `pages/api/*`, `src/api/taskApi.ts`, `cards.json`, `axios`.
- Sin SSR/ISR/middleware. Salida estática en `out/` (por defecto de `output: 'export'`); se retira el `distDir: 'build'` no estándar y se usa el default. `netlify.toml` publica `out`.

### 5.4 Estado
- Eliminar Redux por completo: `store`, `RootReducer`, slices (theme/notifications/page/ticTacToe), `next-redux-wrapper`, hooks tipados.
- `ThemeProvider` cliente: estado del tema activo + persistencia en `localStorage`, expuesto vía Context + hook `useTheme`.
- Se retira el sistema de notificaciones en la base lean (solo se usaba para toasts de cambio de idioma con strings hardcodeados). Se re-añadirá si la landing lo requiere.

### 5.5 i18n
- react-i18next + initReactI18next, **recursos empaquetados** (`import es from './locales/...'`).
- Namespaces mínimos (common, home). Idiomas es/en, `fallbackLng: 'es'`.
- Eliminar `i18next-http-backend` y el host hardcodeado. Selector de idioma sin strings hardcodeados.

### 5.6 3D / animación
- Eliminar dependencias y código: `three`, `@react-three/fiber`, `@react-three/drei`, `lamina`, `gsap`. Borrar `CubeBackground`, `ScrollSnap`, la parte GSAP de `Layout`.
- `BackOrbs` permanece como fondo CSS (glassmorphism).
- Nota: se re-añadirán a última versión cuando se construya la landing inmersiva.

### 5.7 Limpieza
- Rutas rotas (`/games`), `tsconfig` paths inexistentes, `"use client"` sobrantes, duplicación de SVG, favicon 240 KB, strings hardcodeados (404, notificaciones), typos del Footer.

### 5.8 Testing
- Vitest + Testing Library + jsdom. Config compatible con Next/React 19.
- Smoke tests: render de home (hero visible, cambio de idioma) y de `not-found`. Objetivo: DoD "tests en verde" real.

## 6. Despliegue Netlify
- `netlify.toml`: `command = "pnpm build"`, `publish = "out"`, `NODE_VERSION = 22`.
- Static export ⇒ sin `@netlify/plugin-nextjs`.

## 7. Verificación (Definition of Done)
- [ ] Clon limpio: `pnpm install && pnpm build` OK, artefacto estático generado.
- [ ] `pnpm check` sin errores (typecheck + lint flat + format).
- [ ] Vitest en verde.
- [ ] Export servido localmente: home + 404 + tema + i18n OK.
- [ ] `netlify.toml` coherente.
- [ ] Sin dependencias muertas ni código muerto residual (`three`, `gsap`, `axios`, `redux`, `next-redux-wrapper`, `lamina`, `@next/font`, `http-backend`).
- [ ] Causa raíz de los workarounds antiguos (isMounted, SSR styled) explicada y resuelta, no parcheada.
- [ ] Documentación en vault: contexto + spec + registro.

## 8. Git / entrega
- Rama `feature/migracion-next16`, commits incrementales con prefijo `VTI:`.
- **No push ni PR sin OK explícito del usuario** (acción de publicación).

## 9. Riesgos y mitigaciones
- **styled-components v5→v6 + App Router registry** (riesgo medio): seguir patrón oficial; verificar hidratación sin FOUC; revisar props transitorias.
- **i18n en estático** (bajo): recursos empaquetados eliminan el fetch y el host hardcodeado.
- **static export + rutas dinámicas** (bajo): la base no tiene rutas dinámicas tras la limpieza.
- **pnpm en Netlify** (bajo): fijar Node/pnpm en `netlify.toml`/Corepack.

## 10. Fuera de alcance (explícito)
- Construir la landing "Midjourney" (diseño/estética nueva).
- Re-introducir 3D/animaciones avanzadas.
- Backend, API real, i18n por ruta, SSR/ISR.
