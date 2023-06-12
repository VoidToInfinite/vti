/* eslint-disable max-lines-per-function */
/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable react/no-unknown-property */
/* eslint-disable jsx-a11y/anchor-is-valid */
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const Error404 = () => {
  const router = useRouter();
  const [counter, setCounter] = useState<number>(15);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back();
    }, counter * 1000);

    const interval = setInterval(() => {
      setCounter((prevCounter) => prevCounter - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [counter, router]);

  return (
    <>
      <Head>
        <title>Página no encontrada</title>
      </Head>
      <div className="error-container">
        <h1 className="error-heading">404 - Página no encontrada</h1>
        <p className="error-text">
          Lo sentimos, la página que estás buscando no existe.
        </p>
        <div className="error-links">
          <Link
            href="/"
            className="error-link"
          >
            Volver a la página principal
          </Link>
          <span className="error-link-separator">o</span>
          <button
            type="button"
            className="error-link"
            onClick={() => router.back()}
            aria-label="Volver a la página anterior"
          >
            Volver a la página anterior
          </button>
        </div>
        <div className="error-counter">
          Esta página se redirigirá en {counter} segundos...
        </div>
      </div>
      <style jsx>
        {`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: #f0f0f0;
          }
          .error-heading {
            font-size: 5rem;
            margin-bottom: 2rem;
            position: relative;
            text-shadow: 0 0 0.5rem #fff, 0 0 1.5rem #fff, 0 0 3rem #fff,
              0 0 5rem #ff6700, 0 0 7rem #ff6700, 0 0 8rem #ff6700,
              0 0 10rem #ff6700, 0 0 15rem #ff6700;
            color: transparent;
            background-clip: text;
          }
          .error-text {
            font-size: 2rem;
            margin-bottom: 2rem;
          }
          .error-links {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 2rem;
          }
          .error-link {
            font-size: 1.5rem;
            color: #0070f3;
            text-decoration: none;
            margin: 0 1rem;
          }
          .error-link:hover {
            text-decoration: underline;
          }
          .error-link-separator {
            font-size: 1.5rem;
            margin: 0 1rem;
            color: #000;
          }
          .error-counter {
            font-size: 1.2rem;
            font-style: italic;
            color: #666;
          }
        `}
      </style>
    </>
  );
};
export default Error404;
