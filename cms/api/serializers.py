"""Row -> camelCase dict mappers. Output shapes mirror web/src/data/types.ts
so the React app consumes API responses with zero transformation."""


def _iso(d):
    return d.isoformat() if d is not None else None


def opp_row(cols, row):
    """Full opportunity row (SELECT * order) -> dict (without wbs/documents)."""
    d = dict(zip(cols, row))
    return {
        "id": d["id"],
        "name": d["name"],
        "customer": d.get("customer"),
        "department": d.get("department"),
        "docType": d.get("doc_type"),
        "techStack": d.get("tech_stack"),
        "totalEffortMm": d.get("total_effort_mm"),
        "totalEffortMd": d.get("total_effort_md"),
        "timelineMonths": d.get("timeline_months"),
        "budget": d.get("budget"),
        "language": d.get("language"),
        "sourceDate": _iso(d.get("source_date")),
        "owner": d.get("owner"),
        "status": d.get("status") or "draft",
        "description": d.get("description"),
    }


def wbs_row(r):
    return {
        "id": r[0], "category": r[1], "name": r[2], "description": r[3],
        "effortStudy": r[4], "effortFe": r[5], "effortBe": r[6],
        "effortUt": r[7], "effortTotal": r[8], "priority": r[9],
    }


def doc_row(r):
    """(id, filename, security_label, status, n_chunks, error, created_at)"""
    return {
        "id": r[0], "filename": r[1], "securityLabel": r[2] or "Internal",
        "status": r[3] or "pending", "nChunks": r[4] or 0, "error": r[5],
        "uploadedAt": _iso(r[6]),
    }


def cs_row(cols, row):
    """Full case_study row -> dict (without documents)."""
    d = dict(zip(cols, row))
    created = d.get("created_at")
    return {
        "id": d["id"],
        "name": d["name"],
        "title": d.get("title"),
        "customer": d.get("customer"),
        "domain": d.get("domain"),
        "techStack": d.get("tech_stack"),
        "summary": d.get("description"),
        "year": created.year if created is not None else None,
        "documents": [],
    }


def token_row(r):
    """(id, user_name, active, token, expires_at, last_used_at, created_at)"""
    return {
        "id": r[0], "userName": r[1], "active": r[2], "token": r[3],
        "createdAt": _iso(r[6]), "lastUsed": _iso(r[5]), "calls": 0,
    }
