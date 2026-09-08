"use client";

import { Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/threatIntelligenceData";

interface IntelligenceInsightsProps {
  insights: Insight[];
}

export default function IntelligenceInsights({ insights }: IntelligenceInsightsProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        boxShadow: "var(--sh)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "var(--r)",
            background: "var(--navy-lt)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Lightbulb size={12} style={{ color: "var(--navy)" }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
            Intelligence Insights
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            Machine-generated summaries from detection patterns
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column" }}>
        {insights.map((ins, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "7px 0",
              borderBottom: i < insights.length - 1 ? "1px solid var(--border-lt)" : "none",
            }}
          >
            <span style={{ fontSize: 9.5, color: "var(--text-muted)", fontFamily: "var(--mono)", marginTop: 2, flexShrink: 0, fontWeight: 700 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>{ins.text}</div>
              {ins.sector && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 4,
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--navy)",
                    background: "var(--navy-lt)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    padding: "2px 6px",
                  }}
                >
                  {ins.sector}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}