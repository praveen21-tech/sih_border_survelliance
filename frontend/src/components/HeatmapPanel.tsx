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
  critical: "#B71C1C",
  high:     "#C05000",
  medium:   "#0D5EA6",
  low:      "#1A6B3C",
};

/* ── Sector label marker ─────────────────────────────────────────────────── */
function makeSectorIcon(cam: CameraLocation) {
  const color = THREAT_CLR[cam.threatLevel];
  const html = `
    <div style="
      display:flex;align-items:center;gap:5px;
      background:#FFFFFF;
      border:1.5px solid ${color};
      border-radius:20px;
      padding:4px 10px 4px 6px;
      white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.15);
      pointer-events:auto;
    ">
      <span style="
        width:8px;height:8px;border-radius:50%;
        background:${color};
        flex-shrink:0;
        display:inline-block;
      "></span>
      <span style="
        font-size:10px;font-weight:700;
        color:#002060;
        font-family:'Noto Sans',sans-serif;
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
      if      (pt.intensity >= 0.80) { r=183; g=28;  b=28;  }
      else if (pt.intensity >= 0.60) { r=192; g=80;  b=0;   }
      else if (pt.intensity >= 0.35) { r=13;  g=94;  b=166; }
      else                           { r=26;  g=107; b=60;  }

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
          zIndex: "400", mixBlendMode: "multiply",
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
    const l = new (HeatLayer as any)();
    l.addTo(map);
    return () => { map.removeLayer(l); };
  }, [map, schedulePaint]);

  return null;
}

/* ── Sector markers ──────────────────────────────────────────────────────── */
function SectorMarkers() {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    for (const cam of cameraLocations) {
      const color = THREAT_CLR[cam.threatLevel];
      const popHtml = `
        <div style="padding:10px 12px;font-family:'Noto Sans',sans-serif;background:#FFFFFF;border-radius:4px;color:#1A2535;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #C8D0DE;">
            <span style="font-size:12px;font-weight:700;color:#002060;">${cam.name}</span>
            <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;
              background:${color}18;border:1px solid ${color}60;color:${color};letter-spacing:.08em;">
              ${cam.threatLevel.toUpperCase()}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            <div style="background:#F4F6FB;border:1px solid #E4E9F2;border-radius:4px;padding:6px 8px;">
              <div style="font-size:9px;color:#5A6A7C;margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Risk Score</div>
              <div style="font-size:20px;font-weight:700;color:${color};line-height:1;font-family:'Roboto Mono',monospace;">${cam.riskScore}</div>
            </div>
            <div style="background:#F4F6FB;border:1px solid #E4E9F2;border-radius:4px;padding:6px 8px;">
              <div style="font-size:9px;color:#5A6A7C;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Status</div>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="height:6px;width:6px;border-radius:50%;background:${
                  cam.status === "online" ? "#1A6B3C" : cam.status === "degraded" ? "#C05000" : "#B71C1C"
                };flex-shrink:0;"></span>
                <span style="font-size:11px;color:#1A2535;font-weight:600;text-transform:capitalize;">${cam.status}</span>
              </div>
            </div>
          </div>
          <div style="font-size:10px;color:#5A6A7C;">Last activity: <strong style="color:#1A2535;">${cam.lastActivity}</strong></div>
        </div>`;

      const m = L.marker([cam.lat, cam.lng], { icon: makeSectorIcon(cam) })
        .bindPopup(popHtml, { maxWidth: 220 })
        .addTo(map);
      markers.push(m);
    }

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
        background: "#FFFFFF",
        border: "1px solid #C8D0DE",
        borderRadius: 4,
        color: "#003380",
        fontSize: 16, fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        lineHeight: 1,
      }}
    >{label}</button>
  );
  return (
    <div style={{ position: "absolute", bottom: 80, right: 12, zIndex: 500, display: "flex", flexDirection: "column", gap: 4 }}>
      {btn("+", () => map.zoomIn())}
      {btn("−", () => map.zoomOut())}
    </div>
  );
}

/* ── Scale bar ───────────────────────────────────────────────────────────── */
function ScaleBar() {
  return (
    <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 500 }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
        background: "#FFFFFF",
        border: "1px solid #C8D0DE",
        borderRadius: 4, padding: "4px 8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
        <div style={{ width: 60, height: 2, background: "#C8D0DE", position: "relative" }}>
          <div style={{ position: "absolute", left: 0,  top: 0, width: 1, height: 5, background: "#5A6A7C", transform: "translateY(-1px)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 1, height: 5, background: "#5A6A7C", transform: "translateY(-1px)" }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#5A6A7C", fontFamily: "var(--mono)" }}>50 km</span>
      </div>
    </div>
  );
}

/* ── Threat legend ───────────────────────────────────────────────────────── */
function ThreatLegend() {
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12, zIndex: 500,
      background: "#FFFFFF",
      border: "1px solid #C8D0DE",
      borderRadius: 4, padding: "8px 12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: "#003380", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
        Threat Level
      </p>
      <div style={{ width: 140, height: 6, borderRadius: 3, background: "linear-gradient(to right,#1A6B3C,#0D5EA6,#C05000,#B71C1C)", marginBottom: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", width: 140 }}>
        {["Low","Medium","High","Critical"].map((l) => (
          <span key={l} style={{ fontSize: 8.5, fontWeight: 600, color: "#5A6A7C" }}>{l}</span>
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
      background: "#FFFFFF",
      border: "1px solid #C8D0DE",
      borderRadius: 4, padding: "5px 10px", cursor: "pointer",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#003380" }}>All Sectors</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="#003380" strokeWidth="1.4" strokeLinecap="round"/>
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
      background: "#FFFFFF",
      border: "1px solid #C8D0DE",
      borderRadius: 4,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003380" strokeWidth="2" strokeLinecap="round">
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
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "9px 12px",
        background: "#F4F6FB",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>Border Threat Heatmap</h2>
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
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
