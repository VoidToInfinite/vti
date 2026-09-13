import { color } from "./color";

/**
 * Roles semánticos VIVOS: 15, no los 16 que hubo hasta la crítica externa #10
 * (2026-08-18).
 *
 * RETIRADO en esa revisión — `success` — con censo propio de consumidores
 * previo (`semantic.success`, `theme.data.semantic.success`, acceso por
 * corchete, desestructuración y alias local de `theme.data`) sobre `src/` y
 * `app/`: **un único punto de consumo en todo el repo**, la rama
 * `if (intent === "success")` de `accent()` en
 * `src/components/ui/Button/Button.tsx`. Y esa rama era INALCANZABLE: ningún
 * call site de producción pasaba la prop `intent`, así que el rol se quedaba
 * con su medición AA escrita al lado (5,47:1 sobre `bg` en claro) y sin una
 * sola pantalla capaz de pintarlo.
 *
 * Sus dos vecinos SIGUEN VIVOS y no se tocan, cada uno con un consumidor real
 * y directo: `warning` lo pinta el callout de las páginas legales
 * (`legalPage.parts.tsx`: franja lateral de 3px + relleno `color-mix`) y
 * `error` lo pinta la validación del formulario de contacto (`Contact.tsx`:
 * borde del campo inválido y mensaje de error). El `danger` retirado del
 * mismo union de `ButtonIntent` mapeaba precisamente a `error`, y por eso no
 * se lleva nada consigo.
 *
 * CERRADO en la crítica externa #14 (2026-09-02): el PENDIENTE que este
 * docblock dejaba abierto —la rampa primitiva `color.success` seguía viva en
 * `color.ts` sin ningún rol semántico que la consumiera— se resolvió
 * retirándola también, con su propio censo de consumidores (cero) y las tres
 * líneas de contrato de `color.test.ts` actualizadas en el mismo cambio. El
 * alcance que aquella revisión estimó como "más del que cierra este censo"
 * resultó ser eso: tres líneas de test. Ver el docblock de `color` en
 * `color.ts` para el detalle.
 *
 * SIGUE PENDIENTE, fuera del alcance de este fichero: `DESIGN.md` §2.2 lista
 * `success` en la tabla de rampas y en las tablas de roles de los dos temas.
 */
export interface SemanticColors {
  bg: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  brand: string;
  brandSolid: string;
  brandText: string;
  focus: string;
  onBrand: string;
  warning: string;
  error: string;
}

const white = "oklch(1 0 0)";

export const semanticLight: SemanticColors = {
  bg: color.neutral[50],
  surface: white,
  surfaceSunken: color.neutral[100],
  border: color.neutral[100],
  borderStrong: color.neutral[400],
  text: color.neutral[1000],
  textMuted: color.neutral[800],
  // AA (C1): neutral[600] daba 2.98/3.11/2.77 sobre bg/surface/surfaceSunken
  // (falla 4.5:1). neutral[700] (tras bajar L[7] a 0.53 en color.ts) da
  // 5.06/5.28/4.70 — pasa con margen en los tres fondos.
  textSubtle: color.neutral[700],
  brand: color.primary[500],
  // AA (C1): primary[700] daba 4.17:1 onBrand/brandSolid (falla 4.5:1).
  // primary[800] da 5.84:1. Nota: brandText YA era primary[800], así que
  // brandSolid === brandText en valor OKLCH tras este cambio — no es el
  // mismo colapso que textMuted/textSubtle (roles textuales duplicados);
  // aquí son dos roles de USO distinto (fondo de botón sólido vs. color de
  // texto de marca) que simplemente comparten el mismo primitivo. No se
  // buscó un valor alternativo para separarlos artificialmente.
  brandSolid: color.primary[800],
  brandText: color.primary[800],
  // AA (C1): primary[500] daba 2.18:1 focus/bg — fallaba el 3:1 que WCAG
  // 1.4.11/2.4.11 exige al indicador de foco, y afectaba a TODOS los
  // elementos interactivos del sitio. Con primary[700] y L[7] bajado a 0.53
  // da 4.86:1 sobre bg y 5.07:1 sobre surface (medido con ./contrast, no
  // estimado). Las cifras 3.99/4.17 que figuraban aquí eran las de ANTES de
  // bajar L[7]: quedaron obsoletas en el mismo commit que las mejoró.
  focus: color.primary[700],
  onBrand: white,
  // AA (C1): warning[700] daba 4.22:1 sobre bg (falla 4.5:1); no hay paso
  // intermedio 750. warning[800] da 5.89:1. La misma medición cubría el rol
  // success (3.89 -> 5.47:1), retirado en la crítica externa #10: la cifra se
  // conserva en el docblock de SemanticColors, arriba, para que la retirada
  // no borre lo que se llegó a medir.
  warning: color.warning[800],
  error: color.error[700],
};

