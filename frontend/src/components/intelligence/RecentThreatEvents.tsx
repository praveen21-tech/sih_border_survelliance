"use client";

import type { ThreatEvent } from "@/lib/threatIntelligenceData";
import { SeverityBadge, StatusBadge } from "./threatBadges";

interface RecentThreatEventsProps {
  events: ThreatEvent[];
}

export default function RecentThreatEvents({ events }: RecentThreatEventsProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--sh)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
            Recent Threat Events
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            Latest detections across monitored sectors
          </div>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--navy)", background: "var(--navy-lt)", padding: "2px 8px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
          {events.length} events
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F4F6FB", borderBottom: "2px solid var(--border)" }}>
              {["Time", "Event Type", "Sector", "Severity", "Status", "Details"].map((h) => (
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
            {events.map((e, i) => (
              <tr key={e.id || i} style={{ borderBottom: "1px solid var(--border-lt)" }}>
                <td style={{ padding: "6px 10px", color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: 10, whiteSpace: "nowrap" }}>
                  {e.time}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text)", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                  {e.type}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{e.sector}</td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <SeverityBadge severity={e.severity} />
                </td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <StatusBadge status={e.status} />
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-muted)", fontSize: 10, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}