import asyncio
from collections import defaultdict
from typing import Dict, Set
from fastapi import WebSocket

class UnifiedHub:
    def __init__(self):
        self._camera_subscribers: Dict[str, Set[WebSocket]] = defaultdict(set)
        self._audio_subscribers: Set[WebSocket] = set()
        self._general_subscribers: Set[WebSocket] = set()
        self._locks: Dict[str, asyncio.Lock] = {}

    async def subscribe(self, camera_id: str, ws: WebSocket):
        await self.subscribe_camera(camera_id, ws)

    async def subscribe_camera(self, camera_id: str, ws: WebSocket):
        self._camera_subscribers[camera_id].add(ws)
        if camera_id not in self._locks:
            self._locks[camera_id] = asyncio.Lock()

    async def unsubscribe(self, camera_id: str, ws: WebSocket):
        await self.unsubscribe_camera(camera_id, ws)

    async def unsubscribe_camera(self, camera_id: str, ws: WebSocket):
        self._camera_subscribers[camera_id].discard(ws)

    def count(self, camera_id: str) -> int:
        return self.count_camera(camera_id)

    def count_camera(self, camera_id: str) -> int:
        return len(self._camera_subscribers[camera_id])

    async def broadcast(self, camera_id: str, payload: dict):
        await self.broadcast_camera(camera_id, payload)

    async def broadcast_camera(self, camera_id: str, payload: dict):
        subs = list(self._camera_subscribers[camera_id])
        if not subs:
            return
        for ws in subs:
            try:
                await ws.send_json(payload)
            except Exception:
                self._camera_subscribers[camera_id].discard(ws)

    async def subscribe_audio(self, ws: WebSocket):
        self._audio_subscribers.add(ws)

    async def unsubscribe_audio(self, ws: WebSocket):
        self._audio_subscribers.discard(ws)

    async def broadcast_audio(self, payload: dict):
        subs = list(self._audio_subscribers)
        for ws in subs:
            try:
                await ws.send_json(payload)
            except Exception:
                self._audio_subscribers.discard(ws)

hub = UnifiedHub()
