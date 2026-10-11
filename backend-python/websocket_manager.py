import asyncio
import json
import logging
import uuid
from typing import Dict, Set, List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("inveniq.websocket")

class UnifiedStompManager:
    """
    Unified STOMP WebSocket Manager supporting:
    1. Modern Native WebSockets (brokerURL: 'ws://localhost:8080/ws')
    2. Legacy SockJS emulated frames (for backwards compatibility)
    """
    def __init__(self):
        # Maps active WebSocket to a dict with metadata:
        # {
        #   "is_sockjs": bool,
        #   "subscriptions": {subscription_id: destination}
        # }
        self.connections: Dict[WebSocket, dict] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, is_sockjs: bool = False):
        # Extract requested subprotocol from browser client if provided (e.g. @stomp/stompjs sends v12.stomp)
        sec_protocol = websocket.headers.get("sec-websocket-protocol", "")
        chosen_protocol = None
        if sec_protocol:
            for proto in [p.strip() for p in sec_protocol.split(",")]:
                if proto in ("v12.stomp", "v11.stomp", "v10.stomp"):
                    chosen_protocol = proto
                    break
            if not chosen_protocol:
                chosen_protocol = sec_protocol.split(",")[0].strip()

        if chosen_protocol:
            await websocket.accept(subprotocol=chosen_protocol)
        else:
            await websocket.accept()

        async with self._lock:
            self.connections[websocket] = {
                "is_sockjs": is_sockjs,
                "subscriptions": {}
            }
        
        # If client connected via SockJS endpoint, send SockJS open frame 'o'
        if is_sockjs:
            try:
                await websocket.send_text("o")
            except Exception as e:
                logger.warning(f"Failed to send SockJS open frame: {e}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.connections:
                del self.connections[websocket]

    async def handle_message(self, websocket: WebSocket, raw_text: str):
        """
        Parses incoming STOMP frames from either raw WebSocket or SockJS framing.
        """
        if not raw_text or raw_text == "h" or raw_text == "\n":
            return  # Heartbeat ping

        async with self._lock:
            conn_meta = self.connections.get(websocket)

        if not conn_meta:
            return

        is_sockjs = conn_meta.get("is_sockjs", False)

        frames = []
        if raw_text.startswith("[") and raw_text.endswith("]"):
            # SockJS transport frame array
            try:
                frames = json.loads(raw_text)
                conn_meta["is_sockjs"] = True
            except Exception:
                frames = [raw_text]
        else:
            frames = [raw_text]

        for frame in frames:
            if not isinstance(frame, str):
                continue
            await self._process_stomp_frame(websocket, frame, conn_meta)

    async def _process_stomp_frame(self, websocket: WebSocket, frame: str, conn_meta: dict):
        clean_frame = frame.strip("\r\n\x00")
        if not clean_frame:
            return

        lines = clean_frame.split("\n")
        if not lines:
            return

        command = lines[0].strip().replace("\r", "")
        headers = {}
        body = ""

        # Parse headers and body
        is_body = False
        body_lines = []
        for line in lines[1:]:
            clean_line = line.replace("\r", "")
            if is_body:
                body_lines.append(clean_line)
            elif clean_line == "":
                is_body = True
            elif ":" in clean_line:
                k, v = clean_line.split(":", 1)
                headers[k.strip()] = v.strip()

        body = "\n".join(body_lines)
        is_sockjs = conn_meta.get("is_sockjs", False)

        if command in ("CONNECT", "STOMP"):
            connected_stomp = "CONNECTED\nversion:1.2\nheart-beat:4000,4000\nsession:inveniq-stomp-session\n\n\x00"
            try:
                if is_sockjs:
                    await websocket.send_text("a" + json.dumps([connected_stomp]))
                else:
                    await websocket.send_text(connected_stomp)
            except Exception as e:
                logger.warning(f"Error sending STOMP CONNECTED: {e}")

        elif command == "SUBSCRIBE":
            dest = headers.get("destination", "")
            sub_id = headers.get("id", "sub-0")
            async with self._lock:
                if websocket in self.connections:
                    self.connections[websocket]["subscriptions"][sub_id] = dest
                    logger.debug(f"Client subscribed to {dest} (id={sub_id})")

        elif command == "UNSUBSCRIBE":
            sub_id = headers.get("id")
            async with self._lock:
                if websocket in self.connections and sub_id in self.connections[websocket]["subscriptions"]:
                    del self.connections[websocket]["subscriptions"][sub_id]

        elif command == "DISCONNECT":
            receipt = headers.get("receipt")
            if receipt:
                receipt_stomp = f"RECEIPT\nreceipt-id:{receipt}\n\n\x00"
                if is_sockjs:
                    await websocket.send_text("a" + json.dumps([receipt_stomp]))
                else:
                    await websocket.send_text(receipt_stomp)

    async def broadcast(self, destination: str, payload: dict):
        """
        Broadcasts message payload to all clients subscribed to destination.
        """
        json_body = json.dumps(payload, default=str)
        dead_connections = []

        async with self._lock:
            active_items = list(self.connections.items())

        for ws, meta in active_items:
            subscriptions = meta.get("subscriptions", {})
            is_sockjs = meta.get("is_sockjs", False)

            sub_id = None
            for s_id, dest in subscriptions.items():
                if dest == destination:
                    sub_id = s_id
                    break

            if sub_id is None:
                sub_id = "default"

            msg_id = f"msg-{uuid.uuid4().hex[:8]}"
            stomp_msg = f"MESSAGE\ndestination:{destination}\nsubscription:{sub_id}\nmessage-id:{msg_id}\ncontent-type:application/json\n\n{json_body}\x00"

            try:
                if is_sockjs:
                    await ws.send_text("a" + json.dumps([stomp_msg]))
                else:
                    await ws.send_text(stomp_msg)
            except Exception:
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    if ws in self.connections:
                        del self.connections[ws]

    async def broadcast_stock_update(self, product_dict: dict):
        """Broadcasts updated product to /topic/stock-updates"""
        await self.broadcast("/topic/stock-updates", product_dict)

    async def broadcast_activity(self, activity_dict: dict):
        """Broadcasts stock transaction to /topic/activity"""
        await self.broadcast("/topic/activity", activity_dict)

    async def broadcast_alert(self, alert_dict: dict):
        """Broadcasts real-time warning/critical alert to /topic/alerts"""
        await self.broadcast("/topic/alerts", alert_dict)

    @property
    def active_connections(self):
        # Backwards compatibility helper
        return {ws: meta.get("subscriptions", {}) for ws, meta in self.connections.items()}


# Singleton manager instance
ws_manager = UnifiedStompManager()
