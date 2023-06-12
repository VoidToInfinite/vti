import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setIsLoaded } from "@/context/redux/PageReducer";
import { RootState } from "@/context/redux/store";

const usePageLoaded = () => {
  const dispatch = useDispatch();
  const isLoaded: boolean = useSelector(
    (state: RootState) => state.page.isLoaded
  );

  useEffect(() => {
    // Mostrar el componente de la aplicacion
    const onPageLoad = () => {
      setTimeout(() => {
        dispatch(setIsLoaded(true));
      }, 1000);
    };
    // Check if the page has already loaded
    if (document.readyState === "complete") {
      onPageLoad();
    } else {
      window.addEventListener("load", onPageLoad);
    }
    // Remove the event listener when component unmounts
    return () => {
      window.removeEventListener("load", onPageLoad);
      dispatch(setIsLoaded(false));
    };
  }, [dispatch]);

  return isLoaded;
};

export default usePageLoaded;
