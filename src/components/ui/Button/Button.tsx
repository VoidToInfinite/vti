"use client";

import type {
  ButtonHTMLAttributes,
  ElementType,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";
import { PRESS } from "@/motion/vocabulary";

export type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
/**
 * Intents VIVOS: 2, no los 4 que hubo hasta la crítica externa #10
 * (2026-08-18).
 *
 * RETIRADOS en esa revisión — `success` y `danger` — con censo propio de
 * consumidores previo (la prop `intent=` en JSX, el tipo `ButtonIntent`, y
 * cada valor del union suelto) sobre `src/` y `app/`: **cero call sites de
 * producción pasan la prop**. Las dos únicas apariciones de `intent=` fuera
 * de tests eran reenvíos INTERNOS de la propia composición — `IconButton.tsx`
 * hacia `Button`, y este fichero hacia `ScButton` —, así que `success` y
 * `danger` solo se alcanzaban desde `Button.test.tsx`/`IconButton.test.tsx`,
 * que los ejercitaban sin que ninguna pantalla del sitio los pidiera.
 *
 * Por qué el eje NO se retira entero, pese a que ningún consumidor escriba la
 * prop: `primary` y `neutral` SÍ se alcanzan, los dos por DEFECTO. `Button`
 * arranca en `primary` (`brandSolid`: CTA del hero, envío de Contacto, enlace
 * de la 404) y `IconButton` fija `neutral` (`semantic.text`: ThemeToggle,
 * BackToTop y los dos disparadores de la hoja de navegación). Borrar el eje
 * repintaría de color de marca todos los botones de icono del sitio — un
 * cambio VISUAL, justo lo contrario de lo que hace una retirada de
 * vocabulario muerto.
 *
 * Qué se lleva por delante cada valor retirado: con `success` se retira
 * `semantic.success`, su ÚNICO punto de consumo en todo el repo (ver el
 * docblock de `SemanticColors` en `src/theme/tokens/semantic.ts`). Con
 * `danger` no se retira nada: `semantic.error` sigue vivo por otra vía —
 * `Contact.tsx` lo lee directo para el borde del campo inválido y para el
 * mensaje de validación.
 *
 * Mismo criterio y mismo precedente que las variantes `h4`/`bodyLg`/`code` de
 * `type.ts` y que `grid.columns`/`grid.gutter` (crítica externa #9).
 */
export type ButtonIntent = "primary" | "neutral";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  intent?: ButtonIntent;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
  /** Override del elemento. `as="a"` + `href` para CTAs que navegan. */
  as?: ElementType;
  href?: string;
}

// Color de acento por intent — SIEMPRE un rol semántico, nunca un primitivo
// de paleta (theme.data.palette.*).
function accent(theme: DefaultTheme, intent: ButtonIntent): string {
  const s = theme.data.semantic;
  if (intent === "neutral") return s.text;
  return s.brandSolid;
}

/**
 * Rellenos del eje INLINE en `inlineSpace`, no en `space` (ola R, 2026-09-05).
 *
 * EL DEFECTO, MEDIDO ANTES DE TOCAR NADA. Chrome sobre el build de producción
 * servido, `Page.setFontSizes` a 32 px (la MISMA palanca que la preferencia de
 * tamaño de texto del usuario, la que exige WCAG 1.4.4),
 * `prefers-reduced-motion: reduce`, 320 px de viewport: el CTA «Escríbeme» de
 * la sección de Contacto, un `lg`, dejaba **58,8 px de rótulo en 9 líneas** —
 * una letra por línea— en las dos ramas de tema. Con la raíz al doble, sus
 * `space[6]` valían 64 px por lado dentro de un contenedor de 192, así que el
 * relleno se quedaba con dos tercios del control y el texto con el resto.
 *
 * `inlineSpace[n]` es el mismo peldaño con un techo en `vw` calibrado para
 * valer exactamente ese peldaño a 320 px (ver su docblock en
 * `src/theme/tokens/space.ts`): con la raíz por defecto no cambia ni un píxel
 * de la composición de siempre, y en la banda estrecha el relleno deja de
 * crecer donde el viewport deja de dar de sí. Con el token, ese mismo `lg` deja
 * 192 px de rótulo dentro de los 256 px del marco oscuro.
 *
 * QUÉ NO CAMBIA: el `height`, que es una medida de layout y no un espaciado, y
 * que no compite con el ancho del viewport; y el eje de bloque, que estos tres
 * tamaños ya declaran a cero. `IconButton` compone sobre este componente y
 * declara `padding: 0`, así que un botón de icono —que es cuadrado y no lleva
 * columna de texto— no lo hereda ni lo necesita.
 */
