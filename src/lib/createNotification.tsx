import React from "react";
import { createPortal } from "react-dom";
import PopupNotification from "@/components/featured/PopupNotification/PopupNotification";
import generateUUID from "@/utils/generateUUID";
import {
  INotification,
  NotificationTypes,
} from "@/components/featured/PopupNotification/PopupNotification.types";

const createNotification = (
  type: NotificationTypes,
  title: string,
  description: string
) => {
  const elementUUID = generateUUID(false);
  const newElement = document.createElement("div");
  newElement.id = elementUUID;
  newElement.style.height = "auto";
  newElement.style.width = "100%";
  const notificationWrapper = document.querySelector("#app-noty-wrapper");
  const notificationElement = (
    <PopupNotification
      id={elementUUID}
      type={type}
      title={title}
      description={description}
    />
  );
  notificationWrapper &&
    createPortal(notificationElement, notificationWrapper, elementUUID);

  notificationWrapper?.appendChild(newElement);
  // Se desmonta el componente
  setTimeout(() => {
    notificationWrapper?.removeChild(newElement);
  }, 20000);
};

export const trateNotify = () => {
  const newID = generateUUID(false);
  const newNotification: INotification = {
    id: newID,
    type: "default",
    title: "Test",
    description: "asd",
  };
  // dispatch(addNotification(newNotification));
};

export default createNotification;
