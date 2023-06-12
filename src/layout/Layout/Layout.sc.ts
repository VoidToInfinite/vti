import styled from "styled-components";

export const ScApp = styled.div`
  &#app {
    min-height: 100vh;
    width: 100%;
    display: grid;
    grid-template-rows: 54px 1fr auto;
    grid-template-areas:
      "nav"
      "main"
      "footer";

    overflow: visible;
    position: relative;
  }
`;

const ScLayout = styled.main`
  height: auto;
  grid-area: main;
`;

export default ScLayout;
