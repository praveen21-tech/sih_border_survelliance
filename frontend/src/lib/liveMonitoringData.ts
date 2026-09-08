export interface CameraFeed {
  id: string;
  name: string;
  sector: string;
  streamUrl: string;
  videoSrc: string;
  detectionStream: string;
  fps: number;
  resolution: string;
  status: "live" | "offline" | "recording";
  personCount: number;
  vehicleCount: number;
  anomalyDetected: boolean;
  hasVirtualFence?: boolean;
}

export interface DetectionEvent {
  id: string;
  cameraName: string;
  time: string;
  type: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

export interface AnalyticsMetric {
  title: string;
  value: string | number;
  delta: string;
  trend: "up" | "down" | "neutral";
  detail: string;
}

export const cameraFeeds: CameraFeed[] = [
  {
    id: "cam-01",
    name: "CAM-01 Human Detection (ByteTrack)",
    sector: "Sector 1 (North Gate)",
    streamUrl: "/cam1.mp4",
    videoSrc: "/cam1.mp4",
    detectionStream: "cam-01",
    fps: 30,
    resolution: "1920x1080",
    status: "live",
    personCount: 3,
    vehicleCount: 0,
    anomalyDetected: false,
    hasVirtualFence: false,
  },
  {
    id: "cam-02",
    name: "CAM-02 Vehicle ANPR (Number Plate)",
    sector: "Sector 2 (Plaza Gate)",
    streamUrl: "/cam2.mp4",
    videoSrc: "/cam2.mp4",
    detectionStream: "cam-02",
    fps: 30,
    resolution: "1920x1080",
    status: "live",
    personCount: 5,
    vehicleCount: 2,
    anomalyDetected: false,
    hasVirtualFence: false,
  },
  {
    id: "cam-03",
    name: "CAM-03 Cross-Camera Re-ID (CAM-01 Track)",
    sector: "Sector 3 (East Corridor - Ingress from CAM-01)",
    streamUrl: "/cam1.mp4",
    videoSrc: "/cam1.mp4",
    detectionStream: "cam-03",
    fps: 25,
    resolution: "1280x720",
    status: "live",
    personCount: 1,
    vehicleCount: 0,
    anomalyDetected: false,
    hasVirtualFence: false,
  },
  {
    id: "cam-04",
    name: "CAM-04 Virtual Fence Intrusion",
    sector: "Sector 4 (Vault Perimeter)",
    streamUrl: "/cam4.mp4",
    videoSrc: "/cam4.mp4",
    detectionStream: "cam-04",
    fps: 30,
    resolution: "1920x1080",
    status: "live",
    personCount: 2,
    vehicleCount: 0,
    anomalyDetected: true,
    hasVirtualFence: true,
  },
  {
    id: "cam-05",
    name: "CAM-05 Acoustic Drone / Thermal Sentry",
    sector: "Sector 2 (Airspace)",
    streamUrl: "/cam5.mp4",
    videoSrc: "/cam5.mp4",
    detectionStream: "cam-05",
    fps: 30,
    resolution: "1920x1080",
    status: "live",
    personCount: 1,
    vehicleCount: 0,
    anomalyDetected: false,
    hasVirtualFence: false,
  },
  {
    id: "cam-06",
    name: "CAM-06 Facial Recognition (Webcam / Live)",
    sector: "Sector 1 (Checkpoint Access)",
    streamUrl: "/cam2.mp4",
    videoSrc: "/cam2.mp4",
    detectionStream: "cam-06",
    fps: 15,
    resolution: "1280x720",
    status: "live",
    personCount: 1,
    vehicleCount: 0,
    anomalyDetected: false,
    hasVirtualFence: false,
  },
];

export const detectionEvents: DetectionEvent[] = [
  {
    id: "DE-01",
    cameraName: "CAM-03 East Corridor",
    time: "14:34:12",
    type: "Cross-Camera Re-ID (Appeared in CAM-01)",
    confidence: 99.1,
    severity: "high",
    description: "Subject identified: Crossed CAM-01 North Gate and reappeared in CAM-03 East Corridor.",
  },
  {
    id: "DE-02",
    cameraName: "CAM-01 North Gate",
    time: "14:32:04",
    type: "Person Ingress Tracked",
    confidence: 98.4,
    severity: "medium",
    description: "Person #1 logged entering sector 1 perimeter towards corridor.",
  },
  {
    id: "DE-03",
    cameraName: "CAM-04 Fence Perimeter",
    time: "14:31:18",
    type: "Tripwire Breach",
    confidence: 96.8,
    severity: "critical",
    description: "Subject entered restricted zone polygon.",
  },
  {
    id: "DE-04",
    cameraName: "CAM-02 Plaza & Steps",
    time: "14:29:50",
    type: "ANPR Plate Verified",
    confidence: 94.5,
    severity: "low",
    description: "Vehicle plate recognized and matched against perimeter whitelist.",
  },
];

export const analyticsMetrics: AnalyticsMetric[] = [
  {
    title: "Cross-Camera Re-ID",
    value: "CAM-01 → CAM-03",
    delta: "100% Synced",
    trend: "up",
    detail: "Real-time movement correlation",
  },
  {
    title: "YOLO Inference Speed",
    value: "14.2 ms",
    delta: "-1.8 ms",
    trend: "down",
    detail: "Sub-20ms real-time throughput",
  },
  {
    title: "Re-ID Gallery Size",
    value: "12 Identities",
    delta: "+2 today",
    trend: "up",
    detail: "512-d feature space",
  },
  {
    title: "Acoustic Sentry Health",
    value: "99.8%",
    delta: "Optimal",
    trend: "neutral",
    detail: "Continuous background listening",
  },
];
