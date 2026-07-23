# Migración VTI a Next.js 16 — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar la landing de marca VoidToInfinite (VTI) de Next.js 13 (Pages Router) a Next.js 16 (App Router), limpia/lean, con static export desplegable en Netlify.

**Architecture:** Reconstrucción del shell moderno (App Router + tooling) en el mismo repo, portando selectivamente solo las piezas buenas ya limpias (temas/tokens, tipografía, brand, iconos, textos i18n). Se elimina todo el código muerto (3D, Redux, gsap, notificaciones dobles). El estado global se reduce a un `ThemeProvider` (Context + localStorage). Estilos con styled-components v6 + registry oficial de App Router. i18n es/en con recursos empaquetados.

**Tech Stack:** Next.js 16.2.x, React 19.2, TypeScript 5.x, styled-components 6.4.x, react-i18next, Vitest + Testing Library, pnpm, Netlify (static export).

## Global Constraints

- Next.js **≥ 16.2** (evita el bug de styled-components de 16.1.x), React **19.2**, react-dom **19.2**, TypeScript **5.x**, styled-components **6.x**.
- Node **22 LTS**. Gestor de paquetes **pnpm** + Corepack. Un único lockfile: `pnpm-lock.yaml` (eliminar `package-lock.json`).
- `next.config.ts`: `output: 'export'`, `images.unoptimized: true`, `compiler.styledComponents: true`. Salida estática en `out/`.
- **Prohibido en el resultado final:** `redux`, `@reduxjs/toolkit`, `react-redux`, `redux-*`, `next-redux-wrapper`, `three`, `@react-three/*`, `lamina`, `gsap`, `axios`, `@next/font`, `i18next-http-backend`, `babel-plugin-styled-components`, `stylelint-*`.
- i18n: idiomas **es/en**, `fallbackLng: 'es'`, recursos **empaquetados** (sin fetch, sin host hardcodeado).
- Todo componente con interactividad/estado/hooks vive bajo la directiva `'use client'`. `app/layout.tsx` y `app/page.tsx` son Server Components (síncronos).
- ESLint **flat config** (`eslint.config.mjs`), sin `airbnb`. Prettier se mantiene.
- Commits con prefijo `VTI:`. **No `git push` ni PR sin OK explícito del usuario.**
- Rama de trabajo: `feature/migracion-next16` (ya creada).
- Fuente de estilos/temas/textos a portar: el árbol actual del repo (`src/themes/**`, `src/styles/**`, `public/i18n/**`, `src/assets/icons/**`, `src/components/**`).

---

## Estructura de ficheros objetivo

**Crear:**
- `app/layout.tsx` — root layout (html/body, providers, metadata API).
- `app/page.tsx` — landing (Hero + About).
- `app/not-found.tsx` — 404 i18n.
- `src/lib/registry.tsx` — registry styled-components (client).
- `src/providers/AppProviders.tsx` — compone registry + theme + i18n (client).
- `src/theme/ThemeProvider.tsx` — Context + localStorage (client), hook `useTheme`.
- `src/theme/themes.ts` — `basicLightTheme`, `basicDarkTheme`, `ThemeName`, `themes`.
- `src/theme/theme.types.ts` — tipos del tema (portado).
- `src/styles/GlobalStyles.tsx` — `createGlobalStyle` (portado/limpio).
- `src/i18n/config.ts` — init react-i18next con recursos empaquetados.
- `src/i18n/I18nProvider.tsx` — provider client.
- `src/i18n/locales/{es,en}/common.json`, `.../home.json` — recursos (portados de `public/i18n`).
- `src/components/**` — primitivas y secciones portadas/limpias.
- `styled.d.ts` — augmentation (actualizado).
- `next.config.ts`, `tsconfig.json` (reescrito), `eslint.config.mjs`, `.nvmrc`, `.npmrc`, `netlify.toml`.
- `vitest.config.ts`, `vitest.setup.ts`, `src/test/test-utils.tsx`.

**Eliminar (al final):** `pages/`, `src/api/`, `src/context/redux/`, `src/context/i18n/`, `src/redux*`, componentes 3D (`CubeBackground`), `ScrollSnap`, `_document`/`_app`/`_error`, `styled-components` stylelint configs, `package-lock.json`, y todo lo listado en "Prohibido".

---

## Task 1: Fundación de tooling (package.json, pnpm, Node)

**Files:**
- Modify: `package.json` (reescritura de deps y scripts)
- Create: `.nvmrc`, `.npmrc`
- Delete: `package-lock.json`

**Interfaces:**
- Produces: `pnpm` operativo con Next 16 / React 19 / styled-components 6 / TS 5 instalados; scripts `dev/build/lint/typecheck/format/check/test`.

