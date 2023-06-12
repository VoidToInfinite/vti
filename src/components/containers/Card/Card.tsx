import Image from "next/image";
import React, { useEffect, useState } from "react";
import Flex from "@/components/containers/Flex/Flex";
import Button from "@/components/featured/Button/Button";
import Typography from "@/components/featured/Typography/Typography";
import ScCard, { ScCardImage } from "./Card.sc";
import ICard from "./Card.types";

// eslint-disable-next-line max-lines-per-function
const Card: React.FC<ICard> = ({
  image,
  cardTitle = "",
  cardSubtitle = "",
  cardText,
  showButtons = true,
  isExpanded = false,
}) => {
  const DEFAULT_IMAGE_SIZE_WIDTH = 64;
  const DEFAULT_IMAGE_SIZE_HEIGHT = 64;

  const [expanded, setExpanded] = useState<boolean>(isExpanded);
  const [imageSizeHeight, setImageSizeHeight] = useState<number>(
    DEFAULT_IMAGE_SIZE_HEIGHT
  );
  const [imageSizeWidth, setImageSizeWidth] = useState<number>(
    DEFAULT_IMAGE_SIZE_WIDTH
  );

  const handleClick = () => {
    setExpanded(!expanded);
  };

  useEffect(() => {
    setImageSizeHeight(expanded ? 200 : DEFAULT_IMAGE_SIZE_WIDTH);
    setImageSizeWidth(expanded ? 150 : DEFAULT_IMAGE_SIZE_WIDTH);
  }, [expanded, imageSizeHeight, imageSizeWidth]);

  return (
    <ScCard>
      <Flex
        container
        alignItems="stretch"
        flexDirection={expanded ? "column" : "row"}
        gap="16px"
        justifyContent="stretch"
      >
        {image && (
          <ScCardImage>
            <Image
              loading="lazy"
              src={image.src}
              alt={image.alt}
              title={`${image.title} image`}
              height={imageSizeHeight}
              width={imageSizeWidth}
            />
          </ScCardImage>
        )}
        <Flex
          container
          alignItems="flex-start"
          flexDirection="column"
          flexGrow={2}
          gap="4px"
          justifyContent="center"
        >
          <Typography
            type="pCardTitle"
            value={cardTitle}
          />
          {cardSubtitle && (
            <Typography
              type="pCardSubtitle"
              value={cardSubtitle}
            />
          )}
        </Flex>
        {expanded && (
          <Typography
            type="pCardText"
            value={cardText}
          />
        )}
        {showButtons && (
          <Flex
            container
            alignItems="flex-start"
            flexDirection="column"
            justifyContent="center"
          >
            <Button
              type="button"
              typeStyle={expanded ? "ghost" : "tertiary"}
              size="md"
              text={expanded ? "Show less" : ""}
              iconSize={46}
              showLeftIcon={!expanded}
              leftIcon={{
                src: "chevronDown",
                title: "chevronDown icon",
                name: "chevronDown icon",
              }}
              onClick={handleClick}
            />
          </Flex>
        )}
      </Flex>
    </ScCard>
  );
};

export default Card;
