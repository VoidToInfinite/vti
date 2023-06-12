"use client";

import Wrapper from "@/components/containers/Wrapper/Wrapper";
import PopupNotification from "@/components/featured/PopupNotification/PopupNotification";
import { INotification } from "@/components/featured/PopupNotification/PopupNotification.types";
import { useIsomorphicLayoutEffect } from "@/helpers/isomorphicEffect";
import React, { createContext, useCallback, useMemo, useState } from "react";

interface IAppNotificationProvider {
  children: React.ReactElement | React.ReactNode | React.ReactNode[];
}

export interface IAppNotificationContext {
  notifications: INotification[];
  addNotification: (notification: INotification) => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
// Creamos el contexto de las notificaciones
const AppNotificationContext = createContext<IAppNotificationContext>({
  notifications: [],
  addNotification: (_notification: INotification) => {},
  removeNotification: (_notificationId: string) => {},
  clearNotifications: () => {},
});

const AppNotificationProvider = ({ children }: IAppNotificationProvider) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  /**
   * Funcion para agregar una notificacion al estado
   * @param notification INotification
   */
  const addNotification = useCallback((notification: INotification) => {
    setNotifications((prevNotifications) => [
      ...prevNotifications,
      notification,
    ]);
  }, []);

  /**
   * Funcion para eliminar una notificacion del estado
   * @param notificationId string
   */
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter(
        (notification) => notification.id !== notificationId
      )
    );
  }, []);

  /**
   * Funcion para eliminar todas las notificaciones del estado
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Creamos el objeto de contexto con los valores y funciones necesarios
   */
  const notificationsContextValue = useMemo<IAppNotificationContext>(
    // eslint-disable-next-line arrow-body-style
    () => ({
      notifications,
      addNotification,
      removeNotification,
      clearNotifications,
    }),
    [notifications, addNotification, removeNotification, clearNotifications]
  );

  useIsomorphicLayoutEffect(() => {
    if (notifications.length > 0) {
      setTimeout(() => {
        removeNotification(notifications[0].id);
      }, 5000);
    }
  }, [notifications]);

  return (
    <AppNotificationContext.Provider value={notificationsContextValue}>
      {notifications.length > 0 && (
        <Wrapper
          id="app-noty-wrapper"
          wrapperType="notify"
        >
          {React.Children.toArray(
            notifications.map(({ id, type, title, description }) => (
              <PopupNotification
                id={id}
                type={type}
                title={title}
                description={description}
              />
            ))
          )}
        </Wrapper>
      )}
      {children}
    </AppNotificationContext.Provider>
  );
};

export { AppNotificationProvider, AppNotificationContext };
