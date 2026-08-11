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
import { resolveInitialTheme, THEME_ATTRIBUTE } from "./resolveTheme";
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

  // Mantiene el atributo `data-theme` (Task 9) sincronizado con el ESTADO
  // real en TODO cambio, no solo en la carga: el script pre-pintado de
  // `app/layout.tsx` lo fija UNA vez, antes de hidratar, y nunca vuelve a
  // ejecutarse. Sin este efecto, un toggle de USUARIO posterior actualizaría
  // `themeName` (y con él los colores vía styled-components) pero dejaría el
  // atributo -- y con él las variables CSS de `GlobalStyles.tsx` que
  // `Hero.tsx` consume (`--hero-title-vw` y compañía) -- congelado en el
  // valor de la carga: el titulo del hero se quedaria con el tamaño del tema
  // VIEJO tras alternar.
  //
  // NO usa un ref de "primera vez" (fix round, 2º hallazgo del re-revisor):
  // bajo React StrictMode (`next.config.ts`, activo en CADA `pnpm dev`),
  // React invoca los efectos de montaje DOS VECES con el MISMO snapshot
  // renderizado (`themeName`/`changeSource` todavía "light"/"initial" en
  // las DOS invocaciones) antes de que el `setState` del efecto de
  // resolución (arriba) llegue a aplicarse de verdad. Un ref SOBREVIVE a
  // esa doble invocación pero el CIERRE de la función no: la primera
  // invocación podía saltar la escritura correctamente (ref false→true),
  // pero la SEGUNDA encontraba el ref ya en `true` y cala en la rama
  // "escribe siempre" -- con `themeName` TODAVÍA "light", el mismo cierre
  // stale -- pisando lo que el script ya había fijado. Medido con
  // `renderWithProviders(ui, { reactStrictMode: true })` (mismo patrón que
  // `HeroBackdrop.test.tsx`): secuencia `["light","dark"]`. Exactamente la
  // familia de bug que documenta `task/lessons.md` (2026-08-05, "un token
  // de invalidación escrito a mano no sobrevive a un remontaje"): un ref
  // desincronizado del ciclo de vida real del RENDER.
  //
  // La guarda correcta usa ESTADO DE REACT (`changeSource`), no un ref:
  // mientras `changeSource === "initial"`, el `themeName` de ESTE render es
  // el default SIN CONFIRMAR -- ni corregido por hidratación, ni tocado por
  // el usuario -- así que no hay nada fiable que escribir todavía. Tanto si
  // StrictMode invoca este efecto una vez como dos, AMBAS invocaciones ven
  // el MISMO `changeSource === "initial"` del MISMO commit (es estado
  // reconciliado por React, no un contador mutado a mano), así que las dos
  // saltan la escritura por igual -- nunca hay una invocación que "vea" un
  // estado a medio corregir. Solo cuando el efecto de resolución marca
  // `changeSource` como `"hydration"` o `"user"` -- lo que SOLO ocurre en
  // un render REAL, nunca en la simulación de StrictMode -- este efecto
  // escribe, y para entonces `themeName` YA es el valor correcto en el
  // MISMO commit (los dos `setState` del efecto de resolución se agrupan
  // en un único render). `useLayoutEffect` sigue sin hacer falta: este
  // efecto no dispara ningún `setState` propio.
  useEffect(() => {
    if (changeSource === "initial") return;
    document.documentElement.setAttribute(THEME_ATTRIBUTE, themeName);
  }, [themeName, changeSource]);

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
