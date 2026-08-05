"use client";

import styled, { keyframes } from "styled-components";

/*
 * Piezas con estilo compartidas por CookieBanner (D12, D15) y
 * CookiePreferences (D11, D15, D16) — spec 2026-08-04-legal-seo-
 * consentimiento-design.md, flujo S3.
 *
 * Dos capas de superposición, con jerarquía y semántica DISTINTAS a
 * propósito (D15):
 *
 *   - El banner vive en `zIndex.overlay` (900), NO bloquea: se puede seguir
 *     leyendo y navegando sin decidir. No hay backdrop, no hay foco
 *     atrapado -- es una franja fija, no un diálogo.
 *   - El panel de preferencias es un diálogo MODAL real, en `zIndex.modal`
 *     (1000, por encima del banner): backdrop propio, foco atrapado y
 *     `role="dialog"` los aplica `CookiePreferences.tsx`, no esta capa.
 */

// ---------------------------------------------------------------------
// CookieBanner
// ---------------------------------------------------------------------

const slideUp = keyframes`
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

/*
 * Envoltorio de ancho completo, decorativo y SIN captura de puntero propia
 * (`pointer-events: none`): solo `ScBannerSurface`, su único hijo real,
 * vuelve a activarla. Así la franja inferior no roba clics de nada que
 * quede detrás de su padding, aunque el propio banner ocupe menos ancho
 * que la ventana.
 */
export const ScBannerWrapper = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.data.zIndex.overlay};
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.data.space[4]};
  pointer-events: none;
`;

/*
 * Cristal (spec del sistema, `Card.tsx:12-16`: "el glass queda reservado a
 * capas flotantes: nav on-scroll, modal, sheet, toast"). El banner es
 * exactamente eso -- una capa flotante sobre el contenido -- así que hereda
 * el mismo lenguaje visual que `Navbar` (`ScSurface`, `Navbar.tsx:258-273`).
 */
export const ScBannerSurface = styled.div`
  pointer-events: auto;
  width: min(100%, 880px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[5]};
  border-radius: ${({ theme }) => theme.data.radius.xl};
  background: ${({ theme }) => theme.data.glass.bg};
  -webkit-backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  border: ${({ theme }) => theme.data.glass.border};
  box-shadow: ${({ theme }) => theme.data.elevation[3]};
  animation: ${slideUp} ${({ theme }) => theme.data.motion.duration.slow}
    ${({ theme }) => theme.data.motion.easing.decelerate} both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ScBannerText = styled.div`
  flex: 1 1 320px;
`;

export const ScBannerTitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[2]};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.h5.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h5.weight};
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScBannerBody = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/*
 * D12, atado por test: aceptar y rechazar viven aquí, en la PRIMERA capa,
 * como `<Button>` reales con el mismo `size` -- ver `CookieBanner.tsx`, que
 * es quien decide qué botones monta. Esta capa solo da el layout.
 */
export const ScBannerActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/*
 * "Configurar" es un tercer control, deliberadamente MENOS prominente que
 * aceptar/rechazar (texto subrayado, sin fondo) -- exactamente lo contrario
 * del patrón oscuro que D12 prohíbe, que sería atenuar "rechazar", no un
 * tercer enlace opcional.
 */
export const ScConfigureLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.brandText};
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: ${({ theme }) => theme.data.semantic.brand};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.data.semantic.focus};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.data.radius.xs};
  }
`;

// ---------------------------------------------------------------------
// CookiePreferences (diálogo modal)
// ---------------------------------------------------------------------

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const scaleIn = keyframes`
  from {
    transform: scale(0.96) translateY(8px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
`;

/*
 * Backdrop del diálogo modal: `zIndex.modal` (por encima del banner, que
 * puede seguir montado detrás mientras el panel está abierto). Se
 * construye con `color-mix` sobre un primitivo de paleta (no hay rol
 * semántico de "scrim" en `semantic.ts`) en vez de un literal
 * `rgba(0,0,0,.5)` -- sigue siendo un token del sistema, no un color
 * inventado a mano.
 */
export const ScBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.data.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.data.space[5]};
  background: color-mix(
    in oklch,
    ${({ theme }) => theme.data.palette.neutral[1000]} 55%,
    transparent
  );
  animation: ${fadeIn} ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard} both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ScDialogPanel = styled.div`
  position: relative;
  width: min(100%, 640px);
  max-height: min(88vh, 720px);
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.data.radius.xl};
  background: ${({ theme }) => theme.data.semantic.surface};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  box-shadow: ${({ theme }) => theme.data.elevation[4]};
  padding: ${({ theme }) => theme.data.space[6]};
  animation: ${scaleIn} ${({ theme }) => theme.data.motion.duration.base}
    ${({ theme }) => theme.data.motion.easing.decelerate} both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ScDialogHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[4]};
  margin-bottom: ${({ theme }) => theme.data.space[4]};
`;

