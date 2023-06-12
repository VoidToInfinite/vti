import type { AppProps } from "next/app";
import React, { useEffect, useState } from "react";
import type { NextPageWithLayout } from "@/global/AppTypes.types";
import AppProvider from "@/providers/AppProvider";

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const App = ({ Component, pageProps }: AppPropsWithLayout) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  useEffect(() => {
    // Mostrar el componente de la aplicacion
    const onPageLoad = () => {
      setIsMounted(true);
    };
    // Check if the page has already loaded
    if (document.readyState === "complete") {
      onPageLoad();
    } else {
      window.addEventListener("load", onPageLoad);
    }
    // Remove the event listener when component unmounts
    return () => window.removeEventListener("load", onPageLoad);
  }, []);

  return (
    <AppProvider>
      {isMounted && getLayout(<Component {...pageProps} />)}
    </AppProvider>
  );
};

export default App;
