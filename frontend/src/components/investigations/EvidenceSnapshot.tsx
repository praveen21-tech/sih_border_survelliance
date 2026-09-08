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
        padding: "6px 0",
        borderBottom: "1px solid var(--border-lt)",
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 10.5,
          color: "var(--text)",
          fontWeight: 600,
          fontFamily: label === "Timestamp" ? "var(--mono)" : "inherit",
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
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "var(--sh)",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>Evidence Snapshot</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--green)", background: "var(--green-lt)", padding: "2px 7px", borderRadius: "var(--r)", border: "1px solid var(--low-bd)" }}>
          Stored Vault
        </span>
      </div>

      {/* Snapshot frame at 16:9 */}
      <div style={{ padding: 10, paddingBottom: 6 }}>
        <div style={{ aspectRatio: "16 / 9", borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--border)", background: "#050B13" }}>
          <SurveillanceFrame variant={incident.frameVariant} camera={incident.camera} time={incident.snapshotTime} snapshotUrl={incident.snapshotUrl} />
        </div>
      </div>

      {/* Metadata */}
      <div style={{ padding: "4px 12px 12px" }}>
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