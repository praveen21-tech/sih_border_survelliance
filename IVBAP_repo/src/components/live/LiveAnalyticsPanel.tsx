"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, MoonStar } from "lucide-react";
import { liveAnalytics, liveModels } from "@/lib/liveData";

// ── Small trend chip ─────────────────────────────────────────────────────────
function Trend({ delta, deltaType }: { delta: string; deltaType: "up" | "down" }) {
  const up = deltaType === "up";
  const color = up ? "#22C55E" : "#F97316";
  return (
    <span
      style={{
        display: "flex", alignItems: "center", gap: 2,
        fontSize: 9, fontWeight: 600, color,
        background: `${color}14`,
        border: `1px solid ${color}2e`,
        padding: "1px 4px", borderRadius: 3,
        flexShrink: 0,
      }}
    >
      {up ? <TrendingUp size={8} strokeWidth={2.4} style={{ color }} /> : <TrendingDown size={8} strokeWidth={2.4} style={{ color }} />}
      {delta}
    </span>
  );
}

// ── Analytics card ────────────────────────────────────────────────────────────
function AnalyticsRow({ item, index }: { item: (typeof liveAnalytics)[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: 0.05 * index }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        padding: "8px 10px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 9.5, color: "var(--text-2)", fontWeight: 500 }}>{item.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <Trend delta={item.delta} deltaType={item.deltaType} />
        <span style={{ fontSize: 15, fontWeight: 700, color: item.accent, fontVariantNumeric: "tabular-nums", minWidth: 22, textAlign: "right" }}>
          {item.value}
        </span>
      </div>
    </motion.div>
  );
}

// ── Panel shell ───────────────────────────────────────────────────────────────
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px 12px 7px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-1)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Night surveillance status card ────────────────────────────────────────────
function NightStatus() {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        padding: "9px 12px",
        background: "linear-gradient(90deg, rgba(59,130,246,0.10), rgba(59,130,246,0.02))",
        border: "1px solid rgba(59,130,246,0.22)",
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div
          style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: "rgba(59,130,246,0.14)",
            border: "1px solid rgba(59,130,246,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MoonStar size={12} style={{ color: "#60A5FA" }} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-1)" }}>Night Surveillance Status</div>
          <div style={{ fontSize: 8, color: "var(--text-3)", letterSpacing: "0.04em", marginTop: 1 }}>
            Night-Time Movement Detection
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 6px", borderRadius: 3,
          background: "rgba(59,130,246,0.14)",
          border: "1px solid rgba(59,130,246,0.35)",
          flexShrink: 0,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 4px #60A5FA" }} />
        <span style={{ fontSize: 7.5, fontWeight: 700, color: "#60A5FA", letterSpacing: "0.05em" }}>
          LOW LIGHT MODE ACTIVE
        </span>
      </div>
    </div>
  );
}

// ── Main right panel ──────────────────────────────────────────────────────────
export default function LiveAnalyticsPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", minHeight: 0 }}>
      {/* Analytics */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Shell title="Live Analytics">
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {liveAnalytics.map((item, i) => (
              <AnalyticsRow key={item.id} item={item} index={i} />
            ))}
          </div>
        </Shell>
      </div>

      {/* Model status */}
      <Shell title="AI Model Status">
        <div style={{ padding: "4px 10px 6px" }}>
          {liveModels.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                padding: "5px 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 4px #22C55E", flexShrink: 0 }} />
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-1)" }}>{m.name}</span>
                <span style={{ fontSize: 8, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.role}
                </span>
              </div>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: "#22C55E", letterSpacing: "0.06em", flexShrink: 0 }}>
                ACTIVE
              </span>
            </div>
          ))}
        </div>
      </Shell>

      {/* Night mode indicator */}
      <NightStatus />
    </div>
  );
}
