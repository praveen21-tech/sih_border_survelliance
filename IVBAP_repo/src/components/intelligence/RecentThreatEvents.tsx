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
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.01em" }}>
            Recent Threat Events
          </div>
          <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
            Latest detections across monitored sectors
          </div>
        </div>
        <span style={{ fontSize: 8, color: "var(--text-3)", letterSpacing: "0.03em" }}>
          {events.length} events
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Time", "Camera", "Event Type", "Sector", "Severity", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: "var(--text-3)",
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
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 10px", color: "var(--text-3)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9, whiteSpace: "nowrap" }}>
                  {e.time}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-1)", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9, whiteSpace: "nowrap" }}>
                  {e.camera}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-1)", whiteSpace: "nowrap" }}>{e.eventType}</td>
                <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{e.sector}</td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <SeverityBadge severity={e.severity} />
                </td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}