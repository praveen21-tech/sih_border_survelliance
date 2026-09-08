"use client";

import { useState } from "react";
import { Volume2, AlertTriangle, Mic, Radio } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KpiCard from "@/components/intelligence/KpiCard";
import DistributionDonut from "@/components/intelligence/DistributionDonut";
import AudioTimelineChart from "@/components/audio/AudioTimelineChart";
import SectorAudioBars from "@/components/audio/SectorAudioBars";
import AudioAlertsTable from "@/components/audio/AudioAlertsTable";
import AudioInsights from "@/components/audio/AudioInsights";
import {
  AUDIO_RANGE_OPTIONS,
  AUDIO_SECTOR_OPTIONS,
  audioKpisByRange,
  audioKpiTrends,
  audioKpiSparks,
  audioTrendByRange,
  audioDistributionBase,
  audioAlerts,
  sectorAudioActivity,
  audioInsights,
  type AudioRange,
} from "@/lib/audioIntelligenceData";

export default function AudioIntelligencePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState<AudioRange>("today");
  const [sector, setSector] = useState(AUDIO_SECTOR_OPTIONS[0]);

  const kpis = audioKpisByRange[range];
  const trends = audioKpiTrends[range];
  const sparks = audioKpiSparks[range];
  const series = audioTrendByRange[range];

  const total = kpis.events;
  const distribution = audioDistributionBase
    .map((s) => ({ name: s.name, color: s.color, value: Math.max(1, Math.round(s.pct * total)) }))
    .reduce<{ name: string; value: number; color: string }[]>((acc, s) => {
      const idx = acc.findIndex((a) => a.name === s.name);
      if (idx === -1) acc.push(s);
      else acc[idx].value += s.value;
      return acc;
    }, []);

  const filteredAlerts = sector === "All Sectors" ? audioAlerts : audioAlerts.filter((a) => a.sector === sector);
  const filteredInsights =
    sector === "All Sectors" ? audioInsights : audioInsights.filter((i) => i.sector === null || i.sector === sector);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          title="Audio Intelligence"
          subtitle="Monitor and analyze acoustic events across border sectors"
          minimal
        />

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "8px 12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Filter toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Range
              </span>
              <div
                style={{
                  display: "inline-flex",
                  gap: 2,
                  padding: 2,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}
              >
                {AUDIO_RANGE_OPTIONS.map((opt) => {
                  const active = range === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setRange(opt.id)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 5,
                        fontSize: 8,
                        fontWeight: 600,
                        color: active ? "#FFFFFF" : "var(--text-3)",
                        background: active ? "rgba(59,130,246,0.18)" : "transparent",
                        border: `1px solid ${active ? "rgba(59,130,246,0.35)" : "transparent"}`,
                        cursor: "pointer",
                        transition: "all 0.12s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Sector
              </span>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 8.5,
                  color: "var(--text-1)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {AUDIO_SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ROW 1 — Audio overview KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <KpiCard label="Audio Events Today" value={kpis.events} trend={trends.events} spark={sparks.events} color="#3B82F6" icon={Volume2} />
            <KpiCard label="Critical Audio Threats" value={kpis.critical} trend={trends.critical} spark={sparks.critical} color="#EF4444" icon={AlertTriangle} />
            <KpiCard label="Distress Signals" value={kpis.distress} trend={trends.distress} spark={sparks.distress} color="#F97316" icon={Mic} />
            <KpiCard label="Active Audio Sensors" value={kpis.sensors} trend={trends.sensors} spark={sparks.sensors} color="#22C55E" icon={Radio} />
          </div>

          {/* ROW 2 — timeline + distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 3fr)", gap: 10, alignItems: "stretch" }}>
            <AudioTimelineChart data={series} />
            <DistributionDonut slices={distribution} />
          </div>

          {/* ROW 3 — live audio alerts */}
          <AudioAlertsTable alerts={filteredAlerts} />

          {/* ROW 4 — sector audio activity */}
          <SectorAudioBars data={sectorAudioActivity} />

          {/* ROW 5 — audio insights */}
          <AudioInsights insights={filteredInsights} />
        </div>
      </div>
    </>
  );
}