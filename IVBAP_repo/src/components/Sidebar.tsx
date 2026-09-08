"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  LayoutDashboard, Monitor, Search, ShieldAlert,
  Volume2, Bot, Archive, Settings,
} from "lucide-react";

// ── Nav structure ─────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    label: "MAIN",
    items: [
      { id: "dashboard",   label: "Dashboard",           icon: LayoutDashboard },
      { id: "monitoring",  label: "Live Monitoring",      icon: Monitor },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "investigation", label: "Investigation Center", icon: Search },
      { id: "threat",        label: "Threat Intelligence",  icon: ShieldAlert },
      { id: "audio",         label: "Audio Intelligence",   icon: Volume2 },
    ],
  },
  {
    label: "AI & EVIDENCE",
    items: [
      { id: "aisearch",  label: "AI Search",      icon: Bot },
      { id: "evidence",  label: "Evidence Vault", icon: Archive },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

type ItemId = typeof SECTIONS[number]["items"][number]["id"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [active, setActive] = useState<ItemId>("dashboard");
  const router = useRouter();
  const pathname = usePathname();

  // Map routes to nav ids so the active item follows the current page.
  const routeToId: Record<string, ItemId> = {
    "/dashboard": "dashboard",
    "/live-monitoring": "monitoring",
    "/investigation-center": "investigation",
    "/threat-intelligence": "threat",
    "/audio-intelligence": "audio",
  };
  const effective = pathname ? routeToId[pathname] ?? active : active;

  function handleSelect(id: ItemId) {
    setActive(id);
    if (id === "monitoring") {
      onClose();
      router.push("/live-monitoring");
    } else if (id === "dashboard") {
      onClose();
      router.push("/dashboard");
    } else if (id === "investigation") {
      onClose();
      router.push("/investigation-center");
    } else if (id === "threat") {
      onClose();
      router.push("/threat-intelligence");
    } else if (id === "audio") {
      onClose();
      router.push("/audio-intelligence");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── click it to close */}
          <motion.div
            key="sb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(1px)",
              WebkitBackdropFilter: "blur(1px)",
              cursor: "default",
            }}
          />

          {/* ── Sidebar panel ── */}
          <motion.aside
            key="sb-panel"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: 268,
              zIndex: 2050,
              background: "#08111D",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "4px 0 32px rgba(0,0,0,0.6)",
            }}
          >
            {/* ── Logo + close button ── */}
            <div
              style={{
                padding: "16px 16px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              {/* Brand */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: "rgba(59,130,246,0.12)",
                    border: "1px solid rgba(59,130,246,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 28 28" fill="none">
                    <path d="M3 14C3 14 8 5 14 5C20 5 25 14 25 14C25 14 20 23 14 23C8 23 3 14 3 14Z"
                      stroke="#3B82F6" strokeWidth="1.5" fill="none"/>
                    <circle cx="14" cy="14" r="3.5" stroke="#3B82F6" strokeWidth="1.3" fill="none"/>
                    <circle cx="14" cy="14" r="1.3" fill="#3B82F6"/>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.01em", lineHeight: 1.2 }}>
                    BorderEye AI
                  </div>
                  <div style={{ fontSize: 8, color: "#3A5068", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>
                    Intelligent Border Surveillance
                  </div>
                </div>
              </div>

              {/* Close (×) button */}
              <button
                onClick={onClose}
                title="Close navigation"
                style={{
                  width: 26, height: 26,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <X size={12} style={{ color: "#4A6080" }} />
              </button>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />

            {/* ── Nav ── */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "6px 0 12px" }}>
              {SECTIONS.map((section) => (
                <div key={section.label} style={{ marginBottom: 2 }}>
                  {/* Section label */}
                  <div
                    style={{
                      padding: "10px 18px 4px",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "#253545",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    {section.label}
                  </div>

                  {/* Items */}
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = effective === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id as ItemId)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 18px",
                          background: isActive ? "rgba(59,130,246,0.09)" : "transparent",
                          borderTop: 0,
                          borderRight: 0,
                          borderBottom: 0,
                          borderLeft: `2px solid ${isActive ? "#3B82F6" : "transparent"}`,
                          outline: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.14s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <Icon
                          size={14}
                          strokeWidth={isActive ? 2.1 : 1.6}
                          style={{ color: isActive ? "#3B82F6" : "#3A5068", flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? "#FFFFFF" : "#7A94AC",
                            letterSpacing: "0.01em",
                            lineHeight: 1,
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* ── Footer ── */}
            <div
              style={{
                padding: "10px 18px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 7.5, color: "#253545", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Intelligence Beyond Borders
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
