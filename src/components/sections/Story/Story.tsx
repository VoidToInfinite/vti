"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useReveal } from "@/hooks/useReveal";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { SceneLoader } from "@/three/SceneLoader";
import { Typography } from "@/components/ui/Typography/Typography";

const ScStory = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
  overflow: hidden;
`;

/* Section reveal (spec §9): una idea a la vez. Solo transform/opacity. */
const ScContent = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[4]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  text-align: center;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }
`;

export function Story(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  const { ref: sectionRef, progress } = useScrollProgress();

  return (
    <ScStory
      id="story"
      ref={sectionRef}
      aria-labelledby="story-title"
    >
      <SceneLoader progress={progress} />
      <ScContent
        ref={revealRef}
        data-revealed={revealed}
      >
        <Typography
          variant="h2"
          id="story-title"
        >
          {t("Home.story.title")}
        </Typography>
        <Typography variant="lead">{t("Home.story.body")}</Typography>
        <Typography variant="body">{t("Home.story.additional")}</Typography>
      </ScContent>
    </ScStory>
  );
}