- [ ] **Step 1: Escribir `.nvmrc`**

```
22
```

- [ ] **Step 2: Escribir `.npmrc`** (para pnpm + hoisting de peer deps que a veces necesita styled-components/Next)

```
engine-strict=true
```

- [ ] **Step 3: Reescribir `package.json`**

```json
{
  "name": "vti",
  "version": "1.0.0",
  "private": true,
  "contributors": ["VoidToInfinite <VoidToInfinite/vti>", "Daniel Mosquera"],
  "repository": "VoidToInfinite/vti",
  "bugs": { "url": "https://github.com/VoidToInfinite/vti/issues" },
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "npx serve out",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier . --write",
    "check-format": "prettier . --list-different",
    "check-spelling": "cspell --config=.cspell.json \"**/*.{md,mdx,ts,mts,cts,js,cjs,mjs,tsx,jsx}\"",
    "check": "pnpm typecheck && pnpm lint && pnpm check-format",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "i18next": "^25.0.0",
    "next": "^16.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-i18next": "^15.0.0",
    "styled-components": "^6.4.0",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "cspell": "^8.16.0",
    "eslint": "^9.17.0",
    "eslint-config-next": "^16.2.0",
    "eslint-config-prettier": "^9.1.0",
    "jsdom": "^25.0.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.18.0",
    "vitest": "^3.0.0"
  }
}
```

> Nota: las versiones son pisos mínimos con caret. Si al instalar `next` resuelve a `16.1.x`, forzar `next@^16.2.0` explícitamente por el bug de styled-components. Registrar las versiones resueltas reales tras `pnpm install`.

- [ ] **Step 4: Borrar el lockfile de npm**

Run: `rm package-lock.json`

- [ ] **Step 5: Activar Corepack e instalar**

Run:
```bash
corepack enable
pnpm install
```
Expected: instala sin errores de peer-deps bloqueantes; genera `pnpm-lock.yaml`. `node_modules/` presente.

- [ ] **Step 6: Verificar versiones resueltas**

Run: `pnpm ls next react styled-components typescript --depth 0`
Expected: `next` ≥ 16.2.0, `react` 19.2.x, `styled-components` 6.x, `typescript` 5.x.

- [ ] **Step 7: Commit**

```bash
git add package.json .nvmrc .npmrc pnpm-lock.yaml
git rm package-lock.json
git commit -m "VTI: Tooling foundation — pnpm, Node 22, Next 16 / React 19 / styled-components 6 deps"
```

---

## Task 2: Config base (next.config, tsconfig, gitignore, env types)

**Files:**
- Create: `next.config.ts`
- Modify: `tsconfig.json` (reescritura)
- Modify: `.gitignore` (añadir `out/`, `.next/`, quitar `build/`)
- Delete: `next.config.js`

**Interfaces:**
- Produces: build config para static export + styled-components SWC; `tsconfig` limpio con alias `@/*` → `./src/*`.

- [ ] **Step 1: Crear `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  compiler: { styledComponents: true },
  reactStrictMode: true,
  trailingSlash: false,
}

export default nextConfig
```

- [ ] **Step 2: Borrar `next.config.js`**

Run: `rm next.config.js`

- [ ] **Step 3: Reescribir `tsconfig.json`** (target moderno, `moduleResolution: "bundler"`, plugin next, alias limpio; se eliminan los paths a carpetas inexistentes)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "forceConsistentCasingInFileNames": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "styled.d.ts"],
  "exclude": ["node_modules", "out"]
}
```

- [ ] **Step 4: Actualizar `.gitignore`**

Asegurar que contiene (añadir las que falten, eliminar la línea `build/` si existía como dir de salida):
```
/node_modules
/.next/
/out/
next-env.d.ts
.env*.local
```

- [ ] **Step 5: Verificar typecheck en vacío**

Run: `pnpm typecheck`
Expected: sin errores (aún no hay código de app; `tsc` pasa). Si `next-env.d.ts` falta, se generará en el primer `next dev/build`.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts tsconfig.json .gitignore
git rm next.config.js
git commit -m "VTI: Config base — next.config.ts (static export), tsconfig limpio"
```

---

## Task 3: ESLint flat config + Prettier + limpieza de configs antiguas

**Files:**
- Create: `eslint.config.mjs`
- Delete: `.eslintrc.js`, `.eslintignore`, `.stylelintrc`, `.lintstagedrc`, `.lintstagedrc.js`
- Keep: `.prettierrc`, `.prettierignore`, `.editorconfig`, `.cspell.json`, `.cspell/`

**Interfaces:**
- Produces: `pnpm lint` operativo con reglas modernas (next core-web-vitals + typescript-eslint + prettier), sin airbnb.

