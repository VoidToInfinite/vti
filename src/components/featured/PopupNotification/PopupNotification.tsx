"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsomorphicLayoutEffect } from "@/helpers/isomorphicEffect";
import { INotification } from "./PopupNotification.types";
import ScNotification, {
  ScNotificationBody,
  ScNotificationHeader,
  ScNotificationTimer,
} from "./PopupNotification.sc";
import Icon from "../Icon/Icon";
import Button from "../Button/Button";
import Typography from "../Typography/Typography";

const NOTIFICATION_ICONS = {
  default: "user",
  success: "check",
  information: "information",
  warning: "warningTriangle",
  error: "closeCircle",
};

const PopupNotification: React.FC<INotification> = ({
  id,
  type,
  title,
  description,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<boolean>(true);
  const [visibleProgress, setVisibleProgress] = useState<number>(100);
  const handleOnClose = () => {
    setVisible(false);
  };
  //
  useIsomorphicLayoutEffect(() => {
    const visibleTime = 10000;
    const visibleInterval = 10;
    const resultTime = (visibleInterval / visibleTime) * 100;
    const visibleTimer = setInterval(() => {
      setVisibleProgress((prev: number) => {
        if (prev <= 0) {
          clearInterval(visibleTimer);
          setVisible(false);
          return prev;
        }
        return prev - resultTime;
      });
    }, resultTime);
    return () => {
      clearInterval(visibleTimer);
    };
  });
  //
  useIsomorphicLayoutEffect(() => {
    if (!visible) {
      handleOnClose();
    }
  }, [visible]);
  //
  return (
    <ScNotification
      id={id}
      type={type}
      isVisible={visible}
    >
      <ScNotificationHeader>
        <Icon
          name={`Notificaction ${NOTIFICATION_ICONS[type]} icon`}
          size={24}
          src={NOTIFICATION_ICONS[type]}
          title={`Notificaction ${NOTIFICATION_ICONS[type]} icon`}
        />
        <p>
          {type === "default"
            ? t("Common.Notification.title").charAt(0).toUpperCase() +
              t("Common.Notification.title").slice(1)
            : type.charAt(0).toUpperCase() + type.slice(1)}
        </p>
        <Button
          type="button"
          size="sm"
          typeStyle="ghost"
          text=""
          iconSize={24}
          showLeftIcon
          leftIcon={{
            name: `Notificaction button`,
            src: "close",
            title: `Close ${NOTIFICATION_ICONS[type]} notificaction`,
          }}
          onClick={handleOnClose}
        />
      </ScNotificationHeader>
      <ScNotificationBody>
        <Typography
          type="p1"
          value={title ?? t("Common.Notification.default.title")}
        />
        <Typography
          type="p2"
          value={description ?? t("Common.Notification.default.description")}
        />
      </ScNotificationBody>
      <ScNotificationTimer style={{ width: `${visibleProgress}%` }} />
    </ScNotification>
  );
};

export default PopupNotification;
