"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Feature12QueryEngine from "@/components/query/Feature12QueryEngine";
import GovFooter from "@/components/GovFooter";

export default function AISearchPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          title="AI Search & Forensic Query Engine (Feature 12)"
          subtitle="Natural language multi-camera surveillance queries, Text-to-SQL, and video forensics"
          minimal
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <Feature12QueryEngine
            initialMode="surveillance"
            title="Surveillance Intelligence Query & Video Forensics Workspace"
          />
        </div>

        {/* Institutional Government Footer */}
        <GovFooter />
      </div>
    </>
  );
}
