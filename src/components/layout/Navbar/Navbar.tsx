"use client";

import Link from "next/link";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";

const ScHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: ${({ theme }) => theme.data.background.primary[500]};
  border-bottom: 1px solid ${({ theme }) => theme.data.background.primary[300]};
`;

const ScNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 3.5rem;
  padding: 0 1rem;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 0 2rem;
  }
`;

const ScBrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  font-size: 1.15rem;
`;

const ScActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export function Navbar() {
  return (
    <ScHeader>
      <ScNav>
        <ScBrandLink href="/">
          <BrandName />
        </ScBrandLink>
        <ScActions>
          <LanguageSelector />
          <ThemeToggle />
        </ScActions>
      </ScNav>
    </ScHeader>
  );
}
