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
 * PENDIENTE fuera de este fichero, declarado en vez de corregido en silencio
 * desde una tarea que no es dueña de esas piezas: la rampa primitiva
 * `color.success` (`color.ts`) se queda — retirar un hue entero de la paleta
 * toca las tablas compartidas por los seis y su propio contrato
 * (`color.test.ts`), una decisión con más alcance del que cierra este censo —
 * y desde hoy no la consume ningún rol semántico; `DESIGN.md` §2.2 sigue
 * listando `success` en las tablas de roles de los dos temas.
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
  surface: color.neutral[1000],
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
