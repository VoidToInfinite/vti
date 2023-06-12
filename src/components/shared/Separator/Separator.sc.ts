"use client";

import styled from "styled-components";

const ScSeparator = styled.hr`
  border: 1px solid ${({ theme }) => theme.data.color.tertiary?.[500]};
  margin: 0.5rem 0px 1rem;
  width: 50%;
`;

export default ScSeparator;
