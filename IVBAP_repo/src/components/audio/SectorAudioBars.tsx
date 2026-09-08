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
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "9px 12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.01em" }}>
          Sector Audio Activity
        </div>
        <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
          Where acoustic events are concentrated
        </div>
      </div>

      {/* Bars */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => {
          const top = i === 0;
          return (
            <div key={d.sector} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 8.5,
                  color: "var(--text-2)",
                  width: 72,
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
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(d.count / max) * 100}%`,
                    height: "100%",
                    background: top ? "rgba(239,68,68,0.75)" : "rgba(59,130,246,0.55)",
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 9, color: "var(--text-1)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", width: 34, textAlign: "right", flexShrink: 0 }}>
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}