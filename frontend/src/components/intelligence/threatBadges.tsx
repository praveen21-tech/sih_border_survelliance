"use client";

import type { EventStatus, Severity } from "@/lib/threatIntelligenceData";

export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; bd: string }> = {
  critical: { bg: "#FDE8E8", text: "#B71C1C", bd: "#EF9A9A" },
  high:     { bg: "#FFF0E0", text: "#C05000", bd: "#FFCC80" },
  medium:   { bg: "#E3F0FB", text: "#0D5EA6", bd: "#90CAF9" },
  low:      { bg: "#EBF5EF", text: "#1A6B3C", bd: "#A5D6A7" },
};

const STATUS_COLORS: Record<EventStatus, { bg: string; text: string; bd: string }> = {
  open:          { bg: "#E3F0FB", text: "#0D5EA6", bd: "#90CAF9" },
  investigating: { bg: "#FFF0E0", text: "#C05000", bd: "#FFCC80" },
  escalated:     { bg: "#FDE8E8", text: "#B71C1C", bd: "#EF9A9A" },
  closed:        { bg: "#EBF5EF", text: "#1A6B3C", bd: "#A5D6A7" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: "var(--r)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.text,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: EventStatus }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--r)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "capitalize",
        background: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.text,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />
      {status}
    </span>
  );
}