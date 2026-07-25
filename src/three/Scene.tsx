"use client";
import { useEffect, useRef, type ReactElement, type RefObject } from "react";
import * as THREE from "three";
import styled from "styled-components";
import { createStarfield } from "./starfield";
import { applyCameraProgress } from "./camera";

const ScCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Fundido poster → live cuando la escena está lista (spec §10). */
  opacity: 0;
  transition: opacity ${({ theme }) => theme.data.motion.duration.base}
    ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-ready="true"] {
    opacity: 1;
  }
`;

export function Scene({
  progress,
}: {
  progress: RefObject<number>;
}): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    // DPR capado a 2: por encima, el coste crece sin ganancia perceptible.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    applyCameraProgress(camera, 0);

    const stars = createStarfield();
    scene.add(stars.points);

    const resize = (): void => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // El loop se pausa fuera de viewport y con la pestaña oculta (spec §13):
    // una escena invisible no debe consumir ni un frame.
    let raf = 0;
    let visible = true;
    let onscreen = true;
    const running = (): boolean => visible && onscreen;

    const tick = (): void => {
      const p = progress.current ?? 0;
      applyCameraProgress(camera, p);
      stars.update(p);
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(tick);
    };
    const start = (): void => {
      if (raf === 0 && running()) raf = window.requestAnimationFrame(tick);
    };
    const stop = (): void => {
      if (raf !== 0) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      onscreen = entry?.isIntersecting ?? false;
      if (running()) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = (): void => {
      visible = document.visibilityState === "visible";
      if (running()) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    canvas.dataset.ready = "true";
    start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
      stars.dispose();
      renderer.dispose();
    };
  }, [progress]);

  return (
    <ScCanvas
      ref={canvasRef}
      aria-hidden="true"
    />
  );
}
