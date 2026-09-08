"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle, Fence, ScanFace } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KpiCard from "@/components/intelligence/KpiCard";
import TrendChart from "@/components/intelligence/TrendChart";
import DistributionDonut from "@/components/intelligence/DistributionDonut";
import SectorRiskTable from "@/components/intelligence/SectorRiskTable";
import ActiveCamerasTable from "@/components/intelligence/ActiveCamerasTable";
import RecentThreatEvents from "@/components/intelligence/RecentThreatEvents";
import IntelligenceInsights from "@/components/intelligence/IntelligenceInsights";
import {
  RANGE_OPTIONS,
  SECTOR_OPTIONS,
  kpisByRange,
  kpiTrends,
  kpiSparks,
  trendByRange,
  distributionBase,
  sectorRisks,
  activeCameras,
  threatEvents,
  insights,
  type ThreatRange,
} from "@/lib/threatIntelligenceData";

export default function ThreatIntelligencePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState<ThreatRange>("7d");
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);

  const kpis = kpisByRange[range];
  const trend = kpiTrends[range];
  const sparks = kpiSparks[range];
  const series = trendByRange[range];

  const total = kpis.totalThreats;
  const distribution = distributionBase
    .map((s) => ({ name: s.name, color: s.color, value: Math.max(1, Math.round(s.pct * total)) }))
    .reduce<{ name: string; value: number; color: string }[]>((acc, s) => {
      const idx = acc.findIndex((a) => a.name === s.name);
      if (idx === -1) acc.push(s);
      else acc[idx].value += s.value;
      return acc;
    }, []);

  const filteredCameras = sector === "All Sectors" ? activeCameras : activeCameras.filter((c) => c.sector === sector);
  const filteredEvents = sector === "All Sectors" ? threatEvents : threatEvents.filter((e) => e.sector === sector);
  const filteredInsights =
    sector === "All Sectors" ? insights : insights.filter((i) => i.sector === null || i.sector === sector);

  const iconTone: Record<string, { color: string }> = {
    blue: { color: "#3B82F6" },
    red: { color: "#EF4444" },
    orange: { color: "#F97316" },
    yellow: { color: "#EAB308" },
  };

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
          title="Threat Intelligence"
          subtitle="Threat analysis and intelligence insights across monitored sectors"
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
            {/* Date range */}
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
                {RANGE_OPTIONS.map((opt) => {
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

            {/* Sector filter */}
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
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 1 — KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <KpiCard label="Total Threats" value={kpis.totalThreats} trend={trend.total} spark={sparks.total} color={iconTone.blue.color} icon={ShieldAlert} />
            <KpiCard label="Critical Threats" value={kpis.criticalThreats} trend={trend.critical} spark={sparks.critical} color={iconTone.red.color} icon={AlertTriangle} />
            <KpiCard label="Intrusion Events" value={kpis.intrusionEvents} trend={trend.intrusion} spark={sparks.intrusion} color={iconTone.orange.color} icon={Fence} />
            <KpiCard label="Watchlist Hits" value={kpis.watchlistHits} trend={trend.watchlist} spark={sparks.watchlist} color={iconTone.yellow.color} icon={ScanFace} />
          </div>

          {/* SECTION 2 — Threat trend chart */}
          <TrendChart data={series} />

          {/* SECTION 3 + 4 — sectors left, distribution right */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 10, alignItems: "stretch" }}>
            <SectorRiskTable risks={sectorRisks} />
            <DistributionDonut slices={distribution} />
          </div>

          {/* SECTION 5 + 6 — active cameras left, recent events right */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.55fr) minmax(0, 1fr)", gap: 10, alignItems: "stretch" }}>
            <ActiveCamerasTable cameras={filteredCameras} />
            <RecentThreatEvents events={filteredEvents} />
          </div>

          {/* SECTION 7 — Intelligence insights */}
          <IntelligenceInsights insights={filteredInsights} />
        </div>
      </div>
    </>
  );
}