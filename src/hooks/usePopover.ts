import { MutableRefObject, useCallback, useReducer, useRef } from "react";
import { HookEvent } from "@/types/Hooks.types";
import useOnClickOutside from "./useOnClickOutside";

interface IPopoverState {
  isPopoverOpen: boolean;
  anchorEl: HTMLElement | null;
}

const initialState: IPopoverState = {
  isPopoverOpen: false,
  anchorEl: null,
};

interface IUsePopover {
  statePopover: IPopoverState;
  openPopover: (event: HookEvent<HTMLElement>) => void;
  closePopover: () => void;
  refElement: MutableRefObject<HTMLElement | null>;
}

type PopoverAction = { type: "open"; payload: HTMLElement } | { type: "close" };

const reducer = (
  state: IPopoverState,
  action: PopoverAction
): IPopoverState => {
  switch (action.type) {
    case "open":
      return { isPopoverOpen: true, anchorEl: action.payload };
    case "close":
      return {
        isPopoverOpen: state.isPopoverOpen ? false : state.isPopoverOpen,
        anchorEl: null,
      };
    default:
      return state;
  }
};

const usePopover = (): IUsePopover => {
  const [statePopover, dispatch] = useReducer(reducer, initialState);
  const refElement = useRef<HTMLElement | null>(null);

  const openPopover = useCallback((event: HookEvent<HTMLElement>) => {
    dispatch({ type: "open", payload: event.currentTarget });
  }, []);

  const closePopover = useCallback(() => {
    dispatch({ type: "close" });
  }, []);

  useOnClickOutside([refElement], closePopover);

  return {
    statePopover,
    openPopover,
    closePopover,
    refElement,
  };
};

export default usePopover;
