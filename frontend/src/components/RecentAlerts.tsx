"use client";

import { motion } from "framer-motion";
import { ShieldAlert, User, Radio, Volume2, Truck } from "lucide-react";
import { alertRows } from "@/lib/mockData";
import type { SeverityLevel, AlertRow } from "@/types";

const SEV: Record<SeverityLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "CRITICAL", color: "var(--crit)", bg: "var(--crit-lt)",  border: "var(--crit-bd)"  },
  high:     { label: "HIGH",     color: "var(--high)", bg: "var(--high-lt)", border: "var(--high-bd)" },
  medium:   { label: "MEDIUM",   color: "var(--medium)", bg: "var(--medium-lt)",  border: "var(--medium-bd)"  },
  low:      { label: "LOW",      color: "var(--green)", bg: "var(--green-lt)",  border: "var(--low-bd)"  },
};

const STS: Record<string, string> = {
  Active: "var(--crit)", Investigating: "var(--high)", Resolved: "var(--green)",
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
        borderBottom: "1px solid var(--border-lt)",
        minHeight: 32,
        transition: "background 0.12s",
        background: "#FFFFFF",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F8FAFF";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#FFFFFF";
      }}
    >
      {/* Time */}
      <div style={{ ...CELL, fontFamily: "var(--mono, monospace)", fontSize: 8.5, fontWeight: 600, color: "var(--text-3)" }}>{row.time}</div>

      {/* Event */}
      <div style={{ ...CELL, gap: 5 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 3,
          background: sev.bg, border: `1px solid ${sev.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={10} style={{ color: sev.color }} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.event}
        </span>
      </div>

      {/* Sector */}
      <div style={{ ...CELL, fontSize: 9.5, color: "var(--text-2)" }}>{row.sector}</div>

      {/* Severity badge */}
      <div style={{ ...CELL }}>
        <span style={{
          fontSize: 7.5, fontWeight: 700,
          padding: "2px 5px", borderRadius: 3,
          color: sev.color, background: sev.bg,
          border: `1px solid ${sev.border}`,
          letterSpacing: "0.05em", whiteSpace: "nowrap",
        }}>
          {sev.label}
        </span>
      </div>

      {/* Status */}
      <div style={{ ...CELL, gap: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: STS[row.status], flexShrink: 0 }} />
        <span style={{ fontSize: 9.5, color: STS[row.status], fontWeight: 700 }}>{row.status}</span>
      </div>
    </motion.div>
  );
}

export default function RecentAlerts() {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid var(--border)",
      borderRadius: 4,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    }}>
      {/* Title row */}
      <div style={{
        padding: "8px 12px 7px",
        background: "#F4F6FB",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--navy)" }}>Recent Alerts</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--saffron)", fontFamily: "'Noto Sans Devanagari', sans-serif" }}>हालिया चेतावनियां</span>
        </div>
        <button style={{ fontSize: 10, fontWeight: 700, color: "var(--navy)", background: "none", border: "none", cursor: "pointer" }}>View All →</button>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 62px 66px 74px",
        background: "#F4F6FB",
        borderBottom: "2px solid var(--border)",
        flexShrink: 0,
        padding: "5px 0",
      }}>
        {["Time","Event","Sector","Severity","Status"].map((h) => (
          <div key={h} style={{ padding: "0 6px", fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
