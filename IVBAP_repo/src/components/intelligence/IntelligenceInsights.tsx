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
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Lightbulb size={11} style={{ color: "#3B82F6" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", letterSpacing: "0.01em" }}>
            Intelligence Insights
          </div>
          <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
            Machine-generated summaries from detection patterns
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "6px 12px 8px", display: "flex", flexDirection: "column" }}>
        {insights.map((ins, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "6px 0",
              borderBottom: i < insights.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <span style={{ fontSize: 7, color: "var(--text-3)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginTop: 2, flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: "var(--text-2)", lineHeight: 1.5 }}>{ins.text}</div>
              {ins.sector && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 3,
                    fontSize: 7.5,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#3B82F6",
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 4,
                    padding: "1px 5px",
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