const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`
    height: 36px;
    padding: 0 ${({ theme }) => theme.data.inlineSpace[4]};
  `,
  md: css`
    height: 44px;
    padding: 0 ${({ theme }) => theme.data.inlineSpace[5]};
  `,
  lg: css`
    height: 52px;
    padding: 0 ${({ theme }) => theme.data.inlineSpace[6]};
  `,
};

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

/**
 * Forma de boton bajo `forced-colors: active`, en un fragmento reutilizable.
 *
 * ORIGEN (critica externa #12, 2026-08-19): el CTA medido en modo de colores
 * forzados daba fondo Canvas, color LinkText y `border-top-width: 0px`, o sea,
 * se leia como texto enlazado y no como boton. En ese modo el navegador
 * descarta los valores de autor de `color`, `background-color` y
 * `border-color` -- los sustituye por la paleta del sistema -- y ademas fuerza
 * `box-shadow: none`, asi que las cosas que dan forma a un control desaparecen
 * a la vez: el fondo de la variante solid y el anillo inset de outline. (Eran
 * tres hasta el 2026-09-02: el halo de `:focus-visible` por box-shadow tambien
 * se apagaba aqui, y por eso mismo se retiro en la unificacion del anillo de
 * foco -- ver `src/theme/tokens/focus.ts`. El indicador de foco es ahora un
 * outline, que el modo forzado si respeta.) El borde es lo unico que el modo
 * forzado si pinta.
 *
 * POR QUE UN FRAGMENTO EXPORTADO Y NO UN BLOQUE LOCAL (critica externa #16,
 * hallazgo L12, 2026-09-03): el evaluador tecnico midio que el disparador
 * «Mas destinos del sitio» (`ScNavTrigger`, `Navbar.tsx`) computaba
 * `border: none` bajo colores forzados mientras el conmutador de tema y la
 * hamburguesa -- los dos `IconButton`, o sea `styled(Button)` -- si recibian
 * su `1px solid ButtonText`. La regla no le llegaba por una razon estructural:
 * ese disparador es un `styled.button` propio, no compone sobre `Button`, asi
 * que no hay cascada que la herede. Copiar el literal habria dejado dos
 * declaraciones que pueden divergir; exportar el fragmento deja UNA fuente y
 * cualquier boton de solo texto del sitio la consume interpolandola.
 *
 * ButtonText es la palabra clave de color de sistema que el propio ejemplo de
 * MDN usa para este caso (borde que sustituye a un box-shadow forzado a none).
 * El CTA que se monta con `as="a"` recibe LinkText como color de texto -- es lo
 * que se midio --, asi que texto y borde pueden salir de dos entradas
 * distintas de la paleta forzada: las dos son visibles sobre el mismo fondo, y
 * lo que este fragmento garantiza es la FORMA, no que los dos tonos coincidan.
 *
 * POR QUE DENTRO DEL MEDIA QUERY y no como un borde transparente permanente:
 * una sombra inset se dibuja desde el borde interior del borde, asi que 1px de
 * borde transparente moveria 1px hacia dentro el anillo inset de la variante
 * outline -- un cambio visual real en los dos temas normales, justo lo que
 * este arreglo no puede permitirse. Dentro del media query no mueve nada de
 * nada: el reset global declara `box-sizing: border-box` (GlobalStyles), asi
 * que el borde se come 1px del interior y la caja exterior conserva exactos
 * sus 36/44/52px de alto.
 */