export const semanticDark: SemanticColors = {
  bg: color.secondary[1100],
  /*
   * Crítica externa #14 (2026-09-02): `surface` sube de `neutral[1000]`
   * (`oklch(0.32 0 286)`, croma CERO) a `secondary[1000]`
   * (`oklch(0.32 0.13 311.928)`), el escalón inmediatamente superior de la
   * MISMA rampa de la que sale `bg` (`secondary[1100]`).
   *
   * El defecto medido: en la hoja de navegación móvil del tema oscuro, el
   * panel se pintaba gris `rgb(51, 51, 51)` sobre un fondo morado
   * `rgb(40, 7, 57)`. No es un problema de contraste (el gris libraba AA de
   * sobra) sino de FAMILIA: un panel acromático flotando sobre un fondo con
   * croma 0,093 se lee como una pieza de otro sistema, y el tema claro no
   * tiene esa asimetría — allí `bg` y `surface` son los dos neutros.
   *
   * Por qué el escalón de la rampa de marca y no un croma intermedio
   * inventado: en la escala de 12 pasos, L = 0,32 solo existe en el paso
   * 1000, así que "el mismo hue que `bg`, un paso más claro" tiene UNA sola
   * respuesta dentro del sistema. Fabricar una rampa nueva de neutro teñido
   * habría añadido doce valores y una decisión de croma sin ancla para
   * conseguir lo mismo con menos justificación.
   *
   * Contraste MEDIDO con el `contrastRatio` de este mismo directorio, contra
   * los roles que se pintan encima. Todos SUBEN: a igual L, el croma baja
   * ligeramente la luminancia relativa, así que la superficie nueva es algo
   * más oscura que el gris que sustituye.
   *
   * | par (tema oscuro)      | antes  | ahora  |
   * |------------------------|--------|--------|
   * | `text` / `surface`     | 12.150 | 12.904 |
   * | `textMuted` / `surface`|  8.284 |  8.797 |
   * | `textSubtle`/`surface` |  6.331 |  6.724 |
   * | `focus` / `surface`    |  6.428 |  6.826 |
   * | `brandSolid`/`surface` |  5.570 |  5.916 |
   * | `warning` / `surface`  |  5.277 |  5.604 |
   * | `error` / `surface`    |  4.071 |  4.324 |
   *
   * Lo único que BAJA es la separación de luminancia contra `bg`, de 1.403:1
   * a 1.321:1 — el precio de compartir hue —, y sigue siendo el mismo salto
   * de elevación de un paso de rampa que el tema claro resuelve con blanco
   * sobre `neutral[50]` (1.08:1, cuatro veces menos separación que esta).
   */
  surface: color.secondary[1000],
  /*
   * `surfaceSunken` NO se tiñe, y la medición es la razón. Comparte L (0,22)
   * con `bg`, así que su separación de luminancia contra el fondo es de
   * 1.027:1 — prácticamente nula: lo ÚNICO que hoy distingue una superficie
   * hundida del fondo de página en tema oscuro es que una es acromática y el
   * otro tiene croma. Darle el croma de la marca la haría desaparecer contra
   * `bg` (1.017:1 con el hue ya compartido), y no hay ningún paso por debajo
   * del 1100 al que bajarla para recuperar la separación por luminancia.
   *
   * Es decir: en `surface` el croma se puede unificar porque la elevación ya
   * la lleva la L; en `surfaceSunken` el croma ES la señal. Los consumidores
   * reales de este rol en oscuro —el fondo del footer, los bloques de nota y
   * de código de las páginas legales, el panel de respaldo de Contacto—
   * dependen de leerse como una caja distinta del fondo.
   *
   * Los roles de TEXTO (`text`/`textMuted`/`textSubtle`) y `onBrand` también
   * siguen en la rampa neutra, y también a propósito: teñir un texto casi
   * blanco es una decisión tipográfica con efecto en todos los fondos del
   * tema, no la corrección de asimetría que esta revisión mide. `border`/
   * `borderStrong` se quedan por el mismo motivo más uno propio:
   * `Journey.test.tsx` ata sus valores contra el void de la escena.
   */
  surfaceSunken: color.neutral[1100],
  border: color.neutral[800],
  borderStrong: color.neutral[700],
  text: color.neutral[50],
  textMuted: color.neutral[300],
  textSubtle: color.neutral[400],
  brand: color.primary[400],
  brandSolid: color.primary[500],
  brandText: color.primary[300],
  focus: color.primary[400],
  onBrand: color.neutral[1100],
  warning: color.warning[500],
  error: color.error[500],
};
