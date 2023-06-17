import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import Button from "@/components/featured/Button/Button";
import Flex from "@/components/containers/Flex/Flex";
import Typography from "@/components/featured/Typography/Typography";
import CustomLink from "@/components/featured/CustomLink/CustomLink";
import Grid from "@/components/containers/Grid/Grid";
import { navbarItems, peopleList } from "@/constants/navbar";
import toggleTheme from "@/context/redux/theme/actions";
import { ThemeList } from "@/themes/Themes";
import generateUUID from "@/utils/generateUUID";
import ScFooter, { ScFooterNav } from "./Footer.sc";

// eslint-disable-next-line max-lines-per-function
const Footer: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const footerID = generateUUID(false);

  const NAV_LIST: Record<string, string> = {
    Home: t("Common.Navigation.home"),
    Reflection: t("Common.Navigation.reflection"),
    Games: t("Common.Navigation.games"),
  };

  return (
    <ScFooter id={`footer${footerID}`}>
      <Grid
        container
        gap="1rem"
        gridGap="1rem"
        rowGap="2rem"
        gridAutoFlow="dense"
        gridAutoRows="dense"
        gridTemplateColumns="repeat(auto-fit, minmax(140px, 1fr))"
      >
        <ScFooterNav>
          <h4>Interes</h4>
          {React.Children.toArray(
            navbarItems.map(({ text, route }) => (
              <CustomLink href={route}>{NAV_LIST[text]}</CustomLink>
            ))
          )}
        </ScFooterNav>
        <ScFooterNav>
          <h4>People</h4>
          {React.Children.toArray(
            peopleList.map(({ text, route }) => (
              <CustomLink
                aria-label={`Nav - ${text}`}
                target="_blank"
                href={route}
                title={text}
              >
                {text}
              </CustomLink>
            ))
          )}
        </ScFooterNav>
        <ScFooterNav>
          <h4>Legal</h4>
          <CustomLink href="">Privacy policy</CustomLink>
          <CustomLink href="">Coockie preferences</CustomLink>
        </ScFooterNav>
        <ScFooterNav>
          <h4>Theme</h4>
          <Flex
            container
            justifyContent="flex-start"
            alignItems="flex-start"
            flexDirection="column"
            gap="16px"
          >
            <Button
              size="md"
              text="Light Theme"
              type="button"
              typeStyle="secondary"
              onClick={() => {
                dispatch(toggleTheme(ThemeList.BasicLightTheme));
              }}
            />
            <Button
              size="md"
              text="Dark Theme"
              type="button"
              typeStyle="ghost"
              onClick={() => {
                dispatch(toggleTheme(ThemeList.BasicDarkTheme));
              }}
            />
          </Flex>
        </ScFooterNav>
      </Grid>
      <Flex
        container
        margin="2rem 0px 0px"
        alignItems="center"
        justifyContent="flex-start"
        flexDirection="row"
        gap="16px"
      >
        <Typography
          type="p2"
          value={`VoidToInfinite © ${new Date().getFullYear()}`}
        />
      </Flex>
    </ScFooter>
  );
};

export default Footer;
