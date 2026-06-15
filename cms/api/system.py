"""Auth, dashboard stats, RAG ask, and MCP token management."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from .. import auth
from ..db import connect
from ..rag import answer as rag_answer
from .deps import require_api
from .serializers import token_row

router = APIRouter()


# ----------------------------- Auth (public) -----------------------------
class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(body: LoginIn, request: Request):
    if body.username == auth.ADMIN_USER and body.password == auth.ADMIN_PASSWORD:
        request.session["admin"] = True
        return {"user": body.username}
    raise HTTPException(401, "Sai tài khoản hoặc mật khẩu")


@router.get("/auth/me")
def me(request: Request):
    if not request.session.get("admin"):
        raise HTTPException(401, "Chưa đăng nhập")
    return {"user": auth.ADMIN_USER}


@router.post("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


# ----------------------------- Stats (protected) -----------------------------
def _ingest_trend(cur):
    """Chunks embedded per month for the last 6 calendar months."""
    cur.execute("""SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') ym, count(*)
                   FROM document_chunk
                   WHERE created_at >= date_trunc('month', now()) - interval '5 months'
                   GROUP BY 1""")
    by_month = dict(cur.fetchall())
    out = []
    y, m = date.today().year, date.today().month
    months = [((y * 12 + (m - 1) - i) // 12, (y * 12 + (m - 1) - i) % 12 + 1) for i in range(5, -1, -1)]
    for yy, mm in months:
        out.append({"label": f"T{mm}", "value": int(by_month.get(f"{yy:04d}-{mm:02d}", 0))})
    return out


@router.get("/stats", dependencies=[Depends(require_api)])
def stats():
    conn = connect(); cur = conn.cursor()
    counts = {}
    for t in ["opportunity", "case_study", "document", "document_chunk"]:
        cur.execute(f"SELECT count(*) FROM {t}")
        counts[t] = cur.fetchone()[0]
    trend = _ingest_trend(cur)
    conn.close()
    return {"counts": counts, "ingestTrend": trend}


# ----------------------------- Ask / RAG (protected) -----------------------------
class AskIn(BaseModel):
    question: str


@router.post("/ask", dependencies=[Depends(require_api)])
def ask(body: AskIn):
    q = (body.question or "").strip()
    if not q:
        raise HTTPException(422, "Câu hỏi rỗng")
    text, sources = rag_answer(q)
    return {"answer": text, "sources": sources}


# ----------------------------- MCP tokens (protected) -----------------------------
class TokenIn(BaseModel):
    userName: str


class ToggleIn(BaseModel):
    active: bool


@router.get("/tokens", dependencies=[Depends(require_api)])
def list_tokens():
    return [token_row(r) for r in auth.list_tokens()]


@router.post("/tokens", status_code=201, dependencies=[Depends(require_api)])
def create_token(body: TokenIn):
    name = body.userName.strip()
    if not name:
        raise HTTPException(422, "Tên user rỗng")
    tid, tok = auth.create_token(name)
    return {"id": tid, "userName": name, "token": tok, "active": True,
            "createdAt": date.today().isoformat(), "lastUsed": None, "calls": 0}


@router.post("/tokens/{tid}/toggle", dependencies=[Depends(require_api)])
def toggle_token(tid: int, body: ToggleIn):
    auth.set_active(tid, body.active)
    return {"id": tid, "active": body.active}


@router.delete("/tokens/{tid}", status_code=204, dependencies=[Depends(require_api)])
def delete_token(tid: int):
    auth.delete_token(tid)
