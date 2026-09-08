"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Menu, Lock, CheckCircle2 } from "lucide-react";

// ── Ashoka Chakra Vector Emblem ───────────────────────────────────────────────
function AshokaChakraEmblem() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.12)",
        border: "1.5px solid rgba(255, 255, 255, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      title="भारत सरकार • Government of India"
    >
      <svg
        className="ashoka-chakra"
        viewBox="0 0 100 100"
        style={{ width: 26, height: 26 }}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        <circle cx="50" cy="50" r="7" fill="#FFFFFF" />
        <g stroke="#FFFFFF" strokeWidth="1.6">
          <line x1="50" y1="7" x2="50" y2="43" />
          <line x1="63" y1="9" x2="53.5" y2="43" />
          <line x1="75" y1="16" x2="56.5" y2="44" />
          <line x1="84" y1="27" x2="58.5" y2="46" />
          <line x1="90" y1="40" x2="59.5" y2="49" />
          <line x1="90" y1="54" x2="59.5" y2="51" />
          <line x1="84" y1="67" x2="58.5" y2="54" />
          <line x1="75" y1="78" x2="56.5" y2="56" />
          <line x1="63" y1="85" x2="53.5" y2="57" />
          <line x1="50" y1="89" x2="50" y2="57" />
          <line x1="37" y1="85" x2="46.5" y2="57" />
          <line x1="25" y1="78" x2="43.5" y2="56" />
          <line x1="16" y1="67" x2="41.5" y2="54" />
          <line x1="10" y1="54" x2="40.5" y2="51" />
          <line x1="10" y1="40" x2="40.5" y2="49" />
          <line x1="16" y1="27" x2="41.5" y2="46" />
          <line x1="25" y1="16" x2="43.5" y2="44" />
          <line x1="37" y1="9" x2="46.5" y2="43" />
          <line x1="44" y1="7.5" x2="48" y2="43" />
          <line x1="57" y1="7.5" x2="52" y2="43" />
          <line x1="70" y1="12" x2="55.5" y2="43.5" />
          <line x1="80" y1="21" x2="57.5" y2="45" />
          <line x1="87" y1="33" x2="59" y2="47.5" />
          <line x1="87" y1="61" x2="59" y2="52.5" />
        </g>
      </svg>
    </div>
  );
}

// ── Live IST Military Clock ───────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;

  const date = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span
          style={{
            fontSize: 7.5,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--font-mono, 'Roboto Mono', monospace)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          IST
        </span>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "var(--font-mono, 'Roboto Mono', monospace)",
            letterSpacing: "0.06em",
            lineHeight: 1,
          }}
        >
          {time}
        </span>
      </div>
      <span
        style={{
          fontSize: 8,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "var(--font-mono, 'Roboto Mono', monospace)",
          letterSpacing: "0.02em",
        }}
      >
        {date}
      </span>
    </div>
  );
}

// ── Restricted Security Badge ─────────────────────────────────────────────────
function RestrictedBadge() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 9px",
        borderRadius: 4,
        background: "rgba(183, 28, 28, 0.25)",
        border: "1px solid rgba(183, 28, 28, 0.6)",
        flexShrink: 0,
      }}
    >
      <Lock size={11} style={{ color: "#FFAAAA" }} />
      <div>
        <div
          style={{
            fontSize: 8.5,
            fontWeight: 800,
            color: "#FFFFFF",
            fontFamily: "var(--font-mono, 'Roboto Mono', monospace)",
            letterSpacing: "0.1em",
            lineHeight: 1,
          }}
        >
          RESTRICTED
        </div>
        <div
          style={{
            fontSize: 7,
            color: "rgba(255, 255, 255, 0.55)",
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          Authorised Personnel Only
        </div>
      </div>
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
        borderRadius: 4,
        border: "1px solid var(--border)",
        overflow: "hidden",
        flexShrink: 0,
        background: "#FFFFFF",
      }}
    >
      {RANGES.map((r, i) => {
        const active = r === value;
        return (
          <button
            key={r}
            onClick={() => onChange(r)}
            style={{
              padding: "3px 9px",
              fontSize: 9.5,
              fontWeight: active ? 700 : 500,
              color: active ? "#FFFFFF" : "var(--text-2)",
              background: active ? "var(--navy)" : "transparent",
              border: "none",
              borderRight:
                i < RANGES.length - 1 ? "1px solid var(--border-lt)" : "none",
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
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 4,
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--navy)", whiteSpace: "nowrap" }}>
        All Sectors / सभी सेक्टर
      </span>
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 3.5L5 6.5L8 3.5"
          stroke="var(--text-3)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
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
          width: 28,
          height: 28,
          borderRadius: 4,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        title="Active Alerts"
      >
        <Bell size={13} style={{ color: "#FFFFFF" }} />
      </button>
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{
          position: "absolute",
          top: -2,
          right: -2,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#EF4444",
          border: "1.5px solid var(--navy-2)",
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
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 99,
        background: "var(--green-lt)",
        border: "1px solid var(--low-bd)",
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--green)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 9.5, color: "var(--green)", fontWeight: 700, whiteSpace: "nowrap" }}>
        DEFNET-SEC Operational
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
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: open ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.12)",
        border: `1px solid rgba(255, 255, 255, 0.3)`,
        borderRadius: 4,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <Menu size={15} style={{ color: "#FFFFFF" }} />
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
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* ── National Tricolour Ribbon (5px) ── */}
      <div className="tricolor-bar">
        <span className="tc-saffron" />
        <span className="tc-white" />
        <span className="tc-green" />
      </div>

      {/* ── Main Government Navy-2 Header Bar ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "0 16px",
          height: 58,
          flexShrink: 0,
          background: "var(--navy-2)",
          borderBottom: "3px solid var(--chakra)",
          color: "#FFFFFF",
        }}
      >
        {/* ── Left: hamburger + emblem + institutional header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <Hamburger open={sidebarOpen} onClick={onToggleSidebar} />

          <AshokaChakraEmblem />

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.2 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--gold)",
                  fontFamily: "'Noto Sans Devanagari', sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                भारत सरकार &bull; Government of India
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>|</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Ministry of Home Affairs &mdash; Border Security Division
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <h1
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  letterSpacing: "0.01em",
                  lineHeight: 1.1,
                }}
              >
                BorderEye AI <span style={{ fontWeight: 400, color: "#A8C8F0" }}>Surveillance Platform</span>
              </h1>
              <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.5)", display: "inline-block" }}>
                &bull; {title}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: institutional badges & live IST clock ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
            flexWrap: "nowrap",
          }}
        >
          {/* Restricted Clearance Badge */}
          <RestrictedBadge />

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />

          {/* Live IST Clock */}
          <LiveClock />

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />

          {/* Notification Bell */}
          <NotifBell />
        </div>
      </header>

      {/* ── Government Sub-Header Status Strip (.status-bar) ── */}
      <div
        style={{
          background: "var(--navy-lt)",
          borderBottom: "1px solid var(--border)",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 32,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            System Status / प्रणाली स्थिति
          </span>
          <div style={{ width: 1, height: 14, background: "var(--border)" }} />
          <SystemStatus />
          <div style={{ width: 1, height: 14, background: "var(--border)" }} />
          <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            Models: YOLOv8 &bull; OSNet Re-ID &bull; Fast-ANPR &bull; YAMNet Audio
          </span>
        </div>

        {!minimal && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SectorDropdown />
            <RangeFilter value={range} onChange={setRange} />
          </div>
        )}
      </div>
    </div>
  );
}
