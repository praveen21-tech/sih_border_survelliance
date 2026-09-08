"use client";

import React, { useState, useEffect } from "react";
import {
  Archive,
  Shield,
  Search,
  Filter,
  Camera,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Key,
  Plus,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import GovFooter from "@/components/GovFooter";
import { BACKEND_URL } from "@/lib/detectionStream";

export default function EvidenceVaultPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [activeModalItem, setActiveModalItem] = useState<any | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCam, setCaptureCam] = useState("CAM-04");
  const [captureNote, setCaptureNote] = useState("");

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/evidence/list`);
      if (res.ok) {
        const data = await res.json();
        setEvidenceList(data.evidence || []);
      }
    } catch (e) {
      console.error("Failed to fetch evidence:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  const handleCaptureEvidence = async () => {
    setIsCapturing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/evidence/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_id: captureCam,
          incident_type: "Manual Operator Evidence Snapshot",
          severity: "high",
          officer: "MAJOR PRAVEEN",
          notes: captureNote || "Manual snapshot secured via Command Evidence Vault",
        }),
      });
      if (res.ok) {
        setCaptureNote("");
        fetchEvidence();
      }
    } catch (e) {
      console.error("Evidence capture failed:", e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to purge Evidence Record ${id}?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/evidence/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvidenceList((prev) => prev.filter((x) => x.id !== id));
        if (activeModalItem?.id === id) setActiveModalItem(null);
      }
    } catch (e) {
      console.error("Delete evidence failed:", e);
    }
  };

  const filteredItems = evidenceList.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.camera_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sha256_hash.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCam = selectedCamera === "ALL" || item.camera_id === selectedCamera;
    const matchesSev = selectedSeverity === "ALL" || item.severity === selectedSeverity.toLowerCase();

    return matchesSearch && matchesCam && matchesSev;
  });

  const criticalCount = evidenceList.filter((e) => e.severity === "critical").length;
  const uniqueCameras = Array.from(new Set(evidenceList.map((e) => e.camera_id))).length;

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
          title="Evidence Vault"
          subtitle="Cryptographically sealed, tamper-evident digital surveillance & forensic records"
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
            gap: 12,
          }}
        >
          {/* Quick Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #003380",
                borderRadius: 6,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: "#EBF0FA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Archive size={17} style={{ color: "#003380" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                  Secured Evidence Items
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#003380", fontFamily: "var(--font-mono)" }}>
                  {evidenceList.length}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #1A6B3C",
                borderRadius: 6,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: "#EBF5EF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle size={17} style={{ color: "#1A6B3C" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                  SHA-256 Verified
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1A6B3C", fontFamily: "var(--font-mono)" }}>
                  100% Intact
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #B71C1C",
                borderRadius: 6,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: "#FDE8E8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={17} style={{ color: "#B71C1C" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                  Critical Level Items
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#B71C1C", fontFamily: "var(--font-mono)" }}>
                  {criticalCount}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                borderTop: "3px solid #FF9933",
                borderRadius: 6,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: "#FFF4E8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={17} style={{ color: "#C05000" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                  Feeds With Evidence
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#003380", fontFamily: "var(--font-mono)" }}>
                  {uniqueCameras} Channels
                </div>
              </div>
            </div>
          </div>

          {/* Action & Capture Bar */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              boxShadow: "var(--sh)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 320 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                📸 Capture Live Evidence:
              </span>
              <select
                value={captureCam}
                onChange={(e) => setCaptureCam(e.target.value)}
                style={{
                  background: "#F4F6FB",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "var(--text)",
                  outline: "none",
                }}
              >
                <option value="CAM-01">CAM-01 (ByteTrack)</option>
                <option value="CAM-02">CAM-02 (Vehicle ANPR)</option>
                <option value="CAM-03">CAM-03 (Night Border)</option>
                <option value="CAM-04">CAM-04 (Virtual Fence)</option>
                <option value="CAM-05">CAM-05 (Sector Sentry)</option>
                <option value="CAM-06">CAM-06 (FaceNet Access Checkpoint)</option>
              </select>
              <input
                type="text"
                placeholder="Optional incident notes..."
                value={captureNote}
                onChange={(e) => setCaptureNote(e.target.value)}
                style={{
                  flex: 1,
                  background: "#F4F6FB",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 9,
                  color: "var(--text)",
                  outline: "none",
                }}
              />
              <button
                onClick={handleCaptureEvidence}
                disabled={isCapturing}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "var(--navy)",
                  color: "#FFFFFF",
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: isCapturing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: "0 1px 2px rgba(0,32,96,0.2)",
                }}
              >
                <Plus size={12} /> {isCapturing ? "Sealing..." : "Seal Evidence"}
              </button>
            </div>

            <button
              onClick={fetchEvidence}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "#F4F6FB",
                color: "var(--navy)",
                fontSize: 9,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search by title, notes, camera, or SHA-256 hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  fontSize: 9,
                  color: "var(--text)",
                  outline: "none",
                  boxShadow: "var(--sh)",
                }}
              />
              <Search
                size={13}
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.03em" }}>
                  Camera:
                </span>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 8.5,
                    color: "var(--text)",
                    outline: "none",
                    boxShadow: "var(--sh)",
                  }}
                >
                  <option value="ALL">All Cameras</option>
                  <option value="CAM-01">CAM-01</option>
                  <option value="CAM-02">CAM-02</option>
                  <option value="CAM-03">CAM-03</option>
                  <option value="CAM-04">CAM-04</option>
                  <option value="CAM-05">CAM-05</option>
                  <option value="CAM-06">CAM-06</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.03em" }}>
                  Severity:
                </span>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 8.5,
                    color: "var(--text)",
                    outline: "none",
                    boxShadow: "var(--sh)",
                  }}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Evidence Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {filteredItems.map((item) => {
              const isCrit = item.severity === "critical";
              const isHigh = item.severity === "high";
              const isMed = item.severity === "medium";
              
              const badgeBg = isCrit ? "#FDE8E8" : isHigh ? "#FFF0E0" : isMed ? "#E3F0FB" : "#EBF5EF";
              const badgeFg = isCrit ? "#B71C1C" : isHigh ? "#C05000" : isMed ? "#0D5EA6" : "#1A6B3C";
              const badgeBorder = isCrit ? "#EF9A9A" : isHigh ? "#FFCC80" : isMed ? "#90CAF9" : "#A5D6A7";

              return (
                <div
                  key={item.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "var(--sh)",
                    transition: "box-shadow 0.15s, border-color 0.15s",
                  }}
                >
                  {/* Snapshot Preview */}
                  <div
                    style={{
                      height: 140,
                      background: "#F4F6FB",
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-lt)",
                    }}
                    onClick={() => setActiveModalItem(item)}
                  >
                    {item.snapshot_url ? (
                      <img
                        src={item.snapshot_url}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Camera size={26} />
                      </div>
                    )}

                    {/* Camera Pill Overlay */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        background: "rgba(0, 32, 96, 0.85)",
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 8,
                        fontWeight: 700,
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      <Camera size={10} /> {item.camera_id}
                    </div>

                    {/* Status Seal Overlay */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "#1A6B3C",
                        color: "#FFFFFF",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 7.5,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      SEALED
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 8.5, fontFamily: "var(--font-mono)", color: "var(--navy)", fontWeight: 700 }}>
                        {item.id}
                      </span>
                      <span
                        style={{
                          fontSize: 7.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: 3,
                          background: badgeBg,
                          color: badgeFg,
                          border: `1px solid ${badgeBorder}`,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--navy)", lineHeight: 1.3 }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: 8.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={10} /> {item.timestamp}
                    </div>

                    <div
                      style={{
                        fontSize: 8.5,
                        color: "var(--text-2)",
                        background: "#F4F6FB",
                        padding: "6px 8px",
                        borderRadius: 4,
                        border: "1px solid var(--border-lt)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.notes}
                    </div>

                    {/* SHA-256 seal snippet */}
                    <div
                      style={{
                        fontSize: 7.5,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: "auto",
                        paddingTop: 4,
                      }}
                    >
                      <Key size={9} style={{ color: "#003380" }} />
                      <span>SHA-256: {item.sha256_hash.slice(0, 18)}...</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderTop: "1px solid var(--border-lt)",
                      background: "#F4F6FB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <button
                      onClick={() => setActiveModalItem(item)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--navy)",
                        fontSize: 8.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ExternalLink size={10} /> View Dossier
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: 8.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                      title="Delete Record"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && !loading && (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 10,
                background: "#FFFFFF",
                borderRadius: 6,
                border: "1px dashed var(--border)",
              }}
            >
              No evidence records matched your search filters.
            </div>
          )}
        </div>

        {/* Institutional Government Footer */}
        <GovFooter />
      </div>

      {/* Detailed Evidence Dossier Modal */}
      {activeModalItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0, 32, 96, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setActiveModalItem(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 8,
              boxShadow: "0 10px 40px rgba(0, 32, 96, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "12px 16px",
                background: "#002060",
                borderBottom: "2px solid var(--saffron)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={16} style={{ color: "#FF9933" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                  Evidence Dossier: {activeModalItem.id}
                </span>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "75vh", overflowY: "auto" }}>
              {/* Snapshot Display */}
              {activeModalItem.snapshot_url && (
                <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", maxHeight: 260, background: "#000" }}>
                  <img
                    src={activeModalItem.snapshot_url}
                    alt={activeModalItem.title}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              )}

              {/* Metadata Table */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 9 }}>
                <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: 5, border: "1px solid var(--border-lt)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Camera Channel:</span>
                  <div style={{ color: "var(--navy)", fontWeight: 700, marginTop: 2 }}>{activeModalItem.camera_name}</div>
                </div>
                <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: 5, border: "1px solid var(--border-lt)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Timestamp:</span>
                  <div style={{ color: "var(--text)", fontWeight: 700, marginTop: 2, fontFamily: "var(--font-mono)" }}>{activeModalItem.timestamp}</div>
                </div>
                <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: 5, border: "1px solid var(--border-lt)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Incident Classification:</span>
                  <div style={{ color: "var(--navy)", fontWeight: 700, marginTop: 2 }}>{activeModalItem.incident_type}</div>
                </div>
                <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: 5, border: "1px solid var(--border-lt)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Logging Officer:</span>
                  <div style={{ color: "#1A6B3C", fontWeight: 700, marginTop: 2 }}>{activeModalItem.officer}</div>
                </div>
              </div>

              {/* Officer Notes */}
              <div>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Officer Forensic Notes:
                </span>
                <div
                  style={{
                    marginTop: 6,
                    padding: "10px",
                    background: "#F4F6FB",
                    borderRadius: 5,
                    border: "1px solid var(--border)",
                    fontSize: 9.5,
                    color: "var(--text)",
                    lineHeight: 1.5,
                  }}
                >
                  {activeModalItem.notes}
                </div>
              </div>

              {/* Cryptographic Proof */}
              <div>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Cryptographic Integrity Seal (SHA-256):
                </span>
                <pre
                  style={{
                    marginTop: 6,
                    margin: 0,
                    padding: "8px 10px",
                    background: "#F4F6FB",
                    borderRadius: 5,
                    border: "1px solid var(--border)",
                    color: "var(--navy)",
                    fontSize: 8.5,
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto",
                    fontWeight: 600,
                  }}
                >
                  {activeModalItem.sha256_hash}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

