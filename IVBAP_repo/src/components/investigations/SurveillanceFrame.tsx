"use client";

import type { SceneVariant } from "@/lib/investigationData";

// A realistic-looking surveillance still built from layered gradients.
// No icons, no illustrations — reads as actual CCTV footage.

interface SurveillanceFrameProps {
  variant: SceneVariant;
  camera: string;
  time: string;
  compact?: boolean;
}

const PALETTES: Record<SceneVariant, { sky: string[]; ground: string[]; detail?: "road" | "fence" | "flood" }> = {
  checkpoint: {
    sky: ["#1c3042", "#132029"],
    ground: ["#101c26", "#0a121a"],
    detail: "road",
  },
  road: {
    sky: ["#17293a", "#0f1b25"],
    ground: ["#0d1822", "#080f16"],
    detail: "road",
  },
  tower: {
    sky: ["#223547", "#16232d"],
    ground: ["#141f29", "#0b131b"],
  },
  fence: {
    sky: ["#1a2c3c", "#111e28"],
    ground: ["#0f1a23", "#091017"],
    detail: "fence",
  },
  cargo: {
    sky: ["#203243", "#131e29"],
    ground: ["#121d26", "#0b131a"],
    detail: "flood",
  },
  night: {
    sky: ["#101a13", "#0a120c"],
    ground: ["#0c1510", "#070d09"],
    detail: "road",
  },
};

export default function SurveillanceFrame({ variant, camera, time, compact = false }: SurveillanceFrameProps) {
  const p = PALETTES[variant];
  const isNight = variant === "night";
  const tint = isNight ? "rgba(150,178,160,0.12)" : "rgba(160,190,220,0.10)";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 58%, ${p.ground[0]} 58%, ${p.ground[1]} 100%)`,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      {/* Horizon line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "58%",
          height: 1,
          background: "rgba(255,255,255,0.06)",
        }}
      />

      {/* Scene detail */}
      {p.detail === "road" && (
        <div
          style={{
            position: "absolute",
            left: "24%",
            right: "30%",
            bottom: 0,
            height: "42%",
            background: "linear-gradient(90deg, transparent 0%, rgba(10,14,18,0.55) 24%, rgba(10,14,18,0.55) 76%, transparent 100%)",
          }}
        />
      )}
      {p.detail === "fence" && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "62%",
              height: 46,
              background: "repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 3px, transparent 3px 18px)",
              opacity: 0.65,
            }}
          />
          <div style={{ position: "absolute", left: 0, right: 0, top: "68%", height: 1, background: "rgba(255,255,255,0.14)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "74%", height: 1, background: "rgba(255,255,255,0.10)" }} />
        </>
      )}
      {p.detail === "flood" && (
        <div
          style={{
            position: "absolute",
            left: "30%",
            right: "30%",
            top: 0,
            bottom: 0,
            background: "radial-gradient(120% 90% at 50% 20%, rgba(190,205,160,0.14) 0%, transparent 55%)",
          }}
        />
      )}

      {/* Moving blob (subject) */}
      <div
        style={{
          position: "absolute",
          left: compact ? "46%" : "42%",
          top: compact ? "44%" : "40%",
          width: compact ? 18 : 26,
          height: compact ? 34 : 50,
          borderRadius: "50% 50% 18% 18%",
          background: `radial-gradient(circle at 50% 30%, ${tint}, transparent 70%)`,
          opacity: 0.55,
        }}
      />

      {/* Scanlines + noise */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px)",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 100% at 50% 40%, transparent 60%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* OSD — top-left camera tag */}
      <div
        style={{
          position: "absolute",
          top: compact ? 4 : 6,
          left: compact ? 5 : 8,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 5px",
          background: "rgba(0,0,0,0.42)",
          borderRadius: 2,
          fontSize: compact ? 6.5 : 8,
          letterSpacing: "0.05em",
          color: "#B8C8D8",
        }}
      >
        {camera}
        {!compact && <span style={{ opacity: 0.5 }}>· REC</span>}
      </div>

      {/* OSD — timestamp bottom */}
      <div
        style={{
          position: "absolute",
          bottom: compact ? 3 : 6,
          left: compact ? 5 : 8,
          right: compact ? 5 : 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: compact ? 6.5 : 8,
          letterSpacing: "0.04em",
          color: isNight ? "#A8E0B0" : "#9FD0A0",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        <span>{time}</span>
        {!compact && <span style={{ opacity: 0.6 }}>2560×1440 · 25 fps</span>}
      </div>
    </div>
  );
}