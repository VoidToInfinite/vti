"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PopupNotification from "@/components/featured/PopupNotification/PopupNotification";
import { INotification } from "@/components/featured/PopupNotification/PopupNotification.types";
import { RootState } from "@/context/redux/store";
import Wrapper from "../Wrapper/Wrapper";

const Notifications: React.FC = () => {
  const notificationsList: INotification[] = useSelector(
    (state: RootState) => state.notifications.notifications
  );
  const [activeNotifys, setActiveNotifys] = useState<INotification[]>([]);
  //
  useEffect(() => {
    setActiveNotifys(notificationsList);
  }, [notificationsList]);
  //
  return activeNotifys.length > 0 ? (
    <Wrapper
      id="app-noty-wrapper"
      wrapperType="notify"
    >
      {React.Children.toArray(
        activeNotifys.map(
          ({ id, type, title, description, isActive }) =>
            isActive && (
              <PopupNotification
                id={id}
                type={type}
                title={title}
                description={description}
              />
            )
        )
      )}
    </Wrapper>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );
};

export default Notifications;
