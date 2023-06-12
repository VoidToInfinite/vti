import React from "react";
// import {
//   SphereGeometry,
//   Mesh,
//   MeshBasicMaterial,
//   Scene,
//   Color,
//   WebGLRenderer,
//   PerspectiveCamera,
// } from "three";
// import useWindowSize from "@/hooks/useWindowSize";
import {
  ScBubbleGlass,
  ScBubblePrimary,
  ScBubbleSecondary,
  ScBubbleTertiary,
} from "./BackOrbs.sc";

// export const Sphere = () => {
//   const { height, width } = useWindowSize();
//   const containerRef = useRef<HTMLDivElement>(null);

//   // eslint-disable-next-line max-statements
//   useEffect(() => {
//     function createScene(): THREE.Scene {
//       return new Scene();
//     }
//     function createCamera(): THREE.PerspectiveCamera {
//       // proporción de aspecto y rango de vision ajustados para dispositivo móvil
//       const camera: PerspectiveCamera = new PerspectiveCamera(
//         75,
//         width / height,
//         0.1,
//         1000
//       );
//       camera.position.z = 3; // mover la cámara más cerca del objeto para dispositivo móvil
//       return camera;
//     }
//     function createRenderer(): THREE.WebGLRenderer {
//       return new WebGLRenderer({ antialias: true });
//     }
//     function createSphere(): THREE.Mesh {
//       // tamaño del cubo reducido para dispositivo móvil
//       const colorSphere = new Color("#dd75cf");
//       const geometry: THREE.SphereGeometry = new SphereGeometry(0.5, 32, 16);
//       const material: THREE.MeshBasicMaterial = new MeshBasicMaterial({
//         color: colorSphere,
//         wireframe: true,
//       });
//       const sphere: THREE.Mesh = new Mesh(geometry, material);
//       // scene.add(sphere);
//       return sphere;
//     }
//     // eslint-disable-next-line max-params
//     function createAnimation(
//       scene: THREE.Scene,
//       camera: THREE.PerspectiveCamera,
//       renderer: THREE.WebGLRenderer,
//       geometry: THREE.Mesh
//     ): () => void {
//       return function animate(): void {
//         requestAnimationFrame(animate);
//         // eslint-disable-next-line no-param-reassign
//         geometry.rotation.x += 0.01;
//         // eslint-disable-next-line no-param-reassign
//         geometry.rotation.y += 0.01;

//         renderer.render(scene, camera);
//       };
//     }
//     function disposeObjects(
//       scene: THREE.Scene,
//       renderer: THREE.WebGLRenderer
//     ): void {
//       scene.traverse((object) => {
//         if (object instanceof Mesh) {
//           // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
//           object.geometry.dispose();
//           // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
//           object.material.dispose();
//         }
//       });
//       renderer.dispose();
//     }
//     const camera: THREE.PerspectiveCamera = createCamera();
//     const renderer: THREE.WebGLRenderer = createRenderer();
//     const scene: THREE.Scene = createScene();
//     const sphere: THREE.Mesh = createSphere();
//     scene.add(sphere);
//     const animate = createAnimation(scene, camera, renderer, sphere);
//     // renderer.setSize(width, height);
//     containerRef.current?.appendChild(renderer.domElement);
//     animate();
//     return () => {
//       disposeObjects(scene, renderer);
//     };
//   }, []);

//   return <div ref={containerRef} />;
// };

const BackOrbs: React.FC = () => (
  <ScBubbleGlass>
    <ScBubbleSecondary />
    <ScBubblePrimary />
    <ScBubbleTertiary />
  </ScBubbleGlass>
);

export default BackOrbs;
