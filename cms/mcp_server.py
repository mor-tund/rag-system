"""MCP server expose các tool RAG (truy xuất Postgres + pgvector).
Claude ở máy user khác (Claude Code / Desktop) nối tới qua MCP → gọi tool → tự tổng hợp
bằng subscription CỦA HỌ. Server KHÔNG cần tự tổng hợp cho nhóm này.

Chạy:  .venv/bin/python -m cms.mcp_server         (mặc định http://0.0.0.0:8001/mcp)
User nối: claude mcp add --transport http rag-mor http://<server-ip>:8001/mcp
"""
import os
from mcp.server.fastmcp import FastMCP
from .db import connect
from .embedding import embed
from .auth import validate_token, MCP_AUTH_ON

mcp = FastMCP("rag-mor", host=os.environ.get("MCP_HOST", "0.0.0.0"),
              port=int(os.environ.get("MCP_PORT", "8001")))


@mcp.tool()
def search_knowledge(query: str, k: int = 6) -> str:
    """Tìm kiếm ngữ nghĩa trên toàn bộ tài liệu (proposal + case study) đã nạp.
    Trả về các đoạn liên quan nhất kèm nguồn. Dùng cho câu hỏi về NỘI DUNG."""
    v = embed([query])[0]
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT dc.source_type, COALESCE(cs.name,o.name) src, dc.content,
                          1-(dc.embedding <=> %s) sim
                   FROM document_chunk dc
                   LEFT JOIN case_study cs ON dc.source_type='case_study' AND dc.source_id=cs.id
                   LEFT JOIN opportunity o ON dc.source_type='opportunity' AND dc.source_id=o.id
                   ORDER BY dc.embedding <=> %s LIMIT %s""", (v, v, k))
    rows = cur.fetchall(); conn.close()
    if not rows:
        return "Không tìm thấy."
    return "\n\n".join(f"[{sim:.3f}] ({st}/{src})\n{content.strip()}" for st, src, content, sim in rows)


@mcp.tool()
def find_similar_case_study(query: str, k: int = 5) -> str:
    """Tìm case study tương đồng nhất với mô tả/nhu cầu cho trước (chỉ tìm trong case study)."""
    v = embed([query])[0]
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT cs.name, cs.domain, cs.tech_stack, dc.content,
                          1-(dc.embedding <=> %s) sim
                   FROM document_chunk dc JOIN case_study cs ON dc.source_id=cs.id
                   WHERE dc.source_type='case_study'
                   ORDER BY dc.embedding <=> %s LIMIT %s""", (v, v, k))
    rows = cur.fetchall(); conn.close()
    return "\n\n".join(f"[{sim:.3f}] {name} | {domain} | {tech}\n{content.strip()[:300]}"
                       for name, domain, tech, content, sim in rows) or "Không tìm thấy."


@mcp.tool()
def list_opportunities() -> str:
    """Liệt kê tất cả opportunity (proposal) kèm số liệu chính."""
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT id,name,customer,department,tech_stack,total_effort_mm,
                          timeline_months,status FROM opportunity ORDER BY id""")
    rows = cur.fetchall(); conn.close()
    return "\n".join(f"#{r[0]} {r[1]} | KH {r[2]} | {r[3]} | {r[4]} | {r[5]} MM | "
                     f"{r[6]} tháng | {r[7]}" for r in rows) or "Chưa có opportunity."


@mcp.tool()
def get_opportunity(opportunity_id: int) -> str:
    """Chi tiết một opportunity: thông tin + tổng hợp WBS + top chức năng tốn effort."""
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT name,customer,department,tech_stack,total_effort_mm,total_effort_md,
                          timeline_months,language,status,description FROM opportunity WHERE id=%s""",
                (opportunity_id,))
    r = cur.fetchone()
    if not r:
        conn.close(); return f"Không có opportunity #{opportunity_id}"
    out = [f"{r[0]} | KH {r[1]} | {r[2]} | tech {r[3]}",
           f"Effort {r[4]} MM / {r[5]} MD | {r[6]} tháng | {r[7]} | {r[8]}",
           f"Mô tả: {r[9] or '-'}"]
    cur.execute("""SELECT count(*),round(sum(effort_total)::numeric,2) FROM opportunity_wbs_item
                   WHERE opportunity_id=%s""", (opportunity_id,))
    n, tot = cur.fetchone()
    out.append(f"WBS: {n} chức năng, tổng {tot} MD")
    conn.close()
    return "\n".join(out)


@mcp.tool()
def query_wbs(opportunity_id: int, order: str = "desc", limit: int = 10) -> str:
    """Liệt kê chức năng WBS của một opportunity, sắp theo effort.
    order='desc' = tốn nhiều nhất, 'asc' = ít nhất."""
    direction = "ASC" if order.lower() == "asc" else "DESC"
    conn = connect(); cur = conn.cursor()
    cur.execute(f"""SELECT category,name,effort_total,priority FROM opportunity_wbs_item
                    WHERE opportunity_id=%s AND effort_total IS NOT NULL
                    ORDER BY effort_total {direction} LIMIT %s""", (opportunity_id, limit))
    rows = cur.fetchall(); conn.close()
    return "\n".join(f"[{c or '-'}] {n} = {e} MD (ưu tiên: {p or '-'})"
                     for c, n, e, p in rows) or "Không có chức năng."


@mcp.tool()
def list_case_studies() -> str:
    """Liệt kê tất cả case study (dự án đã làm) kèm lĩnh vực và công nghệ."""
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT id,name,domain,customer,tech_stack FROM case_study ORDER BY id")
    rows = cur.fetchall(); conn.close()
    return "\n".join(f"#{r[0]} {r[1]} | {r[2]} | KH {r[3]} | {r[4] or '-'}"
                     for r in rows) or "Chưa có case study."


def _make_app():
    """App streamable-http + middleware kiểm token theo user."""
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.responses import JSONResponse

    app = mcp.streamable_http_app()

    if MCP_AUTH_ON:
        async def auth(request, call_next):
            hdr = request.headers.get("authorization", "")
            token = hdr[7:].strip() if hdr.lower().startswith("bearer ") else ""
            user = validate_token(token)
            if not user:
                return JSONResponse(
                    {"error": "unauthorized", "message": "Token thiếu hoặc không hợp lệ. "
                     "Liên hệ admin để được cấp token và thêm: "
                     "claude mcp add --transport http --header 'Authorization: Bearer <token>' ..."},
                    status_code=401)
            return await call_next(request)

        app.add_middleware(BaseHTTPMiddleware, dispatch=auth)
    return app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(_make_app(),
                host=os.environ.get("MCP_HOST", "0.0.0.0"),
                port=int(os.environ.get("MCP_PORT", "8001")))
