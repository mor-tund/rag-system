"""Document upload / reprocess / delete + structured import (xlsx/doc)."""
import os
import shutil

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..db import connect
from ..extract import extract_casestudy, extract_proposal
from ..pipeline import process_document
from ..enrich import upsert_meta_chunk
from .deps import require_api
from .opportunities import _detail as opp_detail
from .casestudies import _detail as cs_detail

router = APIRouter(dependencies=[Depends(require_api)])

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(HERE)
UPLOAD_DIR = os.path.join(ROOT, "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _store(doc_id: int, filename: str, tmp_path: str) -> str:
    dest = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")
    os.replace(tmp_path, dest)
    return dest


@router.post("/documents/upload", status_code=201)
async def upload_document(
    source_type: str = Form(...),
    source_id: int = Form(...),
    security_label: str = Form("Internal"),
    file: UploadFile = File(...),
):
    if source_type not in ("opportunity", "case_study"):
        raise HTTPException(422, "source_type không hợp lệ")
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO document (source_type,source_id,filename,security_label,status)
                   VALUES (%s,%s,%s,%s,'pending') RETURNING id""",
                (source_type, source_id, file.filename, security_label))
    doc_id = cur.fetchone()[0]
    dest = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    with open(dest, "wb") as out:
        shutil.copyfileobj(file.file, out)
    cur.execute("UPDATE document SET file_path=%s WHERE id=%s", (dest, doc_id))
    conn.commit(); conn.close()
    process_document(doc_id)
    upsert_meta_chunk(source_type, source_id)
    return opp_detail(source_id) if source_type == "opportunity" else cs_detail(source_id)


@router.post("/documents/{doc_id}/reprocess")
def reprocess_document(doc_id: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT source_type,source_id FROM document WHERE id=%s", (doc_id,))
    row = cur.fetchone(); conn.close()
    if not row:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    process_document(doc_id)
    return opp_detail(row[1]) if row[0] == "opportunity" else cs_detail(row[1])


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT file_path FROM document WHERE id=%s", (doc_id,))
    row = cur.fetchone()
    cur.execute("DELETE FROM document WHERE id=%s", (doc_id,))  # chunks cascade
    conn.commit(); conn.close()
    if row and row[0] and os.path.exists(row[0]):
        try:
            os.remove(row[0])
        except OSError:
            pass


@router.post("/import/opportunity", status_code=201)
async def import_opportunity(file: UploadFile = File(...)):
    tmp = os.path.join(UPLOAD_DIR, f"_tmp_{file.filename}")
    with open(tmp, "wb") as out:
        shutil.copyfileobj(file.file, out)
    try:
        header, items = extract_proposal(tmp)
    except Exception:
        header, items = {}, []

    name = (header.get("name") or os.path.splitext(file.filename)[0]).strip()
    customer = header.get("customer")
    conn = connect(); cur = conn.cursor()

    # Trùng (name + customer) -> cập nhật tại chỗ; ngược lại tạo mới.
    cur.execute("""SELECT id FROM opportunity
                   WHERE lower(name)=lower(%s)
                     AND coalesce(lower(customer),'')=coalesce(lower(%s),'')""",
                (name, customer))
    existing = cur.fetchone()
    if existing:
        oid = existing[0]
        cur.execute("""UPDATE opportunity SET department=%s, doc_type=%s, tech_stack=%s,
                       total_effort_mm=%s, total_effort_md=%s, timeline_months=%s, language=%s,
                       source_date=%s, status=%s, description=%s WHERE id=%s""",
                    (header.get("department"), header.get("doc_type") or "estimate",
                     header.get("tech_stack"), header.get("total_effort_mm"),
                     header.get("total_effort_md"), header.get("timeline_months"),
                     header.get("language"), header.get("source_date"),
                     header.get("status") or "draft", header.get("description"), oid))
        cur.execute("DELETE FROM opportunity_wbs_item WHERE opportunity_id=%s", (oid,))
        cur.execute("""DELETE FROM document WHERE source_type='opportunity'
                       AND source_id=%s AND filename=%s""", (oid, file.filename))
    else:
        cur.execute("""INSERT INTO opportunity
            (name,customer,department,doc_type,tech_stack,total_effort_mm,total_effort_md,
             timeline_months,language,source_date,status,description)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (name, customer, header.get("department"), header.get("doc_type") or "estimate",
             header.get("tech_stack"), header.get("total_effort_mm"), header.get("total_effort_md"),
             header.get("timeline_months"), header.get("language"), header.get("source_date"),
             header.get("status") or "draft", header.get("description")))
        oid = cur.fetchone()[0]

    for it in items:
        cur.execute("""INSERT INTO opportunity_wbs_item
            (opportunity_id,category,name,description,effort_study,effort_fe,effort_be,
             effort_ut,effort_total,priority)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (oid, it.get("category"), it.get("name"), it.get("description"), it.get("effort_study"),
             it.get("effort_fe"), it.get("effort_be"), it.get("effort_ut"), it.get("effort_total"),
             it.get("priority")))

    cur.execute("""INSERT INTO document (source_type,source_id,filename,security_label,status)
                   VALUES ('opportunity',%s,%s,'Internal','pending') RETURNING id""",
                (oid, file.filename))
    doc_id = cur.fetchone()[0]
    dest = _store(doc_id, file.filename, tmp)
    cur.execute("UPDATE document SET file_path=%s WHERE id=%s", (dest, doc_id))
    conn.commit(); conn.close()
    process_document(doc_id)
    upsert_meta_chunk("opportunity", oid)
    return opp_detail(oid)


@router.post("/import/casestudy", status_code=201)
async def import_casestudy(file: UploadFile = File(...)):
    tmp = os.path.join(UPLOAD_DIR, f"_tmp_{file.filename}")
    with open(tmp, "wb") as out:
        shutil.copyfileobj(file.file, out)
    try:
        meta = extract_casestudy(tmp)
    except Exception:
        meta = {"name": os.path.splitext(file.filename)[0]}

    name = os.path.splitext(file.filename)[0]
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO case_study (name,title,customer,domain,tech_stack)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                (name, meta.get("title"), meta.get("customer"),
                 meta.get("domain"), meta.get("tech_stack")))
    cid = cur.fetchone()[0]
    cur.execute("""INSERT INTO document (source_type,source_id,filename,security_label,status)
                   VALUES ('case_study',%s,%s,'Internal','pending') RETURNING id""",
                (cid, file.filename))
    doc_id = cur.fetchone()[0]
    dest = _store(doc_id, file.filename, tmp)
    cur.execute("UPDATE document SET file_path=%s WHERE id=%s", (dest, doc_id))
    cur.execute("UPDATE case_study SET file_path=%s WHERE id=%s", (dest, cid))
    conn.commit(); conn.close()
    process_document(doc_id)
    upsert_meta_chunk("case_study", cid)
    return cs_detail(cid)
