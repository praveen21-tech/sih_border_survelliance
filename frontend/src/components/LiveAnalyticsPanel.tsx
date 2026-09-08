"use client";

import { useState } from "react";
import {
  Moon,
  User,
  Users,
  Car,
  ScanFace,
  AlertTriangle,
  ShieldAlert,
  Eye,
  FileText,
  Fence,
  UserCheck,
} from "lucide-react";
import type { AnalyticsMetric } from "@/lib/liveMonitoringData";

interface LiveAnalyticsPanelProps {
  metrics: AnalyticsMetric[];
}

const iconMap: Record<string, any> = {
  User,
  Users,
  Car,
  ScanFace,
  AlertTriangle,
  ShieldAlert,
  Eye,
  FileText,
};

export default function LiveAnalyticsPanel({ metrics }: LiveAnalyticsPanelProps) {
  const [nightMode, setNightMode] = useState(false);
  const [fenceOn, setFenceOn] = useState(true);
  const [watchlistOn, setWatchlistOn] = useState(true);

  const toggleStyle = (active: boolean) => ({
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    border: "1px solid",
    transition: "background 0.15s, color 0.15s, border-color 0.15s",
    ...(active
      ? {
          background: "rgba(34,197,94,0.15)",
          borderColor: "rgba(34,197,94,0.35)",
          color: "#22C55E",
        }
      : {
          background: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.12)",
          color: "var(--text-3)",
        }),
  });

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "6px 9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}>
            Live Analytics
          </h2>
          <p style={{ fontSize: 7.5, color: "var(--text-3)", marginTop: 2 }}>
            Real-time detection statistics
          </p>
        </div>
        <button
          onClick={() => setNightMode(!nightMode)}
          title="Toggle Night Surveillance"
          style={{
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: nightMode ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: nightMode ? "1px solid rgba(59,130,246,0.35)" : "1px solid var(--border)",
            borderRadius: 5,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <Moon size={11} style={{ color: nightMode ? "#3B82F6" : "var(--text-3)" }} />
        </button>
      </div>

      {/* Feature toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 9px",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: fenceOn ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
              border: fenceOn ? "1px solid rgba(34,197,94,0.25)" : "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Fence size={12} style={{ color: fenceOn ? "#22C55E" : "var(--text-3)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}>
              Virtual Fence
            </div>
            <div style={{ fontSize: 7.5, color: "var(--text-3)", marginTop: 2 }}>
              {fenceOn ? "Monitoring active zones" : "Disabled"}
            </div>
          </div>
          <button onClick={() => setFenceOn(!fenceOn)} style={toggleStyle(fenceOn)}>
            {fenceOn ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 9px",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: watchlistOn ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
              border: watchlistOn ? "1px solid rgba(34,197,94,0.25)" : "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserCheck size={12} style={{ color: watchlistOn ? "#22C55E" : "var(--text-3)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}>
              Watchlist Monitoring
            </div>
            <div style={{ fontSize: 7.5, color: "var(--text-3)", marginTop: 2 }}>
              {watchlistOn ? "Live face & cross-cam matching" : "Disabled"}
            </div>
          </div>
          <button onClick={() => setWatchlistOn(!watchlistOn)} style={toggleStyle(watchlistOn)}>
            {watchlistOn ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        <div
          style={{
            background: "var(--panel)",
            border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: 6,
            padding: "6px 9px",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Eye size={12} style={{ color: "#A855F7" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-1)", lineHeight: 1 }}>
              Cross-Camera Tracking
            </div>
            <div style={{ fontSize: 7.5, color: "#C084FC", marginTop: 2 }}>
              CAM-01 Ingress → CAM-03 Re-Appearance
            </div>
          </div>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: 3,
              fontSize: 7,
              fontWeight: 800,
              background: "rgba(168,85,247,0.2)",
              color: "#C084FC",
              border: "1px solid rgba(168,85,247,0.4)",
            }}
          >
            SYNCED
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 5,
          alignContent: "start",
        }}
      >
        {metrics.map((metric) => {
          const Icon = iconMap[metric.icon] || User;
          const isPositive = metric.trend >= 0;
          return (
            <div
              key={metric.id}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "7px 9px",
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
                    background: "rgba(59,130,246,0.1)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={11} style={{ color: "#3B82F6" }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>
                  {metric.value}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 7.5,
                    color: "var(--text-3)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {metric.label}
                </div>
                {metric.trend !== 0 && (
                  <div
                    style={{
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: isPositive ? "#22C55E" : "#EF4444",
                      flexShrink: 0,
                    }}
                  >
                    {isPositive ? "↑" : "↓"} {Math.abs(metric.trend)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}