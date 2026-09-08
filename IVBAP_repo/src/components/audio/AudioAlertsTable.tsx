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
      <span style={{ fontSize: 9, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text-1)" }}>
        {value}%
      </span>
      <span style={{ width: 30, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <span
          style={{
            width: `${value}%`,
            height: "100%",
            background: value >= 95 ? "#EF4444" : value >= 85 ? "#F97316" : value >= 75 ? "#EAB308" : "#22C55E",
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
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Volume2 size={11} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.01em" }}>
              Live Audio Alerts
            </div>
            <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
              Classified acoustic events with confidence
            </div>
          </div>
        </div>
        <span style={{ fontSize: 8, color: "#EF4444", fontWeight: 600, letterSpacing: "0.04em" }}>
          ● LIVE
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Time", "Sector", "Event", "Confidence", "Severity"].map((h) => (
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
            {alerts.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 10px", color: "var(--text-3)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9, whiteSpace: "nowrap" }}>
                  {a.time}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{a.sector}</td>
                <td style={{ padding: "6px 10px", color: "var(--text-1)", fontWeight: 600, whiteSpace: "nowrap" }}>{a.event}</td>
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