export const ScDialogTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.h3.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h3.weight};
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScDialogIntro = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[5]};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

export const ScDialogFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  margin-top: ${({ theme }) => theme.data.space[5]};
  padding-top: ${({ theme }) => theme.data.space[5]};
  border-top: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

export const ScCategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[4]};
`;

export const ScCategoryRow = styled.div`
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  padding: ${({ theme }) => theme.data.space[4]};
`;

export const ScCategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/*
 * D11: la fila de `ALWAYS_ON_CATEGORY` se pinta `checked` + `disabled` --
 * el atributo lo pasa `CookiePreferences.tsx`, esta capa solo da estilo.
 * `accent-color` es la única forma nativa (sin reconstruir un checkbox a
 * mano) de teñir un `<input type="checkbox">` con un token del tema en vez
 * de dejar el azul por defecto del navegador.
 */
export const ScCheckbox = styled.input`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  accent-color: ${({ theme }) => theme.data.semantic.brandSolid};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.data.semantic.focus};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

export const ScCategoryName = styled.label`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.text};
  cursor: pointer;
`;

export const ScCategoryDescription = styled.p`
  margin: ${({ theme }) => theme.data.space[2]} 0 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/*
 * Texto que explica por qué `necessary` no se puede apagar (D11): fingir
 * una elección inexistente es el patrón oscuro que la guía de la AEPD
 * señala expresamente, así que la explicación es tan visible como el
 * propio interruptor deshabilitado, no un tooltip escondido.
 */
export const ScAlwaysOnNote = styled.p`
  margin: ${({ theme }) => theme.data.space[2]} 0 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-style: italic;
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;

/*
 * Lista de entradas de `STORAGE_REGISTRY` para una categoría
 * (`storageByCategory`, `cookies.ts`): `<ul>` de entradas, no `<dl>` --
 * cada entrada necesita CUATRO pares término/valor (identificador,
 * finalidad, tipo, duración) y el modelo de contenido de `<dl>` exige que,
 * si se agrupan en `<div>`, cada `<div>` contenga SOLO pares `dt`/`dd`
 * directos (ningún elemento más, ni un `<div>` anidado con el nombre de la
 * entrada). Envolver cada entrada en su propio `<dl>` (`ScStorageMeta` más
 * abajo) sí es válido y evita ese conflicto.
 */
export const ScStorageList = styled.ul`
  list-style: none;
  margin: ${({ theme }) => theme.data.space[3]} 0 0;
  padding: ${({ theme }) => theme.data.space[3]};
  border-radius: ${({ theme }) => theme.data.radius.md};
  background: ${({ theme }) => theme.data.semantic.surfaceSunken};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
`;

export const ScStorageItem = styled.li`
  &:not(:first-child) {
    padding-top: ${({ theme }) => theme.data.space[3]};
    border-top: 1px solid ${({ theme }) => theme.data.semantic.border};
  }
`;

export const ScStorageName = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[1]};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.text};
`;

/*
 * `<dl>` propio por entrada, con sus CUATRO pares `dt`/`dd` como hijos
 * DIRECTOS (identificador, finalidad, tipo, duración) -- contenido válido
 * de un `<dl>` sin agrupar en `<div>`. El grid de dos columnas empareja
 * cada `dt` con su `dd` visualmente sin depender de envoltorios extra.
 */
export const ScStorageMeta = styled.dl`
  margin: ${({ theme }) => theme.data.space[1]} 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: ${({ theme }) => theme.data.space[2]};
  row-gap: ${({ theme }) => theme.data.space[1]};

  dt {
    font-family: ${({ theme }) => theme.data.type.fontBody};
    font-size: ${({ theme }) => theme.data.type.scale.caption.size};
    font-weight: 600;
    color: ${({ theme }) => theme.data.semantic.textSubtle};
  }

  dd {
    margin: 0;
    font-family: ${({ theme }) => theme.data.type.fontBody};
    font-size: ${({ theme }) => theme.data.type.scale.caption.size};
    color: ${({ theme }) => theme.data.semantic.textMuted};
  }
`;

export const ScEmptyCategoryNote = styled.p`
  margin: ${({ theme }) => theme.data.space[3]} 0 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-style: italic;
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;
