import styled from "styled-components";

interface SocialLink {
  key: string;
  href: string;
  label: string;
  icon: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    key: "discord",
    href: "https://discord.gg/CuGhqdG3g3",
    label: "Discord",
    icon: "/socials/discord.svg",
  },
  {
    key: "github",
    href: "https://github.com/voidtoinfinite",
    label: "GitHub",
    icon: "/socials/github.svg",
  },
  {
    key: "instagram",
    href: "https://www.instagram.com/voidtoinfinite/",
    label: "Instagram",
    icon: "/socials/instagram.svg",
  },
];

const ScSocialsList = styled.ul`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ScSocialLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Área táctil mínima AA (44px), literal como en Button md/Input: no hay
     casilla de la escala de space para este tamaño mínimo, mismo precedente
     ya usado en el sistema. Sube de 2.5rem (40px). */
  height: 44px;
  width: 44px;
  border-radius: ${({ theme }) => theme.data.radius.full};
  /* AA/afordancia (I3): antes usaba surfaceSunken en reposo, idéntico al
     fondo del Footer (y, en dark, semanticDark.surfaceSunken === bg
     literalmente — el chip era invisible contra CUALQUIER fondo del
     sistema, no solo en Footer). surface en reposo / surfaceSunken en hover
     da un chip que ya no coincide en valor exacto con ninguno de los dos
     fondos de uso (Footer=surfaceSunken, Hero=bg heredado de body). */
  background-color: ${({ theme }) => theme.data.semantic.surface};
  transition:
    transform ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    background-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  &:hover,
  &:focus-visible {
    background-color: ${({ theme }) => theme.data.semantic.surfaceSunken};
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:focus-visible {
      transform: none;
    }
  }
`;

// Los SVG de /public/socials tienen paths sin fill explícito → heredan el
// default del SVG (negro fijo) y se cargan vía <img>, así que no son
// recoloreables por CSS currentColor/herencia (solo funciona con SVG inline
// o <use>). Negro sobre surface en dark da ~1.66:1 (casi invisible) — se
// invierte a blanco con filter en dark, donde sí es legible.
const ScSocialIcon = styled.img`
  height: 1.15rem;
  width: 1.15rem;
  filter: ${({ theme }) => (theme.data.isLight ? "none" : "invert(1)")};
`;

export function Socials() {
  return (
    <ScSocialsList>
      {SOCIAL_LINKS.map(({ key, href, label, icon }) => (
        <li key={key}>
          <ScSocialLink
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
          >
            <ScSocialIcon
              src={icon}
              alt=""
            />
          </ScSocialLink>
        </li>
      ))}
    </ScSocialsList>
  );
}
