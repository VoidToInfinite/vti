/**
 * Superficie de cristal del sistema: el desenfoque de fondo, el velo y el
 * borde con los que se dibuja un panel flotante sobre el contenido. Una
 * definición por tema (`themes.ts` monta `glassLight` en claro y `glassDark`
 * en oscuro), y sus consumidores reales son los del navegador: la barra y el
 * panel de escritorio del `Navbar`, el `border-top` de `NavSheet` y la
 * superficie del `LanguageSelector`.
 *
 * Es además uno de los dos sitios del repo donde un color puede NACER como
 * literal `oklch()` -- el otro es `color.ts`, que genera las cinco rampas --,
 * y por eso la familia `color-literal` de `scripts/detect-anti-patterns.mjs`
 * se salta esta carpeta entera: aquí el literal es la definición del token,
 * no una copia suelta.
 *
 * ## El blanco al 12 % que aparece tres veces en el repo (crítica externa #17)
 *
 * El censo de color de esa revisión encontró `oklch(1 0 0 / 0.12)` escrito
 * tres veces: aquí, en `glassLight.border`, y en las dos constantes de
 * `contact.layers.ts` que visten las tarjetas y el formulario de la rama
 * OSCURA de Contacto. Las tres coinciden byte a byte y aun así NO son la
 * misma pieza, así que este token no sirve para deduplicarlas: el cristal
 * claro se compone sobre superficies claras y el cristal que sí viste la rama
 * oscura es `glassDark`, cuyo borde usa alfa `.08`. Migrar Contacto a
 * `glass.border` le daría el borde equivocado en cuanto alguien tocara
 * cualquiera de los dos temas. Queda escrito aquí porque la coincidencia se
 * ve desde los tres lados y la explicación solo estaba en dos.
 *
 * Lo que NO se documenta, porque no consta en el repo: por qué el borde claro
 * lleva más alfa que el oscuro (`.12` frente a `.08`). Es un hecho observable
 * de estos dos valores, no una decisión con fuente escrita; quien la conozca
 * puede añadirla aquí, pero no se inventa una explicación plausible.
 */
export interface Glass {
  blur: string;
  bg: string;
  border: string;
}

export const glassLight: Glass = {
  blur: "blur(14px)",
  bg: "oklch(1 0 0 / 0.68)",
  border: "1px solid oklch(1 0 0 / 0.12)",
};

export const glassDark: Glass = {
  blur: "blur(14px)",
  bg: "oklch(0.178 0 0 / 0.68)",
  border: "1px solid oklch(1 0 0 / 0.08)",
};
