# RAG System — Proposal & Case Study (demo)

Hệ thống quản lý **proposal / case study** + **hỏi-đáp AI (RAG)** có trích nguồn.
Tài liệu được xử lý & vector hoá **ngay tại chỗ** (embedding local), chỉ khâu sinh câu trả lời gọi LLM.

- 📄 Tổng quan cho khách: [`docs/TONG-QUAN-HE-THONG.md`](docs/TONG-QUAN-HE-THONG.md)
- 🚀 Triển khai server: [`DEPLOY.md`](DEPLOY.md)

## Thành phần
| Lớp | Công nghệ |
|---|---|
| Database | PostgreSQL 17 + pgvector |
| Embedding | bge-m3 (local, đa ngữ) |
| Web/CMS | FastAPI (JSON API) + React + Tailwind (SPA) |
| LLM tổng hợp | Claude (`claude -p` qua subscription) |
| Truy cập ngoài | MCP server (HTTP) + token theo user |

## Cấu trúc
```
rag-system/
├─ docker-compose.yml      # Postgres + pgvector
├─ db/                     # schema.sql + migration_*.sql + init/
├─ requirements.txt        # deps (torch CPU cài riêng trong setup.sh)
├─ scripts/                # setup.sh, run_cms.sh, run_mcp.sh, download_model.py
├─ ingest.py               # nạp dữ liệu theo lô (CLI)
├─ ask.py                  # hỏi-đáp CLI
├─ cms/                    # backend: JSON API + MCP + pipeline
│  ├─ main.py              # serve SPA (web/dist) + include /api router
│  ├─ api/                 # JSON API: opportunities, casestudies, documents, system
│  ├─ mcp_server.py rag.py pipeline.py parsers.py extract.py
│  └─ embedding.py db.py auth.py
├─ web/                    # frontend React + TS + Tailwind (SPA) -> web/dist
└─ docs/
```

## Chạy nhanh (server)
```bash
cp .env.example .env       # sửa mật khẩu admin + session secret
bash scripts/setup.sh      # venv + deps + DB + schema + model
bash scripts/build_web.sh  # build SPA React -> web/dist
bash scripts/run_cms.sh    # SPA + API  -> http://<server>:8210
bash scripts/run_mcp.sh    # MCP        -> http://<server>:8211/mcp
```
Chi tiết: xem [`DEPLOY.md`](DEPLOY.md).

## Tính năng
- CRUD Proposal & Case Study; **Import từ file** tự điền trường + WBS.
- Upload tài liệu (pptx/xlsx/pdf/docx/txt/md) → pipeline parse → chunk → embed → vector (incremental theo file).
- Hỏi-đáp RAG 2 kênh: **Web** (server tổng hợp) và **MCP** (Claude của user tự tổng hợp).
- Đăng nhập admin cho toàn bộ CMS; cấp/thu hồi **token MCP theo user**.