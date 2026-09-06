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
import {
  resolveInitialTheme,
  THEME_ATTRIBUTE,
  THEME_COLORS,
} from "./resolveTheme";
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

/**
 * Fix wave B (2026-08-12, hallazgo de review de rama): `localStorage.getItem`/
 * `setItem` pueden LANZAR, no solo devolver `null` -- en modo privado
 * estricto (Safari) o con el almacenamiento bloqueado por política del
 * navegador, el acceso mismo tira una excepción (verificado leyendo el
 * motor: `SecurityError`/`QuotaExceededError` según el caso). `matchMedia`,
 * más abajo en este mismo componente, ya llevaba su catch homólogo desde
 * antes -- con un comentario que decía explícitamente "igual que el catch
 * homólogo de resolveTheme.ts"-- pero los dos accesos a `localStorage` se
 * quedaron sin el suyo: en ESE navegador, el script pre-paint
 * (`resolveTheme.ts`, que sí protege los dos) resolvía bien, pero el
 * runtime de React lanzaba en CADA toggle -- sin ningún error boundary en
 * el árbol, eso tira la sección entera. Estas dos funciones son el mismo
 * catch, centralizado para los tres puntos de acceso de este módulo
 * (resolución inicial, persistencia del toggle, lectura en el listener de
 * `prefers-color-scheme`): degradar a "sin valor guardado"/"no se pudo
 * persistir" en vez de propagar es correcto también en un navegador real
 * sin soporte, no solo un parche de test -- mismo criterio que ya aplica el
 * catch de `matchMedia` y que documenta `resolveTheme.ts`
 * (`buildThemeBootstrapScript`) para su propio `try/catch` gemelo.
 */
function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.theme);
  } catch {
    return null;
  }
}

