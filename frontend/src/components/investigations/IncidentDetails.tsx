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
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontFamily: mono ? "var(--mono)" : "inherit",
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
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>Incident Details</span>
        <span style={{ fontSize: 9.5, fontFamily: "var(--mono)", color: "var(--navy)", fontWeight: 700, background: "var(--navy-lt)", padding: "2px 7px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
          {incident.id}
        </span>
      </div>

      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Title + badges */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon size={14} strokeWidth={2} style={{ color: "var(--navy)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>{incident.type}</span>
            <PriorityBadge priority={incident.priority} />
            <StatusBadge status={incident.status} />
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{incident.title}</div>
        </div>

        {/* Field grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px 14px",
            padding: "10px 0",
            borderTop: "1px solid var(--border-lt)",
            borderBottom: "1px solid var(--border-lt)",
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
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
            Description
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.55, color: "var(--text-2)" }}>{incident.description}</div>
        </div>

        {/* Evidence timeline */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
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
                background: "var(--border)",
              }}
            />
            {incident.timeline.map((ev, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 8, display: "flex", gap: 8, alignItems: "baseline" }}>
                {/* node */}
                <span
                  style={{
                    position: "absolute",
                    left: -14,
                    top: 3,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    border: "2px solid var(--navy)",
                  }}
                />
                <span style={{ fontSize: 9.5, fontFamily: "var(--mono)", color: "var(--navy)", width: 60, flexShrink: 0, fontWeight: 700 }}>
                  {ev.time}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{ev.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}