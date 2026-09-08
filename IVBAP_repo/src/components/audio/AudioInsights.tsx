"use client";

import { Mic, Zap, Activity, Users, Lightbulb, type LucideIcon } from "lucide-react";
import type { AudioInsight } from "@/lib/audioIntelligenceData";

const ICONS: Record<string, LucideIcon> = {
  mic: Mic,
  zap: Zap,
  activity: Activity,
  users: Users,
};

interface AudioInsightsProps {
  insights: AudioInsight[];
}

export default function AudioInsights({ insights }: AudioInsightsProps) {
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
            Recent Audio Intelligence Insights
          </div>
          <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1 }}>
            Summaries generated from acoustic event patterns
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div style={{ padding: "8px 12px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] ?? Mic;
          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "8px 9px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={10} style={{ color: "#22C55E" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: "var(--text-2)", lineHeight: 1.5 }}>{ins.text}</div>
                {ins.sector && (
                  <div
                    style={{
                      display: "inline-flex",
                      marginTop: 4,
                      fontSize: 7,
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
          );
        })}
      </div>
    </div>
  );
}