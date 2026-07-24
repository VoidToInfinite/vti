"use client";

import type { InputHTMLAttributes, ReactElement, Ref } from "react";
import { cloneElement } from "react";
import styled from "styled-components";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Estado visual de error (borde `semantic.error`). Deriva también
   * `aria-invalid` cuando el consumidor no lo pasa explícitamente — ver
   * `Input()`. Es independiente del mensaje de error de `Field`: éste solo
   * resuelve la asociación ARIA (`aria-describedby`/`aria-invalid`) con el
   * control envuelto, sin asumir que ese control sea siempre `Input`.
   */
  error?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const ScInput = styled.input<{ $error?: boolean }>`
  height: 44px;
  width: 100%;
  padding: 0 ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.sm};
  border: 1px solid
    ${({ theme, $error }) =>
      $error ? theme.data.semantic.error : theme.data.semantic.border};
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
      $error={error}
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

  // Sin esto, el texto de ayuda/error queda pintado debajo del control pero
  // sin asociación ARIA — un lector de pantalla nunca lo anuncia. El id es
  // determinista a partir de `htmlFor` (nunca aleatorio): un id aleatorio
  // rompería el HTML prerenderizado del export estático.
  const control = cloneElement(children, {
    "aria-describedby": messageId ?? children.props["aria-describedby"],
    "aria-invalid": hasError ? true : children.props["aria-invalid"],
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
