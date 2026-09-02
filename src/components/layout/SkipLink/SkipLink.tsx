"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

/*
 * Enlace "saltar al contenido" (WCAG 2.4.1, Bypass Blocks): destino
 * `#main`, el landmark principal que cada ruta declara (`app/page.tsx`,
 * `LegalDocument.tsx`, `NotFoundContent.tsx` -- ver el `id="main"
 * tabIndex={-1}` que las tres añaden). `tabIndex={-1}` en el destino es lo
 * que lo hace focalizable de forma fiable: sin él, un navegador puede
 * desplazar el scroll hasta el elemento pero dejar el foco real en el
 * `<body>`, sin ningún indicador visible de dónde aterrizó el usuario.
 *
 * PRIMER elemento enfocable de la página: `app/providers.tsx` lo monta
 * antes que `{children}`, dentro de `I18nProvider` (necesita traducirse) y
 * de `ThemeProvider` (necesita tokens de tema) -- ninguno de los
 * proveedores que lo envuelven ahí (`StyledComponentsRegistry`,
 * `ThemeProvider`, `I18nProvider`) renderiza un nodo DOM propio, así que en
 * el árbol real sigue siendo el primer hijo focalizable de `<body>`, aunque
 * el fichero fuente no sea `app/layout.tsx` (que es Server Component y no
 * puede leer tema/idioma).
 *
 * Oculto SOLO visualmente hasta `:focus-visible`, nunca del árbol de
 * accesibilidad: `display: none`/`visibility: hidden` lo sacarían también
 * del recorrido por tabulación, justo lo contrario de lo que este átomo
 * existe para conseguir. `transform` es la ÚNICA propiedad animada (regla
 * 18 de RULES.md) y lo saca del viewport por completo en reposo -- no solo
 * `opacity` -- para que tampoco intercepte un click de ratón por accidente
 * mientras está "oculto". El anillo de :focus-visible lo pone gratis
 * GlobalStyles (`:where(a, ...):focus-visible { outline: ... }`, aplica a
 * cualquier `<a>`): este componente no declara ningún halo propio.
 *
 * ## LA SOMBRA VIVE EN `:focus-visible`, NUNCA EN REPOSO (crítica #14, P2)
 *
 * EL DEFECTO, medido por el evaluador sobre capturas reales de `/` y de la
 * 404 en tema claro: sacar el enlace del viewport con `translateY(-150%)`
 * mueve su CAJA, pero una `box-shadow` no se recorta contra el borde de la
 * pantalla -- se dibuja alrededor de la caja esté donde esté. Con la caja en
 * reposo terminando en y ~= -10 y `elevation[3]` (`0 12px 32px`, alfa 0,16),
 * el desenfoque derramaba una mancha gris DENTRO de la ventana, de y ~= 2 a
 * y ~= 34, justo sobre la zona del logotipo, en TODAS las páginas del sitio
 * en tema claro -- y sin que nada la explicara, porque el elemento que la
 * producía es invisible por diseño.
 *
 * EL ARREGLO NO SACA EL ENLACE DEL ORDEN DE TABULACIÓN ni cambia la
 * propiedad animada: la sombra se declara SOLO en `:focus-visible`, el único
 * estado en el que el enlace se ve y por tanto el único en el que una sombra
 * significa algo. `box-shadow` NO entra en la lista de `transition` -- solo
 * `transform` anima (regla 18) --, así que aparece de golpe con el enlace ya
 * en pantalla; es deliberado y se declara aquí para que nadie la "complete"
 * añadiéndola a la transición.
 *
 * Alternativa descartada: recortar la sombra con `clip-path` mientras el
 * enlace está fuera. Exigiría conmutar el `clip-path` en `:focus-visible`
 * igual que se conmuta la sombra -- la misma cantidad de estado, pero con
 * una propiedad que crea contexto de recorte y que podría morder el halo de
 * foco que pinta GlobalStyles. No declarar la sombra es más simple y no
 * tiene efectos colaterales.
 */
const ScSkipLink = styled.a`
  position: fixed;
  top: ${({ theme }) => theme.data.space[3]};
  left: ${({ theme }) => theme.data.space[3]};
  z-index: ${({ theme }) => theme.data.zIndex.modal};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[5]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  background: ${({ theme }) => theme.data.semantic.brandSolid};
  color: ${({ theme }) => theme.data.semantic.onBrand};
  font-weight: 600;
  /* SIN box-shadow en reposo: ver el docblock de arriba -- fuera de pantalla,
     su desenfoque seguía manchando el logotipo. */
  transform: translateY(-150%);
  transition: transform ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  &:focus-visible {
    transform: translateY(0);
    box-shadow: ${({ theme }) => theme.data.elevation[3]};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function SkipLink(): ReactElement {
  const { t } = useTranslation("common");
  return <ScSkipLink href="#main">{t("Common.SkipLink.label")}</ScSkipLink>;
}
