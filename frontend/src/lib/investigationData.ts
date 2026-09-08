export type Priority = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "investigating" | "escalated" | "closed";
export type SceneVariant = "checkpoint" | "road" | "tower" | "fence" | "cargo" | "night";

export interface Incident {
  id: string;
  type: string;
  icon: "watchlist" | "intrusion" | "anpr" | "suspicious" | "fence" | "vehicle" | "human" | "night";
  title: string;
  priority: Priority;
  status: IncidentStatus;
  camera: string;
  sector: string;
  date: string;
  time: string;
  location: string;
  snapshotTime: string;
  confidence: number;
  frameVariant: SceneVariant;
  description: string;
  timeline: { time: string; label: string }[];
  snapshotUrl?: string;
  evidenceNotes?: string;
  operatorNotes?: string;
}

export interface LinkedDetection {
  id: string;
  time: string;
  camera: string;
  type: string;
  confidence: number;
  similarity: number;
}

export const incidents: Incident[] = [
  {
    id: "INC-2026-089",
    type: "Watchlist Match",
    icon: "watchlist",
    title: "Watchlist Suspect Identified: PERSON_001",
    priority: "critical",
    status: "investigating",
    camera: "CAM_01_GATE_NORTH",
    sector: "Sector 1 (North Gate)",
    date: "07 Sep 2026",
    time: "14:32:04",
    location: "Main North Gate Entry (Sector 1)",
    snapshotTime: "14:32:04",
    confidence: 99.4,
    frameVariant: "checkpoint",
    description: "Multi-camera Person Re-ID verified subject matching PERSON_001 with 0.998 Re-ID similarity score across CAM_01 and CAM_02.",
    timeline: [
      { time: "14:30:10", label: "Initial person detection at Gate North entry portal" },
      { time: "14:32:04", label: "Re-ID feature match against High-Value Watchlist (99.4%)" },
      { time: "14:32:20", label: "Transit logged entering Plaza steps corridor" },
    ],
    evidenceNotes: "Cross-camera trajectory confirms transit from Gate North to Plaza Steps in 2m 14s.",
    operatorNotes: "Operator dispatched QRF unit to Plaza Entry.",
  },
  {
    id: "INC-2026-088",
    type: "Perimeter Intrusion",
    icon: "intrusion",
    title: "Virtual Perimeter Intrusion",
    priority: "high",
    status: "open",
    camera: "CAM_04_SERVER_ROOM",
    sector: "Sector 4 (Vault)",
    date: "07 Sep 2026",
    time: "14:18:12",
    location: "Server Vault Perimeter (Sector 4)",
    snapshotTime: "14:18:12",
    confidence: 96.2,
    frameVariant: "fence",
    description: "Subject entered restricted yellow perimeter tripwire zone without authorization credential.",
    timeline: [
      { time: "14:17:50", label: "Subject entered field of view approaching perimeter" },
      { time: "14:18:12", label: "Virtual fence polygon breach detected (confidence 96.2%)" },
      { time: "14:18:30", label: "Automatic lockdown signal triggered" },
    ],
    evidenceNotes: "Optical flow and ByteTrack confirm rapid crossing direction toward Vault door.",
    operatorNotes: "Surveillance lock engaged on Sector 4 corridor.",
  },
  {
    id: "INC-2026-087",
    type: "Acoustic Threat",
    icon: "suspicious",
    title: "Acoustic UAV Detection - Sector 2",
    priority: "high",
    status: "escalated",
    camera: "CAM_02_LOBBY",
    sector: "Sector 2 (Plaza)",
    date: "07 Sep 2026",
    time: "14:05:30",
    location: "Plaza Steps & Outer Courtyard (Sector 2)",
    snapshotTime: "14:05:30",
    confidence: 91.8,
    frameVariant: "road",
    description: "Blade-pass acoustic harmonics identified approaching micro-UAV (BPF: 168 Hz, ~5,040 RPM).",
    timeline: [
      { time: "14:04:15", label: "Acoustic sensor picked up high-frequency harmonic buzz" },
      { time: "14:05:30", label: "BPF matched DJI Phantom rotor signature (168 Hz)" },
      { time: "14:06:00", label: "Sentry alert escalated to EW unit" },
    ],
    evidenceNotes: "Acoustic sentry triangulation matches heading North-Northwest.",
    operatorNotes: "Electronic countermeasure sentry alerted.",
  },
];

export const linkedDetections: LinkedDetection[] = [
  { id: "LK-01", time: "14:30:10", camera: "CAM_01_GATE_NORTH", type: "Person Detection", confidence: 99.2, similarity: 100 },
  { id: "LK-02", time: "14:32:24", camera: "CAM_02_LOBBY", type: "Cross-Camera Sighting", confidence: 98.7, similarity: 99.8 },
  { id: "LK-03", time: "14:34:01", camera: "CAM_03_CORRIDOR_1F", type: "Transit Corroboration", confidence: 95.1, similarity: 97.4 },
];
