import os
import shutil
import secrets as _secrets
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from .db import connect
from .pipeline import process_document
from .extract import extract_proposal, extract_casestudy
from .rag import answer as rag_answer
from . import auth


class NeedLogin(Exception):
    """Raise khi chưa đăng nhập admin -> chuyển hướng /login."""


def require_admin(request: Request):
    if not request.session.get("admin"):
        raise NeedLogin()
    return True

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
UPLOAD_DIR = os.path.join(ROOT, "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Các trang KHÔNG cần đăng nhập
PUBLIC_PATHS = {"/login", "/logout"}


async def _auth_gate(request: Request, call_next):
    """Cổng đăng nhập: mọi trang CMS đều phải login (trừ PUBLIC_PATHS)."""
    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)
    if not request.session.get("admin"):
        return RedirectResponse("/login", status_code=303)
    return await call_next(request)


app = FastAPI(title="RAG CMS")
# Thứ tự: thêm cổng auth TRƯỚC, Session SAU -> Session bọc ngoài (chạy trước, gắn request.session)
app.add_middleware(BaseHTTPMiddleware, dispatch=_auth_gate)
app.add_middleware(SessionMiddleware,
                   secret_key=os.environ.get("RAG_SESSION_SECRET", "rag-demo-secret-change-me"))
templates = Jinja2Templates(directory=os.path.join(HERE, "templates"))