- [ ] **Step 1: Crear `eslint.config.mjs`**

```js
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

const __dirname = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

export default tseslint.config(
  { ignores: ['node_modules', '.next', 'out', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals'),
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  eslintConfigPrettier,
)
```

> `next/core-web-vitals` incluye `eslint-plugin-react`, `react-hooks` y `jsx-a11y`. Se accede vía `FlatCompat` porque `eslint-config-next` aún exporta config legacy. Requiere `@eslint/eslintrc` (añadir a devDeps si `pnpm lint` se queja: `pnpm add -D @eslint/eslintrc`).

- [ ] **Step 2: Borrar configs antiguas**

Run: `rm .eslintrc.js .eslintignore .stylelintrc .lintstagedrc .lintstagedrc.js`

- [ ] **Step 3: Verificar lint en vacío**

Run: `pnpm lint`
Expected: sin errores (o solo warnings). Si falla por falta de `@eslint/eslintrc`, instalarlo y reintentar.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs package.json pnpm-lock.yaml
git rm .eslintrc.js .eslintignore .stylelintrc .lintstagedrc .lintstagedrc.js
git commit -m "VTI: ESLint flat config + retirada de airbnb/stylelint/lint-staged"
```

---

## Task 4: Tema + estilos globales + styled-components registry

**Files:**
- Create: `src/theme/theme.types.ts` (portado de `src/themes/Theme.types.ts`)
- Create: `src/theme/themes.ts` (portado de `src/themes/basic/BasicLightTheme.ts` + `BasicDarkTheme.ts`)
- Create: `src/theme/ThemeProvider.tsx`
- Create: `src/styles/GlobalStyles.tsx` (portado/limpio de `src/styles/GlobalStyles.tsx`)
- Create: `src/lib/registry.tsx`
- Modify: `styled.d.ts`

**Interfaces:**
- Produces:
  - `theme.types.ts`: `export interface ThemeDefinition { ... }` (estructura existente: color/background/breakPoint/typography…).
  - `themes.ts`: `export const basicLightTheme: ThemeDefinition`, `export const basicDarkTheme: ThemeDefinition`, `export type ThemeName = 'light' | 'dark'`, `export const themes: Record<ThemeName, ThemeDefinition>`.
  - `ThemeProvider.tsx`: `export function ThemeProvider({ children }: { children: React.ReactNode })`, `export function useTheme(): { themeName: ThemeName; toggleTheme: () => void; setThemeName: (n: ThemeName) => void }`.
  - `registry.tsx`: `export default function StyledComponentsRegistry({ children })`.
  - `useTheme` es consumido por Navbar/Footer (Task 8).

- [ ] **Step 1: Portar tipos del tema**

Copiar `src/themes/Theme.types.ts` → `src/theme/theme.types.ts`. Renombrar el tipo raíz a `ThemeDefinition` si no lo es. Mantener la estructura (color con escalas 100-900, background, breakPoint, typography). No cambiar la forma de los datos.

- [ ] **Step 2: Portar los temas**

Crear `src/theme/themes.ts` combinando `BasicLightTheme.ts` y `BasicDarkTheme.ts`:

```ts
import type { ThemeDefinition } from './theme.types'

export const basicLightTheme: ThemeDefinition = {
  /* pegar el objeto de BasicLightTheme.ts (la parte `data`/paleta HSL) */
}

export const basicDarkTheme: ThemeDefinition = {
  /* pegar el objeto de BasicDarkTheme.ts */
}

export type ThemeName = 'light' | 'dark'

export const themes: Record<ThemeName, ThemeDefinition> = {
  light: basicLightTheme,
  dark: basicDarkTheme,
}
```

> Los temas antiguos podían estar envueltos como `{ data: {...} }` (ver `styled.d.ts`). Mantener esa forma: si `DefaultTheme` es `{ data: ThemeDefinition }`, entonces `basicLightTheme` debe incluir el objeto que va dentro de `data`, y el provider inyecta `{ data: theme }`. Decidir según el `styled.d.ts` real y ser consistente (ver Step 5).

- [ ] **Step 3: Crear `src/lib/registry.tsx`** (patrón oficial Next 16 / styled-components 6)

```tsx
'use client'

import React, { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode
}) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet())

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement()
    styledComponentsStyleSheet.instance.clearTag()
    return <>{styles}</>
  })

  if (typeof window !== 'undefined') return <>{children}</>

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  )
}
```

- [ ] **Step 4: Crear `src/theme/ThemeProvider.tsx`** (Context + localStorage + styled-components ThemeProvider)

```tsx
'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider as SCThemeProvider } from 'styled-components'
import { themes, type ThemeName } from './themes'

const STORAGE_KEY = 'vti-theme'

