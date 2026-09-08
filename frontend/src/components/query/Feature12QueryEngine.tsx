"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Video,
  Bot,
  Database,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Send,
  Layers,
  ChevronRight,
  Terminal,
  Activity,
  Radio,
  Shield,
  Car,
  Fence,
  UserCheck,
  Volume2,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/detectionStream";

interface Feature12QueryEngineProps {
  initialMode?: "surveillance" | "video";
  compact?: boolean;
  defaultQuery?: string;
  title?: string;
}

const CAMERAS = [
  { id: "all", label: "All Live Feeds", icon: Radio, queryPrefix: "Summarize live status across all cameras: " },
  { id: "cam-01", label: "CAM-01 (ByteTrack)", icon: Shield, queryPrefix: "CAM-01: What persons are being tracked right now? " },
  { id: "cam-02", label: "CAM-02 (ANPR Plates)", icon: Car, queryPrefix: "CAM-02: List all vehicles and license plates recognized: " },
  { id: "cam-03", label: "CAM-03 (Night Enhancement)", icon: Activity, queryPrefix: "CAM-03: What is the current perimeter visibility state? " },
  { id: "cam-04", label: "CAM-04 (Virtual Fence)", icon: Fence, queryPrefix: "CAM-04: Are there any approaching or active intrusions across the fence? " },
  { id: "cam-05", label: "CAM-05 (Surveillance)", icon: Layers, queryPrefix: "CAM-05: Show current crowd and object count: " },
  { id: "cam-06", label: "CAM-06 (FaceNet Access)", icon: UserCheck, queryPrefix: "CAM-06: Who is at the checkpoint? Any unauthorized intruders? " },
];

