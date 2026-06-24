"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import the ModelViewer with no SSR to avoid hydration mismatch with Three.js
const ModelViewer = dynamic(() => import("../components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="loader-container">
      <div className="loader"></div>
    </div>
  ),
});

const MODELS = [
  { id: "ring_for_perfume.glb", name: "Perfume Ring (GLB)", type: "glb" },
  { id: "kosue4554-ring-4772.glb", name: "Diamond Ring (GLB)", type: "glb" },
  { id: "QIEZPD0257-FINAL.stl", name: "Band Style A (STL)", type: "stl" },
  { id: "QIEZPE0257-FINAL.stl", name: "Band Style B (STL)", type: "stl" },
  { id: "QIEZPR0257 - US-7-FINAL.stl", name: "Band Style C (STL)", type: "stl" },
];

const COLORS = [
  { hex: "#d4af37", name: "Yellow Gold" },
  { hex: "#e5c2c2", name: "Rose Gold" },
  { hex: "#e3e4e5", name: "Platinum Silver" },
  { hex: "#2c3e50", name: "Titanium Black" },
];

const FINISHES = [
  { id: "polished", name: "Polished", roughness: 0.1, metalness: 0.95 },
  { id: "brushed", name: "Brushed", roughness: 0.3, metalness: 0.8 },
  { id: "matte", name: "Matte", roughness: 0.6, metalness: 0.2 },
];

export default function Home() {
  const [activeModel, setActiveModel] = useState("ring_for_perfume.glb");
  const [mounted, setMounted] = useState(false);
  const [color, setColor] = useState("#d4af37");
  const [finish, setFinish] = useState("polished");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentModel = MODELS.find((m) => m.id === activeModel) || MODELS[0];
  const isStl = currentModel.type === "stl";
  const currentFinishObj = FINISHES.find((f) => f.id === finish) || FINISHES[0];

  return (
    <main className="page-container">
      {/* Decorative Glow */}
      <div className="accent-glow" style={{ top: '10%', left: '10%' }}></div>
      <div className="accent-glow" style={{ bottom: '10%', right: '10%', background: 'rgba(109, 40, 217, 0.3)' }}></div>

      <section className="content-section">
        <h1 className="title-main">
          Next-Gen <br />
          <span className="text-gradient">3D Viewer</span>
        </h1>
        <p className="subtitle">
          Explore stunning, high-fidelity 3D assets seamlessly. Switch between high-detail GLB models or customize raw STL CAD meshes.
        </p>

        {/* Model Selection List */}
        <div className="section-block">
          <h3 className="section-title">Select 3D Model</h3>
          <div className="model-selector-grid">
            {MODELS.map((model) => (
              <button
                key={model.id}
                className={`model-btn ${activeModel === model.id ? "active" : ""}`}
                onClick={() => setActiveModel(model.id)}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Controls for STL Models */}
        {isStl ? (
          <div className="customizer-panel glass-panel">
            <h3 className="customizer-title">Customize Material (STL Only)</h3>
            
            <div className="control-group">
              <span className="control-label">Material Finish</span>
              <div className="finish-buttons">
                {FINISHES.map((f) => (
                  <button
                    key={f.id}
                    className={`finish-btn ${finish === f.id ? "active" : ""}`}
                    onClick={() => setFinish(f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <span className="control-label">Metal Color</span>
              <div className="color-circles">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`color-btn ${color === c.hex ? "active" : ""}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="customizer-panel glass-panel disabled">
            <h3 className="customizer-title">Material Settings</h3>
            <p className="customizer-desc">
              Original embedded GLTF textures and materials are active for this model.
            </p>
          </div>
        )}
      </section>

      <section className="canvas-section">
        <div className="canvas-container glass-panel">
          <ModelViewer
            modelName={activeModel}
            color={color}
            roughness={currentFinishObj.roughness}
            metalness={currentFinishObj.metalness}
          />
        </div>
      </section>
    </main>
  );
}
