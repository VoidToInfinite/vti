"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { useScrolled } from "@/hooks/useScrolled";

/**
 * Umbral de aparición (Task 2 del brief): "~2 pantallas de scroll". Se
 * expresa en PANTALLAS -- múltiplo del alto del viewport -- y no como un
 * píxel fijo, para que se ajuste solo a cualquier dispositivo: un móvil
 * alto necesita más scroll en píxeles absolutos que un portátil bajo para
 * cubrir la misma proporción de contenido leído. Mismo razonamiento que
 * `isInHeroZone()` en `useThemeScrollReset.ts`, que descarta un umbral en
 * píxeles fijo por el mismo motivo.
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
// Sin variant/intent explícitos: hereda el default de IconButton
// (ghost/neutral), el MISMO que ya usa ThemeToggle para un control de
// utilidad flotante del sistema. Verificado en navegador real (frames
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

export function BackToTop(): ReactElement | null {
  const { t } = useTranslation("common");
  const threshold = useBackToTopThreshold();
  const visible = useScrolled(threshold);

  const handleClick = (): void => {
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
     * desmonte este botón. Sin esto, un usuario de teclado que activa este
     * control pierde el foco hacia `<body>` en TODO uso legítimo -- no es
     * un caso borde: cualquier "volver arriba" que funcione termina con
     * `scrollY` por debajo del umbral, así que el botón siempre desaparece
     * después de activarse. Mismo principio que RULES.md regla 27 (un
     * control nunca pierde el foco como consecuencia directa de su propia
     * activación), aplicado aquí vía un desmontaje diferido por estado de
     * scroll en vez de un atributo `disabled`.
     */
    document.getElementById("main")?.focus();
  };

  if (!visible) return null;

  return (
    <ScBackToTop
      icon={<IconArrowUp />}
      aria-label={t("Common.BackToTop.label")}
      onClick={handleClick}
    />
  );
}
