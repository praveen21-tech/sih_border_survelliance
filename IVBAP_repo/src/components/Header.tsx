"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Menu } from "lucide-react";

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;

  const date = now.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontSize: 10, color: "var(--text-3)",
          fontFamily: "monospace", letterSpacing: "0.02em",
        }}
      >
        {date}
      </span>
      <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)" }} />
      <span
        style={{
          fontSize: 12, fontWeight: 700, color: "var(--text-1)",
          fontFamily: "monospace", letterSpacing: "0.08em",
        }}
      >
        {time}
      </span>
    </div>
  );
}

// ── Time-range filter ─────────────────────────────────────────────────────────
const RANGES = ["Live", "Today", "7 Days", "30 Days"] as const;

function RangeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        borderRadius: 5,
        border: "1px solid rgba(255,255,255,0.10)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {RANGES.map((r, i) => {
        const active = r === value;
        return (
          <button
            key={r}
            onClick={() => onChange(r)}
            style={{
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              color: active ? "#fff" : "var(--text-2)",
              background: active ? "rgba(59,130,246,0.22)" : "transparent",
              border: "none",
              borderRight:
                i < RANGES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}

// ── Sector dropdown ───────────────────────────────────────────────────────────
function SectorDropdown() {
  return (
    <button
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 9px", borderRadius: 5,
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.10)",
        cursor: "pointer", flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, color: "var(--text-2)", whiteSpace: "nowrap" }}>
        All Sectors
      </span>
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 3.5L5 6.5L8 3.5"
          stroke="var(--text-3)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ── Notification bell ─────────────────────────────────────────────────────────
function NotifBell() {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        style={{
          width: 28, height: 28, borderRadius: 6,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Bell size={13} style={{ color: "var(--text-2)" }} />
      </button>
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{
          position: "absolute", top: -2, right: -2,
          width: 7, height: 7, borderRadius: "50%",
          background: "#EF4444",
          border: "1.5px solid var(--panel)",
          display: "block",
        }}
      />
    </div>
  );
}

// ── System status pill ────────────────────────────────────────────────────────
function SystemStatus() {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 9px", borderRadius: 5,
        background: "rgba(34,197,94,0.07)",
        border: "1px solid rgba(34,197,94,0.18)",
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#22C55E", flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 500, whiteSpace: "nowrap" }}>
        All Systems Operational
      </span>
    </div>
  );
}

// ── Hamburger button ──────────────────────────────────────────────────────────
interface HamburgerProps {
  open: boolean;
  onClick: () => void;
}

function Hamburger({ open, onClick }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      title={open ? "Close navigation" : "Open navigation"}
      style={{
        width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: open ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${open ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 6,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <Menu size={14} style={{ color: open ? "#3B82F6" : "var(--text-2)" }} />
    </button>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
  minimal?: boolean;
}

export default function Header({
  sidebarOpen,
  onToggleSidebar,
  title = "Operational Overview",
  subtitle = "Real-time insights across all border surveillance systems.",
  minimal = false,
}: HeaderProps) {
  const [range, setRange] = useState<string>("Today");

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 16px",
        height: 52,
        flexShrink: 0,
        background: "var(--panel)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* ── Left: hamburger + page title ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Hamburger open={sidebarOpen} onClick={onToggleSidebar} />

        <div>
          <h1
            style={{
              fontSize: 15, fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.01em", lineHeight: 1,
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 3, lineHeight: 1 }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* ── Right: controls ── */}
      <div
        style={{
          display: "flex", alignItems: "center",
          gap: 8, flexShrink: 0, flexWrap: "nowrap",
        }}
      >
        {!minimal && (
          <>
            {/* Time range */}
            <RangeFilter value={range} onChange={setRange} />

            {/* Sector */}
            <SectorDropdown />

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

            {/* Clock */}
            <LiveClock />

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

            {/* Bell */}
            <NotifBell />

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

            {/* System status */}
            <SystemStatus />
          </>
        )}

        {minimal && (
          <>
            {/* Clock */}
            <LiveClock />

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

            {/* Bell */}
            <NotifBell />
          </>
        )}
      </div>
    </header>
  );
}
