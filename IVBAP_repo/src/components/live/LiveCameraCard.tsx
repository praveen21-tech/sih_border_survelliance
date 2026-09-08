"use client";

import { motion } from "framer-motion";
import { Camera, MoonStar } from "lucide-react";
import type { LiveCam, LiveCamOverlayBox } from "@/lib/liveData";

// ── Single detection box (positioned in %) ───────────────────────────────────
function Box({ b }: { b: LiveCamOverlayBox }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${b.x}%`,
        top: `${b.y}%`,
        width: `${b.w}%`,
        height: `${b.h}%`,
        border: `1.5px solid ${b.color}`,
        borderRadius: 3,
        boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.4), 0 0 5px ${b.color}44`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -13,
          left: -1.5,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: b.color,
          borderRadius: 2,
          padding: "0 4px",
          height: 13,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 7.5, fontWeight: 700, color: "#001a00", letterSpacing: "0.02em", lineHeight: 1 }}>
          {b.label}
        </span>
        {b.sub && (
          <span style={{ fontSize: 6.5, fontWeight: 600, color: "rgba(0,26,0,0.7)", lineHeight: 1 }}>
            · {b.sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Camera header strip ───────────────────────────────────────────────────────
function CamHeader({ cam }: { cam: LiveCam }) {
  return (
    <div
      style={{
        padding: "7px 10px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <div
          style={{
            width: 22, height: 22, borderRadius: 5, flexShrink: 0,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Camera size={10} style={{ color: "#3B82F6" }} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-1)", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {cam.name}
          </div>
          <div style={{ fontSize: 8, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 }}>
            {cam.sector}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "2px 6px", borderRadius: 3,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.28)",
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 4px #22C55E", flexShrink: 0 }}
          />
          <span style={{ fontSize: 7.5, fontWeight: 700, color: "#22C55E", letterSpacing: "0.06em" }}>LIVE</span>
        </div>
        <span style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {cam.timestamp}
        </span>
      </div>
    </div>
  );
}

// ── Virtual fence overlay (Camera 4) ──────────────────────────────────────────
function FenceOverlay() {
  // Red restricted-area polygon + human crossing line
  const polygon = "14,22 40,14 66,24 58,64 30,72 12,52";
  return (
    <>
      {/* Restricted polygon */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0, width: "100%", height: "100%",
          pointerEvents: "none",
        }}
      >
        <polygon
          points={polygon}
          fill="rgba(239,68,68,0.10)"
          stroke="rgba(239,68,68,0.7)"
          strokeWidth="0.6"
          strokeDasharray="3 2"
        />
      </svg>
      {/* Crossing line */}
      <div
        style={{
          position: "absolute",
          left: "34%", top: "18%",
          width: "2px", height: "70%",
          background: "rgba(239,68,68,0.85)",
          transform: "rotate(18deg)",
          transformOrigin: "top center",
          boxShadow: "0 0 4px rgba(239,68,68,0.5)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ── Flag / alert banner (bottom) ──────────────────────────────────────────────
function FlagBanner({ cam }: { cam: LiveCam }) {
  if (!cam.flagText) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 8, right: 8, bottom: 8,
        zIndex: 5,
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 8px",
        borderRadius: 5,
        background: `${cam.flagColor}1f`,
        border: `1px solid ${cam.flagColor}55`,
        backdropFilter: "blur(6px)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: cam.flagColor, boxShadow: `0 0 5px ${cam.flagColor}`, flexShrink: 0 }}
      />
      <span style={{ fontSize: 9, fontWeight: 700, color: cam.flagColor, letterSpacing: "0.04em" }}>
        {cam.flagText}
      </span>
    </div>
  );
}

// ── Camera card ───────────────────────────────────────────────────────────────
export default function LiveCameraCard({ cam, index }: { cam: LiveCam; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.08 * index }}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        flex: "1 1 0",
      }}
    >
      <CamHeader cam={cam} />

      {/* Feed */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          aspectRatio: "16 / 9",
          background: "#040a12",
          overflow: "hidden",
        }}
      >
        <img
          src={cam.image}
          alt={cam.name}
          loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: cam.night ? "brightness(0.65) saturate(0.85)" : "none" }}
        />

        {/* Night indicator */}
        {cam.night && (
          <div
            style={{
              position: "absolute", top: 8, left: 8, zIndex: 4,
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 6px", borderRadius: 3,
              background: "rgba(59,130,246,0.18)",
              border: "1px solid rgba(59,130,246,0.35)",
            }}
          >
            <MoonStar size={9} style={{ color: "#60A5FA" }} strokeWidth={2} />
            <span style={{ fontSize: 7.5, fontWeight: 700, color: "#60A5FA", letterSpacing: "0.05em" }}>
              NIGHT MODE
            </span>
          </div>
        )}

        {/* AI overlays */}
        {cam.boxes.map((b, i) => (
          <Box key={i} b={b} />
        ))}

        {cam.id === "cam4" && <FenceOverlay />}

        <FlagBanner cam={cam} />

        {/* Bottom-left dark gradient for legibility */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(3,8,14,0.55) 0%, transparent 30%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </motion.div>
  );
}
