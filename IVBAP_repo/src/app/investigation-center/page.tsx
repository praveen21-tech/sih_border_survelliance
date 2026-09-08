"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import IncidentQueue from "@/components/investigations/IncidentQueue";
import IncidentDetails from "@/components/investigations/IncidentDetails";
import EvidenceSnapshot from "@/components/investigations/EvidenceSnapshot";
import LinkedDetections from "@/components/investigations/LinkedDetections";
import { incidents, linkedDetections } from "@/lib/investigationData";

export default function InvestigationCenterPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(incidents[0].id);

  const selected = incidents.find((i) => i.id === selectedId) ?? incidents[0];

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
            gap: 10,
          }}
        >
          {/* SECTION 1 — Incident queue */}
          <IncidentQueue incidents={incidents} selectedId={selected.id} onSelect={setSelectedId} />

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
          <LinkedDetections detections={linkedDetections} />
        </div>
      </div>
    </>
  );
}