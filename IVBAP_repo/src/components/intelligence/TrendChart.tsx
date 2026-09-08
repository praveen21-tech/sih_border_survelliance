"use client";

import type { TrendPoint } from "@/lib/threatIntelligenceData";
import { useMeasure } from "./chartUtils";

export const TREND_SERIES: { key: "intrusions" | "suspicious" | "watchlist" | "vehicles"; label: string; color: string }[] = [
  { key: "intrusions", label: "Intrusions", color: "#EF4444" },
  { key: "suspicious", label: "Suspicious Activities", color: "#F97316" },
  { key: "watchlist", label: "Watchlist Matches", color: "#3B82F6" },
  { key: "vehicles", label: "Vehicle Violations", color: "#EAB308" },
];

interface TrendChartProps {
  data: TrendPoint[];
}

export default function TrendChart({ data }: TrendChartProps) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();

  const H = 186;
  const padL = 32;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const plotW = Math.max(width - padL - padR, 10);
  const plotH = H - padT - padB;

  const maxVal = Math.max(...data.flatMap((d) => TREND_SERIES.map((s) => d[s.key])), 1);
  const niceMax = Math.max(10, Math.ceil(maxVal / 5) * 5);
  const step = Math.max(1, Math.ceil(data.length / 6));

  const xAt = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - v / niceMax) * plotH;

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header + legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "9px 12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.01em" }}>
            Threat Trend Analysis
          </div>
          <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
            Detected threats across monitored sectors
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {TREND_SERIES.map((s) => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 8, color: "var(--text-2)", whiteSpace: "nowrap" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={ref} style={{ width: "100%", height: H, padding: "2px 4px 0" }}>
        {width > 0 && (
          <svg width={width} height={H - 2} style={{ display: "block" }}>
            {/* Gridlines + y labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = yAt(f * niceMax);
              return (
                <g key={f}>
                  <line
                    x1={padL}
                    x2={width - padR}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                    strokeDasharray={f === 0 ? "0" : "3 3"}
                  />
                  <text x={padL - 6} y={y + 2.5} textAnchor="end" fontSize={7.5} fill="#5B7492" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                    {Math.round(f * niceMax)}
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {data.map((d, i) =>
              i % step === 0 || i === data.length - 1 ? (
                <text
                  key={`x-${i}`}
                  x={xAt(i)}
                  y={H - 4}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  fontSize={7.5}
                  fill="#5B7492"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {d.label}
                </text>
              ) : null
            )}

            {/* Series lines */}
            {TREND_SERIES.map((s) => {
              const pts = data
                .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(d[s.key]).toFixed(1)}`)
                .join(" ");
              return (
                <g key={s.key}>
                  <path d={pts} fill="none" stroke={s.color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                  <circle cx={xAt(data.length - 1)} cy={yAt(data[data.length - 1][s.key])} r={2.4} fill={s.color} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}