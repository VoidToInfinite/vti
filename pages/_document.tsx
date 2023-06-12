/* eslint-disable class-methods-use-this */
/* eslint-disable react/jsx-props-no-spreading */
import i18next from "i18next";
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentProps,
  DocumentContext,
  DocumentInitialProps,
} from "next/document";
import React from "react";
import { ServerStyleSheet } from "styled-components";

type Props = DocumentProps & {
  // add custom document props
};

export default class MyDocument extends Document<Props> {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang={i18next.language}>
        <Head>
          <meta
            httpEquiv="X-UA-Compatible"
            content="IE=edge"
          />
          <meta
            name="author"
            content="VoidToInfinite"
          />
          <meta
            property="og:author"
            content="VoidToInfinite"
            key="author"
          />
          <meta
            property="og:url"
            content="https://voidtoinfinite.github.io/"
          />
          <meta
            property="og:type"
            content="website"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Poppins:wght@300;400&display=swap"
            rel="stylesheet"
          />
          <link
            rel="shortcut icon"
            href="favicon.ico"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
