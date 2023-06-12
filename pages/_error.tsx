import { NextPageContext } from "next";
import React from "react";

interface ErrorProps {
  statusCode: number;
}

const Error = ({ statusCode }: ErrorProps) => (
  <p>
    {statusCode
      ? `An error ${statusCode} occurred on server`
      : "An error occurred on client"}
  </p>
);

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  let statusCode = 404;
  if (res) {
    statusCode = res.statusCode;
  } else if (err?.statusCode) {
    statusCode = err.statusCode;
  }
  return { statusCode };
};

export default Error;
