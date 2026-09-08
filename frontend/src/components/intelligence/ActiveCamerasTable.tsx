"use client";

import type { ActiveCamera } from "@/lib/threatIntelligenceData";

interface ActiveCamerasTableProps {
  cameras: ActiveCamera[];
}

export default function ActiveCamerasTable({ cameras }: ActiveCamerasTableProps) {
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
          padding: "9px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
          Most Active Cameras
        </div>
        <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
          Cameras with highest detection volume
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F4F6FB", borderBottom: "2px solid var(--border)" }}>
              {["Camera ID & Name", "Sector", "Threat Level", "Events", "Status / Stream"].map((h) => (
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
            {cameras.map((c) => {
              const hot = c.threatLevel === "critical" || c.eventsCount >= 5;
              const level = c.threatLevel.toLowerCase();
              const badgeStyle = 
                level === "critical" ? { bg: "#FDE8E8", text: "#B71C1C", bd: "#EF9A9A" } :
                level === "high"     ? { bg: "#FFF0E0", text: "#C05000", bd: "#FFCC80" } :
                level === "medium"   ? { bg: "#E3F0FB", text: "#0D5EA6", bd: "#90CAF9" } :
                                       { bg: "#EBF5EF", text: "#1A6B3C", bd: "#A5D6A7" };

              return (
                <tr key={c.id || c.name} style={{ borderBottom: "1px solid var(--border-lt)" }}>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: hot ? "var(--crit)" : "var(--green)", flexShrink: 0 }} />
                      <span style={{ color: "var(--text)", fontWeight: 700, fontFamily: "var(--mono)", fontSize: 10 }}>
                        {c.id}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: 9.5 }}>
                        ({c.name})
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{c.sector}</td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "var(--r)",
                        fontSize: 8.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: badgeStyle.bg,
                        border: `1px solid ${badgeStyle.bd}`,
                        color: badgeStyle.text,
                      }}
                    >
                      {c.threatLevel}
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--navy)", fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 700 }}>
                    {c.eventsCount}
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 9.5, fontFamily: "var(--mono)" }}>
                    {c.status} ({c.latencyMs || 15}ms)
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