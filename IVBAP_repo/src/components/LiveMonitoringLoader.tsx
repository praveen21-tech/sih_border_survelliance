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
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* Background grid + scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(59,130,246,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.045) 1px, transparent 1px)",
          backgroundSize: "4% 6%",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(10,22,40,0) 0%, rgba(10,22,40,0.8) 100%)",
        }}
      />

      {/* Corner brackets */}
      {[
        { top: 24, left: 24, border: "2px solid rgba(59,130,246,0.5)", borderRight: "none", borderBottom: "none" },
        { top: 24, right: 24, border: "2px solid rgba(59,130,246,0.5)", borderLeft: "none", borderBottom: "none" },
        { bottom: 24, left: 24, border: "2px solid rgba(59,130,246,0.5)", borderRight: "none", borderTop: "none" },
        { bottom: 24, right: 24, border: "2px solid rgba(59,130,246,0.5)", borderLeft: "none", borderTop: "none" },
      ].map((br, i) => (
        <div
          key={i}
          style={{ position: "absolute", width: 42, height: 42, ...br }}
        />
      ))}

      {/* Center stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 76, height: 76 }}>
            {/* Spinner ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.08)",
                borderTopColor: "#3B82F6",
              }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                inset: 7,
                borderRadius: "50%",
                border: "1px solid rgba(34,197,94,0.25)",
                borderBottomColor: "#22C55E",
              }}
            />
            {/* Core */}
            <motion.div
              animate={{ opacity: [1, 0.55, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: 15,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.7))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 28px rgba(59,130,246,0.5)",
              }}
            >
              <Shield size={26} style={{ color: "#fff" }} />
            </motion.div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "var(--text-1)",
                letterSpacing: "0.14em",
                fontFamily: "monospace",
              }}
            >
              BORDER<span style={{ color: "#3B82F6" }}>EYE</span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--text-3)",
                letterSpacing: "0.42em",
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              AI&nbsp;SURVEILLANCE&nbsp;PLATFORM
            </div>
          </div>
        </div>

        {/* Boot steps */}
        <div
          style={{
            width: 300,
            display: "flex",
            flexDirection: "column",
            gap: 9,
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
                  gap: 9,
                  opacity: done || isActive ? 1 : 0.32,
                  transition: "opacity 0.25s",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: 5,
                    border: `1px solid ${
                      done ? "rgba(34,197,94,0.4)" : isActive ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.12)"
                    }`,
                    background: done
                      ? "rgba(34,197,94,0.12)"
                      : isActive
                      ? "rgba(59,130,246,0.12)"
                      : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {done ? (
                    <Check size={13} style={{ color: "#22C55E" }} />
                  ) : (
                    <Icon size={13} style={{ color: isActive ? "#3B82F6" : "var(--text-3)" }} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive || done ? 600 : 400,
                    color: done ? "rgba(255,255,255,0.75)" : isActive ? "#fff" : "var(--text-3)",
                    fontFamily: "monospace",
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
        <div style={{ width: 300 }}>
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: "easeOut", duration: 0.35 }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #3B82F6, #22C55E)",
                boxShadow: "0 0 10px rgba(59,130,246,0.7)",
              }}
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              style={{
                marginTop: 9,
                textAlign: "center",
                fontSize: 8,
                color: "var(--text-3)",
                fontFamily: "monospace",
                letterSpacing: "0.08em",
              }}
            >
              {step < BOOT_STEPS.length
                ? BOOT_STEPS[step].label.toUpperCase()
                : "ALL SYSTEMS READY"}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}