function writeStoredTheme(name: ThemeName): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.theme, name);
  } catch {
    /* almacenamiento bloqueado: la sesion sigue funcionando sin persistir */
  }
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): ReactElement {
  const [themeName, setTheme] = useState<ThemeName>("light");
  const [changeSource, setChangeSource] =
    useState<ThemeChangeSource>("initial");

  useEffect(() => {
    // Misma lógica de resolución que el script inline de `app/RootDocument.tsx`
    // (`resolveInitialTheme`, `src/theme/resolveTheme.ts`) — decisión D-C:
    // localStorage gana a `prefers-color-scheme`; sin storage, decide el
    // sistema (Task 9). Reading localStorage/matchMedia during render
    // would break the static export's prerendered HTML (no `window`) and
    // risk a hydration mismatch. Syncing it once, client-side only, after
    // mount is the correct SSR-safe pattern: React state STAYS "light" for
    // the very first client render (identical to the baked HTML), so this
    // never causes a hydration mismatch, even though a few components may
    // repaint once the value corrects.
    const stored = readStoredTheme();
    // jsdom no implementa `matchMedia` (lección ya documentada en
    // `providers.test.tsx`) y este efecto ahora corre en CADA test que monta
    // `ThemeProvider` vía `renderWithProviders` -- decenas de ficheros que no
    // tienen por qué conocer ni stubear esta API. Igual que el catch homólogo
    // de `resolveTheme.ts`
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

  // Task 34 («detectar no es elegir», hallazgo del gate F4): SOLO una
  // elección EXPLÍCITA (el toggle, `changeSource === "user"`) se persiste.
  // Antes de esta tarea este efecto escribía en TODO cambio de `themeName`
  // sin mirar `changeSource`, así que la mera detección automática --carga
  // inicial con storage vacío y sistema oscuro, o el seguimiento en vivo del
  // efecto de abajo-- quedaba grabada en `localStorage` como si fuera una
  // decisión humana: con storage limpio y el SO en oscuro, el sitio escribía
  // `vti-theme=dark` en la primera carga, y un cambio posterior del SO a
  // claro ya no podía revertirlo (storage, una vez escrito, gana siempre a
  // `prefers` -- decisión D-C). El propio registro legal de
  // `src/config/storage.ts` ya documentaba el contrato correcto (el storage
  // del tema solo se escribe cuando la persona pulsa el conmutador); este
  // efecto no lo cumplía.
  useEffect(() => {
    if (changeSource !== "user") return;
    writeStoredTheme(themeName);
  }, [themeName, changeSource]);

  // Task 34, corolario de D-C: quien NUNCA ha tocado el toggle no tiene
  // ninguna elección que "conservar" -- si cambia el ajuste de tema del
  // sistema operativo, el sitio le acompaña EN VIVO, sin recargar. Quien SÍ
  // tiene un valor guardado (toggle propio, en esta sesión o en una
  // anterior) conserva su elección por encima del sistema: `handleChange`
  // relee `localStorage` en el momento del EVENTO, nunca un valor capturado
  // en el cierre de este efecto -- el toggle puede ocurrir después de que
  // este listener ya esté suscrito, y `localStorage` es la única fuente que
  // sigue viva en ese instante.
  //
  // `[]` como dependencias: el listener se suscribe UNA vez al montar y no
  // necesita reaccionar a cambios de `themeName`/`changeSource` -- lee
  // ambos indirectamente (vía `localStorage`) en cada evento, no desde un
  // cierre. Bajo StrictMode (montaje doble con limpieza intermedia) esto es
  // seguro: cada invocación añade y limpia su propio listener por
  // referencia, sin ningún ref ni contador escrito a mano que pueda
  // desincronizarse de un remontaje (la clase de bug de
  // `task/lessons.md`, 2026-08-05).
  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      // Mismo criterio que el resto del módulo (buildThemeBootstrapScript,
      // el efecto de resolución de arriba): sin `matchMedia`, no hay nada
      // que escuchar y el tema se queda en lo que la carga ya resolvió.
      return;
    }
    const handleChange = (event: MediaQueryListEvent): void => {
      const stored = readStoredTheme();
      if (stored === "light" || stored === "dark") return; // D-C: storage gana
      setChangeSource("hydration");
      setTheme(event.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  // Mantiene el atributo `data-theme` (Task 9) sincronizado con el ESTADO
  // real en TODO cambio, no solo en la carga: el script pre-pintado de
  // `app/RootDocument.tsx` lo fija UNA vez, antes de hidratar, y nunca vuelve a
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
    /*
     * `theme-color` sale por la MISMA puerta que `data-theme` desde el
     * 2026-09-03 (crítica #16, hallazgo P1 del evaluador técnico B1), y ahí
     * está el arreglo: mientras `changeSource === "initial"`, el `themeName`
     * de este render es el default SIN CONFIRMAR —"light" para todo el mundo,
     * incluido el visitante oscuro— así que escribirlo es pisar con el color
     * claro lo que el script de arranque ya había acertado antes del primer
     * pintado.
     *
     * Y eso es exactamente lo que hacía este efecto hasta esta fecha: escribía
     * SIEMPRE, también en la pasada inicial. Medido sobre el build de
     * producción (Chrome real, contexto nuevo, `vti-theme = "dark"`), con la
     * pila de llamadas apuntando a este mismo `forEach`:
     *
     *   t= 204  2 metas [#280739, #FAFAFA]   ← React inserta su duplicado
     *   t= 214  2 metas [#FAFAFA, #FAFAFA]   ← ESTE efecto, con themeName="light"
     *   t= 282  2 metas [#280739, #280739]   ← ESTE efecto, ya corregido
     *
     * Los 68 ms de barra clara sobre página oscura (1.472 ms en el servidor de
     * desarrollo) eran nuestros, no de Next. La duplicación era de React 19 y
     * se cerró retirando `themeColor` del `viewport` de `app/layout.tsx` (hoy
     * ese `viewport` es `ROOT_VIEWPORT`, `app/rootMetadata.ts`, y sigue sin
     * declararlo): la
     * etiqueta ya no la renderiza React, la crea el script de arranque y es
     * ÚNICA. Por eso aquí basta `querySelector` —la primera y única— en vez
     * del `querySelectorAll` + `forEach` de antes, que existía para dar el
     * mismo valor a las dos etiquetas cuando había dos. Si alguna vez vuelve a
     * haber más de una, este efecto actualizará solo la primera y el defecto
     * se verá: es preferible a taparlo escribiendo en todas.
     *
     * El nodo puede no existir en un navegador donde el script de arranque no
     * llegara a correr; `?.` lo cubre sin inventar aquí una segunda vía de
     * creación que duplicaría la propiedad de la etiqueta.
     */
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", THEME_COLORS[themeName]);
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
