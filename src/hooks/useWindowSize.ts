import { useState, useEffect } from "react";

export interface IWindowSize {
  height: number;
  width: number;
}

const useWindowSize = (): IWindowSize => {
  const [windowSize, setDimension] = useState<IWindowSize>({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const handleResize = () => {
    setDimension({
      height: window.innerHeight,
      width: window.innerWidth,
    });
  };

  // Will run after mount
  useEffect(() => {
    // Update screenWidth & screenHeight
    handleResize();

    // listen to resize event and update states
    window.addEventListener("resize", handleResize);

    // cleanup function to safely remove eventListener
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};

export default useWindowSize;
