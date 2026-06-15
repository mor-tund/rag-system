"""Chunk 'metadata' cho opportunity/case_study + từ đồng nghĩa lĩnh vực.

Mục đích: đưa nhãn lĩnh vực/công nghệ (vốn chỉ ở bảng SQL) vào không gian vector,
kèm từ đồng nghĩa, để hỏi theo lĩnh vực vẫn khớp dù nội dung tài liệu khác ngôn ngữ.
VD: hỏi "giao hàng" sẽ khớp case study "Logistics / WMS".
"""
import json

from .db import connect
from .embedding import embed

# Khoá (substring, lowercase) -> các từ đồng nghĩa thêm vào chunk metadata
DOMAIN_SYNONYMS = {
    "logistic": "kho vận, giao nhận, giao hàng, vận chuyển, quản lý kho, WMS, fulfillment, chuỗi cung ứng, supply chain",
    "wms": "quản lý kho, kho bãi, giao nhận, xuất nhập kho",
    "ride": "đặt xe, gọi xe, taxi công nghệ, vận tải hành khách, điều phối tài xế",
    "đặt xe": "gọi xe, taxi công nghệ, ride-hailing, điều phối tài xế",
    "bảo hiểm": "insurance, hợp đồng bảo hiểm, bồi thường, đại lý, tư vấn viên",
    "hội nghị": "conference, sự kiện, hội thảo, event",
    "âm nhạc": "music event, sự kiện, biểu diễn, concert",
    "sự kiện": "event, tổ chức sự kiện, hội nghị, quản lý sự kiện",
    "xăng dầu": "petrol, fuel, nhiên liệu, trạm xăng, bán lẻ xăng dầu, ePump",
    "hợp đồng": "contract, quản lý hợp đồng, quyết toán, phê duyệt",
}


def _synonyms(*texts) -> str:
    blob = " ".join(t.lower() for t in texts if t)
    out = [syn for key, syn in DOMAIN_SYNONYMS.items() if key in blob]
    return "; ".join(dict.fromkeys(out))


def _meta_text(source_type: str, row) -> str:
    if source_type == "case_study":
        name, title, customer, domain, tech = row
        syn = _synonyms(domain, name, title)
        return (f"Case study: {name}. Tiêu đề: {title or '-'}. "
                f"Lĩnh vực: {domain or '-'}{f' ({syn})' if syn else ''}. "
                f"Công nghệ: {tech or '-'}. Khách hàng: {customer or '-'}.")
    name, customer, dept, tech, desc = row
    syn = _synonyms(name, desc, tech)
    return (f"Dự án (proposal): {name}. Khách hàng: {customer or '-'}. Bộ phận: {dept or '-'}. "
            f"Công nghệ: {tech or '-'}.{f' Liên quan: {syn}.' if syn else ''} {desc or ''}").strip()


def upsert_meta_chunk(source_type: str, source_id: int):
    """Tạo/ghi đè 1 chunk metadata (kind='meta') cho 1 opportunity/case_study."""
    conn = connect(); cur = conn.cursor()
    if source_type == "case_study":
        cur.execute("SELECT name,title,customer,domain,tech_stack FROM case_study WHERE id=%s", (source_id,))
    else:
        cur.execute("SELECT name,customer,department,tech_stack,description FROM opportunity WHERE id=%s", (source_id,))
    row = cur.fetchone()
    if not row:
        conn.close(); return
    text = _meta_text(source_type, row)
    vec = embed([text])[0]
    cur.execute("""DELETE FROM document_chunk
                   WHERE source_type=%s AND source_id=%s AND metadata->>'kind'='meta'""",
                (source_type, source_id))
    cur.execute("""INSERT INTO document_chunk
                   (source_type,source_id,chunk_index,content,embedding,metadata,document_id)
                   VALUES (%s,%s,0,%s,%s,%s,NULL)""",
                (source_type, source_id, text, vec, json.dumps({"kind": "meta"}, ensure_ascii=False)))
    conn.commit(); conn.close()
