"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { useMap, MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cameraLocations, heatmapPoints } from "@/lib/mockData";
import type { CameraLocation, ThreatLevel } from "@/types";

/* ── Colours ──────────────────────────────────────────────────────────────── */
const THREAT_CLR: Record<ThreatLevel, string> = {
  critical: "#EF4444",
  high:     "#F97316",
  medium:   "#EAB308",
  low:      "#22C55E",
};

/* ── Sector label marker ─────────────────────────────────────────────────── */
function makeSectorIcon(cam: CameraLocation) {
  const color = THREAT_CLR[cam.threatLevel];
  const html = `
    <div style="
      display:flex;align-items:center;gap:5px;
      background:rgba(5,11,20,0.88);
      border:1px solid ${color};
      border-radius:20px;
      padding:4px 10px 4px 6px;
      white-space:nowrap;
      box-shadow:0 2px 12px rgba(0,0,0,0.6);
      pointer-events:auto;
    ">
      <span style="
        width:8px;height:8px;border-radius:50%;
        background:${color};
        box-shadow:0 0 6px ${color};
        flex-shrink:0;
        display:inline-block;
      "></span>
      <span style="
        font-size:10px;font-weight:600;
        color:#FFFFFF;
        font-family:-apple-system,sans-serif;
        letter-spacing:0.01em;
      ">${cam.name}</span>
    </div>`;
  return L.divIcon({ html, className: "", iconAnchor: [0, 0] });
}

/* ── Canvas heatmap — fixed zoom/pan ────────────────────────────────────── */
interface Pt { lat: number; lng: number; intensity: number }

