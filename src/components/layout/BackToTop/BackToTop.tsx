"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { type DefaultTheme } from "styled-components";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { useScrolled } from "@/hooks/useScrolled";

/**
 * Umbral de aparición (Task 2 del brief): "~2 pantallas de scroll". Se
 * expresa en PANTALLAS -- múltiplo del alto del viewport -- y no como un
 * píxel fijo, para que se ajuste solo a cualquier dispositivo: un móvil
 * alto necesita más scroll en píxeles absolutos que un portátil bajo para
 * cubrir la misma proporción de contenido leído. Mismo razonamiento que
 * usaba `isInHeroZone()` en `useThemeScrollReset.ts` (retirada en Task 17,
 * plan premium F1-F5) para su propio umbral de zona.
 */
export const BACK_TO_TOP_THRESHOLD_SCREENS = 2;

/**
 * Umbral en píxeles = pantallas × alto de viewport, recalculado en cada
 * `resize` (redimensión de ventana, rotación de móvil). `Infinity` de
 * partida es SSR-safe (sin `window` durante el prerenderizado del export
 * estático) y mantiene el botón oculto hasta que el efecto calcula el
 * valor real en cliente -- nunca aparece con un umbral equivocado antes de
 * corregirse. Reutiliza `useScrolled` (ya existe, ver `src/hooks/`) para
 * el propio cálculo "scrollY > umbral": el offset que ese hook acepta es
 * justo el umbral en píxeles que esta función produce.
 */
