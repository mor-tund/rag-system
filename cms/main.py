"""RAG CMS app: serves the React SPA (web/dist) + the JSON API under /api.

The old Jinja HTML UI was removed — the SPA is now the only frontend. All CRUD,
upload, ask and admin actions go through the JSON API (cms/api/*). Run as one
service on CMS_PORT (default 8210); for local FE work use the Vite dev server
which proxies /api back here.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .api import api_router

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(ROOT, "web", "dist")
INDEX_HTML = os.path.join(DIST, "index.html")

app = FastAPI(title="RAG CMS")

# Session cookie powers /api auth (login sets request.session["admin"]).
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("RAG_SESSION_SECRET", "rag-demo-secret-change-me"),
)
# Only needed when the Vite dev server talks to this origin WITHOUT its proxy.
_dev_origins = os.environ.get("RAG_WEB_ORIGINS", "http://localhost:5180,http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _dev_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Built SPA assets (hashed JS/CSS). Mounted before the catch-all so they win.
_assets_dir = os.path.join(DIST, "assets")
if os.path.isdir(_assets_dir):
    app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")


@app.get("/{full_path:path}")
def spa(full_path: str):
    """SPA fallback: every non-/api GET returns index.html so client-side
    routes (deep links, refresh) work. /api typos stay JSON 404."""
    if full_path.startswith("api"):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    if not os.path.exists(INDEX_HTML):
        return JSONResponse(
            {"detail": "Web chưa build. Chạy: cd web && npm install && npm run build"},
            status_code=503,
        )
    return FileResponse(INDEX_HTML)
