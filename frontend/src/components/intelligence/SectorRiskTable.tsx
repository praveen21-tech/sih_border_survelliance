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
            High Risk Sectors
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            Ranked by threat volume and assessed risk
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F4F6FB", borderBottom: "2px solid var(--border)" }}>
              {["Sector", "Threat Count", "Risk Score", "Status"].map((h) => (
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
            {risks.map((r) => (
              <tr key={r.sector} style={{ borderBottom: "1px solid var(--border-lt)" }}>
                <td style={{ padding: "6px 10px", color: "var(--text)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {r.sector}
                </td>
                <td style={{ padding: "6px 10px", color: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 10 }}>
                  <strong style={{ color: "var(--crit)" }}>{r.criticalCount} Critical</strong> ({r.activePersons} Active)
                </td>
                <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--navy)", width: 22, fontWeight: 700 }}>
                      {r.riskScore}
                    </span>
                    <div
                      style={{
                        width: 48,
                        height: 5,
                        borderRadius: 3,
                        background: "#E4E9F2",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${r.riskScore}%`,
                          height: "100%",
                          background:
                            r.riskScore >= 80 ? "var(--crit)" : r.riskScore >= 60 ? "var(--high)" : r.riskScore >= 45 ? "var(--medium)" : "var(--green)",
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