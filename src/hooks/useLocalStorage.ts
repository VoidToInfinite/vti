import { useState } from "react";

/**
 * Usage: const [value, setValue] = useLocalStorage('key', 'keyValue');
 * @param key
 * @param defaultValue
 * @returns
 */
const useLocalStorage = (key: string, defaultValue: object): object => {
  const [storedValue, setStoredValue] = useState<object>(() => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        return JSON.parse(value) as object;
      }
      localStorage.setItem(key, JSON.stringify(defaultValue));
    } catch (error) {
      // TODO: Put Error component here
      // console.error(new Error('An error occurred while storing the value'), error);
    }
    return defaultValue;
  });

  const setValue = (newValue: object) => {
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      // TODO: Put Error component here
      // console.error(new Error('An error occurred while storing the value'), error);
    }
    setStoredValue(newValue);
  };
  return [storedValue, setValue];
};

export default useLocalStorage;
