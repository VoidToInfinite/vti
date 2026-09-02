"use client";

import type { InputHTMLAttributes, ReactElement, Ref } from "react";
import { Children, cloneElement, Fragment } from "react";
import styled from "styled-components";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Azúcar para marcar error en uso suelto (sin Field). Su único efecto es
   * fijar aria-invalid="true" cuando el consumidor no pasa aria-invalid
   * explícito — no abre un camino de estilo paralelo. El borde de error se
   * deriva SIEMPRE del atributo aria-invalid en el DOM (selector
   * &[aria-invalid="true"] en ScInput), nunca de este prop directamente:
   * así el estado visual y el accesible no pueden desincronizarse, vengan de
   * este prop, de Field o de un aria-invalid puesto a mano.
   */
  error?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const ScInput = styled.input`
  height: 44px;
  width: 100%;
  padding: 0 ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.sm};
  /*
   * BORDE EN REPOSO — incumplimiento REAL de WCAG 1.4.11 corregido el
   * 2026-08-14 (QA §6, hallazgo lateral del bloqueante 2).
   *
   * Este campo usaba semantic.border, y medido sobre píxel pintado contra
   * su PROPIO relleno daba **1,128:1 en claro** y **2,103:1 en oscuro**. Un
   * campo de formulario SÍ es un componente de interfaz: su contorno es lo
   * que permite identificarlo, así que aquí el 3:1 de 1.4.11 no es opinión
   * de diseño, es requisito. En claro el campo era blanco sobre casi blanco
   * con un borde casi invisible.
   *
   * POR QUÉ UN VALOR FIJO Y NO UN ROL SEMÁNTICO: los dos temas tiran en
   * sentidos opuestos —en claro hace falta oscurecer, en oscuro aclarar— y
   * neutral[600] es el ÚNICO escalón de la rampa que cruza el umbral en
   * las dos ramas a la vez: **3,112:1 en claro y 4,060:1 en oscuro**. Los
   * escalones vecinos fallan en una u otra (500 da 2,340 en claro; 700 da
   * 2,406 en oscuro).
   *
   * HALLAZGO DE SISTEMA que este arreglo NO resuelve, y conviene no perder:
   * semantic.borderStrong —el rol que el sistema ofrece como "borde
   * fuerte"— tampoco llega a 3:1 en ninguna rama (1,999 en claro con
   * neutral[400], 2,406 en oscuro con neutral[700]). Cualquier otro
   * componente que confíe en él para delimitar un control tiene el mismo
   * problema que tenía este.
   */
  border: 1px solid ${({ theme }) => theme.data.palette.neutral[600]};
  background: ${({ theme }) => theme.data.semantic.surface};
  color: ${({ theme }) => theme.data.semantic.text};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  transition: border-color ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  /* El anillo de foco lo aporta GlobalStyles (:focus-visible) de forma
     global — no se redefine ni se anula (nada de outline: none) aquí. Este
     cambio de borde es un refuerzo visual adicional, no un sustituto.

     DECISIÓN (hallazgo 1, D7): se mantiene &:focus, NO &:focus-visible, para
     este refuerzo de borde. Es la elección correcta para un campo de texto:
     un input enfocado por teclado (tabulando) y uno enfocado por clic del
     ratón quieren exactamente el mismo realce -- a diferencia de un botón,
     donde solo el foco por teclado necesita un indicador visual porque el
     clic ya deja claro dónde recayó la acción, un campo de texto que se va a
     escribir necesita marcar su borde SIEMPRE que tiene el foco, sea cual
     sea la modalidad: si solo reaccionara a :focus-visible, un clic de ratón
     dejaría el campo activo sin ninguna señal de que ahí es donde va a
     aparecer el texto que se escriba. */
  /*
   * El foco tiene que REFORZAR el borde, y con el reposo ya en neutral[600]
   * el antiguo semantic.borderStrong lo DEBILITABA en las dos ramas (1,999
   * en claro y 2,406 en oscuro, contra 3,112 y 4,060 del reposo): enfocar el
   * campo habría hecho su contorno menos visible, que es lo contrario de lo
   * que un refuerzo de foco significa.
   *
   * Se resuelve por rama (theme.isLight, mismo precedente que la Task 26 y
   * que BrandName/LanguageSelector) porque "más fuerte" apunta en
   * direcciones opuestas según el fondo: en claro se oscurece hasta
   * neutral[800], en oscuro se aclara hasta neutral[400]. Las dos
   * direcciones suben respecto a su propio reposo, que es la única propiedad
   * que este bloque tiene que garantizar.
   */
  &:focus {
    border-color: ${({ theme }) =>
      theme.data.isLight
        ? theme.data.palette.neutral[800]
        : theme.data.palette.neutral[400]};
  }

  /* AQUÍ VIVIÓ un &:focus-visible propio (hallazgo 1, D7): un halo de 4px
     por box-shadow contra semantic.focus, ADITIVO al anillo global, así que
     un campo enfocado por teclado pintaba dos anillos. Retirado el
     2026-09-02 (crítica externa #14, P1 de Craft): el anillo de foco se
     declara una sola vez en GlobalStyles.tsx con la geometría de
     src/theme/tokens/focus.ts, y ningún componente añade el suyo.

     Lo que NO cambia es el refuerzo de borde de &:focus de arriba, que sigue
     siendo lo específico de un campo de texto (reacciona también al ratón,
     donde :focus-visible no casa) y es lo único que este componente aporta
     al estado de foco. */

  /* El borde de error se deriva del atributo aria-invalid, no de un prop
     $error transitorio. Así el estado visual queda atado al mismo dato que
     lee un lector de pantalla — no puede haber uno sin el otro, sea cual sea
     el origen (prop error suelto o inyección de Field). */
  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.data.semantic.error};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function Input({
  error,
  "aria-invalid": ariaInvalid,
  ref,
  ...rest
}: InputProps): ReactElement {
  return (
    <ScInput
      ref={ref}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      {...rest}
    />
  );
}

interface FieldControlProps {
  "id"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
}

interface FieldProps {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  /**
   * El control envuelto (típicamente Input, en el futuro Textarea/
   * Select). Debe ser un único elemento: Field le inyecta
   * aria-describedby/aria-invalid vía cloneElement, así que necesita
   * un elemento real al que clonar, no una lista de nodos.
   */
  children: ReactElement<FieldControlProps>;
}

const ScLabel = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.text};
`;

