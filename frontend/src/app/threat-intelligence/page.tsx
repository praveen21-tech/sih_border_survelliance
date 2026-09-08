"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, Fence, ScanFace, Radio, Activity } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KpiCard from "@/components/intelligence/KpiCard";
import TrendChart from "@/components/intelligence/TrendChart";
import DistributionDonut from "@/components/intelligence/DistributionDonut";
import SectorRiskTable from "@/components/intelligence/SectorRiskTable";
import ActiveCamerasTable from "@/components/intelligence/ActiveCamerasTable";
import RecentThreatEvents from "@/components/intelligence/RecentThreatEvents";
import IntelligenceInsights from "@/components/intelligence/IntelligenceInsights";
import Feature12QueryEngine from "@/components/query/Feature12QueryEngine";
import GovFooter from "@/components/GovFooter";
import {
  RANGE_OPTIONS,
  SECTOR_OPTIONS,
  kpisByRange,
  kpiTrends,
  kpiSparks,
  trendByRange,
  distributionBase,
  sectorRisks,
  activeCameras as baseActiveCameras,
  threatEvents as baseThreatEvents,
  insights,
  type ThreatRange,
  type ThreatEvent,
  type ActiveCamera,
  type Severity,
} from "@/lib/threatIntelligenceData";

export default function ThreatIntelligencePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState<ThreatRange>("7d");
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [liveCameras, setLiveCameras] = useState<ActiveCamera[]>(baseActiveCameras);
  const [liveEvents, setLiveEvents] = useState<ThreatEvent[]>(baseThreatEvents);
  const [liveKpiDelta, setLiveKpiDelta] = useState({ total: 0, critical: 0, intrusion: 0, watchlist: 0 });

  useEffect(() => {
    let isMounted = true;

    const fetchLiveData = async () => {
      try {
        const [liveRes, faceRes, audioRes] = await Promise.allSettled([
          fetch("http://localhost:8000/api/v1/query/live").then(r => r.ok ? r.json() : {}),
          fetch("http://localhost:8000/faces/alerts").then(r => r.ok ? r.json() : []),
          fetch("http://localhost:8000/api/v1/audio/alerts").then(r => r.ok ? r.json() : [])
        ]);

        const liveData = liveRes.status === "fulfilled" ? liveRes.value : {};
        const faceAlerts = faceRes.status === "fulfilled" && Array.isArray(faceRes.value) ? faceRes.value : [];
        const audioAlerts = audioRes.status === "fulfilled" && Array.isArray(audioRes.value) ? audioRes.value : [];

        // Build dynamic live cameras
        const camsData = liveData.live_cameras || {};
        const updatedCameras: ActiveCamera[] = [
          {
            id: "CAM-01",
            name: "CAM-01 North Gate",
            sector: "Sector 1",
            threatLevel: (camsData["CAM-01"]?.detections?.length > 0 ? "high" : "low") as Severity,
            eventsCount: camsData["CAM-01"]?.detections?.length || 2,
            status: "Streaming 25 fps",
            latencyMs: 14,
          },
          {
            id: "CAM-02",
            name: "CAM-02 ANPR Highway",
            sector: "Sector 2",
            threatLevel: (camsData["CAM-02"]?.detections?.length > 0 ? "medium" : "low") as Severity,
            eventsCount: camsData["CAM-02"]?.detections?.length || 1,
            status: "Streaming 25 fps",
            latencyMs: 16,
          },
          {
            id: "CAM-03",
            name: "CAM-03 South Tower",
            sector: "Sector 3",
            threatLevel: "low",
            eventsCount: 0,
            status: "Streaming 25 fps",
            latencyMs: 18,
          },
          {
            id: "CAM-04",
            name: "CAM-04 Virtual Fence",
            sector: "Sector 4",
            threatLevel: (camsData["CAM-04"]?.detections?.some((d: any) => d.label === 'intrusion') ? "critical" : "medium") as Severity,
            eventsCount: camsData["CAM-04"]?.detections?.length || 3,
            status: "Active Intrusion Fence",
            latencyMs: 15,
          },
          {
            id: "CAM-05",
            name: "CAM-05 Cargo Perimeter",
            sector: "Sector 3",
            threatLevel: "low",
            eventsCount: 0,
            status: "Streaming 25 fps",
            latencyMs: 20,
          },
          {
            id: "CAM-06",
            name: "CAM-06 Biometric Entry",
            sector: "Sector 1",
            threatLevel: (faceAlerts.some((f: any) => f.name?.toLowerCase().includes("intruder")) ? "critical" : "low") as Severity,
            eventsCount: faceAlerts.length || 1,
            status: "Live Facial Sentry",
            latencyMs: 12,
          },
        ];

        // Dynamic Threat Events
        const newEvents: ThreatEvent[] = [];
        faceAlerts.forEach((fa: any, idx: number) => {
          const isIntruder = fa.name?.toLowerCase().includes("intruder") || fa.name?.toLowerCase().includes("unknown");
          newEvents.push({
            id: `TE-FACE-${idx}`,
            time: fa.timestamp ? (fa.timestamp.includes("T") ? fa.timestamp.split("T")[1].slice(0, 8) : fa.timestamp) : "12:15:00",
            sector: "Sector 1",
            type: isIntruder ? "Unauthorized Perimeter Intruder" : "Watchlist Verification",
            severity: isIntruder ? "critical" : "medium",
            status: isIntruder ? "open" : "resolved",
            confidence: fa.confidence ? Math.round(fa.confidence * 100) : 95,
            description: `CAM-06 Face Recognition: ${fa.name || 'Subject'} (${fa.designation || 'Unverified'}).`,
          });
        });

        audioAlerts.forEach((aa: any, idx: number) => {
          newEvents.push({
            id: `TE-AUD-${idx}`,
            time: aa.timestamp ? (aa.timestamp.includes("T") ? aa.timestamp.split("T")[1].slice(0, 8) : aa.timestamp) : "12:20:00",
            sector: "Sector 4",
            type: aa.category || "Acoustic Threat",
            severity: (aa.threat_level?.toLowerCase() === "critical" ? "critical" : "high") as Severity,
            status: "investigating",
            confidence: aa.confidence ? Math.round(aa.confidence * 100) : 89,
            description: `Acoustic Array: ${aa.event_label || 'Acoustic anomaly'} detected in Sector 4.`,
          });
        });

        if (isMounted) {
          setLiveCameras(updatedCameras);
          if (newEvents.length > 0) {
            setLiveEvents([...newEvents, ...baseThreatEvents]);
            setLiveKpiDelta({
              total: newEvents.length,
              critical: newEvents.filter(e => e.severity === "critical").length,
              intrusion: newEvents.filter(e => e.type.toLowerCase().includes("intruder")).length,
              watchlist: newEvents.filter(e => e.type.toLowerCase().includes("watchlist") || !e.type.toLowerCase().includes("intruder")).length,
            });
          }
        }
      } catch (e) {
        console.error("Threat Intelligence live fetch error:", e);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const kpis = kpisByRange[range];
  const trend = kpiTrends[range];
  const sparks = kpiSparks[range];
  const series = trendByRange[range];

  const total = kpis.totalThreats + liveKpiDelta.total;
  const distribution = distributionBase
    .map((s) => ({ name: s.name, color: s.color, value: Math.max(1, Math.round(s.pct * total)) }))
    .reduce<{ name: string; value: number; color: string }[]>((acc, s) => {
      const idx = acc.findIndex((a) => a.name === s.name);
      if (idx === -1) acc.push(s);
      else acc[idx].value += s.value;
      return acc;
    }, []);

  const filteredCameras = sector === "All Sectors" ? liveCameras : liveCameras.filter((c) => c.sector === sector);
  const filteredEvents = sector === "All Sectors" ? liveEvents : liveEvents.filter((e) => e.sector === sector);
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

          {/* SECTION 0 — Feature 12 AI Surveillance & Threat Query Engine */}
          <Feature12QueryEngine
            initialMode="surveillance"
            title="AI Perimeter Threat Intelligence & RAG Query Engine"
          />

          {/* SECTION 1 — KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <KpiCard label="Total Threats" value={kpis.totalThreats + liveKpiDelta.total} trend={trend.total} spark={sparks.total} color={iconTone.blue.color} icon={ShieldAlert} />
            <KpiCard label="Critical Threats" value={kpis.criticalThreats + liveKpiDelta.critical} trend={trend.critical} spark={sparks.critical} color={iconTone.red.color} icon={AlertTriangle} />
            <KpiCard label="Intrusion Events" value={kpis.intrusionEvents + liveKpiDelta.intrusion} trend={trend.intrusion} spark={sparks.intrusion} color={iconTone.orange.color} icon={Fence} />
            <KpiCard label="Watchlist Hits" value={kpis.watchlistHits + liveKpiDelta.watchlist} trend={trend.watchlist} spark={sparks.watchlist} color={iconTone.yellow.color} icon={ScanFace} />
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

        {/* Institutional Government Footer */}
        <GovFooter />
      </div>
    </>
  );
}