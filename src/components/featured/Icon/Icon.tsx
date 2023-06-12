/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React from "react";
import IconVoidToInfinite from "@/assets/icons/VoidToInfinite";
import APP_ICONS from "@/utils/AppIconRoutes";
import type { IconProps } from "./Icon.types";

const Icon: React.FC<IconProps> = ({ ...props }) => {
  const getIcon = (iconName: string) =>
    APP_ICONS[iconName] || IconVoidToInfinite;
  const SelectedIcon: React.FC<IconProps> = getIcon(props.src);

  return (
    <span
      style={{
        height: props.size,
        width: props.size,
      }}
    >
      <SelectedIcon
        color={props.color}
        fill={props.fill}
        name={props.name}
        size={props.size}
        src={props.src}
        strokeWidth={props.strokeWidth}
        title={props.title}
      />
    </span>
  );
};

export default Icon;
