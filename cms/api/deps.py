"""Shared API dependencies + input coercion helpers."""
from fastapi import HTTPException, Request


def require_api(request: Request):
    """Dependency: 401 JSON unless the admin session is present."""
    if not request.session.get("admin"):
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    return True


def num(v):
    """JSON value -> float or None (tolerates '', commas, strings)."""
    if v is None or str(v).strip() == "":
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def text(v):
    v = (v or "").strip() if isinstance(v, str) else v
    return v or None
