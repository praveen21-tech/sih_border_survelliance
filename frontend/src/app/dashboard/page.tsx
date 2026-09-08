"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import EventTimeline from "@/components/EventTimeline";
import RecentAlerts from "@/components/RecentAlerts";
import GovFooter from "@/components/GovFooter";
import { kpiCards } from "@/lib/mockData";

const HeatmapPanel = dynamic(() => import("@/components/HeatmapPanel"), {
  ssr: false,
  loading: () => (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: 10, display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>Border Threat Heatmap</h2>
        <p style={{ fontSize: 9.5, color: "var(--text-2)", marginTop: 1 }}>Real-time risk visualization across border sectors</p>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.15)", borderTopColor: "#3B82F6", animation: "spin 0.9s linear infinite" }} />
        <span style={{ fontSize: 9.5, color: "var(--text-3)", fontFamily: "monospace" }}>LOADING MAP…</span>
      </div>
    </div>
  ),
});

const I = { opacity: 0, y: 8 } as const;
const A = { opacity: 1, y: 0 } as const;

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Sidebar — fixed overlay, completely hidden when closed */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main — always full width, sidebar overlaps it */}
      <div style={{ height: "100dvh", width: "100dvw", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        {/* Body — NO scroll; everything must fit */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "10px 14px",
          gap: 10,
          overflow: "hidden",
        }}>

          {/* ── KPI row ── */}
          <motion.div
            initial={I} animate={A}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", gap: 10, flexShrink: 0 }}
          >
            {kpiCards.map((card, i) => (
              <KPICard key={card.id} card={card} index={i} />
            ))}
          </motion.div>

          {/* ── Main grid: heatmap 70% + right column 30% ── */}
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 268px",
            gap: 10,
          }}>
            {/* LEFT — heatmap dominates */}
            <motion.div
              initial={I} animate={A}
              transition={{ duration: 0.3, delay: 0.06 }}
              style={{ minHeight: 0, display: "flex", flexDirection: "column" }}
            >
              <HeatmapPanel />
            </motion.div>

            {/* RIGHT — timeline top, alerts bottom */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>

              {/* Timeline — fixed height so it doesn't crush alerts */}
              <motion.div
                initial={I} animate={A}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{ flex: "0 0 52%", minHeight: 0 }}
              >
                <EventTimeline />
              </motion.div>

              {/* Alerts */}
              <motion.div
                initial={I} animate={A}
                transition={{ duration: 0.3, delay: 0.14 }}
                style={{ flex: 1, minHeight: 0 }}
              >
                <RecentAlerts />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Institutional Government Footer */}
        <GovFooter />
      </div>
    </>
  );
}
