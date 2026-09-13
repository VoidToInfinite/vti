# VTI

Landing page de **VoidToInfinite**.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [styled-components 6](https://styled-components.com/)
- Exportación estática (`next build` → `out/`)

## Requisitos

- Node.js 22+
- [pnpm](https://pnpm.io/) 11 (vía [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)

## Comandos

```bash
pnpm install      # instalar dependencias
pnpm dev          # entorno de desarrollo (http://localhost:3000)
pnpm build        # build de producción + exportación estática en out/
pnpm start        # sirve out/ localmente (requiere pnpm build previo)
pnpm check        # typecheck + lint + check-format
pnpm test         # tests (Vitest)
```

## Despliegue

Desplegado en [Vercel](https://vercel.com/) con la integración de GitHub y el preset de Next.js (producción desde `main`), que sirve la exportación estática. Las reglas de servidor (redirecciones 301, cabeceras y la 404 inglesa) viven en `vercel.json`.
