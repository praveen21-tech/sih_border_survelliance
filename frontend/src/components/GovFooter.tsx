"use client";

import React from "react";

export default function GovFooter() {
  return (
    <footer className="gov-institutional-footer">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>
          <strong>भारत सरकार &bull; Government of India</strong> &mdash; Ministry of Home Affairs, Border Security Division
        </span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span className="gov-badge-restricted" style={{ fontSize: 7, padding: "1px 6px" }}>
          RESTRICTED &bull; OFFICIAL USE ONLY
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono, 'Roboto Mono', monospace)" }}>
        <span>GIGW 3.0 Compliant</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>&bull;</span>
        <span>NIC-CERT Monitored</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>&bull;</span>
        <span style={{ color: "var(--gov-saffron)" }}>DEFNET-SEC 256-BIT</span>
      </div>
    </footer>
  );
}
