import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  compiler: { styledComponents: true },
  reactStrictMode: true,
  trailingSlash: false,
  /*
   * `globalNotFound` (2026-09-06): la bandera que permite que cada rama de
   * idioma hornee su propio `<html lang>` (WCAG 3.1.1, nivel A; P1 de la
   * crítica externa #19).
   *
   * Dos `<html lang>` distintos exigen DOS root layouts, y un root layout es un
   * `layout` sin `layout` padre: hay que borrar `app/layout.tsx`. Lo que lo
   * impedía era la 404 propia del repo — la entrada `/_not-found` resuelve su
   * `layout` en el segmento RAÍZ, y sin ninguno el build sale por
   * `log.error("... doesn't have a root layout ...")` + `process.exit(1)`
   * (`next/dist/build/webpack/loaders/next-app-loader/index.js`, verificado
   * sobre el paquete instalado). Con esta bandera, `app/global-not-found.tsx`
   * renderiza su propio documento y SUSTITUYE al layout de esa entrada, así que
   * la guarda deja de aplicarse y `app/` puede quedarse sin `layout.tsx`.
   *
   * ES EXPERIMENTAL Y ESO ESTÁ DECLARADO, no escondido: `globalNotFound: false`
   * es el valor por defecto en 16.2.11 (`next/dist/server/config-shared.js`) y
   * el propio código del loader lleva sus `TODO(global-not-found): remove this
   * flag assertion condition once global-not-found is stable`. El riesgo que se
   * asume es que una versión futura de Next cambie la forma de la convención;
   * lo que la vigila es el candado de `app/RootDocument.test.ts`, que exige
   * esta bandera y la convención juntas, más el censo de `<html lang>` por ruta
   * que `scripts/check-site-surfaces.mjs` mide sobre el HTML servido.
   */
  experimental: { globalNotFound: true },
};

export default nextConfig;
