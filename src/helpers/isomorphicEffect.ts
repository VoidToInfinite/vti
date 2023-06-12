import { useEffect, useLayoutEffect } from "react";

/**
 * Finally in Next or any SSR environment is better to use an isomorphic layout effect:
 * @url https://greensock.com/forums/topic/34167-nextjsreact-gsap-scroll-trigger-scroll-smoother-and-fixed-positioned-layouts-with-demo/
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;
