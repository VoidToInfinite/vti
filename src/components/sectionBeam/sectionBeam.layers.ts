/**
 * Constantes del haz de luz de costura (spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`,
 * D7/D8/D18). Copiadas VERBATIM de `Footer animado v2.dc.html` (Downloads,
 * 2026-08-03): los cinco degradados de los semihaces y del punto caliente
 * (líneas 46/48/50, idénticas en 114/116/118 para el footer) y los tiempos
 * de las tres animaciones de `sectionBeam.parts.tsx` (líneas 46-50).
 *
 * Ningún literal se traduce a un paso de `palette.*` (D18): el hue `311.928`
 * coincide con `palette.secondary`, pero los cromas (`.13`, `.18`, `.19`,
 * `.06`, `.17`) no coinciden con ningún paso de la rampa, y una parada mezcla
 * el hue `235.851` del primario. Sustituirlos cambiaría el arte; derivarlos
 * con `color-mix` introduciría un valor que el mockup no pidió. Mismo
 * criterio que `contact.layers.ts:1-27` y `CONTACT_CTA_HOVER_SHADOW`.
 *
 * El componente es compartido entre Contacto y el Footer (D7): el mockup usa
 * un retardo de dibujado y de barrido ligeramente distinto entre sus dos
 * usos (`.2s`/`1.8s` en Contacto L46-49, `.4s`/`2s` en el Footer L114-117).
 * Sin props (YAGNI, "los dos consumidores lo usan igual"), este fichero fija
 * UN único valor -- el de Contacto -- como fuente de verdad compartida.
 *
 * Desde 2026-08-07 (spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`) este fichero
 * TAMBIÉN exporta la tonalidad CLARA de las mismas 7 piezas, como funciones
 * que reciben `palette` -- ver el docblock que precede a `beamCoreLight`, más
 * abajo, para el porqué de la distinción constante/función.
 */
import type { ThemeDefinition } from "@/theme/theme.types";

/** Semihaz de dibujado: núcleo (mockup L46/L114). */
export const BEAM_CORE = "oklch(0.85 0.13 311.928)";
/** Semihaz de dibujado: parada media al 25% (mockup L46/L114). */
export const BEAM_MID = "oklch(0.75 0.18 311.928 / 0.6)";
/** Semihaz de dibujado: cola al 60%, antes de `transparent` (mockup L46/L114). */
export const BEAM_TAIL = "oklch(0.7 0.19 311.928 / 0.2)";
/** Semihaz de barrido y punto caliente: núcleo (mockup L48/L116). */
export const SWEEP_CORE = "oklch(0.97 0.06 311.928)";
/** Semihaz de barrido: parada media al 20%, con hue del primario (mockup L48/L116). */
export const SWEEP_MID = "oklch(0.9 0.12 235.851 / 0.5)";
/** Halo `drop-shadow` del semihaz de barrido (mockup L48/L116). */
export const SWEEP_GLOW = "oklch(0.8 0.17 311.928 / 0.9)";
/** Halo `drop-shadow` del punto caliente central (mockup L50/L118). */
export const HOTSPOT_GLOW = "oklch(0.8 0.17 311.928 / 0.95)";

/**
 * Tonalidad CLARA del haz (D1/D2 de la spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`). Los 7 literales
 * de arriba son arte VERBATIM del mockup OSCURO (D18 de la spec del
 * 2026-08-03, D5 de esta) y no se tocan un pixel: la rama clara NO es un
 * recoloreado a ojo de esos literales, es una construcción PARALELA con
 * pasos reales de `theme.data.palette`. No hay mockup claro de esta pieza,
 * así que la alternativa a los tokens sería inventarme siete colores nuevos
 * -- el manual del repo (§5, "tokens de tema obligatorios, sin colores
 * hardcodeados") ya descarta esa opción.
 *
 * Por eso son FUNCIONES, no constantes como las de arriba: a diferencia de
 * esos 7 literales (que no dependen de ningún tema), el valor claro sale de
 * `palette.secondary`/`palette.primary`, que sí varían si la rampa de color
 * se recalibra. Recibir `palette` por parámetro -- en vez de leer
 * `theme.data.palette` directamente aquí dentro -- es lo que permite que
 * `sectionBeam.layers.test.ts` mida el valor REAL devuelto contra los mismos
 * tokens que consume `sectionBeam.parts.tsx`, sin copiar la tabla D2 a mano
 * en el test. Mismo recurso que `pillarBadgeAccent` en `Story.tsx`.
 *
 * D1: en oscuro las dos piezas son MÁS CLARAS que su fondo (Δ L +0.65 a
 * +0.95); en claro tienen que ser MÁS OSCURAS que el suyo
 * (`semantic.surfaceSunken` = `neutral[100]`, L 0.96), con el mismo orden
 * interno -- núcleo denso, cola hacia `transparent`. El alfa se añade con
 * `color-mix(in oklab, <token> N%, transparent)`, premultiplicado y por
 * tanto sin desplazar el tono -- mismo recurso que `ScCardBadge` en
 * `Story.tsx`. `secondary` es hue 311.928 y `primary` 235.851: los MISMOS
 * hues que usan los 7 literales oscuros, así que el haz claro es la misma
 * pieza en otra tonalidad, no otra pieza.
 *
 * Dos detalles que NO son simetría automática con la tabla oscura (D2):
 *
 * - El barrido (`sweepCoreLight`) es MÁS OSCURO que el núcleo dibujado
 *   (`beamCoreLight`), al revés que en oscuro. En el mockup el barrido es
 *   casi blanco (L 0.97) porque es el destello que pasa por encima de un haz
 *   ya claro; sobre fondo claro "más brillante" es invisible, así que el
 *   destello se lee como una pasada más densa: `secondary[700]` (L 0.53),
 *   por debajo del `secondary[600]` (L 0.66) del núcleo dibujado.
 * - Los dos `drop-shadow` (`sweepGlowLight`/`hotspotGlowLight`) bajan de
 *   alfa 0.9/0.95 -- embebida en el literal oscuro -- a 45%/50% en el
 *   `color-mix`. Un halo oscuro sobre fondo claro es una sombra, no un
 *   resplandor, y a alfa alta se lee como una mancha sucia bajo la línea; la
 *   mitad de alfa conserva la difusión sin ensuciar.
 */

