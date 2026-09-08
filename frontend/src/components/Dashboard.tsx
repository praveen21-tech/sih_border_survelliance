"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, ArrowRight, Map, Radio } from "lucide-react";
import KPICard from "@/components/KPICard";
import RecentAlerts from "@/components/RecentAlerts";
import EventTimeline from "@/components/EventTimeline";
import { kpiCards } from "@/lib/mockData";

const BorderHeatmap = dynamic(() => import("@/components/BorderHeatmap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-6 w-6 rounded-full border-2 border-t-blue-500 animate-spin"
          style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }}
        />
        <p className="text-[11px]" style={{ color: "#334155" }}>Loading map…</p>
      </div>
    </div>
  ),
});

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
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono" style={{ color: "#64748b" }}>{date}</span>
      <span className="text-[11px] font-mono font-semibold" style={{ color: "#94a3b8" }}>{time}</span>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header
      className="flex shrink-0 items-center justify-between px-4 py-2"
      style={{
        background: "rgba(8,13,26,0.96)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(59,130,246,0.25), rgba(59,130,246,0.06))",
            border: "1.5px solid rgba(59,130,246,0.45)",
            boxShadow: "0 0 12px rgba(59,130,246,0.2)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 28 28" fill="none">
            <path
              d="M3 14C3 14 8 5 14 5C20 5 25 14 25 14C25 14 20 23 14 23C8 23 3 14 3 14Z"
              stroke="#60a5fa" strokeWidth="1.6" fill="none"
            />
            <circle cx="14" cy="14" r="3.5" stroke="#60a5fa" strokeWidth="1.4" fill="none" />
            <circle cx="14" cy="14" r="1.2" fill="#60a5fa" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold leading-tight" style={{ color: "#f1f5f9", letterSpacing: "0.01em" }}>
            BorderEye AI
          </div>
          <div className="text-[8px] tracking-[0.18em] uppercase" style={{ color: "#1e3a5f" }}>
            Secure Borders. Safer Tomorrow.
          </div>
        </div>
      </div>

      {/* Center — clock */}
      <LiveClock />

      {/* Right — live badge only */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <motion.div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#22c55e" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <Radio size={10} style={{ color: "#22c55e" }} />
          <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "#22c55e" }}>
            Live
          </span>
        </div>
      </div>
    </header>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function Panel({
  title,
  icon,
  action,
  children,
  delay = 0,
  subtitle,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  subtitle?: string;
}) {
  return (
    <motion.div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, rgba(14,21,42,0.95) 0%, rgba(9,14,28,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {icon}
            </div>
          )}
          <div>
            <span className="text-[12px] font-semibold" style={{ color: "#cbd5e1" }}>
              {title}
            </span>
            {subtitle && (
              <span className="ml-2 text-[10px]" style={{ color: "#334155" }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

function ViewAllLink() {
  return (
    <button
      className="flex items-center gap-1 cursor-pointer"
      style={{ background: "none", border: "none", color: "#3b82f6" }}
    >
      <span className="text-[10px] font-medium">View All</span>
      <ArrowRight size={10} style={{ color: "#3b82f6" }} />
    </button>
  );
}

// ── Background grid + glow ────────────────────────────────────────────────────
function BgEffects() {
  return (
    <>
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(59,130,246,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Top-left blue ambient */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          top: "-15%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)",
        }}
      />
      {/* Bottom-right purple ambient */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          bottom: "-10%",
          right: "-10%",
          width: "40%",
          height: "40%",
          background:
            "radial-gradient(ellipse, rgba(168,85,247,0.04) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: "#080d1a" }}
    >
      <BgEffects />

      <motion.div
        className="relative z-10 flex h-full flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <Navbar />

        {/* ── Content grid ── */}
        <div
          className="flex-1 min-h-0 grid p-2 gap-2"
          style={{
            /* Two rows: top fills available, bottom fixed-ish */
            gridTemplateRows: "1fr 34%",
          }}
        >
          {/* ── Top row: heatmap + kpi ── */}
          <div
            className="grid gap-2 min-h-0"
            style={{ gridTemplateColumns: "1fr 280px" }}
          >
            {/* Heatmap */}
            <Panel
              title="Border Threat Heatmap"
              subtitle="Live surveillance · threat density across sectors"
              icon={<Map size={12} style={{ color: "#64748b" }} />}
              delay={0.1}
            >
              <BorderHeatmap />
            </Panel>

            {/* KPI cards — 4 equal rows */}
            <div className="flex flex-col gap-2 min-h-0">
              {kpiCards.map((card, i) => (
                <KPICard key={card.id} card={card} index={i} />
              ))}
            </div>
          </div>

          {/* ── Bottom row: alerts + timeline ── */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Panel
              title="Recent Alerts"
              icon={<Bell size={12} style={{ color: "#64748b" }} />}
              action={<ViewAllLink />}
              delay={0.18}
            >
              <RecentAlerts />
            </Panel>

            <Panel
              title="Event Timeline"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#64748b" strokeWidth="1.6" />
                  <path d="M12 7v5l3 3" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              }
              action={<ViewAllLink />}
              delay={0.22}
            >
              <EventTimeline />
            </Panel>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
