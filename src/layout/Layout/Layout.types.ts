import type { NextPage } from "next";
import type { AppProps } from "next/app";
import React, { RefObject } from "react";

export interface PageProps {
  locale: string;
  messages: string[];
  now: Date;
  errorCode: boolean | number;
}

export interface LayoutProps {
  page: React.ReactElement;
}

export interface ILayoutProps {
  children: React.ReactNode | React.ReactNode[];
  id?: string;
  classNames?: string;
  propRef?: RefObject<HTMLDivElement>;
}

export type NextPageWithLayout = NextPage<PageProps> & {
  // eslint-disable-next-line no-unused-vars
  getLayout?: (page: React.ReactElement) => React.ReactNode;
  messagesNs?: string[];
};

export type AppPropsWithLayout = AppProps<PageProps> & {
  Component: NextPageWithLayout;
};
