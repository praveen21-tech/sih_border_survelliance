"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Activity,
  Cpu,
  FileText,
  Maximize2,
  Minimize2,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  VideoOff,
  X,
} from "lucide-react";
import type { CameraFeed } from "@/lib/liveMonitoringData";
import {
  useDetectionStream,
  BACKEND_URL,
  type StreamObject,
  type DetectionsFrame,
  type FencePerson,
  type FenceEvent,
  type FencePoint,
} from "@/lib/detectionStream";

interface CameraFeedCardProps {
  feed: CameraFeed;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

const VEHICLE_CLASSES = new Set(["car", "truck", "bus", "motorcycle"]);

const FENCE_STATE_COLOR: Record<FencePerson["state"], string> = {
  normal: "#22C55E",
  approaching: "#F59E0B",
  intrusion: "#EF4444",
};

const FENCE_SEVERITY_COLOR: Record<FenceEvent["severity"], string> = {
  warning: "#F59E0B",
  critical: "#EF4444",
  resolved: "#22C55E",
};

function FencePersonBox({ p }: { p: FencePerson }) {
  const color = FENCE_STATE_COLOR[p.state];
  const [x, y, w, h] = p.bbox;
  return (
    <div
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        border: `1.5px solid ${color}`,
        borderRadius: 1,
        pointerEvents: "none",
        boxShadow: p.state === "intrusion" ? `0 0 8px ${color}` : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -14,
          left: 0,
          padding: "1px 4px",
          background: "rgba(0,0,0,0.7)",
          borderRadius: 2,
          fontSize: 7,
          fontWeight: 700,
          color,
          whiteSpace: "nowrap",
          letterSpacing: "0.04em",
        }}
      >
        {p.state === "intrusion" ? "INTRUDER" : `ID: ${p.track_id}`}
      </div>
    </div>
  );
}

function FenceOverlay({ points, pending }: { points: FencePoint[]; pending?: boolean }) {
  if (points.length < 2) return null;
  const pts = points.map((p) => `${p[0]},${p[1]}`).join(" ");
  const closed = points.length >= 3;
  const stroke = pending ? "#22C55E" : "#EF4444";
  const fill = pending ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.14)";
  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {closed && (
        <polygon
          points={pts}
          fill={fill}
          stroke={stroke}
          strokeWidth={0.004}
          strokeDasharray="0.012 0.01"
        />
      )}
      {!closed && (
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth={0.004} strokeDasharray="0.01 0.008" />
      )}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={0.011}
          fill={stroke}
          stroke="#000"
          strokeWidth={0.002}
        />
      ))}
    </svg>
  );
}

