"use client";

import type { ActiveCamera } from "@/lib/threatIntelligenceData";

interface ActiveCamerasTableProps {
  cameras: ActiveCamera[];
}

export default function ActiveCamerasTable({ cameras }: ActiveCamerasTableProps) {
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
          padding: "9px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.01em" }}>
          Most Active Cameras
        </div>
        <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
          Cameras with the highest detection volume
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Camera", "Sector", "Threats Detected", "Last Activity"].map((h) => (
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
            {cameras.map((c) => {
              const hot = c.threats >= 15;
              return (
                <tr key={c.camera} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: hot ? "#EF4444" : "#3B82F6", flexShrink: 0 }} />
                      <span style={{ color: "var(--text-1)", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9 }}>
                        {c.camera}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{c.sector}</td>
                  <td style={{ padding: "6px 10px", color: "var(--text-1)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9 }}>
                    {c.threats}
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--text-3)", whiteSpace: "nowrap" }}>{c.lastActivity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}