export default function Feature12QueryEngine({
  initialMode = "surveillance",
  compact = false,
  defaultQuery = "",
  title = "AI Intelligence Query Engine (Feature 12)",
}: Feature12QueryEngineProps) {
  const [mode, setMode] = useState<"surveillance" | "video">(initialMode);
  const [query, setQuery] = useState(defaultQuery);
  const [selectedCam, setSelectedCam] = useState("all");
  const [videoFile, setVideoFile] = useState("cam2.mp4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<any | null>(null);

  // Poll live telemetry
  useEffect(() => {
    let mounted = true;
    const fetchLive = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/query/live`);
        if (res.ok && mounted) {
          const data = await res.json();
          setLiveTelemetry(data);
        }
      } catch (e) {}
    };
    fetchLive();
    const interval = setInterval(fetchLive, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const sampleSurveillanceQueries = [
    "Find unauthorized intrusions across Sector 4 in the last 24 hours",
    "Show all vehicle detections and number plate reads",
    "List movement trajectory for suspicious person around perimeter fence",
    "Summarize all high-severity threats and fence violations",
  ];

  const sampleVideoQuestions = [
    "What vehicles were detected in this video feed?",
    "Were any license plates recognized?",
    "Did anyone approach or cross the virtual fence line?",
    "Give me an executive forensic breakdown of visual activity in this footage.",
  ];

  const handleAsk = async (queryText?: string) => {
    const textToSubmit = queryText || query;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "surveillance") {
        const res = await fetch(`${BACKEND_URL}/api/v1/query/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textToSubmit.trim() }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Query execution failed");
        }

        const data = await res.json();
        setResult({ type: "surveillance", ...data });
      } else {
        const res = await fetch(`${BACKEND_URL}/api/v1/video/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_filename: videoFile,
            question: textToSubmit.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Video analysis query failed");
        }

        const data = await res.json();
        setResult({ type: "video", ...data });
      }
    } catch (err: any) {
      setError(err.message || "Failed to reach AI Query Engine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        boxShadow: "var(--sh)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "#F4F6FB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "var(--r)",
              background: "var(--navy-lt)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={14} style={{ color: "var(--navy)" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.02em" }}>
              {title}
            </div>
            <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
              Multi-Source RAG · Text-to-SQL · Visual Forensics · Cross-Camera Intelligence
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div
          style={{
            display: "flex",
            background: "#FFFFFF",
            padding: 3,
            borderRadius: "var(--r)",
            border: "1px solid var(--border)",
            gap: 4,
          }}
        >
          <button
            onClick={() => {
              setMode("surveillance");
              setResult(null);
            }}
            style={{
              padding: "4px 10px",
              fontSize: 9.5,
              fontWeight: 700,
              borderRadius: "var(--r)",
              border: "1px solid",
              borderColor: mode === "surveillance" ? "var(--navy)" : "transparent",
              cursor: "pointer",
              background: mode === "surveillance" ? "var(--navy-lt)" : "transparent",
              color: mode === "surveillance" ? "var(--navy)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Database size={11} /> Multi-Camera RAG
          </button>
          <button
            onClick={() => {
              setMode("video");
              setResult(null);
            }}
            style={{
              padding: "4px 10px",
              fontSize: 9.5,
              fontWeight: 700,
              borderRadius: "var(--r)",
              border: "1px solid",
              borderColor: mode === "video" ? "var(--navy)" : "transparent",
              cursor: "pointer",
              background: mode === "video" ? "var(--navy-lt)" : "transparent",
              color: mode === "video" ? "var(--navy)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Video size={11} /> Video Forensics Q&A
          </button>
        </div>
      </div>

      {/* Camera Target Selector (Surveillance Mode) */}
      {mode === "surveillance" && (
        <div
          style={{
            padding: "6px 12px",
            background: "#F4F6FB",
            borderBottom: "1px solid var(--border-lt)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Target Feed:
          </span>
          {CAMERAS.map((c) => {
            const active = selectedCam === c.id;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCam(c.id);
                  if (c.id !== "all") {
                    setQuery(c.queryPrefix);
                  } else {
                    setQuery("What is happening across all live cameras right now?");
                  }
                }}
                style={{
                  padding: "3px 9px",
                  borderRadius: "var(--r)",
                  fontSize: 9,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  border: `1px solid ${active ? "var(--navy)" : "var(--border)"}`,
                  background: active ? "var(--navy)" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "var(--text-2)",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={11} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Query Bar */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {mode === "video" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.04em" }}>
              TARGET VIDEO:
            </span>
            <select
              value={videoFile}
              onChange={(e) => setVideoFile(e.target.value)}
              style={{
                padding: "4px 10px",
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                color: "var(--text)",
                fontSize: 10,
                fontWeight: 600,
                outline: "none",
              }}
            >
              <option value="cam1.mp4">CAM-01 (Human ByteTrack Footage)</option>
              <option value="cam2.mp4">CAM-02 (Vehicle ANPR & Highway Footage)</option>
              <option value="cam4.mp4">CAM-04 (Virtual Fence Perimeter Footage)</option>
              <option value="cam5.mp4">CAM-05 (Sector Surveillance Footage)</option>
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              placeholder={
                mode === "surveillance"
                  ? "Ask any question about any camera in real-time (e.g. 'What is happening on CAM-04 right now?', 'Who is on CAM-06?')..."
                  : "Ask a question about this video (e.g. 'Were any red trucks or ANPR plates observed?')..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                color: "var(--text)",
                fontSize: 11,
                outline: "none",
              }}
            />
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          </div>
          <button
            onClick={() => handleAsk()}
            disabled={loading || !query.trim()}
            style={{
              padding: "0 18px",
              background: "var(--navy)",
              border: "none",
              borderRadius: "var(--r)",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 700,
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: loading || !query.trim() ? 0.6 : 1,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            {loading ? <Sparkles size={12} className="animate-spin" /> : <Send size={12} />}
            {loading ? "Analyzing..." : "Ask AI"}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
            SUGGESTED:
          </span>
          {(mode === "surveillance" ? sampleSurveillanceQueries : sampleVideoQuestions).map(
            (sample, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sample);
                  handleAsk(sample);
                }}
                style={{
                  padding: "3px 8px",
                  background: "#F4F6FB",
                  border: "1px solid var(--border-lt)",
                  borderRadius: "var(--r)",
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: "var(--navy)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--navy-lt)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F4F6FB";
                }}
              >
                {sample}
              </button>
            )
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--crit-lt)",
              border: "1px solid var(--crit-bd)",
              borderRadius: "var(--r)",
              color: "var(--crit)",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Response Box */}
        {result && (
          <div
            style={{
              marginTop: 6,
              padding: "14px",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderLeft: "4px solid var(--navy)",
              borderRadius: "var(--r)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "var(--sh)",
            }}
          >
            {/* Header info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Bot size={15} style={{ color: "var(--navy)" }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.04em" }}>
                  AI SURVEILLANCE INTELLIGENCE BRIEF
                </span>
                {result.intent && (
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: "var(--r)",
                      background: "var(--navy-lt)",
                      color: "var(--navy)",
                      fontSize: 8.5,
                      fontWeight: 700,
                      fontFamily: "var(--mono)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    INTENT: {result.intent}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 8.5, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                Engine: {result.llm_provider || "Unified RAG Engine"}
              </span>
            </div>

            {/* Response markdown text */}
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text)",
                lineHeight: 1.6,
                background: "#F4F6FB",
                padding: "12px 14px",
                borderRadius: "var(--r)",
                border: "1px solid var(--border-lt)",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {result.response || result.ai_answer || "No text synthesis generated."}
            </div>

            {/* Visual Telemetry / SQL Breakdown */}
            {result.visual_telemetry && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: "4px 9px",
                    borderRadius: "var(--r)",
                    background: "var(--green-lt)",
                    border: "1px solid var(--low-bd)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--green)",
                  }}
                >
                  Frames Analyzed: {result.visual_telemetry.total_frames_analyzed ?? 0}
                </div>
                <div
                  style={{
                    padding: "4px 9px",
                    borderRadius: "var(--r)",
                    background: "var(--navy-lt)",
                    border: "1px solid var(--border)",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--navy)",
                  }}
                >
                  Detections: {result.visual_telemetry.total_detections ?? 0}
                </div>
                {result.visual_telemetry.plates_found?.length > 0 && (
                  <div
                    style={{
                      padding: "4px 9px",
                      borderRadius: "var(--r)",
                      background: "var(--high-lt)",
                      border: "1px solid var(--high-bd)",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--high)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    Plates: {result.visual_telemetry.plates_found.join(", ")}
                  </div>
                )}
              </div>
            )}

            {result.generated_sql && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 8.5,
                  color: "var(--text-muted)",
                  fontFamily: "var(--mono)",
                  background: "#F4F6FB",
                  padding: "6px 10px",
                  borderRadius: "var(--r)",
                  border: "1px solid var(--border-lt)",
                }}
              >
                <Terminal size={10} style={{ color: "var(--navy)" }} />
                <span>SQL Executed: {result.generated_sql}</span>
                <span style={{ marginLeft: "auto", color: "var(--navy)", fontWeight: 700 }}>
                  ({result.sql_results_count ?? 0} hits)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
