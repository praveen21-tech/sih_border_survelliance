"use client";

import { motion } from "framer-motion";
import { ShieldAlert, User, Truck, Eye, Footprints } from "lucide-react";
import { liveEvents } from "@/lib/liveData";
import type { LiveEvent } from "@/lib/liveData";

const SEV_COLOR: Record<LiveEvent["severity"], string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

function eventIconName(event: string) {
  const e = event.toLowerCase();
  if (e.includes("intrusion")) return "intrusion";
  if (e.includes("watchlist") || e.includes("face")) return "face";
  if (e.includes("vehicle") || e.includes("car") || e.includes("truck")) return "vehicle";
  if (e.includes("suspicious")) return "suspicious";
  return "human";
}

const ICONS: Record<string, React.ElementType> = {
  intrusion: ShieldAlert,
  face: User,
  vehicle: Truck,
  suspicious: Eye,
  human: Footprints,
};

export default function RecentEventsTable() {
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
      {/* Title */}
      <div style={{ padding: "8px 12px 7px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-1)" }}>Recent Events</span>
        <span style={{ fontSize: 8.5, color: "var(--text-3)", letterSpacing: "0.05em" }}>
          {liveEvents.length} TOTAL
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "64px 1fr 1.2fr 74px",
          padding: "4px 12px",
          background: "rgba(255,255,255,0.015)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {["Time", "Event", "Source", "Severity"].map((h) => (
          <div key={h} style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {liveEvents.map((ev, i) => {
          const Icon = ICONS[eventIconName(ev.event)];
          const color = SEV_COLOR[ev.severity];
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.04 * i }}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr 1.2fr 74px",
                alignItems: "center",
                gap: 6,
                padding: "6.5px 12px",
                borderBottom: "1px solid var(--border)",
                minHeight: 30,
              }}
            >
              {/* Time */}
              <span style={{ fontSize: 9.5, color: "var(--text-3)", fontFamily: "monospace" }}>{ev.time}</span>

              {/* Event */}
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: `${color}12`, border: `1px solid ${color}28`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon size={9} style={{ color }} strokeWidth={2} />
                </span>
                <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ev.event}
                </span>
              </span>

              {/* Source */}
              <span style={{ fontSize: 9, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ev.source}
              </span>

              {/* Severity */}
              <span
                style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                  color,
                  background: `${color}14`,
                  border: `1px solid ${color}2e`,
                  padding: "1.5px 5px", borderRadius: 3,
                  width: "fit-content",
                  textAlign: "center",
                }}
              >
                {ev.severity}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
