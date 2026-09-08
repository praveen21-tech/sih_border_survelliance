"use client";

import { motion } from "framer-motion";
import { ShieldAlert, User, Radio, Volume2, Truck } from "lucide-react";
import { alertRows } from "@/lib/mockData";
import type { SeverityLevel, AlertRow } from "@/types";

const SEV: Record<SeverityLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "CRITICAL", color: "#EF4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.32)"  },
  high:     { label: "HIGH",     color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.32)" },
  medium:   { label: "MEDIUM",   color: "#EAB308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.32)"  },
  low:      { label: "LOW",      color: "#22C55E", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.32)"  },
};

const STS: Record<string, string> = {
  Active: "#EF4444", Investigating: "#F97316", Resolved: "#22C55E",
};

const TYPE_ICON: Record<AlertRow["iconType"], React.ElementType> = {
  person: ShieldAlert, watchlist: User, drone: Radio, audio: Volume2, vehicle: Truck,
};

const CELL: React.CSSProperties = {
  display: "flex", alignItems: "center",
  padding: "0 6px",
  fontSize: 10, color: "var(--text-2)",
  overflow: "hidden",
};

function Row({ row, index }: { row: AlertRow; index: number }) {
  const sev  = SEV[row.severity];
  const Icon = TYPE_ICON[row.iconType];
  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.04 * index }}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 62px 66px 74px",
        borderBottom: "1px solid var(--border)",
        minHeight: 32,
        transition: "background 0.12s",
        cursor: "default",
      }}
      onHoverStart={(e) => {
        const el = (e.target as HTMLElement).closest?.("[data-arow]") as HTMLElement | null;
        if (el) el.style.background = "rgba(255,255,255,0.02)";
      }}
      onHoverEnd={(e) => {
        const el = (e.target as HTMLElement).closest?.("[data-arow]") as HTMLElement | null;
        if (el) el.style.background = "transparent";
      }}
    >
      {/* Time */}
      <div style={{ ...CELL, fontFamily: "monospace", fontSize: 9, color: "var(--text-3)" }}>{row.time}</div>

      {/* Event */}
      <div style={{ ...CELL, gap: 5 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          background: `${sev.color}12`, border: `1px solid ${sev.color}25`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={9} style={{ color: sev.color }} strokeWidth={1.8} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.event}
        </span>
      </div>

      {/* Sector */}
      <div style={{ ...CELL, fontSize: 9.5 }}>{row.sector}</div>

      {/* Severity badge */}
      <div style={{ ...CELL }}>
        <span style={{
          fontSize: 7.5, fontWeight: 700,
          padding: "1.5px 5px", borderRadius: 3,
          color: sev.color, background: sev.bg,
          border: `1px solid ${sev.border}`,
          letterSpacing: "0.05em", whiteSpace: "nowrap",
        }}>
          {sev.label}
        </span>
      </div>

      {/* Status */}
      <div style={{ ...CELL, gap: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: STS[row.status], boxShadow: `0 0 3px ${STS[row.status]}60`, flexShrink: 0 }} />
        <span style={{ fontSize: 9.5, color: STS[row.status], fontWeight: 500 }}>{row.status}</span>
      </div>
    </motion.div>
  );
}

export default function RecentAlerts() {
  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* Title row */}
      <div style={{
        padding: "8px 12px 7px",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-1)" }}>Recent Alerts</span>
        <button style={{ fontSize: 10, color: "#3B82F6", background: "none", border: "none", cursor: "pointer" }}>View All →</button>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 62px 66px 74px",
        background: "rgba(255,255,255,0.015)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        padding: "4px 0",
      }}>
        {["Time","Event","Sector","Severity","Status"].map((h) => (
          <div key={h} style={{ padding: "0 6px", fontSize: 8.5, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {alertRows.map((row, i) => <Row key={row.id} row={row} index={i} />)}
      </div>
    </div>
  );
}
