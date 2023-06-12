import React from "react";
import Icon from "@/components/featured/Icon/Icon";
import ScPopoverItem from "./PopoverItem.sc";
import IPopoverItem from "./PopoverItem.types";

const PopoverItem: React.FC<IPopoverItem> = ({ text, leftIcon, rightIcon }) => (
  <ScPopoverItem>
    {leftIcon && (
      <Icon
        color={leftIcon.color}
        name={leftIcon.name}
        size={24}
        src={leftIcon.src}
        strokeWidth={leftIcon.strokeWidth}
        title={leftIcon.title}
      />
    )}
    <p>{text}</p>
    {rightIcon && (
      <Icon
        color={rightIcon.color}
        name={rightIcon.name}
        size={24}
        src={rightIcon.src}
        strokeWidth={rightIcon.strokeWidth}
        title={rightIcon.title}
      />
    )}
  </ScPopoverItem>
);

export default PopoverItem;
