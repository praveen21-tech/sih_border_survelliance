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
            width: 24,
            height: 24,
            borderRadius: "var(--r)",
            background: "var(--navy-lt)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Lightbulb size={13} style={{ color: "var(--navy)" }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.01em" }}>
            Recent Audio Intelligence Insights
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
            Summaries generated from acoustic event patterns
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div style={{ padding: "10px 12px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] ?? Mic;
          return (
            <div
              key={i}
              style={{
                background: "#F4F6FB",
                border: "1px solid var(--border-lt)",
                borderRadius: "var(--r)",
                padding: "9px 11px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "var(--r)",
                  background: "var(--green-lt)",
                  border: "1px solid var(--low-bd)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={12} style={{ color: "var(--green)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: "var(--text)", lineHeight: 1.5, fontWeight: 600 }}>{ins.text}</div>
                {ins.sector && (
                  <div
                    style={{
                      display: "inline-flex",
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
          );
        })}
      </div>
    </div>
  );
}