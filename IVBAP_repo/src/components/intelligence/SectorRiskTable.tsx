"use client";

import type { SectorRisk } from "@/lib/threatIntelligenceData";
import { SeverityBadge } from "./threatBadges";

interface SectorRiskTableProps {
  risks: SectorRisk[];
}

export default function SectorRiskTable({ risks }: SectorRiskTableProps) {
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
            High Risk Sectors
          </div>
          <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
            Ranked by threat volume and assessed risk
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Sector", "Threat Count", "Risk Score", "Status"].map((h) => (
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
            {risks.map((r) => (
              <tr key={r.sector} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 10px", color: "var(--text-1)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {r.sector}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-2)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9 }}>
                  {r.threats}
                </td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text-1)", width: 20 }}>
                      {r.riskScore}
                    </span>
                    <div
                      style={{
                        width: 46,
                        height: 3,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${r.riskScore}%`,
                          height: "100%",
                          background:
                            r.riskScore >= 80 ? "#EF4444" : r.riskScore >= 60 ? "#F97316" : r.riskScore >= 45 ? "#EAB308" : "#22C55E",
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <SeverityBadge severity={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}