"use client";

import type { Incident } from "@/lib/investigationData";
import SurveillanceFrame from "./SurveillanceFrame";

interface EvidenceSnapshotProps {
  incident: Incident;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5B7492" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 9,
          color: "#C3D1DE",
          fontFamily: label === "Timestamp" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function EvidenceSnapshot({ incident }: EvidenceSnapshotProps) {
  return (
    <div
      style={{
        background: "#0A1320",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#E6EEF6" }}>Evidence Snapshot</span>
        <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3B82F6" }}>
          Stored
        </span>
      </div>

      {/* Snapshot frame at 16:9 */}
      <div style={{ padding: 8, paddingBottom: 6 }}>
        <div style={{ aspectRatio: "16 / 9", borderRadius: 5, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#050B13" }}>
          <SurveillanceFrame variant={incident.frameVariant} camera={incident.camera} time={incident.snapshotTime} />
        </div>
      </div>

      {/* Metadata */}
      <div style={{ padding: "2px 12px 10px" }}>
        <MetaRow label="Camera ID" value={incident.camera} />
        <MetaRow label="Location" value={incident.location} />
        <MetaRow label="Timestamp" value={incident.snapshotTime} />
        <MetaRow
          label="Confidence Score"
          value={`${incident.confidence}% match`}
        />
      </div>
    </div>
  );
}