function useBackToTopThreshold(): number {
  const [threshold, setThreshold] = useState<number>(() =>
    typeof window === "undefined"
      ? Number.POSITIVE_INFINITY
      : window.innerHeight * BACK_TO_TOP_THRESHOLD_SCREENS,
  );

  useEffect(() => {
    const update = (): void =>
      setThreshold(window.innerHeight * BACK_TO_TOP_THRESHOLD_SCREENS);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return threshold;
}

// Mismo patrón que Logo.tsx (ScLogo)/RULES.md regla 20: el tamaño se
// declara en CSS, no solo como atributo del SVG. GlobalStyles fuerza
// `svg { width: 100% }` para todo el sitio, y una declaración CSS gana
// siempre a un atributo de presentación -- sin esto el icono se estiraría
// al tamaño del botón (ya medido tres veces en este repo, ver
// task/lessons.md 2026-08-05).
const ScIcon = styled.svg`
  display: block;
  flex: none;
  width: 1em;
  height: 1em;
`;

function IconArrowUp(): ReactElement {
  return (
    <ScIcon
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 19V6M6 11l6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ScIcon>
  );
}

// `styled(IconButton)`: mismo patrón de composición en capas que
// `IconButton.tsx` ya usa sobre `Button` (ScSquare = styled(Button)) y que
// task/lessons.md (2026-07-26) documenta -- la capa exterior se inyecta
// DESPUÉS de las suyas y gana los empates de especificidad, así que
// `position: fixed` aquí prevalece sobre el `position: relative` que
// ScButton fija para su spinner interno, sin tocar Button.tsx/IconButton.tsx.
// `right`/`bottom` reservan ya el hueco de `env(safe-area-inset-*)` con
// fallback 0px (Task 13 del plan añade `viewport-fit=cover` al <meta
// viewport>; hasta que aterrice, `env()` sin ese meta resuelve siempre al
// fallback, así que esta declaración es hoy un no-op preparado, no un
// comportamiento nuevo).
// Sin variant explícito: hereda el default de IconButton (ghost, que desde
// la crítica #10 fija además el acento neutral internamente — la prop
// `intent` se retiró por inalcanzable), el MISMO que ya usa ThemeToggle
// para un control de utilidad flotante del sistema. Verificado en navegador real (frames
// reales, playwright-cli): con box-shadow (elevation[3]) de por sí ya se
// separa con claridad de cualquier fondo de sección, y un "solid/primary"
// aquí competiría en peso visual con los CTA reales de la página (p. ej.
// "Leer la historia" del hero) -- un atajo de utilidad no debe pesar lo
// mismo que una llamada a la acción.
const ScBackToTop = styled(IconButton)`
  position: fixed;
  right: calc(
    ${({ theme }) => theme.data.space[5]} + env(safe-area-inset-right, 0px)
  );
  bottom: calc(
    ${({ theme }) => theme.data.space[5]} + env(safe-area-inset-bottom, 0px)
  );
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  box-shadow: ${({ theme }) => theme.data.elevation[3]};
`;

/**
 * Lado del botón, en píxeles. Es el área táctil mínima AA (44x44) que
 * `IconButton` ya garantiza por su cuenta -- el MISMO literal, y por el mismo
 * motivo, que ya declaran `ScLanguageButton` (`LanguageSelector.tsx`),
 * `ScNavTrigger`/`ScBrandLink` (`Navbar.tsx`) y `ScSheetRow` (`NavSheet.tsx`):
 * no hay casilla de la escala de `space` para ese mínimo, y el sistema
 * sanciona el literal con nombre en vez de inventar un paso.
 */
export const BACK_TO_TOP_SIDE_PX = 44;

/**
 * BANDA QUE ESTE BOTÓN OCUPA SOBRE EL FILO INFERIOR DEL VIEWPORT, para que
 * quien termine el documento pueda reservarla (crítica #12).
 *
 * EL DEFECTO QUE CIERRA, medido a 390x844 en tema oscuro: el botón (44x44,
 * `position: fixed`) tapaba los últimos ~36 px de dos enlaces del pie --
 * «Únete a la comunidad» y «Explora el código». No es un problema de z-index
 * ni de opacidad: es que un elemento fijo al borde inferior se posa SIEMPRE
 * sobre lo último del documento, y lo último del documento son enlaces.
 *
 * Por qué la reserva vive en el CONTENIDO y no en el botón: mover el botón
 * hacia arriba lo alejaría del pulgar (su única razón de estar abajo a la
 * derecha) y seguiría tapando lo que hubiera en su nueva posición. Reservar la
 * banda en el pie no mueve nada de sitio: añade recorrido de scroll al final,
 * que es exactamente el hueco que el botón necesita para no posarse encima de
 * nada.
 *
 * Los tres sumandos, cada uno con su trabajo:
 * - `env(safe-area-inset-bottom)` y `space[5]`: reproducen VERBATIM el `bottom`
 *   del propio botón (ver `ScBackToTop`), así que la banda empieza donde
 *   empieza el botón de verdad. Que salgan de aquí y no de un número copiado en
 *   el pie es lo que impide que las dos medidas se desincronicen el día que el
 *   botón se separe más del borde (regla 13/41: la invariante cruza dos
 *   ficheros, así que vive en un sitio y la ata un test que importa los dos).
 * - `BACK_TO_TOP_SIDE_PX`: el alto real del botón.
 * - `space[3]`: separación mínima entre el filo superior del botón y el texto
 *   que queda justo encima -- sin ella, el enlace quedaría "libre" pero pegado
 *   al botón, que se lee igual de mal.
 */
export function backToTopClearance(theme: DefaultTheme): string {
  const { space } = theme.data;
  return `calc(env(safe-area-inset-bottom, 0px) + ${space[5]} + ${BACK_TO_TOP_SIDE_PX}px + ${space[3]})`;
}

export function BackToTop(): ReactElement | null {
  const { t } = useTranslation("common");
  const threshold = useBackToTopThreshold();
  const visible = useScrolled(threshold);

  // Identidad estable (deps `[]`): no depende de props/estado, solo mueve
  // el foco al landmark principal. Compartida por las DOS vías de abajo.
  const moveFocusToMain = useCallback((): void => {
    document.getElementById("main")?.focus();
  }, []);

  const handleClick = useCallback((): void => {
    // Leído DENTRO del manejador, nunca durante el render (rompería el
    // export estático) -- mismo patrón que useThemeScrollReset.ts.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });

    /*
     * Mueve el foco al landmark principal (`#main`, el MISMO destino que
     * consume SkipLink) en el mismo tick que el click, antes de que
     * cualquier evento `scroll` asíncrono actualice `visible` a `false` y
     * desmonte este botón. Mismo principio que RULES.md regla 27 (un
     * control nunca pierde el foco como consecuencia directa de su propia
     * activación). Esta vía cubre el caso más común (activar el botón),
     * pero NO cubre que el botón desaparezca por un scroll INDEPENDIENTE
     * del click -- ver el efecto de abajo, que sí lo cubre.
     */
    moveFocusToMain();
  }, [moveFocusToMain]);

  /*
   * Vía INDEPENDIENTE del click (hallazgo Important, review fix round 1):
   * `visible` la gobierna `useScrolled`, que reacciona a CUALQUIER scroll
   * -- no solo al que dispara `handleClick`. Si un usuario de teclado
   * llega al botón con Tab (SIN activarlo) y el scroll cruza el umbral por
   * otra vía (tecla Home/PageUp, rueda, `scrollTo` de otro control), el
   * componente se desmonta (`if (!visible) return null`, abajo) sin pasar
   * por `handleClick`, y el foco quedaría huérfano en `<body>` -- el mismo
   * síntoma que RULES.md regla 27 prohíbe, por una vía distinta.
   *
   * Por qué un LISTENER PROPIO de `scroll` y no un `useEffect(() => {...},
   * [visible])` reaccionando DESPUÉS del cambio: al eliminar del DOM un
   * nodo que tiene el foco, el estándar HTML ejecuta la "focus fixup rule"
   * de forma SÍNCRONA como parte de esa misma eliminación -- dispara
   * `blur` en el nodo y mueve el foco a `<body>` ANTES de que cualquier
   * efecto de React (que corre después del commit, y más tarde aún si es
   * `useEffect` en vez de `useLayoutEffect`) llegue a ejecutarse. Un efecto
   * atado a `[visible]` comprobaría `document.activeElement` cuando el
   * foco YA se perdió: cerraría la puerta del establo con el caballo
   * fuera. Este listener, en cambio, corre DENTRO del mismo evento nativo
   * `scroll` que `useScrolled` también escucha -- todavía con el botón
   * montado, porque la actualización de estado de React que lo
   * desmontaría es asíncrona y no se aplica de forma síncrona dentro del
   * propio despacho del evento --, así que la comprobación llega a tiempo.
   *
   * `data-back-to-top` identifica el botón sin depender de si `ref`
   * atraviesa limpio las tres capas de composición
   * (IconButton -> styled(Button) -> Button): mismo patrón ya usado en
   * IconButton.tsx (`data-variant`), un atributo plano que SÍ viaja entero
   * por el `...rest` de cada capa.
   */
  useEffect(() => {
    const handleIndependentScroll = (): void => {
      const activo = document.activeElement;
      if (
        activo?.hasAttribute("data-back-to-top") &&
        window.scrollY <= threshold
      ) {
        moveFocusToMain();
      }
    };
    window.addEventListener("scroll", handleIndependentScroll, {
      passive: true,
    });
    return () => window.removeEventListener("scroll", handleIndependentScroll);
  }, [threshold, moveFocusToMain]);

  if (!visible) return null;

  return (
    <ScBackToTop
      data-back-to-top="true"
      icon={<IconArrowUp />}
      aria-label={t("Common.BackToTop.label")}
      onClick={handleClick}
    />
  );
}
