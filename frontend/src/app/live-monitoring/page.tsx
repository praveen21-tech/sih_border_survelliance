"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import LiveMonitoringLoader from "@/components/LiveMonitoringLoader";
import CameraFeedCard from "@/components/CameraFeedCard";
import LiveAnalyticsPanel from "@/components/LiveAnalyticsPanel";
import DetectionEventsTable from "@/components/DetectionEventsTable";
import GovFooter from "@/components/GovFooter";
import {
  cameraFeeds,
  analyticsMetrics,
  detectionEvents,
} from "@/lib/liveMonitoringData";

const CameraMap = dynamic(() => import("@/components/CameraMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.08)",
          borderTopColor: "rgba(59,130,246,0.6)",
          animation: "spin 0.9s linear infinite",
        }}
      />
    </div>
  );
}

export default function LiveMonitoringPage() {
  const [booting, setBooting] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expandedFeed = cameraFeeds.find((f) => f.id === expandedId) ?? null;

  return (
    <div
      style={{
        height: "100dvh",
        width: "100dvw",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        title="Live Monitoring"
        subtitle="Real-time camera feeds and AI detection across all border sectors."
        minimal
      />

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 8,
          padding: 8,
        }}
      >
        {/* Left column */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Camera grid (or maximized feed) */}
          <div
            style={{
              flex: "0 0 58%",
              minHeight: 0,
              position: "relative",
            }}
          >
            {expandedFeed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                style={{ position: "absolute", inset: 0 }}
              >
                <CameraFeedCard
                  feed={expandedFeed}
                  expanded
                  onCollapse={() => setExpandedId(null)}
                />
              </motion.div>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                  gap: 6,
                }}
              >
                {cameraFeeds.map((feed) => (
                  <CameraFeedCard
                    key={feed.id}
                    feed={feed}
                    onExpand={() => setExpandedId(feed.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detection events */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <DetectionEventsTable events={detectionEvents} />
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            width: 252,
            flexShrink: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <LiveAnalyticsPanel metrics={analyticsMetrics} />
          </div>
          <div style={{ height: 180, flexShrink: 0 }}>
            <CameraMap />
          </div>
        </div>
      </div>

      {/* Institutional Government Footer */}
      <GovFooter />

      {/* ── Boot loader ── */}
      <AnimatePresence>
        {booting && <LiveMonitoringLoader onComplete={() => setBooting(false)} />}
      </AnimatePresence>
    </div>
  );
}