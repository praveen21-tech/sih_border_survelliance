"use client";

import { motion } from "framer-motion";
import { Camera, ShieldAlert, Users, Volume2 } from "lucide-react";
import type { KPICard as KPICardType } from "@/types";

const ICONS = { Camera, ShieldAlert, Users, Volume2 } as const;

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 26, width: 56 }}>
      {data.map((v, i) => {
        const h = Math.max((v / max) * 100, 8);
        const isRecent = i >= data.length - 4;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              borderRadius: 1.5,
              background: isRecent ? color : `${color}28`,
              minHeight: 2,
            }}
          />
        );
      })}
    </div>
  );
}

interface Props { card: KPICardType; index: number }

export default function KPICard({ card, index }: Props) {
  const Icon    = ICONS[card.iconName];
  const isDown  = card.deltaType === "down";
  const accent  = card.accentColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      style={{
        flex: 1,
        minWidth: 0,
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${accent || "var(--navy)"}`,
        borderRadius: 4,
        padding: "10px 12px 9px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "default",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width: 34, height: 34,
          borderRadius: 4,
          background: `${accent}15`,
          border: `1px solid ${accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: accent }} strokeWidth={2} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2 }}>
          {card.label}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", lineHeight: 1, fontFamily: "var(--font-mono, 'Roboto Mono', monospace)", fontVariantNumeric: "tabular-nums" }}>
          {card.value}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono, 'Roboto Mono', monospace)", color: isDown ? "var(--green)" : accent }}>
            {card.delta}
          </span>
          <span style={{ fontSize: 8.5, color: "var(--text-light)" }}>{card.deltaLabel}</span>
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline data={card.barData} color={accent} />
    </motion.div>
  );
}

