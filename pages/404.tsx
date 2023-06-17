import Box from "@/components/containers/Box/Box";
import Flex from "@/components/containers/Flex/Flex";
import Typography from "@/components/featured/Typography/Typography";
import LayoutPage from "@/layout/LayoutPage/LayoutPage";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Page header
const HEADERS = {
  title: "",
  description: "",
  keywords: "",
};

const Error404 = () => {
  const { t } = useTranslation("home");
  const router = useRouter();
  const [counter, setCounter] = useState<number>(15);
  // Set page headers
  HEADERS.title = t("Home.Head.title");
  HEADERS.description = t("Home.Head.description");
  HEADERS.keywords = t("Home.Head.keywords");

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back();
    }, counter * 1000);

    const interval = setInterval(() => {
      setCounter((prevCounter) => prevCounter - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [counter, router]);

  return (
    <Flex
      container
      height="50vh"
      width="100%"
      padding="8vh 6vw 0 6vw"
      backgroundColor="transparent"
      alignItems="center"
      justifyContent="flex-start"
      flexDirection="column"
      gap="8px"
      overflow="visible"
    >
      <Box>
        <Typography
          type="pHeroTitle"
          value="404 - Página no encontrada"
        />
        <Typography
          type="pHeroText"
          value="Lo sentimos, la página que estás buscando no existe."
        />
      </Box>
      <Box>
        <Typography
          type="p2"
          value={`Esta página se redirigirá automaticamente en ${counter} segundos...`}
        />
      </Box>
    </Flex>
  );
};

Error404.getLayout = function getLayout(page: React.ReactElement) {
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

export default Error404;
