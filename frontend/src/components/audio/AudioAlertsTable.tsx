"use client";

import { Volume2 } from "lucide-react";
import type { AudioAlert } from "@/lib/audioIntelligenceData";
import { SeverityBadge } from "../intelligence/threatBadges";

interface AudioAlertsTableProps {
  alerts: AudioAlert[];
}

function ConfidenceCell({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--navy)", fontWeight: 700 }}>
        {value}%
      </span>
      <span style={{ width: 36, height: 4, borderRadius: 2, background: "#E4E9F2", overflow: "hidden" }}>
        <span
          style={{
            width: `${value}%`,
            height: "100%",
            background: value >= 95 ? "var(--crit)" : value >= 85 ? "var(--high)" : value >= 75 ? "var(--medium)" : "var(--green)",
            display: "block",
          }}
        />
      </span>
    </span>
  );
}

export default function AudioAlertsTable({ alerts }: AudioAlertsTableProps) {
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
      {/* Header */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "var(--r)",
              background: "var(--crit-lt)",
              border: "1px solid var(--crit-bd)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Volume2 size={13} style={{ color: "var(--crit)" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
              Live Audio Alerts
            </div>
            <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
              Classified acoustic events with confidence
            </div>
          </div>
        </div>
        <span style={{ fontSize: 9, color: "var(--crit)", fontWeight: 700, letterSpacing: "0.06em", background: "var(--crit-lt)", border: "1px solid var(--crit-bd)", padding: "2px 7px", borderRadius: "var(--r)" }}>
          ● LIVE
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F4F6FB", borderBottom: "2px solid var(--border)" }}>
              {["Time", "Sector", "Event", "Confidence", "Severity"].map((h) => (
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
            {alerts.map((a, i) => (
              <tr key={a.id || i} style={{ borderBottom: "1px solid var(--border-lt)" }}>
                <td style={{ padding: "6px 10px", color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: 10, whiteSpace: "nowrap" }}>
                  {a.time}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{a.sector}</td>
                <td style={{ padding: "6px 10px", color: "var(--text)", fontWeight: 700, whiteSpace: "nowrap" }}>{a.event}</td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <ConfidenceCell value={a.confidence} />
                </td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <SeverityBadge severity={a.severity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}