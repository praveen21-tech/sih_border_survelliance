"use client";

import { useState } from "react";
import { Settings, Cpu, Shield, Volume2, Database, Sliders, CheckCircle2, Save, RefreshCw } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import GovFooter from "@/components/GovFooter";

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState("http://127.0.0.1:8000");
  const [wsUrl, setWsUrl] = useState("ws://127.0.0.1:8000");
  const [groqModel, setGroqModel] = useState("openai/gpt-oss-120b");
  const [reidThreshold, setReidThreshold] = useState(0.72);
  const [yoloConfidence, setYoloConfidence] = useState(0.45);
  const [droneConfidence, setDroneConfidence] = useState(0.42);
  const [whisperLang, setWhisperLang] = useState("auto");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        style={{
          height: "100dvh",
          width: "100dvw",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          title="System Settings & Intelligence Configuration"
          subtitle="Configure multi-camera Re-ID, LLM query engine, and acoustic sensor sentries"
          minimal
        />

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "12px 16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Header banner */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderTop: "3px solid var(--navy)",
              borderRadius: 6,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "var(--sh)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: "#EBF0FA",
                  border: "1px solid #B0BCCF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Settings size={18} style={{ color: "var(--navy)" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", margin: 0 }}>
                  Platform Configuration & Inference Thresholds
                </h2>
                <p style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2, margin: 0 }}>
                  Adjust real-time neural network detection, cross-camera gallery matching, and Groq LLM pipelines.
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                background: saved ? "#1A6B3C" : "var(--navy)",
                border: "none",
                borderRadius: 4,
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,32,96,0.2)",
                transition: "background 0.2s",
              }}
            >
              {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {saved ? "Configuration Saved!" : "Save Changes"}
            </button>
          </div>

          {/* Grid of config sections */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {/* Section 1: Vision & Re-ID Engine */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #B71C1C",
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F4F6FB",
                  borderBottom: "1px solid var(--border-lt)",
                  padding: "10px 14px",
                }}
              >
                <Shield size={15} style={{ color: "#B71C1C" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                  Vision & Multi-Camera Re-ID (Feature 13)
                </span>
              </div>

              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-2)", marginBottom: 4, fontWeight: 600 }}>
                    <span>Re-ID Feature Match Threshold</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--navy)", fontWeight: 700 }}>{reidThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.01"
                    value={reidThreshold}
                    onChange={(e) => setReidThreshold(parseFloat(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", accentColor: "var(--navy)" }}
                  />
                  <span style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                    Cosine similarity threshold for gallery identification across camera transitions
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-2)", marginBottom: 4, fontWeight: 600 }}>
                    <span>YOLO11 Detection Confidence</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#B71C1C", fontWeight: 700 }}>{yoloConfidence}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.80"
                    step="0.05"
                    value={yoloConfidence}
                    onChange={(e) => setYoloConfidence(parseFloat(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", accentColor: "#B71C1C" }}
                  />
                  <span style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                    Minimum confidence for person and vehicle bounding box extraction
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Audio Intelligence & Acoustic Sentry */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #C05000",
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F4F6FB",
                  borderBottom: "1px solid var(--border-lt)",
                  padding: "10px 14px",
                }}
              >
                <Volume2 size={15} style={{ color: "#C05000" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                  Audio & Drone Sentry (Features 17 & 18)
                </span>
              </div>

              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-2)", marginBottom: 4, fontWeight: 600 }}>
                    <span>Acoustic Rotor BPF Threat Threshold</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#C05000", fontWeight: 700 }}>{droneConfidence}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.80"
                    step="0.02"
                    value={droneConfidence}
                    onChange={(e) => setDroneConfidence(parseFloat(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", accentColor: "#C05000" }}
                  />
                  <span style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                    Trigger sentry alarm when harmonic rotor blade pass confidence exceeds limit
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 9.5, color: "var(--text-2)", display: "block", marginBottom: 4, fontWeight: 600 }}>
                    Whisper Multilingual Speech Engine Language
                  </label>
                  <select
                    value={whisperLang}
                    onChange={(e) => setWhisperLang(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#F4F6FB",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 9.5,
                      color: "var(--text)",
                      outline: "none",
                    }}
                  >
                    <option value="auto">Auto-Detect (22 Indian + Global Languages)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="ur">Urdu (اردو)</option>
                    <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                    <option value="bn">Bengali (বাংলা)</option>
                    <option value="en">English (India / Global)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: LLM & NL Surveillance Engine */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #003380",
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F4F6FB",
                  borderBottom: "1px solid var(--border-lt)",
                  padding: "10px 14px",
                }}
              >
                <Cpu size={15} style={{ color: "var(--navy)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                  Natural Language Query Engine (Feature 12)
                </span>
              </div>

              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 9.5, color: "var(--text-2)", display: "block", marginBottom: 4, fontWeight: 600 }}>
                    Groq LLM Reasoning Model
                  </label>
                  <select
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#F4F6FB",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 9.5,
                      color: "var(--text)",
                      outline: "none",
                    }}
                  >
                    <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Primary High-Accuracy Model)</option>
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Llama 3.3)</option>
                    <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Fast Mixture-of-Experts)</option>
                  </select>
                </div>

                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    background: "#F4F6FB",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid var(--border-lt)",
                    lineHeight: 1.45,
                  }}
                >
                  Hybrid architecture routes queries to SQLite Text-to-SQL synthesis and ChromaDB 512-d semantic retrieval before forensic summarization.
                </div>
              </div>
            </div>

            {/* Section 4: Backend API & Network Endpoints */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #1A6B3C",
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F4F6FB",
                  borderBottom: "1px solid var(--border-lt)",
                  padding: "10px 14px",
                }}
              >
                <Database size={15} style={{ color: "#1A6B3C" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                  Network & Database Connectivity
                </span>
              </div>

              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 9.5, color: "var(--text-2)", display: "block", marginBottom: 3, fontWeight: 600 }}>
                    FastAPI REST Endpoint
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#F4F6FB",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 9.5,
                      color: "var(--text)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 9.5, color: "var(--text-2)", display: "block", marginBottom: 3, fontWeight: 600 }}>
                    WebSocket Streaming Gateway
                  </label>
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#F4F6FB",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 9.5,
                      color: "var(--text)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Government Footer */}
        <GovFooter />
      </div>
    </>
  );
}
