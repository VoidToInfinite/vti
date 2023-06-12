import React, { RefObject, useEffect, useState } from "react";
import usePopover from "@/hooks/usePopover";
import { HookEvent } from "@/types/Hooks.types";
import Flex from "@/components/containers/Flex/Flex";
import generateUUID from "@/utils/generateUUID";
import {
  ScProfileAvatar,
  ScProfileAvatarBadge,
  ScProfileAvatarName,
  ScProfileAvatarWrapper,
} from "./ProfileAvatar.sc";
import IProfileAvatar from "./ProfileAvatar.types";
import { ScPopoverSeparator } from "../Popover/Popover.sc";
import PopoverItem from "../Popover/PopoverItem/PopoverItem";
import Popover from "../Popover/Popover";

// eslint-disable-next-line max-lines-per-function
const ProfileAvatar = ({
  src,
  name,
  hasBadge,
  isActive,
  onBlur,
}: IProfileAvatar) => {
  const avatarId = generateUUID(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const { statePopover, openPopover, closePopover, refElement } = usePopover();
  //
  const handleClickAvatar = (e: HookEvent<HTMLDivElement>): void => {
    // setIsProfileMenuOpen(!isProfileMenuOpen);
    if (statePopover.isPopoverOpen) return;
    if (isProfileMenuOpen) {
      closePopover();
    } else {
      openPopover(e);
    }
  };
  //
  useEffect(() => {
    setIsProfileMenuOpen(statePopover.isPopoverOpen);
  }, [statePopover.isPopoverOpen]);
  return (
    <ScProfileAvatarWrapper
      ref={refElement as RefObject<HTMLDivElement>}
      name={`${name}'s avatar`}
      isActive={isActive}
      onClick={handleClickAvatar}
      onBlur={onBlur}
    >
      {hasBadge && <ScProfileAvatarBadge />}
      {src ? (
        <ScProfileAvatar
          id={avatarId}
          alt={name}
          src={src}
        />
      ) : (
        <ScProfileAvatarName id={avatarId}>{name}</ScProfileAvatarName>
      )}
      <Popover
        propRef={refElement}
        isDisplayed={statePopover.isPopoverOpen}
      >
        <Flex
          container
          width="240px"
          alignItems="flex-start"
          justifyContent="stretch"
          flexDirection="column"
          gap="8px"
        >
          <PopoverItem
            text="My profile"
            leftIcon={{
              name: "user-icon",
              src: "user",
              title: "User icon",
              size: 24,
            }}
          />
          <PopoverItem
            text="Settings"
            leftIcon={{
              name: "settings-icon",
              src: "settings",
              title: "Settings icon",
              size: 24,
            }}
          />
          <PopoverItem
            text="Choose theme"
            leftIcon={{
              name: "paintbucket-icon",
              src: "paintbucket",
              title: "Paintbucket icon",
              size: 24,
            }}
          />
          <ScPopoverSeparator />
          <PopoverItem
            text="Guide & Tutorials"
            leftIcon={{
              name: "book-icon",
              src: "book",
              title: "Book icon",
              size: 24,
            }}
          />
          <PopoverItem
            text="Help center"
            leftIcon={{
              name: "helpCircle-icon",
              src: "helpCircle",
              title: "Help circle icon",
              size: 24,
            }}
          />
        </Flex>
      </Popover>
    </ScProfileAvatarWrapper>
  );
};

export default ProfileAvatar;
