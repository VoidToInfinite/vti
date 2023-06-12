import Head from "next/head";
import React, { Suspense } from "react";
// import Notifications from "@/components/containers/Notifications/Notifications";
import Loader from "@/components/shared/Loaders/Loader";
import Layout from "@/layout/Layout/Layout";
import IPageLayoutProps from "./LayoutPage.types";

const LayoutPage: React.FC<IPageLayoutProps> = ({
  children,
  title,
  description,
  keywords,
  id,
  classNames,
}) => (
  <>
    <Head>
      <title>{title}</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />
      <meta
        property="og:title"
        content={title}
        key="title"
      />
      <meta
        name="description"
        content={description}
      />
      <meta
        property="og:description"
        content={description}
        key="description"
      />
      <meta
        name="keywords"
        content={keywords}
      />
      <meta
        property="og:keywords"
        content={keywords}
        key="keywords"
      />
    </Head>
    <Suspense fallback={<Loader />}>
      <Layout
        id={id}
        classNames={classNames}
      >
        {children}
      </Layout>
    </Suspense>
    {/* <Notifications /> */}
  </>
);
export default LayoutPage;