interface ThemeContextValue {
  themeName: ThemeName
  toggleTheme: () => void
  setThemeName: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('light')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null
    if (stored === 'light' || stored === 'dark') setThemeName(stored)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, themeName)
  }, [themeName])

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(
    () => ({ themeName, toggleTheme, setThemeName }),
    [themeName, toggleTheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      <SCThemeProvider theme={{ data: themes[themeName] }}>{children}</SCThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

> El `theme` que se pasa a `SCThemeProvider` debe coincidir con `DefaultTheme` de `styled.d.ts`. Si `styled.d.ts` declara `{ data: ThemeDefinition }`, se pasa `{ data: themes[themeName] }` (como arriba). Ajustar si la forma difiere.

- [ ] **Step 5: Actualizar `styled.d.ts`**

Alinear con la forma anterior. Ejemplo si el tema es `{ data: ThemeDefinition }`:
```ts
import 'styled-components'
import type { ThemeDefinition } from '@/theme/theme.types'

declare module 'styled-components' {
  export interface DefaultTheme {
    data: ThemeDefinition
  }
}
```

- [ ] **Step 6: Portar `GlobalStyles.tsx`**

Copiar `src/styles/GlobalStyles.tsx` → nuevo `src/styles/GlobalStyles.tsx`. Mantener `createGlobalStyle`. Limpiar: quitar cualquier `"use client"` sobrante (los estilos globales se montan desde un client boundary, no necesitan la directiva ellos mismos), y sustituir accesos al tema por la forma consistente (`${({ theme }) => theme.data.color...}`). Quitar `transition: all .5s linear` del body (anti-patrón de rendimiento; animar solo propiedades concretas si hace falta).

- [ ] **Step 7: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores en `src/theme/**`, `src/styles/**`, `src/lib/**`, `styled.d.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/theme src/styles/GlobalStyles.tsx src/lib/registry.tsx styled.d.ts
git commit -m "VTI: Tema (Context+localStorage), GlobalStyles y registry styled-components v6"
```

---

## Task 5: Shell App Router (layout + page mínima + not-found) — primer build

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (placeholder mínimo, se enriquece en Task 8)
- Create: `app/not-found.tsx` (placeholder mínimo, i18n en Task 6)
- Create: `src/providers/AppProviders.tsx`

**Interfaces:**
- Consumes: `StyledComponentsRegistry` (Task 4), `ThemeProvider` (Task 4), `GlobalStyles` (Task 4).
- Produces: `AppProviders` (client) que envuelve registry + theme (+ i18n en Task 6); build estático funcional en `out/`.

- [ ] **Step 1: Crear `src/providers/AppProviders.tsx`**

```tsx
'use client'

import React from 'react'
import StyledComponentsRegistry from '@/lib/registry'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { GlobalStyles } from '@/styles/GlobalStyles'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider>
        <GlobalStyles />
        {children}
      </ThemeProvider>
    </StyledComponentsRegistry>
  )
}
```

> Si `GlobalStyles` es export default en su fichero, ajustar el import. Mantener un único export nombrado `GlobalStyles` por consistencia (editar el fichero de Task 4 si hace falta).

- [ ] **Step 2: Crear `app/layout.tsx`** (Server Component, metadata API)

```tsx
import type { Metadata, Viewport } from 'next'
import { AppProviders } from '@/providers/AppProviders'

export const metadata: Metadata = {
  title: 'VoidToInfinite',
  description: 'VoidToInfinite — presente y futuro de un equipo creativo.',
  metadataBase: new URL('https://voidtoinfinite.com'),
  openGraph: {
    title: 'VoidToInfinite',
    description: 'VoidToInfinite — presente y futuro de un equipo creativo.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
```

> El `lang` se fija a `es` (idioma por defecto). El cambio de idioma en cliente no reescribe `<html lang>` en static export; es aceptable para la base. `metadataBase` usa un dominio placeholder; ajustar cuando se conozca el dominio de Netlify.

- [ ] **Step 3: Crear `app/page.tsx`** (placeholder mínimo build-safe)

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>VoidToInfinite</h1>
    </main>
  )
}
```

- [ ] **Step 4: Crear `app/not-found.tsx`** (placeholder mínimo)

```tsx
export default function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <p>Página no encontrada.</p>
    </main>
  )
}
```

- [ ] **Step 5: Build estático (milestone)**

Run: `pnpm build`
Expected: build OK con Turbopack; genera `out/index.html` y `out/404.html`. Si aparece "Failed to load external module styled-components-…", confirmar `next` ≥ 16.2.0 (Task 1) y reintentar; como mitigación temporal, probar `pnpm build --webpack`.

- [ ] **Step 6: Verificar salida estática**

Run: `ls out` (debe incluir `index.html`, `404.html`, `_next/`)
Expected: ficheros presentes.

- [ ] **Step 7: Servir y comprobar en el navegador (humano/subagente con browser)**

Run: `npx serve out` y abrir `http://localhost:3000`.
Expected: se ve "VoidToInfinite"; `/ruta-inexistente` muestra el 404. Sin errores de consola de hidratación/estilos.

