"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Right-side slot — badge, button, etc. */
  action?: ReactNode;
  /** Framer Motion delay for entrance */
  delay?: number;
}

export default function Panel({
  title,
  subtitle,
  children,
  className,
  contentClassName,
  action,
  delay = 0,
}: PanelProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col rounded-xl overflow-hidden",
        "glass",
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0 px-5 py-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {/* Accent dot */}
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #a78bfa)",
                boxShadow: "0 0 6px rgba(59,130,246,0.6)",
              }}
            />
            <h2
              className="text-sm font-semibold tracking-wide uppercase"
              style={{ color: "#cbd5e1", letterSpacing: "0.08em" }}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs ml-3.5" style={{ color: "#475569" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-h-0", contentClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
