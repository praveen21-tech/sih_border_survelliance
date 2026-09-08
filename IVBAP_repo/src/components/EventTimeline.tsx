"use client";

import { motion } from "framer-motion";
import { ShieldAlert, User, Radio, Volume2, Truck, Users } from "lucide-react";
import { timelineEvents } from "@/lib/mockData";
import type { EventType, SeverityLevel, TimelineEvent } from "@/types";

const TYPE_ICON: Record<EventType, React.ElementType> = {
  intrusion:  ShieldAlert,
  watchlist:  User,
  drone:      Radio,
  audio:      Volume2,
  vehicle:    Truck,
  human:      Users,
  camera:     ShieldAlert,
  checkpoint: ShieldAlert,
};

const SEV_COLOR: Record<SeverityLevel, string> = {
  critical: "#EF4444",
  high:     "#F97316",
  medium:   "#EAB308",
  low:      "#22C55E",
};

function TlRow({ ev, index, isLast }: { ev: TimelineEvent; index: number; isLast: boolean }) {
  const Icon = TYPE_ICON[ev.type];
  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: 0.04 * index }}
      style={{
        display: "flex",
        gap: 8,
        padding: "6px 12px",
        transition: "background 0.12s",
        cursor: "default",
      }}
      onHoverStart={(e) => {
        const el = (e.target as HTMLElement).closest?.("[data-tlrow]") as HTMLElement | null;
        if (el) el.style.background = "rgba(255,255,255,0.02)";
      }}
      onHoverEnd={(e) => {
        const el = (e.target as HTMLElement).closest?.("[data-tlrow]") as HTMLElement | null;
        if (el) el.style.background = "transparent";
      }}
    >
      {/* Time */}
      <span style={{
        width: 30, flexShrink: 0,
        fontSize: 9.5, color: "var(--text-3)",
        fontFamily: "monospace", paddingTop: 1,
      }}>
        {ev.time}
      </span>

      {/* Dot + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: ev.dotColor,
          boxShadow: `0 0 4px ${ev.dotColor}70`,
          marginTop: 2, flexShrink: 0,
        }} />
        {!isLast && (
          <div style={{ width: 1, flex: 1, minHeight: 10, background: "rgba(255,255,255,0.07)", marginTop: 2 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
          <Icon size={10} style={{ color: SEV_COLOR[ev.severity], flexShrink: 0 }} strokeWidth={2} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-1)", lineHeight: 1.2 }} className="truncate">
            {ev.title}
          </span>
        </div>
        <p style={{ fontSize: 9.5, color: "var(--text-2)", lineHeight: 1.4 }} className="truncate">
          {ev.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function EventTimeline() {
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
      <div style={{
        padding: "8px 12px 7px",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-1)" }}>Event Timeline</span>
        <button style={{ fontSize: 10, color: "#3B82F6", background: "none", border: "none", cursor: "pointer" }}>
          View All →
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {timelineEvents.map((ev, i) => (
          <TlRow key={ev.id} ev={ev} index={i} isLast={i === timelineEvents.length - 1} />
        ))}
      </div>
    </div>
  );
}
