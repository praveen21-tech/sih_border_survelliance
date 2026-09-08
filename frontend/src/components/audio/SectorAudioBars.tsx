"use client";

import type { AudioActivity } from "@/lib/audioIntelligenceData";

interface SectorAudioBarsProps {
  data: AudioActivity[];
}

export default function SectorAudioBars({ data }: SectorAudioBarsProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

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
          padding: "9px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
          Sector Audio Activity
        </div>
        <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
          Where acoustic events are concentrated
        </div>
      </div>

      {/* Bars */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 9 }}>
        {data.map((d, i) => {
          const top = i === 0;
          return (
            <div key={d.sector} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  width: 80,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {d.sector}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 9,
                  borderRadius: 3,
                  background: "#E4E9F2",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(d.count / max) * 100}%`,
                    height: "100%",
                    background: top ? "var(--crit)" : "var(--navy)",
                    borderRadius: 3,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 10.5, color: "var(--navy)", fontFamily: "var(--mono)", fontWeight: 700, width: 34, textAlign: "right", flexShrink: 0 }}>
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}