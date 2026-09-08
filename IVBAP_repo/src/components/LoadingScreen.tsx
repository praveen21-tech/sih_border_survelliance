"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  onComplete: () => void;
}

const STEPS = [
  "Loading Modules",
  "Connecting Systems",
  "Calibrating AI Models",
  "Finalizing Secure Link",
];

// ── Animated map background drawn on canvas ────────────────────────────────
function MapBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let t = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Static border / coastline paths (simplified India-Pakistan region silhouette)
    // These are normalized 0-1 coords mapped to canvas size
    const borderPath: [number, number][] = [
      [0.18, 0.08], [0.22, 0.12], [0.20, 0.18], [0.24, 0.22],
      [0.26, 0.28], [0.23, 0.34], [0.27, 0.38], [0.30, 0.42],
      [0.28, 0.50], [0.32, 0.55], [0.36, 0.58], [0.38, 0.64],
      [0.35, 0.70], [0.40, 0.75], [0.44, 0.80], [0.42, 0.88],
      [0.46, 0.92], [0.50, 0.95],
    ];

    const indiaOutline: [number, number][] = [
      [0.50, 0.10], [0.60, 0.12], [0.68, 0.18], [0.72, 0.25],
      [0.75, 0.32], [0.78, 0.40], [0.74, 0.50], [0.70, 0.58],
      [0.65, 0.65], [0.62, 0.73], [0.58, 0.80], [0.52, 0.88],
      [0.48, 0.90], [0.44, 0.80], [0.40, 0.75], [0.38, 0.64],
      [0.36, 0.58], [0.32, 0.55], [0.30, 0.42], [0.38, 0.35],
      [0.42, 0.28], [0.46, 0.20], [0.50, 0.10],
    ];

    function drawLine(
      pts: [number, number][],
      color: string,
      w = 1,
      alpha = 1
    ) {
      if (!canvas) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.globalAlpha = alpha;
      ctx.setLineDash([4, 8]);
      pts.forEach(([nx, ny], i) => {
        const x = nx * canvas.width;
        const y = ny * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Scanning line
    function draw() {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark base
      ctx.fillStyle = "#050c1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radial vignette
      const vg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75
      );
      vg.addColorStop(0, "rgba(10,20,50,0.0)");
      vg.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 0.5;
      const step = 60;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Border / outline lines
      drawLine(borderPath, "rgba(59,130,246,0.25)", 1.2, 1);
      drawLine(indiaOutline, "rgba(59,130,246,0.18)", 1, 1);

      // Scan line
      const scanY = (Math.sin(t * 0.008) * 0.5 + 0.5) * canvas.height;
      const sg = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      sg.addColorStop(0, "rgba(59,130,246,0)");
      sg.addColorStop(0.5, "rgba(59,130,246,0.06)");
      sg.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 40, canvas.width, 80);

      // Blinking dots (sector markers)
      const dots: [number, number, string][] = [
        [0.32, 0.30, "#3b82f6"],
        [0.25, 0.55, "#3b82f6"],
        [0.55, 0.35, "#3b82f6"],
      ];
      dots.forEach(([nx, ny, c]) => {
        if (!canvas) return;
        const x = nx * canvas.width, y = ny * canvas.height;
        const pulse = (Math.sin(t * 0.015 + nx * 10) + 1) / 2;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        ctx.fill();
        ctx.globalAlpha = pulse * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      t++;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  );
}

// ── Corner info blocks ────────────────────────────────────────────────────
function CornerBlock({
  pos,
  lines,
}: {
  pos: "tl" | "tr" | "bl" | "br";
  lines: string[];
}) {
  const posClass = {
    tl: "top-6 left-8",
    tr: "top-6 right-8 text-right",
    bl: "bottom-6 left-8",
    br: "bottom-6 right-8 text-right",
  }[pos];

  return (
    <motion.div
      className={`absolute ${posClass} z-20 select-none`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          className="text-[10px] font-mono tracking-widest uppercase"
          style={{
            color: i === 0 ? "#3b82f6" : "#1e3a5f",
            lineHeight: "1.7",
          }}
        >
          {l}
        </div>
      ))}
      <div
        className={`mt-1.5 h-px w-12 ${pos === "tr" || pos === "br" ? "ml-auto" : ""}`}
        style={{ background: "rgba(59,130,246,0.3)" }}
      />
    </motion.div>
  );
}

