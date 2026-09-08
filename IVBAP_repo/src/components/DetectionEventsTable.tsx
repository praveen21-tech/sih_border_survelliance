"use client";

import { ArrowRight } from "lucide-react";
import type { DetectionEvent } from "@/lib/liveMonitoringData";

interface DetectionEventsTableProps {
  events: DetectionEvent[];
}

const severityColors = {
  critical: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)", text: "#EF4444" },
  high: { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.3)", text: "#F97316" },
  medium: { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.3)", text: "#EAB308" },
  low: { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)", text: "#22C55E" },
};

export default function DetectionEventsTable({ events }: DetectionEventsTableProps) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--text-1)",
              lineHeight: 1,
            }}
          >
            Recent Detection Events
          </h2>
          <p style={{ fontSize: 7.5, color: "var(--text-3)", marginTop: 2 }}>
            Latest AI detections across all cameras
          </p>
        </div>
        <button
          style={{
            padding: "3px 9px",
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 4,
            fontSize: 8,
            fontWeight: 600,
            color: "#3B82F6",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.1)";
          }}
        >
          View All
          <ArrowRight size={9} />
        </button>
      </div>

      {/* Table (scrolls internally) */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {["Time", "Camera", "Event", "Location", "Severity"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "5px 10px",
                    textAlign: "left",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    position: "sticky",
                    top: 0,
                    background: "var(--panel)",
                    zIndex: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => {
              const colors = severityColors[event.severity];
              return (
                <tr
                  key={event.id}
                  style={{
                    borderBottom:
                      index < events.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "4px 10px" }}>
                    <div
                      style={{
                        fontSize: 8,
                        color: "var(--text-2)",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.time}
                    </div>
                  </td>
                  <td style={{ padding: "4px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 26,
                          height: 18,
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border)",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(135deg, #0a1628 0%, #162847 100%)",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 600,
                          color: "var(--text-1)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.camera}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "4px 10px" }}>
                    <div
                      style={{
                        fontSize: 8.5,
                        color: "var(--text-1)",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.event}
                    </div>
                  </td>
                  <td style={{ padding: "4px 10px" }}>
                    <div
                      style={{
                        fontSize: 8,
                        color: "var(--text-2)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.location}
                    </div>
                  </td>
                  <td style={{ padding: "4px 10px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 7px",
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 3,
                        fontSize: 7.5,
                        fontWeight: 600,
                        color: colors.text,
                        textTransform: "capitalize",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.severity}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}