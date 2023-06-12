import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@/components/featured/Icon/Icon";
import ScButton from "./Button.sc";
import type { ButtonProps } from "./Button.types";

const Button: React.FC<ButtonProps> = ({
  id,
  type,
  typeStyle = "primary",
  size,
  text,
  iconSize = 20,
  leftIcon,
  showLeftIcon = false,
  rightIcon,
  showRightIcon = false,
  isActive = false,
  isDisabled = false,
  onClick,
}) => {
  const { t } = useTranslation();
  const [isPressed, setIsPressed] = useState<boolean>(false);

  const handleOnBlur = () => {
    setIsPressed(!isPressed);
  };

  const handleOnClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <ScButton
      id={id}
      aria-pressed={isPressed}
      aria-label={t("Common.Button.ariaLabel.pressButton").concat(` ${text}`)}
      className={`${isActive ? "active" : ""}`}
      hashText={text !== ""}
      name={text}
      size={size}
      title={text}
      type={type}
      typeStyle={typeStyle}
      disabled={isDisabled}
      onClick={handleOnClick}
      onMouseDown={handleOnBlur}
      onMouseUp={handleOnBlur}
      onTouchStart={handleOnBlur}
      onTouchEnd={handleOnBlur}
    >
      {showLeftIcon && leftIcon && (
        <Icon
          color={leftIcon.color}
          name={text}
          size={iconSize}
          src={leftIcon.src}
          strokeWidth={leftIcon.strokeWidth}
          title={leftIcon.title}
        />
      )}
      {text && text}
      {showRightIcon && rightIcon && (
        <Icon
          color={rightIcon.color}
          name={text}
          size={iconSize}
          src={rightIcon.src}
          strokeWidth={rightIcon.strokeWidth}
          title={rightIcon.title}
        />
      )}
    </ScButton>
  );
};

export default Button;
