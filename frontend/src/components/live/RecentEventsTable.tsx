"use client";

import { motion } from "framer-motion";
import { ShieldAlert, User, Truck, Eye, Footprints } from "lucide-react";
import { liveEvents } from "@/lib/liveData";
import type { LiveEvent } from "@/lib/liveData";

const SEV_COLOR: Record<LiveEvent["severity"], { bg: string; fg: string; border: string }> = {
  critical: { bg: "#FDE8E8", fg: "#B71C1C", border: "#EF9A9A" },
  high: { bg: "#FFF0E0", fg: "#C05000", border: "#FFCC80" },
  medium: { bg: "#E3F0FB", fg: "#0D5EA6", border: "#90CAF9" },
  low: { bg: "#EBF5EF", fg: "#1A6B3C", border: "#A5D6A7" },
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
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderTop: "3px solid var(--navy)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "var(--sh)",
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: "9px 14px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border-lt)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--navy)" }}>Recent Surveillance Events</span>
        <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
          {liveEvents.length} TOTAL
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "64px 1fr 1.2fr 78px",
          padding: "6px 14px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border-lt)",
          flexShrink: 0,
        }}
      >
        {["Time", "Event", "Source", "Severity"].map((h) => (
          <div key={h} style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {liveEvents.map((ev, i) => {
          const Icon = ICONS[eventIconName(ev.event)];
          const sev = SEV_COLOR[ev.severity];
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.04 * i }}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr 1.2fr 78px",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderBottom: "1px solid var(--border-lt)",
                minHeight: 32,
                background: "#FFFFFF",
              }}
            >
              {/* Time */}
              <span style={{ fontSize: 9.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {ev.time}
              </span>

              {/* Event */}
              <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    background: sev.bg, border: `1px solid ${sev.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon size={10} style={{ color: sev.fg }} strokeWidth={2.2} />
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ev.event}
                </span>
              </span>

              {/* Source */}
              <span style={{ fontSize: 9.5, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ev.source}
              </span>

              {/* Severity */}
              <span
                style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
                  color: sev.fg,
                  background: sev.bg,
                  border: `1px solid ${sev.border}`,
                  padding: "2px 6px", borderRadius: 3,
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
