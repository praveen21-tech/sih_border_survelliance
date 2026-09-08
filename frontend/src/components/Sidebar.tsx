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
    label: "MAIN / मुख्य प्रणाली",
    items: [
      { id: "dashboard",   label: "Dashboard",           hindi: "डैशबोर्ड",         icon: LayoutDashboard },
      { id: "monitoring",  label: "Live Monitoring",      hindi: "लाइव निगरानी",       icon: Monitor },
    ],
  },
  {
    label: "OPERATIONS / संचालन",
    items: [
      { id: "investigation", label: "Investigation Center", hindi: "जांच केंद्र",      icon: Search },
      { id: "threat",        label: "Threat Intelligence",  hindi: "खतरा खुफिया",     icon: ShieldAlert },
      { id: "audio",         label: "Audio Intelligence",   hindi: "ध्वनि खुफिया",     icon: Volume2 },
    ],
  },
  {
    label: "AI & EVIDENCE / एआई और साक्ष्य",
    items: [
      { id: "aisearch",  label: "AI Search",      hindi: "एआई खोज",      icon: Bot },
      { id: "evidence",  label: "Evidence Vault", hindi: "साक्ष्य वॉल्ट",  icon: Archive },
    ],
  },
  {
    label: "SYSTEM / व्यवस्था",
    items: [
      { id: "settings", label: "Settings", hindi: "सेटिंग्स", icon: Settings },
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
    "/": "dashboard",
    "/dashboard": "dashboard",
    "/live-monitoring": "monitoring",
    "/investigation-center": "investigation",
    "/threat-intelligence": "threat",
    "/audio-intelligence": "audio",
    "/ai-search": "aisearch",
    "/evidence-vault": "evidence",
    "/settings": "settings",
  };
  const effective = pathname ? routeToId[pathname] ?? active : active;

  function handleSelect(id: ItemId) {
    setActive(id);
    onClose();
    if (id === "monitoring") {
      router.push("/live-monitoring");
    } else if (id === "dashboard") {
      router.push("/dashboard");
    } else if (id === "investigation") {
      router.push("/investigation-center");
    } else if (id === "evidence") {
      router.push("/evidence-vault");
    } else if (id === "aisearch") {
      router.push("/ai-search");
    } else if (id === "threat") {
      router.push("/threat-intelligence");
    } else if (id === "audio") {
      router.push("/audio-intelligence");
    } else if (id === "settings") {
      router.push("/settings");
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
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
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
              width: 280,
              zIndex: 2050,
              background: "#FFFFFF",
              borderRight: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0, 32, 96, 0.15)",
            }}
          >
            {/* ── Logo + close button ── */}
            <div
              style={{
                padding: "16px 14px 14px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
                background: "#F4F6FB",
              }}
            >
              {/* Brand */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--navy-2)",
                    border: "1.5px solid var(--chakra)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg className="ashoka-chakra" viewBox="0 0 100 100" style={{ width: 24, height: 24 }}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#FFFFFF" strokeWidth="3.5" />
                    <circle cx="50" cy="50" r="7" fill="#FFFFFF" />
                    <g stroke="#FFFFFF" strokeWidth="1.6">
                      <line x1="50" y1="7" x2="50" y2="43" /><line x1="63" y1="9" x2="53.5" y2="43" />
                      <line x1="75" y1="16" x2="56.5" y2="44" /><line x1="84" y1="27" x2="58.5" y2="46" />
                      <line x1="90" y1="40" x2="59.5" y2="49" /><line x1="90" y1="54" x2="59.5" y2="51" />
                      <line x1="84" y1="67" x2="58.5" y2="54" /><line x1="75" y1="78" x2="56.5" y2="56" />
                      <line x1="63" y1="85" x2="53.5" y2="57" /><line x1="50" y1="89" x2="50" y2="57" />
                      <line x1="37" y1="85" x2="46.5" y2="57" /><line x1="25" y1="78" x2="43.5" y2="56" />
                      <line x1="16" y1="67" x2="41.5" y2="54" /><line x1="10" y1="54" x2="40.5" y2="51" />
                    </g>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--saffron)", fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                      भारत सरकार
                    </span>
                    <span style={{ fontSize: 8, color: "var(--border-med)" }}>•</span>
                    <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>MHA-GOI</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy-2)", letterSpacing: "0.01em", lineHeight: 1.2, marginTop: 1 }}>
                    BorderEye AI
                  </div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>
                    सीमा निगरानी एवं खुफिया प्रणाली
                  </div>
                </div>
              </div>

              {/* Close (×) button */}
              <button
                onClick={onClose}
                title="Close navigation"
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--crit-lt)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--crit-bd)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                <X size={13} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {/* ── Nav ── */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0 12px" }}>
              {SECTIONS.map((section) => (
                <div key={section.label} style={{ marginBottom: 4 }}>
                  {/* Section label */}
                  <div
                    style={{
                      padding: "8px 16px 4px",
                      fontSize: 8.5,
                      fontWeight: 700,
                      color: "var(--navy)",
                      letterSpacing: "0.08em",
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
                          padding: "8px 16px",
                          background: isActive ? "var(--navy-lt)" : "transparent",
                          borderTop: 0,
                          borderRight: 0,
                          borderBottom: 0,
                          borderLeft: `3px solid ${isActive ? "var(--saffron)" : "transparent"}`,
                          outline: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.14s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <Icon
                          size={15}
                          strokeWidth={isActive ? 2.3 : 1.7}
                          style={{ color: isActive ? "var(--saffron)" : "var(--navy)", flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 11.5,
                              fontWeight: isActive ? 700 : 600,
                              color: isActive ? "var(--navy)" : "var(--text)",
                              letterSpacing: "0.01em",
                              lineHeight: 1.2,
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontSize: 8.5,
                              color: isActive ? "var(--text-2)" : "var(--text-muted)",
                              fontFamily: "'Noto Sans Devanagari', sans-serif",
                              lineHeight: 1.1,
                              marginTop: 1,
                            }}
                          >
                            {item.hindi}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* ── Footer ── */}
            <div
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--border)",
                flexShrink: 0,
                background: "#F4F6FB",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  MHA &bull; GIGW 3.0
                </span>
                <span className="gov-badge-official" style={{ fontSize: 7.5, padding: "1px 6px" }}>
                  CONFIDENTIAL
                </span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
