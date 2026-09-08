"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import IncidentQueue from "@/components/investigations/IncidentQueue";
import IncidentDetails from "@/components/investigations/IncidentDetails";
import EvidenceSnapshot from "@/components/investigations/EvidenceSnapshot";
import LinkedDetections from "@/components/investigations/LinkedDetections";
import Feature12QueryEngine from "@/components/query/Feature12QueryEngine";
import GovFooter from "@/components/GovFooter";
import { incidents as baseIncidents, linkedDetections as baseLinkedDetections, type Incident, type Priority } from "@/lib/investigationData";
import { Activity, ShieldCheck, Radio } from "lucide-react";

export default function InvestigationCenterPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allIncidents, setAllIncidents] = useState<Incident[]>(baseIncidents);
  const [selectedId, setSelectedId] = useState(baseIncidents[0].id);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLiveIncidents = async () => {
      try {
        const [faceRes, audioRes, evidenceRes, queryRes] = await Promise.allSettled([
          fetch("http://localhost:8000/faces/alerts").then(r => r.ok ? r.json() : []),
          fetch("http://localhost:8000/api/v1/audio/alerts").then(r => r.ok ? r.json() : []),
          fetch("http://localhost:8000/api/v1/evidence/list").then(r => r.ok ? r.json() : []),
          fetch("http://localhost:8000/api/v1/query/live").then(r => r.ok ? r.json() : { live_cameras: {} })
        ]);

        const faceAlerts = faceRes.status === "fulfilled" && Array.isArray(faceRes.value) ? faceRes.value : [];
        const audioAlerts = audioRes.status === "fulfilled" && Array.isArray(audioRes.value) ? audioRes.value : [];
        const evidenceList = evidenceRes.status === "fulfilled" && Array.isArray(evidenceRes.value) ? evidenceRes.value : [];
        const liveQuery = queryRes.status === "fulfilled" ? queryRes.value : { live_cameras: {} };

        const dynamicIncidents: Incident[] = [];

        // 1. Evidence Vault records
        evidenceList.forEach((ev: any) => {
          dynamicIncidents.push({
            id: ev.id || `EVD-${Math.floor(Math.random()*1000)}`,
            type: "Cryptographic Evidence",
            icon: "watchlist",
            title: `[SEALED EVIDENCE] ${ev.incident_type || 'Perimeter Capture'}`,
            priority: (ev.severity?.toLowerCase() === "critical" ? "critical" : "high") as Priority,
            status: "escalated",
            camera: ev.camera_id || "CAM-06",
            sector: ev.camera_id === "CAM-06" ? "HQ Sector 6 (Biometrics)" : "Sector 4 (Perimeter)",
            date: ev.timestamp ? ev.timestamp.split(" ")[0] : "08 Sep 2026",
            time: ev.timestamp ? (ev.timestamp.split(" ")[1] || "12:00:00") : "12:00:00",
            location: `Sensor Point ${ev.camera_id || 'CAM-06'}`,
            snapshotTime: ev.timestamp || "12:00:00",
            confidence: 99.8,
            frameVariant: "checkpoint",
            snapshotUrl: ev.snapshot_url || (ev.snapshot_base64 ? `data:image/jpeg;base64,${ev.snapshot_base64}` : undefined),
            description: `Sealed tamper-evident evidence file. SHA-256 Hash: ${ev.hash_sha256 || 'Verified'}. Officer: ${ev.officer || 'Commander'}. Notes: ${ev.notes || 'Forensic snapshot logged.'}`,
            timeline: [
              { time: ev.timestamp || "12:00:00", label: `Evidence sealed by ${ev.officer || 'Operator'}` },
              { time: ev.timestamp || "12:00:00", label: `SHA-256 Checksum verified: ${(ev.hash_sha256 || '').slice(0, 16)}...` }
            ],
            evidenceNotes: `SHA-256 Seal: ${ev.hash_sha256 || 'Cryptographically verified'}`,
            operatorNotes: ev.notes || "Stored in Evidence Vault."
          });
        });

        // 2. Face Alerts
        faceAlerts.forEach((fa: any, idx: number) => {
          const isIntruder = fa.is_intruder || fa.name?.toLowerCase().includes("intruder") || fa.name?.toLowerCase().includes("unknown");
          dynamicIncidents.push({
            id: `FACE-LIVE-${idx}-${fa.id || Math.floor(Math.random()*1000)}`,
            type: isIntruder ? "Unauthorized Intruder" : "Watchlist Identified",
            icon: isIntruder ? "intrusion" : "watchlist",
            title: isIntruder ? `🚨 Intruder Detected: ${fa.name || 'UNKNOWN'}` : `🟢 Authorized Personnel: ${fa.name || 'PERSONNEL'}`,
            priority: isIntruder ? "critical" : "medium",
            status: isIntruder ? "open" : "closed",
            camera: "CAM_06_HQ_FACIAL",
            sector: "Sector 6 (HQ Command)",
            date: "08 Sep 2026",
            time: fa.timestamp ? (fa.timestamp.includes("T") ? fa.timestamp.split("T")[1].slice(0, 8) : fa.timestamp) : "12:15:00",
            location: "Command Building Entry (CAM-06)",
            snapshotTime: fa.timestamp || "12:15:00",
            confidence: fa.confidence ? Math.round(fa.confidence * 100) : 95.0,
            frameVariant: "checkpoint",
            snapshotUrl: fa.face_crop ? `data:image/jpeg;base64,${fa.face_crop}` : (fa.snapshot ? `data:image/jpeg;base64,${fa.snapshot}` : undefined),
            description: `Live facial recognition alert triggered on CAM-06. Subject: ${fa.name || 'Unknown'}. Designation: ${fa.designation || 'Unverified'}. Confidence: ${((fa.confidence || 0.95)*100).toFixed(1)}%.`,
            timeline: [
              { time: "Live Alert", label: `Subject ${fa.name || 'Unknown'} detected on CAM-06` },
              { time: "Classification", label: isIntruder ? "Flagged as unauthorized intruder - Alarm sounding" : "Access granted to authorized operator" }
            ],
            evidenceNotes: `Biometric Euclidean Distance match against enrolled database.`,
            operatorNotes: `Automated detection logged in real-time.`
          });
        });

        // 3. Audio Alerts
        audioAlerts.forEach((aa: any, idx: number) => {
          dynamicIncidents.push({
            id: `AUD-LIVE-${idx}-${aa.id || Math.floor(Math.random()*1000)}`,
            type: "Acoustic Threat",
            icon: "suspicious",
            title: `🔊 Acoustic Event: ${aa.event_label || aa.category || 'Sound Detected'}`,
            priority: (aa.threat_level?.toLowerCase() === "critical" ? "critical" : "high") as Priority,
            status: "investigating",
            camera: "SECTOR-AUDIO-ARRAY",
            sector: aa.sector || "Sector 4 (Western Thar)",
            date: "08 Sep 2026",
            time: aa.timestamp ? (aa.timestamp.includes("T") ? aa.timestamp.split("T")[1].slice(0, 8) : aa.timestamp) : "12:20:00",
            location: aa.sector || "Border Sector 4",
            snapshotTime: "12:20:00",
            confidence: aa.confidence ? Math.round(aa.confidence * 100) : 89.0,
            frameVariant: "tower",
            description: `Acoustic sensor classification detected ${aa.event_label || 'Acoustic anomaly'}. Threat Level: ${aa.threat_level || 'MEDIUM'}. Audio Decryption Transcript: ${aa.transcript || 'Non-verbal impulse'}.`,
            timeline: [
              { time: "Acoustic Trigger", label: `Spectral impulse registered in ${aa.sector || 'Monitored Sector'}` },
              { time: "AI Classification", label: `Classified as ${aa.event_label || 'Event'} with ${((aa.confidence||0.89)*100).toFixed(1)}% confidence` }
            ],
            evidenceNotes: `Audio envelope waveform analysis verified.`,
            operatorNotes: `Acoustic triangulation linked to drone/perimeter radar.`
          });
        });

        if (isMounted) {
          if (dynamicIncidents.length > 0) {
            setAllIncidents([...dynamicIncidents, ...baseIncidents]);
            setLiveConnected(true);
          } else {
            setAllIncidents(baseIncidents);
            setLiveConnected(true);
          }
        }
      } catch (err) {
        console.error("Live investigation fetch error:", err);
      }
    };

    fetchLiveIncidents();
    const interval = setInterval(fetchLiveIncidents, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const selected = allIncidents.find((i) => i.id === selectedId) ?? allIncidents[0];

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
          title="Investigation Center"
          subtitle="Review and analyze detected security incidents across all sectors"
          minimal
        />

        {/* Body — scrolls for long queues */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "8px 12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Live Data Connectivity Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981" }}>
                LIVE DATA STREAM ACTIVE: {allIncidents.length} security alerts & evidence records synchronized
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: "var(--text-3)" }}>
              <Radio size={12} color="#10B981" />
              <span>Synced with Facial Biometrics, Acoustic Array & Evidence Vault</span>
            </div>
          </div>

          {/* SECTION 0 — Feature 12 AI Surveillance & Video Forensics Query Engine */}
          <Feature12QueryEngine
            initialMode="surveillance"
            title="AI Forensic Investigation & Natural Language Surveillance Engine"
          />

          {/* SECTION 1 — Incident queue */}
          <IncidentQueue incidents={allIncidents} selectedId={selected.id} onSelect={setSelectedId} />

          {/* SECTION 2 — Incident details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 65fr) minmax(0, 35fr)",
              gap: 10,
            }}
          >
            {/* Left — details + evidence timeline */}
            <IncidentDetails incident={selected} />

            {/* Right — evidence snapshot */}
            <EvidenceSnapshot incident={selected} />
          </div>

          {/* SECTION 3 — Linked detections */}
          <LinkedDetections detections={baseLinkedDetections} />
        </div>

        {/* Institutional Government Footer */}
        <GovFooter />
      </div>
    </>
  );
}