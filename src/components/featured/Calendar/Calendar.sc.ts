"use client";

import styled from "styled-components";

const ScCalendar = styled.div`
  width: 320px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  -moz-border-radius: 12px 12px 12px 12px;
  -webkit-border-radius: 12px 12px 12px 12px;
  border-radius: 12px 12px 12px 12px;
  border: 1px solid ${({ theme }) => theme.data.background.primary[100]};
`;

export const ScCalendarHeader = styled.div`
  height: 50px;
  width: 100%;
  padding: 18px 0;
  background-color: ${({ theme }) => theme.data.background.primary[300]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: center;
  -webkit-border-radius: 12px 12px 0 0;
  -moz-border-radius: 12px 12px 0 0;
  border-radius: 12px 12px 0 0;
  z-index: 10;
  overflow: hidden;

  & p {
    font-size: 1.5rem;
    color: ${({ theme }) => theme.data.typography.primaryColor[500]};
    width: 70%;
  }
`;

export const ScCalendarWeekdays = styled.div`
  height: 40px;
  width: 100%;

  /* min-size of the column --w: 40px;*/
  /* number of columns --n: 7;*/
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(clamp(100%/ (7 + 1) + 0.1%, 40px, 100%), 1fr)
  );

  overflow: hidden;
  z-index: 10;

  & > div {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;

    background-color: ${({ theme }) => theme.data.background.primary[300]};
    color: ${({ theme }) => theme.data.typography.primaryColor[500]};
    overflow: hidden;
  }
`;

export const ScCalendarContent = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.data.background.primary[300]};

  -moz-border-radius: 0 0 12px 12px;
  -webkit-border-radius: 0 0 12px 12px;
  border-radius: 0 0 12px 12px;

  /* min-size of the column --w: 40px;*/
  /* number of columns --n: 7;*/
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(clamp(100%/ (7 + 1) + 0.1%, 40px, 100%), 1fr)
  );

  overflow: hidden;
  z-index: 10;

  & > div {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;

    background-color: ${({ theme }) => theme.data.background.primary[300]};
    color: ${({ theme }) => theme.data.typography.primaryColor[500]};
    overflow: hidden;
    cursor: pointer;

    &.blank {
      background-color: ${({ theme }) => theme.data.color.accent[100]};
      cursor: default;
      &:hover {
        background-color: ${({ theme }) => theme.data.color.accent[100]};
      }
    }

    &.today {
      background-color: ${({ theme }) => theme.data.color.primary[200]};
      color: ${({ theme }) => theme.data.color.primary[800]};

      & > p {
        font-weight: 600;
      }

      &:hover {
        background-color: ${({ theme }) => theme.data.color.primary[200]};
      }
    }

    &:hover {
      background-color: ${({ theme }) => theme.data.background.primary[400]};
    }
  }
`;

export default ScCalendar;