function LiveDetectionBox({ obj, isPersonCam }: { obj: StreamObject; isPersonCam: boolean }) {
  const [x, y, w, h] = obj.bbox;
  const isPlate = obj.cls === "plate";

  let color = "#3B82F6";
  if (isPersonCam) color = "#22C55E";
  else if (isPlate) color = "#FACC15";

  const label = isPersonCam ? `Person #${obj.id}` : obj.label;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        border: `1.5px solid ${color}`,
        borderRadius: 1,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -14,
          left: 0,
          padding: "1px 4px",
          background: "rgba(0,0,0,0.65)",
          borderRadius: 2,
          fontSize: 7,
          fontWeight: 600,
          color,
          fontFamily: isPlate ? "monospace" : "inherit",
          letterSpacing: isPlate ? "0.06em" : "0",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DetectionAlertPanel({
  feed,
  liveFrame,
  isPersonCam,
  isStreamCam,
}: {
  feed: CameraFeed;
  liveFrame: DetectionsFrame | null;
  isPersonCam: boolean;
  isStreamCam: boolean;
}) {
  const objs = liveFrame?.objects ?? [];
  const list = isPersonCam
    ? objs.filter((o) => o.cls === "person")
    : objs.filter((o) => VEHICLE_CLASSES.has(o.cls) || o.cls === "plate");
  const plates = objs.filter((o) => o.cls === "plate");

  const alerts = objs
    .filter((o) => o.confidence >= 0.7)
    .slice(0, 5)
    .map((o) => {
      if (o.cls === "plate") return `Plate read ${o.label}`;
      if (o.cls === "person") return `Human tracked #${o.id}`;
      return `${o.label} tracked #${o.id}`;
    });

  const clock = liveFrame
    ? new Date(liveFrame.ts).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--";

  const accent = isPersonCam ? "#22C55E" : "#3B82F6";

  return (
    <div
      style={{
        width: 190,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: liveFrame ? "#EAB308" : "#5B7492",
            animation: liveFrame ? "pulse 1.4s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.08em" }}>
          ALERT & ANALYTICS
        </span>
      </div>

      {!isStreamCam ? (
        <div style={{ padding: "12px 12px", fontSize: 8, color: "var(--text-3)", lineHeight: 1.6 }}>
          No AI analytics configured for this camera. Only the raw video feed is shown.
        </div>
      ) : !liveFrame ? (
        <div style={{ padding: "12px 12px", fontSize: 8, lineHeight: 1.6, color: "#F87171" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <Cpu size={9} />
            <span style={{ fontWeight: 600 }}>AI ANALYTICS OFFLINE</span>
          </div>
          Waiting for the detection service… start <span style={{ fontFamily: "monospace" }}>run-backend.ps1</span> then refresh.
        </div>
      ) : (
        <>
          {/* Primary count */}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1, fontFamily: "monospace" }}>
              {isPersonCam ? liveFrame.counts.humans ?? 0 : liveFrame.counts.vehicles ?? 0}
            </div>
            <div style={{ fontSize: 8.5, color: "var(--text-2)", lineHeight: 1.4 }}>
              {isPersonCam ? "Humans Detected" : "Vehicles Detected"}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 7.5, color: "var(--text-3)", fontFamily: "monospace" }}>
              {clock}
            </div>
          </div>

          {/* Status chips */}
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            {isPersonCam ? (
              <div
                style={{
                  padding: "3px 8px",
                  borderRadius: 3,
                  fontSize: 7.5,
                  fontWeight: 600,
                  color: "#22C55E",
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  alignSelf: "flex-start",
                }}
              >
                <Activity size={8} /> Tracking Active
              </div>
            ) : (
              <div
                style={{
                  padding: "3px 8px",
                  borderRadius: 3,
                  fontSize: 7.5,
                  fontWeight: 600,
                  color: "#3B82F6",
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  alignSelf: "flex-start",
                }}
              >
                <FileText size={8} /> ANPR Active
              </div>
            )}
            {!isPersonCam && plates.length > 0 && (
              <div
                style={{
                  fontSize: 7.5,
                  color: "#FACC15",
                  fontFamily: "monospace",
                  letterSpacing: "0.04em",
                }}
              >
                Plate: {plates[0].label}
              </div>
            )}
          </div>

          {/* Scrollable alert feed + tracked objects */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 12px 12px" }}>
            <div
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: "var(--text-3)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                margin: "2px 0 6px",
              }}
            >
              Alert & Message Feed
            </div>
            {alerts.length === 0 ? (
              <div
                style={{
                  padding: "6px 8px",
                  fontSize: 8,
                  color: "var(--text-3)",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  marginBottom: 10,
                }}
              >
                No high-confidence alerts on this frame.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {alerts.map((msg, i) => (
                  <div
                    key={`${msg}-${liveFrame.seq}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      padding: "4px 7px",
                      background: "rgba(234,179,8,0.06)",
                      border: "1px solid rgba(234,179,8,0.25)",
                      borderRadius: 4,
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 4px",
                        fontSize: 6.5,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        color: "#FACC15",
                        background: "rgba(250,204,21,0.12)",
                        borderRadius: 2,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      NEW
                    </span>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", lineHeight: 1.35 }}>
                      {msg}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: "var(--text-3)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                margin: "0 0 6px",
              }}
            >
              Tracked Objects
            </div>
            {list.length === 0 ? (
              <div style={{ fontSize: 8, color: "var(--text-3)" }}>None detected on this frame.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {list.slice(0, 12).map((o) => (
                  <div
                    key={`${o.cls}-${o.id}-${o.bbox.join(",")}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 7px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: isPersonCam
                          ? "#22C55E"
                          : o.cls === "plate"
                          ? "#FACC15"
                          : "#3B82F6",
                        fontFamily: o.cls === "plate" ? "monospace" : "inherit",
                        letterSpacing: o.cls === "plate" ? "0.04em" : "0",
                      }}
                    >
                      {isPersonCam ? `Person #${o.id}` : o.cls === "plate" ? o.label : `${o.label} #${o.id}`}
                    </span>
                    <span style={{ fontSize: 7.5, color: "var(--text-3)", fontFamily: "monospace" }}>
                      {o.confidence > 0 ? `${(o.confidence * 100).toFixed(0)}%` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FenceAlertPanel({
  feed,
  liveFrame,
  fence,
  timeline,
  drawFence,
  drawCount,
  onToggleDraw,
  onSetFence,
  onClearFence,
}: {
  feed: CameraFeed;
  liveFrame: DetectionsFrame | null;
  fence: FencePoint[];
  timeline: FenceEvent[];
  drawFence: boolean;
  drawCount: number;
  onToggleDraw: () => void;
  onSetFence: () => void;
  onClearFence: () => void;
}) {
  const armed = fence.length >= 3;
  const counts = liveFrame?.counts;
  const intrusionCount = counts ? (counts.intrusion ?? 0) : 0;
  const approachingCount = counts ? (counts.approaching ?? 0) : 0;
  const personCount = counts ? (counts.persons ?? 0) : 0;

  const clock = liveFrame
    ? new Date(liveFrame.ts).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--";

  return (
    <div
      style={{
        width: 210,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: armed ? "#EF4444" : "#EAB308",
            animation: armed && intrusionCount > 0 ? "pulse 1s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.08em" }}>
          VIRTUAL FENCE
        </span>
        <span style={{ marginLeft: "auto", fontSize: 7.5, color: "var(--text-3)", fontFamily: "monospace" }}>
          {clock}
        </span>
      </div>

      {/* Arm status */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 5 }}>
        {armed ? (
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 3,
              fontSize: 7.5,
              fontWeight: 700,
              color: "#EF4444",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              alignSelf: "flex-start",
              letterSpacing: "0.05em",
            }}
          >
            <ShieldCheck size={8} /> ARMED · {fence.length} VERTICES
          </div>
        ) : (
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 3,
              fontSize: 7.5,
              fontWeight: 700,
              color: "#EAB308",
              background: "rgba(234,179,8,0.1)",
              border: "1px solid rgba(234,179,8,0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              alignSelf: "flex-start",
              letterSpacing: "0.05em",
            }}
          >
            <ShieldAlert size={8} /> DISARMED — DRAW ZONE
          </div>
        )}

        {/* Counts */}
        <div style={{ display: "flex", gap: 5 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "5px 0", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#22C55E", fontFamily: "monospace", lineHeight: 1 }}>{personCount}</div>
            <div style={{ fontSize: 6.5, color: "var(--text-3)", marginTop: 2, letterSpacing: "0.05em" }}>PERSONS</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "5px 0", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#F59E0B", fontFamily: "monospace", lineHeight: 1 }}>{approachingCount}</div>
            <div style={{ fontSize: 6.5, color: "var(--text-3)", marginTop: 2, letterSpacing: "0.05em" }}>APPROACH</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "5px 0", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#EF4444", fontFamily: "monospace", lineHeight: 1 }}>{intrusionCount}</div>
            <div style={{ fontSize: 6.5, color: "var(--text-3)", marginTop: 2, letterSpacing: "0.05em" }}>INTRUSION</div>
          </div>
        </div>
      </div>

      {/* Draw controls */}
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 5 }}>
          <button
            onClick={onToggleDraw}
            style={{
              flex: 1,
              padding: "4px 0",
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
              borderRadius: 3,
              cursor: "pointer",
              border: drawFence
                ? "1px solid rgba(34,197,94,0.6)"
                : "1px solid rgba(59,130,246,0.4)",
              background: drawFence ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.12)",
              color: drawFence ? "#22C55E" : "#3B82F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Pencil size={8} /> {drawFence ? "DRAWING…" : "DRAW ZONE"}
          </button>
          <button
            onClick={onClearFence}
            disabled={!armed}
            style={{
              padding: "4px 8px",
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
              borderRadius: 3,
              cursor: armed ? "pointer" : "not-allowed",
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.1)",
              color: armed ? "#F87171" : "#5B7492",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Clear fence"
          >
            <X size={8} /> CLEAR
          </button>
        </div>
        {drawFence && (
          <>
            <div style={{ fontSize: 7.5, color: "#22C55E" }}>
              {drawCount >= 3 ? "Click SET to arm the zone." : "Click on the feed to place vertices (min 3)."}
            </div>
            <button
              onClick={onSetFence}
              disabled={drawCount < 3}
              style={{
                padding: "5px 0",
                fontSize: 7.5,
                fontWeight: 800,
                letterSpacing: "0.06em",
                borderRadius: 3,
                cursor: drawCount >= 3 ? "pointer" : "not-allowed",
                border: "1px solid rgba(239,68,68,0.55)",
                background: drawCount >= 3 ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.06)",
                color: drawCount >= 3 ? "#F87171" : "#5B7492",
              }}
            >
              SET FENCE ({drawCount} VERTICES)
            </button>
          </>
        )}
      </div>

      {/* Event timeline */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px 12px" }}>
        <div
          style={{
            fontSize: 7.5,
            fontWeight: 700,
            color: "var(--text-3)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            margin: "0 0 6px",
          }}
        >
          Event Timeline · last {timeline.length}/20
        </div>
        {timeline.length === 0 ? (
          <div
            style={{
              padding: "6px 8px",
              fontSize: 8,
              color: "var(--text-3)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              lineHeight: 1.5,
            }}
          >
            {armed
              ? "No fence events yet. Subjects entering the drawn zone will appear here."
              : "Draw a fence zone and arm it to start monitoring intrusions."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {timeline.map((e, i) => {
              const color = FENCE_SEVERITY_COLOR[e.severity];
              const t = new Date(e.timestamp);
              return (
                <div
                  key={`${e.type}-${e.track_id}-${e.timestamp}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    padding: "5px 7px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${color}55`,
                    borderLeft: `2px solid ${color}`,
                    borderRadius: 4,
                  }}
                >
                  <div style={{ fontSize: 6.5, color: "var(--text-3)", fontFamily: "monospace", marginTop: 1, whiteSpace: "nowrap" }}>
                    {isNaN(t.getTime()) ? "—" : t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color, lineHeight: 1.3 }}>{e.message}</div>
                    <div style={{ fontSize: 7, color: "var(--text-3)", marginTop: 2, fontFamily: "monospace" }}>TRK #{e.track_id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", fontSize: 7, color: "var(--text-3)" }}>
        {feed.id.toUpperCase().replace("-", " ")} · {feed.sector} · ZONE MONITORING
      </div>
    </div>
  );
}

/** CAM06 live facial-recognition panel: watchlist matches, unknown faces, AI status. */
function FaceAlertPanel({
  feed,
  liveFrame,
}: {
  feed: CameraFeed;
  liveFrame: DetectionsFrame | null;
}) {
  const objs = liveFrame?.objects ?? [];
  const faces = objs.filter((o) => o.cls === "face");
  const wl = faces.filter((o) => o.watchlist);
  const unk = faces.filter((o) => !o.watchlist);
  const alerts = liveFrame?.face_alerts ?? [];

  const clock = liveFrame
    ? new Date(liveFrame.ts).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--";

  const countTile = (label: string, value: number, color: string, pulse = false) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          fontSize: 11.5,
          fontWeight: 800,
          fontFamily: "monospace",
          color: value > 0 ? color : "var(--text-3)",
          ...(pulse && value > 0
            ? { boxShadow: `0 0 6px ${color}, 0 0 2px ${color}`, textShadow: `0 0 3px ${color}` }
            : {}),
        }}
      >
        {value}
        {pulse && value > 0 && (
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, animation: "pulse 1s ease-in-out infinite" }} />
        )}
      </div>
      <div style={{ fontSize: 6, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: 210,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* header */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: liveFrame ? "#22C55E" : "#5B7492",
            animation: liveFrame ? "pulse 1.4s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.08em" }}>
          WATCHLIST AI
        </span>
        <span style={{ marginLeft: "auto", fontSize: 7.5, color: "var(--text-3)", fontFamily: "monospace" }}>
          {clock}
        </span>
      </div>

      {/* count tiles */}
      <div style={{ padding: "8px 12px", display: "flex", gap: 8, borderBottom: "1px solid var(--border)" }}>
        {countTile("FACES", faces.length, "#E2E8F0")}
        {countTile("WATCHLIST", wl.length, "#22C55E", true)}
        {countTile("UNKNOWN", unk.length, "#EF4444", true)}
      </div>

      {/* status + last match */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <UserCheck size={12} style={{ color: "#22C55E" }} />
          <span style={{ fontSize: 7.5, fontWeight: 700, color: liveFrame ? "#22C55E" : "#7A94AC", letterSpacing: "0.08em" }}>
            FACE RECOGNITION ACTIVE
          </span>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: liveFrame ? "#22C55E" : "#5B7492", marginLeft: "auto" }} />
        </div>
        <div style={{ fontSize: 6.5, color: "var(--text-3)" }}>
          {alerts.length > 0
            ? `${alerts.length} watchlist matche${alerts.length === 1 ? "" : "s"} this session · Daniel embedded`
            : "Watchlist loaded · no match yet"}
        </div>
      </div>

      {/* watchlist match feed */}
      <div style={{ padding: "9px 12px", borderBottom: alerts.length > 0 ? "1px solid var(--border)" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.1em" }}>
            WATCHLIST MATCHES
          </span>
          <span style={{ fontSize: 6.5, color: "var(--text-3)", fontFamily: "monospace" }}>{alerts.length}</span>
        </div>
        {alerts.length === 0 ? (
          <div style={{ fontSize: 7, color: "var(--text-3)", padding: "2px 0" }}>
            Awaiting subject…
          </div>
        ) : (
          alerts.slice(-6).reverse().map((a, i) => (
            <div key={`${a.ts}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i === 0 && (
                <span
                  style={{
                    padding: "1px 3px",
                    background: "rgba(34,197,94,0.18)",
                    border: "1px solid rgba(34,197,94,0.45)",
                    borderRadius: 2,
                    fontSize: 5.5,
                    fontWeight: 800,
                    color: "#22C55E",
                    letterSpacing: "0.06em",
                  }}
                >
                  NEW
                </span>
              )}
              <span style={{ color: "#22C55E" }}>●</span>
              <span style={{ flex: 1, minWidth: 0, color: "#22C55E", fontSize: 7, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                WATCHLIST MATCH · {a.name}
              </span>
              <span style={{ fontSize: 6.5, color: "var(--text-3)", fontFamily: "monospace" }}>
                {Math.round(a.confidence * 100)}%
              </span>
            </div>
          ))
        )}
      </div>

      {/* tracked faces right now */}
      <div style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
        <span style={{ fontSize: 7, fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.1em" }}>
          TRACKED FACES
        </span>
        {faces.length === 0 ? (
          <div style={{ fontSize: 7, color: "var(--text-3)", padding: "2px 0" }}>
            No face in view
          </div>
        ) : (
          faces.map((o) => {
            const matched = !!o.watchlist;
            const c = matched ? "#22C55E" : "#EF4444";
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.9)", minWidth: 60 }}>
                  {matched ? o.label : "Unknown"}
                </span>
                {matched && (
                  <span
                    style={{
                      padding: "1px 4px",
                      borderRadius: 2,
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.35)",
                      fontSize: 6,
                      fontWeight: 700,
                      color: "#22C55E",
                    }}
                  >
                    Watchlist
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 7, color: c, fontFamily: "monospace" }}>
                  #{o.id}
                </span>
                {!matched && (
                  <span style={{ fontSize: 6.5, color: "var(--text-3)", fontFamily: "monospace" }}>
                    {Math.round(o.confidence * 100)}%
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* footer */}
      <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", fontSize: 7, color: "var(--text-3)", marginTop: "auto" }}>
        {feed.id.toUpperCase().replace("-", " ")} · {feed.sector} · FACIAL RECOGNITION
      </div>
    </div>
  );
}

export default function CameraFeedCard({
  feed,
  expanded = false,
  onExpand,
  onCollapse,
}: CameraFeedCardProps) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const streamId = feed.detectionStream ?? "";
  const isStreamCam = streamId.length > 0;
  const { frame, online, fence, timeline, sendMessage, session, resetted } =
    useDetectionStream(
      streamId,
      isStreamCam && feed.status === "live"
    );
  const liveFrame = online && frame ? frame : null;
  const isPersonCam = streamId === "cam-01";
  const isFenceCam = streamId === "cam-04";
  const isFaceCam = streamId === "cam-06";
  const liveObjects = liveFrame?.objects ?? [];
  const fenceOverlayRef = useRef<HTMLDivElement>(null);

  // ── cam-04 virtual fence drawing ──
  const [drawFence, setDrawFence] = useState(false);
  const [drawPoints, setDrawPoints] = useState<FencePoint[]>([]);

  const toggleDraw = () => {
    setDrawFence((v) => {
      const nv = !v;
      setDrawPoints(nv ? (fence.length >= 3 ? [...fence] : []) : []);
      return nv;
    });
  };

  const addVertex = (e: ReactMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));
    setDrawPoints((prev) => {
      if (
        prev.length > 0 &&
        Math.hypot(prev[prev.length - 1][0] - nx, prev[prev.length - 1][1] - ny) < 0.008
      ) {
        return prev;
      }
      return [...prev, [Math.round(nx * 10000) / 10000, Math.round(ny * 10000) / 10000]];
    });
  };

  const commitFence = () => {
    if (drawPoints.length >= 3) {
      sendMessage({ type: "set_fence", camera: "cam-04", polygon: drawPoints });
    }
    setDrawFence(false);
    setDrawPoints([]);
  };

  const clearFence = () => {
    setDrawFence(false);
    setDrawPoints([]);
    sendMessage({ type: "clear_fence", camera: "cam-04" });
  };

  // Face-cam boxes are drawn server-side on the webcam stream.
  const visibleObjects = isFaceCam
    ? []
    : liveFrame
      ? liveObjects.filter((o) =>
          isPersonCam ? o.cls === "person" : VEHICLE_CLASSES.has(o.cls) || o.cls === "plate"
        )
      : [];

  // ── Option B: shared origin, fixed 1.0x playback ──
  // No playbackRate adjustments. The backend re-runs analytics from frame 0 at the
  // moment this feed is subscribed and the <video> restarts at 0s too, so both
  // clocks share a start point. The backend skips toward the displayed frame, so
  // boxes stay glued to the video without any drift-correction guessing.
  useEffect(() => {
    if (isFaceCam) return;
    if (!liveFrame) return;
    const video = videoRef.current;
    if (video && video.playbackRate !== 1) video.playbackRate = 1;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        // Staleness guard only (visual, not a sync mechanism): if the analytic
        // stalls, fade the overlay so old boxes are clearly not current.
        const stale = v.currentTime - (liveFrame.vts ?? 0);
        const alpha = Math.max(0.35, Math.min(1, 1 - Math.max(0, stale) / 0.9));
        if (overlayRef.current) overlayRef.current.style.opacity = alpha.toFixed(3);
        if (fenceOverlayRef.current) fenceOverlayRef.current.style.opacity = alpha.toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [liveFrame, isFaceCam]);

  // Shared-origin anchor: when the backend confirms a fresh analytics session for
  // this camera (subscribed + resetted), restart the <video> from 0s so both
  // clocks begin at the same reference point.
  const lastSyncSessionRef = useRef(-1);
  useEffect(() => {
    if (!resetted || session === 0 || session === lastSyncSessionRef.current) return;
    lastSyncSessionRef.current = session;
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.playbackRate = 1;
      void v.play().catch(() => undefined);
    }
  }, [session, resetted]);

  // Exact anchor: the backend marks the first frame of each session with
  // `first:true` and times its session clock so this frame is the shared origin.
  // Seek the <video> to that exact vts so the overlay and picture depart together —
  // this nails the residual WS/processing offset to sub-frame precision.
  const lastFirstSeqRef = useRef(-1);
  useEffect(() => {
    if (!liveFrame?.first) return;
    if (liveFrame.seq === lastFirstSeqRef.current) return;
    lastFirstSeqRef.current = liveFrame.seq;
    const v = videoRef.current;
    if (v) {
      v.currentTime = liveFrame.vts ?? 0;
      v.playbackRate = 1;
      void v.play().catch(() => undefined);
    }
  }, [liveFrame]);

  // ── Sync diagnostics (#4) ──
  useEffect(() => {
    if (isFaceCam) return;
    if (!liveFrame) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const fvts = liveFrame.vts ?? 0;
      const offset = v.currentTime - fvts;
      console.log(
        `[sync] cam=${streamId} backendStartFrame=0 backendFrame=${Math.round(
          fvts * (liveFrame.vfps ?? 30)
        )} backendVts=${fvts.toFixed(3)}s frontendTime=${v.currentTime.toFixed(
          3
        )}s offset=${offset >= 0 ? "+" : ""}${offset.toFixed(3)}s${
          Math.abs(offset) > 0.1 ? " DRIFT" : " ok"
        }`
      );
    }, 3000);
    return () => clearInterval(id);
  }, [liveFrame, streamId, isFaceCam]);

  const renderSurface = () => (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* ── Video / offline surface ── */}
      {feed.status === "offline" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#070D15",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 4px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              background: "rgba(91,116,146,0.1)",
              border: "1px solid rgba(91,116,146,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <VideoOff size={16} style={{ color: "#5B7492" }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#7A94AC", letterSpacing: "0.14em" }}>
            NO SIGNAL
          </div>
          <div style={{ fontSize: 7.5, color: "#3A5068" }}>
            Camera disconnected · check power and network
          </div>
        </div>
      ) : isFaceCam ? (
        <div style={{ position: "absolute", inset: 0, background: "#050B13" }}>
          <img
            src={`${BACKEND_URL}/faces/stream`}
            alt={feed.name}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: expanded ? "contain" : "cover",
              display: "block",
              background: "#000",
            }}
          />
          {feed.status === "live" && !liveFrame && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#7A94AC",
                  letterSpacing: "0.14em",
                  background: "rgba(0,0,0,0.72)",
                  padding: "2px 6px",
                  borderRadius: 3,
                }}
              >
                CONNECTING WEBCAM…
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "#050B13" }}>
          <video
            ref={videoRef}
            key={feed.id}
            src={feed.videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onClick={isFenceCam && drawFence ? addVertex : undefined}
            style={{
              width: "100%",
              height: "100%",
              objectFit: expanded ? "contain" : "cover",
              display: "block",
              background: "#000",
              cursor: isFenceCam && drawFence ? "crosshair" : "default",
            }}
          />
        </div>
      )}

      {/* Camera label */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            padding: "2px 6px",
            background: "rgba(0,0,0,0.55)",
            borderRadius: 3,
            fontSize: 7.5,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
          }}
        >
          {feed.id.replace("-", " ")}
        </span>
      </div>

      {/* ── Live detection overlays (WebSocket only) ── */}
      {feed.status === "live" &&
        liveFrame &&
        (isFenceCam
          ? (liveFrame.persons?.length ?? 0) > 0 ||
            (liveFrame.fence?.length ?? 0) >= 2
          : visibleObjects.length > 0) && (
          <div
            ref={isFenceCam ? fenceOverlayRef : overlayRef}
            style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}
          >
            {isFenceCam ? (
              <>
                {liveFrame.fence && liveFrame.fence.length >= 3 && <FenceOverlay points={liveFrame.fence} />}
                {(liveFrame.persons ?? []).map((p, i) => (
                  <FencePersonBox key={`p-${p.track_id}-${i}-${p.bbox.join(",")}`} p={p} />
                ))}
              </>
            ) : (
              visibleObjects.map((obj, i) => (
                <LiveDetectionBox
                  key={`${obj.cls}-${obj.id ?? i}-${obj.bbox.join(",")}`}
                  obj={obj}
                  isPersonCam={isPersonCam}
                />
              ))
            )}
          </div>
        )}

      {/* ── cam-04 fence DRAW mode overlay ── */}
      {isFenceCam && drawFence && (
        <div style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(34,197,94,0.06)" }} />
          <div style={{ position: "absolute", inset: 0 }}>
            <FenceOverlay points={drawPoints} pending />
          </div>

          {/* Hint chip */}
          <div
            style={{
              position: "absolute",
              top: 44,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "3px 10px",
              background: "rgba(0,0,0,0.82)",
              border: "1px solid rgba(34,197,94,0.5)",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
            }}
          >
            <Pencil size={8} style={{ color: "#22C55E" }} />
            <span style={{ fontSize: 7.5, fontWeight: 600, color: "#86EFAC", letterSpacing: "0.04em" }}>
              CLICK ON FEED TO PLACE VERTICES · {drawPoints.length} PLACED · {drawPoints.length >= 3 ? "DOUBLE-CLICK TO ARM" : "MIN 3"}
            </span>
          </div>

          {/* Action buttons */}
          <div
            style={{
              position: "absolute",
              bottom: 26,
              right: 8,
              display: "flex",
              gap: 5,
              pointerEvents: "auto",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDrawFence(false);
                setDrawPoints([]);
              }}
              style={{
                padding: "4px 9px",
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: "0.05em",
                borderRadius: 3,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(0,0,0,0.7)",
                color: "rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <X size={8} /> CANCEL
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                commitFence();
              }}
              disabled={drawPoints.length < 3}
              style={{
                padding: "4px 10px",
                fontSize: 7.5,
                fontWeight: 800,
                letterSpacing: "0.05em",
                borderRadius: 3,
                cursor: drawPoints.length >= 3 ? "pointer" : "not-allowed",
                border: "1px solid rgba(239,68,68,0.65)",
                background: drawPoints.length >= 3 ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.08)",
                color: drawPoints.length >= 3 ? "#F87171" : "#5B7492",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ShieldCheck size={8} /> SET FENCE
            </button>
          </div>
        </div>
      )}

      {/* ── cam-04 quick fence draw toggle ── */}
      {isFenceCam && feed.status === "live" && !drawFence && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDraw();
          }}
          title="Draw / reposition virtual fence zone"
          style={{
            position: "absolute",
            bottom: 26,
            right: 8,
            zIndex: 7,
            padding: "4px 9px",
            fontSize: 7.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
            borderRadius: 3,
            cursor: "pointer",
            border: fence.length >= 3
              ? "1px solid rgba(239,68,68,0.45)"
              : "1px solid rgba(234,179,8,0.5)",
            background: "rgba(0,0,0,0.65)",
            color: fence.length >= 3 ? "#F87171" : "#EAB308",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ShieldAlert size={8} /> FENCE
        </button>
      )}
    </div>
  );

  return (
    <div
      onClick={() => {
        if (drawFence) return;
        if (!expanded && onExpand) onExpand();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        height: "100%",
        aspectRatio: "16 / 9",
        background: "linear-gradient(135deg, #0a1628 0%, #162847 100%)",
        borderRadius: 6,
        border: expanded ? "1px solid rgba(59,130,246,0.55)" : "1px solid var(--border)",
        overflow: "hidden",
        flexShrink: 0,
        display: expanded ? "flex" : "block",
        boxShadow: expanded
          ? "0 0 0 1px rgba(59,130,246,0.25), 0 6px 24px rgba(0,0,0,0.5)"
          : hovered
          ? "0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.25)"
          : "0 2px 12px rgba(0,0,0,0.35)",
        cursor: expanded ? "default" : "pointer",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      {/* Expand / collapse control (over the video pane) */}
      {(expanded || hovered) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (expanded) {
              if (onCollapse) onCollapse();
            } else if (onExpand) {
              onExpand();
            }
          }}
          title={expanded ? "Minimize view" : "Maximize view"}
          style={{
            position: "absolute",
            bottom: expanded ? 26 : 26,
            right: expanded ? 206 : 6,
            width: 20,
            height: 20,
            borderRadius: 4,
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 7,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.65)";
          }}
        >
          {expanded ? (
            <Minimize2 size={10} style={{ color: "#fff" }} />
          ) : (
            <Maximize2 size={10} style={{ color: "#fff" }} />
          )}
        </button>
      )}

      {/* Video pane */}
      <div
        style={
          expanded
            ? { flex: 1, minWidth: 0, position: "relative" }
            : { position: "absolute", inset: 0 }
        }
      >
        {renderSurface()}
      </div>

      {/* Detection alert panel (expanded, all cameras) */}
      {expanded && feed.status !== "offline" && (
        isFenceCam ? (
          <FenceAlertPanel
            feed={feed}
            liveFrame={liveFrame}
            fence={fence}
            timeline={timeline}
            drawFence={drawFence}
            drawCount={drawPoints.length}
            onToggleDraw={toggleDraw}
            onSetFence={commitFence}
            onClearFence={clearFence}
          />
        ) : isFaceCam ? (
          <FaceAlertPanel feed={feed} liveFrame={liveFrame} />
        ) : (
          <DetectionAlertPanel
            feed={feed}
            liveFrame={liveFrame}
            isPersonCam={isPersonCam}
            isStreamCam={isStreamCam}
          />
        )
      )}
    </div>
  );
}