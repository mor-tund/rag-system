"""JSON API for the React SPA. Mounted at /api by cms.main.

Auth: reuses the same session cookie as the HTML CMS. Unauthenticated /api
calls return 401 JSON (the auth gate in main.py skips /api so it never
redirects to the HTML login)."""
from fastapi import APIRouter

from .deps import require_api  # re-exported for convenience
from .opportunities import router as opportunities_router
from .casestudies import router as casestudies_router
from .documents import router as documents_router
from .system import router as system_router

__all__ = ["api_router", "require_api"]

api_router = APIRouter(prefix="/api")
# system_router holds /auth/* (login/me/logout) which must stay public.
api_router.include_router(system_router)
api_router.include_router(opportunities_router)
api_router.include_router(casestudies_router)
api_router.include_router(documents_router)
