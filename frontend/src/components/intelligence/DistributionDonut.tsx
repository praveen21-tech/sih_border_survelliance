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
            Threat Distribution
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            By category across the review window
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", flex: 1 }}>
        {/* Donut */}
        <div style={{ width: 116, height: 116, flexShrink: 0, position: "relative" }}>
          <svg width={116} height={116} viewBox="0 0 116 116">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF1F7" strokeWidth={16} />
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)", lineHeight: 1, fontFamily: "var(--mono)" }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2, fontWeight: 700 }}>
              Threats
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {slices.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: "var(--text-2)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                {s.name}
              </span>
              <span style={{ fontSize: 9.5, color: "var(--navy)", fontFamily: "var(--mono)", fontWeight: 700 }}>
                {Math.round((s.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}