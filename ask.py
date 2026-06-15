"""
Lớp truy xuất RAG (Bước 5) — Cách 2 (Claude Code đóng vai LLM tổng hợp).

Nhận 1 câu hỏi, tự động gom NGỮ CẢNH từ 2 nguồn rồi in ra:
  1) STRUCTURED (SQL)  — số liệu opportunity + tổng hợp WBS  → cho câu "quản lý/phân tích"
  2) SEMANTIC (vector) — các đoạn tài liệu gần nghĩa nhất     → cho câu "tri thức"

Dùng:  .venv/bin/python ask.py "câu hỏi của bạn"
"""
import os
# Truy vấn KHÔNG cần mạng: model bge-m3 đã cache local → ép offline để khỏi gọi HuggingFace
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
import sys
import subprocess
import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

DB_DSN = "postgresql://rag:ragpass@localhost:5432/rag"
EMBED_MODEL = "BAAI/bge-m3"
TOP_K = 6


def structured_context(cur):
    out = ["=== NGỮ CẢNH CÓ CẤU TRÚC (SQL) ==="]

    # Header các opportunity
    cur.execute("""SELECT id,name,customer,department,doc_type,tech_stack,
                          total_effort_mm,total_effort_md,timeline_months,language,
                          source_date,status FROM opportunity ORDER BY id""")
    for r in cur.fetchall():
        out.append(
            f"[opportunity #{r[0]}] {r[1]} | KH: {r[2]} | bộ phận: {r[3]} | loại: {r[4]}\n"
            f"  tech: {r[5]}\n"
            f"  effort: {r[6]} MM / {r[7]} MD | timeline: {r[8]} tháng | ngôn ngữ: {r[9]} "
            f"| nguồn: {r[10]} | trạng thái: {r[11]}")

    # Tổng hợp WBS
    cur.execute("""SELECT count(*), round(sum(effort_total)::numeric,2),
                          round(sum(effort_fe)::numeric,2), round(sum(effort_be)::numeric,2),
                          round(sum(effort_study)::numeric,2), round(sum(effort_ut)::numeric,2)
                   FROM opportunity_wbs_item""")
    n, tot, fe, be, st, ut = cur.fetchone()
    out.append(f"\n[WBS tổng hợp] {n} chức năng | tổng effort {tot} MD "
               f"(FE {fe} · BE {be} · Study {st} · UT {ut})")

    # Effort theo category
    cur.execute("""SELECT category, count(*), round(sum(effort_total)::numeric,2) tot
                   FROM opportunity_wbs_item GROUP BY category ORDER BY tot DESC NULLS LAST""")
    out.append("[WBS theo nhóm chức năng]")
    for cat, cnt, tot in cur.fetchall():
        out.append(f"  - {cat or '(không rõ)'}: {cnt} mục, {tot} MD")

    # Top chức năng tốn effort nhất
    cur.execute("""SELECT category, name, effort_total, priority
                   FROM opportunity_wbs_item ORDER BY effort_total DESC NULLS LAST LIMIT 8""")
    out.append("[Top chức năng tốn effort nhất]")
    for cat, name, eff, pri in cur.fetchall():
        out.append(f"  - [{cat}] {name} = {eff} MD (ưu tiên: {pri})")

    # Case study có sẵn
    cur.execute("SELECT id,name,domain,tech_stack FROM case_study ORDER BY id")
    out.append("[Case study đã làm]")
    for r in cur.fetchall():
        out.append(f"  - #{r[0]} {r[1]} | lĩnh vực: {r[2]} | tech: {r[3]}")
    return "\n".join(out)


def semantic_context(cur, model, question, k=TOP_K):
    v = model.encode([question], normalize_embeddings=True)[0]
    cur.execute("""
        SELECT dc.source_type, COALESCE(cs.name, o.name) AS src,
               dc.metadata, dc.content, 1 - (dc.embedding <=> %s) AS sim
        FROM document_chunk dc
        LEFT JOIN case_study  cs ON dc.source_type='case_study'  AND dc.source_id=cs.id
        LEFT JOIN opportunity o  ON dc.source_type='opportunity' AND dc.source_id=o.id
        ORDER BY dc.embedding <=> %s
        LIMIT %s
    """, (v, v, k))
    out = [f"\n=== NGỮ CẢNH NGỮ NGHĨA (vector top-{k}) ==="]
    for st, src, meta, content, sim in cur.fetchall():
        loc = meta.get("slide") and f"slide {meta['slide']}" or meta.get("kind", "")
        out.append(f"\n[{sim:.3f}] ({st} / {src} / {loc})\n{content.strip()}")
    return "\n".join(out)


SYSTEM_INSTRUCTION = """Bạn là trợ lý RAG cho hệ thống quản lý cơ hội dự án (opportunity) và \
case study của công ty MOR. Hãy trả lời câu hỏi DỰA HOÀN TOÀN trên phần NGỮ CẢNH được cung cấp.

Quy tắc:
- Chỉ dùng thông tin trong NGỮ CẢNH. KHÔNG bịa, KHÔNG dùng kiến thức ngoài.
- Nếu ngữ cảnh không đủ để trả lời, nói rõ: "Không tìm thấy thông tin này trong dữ liệu đã nạp."
- Trả lời bằng tiếng Việt, ngắn gọn, đúng trọng tâm.
- Trích nguồn: ghi rõ thông tin lấy từ opportunity nào / case study nào (theo nhãn trong ngữ cảnh).
- Chỉ in CÂU TRẢ LỜI, không lặp lại ngữ cảnh."""


def build_prompt(question, structured, semantic):
    return (f"{SYSTEM_INSTRUCTION}\n\n"
            f"================= NGỮ CẢNH =================\n"
            f"{structured}\n{semantic}\n"
            f"================= CÂU HỎI =================\n{question}\n\n"
            f"CÂU TRẢ LỜI:")


def synthesize(prompt):
    """Gọi Claude Code headless (claude -p) — phiên sạch, xác thực bằng subscription."""
    try:
        res = subprocess.run(
            ["claude", "-p", "--output-format", "text"],
            input=prompt, capture_output=True, text=True, timeout=240,
        )
    except FileNotFoundError:
        return "[Lỗi] Không tìm thấy lệnh 'claude'. Cần cài Claude Code và đăng nhập subscription."
    except subprocess.TimeoutExpired:
        return "[Lỗi] claude -p quá thời gian (240s)."
    if res.returncode != 0:
        return f"[Lỗi claude -p, mã {res.returncode}] {res.stderr.strip()[:500]}"
    return res.stdout.strip()


def main():
    args = [a for a in sys.argv[1:]]
    show_context = "--context" in args
    args = [a for a in args if a != "--context"]
    if not args:
        print("Dùng: python ask.py [--context] \"câu hỏi\"")
        sys.exit(1)
    question = " ".join(args)

    model = SentenceTransformer(EMBED_MODEL)
    conn = psycopg.connect(DB_DSN)
    register_vector(conn)
    cur = conn.cursor()

    structured = structured_context(cur)
    semantic = semantic_context(cur, model, question)
    conn.close()

    if show_context:
        print(f"\n########## NGỮ CẢNH TRUY XUẤT ##########\n{structured}\n{semantic}\n")

    prompt = build_prompt(question, structured, semantic)
    print(f"\n########## CÂU HỎI ##########\n{question}\n")
    print("########## TRẢ LỜI (Claude qua headless) ##########")
    print(synthesize(prompt))


if __name__ == "__main__":
    main()