- [ ] **Step 8: Commit**

```bash
git add app src/providers/AppProviders.tsx
git commit -m "VTI: Shell App Router (layout+page+not-found) con providers y static export funcional"
```

---

## Task 6: i18n empaquetado (es/en) + provider + not-found i18n

**Files:**
- Create: `src/i18n/locales/es/common.json`, `src/i18n/locales/en/common.json`, `src/i18n/locales/es/home.json`, `src/i18n/locales/en/home.json` (portados de `public/i18n/**`)
- Create: `src/i18n/config.ts`
- Create: `src/i18n/I18nProvider.tsx`
- Modify: `src/providers/AppProviders.tsx` (añadir I18nProvider)
- Modify: `app/not-found.tsx` (usar i18n)

**Interfaces:**
- Consumes: `AppProviders` (Task 5).
- Produces: `initI18n()`/instancia i18n; `I18nProvider` (client); `useTranslation` disponible en client components.

- [ ] **Step 1: Portar recursos**

Copiar el contenido de `public/i18n/common/{es,en}.json` y `public/i18n/home/{es,en}.json` a los nuevos ficheros bajo `src/i18n/locales/**`. Descartar el namespace `reflection` (página eliminada). Añadir a `common` las claves para el 404 (`notFound.title`, `notFound.message`) y para el selector de idioma (sin strings hardcodeados).

- [ ] **Step 2: Crear `src/i18n/config.ts`**

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import esCommon from './locales/es/common.json'
import enCommon from './locales/en/common.json'
import esHome from './locales/es/home.json'
import enHome from './locales/en/home.json'

export const defaultNS = 'common'

export const resources = {
  es: { common: esCommon, home: esHome },
  en: { common: enCommon, home: enHome },
} as const

let initialized = false

