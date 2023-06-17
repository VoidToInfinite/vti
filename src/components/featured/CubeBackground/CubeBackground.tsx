"use client";

/* eslint-disable */

import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  PerformanceMonitor,
  PresentationControls,
  SoftShadows,
} from "@react-three/drei";
import { DefaultTheme } from "styled-components";
import { RootState } from "@/context/redux/store";

const RotatingCube = (props?: JSX.IntrinsicElements["mesh"]) => {
  const currentTheme: DefaultTheme = useSelector(
    (state: RootState) => state.theme.theme
  );
  const cubeRef = useRef<THREE.Mesh>(null);
  // Hold state for hovered and clicked events
  const [hovered, setHover] = useState<boolean>(false);
  const [clicked, setClick] = useState(false);
  // Rotate the cube
  useFrame(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += 0.001;
      cubeRef.current.rotation.y += 0.001;
    }
  });
  //
  return (
    <mesh
      {...props}
      ref={cubeRef}
      onClick={() => setClick(!clicked)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={currentTheme.data.background.primary[700]}
      />
    </mesh>
  );
};

interface IRoomBox {
  meshProps?: JSX.IntrinsicElements["mesh"];
  boxProps?: JSX.IntrinsicElements["boxGeometry"];
  boxMaterial?: THREE.Material;
}

const RoomBox = ({
  meshProps,
  boxProps,
  boxMaterial,
}: IRoomBox) => {
  const cubeRef = useRef<THREE.Mesh>(null);
  // Hold state for hovered and clicked events
  const [clicked, setClick] = useState(false);
  //
  return (
    <mesh
      {...meshProps}
      ref={cubeRef}
      material={boxMaterial}
      onClick={() => setClick(!clicked)} // future possible event
    >
      <boxGeometry {...boxProps}/>
    </mesh>
  );
}

const CubeBackground = () => {
  const currentTheme: DefaultTheme = useSelector(
    (state: RootState) => state.theme.theme
  );
  const [degraded, degrade] = useState(false);
  const slabsPosition: number[] = [0.89, 0.67, 0.45, 0.23, 0.01, -0.21, -0.43, -0.65];
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 25 }}
      dpr={[1, 2]}
      shadows
      flat
    >
      <color attach="background" args={[currentTheme.data.background.primary[200]]} />
      <directionalLight color={0xffffff} position={[-2, 4, 2]} shadow-bias={0.005} intensity={0.9} castShadow />
      <ambientLight intensity={0.5} />
      <SoftShadows />
      <PresentationControls 
        snap 
        global
        zoom={0.8}
        rotation={[0.25, -Math.PI / 4, 0]}
        polar={[0, Math.PI / 4]}
        azimuth={[-Math.PI / 4, Math.PI / 4]}
      >
        {/*default position-y={-0.75} */}
        <group position-y={0.2} dispose={null}>
          <RoomBox
            meshProps={{
              scale: 2,
              position:[0, 0.05, -1],
              receiveShadow: true,
            }}
            boxProps={{
              args:[1, 1, 0.05],
            }}
            boxMaterial={new THREE.MeshPhongMaterial({
              color: currentTheme.data.color.cta[500],
              emissive: currentTheme.data.color.cta[800],
              side: THREE.FrontSide,
            })}
          />
          <RoomBox
            meshProps={{
              scale: 2,
              position:[-0.88, 0.05, 0],
              receiveShadow: true,
            }}
            boxProps={{
              args:[0.12, 1, 0.95],
            }}
            boxMaterial={new THREE.MeshPhongMaterial({
              color: currentTheme.data.background.primary[500],
              emissive: 0x000000,
            })}
          />
          {/*default position={[0.9, -0.929, 0]} rest x:0.21 */}
          {slabsPosition.map((pos) => (
              <RoomBox
                meshProps={{
                  scale: 2,
                  position:[pos, -0.929, 0],
                  receiveShadow: true,
                  castShadow: false,
                }}
                boxProps={{
                  args:[0.105, 0.02, 0.95],
                }}
                boxMaterial={new THREE.MeshPhysicalMaterial({
                  color: 0xf4e4dd,
                  emissive: 0x000000,
                  roughness: 0.8,
                })}
              />
            ))
          }
          <RoomBox
            meshProps={{
              scale: 2,
              position:[0, -1, -0.05],
              receiveShadow: true,
            }}
            boxProps={{
              args:[1, 0.05, 1],
            }}
            boxMaterial={new THREE.MeshPhysicalMaterial({
              color: 0xf4e4dd,
              emissive: 0x000000,
              roughness: 0.5,
            })}
          />
        </group>
      </PresentationControls>
      {/* <PresentationControls
          config={{ mass: 2, tension: 500 }}
          snap={{ mass: 4, tension: 1500 }}
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 1.4, Math.PI / 2]}>
          <RotatingCube rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} scale={0.003} />
      </PresentationControls> */}
      {/** PerfMon will detect performance issues */}
      <PerformanceMonitor onDecline={() => degrade(true)} />
    </Canvas>
  );
};

export default CubeBackground;
