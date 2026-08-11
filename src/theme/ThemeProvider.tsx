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
import { resolveInitialTheme } from "./resolveTheme";
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
    // Misma lógica de resolución que el script inline de `app/layout.tsx`
    // (`resolveInitialTheme`, `src/theme/resolveTheme.ts`) — decisión D-C:
    // localStorage gana a `prefers-color-scheme`; sin storage, decide el
    // sistema (Task 9). Reading localStorage/matchMedia during render
    // would break the static export's prerendered HTML (no `window`) and
    // risk a hydration mismatch. Syncing it once, client-side only, after
    // mount is the correct SSR-safe pattern: React state STAYS "light" for
    // the very first client render (identical to the baked HTML), so this
    // never causes a hydration mismatch, even though a few components may
    // repaint once the value corrects.
    const stored = window.localStorage.getItem(STORAGE_KEYS.theme);
    // jsdom no implementa `matchMedia` (lección ya documentada en
    // `providers.test.tsx` para `StageProvider`) y este efecto ahora corre
    // en CADA test que monta `ThemeProvider` vía `renderWithProviders`
    // -- decenas de ficheros que no tienen por qué conocer ni stubear esta
    // API. Igual que el catch homólogo de `resolveTheme.ts`
    // (`buildThemeBootstrapScript`), degradar a "sin preferencia detectada"
    // en vez de propagar es lo correcto también en un navegador real sin
    // soporte, no solo un parche de test.
    let prefersDark = false;
    try {
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      /* sin matchMedia: se resuelve como si no hubiera preferencia */
    }
    const resolved = resolveInitialTheme(stored, prefersDark);
    // Solo hace falta corregir cuando el resultado difiere del "light" con
    // el que este proveedor SIEMPRE arranca (build-time default): storage
    // explícito en "light", o sistema claro sin storage, no generan ningún
    // ajuste — mismo comportamiento que antes de esta tarea para ese caso.
    if (resolved !== "light") {
      // Los dos setState del mismo efecto se agrupan en un unico render, asi
      // que ningun consumidor llega a ver el tema nuevo con el origen viejo.
      // El linter senala el PRIMER setState del bloque, asi que la excepcion
      // va aqui y cubre a los dos.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChangeSource("hydration");
      setTheme(resolved);
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
