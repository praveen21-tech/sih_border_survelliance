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
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "9px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: `${color}14`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={11} style={{ color }} />
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)" }}>
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", lineHeight: 1, letterSpacing: "-0.01em" }}>
            {value.toLocaleString()}
          </div>
          {trend !== 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 7.5,
                fontWeight: 600,
                color: rising ? "#EF4444" : "#22C55E",
                width: "fit-content",
              }}
            >
              {rising ? "↑" : "↓"} {Math.abs(trend)}%
            </div>
          )}
        </div>
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}