export const forcedColorsButtonShape = css`
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

const ScButton = styled.button<{
  $variant: ButtonVariant;
  $intent: ButtonIntent;
  $size: ButtonSize;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  font-weight: 600;
  cursor: pointer;
  /* Task 13, punto 2 del brief: elimina el retardo de ~300ms con el que
     algunos navegadores móviles esperan un segundo toque (doble-tap para
     zoom) antes de disparar click. Raíz de composición (IconButton ->
     styled(Button), BackToTop/ThemeToggle -> styled(IconButton)): se
     declara UNA vez aquí y viaja a todo lo que compone sobre Button, sin
     repetirla en cada capa -- mismo criterio de "punto de menor
     duplicación" que ya aplica PRESS.durationMs/PRESS.easing un poco más
     abajo. No es una propiedad de movimiento (no anima, no le aplica la
     regla de prefers-reduced-motion): decide qué gestos captura el propio
     navegador, no qué transiciona el elemento. */
  touch-action: manipulation;
  /* transform (compositor) + background-color (paint) — ambas permitidas por
     §9 revisada: la regla dura prohíbe propiedades de LAYOUT, no de paint. El
     tinte forma parte de la definición de hover-lift.

     Task 9 (primera adopción real de vocabulary.PRESS): transform pasa de
     motion.easing.standard a PRESS.easing -- la MISMA entrada gobierna
     hover-lift (:hover, más abajo) Y press (:active, más abajo), porque CSS
     no admite dos duraciones distintas para una sola propiedad en una
     misma lista de transition; PRESS.durationMs coincide numéricamente con
     motion.duration.fast (100ms los dos), así que solo cambia la curva.
     background-color se queda con motion.easing.standard (punto 4 del
     brief): no es una primitiva de press/hover-lift, es el tinte de
     variante, un rol distinto. */
  transition:
    transform ${PRESS.durationMs}ms ${PRESS.easing},
    background-color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard};
  ${({ $size }) => sizeStyles[$size]}
  ${({ theme, $variant, $intent }) => {
    const a = accent(theme, $intent);
    /* AQUÍ VIVIÓ focusHalo (hallazgo 1, D7): un box-shadow de 4px contra
       semantic.focus que las cuatro variantes sumaban al anillo global, de
       modo que cada botón enfocado pintaba DOS anillos. Retirado el
       2026-09-02 (crítica externa #14, P1 de Craft): el anillo de foco es
       uno solo y se declara una única vez, en GlobalStyles.tsx, con la
       geometría de src/theme/tokens/focus.ts -- ver ese docblock para el
       porqué. Nada lo sustituye aquí: el botón enfocado sigue llevando el
       mismo outline que cualquier otro control del sitio, y la variante
       outline conserva intacto su anillo inset de reposo, que ya no hay que
       reescribir dentro de ningún bloque de foco. */
    /* Tinte de hover (§13.1: "hover-lift + tint, un paso más oscuro"). Se
       deriva con color-mix del propio acento en vez de añadir un rol
       semántico por intent: así los dos intents lo obtienen sin multiplicar
       tokens, y sigue sin haber valores de color hardcodeados. (Eran cuatro
       hasta la crítica externa #10, 2026-08-18 -- ver el docblock de
       ButtonIntent, arriba: la derivación por color-mix no cambia, solo hay
       menos acentos de los que derivarla.) */
    if ($variant === "solid")
      return css`
        background: ${a};
        color: ${theme.data.semantic.onBrand};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 88%, black);
        }
      `;
    if ($variant === "soft")
      return css`
        background: color-mix(in oklch, ${a} 12%, transparent);
        color: ${a};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 20%, transparent);
        }
      `;
    if ($variant === "outline")
      return css`
        background: transparent;
        color: ${a};
        /* Anillo inset de reposo. Ya no se reescribe dentro de ningún bloque
           de foco: cuando el halo vivía en box-shadow había que repetirlo
           aquí -- box-shadow no fusiona entre declaraciones, la última gana
           entera -- y esa duplicación desaparece con el anillo único por
           outline (2026-09-02, crítica #14 P1). */
        box-shadow: inset 0 0 0 1px ${theme.data.semantic.borderStrong};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 10%, transparent);
        }
      `;
    return css`
      background: transparent;
      color: ${a};
      &:hover:not(:disabled) {
        background: color-mix(in oklch, ${a} 10%, transparent);
      }
    `;
  }}

  /* Únicas dos primitivas de movimiento del sistema: press y hover-lift.
     Ningún componente inventa su propia duración/curva: salen de motion.
     :not(:disabled) no casa nunca con un <a> (la pseudo-clase :disabled
     solo aplica a form controls), así que el ancla deshabilitada necesita
     su propia exclusión vía [aria-disabled="true"].

     Task 19 (punto 5 del brief, inventario de hoverGuard): este hover-lift
     MUEVE (translateY) y hasta esta tarea era el UNICO de las ~10 familias
     pulsables del sitio sin PRESS.hoverGuard -- Button.tsx es, de hecho, el
     origen citado en el propio docblock de PRESS.hoverLift (vocabulary.ts),
     pero Task 9 adopto el guard en el resto de familias sin volver a tocar
     este fichero. Sin guard, un tap en un dispositivo tactil puede dejar la
     elevacion "pegada" tras soltar (el hover persistente clasico de
     iOS/Android) hasta el siguiente toque en otro sitio -- exactamente el
     problema que PRESS.hoverGuard existe para evitar en el resto del sitio.
     Cascada real: IconButton/ThemeToggle/BackToTop (styled(IconButton) ->
     styled(Button)) y los CTA de Hero/Contact (styled(Button)) heredan este
     bloque sin declarar hover propio -- ninguno tenia el guard hasta esta
     tarea. */
  @media ${PRESS.hoverGuard} {
    &:hover:not(:disabled):not([aria-disabled="true"]) {
      transform: translateY(-2px);
    }
  }
  &:active:not(:disabled):not([aria-disabled="true"]) {
    transform: scale(0.98);
  }
  /* disabled nativo (button) + aria-disabled (ancla, que no admite el
     atributo disabled — ver Button.tsx). pointer-events: none bloquea la
     activación por puntero en ambos casos; en el <a> es lo único que
     realmente impide el click, ya que aria-disabled es solo semántica. */
  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Forma de boton bajo forced-colors. El porque completo -- que se apaga en
     ese modo, por que el borde es lo unico que sobrevive, y por que la regla
     vive en un fragmento exportado desde la critica #16 -- esta en el
     docblock de forcedColorsButtonShape, arriba. Se interpola aqui, en la
     base y no dentro de cada rama de variante, para que las cuatro lo hereden
     -- mismo punto de menor duplicacion que ya usan touch-action y las dos
     primitivas de movimiento de arriba. */
  ${forcedColorsButtonShape}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    /* Fix de revision (Task 19): un &:hover, &:active a secas compila a
       especificidad (0,2,0) -- menor que la de las reglas reales de arriba
       (&:hover:not(:disabled):not([aria-disabled="true"]), (0,4,0): un
       :not() toma la especificidad de su argumento, asi que cada uno suma
       un punto). Con menor especificidad, este guard NUNCA gana pese a venir
       despues en la hoja: bajo reduce, transform: translateY(-2px)
       seguia aplicandose en hover (el colapso global de
       transition-duration lo dejaba como un salto instantaneo de 2px en
       vez de un movimiento animado, pero seguia siendo movimiento). Repetir
       aqui los mismos :not() iguala la especificidad exacta, y al venir
       despues en la hoja, el empate lo gana este bloque. */
    &:hover:not(:disabled):not([aria-disabled="true"]),
    &:active:not(:disabled):not([aria-disabled="true"]) {
      transform: none;
    }
  }
`;

