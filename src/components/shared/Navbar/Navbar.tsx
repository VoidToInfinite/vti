import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@/components/containers/Box/Box";
import Flex from "@/components/containers/Flex/Flex";
import Button from "@/components/featured/Button/Button";
import CustomLink from "@/components/featured/CustomLink/CustomLink";
import LanguageSelector from "@/components/featured/LanguageSelector/LanguageSelector";
import Overlay from "@/components/featured/Overlay/Overlay";
import Typography from "@/components/featured/Typography/Typography";
import Icon from "@/components/featured/Icon/Icon";
import { navbarItems } from "@/constants/navbar";
import useWindowSize from "@/hooks/useWindowSize";
import generateUUID from "@/utils/generateUUID";
import { ScNavbar } from "./Navbar.sc";
import ProfileAvatar from "../ProfileAvatar/ProfileAvatar";
import Separator from "../Separator/Separator";

// eslint-disable-next-line max-lines-per-function
const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const windowSize = useWindowSize();
  const [isNavMenuOpen, setIsNavMenuOpen] = useState<boolean>(false);
  const navId = generateUUID(false);
  const navMenuId = generateUUID(false);

  const NAV_LIST: Record<string, string> = {
    Home: t("Common.Navigation.home"),
    Reflection: t("Common.Navigation.reflection"),
    Games: t("Common.Navigation.games"),
  };

  const handleClickMenuNavbar = (): void => {
    const navBar = document.querySelector(`#nav${navId}`);
    navBar?.classList.toggle("overlayMenu");
    setIsNavMenuOpen(!isNavMenuOpen);
  };

  return (
    <ScNavbar id={`nav${navId}`}>
      <Overlay
        isVisible={isNavMenuOpen}
        onClick={handleClickMenuNavbar}
      />
      <Flex
        container
        height="auto"
        width="auto"
        alignItems="center"
        justifyContent="flex-start"
        flexDirection="row"
        flexGrow={windowSize.width < 768 ? 2 : 0}
        gap="8px"
      >
        <Icon
          name=""
          size={32}
          src="voidToInfinite"
          title=""
        />
        <Button
          size="sm"
          iconSize={32}
          text=""
          type="button"
          typeStyle="ghost"
          showLeftIcon
          leftIcon={{
            name: "menu-icon",
            src: "menu",
            title: `${t("Common.Navbar.openMenu")}`,
            strokeWidth: 2.5,
          }}
          onClick={handleClickMenuNavbar}
        />
      </Flex>
      <Flex
        container
        id={navMenuId}
        height="auto"
        className={windowSize.width < 768 ? "navbar-menu" : ""}
        alignItems={windowSize.width < 768 ? "flex-start" : "center"}
        justifyContent="flex-start"
        flexDirection={isNavMenuOpen ? "column" : "row"}
        flexGrow={3}
        gap="1rem"
      >
        {windowSize.width < 768 && (
          <Box margin="0rem 0rem 1rem">
            <Typography
              type="h1NavTitle"
              value="VoidToInfinite"
            />
            <Separator />
          </Box>
        )}
        {React.Children.toArray(
          navbarItems.map(({ text, route }) => (
            <CustomLink
              className="navbar-link"
              href={route}
            >
              {NAV_LIST[text]}
            </CustomLink>
          ))
        )}
        {windowSize.width < 768 && (
          <>
            <Separator />
            <LanguageSelector />
          </>
        )}
      </Flex>
      {windowSize.width > 768 && (
        <Flex
          container
          height="50px"
          alignItems="center"
          justifyContent="flex-end"
          alignSelf="center"
          gap="8px"
          overflow="visible"
        >
          <LanguageSelector />
        </Flex>
      )}
      <ProfileAvatar name="VI" />
    </ScNavbar>
  );
};

export default Navbar;