/** Semihaz de dibujado claro: núcleo, sin alfa (D2). */
export function beamCoreLight(palette: ThemeDefinition["palette"]): string {
  return palette.secondary[600];
}

/** Semihaz de dibujado claro: parada media al 25%, alfa 60% (D2). */
export function beamMidLight(palette: ThemeDefinition["palette"]): string {
  return `color-mix(in oklab, ${palette.secondary[500]} 60%, transparent)`;
}

/** Semihaz de dibujado claro: cola al 60%, antes de `transparent`, alfa 20% (D2). */
export function beamTailLight(palette: ThemeDefinition["palette"]): string {
  return `color-mix(in oklab, ${palette.secondary[400]} 20%, transparent)`;
}

/** Semihaz de barrido y punto caliente claro: núcleo, sin alfa. MÁS OSCURO
 *  que `beamCoreLight` -- ver el segundo detalle del docblock de arriba. */
export function sweepCoreLight(palette: ThemeDefinition["palette"]): string {
  return palette.secondary[700];
}

/** Semihaz de barrido claro: parada media al 20%, alfa 50%, con hue del
 *  primario -- mismo cruce de hue que `SWEEP_MID` en oscuro (D2). */
export function sweepMidLight(palette: ThemeDefinition["palette"]): string {
  return `color-mix(in oklab, ${palette.primary[600]} 50%, transparent)`;
}

/** Halo `drop-shadow` claro del semihaz de barrido: alfa 45% -- ver el
 *  primer detalle del docblock de arriba. */
export function sweepGlowLight(palette: ThemeDefinition["palette"]): string {
  return `color-mix(in oklab, ${palette.secondary[600]} 45%, transparent)`;
}

/** Halo `drop-shadow` claro del punto caliente central: alfa 50% -- ver el
 *  primer detalle del docblock de arriba. */
export function hotspotGlowLight(palette: ThemeDefinition["palette"]): string {
  return `color-mix(in oklab, ${palette.secondary[600]} 50%, transparent)`;
}

/** Alto del contenedor del haz (mockup L45/L113: `height:2px`). */
export const SECTION_BEAM_HEIGHT = "2px";
/**
 * Apilamiento del haz DENTRO de la sección que lo monta (mockup L113:
 * `z-index:2` en el bloque del footer). No es cosmético: los dos consumidores
 * montan detrás del haz piezas POSICIONADAS con fondo propio -- el slot
 * pegado de la escena en Contacto, el campo de estrellas en el Footer -- y
 * dos elementos posicionados con `z-index: auto` se pintan en ORDEN DE DOM,
 * así que sin este valor cualquier hermano posterior taparía la costura. El 2
 * también le gana al `z-index: 1` del marco de contenido, que es transparente
 * pero se pintaría por encima. No usa la escala `theme.data.zIndex` a
 * propósito: es apilamiento LOCAL de una sección, del mismo tramo que el
 * `z-index: 1` del marco, no un plano global de la página (el tramo más bajo
 * de la escala, `raised: 10`, ya está por encima de todo esto).
 */
export const SECTION_BEAM_Z = 2;
/** Ancho del punto caliente central (mockup L50/L118: `width:170px`). */
export const SECTION_BEAM_HOTSPOT_W = "170px";
/** Duración de `beamDraw` (mockup L46-47: `1.6s`). */
export const SECTION_BEAM_DRAW_MS = 1600;
/** Retardo de `beamDraw` (mockup L46-47, uso de Contacto: `.2s`). */
export const SECTION_BEAM_DRAW_DELAY_MS = 200;
/** Duración de `beamOut` (mockup L48-49: `var(--sweep-dur, 18s)`, sin variable
 *  de tema resoluble desde este repo -- se fija el valor por defecto del
 *  propio mockup). */
export const SECTION_BEAM_SWEEP_MS = 18000;
/** Retardo de `beamOut` (mockup L48-49, uso de Contacto: `1.8s`). */
export const SECTION_BEAM_SWEEP_DELAY_MS = 1800;
/** Duración de `beamPulse` (mockup L50/L118: `4.5s`). */
export const SECTION_BEAM_PULSE_MS = 4500;
/** Easing de `beamDraw` y `beamOut` (mockup L46-49: `cubic-bezier(.16,.8,.3,1)`).
 *  `beamPulse` usa `ease-in-out` (mockup L50/L118) -- una palabra clave nativa,
 *  no un literal que necesite su propia constante. */
export const SECTION_BEAM_EASING = "cubic-bezier(0.16, 0.8, 0.3, 1)";