// El label permanece en el flujo durante loading para que el ancho del
// botón NO salte; el spinner se superpone centrado encima. Se oculta con
// opacity (no visibility): "name from content" del cómputo de nombre
// accesible de ARIA descarta los descendientes con display:none o
// visibility:hidden, y el spinner ya es aria-hidden — con visibility el
// <button> se quedaría sin nombre accesible durante loading. opacity:0
// mantiene el nodo en el árbol de accesibilidad y en el flujo.
const ScLabel = styled.span<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  pointer-events: ${({ $hidden }) => ($hidden ? "none" : "auto")};
`;

const ScSpinner = styled.span`
  position: absolute;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: ${({ theme }) => theme.data.radius.full};
  animation: ${spin} ${({ theme }) => theme.data.motion.duration.spin} linear
    infinite;

  /* Excepción documentada a "reduced-motion congela todo": un spinner
     inmóvil deja de comunicar que hay una carga en curso, así que se
     ralentiza (spinReduced) en vez de detenerse por completo. El
     !important es obligatorio aquí: el reset global de GlobalStyles fuerza
     animation-duration: 0.001ms !important sobre el selector universal bajo
     el mismo media query, y una declaración !important gana SIEMPRE a una
     que no lo es, sin importar la especificidad del selector — así que sin
     !important aquí esta regla perdería contra el reset y la excepción
     documentada no existiría en la práctica: el spinner se congelaría
     igual. */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: ${({ theme }) =>
      theme.data.motion.duration.spinReduced} !important;
  }
