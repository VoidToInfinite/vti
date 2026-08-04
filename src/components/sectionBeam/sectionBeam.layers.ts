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
 */

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
