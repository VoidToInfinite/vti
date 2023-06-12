"use client";

import { createGlobalStyle } from "styled-components";

// : GlobalStyleComponent<object, DefaultTheme>
const GlobalStyles = createGlobalStyle`
  *,
  html,
  body {
    padding: 0;
    margin: 0;
  }

  *,
  *::after,
  *::before {
    border: 0;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    vertical-align: baseline;
  }

  html {
    -webkit-scroll-behavior: smooth;
    -moz-scroll-behavior: smooth;
    -ms-scroll-behavior: smooth;
    -o-scroll-behavior: smooth;
    scroll-behavior: smooth;

    line-height: 1.15;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;

    -webkit-overflow-scrolling: touch;
    overflow-scrolling: touch;
  }

  html,
  body {
    overflow-x: hidden;
  }

  body {
    height: unset;
    background-color: ${({ theme }) => theme.data.background.primary[500]};
    color: ${({ theme }) => theme.data.typography.primaryColor[500]};
    font-size: 100%;
    font-family: ${({ theme }) => theme.data.typography.main.font};
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    font-smoothing: always;
    line-height: 1.4em;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    hyphens: auto;
    transition: all 0.50s linear;
    position: relative;
  }

  body::-webkit-scrollbar {
    width: 0px;
  }

  body::-webkit-scrollbar-track {
    background: transparent;
  }

  body::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.data.background.secondary[500]};
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.data.background.secondary[500]};
  }

  a {
    color: inherit;
    display: block;
    font-size: inherit;
    text-decoration: none;
  }

  p a {
    display: inline;
  }

  h1, h2, h3, h4, h5, h6, p, span, a, strong, blockquote, i, b, u, em {
    font-size: 1em;
    font-weight: inherit;
    font-style: inherit;
    text-decoration: none;
    color: inherit;
  }

  blockquote:before, blockquote:after, q:before, q:after {
    content: "";
    content: none;
  }

  ::-moz-selection {
    background-color: ${({ theme }) => theme.data.color.primary[200]};
    color: ${({ theme }) => theme.data.color.primary[800]};
  }
  ::selection {
    background-color: ${({ theme }) => theme.data.color.primary[200]};
    color: ${({ theme }) => theme.data.color.primary[800]};
  }

  ol, ul, menu {
    list-style: none;
  }

  form, input, textarea, select, button, label {
    font-family: inherit;
    font-size: inherit;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    hyphens: auto;
    background-color: transparent;
    color: inherit;
    display: block;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  table, tr, td {
    border-collapse: collapse;
    border-spacing: 0;
  }

  svg {
    width: 100%;
    display: block;
  }

  img, picture, video, iframe, figure {
    max-width: 100%;
    width: 100%;
    display: block;
    -o-object-fit: cover;
    object-fit: cover;
    -o-object-position: center center;
    object-position: center center;
  }

  meter {
    -webkit-appearance: revert;
    appearance: revert;
  }

  ::placeholder {
    color: unset;
  }

  :where([hidden]) {
    display: none;
  }

  :where([contenteditable]:not([contenteditable="false"])) {
    -moz-user-modify: read-write;
    overflow-wrap: break-word;
    -webkit-line-break: after-white-space;
    -webkit-user-select: auto;
    -webkit-user-modify: read-write;
  }

  :where([draggable="true"]) {
    -webkit-user-drag: element;
  }
`;

export default GlobalStyles;
