"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

// No preloads of heavy unused GLTF models to keep initial load fast

interface GltfModelProps {
  url: string;
}

function GltfModel({ url }: GltfModelProps) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!scene) return;

    // Reset position, rotation, and scale before computing bounding box
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.scale.set(1, 1, 1);

    // Compute bounding box and center/scale GLTF scene
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      // Scale to fit nicely in our view
      const scale = 3.5 / maxDim;
      scene.scale.setScalar(scale);
      scene.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
    }

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, url]);

  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <group ref={modelRef}>
      <primitive object={scene} />
    </group>
  );
}

interface StlModelProps {
  url: string;
  color?: string;
  roughness?: number;
  metalness?: number;
}

function StlModel({
  url,
  color = "#d4af37",
  roughness = 0.15,
  metalness = 0.9,
}: StlModelProps) {
  const geometry = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!geometry) return;

    // Compute vertex normals for correct lighting calculations
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    
    // Center geometry to origin
    geometry.center();

    const box = geometry.boundingBox;
    if (box) {
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        // Scale to fit nicely in our view
        const scale = 3.5 / maxDim;
        if (meshRef.current) {
          meshRef.current.scale.setScalar(scale);
        }
      }
    }
  }, [geometry, url]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

interface ModelProps {
  url: string;
  color?: string;
  roughness?: number;
  metalness?: number;
}

function Model({ url, color, roughness, metalness }: ModelProps) {
  const isStl = url.toLowerCase().endsWith(".stl");
  if (isStl) {
    return (
      <StlModel
        url={url}
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    );
  }
  return <GltfModel url={url} />;
}

function Loader() {
  return (
    <Html center>
      <div className="loading-text">Loading 3D Model...</div>
    </Html>
  );
}

// WebGL Error Boundary to catch render failures and let the user recover
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WebGL Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            minHeight: "550px",
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "2rem",
            textAlign: "center",
            color: "#fff",
            backdropFilter: "blur(12px)",
          }}
        >
          <h3 style={{ marginBottom: "1rem", color: "#f87171", fontSize: "1.25rem" }}>
            WebGL Context Issue Detected
          </h3>
          <p style={{ fontSize: "0.9rem", color: "#a0a0a0", maxWidth: "350px", marginBottom: "1.5rem", lineHeight: "1.5" }}>
            The WebGL rendering context was lost or could not be initialized. This is common during code edits/hot-reloading in development.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#6d28d9",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
              boxShadow: "0 4px 15px rgba(109, 40, 217, 0.4)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            Reset Renderer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Context cleaner component to forcefully release WebGL resources on component unmount (e.g. during Next.js Hot Reloading)
function WebGLContextCleaner() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    return () => {
      // Clean up Three.js renderer resources
      gl.dispose();

      // Force WebGL context destruction to free up browser's active context slots immediately
      const ctx = gl.getContext();
      if (ctx && typeof ctx.getExtension === "function") {
        const extension = ctx.getExtension("WEBGL_lose_context");
        if (extension) {
          extension.loseContext();
        }
      }
    };
  }, [gl]);

  return null;
}

export default function ModelViewer({
  modelName,
  color,
  roughness,
  metalness,
}: {
  modelName: string;
  color?: string;
  roughness?: number;
  metalness?: number;
}) {
  const modelUrl = modelName.startsWith("/") ? modelName : `/${modelName}`;

  return (
    <div className="model-viewer-wrapper">
      <WebGLErrorBoundary>
        <Canvas
          shadows
          gl={{
            antialias: true,
            alpha: true,
          }}
          camera={{
            position: [0, 0, 5],
            fov: 50,
          }}
        >
          {/* Cleans up the WebGL Context on unmount to prevent leaks during development / hot-reloads */}
          <WebGLContextCleaner />

          {/* Lighting */}
          <ambientLight intensity={1.5} />

          <directionalLight
            position={[5, 8, 5]}
            intensity={3}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />

          <directionalLight
            position={[-5, 5, -5]}
            intensity={1.5}
          />

          <spotLight
            position={[0, 10, 2]}
            intensity={2}
            angle={0.4}
            penumbra={1}
            castShadow
          />

          {/* Jewelry reflections environment */}
          <Environment preset="studio" />

          <Suspense fallback={<Loader />}>
            <Model
              url={modelUrl}
              color={color}
              roughness={roughness}
              metalness={metalness}
            />
          </Suspense>

          <ContactShadows
            position={[0, -1.8, 0]}
            opacity={0.6}
            scale={10}
            blur={2.4}
            far={5}
          />

          {/* Orbit Controls for 3D navigation */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            minDistance={1.5}
            maxDistance={8}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}