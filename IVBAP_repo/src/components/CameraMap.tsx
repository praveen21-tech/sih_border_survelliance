"use client";

import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

/* ── Camera deployment sites along the Indian border ─────────────────────── */
const CAM_SITES: {
  id: string;
  lat: number;
  lng: number;
  label: string;
  cams: string[];
}[] = [
  { id: "A", lat: 31.605, lng: 74.573, label: "Attari–Wagah", cams: ["CAM 01", "CAM 05"] },   // India–Pakistan
  { id: "B", lat: 27.386, lng: 88.834, label: "Nathu La", cams: ["CAM 03", "CAM 04"] },       // India–China
  { id: "C", lat: 23.031, lng: 88.88, label: "Petrapole", cams: ["CAM 06"] },                 // India–Bangladesh
  { id: "D", lat: 24.26, lng: 94.3, label: "Moreh", cams: ["CAM 02"] },                       // India–Myanmar
];

function makeCameraIcon(index: number) {
  const html = `
    <div style="
      position:relative;width:22px;height:22px;border-radius:50%;
      background:rgba(9,21,34,0.96);
      border:2px solid #3B82F6;
      box-shadow:0 0 10px rgba(59,130,246,0.55);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <span style="
        position:absolute;top:-4px;right:-4px;min-width:9px;height:9px;border-radius:50%;
        background:#EF4444;color:#fff;font-size:6.5px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        border:1px solid rgba(9,21,34,0.9);
      ">${index + 1}</span>
    </div>`;
  return L.divIcon({ html, className: "", iconAnchor: [11, 11] });
}

export default function CameraMap() {
  const bounds: L.LatLngBoundsExpression = [
    [19.8, 70.0],
    [34.0, 98.0],
  ];

  return (
    <div
      style={{
        height: "100%",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "6px 9px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-1)", marginBottom: 1 }}>
            Camera Map
          </h2>
          <p style={{ fontSize: 7.5, color: "var(--text-3)" }}>
            Border deployment · live camera sites
          </p>
        </div>
        <MapPin size={12} style={{ color: "#3B82F6" }} />
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <MapContainer
          bounds={bounds}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          {CAM_SITES.map((site, i) => (
            <Marker key={site.id} position={[site.lat, site.lng]} icon={makeCameraIcon(i)}>
              <Tooltip
                permanent
                direction="top"
                offset={[0, -12]}
                opacity={1}
                className="bordereye-tooltip"
              >
                <span>
                  {site.label}
                  <br />
                  <b>{site.cams.join(" · ")}</b>
                </span>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Status chip */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 6,
            zIndex: 500,
            background: "rgba(9,21,34,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            padding: "3px 7px",
            fontSize: 7.5,
            color: "#94A3B8",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          6 CAMS · 4 SITES
        </div>
      </div>
    </div>
  );
}