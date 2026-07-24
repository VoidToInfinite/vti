"use client";

import type { InputHTMLAttributes, ReactElement, Ref } from "react";
import { Children, cloneElement, Fragment } from "react";
import styled from "styled-components";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Azúcar para marcar error en uso suelto (sin `Field`). Su único efecto es
   * fijar `aria-invalid="true"` cuando el consumidor no pasa `aria-invalid`
   * explícito — no abre un camino de estilo paralelo. El borde de error se
   * deriva SIEMPRE del atributo `aria-invalid` en el DOM (selector
   * `&[aria-invalid="true"]` en `ScInput`), nunca de este prop directamente:
   * así el estado visual y el accesible no pueden desincronizarse, vengan de
   * este prop, de `Field` o de un `aria-invalid` puesto a mano.
   */
  error?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const ScInput = styled.input`
  height: 44px;
  width: 100%;
  padding: 0 ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.sm};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  background: ${({ theme }) => theme.data.semantic.surface};
  color: ${({ theme }) => theme.data.semantic.text};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  transition: border-color ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  /* El anillo de foco lo aporta GlobalStyles (:focus-visible) de forma
     global — no se redefine ni se anula (nada de outline: none) aquí. Este
     cambio de borde es un refuerzo visual adicional, no un sustituto. */
  &:focus {
    border-color: ${({ theme }) => theme.data.semantic.borderStrong};
  }

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
  "aria-describedby"?: string;
  "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
}

interface FieldProps {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  /**
   * El control envuelto (típicamente `Input`, en el futuro `Textarea`/
   * `Select`). Debe ser un único elemento: `Field` le inyecta
   * `aria-describedby`/`aria-invalid` vía `cloneElement`, así que necesita
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
        >
          {message}
        </ScMsg>
      )}
    </div>
  );
}
