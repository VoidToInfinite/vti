import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    /*
     * El defecto de Vitest son 5000 ms, y ese número no lo eligió nadie para
     * esta suite: hoy son 110 ficheros y 2252 casos, varios de los cuales
     * montan la PÁGINA ENTERA en jsdom. Medido en aislamiento con la máquina
     * descargada (2026-09-05): el render síncrono más pesado tarda 9127 ms él
     * solo, y otros tres pasan de 2000. Con los workers en paralelo, esos
     * casos caían por `Test timed out` sin una sola aserción fallida —cinco a
     * la vez en una corrida, tres en la siguiente, distintos cada vez— y todos
     * pasaban al ejecutarlos aislados. Un límite por debajo del coste real del
     * caso no mide el producto: mide cuántos núcleos quedaban libres.
     *
     * 15000 ms es el techo de lo que un caso legítimo de esta suite tarda
     * aislado (9127) más el margen que la contención se come. NO sustituye a
     * recortar coste evitable: cuando el pesado se pasó de la raya, primero se
     * quitó lo que sobraba —el campo de estrellas del pie generaba una clase
     * de styled-components por estrella, 850 ms menos al pasarlo a propiedades
     * personalizadas— y solo después se subió el límite. Si un caso nuevo
     * necesita más, que lo declare en su propio `it` con la medición delante.
     */
    testTimeout: 15_000,
    // Node 22+ ships a built-in `localStorage` global (Web Storage API) that
    // is present without a valid backing file unless `--localstorage-file`
    // is set. Vitest's jsdom environment only overrides globals that are
    // *not* already defined on `globalThis`, so that broken built-in stub
    // (`localStorage.getItem` throws) silently wins over jsdom's working
    // implementation. Disabling it lets jsdom provide `window.localStorage`
    // as expected. See ThemeProvider.tsx, which reads localStorage on mount.
    poolOptions: {
      forks: { execArgv: ["--no-experimental-webstorage"] },
      threads: { execArgv: ["--no-experimental-webstorage"] },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
