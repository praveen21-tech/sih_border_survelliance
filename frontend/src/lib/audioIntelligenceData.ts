import type { Severity } from "./threatIntelligenceData";

export type AudioRange = "today" | "week" | "month";

export interface AudioAlert {
  id: string;
  time: string;
  sector: string;
  category: "drone" | "gunshot" | "speech" | "engine" | "footstep" | "alarm";
  eventLabel: string;
  threatLevel: Severity;
  confidence: number;
  transcript?: string;
  audioPath?: string;
}

export interface AudioActivity {
  sector: string;
  totalEvents: number;
  droneEvents: number;
  speechEvents: number;
  threatScore: number;
}

export interface AudioInsight {
  id: string;
  title: string;
  description: string;
  category: "critical" | "warning" | "info";
  timestamp: string;
  sector?: string | null;
}

export interface AudioTrendPoint {
  time: string;
  drone: number;
  gunshot: number;
  speech: number;
  engine: number;
}

export const AUDIO_RANGE_OPTIONS: { id: AudioRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

export const AUDIO_SECTOR_OPTIONS = ["All Sectors", "Sector 1", "Sector 2", "Sector 3", "Sector 4"];

export const audioKpisByRange: Record<AudioRange, { events: number; critical: number; distress: number; sensors: number }> = {
  today: { events: 19, critical: 3, distress: 2, sensors: 8 },
  week: { events: 114, critical: 18, distress: 12, sensors: 8 },
  month: { events: 490, critical: 65, distress: 42, sensors: 8 },
};

export const audioKpiTrends: Record<AudioRange, { events: number; critical: number; distress: number; sensors: number }> = {
  today: { events: 12, critical: 25, distress: -10, sensors: 0 },
  week: { events: -8, critical: 15, distress: 5, sensors: 0 },
  month: { events: 14, critical: -6, distress: 22, sensors: 0 },
};

export const audioKpiSparks: Record<AudioRange, { events: number[]; critical: number[]; distress: number[]; sensors: number[] }> = {
  today: { events: [2, 4, 3, 5, 2, 4, 3], critical: [0, 1, 0, 1, 0, 1, 0], distress: [1, 0, 1, 0, 0, 1, 0], sensors: [8, 8, 8, 8, 8, 8, 8] },
  week: { events: [14, 18, 12, 20, 16, 19, 15], critical: [2, 3, 1, 4, 2, 3, 3], distress: [1, 2, 2, 3, 1, 2, 1], sensors: [8, 8, 8, 8, 8, 8, 8] },
  month: { events: [70, 85, 80, 95, 82, 88, 90], critical: [10, 14, 12, 16, 9, 11, 10], distress: [6, 8, 7, 10, 8, 9, 7], sensors: [8, 8, 8, 8, 8, 8, 8] },
};

export const audioTrendByRange: Record<AudioRange, AudioTrendPoint[]> = {
  today: [
    { time: "00:00", drone: 0, gunshot: 0, speech: 1, engine: 2 },
    { time: "04:00", drone: 1, gunshot: 0, speech: 0, engine: 1 },
    { time: "08:00", drone: 0, gunshot: 0, speech: 2, engine: 3 },
    { time: "12:00", drone: 2, gunshot: 0, speech: 1, engine: 4 },
    { time: "16:00", drone: 0, gunshot: 0, speech: 1, engine: 2 },
    { time: "20:00", drone: 0, gunshot: 0, speech: 0, engine: 1 },
  ],
  week: [
    { time: "Mon", drone: 2, gunshot: 0, speech: 4, engine: 8 },
    { time: "Tue", drone: 3, gunshot: 0, speech: 5, engine: 9 },
    { time: "Wed", drone: 1, gunshot: 1, speech: 6, engine: 7 },
    { time: "Thu", drone: 4, gunshot: 0, speech: 4, engine: 10 },
    { time: "Fri", drone: 2, gunshot: 0, speech: 7, engine: 8 },
    { time: "Sat", drone: 3, gunshot: 0, speech: 3, engine: 6 },
    { time: "Sun", drone: 3, gunshot: 0, speech: 3, engine: 5 },
  ],
  month: [
    { time: "W1", drone: 10, gunshot: 1, speech: 20, engine: 35 },
    { time: "W2", drone: 14, gunshot: 0, speech: 25, engine: 40 },
    { time: "W3", drone: 12, gunshot: 2, speech: 22, engine: 38 },
    { time: "W4", drone: 16, gunshot: 0, speech: 28, engine: 45 },
  ],
};

export const audioDistributionBase = [
  { name: "Drone Harmonics", color: "#EF4444", pct: 0.30 },
  { name: "Radio Speech", color: "#3B82F6", pct: 0.35 },
  { name: "Heavy Engine", color: "#EAB308", pct: 0.25 },
  { name: "Gunshot / Transient", color: "#F97316", pct: 0.10 },
];

export const sectorAudioActivity: AudioActivity[] = [
  { sector: "Sector 1", totalEvents: 6, droneEvents: 1, speechEvents: 3, threatScore: 68 },
  { sector: "Sector 2", totalEvents: 8, droneEvents: 2, speechEvents: 1, threatScore: 84 },
  { sector: "Sector 3", totalEvents: 2, droneEvents: 0, speechEvents: 1, threatScore: 18 },
  { sector: "Sector 4", totalEvents: 3, droneEvents: 0, speechEvents: 0, threatScore: 40 },
];

export const audioAlerts: AudioAlert[] = [
  { id: "AA-201", time: "14:15:20", sector: "Sector 2", category: "drone", eventLabel: "DJI Phantom / Mavic Quadrotor BPF (168 Hz)", threatLevel: "high", confidence: 94 },
  { id: "AA-202", time: "14:10:05", sector: "Sector 1", category: "speech", eventLabel: "Whisper ASR Intercept (Urdu/Hindi Keywords)", threatLevel: "medium", confidence: 89, transcript: "Check the perimeter fence near waypoint 4." },
  { id: "AA-203", time: "13:45:12", sector: "Sector 2", category: "engine", eventLabel: "Low Frequency Diesel Vehicle Idle", threatLevel: "low", confidence: 92 },
];

export const audioInsights: AudioInsight[] = [
  { id: "AIN-1", title: "Acoustic Rotor Frequency Lock", description: "Blade-pass harmonic analysis locked 168.2 Hz BPF (~5,046 RPM) confirming multirotor UAV presence.", category: "critical", timestamp: "18m ago", sector: "Sector 2" },
  { id: "AIN-2", title: "Whisper Multilingual Engine Ready", description: "Faster-Whisper large-v3 operational for 22 Indian and border regional languages.", category: "info", timestamp: "1h ago", sector: null },
];
