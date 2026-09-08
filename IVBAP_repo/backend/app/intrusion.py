# Virtual Fence intrusion engine for CAM04.
#
# All geometry is in normalized coordinates (0..1) so it is resolution
# independent. For every tracked person we evaluate:
#   - distance from the centroid to the fence boundary,
#   - whether the centroid has entered the polygon (point-in-polygon),
#   - whether movement points toward the fence,
# and drive a per-track state machine -> APPROACHING / INTRUSION / EXIT events.
#
# No hardcoded detections: everything derives from live person boxes.
from __future__ import annotations

import math
from collections import deque
from datetime import datetime, timezone

FENCE_DEFAULT_THRESHOLD = 0.07   # normalized distance that triggers "approaching"
HISTORY_FRAMES = 8               # centroid history kept per track


def point_in_polygon(px: float, py: float, poly: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test."""
    inside = False
    n = len(poly)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _dist_point_segment(px, py, ax, ay, bx, by) -> float:
    dx, dy = bx - ax, by - ay
    if dx == dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy)


def dist_to_fence(px: float, py: float, poly: list[tuple[float, float]]) -> float | None:
    """Shortest distance from (px,py) to any fence segment."""
    if not poly or len(poly) < 2:
        return None
    best = float("inf")
    n = len(poly)
    for i in range(n):
        d = _dist_point_segment(px, py, *poly[i], *poly[(i + 1) % n])
        if d < best:
            best = d
    return best


def _clean_polygon(poly) -> list[tuple[float, float]]:
    out = []
    for v in poly or ():
        try:
            x, y = float(v[0]), float(v[1])
        except (TypeError, ValueError, IndexError):
            continue
        # accept either normalized or pixel-ish values; clamp to 0..1
        m = max(x, y)
        if m > 1.0:
            x, y = x / m, y / m
        out.append((round(min(max(x, 0.0), 1.0), 4), round(min(max(y, 0.0), 1.0), 4)))
    # drop duplicate consecutive vertices
    cleaned: list[tuple[float, float]] = []
    for v in out:
        if not cleaned or (abs(v[0] - cleaned[-1][0]) > 1e-6 or abs(v[1] - cleaned[-1][1]) > 1e-6):
            cleaned.append(v)
    return cleaned if len(cleaned) >= 3 else []


class FenceEngine:
    """Per-camera fence state: user polygon + drifting track states + event deque."""

    def __init__(self, threshold: float = FENCE_DEFAULT_THRESHOLD, max_events: int = 20) -> None:
        self.threshold = threshold
        self.max_events = max_events
        self.polygon: list[tuple[float, float]] = []
        self._hist: dict[int, deque] = {}
        self._state: dict[int, str] = {}
        self.events: deque = deque(maxlen=max_events)

    # ── polygon ────────────────────────────────────────────────────────────
    def set_polygon(self, poly) -> None:
        self.polygon = _clean_polygon(poly)

    # ── per-frame evaluation ───────────────────────────────────────────────
    def clear_tracks(self) -> None:
        self._hist.clear()
        self._state.clear()

    def evaluate(
        self,
        persons: list[tuple[list[float], int]],  # ((x1,y1,x2,y2) normalized, track_id)
    ) -> tuple[list[dict], list[dict]]:
        """Returns (persons_with_state, new_events_for_this_frame)."""
        now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
        new_events: list[dict] = []
        out: list[dict] = []
        poly = self.polygon
        for nbb, tid in persons:
            x1, y1, x2, y2 = nbb
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            hist = self._hist.setdefault(tid, deque(maxlen=HISTORY_FRAMES))
            hist.append((cx, cy))

            state = "normal"
            prev = self._state.get(tid)

            if poly:
                inside = point_in_polygon(cx, cy, poly)
                d = dist_to_fence(cx, cy, poly)
                moving_toward = False
                if d is not None:
                    d_prev = dist_to_fence(*hist[-min(len(hist), 4)], poly) if len(hist) >= 4 else d
                    moving_toward = d_prev is not None and (d_prev - d) > 1e-4

                if inside:
                    state = "intrusion"
                    if prev != "intrusion":
                        new_events.append(self._mk_event(now_iso, tid, "intrusion", "critical", "INTRUSION DETECTED"))
                elif d is not None and d < self.threshold and moving_toward:
                    state = "approaching"
                    if prev != "approaching":
                        new_events.append(self._mk_event(now_iso, tid, "approach", "warning", "APPROACHING RESTRICTED ZONE"))

                if prev == "intrusion" and state != "intrusion":
                    new_events.append(self._mk_event(now_iso, tid, "exit", "resolved", "SUBJECT LEFT RESTRICTED ZONE"))

                self._state[tid] = state

            out.append(
                {
                    "track_id": tid,
                    "bbox": [round(x1, 4), round(y1, 4), round(x2 - x1, 4), round(y2 - y1, 4)],
                    "state": state,
                }
            )

        for e in new_events:
            self.events.append(e)
        return out, new_events

    def _mk_event(self, ts: str, tid: int, etype: str, severity: str, message: str) -> dict:
        return {
            "type": etype,
            "track_id": tid,
            "severity": severity,
            "message": message,
            "timestamp": ts,
        }