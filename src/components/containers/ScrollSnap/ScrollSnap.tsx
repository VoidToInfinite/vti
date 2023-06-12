"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsomorphicLayoutEffect } from "@/helpers/isomorphicEffect";
import generateUUID from "@/utils/generateUUID";
import ScScrollSnap from "./ScrollSnap.sc";
import IScrollSnap from "./ScrollSnap.types";

/**
 * .
 * @param param0 children
 * @returns ScrollSnap
 */
const ScrollSnap: React.FC<IScrollSnap> = ({ children }) => {
  const scrollSnapID = generateUUID(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Register necessary plugins
   */
  gsap.registerPlugin(ScrollTrigger);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        {
          translateX: 0,
        },
        {
          translateX: "-200vw",
          ease: "none",
          duration: 1,
          scrollTrigger: {
            trigger: triggerRef.current,
            start: "top top",
            end: "2000 top",
            snap: "labels",
            scrub: 1,
            pin: true,
          },
        }
      );
    }, containerRef); // <- IMPORTANT! Scope!
    /* A return function for killing the animation on component unmount */
    return () => ctx.revert(); // <- Cleanup!
  }, []);

  return (
    <ScScrollSnap
      id={`scrn_${scrollSnapID}`}
      className="sss_container"
    >
      <div ref={triggerRef}>
        <div
          ref={containerRef}
          className="scroll-section-inner"
        >
          {children}
        </div>
      </div>
    </ScScrollSnap>
  );
};

export default ScrollSnap;
