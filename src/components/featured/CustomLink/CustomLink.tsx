/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable react/jsx-props-no-spreading */
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import ScCustomLink from "./CustomLink.sc";
import type { CustomLinkProps } from "./CustomLink.types";

/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 * @param param0
 * @returns
 */
const CustomLink: React.FC<CustomLinkProps> = ({
  children,
  href,
  prefetch = false,
  replace = false,
  shallow = false,
  target,
  ...props
}) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault();
    if (replace) {
      router
        .replace(href, undefined, { shallow })
        .then(() => {})
        .catch(() => {});
    } else {
      router
        .push(href, undefined, { shallow })
        .then(() => {})
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (prefetch) {
      router
        .prefetch(href)
        .then(() => {})
        .catch(() => {});
    }
  }, [router, href, prefetch]);

  return (
    <ScCustomLink
      {...props}
      target={target}
      href={href}
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {children}
    </ScCustomLink>
  );
};

export default CustomLink;
