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

Configurado para [Netlify](https://www.netlify.com/) vía `netlify.toml`: comando de build `pnpm build`, directorio publicado `out/`. Al ser una exportación estática no requiere el plugin `@netlify/plugin-nextjs`.
