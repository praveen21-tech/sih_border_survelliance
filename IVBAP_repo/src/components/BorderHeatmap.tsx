"use client";

import { useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cameraLocations, heatmapPoints } from "@/lib/mockData";
import type { CameraLocation, ThreatLevel } from "@/types";

// ─── Threat colours ────────────────────────────────────────────────────────────

const THREAT_COLOR: Record<ThreatLevel, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
};

// ─── Camera marker (pill label) ────────────────────────────────────────────────

function createMarkerIcon(cam: CameraLocation) {
  const color = THREAT_COLOR[cam.threatLevel];
  const statusColor = cam.status === "online" ? "#22c55e" : cam.status === "degraded" ? "#eab308" : "#ef4444";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="26" viewBox="0 0 110 26">
    <defs>
      <filter id="f${cam.id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${color}" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect x="0" y="0" width="110" height="26" rx="13"
      fill="rgba(8,13,26,0.92)" stroke="${color}" stroke-width="1"
      filter="url(#f${cam.id})"/>
    <circle cx="13" cy="13" r="9" fill="${color}18" stroke="${color}55" stroke-width="0.8"/>
    <rect x="7.5" y="10" width="9" height="6.5" rx="1.5" fill="none" stroke="${color}" stroke-width="1.1"/>
    <circle cx="12" cy="13.2" r="1.8" fill="none" stroke="${color}" stroke-width="0.9"/>
    <path d="M16.5 11.5L19 10.2L19 16L16.5 14.5" fill="${color}" opacity="0.75"/>
    <circle cx="20" cy="6.5" r="2.8" fill="${statusColor}" stroke="rgba(8,13,26,0.9)" stroke-width="1.1"/>
    <text x="28" y="16.5" font-family="-apple-system,sans-serif" font-size="9.5"
      font-weight="600" fill="#c9d4e3" letter-spacing="0.02em">${cam.name}</text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [110, 26],
    iconAnchor: [13, 13],
    popupAnchor: [42, -15],
  });
}

// ─── Canvas heatmap — fixed zoom/resize ───────────────────────────────────────

interface HeatPt { lat: number; lng: number; intensity: number }

function CanvasHeatmap({ points }: { points: HeatPt[] }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef  = useRef<L.Layer | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = map.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;

    // Position canvas to cover the entire map container
    // (use layerPoint offset so it stays aligned during pan)
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size.x, size.y);

    for (const pt of points) {
      // Convert geographic coords → pixel coords relative to current view
      const containerPt = map.latLngToContainerPoint(L.latLng(pt.lat, pt.lng));
      const px = containerPt.x;
      const py = containerPt.y;

      // Scale radius with zoom level so blobs stay geographically proportional
      const zoom   = map.getZoom();
      const base   = 55 + pt.intensity * 35;
      const scale  = Math.pow(2, zoom - 7);           // normalised to zoom 7
      const radius = Math.max(base * scale, 18);

      const alpha = Math.min(pt.intensity * 0.72, 0.72);

      let r: number, g: number, b: number;
      if (pt.intensity >= 0.8)       { r = 239; g = 68;  b = 68;  }
      else if (pt.intensity >= 0.6)  { r = 249; g = 115; b = 22;  }
      else if (pt.intensity >= 0.35) { r = 234; g = 179; b = 8;   }
      else                           { r = 34;  g = 197; b = 94;  }

      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0,    `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${alpha * 0.5})`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, [map, points]);

  useEffect(() => {
    // Create a custom Leaflet layer that hosts the canvas
    const HeatLayer = L.Layer.extend({
      onAdd(m: L.Map) {
        const canvas = L.DomUtil.create("canvas") as HTMLCanvasElement;
        Object.assign(canvas.style, {
          position:      "absolute",
          pointerEvents: "none",
          zIndex:        "400",
          mixBlendMode:  "screen",
        });
        m.getPanes().overlayPane!.appendChild(canvas);
        canvasRef.current = canvas;

        m.on("moveend zoomend viewreset resize", redraw);
        redraw();
        return this;
      },
      onRemove(m: L.Map) {
        m.off("moveend zoomend viewreset resize", redraw);
        canvasRef.current?.remove();
        canvasRef.current = null;
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = new (HeatLayer as any)();
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, redraw]);

  return null;
}

// ─── Camera markers ────────────────────────────────────────────────────────────

function CameraMarkers() {
  const map = useMap();

  useEffect(() => {
    const markers: L.Marker[] = [];

    for (const cam of cameraLocations) {
      const color = THREAT_COLOR[cam.threatLevel];

      const popup = L.popup({ maxWidth: 210, closeButton: true }).setContent(`
        <div style="padding:10px 12px;font-family:-apple-system,sans-serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;font-weight:700;color:#f1f5f9;">${cam.name}</span>
            <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;
              background:${color}18;border:1px solid ${color}40;color:${color};letter-spacing:.08em;">
              ${cam.threatLevel.toUpperCase()}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            <div style="background:rgba(255,255,255,0.04);border-radius:4px;padding:6px 8px;">
              <div style="font-size:9px;color:#475569;margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em;">Risk Score</div>
              <div style="font-size:20px;font-weight:700;color:${color};line-height:1;">${cam.riskScore}</div>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:4px;padding:6px 8px;">
              <div style="font-size:9px;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Status</div>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="height:6px;width:6px;border-radius:50%;background:${
                  cam.status === "online" ? "#22c55e" : cam.status === "degraded" ? "#eab308" : "#ef4444"
                };flex-shrink:0;"></span>
                <span style="font-size:11px;color:#cbd5e1;text-transform:capitalize;">${cam.status}</span>
              </div>
            </div>
          </div>
          <div style="font-size:10px;color:#475569;">Last activity: ${cam.lastActivity}</div>
        </div>
      `);

      const m = L.marker([cam.lat, cam.lng], { icon: createMarkerIcon(cam) })
        .bindPopup(popup)
        .addTo(map);
      markers.push(m);
    }

    return () => markers.forEach((m) => m.remove());
  }, [map]);

  return null;
}

// ─── Map controls ─────────────────────────────────────────────────────────────

function MapControls() {
  const map = useMap();
  return (
    <div
      style={{
        position: "absolute",
        top: 10, right: 10,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {[
        { label: "+", fn: () => map.zoomIn()  },
        { label: "−", fn: () => map.zoomOut() },
      ].map(({ label, fn }) => (
        <button
          key={label}
          onClick={fn}
          style={{
            width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(8,13,26,0.88)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            color: "#94a3b8",
            fontSize: 14, fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Threat legend ────────────────────────────────────────────────────────────

function ThreatLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 10, left: 10,
        zIndex: 500,
        background: "rgba(8,13,26,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6,
        padding: "8px 10px",
        backdropFilter: "blur(10px)",
      }}
    >
      <p style={{ fontSize: 8, fontWeight: 600, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
        Threat Level
      </p>
      <div style={{ height: 6, width: 120, borderRadius: 3, background: "linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)", marginBottom: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", width: 120 }}>
        {["Low", "Med", "High", "Crit"].map((l) => (
          <span key={l} style={{ fontSize: 8, color: "#475569" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BorderHeatmap() {
  // Centred on Pakistan–India border (Kashmir / Punjab region)
  const center: [number, number] = [32.5, 74.5];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        preferCanvas
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
          keepBuffer={4}
        />
        <CanvasHeatmap points={heatmapPoints} />
        <CameraMarkers />
        <MapControls />
      </MapContainer>

      <ThreatLegend />
    </div>
  );
}
