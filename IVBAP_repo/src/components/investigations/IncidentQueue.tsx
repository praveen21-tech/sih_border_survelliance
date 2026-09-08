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

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: "#3B82F6",
  investigating: "#EAB308",
  escalated: "#F97316",
  closed: "#22C55E",
};

function StatusStyle(status: IncidentStatus) {
  const color = STATUS_COLORS[status];
  return {
    background: `${color}1F`,
    border: `1px solid ${color}55`,
    color,
  };
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const color = PRIORITY_COLORS[priority];
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
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const s = StatusStyle(status);
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
        ...s,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 3, background: s.color }} />
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
        background: "#0A1320",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#E6EEF6", letterSpacing: "0.01em" }}>
            Incident Queue
          </div>
          <div style={{ fontSize: 8.5, color: "#3A5068" }}>
            Detected incidents pending review across all sectors
          </div>
        </div>
        <div style={{ fontSize: 8.5, color: "#7A94AC", letterSpacing: "0.02em" }}>
          {incidents.length} incidents · {openCount} active
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Incident ID", "Type", "Camera", "Sector", "Time", "Priority", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: "#5B7492",
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
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: selected ? "rgba(59,130,246,0.07)" : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLTableRowElement;
                    el.style.background = "#0C1726";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLTableRowElement;
                    el.style.background = selected ? "rgba(59,130,246,0.07)" : "transparent";
                  }}
                >
                  <td style={{ padding: "5px 10px", color: "#7A94AC", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9, whiteSpace: "nowrap" }}>
                    {inc.id}
                  </td>
                  <td style={{ padding: "5px 10px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon size={11} strokeWidth={1.8} style={{ color: "#3B82F6", flexShrink: 0 }} />
                      <span style={{ color: "#D7E3EE" }}>{inc.type}</span>
                    </span>
                  </td>
                  <td style={{ padding: "5px 10px", color: "#9FB3C8", whiteSpace: "nowrap" }}>{inc.camera}</td>
                  <td style={{ padding: "5px 10px", color: "#9FB3C8", whiteSpace: "nowrap" }}>{inc.sector}</td>
                  <td style={{ padding: "5px 10px", color: "#9FB3C8", whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9 }}>
                    {inc.time}
                  </td>
                  <td style={{ padding: "5px 10px", whiteSpace: "nowrap" }}>
                    <PriorityBadge priority={inc.priority} />
                  </td>
                  <td style={{ padding: "5px 10px", whiteSpace: "nowrap" }}>
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