export function initI18n() {
  if (initialized) return i18n
  i18n.use(initReactI18next).init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    defaultNS,
    ns: ['common', 'home'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  initialized = true
  return i18n
}

export default i18n
```

- [ ] **Step 3: Crear `src/i18n/I18nProvider.tsx`**

```tsx
'use client'

import React from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { initI18n } from './config'

initI18n()

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
```

- [ ] **Step 4: Añadir I18nProvider a `AppProviders`**

Envolver dentro del árbol (entre ThemeProvider y children):
```tsx
import { I18nProvider } from '@/i18n/I18nProvider'
// ...
<ThemeProvider>
  <GlobalStyles />
  <I18nProvider>{children}</I18nProvider>
</ThemeProvider>
```

- [ ] **Step 5: Convertir `app/not-found.tsx` a i18n** (client, porque usa hooks)

```tsx
'use client'

import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation('common')
  return (
    <main>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.message')}</p>
    </main>
  )
}
```

- [ ] **Step 6: Build + typecheck**

Run: `pnpm typecheck && pnpm build`
Expected: OK. `out/404.html` renderiza el texto por defecto (es). Verificar que `resolveJsonModule` permite el import de JSON (ya activado en tsconfig).

- [ ] **Step 7: Commit**

```bash
git add src/i18n app/not-found.tsx src/providers/AppProviders.tsx
git commit -m "VTI: i18n es/en empaquetado (sin http-backend) + 404 traducido"
```

---

## Task 7: Portar primitivas de UI (Typography, Box/Flex/Grid, Button, Icon)

**Files:**
- Create: `src/components/ui/Typography/Typography.tsx` (+ `.types.ts`)
- Create: `src/components/ui/Box`, `Flex`, `Grid` (portados de `src/components/containers/**`)
- Create: `src/components/ui/Button` (portado de `src/components/featured/Button/**`)
- Create: `src/components/ui/Icon` + `src/assets/icons/**` (deduplicado)
- Create: `src/styles/` utilidades (portadas de `src/styles/FlexStyles`, `GridStyles`, `MarginPadding`, `HeightWidthStyles`)
- Create: `src/types/**` (los tipos de estilo que consuman las primitivas)

**Interfaces:**
- Produces: primitivas reutilizables tipadas para las secciones (Task 8). `Typography` con prop `type` (h1..h6, p1/p2, pHeroTitle/pHeroText…). `Icon` con prop `name`.

- [ ] **Step 1: Portar utilidades de estilo y tipos**

Copiar de `src/styles/*` (FlexStyles, FlexAdditionalStyles, GridStyles, GridAdditionalStyles, HeightWidthStyles, MarginPadding) y sus tipos en `src/types/*`. Mantener la API. Quitar `"use client"` sobrantes. Ajustar accesos al tema a la forma `theme.data.*`.

- [ ] **Step 2: Portar `Typography`**

Copiar `src/components/featured/Typography/**`. Añadir `'use client'` solo si usa hooks (probablemente no; es styled puro → puede quedarse sin la directiva y renderizarse dentro del client boundary). Mantener el mapa `type → styled component`.

- [ ] **Step 3: Portar `Box/Flex/Grid`**

Copiar `src/components/containers/{Box,Flex,Grid}/**` → `src/components/ui/**`. Ajustar imports de estilos/tipos a las nuevas rutas.

- [ ] **Step 4: Portar `Button` e `Icon`**

Copiar `Button` y `Icon` (+ `src/utils/AppIconRoutes.ts` y los SVG-as-TSX necesarios desde `src/assets/icons/**`). Deduplicar: usar solo `src/assets/icons` como fuente única (los SVG en `public/images` que dupliquen se retiran en Task 10). Portar solo los iconos realmente usados por la landing (brand, redes, idioma, flechas); no arrastrar los ~200.

- [ ] **Step 5: Migrar props a styled-components v6**

En todos los styled components portados: convertir props no-DOM a **props transitorias** con prefijo `$` (p. ej. `$active`, `$variant`) para evitar warnings de v6. Revisar usos de `.attrs` con función. Verificar que no se reenvían props inválidas al DOM.

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui src/styles src/types src/assets/icons src/utils/AppIconRoutes.ts
git commit -m "VTI: Primitivas UI portadas a styled-components v6 (Typography, Box/Flex/Grid, Button, Icon)"
```

---

## Task 8: Landing lean (Navbar, Hero, About, Footer, Socials, BackOrbs)

**Files:**
- Create: `src/components/layout/Navbar/Navbar.tsx` (portado/limpio)
- Create: `src/components/layout/Footer/Footer.tsx` (portado/limpio)
- Create: `src/components/layout/Socials/Socials.tsx` (portado)
- Create: `src/components/layout/BackOrbs/BackOrbs.tsx` (solo CSS; sin three.js)
- Create: `src/components/layout/LanguageSelector/LanguageSelector.tsx` (sin strings hardcodeados)
- Create: `src/components/sections/Hero/Hero.tsx`
- Create: `src/components/sections/About/About.tsx`
- Create: `src/components/shared/Brand/BrandName.tsx` (portado)
- Modify: `app/page.tsx` (componer Hero + About)

**Interfaces:**
- Consumes: `useTheme` (Task 4), `useTranslation` (Task 6), primitivas UI (Task 7).
- Produces: landing de una página completa y funcional.

- [ ] **Step 1: Portar `BrandName` y `Socials`**

Copiar `src/components/shared/Brand/**` y `src/components/shared/Socials/**`. Ajustar imports. `Socials` usa iconos de redes (discord/github/instagram) con las URLs reales existentes (`discord.gg/CuGhqdG3g3`, `voidtoinfinite`).

- [ ] **Step 2: Crear `BackOrbs` (CSS puro)**

Portar solo la parte CSS de `src/components/featured/BackOrbs/BackOrbs.tsx` (los 4 divs styled con glassmorphism). **No** portar el bloque three.js comentado. Es un fondo decorativo posicionado absoluto.

- [ ] **Step 3: Crear `LanguageSelector`** (client)

Portar `src/components/featured/LanguageSelector/**`. Sustituir toda notificación/strings hardcodeados por `i18n.changeLanguage(lng)` directo. Idiomas es/en desde `src/constants/languages.ts` (portar). Sin dependencia de Redux ni del sistema de notificaciones.

- [ ] **Step 4: Crear `Navbar` (client)**

Estructura: `BrandName` + `LanguageSelector` + botón de tema (`useTheme().toggleTheme`). Portar de `src/components/shared/Navbar/**` pero **quitar** el enlace roto `/games` y los items de páginas eliminadas. Solo marca + selector idioma + toggle tema.

- [ ] **Step 5: Crear `Footer` (client)**

Portar `src/components/shared/Footer/**`. Corregir typos (`Coockie`→`Cookie`, `Interes`→`Interés`). Enlaces sin `href=""`: usar `#` o eliminar los placeholders legales. Mantener el toggle de tema si se desea (o dejarlo solo en Navbar). `Socials` + copyright.

- [ ] **Step 6: Crear `Hero` (client)**

Sección above-the-fold: `BrandName`, tagline desde `t('home:hero.text')` (usar las claves existentes de `home/es.json`), `Socials`, y un indicador de scroll/CTA. Sin `ScrollSnap` ni GSAP. Fondo: `BackOrbs`.

- [ ] **Step 7: Crear `About` (client o server)**

Sección corta: logo VTI (Icon) + descripción desde `t('home:about.*')`. Puede ser server component si no usa hooks; si usa `useTranslation`, marcar `'use client'`.

- [ ] **Step 8: Componer `app/page.tsx`**

```tsx
import { Navbar } from '@/components/layout/Navbar/Navbar'
import { Hero } from '@/components/sections/Hero/Hero'
import { About } from '@/components/sections/About/About'
import { Footer } from '@/components/layout/Footer/Footer'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 9: Build + verificación visual**

Run: `pnpm build && npx serve out`
Expected: landing completa renderiza; cambio de idioma es/en funciona; toggle de tema claro/oscuro funciona y persiste (recargar mantiene el tema); sin errores de consola.

- [ ] **Step 10: Commit**

```bash
git add src/components app/page.tsx src/constants/languages.ts
git commit -m "VTI: Landing lean — Navbar, Hero, About, Footer, Socials, BackOrbs (CSS)"
```

---

## Task 9: Vitest + Testing Library + smoke tests

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `src/test/test-utils.tsx`
- Create: `src/components/sections/Hero/Hero.test.tsx`
- Create: `app/not-found.test.tsx`
- Modify: `package.json` (scripts test ya añadidos en Task 1)

**Interfaces:**
- Consumes: `AppProviders`/providers, componentes de Task 8.
- Produces: suite Vitest verde; DoD "tests en verde" real.

- [ ] **Step 1: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

- [ ] **Step 2: Crear `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { initI18n } from '@/i18n/config'

initI18n()
```

- [ ] **Step 3: Crear `src/test/test-utils.tsx`** (render con providers de tema + i18n)

```tsx
import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { ThemeProvider } from '@/theme/ThemeProvider'
import i18n from '@/i18n/config'

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>{children}</ThemeProvider>
    </I18nextProvider>
  )
}

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
```

- [ ] **Step 4: Escribir test de `Hero` (fallará primero)**

```tsx
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { Hero } from '@/components/sections/Hero/Hero'

describe('Hero', () => {
  it('muestra el nombre de marca VoidToInfinite', () => {
    renderWithProviders(<Hero />)
    expect(screen.getByText(/VoidToInfinite/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Ejecutar y ver el estado**

Run: `pnpm test`
Expected: si `Hero` ya renderiza el brand, PASA; si el texto no coincide, ajustar el `getByText` a la clave i18n real (`t('home:hero.title')`). El objetivo es un test que valide render real, no un texto inventado.

- [ ] **Step 6: Escribir test de `not-found`**

```tsx
import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import NotFound from './not-found'

describe('NotFound', () => {
  it('renderiza el mensaje 404 traducido', () => {
    renderWithProviders(<NotFound />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Ejecutar la suite**

Run: `pnpm test`
Expected: PASS (2 archivos, ≥2 tests).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts vitest.setup.ts src/test app/not-found.test.tsx src/components/sections/Hero/Hero.test.tsx
git commit -m "VTI: Vitest + Testing Library con smoke tests (Hero, not-found)"
```

---

## Task 10: Netlify + limpieza final + verificación integral

**Files:**
- Create: `netlify.toml`
- Delete: `pages/`, `src/api/`, `src/context/`, `src/components/containers/`, `src/components/featured/CubeBackground/`, `src/components/featured/ScrollSnap/` (si no portados), `src/redux*`, restos de `_app/_document/_error`, SVG duplicados en `public/images` ya presentes en `src/assets`, y cualquier fichero con `"use client"` huérfano no portado.
- Modify: `public/favicon.ico` (optimizar/reemplazar por uno < 50 KB) o migrar a `app/icon.png`.
- Modify: `README.md`

**Interfaces:**
- Produces: repo limpio, sin dependencias/código muerto; deploy Netlify configurado; DoD completa.

- [ ] **Step 1: Crear `netlify.toml`**

```toml
[build]
  command = "pnpm build"
  publish = "out"

[build.environment]
  NODE_VERSION = "22"
  NPM_FLAGS = "--version"

# Static export: sin @netlify/plugin-nextjs.
```

> pnpm se detecta por `packageManager` en `package.json` (Corepack en Netlify). `NPM_FLAGS="--version"` evita que Netlify ejecute `npm install` en paralelo.

- [ ] **Step 2: Eliminar el árbol antiguo**

Run (verificar antes que nada de lo borrado se importa desde `app/` o `src/` nuevos):
```bash
git rm -r pages src/api src/context
git rm -r src/components/containers src/components/featured src/components/shared 2>/dev/null || true
```
> Cuidado: en Tasks 7-8 se portó a `src/components/ui|layout|sections|shared` nuevos. Borrar solo las carpetas ORIGINALES no portadas. Revisar con `git status` y `pnpm typecheck` tras borrar.

- [ ] **Step 3: Buscar y limpiar restos**

Run: `grep -rl "use client" pages 2>/dev/null; grep -rn "voidtoinfinite.github.io" src app; grep -rn "next-redux-wrapper\|@react-three\|lamina\|gsap\|axios" src app package.json`
Expected: sin resultados. Si hay, eliminar/corregir.

- [ ] **Step 4: Optimizar favicon**

Reemplazar `public/favicon.ico` (240 KB) por un icono ligero, o añadir `app/icon.png` (Next lo sirve automáticamente). Verificar peso < 50 KB.

- [ ] **Step 5: Actualizar `README.md`**

Documentar: stack (Next 16 / App Router / styled-components / static export), requisitos (Node 22, pnpm), comandos (`pnpm dev/build/check/test`), despliegue Netlify (`out/`).

- [ ] **Step 6: Verificación integral (Definition of Done)**

Run en orden:
```bash
rm -rf node_modules out .next
pnpm install
pnpm check      # typecheck + lint + format
pnpm test       # vitest verde
pnpm build      # genera out/
npx serve out   # servir y comprobar en navegador
```
Expected: todo verde; `out/` con `index.html`, `404.html`, `_next/`; landing + 404 + tema + i18n OK en el navegador; sin dependencias muertas (`pnpm ls three gsap axios redux next-redux-wrapper lamina @next/font i18next-http-backend` → vacío/no encontrado).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "VTI: Netlify config, limpieza de código muerto y verificación integral"
```

---

## Task 11: Registro final en el vault

**Files:**
- Modify (vault): `01-Projects/vti.md` (sección Registro), y nota de errores/investigación si aplica.

**Interfaces:**
- Produces: registro de sesión cerrado según reglas del vault (§8 del CLAUDE.md).

- [ ] **Step 1: Actualizar el Registro del proyecto**

Añadir a `01-Projects/vti.md` → sección `## Registro` una entrada fechada con: migración completada (Next 16, App Router, static export, lean), commits en `feature/migracion-next16`, resultado de la verificación integral, y estado del despliegue. Actualizar `updated:` en el frontmatter.

- [ ] **Step 2: Actualizar el dashboard**

En `05-System/dashboards/mapa-proyectos.md`, cambiar el estado de `vti` de "En migración a Next 16 (cimientos)" a "Migrado a Next 16 (cimientos) — <fecha>".

- [ ] **Step 3: (Si hubo incidencias) nota de error/investigación**

Si el bug de styled-components 16.1.x u otro apareció, crear `01-Projects/vti/typescript/errores/2026-07-23-<slug>.md` con síntoma, causa raíz, solución y prevención (frontmatter de 7 claves + tags `lenguaje/typescript` + `tema/errores`).

- [ ] **Step 4: Preguntar al usuario por push/PR**

**Checkpoint (acción de publicación):** preguntar si desea `git push` de la rama y/o abrir PR contra `main`. No ejecutar sin OK explícito.

---

## Self-Review (cobertura del spec)

- **Versiones/Node/pnpm** → Task 1, 2. ✅
- **App Router + registry styled-components** → Task 4, 5. ✅
- **Static export + Netlify** → Task 2, 5, 10. ✅
- **Eliminar Redux → ThemeProvider** → Task 4. ✅
- **i18n empaquetado es/en, sin host hardcodeado** → Task 6. ✅
- **Eliminar 3D/gsap/axios/dead code** → Task 8 (BackOrbs CSS), Task 10 (limpieza). ✅
- **ESLint flat sin airbnb** → Task 3. ✅
- **Testing Vitest** → Task 9. ✅
- **Limpieza (rutas rotas, tsconfig paths, "use client", SVG dup, favicon, typos)** → Task 2, 7, 8, 10. ✅
- **Documentación vault** → Task 11 (+ contexto ya registrado). ✅
- **Verificación DoD (clon limpio, check, test, build, serve)** → Task 10 Step 6. ✅
- **Git: rama feature, no push sin OK** → Global Constraints + Task 11 Step 4. ✅

Consistencia de tipos: `useTheme()` (Task 4) consumido en Navbar/Footer (Task 8); `initI18n`/`resources` (Task 6) consumidos en I18nProvider y vitest.setup (Task 9); `ThemeDefinition`/`{ data: ThemeDefinition }` consistente entre `themes.ts`, `ThemeProvider.tsx`, `styled.d.ts` (Task 4).
