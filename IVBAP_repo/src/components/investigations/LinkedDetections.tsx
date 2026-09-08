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
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 7 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#E6EEF6", letterSpacing: "0.01em" }}>
          Linked Detections
        </div>
        <div style={{ fontSize: 8.5, color: "#3A5068" }}>
          Related detections from the same surveillance window
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
        }}
      >
        {detections.map((d) => {
          const Icon = ICON_MAP[d.icon] ?? ICON_MAP.human;
          return (
            <div
              key={d.id}
              style={{
                background: "#0A1320",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 7,
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.35)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              {/* Thumbnail */}
              <div style={{ aspectRatio: "16 / 9" }}>
                <SurveillanceFrame variant={d.frameVariant} camera={d.camera} time={d.time} compact />
              </div>

              {/* Card body */}
              <div style={{ padding: "7px 8px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon size={10} strokeWidth={1.9} style={{ color: "#3B82F6", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#D7E3EE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.type}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 8, color: "#7A94AC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.camera}</span>
                  <span style={{ fontSize: 8, color: "#3A5068", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "nowrap" }}>
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