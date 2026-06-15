"""Case study CRUD as JSON."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import connect
from .deps import require_api, text
from .serializers import cs_row, doc_row

router = APIRouter(dependencies=[Depends(require_api)])


class CaseStudyIn(BaseModel):
    name: str
    title: Optional[str] = None
    customer: Optional[str] = None
    domain: Optional[str] = None
    techStack: Optional[str] = None


def _detail(cid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM case_study WHERE id=%s", (cid,))
    cols = [d[0] for d in cur.description]; row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Không tìm thấy case study")
    cs = cs_row(cols, row)
    cur.execute("""SELECT id,filename,security_label,status,n_chunks,error,created_at
                   FROM document WHERE source_type='case_study' AND source_id=%s
                   ORDER BY id DESC""", (cid,))
    cs["documents"] = [doc_row(r) for r in cur.fetchall()]
    conn.close()
    return cs


@router.get("/casestudies")
def list_casestudies():
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM case_study ORDER BY id DESC")
    cols = [d[0] for d in cur.description]
    rows = [cs_row(cols, r) for r in cur.fetchall()]
    conn.close()
    return rows


@router.get("/casestudies/{cid}")
def get_casestudy(cid: int):
    return _detail(cid)


@router.post("/casestudies", status_code=201)
def create_casestudy(body: CaseStudyIn):
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO case_study (name,title,customer,domain,tech_stack)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                (body.name, text(body.title), text(body.customer),
                 text(body.domain), text(body.techStack)))
    cid = cur.fetchone()[0]; conn.commit(); conn.close()
    return _detail(cid)


@router.put("/casestudies/{cid}")
def update_casestudy(cid: int, body: CaseStudyIn):
    conn = connect(); cur = conn.cursor()
    cur.execute("""UPDATE case_study SET name=%s,title=%s,customer=%s,domain=%s,tech_stack=%s
                   WHERE id=%s""",
                (body.name, text(body.title), text(body.customer),
                 text(body.domain), text(body.techStack), cid))
    found = cur.rowcount
    conn.commit(); conn.close()
    if not found:
        raise HTTPException(404, "Không tìm thấy case study")
    return _detail(cid)


@router.delete("/casestudies/{cid}", status_code=204)
def delete_casestudy(cid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("DELETE FROM document_chunk WHERE source_type='case_study' AND source_id=%s", (cid,))
    cur.execute("DELETE FROM document WHERE source_type='case_study' AND source_id=%s", (cid,))
    cur.execute("DELETE FROM case_study WHERE id=%s", (cid,))
    conn.commit(); conn.close()