const ScMsg = styled.p<{ $error?: boolean }>`
  margin: ${({ theme }) => theme.data.space[2]} 0 0;
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  color: ${({ theme, $error }) =>
    $error ? theme.data.semantic.error : theme.data.semantic.textSubtle};
`;

// ARIA admite varios ids separados por espacio en `aria-describedby`. Si el
// consumidor ya trae uno puesto a mano, `Field` debe añadir el suyo, no
// reemplazarlo — perder el id del consumidor rompería cualquier asociación
// que ya tuviera configurada fuera de `Field`.
function mergeDescribedBy(
  existing: string | undefined,
  addition: string | undefined,
): string | undefined {
  const ids = [existing, addition]
    .flatMap((value) => (value ? value.split(" ") : []))
    .filter(Boolean);
  return ids.length > 0 ? Array.from(new Set(ids)).join(" ") : undefined;
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
}: FieldProps): ReactElement {
  const hasError = !!error;
  // Decisión (help + error simultáneos): solo el error queda anunciado. Es
  // el mensaje bloqueante — el que un lector de pantalla debe leer primero
  // — y evita duplicar/diluir el anuncio con un texto de ayuda que ya dejó
  // de ser la prioridad mientras el campo está inválido. El help vuelve a
  // pintarse en cuanto el error se resuelve (misma regla que el render
  // visual: un solo mensaje a la vez, nunca los dos apilados).
  const message = error ?? help;
  const messageId = message
    ? `${htmlFor}-${hasError ? "error" : "help"}`
    : undefined;

  // `FieldControlProps` no exige ningún campo, así que un `Fragment` (o una
  // lista de hijos) typechequea como `ReactElement<FieldControlProps>` sin
  // problema. `Children.only` protege en runtime contra "más de un nodo" (un
  // Fragment con varios hijos, o varios hijos sueltos) lanzando un error
  // claro en vez de fallar en silencio; el chequeo de `Fragment` cubre el
  // caso de un Fragment con un único hijo, que sí pasaría `Children.only`
  // pero descartaría los props inyectados igualmente (un Fragment no
  // reenvía props al DOM).
  const singleChild = Children.only(children);
  if (singleChild.type === Fragment) {
    throw new Error(
      "Field: `children` debe ser un único control real (p. ej. `Input`) que reenvíe props al DOM. Un Fragment (<>...</>) descarta en silencio el `aria-describedby`/`aria-invalid` que Field le inyecta, y la asociación accesible se pierde sin error visible.",
    );
  }

  // Sin esto, el texto de ayuda/error queda pintado debajo del control pero
  // sin asociación ARIA — un lector de pantalla nunca lo anuncia. El id es
  // determinista a partir de `htmlFor` (nunca aleatorio): un id aleatorio
  // rompería el HTML prerenderizado del export estático.
  const control = cloneElement(singleChild, {
    // `ScLabel` usa `htmlFor={htmlFor}` para asociar la etiqueta con el
    // control — así que el control necesita ese mismo id en el DOM. Si el
    // hijo ya trae un `id` explícito se respeta (mismo criterio que
    // `aria-describedby`/`aria-invalid`: nunca se pisa lo que el consumidor
    // ya puso a mano), y solo se usa `htmlFor` como valor por defecto.
    "id": singleChild.props.id ?? htmlFor,
    "aria-describedby": mergeDescribedBy(
      singleChild.props["aria-describedby"],
      messageId,
    ),
    "aria-invalid": hasError ? true : singleChild.props["aria-invalid"],
  });

  return (
    <div>
      <ScLabel htmlFor={htmlFor}>{label}</ScLabel>
      {control}
      {message && (
        <ScMsg
          id={messageId}
          $error={hasError}
          // `role="status"` SOLO cuando hay error (task 1, auditoría premium
          // 2026-08-08, WCAG 3.3.1 + 4.1.3): anuncia el mensaje a un lector
          // de pantalla sin robarle el foco ni interrumpir como haría
          // `role="alert"` -- se lee en la primera pausa natural, mientras
          // el usuario sigue en el campo. El `help` (sin error) no lleva
          // ningún role: no es una notificación dinámica, es texto de apoyo
          // estático que ya queda asociado por `aria-describedby`.
          role={hasError ? "status" : undefined}
        >
          {message}
        </ScMsg>
      )}
    </div>
  );
}