@app.exception_handler(NeedLogin)
async def _redirect_login(request: Request, exc: NeedLogin):
    return RedirectResponse("/login", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse(request, "login.html", {"request": request, "error": None})


@app.post("/login", response_class=HTMLResponse)
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if username == auth.ADMIN_USER and password == auth.ADMIN_PASSWORD:
        request.session["admin"] = True
        return RedirectResponse("/admin/tokens", status_code=303)
    return templates.TemplateResponse(request, "login.html",
        {"request": request, "error": "Sai tài khoản hoặc mật khẩu"})


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


def _f(v):
    """Form -> float hoặc None."""
    if v is None or str(v).strip() == "":
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except ValueError:
        return None


def _s(v):
    v = (v or "").strip()
    return v or None


# ----------------------------- Dashboard -----------------------------
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    conn = connect(); cur = conn.cursor()
    counts = {}
    for t in ["opportunity", "case_study", "document", "document_chunk"]:
        cur.execute(f"SELECT count(*) FROM {t}")
        counts[t] = cur.fetchone()[0]
    cur.execute("SELECT id,name,customer,status FROM opportunity ORDER BY id DESC LIMIT 10")
    opps = cur.fetchall()
    cur.execute("SELECT id,name,domain FROM case_study ORDER BY id DESC LIMIT 10")
    css = cur.fetchall()
    conn.close()
    return templates.TemplateResponse(request, "index.html",
        {"request": request, "counts": counts, "opps": opps, "css": css})


# ----------------------------- Admin: token theo user (MCP) -----------------------------
@app.get("/admin/tokens", response_class=HTMLResponse)
def admin_tokens(request: Request, _: str = Depends(require_admin)):
    return templates.TemplateResponse(request, "admin_tokens.html",
        {"request": request, "tokens": auth.list_tokens()})


@app.get("/admin/users", response_class=HTMLResponse)
def admin_users(request: Request, _: str = Depends(require_admin)):
    return templates.TemplateResponse(request, "admin_users.html",
        {"request": request, "users": auth.list_users()})


@app.post("/admin/tokens")
def admin_token_create(user_name: str = Form(...), _: str = Depends(require_admin)):
    auth.create_token(user_name.strip())
    return RedirectResponse("/admin/tokens", status_code=303)


@app.post("/admin/tokens/{tid}/toggle")
def admin_token_toggle(tid: int, active: str = Form(...), _: str = Depends(require_admin)):
    auth.set_active(tid, active == "true")
    return RedirectResponse("/admin/tokens", status_code=303)


@app.post("/admin/tokens/{tid}/delete")
def admin_token_delete(tid: int, _: str = Depends(require_admin)):
    auth.delete_token(tid)
    return RedirectResponse("/admin/tokens", status_code=303)


# ----------------------------- Hỏi-đáp RAG (web) -----------------------------
@app.get("/ask", response_class=HTMLResponse)
def ask_form(request: Request):
    return templates.TemplateResponse(request, "ask.html",
        {"request": request, "question": None, "answer": None, "sources": None})


@app.post("/ask", response_class=HTMLResponse)
def ask_run(request: Request, question: str = Form(...)):
    text, sources = rag_answer(question)
    return templates.TemplateResponse(request, "ask.html",
        {"request": request, "question": question, "answer": text, "sources": sources})


# ----------------------------- Opportunity CRUD -----------------------------
@app.get("/opportunities", response_class=HTMLResponse)
def opp_list(request: Request):
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT id,name,customer,department,total_effort_mm,timeline_months,status
                   FROM opportunity ORDER BY id DESC""")
    rows = cur.fetchall(); conn.close()
    return templates.TemplateResponse(request, "opportunities.html", {"request": request, "rows": rows})


@app.get("/opportunities/new", response_class=HTMLResponse)
def opp_new(request: Request):
    return templates.TemplateResponse(request, "opportunity_form.html",
        {"request": request, "opp": None, "action": "/opportunities"})


@app.post("/opportunities")
def opp_create(
    name: str = Form(...), customer: str = Form(""), department: str = Form(""),
    doc_type: str = Form(""), tech_stack: str = Form(""), total_effort_mm: str = Form(""),
    total_effort_md: str = Form(""), timeline_months: str = Form(""), budget: str = Form(""),
    language: str = Form(""), source_date: str = Form(""), owner: str = Form(""),
    status: str = Form("draft"), description: str = Form(""),
):
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO opportunity
        (name,customer,department,doc_type,tech_stack,total_effort_mm,total_effort_md,
         timeline_months,budget,language,source_date,owner,status,description)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (name, _s(customer), _s(department), _s(doc_type), _s(tech_stack), _f(total_effort_mm),
         _f(total_effort_md), _f(timeline_months), _f(budget), _s(language), _s(source_date) or None,
         _s(owner), _s(status) or "draft", _s(description)))
    oid = cur.fetchone()[0]; conn.commit(); conn.close()
    return RedirectResponse(f"/opportunities/{oid}", status_code=303)


@app.get("/opportunities/import", response_class=HTMLResponse)
def opp_import_form(request: Request):
    return templates.TemplateResponse(request, "opportunity_import.html", {"request": request})


@app.post("/opportunities/import")
async def opp_import(file: UploadFile = File(...)):
    # 1) lưu file tạm
    tmp = os.path.join(UPLOAD_DIR, f"_tmp_{file.filename}")
    with open(tmp, "wb") as out:
        shutil.copyfileobj(file.file, out)

    # 2) trích structured (chỉ áp dụng .xlsx template estimate; lỗi → fallback trống)
    try:
        header, items = extract_proposal(tmp)
    except Exception:
        header, items = {}, []

    name = (header.get("name") or os.path.splitext(file.filename)[0]).strip()
    customer = header.get("customer")
    conn = connect(); cur = conn.cursor()

    # Phương án A: trùng (name + customer) -> CẬP NHẬT tại chỗ; không thì TẠO MỚI
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
        # thay toàn bộ WBS + xoá tài liệu import cũ cùng tên (chunk cascade) để nạp lại bản mới
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

    # 3) tạo các chức năng WBS
    for it in items:
        cur.execute("""INSERT INTO opportunity_wbs_item
            (opportunity_id,category,name,description,effort_study,effort_fe,effort_be,
             effort_ut,effort_total,priority)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (oid, it.get("category"), it.get("name"), it.get("description"), it.get("effort_study"),
             it.get("effort_fe"), it.get("effort_be"), it.get("effort_ut"), it.get("effort_total"),
             it.get("priority")))

    # 4) lưu file estimate thành tài liệu của opp + embed (để hỏi-đáp nội dung)
    cur.execute("""INSERT INTO document (source_type,source_id,filename,security_label,status)
                   VALUES ('opportunity',%s,%s,'Internal','pending') RETURNING id""",
                (oid, file.filename))
    doc_id = cur.fetchone()[0]
    dest = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    os.replace(tmp, dest)
    cur.execute("UPDATE document SET file_path=%s WHERE id=%s", (dest, doc_id))
    conn.commit(); conn.close()

    process_document(doc_id)
    return RedirectResponse(f"/opportunities/{oid}", status_code=303)


