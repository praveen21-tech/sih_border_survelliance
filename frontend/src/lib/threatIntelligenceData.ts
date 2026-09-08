export type ThreatRange = "24h" | "7d" | "30d";
export type Severity = "critical" | "high" | "medium" | "low";
export type EventStatus = "open" | "investigating" | "resolved" | "escalated";

export interface ThreatEvent {
  id: string;
  time: string;
  sector: string;
  type: string;
  severity: Severity;
  status: EventStatus;
  confidence: number;
  description: string;
}

export interface ActiveCamera {
  id: string;
  name: string;
  sector: string;
  threatLevel: Severity;
  eventsCount: number;
  status: string;
  latencyMs: number;
}

export interface SectorRisk {
  sector: string;
  riskScore: number;
  criticalCount: number;
  activePersons: number;
  status: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  category: "trend" | "critical" | "warning";
  timestamp: string;
  sector?: string | null;
}

export interface TrendPoint {
  time: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export const RANGE_OPTIONS: { id: ThreatRange; label: string }[] = [
  { id: "24h", label: "Past 24 Hours" },
  { id: "7d", label: "Past 7 Days" },
  { id: "30d", label: "Past 30 Days" },
];

export const SECTOR_OPTIONS = ["All Sectors", "Sector 1", "Sector 2", "Sector 3", "Sector 4"];

export const kpisByRange: Record<ThreatRange, { totalThreats: number; criticalThreats: number; intrusionEvents: number; watchlistHits: number }> = {
  "24h": { totalThreats: 23, criticalThreats: 4, intrusionEvents: 8, watchlistHits: 3 },
  "7d": { totalThreats: 142, criticalThreats: 19, intrusionEvents: 45, watchlistHits: 18 },
  "30d": { totalThreats: 580, criticalThreats: 64, intrusionEvents: 182, watchlistHits: 72 },
};

export const kpiTrends: Record<ThreatRange, { total: number; critical: number; intrusion: number; watchlist: number }> = {
  "24h": { total: -8, critical: 12, intrusion: -4, watchlist: 0 },
  "7d": { total: 14, critical: -15, intrusion: 8, watchlist: 25 },
  "30d": { total: -5, critical: -8, intrusion: 11, watchlist: 18 },
};

export const kpiSparks: Record<ThreatRange, { total: number[]; critical: number[]; intrusion: number[]; watchlist: number[] }> = {
  "24h": { total: [4, 6, 3, 7, 5, 8, 4], critical: [1, 0, 2, 1, 0, 2, 1], intrusion: [2, 1, 3, 2, 4, 3, 4], watchlist: [0, 1, 0, 1, 1, 2, 2] },
  "7d": { total: [18, 22, 19, 25, 20, 24, 14], critical: [3, 4, 2, 5, 1, 4, 2], intrusion: [4, 5, 3, 6, 4, 5, 3], watchlist: [1, 2, 1, 2, 1, 1, 1] },
  "30d": { total: [80, 95, 88, 102, 90, 110, 115], critical: [10, 12, 8, 14, 9, 11, 8], intrusion: [15, 18, 12, 20, 14, 16, 12], watchlist: [5, 6, 4, 7, 5, 4, 3] },
};

export const trendByRange: Record<ThreatRange, TrendPoint[]> = {
  "24h": [
    { time: "00:00", critical: 0, high: 1, medium: 2, low: 4 },
    { time: "04:00", critical: 1, high: 0, medium: 1, low: 2 },
    { time: "08:00", critical: 0, high: 2, medium: 4, low: 5 },
    { time: "12:00", critical: 2, high: 3, medium: 5, low: 6 },
    { time: "16:00", critical: 1, high: 2, medium: 3, low: 4 },
    { time: "20:00", critical: 0, high: 1, medium: 2, low: 3 },
  ],
  "7d": [
    { time: "Mon", critical: 2, high: 4, medium: 8, low: 12 },
    { time: "Tue", critical: 1, high: 5, medium: 7, low: 14 },
    { time: "Wed", critical: 3, high: 6, medium: 9, low: 11 },
    { time: "Thu", critical: 4, high: 3, medium: 10, low: 15 },
    { time: "Fri", critical: 2, high: 7, medium: 8, low: 13 },
    { time: "Sat", critical: 5, high: 8, medium: 12, low: 18 },
    { time: "Sun", critical: 3, high: 4, medium: 6, low: 10 },
  ],
  "30d": [
    { time: "Week 1", critical: 8, high: 22, medium: 35, low: 60 },
    { time: "Week 2", critical: 12, high: 28, medium: 40, low: 72 },
    { time: "Week 3", critical: 10, high: 25, medium: 38, low: 65 },
    { time: "Week 4", critical: 14, high: 30, medium: 44, low: 80 },
  ],
};

export const distributionBase = [
  { name: "Intrusions", color: "#EF4444", pct: 0.35 },
  { name: "Watchlist Matches", color: "#F97316", pct: 0.25 },
  { name: "Acoustic Detections", color: "#8B5CF6", pct: 0.20 },
  { name: "ANPR Violations", color: "#EAB308", pct: 0.20 },
];

export const sectorRisks: SectorRisk[] = [
  { sector: "Sector 1 (North Gate)", riskScore: 78, criticalCount: 2, activePersons: 3, status: "Heightened Alert" },
  { sector: "Sector 2 (Plaza)", riskScore: 42, criticalCount: 0, activePersons: 5, status: "Normal Operations" },
  { sector: "Sector 3 (East Corridor)", riskScore: 24, criticalCount: 0, activePersons: 1, status: "Secure" },
  { sector: "Sector 4 (Vault Perimeter)", riskScore: 88, criticalCount: 3, activePersons: 2, status: "Critical Threat" },
];

export const activeCameras: ActiveCamera[] = [
  { id: "CAM-01", name: "North Gate Main", sector: "Sector 1", threatLevel: "high", eventsCount: 8, status: "Active", latencyMs: 14 },
  { id: "CAM-02", name: "Plaza Central Steps", sector: "Sector 2", threatLevel: "medium", eventsCount: 4, status: "Active", latencyMs: 16 },
  { id: "CAM-03", name: "Corridor 1F Night", sector: "Sector 3", threatLevel: "low", eventsCount: 1, status: "Active", latencyMs: 18 },
  { id: "CAM-04", name: "Data Vault Fence", sector: "Sector 4", threatLevel: "critical", eventsCount: 11, status: "Active", latencyMs: 12 },
];

export const threatEvents: ThreatEvent[] = [
  { id: "TE-101", time: "14:32:04", sector: "Sector 4", type: "Virtual Fence Breach", severity: "critical", status: "open", confidence: 97, description: "Unidentified person crossed restricted security boundary." },
  { id: "TE-102", time: "14:28:45", sector: "Sector 1", type: "Watchlist Positive (PERSON_001)", severity: "high", status: "investigating", confidence: 99, description: "Gallery match for tracked suspect in North Gate area." },
  { id: "TE-103", time: "14:15:20", sector: "Sector 2", type: "Acoustic Drone Sentry Alert", severity: "high", status: "investigating", confidence: 91, description: "Micro-UAV rotor harmonic detected at 168 Hz BPF." },
  { id: "TE-104", time: "13:58:02", sector: "Sector 1", type: "Unregistered Vehicle Entry", severity: "medium", status: "resolved", confidence: 88, description: "ANPR plate unrecognized in authorised fleet index." },
];

export const insights: Insight[] = [
  { id: "IN-1", title: "Correlated Perimeter Activity", description: "PERSON_001 traversed from CAM_01 to CAM_02 within 3 minutes of drone audio detection.", category: "critical", timestamp: "10m ago", sector: "Sector 1" },
  { id: "IN-2", title: "Low-Light Sensitivity Baseline", description: "Corridor night-vision pipeline maintained 94% feature clarity under 5 lux illumination.", category: "trend", timestamp: "45m ago", sector: "Sector 3" },
];
