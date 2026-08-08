"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { ThemeProvider as SCThemeProvider } from "styled-components";
import { STORAGE_KEYS } from "@/config/storage";
import { themes, type ThemeName } from "./themes";

/**
 * Quién produjo el valor actual de `themeName`.
 *
 * Existe porque el fondo del hero tiene que animar el cambio de tema **solo
 * cuando lo pide una persona**. El proveedor arranca siempre en `"light"` (no
 * puede leer `localStorage` durante el render sin romper el export estático) y
 * se corrige a sí mismo en un efecto justo después de montar: ese ajuste se
 * observa desde fuera como un cambio de tema idéntico a un toggle real, y
 * animarlo produciría un fundido en cada carga de página de quien tenga el
 * tema oscuro guardado.
 *
 * La alternativa —que el consumidor ignorase «el primer cambio que vea»— es
 * incorrecta en el caso más común: quien no tiene nada guardado no genera
 * ningún ajuste de hidratación, así que ese comodín se lo comería su PRIMER
 * toggle real. Quien sabe de verdad si el cambio fue humano es este proveedor,
 * que es quien expone los dos setters.
 */
export type ThemeChangeSource = "initial" | "hydration" | "user";

interface ThemeContextValue {
  themeName: ThemeName;
  toggleTheme: () => void;
  setThemeName: (name: ThemeName) => void;
  changeSource: ThemeChangeSource;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): ReactElement {
  const [themeName, setTheme] = useState<ThemeName>("light");
  const [changeSource, setChangeSource] =
    useState<ThemeChangeSource>("initial");

  useEffect(() => {
    const stored = window.localStorage.getItem(
      STORAGE_KEYS.theme,
    ) as ThemeName | null;
    // Reading localStorage during render would break the static export's
    // prerendered HTML (no `window`) and risk a hydration mismatch. Syncing
    // it once, client-side only, after mount is the correct SSR-safe pattern.
    if (stored === "light" || stored === "dark") {
      // Los dos setState del mismo efecto se agrupan en un unico render, asi
      // que ningun consumidor llega a ver el tema nuevo con el origen viejo.
      // El linter senala el PRIMER setState del bloque, asi que la excepcion
      // va aqui y cubre a los dos.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChangeSource("hydration");
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.theme, themeName);
  }, [themeName]);

  const toggleTheme = useCallback(() => {
    setChangeSource("user");
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  // Se envuelve el setter crudo para que TODA ruta que cambie el tema desde
  // fuera quede marcada como humana. Si se expusiera `setTheme` tal cual, un
  // consumidor futuro podria cambiar el tema sin que el fondo del hero lo
  // reconociera como toggle y la transicion no arrancaria -- fallo silencioso.
  const setThemeName = useCallback((name: ThemeName) => {
    setChangeSource("user");
    setTheme(name);
  }, []);

  const value = useMemo(
    () => ({ themeName, toggleTheme, setThemeName, changeSource }),
    [themeName, toggleTheme, setThemeName, changeSource],
  );

  return (
    <ThemeContext.Provider value={value}>
      <SCThemeProvider theme={{ data: themes[themeName] }}>
        {children}
      </SCThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
