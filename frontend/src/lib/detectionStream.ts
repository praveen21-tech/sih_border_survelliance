import { useEffect, useState, useRef, useCallback } from "react";

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type FencePoint = [number, number];

export interface StreamObject {
  id: number | string;
  cls?: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0..1
  reid_id?: string;
  plate_text?: string;
  watchlist?: boolean;
  status?: string;
  designation?: string;
  cross_cam?: string;
  cross_camera_alert?: string;
  previous_location?: string;
  cross_camera?: Record<string, any>;
}

export interface FencePerson {
  track_id: number;
  bbox: [number, number, number, number];
  state: "normal" | "approaching" | "intrusion";
  distance_to_fence?: number;
}

export interface FenceEvent {
  id?: string;
  type?: string;
  track_id?: number;
  severity: "warning" | "critical" | "resolved";
  message: string;
  timestamp: string;
}

export interface FaceAlert {
  ts: number;
  name: string;
  confidence: number;
  designation?: string;
  status?: string;
}

export interface DetectionsFrame {
  type?: string;
  camera?: string;
  seq?: number;
  ts: number;
  vts?: number;
  vfps?: number;
  efps?: number;
  first?: boolean;
  tracking?: boolean;
  cross_camera_alert?: {
    person_id: number | string;
    title: string;
    message: string;
    origin: string;
    current: string;
    timestamp: number;
  };
  cross_camera_events?: Array<{
    person_id: number | string;
    title: string;
    message: string;
    origin: string;
    current: string;
    timestamp: number;
  }>;
  objects: StreamObject[];
  counts: {
    total?: number;
    humans?: number;
    vehicles?: number;
    plates?: number;
    persons?: number;
    approaching?: number;
    intrusion?: number;
    authorized?: number;
    intruders?: number;
  };
  persons?: FencePerson[];
  events?: FenceEvent[];
  fence?: FencePoint[];
  face_alerts?: FaceAlert[];
}

export function useDetectionStream(cameraId: string, enabled: boolean = true) {
  const [frame, setFrame] = useState<DetectionsFrame | null>(null);
  const [online, setOnline] = useState<boolean>(false);
  const [fence, setFence] = useState<FencePoint[]>([
    [0.15, 0.35],
    [0.85, 0.35],
    [0.85, 0.85],
    [0.15, 0.85]
  ]);
  const [timeline, setTimeline] = useState<FenceEvent[]>([]);
  const [session, setSession] = useState<number>(0);
  const [resetted, setResetted] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch (e) {
        // ignore send error
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !cameraId) {
      setOnline(false);
      return;
    }

    const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/ws/analytics";
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setOnline(true);
        ws.send(JSON.stringify({ camera: cameraId, action: "subscribe" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data) return;

          if (data.type === "subscribed") {
            setResetted(data.resetted ?? true);
            setSession((s) => s + 1);
          } else if (data.type === "fence" && Array.isArray(data.polygon)) {
            setFence(data.polygon);
          } else if (data.type === "fence_set" && Array.isArray(data.polygon)) {
            setFence(data.polygon);
          } else if (data.type === "timeline" && Array.isArray(data.events)) {
            setTimeline(data.events);
          } else if (data.type === "frame" || data.objects) {
            setFrame(data);
            if (data.fence && Array.isArray(data.fence)) {
              setFence(data.fence);
            }
            if (data.events && Array.isArray(data.events)) {
              setTimeline((prev) => [...prev, ...data.events].slice(-30));
            }
          }
        } catch (e) {
          // ignore parsing errors
        }
      };

      ws.onclose = () => {
        setOnline(false);
      };

      ws.onerror = () => {
        setOnline(false);
      };
    } catch (e) {
      setOnline(false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cameraId, enabled]);

  return {
    frame,
    online,
    connected: online,
    fence: fence ?? [],
    timeline,
    sendMessage,
    session,
    resetted,
  };
}
