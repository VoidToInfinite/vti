/**
 * ANILLO DE FOCO -- la geometría del ÚNICO indicador de foco del sitio.
 *
 * POR QUÉ EXISTE ESTE FICHERO: hasta el 2026-09-02 no había token de anillo
 * de foco y el sitio hablaba TRES vocabularios distintos, repartidos por rama
 * de tema (censo de la crítica externa #14, P1 de Craft, medido en navegador):
 *
 * 1. `GlobalStyles.tsx` --
 *    `:where(a, button, input, textarea, select, [tabindex]):focus-visible`
 *    con `outline: 2px solid semantic.focus` + `outline-offset: 2px`. El
 *    anillo que cubre TODO el sitio.
 * 2. `Button`, `Input`, `IconButton`, `Card`, el CTA de `Features` y el
 *    `textarea` de `Contact` -- `box-shadow: 0 0 0 4px color-mix(in oklch,
 *    semantic.focus 35%, transparent)` y SIN `outline: none`, así que esos
 *    controles pintaban los DOS anillos a la vez.
 * 3. Las marcas de raíl de los decks oscuros (`story.deck`, `journey.deck`)
 *    -- `outline: none` + `box-shadow: 0 0 0 3px color-mix(in oklch,
 *    semantic.focus 45%, transparent)`: anillo SUSTITUTIVO, con otro grosor
 *    y otra mezcla que el anterior.
 *
 * El indicador de foco es de las poquísimas cosas que NO deben cambiar al
 * cambiar de piel ni de componente: quien navega por teclado aprende una sola
 * forma y la reconoce en toda la página. Tres formas distintas -- y una de
 * ellas exclusiva de la rama oscura -- es justo lo contrario.
 *
 * MANDA EL `outline`. Los otros dos se BORRAN de los componentes (no se
 * reescriben con el token: dejan de declarar anillo). Las tres razones, en
 * orden de peso:
 *
 * - **Colores forzados.** En `forced-colors: active` el navegador fuerza
 *   `box-shadow: none`. No es un supuesto de esta tarea: el repo ya lo tenía
 *   medido y escrito antes de esta unificación -- ver el docblock del
 *   describe "forma de botón bajo forced-colors" en `Button.test.tsx`
 *   (crítica externa #12). Consecuencia directa: el anillo nº3 era el ÚNICO
 *   indicador de las marcas de raíl y en ese modo desaparecía entero (su
 *   `outline: none` apagaba el anillo global y su `box-shadow` no se pinta),
 *   dejando esos controles sin ninguna señal de foco. `outline-color` sí lo
 *   respeta el modo forzado.
 * - **No compite por una propiedad ya ocupada.** `box-shadow` no fusiona
 *   entre declaraciones: la última gana ENTERA. Por eso el anillo nº2
 *   obligaba a reescribir a mano cualquier otra sombra del control dentro del
 *   propio bloque de foco -- el anillo `inset` de la variante `outline` de
 *   `Button`, el de descubribilidad de `IconButton` -- y a pelearse con el
 *   orden de inyección y la especificidad para no perderlas. `outline` es una
 *   propiedad que ninguna otra capa de este repo usa.
 * - **Sigue el radio igual.** `outline` adopta el `border-radius` del
 *   elemento (CSS Basic UI Level 4; implementado en Chrome 94+, Firefox 88+ y
 *   Safari 16.4+), así que los botones redondos de los decks no necesitan
 *   excepción: el motivo por el que en su día se escribieron con `box-shadow`
 *   ya no existe. Queda como comprobación de navegador real, no afirmada aquí
 *   (jsdom no pinta).
 *
 * QUÉ SE PIERDE, dicho sin adornos: los seis controles que sumaban halo
 * translúcido pasan a llevar solo el trazo sólido de 2px. Es exactamente el
 * mismo indicador que ya llevaban todos los demás enlaces, botones y campos
 * del sitio; ninguno se queda sin foco, pierden el SEGUNDO anillo.
 *
 * LOS VALORES SON LOS QUE EL ANILLO GLOBAL YA TENÍA. Unificar no es ocasión
 * para retocar de paso una geometría que nadie ha pedido cambiar: así, para
 * la inmensa mayoría de elementos del sitio, esta entrega no cambia un solo
 * píxel.
 *
 * EL COLOR NO VIVE AQUÍ. Es un rol semántico (`semantic.focus`), distinto en
 * cada tema y ya validado AA (4,86:1 en claro, `tokens/contrast.test.ts`).
 * Esto es solo la geometría, idéntica en las dos pieles -- por eso se cablea
 * en el bloque `shared` de `themes.ts` y no en `semanticLight`/`semanticDark`.
 */
export const focusRing = {
  /** `outline-width`: grosor del trazo. */
  width: "2px",
  /** `outline-style`: el trazo es continuo, nunca punteado. */
  style: "solid",
  /** `outline-offset`: separación entre el borde del control y el trazo. */
  offset: "2px",
} as const;
