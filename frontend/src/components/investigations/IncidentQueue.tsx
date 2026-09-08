"use client";

import {
  ScanFace, ShieldAlert, Fingerprint, Eye, Fence, Car, User, Moon,
  type LucideIcon,
} from "lucide-react";
import type { Incident, IncidentStatus, Priority } from "@/lib/investigationData";

export const ICON_MAP: Record<string, LucideIcon> = {
  watchlist: ScanFace,
  intrusion: ShieldAlert,
  anpr: Fingerprint,
  suspicious: Eye,
  fence: Fence,
  vehicle: Car,
  human: User,
  night: Moon,
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; bd: string }> = {
  critical: { bg: "#FDE8E8", text: "#B71C1C", bd: "#EF9A9A" },
  high:     { bg: "#FFF0E0", text: "#C05000", bd: "#FFCC80" },
  medium:   { bg: "#E3F0FB", text: "#0D5EA6", bd: "#90CAF9" },
  low:      { bg: "#EBF5EF", text: "#1A6B3C", bd: "#A5D6A7" },
};

export const STATUS_COLORS: Record<IncidentStatus, { bg: string; text: string; bd: string }> = {
  open:          { bg: "#E3F0FB", text: "#0D5EA6", bd: "#90CAF9" },
  investigating: { bg: "#FFF0E0", text: "#C05000", bd: "#FFCC80" },
  escalated:     { bg: "#FDE8E8", text: "#B71C1C", bd: "#EF9A9A" },
  closed:        { bg: "#EBF5EF", text: "#1A6B3C", bd: "#A5D6A7" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
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
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
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

// ── Incident queue table ──────────────────────────────────────────────────────

interface IncidentQueueProps {
  incidents: Incident[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function IncidentQueue({ incidents, selectedId, onSelect }: IncidentQueueProps) {
  const openCount = incidents.filter((i) => i.status === "open" || i.status === "investigating").length;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        boxShadow: "var(--sh)",
      }}
    >
      {/* Card header */}
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
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
            Incident Queue
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
            Detected incidents pending review across all sectors
          </div>
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--navy)", background: "var(--navy-lt)", padding: "2px 8px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
          {incidents.length} incidents · {openCount} active
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F4F6FB", borderBottom: "2px solid var(--border)" }}>
              {["Incident ID", "Type", "Camera", "Sector", "Time", "Priority", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "7px 10px",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => {
              const Icon = ICON_MAP[inc.icon] ?? ShieldAlert;
              const selected = inc.id === selectedId;

              return (
                <tr
                  key={inc.id}
                  onClick={() => onSelect(inc.id)}
                  style={{
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border-lt)",
                    background: selected ? "var(--navy-lt)" : "transparent",
                    borderLeft: selected ? "3px solid var(--saffron)" : "3px solid transparent",
                    transition: "background 0.12s",
                  }}
                >
                  <td style={{ padding: "6px 10px", color: "var(--navy)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {inc.id}
                  </td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon size={13} strokeWidth={2} style={{ color: "var(--navy)", flexShrink: 0 }} />
                      <span style={{ color: "var(--text)", fontWeight: 700 }}>{inc.type}</span>
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{inc.camera}</td>
                  <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{inc.sector}</td>
                  <td style={{ padding: "6px 10px", color: "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "var(--mono)", fontSize: 10 }}>
                    {inc.time}
                  </td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <PriorityBadge priority={inc.priority} />
                  </td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <StatusBadge status={inc.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}