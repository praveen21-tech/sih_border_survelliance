"use client";

import { ShieldAlert } from "lucide-react";
import type { Incident } from "@/lib/investigationData";
import { ICON_MAP, PriorityBadge, StatusBadge } from "./IncidentQueue";

interface IncidentDetailsProps {
  incident: Incident;
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5B7492", marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 9.5,
          color: "#C3D1DE",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function IncidentDetails({ incident }: IncidentDetailsProps) {
  const Icon = ICON_MAP[incident.icon] ?? ShieldAlert;

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
        <span style={{ fontSize: 11, fontWeight: 700, color: "#E6EEF6" }}>Incident Details</span>
        <span style={{ fontSize: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#3A5068" }}>
          {incident.id}
        </span>
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
        {/* Title + badges */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Icon size={12} strokeWidth={1.8} style={{ color: "#3B82F6", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#EFF4FA", letterSpacing: "0.01em" }}>{incident.type}</span>
            <PriorityBadge priority={incident.priority} />
            <StatusBadge status={incident.status} />
          </div>
          <div style={{ fontSize: 8.5, color: "#3A5068" }}>{incident.title}</div>
        </div>

        {/* Field grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px 14px",
            padding: "8px 0",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Field label="Incident ID" value={incident.id} mono />
          <Field label="Detection Time" value={`${incident.date} · ${incident.time}`} />
          <Field label="Sector" value={incident.sector} />
          <Field label="Camera" value={incident.camera} />
          <Field label="Detection Confidence" value={`${incident.confidence}%`} />
          <Field label="Location" value={incident.location} />
        </div>

        {/* Description */}
        <div>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5B7492", marginBottom: 4 }}>
            Description
          </div>
          <div style={{ fontSize: 9, lineHeight: 1.55, color: "#9FB3C8" }}>{incident.description}</div>
        </div>

        {/* Evidence timeline */}
        <div>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5B7492", marginBottom: 8 }}>
            Evidence Timeline
          </div>
          <div style={{ position: "relative", paddingLeft: 14 }}>
            {/* vertical line */}
            <div
              style={{
                position: "absolute",
                left: 3,
                top: 3,
                bottom: 3,
                width: 1,
                background: "rgba(255,255,255,0.10)",
              }}
            />
            {incident.timeline.map((ev, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 7, display: "flex", gap: 8, alignItems: "baseline" }}>
                {/* node */}
                <span
                  style={{
                    position: "absolute",
                    left: -14,
                    top: 3,
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: "#0A1320",
                    border: "1.5px solid #3B82F6",
                  }}
                />
                <span style={{ fontSize: 8.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#7A94AC", width: 54, flexShrink: 0 }}>
                  {ev.time}
                </span>
                <span style={{ fontSize: 9, color: "#C3D1DE", lineHeight: 1.3 }}>{ev.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}