"""Opportunity (proposal) CRUD as JSON."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import connect
from ..enrich import upsert_meta_chunk
from .deps import num, require_api, text
from .serializers import doc_row, opp_row, wbs_row

router = APIRouter(dependencies=[Depends(require_api)])


class OpportunityIn(BaseModel):
    name: str
    customer: Optional[str] = None
    department: Optional[str] = None
    docType: Optional[str] = None
    techStack: Optional[str] = None
    totalEffortMm: Optional[float] = None
    totalEffortMd: Optional[float] = None
    timelineMonths: Optional[float] = None
    budget: Optional[float] = None
    language: Optional[str] = None
    sourceDate: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = "draft"
    description: Optional[str] = None


def _detail(oid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM opportunity WHERE id=%s", (oid,))
    cols = [d[0] for d in cur.description]; row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Không tìm thấy proposal")
    opp = opp_row(cols, row)
    cur.execute("""SELECT id,category,name,description,effort_study,effort_fe,effort_be,
                          effort_ut,effort_total,priority
                   FROM opportunity_wbs_item WHERE opportunity_id=%s ORDER BY id""", (oid,))
    opp["wbs"] = [wbs_row(r) for r in cur.fetchall()]
    cur.execute("""SELECT id,filename,security_label,status,n_chunks,error,created_at
                   FROM document WHERE source_type='opportunity' AND source_id=%s
                   ORDER BY id DESC""", (oid,))
    opp["documents"] = [doc_row(r) for r in cur.fetchall()]
    conn.close()
    return opp


@router.get("/opportunities")
def list_opportunities():
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM opportunity ORDER BY id DESC")
    cols = [d[0] for d in cur.description]
    rows = [opp_row(cols, r) for r in cur.fetchall()]
    conn.close()
    return rows


@router.get("/opportunities/{oid}")
def get_opportunity(oid: int):
    return _detail(oid)


@router.post("/opportunities", status_code=201)
def create_opportunity(body: OpportunityIn):
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO opportunity
        (name,customer,department,doc_type,tech_stack,total_effort_mm,total_effort_md,
         timeline_months,budget,language,source_date,owner,status,description)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (body.name, text(body.customer), text(body.department), text(body.docType),
         text(body.techStack), num(body.totalEffortMm), num(body.totalEffortMd),
         num(body.timelineMonths), num(body.budget), text(body.language),
         text(body.sourceDate), text(body.owner), text(body.status) or "draft",
         text(body.description)))
    oid = cur.fetchone()[0]; conn.commit(); conn.close()
    upsert_meta_chunk("opportunity", oid)
    return _detail(oid)


@router.put("/opportunities/{oid}")
def update_opportunity(oid: int, body: OpportunityIn):
    conn = connect(); cur = conn.cursor()
    cur.execute("""UPDATE opportunity SET name=%s,customer=%s,department=%s,doc_type=%s,
        tech_stack=%s,total_effort_mm=%s,total_effort_md=%s,timeline_months=%s,budget=%s,
        language=%s,source_date=%s,owner=%s,status=%s,description=%s WHERE id=%s""",
        (body.name, text(body.customer), text(body.department), text(body.docType),
         text(body.techStack), num(body.totalEffortMm), num(body.totalEffortMd),
         num(body.timelineMonths), num(body.budget), text(body.language),
         text(body.sourceDate), text(body.owner), text(body.status) or "draft",
         text(body.description), oid))
    found = cur.rowcount
    conn.commit(); conn.close()
    if not found:
        raise HTTPException(404, "Không tìm thấy proposal")
    upsert_meta_chunk("opportunity", oid)
    return _detail(oid)


@router.delete("/opportunities/{oid}", status_code=204)
def delete_opportunity(oid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("DELETE FROM document_chunk WHERE source_type='opportunity' AND source_id=%s", (oid,))
    cur.execute("DELETE FROM document WHERE source_type='opportunity' AND source_id=%s", (oid,))
    cur.execute("DELETE FROM opportunity WHERE id=%s", (oid,))
    conn.commit(); conn.close()
