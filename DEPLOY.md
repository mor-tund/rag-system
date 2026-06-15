# Triển khai trên server

## Yêu cầu trên server
- **Docker** + Docker Compose (chạy Postgres + pgvector)
- **uv** (quản lý Python env) — https://docs.astral.sh/uv/
- **Node.js 20+** + npm — *chỉ cần khi build lại frontend* (`web/dist` đã prebuilt & commit sẵn)
- **Claude Code** đã đăng nhập subscription — *chỉ cần nếu dùng trang Web Hỏi-đáp* (`claude -p`). Kênh MCP không cần.
- Mạng ra ngoài 1 lần để tải model bge-m3 (~2.3GB) và Claude API.

## Các bước

```bash
# 1. Lấy code
git clone git@github.com:mor-tund/rag-system.git
cd rag-system

# 2. Cấu hình
cp .env.example .env
#   -> sửa RAG_ADMIN_PASSWORD, RAG_SESSION_SECRET (bắt buộc), cổng nếu cần

# 3. Setup (venv + deps + DB + schema + tải model). Chạy 1 lần.
bash scripts/setup.sh

# 4. (Tuỳ chọn) Build lại frontend nếu có Node + sửa FE. Mặc định web/dist đã prebuilt.
bash scripts/build_web.sh

# 5. Chạy dịch vụ
bash scripts/run_cms.sh    # CMS (SPA React + API)  -> http://<server>:8210
bash scripts/run_mcp.sh    # MCP                     -> http://<server>:8211/mcp
```

> FE React (`web/`) là giao diện duy nhất; CMS phục vụ `web/dist` + JSON API `/api/*` trên **cùng cổng 8210**.
> Khi phát triển FE: `cd web && npm run dev` (cổng 5180, tự proxy `/api` về 8210).

> Nên chạy 2 dịch vụ bằng **systemd** hoặc `nohup ... &` để tự bật lại. Ví dụ nhanh:
> ```bash
> nohup bash scripts/run_cms.sh > cms.log 2>&1 &
> nohup bash scripts/run_mcp.sh > mcp.log 2>&1 &
> ```

## Sau khi chạy
1. Mở `http://<server>:8210` → SPA React, đăng nhập admin (theo `.env`).
2. Tạo Proposal / Case Study, hoặc **Import từ file** để tự điền.
3. Upload tài liệu → pipeline tự embed.
4. Hỏi-đáp ở trang `/ask` (cần Claude Code trên server) **hoặc** cấp token ở `/admin/tokens` cho user nối qua MCP.

## Cấp quyền user MCP
- Admin vào `/admin/tokens` → cấp token cho user.
- User chạy:
  ```bash
  claude mcp add --transport http --scope user rag-mor http://<server>:8211/mcp --header "Authorization: Bearer <token>"
  ```

## Lưu ý production
- Đặt CMS (8210) và MCP (8211) sau **nginx + HTTPS**.
- Đổi mật khẩu admin + `RAG_SESSION_SECRET`.
- Dữ liệu Postgres nằm trong Docker volume `rag-system_rag-pgdata` (bền qua restart).
- Tải lại model chỉ 1 lần (cache HuggingFace `~/.cache/huggingface`).