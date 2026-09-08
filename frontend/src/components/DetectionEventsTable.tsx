"use client";

import { ArrowRight } from "lucide-react";
import type { DetectionEvent } from "@/lib/liveMonitoringData";

interface DetectionEventsTableProps {
  events: DetectionEvent[];
}

const severityColors = {
  critical: { bg: "var(--crit-lt)", border: "var(--crit-bd)", text: "var(--crit)" },
  high: { bg: "var(--high-lt)", border: "var(--high-bd)", text: "var(--high)" },
  medium: { bg: "var(--medium-lt)", border: "var(--medium-bd)", text: "var(--medium)" },
  low: { bg: "var(--green-lt)", border: "var(--low-bd)", text: "var(--green)" },
};

export default function DetectionEventsTable({ events }: DetectionEventsTableProps) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "#F4F6FB",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h2
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--navy)",
                lineHeight: 1,
              }}
            >
              Recent Detection Events
            </h2>
            <span
              style={{
                fontSize: 9,
                color: "var(--saffron)",
                fontFamily: "'Noto Sans Devanagari', sans-serif",
                fontWeight: 700,
              }}
            >
              डिटेक्शन घटनाएं
            </span>
          </div>
          <p style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 2 }}>
            Real-time AI surveillance events &bull; SHA-256 verified logs
          </p>
        </div>
        <button
          style={{
            padding: "4px 10px",
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 700,
            color: "var(--navy)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--navy-lt)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
          }}
        >
          View All
          <ArrowRight size={10} />
        </button>
      </div>

      {/* Table (scrolls internally) */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "2px solid var(--border)",
                background: "#F4F6FB",
              }}
            >
              {["Time", "Camera", "Event", "Location", "Severity"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "6px 10px",
                    textAlign: "left",
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    position: "sticky",
                    top: 0,
                    background: "#F4F6FB",
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
                      index < events.length - 1 ? "1px solid var(--border-lt)" : "none",
                    background: "#FFFFFF",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F8FAFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                  }}
                >
                  <td style={{ padding: "5px 10px" }}>
                    <div
                      style={{
                        fontSize: 8.5,
                        color: "var(--text-2)",
                        fontFamily: "var(--mono, monospace)",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                    >
                      {event.time}
                    </div>
                  </td>
                  <td style={{ padding: "5px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--navy)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(event as any).camera || event.cameraName}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "5px 10px" }}>
                    <div
                      style={{
                        fontSize: 9,
                        color: ((event as any).event || event.type || "").includes("Criminal")
                          ? "var(--crit)"
                          : ((event as any).event || event.type || "").includes("Trespass") || ((event as any).event || event.type || "").includes("Intrusion")
                          ? "var(--crit)"
                          : ((event as any).event || event.type || "").includes("Cross-Camera")
                          ? "var(--chakra)"
                          : ((event as any).event || event.type || "").includes("Plate")
                          ? "var(--high)"
                          : "var(--text)",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {(event as any).event || event.type}
                    </div>
                  </td>
                  <td style={{ padding: "5px 10px" }}>
                    <div
                      style={{
                        fontSize: 8.5,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(event as any).location || event.description}
                    </div>
                  </td>
                  <td style={{ padding: "5px 10px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 7px",
                        background: ((event as any).event || event.type || "").includes("Criminal")
                          ? "var(--crit-lt)"
                          : ((event as any).event || event.type || "").includes("Cross-Camera")
                          ? "var(--navy-lt)"
                          : colors.bg,
                        border: ((event as any).event || event.type || "").includes("Criminal")
                          ? "1px solid var(--crit-bd)"
                          : ((event as any).event || event.type || "").includes("Cross-Camera")
                          ? "1px solid var(--border)"
                          : `1px solid ${colors.border}`,
                        borderRadius: 3,
                        fontSize: 8,
                        fontWeight: 700,
                        color: ((event as any).event || event.type || "").includes("Criminal")
                          ? "var(--crit)"
                          : ((event as any).event || event.type || "").includes("Cross-Camera")
                          ? "var(--navy)"
                          : colors.text,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {((event as any).event || event.type || "").includes("Criminal")
                        ? "WANTED"
                        : ((event as any).event || event.type || "").includes("Cross-Camera")
                        ? "CROSS-CAM"
                        : event.severity.toUpperCase()}
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