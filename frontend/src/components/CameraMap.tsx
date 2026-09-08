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
      position:relative;width:24px;height:24px;border-radius:50%;
      background:#002060;
      border:2px solid #FFFFFF;
      box-shadow:0 1px 4px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <span style="
        position:absolute;top:-5px;right:-5px;min-width:11px;height:11px;border-radius:50%;
        background:#B71C1C;color:#fff;font-size:7px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        border:1px solid #FFFFFF;
      ">${index + 1}</span>
    </div>`;
  return L.divIcon({ html, className: "", iconAnchor: [12, 12] });
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
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--sh)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          background: "#F4F6FB",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)", marginBottom: 1 }}>
            Camera Deployment Map
          </h2>
          <p style={{ fontSize: 9, color: "var(--text-muted)" }}>
            Border deployment · live camera sites
          </p>
        </div>
        <MapPin size={14} style={{ color: "var(--navy)" }} />
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
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 9,
            fontWeight: 700,
            color: "var(--navy)",
            fontFamily: "var(--mono)",
            letterSpacing: "0.04em",
            pointerEvents: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          6 CAMS · 4 SITES
        </div>
      </div>
    </div>
  );
}