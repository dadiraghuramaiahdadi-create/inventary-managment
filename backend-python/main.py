import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, Response
import uvicorn

from config import settings
from database import engine, Base, SessionLocal
from seeder import seed_database_if_empty
from websocket_manager import ws_manager

# Import all routers
from routers.auth_router import router as auth_router
from routers.product_router import router as product_router
from routers.stock_router import router as stock_router
from routers.po_router import router as po_router
from routers.dashboard_router import router as dashboard_router
from routers.category_router import router as category_router
from routers.supplier_router import router as supplier_router
from routers.user_router import router as user_router
from routers.report_router import router as report_router
from routers.analytics_router import router as analytics_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("inveniq.server")

# Background heartbeat task for SockJS clients
async def sockjs_heartbeat_worker():
    while True:
        await asyncio.sleep(25)
        # Send SockJS heartbeat frame 'h' to maintain connection alive
        async with ws_manager._lock:
            active_sockets = list(ws_manager.active_connections.keys())
        for ws in active_sockets:
            try:
                await ws.send_text("h")
            except Exception:
                pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database Tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # 2. Seed database with rich enterprise mock data if empty
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()

    # 3. Start background SockJS heartbeat
    heartbeat_task = asyncio.create_task(sockjs_heartbeat_worker())
    logger.info(f"InvenIQ unified backend running on http://{settings.HOST}:{settings.PORT}")
    yield
    heartbeat_task.cancel()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="InvenIQ Enterprise Inventory Management System - Unified Python Backend (Core REST API, SockJS/STOMP WebSockets, and Machine Learning Analytics)",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS for React frontend (port 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Mount All Routers under /api (matching frontend Axios baseURL)
# -------------------------------------------------------------
app.include_router(auth_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(stock_router, prefix="/api")
app.include_router(po_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(category_router, prefix="/api")
app.include_router(supplier_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")

# Also mount analytics directly at root for backwards compatibility
app.include_router(analytics_router)

# -------------------------------------------------------------
# SockJS & Native STOMP WebSocket Support
# -------------------------------------------------------------
@app.get("/ws/info", tags=["WebSocket"])
def sockjs_info():
    """SockJS handshake negotiation endpoint."""
    return {
        "websocket": True,
        "origins": ["*:*"],
        "cookie_needed": False,
        "entropy": 123456789
    }

@app.get("/ws/iframe.html", tags=["WebSocket"])
def sockjs_iframe():
    """SockJS iframe fallback."""
    return HTMLResponse(
        content='<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body></body></html>',
        status_code=200
    )

@app.api_route("/ws/{server_id}/{session_id}/xhr", methods=["GET", "POST", "OPTIONS"], tags=["WebSocket"])
@app.api_route("/ws/{server_id}/{session_id}/xhr_send", methods=["GET", "POST", "OPTIONS"], tags=["WebSocket"])
@app.api_route("/ws/{server_id}/{session_id}/xhr_streaming", methods=["GET", "POST", "OPTIONS"], tags=["WebSocket"])
@app.api_route("/ws/{server_id}/{session_id}/eventsource", methods=["GET", "OPTIONS"], tags=["WebSocket"])
@app.api_route("/ws/{server_id}/{session_id}/htmlfile", methods=["GET", "OPTIONS"], tags=["WebSocket"])
@app.api_route("/ws/{server_id}/{session_id}/jsonp", methods=["GET", "OPTIONS"], tags=["WebSocket"])
@app.api_route("/ws/{server_id}/{session_id}/jsonp_send", methods=["GET", "POST", "OPTIONS"], tags=["WebSocket"])
def sockjs_http_fallback(server_id: str, session_id: str):
    """Graceful SockJS fallback handler preventing 404 logs."""
    return Response(content="ok\n", media_type="text/plain", status_code=200)

async def handle_ws_connection(websocket: WebSocket, is_sockjs: bool = False):
    await ws_manager.connect(websocket, is_sockjs=is_sockjs)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_message(websocket, data)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket session terminated: {e}")
        await ws_manager.disconnect(websocket)

@app.websocket("/ws/{server_id}/{session_id}/websocket")
async def websocket_sockjs_endpoint(websocket: WebSocket, server_id: str, session_id: str):
    """SockJS WebSocket transport endpoint."""
    await handle_ws_connection(websocket, is_sockjs=True)

@app.websocket("/ws/websocket")
@app.websocket("/ws")
async def websocket_raw_endpoint(websocket: WebSocket):
    """Modern Native STOMP WebSocket transport endpoint."""
    await handle_ws_connection(websocket, is_sockjs=False)

# -------------------------------------------------------------
# Root & Health Endpoints
# -------------------------------------------------------------
@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "app": "InvenIQ",
        "service": "Unified Core Backend & Analytics Engine",
        "status": "OPERATIONAL",
        "port": settings.PORT,
        "docs": f"http://localhost:{settings.PORT}/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