@app.get("/opportunities/{oid}", response_class=HTMLResponse)
def opp_detail(request: Request, oid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM opportunity WHERE id=%s", (oid,))
    cols = [d[0] for d in cur.description]; row = cur.fetchone()
    if not row:
        conn.close(); return HTMLResponse("Không tìm thấy opportunity", status_code=404)
    opp = dict(zip(cols, row))
    cur.execute("""SELECT category,name,effort_total,priority FROM opportunity_wbs_item
                   WHERE opportunity_id=%s ORDER BY id""", (oid,))
    wbs = cur.fetchall()
    cur.execute("""SELECT id,filename,security_label,status,n_chunks,error FROM document
                   WHERE source_type='opportunity' AND source_id=%s ORDER BY id DESC""", (oid,))
    docs = cur.fetchall(); conn.close()
    return templates.TemplateResponse(request, "opportunity_detail.html",
        {"request": request, "opp": opp, "wbs": wbs, "docs": docs})


@app.get("/opportunities/{oid}/edit", response_class=HTMLResponse)
def opp_edit(request: Request, oid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM opportunity WHERE id=%s", (oid,))
    cols = [d[0] for d in cur.description]; row = cur.fetchone(); conn.close()
    opp = dict(zip(cols, row))
    return templates.TemplateResponse(request, "opportunity_form.html",
        {"request": request, "opp": opp, "action": f"/opportunities/{oid}/edit"})


@app.post("/opportunities/{oid}/edit")
def opp_update(
    oid: int, name: str = Form(...), customer: str = Form(""), department: str = Form(""),
    doc_type: str = Form(""), tech_stack: str = Form(""), total_effort_mm: str = Form(""),
    total_effort_md: str = Form(""), timeline_months: str = Form(""), budget: str = Form(""),
    language: str = Form(""), source_date: str = Form(""), owner: str = Form(""),
    status: str = Form("draft"), description: str = Form(""),
):
    conn = connect(); cur = conn.cursor()
    cur.execute("""UPDATE opportunity SET name=%s,customer=%s,department=%s,doc_type=%s,tech_stack=%s,
        total_effort_mm=%s,total_effort_md=%s,timeline_months=%s,budget=%s,language=%s,
        source_date=%s,owner=%s,status=%s,description=%s WHERE id=%s""",
        (name, _s(customer), _s(department), _s(doc_type), _s(tech_stack), _f(total_effort_mm),
         _f(total_effort_md), _f(timeline_months), _f(budget), _s(language), _s(source_date) or None,
         _s(owner), _s(status) or "draft", _s(description), oid))
    conn.commit(); conn.close()
    return RedirectResponse(f"/opportunities/{oid}", status_code=303)


@app.post("/opportunities/{oid}/delete")
def opp_delete(oid: int):
    conn = connect(); cur = conn.cursor()
    # xoá chunk + wbs theo opp (document_chunk theo source, và theo document cascade)
    cur.execute("DELETE FROM document_chunk WHERE source_type='opportunity' AND source_id=%s", (oid,))
    cur.execute("DELETE FROM document WHERE source_type='opportunity' AND source_id=%s", (oid,))
    cur.execute("DELETE FROM opportunity WHERE id=%s", (oid,))  # wbs cascade
    conn.commit(); conn.close()
    return RedirectResponse("/opportunities", status_code=303)


# ----------------------------- Case Study CRUD -----------------------------
@app.get("/casestudies", response_class=HTMLResponse)
def cs_list(request: Request):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT id,name,domain,customer,tech_stack FROM case_study ORDER BY id DESC")
    rows = cur.fetchall(); conn.close()
    return templates.TemplateResponse(request, "casestudies.html", {"request": request, "rows": rows})


@app.get("/casestudies/new", response_class=HTMLResponse)
def cs_new(request: Request):
    return templates.TemplateResponse(request, "casestudy_form.html",
        {"request": request, "cs": None, "action": "/casestudies"})


@app.post("/casestudies")
def cs_create(name: str = Form(...), title: str = Form(""), customer: str = Form(""),
              domain: str = Form(""), tech_stack: str = Form("")):
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO case_study (name,title,customer,domain,tech_stack)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                (name, _s(title), _s(customer), _s(domain), _s(tech_stack)))
    cid = cur.fetchone()[0]; conn.commit(); conn.close()
    return RedirectResponse(f"/casestudies/{cid}", status_code=303)


@app.get("/casestudies/import", response_class=HTMLResponse)
def cs_import_form(request: Request):
    return templates.TemplateResponse(request, "casestudy_import.html", {"request": request})


@app.post("/casestudies/import")
async def cs_import(file: UploadFile = File(...)):
    tmp = os.path.join(UPLOAD_DIR, f"_tmp_{file.filename}")
    with open(tmp, "wb") as out:
        shutil.copyfileobj(file.file, out)
    try:
        meta = extract_casestudy(tmp)
    except Exception:
        meta = {"name": os.path.splitext(file.filename)[0]}

    name = os.path.splitext(file.filename)[0]  # tên từ file gốc (không lấy đường dẫn tạm)
    conn = connect(); cur = conn.cursor()
    cur.execute("""INSERT INTO case_study (name,title,customer,domain,tech_stack,file_path)
                   VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
                (name, meta.get("title"), meta.get("customer"),
                 meta.get("domain"), meta.get("tech_stack"), None))
    cid = cur.fetchone()[0]
    cur.execute("""INSERT INTO document (source_type,source_id,filename,security_label,status)
                   VALUES ('case_study',%s,%s,'Internal','pending') RETURNING id""",
                (cid, file.filename))
    doc_id = cur.fetchone()[0]
    dest = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    os.replace(tmp, dest)
    cur.execute("UPDATE document SET file_path=%s WHERE id=%s", (dest, doc_id))
    cur.execute("UPDATE case_study SET file_path=%s WHERE id=%s", (dest, cid))
    conn.commit(); conn.close()

    process_document(doc_id)
    return RedirectResponse(f"/casestudies/{cid}", status_code=303)


@app.get("/casestudies/{cid}", response_class=HTMLResponse)
def cs_detail(request: Request, cid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM case_study WHERE id=%s", (cid,))
    cols = [d[0] for d in cur.description]; row = cur.fetchone()
    if not row:
        conn.close(); return HTMLResponse("Không tìm thấy case study", status_code=404)
    cs = dict(zip(cols, row))
    cur.execute("""SELECT id,filename,security_label,status,n_chunks,error FROM document
                   WHERE source_type='case_study' AND source_id=%s ORDER BY id DESC""", (cid,))
    docs = cur.fetchall(); conn.close()
    return templates.TemplateResponse(request, "casestudy_detail.html",
        {"request": request, "cs": cs, "docs": docs})


@app.get("/casestudies/{cid}/edit", response_class=HTMLResponse)
def cs_edit(request: Request, cid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT * FROM case_study WHERE id=%s", (cid,))
    cols = [d[0] for d in cur.description]; row = cur.fetchone(); conn.close()
    cs = dict(zip(cols, row))
    return templates.TemplateResponse(request, "casestudy_form.html",
        {"request": request, "cs": cs, "action": f"/casestudies/{cid}/edit"})


@app.post("/casestudies/{cid}/edit")
def cs_update(cid: int, name: str = Form(...), title: str = Form(""), customer: str = Form(""),
              domain: str = Form(""), tech_stack: str = Form("")):
    conn = connect(); cur = conn.cursor()
    cur.execute("""UPDATE case_study SET name=%s,title=%s,customer=%s,domain=%s,tech_stack=%s
                   WHERE id=%s""", (name, _s(title), _s(customer), _s(domain), _s(tech_stack), cid))
    conn.commit(); conn.close()
    return RedirectResponse(f"/casestudies/{cid}", status_code=303)


@app.post("/casestudies/{cid}/delete")
def cs_delete(cid: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("DELETE FROM document_chunk WHERE source_type='case_study' AND source_id=%s", (cid,))
    cur.execute("DELETE FROM document WHERE source_type='case_study' AND source_id=%s", (cid,))
    cur.execute("DELETE FROM case_study WHERE id=%s", (cid,))
    conn.commit(); conn.close()
    return RedirectResponse("/casestudies", status_code=303)


# ----------------------------- Upload tài liệu (pipeline) -----------------------------
@app.post("/documents/upload")
async def doc_upload(
    source_type: str = Form(...), source_id: int = Form(...),
    security_label: str = Form("Internal"), file: UploadFile = File(...),
):
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

    # Pipeline đồng bộ (demo): parse → chunk → embed → ghi vector
    process_document(doc_id)

    back = f"/opportunities/{source_id}" if source_type == "opportunity" else f"/casestudies/{source_id}"
    return RedirectResponse(back, status_code=303)


@app.post("/documents/{doc_id}/delete")
def doc_delete(doc_id: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT source_type,source_id,file_path FROM document WHERE id=%s", (doc_id,))
    row = cur.fetchone()
    if not row:
        conn.close(); return RedirectResponse("/", status_code=303)
    source_type, source_id, file_path = row
    cur.execute("DELETE FROM document WHERE id=%s", (doc_id,))  # chunk cascade theo document_id
    conn.commit(); conn.close()
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
    back = f"/opportunities/{source_id}" if source_type == "opportunity" else f"/casestudies/{source_id}"
    return RedirectResponse(back, status_code=303)


@app.post("/documents/{doc_id}/reprocess")
def doc_reprocess(doc_id: int):
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT source_type,source_id FROM document WHERE id=%s", (doc_id,))
    row = cur.fetchone(); conn.close()
    process_document(doc_id)
    back = f"/opportunities/{row[1]}" if row[0] == "opportunity" else f"/casestudies/{row[1]}"
    return RedirectResponse(back, status_code=303)
