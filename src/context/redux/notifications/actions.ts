import { createAction } from "@reduxjs/toolkit";
import { INotification } from "@/components/featured/PopupNotification/PopupNotification.types";
import { ADD_NOTIFICATION, SET_NOTIFICATIONS } from "@/constants/notifications";

/**
 * NotificationsReducer action: ADD_NOTIFICATION
 */
export const addNotification = createAction(
  ADD_NOTIFICATION,
  (noty: INotification) => {
    return {
      payload: noty,
      debounce: 200,
    };
  }
);

/**
 * NotificationsReducer action: SET_NOTIFICATIONS
 */
export const setNotifications = createAction(
  SET_NOTIFICATIONS,
  (noty: INotification[]) => {
    return {
      payload: noty,
      debounce: 1000,
    };
  }
);
