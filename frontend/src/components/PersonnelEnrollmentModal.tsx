"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  UserCheck,
  Trash2,
  Camera,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/detectionStream";

export interface PersonRecord {
  id: string;
  name: string;
  designation?: string;
  role?: string;
  photo_url?: string;
  registered_at?: string;
}

interface PersonnelEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonnelUpdated?: () => void;
}

export default function PersonnelEnrollmentModal({
  isOpen,
  onClose,
  onPersonnelUpdated,
}: PersonnelEnrollmentModalProps) {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [designation, setDesignation] = useState<string>("Authorized Personnel");
  const [role, setRole] = useState<string>("Security Officer");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/watchlist`);
      if (res.ok) {
        const data = await res.json();
        setPeople(data.people || []);
      }
    } catch (err: any) {
      console.error("Failed to load personnel roster:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWatchlist();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the person's full name");
      return;
    }
    if (!selectedFile) {
      setError("Please select a clear portrait/photo to enroll");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("designation", designation.trim() || "Authorized Personnel");
      formData.append("role", role.trim() || "Security Officer");
      formData.append("file", selectedFile);

      const res = await fetch(`${BACKEND_URL}/api/watchlist/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to enroll personnel");
      }

      setSuccess(`Successfully enrolled ${name} [${designation}] into Authorized Watchlist!`);
      setName("");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchWatchlist();
      if (onPersonnelUpdated) onPersonnelUpdated();
    } catch (err: any) {
      setError(err.message || "An error occurred during enrollment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollFromFeed = async () => {
    if (!name.trim()) {
      setError("Please enter the person's name before capturing from live feed");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/watchlist/enroll_webcam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          designation: designation.trim() || "Authorized Personnel",
          role: role.trim() || "Security Officer",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "No face detected in current camera frame to enroll");
      }

      setSuccess(`Captured and enrolled ${name} from CAM-06 live feed!`);
      setName("");
      await fetchWatchlist();
      if (onPersonnelUpdated) onPersonnelUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to capture face from camera feed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (personId: string, personName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${personName}? They will be flagged as INTRUDER.`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/watchlist/${personId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccess(`Access revoked for ${personName}.`);
        await fetchWatchlist();
        if (onPersonnelUpdated) onPersonnelUpdated();
      }
    } catch (err: any) {
      setError("Failed to delete person record");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "90vh",
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          boxShadow: "0 10px 40px rgba(0, 32, 96, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "2px solid var(--saffron)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#002060",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={18} style={{ color: "#FF9933" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                CAM-06 Personnel Access Control & Watchlist
              </h2>
              <p style={{ margin: 0, fontSize: "10.5px", color: "#EBF0FA", marginTop: 2 }}>
                Enroll authorized personnel with designation · Non-enrolled individuals are automatically flagged as <span style={{ color: "#FCA5A5", fontWeight: 700 }}>INTRUDER</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left Form: Add Personnel */}
          <div
            style={{
              width: "48%",
              padding: "20px",
              borderRight: "1px solid var(--border-lt)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              background: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <UserPlus size={16} style={{ color: "var(--navy)" }} />
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--navy)", letterSpacing: "0.04em" }}>
                ENROLL AUTHORIZED PERSON
              </span>
            </div>

            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "4px",
                  background: "#FDE8E8",
                  border: "1px solid #EF9A9A",
                  color: "#B71C1C",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "4px",
                  background: "#EBF5EF",
                  border: "1px solid #A5D6A7",
                  color: "#1A6B3C",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 600,
                }}
              >
                <UserCheck size={14} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "var(--text-2)", marginBottom: "4px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Major Vikram Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#F4F6FB",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    color: "var(--text)",
                    fontSize: "11.5px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Designation */}
              <div>
                <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "var(--text-2)", marginBottom: "4px" }}>
                  Designation / Rank *
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#F4F6FB",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    color: "var(--text)",
                    fontSize: "11.5px",
                    outline: "none",
                    marginBottom: "6px",
                  }}
                >
                  <option value="Commander">Commander</option>
                  <option value="Inspector General">Inspector General</option>
                  <option value="Duty Officer">Duty Officer</option>
                  <option value="Security Officer">Security Officer</option>
                  <option value="Border Patrol Specialist">Border Patrol Specialist</option>
                  <option value="Technical Engineer">Technical Engineer</option>
                  <option value="Authorized Staff">Authorized Staff</option>
                </select>
              </div>

              {/* Sector / Role */}
              <div>
                <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "var(--text-2)", marginBottom: "4px" }}>
                  Access Sector / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sector-06 Entryway / All Sectors"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#F4F6FB",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    color: "var(--text)",
                    fontSize: "11.5px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Photo Upload & Preview */}
              <div>
                <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "var(--text-2)", marginBottom: "4px" }}>
                  Face Photo / Portrait *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  id="face-photo-input"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #B0BCCF",
                    borderRadius: "6px",
                    padding: "16px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#F4F6FB",
                    transition: "border-color 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {previewUrl ? (
                    <div style={{ position: "relative", width: "70px", height: "70px", borderRadius: "50%", overflow: "hidden", border: "2px solid #1A6B3C" }}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#EBF0FA",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Upload size={18} style={{ color: "var(--navy)" }} />
                    </div>
                  )}
                  <span style={{ fontSize: "10.5px", color: previewUrl ? "#1A6B3C" : "var(--text-muted)", fontWeight: 600 }}>
                    {previewUrl ? "Click to change photo" : "Click to select JPG / PNG face image"}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    background: "#1A6B3C",
                    border: "none",
                    borderRadius: "4px",
                    color: "#FFFFFF",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 1px 3px rgba(26, 107, 60, 0.3)",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  <ShieldCheck size={15} />
                  {submitting ? "Embedding..." : "Enroll & Authorize"}
                </button>

                <button
                  type="button"
                  onClick={handleEnrollFromFeed}
                  disabled={submitting}
                  title="Capture current face appearing in CAM-06 live feed"
                  style={{
                    padding: "9px 12px",
                    background: "#EBF0FA",
                    border: "1px solid #B0BCCF",
                    borderRadius: "4px",
                    color: "var(--navy)",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Camera size={15} />
                  Live Capture
                </button>
              </div>
            </form>
          </div>

          {/* Right List: Authorized Personnel Roster */}
          <div
            style={{
              width: "52%",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#F4F6FB",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--navy)", letterSpacing: "0.04em" }}>
                  AUTHORIZED ROSTER ({people.length})
                </span>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: "#EBF5EF",
                    color: "#1A6B3C",
                    border: "1px solid #A5D6A7",
                    fontSize: "9.5px",
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              </div>
              <button
                onClick={fetchWatchlist}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--navy)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                paddingRight: "4px",
              }}
            >
              {loading && people.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "11.5px" }}>
                  Loading authorized personnel database...
                </div>
              ) : people.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 15px",
                    background: "#FFFFFF",
                    borderRadius: "6px",
                    border: "1px dashed var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    lineHeight: 1.6,
                  }}
                >
                  <ShieldCheck size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
                  No authorized personnel enrolled yet.
                  <br />
                  <span style={{ color: "#B71C1C", fontWeight: 600 }}>
                    All faces detected on CAM-06 will be categorized as <strong>INTRUDERS</strong> until enrolled.
                  </span>
                </div>
              ) : (
                people.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      background: "#FFFFFF",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      boxShadow: "var(--sh)",
                    }}
                  >
                    {/* Avatar */}
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.name}
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1.5px solid #1A6B3C",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "#EBF5EF",
                          border: "1.5px solid #1A6B3C",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#1A6B3C",
                          fontWeight: 700,
                          fontSize: "14px",
                          flexShrink: 0,
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </span>
                        <span
                          style={{
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: "#EBF5EF",
                            color: "#1A6B3C",
                            border: "1px solid #A5D6A7",
                            fontSize: "8.5px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                          }}
                        >
                          AUTHORIZED
                        </span>
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--navy)", fontWeight: 600, marginTop: "1px" }}>
                        {p.designation || "Authorized Personnel"}
                      </div>
                      <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "1px" }}>
                        Role: {p.role || "Officer"}
                      </div>
                    </div>

                    {/* Revoke Action */}
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      title="Revoke access clearance"
                      style={{
                        background: "#FDE8E8",
                        border: "1px solid #EF9A9A",
                        color: "#B71C1C",
                        cursor: "pointer",
                        padding: "5px 8px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={12} />
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: "8px 12px",
                background: "#FFF0E0",
                border: "1px solid #FFCC80",
                borderRadius: "4px",
                fontSize: "10px",
                color: "#C05000",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0, color: "#C05000" }} />
              <span>
                <strong>Intruder Security Policy:</strong> Any face not enrolled above entering CAM-06 is automatically tagged as an <strong>UNAUTHORIZED INTRUDER</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
