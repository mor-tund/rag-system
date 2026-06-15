"""Pipeline upload hoàn chỉnh (incremental theo từng tài liệu):
parse → chunk → embed (bge-m3 local) → ghi document_chunk, gắn document_id + link về opp/case study.
Re-process = xoá chunk cũ của doc rồi nạp lại; không đụng tài liệu khác.
"""
import json
from .db import connect
from .embedding import embed
from .parsers import extract_blocks, chunk_text


def _set_status(cur, doc_id, status, n_chunks=None, error=None):
    cur.execute(
        "UPDATE document SET status=%s, n_chunks=COALESCE(%s, n_chunks), error=%s WHERE id=%s",
        (status, n_chunks, error, doc_id),
    )


def process_document(doc_id):
    """Xử lý 1 tài liệu đã có bản ghi trong bảng document. Trả về (ok, message)."""
    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute("SELECT file_path, source_type, source_id, filename FROM document WHERE id=%s", (doc_id,))
        row = cur.fetchone()
        if not row:
            return False, "Không tìm thấy document"
        file_path, source_type, source_id, filename = row

        _set_status(cur, doc_id, "processing")
        conn.commit()

        # 1) parse → blocks → chunks
        blocks = extract_blocks(file_path)
        pending = []  # (chunk_index, content, metadata)
        idx = 0
        for label, text in blocks:
            for c in chunk_text(text):
                pending.append((idx, c, {"file": filename, "loc": label})); idx += 1

        if not pending:
            _set_status(cur, doc_id, "ready", n_chunks=0, error="Không trích được text")
            conn.commit()
            return True, "Không có text để embed (0 chunk)"

        # 2) xoá chunk cũ của tài liệu này (nếu re-process) rồi embed + chèn
        cur.execute("DELETE FROM document_chunk WHERE document_id=%s", (doc_id,))
        vectors = embed([c for _, c, _ in pending])
        for (cidx, content, meta), vec in zip(pending, vectors):
            cur.execute(
                """INSERT INTO document_chunk
                   (source_type, source_id, chunk_index, content, embedding, metadata, document_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (source_type, source_id, cidx, content, vec, json.dumps(meta, ensure_ascii=False), doc_id),
            )

        _set_status(cur, doc_id, "ready", n_chunks=len(pending), error=None)
        conn.commit()
        return True, f"Đã embed {len(pending)} chunk"
    except Exception as e:
        conn.rollback()
        cur.execute("UPDATE document SET status='error', error=%s WHERE id=%s", (str(e)[:500], doc_id))
        conn.commit()
        return False, str(e)
    finally:
        cur.close()
        conn.close()
