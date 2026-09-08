export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type ThreatLevel   = "critical" | "high" | "medium" | "low";
export type EventType =
  | "intrusion" | "vehicle" | "watchlist" | "drone"
  | "audio"     | "camera"  | "checkpoint" | "human";

export interface KPICard {
  id: string;
  label: string;
  value: number | string;
  iconName: "Camera" | "ShieldAlert" | "Users" | "Volume2";
  delta: string;
  deltaType: "up" | "down";
  deltaLabel: string;
  accentColor: string;
  barData: number[];
}

export interface CameraLocation {
  id: string;
  name: string;       // "Sector A" etc
  lat: number;
  lng: number;
  riskScore: number;
  threatLevel: ThreatLevel;
  status: "online" | "offline" | "degraded";
  lastActivity: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1
}

export interface AlertRow {
  id: string;
  time: string;
  event: string;
  sector: string;
  severity: SeverityLevel;
  status: "Active" | "Investigating" | "Resolved";
  iconType: "person" | "watchlist" | "drone" | "audio" | "vehicle";
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: EventType;
  severity: SeverityLevel;
  dotColor: string;
}