function CanvasHeatmap({ points }: { points: Pt[] }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef  = useRef<number>(0);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sz = map.getSize();
    canvas.width  = sz.x;
    canvas.height = sz.y;

    // Align canvas with the overlay pane's coordinate system
    const tl = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, tl);

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, sz.x, sz.y);

    const zoom   = map.getZoom();
    const scale  = Math.pow(2, zoom - 7);   // base at zoom 7

    for (const pt of points) {
      const cp = map.latLngToContainerPoint(L.latLng(pt.lat, pt.lng));
      const radius = Math.max((50 + pt.intensity * 40) * scale, 16);
      const alpha  = Math.min(pt.intensity * 0.75, 0.78);

      let r: number, g: number, b: number;
      if      (pt.intensity >= 0.80) { r=239; g=68;  b=68;  }
      else if (pt.intensity >= 0.60) { r=249; g=115; b=22;  }
      else if (pt.intensity >= 0.35) { r=234; g=179; b=8;   }
      else                           { r=34;  g=197; b=94;  }

      const grd = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, radius);
      grd.addColorStop(0,    `rgba(${r},${g},${b},${alpha})`);
      grd.addColorStop(0.4,  `rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)})`);
      grd.addColorStop(1,    `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      ctx.arc(cp.x, cp.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }
  }, [map, points]);

  const schedulePaint = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    const HeatLayer = L.Layer.extend({
      onAdd(m: L.Map) {
        const canvas = L.DomUtil.create("canvas") as HTMLCanvasElement;
        Object.assign(canvas.style, {
          position: "absolute", pointerEvents: "none",
          zIndex: "400", mixBlendMode: "screen",
        });
        m.getPanes().overlayPane!.appendChild(canvas);
        canvasRef.current = canvas;
        m.on("move zoom viewreset resize moveend zoomend", schedulePaint);
        schedulePaint();
        return this;
      },
      onRemove(m: L.Map) {
        m.off("move zoom viewreset resize moveend zoomend", schedulePaint);
        canvasRef.current?.remove();
        canvasRef.current = null;
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = new (HeatLayer as any)();
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, schedulePaint]);

  return null;
}

/* ── Sector markers ──────────────────────────────────────────────────────── */
function SectorMarkers() {
  const map = useMap();
  useEffect(() => {
    const markers = cameraLocations.map((cam) =>
      L.marker([cam.lat, cam.lng], {
        icon: makeSectorIcon(cam),
        zIndexOffset: 1000,
      }).addTo(map)
    );
    return () => markers.forEach((m) => m.remove());
  }, [map]);
  return null;
}

/* ── Zoom controls ───────────────────────────────────────────────────────── */
function ZoomControls() {
  const map = useMap();
  const btn = (label: string, fn: () => void) => (
    <button
      key={label}
      onClick={fn}
      style={{
        width: 28, height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(9,21,34,0.92)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        color: "#94A3B8",
        fontSize: 16, fontWeight: 500,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >{label}</button>
  );
  return (
    <div style={{ position: "absolute", bottom: 80, right: 12, zIndex: 500, display: "flex", flexDirection: "column", gap: 3 }}>
      {btn("+", () => map.zoomIn())}
      {btn("−", () => map.zoomOut())}
      <button
        style={{
          width: 28, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(9,21,34,0.92)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Scale bar ───────────────────────────────────────────────────────────── */
function ScaleBar() {
  return (
    <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 500 }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
        background: "rgba(9,21,34,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4, padding: "4px 8px",
      }}>
        <div style={{ width: 60, height: 2, background: "rgba(255,255,255,0.3)", position: "relative" }}>
          <div style={{ position: "absolute", left: 0,  top: 0, width: 1, height: 5, background: "rgba(255,255,255,0.4)", transform: "translateY(-1px)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 1, height: 5, background: "rgba(255,255,255,0.4)", transform: "translateY(-1px)" }} />
        </div>
        <span style={{ fontSize: 9, color: "#94A3B8" }}>50 km</span>
      </div>
    </div>
  );
}

/* ── Threat legend ───────────────────────────────────────────────────────── */
function ThreatLegend() {
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12, zIndex: 500,
      background: "rgba(9,21,34,0.9)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, padding: "10px 14px",
      backdropFilter: "blur(8px)",
    }}>
      <p style={{ fontSize: 9, fontWeight: 600, color: "#4A6080", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
        Threat Level
      </p>
      <div style={{ width: 140, height: 6, borderRadius: 3, background: "linear-gradient(to right,#22C55E,#EAB308,#F97316,#EF4444)", marginBottom: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", width: 140 }}>
        {["Low","Medium","High","Critical"].map((l) => (
          <span key={l} style={{ fontSize: 9, color: "#4A6080" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Sector filter pill ──────────────────────────────────────────────────── */
function SectorFilter() {
  return (
    <div style={{
      position: "absolute", top: 12, right: 50, zIndex: 500,
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(9,21,34,0.92)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "5px 10px", cursor: "pointer",
    }}>
      <span style={{ fontSize: 11, color: "#94A3B8" }}>All Sectors</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="#4A6080" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

/* ── Expand button ───────────────────────────────────────────────────────── */
function ExpandBtn() {
  return (
    <div style={{
      position: "absolute", top: 12, right: 12, zIndex: 500,
      width: 28, height: 28,
      background: "rgba(9,21,34,0.92)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer",
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
      </svg>
    </div>
  );
}

/* ── Map inner (needs useMap) ─────────────────────────────────────────────── */
function MapInner() {
  return (
    <>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" keepBuffer={4} />
      <CanvasHeatmap points={heatmapPoints} />
      <SectorMarkers />
      <ZoomControls />
      <ScaleBar />
      <SectorFilter />
      <ExpandBtn />
    </>
  );
}

/* ── Main panel ─────────────────────────────────────────────────────────── */
function HeatmapPanelInner() {
  // Centre on Pakistan–India border (Kashmir/Punjab)
  const center: [number, number] = [33.4, 73.4];

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>Border Threat Heatmap</h2>
        <p style={{ fontSize: 9.5, color: "var(--text-2)", marginTop: 1 }}>
          Real-time risk visualization across border sectors
        </p>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <MapContainer
          center={center}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
          preferCanvas
        >
          <MapInner />
        </MapContainer>
        <ThreatLegend />
      </div>
    </div>
  );
}

/* ── SSR guard — export as dynamic ──────────────────────────────────────── */
export default HeatmapPanelInner;
