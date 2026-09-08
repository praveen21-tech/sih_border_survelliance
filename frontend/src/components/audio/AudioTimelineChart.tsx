"use client";

import type { AudioTrendPoint } from "@/lib/audioIntelligenceData";
import { useMeasure } from "../intelligence/chartUtils";

const AUDIO_SERIES: { key: keyof Omit<AudioTrendPoint, "label">; label: string; color: string }[] = [
  { key: "gunshots", label: "Gunshots", color: "#EF4444" },
  { key: "distress", label: "Distress Calls", color: "#3B82F6" },
  { key: "crowd", label: "Crowd Noise", color: "#16A34A" },
  { key: "explosions", label: "Explosions", color: "#F97316" },
];

interface AudioTimelineChartProps {
  data: AudioTrendPoint[];
}

export default function AudioTimelineChart({ data }: AudioTimelineChartProps) {
  const [ref, { width }] = useMeasure<HTMLDivElement>();

  const H = 186;
  const padL = 32;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const plotW = Math.max(width - padL - padR, 10);
  const plotH = H - padT - padB;

  const maxVal = Math.max(...data.flatMap((d) => AUDIO_SERIES.map((s) => d[s.key])), 1);
  const niceMax = Math.max(5, Math.ceil(maxVal / 5) * 5);
  const step = Math.max(1, Math.ceil(data.length / 6));

  const xAt = (i: number) => padL + (i / (data.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - v / niceMax) * plotH;

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
      {/* Header + legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "9px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
            Audio Event Timeline
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            Acoustic events classified across border sectors
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {AUDIO_SERIES.map((s) => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={ref} style={{ width: "100%", height: H, flex: 1, padding: "4px 6px 0", background: "#FFFFFF" }}>
        {width > 0 && (
          <svg width={width} height={H} style={{ display: "block" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = yAt(f * niceMax);
              return (
                <g key={f}>
                  <line
                    x1={padL}
                    x2={width - padR}
                    y1={y}
                    y2={y}
                    stroke="#E4E9F2"
                    strokeWidth={1}
                    strokeDasharray={3}
                  />
                  <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={8} fill="#5A6A7C" fontFamily="var(--mono)" fontWeight={600}>
                    {Math.round(f * niceMax)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) =>
              i % step === 0 || i === data.length - 1 ? (
                <text
                  key={`x-${i}`}
                  x={xAt(i)}
                  y={H - 4}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  fontSize={8}
                  fill="#5A6A7C"
                  fontFamily="var(--mono)"
                  fontWeight={600}
                >
                  {d.label}
                </text>
              ) : null
            )}

            {AUDIO_SERIES.map((s) => {
              const pts = data
                .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(d[s.key]).toFixed(1)}`)
                .join(" ");
              return (
                <g key={s.key}>
                  <path d={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                  <circle cx={xAt(data.length - 1)} cy={yAt(data[data.length - 1][s.key])} r={3} fill={s.color} stroke="#FFFFFF" strokeWidth={1} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}