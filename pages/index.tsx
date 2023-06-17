import Image from "next/image";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { DefaultTheme } from "styled-components";
import { NextPageWithLayout } from "@/global/AppTypes.types";
import Flex from "@/components/containers/Flex/Flex";
import Box from "@/components/containers/Box/Box";
import Icon from "@/components/featured/Icon/Icon";
import Typography from "@/components/featured/Typography/Typography";
import SwipeUp from "@/components/featured/SwipeUp/SwipeUp";
import BrandName from "@/components/shared/Brand/BrandName";
import Socials from "@/components/shared/Socials/Socials";
import Separator from "@/components/shared/Separator/Separator";
import { RootState } from "@/context/redux/store";
import useWindowSize from "@/hooks/useWindowSize";
import LayoutPage from "@/layout/LayoutPage/LayoutPage";
import ScrollSnap from "@/components/containers/ScrollSnap/ScrollSnap";
import * as Learning from "@/assets/images/mainSections/learning.svg";
import * as Imagination from "@/assets/images/mainSections/imagination.svg";
import * as Gaming from "@/assets/images/mainSections/gaming.svg";
import Error from "./_error";

// Page header
const HEADERS = {
  title: "",
  description: "",
  keywords: "",
};

/* eslint-disable max-lines-per-function */
// eslint-disable-next-line max-statements, complexity
const Home = ({ errorCode }: NextPageWithLayout) => {
  const { t } = useTranslation("home");
  const windowSize = useWindowSize();
  // Set page headers
  HEADERS.title = t("Home.Head.title");
  HEADERS.description = t("Home.Head.description");
  HEADERS.keywords = t("Home.Head.keywords");

  const currentTheme: DefaultTheme = useSelector(
    (state: RootState) => state.theme.theme
  );

  if (errorCode) {
    return <Error statusCode={errorCode} />;
  }

  return (
    <>
      <Flex
        container
        height="100vh"
        width="100%"
        padding="8vh 6vw 0 6vw"
        backgroundColor="transparent"
        alignItems="center"
        justifyContent="flex-start"
        flexDirection="column"
        gap="8px"
        overflow="visible"
      >
        <Box
          width="75%"
          padding="1rem 0px"
        >
          <BrandName />
        </Box>
        <Typography
          type="pHeroText"
          value={`${t("Home.description")}. ${t(
            "Home.additionalDescription"
          )}.`}
        />
        <Socials
          iconSizes={24}
          userNameOfSocials="VoidToInfinite"
          urlDiscord="https://discord.gg/CuGhqdG3g3"
          urlGithub="https://github.com/voidtoinfinite"
          urlInstagram="https://www.instagram.com/voidtoinfinite/"
        />
        <SwipeUp />
      </Flex>
      <Flex
        container
        id="vtiAbout"
        height="95vh"
        padding="4vh 6vw"
        alignItems="center"
        justifyContent="flex-start"
        flexDirection={windowSize.width < 1200 ? "column" : "row"}
        gap="1rem"
      >
        <Box
          height={windowSize.width < 1080 ? "200px" : "350px"}
          width={windowSize.width < 1080 ? "200px" : "350px"}
          flexBasis={windowSize.width < 1080 ? "220px" : "50%"}
        >
          <Icon
            name="VoidToInfinite Logo"
            title="VoidToInfinite Logo"
            src="voidToInfinite"
            size={windowSize.width < 1200 ? 200 : 350}
            fill={currentTheme.data.typography.primaryColor[500]}
          />
        </Box>
        <Flex
          container
          width="100%"
          height="auto"
          alignItems="flex-start"
          justifyContent="flex-start"
          flexDirection="column"
          flexBasis="50%"
          gap="0.5rem"
        >
          <Typography
            type="h2"
            value={t("Home.about.title")}
          />
          <Separator />
          <Typography
            type="p1"
            value={t("Home.about.description")}
          />
          <Typography
            type="p1"
            value={t("Home.about.additionalDescription")}
          />
        </Flex>
      </Flex>
      <Box
        padding="4vh 6vw"
        gridColumn="1 / -1"
      >
        <Typography
          type="h2"
          value={t("Home.sections.title")}
        />
        <Separator />
      </Box>
      <ScrollSnap>
        <section>
          <Flex
            container
            height="100%"
            padding="4vh 6vw"
            alignItems="center"
            justifyContent="center"
            flexDirection={windowSize.width < 1080 ? "column" : "row"}
            gap="8px"
          >
            <Flex
              container
              alignItems="center"
              justifyContent="center"
              height={windowSize.width < 1080 ? "200px" : "350px"}
              width={windowSize.width < 1080 ? "200px" : "350px"}
              flexBasis={windowSize.width < 1080 ? "220px" : "50%"}
            >
              <Image
                style={{
                  objectFit: "contain",
                  width: "100%",
                  height: "100%",
                }}
                alt={`Imagen representativa de la seccion ${t(
                  "Home.sections.learning.title"
                ).toString()}`}
                src={Learning}
                title={t("Home.sections.learning.title").toString()}
              />
            </Flex>
            <Flex
              container
              height="100%"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              flexBasis={windowSize.width < 1080 ? "300px" : "50%"}
              gap="14px"
            >
              <Typography
                type="h3"
                value={t("Home.sections.learning.title")}
              />
              <Typography
                type="p2"
                value={t("Home.sections.learning.subtitle")}
              />
              <Typography
                type="p1"
                value={t("Home.sections.learning.description")}
              />
            </Flex>
          </Flex>
        </section>
        <section>
          <Flex
            container
            height="100%"
            padding="4vh 6vw"
            alignItems="center"
            justifyContent="center"
            flexDirection={windowSize.width < 1080 ? "column" : "row"}
            gap="8px"
          >
            <Flex
              container
              alignItems="center"
              justifyContent="center"
              height={windowSize.width < 1080 ? "200px" : "350px"}
              width={windowSize.width < 1080 ? "200px" : "350px"}
              flexBasis={windowSize.width < 1080 ? "220px" : "50%"}
            >
              <Image
                style={{
                  objectFit: "contain",
                  width: "100%",
                  height: "100%",
                }}
                alt={`Imagen representativa de la seccion ${t(
                  "Home.sections.imagination.title"
                ).toString()}`}
                src={Imagination}
                title={t("Home.sections.imagination.title").toString()}
              />
            </Flex>
            <Flex
              container
              height="100%"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              flexBasis={windowSize.width < 1080 ? "300px" : "50%"}
              gap="14px"
            >
              <Typography
                type="h3"
                value={t("Home.sections.imagination.title")}
              />
              <Typography
                type="p2"
                value={t("Home.sections.imagination.subtitle")}
              />
              <Typography
                type="p1"
                value={t("Home.sections.imagination.description")}
              />
            </Flex>
          </Flex>
        </section>
        <section>
          <Flex
            container
            height="100%"
            padding="4vh 6vw"
            alignItems="center"
            justifyContent="center"
            flexDirection={windowSize.width < 1080 ? "column" : "row"}
            gap="8px"
          >
            <Flex
              container
              alignItems="center"
              justifyContent="center"
              height={windowSize.width < 1080 ? "200px" : "350px"}
              width={windowSize.width < 1080 ? "200px" : "350px"}
              flexBasis={windowSize.width < 1080 ? "220px" : "50%"}
            >
              <Image
                style={{
                  objectFit: "contain",
                  width: "100%",
                  height: "100%",
                }}
                alt={`Imagen representativa de la seccion ${t(
                  "Home.sections.gaming.title"
                ).toString()}`}
                src={Gaming}
                title={t("Home.sections.gaming.title").toString()}
              />
            </Flex>
            <Flex
              container
              height="100%"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              flexBasis={windowSize.width < 1080 ? "300px" : "50%"}
              gap="14px"
            >
              <Typography
                type="h3"
                value={t("Home.sections.gaming.title")}
              />
              <Typography
                type="p2"
                value={t("Home.sections.gaming.subtitle")}
              />
              <Typography
                type="p1"
                value={t("Home.sections.gaming.description")}
              />
            </Flex>
          </Flex>
        </section>
      </ScrollSnap>
      <Flex
        container
        id="vtiMore"
        height="50vh"
        padding="0"
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          type="h2"
          value={t("Home.sections.title")}
        />
        <Separator />
      </Flex>
    </>
  );
};

Home.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <LayoutPage
      id="app"
      title={HEADERS.title}
      description={HEADERS.description}
      keywords={HEADERS.keywords}
      classNames="m41nS3ct10n"
    >
      {page}
    </LayoutPage>
  );
};

export default Home;
