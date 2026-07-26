import type { ReactElement } from "react";

// Iconos en línea, sin dependencias nuevas. width/height="1em" para escalar
// con el font-size que ScSquare de IconButton fija por size (ver
// IconButton.tsx: ICON_SIDE). currentColor hereda del contexto ya resuelto
// por Navbar/ThemeToggle — sin dinámicas de tema aquí.
export function IconSun(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <line
          x1="12"
          y1="2.5"
          x2="12"
          y2="5"
        />
        <line
          x1="12"
          y1="19"
          x2="12"
          y2="21.5"
        />
        <line
          x1="2.5"
          y1="12"
          x2="5"
          y2="12"
        />
        <line
          x1="19"
          y1="12"
          x2="21.5"
          y2="12"
        />
        <line
          x1="5.1"
          y1="5.1"
          x2="6.8"
          y2="6.8"
        />
        <line
          x1="17.2"
          y1="17.2"
          x2="18.9"
          y2="18.9"
        />
        <line
          x1="5.1"
          y1="18.9"
          x2="6.8"
          y2="17.2"
        />
        <line
          x1="17.2"
          y1="6.8"
          x2="18.9"
          y2="5.1"
        />
      </g>
    </svg>
  );
}

export function IconMoon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 1 0 10.5 10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
