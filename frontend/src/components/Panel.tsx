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
        "flex flex-col rounded-md overflow-hidden",
        className
      )}
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        boxShadow: "var(--sh)",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0 px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border-lt)",
          background: "#F4F6FB",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {/* Accent bar */}
            <span
              className="h-3 w-1 rounded-sm shrink-0"
              style={{
                background: "var(--navy)",
              }}
            />
            <h2
              className="text-xs font-bold tracking-wide uppercase"
              style={{ color: "var(--navy)", letterSpacing: "0.04em" }}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-[10px] ml-3" style={{ color: "var(--text-muted)" }}>
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
