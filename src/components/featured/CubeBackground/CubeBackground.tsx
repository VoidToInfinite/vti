"use client";

import React, { useEffect, useRef } from "react";
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

const CubeBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line max-statements
  useEffect(() => {
    function createScene(): THREE.Scene {
      return new Scene();
    }

    function createCamera(): THREE.PerspectiveCamera {
      // proporción de aspecto y rango de vision ajustados para dispositivo móvil
      const camera: PerspectiveCamera = new PerspectiveCamera(
        75,
        200 / 200,
        0.1,
        1000
      );
      camera.position.z = 3; // mover la cámara más cerca del objeto para dispositivo móvil
      return camera;
    }

    function createRenderer(): THREE.WebGLRenderer {
      return new WebGLRenderer({ antialias: true });
    }

    function createCube(scene: THREE.Scene): THREE.Mesh {
      // tamaño del cubo reducido para dispositivo móvil
      const geometry: THREE.BoxGeometry = new BoxGeometry(0.5, 0.5, 0.5);
      const material: THREE.MeshBasicMaterial = new MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
      });
      const cube: THREE.Mesh = new Mesh(geometry, material);

      scene.add(cube);

      return cube;
    }

    // eslint-disable-next-line max-params
    function createAnimation(
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      renderer: THREE.WebGLRenderer,
      geometry: THREE.Mesh
    ): () => void {
      return function animate(): void {
        requestAnimationFrame(animate);
        // eslint-disable-next-line no-param-reassign
        geometry.rotation.x += 0.01;
        // eslint-disable-next-line no-param-reassign
        geometry.rotation.y += 0.01;

        renderer.render(scene, camera);
      };
    }

    function disposeObjects(
      scene: THREE.Scene,
      renderer: THREE.WebGLRenderer
    ): void {
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          object.geometry.dispose();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          object.material.dispose();
        }
      });

      renderer.dispose();
    }

    const scene: THREE.Scene = createScene();
    const camera: THREE.PerspectiveCamera = createCamera();
    const renderer: THREE.WebGLRenderer = createRenderer();
    const cube: THREE.Mesh = createCube(scene);
    const animate = createAnimation(scene, camera, renderer, cube);

    renderer.setSize(200, 200);
    containerRef.current?.appendChild(renderer.domElement);

    animate();

    return () => {
      disposeObjects(scene, renderer);
    };
  }, [containerRef]);

  return <div ref={containerRef} />;
};

export default CubeBackground;
