"use client";

interface DistributionSlice {
  name: string;
  value: number;
  color: string;
}

interface DistributionDonutProps {
  slices: DistributionSlice[];
}

export default function DistributionDonut({ slices }: DistributionDonutProps) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = 46;
  const cx = 58;
  const cy = 58;
  const C = 2 * Math.PI * r;

  let acc = 0;

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
            Threat Distribution
          </div>
          <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
            By category across the review window
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px 10px", flex: 1 }}>
        {/* Donut */}
        <div style={{ width: 116, height: 116, flexShrink: 0, position: "relative" }}>
          <svg width={116} height={116} viewBox="0 0 116 116">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={16} />
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {slices.map((s, i) => {
                const frac = s.value / total;
                const dash = frac * C;
                const el = (
                  <circle
                    key={`${s.name}-${i}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={16}
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={acc}
                    opacity={0.95}
                  />
                );
                acc -= dash;
                return el;
              })}
            </g>
          </svg>
          {/* Center total */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: 7, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
              Threats
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          {slices.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 8.5, color: "var(--text-2)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.name}
              </span>
              <span style={{ fontSize: 8.5, color: "var(--text-1)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {Math.round((s.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}