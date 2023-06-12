import Link from "next/link";
import React from "react";
import Flex from "@/components/containers/Flex/Flex";
import Icon from "@/components/featured/Icon/Icon";
import ISocials from "./Socials.types";

const Socials: React.FC<ISocials> = ({
  iconSizes,
  userNameOfSocials,
  urlDiscord,
  urlGithub,
  urlInstagram,
  urlTwitter,
}) => {
  const height = iconSizes * 2;
  return (
    <Flex
      container
      height={`${height}px`}
      padding="0.5rem 0"
      alignItems="center"
      justifyContent="flex-start"
      flexDirection="row"
      gap="8px"
    >
      {urlDiscord && (
        <Link
          href={urlDiscord}
          rel="noreferrer noopener"
          target="_blank"
          title={`${userNameOfSocials}'s Discord link`}
          aria-label={`${userNameOfSocials}'s Discord link`}
          passHref
        >
          <Icon
            name="Discord icon"
            fill="none"
            size={iconSizes}
            src="photo"
            title={`${userNameOfSocials}'s Discord`}
          />
        </Link>
      )}
      {urlGithub && (
        <Link
          href={urlGithub}
          rel="noreferrer noopener"
          target="_blank"
          title={`${userNameOfSocials}'s GitHub link`}
          aria-label={`${userNameOfSocials}'s GitHub link`}
          passHref
        >
          <Icon
            name="GitHub icon"
            fill="none"
            size={iconSizes}
            src="github"
            title={`${userNameOfSocials}'s GitHub`}
          />
        </Link>
      )}
      {urlInstagram && (
        <Link
          href={urlInstagram}
          rel="noreferrer noopener"
          target="_blank"
          title={`${userNameOfSocials}'s Instagram link`}
          aria-label={`${userNameOfSocials}'s Instagram link`}
          passHref
        >
          <Icon
            name="Instagram icon"
            fill="none"
            size={iconSizes}
            src="instagram"
            title={`${userNameOfSocials}'s Instagram`}
          />
        </Link>
      )}
      {urlTwitter && (
        <Link
          href={urlTwitter}
          rel="noreferrer noopener"
          target="_blank"
          title={`${userNameOfSocials}'s Twitter link`}
          aria-label={`${userNameOfSocials}'s Twitter link`}
          passHref
        >
          <Icon
            name="Twitter icon"
            fill="none"
            size={iconSizes}
            src="twitter"
            title={`${userNameOfSocials}'s Twitter`}
          />
        </Link>
      )}
    </Flex>
  );
};

export default Socials;
