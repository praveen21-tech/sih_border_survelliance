export interface LiveCamOverlayBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

export interface LiveCam {
  id: string;
  name: string;
  sector: string;
  streamUrl: string;
  status: "live" | "offline";
  fps: number;
  resolution: string;
  overlayBoxes?: LiveCamOverlayBox[];
}

export interface LiveEvent {
  id: string;
  time: string;
  camera: string;
  eventType: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  description: string;
}

export const liveEvents: LiveEvent[] = [
  {
    id: "LE-01",
    time: "14:32:04",
    camera: "CAM-01",
    eventType: "Person Re-ID Sighting",
    severity: "high",
    confidence: 99.4,
    description: "PERSON_001 detected at Main North Gate entry.",
  },
  {
    id: "LE-02",
    time: "14:31:18",
    camera: "CAM-04",
    eventType: "Virtual Fence Tripwire",
    severity: "critical",
    confidence: 96.8,
    description: "Subject entered restricted zone polygon.",
  },
];

export const liveAnalytics = {
  fps: 30,
  latencyMs: 14,
  gpuUtilization: "42%",
  activeStreams: 7,
};

export const liveModels = [
  { name: "YOLO11 Detection", status: "Active", latency: "14ms" },
  { name: "ByteTrack Custom", status: "Active", latency: "2ms" },
  { name: "Person Re-ID Extractor", status: "Active", latency: "8ms" },
  { name: "Acoustic Sentry AED", status: "Active", latency: "5ms" },
];
