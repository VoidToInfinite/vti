interface IconType {
  color?: string;
  name: string;
  size?: number;
  src: string;
  strokeWidth?: number;
  title: string;
}

export type ButtonSize = "sm" | "md" | "lg" | "xl";
export type ButtonType = "button" | "submit" | "reset";
export type ButtonTypeStyle =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "success"
  | "information"
  | "warning"
  | "error"
  | "sidebar";

export interface ButtonProps {
  id?: string;
  type: ButtonType;
  size: ButtonSize;
  typeStyle: ButtonTypeStyle;
  text: string;
  iconSize?: number;
  leftIcon?: IconType;
  showLeftIcon?: boolean;
  rightIcon?: IconType;
  showRightIcon?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

export interface SidebarButtonProps {
  name: string;
  icon: string;
  iconSize?: number;
  isActive: boolean;
  hasSubNav: boolean;
  onClick: () => void;
}
