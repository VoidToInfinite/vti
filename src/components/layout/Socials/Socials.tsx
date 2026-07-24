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
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ScSocialLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  width: 2.5rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.data.color.primary[100]};
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;

  &:hover,
  &:focus-visible {
    background-color: ${({ theme }) => theme.data.color.primary[200]};
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

const ScSocialIcon = styled.img`
  height: 1.15rem;
  width: 1.15rem;
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
