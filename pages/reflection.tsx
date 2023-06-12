import React from "react";
import { useTranslation } from "react-i18next";
import { NextPageWithLayout } from "@/global/AppTypes.types";
import LayoutPage from "@/layout/LayoutPage/LayoutPage";
import Typography from "@/components/featured/Typography/Typography";
import Flex from "@/components/containers/Flex/Flex";
import Calendar from "@/components/featured/Calendar/Calendar";
import Error from "./_error";

// Page header
const HEADERS = {
  title: "",
  description: "",
  keywords: "",
};

const Reflection = ({ errorCode }: NextPageWithLayout) => {
  const { t } = useTranslation("reflection");
  // Set page headers
  HEADERS.title = t("Reflection.Head.title");
  HEADERS.description = t("Reflection.Head.description");
  HEADERS.keywords = t("Reflection.Head.keywords");

  if (errorCode) {
    return <Error statusCode={errorCode} />;
  }

  return (
    <Flex
      container
      height="90vh"
      width="100%"
      padding="8vh 6vw 0 6vw"
      backgroundColor="transparent"
      alignItems="center"
      justifyContent="flex-start"
      flexDirection="column"
      gap="8px"
    >
      <Typography
        type="h2"
        value={t("Reflection.title")}
      />
      <Calendar />
    </Flex>
  );
};

Reflection.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <LayoutPage
      id="app"
      title={HEADERS.title}
      description={HEADERS.description}
      keywords={HEADERS.keywords}
    >
      {page}
    </LayoutPage>
  );
};

export default Reflection;