`;

export function Button({
  variant = "solid",
  intent = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ref,
  as: asProp,
  href,
  ...rest
}: ButtonProps): ReactElement {
  const isDisabled = disabled || loading;
  // Sin `as` (o `as="button"`) se renderiza un <button> nativo: el atributo
  // `disabled` funciona de verdad ahí. Cualquier otro elemento (típicamente
  // `as="a"`) NO admite `disabled` — React emitiría `disabled=""`, HTML
  // inválido que no bloquea foco, Enter, click ni la pseudo-clase
  // `:disabled`. Para esos casos se simula el estado con aria-disabled +
  // tabIndex=-1 + retirar el href, y el bloqueo real de click lo da
  // `pointer-events: none` (ver ScButton).
  const isButtonElement = asProp === undefined || asProp === "button";

  // ScButton es `styled.button`: styled-components solo resuelve el overload
  // de <a> para `as` cuando el valor es un literal en el propio JSX, no una
  // variable — así que su ref queda tipado a HTMLButtonElement pase lo que
  // pase por `asProp`. En runtime el nodo es un HTMLAnchorElement cuando
  // as="a"; este wrapper reenvía ese nodo (subtipo) al ref público, que
  // acepta la unión — un ensanchamiento de tipo válido, sin ningún cast.
  const setRef = (node: HTMLButtonElement | null): void => {
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // `href` no existe en ButtonHTMLAttributes<HTMLButtonElement> (ScButton es
  // `styled.button`), así que no puede pasarse como atributo JSX nombrado
  // sin que tsc lo rechace. Se reintroduce vía spread — igual que ya viaja
  // el resto de props propias de <a> a través de `rest` — para retirarlo de
  // verdad cuando el ancla está deshabilitada.
  const hrefProps = isDisabled && !isButtonElement ? {} : { href };

  return (
    <ScButton
      as={asProp}
      ref={setRef}
      $variant={variant}
      $intent={intent}
      $size={size}
      aria-busy={loading || undefined}
      disabled={isButtonElement ? isDisabled : undefined}
      aria-disabled={!isButtonElement && isDisabled ? true : undefined}
      tabIndex={!isButtonElement && isDisabled ? -1 : undefined}
      {...hrefProps}
      {...rest}
    >
      {loading && <ScSpinner aria-hidden="true" />}
      <ScLabel $hidden={loading}>{children}</ScLabel>
    </ScButton>
  );
}