// ── Sector label with corner bracket ─────────────────────────────────────
function SectorLabel({
  name,
  lat,
  lng,
  style,
}: {
  name: string;
  lat: string;
  lng: string;
  style: React.CSSProperties;
}) {
  return (
    <motion.div
      className="absolute z-20 select-none"
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      {/* Corner bracket top-left */}
      <div className="relative pl-5 pt-4">
        <svg
          className="absolute top-0 left-0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M1 8 L1 1 L8 1" stroke="rgba(59,130,246,0.5)" strokeWidth="1.2" />
        </svg>
        <svg
          className="absolute bottom-0 left-0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M1 8 L1 15 L8 15" stroke="rgba(59,130,246,0.5)" strokeWidth="1.2" />
        </svg>

        {/* Warning triangle */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L9.33 8.5H0.67L5 1Z" stroke="rgba(59,130,246,0.6)" strokeWidth="0.8" />
          </svg>
          <span
            className="text-[9px] font-bold tracking-[0.15em] uppercase"
            style={{ color: "#3b82f6" }}
          >
            {name}
          </span>
        </div>
        <div className="text-[9px] font-mono" style={{ color: "#1e3a5f" }}>
          {lat}
        </div>
        <div className="text-[9px] font-mono" style={{ color: "#1e3a5f" }}>
          {lng}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusText, setStatusText] = useState("Initializing Surveillance Platform...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      const inc = Math.random() * 12 + 5;
      p = Math.min(p + inc, 100);
      setProgress(p);

      const stepIdx = Math.min(
        Math.floor((p / 100) * STEPS.length),
        STEPS.length - 1
      );
      setCurrentStep(stepIdx);

      const msgs = [
        "Initializing Surveillance Platform...",
        "Connecting to surveillance network...",
        "Calibrating AI detection models...",
        "Establishing secure channels...",
        "System ready.",
      ];
      const mIdx = Math.min(Math.floor((p / 100) * msgs.length), msgs.length - 1);
      setStatusText(msgs[mIdx]);

      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setTimeout(onComplete, 600);
        }, 400);
      }
    }, 320);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Update time only on client side to prevent hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase());
      setCurrentTime(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loading"
          className="fixed inset-0 z-50 overflow-hidden"
          style={{ backgroundColor: "#050c1a" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated map canvas background */}
          <MapBackground />

          {/* Country labels */}
          <motion.div
            className="absolute z-20 select-none"
            style={{ left: "12%", top: "42%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span
              className="text-xs font-bold tracking-[0.3em] uppercase"
              style={{ color: "rgba(59,130,246,0.25)" }}
            >
              PAKISTAN
            </span>
          </motion.div>
          <motion.div
            className="absolute z-20 select-none"
            style={{ left: "48%", top: "48%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <span
              className="text-xs font-bold tracking-[0.3em] uppercase"
              style={{ color: "rgba(59,130,246,0.2)" }}
            >
              INDIA
            </span>
          </motion.div>

          {/* Sector labels */}
          <SectorLabel
            name="BORDER SECTOR A"
            lat="28.6139° N"
            lng="77.2090° E"
            style={{ left: "17%", top: "28%" }}
          />
          <SectorLabel
            name="BORDER SECTOR B"
            lat="32.7266° N"
            lng="74.8570° E"
            style={{ left: "13%", top: "56%" }}
          />

          {/* LIVE FEED badge */}
          <motion.div
            className="absolute right-8 top-1/2 z-20 -translate-y-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div
              className="flex flex-col items-center gap-1 rounded px-3 py-2"
              style={{
                background: "rgba(10,20,40,0.8)",
                border: "1px solid rgba(59,130,246,0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "#22c55e" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span
                  className="text-[9px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: "#22c55e" }}
                >
                  LIVE FEED
                </span>
              </div>
              <span
                className="text-[8px] tracking-[0.15em] uppercase"
                style={{ color: "#1e3a5f" }}
              >
                ONLINE
              </span>
            </div>
          </motion.div>

          {/* Corner text blocks */}
          <CornerBlock
            pos="tl"
            lines={["SECURE BORDERS", "SAFER TOMORROW"]}
          />
          <CornerBlock
            pos="tr"
            lines={[
              "REAL-TIME INTELLIGENCE",
              "AI-POWERED ANALYTICS",
              "A SAFER TOMORROW",
            ]}
          />
          <CornerBlock
            pos="bl"
            lines={["AI-POWERED", "CCTV SURVEILLANCE SYSTEM"]}
          />
          <CornerBlock pos="br" lines={[currentDate, currentTime]} />

          {/* ── Center HUD ── */}
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
            <motion.div
              className="flex flex-col items-center gap-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Camera/crosshair logo */}
              <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                {/* Outer rotating ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderTopColor: "rgba(59,130,246,0.6)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                {/* Second ring */}
                <motion.div
                  className="absolute"
                  style={{
                    inset: 8,
                    borderRadius: "50%",
                    border: "1px solid rgba(59,130,246,0.15)",
                    borderBottomColor: "rgba(59,130,246,0.4)",
                  }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                />

                {/* Crosshair lines */}
                {/* top */}
                <div className="absolute top-2 left-1/2 -translate-x-px w-px h-5" style={{ background: "rgba(59,130,246,0.35)" }} />
                {/* bottom */}
                <div className="absolute bottom-2 left-1/2 -translate-x-px w-px h-5" style={{ background: "rgba(59,130,246,0.35)" }} />
                {/* left */}
                <div className="absolute left-2 top-1/2 -translate-y-px h-px w-5" style={{ background: "rgba(59,130,246,0.35)" }} />
                {/* right */}
                <div className="absolute right-2 top-1/2 -translate-y-px h-px w-5" style={{ background: "rgba(59,130,246,0.35)" }} />

                {/* Inner circle - camera lens */}
                <div
                  className="relative flex items-center justify-center rounded-full"
                  style={{
                    width: 60,
                    height: 60,
                    background: "radial-gradient(circle at 35% 35%, #1e3a6e, #050c1a)",
                    border: "2px solid rgba(59,130,246,0.5)",
                    boxShadow: "0 0 20px rgba(59,130,246,0.15), inset 0 0 20px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Lens highlight */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 44,
                      height: 44,
                      background: "radial-gradient(circle at 35% 35%, rgba(100,160,255,0.15), rgba(0,10,30,0.8))",
                      border: "1px solid rgba(59,130,246,0.3)",
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 22,
                      height: 22,
                      background: "radial-gradient(circle at 30% 30%, #2563eb, #050c1a)",
                      boxShadow: "0 0 10px rgba(59,130,246,0.3)",
                    }}
                  />
                  {/* Lens gleam */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      top: "22%",
                      left: "25%",
                      background: "rgba(255,255,255,0.15)",
                    }}
                  />
                </div>

                {/* Corner tick marks on outer ring */}
                {[0, 90, 180, 270].map((deg) => (
                  <div
                    key={deg}
                    className="absolute"
                    style={{
                      width: 6,
                      height: 1.5,
                      background: "rgba(59,130,246,0.5)",
                      transform: `rotate(${deg}deg) translateX(47px)`,
                      transformOrigin: "center",
                      top: "calc(50% - 0.75px)",
                      left: "calc(50% - 3px)",
                    }}
                  />
                ))}
              </div>

              {/* Brand name */}
              <div className="flex flex-col items-center gap-1.5">
                <h1 className="flex items-baseline gap-2" style={{ fontSize: 36, fontWeight: 700 }}>
                  <span style={{ color: "#ffffff", letterSpacing: "0.02em" }}>BorderEye</span>
                  <span
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    AI
                  </span>
                </h1>
                <p
                  className="text-[10px] tracking-[0.35em] uppercase font-light"
                  style={{ color: "#1e3a5f" }}
                >
                  Intelligence Beyond Borders
                </p>

                {/* Separator */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="h-px w-12" style={{ background: "rgba(59,130,246,0.2)" }} />
                  <div className="h-1 w-1 rounded-full" style={{ background: "rgba(59,130,246,0.3)" }} />
                  <div className="h-px w-12" style={{ background: "rgba(59,130,246,0.2)" }} />
                </div>
              </div>

              {/* Status text */}
              <motion.p
                key={statusText}
                className="text-sm font-mono"
                style={{ color: "#cbd5e1", letterSpacing: "0.05em" }}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {statusText}
              </motion.p>

              {/* Progress bar */}
              <div className="flex items-center gap-4 w-96">
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(59,130,246,0.1)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)",
                      boxShadow: "0 0 12px rgba(59,130,246,0.5)",
                    }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
                <span
                  className="text-sm font-mono font-bold w-10 text-right"
                  style={{ color: "#3b82f6" }}
                >
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-6">
                {STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step} className="flex items-center gap-1.5">
                      {done ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" />
                          <path d="M4 7L6.5 9.5L10 5" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <div
                          className="h-3.5 w-3.5 rounded-full"
                          style={{
                            border: `1px solid ${active ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.15)"}`,
                            background: active ? "rgba(59,130,246,0.1)" : "transparent",
                          }}
                        />
                      )}
                      <span
                        className="text-[10px] font-mono"
                        style={{
                          color: done ? "#3b82f6" : active ? "#94a3b8" : "#1e3a5f",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
