import React from "react";
import { useTranslation } from "react-i18next";
import {
  ScSwipeUpArrowBody,
  ScSwipeUpArrowHead,
  ScSwipeUpText,
  ScSwipeUpWrapper,
} from "./SwipeUp.sc";

/**
 * Create a React functional component
 * @returns JSX DOM
 */
const SwipeUp = () => {
  const { t } = useTranslation("home");
  return (
    <ScSwipeUpWrapper>
      <ScSwipeUpText>{t("Home.swipeUp")}</ScSwipeUpText>
      <ScSwipeUpArrowHead />
      <ScSwipeUpArrowBody />
    </ScSwipeUpWrapper>
  );
};

export default SwipeUp;
