/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

interface IFetchData {
  data: [] | object;
  isLoading: boolean;
  hasError: boolean;
}

const useFetch = (url: string): IFetchData => {
  const [fetchedData, setFetchedData] = useState<IFetchData>({
    data: [],
    isLoading: true,
    hasError: false,
  });

  const cancelTokenSource = axios.CancelToken.source();
  //
  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(url, {
        cancelToken: cancelTokenSource.token,
      });
      const data = await response.data;
      setFetchedData({
        data: data.results ? data.results : data,
        isLoading: false,
        hasError: false,
      });
    } catch (error) {
      if (axios.isCancel(error)) {
        // TODO: Put Error component here
        // console.error(new Error('Action canceled'), error);
      } else {
        // TODO: Put Error component here
        // console.error(new Error('An error occurred while fetching data'), error);
      }
      setFetchedData({
        data: [],
        isLoading: false,
        hasError: true,
      });
    }
  }, [cancelTokenSource.token, url]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchData();
    return () => cancelTokenSource.cancel();
  }, [url, fetchData, cancelTokenSource]);

  return fetchedData;
};

export default useFetch;
