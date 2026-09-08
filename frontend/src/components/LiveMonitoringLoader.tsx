"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Radio, Boxes, Video, Check, Shield } from "lucide-react";

const BOOT_STEPS = [
  { label: "Initializing AI Analytics Engine", icon: Cpu },
  { label: "Connecting Surveillance Network", icon: Radio },
  { label: "Loading Detection Models", icon: Boxes },
  { label: "Establishing Camera Feeds", icon: Video },
] as const;

const STEP_MS = 590;
const SETTLE_MS = 400;

interface LiveMonitoringLoaderProps {
  onComplete: () => void;
}

export default function LiveMonitoringLoader({ onComplete }: LiveMonitoringLoaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setStep((s) => {
        if (s >= BOOT_STEPS.length) return s;
        return s + 1;
      });
    };

    timer = setTimeout(tick, STEP_MS);
    const interval = setInterval(() => {
      timer = setTimeout(tick, 0);
    }, STEP_MS);

    const settle = setTimeout(
      () => {
        if (active) onComplete();
      },
      BOOT_STEPS.length * STEP_MS + SETTLE_MS,
    );

    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(timer);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.min(step / BOOT_STEPS.length, 1);

  return (
    <motion.div
      key="loader"
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "#ECEEF4",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(0,32,96,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,32,96,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Center stage card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderTop: "4px solid var(--navy)",
            borderRadius: 8,
            padding: "32px 36px",
            boxShadow: "0 10px 30px rgba(0,32,96,0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: 380,
            width: "90%",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 68, height: 68 }}>
              {/* Spinner ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid #E4E9F2",
                  borderTopColor: "var(--navy)",
                }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 6,
                  borderRadius: "50%",
                  border: "1.5px solid #EBF5EF",
                  borderBottomColor: "#1A6B3C",
                }}
              />
              {/* Core */}
              <motion.div
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: 14,
                  borderRadius: 10,
                  background: "#002060",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(0,32,96,0.3)",
                }}
              >
                <Shield size={22} style={{ color: "#FF9933" }} />
              </motion.div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--navy)",
                  letterSpacing: "0.08em",
                }}
              >
                BORDER<span style={{ color: "var(--saffron)" }}>EYE</span>
              </div>
              <div
                style={{
                  fontSize: 8.5,
                  color: "var(--text-muted)",
                  letterSpacing: "0.15em",
                  marginTop: 3,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                AI SURVEILLANCE & THREAT SUITE
              </div>
            </div>
          </div>

          {/* Boot steps */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {BOOT_STEPS.map((s, i) => {
              const done = i < step;
              const isActive = i === step;
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 10px",
                    borderRadius: 4,
                    background: done ? "#EBF5EF" : isActive ? "#EBF0FA" : "#F4F6FB",
                    border: `1px solid ${done ? "#A5D6A7" : isActive ? "#B0BCCF" : "#E4E9F2"}`,
                    transition: "all 0.25s",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done ? (
                      <Check size={14} style={{ color: "#1A6B3C" }} strokeWidth={2.5} />
                    ) : (
                      <Icon size={13} style={{ color: isActive ? "var(--navy)" : "var(--text-muted)" }} />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: isActive || done ? 700 : 500,
                      color: done ? "#1A6B3C" : isActive ? "var(--navy)" : "var(--text-muted)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "#E4E9F2",
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: "easeOut", duration: 0.35 }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #002060, #1A6B3C)",
                }}
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 8.5,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                {step < BOOT_STEPS.length
                  ? BOOT_STEPS[step].label.toUpperCase()
                  : "ALL SENSORS & STREAMS OPERATIONAL"}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}