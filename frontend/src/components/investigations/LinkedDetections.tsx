"use client";

import type { LinkedDetection } from "@/lib/investigationData";
import { ICON_MAP } from "./IncidentQueue";
import SurveillanceFrame from "./SurveillanceFrame";

interface LinkedDetectionsProps {
  detections: LinkedDetection[];
}

export default function LinkedDetections({ detections }: LinkedDetectionsProps) {
  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
          Linked Detections
        </div>
        <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
          Related detections from the same surveillance window
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
      >
        {detections.map((d) => {
          const Icon = ICON_MAP[d.icon] ?? ICON_MAP.human;
          return (
            <div
              key={d.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                overflow: "hidden",
                cursor: "pointer",
                boxShadow: "var(--sh)",
                transition: "border-color 0.12s, box-shadow 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--navy)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,32,96,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--sh)";
              }}
            >
              {/* Thumbnail */}
              <div style={{ aspectRatio: "16 / 9" }}>
                <SurveillanceFrame variant={d.frameVariant} camera={d.camera} time={d.time} compact />
              </div>

              {/* Card body */}
              <div style={{ padding: "8px 9px", background: "#FFFFFF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon size={12} strokeWidth={2} style={{ color: "var(--navy)", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.type}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.camera}</span>
                  <span style={{ fontSize: 9, color: "var(--navy)", fontFamily: "var(--mono)", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {d.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}