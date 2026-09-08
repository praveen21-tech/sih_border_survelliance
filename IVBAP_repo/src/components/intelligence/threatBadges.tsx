"use client";

import type { EventStatus, Severity } from "@/lib/threatIntelligenceData";

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

const STATUS_COLORS: Record<EventStatus, string> = {
  open: "#3B82F6",
  investigating: "#EAB308",
  escalated: "#F97316",
  closed: "#22C55E",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: `${color}1A`,
        border: `1px solid ${color}44`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: EventStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 7px",
        borderRadius: 4,
        fontSize: 7.5,
        fontWeight: 600,
        letterSpacing: "0.04em",
        background: `${color}1F`,
        border: `1px solid ${color}55`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 3, background: color }} />
      {status}
    </span>
  );
}