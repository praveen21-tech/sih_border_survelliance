"use client";

import { ShieldAlert, AlertTriangle, Fence, ScanFace, type LucideIcon } from "lucide-react";
import Sparkline from "./Sparkline";

interface KpiCardProps {
  label: string;
  value: number;
  trend: number;
  spark: number[];
  color: string;
  icon: LucideIcon;
}

export default function KpiCard({ label, value, trend, spark, color, icon: Icon }: KpiCardProps) {
  const rising = trend > 0;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${color || "var(--navy)"}`,
        borderRadius: "var(--r)",
        padding: "10px 12px 9px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow: "var(--sh)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "var(--r)",
            background: "var(--navy-lt)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={12} style={{ color: color || "var(--navy)" }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--navy)", lineHeight: 1, fontFamily: "var(--mono)" }}>
            {value.toLocaleString()}
          </div>
          {trend !== 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
                fontWeight: 700,
                color: rising ? "var(--crit)" : "var(--green)",
                width: "fit-content",
                fontFamily: "var(--mono)",
              }}
            >
              {rising ? "▲" : "▼"} {Math.abs(trend)}% vs prev
            </div>
          )}
        </div>
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}