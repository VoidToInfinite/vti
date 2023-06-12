import { useEffect, RefObject, useRef } from "react";

type HookEvent = MouseEvent | TouchEvent;

interface Options {
  events?: ("mousedown" | "touchstart")[];
  ignore?: RefObject<HTMLElement>[];
  ignoreButtons?: number[];
}

/**
 * Utiliza un callback ref para garantizar la compatibilidad con elementos con renderizado diferido
 * Mejora la legibilidad y la seguridad del código mediante la eliminación de tipos inseguros y la verificación de tipos más rigurosa.
 *
 * @param handler
 * @param param1
 * @returns ref as HTMLElement
 */
const useOnClickOutside = <T extends HTMLElement>(
  ref: React.RefObject<T>[],
  handler: (event: HookEvent) => void,
  {
    events = ["mousedown", "touchstart"],
    ignore = [],
    ignoreButtons = [],
  }: Options = {}
): RefObject<T>[] => {
  const handlerRef = useRef<typeof handler>();

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: HookEvent) => {
      let currentElement = false;
      // eslint-disable-next-line no-restricted-syntax
      for (const element of ref) {
        if (
          !element.current ||
          ignore.some((i) => i.current?.contains(event.target as Node))
        ) {
          currentElement = true;
          break;
        }
      }
      if (currentElement) return;

      if (
        !ref.some((refElement) =>
          refElement.current?.contains(event.target as Node)
        ) &&
        !ignoreButtons.includes(event instanceof MouseEvent ? event.button : 0)
      ) {
        handlerRef.current?.(event);
      }
    };

    events.forEach((event) => document.addEventListener(event, listener));

    return () => {
      events.forEach((event) => document.removeEventListener(event, listener));
    };
  }, [ref, events, ignore, ignoreButtons]);

  return ref;
};

export default useOnClickOutside;
