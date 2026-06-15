"""Lớp RAG dùng chung: retrieval (SQL + vector) + tổng hợp qua claude -p.
Dùng bởi trang Web Q&A và (phần retrieval) bởi MCP server.
"""
import subprocess
from .db import connect
from .embedding import embed

TOP_K = 6

SYSTEM_INSTRUCTION = """Bạn là trợ lý RAG cho hệ thống quản lý cơ hội dự án (opportunity) và \
case study của công ty MOR. Trả lời câu hỏi DỰA HOÀN TOÀN trên phần NGỮ CẢNH.

Quy tắc:
- Chỉ dùng thông tin trong NGỮ CẢNH. KHÔNG bịa.
- Nếu không đủ thông tin, nói rõ "Không tìm thấy thông tin này trong dữ liệu đã nạp."
- Trả lời tiếng Việt, ngắn gọn, trích nguồn (opportunity/case study nào).
- Chỉ in câu trả lời."""


def structured_context(cur):
    out = ["=== NGỮ CẢNH CÓ CẤU TRÚC (SQL) ==="]
    cur.execute("""SELECT id,name,customer,department,tech_stack,total_effort_mm,total_effort_md,
                          timeline_months,language,status FROM opportunity ORDER BY id""")
    for r in cur.fetchall():
        out.append(f"[opportunity #{r[0]}] {r[1]} | KH {r[2]} | {r[3]} | tech {r[4]} | "
                   f"{r[5]} MM/{r[6]} MD | {r[7]} tháng | {r[8]} | {r[9]}")
    cur.execute("""SELECT count(*),round(sum(effort_total)::numeric,2) FROM opportunity_wbs_item""")
    n, tot = cur.fetchone()
    out.append(f"[WBS] {n} chức năng, tổng {tot} MD")
    cur.execute("SELECT id,name,domain,tech_stack FROM case_study ORDER BY id")
    out.append("[Case study]")
    for r in cur.fetchall():
        out.append(f"  #{r[0]} {r[1]} | {r[2]} | {r[3]}")
    return "\n".join(out)


def semantic_context(cur, question, k=TOP_K):
    v = embed([question])[0]
    cur.execute("""
        SELECT dc.source_type, COALESCE(cs.name,o.name) src, dc.metadata, dc.content,
               1-(dc.embedding <=> %s) sim
        FROM document_chunk dc
        LEFT JOIN case_study cs ON dc.source_type='case_study' AND dc.source_id=cs.id
        LEFT JOIN opportunity o ON dc.source_type='opportunity' AND dc.source_id=o.id
        ORDER BY dc.embedding <=> %s LIMIT %s""", (v, v, k))
    rows = cur.fetchall()
    out = [f"\n=== NGỮ CẢNH NGỮ NGHĨA (top-{k}) ==="]
    sources = []
    for st, src, meta, content, sim in rows:
        loc = (meta or {}).get("slide") or (meta or {}).get("kind") or ""
        out.append(f"\n[{sim:.3f}] ({st}/{src}/{loc})\n{content.strip()}")
        sources.append({"type": st, "src": src, "loc": loc, "sim": round(float(sim), 3)})
    return "\n".join(out), sources


def retrieve(question, k=TOP_K):
    conn = connect(); cur = conn.cursor()
    structured = structured_context(cur)
    semantic, sources = semantic_context(cur, question, k)
    conn.close()
    return structured, semantic, sources


def synthesize(question, structured, semantic):
    prompt = (f"{SYSTEM_INSTRUCTION}\n\n=== NGỮ CẢNH ===\n{structured}\n{semantic}\n"
              f"\n=== CÂU HỎI ===\n{question}\n\nCÂU TRẢ LỜI:")
    try:
        res = subprocess.run(["claude", "-p", "--output-format", "text"],
                             input=prompt, capture_output=True, text=True, timeout=240)
    except FileNotFoundError:
        return "[Lỗi] Không tìm thấy 'claude' (cần cài Claude Code + đăng nhập subscription trên server)."
    except subprocess.TimeoutExpired:
        return "[Lỗi] claude -p quá thời gian."
    if res.returncode != 0:
        return f"[Lỗi claude -p {res.returncode}] {res.stderr.strip()[:400]}"
    return res.stdout.strip()


def answer(question, k=TOP_K):
    structured, semantic, sources = retrieve(question, k)
    text = synthesize(question, structured, semantic)
    return text, sources
