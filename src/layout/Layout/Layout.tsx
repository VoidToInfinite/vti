import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BackOrbs from "@/components/featured/BackOrbs/BackOrbs";
import Navbar from "@/components/shared/Navbar/Navbar";
import Footer from "@/components/shared/Footer/Footer";
import ScLayout, { ScApp } from "./Layout.sc";
import { ILayoutProps } from "./Layout.types";

/**
 * Register necessary plugins
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const Layout: React.FC<ILayoutProps> = ({ children, id, classNames }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  //
  ScrollTrigger.normalizeScroll(true);
  //
  return (
    <>
      <BackOrbs />
      <ScApp
        id={id}
        ref={containerRef}
      >
        <Navbar />
        <ScLayout className={classNames}>{children}</ScLayout>
        <Footer />
      </ScApp>
    </>
  );
};

export default Layout;
